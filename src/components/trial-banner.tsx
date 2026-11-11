"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { formatTrialEnd } from "@/lib/plans";

function goToPricing() {
  const pricing = document.getElementById("pricing");
  if (pricing) {
    pricing.scrollIntoView({ behavior: "smooth" });
  } else {
    window.location.href = "/#pricing";
  }
}

export function TrialBanner() {
  const { loading, user, effectiveTier, trialDaysLeft, trialEnd } = useAuth();
  const trialEndLabel = formatTrialEnd(trialEnd);

  // Don't render during auth loading — avoids popping between states while
  // the client-side profile fetch completes.
  if (loading || !user) return null;

  // Active trial
  if (effectiveTier === "trial" && trialDaysLeft > 0) {
    return (
      <div className="w-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white text-center py-2 px-4 text-sm flex items-center justify-center gap-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <strong>{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left</strong>
          {trialEndLabel ? ` — ends ${trialEndLabel}` : " in your Elite trial"}
        </span>
        <span className="hidden sm:inline text-white/80">— Voice, posts, and video are live. Cowork is coming soon.</span>
        <Button
          size="sm"
          variant="secondary"
          className="ml-2 h-6 px-3 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
          onClick={goToPricing}
        >
          Upgrade Now
        </Button>
      </div>
    );
  }

  // Expired trial
  if (effectiveTier === "expired") {
    return (
      <div className="w-full bg-gradient-to-r from-red-900/80 to-orange-900/80 text-white text-center py-2 px-4 text-sm flex items-center justify-center gap-3">
        <span>⚠️ Your Elite trial has ended</span>
        <Button
          size="sm"
          variant="secondary"
          className="ml-2 h-6 px-3 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
          onClick={goToPricing}
        >
          Upgrade to Continue
        </Button>
      </div>
    );
  }

  return null;
}
