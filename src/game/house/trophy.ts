import { create } from 'zustand'
import { readSaved } from '../core/persist'

// The golf trophy on the mantelpiece: won the first time Gull Rock Links is finished under par
// (golf/golf.ts awards it and saves it with the rest of the golf, under golf-v1, so Start over
// forgets it). It lives here so the house can show it before the golf has loaded.

const won = () => {
  const v = readSaved('golf-v1') as { trophy?: unknown } | null
  return v?.trophy === true
}

export const useTrophy = create<{ golf: boolean }>(() => ({ golf: won() }))

/** Puts the trophy on the mantelpiece (golf.ts saves it). */
export const awardTrophy = () => useTrophy.setState({ golf: true })
