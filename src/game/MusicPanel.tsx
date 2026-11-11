import { useEffect, useRef } from 'react'
import { closePanel } from './interact'
import { getTracks, next, playTrack, prev, toggle, toggleMute, useMusic } from './music'
import { useGame } from './store'

/** The record player's panel: track list, transport and volume. Opened by interacting with the record player. */
export function MusicPanel() {
  const open = useGame((s) => s.panel === 'music')
  const { index, playing, volume } = useMusic()
  const first = useRef<HTMLButtonElement>(null)

  // Move keyboard focus into the panel when it opens, so Tab / Enter work straight away.
  useEffect(() => {
    if (open) first.current?.focus()
  }, [open])

  if (!open) return null
  const tracks = getTracks()
  const current = index >= 0 ? tracks[index] : null

  return (
    <div
      className="music-panel"
      role="dialog"
      aria-label="Record player"
      onKeyDown={(e) => {
        if (e.key === 'Escape') closePanel()
      }}
    >
      <div className="music-head">
        <h2>Record player</h2>
        <VolumeButton volume={volume} />
        <button type="button" className="music-close" aria-label="Close" onClick={closePanel}>
          ×
        </button>
      </div>
      <ol className="music-tracks">
        {tracks.map((t, i) => (
          <li key={i}>
            <button
              ref={i === 0 ? first : undefined}
              type="button"
              aria-current={i === index ? 'true' : undefined}
              onClick={() => playTrack(i)}
            >
              <span className="music-note" aria-hidden="true">{i === index && playing ? '♪' : ''}</span>
              <span className="music-title">{t.title}</span>
              <span className="music-artist">{t.artist}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="music-controls">
        <button type="button" aria-label="Previous track" onClick={prev}>⏮</button>
        <button type="button" className="music-play" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>
          {playing ? '❚❚' : '▶'}
        </button>
        <button type="button" aria-label="Next track" onClick={next}>⏭</button>
      </div>
      {current?.credit && <p className="music-credit">{current.credit}</p>}
    </div>
  )
}

// Volume at or below each value shows that many waves: up to 33% one, up to 66% two, above that three.
const WAVE_LEVELS = [0.33, 0.66]

/** Waves to draw for a volume: 0 when muted, otherwise 1–3. */
function wavesFor(volume: number) {
  if (volume === 0) return 0
  const i = WAVE_LEVELS.findIndex((v) => volume <= v)
  return i < 0 ? WAVE_LEVELS.length + 1 : i + 1
}

/** Speaker icon: press to mute, press again to return to the previous level. Waves show the volume. */
function VolumeButton({ volume }: { volume: number }) {
  const waves = wavesFor(volume)
  const muted = waves === 0
  return (
    <button
      type="button"
      className="music-volume"
      aria-label={muted ? 'Unmute' : 'Mute'}
      aria-pressed={muted}
      onClick={toggleMute}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path className="music-speaker" d="M3 9h4l5-4v14l-5-4H3Z" />
        {muted && <path d="M15 9.5l5 5M20 9.5l-5 5" />}
        {waves >= 1 && <path d="M15 9.5a3.5 3.5 0 0 1 0 5" />}
        {waves >= 2 && <path d="M17.5 7a7 7 0 0 1 0 10" />}
        {waves >= 3 && <path d="M20 4.5a10.5 10.5 0 0 1 0 15" />}
      </svg>
    </button>
  )
}

/** Small "now playing" chip under the hearts while the panel is closed. */
export function NowPlaying() {
  const panelOpen = useGame((s) => s.panel !== null)
  const { index, playing } = useMusic()
  if (index < 0 || panelOpen) return null
  const track = getTracks()[index]
  return (
    <div className="now-playing">
      <button type="button" aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`} onClick={toggle}>
        {playing ? '❚❚' : '▶'}
      </button>
      <span className="now-playing-title">
        <span aria-hidden="true">♪ </span>
        {track.title}
      </span>
    </div>
  )
}
