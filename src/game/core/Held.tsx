import { useEffect, type ReactNode } from 'react'
import { holding } from './modelsIn'

// Holding the loader up until the models are in. A model's stand-in (the blocks, the pill) is
// wrapped in <Held> as its Suspense fallback: while any is on screen, a model is still loading, and
// whenModelsIn() (modelsIn.ts) waits. Game.tsx waits on it before telling main.tsx to lift the loader, so the
// stand-ins are never seen being swapped out, unless loading takes longer than MAX_WAIT.

/** A Suspense fallback that holds the loader up while it's showing. */
export function Held({ children }: { children: ReactNode }) {
  useEffect(() => {
    holding.count++
    return () => {
      holding.count--
    }
  }, [])
  return <>{children}</>
}
