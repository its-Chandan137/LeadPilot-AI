import React, { Component, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ApiResponse, ChatResponse, ConversationStartResponse, WidgetConfigResponse, WidgetConfig } from "@leadpilot/types";

type MountOptions = {
  root: ShadowRoot | HTMLElement;
  clientId: string;
  apiUrl: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type WidgetStatus = "collapsed" | "open" | "loading" | "error";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

const roots = new WeakMap<ShadowRoot | HTMLElement, Root>();

declare global {
  interface Window {
    LeadPilotWidget?: {
      mount(options: MountOptions): void;
    };
  }
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

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

  if (existing) {
    return existing;
  }

  const visitorId = crypto.randomUUID();
  window.localStorage.setItem(storageKey, visitorId);
  return visitorId;
}

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!payload.success) {
    throw new Error(payload.error);
  }

  return payload.data;
}

function styles(color: string) {
  return `
    :host { all: initial; }
    .lp-widget, .lp-widget * { box-sizing: border-box; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .lp-widget { position: fixed; z-index: 2147483647; right: 20px; bottom: 20px; color: #0f172a; }
    .lp-launcher { width: 58px; height: 58px; border: 0; border-radius: 999px; background: ${color}; color: #fff; cursor: pointer; box-shadow: 0 18px 42px rgba(15, 23, 42, 0.24); display: grid; place-items: center; transition: transform 160ms ease, box-shadow 160ms ease; }
    .lp-launcher:hover { transform: translateY(-2px); box-shadow: 0 22px 50px rgba(15, 23, 42, 0.28); }
    .lp-panel { width: min(380px, calc(100vw - 32px)); height: min(620px, calc(100vh - 32px)); display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(15, 23, 42, 0.12); border-radius: 18px; background: #fff; box-shadow: 0 24px 80px rgba(15, 23, 42, 0.22); animation: lp-pop 180ms ease-out; }
    .lp-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px; background: ${color}; color: #fff; }
    .lp-identity { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .lp-avatar { width: 38px; height: 38px; flex: 0 0 auto; border-radius: 999px; background: rgba(255,255,255,0.22); display: grid; place-items: center; font-weight: 700; }
    .lp-name { margin: 0; font-size: 15px; font-weight: 700; line-height: 1.2; }
    .lp-online { margin: 3px 0 0; display: flex; align-items: center; gap: 6px; font-size: 12px; opacity: 0.92; }
    .lp-dot { width: 7px; height: 7px; border-radius: 999px; background: #34d399; }
    .lp-close { border: 0; background: rgba(255,255,255,0.16); color: #fff; border-radius: 999px; width: 32px; height: 32px; cursor: pointer; }
    .lp-messages { flex: 1; overflow-y: auto; padding: 16px; background: #f8fafc; }
    .lp-bubble { max-width: 82%; margin: 0 0 10px; padding: 10px 12px; border-radius: 14px; font-size: 14px; line-height: 1.45; overflow-wrap: anywhere; }
    .lp-user { margin-left: auto; background: ${color}; color: #fff; border-bottom-right-radius: 4px; }
    .lp-assistant { margin-right: auto; background: #fff; color: #0f172a; border: 1px solid rgba(15, 23, 42, 0.08); border-bottom-left-radius: 4px; }
    .lp-typing { display: inline-flex; gap: 4px; padding: 12px; }
    .lp-typing span { width: 6px; height: 6px; border-radius: 999px; background: #94a3b8; animation: lp-blink 900ms infinite ease-in-out; }
    .lp-typing span:nth-child(2) { animation-delay: 120ms; }
    .lp-typing span:nth-child(3) { animation-delay: 240ms; }
    .lp-form { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 12px; border-top: 1px solid rgba(15, 23, 42, 0.08); background: #fff; }
    .lp-input { min-width: 0; border: 1px solid #cbd5e1; border-radius: 12px; padding: 11px 12px; font-size: 14px; outline: none; }
    .lp-input:focus { border-color: ${color}; box-shadow: 0 0 0 3px color-mix(in srgb, ${color} 18%, transparent); }
    .lp-send { border: 0; border-radius: 12px; background: ${color}; color: #fff; padding: 0 14px; font-weight: 700; cursor: pointer; }
    .lp-send:disabled { cursor: not-allowed; opacity: 0.55; }
    .lp-footer { padding: 0 12px 10px; background: #fff; text-align: center; color: #64748b; font-size: 11px; }
    .lp-error { position: fixed; right: 20px; bottom: 20px; z-index: 2147483647; max-width: 280px; border-radius: 12px; background: #991b1b; color: #fff; padding: 12px 14px; font: 14px system-ui; }
    @keyframes lp-pop { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes lp-blink { 0%, 80%, 100% { opacity: 0.35; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }
    @media (max-width: 520px) { .lp-widget { right: 12px; bottom: 12px; } .lp-panel { width: calc(100vw - 24px); height: calc(100vh - 24px); border-radius: 16px; } }
  `;
}

function Widget({ clientId, apiUrl }: { clientId: string; apiUrl: string }) {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [status, setStatus] = useState<WidgetStatus>("collapsed");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const visitorId = useMemo(createVisitorId, []);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestJson<WidgetConfigResponse>(`${apiUrl}/api/widget/config?clientId=${encodeURIComponent(clientId)}`)
      .then((data) => {
        setConfig(data.config);
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: data.config.welcomeMessage
          }
        ]);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Unable to load widget");
        setStatus("error");
      });
  }, [apiUrl, clientId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  async function openWidget() {
    setStatus("open");

    if (conversationId || !config) {
      return;
    }

    try {
      const data = await requestJson<ConversationStartResponse>(`${apiUrl}/api/widget/conversation/start`, {
        method: "POST",
        body: JSON.stringify({ clientId, visitorId })
      });
      setConversationId(data.conversationId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start conversation");
      setStatus("error");
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();

    if (!content || !conversationId) {
      return;
    }

    setDraft("");
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content }]);
    setStatus("loading");

    try {
      const data = await requestJson<ChatResponse>(`${apiUrl}/api/widget/chat`, {
        method: "POST",
        body: JSON.stringify({ clientId, conversationId, visitorId, message: content })
      });
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: data.reply }]);
      setStatus("open");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send message");
      setStatus("error");
    }
  }

  const activeColor = config?.color ?? "#2563eb";

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
          <section aria-label="LeadPilot chat" className="lp-panel">
            <header className="lp-header">
              <div className="lp-identity">
                <div className="lp-avatar">{config?.botName.charAt(0) ?? "L"}</div>
                <div>
                  <p className="lp-name">{config?.botName ?? "LeadPilot"}</p>
                  <p className="lp-online"><span className="lp-dot" /> Online</p>
                </div>
              </div>
              <button aria-label="Close chat" className="lp-close" onClick={() => setStatus("collapsed")} type="button">x</button>
            </header>
            <div className="lp-messages" ref={scrollRef}>
              {messages.map((message) => (
                <p className={`lp-bubble lp-${message.role}`} key={message.id}>{message.content}</p>
              ))}
              {status === "loading" ? (
                <div className="lp-bubble lp-assistant lp-typing" aria-label="Typing">
                  <span />
                  <span />
                  <span />
                </div>
              ) : null}
              {status === "error" ? <p className="lp-bubble lp-assistant">{error ?? "Something went wrong."}</p> : null}
            </div>
            <form className="lp-form" onSubmit={sendMessage}>
              <input
                className="lp-input"
                disabled={status === "loading" || !conversationId}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={conversationId ? "Type your message..." : "Connecting..."}
                value={draft}
              />
              <button className="lp-send" disabled={status === "loading" || !draft.trim() || !conversationId} type="submit">Send</button>
            </form>
            <footer className="lp-footer">Powered by LeadPilot</footer>
          </section>
        )}
      </div>
    </>
  );
}

window.LeadPilotWidget = {
  mount(options: MountOptions) {
    const existingRoot = roots.get(options.root);
    existingRoot?.unmount();

    const root = createRoot(options.root);
    roots.set(options.root, root);
    root.render(
      <ErrorBoundary>
        <Widget apiUrl={options.apiUrl.replace(/\/$/, "")} clientId={options.clientId} />
      </ErrorBoundary>
    );
  }
};
