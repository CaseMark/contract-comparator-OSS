'use client';

// Match type badge component
// Grayscale styling per UI guidelines - professional legal aesthetic

import { cn } from '@/lib/utils';
import type { MatchType } from '@/types/comparison';

interface MatchBadgeProps {
  matchType: MatchType;
  size?: 'xs' | 'sm' | 'default';
}

const matchConfig: Record<
  MatchType,
  {
    style: string;
    label: string;
  }
> = {
  identical: {
    style: 'bg-muted text-muted-foreground',
    label: 'Unchanged',
  },
  modified: {
    style: 'bg-foreground/10 text-foreground border border-foreground/20',
    label: 'Modified',
  },
  added: {
    style: 'bg-muted text-foreground border border-dashed border-foreground/30',
    label: 'Added',
  },
  removed: {
    style: 'bg-foreground/5 text-muted-foreground line-through',
    label: 'Removed',
  },
};

export function MatchBadge({ matchType, size = 'default' }: MatchBadgeProps) {
  const config = matchConfig[matchType];

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.style,
        sizeClasses[size]
      )}
    >
      {config.label}
    </span>
  );
}
