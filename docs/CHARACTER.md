# Making and adding the player character

How to replace the pill with a 3D character made in [Tripo](https://www.tripo3d.ai/). The game side is already built. Once the optimized file is in `public/models/`, one constant switches it on.

Until then, and while the model downloads on a visitor's device, the player is the pill. The model's code, including the glTF loader, is only fetched when a model is set, so the first view isn't affected either way.

## 1. Generate it in Tripo

Tripo's screens change often, so look for these options by name rather than position.

- **Start from an image.** Image-to-3D, from a front-view concept drawing of your own character, gives much more control than a text prompt alone.
- **Design for a top-down camera.** The camera sits 12 units up and 12 back, so the character is only a few hundred pixels tall:
  - a chibi build, with the head about a third of the height
  - a bold silhouette and a few large, flat colour areas
  - no fine detail, which disappears at this size
  - an original design, not someone else's character
- **Pose it for rigging.** An A-pose or T-pose, arms clear of the body, legs apart. Avoid capes, long loose hair, big skirts and held props: they bend badly when skinned. A sword or tool can be a separate model later.
- **Keep it light.**
  - Choose a low-poly or face-limit option of about **10–20k faces**, with textures on.
  - Choose a stylised or cartoon look over photoreal, so it sits well with the flat-shaded island.
- **Rig and animate.**
  - Use the **auto-rig** for a biped (humanoid).
  - Add the animation presets **idle**, **walk** and **run**.
  - For later phases, also add **attack**.
- **Export as GLB.** Include the skin (rig) and the animations.

If the rig or the animations disappoint, export the unrigged GLB instead, rig it with [Mixamo](https://www.mixamo.com/), download each animation as FBX "without skin", and combine them in Blender (step 2).

## 2. Clean it up in Blender (only if needed)

Skip this step if the GLB already looks right in the game. Otherwise:

- Face it toward **+Z**, with the feet at height 0 and the origin between the feet.
- Size doesn't matter: the game scales it to `PLAYER_HEIGHT`. Do **apply all transforms**, though (Object → Apply → All Transforms).
- Name the actions `Idle`, `Walk` and `Run` (and later `Attack`), or put Tripo's names in `CLIPS` instead (step 4).
- Delete unused bones, shape keys, extra materials and anything that isn't the character.
- Export as **glTF Binary (.glb)** with skinning and animations on.

## 3. Optimize it: `npm run models`

1. Put the raw file in `models-src/` as `player.glb`. That folder is gitignored, so raw exports never bloat the repository.
2. Run:

   ```sh
   npm run models               # every .glb in models-src/
   npm run models -- player.glb # just one
   ```

   [scripts/models.mjs](../scripts/models.mjs) first prepares the clips:
   - renames them by keyword to `Idle`, `Walk`, `Run` and `Attack` (Tripo names a clip after its motion prompt)
   - makes them play in place, by removing any forward travel baked into the hips bone (the game moves the player itself), and records how fast that travel was so the game can match the steps to the ground
   - makes them loop seamlessly: if the last pose doesn't match the first (Tripo's run was 83° off), it trims the clip to the stretch that loops best, then spreads what difference remains across the clip so the last frame equals the first

   Then it runs glTF Transform's `optimize` with these settings:
   - Meshopt compression for geometry and animation (its decoder is small and needs no WebAssembly transcoder)
   - textures converted to WebP and capped at 1024 px
   - deduplication, welding, light simplification and pruning

   It writes the result to `public/models/`, then prints its size, triangle count, bones and clips. To check any file again, run `npm run models:inspect -- public/models/player.glb`.
3. Check the report against the budget:

   | | Budget |
   |---|---|
   | File size | under about 1.5 MB |
   | Triangles | at most about 15k |
   | Materials | 1 (2 at most) |
   | Texture | 1024 × 1024 |
   | Bones | at most about 60 |

   If it's over, lower the face limit in Tripo and export again. That gives a better result than heavier simplification here.

## 4. Switch it on

In [src/game/player/models.ts](../src/game/player/models.ts):

```ts
export const PLAYER_MODEL: string | null = '/models/player.glb'
export const CLIPS = { idle: 'Idle', walk: 'Walk', run: 'Run' } // the clip names inside the file
```

Clip names are in the `npm run models` report. A missing clip is skipped: with no run clip, the walk plays faster when sprinting.

What the game does with the model ([ModelCharacter.tsx](../src/game/player/ModelCharacter.tsx)):

- **Size and position:** scales it to `PLAYER_HEIGHT` (1.2, about the pill's height) and stands it on the ground under the player. Collision stays the pill's circle.
- **Materials:** swaps them for the Lambert material the island uses, keeping their texture and colour, so it's lit like everything else, including at night.
- **Animation:** blends idle, walk and run by speed, and plays walk and run at the speed where the feet keep pace with the ground (from the pace `npm run models` records), so they don't skate.
- **Turning and leaning:** the rig in [PillCharacter.tsx](../src/game/player/PillCharacter.tsx) turns it to face its direction and leans it forward as it moves.

## 5. Check it

1. Run `npm run dev` and walk around: stand, walk and sprint (Shift), indoors and out.
2. Load `?hour=21` to see it at night.
3. Run the snapshot skill. `desktop-character.png` is a close-up of the player on the doorstep.
4. Commit `public/models/player.glb` and the change to models.ts together.

The pipeline was tested with three.js's CC0 robot character ([RobotExpressive](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/RobotExpressive)): it went from 453 KB to 179 KB, with clips `Idle`, `Walking` and `Running`.
