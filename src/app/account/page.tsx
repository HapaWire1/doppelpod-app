import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { withCompTier } from "@/lib/comp-access";
import { AccountBilling } from "@/components/account-billing";

export default async function AccountPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?login=true");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const stamped = profile ? withCompTier(profile, user.email) : null;

  return (
    <AccountBilling
      email={user.email || ""}
      profile={{
        tier: (stamped?.tier as string) || "expired",
        trial_end: (stamped?.trial_end as string | null) ?? null,
        paid_tier: (stamped?.paid_tier as string | null) ?? null,
        comp_tier: stamped?.comp_tier ?? null,
        stripe_customer_id: (stamped?.stripe_customer_id as string | null) ?? null,
      }}
    />
  );
}
