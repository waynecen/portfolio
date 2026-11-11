import type { Track } from './tracks'

// Calm chord loops synthesised in the browser and wrapped as WAV blobs, so the record player works
// (and goes through exactly the same <audio> path as real files) before any music is added.
// Nothing is downloaded; each loop takes a moment to render the first time it plays.

const RATE = 22050
const CHORD_SECONDS = 4

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

// Each chord is a list of MIDI notes; the lowest is doubled an octave down as a soft bass.
const SONGS: { title: string; chords: number[][] }[] = [
  { title: 'Meadow Loop', chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]] },
  { title: 'Rainy Window', chords: [[62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71], [57, 60, 64, 69]] },
  { title: 'Night Pond', chords: [[57, 60, 64, 67], [53, 57, 60, 65], [60, 64, 67, 72], [55, 59, 62, 66]] },
]

function render(chords: number[][]): Float32Array {
  const per = CHORD_SECONDS * RATE
  const out = new Float32Array(chords.length * per)
  chords.forEach((notes, c) => {
    const start = c * per
    // Pad: sine tones with a slow swell in and out, so chords crossfade softly.
    for (let i = 0; i < per; i++) {
      const t = i / RATE
      const env = Math.min(1, t / 0.8) * Math.min(1, (CHORD_SECONDS - t) / 0.8)
      let s = Math.sin(2 * Math.PI * hz(notes[0] - 12) * t) * 0.5
      for (const n of notes) s += Math.sin(2 * Math.PI * hz(n) * t) * 0.25
      out[start + i] += s * env * 0.5
    }
    // Pluck: an arpeggio of the chord, two notes per second with a fast decay.
    for (let k = 0; k < CHORD_SECONDS * 2; k++) {
      const f = hz(notes[k % notes.length] + 12)
      const at = start + Math.floor(k * 0.5 * RATE)
      for (let i = 0; i < RATE && at + i < out.length; i++) {
        const t = i / RATE
        out[at + i] += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 5) * 0.18
      }
    }
  })
  let peak = 0
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]))
  const gain = 0.6 / peak
  for (let i = 0; i < out.length; i++) out[i] *= gain
  return out
}

// 16-bit mono PCM WAV.
function wav(samples: Float32Array): Blob {
  const view = new DataView(new ArrayBuffer(44 + samples.length * 2))
  const str = (o: number, s: string) => [...s].forEach((ch, i) => view.setUint8(o + i, ch.charCodeAt(0)))
  str(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, RATE, true)
  view.setUint32(28, RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  str(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.round(samples[i] * 32767), true)
  return new Blob([view], { type: 'audio/wav' })
}

// Each loop is rendered the first time it's played (its src is read), not when the list is shown.
export function placeholderTracks(): Track[] {
  return SONGS.map((s) => {
    let url = ''
    return {
      title: s.title,
      artist: 'Placeholder loop',
      get src() {
        return (url ||= URL.createObjectURL(wav(render(s.chords))))
      },
      credit: 'Generated in your browser. Replace via src/game/tracks.ts',
    }
  })
}
