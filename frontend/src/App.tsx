import { useEffect, useState, useCallback } from 'react';
import { Lock, Key, AlertTriangle } from 'lucide-react';
import useCanvasStore from './store/useCanvasStore';
import useProjectStore from './store/useProjectStore';
import useChatStore from './store/useChatStore';
import useRoomStore from './store/useRoomStore';
import { getCanvasState, listProjectFiles, getChatHistory, verifyRoom } from './services/api';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import WhiteboardCanvas from './components/canvas/WhiteboardCanvas';
import RightDrawer from './components/layout/RightDrawer';
import LandingPage from './components/landing/LandingPage';

// ─── Passcode Prompt Modal ─────────────────────────────────────────────────────

function PasscodePromptModal({
  roomId,
  onSubmit,
  onCancel,
  errorMessage,
}: {
  roomId: string;
  onSubmit: (passcode: string) => void;
  onCancel: () => void;
  errorMessage?: string | null;
}) {
  const [passcode, setPasscode] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-mono">
      <div className="w-full max-w-md bg-[#FFFDF0] border-4 border-black shadow-[10px_10px_0px_0px_#121212] overflow-hidden">
        <div className="bg-[#FFE814] border-b-4 border-black px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={18} strokeWidth={3} />
            <span className="font-black text-sm uppercase tracking-wider">WORKSPACE PROTECTED</span>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (passcode.trim()) onSubmit(passcode.trim());
          }}
          className="p-6 space-y-5"
        >
          <p className="text-xs font-bold text-[#444] leading-relaxed">
            Workspace <span className="font-black text-[#121212] bg-[#FFDE59] px-1.5 py-0.5 border border-black">{roomId}</span> is protected. Enter passcode to join.
          </p>

          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-[#121212] flex items-center gap-1.5">
              <Key size={14} />
              <span>ROOM PASSCODE:</span>
            </label>
            <input
              type="password"
              autoFocus
              required
              placeholder="Enter room passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-[#FFFFFF] border-3 border-black p-3.5 font-mono text-base font-bold text-[#121212] outline-none shadow-[4px_4px_0px_0px_#121212] focus:border-black focus:bg-[#FFFDE0]"
            />
          </div>

          {errorMessage && (
            <div className="bg-[#FF6B6B] border-3 border-black p-3 text-white font-bold text-xs shadow-[3px_3px_0px_0px_#121212] flex items-center gap-2">
              <AlertTriangle size={16} strokeWidth={3} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="bg-white border-3 border-black px-4 py-2.5 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#121212] hover:bg-[#FAF9F5] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              RETURN HOME
            </button>
            <button
              type="submit"
              disabled={!passcode.trim()}
              className="bg-[#A6FF00] border-3 border-black px-6 py-2.5 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#121212] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
            >
              UNLOCK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Route State & Parser ──────────────────────────────────────────────────────

interface RouteState {
  view: 'landing' | 'room';
  roomId: string | null;
  passcode?: string;
}

/**
 * Parses the current browser URL to determine if we should show the Landing Page
 * or a specific collaborative Room workspace.
 */
function parseRouteFromLocation(): RouteState {
  const p = new URLSearchParams(window.location.search);
  const passcode = p.get('passcode') ?? undefined;

  // 1. Check path-based route: /room/:id
  const pathname = window.location.pathname;
  if (pathname.startsWith('/room/')) {
    const rawId = pathname.replace(/^\/room\//, '').split('/')[0].trim();
    if (rawId) {
      return { view: 'room', roomId: rawId, passcode };
    }
  }

  // 2. Check query-param route: ?room=... or ?room_id=...
  const queryRoom = p.get('room') ?? p.get('room_id');
  if (queryRoom && queryRoom.trim()) {
    return { view: 'room', roomId: queryRoom.trim(), passcode };
  }

  // 3. Root path / without room params displays the Landing Page
  return { view: 'landing', roomId: null, passcode };
}

// ─── Full-screen loading splash ───────────────────────────────────────────────

function LoadingSplash() {
  return (
    <div
      style={{ background: '#FAF9F5' }}
      className="flex h-screen w-screen flex-col items-center justify-center gap-4 font-mono"
    >
      <div
        style={{
          background: '#FFE814',
          border: '3px solid #121212',
          boxShadow: '6px 6px 0 #121212',
          padding: '12px 24px',
          fontSize: 18,
          fontWeight: 900,
          color: '#121212',
          letterSpacing: '0.15em',
          animation: 'loading-pulse 1s ease-in-out infinite alternate',
        }}
      >
        ⚡ CODELAB
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#666]">
        Hydrating workspace…
      </p>
      <style>{`
        @keyframes loading-pulse {
          from { box-shadow: 6px 6px 0 #121212; transform: translate(0,0); }
          to   { box-shadow: 3px 3px 0 #121212; transform: translate(2px,2px); }
        }
      `}</style>
    </div>
  );
}

// ─── Error screen ─────────────────────────────────────────────────────────────

function ErrorScreen({
  message,
  onRetry,
  onGoHome,
}: {
  message: string;
  onRetry: () => void;
  onGoHome: () => void;
}) {
  return (
    <div
      style={{ background: '#FAF9F5' }}
      className="flex h-screen w-screen items-center justify-center p-8 font-mono"
    >
      <div
        style={{
          border: '3px solid #FF6B6B',
          boxShadow: '6px 6px 0 #121212',
          background: '#FFF0F0',
          maxWidth: 480,
          width: '100%',
        }}
      >
        <div
          style={{ background: '#FF6B6B', borderBottom: '2px solid #121212' }}
          className="px-4 py-2 text-[12px] font-black uppercase tracking-wider text-white"
        >
          ✗ Failed to load workspace
        </div>
        <div className="p-4 text-[11px] text-[#c0392b] font-bold">{message}</div>
        <div className="border-t-2 border-[#FF6B6B] p-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="neo-btn text-[10px]"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onGoHome}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#FFFFFF',
              fontWeight: 800,
              color: '#121212',
              border: '2px solid #121212',
              boxShadow: '2px 2px 0 #121212',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App Component ─────────────────────────────────────────────────────────────

export default function App() {
  const [route, setRoute]     = useState<RouteState>(parseRouteFromLocation);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError]     = useState<string | null>(null);

  const [passcodePromptRequired, setPasscodePromptRequired] = useState<boolean>(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // Store actions
  const setRoomData  = useRoomStore((s) => s.setRoomData);
  const setNodes     = useCanvasStore((s) => s.setNodes);
  const setEdges     = useCanvasStore((s) => s.setEdges);
  const setFiles     = useProjectStore((s) => s.setFiles);
  const setMessages  = useChatStore((s) => s.setMessages);

  // ── Navigation callbacks ───────────────────────────────────────────────────

  const handleNavigateToRoom = useCallback((targetRoomId: string, passcode?: string) => {
    const cleanId = targetRoomId.trim();
    const url = passcode
      ? `/room/${cleanId}?passcode=${encodeURIComponent(passcode)}`
      : `/room/${cleanId}`;
    window.history.pushState({}, '', url);
    setPasscodePromptRequired(false);
    setPasscodeError(null);
    setRoute({ view: 'room', roomId: cleanId, passcode });
  }, []);

  const handleNavigateToHome = useCallback(() => {
    window.history.pushState({}, '', '/');
    setPasscodePromptRequired(false);
    setPasscodeError(null);
    setRoute({ view: 'landing', roomId: null, passcode: undefined });
  }, []);

  // ── Listen to Browser Back / Forward navigation ────────────────────────────
  useEffect(() => {
    function handlePopState() {
      setRoute(parseRouteFromLocation());
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ── Room Hydration Lifecycle ───────────────────────────────────────────────
  useEffect(() => {
    if (route.view !== 'room' || !route.roomId) {
      setLoading(false);
      return;
    }

    let isCancelled = false;

    async function hydrateRoom(targetId: string, passcode?: string) {
      setLoading(true);
      setError(null);

      try {
        const resolvedName =
          new URLSearchParams(window.location.search).get('name') ?? targetId;

        // Verify room access permissions first
        const v = await verifyRoom(targetId, passcode).catch(() => null);
        if (isCancelled) return;

        if (v && v.exists) {
          if (v.is_locked) {
            setError('This workspace is locked and cannot be accessed.');
            setLoading(false);
            return;
          }
          if (v.is_protected && (v.access === false || (!passcode && v.is_protected))) {
            setPasscodePromptRequired(true);
            if (passcode && v.access === false) {
              setPasscodeError('Incorrect passcode. Please try again.');
            } else {
              setPasscodeError(null);
            }
            setLoading(false);
            return;
          }
        }

        // Commit to store
        setRoomData({ roomId: targetId, roomName: resolvedName, passcode });

        // Hydrate canvas, files, chat in parallel
        const [canvas, files, history] = await Promise.all([
          getCanvasState(targetId, passcode).catch(() => ({ nodes: [], edges: [] })),
          listProjectFiles(targetId, passcode).catch(() => []),
          getChatHistory(targetId, passcode).catch(() => []),
        ]);

        if (isCancelled) return;

        setNodes(canvas.nodes ?? []);
        setEdges(canvas.edges ?? []);
        setFiles(files);
        setMessages(history);
      } catch (err: unknown) {
        if (isCancelled) return;
        console.error('Failed to hydrate room:', err);
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Failed to initialise workspace: ${msg}`);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    void hydrateRoom(route.roomId, route.passcode);

    return () => {
      isCancelled = true;
    };
  }, [route.view, route.roomId, route.passcode, setRoomData, setNodes, setEdges, setFiles, setMessages]);

  // ── Route View: Landing Page (root /) ──────────────────────────────────────
  if (route.view === 'landing') {
    return <LandingPage onNavigateToRoom={handleNavigateToRoom} />;
  }

  // ── Passcode Required Prompt Modal ───────────────────────────────────────
  if (passcodePromptRequired && route.roomId) {
    return (
      <PasscodePromptModal
        roomId={route.roomId}
        errorMessage={passcodeError}
        onSubmit={(passcode) => handleNavigateToRoom(route.roomId!, passcode)}
        onCancel={handleNavigateToHome}
      />
    );
  }

  // ── Route View: Collaborative Whiteboard Studio (/room/:id) ────────────────
  if (loading) return <LoadingSplash />;
  if (error) {
    return (
      <ErrorScreen
        message={error}
        onRetry={() => {
          if (route.roomId) {
            setRoute({ ...route });
          }
        }}
        onGoHome={handleNavigateToHome}
      />
    );
  }

  return (
    /*
     * Full-viewport shell:
     *   ┌──────────────── Header (h-14, shrink-0) ────────────────┐
     *   │ Sidebar │        WhiteboardCanvas        │  RightDrawer  │
     *   └─────────────────────────────────────────────────────────┘
     */
    <div
      style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <Header
        roomId={route.roomId!}
        passcode={route.passcode}
        onHomeClick={handleNavigateToHome}
      />

      <main
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <Sidebar />
        <WhiteboardCanvas roomId={route.roomId!} passcode={route.passcode} />
        <RightDrawer roomId={route.roomId!} passcode={route.passcode} />
      </main>
    </div>
  );
}
