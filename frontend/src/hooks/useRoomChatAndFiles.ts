import { useEffect, useState, useCallback, useMemo } from 'react';
import { getChatHistory, listProjectFiles } from '../services/api';
import useRoomStore from '../store/useRoomStore';
import useProjectStore from '../store/useProjectStore';
import useChatStore from '../store/useChatStore';
import type { ChatMessage, ProjectFile, OutboundChatMessageEvent } from '../types';

export interface UseRoomChatAndFilesReturn {
  messages: ChatMessage[];
  files: ProjectFile[];
  selectedFilePath: string | null;
  selectedFile: ProjectFile | undefined;
  isConnecting: boolean;
  isConnected: boolean;
  isThinking: boolean;
  error: string | null;
  sendMessage: (content: string) => void;
  refetchFiles: () => Promise<ProjectFile[]>;
  setSelectedFilePath: (path: string | null) => void;
}

export function useRoomChatAndFiles(
  roomId: string,
  passcode?: string,
): UseRoomChatAndFilesReturn {
  const isConnected = useRoomStore((s) => s.isConnected);
  const sendWS = useRoomStore((s) => s.sendWS);

  const rawMessages = useChatStore((s) => s.messages);
  const setStoreMessages = useChatStore((s) => s.setMessages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const setIsStreaming = useChatStore((s) => s.setIsStreaming);

  const rawFiles = useProjectStore((s) => s.files);
  const setStoreFiles = useProjectStore((s) => s.setFiles);
  const activeFileId = useProjectStore((s) => s.activeFileId);
  const setActiveFileId = useProjectStore((s) => s.setActiveFileId);

  const [error, setError] = useState<string | null>(null);

  // Normalize messages & files
  const messages = useMemo(
    () => (Array.isArray(rawMessages) ? rawMessages : []),
    [rawMessages],
  );
  const files = useMemo(
    () => (Array.isArray(rawFiles) ? rawFiles : []),
    [rawFiles],
  );

  const selectedFile = useMemo(() => {
    if (!files.length) return undefined;
    if (activeFileId) {
      const match = files.find(
        (f) => f.id === activeFileId || f.path === activeFileId,
      );
      if (match) return match;
    }
    return files[0];
  }, [files, activeFileId]);

  const selectedFilePath = selectedFile?.path ?? null;

  // ── 1. Refetch files helper ───────────────────────────────────────────────
  const refetchFiles = useCallback(async (): Promise<ProjectFile[]> => {
    try {
      const fetchedFiles = await listProjectFiles(roomId, passcode);
      setStoreFiles(fetchedFiles);
      return fetchedFiles;
    } catch (err) {
      console.error('[useRoomChatAndFiles] Failed to fetch project files:', err);
      return [];
    }
  }, [roomId, passcode, setStoreFiles]);

  // ── 2. Initial Mount: Fetch Chat History & Files ──────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function initialFetch() {
      try {
        const [history, fetchedFiles] = await Promise.all([
          getChatHistory(roomId, passcode).catch(() => []),
          listProjectFiles(roomId, passcode).catch(() => []),
        ]);

        if (cancelled) return;

        setStoreMessages(history);
        setStoreFiles(fetchedFiles);
      } catch (err) {
        if (cancelled) return;
        console.error('[useRoomChatAndFiles] Initial hydration failed:', err);
        setError('Failed to load room chat or files.');
      }
    }

    void initialFetch();

    return () => {
      cancelled = true;
    };
  }, [roomId, passcode, setStoreMessages, setStoreFiles]);

  // ── 3. Helper: Send Chat Message over Room WebSocket ─────────────────────
  const sendMessage = useCallback(
    (content: string) => {
      const text = content.trim();
      if (!text) return;

      const activeSendWS = sendWS || useRoomStore.getState().sendWS;

      if (!activeSendWS) {
        console.warn('[useRoomChatAndFiles] Cannot send message — WebSocket is not connected.');
        setError('Cannot send message: Disconnected from server.');
        return;
      }

      const payload: OutboundChatMessageEvent = {
        type: 'chat_message',
        sender: 'User',
        content: text,
      };

      const sent = activeSendWS(payload);
      if (sent) {
        setIsStreaming(true);
        setError(null);
      } else {
        setError('Failed to send message over WebSocket.');
      }
    },
    [sendWS, setIsStreaming],
  );

  // ── 4. Helper: Select File ────────────────────────────────────────────────
  const setSelectedFilePath = useCallback(
    (path: string | null) => {
      if (!path) {
        setActiveFileId(null);
        return;
      }
      const match = files.find((f) => f.path === path || f.id === path);
      if (match) {
        setActiveFileId(match.id || match.path);
      } else {
        setActiveFileId(path);
      }
    },
    [files, setActiveFileId],
  );

  return {
    messages,
    files,
    selectedFilePath,
    selectedFile,
    isConnecting: !isConnected,
    isConnected,
    isThinking: isStreaming,
    error,
    sendMessage,
    refetchFiles,
    setSelectedFilePath,
  };
}
