import type {
  FormEvent,
  KeyboardEvent,
  ReactNode,
  RefObject,
} from "react";

import type {
  WidgetConfig,
  WidgetMode,
} from "@leadpilot/types";

type FusionFooterProps = {
  mode: WidgetMode;
  draft: string;
  conversationId: string | null;
  canSend: boolean;
  isFormDisabled: boolean;
  isSending: boolean;
  voiceState: "idle" | "connecting" | "active" | "ending";

  textareaRef: RefObject<HTMLTextAreaElement>;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onInputChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;

  startVoiceCall: () => void;
  endVoiceCall: () => void;
};

type FusionTemplateProps = {
  activeColor: string;
  classicStyles: string;

  config: WidgetConfig;

  status: "collapsed" | "open" | "loading" | "error";

  messages: ReactNode;

  scrollRef: RefObject<HTMLDivElement>;

  openWidget: () => void;

  closeWidget: () => void;

  footer: FusionFooterProps;
};

function fusionStyles(color: string, font: string) {
  const fontFamily = font && font.trim() ? font : 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  return `
    .lp-fusion, .lp-fusion * { box-sizing: border-box; font-family: ${fontFamily}; }
    .lp-fusion { position: fixed; z-index: 2147483647; left: 50%; bottom: 20px; transform: translateX(-50%); color: #0f172a; }
    .lp-fusion-launcher { width: min(300px, calc(100vw - 32px)); height: 52px; border: 1px solid rgba(148, 163, 184, 0.34); border-radius: 999px; background: rgba(255, 255, 255, 0.86); color: #64748b; cursor: pointer; box-shadow: 0 18px 60px rgba(15, 23, 42, 0.18), inset 0 1px 0 rgba(255,255,255,0.88); display: flex; align-items: center; gap: 12px; padding: 0 18px; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease; }
    .lp-fusion-launcher:hover { transform: translateY(-2px); border-color: color-mix(in srgb, ${color} 42%, rgba(148,163,184,0.34)); box-shadow: 0 22px 70px rgba(15, 23, 42, 0.22), 0 0 0 4px color-mix(in srgb, ${color} 9%, transparent); }
    .lp-fusion-launcher:focus-visible { outline: 3px solid ${color}; outline-offset: 4px; }
    .lp-fusion-search-icon { width: 18px; height: 18px; color: ${color}; flex: 0 0 auto; }
    .lp-fusion-placeholder { font-size: 14px; font-weight: 600; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .lp-fusion-panel { width: min(430px, calc(100vw - 28px)); height: min(620px, calc(100vh - 92px)); margin-bottom: 12px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(148, 163, 184, 0.26); border-radius: 24px; background: rgba(255, 255, 255, 0.9); box-shadow: none; backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); animation: lp-fusion-rise 180ms ease-out; }
    .lp-fusion-header { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 16px 18px; background: linear-gradient(135deg, rgba(255,255,255,0.92), color-mix(in srgb, ${color} 12%, white)); border-bottom: 1px solid rgba(148, 163, 184, 0.2); flex-shrink: 0; }
    .lp-fusion-identity { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .lp-fusion-avatar { width: 42px; height: 42px; border-radius: 999px; background: ${color}; color: #fff; display: grid; place-items: center; font-size: 17px; font-weight: 800; box-shadow: 0 10px 24px color-mix(in srgb, ${color} 32%, transparent); flex: 0 0 auto; }
    .lp-fusion-name { margin: 0; color: #0f172a; font-size: 15px; font-weight: 800; line-height: 1.2; }
    .lp-fusion-status { margin: 3px 0 0; display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 12px; line-height: 1.2; }
    .lp-fusion-dot { width: 7px; height: 7px; border-radius: 999px; background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.14); }
    .lp-fusion-close { border: 0; background: rgba(15,23,42,0.06); color: #334155; border-radius: 999px; width: 36px; height: 36px; cursor: pointer; display: grid; place-items: center; transition: background 150ms, color 150ms; flex-shrink: 0; }
    .lp-fusion-close:hover { background: rgba(15,23,42,0.1); color: #0f172a; }
    .lp-fusion-close:focus-visible { outline: 2px solid ${color}; outline-offset: 2px; }
    .lp-fusion .lp-messages { flex: 1; overflow-y: auto; padding: 18px; background: linear-gradient(180deg, rgba(248,250,252,0.72), rgba(255,255,255,0.88));; }
    .lp-fusion-footer { display: flex; align-items: flex-end; gap: 10px; padding: 12px 14px 14px; border-top: 1px solid rgba(148,163,184,0.2); background: rgba(255,255,255,0.88); flex-shrink: 0; }
    .lp-fusion-input-wrap { flex: 1; min-width: 0; display: flex; }
    .lp-fusion-textarea { width: 100%; min-height: 44px; max-height: 150px; resize: none; border: 1px solid rgba(148,163,184,0.42); border-radius: 16px; padding: 11px 13px; background: rgba(248,250,252,0.92); color: #0f172a; font-family: inherit; font-size: 14px; line-height: 1.45; outline: none; transition: border-color 150ms, box-shadow 150ms, background 150ms; }
    .lp-fusion-textarea:focus { border-color: ${color}; background: #fff; box-shadow: 0 0 0 3px color-mix(in srgb, ${color} 16%, transparent); }
    .lp-fusion-textarea:disabled { opacity: 0.62; cursor: not-allowed; }
    .lp-fusion-action { border: 0; border-radius: 16px; width: 44px; height: 44px; display: grid; place-items: center; flex: 0 0 auto; cursor: pointer; transition: transform 100ms, opacity 150ms, background 150ms; }
    .lp-fusion-action:active:not(:disabled) { transform: scale(0.96); }
    .lp-fusion-action:disabled { cursor: not-allowed; opacity: 0.5; }
    .lp-fusion-action:focus-visible { outline: 2px solid ${color}; outline-offset: 2px; }
    .lp-fusion-voice { background: color-mix(in srgb, ${color} 10%, #f8fafc); color: ${color}; border: 1px solid color-mix(in srgb, ${color} 22%, rgba(148,163,184,0.3)); }
    .lp-fusion-voice-center { margin: 0 auto;}
    .lp-fusion-voice-active { background: #ef4444; color: #fff; border-color: #ef4444; }
    .lp-fusion-send { background: ${color}; color: #fff; box-shadow: 0 10px 22px color-mix(in srgb, ${color} 24%, transparent); }
    .lp-fusion-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.34); border-top-color: #fff; border-radius: 999px; animation: lp-spin 600ms linear infinite; }
    @keyframes lp-fusion-rise { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @media (max-width: 520px) {
      .lp-fusion { bottom: 10px; }
      .lp-fusion-panel { width: calc(100vw - 20px); height: min(620px, calc(100vh - 82px)); border-radius: 22px; }
      .lp-fusion-footer { padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)); }
    }
    .lp-fusion-poweredby { text-align: center; padding: 8px 12px 10px; font-size: 11px; color: #94a3b8; background: rgba(255,255,255,0.7); border-top: 1px solid rgba(148,163,184,0.16); flex-shrink: 0; }
  `;
}

function VoiceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="3" y="3" width="10" height="10" rx="1" />
    </svg>
  );
}

function FusionFooter({ footer }: { footer: FusionFooterProps }) {
  const showChat = footer.mode === "chat" || footer.mode === "both";
  const showVoice = footer.mode === "voice" || footer.mode === "both";
  const voiceDisabled = footer.voiceState === "connecting" || footer.voiceState === "ending";
  const voiceLabel = footer.voiceState === "active"
      ? "End voice call"
      : footer.voiceState === "connecting"
        ? "Connecting..."
        : "Start voice call";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    footer.onSubmit(event);
  }

  return (
    <form className="lp-fusion-footer" onSubmit={handleSubmit}>
      {showVoice && (
        <button
          aria-label={voiceLabel}
          className={`lp-fusion-action lp-fusion-voice ${!showChat ? "lp-fusion-voice-center" : ""
            }${footer.voiceState === "active" ? " lp-fusion-voice-active" : ""}`}
          disabled={voiceDisabled}
          onClick={
            footer.voiceState === "active"
              ? footer.endVoiceCall
              : footer.startVoiceCall
          }
          title={voiceLabel}
          type="button"
        >
          {footer.voiceState === "active" ? <StopIcon /> : <VoiceIcon />}
        </button>
      )}
      {showChat && (
        <>
          <div className="lp-fusion-input-wrap">
            <textarea
              ref={footer.textareaRef}
              className="lp-fusion-textarea"
              rows={1}
              disabled={footer.isFormDisabled}
              onChange={(event) => footer.onInputChange(event.target.value)}
              onKeyDown={footer.onKeyDown}
              placeholder={footer.conversationId ? "Type your message..." : "Connecting..."}
              value={footer.draft}
              aria-label="Message input"
            />
          </div>
          <button
            aria-label={footer.isSending ? "Sending message" : "Send message"}
            className="lp-fusion-action lp-fusion-send"
            disabled={!footer.canSend}
            type="submit"
          >
            {footer.isSending ? (
              <span className="lp-fusion-spinner" aria-hidden="true" />
            ) : (
              <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 20 20" width="18">
                <path d="M2.5 10l15-7.5-7.5 15L8.75 11.25 2.5 10z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              </svg>
            )}
          </button>
        </>
      )}
    </form>
  );
}

export function FusionTemplate({
  activeColor,
  classicStyles,
  config,
  status,
  openWidget,
  closeWidget,
  messages,
  scrollRef,
  footer,
}: FusionTemplateProps) {
  return (
    <>
      <style>{classicStyles}</style>
      <style>{fusionStyles(activeColor, config.fontFamily ?? "")}</style>
      <div className="lp-fusion">
        {status === "collapsed" ? (
          <button aria-label="Open chat" className="lp-fusion-launcher" onClick={openWidget} type="button">
            <svg className="lp-fusion-search-icon" aria-hidden="true" fill="none" viewBox="0 0 24 24">
              <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span className="lp-fusion-placeholder">Ask LeadPilot AI...</span>
          </button>
        ) : (
          <section aria-label="LeadPilot chat" className="lp-fusion-panel" role="dialog" aria-modal="true">
            <header className="lp-fusion-header">
              <div className="lp-fusion-identity">
                <div className="lp-fusion-avatar" aria-hidden="true">
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
                <div>
                  <p className="lp-fusion-name">{config?.headerTitle || config?.botName || "LeadPilot"}</p>
                  <p className="lp-fusion-status">
                    <span className="lp-fusion-dot" aria-hidden="true" />
                    <span>Online{config?.headerSubtitle ? ` · ${config.headerSubtitle}` : ""}</span>
                  </p>
                </div>
              </div>
              <button aria-label="Close chat" className="lp-fusion-close" onClick={closeWidget} type="button">
                <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </button>
            </header>
            <div className="lp-messages" ref={scrollRef} role="log" aria-label="Chat messages" aria-live="polite">
              {messages}
            </div>
            <FusionFooter footer={footer} />
            {config?.showBranding !== false && (
              <footer className="lp-fusion-poweredby">Powered by LeadPilot</footer>
            )}
          </section>
        )}
      </div>
    </>
  );
}
