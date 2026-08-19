import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronDown, FileText } from 'lucide-react';
import useCanvasStore from '../../store/useCanvasStore';
import { NODE_ROLES, defaultTechForRole } from '../../config/nodeConfig';

// ─── Searchable tech dropdown ─────────────────────────────────────────────────

interface TechDropdownProps {
  role: string;
  value: string;
  onChange: (tech: string, port: number) => void;
}

function TechDropdown({ role, value, onChange }: TechDropdownProps) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const techs = NODE_ROLES[role]?.techs ?? [];
  const filtered = techs.filter((t) =>
    t.name.toLowerCase().includes(query.toLowerCase()),
  );

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    if (open) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setQuery(''); }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '2px solid #121212',
          background: '#FFFFFF',
          padding: '4px 8px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 11,
          fontWeight: 700,
          color: '#121212',
          cursor: 'pointer',
          boxShadow: open ? '2px 2px 0 #121212' : 'none',
        }}
      >
        <span>{value || 'Select…'}</span>
        <ChevronDown
          size={12}
          strokeWidth={3}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.1s' }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 9999,
            border: '2px solid #121212',
            borderTop: 'none',
            background: '#FFFFFF',
            boxShadow: '4px 4px 0 #121212',
            maxHeight: 180,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search box */}
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter…"
            style={{
              padding: '5px 8px',
              borderBottom: '2px solid #121212',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 10,
              outline: 'none',
              border: 'none',
              background: '#FAF9F5',
              flexShrink: 0,
            }}
          />
          {/* Options */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <p
                style={{
                  padding: '6px 8px',
                  fontFamily: 'monospace',
                  fontSize: 10,
                  color: '#888',
                }}
              >
                No match
              </p>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => {
                    onChange(t.name, t.port);
                    setOpen(false);
                    setQuery('');
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '5px 8px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 11,
                    fontWeight: t.name === value ? 900 : 400,
                    background: t.name === value ? '#FFE814' : 'transparent',
                    cursor: 'pointer',
                    color: '#121212',
                    borderBottom: '1px solid #E5E5E0',
                  }}
                  onMouseEnter={(e) => {
                    if (t.name !== value)
                      (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F0';
                  }}
                  onMouseLeave={(e) => {
                    if (t.name !== value)
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <span>{t.name}</span>
                  {t.port > 0 && (
                    <span style={{ color: '#888', fontSize: 9, marginLeft: 6 }}>
                      :{t.port}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Field label helper ───────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: 'monospace',
        fontSize: 9,
        fontWeight: 900,
        letterSpacing: '0.12em',
        color: '#888',
        textTransform: 'uppercase',
        marginBottom: 3,
      }}
    >
      {children}
    </p>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface NodePropertiesPanelProps {
  /** Called whenever a field changes so the parent can trigger canvas save. */
  onChanged: () => void;
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export default function NodePropertiesPanel({ onChanged }: NodePropertiesPanelProps) {
  const selectedNodeId  = useCanvasStore((s) => s.selectedNodeId);
  const nodes           = useCanvasStore((s) => s.nodes);
  const updateNodeData  = useCanvasStore((s) => s.updateNodeData);
  const setSelectedNodeId = useCanvasStore((s) => s.setSelectedNodeId);

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null;

  // ── Local edit state (mirrors node.data fields) ───────────────────────
  const [label,       setLabel]       = useState('');
  const [technology,  setTechnology]  = useState('');
  const [port,        setPort]        = useState<number>(0);
  const [description, setDescription] = useState('');

  // Sync local state when selection changes
  useEffect(() => {
    if (!node) return;
    const d = node.data as Record<string, unknown>;
    setLabel((d.label as string) ?? '');
    setTechnology((d.technology as string) ?? '');
    setPort((d.port as number) ?? 0);
    setDescription((d.description as string) ?? '');
  }, [node?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Commit a single field to the store ────────────────────────────────
  const commit = useCallback(
    (patch: Record<string, unknown>) => {
      if (!selectedNodeId) return;
      updateNodeData(selectedNodeId, patch);
      onChanged();
    },
    [selectedNodeId, updateNodeData, onChanged],
  );

  if (!node) return null;

  const role      = (node.data as Record<string, unknown>).role as string ?? '';
  const roleColor = NODE_ROLES[role]?.color ?? '#FFE814';

  // ── Tech selection: auto-fill port ───────────────────────────────────
  function handleTechChange(tech: string, autoPort: number) {
    setTechnology(tech);
    setPort(autoPort);
    commit({ technology: tech, port: autoPort, techStack: tech });
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        width: 240,
        zIndex: 100,
        border: '2px solid #121212',
        boxShadow: '6px 6px 0 #121212',
        background: '#FFFFFF',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: roleColor,
          borderBottom: '2px solid #121212',
          padding: '5px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '0.12em',
            color: '#121212',
            textTransform: 'uppercase',
          }}
        >
          {NODE_ROLES[role]?.label ?? role} PROPERTIES
        </span>
        <button
          type="button"
          onClick={() => setSelectedNodeId(null)}
          style={{ cursor: 'pointer', lineHeight: 0 }}
        >
          <X size={12} strokeWidth={3} color="#121212" />
        </button>
      </div>

      {/* ── Fields ── */}
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Label */}
        <div>
          <FieldLabel>Label</FieldLabel>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => commit({ label })}
            style={{
              width: '100%',
              border: '2px solid #121212',
              padding: '4px 8px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 11,
              outline: 'none',
              background: '#FAF9F5',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Technology */}
        <div>
          <FieldLabel>Technology</FieldLabel>
          {NODE_ROLES[role] ? (
            <TechDropdown
              role={role}
              value={technology}
              onChange={handleTechChange}
            />
          ) : (
            <input
              type="text"
              value={technology}
              onChange={(e) => setTechnology(e.target.value)}
              onBlur={() => commit({ technology, techStack: technology })}
              style={{
                width: '100%',
                border: '2px solid #121212',
                padding: '4px 8px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 11,
                outline: 'none',
                background: '#FAF9F5',
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>

        {/* Port */}
        <div>
          <FieldLabel>Port</FieldLabel>
          <input
            type="number"
            min={0}
            max={65535}
            value={port === 0 ? '' : port}
            onChange={(e) => setPort(Number(e.target.value))}
            onBlur={() => commit({ port })}
            placeholder="0 = none"
            style={{
              width: '100%',
              border: '2px solid #121212',
              padding: '4px 8px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 11,
              outline: 'none',
              background: '#FAF9F5',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Description */}
        <div>
          <FieldLabel>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileText size={9} strokeWidth={3} style={{ display: 'inline' }} />
              Description / Custom Instructions
            </span>
          </FieldLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => commit({ description })}
            rows={3}
            placeholder="e.g. Include JWT middleware, use Redux for state…"
            style={{
              width: '100%',
              border: '2px solid #121212',
              padding: '4px 8px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 10,
              outline: 'none',
              background: '#FAF9F5',
              boxSizing: 'border-box',
              resize: 'vertical',
              color: '#121212',
            }}
          />
          <p style={{ fontSize: 9, color: '#888', marginTop: 2 }}>
            Sent to LLM as custom instructions for this node.
          </p>
        </div>
      </div>
    </div>
  );
}
