// ─── Architecture Canvas ────────────────────────────────────────────────────

export type ArchitectureNodeType =
  | 'service'
  | 'database'
  | 'cache'
  | 'queue'
  | 'gateway'
  | 'worker'
  | 'frontend';

export interface CustomNodeData {
  id: string;
  label: string;
  nodeType: ArchitectureNodeType;
  /** Backend canonical field — framework/tool name (e.g. "FastAPI", "PostgreSQL"). */
  technology: string;
  /** Backend canonical field — component category (e.g. "service", "database"). */
  role: string;
  /** Legacy alias for technology — kept for backward-compat with persisted canvas state. */
  techStack?: string;
  port?: number;
  /** Arbitrary environment variables to attach to this node */
  envVars?: Record<string, string>;
  isLocked?: boolean;
  /** Username/ID of the collaborator currently holding the lock */
  lockedBy?: string;
}

export interface CanvasState {
  // Using `any` here to stay compatible with @xyflow/react's Node/Edge generics
  // without coupling the type layer to a specific version.
  nodes: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  edges: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  version?: number;
}

// ─── Project Files ───────────────────────────────────────────────────────────

export interface ProjectFile {
  id: string;
  path: string;
  content: string;
  description?: string;
  updated_at: string;
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

// ─── Chat ────────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
}

// ─── Collaboration ───────────────────────────────────────────────────────────

export interface Collaborator {
  channel: string;
  username: string;
  user_id?: string;
  /** Hex or CSS color string used to identify this collaborator's cursor/highlights */
  color: string;
}
