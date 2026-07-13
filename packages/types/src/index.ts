export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type WidgetMode = "chat" | "voice" | "both";

export type WidgetProvider = "groq" | "livekit-openai" | "sarvam";

/** Template type prefix derived from widget mode. */
export type WidgetTemplateType = "chatonly" | "voiceonly" | "both";

export type WidgetTemplateStyle =
  | "classic"
  | "modern"
  | "minimal"
  | "card"
  | "orb"
  | "compact-mic"
  | "full-panel"
  | "split"
  | "tabbed"
  | "unified"
  | "dock-style";

/** IDs are `{type}-{style}`, e.g. `chatonly-classic`, `both-modern`, `voiceonly-orb`. */
export type WidgetTemplate = `${WidgetTemplateType}-${WidgetTemplateStyle}` | string;

export type WidgetConfig = {
  clientId: string;
  projectName: string;
  color: string;
  botName: string;
  welcomeMessage: string;
  avatarUrl?: string;
  mode?: WidgetMode;
  template?: string;
  livekitUrl?: string;
  provider?: WidgetProvider;
};

export function normalizeWidgetMode(value?: string): WidgetMode {
  const mode = value?.trim().toLowerCase();
  if (mode === "voice" || mode === "both") return mode;
  return "chat";
}

export function getWidgetModeFlags(mode: WidgetMode) {
  return {
    showChat: mode === "chat" || mode === "both",
    showVoice: mode === "voice",
    showInlinePhone: mode === "both",
  };
}

export function modeToTemplateType(mode: WidgetMode): WidgetTemplateType {
  if (mode === "voice") return "voiceonly";
  if (mode === "both") return "both";
  return "chatonly";
}

export function templateTypeToMode(type: WidgetTemplateType): WidgetMode {
  if (type === "voiceonly") return "voice";
  if (type === "both") return "both";
  return "chat";
}

export function buildTemplateId(type: WidgetTemplateType, style: string): string {
  return `${type}-${style}`;
}

export function parseTemplateId(template?: string): {
  type: WidgetTemplateType | null;
  style: string | null;
} {
  if (!template) return { type: null, style: null };

  if (template.startsWith("chatonly-")) {
    return { type: "chatonly", style: template.slice("chatonly-".length) || null };
  }
  if (template.startsWith("voiceonly-")) {
    return { type: "voiceonly", style: template.slice("voiceonly-".length) || null };
  }
  if (template.startsWith("both-")) {
    return { type: "both", style: template.slice("both-".length) || null };
  }

  return { type: null, style: null };
}

export function isDockStyleTemplate(template?: string): boolean {
  if (!template) return false;
  const { style } = parseTemplateId(template);
  if (style === "dock-style") return true;
  // Legacy ids
  return (
    template === "dock-style" ||
    template === "dock-style-chat" ||
    template === "dock-style-voice" ||
    template === "dock-style-both"
  );
}

/** Map legacy bare / dock-style-* ids onto the new `{type}-{style}` scheme. */
export function normalizeWidgetTemplate(
  template: string | undefined,
  mode: WidgetMode,
): string {
  const type = modeToTemplateType(mode);

  if (!template) {
    return defaultTemplateFor(mode);
  }

  const parsed = parseTemplateId(template);
  if (parsed.type && parsed.style) {
    // If stored type doesn't match current mode, keep the style and retarget.
    if (parsed.type !== type) {
      return buildTemplateId(type, parsed.style);
    }
    return template;
  }

  // Legacy dock-style variants
  if (template === "dock-style" || template === "dock-style-chat" || template === "dock-style-voice" || template === "dock-style-both") {
    return buildTemplateId(type, "dock-style");
  }

  // Legacy bare style names (classic, orb, unified, …)
  return buildTemplateId(type, template);
}

export function defaultTemplateFor(mode: WidgetMode): string {
  return buildTemplateId(modeToTemplateType(mode), "classic");
}

export type WidgetConfigResponse = {
  config: WidgetConfig;
};

export type ConversationStartResponse = {
  conversationId: string;
};

export type ChatResponse = {
  conversationId: string;
  reply: string;
};
