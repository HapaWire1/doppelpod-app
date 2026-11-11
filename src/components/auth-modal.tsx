"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-provider";

export type AuthNotice =
  | { kind: "trial" }
  | { kind: "checkout"; tier: string; price: string }
  | null;

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "signup";
  redirectOnLogin?: string;
  notice?: AuthNotice;
}

const MIN_PASSWORD = 6;

export function AuthModal({
  open,
  onOpenChange,
  defaultTab = "login",
  redirectOnLogin,
  notice = null,
}: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "signup" | "forgot">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [signedUp, setSignedUp] = useState(false);
  const [signedInAfterSignup, setSignedInAfterSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const { signIn, signUp, resetPassword } = useAuth();

  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      setSignedUp(false);
      setSignedInAfterSignup(false);
      setSuccess("");
      setError("");
      setResendMessage("");
    }
  }, [open, defaultTab]);

  function reset() {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setSignedUp(false);
    setSignedInAfterSignup(false);
    setResendMessage("");
  }

  async function handleResend() {
    setResendLoading(true);
    setResendMessage("");
    try {
      const res = await fetch("/api/send-verification-email", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setResendMessage("Log in first, then use Resend Email on the dashboard. We send the link to the address on the account.");
      } else if (data.already_confirmed) {
        setResendMessage("This email is already confirmed. You can open the dashboard.");
      } else if (!res.ok) {
        setResendMessage(data.error || "Could not resend the email. Try again from the dashboard after you log in.");
      } else if (data.sent === false) {
        setResendMessage("Your account is ready. Email delivery is not configured in this environment — continue to the dashboard.");
      } else {
        setResendMessage("Verification email sent. Check your inbox and spam folder.");
      }
    } catch {
      setResendMessage("Could not resend right now. Try again in a minute.");
    } finally {
      setResendLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (tab === "forgot") {
      if (!email) {
        setError("Email is required.");
        return;
      }
      setLoading(true);
      const result = await resetPassword(email);
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Check your email for a password reset link.");
      }
      return;
    }

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (tab === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setLoading(true);
    const result =
      tab === "login" ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (tab === "signup") {
      setSignedInAfterSignup("signedIn" in result && !!result.signedIn);
      setSignedUp(true);
    } else {
      onOpenChange(false);
      reset();
      window.location.href = redirectOnLogin ?? "/dashboard";
    }
  }

  const passwordLongEnough = password.length >= MIN_PASSWORD;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-sm border-purple-500/30 bg-card p-0 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">
          {signedUp ? "Account created" : tab === "forgot" ? "Reset Password" : tab === "login" ? "Log In" : "Sign Up"}
        </DialogTitle>

        {signedUp ? (
          <div className="space-y-4 p-6">
            <div className="space-y-1">
              <p className="text-base font-semibold">Account created</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {notice?.kind === "trial"
                  ? "Your 10-day Elite trial is ready. No card required."
                  : notice?.kind === "checkout"
                    ? `Next you’ll confirm your email, then continue to ${notice.tier} checkout (${notice.price}).`
                    : "Your 10-day Elite trial starts when you open the dashboard. No card required."}
              </p>
            </div>
            <ol className="space-y-2 text-sm text-foreground/80 list-decimal pl-4">
              <li>Open the verification email and confirm {email || "your address"}.</li>
              <li>Go to the dashboard and follow the setup checklist.</li>
              <li>Upload a voice or photo, create your first twin post, then try a video. Videos take 15–60 minutes.</li>
            </ol>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full border-purple-500/30"
                onClick={handleResend}
                disabled={resendLoading}
              >
                {resendLoading ? "Sending..." : "Resend verification email"}
              </Button>
              {signedInAfterSignup ? (
                <Button
                  type="button"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                  onClick={() => {
                    onOpenChange(false);
                    reset();
                    window.location.href = "/dashboard";
                  }}
                >
                  Go to your dashboard
                </Button>
              ) : (
                <Button
                  type="button"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                  onClick={() => {
                    setSignedUp(false);
                    setTab("login");
                    setPassword("");
                    setConfirmPassword("");
                    setError("");
                  }}
                >
                  Log in to continue
                </Button>
              )}
            </div>
            {resendMessage && (
              <p className="rounded-md bg-purple-500/10 px-3 py-2 text-xs text-purple-200 leading-relaxed">
                {resendMessage}
              </p>
            )}
          </div>
        ) : (
          <>
            {tab === "forgot" ? (
              <div className="flex items-center border-b border-border/50 px-4 py-3">
                <button
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    setTab("login");
                    setError("");
                    setSuccess("");
                  }}
                >
                  ← Back to Log In
                </button>
              </div>
            ) : (
              <div className="flex border-b border-border/50">
                <button
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    tab === "login"
                      ? "border-b-2 border-purple-500 text-purple-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => {
                    setTab("login");
                    setError("");
                    setSuccess("");
                  }}
                >
                  Log In
                </button>
                <button
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    tab === "signup"
                      ? "border-b-2 border-purple-500 text-purple-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => {
                    setTab("signup");
                    setError("");
                    setSuccess("");
                  }}
                >
                  Sign Up
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {tab === "signup" && (
                <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs leading-relaxed text-purple-100">
                  {notice?.kind === "checkout" ? (
                    <>
                      Create your account to continue to <strong>{notice.tier}</strong> checkout at {notice.price}. Stripe collects the card on the next step. New accounts also include a 10-day Elite trial.
                    </>
                  ) : (
                    <>
                      <strong>10-day Elite trial.</strong> No card required. You’ll confirm your email, then set up your twin on the dashboard.
                    </>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus-visible:ring-purple-500/50"
                />
              </div>

              {tab !== "forgot" && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="focus-visible:ring-purple-500/50 pr-16"
                      autoComplete={tab === "signup" ? "new-password" : "current-password"}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {tab === "signup" && (
                    <ul className="space-y-1 text-[11px]">
                      <li className={passwordLongEnough ? "text-green-400" : "text-muted-foreground"}>
                        {passwordLongEnough ? "✓" : "○"} At least {MIN_PASSWORD} characters
                      </li>
                    </ul>
                  )}
                </div>
              )}

              {tab === "login" && (
                <button
                  type="button"
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  onClick={() => {
                    setTab("forgot");
                    setError("");
                    setSuccess("");
                  }}
                >
                  Forgot password?
                </button>
              )}

              {tab === "signup" && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="focus-visible:ring-purple-500/50 pr-16"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <p className={`text-[11px] ${passwordsMatch ? "text-green-400" : "text-muted-foreground"}`}>
                    {passwordsMatch ? "✓ Passwords match" : "○ Must match the password above"}
                  </p>
                </div>
              )}

              {error && (
                <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </p>
              )}

              {success && (
                <p className="rounded-md bg-green-500/10 px-3 py-2 text-xs text-green-400">
                  {success}
                </p>
              )}

              {tab === "signup" && (
                <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                  By creating an account you agree to our{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                    Privacy Policy
                  </a>
                  . We&apos;ll email you account and billing updates.
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
              >
                {loading
                  ? "Please wait..."
                  : tab === "forgot"
                  ? "Send Reset Link"
                  : tab === "login"
                  ? "Log In"
                  : notice?.kind === "trial"
                  ? "Start 10-day trial"
                  : "Create Account"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
