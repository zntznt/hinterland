# Hinterland

A procedural **region-scale map generator** that bakes **socioeconomic
mechanisms** into the worlds it generates, and exports **GeoJSON** for analysis
in QGIS. It is an **instrument, not an argument**: the same inequality lens is
how you *look*, but the verdict is the world's, not the code's. A realm can
close its gap or widen it, lift its floor or drop it, boom or collapse.
Client-side, no backend.

- **Run it:** host on GitHub Pages (source folder: `src/`). For local
  development, serve `src/` with any HTTP server (`npx serve src/`,
  `python3 -m http.server -d src/`). The engine is a pure ES module
  (`src/engine/engine.mjs`), imported directly by Node test tools.
- **Design docs:** [`docs/attribute-model.md`](docs/attribute-model.md): the
  attribute model, the causal/emergence map, the double-edged mechanisms, and
  the build phasing.
- **The field guide:** [`docs/field-guide.md`](docs/field-guide.md). **Start
  here to read a world**: the eleven inequalities as *lenses* (not verdicts),
  which lens/column/finding shows each one, the experiment that isolates it, and
  the linkage table auditing that every mechanical feature feeds at least one
  measured shape.
- **The old thesis:** [`docs/old-thesis.md`](docs/old-thesis.md). The honest
  essay: what the project once argued (*inequality is manufactured*), why the
  engine no longer presumes it, and where in the possibility space the
  extraction worlds still live.
- **The atlas:** [`docs/atlas.md`](docs/atlas.md). A calibration sweep of 80
  worlds (schema v54) and the archetypal extremes it found: the world that
  closed its gap, the concession coast that is developed *and* owned, the
  occupied realm, the town that freed itself. Each is one click away with its own
  chronicle line, and the **verdict space** they populate (gap × floor ×
  growth), no single story owning it.

## What this is (provenance)

This is an **AI-generated project**: all code and documentation were written by
Claude (Anthropic's AI), directed by a single author. It is a **fiction
generator and teaching instrument**, not an empirical model: it computes
statistics about imaginary worlds, has never been validated against real-world
data, and has not been peer-reviewed by any domain expert. Its mechanisms are
grounded, as far as such a project can be, in real, openly available social
science: [docs/grounding.md](docs/grounding.md) maps every mechanism to the
literature it draws on and states where it diverges;
[docs/provenance.md](docs/provenance.md) states exactly what the project's
"measurements" do and do not mean. Read those two pages before treating any
number this generator produces as a finding.

## Your first map

1. Open `index.html` (double-click works; one file, no server, no network).
2. Click **Generate** (or just reload). You are looking at a realm, colored by
   **`wealth`**: the neutral coin, not a verdict. Read the shape yourself.
3. Run the years: set **epochs** above 0 (the boot map is the founding snapshot,
   `ep=0`) and the dynamics play out. Ore depletes, the aetherworks learn, people
   migrate, the grid chases winners, empires press in. Whether the gap grows or
   closes is what you are there to find out.
4. Click any region. The inspector opens its full ledger.
5. Click **Download GeoJSON**, drag `hinterland.geojson` into QGIS, and color
   regions by `wealth`.
6. Everything else, every slider, lens, and export, is explained as you
   need it below.

## Six words you'll meet everywhere

| word | meaning |
|---|---|
| **aetherstone** | the ore. Wealth in the ground, set before society exists |
| **lumen** | magical power carried by the grid; what "electrified" means here |
| **the grid** | the lumen network itself: trunk and branch lines the ledgers ration |
| **the aetherworks** | the refining plant that turns aetherstone into lumen; the biggest value-capture chokepoint |
| **blight** | industrial spoil from refining, spread by wind and by the disposal doctrine |
| **the capital** | the center of the regional administration; every distance, tariff, and writ is measured from it |

The setting is an **arcane-industrial state**, a region under **imperial reach**:
a capital and its precincts, the aetherworks and the grid, the exchange and the
tariffs, the **constabulary**, and above them all an off-map **Dominion** whose
demands arrive as prices and dispatches. Under the modern layer lies the older
one: ruins, buried powers, the maelstrom, the **chthonic** ground the state
paves over and occasionally wakes.

## Contents

- [Your first map](#your-first-map)
- [Six words you'll meet everywhere](#six-words-youll-meet-everywhere)
- [Controls](#controls)
- [The QGIS bridge](#the-qgis-bridge)
- [Export schema (v54)](#export-schema-v54)

## Controls

Everything is driven by a **seed**. The same seed and knobs always produce the
byte-identical world, and the parameters live in the URL hash (copy a share link
to hand someone the exact map). Knobs: region count, Lloyd relaxation
(organic↔even), the **income mix** (weights for retained extraction, artifice,
trade, and the legacy capital-gradient; the four now anchor to *different*
geography, so a trade-heavy open coast can grow a second pole that rivals the
capital), the **grid threshold**, the **disposal doctrine** (`db`: disperse /
concentrate / treat, what the realm does with aetherworks spoil), the
**capital's ear** (`iq`: how readily it answers a wound with a mercy or an
imposition), the **order axis** (`order`: open ↔ police state), **openness**
(sealed ↔ open to foreign trade and reach), **epochs** (0 = the founding
snapshot; above 0 the dynamics run), and the capital position (click the map;
unpinned, the capital settles in fertile lowland). Off-default, `world=` keys the
**world outside**: the exogenous history (price, demand, attention, embargo)
the region consumes but cannot move. The preview-layer radio only changes the
on-screen choropleth; the export always carries every column.

## The QGIS bridge

1. **Load:** drag `hinterland.geojson` into QGIS (or *Layer → Add Vector Layer*).
   QGIS splits it by geometry: **regions** (polygons), one line layer holding
   the **grid** and the **roads** (filter on `kind`), and one point layer
   holding **settlements**, **facilities**, and **sanctioned sites** (filter on
   `kind` / `facility_type`).
2. **CRS:** coordinates are a **flat plane, 0–1600 × 0–1000 in fictional units,
   y-up**, not Earth. QGIS will assume WGS84; that is fine as long as you
   measure planar: either set *Project Properties → General → measurements* to
   planimetric, or assign any projected CRS to the layers and ignore the
   georeferencing.
3. **Choropleth:** regions layer → *Symbology → Graduated* → value `wealth`
   (or `aetherstone_endowment`, `pop_density`) → Natural Breaks (Jenks), 5 classes.
4. **Proportional symbols:** settlements layer → *Graduated* by **size** on
   `population`, or *Categorized* on `tier`.
5. **Skip steps 2-3:** [docs/qgis/](docs/qgis/) ships ready-made `.qml` styles
   (they bind only non-renamed fields, so the C1 re-skin left them untouched), a
   flat `hinterland.prj` CRS (no WGS84 warning), and the join recipes for the
   flat tables the **Download tables (CSV)** button exports (events, the
   per-epoch long table, rulers, tensions, treasuries, findings).

The 30+ per-phase QGIS checks, one per mechanic, from mountain walls to the
byname roll, live in [CHANGELOG.md](CHANGELOG.md) so this page stays a front
door. Open the field guide (docs/field-guide.md) for how to READ a world from
the columns; open the changelog for how each mechanic earned its place.

## Export schema (v54)

The FeatureCollection carries a top-level `hinterland` member with
`schema_version` and the exact generator parameters. Every file can reproduce
its world. Beyond seed / regions / relax / capital, the provenance now carries
the pivot's state: `world` (the outside-history key), the income `weights`,
`grid_threshold`, `dump_bias` + `disposal_doctrine` + `sacrifice_zone` (B4),
`responsiveness` (iq), `order` (B9), `openness` (B10), `reform_edges` (B7),
`powers` (the metropole + named rival, B11), `institutions` (exchange / gazette /
precinct / buried power), and `findings`, including the de-moralized
`findings.verdict` (this world's gap × floor × growth class) and
`findings.concessions` (imperial reach).

> **A note on the re-skin (v54).** The export vocabulary renamed once, cleanly,
> with no alias columns; old files stay readable under their old
> `schema_version`. Internal enum *data-keys* (event `refinery_collapse`, era
> `conduit_boom`, bloc `crown`/`temple`/`magnate`/`dominion`) stay stable and
> render in the new terms. The data is the anchor, the register is the skin.

**Region features (Polygon):**

| property | type | meaning |
|---|---|---|
| `region_id` | int | stable id within the file |
| `wealth` | 0–100 | **emergent** blend of retained extraction, artifice value-add, and trade income + a dialable legacy gradient term, scaled by the region's artifice index `A`. Total realm wealth is no longer conserved (a boom grows the pie, a trade war shrinks it) |
| `is_capital_region` | 0/1 | region containing the capital (the metropolis) |
| `population` | int | settlement + rural population |
| `pop_density` | float | persons per 100×100 cell of the planar world |
| `artifice_index` / `artifice_index_t0` | 0–100 | **B1** the growth channel: command of magically-enabled productivity (machinery, trained hands, licensed workings). Grows by investment, diffuses weakly to neighbors, decays without upkeep, crashes on war/collapse. `_t0` is the founding level, so "the exchange built here" (`A` rose) recomputes from the file |
| `emigrants_total` / `remittance_income` | int / 0–100 | **B3** migration's second edge: the metropole pulls the young off-map (hardest in poor grid towns), and the diaspora sends coin home: a floor decoupled from local production, not a fortune |
| `aetherstone_endowment` | 0–100 | ore richness: blind geology, independent of every social layer ("blind" means generated before society and untouched by society knobs; geology's own layers share ancestors, see docs/grounding.md §2) |
| `terrain_ruggedness` | 0–100 | blind geology; feeds travel friction and aetherworks siting |
| `fertility` | 0–100 | blind geology; the unpinned capital settles where it is high |
| `centrality_to_capital` | 0–100 | inverted cost-distance from the capital over the ruggedness-weighted adjacency graph (capital = 100) |
| `aetherworks_capacity` | 0–100 | 0 except the few aetherworks regions (sited by centrality + flat terrain, never by ore or wealth) |
| `value_retention` | 0–100 | share of locally-generated value that stays local. Low on the mining-only frontier; **B11** can turn part of it into a FOREIGN claim under a concession |
| `on_grid` | 0/1 | wired to the lumen grid (trunk = aetherworks↔capital; branches only where population × wealth clears the threshold) |
| `grid_access` | 0–100 | 100 when wired; decays with cost-distance off the wire (canister trade) |
| `arcane_service_index` | 0–100 | delivered metered magic. Needs the grid AND the wealth to pay; **need is not an input** |
| `elevation` | 0–100 | blind geology; blight flows downhill |
| `blight_load` | 0–100 | aetherworks plumes (downwind/downhill physics) + spoil placed by the **disposal doctrine** (B4): *disperse* settles it by distance alone (often on the industrial core), *concentrate* hauls it onto one sacrifice zone, *treat* cleans it where coin and works allow. Correlation with wealth now spans **both signs**. The poison can land on the rich |
| `injustice_idx` | 0–100 | a **labeled composite** (`blight × poverty`), one plate among many, not the boot lens; the raw fields are the evidence |
| `healing_reach` | 0–100 | decay over cost-distance to the nearest healer |
| `safe_water` | 0–100 | waterworks/grid/wealth minus a blight penalty |
| `vulnerability_idx` | 0–100 | poverty + peripherality + tier |
| `burden_env_per_1k` etc. | rate | disease-burden cause components (environmental / waterborne / unmet), each averted by healing reach |
| `disease_burden_per_1k` | rate | **emergent** total = the three components exactly; never painted |
| `service_gap_idx` | 0–100 | precomputed coverage gap: inverse reach + facility distance + off-grid |
| `temple_reach` / `magnate_reach` / `crown_reach` | 0–100 | the three bloc reach fields (crown reach = `centrality_to_capital`) |
| `dominant_bloc` | enum | `crown` \| `temple` \| `magnate` \| `contested` \| `ungoverned` \| `dominion`: argmax of the three reach fields; close top-two → contested, all weak → ungoverned; occupied ground always reads `dominion` (data-keys stable; rendered in the new register) |
| `market_access` | 0–100 | Hansen (1959) accessibility index over road-network costs (max = 100; see docs/grounding.md §3 for the formula and its two divergences from Hansen's) |
| `pilgrim_flux` | 0–100 | pilgrim through-traffic en route to the nearest sanctioned site |
| `force_projection` | 0–100 | decay from constabulary posts over cost-distance: how far the state can throw force |
| `order_level` | 0–100 | **B9** realm order + occupation's local police state: high order stills the shadow (predation, smuggling, revolt) AND the ladder (mobility, investment, churn). Safety and stagnation, one root |
| `constabulary_strength` | 0–100 | strategic priority × lumen: off-grid darkness is near-defenseless |
| `security_status` | enum | `secured` \| `patrolled` \| `contested` \| `ungoverned`, thresholded on force projection (auditable) |
| `smuggling_intensity` | 0–100 | unretained ore value routed to the big markets *around* patrolled ground |
| `predation_risk` | 0–100 | traffic + pilgrims worth robbing × absence of protection |
| `black_market_index` | 0–100 | per-capita reliance on unsanctioned channels (≈ inverse of arcane services) |
| `enforcement_gap` | 0–100 | illicit pressure − state capacity: the lawless-hinterland column |
| `exhausted_lode` | 0/1 | blind geology: ore mined out long ago; feeds no income today |
| `founding_era` | enum | `relic_era` \| `first_settlement` \| `conduit_boom` \| `recent_frontier` (+ `founding_age` 0–100). Enum data-keys stable |
| `legacy_advantage` | 0–100 | head starts compound: founding age × grid × centrality |
| `shock_legacy` | enum | `refinery_collapse` \| `blight_plague` \| `relic_disaster` \| `war` \| `none` (+ `shock_severity`) |
| `abandonment_index` | 0–100 | past value − present wealth: the hysteresis gap (ghost country) |
| `tenure_churn` | 0–100 | how often a region changed hands, high on the bloc seams |
| `segregation_index` | 0–100 | the enclave signature: wealth standing above its neighbors, company districts |
| `mobility_ceiling` | 0–100 | chain-role × services × market access. Ore-only frontier: born labor, die labor |
| `social_trust` / `kinship_reliance` | 0–100 | claiming the state vs routing around it: designed mirrors |
| `cultural_distance` | 0–100 | distance from the dominant culture (rises with peripherality + darkness) |
| `tenure_regime` | enum | `titled` \| `mixed` \| `customary` \| `contested`: whose land the registry recognizes |
| `legibility_gap` | 0–100 | how badly the census undercounts here: every per-capita rate is optimistic |
| `uncounted_population` | int | `population × gap/100 × 0.3`: add to `population` for corrected (worse) rates |
| `endowment_t0` / `wealth_t0` / `population_t0` | n/a | the founding state, for trajectory maps (`aetherstone_endowment` is the *current*, possibly depleted stock) |
| `peak_wealth` | 0–100 | high-water mark across the run; `abandonment_index` = 0.7 × (peak − present) + dead-lode bonus |
| `ore_depleted` | 0/1 | the mine died *during* the run (stock < 15 from a founding ≥ 40) |
| `boom_bust` | enum | `boom` \| `stable` \| `decline` \| `collapse`: the settlement's trajectory |
| `event_type` | enum | lived history (latest event; full timeline in `hinterland.events`): `refinery_collapse` \| `blight_plague` \| `ore_strike` \| `war` \| `consecration` \| … (data-keys stable) |
| `event_epoch` / `event_severity` | int / 0–100 | when it struck (−1 = never) and how hard |
| `won_arc` | enum | **B8** the fate a won rising bought: `flourished` (a throttled town freed and booming) \| `starved` (a propped-up town losing its capital and order). Liberation is a distribution, not a verdict |
| `elite_share` | 8–92 | the owners' row's slice of this region's coin. Founded on structure, then moved by history: rents concentrate, the granary levels, shocks jolt (won revolt −25, collapse −10, plague −8) |
| `elite_delta` / `elite_ordinary_delta` | ± | the row's move since founding, and the same with catastrophe shocks charged OUT. Where the ordinary delta reads **negative**, **B5** competition and boom-churn (not a fire) thinned the row |
| `rank_churn` | ±100 | did *who* is rich change (climbers and fallers), or only how much? |
| `elite_pop_pct` / `class_gap` | 2–8 / ratio | the owners' headcount and the coin-per-owner over coin-per-laborer ratio (both exactly recomputable) |
| `is_skyport` | 0/1 | an aerie of the skyway stands here, chartered where flight beats the ground by the most, weighted by the value worth moving |
| `capital_cost_ground` / `capital_cost_sky` | cost | least-cost distance to the capital on foot vs by air (walk to an aerie, then fly); the sky trip never exceeds the ground one |
| `sky_advantage` | 0–100 | the share of the distance to the capital the lanes abolish, IF you may board, and boarding is an owners' privilege |
| `occupied` / `occupied_epoch` | 0/1, int | the Dominion holds this ground (a cost-ball around the foothold). `0` with `occupied_epoch ≥ 1` = once occupied, freed by a won rising |
| `tribute_burden` | 0–3 | the per-epoch tribute rate at the record's close: occupied 3; free realm 1 (crown-bloc) or 2; 0 where the Dominion never came |
| `concession` / `concession_epoch` | 0/1, int | **B11** imperial reach: a foreign power owns the aetherworks here (courted by attention × sea-reach × remaining ore), the coast force-wired, development capital flowing while the ore is wanted |
| `foreign_claim` | 0–100 | the share of this region's yield that repatriates to the metropole under the concession. dependency theory's "who keeps what it makes" (Prebisch/Singer; see docs/grounding.md §13), one level up |
| `concession_ended` / `concession_ended_epoch` | 0/1, int | the concession wound up (the lode drew down or attention turned): the *courted → developed → squeezed → abandoned* arc. Ruin (markets leave) and freedom (the levies stop) in one year |

**Settlement features (Point):**

| property | type | meaning |
|---|---|---|
| `name` | string | Toponym grown from the world: a Markov-walked base word plus qualifying parts SELECTED BY THE REGION'S GEOLOGY (a river-mouth "-mouth", ore country a "Delf", the high country "Tor"/"Fell", the fens a "Fen"). Unique per world, byte-stable across every society knob and capital move (the grammar reads geology only) |
| `epithet` | string\|null | DERIVED byname history: `the Yoked` (occupied) / `the Unyoked` (freed) / `the Free` (won its rising, flourished) / `the Famished` (won its rising, starved) / `the Gilded` (elite_share ≥ 80) / `the Ashen` (blight ≥ 80) / `the Hollow` (collapse) / `the Mourning` (plagued) / `the Rising` (boom); first match wins, most towns never earn one |
| `name_register` | enum | `lowland` \| `frontier`: the register the place names itself in, read from blind geology |
| `tier` | enum | `metropolis` \| `city` \| `works-town` \| `frontier-post`. A LABEL for the outcome: the capital is the metropolis by office, the rest rank by grown size; exactly recomputable from the exported populations |
| `region_id` | int | containing region |
| `population` | int | settlement population, GROWN by the founding centuries (compound growth on land quality + road migration; rank-size/primacy a built-in Gibrat-type regularity whose steepness varies, `findings.zipf`; docs/grounding.md §4) |
| `wealth` / `on_grid` / `arcane_service_index` | n/a | mirror their region |
| `nearest_facility_distance` / `nearest_healer_dist` | cost-dist | to the closest facility / healer |
| `disease_burden_per_1k` / `service_gap_idx` | rate / 0–100 | mirror their region |

**Grid features (LineString):** `kind: "grid"`, `edge_class` (`trunk` \|
`branch`), `from_region`, `to_region`.

**Skyport features (Point):** `region_id`, `skyport_name`.
**Skylane features (LineString):** `skyway_name`, `from_region`, `to_region`,
`fly_cost`. A lane between every pair of aeries; flight ignores every ground
multiplier. The road below is for everyone; the sky is not.

**Facility features (Point):** `facility_type` (`healer` \| `waterworks` \|
`wardstation`), `region_id`. Rationed by the planner's rule: the metropolis
always; cities only when on-grid; wardstations additionally guard aetherworks
regions.

**Sanctioned-site features (Point):** `region_id`, `site_name` (a liturgical
dedication in the church's own register). Holy places, planted where the sacred
substance lies and the state's writ is thin; the source points of
`temple_reach`. The set can GROW mid-run: the church consecrates the ground of
the run's first wound (see `consecration` in the event timeline).

**Ridge features (LineString):** `ridge_id`, `ridge_name`, `ridge_kind`
(`Teeth` \| `Spine` \| `Range` \| `Hills`), `max_elev`. Drawn in the
blind-geology stage: they raise ruggedness and act as walls in the cost graph
(×4.5 to cross, except at passes). Sliders and capital moves never move them.

**Pass features (Point):** `ridge_id`, `region_id`, `pass_name`, `pass_elev`,
`held_by`. The 1–2 low gaps per ridge where crossing costs ×1.4.

**River features (LineString):** `river_id`, `river_name`, `river_kind`
(`Beck` \| `Brook` \| `River`), `chain_regions` (region ids in downstream order,
the drinking order every river column recomputes from). The bed is walked
downhill over the continuous elevation surface, ending in the traced sea or off
the map edge, never mid-land. River edges cost ×0.6 (barge transport).

**Sea features (Polygon):** `sea_id`, `sea_name`, `sea_level`. An irregular
coastline flooded from the per-world sea level over the elevation surface.
`on_coast` means the region's cell touches it.

**Contour features (MultiLineString):** `level`. **Coast features
(LineString):** `side`. The 1–2 box edges the world's geology chose as ocean.

**Port features (Point):** `region_id`, `port_name`, `held_by`. Sea gates:
the export chokepoints where whatever the mines raise and the aetherworks refine
leaves the country.

**The places between.** Four location types that pull on the model, each a point
feature and a region column: **Freeport** (the harbor beyond the writ, whose
trade enters no ledger; sealing the coast via `openness=0` does not close it),
**Stillair** (ground where the lift-stones die: no aerie, a wall no money
crosses), **High sanctuary** (a refuge above the sanctioned faith: a healer the
planner never rationed, and a hole in the census), **Hunter camps** (where
predation is worth a bounty and the constabulary never comes: risk as a wage).

**Ruin features (Point):** `ruin_type` (`delve` \| `tomb` \| `deadhold`),
`region_id`, `peril`, `yield`, `ruin_name`. The old world's structures, drawn
blind in the deep past. Ruins feed `delver_flux`, raise predation, and fence
their yield through the black market.

**Bridge features (Point):** `river_id`, `region_id`, `bridge_name`, `held_by`.
**Tower features (Point):** `region_id`, `tower_name`: apostate arcanists where
governance and the grid both fail. **Maelstrom feature (Point):** `side`,
`maelstrom_name`: a turning of the sea; port siting shuns its reach.

**Constabulary features (Point):** `region_id`. Force anchors: the capital plus
the busiest corridors near the core; the source points of `force_projection`.

**Road features (LineString):** `road_class` (`highway` \| `road` \| `track`),
`road_name` (the top roads take names from what they carry: `the <capital>
Road`, `the Ore Road`, `the Salt Road`), `traffic`, `from_region`, `to_region`.
The road network spans **every** settlement; only the grid is rationed. Held
crossings that still collect a real tariff keep themselves in repair; an unheld
or amnestied span goes unfunded and **rots** (B6). See `crossing_condition` /
`crossing_type` / `crossing_friction`, and the edges' `condition` / `is_decayed`.

**A second artifact, the epoch series** (`hinterland-epochs.geojson`): regions
and settlements repeated per epoch with `epoch` + `epoch_date` fields (25
fictional years per epoch). Built for the QGIS Temporal Controller; the last
frame is exactly the main export, frame 0 the founding.

**A third artifact, the chronicle** (`hinterland-chronicle.md`): the same
world, narrated. A deterministic written history composed from the facts the
export carries, closing on the realm's **verdict** (the gap × floor × growth
class). Same seed, same story, same words; every name in the prose is a feature
in the layers.

Full schema history: see [CHANGELOG.md](CHANGELOG.md).
