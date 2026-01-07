'use client';

// Dashboard page - shows comparison history

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from '@phosphor-icons/react';
import { useSession } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { ComparisonList } from '@/components/comparison';
import { listComparisons } from '@/lib/storage';
import type { Comparison } from '@/types/comparison';

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load comparisons from IndexedDB
  useEffect(() => {
    async function loadComparisons() {
      if (!session?.user?.id) return;

      try {
        const data = await listComparisons(session.user.id);
        setComparisons(data);
      } catch (error) {
        console.error('Failed to load comparisons:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadComparisons();
  }, [session?.user?.id]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contract Comparisons</h1>
          <p className="text-muted-foreground mt-1">
            Review and manage your contract comparisons
          </p>
        </div>
        <Button onClick={() => router.push('/compare')}>
          <Plus size={16} data-icon="inline-start" />
          New Comparison
        </Button>
      </div>

      {/* Comparison list */}
      <ComparisonList comparisons={comparisons} isLoading={isLoading} />
    </div>
  );
}
