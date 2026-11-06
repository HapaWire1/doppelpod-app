"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { CheckoutModal } from "@/components/checkout-modal";
import { FeedbackModal } from "@/components/feedback-modal";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
import { GenerateWidget } from "@/components/generate-widget";
import { VoiceRecorder } from "@/components/voice-recorder";
import { VoiceUploadZone } from "@/components/voice-upload-zone";
import { SiteFooter } from "@/components/site-footer";
import { TIER_LIMITS, getEffectiveTier, getTrialDaysLeft } from "@/lib/tiers";
import {
  ELITE_FEATURES,
  ELITE_PRICE_MONTHLY,
  ELITE_PRICE_YEARLY,
  PRO_FEATURES,
  PRO_PRICE_MONTHLY,
  PRO_PRICE_YEARLY,
  featureLabel,
  formatTrialEnd,
  planPrice,
} from "@/lib/plans";
import { startStripeCheckout } from "@/lib/start-checkout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";

interface Generation {
  id: string;
  input_text: string;
  output_text: string;
  created_at: string;
}

interface VideoJob {
  id: string;
  status: string;
  has_photo: boolean;
  heygen_video_url: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface DashboardClientProps {
  user: { id: string; email: string };
  profile: { tier: string; voice_id: string | null; elevenlabs_voice_id?: string | null; fish_voice_id?: string | null; heygen_avatar_id?: string | null; comms_email?: string | null; trial_end?: string | null; paid_tier?: string | null; comp_tier?: string | null; email_confirmed?: boolean | null; stripe_customer_id?: string | null };
  initialGenerations: Generation[];
  initialVideoJobs: VideoJob[];
}

function OnboardingChecklist({
  hasVoiceOrPhoto,
  hasPost,
  hasVideo,
}: {
  hasVoiceOrPhoto: boolean;
  hasPost: boolean;
  hasVideo: boolean;
}) {
  const steps = [
    {
      label: "Upload your voice or photo",
      detail: "A voice sample unlocks your own playback. A photo is optional and lives in the video section.",
      href: hasVoiceOrPhoto ? "#talking-video" : "#voice-clone",
      done: hasVoiceOrPhoto,
    },
    {
      label: "Create your first twin post",
      detail: "Type a topic and generate a post. It is saved in Past generations.",
      href: "#generate",
      done: hasPost,
    },
    {
      label: "Try a talking video",
      detail: "Videos take 15–60 minutes. We email you when the file is ready.",
      href: "#talking-video",
      done: hasVideo,
    },
  ];
  const remaining = steps.filter((step) => !step.done).length;
  if (remaining === 0) return null;

  return (
    <Card className="border-purple-500/30 bg-purple-950/10">
      <CardHeader>
        <CardTitle className="text-lg">Get your twin ready</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {remaining} step{remaining === 1 ? "" : "s"} left on your first run.
        </p>
        <ol className="space-y-2">
          {steps.map((step, index) => (
            <li key={step.label}>
              <a
                href={step.href}
                className="flex items-start gap-3 rounded-lg border border-border/50 px-3 py-2 transition-colors hover:border-purple-500/40"
              >
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${step.done ? "bg-green-500/20 text-green-400" : "bg-purple-500/20 text-purple-300"}`}>
                  {step.done ? "✓" : index + 1}
                </span>
                <span>
                  <span className={`block text-sm font-medium ${step.done ? "text-muted-foreground line-through" : ""}`}>
                    {step.label}
                  </span>
                  {!step.done && <span className="block text-xs text-muted-foreground">{step.detail}</span>}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function ExpiredOverlay({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm">
      <div className="text-center space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Your trial has ended</p>
        <Button
          size="sm"
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
          onClick={onUpgrade}
        >
          Upgrade to Continue
        </Button>
      </div>
    </div>
  );
}

const VIDEO_STATUS_LABELS: Record<string, string> = {
  pending: "Queued",
  creating_avatar: "Creating avatar…",
  awaiting_avatar: "Processing avatar…",
  generating_video: "Generating video…",
  awaiting_video: "Processing video…",
  completed: "Ready",
  failed: "Failed",
};

const ACTIVE_STATUSES = new Set([
  "pending", "creating_avatar", "awaiting_avatar", "generating_video", "awaiting_video",
]);

export function DashboardClient({
  user,
  profile,
  initialGenerations,
  initialVideoJobs,
}: DashboardClientProps) {
  const { signOut, profile: liveProfile, effectiveTier, emailConfirmed, usage, refreshProfile, acknowledgeEmailVerified, updatePassword, deleteAccount } = useAuth();
  // Server profile is the tier until the client profile actually loads.
  // A failed /api/profile must not replace that with the logged-out "expired" default,
  // and an ended trial must not flash as Elite while auth is still resolving.
  const serverTier = getEffectiveTier({
    tier: profile.tier,
    paid_tier: profile.paid_tier ?? null,
    comp_tier: profile.comp_tier ?? null,
    trial_end: profile.trial_end ?? null,
  });
  const displayTier = liveProfile ? effectiveTier : serverTier;
  const daysLeft = getTrialDaysLeft((liveProfile?.trial_end ?? profile.trial_end) ?? null);
  const limits = TIER_LIMITS[displayTier];
  const [generations, setGenerations] = useState<Generation[]>(initialGenerations);
  const [videoJobs, setVideoJobs] = useState<VideoJob[]>(initialVideoJobs);
  const [copiedGenId, setCopiedGenId] = useState<string | null>(null);

  async function copyGeneration(gen: Generation) {
    try {
      await navigator.clipboard.writeText(gen.output_text);
      setCopiedGenId(gen.id);
      setTimeout(() => setCopiedGenId((id) => (id === gen.id ? null : id)), 1800);
    } catch {
      // Clipboard can be unavailable (e.g. insecure context) — fail quietly.
    }
  }
  const videoJobsPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for video job updates while any jobs are active
  useEffect(() => {
    const hasActive = videoJobs.some((j) => ACTIVE_STATUSES.has(j.status));
    if (!hasActive) {
      if (videoJobsPollingRef.current) clearInterval(videoJobsPollingRef.current);
      return;
    }
    videoJobsPollingRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/video-jobs");
        if (res.ok) {
          const data = await res.json();
          setVideoJobs(data.jobs || []);
        }
      } catch {
        // Ignore polling errors
      }
    }, 15000);
    return () => {
      if (videoJobsPollingRef.current) clearInterval(videoJobsPollingRef.current);
    };
  }, [videoJobs]);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<"pro" | "elite">("pro");
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeBillingPeriod, setUpgradeBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [activePlan, setActivePlan] = useState(() => getEffectiveTier({
    tier: profile.tier,
    paid_tier: profile.paid_tier ?? null,
    comp_tier: profile.comp_tier ?? null,
    trial_end: profile.trial_end ?? null,
  }));

  const tierInfo = {
    pro: {
      price: PRO_PRICE_MONTHLY,
      yearlyPrice: PRO_PRICE_YEARLY,
      features: PRO_FEATURES.map(featureLabel),
    },
    elite: {
      price: ELITE_PRICE_MONTHLY,
      yearlyPrice: ELITE_PRICE_YEARLY,
      features: ELITE_FEATURES.map(featureLabel),
    },
  };
  const [upgradeError, setUpgradeError] = useState("");
  const [upgradeLoading, setUpgradeLoading] = useState<"pro" | "elite" | null>(null);
  // Account management state
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  // Communications email — syncs from server-rendered profile prop (updated on page reload after confirmation)
  const [commsEmail, setCommsEmail] = useState<string | null>(profile.comms_email ?? null);
  const [commsEmailInput, setCommsEmailInput] = useState("");
  const [commsEmailPending, setCommsEmailPending] = useState(false);
  const [commsEmailPendingTarget, setCommsEmailPendingTarget] = useState<string | null>(null);
  const [commsEmailLoading, setCommsEmailLoading] = useState(false);
  const [commsEmailStatus, setCommsEmailStatus] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [commsEmailChecked, setCommsEmailChecked] = useState(false);

  // Handle ?verify= and ?comms_email= query params from email redirect links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verify = params.get("verify");
    const commsResult = params.get("comms_email");

    if (verify === "success") {
      setVerifyMessage("Email verified. Voice, posts, and video are unlocked.");
      acknowledgeEmailVerified();
      void refreshProfile();
      window.history.replaceState({}, "", "/dashboard");
    } else if (verify === "invalid") {
      setVerifyMessage("Invalid or expired verification link. Try resending.");
      window.history.replaceState({}, "", "/dashboard");
    }

    if (commsResult === "confirmed") {
      setCommsEmailPending(false);
      setCommsEmailPendingTarget(null);
      setCommsEmailStatus({ type: "success", message: "Communications email updated successfully." });
      refreshProfile();
      window.history.replaceState({}, "", "/dashboard");
    } else if (commsResult === "cancelled") {
      setCommsEmailPending(false);
      setCommsEmailPendingTarget(null);
      setCommsEmailStatus({ type: "info", message: "Email change cancelled." });
      window.history.replaceState({}, "", "/dashboard");
    } else if (commsResult === "expired") {
      setCommsEmailPending(false);
      setCommsEmailStatus({ type: "error", message: "That confirmation link has expired. Please try again." });
      window.history.replaceState({}, "", "/dashboard");
    } else if (commsResult === "error") {
      setCommsEmailStatus({ type: "error", message: "Something went wrong. Please try again." });
      window.history.replaceState({}, "", "/dashboard");
    } else if (commsResult === "invalid") {
      setCommsEmailStatus({ type: "error", message: "Invalid confirmation link." });
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [acknowledgeEmailVerified, refreshProfile]);

  useEffect(() => {
    if (profile.email_confirmed) acknowledgeEmailVerified();
  }, [profile.email_confirmed, acknowledgeEmailVerified]);

  async function handleResendVerification() {
    setResendLoading(true);
    try {
      const res = await fetch("/api/send-verification-email", { method: "POST" });
      const data = await res.json();
      if (data.already_confirmed) {
        acknowledgeEmailVerified();
        void refreshProfile();
      } else {
        setResendSent(true);
        setTimeout(() => setResendSent(false), 5000);
      }
    } catch {
      // Silently fail
    } finally {
      setResendLoading(false);
    }
  }

  // Check for pending email change request when account settings panel opens
  useEffect(() => {
    if (!showAccountSettings || commsEmailChecked) return;
    setCommsEmailChecked(true);
    fetch("/api/account/request-email-change")
      .then((r) => r.json())
      .then((data) => {
        if (data.pending && data.pendingEmail) {
          setCommsEmailPending(true);
          setCommsEmailPendingTarget(data.pendingEmail);
        }
      })
      .catch(() => { /* Silently ignore */ });
  }, [showAccountSettings, commsEmailChecked]);

  async function handleRequestCommsEmailChange() {
    const trimmed = commsEmailInput.trim().toLowerCase();
    if (!trimmed) {
      setCommsEmailStatus({ type: "error", message: "Please enter an email address." });
      return;
    }
    setCommsEmailLoading(true);
    setCommsEmailStatus(null);
    try {
      const res = await fetch("/api/account/request-email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCommsEmailStatus({ type: "error", message: data.error || "Request failed." });
      } else {
        setCommsEmailPending(true);
        setCommsEmailPendingTarget(trimmed);
        setCommsEmailInput("");
        setCommsEmailStatus({
          type: "success",
          message: `A confirmation email has been sent to your current address. Click the link in that email to confirm the change to ${trimmed}.`,
        });
      }
    } catch {
      setCommsEmailStatus({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setCommsEmailLoading(false);
    }
  }

  async function handleChangePassword() {
    if (!newPassword || !confirmPassword) {
      setPasswordStatus({ type: "error", message: "Both fields are required." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "Passwords don't match." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }
    setPasswordLoading(true);
    setPasswordStatus(null);
    const result = await updatePassword(newPassword);
    if (result.error) {
      setPasswordStatus({ type: "error", message: result.error });
    } else {
      setPasswordStatus({ type: "success", message: "Password updated." });
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setShowChangePassword(false), 1500);
    }
    setPasswordLoading(false);
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") return;
    setDeleteLoading(true);
    const result = await deleteAccount();
    if (result.error) {
      setPasswordStatus({ type: "error", message: result.error });
      setDeleteLoading(false);
    }
    // If successful, deleteAccount redirects to homepage
  }

  async function handleUpgradeCheckout(tier: "pro" | "elite") {
    setUpgradeError("");
    setUpgradeLoading(tier);
    try {
      const result = await startStripeCheckout(tier, upgradeBillingPeriod);
      if (result.mock) {
        setActivePlan(tier);
        setUpgradeModalOpen(false);
      }
    } catch (err) {
      setUpgradeError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setUpgradeLoading(null);
    }
  }

  async function handleBillingPortal() {
    setBillingLoading(true);
    try {
      const res = await fetch("/api/account/billing-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPasswordStatus({ type: "error", message: data.error || "Could not open billing portal." });
      }
    } catch {
      setPasswordStatus({ type: "error", message: "Something went wrong." });
    } finally {
      setBillingLoading(false);
    }
  }

  async function handleExportData() {
    setExportLoading(true);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `doppelpod-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setPasswordStatus({ type: "error", message: "Export failed. Try again." });
    } finally {
      setExportLoading(false);
    }
  }

  const [voiceUploading, setVoiceUploading] = useState(false);
  const hasClonedVoice = !!(profile.elevenlabs_voice_id || profile.fish_voice_id);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(
    hasClonedVoice
      ? "Voice cloned and ready!"
      : profile.voice_id
      ? "Sample uploaded — re-upload to activate cloning."
      : null
  );
  const [voiceTab, setVoiceTab] = useState<"upload" | "record">("upload");

  const tierColors: Record<string, string> = {
    expired: "bg-red-500/20 text-red-400 border-red-500/30",
    trial: "bg-green-500/20 text-green-400 border-green-500/30",
    pro: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    elite: "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-400 border-pink-500/30",
  };

  async function uploadVoiceFile(file: File) {
    setVoiceUploading(true);
    setVoiceStatus(null);
    try {
      // Step 1: Store the raw audio file in Supabase Storage
      const formData = new FormData();
      formData.append("audio", file);
      const uploadRes = await fetch("/api/voice/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        setVoiceStatus(`Error: ${data.error || "Upload failed"}`);
        return;
      }

      // Step 2: Clone the voice via ElevenLabs so it's ready for generation
      setVoiceStatus("Cloning voice…");
      const cloneRes = await fetch("/api/voice/clone", { method: "POST" });
      if (!cloneRes.ok) {
        const data = await cloneRes.json();
        // Upload succeeded but clone failed — sample is saved, user can retry
        setVoiceStatus(`Error: ${data.error || "Voice cloning failed — please try again."}`);
        return;
      }

      setVoiceStatus("Voice cloned and ready!");
    } catch {
      setVoiceStatus("Error: Failed to upload voice sample.");
    } finally {
      setVoiceUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      {(() => {
        const navLinks = [
          { label: "Account",          href: "#account" },
          { label: "Billing",          href: "/account" },
          { label: "Generate",         href: "#generate" },
          { label: "Voice Clone",      href: "#voice-clone" },
          { label: "Video Jobs",       href: "#video-jobs" },
          { label: "Past Generations", href: "#past-generations" },
        ];
        return (
          <>
            {/* Top nav bar */}
            <nav className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
              <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={() => setMobileNavOpen(true)}
                    className="flex flex-col justify-center gap-1.5 p-1 text-muted-foreground hover:text-foreground transition-colors xl:hidden"
                    aria-label="Open navigation"
                    aria-expanded={mobileNavOpen}
                  >
                    <span className="block h-0.5 w-5 bg-current" />
                    <span className="block h-0.5 w-5 bg-current" />
                    <span className="block h-0.5 w-5 bg-current" />
                  </button>
                  <Link
                    href="/"
                    className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-lg font-bold text-transparent"
                  >
                    DoppelPod
                  </Link>
                </div>

                <div className="hidden min-w-0 flex-1 items-center justify-end gap-3 overflow-x-auto xl:flex">
                  {navLinks.map(({ label, href }) => (
                    <a
                      key={href}
                      href={href}
                      className="shrink-0 text-sm text-pink-500 hover:text-pink-400 transition-colors whitespace-nowrap"
                    >
                      {label}
                    </a>
                  ))}
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-3 xl:ml-0">
                  <span className="hidden max-w-[7rem] truncate text-xs text-muted-foreground sm:inline xl:max-w-[12rem]" title={user.email}>
                    {user.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="hidden text-xs text-red-400/70 hover:text-red-300 transition-colors whitespace-nowrap cursor-pointer xl:inline"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </nav>

            <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)}>
              <p className="mb-3 break-all text-xs text-muted-foreground" title={user.email}>{user.email}</p>
              {navLinks.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileNavOpen(false)}
                  className="block border-b border-border/20 py-2 text-sm text-muted-foreground hover:text-purple-400 transition-colors"
                >
                  {label}
                </a>
              ))}
              <button
                onClick={() => { setMobileNavOpen(false); signOut(); }}
                className="mt-2 block w-full cursor-pointer border-t border-border/20 py-2 text-left text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Logout
              </button>
            </MobileNavDrawer>
          </>
        );
      })()}

      <main className="mx-auto max-w-4xl px-4 pt-8 pb-16 space-y-8">
        {verifyMessage && (
          <div className={`rounded-lg border p-4 text-sm font-medium ${verifyMessage.includes("unlocked") ? "border-green-500/30 bg-green-950/20 text-green-400" : "border-red-500/30 bg-red-950/20 text-red-400"}`}>
            {verifyMessage}
          </div>
        )}
        {!emailConfirmed && !profile.email_confirmed && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-950/20 p-4 flex items-center gap-3">
            <span className="text-xl">&#9993;&#65039;</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-400">Confirm your email to unlock all features</p>
              <p className="text-xs text-foreground/70 mt-0.5">Check your inbox for a confirmation link. Voice, posts, video, and data export stay locked until you confirm.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
              onClick={handleResendVerification}
              disabled={resendLoading || resendSent}
            >
              {resendSent ? "Sent!" : resendLoading ? "Sending..." : "Resend Email"}
            </Button>
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
              <p className="mt-1 text-sm text-foreground/70">
                {generations.length === 0 && !profile.voice_id && videoJobs.length === 0
                  ? "Three steps to a first post and a video. Nothing here repeats until you create it."
                  : "Your voice, posts, and videos."}
              </p>
            </div>
            <Button
              className="shrink-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700 transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 px-5 py-2.5 text-sm font-semibold h-auto"
              onClick={() => setFeedbackOpen(true)}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Give Feedback
            </Button>
          </div>
        </motion.div>

        <OnboardingChecklist
          hasVoiceOrPhoto={!!(profile.voice_id || profile.heygen_avatar_id)}
          hasPost={generations.length > 0}
          hasVideo={videoJobs.length > 0}
        />

        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          id="account"
          className="scroll-mt-24"
        >
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Account</CardTitle>
              <button
                  onClick={() => setShowAccountSettings(!showAccountSettings)}
                  className="flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-[11px] font-medium text-purple-400 uppercase tracking-wider hover:bg-purple-500/15 hover:text-purple-300 transition-all"
                >
                  <svg
                    className={`h-3 w-3 transition-transform duration-200 ${showAccountSettings ? "rotate-90" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  Account Settings
                </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">Plan:</span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${
                    tierColors[displayTier] || tierColors.expired
                  }`}
                >
                  {displayTier === "trial"
                    ? `Trial (${daysLeft} day${daysLeft !== 1 ? "s" : ""} left)`
                    : displayTier}
                </span>
                {profile.trial_end && (displayTier === "trial" || displayTier === "expired") && (
                  <span className="text-xs text-muted-foreground">
                    {displayTier === "expired" ? "Trial ended" : "Trial ends"} {formatTrialEnd(profile.trial_end)}
                  </span>
                )}
                <Link href="/account" className="text-xs text-purple-300 underline-offset-2 hover:underline">
                  Billing details
                </Link>
                {(displayTier === "expired" || displayTier === "trial") && (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                    onClick={() => setUpgradeModalOpen(true)}
                  >
                    Upgrade Now
                  </Button>
                )}
                {displayTier === "pro" && (
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
                )}
              </div>
              {/* Email display — login email is read-only, comms email is configurable */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="text-sm text-muted-foreground shrink-0">Login email:</span>
                  <span className="text-sm font-medium">{user.email}</span>
                  <span className="text-[11px] text-muted-foreground/60">(used to sign in — cannot be changed)</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="text-sm text-muted-foreground shrink-0">Notifications sent to:</span>
                  {commsEmail ? (
                    <span className="text-sm font-medium">{commsEmail}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground/60">{user.email} <span className="text-[11px]">(same as login)</span></span>
                  )}
                  {commsEmailPending && commsEmailPendingTarget && (
                    <span className="text-[11px] text-yellow-400">⏳ Pending confirmation → {commsEmailPendingTarget}</span>
                  )}
                </div>
              </div>
              {/* Usage stats */}
              {usage && (
                <div className="border-t border-border/50 pt-3 space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Usage This Month</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                      <p className="text-xs text-muted-foreground">Videos</p>
                      <p className="text-sm font-semibold">
                        {usage.video_count}
                        {limits.videoLimit !== null && <span className="text-muted-foreground font-normal">/{limits.videoLimit}</span>}
                        {limits.videoLimit === null && <span className="text-muted-foreground font-normal text-xs ml-1">unlimited</span>}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                      <p className="text-xs text-muted-foreground">Twin posts</p>
                      <p className="text-sm font-semibold">{generations.length}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Plan feature summary */}
              <div className="border-t border-border/50 pt-3 space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Plan includes</span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className={limits.voice ? "text-foreground/70" : "text-muted-foreground/40 line-through"}>
                    {limits.voice ? "✓" : "✗"} Voice clone
                  </span>
                  <span className={limits.video ? "text-foreground/70" : "text-muted-foreground/40 line-through"}>
                    {limits.video ? "✓" : "✗"} Talking video{limits.videoLimit !== null ? ` (${limits.videoLimit}/mo)` : " (unlimited)"}
                  </span>
                  <span className="text-muted-foreground/70">Cowork — coming soon</span>
                  <span className="text-muted-foreground/70">Virality score — coming soon</span>
                  <span className="text-muted-foreground/70">Multi-platform posting — coming soon</span>
                  <span className={limits.priorityRendering ? "text-foreground/70" : "text-muted-foreground/40 line-through"}>
                    {limits.priorityRendering ? "✓" : "✗"} Priority rendering
                  </span>
                </div>
              </div>

              {/* Account Actions */}
              {showAccountSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="border-t border-border/50 pt-4"
              >
                <div className="flex flex-col gap-2">
                  {/* Communications email section */}
                  <div className="rounded-lg border border-border/50 bg-muted/10 p-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Communications Email</p>
                      <p className="text-xs text-foreground/70 mt-0.5">
                        This is where DoppelPod sends video notifications, billing updates, and other messages.
                        It is <strong className="text-foreground">separate from your login email</strong> — changing it does not affect how you sign in.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Current</p>
                      <p className="text-sm">
                        {commsEmail || user.email}
                        {!commsEmail && <span className="ml-1.5 text-[11px] text-muted-foreground/60">(same as login email)</span>}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Change to</p>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="new@example.com"
                          className="flex-1 rounded-md border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          value={commsEmailInput}
                          onChange={(e) => setCommsEmailInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleRequestCommsEmailChange(); }}
                          disabled={commsEmailLoading}
                        />
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700 shrink-0"
                          onClick={handleRequestCommsEmailChange}
                          disabled={commsEmailLoading || !commsEmailInput.trim()}
                        >
                          {commsEmailLoading ? "Sending..." : "Send Confirmation"}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        A confirmation email will be sent to your <em>current</em> address. You must click the link to confirm.
                      </p>
                    </div>
                    {commsEmailStatus && (
                      <p className={`text-xs leading-relaxed ${
                        commsEmailStatus.type === "error" ? "text-red-400" :
                        commsEmailStatus.type === "info"  ? "text-muted-foreground" :
                        "text-green-400"
                      }`}>
                        {commsEmailStatus.message}
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    onClick={() => setShowChangePassword(!showChangePassword)}
                  >
                    Change Password
                  </Button>
                  {(activePlan === "pro" || activePlan === "elite") ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      onClick={handleBillingPortal}
                      disabled={billingLoading}
                    >
                      {billingLoading ? "Opening..." : "Manage Subscription"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full justify-start bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                      onClick={() => {
                        setShowAccountSettings(false);
                        setUpgradeModalOpen(true);
                      }}
                    >
                      Upgrade — Subscribe to a Plan
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    onClick={() => setExportConfirmOpen(true)}
                    disabled={exportLoading || displayTier === "expired" || !emailConfirmed}
                    title={!emailConfirmed ? "Confirm your email to export data" : displayTier === "expired" ? "Upgrade to export your data" : undefined}
                  >
                    {exportLoading ? "Exporting..." : !emailConfirmed ? "Export Data (Confirm Email)" : displayTier === "expired" ? "Export Data (Upgrade Required)" : "Export Data"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={!emailConfirmed}
                    title={!emailConfirmed ? "Confirm your email to delete your account" : undefined}
                  >
                    {!emailConfirmed ? "Delete Account (Confirm Email)" : "Delete Account"}
                  </Button>
                </div>

                {/* Change Password Form */}
                {showChangePassword && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3 rounded-lg border border-border/50 bg-muted/10 p-4"
                  >
                    <input
                      type="password"
                      placeholder="New password"
                      className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                        onClick={handleChangePassword}
                        disabled={passwordLoading}
                      >
                        {passwordLoading ? "Updating..." : "Update Password"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border/50"
                        onClick={() => {
                          setShowChangePassword(false);
                          setNewPassword("");
                          setConfirmPassword("");
                          setPasswordStatus(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Status messages */}
                {passwordStatus && (
                  <p className={`text-xs ${passwordStatus.type === "error" ? "text-red-400" : "text-green-400"}`}>
                    {passwordStatus.message}
                  </p>
                )}
              </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Text Generation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="relative scroll-mt-24"
          id="generate"
        >
          {displayTier === "expired" && <ExpiredOverlay onUpgrade={() => setUpgradeModalOpen(true)} />}
          <Card className={`border-border/50 bg-card/50 ${displayTier === "expired" ? "pointer-events-none" : ""}`}>
            <CardHeader>
              <CardTitle className="text-lg">Generate a twin post</CardTitle>
            </CardHeader>
            <CardContent>
              {generations.length === 0 && (
                <p className="mb-3 text-sm text-muted-foreground">
                  No posts yet. Type a topic — not just a title you want echoed — and generate a post. It is saved under Past generations.
                </p>
              )}
              <GenerateWidget
                placeholder="Type a topic or paste a post..."
                onGenerated={(generation) => setGenerations((current) => [generation, ...current])}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Voice Clone Manager */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="relative scroll-mt-24"
          id="voice-clone"
        >
          {displayTier === "expired" && <ExpiredOverlay onUpgrade={() => setUpgradeModalOpen(true)} />}
          <Card className={`border-border/50 bg-card/50 ${displayTier === "expired" ? "pointer-events-none" : ""}`}>
            <CardHeader>
              <CardTitle className="text-lg">Voice Clone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.voice_id || hasClonedVoice ? (
                <p className="text-sm text-foreground/70">
                  Voice sample on file. Upload a new one only if you want to replace it.
                </p>
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-4 py-6 text-center">
                  <p className="text-sm font-medium">No voice sample yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Upload a file or record in the browser. Until you do, posts stay text-only and playback uses a default voice.
                  </p>
                </div>
              )}

              {/* Tab switcher */}
              <div className="flex rounded-lg border border-border/50 p-0.5 bg-muted/30 text-sm">
                {(["upload", "record"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setVoiceTab(tab)}
                    className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors capitalize ${
                      voiceTab === tab
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "upload" ? "Upload file" : "Record now"}
                  </button>
                ))}
              </div>

              {/* Upload tab */}
              {voiceTab === "upload" && (
                <VoiceUploadZone onFile={uploadVoiceFile} uploading={voiceUploading} />
              )}

              {/* Record tab */}
              {voiceTab === "record" && (
                <VoiceRecorder onUpload={uploadVoiceFile} uploading={voiceUploading} />
              )}

              {/* Status message */}
              {voiceStatus && (
                <p className={`text-xs ${voiceStatus.startsWith("Error") ? "text-destructive" : "text-green-400"}`}>
                  {voiceStatus}
                </p>
              )}

              {/* Saved avatar notice */}
              {profile.heygen_avatar_id && (
                <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-950/10 px-4 py-3">
                  <svg className="h-4 w-4 shrink-0 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <p className="text-xs text-green-400">
                    Custom avatar saved. Select &quot;Use my avatar&quot; in Generate so you don&apos;t upload again. Rendering still takes 15–60 minutes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Video Jobs */}
        {(
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            id="video-jobs"
            className="scroll-mt-24"
          >
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">Video Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                {videoJobs.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm font-medium">No videos yet</p>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                      A talking video takes 15–60 minutes. Start one from Generate, then come back here for the download. We also email you when it is ready.
                    </p>
                    <a href="#talking-video">
                      <Button
                        className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                        size="sm"
                      >
                        Try a video
                      </Button>
                    </a>
                  </div>
                ) : (
                <div className="space-y-3">
                  {videoJobs.map((job) => {
                    const isActive = ACTIVE_STATUSES.has(job.status);
                    return (
                      <div
                        key={job.id}
                        className="rounded-lg border border-border/50 p-3 flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-medium ${
                                job.status === "completed"
                                  ? "text-green-400"
                                  : job.status === "failed"
                                  ? "text-red-400"
                                  : "text-purple-400"
                              }`}
                            >
                              {VIDEO_STATUS_LABELS[job.status] ?? job.status}
                            </span>
                            {isActive && (
                              <svg className="h-3 w-3 animate-spin text-purple-400" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            )}
                            {job.has_photo && (
                              <span className="text-xs text-muted-foreground">Custom photo</span>
                            )}
                          </div>
                          {job.status === "failed" && job.error_message && (
                            <p className="text-[11px] text-red-400/80 mt-0.5 truncate">{job.error_message}</p>
                          )}
                          {isActive && job.has_photo && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">We&apos;ll email you when it&apos;s ready.</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {new Date(job.created_at).toLocaleDateString()}
                          </span>
                          {job.status === "completed" && job.heygen_video_url && (
                            <a
                              href={job.heygen_video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-medium text-purple-400 hover:text-purple-300 underline underline-offset-2"
                            >
                              Download
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Past Generations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="relative scroll-mt-24"
          id="past-generations"
        >
          {displayTier === "expired" && <ExpiredOverlay onUpgrade={() => setUpgradeModalOpen(true)} />}
          <Card className={`border-border/50 bg-card/50 ${displayTier === "expired" ? "pointer-events-none" : ""}`}>
            <CardHeader>
              <CardTitle className="text-lg">Past Generations</CardTitle>
            </CardHeader>
            <CardContent>
              {generations.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium">No twin posts yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                    Generate a post above. It shows up here as soon as it is saved — you do not need to leave the dashboard.
                  </p>
                  <a href="#generate">
                    <Button
                      className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                      size="sm"
                    >
                      Create your first post
                    </Button>
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {generations.map((gen) => (
                    <div
                      key={gen.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => copyGeneration(gen)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          copyGeneration(gen);
                        }
                      }}
                      title="Click to copy the AI Twin output"
                      className="cursor-pointer rounded-lg border border-border/50 p-4 transition-colors hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
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
                        <span className="shrink-0 text-right text-xs text-muted-foreground">
                          <span className="block">{new Date(gen.created_at).toLocaleDateString()}</span>
                          <span className="block text-xs">{new Date(gen.created_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                          <span className="mt-2 block font-medium text-purple-300" aria-live="polite">
                            {copiedGenId === gen.id ? "Copied!" : ""}
                          </span>
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

      <Dialog open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">Choose Your Plan</DialogTitle>
          </DialogHeader>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 py-1">
            <span className={`text-sm font-medium transition-colors ${upgradeBillingPeriod === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <button
              onClick={() => setUpgradeBillingPeriod(upgradeBillingPeriod === "monthly" ? "yearly" : "monthly")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${upgradeBillingPeriod === "yearly" ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-muted-foreground/30"}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${upgradeBillingPeriod === "yearly" ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className={`text-sm font-medium transition-colors ${upgradeBillingPeriod === "yearly" ? "text-foreground" : "text-muted-foreground"}`}>
              Yearly <span className="text-xs text-green-400">2 months free</span>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
            {(["pro", "elite"] as const).map((tier) => {
              const displayPrice = planPrice(tier, upgradeBillingPeriod);
              const period = upgradeBillingPeriod === "yearly" ? "/yr" : "/mo";
              return (
                <div
                  key={tier}
                  className="flex flex-col gap-3 rounded-lg border border-border/50 p-4 text-left"
                >
                  <div>
                    <span className="font-semibold capitalize text-foreground">{tier}</span>
                    <p className="text-lg font-bold text-purple-400">{displayPrice}<span className="text-xs font-normal text-muted-foreground">{period}</span></p>
                  </div>
                  <ul className="space-y-1 flex-1">
                    {tierInfo[tier].features.map((f) => (
                      <li key={f} className="text-xs text-muted-foreground flex items-start gap-1">
                        <span className="text-purple-400 mt-0.5">{f.includes("coming soon") ? "–" : "✓"}</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                    disabled={upgradeLoading !== null}
                    onClick={() => handleUpgradeCheckout(tier)}
                  >
                    {upgradeLoading === tier ? "Opening checkout..." : `Checkout — ${displayPrice}${period}`}
                  </Button>
                </div>
              );
            })}
          </div>
          {upgradeError && (
            <p className="text-xs text-red-400">{upgradeError}</p>
          )}
          <p className="text-center text-[11px] text-muted-foreground">
            Secure payment via Stripe. Prices are Pro {PRO_PRICE_MONTHLY}/mo or {PRO_PRICE_YEARLY}/yr, Elite {ELITE_PRICE_MONTHLY}/mo or {ELITE_PRICE_YEARLY}/yr.
          </p>
        </DialogContent>
      </Dialog>

      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        tier={checkoutTier.charAt(0).toUpperCase() + checkoutTier.slice(1)}
        price={upgradeBillingPeriod === "yearly" ? tierInfo[checkoutTier].yearlyPrice : tierInfo[checkoutTier].price}
        billingPeriod={upgradeBillingPeriod}
        features={tierInfo[checkoutTier].features}
        onSuccess={(tier) => setActivePlan(tier as import("@/lib/tiers").TierName)}
      />

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />

      {/* Export Data confirmation dialog */}
      <Dialog open={exportConfirmOpen} onOpenChange={setExportConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Export Your Data</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/70 leading-relaxed">
            This will download a JSON file containing all of your DoppelPod data — generations, profile info, and usage history. No data will be deleted.
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
              onClick={() => {
                setExportConfirmOpen(false);
                handleExportData();
              }}
              disabled={exportLoading}
            >
              {exportLoading ? "Exporting..." : "Download Export"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-border/50"
              onClick={() => setExportConfirmOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account confirmation dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) setDeleteConfirmText("");
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-foreground/70 leading-relaxed">
              This will <strong className="text-foreground">permanently delete</strong> your account, all generations, voice data, and cancel any active subscription. <strong className="text-red-400">This cannot be undone.</strong>
            </p>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
              </p>
              <input
                type="text"
                placeholder="Type DELETE to confirm"
                className="w-full rounded-md border border-red-500/30 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-red-600 text-white border-0 hover:bg-red-700"
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmText !== "DELETE"}
              >
                {deleteLoading ? "Deleting..." : "Permanently Delete"}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-border/50"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteConfirmText("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <SiteFooter />
    </div>
  );
}
