import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Resend } from "resend";
import { checkRateLimit } from "@/lib/rate-limit";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export async function POST(req: NextRequest) {
  try {
    const { type, message } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }
    if (typeof message === "string" && message.length > 5000) {
      return NextResponse.json({ error: "Message too long (max 5000 characters)." }, { status: 400 });
    }

    // Get user info if logged in
    let userEmail = "anonymous";
    let userTier = "unknown";
    let rateLimitKey: string = `feedback:ip:${req.headers.get("x-forwarded-for") ?? "unknown"}`;
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        userEmail = user.email;
        rateLimitKey = `feedback:user:${user.id}`;
        const { data: profile } = await supabase
          .from("profiles")
          .select("tier")
          .eq("id", user.id)
          .single();
        if (profile?.tier) userTier = profile.tier;
      }
    } catch {
      // Continue without user info
    }

    // Rate limit: 10 feedback submissions per hour per user/IP
    const rl = checkRateLimit(rateLimitKey, 10, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before submitting more feedback." },
        { status: 429 }
      );
    }

    // Send feedback via Resend to the team
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.log("[feedback] No RESEND_API_KEY — logging feedback:", { type, message, userEmail, userTier });
      return NextResponse.json({ ok: true });
    }

    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: "DoppelPod Feedback <noreply@doppelpod.io>",
      to: "human@hapawire.com",
      replyTo: userEmail !== "anonymous" ? userEmail : undefined,
      subject: `[${escapeHtml(type.toUpperCase())}] Feedback from ${escapeHtml(userEmail)}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;padding:24px;color:#333;">
          <h2 style="margin:0 0 16px;">New ${escapeHtml(type)} feedback</h2>
          <table style="font-size:14px;margin-bottom:16px;">
            <tr><td style="color:#888;padding-right:12px;">From:</td><td>${escapeHtml(userEmail)}</td></tr>
            <tr><td style="color:#888;padding-right:12px;">Tier:</td><td>${escapeHtml(userTier)}</td></tr>
            <tr><td style="color:#888;padding-right:12px;">Type:</td><td>${escapeHtml(type)}</td></tr>
          </table>
          <div style="padding:16px;background:#f5f5f5;border-radius:8px;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</div>
        </div>
      `,
    });

    console.log(`[feedback] ${type} from ${userEmail} sent`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[feedback] Error:", err);
    return NextResponse.json({ error: "Failed to send feedback." }, { status: 500 });
  }
}
