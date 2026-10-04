import { generateChipLoop, TRACK_SAMPLE_RATE, TRACK_SECONDS } from '../src/chiptune.js'

const samples = generateChipLoop()
if (samples.length !== TRACK_SAMPLE_RATE * TRACK_SECONDS) throw new Error('Loop is not exactly 60 seconds')
let sumSquares = 0
let peak = 0
for (const value of samples) {
  if (!Number.isFinite(value)) throw new Error('Audio contains invalid samples')
  sumSquares += value * value
  peak = Math.max(peak, Math.abs(value))
}
const rms = Math.sqrt(sumSquares / samples.length)
if (rms < 0.02 || peak > 1) throw new Error(`Unexpected audio level: RMS ${rms}, peak ${peak}`)
if (Math.abs(samples[0] - samples.at(-1)) > 0.01) throw new Error('Loop seam may click')
console.log(`60-second loop verified: ${samples.length} samples, RMS ${rms.toFixed(3)}, peak ${peak.toFixed(3)}`)
