import React, { Component, type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ApiResponse, ChatResponse, ConversationStartResponse, WidgetConfigResponse, WidgetConfig } from "@leadpilot/types";

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

function styles(color: string) {
  return `
    :host { all: initial; }
    .lp-widget, .lp-widget * { box-sizing: border-box; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .lp-widget { position: fixed; z-index: 2147483647; right: 20px; bottom: 20px; color: #0f172a; }

    .lp-launcher { width: 58px; height: 58px; border: 0; border-radius: 999px; background: ${color}; color: #fff; cursor: pointer; box-shadow: 0 18px 42px rgba(15, 23, 42, 0.24); display: grid; place-items: center; transition: transform 160ms ease, box-shadow 160ms ease; }
    .lp-launcher:hover { transform: translateY(-2px); box-shadow: 0 22px 50px rgba(15, 23, 42, 0.28); }
    .lp-launcher:focus-visible { outline: 3px solid ${color}; outline-offset: 3px; }

    .lp-panel { width: min(380px, calc(100vw - 32px)); height: min(620px, calc(100vh - 32px)); display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(15, 23, 42, 0.12); border-radius: 18px; background: #fff; box-shadow: 0 24px 80px rgba(15, 23, 42, 0.22); animation: lp-pop 180ms ease-out; }

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

    .lp-messages { flex: 1; overflow-y: auto; padding: 16px; background: #f8fafc; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; }
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

  const visitorId = useMemo(createVisitorId, []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestJson<WidgetConfigResponse>(`${apiUrl}/api/widget/config?clientId=${encodeURIComponent(clientId)}`)
      .then((data) => {
        setConfig(data.config);
        setConfigLoading(false);
        setMessages([{ id: "welcome", role: "assistant", content: data.config.welcomeMessage || "Hi! How can I help you Today?", createdAt: new Date() }]);
      })
      .catch((caught: unknown) => {
        setConfigLoading(false);
        setError(caught instanceof Error ? caught.message : "Unable to load widget");
        setErrorType("config");
        setStatus("error");
      });
  }, [apiUrl, clientId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status, configLoading]);

  useEffect(() => {
    if (status === "open" && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [status, conversationId]);

  async function openWidget() {
    setStatus("open");
    if (conversationId || !config) return;

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
        const data = await requestJson<WidgetConfigResponse>(`${apiUrl}/api/widget/config?clientId=${encodeURIComponent(clientId)}`);
        setConfig(data.config);
        setConfigLoading(false);
        setMessages([{ id: "welcome", role: "assistant", content: data.config.welcomeMessage, createdAt: new Date() }]);
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

  const hasUserMessages = messages.some((m) => m.role === "user");
  const showWelcome = messages.length > 0 && !hasUserMessages && showSuggestions && status !== "loading";

  function renderMessages() {
    if (configLoading && status === "open") {
      return <LoadingSkeleton />;
    }
    return (
      <>
        {showWelcome && (
          <div className="lp-welcome lp-message-wrap">
            <div className="lp-welcome-avatar" aria-hidden="true">{config?.botName.charAt(0) ?? "L"}</div>
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
        <div ref={bottomRef} />
      </>
    );
  }

  const mode = config?.mode ?? "chat";
  const activeColor = config?.color ?? "#2563eb";
  const canSend = !!(draft.trim() && conversationId && status !== "loading");
  const isFormDisabled = status === "loading" || !conversationId;

  function renderInputArea() {
    if (mode === "voice") {
      return (
        <div className="lp-form-voice">
          <div className="lp-mic-wrap">
            <button className="lp-mic" disabled type="button" aria-label="Voice coming soon">
              <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
              </svg>
            </button>
            <span className="lp-mic-tooltip" aria-hidden="true">Coming Soon</span>
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
            <button className="lp-mic" disabled type="button" aria-label="Voice coming soon">
              <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
              </svg>
            </button>
            <span className="lp-mic-tooltip" aria-hidden="true">Coming Soon</span>
          </div>
        )}
      </form>
    );
  }

  return (
    <>
      <style>{styles(activeColor)}</style>
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
                <div className="lp-avatar" aria-hidden="true">{config?.botName.charAt(0) ?? "L"}</div>
                <div>
                  <p className="lp-name">{config?.botName ?? "LeadPilot"}</p>
                  <p className="lp-subtitle">
                    <span className="lp-online">
                      <span className="lp-dot" aria-hidden="true" />
                      <span>Online</span>
                    </span>
                    <span> · Typically replies instantly</span>
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
            <footer className="lp-footer">Powered by LeadPilot</footer>
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
