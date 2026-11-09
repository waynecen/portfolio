import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { detectTier } from './quality'

const tier = detectTier()

export function Game() {
  const [visible, setVisible] = useState(!document.hidden)
  useEffect(() => {
    const on = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])

  return (
    <Canvas
      frameloop={visible ? 'always' : 'never'}
      dpr={tier === 'low' ? [1, 1.25] : [1, 1.5]}
      gl={{ antialias: tier === 'high', powerPreference: 'high-performance' }}
      camera={{ position: [0, 10, 10], fov: 35 }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
    >
      <color attach="background" args={['#cfe8d5']} />
      <hemisphereLight args={['#ffffff', '#88aa77', 1.2]} />
      <directionalLight position={[5, 10, 4]} intensity={1.5} />
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[8, 32]} />
        <meshLambertMaterial color="#8cc084" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.35, 0.4, 4, 8]} />
        <meshLambertMaterial color="#f2c14e" />
      </mesh>
    </Canvas>
  )
}
