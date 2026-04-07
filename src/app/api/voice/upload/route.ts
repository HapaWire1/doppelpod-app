import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";

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

    // Validate file type — check MIME type first (client-supplied, not trusted alone)
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

    // Magic-number validation — read first 12 bytes to verify actual file signature
    // (file.type is client-supplied and can be spoofed)
    const headerBytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const isMp3 =
      (headerBytes[0] === 0xff && (headerBytes[1] & 0xe0) === 0xe0) || // MPEG sync
      (headerBytes[0] === 0x49 && headerBytes[1] === 0x44 && headerBytes[2] === 0x33); // ID3
    const isWav =
      headerBytes[0] === 0x52 && headerBytes[1] === 0x49 &&
      headerBytes[2] === 0x46 && headerBytes[3] === 0x46; // RIFF
    const isOgg =
      headerBytes[0] === 0x4f && headerBytes[1] === 0x67 &&
      headerBytes[2] === 0x67 && headerBytes[3] === 0x53; // OggS
    const isWebM =
      headerBytes[0] === 0x1a && headerBytes[1] === 0x45 &&
      headerBytes[2] === 0xdf && headerBytes[3] === 0xa3; // EBML/WebM
    const isMp4 =
      (headerBytes[4] === 0x66 && headerBytes[5] === 0x74 &&
       headerBytes[6] === 0x79 && headerBytes[7] === 0x70) || // ftyp box
      (headerBytes[0] === 0x00 && headerBytes[1] === 0x00 &&
       headerBytes[2] === 0x00 && headerBytes[3] === 0x20); // MP4 with leading box
    if (!isMp3 && !isWav && !isOgg && !isWebM && !isMp4) {
      return NextResponse.json(
        { error: "Invalid file. Please upload a valid audio file (MP3, WAV, OGG, M4A, WebM)." },
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

    // Save voice reference in profile — use service role (user-auth client
    // can only update safe columns; voice_id is permitted but use admin for consistency)
    const admin = createAdminSupabaseClient();
    const { error: updateError } = await admin
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
