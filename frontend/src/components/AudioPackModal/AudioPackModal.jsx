import React, { useState } from 'react';
import { soundManager } from '../../services/soundManager';
import './AudioPackModal.css';

const ALL_SOUNDS = [
  { id: 'roll', label: 'Roll Dice / Turn', category: 'Action', icon: '🎲' },
  { id: 'step', label: 'Board Step', category: 'Action', icon: '👣' },
  { id: 'correct', label: 'Correct Answer', category: 'Feedback', icon: '✅' },
  { id: 'wrong', label: 'Wrong Answer', category: 'Feedback', icon: '❌' },
  { id: 'trophy', label: 'Trophy / Reward', category: 'Reward', icon: '🏆' },
  { id: 'damage', label: 'Damage / Penalty', category: 'Feedback', icon: '💥' },
  { id: 'start', label: 'Game Start', category: 'System', icon: '🚀' },
  { id: 'question', label: 'New Question', category: 'Action', icon: '❓' },
  { id: 'select', label: 'Tile Select', category: 'Action', icon: '🎯' },
  { id: 'lifeline', label: 'Lifeline / Help', category: 'Reward', icon: '💡' },
  { id: 'walkAway', label: 'Walk Away', category: 'System', icon: '🚪' },
  { id: 'win', label: 'Grand Victory', category: 'Reward', icon: '🎉' },
  { id: 'loss', label: 'Game Over', category: 'Feedback', icon: '💔' },
  { id: 'timeout', label: 'Time Expired', category: 'System', icon: '⏰' },
  { id: 'tick', label: 'Timer Tick', category: 'System', icon: '⏱️' },
  { id: 'flip', label: 'Card Flip', category: 'Action', icon: '🃏' },
  { id: 'mastered', label: 'Mastered Card', category: 'Reward', icon: '⭐' },
  { id: 'review', label: 'Review Item', category: 'Action', icon: '🔁' },
  { id: 'nav', label: 'Menu Nav', category: 'System', icon: '🧭' },
  { id: 'sync', label: 'Data Sync', category: 'System', icon: '🔄' },
  { id: 'reveal', label: 'Answer Reveal', category: 'Action', icon: '✨' },
  { id: 'pass', label: 'Pass Turn', category: 'Action', icon: '⏭️' },
  { id: 'pause', label: 'Pause Game', category: 'System', icon: '⏸️' },
  { id: 'resume', label: 'Resume Game', category: 'System', icon: '▶️' }
];

export default function AudioPackModal({ isOpen, onClose }) {
  const [activePack, setActivePack] = useState(soundManager.getAudioPack());
  const [playingId, setPlayingId] = useState(null);
  const [customPackName, setCustomPackName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState({});

  if (!isOpen) return null;

  const availablePacks = soundManager.getAvailablePacks();

  const handlePackChange = (packId) => {
    soundManager.setAudioPack(packId);
    setActivePack(packId);
  };

  const handlePlayPreview = (soundId) => {
    setPlayingId(soundId);
    soundManager.playSound(soundId);
    setTimeout(() => {
      setPlayingId(null);
    }, 600);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newSoundMap = { ...uploadedFiles };
    files.forEach(file => {
      const nameWithoutExt = file.name.split('.')[0].toLowerCase();
      const matchedSound = ALL_SOUNDS.find(s => s.id.toLowerCase() === nameWithoutExt);
      if (matchedSound) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          newSoundMap[matchedSound.id] = evt.target.result;
          setUploadedFiles({ ...newSoundMap });
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleSaveCustomPack = () => {
    if (!customPackName.trim() || Object.keys(uploadedFiles).length === 0) return;
    const packId = `custom_${Date.now()}`;
    const newPack = {
      id: packId,
      name: customPackName.trim(),
      type: 'custom',
      sounds: uploadedFiles
    };
    soundManager.addCustomPack(newPack);
    setActivePack(packId);
    setCustomPackName('');
    setUploadedFiles({});
  };

  return (
    <div className="audio-pack-overlay" onClick={onClose}>
      <div className="audio-pack-modal" onClick={e => e.stopPropagation()}>
        <div className="audio-pack-header">
          <div className="header-title">
            <span className="header-icon">🔊</span>
            <div>
              <h2>Audio Packs & Soundboard</h2>
              <p>Customize game sound effects or preview exported WAV/MP3 sound packs</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Audio Pack Selection Bar */}
        <div className="pack-selection-section">
          <h3>Active Sound Pack</h3>
          <div className="pack-options-grid">
            {availablePacks.map(pack => (
              <button
                key={pack.id}
                className={`pack-card ${activePack === pack.id ? 'active' : ''}`}
                onClick={() => handlePackChange(pack.id)}
              >
                <div className="pack-card-header">
                  <span className="pack-radio">{activePack === pack.id ? '🔘' : '⚪'}</span>
                  <span className="pack-name">{pack.name}</span>
                </div>
                <span className="pack-type-tag">
                  {pack.type === 'synth' ? '🎹 Oscillator Synth' : pack.type === 'custom' ? '📁 Custom Upload' : '🔊 WAV Audio Files'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Soundboard Preview */}
        <div className="soundboard-section">
          <div className="soundboard-header">
            <h3>Interactive Soundboard Preview (24 Effects)</h3>
            <span className="soundboard-hint">Click any tile to test current pack audio</span>
          </div>

          <div className="soundboard-grid">
            {ALL_SOUNDS.map(sound => (
              <div
                key={sound.id}
                className={`sound-tile ${playingId === sound.id ? 'playing' : ''}`}
                onClick={() => handlePlayPreview(sound.id)}
              >
                <span className="sound-icon">{sound.icon}</span>
                <div className="sound-info">
                  <span className="sound-name">{sound.id}</span>
                  <span className="sound-label">{sound.label}</span>
                </div>
                <span className="play-indicator">{playingId === sound.id ? '🔊' : '▶'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Audio Pack Uploader */}
        <div className="custom-pack-section">
          <h3>Create Custom Sound Pack</h3>
          <p className="custom-desc">Upload WAV or MP3 files matching sound names (e.g. <code>correct.wav</code>, <code>wrong.mp3</code>)</p>
          
          <div className="upload-controls">
            <input
              type="text"
              placeholder="Sound Pack Name (e.g. Retro 8-Bit)"
              value={customPackName}
              onChange={e => setCustomPackName(e.target.value)}
              className="pack-name-input"
            />
            <label className="upload-file-btn">
              📁 Choose Audio Files
              <input type="file" multiple accept=".wav,.mp3,.ogg" onChange={handleFileUpload} />
            </label>
          </div>

          {Object.keys(uploadedFiles).length > 0 && (
            <div className="upload-summary">
              <span>Mapped {Object.keys(uploadedFiles).length} sound(s): {Object.keys(uploadedFiles).join(', ')}</span>
              <button className="save-pack-btn" onClick={handleSaveCustomPack}>
                💾 Save Custom Pack
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
