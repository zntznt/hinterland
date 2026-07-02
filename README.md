# Hinterland

A procedural **region-scale map generator** that bakes **socioeconomic structure**
into the worlds it generates, and exports **GeoJSON** for analysis in QGIS.
Client-side, one file, no build step, no backend.

- **Run it:** open `index.html` directly from disk (needs internet once, for the
  d3-delaunay CDN), or host it on GitHub Pages.
- **Design docs:** [`docs/attribute-model.md`](docs/attribute-model.md) — the
  attribute model, the causal/emergence map, and the build phasing.

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
5. **The W4 check (the uncounted):** choropleth `legibility_gap` — the census
   undercounts exactly where need is greatest, so **every per-capita map you
   have made so far is optimistic**. Recompute any rate with
   `population + uncounted_population` in the field calculator and put the
   official and corrected maps side by side: the correction is largest in the
   places already worst off. Also worth a look: `social_trust` vs
   `kinship_reliance` (near-perfect mirrors — where the state fails, kin
   absorb it), `mobility_ceiling` (ore-only frontier: born labor, die labor),
   `segregation_index` (refinery enclaves standing apart from their
   surroundings), and `tenure_regime` (whose land the registry recognizes).
6. **The W3 check (the past sits on the land):** choropleth
   `abandonment_index` — the dark patches are old ore country
   (`exhausted_lode = 1`, real blind geology that feeds no income today) whose
   value left and whose people stayed. Categorize `founding_era` to see the
   settlement cohorts, `shock_legacy` for the scars (collapses at the dead
   lodes, plagues at the worst blight, wars on the bloc seams), and scatter
   `legacy_advantage` × `wealth` to watch head starts persist. Every column is
   exactly recomputable from the other exported fields.
7. **The W2 check (the shadow is the state's negative image):** choropleth
   `enforcement_gap` next to `force_projection` — the lawless hinterland is
   the exact complement of where the garrisons (`kind = 'garrison'`, G) can
   reach. Style `smuggling_intensity` and watch the contraband corridors
   thread between patrol umbrellas; `predation_risk` picks out the
   busy-but-unguarded roads; `black_market_index` is a per-capita reliance
   index (multiply by `population` in the field calculator for volume) and
   correlates ≈ −0.9 with `arcane_service_index` — the shadow prices the
   underservice. `security_status` gives the categorical version.
8. **The W1 check (two networks, one lie):** style roads by `road_class`
   (width) or graduated on `traffic`, and overlay the conduit. **Every**
   settlement is on the road network — connection is universal, because people
   walk. The conduit is what gets rationed. That side-by-side is the sharpest
   version of the underservice argument: the periphery isn't unreachable, it's
   *unserved*. Then choropleth `market_access` (Hansen gravity over road
   costs) and `pilgrim_flux` (through-traffic to the sanctioned sites — the
   on-route economy the bypassed never see).
9. **The Phase 6 check (who governs whom):** categorize regions on
   `dominant_bloc` (5 classes). The Crown holds the center, the magnates hold
   the refinery districts, the Temple holds its sanctioned sites (▲ points,
   `kind = 'sanctioned_site'`) out on the ore and the margins — and between
   them lie `contested` seams and `ungoverned` hinterland. Overlay
   `service_gap_idx` to ask the panel's question: *which bloc neglects most?*
   The reach fields behind the classification (`centrality_to_seat`,
   `temple_reach`, `magnate_reach`) are all exported, so the argmax is
   auditable.
10. **The Phase 5 check (the payload — who gets sick, who gets care):**
   choropleth `disease_burden_per_1k` (a rate — Jenks, 5 classes, sequential
   ramp) and overlay facility points filtered to `facility_type = 'healer'`.
   The burden concentrates exactly where `healing_reach` collapses — the
   high-burden/low-care quadrant is the whole project's thesis in one map. The
   cause components (`burden_env_per_1k`, `burden_water_per_1k`,
   `burden_unmet_per_1k`) let you attribute each region's sickness to blight,
   unsafe water, or structural vulnerability as small multiples. For coverage:
   `service_gap_idx` choropleth, or buffer the healer points for a service-area
   view and see who falls outside.
11. **The Phase 4 check (environmental injustice):** choropleth `blight_load`
   and bivariate it against `wealth` (or just map the precomputed
   `injustice_idx`). Under the default dump bias the blight–wealth correlation
   is strongly **negative** — the poison lands on the poor. Re-export at
   dump bias 0 and the correlation **flips positive**: with no dumping policy
   the spoil stays at the refineries and the centers eat their own waste. That
   sign flip, side by side in a print layout, is the measured *policy share*
   of the injustice.
12. **The Phase 3 check (off-grid darkness):** style regions by
   `arcane_service_index`, overlay the conduit lines, and categorize settlements
   by `on_conduit` — the dark periphery is exactly where the grid's economics
   said "not worth it" (`population × wealth` below the threshold), never a
   hand-picked list. Compute darkness as `100 - "conduit_access"` in the field
   calculator if you want the negative image. Sweep the grid-threshold slider
   (0 = everyone connected) and re-export to watch darkness spread.
13. **The Phase 2 check (the resource curse):** scatter or bivariate
   `aetherstone_endowment` × `wealth` — under default weights a visible share of
   high-endowment regions sits below median wealth: rich ground, poor people,
   and no layer was authored to produce it (ore is blind noise; the seat prefers
   farmland; refining follows centrality). Also worth a look: choropleth
   `centrality_to_seat` (the cost-distance backbone) and `value_retention`
   (who keeps the value their ground generates), and check the seat sits in
   high-`fertility`, low-`terrain_ruggedness` land.

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
| `dominant_bloc` | enum | `crown` \| `temple` \| `magnate` \| `contested` \| `ungoverned` — argmax of the three reach fields (crown reach = `centrality_to_seat`); close top-two → contested, all weak → ungoverned |
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

**Settlement features (Point):**

| property | type | meaning |
|---|---|---|
| `name` | string | placeholder name |
| `tier` | enum | `prime` \| `hub` \| `outpost` \| `holdfast` |
| `region_id` | int | containing region |
| `population` | int | settlement population (log-uniform within tier band) |
| `wealth` | 0–100 | its region's wealth |
| `on_conduit` | 0/1 | mirrors its region |
| `arcane_service_index` | 0–100 | mirrors its region |
| `nearest_facility_distance` | cost-dist | to the closest facility of any type |
| `nearest_healer_dist` | cost-dist | to the closest healer (0 if one is local) |
| `disease_burden_per_1k` / `service_gap_idx` | rate / 0–100 | mirror their region |

**Conduit features (LineString):** `edge_class` (`trunk` \| `branch`),
`from_region`, `to_region`.

**Facility features (Point):** `facility_type` (`healer` \| `waterworks` \|
`wardstation`), `region_id`. Rationed by the planner's rule: prime always;
hubs only when on-conduit; wardstations additionally guard refinery regions.

**Sanctioned-site features (Point):** `region_id`. Temple holy places, planted
where the sacred substance lies and the Crown's writ is thin (remote ore, deep
periphery); the source points of `temple_reach`.

**Garrison features (Point):** `region_id`. Crown force anchors — the seat plus
the busiest corridors near the core; the source points of `force_projection`.

**Road features (LineString):** `road_class` (`highway` \| `road` \| `track`,
assigned by traffic rank), `traffic` (0–100, gravity flows routed over
least-cost paths — the busy edges are the chokepoints), `from_region`,
`to_region`. The road network spans **every** settlement; only the conduit is
rationed.

**Schema history:**
- **v11** (second wave W4, completing the wave) added social texture:
  `segregation_index`, `mobility_ceiling`, `social_trust`, `kinship_reliance`,
  `cultural_distance`, `tenure_regime`, `legibility_gap`,
  `uncounted_population`.
- **v10** (second wave W3) added deep time: `exhausted_lode`, `founding_era` +
  `founding_age`, `legacy_advantage`, `shock_legacy` + `shock_severity`,
  `abandonment_index`, `tenure_churn`.
- **v9** (second wave W2) added security + the shadow economy: garrison Point
  features and region columns `force_projection`, `wardline_strength`,
  `security_status`, `smuggling_intensity`, `predation_risk`,
  `black_market_index`, `enforcement_gap`.
- **v8** (second wave W1) added the road network: road LineString features
  (`road_class`, `traffic`), region columns `market_access`, `pilgrim_flux`.
- **v7** added the governance overlay: `temple_reach`, `magnate_reach`,
  `dominant_bloc` region columns and sanctioned-site Point features.
- **v6** added facilities + health: facility Point features, region columns
  `healing_reach`, `safe_water`, `vulnerability_idx`, the three burden cause
  components, `disease_burden_per_1k`, `service_gap_idx`; settlement columns
  `nearest_facility_distance`, `nearest_healer_dist` + burden/gap mirrors.
- **v5** added exported blight: region columns `elevation`, `blight_load`,
  `injustice_idx`; `dump_bias` (λ) and `wind_deg` in provenance.
- **v4** added the conduit: LineString features (`edge_class`, `from_region`,
  `to_region`), region/settlement columns `on_conduit`, `conduit_access`,
  `arcane_service_index`, and the `grid_threshold` knob in provenance.
- **v3** made `wealth` emergent (three weighted income streams + legacy gradient
  term; weights recorded in the provenance member), added region columns
  `terrain_ruggedness`, `fertility`, `centrality_to_seat`, `refining_capacity`,
  `value_retention`, and switched the default (unpinned) seat to agrarian-core
  placement. Old share links still work but produce v3 wealth semantics.
- **v2** renamed settlement tiers `capital`/`town` →
  `prime`/`hub`/`outpost`/`holdfast` and added `population`, `pop_density`,
  `aetherstone_endowment`, and `schema_version`. Restyle any QGIS project that
  categorized on the old tier values.
