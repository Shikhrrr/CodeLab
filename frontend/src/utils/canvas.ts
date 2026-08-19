import type { ArchitectureNodeType } from '../types';

// ─── nodeType → canonical backend role ───────────────────────────────────────
// Backend schema: 'frontend'|'gateway'|'backend'|'database'|'cache'|'queue'|'worker'

const ROLE_MAP: Record<ArchitectureNodeType, string> = {
  service:  'backend',
  database: 'database',
  cache:    'cache',
  queue:    'queue',
  gateway:  'gateway',
  worker:   'worker',
  frontend: 'frontend',
};

/**
 * Remaps any legacy or intermediate role strings that may already be stored
 * in persisted canvas JSON to the current backend literals.
 */
const LEGACY_ROLE_MAP: Record<string, string> = {
  web_service:   'backend',
  api_gateway:   'gateway',
  database:      'database',
  redis_cache:   'cache',
  message_queue: 'queue',
  worker:        'worker',
  frontend:      'frontend',
  // pass-through for values that are already correct
  backend:       'backend',
  cache:         'cache',
  queue:         'queue',
  gateway:       'gateway',
};

const DEFAULT_TECHNOLOGY: Record<ArchitectureNodeType, string> = {
  service:  'FastAPI',
  database: 'PostgreSQL',
  cache:    'Redis',
  queue:    'Kafka',
  gateway:  'Nginx',
  worker:   'Celery',
  frontend: 'React',
};

// ─── Public helper ────────────────────────────────────────────────────────────

/**
 * Normalises a React Flow node's data payload to the shape the backend
 * Pydantic CanvasNode schema requires:
 *
 *   - `technology`:  techStack → technology → per-type default
 *   - `role`:        nodeType  → canonical backend role literal
 *
 * All existing fields are preserved so the result can be spread back onto the node.
 */
export function normaliseNodeData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const nodeType = (data.nodeType ?? data.type ?? 'service') as ArchitectureNodeType;

  const technology =
    (data.technology as string | undefined) ||
    (data.techStack  as string | undefined) ||
    DEFAULT_TECHNOLOGY[nodeType] ||
    'FastAPI';

  // Resolution order:
  // 1. Remap existing role through LEGACY_ROLE_MAP (upgrades old/wrong values)
  // 2. Derive from nodeType via ROLE_MAP
  // 3. Hard fallback to 'backend'
  const rawRole =
    (data.role     as string | undefined) ||
    (data.category as string | undefined) ||
    ROLE_MAP[nodeType];

  const role = LEGACY_ROLE_MAP[rawRole ?? ''] ?? rawRole ?? 'backend';

  return {
    ...data,
    technology,
    role,
    // Keep techStack in sync so ArchitectureNode can still render the pill
    techStack: technology,
  };
}

/**
 * Normalises every node in an array, returning a new array.
 * Safe to call even if `nodes` is not a real array.
 */
export function normaliseNodes(
  nodes: unknown[],
): Record<string, unknown>[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.map((n) => {
    const node = n as Record<string, unknown>;
    return {
      ...node,
      data: normaliseNodeData((node.data as Record<string, unknown>) ?? {}),
    };
  });
}
