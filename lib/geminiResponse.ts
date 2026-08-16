import { normalizeC2Action, sanitizeNodeId, type C2Action } from './c2Actions';

const MAX_RESPONSE_TEXT_LENGTH = 12_000;
const MAX_RESPONSE_ACTIONS = 10;
const MAX_OFFLINE_ECHO_LENGTH = 500;

export interface GeminiTerminalResponse {
  text: string;
  actions: C2Action[];
}

export function createOfflineGeminiResponse(
  lastMessage: string,
  currentNodeId = 'earth',
): GeminiTerminalResponse {
  const safeNodeId = sanitizeNodeId(currentNodeId) || 'earth';
  const safeMessage = lastMessage.trim().slice(0, MAX_OFFLINE_ECHO_LENGTH);

  return {
    text: `[HERMES-KERNEL-OFFLINE] Gemini API key not detected in server environment.\nReady to process system queries locally. Current target: ${safeNodeId}\nCommand parsed: "${safeMessage}"`,
    actions: [],
  };
}

export function normalizeGeminiResponse(value: unknown): GeminiTerminalResponse {
  if (!value || typeof value !== 'object') {
    return { text: '[No response from AI Kernel]', actions: [] };
  }

  const candidate = value as { text?: unknown; actions?: unknown };
  const actions = Array.isArray(candidate.actions)
    ? candidate.actions
        .slice(0, MAX_RESPONSE_ACTIONS)
        .map(normalizeC2Action)
        .filter((action): action is C2Action => action !== null)
    : [];

  const text = typeof candidate.text === 'string' && candidate.text.trim()
    ? candidate.text.trim().slice(0, MAX_RESPONSE_TEXT_LENGTH)
    : '[No response from AI Kernel]';

  return { text, actions };
}