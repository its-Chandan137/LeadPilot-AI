export function isOriginAllowed(
  origin: string | null,
  referer: string | null,
  siteUrl: string
): boolean {
  // No browser context at all — allow (Postman, curl, server-side)
  if (!origin && !referer) return true;

  try {
    const storedOrigin = new URL(siteUrl).origin;
    const normalize = (s: string) => s.replace(/\/$/, "").toLowerCase();

    // Prefer origin header (cross-origin requests send this)
    if (origin) {
      return normalize(origin) === normalize(storedOrigin);
    }

    // Fallback to referer (same-origin requests)
    if (referer) {
      const refOrigin = new URL(referer).origin;
      return normalize(refOrigin) === normalize(storedOrigin);
    }

    return false;
  } catch {
    return false;
  }
}
