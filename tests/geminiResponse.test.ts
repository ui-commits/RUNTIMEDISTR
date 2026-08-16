import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createOfflineGeminiResponse,
  normalizeGeminiResponse,
} from '../lib/geminiResponse.ts';

test('offline Gemini response uses the client-facing text field', () => {
  const response = createOfflineGeminiResponse('status report', 'PDX!!!');

  assert.match(response.text, /status report/);
  assert.match(response.text, /pdx/);
  assert.deepEqual(response.actions, []);
  assert.equal('response' in response, false);
});

test('offline Gemini response bounds echoed operator input', () => {
  const response = createOfflineGeminiResponse('x'.repeat(900), 'PDX');

  assert.ok(response.text.length < 700);
  assert.doesNotMatch(response.text, /x{700}/);
});

test('Gemini response normalization drops unsupported or malformed actions', () => {
  const response = normalizeGeminiResponse({
    text: 'Acknowledged',
    actions: [
      { type: 'SELECT_NODE', payload: { nodeId: 'PDX' } },
      { type: 'UNSAFE_ACTION', payload: {} },
      { type: 'UPDATE_STATUS', payload: { status: 'ONLINE' } },
    ],
  });

  assert.equal(response.text, 'Acknowledged');
  assert.deepEqual(response.actions, [{ type: 'SELECT_NODE', payload: { nodeId: 'pdx' } }]);
});

test('Gemini response normalization bounds response text and action count', () => {
  const response = normalizeGeminiResponse({
    text: `  ${'x'.repeat(13_000)}  `,
    actions: Array.from({ length: 20 }, () => ({ type: 'SELECT_NODE', payload: { nodeId: 'pdx' } })),
  });

  assert.equal(response.text.length, 12_000);
  assert.equal(response.actions.length, 10);
});