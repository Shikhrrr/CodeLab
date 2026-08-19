import type { NodeTypes } from '@xyflow/react';
import ArchitectureNode from './ArchitectureNode';

/**
 * Maps every ArchitectureNodeType value to the same ArchitectureNode renderer.
 *
 * Pass this directly to <ReactFlow nodeTypes={nodeTypes} />.
 * All 7 types share one component; per-type visuals are driven by `data.nodeType`.
 *
 * To swap in a specialised sub-component for a specific type in the future,
 * simply replace its entry here — no consumers need to change.
 */
export const nodeTypes: NodeTypes = {
  service:  ArchitectureNode,
  database: ArchitectureNode,
  cache:    ArchitectureNode,
  queue:    ArchitectureNode,
  gateway:  ArchitectureNode,
  worker:   ArchitectureNode,
  frontend: ArchitectureNode,
};
