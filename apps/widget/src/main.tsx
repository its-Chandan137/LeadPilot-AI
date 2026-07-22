import { Room, RoomEvent, createLocalAudioTrack } from "livekit-client";
import React, { Component, type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  getWidgetModeFlags,
  isDockStyleTemplate,
  isFusionTemplate,
  normalizeWidgetMode,
  type ApiResponse,
  type ChatResponse,
  type ConversationStartResponse,
  type WidgetConfig,
  type WidgetConfigResponse,
  type WidgetMode,
} from "@leadpilot/types";

// Additive: the config endpoint may signal that this visitor's referrer domain
// is blocked by the project admin. Older/cached widget builds ignore `blocked`
// and only read `config`, so this stays a non-breaking extension.
type WidgetConfigResponseWithBlock = WidgetConfigResponse & { blocked?: boolean };
import { BlastWidget, getBlastStyles } from "./dock-style";
import { FusionTemplate } from "./templates/fusion";

type MountOptions = {
  root: ShadowRoot | HTMLElement;
  clientId: string;
  apiUrl: string;
};

type MessageStatus = "sending" | "sent" | "failed";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  status?: MessageStatus;
};

type WidgetStatus = "collapsed" | "open" | "loading" | "error";

type ErrorType = "config" | "conversation" | "send" | null;

const roots = new WeakMap<ShadowRoot | HTMLElement, Root>();

declare global {
  interface Window {
    __LEADPILOT_CONFIG__?: {
      clientId: string;
      apiUrl: string;
    };
    LeadPilotWidget?: {
      mount(options: MountOptions): void;
    };
  }
}

const FALLBACK_CONFIG = {
  clientId: "demo-client-id",
  apiUrl: window?.location?.origin ?? "http://localhost:3000"
};

const SUGGESTIONS = [
  "Book an appointment",
  "Business hours",
  "Pricing",
  "Contact support",
];

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatTimeFull(date: Date) {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return formatTime(date);
  return date.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + formatTime(date);
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div className="lp-error">LeadPilot widget could not load.</div>;
    }
    return this.props.children;
  }
}

function createVisitorId() {
  const storageKey = "leadpilot_visitor_id";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const visitorId = crypto.randomUUID();
  window.localStorage.setItem(storageKey, visitorId);
  return visitorId;
}

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!payload.success) throw new Error(payload.error);
  return payload.data;
}

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 150) + "px";
}

const DEFAULT_FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function resolveFont(font?: string): string {
  return font && font.trim() ? font : DEFAULT_FONT;
}

function styles(color: string, font: string) {
  const fontFamily = resolveFont(font);
  return `
    :host { all: initial; }
    .lp-widget, .lp-widget * { box-sizing: border-box; font-family: ${fontFamily}; }
    .lp-widget { position: fixed; z-index: 2147483647; right: 20px; bottom: 20px; color: #0f172a; }

    .lp-launcher { width: 58px; height: 58px; border: 0; border-radius: 999px; background: ${color}; color: #fff; cursor: pointer; box-shadow: 0 18px 42px rgba(15, 23, 42, 0.24); display: grid; place-items: center; transition: transform 160ms ease, box-shadow 160ms ease; }
    .lp-launcher:hover { transform: translateY(-2px); box-shadow: 0 22px 50px rgba(15, 23, 42, 0.28); }
    .lp-launcher:focus-visible { outline: 3px solid ${color}; outline-offset: 3px; }

    .lp-panel { width: min(440px, calc(100vw - 32px)); height: min(620px, calc(100vh - 32px)); display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(15, 23, 42, 0.12); border-radius: 18px; background: #fff; box-shadow: 0 24px 80px rgba(15, 23, 42, 0.22); animation: lp-pop 180ms ease-out; }

    .lp-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px; background: ${color}; color: #fff; flex-shrink: 0; }
    .lp-identity { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .lp-avatar { width: 40px; height: 40px; flex: 0 0 auto; border-radius: 999px; background: rgba(255,255,255,0.2); display: grid; place-items: center; font-size: 18px; font-weight: 700; }
    .lp-name { margin: 0; font-size: 15px; font-weight: 700; line-height: 1.2; }
    .lp-subtitle { margin: 2px 0 0; font-size: 11px; opacity: 0.85; line-height: 1.2; }
    .lp-online { display: flex; align-items: center; gap: 5px; }
    .lp-dot { width: 7px; height: 7px; border-radius: 999px; background: #34d399; flex-shrink: 0; }
    .lp-close { border: 0; background: rgba(255,255,255,0.16); color: #fff; border-radius: 999px; width: 34px; height: 34px; cursor: pointer; display: grid; place-items: center; transition: background 150ms; flex-shrink: 0; }
    .lp-close:hover { background: rgba(255,255,255,0.28); }
    .lp-close:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

    .lp-messages { flex: 1; overflow-y: auto; padding: 16px; background: #f8fafc; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; scrollbar-width: none; -ms-overflow-style: none; }
    .lp-messages::-webkit-scrollbar { width: 0; height: 0; display: none; }
    .lp-message-wrap { animation: lp-fade-in 250ms ease-out both; }
    .lp-bubble { max-width: 82%; margin: 0 0 10px; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5; overflow-wrap: anywhere; white-space: pre-wrap; }
    .lp-user { margin-left: auto; background: ${color}; color: #fff; border-bottom-right-radius: 4px; }
    .lp-user.lp-failed { opacity: 0.7; }
    .lp-assistant { margin-right: auto; background: #fff; color: #0f172a; border: 1px solid rgba(15, 23, 42, 0.08); border-bottom-left-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .lp-time { font-size: 10px; color: #94a3b8; margin-top: 2px; line-height: 1; letter-spacing: 0.01em; }
    .lp-user .lp-time { text-align: right; }
    .lp-assistant .lp-time { text-align: left; }

    .lp-typing-bubble { margin-right: auto; background: #fff; border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 14px; border-bottom-left-radius: 4px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 10px; max-width: 82%; }
    .lp-typing-row { display: flex; align-items: center; gap: 8px; }
    .lp-typing-text { font-size: 13px; color: #64748b; }
    .lp-dots { display: flex; align-items: center; gap: 3px; }
    .lp-dots span { width: 6px; height: 6px; border-radius: 999px; background: #94a3b8; animation: lp-blink 900ms infinite ease-in-out; }
    .lp-dots span:nth-child(2) { animation-delay: 120ms; }
    .lp-dots span:nth-child(3) { animation-delay: 240ms; }

    .lp-welcome { text-align: center; padding: 8px 0 4px; }
    .lp-welcome-avatar { width: 56px; height: 56px; border-radius: 999px; background: ${color}; color: #fff; display: grid; place-items: center; font-size: 24px; font-weight: 700; margin: 0 auto 12px; box-shadow: 0 4px 12px color-mix(in srgb, ${color} 30%, transparent); }
    .lp-welcome-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
    .lp-welcome-desc { font-size: 13px; color: #64748b; margin: 0; line-height: 1.4; }
    .lp-suggestions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 12px; }
    .lp-suggestion { padding: 8px 16px; border-radius: 999px; border: 1px solid #cbd5e1; background: #fff; font-size: 13px; cursor: pointer; transition: background 150ms, border-color 150ms, box-shadow 150ms; color: #0f172a; line-height: 1.3; }
    .lp-suggestion:hover { background: #f1f5f9; border-color: #94a3b8; }
    .lp-suggestion:focus-visible { outline: 2px solid ${color}; outline-offset: 2px; }
    .lp-suggestion:active { background: #e2e8f0; }

    .lp-form { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid rgba(15, 23, 42, 0.08); background: #fff; flex-shrink: 0; align-items: flex-end; }
    .lp-input-wrap { flex: 1; display: flex; min-width: 0; }
    .lp-textarea { width: 100%; border: 1px solid #cbd5e1; border-radius: 12px; padding: 10px 12px; font-size: 14px; outline: none; resize: none; font-family: inherit; line-height: 1.45; max-height: 150px; min-height: 42px; transition: border-color 150ms, box-shadow 150ms; }
    .lp-textarea:focus { border-color: ${color}; box-shadow: 0 0 0 3px color-mix(in srgb, ${color} 18%, transparent); }
    .lp-textarea::placeholder { color: #94a3b8; }
    .lp-textarea:disabled { background: #f8fafc; cursor: not-allowed; }
    .lp-send { border: 0; border-radius: 12px; background: ${color}; color: #fff; min-width: 46px; height: 42px; padding: 0 16px; font-weight: 600; font-size: 14px; cursor: pointer; display: grid; place-items: center; transition: opacity 150ms, transform 100ms; flex-shrink: 0; }
    .lp-send:hover:not(:disabled) { opacity: 0.92; }
    .lp-send:active:not(:disabled) { transform: scale(0.97); }
    .lp-send:disabled { cursor: not-allowed; opacity: 0.5; }
    .lp-send:focus-visible { outline: 2px solid ${color}; outline-offset: 2px; }
    .lp-send-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 999px; animation: lp-spin 600ms linear infinite; }

    .lp-footer { padding: 0 16px 8px; background: #fff; text-align: center; color: #94a3b8; font-size: 10px; flex-shrink: 0; letter-spacing: 0.02em; }

    .lp-mic-wrap { position: relative; flex-shrink: 0; }
    .lp-mic { border: 0; border-radius: 12px; background: #e5e7eb; color: #9ca3af; min-width: 46px; height: 42px; padding: 0 14px; cursor: not-allowed; opacity: 0.5; display: grid; place-items: center; transition: background 150ms; flex-shrink: 0; }
    .lp-mic:focus-visible { outline: 2px solid ${color}; outline-offset: 2px; }
    .lp-mic-tooltip { position: absolute; bottom: calc(100% + 6px); right: 0; background: #374151; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 11px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 150ms; }
    .lp-mic-wrap:hover .lp-mic-tooltip { opacity: 1; }
    .lp-mic svg { width: 18px; height: 18px; }
    .lp-form-voice { display: flex; align-items: center; justify-content: center; padding: 16px; background: #fff; flex-shrink: 0; }

    .lp-voice-transcript { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; background: #f8fafc; border-top: 1px solid rgba(15,23,42,0.08); }
    .lp-vt-line { font-size: 13px; line-height: 1.45; color: #334155; word-break: break-word; }
    .lp-vt-role { font-weight: 700; }
    .lp-vt-user .lp-vt-role { color: #2563eb; }
    .lp-vt-assistant .lp-vt-role { color: #0f766e; }
    .lp-vt-pending { opacity: 0.7; }
    .lp-vt-caret { animation: lp-blink 1s step-end infinite; }
    @keyframes lp-blink { 50% { opacity: 0; } }

    .lp-loading { flex: 1; display: flex; flex-direction: column; gap: 12px; padding: 16px; background: #f8fafc; }
    .lp-loading-row { display: flex; }
    .lp-loading-row-right { justify-content: flex-end; }
    .lp-loading-shape { height: 36px; border-radius: 14px; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: lp-shimmer 1500ms ease infinite; }
    .lp-loading-shape-sm { width: 55%; }
    .lp-loading-shape-lg { width: 75%; }
    .lp-loading-shape-md { width: 45%; }

    @keyframes lp-pop { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes lp-blink { 0%, 80%, 100% { opacity: 0.35; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }
    @keyframes lp-spin { to { transform: rotate(360deg); } }
    @keyframes lp-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes lp-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    @media (max-width: 520px) {
      .lp-widget { right: 10px; bottom: 10px; }
      .lp-panel { width: 100%; height: 100%; border-radius: 0; border: none; }
      .lp-header { padding: 12px 16px; padding-top: calc(12px + env(safe-area-inset-top, 0px)); }
      .lp-close { width: 40px; height: 40px; }
      .lp-form { padding: 8px 12px; padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px)); }
      .lp-suggestion { padding: 10px 18px; font-size: 14px; }
      .lp-textarea { min-height: 44px; }
      .lp-send { min-width: 48px; height: 44px; }
    }
  `;
}

function LoadingSkeleton() {
  return (
    <div className="lp-loading">
      <div className="lp-loading-row lp-loading-row-right">
        <div className="lp-loading-shape lp-loading-shape-sm" />
      </div>
      <div className="lp-loading-row">
        <div className="lp-loading-shape lp-loading-shape-lg" />
      </div>
      <div className="lp-loading-row lp-loading-row-right">
        <div className="lp-loading-shape lp-loading-shape-sm" />
      </div>
      <div className="lp-loading-row">
        <div className="lp-loading-shape lp-loading-shape-md" />
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="lp-typing-bubble" aria-label="AI is typing" role="status">
      <div className="lp-typing-row">
        <span className="lp-typing-text">AI is typing</span>
        <span className="lp-dots" aria-hidden="true">
          <span /><span /><span />
        </span>
      </div>
    </div>
  );
}

function Widget({ clientId, apiUrl }: { clientId: string; apiUrl: string }) {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [status, setStatus] = useState<WidgetStatus>("collapsed");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [retryContent, setRetryContent] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);

  const [voiceState, setVoiceState] = useState<"idle" | "connecting" | "active" | "ending">("idle");
  const [room, setRoom] = useState<Room | null>(null);
  // Interim user transcript shown during active voice call (replaced with final ChatMessage on recognition complete).
  const [interimText, setInterimText] = useState("");
  // True while the agent is processing a reply (between final user transcript and assistant reply).
  const [voiceThinking, setVoiceThinking] = useState(false);
  // Track the currently playing audio source so we can interrupt it if a new
  // utterance arrives before the previous one finishes, or on call end.
  let currentAudioSource: AudioBufferSourceNode | null = null;

  const visitorId = useMemo(createVisitorId, []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  function getWelcomeMessages(cfg: WidgetConfig): ChatMessage[] {
    if (normalizeWidgetMode(cfg.mode) === "voice") return [];
    return [
      {
        id: "welcome",
        role: "assistant",
        content: cfg.welcomeMessage || "Hi! How can I help you Today?",
        createdAt: new Date(),
      },
    ];
  }

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("clientId", clientId);
    const ref = typeof document !== "undefined" ? document.referrer : "";
    const pagePath = typeof window !== "undefined" ? window.location.pathname : "";
    if (ref) params.set("ref", ref);
    if (pagePath) params.set("path", pagePath);
    params.set("vid", visitorId);

    requestJson<WidgetConfigResponseWithBlock>(`${apiUrl}/api/widget/config?${params.toString()}`)
      .then((data) => {
        if (data.blocked) {
          // Referrer domain is blocked by the project admin — do not mount.
          setConfigLoading(false);
          return;
        }
        setConfig(data.config);
        setConfigLoading(false);
        setMessages(getWelcomeMessages(data.config));
      })
      .catch((caught: unknown) => {
        setConfigLoading(false);
        setError(caught instanceof Error ? caught.message : "Unable to load widget");
        setErrorType("config");
        setStatus("error");
      });
  }, [apiUrl, clientId, visitorId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status, configLoading]);

  useEffect(() => {
    if (status === "open" && textareaRef.current && normalizeWidgetMode(config?.mode) !== "voice") {
      textareaRef.current.focus();
    }
  }, [status, conversationId, config?.mode]);

  async function openWidget() {
    setStatus("open");
    if (!config) return;
    if (normalizeWidgetMode(config.mode) === "voice") return;
    if (conversationId) return;

    try {
      const data = await requestJson<ConversationStartResponse>(`${apiUrl}/api/widget/conversation/start`, {
        method: "POST",
        body: JSON.stringify({ clientId, visitorId }),
      });
      setConversationId(data.conversationId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start conversation");
      setErrorType("conversation");
      setStatus("error");
    }
  }

  function getLastUserMessage(): string | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].content;
    }
    return null;
  }

  async function performSend(content: string) {
    if (!content || !conversationId) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed, createdAt: new Date(), status: "sending" };
    setMessages((current) => [...current, userMsg]);
    setDraft("");
    setShowSuggestions(false);
    setStatus("loading");
    setError(null);
    setErrorType(null);

    try {
      const data = await requestJson<ChatResponse>(`${apiUrl}/api/widget/chat`, {
        method: "POST",
        body: JSON.stringify({ clientId, conversationId, visitorId, message: trimmed }),
      });
      setMessages((current) => [
        ...current.map((m) => (m.id === userMsg.id ? { ...m, status: "sent" as const } : m)),
        { id: crypto.randomUUID(), role: "assistant", content: data.reply, createdAt: new Date() },
      ]);
      setStatus("open");
    } catch (caught) {
      setMessages((current) =>
        current.map((m) => (m.id === userMsg.id ? { ...m, status: "failed" as const } : m))
      );
      setRetryContent(trimmed);
      setErrorType("send");
      setStatus("open");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    performSend(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      performSend(draft);
    }
  }

  function handleInputChange(value: string) {
    setDraft(value);
    if (textareaRef.current) autoResize(textareaRef.current);
  }

  function handleSuggestion(text: string) {
    performSend(text);
  }

  async function handleRetry() {
    if (errorType === "config") {
      setConfigLoading(true);
      setError(null);
      setErrorType(null);
      try {
        const params = new URLSearchParams();
        params.set("clientId", clientId);
        const ref = typeof document !== "undefined" ? document.referrer : "";
        const pagePath = typeof window !== "undefined" ? window.location.pathname : "";
        if (ref) params.set("ref", ref);
        if (pagePath) params.set("path", pagePath);
        params.set("vid", visitorId);
        const data = await requestJson<WidgetConfigResponseWithBlock>(`${apiUrl}/api/widget/config?${params.toString()}`);
        if (data.blocked) {
          setConfigLoading(false);
          return;
        }
        setConfig(data.config);
        setConfigLoading(false);
        setMessages(getWelcomeMessages(data.config));
        setStatus("open");
      } catch (caught) {
        setConfigLoading(false);
        setError(caught instanceof Error ? caught.message : "Unable to load widget");
      }
    } else if (errorType === "conversation") {
      setError(null);
      setErrorType(null);
      try {
        const data = await requestJson<ConversationStartResponse>(`${apiUrl}/api/widget/conversation/start`, {
          method: "POST",
          body: JSON.stringify({ clientId, visitorId }),
        });
        setConversationId(data.conversationId);
        setStatus("open");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to start conversation");
      }
    } else if (errorType === "send" && retryContent && conversationId) {
      setError(null);
      setErrorType(null);
      setStatus("loading");

      try {
        const data = await requestJson<ChatResponse>(`${apiUrl}/api/widget/chat`, {
          method: "POST",
          body: JSON.stringify({ clientId, conversationId, visitorId, message: retryContent }),
        });
        setMessages((current) => [
          ...current.filter((m) => m.status !== "failed"),
          { id: crypto.randomUUID(), role: "assistant", content: data.reply, createdAt: new Date() },
        ]);
        setRetryContent(null);
        setStatus("open");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to send message");
      }
    }
  }

  // Shared AudioContext for data-channel TTS playback. Must be created/resumed
  // inside a user gesture (startVoiceCall) or the browser autoplay policy keeps
  // it suspended and all playback is silent.
  const getAudioCtx = () => {
    if (!(window as any).__lpAudioCtx) {
      (window as any).__lpAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return (window as any).__lpAudioCtx as AudioContext;
  };
  const primeAudio = () => {
    const c = getAudioCtx();
    if (c.state === "suspended") c.resume().catch(() => {});
  };

  async function startVoiceCall() {
    if (voiceState !== "idle" || !config) return;
    setVoiceState("connecting");
    primeAudio(); // unlock audio within the click gesture
    try {
      const data = await requestJson<{ token: string; roomName: string }>(`${apiUrl}/api/voice/token`, {
        method: "POST",
        body: JSON.stringify({ clientId, visitorId }),
      });
      const newRoom = new Room();

      // Collect attached remote-audio elements so we can (re)trigger playback
      // after the browser grants autoplay permission via startAudio().
      const remoteAudioEls = new Set<HTMLAudioElement>();

      const attachAndPlay = (track: any, participant: any) => {
        if (track.kind !== "audio") return;
        // STAGE 4
        console.log("[STAGE4] TrackSubscribed", {
          kind: track.kind,
          participant: participant?.identity,
          sid: track.sid,
          mediaStreamTrackReadyState: track.mediaStreamTrack?.readyState,
        });
        const el = track.attach() as HTMLAudioElement;
        // STAGE 5
        console.log("[STAGE5] after track.attach()", {
          element: el.tagName,
          muted: el.muted,
          paused: el.paused,
          volume: el.volume,
          readyState: el.readyState,
          srcObject: el.srcObject ? "set" : "null",
        });
        el.style.position = "fixed";
        el.style.width = "1px";
        el.style.height = "1px";
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        remoteAudioEls.add(el);

        // STAGE 6
        console.log("[STAGE6] play() called");
        el.play()
          .then(() => console.log("[STAGE6] play() RESOLVED"))
          .catch((e) => console.error("[STAGE6] play() REJECTED:", e));
      };

      // STAGE 3
      newRoom.on(RoomEvent.ParticipantConnected, (p: any) => {
        console.log("[STAGE3] ParticipantConnected", { identity: p.identity });
      });
      newRoom.on(RoomEvent.TrackPublished, (pub: any) => {
        console.log("[STAGE3] TrackPublished", {
          identity: pub.participant?.identity,
          kind: pub.kind,
          sid: pub.trackSid,
          source: pub.source,
          isSubscribed: pub.isSubscribed,
        });
      });
      newRoom.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
        console.log("[STAGE3] TrackSubscribed", {
          identity: participant?.identity,
          kind: track.kind,
          sid: track.sid,
          source: _pub?.source,
          isSubscribed: _pub?.isSubscribed,
        });
        attachAndPlay(track, participant);
      });
      newRoom.on(RoomEvent.TrackUnsubscribed, (track: any) => {
        console.log("[STAGE3] TrackUnsubscribed", { sid: track.sid, kind: track.kind });
      });

      // STAGE 7 — poll LiveKit inbound audio stats (bytes/packets received).
      const statTimer = setInterval(async () => {
        try {
          for (const part of newRoom.remoteParticipants.values()) {
            for (const pub of part.getTrackPublications()) {
              if ((pub as any).track?.kind !== "audio") continue;
              const report = await (pub as any).getRTCStatsReport?.();
              if (!report) continue;
              report.forEach((s: any) => {
                if (s.type === "inbound-rtp" && s.kind === "audio") {
                  console.log("[STAGE7] inbound-rtp audio", {
                    bytesReceived: s.bytesReceived,
                    packetsReceived: s.packetsReceived,
                    audioLevel: s.audioLevel,
                    jitter: s.jitter,
                    packetsLost: s.packetsLost,
                    trackIdentifier: s.trackIdentifier,
                  });
                }
              });
            }
          }
        } catch (e) {
          console.error("[STAGE7] stats error:", e);
        }
      }, 2000);

      // The browser may suspend autoplay; re-unlock audio when that happens.
      newRoom.on(RoomEvent.AudioPlaybackStatusChanged, (allowed: boolean) => {
        console.log("[STAGE6] AudioPlaybackStatusChanged", { allowed });
        if (!allowed) {
          newRoom
            .startAudio()
            .then(() => {
              console.log("[STAGE6] startAudio() resolved; replaying attached tracks");
              remoteAudioEls.forEach((el) => {
                if (el.paused) el.play().catch(() => {});
              });
            })
            .catch((e) => console.error("[STAGE6] startAudio() rejected:", e));
        }
      });
      newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log("[STAGE3] Connection state:", state);
      });

      // [DATACH] Receive agent TTS audio (RAW Int16 PCM chunks) over the LiveKit
      // Data channel. Each message: [0x01, seqHi, seqLo, lastFlag, ch] + PCM.
      // All chunks of one utterance are concatenated into a SINGLE AudioBuffer
      // and played ONCE — no per-chunk WAV seams, no overlapping "fast voices".
      // AudioContext is shared + unlocked in startVoiceCall (user gesture).
      const SR = 24000;

      const playBuffer = (pcm: Int16Array) => {
        if (!pcm || pcm.length === 0) {
          console.warn('[DATACH] skipping empty utterance');
          return;
        }
        const ctx = getAudioCtx();
        const play = () => {
          try {
            // Stop any currently playing audio immediately
            if (currentAudioSource) {
              try { currentAudioSource.stop(); } catch {}
              currentAudioSource.disconnect();
              currentAudioSource = null;
            }
            const buf = ctx.createBuffer(1, pcm.length, SR);
            const f32 = new Float32Array(pcm.length);
            for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 32768;
            buf.copyToChannel(f32, 0);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            src.onended = () => { currentAudioSource = null; };
            src.start();
            currentAudioSource = src;
            console.log('[DATACH] played utterance', {
              samples: pcm.length,
              durMs: Math.round((pcm.length / SR) * 1000),
            });
          } catch (e) {
            console.error('[DATACH] playBuffer error:', e);
          }
        };
        if (ctx.state === 'suspended') {
          ctx.resume().then(play).catch((e) => console.error('[DATACH] resume error:', e));
        } else {
          play();
        }
      };

      // Per-utterance state for sequence validation
      let pending: Int16Array[] = [];
      let expectedSeq = 0;
      let utteranceAborted = false;

      newRoom.on(RoomEvent.DataReceived, (payload: any, participant: any, kind?: any, topic?: string) => {
        const t = topic ?? payload?.topic ?? '';
        // Live transcript (user speech + AI reply) streamed as JSON text.
        if (t === 'agent-transcript') {
          try {
            const raw: Uint8Array =
              payload instanceof Uint8Array ? payload :
              payload?.data instanceof Uint8Array ? payload.data :
              new Uint8Array(payload);
            const msg = JSON.parse(new TextDecoder().decode(raw)) as { role: "user" | "assistant"; text: string; final: boolean };
            if (!msg || !msg.role) return;
            if (msg.role === 'user') {
              if (msg.final) {
                setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: msg.text, createdAt: new Date() }]);
                setInterimText('');
                setVoiceThinking(true);
              } else {
                setInterimText(msg.text);
              }
            } else if (msg.final) {
              setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: msg.text, createdAt: new Date() }]);
              setVoiceThinking(false);
            }
          } catch (e) {
            console.error('[TRANSCRIPT] parse error:', e);
          }
          return;
        }
        if (t === 'agent-audio-control') {
          try {
            const raw: Uint8Array =
              payload instanceof Uint8Array ? payload :
              payload?.data instanceof Uint8Array ? payload.data :
              new Uint8Array(payload);
            const msg = JSON.parse(new TextDecoder().decode(raw)) as { stop?: boolean };
            if (msg?.stop) {
              if (currentAudioSource) {
                try { currentAudioSource.stop(); } catch {}
                currentAudioSource.disconnect();
                currentAudioSource = null;
              }
              pending = [];
              expectedSeq = 0;
              utteranceAborted = true;
              console.log('[BARGE-IN] audio stopped by agent signal');
            }
          } catch (e) {
            console.error('[BARGE-IN] parse error:', e);
          }
          return;
        }
        if (t !== 'agent-audio') return;

        try {
          const bytes: Uint8Array =
            payload instanceof Uint8Array ? payload :
            payload?.data instanceof Uint8Array ? payload.data :
            new Uint8Array(payload);

          if (bytes.length < 6 || bytes[0] !== 0x01) return;

          const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
          const seq = dv.getUint16(1, false);
          const isLast = bytes[3] === 1;

          // Sequence gap detected — abort this utterance, wait for next
          if (seq === 0) {
            // New utterance starting — reset state
            pending = [];
            expectedSeq = 0;
            utteranceAborted = false;
          } else if (seq !== expectedSeq) {
            console.warn('[DATACH] sequence gap: expected', expectedSeq, 'got', seq, '— aborting utterance');
            utteranceAborted = true;
          }

          if (utteranceAborted) {
            if (isLast) {
              pending = [];
              expectedSeq = 0;
              utteranceAborted = false;
            }
            return;
          }

          expectedSeq = seq + 1;

          const pcmBytes = bytes.subarray(6);
          const count = Math.floor(pcmBytes.length / 2);
          const pcm = new Int16Array(count);
          const pcmDv = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, count * 2);
          for (let i = 0; i < count; i++) pcm[i] = pcmDv.getInt16(i * 2, true);
          pending.push(pcm);

          if (!isLast) return;

          // All chunks received in order — concatenate and play
          const total = pending.reduce((n, p) => n + p.length, 0);
          if (total === 0) { pending = []; expectedSeq = 0; return; }
          const full = new Int16Array(total);
          let off = 0;
          for (const p of pending) { full.set(p, off); off += p.length; }
          pending = [];
          expectedSeq = 0;
          playBuffer(full);
        } catch (e) {
          console.error('[DATACH] play error:', e);
        }
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        clearInterval(statTimer);
        // Stop any playing audio immediately when call ends
        if (currentAudioSource) {
          try { currentAudioSource.stop(); } catch {}
          currentAudioSource.disconnect();
          currentAudioSource = null;
        }
        pending = [];
        expectedSeq = 0;
        utteranceAborted = true;
        setVoiceState("idle");
        setRoom(null);
      });

      await newRoom.connect(config.livekitUrl || "", data.token);
      console.log("[STAGE3] Connected", { url: config.livekitUrl, room: newRoom.name });
      // Unlock audio playback inside the user-gesture (button click) context.
      await newRoom.startAudio().catch((e) => console.error("[STAGE6] startAudio() rejected:", e));

      const audioTrack = await createLocalAudioTrack();
      await newRoom.localParticipant.publishTrack(audioTrack);
      console.log("[STAGE8] Local mic published (visitor microphone)");

      setRoom(newRoom);
      setVoiceState("active");
    } catch (err) {
      console.error("Voice call failed:", err);
      setVoiceState("idle");
    }
  }

  async function endVoiceCall() {
    if (!room || voiceState !== "active") return;
    setVoiceState("ending");
    // Stop any playing audio immediately when call ends
    if (typeof currentAudioSource !== 'undefined' && currentAudioSource) {
      try { currentAudioSource.stop(); } catch {}
      currentAudioSource = null;
    }
    await room.disconnect();
    setRoom(null);
    setVoiceState("idle");
    setInterimText('');
  }

  const hasUserMessages = messages.some((m) => m.role === "user");
  const showWelcome = messages.length > 0 && !hasUserMessages && showSuggestions && status !== "loading";

  // Wait for /api/widget/config — do not render a default template before success.
  if (configLoading || !config) {
    return null;
  }

  function renderMessages() {
    if (configLoading && status === "open") {
      return <LoadingSkeleton />;
    }
    return (
      <>
        {showWelcome && (
          <div className="lp-welcome lp-message-wrap">
            <div className="lp-welcome-avatar" aria-hidden="true">
              {config?.avatarUrl ? (
                <img
                  src={config.avatarUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "999px" }}
                />
              ) : (
                (config?.botName.charAt(0) ?? "L")
              )}
            </div>
            <p className="lp-welcome-title">Welcome!</p>
            <p className="lp-welcome-desc">How can we help today?</p>
            <div className="lp-suggestions" role="group" aria-label="Suggested questions">
              {SUGGESTIONS.map((text) => (
                <button
                  key={text}
                  className="lp-suggestion"
                  onClick={() => handleSuggestion(text)}
                  type="button"
                  aria-label={`Ask: ${text}`}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className="lp-message-wrap">
            <div className={`lp-bubble lp-${message.role}${message.status === "failed" ? " lp-failed" : ""}`}>
              {message.content}
              <div className="lp-time">{formatTimeFull(message.createdAt ?? new Date())}</div>
            </div>
            {message.status === "failed" && (
              <div className="lp-time" style={{ textAlign: "right", marginTop: -6, marginBottom: 10 }}>
                <button
                  className="lp-banner-retry"
                  onClick={handleRetry}
                  type="button"
                  aria-label="Retry sending message"
                >
                  Failed - Tap to retry
                </button>
              </div>
            )}
          </div>
        ))}
        {status === "loading" && <TypingIndicator />}
        {errorType && status !== "loading" && (
          <div className="lp-banner lp-banner-error" role="alert">
            <span>{error ?? "Something went wrong."}</span>
            <button className="lp-banner-retry" onClick={handleRetry} type="button">
              Retry
            </button>
          </div>
        )}
        {interimText && (
          <div className="lp-message-wrap">
            <div className="lp-bubble lp-user" style={{ opacity: 0.7 }}>
              {interimText}
              <span className="lp-vt-caret">▍</span>
            </div>
          </div>
        )}
        {voiceThinking && <TypingIndicator />}
        {voiceState === "active" && !interimText && !voiceThinking && messages.length === 0 && (
          <div className="lp-vt-line lp-vt-assistant lp-vt-pending" style={{ padding: '12px 14px', fontSize: 13, color: '#64748b' }}>Listening…</div>
        )}
        <div ref={bottomRef} />
      </>
    );
  }

  const mode: WidgetMode = normalizeWidgetMode(config?.mode);
  const { showChat: showChatUI } = getWidgetModeFlags(mode);
  const activeColor = config?.color ?? "#2563eb";
  const template = config?.template ?? "chatonly-classic";
  const isDockStyle = isDockStyleTemplate(template);
  const isFusion=isFusionTemplate(template);
  const canSend = !!(draft.trim() && conversationId && status !== "loading");
  const isFormDisabled = status === "loading" || !conversationId;

  function renderInputArea() {
    const livekitUrl = config?.livekitUrl || "";

    if (mode === "voice") {
      return (
        <div className="lp-form-voice">
          <div className="lp-mic-wrap">
            <button
              onClick={voiceState === "active" ? endVoiceCall : startVoiceCall}
              disabled={voiceState === "connecting" || voiceState === "ending"}
              style={{
                background: voiceState === "active" ? "#EF4444" : activeColor,
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: voiceState === "connecting" || voiceState === "ending" ? "not-allowed" : "pointer",
                opacity: voiceState === "connecting" || voiceState === "ending" ? 0.6 : 1,
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}
              aria-label={voiceState === "active" ? "End voice call" : "Start voice call"}
              title={voiceState === "connecting" ? "Connecting..." : voiceState === "ending" ? "Ending..." : voiceState === "active" ? "Tap to end call" : "Start voice call"}
            >
              {voiceState === "active" ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                  <rect x="3" y="3" width="10" height="10" rx="1" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                  <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-5 0v-4A2.5 2.5 0 0 1 8 1z" />
                  <path d="M4.5 8.5A3.5 3.5 0 0 0 8 12a3.5 3.5 0 0 0 3.5-3.5M8 12v2M6 14h4" />
                </svg>
              )}
            </button>
            <span className="lp-mic-tooltip" aria-hidden="true">
              {voiceState === "active" ? "Tap to end call" : voiceState === "connecting" ? "Connecting..." : "Start voice call"}
            </span>
          </div>
        </div>
      );
    }

    return (
      <form className="lp-form" onSubmit={handleSubmit}>
        <div className="lp-input-wrap">
          <textarea
            ref={textareaRef}
            className="lp-textarea"
            rows={1}
            disabled={isFormDisabled}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={conversationId ? "Type your message..." : "Connecting..."}
            value={draft}
            aria-label="Message input"
          />
        </div>
        <button
          className="lp-send"
          disabled={!canSend}
          type="submit"
          aria-label={status === "loading" ? "Sending message" : "Send message"}
        >
          {status === "loading" ? (
            <span className="lp-send-spinner" aria-hidden="true" />
          ) : (
            <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 20 20" width="18">
              <path d="M2.5 10l15-7.5-7.5 15L8.75 11.25 2.5 10z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            </svg>
          )}
        </button>
        {mode === "both" && (
          <div className="lp-mic-wrap">
            <button
              onClick={voiceState === "active" ? endVoiceCall : startVoiceCall}
              disabled={voiceState === "connecting" || voiceState === "ending"}
              style={{
                background: voiceState === "active" ? "#EF4444" : activeColor,
                border: "none",
                borderRadius: "12px",
                minWidth: "46px",
                height: "42px",
                padding: "0 14px",
                display: "grid",
                placeItems: "center",
                cursor: voiceState === "connecting" || voiceState === "ending" ? "not-allowed" : "pointer",
                opacity: voiceState === "connecting" || voiceState === "ending" ? 0.6 : 1,
                transition: "background 150ms",
                flexShrink: 0,
              }}
              aria-label={voiceState === "active" ? "End voice call" : "Start voice call"}
              title={voiceState === "connecting" ? "Connecting..." : voiceState === "ending" ? "Ending..." : voiceState === "active" ? "Tap to end call" : "Start voice call"}
            >
              {voiceState === "active" ? (
                <svg width="18" height="18" viewBox="0 0 16 16" fill="white">
                  <rect x="3" y="3" width="10" height="10" rx="1" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
            <span className="lp-mic-tooltip" aria-hidden="true">
              {voiceState === "active" ? "Tap to end call" : voiceState === "connecting" ? "Connecting..." : "Start voice call"}
            </span>
          </div>
        )}
      </form>
    );
  }

  if (isDockStyle) {
    return (
      <>
        <style>{getBlastStyles(activeColor, config.fontFamily ?? "")}</style>
        <BlastWidget
          botName={config.botName ?? "LeadPilot"}
          color={activeColor}
          fontFamily={config.fontFamily}
          showBranding={config.showBranding}
          status={status}
          mode={mode}
          messages={messages}
          draft={draft}
          conversationId={conversationId}
          canSend={canSend}
          isFormDisabled={isFormDisabled}
          isLoading={status === "loading"}
          showCtas={showWelcome && showChatUI}
          voiceState={voiceState}
          error={error}
          errorType={errorType}
          textareaRef={textareaRef}
          scrollRef={scrollRef}
          bottomRef={bottomRef}
          onOpen={openWidget}
          onCollapse={() => setStatus("collapsed")}
          onSubmit={handleSubmit}
          onInputChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSuggestion={handleSuggestion}
          onRetry={handleRetry}
          onStartCall={startVoiceCall}
          onEndCall={endVoiceCall}
        />
      </>
    );
  }

  if (isFusion) {
    return (
      <>
        <FusionTemplate
          activeColor={activeColor}
          classicStyles={styles(activeColor, config.fontFamily ?? "")}
          config={config}
          status={status}
          openWidget={openWidget}
          closeWidget={() => setStatus("collapsed")}
          messages={renderMessages()}
          scrollRef={scrollRef}
          footer={{
            mode,
            draft,
            conversationId,
            canSend,
            isFormDisabled,
            isSending: status === "loading",
            voiceState,
            textareaRef,
            onSubmit: handleSubmit,
            onInputChange: handleInputChange,
            onKeyDown: handleKeyDown,
            startVoiceCall,
            endVoiceCall,
          }}
        />
      </>
    );
  }
  return (
    <>
      <style>{styles(activeColor, config.fontFamily ?? "")}</style>
      <div className="lp-widget">
        {status === "collapsed" ? (
          <button aria-label="Open chat" className="lp-launcher" onClick={openWidget} type="button">
            <svg aria-hidden="true" fill="none" height="26" viewBox="0 0 24 24" width="26">
              <path d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v5A3.5 3.5 0 0 1 16.5 15H10l-4.2 4.2A1 1 0 0 1 4 18.5v-12Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
        ) : (
          <section aria-label="LeadPilot chat" className="lp-panel" role="dialog" aria-modal="true">
            <header className="lp-header">
              <div className="lp-identity">
                <div className="lp-avatar" aria-hidden="true">
                  {config.avatarUrl ? (
                    <img
                      src={config.avatarUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "999px" }}
                    />
                  ) : (
                    (config.botName?.charAt(0) ?? "L")
                  )}
                </div>
                <div>
                  <p className="lp-name">{config.headerTitle || config.botName || "LeadPilot"}</p>
                  <p className="lp-subtitle">
                    <span className="lp-online">
                      <span className="lp-dot" aria-hidden="true" />
                      <span>Online</span>
                    </span>
                    <span> · {config.headerSubtitle || "Typically replies instantly"}</span>
                  </p>
                </div>
              </div>
              <button
                aria-label="Close chat"
                className="lp-close"
                onClick={() => setStatus("collapsed")}
                type="button"
              >
                <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </header>
            <div className="lp-messages" ref={scrollRef} role="log" aria-label="Chat messages" aria-live="polite">
              {renderMessages()}
            </div>
            {renderInputArea()}
            {config.showBranding !== false && <footer className="lp-footer">Powered by LeadPilot</footer>}
          </section>
        )}
      </div>
    </>
  );
}

function mountToRoot(options: MountOptions) {
  console.log("[LeadPilot Widget] Mounting...");
  console.log("[LeadPilot Widget] Config received:", { clientId: options.clientId, apiUrl: options.apiUrl });

  const existingRoot = roots.get(options.root);
  existingRoot?.unmount();

  const root = createRoot(options.root);
  roots.set(options.root, root);
  root.render(
    <ErrorBoundary>
      <Widget apiUrl={options.apiUrl.replace(/\/$/, "")} clientId={options.clientId} />
    </ErrorBoundary>
  );

  console.log("[LeadPilot Widget] Mounted successfully");
}

window.LeadPilotWidget = { mount: mountToRoot };

if (typeof document !== "undefined") {
  const cfg = window.__LEADPILOT_CONFIG__;
  const clientId = cfg?.clientId ?? FALLBACK_CONFIG.clientId;
  const apiUrl = (cfg?.apiUrl ?? FALLBACK_CONFIG.apiUrl).replace(/\/$/, "");

  console.log("[LeadPilot Widget] Auto-mounting from __LEADPILOT_CONFIG__");

  const container = document.getElementById("leadpilot-widget-container") ?? document.createElement("div");
  container.id = "leadpilot-widget-container";

  if (!container.parentNode) {
    document.body.appendChild(container);
  }

  const shadow = container.shadowRoot ?? container.attachShadow({ mode: "open" });

  mountToRoot({ root: shadow, clientId, apiUrl });
}
