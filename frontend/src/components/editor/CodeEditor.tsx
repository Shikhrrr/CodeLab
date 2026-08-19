import { useEffect, useRef, useCallback } from 'react';
import MonacoEditor, { type OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { Save, FileCode } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore';
import { getOrUpdateFile } from '../../services/api';

// ─── Language detection ───────────────────────────────────────────────────────

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    py: 'python',
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript',
    json: 'json',
    yml: 'yaml', yaml: 'yaml',
    md: 'markdown', mdx: 'markdown',
    sh: 'shell', bash: 'shell',
    env: 'plaintext',
    toml: 'ini',
    go: 'go',
    rs: 'rust',
    sql: 'sql',
    dockerfile: 'dockerfile',
  };
  // Exact filename match for Dockerfile, .env, etc.
  const basename = path.split('/').pop()?.toLowerCase() ?? '';
  if (basename === 'dockerfile') return 'dockerfile';
  if (basename.startsWith('.env')) return 'plaintext';

  return map[ext] ?? 'plaintext';
}

// ─── Save status pill ─────────────────────────────────────────────────────────

function SavePill({ dirty }: { dirty: boolean }) {
  return (
    <span
      style={{
        background: dirty ? '#FFE814' : '#00F59B',
        border: '2px solid #121212',
        boxShadow: dirty ? '2px 2px 0 #121212' : 'none',
        padding: '1px 8px',
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: 900,
        color: '#121212',
        letterSpacing: '0.1em',
        transition: 'all 0.1s ease',
      }}
    >
      {dirty ? 'UNSAVED' : 'SAVED'}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CodeEditorProps {
  roomId: string;
  passcode?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CodeEditor({ roomId, passcode }: CodeEditorProps) {
  const files          = useProjectStore((s) => s.files);
  const activeFileId   = useProjectStore((s) => s.activeFileId);
  const fileBuffers    = useProjectStore((s) => s.fileBuffers);
  const updateBuffer   = useProjectStore((s) => s.updateFileBuffer);
  const commitContent  = useProjectStore((s) => s.commitFileContent);

  const activeFile   = files.find((f) => f.id === activeFileId) ?? null;
  const bufferValue  = activeFileId ? (fileBuffers[activeFileId] ?? activeFile?.content ?? '') : '';
  const isDirty      = activeFileId ? activeFileId in fileBuffers : false;

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef    = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  // ── Persist to backend ───────────────────────────────────────────────────
  const saveFile = useCallback(async () => {
    if (!activeFile || !activeFileId) return;
    const content = fileBuffers[activeFileId] ?? activeFile.content;
    try {
      await getOrUpdateFile(roomId, activeFileId, content, passcode);
      commitContent(activeFileId, content);
    } catch (err) {
      console.error('[CodeEditor] Save failed:', err);
    }
  }, [activeFile, activeFileId, fileBuffers, roomId, passcode, commitContent]);

  // ── Debounced auto-save (1500ms) ─────────────────────────────────────────
  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void saveFile(); }, 1500);
  }, [saveFile]);

  // ── Monaco mount: register Cmd/Ctrl+S ────────────────────────────────────
  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    editor.addCommand(
      // Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.KeyS
      2048 | 49, // CtrlCmd=2048, KeyS=49
      () => { void saveFile(); },
    );
  }, [saveFile]);

  // Clear timer on unmount
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  // ── No active file ───────────────────────────────────────────────────────
  if (!activeFile) {
    return (
      <div
        style={{ border: '2px solid #121212', background: '#FAF9F5' }}
        className="flex h-full flex-col items-center justify-center gap-3"
      >
        <FileCode size={32} strokeWidth={1.5} className="text-[#ccc]" />
        <p className="font-mono text-[11px] text-[#999]">Select a file to edit</p>
      </div>
    );
  }

  return (
    <div
      style={{ border: '2px solid #121212', background: '#FFFFFF' }}
      className="flex h-full flex-col overflow-hidden"
    >
      {/* ── Action bar ─────────────────────────────────────────────────── */}
      <div
        style={{ borderBottom: '2px solid #121212', background: '#FAF9F5' }}
        className="flex items-center justify-between gap-2 px-3 py-1.5"
      >
        {/* File path breadcrumb */}
        <div className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-[#555]">
          {activeFile.path.split('/').map((seg, i, arr) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-[#ccc]">/</span>}
              <span className={i === arr.length - 1 ? 'font-black text-[#121212]' : ''}>
                {seg}
              </span>
            </span>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex shrink-0 items-center gap-2">
          <SavePill dirty={isDirty} />
          <button
            type="button"
            onClick={() => { void saveFile(); }}
            disabled={!isDirty}
            style={{
              border: '2px solid #121212',
              boxShadow: isDirty ? '2px 2px 0 #121212' : 'none',
              background: isDirty ? '#60EFFF' : '#eee',
              padding: '2px 8px',
              cursor: isDirty ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'monospace',
              fontSize: 10,
              fontWeight: 900,
              color: '#121212',
              transition: 'all 0.08s ease',
            }}
          >
            <Save size={11} strokeWidth={3} />
            SAVE
          </button>
        </div>
      </div>

      {/* ── Monaco editor ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          key={activeFile.id}                    // remount on file switch
          language={detectLanguage(activeFile.path)}
          value={bufferValue}
          theme="vs"
          onMount={handleMount}
          onChange={(val) => {
            if (val === undefined || !activeFileId) return;
            updateBuffer(activeFileId, val);
            scheduleAutoSave();
          }}
          options={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 13,
            lineHeight: 20,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            renderLineHighlight: 'line',
            overviewRulerLanes: 0,
            padding: { top: 12, bottom: 12 },
          }}
          height="100%"
          width="100%"
        />
      </div>
    </div>
  );
}
