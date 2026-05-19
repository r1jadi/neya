export type ReservationPaymentMethod = "online" | "pay_at_venue";

export type ReservationConfigSource = {
  reservation_price_eur?: number | string | null;
  requires_online_payment?: boolean | null;
  allows_pay_at_venue?: boolean | null;
  reservations_enabled?: boolean | null;
};

export type ResolvedReservationConfig = {
  priceEur: number;
  priceCents: number;
  requiresOnlinePayment: boolean;
  allowsPayAtVenue: boolean;
  reservationsEnabled: boolean;
  isFree: boolean;
  availableMethods: ReservationPaymentMethod[];
  showPaymentSelector: boolean;
};

function toEur(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
}

export function eurToCents(eur: number): number {
  return Math.round(eur * 100);
}

export function resolveReservationConfig(
  venue: ReservationConfigSource,
  event?: ReservationConfigSource | null,
): ResolvedReservationConfig {
  const priceEur = toEur(event?.reservation_price_eur ?? venue.reservation_price_eur ?? 0);
  const priceCents = eurToCents(priceEur);
  const requiresOnlinePayment =
    event?.requires_online_payment ?? venue.requires_online_payment ?? false;
  const allowsPayAtVenue = event?.allows_pay_at_venue ?? venue.allows_pay_at_venue ?? true;
  const reservationsEnabled = venue.reservations_enabled !== false;
  const isFree = priceCents === 0;

  const availableMethods: ReservationPaymentMethod[] = [];

  if (!isFree) {
    if (requiresOnlinePayment && !allowsPayAtVenue) {
      availableMethods.push("online");
    } else if (requiresOnlinePayment && allowsPayAtVenue) {
      availableMethods.push("online", "pay_at_venue");
    } else if (allowsPayAtVenue) {
      availableMethods.push("pay_at_venue", "online");
    } else {
      availableMethods.push("online");
    }
  }

  const showPaymentSelector = !isFree && availableMethods.length > 1;

  return {
    priceEur,
    priceCents,
    requiresOnlinePayment,
    allowsPayAtVenue,
    reservationsEnabled,
    isFree,
    availableMethods,
    showPaymentSelector,
  };
}

export function formatReservationPrice(eur: number): string {
  if (eur <= 0) return "Free";
  return `€${eur % 1 === 0 ? eur.toFixed(0) : eur.toFixed(2)}`;
}
