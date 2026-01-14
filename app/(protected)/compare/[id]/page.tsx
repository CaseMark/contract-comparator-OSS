'use client';

// Comparison results page

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Spinner,
  ListBullets,
  Article,
  Warning,
  Files,
} from '@phosphor-icons/react';
import { useComparison } from '@/lib/contexts/comparison-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ClauseList, ExecutiveSummary, OverallRiskScore, RedlineView } from '@/components/comparison';
import { formatDateTime } from '@/lib/contracts/utils';
import {
  saveComparison,
  getComparison as getComparisonFromDB,
  saveClauseMatches,
  getClauseMatchesByComparison,
  getContract,
  saveContract,
} from '@/lib/storage';
import type { Comparison, ClauseMatch } from '@/types/comparison';
import type { Contract } from '@/types/contract';

type TabType = 'summary' | 'clauses' | 'redline';

export default function ComparisonResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { activeComparison, clearActiveComparison } = useComparison();

  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [clauseMatches, setClauseMatches] = useState<ClauseMatch[]>([]);
  const [sourceContract, setSourceContract] = useState<Contract | null>(null);
  const [targetContract, setTargetContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  // Load comparison - first from IndexedDB, then poll API if needed
  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;

    async function loadFromIndexedDB(): Promise<boolean> {
      try {
        const stored = await getComparisonFromDB(id);
        if (stored && stored.status === 'completed') {
          // Also load clause matches and contracts
          const [storedMatches, source, target] = await Promise.all([
            getClauseMatchesByComparison(id),
            getContract(stored.sourceContractId),
            getContract(stored.targetContractId),
          ]);

          if (isMounted) {
            setComparison(stored);
            setClauseMatches(storedMatches);
            setSourceContract(source || null);
            setTargetContract(target || null);
            setIsLoading(false);

            // Clear active comparison if this one is complete
            if (activeComparison?.id === id) {
              clearActiveComparison();
            }
          }
          return true;
        }
      } catch (err) {
        console.error('Failed to load from IndexedDB:', err);
      }
      return false;
    }

    async function fetchFromAPI() {
      try {
        const response = await fetch(`/api/contracts/compare/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch comparison');
        }

        const data = await response.json();

        if (data.status === 'completed' && data.comparison) {
          // Save comparison to IndexedDB for persistence
          const saved = await saveComparison(data.comparison);
          if (saved) {
            console.log('[Comparison] Saved to IndexedDB:', id);
          }

          // Save clause matches to IndexedDB
          if (data.clauseMatches && data.clauseMatches.length > 0) {
            const matchesSaved = await saveClauseMatches(data.clauseMatches);
            if (matchesSaved) {
              console.log('[Comparison] Saved clause matches to IndexedDB:', data.clauseMatches.length);
            }
          }

          // Save contracts to IndexedDB for redline view
          if (data.sourceContract) {
            await saveContract(data.sourceContract);
            console.log('[Comparison] Saved source contract to IndexedDB');
          }
          if (data.targetContract) {
            await saveContract(data.targetContract);
            console.log('[Comparison] Saved target contract to IndexedDB');
          }

          if (isMounted) {
            setComparison(data.comparison);
            setClauseMatches(data.clauseMatches || []);
            setSourceContract(data.sourceContract || null);
            setTargetContract(data.targetContract || null);
            setIsLoading(false);

            // Clear active comparison since it's done
            if (activeComparison?.id === id) {
              clearActiveComparison();
            }
          }

          if (pollInterval) clearInterval(pollInterval);
        } else if (data.status === 'failed') {
          if (isMounted) {
            setError(data.error || 'Comparison failed');
            setIsLoading(false);
            clearActiveComparison();
          }
          if (pollInterval) clearInterval(pollInterval);
        }
        // Keep polling if still processing
      } catch (err) {
        console.error('Error fetching comparison:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
          setIsLoading(false);
        }
        if (pollInterval) clearInterval(pollInterval);
      }
    }

    async function init() {
      // First try to load from IndexedDB
      const found = await loadFromIndexedDB();

      if (!found) {
        // Not in IndexedDB, poll the API
        fetchFromAPI();
        pollInterval = setInterval(fetchFromAPI, 3000);
      }
    }

    init();

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [id, activeComparison?.id, clearActiveComparison]);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-6">
          <ArrowLeft size={16} data-icon="inline-start" />
          Back to Dashboard
        </Button>

        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <Spinner size={48} className="animate-spin text-primary mb-4" />
              <h2 className="text-lg font-medium mb-2">Analyzing Contracts</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                We&apos;re extracting clauses, matching content, and assessing risk.
                This usually takes 30-60 seconds.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Processing...
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-6">
          <ArrowLeft size={16} data-icon="inline-start" />
          Back to Dashboard
        </Button>

        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <Warning size={48} className="text-destructive mb-4" weight="duotone" />
              <h2 className="text-lg font-medium mb-2">Comparison Failed</h2>
              <p className="text-sm text-muted-foreground max-w-md mb-4">{error}</p>
              <Button onClick={() => router.push('/compare')}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No comparison found
  if (!comparison) {
    return (
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-6">
          <ArrowLeft size={16} data-icon="inline-start" />
          Back to Dashboard
        </Button>

        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <Warning size={48} className="text-muted-foreground mb-4" weight="duotone" />
              <h2 className="text-lg font-medium mb-2">Comparison Not Found</h2>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                This comparison may have been deleted or doesn&apos;t exist.
              </p>
              <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push('/dashboard')}>
        <ArrowLeft size={16} data-icon="inline-start" />
        Back to Dashboard
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{comparison.name}</h1>
          {(comparison.sourceFileName || comparison.targetFileName) && (
            <p className="text-base text-muted-foreground mt-1">
              {comparison.sourceFileName || 'Source'} vs {comparison.targetFileName || 'Target'}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            Compared on {formatDateTime(comparison.createdAt)}
          </p>
        </div>
        <OverallRiskScore score={comparison.overallRiskScore} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-lg bg-muted/50 w-fit">
        <Button
          variant={activeTab === 'summary' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('summary')}
        >
          <Article size={16} data-icon="inline-start" />
          Summary
        </Button>
        <Button
          variant={activeTab === 'clauses' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('clauses')}
        >
          <ListBullets size={16} data-icon="inline-start" />
          Clauses
        </Button>
        <Button
          variant={activeTab === 'redline' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('redline')}
        >
          <Files size={16} data-icon="inline-start" />
          Redline
        </Button>
      </div>

      {/* Tab content */}
      {activeTab === 'summary' && comparison.summary ? (
        <ExecutiveSummary summary={comparison.summary} />
      ) : activeTab === 'summary' && !comparison.summary ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No summary available for this comparison.
          </CardContent>
        </Card>
      ) : activeTab === 'clauses' ? (
        <ClauseList clauseMatches={clauseMatches} />
      ) : activeTab === 'redline' ? (
        <RedlineView
          sourceContract={sourceContract}
          targetContract={targetContract}
          clauseMatches={clauseMatches}
        />
      ) : null}
    </div>
  );
}
