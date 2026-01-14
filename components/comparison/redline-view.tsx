'use client';

// Side-by-side redline view with word-level diff highlighting
// Uses the 'diff' library for granular change detection
// Grayscale styling per UI guidelines - professional legal aesthetic

import { useMemo } from 'react';
import * as Diff from 'diff';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Contract } from '@/types/contract';
import type { ClauseMatch } from '@/types/comparison';

interface RedlineViewProps {
  sourceContract: Contract | null;
  targetContract: Contract | null;
  clauseMatches: ClauseMatch[];
}

interface DiffStats {
  additions: number;
  deletions: number;
  unchanged: number;
}

// Compute word-level diff between two texts
function computeWordDiff(oldText: string, newText: string): Diff.Change[] {
  return Diff.diffWords(oldText, newText);
}

// Calculate stats from diff changes
function calculateStats(changes: Diff.Change[]): DiffStats {
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (const change of changes) {
    const wordCount = change.value.split(/\s+/).filter(Boolean).length;
    if (change.added) {
      additions += wordCount;
    } else if (change.removed) {
      deletions += wordCount;
    } else {
      unchanged += wordCount;
    }
  }

  return { additions, deletions, unchanged };
}

// Render diff for the source (original) document - shows deletions
function SourceDiffView({ changes }: { changes: Diff.Change[] }) {
  return (
    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
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

// Render diff for the target (modified) document - shows additions
function TargetDiffView({ changes }: { changes: Diff.Change[] }) {
  return (
    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
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

// Document pane component
function DocumentPane({
  title,
  subtitle,
  children,
  emptyMessage,
  isEmpty,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  emptyMessage: string;
  isEmpty: boolean;
}) {
  if (isEmpty) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="shrink-0">
        <CardTitle className="text-lg">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent className="flex-1 overflow-auto max-h-[700px]">
        {children}
      </CardContent>
    </Card>
  );
}

export function RedlineView({ sourceContract, targetContract, clauseMatches }: RedlineViewProps) {
  // Compute full document diff
  const { changes, stats } = useMemo(() => {
    const sourceContent = sourceContract?.content || '';
    const targetContent = targetContract?.content || '';

    if (!sourceContent && !targetContent) {
      return { changes: [], stats: { additions: 0, deletions: 0, unchanged: 0 } };
    }

    const changes = computeWordDiff(sourceContent, targetContent);
    const stats = calculateStats(changes);

    return { changes, stats };
  }, [sourceContract?.content, targetContract?.content]);

  return (
    <div className="space-y-4">
      {/* Compact stats and legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs px-1">
        <span className="font-medium text-muted-foreground">Changes:</span>
        <span className="text-foreground">+{stats.additions}</span>
        <span className="text-muted-foreground">−{stats.deletions}</span>
        <span className="text-muted-foreground">{stats.unchanged} unchanged</span>
        <span className="text-muted-foreground">|</span>
        <span className="bg-muted text-muted-foreground line-through px-1 rounded">deleted</span>
        <span className="bg-foreground/10 text-foreground underline px-1 rounded">added</span>
      </div>

      {/* Side-by-side documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[600px]">
        <DocumentPane
          title="Original Document"
          subtitle={sourceContract?.fileName}
          isEmpty={!sourceContract}
          emptyMessage="Original document not available"
        >
          <SourceDiffView changes={changes} />
        </DocumentPane>

        <DocumentPane
          title="Modified Document"
          subtitle={targetContract?.fileName}
          isEmpty={!targetContract}
          emptyMessage="Modified document not available"
        >
          <TargetDiffView changes={changes} />
        </DocumentPane>
      </div>
    </div>
  );
}
