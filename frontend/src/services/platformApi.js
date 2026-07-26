const STORAGE_KEYS = {
  teacherName: 'oct_teacher_name',
  keySource: 'oct_ai_key_source',
  geminiKey: 'oct_gemini_key',
};

export class PlatformApiError extends Error {
  constructor(message, { status = 0, code = 'PLATFORM_REQUEST_FAILED' } = {}) {
    super(message);
    this.name = 'PlatformApiError';
    this.status = status;
    this.code = code;
  }
}

function stores() {
  return {
    session: window.sessionStorage,
  };
}

export function getTeacherContext() {
  const { session } = stores();
  return {
    teacherDisplayName: session.getItem(STORAGE_KEYS.teacherName) || '',
    keySource: 'teacher',
    geminiApiKey: session.getItem(STORAGE_KEYS.geminiKey) || '',
  };
}

export function saveTeacherSettings({
  teacherDisplayName,
  geminiApiKey,
}) {
  const name = typeof teacherDisplayName === 'string'
    ? teacherDisplayName.trim().replace(/\s+/g, ' ')
    : '';
  if (!name) throw new PlatformApiError('Teacher name is required', { status: 400 });
  if (name.length > 120) {
    throw new PlatformApiError('Teacher name must be at most 120 characters', { status: 400 });
  }
  const key = typeof geminiApiKey === 'string' ? geminiApiKey.trim() : '';
  if (!key) {
    throw new PlatformApiError('Gemini API key is required', {
      status: 400,
      code: 'TEACHER_AI_KEY_REQUIRED',
    });
  }

  const { session } = stores();
  session.setItem(STORAGE_KEYS.teacherName, name);
  session.setItem(STORAGE_KEYS.geminiKey, key);
  return getTeacherContext();
}

export function hasTeacherKey() {
  return Boolean(getTeacherContext().geminiApiKey);
}

export function declineAiFeatures() {
  window.sessionStorage.setItem('oct_ai_declined', 'true');
}

export function wantsAiFeatures() {
  return window.sessionStorage.getItem('oct_ai_declined') !== 'true';
}

async function request(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new PlatformApiError('Unable to reach the game server');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new PlatformApiError(body.error || 'The game server rejected the request', {
      status: response.status,
      code: body.code,
    });
  }
  return body;
}

function requiredTeacherContext() {
  const context = getTeacherContext();
  if (!context.teacherDisplayName) {
    throw new PlatformApiError('Teacher name is required', { status: 400 });
  }
  if (!context.geminiApiKey) {
    throw new PlatformApiError('Gemini API key is required', {
      status: 400,
      code: 'TEACHER_AI_KEY_REQUIRED',
    });
  }
  return context;
}

export async function listDecks(gameType) {
  const query = new URLSearchParams({ gameType });
  return (await request(`/api/decks?${query}`)).decks || [];
}

export async function generateDeck(gameType, endpoint, input, onLog = () => {}) {
  const context = requiredTeacherContext();
  if (!input?.deckName?.trim()) {
    throw new PlatformApiError('Deck name is required', { status: 400 });
  }
  onLog('Sending request...');
  const body = await request(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-teacher-name': context.teacherDisplayName,
      'x-ai-key-source': 'teacher',
      'x-gemini-api-key': context.geminiApiKey,
    },
    body: JSON.stringify({ ...input, deckName: input.deckName.trim() }),
  });
  const count = body.deck?.currentVersion?.content?.length || body.count || 0;
  onLog(`Received ${count} items`);
  onLog('Saving deck...');
  return body.deck;
}

export async function startSession(input) {
  const context = requiredTeacherContext();
  return (await request('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      teacherDisplayName: context.teacherDisplayName,
      participantNames: input.participantNames || [],
    }),
  })).session;
}

export async function startSessionSafely(input, onWarning) {
  try {
    return await startSession(input);
  } catch (error) {
    if (typeof onWarning === 'function') onWarning(error);
    return null;
  }
}

export async function completeSession(sessionId, result = {}) {
  if (!sessionId) return null;
  return (await request(`/api/sessions/${encodeURIComponent(sessionId)}/complete`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result }),
  })).session;
}
