// Twenty-four 4/4 bars at 96 BPM: exactly sixty seconds before the loop repeats.
export const TRACK_SECONDS = 60
export const TRACK_SAMPLE_RATE = 22050

const BPM = 96
const STEP_SECONDS = 60 / BPM / 4
const ROOTS = [
  48, 45, 41, 43, 48, 45, 41, 43,
  45, 41, 48, 43, 45, 41, 48, 43,
  41, 43, 48, 45, 41, 43, 48, 48,
]
const MELODIES = [
  [0, 4, 7, 12, 7, 4, 2, 4],
  [0, 3, 7, 12, 10, 7, 3, 0],
  [0, 4, 7, 9, 7, 4, 0, 2],
  [0, 4, 7, 12, 11, 7, 4, 2],
  [7, 12, 10, 7, 5, 3, 0, null],
  [0, 5, 7, 12, 7, 5, 3, 0],
]

const hz = midi => 440 * 2 ** ((midi - 69) / 12)

export function generateChipLoop(sampleRate = TRACK_SAMPLE_RATE) {
  const samples = new Float32Array(TRACK_SECONDS * sampleRate)
  let noiseSeed = 192837465
  const noise = () => {
    noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) | 0
    return (noiseSeed >>> 0) / 2147483648 - 1
  }

  function tone(start, length, note, volume, voice = 'pulse') {
    const first = Math.round(start * sampleRate)
    const count = Math.min(Math.round(length * sampleRate), samples.length - first)
    const frequency = hz(note)
    for (let i = 0; i < count; i++) {
      const t = i / sampleRate
      const phase = (t * frequency) % 1
      const attack = Math.min(1, t / 0.006)
      const release = Math.min(1, (length - t) / 0.025)
      const envelope = attack * Math.max(0, release)
      const wave = voice === 'triangle' ? 1 - 4 * Math.abs(phase - 0.5) : phase < 0.25 ? 1 : -1
      samples[first + i] += wave * envelope * volume
    }
  }

  function kick(start) {
    const first = Math.round(start * sampleRate)
    const count = Math.round(0.19 * sampleRate)
    let phase = 0
    for (let i = 0; i < count && first + i < samples.length; i++) {
      const t = i / sampleRate
      phase += (47 + 110 * Math.exp(-t * 28)) / sampleRate
      samples[first + i] += Math.sin(phase * Math.PI * 2) * Math.exp(-t * 24) * 0.27
    }
  }

  function percussion(start, length, volume, snare = false) {
    const first = Math.round(start * sampleRate)
    const count = Math.round(length * sampleRate)
    let previous = 0
    for (let i = 0; i < count && first + i < samples.length; i++) {
      const t = i / sampleRate
      const value = noise()
      const highPass = value - previous * 0.86
      previous = value
      samples[first + i] += highPass * Math.exp(-t * (snare ? 24 : 85)) * volume
    }
  }

  for (let bar = 0; bar < ROOTS.length; bar++) {
    const root = ROOTS[bar]
    const minor = root === 45
    const chord = [0, minor ? 3 : 4, 7, 12]
    const barStart = bar * 16 * STEP_SECONDS
    const melody = MELODIES[(bar < 8 ? bar : bar < 16 ? bar + 2 : bar + 4) % MELODIES.length]

    for (let step = 0; step < 16; step++) {
      const at = barStart + step * STEP_SECONDS
      tone(at, STEP_SECONDS * 0.7, root + 12 + chord[step % 4], 0.025)
      if (step % 2 === 0) {
        const offset = melody[step / 2]
        if (offset !== null) tone(at, STEP_SECONDS * 1.72, root + 24 + offset, 0.105)
        percussion(at, 0.055, 0.035)
      }
      if (step % 4 === 0) tone(at, STEP_SECONDS * 3.55, root + (step === 8 ? 7 : 0), 0.14, 'triangle')
      if (step === 0 || step === 8) kick(at)
      if (step === 4 || step === 12) percussion(at, 0.16, 0.11, true)
    }
  }

  // The last chord resolves to the first. Short edge fades avoid a click at the seam.
  const edge = Math.round(sampleRate * 0.025)
  for (let i = 0; i < samples.length; i++) {
    const fade = Math.min(1, i / edge, (samples.length - 1 - i) / edge)
    const softened = Math.tanh(samples[i] * 1.25) * 0.82 * Math.max(0, fade)
    samples[i] = Math.round(softened * 48) / 48
  }
  return samples
}

export function createMusicPlayer() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) throw new Error('Web Audio is unavailable in this browser')
  const context = new AudioContextClass()
  try {
    const data = generateChipLoop()
    const buffer = context.createBuffer(1, data.length, TRACK_SAMPLE_RATE)
    buffer.copyToChannel(data, 0)
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    source.loop = true
    gain.gain.value = 0
    source.connect(gain).connect(context.destination)
    source.start()
    return {
      setMuted(muted) {
        gain.gain.setTargetAtTime(muted ? 0 : 0.42, context.currentTime, 0.035)
      },
      resume() { return context.state === 'running' ? Promise.resolve() : context.resume() },
      close() { source.stop(); return context.close() },
    }
  } catch (error) {
    context.close()
    throw error
  }
}
