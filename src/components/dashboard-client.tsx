"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { CheckoutModal } from "@/components/checkout-modal";
import { TIER_LIMITS } from "@/lib/tiers";
import Link from "next/link";

interface Generation {
  id: string;
  input_text: string;
  output_text: string;
  created_at: string;
}

interface DashboardClientProps {
  user: { id: string; email: string };
  profile: { tier: string; voice_id: string | null };
  initialGenerations: Generation[];
}

export function DashboardClient({
  user,
  profile,
  initialGenerations,
}: DashboardClientProps) {
  const { signOut, effectiveTier, trialDaysLeft, usage, refreshProfile } = useAuth();
  const limits = TIER_LIMITS[effectiveTier];
  const [generations] = useState<Generation[]>(initialGenerations);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<"pro" | "elite">("pro");
  const [activePlan, setActivePlan] = useState(profile.tier);

  const tierInfo = {
    pro: {
      price: "$29/mo",
      features: [
        "Unlimited AI posts",
        "All platforms",
        "Advanced voice cloning",
        "Basic video avatars",
        "Priority support",
      ],
    },
    elite: {
      price: "$69/mo",
      features: [
        "Everything in Pro",
        "Claude Cowork",
        "Advanced video avatars",
        "Priority generation",
        "Dedicated account manager",
      ],
    },
  };
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(
    profile.voice_id ? "Voice sample uploaded" : null
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const tierColors: Record<string, string> = {
    free: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    pro: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    elite: "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-400 border-pink-500/30",
  };

  async function handleVoiceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setVoiceUploading(true);
    setVoiceStatus(null);

    try {
      const formData = new FormData();
      formData.append("audio", file);

      const res = await fetch("/api/voice/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setVoiceStatus("Voice sample uploaded successfully!");
      } else {
        const data = await res.json();
        setVoiceStatus(`Error: ${data.error || "Upload failed"}`);
      }
    } catch {
      setVoiceStatus("Error: Failed to upload voice sample.");
    } finally {
      setVoiceUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            href="/"
            className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-lg font-bold text-transparent"
          >
            DoppelPod
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              onClick={() => signOut()}
            >
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 pt-24 pb-16 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your AI twin, view past generations, and upgrade your plan.
          </p>
        </motion.div>

        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">Plan:</span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${
                    tierColors[effectiveTier] || tierColors.free
                  }`}
                >
                  {effectiveTier === "trial"
                    ? `Trial (${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left)`
                    : effectiveTier}
                </span>
                {activePlan === "free" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                      onClick={() => {
                        setCheckoutTier("pro");
                        setCheckoutOpen(true);
                      }}
                    >
                      Upgrade to Pro
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                      onClick={() => {
                        setCheckoutTier("elite");
                        setCheckoutOpen(true);
                      }}
                    >
                      Go Elite
                    </Button>
                  </div>
                )}
                {activePlan === "pro" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                    onClick={() => {
                      setCheckoutTier("elite");
                      setCheckoutOpen(true);
                    }}
                  >
                    Upgrade to Elite
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="text-sm">{user.email}</span>
              </div>
              {/* Usage stats */}
              {usage && (
                <div className="border-t border-border/50 pt-3 space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Usage This Month</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                      <p className="text-[10px] text-muted-foreground">Videos</p>
                      <p className="text-sm font-semibold">
                        {usage.video_count}
                        {limits.videoLimit !== null && <span className="text-muted-foreground font-normal">/{limits.videoLimit}</span>}
                        {limits.videoLimit === null && <span className="text-muted-foreground font-normal text-[10px] ml-1">unlimited</span>}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                      <p className="text-[10px] text-muted-foreground">Cowork Today</p>
                      <p className="text-sm font-semibold">
                        {usage.cowork_sessions_today}
                        {limits.coworkDailyLimit !== null && <span className="text-muted-foreground font-normal">/{limits.coworkDailyLimit}</span>}
                        {limits.coworkDailyLimit === null && <span className="text-muted-foreground font-normal text-[10px] ml-1">unlimited</span>}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Voice Clone Manager */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Voice Clone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a voice sample (30s–2min) to create your AI voice clone.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleVoiceUpload}
                />
                <Button
                  variant="outline"
                  className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                  onClick={() => fileRef.current?.click()}
                  disabled={voiceUploading}
                >
                  {voiceUploading ? "Uploading..." : "Upload Voice Sample"}
                </Button>
                {voiceStatus && (
                  <span
                    className={`text-xs ${
                      voiceStatus.startsWith("Error")
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {voiceStatus}
                  </span>
                )}
              </div>
              {profile.voice_id && (
                <div className="rounded-md border border-green-500/20 bg-green-500/5 px-3 py-2">
                  <p className="text-xs text-green-400">
                    Voice sample configured. Your AI twin will use your cloned
                    voice.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Past Generations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Past Generations</CardTitle>
            </CardHeader>
            <CardContent>
              {generations.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No generations yet.
                  </p>
                  <Link href="/#demo">
                    <Button
                      className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                      size="sm"
                    >
                      Try the Demo
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {generations.map((gen) => (
                    <div
                      key={gen.id}
                      className="rounded-lg border border-border/50 p-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Input
                          </p>
                          <p className="text-sm leading-relaxed line-clamp-2">
                            {gen.input_text}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            AI Twin Output
                          </p>
                          <p className="text-sm leading-relaxed text-purple-300">
                            {gen.output_text}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(gen.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        tier={checkoutTier}
        price={tierInfo[checkoutTier].price}
        features={tierInfo[checkoutTier].features}
        onSuccess={(tier) => setActivePlan(tier)}
      />
    </div>
  );
}
