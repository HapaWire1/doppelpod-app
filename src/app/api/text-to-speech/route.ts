import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkFeatureAccess } from "@/lib/api-gate";

export async function POST(req: NextRequest) {
  try {
    // Tier gate
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const access = await checkFeatureAccess(supabase, user.id, "voice");
      if (!access.allowed) {
        return NextResponse.json({ error: access.error, gated: true }, { status: 403 });
      }
    }

    const { text, stability: rawStability } = await req.json();
    // Clamp stability 0–1, default 0.5
    const stability =
      typeof rawStability === "number"
        ? Math.max(0, Math.min(1, rawStability))
        : 0.5;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "No text provided." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.log("[text-to-speech] No ELEVENLABS_API_KEY set — returning unavailable");
      return NextResponse.json(
        { error: "Voice generation not configured. Add ELEVENLABS_API_KEY to enable." },
        { status: 503 }
      );
    }

    // "Jessica — Playful, Bright, Warm, Conversational" — matches Daisy avatar
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "cgSgspJ2msm6clMCkdW9";

    console.log("[text-to-speech] Calling ElevenLabs API...");

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: text.slice(0, 1000), // ElevenLabs limit safety
          voice_settings: {
            stability,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[text-to-speech] ElevenLabs error:", response.status, errorText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    console.log("[text-to-speech] Audio generated, size:", audioBuffer.byteLength);

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("[text-to-speech] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate speech." },
      { status: 500 }
    );
  }
}
