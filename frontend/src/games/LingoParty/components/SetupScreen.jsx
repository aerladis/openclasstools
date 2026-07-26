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

const EMOJI_PALETTE = ['🐉', '🚀', '🤖', '🦊', '⚡', '🦉', '🦁', '🐬', '👽', '🛸', '⭐', '🪐', '👾', '👑', '🔥', '💎', '🦄', '🐅', '🦅', '🦈'];
const DEFAULT_NAMES = ['Crew A', 'Crew B', 'Crew C', 'Crew D', 'Crew E', 'Crew F', 'Crew G', 'Crew H'];
const TEAM_COLORS = ['#a855f7', '#06b6d4', '#f43f5e', '#eab308', '#10b981', '#ec4899', '#6366f1', '#f97316'];
const GAME_MODES = [
  { id: 'solo', label: 'Solo', desc: '1 student per pawn' },
  { id: 'duo', label: 'Duo', desc: '2 students per pawn' },
  { id: 'crew', label: 'Crew', desc: '3+ students per pawn' }
];

export default function SetupScreen({ onStartGame, playSound }) {
  const [mode, setMode] = useState('crew');
  const [teamCount, setTeamCount] = useState(3);
  const [boardLength, setBoardLength] = useState(30);
  const [cefr, setCefr] = useState('B1');
  const [topic, setTopic] = useState('General Classroom Vocabulary & Idioms');
  const [baseColor, setBaseColor] = useState('#64748b');
  const [customNames, setCustomNames] = useState(['Crew A', 'Crew B', 'Crew C', 'Crew D', 'Crew E', 'Crew F', 'Crew G', 'Crew H']);
  const [customPawns, setCustomPawns] = useState(['🐉', '🚀', '🤖', '🦊', '⚡', '🦉', '🦁', '🐬']);
  const [customColors, setCustomColors] = useState(TEAM_COLORS);
  const [teacherName, setTeacherName] = useState(() => localStorage.getItem('berkai_teacher_name') || '');
  const [deckTitle, setDeckTitle] = useState('');
  const [aiView, setAiView] = useState('generate'); // 'generate' | 'saved'
  const [savedDecks, setSavedDecks] = useState([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, { time, msg, type }]);
  };

  const handleNameChange = (index, value) => {
    const next = [...customNames];
    next[index] = value;
    setCustomNames(next);
  };

  const handlePawnCycle = (index) => {
    const nextPawns = [...customPawns];
    const currentPawn = nextPawns[index] || EMOJI_PALETTE[index % EMOJI_PALETTE.length];
    const currentIdx = EMOJI_PALETTE.indexOf(currentPawn);
    nextPawns[index] = EMOJI_PALETTE[(currentIdx + 1) % EMOJI_PALETTE.length];
    setCustomPawns(nextPawns);
    if (playSound) playSound('roll');
  };

  const handleColorChange = (index, value) => {
    const next = [...customColors];
    next[index] = value;
    setCustomColors(next);
  };

  const buildTeams = () => Array.from({ length: teamCount }, (_, i) => ({
    id: `team-${i + 1}`,
    name: customNames[i] && customNames[i].trim() ? customNames[i].trim() : `${DEFAULT_NAMES[i % DEFAULT_NAMES.length]}`,
    pawn: customPawns[i] || EMOJI_PALETTE[i % EMOJI_PALETTE.length],
    color: customColors[i] || TEAM_COLORS[i % TEAM_COLORS.length],
    position: 0,
    trophies: 1,
    items: []
  }));

  const loadSavedDecks = async () => {
    setIsLoadingDecks(true);
    try {
      const res = await fetch('/api/lingoparty-decks');
      const data = await res.json();
      if (data.success && Array.isArray(data.decks)) {
        setSavedDecks(data.decks);
      }
    } catch (err) {
      addLog(`❌ Failed to load saved decks: ${err.message}`, 'error');
    } finally {
      setIsLoadingDecks(false);
    }
  };

  const handleTeacherNameChange = (value) => {
    setTeacherName(value);
    localStorage.setItem('berkai_teacher_name', value.trim() || 'Anonymous Teacher');
  };

  const launchSavedDeck = (deck) => {
    if (!deck || !Array.isArray(deck.cards) || deck.cards.length === 0) return;
    const deckMode = ['solo', 'duo', 'crew'].includes(deck.mode) ? deck.mode : 'crew';
    setMode(deckMode);
    if (playSound) playSound('correct');
    onStartGame({ teams: buildTeams(), boardLength, baseColor, deck: deck.cards, mode: deckMode });
  };

  const handleStart = async (useAi = false) => {
    const teams = buildTeams();

    if (!useAi) {
      if (playSound) playSound('correct');
      onStartGame({ teams, boardLength, baseColor, deck: DEFAULT_DECK, mode });
      return;
    }

    setIsGenerating(true);
    setDebugLogs([]);
    addLog('🚀 Initializing Gemini AI Challenge Generation...', 'info');
    addLog(`📌 Topic: "${topic}" | CEFR: ${cefr} | Mode: ${mode.toUpperCase()} | Target: 30 Challenges`, 'info');

    const startTime = Date.now();

    try {
      addLog('📡 Sending POST request to /api/generate-lingoparty...', 'info');
      const res = await fetch('/api/generate-lingoparty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': localStorage.getItem('berkai_gemini_api_key') || '',
          'x-teacher-name': teacherName.trim() || 'Anonymous Teacher'
        },
        body: JSON.stringify({ theme: topic, cefr, count: 30, mode, deckTitle: deckTitle.trim() })
      });

      addLog(`📥 HTTP Status: ${res.status} ${res.statusText}`, res.ok ? 'success' : 'warn');
      const data = await res.json();

      if (data.success && !data.isFallback && data.cards && data.cards.length > 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        addLog(`✅ AI Success! ${data.cards.length} cards generated in ${elapsed}s`, 'success');

        const counts = {};
        data.cards.forEach(c => { counts[c.type] = (counts[c.type] || 0) + 1; });
        addLog(`📊 Category Breakdown: ${Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(', ')}`, 'info');

        if (data.savedDeck) {
          addLog(`📚 Deck saved to shared library: "${data.savedDeck.title}" by ${data.savedDeck.teacherName}`, 'success');
        }

        if (playSound) playSound('correct');
        setTimeout(() => {
          setIsGenerating(false);
          onStartGame({ teams, boardLength, baseColor, deck: data.cards, mode });
        }, 1200);
      } else {
        addLog(`⚠️ AI Error / Fallback: ${data.error || 'Gemini API key in .env is invalid or missing'}`, 'error');
        addLog('💡 Click "🔑 Teacher Settings" in header to input a valid Gemini API Key!', 'warn');
        addLog('🔄 Launching with Standard Offline Challenge Deck...', 'warn');
        if (playSound) playSound('wrong');
        setTimeout(() => {
          setIsGenerating(false);
          onStartGame({ teams, boardLength, baseColor, deck: DEFAULT_DECK, mode });
        }, 2200);
      }
    } catch (err) {
      addLog(`❌ AI Generation Error: ${err.message}`, 'error');
      addLog('🔄 Falling back to standard challenge deck', 'warn');
      if (playSound) playSound('wrong');
      setTimeout(() => {
        setIsGenerating(false);
        onStartGame({ teams, boardLength, baseColor, deck: DEFAULT_DECK, mode });
      }, 1800);
    }
  };

  return (
    <div className={styles.setupContainer}>
      <div className={`glass-card ${styles.setupCard}`}>
        <div className={styles.header}>
          <h1>🚀 Mission Briefing & Crew Setup</h1>
          <p>Name your student teams, select board length, and configure AI challenge parameters!</p>
        </div>

        <div className={styles.formGrid}>
          <div className={`${styles.formGroup} ${styles.fullSpan}`}>
            <label>Game Mode</label>
            <div className={styles.modeSegmented}>
              {GAME_MODES.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`${styles.modeOption} ${mode === m.id ? styles.modeOptionActive : ''}`}
                  onClick={() => { setMode(m.id); if (playSound) playSound('roll'); }}
                >
                  <span className={styles.modeOptionLabel}>{m.label}</span>
                  <span className={styles.modeOptionDesc}>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Number of Teams</label>
            <div className={styles.stepper}>
              <button
                type="button"
                className={styles.stepperBtn}
                onClick={() => setTeamCount(c => Math.max(1, c - 1))}
                disabled={teamCount <= 1}
              >
                −
              </button>
              <span className={styles.stepperValue}>{teamCount} {teamCount === 1 ? 'Team' : 'Teams'}</span>
              <button
                type="button"
                className={styles.stepperBtn}
                onClick={() => setTeamCount(c => Math.min(6, c + 1))}
                disabled={teamCount >= 6}
              >
                +
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Flight Path Length</label>
            <select
              className={styles.selectField}
              value={boardLength}
              onChange={e => setBoardLength(Number(e.target.value))}
            >
              <option value={30}>30 Planets (Five-Row Voyage — Default)</option>
              <option value={24}>24 Planets (Quick Sprint ~20 min)</option>
              <option value={32}>32 Planets (Standard Voyage ~30 min)</option>
              <option value={54}>54 Planets (Deep Space Epic ~50 min)</option>
            </select>
          </div>

          <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
            <label>Standard Planet Color</label>
            <input
              type="color"
              className={styles.inputField}
              style={{ width: '100%', height: '50px', padding: '5px', cursor: 'pointer' }}
              value={baseColor}
              onChange={e => setBaseColor(e.target.value)}
            />
          </div>

          {/* Compact Team Rows */}
          <div className={`${styles.formGroup} ${styles.fullSpan}`}>
            <label style={{ fontSize: '1.05rem', fontWeight: 800, color: '#c4b5fd', marginBottom: '0.6rem', display: 'block' }}>
              👥 Teams ({mode === 'solo' ? '1 student' : mode === 'duo' ? '2 students' : '3+ students'} per pawn)
            </label>
            <div className={styles.teamRows}>
              {Array.from({ length: teamCount }).map((_, i) => (
                <div key={i} className={styles.teamRow}>
                  <button
                    type="button"
                    onClick={() => handlePawnCycle(i)}
                    title="Click to change team emoji"
                    className={styles.teamEmojiBtn}
                  >
                    {customPawns[i] || EMOJI_PALETTE[i % EMOJI_PALETTE.length]}
                  </button>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={customNames[i] || ''}
                    onChange={e => handleNameChange(i, e.target.value)}
                    placeholder={`Team ${String.fromCharCode(65 + i)} Name`}
                  />
                  <input
                    type="color"
                    className={styles.teamColorInput}
                    title="Team color"
                    value={customColors[i] || TEAM_COLORS[i % TEAM_COLORS.length]}
                    onChange={e => handleColorChange(i, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* AI Mission Center */}
          <div className={`${styles.formGroup} ${styles.fullSpan}`}>
            <div className={styles.aiSection}>
              <div className={styles.aiTitle}>🤖 AI Mission Center (Gemini 2.5 Flash)</div>

              <div className={styles.aiTabs}>
                <button
                  type="button"
                  className={`${styles.aiTab} ${aiView === 'generate' ? styles.aiTabActive : ''}`}
                  onClick={() => setAiView('generate')}
                >
                  ✨ Generate New Deck
                </button>
                <button
                  type="button"
                  className={`${styles.aiTab} ${aiView === 'saved' ? styles.aiTabActive : ''}`}
                  onClick={() => { setAiView('saved'); loadSavedDecks(); }}
                >
                  📚 Saved Decks
                </button>
              </div>

              {aiView === 'generate' ? (
                <>
                  <div className={styles.formGrid} style={{ gap: '1rem' }}>
                    <div className={styles.formGroup}>
                      <label>Teacher Name</label>
                      <input
                        type="text"
                        className={styles.inputField}
                        value={teacherName}
                        onChange={e => handleTeacherNameChange(e.target.value)}
                        placeholder="e.g. Ms. Yılmaz"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Deck Title</label>
                      <input
                        type="text"
                        className={styles.inputField}
                        value={deckTitle}
                        onChange={e => setDeckTitle(e.target.value)}
                        placeholder={`e.g. ${topic} — ${mode.toUpperCase()} Mission`}
                      />
                    </div>

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
                        <option value="B1+">B1+ — Strong Intermediate</option>
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
                    {isGenerating ? '⚡ Generating AI Challenge Deck & Charting Course...' : `✨ Generate ${mode.toUpperCase()} Deck & Launch!`}
                  </button>
                </>
              ) : (
                <div className={styles.savedDecksPanel}>
                  <div className={styles.savedDecksHeader}>
                    <span>📚 Shared Deck Library ({savedDecks.length})</span>
                    <button type="button" className={styles.debugClearBtn} onClick={loadSavedDecks} disabled={isLoadingDecks}>
                      {isLoadingDecks ? 'Loading...' : '🔄 Refresh'}
                    </button>
                  </div>
                  {savedDecks.length === 0 && !isLoadingDecks && (
                    <div className={styles.savedDecksEmpty}>
                      No saved decks yet — generate a deck and it will appear here for everyone.
                    </div>
                  )}
                  <div className={styles.savedDecksList}>
                    {savedDecks.map(deck => (
                      <div key={deck.id} className={styles.savedDeckItem}>
                        <div className={styles.savedDeckMeta}>
                          <div className={styles.savedDeckTitle}>{deck.title}</div>
                          <div className={styles.savedDeckSub}>
                            👩‍🏫 {deck.teacherName} · 🎯 {deck.theme} · {deck.cefr} · {(deck.mode || 'crew').toUpperCase()} · 🃏 {deck.cards?.length || 0} cards
                            {deck.createdAt && ` · ${new Date(deck.createdAt).toLocaleDateString()}`}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`btn-primary ${styles.savedDeckLaunchBtn}`}
                          onClick={() => launchSavedDeck(deck)}
                        >
                          🚀 Launch
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {debugLogs.length > 0 && (
                <div className={styles.debugBox}>
                  <div className={styles.debugHeader}>
                    <span>🛠️ AI Generation Live Debug Log</span>
                    <button type="button" className={styles.debugClearBtn} onClick={() => setDebugLogs([])}>Clear</button>
                  </div>
                  <div className={styles.debugLogList}>
                    {debugLogs.map((log, idx) => (
                      <div key={idx} className={`${styles.debugLine} ${styles[log.type] || ''}`}>
                        <span className={styles.debugTime}>[{log.time}]</span> {log.msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
