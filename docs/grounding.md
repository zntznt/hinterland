# Grounding: each mechanism, the real literature, and the honest distance between them

Read [provenance.md](provenance.md) first. This page maps every substantive
mechanism in the generator to the published, openly available social science it
draws on, and states, mechanism by mechanism, what the implementation takes
from that literature, where it diverges or simplifies, and whether the
divergence is to be fixed in code (tracked as a GitHub issue) or labeled and left. Full verified references with
open-access links are in the [References](#references) section; inline keys
like *(Gabaix 1999)* point into it.

Two standing caveats apply to everything below:

1. **Gesture, not estimation.** No parameter here is econometrically estimated.
   Where a constant matches a literature value (the capital share, the Zipf
   band) it was *chosen* to match; where it doesn't, it is an authored fiction
   and says so.
2. **Self-administered targets.** The calibration targets in
   `tools/targets.mjs` were declared from the literature before the tuning runs
   (pre-registration), but the same author wrote the targets, the code, and the
   tests. See provenance.md for what that does and does not buy.

---

## 1. Production and wealth (index.html, `income()`)

**The mechanism.** Regional wealth is an additive mix of four income streams,
retained extraction, artifice (industry) value-add, trade, and a legacy
capital-gradient, scaled multiplicatively by water access and by the artifice
index `A`.

**The literature.** The additive-streams frame is a stylization of a regional
economy with distinct sectors. The planned re-derivation ([#164](https://github.com/zntznt/hinterland/issues/164))
treats `A` as capital-intensity/TFP in a Solow frame *(Solow 1956)*: income
scales as `(A/70)^0.35`, a power form with diminishing returns whose exponent
is the conventional capital share ≈ ⅓ *(Cobb & Douglas 1928; Gollin 2002)*. Water
remains a multiplicative limiting factor (a Leontief-flavored gate), which is a
modeling choice, not a cited result. Extraction income retained locally vs
repatriated follows the resource-curse and dependency traditions *(Sachs &
Warner 1995; Prebisch 1950; Singer 1950)*.

**Divergences, labeled.** The stream weights (`we/wf/wt/wg`) are user knobs,
not estimated shares. The trade term's coefficients (0.78 sea / 0.22 land) are
authored. Total wealth non-conservation ("a boom grows the pie") is a Solow-
consistent qualitative property, not a calibrated growth path.

**Disposition.** Landed, [#164](https://github.com/zntznt/hinterland/issues/164).
The linear artifice multiplier `0.3 + A/100` is replaced by `(A/70)^0.35`:
capital-intensity in a Solow frame, with the exponent set to the conventional
capital share of about a third *(Cobb & Douglas 1928; Gollin 2002)* and
normalised at the founding mean A = 70, so founding wealth barely moves.

The form it replaces was wrong at both ends. It paid a constant marginal return
to artifice forever, and it punished a crash far harder than a production
function of this kind should. One correction to the record while landing it: the
"~70% collapse" figure quoted in the issue is the theoretical worst case at
A = 0, not anything the engine reaches. Measured over 214 settled regions in 12
worlds at `ep=12`, artifice never fell below **23**, so the real comparison at
the observed floor is a 47% cut under the linear form against 32% under the
power form.

No pre-registered target moved out of range: the rank-size upper-half median
went 1.44 to 1.58 (band [1.2, 1.8]), the resource-curse share held at 8 of 20
worlds, and median elite share moved 25 to 24. `blight_wealth_corr` drifted from
+0.481 to +0.519, which is further from its declared negative mode, but that
target is already recorded as missed above and carries no numeric band; the
drift is noted rather than tuned away.

## 2. The resource curse and its inversion (endowment → retention → wealth)

**The mechanism.** Ore is placed by seeded noise; the capital settles in
fertile lowland; refining is sited by centrality; so ore-rich margins tend to
retain little of the value they produce.

**The literature.** The growth-drag correlation is Sachs & Warner *(1995)*;
the modern reading is that the curse is *conditional*, institutions decide
whether resource wealth curses or blesses *(Mehlum, Moene & Torvik 2006;
van der Ploeg 2011)*, which is what the engine's artifice/finance inversions
(B1/B2) gesture at. The extraction-without-retention frame and the
`foreign_claim` column are dependency theory's terms-of-trade and surplus-
repatriation claims *(Prebisch 1950; Singer 1950; Frank 1966; Wallerstein
1974; Cardoso & Faletto 1979)*. "Comprador," where the docs use it, is older
vocabulary (Chinese treaty-port usage, adopted by Marxist and some dependency
writers); Frank 1966 itself says "metropolis-satellite," not "comprador," a
distinction this page keeps honest.

**Divergences, labeled.** An earlier version of the docs claimed the
ore-vs-capital anti-correlation "emerges from two independent, individually
innocent choices." That overstated the independence: fertility and ruggedness
share the elevation field as a common ancestor, and fertility carries a
hardcoded high-elevation penalty, so the capital's avoidance of rough country
is partially authored through the shared field. The correlation is emergent
*given* those authored inputs, not from independent draws. The docs and code
comments now say so.

**Disposition.** Docs-label (the mechanism itself is a legitimate stylization);
frequency deliberately NOT pinned to a number (`tools/targets.mjs`), because
the literature does not support one.

## 3. Market access and trade geography

**The mechanism.** `market_access` = Σ population⁄(1 + cost/100)² over the
road network, normalized; road traffic uses population-product gravity.

**The literature.** This is a genuine Hansen accessibility index, potential
Σ S_j·f(d_ij) with a power-decay impedance *(Hansen 1959)*, in the
market-potential tradition of *(Harris 1954)*; the traffic form is the classic
gravity interaction *(Zipf 1946)*. The name in the export ("Hansen gravity
index") is kept because the formula earns it; the two divergences, a +1
offset in the impedance (avoids the zero-distance singularity) and
normalization to the best-served settled region = 100, are conventions, noted
here. Core-periphery agglomeration around the capital is the qualitative
pattern of *(Krugman 1991; Marshall 1890)*.

**Disposition.** Keep name, cite, note divergences. No code change.

## 4. City sizes and the rank-size claim

**The mechanism.** Settlement populations grow through 30 founding "centuries"
of multiplicative shocks (Gibrat-style proportional growth) plus size-attraction
migration, then epochs continue the dynamics, emptying some regions and
re-founding others at 40 to 60 people. The measured rank-size steepness comes
mostly from that last part, not from the proportional growth; see the controlled
measurements below before citing Gibrat for it.

**The literature.** Proportional growth is Gibrat's law *(Gibrat 1931)*;
Zipf's α ≈ 1 for city sizes arises from Gibrat growth with a lower-bound
friction **in the large-system limit** *(Gabaix 1999)*; real full distributions
are lognormal with a power tail only at the truncated top *(Eeckhout 2004)*;
size-attraction is preferential attachment *(Simon 1955; Barabási & Albert
1999)*.

**Divergences found.** The UI announced "a rank-size law no one decreed
(Zipf's constant is ≈1)" when the law IS decreed: the founding growth rule is
Gibrat by construction, as the design docs concede. That claim was false on its
own terms and is now rewritten.

**The measured miss was a metric mismatch, not a model defect.** The
pre-registered target in `tools/targets.mjs` names its metric precisely: the
*sweep median of per-world rank-size slope α (**upper-half fit**)*, band
[1.2, 1.8]. The findings block computes **two** exponents from every world and
both get called α in casual use:

| exponent | fitted over | sweep median (120 worlds, `regions=24&ep=10`) | in band |
|---|---|---|---|
| `alpha` | the whole system, hamlets included | **2.26** | no |
| `tail_alpha` | the upper half, the tail Gabaix/Eeckhout describe | **1.65** | **yes** |

The "observed slope median of 2.31" recorded above was the whole-system fit,
compared against a band declared for the upper-half fit. On the metric the
pre-registration actually names, the engine already lands inside the band
(1.44 over a 60-world sample, 1.65 over 120), which is the expected direction:
including the hamlets that deviate from the tail steepens the fit, and Eeckhout
2004 is explicit that the full distribution is lognormal with a power tail only
at the truncated top.

**But the band is not produced by the mechanism this section credits, and that
matters more than the metric mismatch did.** #167 established that the engine
lands inside the declared band on the declared metric. It did not ask *why*, and
the answer is not the Gibrat founding process described above. Two controlled
measurements, both on unmodified `main`, both over 16 worlds:

| configuration | upper-half α | towns | median town |
|---|---|---|---|
| `ep=0`, the founding alone, no epochs at all | **0.69** | 24 | 2859 |
| `ep=2` | 1.42 | 18 | 668 |
| `ep=5` | 1.68 | 19 | 354 |
| `ep=10` (the sweep's setting) | 1.36 | 19 | 589 |
| `ep=10`, **resettlement gate disabled**, nothing else changed | **0.82** | 13 | 2109 |

The 30 founding centuries of proportional growth, run to completion and measured
with no epochs after them, produce **α = 0.69**, outside the band. The band is
reached only once the epochs run, and disabling the single line that lets an
emptied region be resettled drops it straight back to 0.82.

The mechanism doing the work is **settlement churn**: abandonment empties
regions, and the hysteresis gate re-founds them at 40 to 60 people. That stream
of very small towns is what steepens the upper-half fit. Towns fall from 24 to
13 across ten epochs without resettlement, and the median town is four times
larger.

This is not a claim that the number is fake. Churn is a real modelled process
and the towns it creates are real towns. It is a claim that **this section's
attribution was wrong**: the rank-size steepness is a property of the
settlement-turnover dynamics, not of the Gibrat growth rule the docs credited,
and Gabaix's account of Gibrat-with-a-lower-bound is therefore not the right
citation for what the engine actually does here.

One further dependency, found while making blight an absolute load
([#180](https://github.com/zntznt/hinterland/issues/180)): that churn is itself
enabled by the blight field. Give blight an absolute scale and resettlement nearly
stops (about 1 founding per world against 9), and α falls to 0.70 for the same
reason the disabled-gate control does. The band and the blight defect are
therefore coupled, and fixing the latter moves the former.

**And the churn was manufactured by an artifact, which is worse than coupling.**
The first reading of this, above, was that ruined ground is expensive to resettle
on an absolute scale, so the churn stops. That reading is **wrong**, and it was
disproved by trying to reproduce it: strip the ruin penalty out of #180's
habitability regime entirely and α does not recover (0.655, with *fewer*
rebirths, 0.6 per world, because towns then simply never die). The habitability
regime is not what does it.

What does it is the **motion of the denominator**. Blight was renormalised to
each world's own worst cell on every recompute, and measured over 8 worlds that
denominator ranged **5× within a single run** (median; single steps up to 2.6×).
A cell whose own contamination never changed could read double or half from one
epoch to the next because some *other* cell's works opened or closed. That jitter
pushed marginal cells back and forth across the abandonment bar (`livability < 20`)
and the founding bar (`>= 45`), and the spread of town **ages** it produced is
what the upper-half fit was reading as a Zipf tail.

The controlled experiment is decisive rather than suggestive. Freeze main's
denominator at *any* constant and α collapses to 0.65–0.70 with rebirths at
0.6–1.6:

| main, denominator | settled blight p50 | rebirths/world | upper-half α |
|---|---|---|---|
| renormalised to the worst cell (as shipped) | 5 | 9.6 | **1.255** |
| frozen at 3.0 | 10 | 1.6 | 0.700 |
| frozen at 4.8 | 6 | 0.8 | 0.660 |
| frozen at 8.0 | **4** | 0.6 | **0.650** |

At a frozen denominator of 8.0 the blight distribution is p50 4 against main's
p50 5 — the same field, the same units, the same magnitudes — and α still falls
from 1.255 to 0.650. **The level of blight never met this band. The motion of the
scale did.** Any correct normalisation removes it, not only #180's.

**So the target is MISSED, and recorded as missed** in `tools/targets.mjs`
(`missed_since`), with the band left exactly where the literature put it. The
acceptance suite now reports α instead of asserting it, and keeps the failure
modes that are still real (the tail must stay a good power-law fit — it improved,
r² 0.85 → 0.92 — and no world may go degenerate). Retaining the artifact to keep
the number would have been target-fitting of the purest kind: preserving a bug
because it makes a metric look right.

**The honest route back, scoped separately.** The same measurement points at a
real gap: **first-time foundings are 0.0 per world**, on main and under #180
alike. Every "new town" this engine has ever produced is a resettlement. The
frontier path (`livability >= 45 && a settled neighbour`) has never once fired on
ground that never held a town, because the founding pass already settles
everything above the bar. A settlement system that can genuinely open new ground
is what would produce a tail honestly — and it is filed on its own rather than
built here to hit a number.

**So no retune was performed.** Changing the growth-shock variance to move a
number that was never the declared metric would have been tuning the model to
fix a measurement error. The band was NOT widened and the target was NOT
re-aimed: both remain exactly as declared.

**What was fixed instead:** the UI, atlas, and acceptance suite now report and
test the upper-half fit against `targets.mjs`, with the whole-system fit shown
beside it so the two are never confused again.

**One caveat stated plainly.** The band is a claim about the sweep's centre, not
about every world. Per-world dispersion is wide (upper-half q25 1.01, q75 2.34,
range 0.32 to 3.76 over 120 worlds), and only about a fifth of individual worlds
sit inside [1.2, 1.8]. The pre-registered metric is the median, and the median is
what is tested.

**Disposition.** Claim rewritten and metric corrected in
[#167](https://github.com/zntznt/hinterland/issues/167) /
[#169](https://github.com/zntznt/hinterland/issues/169), attribution corrected in
[#181](https://github.com/zntznt/hinterland/issues/181), and the band recorded as
**MISSED** in [#180](https://github.com/zntznt/hinterland/issues/180) once the
churn that met it turned out to be renormalisation noise. No engine retune at any
step, and the band has never been touched.

## 5. Migration, the frontier, and remittances

**The mechanism (landed).** People flow along roads toward higher *expected
income*, destination wealth × an opportunity factor, moderated by amenities
(grid access, low blight), with an outward frontier channel, off-map emigration
under metropole pull, and remittances home.

**The literature.** Expected-income migration is Harris–Todaro *(Harris &
Todaro 1970)*; distance-decay and step-wise flows go back to *(Ravenstein
1885)*; amenities as compensating differentials are *(Roback 1982)*; the
outward-against-the-gradient frontier channel is the Turner hypothesis
*(Turner 1893)*, a contested historical thesis used here as fiction with a
pedigree; remittance effects are surveyed in *(Yang 2011)*.

**Divergences, labeled.** The opportunity factor is a proxy (artifice per
density), not an employment probability estimated from anything. The √
remittance curve is an authored shape gesturing at Yang's findings, not derived
from them. Emigration/remittance coefficients are authored.

**Disposition.** Landed, [#165](https://github.com/zntznt/hinterland/issues/165).
The ad-hoc attractiveness sum (`0.5·wealth + 25·grid + 0.25·(100−blight)`) was
replaced with expected income (wage × employment probability, the latter proxied
by artifice per head) plus a separate Roback amenity term. Frontier and
remittance channels keep their authored constants, labeled.

One clarification that matters for section 8: the amenity term makes blight a
dis-amenity **uniformly**. Every region values clean ground identically, so this
is avoidance, not sorting, and it supplies no income-differentiated channel. That
is why R2 left `corr(blight_load, wealth)` unmoved at +0.25, and why the
"coming to the nuisance" channel had to be scoped separately as
[#178](https://github.com/zntznt/hinterland/issues/178).

## 6. Elite share: the ratchet and the leveler

**The mechanism (landed).** Each region's ownership share evolves by an
ordinary logistic drift `dS = k·(r − g)·S·(1−S)`, where `r` is the return on
the owners' holdings (gates held, works, live seams, the sky lanes, and B2's
placements net of what a bust took off them) and `g` is the region's
per-capita growth plus the competitive churn that bids concentrated rents
toward labour, plus discrete shocks on a separate ledger: plague, collapse,
and won revolts level abruptly; war, occupation, and expropriation
concentrate abruptly.

**The literature.** The drift is Piketty's central dynamic, wealth
concentrates when returns on capital outrun growth *(Piketty 2014; Piketty &
Saez 2003)*. The discrete-shock ledger is Scheidel's thesis that large
levelings have historically come from mass-mobilization war, transformative
revolution, state collapse, and plague, the "Four Horsemen" *(Scheidel
2017)*, and elite persistence through ordinary politics is *(Acemoglu &
Robinson 2008)*.

**Divergences, labeled.** The logistic form and the constant `k` are
authored. `k = 0.6` was picked by sweep, as the *smallest* value clearing all
three pre-registered sub-targets, which bracket it from opposite sides: below
it the no-shock median sits at 0, a coin flip rather than the upward mode
`upward_mode_absent_shocks` asks for; above it the drift starts swamping the
discrete ledger and starving the compressing half. `r` and `g` are both
per-epoch rates but neither is estimated from anything — `r`'s reference
intensity (a held gate plus a works) and its ~5%-per-epoch base return are
authored, and `g`'s per-capita term is clamped to ±0.15 so that a collapse
cannot enter the ordinary channel and be counted a second time against the
shock ledger.

One divergence from the issue's own wording, kept deliberately. #166
enumerates war among the "levelings", and in this engine war **concentrates**
(+5, property surviving people). Scheidel's levelling war is
*mass-mobilization* war; this engine's war is a dynastic border war, which
historically consolidated surviving property claims rather than levelling
them. The move was put on the shock ledger, where #166 asks for it, with its
sign left as the engine has it rather than flipped to match a label.

**Disposition.** Landed, [#166](https://github.com/zntznt/hinterland/issues/166).
The threshold-gated competition term is gone, folded into `g` and no longer
conditioned on the share already exceeding 33. Measured over 24 worlds
(`rg-*`, `regions=12`, `ep=10`, 195 settled regions), the ordinary channel now
runs the way Piketty says it should: stagnant ground deepens the owners' row
by **+7.74** while booming ground **thins** it by **−0.30**, and 36 of 65
booming regions compress with no event at all. Before the change the same
comparison ran *backwards* — −3.57 against +2.19 — because the row simply
tracked the wealth swing, so a boom concentrated and a bust compressed. It
replicates on an independent sweep (`atlas-*`, `regions=24`): +4.32 against
+1.61, 41% of booming regions compressing.

**What it cost, recorded rather than tuned away.** Because `r` outrunning `g`
is the ordinary case, the whole ordinary channel now sits slightly higher, and
B5's older claim that the owners' row falls with no fire at all got rarer:
`elite_ordinary_mean` reads negative in **3 of 24** `eo-*` worlds where #127
measured 6. That is exactly the suite's pin, so the claim survives with no
headroom left. The pin was **not** relaxed to restore margin; it is annotated
in `tools/test.mjs` so a later change to this channel has to re-measure. The
`eo-2` exhibit did have to move to `eo-19`, because under the new form eo-2
reads +4.5 ordinary against +1.3 total and would have illustrated the opposite
of the claim. Re-picking an illustration is legitimate where the sweep
establishes the claim independently; relaxing the sweep's own pin would not
be.

No pre-registered target moved out of range. Same probe over the same 20-world
`atlas-*` sweep, before and after: the upper-half rank-size α median held at
1.255 (band [1.2, 1.8]), `blight_wealth_corr` moved +0.508 to **+0.510**,
between-place gini held at 0.310, and the resource-curse share held at 16 of 20
worlds (on this probe's coarse reading — any settled region above the world's
median endowment and below its median wealth — which is looser than §1's
populated-quadrant count and is quoted here only because it is *unmoved*, not
for its level). The owners' row itself sits about four points higher at every quantile,
elite share p10/median/p90 going 14/24/45 to **19/28/48**, which is the direct
consequence of `upward_mode_absent_shocks`: `r` outrunning `g` is the ordinary
case, and `S·(1 − S)` stalls the drift near the bounds so fewer regions ride the
floor. There is no pre-registered target on the *level* of the elite share, only
on its dynamics, so this is reported rather than corrected.

## 7. The grid and infrastructure rationing

**The mechanism.** The lumen grid extends to a settlement only when
population × wealth clears a build-cost threshold; the road network reaches
everyone but held crossings decay when their tariff no longer funds upkeep.

**The literature.** Cost-benefit-gated rural electrification, connection
follows expected demand, and marginal grid extensions can fail cost-benefit
tests, is the empirical electrification literature *(Dinkelman 2011; Lee,
Miguel & Wolfram 2020; Lipscomb, Mobarak & Barham 2013)*. Toll-funded upkeep
and rot under amnesty is fiction with historical flavor (internal customs and
their maintenance economics; predatory versus productive rule in *(De Long &
Shleifer 1993)*; infrastructure maintenance gaps in *(Foster &
Briceño-Garmendia 2010)*).

**Divergences, labeled.** The threshold exponent and decay constants are
authored. "Occupied ground is always wired" is a narrative construction,
labeled as such in the field guide.

**Disposition.** Docs-label.

## 8. Blight: siting, sorting, and environmental justice

**The mechanism.** Refining emits spoil spread by a distance/downwind/downhill
kernel; a disposal doctrine then allocates the remainder, *concentrate* onto a
sacrifice zone chosen where land is cheap and peripheral, *disperse* by
distance alone, *treat* where wealth and artifice allow. In the planned form,
migration treats blight as a dis-amenity, so people sort away from it as they
can afford to.

**The literature.** Disproportionate exposure of poor communities is the
founding EJ finding *(UCC 1987; Bullard 1990)*; the economics decomposes it
into **siting** (facilities go where land is cheap and resistance is weak) and
**sorting** (housing near nuisances gets cheaper, and those with means leave)
*(Banzhaf, Ma & Timmins 2019; Banzhaf & Walsh 2008)*; plant openings
measurably move local housing values *(Currie et al. 2015)*.

**Divergences, to fix.** The concentrate doctrine targets poverty with a
`(1−wealth)⁶` weight, an exponent chosen for dramatic effect, far beyond any
empirical elasticity, which near-authors the blight-poverty correlation it
then "finds." The planned fix reduces it to `(1−wealth)^1.5`, documented as a
land-price/least-resistance proxy, with the sorting channel running through
migration ([#165](https://github.com/zntznt/hinterland/issues/165)) where the
literature actually locates it. The correlation
remains negative-mode by design intent, matching the literature's sign, and
both signs stay reachable across the doctrine knob; `tools/targets.mjs`
declares the sign expectation and deliberately no coefficient.

**The field itself was broken, and that was the upstream cause**
([#180](https://github.com/zntznt/hinterland/issues/180), landed). `blight_load`
was normalised to each world's own maximum on every recompute, so it never said
"how poisoned is this place", only "how poisoned relative to the single worst
cell right now". The anchor was pathological: the worst cell is the sacrifice
zone, poisoned until it empties, and it is **uninhabited in 15 of 16 worlds**.
Every inhabited place was squeezed into the bottom eighth of an integer scale —
settled p10/median/p90 of **2 / 5 / 13**, roughly twelve distinct values for the
entire population of the model.

It is now an absolute load with a fixed ceiling, so 100 means *ruined* rather
than *worst in show*, and inhabited ground spans **10 / 28 / 51**. Contamination
is also a **stock** now rather than a live reading: it used to be rebuilt from
scratch each epoch out of whichever works were running at that moment, so closing
a works healed its ground instantly and completely (measured on main: 27 → 9 in
one step). Poison outlives its source at a ~50-year half-life. The "Ashen" byname,
which the issue showed was effectively unearnable by a town (1 of 291 settled
regions), is now reached by 5 of 301, in 5 worlds rather than 1.

Two consequences are recorded rather than tuned away. The **city-size band** is
now missed, for the reason set out in section 4 — it was met by the old field's
renormalisation jitter, not by anything the model does on purpose. And the
association between contamination and **disease burden** weakened sharply
(partial correlation 0.85 → 0.23, holding wealth and healing reach fixed). That
second one is the memoryless field showing itself again: when blight was rebuilt
each epoch from the works running *now*, it and disease burden were near-duplicate
readings of one instantaneous quantity, so a near-deterministic relation between
them was guaranteed by construction. Under contaminant persistence a town can sit
on a century of accumulated poison with its works long closed, and exposure
history and present sickness legitimately come apart. The `burdenEnv` coefficient
was **not** moved to recover the old number (sweeping it does move it — 0.115 to
0.40 lifts the partial to 0.67); it sits where the stated conversion rule put it.

**Disposition.** Field fixed and landed,
[#180](https://github.com/zntznt/hinterland/issues/180). The `(1−wealth)⁶`
exponent is a separate question, still tracked as
[#168](https://github.com/zntznt/hinterland/issues/168) — and #180 measured that
one directly: with a real inhabited gradient in place, `^1.5` still *fails* the
both-signs gate and still makes the correlation worse (`^6` +0.103, `^3` +0.409,
`^1.5` +0.583, no negative worlds). So #168 is not blocked on field resolution,
which is what its sequencing assumed.

## 9. Disease burden and access to care

**The mechanism.** Burden per 1k = environmental (blight) + waterborne (unsafe
water) + unmet-need (vulnerability) components, each averted in proportion to
healing reach, which decays with cost-distance to the nearest healer.

**The literature.** Income-health gradients *(Preston 1975; Deaton 2003)*;
travel-time-to-care as the access measure *(Weiss et al. 2018)*.

**Divergences, labeled.** Component weights and the exponential reach constant
are authored shapes, not estimated hazard models. The additive
cause-decomposition is a bookkeeping convenience.

**Disposition.** Docs-label.

## 10. Reforms, impositions, and their long edges

**The mechanism.** A wounded realm may reform (granary, grid charter, toll
amnesty, retention act), react, or, if it stays deaf while external doctrine
pressure is high, have a measure imposed by creditors; every measure grows a
delayed cost (debt service, dependency, capital flight, rotted crossings).

**The literature.** Conditionality and structural adjustment lending, and the
long ambiguity of their effects *(Easterly 2005; Vreeland 2003)*. The
"every mercy curdles" long-edge design is authored narrative mechanics, not an
empirical claim.

**Disposition.** Docs-label.

## 11. Revolts

**The mechanism.** A grievance score (injustice, tolls, darkness, occupation)
against a state-strength roll; won risings free a town whose subsequent
flourishing or starvation depends on its fundamentals.

**The literature.** The grievance-vs-opportunity framing of civil conflict
*(Collier & Hoeffler 2004; Fearon & Laitin 2003)*; subsistence-ethic rebellion
*(Scott 1976)*; relative deprivation *(Gurr 1970)*. The engine takes the
*framing* of this debate, not its findings, the literature notably finds
opportunity and state weakness better predictors than grievance, while the
engine's trigger is grievance-led with state strength as the defense.

**Disposition.** Docs-label, including that inversion of emphasis.

## 12. The order axis

**The mechanism.** One knob moves predation, smuggling, revolt risk, mobility,
investment appetite, and churn in opposite directions, safety and stagnation
from one root.

**The literature.** Limited-access orders trading dynamism for stability
*(North, Wallis & Weingast 2009)*; the stationary bandit *(Olson 1993)*; state
capacity as the underlying variable *(Besley & Persson 2009)*.

**Disposition.** Docs-label.

## 13. Concessions, occupation, and imperial reach

**The mechanism.** An off-map power's attention, keyed to remaining ore and
coastal access, opens concessions (foreign ownership + development + yield
repatriation, wound up when the lode thins) or, rarely, lands troops
(occupation, tribute, force-wiring).

**The literature.** Extractive colonial institutions and their persistence
*(Acemoglu, Johnson & Robinson 2001; Dell 2010)*; concession-economy harms
*(Lowes & Montero 2021)*; dependent development, richer *and* owned, is
*(Cardoso & Faletto 1979)*. The courted→developed→squeezed→abandoned arc is an
authored composite of these, with invented constants.

**Disposition.** Docs-label.

## 14. The world outside

**The mechanism.** Exogenous price/demand/attention/embargo regimes arrive as
a seeded Markov chain the region consumes but cannot move.

**The literature.** Commodity-price volatility as a first-order fact of
resource-exporting economies *(Deaton 1999; Blattman, Hwang & Williamson
2007)*. The 6-regime chain and P_STAY=0.72 are authored.

**Disposition.** Docs-label.

## 15. The shadow economy and social texture

**The mechanism.** Smuggling routes around force projection; black markets
price underservice; legibility gaps undercount the periphery; mobility
ceilings, trust, segregation and tenure columns texture the map.

**The literature.** Informality as exclusion from legal institutions *(De
Soto 1989; Schneider & Enste 2000)*; state legibility and its blind spots
*(Scott 1998)*; distance-limited state authority *(Herbst 2000)*; segregation
measurement *(Massey & Denton 1993)*; betweenness centrality *(Freeman
1977)*. All formulas here are authored one-liners; the columns are texture
with a pedigree, not models.

**Disposition.** Docs-label.

## 16. Geography, biomes, and spatial statistics

**The mechanism.** Elevation noise → ruggedness, rainfall, temperature →
biomes via a temperature×moisture lookup; friction surfaces and cost distance
everywhere; Moran's I computed on exported fields.

**The literature.** The biome lookup is Whittaker's diagram *(Whittaker
1975)*; distance-decay is Tobler's first law *(Tobler 1970)*; central-place
and industrial-location traditions *(Christaller 1933; Weber 1909)* inform the
siting rules; Moran's I and LISA are *(Moran 1950; Anselin 1995)*.

**A caveat the field guide now carries.** The generator's fields are produced
by smoothing kernels over the region graph, and smoothing induces spatial
autocorrelation by construction, a significant Moran's I here is expected,
not discovered. Its honest use is comparative (same world, two policies).

**Disposition.** Docs-label + field-guide caveat.

---

## Stylized facts these worlds could be checked against (but have not been)

Future work, explicitly not done: comparing sweep distributions against
real-world stylized facts, the within/between decomposition of regional
inequality, EJ exposure gradients from EJSCREEN-class data, city-size
distributions for small national systems, resource-dependence vs growth
scatter. Until something like that is done, no sweep statistic in this repo
says anything about the world outside the generator.

## Misses and open divergences

Recorded per the pre-registration discipline (tools/targets.mjs):

**MISS: `blight_wealth_corr` mode "negative".** The declared mode is not met, and it was
not met before any R5 work began. On the default sweep at the shipped `^6` siting
exponent, the per-world correlation over settled regions has a **median of +0.46, with
only 3 of 24 worlds negative**. This is recorded first and separately so the later
numbers are interpretable: the miss is a property of the model as it stood, not a
consequence of the changes that follow it.

Three things belong on the record.

*The metric was ambiguous, and the ambiguity decided the sign.* "Across the default
sweep" never said which regions. The same worlds read **−0.12 over all regions** and
**+0.46 over settled regions only**, and `tools/atlas.mjs` was publishing the former
while every acceptance check used the latter. The metric string has been made precise
(settled-only) as an amendment of precision under the #167 precedent. It is worth being
explicit that this made the target **harder, not easier**: under the all-regions reading
the target already passes. Adopting that reading instead would have been re-aiming by
choice of definition, and the precedent only licenses making a metric more exact.

*The negative correlation the model does show is manufactured by the parameter that
issue [#168](https://github.com/zntznt/hinterland/issues/168) objects to.* Measured:
lowering the siting exponent from `^6` toward the defensible `^1.5` moves the median
**away** from the target (+0.46 to +0.70), and only `^6` with the population multiplier
removed reaches a negative median at all (−0.08). So "the blight falls on the poor" in
this engine has been an artifact of a poverty-targeting exponent far beyond the EJ
literature, rather than a result that survives a defensible siting rule.

*The blocker is upstream of the response, and no sorting mechanism can clear it.* The
settled blight field is crushed by the max-normalisation to roughly **p10 2 / median 6 /
p90 12**, while the sacrifice zone reaches 100 and is then **abandoned in 12 of 16
worlds**: the worst poison ends up on ground where nobody lives. Against a field that
flat, a response-side mechanism would need household relocation rates above 100% per
epoch to drag the median negative. Tracked as
[#178](https://github.com/zntznt/hinterland/issues/178).

`findings.blight_ratio` carries the identical all-regions defect (its "poorest fifth" is
89-100% uninhabited) and is scheduled separately, since it is byte-pinned in all 30
fixtures and quoted in every chronicle.

**`rank_size_alpha` is MISSED as of 2026-08**
([#180](https://github.com/zntznt/hinterland/issues/180)). The declared band
[1.2, 1.8] is unchanged; the engine reads **0.685** on the pre-registered metric.
The full evidence is in section 4, and the short form is that the band was met by
a numerical artifact rather than by any modelled process: blight was renormalised
to each world's worst cell every recompute, that denominator moved 5× within a
single run, and the resulting livability jitter churned marginal towns in and out
of existence. Freeze the denominator at any constant — including one that
reproduces main's exact blight distribution — and α falls to 0.65. The band was
not widened, the artifact was not retained, and the suite now reports α rather
than asserting it.

**Two other acceptance pins turned out to rest on the same artifact**, and both
are now reported rather than asserted, with the evidence in the suite:

- *B3's "migration favours winners in the median world."* Restricted to
  continuously inhabited ground — where migration is the only thing moving people
  — this reads **−0.111 on main** and −0.051 under #180. The published +0.248 came
  entirely from including cells that emptied and came back, whose population delta
  is abandonment and refounding rather than any migration flow. The claim needs
  re-deriving against the migration mechanism itself; it is not a units question
  and was not settled inside #180.
- *The blight leg of the disease-burden emergence check.* Re-pinned 0.3 → 0.15,
  because the old number measured two near-duplicate readings of one instantaneous
  quantity. See section 8.

The code changes themselves were deferred and tracked as issues
[#164](https://github.com/zntznt/hinterland/issues/164)–[#169](https://github.com/zntznt/hinterland/issues/169)
plus [#180](https://github.com/zntznt/hinterland/issues/180);
this section must be updated with any target those tuning runs fail to reach.

## References

Every entry below was web-verified (existence, attribution, and the claim this
page ascribes to it) before inclusion, and each open-access link was tested.
Where no genuinely open copy exists, the entry says so. Books without open
full texts link to the publisher's page, an archive record, or, as a last
resort, the Wikipedia article about the work.

- Acemoglu, Daron, Simon Johnson & James A. Robinson (2001). "The Colonial
  Origins of Comparative Development: An Empirical Investigation." *American
  Economic Review* 91(5): 1369–1401. OA (NBER WP 7771):
  <https://www.nber.org/papers/w7771>
- Acemoglu, Daron & James A. Robinson (2008). "Persistence of Power, Elites,
  and Institutions." *American Economic Review* 98(1): 267–293. OA (NBER WP
  12108): <https://www.nber.org/papers/w12108>
- Anselin, Luc (1995). "Local Indicators of Spatial Association—LISA."
  *Geographical Analysis* 27(2): 93–115. OA mirror:
  <https://dces.wisc.edu/wp-content/uploads/sites/128/2013/08/W4_Anselin1995.pdf>
- Banzhaf, H. Spencer & Randall P. Walsh (2008). "Do People Vote with Their
  Feet? An Empirical Test of Tiebout's Mechanism." *American Economic Review*
  98(3): 843–863. OA copy:
  <https://sites.socsci.uci.edu/~jkbrueck/course%20readings/banzhaf%20and%20walsh.pdf>
- Banzhaf, Spencer, Lala Ma & Christopher Timmins (2019). "Environmental
  Justice: The Economics of Race, Place, and Pollution." *Journal of Economic
  Perspectives* 33(1): 185–208. OA:
  <https://www.aeaweb.org/articles?id=10.1257/jep.33.1.185>
- Barabási, Albert-László & Réka Albert (1999). "Emergence of Scaling in
  Random Networks." *Science* 286(5439): 509–512. OA (arXiv):
  <https://arxiv.org/abs/cond-mat/9910332>
- Besley, Timothy & Torsten Persson (2009). "The Origins of State Capacity:
  Property Rights, Taxation, and Politics." *American Economic Review* 99(4):
  1218–1244. OA (LSE Research Online): <https://eprints.lse.ac.uk/33768/>
- Blattman, Christopher, Jason Hwang & Jeffrey G. Williamson (2007). "Winners
  and losers in the commodity lottery: The impact of terms of trade growth and
  volatility in the Periphery 1870–1939." *Journal of Development Economics*
  82(1): 156–179. OA (author copy):
  <https://chrisblattman.com/documents/research/2007.Winners&Losers.JDE.pdf>
- Bullard, Robert D. (1990). *Dumping in Dixie: Race, Class, and Environmental
  Quality*. Westview Press. Book; no open full text:
  <https://en.wikipedia.org/wiki/Dumping_in_Dixie>
- Caplovitz, David (1963). *The Poor Pay More: Consumer Practices of
  Low-Income Families*. Free Press of Glencoe. Borrowable scan:
  <https://archive.org/details/poorpaymoreconsu00capl>
- Cardoso, Fernando Henrique & Enzo Faletto (1979). *Dependency and
  Development in Latin America*. University of California Press. Publisher
  page: <https://www.ucpress.edu/books/dependency-and-development-in-latin-america>
  (borrowable scan: <https://archive.org/details/dependencydevelo00card>)
- Christaller, Walter (1933). *Die zentralen Orte in Süddeutschland* (English:
  *Central Places in Southern Germany*, trans. Baskin, Prentice-Hall 1966).
  No open full text: <https://en.wikipedia.org/wiki/Central_place_theory>
- Cobb, Charles W. & Paul H. Douglas (1928). "A Theory of Production."
  *American Economic Review* 18(1, P&P): 139–165. OA mirror:
  <http://digamo.free.fr/cobbdoug28.pdf>
- Collier, Paul & Anke Hoeffler (2004). "Greed and Grievance in Civil War."
  *Oxford Economic Papers* 56(4): 563–595. OA (Oxford Research Archive,
  working-paper full text):
  <https://ora.ox.ac.uk/objects/uuid:7c6ea647-eb62-4bb2-ba18-4267010e4913>
- Corden, W. Max & J. Peter Neary (1982). "Booming Sector and
  De-Industrialisation in a Small Open Economy." *The Economic Journal*
  92(368): 825–848. OA (IIASA reprint):
  <https://pure.iiasa.ac.at/id/eprint/2060/7/CP-82-058.pdf>
- Currie, Janet, Lucas Davis, Michael Greenstone & Reed Walker (2015).
  "Environmental Health Risks and Housing Values: Evidence from 1,600 Toxic
  Plant Openings and Closings." *American Economic Review* 105(2): 678–709.
  OA (PMC): <https://pmc.ncbi.nlm.nih.gov/articles/PMC4847734/>
- David, Paul A. (1985). "Clio and the Economics of QWERTY." *American
  Economic Review* 75(2, P&P): 332–337. OA copy:
  <https://econ.ucsb.edu/~tedb/Courses/Ec100C/DavidQwerty.pdf>
- Deaton, Angus (1999). "Commodity Prices and Growth in Africa." *Journal of
  Economic Perspectives* 13(3): 23–40. OA (author page):
  <https://www.princeton.edu/~deaton/downloads/Commodity_Prices_and_Growth_in_Africa.pdf>
- Deaton, Angus (2003). "Health, Inequality, and Economic Development."
  *Journal of Economic Literature* 41(1): 113–158. OA (author page):
  <https://www.princeton.edu/~deaton/downloads/Health_Inequality_and_Economic_Development.pdf>
- De Long, J. Bradford & Andrei Shleifer (1993). "Princes and Merchants:
  European City Growth before the Industrial Revolution." *Journal of Law and
  Economics* 36(2): 671–702. OA (NBER WP 4274):
  <https://www.nber.org/system/files/working_papers/w4274/w4274.pdf>
- Dell, Melissa (2010). "The Persistent Effects of Peru's Mining Mita."
  *Econometrica* 78(6): 1863–1903. OA (author project page):
  <https://dell-research-harvard.github.io/projects/498mita>
- De Soto, Hernando (1989). *The Other Path: The Invisible Revolution in the
  Third World*. Harper & Row. Borrowable scan:
  <https://archive.org/details/otherpathinvisib00soto>
- Dinkelman, Taryn (2011). "The Effects of Rural Electrification on
  Employment: New Evidence from South Africa." *American Economic Review*
  101(7): 3078–3108. OA (working-paper version):
  <https://energia.org/assets/2015/09/dinkelman_electricity_0810.pdf>
- Easterly, William (2005). "What did structural adjustment adjust? The
  association of policies and growth with repeated IMF and World Bank
  adjustment loans." *Journal of Development Economics* 76(1): 1–22. OA (CGD
  WP 11): <https://www.cgdev.org/sites/default/files/2779_file_cgd_wp011.pdf>
- Eeckhout, Jan (2004). "Gibrat's Law for (All) Cities." *American Economic
  Review* 94(5): 1429–1451. OA (author page):
  <https://www.janeeckhout.com/wp-content/uploads/06.pdf>
- Fearon, James D. & David D. Laitin (2003). "Ethnicity, Insurgency, and
  Civil War." *American Political Science Review* 97(1): 75–90. OA (author
  page):
  <https://web.stanford.edu/group/fearon-research/cgi-bin/wordpress/wp-content/uploads/2013/10/apsa011.pdf>
- Foster, Vivien & Cecilia Briceño-Garmendia, eds. (2010). *Africa's
  Infrastructure: A Time for Transformation*. World Bank. OA:
  <https://openknowledge.worldbank.org/handle/10986/2692>
- Frank, Andre Gunder (1966). "The Development of Underdevelopment." *Monthly
  Review* 18(4): 17–31. OA reprint:
  <https://s3-eu-west-1.amazonaws.com/s3-euw1-ap-pe-ws4-cws-documents.ri-prod/9781138824287/ch10/1._Andre_Gunder_Frank,_The_Development_of_Underdevelopment,_1966.pdf>
  (Note: Frank's own vocabulary is "metropolis-satellite"; "comprador" is
  older, Chinese treaty-port-era usage.)
- Freeman, Linton C. (1977). "A Set of Measures of Centrality Based on
  Betweenness." *Sociometry* 40(1): 35–41. OA (archived copy):
  <http://web.archive.org/web/20201125075801/http://moreno.ss.uci.edu/23.pdf>
- Gabaix, Xavier (1999). "Zipf's Law for Cities: An Explanation." *Quarterly
  Journal of Economics* 114(3): 739–767. OA (author page):
  <https://pages.stern.nyu.edu/~xgabaix/papers/zipf.pdf>
- Gibrat, Robert (1931). *Les Inégalités économiques*. Sirey. Book; no open
  full text: <https://en.wikipedia.org/wiki/Gibrat%27s_law>
- Gollin, Douglas (2002). "Getting Income Shares Right." *Journal of
  Political Economy* 110(2): 458–474. OA (working-paper version):
  <https://web.williams.edu/Economics/wp/Gollin_Getting_Income_Shares_Right_working_paper_with_figures.pdf>
- Gurr, Ted Robert (1970). *Why Men Rebel*. Princeton University Press. Book;
  no open full text: <https://en.wikipedia.org/wiki/Ted_Robert_Gurr>
- Hansen, Walter G. (1959). "How Accessibility Shapes Land Use." *Journal of
  the American Institute of Planners* 25(2): 73–76. **No open-access copy
  exists**; publisher record: <https://doi.org/10.1080/01944365908978307>
- Harris, Chauncy D. (1954). "The Market as a Factor in the Localization of
  Industry in the United States." *Annals of the Association of American
  Geographers* 44(4): 315–348. Free to read with a JSTOR account:
  <https://www.jstor.org/stable/2561395>
- Harris, John R. & Michael P. Todaro (1970). "Migration, Unemployment and
  Development: A Two-Sector Analysis." *American Economic Review* 60(1):
  126–142. OA (AEA): <https://www.aeaweb.org/aer/top20/60.1.126-142.pdf>
- Herbst, Jeffrey (2000). *States and Power in Africa*. Princeton University
  Press. Publisher page:
  <https://press.princeton.edu/books/hardcover/9780691164137/states-and-power-in-africa>
- Krugman, Paul (1991). "Increasing Returns and Economic Geography." *Journal
  of Political Economy* 99(3): 483–499. OA copy:
  <https://pr.princeton.edu/pictures/g-k/krugman/krugman-increasing_returns_1991.pdf>
- Lee, Kenneth, Edward Miguel & Catherine Wolfram (2020). "Experimental
  Evidence on the Economics of Rural Electrification." *Journal of Political
  Economy* 128(4): 1523–1565. OA (NBER WP 22292, under its earlier title):
  <https://www.nber.org/papers/w22292>
- Lipscomb, Molly, A. Mushfiq Mobarak & Tania Barham (2013). "Development
  Effects of Electrification: Evidence from the Topographic Placement of
  Hydropower Plants in Brazil." *AEJ: Applied Economics* 5(2): 200–231. OA
  (author copy):
  <https://spinup-000d1a-wp-offload-media.s3.amazonaws.com/faculty/wp-content/uploads/sites/45/2019/07/development-effects-of-electrification.pdf>
- Lowes, Sara & Eduardo Montero (2021). "Concessions, Violence, and Indirect
  Rule: Evidence from the Congo Free State." *Quarterly Journal of Economics*
  136(4): 2047–2091. OA (NBER WP 27893): <https://www.nber.org/papers/w27893>
- Marshall, Alfred (1890). *Principles of Economics*. Macmillan. Public
  domain: <https://archive.org/details/principlesecono00marsgoog>
- Massey, Douglas S. & Nancy A. Denton (1993). *American Apartheid:
  Segregation and the Making of the Underclass*. Harvard University Press.
  Borrowable scan: <https://archive.org/details/americanaparthei0000mass>
- Mehlum, Halvor, Karl Moene & Ragnar Torvik (2006). "Institutions and the
  Resource Curse." *The Economic Journal* 116(508): 1–20. OA (author
  manuscript): <https://ragnarto.folk.ntnu.no/ej_march05.pdf>
- Monmonier, Mark (1996). *How to Lie with Maps*, 2nd ed. University of
  Chicago Press. Book; no open full text:
  <https://en.wikipedia.org/wiki/How_to_Lie_with_Maps>
- Moran, P. A. P. (1950). "Notes on Continuous Stochastic Phenomena."
  *Biometrika* 37(1/2): 17–23. OA mirror:
  <http://www.stat.ucla.edu/~nchristo/statistics_c173_c273/moran_paper.pdf>
- Norris, Pippa & Ronald Inglehart (2004). *Sacred and Secular: Religion and
  Politics Worldwide*. Cambridge University Press. OA frontmatter:
  <http://assets.cambridge.org/97805218/39846/frontmatter/9780521839846_frontmatter.pdf>
- North, Douglass C., John Joseph Wallis & Barry R. Weingast (2009).
  *Violence and Social Orders*. Cambridge University Press. Publisher page:
  <https://www.cambridge.org/core/books/violence-and-social-orders/F0EA15A67E790214408A7485DBC70F0D>
- Olson, Mancur (1993). "Dictatorship, Democracy, and Development." *American
  Political Science Review* 87(3): 567–576. OA copy:
  <https://devf21.classes.ryansafner.com/readings/Olson-1993.pdf>
- Piketty, Thomas (2014). *Capital in the Twenty-First Century*. Belknap
  Press of Harvard University Press. Book; no open full text:
  <https://en.wikipedia.org/wiki/Capital_in_the_Twenty-First_Century>
- Piketty, Thomas & Emmanuel Saez (2003). "Income Inequality in the United
  States, 1913–1998." *Quarterly Journal of Economics* 118(1): 1–39. OA
  (author page): <https://eml.berkeley.edu/~saez/pikettyqje.pdf>
- Prebisch, Raúl (1950). *The Economic Development of Latin America and Its
  Principal Problems*. UN ECLA. OA (CEPAL repository):
  <https://repositorio.cepal.org/handle/11362/29973>
- Preston, Samuel H. (1975). "The Changing Relation between Mortality and
  Level of Economic Development." *Population Studies* 29(2): 231–248. OA
  (WHO Bulletin reprint): <https://pmc.ncbi.nlm.nih.gov/articles/PMC2572360/>
- Ravenstein, E. G. (1885). "The Laws of Migration." *Journal of the
  Statistical Society of London* 48(2): 167–235. Public-domain scan:
  <https://archive.org/details/s4833id1397558>
- Roback, Jennifer (1982). "Wages, Rents, and the Quality of Life." *Journal
  of Political Economy* 90(6): 1257–1278. OA copy:
  <https://matthewturner.org/ec2410/readings/Roback_JPE_1982.pdf>
- Sachs, Jeffrey D. & Andrew M. Warner (1995). "Natural Resource Abundance
  and Economic Growth." NBER Working Paper 5398. OA:
  <https://www.nber.org/papers/w5398>
- Scheidel, Walter (2017). *The Great Leveler: Violence and the History of
  Inequality from the Stone Age to the Twenty-First Century*. Princeton
  University Press. Publisher page:
  <https://press.princeton.edu/books/paperback/9780691271842/the-great-leveler>
- Schneider, Friedrich & Dominik H. Enste (2000). "Shadow Economies: Size,
  Causes, and Consequences." *Journal of Economic Literature* 38(1): 77–114.
  OA sibling (IMF WP 00/26):
  <https://www.imf.org/en/publications/wp/issues/2016/12/30/shadow-economies-around-the-world-size-causes-and-consequences-3435>
- Scott, James C. (1976). *The Moral Economy of the Peasant*. Yale University
  Press. Book; no open full text:
  <https://en.wikipedia.org/wiki/The_Moral_Economy_of_the_Peasant>
- Scott, James C. (1998). *Seeing Like a State*. Yale University Press.
  Publisher page:
  <https://yalebooks.yale.edu/book/9780300078152/seeing-like-a-state/>
- Simon, Herbert A. (1955). "On a Class of Skew Distribution Functions."
  *Biometrika* 42(3/4): 425–440. OA mirror:
  <https://snap.stanford.edu/class/cs224w-readings/Simon55Skewdistribution.pdf>
- Singer, Hans W. (1950). "The Distribution of Gains between Investing and
  Borrowing Countries." *American Economic Review* 40(2, P&P): 473–485. Free
  to read with a JSTOR account (no fully open copy):
  <https://www.jstor.org/stable/1818065>
- Solow, Robert M. (1956). "A Contribution to the Theory of Economic Growth."
  *Quarterly Journal of Economics* 70(1): 65–94. OA mirror:
  <http://piketty.pse.ens.fr/files/Solow1956.pdf>
- Tilly, Charles (1985). "War Making and State Making as Organized Crime." In
  *Bringing the State Back In*, Cambridge University Press, 169–191. OA copy:
  <https://www.bmartin.cc/pubs/19sd/refs/Tilly1985.pdf>
- Tobler, Waldo R. (1970). "A Computer Movie Simulating Urban Growth in the
  Detroit Region." *Economic Geography* 46(sup1): 234–240. OA copy:
  <https://s3.amazonaws.com/arena-attachments/690350/d094ad7d164779d29c60c2d36edbeed0.pdf>
- Turner, Frederick Jackson (1893). "The Significance of the Frontier in
  American History." AHA Annual Report 1893. Public domain:
  <https://archive.org/details/significanceoffr00turnuoft>
- United Church of Christ Commission for Racial Justice (1987). *Toxic Wastes
  and Race in the United States*. OA scan:
  <https://www.nrc.gov/docs/ml1310/ml13109a339.pdf>
- van der Ploeg, Frederick (2011). "Natural Resources: Curse or Blessing?"
  *Journal of Economic Literature* 49(2): 366–420. OA (CESifo WP 3125):
  <https://www.cesifo.org/DocDL/cesifo1_wp3125.pdf>
- Vreeland, James Raymond (2003). *The IMF and Economic Development*.
  Cambridge University Press. Publisher page:
  <https://www.cambridge.org/core/books/imf-and-economic-development/E9E145C05A521B725B4170BCF6C0C7D0>
- Wallerstein, Immanuel (1974). *The Modern World-System*, vol. 1. Academic
  Press. Publisher page (2011 reissue):
  <https://www.ucpress.edu/books/the-modern-world-system-i>
- Weber, Alfred (1909). *Theory of the Location of Industries* (trans.
  Friedrich, 1929). University of Chicago Press. Public domain:
  <https://archive.org/details/alfredweberstheo00webe>
- Weiss, D. J., A. Nelson, H. S. Gibson, et al. (2018). "A global map of
  travel time to cities to assess inequalities in accessibility in 2015."
  *Nature* 553: 333–336. OA (Oxford ORA):
  <https://ora.ox.ac.uk/objects/uuid:e4584ac4-b89c-488a-9f88-57b2fffc1aa8>
- Whittaker, Robert H. (1975). *Communities and Ecosystems*, 2nd ed.
  Macmillan. Book; no open full text (the diagram is documented at):
  <https://en.wikipedia.org/wiki/Biome>
- Yang, Dean (2011). "Migrant Remittances." *Journal of Economic
  Perspectives* 25(3): 129–152. OA:
  <https://www.aeaweb.org/articles?id=10.1257/jep.25.3.129>
- Zipf, George Kingsley (1946). "The P1 P2/D Hypothesis: On the Intercity
  Movement of Persons." *American Sociological Review* 11(6): 677–686.
  Digitized issue: <https://archive.org/details/sim_american-sociological-review_1946-12_11_6>
