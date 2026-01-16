'use client';

// Individual clause item with diff display
// Grayscale styling per UI guidelines - professional legal aesthetic

import { useState, useMemo } from 'react';
import * as Diff from 'diff';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RiskBadge } from './risk-badge';
import { MatchBadge } from './match-badge';
import type { ClauseMatch } from '@/types/comparison';

// Compute word-level diff between two texts
function computeWordDiff(oldText: string, newText: string): Diff.Change[] {
  return Diff.diffWords(oldText, newText);
}

// Render diff for the source (original) clause - shows deletions
function SourceClauseDiff({ changes }: { changes: Diff.Change[] }) {
  return (
    <div className="text-sm whitespace-pre-wrap font-mono">
      {changes.map((change, index) => {
        // Skip additions in source view
        if (change.added) {
          return null;
        }

        if (change.removed) {
          return (
            <span
              key={index}
              className="bg-muted text-muted-foreground line-through"
            >
              {change.value}
            </span>
          );
        }

        // Unchanged text
        return <span key={index}>{change.value}</span>;
      })}
    </div>
  );
}

// Render diff for the target (modified) clause - shows additions
function TargetClauseDiff({ changes }: { changes: Diff.Change[] }) {
  return (
    <div className="text-sm whitespace-pre-wrap font-mono">
      {changes.map((change, index) => {
        // Skip deletions in target view
        if (change.removed) {
          return null;
        }

        if (change.added) {
          return (
            <span
              key={index}
              className="bg-foreground/10 text-foreground font-medium underline decoration-foreground/30"
            >
              {change.value}
            </span>
          );
        }

        // Unchanged text
        return <span key={index}>{change.value}</span>;
      })}
    </div>
  );
}

interface ClauseItemProps {
  clauseMatch: ClauseMatch;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function ClauseItem({ clauseMatch, isExpanded = false, onToggle }: ClauseItemProps) {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  const expanded = onToggle ? isExpanded : localExpanded;
  const toggleExpanded = onToggle || (() => setLocalExpanded(!localExpanded));

  const {
    sourceClauseType,
    sourceClauseTitle,
    sourceClauseContent,
    targetClauseTitle,
    targetClauseContent,
    matchType,
    riskScore,
    riskLevel,
    riskRationale,
  } = clauseMatch;

  // Format clause type for display
  const formatClauseType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Compute word-level diff for modified clauses
  const diffChanges = useMemo(() => {
    if (matchType === 'modified' && sourceClauseContent && targetClauseContent) {
      return computeWordDiff(sourceClauseContent, targetClauseContent);
    }
    return null;
  }, [matchType, sourceClauseContent, targetClauseContent]);

  return (
    <Card size="sm">
      <CardHeader className="cursor-pointer" onClick={toggleExpanded}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex flex-col gap-1 min-w-0">
              <CardTitle className="truncate">
                {sourceClauseTitle || formatClauseType(sourceClauseType)}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {formatClauseType(sourceClauseType)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <MatchBadge matchType={matchType} size="sm" />
            {matchType !== 'identical' && (
              <RiskBadge score={riskScore} level={riskLevel} size="sm" />
            )}
            <Button variant="ghost" size="icon-sm">
              <span className="text-xs">{expanded ? '−' : '+'}</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {riskRationale && matchType !== 'identical' && (
            <div className="p-3 bg-muted/50 text-sm">
              <span className="font-medium">Risk Assessment:</span> {riskRationale}
            </div>
          )}

          {matchType === 'removed' ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Removed Clause
              </p>
              <div className="p-4 bg-muted/50 border border-border">
                <pre className="text-sm whitespace-pre-wrap font-mono text-muted-foreground line-through">
                  {sourceClauseContent}
                </pre>
              </div>
            </div>
          ) : matchType === 'added' ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Added Clause
              </p>
              <div className="p-4 bg-foreground/5 border border-dashed border-foreground/20">
                <pre className="text-sm whitespace-pre-wrap font-mono text-foreground">
                  {targetClauseContent}
                </pre>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Original
                </p>
                <div
                  className={cn(
                    'p-4 border',
                    matchType === 'identical'
                      ? 'bg-muted/30 border-border'
                      : 'bg-muted/50 border-border'
                  )}
                >
                  {diffChanges ? (
                    <SourceClauseDiff changes={diffChanges} />
                  ) : (
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {sourceClauseContent}
                    </pre>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  {matchType === 'identical' ? 'Current' : 'Modified'}
                </p>
                <div
                  className={cn(
                    'p-4 border',
                    matchType === 'identical'
                      ? 'bg-muted/30 border-border'
                      : 'bg-foreground/5 border-foreground/20'
                  )}
                >
                  {diffChanges ? (
                    <TargetClauseDiff changes={diffChanges} />
                  ) : (
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {targetClauseContent || sourceClauseContent}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
