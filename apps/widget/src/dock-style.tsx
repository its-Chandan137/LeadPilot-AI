import { getWidgetModeFlags, type WidgetMode } from "@leadpilot/types";
import type { FormEvent, KeyboardEvent, RefObject } from "react";
import {
  BlastCalendarIcon,
  BlastChevronDownIcon,
  BlastHeadsetIcon,
  BlastPhoneIcon,
  BlastSendIcon,
  BlastSparkleIcon,
  BlastSparkleLauncherIcon,
} from "./dock-style-icons";

export const BLAST_CTAS = [
  { label: "Speak to Sales", message: "I'd like to speak to sales", icon: BlastHeadsetIcon },
  { label: "Book a Demo", message: "I'd like to book a demo", icon: BlastCalendarIcon },
] as const;

export function getBlastStyles(color: string) {
  return `
    :host { all: initial; }
    .lp-blast, .lp-blast * { box-sizing: border-box; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }

    .lp-blast {
      position: fixed;
      z-index: 2147483647;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      color: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .lp-blast-launcher-outer {
      border: 0;
      padding: 2px;
      border-radius: 999px;
      background: linear-gradient(135deg, #67e8f9 0%, #5eead4 35%, #a78bfa 70%, #c4b5fd 100%);
      cursor: pointer;
      box-shadow: 0 10px 40px rgba(99, 102, 241, 0.25);
      transition: transform 160ms ease, box-shadow 160ms ease;
    }
    .lp-blast-launcher-outer:hover { margin-top: -2px; box-shadow: 0 14px 48px rgba(99, 102, 241, 0.32); }
    .lp-blast-launcher-outer:focus-visible { outline: 3px solid ${color}; outline-offset: 3px; }

    .lp-blast-launcher-inner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 20px 8px 8px;
      border-radius: 999px;
      background: #fff;
      color: #1e293b;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.02em;
      white-space: nowrap;
    }
    .lp-blast-launcher-icon {
      width: 36px;
      height: 36px;
      border-radius: 999px;
      background: ${color};
      display: grid;
      place-items: center;
      flex-shrink: 0;
      box-shadow: 0 4px 14px color-mix(in srgb, ${color} 40%, transparent);
    }

    .lp-blast-dock-row {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      width: min(400px, calc(100vw - 48px));
      animation: lp-blast-rise 200ms ease-out;
    }

    .lp-blast-dock-outer {
      width: 100%;
      max-width: 400px;
      min-width: 0;
      padding: 2px;
      border-radius: 22px;
      background: linear-gradient(135deg, #67e8f9 0%, #5eead4 40%, #a78bfa 85%, #c4b5fd 100%);
      box-shadow: 0 16px 50px rgba(15, 23, 42, 0.18);
    }

    .lp-blast-dock {
      position: relative;
      border-radius: 20px;
      background: #fff;
      overflow: hidden;
    }

    .lp-blast-collapse-tab {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2;
      border: 0;
      background: #fff;
      border-radius: 0 0 10px 10px;
      padding: 4px 14px 6px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lp-blast-collapse-tab:hover svg path { stroke: #64748b; }

    .lp-blast-messages {
      max-height: 220px;
      overflow-y: auto;
      padding: 28px 18px 8px;
      scroll-behavior: smooth;
    }

    .lp-blast-msg-block { margin-bottom: 12px; }
    .lp-blast-sender {
      margin: 0 0 5px;
      font-size: 13px;
      font-weight: 700;
      color: ${color};
    }
    .lp-blast-bubble-assistant {
      background: #f1f5f9;
      color: #334155;
      border-radius: 14px;
      padding: 11px 14px;
      font-size: 14px;
      line-height: 1.55;
      max-width: 100%;
    }
    .lp-blast-bubble-user {
      margin-left: auto;
      max-width: 85%;
      background: ${color};
      color: #fff;
      border-radius: 14px;
      border-bottom-right-radius: 4px;
      padding: 10px 14px;
      font-size: 14px;
      line-height: 1.5;
    }
    .lp-blast-bubble-failed { opacity: 0.7; }

    .lp-blast-typing {
      background: #f1f5f9;
      border-radius: 14px;
      padding: 10px 14px;
      margin-bottom: 8px;
      font-size: 13px;
      color: #64748b;
    }
    .lp-blast-dots { display: inline-flex; gap: 3px; margin-left: 6px; vertical-align: middle; }
    .lp-blast-dots span {
      width: 5px; height: 5px; border-radius: 999px; background: #94a3b8;
      animation: lp-blast-blink 900ms infinite ease-in-out;
    }
    .lp-blast-dots span:nth-child(2) { animation-delay: 120ms; }
    .lp-blast-dots span:nth-child(3) { animation-delay: 240ms; }

    .lp-blast-body { padding: 28px 14px 14px; }

    .lp-blast-input-shell {
      flex: 1;
      min-width: 0;
      padding: 2px;
      border-radius: 999px;
      background: linear-gradient(135deg, #67e8f9 0%, #5eead4 45%, #a78bfa 90%);
    }
    .lp-blast-input-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .lp-blast-input-inner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 6px 6px 14px;
      border-radius: 999px;
      background: #fff;
      min-height: 48px;
    }
    .lp-blast-textarea {
      flex: 1;
      border: 0;
      outline: none;
      resize: none;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.4;
      color: #1e293b;
      background: transparent;
      max-height: 72px;
      min-height: 22px;
      padding: 4px 0;
    }
    .lp-blast-textarea::placeholder { color: #94a3b8; }
    .lp-blast-textarea:disabled { opacity: 0.6; cursor: not-allowed; }

    .lp-blast-send {
      width: 34px;
      height: 34px;
      border: 0;
      border-radius: 999px;
      background: color-mix(in srgb, ${color} 80%, #fda4af);
      display: grid;
      place-items: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: opacity 150ms, transform 100ms;
    }
    .lp-blast-send:hover:not(:disabled) { opacity: 0.92; }
    .lp-blast-send:disabled { opacity: 0.45; cursor: not-allowed; }
    .lp-blast-send-spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.35);
      border-top-color: #fff;
      border-radius: 999px;
      animation: lp-blast-spin 600ms linear infinite;
    }

    .lp-blast-ctas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 10px;
    }
    .lp-blast-cta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 10px;
      border: 0;
      border-radius: 999px;
      background: #f1f5f9;
      color: #334155;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 150ms;
      letter-spacing: -0.01em;
    }
    .lp-blast-cta:hover { background: #e2e8f0; }

    .lp-blast-call-floating {
      width: 48px;
      height: 48px;
      border: 0;
      border-radius: 999px;
      background: ${color};
      color: #fff;
      display: grid;
      place-items: center;
      cursor: pointer;
      flex-shrink: 0;
      margin-top: 2px;
      box-shadow: 0 8px 24px color-mix(in srgb, ${color} 40%, transparent);
      transition: transform 150ms, background 150ms;
    }
    .lp-blast-call-floating:hover:not(:disabled) { transform: scale(1.05); }
    .lp-blast-call-floating:disabled { opacity: 0.55; cursor: not-allowed; }
    .lp-blast-call-active { background: #ef4444 !important; }
    .lp-blast-call-inline {
      width: 34px;
      height: 34px;
      margin-top: 0;
      box-shadow: 0 6px 18px color-mix(in srgb, ${color} 35%, transparent);
    }
    .lp-blast-call-voice-only {
      width: 56px;
      height: 56px;
      margin-top: 0;
    }
    .lp-blast-voice-body {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px 14px 20px;
    }

    .lp-blast-banner {
      margin: 0 14px 8px;
      padding: 8px 12px;
      border-radius: 10px;
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .lp-blast-retry {
      border: 0;
      background: transparent;
      color: inherit;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
      padding: 0;
    }

    @keyframes lp-blast-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes lp-blast-blink { 0%, 80%, 100% { opacity: 0.35; } 40% { opacity: 1; } }
    @keyframes lp-blast-spin { to { transform: rotate(360deg); } }

    @media (max-width: 640px) {
      .lp-blast { bottom: 16px; }
      .lp-blast-dock-row { width: calc(100vw - 32px); }
      .lp-blast-ctas { grid-template-columns: 1fr; }
      .lp-blast-launcher-inner { padding: 8px 16px 8px 8px; font-size: 14px; }
    }
  `;
}

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "sending" | "sent" | "failed";
};

type BlastWidgetProps = {
  botName: string;
  color: string;
  status: "collapsed" | "open" | "loading" | "error";
  mode: WidgetMode;
  messages: ChatMessage[];
  draft: string;
  conversationId: string | null;
  canSend: boolean;
  isFormDisabled: boolean;
  isLoading: boolean;
  showCtas: boolean;
  voiceState: "idle" | "connecting" | "active" | "ending";
  error: string | null;
  errorType: string | null;
  textareaRef: RefObject<HTMLTextAreaElement>;
  scrollRef: RefObject<HTMLDivElement>;
  bottomRef: RefObject<HTMLDivElement>;
  onOpen: () => void;
  onCollapse: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onInputChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSuggestion: (text: string) => void;
  onRetry: () => void;
  onStartCall: () => void;
  onEndCall: () => void;
};

export function BlastWidget({
  botName,
  color,
  status,
  mode,
  messages,
  draft,
  canSend,
  isFormDisabled,
  isLoading,
  showCtas,
  voiceState,
  error,
  errorType,
  textareaRef,
  scrollRef,
  bottomRef,
  onOpen,
  onCollapse,
  onSubmit,
  onInputChange,
  onKeyDown,
  onSuggestion,
  onRetry,
  onStartCall,
  onEndCall,
}: BlastWidgetProps) {
  const { showChat, showInlinePhone, showVoice } = getWidgetModeFlags(mode);
  const hasMessages = messages.length > 0;
  const showMessageArea = showChat && (hasMessages || isLoading || !!errorType);

  const callButton = (
    <button
      type="button"
      className={`lp-blast-call-floating${showVoice ? " lp-blast-call-voice-only" : " lp-blast-call-inline"}${voiceState === "active" ? " lp-blast-call-active" : ""}`}
      onClick={voiceState === "active" ? onEndCall : onStartCall}
      disabled={voiceState === "connecting" || voiceState === "ending"}
      aria-label={voiceState === "active" ? "End call" : "Start voice call"}
    >
      {voiceState === "active" ? (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="white"><rect x="3" y="3" width="10" height="10" rx="1" /></svg>
      ) : (
        <BlastPhoneIcon />
      )}
    </button>
  );

  if (status === "collapsed") {
    if (showVoice) {
      return (
        <div className="lp-blast">
          <button type="button" className="lp-blast-launcher-outer" onClick={onOpen} aria-label={`Call ${botName}`}>
            <span className="lp-blast-launcher-inner">
              <span className="lp-blast-launcher-icon">
                <BlastPhoneIcon />
              </span>
              <span>Call {botName}</span>
            </span>
          </button>
        </div>
      );
    }

    return (
      <div className="lp-blast">
        <button type="button" className="lp-blast-launcher-outer" onClick={onOpen} aria-label={`Ask ${botName}`}>
          <span className="lp-blast-launcher-inner">
            <span className="lp-blast-launcher-icon">
              <BlastSparkleLauncherIcon />
            </span>
            <span>Ask {botName}</span>
          </span>
        </button>
      </div>
    );
  }

  if (showVoice) {
    return (
      <div className="lp-blast">
        <div className="lp-blast-dock-row">
          <div className="lp-blast-dock-outer">
            <div className="lp-blast-dock" role="dialog" aria-label={`Call ${botName}`} aria-modal="true">
              <button type="button" className="lp-blast-collapse-tab" onClick={onCollapse} aria-label="Minimize">
                <BlastChevronDownIcon />
              </button>
              <div className="lp-blast-voice-body">
                {callButton}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lp-blast">
      <div className="lp-blast-dock-row">
        <div className="lp-blast-dock-outer">
          <div className="lp-blast-dock" role="dialog" aria-label={`Chat with ${botName}`} aria-modal="true">
            <button type="button" className="lp-blast-collapse-tab" onClick={onCollapse} aria-label="Minimize">
              <BlastChevronDownIcon />
            </button>

            {showMessageArea && (
              <div className="lp-blast-messages" ref={scrollRef} role="log" aria-live="polite">
                {messages.map((message) => (
                  <div key={message.id} className="lp-blast-msg-block">
                    {message.role === "assistant" ? (
                      <>
                        <p className="lp-blast-sender">{botName}</p>
                        <div className={`lp-blast-bubble-assistant${message.status === "failed" ? " lp-blast-bubble-failed" : ""}`}>
                          {message.content}
                        </div>
                      </>
                    ) : (
                      <div className={`lp-blast-bubble-user${message.status === "failed" ? " lp-blast-bubble-failed" : ""}`}>
                        {message.content}
                      </div>
                    )}
                    {message.status === "failed" && (
                      <button type="button" className="lp-blast-retry" onClick={onRetry}>
                        Failed — tap to retry
                      </button>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="lp-blast-typing" role="status">
                    {botName} is typing
                    <span className="lp-blast-dots" aria-hidden="true">
                      <span /><span /><span />
                    </span>
                  </div>
                )}
                {errorType && !isLoading && (
                  <div className="lp-blast-banner" role="alert">
                    <span>{error ?? "Something went wrong."}</span>
                    <button type="button" className="lp-blast-retry" onClick={onRetry}>Retry</button>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}

            <div className="lp-blast-body" style={showMessageArea ? { paddingTop: 12 } : undefined}>
              {showChat && (
                <form onSubmit={onSubmit}>
                  <div className="lp-blast-input-row">
                    <div className="lp-blast-input-shell">
                      <div className="lp-blast-input-inner">
                        <BlastSparkleIcon />
                        <textarea
                          ref={textareaRef}
                          className="lp-blast-textarea"
                          rows={1}
                          disabled={isFormDisabled}
                          value={draft}
                          onChange={(e) => onInputChange(e.target.value)}
                          onKeyDown={onKeyDown}
                          placeholder={`Ask ${botName} anything...`}
                          aria-label="Message input"
                        />
                        <button
                          type="submit"
                          className="lp-blast-send"
                          disabled={!canSend}
                          aria-label={isLoading ? "Sending" : "Send message"}
                        >
                          {isLoading ? <span className="lp-blast-send-spinner" aria-hidden="true" /> : <BlastSendIcon />}
                        </button>
                      </div>
                    </div>
                    {showInlinePhone && callButton}
                  </div>
                </form>
              )}

              {showChat && showCtas && (
                <div className="lp-blast-ctas" role="group" aria-label="Quick actions">
                  {BLAST_CTAS.map((cta) => {
                    const Icon = cta.icon;
                    return (
                      <button
                        key={cta.label}
                        type="button"
                        className="lp-blast-cta"
                        onClick={() => onSuggestion(cta.message)}
                        aria-label={cta.label}
                      >
                        <Icon />
                        {cta.label}
                      </button>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
