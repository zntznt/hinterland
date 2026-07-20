# Hinterland: the Instrument Pivot, direction (DECIDED, v3)

> Status: **DECIDED 2026-07-16**, every §8 question settled by the owner; this is
> the working direction. It sets the largest change since the repo began:
> Hinterland stops being an argument machine and becomes an instrument. Four
> strands in one plan: the epistemic pivot, the setting pivot (a REGION under
> imperial reach, arcane-industrial), the generative-prose pivot (the loom), and
> the red-teamed REIGN + VOICES plan (G5), with the sequencing conflicts between
> them resolved. Work proceeds down the §6 ladder.

---

## 0. Why: the measured indictment

Three complaints, all verified against the current build (schema v39 + the plate UI):

**The sliders don't move the relations.** A 44-world sweep (4 seeds × 11 knob
configurations, measured through the app's own export) found: `iq` at 0 vs 100
produces byte-identical worlds in half the seeds (it weights a single dice roll);
`db` is saturated above its midpoint (100 ≈ default 60 everywhere; only 0 differs,
a binary wearing a 0–100 costume); `bias` moves ≤10% of income at the default `wg`;
and the income mix, the one genuine regime lever (extract → gini 0.81 entrenched;
trade → 0.17), is sum-normalized and built from four collinear proxies for
centrality-to-seat, so ordinary nudges re-weight four ways of pointing wealth at the
same winners.

**The world tells the same story every time.** After stripping proper nouns and
numbers, chronicles of *different seeds* share 36–52% of their sentences verbatim;
the *same seed across knob extremes* shares 68–89%. The Founding act narrates the
same ~10 beats in the same order in every world; "What the Record Shows" is ~100%
fixed template; every world closes on the identical refrain. The qualitative story
space is 3 verdicts × 4 turnings × 5 age characters × a few binaries, a few hundred
shapes, most rare, one dominant.

**The relations are structurally forced.** Every feedback loop is sign-locked:
migration only flows toward rich+wired+clean; the conduit is an adds-only ratchet
whose acceptance test *is* `pop×wealth/cost`; spoil can seek the poor or land on the
nearest, never the rich; elite share has per-epoch structural increments and only
rare-catastrophe decrements; reforms damp terms and never flip signs. Several
headline findings are near-tautologies: injustice is *defined* as blight×poverty
after blight was *aimed* at poverty; the "rank-size law no one decreed" is decreed
by Gibrat-style proportional growth; the mountain shadow exists in 80/80 worlds
because the ridge count is ≥1 by construction.

The root is stated in our own docs: the model was built to prove one thesis. That is
a coherent piece of rhetoric, and zero-information as a generator. **A model that
cannot lose its argument is not evidence for it.** The pivot: mechanisms in,
conclusions out. The socioeconomic-inequality lens stays the way we *look*; the
verdict stops being pre-written.

---

## 1. The constitution (principles that govern every change below)

- **P1: Falsifiability.** Every headline relation must be able to invert somewhere
  in seed × knob space, and the suite must *exhibit* the inversion (see §7). A
  finding true in 100% of worlds is either a definition (then label it as one) or a
  bug.
- **P2: Double edges.** Every mechanism carries both its blades; interplay and time
  decide which cuts. No mechanism may have a hardcoded moral sign. Concentration can
  finance or hoard; a reform can save or rot; a revolt can free a boomtown or kill
  it. The code never knows which; the state does.
- **P3: Neutral instruments.** Metrics measure *shape*: levels, spreads, floors,
  growth, churn, volatility, mobility. Prose describes; judgment belongs to the
  reader. Loaded composites (injustice) survive as clearly-labeled composites among
  neutral lenses, not as the default view of the world.
- **P4: Consequence has length.** Effects land with delays and state-contingent
  signs. Nobody in the world (including the seat, including the player) knows the
  full extent of an action at the moment of acting. The engine must be able to
  reveal, epochs later, that the granary bred the dependency or that the sacrifice
  zone spared the watershed.
- **P5: Generative, never gated boilerplate.** No user-visible sentence is a canned
  string selected by a condition. Verdicts, chronicles, findings, dilemma cards,
  voices, names of people/places/institutions are all composed: fragment grammars,
  typed slots filled from true world facts, markov coinage, selection conditioned on
  the actual columns. (§4; the G5 voices architecture generalizes to the whole
  narrative layer.)
- **P6: The sacred (unchanged).** Determinism and hash replay; schema-versioned
  exports; the measured-then-pinned test discipline; geology/toponymy stability
  under fate and choices; the single-file, no-network promise; QGIS-readiness.

---

## 2. The setting pivot: out of the shire, into the arcane-industrial state

The medieval frame is not just flavor: it *entails* the naive economics. A
static-tech, zero-growth world is Malthusian: every gain is someone's loss, so every
concentration is extraction, so the moral monotone follows from the period
assumption. We leave the period.

**The register (FFXII, not Tolkien):** technology enabled by magic. Metropolises
with precincts and papers. Police states. International politics: embassies,
embargoes, spheres of influence. Industry: the aetherworks, the grid, freight
skyways, refined-lumen markets. And underneath it, the old layer stays: ruins,
buried gods, the maelstrom, sanctified ground, hidden things the modern state paves
over and occasionally wakes. The deep-magic layer is what the modern layer is built
on and afraid of. That tension is the setting.

**Vocabulary shifts (flavor layer; export names versioned deliberately, §6):**

| today (medieval) | pivot (arcane-industrial) |
|---|---|
| the seat / capital | the capital; ministries; the assembly |
| refinery / the works | aetherworks; foundries; yards |
| conduit / lumen grid | the grid; trunk lines; substations |
| garrison / wardline | constabulary; the censorate; precincts |
| tolls at gates | tariffs, concessions, franchise fees |
| the Dominion (lone invader) | one of several foreign powers (§3.6) |
| counting house | banks, syndicates, exchanges |
| shrines / temple reach | the church as ministry + the old faith beneath |
| hamlets / tiers | metropolis / city / works-town / frontier post |
| chronicle | the record: state gazette, papers, censor digests |

**What the setting pivot buys mechanically** (each is a §3 mechanism, not just a
noun swap): industry legitimizes *productivity growth*; banks legitimize a *finance
channel*; the press/censorate legitimizes the voices' two registers; the police
state gives a governance axis orthogonal to wealth (order ↔ liberty); international
politics gives external demand, embargo shocks, and more than one foreign will.

**Explicitly not:** a tech tree. The world is arcane-industrial throughout a run.
What varies is how much artifice each region commands: a level, not an era.

---

## 2.5 The camera and the world's shape (decided 2026-07-16)

The plate stops being a fixed square viewport and becomes a **camera**; the world
stops being a square. Two halves at very different costs, sequenced accordingly.

**The camera (view layer: lands immediately, independent of every other phase).**
- Mechanism: the main map's viewBox becomes the camera (`cam = {x, y, w, h}`),
  preserved across `render()`'s innerHTML rebuilds; the counterfactual panes keep
  whole-world framing (they are comparison thumbnails, not viewports).
- Interactions: wheel and pinch zoom about the cursor; drag pan with click slop
  (sub-threshold pointer travel stays a click, so inspect and pin-capital are
  unharmed); double-click zoom; +/− HUD buttons. **Pan clamps to the world rect:
  never more land than there is.** Min zoom = contain (the whole plate, neatline
  and mat intact); **default view = fit width** (the map fills the window's width;
  tall windows pan north–south).
- Zoom style: **hybrid semantic.** Geometric scaling during the gesture (smooth,
  cheap); on settle, one re-render with labels/glyphs compensated to screen size
  and the existing declutter (`placedLabels`/`tryLabel`) re-run at that zoom, so
  detail and names GROW as you go deeper, Google-Maps style, on the machinery the
  render already has.
- Click math: `getScreenCTM().inverse()` replaces the linear rect map, correct
  under any viewBox, retiring the old square-box invariant permanently. Hit-test
  grab radii divide by the zoom factor so targets stay screen-constant.
- The scale bar recomputes from the camera (the leagues stay honest at every
  zoom). HUD furniture is HTML siblings and stays screen-fixed, as chrome should.
- **`cam=` rides the hash off-default only** (the `lens=` precedent): a share
  link reproduces the exact view being argued about; stock links stay clean.
- Keyboard: `+`/`−` zoom, Shift+arrows pan (bare arrows remain the epoch scrub).

**The world's shape (model layer: Phase B window, slotted as B0.5).**
- The world becomes a **fixed 1600×1000 rectangle (16:10)** for every world. `W`
  generalizes to `WX/WY` across its ~62 use sites; the ~6 tuned distance constants
  (spoil decay /800, temple/magnate reach /300, healer/conduit reach /250, force
  /280…) recalibrate against the new diameter, which is why this is a declared
  model bump with fixture regeneration and suite re-measurement, not a view tweak.
- Exports declare the CRS as planar 0–1600 × 0–1000 (y-up); the QGIS `.qml`
  styles and docs update in the same schema bump.
- **The world's aspect is a WORLD property** (deterministic, exported, identical
  for every viewer), never derived from the window. Fitting the window is the
  camera's job, permanently.

## 3. The economic re-founding: breaking zero-sum, arming both edges

### 3.0 The world outside the map (the region's defining fact)

**The Hinterland is a region, not a world.** Not a planet, not necessarily even a
country: a province with a name the empires mispronounce. The map's edge is not
the edge of anything real, and the single largest force acting on every column in
the export originates OFF the map: world prices for aetherstone, imperial attention
cycles, distant wars, doctrines and fashions born elsewhere, the pull of the
metropole on the region's young. The current model is a closed system; a closed
region is a modeling error, not a simplification.

**The mechanism: a third seed.** Alongside the world seed (the rock) and G5's fate
seed (local luck), a **`world=` parameter** keys a stream family that generates the
OUTSIDE as an exogenous time series the region consumes but cannot affect:

- a **regime chain**: a Markov chain over world conditions (long boom / trade war /
  imperial rivalry / doctrinal panic / distant war / imperial retrenchment), with
  realistic persistence (regimes last years, not epochs). This is the "up our
  markov game" demand applied at the MACRO scale: markov as world-history engine,
  not just word coinage;
- derived **series** consumed by the region's dynamics: the aetherstone price index
  (income shock to every seam and works), imperial attention (how hard the reach
  mechanisms of §3.6 press), foreign demand (the trade pole's strength), doctrine
  pressure (which reforms the creditors demand), the metropole's pull (emigration
  rate, §3.2 migration).

**The observability law (epistemically load-bearing):** the outside is never
rendered: no second map, no simulated empire. It exists in the region exactly as
it exists in a real hinterland: as **texts and numbers that arrive**, exchange
prices, gazette digests, sermons citing foreign doctors, recruiters' handbills,
letters from the emigrated. The loom (§4) gains a gazette register for precisely
this. That is also the honest version of the owner's observation that modern
consciousness is deterritorialized: the region's people increasingly think about,
talk about, and orient toward places they will never see, and the voices must show
it (§3.4's attention column, §4's imported-coinage tier).

**Why this is the falsifiability keystone:** with an exogenous world, the region can
do everything right and be ruined by a price collapse, or do everything wrong and be
rescued by a boom: P4 (consequence has length) at the world scale. No verdict can
be read off the policies alone; you have to look at the data. Which is the app.

### 3.1 The growth channel (the one new state variable)

Each region gains an **artifice index** `A` (0–100): its command of magically-enabled
productivity, machinery, trained hands, licensed workings. Income becomes
`A-scaled`: the existing mix terms multiply against `(0.5 + A/200)` (calibrate), so
a high-artifice periphery can out-earn a low-artifice core. `A` grows by
**investment** (below), **diffuses** weakly to neighbors (works teach), **decays**
slowly without upkeep, and can **crash** (busts, calamities, war). Total wealth is
no longer conserved: the pie can grow, shrink, and grow unevenly, which is the
precondition for every interesting question the app claims to ask.

### 3.2 The double-edge inventory (the heart of the pivot)

For each mechanism: blade A, blade B, and the *contingency* that decides. The code
implements both blades and the contingency; it never implements a verdict.

| mechanism | blade A (as today) | blade B (new) | contingency that picks |
|---|---|---|---|
| concentration / banks | rents extracted; owners' row deepens | an **investment pool**: elite coin funds `A` growth locally and along credit reach, with a lag and a bust risk | live opportunities (seams, routes, low `A` with high potential) vs their absence; censorate confiscation risk deters investment |
| the grid chasing winners | the dark periphery pays the price | early efficiency compounds a **surplus that funds `gtEase`**: the bar falls faster the richer the core got (make the existing quiet mechanic explicit, measured, narrated) | early doctrine (chase vs spread) × realized surplus |
| tariffs/tolls | extraction at gates never chosen | **upkeep**: gate revenue maintains bridges/passes/lines; amnesty without a replacement fund lets them decay; friction rises for everyone | fiscal state of the holder; reform design |
| migration | flows to rich+wired+clean (size begets size) | a **frontier term**: high core rents + cheap periphery land + rising periphery `A` pulls people outward; peripheries can boom | rent differential × opportunity × policing of movement |
| spoil / blight (λ retired) | poverty-seeking dumping | **disposal doctrine** (3-way knob): concentrate (a sacrifice zone), disperse (everyone a little), treat (costs coin, needs `A`); long-run harm depends on where people *later* migrate and what later gets built there (P4) | doctrine × future migration × treatment capacity |
| elite share | ratchets up structurally; falls only on catastrophe | **ordinary erosion**: competition erodes rents where market access is high; boom entry mints new owners (churn without collapse); police states freeze churn | market access; order level; credit openness |
| reforms | damp a term (only the granary moves coin down) | every measure gets its **long edge**: granary → dependency and fiscal drain in long peace; toll amnesty → upkeep crisis; grid charter → debt service; retention act → capital flight | time + the state it lands in (P4 delays) |
| revolts | liberation (won) or crushing | outcome *distribution*: freed towns sometimes boom (suppressed potential released), sometimes collapse (capital and order flee) | the town's fundamentals at the moment of rising |
| policing / order (new axis) | (none) | suppresses predation, smuggling, revolt risk **and** suppresses voices, mobility, entry, investment; high-order worlds are stable and can stagnate | order knob × everything it touches |
| foreign powers | the Dominion lands and extracts | **several powers**: demand for exports (booms), embargoes (busts), patronage of factions, and yes, annexation, a foreign wind that can blow fair or foul | openness knob × diplomacy events × fate |

### 3.3 The knobs, re-founded

The current panel promises regimes and delivers re-parameterizations. The pivot:

- **De-collinearize the mix.** Trade anchors to coasts and *foreign demand*, priced
  against seat-centrality: a trade-heavy world grows a **second pole** that rivals
  the capital instead of feeding it. Extraction anchors to seams; artifice to `A`;
  legacy stays the authored gradient. The weights stay sum-normalized (ratios are
  honest) but the four terms now pull in different directions.
- **Retire λ for disposal doctrine** (concentrate / disperse / treat): three
  regimes, not a saturated dial.
- **`iq` becomes posture, not one coin.** The seat rolls a response posture
  *per crisis* (there will be more than one), weighted by iq; measures accumulate
  and interact (P4 long edges).
- **New knobs (candidates, keep the panel small):** `order` (police state axis),
  `openness` (foreign trade/diplomacy exposure), `credit` (how far bank coin
  reaches). Candidates to retire into doctrine choices: `bias` (fold into legacy
  term), `hb` (fold into openness).
- Every knob ships with a **reach test**: its extremes must produce measurably
  different relations (not just magnitudes) on the calibration sweep, or it doesn't
  ship (§7).

### 3.4 The instruments (neutral panel)

Keep everything we have; add the shape metrics that let a reader see *any* world
clearly, not only the world the old argument expected:

- **growth**: total and per-capita wealth vs founding; per-region `A` trajectories.
- **the floor**: p10 regional wealth vs founding (did the poorest ground rise?).
- **absolute mobility**: share of regions richer than their founding selves.
- **rank churn**: Spearman of wealth ranks founding→close (does *who* is rich
  change, or only how much?).
- **volatility**: per-region boom/bust amplitude.
- **order/liberty**: policing level vs voice suppression (once §5 lands).
- **attention (local ↔ metropolitan)**: where a region's mind lives, driven by
  schooling, grid access, imperial reach, emigration ties; feeds brain drain,
  trust, and the voices' subject matter (§4). The deterritorialization of
  consciousness as a measurable column: the modern condition, instrumented.
- **exposure**: how much of a region's income rides the world price vs local
  demand, the vulnerability-to-elsewhere lens.
- `injustice` survives, renamed in presentation to what it is, a labeled composite
  (`blight × poverty`), one plate among 55+, not the boot lens. The boot lens
  becomes the neutral wealth or a new composite the owner picks.

### 3.5 The verdict space (de-moralized, widened)

The 3-way ΔGini banner becomes a **two-axis verdict (the gap × the floor) with a
growth qualifier**:

| | floor rose | floor fell |
|---|---|---|
| **gap closed** | shared rise | leveling down |
| **gap held** | quiet growth | quiet decay |
| **gap widened** | unequal growth | extraction |

…each qualified by realm growth (boom/stagnant/collapse) → ~12–18 reachable story
shapes, *all of which must appear in the calibration sweep* (§7). "The gap widened
while the poorest fifth grew richer than any founding generation" becomes a world
the engine can generate **and narrate**. Today it can do neither.

### 3.6 Imperial reach (replacing "foreign powers as event source")

The Dominion today is Viking-model empire: it lands, it takes tribute. Real
contemporary empire, the register the owner wants (empires exist NOW; they mostly
never invade), works by **reach**, and annexation is the rare limit case, not the
main event. The empires press on the Hinterland through:

| reach mechanism | in-world form | lands on existing columns |
|---|---|---|
| concessions | foreign capital owns the works; profits repatriate | `retention` becomes partly a FOREIGN claim: the column is already dependency theory's "who keeps what it makes," now applied one level up |
| debt + conditionality | the grid financed by imperial loans; service drains the seat; creditors DEMAND reforms | reforms arrive from outside, not only from `iq`: structural adjustment as an event class |
| standards | ore sells only at the Concordat grade; certification fees; local variants die | market access gated on compliance |
| culture + attention | doctrines, fashions, schooling in the imperial tongue; the young orient toward the metropole | the §3.4 attention column; §4's imported coinage; brain drain via migration |
| diaspora + remittance | people leave the map; coin flows back; some return changed | emigration as a region fact; a wealth inflow decoupled from local production |
| embargo / sanction | the price series gated by politics elsewhere | §3.0's regime chain |
| garrison / annexation | the current Dominion machinery, kept as the LIMIT case when reach fails or the ore matters enough | existing occupation columns |

**The fractal reframe (nearly free, deeply clarifying):** the model already applies
core–periphery economics to the *internal* seat–frontier axis: retention,
centrality, off-grid darkness, even a `comprador_ratio` finding. The pivot is one
sentence: **the seat is itself somebody's periphery.** The same mechanisms, one
level up, mostly off-map. The counting house's second edge (§3.2) sharpens
accordingly: it doesn't just hoard; it *intermediates* between world capital and
local works, and whether that reads as development finance or comprador extraction
depends on the regime chain and the retention split. The model's own vocabulary has
been waiting for this frame.

**Why the empires care at all (the FFXII structure):** Ivalice's Dalmasca is a small
kingdom between two empires because of where it sits and what it holds. The
Hinterland's answer is the ore: **aetherstone is why imperial attention exists**, and
the attention series (§3.0) should be keyed partly to the region's *remaining
endowment*, so a depleting region lives the full arc: courted, developed,
squeezed, and then (the double edge nobody expects) *abandoned*, which is both
ruin (markets leave) and freedom (the levies stop). Resource curse as geopolitics,
not just local economics.

**Internal politics rescaled:** a region's "seat" is not a sovereign crown; it is a
capital-with-a-governor answerable partly to an off-map metropole. Crown/temple/
magnate survive as the governor's office, the church (a ministry above, the old
faith below), and the syndicates, but above all three stands the off-map power
whose demands arrive as §3.0 texts. This makes G5's reign mode BETTER drama: you
play the regional administrator between the metropole's demands and the region's
needs (comply, resist, or skim): the colonial-governor dilemma, which is a richer
seat to occupy than an absolute king's.

v1 scope (owner to size): ONE empire fully mechanized (reach table above) + the
regime chain; a second rival power can arrive later as competition FOR the region
(playing empires against each other is the classic small-place move and a natural
dilemma class).

---

## 4. The prose re-founding: the loom (everything generative)

**Principle P5 applied:** the app currently *selects* sentences; it must *compose*
them. The G5 voices architecture (fragment grammars with typed slots, column-
conditioned fragment classes, markov coinage in per-register lexica, per-substream
determinism) is not a feature of the voices panel; it is **the house prose engine
("the loom")**, built once, consumed by every text surface:

| surface | register | migrates from |
|---|---|---|
| the chronicle | the historian (state record voice) | `composeChronicle`'s fixed beats + 2-variant event prose |
| findings / standfirst | the analyst (numbers-forward) | `findingsHTML`'s canned sentences |
| the verdict | the judge (measured, both-edged) | the 3-way banner |
| dilemma cards (G5) | the ministerial brief | authored card text |
| voices (oral) | the street | (new, per G5 spec) |
| voices (written) | the ledger/censorate | (new, per G5 spec) |
| the gazette | world news arriving in-region: price notices, foreign dispatches, imperial circulars; the ONLY way the outside is ever seen (§3.0's observability law) | (new) |
| names | toponymic + NEW: corporate, precinct, paper, god-under-the-city, foreign-power registers | existing name registers, extended |

**The imported tier (imperialism, audible):** coinage gains a third source, the
imperial tongue, a distinct markov name-register. Loanwords penetrate local voices
at a rate driven by the attention column: frontier oral voices stay dialect-pure
longest, the capital's written record fills with Concordat terms first. Cultural
penetration becomes something you can HEAR in the generated text and MEASURE in a
column, the same fact twice, which is the house pattern.

**Rules of the loom** (inherited from the voices spec, promoted to house law):
fragments are clause templates, never complete sentences; fragment classes are gated
on real columns; slots fill from true facts (names, numbers, events) and are audited
against the export; coined words come from world-level markov lexica (minted once
per world so they repeat like culture); every surface draws from its own
`sx("<surface>#…")` substream; register divergence where registers *should* disagree
is a derived, testable quantity.

**The chronicle specifically:** the fixed founding beats become conditional AND
composed: absence becomes remarkable instead of a filled slot ("no wall crosses
this realm" should be rare and startling, not the else-branch of a template). The
closing refrain dies as a constant; the judge register composes a close from the
verdict axes. Act structure can survive (founding / years / record) as *scaffolding
for composition*, not as fixed text.

**Quality discipline:** every surface migration passes a prototype gate outside the
app first (the G5 pattern): N samples from a real export, skeleton-masked diversity
floors (type-token/bigram entropy with slots stripped), a human-approved fixed
sample committed with the PR, slot audits against the export. Prose changes
deliberately change bytes → each migration coordinates with a declared fixture
regeneration (§6).

**Sameness ceilings (pinned):** cross-seed chronicle template overlap < 0.20 (today
0.36–0.52); within-seed cross-knob overlap < 0.45 (today 0.68–0.89). Measured on
the sweep harness before pinning, per house rule.

---

## 5. THE REIGN + THE VOICES (G5): folded in

The G5 plan is adopted as drafted (it is already red-teamed and adversarially
reviewed), with four amendments that fit it to Parts 1–4. The full G5 text follows
in §5.1 as the working spec; amendments first:

- **(a) Dilemmas are double-edged by construction.** "Every trade-off honest" stops
  being authorial care and becomes mechanical fact: each dilemma option maps onto
  §3.2 mechanisms, so its long edge exists in the physics (P2/P4). Cards state the
  near edge; the far edge is discovered. The verdict panel measures both.
- **(b) The verdict panel uses §3.5's axes** (gap × floor × growth vs the
  auto-history), not a moral score. The judge register composes the judgment line.
- **(c) The voices engine IS the loom** (§4): build once; voices is its first
  surface and its prototype gate is the loom's gate.
- **(d) Sequencing (the one real conflict, resolved):** G5's byte-compat pin is
  against "the current schema" at each point, not v39 forever. The fixture harness
  + fate seed land FIRST (model-neutral infrastructure). The **economic re-founding
  (§3) lands BEFORE the reign engine**, because the dilemma vocabulary should be
  authored against the two-edged economy. Authoring it against v39 physics means
  re-authoring it after. Voices' prototype gate can run in parallel at any time
  (it reads exports, any schema).

### 5.1 The G5 working spec (folded, verbatim save for frame notes)

# THE REIGN + THE VOICES (G5): interactive alternate histories, spoken from below

## Context

Hinterland's histories run on dice the viewer never touches. The owner wants the app
engaging for people who don't (yet) care about its socioeconomic argument: give them
agency, choices presented at epochs that persist for the rest of history, interact
with the existing parameters and each other, and make the charts move because *you*
moved them. Two halves, per the owner's decisions:

- **Step-through reign** (primary UX): history pauses each epoch on a dilemma card;
  your choice is applied; the year runs; the metrics shift. Choice vocabulary is both
  (a) player takeover of decisions the dice currently make and (b) new authored
  dilemmas, flavored strictly arcane-industrial (skyway charters, conduit rationing,
  aetherstone concessions, imperial embassies, freeport pardons, sanctuary
  recognition), **never generic medieval content**.
- **Fate seed**: a separate parameter re-keying only the dynamics RNG substreams
  (same rock, same choices, different luck) with a reroll die. This alone gives the
  "metrics fluctuate wildly" instant gratification.
- **The verdict**: at reign's end, the app judges you against the auto-history (same
  world, same fate, dice deciding). The existing counterfactual machinery makes the
  comparison honest. This is where casual agency meets the app's actual point: *your
  choices had a distributional cost, and it is measured.* [Pivot note: measured on
  the §3.5 axes.]

And threaded through all of it, per the owner's follow-up: **voices from the people**,
generated micro-texts (the era's tweets: market-cries, petitions, censor digests,
songs) that a player can reference when deciding. The realm has a history but not
what the people are *experiencing, saying, recording*, and the oral and written
records must not quite agree, because they never do. As a generative exercise,
pre-written sentences are off the table: paragraphs must be composed, fragment
grammars, markov coinages, slots filled from the world's true names and numbers,
selection conditioned on the actual parameter state. (See VOICES section.)

Everything must ride the URL hash (share a reign, replay it byte-identically), export
in provenance/CSV, narrate in the chronicle, and pass the suite. Schema bump to v40
(v41 if voices ship as their own PR). [Pivot note: version numbers shift under the
§6 ladder; the *discipline* (one declared bump per behavior change) is what's
binding.]

## Architectural keys (verified in exploration)

- `applyAttributes(topology, params, geo)` is a pure function of (geology, knobs);
  the C1 counterfactual (`updateCf`, `CF_MODES`) already re-runs alternates and
  restores byte-identically. **A reign step = re-run stage 3 with `ep = frontier`
  and choices-so-far. No in-loop pause machinery needed.**
- Loop-mutable measure state: `dbShift/gtShift/tollScale/freeTownIdx/granaryOn`
  (+ per-region retention/eliteShare edits). Authored dilemmas map onto THESE, no
  new physics. [Pivot note: after §3 lands, the mutable-state surface grows
  (disposal doctrine, investment pool, order posture); dilemmas map onto the
  richer set, same principle.]
- The reform/reaction dice: `rIns = sx("institutions")`, fires in the epoch loop;
  events recorded as `events.push({epoch, type, ...})`, exported + events.csv;
  chronicle PROSE/MEAS maps. [Line numbers omitted: they drift; grep the names.]
- RNG streams are tag-keyed and independent (`streams(seed)(tag)`): a second
  factory `fx = streams(params.fate || params.seed)` can source only the dynamics
  tags ("events", "institutions", "revolt", "dominion", "factions", "dynasty");
  geology, founding wealth, and all naming stay on the world seed, so a fate reroll
  never renames or reshapes the map.
- Hash plumbing: `DEFAULTS`, `writeHash`, `readHash`, `recomputeAttributes`
  (stage-3-only). Suite: tools/test.mjs + tools/stress.mjs; provenance pin at the
  current schema version.

## Hard invariants (the plan's red lines)

1. **Back-compat**: with no choices and default fate, every world is byte-identical
   to the current-schema output (the dice fall exactly as before; player streams
   must not disturb existing draw order: new substreams only, and choice
   application must *replace* a dice outcome, not add draws to shared streams).
2. **Determinism**: `ch=` (choices) + `fate=` in the hash fully reproduce a reign.
3. **Geology/toponymy blind** to fate and choices (tested).
4. Measured acceptance before pinning; both suite passes green; schema pins.

## Design specifics (frozen)

**Core mechanism.** A reign step never pauses the loop: the controller re-runs pure
`applyAttributes(topology, {...params, ep: frontier}, geo)`, reads `model.decisions`
for the frontier epoch, shows a card, appends the answer to `params.ch`, re-runs:
the C1 counterfactual pattern applied to time.

**Fate seed.** `const fx = streams(params.fate || params.seed)` beside `sx`;
re-key exactly six tags: "events", "factions", "institutions", "revolt", "dominion",
"dynasty". Everything else (geology, founding, siting, naming) stays on `sx`: map
and toponymy byte-stable under fate reroll; empty fate reproduces current draws
exactly.

**Choices.** `params.ch` compact string; **epoch-qualified keys** (`w4:1`); parse to
`{key: option}`; unknown/stale entries ignored (unchosen = dice). `model.decisions`
records every decision point `{epoch, id, region_id?, options, chosen, by:
"player"|"dice"}`. **Golden byte-compat rule:** dice draws are consumed exactly as
today, THEN overridden iff a choice exists; authored dilemmas consume zero RNG and
option 0 is always the no-op status quo: an auto-run cannot diverge from the
fixture.

**Dice takeovers (3 in v1):** `w` wound response (pick mercy / the second measure /
the fist; offer the top-2 DISTINCT eligible measures, suppress the option
otherwise), `r` revolt response (grant the charter / send the wardline / buy peace:
averted outcome; occupied revolt sites offer wardline/buy-peace only), `d` Dominion
arrival (binary: open the quay / burn the approaches; repelled). `s` (succession)
is CUT from v1 (recurring, faction-ambiguous). Each records `by:"player"`.

**Authored dilemmas (6, arcane-industrial, one offered per epoch, priority
a>e>h>k>c>p, once per run; effects strictly via existing mutable state):**
- `a` THE AETHERSTONE CONCESSION (on ore strike): sell the dig to syndics (crown coin,
  local keep falls, owners rise) vs free digging (keep rises, magnate grievance).
- `e` THE IMPERIAL EMBASSY (epoch after annexation): receive the legate (softer
  assessment, collaborators enriched, seat drained) vs war footing (tolls up, coin up).
- `h` THE SANCTUARY WRIT (epoch after consecration): recognize the refuge (mercy,
  Temple grievance) vs census the hidden (coin bought from the desperate).
- `k` THE SKYWAY CHARTER: consortium monopoly (absentee rents + coin) vs common
  carriage (shared sky, poorer seat).
- `c` CONDUIT RATIONING (dark share ≥ 0.4): charter the frontier (light the dark,
  seat pays) vs ration to the core (coin + injustice + revolt pressure).
- `p` THE FREEPORT PARDON: pardon and register (taxing smugglers gentrifies them) vs
  blockade (expensive, immiserates the coast).
Every trade-off honest; nothing strictly dominant. [Pivot note: each option's LONG
edge comes from §3.2 mechanisms once the re-founding lands; see amendment (a).]

**Plumbing.** DEFAULTS `ch:"", fate:""`; writeHash emits only when non-empty (old
URLs unchanged); provenance gains `hinterland.choices/fate/decisions`; events.csv
appends `by`,`option` columns at the end; chronicle gets a `decree` block with
per-option prose and a "the seat chose" lead-in ONLY on player-steered events (dice
runs keep the exact fixture sentences, regression-pinned). Schema bump.

**Reign UI.** Sidebar sec THE REIGN: "Take the Throne", fate input + reroll die
(picks a random 5-char token, then deterministic). Reign controller steps the pure
re-run; `#dilemmaCard` docked panel (cfBox styling, no <dialog>) with 2-3 options +
"let the dice decide"; per-year deltas + an inline gini-per-epoch sparkline (via the
`perEpochGini` helper that now exists in the timeline); map and deltas withheld
until the card resolves (no spoilers). At the target epoch (`params.ep > 0 ?
params.ep : 8`), the VERDICT panel: auto-history re-run (`ch:""`, same fate) via the
updateCf pattern, diff table on the §3.5 axes plus event counts, and one composed
judge-register judgment line. Abdicate keeps `ch` in the hash. "Recant last decree"
pops the last ch entry (one re-run). Counterfactual panel disabled mid-reign
(spoiler). Seed/regions/ep edits abort the reign to a defined state.

## VOICES FROM THE PEOPLE (generative, not canned)

What history feels like from below, referenceable when making reign decisions.
Two registers that deliberately DO NOT agree:

- **The oral record** (what people say): market-cries, rumors, songs, curses;
  emotional, local, unreliable in the direction of lived grievance.
- **The written record** (what gets recorded): petitions, ledger marginalia, censor
  digests, assessors' notes; institutional, euphemistic, unreliable in the
  direction of power.

**Divergence is DERIVED, not decorative:** each voice carries a computed sentiment
(from the region's actual columns), and the oral−written sentiment gap per region is
driven by `legibility`/`uncounted`/`temple_reach`/`force_projection`: where the
census doesn't climb, the street and the ledger disagree most. Exported and testable:
divergence correlates with legibility across seeds (measured, then pinned).

**Generative architecture (no pre-written sentences):**
1. **Fragment grammar**: per-register pools of composable clause fragments
   (grievance / witness / rumor / defiance / petition / euphemism forms), each
   fragment a TEMPLATE with slots, never a complete canned sentence. Assembly walks
   a per-voice substream: 2-4 sentences per paragraph, clause order, connectives,
   diction all drawn.
2. **Column-conditioned content**: fragment CLASSES are gated by the region's real
   state: toll fragments require `tollBurden` high, poison fragments `blight`,
   owners'-row fragments `eliteShare`, occupation fragments `occupied`, hunger
   fragments granary/wealth, sky fragments `skyAdvantage`/stillair. Slots fill from
   TRUE world facts: town/river/pass/ruler/event names, real numbers ("the third
   levy this season"), epithets. A paragraph is wrong only in voice, never in fact,
   or deliberately wrong in the oral register (rumor distortion drawn from
   trust/legibility, flagged internally).
3. **Markov coinage**: the chain machinery (`markovWord`, register corpora) coins
   the invented nouns the fragments need (oaths, songs' burden-words, slang for
   the grid/aetherstone/the foreign powers) in the REGION'S name register (frontier
   voices swear differently than lowland ones; temple-adjacent voices cite liturgy).
   Coinage is a WORLD-LEVEL lexicon (3-5 terms per register, minted once, reused) so
   oaths repeat like culture; per-voice nonces read as noise, not dialect.
4. **Determinism**: every voice from `sx("voice#<region>#<epoch>#<kind>")`;
   byte-stable, rides exports. Fate reroll changes voices only via changed history.

**Surfacing:** (a) each dilemma card quotes 2-3 voices from the affected regions
(oral + written, disagreeing where the columns say they should) as the evidence you
decide on (cards quote epoch e−1, resolving card-time circularity); (b) a VOICES
panel per epoch in reign mode (and on the scrubber for non-reign worlds); (c) the
inspector's region card gains "what they say / what is written"; (d) export:
voices.csv (epoch, region_id, register, sentiment, text) + `hinterland.voices`
provenance; the chronicle may quote one voice per Year entry. Volume cap: ~3 oral +
2 written per epoch, chosen from the most newsworthy regions (largest state delta /
event sites), deterministically.

**The concrete grammar is specified** in the companion voices spec (fragment
taxonomy with honest collision math: ORAL 110 fragments/7 classes, WRITTEN 96/6,
~60 connectives each; heaviest class ~34 draws/world; typed slot system: verbatim
name slots, digits in WRITTEN only, markov coin slots in two tiers; column-predicate
gating on every fragment; sentiment formula + divergence law D = 0.45·legibility_gap
+ 0.15·(100−trust) with the censor's corridor on occupied ground, invariants V1-V5;
rumor distortion as a PURE function of columns: folk-fractions, no digits, names
never distorted, a facts[] audit table per voice; six worked example paragraphs as
the quality bar; and the prototype-gate script spec: voices-proto.mjs, 50 voices +
facts tables + V1-V5 PASS/FAIL + repetition histogram from a real export).
[Owner: copy the companion's marked block to scratchpad/voices-spec.md on approval;
the file lives with the drafting agent's output, not yet in this repo.]

Two hardest problems, named up front: euphemism-join flatness in the written
register (mitigated by strict syntactic typing of what each fragment attaches to;
the prototype gate exists mainly to catch this) and the house-style-of-lying
tension (deterministic distortion risks uniformity; folk-ladder snapping hides
some, judged at the gate).

**Voice tests:** determinism (same hash → identical voices); generative variety
(across 30 sampled voices, no two paragraphs identical; measured fragment-class
entropy above a pinned floor; skeleton-masked type-token/bigram entropy over ~200
voices + a human-reviewed fixed sample committed with the PR); parameter reflection
(high-toll regions' voices draw toll-class fragments, plagued regions mention their
named plague; assert class presence, not exact strings); divergence law (unit-test
of the mapping + fixed-seed ORDERING assertion: the max-legibility-gap region shows
a larger register gap than the min + content assertions: oral draws grievance
classes, written draws euphemism classes); every referenced name/number verifiably
true against snaps[epoch] (epochSnaps gains the gated/driver columns; the slot
audit runs against the snapshot, not final columns); no Cyrillic; register match
(frontier region voices use frontier coinages).

## How we implement this without risk (G5's stages, kept)

Staged increments with abort gates: each stage independently shippable, full suite
green, proves its own invariant before the next builds on it. Riskiest unknowns
proven OUTSIDE the app first.

- **Stage 0: golden fixtures + fate seed.** FIRST the golden fixture harness
  (exports snapshotted into tools/fixtures/ for a seed×knob matrix,
  equality-modulo-allowlist check, the enforcement mechanism every later PR is
  judged by; pin scope: world state + events + chronicle text identical; provenance
  modulo an explicit allowlist). Then the `fx` factory, six re-keyed tags,
  hash/DEFAULTS, isolation tests, fate die button.
- **Gate (no PR): voices prototype** in the scratchpad against a real export;
  owner approves the text quality bar before any voices code lands in the app.
- **Stage/PR: reign engine, headless.** THE BYTE-PIN TEST IS WRITTEN FIRST. Echo-
  the-dice invariant per takeover (echoing the dice's own outcome must be
  byte-identical to the auto run, which catches off-by-one draws in override paths).
  Then takeovers and dilemmas one at a time, each with its per-option effect test.
  Playable via hash alone; no UI risk yet.
- **Stage/PR: voices engine in-app.** Additive-only; own substreams provably
  cannot disturb dynamics draw order; UI limited to inspector rows until the reign
  UI lands.
- **Stage/PR: reign UI.** A pure consumer of the engine; composes hash strings and
  re-runs the pure stage-3 function; cannot corrupt an export by construction. DOM
  tests + Playwright walkthrough.

## G5 adversarial-review findings (each must land with its fix)

1. **`averted` revolt outcome ripples through 6 verified consumers**: `crushedIdx`
   treats `!revoltWon` as crushed and would garrison a town peacefully bought off
   (exclude averted); the epithet cascade must yield no byname for averted; the
   chronicle revolt branch and both turning-point prose sites are binary won/else
   and need an averted arm; suite checks pinning the won/crushed enum extended with
   reason comments.
2. **`d` repelled annexation**: behaves like a no-arrival world for dominion-
   dependent findings (such worlds exist), but the chronicle annexation narration
   and any "annexation implies dominion"-shaped suite check must learn
   `outcome:"repelled"`. Audit before pinning.
3. **Skipped `rIns()` draws are byte-safe** on AUTO runs only (verified: the
   conditional draws have no later consumers); steered branches may legally differ
   in draw count. Keep the invariant test on auto runs only.
4. **Treasury floor**: dilemma costs can drive `treasuries.crown` negative; clamp
   at 0 with a load-bearing comment (or the war/seizure math misbehaves).
   Treasuries/tensions exported in provenance so dilemma effect tests are
   measurable.
5. **Voices volume cap** (see Surfacing above).
6. **Null-fork reigns**: a run where no decision ever triggers needs the verdict
   panel's "history offered no forks" line, not a degenerate diff table.
7. **Reign target-epoch expression**: `params.ep > 0 ? params.ep : 8`.
8. **Voice streams**: keyed `sx("voice#<region>#<epoch>#<kind>")`, never drawn
   from shared streams (auto-run byte-compat holds even with voices generated on
   every run).

## G5 known risks (addressed in design)

- "institutions" stream order: respCoin stays pre-loop; skipped conditional draws
  have no later consumers (verified); draw-then-branch everywhere else.
- Spoilers: UI holds render until the card resolves.
- Stale ch after seed/ep edits: ignored by design, documented in hints.
- Counterfactuals during a reign inherit ch/fate (correct); captions say so.

---

## 6. The unified ladder (sequencing all four strands)

Each phase = a PR series, each PR suite-green, fixtures regenerated ONLY at declared
model bumps with a CHANGELOG schema entry (the house discipline). Order chosen so no
phase authors content against physics a later phase replaces.

- **Phase V: the camera (view-only; independent, may run before or parallel to
  Phase A, since it never touches the model or exports).**
  V1: the camera itself, viewBox state, wheel/pinch/drag/double-click with click
  slop, world-rect clamps, contain↔fit-width range, CTM click mapping, zoom-scaled
  hit radii. V2: the semantic settle, compensated label/glyph re-render, zoom-
  aware declutter, camera-aware scale bar, `cam=` hash, +/− HUD buttons,
  Shift+arrow pans. (The camera is shape-agnostic; it needed no rework when B0.5
  landed the 1600×1000 rectangle; only `camContain` learned the 16:10 aspect.)
- **Phase A: instrumentation (model-neutral).**
  A1: golden fixture harness (G5 stage 0's first half), the enforcement mechanism.
  A2: fate seed (G5 stage 0's second half). Schema bump.
  A3: neutral metrics ADDED (growth, floor, mobility, churn, volatility as lenses +
  findings entries; additive, old verdict untouched). The sweep harness from the
  diagnosis becomes `tools/sweep.mjs`. The knob-reach and sameness-ceiling
  measurements join the suite as tracked numbers.
- **Phase B: the economic re-founding (§3), one mechanism per PR.**
  Suggested order: **B0 the world outside** (`world=` param, regime chain, price/
  attention/demand series consumed as boundary conditions; lands FIRST in B
  because every later mechanism should be authored against an open region, not a
  closed one); **B0.5 the world's shape** (the 1600×1000 rectangle per §2.5;
  rides the same regeneration window as B0, before any mechanism is recalibrated
  against distances that would only change again); B1 artifice index + income scaling; B2 investment pool (banks'
  second edge, comprador split per §3.6); B3 migration frontier term + emigration/
  remittances; B4 disposal doctrine (retire λ); B5 ordinary elite erosion/churn;
  B6 tariff-upkeep coupling + decay; B7 reform long edges + creditor-imposed
  measures; B8 revolt outcome distribution; B9 order axis; B10 mix
  de-collinearization + knob retirements; B11 imperial reach v1 (§3.6 table).
  EVERY PR ships its falsifiability test (§7) and regenerates fixtures
  deliberately. The old thesis must remain *reachable* (extraction worlds still
  exist); it just stops being the only world.

  **The minimum coherent pivot** (the smallest B-subset after which the model is
  honest even if shallow, and a safe place to pause): B0 + B1 + B2 + the §3.5
  verdict axes + Phase A's neutral lenses. Below that line, stopping mid-B leaves
  a chimera (some mechanisms double-edged, others sign-locked) whose failures read
  as bugs; at or above it, every further B-PR is pure deepening.

  **The two failure modes, named:** the old engine's sin was MONOTONE (one story
  always); the naive fix's sin is MUSH (double edges canceling in expectation, so
  sliders go dead again: sameness through symmetry). The design rule that avoids
  both: edges must be asymmetric in TIME and STATE, never balanced in expectation.
  concentration finances in credit-rich booms and hoards in busts, so the world has
  REGIMES, not noise. §7.3's verdict-diversity floor is the tripwire for mush.
- **Phase C: the setting re-skin.** Vocabulary, registers, tier names, export
  naming policy (aliases vs versioned renames, owner decision), README/field-guide
  rewrite. Cheap after B; painful before it.
- **Phase D: the loom (§4).** D1: engine core + world lexica (behind no surface).
  D2: voices as first surface (G5 voices PR, post-gate). D3: findings migration.
  D4: chronicle migration (the big one; sameness ceilings pinned here). D5: verdict
  composition. Each surface passes its prototype gate outside the app first.
- **Phase E: the reign (G5).** E1: headless engine + takeovers + dilemmas
  (authored against Phase-B physics). E2: reign UI + verdict panel (on §3.5 axes)
  + dilemma cards quoting voices. Playwright walkthrough closes it.
- **Continuous:** the atlas regenerates after B and after D; it is the public
  evidence the possibility space exists (its calibration table should show verdict-
  class diversity, not one dominant story).

Phases B, C, D are internally reorderable at PR granularity; the hard edges are:
A before everything; B before E (dilemma authoring); D's engine core before D's
surfaces; the voices gate before D2.

## 7. Acceptance: the falsifiability suite (the pivot's own test)

Beyond the house suite, the pivot adds a standing acceptance block:

1. **Inversion exhibits.** For every headline relation, a pinned seed×knob fixture
   where it inverts: blight lands on the rich; a periphery out-grows the core; the
   owners' row shrinks across a run without a catastrophe; a reform measurably
   backfires; the grid reaches the poor first under the spread doctrine; primacy
   falls; a police state stagnates while an open rival booms; a world boom rescues
   a badly-governed region and a price collapse ruins a well-governed one. Each
   exhibit is a URL in the atlas, a world you can open. **Density requirement:**
   an inversion must occur at meaningful frequency somewhere in the calibration
   sweep (measured, then pinned per relation), not merely exist in one absurd
   corner of knob space: existence proofs can be gamed; distributions cannot.
2. **Knob reach.** Every shipped knob's extremes change at least one *relation*
   (sign or class), not just magnitudes, on the calibration sweep. (Today iq and
   db>50 would fail this: that's the point.)
3. **Verdict diversity.** Across the 80-world calibration sweep at default knobs
   with ep>0: no verdict class (§3.5) exceeds ~40%; at least 6 of the classes
   appear. Thresholds measured before pinning.
4. **Sameness ceilings.** Chronicle template overlap: cross-seed < 0.20,
   within-seed cross-knob < 0.45 (both measured on the loom, pinned at D4).
5. **Definition honesty.** Composite metrics (injustice) are labeled as composites
   in every surface that shows them; the suite greps the label.

## 8. Decisions (settled by the owner, 2026-07-16)

1. **Schema naming: clean versioned break.** Columns rename once at the Phase C
   schema bump; the QGIS `.qml` styles regenerate in the same PR (we own them:
   serialize+parse-in-one-change discipline). Old exports stay readable under
   their old `schema_version`. No alias columns.
2. **Empires v1: two-pole lite.** One empire fully mechanized (the whole §3.6
   reach table) plus a named RIVAL present in the regime chain, the gazette, and
   diplomacy dilemmas (courting the second power against the first), without its
   own full reach machinery until v2. The region's own history leaks out as
   flavor only: it moves the world's texts, never its series.
3. **Boot lens: wealth.** The neutral opener; `injustice` becomes one labeled
   composite plate among many.
4. **Knob retirements: both.** `bias` folds into the legacy term's definition;
   `hb` becomes the closed end of the `openness` axis. Old hash params map
   forward so shared links keep meaning.
5. **The old thesis: kept as an essay.** A short docs piece: what the project
   originally argued, why the engine no longer presumes it, and where in the
   possibility space the extraction worlds live.
6. **Voices companion spec: LANDED as `docs/voices-spec.md` (v2).** The owner
   supplied the drafting agent's v1; v2 de-medievalizes it (arcane-industrial
   skins, trades, units, examples) and de-biases it per this document: trajectory
   terms in the sentiment model, aspiration/elsewhere classes in ORAL, puffery/
   circular classes in WRITTEN, per-topic SIGNED written skew (the record lies
   toward the institution's interest, not uniformly toward calm), the generalized
   censor's corridor, the imperial coin tier, and a new V6 balance invariant so
   the street can never again be a grievance monotone. §5.1's reference resolves.
7. **World seed default: one shared era.** Default `world=` is a fixed constant
   (the Concordat era): every region generated at defaults lives through the SAME
   world history; the atlas becomes 80 hinterlands of one world. An explicit
   `world=` gives a different history.
8. **Default epochs, `ep: 10`.** Dynamics run out of the box; the founding
   snapshot remains available at `ep=0`. Default URLs change meaning at the
   Phase A fixture declaration.
9. **The seat: the governor.** The reign mode plays the region's administrator,
   answerable partly to the off-map metropole; dilemmas gain the
   comply / resist / skim axis; G5's card vocabulary re-anchors to this seat.
10. **Zoom style: hybrid semantic.** Geometric during the gesture; compensated
    re-render with zoom-aware declutter on settle (§2.5).
11. **World shape: fixed 1600×1000 (16:10).** A world property, never a window
    fit; lands as B0.5 in the Phase B regeneration window.
12. **Default view: fit width.** Min zoom contains the whole plate; pan clamps
    at the world's edges.
13. **Camera in the hash: yes, off-default only** (`cam=`, the `lens=`
    precedent): share the exact view; stock links stay clean.

---

*Drafted from: the 44-world knob sweep + mechanism inventory (2026-07-16), the G5
REIGN+VOICES plan (owner's draft, red-teamed), and the owner's direction: possibility
space first, arcane-industrial setting, everything generative, the inequality lens as
the way we look, not the verdict we wrote.*
