"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      {/* Hero section */}
      <section className="flex-1 flex flex-col items-center justify-center bg-background px-6 py-16">
        <div className="max-w-3xl text-center space-y-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Scales size={40} className="text-primary" weight="duotone" />
          </div>
          <h1
            className="text-4xl md:text-5xl font-light tracking-tight text-foreground"
            style={{ fontFamily: "'Spectral', serif" }}
          >
            Contract Clause Comparator
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Compare contract versions instantly. Identify changes, assess risk,
            and make informed decisions with AI-powered analysis.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
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

      {/* Features section */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-12">
            Powerful Contract Analysis
          </h2>
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
    <Card>
      <CardContent className="pt-6">
        <div className="p-2 rounded-lg bg-primary/10 w-fit mb-4">
          <Icon size={24} className="text-primary" weight="duotone" />
        </div>
        <h3 className="font-medium mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
