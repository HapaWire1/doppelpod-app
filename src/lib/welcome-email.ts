const TIER_FEATURES: Record<string, string[]> = {
  Pro: [
    "Unlimited voice generation",
    "10 video avatars/month",
    "Basic Cowork (text-only, 10/day)",
    "3 platforms",
    "Virality predictor",
    "Priority support",
  ],
  Elite: [
    "Unlimited voice generation",
    "Unlimited video avatars",
    "Full Cowork (voice chat + unlimited)",
    "Priority rendering",
    "Unlimited platforms",
    "Dedicated account manager",
  ],
};

export function buildWelcomeEmail(tier: string) {
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
  const features = TIER_FEATURES[tierName] || TIER_FEATURES.Pro;

  const featureListHtml = features
    .map(
      (f) =>
        `<li style="padding:4px 0;color:#e2e2e2;">${f}</li>`
    )
    .join("");

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#f0f0f0;background:#0a0a0a;">
  <div style="margin-bottom:32px;">
    <span style="font-size:24px;font-weight:700;background:linear-gradient(135deg,#9333ea,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">DoppelPod</span>
  </div>

  <p style="font-size:16px;line-height:1.6;color:#e2e2e2;">Hey,</p>

  <p style="font-size:16px;line-height:1.6;color:#e2e2e2;">
    You just unlocked <strong style="color:#c084fc;">DoppelPod ${tierName}</strong> — welcome aboard.
  </p>

  <div style="margin:24px 0;padding:20px;border-radius:12px;border:1px solid rgba(147,51,234,0.3);background:rgba(147,51,234,0.08);">
    <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#a855f7;">What you can do right now</p>
    <ul style="margin:0;padding:0 0 0 20px;font-size:14px;line-height:1.8;">
      <li style="padding:4px 0;color:#e2e2e2;"><strong>Voice Cloning</strong> — generate posts that sound like you, not a robot</li>
      <li style="padding:4px 0;color:#e2e2e2;"><strong>Video Avatars</strong> — AI-generated video content with your likeness</li>
      <li style="padding:4px 0;color:#e2e2e2;"><strong>Claude Cowork</strong> — brainstorm and refine content with AI in real time</li>
      <li style="padding:4px 0;color:#e2e2e2;"><strong>Virality Predictor</strong> — every post gets scored before it goes live</li>
    </ul>
  </div>

  <div style="text-align:center;margin:28px 0;">
    <a href="https://doppelpod.io/dashboard" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#9333ea,#ec4899);color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">Go to your Dashboard</a>
  </div>

  <div style="margin:24px 0;padding:20px;border-radius:12px;border:1px solid rgba(147,51,234,0.15);background:rgba(147,51,234,0.04);">
    <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#a855f7;">What's coming next</p>
    <ul style="margin:0;padding:0 0 0 20px;font-size:14px;line-height:1.8;">
      <li style="padding:4px 0;color:#e2e2e2;"><strong>Agentic Autopilot</strong> — your twin posts, replies, and engages on its own</li>
      <li style="padding:4px 0;color:#e2e2e2;"><strong>Multi-platform publishing</strong> — X, LinkedIn, Instagram, TikTok from one place</li>
      <li style="padding:4px 0;color:#e2e2e2;"><strong>Scheduling &amp; analytics</strong> — full control over when and how your twin shows up</li>
    </ul>
  </div>

  <div style="margin:32px 0 0;font-size:15px;line-height:1.7;color:#d4d4d4;">
    <p>You're early. That means you get to help shape what this becomes.</p>
    <p>We're obsessed with making this the easiest and most powerful tool for creators, so if anything feels off or there's a feature you'd like to see added, let us know. My brother and I personally read every message.</p>
    <p>Welcome to the future of content creation!</p>
  </div>

  <p style="margin-top:32px;font-size:15px;color:#e2e2e2;">— The DoppelPod team</p>

  <div style="margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#666;">
    <p style="margin:0;">DoppelPod powered by Hapawire</p>
  </div>
</div>`;

  return {
    subject: `You're in — welcome to DoppelPod ${tierName}`,
    html,
  };
}
