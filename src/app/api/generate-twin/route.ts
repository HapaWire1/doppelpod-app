import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { twinSystemPrompt, writeFallbackTwinPost } from "@/lib/twin-post";

export async function POST(req: NextRequest) {
  try {
    const { posts, tone, avoidSlang } = await req.json();

    if (!posts || typeof posts !== "string" || !posts.trim()) {
      return NextResponse.json(
        { error: "Please provide some posts to analyze." },
        { status: 400 }
      );
    }

    // Auth check + email confirmation gate + per-user rate limiting
    let rateLimitKey = `generate:ip:${req.headers.get("x-forwarded-for") ?? "unknown"}`;
    try {
      const supabaseCheck = await createServerSupabaseClient();
      const { data: { user: authUser } } = await supabaseCheck.auth.getUser();
      if (authUser) {
        rateLimitKey = `generate:user:${authUser.id}`;
        const { data: prof } = await supabaseCheck
          .from("profiles")
          .select("email_confirmed")
          .eq("id", authUser.id)
          .single();
        if (prof && !prof.email_confirmed) {
          return NextResponse.json(
            { error: "Please confirm your email before generating posts. Check your inbox for a confirmation link." },
            { status: 403 }
          );
        }
      }
    } catch {
      // If auth check fails, continue (allows unauthenticated demo usage)
    }

    // Rate limit: 30 generations per hour per user/IP
    const rl = checkRateLimit(rateLimitKey, 30, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before generating again." },
        { status: 429 }
      );
    }

    const toneNote =
      tone === "professional"
        ? " Write in a professional, polished tone — formal language, no casual abbreviations."
        : tone === "casual"
          ? " Write in a casual, conversational tone — approachable and relaxed."
          : "";
    const slangNote = avoidSlang ? " Avoid slang and informal expressions." : "";

    let text = "";
    let fallback = false;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.log("[generate-twin] No ANTHROPIC_API_KEY set — using local post fallback");
      text = writeFallbackTwinPost(posts, tone);
      fallback = true;
    } else {
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 500,
        system: twinSystemPrompt(),
        messages: [
          {
            role: "user",
            content: `Source:\n\n${posts}\n\n${toneNote}${slangNote}\nWrite the post now.`,
          },
        ],
      });
      text = message.content[0].type === "text" ? message.content[0].text.trim() : "";
      if (!text) {
        text = writeFallbackTwinPost(posts, tone);
        fallback = true;
      } else {
        console.log("[generate-twin] Claude response generated successfully");
      }
    }

    // Save generation for authenticated users — including the local fallback.
    let generation: { id: string; input_text: string; output_text: string; created_at: string } | null = null;
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && text) {
        const { data: saved, error: saveError } = await supabase
          .from("generations")
          .insert({
            user_id: user.id,
            input_text: posts,
            output_text: text,
          })
          .select("id, input_text, output_text, created_at")
          .single();
        if (saveError) {
          console.warn("[generate-twin] Failed to save generation:", saveError.message);
        } else {
          generation = saved;
        }
      }
    } catch (saveErr) {
      console.warn("[generate-twin] Failed to save generation:", saveErr);
    }

    return NextResponse.json({ text, fallback, generation });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[generate-twin] Error:", errorMessage);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
