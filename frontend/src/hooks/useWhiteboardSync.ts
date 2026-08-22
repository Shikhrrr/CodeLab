import { useEffect, useRef, useCallback } from 'react';
import { addEdge, type Node, type Edge } from '@xyflow/react';
import { getWebSocketUrl } from '../config/env';
import { listProjectFiles } from '../services/api';
import { normaliseNodes } from '../utils/canvas';
import useRoomStore from '../store/useRoomStore';
import useCanvasStore from '../store/useCanvasStore';
import useProjectStore from '../store/useProjectStore';
import useChatStore from '../store/useChatStore';
import type { Collaborator, ChatMessage } from '../types';

// ─── Reconnection constants ───────────────────────────────────────────────────

const RECONNECT_BASE_MS = 500;   // first retry delay
const RECONNECT_MAX_MS  = 30_000; // ceiling — don't back off beyond 30s
const SAVE_DEBOUNCE_MS  = 2_000; // snapshot debounce window

// ─── Inbound message shapes ───────────────────────────────────────────────────
// (Discriminated union keeps the message handler exhaustive and type-safe)

interface MsgUserJoined   { type: 'user_joined';          user: Collaborator }
interface MsgUserLeft     { type: 'user_left';            channel: string }
interface MsgNodePosDelta { type: 'node_position_delta';  nodeId: string; position: { x: number; y: number } }
interface MsgNodeAdded    { type: 'node_added';           node: Node }
interface MsgNodeDeleted  { type: 'node_deleted';         nodeId: string }
interface MsgEdgeAdded    { type: 'edge_added';           edge: Edge }
interface MsgEdgeDeleted  { type: 'edge_deleted';         edgeId: string }
interface MsgGenCompleted {
  type: 'generation_completed';
  job_id?: string;
  assistant_response?: string;
}
interface MsgChatMessage {
  type: 'chat_message';
  sender?: string;
  role?: 'user' | 'assistant';
  content?: string;
  timestamp?: string;
}
interface MsgFilesUpdated {
  type: 'files_updated';
}

type InboundMessage =
  | MsgUserJoined
  | MsgUserLeft
  | MsgNodePosDelta
  | MsgNodeAdded
  | MsgNodeDeleted
  | MsgEdgeAdded
  | MsgEdgeDeleted
  | MsgGenCompleted
  | MsgChatMessage
  | MsgFilesUpdated;

// ─── Hook return type ─────────────────────────────────────────────────────────

export interface WhiteboardSyncApi {
  isConnected: boolean;
  broadcastNodePosition(nodeId: string, position: { x: number; y: number }): void;
  broadcastNodeAdd(node: Node): void;
  broadcastNodeDelete(nodeId: string): void;
  broadcastEdgeAdd(edge: Edge): void;
  broadcastEdgeDelete(edgeId: string): void;
  /** Immediately flush the debounced snapshot (also called automatically). */
  triggerCanvasSave(): void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWhiteboardSync(roomId: string, passcode?: string): WhiteboardSyncApi {
  // ── Store action references (stable across renders via Zustand) ──────────
  const setConnected      = useRoomStore((s) => s.setConnected);
  const addActiveUser     = useRoomStore((s) => s.addActiveUser);
  const removeActiveUser  = useRoomStore((s) => s.removeActiveUser);
  const isConnected       = useRoomStore((s) => s.isConnected);

  const canvasSetNodes    = useCanvasStore((s) => s.setNodes);
  const canvasSetEdges    = useCanvasStore((s) => s.setEdges);
  const canvasAddNode     = useCanvasStore((s) => s.addNode);
  const setSaving         = useCanvasStore((s) => s.setSaving);

  const projectSetFiles      = useProjectStore((s) => s.setFiles);
  const projectSetGenerating = useProjectStore((s) => s.setIsGenerating);
  const projectSetJobId      = useProjectStore((s) => s.setCurrentJobId);

  const chatAddMessage    = useChatStore((s) => s.addMessage);

  // ── Mutable refs (don't trigger re-renders) ──────────────────────────────
  const wsRef             = useRef<WebSocket | null>(null);
  const saveTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef        = useRef(0);
  /** Set to true on intentional close so reconnect logic doesn't kick in. */
  const intentionalClose  = useRef(false);

  // ── Safe send helper ─────────────────────────────────────────────────────
  const safeSend = useCallback((payload: object): boolean => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  // ── Debounced canvas snapshot ─────────────────────────────────────────────
  const triggerCanvasSave = useCallback(() => {
    if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
    setSaving(true); // mark as saving immediately so UI can react
    saveTimerRef.current = setTimeout(() => {
      // Read latest state directly from the store (not from closure)
      const { nodes, edges } = useCanvasStore.getState();
      // Normalise node data to match backend CanvasNode schema
      // (techStack → technology, nodeType → role) before persisting
      safeSend({ type: 'save_canvas', nodes: normaliseNodes(nodes), edges });
      setSaving(false);
      saveTimerRef.current = null;
    }, SAVE_DEBOUNCE_MS);
  }, [safeSend, setSaving]);

  // ── Inbound message router ────────────────────────────────────────────────
  const handleMessage = useCallback(
    async (raw: MessageEvent<string>) => {
      let msg: InboundMessage;
      try {
        msg = JSON.parse(raw.data) as InboundMessage;
      } catch {
        console.warn('[WS] Received non-JSON frame — ignoring.');
        return;
      }

      switch (msg.type) {
        // ── Presence ──────────────────────────────────────────────────────
        case 'user_joined':
          addActiveUser(msg.user);
          break;

        case 'user_left':
          removeActiveUser(msg.channel);
          break;

        // ── Node deltas ───────────────────────────────────────────────────
        case 'node_position_delta':
          canvasSetNodes((nodes) =>
            nodes.map((n) =>
              n.id === msg.nodeId
                ? { ...n, position: msg.position }
                : n,
            ),
          );
          break;

        case 'node_added':
          canvasAddNode(msg.node);
          break;

        case 'node_deleted':
          // Remove node AND any edge that references it
          canvasSetNodes((nodes) => nodes.filter((n) => n.id !== msg.nodeId));
          canvasSetEdges((edges) =>
            edges.filter(
              (e) => e.source !== msg.nodeId && e.target !== msg.nodeId,
            ),
          );
          break;

        // ── Edge deltas ───────────────────────────────────────────────────
        case 'edge_added':
          canvasSetEdges((edges) => addEdge(msg.edge, edges));
          break;

        case 'edge_deleted':
          canvasSetEdges((edges) => edges.filter((e) => e.id !== msg.edgeId));
          break;

        // ── AI & Chat Broadcasts ──────────────────────────────────────────
        case 'chat_message': {
          const chatMsg = msg as {
            role?: 'user' | 'assistant';
            content?: string;
            sender?: string;
            files_changed?: boolean;
            files_updated?: boolean;
          };
          const role =
            chatMsg.role ||
            (chatMsg.sender === 'CodeLab AI' ? 'assistant' : 'user');
          const content = chatMsg.content || '';
          const sender = chatMsg.sender;

          chatAddMessage({
            id: crypto.randomUUID(),
            role,
            content,
            sender,
            timestamp: new Date().toISOString(),
          });

          if (role === 'assistant') {
            useChatStore.getState().setIsStreaming(false);
          }

          // Refetch project files in real time if agent changed files
          if (chatMsg.files_changed || chatMsg.files_updated) {
            try {
              const files = await listProjectFiles(roomId, passcode);
              projectSetFiles(files);
            } catch (err) {
              console.error('[WS] Failed to refetch files on chat_message files_changed:', err);
            }
          }
          break;
        }

        case 'files_updated': {
          try {
            const files = await listProjectFiles(roomId, passcode);
            projectSetFiles(files);
          } catch (err) {
            console.error('[WS] Failed to refetch files on files_updated:', err);
          }
          break;
        }

        case 'generation_completed': {
          projectSetGenerating(false);
          if ((msg as MsgGenCompleted).job_id) projectSetJobId((msg as MsgGenCompleted).job_id!);

          // Fetch fresh files from the backend
          try {
            const files = await listProjectFiles(roomId, passcode);
            projectSetFiles(files);
          } catch (err) {
            console.error('[WS] Failed to refresh project files:', err);
          }

          // Surface the assistant reply in the chat panel
          if ((msg as MsgGenCompleted).assistant_response) {
            const completionMsg: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: (msg as MsgGenCompleted).assistant_response!,
              timestamp: new Date().toISOString(),
            };
            chatAddMessage(completionMsg);
          }
          break;
        }

        default:
          // Future message types — log and ignore safely
          console.debug('[WS] Unknown message type:', (msg as { type: string }).type);
      }
    },
    [
      addActiveUser,
      removeActiveUser,
      canvasSetNodes,
      canvasSetEdges,
      canvasAddNode,
      projectSetGenerating,
      projectSetJobId,
      projectSetFiles,
      chatAddMessage,
      roomId,
      passcode,
    ],
  );

  // ── WebSocket lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    intentionalClose.current = false;

    function connect() {
      const url = getWebSocketUrl(roomId, passcode);
      const ws  = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0; // reset backoff on successful connect
        setConnected(true);
        useRoomStore.getState().setSendWS(safeSend);
      };

      ws.onmessage = (evt) => { void handleMessage(evt); };

      ws.onclose = (evt) => {
        setConnected(false);
        useRoomStore.getState().setSendWS(null);
        wsRef.current = null;

        if (intentionalClose.current) return; // clean unmount — don't retry

        // 4404 = backend custom code: ROOM_NOT_FOUND — no point retrying
        if (evt.code === 4404) {
          console.warn('[WS] Room not found (4404). Stopping reconnect.');
          return;
        }

        // Unexpected close → exponential backoff reconnect
        const delay = Math.min(
          RECONNECT_BASE_MS * 2 ** attemptRef.current,
          RECONNECT_MAX_MS,
        );
        attemptRef.current += 1;
        console.info(
          `[WS] Disconnected (code ${evt.code}). Reconnecting in ${delay}ms (attempt ${attemptRef.current})…`,
        );
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = (evt) => {
        console.error('[WS] Socket error:', evt);
        // onclose will fire immediately after onerror — reconnect handled there
      };
    }

    connect();

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      intentionalClose.current = true;

      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null; // prevent stale close handler firing after intentional close
        ws.close(1000, 'Component unmounted');
        wsRef.current = null;
      }

      setConnected(false);
    };
  }, [roomId, passcode, setConnected, handleMessage]);

  // ── Outbound broadcast helpers ────────────────────────────────────────────

  const broadcastNodePosition = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      safeSend({ type: 'node_position_delta', nodeId, position });
      triggerCanvasSave();
    },
    [safeSend, triggerCanvasSave],
  );

  const broadcastNodeAdd = useCallback(
    (node: Node) => {
      safeSend({ type: 'node_added', node });
      triggerCanvasSave();
    },
    [safeSend, triggerCanvasSave],
  );

  const broadcastNodeDelete = useCallback(
    (nodeId: string) => {
      safeSend({ type: 'node_deleted', nodeId });
      triggerCanvasSave();
    },
    [safeSend, triggerCanvasSave],
  );

  const broadcastEdgeAdd = useCallback(
    (edge: Edge) => {
      safeSend({ type: 'edge_added', edge });
      triggerCanvasSave();
    },
    [safeSend, triggerCanvasSave],
  );

  const broadcastEdgeDelete = useCallback(
    (edgeId: string) => {
      safeSend({ type: 'edge_deleted', edgeId });
      triggerCanvasSave();
    },
    [safeSend, triggerCanvasSave],
  );

  return {
    isConnected,
    broadcastNodePosition,
    broadcastNodeAdd,
    broadcastNodeDelete,
    broadcastEdgeAdd,
    broadcastEdgeDelete,
    triggerCanvasSave,
  };
}
