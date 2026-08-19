import { useEffect, useState } from 'react';
import useCanvasStore from './store/useCanvasStore';
import useProjectStore from './store/useProjectStore';
import useChatStore from './store/useChatStore';
import useRoomStore from './store/useRoomStore';
import { createRoom, getCanvasState, listProjectFiles, getChatHistory } from './services/api';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import WhiteboardCanvas from './components/canvas/WhiteboardCanvas';
import RightDrawer from './components/layout/RightDrawer';

// ─── URL param helpers ──────────────────────────────────────────────────────────

/** Reads ?room= or ?room_id= from the current URL without mutating it. */
function readRoomFromUrl(): string {
  const p = new URLSearchParams(window.location.search);
  return p.get('room') ?? p.get('room_id') ?? '';
}

/** Reads ?passcode= from the current URL. */
function readPasscodeFromUrl(): string | undefined {
  const p = new URLSearchParams(window.location.search);
  return p.get('passcode') ?? undefined;
}


// ─── Full-screen loading splash ───────────────────────────────────────────────

function LoadingSplash() {
  return (
    <div
      style={{ background: '#FAF9F5' }}
      className="flex h-screen w-screen flex-col items-center justify-center gap-4"
    >
      <div
        style={{
          background: '#FFE814',
          border: '3px solid #121212',
          boxShadow: '6px 6px 0 #121212',
          padding: '12px 24px',
          fontFamily: 'monospace',
          fontSize: 18,
          fontWeight: 900,
          color: '#121212',
          letterSpacing: '0.15em',
          animation: 'loading-pulse 1s ease-in-out infinite alternate',
        }}
      >
        ⚡ CODELAB
      </div>
      <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#999]">
        Loading workspace…
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

function ErrorScreen({ message }: { message: string }) {
  return (
    <div
      style={{ background: '#FAF9F5' }}
      className="flex h-screen w-screen items-center justify-center p-8"
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
          className="px-4 py-2 font-mono text-[12px] font-black uppercase tracking-wider text-white"
        >
          ✗ Failed to load workspace
        </div>
        <div className="p-4 font-mono text-[11px] text-[#c0392b]">{message}</div>
        <div className="border-t-2 border-[#FF6B6B] p-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="neo-btn text-[10px]"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // roomId starts null; set after bootstrap so the render tree never sees a stale ID.
  const [roomId, setRoomId]   = useState<string | null>(null);
  const [passcode]            = useState<string | undefined>(readPasscodeFromUrl);

  // Store actions
  const setRoomData  = useRoomStore((s) => s.setRoomData);
  const setNodes     = useCanvasStore((s) => s.setNodes);
  const setEdges     = useCanvasStore((s) => s.setEdges);
  const setFiles     = useProjectStore((s) => s.setFiles);
  const setMessages  = useChatStore((s) => s.setMessages);

  // ── Bootstrap + hydration ───────────────────────────────────────────────
  useEffect(() => {
    async function bootstrap() {
      try {
        let resolvedId = readRoomFromUrl();
        let resolvedName: string;

        if (resolvedId) {
          // ─ Case A: room ID already in URL ─ use it as-is
          resolvedName = new URLSearchParams(window.location.search).get('name') ?? resolvedId;
        } else {
          // ─ Case B: no room ID ─ ask the backend to create one
          const room = await createRoom('Studio', passcode);
          resolvedId   = room.id;
          resolvedName = room.name;
          // Persist into the address bar so the tab URL is shareable immediately
          window.history.replaceState({}, '', `?room=${resolvedId}`);
        }

        // Commit to store + local state
        setRoomData({ roomId: resolvedId, roomName: resolvedName, passcode });
        setRoomId(resolvedId);

        // Hydrate canvas, files, chat in parallel
        // Each fetch falls back silently so a 404 on a brand-new room doesn't block the UI
        const [canvas, files, history] = await Promise.all([
          getCanvasState(resolvedId, passcode).catch(() => ({ nodes: [], edges: [] })),
          listProjectFiles(resolvedId, passcode).catch(() => []),
          getChatHistory(resolvedId, passcode).catch(() => []),
        ]);

        setNodes(canvas.nodes ?? []);
        setEdges(canvas.edges ?? []);
        setFiles(files);
        setMessages(history);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Failed to initialise workspace: ${msg}`);
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <LoadingSplash />;
  if (error)   return <ErrorScreen message={error} />;

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
      <Header roomId={roomId!} passcode={passcode} />

      <main
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <Sidebar />
        <WhiteboardCanvas roomId={roomId!} passcode={passcode} />
        <RightDrawer roomId={roomId!} passcode={passcode} />
      </main>
    </div>
  );
}
