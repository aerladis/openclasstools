import React, { useState, useEffect, useRef } from 'react';
import { isSpeechRecognitionSupported, createSpeechRecognizer, evaluateSpeechSimilarity } from '../services/speechService';

export default function SpeechMicButton({ targetText, focusWords = [], onAssessmentComplete }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [scoreResult, setScoreResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const recognizerRef = useRef(null);

  const supported = isSpeechRecognitionSupported();

  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        try { recognizerRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  if (!supported) {
    return null; // Gracefully hide if speech API unavailable
  }

  const startListening = () => {
    setErrorMsg('');
    setScoreResult(null);
    setTranscript('');

    const recognizer = createSpeechRecognizer({
      onResult: ({ transcript: text, isFinal }) => {
        setTranscript(text);
        if (isFinal) {
          stopListeningAndEvaluate(text);
        }
      },
      onError: (err) => {
        setErrorMsg('Microphone error or permission denied.');
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      }
    });

    if (recognizer) {
      recognizerRef.current = recognizer;
      try {
        recognizer.start();
        setIsListening(true);
      } catch (e) {
        setErrorMsg('Failed to start microphone.');
      }
    }
  };

  const stopListeningAndEvaluate = (textToEvaluate) => {
    if (recognizerRef.current) {
      try { recognizerRef.current.stop(); } catch (e) {}
    }
    setIsListening(false);

    const spoken = textToEvaluate || transcript;
    if (spoken) {
      const evaluation = evaluateSpeechSimilarity(spoken, targetText, focusWords);
      setScoreResult(evaluation);
      if (onAssessmentComplete) {
        onAssessmentComplete(evaluation);
      }
    }
  };

  return (
    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <button
        type="button"
        onClick={isListening ? () => stopListeningAndEvaluate() : startListening}
        style={{
          background: isListening ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #0d9488, #0284c7)',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.95rem',
          padding: '10px 20px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          boxShadow: isListening ? '0 0 15px rgba(239, 68, 68, 0.7)' : '0 4px 12px rgba(13, 148, 136, 0.4)',
          transition: 'all 0.2s ease',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>{isListening ? '🎙️ Listening... (Click to Finish)' : '🎙️ Speak with Microphone'}</span>
      </button>

      {transcript && (
        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontStyle: 'italic', background: 'rgba(15, 23, 42, 0.6)', padding: '6px 12px', borderRadius: '6px' }}>
          "{transcript}"
        </div>
      )}

      {scoreResult && (
        <div style={{
          background: scoreResult.isPass ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
          border: `1px solid ${scoreResult.isPass ? '#22c55e' : '#f59e0b'}`,
          color: scoreResult.isPass ? '#4ade80' : '#fbbf24',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          {scoreResult.isPass ? `🌟 Pronunciation Accuracy: ${scoreResult.score}% (PASSED!)` : `👍 Score: ${scoreResult.score}% — Try reading out loud clearly!`}
        </div>
      )}

      {errorMsg && <div style={{ fontSize: '0.8rem', color: '#f87171' }}>{errorMsg}</div>}
    </div>
  );
}
