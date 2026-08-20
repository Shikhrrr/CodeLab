import { useEffect, useState, useCallback } from 'react';
import useCanvasStore from './store/useCanvasStore';
import useProjectStore from './store/useProjectStore';
import useChatStore from './store/useChatStore';
import useRoomStore from './store/useRoomStore';
import { getCanvasState, listProjectFiles, getChatHistory } from './services/api';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import WhiteboardCanvas from './components/canvas/WhiteboardCanvas';
import RightDrawer from './components/layout/RightDrawer';
import LandingPage from './components/landing/LandingPage';

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
    setRoute({ view: 'room', roomId: cleanId, passcode });
  }, []);

  const handleNavigateToHome = useCallback(() => {
    window.history.pushState({}, '', '/');
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
