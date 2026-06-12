import type { Guide, GuideCategory } from "@/types/guides";

export type GuideFilterParams = {
  minPrice?: number;
  maxPrice?: number;
  duration?: number;
  locationType?: string;
  city?: string;
  category?: GuideCategory;
  featured?: boolean;
  familyFriendly?: boolean;
};

export function filterGuides(guides: Guide[], params: GuideFilterParams): Guide[] {
  return guides.filter((g) => {
    if (params.minPrice != null && g.price < params.minPrice) return false;
    if (params.maxPrice != null && g.price > params.maxPrice) return false;
    if (params.duration != null) {
      if (params.duration === 0) {
        if (g.duration_days != null && g.duration_days > 0 && g.duration_days < 4) return false;
      } else if (g.duration_days !== params.duration) return false;
    }
    if (params.locationType && g.location_type !== params.locationType) return false;
    if (params.city && g.location_name?.toLowerCase() !== params.city.toLowerCase()) return false;
    if (params.category && !g.categories.includes(params.category)) return false;
    if (params.featured && !g.featured) return false;
    if (params.familyFriendly && !g.family_friendly && !g.categories.includes("family_friendly")) return false;
    return true;
  });
}

export function parseGuideSearchParams(searchParams: Record<string, string | undefined>): GuideFilterParams {
  return {
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
    duration: searchParams.duration ? Number(searchParams.duration) : undefined,
    locationType: searchParams.location,
    city: searchParams.city,
    category: searchParams.category as GuideCategory | undefined,
    featured: searchParams.featured === "1",
    familyFriendly: searchParams.family === "1",
  };
}
