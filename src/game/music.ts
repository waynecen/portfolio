import { create } from 'zustand'
import { placeholderTracks } from './placeholderTracks'
import { TRACKS, type Track } from './tracks'

// One shared <audio> element for the whole game. It's created on the first play (a user gesture,
// which browsers require for audio) and streams the file, so nothing downloads until then.
// Routing it through Web Audio gives a volume control that works on iOS (where audio.volume is
// read-only) and an analyser for the record player's pulse.

type MusicState = {
  /** Index into getTracks(); -1 until something is played. */
  index: number
  playing: boolean
  /** 0..1, remembered between visits. */
  volume: number
}

const VOLUME_KEY = 'portfolio.music.volume'
const DEFAULT_VOLUME = 0.6

function loadVolume() {
  try {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '')
    return v >= 0 && v <= 1 ? v : DEFAULT_VOLUME
  } catch {
    return DEFAULT_VOLUME
  }
}

export const useMusic = create<MusicState>(() => ({ index: -1, playing: false, volume: loadVolume() }))

let list: Track[] | null = null
/** The library: TRACKS, or generated placeholders while that's empty. */
export function getTracks(): Track[] {
  return (list ??= TRACKS.length ? TRACKS : placeholderTracks())
}

let audio: HTMLAudioElement | null = null
let ctx: AudioContext | null = null
let gain: GainNode | null = null
let analyser: AnalyserNode | null = null
let bins: Uint8Array<ArrayBuffer> | null = null

function setup(): HTMLAudioElement {
  if (audio) return audio
  const a = new Audio()
  a.preload = 'none'
  a.addEventListener('play', () => useMusic.setState({ playing: true }))
  a.addEventListener('pause', () => useMusic.setState({ playing: false }))
  a.addEventListener('ended', () => next())
  try {
    ctx = new AudioContext()
    gain = ctx.createGain()
    gain.gain.value = useMusic.getState().volume
    analyser = ctx.createAnalyser()
    analyser.fftSize = 64
    bins = new Uint8Array(analyser.frequencyBinCount)
    ctx.createMediaElementSource(a).connect(gain).connect(analyser).connect(ctx.destination)
  } catch {
    // No Web Audio: plain element volume, no pulse.
    a.volume = useMusic.getState().volume
  }
  if ('mediaSession' in navigator) {
    // Lock-screen / headphone / keyboard media keys.
    navigator.mediaSession.setActionHandler('play', () => toggle())
    navigator.mediaSession.setActionHandler('pause', () => toggle())
    navigator.mediaSession.setActionHandler('nexttrack', () => next())
    navigator.mediaSession.setActionHandler('previoustrack', () => prev())
  }
  audio = a
  return a
}

function start(a: HTMLAudioElement) {
  void ctx?.resume()
  a.play().catch(() => useMusic.setState({ playing: false }))
}

/** Plays track `i` (wraps around the library). */
export function playTrack(i: number) {
  const tracks = getTracks()
  if (!tracks.length) return
  const n = ((i % tracks.length) + tracks.length) % tracks.length
  const a = setup()
  if (n !== useMusic.getState().index || !a.src) {
    a.src = tracks[n].src
    useMusic.setState({ index: n })
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: tracks[n].title, artist: tracks[n].artist })
    }
  }
  start(a)
}

export function toggle() {
  const { index } = useMusic.getState()
  if (index < 0) return playTrack(0)
  const a = setup()
  if (a.paused) start(a)
  else a.pause()
}

export function next() {
  playTrack(useMusic.getState().index + 1)
}

/** Restarts the track if it's a few seconds in, otherwise goes to the previous one (like most players). */
export function prev() {
  if (audio && audio.currentTime > 3) audio.currentTime = 0
  else playTrack(useMusic.getState().index - 1)
}

// The level to return to when unmuting (a reload while muted comes back at the default).
let unmuted = useMusic.getState().volume || DEFAULT_VOLUME

/** Mutes (volume 0), or restores the level from before muting. */
export function toggleMute() {
  setVolume(useMusic.getState().volume > 0 ? 0 : unmuted)
}

export function setVolume(v: number) {
  if (v > 0) unmuted = v
  useMusic.setState({ volume: v })
  if (gain) gain.gain.value = v
  else if (audio) audio.volume = v
  try {
    localStorage.setItem(VOLUME_KEY, String(v))
  } catch {
    // storage blocked: volume just isn't remembered
  }
}

/** Loudness of the low end right now, 0..1. Cheap enough to call every frame; allocates nothing. */
export function level(): number {
  if (!analyser || !bins || !audio || audio.paused) return 0
  analyser.getByteFrequencyData(bins)
  let sum = 0
  for (let i = 0; i < 8; i++) sum += bins[i]
  return sum / (8 * 255)
}
