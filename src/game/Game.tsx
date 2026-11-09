import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { FLOOR_RADIUS, Player } from './Player'
import { detectTier } from './quality'

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
    <Canvas
      frameloop={visible && active ? 'always' : 'never'}
      dpr={tier === 'low' ? [1, 1.25] : [1, 1.5]}
      gl={{ antialias: tier === 'high', powerPreference: 'high-performance' }}
      camera={{ position: [0, 10, 10], fov: 35 }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
    >
      <color attach="background" args={['#cfe8d5']} />
      <hemisphereLight args={['#ffffff', '#88aa77', 1.2]} />
      <directionalLight position={[5, 10, 4]} intensity={1.5} />
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[FLOOR_RADIUS, 32]} />
        <meshLambertMaterial color="#8cc084" />
      </mesh>
      <Player />
    </Canvas>
  )
}
