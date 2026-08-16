import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from '../app/api/gemini/chat/route.ts';

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/gemini/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

test('Gemini route returns offline response without server API key', async () => {
  const previousGeminiKey = process.env.GEMINI_API_KEY;
  const previousHermesToken = process.env.HERMES_API_TOKEN;
  delete process.env.GEMINI_API_KEY;
  delete process.env.HERMES_API_TOKEN;

  try {
    const response = await POST(makeRequest({
      currentNodeId: 'PDX!!!',
      messages: [{ role: 'user', content: 'status report' }],
      nodesState: {},
    }) as Parameters<typeof POST>[0]);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.match(body.text, /pdx/);
    assert.deepEqual(body.actions, []);
  } finally {
    if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousGeminiKey;
    if (previousHermesToken === undefined) delete process.env.HERMES_API_TOKEN;
    else process.env.HERMES_API_TOKEN = previousHermesToken;
  }
});

test('Gemini route enforces optional Hermes API token when configured', async () => {
  const previousHermesToken = process.env.HERMES_API_TOKEN;
  process.env.HERMES_API_TOKEN = 'test-token';

  try {
    const response = await POST(makeRequest({
      messages: [{ role: 'user', content: 'hello' }],
    }) as Parameters<typeof POST>[0]);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.error, 'Unauthorized.');
  } finally {
    if (previousHermesToken === undefined) delete process.env.HERMES_API_TOKEN;
    else process.env.HERMES_API_TOKEN = previousHermesToken;
  }
});

test('Gemini route rejects oversized declared request bodies', async () => {
  const previousHermesToken = process.env.HERMES_API_TOKEN;
  delete process.env.HERMES_API_TOKEN;

  try {
    const response = await POST(makeRequest({
      messages: [{ role: 'user', content: 'hello' }],
    }, { 'content-length': '900001' }) as Parameters<typeof POST>[0]);
    const body = await response.json();

    assert.equal(response.status, 413);
    assert.equal(body.error, 'Request body exceeds the size limit.');
  } finally {
    if (previousHermesToken === undefined) delete process.env.HERMES_API_TOKEN;
    else process.env.HERMES_API_TOKEN = previousHermesToken;
  }
});