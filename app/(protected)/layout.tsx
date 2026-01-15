'use client';

// App layout with navigation
// No authentication required - browser isolation via localStorage/IndexedDB

import Link from 'next/link';
import { ComparisonProvider, useComparison } from '@/lib/contexts/comparison-context';
import { UsageProvider } from '@/lib/contexts/usage-context';
import { UsageBanner, LimitExceededDialog } from '@/components/demo';
import { Spinner, House, Upload, Info } from '@phosphor-icons/react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UsageProvider>
      <ComparisonProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <UsageBanner />
          <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
            {children}
          </main>
          <ScoringGuide />
        </div>
        <LimitExceededDialog />
      </ComparisonProvider>
    </UsageProvider>
  );
}

function Header() {
  return (
    <header className="border-b border-border bg-white sticky top-0 z-50">
      <div className="flex items-center justify-between h-12 px-6">
        {/* Logo and nav */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 144 144" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M127.927 56.3865C127.927 54.7298 126.583 53.3867 124.927 53.3865H19.6143C17.9574 53.3865 16.6143 54.7296 16.6143 56.3865V128.226C16.6143 129.883 17.9574 131.226 19.6143 131.226H124.927C126.583 131.226 127.927 129.883 127.927 128.226V56.3865ZM93.1553 32.6638C93.1553 31.007 91.8121 29.6639 90.1553 29.6638H53.4102C51.7534 29.664 50.4102 31.0071 50.4102 32.6638V47.3865H93.1553V32.6638ZM99.1553 47.3865H124.927C129.897 47.3867 133.927 51.4161 133.927 56.3865V128.226C133.927 133.197 129.897 137.226 124.927 137.226H19.6143C14.6437 137.226 10.6143 133.197 10.6143 128.226V56.3865C10.6143 51.4159 14.6437 47.3865 19.6143 47.3865H44.4102V32.6638C44.4102 27.6933 48.4397 23.664 53.4102 23.6638H90.1553C95.1258 23.6639 99.1553 27.6933 99.1553 32.6638V47.3865Z" fill="currentColor" className="text-primary"/>
              <path d="M76.6382 70.6082C77.8098 69.4366 79.7088 69.4366 80.8804 70.6082L98.8013 88.5291C100.754 90.4817 100.754 93.6477 98.8013 95.6003L80.8804 113.521C79.7088 114.693 77.8097 114.693 76.6382 113.521C75.4667 112.35 75.4667 110.451 76.6382 109.279L93.8521 92.0642L76.6382 74.8503C75.4666 73.6788 75.4666 71.7797 76.6382 70.6082Z" fill="currentColor" className="text-primary"/>
              <path d="M67.3618 70.6082C66.1902 69.4366 64.2912 69.4366 63.1196 70.6082L45.1987 88.5291C43.2461 90.4817 43.2461 93.6477 45.1987 95.6003L63.1196 113.521C64.2912 114.693 66.1903 114.693 67.3618 113.521C68.5333 112.35 68.5333 110.451 67.3618 109.279L50.1479 92.0642L67.3618 74.8503C68.5334 73.6788 68.5334 71.7797 67.3618 70.6082Z" fill="currentColor" className="text-primary"/>
            </svg>
            <span className="text-lg" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Contract Comparator
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              <House size={16} />
              Dashboard
            </Link>
            <Link
              href="/compare"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              <Upload size={16} />
              Compare
            </Link>
          </nav>
        </div>

        {/* Right side: processing indicator and demo badge */}
        <div className="flex items-center gap-4 text-sm">
          <ActiveComparisonIndicator />
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 bg-emerald-500 rounded-sm" />
            <span>Demo</span>
            <Info size={16} className="text-muted-foreground/60" />
          </div>
        </div>
      </div>
    </header>
  );
}

function ActiveComparisonIndicator() {
  const { activeComparison, isComparisonInProgress } = useComparison();

  if (!isComparisonInProgress || !activeComparison) return null;

  return (
    <Link href={`/compare/${activeComparison.id}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner size={14} className="animate-spin" />
        <span className="hidden sm:inline">Processing</span>
      </div>
    </Link>
  );
}

function ScoringGuide() {
  return (
    <div className="border-t border-border bg-card">
      <div className="container mx-auto px-4 max-w-6xl py-6">
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-3">Risk Score Guide</p>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <span><span className="font-semibold text-foreground">0–24</span> Low Risk</span>
            <span><span className="font-semibold text-foreground">25–49</span> Medium Risk</span>
            <span><span className="font-semibold text-foreground">50–74</span> High Risk</span>
            <span><span className="font-semibold text-foreground">75–100</span> Critical</span>
          </div>
          <p className="mt-3 text-muted-foreground/80">
            Scores reflect the legal significance of clause changes, weighted by potential business impact.
          </p>
        </div>
      </div>
    </div>
  );
}
