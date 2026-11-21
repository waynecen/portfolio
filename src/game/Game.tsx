import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { Atmosphere } from './Atmosphere'
import { CameraRig, DISTANCE, HEIGHT } from './CameraRig'
import './curve' // bends the world away; before anything is drawn
import { Dialogue, Prompt } from './Dialogue'
import { Dock } from './Dock'
import { Doors } from './Doors'
import { Dust } from './Dust'
import { EditHud, EditOverlay, EditPointer } from './EditRoom'
import { Fade } from './Fade'
import { Festive } from './Festive'
import { Fireflies } from './Fireflies'
import { GuideButton, GuideWind } from './GuideWind'
import { clearSpawn } from './room'
import { Furniture } from './Furniture'
import { Grass, Pots } from './Grass'
import { GroundDrops, ShellCounter } from './GroundDrops'
import { Hearts } from './Hearts'
import { HouseExterior, HouseInterior } from './House'
import { Interactions } from './Interactions'
import { BagButton, InventoryPanel, RodButton } from './InventoryPanel'
import { Island } from './Island'
import { Joystick } from './Joystick'
import { Leaves } from './Leaves'
import { LogPanel } from './LogPanel'
import { BED_SPAWN } from './layout'
import { Mailbox } from './Mailbox'
import { MenuPanel, StartButton } from './MenuPanel'
import { MusicPanel, NowPlaying } from './MusicPanel'
import { ABOUT_AT, aboutLines } from './places'
import { NoticeBoard } from './NoticeBoard'
import { Pickups } from './Pickups'
import { Player } from './Player'
import { ProjectCard } from './ProjectCard'
import { detectTier } from './quality'
import { RecordPlayer } from './RecordPlayer'
import { Rain } from './Rain'
import { ReelBar } from './ReelBar'
import { Slimes } from './Slimes'
import { Snow } from './Snow'
import { Sparkle } from './Sparkle'
import { Roads } from './Roads'
import { SettingsButton, SettingsPanel } from './SettingsPanel'
import { Sign } from './Sign'
import { arrive } from './scene'
import { Stations } from './Station'
import { useGame } from './store'
import { Trees } from './Trees'
import { Trinkets } from './Trinkets'
import { WelcomeBack } from './WelcomeBack'

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
          <Dock />
          <Pickups />
          <Leaves />
          <Festive />
          <Trinkets />
          <Grass />
          <Pots />
          <Slimes />
          <GroundDrops />
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
        <GuideWind />
        <Player />
        <Dust />
        <EditPointer />
        <CameraRig />
      </Canvas>
      <Fade />
      <Hearts />
      <ShellCounter />
      <GuideButton />
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
      <WelcomeBack />
      <BagButton />
      <RodButton />
      <EditHud />
      <Joystick />
      <MenuPanel />
      <StartButton />
    </>
  )
}
