export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

export const WS_BASE_URL: string =
  import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8000/ws/whiteboard';

/**
 * Builds the full WebSocket URL for a given room.
 *
 * Strips any trailing slash from the base before appending `/{roomId}/`
 * so the result always matches Django Channels' `path("ws/whiteboard/<str:room_id>/", …)`.
 *
 * e.g. ws://localhost:8000/ws/whiteboard/K9X2M4P7/?passcode=secret
 */
export function getWebSocketUrl(roomId: string, passcode?: string): string {
  const defaultWsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const defaultHost = window.location.host;
  
  let base = import.meta.env.VITE_WS_BASE_URL || `${defaultWsProtocol}//${defaultHost}/ws/whiteboard`;

  // Auto-upgrade ws:// to wss:// when hosted over HTTPS to prevent Mixed Content errors
  if (window.location.protocol === 'https:' && base.startsWith('ws://')) {
    base = base.replace(/^ws:\/\//, 'wss://');
  }

  const cleanBase = base.replace(/\/$/, '');
  const url = new URL(`${cleanBase}/${roomId}/`);

  if (passcode) {
    url.searchParams.set('passcode', passcode);
  }

  return url.toString();
}