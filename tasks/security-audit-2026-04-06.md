# Security Audit — 2026-04-06

## Scope
Full end-to-end audit of all API routes, RLS policies, Stripe webhook, security headers,
env vars, file uploads, rate limiting, email operations, and LLM prompt handling.

## Status
All critical, high, and medium findings fixed and deployed to production (commit `475dcd4`).
Backup tag `backup/pre-security-2026-04-06` pinned to pre-fix state on GitHub.

---

## Fixes Applied This Session

| ID | File | Fix |
|----|------|-----|
| C1 | `supabase-server.ts`, `profile/route.ts`, `voice/upload/route.ts` | Added `createAdminSupabaseClient()`; all profile writes use service role |
| C1 | Supabase migration | Restricted profiles RLS to safe columns only (`voice_id`, `comms_email`, `updated_at`) |
| C2 | `api-gate.ts`, `profile/route.ts` | All `usage_tracking` writes via admin client; UPDATE policy removed from user RLS |
| C3 | `create-checkout-session/route.ts` | Removed mock tier upgrade bypass; returns 503 if Stripe not configured |
| H1 | `video-status/route.ts` | Added auth check — unauthenticated requests now return 401 |
| H2 | `cowork/route.ts` | Length caps (500/5000 chars) + XML delimiters on user input in system prompt |
| H3 | `generate-video/route.ts` | Server-side `savedAvatarId` lookup — client-supplied value never trusted |
| M1 | `next.config.ts` | Full security headers suite (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) |
| M2 | `rate-limit.ts` (new) | Sliding-window rate limiter applied to generate-twin (30/hr), send-verification-email (5/hr), feedback (10/hr), create-checkout-session (10/hr) |
| M3 | `cowork/route.ts` | Generic error message — raw `err.message` no longer returned to client |
| M4 | `cron/process-video-jobs/route.ts` | Removed `?secret=` query param fallback; header-only auth + undefined guard |
| M5 | Supabase migration | Explicit deny INSERT/UPDATE on `email_change_requests` via RLS |
| M6 | Supabase migration + `page.tsx` | Dropped `waitlist` table; removed all frontend references |
| L1 | `voice/upload/route.ts` | Magic-number file signature validation (MP3/WAV/OGG/WebM/MP4) supplements MIME type check |
| L2 | `generations/route.ts` | Pagination `limit` capped at 100; `offset` floored at 0; NaN values fall back to defaults |
| L3 | `generate-twin/route.ts` | Generic 500 error message — raw error string no longer sent to client |
| — | `feedback/route.ts` | `escapeHtml()` applied to all user input before email template injection |
| — | `account/delete/route.ts` | Hard fail (500) if `SUPABASE_SERVICE_ROLE_KEY` missing — no silent partial deletion |
| — | `cron/process-video-jobs/route.ts` | Returns 503 if `CRON_SECRET` env var is undefined |
| — | `confirm-email-change/route.ts` | Token value redacted in server logs |
| — | `verify-email/route.ts` + DB | 48-hour expiry on verification tokens; legacy null tokens treated as valid |
| — | `api-gate.ts` | `incrementUsage` fallback inserts fresh row instead of silent no-op |

---

## Remaining Known Issues (Low / Accepted)

| ID | File | Issue | Severity | Notes |
|----|------|-------|----------|-------|
| R1 | `api-gate.ts` | Read-then-write in `incrementUsage` — concurrent requests could under-count usage | Low | Fix: atomic SQL `UPDATE counter = counter + 1`. Queue for next session. |
| R2 | `feedback/route.ts` | No message length cap | Low | Easy fix: add 5000-char limit on `message` |
| R3 | `stripe/webhook.ts` | No idempotency key tracking — duplicate webhook events re-process harmlessly but incorrectly | Low | Track processed Stripe event IDs in DB |
| R4 | `rate-limit.ts` | In-memory rate limiter is per-instance, not global across serverless functions | Accepted | Documented in code. Upgrade path: Upstash Redis. Best-effort is meaningful improvement. |
| R5 | `next.config.ts` | CSP requires `unsafe-inline` / `unsafe-eval` | Accepted | Required by Next.js SSR. Nonce-based CSP would fix but significant refactor. |

---

## False Positives Dismissed

- HeyGen image key injection — requires HeyGen's own API to be compromised
- Token enumeration on `verify-email` — UUID is 128-bit entropy, brute force infeasible
- CRON_SECRET brute force — depends on operator choosing a strong secret, not a code issue
- Stripe email-based lookup — email is Stripe-supplied (trusted); customer ID stored for future events
- Polyglot audio file attack — attacks HeyGen's infrastructure, not ours
- Prompt injection XML breakout in cowork — mitigated with delimiters + 500-char cap, accepted residual risk
- `confirm-email-change` brute force — 2× UUID token length, not brute-forceable

---

## Infrastructure Verified Live
- All 6 security response headers confirmed in production via DevTools
- Rate limiting confirmed: 30 requests → 429 on generate-twin
- Auth gate confirmed: unauthenticated `/api/video-status` returns 401
- Cron query param removed: `?secret=` now returns 401
- Supabase DB migrations applied directly (not via deploy)
