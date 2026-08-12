// Web Audio API Synthesizer Fallback
let audioCtx = null;

function getAudioCtx() {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
            audioCtx = new AudioCtxClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

const STORAGE_KEY = 'openclasstools_audio_pack';
const CUSTOM_PACKS_KEY = 'openclasstools_custom_packs';
const audioCache = new Map();

export const DEFAULT_PACKS = [
    { id: 'default', name: 'Default WAV Pack', type: 'folder', path: '/audio_packs/default' },
    { id: 'synth', name: 'Web Audio Synthesizer (Built-in)', type: 'synth' }
];

export function playSynthesizedSound(type = 'roll') {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'roll') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'step') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(520, now);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
            osc.start(now);
            osc.stop(now + 0.06);
        } else if (type === 'correct') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(659.25, now + 0.1);
            osc.frequency.setValueAtTime(880, now + 0.25);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'wrong') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'trophy') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(587.33, now);
            osc.frequency.setValueAtTime(880.00, now + 0.15);
            osc.frequency.setValueAtTime(1174.66, now + 0.3);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
            osc.start(now);
            osc.stop(now + 0.7);
        } else if (type === 'damage') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.45);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
            osc.start(now);
            osc.stop(now + 0.45);
        } else if (type === 'start') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(392, now);
            osc.frequency.setValueAtTime(523.25, now + 0.08);
            osc.frequency.setValueAtTime(659.25, now + 0.16);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
            osc.start(now);
            osc.stop(now + 0.32);
        } else if (type === 'question') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(392, now);
            osc.frequency.setValueAtTime(587.33, now + 0.12);
            osc.frequency.setValueAtTime(783.99, now + 0.24);
            gain.gain.setValueAtTime(0.16, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'select') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(360, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
            osc.start(now);
            osc.stop(now + 0.06);
        } else if (type === 'lifeline') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(700, now);
            osc.frequency.setValueAtTime(980, now + 0.08);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'walkAway') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(493.88, now);
            osc.frequency.setValueAtTime(392, now + 0.1);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
            osc.start(now);
            osc.stop(now + 0.28);
        } else if (type === 'win') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.1);
            osc.frequency.setValueAtTime(783.99, now + 0.2);
            osc.frequency.setValueAtTime(1046.5, now + 0.32);
            gain.gain.setValueAtTime(0.17, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.58);
            osc.start(now);
            osc.stop(now + 0.58);
        } else if (type === 'loss') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.14);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.36);
            osc.start(now);
            osc.stop(now + 0.36);
        } else if (type === 'timeout') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.14);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
            osc.start(now);
            osc.stop(now + 0.38);
        } else if (type === 'tick') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(1046.5, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
            osc.start(now);
            osc.stop(now + 0.04);
        } else if (type === 'flip') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(480, now);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.10);
            osc.start(now);
            osc.stop(now + 0.10);
        } else if (type === 'mastered') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now);
            osc.frequency.setValueAtTime(880.00, now + 0.10);
            gain.gain.setValueAtTime(0.16, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
            osc.start(now);
            osc.stop(now + 0.28);
        } else if (type === 'review') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(330, now);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'nav') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'sync') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.08);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.23);
            osc.start(now);
            osc.stop(now + 0.23);
        } else if (type === 'reveal') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(740.00, now);
            osc.frequency.setValueAtTime(988.00, now + 0.07);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.17);
            osc.start(now);
            osc.stop(now + 0.17);
        } else if (type === 'pass') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(440.00, now);
            osc.frequency.setValueAtTime(329.63, now + 0.08);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.26);
            osc.start(now);
            osc.stop(now + 0.26);
        } else if (type === 'pause') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(560.00, now);
            osc.frequency.setValueAtTime(420.00, now + 0.08);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.20);
            osc.start(now);
            osc.stop(now + 0.20);
        } else if (type === 'resume') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(660.00, now);
            osc.frequency.setValueAtTime(880.00, now + 0.08);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.20);
            osc.start(now);
            osc.stop(now + 0.20);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        }
    } catch (err) {
        console.warn('[soundManager] Audio play error:', err);
    }
}

class SoundManager {
    constructor() {
        this.activePackId = typeof window !== 'undefined'
            ? (localStorage.getItem(STORAGE_KEY) || 'default')
            : 'default';
        this.customPacks = [];
        this.loadCustomPacks();
    }

    loadCustomPacks() {
        if (typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem(CUSTOM_PACKS_KEY);
            if (stored) {
                this.customPacks = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[soundManager] Failed to load custom packs:', e);
        }
    }

    getAudioPack() {
        return this.activePackId;
    }

    setAudioPack(packId) {
        this.activePackId = packId;
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, packId);
        }
    }

    getAvailablePacks() {
        return [...DEFAULT_PACKS, ...this.customPacks];
    }

    addCustomPack(pack) {
        this.customPacks = this.customPacks.filter(p => p.id !== pack.id);
        this.customPacks.push(pack);
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(CUSTOM_PACKS_KEY, JSON.stringify(this.customPacks));
            } catch (e) {
                console.warn('[soundManager] Custom pack save error:', e);
            }
        }
        this.setAudioPack(pack.id);
    }

    playSound(name = 'roll') {
        const packId = this.getAudioPack();

        if (packId === 'synth') {
            playSynthesizedSound(name);
            return;
        }

        // Check custom user packs
        const customPack = this.customPacks.find(p => p.id === packId);
        if (customPack && customPack.sounds && customPack.sounds[name]) {
            try {
                const audio = new Audio(customPack.sounds[name]);
                audio.play().catch(err => {
                    console.warn('[soundManager] Custom sound play failed, falling back to synth:', err);
                    playSynthesizedSound(name);
                });
            } catch (e) {
                playSynthesizedSound(name);
            }
            return;
        }

        // Folder pack (default or custom static folder)
        if (typeof window === 'undefined') {
            return;
        }

        const audioUrl = `/audio_packs/${packId}/${name}.wav`;
        let audio = audioCache.get(audioUrl);
        if (!audio) {
            audio = new Audio(audioUrl);
            audioCache.set(audioUrl, audio);
        } else {
            audio.currentTime = 0;
        }

        audio.play().catch(() => {
            playSynthesizedSound(name);
        });
    }
}

export const soundManager = new SoundManager();
export const playSound = (name) => soundManager.playSound(name);
