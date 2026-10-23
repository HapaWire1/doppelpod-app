// Server-only helpers for "comped" (tester / early-adopter) access.
// Comped users get a tier without any Stripe subscription, so they never
// appear in Stripe revenue/MRR/churn.
//
// Two sources, checked in order:
//   1. TESTER_EMAILS env var (comma-separated, case-insensitive) => "elite"
//   2. profiles.comp_tier column (optional; see PR for SQL)
import type { TierName } from "./tiers";

const COMPABLE: TierName[] = ["pro", "elite"];

export function getTesterEmails(): Set<string> {
  return new Set(
    (process.env.TESTER_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isTesterEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getTesterEmails().has(email.trim().toLowerCase());
}

/** Returns the comp tier for a profile, or null if not comped. */
export function resolveCompTier(profile: {
  email?: string | null;
  comp_tier?: string | null;
}, authEmail?: string | null): TierName | null {
  if (isTesterEmail(authEmail) || isTesterEmail(profile.email)) return "elite";
  const ct = profile.comp_tier?.toLowerCase() as TierName | undefined;
  return ct && COMPABLE.includes(ct) ? ct : null;
}

/**
 * Stamps `comp_tier` onto a profile object (in memory only) so that
 * getEffectiveTier() — which also runs client-side, where env isn't
 * available — sees the comp. Does not write to the DB.
 */
export function withCompTier<T extends Record<string, unknown>>(
  profile: T,
  authEmail?: string | null
): T & { comp_tier: TierName | null } {
  const comp = resolveCompTier(
    profile as { email?: string | null; comp_tier?: string | null },
    authEmail
  );
  return { ...profile, comp_tier: comp };
}
