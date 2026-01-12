'use client';

// Risk badge component for displaying risk scores and levels

import { Warning, ShieldWarning, CheckCircle, ShieldCheck } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { RiskLevel } from '@/types/comparison';

interface RiskBadgeProps {
  score: number;
  level: RiskLevel;
  showScore?: boolean;
  size?: 'xs' | 'sm' | 'default';
}

const riskConfig: Record<
  RiskLevel,
  {
    color: string;
    icon: typeof Warning;
    label: string;
  }
> = {
  low: {
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    icon: CheckCircle,
    label: 'Low Risk',
  },
  medium: {
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    icon: Warning,
    label: 'Medium Risk',
  },
  high: {
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    icon: ShieldWarning,
    label: 'High Risk',
  },
  critical: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    icon: ShieldWarning,
    label: 'Critical',
  },
};

export function RiskBadge({ score, level, showScore = true, size = 'default' }: RiskBadgeProps) {
  const config = riskConfig[level];
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
      {showScore ? score : config.label}
    </span>
  );
}

// Overall risk score display
interface OverallRiskScoreProps {
  score: number;
  className?: string;
}

export function OverallRiskScore({ score, className }: OverallRiskScoreProps) {
  const level: RiskLevel =
    score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
  const config = riskConfig[level];
  const Icon = level === 'low' ? ShieldCheck : ShieldWarning;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex items-center justify-center w-12 h-12 rounded-full',
          level === 'low' && 'bg-green-100 dark:bg-green-900/30',
          level === 'medium' && 'bg-amber-100 dark:bg-amber-900/30',
          level === 'high' && 'bg-orange-100 dark:bg-orange-900/30',
          level === 'critical' && 'bg-red-100 dark:bg-red-900/30'
        )}
      >
        <Icon
          size={24}
          weight="duotone"
          className={cn(
            level === 'low' && 'text-green-600 dark:text-green-400',
            level === 'medium' && 'text-amber-600 dark:text-amber-400',
            level === 'high' && 'text-orange-600 dark:text-orange-400',
            level === 'critical' && 'text-red-600 dark:text-red-400'
          )}
        />
      </div>
      <div>
        <div className="text-2xl font-semibold">{score}</div>
        <div className="text-sm text-muted-foreground">{config.label}</div>
      </div>
    </div>
  );
}
