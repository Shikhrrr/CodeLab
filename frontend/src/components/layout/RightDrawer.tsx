import { useState } from 'react';
import { Code2, Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import useProjectStore from '../../store/useProjectStore';
import FileTree from '../editor/FileTree';
import CodeEditor from '../editor/CodeEditor';
import AiChatDrawer from '../chat/AiChatDrawer';

// ─── Tab identifiers ──────────────────────────────────────────────────────────

type ActiveTab = 'code' | 'ai';

const DRAWER_WIDTH = 580;

// ─── Tab button ───────────────────────────────────────────────────────────────

interface TabBtnProps {
  active: boolean;
  onClick: () => void;
  accent: string;
  icon: React.ReactNode;
  label: string;
}

function TabBtn({ active, onClick, accent, icon, label }: TabBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '6px 0',
        borderBottom: active ? `3px solid ${accent}` : '3px solid transparent',
        background: active ? accent : 'transparent',
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: '0.12em',
        color: '#121212',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        cursor: 'pointer',
        transition: 'background 0.1s ease',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Right Drawer ─────────────────────────────────────────────────────────────

interface RightDrawerProps {
  roomId: string;
  passcode?: string;
}

export default function RightDrawer({ roomId, passcode }: RightDrawerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('code');

  const rawFiles = useProjectStore((s) => s.files);
  const files = Array.isArray(rawFiles) ? rawFiles : [];
  const activeFileId = useProjectStore((s) => s.activeFileId);
  const setActiveFile = useProjectStore((s) => s.setActiveFileId);

  return (
    <aside
      style={{
        width: collapsed ? 32 : DRAWER_WIDTH,
        minWidth: collapsed ? 32 : DRAWER_WIDTH,
        borderLeft: '3px solid #121212',
        background: '#FAF9F5',
        position: 'relative',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Toggle button ────────────────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        type="button"
        title={collapsed ? 'Open panel' : 'Close panel'}
        style={{
          position: 'absolute',
          top: '50%',
          left: -16,
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 32,
          height: 48,
          border: '2px solid #121212',
          borderRight: 'none',
          background: '#FFE814',
          boxShadow: '-3px 3px 0 #121212',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {collapsed
          ? <ChevronLeft size={16} strokeWidth={3} color="#121212" />
          : <ChevronRight size={16} strokeWidth={3} color="#121212" />}
      </button>

      {/* ── Panel content ────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: collapsed ? 'none' : 'flex',
          flexDirection: 'column',
        }}
      >

        {/* ── Tab bar ─────────────────────────────────────────────────── */}
        <div
          style={{ borderBottom: '2px solid #121212', background: '#F0EFE9' }}
          className="flex shrink-0"
        >
          <TabBtn
            active={activeTab === 'code'}
            onClick={() => setActiveTab('code')}
            accent="#60EFFF"
            icon={<Code2 size={12} strokeWidth={3} />}
            label="CODE EXPLORER"
          />
          <div style={{ width: 2, background: '#121212' }} />
          <TabBtn
            active={activeTab === 'ai'}
            onClick={() => setActiveTab('ai')}
            accent="#FFE814"
            icon={<Bot size={12} strokeWidth={3} />}
            label="AI LOGS"
          />
        </div>

        {/* ── CODE EXPLORER ───────────────────────────────────────────── */}
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{ display: activeTab === 'code' ? 'flex' : 'none' }}
        >
          {/* Section header */}
          <div
            style={{
              borderBottom: '2px solid #121212',
              background: '#121212',
            }}
            className="shrink-0 px-3 py-1.5"
          >
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#60EFFF]">
              Project Files
            </span>
          </div>

          {/* Split: file tree (fixed 180px) + editor (flex) */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* File tree sidebar */}
            <div
              style={{
                width: 180,
                minWidth: 180,
                borderRight: '2px solid #121212',
                background: '#F8F7F2',
                overflowY: 'auto',
              }}
            >
              <FileTree
                files={files}
                activeFileId={activeFileId}
                onSelectFile={(f) => setActiveFile(f.id ?? f.path)}
              />
            </div>

            {/* Monaco editor */}
            <div className="min-w-0 flex-1 overflow-hidden">
              <CodeEditor roomId={roomId} passcode={passcode} />
            </div>
          </div>
        </div>

        {/* ── AI LOGS ─────────────────────────────────────────────────── */}
        <div
          className="min-h-0 flex-1 overflow-hidden flex flex-col"
          style={{ display: activeTab === 'ai' ? 'flex' : 'none' }}
        >
          <AiChatDrawer roomId={roomId} passcode={passcode} />
        </div>
      </div>
    </aside>
  );
}
