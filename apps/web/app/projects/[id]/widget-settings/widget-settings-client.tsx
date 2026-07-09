"use client";

import { useState, useMemo, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Paintbrush, Code, BarChart3, Cpu, MessageSquare, Mic, Check } from "lucide-react";
import { CopySnippet } from "@/components/ui/copy-snippet";

type Tab = "setup" | "appearance" | "snippet" | "analytics";
type Mode = "chat" | "voice" | "both";
type Provider = "groq" | "livekit-openai" | "sarvam";

type TemplateDef = {
  value: string;
  name: string;
  modes: Mode[];
  comingSoon?: boolean;
};

type Props = {
  projectId: string;
  projectName: string;
  clientId: string;
  widgetConfig: Record<string, unknown>;
  apiUrl: string;
};

const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "setup", label: "Widget Setup", icon: Cpu },
  { key: "appearance", label: "Appearance", icon: Paintbrush },
  { key: "snippet", label: "Embed Snippet", icon: Code },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
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

const TEMPLATES: TemplateDef[] = [
  { value: "classic", name: "Classic", modes: ["chat", "both"] },
  { value: "minimal", name: "Minimal", modes: ["chat"], comingSoon: true },
  { value: "card", name: "Card", modes: ["chat"], comingSoon: true },
  { value: "orb", name: "Orb", modes: ["voice", "both"] },
  { value: "compact-mic", name: "Compact Mic", modes: ["voice"], comingSoon: true },
  { value: "full-panel", name: "Full Panel", modes: ["voice"], comingSoon: true },
  { value: "split", name: "Split", modes: ["both"], comingSoon: true },
  { value: "tabbed", name: "Tabbed", modes: ["both"], comingSoon: true },
  { value: "unified", name: "Unified", modes: ["both", "chat"] },
];

function TemplatePreview({ value, color: propColor }: { value: string; color?: string }) {
  const c = propColor ?? "#7C3AED";

  switch (value) {
    case "classic":
      return (
        <div className="relative w-full h-full bg-slate-50">
          <div className="absolute bottom-1.5 right-1.5 flex flex-col items-end gap-1">
            <div className="w-14 h-9 rounded-lg border bg-white shadow-sm" />
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: c }} />
          </div>
        </div>
      );
    case "minimal":
      return (
        <div className="relative w-full h-full bg-slate-50">
          <div className="absolute bottom-0 left-1 right-1 h-2 rounded-t-sm" style={{ backgroundColor: c }} />
        </div>
      );
    case "card":
      return (
        <div className="relative w-full h-full bg-slate-50 p-2">
          <div className="w-full h-full rounded-md border-2 bg-white shadow-sm" style={{ borderColor: c }} />
        </div>
      );
    case "orb":
      return (
        <div className="relative w-full h-full bg-slate-50 flex items-center justify-center">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: c }}>
            <div className="w-5 h-5 rounded-full bg-white/30" />
          </div>
        </div>
      );
    case "compact-mic":
      return (
        <div className="relative w-full h-full bg-slate-50">
          <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: c }}>
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          </div>
        </div>
      );
    case "full-panel":
      return (
        <div className="relative w-full h-full bg-slate-50 p-2">
          <div className="w-full h-full rounded-md border bg-white p-1.5 flex items-end gap-0.5">
            {[3, 5, 4, 6, 2, 5, 3].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h * 3}px`, backgroundColor: c }} />
            ))}
          </div>
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
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
            </div>
          </div>
        </div>
      );
    case "tabbed":
      return (
        <div className="relative w-full h-full bg-slate-50 p-2">
          <div className="w-full h-full rounded-md border bg-white flex flex-col overflow-hidden">
            <div className="flex border-b text-[6px]">
              <div className="flex-1 py-0.5 text-center font-semibold" style={{ color: c }}>Chat</div>
              <div className="flex-1 py-0.5 text-center text-slate-300">Voice</div>
            </div>
            <div className="flex-1 p-1">
              <div className="w-6 h-3 rounded-sm bg-slate-100" />
            </div>
          </div>
        </div>
      );
    case "unified":
      return (
        <div className="relative w-full h-full bg-slate-50 p-2">
          <div className="w-full h-full rounded-md border bg-white flex flex-col overflow-hidden">
            <div className="flex-1 p-1">
              <div className="w-6 h-4 rounded-sm bg-slate-100" />
            </div>
            <div className="border-t flex items-center p-1 gap-0.5">
              <div className="flex-1 h-1.5 rounded-sm bg-slate-100" />
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
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

export function WidgetSettingsClient({ projectId, projectName, clientId, widgetConfig, apiUrl }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("setup");
  const [botName, setBotName] = useState((widgetConfig?.botName as string) ?? "LeadPilot");
  const [color, setColor] = useState((widgetConfig?.color as string) ?? "#2563eb");
  const [welcomeMessage, setWelcomeMessage] = useState((widgetConfig?.welcomeMessage as string) ?? "");
  const [provider, setProvider] = useState<Provider>((widgetConfig?.provider as Provider) ?? "groq");
  const [mode, setMode] = useState<Mode>((widgetConfig?.mode as Mode) ?? "chat");
  const [template, setTemplate] = useState((widgetConfig?.template as string) ?? "classic");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const isProviderGroq = provider === "groq";

  useEffect(() => {
    if (isProviderGroq && mode !== "chat") {
      setMode("chat");
    }
  }, [provider]);

  const validModes = useMemo(
    () => PROVIDERS.find((p) => p.value === provider)?.supportedModes ?? [],
    [provider],
  );

  const validTemplates = useMemo(() => TEMPLATES.filter((t) => t.modes.includes(mode)), [mode]);

  useEffect(() => {
    const isValid = validTemplates.some((t) => t.value === template);
    if (!isValid && validTemplates.length > 0) {
      setTemplate(validTemplates[0].value);
    }
  }, [mode]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgetConfig: {
            botName,
            color,
            welcomeMessage,
            provider,
            mode,
            template,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setToast("Settings saved successfully");
        setTimeout(() => setToast(null), 3000);
      } else {
        setToast(json.error ?? "Failed to save settings");
      }
    } catch {
      setToast("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const snippets = snippetPlatforms.map(
    ([label, snippet]) => [label, snippet.replace(/##CLIENT_ID##/g, clientId)] as [string, string],
  );

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
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
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
            <div className="grid grid-cols-3 gap-4">
              {validTemplates.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTemplate(t.value)}
                  className={cn(
                    "rounded-lg border-2 overflow-hidden transition-colors",
                    template === t.value
                      ? "border-violet-600 ring-1 ring-violet-600"
                      : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <div className="relative h-40">
                    <TemplatePreview value={t.value} color={color} />
                    {t.comingSoon && (
                      <div className="absolute top-1 right-1 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-medium">
                        Coming Soon
                      </div>
                    )}
                    {template === t.value && (
                      <div className="absolute top-1 left-1 bg-violet-600 text-white rounded-full p-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-center py-2 text-slate-700">{t.name}</p>
                </button>
              ))}
            </div>
          </div>

          {toast && (
            <p
              className={`text-sm ${toast.includes("Failed") ? "text-red-600" : "text-emerald-600"}`}
            >
              {toast}
            </p>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Setup"}
          </Button>
        </form>
      )}

      {activeTab === "appearance" && (
        <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
            <p className="text-sm text-slate-500">Customize how the widget looks on your site.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="botName">Bot Name</Label>
            <Input
              id="botName"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="Ava"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Brand Color</Label>
            <div className="flex items-center gap-3">
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-16 cursor-pointer p-1"
              />
              <span className="text-sm text-slate-600 font-mono">{color}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">Welcome Message</Label>
            <textarea
              id="welcomeMessage"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-[#EDE9FE]"
              placeholder="Hi! How can I help you today?"
            />
          </div>

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

      {activeTab === "analytics" && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center rounded-xl border border-slate-200 bg-white p-12">
          <div className="w-16 h-16 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-[#7C3AED]" />
          </div>
          <h2 className="text-2xl font-bold text-[#111827] mb-2">Coming Soon</h2>
          <p className="text-[#6B7280] max-w-md">
            Detailed analytics with conversation trends, lead conversion rates, and widget performance
            metrics are on their way.
          </p>
        </div>
      )}
    </div>
  );
}
