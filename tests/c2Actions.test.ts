import assert from 'node:assert/strict';
import test from 'node:test';
import type { NodeData } from '../lib/ontology.ts';
import {
  createNodeState,
  deleteNodeSubtreeState,
  isMetricRecord,
  normalizeC2Action,
  normalizeNodeStatus,
} from '../lib/c2Actions.ts';

function makeNode(id: string, parentId: string | null, childrenIds: string[]): NodeData {
  return {
    id,
    label: id.toUpperCase(),
    type: parentId ? 'MODULE' : 'ROOT',
    status: 'ONLINE',
    metrics: {},
    logs: [],
    parentId,
    childrenIds,
  };
}

test('deleteNodeSubtreeState removes descendants and repairs parent links', () => {
  const nodes = {
    earth: makeNode('earth', null, ['parent']),
    parent: makeNode('parent', 'earth', ['child']),
    child: makeNode('child', 'parent', ['grandchild']),
    grandchild: makeNode('grandchild', 'child', []),
  };

  const result = deleteNodeSubtreeState(nodes, 'parent');

  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.nodes), ['earth']);
  assert.deepEqual(result.nodes.earth.childrenIds, []);
  assert.deepEqual(new Set(result.affectedIds), new Set(['parent', 'child', 'grandchild']));
});

test('createNodeState rejects duplicate IDs and missing parents', () => {
  const nodes = { earth: makeNode('earth', null, []) };
  const baseParams = {
    parentId: 'earth',
    id: 'earth',
    label: 'Duplicate',
    type: 'module',
    status: 'ONLINE' as const,
    description: 'test',
    metrics: {},
  };

  assert.equal(createNodeState(nodes, baseParams).ok, false);
  assert.equal(createNodeState(nodes, { ...baseParams, id: 'child', parentId: 'missing' }).ok, false);
});

test('action and status normalization reject malformed model output', () => {
  assert.equal(normalizeNodeStatus('offline'), 'OFFLINE');
  assert.equal(normalizeNodeStatus('COMPROMISED'), null);
  assert.deepEqual(normalizeC2Action({ type: 'UPDATE_STATUS', payload: { nodeId: 'PDX', status: 'online' } }), {
    type: 'UPDATE_STATUS',
    payload: { nodeId: 'pdx', status: 'ONLINE' },
  });
  assert.equal(normalizeC2Action({ type: 'UPDATE_STATUS', payload: { status: 'ONLINE' } }), null);
  assert.equal(normalizeC2Action({ type: 'DESTROY_EVERYTHING', payload: {} }), null);
  assert.equal(normalizeC2Action({ type: 'UPDATE_STATUS', payload: [] }), null);
});

test('action normalization supports validated layout and pressure actions', () => {
  assert.deepEqual(normalizeC2Action({ type: 'TOGGLE_PIN', payload: { nodeId: 'pdx', pinned: true } }), {
    type: 'TOGGLE_PIN',
    payload: { nodeId: 'pdx', pinned: true },
  });
  assert.deepEqual(normalizeC2Action({ type: 'SET_RESOURCE_LOAD', payload: { nodeId: 'pdx', load: 72 } }), {
    type: 'SET_RESOURCE_LOAD',
    payload: { nodeId: 'pdx', load: 72 },
  });
  assert.equal(normalizeC2Action({ type: 'SET_RESOURCE_LOAD', payload: { nodeId: 'pdx', load: 101 } }), null);
});

test('action normalization strips extra fields and validates mutation payload shapes', () => {
  assert.deepEqual(normalizeC2Action({
    type: 'ADD_LOG',
    payload: { nodeId: 'PDX!!!', log: '  hello  ', ignored: '<script />' },
  }), {
    type: 'ADD_LOG',
    payload: { nodeId: 'pdx', log: 'hello' },
  });

  assert.deepEqual(normalizeC2Action({
    type: 'CREATE_NODE',
    payload: {
      parentId: 'PDX',
      id: 'New Service!',
      label: 'New Service',
      type: 'service',
      metrics: { latency: '4ms' },
      extra: { nested: true },
    },
  }), {
    type: 'CREATE_NODE',
    payload: {
      parentId: 'pdx',
      id: 'new_service',
      label: 'New Service',
      type: 'service',
      status: 'ONLINE',
      description: 'Created via terminal agent.',
      metrics: { latency: '4ms' },
    },
  });

  assert.equal(normalizeC2Action({ type: 'UPDATE_METRICS', payload: { nodeId: 'pdx', metrics: { nested: {} } } }), null);
  assert.equal(isMetricRecord({ healthy: true }), false);
});