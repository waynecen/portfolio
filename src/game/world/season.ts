// The season, from the visitor's month (northern hemisphere), like the time of day comes from
// their clock. Spring blossoms (pink trees, drifting petals), autumn turns the trees and grass
// golden with falling leaves, and winter brings snow on the ground, trees and roof (Snow.tsx,
// Trees.tsx, Island.tsx). Add ?season=winter (or spring, summer, autumn) to the URL to see one.

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

const BY_MONTH: Season[] = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter']

const param = new URLSearchParams(location.search).get('season')

/** The season now, fixed for the visit. */
const season: Season = BY_MONTH.includes(param as Season) ? (param as Season) : BY_MONTH[new Date().getMonth()]

export const winter = season === 'winter'
export const spring = season === 'spring'
export const autumn = season === 'autumn'
