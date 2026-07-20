# Reading a World in Hinterland — A Field Guide

Hinterland is an **instrument**, not an argument. The socioeconomic-inequality
lens is how we *look* — where each mechanism lands, who keeps what, who bears
what — but the **verdict is the world's, not the code's**. The engine *can*
manufacture inequality; it can also close a gap, lift a floor, or level down.
Which it does is a fact about the seed, the knobs, and the world outside — and
every link in the machinery can be *measured from the exported columns alone*.
This guide tells you where each inequality lives as a lens, which instrument
shows it, and which experiment isolates the mechanism from the paint.

Two ways a relation can be near-universal are worth flagging up front, because
this guide flags them: some are **definitions** (a composite is its formula) and
some are **constructions** (the mountain shadow exists because a ridge count is
≥ 1 by build). Those are labeled where they occur — per the falsifiability rule,
a relation true in every world is either a definition or a bug, never a finding.
Everything else can invert somewhere in seed × knob space, and the suite exhibits
the inversion.

The epistemic contract, in one paragraph: **geology is blind** (ore, terrain,
climate, coasts are generated before any social value exists, and society knobs
cannot move them — tested); **zeros are neutral** (grid threshold 0 is a
universal grid, epoch 0 is the founding, `openness` 0 is a sealed coast);
**derived columns recompute exactly** (every finding can be re-derived from the
file you downloaded, and the suite does); **the counterfactuals are the same
world re-run** — same rock, same wind, same dice, one policy changed; and **the
world outside is exogenous** — a region can do everything right and be ruined by
a price collapse, everything wrong and be rescued by a boom.

## The instruments

| instrument | where | what it is for |
|---|---|---|
| **The lenses** | "The question on the map" | one column at a time, grouped: THE SHAPE (the neutral instruments) / THE COIN / THE LAND / THE STATE / THE REACH / THE PEOPLE / … |
| **The inspector** | click any region | the whole ledger of one place: land, coin, class rows, state, people, its named features, the gates it pays, its event history |
| **The findings band** | above the map | this world's measured shape, every number recomputable from the export — including the de-moralized `verdict` (gap × floor × growth) |
| **The chronicle** | below the map | the same world narrated; deterministic — quote it in citations |
| **The counterfactual menu** | under the disposal-doctrine slider | this world DISPERSED / the FULL GRID / both, side-by-side with the as-rolled world |
| **The scrubber** | TIME | replay the epochs: wealth, blight, class, the grid, artifice, the occupation |
| **The exports** | header buttons | the full GeoJSON, the epoch series (QGIS Temporal Controller), the chronicle, the CSV tables |

The boot lens is **`wealth`** — the neutral coin. `injustice` survives as one
labeled composite plate (`blight × poverty`) among many, not the default view.

---

## The eleven inequalities, and how to catch each one

These are **lenses**, not verdicts. Each names a mechanism you can watch cut
either way.

### 1. Between places — the spread of fortunes
**The question:** who holds the coin, and did the gap grow, hold, or close?
**Look at:** the *who holds the coin* (`wealth`) and *who rose, who fell*
(`delta`) lenses; findings `gini` vs `gini_t0` (the drift IS the finding — it
runs both signs across the sweep, roughly −0.19 to +0.14); `floor` (did the
poorest tenth's ground rise?).
**The experiment:** set the income weights. `wg=100` (rest 0) is the old
authored gradient — the control; `wg=0` is fully emergent wealth. Emergent wealth
still shows strong spatial structure — but whether that structure *widens* is the
world's business, not the gradient's.
**In QGIS:** graduated symbology on `wealth`; join `wealth_t0` and map the
difference.

### 2. Within walls — class
**The question:** how much inequality can a map of regions not see at all?
**Look at:** the *who owns the town* lens; the inspector's THE TWO ROWS;
findings `gini_people` vs `gini_between_people` and `within_pct` (median ≈53% in
the sweep — a region map is blind to it), `owners`, `company_town`.
**The experiment:** the owners' row moves **both** ways. Scrub a world with a won
revolt and watch `elite_share` fall 15–25 points in a year; then read
`elite_ordinary_delta`, which charges the catastrophe shocks OUT — where it reads
**negative**, competition and boom-churn (B5), not a fire, thinned the row. A
police state (`order` high) freezes both edges.
**In QGIS:** `elite_share` choropleth; field-calc `class_gap` yourself and diff
against the exported column — it must match exactly.

### 3. Geography as destiny — the wall
**The question:** what does being born behind the mountain cost?
**Look at:** THE TWINS in the findings band (same distance from the capital, red
dashed line — the difference is the mountain); `range_shadow`,
`shadow_gap_pct`; the *how rough the going* lens; `rain_split` (the wall also
decides who gets rain).
**A construction, labeled:** a mountain shadow exists in 80/80 worlds because a
ridge count of ≥ 1 is built in — so the *existence* is not a finding. Its
**magnitude** is (shadow share spans 0.04–0.83), and *what the wall costs* is
what the twins measure.
**The experiment:** arm the capital pin and move the capital: the geology does
not move, the shadow re-deals, and different towns inherit the wall.
**In QGIS:** filter `range_shadow = 1`, compare median `wealth` and
`market_access` against the open country at matched capital distance.

### 4. The class-conditional wall — the skyway
**The question:** for whom does geography stop being destiny?
**Look at:** the *who escapes the ground* lens; `capital_cost_ground` vs
`capital_cost_sky`; findings `sky` (`shadow_adv` vs `open_adv`); `twin_sky`.
**A construction, labeled:** aeries are chartered by gain × value and boarding is
an owners' privilege (`elite_pop_pct` counts them) — so "the walled rich fly the
wall their labor walks" is definitional, not measured. What varies is *how much*
of the realm sits behind the wall, and how steep the advantage runs there.
**In QGIS:** load `skyport`/`skylane` over the terrain; symbolize
`sky_advantage` and note it pools where `capital_cost_ground` is worst.

### 5. The poison — where the blight lands
**The question:** does the blight fall on the poor because of wind, or because a
doctrine puts it there — and this world, which?
**Look at:** the *who breathes the poison* (`blight_load`) and *who bears the
injustice* (the labeled composite) lenses; findings `blight_ratio` (poorest
fifth vs richest); `mouth_region` (who drinks the river last); plague events;
the provenance `disposal_doctrine` and `sacrifice_zone`.
**The experiment — the flagship counterfactual.** The default doctrine is
*concentrate*; the counterfactual button re-runs the world **dispersed** — same
rock, same wind, same dice, only the disposal changed. This is the pivot's
sharpest edge: the old λ-dial *locked* blight onto the poor, and B4 retired it.
Across the sweep `corr(blight, wealth)` now spans **both signs** (measured about
−0.40 under concentrate to **+0.98** under disperse, where the poison settles on
the industrial rich). "The blight falls on the poor" is a doctrine, not a law —
and the gap between the two maps is that doctrine, measured.
**In QGIS:** export both worlds (the disperse world is one hash away) and
difference the `blight_load` rasters.

### 6. The darkness — infrastructure rationing
**The question:** who is left unwired because serving them "would not pay"?
**Look at:** the gold grid lines (dashed = off-grid); *who gets served* / *who
was left unserved*; findings `dark_n` and `dark_burden_ratio` (off-grid share
spans 0.04–0.88 — the ledgers say yes almost everywhere in one world, almost
nowhere in another).
**The experiment:** the counterfactual menu's FULL GRID (threshold 0) — how many
settlements does the charter light? **A construction, labeled:** occupied ground
is always wired (`occupied = 1 ⇒ on_grid = 1`) — the corridor reaches you when
someone else wants what you have. Compare what being wired means on free versus
occupied ground.
**In QGIS:** categorize `on_grid`; overlay `disease_burden_per_1k`.

### 7. Extraction — rich rock, poor town (and its inversions)
**The question:** who keeps the value their own ground produces?
**Look at:** the *who keeps what it makes* lens (`value_retention`); the
resource-curse scatter (`endowment_t0` × `wealth`); `ore_depleted`,
*boom and bust*, *who was left behind* (`abandonment_index`); and the
*where the aetherworks learn* lens (`artifice_index`).
**The two edges:** the curse is common (a curse appears in about two-thirds of
worlds) but not fixed. **B1** made income scale with artifice `A`, so a
high-artifice periphery can out-earn a low-artifice capital (the pinned exhibit
does exactly that). **B2** made concentration two-edged: the exchange can *build*
the aetherworks (development finance, where retention is high and the world
booms) or merely *hoard* (comprador extraction, where retention is low and the
price falls) — the same institution, the edge discovered, not decreed.
**The experiment:** run the epochs and watch a frontier get mined out, the trunk
lines carrying nothing — then find a world where the aetherworks learned faster
than the capital and the periphery kept its rise.
**In QGIS:** bivariate choropleth `endowment_t0` vs `value_retention`; then map
`artifice_index` against `wealth` drift.

### 8. The gates — chokepoint tariffs (and their upkeep)
**The question:** who pays a tariff at gates whose holders they never chose — and
what does the tariff buy?
**Look at:** the *who pays at the gates* lens (`tariff_burden`); `held_by` on the
bridge/pass/port layers; the inspector's THE ROAD TO THE CAPITAL; provenance
`treasuries`.
**The two edges (B6):** the gate that *taxes* the road is the gate that
*maintains* it. A held crossing that still collects a real tariff keeps itself in
repair; an unheld span — or one under a **toll amnesty** — goes unfunded and
**rots** (`crossing_condition`, `crossing_type`, `crossing_friction`), re-walling
its ridge or re-fording its river and choking trade for everyone downstream. So
the mercy that lifts the tariffs can starve the bridges: a decade on, the realm
that kept its tariffs can out-trade the one that freed them.
**The experiment:** grant the amnesty (a listening capital, `iq=100`) on a
tariff-heavy world and watch trade collapse as the spans rot; run the same seed
deaf (`iq=0`) and the tariffs — and the bridges — survive.
**In QGIS:** style gate features by `held_by`; symbolize edges by `condition`.

### 9. Sovereignty — the realm as someone else's hinterland
**The question:** what does imperial reach cost — and it mostly is not invasion.
**Look at:** the *who rules here* lens (iron-gray = the Dominion); the *who pays
the Dominion* lens; findings `sovereignty` and `concessions`; the provenance
`powers` (the metropole and its named rival); `concession` / `foreign_claim` /
`occupied` / `tribute_burden`.
**The mechanism (B11):** the empire mostly never comes — it **buys**. Its
attention, keyed to a coast's remaining ore, opens a **concession**: foreign
capital owns the aetherworks, `foreign_claim` repatriates half the yield, the
coast is developed and wired — *richer, and owned*. When the lode draws down the
concession is **wound up** (`concession_ended`): the *courted → developed →
squeezed → abandoned* arc, ruin (the markets leave) and freedom (the levies stop)
in one year. Annexation — the Dominion's fleet — is the demoted **limit case**
(it took ground in only ~26/80 worlds; a concession opened in ~26/80 too).
**The experiment:** CLOSE THE COAST — `openness=0` (the old `hb=0` maps forward).
No fleet, no concession, no sea trade; the price of the safety is a modest slice
of coastal wealth. The asymmetry is itself a finding about a mineral economy.
**In QGIS:** filter `occupied = 1` or `concession = 1`; compare `value_retention`,
`foreign_claim`, `on_grid`, `tribute_burden` inside vs outside.

### 10. Institutions — does the capital listen, and does listening help?
**The question:** when the realm is wounded, does anything push back — and does
the push always land where it aimed?
**Look at:** the findings band's turning point (reform / reaction / revolt /
**imposition**, dated); the chronicle's decree narrations; provenance
`reform_edges`.
**The two edges (B7):** every measure grew a **long edge** (P4: time × the state
it lands in). The grid charter is strung on an imperial loan the capital services
for the rest of the run (`charter_debt`); the granary, run on through a long
peace, breeds `granary_dependency` and a fiscal drain with no famine to justify
it; the retention act frightens elite capital into `capital_flight`; the toll
amnesty rots the bridges. And `iq` is a **posture**: a deaf capital that stays
silent while the world's doctrine presses gets a measure **imposed** by its
creditors — structural adjustment written in another capital.
**The experiment:** run matched seeds at `iq=0` and `iq=100`. The knob changes
the **class** of governance, not just its magnitude: a deaf capital is governed
from outside (some worlds take an imposed measure and reform nothing), a
listening one governs itself — and either mercy can curdle.
**In QGIS:** join the events timeline to the epoch series and watch wealth
distributions before/after the turning year — up or down.

### 11. The people's texture — who can rise, who is counted, who leaves
**The question:** what does the hierarchy do to the people inside it?
**Look at:** *who can rise* (`mobility_ceiling`); *who believes the realm*
(`social_trust` — note it dies at the constabulary line: the writ, not
wellbeing); *who goes uncounted* (`legibility_gap`, `uncounted_population`);
*where the shadow trades* (`smuggling_intensity`); `delver_flux` (risk as a wage);
**B3's** `emigrants_total` / `remittance_income` (the metropole pulls the young
off-map, the diaspora sends coin home — a floor, not a fortune, and it can pull
people *outward* against the wealth gradient into a frontier boom); and **B9's**
`order_level` (high order stills the shadow *and* the ladder).
**A construction, labeled:** the rank-size/primacy law (`findings.zipf`) is not
decreed by a charter but *is* decreed by the proportional growth the engine runs
— an emergent hierarchy, yes, but a built-in one; its **steepness** is the
variable (primacy spans 1.0 to 41×).
**In QGIS:** correlate any of these against `wealth` and `centrality_to_capital`.

---

## Measuring the shape (spatial statistics)

The guide above shows where each lens *reads*; this section is how to stop
eyeballing it. The export ships the two substrates the statistics need: the
**`edge` layer** (one LineString per region-adjacency edge, carrying the
engine's own traversal `cost`) and **`findings.moran` / `findings.moran_blight`**
— global Moran's I of `wealth` and `blight_load` over that adjacency
(row-standardized weights, 199-permutation pseudo-p from a dedicated seeded
substream, so the p-value is a fact of the world). Both recompute exactly from
the exported edges + columns.

**LISA / local Moran + Getis-Ord Gi\*** (GeoDa, or PySAL `esda`). Build
contiguity weights from the `edge` layer (the neighbor graph the engine actually
used), and run Local Moran on `wealth`, then on `blight_load`. Where a High-High
blight cluster sits on a Low-Low wealth cluster, each with its p-value, *this
world's* poison-on-the-poor is measured, not asserted — and in a world under the
disperse doctrine you may find the opposite, a blight cluster on the *rich*.
Gi\* on `disease_burden_per_1k` finds the hotspots the healers never reach.

**The doctrine experiment, made rigorous.** Export the same seed twice — as
rolled (concentrate) and dispersed (one hash away). In GeoDa, run bivariate
Moran's I of `blight_load` against neighbor `wealth` on each. The gap between the
two statistics is the **doctrine's share of where the poison landed**, as a
single spatial number — and because B4 unlocked the sign, that number is no
longer pinned negative: it is whatever this world's disposal did.

**Zonal / grouped statistics** (native Processing). *Statistics by categories*
with `dominant_bloc`, `range_shadow`, or `biome` as the class field turns every
filter here into a quantified table: `class_gap` and `value_retention` per bloc,
population (and `uncounted_population`) inside vs outside the shadow,
`disease_burden_per_1k` per biome.

**Classification that respects the tails.** Jenks hides the extremes, and the
extremes are where the story is. For the distributional lenses default to
**standard-deviation classification**, and for blight × wealth build a true
**3×3 bivariate choropleth** — the corner that is poisoned *and* poor (or
poisoned *and* rich) is one glance.

**What needs which substrate.** Network analysis and contiguity-from-the-true-
graph need the `edge` layer. Left to advanced users: OLS/GWR of `wealth` on
geography (the residual map shows where a realm beats its ground), and
viewshed/watershed audits (which need an elevation raster the export does not
carry yet).

---

## Appendix A — the linkage table (the coverage pass)

Every aspect of the generator, and the shape it moves. If a feature moved
nothing, the table says so. Each mechanism is described by its **two edges**
where it has them — the code implements both blades and the contingency; it
never implements a verdict.

| aspect | moves (both edges where they exist) | where measured |
|---|---|---|
| ore lodes (`endowment_t0`) | resource curse — or, with artifice, its inversion; retention base; company-town class; strikes → wars | curse scatter; `value_retention`; `artifice_index`; `elite_share` init |
| terrain ruggedness | travel cost → centrality → wealth/market; aetherworks siting | cost graph; `centrality_to_capital` |
| ridges + passes | the wall: shadow gaps, twins, pass funneling; skyway gain (existence is a construction; magnitude varies) | `range_shadow`, `shadow_gap_pct`, `twins`, `sky_advantage` |
| rain shadow | the second lottery: rainfall → fertility → farms | `rain_split`, `fertility` |
| rivers | carriage: who drinks last; barge-cheap edges; ford walls; bridge gates | `downstream_blight`, `mouth_region`, `tariff_burden` |
| the sea + coastline | the second pole (`sea_access` → trade, gated by `openness`); ports as gates; the Dominion's door | `sea_access`, port `held_by`, `powers` |
| the artifice index `A` (B1) | the growth channel: income no longer conserved — a boom grows the pie, a trade war shrinks it; a high-`A` periphery can out-earn the capital | `artifice_index`, `findings.growth` |
| the investment pool (B2) | the exchange's two edges: development finance (builds `A`) vs comprador hoarding — set by retention × world regime | `artifice_index_t0` vs close `A`; `findings.floor` |
| migration + diaspora (B3) | the drift toward winners **and** the frontier term (outward against the gradient) + emigration off-map + remittances home | `emigrants_total`, `remittance_income`, population drift |
| the disposal doctrine (B4) | disperse / concentrate / treat — the poison can land on the poor OR the rich | `blight_load`, `corr(blight, wealth)` both signs, `sacrifice_zone` |
| elite share (B5) | the ratchet up **and** ordinary erosion down (competition, boom-churn) where market access is high; a police state freezes both | `elite_share`, `elite_ordinary_delta`, `rank_churn` |
| tariffs + crossings (B6) | extraction at the gate **and** upkeep of the crossing; amnesty rots the span | `tariff_burden`, `crossing_friction`, `trade_drag` |
| reforms (B7) | every measure's long edge: charter→debt, granary→dependency, retention→flight, amnesty→rot; and `iq` posture → creditor imposition | `reform_edges`, `turning` |
| revolts (B8) | won is a distribution: a throttled town flourishes, a propped-up one starves | `won_arc`, epithets `the Free` / `the Famished` |
| the order axis (B9) | safety **and** stagnation: high order stills predation/smuggling/revolt AND mobility/investment/churn | `order_level`, the order/liberty lens |
| the income mix (B10) | the four weights now anchor to different geography → a trade coast can grow a second pole rivalling the capital | `wealth` predictors per weight; primacy |
| imperial reach (B11) | the concession — developed AND owned; the abandonment arc — ruin AND freedom; annexation the limit case | `concession`, `foreign_claim`, `concession_ended`, `findings.sovereignty` |
| the world outside (B0) | exogenous price/demand/attention/embargo: a good realm ruined by a bust, a bad one rescued by a boom | `hinterland.world`, the rescue/ruin exhibits |
| the granary (reform) | moves coin downhill (a gap can close) — but the long edge can curdle it | `gini` vs `gini_t0`, `granary_dependency` |
| the Dominion (X1) | sovereignty: tribute incidence, the corridor, the comprador bargain, liberations | `findings.sovereignty`, `tribute_burden` |
| constabulary posts | force projection → security → smuggling's negative image | `force_projection`, `smuggling_intensity` |
| events (all) | the lived history every trajectory column records | `event_type`, `boom_bust`, `peak_wealth` |
| the freeport / stillair / high sanctuary / hunter camps (L1) | the writ's edge, the sky's hard wall, informal institutions, risk as a wage | `smuggling_intensity`, `sky_advantage`, `legibility_gap`, `predation_risk` |
| the neutral shape lenses (A3) | growth, floor, mobility, rank churn, volatility — see any world, not the one the old argument expected | `findings.growth/floor/absolute_mobility/rank_churn/volatility` |
| **texture only:** islands, hachures, contours, toponyms, ruler names | nothing, by design — cartography and narrative | the chronicle reads better; the map reads as a map |
| **texture that TESTIFIES:** `epithet`, `events[].name` | nothing mechanically — but both are DERIVED from the columns, so a realm of `the Yoked` is occupied, a byname roll heavy with `the Ashen` is poisoned | the byname roll at the chronicle's close is a one-line shape summary |

The audit's conclusion: **every mechanical aspect of the generator feeds at
least one measured shape**, and the handful that feed none are presentation,
listed above, on purpose. If you find a column that moves nothing and names
nothing, file it as a bug.

## Appendix B — the experiments

1. **The disperse counterfactual** (button): what the disposal doctrine did —
   and it can read either sign.
2. **Threshold 0** (button): darkness as a choice.
3. **Both mercies** (button): the nearest thing to a just regime, on the same rock.
4. **iq 0 vs 100** (same seed, two tabs): self-governed vs governed-from-outside —
   the class of governance flips, and either mercy can curdle.
5. **Coast sealed** (`openness=0`): sovereignty bought cheap in a mineral economy.
6. **order 0 vs 100** (same seed): the open realm is dynamic and dangerous, the
   police state safe and stagnant — safety and stagnation, one root.
7. **wg=100 vs wg=0** (same seed): the authored diagram vs the emergent ground.
8. **A world boom vs a trade war** (`world=`, off-default): the same policies,
   ruined or rescued from off the map.
9. **Move the capital** (arm the pin): geology fixed, fates re-dealt.

*Every claim in this guide is enforced by the suite and its falsifiability block
(inversion exhibits, knob reach, verdict diversity, definition honesty), or
printed in the [atlas](atlas.md), which is regenerated from sweeps of measured
worlds. For why the verdict is no longer pre-written, read the
[old thesis](old-thesis.md). Nothing here is aspiration.*
