import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { Atmosphere } from './Atmosphere'
import { CameraRig, DISTANCE, HEIGHT } from './CameraRig'
import './curve' // bends the world away; before anything is drawn
import { Dialogue, Prompt } from './Dialogue'
import { Doors } from './Doors'
import { Dust } from './Dust'
import { EditHud, EditOverlay, EditPointer } from './EditRoom'
import { Fade } from './Fade'
import { Fireflies } from './Fireflies'
import { clearSpawn } from './room'
import { Furniture } from './Furniture'
import { Hearts } from './Hearts'
import { HouseExterior, HouseInterior } from './House'
import { Interactions } from './Interactions'
import { BagButton, InventoryPanel } from './InventoryPanel'
import { Island } from './Island'
import { Joystick } from './Joystick'
import { BED_SPAWN } from './layout'
import { Mailbox } from './Mailbox'
import { MusicPanel, NowPlaying } from './MusicPanel'
import { ABOUT_AT, aboutLines } from './places'
import { Pickups } from './Pickups'
import { Player } from './Player'
import { ProjectCard } from './ProjectCard'
import { detectTier } from './quality'
import { RecordPlayer } from './RecordPlayer'
import { Rain } from './Rain'
import { Snow } from './Snow'
import { Sparkle } from './Sparkle'
import { Roads } from './Roads'
import { Sign } from './Sign'
import { arrive } from './scene'
import { Stations } from './Station'
import { useGame } from './store'
import { Trees } from './Trees'

const tier = detectTier()

arrive('house', clearSpawn(BED_SPAWN)) // every visit starts at home (beside the bed, unless furniture's been moved there)

export function Game() {
  const [visible, setVisible] = useState(!document.hidden)
  const isGameView = () => document.body.dataset.view === 'game'
  const [active, setActive] = useState(isGameView)
  const scene = useGame((s) => s.scene)
  // The area on show, on <body> for CSS and for tools that drive the page (the snapshot skill).
  useEffect(() => {
    document.body.dataset.scene = scene
  }, [scene])
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
        // Tell main.tsx to lift the loader once a frame is on screen (two frames: the scene's first draw lands in between).
        onCreated={() => requestAnimationFrame(() => requestAnimationFrame(() => dispatchEvent(new Event('gameready'))))}
      >
        <Atmosphere />
        {/* Both areas stay mounted (so nothing is rebuilt on each trip) but only one is drawn. */}
        <group visible={scene === 'world'}>
          <Island />
          <Roads />
          <Trees />
          <Stations />
          <HouseExterior />
          <Sign x={ABOUT_AT.x} z={ABOUT_AT.z} lines={aboutLines} />
          <Mailbox />
          <Pickups />
          <Rain />
          <Snow />
          <Fireflies />
        </group>
        <group visible={scene === 'house'}>
          <HouseInterior />
          <Furniture />
          <RecordPlayer />
          <EditOverlay />
        </group>
        <Doors />
        <Interactions />
        <Sparkle />
        <Player />
        <Dust />
        <EditPointer />
        <CameraRig />
      </Canvas>
      <Fade />
      <Hearts />
      <ProjectCard />
      <Prompt />
      <Dialogue />
      <NowPlaying />
      <MusicPanel />
      <InventoryPanel />
      <BagButton />
      <EditHud />
      <Joystick />
    </>
  )
}
