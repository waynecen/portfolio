# Art pass: models to make

The models for roadmap item 69, made in [Tripo](https://www.tripo3d.ai/), each replacing a placeholder made of blocks. The placeholder stays as the stand-in while its model downloads, so the island works either way. Tick an item off once its `.glb` is in the game.

**The steps for each model**
1. Generate it with the style line below and its own prompt, then export a `.glb` **with lighting**, soft.
2. Save it as `models-src/<name>.glb`.
3. Run `npm run models <name>.glb`. It writes `public/models/<name>.glb`, compressed (meshopt geometry, WebP textures at 1024 px or less).
4. Wire it in:
   - **Room pieces:** add a line to `MODELS` in [Furniture.tsx](../src/game/house/Furniture.tsx). [PropModel.tsx](../src/game/house/PropModel.tsx) fits the model to the piece's width, can stretch it to the depth of its tiles, and adds a soft fill so its front isn't lost in shadow. One file can serve several pieces (the three pots).
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
- [ ] **`dresser.glb`** (3 × 1). The golf trophy stands on it, between its left and middle jars.
  > A long low wooden sideboard, three times as wide as it is deep, about waist height. Two rows of drawers with round wooden knobs and a slightly overhanging top. On top: three small amber glass jars with cork lids, evenly spaced.
- [x] **`table.glb`** (2 × 1). *In: `MODELS.table`, stretched to its blocks' footprint and height; its note is part of the model.*
  > A low rectangular wooden table, twice as wide as it is deep, with four sturdy square legs and a thick rounded top. A single folded paper note lies on top, slightly off centre.
- [x] **`stool.glb`** (1 × 1). *In: `MODELS.stool`, in front of the table.*
  > A round wooden stool with three short splayed legs and a thick cushioned seat in faded red linen with a button in the middle. Knee height.
- [ ] **`pot.glb`** (1 × 1, three in the room)
  > A large terracotta floor pot, wider at the top, with a rolled rim and a simple painted band around it. Empty, or with a little soil showing.
- [x] **`chest.glb`** (1 × 1, at the back of its tile). *In: `MODELS.chest`; the sword starts inside it.*
  > A small wooden storage chest with a domed lid, brass corner caps, a brass band around it and a chunky round brass latch on the front. Slightly chunky, toy-like proportions.
- [ ] **`rug.glb`** (3 × 2, flat)
  > A flat rectangular woven rug, one and a half times as wide as deep. Terracotta border, a mustard-gold field and a simple cream diamond motif in the centre. Very thin, lying perfectly flat, with short tassels on the two short ends.
- [ ] **`lamp.glb`** (1 × 1, sold in the shop). The shade glows at night (RoomLights.tsx), so ideally make it a separate part.
  > A Japanese paper floor lantern: a thin dark wooden stand on a round base, holding a cylindrical cream rice-paper shade with a thin wooden frame. The shade glows softly as if lit from inside. Waist to chest height.
- [ ] **`plant.glb`** (1 × 1, sold in the shop)
  > A leafy fern in a small round clay pot, with fronds arching out evenly on all sides. Fresh green leaves, about knee height.
- [ ] **`shelf.glb`** (1 × 1, sold in the shop)
  > A narrow, tall wooden bookshelf with three shelves of chunky books in soft red, blue, mustard, green and purple. A few books lean over, and there's a tiny plant on the top shelf.
- [ ] **`lantern.glb`** (the paper lantern hanging from the ceiling, RoomLights.tsx; seen from above)
  > A round Japanese paper ceiling lantern, cream rice paper over a thin bamboo frame, with a short dark cord at the top. Glowing softly from inside.
- [x] **`recordPlayer.glb`** (1 × 1). *In: RecordPlayer.tsx.*

### New pieces for the room or the shop
Each needs an entry in `PIECES` and `DEFAULT` (or a price) in room.ts, as well as its model.

- [ ] **`chair.glb`** (1 × 1)
  > A small wooden dining chair with a rounded back made of three vertical slats, a woven rush seat and slightly splayed legs. Honey wood, chunky and friendly.
- [ ] **`armchair.glb`** (1 × 1)
  > A small, squashy armchair upholstered in sage-green fabric, with fat rounded arms, a plump seat cushion and short wooden feet. A knitted cream throw blanket is draped over one arm.
- [ ] **`fireplace.glb`** (2 × 1, against a wall). Make the flames a separate part, so the game can flicker them and light the room from them.
  > A cosy stone hearth fireplace with rounded river-stone masonry in warm greys, a thick wooden mantel beam on top and an arched opening. Inside, small logs with soft orange flames and glowing embers. On the mantel: a candle and a tiny framed picture. The back is flat so it sits against a wall.
- [ ] **`sidetable.glb`** (1 × 1)
  > A small round wooden side table on a single turned pedestal leg, with a cup of tea on a saucer and a stack of two books on top.
- [ ] **`zabuton.glb`** (1 × 1, flat)
  > A square Japanese floor cushion (zabuton) in indigo fabric with a small white tied tassel at the centre. Plump but low, lying flat.
- [ ] **`kotatsu.glb`** (2 × 2)
  > A low square kotatsu table with a thick quilted futon blanket in a red and cream pattern draped over all four sides to the floor, a square wooden top, and a bowl of mandarin oranges in the middle.
- [ ] **`basket.glb`** (1 × 1)
  > A round woven wicker basket holding rolled-up blankets and a ball of yarn with knitting needles.
- [ ] **`clock.glb`** (on the wall)
  > A round wooden wall clock with a cream face, simple dark numerals, and a small pendulum in a little glass window below. Flat back.
- [ ] **`painting.glb`** (on the wall)
  > A small framed landscape painting in a chunky wooden frame showing a little island with a red-roofed house under a pale sky. Flat back.
- [ ] **`window.glb`** (on the wall)
  > A small wooden-framed window with four panes, cream curtains tied back at each side, and a window box of tiny flowers below. The panes show a soft blue sky. Flat back.
- [ ] **`candles.glb`** (small, for a table or the dresser)
  > A cluster of three cream pillar candles of different heights on a small wooden tray, with softly glowing flames.
- [ ] **`teaset.glb`** (small, for a table)
  > A small ceramic teapot with a bamboo handle, two little cups and a saucer on a wooden tray, in sage-green glaze.

---

## Outside

Outdoors the camera is further away, so shapes should read at a glance: bold silhouettes and few details.

### Trees and plants
Hundreds of these are drawn with instancing (Trees.tsx).
- **Shape:** keep them simple, with no texture if possible: flat colours, so the seasons can tint them.
- **Parts:** make the trunk and the foliage separate parts. The wind sways the leaves, autumn turns them, winter caps them with snow, and the forest turns see-through near the player.
- **Size:** about 1,500 triangles or fewer.

- [ ] **`pine.glb`**: the island's main tree.
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
- [ ] **`boat.glb`**
  > A small wooden rowing boat with two oars resting inside, painted in faded teal with a cream stripe.
- [ ] **`chest-islet.glb`**: a treasure chest.
  > A small pirate treasure chest with a domed lid, wooden planks with iron bands and a big keyhole, slightly open with a glint of gold inside.
- [ ] **`golf-flag.glb`**
  > A small golf flag on a thin white pole with a red triangular pennant.

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
