/**
 * Generates tiny 8-bit WAV sound effects for the celebration animations.
 * Run with: node scripts/generate-sounds.js
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050;

function createWav(samples, sampleRate = SAMPLE_RATE) {
  const numSamples = samples.length;
  const byteRate = sampleRate;
  const blockAlign = 1;
  const bitsPerSample = 8;
  const dataSize = numSamples;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;

  const buffer = Buffer.alloc(fileSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize - 8, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4;
  buffer.writeUInt16LE(1, offset); offset += 2; // PCM
  buffer.writeUInt16LE(1, offset); offset += 2; // mono
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  for (let i = 0; i < numSamples; i++) {
    buffer.writeUInt8(Math.max(0, Math.min(255, Math.round(samples[i] * 127 + 128))), offset + i);
  }

  return buffer;
}

// Simple square wave blip
function squareBlip(freq, duration, volume = 0.6) {
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = [];
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.min(1, (numSamples - i) / (numSamples * 0.3));
    const wave = Math.sign(Math.sin(2 * Math.PI * freq * t));
    samples.push(wave * volume * envelope);
  }
  return samples;
}

// Ascending chirp
function chirp(startFreq, endFreq, duration, volume = 0.5) {
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = [];
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / numSamples;
    const freq = startFreq + (endFreq - startFreq) * progress;
    const envelope = Math.min(1, (numSamples - i) / (numSamples * 0.2));
    const wave = Math.sign(Math.sin(2 * Math.PI * freq * t));
    samples.push(wave * volume * envelope);
  }
  return samples;
}

// Noise burst
function noiseBurst(duration, volume = 0.3) {
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = [];
  for (let i = 0; i < numSamples; i++) {
    const envelope = Math.min(1, (numSamples - i) / (numSamples * 0.5));
    samples.push((Math.random() * 2 - 1) * volume * envelope);
  }
  return samples;
}

// Combine samples
function concat(...arrays) {
  return arrays.flat();
}

const outputDir = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(outputDir, { recursive: true });

// 1. complete.wav - Quick completion tick (used for strike-through)
const complete = squareBlip(880, 0.06, 0.5);
fs.writeFileSync(path.join(outputDir, 'complete.wav'), createWav(complete));

// 2. celebrate.wav - Short cheerful ascending notes
const celebrate = concat(
  squareBlip(523, 0.08, 0.4),
  squareBlip(659, 0.08, 0.4),
  squareBlip(784, 0.12, 0.5)
);
fs.writeFileSync(path.join(outputDir, 'celebrate.wav'), createWav(celebrate));

// 3. stamp.wav - Heavy thud (low freq burst + noise)
const stamp = concat(
  squareBlip(110, 0.1, 0.7),
  noiseBurst(0.05, 0.4)
);
fs.writeFileSync(path.join(outputDir, 'stamp.wav'), createWav(stamp));

// 4. whoosh.wav - Quick swoosh (noise chirp)
const whoosh = chirp(200, 2000, 0.15, 0.3);
fs.writeFileSync(path.join(outputDir, 'whoosh.wav'), createWav(whoosh));

// 5. fanfare.wav - Short triumphant notes
const fanfare = concat(
  squareBlip(523, 0.1, 0.4),
  squareBlip(523, 0.05, 0.3),
  squareBlip(659, 0.1, 0.4),
  squareBlip(784, 0.15, 0.5),
  squareBlip(1047, 0.2, 0.5)
);
fs.writeFileSync(path.join(outputDir, 'fanfare.wav'), createWav(fanfare));

// 6. pop.wav - Quick bubble pop
const pop = chirp(1200, 400, 0.08, 0.5);
fs.writeFileSync(path.join(outputDir, 'pop.wav'), createWav(pop));

console.log('Generated 6 sound effects in assets/sounds/');
