import { create } from 'zustand';
import type { Collaborator } from '../types';

// ─── State shape ─────────────────────────────────────────────────────────────

interface RoomState {
  roomId: string | null;
  roomName: string;
  passcode: string | null;
  isConnected: boolean;
  activeUsers: Collaborator[];
  sendWS: ((payload: object) => boolean) | null;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

interface RoomActions {
  setRoomData(data: { roomId: string; roomName: string; passcode?: string }): void;
  setConnected(status: boolean): void;
  setActiveUsers(users: Collaborator[]): void;
  addActiveUser(user: Collaborator): void;
  /** Removes a collaborator by their WebSocket channel identifier. */
  removeActiveUser(channel: string): void;
  setSendWS(fn: ((payload: object) => boolean) | null): void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

const useRoomStore = create<RoomState & RoomActions>()((set) => ({
  // Initial state
  roomId: null,
  roomName: '',
  passcode: null,
  isConnected: false,
  activeUsers: [],
  sendWS: null,

  // Actions
  setRoomData: ({ roomId, roomName, passcode }) =>
    set({ roomId, roomName, passcode: passcode ?? null }),

  setConnected: (status) => set({ isConnected: status }),

  setActiveUsers: (users) => set({ activeUsers: users }),

  addActiveUser: (user) =>
    set((state) => {
      // Prevent duplicate entries for the same channel
      const exists = state.activeUsers.some((u) => u.channel === user.channel);
      if (exists) return state;
      return { activeUsers: [...state.activeUsers, user] };
    }),

  removeActiveUser: (channel) =>
    set((state) => ({
      activeUsers: state.activeUsers.filter((u) => u.channel !== channel),
    })),

  setSendWS: (fn) => set({ sendWS: fn }),
}));

export default useRoomStore;
