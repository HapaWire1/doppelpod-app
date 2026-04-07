import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Resend } from "resend";
import { buildVerificationEmail } from "@/lib/verification-email";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit: 5 verification emails per hour per user
  const rl = checkRateLimit(`verify:${user.id}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before requesting another verification email." },
      { status: 429 }
    );
  }

  // Check if already confirmed
  const { data: profile } = await supabase
    .from("profiles")
    .select("email_confirmed")
    .eq("id", user.id)
    .single();

  if (profile?.email_confirmed) {
    return NextResponse.json({ already_confirmed: true });
  }

  // Generate token and store it with a 48-hour expiry
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("profiles")
    .update({ verification_token: token, verification_token_expires_at: expiresAt })
    .eq("id", user.id);

  // Send email
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log("[verify] No RESEND_API_KEY — skipping email send");
    return NextResponse.json({ sent: false, reason: "no_api_key" });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.doppelpod.io";
  const verificationUrl = `${baseUrl}/api/verify-email?token=${token}`;

  try {
    const resend = new Resend(resendKey);
    const { subject, html } = buildVerificationEmail(verificationUrl);
    await resend.emails.send({
      from: "DoppelPod <noreply@doppelpod.io>",
      to: user.email!,
      subject,
      html,
    });
    console.log(`[verify] Verification email sent to ${user.email}`);
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[verify] Failed to send verification email:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
