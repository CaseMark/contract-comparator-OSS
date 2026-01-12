'use client';

// Protected layout for authenticated pages
// Includes comparison provider and navigation

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from '@/lib/auth/client';
import { ComparisonProvider, useComparison } from '@/lib/contexts/comparison-context';
import { Button } from '@/components/ui/button';
import {
  House,
  Scales,
  SignOut,
  Spinner,
  User,
  Plus,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

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
      // Still redirect to login even if sign out API fails
      // (e.g., when auth database isn't configured)
      router.push('/login');
    }
  };

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo and nav */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Scales size={24} className="text-primary" weight="duotone" />
              <span className="font-semibold">Contract Comparator</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <NavLink href="/dashboard" icon={House}>
                Dashboard
              </NavLink>
              <NavLink href="/compare" icon={Plus}>
                New Comparison
              </NavLink>
            </nav>
          </div>

          {/* User menu */}
          <div className="flex items-center gap-4">
            <ActiveComparisonIndicator />
            <div className="flex items-center gap-2 text-sm">
              <User size={16} className="text-muted-foreground" />
              <span className="hidden sm:inline text-muted-foreground">{userName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground"
            >
              <SignOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof House;
  children: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Button variant="ghost" size="sm">
        <Icon size={16} data-icon="inline-start" />
        {children}
      </Button>
    </Link>
  );
}

function ActiveComparisonIndicator() {
  const { activeComparison, isComparisonInProgress } = useComparison();

  if (!isComparisonInProgress || !activeComparison) return null;

  return (
    <Link href={`/compare/${activeComparison.id}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
        <Spinner size={14} className="animate-spin" />
        <span className="hidden sm:inline">Processing...</span>
      </div>
    </Link>
  );
}
