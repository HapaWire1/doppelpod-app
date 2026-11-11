export type BillingPeriod = "monthly" | "yearly";

export interface PlanFeature {
  label: string;
  comingSoon?: boolean;
}

/** Shipped plan copy. Unbuilt items stay visible only with a coming-soon label. */
export const PRO_PRICE_MONTHLY = "$29";
export const PRO_PRICE_YEARLY = "$290";
export const ELITE_PRICE_MONTHLY = "$69";
export const ELITE_PRICE_YEARLY = "$690";

export const TRIAL_FEATURES: PlanFeature[] = [
  { label: "Unlimited voice generation" },
  { label: "Unlimited video avatars" },
  { label: "Twin posts in your voice" },
  { label: "Priority rendering" },
  { label: "10 days of Elite access" },
  { label: "Cowork", comingSoon: true },
  { label: "Virality score", comingSoon: true },
  { label: "Multi-platform posting", comingSoon: true },
];

export const PRO_FEATURES: PlanFeature[] = [
  { label: "Unlimited voice generation" },
  { label: "10 video avatars/month" },
  { label: "Twin posts in your voice" },
  { label: "Priority support" },
  { label: "Cowork", comingSoon: true },
  { label: "Virality score", comingSoon: true },
  { label: "Multi-platform posting", comingSoon: true },
];

export const ELITE_FEATURES: PlanFeature[] = [
  { label: "Everything in Pro" },
  { label: "Unlimited video avatars" },
  { label: "Priority rendering" },
  { label: "Dedicated account manager" },
  { label: "Cowork voice chat", comingSoon: true },
];

export function featureLabel(feature: PlanFeature): string {
  return feature.comingSoon ? `${feature.label} (coming soon)` : feature.label;
}

export function planPrice(tier: "pro" | "elite", billingPeriod: BillingPeriod): string {
  if (tier === "elite") {
    return billingPeriod === "yearly" ? ELITE_PRICE_YEARLY : ELITE_PRICE_MONTHLY;
  }
  return billingPeriod === "yearly" ? PRO_PRICE_YEARLY : PRO_PRICE_MONTHLY;
}

/** Hydration-safe calendar date (UTC) for a trial timestamp. */
export function formatTrialEnd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
