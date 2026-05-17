import { randomUUID } from "node:crypto";

export function slugify(name: string, suffix = true): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const stem = base || "item";
  return suffix ? `${stem}-${randomUUID().slice(0, 8)}` : stem;
}
