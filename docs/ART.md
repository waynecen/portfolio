# Art pass: models to make

The models for roadmap item 69, made in [Tripo](https://www.tripo3d.ai/), each replacing a placeholder made of blocks. The placeholder stays as the stand-in while its model downloads, so the island works either way. Tick an item off once its `.glb` is in the game.

**The steps for each model**
1. Generate it with the style line below and its own prompt, then export a `.glb` **with lighting**, soft.
2. Save it as `models-src/<name>.glb`.
3. Run `npm run models <name>.glb`. It writes `public/models/<name>.glb`, compressed (meshopt geometry, WebP textures at 1024 px or less).
4. Wire it in:
   - **Room pieces:** add a line to `MODELS` in [Furniture.tsx](../src/game/house/Furniture.tsx). [PropModel.tsx](../src/game/house/PropModel.tsx) fits the model to the piece's width, can stretch it to the depth of its tiles, lays a model made standing up down flat (`flat`), and adds a soft fill so its front isn't lost in shadow (`fill` for more, which makes pale parts glow). One file can serve several pieces (the two pots).
   - **Outdoor items:** each needs its own small loader. PropModel works outdoors too, with `scene="world"` (the house does this).

**Budget for each prop**
- File size: about 150 KB or less. The bed is 113 KB, the table 132 KB.
- Triangles: 5,000 or fewer for a piece of furniture, and about 1,500 or fewer for anything drawn many times (trees, bushes, flowers, rocks).
- Generation: one object per model, with nothing else in the scene.

**Style line (paste before every prompt):**
> Cosy stylised low-poly game prop, Animal Crossing–like, soft rounded edges, chunky simple shapes, hand-painted warm textures, muted natural palette (honey wood, cream linen, terracotta, sage green), soft even studio lighting, no harsh shadows or speculars, single object centred on a plain background, front view, flat base, no floor or scene.

---

## The room

The sizes are in floor tiles (1 tile = 1 unit), across × deep. The back of a piece faces −z, the wall it stands against.

- [x] **`bed.glb`** (1 × 2). *In: `MODELS.bed`, lengthened to fill its two tiles.*
  > A small single bed with a low honey-wood frame and a rounded headboard, a thick cream mattress, a puffy sky-blue quilt folded back at the top, and one plump white pillow. Short stubby legs. About twice as long as it is wide, knee height apart from the headboard.
- [x] **`table.glb`** (2 × 1). *In: `MODELS.table`, stretched to its blocks' footprint and height; its note is part of the model.*
  > A low rectangular wooden table, twice as wide as it is deep, with four sturdy square legs and a thick rounded top. A single folded paper note lies on top, slightly off centre.
- [x] **`stool.glb`** (1 × 1). *In: `MODELS.stool`, in front of the table.*
  > A round wooden stool with three short splayed legs and a thick cushioned seat in faded red linen with a button in the middle. Knee height.
- [ ] **`pot.glb`** (1 × 1, one in the room, down the left wall)
  > A large terracotta floor pot, wider at the top, with a rolled rim and a simple painted band around it. Empty, or with a little soil showing.
- [x] **`chest.glb`** (1 × 1, at the back of its tile). *In: `MODELS.chest`; the sword starts inside it.*
  > A small wooden storage chest with a domed lid, brass corner caps, a brass band around it and a chunky round brass latch on the front. Slightly chunky, toy-like proportions.
- [x] **`rug.glb`** (3 × 2, flat). *In: `MODELS.rug`, laid flat (`flat`: Tripo made it standing up) and stretched to its blocks' footprint.*
- [x] **`lamp.glb`** (1 × 1, sold in the shop). *In: `MODELS.lamp`, 1.3 tall; a strong `fill` makes its paper shade glow, most at night.*
- [x] **`houseplant.glb`** (1 × 1, two in the room: left of the fireplace, and down the left wall). *In: `HOUSEPLANT_MODEL`, one model for both, 0.7 across, its own height (about 0.9).*
  > A tall leafy houseplant in a round terracotta pot with a rolled rim, broad glossy green leaves fanning up and out from the middle, a few of them split like a monstera's. About waist height, fuller at the top.
- [ ] **`plant.glb`** (1 × 1, sold in the shop)
  > A leafy fern in a small round clay pot, with fronds arching out evenly on all sides. Fresh green leaves, about knee height.
- [ ] **`shelf.glb`** (1 × 1, sold in the shop)
  > A narrow, tall wooden bookshelf with three shelves of chunky books in soft red, blue, mustard, green and purple. A few books lean over, and there's a tiny plant on the top shelf.
- [x] **`fireplace.glb`** (3 × 1, against the back wall). *In: `MODELS.fireplace`, stretched to its blocks' footprint and up to the top of the wall; the game's own flames flicker in its opening, and the golf trophy stands in the middle of its mantel.*
- [x] **`logs.glb`** (1 × 1, right of the fire). *In: `MODELS.logs`, 0.6 across, its own height.*
- [x] **`coatstand.glb`** (1 × 1, just right of the rug). *In: `MODELS.coatStand`, 0.76 across, its own height (1.55).*
  > A tall wooden coat stand on four short curved feet, with round-tipped pegs at the top. A red knitted scarf hangs from one peg and a straw sun hat sits on another.
- [x] **`kotatsu.glb`** (2 × 2, the right of the room). *In: `MODELS.kotatsu`, at its blocks' footprint and 0.88 tall.*
- [x] **`zabuton.glb`** (flat, one centred on each side of the kotatsu, as part of its piece). *In: `ZABUTON_MODEL`, one model for both cushions, 0.68 square and 0.16 tall; solid, so the player walks round them.*
- [x] **`basket.glb`** (1 × 1, the back left corner, left of the bed). *In: `MODELS.basket`, 0.62 across, its own height.*
  > A round woven wicker basket holding rolled-up blankets and a ball of yarn with knitting needles.
- [x] **`shiba.glb`** (Katsu, the house dog). *In: ShibaModel.tsx, 0.7 tall. Rigged with no clips, so its legs and tail bones are swung in code: a trot, and a wag that quickens after a pet.*
- [x] **`lantern.glb`** (the paper lantern hanging from the ceiling, RoomLights.tsx; seen from above). *In: `LANTERN_MODEL`, 0.55 across, hung from the cord; its paper glows at night and goes dark with the switch.*
  > A round Japanese paper ceiling lantern, cream rice paper over a thin bamboo frame, with a short dark cord at the top. Glowing softly from inside.
- [x] **`recordPlayer.glb`** (1 × 1). *In: RecordPlayer.tsx.*

### New pieces for the room or the shop
Each needs an entry in `PIECES` and `DEFAULT` (or a price) in room.ts, as well as its model.

- [ ] **`chair.glb`** (1 × 1)
  > A small wooden dining chair with a rounded back made of three vertical slats, a woven rush seat and slightly splayed legs. Honey wood, chunky and friendly.
- [ ] **`clock.glb`** (on the wall)
  > A round wooden wall clock with a cream face, simple dark numerals, and a small pendulum in a little glass window below. Flat back.
- [ ] **`painting.glb`** (on the wall)
  > A small framed landscape painting in a chunky wooden frame showing a little island with a red-roofed house under a pale sky. Flat back.
- [ ] **`window.glb`** (on the wall)
  > A small wooden-framed window with four panes, cream curtains tied back at each side, and a window box of tiny flowers below. The panes show a soft blue sky. Flat back.
- [ ] **`candles.glb`** (small, for a table or the mantel)
  > A cluster of three cream pillar candles of different heights on a small wooden tray, with softly glowing flames.
- [ ] **`teaset.glb`** (small, for a table)
  > A small ceramic teapot with a bamboo handle, two little cups and a saucer on a wooden tray, in sage-green glaze.

---

## Outside

Outdoors the camera is further away, so shapes should read at a glance: bold silhouettes and few details.

### Trees and plants
Hundreds of these are drawn with instancing (Trees.tsx).
- **Shape:** keep them simple, with no texture if possible: flat colours, so the seasons can tint them.
- **Parts:** make the trunk and the foliage separate parts. The wind sways the leaves, autumn turns them and winter caps them with snow.
- **Size:** about 1,500 triangles or fewer.

- [x] **`pine.glb`**: the island's main tree. *In: PineModel.tsx, every tree as one instanced mesh, stretched taller and narrower (`HEIGHT`, `WIDTH`); its foliage takes the season's colour.*
  > A stylised low-poly pine tree: a short chunky brown trunk and three stacked, slightly rounded cone tiers of deep green foliage, soft faceted shading, flat colours with no texture detail. Tall and narrow, about three times as tall as it is wide.
- [ ] **`pine-small.glb`**: a young pine, for variety.
  > A small young pine tree, two rounded cone tiers on a short trunk, the same flat low-poly style. Squat and cute.
- [ ] **`broadleaf.glb`**: for the meadows and the square.
  > A stylised low-poly round broadleaf tree: a short curved trunk and a fluffy cloud-like canopy made of three or four rounded clumps of leaves in fresh green. Flat colours, soft faceted shading.
- [ ] **`fruit-tree.glb`**: optional, something to shake for fruit later.
  > The same round broadleaf tree with a few bright orange fruits hanging in the canopy.
- [ ] **`palm.glb`**: for the islet's shore.
  > A stylised low-poly palm tree with a gently curved segmented trunk and six broad drooping fronds at the top, with two coconuts. Flat colours.
- [ ] **`bush.glb`**
  > A small rounded low-poly shrub made of three soft green clumps, knee height, flat colours.
- [ ] **`flowers.glb`**: a little clump, scattered in the grass.
  > A small clump of three or four simple daisies and tulips in white, pink and yellow, with a few green leaves. Tiny, ankle height, flat colours.
- [ ] **`stump.glb`**
  > A short cut tree stump with visible rings on top, a couple of roots spreading out and a tiny mushroom at its base.
- [ ] **`rock.glb`** and **`rock-small.glb`**
  > A smooth rounded low-poly boulder in warm grey, slightly mossy on top, with soft facets.

### Buildings and landmarks
- [x] **`house.glb`**: the player's house from outside (5 × 3 tiles; the front door is at the centre of the long side). *In: `MODEL` in House.tsx, over the footprint and eaves, a little lower than its own shape; its blue panes glow at night (house/windows.ts).*
  > A small cosy cottage, wider than deep: cream plaster walls, a warm red-orange tiled gable roof with slight overhangs, a wooden front door in the centre of the long side, a square window either side of it with blue panes, and a little doorstep. Chunky toy-like proportions.
- [ ] **`shop.glb`**: Pip's market stall.
  > A small wooden market stall with a red-and-white striped awning, a wooden counter at the front with a few baskets of fruit and goods, and a hand-painted sign board on top.
- [ ] **`mailbox.glb`**: the contact point.
  > A cute rounded blue mailbox on a short wooden post, with a little red flag raised on the side and a slot in the front.
- [ ] **`sign.glb`**: the About sign.
  > A wooden signboard on two posts with a blank cream panel, slightly rustic, knee to waist height.
- [ ] **`signpost.glb`**: the signposts at the crossroads.
  > A wooden signpost with three arrow-shaped boards pointing in different directions on a single post. The boards are blank.
- [ ] **`noticeboard.glb`**: in the square.
  > A small wooden notice board with a little pitched roof, a cork panel, and a few paper notes pinned to it.
- [ ] **`fountain.glb`**: in the middle of the square.
  > A round stone fountain with a wide shallow basin, a central pillar with a small bowl on top, and water spilling from it. Pale stone.
- [ ] **`bench.glb`**
  > A wooden park bench with a slatted seat and back on dark iron legs.
- [ ] **`lamppost.glb`**
  > A dark iron lamp post with a lantern-style lamp on top that glows warm yellow. Twice the height of a person.
- [ ] **`station.glb`**: a project's stone pedestal. Later, one small diorama for each project.
  > A low round stone pedestal with a carved rim, with a flat top where a small object sits. Mossy at the base.

### The dock, the sea and the islet
- [ ] **`dock.glb`**
  > A short wooden fishing pier on posts, with weathered planks, rope coiled on one post, and a small lantern.
- [ ] **`boat.glb`**: the rowing boats at the dock and on the islet (IsletScene.tsx), about 2.5 times as long as wide. Empty: the game lays the oars in (`oar.glb`), one or two.
  > A small wooden rowing boat, empty inside, with a plank bench across the middle, painted in faded teal with a cream stripe along the top edge. Seen from above, long and narrow, flat-bottomed.
- [ ] **`oar.glb`**: in the boats, and found in the cave.
  > A single wooden rowing oar, pale honey wood, a long round shaft and a flat rounded blade, with a dark worn grip at the end.
- [ ] **`barrel.glb`**: the barrel of fishing rods at the foot of the dock (Dock.tsx).
  > A small wooden barrel with dark iron hoops, open at the top, with three bamboo fishing rods standing up in it, leaning slightly apart.
- [ ] **`carved-sign.glb`**: on the islet (IsletScene.tsx).
  > A small weathered wooden sign on a single post, the board carved with a simple wavy line, a little crooked, with moss at the foot of the post.
- [ ] **`bottle.glb`**: today's message bottle on the shore (DailyFinds.tsx).
  > A small green glass bottle lying on its side with a cork stopper and a rolled paper message visible inside, tied with a bit of string.
- [ ] **`dig-spot.glb`**: today's dig spot in the grass (DailyFinds.tsx). Flat and low.
  > A small mound of loose brown soil with a few pebbles and a little wooden marker stick poking out, low and round, on no base.
- [ ] **`chest-islet.glb`**: a treasure chest.
  > A small pirate treasure chest with a domed lid, wooden planks with iron bands and a big keyhole, slightly open with a glint of gold inside.
- [ ] **`golf-flag.glb`**
  > A small golf flag on a thin white pole with a red triangular pennant.

### Around the island
- [ ] **`clay-pot.glb`**: the pots by the house and the dock that the sword breaks (Pots in combat/Grass.tsx). Small, under knee height.
  > A small round clay pot with a narrow neck and a rolled lip, plain terracotta with a cream painted zigzag band, slightly squat.
- [ ] **`grass-tuft.glb`**: the tall grass the sword cuts (Grass.tsx), drawn many times: keep it under 300 triangles.
  > A small clump of tall grass blades, a few thick flat blades fanning out from one point, fresh green, darker at the base, stylised and chunky.
- [ ] **`leaf-pile.glb`**: the autumn leaf piles (ui/Leaves.tsx), low and wide.
  > A low, loose heap of autumn leaves in orange, red and yellow, a few leaves scattered at its edges.

### The cave
Seen from above in rooms of stone tiles (CaveRooms.tsx). Rock and torchlight colours.
- [ ] **`torch.glb`**: on the back walls.
  > A wall-mounted iron torch bracket holding a short wooden torch with a stylised orange flame, the bracket fixed to a small square plate.
- [ ] **`push-block.glb`**: the blocks pushed onto switches. A cube, one tile across.
  > A heavy square stone block with bevelled edges and a carved spiral on its top, grey-blue stone with a little moss in the cracks.
- [ ] **`cave-chest.glb`**: the cave's chests, small and big. Its lid opens, so make the lid a separate part if Tripo allows.
  > A sturdy dark wooden chest with a flat lid, thick iron bands and corner caps, and a round iron ring as a handle on the front.
- [ ] **`tablet.glb`**: the stone tablets with words on them.
  > An upright stone tablet with a rounded top, standing on a small base, with faint carved lines of runes on its face, mossy at the bottom.
- [ ] **`gate-bars.glb`**: the bars that shut a doorway, one tile wide.
  > A row of thick dark iron bars set in a stone frame, the bars joined by one cross band near the top, sized for a doorway.
- [ ] **`locked-door.glb`**: the cave's locked door, opened by the brass key.
  > A heavy arched wooden door with iron studs and straps and a big brass lock plate with a keyhole, set in a rough stone frame.
- [ ] **`heart-container.glb`**: the prize that adds a heart.
  > A glossy red heart inside a little crystal-clear casing, sitting on a small round gold stand, softly glowing.
- [ ] **`hoard.glb`**: the treasure at the end.
  > A small heap of gold coins with a few red and blue gems and a little gold goblet poking out of it.

### Festive (only on a few days a year: Festive.tsx)
- [ ] **`pumpkin.glb`** (Halloween)
  > A round orange pumpkin with deep ribs, a short curly green stem and one leaf, carved with a friendly smiling face.
- [ ] **`present.glb`** (Christmas): plain coloured, so the game can tint each one.
  > A square gift box wrapped in plain white paper with a contrasting ribbon tied in a big bow on top.
- [ ] **`balloon.glb`** (the island's birthday): plain coloured, tinted by the game.
  > A single round party balloon in plain white with a small knot at the bottom and a short curly string.

### Villagers and creatures
These need rigs or simple animation. Use Tripo's animation step, as for the player (see [CHARACTER.md](./CHARACTER.md)).
- [ ] **`frog.glb`**: Bramble.
  > A cute chibi frog villager standing upright, green, with big round eyes on top of its head, a small smile and a little brown satchel.
- [ ] **`rabbit.glb`**: Mochi.
  > A cute chibi rabbit villager standing upright, cream white, with long ears and rosy cheeks, wearing a small knitted scarf.
- [ ] **`hedgehog.glb`**: Pip, the shopkeeper.
  > A cute chibi hedgehog shopkeeper standing upright, with brown spines, a cream face and a small green apron.
- [ ] **`slime.glb`**
  > A small round green jelly slime, glossy and slightly translucent, with two dot eyes and a little smile.

### Small things
These are picked up or caught, and shown in the hand or the bag.
- [ ] **`fish.glb`**: one neutral fish, tinted for each kind.
  > A simple stylised fish, side-on silhouette, rounded body, with plain neutral silver colouring.
- [ ] **`shell.glb`**
  > A small scallop seashell in pale peach.
- [ ] **`pearl.glb`**
  > A single round pearl in a small open clam shell.
- [ ] **`butterfly.glb`**
  > A simple stylised butterfly with flat, neutral white wings, wings open.
- [ ] **`rod.glb`**
  > A simple bamboo fishing rod with a small reel and a red and white float on the line.
- [ ] **`sword.glb`**
  > A small chunky toy-like wooden practice sword with a leather-wrapped grip.
- [ ] **`heart.glb`**: the hearts slimes and pots drop (GroundDrops.tsx).
  > A chunky glossy red heart, puffy and rounded, like a toy.
- [ ] **`star.glb`**: the trinkets tucked round the island (Trinkets.tsx).
  > A small chunky five-pointed star with rounded points, soft gold, slightly puffy.
- [ ] **`sea-glass.glb`**: found in the grass (Pickups.tsx, inventory.ts), like the four below.
  > A smooth rounded pebble of frosted sea-green glass.
- [ ] **`pine-cone.glb`**
  > A small brown pine cone with chunky open scales.
- [ ] **`coin.glb`**: the old coin.
  > An old worn gold coin, thick, with a faint stamped face.
- [ ] **`feather.glb`**: the blue feather.
  > A single soft blue feather with a slight curve.
- [ ] **`brass-key.glb`**: it opens the cave's locked door.
  > An old brass key with a round looped bow and a simple toothed bit.

### Hats (sold at Pip's shop: life/shop.ts; worn on the player's head, Hat.tsx)
- [ ] **`hat-straw.glb`**
  > A small round straw sun hat with a wide brim and a red ribbon band.
- [ ] **`hat-party.glb`**
  > A cone-shaped party hat in pink-red with white polka dots and a fluffy pompom on top.
- [ ] **`hat-beanie.glb`**
  > A blue knitted woolly beanie with a folded cuff and a fluffy pompom.
- [ ] **`hat-crown.glb`**
  > A small gold crown with five rounded points, each tipped with a tiny red gem.
