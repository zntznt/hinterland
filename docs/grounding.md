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

**Disposition.** Code fix planned, tracked as [#164](https://github.com/zntznt/hinterland/issues/164):
the current linear artifice multiplier `0.3 + A/100` has no cited form and
makes income collapse ~70% on an artifice crash; it is to be replaced by the
Solow-form power scaling.

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
migration, then epochs continue the dynamics.

**The literature.** Proportional growth is Gibrat's law *(Gibrat 1931)*;
Zipf's α ≈ 1 for city sizes arises from Gibrat growth with a lower-bound
friction **in the large-system limit** *(Gabaix 1999)*; real full distributions
are lognormal with a power tail only at the truncated top *(Eeckhout 2004)*;
size-attraction is preferential attachment *(Simon 1955; Barabási & Albert
1999)*.

**Divergences, to fix.** The UI announces "a rank-size law no one decreed
(Zipf's constant is ≈1)" while the sweep's observed slope has a median of
2.31, the law IS decreed (the growth rule is Gibrat by construction, as the
design docs concede) and the constant is not ≈1. Both ends are to be fixed,
tracked as [#167](https://github.com/zntznt/hinterland/issues/167) and
[#169](https://github.com/zntznt/hinterland/issues/169): retune the
growth-shock variance toward the pre-registered band α ∈ [1.2, 1.8]
(`tools/targets.mjs`, declared before tuning; α = 1 is not a small-system
prediction), and restate the UI/chronicle text honestly: a built-in Gibrat
regularity whose steepness is the finding.

**Disposition.** Code fix planned, tracked as [#167](https://github.com/zntznt/hinterland/issues/167) (retune) and [#169](https://github.com/zntznt/hinterland/issues/169) (claim rewrite).

## 5. Migration, the frontier, and remittances

**The mechanism (as planned; current form is an ad-hoc attractiveness sum).**
People flow along roads toward higher *expected income*, destination wealth ×
an opportunity factor, moderated by amenities (grid access, low blight), with
an outward frontier channel, off-map emigration under metropole pull, and
remittances home.

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

**Disposition.** Code fix planned, tracked as [#165](https://github.com/zntznt/hinterland/issues/165):
replace the current ad-hoc attractiveness sum with the expected-income ×
amenities form. Frontier and remittance channels keep authored constants,
labeled.

## 6. Elite share: the ratchet and the leveler

**The mechanism (as planned; the current form is event bumps + a
threshold-gated competition term).** Each region's ownership share evolves by
an ordinary logistic drift `dS ∝ (r − g)·S·(1−S)`, where `r` proxies returns
on holdings (refining, gates, land rents) and `g` is the region's per-capita
growth, plus discrete shocks: war, plague, collapse, and won revolts level
abruptly; occupation and expropriation concentrate abruptly.

**The literature.** The drift is Piketty's central dynamic, wealth
concentrates when returns on capital outrun growth *(Piketty 2014; Piketty &
Saez 2003)*. The discrete-shock ledger is Scheidel's thesis that large
levelings have historically come from mass-mobilization war, transformative
revolution, state collapse, and plague, the "Four Horsemen" *(Scheidel
2017)*, and elite persistence through ordinary politics is *(Acemoglu &
Robinson 2008)*.

**Divergences, to fix.** The current implementation is asymmetric in a way
the docs denied: common events increment the share while ordinary decrements
are threshold-gated, yet the design principles claim "no mechanism may have a
hardcoded moral sign." The r−g form will make the ordinary channel genuinely
two-signed, boom regions where g outruns r compress through the ordinary
channel, while keeping the empirically defensible Scheidel asymmetry in the
*shock* ledger, where the literature actually puts it. The logistic form and
the constant k remain authored.

**Disposition.** Code fix planned, tracked as [#166](https://github.com/zntznt/hinterland/issues/166).

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

**Disposition.** Code fix planned, tracked as [#168](https://github.com/zntznt/hinterland/issues/168); docs-label meanwhile.

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

Recorded per the pre-registration discipline (tools/targets.mjs): none yet.
The code changes themselves are deferred and tracked as issues
[#164](https://github.com/zntznt/hinterland/issues/164)–[#169](https://github.com/zntznt/hinterland/issues/169);
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
