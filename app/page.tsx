"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import {
  Scales,
  ArrowRight,
  ShieldCheck,
  MagnifyingGlass,
  ChartLineUp,
  FileText,
} from "@phosphor-icons/react";

export default function Page() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <main className="flex-1 flex flex-col">
      {/* Hero section - paper-like with white card on warm background */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-3xl text-center space-y-8">
          {/* Logo mark */}
          <div className="flex items-center justify-center">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <Scales size={48} className="text-primary" weight="duotone" />
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-light tracking-tight">
              Contract Clause Comparator
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
              Compare contract versions instantly. Identify changes, assess risk,
              and make informed decisions with AI-powered analysis.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex items-center justify-center gap-4 pt-2">
            {session ? (
              <Button size="lg" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
                <ArrowRight size={16} data-icon="inline-end" />
              </Button>
            ) : (
              <>
                <Link href="/signup">
                  <Button size="lg">
                    Get Started
                    <ArrowRight size={16} data-icon="inline-end" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features section - cards on warm background */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold mb-3">
              Powerful Contract Analysis
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for legal professionals who need fast, accurate contract review
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={MagnifyingGlass}
              title="Clause Extraction"
              description="AI identifies 15+ clause types including indemnification, liability, and confidentiality"
            />
            <FeatureCard
              icon={FileText}
              title="Side-by-Side Diffs"
              description="See exactly what changed with clear visual comparisons"
            />
            <FeatureCard
              icon={ChartLineUp}
              title="Risk Scoring"
              description="Get numerical scores (0-100) reflecting legal significance"
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Executive Summary"
              description="AI-generated overviews highlighting critical changes"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Scales;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 hover:border-foreground/20 transition-colors">
      <div className="p-2.5 rounded-lg bg-primary/10 w-fit mb-4">
        <Icon size={22} className="text-primary" weight="duotone" />
      </div>
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
