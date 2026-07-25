export const EDITOR_CONFIG = {
  who: { stringEntries: true, add: 'New character' },
  taboo: {
    fields: [
      { key: 'word', label: 'Target word' },
      { key: 'forbidden', label: 'Forbidden words', list: true },
    ],
    add: { word: 'New word', forbidden: ['first', 'second', 'third'] },
  },
  hangman: {
    fields: [{ key: 'word', label: 'Word' }, { key: 'category', label: 'Category' }],
    add: { word: 'NEW WORD', category: 'General' },
  },
  millionaire: {
    fields: [
      { key: 'question', label: 'Question' },
      { key: 'options', label: 'Options', fixedList: 4 },
      { key: 'correct', label: 'Correct option', optionIndex: true },
    ],
    add: { question: 'New question?', options: ['A', 'B', 'C', 'D'], correct: 0 },
  },
  kelime: {
    fields: [{ key: 'question', label: 'Clue' }, { key: 'answer', label: 'Answer' }],
    add: { question: 'New clue', answer: 'ANSWER' },
  },
  flashcards: {
    fields: [{ key: 'word', label: 'Word' }, { key: 'meaning', label: 'Meaning' }],
    add: { word: 'word', meaning: 'meaning' },
  },
  hats: {
    fields: [
      { key: 'color', label: 'Hat color', readOnly: true },
      { key: 'questions', label: 'Questions', list: true },
      { key: 'starters', label: 'Sentence starters', list: true },
    ],
  },
};

export function fieldsFor(gameType, entry) {
  if (gameType !== 'lingoparty') return EDITOR_CONFIG[gameType]?.fields || [];
  if (entry.type === 'scramble') {
    return [
      { key: 'type', label: 'Type', readOnly: true },
      { key: 'scrambledWord', label: 'Scrambled word' },
      { key: 'targetWord', label: 'Target word' },
      { key: 'clue', label: 'Clue' },
    ];
  }
  return [
    { key: 'type', label: 'Type', readOnly: true },
    { key: 'prompt', label: 'Prompt' },
    { key: 'answer', label: 'Answer', boolean: entry.type === 'truefalse' },
  ];
}

export function newEntryFor(gameType) {
  if (gameType === 'lingoparty') {
    return { type: 'riddle', prompt: 'New challenge', answer: 'Answer' };
  }
  const entry = EDITOR_CONFIG[gameType]?.add;
  return typeof entry === 'object' ? structuredClone(entry) : entry;
}
