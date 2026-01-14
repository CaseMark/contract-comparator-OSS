// Utility functions for contract comparison
// Ported from contract-clause-comparator with adaptations

import type { RiskLevel, MatchType } from '@/types/comparison';

// ============================================================================
// Risk Scoring
// ============================================================================

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'critical':
      return 'text-foreground bg-foreground/10 border-foreground/30';
    case 'high':
      return 'text-foreground bg-foreground/5 border-foreground/20';
    case 'medium':
      return 'text-muted-foreground bg-muted border-border';
    case 'low':
      return 'text-muted-foreground bg-muted/50 border-border';
  }
}

export function getRiskBadgeColor(level: RiskLevel): string {
  switch (level) {
    case 'critical':
      return 'bg-foreground text-background';
    case 'high':
      return 'bg-foreground/10 text-foreground font-semibold';
    case 'medium':
      return 'bg-muted text-foreground';
    case 'low':
      return 'bg-muted text-muted-foreground';
  }
}

export function calculateOverallRisk(scores: number[]): number {
  if (scores.length === 0) return 0;

  // Weight higher risks more heavily
  const weightedSum = scores.reduce((sum, score) => {
    const weight = score >= 75 ? 2 : score >= 50 ? 1.5 : 1;
    return sum + score * weight;
  }, 0);

  const totalWeight = scores.reduce((sum, score) => {
    return sum + (score >= 75 ? 2 : score >= 50 ? 1.5 : 1);
  }, 0);

  return Math.round(weightedSum / totalWeight);
}

// ============================================================================
// Match Type Utilities
// ============================================================================

export function getMatchTypeColor(matchType: MatchType): string {
  switch (matchType) {
    case 'identical':
      return 'text-muted-foreground bg-muted/50 border-border';
    case 'modified':
      return 'text-foreground bg-foreground/5 border-foreground/20';
    case 'added':
      return 'text-foreground bg-muted border-dashed border-foreground/30';
    case 'removed':
      return 'text-muted-foreground bg-muted/50 border-border line-through';
  }
}

export function getMatchTypeBadgeColor(matchType: MatchType): string {
  switch (matchType) {
    case 'identical':
      return 'bg-muted text-muted-foreground';
    case 'modified':
      return 'bg-foreground/10 text-foreground border border-foreground/20';
    case 'added':
      return 'bg-muted text-foreground border border-dashed border-foreground/30';
    case 'removed':
      return 'bg-foreground/5 text-muted-foreground line-through';
  }
}

export function getMatchTypeLabel(matchType: MatchType): string {
  switch (matchType) {
    case 'identical':
      return 'Unchanged';
    case 'modified':
      return 'Modified';
    case 'added':
      return 'Added';
    case 'removed':
      return 'Removed';
  }
}

// ============================================================================
// Status Utilities
// ============================================================================

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-foreground';
    case 'processing':
      return 'text-muted-foreground';
    case 'pending':
      return 'text-muted-foreground';
    case 'failed':
      return 'text-foreground font-medium';
    default:
      return 'text-muted-foreground';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'processing':
      return 'Processing';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

// ============================================================================
// Text Comparison
// ============================================================================

export function normalizeTextForComparison(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function hashText(text: string): string {
  // Simple fast non-cryptographic hash for deduplication
  let hash = 0;
  const normalized = normalizeTextForComparison(text);

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return hash.toString(16);
}

export function calculateTextSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeTextForComparison(text1);
  const norm2 = normalizeTextForComparison(text2);

  if (norm1 === norm2) return 1;
  if (norm1.length === 0 || norm2.length === 0) return 0;

  // Simple length-based similarity + common prefix/suffix
  const maxLen = Math.max(norm1.length, norm2.length);
  const minLen = Math.min(norm1.length, norm2.length);

  // Find common prefix length
  let prefixLen = 0;
  while (prefixLen < minLen && norm1[prefixLen] === norm2[prefixLen]) {
    prefixLen++;
  }

  // Find common suffix length
  let suffixLen = 0;
  while (
    suffixLen < minLen - prefixLen &&
    norm1[norm1.length - 1 - suffixLen] === norm2[norm2.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const commonLen = prefixLen + suffixLen;
  return commonLen / maxLen;
}

// ============================================================================
// Formatting
// ============================================================================

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// ============================================================================
// File Utilities
// ============================================================================

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

export function getContentType(filename: string): string {
  const ext = getFileExtension(filename);
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    rtf: 'application/rtf',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ============================================================================
// ID Generation
// ============================================================================

export function generateId(): string {
  return crypto.randomUUID();
}
