import { create } from 'zustand';
import type { ChatMessage } from '../types';

// ─── State shape ─────────────────────────────────────────────────────────────

interface ChatState {
  messages: ChatMessage[];
  /** True while the AI is mid-stream; drives the typing indicator. */
  isStreaming: boolean;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

interface ChatActions {
  setMessages(messages: ChatMessage[]): void;
  addMessage(message: ChatMessage): void;
  setIsStreaming(isStreaming: boolean): void;
  clearMessages(): void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

const useChatStore = create<ChatState & ChatActions>()((set) => ({
  // Initial state
  messages: [],
  isStreaming: false,

  // Actions
  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  clearMessages: () => set({ messages: [] }),
}));

export default useChatStore;
