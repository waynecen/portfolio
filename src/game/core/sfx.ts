import { useSettings } from './settings'

// Sound effects, synthesised in the browser like the placeholder music, unless FILES gives recordings. Each
// sound is a short buffer rendered the first time it's needed; playing one makes a single buffer
// source (a few a second at most). Their volume is the effects slider in the settings, apart from the music's.
// Browsers only start audio after a gesture, so unlock() runs on the first key or tap.

const LEVEL = 0.5 // effects at full on the settings slider, relative to full volume
const STEP_VOLUME = 0.45 // footsteps relative to the other effects: they repeat constantly, so they sit low
const WHOOSH_VOLUME = 0.2 // the whoosh (a sword swing, a cast) relative to the other effects
const WET_VOLUME = 0.7 // the splash layered under each footstep in the rain, relative to the step

// Real recordings: put the files in public/sfx/ and their paths here. A sound with files plays them
// instead of its synthesised version below (loaded when audio unlocks). List several to take turns,
// in order: a left and a right footstep alternate like real feet. Keep them short; WAV, OGG or MP3,
// mono is plenty.
const FILES: Partial<Record<Sound, string[]>> = {
  grass: ['/sfx/grass_L.wav', '/sfx/grass_R.wav'],
  tatami: ['/sfx/tatami_L.wav', '/sfx/tatami_R.wav'],
  road: ['/sfx/sand_L.wav', '/sfx/sand_R.wav'], // the island's dirt roads
  wood: ['/sfx/wood_L.wav', '/sfx/wood_R.wav'], // the dock's boards
  homeDoor: ['/sfx/open-door.wav'],
}

// A recording's tone, shaped on the way out. The grass recordings are bright (most of their energy is
// at 2-4 kHz, hardly any below 500 Hz), which repeated several times a second sounds tinny rather than
// soft, so they're darkened and given some body.
const TONE: Partial<Record<Sound, { lowpass: number; bass: number }>> = {
  grass: { lowpass: 1800, bass: 9 }, // Hz above which it rolls off; dB added below 300 Hz
}
// Recorded steps that come out louder than the grass, turned down to sit with it.
const STEP_LEVEL: Partial<Record<Surface, number>> = {
  wood: 0.5, // about twice the grass's level
}
const STEP_PITCH = 0.03 // a recorded step's pitch varies by up to this share either way (synthesised ones by 0.1)

let ctx: AudioContext | null = null
let master: GainNode | null = null

/** Creates (or resumes) the audio context. Call from a key or pointer handler. */
export function unlock() {
  try {
    if (!ctx) {
      ctx = new AudioContext()
      master = ctx.createGain()
      master.gain.value = useSettings.getState().effects * LEVEL
      master.connect(ctx.destination)
      useSettings.subscribe((s) => {
        if (master) master.gain.value = s.effects * LEVEL
      })
    }
    if (ctx.state === 'suspended') void ctx.resume()
    loadFiles()
  } catch {
    // no Web Audio: the game is just silent
  }
}

// Renders `seconds` of sound from a function of (time, white noise sample).
function render(seconds: number, f: (t: number, noise: number) => number): AudioBuffer {
  const c = ctx!
  const buf = c.createBuffer(1, Math.ceil(seconds * c.sampleRate), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = f(i / c.sampleRate, Math.random() * 2 - 1)
  return buf
}

// Low-passed noise: `smooth` near 1 is dull and soft, near 0 is bright and crunchy.
function lowpass(smooth: number) {
  let y = 0
  return (x: number) => (y += (x - y) * (1 - smooth))
}

const SOUNDS = {
  grass: () => {
    const lp = lowpass(0.85)
    return render(0.09, (t, n) => lp(n) * Math.exp(-t * 45) * 1.6)
  },
  snow: () => {
    // A soft crunch: dull noise with some grains much louder than others.
    const lp = lowpass(0.75)
    return render(0.12, (t, n) => lp(n) * (Math.random() < 0.25 ? 2.2 : 0.6) * Math.exp(-t * 32))
  },
  road: () => SOUNDS.stone(), // until its recordings load (FILES)
  stone: () => {
    // The cave floor and the city square's paving: a short, hard tap.
    const lp = lowpass(0.5)
    return render(0.07, (t, n) => lp(n) * Math.exp(-t * 60) * 0.9)
  },
  tatami: () => {
    // A soft, dull brush on woven rush.
    const lp = lowpass(0.9)
    return render(0.1, (t, n) => lp(n) * Math.exp(-t * 38) * 2)
  },
  wood: () => SOUNDS.thud(), // until its recordings load (FILES)
  thud: () => {
    // Furniture set down, a box shoved: a dull knock.
    const lp = lowpass(0.7)
    return render(0.1, (t, n) => (Math.sin(2 * Math.PI * 150 * t) * 0.8 + lp(n) * 0.5) * Math.exp(-t * 40))
  },
  whoosh: () => {
    let y = 0
    return render(0.32, (t, n) => {
      const open = Math.sin((Math.PI * t) / 0.32) // swells then fades, brightening at its peak
      y += (n - y) * (0.04 + 0.2 * open)
      return y * open * 2.2
    })
  },
  door: () =>
    render(0.22, (t, n) => (Math.sin(2 * Math.PI * 95 * t) + n * Math.exp(-t * 200) * 0.6) * Math.exp(-t * 18) * 0.8),
  homeDoor: () => SOUNDS.door(), // the house's front door, going in or out; its recording is in FILES
  blip: () => render(0.05, (t) => Math.sign(Math.sin(2 * Math.PI * 520 * t)) * 0.18 * Math.exp(-t * 50)),
  chime: () =>
    // Two bright notes, rising: something found.
    render(0.5, (t) => {
      const note = t < 0.09 ? 880 : 1318.5
      const since = t < 0.09 ? t : t - 0.09
      return Math.sin(2 * Math.PI * note * t) * 0.3 * Math.exp(-since * 9) * Math.min(1, since * 400)
    }),
  plop: () => {
    // The float landing: a small drop of pitch, with a little spray.
    const lp = lowpass(0.6)
    return render(0.18, (t, n) => (Math.sin(2 * Math.PI * (520 - 1400 * t) * t) * 0.5 + lp(n) * 0.4 * Math.exp(-t * 60)) * Math.exp(-t * 22))
  },
  splash: () => {
    // Something big pulling the float under: a burst of dull spray that washes out.
    const lp = lowpass(0.55)
    return render(0.45, (t, n) => lp(n) * 2.2 * Math.min(1, t * 80) * Math.exp(-t * 9))
  },
  wet: () => {
    // The splash under a footstep in the rain, layered over the surface's own step.
    const lp = lowpass(0.35)
    return render(0.08, (t, n) => lp(n) * Math.exp(-t * 55) * 0.9)
  },
  catch: () =>
    // A fish you've caught before: two quick rising blips.
    render(0.22, (t) => {
      const note = t < 0.07 ? 660 : 990
      const since = t < 0.07 ? t : t - 0.07
      return Math.sin(2 * Math.PI * note * t) * 0.28 * Math.exp(-since * 16) * Math.min(1, since * 400)
    }),
  fanfare: () =>
    // A kind of fish you've never caught: four notes up an arpeggio, the last held.
    render(0.9, (t) => {
      const NOTES = [523.25, 659.25, 783.99, 1046.5]
      const k = Math.min(3, Math.floor(t / 0.09))
      const since = t - k * 0.09
      const decay = k === 3 ? 4 : 14
      return Math.sin(2 * Math.PI * NOTES[k] * t) * 0.26 * Math.exp(-since * decay) * Math.min(1, since * 400)
    }),
  hit: () => {
    // The sword connecting: a dull thwack with a bright edge.
    const lp = lowpass(0.45)
    return render(0.12, (t, n) => (lp(n) * 1.4 + Math.sin(2 * Math.PI * 180 * t) * 0.5) * Math.exp(-t * 38))
  },
  woof: () =>
    // Kinako, petted: a small, happy yip, falling in pitch.
    render(0.16, (t, n) => {
      const f = 430 - 700 * t
      const tone = Math.sin(2 * Math.PI * f * t) * 0.45 + Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.15
      return (tone + n * 0.15 * Math.exp(-t * 60)) * Math.min(1, t * 80) * Math.exp(-t * 16)
    }),
  pop: () =>
    // A slime popping, or a pot breaking: a quick wet burst that drops in pitch.
    render(0.2, (t, n) => (Math.sin(2 * Math.PI * (700 - 2400 * t) * t) * 0.45 + n * 0.25 * Math.exp(-t * 40)) * Math.exp(-t * 14)),
  pickup: () =>
    // A shell or heart picked up from the ground: one bright blip, rising.
    render(0.12, (t) => Math.sin(2 * Math.PI * (1100 + 900 * t) * t) * 0.25 * Math.exp(-t * 22) * Math.min(1, t * 400)),
  hurt: () => {
    // The player bumped: a low, short grunt of noise.
    const lp = lowpass(0.8)
    return render(0.18, (t, n) => (lp(n) * 1.6 + Math.sin(2 * Math.PI * 140 * t) * 0.6) * Math.exp(-t * 20))
  },
  click: () => render(0.03, (t) => Math.sin(2 * Math.PI * 1200 * t) * 0.35 * Math.exp(-t * 120)),
}
type Sound = keyof typeof SOUNDS
const buffers: Partial<Record<Sound, AudioBuffer>> = {} // synthesised, rendered on first use
const recorded: Partial<Record<Sound, AudioBuffer[]>> = {} // from FILES, in their order
const turn: Partial<Record<Sound, number>> = {} // which recording plays next
const failed: Partial<Record<Sound, boolean>> = {} // recordings that didn't load: the synthesised sound plays
const tones: Partial<Record<Sound, AudioNode>> = {} // each TONE's filters, made once and shared by every play

// Where a sound goes: through its TONE filters if it has them, else straight to the master.
function out(name: Sound): AudioNode {
  const tone = TONE[name]
  if (!tone || !recorded[name]) return master!
  let node = tones[name]
  if (!node) {
    const lp = ctx!.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = tone.lowpass
    lp.Q.value = 0.5 // gentle, with no ring at the corner
    const bass = ctx!.createBiquadFilter()
    bass.type = 'lowshelf'
    bass.frequency.value = 300
    bass.gain.value = tone.bass
    lp.connect(bass).connect(master!)
    node = tones[name] = lp
  }
  return node
}

let loading = false
function loadFiles() {
  if (loading || !ctx) return
  loading = true
  const c = ctx
  for (const [name, urls] of Object.entries(FILES) as [Sound, string[]][]) {
    // All or nothing, so the order (left, right) holds; if one fails the synthesised sound stays.
    Promise.all(
      urls.map((url) =>
        fetch(url)
          .then((r) => r.arrayBuffer())
          .then((data) => c.decodeAudioData(data)),
      ),
    )
      .then((bufs) => (recorded[name] = bufs))
      .catch(() => {
        failed[name] = true
        console.warn(`Couldn't load the ${name} sounds (${urls.join(', ')}); using the synthesised one.`)
      })
  }
}

function play(name: Sound, gain = 1, rate = 1) {
  if (!ctx || !master || ctx.state !== 'running' || master.gain.value === 0) return
  const files = recorded[name]
  // A sound with recordings stays quiet while they load, rather than mixing in its synthesised stand-in.
  if (FILES[name] && !files && !failed[name]) return
  const src = ctx.createBufferSource()
  if (files?.length) {
    const k = turn[name] ?? 0
    turn[name] = (k + 1) % files.length
    src.buffer = files[k]
  } else src.buffer = buffers[name] ??= SOUNDS[name]()
  src.playbackRate.value = rate
  const to = out(name)
  if (gain === 1) src.connect(to)
  else {
    const g = ctx.createGain()
    g.gain.value = gain
    src.connect(g).connect(to)
  }
  src.start()
}

export type Surface = 'grass' | 'snow' | 'road' | 'stone' | 'tatami' | 'wood'

/** One footstep, slightly different every time (and left, right, left with recordings). */
export const step = (surface: Surface, wet = false) => {
  const pitch = recorded[surface] ? STEP_PITCH : 0.1
  play(surface, STEP_VOLUME * (STEP_LEVEL[surface] ?? 1) * (0.85 + Math.random() * 0.3), 1 - pitch + Math.random() * 2 * pitch)
  // Recorded steps play alone: the synthesised splash over them sounds like a second, different step.
  if (wet && !FILES[surface]) play('wet', STEP_VOLUME * WET_VOLUME * (0.8 + Math.random() * 0.4), 0.85 + Math.random() * 0.3)
}
export const whoosh = () => play('whoosh', WHOOSH_VOLUME, 0.95 + Math.random() * 0.1)
export const door = () => play('door')
/** The dog, petted. */
export const woof = () => play('woof', 0.8, 0.95 + Math.random() * 0.1)
/** The house's front door opening, going in or out. */
export const homeDoor = () => play('homeDoor')
/** A dialogue letter; `pitch` around 1 gives each line its own voice. */
export const blip = (pitch: number) => play('blip', 1, pitch * (0.96 + Math.random() * 0.08))
export const click = () => play('click')
/** The sword connecting with something (combat.ts). */
export const hit = () => play('hit', 0.9, 0.9 + Math.random() * 0.2)
/** A slime popping, or a pot breaking. */
export const pop = () => play('pop', 0.9, 0.9 + Math.random() * 0.2)
/** A shell or heart picked up off the ground. */
export const pickup = () => play('pickup')
/** The player bumped by a slime. */
export const hurt = () => play('hurt')
/** An item picked up. */
export const chime = () => play('chime')
/** The reel turning while the needle's in the green (fishing.ts): a soft, quick tick. */
export const reelClick = () => play('click', 0.25, 1.5 + Math.random() * 0.2)
/** A fish landed: a fanfare for a kind never caught before, a short blip for one you have. */
export const landed = (first: boolean) => (first ? play('fanfare') : play('catch', 1, 0.95 + Math.random() * 0.1))
/** The fishing float landing on the water. */
export const plop = () => play('plop', 0.8, 0.9 + Math.random() * 0.2)
/** A fish biting. */
export const splash = () => play('splash')
/** A golf putt (golf.ts): a soft tap, louder and duller for a harder one. */
export const tap = (power: number) => play('hit', 0.15 + 0.45 * power, 1.6 - 0.4 * power)
/** The golf ball dropping into the cup: a little rattle. */
export const rattle = () => {
  play('click', 0.5, 0.7)
  play('click', 0.3, 0.9)
}
/** A hole in one, or a new fish: the fanfare. */
export const fanfare = () => play('fanfare')
/** Furniture set down on the floor. */
export const thud = () => play('thud', 1, 0.7)
