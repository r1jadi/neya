import { MOCK_VENUES } from "@/data/mock-data";
import type { Venue } from "@/types";

export async function getVenues(): Promise<Venue[]> {
  return MOCK_VENUES;
}

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  return MOCK_VENUES.find((v) => v.slug === slug) ?? null;
}
