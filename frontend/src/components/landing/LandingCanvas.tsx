import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from '../canvas/nodeTypes';

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#121212', strokeWidth: 2.5 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#121212',
  },
};

const initialNodes: Node[] = [
  {
    id: 'frontend',
    type: 'frontend',
    position: { x: 50, y: 50 },
    data: {
      label: 'Frontend',
      role: 'frontend',
      technology: 'React 19 + Vite',
      port: 3000,
      description: 'Client UI Layer',
    },
  },
  {
    id: 'backend',
    type: 'backend',
    position: { x: 350, y: 50 },
    data: {
      label: 'Web Service',
      role: 'backend',
      technology: 'FastAPI (Python)',
      port: 8000,
      description: 'Core REST & Async Business Logic',
    },
  },
  {
    id: 'database',
    type: 'database',
    position: { x: 200, y: 250 },
    data: {
      label: 'Database',
      role: 'database',
      technology: 'PostgreSQL 16',
      port: 5432,
      description: 'Relational Store',
    },
  },
  {
    id: 'cache',
    type: 'cache',
    position: { x: 500, y: 250 },
    data: {
      label: 'Cache',
      role: 'cache',
      technology: 'Redis 7',
      port: 6379,
      description: 'In-Memory / PubSub',
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e-frontend-backend', source: 'frontend', target: 'backend', ...defaultEdgeOptions },
  { id: 'e-backend-database', source: 'backend', target: 'database', ...defaultEdgeOptions },
  { id: 'e-backend-cache', source: 'backend', target: 'cache', ...defaultEdgeOptions },
];

export default function LandingCanvas() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds)),
    [setEdges]
  );

  return (
    <div className="w-full h-full" style={{ backgroundColor: '#FAF9F5' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1.5} color="#121212" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
