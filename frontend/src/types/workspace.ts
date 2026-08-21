// ─── Workspace TypeScript Definitions ────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  sender?: string;
  timestamp: string;
}

export interface ProjectFile {
  id?: string;
  path: string;
  content: string;
  description?: string;
  updated_at?: string;
}

export interface PresenceUser {
  channel: string;
  username: string;
  user_id?: string | null;
  color?: string;
}

// ─── AI Generation ───────────────────────────────────────────────────────────

export type GenerationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface GenerationJob {
  id: string;
  room_id: string;
  status: GenerationStatus;
  error_message?: string;
  assistant_response?: string;
}

// ─── Outbound WebSocket Events (Client -> Server) ────────────────────────────

export interface OutboundChatMessageEvent {
  type: 'chat_message';
  sender: string;
  content: string;
}

export interface OutboundSaveCanvasEvent {
  type: 'save_canvas';
  nodes: any[];
  edges: any[];
}

export type OutboundWebSocketEvent =
  | OutboundChatMessageEvent
  | OutboundSaveCanvasEvent;

// ─── Inbound WebSocket Events (Server -> Client) ─────────────────────────────

export interface InboundChatMessageEvent {
  type: 'chat_message';
  sender: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface InboundFilesUpdatedEvent {
  type: 'files_updated';
}

export interface InboundUserJoinedEvent {
  type: 'user_joined';
  user: PresenceUser;
}

export interface InboundUserLeftEvent {
  type: 'user_left';
  channel: string;
  user?: PresenceUser;
}

export type InboundWebSocketEvent =
  | InboundChatMessageEvent
  | InboundFilesUpdatedEvent
  | InboundUserJoinedEvent
  | InboundUserLeftEvent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { type: string; [key: string]: any };
