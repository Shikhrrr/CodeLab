import { useState } from 'react';
import {
  Server,
  Database,
  Cpu,
  Layers,
  Globe,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { ArchitectureNodeType } from '../../types';

// ─── Palette item definitions ─────────────────────────────────────────────────

interface PaletteItem {
  type: ArchitectureNodeType;
  label: string;
  techStack: string;
  port: number;
  description: string;
  bg: string;
  Icon: React.ElementType;
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: 'service',
    label: 'Web Service',
    techStack: 'FastAPI',
    port: 8000,
    description: 'HTTP microservice or REST API',
    bg: '#FFE814',
    Icon: Server,
  },
  {
    type: 'database',
    label: 'Database',
    techStack: 'Postgres',
    port: 5432,
    description: 'Relational or document store',
    bg: '#60EFFF',
    Icon: Database,
  },
  {
    type: 'cache',
    label: 'Redis Cache',
    techStack: 'Redis',
    port: 6379,
    description: 'In-memory cache / pub-sub',
    bg: '#FF69B4',
    Icon: Cpu,
  },
  {
    type: 'queue',
    label: 'Message Queue',
    techStack: 'Kafka',
    port: 9092,
    description: 'Async event / message broker',
    bg: '#00F59B',
    Icon: Layers,
  },
  {
    type: 'gateway',
    label: 'API Gateway',
    techStack: 'Nginx',
    port: 80,
    description: 'Reverse proxy / rate limiter',
    bg: '#FF8C42',
    Icon: Globe,
  },
  {
    type: 'worker',
    label: 'Worker',
    techStack: 'Celery',
    port: 0,
    description: 'Async task / background job runner',
    bg: '#C084FC',
    Icon: Cpu,
  },
  {
    type: 'frontend',
    label: 'Frontend',
    techStack: 'React',
    port: 3000,
    description: 'Client-side web application',
    bg: '#FCA5A5',
    Icon: Globe,
  },
];

// ─── Individual draggable card ────────────────────────────────────────────────

function PaletteCard({ item }: { item: PaletteItem }) {
  const { type, label, techStack, port, description, bg, Icon } = item;

  function handleDragStart(event: React.DragEvent<HTMLDivElement>) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify({ type, label, techStack, port }),
    );
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
        style={{ background: bg, borderBottom: '2px solid #121212' }}
        className="flex items-center gap-2 px-2.5 py-1.5"
      >
        <Icon size={13} strokeWidth={2.5} color="#121212" />
        <span className="font-mono text-[11px] font-black uppercase tracking-wider text-[#121212]">
          {label}
        </span>
      </div>

      {/* Body */}
      <div className="space-y-1 px-2.5 py-2 font-mono text-[10px] text-[#121212]">
        <div className="flex items-center gap-1.5">
          <span
            style={{ background: bg, border: '1px solid #121212' }}
            className="px-1 font-bold"
          >
            {techStack}
          </span>
          <span className="text-[#555]">:{port}</span>
        </div>
        <p className="text-[#666] leading-tight">{description}</p>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      style={{
        width: collapsed ? 0 : 220,
        minWidth: collapsed ? 0 : 220,
        borderRight: collapsed ? 'none' : '3px solid #121212',
        background: '#FAF9F5',
        position: 'relative',
        transition: 'width 0.15s ease, min-width 0.15s ease',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Inner content — hidden when collapsed */}
      {!collapsed && (
        <div className="flex h-full flex-col">
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

          {/* Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {PALETTE_ITEMS.map((item) => (
              <PaletteCard key={item.type} item={item} />
            ))}
          </div>

          {/* Footer hint */}
          <div
            style={{ borderTop: '2px solid #121212' }}
            className="px-3 py-2 font-mono text-[9px] text-[#999] bg-[#F0EFE9]"
          >
            7 block types · drag to place
          </div>
        </div>
      )}

      {/* Toggle button — sits flush against the right edge */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        type="button"
        title={collapsed ? 'Open palette' : 'Close palette'}
        style={{
          position: 'absolute',
          top: '50%',
          right: collapsed ? -36 : -18,
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 32,
          height: 48,
          border: '2px solid #121212',
          borderLeft: collapsed ? '2px solid #121212' : 'none',
          background: '#FFE814',
          boxShadow: '3px 3px 0px 0px #121212',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'right 0.15s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform =
            'translateY(calc(-50% - 1px)) translateX(-1px)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            '4px 4px 0px 0px #121212';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-50%)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            '3px 3px 0px 0px #121212';
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
