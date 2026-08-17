import { redirect } from "next/navigation";

/** City discovery is the same canonical event experience with a city scope. */
export default async function CityDiscoveryPage({ params }: PageProps<"/cities/[city]">) {
  const { city } = await params;
  const safeCity = city.toLowerCase().replace(/[^a-z0-9-]/g, "") || "prishtina";
  redirect(`/events?city=${encodeURIComponent(safeCity)}`);
}
