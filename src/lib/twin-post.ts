/**
 * Used when Claude is unavailable. Always returns a standalone post,
 * never the raw topic echoed back as the whole result.
 */
export function writeFallbackTwinPost(
  input: string,
  tone?: "professional" | "neutral" | "casual" | string
): string {
  const cleaned = input.replace(/\s+/g, " ").trim();
  const topic = cleaned.replace(/^["']|["']$/g, "").slice(0, 180).trim() || "this idea";

  if (tone === "professional") {
    return [
      `The useful way to talk about ${topic} is to make one decision easier.`,
      `Say who it is for, what they should do next, and which step you would drop. A topic line is not a post. A post takes a side and stops.`,
      `If you are shipping this, publish the sentence your customer needed last week — not a recap of the subject.`,
    ].join("\n\n");
  }

  if (tone === "casual") {
    return [
      `Real talk about ${topic}.`,
      `People keep announcing the topic and calling it a post. Pick the one thing you actually believe, say who it helps, and tell them the next step in a sentence you would say out loud.`,
      `Post that. Leave the rest in your notes.`,
    ].join("\n\n");
  }

  return [
    `Most posts about ${topic} never get past the subject line.`,
    `Here is a version you can publish: name the person it is for, the mistake you are done making, and the single next step. Specific beats a paraphrase of the idea.`,
    `If this is the thing you cannot stop thinking about, that next step is the post.`,
  ].join("\n\n");
}

export function twinSystemPrompt(): string {
  return `You write ready-to-publish social posts for a creator's AI twin.

The user message is either a short topic / rough idea, or one or more posts they already wrote.

If it is a topic, a title, or a note under about 40 words, write a complete post about it. Do not echo the topic back as the whole post. Open with a specific hook, make one clear point in the creator's words, and end with a line people can reply to.

If it is already a full post, rewrite it in that same voice: sharper hook, same facts, no invented claims, similar length.

Rules:
- Output only the post. No labels, no surrounding quotation marks, no "AI Twin version", no preamble.
- A topic must become 40 to 120 words. A full source post stays close to its original length.
- Sound like a person. Do not add "drop a follow", "10x", or generic hype.
- Do not mention that you are an AI or that a voice is being cloned.`;
}
