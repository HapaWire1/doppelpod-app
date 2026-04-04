# DoppelPod — Session Handoff (2026-04-02)

## Branch
`claude/suspicious-maxwell` — merged to main via PR #4.

## Todo

### 1. Feature card sizing + interactivity signifier — verify on Vercel
Voice Cloning card was slightly tall in local preview. Confirm cards equalize correctly in production on desktop and mobile (2-col and 4-col grid). Also revisit the bottom-right arrow — may not be strong enough to communicate interactivity. Consider alternatives (subtle pulse animation, border highlight on hover, text hint).

### 2. Stress/function test DoppelPod
End-to-end testing across all major flows: signup, trial, voice generation, video generation, cowork, export, delete, billing.

### 3. Custom email verification system
Full plan at: `C:\Users\Adobo1\.claude\plans\piped-skipping-tome.md`
- DB: add `verification_token UUID DEFAULT NULL` to `profiles`
- New files: `src/lib/verification-email.ts`, `src/app/api/verify-email/route.ts`, `src/app/api/send-verification-email/route.ts`
- Modified: `src/lib/tiers.ts`, `src/app/api/profile/route.ts`, `src/components/auth-provider.tsx`, `src/lib/api-gate.ts`, `src/app/api/generate-twin/route.ts`, `src/app/api/account/export/route.ts`, `src/app/api/account/delete/route.ts`, `src/components/dashboard-client.tsx`

### 4. FAQ / Help Center page
Not started. Needs copy written and a route built.

### 5. About / Origin Story page
Copy is finalized (CTO is Andrew, founder/CEO is Tyler). Needs a route and page built.

### 6. Beta audience rollout
Strategy discussed, nothing implemented. Define rollout scope and any access gating.

### 7. Login/review Chirospring

### 8. Review/audit Emporia

### 9. HeyGen photo avatar — evaluate alternatives
First-time avatar creation is taking 30-60+ minutes. Before shipping custom photo video to users, evaluate:
- **First-time vs repeat cost**: saved `talking_photo_id` skips avatar creation entirely on subsequent videos — benchmark the saved avatar flow before abandoning HeyGen
- **HeyGen TalkingPhoto v1**: simpler endpoint, no avatar creation step, photo + script → video directly. Faster but less polished.
- **Alternatives to benchmark**: D-ID, Tavus, Synthesia — compare speed, quality, and pricing
- Decision point: if saved avatar flow is fast (3-5 min), the 20-30 min first-time cost may be acceptable with good UX messaging. If not, switch APIs.

## Key Context
- Production domain: doppelpod.io (NOT .com)
- Supabase auto-confirm is currently ON — email verification plan above replaces it with custom flow
- Coming Soon: Autopilot, Virality Predictor, Multi-Platform (feature cards)
- Coming Soon: Voice Cloning (dashboard)
- Env vars already set in Vercel: CRON_SECRET, yearly Stripe price IDs
- Yearly pricing: Pro $290/yr, Elite $690/yr (10 months pricing)
