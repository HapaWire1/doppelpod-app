import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const { type, message } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // Get user info if logged in
    let userEmail = "anonymous";
    let userTier = "unknown";
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        userEmail = user.email;
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
      subject: `[${type.toUpperCase()}] Feedback from ${userEmail}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;padding:24px;color:#333;">
          <h2 style="margin:0 0 16px;">New ${type} feedback</h2>
          <table style="font-size:14px;margin-bottom:16px;">
            <tr><td style="color:#888;padding-right:12px;">From:</td><td>${userEmail}</td></tr>
            <tr><td style="color:#888;padding-right:12px;">Tier:</td><td>${userTier}</td></tr>
            <tr><td style="color:#888;padding-right:12px;">Type:</td><td>${type}</td></tr>
          </table>
          <div style="padding:16px;background:#f5f5f5;border-radius:8px;font-size:14px;line-height:1.6;white-space:pre-wrap;">${message}</div>
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
