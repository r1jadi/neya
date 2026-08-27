import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FriendsPanel } from "@/components/social/friends-panel";

export default async function FriendsPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/friends")}`);
  return <div className="flex min-h-screen flex-col bg-[var(--background)]"><SiteHeader /><main className="flex-1"><FriendsPanel /></main><SiteFooter /></div>;
}
