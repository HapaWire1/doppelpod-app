import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET — handle confirm or cancel links from the confirmation email
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token  = searchParams.get("token");
  const action = searchParams.get("action"); // "confirm" | "cancel"

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.doppelpod.io";

  if (!token || !action) {
    return NextResponse.redirect(`${baseUrl}/dashboard?comms_email=invalid`);
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.redirect(`${baseUrl}/dashboard?comms_email=error`);
  }

  // Look up the request
  const { data: request, error } = await admin
    .from("email_change_requests")
    .select("id, user_id, new_email, expires_at")
    .eq("token", token)
    .single();

  if (error || !request) {
    console.warn("[confirm-email-change] Token not found (redacted)");
    return NextResponse.redirect(`${baseUrl}/dashboard?comms_email=invalid`);
  }

  // Check expiry
  if (new Date(request.expires_at) < new Date()) {
    await admin.from("email_change_requests").delete().eq("id", request.id);
    return NextResponse.redirect(`${baseUrl}/dashboard?comms_email=expired`);
  }

  // Delete the request regardless of action
  await admin.from("email_change_requests").delete().eq("id", request.id);

  if (action === "confirm") {
    const { error: updateError } = await admin
      .from("profiles")
      .update({ comms_email: request.new_email })
      .eq("id", request.user_id);

    if (updateError) {
      console.error("[confirm-email-change] Profile update failed:", updateError.message);
      return NextResponse.redirect(`${baseUrl}/dashboard?comms_email=error`);
    }

    console.log(`[confirm-email-change] Confirmed comms_email=${request.new_email} for user ${request.user_id}`);
    return NextResponse.redirect(`${baseUrl}/dashboard?comms_email=confirmed`);
  }

  if (action === "cancel") {
    console.log(`[confirm-email-change] Cancelled request for user ${request.user_id}`);
    return NextResponse.redirect(`${baseUrl}/dashboard?comms_email=cancelled`);
  }

  return NextResponse.redirect(`${baseUrl}/dashboard?comms_email=invalid`);
}
