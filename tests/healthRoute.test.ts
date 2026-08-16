import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../app/health/route.ts';

test('health route returns a non-cacheable healthy response', async () => {
  const response = GET();
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(body.ok, true);
  assert.equal(body.service, 'hermes-c2');
  assert.equal(body.status, 'healthy');
  assert.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});