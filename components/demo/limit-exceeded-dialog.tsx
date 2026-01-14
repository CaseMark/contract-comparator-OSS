'use client';

import { Warning } from '@phosphor-icons/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useUsage } from '@/lib/contexts/usage-context';

export function LimitExceededDialog() {
  const { isLimitExceeded, limitExceededMessage, usageCheck } = useUsage();

  if (!isLimitExceeded) return null;

  const isTimeExceeded = usageCheck.reason === 'time_exceeded';

  return (
    <AlertDialog open={true}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-red-100 text-red-600">
            <Warning size={32} />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {isTimeExceeded ? 'Demo Session Expired' : 'Usage Limit Reached'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {limitExceededMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            Create your own account at Case.dev to continue using the Contract Comparator
            with no limits.
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Full API access with your own keys</li>
            <li>Compare unlimited contracts</li>
            <li>No session time limits</li>
          </ul>
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/dashboard'}
          >
            View Past Results
          </Button>
          <AlertDialogAction
            onClick={() => window.open('https://console.case.dev', '_blank')}
          >
            Create Account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
