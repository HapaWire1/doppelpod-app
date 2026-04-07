"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = "text" | "voice" | "video";

const tabs: { key: Tab; label: string; emoji: string }[] = [
  { key: "text",  label: "Text",  emoji: "✍️" },
  { key: "voice", label: "Voice", emoji: "🎙️" },
  { key: "video", label: "Video", emoji: "🎬" },
];

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-[11px] font-bold text-purple-400 mt-0.5">
        {n}
      </span>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 px-3 py-2.5">
      <p className="text-[11px] text-purple-300/80 leading-relaxed">
        <span className="font-semibold text-purple-400">Tip: </span>{children}
      </p>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 px-3 py-2.5">
      <p className="text-[11px] text-amber-300/80 leading-relaxed">
        <span className="font-semibold text-amber-400">Note: </span>{children}
      </p>
    </div>
  );
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("text");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How to use DoppelPod</DialogTitle>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-1 rounded-lg border border-border/50 bg-muted/20 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                activeTab === t.key
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Text tab */}
        {activeTab === "text" && (
          <div className="space-y-4 pt-1">
            <p className="text-xs font-medium text-purple-400 uppercase tracking-wider">Generating AI Twin Posts</p>
            <div className="space-y-3">
              <Step n={1}>
                Paste <strong className="text-foreground">3–5 of your recent social media posts</strong> into the text box — one per line is ideal. The more posts you give it, the better it learns your voice and style. <strong className="text-foreground">No existing posts? No problem</strong> — just freestyle it. Write a few sentences about any topic in your natural voice and DoppelPod will work from that.
              </Step>
              <Step n={2}>
                Click <strong className="text-foreground">Generate Twin Post</strong>. Your AI twin will rewrite the content in your tone, style, and personality.
              </Step>
              <Step n={3}>
                Review the result. If you like it, hit <strong className="text-foreground">Copy</strong> and paste it wherever you need it.
              </Step>
              <Step n={4}>
                If the AI rewrite isn't quite right, click <strong className="text-foreground">Regenerate</strong> for a fresh take — or switch between the AI version and your original using the pills that appear above the output.
              </Step>
            </div>
            <Tip>
              Want to skip the AI rewrite entirely? Start your message with{" "}
              <span className="font-mono text-purple-300">/exact</span> followed by your text — e.g.{" "}
              <span className="font-mono text-purple-300">/exact Here&apos;s my announcement</span>. DoppelPod will use your words verbatim for voice and video.
            </Tip>
            <Tip>
              Past generations are saved in your dashboard so you can come back to them any time.
            </Tip>
          </div>
        )}

        {/* Voice tab */}
        {activeTab === "voice" && (
          <div className="space-y-4 pt-1">
            <p className="text-xs font-medium text-purple-400 uppercase tracking-wider">Generating AI Voice Audio</p>
            <div className="space-y-3">
              <Step n={1}>
                First, generate a post using the Text tab — or type your own script using{" "}
                <span className="font-mono text-xs text-purple-400">/exact</span>. Voice generation works from whatever text is in the output box.
              </Step>
              <Step n={2}>
                Choose a <strong className="text-foreground">Voice Preset</strong>:
                <ul className="mt-1.5 ml-1 space-y-1 text-[12px]">
                  <li><span className="text-foreground font-medium">Creative</span> — takes the most creative liberties with delivery</li>
                  <li><span className="text-foreground font-medium">Balanced</span> — good all-round starting point</li>
                  <li><span className="text-foreground font-medium">Clone</span> — stays as close as possible to your uploaded voice sample</li>
                  <li><span className="text-foreground font-medium">Custom</span> — set the exact strength with the slider</li>
                </ul>
              </Step>
              <Step n={3}>
                Click <strong className="text-foreground">Hear My Twin Speak It</strong>. The audio will generate in a few seconds and play automatically.
              </Step>
              <Step n={4}>
                Use the playback controls to preview. Want a different take? Adjust the preset or slider and generate again.
              </Step>
            </div>
            <Warn>
              Voice cloning from your own uploaded sample is coming soon. For now, DoppelPod uses a high-quality base voice that matches your style.
            </Warn>
          </div>
        )}

        {/* Video tab */}
        {activeTab === "video" && (
          <div className="space-y-4 pt-1">
            <p className="text-xs font-medium text-purple-400 uppercase tracking-wider">Generating Talking Video Avatars</p>
            <div className="space-y-3">
              <Step n={1}>
                First, generate a post using the Text tab — or type your script with{" "}
                <span className="font-mono text-xs text-purple-400">/exact</span>. The script in the output box becomes the video narration.
              </Step>
              <Step n={2}>
                Scroll down to <strong className="text-foreground">Talking Video Avatar</strong>. You have three options:
                <ul className="mt-1.5 ml-1 space-y-1 text-[12px]">
                  <li><span className="text-foreground font-medium">Default avatar</span> — no photo needed, generates in 3–5 minutes using a built-in presenter</li>
                  <li><span className="text-foreground font-medium">Use my avatar</span> — if you&apos;ve uploaded a photo before, your custom avatar is saved and ready (3–5 min)</li>
                  <li><span className="text-foreground font-medium">Upload new photo</span> — upload a fresh portrait to create or update your custom avatar (15–25 min first time)</li>
                </ul>
              </Step>
              <Step n={3}>
                If uploading a new photo, make sure it&apos;s a <strong className="text-foreground">solo portrait</strong> — just you, face clearly visible, decent lighting. No group shots, heavy filters, or sunglasses.
              </Step>
              <Step n={4}>
                Click <strong className="text-foreground">Generate Video</strong>. Because video processing takes time, <strong className="text-foreground">we&apos;ll email you when it&apos;s ready</strong> — you don&apos;t need to keep this page open.
              </Step>
              <Step n={5}>
                When the email arrives, come back to your <strong className="text-foreground">Dashboard → Video Jobs</strong> to download your video.
              </Step>
            </div>
            <Warn>
              Processing a new photo avatar can take up to 25 minutes. Once created, your avatar is saved — future videos generate in 3–5 minutes.
            </Warn>
            <Tip>
              The longer and more detailed your script, the longer your video will be. Keep it under ~300 words for best results.
            </Tip>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
