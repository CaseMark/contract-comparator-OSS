'use client';

// Risk badge component for displaying risk scores and levels
// Grayscale styling per UI guidelines - professional legal aesthetic

import { cn } from '@/lib/utils';
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
    style: string;
    label: string;
  }
> = {
  low: {
    style: 'bg-muted text-muted-foreground',
    label: 'Low Risk',
  },
  medium: {
    style: 'bg-muted text-foreground',
    label: 'Medium Risk',
  },
  high: {
    style: 'bg-foreground/10 text-foreground font-semibold',
    label: 'High Risk',
  },
  critical: {
    style: 'bg-foreground text-background font-semibold',
    label: 'Critical',
  },
};

export function RiskBadge({ score, level, showScore = true, size = 'default' }: RiskBadgeProps) {
  const config = riskConfig[level];

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        config.style,
        sizeClasses[size]
      )}
    >
      <span className="font-mono">{showScore ? score : config.label}</span>
    </span>
  );
}

// Overall risk score display (icon style for detail pages)
interface OverallRiskScoreProps {
  score: number;
  className?: string;
}

export function OverallRiskScore({ score, className }: OverallRiskScoreProps) {
  const level: RiskLevel =
    score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
  const config = riskConfig[level];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex items-center justify-center w-12 h-12 border',
          level === 'low' && 'bg-muted border-border',
          level === 'medium' && 'bg-muted border-foreground/20',
          level === 'high' && 'bg-foreground/10 border-foreground/30',
          level === 'critical' && 'bg-foreground text-background border-foreground'
        )}
      >
        <span
          className={cn(
            'font-mono text-lg font-semibold',
            level === 'critical' ? 'text-background' : 'text-foreground'
          )}
        >
          {score}
        </span>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">{config.label}</div>
      </div>
    </div>
  );
}

// Inline risk score display (text style for list views)
interface InlineRiskScoreProps {
  score: number;
  className?: string;
}

export function InlineRiskScore({ score, className }: InlineRiskScoreProps) {
  const level: RiskLevel =
    score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';
  const config = riskConfig[level];

  return (
    <span className={cn('text-sm text-muted-foreground', className)}>
      <span className="font-semibold text-foreground">{score}</span>
      {' '}
      {config.label}
    </span>
  );
}
