import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps, type Node, useReactFlow } from '@xyflow/react';
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
  MessageSquare,
  X,
  Trash2,
} from 'lucide-react';
import type { CustomNodeData } from '../../types';

// ─── Per-type design tokens ───────────────────────────────────────────────────

interface NodeConfig {
  bg: string;
  accent: string;
  Icon: React.ElementType;
  label: string;
}

// Derived from NODE_ROLES — keeps colours consistent across Sidebar and canvas.
const NODE_CONFIG: Record<string, NodeConfig> = {
  service: { bg: '#FFE814', accent: '#d4be00', Icon: Server, label: 'Service' },
  backend: { bg: '#FFE814', accent: '#d4be00', Icon: Server, label: 'Service' },
  database: { bg: '#60EFFF', accent: '#00c8e0', Icon: Database, label: 'Database' },
  cache: { bg: '#FF69B4', accent: '#d94090', Icon: Cpu, label: 'Cache' },
  queue: { bg: '#00F59B', accent: '#00c278', Icon: Layers, label: 'Queue' },
  gateway: { bg: '#FF8C42', accent: '#d96320', Icon: Globe, label: 'Gateway' },
  worker: { bg: '#C084FC', accent: '#9333ea', Icon: Wrench, label: 'Worker' },
  frontend: { bg: '#FCA5A5', accent: '#dc2626', Icon: Monitor, label: 'Frontend' },
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

function ArchitectureNode({ data: rawData, selected, id }: ArchitectureNodeProps) {
  const { deleteElements } = useReactFlow();
  const data = rawData as unknown as CustomNodeData;
  // Prefer canonical `role` field; fall back to legacy `nodeType` for old persisted nodes
  const resolvedType = ((data.role ?? data.nodeType) as string | undefined) ?? 'service';
  const { label, techStack, technology, port, envVars, isLocked, lockedBy } = data;
  const description = (rawData as Record<string, unknown>).description as string | undefined;
  const displayTech = technology || techStack;

  const cfg = NODE_CONFIG[resolvedType] ?? NODE_CONFIG.service;
  const { bg, accent, Icon, label: typeLabel } = cfg;

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = useCallback(() => {
    void deleteElements({ nodes: [{ id }] });
  }, [deleteElements, id]);

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
        style={{ background: bg, borderBottom: '2px solid #121212', position: 'relative' }}
        className="flex items-center gap-2 px-2.5 py-1.5 group/header"
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

        {/* ── Delete X button (visible on hover, hidden when confirming) ── */}
        {!confirmDelete && (
          <button
            type="button"
            title="Delete node"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            className="opacity-0 group-hover/header:opacity-100 transition-opacity"
            style={{
              width: 18,
              height: 18,
              border: '1.5px solid #121212',
              background: '#FF6B6B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '1px 1px 0 #121212',
            }}
          >
            <X size={10} strokeWidth={3} color="#121212" />
          </button>
        )}
      </div>

      {/* ── Inline confirm-delete bar ── */}
      {confirmDelete && (
        <div
          style={{
            background: '#FF6B6B',
            borderBottom: '2px solid #121212',
            padding: '5px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Trash2 size={11} strokeWidth={3} color="#121212" style={{ flexShrink: 0 }} />
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 10,
              fontWeight: 900,
              color: '#121212',
              flex: 1,
              letterSpacing: '0.05em',
            }}
          >
            DELETE?
          </span>
          {/* Confirm */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            style={{
              border: '1.5px solid #121212',
              background: '#121212',
              color: '#FF6B6B',
              fontFamily: 'monospace',
              fontSize: 9,
              fontWeight: 900,
              padding: '2px 6px',
              cursor: 'pointer',
              letterSpacing: '0.08em',
            }}
          >
            YES
          </button>
          {/* Cancel */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
            style={{
              border: '1.5px solid #121212',
              background: '#FFFFFF',
              fontFamily: 'monospace',
              fontSize: 9,
              fontWeight: 900,
              padding: '2px 6px',
              cursor: 'pointer',
              letterSpacing: '0.08em',
              color: '#121212',
            }}
          >
            CANCEL
          </button>
        </div>
      )}

      {/* ── Body ── */}
      <div className="space-y-1 p-2.5 text-[#121212]">
        {/* Tech stack pill */}
        {displayTech && (
          <div className="inline-flex items-center border border-[#121212] bg-[#FAF9F5] px-1.5 py-0.5">
            <span className="font-mono text-[10px] font-bold">{displayTech}</span>
          </div>
        )}

        {/* Port badge */}
        {port !== undefined && port > 0 && (
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

        {/* Description indicator */}
        {description && description.trim().length > 0 && (
          <div
            style={{ borderTop: '1px dashed #D1D1C7', paddingTop: 4, marginTop: 2 }}
            className="flex items-center gap-1"
          >
            <MessageSquare size={9} strokeWidth={2.5} color="#888" />
            <span className="font-mono text-[9px] text-[#888] truncate" title={description}>
              {description.slice(0, 32)}{description.length > 32 ? '…' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── React Flow Handles ── */}
      <StyledHandle type="target" position={Position.Left} id="target" />
      <StyledHandle type="source" position={Position.Right} id="source" />
    </div>
  );
}

export default memo(ArchitectureNode);
