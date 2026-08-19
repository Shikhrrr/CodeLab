import { useState, useMemo } from 'react';
import {
  Server,
  Database,
  Cpu,
  Layers,
  Globe,
  Wrench,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import { NODE_ROLES, ROLE_ORDER, defaultTechForRole } from '../../config/nodeConfig';

// ─── Role → icon map ──────────────────────────────────────────────────────────

const ROLE_ICONS: Record<string, React.ElementType> = {
  backend:  Server,
  frontend: Monitor,
  database: Database,
  cache:    Cpu,
  queue:    Layers,
  gateway:  Globe,
  worker:   Wrench,
};

// ─── Individual draggable card ────────────────────────────────────────────────

interface PaletteCardProps {
  role: string;
}

function PaletteCard({ role }: PaletteCardProps) {
  const cfg  = NODE_ROLES[role];
  if (!cfg) return null;

  const Icon        = ROLE_ICONS[role] ?? Server;
  const defaultTech = defaultTechForRole(role);

  function handleDragStart(event: React.DragEvent<HTMLDivElement>) {
    event.dataTransfer.effectAllowed = 'move';
    const payload = JSON.stringify({
      role,
      technology:  defaultTech.name,
      port:        defaultTech.port,
      description: '',
    });
    event.dataTransfer.setData('application/reactflow', payload);
    event.dataTransfer.setData('text/plain', payload);
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group cursor-grab active:cursor-grabbing"
      style={{
        border: '2px solid #121212',
        boxShadow: '4px 4px 0px 0px #121212',
        background: '#FFFFFF',
        transition: 'transform 0.08s ease, box-shadow 0.08s ease',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translate(-2px, -2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '6px 6px 0px 0px #121212';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translate(0, 0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '4px 4px 0px 0px #121212';
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translate(2px, 2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translate(-2px, -2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '6px 6px 0px 0px #121212';
      }}
    >
      {/* Colour header strip */}
      <div
        style={{ background: cfg.color, borderBottom: '2px solid #121212' }}
        className="flex items-center gap-2 px-2.5 py-1.5"
      >
        <Icon size={13} strokeWidth={2.5} color="#121212" />
        <span className="font-mono text-[11px] font-black uppercase tracking-wider text-[#121212]">
          {cfg.label}
        </span>
      </div>

      {/* Tech pills */}
      <div className="flex flex-wrap gap-1 px-2.5 py-2">
        {cfg.techs.slice(0, 3).map((t) => (
          <span
            key={t.name}
            style={{ background: cfg.color, border: '1px solid #121212' }}
            className="font-mono text-[9px] font-bold px-1.5 py-0.5 text-[#121212]"
          >
            {t.name}
          </span>
        ))}
        {cfg.techs.length > 3 && (
          <span className="font-mono text-[9px] text-[#888] self-center">
            +{cfg.techs.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const [collapsed,  setCollapsed]  = useState(false);
  const [query,      setQuery]      = useState('');

  const filteredRoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROLE_ORDER;
    return ROLE_ORDER.filter((role) => {
      const cfg = NODE_ROLES[role];
      if (!cfg) return false;
      if (cfg.label.toLowerCase().includes(q)) return true;
      return cfg.techs.some((t) => t.name.toLowerCase().includes(q));
    });
  }, [query]);

  return (
    <aside
      style={{
        width: collapsed ? 32 : 220,
        minWidth: collapsed ? 32 : 220,
        borderRight: '3px solid #121212',
        background: '#FAF9F5',
        position: 'relative',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        flexShrink: 0,
      }}
    >
      {/* Inner content — hidden when collapsed */}
      <div
        style={{
          height: '100%',
          display: collapsed ? 'none' : 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
          {/* Header */}
          <div
            style={{ borderBottom: '2px solid #121212', background: '#121212' }}
            className="px-3 py-2.5"
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFE814]">
              Architecture Blocks
            </p>
            <p className="font-mono text-[9px] text-[#888] mt-0.5">
              Drag onto canvas →
            </p>
          </div>

          {/* Search */}
          <div
            style={{ borderBottom: '2px solid #121212', background: '#FFFFFF' }}
            className="relative flex items-center"
          >
            <Search
              size={11}
              strokeWidth={2.5}
              className="absolute left-2.5 text-[#888] pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tech… e.g. MySQL"
              style={{
                width: '100%',
                padding: '6px 28px 6px 26px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 10,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#121212',
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 text-[#888] hover:text-[#121212]"
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {filteredRoles.length === 0 ? (
              <p className="font-mono text-[10px] text-[#999] text-center pt-4">
                No blocks match "{query}"
              </p>
            ) : (
              filteredRoles.map((role) => (
                <PaletteCard key={role} role={role} />
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{ borderTop: '2px solid #121212' }}
            className="px-3 py-2 font-mono text-[9px] text-[#999] bg-[#F0EFE9]"
          >
            {filteredRoles.length}/{ROLE_ORDER.length} block types · drag to place
          </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        type="button"
        title={collapsed ? 'Open palette' : 'Close palette'}
        style={{
          position: 'absolute',
          top: '50%',
          right: -16,
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 32,
          height: 48,
          border: '2px solid #121212',
          borderLeft: 'none',
          background: '#FFE814',
          boxShadow: '3px 3px 0px 0px #121212',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {collapsed ? (
          <ChevronRight size={16} strokeWidth={3} color="#121212" />
        ) : (
          <ChevronLeft size={16} strokeWidth={3} color="#121212" />
        )}
      </button>
    </aside>
  );
}
