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
   QGIS splits it by geometry: **regions** (polygons), the **conduit** (lines),
   and one point layer holding both **settlements** and **facilities** — filter
   on `kind` (or `facility_type`) to separate them.
2. **CRS:** coordinates are a **flat plane, 0–1000 in fictional units** — not
   Earth. QGIS will assume WGS84; that is fine as long as you measure planar:
   either set *Project Properties → General → measurements* to planimetric, or
   assign any projected CRS to the layers and ignore the georeferencing.
3. **Choropleth:** regions layer → *Symbology → Graduated* → value `wealth`
   (or `aetherstone_endowment`, `pop_density`) → Natural Breaks (Jenks), 5 classes.
4. **Proportional symbols:** settlements layer → *Graduated* by **size** on
   `population` — or *Categorized* on `tier`.
5. **The Phase 5 check (the payload — who gets sick, who gets care):**
   choropleth `disease_burden_per_1k` (a rate — Jenks, 5 classes, sequential
   ramp) and overlay facility points filtered to `facility_type = 'healer'`.
   The burden concentrates exactly where `healing_reach` collapses — the
   high-burden/low-care quadrant is the whole project's thesis in one map. The
   cause components (`burden_env_per_1k`, `burden_water_per_1k`,
   `burden_unmet_per_1k`) let you attribute each region's sickness to blight,
   unsafe water, or structural vulnerability as small multiples. For coverage:
   `service_gap_idx` choropleth, or buffer the healer points for a service-area
   view and see who falls outside.
6. **The Phase 4 check (environmental injustice):** choropleth `blight_load`
   and bivariate it against `wealth` (or just map the precomputed
   `injustice_idx`). Under the default dump bias the blight–wealth correlation
   is strongly **negative** — the poison lands on the poor. Re-export at
   dump bias 0 and the correlation **flips positive**: with no dumping policy
   the spoil stays at the refineries and the centers eat their own waste. That
   sign flip, side by side in a print layout, is the measured *policy share*
   of the injustice.
7. **The Phase 3 check (off-grid darkness):** style regions by
   `arcane_service_index`, overlay the conduit lines, and categorize settlements
   by `on_conduit` — the dark periphery is exactly where the grid's economics
   said "not worth it" (`population × wealth` below the threshold), never a
   hand-picked list. Compute darkness as `100 - "conduit_access"` in the field
   calculator if you want the negative image. Sweep the grid-threshold slider
   (0 = everyone connected) and re-export to watch darkness spread.
8. **The Phase 2 check (the resource curse):** scatter or bivariate
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

**Schema history:**
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
