import { useId } from 'react'
import { useGame } from './store'

// Vector heart drawn in a 32×30 box. Medium fidelity: gradient body, outline,
// gloss highlight, and a dark "socket" that shows through when the heart is empty.
const HEART =
  'M16 27.5C16 27.5 3 19.5 3 10.6 3 6.2 6.4 3 10.4 3c2.5 0 4.5 1.4 5.6 3.5C17.1 4.4 19.1 3 21.6 3 25.6 3 29 6.2 29 10.6 29 19.5 16 27.5 16 27.5Z'

type Fill = 'full' | 'half' | 'empty'

function Heart({ fill }: { fill: Fill }) {
  // Gradient/clip ids must be unique per heart; useId's colons are awkward inside url().
  const id = useId().replace(/:/g, '')
  const red = `${id}-red`
  const socket = `${id}-socket`
  const clip = `${id}-clip`
  const width = fill === 'full' ? 32 : fill === 'half' ? 16 : 0

  return (
    <svg className="heart" viewBox="0 0 32 30" aria-hidden="true">
      <defs>
        <linearGradient id={red} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#ff6b5e" />
          <stop offset="0.55" stopColor="#e2262b" />
          <stop offset="1" stopColor="#a3121a" />
        </linearGradient>
        <linearGradient id={socket} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a3436" />
          <stop offset="1" stopColor="#2b1c1e" />
        </linearGradient>
        <clipPath id={clip}>
          <rect x="0" y="0" width={width} height="30" />
        </clipPath>
      </defs>

      {/* Empty socket underneath everything */}
      <path d={HEART} fill={`url(#${socket})`} />

      {/* Red body + gloss, clipped to how much health this heart holds */}
      <g clipPath={`url(#${clip})`}>
        <path d={HEART} fill={`url(#${red})`} />
        <ellipse cx="9.6" cy="9.4" rx="3.4" ry="2.2" transform="rotate(-35 9.6 9.4)" fill="#fff" opacity="0.85" />
        <circle cx="13.4" cy="6.6" r="1" fill="#fff" opacity="0.7" />
      </g>

      {/* Outline on top so the half-heart edge stays crisp */}
      <path d={HEART} fill="none" stroke="#2a1416" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  )
}

export function Hearts() {
  const maxHearts = useGame((s) => s.maxHearts)
  const health = useGame((s) => s.health)

  const hearts: Fill[] = []
  for (let i = 0; i < maxHearts; i++) {
    const h = health - i * 2
    hearts.push(h >= 2 ? 'full' : h === 1 ? 'half' : 'empty')
  }

  return (
    <div className="hud-hearts" role="img" aria-label={`Health: ${health / 2} of ${maxHearts} hearts`}>
      {hearts.map((fill, i) => (
        <Heart key={i} fill={fill} />
      ))}
    </div>
  )
}
