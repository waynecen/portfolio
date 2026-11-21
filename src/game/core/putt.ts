// The way core input reaches the mini golf (golf/golf.ts), which loads later: while the player is
// at the ball (store.ts: putting), the sword's press and release charge and hit the putt, and the
// use key or Escape steps away. golf.ts fills these in when it loads.

export const putter = {
  /** The sword's key or button went down: start charging. */
  press: () => {},
  /** ...and came up: putt with the power reached. */
  release: () => {},
  /** Step away from the ball. */
  leave: () => {},
}
