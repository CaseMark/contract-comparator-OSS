// Demo usage limit configuration
// Loaded from environment variables

import type { UsageLimitConfig } from './types';

// Pricing constants (case.dev)
export const PRICING = {
  // Claude 3.5 Sonnet via case.dev (approximate)
  LLM_INPUT_COST_PER_1M_TOKENS: 3,    // $3 per 1M input tokens
  LLM_OUTPUT_COST_PER_1M_TOKENS: 15,  // $15 per 1M output tokens

  // OCR pricing (case.dev)
  OCR_COST_PER_PAGE: 0.02,            // $0.02 per page
} as const;

// Default limits if env vars not set
const DEFAULT_SESSION_HOURS = 24;
const DEFAULT_PRICE_LIMIT = 5;

export function getUsageLimitConfig(): UsageLimitConfig {
  const sessionHours = parseFloat(process.env.DEMO_SESSION_HOURS || String(DEFAULT_SESSION_HOURS));
  const maxCostUsd = parseFloat(process.env.DEMO_SESSION_PRICE_LIMIT || String(DEFAULT_PRICE_LIMIT));

  return {
    sessionDurationMs: sessionHours * 60 * 60 * 1000,
    maxCostUsd,
  };
}

// Client-side config (uses hardcoded defaults since env vars aren't available)
export function getClientUsageLimitConfig(): UsageLimitConfig {
  return {
    sessionDurationMs: DEFAULT_SESSION_HOURS * 60 * 60 * 1000,
    maxCostUsd: DEFAULT_PRICE_LIMIT,
  };
}

// Warning thresholds
export const WARNING_THRESHOLDS = {
  // Cost-based
  cost: {
    approaching: 0.50,  // 50% - show amber warning
    critical: 0.75,     // 75% - show orange warning
    nearLimit: 0.90,    // 90% - show red warning
  },
  // Time-based
  time: {
    approaching: 0.75,  // 75% - show amber warning
    critical: 0.90,     // 90% - show orange warning
    nearLimit: 0.95,    // 95% - show red warning
  },
} as const;
