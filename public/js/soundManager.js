(function(window) {
    var STORAGE_KEY = 'openclasstools_audio_pack';
    var CUSTOM_PACKS_KEY = 'openclasstools_custom_packs';
    var audioCache = {};
    var audioCtx = null;

    function getAudioCtx() {
        if (!audioCtx) {
            var AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            if (AudioCtxClass) {
                audioCtx = new AudioCtxClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(function() {});
        }
        return audioCtx;
    }

    var DEFAULT_PACKS = [
        { id: 'default', name: 'Default WAV Pack', type: 'folder', path: '/audio_packs/default' },
        { id: 'synth', name: 'Web Audio Synthesizer (Built-in)', type: 'synth' }
    ];

    function playSynthesizedSound(type) {
        type = type || 'roll';
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
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
            } else {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            }
        } catch (e) {
            console.warn('[soundManager] Synth play error:', e);
        }
    }

    function SoundManager() {
        this.activePackId = localStorage.getItem(STORAGE_KEY) || 'default';
        this.customPacks = [];
        this.loadCustomPacks();
    }

    SoundManager.prototype.loadCustomPacks = function() {
        try {
            var stored = localStorage.getItem(CUSTOM_PACKS_KEY);
            if (stored) this.customPacks = JSON.parse(stored);
        } catch (e) {}
    };

    SoundManager.prototype.getAudioPack = function() {
        return this.activePackId;
    };

    SoundManager.prototype.setAudioPack = function(packId) {
        this.activePackId = packId;
        localStorage.setItem(STORAGE_KEY, packId);
    };

    SoundManager.prototype.getAvailablePacks = function() {
        return DEFAULT_PACKS.concat(this.customPacks);
    };

    SoundManager.prototype.playSound = function(name) {
        name = name || 'roll';
        var packId = this.getAudioPack();

        if (packId === 'synth') {
            playSynthesizedSound(name);
            return;
        }

        var customPack = null;
        for (var i = 0; i < this.customPacks.length; i++) {
            if (this.customPacks[i].id === packId) {
                customPack = this.customPacks[i];
                break;
            }
        }

        if (customPack && customPack.sounds && customPack.sounds[name]) {
            try {
                var audio = new Audio(customPack.sounds[name]);
                audio.play().catch(function() {
                    playSynthesizedSound(name);
                });
            } catch (e) {
                playSynthesizedSound(name);
            }
            return;
        }

        var url = '/audio_packs/' + packId + '/' + name + '.wav';
        var cachedAudio = audioCache[url];
        if (!cachedAudio) {
            cachedAudio = new Audio(url);
            audioCache[url] = cachedAudio;
        } else {
            cachedAudio.currentTime = 0;
        }

        cachedAudio.play().catch(function() {
            playSynthesizedSound(name);
        });
    };

    window.soundManager = new SoundManager();
    window.playSound = function(name) {
        window.soundManager.playSound(name);
    };
})(typeof window !== 'undefined' ? window : this);
