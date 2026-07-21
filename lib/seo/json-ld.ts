import type { Event, Venue } from "@/types";
import { SITE } from "@/lib/constants";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    description: "Nightlife and events discovery for Prishtina, Kosovo — expanding across the Balkans.",
    areaServed: {
      "@type": "City",
      name: "Prishtina",
      containedInPlace: { "@type": "Country", name: "Kosovo" },
    },
  };
}

export function eventJsonLd(event: Event) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description ?? undefined,
    startDate: event.starts_at,
    endDate: event.ends_at,
    image: event.image_url,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: event.venue ? {
      "@type": "Place",
      name: event.venue.name,
      address: event.venue.address,
    } : undefined,
    performer: event.lineup?.length
      ? event.lineup.map((l) => ({ "@type": "Person", name: l.name }))
      : undefined,
    offers: event.ticket_from_eur
      ? {
          "@type": "Offer",
          price: event.ticket_from_eur,
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          url: event.ticket_url ?? undefined,
        }
      : undefined,
  };
}

export function venueJsonLd(venue: Venue) {
  return {
    "@context": "https://schema.org",
    "@type": "NightClub",
    name: venue.name,
    image: venue.image_url,
    address: venue.address,
    geo:
      venue.lat != null && venue.lng != null
        ? {
            "@type": "GeoCoordinates",
            latitude: venue.lat,
            longitude: venue.lng,
          }
        : undefined,
  };
}
