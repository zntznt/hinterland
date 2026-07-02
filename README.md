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
   QGIS splits it into two layers by geometry: **regions** (polygons) and
   **settlements** (points).
2. **CRS:** coordinates are a **flat plane, 0–1000 in fictional units** — not
   Earth. QGIS will assume WGS84; that is fine as long as you measure planar:
   either set *Project Properties → General → measurements* to planimetric, or
   assign any projected CRS to the layers and ignore the georeferencing.
3. **Choropleth:** regions layer → *Symbology → Graduated* → value `wealth`
   (or `aetherstone_endowment`, `pop_density`) → Natural Breaks (Jenks), 5 classes.
4. **Proportional symbols:** settlements layer → *Graduated* by **size** on
   `population` — or *Categorized* on `tier`.
5. **The Phase 2 check (the resource curse):** scatter or bivariate
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

**Settlement features (Point):**

| property | type | meaning |
|---|---|---|
| `name` | string | placeholder name |
| `tier` | enum | `prime` \| `hub` \| `outpost` \| `holdfast` |
| `region_id` | int | containing region |
| `population` | int | settlement population (log-uniform within tier band) |
| `wealth` | 0–100 | its region's wealth |

**Schema history:**
- **v3** made `wealth` emergent (three weighted income streams + legacy gradient
  term; weights recorded in the provenance member), added region columns
  `terrain_ruggedness`, `fertility`, `centrality_to_seat`, `refining_capacity`,
  `value_retention`, and switched the default (unpinned) seat to agrarian-core
  placement. Old share links still work but produce v3 wealth semantics.
- **v2** renamed settlement tiers `capital`/`town` →
  `prime`/`hub`/`outpost`/`holdfast` and added `population`, `pop_density`,
  `aetherstone_endowment`, and `schema_version`. Restyle any QGIS project that
  categorized on the old tier values.
