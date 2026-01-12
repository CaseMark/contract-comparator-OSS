'use client';

// Match type badge component

import { Equals, PencilSimple, Plus, Minus } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { MatchType } from '@/types/comparison';

interface MatchBadgeProps {
  matchType: MatchType;
  size?: 'xs' | 'sm' | 'default';
}

const matchConfig: Record<
  MatchType,
  {
    color: string;
    icon: typeof Equals;
    label: string;
  }
> = {
  identical: {
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    icon: Equals,
    label: 'Unchanged',
  },
  modified: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    icon: PencilSimple,
    label: 'Modified',
  },
  added: {
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    icon: Plus,
    label: 'Added',
  },
  removed: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    icon: Minus,
    label: 'Removed',
  },
};

export function MatchBadge({ matchType, size = 'default' }: MatchBadgeProps) {
  const config = matchConfig[matchType];
  const Icon = config.icon;

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-2.5 py-1 text-sm',
  };

  const iconSize = {
    xs: 10,
    sm: 12,
    default: 14,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        config.color,
        sizeClasses[size]
      )}
    >
      <Icon size={iconSize[size]} weight="bold" />
      {config.label}
    </span>
  );
}
