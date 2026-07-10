import * as cheerio from "cheerio";
import { logger } from "@/lib/logger";

type BrandResult = {
  colors: string[];
  logoUrl: string | null;
};

const TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 512_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; LeadPilotBot/1.0; +https://leadpilot.ai/bot)";

const HEX_RE = /^#([0-9a-fA-F]{3,8})$/;
const GRAY_OR_NEAR_WHITE_BLACK = /^#([fF]{2,}){3}/;
const LOW_SAT_RE =
  /^#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3$/;

function isLikelyBrandColor(hex: string): boolean {
  const m = hex.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (!m) return true;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : ((max - min) / max) * 100;

  if (sat < 15) return false;
  if (r > 240 && g > 240 && b > 240) return false;
  if (r < 10 && g < 10 && b < 10) return false;

  return true;
}

function normalizeHex(raw: string): string | null {
  let h = raw.trim().toLowerCase();
  if (!h.startsWith("#")) h = `#${h}`;
  if (!HEX_RE.test(h)) return null;

  if (h.length === 4) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  if (h.length === 9) {
    h = h.slice(0, 7);
  }
  if (h.length !== 7) return null;
  return h;
}

function parseHexColorsFromCss(css: string): string[] {
  const found: string[] = [];
  const hexPat = /#[0-9a-fA-F]{3,8}/g;
  let m: RegExpExecArray | null;
  while ((m = hexPat.exec(css)) !== null) {
    const normalized = normalizeHex(m[0]);
    if (normalized) found.push(normalized);
  }
  return found;
}

function mostFrequent(arr: string[], max: number): string[] {
  const freq = new Map<string, number>();
  for (const item of arr) {
    freq.set(item, (freq.get(item) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map((e) => e[0]);
}

async function fetchWithLimit(
  url: string,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });

    clearTimeout(timer);

    if (!res.ok) return null;

    const reader = res.body?.getReader();
    if (!reader) return null;

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_RESPONSE_BYTES) break;
      chunks.push(value);
    }
    reader.cancel();

    const decoder = new TextDecoder();
    return chunks.map((c) => decoder.decode(c, { stream: true })).join("");
  } catch {
    return null;
  }
}

async function fetchManifest(
  baseUrl: string,
): Promise<Record<string, unknown> | null> {
  const manifestUrl = new URL("/manifest.json", baseUrl).href;
  const text = await fetchWithLimit(manifestUrl);
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function fetchOneStylesheet(
  href: string,
  baseUrl: string,
): Promise<string | null> {
  try {
    const url = new URL(href, baseUrl).href;
    return await fetchWithLimit(url);
  } catch {
    return null;
  }
}

export async function extractBrand(url: string): Promise<BrandResult | null> {
  try {
    const html = await fetchWithLimit(url);
    if (!html) return null;

    const $ = cheerio.load(html);
    const baseUrl = url;
    const colors = new Set<string>();

    // 1. <meta name="theme-color">
    $('meta[name="theme-color"]').each((_, el) => {
      const content = $(el).attr("content");
      if (content) {
        const n = normalizeHex(content);
        if (n && isLikelyBrandColor(n)) colors.add(n);
      }
    });

    // 2. manifest.json theme_color
    const manifest = await fetchManifest(baseUrl);
    if (manifest) {
      const tc = manifest.theme_color as string | undefined;
      if (tc) {
        const n = normalizeHex(tc);
        if (n && isLikelyBrandColor(n)) colors.add(n);
      }
    }

    // 3. CSS custom properties from inline styles + first linked stylesheet
    const cssVars: string[] = [];
    const brandVarPatterns = [
      /--primary\b/i,
      /--brand\b/i,
      /--accent\b/i,
    ];
    $("style").each((_, el) => {
      const text = $(el).html() ?? "";
      for (const pat of brandVarPatterns) {
        const re = new RegExp(
          `${pat.source}\\s*:\\s*#[0-9a-fA-F]{3,8}`,
          "g",
        );
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          const hex = m[0].split(":")[1].trim();
          const n = normalizeHex(hex);
          if (n && isLikelyBrandColor(n)) cssVars.push(n);
        }
      }
    });

    const firstCssLink = $('link[rel="stylesheet"]').first().attr("href");
    const firstCssText = firstCssLink
      ? await fetchOneStylesheet(firstCssLink, baseUrl)
      : null;
    if (firstCssText) {
      for (const pat of brandVarPatterns) {
        const re = new RegExp(
          `${pat.source}\\s*:\\s*#[0-9a-fA-F]{3,8}`,
          "g",
        );
        let m: RegExpExecArray | null;
        while ((m = re.exec(firstCssText)) !== null) {
          const hex = m[0].split(":")[1].trim();
          const n = normalizeHex(hex);
          if (n && isLikelyBrandColor(n)) cssVars.push(n);
        }
      }
    }

    for (const c of cssVars) colors.add(c);

    // 4. Most-frequent hex colors from CSS
    const allCssColors: string[] = [];
    $("style").each((_, el) => {
      allCssColors.push(...parseHexColorsFromCss($(el).html() ?? ""));
    });
    if (firstCssText) {
      allCssColors.push(...parseHexColorsFromCss(firstCssText));
    }
    const freqColors = mostFrequent(allCssColors, 6);
    for (const c of freqColors) {
      if (isLikelyBrandColor(c) && c !== "#000000" && c !== "#ffffff") {
        colors.add(c);
      }
    }

    // --- Logo ---
    let logoUrl: string | null = null;

    // 1. og:logo
    const ogLogo = $('meta[property="og:logo"]').attr("content");
    if (ogLogo) {
      try {
        logoUrl = new URL(ogLogo, baseUrl).href;
      } catch {
        /* ignore */
      }
    }

    // 2. apple-touch-icon
    if (!logoUrl) {
      const appleTouch = $('link[rel="apple-touch-icon"]').attr("href");
      if (appleTouch) {
        try {
          logoUrl = new URL(appleTouch, baseUrl).href;
        } catch {
          /* ignore */
        }
      }
    }

    // 3. <link rel="icon"> — prefer largest, prefer PNG/SVG over .ico
    if (!logoUrl) {
      const icons: { href: string; sizes: number; ext: string }[] = [];
      $('link[rel="icon"], link[rel="shortcut icon"]').each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        const sizesStr = $(el).attr("sizes");
        const sizes = sizesStr ? parseInt(sizesStr.split("x")[0], 10) || 0 : 0;
        const ext = href.split(".").pop()?.toLowerCase() ?? "";
        try {
          icons.push({ href: new URL(href, baseUrl).href, sizes, ext });
        } catch {
          /* ignore */
        }
      });
      icons.sort((a, b) => {
        const extScore = (e: string) => {
          if (e === "svg") return 3;
          if (e === "png") return 2;
          return 1;
        };
        const scoreA = extScore(a.ext) * 100 + a.sizes;
        const scoreB = extScore(b.ext) * 100 + b.sizes;
        return scoreB - scoreA;
      });
      if (icons.length > 0) logoUrl = icons[0].href;
    }

    // 4. <img> in header/nav with "logo" in src/class/alt
    if (!logoUrl) {
      const logoImg = $(
        'header img, nav img, [role="banner"] img',
      ).filter((_, el) => {
        const src = $(el).attr("src") ?? "";
        const cls = $(el).attr("class") ?? "";
        const alt = $(el).attr("alt") ?? "";
        const combined = `${src} ${cls} ${alt}`.toLowerCase();
        return combined.includes("logo") || combined.includes("brand");
      }).first();
      const src = logoImg.attr("src");
      if (src) {
        try {
          logoUrl = new URL(src, baseUrl).href;
        } catch {
          /* ignore */
        }
      }
    }

    // 5. og:image as last resort
    if (!logoUrl) {
      const ogImage = $('meta[property="og:image"]').attr("content");
      if (ogImage) {
        try {
          logoUrl = new URL(ogImage, baseUrl).href;
        } catch {
          /* ignore */
        }
      }
    }

    if (logoUrl) {
      const imgExtMatch = logoUrl.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)(\?|#|$)/i);
      if (!imgExtMatch) logoUrl = null;
    }

    return {
      colors: [...colors].slice(0, 6),
      logoUrl,
    };
  } catch (error) {
    logger.error(error);
    return null;
  }
}
