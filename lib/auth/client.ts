/**
 * Auth Client - IndexedDB-based Authentication
 *
 * This provides the same API surface as Better Auth but uses
 * IndexedDB for storage, enabling fully client-side auth.
 *
 * Usage in components:
 * import { useSession, signIn, signUp, signOut } from "@/lib/auth/client";
 *
 * NOTE: This is for demo/local use only. For production, configure
 * Better Auth with a real database (see skills/auth/SKILL.md).
 */

'use client';

// Re-export everything from auth context
export {
  AuthProvider,
  useSession,
  useActiveOrganization,
  useListOrganizations,
  signIn,
  signUp,
  signOut,
  organization,
} from './auth-context';

// Re-export types
export type {
  User,
  Session,
  AuthSession,
  Organization,
  StoredUserInfo,
} from './local-auth';

// Re-export dev tools for managing IndexedDB auth data
export {
  listAllUsers,
  getUserByEmail,
  deleteUserByEmail,
  clearAllSessions,
  clearAllAuthData,
  validateSessionSync,
} from './local-auth';

// Compatibility: Create an authClient-like object for components that use it directly
export const authClient = {
  signIn: {
    email: async (params: { email: string; password: string }) => {
      const { signIn } = await import('./auth-context');
      return signIn.email(params);
    },
  },
  signUp: {
    email: async (params: { email: string; password: string; name: string }) => {
      const { signUp } = await import('./auth-context');
      return signUp.email(params);
    },
  },
  signOut: async () => {
    const { signOut } = await import('./auth-context');
    return signOut();
  },
  organization: {
    create: async (params: { name: string; slug: string }) => {
      const { organization } = await import('./auth-context');
      return organization.create(params);
    },
    setActive: async (params: { organizationId: string }) => {
      const { organization } = await import('./auth-context');
      return organization.setActive(params);
    },
  },
};
