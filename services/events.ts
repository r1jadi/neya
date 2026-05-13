import { MOCK_EVENTS } from "@/data/mock-data";
import type { Event } from "@/types";

export async function getFeaturedEvents(): Promise<Event[]> {
  return MOCK_EVENTS;
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  return MOCK_EVENTS.find((e) => e.slug === slug) ?? null;
}
