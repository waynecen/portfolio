import { useFrame, type RenderCallback } from '@react-three/fiber'
import { useGame, type Scene } from './store'

/**
 * useFrame for something drawn in one area only: the callback is skipped while another area is on
 * show (scene.ts), since its group is hidden then. Only for visual work; anything that must keep
 * going in the background (a puzzle resetting, a timer) uses useFrame.
 */
export function useSceneFrame(scene: Scene, callback: RenderCallback, priority?: number) {
  useFrame((state, delta, frame) => {
    if (useGame.getState().scene === scene) callback(state, delta, frame)
  }, priority)
}
