/**
 * Returns an application-local path or a safe fallback. This deliberately
 * rejects protocol-relative paths (for example, `//example.com`), which URL
 * constructors treat as external redirects.
 */
export function safeInternalPath(value: string | null | undefined, fallback: string): string {
  const path = String(value ?? "").trim();
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : fallback;
}
