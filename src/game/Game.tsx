import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { Atmosphere } from './world/Atmosphere'
import { CameraRig, DISTANCE, HEIGHT } from './core/CameraRig'
import './core/curve' // bends the world away; before anything is drawn
import { Dialogue, Prompt } from './Dialogue'
import { CitySquare } from './world/CitySquare'
import { Dock } from './life/Dock'
import { Doors } from './core/Doors'
import { Dust } from './player/Dust'
import { EditHud, EditOverlay, EditPointer } from './house/EditRoom'
import { Fade } from './core/Fade'
import { bindFocus } from './core/focus'
import { pollGamepad } from './core/gamepad'
import { Butterflies } from './life/Butterflies'
import { Cave } from './secrets/CaveRooms'
import { DailyFinds } from './life/DailyFinds'
import { Festive } from './secrets/Festive'
import { Fireflies } from './life/Fireflies'
import { clearSpawn } from './house/room'
import { Furniture } from './house/Furniture'
import { Grass, Pots } from './combat/Grass'
import { GroundDrops, ShellCounter } from './combat/GroundDrops'
import { Hearts } from './combat/Hearts'
import { HouseExterior, HouseInterior } from './house/House'
import { Interactions } from './core/Interactions'
import { BagButton, InventoryPanel, RodButton } from './InventoryPanel'
import { Island } from './world/Island'
import { Joystick } from './Joystick'
import { Leaves } from './Leaves'
import { LogPanel } from './LogPanel'
import { BED_SPAWN } from './world/layout'
import { Mailbox } from './Mailbox'
import { MenuPanel, StartButton } from './MenuPanel'
import { MusicPanel, NowPlaying } from './house/MusicPanel'
import { ABOUT_AT, aboutLines } from './places'
import { NoticeBoard } from './world/NoticeBoard'
import { Pearls } from './secrets/HiddenPearls'
import { Islet } from './secrets/IsletScene'
import { PhotoCapture, PhotoHud } from './PhotoHud'
import { Pickups } from './life/Pickups'
import { Player } from './player/Player'
import { ProjectCard } from './ProjectCard'
import { detectTier } from './core/quality'
import { RecordPlayer } from './house/RecordPlayer'
import { Rain } from './world/Rain'
import { ReelBar } from './life/ReelBar'
import { Slimes } from './combat/Slimes'
import { ShopPanel } from './life/ShopPanel'
import { Snow } from './world/Snow'
import { Sparkle } from './Sparkle'
import { Roads } from './world/Roads'
import { SettingsButton, SettingsPanel } from './SettingsPanel'
import { Sign } from './Sign'
import { Signposts } from './world/Signposts'
import { arrive } from './core/scene'
import { Stations } from './Station'
import { useGame } from './core/store'
import { Trees } from './world/Trees'
import { Trinkets } from './secrets/Trinkets'
import { Villagers } from './life/Villagers'
import { Waterfall } from './secrets/Waterfall'
import { WelcomeBack } from './WelcomeBack'

const tier = detectTier()

/** A controller, read every frame (gamepad.ts), and focus kept inside open panels (focus.ts). */
function Controls() {
  useFrame(() => pollGamepad())
  useEffect(() => bindFocus(), [])
  return null
}

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
  // The open panel, if any, so CSS can hide the touch controls under it (style.css).
  const panel = useGame((s) => s.panel)
  useEffect(() => {
    document.body.dataset.panel = panel ?? ''
  }, [panel])
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
        gl={{ antialias: true, powerPreference: 'high-performance' }}
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
          <Sign x={ABOUT_AT.x} z={ABOUT_AT.z} lines={aboutLines} seen="about" night="It’s the middle of the night… shouldn’t you be asleep? Well, since you’re here:" />
          <Mailbox />
          <NoticeBoard />
          <Signposts />
          <CitySquare />
          <Dock />
          <Waterfall />
          <Islet />
          <Pickups />
          <Pearls />
          <Leaves />
          <Festive />
          <Trinkets />
          <Grass />
          <Pots />
          <Slimes />
          <GroundDrops />
          <Villagers />
          <Butterflies />
          <DailyFinds />
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
        <group visible={scene === 'cave'}>
          <Cave />
        </group>
        <Doors />
        <Interactions />
        <Sparkle />
        <Player />
        <Dust />
        <EditPointer />
        <CameraRig />
        <PhotoCapture />
        <Controls />
      </Canvas>
      <Fade />
      <Hearts />
      <ShellCounter />
      <SettingsButton />
      <ProjectCard />
      <Prompt />
      <ReelBar />
      <Dialogue />
      <NowPlaying />
      <MusicPanel />
      <InventoryPanel />
      <LogPanel />
      <SettingsPanel />
      <ShopPanel />
      <WelcomeBack />
      <BagButton />
      <RodButton />
      <EditHud />
      <Joystick />
      <MenuPanel />
      <StartButton />
      <PhotoHud />
    </>
  )
}
