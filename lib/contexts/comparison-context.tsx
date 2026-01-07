'use client';

// Comparison context for tracking active comparisons across the app
// Ported from contract-clause-comparator with localStorage persistence

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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

  // Restore active comparison from localStorage on mount
  useEffect(() => {
    const stored = getActiveComparison();
    if (stored) {
      // Verify the comparison still exists and isn't stale
      setActiveComparisonState(stored as ActiveComparison);
    }
    setIsInitialized(true);
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

      eventSource.onerror = () => {
        // Fall back to polling on SSE error
        eventSource?.close();
      };
    } catch (error) {
      console.error('Error setting up SSE:', error);
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
