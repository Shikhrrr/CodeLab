import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, AlertTriangle, Loader2, Wrench, MessageSquare, Layers } from 'lucide-react';
import axios from 'axios';
import useChatStore from '../../store/useChatStore';
import useProjectStore from '../../store/useProjectStore';
import { triggerGeneration } from '../../services/api';
import type { ChatMessage } from '../../types';

// ─── Message card ─────────────────────────────────────────────────────────────

function MessageCard({ msg }: { msg: ChatMessage }) {
  const ts = new Date(msg.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // ── User ────────────────────────────────────────────────────────────────
  if (msg.role === 'user') {
    return (
      <div
        style={{ border: '2px solid #121212', boxShadow: '3px 3px 0 #121212', background: '#fff' }}
        className="space-y-1"
      >
        <div
          style={{ borderBottom: '2px solid #121212', background: '#60EFFF' }}
          className="flex items-center justify-between px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-[#121212]"
        >
          <span>YOU</span>
          <span className="font-normal opacity-60">{ts}</span>
        </div>
        <p className="px-2.5 pb-2 font-mono text-[11px] text-[#121212] whitespace-pre-wrap break-words">
          {msg.content}
        </p>
      </div>
    );
  }

  // ── System / error ───────────────────────────────────────────────────────
  if (msg.role === 'system') {
    return (
      <div
        style={{ border: '2px solid #FF6B6B', boxShadow: '3px 3px 0 #121212', background: '#FFF0F0' }}
        className="space-y-1"
      >
        <div
          style={{ borderBottom: '2px solid #FF6B6B', background: '#FF6B6B' }}
          className="flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] font-black uppercase text-white"
        >
          <AlertTriangle size={11} strokeWidth={3} />
          <span>SYSTEM</span>
          <span className="ml-auto font-normal opacity-70">{ts}</span>
        </div>
        <ul className="space-y-0.5 px-2.5 pb-2">
          {msg.content.split('\n').filter(Boolean).map((line, i) => (
            <li key={i} className="flex gap-1.5 font-mono text-[11px] text-[#c0392b]">
              <span className="mt-px shrink-0 font-black">›</span>
              {line}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ── Assistant ────────────────────────────────────────────────────────────
  return (
    <div
      style={{ border: '2px solid #121212', boxShadow: '3px 3px 0 #121212', background: '#FFFEF0' }}
      className="space-y-1"
    >
      <div
        style={{ borderBottom: '2px solid #121212', background: '#FFE814' }}
        className="flex items-center justify-between px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-[#121212]"
      >
        <span>AI AGENT</span>
        <span className="font-normal opacity-60">{ts}</span>
      </div>
      <p className="px-2.5 pb-2 font-mono text-[11px] text-[#121212] whitespace-pre-wrap break-words leading-relaxed">
        {msg.content}
      </p>
    </div>
  );
}

// ─── Streaming indicator ──────────────────────────────────────────────────────

function StreamingDots() {
  return (
    <div
      style={{ border: '2px solid #121212', background: '#FFE814' }}
      className="flex items-center gap-2 px-3 py-2"
    >
      <Loader2 size={12} className="animate-spin text-[#121212]" strokeWidth={3} />
      <span className="font-mono text-[10px] font-black uppercase tracking-wider text-[#121212]">
        AI AGENT IS THINKING…
      </span>
    </div>
  );
}

// ─── Mode selector ────────────────────────────────────────────────────────────

type GenerationMode = 'SCAFFOLD' | 'EXPLAIN' | 'EDIT';

const MODE_CONFIG: Record<GenerationMode, { label: string; color: string; icon: React.ReactNode; placeholder: string }> = {
  SCAFFOLD: {
    label: 'SCAFFOLD',
    color: '#FFE814',
    icon: <Layers size={10} strokeWidth={3} />,
    placeholder: 'Describe the architecture you want to scaffold… (Enter to send)',
  },
  EXPLAIN: {
    label: 'EXPLAIN',
    color: '#60EFFF',
    icon: <MessageSquare size={10} strokeWidth={3} />,
    placeholder: 'Ask a question about the current architecture… (Enter to send)',
  },
  EDIT: {
    label: 'EDIT FILE',
    color: '#00F59B',
    icon: <Wrench size={10} strokeWidth={3} />,
    placeholder: 'Describe the change to make to the active file… (Enter to send)',
  },
};

function ModePill({
  mode,
  active,
  onClick,
}: {
  mode: GenerationMode;
  active: boolean;
  onClick: () => void;
}) {
  const cfg = MODE_CONFIG[mode];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: '2px solid #121212',
        background: active ? cfg.color : '#F0EFE9',
        boxShadow: active ? '2px 2px 0 #121212' : 'none',
        padding: '2px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'monospace',
        fontSize: 9,
        fontWeight: 900,
        color: '#121212',
        letterSpacing: '0.08em',
        cursor: 'pointer',
        transition: 'all 0.08s ease',
      }}
    >
      {cfg.icon}
      {cfg.label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AiChatDrawerProps {
  roomId: string;
  passcode?: string;
}

export default function AiChatDrawer({ roomId, passcode }: AiChatDrawerProps) {
  const rawMessages   = useChatStore((s) => s.messages);
  const messages      = Array.isArray(rawMessages) ? rawMessages : [];
  const isStreaming  = useChatStore((s) => s.isStreaming);
  const addMessage   = useChatStore((s) => s.addMessage);
  const isGenerating = useProjectStore((s) => s.isGenerating);
  const setGenerating = useProjectStore((s) => s.setIsGenerating);
  const setJobId     = useProjectStore((s) => s.setCurrentJobId);
  const activeFileId = useProjectStore((s) => s.activeFileId);
  const files        = useProjectStore((s) => s.files);

  const activeFile   = Array.isArray(files) ? files.find((f) => f.id === activeFileId) : undefined;

  const [prompt, setPrompt]           = useState('');
  const [mode, setMode]               = useState<GenerationMode>('SCAFFOLD');
  const [conflictBanner, setConflictBanner] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // ── Submit handler ───────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const text = prompt.trim();
    if (!text || isGenerating) return;

    setConflictBanner(false);

    // Optimistically append user message
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    });
    setPrompt('');
    setGenerating(true);

    try {
      const job = await triggerGeneration(
        roomId,
        {
          prompt: text,
          mode,
          active_file_path: mode === 'EDIT' ? (activeFile?.path ?? undefined) : undefined,
        },
        passcode,
      );
      setJobId(job.id);
    } catch (err: unknown) {
      setGenerating(false);

      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setConflictBanner(true);
        return;
      }

      // Surface generic errors as a system message
      const detail =
        axios.isAxiosError(err)
          ? (err.response?.data as { detail?: string })?.detail ?? err.message
          : String(err);

      addMessage({
        id: crypto.randomUUID(),
        role: 'system',
        content: `Generation failed:\n${detail}`,
        timestamp: new Date().toISOString(),
      });
    }
  }, [prompt, isGenerating, addMessage, setGenerating, setJobId, roomId, passcode]);

  // ── Keyboard shortcut: Enter (no shift) ─────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <div
      style={{ background: '#FAF9F5' }}
      className="flex h-full flex-col overflow-hidden"
    >
      {/* ── Mode selector ─────────────────────────────────────────────── */}
      <div
        style={{ borderBottom: '2px solid #121212', background: '#FAF9F5' }}
        className="flex items-center gap-1.5 px-3 py-1.5"
      >
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#999] mr-1">MODE</span>
        {(['SCAFFOLD', 'EXPLAIN', 'EDIT'] as GenerationMode[]).map((m) => (
          <ModePill key={m} mode={m} active={mode === m} onClick={() => setMode(m)} />
        ))}
        {mode === 'EDIT' && activeFile && (
          <span
            style={{ border: '1px solid #121212', background: '#00F59B', padding: '1px 6px' }}
            className="ml-auto font-mono text-[9px] font-bold truncate max-w-[120px]"
            title={activeFile.path}
          >
            {activeFile.path.split('/').pop()}
          </span>
        )}
        {mode === 'EDIT' && !activeFile && (
          <span className="ml-auto font-mono text-[9px] text-[#999]">← select a file first</span>
        )}
      </div>

      {/* ── 409 Conflict banner ─────────────────────────────────────────── */}
      {conflictBanner && (
        <div
          style={{
            borderBottom: '2px solid #FF6B6B',
            background: '#FF6B6B',
          }}
          className="flex items-center gap-2 px-3 py-2 font-mono text-[11px] font-black text-white"
        >
          <AlertTriangle size={13} strokeWidth={3} />
          <span>Generation in progress by another peer — please wait.</span>
          <button
            type="button"
            onClick={() => setConflictBanner(false)}
            className="ml-auto font-mono text-[10px] underline"
          >
            dismiss
          </button>
        </div>
      )}

      {/* ── Message list ───────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full items-center justify-center font-mono text-[11px] text-[#aaa]">
            No messages yet. Describe the architecture you want to build.
          </div>
        )}
        {messages.map((msg) => (
          <MessageCard key={msg.id} msg={msg} />
        ))}
        {isStreaming && <StreamingDots />}
      </div>

      {/* ── Input area ─────────────────────────────────────────────────── */}
      <div
        style={{ borderTop: '2px solid #121212', background: '#FFFFFF' }}
        className="space-y-2 p-3"
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={MODE_CONFIG[mode].placeholder}
          disabled={isGenerating}
          rows={3}
          style={{
            width: '100%',
            resize: 'none',
            border: '2px solid #121212',
            boxShadow: '2px 2px 0 #121212',
            background: isGenerating ? '#F5F5F5' : '#FFFFFF',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 11,
            padding: '8px 10px',
            outline: 'none',
            color: '#121212',
            boxSizing: 'border-box',
          }}
        />

        <button
          type="button"
          onClick={() => { void handleSubmit(); }}
          disabled={isGenerating || !prompt.trim()}
          style={{
            width: '100%',
            border: '2px solid #121212',
            boxShadow: isGenerating || !prompt.trim() ? 'none' : '4px 4px 0 #121212',
            background: isGenerating
              ? '#eee'
              : prompt.trim()
              ? '#FFE814'
              : '#F5F5F5',
            padding: '8px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontFamily: 'monospace',
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: '0.12em',
            color: '#121212',
            cursor: isGenerating || !prompt.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.08s ease',
          }}
          onMouseEnter={(e) => {
            if (isGenerating || !prompt.trim()) return;
            (e.currentTarget as HTMLButtonElement).style.transform = 'translate(-2px,-2px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '6px 6px 0 #121212';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = '';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = prompt.trim() ? '4px 4px 0 #121212' : 'none';
          }}
          onMouseDown={(e) => {
            if (isGenerating || !prompt.trim()) return;
            (e.currentTarget as HTMLButtonElement).style.transform = 'translate(2px,2px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          {isGenerating ? (
            <><Loader2 size={14} className="animate-spin" strokeWidth={3} /> GENERATING…</>
          ) : (
            <><Send size={14} strokeWidth={3} /> BUILD ARCHITECTURE</>
          )}
        </button>
      </div>
    </div>
  );
}
