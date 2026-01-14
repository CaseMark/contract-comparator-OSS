'use client';

// List of past comparisons (dashboard view)
// Grayscale styling per UI guidelines - professional legal aesthetic

import { useRouter } from 'next/navigation';
import { Spinner } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InlineRiskScore } from './risk-badge';
import { formatRelativeTime, getStatusLabel, getStatusColor } from '@/lib/contracts/utils';
import type { Comparison } from '@/types/comparison';

interface ComparisonListProps {
  comparisons: Comparison[];
  isLoading?: boolean;
  className?: string;
}

export function ComparisonList({ comparisons, isLoading, className }: ComparisonListProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Spinner size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (comparisons.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="w-12 h-12 mx-auto mb-4 bg-muted flex items-center justify-center">
          <span className="text-2xl text-muted-foreground">∅</span>
        </div>
        <h3 className="text-lg font-medium mb-2">No comparisons yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Start by comparing two contracts
        </p>
        <Button onClick={() => router.push('/compare')}>
          New Comparison
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {comparisons.map((comparison) => (
        <ComparisonRow key={comparison.id} comparison={comparison} />
      ))}
    </div>
  );
}

interface ComparisonRowProps {
  comparison: Comparison;
}

function ComparisonRow({ comparison }: ComparisonRowProps) {
  const router = useRouter();
  const { id, name, status, overallRiskScore, createdAt } = comparison;

  const isCompleted = status === 'completed';
  const isProcessing = status === 'pending' || status === 'processing';

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:ring-2 hover:ring-foreground/10',
        isProcessing && 'opacity-70'
      )}
      onClick={() => router.push(`/compare/${id}`)}
    >
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <h3 className="text-lg font-medium truncate">{name || 'Untitled Comparison'}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
              <span>{formatRelativeTime(createdAt)}</span>
              {!isCompleted && (
                <>
                  <span>•</span>
                  <span className={cn('capitalize', getStatusColor(status))}>
                    {getStatusLabel(status)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {isCompleted && (
            <InlineRiskScore score={overallRiskScore} />
          )}
          {isProcessing && (
            <Spinner size={20} className="animate-spin text-muted-foreground" />
          )}
          <span className="text-muted-foreground">→</span>
        </div>
      </CardContent>
    </Card>
  );
}
