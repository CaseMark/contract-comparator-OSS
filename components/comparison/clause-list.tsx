'use client';

// List of clause comparisons with filtering
// Grayscale styling per UI guidelines - professional legal aesthetic

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ClauseItem } from './clause-item';
import type { ClauseMatch, MatchType, RiskLevel } from '@/types/comparison';

interface ClauseListProps {
  clauseMatches: ClauseMatch[];
  className?: string;
}

type FilterType = 'all' | MatchType | RiskLevel;

export function ClauseList({ clauseMatches, className }: ClauseListProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter options
  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'modified', label: 'Modified' },
    { value: 'added', label: 'Added' },
    { value: 'removed', label: 'Removed' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High Risk' },
  ];

  // Filtered and sorted clauses
  const filteredClauses = useMemo(() => {
    let filtered = [...clauseMatches];

    // Apply filter
    if (filter !== 'all') {
      if (['modified', 'added', 'removed', 'identical'].includes(filter)) {
        filtered = filtered.filter((c) => c.matchType === filter);
      } else {
        filtered = filtered.filter((c) => c.riskLevel === filter);
      }
    }

    // Sort by risk score (highest first), then by match type
    filtered.sort((a, b) => {
      // Critical/high risk first
      if (a.riskScore !== b.riskScore) {
        return b.riskScore - a.riskScore;
      }
      // Then by match type priority
      const typePriority: Record<MatchType, number> = {
        removed: 0,
        modified: 1,
        added: 2,
        identical: 3,
      };
      return typePriority[a.matchType] - typePriority[b.matchType];
    });

    return filtered;
  }, [clauseMatches, filter]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: clauseMatches.length,
      modified: clauseMatches.filter((c) => c.matchType === 'modified').length,
      added: clauseMatches.filter((c) => c.matchType === 'added').length,
      removed: clauseMatches.filter((c) => c.matchType === 'removed').length,
      unchanged: clauseMatches.filter((c) => c.matchType === 'identical').length,
      critical: clauseMatches.filter((c) => c.riskLevel === 'critical').length,
      high: clauseMatches.filter((c) => c.riskLevel === 'high').length,
    };
  }, [clauseMatches]);

  return (
    <div className={className}>
      {/* Header with stats and filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{stats.total} clauses</span>
          <span className="border-l pl-4">{stats.modified} modified</span>
          <span>{stats.added} added</span>
          <span>{stats.removed} removed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filter:</span>
          <div className="flex flex-wrap gap-1">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                variant={filter === option.value ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Clause list */}
      <div className="space-y-3">
        {filteredClauses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No clauses match the current filter
          </div>
        ) : (
          filteredClauses.map((clauseMatch) => (
            <ClauseItem
              key={clauseMatch.id}
              clauseMatch={clauseMatch}
              isExpanded={expandedId === clauseMatch.id}
              onToggle={() =>
                setExpandedId(expandedId === clauseMatch.id ? null : clauseMatch.id)
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
