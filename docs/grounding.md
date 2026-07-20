# Grounding: each mechanism, the real literature, and the honest distance between them

Read [provenance.md](provenance.md) first. This page maps every substantive
mechanism in the generator to the published, openly available social science it
draws on, and states, mechanism by mechanism, what the implementation takes
from that literature, where it diverges or simplifies, and whether the
divergence was fixed in code or labeled and left. Full verified references with
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
economy with distinct sectors. The re-derived scaling treats `A` as
capital-intensity/TFP in a Solow frame *(Solow 1956)*: income scales as
`(A/70)^0.35`, a power form with diminishing returns whose exponent is the
conventional capital share ≈ ⅓ *(Cobb & Douglas 1928; Gollin 2002)*. Water
remains a multiplicative limiting factor (a Leontief-flavored gate), which is a
modeling choice, not a cited result. Extraction income retained locally vs
repatriated follows the resource-curse and dependency traditions *(Sachs &
Warner 1995; Prebisch 1950; Singer 1950)*.

**Divergences, labeled.** The stream weights (`we/wf/wt/wg`) are user knobs,
not estimated shares. The trade term's coefficients (0.78 sea / 0.22 land) are
authored. Total wealth non-conservation ("a boom grows the pie") is a Solow-
consistent qualitative property, not a calibrated growth path.

**Disposition.** Code fix (R1): the old linear artifice multiplier
`0.3 + A/100`, which had no cited form and made income collapse ~70% on an
artifice crash, was replaced by the Solow-form power scaling.

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
1974; Cardoso & Faletto 1979)*, "comprador," where the docs use it, is
vocabulary from that tradition, used deliberately.

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
migration, then epochs continue the dynamics.

**The literature.** Proportional growth is Gibrat's law *(Gibrat 1931)*;
Zipf's α ≈ 1 for city sizes arises from Gibrat growth with a lower-bound
friction **in the large-system limit** *(Gabaix 1999)*; real full distributions
are lognormal with a power tail only at the truncated top *(Eeckhout 2004)*;
size-attraction is preferential attachment *(Simon 1955; Barabási & Albert
1999)*.

**Divergences, fixed.** The UI used to announce "a rank-size law no one
decreed (Zipf's constant is ≈1)" while the sweep's measured slope had a median
of 2.31, the law WAS decreed (the growth rule is Gibrat by construction, as
the design docs conceded) and the constant was not ≈1. Both ends were fixed:
the growth-shock variance was retuned toward the pre-registered band
α ∈ [1.2, 1.8] (`tools/targets.mjs`, declared before tuning; α = 1 is not a
small-system prediction), and the UI/chronicle text now states the honest
relationship: a built-in Gibrat regularity whose steepness is the finding.

**Disposition.** Code fix (R4): retune + claim rewrite.

## 5. Migration, the frontier, and remittances

**The mechanism.** People flow along roads toward higher *expected income*,
destination wealth × an opportunity factor, moderated by amenities (grid
access, low blight), with an outward frontier channel, off-map emigration under
metropole pull, and remittances home.

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

**Disposition.** Code fix (R2): the old ad-hoc attractiveness sum was replaced
by the expected-income × amenities form. Frontier and remittance channels keep
authored constants, labeled.

## 6. Elite share: the ratchet and the leveler

**The mechanism.** Each region's ownership share evolves by an ordinary
logistic drift `dS ∝ (r − g)·S·(1−S)`, where `r` proxies returns on holdings
(refining, gates, land rents) and `g` is the region's per-capita growth, plus
discrete shocks: war, plague, collapse, and won revolts level abruptly;
occupation and expropriation concentrate abruptly.

**The literature.** The drift is Piketty's central dynamic, wealth
concentrates when returns on capital outrun growth *(Piketty 2014; Piketty &
Saez 2003)*. The discrete-shock ledger is Scheidel's thesis that large
levelings have historically come from mass-mobilization war, transformative
revolution, state collapse, and plague, the "Four Horsemen" *(Scheidel
2017)*, and elite persistence through ordinary politics is *(Acemoglu &
Robinson 2008)*.

**Divergences, fixed.** The pre-revision implementation was asymmetric in a
way the docs denied: common events incremented the share while ordinary
decrements were threshold-gated, yet the design principles claimed "no
mechanism may have a hardcoded moral sign." The r−g form makes the ordinary
channel genuinely two-signed, boom regions where g outruns r now compress
through the ordinary channel, while keeping the empirically defensible
Scheidel asymmetry in the *shock* ledger, where the literature actually puts
it. The logistic form and the constant k remain authored.

**Disposition.** Code fix (R3).

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
distance alone, *treat* where wealth and artifice allow. Migration treats
blight as a dis-amenity, so people sort away from it as they can afford to.

**The literature.** Disproportionate exposure of poor communities is the
founding EJ finding *(UCC 1987; Bullard 1990)*; the economics decomposes it
into **siting** (facilities go where land is cheap and resistance is weak) and
**sorting** (housing near nuisances gets cheaper, and those with means leave)
*(Banzhaf, Ma & Timmins 2019; Banzhaf & Walsh 2008)*; plant openings
measurably move local housing values *(Currie et al. 2015)*.

**Divergences, fixed.** The concentrate doctrine used to target poverty with a
`(1−wealth)⁶` weight, an exponent chosen for dramatic effect, far beyond any
empirical elasticity, which near-authored the blight-poverty correlation it
then "found." R5 reduced it to `(1−wealth)^1.5`, documented as a
land-price/least-resistance proxy, and the sorting channel now runs through
migration (R2) where the literature actually locates it. The correlation
remains negative-mode by design intent, matching the literature's sign, and
both signs stay reachable across the doctrine knob; `tools/targets.mjs`
declares the sign expectation and deliberately no coefficient.

**Disposition.** Code fix (R5) + docs-label.

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

Recorded per the pre-registration discipline (tools/targets.mjs): none yet,
this section is written before the R1–R5 tuning runs and must be updated with
any target the tuning fails to reach.

## References

<!-- POPULATED FROM VERIFIED SOURCES, every entry web-verified for existence,
     attribution, and an open-access link before inclusion. -->
