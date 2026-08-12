import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SAMPLE_RATE = 44100;

function createWavHeader(numSamples) {
    const buffer = Buffer.alloc(44);
    const subchunk2Size = numSamples * 2;
    const chunkSize = 36 + subchunk2Size;

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(chunkSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);          // Subchunk1Size (16 for PCM)
    buffer.writeUInt16LE(1, 20);           // AudioFormat (1 for PCM)
    buffer.writeUInt16LE(1, 22);           // NumChannels (1 for MONO)
    buffer.writeUInt32LE(SAMPLE_RATE, 24); // SampleRate
    buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // ByteRate
    buffer.writeUInt16LE(2, 32);           // BlockAlign
    buffer.writeUInt16LE(16, 34);          // BitsPerSample
    buffer.write('data', 36);
    buffer.writeUInt32LE(subchunk2Size, 40);

    return buffer;
}

function oscSample(type, freq, t) {
    const phase = (freq * t) % 1;
    switch (type) {
        case 'sine':
            return Math.sin(2 * Math.PI * freq * t);
        case 'square':
            return Math.sin(2 * Math.PI * freq * t) >= 0 ? 1 : -1;
        case 'triangle':
            return 2 * Math.abs(2 * phase - 1) - 1;
        case 'sawtooth':
            return 2 * phase - 1;
        default:
            return Math.sin(2 * Math.PI * freq * t);
    }
}

function renderSoundToWav(generator) {
    const { duration, samples } = generator();
    const header = createWavHeader(samples.length);
    const pcmData = Buffer.alloc(samples.length * 2);

    for (let i = 0; i < samples.length; i++) {
        const val = Math.max(-1, Math.min(1, samples[i]));
        const intVal = val < 0 ? val * 0x8000 : val * 0x7FFF;
        pcmData.writeInt16LE(Math.round(intVal), i * 2);
    }

    return Buffer.concat([header, pcmData]);
}

// Sound Generators
const generators = {
    roll: () => {
        const duration = 0.15;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        let phase = 0;
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const progress = t / duration;
            const freq = 300 * Math.pow(150 / 300, progress);
            const gain = 0.2 * Math.pow(0.01 / 0.2, progress);
            phase += freq / SAMPLE_RATE;
            samples[i] = Math.sin(2 * Math.PI * phase) * gain;
        }
        return { duration, samples };
    },
    step: () => {
        const duration = 0.06;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const progress = t / duration;
            const gain = 0.12 * Math.pow(0.01 / 0.12, progress);
            samples[i] = oscSample('square', 520, t) * gain;
        }
        return { duration, samples };
    },
    correct: () => {
        const duration = 0.5;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            let freq = 440;
            if (t >= 0.25) freq = 880;
            else if (t >= 0.1) freq = 659.25;
            const gain = 0.35 * Math.pow(0.01 / 0.35, t / duration);
            samples[i] = oscSample('triangle', freq, t) * gain;
        }
        return { duration, samples };
    },
    wrong: () => {
        const duration = 0.3;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        let phase = 0;
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const progress = t / duration;
            const freq = 180 * Math.pow(110 / 180, progress);
            const gain = 0.3 * Math.pow(0.01 / 0.3, progress);
            phase += freq / SAMPLE_RATE;
            samples[i] = (2 * (phase % 1) - 1) * gain;
        }
        return { duration, samples };
    },
    trophy: () => {
        const duration = 0.7;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            let freq = 587.33;
            if (t >= 0.3) freq = 1174.66;
            else if (t >= 0.15) freq = 880.00;
            const gain = 0.4 * Math.pow(0.01 / 0.4, t / duration);
            samples[i] = oscSample('triangle', freq, t) * gain;
        }
        return { duration, samples };
    },
    damage: () => {
        const duration = 0.45;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        let phase = 0;
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const progress = t / duration;
            const freq = 220 * Math.pow(45 / 220, progress);
            const gain = 0.4 * Math.pow(0.01 / 0.4, progress);
            phase += freq / SAMPLE_RATE;
            samples[i] = (2 * (phase % 1) - 1) * gain;
        }
        return { duration, samples };
    },
    start: () => {
        const duration = 0.32;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            let freq = 392;
            if (t >= 0.16) freq = 659.25;
            else if (t >= 0.08) freq = 523.25;
            const gain = 0.18 * Math.pow(0.01 / 0.18, t / duration);
            samples[i] = oscSample('triangle', freq, t) * gain;
        }
        return { duration, samples };
    },
    question: () => {
        const duration = 0.4;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            let freq = 392;
            if (t >= 0.24) freq = 783.99;
            else if (t >= 0.12) freq = 587.33;
            const gain = 0.16 * Math.pow(0.01 / 0.16, t / duration);
            samples[i] = oscSample('triangle', freq, t) * gain;
        }
        return { duration, samples };
    },
    select: () => {
        const duration = 0.06;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const gain = 0.08 * Math.pow(0.01 / 0.08, t / duration);
            samples[i] = oscSample('square', 360, t) * gain;
        }
        return { duration, samples };
    },
    lifeline: () => {
        const duration = 0.2;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const freq = t >= 0.08 ? 980 : 700;
            const gain = 0.1 * Math.pow(0.01 / 0.1, t / duration);
            samples[i] = oscSample('square', freq, t) * gain;
        }
        return { duration, samples };
    },
    walkAway: () => {
        const duration = 0.28;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const freq = t >= 0.10 ? 392 : 493.88;
            const gain = 0.12 * Math.pow(0.01 / 0.12, t / duration);
            samples[i] = oscSample('triangle', freq, t) * gain;
        }
        return { duration, samples };
    },
    win: () => {
        const duration = 0.58;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            let freq = 523.25;
            if (t >= 0.32) freq = 1046.5;
            else if (t >= 0.20) freq = 783.99;
            else if (t >= 0.10) freq = 659.25;
            const gain = 0.17 * Math.pow(0.01 / 0.17, t / duration);
            samples[i] = oscSample('triangle', freq, t) * gain;
        }
        return { duration, samples };
    },
    loss: () => {
        const duration = 0.36;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        let phase = 0;
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            let freq, gain;
            if (t < 0.14) {
                freq = 260 * Math.pow(180 / 260, t / 0.14);
                gain = 0.1 * Math.pow(0.01 / 0.1, t / 0.14);
            } else {
                const subT = (t - 0.14) / 0.22;
                freq = 170 * Math.pow(110 / 170, subT);
                gain = 0.08 * Math.pow(0.01 / 0.08, subT);
            }
            phase += freq / SAMPLE_RATE;
            samples[i] = (2 * (phase % 1) - 1) * gain;
        }
        return { duration, samples };
    },
    timeout: () => {
        const duration = 0.38;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        let phase = 0;
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            let freq, gain;
            if (t < 0.14) {
                freq = 300 * Math.pow(180 / 300, t / 0.14);
                gain = 0.1 * Math.pow(0.01 / 0.1, t / 0.14);
            } else {
                const subT = (t - 0.14) / 0.24;
                freq = 180 * Math.pow(110 / 180, subT);
                gain = 0.08 * Math.pow(0.01 / 0.08, subT);
            }
            phase += freq / SAMPLE_RATE;
            samples[i] = (2 * (phase % 1) - 1) * gain;
        }
        return { duration, samples };
    },
    tick: () => {
        const duration = 0.04;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const gain = 0.05 * Math.pow(0.01 / 0.05, t / duration);
            samples[i] = oscSample('square', 1046.5, t) * gain;
        }
        return { duration, samples };
    },
    flip: () => {
        const duration = 0.10;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const gain = 0.15 * Math.pow(0.01 / 0.15, t / duration);
            samples[i] = oscSample('triangle', 480, t) * gain;
        }
        return { duration, samples };
    },
    mastered: () => {
        const duration = 0.28;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const freq = t >= 0.10 ? 880 : 587.33;
            const gain = 0.16 * Math.pow(0.01 / 0.16, t / duration);
            samples[i] = oscSample('sine', freq, t) * gain;
        }
        return { duration, samples };
    },
    review: () => {
        const duration = 0.15;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const gain = 0.12 * Math.pow(0.01 / 0.12, t / duration);
            samples[i] = oscSample('sawtooth', 330, t) * gain;
        }
        return { duration, samples };
    },
    nav: () => {
        const duration = 0.08;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const gain = 0.1 * Math.pow(0.01 / 0.1, t / duration);
            samples[i] = oscSample('sine', 440, t) * gain;
        }
        return { duration, samples };
    },
    sync: () => {
        const duration = 0.23;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const freq = t >= 0.08 ? 659.25 : 523.25;
            const gain = 0.12 * Math.pow(0.01 / 0.12, t / duration);
            samples[i] = oscSample('sine', freq, t) * gain;
        }
        return { duration, samples };
    },
    reveal: () => {
        const duration = 0.17;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const freq = t >= 0.07 ? 988 : 740;
            const gain = 0.12 * Math.pow(0.01 / 0.12, t / duration);
            samples[i] = oscSample('sine', freq, t) * gain;
        }
        return { duration, samples };
    },
    pass: () => {
        const duration = 0.26;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const freq = t >= 0.08 ? 329.63 : 440;
            const gain = 0.08 * Math.pow(0.01 / 0.08, t / duration);
            samples[i] = oscSample('square', freq, t) * gain;
        }
        return { duration, samples };
    },
    pause: () => {
        const duration = 0.20;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const freq = t >= 0.08 ? 420 : 560;
            const gain = 0.09 * Math.pow(0.01 / 0.09, t / duration);
            samples[i] = oscSample('triangle', freq, t) * gain;
        }
        return { duration, samples };
    },
    resume: () => {
        const duration = 0.20;
        const totalSamples = Math.floor(SAMPLE_RATE * duration);
        const samples = new Float32Array(totalSamples);
        for (let i = 0; i < totalSamples; i++) {
            const t = i / SAMPLE_RATE;
            const freq = t >= 0.08 ? 880 : 660;
            const gain = 0.09 * Math.pow(0.01 / 0.09, t / duration);
            samples[i] = oscSample('triangle', freq, t) * gain;
        }
        return { duration, samples };
    }
};

export function exportAudioPacks() {
    const packsDir = path.join(rootDir, 'public', 'audio_packs');
    const defaultPackDir = path.join(packsDir, 'default');
    const frontendPublicDir = path.join(rootDir, 'frontend', 'public', 'audio_packs', 'default');

    fs.mkdirSync(defaultPackDir, { recursive: true });
    fs.mkdirSync(frontendPublicDir, { recursive: true });

    // Write manifest
    const manifest = {
        packs: [
            { id: 'synth', name: 'Web Audio Synthesizer (Built-in)', type: 'synth' },
            { id: 'default', name: 'Default WAV Pack', type: 'folder', path: '/audio_packs/default' }
        ]
    };
    fs.writeFileSync(path.join(packsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    const frontendPacksDir = path.join(rootDir, 'frontend', 'public', 'audio_packs');
    fs.mkdirSync(frontendPacksDir, { recursive: true });
    fs.writeFileSync(path.join(frontendPacksDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // Write pack.json
    const packMetadata = {
        id: 'default',
        name: 'Classic Synthesized Pack',
        description: 'Standard synthesized sound effects generated for OpenClassTools.',
        version: '1.0.0',
        author: 'OpenClassTools',
        sounds: Object.keys(generators)
    };
    fs.writeFileSync(path.join(defaultPackDir, 'pack.json'), JSON.stringify(packMetadata, null, 2));
    fs.writeFileSync(path.join(frontendPublicDir, 'pack.json'), JSON.stringify(packMetadata, null, 2));

    // Generate each WAV file
    let count = 0;
    for (const [name, gen] of Object.entries(generators)) {
        const wavBuffer = renderSoundToWav(gen);
        fs.writeFileSync(path.join(defaultPackDir, `${name}.wav`), wavBuffer);
        fs.writeFileSync(path.join(frontendPublicDir, `${name}.wav`), wavBuffer);
        count++;
    }

    console.log(`[AudioExporter] Generated ${count} WAV sound effects in public/audio_packs/default`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    exportAudioPacks();
}
