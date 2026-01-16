'use client';

// Comparison context for tracking active comparisons across the app
// Ported from contract-clause-comparator with localStorage persistence

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { ActiveComparison, ComparisonStatus } from '@/types/comparison';
import { getActiveComparison, setActiveComparison as saveActiveComparison } from '@/lib/storage';

// ============================================================================
// Context Type
// ============================================================================

interface ComparisonContextType {
  activeComparison: ActiveComparison | null;
  setActiveComparison: (comparison: ActiveComparison | null) => void;
  isComparisonInProgress: boolean;
  clearActiveComparison: () => void;
  pollComparisonStatus: () => Promise<void>;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface ComparisonProviderProps {
  children: ReactNode;
}

export function ComparisonProvider({ children }: ComparisonProviderProps) {
  const [activeComparison, setActiveComparisonState] = useState<ActiveComparison | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const hasVerifiedRef = useRef(false);

  // Restore active comparison from localStorage on mount
  // Verify it still exists on the server to prevent stale state
  useEffect(() => {
    // Prevent duplicate verification in React StrictMode
    if (hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;

    const verifyAndRestoreComparison = async () => {
      const stored = getActiveComparison();
      if (stored) {
        // Only verify if the comparison was in progress
        if (stored.status === 'pending' || stored.status === 'processing') {
          // Check if comparison is too old (>10 minutes) - clear without API call
          const startedAt = new Date(stored.startedAt).getTime();
          const ageMs = Date.now() - startedAt;
          const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

          if (ageMs > MAX_AGE_MS) {
            // Comparison is too old, clear without hitting server
            console.log('Clearing stale comparison - too old:', Math.round(ageMs / 1000 / 60), 'minutes');
            saveActiveComparison(null);
            setIsInitialized(true);
            return;
          }

          try {
            const response = await fetch(`/api/contracts/compare/${stored.id}`);
            if (response.ok) {
              const data = await response.json();
              // Server still has the comparison, update with current status
              if (data.status === 'completed' || data.status === 'failed') {
                // Comparison finished while we were away, clear it
                saveActiveComparison(null);
              } else {
                // Still processing, restore state
                setActiveComparisonState({
                  ...stored,
                  status: data.status,
                } as ActiveComparison);
              }
            } else {
              // Comparison not found (404) or error, clear stale state
              console.log('Clearing stale comparison - server returned', response.status);
              saveActiveComparison(null);
            }
          } catch (error) {
            // Network error, clear stale state to be safe
            console.error('Error verifying comparison, clearing stale state:', error);
            saveActiveComparison(null);
          }
        } else {
          // Not in progress, just restore
          setActiveComparisonState(stored as ActiveComparison);
        }
      }
      setIsInitialized(true);
    };

    verifyAndRestoreComparison();
  }, []);

  // Set active comparison and persist to localStorage
  const setActiveComparison = useCallback((comparison: ActiveComparison | null) => {
    setActiveComparisonState(comparison);
    saveActiveComparison(comparison);
  }, []);

  // Clear active comparison
  const clearActiveComparison = useCallback(() => {
    setActiveComparisonState(null);
    saveActiveComparison(null);
  }, []);

  // Poll comparison status from API
  const pollComparisonStatus = useCallback(async () => {
    if (!activeComparison) return;

    try {
      const response = await fetch(`/api/contracts/compare/${activeComparison.id}`);
      if (!response.ok) {
        console.error('Failed to poll comparison status');
        return;
      }

      const data = await response.json();
      const newStatus = data.status as ComparisonStatus;

      // Update state if status changed
      if (newStatus !== activeComparison.status) {
        if (newStatus === 'completed' || newStatus === 'failed') {
          // Clear active comparison when done
          clearActiveComparison();
        } else {
          setActiveComparison({
            ...activeComparison,
            status: newStatus,
          });
        }
      }
    } catch (error) {
      console.error('Error polling comparison status:', error);
    }
  }, [activeComparison, setActiveComparison, clearActiveComparison]);

  // Set up SSE for real-time updates when comparison is active
  useEffect(() => {
    if (!activeComparison || !isInitialized) return;
    if (activeComparison.status === 'completed' || activeComparison.status === 'failed') return;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(`/api/contracts/compare/${activeComparison.id}/stream`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const newStatus = data.status as ComparisonStatus;

          if (newStatus === 'completed' || newStatus === 'failed') {
            clearActiveComparison();
            eventSource?.close();
          } else if (newStatus !== activeComparison.status) {
            setActiveComparison({
              ...activeComparison,
              status: newStatus,
            });
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = async () => {
        // SSE failed - could be 404 (comparison not found) or network error
        eventSource?.close();

        // Check if comparison still exists on server
        try {
          const response = await fetch(`/api/contracts/compare/${activeComparison.id}`);
          if (!response.ok) {
            // Comparison not found (404) or other error - clear stale state
            console.log('SSE failed and comparison not found, clearing stale state');
            clearActiveComparison();
          }
          // If response is ok, comparison exists - could be a temporary network issue
          // Don't clear state, let user retry or the polling fallback handle it
        } catch (fetchError) {
          // Network error during check - clear state to be safe
          console.error('Error checking comparison status after SSE failure:', fetchError);
          clearActiveComparison();
        }
      };
    } catch (error) {
      console.error('Error setting up SSE:', error);
      // Clear stale state on setup failure
      clearActiveComparison();
    }

    return () => {
      eventSource?.close();
    };
  }, [activeComparison?.id, activeComparison?.status, isInitialized, setActiveComparison, clearActiveComparison]);

  // Computed state
  const isComparisonInProgress =
    activeComparison?.status === 'pending' || activeComparison?.status === 'processing';

  const value: ComparisonContextType = {
    activeComparison,
    setActiveComparison,
    isComparisonInProgress,
    clearActiveComparison,
    pollComparisonStatus,
  };

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useComparison(): ComparisonContextType {
  const context = useContext(ComparisonContext);

  if (context === undefined) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }

  return context;
}
