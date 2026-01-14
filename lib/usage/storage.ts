'use client';

// Demo usage storage utilities
// Manages localStorage operations for usage tracking

import {
  loadFromLocalStorage,
  saveToLocalStorage,
  removeFromLocalStorage,
} from '@/lib/storage/local-storage-helpers';
import type { DemoUsage, LLMUsage, OCRUsage } from './types';
import { PRICING } from './config';

// Storage key for demo usage
export const DEMO_USAGE_KEY = 'ccc:demoUsage';

/**
 * Creates a new demo usage record
 */
export function createDemoUsage(sessionId: string): DemoUsage {
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

/**
 * Loads demo usage from localStorage
 */
export function loadDemoUsage(): DemoUsage | null {
  return loadFromLocalStorage<DemoUsage>(DEMO_USAGE_KEY, {
    dateFields: ['sessionStartedAt', 'lastUpdatedAt'],
  });
}

/**
 * Saves demo usage to localStorage
 */
export function saveDemoUsage(usage: DemoUsage): boolean {
  return saveToLocalStorage(DEMO_USAGE_KEY, usage);
}

/**
 * Clears demo usage from localStorage
 */
export function clearDemoUsage(): boolean {
  return removeFromLocalStorage(DEMO_USAGE_KEY);
}

/**
 * Calculate cost for LLM usage
 */
export function calculateLLMCost(usage: LLMUsage): number {
  const inputCost = (usage.inputTokens / 1_000_000) * PRICING.LLM_INPUT_COST_PER_1M_TOKENS;
  const outputCost = (usage.outputTokens / 1_000_000) * PRICING.LLM_OUTPUT_COST_PER_1M_TOKENS;
  return inputCost + outputCost;
}

/**
 * Calculate cost for OCR usage
 */
export function calculateOCRCost(usage: OCRUsage): number {
  return usage.pageCount * PRICING.OCR_COST_PER_PAGE;
}

/**
 * Updates demo usage with new LLM usage data
 */
export function addLLMUsage(
  currentUsage: DemoUsage,
  llmUsage: LLMUsage
): DemoUsage {
  const cost = calculateLLMCost(llmUsage);

  return {
    ...currentUsage,
    totalInputTokens: currentUsage.totalInputTokens + llmUsage.inputTokens,
    totalOutputTokens: currentUsage.totalOutputTokens + llmUsage.outputTokens,
    estimatedCostUsd: currentUsage.estimatedCostUsd + cost,
    apiCallCount: currentUsage.apiCallCount + 1,
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Updates demo usage with new OCR usage data
 */
export function addOCRUsage(
  currentUsage: DemoUsage,
  ocrUsage: OCRUsage
): DemoUsage {
  const cost = calculateOCRCost(ocrUsage);

  return {
    ...currentUsage,
    ocrPageCount: currentUsage.ocrPageCount + ocrUsage.pageCount,
    estimatedCostUsd: currentUsage.estimatedCostUsd + cost,
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Get or initialize demo usage for a session
 * Creates new usage tracking if none exists or if session ID changed
 */
export function getOrCreateDemoUsage(sessionId: string): DemoUsage {
  const existing = loadDemoUsage();

  // If exists and matches session, return it
  if (existing && existing.sessionId === sessionId) {
    return existing;
  }

  // Create new usage tracking
  const newUsage = createDemoUsage(sessionId);
  saveDemoUsage(newUsage);
  return newUsage;
}

/**
 * Updates and persists demo usage after an LLM call
 */
export function trackLLMUsage(sessionId: string, usage: LLMUsage): DemoUsage {
  const current = getOrCreateDemoUsage(sessionId);
  const updated = addLLMUsage(current, usage);
  saveDemoUsage(updated);
  return updated;
}

/**
 * Updates and persists demo usage after an OCR call
 */
export function trackOCRUsage(sessionId: string, pageCount: number): DemoUsage {
  const current = getOrCreateDemoUsage(sessionId);
  const updated = addOCRUsage(current, { pageCount });
  saveDemoUsage(updated);
  return updated;
}

/**
 * Initializes demo usage if none exists
 * Returns existing usage or creates new
 */
export function initializeUsage(): DemoUsage {
  const existing = loadDemoUsage();
  if (existing) {
    return existing;
  }

  // Generate a simple session ID
  const sessionId = `demo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const newUsage = createDemoUsage(sessionId);
  saveDemoUsage(newUsage);
  return newUsage;
}
