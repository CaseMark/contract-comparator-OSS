'use client';

// IndexedDB setup using Dexie.js for contract clause comparator
// Must be 'use client' because Dexie requires browser APIs (IndexedDB)

import Dexie, { type Table } from 'dexie';
import type { Contract, Clause } from '@/types/contract';
import type { Comparison, ClauseMatch, SemanticTag } from '@/types/comparison';

// Auth types for IndexedDB storage
export interface StoredUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface StoredOrganization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  createdAt: string;
}

export interface StoredMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  createdAt: string;
}

export class ContractDatabase extends Dexie {
  // App data tables
  contracts!: Table<Contract>;
  clauses!: Table<Clause>;
  comparisons!: Table<Comparison>;
  clauseMatches!: Table<ClauseMatch>;
  semanticTags!: Table<SemanticTag>;

  // Auth tables
  users!: Table<StoredUser>;
  sessions!: Table<StoredSession>;
  organizations!: Table<StoredOrganization>;
  members!: Table<StoredMember>;

  constructor() {
    super('ContractComparator');

    this.version(2).stores({
      // App data - Primary key is 'id', indexed fields follow
      contracts: 'id, uploadedBy, organizationId, uploadedAt, status',
      clauses: 'id, contractId, type, contentHash',
      comparisons: 'id, createdBy, organizationId, status, createdAt, sourceContractId, targetContractId',
      clauseMatches: 'id, comparisonId, matchType, riskLevel, sourceClauseId, targetClauseId',
      semanticTags: 'id, comparisonId, category, value',

      // Auth tables
      users: 'id, email',
      sessions: 'id, userId, token, expiresAt',
      organizations: 'id, slug',
      members: 'id, [userId+organizationId], userId, organizationId',
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
