# Hinterland — Attribute Model (design)

> Status: design decision, not yet built. Supersedes nothing in the generator
> yet; it tells us **which attributes to add, in what order, and why**. The thin
> slice (Voronoi + `wealth`) and the foundations layer (seeded RNG + parameter
> UI) already exist. This document decides what fills in the socioeconomic model
> on top of them.
>
> Produced from a structured expert panel (≈20 disciplinary lenses) working off a
> single binding setting frame. The full per-lens reasoning is in the appendix.

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

### 3.1 PRIMITIVES (generated first, independent of `wealth`)

| property | level | type/scale | generation (1-liner) |
|---|---|---|---|
| `aetherstone_endowment` | region | 0–100 | Sparse clustered low-frequency noise, thresholded to rare rich pockets; mildly anti-correlated with centrality (ore favors the rugged frontier) **with noise** so some sits near the center. |
| `terrain_ruggedness` | region | 0–100 | Local variance of an elevation noise field. |
| `biome_type` | region | enum {alpine, forest, grassland, wetland, arid_steppe, badland, coastal} | Elevation × moisture noise, Whittaker-style lookup. |
| `relic_density` | region (+POIs) | 0–100 | Cluster relic sites in remote/upland/blighted terrain; each POI carries salvage/hazard/contested flags. |
| `population` | settlement (→region) | count | Rank-size (Zipf) draw from tier, modulated up by `wealth`/`on_conduit`, down by `blight_load`. **The denominator for everything.** |

> History primitives (`founding_era`, `shock_legacy`) are powerful path-dependence
> levers but are deferred (§7); they belong to the second wave.

### 3.2 DERIVED socioeconomic outcomes

| property | level | type/scale | generation (1-liner) | tag |
|---|---|---|---|---|
| `centrality_to_seat` | region | 0–100 | Inverted, normalized **cost-distance** from the seat over a friction surface (ruggedness+biome). Master peripherality measure. | EMERGENT |
| `pop_density` | region | persons/area | `population / polygon_area`. The "uneconomic to serve" signal. | EMERGENT |
| `refining_capacity` | region (+facility) | 0–100 | Site few refineries by center-bias (high centrality, capital, water) — **NOT** at the ore. The engineered extraction/refining split. | EXPLICIT siting |
| `value_retention` | region | 0–100 | Share of locally-generated resource value that stays local = f(local refining vs raw extraction, centrality). **The core inequity ratio.** | EMERGENT |
| `wealth` (refit) | region | 0–100 | **Reframed**: blend of `value_retention`, `refining_capacity`, centrality, with the existing capital-gradient demoted to one term + noise. Now able to be high-endowment/low-wealth. | EXPLICIT→EMERGENT |
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
| `injustice_idx` | region | 0–100 or 3×3 bivariate | `normalize(blight_load) × normalize(100 − wealth)` — the "poison lands on the poor" surface. |

---

## 4. Causal / emergence map

The spine (read `A, B -> C` as "A and B generate C"):

```
aetherstone_endowment, centrality_to_seat       -> extraction (frontier)
extraction, centrality_to_seat, wealth          -> refining_capacity (center)   [the split]
refining_capacity, extraction                   -> value_retention (low at frontier)
value_retention, refining_capacity, centrality  -> wealth                        [now emergent]
population, wealth, friction                     -> on_conduit                    [grid economics]
on_conduit, wealth, sanctioned_site             -> arcane_service_index
refining_capacity, elevation/wind, wealth       -> blight_load                   [exported downhill]
blight_load, water, vulnerability, healing_reach -> disease_burden_per_1k
blight_load, wealth                             -> injustice_idx
Crown/Temple/magnate reach fields               -> dominant_bloc
```

**The 3 emergent throughlines to build toward** (each is a chain from fixed
geography to underservice that no single knob authored):

1. **The resource curse (flagship).** `aetherstone_endowment` is fixed and
   frontier-biased → ore is extracted there but `refining_capacity` is sited at the
   center → `value_retention` collapses at the frontier → `wealth` stays low **despite
   high production**. The headline injustice: rich ground, poor people.
2. **Off-grid darkness.** Low `wealth` + low `pop_density` fail the conduit's
   grid-economics threshold → `on_conduit = false` → `arcane_service_index` ≈ 0 →
   no light, no purified water, no wardline, no healing — *regardless of need.*
3. **Exported blight.** `refining_capacity` at the center emits `blight_load` that
   flows **downhill onto the low-wealth frontier**, raising `disease_burden` exactly
   where `arcane_service_index` is lowest. The periphery eats the pollution of a
   prosperity it cannot share.

These three share one root (`aetherstone_endowment` + `centrality_to_seat`) and one
victim (the frontier), which is why the map reads as a coherent argument rather than
a pile of correlated noise.

---

## 5. What to build next & phasing

One layer at a time, **re-export and re-check in QGIS after each.** Each phase is
chosen to (a) unblock the next and (b) produce at least one new headline map.

- **Phase 1 — the denominator + the root primitive.**
  Add **`population`** (settlement→region, with `pop_density`) and
  **`aetherstone_endowment`** (region primitive). Retire the `capital`/`town`
  placeholders for the 4-tier `settlement_tier` enum.
  *Why first:* `population` unblocks every rate the rest of the model needs, and is
  immediately useful (proportional symbols, density choropleth). `aetherstone_endowment`
  is a trivial noise field that **immediately** yields the first emergent headline —
  an endowment-vs-wealth scatter already shows resource-rich/value-poor cells, even
  before refining is modeled. Lowest risk, highest unblock.

- **Phase 2 — make `wealth` emergent (the intellectual turn).**
  Add `centrality_to_seat` (cost-distance backbone), `refining_capacity`
  (center-biased siting), and `value_retention`; **refactor `wealth`** to blend
  retention + centrality, demoting the capital-gradient to one term. Keep the old
  gradient available as a knob for comparison.
  *Why:* this is where the project stops being a diagram and becomes an argument.

- **Phase 3 — off-grid darkness.**
  Add a **minimal conduit** (a cost-gated minimum spanning tree over settlements —
  does **not** require the full road network) → `on_conduit`/`conduit_access` →
  `arcane_service_index`. Ship the off-grid darkness map.

- **Phase 4 — exported blight.**
  Add `blight_load` (downhill/downwind kernel + dumping bias) and the
  `injustice_idx` bivariate. Ship the environmental-injustice map.

- **Phase 5 — facilities, coverage, health.**
  Place facilities (healing/water/wardline) gated by tier + `on_conduit`; compute
  `nearest_facility_distance`, `service_gap_idx`, and the emergent
  `disease_burden_per_1k`. This is the §8 "facilities + coverage" payload.

- **Phase 6 — governance overlay.** `dominant_bloc` (+ the deferred institutional
  depth as appetite allows).

Each EXPLICIT knob (grid threshold, refining center-bias, blight-dump bias,
distance-decay rate, tier→service rationing) should be a **slider**, like the
existing `wealth bias`, so the user can dial the cruelty and watch the maps respond
— and, crucially, **dial it to zero** to demonstrate the inequity is structural, not
authored.

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
1. **Circularity.** `wealth` will both feed siting and be derived from it. Resolve
   with a **bounded forward pass** (or a few relaxation iterations, like Lloyd's)
   that settles wealth/retention/conduit in a fixed, seeded order — never an
   unbounded loop. Document the generation DAG and order.
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
