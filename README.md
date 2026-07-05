# Hinterland

A procedural **region-scale map generator** that bakes **socioeconomic structure**
into the worlds it generates, and exports **GeoJSON** for analysis in QGIS.
Client-side, one file, no build step, no backend.

- **Run it:** open `index.html` directly from disk — one file, fully
  self-contained (d3-delaunay is vendored inline; no network, ever) — or
  host it on GitHub Pages.
- **Design docs:** [`docs/attribute-model.md`](docs/attribute-model.md) — the
  attribute model, the causal/emergence map, and the build phasing.
- **The field guide:** [`docs/field-guide.md`](docs/field-guide.md) — **start
  here to analyze a world**: the eleven inequalities, which lens/column/finding
  shows each one, the experiment that isolates it, and the linkage table
  auditing that every mechanical feature feeds at least one measured
  inequality (the handful that don't are presentation, listed, on purpose).
- **The atlas:** [`docs/atlas.md`](docs/atlas.md) — a calibration sweep of 80
  worlds (schema v37) and the archetypal extremes it found — the world that
  closed its gap, the company country a region map lies about, the occupied
  realm, the town that freed itself — each one click away with its own
  chronicle line.

## Your first map

1. Open `index.html` (double-click works — one file, no server, no network).
2. Click **Generate** (or just reload) — you are looking at a realm: color =
   who bears the injustice.
3. Click any region — the inspector opens its full ledger.
4. Click **Download GeoJSON**, drag `hinterland.geojson` into QGIS, and color
   regions by `wealth`.
5. Everything else — every slider, lens, and export — is explained as you
   need it below.

## Six words you'll meet everywhere

| word | meaning |
|---|---|
| **aetherstone** | the ore. Wealth in the ground, set before society exists |
| **lumen** | magical power carried by the grid; what "electrified" means here |
| **the conduit** | the grid itself — trunk and branch lines the ledgers ration |
| **blight** | industrial spoil from refining, spread by wind and policy |
| **the seat** | the capital: every distance, toll, and writ is measured from it |
| **λ (dump bias)** | how hard refinery spoil is steered onto poor land (0 = physics only) |

## Contents

- [Your first map](#your-first-map)
- [Six words you'll meet everywhere](#six-words-youll-meet-everywhere)
- [Controls](#controls)
- [The QGIS bridge](#the-qgis-bridge)
- [Export schema (v2)](#export-schema-v2)

## Controls

Everything is driven by a **seed** — the same seed and knobs always produce the
byte-identical world, and the parameters live in the URL hash (copy a share link
to hand someone the exact map). Knobs: region count, Lloyd relaxation
(organic↔even), the **income mix** (weights for retained-extraction, refining,
trade, and the legacy capital-gradient — gradient 0 makes wealth fully emergent;
gradient 100 with the rest at 0 reproduces the old explicit diagram), gradient
steepness, and the capital position (click the map; unpinned, the seat settles
in fertile lowland). The preview-layer radio only changes the on-screen
choropleth; the export always carries every column.

## The QGIS bridge

1. **Load:** drag `hinterland.geojson` into QGIS (or *Layer → Add Vector Layer*).
   QGIS splits it by geometry: **regions** (polygons), one line layer holding
   the **conduit** and the **roads** (filter on `kind`), and one point layer
   holding **settlements**, **facilities**, and **sanctioned sites** (filter on
   `kind` / `facility_type`).
2. **CRS:** coordinates are a **flat plane, 0–1000 in fictional units** — not
   Earth. QGIS will assume WGS84; that is fine as long as you measure planar:
   either set *Project Properties → General → measurements* to planimetric, or
   assign any projected CRS to the layers and ignore the georeferencing.
3. **Choropleth:** regions layer → *Symbology → Graduated* → value `wealth`
   (or `aetherstone_endowment`, `pop_density`) → Natural Breaks (Jenks), 5 classes.
4. **Proportional symbols:** settlements layer → *Graduated* by **size** on
   `population` — or *Categorized* on `tier`.
5. **Skip steps 2-3:** [docs/qgis/](docs/qgis/) ships ready-made `.qml` styles,
   a flat `hinterland.prj` CRS (no WGS84 warning), and the join recipes for the
   six flat tables the **Download tables (CSV)** button exports (events, the
   per-epoch long table, rulers, tensions, treasuries, findings).

The 30+ per-phase QGIS checks — one per mechanic, from mountain walls to the
byname roll — moved to [CHANGELOG.md](CHANGELOG.md) so this page stays a front
door. Open the field guide (docs/field-guide.md) for how to READ inequality
from the columns; open the changelog for how each mechanic earned its place.

## Export schema (v2)

The FeatureCollection carries a top-level `hinterland` member with
`schema_version` and the exact generator parameters (seed, regions, relax, bias,
capital) — every file can reproduce its world.

**Region features (Polygon):**

| property | type | meaning |
|---|---|---|
| `region_id` | int | stable id within the file |
| `wealth` | 0–100 | **emergent** blend of retained-extraction, refining, and trade income + a dialable legacy gradient term |
| `is_capital_region` | 0/1 | region containing the prime settlement |
| `population` | int | settlement + rural population |
| `pop_density` | float | persons per 100×100 cell of the planar world |
| `aetherstone_endowment` | 0–100 | ore richness — blind geology, independent of every social layer |
| `terrain_ruggedness` | 0–100 | blind geology; feeds travel friction and refinery siting |
| `fertility` | 0–100 | blind geology; the unpinned seat settles where it is high |
| `centrality_to_seat` | 0–100 | inverted cost-distance from the seat over the ruggedness-weighted adjacency graph (seat = 100) |
| `refining_capacity` | 0–100 | 0 except the few refinery regions (sited by centrality + flat terrain, never by ore or wealth) |
| `value_retention` | 0–100 | share of locally-generated value that stays local — low on the mining-only frontier |
| `on_conduit` | 0/1 | wired to the lumen grid (trunk = refineries↔seat; branches only where population × wealth clears the threshold) |
| `conduit_access` | 0–100 | 100 when wired; decays with cost-distance off the wire (canister trade) |
| `arcane_service_index` | 0–100 | delivered metered magic — needs the grid AND the wealth to pay; **need is not an input** |
| `elevation` | 0–100 | blind geology; blight flows downhill |
| `blight_load` | 0–100 | refinery plumes (downwind/downhill physics) + spoil allocated by the dump-bias λ (nearest land at λ=0, poorest land at λ=1) |
| `injustice_idx` | 0–100 | presentation column: `blight × poverty` — the argument rests on the raw fields |
| `healing_reach` | 0–100 | decay over cost-distance to the nearest healer |
| `safe_water` | 0–100 | waterworks/conduit/wealth minus a blight penalty |
| `vulnerability_idx` | 0–100 | poverty + peripherality + tier |
| `burden_env_per_1k` etc. | rate | disease-burden cause components (environmental / waterborne / unmet), each averted by healing reach |
| `disease_burden_per_1k` | rate | **emergent** total = the three components exactly; never painted |
| `service_gap_idx` | 0–100 | precomputed coverage gap: inverse reach + facility distance + off-grid |
| `temple_reach` | 0–100 | decay from sanctioned sites (Temple presence) |
| `magnate_reach` | 0–100 | decay from the refineries (magnate presence) |
| `dominant_bloc` | enum | `crown` \| `temple` \| `magnate` \| `contested` \| `ungoverned` \| `dominion` — argmax of the three reach fields (crown reach = `centrality_to_seat`); close top-two → contested, all weak → ungoverned; X1: occupied ground always reads `dominion` (occupation overrides the domestic contest) |
| `market_access` | 0–100 | Hansen gravity index over road-network costs (max = 100) |
| `pilgrim_flux` | 0–100 | pilgrim through-traffic en route to the nearest sanctioned site |
| `force_projection` | 0–100 | decay from garrisons over cost-distance — how far the Crown can throw force |
| `wardline_strength` | 0–100 | strategic priority × lumen: off-grid darkness is near-defenseless |
| `security_status` | enum | `secured` \| `patrolled` \| `contested` \| `ungoverned`, thresholded on force projection (auditable) |
| `smuggling_intensity` | 0–100 | unretained ore value routed to the big markets *around* patrolled ground |
| `predation_risk` | 0–100 | traffic + pilgrims worth robbing × absence of protection |
| `black_market_index` | 0–100 | per-capita reliance on unsanctioned channels (≈ inverse of arcane services) |
| `enforcement_gap` | 0–100 | illicit pressure − state capacity — the lawless-hinterland column |
| `exhausted_lode` | 0/1 | blind geology: ore mined out long ago; feeds no income today |
| `founding_era` | enum | `relic_era` \| `first_settlement` \| `conduit_boom` \| `recent_frontier` (+ `founding_age` 0–100) |
| `legacy_advantage` | 0–100 | head starts compound: founding age × conduit × centrality |
| `shock_legacy` | enum | `refinery_collapse` \| `blight_plague` \| `relic_disaster` \| `war` \| `none` (+ `shock_severity`) |
| `abandonment_index` | 0–100 | past value − present wealth: the hysteresis gap (ghost country) |
| `tenure_churn` | 0–100 | how often a region changed hands — high on the bloc seams |
| `segregation_index` | 0–100 | the enclave signature: wealth standing above its neighbors, company districts |
| `mobility_ceiling` | 0–100 | chain-role × services × market access — ore-only frontier: born labor, die labor |
| `social_trust` / `kinship_reliance` | 0–100 | claiming the state vs routing around it — designed mirrors |
| `cultural_distance` | 0–100 | distance from the dominant culture (rises with peripherality + darkness) |
| `tenure_regime` | enum | `titled` \| `mixed` \| `customary` \| `contested` — whose land the registry recognizes |
| `legibility_gap` | 0–100 | how badly the census undercounts here — every per-capita rate is optimistic |
| `uncounted_population` | int | `population × gap/100 × 0.3` — add to `population` for corrected (worse) rates |
| `endowment_t0` / `wealth_t0` / `population_t0` | — | the founding state, for trajectory maps (`aetherstone_endowment` is the *current*, possibly depleted stock) |
| `peak_wealth` | 0–100 | high-water mark across the run — `abandonment_index` = 0.7 × (peak − present) + dead-lode bonus |
| `ore_depleted` | 0/1 | the mine died *during* the run (stock < 15 from a founding ≥ 40) |
| `boom_bust` | enum | `boom` \| `stable` \| `decline` \| `collapse` — the settlement's trajectory |
| `event_type` | enum | `none` \| `refinery_collapse` \| `blight_plague` \| `relic_calamity` \| `refinery_founded` \| `ore_strike` \| `war` \| `consecration` — lived history (latest event; full timeline in `hinterland.events`) |
| `event_epoch` / `event_severity` | int / 0–100 | when it struck (−1 = never) and how hard |
| `bloc_changes` | int | how many times this region's ruler actually changed during the run (feeds `tenure_churn`) |
| `range_shadow` | 0/1 | the straight line from this region's anchor to the seat crosses a mountain ridge — exactly recomputable from the exported ridge geometry |
| `is_pass` | 0/1 | this region holds a mountain pass (a `pass` point feature) |
| `on_river` / `river_id` / `river_pos` | 0/1, int, int | riverine membership and the drinking order (position 0 = source; −1 when off-river) |
| `downstream_blight` | int | the river-borne share of `blight_load` — exactly recomputable from the chain order (subtract it to get the pre-river field, re-run the 30%/0.75-decay carriage) |
| `temperature` | 0–100 | latitude gradient minus mountain lapse (blind climate) |
| `rainfall` | 0–100 | moisture marched in against the wind — dries with distance, rains out on windward slopes (the rain shadow) |
| `biome` | enum | `alpine` \| `badland` \| `moor` \| `marsh` \| `forest` \| `steppe` \| `grassland` — exactly recomputable from temperature/rainfall/elevation/river |
| `on_coast` | 0/1 | the region's cell touches a sea edge — exactly recomputable from the ring + `hinterland.sea_sides` |
| `is_port` | 0/1 | holds a harbor (a `port` point feature) — sited on geology alone: flat, low coast, river-mouth bonus |
| `sea_access` | 0–100 | exp-decayed cost-distance from the ports over the friction graph (ports = 100) — the realm's second geographic pole; feeds the trade income stream (0.65 centrality + 0.35 sea access) |
| `delver_flux` | 0–100 | poverty-weighted through-traffic to the nearest relic ruin (risk is a wage) — routed like the pilgrims |
| `has_bridge` | 0/1 | a riverine region whose banks carry a bridge; all other river banks are fords (×2.2 to cross) |
| `has_tower` | 0/1 | an apostate tower stands here (see `tower` features) |
| `toll_burden` | 0–100 | the sum of levies at HELD gates (bridges/passes/ports, `held_by ≠ none`) along this region's least-cost paths to the seat (+15 each) and to its port (+10 each) — dragged from wealth each epoch, banked by the gate town |
| `elite_share` | 8–92 | H1: the owners' row's slice of this region's coin. Founded on structure — 24 + 0.32·refining + 0.12·`endowment_t0` + court bonus (prime 8 / hub 4), exactly recomputable at ep=0 — then moved by history with no new dice: each epoch the rents concentrate (+0.75 per 2-coin gate rent, +0.8 live works, +0.5 live seams) and the granary's bread levels (−0.6·bread); shocks: plague −8, won revolt −25, crushed revolt +10, war +5, works founded/collapsed +12/−10, seized gate +3 |
| `elite_pop_pct` | 2–8 | H1, DERIVED (exactly recomputable): the owners' headcount — 2 + tier (prime 3 / hub 2) + works 2 + harbor 1 |
| `class_gap` | ratio | H1, DERIVED (exactly recomputable): owners' coin per owner over labor's coin per laborer — (`elite_share`/`elite_pop_pct`) / ((100−`elite_share`)/(100−`elite_pop_pct`)), 1 decimal |
| `is_skyport` | 0/1 | S1: an aerie of the skyway stands here (see `skyport` features) — chartered at the founding where flight beats the ground by the most, weighted by the value worth moving (0.5·`wealth_t0` + 0.3·`endowment_t0` + 0.2·refining) |
| `seat_cost_ground` | cost | S1: least-cost distance to the seat over the friction graph (ridge ×4.5, ford ×2.2, pass ×1.4) — what the labor row pays, 1 decimal |
| `seat_cost_sky` | cost | S1: the same trip if you may board — walk to the nearest aerie, then fly (35 + 0.3·euclidean, no terrain below matters); never exceeds the ground cost, 1 decimal |
| `sky_advantage` | 0–100 | S1, DERIVED (exactly recomputable): the share of your distance to the seat the lanes abolish — max(0, round(100·(1 − `seat_cost_sky`/`seat_cost_ground`))) — IF you may board, and boarding is an owners' privilege |
| `occupied` | 0/1 | X1: the Dominion holds this ground (a cost-ball around the foothold, fixed at annexation). `0` with `occupied_epoch ≥ 1` = once occupied, freed by a won rising |
| `occupied_epoch` | int | X1: the epoch the Dominion took this region (−1 = never) — the scar stays after a liberation |
| `tribute_burden` | 0–3 | X1, DERIVED (exactly recomputable): the per-epoch tribute rate at the record's close — occupied 3 (assessed at the quay); free realm pays the Crown's assessment: crown-bloc 1, everyone else 2; 0 where the Dominion never came |

**Settlement features (Point):**

| property | type | meaning |
|---|---|---|
| `name` | string | Toponym grown from the world (E6): a Markov-walked base word (order-2 chain over invented corpora) plus qualifying parts SELECTED BY THE REGION'S GEOLOGY — a river-mouth town earns "-mouth", ore country a "Delf", the high country "High —"/"Tor"/"Fell", the fens a "Fen", forest a "holt", rugged ground a "hold", a riverside its "-on-<river>"; roughly half keep the plain base word. Unique per world, byte-stable across every society knob and capital move (the grammar reads geology only) |
| `epithet` | string\|null | E6, DERIVED (exactly recomputable from the exported columns + events): the byname history left — `the Yoked` (occupied) / `the Unyoked` (freed) / `the Free` (won its rising) / `the Gilded` (elite_share ≥ 80) / `the Ashen` (blight_load ≥ 80) / `the Hollow` (collapse) / `the Mourning` (plagued) / `the Rising` (boom & wealth ≥ 60); first match wins, most towns never earn one. Society flavors the BYNAME, never the place name |
| `name_register` | enum | `lowland` \| `frontier` — the register the place names itself in, read from blind geology (`endowment_t0` ≥ 50 or ruggedness ≥ 60 → frontier) |
| `tier` | enum | `prime` \| `hub` \| `outpost` \| `holdfast` — a LABEL for the outcome (Z1): the seat is prime by office, the rest rank by grown size (top 20% hub, next 40% outpost); exactly recomputable from the exported populations |
| `region_id` | int | containing region |
| `population` | int | settlement population — GROWN by the founding centuries (Z1): compound growth on land quality + road migration toward the bigger market; rank-size law emergent (`findings.zipf`) |
| `wealth` | 0–100 | its region's wealth |
| `on_conduit` | 0/1 | mirrors its region |
| `arcane_service_index` | 0–100 | mirrors its region |
| `nearest_facility_distance` | cost-dist | to the closest facility of any type |
| `nearest_healer_dist` | cost-dist | to the closest healer (0 if one is local) |
| `disease_burden_per_1k` / `service_gap_idx` | rate / 0–100 | mirror their region |

**Conduit features (LineString):** `edge_class` (`trunk` \| `branch`),
`from_region`, `to_region`.

**Skyport features (Point):** `region_id`, `skyport_name` (the town's name +
"Aerie"). **Skylane features (LineString):** `skyway_name`, `from_region`,
`to_region`, `fly_cost`. The provenance carries `hinterland.skyway` — the
lane's name (walked in the court's own register) and the chartered ports.
A lane between every pair of aeries; flight ignores every ground
multiplier. The road below is for everyone; the sky is not.

**Facility features (Point):** `facility_type` (`healer` \| `waterworks` \|
`wardstation`), `region_id`. Rationed by the planner's rule: prime always;
hubs only when on-conduit; wardstations additionally guard refinery regions.

**Sanctioned-site features (Point):** `region_id`, `site_name` (a liturgical dedication in the Temple's own register). Temple holy places, planted
where the sacred substance lies and the Crown's writ is thin (remote ore, deep
periphery); the source points of `temple_reach`. The set can GROW mid-run: the
Temple consecrates the ground of the run's first wound (see `consecration` in
the event timeline), and reach, pilgrims, and blocs follow the live set.

**Ridge features (LineString):** `ridge_id`, `ridge_name` (frontier register),
`ridge_kind` (`Teeth` \| `Spine` \| `Range` \| `Hills` — recomputable from
`max_elev` and the endpoint span: ≥86 Teeth, span ≥520 Spine, ≥68 Range),
`max_elev`.
Mountain ranges drawn in the blind-geology stage: they raise ruggedness and
elevation in a band and act as walls in the cost graph (×4.5 edge friction to
cross, except at the passes). Sliders and capital moves never move them.

**Pass features (Point):** `ridge_id`, `region_id`, `pass_name` (its own
markov word + a kind read from the crossing's height: `Stair` ≥92, `Pass` ≥75,
`Gap` below — thresholds pinned to the measured elevation quartiles),
`pass_elev`, `held_by`. The 1–2 low gaps per ridge where crossing costs ×1.4
instead — the chokepoints where wall-crossing traffic concentrates.

**River features (LineString):** `river_id`, `river_name` (lowland register),
`river_kind` (`Beck` ≤3 regions \| `Brook` ≤5 \| `River` — recomputable from
the coordinate count).
Traced in the blind-geology stage: a gentlest-descent walk from high interior
ground (usually the ridge flanks) to the border; the coordinate order IS the
downstream order, running through the settlement anchors of its regions.
River edges cost ×0.6 (barge transport); where a river crosses a ridge it
cuts a pass-grade gorge; floodplains gain fertility, so the seat is drawn to
the water — emergent, never authored.

**Sea features (Polygon):** `sea_id`, `sea_name` (named by area: "<X> Sea"
for the great waters, "Gulf of <X>" / "<X> Deep" for the lesser), `sea_level`. The water itself: an
irregular coastline flooded from the per-world sea level over the elevation
surface (marching squares). `on_coast` means the region's cell touches it.

**Contour features (MultiLineString):** `level`. Elevation contours of the
continuous surface (the lowest level is the shoreline).

**Coast features (LineString):** `side`. The 1–2 adjacent box edges the
world's geology chose as ocean direction (also in `hinterland.sea_sides`).

**Port features (Point):** `region_id`, `port_name` (its town's name +
"Harbor" — except a Haven- or Strand-named town, which IS its harbor),
`held_by`.

**The places between (L1).** Four location types that pull on the model,
each exported as a point feature and a region column:
- **Freeport** (`kind: "freeport"`, `is_freeport`): the harbor beyond the
  writ, founded on the farthest workable coast from the seat (never a
  chartered port, never in the maelstrom's turning; present in ~75% of
  coastal worlds). Its trade enters no ledger — official `sea_access`
  cannot see it — but the smugglers ROUTE to its quay (it is a sink in
  the smuggler flow), and its ground keeps what the gates would have
  taken (`value_retention` +10 at the founding, before the income
  streams run — an offset against the drained periphery it stands on,
  not a bonus over the core). Sealed quays (`hb=0`) do not close it,
  and it refuses the Dominion's charter: every P2/X1 invariant holds.
- **Stillair** (`stillair` column, one named tract): ground where the
  lift-stones die — pure geology (byte-stable across every knob and
  capital move; ~half of worlds). No aerie can be chartered there; if
  the seat itself sits in the still, no skyway flies at all. The sky
  inequality gains a wall no money crosses.
- **High sanctuary** (`kind: "sanctuary"`, `has_sanctuary`): a refuge
  above the sanctioned faith, on high remote ground. A healer source
  the planner never rationed (it feeds `nearest_healer_dist` /
  `healing reach`), a pilgrim destination beside the sanctioned set,
  and a hole in the census: `legibility` +15 where `has_sanctuary`
  (exactly recomputable) — measured legibility ~96 at the refuge vs
  ~38 elsewhere.
- **Hunter camps** (`kind: "camp"`, `has_camp`): where predation is
  worth a bounty and the garrisons never come. Exactly recomputable
  from the column: `predation_risk` −18 on camp ground, −8 adjacent;
  `mobility` +4 (risk is a wage); black market +6 (trophies are
  fenced, not taxed). The sea's gates — the export chokepoints where whatever the mines
raise and the works refine leaves the country.

**Ruin features (Point):** `ruin_type` (`delve` \| `tomb` \| `deadhold`),
`region_id`, `peril`, `yield`, `ruin_name` (delves in the frontier register,
tombs and deadholds in the liturgical). The old world's structures, drawn
blind in the deep past — the first delve always digs the old workings (dead
lodes / ore country); a deadhold seeds a founding blight scar. Ruins feed
`delver_flux`, raise predation in their peril's reach, and fence their yield
through the black market.

**Bridge features (Point):** `river_id`, `region_id`, `bridge_name`,
`held_by`. The 1–2
chain towns per river whose banks carry a span; everywhere else reaching a
river town from dry land is a ford (×2.2).

**Tower features (Point):** `region_id`, `tower_name`. Apostate arcanists
squatting where governance and the grid both fail — sited on the founding
political map, not geology. Nearby: trust −12 (exactly recomputable,
euclidean 220 of the tower point), black market +12.

**Maelstrom feature (Point):** `side`, `maelstrom_name` (present in ~half of
worlds). A turning of the sea on one coast; port siting shuns its 180-unit
reach whenever any clear coast exists.

**Garrison features (Point):** `region_id`. Crown force anchors — the seat plus
the busiest corridors near the core; the source points of `force_projection`.

**Road features (LineString):** `road_class` (`highway` \| `road` \| `track`,
assigned by traffic rank), `road_name` (E6: the top three roads take names
from what they carry — `the <seat> Road`, `the Ore Road`, `the Salt Road`;
null on every other edge), `traffic` (0–100, gravity flows routed over
least-cost paths — the busy edges are the chokepoints), `from_region`,
`to_region`. The road network spans **every** settlement; only the conduit is
rationed.

**A second artifact — the epoch series** (`hinterland-epochs.geojson`): regions
and settlements repeated per epoch with `epoch` + `epoch_date` fields (25
fictional years per epoch), conduit edges stamped with the epoch they were
built, roads from the founding. Built for the QGIS Temporal Controller; the
last frame is exactly the main export, frame 0 is the founding.

**A third artifact — the chronicle** (`hinterland-chronicle.md`): the same
world, narrated. A deterministic written history composed from the facts the
export carries — the founding (seat, works, shrines, the off-grid count), the
event timeline told in order with dates and *the causal chains told as
chains* (a war that followed a contested strike is narrated against it; a
consecration names the wound it answers and the shrine's dedication), and
the state of the realm at the record's close. Same seed, same story, same
words — the on-page panel under the map shows exactly the downloadable text.
Drop it beside the QGIS map as the qualitative companion: every name in the
prose is a feature in the layers.

Full schema history: see [CHANGELOG.md](CHANGELOG.md).
