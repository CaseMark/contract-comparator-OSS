'use client';

import { Warning, Clock, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useUsage } from '@/lib/contexts/usage-context';
import { cn } from '@/lib/utils';

export function UsageBanner() {
  const { usageCheck, warningLevel, timeRemainingFormatted, isLimitExceeded } = useUsage();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if no warning or dismissed (unless limit exceeded, which can't be dismissed)
  if (warningLevel === 'none' && !isLimitExceeded) return null;
  if (isDismissed && !isLimitExceeded) return null;

  const isApproaching = warningLevel === 'approaching';
  const isCritical = warningLevel === 'critical' || isLimitExceeded;

  // Determine primary metric to display
  const primaryMetric = usageCheck.percentCostUsed > usageCheck.percentTimeUsed
    ? { label: 'cost', percent: usageCheck.percentCostUsed }
    : { label: 'time', percent: usageCheck.percentTimeUsed };

  return (
    <div
      className={cn(
        'relative border-b px-4 py-2.5 text-sm',
        isApproaching && 'bg-amber-50 border-amber-200 text-amber-800',
        isCritical && 'bg-red-50 border-red-200 text-red-800'
      )}
    >
      <div className="flex items-center justify-center gap-3">
        {isCritical ? (
          <Warning size={16} className="shrink-0" />
        ) : (
          <Clock size={16} className="shrink-0" />
        )}

        <span className="font-medium">
          {isLimitExceeded ? (
            'Demo limit reached'
          ) : isCritical ? (
            `Demo usage critical: ${Math.round(primaryMetric.percent)}% of ${primaryMetric.label} limit used`
          ) : (
            `Approaching demo limit: ${timeRemainingFormatted} remaining`
          )}
        </span>

        {!isLimitExceeded && (
          <a
            href="https://console.case.dev"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'text-xs underline underline-offset-2',
              isApproaching && 'text-amber-700 hover:text-amber-900',
              isCritical && 'text-red-700 hover:text-red-900'
            )}
          >
            Create your own account
          </a>
        )}

        {!isLimitExceeded && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => setIsDismissed(true)}
          >
            <X size={14} />
            <span className="sr-only">Dismiss</span>
          </Button>
        )}
      </div>
    </div>
  );
}
