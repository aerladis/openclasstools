import React, { useState } from 'react';
import styles from './SetupScreen.module.css';

const DEFAULT_DECK = [
  // --- A1 / A2 Beginner & Elementary ---
  { type: 'riddle', prompt: 'I have keys but no locks. I have space but no room. You can enter, but you can\'t go outside. What am I?', answer: 'A keyboard' },
  { type: 'riddle', prompt: 'I speak without a mouth and hear without ears. What am I?', answer: 'An echo' },
  { type: 'riddle', prompt: 'I am a bright gas star that gives light and heat to Earth. What am I?', answer: 'The Sun' },
  { type: 'scramble', scrambledWord: 'T-A-E-W-R', targetWord: 'WATER', clue: 'You drink this liquid every day.' },
  { type: 'scramble', scrambledWord: 'L-E-P-P-A', targetWord: 'APPLE', clue: 'A sweet red or green fruit.' },
  { type: 'scramble', scrambledWord: 'T-E-K-C-O-R', targetWord: 'ROCKET', clue: 'Vehicle that travels into space.' },
  { type: 'pronunciation', prompt: 'She sells seashells by the seashore clearly.' },
  { type: 'pronunciation', prompt: 'Red lorry, yellow lorry, red lorry, yellow lorry.' },
  { type: 'pronunciation', prompt: 'Six sleek swans swam swiftly southward.' },
  { type: 'association', prompt: 'Name 3 common adjectives that collocate with: WEATHER.', answer: 'sunny, rainy, cold, stormy, mild' },
  { type: 'association', prompt: 'Name 3 things you can see in the night sky.', answer: 'stars, moon, planets, satellites' },
  { type: 'grammar', prompt: 'Correct the error: She don\'t like eating vegetables.', answer: 'She doesn\'t like eating vegetables.' },
  { type: 'grammar', prompt: 'Correct the error: The moon is more small than Earth.', answer: 'The moon is smaller than Earth.' },
  { type: 'speed', prompt: 'Name 4 ball sports in 15 seconds.', answer: 'Football, Basketball, Tennis, Volleyball' },
  { type: 'speed', prompt: 'Name 3 action verbs related to kitchen cooking.', answer: 'chop, boil, fry, stir, slice' },
  { type: 'speed', prompt: 'Name 3 planets in our solar system in 15 seconds.', answer: 'Mars, Venus, Jupiter, Saturn' },
  { type: 'roleplay', prompt: 'Narrate a mission log: you are ordering food but you have an allergy. Speak it out loud.' },
  { type: 'roleplay', prompt: 'You are an astronaut reporting a strange object in space to mission control.' },
  { type: 'roleplay', prompt: 'Narrate a mission log: describe your daily routine aboard the space station.' },
  { type: 'roleplay', prompt: 'You just discovered a new star. Announce your discovery to mission control with excitement!' },

  // --- True/False A1-A2 ---
  { type: 'truefalse', prompt: '"Went" is the past tense of "go".', answer: true },
  { type: 'truefalse', prompt: '"Sheeps" is the correct plural of "sheep".', answer: false },
  { type: 'truefalse', prompt: 'The word "beautiful" is an adverb.', answer: false },
  { type: 'truefalse', prompt: '"I am" can be shortened to "I\'m" in English.', answer: true },

  // --- B1 / B2 Intermediate ---
  { type: 'riddle', prompt: 'The more of this you take, the more you leave behind. What am I?', answer: 'Footsteps' },
  { type: 'riddle', prompt: 'I have cities, but no houses. I have mountains, but no trees. What am I?', answer: 'A map' },
  { type: 'scramble', scrambledWord: 'I-T-B-R-O', targetWord: 'ORBIT', clue: 'Path taken by a planet or satellite.' },
  { type: 'scramble', scrambledWord: 'Y-X-A-L-A-G', targetWord: 'GALAXY', clue: 'Huge system of millions of stars.' },
  { type: 'pronunciation', prompt: 'Thirty-three thousand feathers flutter in the freezing breeze.' },
  { type: 'association', prompt: 'Name 3 phrasal verbs that use the word: LOOK.', answer: 'look after, look for, look up, look forward to' },
  { type: 'association', prompt: 'Name 3 nouns that collocate with: HEAVY.', answer: 'heavy rain, heavy traffic, heavy smoker, heavy workload' },
  { type: 'grammar', prompt: 'Correct the error: If I would be rich, I will buy a spacecraft.', answer: 'If I were rich, I would buy a spacecraft.' },
  { type: 'grammar', prompt: 'Correct the error: He suggested me to go to the doctor.', answer: 'He suggested that I go to the doctor.' },
  { type: 'speed', prompt: 'Name 3 adjectives to describe a movie in 15 seconds.', answer: 'thrilling, boring, emotional, hilarious' },
  { type: 'speed', prompt: 'Name 3 emotions you might feel during a long space mission.', answer: 'anxious, excited, homesick, curious' },
  { type: 'roleplay', prompt: 'Narrate a mission log: you missed your flight to London. Explain your emergency situation out loud.' },
  { type: 'roleplay', prompt: 'Narrate a mission log: convince mission control to let you extend your spacewalk by 10 minutes.' },

  // --- True/False B1-B2 ---
  { type: 'truefalse', prompt: 'In English, adjectives come AFTER the noun they describe.', answer: false },
  { type: 'truefalse', prompt: 'The present perfect tense uses "have/has" + past participle.', answer: true },
  { type: 'truefalse', prompt: '"Despite" is always followed by a noun or gerund, never a clause with a subject and verb.', answer: true },

  // --- C1 Advanced ---
  { type: 'riddle', prompt: 'I exist only where there is light, but direct light kills me. What am I?', answer: 'A shadow' },
  { type: 'scramble', scrambledWord: 'N-O-I-T-A-L-L-E-T-S-N-O-C', targetWord: 'CONSTELLATION', clue: 'A group of stars forming a pattern.' },
  { type: 'pronunciation', prompt: 'Specific statistics show systematic scientific breakthroughs.' },
  { type: 'association', prompt: 'Give 2 idioms that mean: to be extremely happy.', answer: 'on cloud nine, over the moon, in seventh heaven' },
  { type: 'grammar', prompt: 'Correct the error: Hardly had he entered the room than the alarm rang.', answer: 'Hardly had he entered the room WHEN the alarm rang.' },
  { type: 'speed', prompt: 'Name 3 synonyms for: EXTREMELY IMPORTANT in 15 seconds.', answer: 'crucial, vital, essential, imperative, paramount' },
  { type: 'roleplay', prompt: 'Narrate a mission log debating whether AI will replace human teachers in the next decade.' },
  { type: 'roleplay', prompt: 'Narrate a mission log persuading the crew to change course and investigate a mysterious signal.' },

  // --- True/False C1 ---
  { type: 'truefalse', prompt: '"Whom" is used as a subject pronoun in formal English.', answer: false },
  { type: 'truefalse', prompt: 'A dangling modifier is a grammatical error where the modifier doesn\'t clearly refer to the intended word.', answer: true }
];

const PAWN_CHOICES = ['🐉', '🚀', '🤖', '🦊', '⚡', '🦉', '🦁', '🐬'];
const DEFAULT_NAMES = ['Dragons', 'Rockets', 'Androids', 'Foxes', 'Bolts', 'Owls', 'Lions', 'Dolphins'];

export default function SetupScreen({ onStartGame, playSound }) {
  const [teamCount, setTeamCount] = useState(3);
  const [boardLength, setBoardLength] = useState(22);
  const [cefr, setCefr] = useState('B1');
  const [topic, setTopic] = useState('General Classroom Vocabulary & Idioms');
  const [customNames, setCustomNames] = useState(['Dragons', 'Rockets', 'Androids', 'Foxes', 'Bolts', 'Owls', 'Lions', 'Dolphins']);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleNameChange = (index, value) => {
    const next = [...customNames];
    next[index] = value;
    setCustomNames(next);
  };

  const handleStart = (useAi = false) => {
    if (playSound) playSound('correct');

    const teams = Array.from({ length: teamCount }, (_, i) => ({
      id: `team-${i + 1}`,
      name: customNames[i] && customNames[i].trim() ? customNames[i].trim() : `${DEFAULT_NAMES[i % DEFAULT_NAMES.length]}`,
      pawn: PAWN_CHOICES[i % PAWN_CHOICES.length],
      position: 0,
      trophies: 1,
      items: []
    }));

    if (!useAi) {
      onStartGame({ teams, boardLength, deck: DEFAULT_DECK });
      return;
    }

    setIsGenerating(true);
    fetch('/api/generate-lingoparty', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-api-key': localStorage.getItem('berkai_gemini_api_key') || '',
        'x-teacher-name': localStorage.getItem('berkai_teacher_name') || ''
      },
      body: JSON.stringify({ theme: topic, cefr, count: 30 })
    })
      .then(res => res.json())
      .then(data => {
        setIsGenerating(false);
        const generatedDeck = data?.success && data?.cards?.length > 0 ? data.cards : DEFAULT_DECK;
        onStartGame({ teams, boardLength, deck: generatedDeck });
      })
      .catch(err => {
        setIsGenerating(false);
        console.error('AI Generation fallback:', err);
        onStartGame({ teams, boardLength, deck: DEFAULT_DECK });
      });
  };

  return (
    <div className={styles.setupContainer}>
      <div className={`glass-card ${styles.setupCard}`}>
        <div className={styles.header}>
          <h1>🚀 Mission Briefing & Crew Setup</h1>
          <p>Name your student teams, select board length, and configure AI challenge parameters!</p>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Number of Crews</label>
            <select
              className={styles.selectField}
              value={teamCount}
              onChange={e => setTeamCount(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Crew' : 'Crews'}</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Flight Path Length</label>
            <select
              className={styles.selectField}
              value={boardLength}
              onChange={e => setBoardLength(Number(e.target.value))}
            >
              <option value={16}>16 Planets (Quick ~15 min)</option>
              <option value={24}>24 Planets (Standard ~25 min)</option>
              <option value={32}>32 Planets (Galactic Odyssey ~35 min)</option>
              <option value={40}>40 Planets (Deep Space Epic ~50 min)</option>
            </select>
          </div>

          {/* Custom Crew Naming Section */}
          <div className={`${styles.formGroup} ${styles.fullSpan}`}>
            <label style={{ fontSize: '1.05rem', fontWeight: 800, color: '#c4b5fd', marginBottom: '0.6rem', display: 'block' }}>
              👥 Custom Crew Names
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem' }}>
              {Array.from({ length: teamCount }).map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.6rem' }}>{PAWN_CHOICES[i % PAWN_CHOICES.length]}</span>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={customNames[i] || ''}
                    onChange={e => handleNameChange(i, e.target.value)}
                    placeholder={`Crew ${i + 1} Name`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* AI Generation Parameters */}
          <div className={`${styles.formGroup} ${styles.fullSpan}`}>
            <div className={styles.aiSection}>
              <div className={styles.aiTitle}>🤖 AI Challenge Deck Generator (Gemini 2.5 Flash)</div>

              <div className={styles.formGrid} style={{ gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label>CEFR Difficulty Level</label>
                  <select
                    className={styles.selectField}
                    value={cefr}
                    onChange={e => setCefr(e.target.value)}
                  >
                    <option value="A1">A1 — Beginner</option>
                    <option value="A2">A2 — Elementary</option>
                    <option value="B1">B1 — Intermediate</option>
                    <option value="B2">B2 — Upper Intermediate</option>
                    <option value="C1">C1 — Advanced</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Mission Topic / Vocabulary Focus</label>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="e.g. Space Exploration, Environmental Issues, Travel & Airport"
                  />
                </div>
              </div>

              <button
                className={`btn-accent ${styles.btnStart}`}
                onClick={() => handleStart(true)}
                disabled={isGenerating}
              >
                {isGenerating ? '⚡ Generating AI Challenge Deck & Charting Course...' : '✨ Generate AI Challenge Deck & Launch!'}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.btnRow}>
          <button
            className={`btn-primary ${styles.btnStart}`}
            onClick={() => handleStart(false)}
            disabled={isGenerating}
          >
            🚀 Launch with Default Deck!
          </button>
        </div>
      </div>
    </div>
  );
}
