'use client';

// Individual clause item with diff display

import { useState } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RiskBadge } from './risk-badge';
import { MatchBadge } from './match-badge';
import type { ClauseMatch } from '@/types/comparison';

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
              {expanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {riskRationale && matchType !== 'identical' && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <span className="font-medium">Risk Assessment:</span> {riskRationale}
            </div>
          )}

          {matchType === 'removed' ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Removed Clause
              </p>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30">
                <pre className="text-sm whitespace-pre-wrap font-mono text-red-800 dark:text-red-300">
                  {sourceClauseContent}
                </pre>
              </div>
            </div>
          ) : matchType === 'added' ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Added Clause
              </p>
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30">
                <pre className="text-sm whitespace-pre-wrap font-mono text-green-800 dark:text-green-300">
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
                    'p-4 rounded-lg border',
                    matchType === 'identical'
                      ? 'bg-muted/30 border-border'
                      : 'bg-red-50/50 dark:bg-red-900/5 border-red-200/50 dark:border-red-900/20'
                  )}
                >
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {sourceClauseContent}
                  </pre>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  {matchType === 'identical' ? 'Current' : 'Modified'}
                </p>
                <div
                  className={cn(
                    'p-4 rounded-lg border',
                    matchType === 'identical'
                      ? 'bg-muted/30 border-border'
                      : 'bg-green-50/50 dark:bg-green-900/5 border-green-200/50 dark:border-green-900/20'
                  )}
                >
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {targetClauseContent || sourceClauseContent}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
