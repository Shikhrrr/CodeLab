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
import useCanvasStore from '../../store/useCanvasStore';
import { useWhiteboardSync } from '../../hooks/useWhiteboardSync';
import { normaliseNodeData } from '../../utils/canvas';

// ─── Inner canvas (must be inside ReactFlowProvider) ─────────────────────────

interface InnerCanvasProps {
  roomId: string;
  passcode?: string;
}

function InnerCanvas({ roomId, passcode }: InnerCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();

  // Store slices
  const nodes           = useCanvasStore((s) => s.nodes);
  const edges           = useCanvasStore((s) => s.edges);
  const onNodesChange   = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange   = useCanvasStore((s) => s.onEdgesChange);
  const onConnect       = useCanvasStore((s) => s.onConnect);
  const addNode         = useCanvasStore((s) => s.addNode);
  const pushHistory     = useCanvasStore((s) => s.pushHistory);

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

      // Broadcast position-only delta for move changes (don't spam for select/remove)
      for (const ch of changes) {
        if (ch.type === 'position' && ch.position) {
          broadcastNodePosition(ch.id, ch.position);
        }
        if (ch.type === 'remove') {
          broadcastNodeDelete(ch.id);
        }
      }
    },
    [onNodesChange, broadcastNodePosition, broadcastNodeDelete],
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
      // Build a synthetic edge so we can broadcast it with an id
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

  // ── Drag-and-drop from palette sidebar ──────────────────────────────────

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const raw = event.dataTransfer.getData('application/reactflow');
      if (!raw) return;

      let payload: { type: string; label: string; techStack: string; port: number };
      try {
        payload = JSON.parse(raw) as typeof payload;
      } catch {
        console.warn('[Canvas] Invalid drop payload');
        return;
      }

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const rawData = {
        id: `node-${Date.now()}`,
        label: payload.label,
        nodeType: payload.type,
        techStack: payload.techStack,
        port: payload.port,
      };

      const newNode: Node = {
        id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: payload.type,
        position,
        data: normaliseNodeData(rawData as Record<string, unknown>),
      };

      pushHistory();          // save undo snapshot before mutating
      addNode(newNode);
      broadcastNodeAdd(newNode);
    },
    [screenToFlowPosition, addNode, pushHistory, broadcastNodeAdd],
  );

  // ── Node drag stop — push history + ensure final position is broadcast ──

  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      pushHistory();
      broadcastNodePosition(node.id, node.position);
    },
    [pushHistory, broadcastNodePosition],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
      onNodeDragStop={handleNodeDragStop}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
        nodeColor={(node) => {
          const colorMap: Record<string, string> = {
            service: '#FFE814',
            database: '#60EFFF',
            cache: '#FF69B4',
            queue: '#00F59B',
            gateway: '#FF8C42',
          };
          return colorMap[node.type ?? ''] ?? '#ccc';
        }}
      />
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
