import { create } from 'zustand'

// Low-frequency game state for React UI. Only written when the value changes.
export const useGame = create<{ active: number | null }>(() => ({ active: null }))
