'use client';

// Executive summary panel

import { Lightbulb, Warning, CheckCircle, ArrowRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExecutiveSummary as ExecutiveSummaryType, RiskLevel } from '@/types/comparison';

interface ExecutiveSummaryProps {
  summary: ExecutiveSummaryType;
  className?: string;
}

export function ExecutiveSummary({ summary, className }: ExecutiveSummaryProps) {
  const { overview, keyFindings, materialChanges, riskHighlights, recommendations } = summary;

  const severityIcon = (severity: RiskLevel) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <Warning size={16} className="text-red-500" weight="fill" />;
      case 'medium':
        return <Warning size={16} className="text-amber-500" weight="fill" />;
      case 'low':
        return <CheckCircle size={16} className="text-green-500" weight="fill" />;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb size={20} weight="duotone" className="text-primary" />
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{overview}</p>
        </CardContent>
      </Card>

      {/* Key Findings */}
      {keyFindings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {keyFindings.map((finding, index) => (
                <li key={index} className="flex items-start gap-3">
                  {severityIcon(finding.severity)}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {finding.clauseType.replace('_', ' ')}
                    </span>
                    <p className="text-sm">{finding.finding}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Material Changes */}
      {materialChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Material Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {materialChanges.map((change, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <ArrowRight size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Risk Highlights */}
      {riskHighlights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">Risk Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {riskHighlights.map((highlight, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Warning
                    size={16}
                    className="text-red-500 shrink-0 mt-0.5"
                    weight="fill"
                  />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle
                    size={16}
                    className="text-primary shrink-0 mt-0.5"
                    weight="fill"
                  />
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
