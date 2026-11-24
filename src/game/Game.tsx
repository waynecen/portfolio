import { Canvas, useFrame } from '@react-three/fiber'
// The game's CSS, in this order: later files override earlier ones (the first view's is in src/style.css).
import './ui/hud.css'
import './ui/touch.css'
import './house/house.css'
import './ui/panels.css'
import './life/life.css'
import './ui/photo.css'
import './golf/golf.css'
import { lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { Atmosphere } from './world/Atmosphere'
import { ShadowSweep } from './world/Shadows'
import { SkyDome } from './world/SkyDome'
import { Sea } from './world/Sea'
import { waterMaterial } from './world/land'
import { LightShafts } from './world/LightShafts'
import { Motes } from './house/Motes'
import { Footprints } from './player/Footprints'
import { PostFX } from './world/PostFX'
import { AdaptiveResolution } from './core/adaptive'
import { CameraRig } from './core/CameraRig'
import { DISTANCE, HEIGHT } from './core/camera'
import './core/curve' // bends the world away; before anything is drawn
import './core/shading' // the soft stylised shading; before anything is drawn
import './core/haze' // height fog, low over the water; before anything is drawn
import { Dialogue, Prompt } from './ui/Dialogue'
import { CitySquare } from './world/CitySquare'
import { Dock } from './life/Dock'
import { Doors } from './core/Doors'
import { Dust } from './player/Dust'
import { Fade } from './core/Fade'
import { bindFocus } from './core/focus'
import { pollGamepad } from './core/gamepad'
import { Butterflies } from './life/Butterflies'
import { DailyFinds } from './life/DailyFinds'
import { Festive } from './secrets/Festive'
import { Fireflies } from './life/Fireflies'
import { clearSpawn } from './house/room'
import { Furniture } from './house/Furniture'
import { Grass, Pots } from './combat/Grass'
import { GroundDrops, ShellCounter } from './combat/GroundDrops'
import { Hearts } from './combat/Hearts'
import { HouseExterior, HouseInterior } from './house/House'
import { Pendant, RoomLights } from './house/RoomLights'
import { LightSwitch } from './house/LightSwitch'
import { Interactions } from './core/Interactions'
import { BagButton, InventoryPanel, RodButton } from './ui/InventoryPanel'
import { Island } from './world/Island'
import { Joystick, TouchStick } from './ui/Joystick'
import { Leaves } from './ui/Leaves'
import { LogPanel } from './ui/LogPanel'
import { BED_SPAWN } from './world/layout'
import { Mailbox } from './portfolio/Mailbox'
import { MenuPanel, StartButton } from './ui/MenuPanel'
import { MusicPanel, NowPlaying } from './house/MusicPanel'
import { ABOUT_AT, aboutLines } from './portfolio/places'
import { NoticeBoard } from './world/NoticeBoard'
import { Pearls } from './secrets/HiddenPearls'
import { Pickups } from './life/Pickups'
import { Player } from './player/Player'
import { ProjectCard } from './portfolio/ProjectCard'
import { RecordPlayer } from './house/RecordPlayer'
import { Rain } from './world/Rain'
import { ReelBar } from './life/ReelBar'
import { Slimes } from './combat/Slimes'
import { Snow } from './world/Snow'
import { Sparkle } from './ui/Sparkle'
import { Roads } from './world/Roads'
import { SettingsButton, SettingsPanel } from './ui/SettingsPanel'
import { Sign } from './portfolio/Sign'
import { Signposts } from './world/Signposts'
import { arrive } from './core/scene'
import { Stations } from './portfolio/Station'
import { useGame } from './core/store'
import { whenModelsIn } from './core/modelsIn'
import { Trees } from './world/Trees'
import { Trinkets } from './secrets/Trinkets'
import { Villagers } from './life/Villagers'
import { Waterfall } from './secrets/Waterfall'
import { WelcomeBack } from './ui/WelcomeBack'


// Parts most visits never reach load on their own, after the first frame: the cave and the islet,
// edit mode, the shop and photo mode. Each waits behind its own Suspense, so nothing else waits for it.
const later = <T,>(load: () => Promise<T>, pick: (m: T) => ComponentType) => lazy(() => load().then((m) => ({ default: pick(m) })))
const Cave = later(() => import('./secrets/CaveRooms'), (m) => m.Cave)
const Islet = later(() => import('./secrets/IsletScene'), (m) => m.Islet)
const Course = later(() => import('./golf/Course'), (m) => m.Course)
const GolfHud = later(() => import('./golf/GolfHud'), (m) => m.GolfHud)
const EditOverlay = later(() => import('./house/EditRoom'), (m) => m.EditOverlay)
const EditPointer = later(() => import('./house/EditRoom'), (m) => m.EditPointer)
const EditHud = later(() => import('./house/EditRoom'), (m) => m.EditHud)
const ShopPanel = later(() => import('./life/ShopPanel'), (m) => m.ShopPanel)
const PhotoHud = later(() => import('./ui/PhotoHud'), (m) => m.PhotoHud)
const PhotoCapture = later(() => import('./ui/PhotoHud'), (m) => m.PhotoCapture)
const Later = ({ children }: { children: ReactNode }) => <Suspense fallback={null}>{children}</Suspense>

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
        // The resolution adapts to keep frames smooth (core/adaptive.ts); shadows and the finishing pass
        // (world/Shadows.tsx, world/PostFX.tsx) are the same for everyone. PostFX tone-maps and antialiases,
        // so the renderer does neither (flat).
        dpr={[1, 1.5]}
        shadows="percentage" // PCF; Shadows.tsx softens it with the shadow radius (three removed PCFSoftShadowMap)
        flat
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, HEIGHT, DISTANCE], fov: 35 }}
        // Tell main.tsx to lift the loader once the models are in (core/Held.tsx) and a frame with them is
        // on screen (two frames: their first draw lands in between).
        onCreated={() => whenModelsIn().then(() => requestAnimationFrame(() => requestAnimationFrame(() => dispatchEvent(new Event('gameready')))))}
      >
        <Atmosphere />
        <ShadowSweep />
        <PostFX />
        <AdaptiveResolution />
        <RoomLights />
        {/* Both areas stay mounted (so nothing is rebuilt on each trip) but only one is drawn. */}
        <group visible={scene === 'world'}>
          <SkyDome />
          <LightShafts />
          <Island />
          <Sea color={waterMaterial.color} />
          <Footprints />
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
          <Later>
            <Islet />
          </Later>
          <Later>
            <Course />
          </Later>
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
          <Pendant />
          <LightSwitch />
          <Motes />
          <Furniture />
          <RecordPlayer />
          <Later>
            <EditOverlay />
          </Later>
        </group>
        <group visible={scene === 'cave'}>
          <Later>
            <Cave />
          </Later>
        </group>
        <Doors />
        <Interactions />
        <Sparkle />
        <Player />
        <Dust />
        <Later>
            <EditPointer />
          </Later>
        <CameraRig />
        <Later>
            <PhotoCapture />
          </Later>
        <Controls />
      </Canvas>
      {/* Touch: the area the stick appears in, first so the rest of the HUD sits above it. */}
      <TouchStick />
      <Fade />
      {/* Top left: the hearts, then the settings gear after however many there are (hud.css). */}
      <div className="hud-top-left">
        <Hearts />
        <SettingsButton />
      </div>
      <ShellCounter />
      <ProjectCard />
      <Prompt />
      <ReelBar />
      <Dialogue />
      <NowPlaying />
      <MusicPanel />
      <InventoryPanel />
      <LogPanel />
      <SettingsPanel />
      <Later>
            <ShopPanel />
          </Later>
      <WelcomeBack />
      <BagButton />
      <RodButton />
      <Later>
            <EditHud />
          </Later>
      <Joystick />
      <MenuPanel />
      <StartButton />
      <Later>
            <PhotoHud />
          </Later>
      <Later>
        <GolfHud />
      </Later>
    </>
  )
}
