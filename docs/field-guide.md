# Reading Inequality in Hinterland — A Field Guide

Hinterland generates worlds in order to make one argument: **inequality is
manufactured** — by geography nobody chose, by ledgers that ration
connection, by policies that route poison, by gates, by class, by empire —
and every link in that manufacture can be *measured from the exported
columns alone*. This guide tells you where each inequality lives, which
instrument shows it, and which experiment proves it is a mechanism rather
than a paint job.

The epistemic contract, in one paragraph: **geology is blind** (ore,
terrain, climate, coasts are generated before any social value exists, and
society knobs cannot move them — tested); **zeros are neutral** (λ=0 means
physics-only spoil, threshold 0 means a universal grid, epoch 0 means the
founding, untouched); **derived columns recompute exactly** (every finding
can be re-derived from the file you downloaded, and the test suite does);
and **the counterfactuals are the same world re-run**, not a different
world — same rock, same wind, same dice, one policy changed.

## The instruments

| instrument | where | what it is for |
|---|---|---|
| **The lenses** | "The question on the map" | one column at a time, grouped: THE ARGUMENT / LAND / COIN / STATE / PEOPLE |
| **The inspector** | click any region | the whole ledger of one place: land, coin, class rows, state, people, its named features, the gates it pays, its event history |
| **The findings band** | above the map | this world's thesis claims, every number recomputable from the export |
| **The chronicle** | below the map | the same world narrated; deterministic — quote it in citations |
| **The counterfactual menu** | under the λ slider | λ=0 / the full grid / both mercies, side-by-side with the as-rolled world |
| **The scrubber** | TIME | replay the epochs: wealth, blight, class, the grid, the occupation |
| **The exports** | header buttons | the full GeoJSON, the epoch series (QGIS Temporal Controller), the chronicle |

---

## The eleven inequalities, and how to catch each one

### 1. Between places — the spread of fortunes
**The question:** who holds the coin, and did the gap grow?
**Look at:** the *wealth* and *who rose, who fell* lenses; findings `gini`
vs `gini_t0` (the trajectory IS the finding); the readout's wealth min/max.
**The experiment:** set the income weights. `wg=100` (rest 0) is the old
authored gradient — the control; `wg=0` is fully emergent wealth. If the
gap survives with no authored gradient, the ground made it.
**In QGIS:** graduated symbology on `wealth`; join `wealth_t0` and map the
difference.

### 2. Within walls — class
**The question:** how much inequality can a map of regions not see at all?
**Look at:** the *who owns the town* lens; the inspector's THE TWO ROWS;
findings `gini_people` vs `gini_between_people` and `within_pct` (median
≈40% in the calibration sweep — a region map is blind to it),
`owners` (~5% of people, ~half the coin), `company_town`.
**The experiment:** scrub a world with a won revolt and watch
`elite_share` fall 15–25 points in one year at that region — then find a
gate-holding town whose owners' row shrugged off the same rising.
**In QGIS:** `elite_share` choropleth; field-calc
`class_gap` yourself from `elite_share` and `elite_pop_pct` and diff
against the exported column — it must match exactly.

### 3. Geography as destiny — the wall
**The question:** what does being born behind the mountain cost?
**Look at:** THE TWINS in the findings band (same distance from the seat,
red dashed line on the map — the difference is the mountain);
`range_shadow`, `shadow_gap_pct`; the *how rough the going* lens; the pass
glyphs ∩ and the traffic-weighted roads threading them; `rain_split` (the
wall also decides who gets rain — the second lottery).
**The experiment:** arm the capital pin and move the seat: the geology
does not move, the shadow re-deals, and different towns inherit the wall.
**In QGIS:** filter `range_shadow = 1`, compare median `wealth` and
`market_access` against the open country at matched seat distance.

### 4. The class-conditional wall — the skyway
**The question:** for whom does geography stop being destiny?
**Look at:** the *who escapes the ground* lens; `seat_cost_ground` vs
`seat_cost_sky`; findings `sky` (`shadow_adv` vs `open_adv` — the lanes
were chartered by gain × value, so they serve the walled rich country);
`twin_sky` — the shadow twin's owners fly the wall its labor walks.
**The experiment:** none needed — the boarding rule *is* the finding:
aeries are owners' districts (`elite_pop_pct` counts them).
**In QGIS:** load `skyport`/`skylane` features over the terrain; symbolize
`sky_advantage` and note it pools exactly where `seat_cost_ground` is worst.

### 5. The poison — environmental injustice
**The question:** does the blight fall on the poor because of wind, or
because someone routes it?
**Look at:** the *who breathes the poison* and *who bears the injustice*
lenses; findings `blight_ratio` (the poorest fifth vs the richest);
`mouth_region` (who drinks the river last); plague events.
**The experiment:** THE COUNTERFACTUAL, λ = 0 — the flagship. Same rock,
same wind, same dice; only the spoil routing differs. On the default world
the dumping alone adds 0.6× to the poorest fifth's burden and five of its
nine plagues. **The gap between the two maps is a policy.**
**In QGIS:** export both worlds (the λ=0 world is one hash away) and
difference the `blight_load` rasters.

### 6. The darkness — infrastructure rationing
**The question:** who is left unwired because serving them "would not pay"?
**Look at:** the gold conduit lines (dashed = off-grid); *who gets served*
/ *who was left unserved*; findings `dark_n` and `dark_burden_ratio`
(sickness runs heavier off the grid).
**The experiment:** the counterfactual menu's FULL GRID (threshold 0) —
how many settlements does the charter light? And note the dark exception:
**occupied ground is always wired** (`occupied = 1 ⇒ on_conduit = 1`) —
the corridor reaches you when someone else wants what you have. Compare
what being wired means on free versus occupied ground.
**In QGIS:** categorize `on_conduit`; overlay `disease_burden_per_1k`.

### 7. Extraction — rich rock, poor town
**The question:** who keeps the value their own ground produces?
**Look at:** the *who keeps what it makes* lens (`value_retention`); the
resource-curse scatter (`endowment_t0` × `wealth` — the ore-rich,
value-poor quadrant); `ore_depleted`, *boom and bust*, *who was left
behind* (`abandonment_index` — the ghost country is old ore country).
**The experiment:** run epochs 0 → 12 and watch the frontier get mined
out; the trunk lines stay, carrying nothing.
**In QGIS:** bivariate choropleth `endowment_t0` vs `value_retention`.

### 8. The gates — chokepoint rents
**The question:** who pays a toll at gates whose holders they never chose?
**Look at:** the *who pays at the gates* lens (`toll_burden`); `held_by`
on the bridge/pass/port layers; the inspector's THE ROAD TO THE SEAT
(the named gates on your way out); provenance `treasuries` (money begets
reach begets money — the oligarchy loop); the free town (a won revolt
tolls no one, ever again).
**The experiment:** follow one region's toll route in the inspector, then
check the gate towns' `wealth` trajectories — the toll is banked, not
burned.
**In QGIS:** style gate features by `held_by`; label with toll rates.

### 9. Sovereignty — the realm as someone else's hinterland
**The question:** what does it cost to be owned?
**Look at:** the *who rules here* lens (iron-gray = the Dominion); the
*who pays the Dominion* lens; findings `sovereignty` (the occupied keep
the smallest share of their own value, carry the best wires, grow slower,
and their owners' rows do better than the free realm's — the comprador
bargain); the scrubber (the flag goes up in the year it went up);
liberation risings in the chronicle.
**The experiment:** CLOSE THE HARBORS. The sealed realm admits no fleet —
0 arrivals, always — at a measured price of ~0.6 coastal wealth. The
asymmetry (total protection, negligible cost) is itself a finding about a
mineral economy; an economy that lived by the sea would pay dearly.
**In QGIS:** filter `occupied = 1`; compare `value_retention`,
`on_conduit`, `tribute_burden`, `elite_share` inside vs outside the zone.

### 10. Institutions — does the seat listen?
**The question:** when the realm is wounded, does anything push back?
**Look at:** the findings band's turning point (reform / reaction /
revolt, dated); the chronicle's decree narrations; the granary — **the
only measure in the whole engine that ever closes a gap is the one that
moves coin downhill**.
**The experiment:** THE RESPONSIVENESS SLIDER on matched seeds. At 0 the
seat never reforms (fists and silence); at 100 every wound buys a mercy —
and the same seeds run a mean 0.058 gini lower. Institutions bend the
curve, measurably, through one narrow channel.
**In QGIS:** join the events timeline (provenance) to the epoch series
and watch wealth distributions before/after the turning year.

### 11. The people's texture — who can rise, who is counted
**The question:** what does the hierarchy do to the people inside it?
**Look at:** *who can rise* (`mobility_ceiling` — born labor, die labor in
ore-only country); *who believes the realm* (`social_trust` — note it dies
at the garrison line: the realm's writ, not wellbeing); *who goes
uncounted* (`legibility_gap`, `uncounted_population` — the census misses
the periphery); *where the shadow trades* (`smuggling_intensity` routes
around patrols); `delver_flux` (risk is a wage where nothing else pays
one — the poor walk the ruin roads); and the rank-size law
(`findings.zipf` — the urban hierarchy itself is a concentration no one
decreed).
**In QGIS:** correlate any of these against `wealth` and
`centrality_to_seat`; the suite's acceptance claims tell you what to
expect.

---

## Appendix A — the linkage table (the coverage pass)

Every aspect of the generator, and the inequality metric it moves. This
table is the audit: if a feature moved nothing, it says so.

| aspect | moves | where measured |
|---|---|---|
| ore lodes (`endowment_t0`) | resource curse; retention base; company-town class; strikes → wars | curse scatter; `value_retention`; `elite_share` init; D6 chain |
| terrain ruggedness | travel cost → centrality → wealth/market; refinery siting | cost graph; `centrality_to_seat` |
| elevation surface | ruggedness (its slope); climate lapse; alpine fertility penalty | `elevation`, `fertility` |
| ridges + passes | the wall: shadow wealth/market gaps, twins, pass funneling; skyway gain | `range_shadow`, `shadow_gap_pct`, `twins`, traffic, `sky_advantage` |
| rain shadow (wind × ridge) | the second lottery: rainfall → fertility → farms | `rain_split`, `fertility` |
| rivers | carriage: who drinks last; barge-cheap edges; ford walls; bridge gates | `downstream_blight`, `mouth_region`, `toll_burden` |
| the sea + coastline | the second pole (`sea_access` → trade); ports as gates; the Dominion's door | `sea_access`, port `held_by`, `hinterland.dominion` |
| the maelstrom | port siting exclusion; shields a coast from the Dominion | port placement; arrival gate |
| climate (temp/rain) | fertility → the agrarian core → the seat → everything downstream | `fertility`, seat siting |
| biome | a *name* for the climate the farms already feel (classification of inputs that all feed fertility) | lens + export only — by design |
| founding centuries (Z1) | the rank-size law; primate cities; the census the whole model runs on | `findings.zipf`, `population` |
| refineries | wealth stream; blight source; company-town class; collapse/refound events | `refining_capacity`, `blight_load`, `elite_share` |
| retention | extraction: who keeps local value; the Retention Act's target | `value_retention` |
| the conduit | darkness: rationed connection, services, safe water, wardline | `on_conduit`, `dark_burden_ratio` |
| roads + traffic | migration paths; market gravity; pass funneling | `market_access`, road `traffic` |
| tolls + holdings | chokepoint rents; the oligarchy loop; the free town | `toll_burden`, `treasuries` |
| factions/blocs | seizures, tensions, wars → scars (`warTorn` income wound); treaties | events; `dominant_bloc`; `bloc_changes` |
| dynasties | contested successions → +tensions → wars; the reign dates the chronicle | succession events → war chain |
| the Temple's sites | pilgrim flux; temple reach → the bloc contest; consecration follows wounds | `pilgrim_flux`, `temple_reach` |
| ruins (delve/tomb/deadhold) | delver flux (risk-wage); predation; black market | `delver_flux`, `predation_risk`, `black_market_index` |
| apostate towers | the darkness's only healer; trust −12 nearby; burned/raised politics | `social_trust`, `black_market_index`, events |
| bridges/fords | crossing walls (×2.2); bridge gates | cost graph, `toll_burden` |
| the skyway (S1) | class-conditional geography; aerie districts | `sky_advantage`, `elite_pop_pct` |
| the strata (H1) | the two-level gini; the within-place blind spot | `gini_people`, `within_pct`, `class_gap` |
| the Dominion (X1) | sovereignty: tribute incidence, the corridor, the comprador bargain, liberations | `findings.sovereignty`, `tribute_burden` |
| garrisons | force projection → security → smuggling's negative image | `force_projection`, `smuggling_intensity` |
| events (all) | the lived history every trajectory column records | `event_type`, `boom_bust`, `peak_wealth` |
| the granary (reform) | the ONLY downhill pump: gini closer | `gini` vs `gini_t0`, `turning` |
| responsiveness (P2) | whether wounds buy mercies: reform probability → gini | the iq experiment (mean −0.058) |
| harbors (P2) | isolation: trade vs sovereignty trade-off | arrivals 0 sealed; coastal wealth |
| dump bias λ | the poison's routing: policy share of injustice | the λ counterfactual |
| grid threshold | how mean the ledgers are | the full-grid counterfactual |
| income weights | which economy this realm even is | gini under wg=100 vs wg=0 |
| **texture only:** islands/holms, hachures/peaks, fine contours, toponyms & registers, ruler names, `event_severity` | nothing, by design — cartography and narrative | the chronicle reads better; the map reads as a map |

The audit's conclusion: **every mechanical aspect of the generator feeds
at least one measured inequality**, and the handful that feed none are
presentation, listed above, on purpose. If you find a column that moves
nothing and names nothing, file it as a bug.

## Appendix B — the seven experiments

1. **λ = 0** (counterfactual button): the policy share of the poison.
2. **Threshold 0** (counterfactual button): darkness as a choice.
3. **Both mercies** (counterfactual button): the nearest thing to a just regime.
4. **iq 0 vs 100** (same seed, two tabs): institutions bend the gini.
5. **Harbors sealed** (same seed): sovereignty bought cheap in a mineral economy.
6. **wg=100 vs wg=0** (same seed): the authored diagram vs the emergent ground.
7. **Move the capital** (arm the pin): geology fixed, fates re-dealt.

*Every claim in this guide is enforced by the test suite (226 checks) or
printed in the [atlas](atlas.md), which is regenerated from sweeps of
measured worlds. Nothing here is aspiration.*
