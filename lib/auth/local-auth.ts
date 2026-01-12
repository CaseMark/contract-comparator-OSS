/**
 * Client-Side Authentication with IndexedDB
 *
 * This provides authentication functionality using IndexedDB for storage.
 * It mirrors the Better Auth API surface but runs entirely client-side.
 *
 * NOTE: This is for demo/local use only. Not secure for production.
 * - Passwords are hashed with SHA-256 (not bcrypt/argon2)
 * - Sessions are stored in localStorage (forgeable)
 * - No server-side validation
 */

'use client';

import { getDatabase, isBrowser, type StoredUser, type StoredSession, type StoredOrganization, type StoredMember } from '@/lib/storage/db';

const SESSION_KEY = 'ccc:session';
const SESSION_COOKIE = 'ccc:local-session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  activeOrganizationId?: string;
}

export interface AuthSession {
  user: User;
  session: Session;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  createdAt: Date;
}

export interface Member {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  createdAt: Date;
}

// ============================================================================
// Utilities
// ============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function storedUserToUser(stored: StoredUser): User {
  return {
    id: stored.id,
    email: stored.email,
    name: stored.name,
    image: stored.image,
    emailVerified: stored.emailVerified,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  };
}

function storedSessionToSession(stored: StoredSession, activeOrgId?: string): Session {
  return {
    id: stored.id,
    userId: stored.userId,
    token: stored.token,
    expiresAt: new Date(stored.expiresAt),
    activeOrganizationId: activeOrgId,
  };
}

// ============================================================================
// Session Management (localStorage)
// ============================================================================

interface LocalSessionData {
  sessionId: string;
  token: string;
  activeOrganizationId?: string;
}

function getLocalSession(): LocalSessionData | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setLocalSession(data: LocalSessionData): void {
  if (!isBrowser()) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function clearLocalSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(SESSION_KEY);
  // Clear the session cookie used by middleware
  document.cookie = `${SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Set a cookie to signal to the middleware that a local session is active.
 * This cookie is read-only for auth state detection; actual session data is in IndexedDB.
 */
function setSessionCookie(expiresAt: Date): void {
  if (!isBrowser()) return;
  // Set cookie with same expiry as the session
  document.cookie = `${SESSION_COOKIE}=1; path=/; expires=${expiresAt.toUTCString()}; SameSite=Lax`;
}

/**
 * Clear the session cookie
 */
function clearSessionCookie(): void {
  if (!isBrowser()) return;
  document.cookie = `${SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// ============================================================================
// Auth Operations
// ============================================================================

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(params: {
  email: string;
  password: string;
  name: string;
}): Promise<{ data?: AuthSession; error?: { message: string } }> {
  if (!isBrowser()) {
    return { error: { message: 'Auth only available in browser' } };
  }

  try {
    const db = getDatabase();

    // Check if email already exists
    const existing = await db.users.where('email').equals(params.email.toLowerCase()).first();
    if (existing) {
      return { error: { message: 'Email already registered' } };
    }

    // Create user
    const now = new Date().toISOString();
    const userId = generateId();
    const passwordHash = await hashPassword(params.password);

    const storedUser: StoredUser = {
      id: userId,
      email: params.email.toLowerCase(),
      name: params.name,
      passwordHash,
      emailVerified: true, // Auto-verify for demo
      createdAt: now,
      updatedAt: now,
    };

    await db.users.add(storedUser);

    // Create session
    const sessionId = generateId();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

    const storedSession: StoredSession = {
      id: sessionId,
      userId,
      token,
      expiresAt,
      createdAt: now,
    };

    await db.sessions.add(storedSession);

    // Store session in localStorage and set cookie for middleware
    setLocalSession({ sessionId, token });
    setSessionCookie(new Date(expiresAt));

    return {
      data: {
        user: storedUserToUser(storedUser),
        session: storedSessionToSession(storedSession),
      },
    };
  } catch (error) {
    console.error('[Auth] Sign up failed:', error);
    return { error: { message: 'Failed to create account' } };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(params: {
  email: string;
  password: string;
}): Promise<{ data?: AuthSession; error?: { message: string } }> {
  if (!isBrowser()) {
    return { error: { message: 'Auth only available in browser' } };
  }

  try {
    const db = getDatabase();

    // Find user
    const storedUser = await db.users.where('email').equals(params.email.toLowerCase()).first();
    if (!storedUser) {
      return { error: { message: 'Invalid email or password' } };
    }

    // Verify password
    const passwordHash = await hashPassword(params.password);
    if (passwordHash !== storedUser.passwordHash) {
      return { error: { message: 'Invalid email or password' } };
    }

    // Create new session
    const now = new Date().toISOString();
    const sessionId = generateId();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

    const storedSession: StoredSession = {
      id: sessionId,
      userId: storedUser.id,
      token,
      expiresAt,
      createdAt: now,
    };

    await db.sessions.add(storedSession);

    // Get user's active organization (if any)
    const membership = await db.members.where('userId').equals(storedUser.id).first();

    // Store session in localStorage and set cookie for middleware
    setLocalSession({
      sessionId,
      token,
      activeOrganizationId: membership?.organizationId,
    });
    setSessionCookie(new Date(expiresAt));

    return {
      data: {
        user: storedUserToUser(storedUser),
        session: storedSessionToSession(storedSession, membership?.organizationId),
      },
    };
  } catch (error) {
    console.error('[Auth] Sign in failed:', error);
    return { error: { message: 'Failed to sign in' } };
  }
}

/**
 * Sign out - clear session
 */
export async function signOutUser(): Promise<{ error?: { message: string } }> {
  if (!isBrowser()) {
    return { error: { message: 'Auth only available in browser' } };
  }

  try {
    const localSession = getLocalSession();

    if (localSession) {
      const db = getDatabase();
      await db.sessions.delete(localSession.sessionId);
    }

    clearLocalSession();
    clearSessionCookie();
    return {};
  } catch (error) {
    console.error('[Auth] Sign out failed:', error);
    clearLocalSession(); // Clear anyway
    clearSessionCookie();
    return {};
  }
}

/**
 * Get current session
 */
export async function getSession(): Promise<AuthSession | null> {
  if (!isBrowser()) return null;

  try {
    const localSession = getLocalSession();
    if (!localSession) {
      clearSessionCookie(); // Ensure cookie is cleared if no local session
      return null;
    }

    const db = getDatabase();

    // Get session from IndexedDB
    const storedSession = await db.sessions.get(localSession.sessionId);
    if (!storedSession) {
      clearLocalSession();
      clearSessionCookie();
      return null;
    }

    // Check if expired
    if (new Date(storedSession.expiresAt) < new Date()) {
      await db.sessions.delete(storedSession.id);
      clearLocalSession();
      clearSessionCookie();
      return null;
    }

    // Verify token matches
    if (storedSession.token !== localSession.token) {
      clearLocalSession();
      clearSessionCookie();
      return null;
    }

    // Get user
    const storedUser = await db.users.get(storedSession.userId);
    if (!storedUser) {
      await db.sessions.delete(storedSession.id);
      clearLocalSession();
      clearSessionCookie();
      return null;
    }

    // Ensure cookie is set with correct expiry
    setSessionCookie(new Date(storedSession.expiresAt));

    return {
      user: storedUserToUser(storedUser),
      session: storedSessionToSession(storedSession, localSession.activeOrganizationId),
    };
  } catch (error) {
    console.error('[Auth] Get session failed:', error);
    return null;
  }
}

// ============================================================================
// Organization Operations
// ============================================================================

/**
 * Create an organization
 */
export async function createOrganization(params: {
  name: string;
  slug: string;
}): Promise<{ data?: Organization; error?: { message: string } }> {
  if (!isBrowser()) {
    return { error: { message: 'Auth only available in browser' } };
  }

  try {
    const session = await getSession();
    if (!session) {
      return { error: { message: 'Not authenticated' } };
    }

    const db = getDatabase();

    // Check if slug exists
    const existing = await db.organizations.where('slug').equals(params.slug).first();
    if (existing) {
      return { error: { message: 'Organization slug already taken' } };
    }

    const now = new Date().toISOString();
    const orgId = generateId();

    const storedOrg: StoredOrganization = {
      id: orgId,
      name: params.name,
      slug: params.slug,
      createdAt: now,
    };

    await db.organizations.add(storedOrg);

    // Add creator as owner
    const storedMember: StoredMember = {
      id: generateId(),
      userId: session.user.id,
      organizationId: orgId,
      role: 'owner',
      createdAt: now,
    };

    await db.members.add(storedMember);

    // Set as active org
    const localSession = getLocalSession();
    if (localSession) {
      setLocalSession({ ...localSession, activeOrganizationId: orgId });
    }

    return {
      data: {
        id: storedOrg.id,
        name: storedOrg.name,
        slug: storedOrg.slug,
        createdAt: new Date(storedOrg.createdAt),
      },
    };
  } catch (error) {
    console.error('[Auth] Create organization failed:', error);
    return { error: { message: 'Failed to create organization' } };
  }
}

/**
 * List user's organizations
 */
export async function listOrganizations(): Promise<Organization[]> {
  if (!isBrowser()) return [];

  try {
    const session = await getSession();
    if (!session) return [];

    const db = getDatabase();

    // Get user's memberships
    const memberships = await db.members.where('userId').equals(session.user.id).toArray();
    const orgIds = memberships.map(m => m.organizationId);

    if (orgIds.length === 0) return [];

    // Get organizations
    const orgs = await db.organizations.where('id').anyOf(orgIds).toArray();

    return orgs.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      createdAt: new Date(org.createdAt),
    }));
  } catch (error) {
    console.error('[Auth] List organizations failed:', error);
    return [];
  }
}

/**
 * Get active organization
 */
export async function getActiveOrganization(): Promise<Organization | null> {
  if (!isBrowser()) return null;

  try {
    const localSession = getLocalSession();
    if (!localSession?.activeOrganizationId) return null;

    const db = getDatabase();
    const storedOrg = await db.organizations.get(localSession.activeOrganizationId);

    if (!storedOrg) return null;

    return {
      id: storedOrg.id,
      name: storedOrg.name,
      slug: storedOrg.slug,
      logo: storedOrg.logo,
      createdAt: new Date(storedOrg.createdAt),
    };
  } catch (error) {
    console.error('[Auth] Get active organization failed:', error);
    return null;
  }
}

/**
 * Set active organization
 */
export async function setActiveOrganization(organizationId: string): Promise<void> {
  if (!isBrowser()) return;

  const localSession = getLocalSession();
  if (localSession) {
    setLocalSession({ ...localSession, activeOrganizationId: organizationId });
  }
}

// ============================================================================
// Dev Tools - For managing IndexedDB auth data during development
// ============================================================================

export interface StoredUserInfo {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  hasActiveSession: boolean;
}

/**
 * List all users stored in IndexedDB
 * Useful for debugging and development
 */
export async function listAllUsers(): Promise<StoredUserInfo[]> {
  if (!isBrowser()) return [];

  try {
    const db = getDatabase();
    const users = await db.users.toArray();
    const sessions = await db.sessions.toArray();
    const now = new Date();

    // Create a set of user IDs with active sessions
    const usersWithActiveSessions = new Set(
      sessions
        .filter(s => new Date(s.expiresAt) > now)
        .map(s => s.userId)
    );

    return users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: new Date(u.createdAt),
      hasActiveSession: usersWithActiveSessions.has(u.id),
    }));
  } catch (error) {
    console.error('[Auth] List users failed:', error);
    return [];
  }
}

/**
 * Get a user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  if (!isBrowser()) return null;

  try {
    const db = getDatabase();
    const storedUser = await db.users.where('email').equals(email.toLowerCase()).first();
    return storedUser ? storedUserToUser(storedUser) : null;
  } catch (error) {
    console.error('[Auth] Get user by email failed:', error);
    return null;
  }
}

/**
 * Delete a user by email (also deletes their sessions and memberships)
 */
export async function deleteUserByEmail(email: string): Promise<{ success: boolean; error?: string }> {
  if (!isBrowser()) {
    return { success: false, error: 'Only available in browser' };
  }

  try {
    const db = getDatabase();
    const user = await db.users.where('email').equals(email.toLowerCase()).first();

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Delete user's sessions
    await db.sessions.where('userId').equals(user.id).delete();

    // Delete user's memberships
    await db.members.where('userId').equals(user.id).delete();

    // Delete the user
    await db.users.delete(user.id);

    // If this was the current user, clear the session
    const localSession = getLocalSession();
    if (localSession) {
      const session = await db.sessions.get(localSession.sessionId);
      if (!session || session.userId === user.id) {
        clearLocalSession();
        clearSessionCookie();
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[Auth] Delete user failed:', error);
    return { success: false, error: 'Failed to delete user' };
  }
}

/**
 * Clear all sessions from IndexedDB
 * This logs out all users but keeps their accounts
 */
export async function clearAllSessions(): Promise<void> {
  if (!isBrowser()) return;

  try {
    const db = getDatabase();
    await db.sessions.clear();
    clearLocalSession();
    clearSessionCookie();
    console.log('[Auth] All sessions cleared');
  } catch (error) {
    console.error('[Auth] Clear sessions failed:', error);
  }
}

/**
 * Clear all auth data from IndexedDB
 * Nuclear option - removes all users, sessions, organizations, and memberships
 */
export async function clearAllAuthData(): Promise<void> {
  if (!isBrowser()) return;

  try {
    const db = getDatabase();
    await Promise.all([
      db.users.clear(),
      db.sessions.clear(),
      db.organizations.clear(),
      db.members.clear(),
    ]);
    clearLocalSession();
    clearSessionCookie();
    console.log('[Auth] All auth data cleared');
  } catch (error) {
    console.error('[Auth] Clear auth data failed:', error);
  }
}

/**
 * Check if the current session cookie matches the stored session
 * Useful for debugging session sync issues
 */
export async function validateSessionSync(): Promise<{
  hasLocalStorageSession: boolean;
  hasCookie: boolean;
  hasIndexedDBSession: boolean;
  isValid: boolean;
  details?: string;
}> {
  if (!isBrowser()) {
    return {
      hasLocalStorageSession: false,
      hasCookie: false,
      hasIndexedDBSession: false,
      isValid: false,
      details: 'Not in browser',
    };
  }

  const localSession = getLocalSession();
  const hasCookie = document.cookie.includes(SESSION_COOKIE);

  if (!localSession) {
    return {
      hasLocalStorageSession: false,
      hasCookie,
      hasIndexedDBSession: false,
      isValid: !hasCookie, // Valid if no cookie when no session
      details: hasCookie ? 'Orphaned cookie without localStorage session' : 'No session',
    };
  }

  try {
    const db = getDatabase();
    const storedSession = await db.sessions.get(localSession.sessionId);

    if (!storedSession) {
      return {
        hasLocalStorageSession: true,
        hasCookie,
        hasIndexedDBSession: false,
        isValid: false,
        details: 'localStorage session exists but IndexedDB session not found',
      };
    }

    const isExpired = new Date(storedSession.expiresAt) < new Date();

    return {
      hasLocalStorageSession: true,
      hasCookie,
      hasIndexedDBSession: true,
      isValid: !isExpired && hasCookie,
      details: isExpired
        ? 'Session expired'
        : !hasCookie
        ? 'Missing session cookie'
        : 'Session is valid and synced',
    };
  } catch (error) {
    return {
      hasLocalStorageSession: true,
      hasCookie,
      hasIndexedDBSession: false,
      isValid: false,
      details: `Error checking IndexedDB: ${error}`,
    };
  }
}
