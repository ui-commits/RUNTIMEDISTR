import assert from 'node:assert/strict';
import test from 'node:test';
import { getNodeHealth, getNodeResourcePressure } from '../lib/health.ts';
import type { NodeData } from '../lib/ontology.ts';

function node(metrics: Record<string, string | number>): NodeData {
  return { id: 'node', label: 'Node', type: 'MODULE', status: 'ONLINE', metrics, logs: [], parentId: null, childrenIds: [] };
}

test('resource pressure is reported without changing connectivity health', () => {
  const highLoad = node({ resource_load: '92%' });
  assert.equal(getNodeResourcePressure(highLoad).status, 'high');
  assert.equal(getNodeHealth(highLoad).status, 'healthy');
});

test('resource pressure treats unavailable metrics as unreported', () => {
  assert.equal(getNodeResourcePressure(node({})).status, 'unknown');
});