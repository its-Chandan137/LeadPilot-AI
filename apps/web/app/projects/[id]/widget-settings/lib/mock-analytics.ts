// Types for the Traffic tab. The canonical definitions + the real server-side
// provider live in `@/lib/traffic-analytics` (read-only Prisma). This file
// re-exports them so existing consumers (`traffic-panel.tsx`,
// `traffic-tab.tsx`) keep their `./lib/mock-analytics` import paths unchanged.
//
// Mock data was removed — the tab now renders real `WidgetImpression` analytics
// threaded down from the server component.

export type {
  ReferrerHit,
  ReferrerGroup,
  AnalyticsData,
} from "@/lib/traffic-analytics";

export type { TrafficConfig } from "@/lib/traffic-block";
