import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { keyName } from './keymap'
import { camera, download, leavePhoto, nextPose, POSES, shoot, usePhoto, zoomBy } from './photo'
import { isTouch } from './quality'
import { secretOn } from './secrets'
import { useGame } from './store'

// Photo mode's buttons (photo.ts), along the bottom of the screen, with the rest of the HUD hidden
// (style.css: body[data-photo]). PhotoCapture, inside the canvas, renders a fresh frame and saves it.

export function PhotoHud() {
  const on = useGame((s) => s.photo)
  const pose = usePhoto((s) => s.pose)
  const flash = useRef<HTMLDivElement>(null)

  // Focus stays on the game, so Space takes the photo; Tab reaches the buttons.
  useEffect(() => {
    document.body.toggleAttribute('data-photo', on)
  }, [on])

  // The shutter: a quick white flash over the screen once the picture's taken.
  useEffect(() => {
    camera.flash = () => flash.current?.animate([{ opacity: 0.8 }, { opacity: 0 }], { duration: 260, easing: 'ease-out' })
    return () => {
      camera.flash = () => {}
    }
  }, [])

  return (
    <>
      <div ref={flash} className="photo-flash" aria-hidden="true" />
      {on && (
        <div className="photo-hud" role="region" aria-label="Photo mode">
          <p className="photo-help">
            {isTouch
              ? 'Use the stick to frame the shot.'
              : `${[keyName('forward'), keyName('left'), keyName('back'), keyName('right')].join('')} to frame it · Q and E or the wheel to zoom · 1 to ${POSES.length} to pose`}
          </p>
          <div className="photo-buttons">
            <button type="button" onClick={nextPose}>
              {POSES[pose].label}
            </button>
            <button type="button" aria-label="Zoom in" onClick={() => zoomBy(-1)}>
              +
            </button>
            <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1)}>
              −
            </button>
            <button type="button" className="photo-shutter" onClick={shoot}>
              Take photo{isTouch ? '' : ' (Space)'}
            </button>
            <button type="button" onClick={leavePhoto}>
              Done{isTouch ? '' : ` (${keyName('photo')})`}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/** Inside the canvas: gives photo.ts a way to render a frame and save it, and the wheel to zoom. */
export function PhotoCapture() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const cam = useThree((s) => s.camera)
  useEffect(() => {
    // Render right before reading, so the picture is there even though the drawing buffer isn't kept.
    camera.capture = () => {
      gl.render(scene, cam)
      download(gl.domElement, secretOn('mono'))
    }
    const onWheel = (e: WheelEvent) => {
      if (!useGame.getState().photo) return
      e.preventDefault()
      zoomBy(Math.sign(e.deltaY))
    }
    const el = gl.domElement
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      camera.capture = () => {}
      el.removeEventListener('wheel', onWheel)
    }
  }, [gl, scene, cam])
  return null
}
