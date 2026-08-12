export function parseOrderingLines(rawPrompt) {
  if (!rawPrompt || typeof rawPrompt !== 'string') return [];

  let text = rawPrompt.trim();

  // Strip common header prefix if present (e.g. "Put this conversation / restaurant dialogue / phone call in order:")
  text = text.replace(/^(put\s+this\s+[a-z0-9\s-]+\s+(in\s+)?(the\s+)?(correct\s+)?order\s*:?|reorder\s+([a-z0-9\s-]+)?:?|order\s+([a-z0-9\s-]+)?:?)/i, '').trim();

  let lines = [];
  if (/(^|\s)[1-9]\.\s+/.test(text)) {
    lines = text.split(/(?=(?:^|\s)[1-9]\.\s+)/).map(s => s.trim()).filter(Boolean);
  } else if (text.includes('\n')) {
    lines = text.split('\n').map(s => s.trim()).filter(Boolean);
  } else if (/[A-Z][a-z]*\s*:\s*/.test(text)) {
    lines = text.split(/(?=[A-Z][a-z]*\s*:\s*)/).map(s => s.trim()).filter(Boolean);
  } else {
    lines = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  }

  return lines
    .map(line => line
      .replace(/^(put\s+this\s+conversation[^:]*:?)/i, '')
      .replace(/^([1-9]\d*[.)]|step\s*\d+:?|line\s*\d+:?)\s*/i, '')
      .trim()
    )
    .filter(Boolean);
}

export function getCorrectOrderingSteps(prompt, answer) {
  const promptLines = parseOrderingLines(prompt);
  if (!promptLines || promptLines.length === 0) return [];

  // Handle Array answer format
  if (Array.isArray(answer)) {
    if (answer.every(item => typeof item === 'number' || /^\d+$/.test(String(item).trim()))) {
      const indices = answer.map(item => parseInt(item, 10));
      const isOneBased = indices.every(i => i >= 1 && i <= promptLines.length);
      const isZeroBased = indices.every(i => i >= 0 && i < promptLines.length);
      if (isOneBased) {
        const resolved = indices.map(idx => promptLines[idx - 1]).filter(Boolean);
        if (resolved.length === promptLines.length) return resolved;
      } else if (isZeroBased) {
        const resolved = indices.map(idx => promptLines[idx]).filter(Boolean);
        if (resolved.length === promptLines.length) return resolved;
      }
    } else {
      const cleanSteps = answer.map(s => String(s).trim().replace(/^([1-9]\d*[.)]|step\s*\d+:?|line\s*\d+:?)\s*/i, '')).filter(Boolean);
      if (cleanSteps.length > 0) return cleanSteps;
    }
  }

  const answerStr = String(answer || '').trim();

  // Check if answer is an index sequence like "2, 3, 1" or "2 -> 3 -> 1" or "2,1,3" or "2. 3. 1"
  const digits = answerStr.match(/\d+/g);
  if (digits && digits.length === promptLines.length) {
    const indices = digits.map(d => parseInt(d, 10));
    const isOneBased = indices.every(i => i >= 1 && i <= promptLines.length);
    const isZeroBased = indices.every(i => i >= 0 && i < promptLines.length);

    if (isOneBased) {
      const resolved = indices.map(idx => promptLines[idx - 1]).filter(Boolean);
      if (resolved.length === promptLines.length) return resolved;
    } else if (isZeroBased) {
      const resolved = indices.map(idx => promptLines[idx]).filter(Boolean);
      if (resolved.length === promptLines.length) return resolved;
    }
  }

  // If answer contains full text lines separated by \n, ->, or ;
  if (answerStr.includes('\n') || answerStr.includes('->') || answerStr.includes(';')) {
    const rawSteps = answerStr
      .split(/->|\n|;/)
      .map(s => s.trim().replace(/^([1-9]\d*[.)]|step\s*\d+:?|line\s*\d+:?)\s*/i, ''))
      .filter(Boolean);
    if (rawSteps.length > 0) return rawSteps;
  }

  // If answer is plain text without digits matching prompt count
  if (answerStr && !/\d+/.test(answerStr)) {
    return [answerStr];
  }

  // Default fallback: promptLines
  return promptLines;
}
