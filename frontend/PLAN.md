Phase 1: Project Setup & Architecture Foundations

Core Stack: Vite + React (TypeScript), Tailwind CSS, @xyflow/react (React Flow v12), Zustand (state management), Monaco Editor (@monaco-editor/react), and Lucide React (icons).

API & WebSocket Client: Axios / native Fetch with custom interceptors for passcode headers; native WebSocket client with exponential backoff reconnection.

Global Store Design (Zustand):

useCanvasStore: Nodes, edges, active selections, undo/redo history stack, viewport state.

useRoomStore: Room metadata, passcode, active collaborator presence list, connection status.

useProjectStore: Generated file tree, active tab, modified buffers, generation job status (IDLE, QUEUED, PROCESSING, COMPLETED, FAILED).

useChatStore: Thread messages, streaming status, agent validation errors.

Phase 2: Workspace Layout & Shell

Three-Panel Responsive Layout:

Left Sidebar (Collapsible): Component node palette (Microservices, Databases, Caches, Gateways, Queues), project file tree explorer.

Center Viewport: React Flow whiteboard canvas with interactive mini-map, background grid, and top navigation bar (Room title, Share modal, Export ZIP button, Live peer avatars).

Right Drawer (Tabbed / Resizable): AI Architecture Assistant & Chat prompt panel; Code editor tab (Monaco) with multi-file tabs.

Phase 3: Interactive Architecture Canvas (React Flow)

Custom Architecture Nodes:

Specialized node types: ServiceNode, DatabaseNode, QueueNode, GatewayNode, StorageNode.

Node config popovers: Service name, tech stack tag (FastAPI, Express, Postgres, Redis), port bindings, environment variable notes.

Custom Directed Edges:

Protocol-specific connectors (HTTP/REST, gRPC, WebSocket, PubSub) with animated flow strokes and editable relationship labels.

Topology Validation Guardrails:

Visual warnings on isolated nodes or cycles before sending generation payloads.

Phase 4: Real-Time Sync & Ephemeral Presence

WebSocket Integration (useWhiteboardSync):

Emit throttled delta events (node_position_delta, node_added, node_deleted, edge_added, edge_deleted) during interactions.

Auto-save debounce timer (2-second idle window) dispatching full save_canvas snapshots to persist in PostgreSQL.

Presence & Collaborative Awareness:

Multiplayer live cursor overlay rendering peer positions and color-coded user labels.

Ephemeral node locking: Highlight nodes currently selected or dragged by other active peers to prevent simultaneous drag collisions.

Phase 5: AI Orchestration & Code Workspace

Generation Trigger & Job Polling/Socket Listener:

Submit generation requests to POST /api/rooms/<room_id>/generate/.

Handle 409 Conflict (busy lock) with clear UI toast indicators.

Listen for WebSocket generation_completed events and update the project file store.

Code Editor & File Tree (Monaco Editor):

Hierarchical file tree parser rendering files into folder directories.

Monaco editor integration with syntax highlighting, line numbers, and diff views for AI-modified files.

Manual save handler dispatching PUT /api/rooms/<room_id>/files/<file_id>/ with debounced auto-sync.

Direct Export:

"Download Codebase" action calling GET /api/rooms/<room_id>/download/ for instant project ZIP retrieval.
