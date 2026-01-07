// Contract and Clause types for the Contract Clause Comparator

export type ClauseType =
  | 'indemnification'
  | 'liability'
  | 'confidentiality'
  | 'termination'
  | 'warranty'
  | 'dispute_resolution'
  | 'intellectual_property'
  | 'non_compete'
  | 'force_majeure'
  | 'assignment'
  | 'governing_law'
  | 'payment_terms'
  | 'representation'
  | 'insurance'
  | 'other';

export const CLAUSE_TYPES: ClauseType[] = [
  'indemnification',
  'liability',
  'confidentiality',
  'termination',
  'warranty',
  'dispute_resolution',
  'intellectual_property',
  'non_compete',
  'force_majeure',
  'assignment',
  'governing_law',
  'payment_terms',
  'representation',
  'insurance',
  'other',
];

export interface Contract {
  id: string;
  name: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt';
  fileSize: number;
  content: string;
  uploadedAt: string;
  uploadedBy: string;
  organizationId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: ContractMetadata;
}

export interface ContractMetadata {
  pageCount?: number;
  wordCount?: number;
  parties?: string[];
  effectiveDate?: string;
  contractType?: string;
}

export interface Clause {
  id: string;
  contractId: string;
  type: ClauseType;
  title: string;
  content: string;
  startPosition?: number;
  endPosition?: number;
  sectionNumber?: string;
  confidence: number;
  contentHash?: string;
}
