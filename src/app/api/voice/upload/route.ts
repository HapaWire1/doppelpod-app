import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("audio") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No audio file provided." },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/ogg",
      "audio/webm",
      "audio/mp4",
      "audio/m4a",
      "audio/x-m4a",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an audio file (MP3, WAV, OGG, M4A)." },
        { status: 400 }
      );
    }

    // Max 25MB
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum 25MB." },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "mp3";
    const filePath = `voice-samples/${user.id}/sample.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("voice-samples")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("[voice-upload] Storage error:", uploadError.message);
      return NextResponse.json(
        { error: "Failed to upload audio file." },
        { status: 500 }
      );
    }

    // Save voice reference in profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ voice_id: filePath, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateError) {
      console.error("[voice-upload] Profile update error:", updateError.message);
      return NextResponse.json(
        { error: "Failed to update profile." },
        { status: 500 }
      );
    }

    return NextResponse.json({ voiceId: filePath });
  } catch (err) {
    console.error("[voice-upload] Error:", err);
    return NextResponse.json(
      { error: "Failed to upload voice sample." },
      { status: 500 }
    );
  }
}
