import { normalizeReferrerDomain } from "@/lib/referrer";

// Namespaced, future-proof traffic-control config. Sits under
// widgetConfig.traffic so siblings (allowedReferrers, blockedCountries, …)
// can be added beside it later without a migration or a reshape.
export type TrafficConfig = {
  blockedReferrers?: string[];
  blockedPaths?: string[];
};

// Glob → regex (case-insensitive, anchored):
//   escape regex metacharacters EXCEPT `*`, then `*` -> `.*`.
// Plus a shell-style convenience: a trailing `/*` (or bare `*`) also matches
// the parent path, so `/careers/*` matches both `/careers` and
// `/careers/anything` but never `/careersfake`.
function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

export function matchesGlob(path: string, glob: string): boolean {
  const g = glob.trim();
  if (!g || !path) return false;

  const withoutStar = g.replace(/\*+$/, "");
  const prefix = withoutStar.replace(/\/+$/, "");
  if (prefix && (path === prefix || path.startsWith(prefix + "/"))) {
    return true;
  }

  return globToRegex(g).test(path);
}

// The single block decision used by the widget config route. A visit is
// blocked if its referrer domain is in `blockedReferrers` OR its path matches
// any glob in `blockedPaths`. Missing config / arrays are treated as empty and
// never throw.
export function isTrafficBlocked(opts: {
  referrerDomain: string | null;
  path?: string | null;
  traffic?: TrafficConfig | null;
}): boolean {
  const blockedReferrers = opts.traffic?.blockedReferrers ?? [];
  const blockedPaths = opts.traffic?.blockedPaths ?? [];

  if (
    opts.referrerDomain &&
    blockedReferrers
      .map((d) => normalizeReferrerDomain(d) ?? d.toLowerCase())
      .includes(opts.referrerDomain.toLowerCase())
  ) {
    return true;
  }

  if (opts.path && blockedPaths.some((glob) => matchesGlob(opts.path!, glob))) {
    return true;
  }

  return false;
}
