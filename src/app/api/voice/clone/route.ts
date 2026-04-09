/**
 * POST /api/voice/clone
 *
 * Takes the audio file already stored in Supabase Storage (profiles.voice_id),
 * sends it to the active voice provider for cloning, and saves the resulting
 * voice ID back to the user's profile.
 *
 * Safe to call multiple times — if a cloned voice already exists for the active
 * provider it returns the existing ID without re-cloning.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { getVoiceProvider } from "@/lib/voice-provider";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 5 clone attempts per hour per user (cloning is expensive)
    const rl = checkRateLimit(`clone:${user.id}`, 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many clone requests. Please wait before trying again." },
        { status: 429 }
      );
    }

    const provider = getVoiceProvider();
    const admin = createAdminSupabaseClient();

    // Fetch profile — need voice_id (storage path) and existing provider voice ID
    const { data: profile } = await admin
      .from("profiles")
      .select("voice_id, elevenlabs_voice_id, fish_voice_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    // Return existing clone if already done for this provider
    const existingVoiceId = (profile[provider.profileColumn] ?? null) as string | null;
    if (existingVoiceId) {
      console.log(`[voice/clone] Already cloned on ${provider.name}: ${existingVoiceId}`);
      return NextResponse.json({ voiceId: existingVoiceId, provider: provider.name });
    }

    // Must have uploaded a voice sample first
    if (!profile.voice_id) {
      return NextResponse.json(
        { error: "No voice sample uploaded. Please upload an audio file first." },
        { status: 400 }
      );
    }

    // Download the audio from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("voice-samples")
      .download(profile.voice_id);

    if (downloadError || !fileData) {
      console.error("[voice/clone] Storage download failed:", downloadError?.message);
      return NextResponse.json(
        { error: "Failed to retrieve your voice sample. Please re-upload and try again." },
        { status: 500 }
      );
    }

    const audioBuffer = await fileData.arrayBuffer();
    const ext = profile.voice_id.split(".").pop() || "mp3";
    const mimeType = ext === "wav" ? "audio/wav" : ext === "ogg" ? "audio/ogg" : "audio/mpeg";

    // Clone via active provider
    console.log(`[voice/clone] Cloning voice for user ${user.id} via ${provider.name}...`);
    const clonedVoiceId = await provider.cloneVoice({
      audioBuffer,
      name: `doppelpod-user-${user.id.slice(0, 8)}`,
      mimeType,
    });

    // Persist the provider's voice ID to the profile
    const { error: updateError } = await admin
      .from("profiles")
      .update({
        [provider.profileColumn]: clonedVoiceId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[voice/clone] Profile update failed:", updateError.message);
      // Voice was cloned but we couldn't save — delete it to avoid orphans
      await provider.deleteVoice(clonedVoiceId);
      return NextResponse.json({ error: "Failed to save cloned voice." }, { status: 500 });
    }

    console.log(`[voice/clone] Success — ${provider.name} voice ID: ${clonedVoiceId}`);
    return NextResponse.json({ voiceId: clonedVoiceId, provider: provider.name });
  } catch (err) {
    console.error("[voice/clone] Error:", err);
    return NextResponse.json({ error: "Failed to clone voice." }, { status: 500 });
  }
}
