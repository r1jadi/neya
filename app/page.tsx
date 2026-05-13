import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { LandingSections } from "@/features/landing/sections";
import { getFeaturedEvents } from "@/services/events";
import { getVenues } from "@/services/venues";

export default async function Home() {
  const [events, venues] = await Promise.all([getFeaturedEvents(), getVenues()]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <LandingSections events={events} venues={venues} />
      <SiteFooter />
    </div>
  );
}
