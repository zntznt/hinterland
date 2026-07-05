# The QGIS starter bundle

Static styles and a flat CRS so a fresh QGIS project reads like the app's
map instead of random colors and a WGS84 warning. Everything here works on
the two GeoJSON exports plus the six CSVs the **Download tables (CSV)**
button emits; nothing needs a plugin except where noted.

## 1. Load the layers

Drag `hinterland.geojson` into QGIS. It arrives as three layers split by
geometry (polygons / lines / points), each mixing several `kind`s. Split
them properly: right-click a layer → *Filter…* and set, per copy of the
layer you duplicate:

```
"kind" = 'region'        -- polygons: the attribute table
"kind" = 'edge'          -- lines: the full routable cost graph (v38)
"kind" = 'road'          -- lines: the travel network actually built
"kind" = 'settlement'    -- points: the census
```

Any other `kind` (`ridge`, `river`, `conduit`, `bridge`, `pass`, `port`,
`ruin`, …) works the same way. The capital region is `is_capital_region = 1`
— the seat flag lives on the region features, no extra layer needed.

## 2. Assign the CRS (kills the WGS84 warning)

The world is a flat plane, 0–1000, y-up — not Earth. `hinterland.prj`
carries a WKT2 **engineering CRS** ("Hinterland planar grid", metre units,
east/north axes). In QGIS: *Layer Properties → Source → Assigned CRS →
custom → import from* `hinterland.prj` (or *Settings → Custom Projections*
and paste the WKT once, then assign it to every layer and the project).
Distances and areas then measure planar, which is the only correct way to
measure this world.

## 3. Apply the styles

Right-click a layer → *Properties → Symbology → Style → Load Style…*:

| file | apply to | what it is |
|---|---|---|
| `regions-wealth.qml` | regions | graduated fill, the app's wealth ramp, 7 classes |
| `regions-injustice.qml` | regions | graduated fill, the app's injustice ramp, 7 classes |
| `edges-cost.qml` | edges | line width graduated by `cost` — the friction graph made visible |
| `settlements.qml` | settlements | circle size by `population`, labeled by `name` |

The ramps interpolate the same lo→hi colors the app's RAMPS table uses, so
the QGIS map and the browser map argue in the same palette.

## 4. Join the CSVs

The **Download tables (CSV)** button ships the nested provenance as flat
tables: `events.csv`, `epoch_region.csv`, `rulers.csv`, `tensions.csv`,
`treasuries.csv`, `findings.csv`.

- **events.csv** joins to regions on `region_id` (*Layer Properties →
  Joins*, or *Relations* for a one-to-many child table: click a region,
  read its history).
- **epoch_region.csv** is the long table — one row per (region, epoch)
  with `wealth`, `elite_share`, `population`, `dominant_bloc`, `occupied`,
  `toll_burden`. Join it to the epoch-series export for the **Temporal
  Controller**, or feed it straight to **DataPlotly**: log(population) vs
  log(rank) per epoch is the rank-size (Zipf) plot the findings quote.
- **findings.csv** is key/value — the world's own argument, one row per
  claim, including `moran` / `moran_blight` (global Moran's I with its
  permutation p).

## 5. Route on the edges

The `edge` layer is the exact graph the engine computes on: `cost` is the
traversal cost (`base_len` × terrain friction × wall/pass/river/ford
multiplier), and the flags say which rule fired. QGIS *Network Analysis*
(shortest path, service area) over `cost` reproduces `centrality_to_seat`
and the toll walk; deleting a pass edge and re-routing is the "close the
pass" counterfactual the field guide describes.
