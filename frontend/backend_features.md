# CodeLab Whiteboard & Architecture Engine API Integration Guide

This document outlines all backend features, workflows, and API/WebSocket contracts implemented in the backend. Use this guide to wire UI controls, state management, and real-time event listeners.

---

### Core Architecture & State Flow

```
+-----------------------------------------------------------------------------+
|                                Frontend (UI)                                |
+-----------------------------------------------------------------------------+
        |                     |                              |
 (HTTP REST API)       (WebSocket Sync)             (WebSocket Events)
        |                     |                              |
        v                     v                              v
+------------------+  +--------------------+        +--------------------+
|  Django REST API |  |   Django Channels  |        |    Celery Worker   |
| (CRUD, Triggers) |  |   WebSocket Layer  |        | (LangGraph Engine) |
+------------------+  +--------------------+        +--------------------+
        |                       |                            |
        +------------+----------+----------------------------+
                     |
                     v
        +----------------------------+
        |   PostgreSQL + Redis Layer |
        | (DB State, Locks, Channels)|
        +----------------------------+
```

---

### 1. Environment & Network Configuration

Set the following variables in `.env` (or `.env.local`):

```env
VITE_API_BASE_URL=https://<your-backend-domain>/api
VITE_WS_BASE_URL=wss://<your-backend-domain>/ws/whiteboard
```

#### WebSocket URL Protocol Resolution Rule
Never hardcode `ws://` when served over `https://`. Always use dynamic scheme matching:

```typescript
export function getWebSocketUrl(roomId: string, passcode?: string): string {
  const defaultWsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const defaultHost = window.location.host;
  
  let base = import.meta.env.VITE_WS_BASE_URL || `${defaultWsProtocol}//${defaultHost}/ws/whiteboard`;

  if (window.location.protocol === 'https:' && base.startsWith('ws://')) {
    base = base.replace(/^ws:\/\//, 'wss://');
  }

  const cleanBase = base.replace(/\/$/, '');
  const url = new URL(`${cleanBase}/${roomId}/`);

  if (passcode) {
    url.searchParams.set('passcode', passcode);
  }

  return url.toString();
}
```

---

### 2. Canvas Node Schema & Serialization Requirements

Every node serialized to the database or generation engine **must** conform strictly to the backend Pydantic validator:

#### Allowed `data.role` Literals
The backend validates `data.role` against a strict literal set:
* `'frontend'`
* `'gateway'`
* `'backend'`
* `'database'`
* `'cache'`
* `'queue'`
* `'worker'`

#### Sidebar Block -> Payload Mapping
Transform all sidebar/canvas blocks before saving or generating:

| Sidebar Block Title | Frontend Value | Backend Payload `data.role` | Backend Payload `data.technology` |
| :--- | :--- | :--- | :--- |
| **WEB SERVICE** | `web_service` | `'backend'` | `'FastAPI'` / `'Express'` / `'Django'` |
| **DATABASE** | `database` | `'database'` | `'Postgres'` / `'MongoDB'` / `'MySQL'` |
| **REDIS CACHE** | `redis_cache` | `'cache'` | `'Redis'` |
| **MESSAGE QUEUE** | `message_queue` | `'queue'` | `'Kafka'` / `'RabbitMQ'` |
| **API GATEWAY** | `api_gateway` | `'gateway'` | `'Nginx'` / `'Traefik'` |
| **WORKER** | `worker` | `'worker'` | `'Celery'` |
| **FRONTEND** | `frontend` | `'frontend'` | `'React'` / `'Next.js'` / `'Vue'` |

#### Canonical Node Payload Format
```json
{
  "id": "node-178707177894",
  "type": "custom",
  "position": { "x": 250, "y": 150 },
  "data": {
    "technology": "FastAPI",
    "role": "backend",
    "label": "Auth API Service",
    "port": 8000
  }
}
```

---

### 3. Room Management & Security

#### Features
* Create shared collaborative architecture rooms.
* Passcode-protected room entry and access validation.
* Rate-limited endpoint protection across actions.

#### Endpoints
* **Create Room**
  * `POST /api/rooms/`
  * **Payload:**
    ```json
    {
      "name": "Project Name",
      "passcode": "optional_code"
    }
    ```
  * **Response (201 Created):**
    ```json
    {
      "room_id": "6XXN6FNP",
      "created_at": "2026-08-19T06:30:00Z"
    }
    ```
* **Verify / Enter Room**
  * Passcode is supplied via headers `X-Room-Passcode: <passcode>` or query param `?passcode=<passcode>` on subsequent requests.

---

### 4. Whiteboard Canvas Persistence & Real-time Collaboration

#### Features
* Real-time multi-user canvas syncing (nodes, edges, positions, viewport).
* Auto-save support for diagram state.
* Canvas state hydration on entry.

#### Endpoints & WebSocket Events
* **Fetch Canvas State**
  * `GET /api/rooms/{room_id}/canvas/`
  * **Response (200 OK):**
    ```json
    {
      "room_id": "6XXN6FNP",
      "nodes": [
        {
          "id": "node-1",
          "type": "custom",
          "position": { "x": 100, "y": 200 },
          "data": {
            "technology": "FastAPI",
            "role": "backend",
            "label": "API Server",
            "port": 8000
          }
        }
      ],
      "edges": [
        { "id": "edge-1", "source": "node-1", "target": "node-2" }
      ],
      "updated_at": "2026-08-19T06:30:00Z"
    }
    ```

* **Save Canvas State (Manual or Auto-save debounce)**
  * `POST /api/rooms/{room_id}/canvas/`
  * **Payload:**
    ```json
    {
      "nodes": [ ... ],
      "edges": [ ... ]
    }
    ```
  * **Response (200 OK):**
    ```json
    {
      "status": "SAVED"
    }
    ```

* **Real-Time WebSocket Layer**
  * **Connect URL:** `wss://<host>/ws/whiteboard/{room_id}/?passcode=<passcode>`
  * **Outgoing Event (Broadcast state to room):**
    ```json
    {
      "type": "canvas_update",
      "nodes": [ ... ],
      "edges": [ ... ]
    }
    ```
  * **Outgoing Event (Cursor sync):**
    ```json
    {
      "type": "cursor_move",
      "user": "Anonymous-1",
      "position": { "x": 420.5, "y": 180.2 }
    }
    ```
  * **Incoming Event (Listen & update React Flow):**
    ```json
    {
      "type": "canvas_update",
      "nodes": [ ... ],
      "edges": [ ... ]
    }
    ```
  * **Incoming Event (Cursor update from peer):**
    ```json
    {
      "type": "cursor_update",
      "user": "Anonymous-1",
      "position": { "x": 420.5, "y": 180.2 }
    }
    ```

---

### 5. AI Architecture Scaffolding & Code Generation

#### Features
* Validate canvas structure (ensures entry points, services, and connections exist).
* Asynchronous scaffolding via LangGraph & Groq (`openai/gpt-oss-120b`).
* Redis-backed concurrency lock to prevent overlapping generations for the same room.
* Generation modes: Full Project Scaffolding (`SCAFFOLD`), Single File Edit (`EDIT`), and Architecture Explanation (`EXPLAIN`).

#### Endpoints
* **Trigger Architecture Build**
  * `POST /api/rooms/{room_id}/generate/`
  * **Headers:** `Content-Type: application/json`
  * **Payload:**
    ```json
    {
      "prompt": "Build a modular REST API with JWT authentication and Redis caching",
      "mode": "SCAFFOLD",
      "active_file_path": null
    }
    ```
  * **Response (202 Accepted):**
    ```json
    {
      "job_id": "9331c3bd-5ebe-4e03-a6d4-03ffac4ef669",
      "status": "QUEUED"
    }
    ```
  * **Response (409 Conflict):**
    ```json
    {
      "error": "Generation is already in progress for this room.",
      "code": "BUSY"
    }
    ```

* **Real-time Completion Event (via WebSocket)**
  * When Celery finishes, it broadcasts to all clients in the room:
    ```json
    {
      "type": "generation_completed",
      "job_id": "9331c3bd-5ebe-4e03-a6d4-03ffac4ef669",
      "status": "COMPLETED",
      "assistant_response": "Scaffolding complete. Created 6 starter files."
    }
    ```
  * *Frontend Action:* On receiving `generation_completed`, trigger a reload of the file explorer and chat history.

---

### 6. File Explorer & Code Viewing / Editing

#### Features
* Fetch the complete generated directory structure and file contents.
* Fetch individual file contents.
* Upsert/update specific file contents directly from the code editor.

#### Endpoints
* **List All Project Files**
  * `GET /api/rooms/{room_id}/files/`
  * **Response (200 OK):**
    ```json
    {
      "room_id": "6XXN6FNP",
      "files": [
        {
          "id": "c8a1b5c8-...",
          "path": "backend/main.py",
          "content": "from fastapi import FastAPI...",
          "description": "FastAPI entry point",
          "updated_at": "2026-08-18T17:30:00Z"
        }
      ]
    }
    ```

* **Get Single File Detail**
  * `GET /api/rooms/{room_id}/files/detail/?path=backend/main.py`
  * **Response (200 OK):**
    ```json
    {
      "path": "backend/main.py",
      "content": "from fastapi import FastAPI...",
      "description": "FastAPI entry point"
    }
    ```

* **Update / Save File (In-Editor Modification)**
  * `PUT /api/rooms/{room_id}/files/`
  * **Payload:**
    ```json
    {
      "path": "backend/main.py",
      "content": "updated code..."
    }
    ```
  * **Response (200 OK):**
    ```json
    {
      "status": "UPDATED",
      "path": "backend/main.py"
    }
    ```

---

### 7. Architectural Assistant & Chat History

#### Features
* Threaded conversational memory linked to the room's architecture graph.
* Ask questions about the current architecture, request code modifications, or troubleshoot configurations.

#### Endpoints
* **Fetch Room Chat History**
  * `GET /api/rooms/{room_id}/chat/`
  * **Response (200 OK):**
    ```json
    {
      "messages": [
        {
          "role": "user",
          "content": "Add JWT auth to the backend service",
          "timestamp": "2026-08-18T17:28:00Z"
        },
        {
          "role": "assistant",
          "content": "Updated `auth.py` and `dependencies.py` with JWT verification.",
          "timestamp": "2026-08-18T17:28:10Z"
        }
      ]
    }
    ```

* **Send Chat / Modification Prompt**
  * `POST /api/rooms/{room_id}/generate/` with `mode: "EDIT"` or `mode: "EXPLAIN"`.

---

### 8. UI Event Wiring & Behavior Checklist

| Feature | Trigger UI Element | Backend API / WS | Expected UI Behavior |
| :--- | :--- | :--- | :--- |
| **Initial Hydration** | Page mount / URL navigation | `GET /rooms/{id}/canvas/`<br>`GET /rooms/{id}/files/`<br>`GET /rooms/{id}/chat/` | Hydrate canvas nodes, files in tree, and message history |
| **Canvas Auto-Save** | On node/edge change (debounced 1s) | `POST /rooms/{id}/canvas/` or WS `canvas_update` | Show "Saving..." -> "Saved" indicator |
| **Build Architecture** | Click **"BUILD ARCHITECTURE"** | `POST /rooms/{id}/generate/` | Disable button, show progress spinner / generation status |
| **Generation Complete** | WS message `generation_completed` | Listen on active WebSocket | Re-enable button, refresh Project Files tree & Chat tab |
| **File Tree Rendering** | Mount / Generation complete | `GET /rooms/{id}/files/` | Populate tree view in **Code Explorer** |
| **File Selection & Edit** | Click file in tree / Edit code | Monaco Editor render | Render content, highlight active file path |
| **File Saving** | Code Editor `Ctrl+S` / Save button | `PUT /rooms/{id}/files/` | Persist editor content and updated timestamp to DB |
| **AI Chat** | Send prompt in Chat panel | `POST /rooms/{id}/generate/` (`mode: "EXPLAIN"`) | Append message to UI, display assistant response |