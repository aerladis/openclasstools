import React, { useState } from 'react';
import '../styles/worksheet-print.css';

export default function WorksheetExportModal({ deck, onClose }) {
  const [worksheetType, setWorksheetType] = useState('infogap'); // 'infogap' | 'flashcards' | 'quiz'
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [schoolName, setSchoolName] = useState('OpenClassTools English Academy');

  if (!deck || !Array.isArray(deck.content)) {
    return null;
  }

  const handlePrint = () => {
    window.print();
  };

  const content = deck.content;
  const midPoint = Math.ceil(content.length / 2);
  const studentAItems = content.slice(0, midPoint);
  const studentBItems = content.slice(midPoint);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 no-print">
      <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto text-white shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-700 pb-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-amber-300 bg-clip-text text-transparent">
              🖨️ Printable Classroom Worksheet Exporter
            </h2>
            <p className="text-slate-400 text-sm">
              Convert deck <span className="text-purple-300 font-semibold">{deck.name}</span> ({deck.gameType}) into print-ready A4 classroom handouts.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold px-3 py-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Controls Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-800/60 p-4 rounded-xl border border-slate-700">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Worksheet Layout</label>
            <select
              value={worksheetType}
              onChange={(e) => setWorksheetType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
            >
              <option value="infogap">🗣️ Student Pair-Work (Info Gap A/B)</option>
              <option value="flashcards">🎴 Flashcard Cutout Grid (3x3)</option>
              <option value="quiz">✍️ Activity & Quiz Worksheet</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Header / School Name</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
              placeholder="e.g. Cambridge ELT Center"
            />
          </div>

          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={includeAnswerKey}
                onChange={(e) => setIncludeAnswerKey(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              Include Answer Key
            </label>
            <button
              onClick={handlePrint}
              className="flex-1 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition transform active:scale-95 text-sm"
            >
              🖨️ Print / Save PDF
            </button>
          </div>
        </div>

        {/* Live Printable Preview Area */}
        <div className="bg-white text-slate-900 p-8 rounded-xl print-container shadow-inner min-h-[400px]">
          <div className="print-header">
            <div>
              <h1 className="print-title">{deck.name}</h1>
              <div className="print-subtitle">{schoolName} • ELT Classroom Handout</div>
            </div>
            <div className="print-student-info">
              Name: ____________________ Date: _________
            </div>
          </div>

          {/* 1. Info Gap Layout */}
          {worksheetType === 'infogap' && (
            <div className="info-gap-grid">
              <div className="info-gap-column">
                <h3 className="info-gap-heading">👤 STUDENT A (Describe to B)</h3>
                <ol className="list-decimal pl-5 space-y-3">
                  {studentAItems.map((item, idx) => (
                    <li key={idx} className="text-sm">
                      <strong>{typeof item === 'string' ? item : item.word || item.targetWord || `Item ${idx + 1}`}:</strong>{' '}
                      {item.clue || item.prompt || (item.forbidden ? `(Forbidden: ${item.forbidden.join(', ')})` : 'Describe this item to your partner without naming it directly.')}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="info-gap-column">
                <h3 className="info-gap-heading">👥 STUDENT B (Describe to A)</h3>
                <ol className="list-decimal pl-5 space-y-3" start={midPoint + 1}>
                  {studentBItems.map((item, idx) => (
                    <li key={idx} className="text-sm">
                      <strong>{typeof item === 'string' ? item : item.word || item.targetWord || `Item ${idx + midPoint + 1}`}:</strong>{' '}
                      {item.clue || item.prompt || (item.forbidden ? `(Forbidden: ${item.forbidden.join(', ')})` : 'Describe this item to your partner without naming it directly.')}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* 2. Flashcard Grid Layout */}
          {worksheetType === 'flashcards' && (
            <div className="flashcard-print-grid">
              {content.map((item, idx) => (
                <div key={idx} className="flashcard-cutout-box">
                  <div className="flashcard-cutout-word">
                    {typeof item === 'string' ? item : item.word || item.targetWord || `Item ${idx + 1}`}
                  </div>
                  <div className="flashcard-cutout-sub">
                    {item.meaning || item.clue || item.category || 'Vocabulary Card'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. Quiz & Activity Layout */}
          {worksheetType === 'quiz' && (
            <div className="quiz-item-list">
              <h3 className="font-bold text-lg mb-3">Activity Questions & Tasks</h3>
              <div className="space-y-4">
                {content.map((item, idx) => (
                  <div key={idx} className="quiz-item-box">
                    <div className="quiz-item-prompt">
                      {idx + 1}. {item.question || item.prompt || item.clue || `Define: ${item.word || item}`}
                    </div>
                    {item.options && (
                      <div className="grid grid-cols-2 gap-2 mt-2 pl-4 text-sm">
                        {item.options.map((opt, oIdx) => (
                          <div key={oIdx}>({String.fromCharCode(65 + oIdx)}) {opt}</div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 text-sm text-slate-500">
                      Answer: <span className="quiz-item-blank"></span>
                    </div>
                  </div>
                ))}
              </div>

              {includeAnswerKey && (
                <div className="print-page mt-8 pt-6 border-t-2 border-dashed border-slate-400">
                  <h3 className="font-bold text-base mb-2 text-slate-700">🔑 Answer Key (Teacher Copy)</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    {content.map((item, idx) => (
                      <div key={idx}>
                        <strong>{idx + 1}.</strong> {item.answer !== undefined ? String(item.answer) : item.correct !== undefined ? item.options[item.correct] : item.word || item.targetWord || 'Key'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
