/** Local placeholder when no cover image is set in the database. */
export const PLACEHOLDER_IMAGE = "/placeholder.svg";

export function resolveImageUrl(url: string | null | undefined): string {
  if (url && url.trim()) return url.trim();
  return PLACEHOLDER_IMAGE;
}
