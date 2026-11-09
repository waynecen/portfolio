export type Tier = 'low' | 'high'

export function detectTier(): Tier {
  const mobile = matchMedia('(pointer: coarse)').matches
  const cores = navigator.hardwareConcurrency ?? 4
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 4
  return mobile || cores <= 4 || mem <= 4 ? 'low' : 'high'
}
