# Hinterland — Attribute Model (design)

> Status: authoritative design; **all six phases are implemented** — settlement
> skeleton + population, blind geology (ore, terrain, fertility, elevation,
> wind), agrarian-core seat, cost-distance centrality, refining, retention,
> three-stream emergent wealth, the cost-gated conduit with off-grid darkness +
> arcane services, exported blight with the λ dump-bias sweep,
> facilities/coverage/health with the emergent cause-split disease burden, and
> the governance overlay (dominant_bloc from three competing reach fields).
> Remaining work is the deferred second wave (§7). This document decides which
> attributes exist, in what order they land, and why.
>
> Produced from a structured expert panel (≈20 disciplinary lenses) working off a
> single binding setting frame. The full per-lens reasoning is in the appendix.
>
> Revised after a follow-up design review: generation order pinned as an acyclic
> DAG, the endowment/seat relationship flipped so the frontier *emerges* (blind
> geology + agrarian-core seat), `wealth` concretized as three income streams,
> per-phase acceptance criteria added, and the recompute pipeline split into
> three stages.

---

## 1. Purpose & framing

Hinterland generates **region-scale** worlds whose **socioeconomic structure** can
be analysed and narrated in QGIS — specifically to show how geography and planning
**underserve the periphery** (the *hinterland* thesis). The attribute model is the
payload: geometry is just the carrier; the **attribute table is the argument**.

Two design commitments govern every choice below:

1. **Explicit → emergent.** We start with a few hardcoded knobs (fast to validate),
   but the goal is for inequity to **emerge** from independently-generated
   primitives (where the ore is, where the terrain resists movement, where the
   seat sits) so a skeptic cannot say the map was rigged. Each attribute is tagged
   **EXPLICIT** (a dialed knob) or **EMERGENT** (falls out of primitives).
2. **The attribute table must stay clean for QGIS.** Numeric/string columns,
   small enums, **rates not counts** (every count needs a population denominator),
   and the laborious composite analyses **precomputed** as columns so the export is
   paint-ready rather than a QGIS homework assignment.

The single most important structural decision the panel converged on:

> **`wealth` must stop being a pure input.** Today it is a hardcoded gradient from
> the capital. To make the thesis an *argument* rather than a *diagram*, wealth
> should become **partly derived** from the resource economy — so that a region can
> be **resource-rich and value-poor**, which a capital-distance gradient can never
> express.

---

## 2. Setting premise & glossary

A fantasy continent where **the capacity to do work — industrial, magical,
military, domestic — is bottled in one extractable substance.** Everything follows
from who controls it. The economy is a chain of four value-capture chokepoints, and
power accrues at each link; the cruelty is that **the place holding the ore rarely
holds the refinery, the grid, or the profit.** Value flows uphill to centers; cost,
waste, and risk flow downhill to the periphery.

**Glossary (binding terminology — used throughout; invented, references no existing fiction):**

| Term | Meaning |
|---|---|
| **aetherstone** | Raw crystalline ore holding bound magical charge; geologically fixed, unevenly distributed. The root primitive. |
| **lumen** | The refined, stabilized, transportable form of charge; the universal energy/currency-of-work. |
| **refinery** | Capital-intensive, polluting facility converting aetherstone → lumen; the biggest value-capture chokepoint. |
| **conduit** | The physical distribution grid (charged lines, relay nodes, canister shipping) carrying lumen to settlements. |
| **on-conduit / off-grid** | Whether a place is connected to the conduit. Off-grid places live in **darkness** — no metered magic. |
| **arcane services** | Metered magical utilities delivered via lumen: light, heat, water-purification, **wardline** defense, healing, messaging. |
| **the relics** | Ruins/artifacts/zones of a vanished civilization; simultaneously resource, hazard, and contested claim. |
| **the blight** | Contamination byproduct of refining/heavy lumen use; lowers health & fertility; **exportable** to the powerless. |
| **wardline** | The lumen-powered magical defense perimeter; strong at centers, absent at the frontier. |
| **the Temple** | Theocratic/divine bloc; sanctioned sites, licenses magic, conditional (orthodoxy-gated) charity. |
| **the Crown** | Imperial/aristocratic state; sovereignty, tax, conduit-building, garrisons; **reach decays with distance**. |
| **the magnates** | Private resource-trade houses owning refineries, conduit franchises, shipping, company towns; build **enclaves**, abandon the rest. |
| **enclave** | A privately-built zone of concentrated light, security, and service — prosperity walled off. |
| **sanctioned site** | A Temple-administered holy place, often over a relic or deposit; service tied to orthodoxy. |
| **the seat** | The dominant Crown center; apex of administration, grid, and services. |
| **settlement tiers** | `prime` (large/prosperous) → `hub` → `outpost` → `holdfast` (bare frontier strongpoint). |
| **the hinterland** | The neglected periphery: far from the seat, thin on conduit and wardline, near the blight, weak in governance. |

**Mechanisms of neglect** (the design must make each visible in data): distance-decay
of the state; extraction-without-retention; grid economics (skip thin/poor
populations → off-grid darkness); conditional/orthodoxy-gated charity; externality
dumping (blight on the weak); capture of windfalls (relic finds / rich strikes
claimed by the strongest bloc, not locals).

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
- One shared distance-decay basis (`centrality_to_seat`), **not** a new falloff per
  attribute (the panel's #1 redundancy warning).
- `darkness` is just `100 − conduit_access` — a render convenience, never an
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
| `aetherstone_endowment` | region | 0–100 | Sparse clustered low-frequency noise, thresholded to rare rich pockets — **pure geology, generated blind to the seat and every social layer.** The ore-in-the-frontier pattern is *not* painted here; it emerges from seat placement (see note below). |
| `terrain_ruggedness` | region | 0–100 | Local variance of an elevation noise field. |
| `biome_type` | region | enum {alpine, forest, grassland, wetland, arid_steppe, badland, coastal} | Elevation × moisture noise, Whittaker-style lookup. |
| `relic_density` | region (+POIs) | 0–100 | Cluster relic sites in remote/upland/blighted terrain; each POI carries salvage/hazard/contested flags. |
| `population` | settlement (→region) | count | From the **settlement skeleton**: tiers are assigned first (one `prime` at the seat, `hub`s by centrality rank, the rest `outpost`/`holdfast`), then population is a seeded rank-size draw from the tier's band, scaled by local carrying capacity (biome). **The denominator for everything.** The base count never reads a derived attribute; later phases may add a separate `population_adj` migration column. |

> History primitives (`founding_era`, `shock_legacy`) are powerful path-dependence
> levers but are deferred (§7); they belong to the second wave.

> **Seat placement (the honest root of the periphery).** From Phase 2 the default
> (unpinned) seat stops being a uniform random point: it is placed where political
> centers historically arise — high carrying-capacity, low-ruggedness, well-situated
> lowland. Because rich ore disproportionately sits in rugged marginal country and
> the seat deliberately doesn't, the endowment-vs-centrality anti-correlation
> **emerges from two independent, individually innocent choices** — geology that
> ignores politics, and a capital that prefers farmland. No layer is authored
> against the frontier, yet the frontier appears. (Clicking to pin the seat still
> works; the derivation only replaces the default.)

### 3.2 DERIVED socioeconomic outcomes

| property | level | type/scale | generation (1-liner) | tag |
|---|---|---|---|---|
| `centrality_to_seat` | region | 0–100 | Inverted, normalized **cost-distance** from the seat over a friction surface (ruggedness+biome). Master peripherality measure. | EMERGENT |
| `pop_density` | region | persons/area | `population / polygon_area`. The "uneconomic to serve" signal. | EMERGENT |
| `refining_capacity` | region (+facility) | 0–100 | Site few refineries by center-bias (high centrality + water/terrain; deliberately reads **no** social layer, keeping the DAG acyclic) — **NOT** at the ore. The engineered extraction/refining split. | EXPLICIT siting |
| `value_retention` | region | 0–100 | Share of locally-generated resource value that stays local = f(local refining vs raw extraction, centrality). **The core inequity ratio.** | EMERGENT |
| `wealth` (refit) | region | 0–100 | **Reframed as three income streams**: `w_e·(endowment × extraction × value_retention)` (what extraction actually leaves behind) + `w_f·refining value-add` + `w_t·trade/service income (∝ centrality)`, plus a `w_g·capital-gradient` legacy term (default low) and seeded noise. All weights are sliders; at `w_g = 0` wealth is fully emergent. Now able to be high-endowment/low-wealth. | EXPLICIT→EMERGENT |
| `on_conduit` (+`conduit_access`) | settlement/region | boolean (+0–100) | Grow conduit greedily from refineries/seat; connect a node only if `population × wealth` clears `friction × length` (grid-economics threshold). Below → off-grid. | EXPLICIT threshold |
| `arcane_service_index` | settlement/region | 0–100 | Delivered lumen = f(`on_conduit`, distance line-loss, local `wealth` to pay the meter, sanctioned-site bonus). Need is deliberately **not** an input. | EMERGENT |
| `blight_load` | region | 0–100 | Emitted by `refining_capacity`/heavy use; spread by a downhill/downwind kernel **plus** a secondary bias toward low-`wealth` land (dumping). | EXPLICIT dump + EMERGENT transport |
| `disease_burden_per_1k` | settlement/region | rate /1k | Emergent outcome = blight exposure + unsafe water + vulnerability − healing reach; store 2–3 cause components + jitter. | EMERGENT |
| `dominant_bloc` | region | enum {crown, temple, magnate, contested, ungoverned} | argmax of three independent reach fields (Crown distance-decay, Temple sanctioned-site pull, magnate enclave/wealth pull); ties → contested; all low → ungoverned. | EMERGENT |

### 3.3 RELATIONAL / computed (precomputed for headline maps)

| property | level | type/scale | generation (1-liner) |
|---|---|---|---|
| `nearest_facility_distance` | settlement | distance | Distance to closest facility (healing/water/wardline) — feeds isochrone/coverage. |
| `service_gap_idx` | settlement/region | 0–100 | Precomputed coverage gap: inverse of service reach + nearest-facility distance + off-grid status, population-weighted. |
| `injustice_idx` | region | 0–100 or 3×3 bivariate | `normalize(blight_load) × normalize(100 − wealth)` — the "poison lands on the poor" surface. **Presentation-layer only:** the argument rests on the two raw fields (independently generated) and their measured correlation; this column just makes the print layout one-click. |

---

## 4. Causal / emergence map

The spine (read `A, B -> C` as "A and B generate C"):

```
terrain, biome (blind geology)                   -> carrying_capacity, friction
carrying_capacity, friction                      -> seat placement (agrarian core, not ore country)
seat, friction                                   -> centrality_to_seat
aetherstone_endowment (blind geology)            -> extraction (falls where the ore is: the frontier)
centrality_to_seat, water/terrain                -> refining_capacity (center)   [the split; reads no social layer]
extraction, refining_capacity                    -> value_retention (low at frontier)
value_retention, refining_capacity, centrality   -> wealth                       [now emergent]
population, wealth, friction                     -> on_conduit                   [grid economics]
on_conduit, wealth, sanctioned_site              -> arcane_service_index
refining_capacity, elevation/wind, (λ·wealth)    -> blight_load                  [exported downhill; λ = dump-bias knob]
blight_load, water, vulnerability, healing_reach -> disease_burden_per_1k
blight_load, wealth                              -> injustice_idx
Crown/Temple/magnate reach fields                -> dominant_bloc
```

**Canonical generation order (the DAG, run as ONE bounded forward pass):**
seed → topology (Voronoi/Lloyd) → geology (endowment, ruggedness, biome, relics) →
settlement skeleton (tiers, population) → seat resolution → centrality → refining
siting → value_retention → wealth → conduit → arcane services → blight → health →
relational columns. No unbounded fixed-point loops: any feedback is approximated by
this fixed order — optionally with a small *fixed* number of relaxation sweeps, in
the same spirit as the Lloyd's passes: always seeded, always terminating.

**The 3 emergent throughlines to build toward** (each is a chain from fixed
geography to underservice that no single knob authored):

1. **The resource curse (flagship).** Geology is blind to politics, but the seat
   settles in the agrarian core — so the ore-rich margins end up peripheral by
   *consequence*, not by authorship → ore is extracted there but `refining_capacity`
   is sited at the center → `value_retention` collapses at the frontier → `wealth`
   stays low **despite high production**. The headline injustice: rich ground, poor
   people — and no single layer was written to produce it.
2. **Off-grid darkness.** Low `wealth` + low `pop_density` fail the conduit's
   grid-economics threshold → `on_conduit = false` → `arcane_service_index` ≈ 0 →
   no light, no purified water, no wardline, no healing — *regardless of need.*
3. **Exported blight.** `refining_capacity` at the center emits `blight_load` that
   flows **downhill onto the low-wealth frontier**, raising `disease_burden` exactly
   where `arcane_service_index` is lowest. The periphery eats the pollution of a
   prosperity it cannot share.

These three share one root (blind geology + an agrarian-core seat, meeting in
`centrality_to_seat`) and one victim (the frontier), which is why the map reads as a
coherent argument rather than a pile of correlated noise.

---

## 5. What to build next & phasing

One layer at a time, **re-export and re-check in QGIS after each.** Each phase is
chosen to (a) unblock the next and (b) produce at least one new headline map.

- **Phase 1 — the denominator + the root primitive.**
  Add the **settlement skeleton** (every region gets a settlement; tiers assigned
  by the rank-size rule — one `prime` at the seat, `hub`s by centrality, the rest
  `outpost`/`holdfast`), **`population`** drawn per tier (with `pop_density`), and
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
  high carrying capacity, low ruggedness); add `centrality_to_seat` (cost-distance
  backbone), `refining_capacity` (center-biased siting), and `value_retention`;
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
  does **not** require the full road network) → `on_conduit`/`conduit_access` →
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
  at the refineries and the centers eat their own waste. The gap between the two
  runs (≈ 1.4 correlation points) is the measured **policy share** of the
  injustice — an analysis in itself. Implementation note: λ reshapes the
  *allocation weights* of a fixed spoil mass (nearest-land at λ=0 →
  poverty-seeking at λ=1), so the sweep compares identical contamination under
  different victims.

- **Phase 5 — facilities, coverage, health.**
  Place facilities (healing/water/wardline) gated by tier + `on_conduit`; compute
  `nearest_facility_distance`, `service_gap_idx`, and the emergent
  `disease_burden_per_1k`. This is the §8 "facilities + coverage" payload.
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
  worlds; all five categories occur across seeds; the seat answers to the Crown
  (or is contested by the magnates next door) in every test world. Temple reach
  emanates from sanctioned sites planted on remote ore and deep periphery —
  where the sacred substance lies and the Crown's writ is thin — so the
  political map is emergent: no region is assigned a ruler; rulers reach, or
  they don't.

**Scale note:** correlation scatters, Jenks classes, and bivariate maps need sample
size. When Phase 1 lands, raise the default region count to ~24 and the slider cap
toward ~64, and keep one settlement per region so region-level rates have support.
5–12 regions was right for proving the bridge; it is too few to see a distribution.

Each EXPLICIT knob (grid threshold, refining center-bias, blight-dump bias λ,
distance-decay rate, tier→service rationing, `w_g` capital-gradient weight) is a
**slider**, like the existing `wealth bias` — and every knob must have a **defined
neutral zero** where its mechanism is purely physical/emergent: dump-bias 0 → blight
follows only terrain and wind; grid-threshold 0 → the conduit reaches everyone;
`w_g` 0 → wealth is pure economics. Dialing the cruelty down to zero — and watching
how much inequity *remains* — is the project's thesis stated as an experiment.

---

## 6. Headline maps (the proof)

The maps that make the underservice argument undeniable in QGIS:

1. **Resource curse** — bivariate / scatter of `aetherstone_endowment` × `wealth`
   (or `value_retention`): the rich-ground/poor-people cells light up.
2. **Off-grid darkness** — `arcane_service_index` choropleth + conduit service-area
   coverage gap; off-grid settlements highlighted.
3. **Environmental injustice** — `injustice_idx` bivariate (`blight_load` × low
   `wealth`): the poison and the poverty on the same ground.
4. **Disease burden** — `disease_burden_per_1k` (a **rate**, Jenks 5-class,
   sequential ramp), overlaid on coverage gaps.
5. **Who's abandoned** — `dominant_bloc` categorical with `service_gap_idx` overlay:
   the magnate enclave lit beside the company-town hinterland in darkness.

Cartographer's veto, baked into the model: **never map a count as if it were a rate.**
Every count ships with `population` so the analyst divides; small peripheral
settlements must read as loud as the swollen seat.

---

## 7. Deferred & rejected

**Deferred (valuable second-wave depth, not core — many need the network layer
first):** `state_reach_index`, `public_goods_score`, `clientelism_index`,
`voice_deficit`; the sacred set (`sanctity_index`, `pilgrim_flux`, `orthodoxy_gate`,
`temple_welfare_share`, `divine_legitimacy`); the security set (`force_projection`,
`wardline_strength`, `security_status`, `conscription_burden`, `frontier_exposure`);
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
- `darkness` → derived view of `conduit_access`, not its own variable.
- Multiple per-attribute distance-decays → one shared `centrality_to_seat` basis.
- `frontier_index` → a thresholded classifier over centrality, not an independent metric.
- Per-service booleans → folded into one `arcane_service_index` (expose only
  `wardline`/`healing` booleans if a later spatial join needs them).

**Open questions / tradeoffs (decide before Phase 2):**
1. **Circularity — RESOLVED.** The canonical DAG in §4 settles it: one bounded,
   seeded forward pass in a pinned order. The two cycles the panel had introduced
   are broken structurally — refinery siting no longer reads `wealth` (centrality +
   terrain only), and `population` no longer reads `wealth`/`on_conduit`/`blight`
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

## 8. Appendix: panel digest

The frame was set first by the **setting consultant** (world model + binding
glossary above); all lenses built on it. One-paragraph digest per lens:

**Physical & resource base**
- **Geographer.** Owns the cost field. Pushed `terrain_ruggedness` → `friction_cost`
  → `centrality_to_seat` as the spine of distance-decay, plus `site_quality` vs
  situation to find stranded good-site/bad-situation places.
- **Ecologist.** Environment *causes* inequity: `biome_type` and `carrying_capacity`
  cap population (thin places get skipped); `blight_load` is a transported externality;
  `hazard_exposure` is regressive because wardline defense is metered.
- **Resource/energy engineer.** The chain end to end: `aetherstone_endowment`
  (fixed, frontier-biased) → `extraction_intensity` → `refining_capacity` (sited at
  center) → `on_conduit` (grid economics) → `arcane_service_index`. The on/off-grid
  binary is the decisive filter.

**Economy & enterprise**
- **Economist.** `value_retention` and `fiscal_transfer_net` make "produce much, keep
  little" measurable; `gini_local` exposes enclave/hinterland polarization a regional
  mean hides.
- **Entrepreneur.** `opportunity_surface` peaks where `capital_access` bottoms out —
  the "frustrated frontier"; `informal_share` marks economies invisible to credit and tax.
- **Market researcher.** Demand-side deserts: `purchasing_power`, `lumen_price`
  (regressive — costs most where it reaches least), `market_desert`, `information_access`.
- **Industrial engineer.** Siting & throughput: `refinery_capacity` (not at the ore),
  `lumen_consumption`, `industrial_capacity`, and blight as exported externality;
  `supply_chain_fragility` for captive company towns.
- **Logistics analyst.** Connectivity as equity: `conduit_access`/`darkness`,
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
  `wardline_strength` (off-grid = defenseless), `security_status`, `conscription_burden`
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
