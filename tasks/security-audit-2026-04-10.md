# Security Audit — 2026-04-10

## Scope
Incremental audit of all new code since 2026-04-06 audit:
- Voice provider abstraction layer (`src/lib/voice-provider.ts`, `src/lib/providers/`)
- `/api/voice/clone` (new route)
- `/api/voice/upload` (updated)
- `/api/text-to-speech` (updated)
- `src/components/voice-recorder.tsx` (new client component)
- `next.config.ts` Permissions-Policy change
- Carry-over items from previous audit (R1–R3)

## Status
All medium findings fixed and deployed. Low/accepted items documented below.

---

## Fixes Applied This Session

| ID | File | Fix |
|----|------|-----|
| N1 | `text-to-speech/route.ts` | Auth required — unauthenticated requests now return 401 (previously bypassed tier gate and consumed provider credits) |
| N2 | `text-to-speech/route.ts` | Rate limit: 30/hr per user |
| N3 | `voice/upload/route.ts` | Rate limit: 10/hr per user |
| R2 | `feedback/route.ts` | Message length capped at 5000 characters |
| —  | `next.config.ts` | `Permissions-Policy: microphone=(self)` — corrected from `()` blanket block that prevented voice recording |

---

## Remaining Known Issues (Low / Accepted)

| ID | File | Issue | Severity | Notes |
|----|------|-------|----------|-------|
| R1 | `api-gate.ts` | Read-then-write race in `incrementUsage` — concurrent requests could under-count | Low | Fix: atomic SQL UPDATE. Queued for future session. |
| R3 | `stripe/webhook.ts` | No idempotency key tracking — duplicate webhook events possible | Low | Track processed Stripe event IDs in DB. Queued. |
| R4 | `rate-limit.ts` | In-memory rate limiter is per-instance | Accepted | Per previous audit — best-effort, upgrade path is Upstash Redis |
| R5 | `next.config.ts` | CSP requires `unsafe-inline`/`unsafe-eval` | Accepted | Required by Next.js SSR |

---

## False Positives / Dismissed

- **Provider error leakage** — raw Fish/ElevenLabs API errors thrown internally but caught at route level; only generic message returned to client
- **CSP connect-src missing Fish Audio/ElevenLabs** — provider calls are server-to-server, not browser-initiated; CSP does not apply
- **Storage path extension from filename** — `voice-samples/{uid}/sample.{ext}` uses user-supplied extension but Supabase Storage is a blob store (not a web server); no code execution risk. Content validated by magic numbers regardless.
- **voice-recorder.tsx** — client-side only; all uploaded audio goes through server-side magic-number validation in `/api/voice/upload`
- **Singleton provider in `voice-provider.ts`** — module-level `_provider` is safe in serverless (each invocation is isolated); no cross-user state risk

---

## Infrastructure Verified Live
- All auth gates confirmed present on new routes
- Rate limiting confirmed on TTS, voice/upload, voice/clone
- Deployed to production: commit `cd227c0`
