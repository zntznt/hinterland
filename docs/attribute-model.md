# Hinterland — Attribute Model (design)

> Status: authoritative design; the original spine (§§1–7) and the instrument
> pivot (§8, the B-era mechanisms) are implemented and verified by the shipped
> suite (tools/), at **schema v54** (the arcane-industrial re-skin). The
> narrative of how each phase landed — measurements, honest recalibrations,
> fixes — lives in CHANGELOG.md. This document decides which attributes exist, in
> what order they land, and why.
>
> **The frame changed once, and it governs everything below: mechanisms in,
> conclusions out.** The model was first built to prove a thesis — that
> inequality is manufactured — and it could not lose that argument, which made it
> zero-information as a generator (see [old-thesis.md](old-thesis.md)). The pivot
> keeps the socioeconomic-inequality lens as the way we *look* and takes the
> verdict off the press: every mechanism now carries **both** its edges (P2), and
> which one cuts is the world's, not the code's. A relation true in every world is
> now either a **definition** (label it) or a bug — never a finding (P1).
>
> Produced from a structured expert panel (≈20 disciplinary lenses) working off a
> single binding setting frame. The full per-lens reasoning is in the appendix.
>
> Revised after a follow-up design review: generation order pinned as an acyclic
> DAG, the endowment/capital relationship flipped so the frontier *emerges* (blind
> geology + agrarian-core capital), `wealth` concretized as income streams,
> per-phase acceptance criteria added, and the recompute pipeline split into
> three stages.

---

## 1. Purpose & framing

Hinterland generates **region-scale** worlds whose **socioeconomic mechanisms**
can be analysed and narrated in QGIS — an instrument for reading how geography,
finance, policy, and empire *shape* a region, with the verdict left to the reader.
The attribute model is the payload: geometry is just the carrier; the **attribute
table is the machinery**, and the machinery cuts both ways.

Two design commitments govern every choice below:

1. **Explicit → emergent.** We start with a few hardcoded knobs (fast to validate),
   but the goal is for structure to **emerge** from independently-generated
   primitives (where the ore is, where the terrain resists movement, where the
   capital sits) so a skeptic cannot say the map was rigged. Each attribute is
   tagged **EXPLICIT** (a dialed knob) or **EMERGENT** (falls out of primitives).
2. **The attribute table must stay clean for QGIS.** Numeric/string columns,
   small enums, **rates not counts** (every count needs a population denominator),
   and the laborious composite analyses **precomputed** as columns so the export is
   paint-ready rather than a QGIS homework assignment.

A third commitment was added at the pivot and governs §8:

3. **Both edges, no hardcoded sign (P2).** Every mechanism implements both its
   blades and the contingency that picks; the code never implements a verdict.
   Concentration can finance or hoard; a reform can save or rot; a rising can free
   a boomtown or starve it. Which happens is a fact about the state, not the code.

The single most important structural decision the panel converged on, and the one
the pivot then generalized:

> **`wealth` must stop being a pure input.** Originally it was a hardcoded gradient
> from the capital. Making wealth **partly derived** from the resource economy let
> a region be **resource-rich and value-poor** — and, once artifice (§8, B1)
> scaled income and un-conserved the pie, resource-poor and value-rich too. A
> capital-distance gradient can express neither.

---

## 2. Setting premise & glossary

An **arcane-industrial state** — a region under imperial reach — where **the
capacity to do work is bottled in one extractable substance.** Much follows from
who controls it: the economy is a chain of value-capture chokepoints, and power
accrues at each link; the place holding the ore rarely holds the aetherworks, the
grid, or the profit. But the flow is no longer one-directional by construction —
artifice can grow a periphery, finance can develop it, a frontier can pull people
outward, and the world outside can rescue or ruin any of it. Value *tends* to flow
uphill; whether it does, in a given world, is measured, not assumed.

Vocabulary note: at the C1 re-skin (schema v54) the export renamed cleanly to this
register. Internal enum **data-keys** stay stable (event `refinery_collapse`, era
`conduit_boom`, bloc `crown`/`temple`/`magnate`/`dominion`) — the data is the
anchor, the register the skin.

**Glossary (binding terminology — used throughout; invented, references no existing fiction):**

| Term | Meaning |
|---|---|
| **aetherstone** | Raw crystalline ore holding bound magical charge; geologically fixed, unevenly distributed. The root primitive. |
| **lumen** | The refined, stabilized, transportable form of charge; the universal energy/currency-of-work. |
| **the aetherworks** | Capital-intensive, polluting plant converting aetherstone → lumen (`aetherworks_capacity`); the biggest value-capture chokepoint. |
| **the grid** | The physical lumen network (charged lines, relay nodes, canister shipping) carrying lumen to settlements. |
| **on-grid / off-grid** | Whether a place is connected to the grid (`on_grid`). Off-grid places live in **darkness** — no metered magic. |
| **arcane services** | Metered magical utilities delivered via lumen: light, heat, water-purification, defense, healing, messaging. |
| **artifice index (`A`)** | A region's command of magically-enabled productivity — machinery, trained hands, licensed workings. The growth channel (§8, B1); income scales with it, so the pie is no longer conserved. |
| **the exchange / the bank** | Syndicates and counting houses; the finance channel. Concentration here can build the aetherworks or hoard to the owners' row (§8, B2). |
| **the blight** | Contamination byproduct of refining; lowers health & fertility. Placed by the **disposal doctrine** (§8, B4) — it can settle on the poor OR the rich. |
| **the constabulary** | The lumen-powered force perimeter (`constabulary_strength`); strong at centers, absent at the frontier. Its realm-wide level is the **order axis** (§8, B9). |
| **the church (and the chthonic beneath)** | The `temple` bloc: sanctioned sites, licensed magic, conditional charity — a ministry above and the old faith below. |
| **the Crown** | The regional administration (`crown` bloc): sovereignty, tax, grid-building, force; **reach decays with distance** (crown reach = `centrality_to_capital`). Answerable partly to the off-map metropole. |
| **the magnates** | Private resource-trade houses owning aetherworks, grid franchises, shipping, company towns; build **enclaves**, abandon the rest. |
| **the tariffs** | Levies at held crossings (`tariff_burden`) — extraction at the gate that also funds the gate's upkeep (§8, B6). |
| **sanctioned site** | A church-administered holy place, often over a relic or deposit; service tied to orthodoxy. |
| **the capital** | The dominant administrative center (the metropolis); apex of administration, grid, and services. |
| **settlement tiers** | `metropolis` (large/prosperous) → `city` → `works-town` → `frontier-post` (bare frontier strongpoint). |
| **the hinterland** | The periphery: far from the capital, thin on grid and constabulary, near the blight, weak in governance — but reachable by artifice, finance, and the frontier term. |
| **the skyway / aerie** | Lift lanes above every ground multiplier, chartered where flight beats the ground by the most; an aerie is an owners' quarter. The road below is for everyone; the sky is not. |
| **the Dominion** | The off-map power beyond the sea. Mostly it does not come — it **buys**, through concessions and reach (§8, B11); annexation (an occupied zone, tribute) is the demoted limit case. |
| **imperial reach** | Concessions, foreign claims, debt conditionality, embargo — the empire pressing on the region without landing. Its main mode; the fleet is the exception. |

**Mechanisms the design must make visible in data** (each two-edged): distance-decay
of the state; extraction-without-retention (and its inversion by artifice/finance);
grid economics (thin/poor populations → off-grid darkness, or the charter that lights
them); disposal of externality (on the poor, or the rich, by doctrine); capture of
windfalls; and imperial reach (development *and* ownership).

---

## 3. The layered attribute model

The panel proposed ~95 attributes. They collapse into **three layers** by causal
role. The design rule is one-directional flow: **primitives** are generated
independently; **derived** outcomes are computed from them; **relational** columns
are computed last for mapping. This ordering is what makes emergence honest.

### 3.0 What we keep small (the clean-table discipline)
- Counts (`population`, facility counts) always paired with a denominator so QGIS
  gets **rates**.
- Enums capped: `settlement_tier` (4), `dominant_bloc` (5), `biome_type` (~6).
- One shared distance-decay basis (`centrality_to_capital`), **not** a new falloff
  per attribute (the panel's #1 redundancy warning).
- `darkness` is just `100 − grid_access` — a render convenience, never an
  independent analytic variable.
- Every attribute draws from its **own named RNG substream** (the foundations
  discipline) so the byte-identical-export guarantee survives; every new knob is
  recorded in the export's `hinterland` provenance member, alongside a
  `schema_version` field — a file must always be reproducible from its own metadata.
- The recompute pipeline grows from two stages to three: **topology → geology →
  society**. Geology (endowment, terrain, biome, relics) depends only on
  seed + topology; society depends on geology + the socioeconomic knobs. Moving
  the capital or dragging a bias slider must never reshuffle the geology.

### 3.1 PRIMITIVES (generated first, independent of `wealth`)

| property | level | type/scale | generation (1-liner) |
|---|---|---|---|
| `aetherstone_endowment` | region | 0–100 | Sparse clustered low-frequency noise, thresholded to rare rich pockets — **pure geology, generated blind to the capital and every social layer.** The ore-in-the-frontier pattern is *not* painted here; it emerges from capital placement (see note below). |
| `terrain_ruggedness` | region | 0–100 | Local variance of an elevation noise field. |
| the coastline (`seaShapes` / `lakeShapes` geometry) | world | LineString rings | **Traced from the elevation field, not the grid.** Marching squares on the flood mask, but the shore vertex on each cell edge is placed by SUB-CELL INTERPOLATION on the real corner elevations (where the field actually reaches sea level), not the edge midpoint, so the coast follows the true contour at any angle instead of the old 0/45/90-degree grid lattice. Three fractal octaves shape it: a coarse GULF octave (150–340u) that pushes the whole low shore zone tens of units inland (a gulf/firth) or out to sea (a peninsula) so the silhouette varies instead of paralleling the map edge; a COVE octave (18–40u); and a CRENEL octave (9–20u), each strongest at the waterline and fading inland. The trace grid runs at GN=96 (cells ~16.7u × 10.4u on the 1600×1000 world) to resolve them. The result is a multi-scale, non-blocky coast that the sea-level negotiation still keeps every town clear of. |
| `biome_type` | region | enum {alpine, forest, grassland, wetland, arid_steppe, badland, coastal} | Elevation × moisture noise, Whittaker-style lookup. |
| `relic_density` | region (+POIs) | 0–100 | Cluster relic sites in remote/upland/blighted terrain; each POI carries salvage/hazard/contested flags. |
| `population` | settlement (→region) | count | From the **settlement skeleton**: tiers are assigned first (one `metropolis` at the capital, `city`s by centrality rank, the rest `works-town`/`frontier-post`), then population is a seeded rank-size draw from the tier's band, scaled by local carrying capacity (biome). **The denominator for everything.** Migration (§8, B3) later moves it both ways. |

> History primitives (`founding_era`, `shock_legacy`) are powerful path-dependence
> levers but are deferred (§7); they belong to the second wave.

> **Capital placement (the honest root of the periphery).** From Phase 2 the
> default (unpinned) capital stops being a uniform random point: it is placed where
> political centers historically arise — high carrying-capacity, low-ruggedness,
> well-situated lowland. Because rich ore disproportionately sits in rugged
> marginal country and the capital deliberately doesn't, the
> endowment-vs-centrality anti-correlation **emerges from two independent,
> individually innocent choices** — geology that ignores politics, and a capital
> that prefers farmland. No layer is authored against the frontier, yet the
> frontier appears. (Clicking to pin the capital still works; the derivation only
> replaces the default.)

### 3.2 DERIVED socioeconomic outcomes

| property | level | type/scale | generation (1-liner) | tag |
|---|---|---|---|---|
| `centrality_to_capital` | region | 0–100 | Inverted, normalized **cost-distance** from the capital over a friction surface (ruggedness+biome). Master peripherality measure. | EMERGENT |
| `pop_density` | region | persons/area | `population / polygon_area`. The "uneconomic to serve" signal. | EMERGENT |
| `aetherworks_capacity` | region (+facility) | 0–100 | Site few aetherworks by center-bias (high centrality + water/terrain; deliberately reads **no** social layer, keeping the DAG acyclic) — **NOT** at the ore. The engineered extraction/refining split. | EXPLICIT siting |
| `value_retention` | region | 0–100 | Share of locally-generated resource value that stays local = f(local refining vs raw extraction, centrality). The core retention ratio — and, under a concession (§8, B11), part of it becomes a FOREIGN claim. | EMERGENT |
| `wealth` (refit) | region | 0–100 | Income streams, **A-scaled**: `w_e·(endowment × extraction × value_retention)` + `w_f·artifice value-add` + `w_t·trade/service income` (re-anchored to the coast, §8 B10) + a `w_g·capital-gradient` legacy term, all multiplied by `(0.3 + A/100)` from the artifice index (§8, B1) and by effective water access (dry floor 0.70). All weights are sliders; at `w_g = 0` wealth is fully emergent; the four weights now anchor to **different** geography, so a trade coast can rival the capital. Because `A` grows and crashes, **total realm wealth is no longer conserved**. | EXPLICIT→EMERGENT |
| `water_access` / `water_access_effective` / `water_denial` | region | 0–100 / 0–100 / 0–100 | **Water as a contested resource, not a river flag.** `water_access` = gradient distance-falloff from any source (river bed, lake shore, or the hidden one, an `aquifer` groundwater field), so a town beside water still drinks and dry country on groundwater is not barren. `water_access_effective` = physical access **plus water a neighbor SHARES**, net of denial: a dry region borrows from its best-watered neighbor, but that neighbor prices it out when it is a **different bloc** (political) or **much richer** (economic). `water_denial` scores the withheld share; it feeds bloc tension (→ war) so thirst is a casus belli. | GRADIENT + RELATIONAL |
| `aquifer` | region | boolean | Seeded low-frequency groundwater field; ~1 in 6 regions sit on usable groundwater regardless of surface water (the well-fed hill town, the oasis). Feeds `water_access`. | EXPLICIT field |
| `on_grid` (+`grid_access`) | settlement/region | boolean (+0–100) | Grow the grid greedily from aetherworks/capital; connect a node only if `population × wealth` clears `friction × length` (grid-economics threshold). Below → off-grid. | EXPLICIT threshold |
| `arcane_service_index` | settlement/region | 0–100 | Delivered lumen = f(`on_grid`, distance line-loss, local `wealth` to pay the meter, sanctioned-site bonus). Need is deliberately **not** an input. | EMERGENT |
| `blight_load` | region | 0–100 | Emitted by `aetherworks_capacity`/heavy use; spread by a downhill/downwind kernel **plus** the **disposal doctrine** (§8, B4): disperse / concentrate / treat. Its correlation with wealth spans **both signs** — the poison can land on the poor OR the rich. | EXPLICIT doctrine + EMERGENT transport |
| `disease_burden_per_1k` | settlement/region | rate /1k | Emergent outcome = blight exposure + unsafe water + vulnerability − healing reach; store 2–3 cause components + jitter. | EMERGENT |
| `dominant_bloc` | region | enum {crown, temple, magnate, contested, ungoverned} | argmax of three independent reach fields (Crown distance-decay, Temple sanctioned-site pull, magnate enclave/wealth pull); ties → contested; all low → ungoverned. | EMERGENT |

### 3.3 RELATIONAL / computed (precomputed for headline maps)

| property | level | type/scale | generation (1-liner) |
|---|---|---|---|
| `nearest_facility_distance` | settlement | distance | Distance to closest facility (healer/waterworks/wardstation) — feeds isochrone/coverage. |
| `service_gap_idx` | settlement/region | 0–100 | Precomputed coverage gap: inverse of service reach + nearest-facility distance + off-grid status, population-weighted. |
| `injustice_idx` | region | 0–100 or 3×3 bivariate | `normalize(blight_load) × normalize(100 − wealth)` — a **labeled composite** (P3), kept and clearly named as such, one plate among many, **not** the boot lens (which is `wealth`). It measures where blight and poverty coincide *in this world*; because the disposal doctrine unlocked the sign (§8, B4), that coincidence is no longer near-universal. The raw fields are the evidence; the composite is a convenience. |

---

## 4. Causal / emergence map

The spine (read `A, B -> C` as "A and B generate C"):

```
terrain, biome (blind geology)                   -> carrying_capacity, friction
carrying_capacity, friction                      -> capital placement (agrarian core, not ore country)
capital, friction                                -> centrality_to_capital
aetherstone_endowment (blind geology)            -> extraction (falls where the ore is: the frontier)
centrality_to_capital, water/terrain             -> aetherworks_capacity (center) [the split; reads no social layer]
extraction, aetherworks_capacity                 -> value_retention (low at frontier)
value_retention, aetherworks_capacity, centrality-> wealth  (× A, §8 B1)         [emergent, un-conserved]
population, wealth, friction                     -> on_grid                      [grid economics]
on_grid, wealth, sanctioned_site                 -> arcane_service_index
aetherworks_capacity, elevation/wind, doctrine   -> blight_load                  [disposal doctrine, §8 B4]
blight_load, water, vulnerability, healing_reach -> disease_burden_per_1k
blight_load, wealth                              -> injustice_idx (labeled composite)
Crown/Temple/magnate reach fields                -> dominant_bloc
```

**Canonical generation order (the DAG, run as ONE bounded forward pass):**
seed → topology (Voronoi/Lloyd) → geology (endowment, ruggedness, biome, relics) →
settlement skeleton (tiers, population) → capital resolution → centrality →
aetherworks siting → value_retention → wealth → grid → arcane services → blight →
health → relational columns. No unbounded fixed-point loops: any feedback is
approximated by this fixed order — optionally with a small *fixed* number of
relaxation sweeps, in the same spirit as the Lloyd's passes: always seeded, always
terminating. The **epochs** then run the §8 mechanisms forward on top of this pass.

**The 3 emergent throughlines** (each a chain from fixed geography to a distinctive
shape that no single knob authored). At the pivot each gained its **inversion** — so
they are now *reachable outcomes*, not mandatory ones:

1. **The resource curse (flagship) — and its inversion.** Geology is blind to
   politics, but the capital settles in the agrarian core, so the ore-rich margins
   end up peripheral by *consequence* → ore is extracted there but
   `aetherworks_capacity` is sited at the center → `value_retention` collapses at
   the frontier → `wealth` stays low **despite high production**. Rich ground, poor
   people — in about two-thirds of worlds. **But** artifice (§8, B1) scales income,
   so a high-`A` periphery can out-earn a low-`A` capital, and finance (B2) can
   *develop* the frontier instead of draining it. The curse is common, not fixed.
2. **Off-grid darkness — a ledger's choice.** Low `wealth` + low `pop_density` fail
   the grid's economics threshold → `on_grid = false` → `arcane_service_index` ≈ 0 →
   no light, no purified water, no defense, no healing — *regardless of need.* The
   full-grid counterfactual (threshold 0) shows the darkness was a return on
   investment, not a law of nature.
3. **The blight — placed, not fated.** `aetherworks_capacity` emits `blight_load`,
   but where it settles is the **disposal doctrine** (§8, B4): concentrate hauls it
   onto a sacrifice zone, disperse lets it settle on the industrial rich, treat
   cleans it where coin and works allow. `corr(blight, wealth)` spans both signs
   across the sweep. The old near-tautology (injustice = blight × poverty *after*
   the blight was aimed at poverty) is broken.

These share one root (blind geology + an agrarian-core capital, meeting in
`centrality_to_capital`) — but no longer one victim, and no longer one verdict.
That is the difference between a diagram and an instrument.

---

## 5. The original spine (Phases 1–6 — historical, complete)

> These six phases are all **shipped**. They built the diagram-into-emergent-model
> spine the pivot then re-founded. They are preserved here as the record of how the
> model was first assembled; where a phase's mechanic was later superseded, a note
> says so (notably: **Phase 4's λ dump-bias was retired for the three-way disposal
> doctrine** at B4, §8 — so the old "λ→0 flips corr(blight,wealth) to +0.9" accept
> criterion is now the general fact that the doctrine unlocks the sign either way).
> Terms below are the original ones; the current export uses the §2 register.

One layer at a time, **re-export and re-check in QGIS after each.** Each phase is
chosen to (a) unblock the next and (b) produce at least one new headline map.

- **Phase 1 — the denominator + the root primitive.**
  Add the **settlement skeleton** (every region gets a settlement; tiers assigned
  by the rank-size rule — one `metropolis` at the capital, `city`s by centrality,
  the rest `works-town`/`frontier-post`), **`population`** drawn per tier (with
  `pop_density`), and
  **`aetherstone_endowment`** (blind-geology primitive). Retiring `capital`/`town`
  for the 4-tier enum is a **breaking schema change**: bump `schema_version` in the
  provenance member and update the QGIS notes.
  *Why first:* `population` unblocks every rate the rest of the model needs, and is
  immediately useful (proportional symbols, density choropleth); the endowment
  field is a trivial noise layer that seeds the flagship storyline before refining
  exists. Lowest risk, highest unblock.
  *Accept:* population symbols + endowment choropleth render in QGIS, and the two
  fields are visibly independent — no built-in correlation; geology is innocent.

- **Phase 2 — make `wealth` emergent (the intellectual turn).**
  Derive the default (unpinned) **seat placement** from geology (agrarian core:
  high carrying capacity, low ruggedness); add `centrality_to_capital` (cost-distance
  backbone), `aetherworks_capacity` (center-biased siting), and `value_retention`;
  **refactor `wealth`** into the three income streams (§3.2), demoting the
  capital-gradient to the `w_g` term. Keep the old behavior reachable at `w_g = 1`
  for comparison.
  *Why:* this is where the project stops being a diagram and becomes an argument.
  *Accept (calibrated to measurement after implementation):* under default weights
  the endowment-vs-wealth scatter has a populated high-endowment/low-wealth
  quadrant — given ore sparsity that is ~5–10% of all regions, with roughly 40% of
  high-endowment regions landing below median wealth and a visible curse in about
  two-thirds of worlds (the remainder have their lodes near the center: the
  legitimate "contested, already-rich seams" case). At `w_g = 0` wealth still shows
  strong spatial structure — derived from geology, not the capital.

- **Phase 3 — off-grid darkness.**
  Add a **minimal conduit** (a cost-gated minimum spanning tree over settlements —
  does **not** require the full road network) → `on_grid`/`grid_access` →
  `arcane_service_index`. Ship the off-grid darkness map.
  *Accept:* some settlements are off-grid, and off-grid status tracks the
  population×wealth threshold (not a hand-picked list); conduit + darkness layers
  render as a coverage map.

- **Phase 4 — exported blight.**
  Add `blight_load` (downhill/downwind kernel + λ dump-bias) and the
  `injustice_idx` bivariate. Ship the environmental-injustice map.
  *Accept (calibrated to measurement after implementation):* corr(`blight_load`,
  `wealth`) ≈ −0.5 at the default λ; sweeping λ → 0 does not merely weaken it —
  it **flips the sign** (≈ +0.9), because with no dumping policy the spoil stays
  at the aetherworks and the centers eat their own waste. The gap between the two
  runs (≈ 1.4 correlation points) is the measured **policy share** of the
  injustice — an analysis in itself. Implementation note: λ reshapes the
  *allocation weights* of a fixed spoil mass (nearest-land at λ=0 →
  poverty-seeking at λ=1), so the sweep compares identical contamination under
  different victims.

- **Phase 5 — facilities, coverage, health.**
  Place facilities (healer/waterworks/wardstation) gated by tier + `on_grid`; compute
  `nearest_facility_distance`, `service_gap_idx`, and the emergent
  `disease_burden_per_1k`. This is the facilities + coverage payload.
  *Accept (calibrated to measurement after implementation):* burden ships as a
  per-1k **rate** split into cause components that sum exactly; the
  high-burden/low-care quadrant is populated in 20/20 test worlds; measured
  emergence: corr(burden, blight) ≈ +0.6, corr(burden, healing_reach) ≈ −0.9,
  corr(burden, wealth) ≈ −0.85 — need arises precisely where care does not
  reach; off-grid regions carry larger service gaps than on-grid in every test
  world.

- **Phase 6 — governance overlay.** `dominant_bloc` (+ the deferred institutional
  depth as appetite allows).
  *Accept (calibrated to measurement after implementation):* the bloc map has
  exactly 5 categories; contested/ungoverned space exists in 30/30 default test
  worlds; all five categories occur across seeds; the capital answers to the Crown
  (or is contested by the magnates next door) in every test world. Temple reach
  emanates from sanctioned sites planted on remote ore and deep periphery —
  where the sacred substance lies and the Crown's writ is thin — so the
  political map is emergent: no region is assigned a ruler; rulers reach, or
  they don't.

**Scale note:** correlation scatters, Jenks classes, and bivariate maps need sample
size. When Phase 1 lands, raise the default region count to ~24 and the slider cap
toward ~64, and keep one settlement per region so region-level rates have support.
5–12 regions was right for proving the bridge; it is too few to see a distribution.

Each EXPLICIT knob (grid threshold, aetherworks center-bias, the disposal doctrine,
distance-decay rate, tier→service rationing, `w_g` capital-gradient weight) is a
**slider** — and every knob must have a **defined neutral zero** where its mechanism
is purely physical/emergent: grid-threshold 0 → the grid reaches everyone; `w_g`
0 → wealth is pure economics. Dialing the cruelty down to zero — and watching how
much structure *remains*, and in which direction — is the instrument stated as an
experiment. (After the pivot the knobs also have neutral *midpoints*: `order=50`
and the default doctrine leave the founding world byte-identical; the reach is at
the extremes, per the §8 falsifiability suite.)

---

## 6. Headline maps (the reads)

The maps that make each mechanism legible in QGIS. Each *can* show the extraction
read — and, after the pivot, can also show its inversion, which is the point:

1. **Resource curse (or its inversion)** — bivariate / scatter of
   `aetherstone_endowment` × `wealth` (or `value_retention`); then
   `artifice_index` against wealth drift, for the periphery that out-earned the core.
2. **Off-grid darkness** — `arcane_service_index` choropleth + grid service-area
   coverage gap; the full-grid counterfactual shows the darkness was a return.
3. **Where the blight landed** — `injustice_idx` bivariate (`blight_load` × low
   `wealth`) — but read the sign: under disperse the poison sits on the *rich*.
4. **Disease burden** — `disease_burden_per_1k` (a **rate**, Jenks 5-class),
   overlaid on coverage gaps.
5. **Who rules, who is owned** — `dominant_bloc` with `service_gap_idx`, and
   `concession`/`foreign_claim` for the coast that is developed *and* owned.

Cartographer's veto, baked into the model: **never map a count as if it were a rate.**
Every count ships with `population` so the analyst divides; small peripheral
settlements must read as loud as the swollen capital.

---

## 7. Deferred & rejected

> **Mostly shipped since.** Almost the entire "deferred second-wave" set below has
> since landed and now rides the export (the security, deep-time, illicit, and
> social-texture sets in particular — `force_projection`, `legibility_gap`,
> `smuggling_intensity`, `mobility_ceiling`, `market_access`, migration flows, and
> more). The list is kept as the original triage; treat it as history, not as a
> to-do. The genuinely new state variables the pivot added are catalogued in §8.

**Deferred (valuable second-wave depth, not core — many need the network layer
first):** `state_reach_index`, `public_goods_score`, `clientelism_index`,
`voice_deficit`; the sacred set (`sanctity_index`, `pilgrim_flux`, `orthodoxy_gate`,
`temple_welfare_share`, `divine_legitimacy`); the security set (`force_projection`,
`constabulary_strength`, `security_status`, `conscription_burden`, `frontier_exposure`);
the deep-time set (`founding_era`, `legacy_advantage`, `shock_legacy`,
`abandonment_index`, `tenure_churn`); the illicit set (`smuggling_intensity`,
`predation_risk`, `air_piracy_exposure`, `black_market_index`, `enforcement_gap`);
and the social-texture set (`segregation_index`, `mobility_ceiling`, `social_trust`,
`kinship_reliance`, `tenure_regime`, `cultural_distance`, `legibility_gap`,
migration flows, `market_access`, `lumen_price`, `market_desert`,
`supply_chain_fragility`, `venture_cluster`, `capital_access`, `gini_local`).
These are not cut — they are the richness the emergent engine can support **once the
spine exists.**

**Merged / rejected (genuine redundancy):**
- `darkness` → derived view of `grid_access`, not its own variable.
- Multiple per-attribute distance-decays → one shared `centrality_to_capital` basis.
- `frontier_index` → a thresholded classifier over centrality, not an independent metric.
- Per-service booleans → folded into one `arcane_service_index` (expose only
  `wardline`/`healing` booleans if a later spatial join needs them).

**Open questions / tradeoffs (decide before Phase 2):**
1. **Circularity — RESOLVED.** The canonical DAG in §4 settles it: one bounded,
   seeded forward pass in a pinned order. The two cycles the panel had introduced
   are broken structurally — aetherworks siting no longer reads `wealth` (centrality +
   terrain only), and `population` no longer reads `wealth`/`on_grid`/`blight`
   (settlement skeleton draws from tier + carrying capacity). Revisit feedback only
   if a later phase genuinely needs it, and then only as a small *fixed* number of
   relaxation sweeps.
2. **Time depth.** Migration, depletion, and path-dependence imply "ticks." For now,
   prefer a **single snapshot** with at most a short scripted history pass; full
   temporal simulation is out of scope.
3. **Conduit before roads.** We deliberately ship a *simplified* conduit (MST + cost
   gate) in Phase 3 so the biggest headline (off-grid darkness) doesn't wait on the
   full road/river network. Reconcile with the real network layer when it lands.
4. **Where values live.** Network-native attributes (`pilgrim_flux`,
   `smuggling_intensity`, wardline) store canonically on the network and aggregate
   to regions with a clear suffix — one source of truth.

---

## 8. The pivot — mechanisms in, conclusions out (the B-era)

The original spine builds the **founding** world. The pivot runs the **epochs**
forward on top of it, and re-founds the economy so that every loop carries **both
edges** (P2). The code implements each mechanism and the *contingency* that picks
between its blades; it never implements a verdict. Below, each is a mechanism, its
two edges, the state that decides, and the columns it added. Every one shipped with
an **inversion exhibit** (a pinned seed×knob world where the extraction reading
fails) and regenerated fixtures deliberately; the atlas sweep holds the verdict
space open (≥6 of the §3.5 classes present, none over ~40% — measured 14 classes,
max ~23%). Schema climbed v41→v54 across these.

| # | mechanism | blade A | blade B | contingency that picks | columns added |
|---|---|---|---|---|---|
| **B0** | the world outside | a good price lifts every seam and works | a trade war / embargo starves them | the exogenous **regime chain** (`world=`) — price, demand, attention, doctrine, metropole pull; never rendered, only exported | `hinterland.world` (provenance) |
| **B1** | artifice index `A` | the aetherworks learn → income grows, the pie expands | forgotten/crashed works → income falls, the pie shrinks | investment (keyed to the world price), diffusion, decay, war/collapse crashes | `artifice_index`, `artifice_index_t0` |
| **B2** | the investment pool (the exchange) | **development finance**: elite coin builds `A` | **comprador hoarding**: coin banks to the owners' row | the town's `value_retention` × the world regime (does capital dare, does value stay to build?) | (uses `artifice_index_t0`); `findings.floor` |
| **B3** | migration + diaspora | drift toward winners (size begets size) | the **frontier term** (outward against the gradient) + emigration off-map + remittances home | rent differential × opportunity × the metropole's pull | `emigrants_total`, `remittance_income` |
| **B4** | the disposal doctrine | **concentrate** onto a sacrifice zone / **disperse** onto the industrial rich | **treat** where coin + `A` allow | the `db` knob (disperse/concentrate/treat) × future migration × treatment capacity — `corr(blight,wealth)` spans both signs | `disposal_doctrine`, `sacrifice_zone` |
| **B5** | elite share | the structural ratchet up (rents concentrate) | **ordinary erosion** down (competition, boom-churn) where market access is high | market access × order level (a police state freezes both) | `elite_delta`, `elite_ordinary_delta`, `rank_churn` |
| **B6** | tariffs + crossings | extraction at the held gate | **upkeep**: the tariff funds the crossing; amnesty leaves it to **rot** | the fiscal state of the holder; reform design (amnesty caps `tollScale` below the upkeep floor) | `crossing_condition`, `crossing_type`, `crossing_friction`; edge `condition`/`is_decayed` |
| **B7** | reform long edges | a measure damps a term now | its **long edge** curdles later (charter→debt, granary→dependency, retention→flight, amnesty→rot); a deaf capital gets a measure **imposed** by creditors | time + the state it lands in (P4); `iq` as posture × the world's doctrine pressure | `hinterland.reform_edges` (charter_debt, granary_dependency, capital_flight, impositions…) |
| **B8** | revolts (won) | a **throttled** town freed → **flourishes** (suppressed potential released) | a **propped-up** town freed → **starves** (capital and order flee) | the freed town's fundamentals at the moment of rising | `won_arc` (`flourished`/`starved`) |
| **B9** | the order axis | high order **stills the shadow** (predation, smuggling, revolt) | high order **stills the ladder** (mobility, investment, churn) | the `order` knob (0 open ↔ 100 police state; 50 = the old world) — safety and stagnation, one root | `order_level` |
| **B10** | the income mix | the four weights **anchor to different geography** — a trade coast grows a **second pole** rivalling the capital | (`bias` → the legacy term; `hb` → the closed end of `openness`) | `openness` × the world's foreign demand; each weight now makes its own anchor the strongest wealth predictor | `openness` (provenance); `bias`/`hb` retired |
| **B11** | imperial reach | the **concession**: foreign capital develops the coast, wires it, floods in capital | and **owns** it: `foreign_claim` repatriates the yield; wound up when the lode thins → ruin *and* freedom | the metropole's **attention** (× sea-reach × remaining ore); annexation is the demoted limit case | `concession`, `concession_epoch`, `foreign_claim`, `concession_ended`, `concession_ended_epoch`; `powers`, `findings.verdict`, `findings.concessions` |

**The world outside is never drawn** (the observability law): it exists in the
region only as texts and numbers that arrive — prices, dispatches, circulars — so
no second map is simulated. It is the falsifiability keystone: a region can do
everything right and be ruined by a price collapse, everything wrong and be rescued
by a boom. No verdict reads off the policies alone.

**The verdict space (§3.5).** The old three-way ΔGini banner became a de-moralized
**gap × floor × growth** class in `findings.verdict`: did the spread widen / hold /
close, did the poorest tenth's floor rise or fall, did the realm boom / stagnate /
collapse. Twelve-to-eighteen shapes are reachable; the acceptance suite requires ≥6
to appear in the calibration sweep with none over ~40%, so no templated story owns
the possibility space. "The gap widened while the poorest fifth grew richer than any
founding generation" is now a world the engine can both generate and narrate.

**The falsifiability suite (the pivot's own test).** Beyond the house suite:
*inversion exhibits* (each headline relation inverts somewhere in seed×knob space,
at meaningful frequency, as a pinned atlas URL); *knob reach* (every shipped knob's
extremes change a *relation*, not just a magnitude); *verdict diversity* (the class
distribution above); and *definition honesty* (composites like `injustice` are
labeled as composites in every surface that shows them). A relation true in 100% of
worlds must be a **definition** or a **construction** — labeled as such — or it is a
bug. See [old-thesis.md](old-thesis.md) for why this test exists.

---

## 9. Appendix: panel digest

> Preserved as the original expert panel's record. It uses the panel's own terms
> (refinery, conduit, wardline, the seat) — read them through the §2 register
> (aetherworks, the grid, the constabulary, the capital); the reasoning stands.

The frame was set first by the **setting consultant** (world model + binding
glossary above); all lenses built on it. One-paragraph digest per lens:

**Physical & resource base**
- **Geographer.** Owns the cost field. Pushed `terrain_ruggedness` → `friction_cost`
  → `centrality_to_capital` as the spine of distance-decay, plus `site_quality` vs
  situation to find stranded good-site/bad-situation places.
- **Ecologist.** Environment *causes* inequity: `biome_type` and `carrying_capacity`
  cap population (thin places get skipped); `blight_load` is a transported externality;
  `hazard_exposure` is regressive because wardline defense is metered.
- **Resource/energy engineer.** The chain end to end: `aetherstone_endowment`
  (fixed, frontier-biased) → `extraction_intensity` → `aetherworks_capacity` (sited at
  center) → `on_grid` (grid economics) → `arcane_service_index`. The on/off-grid
  binary is the decisive filter.

**Economy & enterprise**
- **Economist.** `value_retention` and `fiscal_transfer_net` make "produce much, keep
  little" measurable; `gini_local` exposes enclave/hinterland polarization a regional
  mean hides.
- **Entrepreneur.** `opportunity_surface` peaks where `capital_access` bottoms out —
  the "frustrated frontier"; `informal_share` marks economies invisible to credit and tax.
- **Market researcher.** Demand-side deserts: `purchasing_power`, `lumen_price`
  (regressive — costs most where it reaches least), `market_desert`, `information_access`.
- **Industrial engineer.** Siting & throughput: `aetherworks_capacity` (not at the ore),
  `lumen_consumption`, `industrial_capacity`, and blight as exported externality;
  `supply_chain_fragility` for captive company towns.
- **Logistics analyst.** Connectivity as equity: `grid_access`/`darkness`,
  `transport_friction`, `market_access` (gravity), `chokepoint_betweenness` (capture points).

**Society & people**
- **Sociologist.** Names the classes: `class_structure` (rentier/labor/dispossessed),
  `segregation_index` (enclaves), `social_trust`, `mobility_ceiling` (born labor, die labor).
- **Demographer.** The denominator: `population`, `pop_density`, `dependency_ratio`,
  `net_migration` (the periphery emptying uphill), `urbanization`/primacy.
- **Anthropologist.** Who the data erases: `tenure_regime` (customary land read as
  empty title), `cultural_distance`, `kinship_reliance`, and `legibility_gap` — a
  meta-attribute that rescales every per-capita rate to expose the undercount.
- **Planner.** The rationing rules: the 4-tier hierarchy as policy, `informal_share`,
  `catchment_coverage`/`nearest_facility_distance`, the conduit threshold, land-use mix.

**Power & institutions**
- **Political scientist.** State capacity as a field: `state_reach_index`,
  `public_goods_score`, `dominant_bloc`, `clientelism_index` (windfall capture), `voice_deficit`.
- **Religion scholar.** Parallel conditional welfare: `sanctity_index`, `pilgrim_flux`,
  `orthodoxy_gate` (nominal coverage → effective exclusion), `temple_welfare_share`,
  `divine_legitimacy`.
- **Military analyst.** Security as an uneven public good: `force_projection`,
  `constabulary_strength` (off-grid = defenseless), `security_status`, `conscription_burden`
  (the periphery pays in blood for defense it doesn't get), `frontier_exposure`.
- **Historian.** The present as residue: `founding_era`, `legacy_advantage` (head-starts
  persist), `shock_legacy`, `abandonment_index` (the magnates built it then left),
  `tenure_churn`.
- **Criminologist.** The shadow economy as a negative image of the state:
  `smuggling_intensity`, `predation_risk`, `air_piracy_exposure`, `black_market_index`
  (prices the underservice), `enforcement_gap`.

**Health & measurement**
- **Epidemiologist.** Health must *emerge*, never be painted: `disease_burden_per_1k`
  computed from `blight_exposure` + `safe_water_share` + `vulnerability_idx` −
  `healing_reach` (a metered, on-conduit service). The scissor of rising blight and
  falling care is the thesis.
- **Cartographer.** Disciplines the table for mappability: mandates the `population`
  denominator, precomputes `service_gap_idx` and `injustice_idx`, caps enums, demands
  rates over counts and the right classifier for skewed distributions.
