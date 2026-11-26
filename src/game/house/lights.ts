import { MeshLambertMaterial } from 'three'
import { create } from 'zustand'

// What the room's lights share (RoomLights.tsx, Furniture.tsx, LightSwitch.tsx): the paper shades'
// glow, and whether the switch by the door has the ceiling lantern on. Kept apart from the
// components so their files export only components (Vite's fast refresh needs that).

export const WARM = '#ffc98a'
export const GLOW = { day: 0.35, night: 1.3 } // how much the paper shades glow (emissive)

/** The switch by the door (LightSwitch.tsx): whether the ceiling lantern is on. Not saved: every visit starts lit. */
export const useLightSwitch = create<{ on: boolean }>(() => ({ on: true }))
export const flipLight = () => useLightSwitch.setState((s) => ({ on: !s.on }))

/** The paper of both shades: lit from inside, more at night. Shared, and set once a frame in RoomLights.tsx. */
export const shadeMaterial = new MeshLambertMaterial({ color: '#fff3dc', emissive: WARM, emissiveIntensity: GLOW.day })
