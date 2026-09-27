"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Flame, ArrowRight, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const DEMO_ACCOUNTS = [
  {
    name: "Admin User",
    email: "admin@incidentpulse.io",
    role: "ADMIN",
    description:
      "Full access to teams, services, escalation policies, and schedules",
  },
  {
    name: "Sarah Chen",
    email: "sarah.chen@incidentpulse.io",
    role: "RESPONDER",
    description: "On-call responder for Core Payments Team (Level 1)",
  },
  {
    name: "Alex Kumar",
    email: "alex.kumar@incidentpulse.io",
    role: "RESPONDER",
    description: "Platform Infrastructure Lead (Level 2)",
  },
  {
    name: "Viewer",
    email: "viewer@incidentpulse.io",
    role: "VIEWER",
    description: "Read-only access to incident feeds and post-mortems",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/incidents";

  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = React.useState("admin@incidentpulse.io");
  const [password, setPassword] = React.useState("Password123!");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.push(returnUrl);
    }
  }, [isAuthenticated, router, returnUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await login(email, password);
      router.push(returnUrl);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to authenticate. Please verify credentials.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function selectDemoAccount(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("Password123!");
    setErrorMessage(null);
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
          <Flame className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          IncidentPulse
        </h1>
        <p className="text-sm text-muted-foreground">
          On-Call Alerting & Incident Escalation Engine
        </p>
      </div>

      {/* Login Form Card */}
      <Card className="border-border shadow-md">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg">Sign In to Dashboard</CardTitle>
          <CardDescription>
            Enter your credentials or select a demo account below.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Email Address
              </label>
              <Input
                type="email"
                required
                placeholder="engineer@incidentpulse.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">
                  Password
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Default: Password123!
                </span>
              </div>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign In <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Demo Quick Accounts */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quick-Select Demo Profiles
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {DEMO_ACCOUNTS.map((acc) => {
            const isSelected = email === acc.email;
            return (
              <button
                key={acc.email}
                type="button"
                onClick={() => selectDemoAccount(acc.email)}
                className={`flex items-start justify-between rounded-lg border p-3 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:bg-accent hover:border-border/80"
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {acc.name}
                    </span>
                    <span className="rounded bg-secondary px-1.5 py-0.2 text-[10px] font-semibold text-secondary-foreground uppercase">
                      {acc.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {acc.email}
                  </p>
                  <p className="text-[11px] text-muted-foreground/80 italic">
                    {acc.description}
                  </p>
                </div>
                {isSelected && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      {/* Top bar right toggle */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <React.Suspense
        fallback={
          <div className="w-full max-w-md space-y-4">
            <Skeleton className="h-12 w-12 rounded-xl mx-auto" />
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        }
      >
        <LoginForm />
      </React.Suspense>
    </div>
  );
}
