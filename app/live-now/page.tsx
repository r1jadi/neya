import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { LiveNowPanel } from "@/components/neya/live-now-panel";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Live Now · ${SITE.name}`,
  description: "See what is happening right now in Prishtina.",
};

export default function LiveNowPage() {
  return <div className="flex min-h-screen flex-col bg-[var(--background)]"><SiteHeader /><main className="flex-1 pt-8"><LiveNowPanel /></main><SiteFooter /></div>;
}
