import { create } from 'zustand'
import { isTouch } from './quality'
import { readSaved, writeSaved } from './persist'

// The keyboard's bindings, remappable in the settings (SettingsPanel.tsx). Every action has a main
// key, which the visitor can change, and maybe a spare that always works too (the arrow keys,
// Enter, X), unless the visitor gives that spare to something else. Escape always closes things and
// can't be taken. Edit mode keeps its own keys (edit.ts). Hints in dialogue name the main key
// (keyName), so they stay true after a change.

export type Action =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'sprint'
  | 'roll'
  | 'interact'
  | 'attack'
  | 'bag'
  | 'log'
  | 'settings'
  | 'edit'
  | 'photo'

/** The actions in the order the settings list them, with their names there. */
export const ACTIONS: { id: Action; label: string }[] = [
  { id: 'forward', label: 'Walk up' },
  { id: 'back', label: 'Walk down' },
  { id: 'left', label: 'Walk left' },
  { id: 'right', label: 'Walk right' },
  { id: 'sprint', label: 'Sprint (hold)' },
  { id: 'roll', label: 'Roll, reel in' },
  { id: 'interact', label: 'Talk, read, use' },
  { id: 'attack', label: 'Sword' },
  { id: 'bag', label: 'Bag, put the rod away' },
  { id: 'log', label: 'Log' },
  { id: 'settings', label: 'Settings' },
  { id: 'edit', label: 'Edit the room' },
  { id: 'photo', label: 'Photo mode' },
]

/** [main key, spares…] for each action, as KeyboardEvent.code. */
const DEFAULTS: Record<Action, string[]> = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  roll: ['Space'],
  interact: ['KeyE', 'Enter'],
  attack: ['KeyJ', 'KeyX'],
  bag: ['KeyB'],

  log: ['KeyL'],
  settings: ['KeyO'],
  edit: ['KeyF'],
  photo: ['KeyP'],
}

/** Keys that can't be bound: Escape closes things, Tab moves focus. */
export const RESERVED = new Set(['Escape', 'Tab', 'MetaLeft', 'MetaRight'])

const KEY = 'keys-v1' // save.ts: a preference, kept by "Start over"
const ids = new Set<string>(ACTIONS.map((a) => a.id))

function load(): Partial<Record<Action, string>> {
  const v = readSaved(KEY)
  const out: Partial<Record<Action, string>> = {}
  if (v && typeof v === 'object') for (const [a, code] of Object.entries(v)) if (ids.has(a) && typeof code === 'string' && !RESERVED.has(code)) out[a as Action] = code
  return out
}

/** The visitor's changes: a new main key per action. */
export const useKeymap = create<{ main: Partial<Record<Action, string>> }>(() => ({ main: load() }))

// code → action, rebuilt when the bindings change. A changed main key wins over any spare it takes.
const byCode = new Map<string, Action>()
function rebuild() {
  byCode.clear()
  const { main } = useKeymap.getState()
  for (const [a, code] of Object.entries(main)) byCode.set(code, a as Action)
  for (const { id } of ACTIONS) {
    const [first, ...spares] = DEFAULTS[id]
    if (!main[id] && !byCode.has(first)) byCode.set(first, id)
    for (const code of spares) if (!byCode.has(code)) byCode.set(code, id)
  }
}
rebuild()
useKeymap.subscribe(rebuild)

/** The action a key does, if any. */
export const actionFor = (code: string): Action | undefined => byCode.get(code)

/** The action's main key (its code). */
export const mainKey = (a: Action): string => useKeymap.getState().main[a] ?? DEFAULTS[a][0]

/** Every key that does this action, main first. */
export function keysFor(a: Action): string[] {
  const out: string[] = []
  for (const [code, b] of byCode) if (b === a) out.push(code)
  const m = mainKey(a)
  return out.sort((x, y) => +(y === m) - +(x === m))
}

/** A key's name as printed on it: KeyB → B, Space → Space, ArrowUp → ↑. */
export function codeName(code: string): string {
  if (!code) return '(no key)'
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6)
  const names: Record<string, string> = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    ShiftLeft: 'Shift', ShiftRight: 'Right Shift', ControlLeft: 'Ctrl', ControlRight: 'Right Ctrl',
    AltLeft: 'Alt', AltRight: 'Right Alt', Space: 'Space', Enter: 'Enter', Backspace: 'Backspace',
    Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`',
  }
  return names[code] ?? code
}

/** The name of an action's main key, for hints: keyName('bag') → "B". */
export const keyName = (a: Action): string => codeName(mainKey(a))

/** Every key for an action, for hints: keysName('attack') → "J or X". */
export const keysName = (a: Action): string => keysFor(a).map(codeName).join(' or ') || codeName('')

/** Gives an action a new main key. Whatever else had that key loses it (its spares still work). */
export function rebind(a: Action, code: string) {
  if (RESERVED.has(code)) return
  const main = { ...useKeymap.getState().main }
  for (const [b, c] of Object.entries(main)) if (c === code) delete main[b as Action]
  // An action whose default main key this is gives it up: point it at its own spare, or leave it unbound.
  for (const { id } of ACTIONS) if (id !== a && !main[id] && DEFAULTS[id][0] === code) main[id] = DEFAULTS[id][1] ?? ''
  main[a] = code
  if (code === DEFAULTS[a][0]) delete main[a]
  save(main)
}

/** Back to the keys the game started with. */
export function resetKeys() {
  save({})
}

function save(main: Partial<Record<Action, string>>) {
  useKeymap.setState({ main })
  writeSaved(KEY, Object.keys(main).length ? main : undefined)
}

/**
 * Words for whichever controls the visitor has: `touch` on a touch screen, otherwise `keys` with
 * each {action} replaced by its main key's name and {action*} by all of its keys, so hints follow a
 * remap. hint('Press {bag} to open it', 'Tap Bag in the menu').
 */
export function hint(keys: string, touch: string): string {
  if (isTouch) return touch
  return keys.replace(/\{(\w+)(\*?)\}/g, (m, a: string, all: string) => (ids.has(a) ? (all ? keysName(a as Action) : keyName(a as Action)) : m))
}
