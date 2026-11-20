// The season, from the visitor's month (northern hemisphere), like the time of day comes from
// their clock. Only winter changes the island so far: snow on the ground, trees and roof, and
// falling snow (see Snow.tsx). Add ?season=winter (or spring, summer, autumn) to the URL to see one.

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

const BY_MONTH: Season[] = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter']

const param = new URLSearchParams(location.search).get('season')

/** The season now, fixed for the visit. */
export const season: Season = BY_MONTH.includes(param as Season) ? (param as Season) : BY_MONTH[new Date().getMonth()]

export const winter = season === 'winter'
