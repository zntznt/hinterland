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
(organic↔even), capital wealth bias, and the capital position (click the map).
The preview-layer radio only changes the on-screen choropleth; the export always
carries every column.

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
5. **The Phase 1 check:** style regions by `aetherstone_endowment` and compare
   with the `wealth` choropleth — the two should look unrelated (geology is
   generated blind). That independence is the baseline the later emergent
   phases build on.

## Export schema (v2)

The FeatureCollection carries a top-level `hinterland` member with
`schema_version` and the exact generator parameters (seed, regions, relax, bias,
capital) — every file can reproduce its world.

**Region features (Polygon):**

| property | type | meaning |
|---|---|---|
| `region_id` | int | stable id within the file |
| `wealth` | 0–100 | socioeconomic index (explicit capital-gradient for now; emergent in Phase 2) |
| `is_capital_region` | 0/1 | region containing the prime settlement |
| `population` | int | settlement + rural population |
| `pop_density` | float | persons per 100×100 cell of the planar world |
| `aetherstone_endowment` | 0–100 | ore richness — blind geology, independent of every social layer |

**Settlement features (Point):**

| property | type | meaning |
|---|---|---|
| `name` | string | placeholder name |
| `tier` | enum | `prime` \| `hub` \| `outpost` \| `holdfast` |
| `region_id` | int | containing region |
| `population` | int | settlement population (log-uniform within tier band) |
| `wealth` | 0–100 | its region's wealth |

**Schema history:** v2 renamed settlement tiers `capital`/`town` →
`prime`/`hub`/`outpost`/`holdfast` and added `population`, `pop_density`,
`aetherstone_endowment`, and `schema_version`. Restyle any QGIS project that
categorized on the old tier values.
