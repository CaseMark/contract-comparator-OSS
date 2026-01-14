'use client';

// Executive summary panel
// Grayscale styling per UI guidelines - professional legal aesthetic

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExecutiveSummary as ExecutiveSummaryType, RiskLevel } from '@/types/comparison';

interface ExecutiveSummaryProps {
  summary: ExecutiveSummaryType;
  className?: string;
}

export function ExecutiveSummary({ summary, className }: ExecutiveSummaryProps) {
  const { overview, keyFindings, materialChanges, riskHighlights, recommendations } = summary;

  // Severity indicator using typography instead of colors
  const severityMarker = (severity: RiskLevel) => {
    switch (severity) {
      case 'critical':
        return <span className="font-semibold text-foreground">●</span>;
      case 'high':
        return <span className="font-medium text-foreground">●</span>;
      case 'medium':
        return <span className="text-muted-foreground">○</span>;
      case 'low':
        return <span className="text-muted-foreground/50">○</span>;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
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
                  {severityMarker(finding.severity)}
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
                  <span className="text-muted-foreground shrink-0">→</span>
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
            <CardTitle>Risk Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {riskHighlights.map((highlight, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-foreground font-semibold shrink-0">!</span>
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
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">{index + 1}.</span>
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
