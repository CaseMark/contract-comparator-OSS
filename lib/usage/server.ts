// Server-side demo usage utilities
// For use in API routes where localStorage is not available

import type { DemoUsage, UsageCheckResult, UsageLimitConfig } from './types';
import { WARNING_THRESHOLDS, PRICING, getUsageLimitConfig } from './config';

/**
 * Check demo usage limits server-side
 * Usage data is passed from client via request headers/body
 */
export function checkUsageLimitsServer(
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

  // Determine warning level
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
  const timeRatio = percentTimeUsed / 100;
  const costRatio = percentCostUsed / 100;

  const timeWarning = getWarningForRatio(timeRatio, WARNING_THRESHOLDS.time);
  const costWarning = getWarningForRatio(costRatio, WARNING_THRESHOLDS.cost);

  if (timeWarning === 'critical' || costWarning === 'critical') {
    return 'critical';
  }
  if (timeWarning === 'approaching' || costWarning === 'approaching') {
    return 'approaching';
  }
  return 'none';
}

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
 * Parse demo usage from request header
 * Client sends usage as base64-encoded JSON in X-Demo-Usage header
 */
export function parseUsageFromRequest(request: Request): DemoUsage | null {
  try {
    const usageHeader = request.headers.get('X-Demo-Usage');
    if (!usageHeader) return null;

    const decoded = Buffer.from(usageHeader, 'base64').toString('utf-8');
    return JSON.parse(decoded) as DemoUsage;
  } catch {
    return null;
  }
}

/**
 * Create usage response headers
 * Returns updated usage data for client to store
 */
export function createUsageResponseHeaders(usage: DemoUsage): Headers {
  const headers = new Headers();
  const encoded = Buffer.from(JSON.stringify(usage)).toString('base64');
  headers.set('X-Demo-Usage', encoded);
  return headers;
}

/**
 * Calculate LLM cost
 */
export function calculateLLMCostServer(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * PRICING.LLM_INPUT_COST_PER_1M_TOKENS;
  const outputCost = (outputTokens / 1_000_000) * PRICING.LLM_OUTPUT_COST_PER_1M_TOKENS;
  return inputCost + outputCost;
}

/**
 * Calculate OCR cost
 */
export function calculateOCRCostServer(pageCount: number): number {
  return pageCount * PRICING.OCR_COST_PER_PAGE;
}

/**
 * Update usage with new LLM call
 */
export function addLLMUsageServer(
  currentUsage: DemoUsage,
  inputTokens: number,
  outputTokens: number
): DemoUsage {
  const cost = calculateLLMCostServer(inputTokens, outputTokens);

  return {
    ...currentUsage,
    totalInputTokens: currentUsage.totalInputTokens + inputTokens,
    totalOutputTokens: currentUsage.totalOutputTokens + outputTokens,
    estimatedCostUsd: currentUsage.estimatedCostUsd + cost,
    apiCallCount: currentUsage.apiCallCount + 1,
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Update usage with new OCR call
 */
export function addOCRUsageServer(
  currentUsage: DemoUsage,
  pageCount: number
): DemoUsage {
  const cost = calculateOCRCostServer(pageCount);

  return {
    ...currentUsage,
    ocrPageCount: currentUsage.ocrPageCount + pageCount,
    estimatedCostUsd: currentUsage.estimatedCostUsd + cost,
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Create initial usage record for new sessions
 */
export function createInitialUsage(sessionId: string): DemoUsage {
  const now = new Date().toISOString();
  return {
    sessionId,
    sessionStartedAt: now,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    estimatedCostUsd: 0,
    apiCallCount: 0,
    ocrPageCount: 0,
    lastUpdatedAt: now,
  };
}
