# Onboarding polish

- [x] Paywall checkout buttons and shared plan copy
- [x] Coming soon labels for Cowork, virality score, and multi-platform posting
- [x] Dashboard first-run checklist and empty states
- [x] Twin post prompt, no-voice messaging, and history save
- [x] Clear the verification lock without a manual reload
- [x] Sticky nav, homepage mobile menu, trial banner no longer covered
- [x] /account, /settings, and /billing
- [x] Signup trial context, password rules, next step, resend
- [x] Honest 15–60 minute video copy
- [x] Tests and production build

## Review

Plan lists live in `src/lib/plans.ts` and feed the homepage, paywall, checkout modal, and welcome email. Checkout still calls `/api/create-checkout-session` with the existing public price IDs. Unshipped items stay visible only with a coming-soon label. Cowork chat is no longer offered from the composer.

A Vercel preview was not deployed from this environment: team project details returned 403 and no Vercel token was available. Pushing the branch should still create a Git preview if the Git integration is connected.
