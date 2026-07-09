export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type WidgetConfig = {
  clientId: string;
  projectName: string;
  color: string;
  botName: string;
  welcomeMessage: string;
  avatarUrl?: string;
  mode?: "chat" | "voice" | "both";
  livekitUrl?: string;
  provider?: "groq" | "livekit-openai" | "sarvam";
};

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
