import * as cheerio from "cheerio";

export async function crawlUrl(url: string): Promise<{ title: string; content: string; pagesVisited: string[] }> {
  const visited = new Set<string>();
  const baseUrl = new URL(url).origin;
  const allContent: string[] = [];
  const pagesToVisit = [url];
  const MAX_PAGES = 10;

  while (pagesToVisit.length > 0 && visited.size < MAX_PAGES) {
    const currentUrl = pagesToVisit.shift()!;
    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    try {
      const res = await fetch(currentUrl, {
        headers: { "User-Agent": "LeadPilotBot/1.0" },
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) continue;

      const html = await res.text();
      const $ = cheerio.load(html);

      // Remove noise
      $("script, style, nav, footer, header, [role='navigation'], .nav, .footer, .header, .menu, .sidebar").remove();

      // Extract text
      const pageText = $("body").text().replace(/\s+/g, " ").trim();
      if (pageText.length > 100) {
        allContent.push(`[Page: ${currentUrl}]\n${pageText}`);
      }

      // Find internal links (limit to same origin)
      if (visited.size < MAX_PAGES) {
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href");
          if (!href) return;
          try {
            const absolute = new URL(href, currentUrl).toString();
            if (absolute.startsWith(baseUrl) && !visited.has(absolute) && !pagesToVisit.includes(absolute)) {
              // Skip common non-content pages
              if (!absolute.match(/\.(jpg|jpeg|png|gif|svg|pdf|zip|css|js)$/i)) {
                pagesToVisit.push(absolute);
              }
            }
          } catch {}
        });
      }
    } catch (error) {
      console.error(`Failed to crawl ${currentUrl}:`, error);
    }
  }

  const title = new URL(url).hostname;
  return {
    title,
    content: allContent.join("\n\n"),
    pagesVisited: Array.from(visited)
  };
}
