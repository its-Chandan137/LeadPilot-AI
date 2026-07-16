// Shared referrer-domain normalizer used by BOTH the widget impression capture
// (config route) and the blocklist enforcement/analytics so that grouping and
// blocking always agree on a single normalized domain string.
//
// Rules:
// - Empty / unparseable input -> null ("Direct / none").
// - Lowercase hostname, leading "www." stripped.
// - If `ownSiteUrl` is provided and the hostname matches the project's own
//   site, returns null (self-traffic counts as Direct).
// - A bare domain (no scheme, e.g. "google.com") is accepted as-is, so the
//   same function can normalize admin-entered blocklist entries.
// - `co.uk`-style registrable domains are NOT collapsed to a single label;
//   this is an acceptable v1 limitation (hostname-level grouping only).

export function normalizeReferrerDomain(
  referrer: string | null | undefined,
  ownSiteUrl?: string | null
): string | null {
  if (!referrer || !referrer.trim()) return null;

  let hostname: string;
  try {
    hostname = new URL(referrer).hostname;
  } catch {
    // No scheme — treat the raw string as a hostname (admin-entered domain).
    hostname = referrer;
  }

  hostname = hostname.toLowerCase().replace(/^www\./, "").trim();
  if (!hostname) return null;

  if (ownSiteUrl) {
    try {
      const ownHost = new URL(ownSiteUrl).hostname.toLowerCase().replace(/^www\./, "");
      if (ownHost && ownHost === hostname) return null;
    } catch {
      // Own-site comparison is best-effort; ignore parse failures.
    }
  }

  return hostname;
}
