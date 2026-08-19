import { memo, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import {
  Server,
  Database,
  Cpu,
  Layers,
  Globe,
  Wrench,
  Monitor,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';
import type { ArchitectureNodeType, CustomNodeData } from '../../types';

// ─── Per-type design tokens ───────────────────────────────────────────────────

interface NodeConfig {
  bg: string;
  accent: string;
  Icon: React.ElementType;
  label: string;
}

const NODE_CONFIG: Record<ArchitectureNodeType, NodeConfig> = {
  service:  { bg: '#FFE814', accent: '#d4be00', Icon: Server,   label: 'Service'  },
  database: { bg: '#60EFFF', accent: '#00c8e0', Icon: Database, label: 'Database' },
  cache:    { bg: '#FF69B4', accent: '#d94090', Icon: Cpu,      label: 'Cache'    },
  queue:    { bg: '#00F59B', accent: '#00c278', Icon: Layers,   label: 'Queue'    },
  gateway:  { bg: '#FF8C42', accent: '#d96320', Icon: Globe,    label: 'Gateway'  },
  worker:   { bg: '#C084FC', accent: '#9333ea', Icon: Wrench,   label: 'Worker'   },
  frontend: { bg: '#FCA5A5', accent: '#dc2626', Icon: Monitor,  label: 'Frontend' },
};

// ─── Custom Handle ────────────────────────────────────────────────────────────

interface StyledHandleProps {
  type: 'source' | 'target';
  position: Position;
  id?: string;
}

function StyledHandle({ type, position, id }: StyledHandleProps) {
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      style={{
        width: 12,
        height: 12,
        borderRadius: 2,           // chunky square with slight rounding
        border: '2px solid #121212',
        background: '#FFFFFF',
        boxShadow: '1px 1px 0px 0px #121212',
      }}
    />
  );
}

// ─── EnvVars badge ────────────────────────────────────────────────────────────

function EnvVarsBadge({ envVars }: { envVars: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(envVars);
  if (entries.length === 0) return null;

  return (
    <div className="mt-1.5 border border-[#121212] font-mono text-[10px]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between bg-[#121212] px-1.5 py-0.5 text-white"
        type="button"
      >
        <span>{entries.length} ENV VAR{entries.length > 1 ? 'S' : ''}</span>
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>

      {open && (
        <div className="divide-y divide-[#121212] bg-white">
          {entries.map(([k, v]) => (
            <div key={k} className="flex gap-1 px-1.5 py-0.5">
              <span className="font-bold text-[#121212]">{k}</span>
              <span className="text-[#555]">= {v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Node Component ──────────────────────────────────────────────────────

// React Flow v12 requires node data to extend Record<string, unknown>.
// We accept the generic NodeProps and cast internally.
type ArchitectureNodeProps = NodeProps<Node>;

function ArchitectureNode({ data: rawData, selected }: ArchitectureNodeProps) {
  const data = rawData as unknown as CustomNodeData;
  const { nodeType, label, techStack, port, envVars, isLocked, lockedBy } = data;
  const cfg = NODE_CONFIG[nodeType] ?? NODE_CONFIG.service;
  const { bg, accent, Icon, label: typeLabel } = cfg;

  const borderWidth = selected ? '3px' : '2px';
  const shadow = selected
    ? '6px 6px 0px 0px #121212'
    : '4px 4px 0px 0px #121212';

  return (
    <div
      style={{
        minWidth: 180,
        maxWidth: 240,
        border: `${borderWidth} solid #121212`,
        boxShadow: shadow,
        background: '#FFFFFF',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        transition: 'box-shadow 0.08s ease, border-width 0.08s ease',
        position: 'relative',
      }}
    >
      {/* Multiplayer lock badge */}
      {isLocked && (
        <div
          style={{ background: '#121212' }}
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-black text-white"
        >
          <Lock size={9} strokeWidth={3} />
          <span>LOCKED BY {lockedBy ?? 'COLLABORATOR'}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div
        style={{ background: bg, borderBottom: '2px solid #121212' }}
        className="flex items-center gap-2 px-2.5 py-1.5"
      >
        <Icon size={14} strokeWidth={2.5} color="#121212" />
        <div className="flex-1 overflow-hidden">
          <div className="truncate text-[11px] font-black uppercase tracking-wider text-[#121212]">
            {label}
          </div>
          <div
            style={{ color: accent }}
            className="text-[9px] font-bold uppercase tracking-widest"
          >
            {typeLabel}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="space-y-1 p-2.5 text-[#121212]">
        {/* Tech stack pill */}
        {techStack && (
          <div className="inline-flex items-center border border-[#121212] bg-[#FAF9F5] px-1.5 py-0.5">
            <span className="font-mono text-[10px] font-bold">{techStack}</span>
          </div>
        )}

        {/* Port badge */}
        {port !== undefined && (
          <div className="font-mono text-[10px] text-[#555]">
            <span className="font-bold text-[#121212]">PORT</span>{' '}
            <span
              style={{ background: bg, border: '1px solid #121212' }}
              className="px-1 font-black"
            >
              :{port}
            </span>
          </div>
        )}

        {/* Env vars */}
        {envVars && <EnvVarsBadge envVars={envVars} />}
      </div>

      {/* ── React Flow Handles ── */}
      <StyledHandle type="target" position={Position.Left} id="target" />
      <StyledHandle type="source" position={Position.Right} id="source" />
    </div>
  );
}

export default memo(ArchitectureNode);
