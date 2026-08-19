import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';

// ─── History snapshot ─────────────────────────────────────────────────────────

interface HistorySnapshot {
  nodes: Node[];
  edges: Edge[];
}

const HISTORY_LIMIT = 50;

// ─── State shape ─────────────────────────────────────────────────────────────

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  /** True while a debounced save_canvas message is in flight. */
  isSaving: boolean;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

interface CanvasActions {
  setNodes(nodes: Node[] | ((nds: Node[]) => Node[])): void;
  setEdges(edges: Edge[] | ((eds: Edge[]) => Edge[])): void;
  onNodesChange(changes: NodeChange[]): void;
  onEdgesChange(changes: EdgeChange[]): void;
  onConnect(connection: Connection): void;
  addNode(node: Node): void;
  updateNodeData(id: string, data: Partial<Record<string, unknown>>): void;
  setSelectedNodeId(id: string | null): void;
  setSaving(saving: boolean): void;
  /** Snapshot current canvas onto the undo stack before a significant mutation. */
  pushHistory(): void;
  undo(): void;
  redo(): void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

const useCanvasStore = create<CanvasState & CanvasActions>()((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  selectedNodeId: null,
  undoStack: [],
  redoStack: [],
  isSaving: false,

  // ── Node / edge setters (accept value or updater function) ────────────────

  setNodes: (nodes) =>
    set((state) => ({
      nodes: typeof nodes === 'function' ? nodes(state.nodes) : nodes,
    })),

  setEdges: (edges) =>
    set((state) => ({
      edges: typeof edges === 'function' ? edges(state.edges) : edges,
    })),

  // ── React Flow change handlers ────────────────────────────────────────────

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    })),

  onConnect: (connection) =>
    set((state) => ({
      edges: addEdge(connection, state.edges),
    })),

  // ── Mutation helpers ──────────────────────────────────────────────────────

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),

  updateNodeData: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
      ),
    })),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  setSaving: (saving) => set({ isSaving: saving }),

  // ── Undo / redo ───────────────────────────────────────────────────────────

  pushHistory: () => {
    const { nodes, edges, undoStack } = get();
    const snapshot: HistorySnapshot = {
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    };
    // Trim to HISTORY_LIMIT so we don't grow unboundedly
    const trimmed = undoStack.length >= HISTORY_LIMIT ? undoStack.slice(1) : undoStack;
    set({ undoStack: [...trimmed, snapshot], redoStack: [] });
  },

  undo: () => {
    const { nodes, edges, undoStack, redoStack } = get();
    if (undoStack.length === 0) return;

    const current: HistorySnapshot = {
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    };
    const prev = undoStack[undoStack.length - 1];

    set({
      nodes: prev.nodes,
      edges: prev.edges,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, current],
    });
  },

  redo: () => {
    const { nodes, edges, undoStack, redoStack } = get();
    if (redoStack.length === 0) return;

    const current: HistorySnapshot = {
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    };
    const next = redoStack[redoStack.length - 1];

    set({
      nodes: next.nodes,
      edges: next.edges,
      undoStack: [...undoStack, current],
      redoStack: redoStack.slice(0, -1),
    });
  },
}));

export default useCanvasStore;
