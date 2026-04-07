import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildCommsEmailChangeEmail } from "@/lib/comms-email-change-email";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET — check if there's a pending request for the current user
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Server error" }, { status: 503 });

  // Fetch pending (non-expired) request
  const { data } = await admin
    .from("email_change_requests")
    .select("new_email, expires_at")
    .eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (data) {
    return NextResponse.json({ pending: true, pendingEmail: data.new_email });
  }
  return NextResponse.json({ pending: false, pendingEmail: null });
}

// POST — request a communications email change
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const newEmail = (body.newEmail as string | undefined)?.trim().toLowerCase();

  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  // Fetch current profile to compare against existing emails
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Server error" }, { status: 503 });

  const { data: profile } = await admin
    .from("profiles")
    .select("email, comms_email")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const loginEmail = (user.email || "").toLowerCase();
  const currentComms = (profile.comms_email || "").toLowerCase();

  // Reject if trying to set to the same address already in use
  const effectiveCurrent = currentComms || loginEmail;
  if (newEmail === effectiveCurrent) {
    return NextResponse.json(
      { error: "That is already your current communications email." },
      { status: 400 }
    );
  }

  // Generate a secure token
  const token = crypto.randomUUID() + "-" + crypto.randomUUID();

  // Delete any existing pending requests for this user
  await admin.from("email_change_requests").delete().eq("user_id", user.id);

  // Insert new request
  const { error: insertError } = await admin.from("email_change_requests").insert({
    user_id: user.id,
    new_email: newEmail,
    token,
  });

  if (insertError) {
    console.error("[request-email-change] Insert failed:", insertError.message);
    return NextResponse.json({ error: "Failed to create request." }, { status: 500 });
  }

  // Build confirmation/cancel URLs
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.doppelpod.io";
  const confirmUrl = `${baseUrl}/api/account/confirm-email-change?token=${token}&action=confirm`;
  const cancelUrl  = `${baseUrl}/api/account/confirm-email-change?token=${token}&action=cancel`;

  // Send confirmation email to their CURRENT comms address (or login email)
  const sendTo = profile.comms_email ?? user.email ?? loginEmail;
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const { subject, html } = buildCommsEmailChangeEmail(newEmail, confirmUrl, cancelUrl);
      await resend.emails.send({
        from: "DoppelPod <noreply@doppelpod.io>",
        to: sendTo,
        subject,
        html,
      });
      console.log(`[request-email-change] Confirmation email sent to ${sendTo} for user ${user.id}`);
    } catch (err) {
      console.error("[request-email-change] Email send failed:", err);
      // Don't block the response — token is stored, user can retry
    }
  }

  return NextResponse.json({ pending: true, pendingEmail: newEmail });
}
