export type Tier = 'low' | 'high'

/** Touch-first device (phone/tablet): gets on-screen controls instead of keyboard hints. */
export const isTouch = matchMedia('(pointer: coarse)').matches

export function detectTier(): Tier {
  const mobile = isTouch
  const cores = navigator.hardwareConcurrency ?? 4
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 4
  return mobile || cores <= 4 || mem <= 4 ? 'low' : 'high'
}
