"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  normalizeWidgetMode,
  defaultTemplateFor,
  normalizeWidgetTemplate,
  modeToTemplateType,
  parseTemplateId,
  type WidgetProvider,
  type WidgetTemplateType,
  type BotObjective,
} from "@leadpilot/types";
import { PREDEFINED_OBJECTIVES, type ProjectObjective } from "@/lib/objectives";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CommonDialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Paintbrush, Code, Cpu, Mic, Check, Eye, Target, Globe, Upload } from "lucide-react";
import { CopySnippet } from "@/components/ui/copy-snippet";
import { ColorPicker } from "@/components/ui/color-picker";
import { BrandSection } from "@/components/widget-settings/brand-section";
import { TrafficTab } from "./traffic-tab";
import { UnsavedChangesPopup } from "@/components/popups/unsaved-changes";
import type { AnalyticsData, TrafficConfig } from "./lib/mock-analytics";

type Tab = "objective" | "setup" | "appearance" | "snippet" | "traffic";

function tabFromParam(tabParam: string | null): Tab {
  return tabParam === "setup" ||
    tabParam === "snippet" ||
    tabParam === "appearance" ||
    tabParam === "traffic"
    ? tabParam
    : "objective";
}
type Mode = "chat" | "voice" | "both";
type Provider = WidgetProvider;

type TemplateDef = {
  value: string;
  name: string;
  type: WidgetTemplateType;
  style: string;
  comingSoon?: boolean;
};

type Props = {
  projectId: string;
  projectName: string;
  clientId: string;
  widgetConfig: Record<string, unknown>;
  apiUrl: string;
  analytics: AnalyticsData | null;
  trafficConfig: TrafficConfig;
};

const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "objective", label: "Bot Objective", icon: Target },
  { key: "setup", label: "Widget Setup", icon: Cpu },
  { key: "appearance", label: "Appearance", icon: Paintbrush },
  { key: "snippet", label: "Embed Snippet", icon: Code },
  { key: "traffic", label: "Traffic", icon: Globe },
];

const MODES: { value: Mode; label: string }[] = [
  { value: "chat", label: "Chat Only" },
  { value: "voice", label: "Voice Only" },
  { value: "both", label: "Chat + Voice" },
];

const PROVIDERS: {
  value: Provider;
  name: string;
  description: string;
  badge: string;
  badgeColor: string;
  supportedModes: Mode[];
  disabled: boolean;
}[] = [
    {
      value: "groq",
      name: "Groq",
      description: "Fast & Free",
      badge: "Chat Only",
      badgeColor: "bg-green-100 text-green-700",
      supportedModes: ["chat"],
      disabled: false,
    },
    {
      value: "livekit-openai",
      name: "LiveKit + OpenAI",
      description: "Chat + Voice",
      badge: "Chat · Voice · Chat+Voice",
      badgeColor: "bg-blue-100 text-blue-700",
      supportedModes: ["chat", "voice", "both"],
      disabled: false,
    },
    {
      value: "sarvam",
      name: "Sarvam AI",
      description: "Indian languages",
      badge: "Coming Soon",
      badgeColor: "bg-slate-100 text-slate-600",
      supportedModes: [],
      disabled: true,
    },
  ];

function defineTemplates(
  type: WidgetTemplateType,
  items: { style: string; name: string; comingSoon?: boolean }[],
): TemplateDef[] {
  return items.map((item) => ({
    value: `${type}-${item.style}`,
    name: item.name,
    type,
    style: item.style,
    comingSoon: item.comingSoon,
  }));
}



const TEMPLATES: TemplateDef[] = [
  ...defineTemplates("chatonly", [
    { style: "classic", name: "Classic" },
    { style: "fusion", name: "Fusion" },
    { style: "dock-style", name: "Dock Style" },
    { style: "modern", name: "Modern" },
    { style: "minimal", name: "Minimal", comingSoon: true },
    { style: "card", name: "Card", comingSoon: true },

  ]),
  ...defineTemplates("voiceonly", [
    { style: "classic", name: "Classic" },
    { style: "dock-style", name: "Dock Style" },
    { style: "fusion", name: "Fusion" },
    { style: "modern", name: "Modern" },
    { style: "minimal", name: "Minimal", comingSoon: true },
    { style: "card", name: "Card", comingSoon: true },

  ]),
  ...defineTemplates("both", [
    { style: "classic", name: "Classic" },
    { style: "dock-style", name: "Dock Style" },
    { style: "fusion", name: "Fusion" },
    { style: "modern", name: "Modern" },
    { style: "split", name: "Split", comingSoon: true },
    { style: "tabbed", name: "Tabbed", comingSoon: true },

  ]),
];

function PhoneGlyph({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M6.5 4h3l1.5 4.5-2 1.2a12 12 0 0 0 5.3 5.3l1.2-2L21.5 14v3a1.5 1.5 0 0 1-1.6 1.5C10.2 18.5 5.5 13.8 5 7.1A1.5 1.5 0 0 1 6.5 4z" />
    </svg>
  );
}
function MicGlyph({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
        fill="white"
      />
      <path
        d="M19 11a7 7 0 0 1-14 0"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 18v3"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 21h6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TemplatePreview({ value }: { value: string; color?: string }) {
  const { type, style } = parseTemplateId(value);
  const previewStyle = style ?? value;
  const isVoice = type === "voiceonly";
  const isBoth = type === "both";

  switch (previewStyle) {
    case "classic":
      return (
        <div className="relative w-full h-full bg-slate-50">
          <div className="absolute bottom-1.5 right-1.5 flex flex-col items-end gap-1">
            {!isVoice && <div className="w-14 h-9 rounded-lg border bg-white shadow-sm" />}
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--preview-brand)]">
              {isVoice ? <PhoneGlyph size={9} /> : null}
            </div>
          </div>
        </div>
      );
    case "modern":
      return (
        <div className="relative w-full h-full bg-slate-50 p-2">
          <div className="w-full h-full rounded-md border bg-white flex flex-col overflow-hidden">
            <div className="flex-1 p-1">
              {!isVoice && <div className="w-6 h-4 rounded-sm bg-slate-100" />}
            </div>
            <div className="border-t flex items-center justify-center p-1 gap-0.5">
              {isVoice ? (
                <div className="flex h-3 w-3 items-center justify-center rounded-full bg-[var(--preview-brand)]">
                  <PhoneGlyph size={7} />
                </div>
              ) : (
                <>
                  <div className="flex-1 h-1.5 rounded-sm bg-slate-100" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[var(--preview-brand)]" />
                </>
              )}
            </div>
          </div>
        </div>
      );
    case "minimal":
      return (
        <div className="relative w-full h-full bg-slate-50">
          <div className="absolute bottom-0 left-1 right-1 h-2 rounded-t-sm bg-[var(--preview-brand)]" />
        </div>
      );
    case "card":
      return (
        <div className="relative w-full h-full bg-slate-50 p-2">
          <div className="h-full w-full rounded-md border-2 border-[var(--preview-brand)] bg-white shadow-sm" />
        </div>
      );
    case "split":
      return (
        <div className="relative w-full h-full bg-slate-50 p-2">
          <div className="w-full h-full rounded-md border bg-white flex overflow-hidden">
            <div className="flex-1 flex items-start p-1">
              <div className="w-4 h-3 rounded-sm bg-slate-200" />
            </div>
            <div className="w-4 bg-slate-50 flex items-center justify-center border-l">
              <div className="h-2 w-2 rounded-full bg-[var(--preview-brand)]" />
            </div>
          </div>
        </div>
      );
    case "tabbed":
      return (
        <div className="relative w-full h-full bg-slate-50 p-2">
          <div className="w-full h-full rounded-md border bg-white flex flex-col overflow-hidden">
            <div className="flex border-b text-[6px]">
              <div className="flex-1 py-0.5 text-center font-semibold text-[var(--preview-brand)]">Chat</div>
              <div className="flex-1 py-0.5 text-center text-slate-300">Voice</div>
            </div>
            <div className="flex-1 p-1">
              <div className="w-6 h-3 rounded-sm bg-slate-100" />
            </div>
          </div>
        </div>
      );
    case "dock-style":
      // Same dock shell as chat; voice-only drops the input/CTAs and keeps the phone.
      return (
        <div className="relative flex h-full w-full flex-col items-center justify-end bg-slate-50 p-2">
          <div className="flex w-[70%] flex-col items-center gap-0.5">
            <div className="w-full rounded-lg bg-gradient-to-br from-cyan-300 to-violet-400 p-px shadow-sm">
              <div className="rounded-lg bg-white p-1">
                <div className="mx-auto mb-0.5 h-0.5 w-3 rounded-full bg-slate-200" />
                {isVoice ? (
                  <div className="flex items-center justify-center py-0.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--preview-brand)] shadow-sm">
                      <PhoneGlyph size={9} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-0.5 flex items-center gap-0.5">
                      <div className="min-w-0 flex-1 rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 p-px">
                        <div className="flex h-2.5 items-center rounded-full bg-white px-0.5">
                          <div className="h-1 w-1 shrink-0 rounded-full bg-cyan-300" />
                          <div className="mx-0.5 h-0.5 flex-1 rounded-full bg-slate-100" />
                          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--preview-brand)]" />
                        </div>
                      </div>
                      {isBoth && (
                        <div className="flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full bg-[var(--preview-brand)]">
                          <PhoneGlyph size={7} />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-0.5">
                      <div className="h-1.5 rounded-full bg-slate-100" />
                      <div className="h-1.5 rounded-full bg-slate-100" />
                      <div className="h-1.5 rounded-full bg-slate-100" />
                      <div className="h-1.5 rounded-full bg-slate-100" />
                    </div>
                  </>
                )}
              </div>
            </div>
            {/* {type === "both" && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--preview-brand)] text-white shadow-sm">
                <svg width={9} height={9} viewBox="0 0 24 24" fill="white" aria-hidden="true">
                  <path d="M6.5 4h3l1.5 4.5-2 1.2a12 12 0 0 0 5.3 5.3l1.2-2L21.5 14v3a1.5 1.5 0 0 1-1.6 1.5C10.2 18.5 5.5 13.8 5 7.1A1.5 1.5 0 0 1 6.5 4z" />
                </svg>
              </div>
            )} */}
          </div>
        </div>
      );
    case "fusion":
      return (
        <div className="relative w-full h-full bg-slate-50 flex items-end justify-center p-2">
          {isVoice ? (
            // Voice Only
            <div className="flex items-center justify-center w-[30%] rounded-full border border-slate-200 bg-white shadow-sm px-2 py-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--preview-brand)]">
                <MicGlyph size={15} />
              </div>
            </div>
          ) : (
            // Chat Only + Chat & Voice
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white shadow-sm px-2 py-1">
              {isBoth && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--preview-brand)]">
                  <MicGlyph size={11} />
                </div>
              )}

              <div className="h-2 w-2 rounded-full bg-slate-300" />

              <div className="w-12 h-1 rounded-full bg-slate-100" />

              <div className="h-2.5 w-2.5 rounded-full bg-[var(--preview-brand)]" />
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}

function FullWidgetPreview({
  value,
  color = "#2563eb",
  botName = "LeadPilot",
  welcomeMessage = "Hi! How can I help you Today?",
}: {
  value: string;
  color?: string;
  botName?: string;
  welcomeMessage?: string;
}) {
  const { type, style } = parseTemplateId(value);
  const previewStyle = style ?? value;
  const isVoice = type === "voiceonly";
  const isBoth = type === "both";
  const initial = botName.charAt(0).toUpperCase() || "L";
  const suggestions = ["Book an appointment", "Business hours", "Pricing", "Contact support"];

  if (previewStyle === "dock-style") {
    return (
      <div className="relative h-full w-full overflow-hidden bg-white">
        <div className="absolute bottom-8 left-1/2 w-full max-w-md -translate-x-1/2 px-4">
          <div className="rounded-[22px] bg-gradient-to-br from-cyan-300 via-teal-300 to-violet-400 p-[2px] shadow-xl">
            <div className="rounded-[20px] bg-white px-4 pb-4 pt-5">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
              {isVoice ? (
                <div className="flex justify-center py-6">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
                    style={{ background: color }}
                  >
                    <PhoneGlyph size={22} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="min-w-0 flex-1 rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 p-[2px]">
                      <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2.5">
                        <div className="h-4 w-4 rounded-full bg-cyan-300" />
                        <div className="h-2 flex-1 rounded-full bg-slate-100" />
                        <div className="flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ background: color }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M3 11.5L21 3l-8.5 18-2.2-7.3L3 11.5z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    {isBoth && (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" style={{ background: color }}>
                        <PhoneGlyph size={16} />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {["Speak to Sales", "Book a Demo", "Business hours", "Pricing"].map((label) => (
                      <div key={label} className="rounded-full bg-slate-100 px-3 py-2.5 text-center text-xs font-semibold text-slate-600">
                        {label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isVoice) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-white">
        <div className="absolute bottom-6 right-6 w-[min(380px,calc(100%-48px))] overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-3 px-4 py-4 text-white" style={{ background: color }}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg font-bold">{initial}</div>
              <div>
                <p className="text-sm font-bold leading-tight">{botName}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/85">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Online
                </p>
              </div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white">×</div>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 bg-slate-50 px-6 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg" style={{ background: color }}>
              <PhoneGlyph size={28} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Start a voice call</p>
          </div>
          <p className="pb-3 text-center text-[10px] tracking-wide text-slate-400">Powered by LeadPilot</p>
        </div>
      </div>
    );
  }


  return (
    <div className="relative h-full w-full overflow-hidden bg-white">
      <div className="absolute bottom-6 right-6 flex h-[min(620px,calc(100%-48px))] w-[min(400px,calc(100%-48px))] flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-4 text-white" style={{ background: color }}>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-bold">{initial}</div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold leading-tight">{botName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/85">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Online
                </span>
                <span>· Typically replies instantly</span>
              </p>
            </div>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-base leading-none text-white">×</div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-4">
          <div className="mb-4 text-center">
            <div
              className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold text-white shadow-md"
              style={{ background: color }}
            >
              {initial}
            </div>
            <p className="text-base font-bold text-slate-900">Welcome!</p>
            <p className="mt-1 text-[13px] text-slate-500">How can we help today?</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {suggestions.map((text) => (
                <span
                  key={text}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[12px] text-slate-800"
                >
                  {text}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-2 max-w-[85%] rounded-[14px] rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-slate-900 shadow-sm">
            {welcomeMessage || "Hi! How can I help you Today?"}
          </div>
          <p className="mb-2 text-[10px] text-slate-400">Now</p>
        </div>

        <div className="flex shrink-0 items-end gap-2 border-t border-slate-200 bg-white px-3 py-3">
          <div className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-[14px] text-slate-400">
            Type your message...
          </div>
          <div className="flex h-[42px] w-[46px] shrink-0 items-center justify-center rounded-xl text-white" style={{ background: color }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M2.5 10l15-7.5-7.5 15L8.75 11.25 2.5 10z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            </svg>
          </div>
          {isBoth && (
            <div className="flex h-[42px] w-[46px] shrink-0 items-center justify-center rounded-xl text-white" style={{ background: color }}>
              <PhoneGlyph size={16} />
            </div>
          )}
        </div>
        <p className="shrink-0 pb-2 text-center text-[10px] tracking-wide text-slate-400">Powered by LeadPilot</p>
      </div>
    </div>
  );
}

const snippetPlatforms: [string, string][] = [
  [
    "HTML",
    `<script\n  async\n  src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.js"\n  data-client-id="##CLIENT_ID##"\n  data-api-url="${typeof window !== "undefined" ? window.location.origin : ""}"\n  data-widget-src="${typeof window !== "undefined" ? window.location.origin : ""}/widget-dist/widget.js"\n></script>`,
  ],
  [
    "React",
    `useEffect(() => {\n  const s = document.createElement('script')\n  s.src = '${typeof window !== "undefined" ? window.location.origin : ""}/widget.js'\n  s.async = true\n  s.dataset.clientId = '##CLIENT_ID##'\n  s.dataset.apiUrl = '${typeof window !== "undefined" ? window.location.origin : ""}'\n  s.dataset.widgetSrc = '${typeof window !== "undefined" ? window.location.origin : ""}/widget-dist/widget.js'\n  document.body.appendChild(s)\n  return () => document.body.removeChild(s)\n}, [])`,
  ],
  [
    "Angular",
    `ngOnInit() {\n  const s = document.createElement('script')\n  s.src = '${typeof window !== "undefined" ? window.location.origin : ""}/widget.js'\n  s.async = true\n  s.dataset.clientId = '##CLIENT_ID##'\n  s.dataset.apiUrl = '${typeof window !== "undefined" ? window.location.origin : ""}'\n  s.dataset.widgetSrc = '${typeof window !== "undefined" ? window.location.origin : ""}/widget-dist/widget.js'\n  document.body.appendChild(s)\n}`,
  ],
  [
    "Vue",
    `onMounted(() => {\n  const s = document.createElement('script')\n  s.src = '${typeof window !== "undefined" ? window.location.origin : ""}/widget.js'\n  s.async = true\n  s.dataset.clientId = '##CLIENT_ID##'\n  s.dataset.apiUrl = '${typeof window !== "undefined" ? window.location.origin : ""}'\n  s.dataset.widgetSrc = '${typeof window !== "undefined" ? window.location.origin : ""}/widget-dist/widget.js'\n  document.body.appendChild(s)\n})`,
  ],
  [
    "Next.js",
    `<Script\n  async\n  src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.js"\n  data-client-id="##CLIENT_ID##"\n  data-api-url="${typeof window !== "undefined" ? window.location.origin : ""}"\n  data-widget-src="${typeof window !== "undefined" ? window.location.origin : ""}/widget-dist/widget.js"\n/>`,
  ],
  [
    "Google Tag Manager",
    "Create a Custom HTML tag with the HTML snippet, trigger it on All Pages, then publish the container.",
  ],
];

const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: "Inter (Default)", value: "" },
  { label: "System UI", value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { label: "Serif (Georgia)", value: 'Georgia, Cambria, "Times New Roman", serif' },
  { label: "Monospace", value: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  { label: "Rounded (Quicksand)", value: 'Quicksand, "Segoe UI", system-ui, sans-serif' },
  { label: "Poppins", value: 'Poppins, "Segoe UI", system-ui, sans-serif' },
];

export function WidgetSettingsClient({ projectId, projectName, clientId, widgetConfig, apiUrl, analytics, trafficConfig }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialTab = tabFromParam(searchParams.get("tab"));
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [botName, setBotName] = useState((widgetConfig?.botName as string) ?? "LeadPilot");
  const [color, setColor] = useState((widgetConfig?.color as string) ?? "#2563eb");
  const [welcomeMessage, setWelcomeMessage] = useState((widgetConfig?.welcomeMessage as string) ?? "");
  const initialMode = normalizeWidgetMode(widgetConfig?.mode as string) as Mode;
  const initialProvider = (widgetConfig?.provider as Provider) ?? "groq";
  const initialType = modeToTemplateType(initialMode);
  const storedTemplate = widgetConfig?.template as string | undefined;
  const initialTemplate = storedTemplate
    ? normalizeWidgetTemplate(storedTemplate, initialMode)
    : defaultTemplateFor(initialMode);

  const [provider, setProvider] = useState<Provider>(initialProvider);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [template, setTemplate] = useState(initialTemplate);
  const [templateConfirmed, setTemplateConfirmed] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const templateSelections = useRef<Record<string, string>>({
    [initialType]: initialTemplate,
  });
  const confirmedTypes = useRef<Set<string>>(new Set([initialType]));
  const [logoUrl, setLogoUrl] = useState(((widgetConfig?.brand as Record<string, unknown>)?.logoUrl as string) ?? "");
  const [showBranding, setShowBranding] = useState(widgetConfig?.showBranding !== false);
  const [fontFamily, setFontFamily] = useState((widgetConfig?.fontFamily as string) ?? "");
  const [headerTitle, setHeaderTitle] = useState((widgetConfig?.headerTitle as string) ?? "");
  const [headerSubtitle, setHeaderSubtitle] = useState((widgetConfig?.headerSubtitle as string) ?? "");
  const [avatarUrl, setAvatarUrl] = useState((widgetConfig?.avatarUrl as string) ?? "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);
  const [showUnsaved, setShowUnsaved] = useState(false);

  type Objective = ProjectObjective;

  const [objective, setObjective] = useState<Objective>(
    (widgetConfig?.objective as Objective) ?? "lead-generation"
  );
  const [selectedObjectives, setSelectedObjectives] = useState<BotObjective[]>(
    (widgetConfig?.objectives as BotObjective[] | undefined) ??
    PREDEFINED_OBJECTIVES["lead-generation"]
  );
  const [customQuestionInput, setCustomQuestionInput] = useState("");

  useEffect(() => {
    setSelectedObjectives(PREDEFINED_OBJECTIVES[objective]);
  }, [objective]);

  useEffect(() => {
    const fromUrl = tabFromParam(searchParams.get("tab"));
    setActiveTab((current) => (current === fromUrl ? current : fromUrl));
  }, [searchParams]);

  function applyTab(next: Tab) {
    setActiveTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const baselineRef = useRef<string>("");
  const savedSnapshotRef = useRef<null | {
    botName: string;
    color: string;
    welcomeMessage: string;
    provider: Provider;
    mode: Mode;
    template: string;
    objective: Objective;
    selectedObjectives: BotObjective[];
    logoUrl: string;
    showBranding: boolean;
    fontFamily: string;
    headerTitle: string;
    headerSubtitle: string;
    avatarUrl: string;
  }>(null);
  const stateRef = useRef({
    botName,
    color,
    welcomeMessage,
    provider,
    mode,
    template,
    objective,
    selectedObjectives,
    logoUrl,
    showBranding,
    fontFamily,
    headerTitle,
    headerSubtitle,
    avatarUrl,
  });
  stateRef.current = {
    botName,
    color,
    welcomeMessage,
    provider,
    mode,
    template,
    objective,
    selectedObjectives,
    logoUrl,
    showBranding,
    fontFamily,
    headerTitle,
    headerSubtitle,
    avatarUrl,
  };
  const currentSnapshot = () => JSON.stringify(stateRef.current);
  const syncBaseline = () => {
    baselineRef.current = currentSnapshot();
  };
  const isDirty = baselineRef.current !== "" && baselineRef.current !== currentSnapshot();

  useEffect(() => {
    const id = setTimeout(syncBaseline, 0);
    return () => clearTimeout(id);
  }, []);

  const isProviderGroq = provider === "groq";
  const templateType = modeToTemplateType(mode);

  function selectTemplate(value: string) {
    setTemplate(value);
    setTemplateConfirmed(true);
    confirmedTypes.current.add(templateType);
    templateSelections.current[templateType] = value;
    setPreviewTemplate(null);
  }

  useEffect(() => {
    if (isProviderGroq && mode !== "chat") {
      setMode("chat");
    }
  }, [provider]);

  const validModes = useMemo(
    () => PROVIDERS.find((p) => p.value === provider)?.supportedModes ?? [],
    [provider],
  );

  const validTemplates = useMemo(
    () => TEMPLATES.filter((t) => t.type === templateType),
    [templateType],
  );

  const previewDef = previewTemplate
    ? TEMPLATES.find((t) => t.value === previewTemplate) ?? null
    : null;

  useEffect(() => {
    const classicId = `${templateType}-classic`;
    const saved = templateSelections.current[templateType];
    const isValid = Boolean(saved && validTemplates.some((t) => t.value === saved));
    const wasConfirmed = confirmedTypes.current.has(templateType);

    if (isValid && wasConfirmed) {
      setTemplate(saved!);
      setTemplateConfirmed(true);
      return;
    }

    const fallback =
      validTemplates.find((t) => t.value === classicId && !t.comingSoon)?.value ??
      validTemplates.find((t) => !t.comingSoon)?.value ??
      classicId;

    setTemplate(fallback);
    templateSelections.current[templateType] = fallback;
    confirmedTypes.current.add(templateType);
    setTemplateConfirmed(true);
  }, [templateType, validTemplates]);

  async function performSave(): Promise<boolean> {
    if (!templateConfirmed) {
      setToast("Please select a template before saving");
      return false;
    }
    setSaving(true);
    setToast(null);
    try {
      const brandPayload = brandData
        ? { ...brandData, logoUrl: logoUrl || null }
        : undefined;

      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgetConfig: {
            botName,
            color,
            welcomeMessage,
            provider,
            mode: normalizeWidgetMode(mode),
            template,
            objective,
            objectives: selectedObjectives,
            showBranding,
            fontFamily,
            headerTitle,
            headerSubtitle,
            avatarUrl,
            ...(brandPayload !== undefined ? { brand: brandPayload } : {}),
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setToast("Settings saved successfully");
        setTimeout(() => setToast(null), 3000);
        savedSnapshotRef.current = stateRef.current;
        syncBaseline();
        return true;
      } else {
        setToast(json.error ?? "Failed to save settings");
        return false;
      }
    } catch {
      setToast("Failed to save settings");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await performSave();
  }

  function requestTabChange(next: Tab) {
    if (next === activeTab) return;
    if (isDirty) {
      setPendingTab(next);
      setShowUnsaved(true);
    } else {
      applyTab(next);
    }
  }

  function resetForm() {
    const snapshot = savedSnapshotRef.current;
    const botName =
      snapshot?.botName ?? ((widgetConfig?.botName as string) ?? "LeadPilot");
    const color = snapshot?.color ?? ((widgetConfig?.color as string) ?? "#2563eb");
    const welcomeMessage =
      snapshot?.welcomeMessage ?? ((widgetConfig?.welcomeMessage as string) ?? "");
    const provider = snapshot?.provider ?? ((widgetConfig?.provider as Provider) ?? "groq");
    const mode =
      snapshot?.mode ?? (normalizeWidgetMode(widgetConfig?.mode as string) as Mode);
    const objective =
      snapshot?.objective ?? ((widgetConfig?.objective as Objective) ?? "lead-generation");
    const selectedObjectives =
      snapshot?.selectedObjectives ??
      ((widgetConfig?.objectives as BotObjective[] | undefined) ??
        PREDEFINED_OBJECTIVES[objective]);
    const logoUrl =
      snapshot?.logoUrl ??
      (((widgetConfig?.brand as Record<string, unknown>)?.logoUrl as string) ?? "");
    const showBranding = snapshot?.showBranding ?? (widgetConfig?.showBranding !== false);
    const fontFamily = snapshot?.fontFamily ?? ((widgetConfig?.fontFamily as string) ?? "");
    const headerTitle = snapshot?.headerTitle ?? ((widgetConfig?.headerTitle as string) ?? "");
    const headerSubtitle = snapshot?.headerSubtitle ?? ((widgetConfig?.headerSubtitle as string) ?? "");
    const avatarUrl = snapshot?.avatarUrl ?? ((widgetConfig?.avatarUrl as string) ?? "");
    const template =
      snapshot?.template ??
      (widgetConfig?.template
        ? normalizeWidgetTemplate(widgetConfig.template as string, mode)
        : defaultTemplateFor(mode));

    setBotName(botName);
    setColor(color);
    setWelcomeMessage(welcomeMessage);
    setProvider(provider);
    setMode(mode);
    setTemplate(template);
    setObjective(objective);
    setLogoUrl(logoUrl);
    setShowBranding(showBranding);
    setFontFamily(fontFamily);
    setHeaderTitle(headerTitle);
    setHeaderSubtitle(headerSubtitle);
    setAvatarUrl(avatarUrl);
    setTemplateConfirmed(true);
    templateSelections.current = { [modeToTemplateType(mode)]: template };
    confirmedTypes.current = new Set([modeToTemplateType(mode)]);
    // The [objective] effect re-applies default objectives when objective changes;
    // restore the saved objectives after it runs.
    setTimeout(() => setSelectedObjectives(selectedObjectives), 0);
    // Mark the reverted values as the new baseline immediately so we are no
    // longer considered dirty (the selectedObjectives state settles via the
    // timeout above, but the baseline already reflects the reverted value).
    baselineRef.current = JSON.stringify({
      botName,
      color,
      welcomeMessage,
      provider,
      mode,
      template,
      objective,
      selectedObjectives,
      logoUrl,
      showBranding,
      fontFamily,
      headerTitle,
      headerSubtitle,
      avatarUrl,
    });
  }

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const brandData = useMemo(() => {
    const b = widgetConfig?.brand as Record<string, unknown> | undefined;
    if (!b || (typeof b === "object" && Object.keys(b).length === 0)) return null;
    return {
      colors: (b.colors as string[]) ?? [],
      logoUrl: (b.logoUrl as string | null) ?? null,
      extractedAt: (b.extractedAt as string) ?? undefined,
    };
  }, [widgetConfig]);

  const snippets = snippetPlatforms.map(
    ([label, snippet]) => [label, snippet.replace(/##CLIENT_ID##/g, clientId)] as [string, string],
  );

  // --- Objective helpers -------------------------------------------------
  const isObjectiveEnabled = (target: BotObjective) =>
    selectedObjectives.some((o) => o.objective === target.objective && o.enabled);

  const toggleObjective = (predef: BotObjective) => {
    setSelectedObjectives((prev) => {
      const existing = prev.find((o) => o.objective === predef.objective);
      if (existing) {
        return prev.map((o) =>
          o.objective === predef.objective ? { ...o, enabled: !o.enabled } : o
        );
      }
      return [...prev, { ...predef, enabled: true }];
    });
  };

  const addCustomObjective = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSelectedObjectives((prev) => {
      if (prev.some((o) => o.objective.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [
        ...prev,
        {
          id: `custom_${Date.now().toString(36)}`,
          type: "custom",
          objective: trimmed,
          enabled: true,
          priority: prev.length + 1,
        },
      ];
    });
    setCustomQuestionInput("");
  };

  const activeObjectives = [...selectedObjectives]
    .filter((o) => o.enabled)
    .sort((a, b) => a.priority - b.priority);

  const reorderObjective = (fromIndex: number, toIndex: number) => {
    const list = [...activeObjectives];
    if (toIndex < 0 || toIndex >= list.length) return;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    const order = list.map((o) => o.id);
    setSelectedObjectives((prev) =>
      prev.map((o, i) => ({
        ...o,
        priority: order.indexOf(o.id) === -1 ? o.priority || i + 1 : order.indexOf(o.id) + 1,
      }))
    );
  };

  const removeObjective = (target: BotObjective) => {
    setSelectedObjectives((prev) =>
      target.type === "custom"
        ? prev.filter((o) => o.id !== target.id)
        : prev.map((o) => (o.id === target.id ? { ...o, enabled: false } : o))
    );
  };
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">{projectName}</h1>
        <p className="mt-1 text-slate-600">Manage your project configuration and widget behavior.</p>
      </div>

      <div className="flex gap-1 border-b border-[#E5E7EB]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => requestTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                ? "border-[#7C3AED] text-[#7C3AED]"
                : "border-transparent text-[#6B7280] hover:text-[#111827]"
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "setup" && (
        <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Widget Setup</h2>
            <p className="text-sm text-slate-500">
              Configure your widget&apos;s AI provider, mode, and template.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-base">Choose AI Provider</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PROVIDERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => !item.disabled && setProvider(item.value)}
                  className={cn(
                    "relative rounded-lg border-2 px-4 py-4 text-left transition-colors",
                    item.disabled
                      ? "opacity-50 cursor-not-allowed pointer-events-none"
                      : provider === item.value
                        ? "border-violet-600 bg-[#EDE9FE] ring-1 ring-violet-600"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                  )}
                >
                  {item.disabled && (
                    <div className="absolute inset-0 rounded-lg bg-white/60 flex items-center justify-center z-10">
                      <span className="bg-slate-800 text-white text-xs px-2 py-1 rounded">
                        Coming Soon
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900">{item.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{item.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base">Choose Widget Mode</Label>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((item) => {
                const isDisabled = !validModes.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={mode === item.value}
                    onClick={() => !isDisabled && setMode(item.value)}
                    disabled={isDisabled}
                    className={cn(
                      "rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2",
                      isDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : mode === item.value
                          ? "border-[#7C3AED] bg-[#EDE9FE] text-[#7C3AED]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            {isProviderGroq && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <Mic className="w-3 h-3" />
                Voice modes require LiveKit + OpenAI
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-base">Choose Template</Label>
            <p className="text-xs text-slate-500">
              Classic is selected by default. Hover a template to preview or choose another.
            </p>
            <div className="grid grid-cols-3 gap-4">
              {validTemplates.map((t) => {
                const isSelected = templateConfirmed && template === t.value;
                return (
                  <div
                    key={t.value}
                    className={cn(
                      "group relative rounded-lg border-2 overflow-hidden transition-colors",
                      t.comingSoon && "opacity-60",
                      isSelected
                        ? "border-violet-600 ring-1 ring-violet-600"
                        : "border-slate-200",
                    )}
                  >
                    <div
                      className="relative h-40 bg-slate-50"
                      style={{ "--preview-brand": color } as React.CSSProperties}
                    >
                      <TemplatePreview value={t.value} color={color} />
                      {t.comingSoon && (
                        <div className="absolute top-1 right-1 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-medium z-10">
                          Coming Soon
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-1 left-1 bg-violet-600 text-white rounded-full p-0.5 z-10">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                      {!t.comingSoon && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-slate-900/45 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setPreviewTemplate(t.value)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => selectTemplate(t.value)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Select
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium text-center py-2 text-slate-700">{t.name}</p>
                  </div>
                );
              })}
            </div>
            {!templateConfirmed && (
              <p className="text-xs text-amber-600">Select a template to enable saving.</p>
            )}
          </div>

          {toast && (
            <p
              className={`text-sm ${toast.includes("Failed") || toast.includes("select") ? "text-red-600" : "text-emerald-600"}`}
            >
              {toast}
            </p>
          )}

          <Button type="submit" disabled={saving || !templateConfirmed}>
            {saving ? "Saving..." : "Save Setup"}
          </Button>
        </form>
      )}

      <CommonDialog
        open={!!previewTemplate}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
        size="full"
        title={`${previewDef?.name ?? "Template"} preview`}
        description={previewDef?.value}
        footer={
          previewTemplate && !previewDef?.comingSoon ? (
            <Button type="button" onClick={() => selectTemplate(previewTemplate)}>
              Select template
            </Button>
          ) : undefined
        }
      >
        {previewTemplate && (
          <FullWidgetPreview
            value={previewTemplate}
            color={color}
            botName={botName}
            welcomeMessage={welcomeMessage || "Hi! How can I help you Today?"}
          />
        )}
      </CommonDialog>

      <UnsavedChangesPopup
        open={showUnsaved}
        saving={saving}
        onSave={async () => {
          const ok = await performSave();
          if (ok) {
            setShowUnsaved(false);
            if (pendingTab) applyTab(pendingTab);
            setPendingTab(null);
          }
        }}
        onDiscard={() => {
          resetForm();
          setShowUnsaved(false);
          if (pendingTab) applyTab(pendingTab);
          setPendingTab(null);
        }}
        onCancel={() => {
          setShowUnsaved(false);
          setPendingTab(null);
        }}
      />


      {activeTab === "objective" && (
        <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Bot Objective</h2>
            <p className="text-sm text-slate-500">
              Define what your bot is here to do and which objectives it should naturally achieve.
            </p>
          </div>

          {/* Section 1 - Objective Selector */}
          <div className="space-y-3">
            <Label className="text-base">What is the main goal of your bot?</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  value: "lead-generation" as Objective,
                  label: "Lead Generation",
                  description: "Capture contact info and qualify prospects",
                  icon: "🎯",
                },
                {
                  value: "customer-support" as Objective,
                  label: "Customer Support",
                  description: "Help users resolve issues and answer queries",
                  icon: "🛠️",
                },
                {
                  value: "general-information" as Objective,
                  label: "General Information",
                  description: "Answer questions about your business",
                  icon: "💡",
                },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setObjective(item.value)}
                  className={cn(
                    "rounded-lg border-2 px-4 py-4 text-left transition-colors",
                    objective === item.value
                      ? "border-violet-600 bg-[#EDE9FE] ring-1 ring-violet-600"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  )}
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="font-semibold text-slate-900 text-sm mb-1">{item.label}</div>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Section 2 - Conversation Objectives */}
          <div className="space-y-3">
            <div>
              <Label className="text-base">Conversation Objectives</Label>
              <p className="text-xs text-slate-500 mt-0.5">
                Select the information LeadPilot should naturally learn while helping visitors.
                LeadPilot will decide the best time and wording automatically.
              </p>
            </div>
            <div className="space-y-2">
              {PREDEFINED_OBJECTIVES[objective].map((predef) => {
                const isChecked = isObjectiveEnabled(predef);
                return (
                  <label
                    key={predef.objective}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors",
                      isChecked
                        ? "border-violet-300 bg-violet-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleObjective(predef)}
                      className="accent-violet-600 w-4 h-4 rounded"
                    />
                    <span className="text-sm text-slate-700">{predef.objective}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 3 - Custom Objectives */}
          <div className="space-y-3">
            <Label className="text-base">Custom Objective</Label>
            <p className="text-xs text-slate-500 mt-0.5">
              Tell LeadPilot what additional information it should naturally learn during
              conversations. These are goals for the AI, not literal questions. Examples: Understand
              whether the visitor already uses another CRM. Determine how many employees the company
              has. Learn which software the visitor currently uses.
            </p>
            <div className="flex gap-2">
              <Input
                value={customQuestionInput}
                onChange={(e) => setCustomQuestionInput(e.target.value)}
                placeholder="e.g. Understand whether the visitor wants a demo"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomObjective(customQuestionInput);
                  }
                }}
              />
              <Button
                type="button"
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                onClick={() => addCustomObjective(customQuestionInput)}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Section 4 - Objective priority */}
          {activeObjectives.length > 0 && (
            <div className="space-y-3">
              <div>
                <Label className="text-base">Objective priority</Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  LeadPilot treats these as goals, not a script. Lower items are lower priority.
                  Click the arrows to reorder, click × to remove.
                </p>
              </div>
              <div className="space-y-2">
                {activeObjectives.map((obj, index) => (
                  <div
                    key={obj.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
                  >
                    <span className="text-xs font-mono text-slate-400 w-5 text-center">{index + 1}</span>
                    <span className="flex-1 text-sm text-slate-700">{obj.objective}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => reorderObjective(index, index - 1)}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Move up"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 9V3M3 6l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                      <button
                        type="button"
                        disabled={index === activeObjectives.length - 1}
                        onClick={() => reorderObjective(index, index + 1)}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Move down"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 3v6M9 6L6 9 3 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeObjective(obj)}
                        className="p-1 rounded hover:bg-red-100 hover:text-red-600 transition-colors text-slate-400"
                        aria-label="Remove objective"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {toast && (
            <p className={`text-sm ${toast.includes("Failed") ? "text-red-600" : "text-emerald-600"}`}>
              {toast}
            </p>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Objective"}
          </Button>
        </form>
      )}

      {activeTab === "appearance" && (
        <form onSubmit={handleSave} className="space-y-7 rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
            <p className="text-sm text-slate-500">Customize how the widget looks on your site.</p>
          </div>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Basic</h3>
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="botName">Bot Name</Label>
                <Input
                  id="botName"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="Ava"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="color">Brand Color</Label>
                <ColorPicker value={color} onChange={setColor} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="welcomeMessage">Welcome Message</Label>
                <textarea
                  id="welcomeMessage"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#EDE9FE]"
                  placeholder="Hi! How can I help you today?"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Widget Header</h3>
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="headerTitle">Header Title</Label>
                <Input
                  id="headerTitle"
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                  placeholder={botName || "LeadPilot"}
                />
                <p className="text-xs text-slate-500">Shown in the widget header. Falls back to Bot Name.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="headerSubtitle">Header Subtitle</Label>
                <Input
                  id="headerSubtitle"
                  value={headerSubtitle}
                  onChange={(e) => setHeaderSubtitle(e.target.value)}
                  placeholder="Online · Typically replies instantly"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Style</h3>
            <div className="grid grid-cols-1 items-start gap-x-5 gap-y-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fontFamily">Font Family</Label>
                <select
                  id="fontFamily"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#7C3AED] focus:ring-2 focus:ring-[#EDE9FE]"
                >
                  {FONT_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-slate-800">Show “Powered by LeadPilot”</Label>
                  <p className="text-xs text-slate-500">Turn off to white-label.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showBranding}
                  onClick={() => setShowBranding((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${showBranding ? "bg-[#7C3AED]" : "bg-slate-300"
                    }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${showBranding ? "translate-x-5" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Widget Avatar / Logo</h3>
              <p className="mt-1 text-xs text-slate-500">
                Upload an image to show in the widget header instead of the bot initials.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Widget avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-slate-400">None</span>
                )}
              </div>
              <div className="flex min-w-[200px] flex-1 flex-col gap-2">
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://…/logo.png or paste image URL"
                  className="text-sm"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="avatar-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setAvatarUrl(reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                  <Button
                    type="button"
                    className="inline-flex items-center gap-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    onClick={() => document.getElementById("avatar-upload")?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Upload image
                  </Button>
                  {avatarUrl && (
                    <Button
                      type="button"
                      className="bg-transparent text-red-600 hover:bg-red-50"
                      onClick={() => setAvatarUrl("")}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <BrandSection
            brand={brandData}
            color={color}
            onColorChange={setColor}
            onLogoUrlChange={(url) => setLogoUrl(url)}
          />

          {toast && (
            <p
              className={`text-sm ${toast.includes("Failed") ? "text-red-600" : "text-emerald-600"}`}
            >
              {toast}
            </p>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      )}

      {activeTab === "snippet" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Embed Snippet</h2>
            <p className="text-sm text-slate-500">
              Use the snippet that matches your site. Each one points at{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{clientId}</code>.
            </p>
          </div>

          <div className="space-y-4">
            {snippets.map(([label, snippet]) => (
              <section key={label} className="rounded-lg border bg-white p-5">
                <h3 className="font-semibold text-sm">{label}</h3>
                <div className="relative mt-3">
                  <pre className="overflow-x-auto rounded-md bg-slate-950 p-4 text-sm text-slate-50">
                    <code>{snippet}</code>
                  </pre>
                  <CopySnippet code={snippet} />
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      {activeTab === "traffic" && <TrafficTab projectId={projectId} apiUrl={apiUrl} analytics={analytics} trafficConfig={trafficConfig} />}
    </div>
  );
}
