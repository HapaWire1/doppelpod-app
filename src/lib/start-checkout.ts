import type { BillingPeriod } from "@/lib/plans";

/** Existing Stripe price IDs. Do not invent new prices here. */
export function priceIdFor(tier: string, billingPeriod: BillingPeriod): string {
  const key = tier.toLowerCase();
  const monthly: Record<string, string> = {
    pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_pro_placeholder",
    elite: process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID || "price_elite_placeholder",
  };
  const yearly: Record<string, string> = {
    pro: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRO_PRICE_ID || "price_yearly_pro_placeholder",
    elite: process.env.NEXT_PUBLIC_STRIPE_YEARLY_ELITE_PRICE_ID || "price_yearly_elite_placeholder",
  };
  const table = billingPeriod === "yearly" ? yearly : monthly;
  return table[key] || "";
}

export async function startStripeCheckout(tier: string, billingPeriod: BillingPeriod) {
  const priceId = priceIdFor(tier, billingPeriod);
  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier: tier.toLowerCase(), priceId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Checkout failed");
  }

  if (data.url) {
    window.location.href = data.url;
    return { redirected: true as const };
  }

  if (data.mock) {
    return { mock: true as const };
  }

  throw new Error("Checkout did not return a URL.");
}
