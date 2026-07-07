"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Props = {
  projectId: string;
  projectName: string;
  widgetConfig: Record<string, unknown>;
};

type Mode = "chat" | "voice" | "both";
type Provider = "groq" | "livekit-openai" | "sarvam";

const MODES: { value: Mode; label: string }[] = [
  { value: "chat", label: "Chat Only" },
  { value: "voice", label: "Voice Only" },
  { value: "both", label: "Chat + Voice" },
];

const PROVIDERS: { value: Provider; name: string; badge: string; badgeColor: string; description: string; capabilities: string; disabled: boolean }[] = [
  {
    value: "groq",
    name: "Groq",
    badge: "Free",
    badgeColor: "bg-green-100 text-green-700",
    description: "Fast responses powered by Llama 3.3",
    capabilities: "💬 Chat only",
    disabled: false
  },
  {
    value: "livekit-openai",
    name: "LiveKit + OpenAI",
    badge: "Paid",
    badgeColor: "bg-blue-100 text-blue-700",
    description: "Realtime voice + chat powered by GPT-4o",
    capabilities: "💬 Chat  🎙️ Voice",
    disabled: false
  },
  {
    value: "sarvam",
    name: "Sarvam.ai",
    badge: "Coming Soon",
    badgeColor: "bg-slate-100 text-slate-600",
    description: "Multilingual Indian language voice AI",
    capabilities: "💬 Chat  🎙️ Voice  🌐 12 Indian languages",
    disabled: true
  }
];

export function SettingsForm({ projectId, projectName, widgetConfig }: Props) {
  const [botName, setBotName] = useState((widgetConfig?.botName as string) ?? "LeadPilot");
  const [color, setColor] = useState((widgetConfig?.color as string) ?? "#2563eb");
  const [welcomeMessage, setWelcomeMessage] = useState((widgetConfig?.welcomeMessage as string) ?? "");
  const [mode, setMode] = useState<Mode>((widgetConfig?.mode as Mode) ?? "chat");
  const [provider, setProvider] = useState<Provider>((widgetConfig?.provider as Provider) ?? "groq");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const isVoiceDisabled = provider === "groq";
  const effectiveMode = isVoiceDisabled && (mode === "voice" || mode === "both") ? "chat" : mode;

  function handleModeSelect(newMode: Mode) {
    if (isVoiceDisabled && newMode !== "chat") return;
    setMode(newMode);
  }

  async function handleSubmit(e: React.FormEvent) {
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
            mode: isVoiceDisabled ? "chat" : mode,
            provider
          }
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">{projectName} Settings</h1>
        <p className="mt-1 text-slate-600">Manage your project configuration and widget behavior.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Widget Configuration</h2>
          <p className="text-sm text-slate-500">Customize how the widget appears and behaves on your site.</p>
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

        <div className="space-y-2">
          <Label>AI Provider</Label>
          <p className="text-sm text-slate-500">Choose which AI powers your widget</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROVIDERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => !item.disabled && setProvider(item.value)}
                className={`rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                  item.disabled
                    ? "opacity-50 cursor-not-allowed pointer-events-none"
                    : provider === item.value
                      ? "border-[#7C3AED] bg-[#EDE9FE]"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900">{item.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.badgeColor}`}>{item.badge}</span>
                </div>
                <p className="text-xs text-slate-600 mb-2">{item.description}</p>
                <p className="text-xs text-slate-500">{item.capabilities}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Widget Mode</Label>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((item) => {
              const disabled = isVoiceDisabled && item.value !== "chat";
              return (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={effectiveMode === item.value}
                  onClick={() => handleModeSelect(item.value)}
                  disabled={disabled}
                  className={`rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 ${
                    disabled
                      ? "opacity-50 cursor-not-allowed"
                      : effectiveMode === item.value
                        ? "border-[#7C3AED] bg-[#EDE9FE] text-[#7C3AED]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          {isVoiceDisabled && (
            <p className="text-xs text-red-500">Voice modes are not available with Groq</p>
          )}
          <p className="text-xs text-slate-400">
            {effectiveMode === "chat" && "Visitors can chat with the bot."}
            {effectiveMode === "voice" && "Voice-only mode is not yet available - placeholder only."}
            {effectiveMode === "both" && "Visitors can chat and use voice (voice is not yet available)."}
          </p>
        </div>

        {toast && (
          <p className={`text-sm ${toast.includes("Failed") ? "text-red-600" : "text-emerald-600"}`}>{toast}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm text-white disabled:opacity-50 transition-opacity"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
