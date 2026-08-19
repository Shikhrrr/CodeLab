import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Edge,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './nodeTypes';
import NodePropertiesPanel from './NodePropertiesPanel';
import useCanvasStore from '../../store/useCanvasStore';
import { useWhiteboardSync } from '../../hooks/useWhiteboardSync';
import { normaliseNodeData } from '../../utils/canvas';
import { defaultTechForRole, NODE_ROLES } from '../../config/nodeConfig';

// ─── Minimap node colour ──────────────────────────────────────────────────────

function miniMapColor(node: Node): string {
  const role = (node.data as Record<string, unknown>).role as string | undefined;
  const nodeType = node.type ?? '';
  const key = role ?? nodeType;
  return NODE_ROLES[key]?.color ?? '#ccc';
}

// ─── Inner canvas (must be inside ReactFlowProvider) ─────────────────────────

interface InnerCanvasProps {
  roomId: string;
  passcode?: string;
}

function InnerCanvas({ roomId, passcode }: InnerCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();

  // Store slices
  const nodes             = useCanvasStore((s) => s.nodes);
  const edges             = useCanvasStore((s) => s.edges);
  const onNodesChange     = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange     = useCanvasStore((s) => s.onEdgesChange);
  const onConnect         = useCanvasStore((s) => s.onConnect);
  const addNode           = useCanvasStore((s) => s.addNode);
  const pushHistory       = useCanvasStore((s) => s.pushHistory);
  const setSelectedNodeId = useCanvasStore((s) => s.setSelectedNodeId);

  // Sync hook
  const {
    broadcastNodePosition,
    broadcastNodeAdd,
    broadcastNodeDelete,
    broadcastEdgeAdd,
    broadcastEdgeDelete,
    triggerCanvasSave,
  } = useWhiteboardSync(roomId, passcode);

  // ── Change handlers — store + broadcast ─────────────────────────────────

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      for (const ch of changes) {
        if (ch.type === 'position' && ch.position) {
          broadcastNodePosition(ch.id, ch.position);
        }
        if (ch.type === 'remove') {
          broadcastNodeDelete(ch.id);
        }
      }

      // ── Selection tracking ──────────────────────────────────────────────
      // React Flow sends deselect + select in the same batch when switching
      // nodes. We must let selected:true always beat selected:false, so we
      // scan the whole batch first rather than processing serially.
      const selectChanges = changes.filter((ch): ch is NodeChange & { type: 'select' } =>
        ch.type === 'select',
      );
      if (selectChanges.length > 0) {
        const winner = selectChanges.find((ch) => ch.selected);
        if (winner) {
          setSelectedNodeId(winner.id);
        } else {
          // All select changes are false → nothing selected
          setSelectedNodeId(null);
        }
      }
    },
    [onNodesChange, broadcastNodePosition, broadcastNodeDelete, setSelectedNodeId],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      for (const ch of changes) {
        if (ch.type === 'remove') {
          broadcastEdgeDelete(ch.id);
        }
      }
    },
    [onEdgesChange, broadcastEdgeDelete],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      onConnect(connection);
      const newEdge: Edge = {
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      };
      broadcastEdgeAdd(newEdge);
      triggerCanvasSave();
    },
    [onConnect, broadcastEdgeAdd, triggerCanvasSave],
  );

  // ── onNodesDelete / onEdgesDelete — fires after React Flow removes items ──

  const handleNodesDelete = useCallback(
    (deleted: Node[]) => {
      for (const n of deleted) {
        broadcastNodeDelete(n.id);
      }
      triggerCanvasSave();
    },
    [broadcastNodeDelete, triggerCanvasSave],
  );

  const handleEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      for (const e of deleted) {
        broadcastEdgeDelete(e.id);
      }
      triggerCanvasSave();
    },
    [broadcastEdgeDelete, triggerCanvasSave],
  );

  // ── Drag-and-drop from palette sidebar ──────────────────────────────────

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const raw =
        event.dataTransfer.getData('application/reactflow') ||
        event.dataTransfer.getData('text/plain');
      if (!raw) return;

      // New payload shape: { role, technology, port, description }
      let payload: { role: string; technology: string; port: number; description: string };
      try {
        payload = JSON.parse(raw) as typeof payload;
      } catch {
        console.warn('[Canvas] Invalid drop payload');
        return;
      }

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      // Resolve defaults from nodeConfig when payload fields are empty
      const tech = payload.technology || defaultTechForRole(payload.role).name;
      const port = payload.port ?? defaultTechForRole(payload.role).port;

      const rawData = {
        id:          `node-${Date.now()}`,
        label:       NODE_ROLES[payload.role]?.label ?? payload.role,
        nodeType:    payload.role,   // for ArchitectureNode backward-compat
        role:        payload.role,
        technology:  tech,
        techStack:   tech,           // keep techStack in sync for rendering pill
        port:        port,
        description: payload.description ?? '',
      };

      const newNode: Node = {
        id:       `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type:     payload.role,
        position,
        data:     normaliseNodeData(rawData as Record<string, unknown>),
      };

      pushHistory();
      addNode(newNode);
      broadcastNodeAdd(newNode);
      triggerCanvasSave();
    },
    [screenToFlowPosition, addNode, pushHistory, broadcastNodeAdd, triggerCanvasSave],
  );

  // ── Node drag stop ────────────────────────────────────────────────────────

  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      pushHistory();
      broadcastNodePosition(node.id, node.position);
      triggerCanvasSave();
    },
    [pushHistory, broadcastNodePosition, triggerCanvasSave],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
      onNodesDelete={handleNodesDelete}
      onEdgesDelete={handleEdgesDelete}
      onNodeDragStop={handleNodeDragStop}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
      onPaneClick={() => setSelectedNodeId(null)}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      deleteKeyCode="Backspace"
      style={{ background: '#FAF9F5' }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={16}
        size={1.5}
        color="#D1D1C7"
      />

      <Controls
        style={{
          border: '2px solid #121212',
          boxShadow: '3px 3px 0 #121212',
          background: '#FFFFFF',
        }}
      />

      <MiniMap
        style={{
          border: '2px solid #121212',
          boxShadow: '3px 3px 0 #121212',
          background: '#FAF9F5',
        }}
        maskColor="rgba(18,18,18,0.06)"
        nodeColor={miniMapColor}
      />

      {/* Properties panel — floats over the canvas, inside the RF context */}
      <NodePropertiesPanel onChanged={triggerCanvasSave} />
    </ReactFlow>
  );
}

// ─── Public component (provides the ReactFlow context) ───────────────────────

interface WhiteboardCanvasProps {
  roomId: string;
  passcode?: string;
}

export default function WhiteboardCanvas({ roomId, passcode }: WhiteboardCanvasProps) {
  return (
    <ReactFlowProvider>
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <InnerCanvas roomId={roomId} passcode={passcode} />
      </div>
    </ReactFlowProvider>
  );
}
