'use client';

// Usage context for tracking demo usage limits across the app
// Tracks LLM tokens and OCR page counts against session limits

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { DemoUsage, UsageCheckResult } from '@/lib/usage/types';
import {
  loadDemoUsage,
  trackLLMUsage,
  trackOCRUsage,
  initializeUsage,
} from '@/lib/usage/storage';
import { checkUsageLimits, formatTimeRemaining, getLimitExceededMessage } from '@/lib/usage/limit-checker';

// ============================================================================
// Context Type
// ============================================================================

interface UsageContextType {
  usage: DemoUsage | null;
  usageCheck: UsageCheckResult;
  isLimitExceeded: boolean;
  warningLevel: 'none' | 'approaching' | 'critical';
  timeRemainingFormatted: string;
  addLLMUsage: (inputTokens: number, outputTokens: number) => void;
  addOCRUsage: (pageCount: number) => void;
  refreshUsage: () => void;
  limitExceededMessage: string | null;
}

const UsageContext = createContext<UsageContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface UsageProviderProps {
  children: ReactNode;
}

export function UsageProvider({ children }: UsageProviderProps) {
  const [usage, setUsage] = useState<DemoUsage | null>(null);
  const [usageCheck, setUsageCheck] = useState<UsageCheckResult>({
    isAllowed: true,
    timeRemaining: 0,
    costRemaining: 0,
    percentTimeUsed: 0,
    percentCostUsed: 0,
    warningLevel: 'none',
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize or load usage on mount
  useEffect(() => {
    let currentUsage = loadDemoUsage();

    // Initialize if no usage exists
    if (!currentUsage) {
      currentUsage = initializeUsage();
    }

    setUsage(currentUsage);
    setUsageCheck(checkUsageLimits(currentUsage));
    setIsInitialized(true);
  }, []);

  // Update usage check periodically (for time-based limits)
  useEffect(() => {
    if (!isInitialized || !usage) return;

    const interval = setInterval(() => {
      const check = checkUsageLimits(usage);
      setUsageCheck(check);
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isInitialized, usage]);

  // Track LLM usage
  const addLLMUsage = useCallback((inputTokens: number, outputTokens: number) => {
    if (!usage) return;

    const updatedUsage = trackLLMUsage(usage.sessionId, { inputTokens, outputTokens });
    setUsage(updatedUsage);
    setUsageCheck(checkUsageLimits(updatedUsage));
  }, [usage]);

  // Track OCR usage
  const addOCRUsage = useCallback((pageCount: number) => {
    if (!usage) return;

    const updatedUsage = trackOCRUsage(usage.sessionId, pageCount);
    setUsage(updatedUsage);
    setUsageCheck(checkUsageLimits(updatedUsage));
  }, [usage]);

  // Manually refresh usage from storage
  const refreshUsage = useCallback(() => {
    const currentUsage = loadDemoUsage();
    if (currentUsage) {
      setUsage(currentUsage);
      setUsageCheck(checkUsageLimits(currentUsage));
    }
  }, []);

  // Computed values
  const isLimitExceeded = !usageCheck.isAllowed;
  const warningLevel = usageCheck.warningLevel;
  const timeRemainingFormatted = formatTimeRemaining(usageCheck.timeRemaining);
  const limitExceededMessage = isLimitExceeded
    ? getLimitExceededMessage(usageCheck.reason || 'cost_exceeded')
    : null;

  const value: UsageContextType = {
    usage,
    usageCheck,
    isLimitExceeded,
    warningLevel,
    timeRemainingFormatted,
    addLLMUsage,
    addOCRUsage,
    refreshUsage,
    limitExceededMessage,
  };

  return (
    <UsageContext.Provider value={value}>
      {children}
    </UsageContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useUsage(): UsageContextType {
  const context = useContext(UsageContext);

  if (context === undefined) {
    throw new Error('useUsage must be used within a UsageProvider');
  }

  return context;
}
