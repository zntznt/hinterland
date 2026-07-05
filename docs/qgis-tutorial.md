# Learn QGIS with Hinterland

A hands-on course for people who have **never opened QGIS**. You will learn QGIS
by mapping a real dataset: a Hinterland world you export from the app. By the end
you will be able to load the data, color a map by any measure, filter it, compute
new columns, ask spatial questions, animate a thousand years of history, and
export a finished map you can share.

Written for **QGIS 3.34 LTR** (the Long Term Release, free from
[qgis.org](https://qgis.org)). Menu names may differ slightly in other versions.
Menu paths are written like **Layer ▸ Add Layer ▸ Add Vector Layer…**

## Before you begin

1. Install QGIS 3.34 LTR from qgis.org.
2. Open the Hinterland app, click **Download GeoJSON**, and save
   `hinterland.geojson` somewhere you can find it.
3. For Lesson 13 (animation) you will also need **Download epoch series**
   (`hinterland-epochs.geojson`), but you do not need it yet.

You do not need to read the README or the field guide first. Come back to them
when a lesson points you there.

## How this course works

Each lesson teaches **one** QGIS skill and uses one Hinterland measure as the
example. Lessons build in order: do them top to bottom the first time. Every
lesson has the same shape:

- **Goal:** what you will have made by the end.
- **You'll learn:** the one new skill.
- **Before you start:** what must already be done.
- **Steps:** numbered, one action each. Click the **bold** things.
- **Checkpoint:** what a correct result looks like.
- **Why this matters:** what the map is telling you. This is the one place this
  course gets poetic; the [field guide](field-guide.md) carries the full argument.
- **Try it yourself:** one variation to do on your own.
- **Troubleshooting:** the usual mistakes and their fixes.

A glossary of QGIS words is at the [bottom](#glossary). Every term is also
explained the first time it appears.

---

# ACT I: See the map

## Lesson 1: Open your first Hinterland map

**Goal:** get a Hinterland world onto the screen.
**You'll learn:** how to load a data file into QGIS.
**Before you start:** QGIS installed; `hinterland.geojson` downloaded.

**Steps**

1. Open QGIS. You get an empty grey canvas and a **New Empty Project**.
2. Find `hinterland.geojson` in your file browser.
3. Drag the file onto the QGIS canvas and let go.

**Checkpoint**

You should see a cluster of colored shapes, the regions of a world, with dots and
lines on top. If you see shapes, you are done. It does not matter yet that the
colors look random; QGIS picked them, not the data.

**Why this matters**

That shape is a whole society: who is rich, who is poor, where the roads run.
Right now it is just geometry. The rest of the course is about making it speak.

**Try it yourself**

Drag the file in a second time. Notice a second copy appears in the list on the
left. Delete it: right-click the copy ▸ **Remove Layer…**. Removing a layer does
not touch the file on disk.

**Troubleshooting**

- *Nothing appeared.* The file may not have finished downloading, or you dropped
  it outside the canvas. Try **Layer ▸ Add Layer ▸ Add Vector Layer…** and browse
  to the file instead.

---

## Lesson 2: The Layers panel, and why one file became three

**Goal:** understand the list of layers and control what draws on top.
**You'll learn:** the Layers panel: visibility and draw order.
**Before you start:** Lesson 1 done.

When you dropped in one file, QGIS created **three layers** from it. A *layer* is
one set of shapes you can style on its own. QGIS split the file by shape type:
**areas** (the regions), **lines** (roads and the power grid), and **points**
(towns and other places).

**Steps**

1. Find the **Layers** panel, the list on the left. If it is missing, turn it on
   with **View ▸ Panels ▸ Layers**.
2. You should see three entries, all named `hinterland …`. Each has a checkbox.
3. Untick the **points** layer (the one with dots). The dots vanish.
4. Untick the **lines** layer. The roads vanish.
5. Untick the **regions** (areas) layer. The map is now empty.
6. Tick all three back on.
7. Drag the **points** layer to the **top** of the list. Layers draw bottom-up,
   so the top of the list is the front of the map. Points on top means towns are
   never hidden under region colors.

**Checkpoint**

Toggling each layer shows exactly one kind of thing appearing and disappearing:
areas, then lines, then dots. With points at the top of the list, the dots sit in
front of everything.

**Why this matters**

Hinterland ships one file so it is easy to hand to someone. QGIS unpacks it into
the three natural map layers, because you style areas, lines, and points
differently. Almost every later lesson says "on the regions layer" or "on the
settlements layer," and now you know why there is more than one.

**Try it yourself**

Put the regions layer at the top of the list. Watch it cover the towns and roads.
Then move it back to the bottom. This is why draw order matters.

**Troubleshooting**

- *I only see one layer.* Some QGIS builds group the three under one expandable
  entry. Click the small arrow beside it to reveal the parts.
- *A dialog asked me to choose sublayers when I dragged the file in.* That is
  QGIS offering the three geometry types. Select all of them (or click **Add
  Layers**) and you get the same three layers.

---

## Lesson 3: Click a region and read its numbers

**Goal:** read the data behind a single region.
**You'll learn:** the Identify Features tool.
**Before you start:** Lesson 2 done.

Every shape carries data: a row of *attributes* (named values like `wealth` or
`name`). The gentlest way to see them is to click one shape.

**Steps**

1. In the **Layers** panel, click the **regions** layer once to select it. Tools
   act on the selected layer.
2. On the toolbar, click the **Identify Features** tool (the blue circle with a
   white *i*), or press **Ctrl+Shift+I**.
3. Click the biggest, most central region on the map.
4. A panel opens on the right listing that region's attributes. Scroll it.

**Checkpoint**

You can read values like `wealth`, `population`, `name`, and
`is_capital_region`. If you clicked the capital, `is_capital_region` is `1`.

**Why this matters**

This is the whole idea of GIS in one click: a shape on a map is also a row of
data. The capital is rich because the model made it rich, and you can read the
number that says so.

**Try it yourself**

Click a small region out on the edge. Compare its `wealth` and `population` to
the capital's. The gap you just read by hand is what the maps ahead will show at
a glance.

**Troubleshooting**

- *Clicking does nothing.* You probably have a different layer selected, or a
  different tool active. Select the regions layer, click Identify Features again,
  then click the map.

---

## Lesson 4: This world is not Earth: set up honest measurements

**Goal:** make QGIS measure distances correctly on Hinterland's flat world.
**You'll learn:** what a CRS is, and how to measure planar.
**Before you start:** Lesson 3 done.

A **CRS** (coordinate reference system) tells QGIS what the coordinates mean.
Hinterland's coordinates are a flat plane from 0 to 1000 in made-up units, not
latitude and longitude on a round Earth. QGIS assumes Earth by default and may
warn you. That warning is expected here and safe, as long as you tell QGIS to
measure on a flat plane. There are two fixes; do the first, and reach for the
second only if the warnings annoy you.

**Steps (fix 1: measure planar)**

1. Open **Project ▸ Properties…**
2. Go to the **General** tab.
3. Find the **Measurements** section and set **Ellipsoid** to **None /
   Planimetric**. This tells QGIS to measure straight-line distance on a flat
   plane, with no Earth-curvature correction.
4. Click **OK**.
5. On the toolbar, click the **Measure Line** tool (a ruler).
6. Click one town, then double-click a second town to finish. Read the distance.

**Steps (fix 2, optional: stop the warning for good)**

7. If a projection warning keeps popping up and you would rather it stopped,
   right-click the **regions** layer ▸ **Set CRS ▸ Set Layer CRS…** and choose any
   projected system whose units are meters (for example **EPSG:3857**). Repeat for
   the other layers. QGIS now treats the plane as flat by default and stops
   warning. The numbers are still map units, not real meters, which is fine.

**Checkpoint**

The measured distance is a plain number in map units (somewhere between 0 and
about 1400, the diagonal of the world). It is not in kilometers, and that is
correct.

**Why this matters**

Hinterland is a fictional world, so there is no real projection for it, and that
is fine. Distances and areas are still exact as long as you measure on the flat
plane. Set this once and every later distance, area, and buffer is trustworthy.

**Try it yourself**

Measure from the capital to the farthest region you can see. That crow-flies
distance is exactly what several Hinterland findings compare against travel cost.

**Troubleshooting**

- *A red projection warning keeps popping up.* It is harmless. Dismiss it, or do
  the optional fix 2 above to silence it permanently.

That ends Act I. You can now load, navigate, inspect, and measure. Next you make
the map say something.

---

# ACT II: Make the map say something

## Lesson 5: Open the attribute table

**Goal:** see every region's data at once and link the table to the map.
**You'll learn:** the attribute table: sorting, selecting, and reading summary
statistics.
**Before you start:** Lesson 4 done.

**Steps**

1. In the **Layers** panel, right-click the **regions** layer ▸ **Open Attribute
   Table**. A spreadsheet opens: one row per region, one column per attribute.
2. Click the **wealth** column header once to sort ascending, again for
   descending. The richest region is now at the top.
3. Click the row number on the left of that top row to select it. It turns blue.
4. Look at the map: the selected region is highlighted in yellow.

**Checkpoint**

Sorting by `wealth` reorders the rows, and clicking a row lights up the matching
region on the map. The table and the map are two views of the same thing.

**A useful side panel: quick statistics**

Turn on **View ▸ Panels ▸ Statistics**. Pick the regions layer and the `wealth`
field. You instantly get the min, max, mean, median, and sum. Now you can say
"the richest region is three times the mean," not just "it looks high." You will
use this to sanity-check every map you make.

**Why this matters**

The attribute table is where Hinterland's claims live. Everything the world
"argues" is a column you can sort, compare, and check. From here on, the map is
just a way of looking at this table.

**Try it yourself**

Sort by `population` instead. Is the biggest town also the richest region? Select
the top few rows and see where they sit on the map.

**Troubleshooting**

- *The whole map turned yellow.* You selected all rows. Click **Deselect All
  Features** (top of the attribute table) and try one row.

---

## Lesson 6: Filter: split the mixed layers on `kind`

**Goal:** show only the roads, or only the towns, from a mixed layer.
**You'll learn:** filtering a layer with an expression.
**Before you start:** Lesson 5 done.

The lines layer holds both the power grid (the *conduit*) and the roads. The
points layer holds towns, service buildings, and shrines. To style one, you first
isolate it with a *filter*: a condition on a column.

**Steps**

1. In the **Layers** panel, right-click the **lines** layer ▸ **Filter…**. The
   Query Builder opens.
2. In the box at the bottom, type: `"kind" = 'road'`
   (double quotes around the column name, single quotes around the text value).
3. Click **Test** to see how many features match, then **OK**. The map now shows
   roads only.
4. To confirm what other values exist, reopen **Filter…**, double-click **kind**
   in the Fields list, click **All** under Values, and you will see `road`,
   `conduit`, and so on.

**Checkpoint**

Only roads draw on the lines layer. A small funnel icon appears next to the layer
name, marking it as filtered.

**Why this matters**

Every settlement is on a road; only some are on the power grid. Being able to
show one network at a time is the first step to Hinterland's sharpest point: the
periphery is reachable but unserved.

**Try it yourself**

Change the filter to `"kind" = 'conduit'` to see the grid alone. Then, on the
**points** layer, set `"kind" = 'settlement'` to show towns only. **Keep this
settlement filter in place; Lesson 8 needs it.** To reach just the healers among
the service points, the filter is `"facility_type" = 'healer'`.

**Troubleshooting**

- *"kind" is not a field.* You opened Filter on the wrong layer. The `kind`
  column is on the lines and points layers, not the regions layer.
- *Nothing matches.* Check your quotes: column names use `"double"`, text values
  use `'single'`.

To remove a filter later, open **Filter…** and clear the box.

---

## Lesson 7: Color regions by a measure (the choropleth)

**Goal:** shade regions light-to-dark by `wealth`.
**You'll learn:** Graduated symbology with Natural Breaks.
**Before you start:** Lesson 6 done. Regions layer present.

A *choropleth* is a map that colors areas by a value. In QGIS this is the
**Graduated** style.

**Steps**

1. Right-click the **regions** layer ▸ **Properties…** ▸ **Symbology** tab.
2. At the top, change the renderer dropdown from **Single Symbol** to
   **Graduated**.
3. In **Value**, choose **wealth**.
4. In **Color ramp**, pick a sequential ramp (for example, a single-hue
   light-to-dark green).
5. Set **Mode** to **Natural Breaks (Jenks)** and **Classes** to **5**. Natural
   Breaks groups the numbers where they naturally cluster.
6. Click **Classify**, then **OK**.

**Checkpoint**

Regions are now five shades: the richest are darkest, the poorest are palest, and
a legend of five ranges appears under the layer name.

**Save your work now**

You have made your first real map. Save the whole project so nothing is lost when
you close QGIS: **Project ▸ Save As…** and save `hinterland.qgz`. This file
remembers every layer, filter, style, and setting. Reopen it any time. (Note: new
columns you add in the Field Calculator later are saved into the GeoJSON itself;
everything else lives in this project file.)

**Picking the right color ramp**

The ramp is not decoration, it is part of the argument. Three rules cover almost
everything:

- **Sequential** (light to dark, one hue) for low-to-high values like `wealth`.
- **Diverging** (two hues meeting at a neutral middle) for change around zero,
  like `wealth - wealth_t0`. Set the middle at zero so growth and decline read as
  opposite colors.
- **Categorical** (distinct hues) for named types like `biome`. That is a
  different renderer, coming in Lesson 8.

Prefer a colorblind-safe ramp such as **Viridis** for sequential data.

**Why this matters**

This is the picture the whole project exists to draw: wealth is not spread
evenly, and where it pools is not random. You are looking at manufactured
inequality.

**Try it yourself**

Reopen Symbology and change **Value** to `aetherstone_endowment` (ore richness),
then to `pop_density`. One dropdown, a whole new map. Notice the app only ever
showed you one of these at a time; the file you exported carries dozens of
columns, and here you can reach them all.

**Troubleshooting**

- *Everything is one color.* You skipped **Classify**, or Classes is set to 1.
  Set 5 and click Classify.
- *The colors went onto the wrong shapes.* You opened Properties on the points or
  lines layer. Use the regions layer.

---

## Lesson 8: Categories and sized dots

**Goal:** color regions by a named type, and size towns by population.
**You'll learn:** Categorized symbology; graduated symbol size.
**Before you start:** Lesson 7 done. **You also need the points layer filtered to
settlements** (from Lesson 6). Do step 1 below to be sure.

Some columns are not numbers but named types (an *enum*), like `biome` or
`dominant_bloc`. Those use **Categorized**, not Graduated.

**Steps (make sure you have a settlements layer)**

1. Right-click the **points** layer ▸ **Filter…** and confirm the box reads
   `"kind" = 'settlement'`. If it is empty, type that in and click **OK**. Without
   this, you will style shrines and facilities as if they were towns and get a
   wrong-looking map.

**Steps (categories)**

2. Right-click the **regions** layer ▸ **Properties…** ▸ **Symbology**.
3. Change the renderer to **Categorized**.
4. Set **Value** to **biome**.
5. Click **Classify**. QGIS finds every biome and gives each a color and a legend
   entry.
6. Click **OK**.

**Steps (sized dots)**

7. Right-click the **settlements** layer ▸ **Properties…** ▸ **Symbology**.
8. Change the renderer to **Graduated**, set **Value** to **population**, and
   change **Method** from **Color** to **Size**.
9. Click **Classify**, then **OK**.

**Checkpoint**

Regions show discrete biome colors with a named legend. Town dots are now sized
by population: big cities are large circles, hamlets are small.

**Readable overlays**

Now that you have towns drawn over colored regions, the overlay can get muddy. If
the top layer hides too much, open its **Properties ▸ Symbology**, and lower
**Layer Rendering ▸ Opacity** to about 60%, or set the **Blend mode** to
**Multiply** so the colors underneath show through. Use this whenever a lesson
says "overlay" something.

**Why this matters**

The blocs (`dominant_bloc`) show who governs where; the town sizes show a city
hierarchy no one designed. Both are outcomes the model grew, not values it
painted.

**Try it yourself**

Categorize regions on `dominant_bloc` instead of `biome`. For a sharper version,
try the **Rule-based** renderer (the dropdown above Categorized): style the port
and pass points by `held_by`, give each owner its own symbol, and add a rule
`"held_by" = 'none'` set to no symbol so only held gates show. Rule-based is
Categorized with a filter built into each rule.

**Troubleshooting**

- *Sizing by population made a color map.* You left **Method** on **Color**.
  Switch it to **Size**.
- *One category is missing a color.* Click **Classify** again to repopulate.
- *The town dots look wrong or some are huge blanks.* Your points layer is not
  filtered to settlements. Redo step 1.

---

## Lesson 9: Put names on the map

**Goal:** label towns with their names and bynames.
**You'll learn:** labels and a simple label expression.
**Before you start:** Lesson 8 done.

**Steps**

1. Right-click the **settlements** layer ▸ **Properties…** ▸ **Labels** tab.
2. Change **No labels** to **Single Labels**.
3. Set **Value** to **name**. Click **OK**. Town names appear.
4. To add the byname, reopen **Labels**, click the **ε** (expression) button next
   to Value, and enter:
   `name || coalesce(', ' || epithet, '')`
   The `||` joins text; `coalesce` skips the byname when a town does not have one.
5. Click **OK**.

**Checkpoint**

Towns are labeled, and towns with a byname read like "Ashford, the Ashen" while
plain towns show just their name.

**Why this matters**

Every name in the world is grown from its own geology and history. A town called
"the Ashen" is a poisoned one, and the label proves it: the byname is computed
from the same columns you can see in the table.

**Try it yourself**

Label the sanctioned-site points (filter `"kind" = 'sanctioned_site'`) with the
expression `'Shrine of ' || site_name`.

**Troubleshooting**

- *Labels overlap into a mess.* In the Labels tab, open **Rendering** and turn on
  the option to drop overlapping labels, or label only the biggest towns with a
  rule.
- *The expression box shows red.* Check the quotes and the `||` spacing; the
  expression preview at the bottom tells you what is wrong.

---

# ACT III: Compute, combine, animate

## Lesson 10: The Field Calculator: make a new column and prove it right

**Goal:** compute a column yourself and check it against the export.
**You'll learn:** the Field Calculator.
**Before you start:** Lesson 9 done.

Many Hinterland columns are *derived*: computed from other columns and exported
so you can re-derive them and confirm they match. That check is the best way to
learn the Field Calculator, because you get a clear pass or fail.

**Steps**

1. Right-click the **regions** layer ▸ **Open Attribute Table**.
2. Click the **Field Calculator** button in the table toolbar (an abacus icon),
   or press **Ctrl+I**.
3. Tick **Create a new field**. Name it `darkness`, type **Decimal (double)**.
4. In the expression box, enter: `100 - "conduit_access"`
5. Click **OK**. QGIS puts the layer into **edit mode** and adds the `darkness`
   column.
6. Click the **pencil (Toggle Editing)** button in the table toolbar to save. When
   the pencil is off, the change is written to the file. (Editing a GeoJSON
   rewrites the file on disk, which is fine here.)

**Checkpoint**

The `darkness` column holds a value for every region: high where the grid does
not reach. You can now graduate the map on `darkness` just like any other column.

**The proof exercise**

7. Open the Field Calculator again. New field `class_gap_check`, type Decimal.
8. Enter: `(elite_share / elite_pop_pct) / ((100 - elite_share) / (100 - elite_pop_pct))`
9. Click **OK**, toggle the pencil off to save, then compare `class_gap_check` to
   the exported `class_gap` column. They match to the last digit.

**Why this matters**

Nothing here is painted. When your hand-computed column equals the one in the
file, you have proven the map is doing real arithmetic, not decoration. This is
the difference between trusting a picture and checking one.

**Try it yourself**

Compute `wealth - "wealth_t0"` into a new field (remember to toggle the pencil off
to save) and graduate the map on it with a diverging ramp: who grew richer since
the founding, and who fell.

**Troubleshooting**

- *The new column is empty or read-only in the next lesson.* You did not save the
  edit. Reopen the table and click the pencil (Toggle Editing) off.
- *Values look wrong.* Check field names against the attribute table headers;
  QGIS is case-sensitive.

---

## Lesson 11: Compare two measures on one map

**Goal:** map change over time and see two variables together.
**You'll learn:** differencing columns; a two-variable view.
**Before you start:** Lesson 10 done.

You already have the founding state in the file: columns ending `_t0` are the
world at year zero. So you can compare "then" and "now" without a second file.

A true single-map bivariate choropleth needs a plugin, so this lesson uses two
honest routes that need nothing extra: a difference map, and side-by-side maps.
Hinterland also ships a precomputed combined column as a shortcut.

**Steps (the change map)**

1. If you did the "Try it yourself" in Lesson 10, you already have
   `wealth - "wealth_t0"`. If not, compute it now (Lesson 10 steps, and save).
2. Graduate the regions on that column (Lesson 7), but pick a **diverging** color
   ramp (for example, brown to blue-green) so growth and decline read as opposite
   colors. Set the class breaks so zero sits at the color midpoint.

**Steps (two variables side by side)**

3. Duplicate the regions layer: right-click ▸ **Duplicate Layer**. Graduate one
   copy on `blight_load` and the other on `wealth`, and place them side by side
   (you will export this pair in Lesson 12).
4. As a single-map shortcut, Hinterland precomputes `injustice_idx` (blight times
   poverty). Graduate on that one column to see the combined pattern with no
   plugin.

**Checkpoint**

The change map shows some regions clearly gaining and others losing, in opposite
colors. The blight-versus-wealth comparison shows the poison landing on the
poorer regions.

**Why this matters**

That the poison lands on the poor is a policy, not a law of nature. Re-export the
world with dump bias 0 and the pattern flips. The gap between the two maps is the
measured cost of the policy.

**Try it yourself**

Compute `population - "population_t0"` and map it. People drain along the roads
toward the rich core; the change map shows the drain as a pattern.

**Troubleshooting**

- *Growth and decline are hard to tell apart.* Use a diverging ramp, not a
  sequential one, and set the class breaks so zero sits at the color midpoint.

---

## Lesson 12: Ask a spatial question (buffer and select by location)

**Goal:** find which towns fall inside, outside, or near something on the map.
**You'll learn:** Processing tools: Buffer and Select by Location.
**Before you start:** Lesson 11 done.

Everything so far has been attribute work, the kind of thing a spreadsheet could
almost do. This lesson is what makes it GIS: asking a question about *where*
things are, not just what their values are. The question here is the project's
Phase 5 thesis in one map: **who cannot reach a healer?**

**Steps (draw the service areas)**

1. Filter a copy of the points layer to healers: duplicate the points layer,
   right-click ▸ **Filter…**, enter `"facility_type" = 'healer'`, click **OK**.
2. Open the **Processing Toolbox** (**View ▸ Panels ▸ Processing Toolbox**, or the
   gear icon).
3. Search for **Buffer** and open **Vector geometry ▸ Buffer**.
4. Set **Input layer** to the healers, **Distance** to a coverage radius (try
   120 map units), and click **Run**. A ring appears around each healer. This is
   why you set planimetric measurement back in Lesson 4: the ring is a real
   distance on the flat plane.

**Steps (find who is outside)**

5. In the Processing Toolbox, search for **Select by location** and open it.
6. Set **Select features from** to the settlements layer, the geometric predicate
   to **are disjoint** (meaning "do not touch"), and **By comparing to** the
   healer buffer layer. Click **Run**.
7. The selected settlements (highlighted) are every town outside all healer
   rings: the underserved.

**Checkpoint**

A cluster of towns lights up, and they sit out on the periphery, away from the
healers. Open the attribute table and click **Show Selected Features** to read
how many, and their `disease_burden_per_1k`.

**Why this matters**

The burden lands exactly where care cannot reach. You just measured a coverage
gap spatially, instead of reading the app's precomputed `service_gap_idx` and
trusting it. This is the move that turns a map-colorer into an analyst.

**Try it yourself**

Buffer the `ridge` lines instead, select the settlements **within** the buffer,
and compare that set to the ones where the exported `range_shadow` column is 1.
You are checking the app's own flag against a spatial answer you computed.

**Troubleshooting**

- *Select by location selected nothing.* Check the predicate. "Are disjoint"
  finds features outside; "intersect" finds features inside or touching.
- *The buffer looks tiny or huge.* The distance is in map units (Lesson 4), not
  meters or kilometers. Adjust and rerun.

---

## Lesson 13: Animate a thousand years

**Goal:** play the world's history as a moving map.
**You'll learn:** the Temporal Controller.
**Before you start:** Lessons 1–12 done. Download `hinterland-epochs.geojson`
from the app (set epochs to 8 or more first).

This uses the *second* file: the epoch series, where every region and town is
repeated once per time step, tagged with a date.

**Steps**

1. Drag `hinterland-epochs.geojson` into QGIS. As before it splits into layers.
2. Right-click the regions layer of the epoch series ▸ **Properties…** ▸
   **Temporal** tab.
3. Tick **Dynamic Temporal Control**, choose **Single field with date/time**, and
   set the field to **epoch_date**. Click **OK**.
4. Repeat steps 2–3 for the settlements layer.
5. For the **conduit** layer, do the same, but also tick **Accumulate features
   over time**. A power line, once built, stays built; without Accumulate it would
   blink out each frame.
6. Open the Temporal Controller: **View ▸ Panels ▸ Temporal Controller**, or the
   clock icon on the toolbar.
7. Click the **animation** mode (the play-arrow settings), set the range to the
   world's span (about 1000 to 1300), and the step to **25 years**.
8. Press **Play**.

**Checkpoint**

The map moves: region colors shift as wealth compounds, town dots swell and
shrink, and the power grid crawls outward and stays drawn.

**Why this matters**

Every earlier map was a single frozen year. This is the model actually running,
the loops that make inequality compound playing out in front of you. The last
frame is exactly the world you have been mapping all along.

**Try it yourself**

Graduate the animated regions on `wealth` (Lesson 7) before pressing Play, so the
animation shows wealth changing, not just shapes.

**Troubleshooting**

- *Nothing moves when I press Play.* Each layer needs its own Temporal setting;
  the controller alone does nothing. Recheck every animated layer.
- *The power grid disappears between frames.* You missed **Accumulate features
  over time** on the conduit layer.

---

## Lesson 14: Make a map you can share (Print Layout)

**Goal:** export a finished, titled map image.
**You'll learn:** the Print Layout composer.
**Before you start:** any styled map from Act II, ideally the `blight_load` vs
`wealth` pair from Lesson 11.

Every map so far has lived only on your screen. The Print Layout is where you turn
one into a PNG or PDF you can put in a document or hand to someone.

**Steps**

1. Style the map you want in the main window first (the composer shows whatever
   the layers currently look like).
2. Open **Project ▸ New Print Layout…**, give it a name, click **OK**. A blank
   page opens.
3. Click **Add Item ▸ Add Map**, then drag a rectangle on the page. Your map
   appears inside it.
4. Click **Add Item ▸ Add Legend**. It reads your layer's classes automatically.
5. Click **Add Item ▸ Add Scale Bar**. Set its units to **Map Units** (this world
   is not in kilometers).
6. Click **Add Item ▸ Add Label** for a title; type something like "Where the
   blight falls."
7. Export with **Layout ▸ Export as Image…** (PNG) or **Export as PDF…**.

**Checkpoint**

You have an image file with the map, a legend, a scale bar, and a title, saved
where you can open or send it.

**Why this matters**

This is the artifact the whole exercise was for. A map on screen persuades no
one; a labelled export of the blight-versus-wealth comparison is the "measured
policy share" the field guide keeps pointing at, in a form you can actually
share.

**Try it yourself**

Add a second **Add Map** item on the same page and point it at the other layer,
so the `blight_load` and `wealth` maps sit side by side under one title: the money
shot in a single image.

**Troubleshooting**

- *The map item is blank.* Click it, and in **Item Properties** make sure it is
  set to the main map and the extent covers your world (use **Set Map Extent to
  Match Main Canvas**).
- *The legend lists layers I do not want.* In the legend's **Item Properties**,
  untick **Auto update** and delete the entries you do not need.

---

## Where to go next

You can now do every operation the [field guide](field-guide.md) asks for. Use it
as your recipe book: it names, for each question about the world, the column to
map and the style to use. You already know how to do all of them.

The [recipe appendix](#appendix-recipes) below is a quick lookup. Beyond that,
when you are ready, three intermediate directions this dataset rewards:

- **Atlas:** in the Print Layout, an Atlas generates one titled map page per
  region or per bloc automatically, using the per-region data. A great capstone
  once you are comfortable with layouts.
- **Data-defined symbology:** the ε button that set label text in Lesson 9 also
  sets symbol size and color, so a symbol can be a live function of a column.
- **Spatial statistics:** plugins and the Python console can measure whether
  `wealth` and `blight_load` are statistically clustered (Local Moran's I / LISA),
  which turns "it looks clustered" into a tested result.

---

## Appendix: recipes {#appendix-recipes}

Once you have finished the course, these are the one-line versions. "Graduate"
means Lesson 7, "Categorize" Lesson 8, "Filter" Lesson 6, "Field calc" Lesson 10,
"Select by location" Lesson 12.

| Question | Column(s) | Technique |
|---|---|---|
| Who holds the coin? | `wealth` | Graduate |
| Did the gap grow? | `wealth - wealth_t0` | Field calc, then Graduate (diverging) |
| Rich ground, poor people? | `aetherstone_endowment` vs `wealth` | Two maps, or `injustice_idx` |
| Who is off the grid? | `on_conduit` | Categorize; overlay conduit (Filter) |
| Who governs where? | `dominant_bloc` | Categorize |
| Who gets sick, who gets care? | `disease_burden_per_1k` + healer points | Graduate + Buffer + Select by location |
| The mountain's shadow | `range_shadow` | Filter `= 1`, compare `wealth` |
| Who drinks last? | `downstream_blight` | Graduate; overlay rivers |
| Who pays at the gates? | `toll_burden`, `held_by` | Graduate; Rule-based on gates |
| Class inside the walls | `elite_share`, `class_gap` | Graduate; Field calc to verify |
| The occupied realm | `occupied` | Filter `= 1`; compare `value_retention` |
| The census undercounts | `legibility_gap`, `uncounted_population` | Graduate; Field calc corrected rates |
| The shadow economy | `smuggling_intensity`, `black_market_index` | Graduate |
| How the world changes | epoch series | Temporal Controller |

For the meaning of any column, see the schema table in the
[README](../README.md).

---

## Glossary {#glossary}

- **Attribute:** a named value on a feature (a column in the table), like
  `wealth`.
- **Buffer:** a zone drawn a set distance around a feature (a ring around a
  point).
- **Choropleth:** a map that colors areas by a value. Made with Graduated.
- **CRS:** coordinate reference system; what the coordinates mean. Hinterland's is
  a flat fictional plane, not Earth.
- **Categorized:** a style that gives each named type its own color.
- **Enum:** a column of named types (`biome`, `tier`) rather than numbers.
- **Feature:** one shape and its row of data (one region, one town).
- **Field Calculator:** the tool that makes a new column from an expression.
- **Filter:** showing only the features that match a condition.
- **Graduated:** a style that shades features light-to-dark by a number.
- **Layer:** one set of shapes you can style on its own.
- **Natural Breaks (Jenks):** a way to choose color ranges where the data
  clusters.
- **Planimetric:** measuring on a flat plane, with no Earth-curvature correction.
  Correct for Hinterland.
- **Processing Toolbox:** the panel of analysis tools (Buffer, Select by location,
  and hundreds more).
- **Renderer:** the rule that decides how a layer is drawn (Single Symbol,
  Graduated, Categorized, Rule-based).
- **Select by location:** selecting features by their spatial relationship to
  another layer (inside, outside, near).
