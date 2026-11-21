import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { closePanel, toggleSettings } from './interact'
import { setVolume, useMusic } from './music'
import { isTouch } from './quality'
import { SECRETS, setSecret, useSecrets } from './secrets'
import { startOver } from './save'
import { setSetting, useSettings, type Motion } from './settings'
import { useGame } from './store'

// The settings: music and effects volumes, how much things move, larger text and the fishing
// assist (settings.ts) and starting over (save.ts). Opened with O or the gear
// by the hearts; O, Escape or × closes it.

export function SettingsPanel() {
  const open = useGame((s) => s.panel === 'settings')
  const music = useMusic((s) => s.volume)
  const s = useSettings()
  const secrets = useSecrets()
  const first = useRef<HTMLInputElement>(null)
  const [sure, setSure] = useState(false) // "Start over" asks once more before forgetting everything

  useEffect(() => {
    if (open) first.current?.focus()
    else setSure(false)
  }, [open])

  if (!open) return null

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' && e.code !== 'KeyO') return
    e.preventDefault()
    e.stopPropagation()
    if (e.code === 'KeyO') toggleSettings()
    else closePanel()
  }

  return (
    <div className="bag-panel" role="dialog" aria-label="Settings" onKeyDown={onKeyDown}>
      <div className="bag-head">
        <h2>Settings</h2>
        <span className="bag-count" />
        <button type="button" className="bag-close" aria-label="Close" onClick={closePanel}>
          ×
        </button>
      </div>
      <label className="settings-row">
        Music
        <input
          ref={first}
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={music}
          onChange={(e) => setVolume(Number(e.currentTarget.value))}
        />
      </label>
      <label className="settings-row">
        Sound effects
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={s.effects}
          onChange={(e) => setSetting('effects', Number(e.currentTarget.value))}
        />
      </label>
      <label className="settings-row">
        Motion
        <select value={s.motion} onChange={(e) => setSetting('motion', e.currentTarget.value as Motion)}>
          <option value="device">Match my device</option>
          <option value="reduce">Reduce</option>
          <option value="full">Full</option>
        </select>
      </label>
      <label className="settings-row">
        Larger text
        <input type="checkbox" checked={s.bigText} onChange={(e) => setSetting('bigText', e.currentTarget.checked)} />
      </label>
      <label className="settings-row">
        Fishing assist
        <input type="checkbox" checked={s.fishAssist} onChange={(e) => setSetting('fishAssist', e.currentTarget.checked)} />
      </label>
      <p className="settings-note">Twice as long to reel in a bite. “Assist on” shows on the prompt while it helps.</p>
      <label className="settings-row">
        Slimes
        <input type="checkbox" checked={s.slimes} onChange={(e) => setSetting('slimes', e.currentTarget.checked)} />
      </label>
      <p className="settings-note">Off for a stroll with nothing to bump into.</p>
      {/* Secrets (secrets.ts): each trinket found can be switched on and off; until then, a hint. */}
      <div className="bag-head bag-subhead">
        <h3>Secrets</h3>
        <span className="bag-count">
          {secrets.found.length} of {SECRETS.length} found
        </span>
      </div>
      {SECRETS.filter((x) => secrets.found.includes(x.id)).map((x) => (
        <label key={x.id} className="settings-row">
          {x.effect}
          <input type="checkbox" checked={secrets.on.includes(x.id)} onChange={(e) => setSecret(x.id, e.currentTarget.checked)} />
        </label>
      ))}
      {secrets.found.length < SECRETS.length && (
        <p className="settings-note">Odd trinkets are tucked away in quiet corners of the island. Each one changes something, harmlessly.</p>
      )}
      <div className="bag-head bag-subhead">
        <h3>Start over</h3>
        <span className="bag-count" />
        <button
          type="button"
          className="settings-action"
          data-confirm={sure ? '' : undefined}
          onClick={() => (sure ? startOver() : setSure(true))}
          onBlur={() => setSure(false)}
        >
          {sure ? 'Yes, forget it all' : 'Start over…'}
        </button>
      </div>
      <p className="settings-note">
        {sure
          ? 'Everything found, caught, bought and moved is forgotten, and the island starts fresh. Settings stay.'
          : 'What you’ve found and done is kept in this browser, ready for next time.'}
      </p>
    </div>
  )
}

/** The gear to the right of the hearts. Hidden while something else has the player's attention. */
export function SettingsButton() {
  const hidden = useGame((st) => st.dialogue !== null || st.panel !== null || st.fading || st.editing)
  if (hidden) return null
  return (
    <button type="button" className="settings-toggle" onClick={toggleSettings} aria-label={isTouch ? 'Settings' : 'Settings (O)'}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.4 7.4 0 0 0 1.7-1l2.4 1 2-3.4ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
          transform="translate(-1 0)"
        />
      </svg>
    </button>
  )
}
