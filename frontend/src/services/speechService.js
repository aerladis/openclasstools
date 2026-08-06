/**
 * Web Speech API Service for Spoken Fluency Assessment
 */

export function isSpeechRecognitionSupported() {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createSpeechRecognizer({ onResult, onError, onEnd }) {
  if (!isSpeechRecognitionSupported()) return null;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    const isFinal = event.results[event.results.length - 1].isFinal;
    if (onResult) {
      onResult({ transcript: transcript.trim(), isFinal });
    }
  };

  if (onError) recognition.onerror = onError;
  if (onEnd) recognition.onend = onEnd;

  return recognition;
}

export function evaluateSpeechSimilarity(spokenText, targetSentence, focusWords = []) {
  if (!spokenText || !targetSentence) {
    return { score: 0, isPass: false, matchedFocus: [] };
  }

  const cleanSpoken = String(spokenText).toLowerCase().replace(/[^\w\s]/g, '').trim();
  const cleanTarget = String(targetSentence).toLowerCase().replace(/[^\w\s]/g, '').trim();

  const spokenTokens = new Set(cleanSpoken.split(/\s+/));
  const targetTokens = cleanTarget.split(/\s+/);

  let matchCount = 0;
  targetTokens.forEach(token => {
    if (spokenTokens.has(token)) matchCount++;
  });

  const wordMatchRatio = targetTokens.length > 0 ? matchCount / targetTokens.length : 0;
  
  const matchedFocus = focusWords.filter(w => spokenTokens.has(w.toLowerCase().trim()));
  const focusRatio = focusWords.length > 0 ? matchedFocus.length / focusWords.length : 1.0;

  const finalScore = Math.round((wordMatchRatio * 0.7 + focusRatio * 0.3) * 100);

  return {
    score: finalScore,
    isPass: finalScore >= 50,
    matchedFocus
  };
}
