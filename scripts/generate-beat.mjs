/**
 * Generates a short looping hip-hop WAV beat (synthetic drums).
 * Output: frontend/public/beats/loop.wav
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SAMPLE_RATE = 44100;
const BPM = 90;
const BARS = 4;
const BEATS_PER_BAR = 4;
const DURATION = (BARS * BEATS_PER_BAR * 60) / BPM;
const N = Math.floor(SAMPLE_RATE * DURATION);

function envDecay(t, decay) {
  return Math.exp(-t * decay);
}

function writeSample(buf, i, sample) {
  const s = Math.max(-1, Math.min(1, sample));
  buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
}

const data = Buffer.alloc(44 + N * 2);

data.write("RIFF", 0);
data.writeUInt32LE(36 + N * 2, 4);
data.write("WAVE", 8);
data.write("fmt ", 12);
data.writeUInt32LE(16, 16);
data.writeUInt16LE(1, 20);
data.writeUInt16LE(1, 22);
data.writeUInt32LE(SAMPLE_RATE, 24);
data.writeUInt32LE(SAMPLE_RATE * 2, 28);
data.writeUInt16LE(2, 32);
data.writeUInt16LE(16, 34);
data.write("data", 36);
data.writeUInt32LE(N * 2, 40);

const beatSec = 60 / BPM;
const samples = new Float64Array(N);

function addKick(atBeat) {
  const start = Math.floor(atBeat * beatSec * SAMPLE_RATE);
  for (let i = 0; i < SAMPLE_RATE * 0.25; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 55 + 80 * envDecay(t, 18);
    const s = Math.sin(2 * Math.PI * freq * t) * envDecay(t, 10) * 0.9;
    if (start + i < N) samples[start + i] += s;
  }
}

function addSnare(atBeat) {
  const start = Math.floor(atBeat * beatSec * SAMPLE_RATE);
  for (let i = 0; i < SAMPLE_RATE * 0.18; i++) {
    const t = i / SAMPLE_RATE;
    const noise = (Math.random() * 2 - 1) * envDecay(t, 22);
    const tone = Math.sin(2 * Math.PI * 180 * t) * envDecay(t, 16) * 0.35;
    if (start + i < N) samples[start + i] += (noise * 0.55 + tone) * 0.7;
  }
}

function addHat(atBeat, open = false) {
  const start = Math.floor(atBeat * beatSec * SAMPLE_RATE);
  const len = open ? 0.12 : 0.04;
  const decay = open ? 18 : 55;
  for (let i = 0; i < SAMPLE_RATE * len; i++) {
    const t = i / SAMPLE_RATE;
    const noise = (Math.random() * 2 - 1) * envDecay(t, decay) * (open ? 0.22 : 0.14);
    if (start + i < N) samples[start + i] += noise;
  }
}

const totalBeats = BARS * BEATS_PER_BAR;
for (let b = 0; b < totalBeats; b++) {
  addKick(b);
  if (b % 2 === 1) addSnare(b);
  addHat(b);
  addHat(b + 0.5);
  if (b % 4 === 2) addHat(b + 0.75, true);
}

for (let i = 0; i < N; i++) writeSample(data, i, samples[i]);

const outDir = path.join(__dirname, "..", "frontend", "public", "beats");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "loop.wav");
fs.writeFileSync(outPath, data);
console.log(`Wrote ${outPath} (${(data.length / 1024).toFixed(1)} KB, ${DURATION.toFixed(2)}s)`);
