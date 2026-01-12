'use client';

// Storage operations for contracts, clauses, and comparisons
// Combines IndexedDB (Dexie) for large data with localStorage for small state
// Must be 'use client' because it uses IndexedDB and localStorage

import { getDatabase, isBrowser } from './db';
import {
  loadFromLocalStorage,
  saveToLocalStorage,
  removeFromLocalStorage,
  clearAllStorageData,
  clearActiveComparisonStorage,
  clearUserPreferencesStorage,
  getStorageInfo,
  checkStorageVersion,
  STORAGE_KEYS,
} from './local-storage-helpers';
import type { Contract, Clause } from '@/types/contract';
import type { Comparison, ClauseMatch, SemanticTag, UserPreferences, ActiveComparison } from '@/types/comparison';

const DEBUG = process.env.NODE_ENV === 'development';

// Initialize storage version check on load
if (typeof window !== 'undefined') {
  checkStorageVersion();
}

// ============================================================================
// Contract Operations (IndexedDB)
// ============================================================================

export async function saveContract(contract: Contract): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.contracts.put(contract);

    if (DEBUG) {
      console.log('[Storage] Saved contract:', { id: contract.id, name: contract.name });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to save contract:', error);
    return false;
  }
}

export async function getContract(id: string): Promise<Contract | undefined> {
  if (!isBrowser()) return undefined;

  try {
    const db = getDatabase();
    return await db.contracts.get(id);
  } catch (error) {
    console.error('[Storage] Failed to get contract:', error);
    return undefined;
  }
}

export async function listContracts(
  userId: string,
  organizationId?: string
): Promise<Contract[]> {
  if (!isBrowser()) return [];

  try {
    const db = getDatabase();
    let query = db.contracts.where('uploadedBy').equals(userId);

    if (organizationId) {
      const contracts = await query.toArray();
      return contracts
        .filter(c => c.organizationId === organizationId)
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    }

    const contracts = await query.toArray();

    if (DEBUG) {
      console.log('[Storage] Listed contracts:', { count: contracts.length, userId });
    }

    return contracts.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  } catch (error) {
    console.error('[Storage] Failed to list contracts:', error);
    return [];
  }
}

export async function deleteContract(id: string): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    // Delete associated clauses first
    await db.clauses.where('contractId').equals(id).delete();
    await db.contracts.delete(id);

    if (DEBUG) {
      console.log('[Storage] Deleted contract:', { id });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to delete contract:', error);
    return false;
  }
}

export async function updateContractStatus(
  id: string,
  status: Contract['status']
): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.contracts.update(id, { status });
    return true;
  } catch (error) {
    console.error('[Storage] Failed to update contract status:', error);
    return false;
  }
}

// ============================================================================
// Clause Operations (IndexedDB)
// ============================================================================

export async function saveClauses(clauses: Clause[]): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.clauses.bulkPut(clauses);

    if (DEBUG) {
      console.log('[Storage] Saved clauses:', { count: clauses.length });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to save clauses:', error);
    return false;
  }
}

export async function getClausesByContract(contractId: string): Promise<Clause[]> {
  if (!isBrowser()) return [];

  try {
    const db = getDatabase();
    return await db.clauses.where('contractId').equals(contractId).toArray();
  } catch (error) {
    console.error('[Storage] Failed to get clauses:', error);
    return [];
  }
}

export async function deleteClausesByContract(contractId: string): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.clauses.where('contractId').equals(contractId).delete();
    return true;
  } catch (error) {
    console.error('[Storage] Failed to delete clauses:', error);
    return false;
  }
}

// ============================================================================
// Comparison Operations (IndexedDB)
// ============================================================================

export async function saveComparison(comparison: Comparison): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.comparisons.put(comparison);

    if (DEBUG) {
      console.log('[Storage] Saved comparison:', { id: comparison.id, status: comparison.status });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to save comparison:', error);
    return false;
  }
}

export async function getComparison(id: string): Promise<Comparison | undefined> {
  if (!isBrowser()) return undefined;

  try {
    const db = getDatabase();
    return await db.comparisons.get(id);
  } catch (error) {
    console.error('[Storage] Failed to get comparison:', error);
    return undefined;
  }
}

export async function listComparisons(
  userId: string,
  organizationId?: string
): Promise<Comparison[]> {
  if (!isBrowser()) return [];

  try {
    const db = getDatabase();

    let comparisons = await db.comparisons
      .where('createdBy')
      .equals(userId)
      .toArray();

    if (organizationId) {
      comparisons = comparisons.filter(c => c.organizationId === organizationId);
    }

    if (DEBUG) {
      console.log('[Storage] Listed comparisons:', { count: comparisons.length, userId });
    }

    return comparisons.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('[Storage] Failed to list comparisons:', error);
    return [];
  }
}

export async function deleteComparison(id: string): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();

    // Delete associated data first
    await db.clauseMatches.where('comparisonId').equals(id).delete();
    await db.semanticTags.where('comparisonId').equals(id).delete();
    await db.comparisons.delete(id);

    if (DEBUG) {
      console.log('[Storage] Deleted comparison:', { id });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to delete comparison:', error);
    return false;
  }
}

export async function updateComparisonStatus(
  id: string,
  status: Comparison['status'],
  error?: string
): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.comparisons.update(id, { status, error });
    return true;
  } catch (error) {
    console.error('[Storage] Failed to update comparison status:', error);
    return false;
  }
}

export async function updateComparisonSummary(
  id: string,
  summary: Comparison['summary'],
  overallRiskScore: number
): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.comparisons.update(id, { summary, overallRiskScore });
    return true;
  } catch (error) {
    console.error('[Storage] Failed to update comparison summary:', error);
    return false;
  }
}

// ============================================================================
// Clause Match Operations (IndexedDB)
// ============================================================================

export async function saveClauseMatches(matches: ClauseMatch[]): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.clauseMatches.bulkPut(matches);

    if (DEBUG) {
      console.log('[Storage] Saved clause matches:', { count: matches.length });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to save clause matches:', error);
    return false;
  }
}

export async function getClauseMatchesByComparison(
  comparisonId: string
): Promise<ClauseMatch[]> {
  if (!isBrowser()) return [];

  try {
    const db = getDatabase();
    return await db.clauseMatches.where('comparisonId').equals(comparisonId).toArray();
  } catch (error) {
    console.error('[Storage] Failed to get clause matches:', error);
    return [];
  }
}

// ============================================================================
// Semantic Tag Operations (IndexedDB)
// ============================================================================

export async function saveSemanticTags(tags: SemanticTag[]): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const db = getDatabase();
    await db.semanticTags.bulkPut(tags);

    if (DEBUG) {
      console.log('[Storage] Saved semantic tags:', { count: tags.length });
    }

    return true;
  } catch (error) {
    console.error('[Storage] Failed to save semantic tags:', error);
    return false;
  }
}

export async function getSemanticTagsByComparison(
  comparisonId: string
): Promise<SemanticTag[]> {
  if (!isBrowser()) return [];

  try {
    const db = getDatabase();
    return await db.semanticTags.where('comparisonId').equals(comparisonId).toArray();
  } catch (error) {
    console.error('[Storage] Failed to get semantic tags:', error);
    return [];
  }
}

// ============================================================================
// localStorage Operations (for small data like preferences and active state)
// Uses helper functions for robust serialization and error handling
// ============================================================================

/**
 * Gets the currently active comparison from localStorage
 * Returns null if no active comparison or parsing fails
 */
export function getActiveComparison(): ActiveComparison | null {
  return loadFromLocalStorage<ActiveComparison>(STORAGE_KEYS.ACTIVE_COMPARISON, {
    dateFields: ['startedAt'],
  });
}

/**
 * Sets or clears the active comparison in localStorage
 * Pass null to clear the active comparison
 */
export function setActiveComparison(comparison: ActiveComparison | null): void {
  if (comparison) {
    const success = saveToLocalStorage(STORAGE_KEYS.ACTIVE_COMPARISON, comparison);
    if (!success) {
      console.error('[Storage] Failed to save active comparison');
    }
  } else {
    clearActiveComparisonStorage();
  }
}

/**
 * Gets user preferences from localStorage
 * Returns null if no preferences found or parsing fails
 */
export function getUserPreferences(userId: string): UserPreferences | null {
  return loadFromLocalStorage<UserPreferences>(STORAGE_KEYS.PREFERENCES(userId));
}

/**
 * Saves user preferences to localStorage
 */
export function setUserPreferences(userId: string, preferences: UserPreferences): boolean {
  return saveToLocalStorage(STORAGE_KEYS.PREFERENCES(userId), preferences);
}

/**
 * Clears user preferences for a specific user
 */
export function clearUserPreferences(userId: string): void {
  clearUserPreferencesStorage(userId);
}

/**
 * Clears all contract comparator data from localStorage
 * Useful for logout or data reset scenarios
 */
export function clearAllLocalStorage(): void {
  clearAllStorageData();
  if (DEBUG) {
    console.log('[Storage] All localStorage data cleared');
  }
}

/**
 * Gets diagnostic information about localStorage usage
 */
export function getLocalStorageInfo(): {
  used: number;
  available: number;
  items: number;
  cccItems: number;
} {
  return getStorageInfo();
}

// ============================================================================
// Utility: Get full comparison with related data
// ============================================================================

export async function getFullComparison(id: string): Promise<{
  comparison: Comparison;
  sourceContract: Contract;
  targetContract: Contract;
  sourceClauses: Clause[];
  targetClauses: Clause[];
  clauseMatches: ClauseMatch[];
  semanticTags: SemanticTag[];
} | null> {
  if (!isBrowser()) return null;

  const comparison = await getComparison(id);
  if (!comparison) return null;

  const [sourceContract, targetContract, sourceClauses, targetClauses, clauseMatches, semanticTags] =
    await Promise.all([
      getContract(comparison.sourceContractId),
      getContract(comparison.targetContractId),
      getClausesByContract(comparison.sourceContractId),
      getClausesByContract(comparison.targetContractId),
      getClauseMatchesByComparison(id),
      getSemanticTagsByComparison(id),
    ]);

  if (!sourceContract || !targetContract) return null;

  return {
    comparison,
    sourceContract,
    targetContract,
    sourceClauses,
    targetClauses,
    clauseMatches,
    semanticTags,
  };
}
