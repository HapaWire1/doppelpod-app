"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteFooter } from "@/components/site-footer";
import { getEffectiveTier, getTrialDaysLeft, type TierName } from "@/lib/tiers";
import { formatTrialEnd } from "@/lib/plans";

interface AccountBillingProps {
  email: string;
  profile: {
    tier: string;
    trial_end: string | null;
    paid_tier: string | null;
    comp_tier: TierName | null;
    stripe_customer_id: string | null;
  };
}

export function AccountBilling({ email, profile }: AccountBillingProps) {
  const tier = getEffectiveTier(profile);
  const daysLeft = getTrialDaysLeft(profile.trial_end);
  const trialEndLabel = formatTrialEnd(profile.trial_end);
  const trialStillOpen = !!profile.trial_end && new Date(profile.trial_end).getTime() > Date.now();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openBillingPortal() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/account/billing-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error || "Billing portal is not available for this account.");
    } catch {
      setError("Could not open billing. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-lg font-bold text-transparent">
            DoppelPod
          </Link>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
        </div>
      </nav>
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-bold">Account & billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your plan, when the trial ends, and Stripe billing when a customer portal exists.
        </p>
        <Card className="mt-6 border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span className="text-right">{email}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Plan</span>
              <span className="uppercase">{tier}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Trial end</span>
              <span className="text-right">
                {trialEndLabel
                  ? `${trialStillOpen ? "Ends" : "Ended"} ${trialEndLabel}${tier === "trial" ? ` (${daysLeft} day${daysLeft === 1 ? "" : "s"} left)` : ""}`
                  : "No trial end date on this account"}
              </span>
            </div>
            {profile.stripe_customer_id ? (
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                onClick={openBillingPortal}
                disabled={loading}
              >
                {loading ? "Opening billing..." : "Manage billing"}
              </Button>
            ) : (
              <p className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
                No Stripe customer on this account, so there is no billing portal link yet. Subscribe from the dashboard and this page will open the existing Stripe customer portal.
              </p>
            )}
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Link href="/dashboard" className="inline-block text-xs text-purple-300 underline-offset-2 hover:underline">
              Back to dashboard
            </Link>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
