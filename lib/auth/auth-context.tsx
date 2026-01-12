/**
 * Auth Context and Hooks
 *
 * Provides React context and hooks that mirror Better Auth's API
 * but use IndexedDB for storage.
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  getSession,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  listOrganizations,
  getActiveOrganization,
  setActiveOrganization,
  createOrganization,
  type AuthSession,
  type User,
  type Session,
  type Organization,
} from './local-auth';

// ============================================================================
// Context Types
// ============================================================================

interface AuthContextType {
  // Session state
  data: AuthSession | null;
  isPending: boolean;
  error: Error | null;

  // Methods
  refetch: () => Promise<void>;
}

interface OrganizationContextType {
  data: Organization | null;
  isPending: boolean;
}

interface OrganizationsListContextType {
  data: Organization[] | null;
  isPending: boolean;
}

// ============================================================================
// Contexts
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ActiveOrgContext = createContext<OrganizationContextType | undefined>(undefined);
const OrgsListContext = createContext<OrganizationsListContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [activeOrgPending, setActiveOrgPending] = useState(true);

  const [orgsList, setOrgsList] = useState<Organization[] | null>(null);
  const [orgsListPending, setOrgsListPending] = useState(true);

  // Load session on mount
  const loadSession = useCallback(async () => {
    setIsPending(true);
    setError(null);

    try {
      const authSession = await getSession();
      setSession(authSession);

      // Load organizations if logged in
      if (authSession) {
        const [orgs, active] = await Promise.all([
          listOrganizations(),
          getActiveOrganization(),
        ]);
        setOrgsList(orgs);
        setActiveOrg(active);
      } else {
        setOrgsList(null);
        setActiveOrg(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load session'));
    } finally {
      setIsPending(false);
      setActiveOrgPending(false);
      setOrgsListPending(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Listen for storage changes (multi-tab support)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ccc:session') {
        loadSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadSession]);

  return (
    <AuthContext.Provider
      value={{
        data: session,
        isPending,
        error,
        refetch: loadSession,
      }}
    >
      <ActiveOrgContext.Provider
        value={{
          data: activeOrg,
          isPending: activeOrgPending,
        }}
      >
        <OrgsListContext.Provider
          value={{
            data: orgsList,
            isPending: orgsListPending,
          }}
        >
          {children}
        </OrgsListContext.Provider>
      </ActiveOrgContext.Provider>
    </AuthContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get current session - mirrors Better Auth's useSession
 */
export function useSession() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSession must be used within AuthProvider');
  }
  return context;
}

/**
 * Get active organization - mirrors Better Auth's useActiveOrganization
 */
export function useActiveOrganization() {
  const context = useContext(ActiveOrgContext);
  if (!context) {
    throw new Error('useActiveOrganization must be used within AuthProvider');
  }
  return context;
}

/**
 * List user's organizations - mirrors Better Auth's useListOrganizations
 */
export function useListOrganizations() {
  const context = useContext(OrgsListContext);
  if (!context) {
    throw new Error('useListOrganizations must be used within AuthProvider');
  }
  return context;
}

// ============================================================================
// Auth Methods (to be used in components)
// ============================================================================

/**
 * Sign in - mirrors Better Auth's signIn.email
 */
export const signIn = {
  email: async (params: { email: string; password: string }) => {
    const result = await signInWithEmail(params);

    // Trigger session refresh across components
    if (result.data) {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'ccc:session',
      }));
    }

    return result;
  },
};

/**
 * Sign up - mirrors Better Auth's signUp.email
 */
export const signUp = {
  email: async (params: { email: string; password: string; name: string }) => {
    const result = await signUpWithEmail(params);

    // Trigger session refresh across components
    if (result.data) {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'ccc:session',
      }));
    }

    return result;
  },
};

/**
 * Sign out - mirrors Better Auth's signOut
 */
export async function signOut() {
  await signOutUser();

  // Trigger session refresh across components
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'ccc:session',
  }));
}

/**
 * Organization methods - mirrors Better Auth's organization
 */
export const organization = {
  create: async (params: { name: string; slug: string }) => {
    const result = await createOrganization(params);

    if (result.data) {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'ccc:session',
      }));
    }

    return result;
  },

  setActive: async (params: { organizationId: string }) => {
    await setActiveOrganization(params.organizationId);

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'ccc:session',
    }));
  },
};
