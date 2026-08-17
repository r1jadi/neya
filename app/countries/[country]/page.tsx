import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getActiveCities } from "@/services/cities";

export default async function CountryPage({ params }: { params: Promise<{ country: string }> }) {
  const { country } = await params; const cities = (await getActiveCities()).filter((city) => city.country_slug === country); if (!cities.length) notFound();
  return <div className="flex min-h-screen flex-col bg-[var(--background)]"><SiteHeader /><main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Country</p><h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-white">{cities[0].country_name}</h1><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cities.map((city) => <Link key={city.slug} href={`/cities/${city.slug}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-sky-400/40"><p className="font-semibold text-white">{city.name}</p><p className="mt-1 text-sm text-white/55">Open city programme →</p></Link>)}</div></main><SiteFooter /></div>;
}
