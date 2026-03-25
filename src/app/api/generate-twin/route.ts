import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { posts } = await req.json();

    if (!posts || typeof posts !== "string" || !posts.trim()) {
      return NextResponse.json(
        { error: "Please provide some posts to analyze." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.log("[generate-twin] No ANTHROPIC_API_KEY set — using mock fallback");
      return NextResponse.json({ text: null, fallback: true });
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are an AI voice-cloning assistant. Analyze these social media posts and write ONE new post that perfectly mimics the author's voice, tone, slang, sentence structure, and vibe. The new post should be about a trending topic but sound exactly like the original author wrote it.

Original posts:
${posts}

Write only the new post. No explanation, no quotes around it. Keep it the same length and energy as the originals. Add relevant emojis if the original author uses them.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    console.log("[generate-twin] Claude response generated successfully");

    // Save generation for authenticated users
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && text) {
        await supabase.from("generations").insert({
          user_id: user.id,
          input_text: posts,
          output_text: text,
        });
      }
    } catch (saveErr) {
      console.warn("[generate-twin] Failed to save generation:", saveErr);
    }

    return NextResponse.json({ text, fallback: false });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[generate-twin] Error:", errorMessage);
    return NextResponse.json(
      { error: `Claude API error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
