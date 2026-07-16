# Hinterland: the Instrument Pivot — direction (DRAFT v1)

> Status: DRAFT for the owner's edit. Nothing here is pinned. This document sets
> direction for the largest change since the repo began: Hinterland stops being an
> argument machine and becomes an instrument. It folds four strands into one plan —
> the epistemic pivot, the setting pivot, the generative-prose pivot, and the
> already-red-teamed REIGN + VOICES plan (G5) — and resolves the sequencing
> conflicts between them.

---

## 0. Why — the measured indictment

Three complaints, all verified against the current build (schema v39 + the plate UI):

**The sliders don't move the relations.** A 44-world sweep (4 seeds × 11 knob
configurations, measured through the app's own export) found: `iq` at 0 vs 100
produces byte-identical worlds in half the seeds (it weights a single dice roll);
`db` is saturated above its midpoint (100 ≈ default 60 everywhere; only 0 differs —
a binary wearing a 0–100 costume); `bias` moves ≤10% of income at the default `wg`;
and the income mix — the one genuine regime lever (extract → gini 0.81 entrenched;
trade → 0.17) — is sum-normalized and built from four collinear proxies for
centrality-to-seat, so ordinary nudges re-weight four ways of pointing wealth at the
same winners.

**The world tells the same story every time.** After stripping proper nouns and
numbers, chronicles of *different seeds* share 36–52% of their sentences verbatim;
the *same seed across knob extremes* shares 68–89%. The Founding act narrates the
same ~10 beats in the same order in every world; "What the Record Shows" is ~100%
fixed template; every world closes on the identical refrain. The qualitative story
space is 3 verdicts × 4 turnings × 5 age characters × a few binaries — a few hundred
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
a coherent piece of rhetoric — and zero-information as a generator. **A model that
cannot lose its argument is not evidence for it.** The pivot: mechanisms in,
conclusions out. The socioeconomic-inequality lens stays the way we *look*; the
verdict stops being pre-written.

---

## 1. The constitution (principles that govern every change below)

- **P1 — Falsifiability.** Every headline relation must be able to invert somewhere
  in seed × knob space, and the suite must *exhibit* the inversion (see §7). A
  finding true in 100% of worlds is either a definition (then label it as one) or a
  bug.
- **P2 — Double edges.** Every mechanism carries both its blades; interplay and time
  decide which cuts. No mechanism may have a hardcoded moral sign. Concentration can
  finance or hoard; a reform can save or rot; a revolt can free a boomtown or kill
  it. The code never knows which — the state does.
- **P3 — Neutral instruments.** Metrics measure *shape*: levels, spreads, floors,
  growth, churn, volatility, mobility. Prose describes; judgment belongs to the
  reader. Loaded composites (injustice) survive as clearly-labeled composites among
  neutral lenses, not as the default view of the world.
- **P4 — Consequence has length.** Effects land with delays and state-contingent
  signs. Nobody in the world — including the seat, including the player — knows the
  full extent of an action at the moment of acting. The engine must be able to
  reveal, epochs later, that the granary bred the dependency or that the sacrifice
  zone spared the watershed.
- **P5 — Generative, never gated boilerplate.** No user-visible sentence is a canned
  string selected by a condition. Verdicts, chronicles, findings, dilemma cards,
  voices, names of people/places/institutions — all composed: fragment grammars,
  typed slots filled from true world facts, markov coinage, selection conditioned on
  the actual columns. (§4; the G5 voices architecture generalizes to the whole
  narrative layer.)
- **P6 — The sacred (unchanged).** Determinism and hash replay; schema-versioned
  exports; the measured-then-pinned test discipline; geology/toponymy stability
  under fate and choices; the single-file, no-network promise; QGIS-readiness.

---

## 2. The setting pivot: out of the shire, into the arcane-industrial state

The medieval frame is not just flavor — it *entails* the naive economics. A
static-tech, zero-growth world is Malthusian: every gain is someone's loss, so every
concentration is extraction, so the moral monotone follows from the period
assumption. We leave the period.

**The register (FFXII, not Tolkien):** technology enabled by magic. Metropolises
with precincts and papers. Police states. International politics — embassies,
embargoes, spheres of influence. Industry: the aetherworks, the grid, freight
skyways, refined-lumen markets. And underneath it, the old layer stays: ruins,
buried gods, the maelstrom, sanctified ground, hidden things the modern state paves
over and occasionally wakes. The deep-magic layer is what the modern layer is built
on and afraid of — that tension is the setting.

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
What varies is how much artifice each region commands — a level, not an era.

---

## 3. The economic re-founding: breaking zero-sum, arming both edges

### 3.1 The growth channel (the one new state variable)

Each region gains an **artifice index** `A` (0–100): its command of magically-enabled
productivity — machinery, trained hands, licensed workings. Income becomes
`A-scaled`: the existing mix terms multiply against `(0.5 + A/200)` (calibrate), so
a high-artifice periphery can out-earn a low-artifice core. `A` grows by
**investment** (below), **diffuses** weakly to neighbors (works teach), **decays**
slowly without upkeep, and can **crash** (busts, calamities, war). Total wealth is
no longer conserved: the pie can grow, shrink, and grow unevenly — which is the
precondition for every interesting question the app claims to ask.

### 3.2 The double-edge inventory (the heart of the pivot)

For each mechanism: blade A, blade B, and the *contingency* that decides. The code
implements both blades and the contingency; it never implements a verdict.

| mechanism | blade A (as today) | blade B (new) | contingency that picks |
|---|---|---|---|
| concentration / banks | rents extracted; owners' row deepens | an **investment pool**: elite coin funds `A` growth locally and along credit reach, with a lag and a bust risk | live opportunities (seams, routes, low `A` with high potential) vs their absence; censorate confiscation risk deters investment |
| the grid chasing winners | the dark periphery pays the price | early efficiency compounds a **surplus that funds `gtEase`** — the bar falls faster the richer the core got (make the existing quiet mechanic explicit, measured, narrated) | early doctrine (chase vs spread) × realized surplus |
| tariffs/tolls | extraction at gates never chosen | **upkeep**: gate revenue maintains bridges/passes/lines; amnesty without a replacement fund lets them decay — friction rises for everyone | fiscal state of the holder; reform design |
| migration | flows to rich+wired+clean (size begets size) | a **frontier term**: high core rents + cheap periphery land + rising periphery `A` pulls people outward; peripheries can boom | rent differential × opportunity × policing of movement |
| spoil / blight (λ retired) | poverty-seeking dumping | **disposal doctrine** (3-way knob): concentrate (a sacrifice zone), disperse (everyone a little), treat (costs coin, needs `A`) — long-run harm depends on where people *later* migrate and what later gets built there (P4) | doctrine × future migration × treatment capacity |
| elite share | ratchets up structurally; falls only on catastrophe | **ordinary erosion**: competition erodes rents where market access is high; boom entry mints new owners (churn without collapse); police states freeze churn | market access; order level; credit openness |
| reforms | damp a term (only the granary moves coin down) | every measure gets its **long edge**: granary → dependency and fiscal drain in long peace; toll amnesty → upkeep crisis; grid charter → debt service; retention act → capital flight | time + the state it lands in (P4 delays) |
| revolts | liberation (won) or crushing | outcome *distribution*: freed towns sometimes boom (suppressed potential released), sometimes collapse (capital and order flee) | the town's fundamentals at the moment of rising |
| policing / order (new axis) | — | suppresses predation, smuggling, revolt risk **and** suppresses voices, mobility, entry, investment; high-order worlds are stable and can stagnate | order knob × everything it touches |
| foreign powers | the Dominion lands and extracts | **several powers**: demand for exports (booms), embargoes (busts), patronage of factions, and yes, annexation — a foreign wind that can blow fair or foul | openness knob × diplomacy events × fate |

### 3.3 The knobs, re-founded

The current panel promises regimes and delivers re-parameterizations. The pivot:

- **De-collinearize the mix.** Trade anchors to coasts and *foreign demand*, priced
  against seat-centrality — a trade-heavy world grows a **second pole** that rivals
  the capital instead of feeding it. Extraction anchors to seams; artifice to `A`;
  legacy stays the authored gradient. The weights stay sum-normalized (ratios are
  honest) but the four terms now pull in different directions.
- **Retire λ for disposal doctrine** (concentrate / disperse / treat) — three
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
- `injustice` survives, renamed in presentation to what it is — a labeled composite
  (`blight × poverty`) — one plate among 55+, not the boot lens. The boot lens
  becomes the neutral wealth or a new composite the owner picks.

### 3.5 The verdict space (de-moralized, widened)

The 3-way ΔGini banner becomes a **two-axis verdict — the gap × the floor — with a
growth qualifier**:

| | floor rose | floor fell |
|---|---|---|
| **gap closed** | shared rise | leveling down |
| **gap held** | quiet growth | quiet decay |
| **gap widened** | unequal growth | extraction |

…each qualified by realm growth (boom/stagnant/collapse) → ~12–18 reachable story
shapes, *all of which must appear in the calibration sweep* (§7). "The gap widened
while the poorest fifth grew richer than any founding generation" becomes a world
the engine can generate **and narrate** — today it can do neither.

### 3.6 International politics (v1 scope, owner to size)

Generalize the Dominion into 2–3 foreign powers with distinct postures (mercantile /
territorial / doctrinal), sourced from the fate-facing streams: export demand
cycles, embargoes, faction patronage, embassies (already a G5 dilemma), and
annexation as one posture's endgame rather than the only foreign event. Minimum
viable: keep ONE power but give it the posture wheel; full version: three named
powers with generative names/registers (§4).

---

## 4. The prose re-founding: the loom (everything generative)

**Principle P5 applied:** the app currently *selects* sentences; it must *compose*
them. The G5 voices architecture — fragment grammars with typed slots, column-
conditioned fragment classes, markov coinage in per-register lexica, per-substream
determinism — is not a feature of the voices panel; it is **the house prose engine
("the loom")**, built once, consumed by every text surface:

| surface | register | migrates from |
|---|---|---|
| the chronicle | the historian (state record voice) | `composeChronicle`'s fixed beats + 2-variant event prose |
| findings / standfirst | the analyst (numbers-forward) | `findingsHTML`'s canned sentences |
| the verdict | the judge (measured, both-edged) | the 3-way banner |
| dilemma cards (G5) | the ministerial brief | authored card text |
| voices — oral | the street | (new, per G5 spec) |
| voices — written | the ledger/censorate | (new, per G5 spec) |
| names | toponymic + NEW: corporate, precinct, paper, god-under-the-city, foreign-power registers | existing name registers, extended |

**Rules of the loom** (inherited from the voices spec, promoted to house law):
fragments are clause templates, never complete sentences; fragment classes are gated
on real columns; slots fill from true facts (names, numbers, events) and are audited
against the export; coined words come from world-level markov lexica (minted once
per world so they repeat like culture); every surface draws from its own
`sx("<surface>#…")` substream; register divergence where registers *should* disagree
is a derived, testable quantity.

**The chronicle specifically:** the fixed founding beats become conditional AND
composed — absence becomes remarkable instead of a filled slot ("no wall crosses
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

## 5. THE REIGN + THE VOICES (G5) — folded in

The G5 plan is adopted as drafted (it is already red-teamed and adversarially
reviewed), with four amendments that fit it to Parts 1–4. The full G5 text follows
in §5.1 as the working spec; amendments first:

- **(a) Dilemmas are double-edged by construction.** "Every trade-off honest" stops
  being authorial care and becomes mechanical fact: each dilemma option maps onto
  §3.2 mechanisms, so its long edge exists in the physics (P2/P4). Cards state the
  near edge; the far edge is discovered. The verdict panel measures both.
- **(b) The verdict panel uses §3.5's axes** (gap × floor × growth vs the
  auto-history), not a moral score. The judge register composes the judgment line.
- **(c) The voices engine IS the loom** (§4) — build once; voices is its first
  surface and its prototype gate is the loom's gate.
- **(d) Sequencing (the one real conflict, resolved):** G5's byte-compat pin is
  against "the current schema" at each point, not v39 forever. The fixture harness
  + fate seed land FIRST (model-neutral infrastructure). The **economic re-founding
  (§3) lands BEFORE the reign engine**, because the dilemma vocabulary should be
  authored against the two-edged economy — authoring it against v39 physics means
  re-authoring it after. Voices' prototype gate can run in parallel at any time
  (it reads exports, any schema).

### 5.1 The G5 working spec (folded, verbatim save for frame notes)

# THE REIGN + THE VOICES (G5) — interactive alternate histories, spoken from below

## Context

Hinterland's histories run on dice the viewer never touches. The owner wants the app
engaging for people who don't (yet) care about its socioeconomic argument: give them
agency — choices presented at epochs that persist for the rest of history, interact
with the existing parameters and each other, and make the charts move because *you*
moved them. Two halves, per the owner's decisions:

- **Step-through reign** (primary UX): history pauses each epoch on a dilemma card;
  your choice is applied; the year runs; the metrics shift. Choice vocabulary is both
  (a) player takeover of decisions the dice currently make and (b) new authored
  dilemmas — flavored strictly arcane-industrial (skyway charters, conduit rationing,
  aetherstone concessions, imperial embassies, freeport pardons, sanctuary
  recognition), **never generic medieval content**.
- **Fate seed**: a separate parameter re-keying only the dynamics RNG substreams —
  same rock, same choices, different luck — with a reroll die. This alone gives the
  "metrics fluctuate wildly" instant gratification.
- **The verdict**: at reign's end, the app judges you against the auto-history (same
  world, same fate, dice deciding) — the existing counterfactual machinery makes the
  comparison honest. This is where casual agency meets the app's actual point: *your
  choices had a distributional cost, and it is measured.* [Pivot note: measured on
  the §3.5 axes.]

And threaded through all of it, per the owner's follow-up: **voices from the people**
— generated micro-texts (the era's tweets: market-cries, petitions, censor digests,
songs) that a player can reference when deciding. The realm has a history but not
what the people are *experiencing, saying, recording* — and the oral and written
records must not quite agree, because they never do. As a generative exercise,
pre-written sentences are off the table: paragraphs must be composed — fragment
grammars, markov coinages, slots filled from the world's true names and numbers,
selection conditioned on the actual parameter state. (See VOICES section.)

Everything must ride the URL hash (share a reign, replay it byte-identically), export
in provenance/CSV, narrate in the chronicle, and pass the suite. Schema bump to v40
(v41 if voices ship as their own PR). [Pivot note: version numbers shift under the
§6 ladder; the *discipline* — one declared bump per behavior change — is what's
binding.]

## Architectural keys (verified in exploration)

- `applyAttributes(topology, params, geo)` is a pure function of (geology, knobs);
  the C1 counterfactual (`updateCf`, `CF_MODES`) already re-runs alternates and
  restores byte-identically. **A reign step = re-run stage 3 with `ep = frontier`
  and choices-so-far. No in-loop pause machinery needed.**
- Loop-mutable measure state: `dbShift/gtShift/tollScale/freeTownIdx/granaryOn`
  (+ per-region retention/eliteShare edits) — authored dilemmas map onto THESE, no
  new physics. [Pivot note: after §3 lands, the mutable-state surface grows
  (disposal doctrine, investment pool, order posture) — dilemmas map onto the
  richer set, same principle.]
- The reform/reaction dice: `rIns = sx("institutions")`, fires in the epoch loop;
  events recorded as `events.push({epoch, type, ...})`, exported + events.csv;
  chronicle PROSE/MEAS maps. [Line numbers omitted — they drift; grep the names.]
- RNG streams are tag-keyed and independent (`streams(seed)(tag)`): a second
  factory `fx = streams(params.fate || params.seed)` can source only the dynamics
  tags ("events", "institutions", "revolt", "dominion", "factions", "dynasty") —
  geology, founding wealth, and all naming stay on the world seed, so a fate reroll
  never renames or reshapes the map.
- Hash plumbing: `DEFAULTS`, `writeHash`, `readHash`, `recomputeAttributes`
  (stage-3-only). Suite: tools/test.mjs + tools/stress.mjs; provenance pin at the
  current schema version.

## Hard invariants (the plan's red lines)

1. **Back-compat**: with no choices and default fate, every world is byte-identical
   to the current-schema output (the dice fall exactly as before; player streams
   must not disturb existing draw order — new substreams only, and choice
   application must *replace* a dice outcome, not add draws to shared streams).
2. **Determinism**: `ch=` (choices) + `fate=` in the hash fully reproduce a reign.
3. **Geology/toponymy blind** to fate and choices (tested).
4. Measured acceptance before pinning; both suite passes green; schema pins.

## Design specifics (frozen)

**Core mechanism.** A reign step never pauses the loop: the controller re-runs pure
`applyAttributes(topology, {...params, ep: frontier}, geo)`, reads `model.decisions`
for the frontier epoch, shows a card, appends the answer to `params.ch`, re-runs —
the C1 counterfactual pattern applied to time.

**Fate seed.** `const fx = streams(params.fate || params.seed)` beside `sx`;
re-key exactly six tags: "events", "factions", "institutions", "revolt", "dominion",
"dynasty". Everything else (geology, founding, siting, naming) stays on `sx` — map
and toponymy byte-stable under fate reroll; empty fate reproduces current draws
exactly.

**Choices.** `params.ch` compact string; **epoch-qualified keys** (`w4:1`); parse to
`{key: option}`; unknown/stale entries ignored (unchosen = dice). `model.decisions`
records every decision point `{epoch, id, region_id?, options, chosen, by:
"player"|"dice"}`. **Golden byte-compat rule:** dice draws are consumed exactly as
today, THEN overridden iff a choice exists; authored dilemmas consume zero RNG and
option 0 is always the no-op status quo — an auto-run cannot diverge from the
fixture.

**Dice takeovers (3 in v1):** `w` wound response (pick mercy / the second measure /
the fist — offer the top-2 DISTINCT eligible measures, suppress the option
otherwise), `r` revolt response (grant the charter / send the wardline / buy peace —
averted outcome; occupied revolt sites offer wardline/buy-peace only), `d` Dominion
arrival (binary: open the quay / burn the approaches — repelled). `s` (succession)
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
edge comes from §3.2 mechanisms once the re-founding lands — see amendment (a).]

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

What history feels like from below — referenceable when making reign decisions.
Two registers that deliberately DO NOT agree:

- **The oral record** (what people say): market-cries, rumors, songs, curses —
  emotional, local, unreliable in the direction of lived grievance.
- **The written record** (what gets recorded): petitions, ledger marginalia, censor
  digests, assessors' notes — institutional, euphemistic, unreliable in the
  direction of power.

**Divergence is DERIVED, not decorative:** each voice carries a computed sentiment
(from the region's actual columns), and the oral−written sentiment gap per region is
driven by `legibility`/`uncounted`/`temple_reach`/`force_projection` — where the
census doesn't climb, the street and the ledger disagree most. Exported and testable:
divergence correlates with legibility across seeds (measured, then pinned).

**Generative architecture (no pre-written sentences):**
1. **Fragment grammar**: per-register pools of composable clause fragments
   (grievance / witness / rumor / defiance / petition / euphemism forms), each
   fragment a TEMPLATE with slots — never a complete canned sentence. Assembly walks
   a per-voice substream: 2-4 sentences per paragraph, clause order, connectives,
   diction all drawn.
2. **Column-conditioned content**: fragment CLASSES are gated by the region's real
   state — toll fragments require `tollBurden` high, poison fragments `blight`,
   owners'-row fragments `eliteShare`, occupation fragments `occupied`, hunger
   fragments granary/wealth, sky fragments `skyAdvantage`/stillair. Slots fill from
   TRUE world facts: town/river/pass/ruler/event names, real numbers ("the third
   levy this season"), epithets. A paragraph is wrong only in voice, never in fact —
   or deliberately wrong in the oral register (rumor distortion drawn from
   trust/legibility, flagged internally).
3. **Markov coinage**: the chain machinery (`markovWord`, register corpora) coins
   the invented nouns the fragments need — oaths, songs' burden-words, slang for
   the grid/aetherstone/the foreign powers — in the REGION'S name register (frontier
   voices swear differently than lowland ones; temple-adjacent voices cite liturgy).
   Coinage is a WORLD-LEVEL lexicon (3-5 terms per register, minted once, reused) so
   oaths repeat like culture; per-voice nonces read as noise, not dialect.
4. **Determinism**: every voice from `sx("voice#<region>#<epoch>#<kind>")`;
   byte-stable, rides exports. Fate reroll changes voices only via changed history.

**Surfacing:** (a) each dilemma card quotes 2-3 voices from the affected regions —
oral + written, disagreeing where the columns say they should — as the evidence you
decide on (cards quote epoch e−1, resolving card-time circularity); (b) a VOICES
panel per epoch in reign mode (and on the scrubber for non-reign worlds); (c) the
inspector's region card gains "what they say / what is written"; (d) export:
voices.csv (epoch, region_id, register, sentiment, text) + `hinterland.voices`
provenance; the chronicle may quote one voice per Year entry. Volume cap: ~3 oral +
2 written per epoch, chosen from the most newsworthy regions (largest state delta /
event sites), deterministically.

**The concrete grammar is specified** in the companion voices spec (fragment
taxonomy with honest collision math — ORAL 110 fragments/7 classes, WRITTEN 96/6,
~60 connectives each; heaviest class ~34 draws/world; typed slot system — verbatim
name slots, digits in WRITTEN only, markov coin slots in two tiers; column-predicate
gating on every fragment; sentiment formula + divergence law D = 0.45·legibility_gap
+ 0.15·(100−trust) with the censor's corridor on occupied ground, invariants V1-V5;
rumor distortion as a PURE function of columns — folk-fractions, no digits, names
never distorted, a facts[] audit table per voice; six worked example paragraphs as
the quality bar; and the prototype-gate script spec: voices-proto.mjs, 50 voices +
facts tables + V1-V5 PASS/FAIL + repetition histogram from a real export).
[Owner: copy the companion's marked block to scratchpad/voices-spec.md on approval —
the file lives with the drafting agent's output, not yet in this repo.]

Two hardest problems, named up front: euphemism-join flatness in the written
register (mitigated by strict syntactic typing of what each fragment attaches to;
the prototype gate exists mainly to catch this) and the house-style-of-lying
tension (deterministic distortion risks uniformity; folk-ladder snapping hides
some — judged at the gate).

**Voice tests:** determinism (same hash → identical voices); generative variety
(across 30 sampled voices, no two paragraphs identical; measured fragment-class
entropy above a pinned floor; skeleton-masked type-token/bigram entropy over ~200
voices + a human-reviewed fixed sample committed with the PR); parameter reflection
(high-toll regions' voices draw toll-class fragments, plagued regions mention their
named plague — assert class presence, not exact strings); divergence law (unit-test
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

- **Stage 0 — golden fixtures + fate seed.** FIRST the golden fixture harness
  (exports snapshotted into tools/fixtures/ for a seed×knob matrix,
  equality-modulo-allowlist check — the enforcement mechanism every later PR is
  judged by; pin scope: world state + events + chronicle text identical; provenance
  modulo an explicit allowlist). Then the `fx` factory, six re-keyed tags,
  hash/DEFAULTS, isolation tests, fate die button.
- **Gate (no PR): voices prototype** in the scratchpad against a real export;
  owner approves the text quality bar before any voices code lands in the app.
- **Stage/PR — reign engine, headless.** THE BYTE-PIN TEST IS WRITTEN FIRST. Echo-
  the-dice invariant per takeover (echoing the dice's own outcome must be
  byte-identical to the auto run — catches off-by-one draws in override paths).
  Then takeovers and dilemmas one at a time, each with its per-option effect test.
  Playable via hash alone; no UI risk yet.
- **Stage/PR — voices engine in-app.** Additive-only; own substreams provably
  cannot disturb dynamics draw order; UI limited to inspector rows until the reign
  UI lands.
- **Stage/PR — reign UI.** A pure consumer of the engine; composes hash strings and
  re-runs the pure stage-3 function; cannot corrupt an export by construction. DOM
  tests + Playwright walkthrough.

## G5 adversarial-review findings (each must land with its fix)

1. **`averted` revolt outcome ripples through 6 verified consumers** — `crushedIdx`
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
4. **Treasury floor**: dilemma costs can drive `treasuries.crown` negative — clamp
   at 0 with a load-bearing comment (or the war/seizure math misbehaves).
   Treasuries/tensions exported in provenance so dilemma effect tests are
   measurable.
5. **Voices volume cap** (see Surfacing above).
6. **Null-fork reigns**: a run where no decision ever triggers needs the verdict
   panel's "history offered no forks" line, not a degenerate diff table.
7. **Reign target-epoch expression**: `params.ep > 0 ? params.ep : 8`.
8. **Voice streams**: keyed `sx("voice#<region>#<epoch>#<kind>")` — never drawn
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

- **Phase A — instrumentation (model-neutral).**
  A1: golden fixture harness (G5 stage 0's first half) — the enforcement mechanism.
  A2: fate seed (G5 stage 0's second half). Schema bump.
  A3: neutral metrics ADDED (growth, floor, mobility, churn, volatility as lenses +
  findings entries; additive, old verdict untouched). The sweep harness from the
  diagnosis becomes `tools/sweep.mjs` — the knob-reach and sameness-ceiling
  measurements join the suite as tracked numbers.
- **Phase B — the economic re-founding (§3), one mechanism per PR.**
  Suggested order: B1 artifice index + income scaling; B2 investment pool (banks'
  second edge); B3 migration frontier term; B4 disposal doctrine (retire λ); B5
  ordinary elite erosion/churn; B6 tariff-upkeep coupling + decay; B7 reform long
  edges; B8 revolt outcome distribution; B9 order axis; B10 mix de-collinearization
  + knob retirements; B11 foreign powers v1. EVERY PR ships its falsifiability test
  (§7) and regenerates fixtures deliberately. The old thesis must remain
  *reachable* (extraction worlds still exist); it just stops being the only world.
- **Phase C — the setting re-skin.** Vocabulary, registers, tier names, export
  naming policy (aliases vs versioned renames — owner decision), README/field-guide
  rewrite. Cheap after B; painful before it.
- **Phase D — the loom (§4).** D1: engine core + world lexica (behind no surface).
  D2: voices as first surface (G5 voices PR, post-gate). D3: findings migration.
  D4: chronicle migration (the big one; sameness ceilings pinned here). D5: verdict
  composition. Each surface passes its prototype gate outside the app first.
- **Phase E — the reign (G5).** E1: headless engine + takeovers + dilemmas
  (authored against Phase-B physics). E2: reign UI + verdict panel (on §3.5 axes)
  + dilemma cards quoting voices. Playwright walkthrough closes it.
- **Continuous:** the atlas regenerates after B and after D — it is the public
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
   falls; a police state stagnates while an open rival booms. Each exhibit is a
   URL in the atlas — a world you can open.
2. **Knob reach.** Every shipped knob's extremes change at least one *relation*
   (sign or class), not just magnitudes, on the calibration sweep. (Today iq and
   db>50 would fail this — that's the point.)
3. **Verdict diversity.** Across the 80-world calibration sweep at default knobs
   with ep>0: no verdict class (§3.5) exceeds ~40%; at least 6 of the classes
   appear. Thresholds measured before pinning.
4. **Sameness ceilings.** Chronicle template overlap: cross-seed < 0.20,
   within-seed cross-knob < 0.45 (both measured on the loom, pinned at D4).
5. **Definition honesty.** Composite metrics (injustice) are labeled as composites
   in every surface that shows them; the suite greps the label.

## 8. Open questions for the owner

1. **Naming/back-compat depth**: rename export columns for the new setting (schema
   break, QGIS styles regenerate) or alias (old names kept as duplicates)?
2. **Foreign powers v1 scope**: one generalized power with postures, or three named
   powers? (§3.6)
3. **The boot lens** once injustice is de-defaulted: wealth? the new growth lens?
4. **Knob retirements**: fold `bias` and `hb` away as proposed, or keep the panel?
5. **The old thesis's place**: the extraction world remains generatable — should
   the docs keep an essay acknowledging the original argument as one region of the
   possibility space (I'd argue yes; it's honest about the project's history)?
6. **Voices companion spec**: paste the drafting agent's marked block into this
   repo (docs/voices-spec.md) so the reference in §5.1 resolves.

---

*Drafted from: the 44-world knob sweep + mechanism inventory (2026-07-16), the G5
REIGN+VOICES plan (owner's draft, red-teamed), and the owner's direction: possibility
space first, arcane-industrial setting, everything generative, the inequality lens as
the way we look — not the verdict we wrote.*
