import type { Metadata } from "next";
import { MyNightPlanner } from "@/components/my-night/my-night-planner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { getActivePlanForUser } from "@/services/my-night";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `My Night · ${SITE.name}`,
  description: "Plan your night in 3 stops — pick venues and events, order them, and share the plan.",
};

export default async function MyNightPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const initialPlan = user ? await getActivePlanForUser(user.id) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <SiteHeader />
      <main className="flex-1">
        <MyNightPlanner initialPlan={initialPlan} />
      </main>
      <SiteFooter />
    </div>
  );
}
