// Comparison types for the Contract Clause Comparator

import type { ClauseType } from './contract';

export type ComparisonStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type MatchType = 'identical' | 'modified' | 'added' | 'removed';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type DiffType = 'unchanged' | 'added' | 'removed';

export interface Comparison {
  id: string;
  name?: string;
  sourceContractId: string;
  targetContractId: string;
  createdAt: string;
  createdBy: string;
  organizationId?: string;
  status: ComparisonStatus;
  overallRiskScore: number;
  summary?: ExecutiveSummary;
  error?: string;
}

export interface ClauseMatch {
  id: string;
  comparisonId: string;
  sourceClauseId: string;
  targetClauseId?: string;
  sourceClauseType: ClauseType;
  targetClauseType?: ClauseType;
  sourceClauseTitle: string;
  targetClauseTitle?: string;
  sourceClauseContent: string;
  targetClauseContent?: string;
  matchType: MatchType;
  riskScore: number;
  riskLevel: RiskLevel;
  riskRationale?: string;
  similarity?: number;
}

export interface DiffSegment {
  type: DiffType;
  text: string;
  position?: {
    original?: { start: number; end: number };
    modified?: { start: number; end: number };
  };
}

export interface ExecutiveSummary {
  overview: string;
  keyFindings: SummaryFinding[];
  materialChanges: string[];
  riskHighlights: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface SummaryFinding {
  clauseType: ClauseType;
  finding: string;
  severity: RiskLevel;
}

export interface SemanticTag {
  id: string;
  comparisonId: string;
  category: 'contract_type' | 'industry' | 'risk_level' | 'key_terms' | 'parties' | 'status';
  value: string;
}

// Active comparison state for UI tracking
export interface ActiveComparison {
  id: string;
  name: string;
  status: ComparisonStatus;
  startedAt: string;
}

// User preferences
export interface UserPreferences {
  defaultClauseTypes: ClauseType[];
  showRiskThreshold: 'all' | 'medium' | 'high' | 'critical';
  diffDisplayMode: 'inline' | 'side-by-side';
  autoSave: boolean;
}
