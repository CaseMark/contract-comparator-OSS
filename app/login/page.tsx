'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';

function CaseDevLogo({ className = "" }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 144 144" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M127.927 56.3865C127.927 54.7298 126.583 53.3867 124.927 53.3865H19.6143C17.9574 53.3865 16.6143 54.7296 16.6143 56.3865V128.226C16.6143 129.883 17.9574 131.226 19.6143 131.226H124.927C126.583 131.226 127.927 129.883 127.927 128.226V56.3865ZM93.1553 32.6638C93.1553 31.007 91.8121 29.6639 90.1553 29.6638H53.4102C51.7534 29.664 50.4102 31.0071 50.4102 32.6638V47.3865H93.1553V32.6638ZM99.1553 47.3865H124.927C129.897 47.3867 133.927 51.4161 133.927 56.3865V128.226C133.927 133.197 129.897 137.226 124.927 137.226H19.6143C14.6437 137.226 10.6143 133.197 10.6143 128.226V56.3865C10.6143 51.4159 14.6437 47.3865 19.6143 47.3865H44.4102V32.6638C44.4102 27.6933 48.4397 23.664 53.4102 23.6638H90.1553C95.1258 23.6639 99.1553 27.6933 99.1553 32.6638V47.3865Z" fill="currentColor"/>
      <path d="M76.6382 70.6082C77.8098 69.4366 79.7088 69.4366 80.8804 70.6082L98.8013 88.5291C100.754 90.4817 100.754 93.6477 98.8013 95.6003L80.8804 113.521C79.7088 114.693 77.8097 114.693 76.6382 113.521C75.4667 112.35 75.4667 110.451 76.6382 109.279L93.8521 92.0642L76.6382 74.8503C75.4666 73.6788 75.4666 71.7797 76.6382 70.6082Z" fill="currentColor"/>
      <path d="M67.3618 70.6082C66.1902 69.4366 64.2912 69.4366 63.1196 70.6082L45.1987 88.5291C43.2461 90.4817 43.2461 93.6477 45.1987 95.6003L63.1196 113.521C64.2912 114.693 66.1903 114.693 67.3618 113.521C68.5333 112.35 68.5333 110.451 67.3618 109.279L50.1479 92.0642L67.3618 74.8503C68.5334 73.6788 68.5334 71.7797 67.3618 70.6082Z" fill="currentColor"/>
    </svg>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10">
              <CaseDevLogo className="text-primary" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Contract Comparator</span>
          </Link>
        </div>

        {/* Login card */}
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm callbackUrl={callbackUrl} />

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link
                href={`/signup${callbackUrl !== '/dashboard' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
