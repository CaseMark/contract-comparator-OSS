// Demo usage tracking types

export interface DemoUsage {
  sessionId: string;
  sessionStartedAt: string;      // ISO timestamp
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostUsd: number;      // Running cost estimate in dollars
  apiCallCount: number;
  ocrPageCount: number;          // Total OCR pages processed
  lastUpdatedAt: string;
}

export interface UsageCheckResult {
  isAllowed: boolean;
  reason?: 'time_exceeded' | 'cost_exceeded';
  timeRemaining: number;         // ms
  costRemaining: number;         // dollars
  percentTimeUsed: number;
  percentCostUsed: number;
  warningLevel: 'none' | 'approaching' | 'critical';
}

export interface UsageLimitConfig {
  sessionDurationMs: number;     // From DEMO_SESSION_HOURS converted to ms
  maxCostUsd: number;            // From DEMO_SESSION_PRICE_LIMIT
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface OCRUsage {
  pageCount: number;
}
