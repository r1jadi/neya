import type { Event, Venue } from "@/types";
import { SITE } from "@/lib/constants";
import type { TicketType } from "@/services/booking-meta";

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

export function eventJsonLd(event: Event, ticketTypes: TicketType[] = []) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description ?? undefined,
    startDate: event.starts_at,
    endDate: event.ends_at,
    image: event.image_url,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: event.venue
      ? {
          "@type": "Place",
          name: event.venue.name,
          address: event.venue.address,
        }
      : undefined,
    performer: event.performers?.length
      ? event.performers.map((performer) => ({ "@type": "Person", name: performer.name, image: performer.image_url, genre: performer.genre }))
      : undefined,
    offers: ticketTypes.length
      ? ticketTypes.map((ticket) => ({
          "@type": "Offer",
          name: ticket.name,
          description: ticket.description ?? undefined,
          price: ticket.priceCents / 100,
          priceCurrency: ticket.currency,
          availability: ticket.status === "available" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
        }))
      : event.ticket_from_eur
      ? {
          "@type": "Offer",
          price: event.ticket_from_eur,
          priceCurrency: "EUR",
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
