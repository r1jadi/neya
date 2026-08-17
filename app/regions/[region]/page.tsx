import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getActiveCities } from "@/services/cities";

export default async function RegionPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params; const cities = (await getActiveCities()).filter((city) => city.region_slug === region);
  if (!cities.length) notFound(); const groups = Map.groupBy(cities, (city) => city.country_slug);
  return <div className="flex min-h-screen flex-col bg-[var(--background)]"><SiteHeader /><main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Region</p><h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-white">{cities[0].region_name}</h1><div className="mt-8 grid gap-4 sm:grid-cols-2">{[...groups.entries()].map(([country, list]) => <Link key={country} href={`/countries/${country}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-sky-400/40"><p className="font-semibold text-white">{list![0].country_name}</p><p className="mt-1 text-sm text-white/55">{list!.length} active {list!.length === 1 ? "city" : "cities"}</p></Link>)}</div></main><SiteFooter /></div>;
}
