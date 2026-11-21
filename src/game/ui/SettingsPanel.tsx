import { useEffect, useState, type KeyboardEvent } from 'react'
import { closePanel, toggleSettings } from '../core/interact'
import { ACTIONS, codeName, keysFor, rebind, RESERVED, resetKeys, useKeymap, type Action } from '../core/keymap'
import { setVolume, useMusic } from '../core/music'
import { isTouch } from '../core/quality'
import { SECRETS, setSecret, useSecrets } from '../secrets/secrets'
import { startOver } from '../core/save'
import { setSetting, useSettings, type Motion } from '../core/settings'
import { useGame } from '../core/store'
import { Panel } from './Panel'
import { hint } from '../core/keymap'

// The settings: music and effects volumes, how much things move, larger text and the fishing
// assist (settings.ts), the keys (keymap.ts) and starting over (save.ts). Opened with O or the gear
// by the hearts; O, Escape or × closes it.

export function SettingsPanel() {
  const open = useGame((s) => s.panel === 'settings')
  const music = useMusic((s) => s.volume)
  const s = useSettings()
  const secrets = useSecrets()
  useKeymap() // re-render when a key changes
  const [waiting, setWaiting] = useState<Action | null>(null) // the action whose new key is awaited
  const [sure, setSure] = useState(false) // "Start over" asks once more before forgetting everything

  useEffect(() => {
    if (open) return
    setWaiting(null)
    setSure(false)
  }, [open])

  if (!open) return null

  // While a key is awaited, the next one goes to that action. Escape gives up; Tab can't be taken.
  const onKey = (e: KeyboardEvent) => {
    if (!waiting) return false
    e.preventDefault()
    e.stopPropagation()
    if (e.code !== 'Escape' && !RESERVED.has(e.code)) rebind(waiting, e.code)
    setWaiting(null)
    return true
  }

  return (
    <Panel title="Settings" toggle="settings" onKey={onKey}>
      <label className="settings-row">
        Music
        <input
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
      {/* The page (main.tsx): everything on the island, as a plain page. The button at the top is only a skip link while playing. */}
      <div className="settings-row">
        Projects as a plain page
        <button
          type="button"
          className="settings-action"
          onClick={() => {
            closePanel()
            dispatchEvent(new CustomEvent('requestview', { detail: 'page' }))
          }}
        >
          View as page
        </button>
      </div>
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
      {/* The keys (keymap.ts): press a button, then the new key. Not on touch screens, which have no keys. */}
      {!isTouch && (
        <>
          <div className="bag-head bag-subhead">
            <h3>Keys</h3>
            <span className="bag-count" />
            <button type="button" className="settings-action" onClick={resetKeys}>
              Reset keys
            </button>
          </div>
          {ACTIONS.map(({ id, label }) => (
            <div key={id} className="settings-row">
              {label}
              <button
                type="button"
                className="settings-key"
                data-waiting={waiting === id ? '' : undefined}
                aria-label={`${label}: ${keysFor(id).map(codeName).join(' or ') || 'no key'}. Press to change.`}
                onClick={() => setWaiting(waiting === id ? null : id)}
              >
                {waiting === id ? 'Press a key…' : keysFor(id).map(codeName).join(' / ') || '—'}
              </button>
            </div>
          ))}
          <p className="settings-note">Escape always closes things. A controller works too: stick to walk, A to use, B to roll, X for the sword, Y for the bag.</p>
        </>
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
          ? 'Everything found, caught, bought and moved is forgotten, and the island starts fresh. Settings and keys stay.'
          : 'What you’ve found and done is kept in this browser, ready for next time.'}
      </p>
    </Panel>
  )
}

/** The gear to the right of the hearts. Hidden while something else has the player's attention. */
export function SettingsButton() {
  const hidden = useGame((st) => st.dialogue !== null || st.panel !== null || st.fading || st.editing)
  if (hidden) return null
  return (
    <button type="button" className="settings-toggle" onClick={toggleSettings} aria-label={hint('Settings ({settings})', 'Settings')}>
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
