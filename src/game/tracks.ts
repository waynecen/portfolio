export type Track = {
  title: string
  artist: string
  /** URL of the audio file, e.g. '/audio/morning.m4a' for public/audio/morning.m4a. */
  src: string
  /** Licence / attribution line, shown in the player (and should also go on the HTML page). */
  credit?: string
}

// The record player's library. Add files to public/audio/ (AAC .m4a or Opus at ~96–128 kbps keeps
// each 3-minute track around 2–3 MB) and list them here. Only use music you made or whose licence
// allows use on a website.
//
// While this list is empty, the player generates a few placeholder chord loops instead.
export const TRACKS: Track[] = [
  // { title: 'Morning Meadow', artist: 'Your Name', src: '/audio/morning-meadow.m4a', credit: 'CC0' },
]
