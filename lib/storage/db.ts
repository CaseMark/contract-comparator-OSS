// IndexedDB setup using Dexie.js for contract clause comparator

import Dexie, { type Table } from 'dexie';
import type { Contract, Clause } from '@/types/contract';
import type { Comparison, ClauseMatch, SemanticTag } from '@/types/comparison';

export class ContractDatabase extends Dexie {
  contracts!: Table<Contract>;
  clauses!: Table<Clause>;
  comparisons!: Table<Comparison>;
  clauseMatches!: Table<ClauseMatch>;
  semanticTags!: Table<SemanticTag>;

  constructor() {
    super('ContractComparator');

    this.version(1).stores({
      // Primary key is 'id', indexed fields follow
      contracts: 'id, uploadedBy, organizationId, uploadedAt, status',
      clauses: 'id, contractId, type, contentHash',
      comparisons: 'id, createdBy, organizationId, status, createdAt, sourceContractId, targetContractId',
      clauseMatches: 'id, comparisonId, matchType, riskLevel, sourceClauseId, targetClauseId',
      semanticTags: 'id, comparisonId, category, value',
    });
  }
}

// Singleton instance
let dbInstance: ContractDatabase | null = null;

export function getDatabase(): ContractDatabase {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser');
  }

  if (!dbInstance) {
    dbInstance = new ContractDatabase();
  }

  return dbInstance;
}

// Helper to check if we're in the browser
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Reset database (useful for testing)
export async function resetDatabase(): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  await db.delete();
  dbInstance = null;
}
