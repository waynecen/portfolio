import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { CameraRig, DISTANCE, HEIGHT } from './CameraRig'
import { Dialogue, Prompt } from './Dialogue'
import { Hearts } from './Hearts'
import { Interactions } from './Interactions'
import { Joystick } from './Joystick'
import { FLOOR_RADIUS, Player } from './Player'
import { ProjectCard } from './ProjectCard'
import { detectTier } from './quality'
import { Stations } from './Station'

const tier = detectTier()

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
        <mesh rotation-x={-Math.PI / 2}>
          <circleGeometry args={[FLOOR_RADIUS, 32]} />
          <meshLambertMaterial color="#8cc084" />
        </mesh>
        <Stations />
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
