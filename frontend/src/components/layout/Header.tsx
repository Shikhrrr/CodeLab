import { useState, useCallback } from 'react';
import { Zap, Share2, Download, Cpu, Loader2, Wifi, WifiOff, CloudUpload } from 'lucide-react';
import useRoomStore from '../../store/useRoomStore';
import useProjectStore from '../../store/useProjectStore';
import useCanvasStore from '../../store/useCanvasStore';
import { downloadZip, triggerGeneration } from '../../services/api';

// ─── Props ────────────────────────────────────────────────────────────────────

interface HeaderProps {
  roomId: string;
  passcode?: string;
  onHomeClick?: () => void;
}

// ─── Connection status pill ───────────────────────────────────────────────────

function ConnectionPill({ connected }: { connected: boolean }) {
  return (
    <div
      style={{
        border: '2px solid #121212',
        background: connected ? '#00F59B' : '#FF6B6B',
        padding: '2px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: 900,
        color: '#121212',
        letterSpacing: '0.1em',
        boxShadow: '2px 2px 0 #121212',
      }}
    >
      {connected ? (
        <>
          {/* Pulse dot */}
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#121212',
              display: 'inline-block',
              animation: 'pulse-dot 1.4s ease-in-out infinite',
            }}
          />
          <Wifi size={10} strokeWidth={3} />
          LIVE
        </>
      ) : (
        <>
          <WifiOff size={10} strokeWidth={3} />
          OFFLINE
        </>
      )}
    </div>
  );
}

// ─── Canvas save status pill ─────────────────────────────────────────────────────

function CanvasSavePill() {
  const isSaving = useCanvasStore((s) => s.isSaving);
  return (
    <div
      style={{
        border: '2px solid #121212',
        background: isSaving ? '#FFE814' : '#00F59B',
        padding: '2px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'monospace',
        fontSize: 9,
        fontWeight: 900,
        color: '#121212',
        letterSpacing: '0.08em',
        transition: 'background 0.2s ease',
        animation: isSaving ? 'loading-pulse 0.8s ease-in-out infinite alternate' : 'none',
      }}
    >
      <CloudUpload size={10} strokeWidth={3} />
      {isSaving ? 'SAVING…' : 'SAVED'}
    </div>
  );
}

// ─── Collaborator avatar stack ────────────────────────────────────────────────

function AvatarStack() {
  const users = useRoomStore((s) => s.activeUsers);
  const visible = users.slice(0, 5);
  const overflow = users.length - visible.length;

  if (users.length === 0) return null;

  return (
    <div className="flex items-center" style={{ gap: 0 }}>
      {visible.map((u, i) => (
        <div
          key={u.channel}
          title={u.username}
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: '2px solid #121212',
            background: u.color,
            marginLeft: i === 0 ? 0 : -8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
            fontSize: 10,
            fontWeight: 900,
            color: '#121212',
            zIndex: visible.length - i,
            position: 'relative',
            boxShadow: '1px 1px 0 #121212',
          }}
        >
          {u.username.charAt(0).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: '2px solid #121212',
            background: '#F0EFE9',
            marginLeft: -8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
            fontSize: 9,
            fontWeight: 900,
            color: '#121212',
            zIndex: 0,
            position: 'relative',
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ─── Header action button ─────────────────────────────────────────────────────

interface ActionBtnProps {
  onClick: () => void;
  disabled?: boolean;
  accent: string;
  children: React.ReactNode;
  title?: string;
}

function ActionBtn({ onClick, disabled = false, accent, children, title }: ActionBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        border: '2px solid #121212',
        boxShadow: disabled ? 'none' : '3px 3px 0 #121212',
        background: disabled ? '#eee' : accent,
        padding: '4px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: '0.1em',
        color: '#121212',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.08s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = 'translate(-1px,-1px)';
        el.style.boxShadow = '4px 4px 0 #121212';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = '';
        el.style.boxShadow = '3px 3px 0 #121212';
      }}
      onMouseDown={(e) => {
        if (disabled) return;
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = 'translate(2px,2px)';
        el.style.boxShadow = 'none';
      }}
      onMouseUp={(e) => {
        if (disabled) return;
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = 'translate(-1px,-1px)';
        el.style.boxShadow = '4px 4px 0 #121212';
      }}
    >
      {children}
    </button>
  );
}

// ─── Share toast ──────────────────────────────────────────────────────────────

function ShareToast({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 72,
        right: 16,
        background: '#00F59B',
        border: '2px solid #121212',
        boxShadow: '4px 4px 0 #121212',
        padding: '6px 14px',
        fontFamily: 'monospace',
        fontSize: 11,
        fontWeight: 900,
        color: '#121212',
        zIndex: 9999,
        pointerEvents: 'none',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-6px)',
      }}
    >
      ✓ Room ID copied!
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

export default function Header({ roomId, passcode, onHomeClick }: HeaderProps) {
  const roomName = useRoomStore((s) => s.roomName);
  const isConnected = useRoomStore((s) => s.isConnected);
  const isGenerating = useProjectStore((s) => s.isGenerating);
  const setGenerating = useProjectStore((s) => s.setIsGenerating);
  const setJobId = useProjectStore((s) => s.setCurrentJobId);

  const [shareToast, setShareToast] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── Share ────────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}?room=${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for non-secure contexts
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2000);
  }, [roomId]);

  // ── Export ZIP ───────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await downloadZip(roomId, passcode);
    } catch (err) {
      console.error('[Header] ZIP export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [roomId, passcode, exporting]);

  // ── Quick-build CTA ──────────────────────────────────────────────────────
  const handleBuild = useCallback(async () => {
    if (isGenerating) return;
    setGenerating(true);
    try {
      const job = await triggerGeneration(
        roomId,
        { prompt: 'Generate full starter project', mode: 'SCAFFOLD' },
        passcode,
      );
      setJobId(job.id);
    } catch (err) {
      setGenerating(false);
      console.error('[Header] Generation trigger failed:', err);
    }
  }, [roomId, passcode, isGenerating, setGenerating, setJobId]);

  return (
    <>
      {/* Pulse keyframe injected once */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>

      <ShareToast visible={shareToast} />

      <header
        style={{
          height: 56,
          borderBottom: '3px solid #121212',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 12,
          flexShrink: 0,
          zIndex: 100,
        }}
      >
        {/* ── Brand badge ──────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={onHomeClick}
          title="Return to Home"
          style={{
            background: '#FFE814',
            border: '2px solid #121212',
            boxShadow: '3px 3px 0 #121212',
            padding: '4px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: 900,
            color: '#121212',
            letterSpacing: '0.12em',
            flexShrink: 0,
            cursor: onHomeClick ? 'pointer' : 'default',
            transition: 'transform 0.08s, box-shadow 0.08s',
          }}
          onMouseEnter={(e) => {
            if (!onHomeClick) return;
            const el = e.currentTarget;
            el.style.transform = 'translate(-1px,-1px)';
            el.style.boxShadow = '4px 4px 0 #121212';
          }}
          onMouseLeave={(e) => {
            if (!onHomeClick) return;
            const el = e.currentTarget;
            el.style.transform = 'none';
            el.style.boxShadow = '3px 3px 0 #121212';
          }}
        >
          <Zap size={14} strokeWidth={3} />
          CODELAB
        </button>

        {/* ── Room name ────────────────────────────────────────────────── */}
        <div
          style={{
            border: '2px solid #121212',
            background: '#FAF9F5',
            padding: '3px 10px',
            fontFamily: 'monospace',
            fontSize: 11,
            fontWeight: 700,
            color: '#121212',
            maxWidth: 180,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          title={roomName || roomId}
        >
          {roomName || roomId}
        </div>

        {/* ── Connection status ────────────────────────────────────────── */}
        <ConnectionPill connected={isConnected} />

        {/* ── Canvas save status ──────────────────────────────────────── */}
        <CanvasSavePill />

        {/* ── Avatar stack ───────────────────────────────────────────── */}
        <AvatarStack />

        {/* ── Spacer ───────────────────────────────────────────────────── */}
        <div style={{ flex: 1 }} />

        {/* ── Right actions ────────────────────────────────────────────── */}
        <ActionBtn onClick={() => { void handleShare(); }} accent="#F0EFE9" title="Copy room URL">
          <Share2 size={12} strokeWidth={3} />
          SHARE
        </ActionBtn>

        <ActionBtn
          onClick={() => { void handleExport(); }}
          disabled={exporting}
          accent="#60EFFF"
          title="Download project as ZIP"
        >
          {exporting
            ? <Loader2 size={12} strokeWidth={3} className="animate-spin" />
            : <Download size={12} strokeWidth={3} />}
          {exporting ? 'EXPORTING…' : 'EXPORT ZIP'}
        </ActionBtn>

        <ActionBtn
          onClick={() => { void handleBuild(); }}
          disabled={isGenerating}
          accent="#FFE814"
          title="Trigger AI architecture generation"
        >
          {isGenerating
            ? <Loader2 size={12} strokeWidth={3} className="animate-spin" />
            : <Cpu size={12} strokeWidth={3} />}
          {isGenerating ? 'GENERATING…' : 'BUILD ARCHITECTURE'}
        </ActionBtn>
      </header>
    </>
  );
}
