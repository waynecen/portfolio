import { useGame } from './store'

// 9×8 pixel heart. o = outline, r = fill, d = shade, w = highlight.
const SPRITE = [
  '.ooo.ooo.',
  'owrrorrro',
  'orrrrrrro',
  'orrrrrrdo',
  '.orrrrdo.',
  '..orrdo..',
  '...oro...',
  '....o....',
]

const COLORS = { o: '#1d1d1d', r: '#e0302f', d: '#a51e1e', w: '#ffffff' } as const
const EMPTY = '#4a3b3b'

type Fill = 'full' | 'half' | 'empty'

function Heart({ fill }: { fill: Fill }) {
  const cells = []
  for (let y = 0; y < SPRITE.length; y++) {
    for (let x = 0; x < SPRITE[y].length; x++) {
      const c = SPRITE[y][x] as keyof typeof COLORS | '.'
      if (c === '.') continue
      const filled = fill === 'full' || (fill === 'half' && x <= 4)
      const color = c === 'o' || filled ? COLORS[c] : EMPTY
      cells.push(<rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={color} />)
    }
  }
  return (
    <svg className="heart" viewBox="0 0 9 8" shapeRendering="crispEdges" aria-hidden="true">
      {cells}
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
