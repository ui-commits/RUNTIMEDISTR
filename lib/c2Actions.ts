import type { NodeData, NodeStatus } from './ontology';

export const NODE_STATUSES: readonly NodeStatus[] = [
  'ONLINE',
  'OFFLINE',
  'STANDBY',
  'SYNCED',
  'FLOWING',
  'EXECUTING',
  'STABLE',
];

const NODE_STATUS_SET = new Set<string>(NODE_STATUSES);
const ACTION_TYPES = new Set([
  'SELECT_NODE',
  'UPDATE_STATUS',
  'UPDATE_METRICS',
  'ADD_LOG',
  'CREATE_NODE',
  'DELETE_NODE',
  'TOGGLE_PIN',
  'SET_RESOURCE_LOAD',
  'EXECUTE_DIAGNOSTIC',
]);

const MAX_ID_LENGTH = 128;
const MAX_LABEL_LENGTH = 160;
const MAX_TYPE_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_LOG_LENGTH = 2000;
const MAX_METRIC_KEYS = 20;
const MAX_METRIC_KEY_LENGTH = 64;
const MAX_METRIC_STRING_LENGTH = 500;

export interface C2Action {
  type: string;
  payload: Record<string, unknown>;
}

export interface NodeMutationResult {
  ok: boolean;
  nodes: Record<string, NodeData>;
  message: string;
  nodeId?: string;
  affectedIds?: string[];
}

export function isNodeStatus(value: unknown): value is NodeStatus {
  return typeof value === 'string' && NODE_STATUS_SET.has(value.toUpperCase());
}

export function normalizeNodeStatus(value: unknown): NodeStatus | null {
  if (!isNodeStatus(value)) return null;
  return value.toUpperCase() as NodeStatus;
}

export function sanitizeNodeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '').slice(0, MAX_ID_LENGTH);
}

function normalizeNodeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const sanitized = sanitizeNodeId(value.trim());
  return sanitized || null;
}

function normalizeBoundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function normalizeMetrics(value: unknown): Record<string, string | number> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > MAX_METRIC_KEYS) return null;

  const metrics: Record<string, string | number> = {};
  for (const [key, entry] of entries) {
    const metricKey = key.trim().slice(0, MAX_METRIC_KEY_LENGTH);
    if (!metricKey) return null;
    if (typeof entry === 'number') {
      if (!Number.isFinite(entry)) return null;
      metrics[metricKey] = entry;
      continue;
    }
    if (typeof entry === 'string') {
      metrics[metricKey] = entry.trim().slice(0, MAX_METRIC_STRING_LENGTH);
      continue;
    }
    return null;
  }
  return metrics;
}

export function normalizeC2Action(value: unknown): C2Action | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { type?: unknown; payload?: unknown };
  if (typeof candidate.type !== 'string' || !ACTION_TYPES.has(candidate.type)) return null;
  if (!candidate.payload || typeof candidate.payload !== 'object' || Array.isArray(candidate.payload)) return null;
  const payload = candidate.payload as Record<string, unknown>;
  const nodeId = normalizeNodeId(payload.nodeId ?? payload.id);

  switch (candidate.type) {
    case 'SELECT_NODE':
    case 'DELETE_NODE':
      return nodeId ? { type: candidate.type, payload: { nodeId } } : null;

    case 'UPDATE_STATUS': {
      const status = normalizeNodeStatus(payload.status);
      return nodeId && status ? { type: candidate.type, payload: { nodeId, status } } : null;
    }

    case 'UPDATE_METRICS': {
      const metrics = normalizeMetrics(payload.metrics);
      return nodeId && metrics ? { type: candidate.type, payload: { nodeId, metrics } } : null;
    }

    case 'ADD_LOG': {
      const log = normalizeBoundedString(payload.log ?? payload.message, MAX_LOG_LENGTH);
      return nodeId && log ? { type: candidate.type, payload: { nodeId, log } } : null;
    }

    case 'CREATE_NODE': {
      const parentId = normalizeNodeId(payload.parentId);
      const id = normalizeNodeId(payload.id);
      const label = normalizeBoundedString(payload.label ?? id, MAX_LABEL_LENGTH);
      const type = normalizeBoundedString(payload.type ?? 'MODULE', MAX_TYPE_LENGTH);
      const status = normalizeNodeStatus(payload.status ?? 'ONLINE');
      const description = normalizeBoundedString(
        payload.description ?? 'Created via terminal agent.',
        MAX_DESCRIPTION_LENGTH,
      );
      const metrics = payload.metrics === undefined
        ? { status: 'ACTIVE' }
        : normalizeMetrics(payload.metrics);

      return parentId && id && label && type && status && metrics && description
        ? { type: candidate.type, payload: { parentId, id, label, type, status, description, metrics } }
        : null;
    }

    case 'TOGGLE_PIN':
      return nodeId && (payload.pinned === undefined || typeof payload.pinned === 'boolean')
        ? { type: candidate.type, payload: { nodeId, pinned: payload.pinned } }
        : null;

    case 'SET_RESOURCE_LOAD': {
      const load = typeof payload.load === 'number' ? payload.load : Number(payload.load ?? payload.resource_load);
      return nodeId && Number.isFinite(load) && load >= 0 && load <= 100
        ? { type: candidate.type, payload: { nodeId, load } }
        : null;
    }

    case 'EXECUTE_DIAGNOSTIC':
      return nodeId ? { type: candidate.type, payload: { nodeId } } : null;

    default:
      return null;
  }
}

export function isMetricRecord(value: unknown): value is Record<string, string | number> {
  return normalizeMetrics(value) !== null;
}

export function createNodeState(
  nodes: Record<string, NodeData>,
  params: {
    parentId: string;
    id: string;
    label: string;
    type: string;
    status: NodeStatus;
    description: string;
    metrics: Record<string, string | number>;
  },
): NodeMutationResult {
  const nodeId = sanitizeNodeId(params.id);
  if (!nodeId) {
    return { ok: false, nodes, message: 'Node ID must contain at least one letter or number.' };
  }
  if (!nodes[params.parentId]) {
    return { ok: false, nodes, message: `Parent node [${params.parentId}] was not found.` };
  }
  if (nodes[nodeId]) {
    return { ok: false, nodes, message: `Node [${nodeId}] already exists.` };
  }

  const parent = nodes[params.parentId];
  const newNode: NodeData = {
    id: nodeId,
    label: params.label,
    type: params.type.toUpperCase(),
    status: params.status,
    description: params.description,
    metrics: params.metrics,
    logs: [`[SYS] Node "${nodeId}" provisioned under parent "${params.parentId}".`],
    parentId: params.parentId,
    childrenIds: [],
  };

  return {
    ok: true,
    nodeId,
    message: `New node [${nodeId}] provisioned under [${params.parentId}].`,
    nodes: {
      ...nodes,
      [params.parentId]: {
        ...parent,
        childrenIds: [...parent.childrenIds, nodeId],
        logs: [`[SYS] Child node attached: ${nodeId}`, ...parent.logs].slice(0, 20),
      },
      [nodeId]: newNode,
    },
  };
}

export function deleteNodeSubtreeState(
  nodes: Record<string, NodeData>,
  nodeId: string,
): NodeMutationResult {
  if (nodeId === 'earth') {
    return { ok: false, nodes, message: 'The root node [earth] cannot be deleted.' };
  }
  if (!nodes[nodeId]) {
    return { ok: false, nodes, message: `Node [${nodeId}] was not found.` };
  }

  const deletedIds = new Set<string>();
  const pending = [nodeId];
  while (pending.length > 0) {
    const currentId = pending.pop();
    if (!currentId || deletedIds.has(currentId)) continue;
    deletedIds.add(currentId);
    for (const childId of nodes[currentId]?.childrenIds ?? []) {
      pending.push(childId);
    }
  }

  const next: Record<string, NodeData> = {};
  for (const [id, node] of Object.entries(nodes)) {
    if (deletedIds.has(id)) continue;
    const childrenIds = node.childrenIds.filter((childId) => !deletedIds.has(childId));
    next[id] = childrenIds.length === node.childrenIds.length
      ? node
      : {
          ...node,
          childrenIds,
          logs: [`[SYS] Child subtree decommissioned: ${nodeId}`, ...node.logs].slice(0, 20),
        };
  }

  return {
    ok: true,
    nodes: next,
    affectedIds: [...deletedIds],
    message: `Node subtree [${nodeId}] decommissioned (${deletedIds.size} node${deletedIds.size === 1 ? '' : 's'}).`,
  };
}