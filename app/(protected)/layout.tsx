'use client';

// Protected layout for authenticated pages
// Includes comparison provider and navigation

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from '@/lib/auth/client';
import { ComparisonProvider, useComparison } from '@/lib/contexts/comparison-context';
import { Button } from '@/components/ui/button';
import { Spinner } from '@phosphor-icons/react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Redirect to login if not authenticated (must be in useEffect to avoid render-time navigation)
  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login');
    }
  }, [isPending, session, router]);

  // Show loading state while checking auth or redirecting
  if (isPending || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ComparisonProvider>
      <div className="min-h-screen flex flex-col">
        <Header userName={session?.user?.name || 'User'} />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
          {children}
        </main>
        <ScoringGuide />
      </div>
    </ComparisonProvider>
  );
}

function Header({ userName }: { userName: string }) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out failed:', error);
      router.push('/login');
    }
  };

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-14">
          {/* Logo and nav */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard">
              <h1 className="text-xl font-medium tracking-tight">
                Contract Comparator
              </h1>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/compare"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                New Comparison
              </Link>
            </nav>
          </div>

          {/* User menu */}
          <div className="flex items-center gap-6 text-sm">
            <ActiveComparisonIndicator />
            <span className="text-muted-foreground">{userName}</span>
            <button
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
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
    <div className="border-t bg-muted/30">
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
