import axios from 'axios';
import { saveAs } from 'file-saver';
import { API_BASE_URL } from '../config/env';
import type { CanvasState, ChatMessage, GenerationJob, ProjectFile } from '../types';

// ─── Axios Instance ──────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Passcode Helper ─────────────────────────────────────────────────────────

/**
 * Returns request config with `X-Room-Passcode` header when a passcode is given.
 * Pass this as the final argument to every axios call.
 */
function withPasscode(passcode?: string) {
  if (!passcode) return {};
  return { headers: { 'X-Room-Passcode': passcode } };
}

// ─── Room Endpoints ──────────────────────────────────────────────────────────

export interface CreatedRoom {
  id?: string;
  room_id: string;
  name: string;
  passcode?: string | null;
  is_locked?: boolean;
  is_protected?: boolean;
  created_at?: string;
}

export interface VerifyRoomResponse {
  exists: boolean;
  room_id?: string;
  id?: string;
  name?: string;
  is_locked?: boolean;
  is_protected?: boolean;
  access?: boolean;
  error?: string;
}

/**
 * POST /rooms/
 * Creates a new collaborative room. Returns the created room object.
 */
export async function createRoom(
  name: string = 'New Workspace',
  passcode?: string,
): Promise<CreatedRoom> {
  const { data } = await apiClient.post<CreatedRoom>('/rooms/', { name, passcode }, withPasscode(passcode));
  return data;
}

/**
 * GET /rooms/verify/{room_id}/
 * Checks if a room exists by room ID and returns metadata.
 */
export async function verifyRoom(
  roomId: string,
  passcode?: string,
): Promise<VerifyRoomResponse> {
  const cleanId = roomId.trim();
  const { data } = await apiClient.get<VerifyRoomResponse>(
    `/rooms/verify/${encodeURIComponent(cleanId)}/`,
    withPasscode(passcode),
  );
  return data;
}

// ─── Canvas Endpoints ────────────────────────────────────────────────────────

/**
 * GET /rooms/{roomId}/canvas/
 * Fetches the latest saved canvas state for a room.
 */
export async function getCanvasState(
  roomId: string,
  passcode?: string,
): Promise<CanvasState> {
  const { data } = await apiClient.get(`/rooms/${roomId}/canvas/`, withPasscode(passcode));
  return data;
}

/**
 * POST /rooms/{roomId}/canvas/
 * Persists the current canvas state (nodes + edges) for a room.
 */
export async function saveCanvasState(
  roomId: string,
  nodes: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
  edges: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
  passcode?: string,
): Promise<CanvasState> {
  const { data } = await apiClient.post(
    `/rooms/${roomId}/canvas/`,
    { nodes, edges },
    withPasscode(passcode),
  );
  return data;
}

// ─── Generation Endpoints ────────────────────────────────────────────────────

export interface GenerationPayload {
  prompt?: string;
  mode?: string;
  active_file_path?: string;
}

/**
 * POST /rooms/{roomId}/generate/
 * Enqueues an AI generation job for the room and returns the job record.
 */
export async function triggerGeneration(
  roomId: string,
  payload: GenerationPayload,
  passcode?: string,
): Promise<GenerationJob> {
  const { data } = await apiClient.post(
    `/rooms/${roomId}/generate/`,
    payload,
    withPasscode(passcode),
  );
  return data;
}

/**
 * GET /rooms/{roomId}/jobs/{jobId}/
 * Polls the status of an AI generation job.
 */
export async function getJobStatus(
  roomId: string,
  jobId: string,
  passcode?: string,
): Promise<GenerationJob> {
  const { data } = await apiClient.get(
    `/rooms/${roomId}/jobs/${jobId}/`,
    withPasscode(passcode),
  );
  return data;
}

// ─── File Endpoints ──────────────────────────────────────────────────────────

/**
 * GET /rooms/{roomId}/files/
 * Lists all project files generated for a room.
 */
export async function listProjectFiles(
  roomId: string,
  passcode?: string,
): Promise<ProjectFile[]> {
  const { data } = await apiClient.get(`/rooms/${roomId}/files/`, withPasscode(passcode));
  // Backend returns { room_id, files: [...] } envelope
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.files)) return data.files as ProjectFile[];
  if (data && Array.isArray(data.results)) return data.results as ProjectFile[];
  return [];
}

/**
 * GET /rooms/{roomId}/files/{fileId}/
 * Fetches the content of a single project file.
 */
export async function getFile(
  roomId: string,
  fileId: string,
  passcode?: string,
): Promise<ProjectFile> {
  const { data } = await apiClient.get(
    `/rooms/${roomId}/files/${fileId}/`,
    withPasscode(passcode),
  );
  return data;
}

/**
 * PUT /rooms/{roomId}/files/{fileId}/
 * Updates the content of a project file.
 */
export async function updateFile(
  roomId: string,
  fileId: string,
  content: string,
  passcode?: string,
): Promise<ProjectFile> {
  const { data } = await apiClient.put(
    `/rooms/${roomId}/files/${fileId}/`,
    { content },
    withPasscode(passcode),
  );
  return data;
}

/**
 * GET / PUT /rooms/{roomId}/files/{fileId}/
 * Convenience wrapper — reads the file when `content` is undefined, updates it otherwise.
 */
export async function getOrUpdateFile(
  roomId: string,
  fileId: string,
  content?: string,
  passcode?: string,
): Promise<ProjectFile> {
  if (content === undefined) {
    return getFile(roomId, fileId, passcode);
  }
  return updateFile(roomId, fileId, content, passcode);
}

/**
 * PUT /rooms/{roomId}/files/
 * Spec-compliant save: sends { path, content } without a file UUID in the URL.
 * Used by CodeEditor when `fileId` is unavailable or the backend prefers path-based upserts.
 */
export async function saveFileByPath(
  roomId: string,
  path: string,
  content: string,
  passcode?: string,
): Promise<{ status: string; path: string }> {
  const { data } = await apiClient.put(
    `/rooms/${roomId}/files/`,
    { path, content },
    withPasscode(passcode),
  );
  return data as { status: string; path: string };
}

// ─── Download Endpoint ───────────────────────────────────────────────────────

/**
 * GET /rooms/{roomId}/download/
 * Streams a ZIP archive of all project files and triggers a browser download.
 * Uses file-saver for cross-browser blob handling.
 */
export async function downloadZip(roomId: string, passcode?: string): Promise<void> {
  const response = await apiClient.get(`/rooms/${roomId}/download/`, {
    responseType: 'blob',
    ...withPasscode(passcode),
  });

  // Extract filename from Content-Disposition or fall back to a sensible default
  const disposition: string = response.headers['content-disposition'] ?? '';
  const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  const filename = filenameMatch ? filenameMatch[1].replace(/['"]/g, '') : `${roomId}.zip`;

  saveAs(response.data as Blob, filename);
}

// ─── Chat Endpoint ───────────────────────────────────────────────────────────

/**
 * GET /rooms/{roomId}/chat/history/
 * Retrieves the persisted chat history for a room.
 */
export async function getChatHistory(
  roomId: string,
  passcode?: string,
): Promise<ChatMessage[]> {
  const cleanId = roomId.trim();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let responseData: any = null;

  // Try /rooms/{roomId}/chat/history/ first, then fall back to /rooms/{roomId}/chat/
  try {
    const { data } = await apiClient.get(
      `/rooms/${cleanId}/chat/`,
      withPasscode(passcode),
    );
    responseData = data;
  } catch {
    try {
      const { data } = await apiClient.get(
        `/rooms/${cleanId}/chat/`,
        withPasscode(passcode),
      );
      responseData = data;
    } catch {
      try {
        const { data } = await apiClient.get(
          `/rooms/${cleanId}/history/`,
          withPasscode(passcode),
        );
        responseData = data;
      } catch (err) {
        console.error('[API] Failed to fetch chat history:', err);
        return [];
      }
    }
  }

  if (!responseData) return [];

  // Extract array from response envelope ({ history: [] }, { messages: [] }, { results: [] }, or plain array)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawList: any[] = Array.isArray(responseData)
    ? responseData
    : responseData.history ||
      responseData.messages ||
      responseData.results ||
      responseData.chat ||
      [];

  if (!Array.isArray(rawList)) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rawList.map((m: any, idx: number) => {
    const rawRole = (m.role || m.type || 'user').toLowerCase();
    const role: 'user' | 'assistant' | 'system' =
      rawRole === 'ai' || rawRole === 'assistant'
        ? 'assistant'
        : rawRole === 'system'
        ? 'system'
        : 'user';

    let contentStr = '';
    if (typeof m.content === 'string') {
      contentStr = m.content;
    } else if (Array.isArray(m.content)) {
      contentStr = m.content
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((part: any) => (typeof part === 'string' ? part : part?.text || ''))
        .join('');
    } else if (m.content) {
      contentStr = String(m.content);
    }

    return {
      id: m.id || `msg-${idx}-${Date.now()}`,
      role,
      content: contentStr,
      sender:
        m.sender ||
        (role === 'assistant' ? 'CodeLab AI' : role === 'user' ? 'YOU' : 'SYSTEM'),
      timestamp: m.timestamp || m.created_at || new Date().toISOString(),
    };
  });
}

// ─── Default Export ──────────────────────────────────────────────────────────

export default apiClient;
