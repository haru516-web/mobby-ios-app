import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 44_100;
const MAX_PEAK = 0.86;
const outputDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio');
let noiseState = 0x4d4f4242;

function noise() {
  noiseState ^= noiseState << 13;
  noiseState ^= noiseState >>> 17;
  noiseState ^= noiseState << 5;
  return ((noiseState >>> 0) / 0xffffffff) * 2 - 1;
}

const sine = (frequency, time, phase = 0) => Math.sin(Math.PI * 2 * frequency * time + phase);
const decay = (time, rate) => Math.exp(-rate * time);

function tone(time, start, duration, frequency, amplitude, rate = 8) {
  if (time < start || time >= start + duration) return 0;
  const local = time - start;
  const attack = Math.min(1, local / 0.006);
  return sine(frequency, local) * amplitude * attack * decay(local, rate);
}

function render(duration, synthesis) {
  const length = Math.round(duration * SAMPLE_RATE);
  const samples = new Float64Array(length);
  for (let index = 0; index < length; index += 1) {
    const time = index / SAMPLE_RATE;
    samples[index] = synthesis(time, index);
  }

  const fadeSamples = Math.min(Math.round(0.012 * SAMPLE_RATE), Math.floor(length / 3));
  for (let index = 0; index < fadeSamples; index += 1) {
    const fadeIn = index / fadeSamples;
    const fadeOut = (fadeSamples - index - 1) / fadeSamples;
    samples[index] *= fadeIn;
    samples[length - index - 1] *= fadeOut;
  }

  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const gain = peak > MAX_PEAK ? MAX_PEAK / peak : 1;
  return Int16Array.from(samples, (sample) => Math.round(Math.max(-1, Math.min(1, sample * gain)) * 32767));
}

const sounds = {
  'transition-swish.wav': [0.32, (t) => {
    const envelope = Math.sin(Math.PI * Math.min(1, t / 0.32)) ** 1.5;
    const sweep = sine(550 + 1450 * (t / 0.32), t) * 0.19;
    return (noise() * 0.24 + sweep) * envelope;
  }],
  'tab-pop.wav': [0.14, (t) => tone(t, 0, 0.14, 520 + 180 * t / 0.14, 0.72, 24)],
  'collection-complete.wav': [0.72, (t) =>
    tone(t, 0, 0.5, 880, 0.34, 7) + tone(t, 0.1, 0.5, 1174.66, 0.3, 7) +
    tone(t, 0.2, 0.5, 1567.98, 0.32, 7) + noise() * 0.025 * decay(t, 5)],
  'reaction-discovered.wav': [0.55, (t) =>
    tone(t, 0, 0.18, 360 - 80 * t, 0.62, 20) + tone(t, 0.14, 0.38, 783.99, 0.28, 8) +
    tone(t, 0.22, 0.3, 1046.5, 0.25, 9)],
  'stamp-hit.wav': [0.62, (t) => {
    const thump = t < 0.22 ? sine(105 - 45 * t / 0.22, t) * 0.7 * decay(t, 17) : 0;
    return thump + tone(t, 0.12, 0.42, 523.25, 0.2, 8) + tone(t, 0.2, 0.34, 783.99, 0.2, 9);
  }],
  'dialogue-step.wav': [0.11, (t) =>
    tone(t, 0, 0.1, 310, 0.44, 30) + (t < 0.035 ? noise() * 0.1 * decay(t, 70) : 0)],
  'action-error.wav': [0.2, (t) => {
    const gated = t < 0.075 || (t >= 0.095 && t < 0.17);
    return gated ? (Math.sign(sine(155, t)) * 0.33 + sine(310, t) * 0.08) * decay(t, 5) : 0;
  }],
};

function encodeWav(samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < samples.length; index += 1) buffer.writeInt16LE(samples[index], 44 + index * 2);
  return buffer;
}

async function inspect(path) {
  const wav = await readFile(path);
  const channels = wav.readUInt16LE(22);
  const sampleRate = wav.readUInt32LE(24);
  const bits = wav.readUInt16LE(34);
  const sampleCount = wav.readUInt32LE(40) / 2;
  let peak = 0;
  let sum = 0;
  for (let offset = 44; offset < wav.length; offset += 2) {
    const sample = wav.readInt16LE(offset) / 32768;
    peak = Math.max(peak, Math.abs(sample));
    sum += sample;
  }
  return { sampleRate, channels, bits, duration: sampleCount / sampleRate, peak, dcOffset: sum / sampleCount };
}

await mkdir(outputDir, { recursive: true });
for (const [name, [duration, synthesis]] of Object.entries(sounds)) {
  noiseState = 0x4d4f4242;
  await writeFile(join(outputDir, name), encodeWav(render(duration, synthesis)));
}

for (const name of Object.keys(sounds)) {
  const result = await inspect(join(outputDir, name));
  const valid = result.sampleRate === SAMPLE_RATE && result.channels === 1 && result.bits === 16 &&
    result.duration >= 0.08 && result.duration <= 1.2 && result.peak <= 0.9 && Math.abs(result.dcOffset) <= 0.01;
  console.log(`${valid ? 'OK' : 'FAIL'} ${name} ${result.duration.toFixed(3)}s peak=${result.peak.toFixed(4)} dc=${result.dcOffset.toFixed(6)} ${result.sampleRate}Hz/${result.bits}-bit/${result.channels}ch`);
  if (!valid) process.exitCode = 1;
}
