// Demo usage limit checker
// Determines if user can continue using the demo based on time and cost limits

import type { DemoUsage, UsageCheckResult, UsageLimitConfig } from './types';
import { WARNING_THRESHOLDS, getUsageLimitConfig } from './config';

/**
 * Check if demo usage limits have been exceeded
 */
export function checkUsageLimits(
  usage: DemoUsage | null,
  config?: UsageLimitConfig
): UsageCheckResult {
  const limits = config || getUsageLimitConfig();
  // No usage tracking yet - allow
  if (!usage) {
    return {
      isAllowed: true,
      timeRemaining: limits.sessionDurationMs,
      costRemaining: limits.maxCostUsd,
      percentTimeUsed: 0,
      percentCostUsed: 0,
      warningLevel: 'none',
    };
  }

  const now = Date.now();
  const sessionStart = new Date(usage.sessionStartedAt).getTime();
  const timeElapsed = now - sessionStart;

  // Calculate time metrics
  const timeRemaining = Math.max(0, limits.sessionDurationMs - timeElapsed);
  const percentTimeUsed = Math.min(100, (timeElapsed / limits.sessionDurationMs) * 100);

  // Calculate cost metrics
  const costRemaining = Math.max(0, limits.maxCostUsd - usage.estimatedCostUsd);
  const percentCostUsed = Math.min(100, (usage.estimatedCostUsd / limits.maxCostUsd) * 100);

  // Check if time exceeded
  if (timeRemaining <= 0) {
    return {
      isAllowed: false,
      reason: 'time_exceeded',
      timeRemaining: 0,
      costRemaining,
      percentTimeUsed: 100,
      percentCostUsed,
      warningLevel: 'critical',
    };
  }

  // Check if cost exceeded
  if (costRemaining <= 0) {
    return {
      isAllowed: false,
      reason: 'cost_exceeded',
      timeRemaining,
      costRemaining: 0,
      percentTimeUsed,
      percentCostUsed: 100,
      warningLevel: 'critical',
    };
  }

  // Determine warning level based on the worse of the two metrics
  const warningLevel = calculateWarningLevel(percentTimeUsed, percentCostUsed);

  return {
    isAllowed: true,
    timeRemaining,
    costRemaining,
    percentTimeUsed,
    percentCostUsed,
    warningLevel,
  };
}

/**
 * Calculate warning level based on usage percentages
 */
function calculateWarningLevel(
  percentTimeUsed: number,
  percentCostUsed: number
): 'none' | 'approaching' | 'critical' {
  // Use the higher percentage of the two
  const timeRatio = percentTimeUsed / 100;
  const costRatio = percentCostUsed / 100;

  // Check time thresholds
  const timeWarning = getWarningForRatio(timeRatio, WARNING_THRESHOLDS.time);
  // Check cost thresholds
  const costWarning = getWarningForRatio(costRatio, WARNING_THRESHOLDS.cost);

  // Return the more severe warning
  if (timeWarning === 'critical' || costWarning === 'critical') {
    return 'critical';
  }
  if (timeWarning === 'approaching' || costWarning === 'approaching') {
    return 'approaching';
  }
  return 'none';
}

/**
 * Get warning level for a ratio against thresholds
 */
function getWarningForRatio(
  ratio: number,
  thresholds: { approaching: number; critical: number; nearLimit: number }
): 'none' | 'approaching' | 'critical' {
  if (ratio >= thresholds.critical) {
    return 'critical';
  }
  if (ratio >= thresholds.approaching) {
    return 'approaching';
  }
  return 'none';
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${seconds}s`;
}

/**
 * Format cost remaining for display
 */
export function formatCostRemaining(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

/**
 * Get human-readable message for limit exceeded reason
 */
export function getLimitExceededMessage(reason: 'time_exceeded' | 'cost_exceeded'): string {
  if (reason === 'time_exceeded') {
    return 'Your 24-hour demo session has ended. Sign up for a free account to continue using Contract Comparator.';
  }

  return 'You\'ve used your $5 demo API credit. Sign up for a free account to continue using Contract Comparator.';
}
