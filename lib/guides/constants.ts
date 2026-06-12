import type {
  GuideCategory,
  GuideDifficulty,
  GuideLocationType,
  GuideStopCategory,
  GuideTransportType,
} from "@/types/guides";

export const GUIDE_LOCATION_TYPES: { value: GuideLocationType; label: string }[] = [
  { value: "prishtina", label: "Prishtina" },
  { value: "kosovo", label: "Kosovo" },
  { value: "city", label: "City" },
  { value: "region", label: "Region" },
];

export const GUIDE_DIFFICULTIES: { value: GuideDifficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "advanced", label: "Advanced" },
];

export const GUIDE_STOP_CATEGORIES: { value: GuideStopCategory; label: string; color: string }[] = [
  { value: "attractions", label: "Attractions", color: "#38bdf8" },
  { value: "restaurants", label: "Restaurants", color: "#fbbf24" },
  { value: "nightlife", label: "Nightlife", color: "#f472b6" },
  { value: "hotels", label: "Hotels", color: "#a78bfa" },
  { value: "bus_stations", label: "Bus Stations", color: "#34d399" },
  { value: "museums", label: "Museums", color: "#fb923c" },
  { value: "parks", label: "Parks", color: "#4ade80" },
  { value: "shopping", label: "Shopping", color: "#e879f9" },
  { value: "landmarks", label: "Landmarks", color: "#60a5fa" },
  { value: "hiking", label: "Hiking", color: "#86efac" },
];

export const GUIDE_TRANSPORT_TYPES: { value: GuideTransportType; label: string; icon: string }[] = [
  { value: "urban_bus", label: "Urban Bus", icon: "🚌" },
  { value: "intercity_bus", label: "Intercity Bus", icon: "🚍" },
  { value: "taxi", label: "Taxi", icon: "🚕" },
  { value: "walking", label: "Walking", icon: "🚶" },
  { value: "car", label: "Car", icon: "🚗" },
];

export const GUIDE_FILTER_CATEGORIES: { value: GuideCategory; label: string }[] = [
  { value: "family_friendly", label: "Family Friendly" },
  { value: "nightlife", label: "Nightlife" },
  { value: "adventure", label: "Adventure" },
  { value: "food", label: "Food" },
  { value: "culture", label: "Culture" },
  { value: "nature", label: "Nature" },
];

export const DURATION_PRESETS = [
  { days: 1, label: "1 Day" },
  { days: 2, label: "2 Days" },
  { days: 3, label: "3 Days" },
  { days: 0, label: "Multi-day" },
  { days: -1, label: "Custom" },
] as const;

export function stopCategoryColor(category: string): string {
  return GUIDE_STOP_CATEGORIES.find((c) => c.value === category)?.color ?? "#38bdf8";
}

export function formatDuration(guide: { duration_days?: number | null; duration_label?: string | null }): string {
  if (guide.duration_label?.trim()) return guide.duration_label;
  const d = guide.duration_days;
  if (d == null) return "Flexible";
  if (d === 0) return "Multi-day";
  if (d === 1) return "1 day";
  return `${d} days`;
}

export function formatPrice(price: number, currency = "EUR"): string {
  if (price <= 0) return "Free";
  return new Intl.NumberFormat("en-EU", { style: "currency", currency }).format(price);
}
