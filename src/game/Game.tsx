import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { CameraRig, DISTANCE, HEIGHT } from './CameraRig'
import { Dialogue, Prompt } from './Dialogue'
import { Hearts } from './Hearts'
import { Interactions } from './Interactions'
import { Joystick } from './Joystick'
import { Player, WORLD_HALF } from './Player'
import { ProjectCard } from './ProjectCard'
import { detectTier, isTouch } from './quality'
import { Sign } from './Sign'
import { Stations } from './Station'

const tier = detectTier()
const GROUND_SIZE = (WORLD_HALF + 30) * 2 // 30 units of margin covers the camera's view at the edges

const WELCOME = [
  'Welcome! This little world is my portfolio.',
  'Walk up to a pillar to see a project, then press ' + (isTouch ? 'A' : 'E') + ' to open it.',
  isTouch ? 'Hold B to sprint, and tap A with nothing nearby to roll.' : 'Hold Shift to sprint, and press Space to roll.',
]

export function Game() {
  const [visible, setVisible] = useState(!document.hidden)
  const isGameView = () => document.body.dataset.view === 'game'
  const [active, setActive] = useState(isGameView)
  useEffect(() => {
    setActive(isGameView()) // catch a switch that happened before this effect attached
    const onVisibility = () => setVisible(!document.hidden)
    const onView = (e: Event) => setActive((e as CustomEvent<string>).detail === 'game')
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('viewchange', onView)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('viewchange', onView)
    }
  }, [])

  return (
    <>
      <Canvas
        frameloop={visible && active ? 'always' : 'never'}
        dpr={tier === 'low' ? [1, 1.25] : [1, 1.5]}
        gl={{ antialias: tier === 'high', powerPreference: 'high-performance' }}
        camera={{ position: [0, HEIGHT, DISTANCE], fov: 35 }}
      >
        <color attach="background" args={['#cfe8d5']} />
        <hemisphereLight args={['#ffffff', '#88aa77', 1.2]} />
        <directionalLight position={[5, 10, 4]} intensity={1.5} />
        {/* Ground reaches well past the walkable edge, so the camera never sees past it. */}
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
          <meshLambertMaterial color="#8cc084" />
        </mesh>
        <Stations />
        <Sign x={-1.8} z={-1.4} lines={WELCOME} />
        <Interactions />
        <Player />
        <CameraRig />
      </Canvas>
      <Hearts />
      <ProjectCard />
      <Prompt />
      <Dialogue />
      <Joystick />
    </>
  )
}
