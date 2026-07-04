# Hinterland

A procedural **region-scale map generator** that bakes **socioeconomic structure**
into the worlds it generates, and exports **GeoJSON** for analysis in QGIS.
Client-side, one file, no build step, no backend.

- **Run it:** open `index.html` directly from disk (needs internet once, for the
  d3-delaunay CDN), or host it on GitHub Pages.
- **Design docs:** [`docs/attribute-model.md`](docs/attribute-model.md) — the
  attribute model, the causal/emergence map, and the build phasing.
- **The field guide:** [`docs/field-guide.md`](docs/field-guide.md) — **start
  here to analyze a world**: the eleven inequalities, which lens/column/finding
  shows each one, the experiment that isolates it, and the linkage table
  auditing that every mechanical feature feeds at least one measured
  inequality (the handful that don't are presentation, listed, on purpose).
- **The atlas:** [`docs/atlas.md`](docs/atlas.md) — a calibration sweep of 80
  worlds (schema v34) and the archetypal extremes it found — the world that
  closed its gap, the company country a region map lies about, the occupied
  realm, the town that freed itself — each one click away with its own
  chronicle line.

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
5. **The P2 check (the two levers):** institutions and isolation are
   dials now, both in provenance and the share link. **Responsiveness**
   (`responsiveness`, default 45): P(reform) = the slider; the next 30
   points are reaction; the rest is silence. At the default the dice are
   byte-identical to every world ever rolled; at 0 the seat never
   reforms (measured 0/N worlds); at 100 every wounded world gets its
   mercy (N/N) — and the same seeds run a mean **0.058 gini lower**
   under the listening seat, because the granary, the only measure that
   ever closes a gap, hangs on the seat's ear. **Close the harbors**
   (`harbors_closed`): no ports are chartered — no sea trade, no port
   tolls, and NO DOOR FOR THE DOMINION (0/N arrivals sealed vs ~60%
   open). The measured price of isolation is real but small (~0.6
   median coastal wealth): this realm's wealth is mineral, not
   maritime — the chronicle calls the sealing safety bought with
   poverty, and the ledger calls it cheap. Geology untouched: the sea
   is still there; the realm just refuses it.
6. **The U2 check (the surface catches up):** the app now shows what it
   computes. **Click any region** for its full ledger — the land, the
   coin (wealth, retention, tolls, tribute), the two rows (the owners'
   share and the per-head gap), the state's reach, the people, what
   stands there by name, the gates it pays on the road to the seat, and
   every event that ever struck it. Pinning the capital is now an armed
   action (a button, then a click) so plain clicks inspect. **Thirteen
   new lenses** under grouped headings (THE ARGUMENT / LAND / COIN /
   STATE / PEOPLE): elevation, ruggedness, temperature, rainfall,
   fertility, retention, tolls, tribute, sea access, wealth-since-
   founding, smuggling, trust, mobility. Categorical legends carry named
   swatches. The **counterfactual menu** generalizes C1: λ = 0, the full
   grid (threshold 0), or both mercies at once — each verified byte-
   equal to a fresh world at those knobs. Roads draw by the **traffic**
   the model always computed, and the scrubber animates the
   **occupation** (the flag goes up in the year it went up — which
   exposed and fixed a second stage-3 purity leak: the occupied flag was
   reset after the founding snapshot, so re-runs leaked last run's
   occupation into frame zero of the series; the purity byte-test now
   covers the series too).
7. **The M1 check (the map is a map):** the physical world now survives
   contact with a cartographer. **The sea is a coastline**: the shore
   shelf's reach and steepness wander along the coast (bays reaching a
   median ~150 units inland, headlands, the occasional skerry), sea
   polygons carry **island holes** (GeoJSON polygons with interior rings;
   `islands` counts them), and the sea level **negotiates** — it lowers
   itself until every region keeps dry ground, and a town sunk in a
   noise pit raises a **holm** (a small island under the town). **No
   town, ruin, tower, or shrine stands in the water** — a permanent
   invariant tested on every stress config. **Places are places**:
   harbors sit at the waterfront (the cell's lowest boundary point),
   ruins/towers/shrines at their own dry sites away from the town — load
   the point layers over the polygons and nothing hovers. **Mountains
   are mass**: hachure strokes down the flanks, ▲ peaks, fine display
   contours; the ridge axis survives only as a faint dashed guide under
   its name. Region anchors moved off wet centroids (the anchor is a
   town site), so every euclidean column keeps recomputing from the
   settlement points the file actually carries.
8. **The C1 check (the counterfactual — the λ experiment on the page):**
   under the Dump bias slider, one button re-runs THIS world at **λ = 0**
   — same rock, same wind, same dice; only the spoil routing differs —
   and shows the two injustice maps side by side with the numbers: the
   poorest fifth's blight burden, the plague count, the gini, as rolled
   vs physics-only. On the default world the dumping alone adds 0.6× to
   the poorest fifth's burden and **five of its nine plagues**. The gap
   between the maps is a policy. The panel's λ=0 numbers are byte-equal
   to a fresh world generated at db=0 (tested), and opening the exhibit
   leaves the world as rolled **byte-untouched**. C1 also fixed a real,
   silent bug this feature depended on: the loop wrote ore depletion
   back into the founding endowment, so after any ep>0 render, dragging
   any society slider recomputed the world on **mined-out ground** — the
   screen and its own share link disagreed. Stage 3 is now a pure
   function of (geology, knobs), proven by an in-page-equals-fresh-boot
   byte test. Exports from fresh loads were never affected (no schema
   change).
9. **The Z1 check (the founding centuries — the census is grown, not
   painted):** settlement sizes are no longer dealt from tier bands. Every
   region starts as a hamlet and the centuries before year 1000 run the
   same physics as the recorded epochs, blind to wealth: compound growth
   on land quality, migration along the ROADS toward the bigger market
   (log-damped agglomeration + preferential attachment; distance shields
   the remote hamlet from being emptied), a floor under the smallest.
   Plot log(population) against log(rank) on the settlements layer: a
   line no one drew. `findings.zipf` carries the fit — full-system slope
   `alpha` (median ≈1.2, Zipf's constant is ≈1), `tail_alpha` and
   `tail_r2` (the big-town tail is straight at ≈0.91 — hamlets deviate,
   cities obey, as in the world we live in), and `primacy` — all exactly
   recomputable from the exported settlement populations. **Tiers are now
   labels for the outcome**: the seat is prime by office; everyone else
   ranks by what they grew to, and the suite recomputes every tier from
   the exported sizes. Moving the capital now re-grows the census around
   the new seat (the seat's pull is physics) at the same realm scale.
10. **The X1 check (the Dominion — sovereignty is the last inequality):**
   in roughly half of all worlds with time and a harbor, an empire from
   beyond the sea lands at the realm's best quay (an `annexation` event;
   `hinterland.dominion` carries the arrival epoch, the foothold, and the
   occupied count — landlocked coasts and harbors inside the maelstrom's
   reach are shielded: the whole world has a geographic lottery of its
   own). Categorize `dominant_bloc`: occupied ground reads **`dominion`**.
   Filter `occupied = 1` and check three things the columns prove: the
   occupied country keeps the **smallest share of its own value**
   (`value_retention` cut at annexation), carries the **best wires in the
   realm** (`occupied = 1 ⇒ on_conduit = 1`, the extractive corridor — an
   ENCLAVE grid running to the quay, not the seat), and pays
   `tribute_burden = 3` while the free realm pays the Crown's assessment
   (crown-bloc 1, everyone else 2 — the Crown shields its own; sovereignty
   inequality reproduces the domestic hierarchy). Gates on occupied ground
   read `held_by = "dominion"` — tolls paid to a power no one in the realm
   can petition, banked by no one in it. `findings.sovereignty` states the
   ledger (retention ratio, the corridor, the growth gap, and the
   **comprador ratio**: the occupied owners' row out-holds the free
   realm's — the occupation does not replace the owners, it hires them).
   A won revolt on occupied ground is a **liberation** (`occupied = 0`
   with `occupied_epoch` kept as the scar).
11. **The S1 check (the skyway — geography is destiny only for those who
   can't afford to leave it):** load the `skyport` points and `skylane`
   lines: lift lanes chartered at the founding by the same ledger logic
   that rations the conduit — an aerie goes where flight beats the ground
   by the most and where there is value worth moving (wealth, ore, the
   works), which is exactly the far, walled, rich country, because a lane
   to the easy lowland saves nothing. Choropleth `sky_advantage` (exactly
   recomputable from `seat_cost_ground` and `seat_cost_sky`): the deep
   end of the ramp pools **behind the wall** — the mean advantage in the
   mountains' shadow beats the open country's in ~85% of worlds (median
   ~44%), while the median region gains nothing; the lanes serve the
   tail, which is the point. The catch is the boarding rule, and the
   boarding rule is CLASS: aeries are owners' districts (`elite_pop_pct`
   counts them; the aerie accrues elite share each epoch), so the twins
   finding splits by row — `findings.sky.twin_sky` is how much of the
   wall the shadow twin's owners simply fly over while its labor walks
   the pass. The skyway touches ONLY the class ledger: wealth, migration,
   and every event history are byte-identical to v29.
12. **The H1 check (class exists — within the walls):** every region is now
   two peoples under one name: the owners' row and the labor it hires.
   Choropleth `elite_share` (the owners' slice of the region's coin —
   founded on pure structure: the works, the claimed seams, the court; then
   moved by the same history as everything else, with **no new dice**) and
   set it beside `wealth`: the company town is rich AND owned.
   `elite_pop_pct` and `class_gap` are **derived and exactly recomputable**
   (tier + works + harbor; owners' coin per owner over labor's coin per
   laborer — field-calc it yourself and diff). The findings carry the
   two-level ledger: `gini_people` (population-weighted gini over the 2N
   class rows) against `gini_between_people` (the same gini with each
   region collapsed to one people) — and `within_pct`, the share of the
   realm's person-level inequality a region map **cannot see** (median
   ≈37% under the grown census — a third to a half; it measured ≈58%
   under the old authored tier bands, and Z1's realistic city sizes
   legitimately shifted weight to the between-place spread). `owners`
   says who owns the realm
   (~5% of the people hold ~53% of the coin, `class_gap` ≈24× apart);
   `company_town` names the sharpest concentration. The epoch series
   carries `elite_share` per frame: watch a won revolt burn the charters
   (−25), a plague make labor scarce and dear (−8), a crushed rising
   expropriate under the garrison (+10).
13. **The G4 check (rock, rain, and what follows):** geology is now a causal
   chain of shapes, not parallel noise. Load the **sea** polygons (an
   irregular coastline flooded from a per-world `hinterland.sea_level`),
   the **contour** MultiLineStrings (elevation levels including the
   shoreline), and choropleth the new climate columns — `temperature`
   (latitude minus mountain lapse, corr with latitude ≈ −0.85) and
   `rainfall` (moisture marched in against the wind, raining out on the
   windward slopes). Categorize `biome` (alpine / badland / moor / marsh /
   forest / steppe / grassland — **exactly recomputable** from the ordered
   rules over temperature, rainfall, elevation, and the river) and check
   `fertility`: it is now **derived** — 0.5·rain + 0.3·warmth + floodplain −
   altitude — so any farm traces back to a rainfall pattern, a mountain, a
   plate. The rain shadow is the sharpest new lottery: the findings carry
   `rain_split` (median rainfall either side of the first ridge — the wall
   that cuts you off from trade also decides whether you get rain), and
   `on_coast` now means your cell touches the actual water shape.
14. **The V1 check (histories diverge):** the criticism this phase answers —
   "the same story is told regardless of how it's rolled" — is now a tested
   falsehood. `hinterland.findings` carries `gini_t0` and `gini` (exactly
   recomputable from `wealth_t0` / `wealth`) and a `turning` point: across a
   sweep, some worlds **close their gap**, some **entrench**, some hold —
   and the cause is always in the timeline. The counter-currents: the
   **leveling plague** (survivors charge more: +15 permanent retention),
   **reform and reaction** two epochs after the first wound (Dumping Reform,
   Grid Charter, Toll Amnesty, Retention Act, or the Crown Granary — the
   only measure that ever closes a gap is the one that moves coin downhill
   — versus entrenched dumping and toll crackdowns, all of which shift the
   loop's own parameters mid-run), and the **revolt** — the periphery's one
   rising per run, `outcome` won (a free town: keeps what it makes, tolls
   no one, and may frighten the seat into a concession) or crushed (a
   garrison after the hangings). Filter events on `reform` / `reaction` /
   `revolt` and join against the gini trajectory: the fork is the finding.
15. **The A1 check (the argument surface):** the app now says what it
   measures. `hinterland.findings` in the provenance carries this world's
   thesis claims — the poorest fifth's blight against the richest fifth's,
   the mountain-shadow earnings gap, the darkness count and its burden
   ratio, who drinks the river last, who pays the gates, and **the twins**
   (the sharpest same-distance pair across the wall, drawn as a red line on
   the preview) — every one *exactly recomputable from the exported
   columns*, and the same numbers appear in the on-page findings panel and
   in the chronicle's closing section, "What the Record Shows." In QGIS,
   recompute any finding from the file and it will match to the digit.
16. **The E5 check (the powers have faces):** the provenance carries
   `hinterland.rulers` — three full lines (Sovereign / Hierarch / First
   Magnate) with `name`, `from_epoch`, `contested`, reigns of 3–7 epochs
   drawn blind. `succession` events are **courtly**: they carry a faction
   and a ruler, never a region — power changes hands in a room, not on a
   map. A contested succession (~30%) freezes that faction's seizures for
   the year and raises its tension with both rivals: cross the succession
   epochs against the seizure/war timeline and watch rivals move on a
   divided house. The chronicle is dated by the reigning Sovereign, and the
   founding three rulers are byte-stable across epoch settings of a seed.
17. **The F3 check (defeat is an institution):** the winter after every war
   with room in the record, a `treaty` event lands (epoch = war + 1, same
   two `factions`, plus `winner`, `ceded`, `tribute`): the winner is
   whichever power brings more to the battlefield — live reach plus ledger
   depth — the loser cedes up to two of its held gates nearest the field
   (watch `held_by` flip on the asset layers), and half its treasury moves
   to the victor's. **Victory compounds**: the tribute funds the winner's
   next seizure, so the oligarchy loop runs through war as well as
   commerce. Join `treaty.winner` against the final `held_by` map and
   `hinterland.treasuries` — the peace explains the ownership map better
   than the war does.
18. **The F2 check (money begets reach begets money):** the provenance now
   carries the ledgers — `hinterland.treasuries` (every held gate pays its
   holder 3 per epoch; each seizure debits 12, and a fat ledger lowers the
   next seizure's bar) and `hinterland.tensions` (the three faction pairs:
   +25 when one seizes from the other, +1.2 per epoch per contested region
   where the two claims meet, −8%/epoch decay). The oligarchy loop is
   measurable: in acquisitive worlds the deepest ledger ends holding the
   most gates (~79%). And wars are **policy, not weather**: a pair past the
   tension bar fires the war machinery within two epochs, the battlefield
   prefers contested ground where THAT pair meets, and every `war` event
   carries its two `factions` — join them against `dominant_bloc` and the
   front line explains itself.
19. **The F1 check (the blocs become agents):** the chokepoints are now
   OWNED — style `held_by` on the bridge/pass/port layers (crown / temple /
   magnate / none) and read `hinterland.events` for the `seizure` entries
   (each carries a `faction`): the ownership map is a history of takings,
   not a paint job. Choropleth `toll_burden` — every held gate on a
   region's least-cost paths to the seat and to its port levies — against
   `wealth − wealth_t0`: the taxed roads grow slower (corr ≈ −0.19) while
   the gate towns bank the difference. Watch the tower lifecycle in the
   timeline too: `tower_raised` where governance keeps failing,
   `tower_burned` when Crown force or Temple reach closes in — and the
   burned region's black market and trust heal, because the exports carry
   the final state.
20. **The P1 check (the wild layer):** everything on the map before this was
   infrastructure obeying a ledger; the wild layer is the objects that
   don't. Overlay **ruins** (◆ — `ruin_type` = delve / tomb / deadhold, with
   `peril` and `yield`), **towers** (♜), **bridges** (═) and the
   **maelstrom** (◉) on the shadow-economy maps: ruin hosts sit in the
   high-predation/high-black-market quadrant (~70%), tower hosts are
   low-trust and high-black-market (measured 21/21 — the `social_trust`
   penalty is exactly recomputable: any tower point within 220 planar units
   of the settlement anchor), and deadholds carry a founding blight scar
   (7/7 above median). Choropleth `delver_flux` for the poverty-driven
   traffic to the ruins — risk is a wage. River banks are now fords (×2.2)
   except at bridge towns (`has_bridge = 1`): bridge towns out-earn their
   bridgeless river peers in ~88% of worlds. Ruins, bridges, and the
   maelstrom are blind geology — knob-stable; towers are sited on the
   founding political map (state failure is a social fact, so the tower
   moves when the state does).
21. **The G3 check (the double lottery):** the map now has TWO geographic
   poles — the seat and the sea. Overlay the **coast** lines and **port**
   points (⚓, `port_name`), choropleth `sea_access` (exp-decayed
   cost-distance from the harbors over the same friction graph — the
   mountains block the way to the water too), and cross it with
   `range_shadow`: **open-and-coastal out-earns walled-and-inland in ~93% of
   worlds**. A region's fate is the sum of its lotteries, both drawn at the
   founding. Ports are sited on geology alone (flat, low coast, river-mouth
   bonus) so in a share of worlds the harbor IS the poisoned mouth — it
   drinks the river last and ships it first; check `is_port = 1 AND
   on_river = 1` against `downstream_blight`. `on_coast` is exactly
   recomputable: does the region's ring touch an exported `sea_sides` edge?
22. **The G2 check (who drinks first):** overlay the **river** lines on a
   `downstream_blight` choropleth — the poison accumulates down the chain, so
   the mouth drinks what every town and works upstream let fall in
   (`river_pos` gives the drinking order; the max load sits in the lower
   half of ~100% of chains). The column is exactly recomputable:
   `blight_load − downstream_blight` is the pre-river field; re-run the
   carriage (30% shipped per region, ×0.75 decay per step) along
   `river_pos`. Rivers are conductors — floodplain fertility plus ×0.6 barge
   edges pull the seat, the roads, and the money into the valleys (riverine
   regions out-earn dry ones in ~80% of worlds), which is exactly what makes
   the downstream seat at the mouth so bitter. Where a river cuts a ridge it
   opens a **gorge** — pass-grade crossing the traffic also threads.
23. **The G1 check (geography is destiny):** overlay the **ridge** lines and
   **pass** points on the wealth choropleth, then categorize regions on
   `range_shadow` — same distance from the seat, different fate: at matched
   crow-flies distance the shadowed region is poorer in ~93% of pairs and cut
   out of the market in ~98% (the wall multiplies edge costs ×4.5 except at
   the passes, and every social outcome flows through that graph). Style
   roads by `traffic` and watch ~98% of wall-crossing flow thread the passes
   — chokepoints you can point at (`is_pass = 1` regions). `range_shadow` is
   exactly recomputable: does the straight line from the settlement anchor to
   the seat cross an exported ridge LineString? The mountains are drawn in
   the blind-geology stage — sliders and capital moves never move them.
24. **The E3 check (the world names itself):** categorize settlements on
   `name_register` — the map has a linguistic geography, and it tracks the
   **ore, not the border**: frontier-register names (hard, clipped) sit on
   high founding endowment or rugged ground, lowland-register names (soft,
   agrarian) on the settled core, exactly recomputable from `endowment_t0`
   and `terrain_ruggedness`. Names are walked by an order-2 Markov chain
   over invented corpora, unique per world, and byte-stable across capital
   moves, weight changes, and epoch settings of a seed. Label the
   `sanctioned_site` layer with `site_name` for the shrines' liturgical
   dedications ("Shrine of " || "site_name" in the label expression).
25. **The D6 check (events cause events):** history is no longer a set of
   independent dice — read `hinterland.events` as a causal chain. An
   **`ore_strike`** whose epicenter is *contested* ground guarantees and
   accelerates the **`war`** (the rush arrives, then the armies; the war lands
   within two epochs of the strike). And the faith arrives where the suffering
   is: two epochs after the run's first wound (`blight_plague` or
   `relic_calamity`), the Temple **consecrates** the ground —
   `event_type = 'consecration'`, a new `sanctioned_site` point appears,
   `temple_reach` hits 100 there, pilgrim routes re-aim, and `dominant_bloc`
   re-contests around the live shrine set. Filter the epoch series to the
   frames around a wound and watch the shrine appear two frames later.
26. **The D3 check (history with dates):** the provenance member now carries an
   `events` timeline, and regions carry `event_type` / `event_epoch` /
   `event_severity`. Filter the epoch series to the frames around an event and
   watch the aftermath: a **refinery collapse** kills a region's income and
   blight plume and orphans its trunk conduit (ghost infrastructure); a
   **blight plague** empties a poisoned town and hands it to the drain spiral;
   a **relic calamity** leaves a permanent scar in the blight field. Deep-past
   `shock_legacy` is reconstruction; `event_*` is lived history — a region can
   have both (a plagued refinery town whose works later close keeps its full
   story in the timeline, latest event in its columns). And capital doesn't
   die, it moves: two epochs after a collapse a **replacement refinery**
   (`refinery_founded`) opens where the money went, with a trunk hookup and a
   fresh blight plume. Politics are live too — `dominant_bloc` re-contests
   whenever the refinery set changes, and `bloc_changes` counts each region's
   actual changes of ruler during the run. D5 completes the repertoire:
   **`ore_strike`** (a hidden lode — blind geology, always there, just unfound —
   surfaces and a rush begins) and **`war`** (live politics chooses the
   battlefield: the most valuable *contested* region burns, its capacity is
   permanently wounded, and the Crown garrisons it *after* the blood).
27. **The D2 check (watch it happen):** set epochs to 8+, click **Download
   epoch series**, and load `hinterland-epochs.geojson`. On each layer open
   *Properties → Temporal → Single field with date/time* → field `epoch_date`
   (for the conduit, enable *Accumulate features over time* so built lines
   persist). Open the **Temporal Controller** (clock icon), set the range to
   1000–1300 with a 25-year step, and press play: wealth compounds, ore dies,
   the blight re-targets, the grid crawls outward, settlements swell and
   hollow. In the browser, the same history is on the **View epoch** scrubber.
   One epoch = 25 fictional years; frame 0 is the founding, the last frame is
   exactly the main export.
28. **The D1 check (time makes the loops real):** export the same seed at
   `epochs = 0` and `epochs = 8+` and compare. Choropleth
   `wealth − wealth_t0` (field calculator) to watch the compounding; map
   `boom_bust` for the trajectory categories; `ore_depleted` marks the mines
   that died *during* the run, and `abandonment_index` is now true hysteresis
   (`peak_wealth − wealth`). The drain spiral is visible as
   `population − population_t0` flowing along the roads toward the lit core.
   The founding geology is preserved in `endowment_t0` — identical across all
   epoch settings of the same seed, so the dynamics are auditable against a
   fixed world.
29. **The W4 check (the uncounted):** choropleth `legibility_gap` — the census
   undercounts exactly where need is greatest, so **every per-capita map you
   have made so far is optimistic**. Recompute any rate with
   `population + uncounted_population` in the field calculator and put the
   official and corrected maps side by side: the correction is largest in the
   places already worst off. Also worth a look: `social_trust` vs
   `kinship_reliance` (near-perfect mirrors — where the state fails, kin
   absorb it), `mobility_ceiling` (ore-only frontier: born labor, die labor),
   `segregation_index` (refinery enclaves standing apart from their
   surroundings), and `tenure_regime` (whose land the registry recognizes).
30. **The W3 check (the past sits on the land):** choropleth
   `abandonment_index` — the dark patches are old ore country
   (`exhausted_lode = 1`, real blind geology that feeds no income today) whose
   value left and whose people stayed. Categorize `founding_era` to see the
   settlement cohorts, `shock_legacy` for the scars (collapses at the dead
   lodes, plagues at the worst blight, wars on the bloc seams), and scatter
   `legacy_advantage` × `wealth` to watch head starts persist. Every column is
   exactly recomputable from the other exported fields.
31. **The W2 check (the shadow is the state's negative image):** choropleth
   `enforcement_gap` next to `force_projection` — the lawless hinterland is
   the exact complement of where the garrisons (`kind = 'garrison'`, G) can
   reach. Style `smuggling_intensity` and watch the contraband corridors
   thread between patrol umbrellas; `predation_risk` picks out the
   busy-but-unguarded roads; `black_market_index` is a per-capita reliance
   index (multiply by `population` in the field calculator for volume) and
   correlates ≈ −0.9 with `arcane_service_index` — the shadow prices the
   underservice. `security_status` gives the categorical version.
32. **The W1 check (two networks, one lie):** style roads by `road_class`
   (width) or graduated on `traffic`, and overlay the conduit. **Every**
   settlement is on the road network — connection is universal, because people
   walk. The conduit is what gets rationed. That side-by-side is the sharpest
   version of the underservice argument: the periphery isn't unreachable, it's
   *unserved*. Then choropleth `market_access` (Hansen gravity over road
   costs) and `pilgrim_flux` (through-traffic to the sanctioned sites — the
   on-route economy the bypassed never see).
33. **The Phase 6 check (who governs whom):** categorize regions on
   `dominant_bloc` (5 classes). The Crown holds the center, the magnates hold
   the refinery districts, the Temple holds its sanctioned sites (▲ points,
   `kind = 'sanctioned_site'`) out on the ore and the margins — and between
   them lie `contested` seams and `ungoverned` hinterland. Overlay
   `service_gap_idx` to ask the panel's question: *which bloc neglects most?*
   The reach fields behind the classification (`centrality_to_seat`,
   `temple_reach`, `magnate_reach`) are all exported, so the argmax is
   auditable.
34. **The Phase 5 check (the payload — who gets sick, who gets care):**
   choropleth `disease_burden_per_1k` (a rate — Jenks, 5 classes, sequential
   ramp) and overlay facility points filtered to `facility_type = 'healer'`.
   The burden concentrates exactly where `healing_reach` collapses — the
   high-burden/low-care quadrant is the whole project's thesis in one map. The
   cause components (`burden_env_per_1k`, `burden_water_per_1k`,
   `burden_unmet_per_1k`) let you attribute each region's sickness to blight,
   unsafe water, or structural vulnerability as small multiples. For coverage:
   `service_gap_idx` choropleth, or buffer the healer points for a service-area
   view and see who falls outside.
35. **The Phase 4 check (environmental injustice):** choropleth `blight_load`
   and bivariate it against `wealth` (or just map the precomputed
   `injustice_idx`). Under the default dump bias the blight–wealth correlation
   is strongly **negative** — the poison lands on the poor. Re-export at
   dump bias 0 and the correlation **flips positive**: with no dumping policy
   the spoil stays at the refineries and the centers eat their own waste. That
   sign flip, side by side in a print layout, is the measured *policy share*
   of the injustice.
36. **The Phase 3 check (off-grid darkness):** style regions by
   `arcane_service_index`, overlay the conduit lines, and categorize settlements
   by `on_conduit` — the dark periphery is exactly where the grid's economics
   said "not worth it" (`population × wealth` below the threshold), never a
   hand-picked list. Compute darkness as `100 - "conduit_access"` in the field
   calculator if you want the negative image. Sweep the grid-threshold slider
   (0 = everyone connected) and re-export to watch darkness spread.
37. **The Phase 2 check (the resource curse):** scatter or bivariate
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
| `dominant_bloc` | enum | `crown` \| `temple` \| `magnate` \| `contested` \| `ungoverned` \| `dominion` — argmax of the three reach fields (crown reach = `centrality_to_seat`); close top-two → contested, all weak → ungoverned; X1: occupied ground always reads `dominion` (occupation overrides the domestic contest) |
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
| `endowment_t0` / `wealth_t0` / `population_t0` | — | the founding state, for trajectory maps (`aetherstone_endowment` is the *current*, possibly depleted stock) |
| `peak_wealth` | 0–100 | high-water mark across the run — `abandonment_index` = 0.7 × (peak − present) + dead-lode bonus |
| `ore_depleted` | 0/1 | the mine died *during* the run (stock < 15 from a founding ≥ 40) |
| `boom_bust` | enum | `boom` \| `stable` \| `decline` \| `collapse` — the settlement's trajectory |
| `event_type` | enum | `none` \| `refinery_collapse` \| `blight_plague` \| `relic_calamity` \| `refinery_founded` \| `ore_strike` \| `war` \| `consecration` — lived history (latest event; full timeline in `hinterland.events`) |
| `event_epoch` / `event_severity` | int / 0–100 | when it struck (−1 = never) and how hard |
| `bloc_changes` | int | how many times this region's ruler actually changed during the run (feeds `tenure_churn`) |
| `range_shadow` | 0/1 | the straight line from this region's anchor to the seat crosses a mountain ridge — exactly recomputable from the exported ridge geometry |
| `is_pass` | 0/1 | this region holds a mountain pass (a `pass` point feature) |
| `on_river` / `river_id` / `river_pos` | 0/1, int, int | riverine membership and the drinking order (position 0 = source; −1 when off-river) |
| `downstream_blight` | int | the river-borne share of `blight_load` — exactly recomputable from the chain order (subtract it to get the pre-river field, re-run the 30%/0.75-decay carriage) |
| `temperature` | 0–100 | latitude gradient minus mountain lapse (blind climate) |
| `rainfall` | 0–100 | moisture marched in against the wind — dries with distance, rains out on windward slopes (the rain shadow) |
| `biome` | enum | `alpine` \| `badland` \| `moor` \| `marsh` \| `forest` \| `steppe` \| `grassland` — exactly recomputable from temperature/rainfall/elevation/river |
| `on_coast` | 0/1 | the region's cell touches a sea edge — exactly recomputable from the ring + `hinterland.sea_sides` |
| `is_port` | 0/1 | holds a harbor (a `port` point feature) — sited on geology alone: flat, low coast, river-mouth bonus |
| `sea_access` | 0–100 | exp-decayed cost-distance from the ports over the friction graph (ports = 100) — the realm's second geographic pole; feeds the trade income stream (0.65 centrality + 0.35 sea access) |
| `delver_flux` | 0–100 | poverty-weighted through-traffic to the nearest relic ruin (risk is a wage) — routed like the pilgrims |
| `has_bridge` | 0/1 | a riverine region whose banks carry a bridge; all other river banks are fords (×2.2 to cross) |
| `has_tower` | 0/1 | an apostate tower stands here (see `tower` features) |
| `toll_burden` | 0–100 | the sum of levies at HELD gates (bridges/passes/ports, `held_by ≠ none`) along this region's least-cost paths to the seat (+15 each) and to its port (+10 each) — dragged from wealth each epoch, banked by the gate town |
| `elite_share` | 8–92 | H1: the owners' row's slice of this region's coin. Founded on structure — 24 + 0.32·refining + 0.12·`endowment_t0` + court bonus (prime 8 / hub 4), exactly recomputable at ep=0 — then moved by history with no new dice: each epoch the rents concentrate (+0.75 per 2-coin gate rent, +0.8 live works, +0.5 live seams) and the granary's bread levels (−0.6·bread); shocks: plague −8, won revolt −25, crushed revolt +10, war +5, works founded/collapsed +12/−10, seized gate +3 |
| `elite_pop_pct` | 2–8 | H1, DERIVED (exactly recomputable): the owners' headcount — 2 + tier (prime 3 / hub 2) + works 2 + harbor 1 |
| `class_gap` | ratio | H1, DERIVED (exactly recomputable): owners' coin per owner over labor's coin per laborer — (`elite_share`/`elite_pop_pct`) / ((100−`elite_share`)/(100−`elite_pop_pct`)), 1 decimal |
| `is_skyport` | 0/1 | S1: an aerie of the skyway stands here (see `skyport` features) — chartered at the founding where flight beats the ground by the most, weighted by the value worth moving (0.5·`wealth_t0` + 0.3·`endowment_t0` + 0.2·refining) |
| `seat_cost_ground` | cost | S1: least-cost distance to the seat over the friction graph (ridge ×4.5, ford ×2.2, pass ×1.4) — what the labor row pays, 1 decimal |
| `seat_cost_sky` | cost | S1: the same trip if you may board — walk to the nearest aerie, then fly (35 + 0.3·euclidean, no terrain below matters); never exceeds the ground cost, 1 decimal |
| `sky_advantage` | 0–100 | S1, DERIVED (exactly recomputable): the share of your distance to the seat the lanes abolish — max(0, round(100·(1 − `seat_cost_sky`/`seat_cost_ground`))) — IF you may board, and boarding is an owners' privilege |
| `occupied` | 0/1 | X1: the Dominion holds this ground (a cost-ball around the foothold, fixed at annexation). `0` with `occupied_epoch ≥ 1` = once occupied, freed by a won rising |
| `occupied_epoch` | int | X1: the epoch the Dominion took this region (−1 = never) — the scar stays after a liberation |
| `tribute_burden` | 0–3 | X1, DERIVED (exactly recomputable): the per-epoch tribute rate at the record's close — occupied 3 (assessed at the quay); free realm pays the Crown's assessment: crown-bloc 1, everyone else 2; 0 where the Dominion never came |

**Settlement features (Point):**

| property | type | meaning |
|---|---|---|
| `name` | string | Markov-walked toponym (order-2 chain over invented corpora), unique per world, stable across every society knob |
| `name_register` | enum | `lowland` \| `frontier` — the register the place names itself in, read from blind geology (`endowment_t0` ≥ 50 or ruggedness ≥ 60 → frontier) |
| `tier` | enum | `prime` \| `hub` \| `outpost` \| `holdfast` — a LABEL for the outcome (Z1): the seat is prime by office, the rest rank by grown size (top 20% hub, next 40% outpost); exactly recomputable from the exported populations |
| `region_id` | int | containing region |
| `population` | int | settlement population — GROWN by the founding centuries (Z1): compound growth on land quality + road migration toward the bigger market; rank-size law emergent (`findings.zipf`) |
| `wealth` | 0–100 | its region's wealth |
| `on_conduit` | 0/1 | mirrors its region |
| `arcane_service_index` | 0–100 | mirrors its region |
| `nearest_facility_distance` | cost-dist | to the closest facility of any type |
| `nearest_healer_dist` | cost-dist | to the closest healer (0 if one is local) |
| `disease_burden_per_1k` / `service_gap_idx` | rate / 0–100 | mirror their region |

**Conduit features (LineString):** `edge_class` (`trunk` \| `branch`),
`from_region`, `to_region`.

**Skyport features (Point):** `region_id`, `skyport_name` (the town's name +
"Aerie"). **Skylane features (LineString):** `skyway_name`, `from_region`,
`to_region`, `fly_cost`. The provenance carries `hinterland.skyway` — the
lane's name (walked in the court's own register) and the chartered ports.
A lane between every pair of aeries; flight ignores every ground
multiplier. The road below is for everyone; the sky is not.

**Facility features (Point):** `facility_type` (`healer` \| `waterworks` \|
`wardstation`), `region_id`. Rationed by the planner's rule: prime always;
hubs only when on-conduit; wardstations additionally guard refinery regions.

**Sanctioned-site features (Point):** `region_id`, `site_name` (a liturgical dedication in the Temple's own register). Temple holy places, planted
where the sacred substance lies and the Crown's writ is thin (remote ore, deep
periphery); the source points of `temple_reach`. The set can GROW mid-run: the
Temple consecrates the ground of the run's first wound (see `consecration` in
the event timeline), and reach, pilgrims, and blocs follow the live set.

**Ridge features (LineString):** `ridge_id`, `ridge_name` (frontier register).
Mountain ranges drawn in the blind-geology stage: they raise ruggedness and
elevation in a band and act as walls in the cost graph (×4.5 edge friction to
cross, except at the passes). Sliders and capital moves never move them.

**Pass features (Point):** `ridge_id`, `region_id`, `pass_name` (its town's
name + "Pass"), `held_by`. The 1–2 low gaps per ridge where crossing costs ×1.4 instead
— the chokepoints where wall-crossing traffic concentrates.

**River features (LineString):** `river_id`, `river_name` (lowland register).
Traced in the blind-geology stage: a gentlest-descent walk from high interior
ground (usually the ridge flanks) to the border; the coordinate order IS the
downstream order, running through the settlement anchors of its regions.
River edges cost ×0.6 (barge transport); where a river crosses a ridge it
cuts a pass-grade gorge; floodplains gain fertility, so the seat is drawn to
the water — emergent, never authored.

**Sea features (Polygon):** `sea_id`, `sea_level`. The water itself: an
irregular coastline flooded from the per-world sea level over the elevation
surface (marching squares). `on_coast` means the region's cell touches it.

**Contour features (MultiLineString):** `level`. Elevation contours of the
continuous surface (the lowest level is the shoreline).

**Coast features (LineString):** `side`. The 1–2 adjacent box edges the
world's geology chose as ocean direction (also in `hinterland.sea_sides`).

**Port features (Point):** `region_id`, `port_name` (its town's name +
"Harbor"), `held_by`. The sea's gates — the export chokepoints where whatever the mines
raise and the works refine leaves the country.

**Ruin features (Point):** `ruin_type` (`delve` \| `tomb` \| `deadhold`),
`region_id`, `peril`, `yield`, `ruin_name` (delves in the frontier register,
tombs and deadholds in the liturgical). The old world's structures, drawn
blind in the deep past — the first delve always digs the old workings (dead
lodes / ore country); a deadhold seeds a founding blight scar. Ruins feed
`delver_flux`, raise predation in their peril's reach, and fence their yield
through the black market.

**Bridge features (Point):** `river_id`, `region_id`, `bridge_name`,
`held_by`. The 1–2
chain towns per river whose banks carry a span; everywhere else reaching a
river town from dry land is a ford (×2.2).

**Tower features (Point):** `region_id`, `tower_name`. Apostate arcanists
squatting where governance and the grid both fail — sited on the founding
political map, not geology. Nearby: trust −12 (exactly recomputable,
euclidean 220 of the tower point), black market +12.

**Maelstrom feature (Point):** `side`, `maelstrom_name` (present in ~half of
worlds). A turning of the sea on one coast; port siting shuns its 180-unit
reach whenever any clear coast exists.

**Garrison features (Point):** `region_id`. Crown force anchors — the seat plus
the busiest corridors near the core; the source points of `force_projection`.

**Road features (LineString):** `road_class` (`highway` \| `road` \| `track`,
assigned by traffic rank), `traffic` (0–100, gravity flows routed over
least-cost paths — the busy edges are the chokepoints), `from_region`,
`to_region`. The road network spans **every** settlement; only the conduit is
rationed.

**A second artifact — the epoch series** (`hinterland-epochs.geojson`): regions
and settlements repeated per epoch with `epoch` + `epoch_date` fields (25
fictional years per epoch), conduit edges stamped with the epoch they were
built, roads from the founding. Built for the QGIS Temporal Controller; the
last frame is exactly the main export, frame 0 is the founding.

**A third artifact — the chronicle** (`hinterland-chronicle.md`): the same
world, narrated. A deterministic written history composed from the facts the
export carries — the founding (seat, works, shrines, the off-grid count), the
event timeline told in order with dates and *the causal chains told as
chains* (a war that followed a contested strike is narrated against it; a
consecration names the wound it answers and the shrine's dedication), and
the state of the realm at the record's close. Same seed, same story, same
words — the on-page panel under the map shows exactly the downloadable text.
Drop it beside the QGIS map as the qualitative companion: every name in the
prose is a feature in the layers.

**Schema history:**
- **v34** (the two levers P2): `responsiveness` (0–100, default 45 = the
  old hidden dice, byte-identical at the default) weights the
  reform-or-reaction coin; `harbors_closed` seals the quays (no ports,
  no sea trade, no port tolls, no Dominion — the fleet needs a quay).
  Both ride the hash and the provenance. Measured: deaf seat 0 reforms /
  listening seat all-wounded-reformed, mean gini 0.058 lower on the same
  seeds; sealed quays 0 arrivals with a small honest price (~0.6 coastal
  wealth — mineral realm, not maritime).
- **v33 addendum (U2, no format change)**: the surface catches up — the
  region inspector (one click, the whole ledger), 13 new lenses under
  grouped headings, named swatches on categorical legends, the
  counterfactual menu (λ / the full grid / both), traffic-weighted
  roads, the occupation animated on the scrubber. And a second stage-3
  purity fix: the occupied flag was reset AFTER the founding snapshot,
  so in-page re-runs leaked the previous run's occupation into the
  series' frame zero; the reset moved before the snapshot and the
  in-page-equals-fresh-boot byte test now covers the series export too.
- **v33** (the map is a map M1): the sea becomes a coastline — the shore
  shelf wanders (bays/headlands/skerries), sea features become polygons
  WITH HOLES (islands; `islands` property), the sea level negotiates
  down until every region keeps dry ground, and last-resort towns stand
  on raised holms. Region anchors relocate off wet centroids (two
  passes: against the continuous field, then against the traced
  polygon — the authoritative water). Harbors move to the waterfront;
  ruins/towers/sanctioned sites move to their own dry in-cell points
  (the wild-reach columns recompute from the exported points, as
  before). Mountains render as mass (hachures/peaks/fine display
  contours; exported contour levels unchanged). Honest re-pins: the
  won-revolt deep-fall share and the collapse-aftermath share moved
  under the re-rolled coastal geography; the D6 chain and pinned seeds
  held.
- **v32 addendum (C1, no format change)**: the counterfactual exhibit —
  the λ experiment moves from the test suite onto the page (side-by-side
  injustice maps + numbers; alternate run restored byte-exactly) — and
  the STAGE-3 PURITY FIX: in-page society-knob changes after an ep>0
  render had silently recomputed on depleted ore since the dynamic
  engine landed; applyAttributes now restores the geology as founded on
  entry. Fresh-load exports were never affected.
- **v32** (the founding centuries Z1): the census is grown, not painted.
  POP_BANDS deleted; sizes emerge from 30 rounds of pre-history running
  the loop's own physics (compound growth on land quality, road migration
  with log-damped agglomeration + preferential attachment, distance
  shielding the remote, a floor under the smallest), then one rescale to
  the familiar realm scale so every per-1k rate keeps meaning. Findings
  gain `zipf` (full-system `alpha` med 1.22, `tail_alpha`, `tail_r2` med
  0.91, `primacy`), exactly recomputable. Tiers become labels for the
  outcome (recomputable from exported sizes). Honest recalibrations under
  the new census, measured first: H1 `within_pct` med 58 → ≈37 (real city
  sizes carry more of the between-place spread); the G1 market-shadow
  claim moved from matched pairs (blurred: a big grown town behind the
  wall is its own market) to the distribution level (shadow median <
  open in ≈9/10 worlds, gap ≈24 points); a capital move now re-grows the
  census around the new seat at the same realm scale; won-revolt ledger
  drops re-pinned −8..−24 (gate-town rents soften some falls); mobility
  ceiling 0.75 → 0.7.
- **v31** (the Dominion X1): sovereignty is the last inequality — the
  whole realm can be someone else's hinterland. An off-map empire lands
  (seeded coin + a clear harbor; ~half of worlds with time) at the best
  quay: `annexation` event, `occupied`/`occupied_epoch`/`tribute_burden`
  columns, `dominant_bloc` gains `dominion`, `held_by` gains `dominion`
  (garrisoned gates that no faction can seize back), retention ×0.6 in
  the zone, the zone force-wired to the quay (an ENCLAVE grid — the
  corridor connects the mine to the ship, not the country to itself),
  occupied elite_share +4 (the comprador bargain), tribute incidence
  shields the crown bloc, risings on occupied ground face the imperial
  garrison (+25 state strength) and win a LIBERATION. `hinterland.dominion`
  provenance; `findings.sovereignty` (all exactly recomputable). Measured:
  arrival 19/40, occupied share med 19%, corridor fully wired 19/19,
  retention ratio med 1.4, comprador med 1.2–1.4, growth gap med 3.
  Re-pinned: the D6 chain seed moved to a Dominion-free world (chain56,
  strike@5 → war@7, ablation: no war); security/social-trust formulas now
  read the same bloc the export carries (the realm's writ ends at the
  garrison line).
- **v30** (the skyway S1): geography is destiny only for those who can't
  afford to leave it. Aeries + lanes chartered at the founding by gain ×
  value (flight's saving over the ground, times the wealth/ore/works
  worth moving) — so the lanes emergently serve the far, walled, rich
  country; `seat_cost_ground` / `seat_cost_sky` / `sky_advantage` (derived,
  exactly recomputable), `is_skyport`; `hinterland.skyway` provenance;
  findings gain `sky` (shadow vs open mean advantage, `reached_n`,
  `twin_sky`). Class-conditional geography: aeries are owners' districts
  (`elite_pop_pct` +1, +0.6 elite share per epoch — the ONLY loop
  coupling; wealth, migration, and every event history are byte-identical
  to v29). Measured: shadow mean advantage ≥ open in 27/29 worlds (median
  ~44–50%), twins split by class in 25/29, aeries at/above the median
  elite share in 29/30.
- **v29** (the strata H1): class exists — within the walls, not only
  between them. `elite_share` (simulated like wealth: structure-founded,
  history-moved, NO new dice — every seeded world keeps its exact old
  history with a class ledger written under it), `elite_pop_pct` +
  `class_gap` (derived, exactly recomputable), `elite_share` per frame in
  the epoch series, and the findings gain the two-level ledger:
  `gini_people` vs `gini_between_people`, `within_pct` (measured median
  58% of person-level inequality is INSIDE regions — invisible to any
  between-place map), `owners` (~5% of people hold ~53% of coin,
  `class_gap` ≈24×), `company_town`/`company_share`. Measured before
  calibrating: corr(refining, elite_share) 0.72; won revolts drop the
  owners' share ≥16 points in 10/10; plagues level in 67/69 (the two
  exceptions are gate towns whose rents out-ran the shock — the ratchet
  is honest).
- **v28** (the physical world G4): geology becomes a causal chain —
  elevation is a continuous surface (continental tilt + tectonic uplift
  along the ridge axes + shelving shore), ruggedness is its SLOPE, the sea
  is a flooded shape (`sea` polygons + `hinterland.sea_level`, `on_coast`
  recomputable against it), contours export, and climate arrives:
  `temperature`, `rainfall` (with orographic rain shadow), `biome`
  (exactly recomputable), fertility DERIVED from climate. Findings gain
  `rain_split`. Recalibrated, measured first: the plume's downhill term
  damped (the tilt made downhill systematic), the D1 drain reframed onto
  the attractiveness composite the migration mechanic actually reads, λ
  floor −0.15, resource-curse and several shares eased — the physical
  world legitimately moved them.
- **v27** (divergent histories V1): the counter-currents — leveling plagues
  (+15 retention to survivors), reform/reaction events two epochs after the
  first wound (measures that mutate the loop's own parameters: dumping
  eased or entrenched, grid charter, toll amnesty/crackdown, retention act,
  the Crown Granary transfer), and the revolt (once per run, `outcome`
  won/crushed; a won rising frees its town, softens every toll, and can
  extract a granary concession; a crushed one gets a garrison). Findings
  gain `gini` / `gini_t0` / `turning`; histories measurably fork.
- **v26** (the argument surface A1): the app states its findings —
  `hinterland.findings` in provenance (quintile blight ratio, shadow
  earnings gap, darkness burden ratio, the river's mouth, toll payers, and
  the twins), exactly recomputable from the exported columns; an on-page
  findings panel and twin exhibit; the default view boots into injustice;
  view labels became questions; the chronicle closes with "What the Record
  Shows."
- **v25** (dynasties E5): three named ruler lines in provenance
  (`hinterland.rulers`), reigns drawn blind; `succession` events are
  courtly (faction + ruler, no region); contested successions freeze the
  faction's seizure turn and raise tension with both rivals; the chronicle
  is dated by the reigning Sovereign.
- **v24** (peace terms F3): wars end in treaties — the winter after a war
  with room in the record, a `treaty` event (factions, `winner`, `ceded`,
  `tribute`) redraws the map at the table: the loser cedes up to two held
  gates nearest the battlefield and pays half its treasury to the victor.
  Defeat is an institution; victory compounds through the ledger.
- **v23** (escalation + the oligarchy loop F2): faction treasuries (held
  gates pay 3/epoch; seizures cost 12; the ledger lowers the next seizure
  bar) and pair tensions (+25 per rival taking, +1.2 per contested meeting
  ground per epoch, 8% decay) exported in provenance; wars become policy —
  a pair past a seeded tension bar fires the war machinery, the battlefield
  prefers that pair's contested ground, and every war event carries its two
  `factions`. Recalibrated (measured first): drain floor 0.2→0.15 (policy
  wars legitimately redistribute people against the spiral).
- **v22** (the faction turn F1): the blocs become agents. Bridges, passes,
  and ports are HOLDINGS (`held_by`; founding owner = the host's founding
  bloc); each epoch the single strongest claim seizes a gate (`seizure`
  events with a `faction` field); `toll_burden` walks each region's
  least-cost paths and is dragged from wealth each epoch while the gate
  town banks it; apostate towers are raised (`tower_raised`) where
  governance keeps failing and burned (`tower_burned`) when Crown or
  Temple reach closes in. Recalibrated (measured first): collapse
  aftermath 0.8→0.65 — a collapsed works town that holds a tolled gate
  can bank its way back to peak.
- **v21** (the wild layer P1): anomalies — objects the ledger did not order.
  New feature kinds `ruin` (delve/tomb/deadhold with peril + yield), `bridge`
  (river banks become ×2.2 fords except at bridge towns), `tower` (apostate
  arcanists; −12 trust within 220 units, exactly recomputable), `maelstrom`
  (port siting shuns it); region columns `delver_flux` (poverty-weighted
  traffic to the ruins), `has_bridge`, `has_tower`; deadholds seed founding
  blight scars; predation and the black market read the ruins' peril and
  yield.
- **v20** (the sea + ports G3): 1–2 adjacent box edges become sea (blind);
  new `coast` and `port` feature kinds + `hinterland.sea_sides`; region
  columns `on_coast` (exactly recomputable), `is_port`, `sea_access`; the
  trade income stream becomes 0.65 centrality + 0.35 sea access — two
  geographic poles. Recalibrated (measured first): λ-sweep floor −0.25→−0.20
  (the sea is a blight-independent wealth pole; the policy gap is unchanged
  at ~1.0) and resource-curse ratio 35%→28% (ore country near the harbor
  now has an export escape route; the curse holds inland).
- **v19** (rivers + downstream blight G2): 1–2 named rivers per world traced
  blind downhill from the ridge flanks; new `river` feature kind; region
  columns `on_river`, `river_id`, `river_pos`, `downstream_blight` (exactly
  recomputable); river edges ×0.6 in the cost graph, ridge crossings become
  pass-grade gorges; floodplain fertility; riverine `safe_water` bonus that
  upstream contamination eats; the chronicle tells the drinking order.
- **v18** (mountain ranges + passes G1): geography with shape — 1–2 named
  ridge polylines per world (blind geology) that wall the cost graph except
  at 1–2 passes each; new `ridge` and `pass` feature kinds, region columns
  `range_shadow` (exactly recomputable) and `is_pass`; the epoch series
  carries both; the chronicle names the ranges. Recalibrated: the drain
  spiral is now measured on the open side of the wall (geography legitimately
  fragments the global correlation into per-side spirals).
- **v17** (Markov toponymy E3): real procedural names — order-2 character
  chains over three invented registers replace the syllable placeholder;
  settlements gain `name_register` (lowland/frontier, a pure geology fact),
  sanctioned sites gain `site_name` (liturgical register); all names unique
  per world and stable across capital moves, weights, and epochs.
- **v16** (causal chains + the faith in motion D6): events cause events — an
  ore strike on contested ground guarantees and accelerates the war, and two
  epochs after the run's first wound (plague or calamity) the Temple
  consecrates it: new `consecration` event type, an in-run addition to the
  `sanctioned_site` layer, and `temple_reach`/blocs recomputed from the live
  shrine set (every shrine region reads 100).
- **v15** (conflict and fortune D5) added `ore_strike` (hidden blind-geology
  lodes surfacing mid-run) and `war` events (contested ground burns; capacity
  permanently wounded; the war region garrisoned after the fact).
- **v14** (dynamic institutions D4) added `refinery_founded` events (capital
  moves two epochs after a collapse, to the best current site), live in-run
  bloc re-contests, and the `bloc_changes` column; `tenure_churn` now counts
  lived flips of ruler.
- **v13** (in-run events D3) added lived history: region columns `event_type`,
  `event_epoch`, `event_severity`; an `events` timeline in provenance;
  sanctioned sites now anchor to the founding geology (`endowment_t0`) —
  ancient places don't move as mines deplete.
- **v12** (dynamic engine D1) added time: the `epochs` knob (0 = founding
  snapshot; each epoch depletes ore, compounds wealth, migrates people along
  roads, ratchets the conduit, and re-targets the dumping), trajectory columns
  `endowment_t0`, `wealth_t0`, `population_t0`, `peak_wealth`, `ore_depleted`,
  `boom_bust`, and `abandonment_index` redefined as true hysteresis. At
  `epochs > 0`, tier population bands no longer apply (tiers re-rank by what
  settlements have become).
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
