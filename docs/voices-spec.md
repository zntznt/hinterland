# Voices from the People: generative spec, v2 (aligned to the Instrument Pivot)

> v2 of the drafting agent's companion spec (the file `direction.md` §5.1 references).
> The machinery of v1 survives intact: fragment/slot taxonomy, collision math, the
> facts[] audit, the folk-fraction ladder, invariants V1–V5, the prototype gate. What
> changed, per the owner's ruling that v1 was "still opinionated about the old
> medieval frame":
>
> 1. **De-medievalized**: diction skins, trades, folk units, and worked examples move
>    to the arcane-industrial register (direction.md §2); nothing speaks in sacks and
>    fair-days anymore.
> 2. **De-biased**: the sentiment model gains BOTH edges (trajectory terms; pride and
>    aspiration classes; written-record unreliability toward the institution's
>    INTEREST per topic, which is sometimes rosier and sometimes grimmer, not
>    uniformly euphemistic about harm).
> 3. **The elsewhere layer**: new fragment classes and an imperial coin tier carry
>    the deterritorialization pillar (direction.md §3.0/§3.4): voices increasingly
>    speak of the metropole, world prices, emigrated kin, and foreign wars.
> 4. Paths made repo-relative; line numbers replaced with grep-able symbol names
>    (line numbers drift; names don't).
>
> Sequencing note: the prototype gate (§6) can run NOW against current columns with
> the reduced sentiment formula; the final formula re-derives in Phase D2 against the
> post-Phase-B column set (artifice, exposure, attention, order), and this spec marks
> every such dependency inline as [POST-B].

Ground truth this spec builds on (verify by symbol in `index.html`):
- RNG: `streams(seed)(tag)` → mulberry32 substream; the export carries
  `hinterland.seed`, so every voice is recomputable from the export + index.html.
- Markov coiner: order-2 chains per name register via `buildChain` / `chainWalk` /
  `markovWord(register, r, minL, maxL)`; per-region register exported as
  `name_register`.
- True facts in the export: settlement `name`+`epithet`; `river_name`+kind;
  `pass_name`/`bridge_name`/`port_name` with `held_by`; `road_name`; named `events`;
  `rulers` per faction; `skyway.name`; `dominion.foothold`; year = 1000 + 25·epoch.
- Columns (region features): wealth, population, blight_load, injustice_idx,
  toll_burden, elite_share, class_gap, occupied, occupied_epoch, tribute_burden,
  legibility_gap, uncounted_population, social_trust, kinship_reliance,
  cultural_distance, tenure_regime, smuggling_intensity, black_market_index,
  market_access, sky_advantage, is_skyport, is_port, on_river, river_id,
  downstream_blight, safe_water, disease_burden_per_1k, abandonment_index,
  boom_bust, has_sanctuary, has_camp, on_conduit, dominant_bloc, refining_capacity,
  founding_age, … High `legibility_gap` = the census cannot see you;
  `uncounted = round(pop · legib/100 · 0.3)`.
  [POST-B additions this spec already gates on where marked: artifice `A`,
  exposure, attention, order.]

## 1. Fragment taxonomy

Two registers. A fragment is a CLAUSE with typed slots, never a full sentence
(lint: fragments carry no sentence-initial capital and no terminal punctuation;
frames own both). Classes and pool sizes:

ORAL: open (street-cry/address) 16 · grievance 20 · **aspiration/boast 16** ·
  witness (sensory/memory) 20 · rumor 14 · **elsewhere (letters, prices, the
  metropole) 14** · oath-frame 10 · song-burden 8 · closer (kicker/defiance/
  toast) 16 = **134 fragments**

WRITTEN: head (document frame) 12 · assess (observation) 20 · euphemism
  (harm-minimizing) 18 · **puffery (achievement-inflating: the prospectus, the
  throughput report, the commendation-to-the-ministry) 14** · **circular (citations
  of off-map authority: price notices, Concordat standards, imperial memoranda) 10**
  · plea (petition ask) 14 · marginalia (aside) 12 · closer (formula) 14
  = **114 fragments**

Plus 10 sentence FRAMES per register (structural: `[CORE]; [TAIL]`,
`[OPEN], [CORE]` …) and 8–12 connectives/diction skins per register per sentiment
band.

**Diction skins (arcane-industrial, replacing the shire set):**
- *works-town*: clipped, shift-counted, tool-metaphors ("since the third whistle",
  "the line eats what the line eats");
- *metropolitan/precinct*: bureaucratic cadence bleeding into speech, forms cited
  by number, queue idiom;
- *old-faith*: liturgical, the deep layer under the modern ministry (survives from
  v1's temple skin, now explicitly the OLD register persisting beneath);
- *frontier*: consonantal, distance-marked (survives from v1).
Skin selection: refining_capacity>0 or on_conduit → works-town; market_access≥60 or
is_port → metropolitan; has_sanctuary or pilgrim flux high → old-faith; else
frontier. [POST-B: attention ≥ threshold overlays metropolitan onto any skin.]

Slot type system (fill sources in parentheses):
- Name slots, always verbatim from the export: {town} {town:other} {river} {gate}
  {road} {shrine} {camp} {sea} {skyway} {ruler} {event} {epithet}. Self-referential
  event names shorten ("the Landing at X" spoken in X → "the Landing").
- Numeric slots: {num:toll|uncounted|pop|burden|blight|smuggling|year|price}.
  WRITTEN renders exact export digits; ORAL renders folk-forms via distort()
  (section 2) and NEVER prints a digit.
- Coin slots: {coin:oath} {coin:slang} {coin:burden}, walked by the EXISTING
  `markovWord` on the region's `name_register` chain (oath/slang 3–6 letters,
  burden 3–5 repeated). **Three tiers** (was two):
  - *world-coins* (oaths, scrip slang; minted once per world per register from
    substream `voicecoin#<register>#<i>`, shared across voices: oaths are culture);
  - *voice-coins* (burdens, insults; from the voice's own substream);
  - **imperial-coins** (loanwords of the Concordat tongue: trade terms, form names,
    ranks; minted once per world from the EMPIRE's name register and blended into
    voices at a rate driven by the attention proxy, market_access/sky in the
    prototype, the attention column [POST-B]. Cultural penetration, audible.
    Dependency: the imperial name register lands with direction.md §3.6; the
    prototype fakes it with one fixed imperial stem corpus.)
  Separate used-set from toponyms; also reject corpus words.
- Diction slots: {holder} (gate `held_by` → "the syndicate's factor" / "the
  Ministry's assessor" / "the Dominion"), {kin} (closed list), {trade} (derived:
  is_port → fish and freight; refining_capacity>0 → the works (lumen); endowment≥50
  → ore; on_conduit → grid-work; else → hauling and mill-work).

Gating: every fragment carries `req` (column predicate) + `band` (sentiment band,
section 3). Representative:
toll-grievance: toll_burden≥25 & a held gate exists · occupation: occupied=1 ·
blight-witness: blight_load≥40 · river-order: on_river=1 & downstream_blight≥1 ·
plague: blight_plague event on region · smuggler-rumor: smuggling_intensity≥40 |
black_market_index≥45 · sky-envy: sky_advantage≥10 | is_skyport=1 ·
census-euphemism: legibility_gap≥45 · refuge: has_sanctuary=1 · hollow:
abandonment_index≥40 | boom_bust="collapse" · **boom-boast: boom_bust="boom" |
(wealth≥60 & S≥+15) · works-pride: refining_capacity≥60 · elsewhere-letter:
is_port=1 | is_skyport=1 | market_access≥55 [POST-B: attention≥40] ·
price-talk: {trade} has a world price [POST-B: exposure≥35] · recruiter:
boom_bust="boom" elsewhere-adjacent regions**. A fragment whose req fails simply
does not exist for that voice.

Combinatorics (honest, at ~50 voices/world): 25 oral + 25 written voices, avg 3
sentences → ~75 sentences per register per world. Heaviest class (oral grievance,
now 20) appears in ~35% of oral sentences (the aspiration and elsewhere classes
absorb the rest) → n≈26 draws. Expected same-FRAGMENT pairs = C(26,2)/20 ≈ 16,
still too many if surfaces were fixed, but surface = fragment × slot fill × diction
skin: with ≥2 slots averaging ≥6 realizations and 4 skins, ≥12 distinct surfaces
per fragment, so expected identical-SURFACE pairs ≈ 325/(20·12) ≈ 1–2 per class per
world. Enforcement on top of the math: per-world used-set of realized surfaces, one
forced re-draw on collision; a fragment id may not repeat within one region's
oral+written pair. Lighter classes (n≤15 draws) are safe at 10–16 fragments.
Total authoring load: ~248 fragments + 20 frames + ~60 connectives. This is the
minimum honest size; halving it produces visible repetition by voice ~30.

## 2. Assembly algorithm

One substream per voice (hard rule): `rv = streams(seed)("voice#" + region_id +
"#" + register + "#" + k)`. Every draw comes from `rv` only: frames, fragments, skins, coins
(`markovWord(name_register, rv, …)`).

1. Voice allocation: each region gets one oral+written PAIR; regions ranked by
   extremity `X = |S_oral| + 10·occupied + 8·[epithet ≠ null]`. NOTE |S_oral| is
   absolute: the proudest boom town ranks beside the angriest gate town; extremity
   is not grievance. If regions·2 < 50, top regions get a second pair (k=1) forced
   onto different topics. Deterministic, no draws.
2. Sentence count: `n = 2 + [|S_oral| ≥ 35] + [rv() < 0.35]`, clamped to [2,4].
3. Topic ranking (deterministic): for each gated topic, salience = its gating
   column value (0–100 scale) + 15 if a NAMED fact anchors it (event, gate,
   plague, works) + 10 for elsewhere topics when the attention proxy is high. The
   voice speaks its top-n topics, one sentence each; oral and written pairs share
   topics. The divergence is in treatment, which is the point.
4. Per sentence: draw a frame legal for (register, band, topic); fill its 2+
   fragment slots from the topic's class pair (oral toll → grievance+witness or
   grievance+oath; oral boom → boast+witness or boast+elsewhere; written toll →
   assess+euphemism; written boom → assess+puffery); fill slots; apply the diction
   skin.
5. **Folk attribution (ORAL only, both edges)**, a PURE function of exported
   columns, no rv, exactly testable:
   - *Distortion* active iff `social_trust < 40 || legibility_gap ≥ 55`. Multiplier
     `m = 1 + (100 − social_trust + legibility_gap)/200`. Index columns (0–100)
     render as folkFrac(round(x·m)) over the fixed ladder {5 a twentieth, 10 a
     tithe, 25 a quarter part, 33 a third part, 50 half, 67 two parts in three,
     75 three parts in four, 90 nine parts in ten, 97+ all but the sweepings}.
     Counts (per-1k burdens) render "one soul in N", N = 1000/(x·m) snapped to
     {2,3,4,5,6,8,10,12,16,20,40,100}. Ordinal columns (tribute_burden 0–3) use a
     fixed map (3 → "one crate in three"), exempt from m. Years: if
     legibility_gap ≥ 55 AND event age ≥ 2 epochs, the year is OMITTED for an
     era-phrase ("two lifetimes gone"). Oral drifts by omission, never by stating
     a false year. Names are NEVER distorted.
   - *Blame-shift*: oral grievance blames the nearest VISIBLE named institution
     (precedence: gate holder > garrison/constabulary > skyway > crown ruler)
     regardless of true driver.
   - **Credit-shift (the mirror, new)**: oral boast credits the nearest LOCAL
     agent (the works-master, the town's saint, the governor) even when the true
     driver is the world price or the grid's arrival [POST-B: the world series].
     Folk attribution errs toward the visible and the local in BOTH directions.
   - Both `blamed`/`credited` and `driver` go into the voice's facts[].
   How this avoids lying about verifiable facts: oral voices contain no digits at
   all, so no oral quantity can be mistaken for a ledger value, and every
   folk-form is emitted alongside its source. Each voice carries
   `facts: [{path, true, told, rule}]`, and told must equal rule(true, columns).

## 3. Sentiment and the divergence law (both edges)

All from exported columns, integer arithmetic, JS Math.round:

  T = trajectory term from boom_bust: {boom:+18, stable:0, decline:−14, collapse:−30}
  G = 0.30·blight_load + 0.35·toll_burden + 0.20·injustice_idx + 18·occupied
      + 3·tribute_burden + max(0, −T)
  C = 0.30·min(100, wealth·100/W_REF) + 0.25·social_trust + 0.15·market_access
      + 0.10·sky_advantage + max(0, T)          [W_REF = 60; see below]
  S_oral = clamp(round(C − G), −100, +100)

**W_REF, the reference ceiling (#136 gate, resolved).** `wealth` is clamped 0–100 in
the engine, so §3's original `0.30·wealth` was not wrong on its face — but its
*realized* spread is far narrower and depends on the income mix: at default weights
p50 14 / max 55, under extraction max 28, in a trade-heavy world max 74. Stated
against 100 the term carried a mean 4.5 of its nominal 30 and `proud` was starved.
It is now stated against **W_REF = 60**, which sits above the default-weights ceiling
(so an ordinary world never clamps) and below the trade-heavy one (so the richest
trade towns saturate the top of the scale, which is the correct reading of "as rich
as this scale goes").

It is **absolute, not a percentile**, and that is the whole of the decision. Under a
percentile, `proud` is a RANK — the top of *this* world, however poor the world — so
a uniformly destitute realm would manufacture pride out of its own misery. Under an
absolute ceiling `proud` is a LEVEL: a town that actually holds something. An
instrument whose subject is inequality does not get to grade on a curve.

Sentiment reacts to WHERE A REGION IS GOING, not only where it sits: a rising poor
town can be hopeful, a sliding rich one furious. [POST-B: T re-derives from the
wealth/A snapshot series; a price-collapse epoch (world series) enters G through
exposure.]

Bands: fury ≤ −45 < aggrieved ≤ −10 < weary ≤ +15 < steady ≤ +40 < proud.

**The divergence law: magnitude from illegibility + distrust, SIGN from the
institution's interest (this is the v2 fix: the written record is unreliable
toward power's INTEREST, which is not always rosier):**

  D = round(0.45·legibility_gap + 0.15·(100 − social_trust))

  Per-topic sign of the written skew:
  - harm topics (blight, burden, hunger, abandonment): written skews +D
    (minimized, the euphemism classes);
  - achievement topics (throughput, the works, growth): written skews +D
    (inflated, the puffery classes; same sign, opposite lie);
  - disorder topics (smuggling, sedition, revolt-pressure): sign depends on who
    writes: the censorate of an occupied or high-order region DEFLATES disorder
    (−D toward calm: "commerce awaiting classification"); a contested region's
    constabulary INFLATES it (+D toward threat: the budget request)
    [order axis POST-B; occupied is the v1 proxy];
  - elsewhere topics (the world outside: prices, the metropole's standard, outward
    migration, capital that came or left) — **the sign splits by direction, as
    disorder's does, because the interest does** (#136 §7.6, resolved):
      * an OUTWARD flow the region lost (emigration, capital flight, a charter
        taken, demand withdrawn) is a harm, and is minimized — **+D**, reported as
        "the ordinary circulation of an expanding trade";
      * an INWARD or structural relation the office merely transmits (the exchange's
        grade, the metropole's standard form, a price set elsewhere) is a disclaimer
        of discretion — the `circular` class exists for exactly this — and deflates
        toward "not a matter for this office": **−D**.
    One row cannot carry both: an office has an interest in looking blameless for
    what it lost AND powerless over what was decided above it, and those are
    opposite lies about the same subject;
  - S_written = clamp(S_oral + signed skew of the voice's LEAD topic, −100, +100).

  The censor's corridor generalizes: if occupied=1 [POST-B: or order ≥ 70],
  S_written = clamp(S_written, −10, +25). A controlled ledger is never furious
  and never glad.

Testable invariants for any exported world (the prototype asserts all):
  V1 every digit-sequence in a written voice equals an export value listed in its
     facts[];
  V2 oral voices contain no digits; every folk-quantity inverts through the
     section-2 rules;
  V3 every proper name in either register appears verbatim in the export;
  V4 S_written − S_oral equals the signed skew law exactly (with the corridor);
  V5 no Cyrillic (/[Ѐ-ӿ]/), no banned real-world lexicon (curated list: earth
     places, currencies, faiths, videogame terms), no fragment surface repeated
     > 3 times per world;
  **V6 (the balance tripwire; restated after the #136 gate ran it).** Three things
     were wrong with the original wording and each is fixed here.

     *The reading is STRICT.* `weary` spans −10..+15 and straddles zero, and it is
     55–65% of all towns. A loose reading that counted it on both sides would make
     V6 pass by construction — an invariant that cannot fail, which is worse than
     no invariant. `weary` counts toward NEITHER side.

     *The sample is stated in REGIONS, not seeds.* At any of the measured band
     rates a 3-seed sample is a coin flip rather than a tripwire: at a 1.3% `proud`
     rate, ~60 regions has a ~55% chance of containing one at all. **V6 is asserted
     over ≥ 200 settled regions.**

     *It is a check on the MODEL'S RANGE, not on any one world's street.* This is
     the thing the gate found and the original wording got wrong. Measured across
     income mixes at every reference ceiling tried, an **extraction world contains
     no `proud` town at all — 0.0%**. That is not a starved formula, it is the
     model telling the truth: a realm that lives by pulling ore out of the ground
     and shipping it away does not produce pride, and its street IS a monotone. A
     per-sample V6 would fire on a world that is correctly monotone and demand the
     model be falsified into balance. So:

     **V6: over ≥ 200 settled regions at DEFAULT income weights, at least two of
     the five bands strictly below zero and at least two strictly above are
     represented among oral voices, and ≥20% of oral sentences draw from
     non-grievance classes.** The default mix is named because it is the one the
     instrument ships and the one every other calibration (§7.3, the atlas sweep)
     is stated against. Under an extraction mix the check is expected to fail on
     the positive side, and that expectation is itself asserted — a model in which
     extraction produced pride would be the defect.

## 4. Worked examples (hand-simulated; the quality bar)

Coins reuse the v1 walks the author read and approved: oaths "Farrow", "Velisse"; slang "osten",
"norby"; burden "gruk". Illustrative world: towns Ostenford, Haldenmouth "the
Ashen", Pellow Haven "the Yoked", Vellenmark; river the Melverow, the Ulverwell;
skyway the Larkmere Lane; events the Water-Rot of 1150, the Landing at Pellow
Haven (1200). **The example SET must span the space: two aggrieved, one occupied,
one proud. A spec whose examples are all misery would fail its own V6.**

(a) Gate town, Ostenford: toll 62, wealth 31, trust 34, legib 48, blight 22,
    market 38, pop 8,400, uncounted 1,210. S_oral −13 (aggrieved); D=32, harm
    lead → S_written +19 (steady); m=1.57, toll told: 62·1.57=97 → "all but the
    sweepings".
ORAL: "You pay going over and you pay coming back, and Ostenford Bridge keeps all
but the sweepings. The syndicate's factor sits his tally-booth on the far bank and
counts, and the counting has never once come out for us. By the Farrow, the Ore
Road ran free in my mother's day. Now they say even the Melverow pays, where it
goes under the arch."
WRITTEN: "The crossing at Ostenford Bridge returns its schedule punctually, and
the receipts are found in good order. Toll burden is entered at 62; the office
reads the figure as commensurate with the traffic borne. Of the district's 8,400
souls, some 1,210 decline enumeration; assessment proceeds upon the counted."

(b) Blighted river-mouth, Haldenmouth the Ashen: blight 84, wealth 18, trust 22,
    legib 71, burden 61/1k, uncounted 660, plague age 4 epochs. S_oral −34; D=44 →
    S_written +10; burden told → "one soul in ten" (true: one in 16); year omitted
    for an era-phrase.
ORAL: "Every works above us lets fall what it likes into the Ulverwell, and
Haldenmouth drinks it last. One soul in ten has the cough since the Water-Rot
came. Velisse keep us, we bury more than we name. The Ashen, they call us from
the freight platforms, and no hauler idles here past noon."
WRITTEN: "Haldenmouth, at the mouth of the Ulverwell: blight load 84, disease
burden 61 in the thousand, entered without remark. The Water-Rot of 1150 is
carried as abated; what mortality continues is booked under ordinary wastage. 660
persons stand outside the count, and therefore outside the levy; the office notes
the saving."

(c) Occupied port, Pellow Haven the Yoked: occupied 1, tribute 3, smuggling 66,
    trust 18. S_oral −35; disorder lead under a censorate → deflating skew, then
    the corridor holds S_written at −5.
ORAL: "Since the Landing they weigh the catch on Dominion scales, and the scales
find one crate in three to be the sea's rent. The Larkmere barges still lift over
the boom, for them that pay in ostens; the rest of us row under the garrison's
eye. Farrow take their scales. The fish never swore to any Dominion."
WRITTEN: "Pellow Haven reports an orderly quarter; the harbor boom is entered as
an aid to navigation. Tribute is collected at the highest schedule without
incident, incident being a term the office defines. Smuggling intensity stands at
66 in the register; the digest recommends the figure be read as commerce awaiting
classification."

(d) **Boom works-town, Vellenmark (the other edge, new in v2): refining 78,
    wealth 71, boom, trust 51, legib 26, market 64. T=+18 → S_oral +34 (steady,
    nearly proud); D=19, achievement lead → puffery, S_written +53.**
ORAL: "Three new lines at the works since spring, and the third whistle never
blows an empty shift. My brother signed the recruiter's book for the capital, and
his letter says they burn Vellenmark lumen in streets that have never seen the
Melverow. The pay comes in ostens now (norby coin, my father calls it), but it
comes, by the Farrow, it comes."
   trace: [boast:works+witness:shift][elsewhere:letter.{town}{trade}+witness:memory]
          [boast:pay+{coin:slang}+oath:{coin}+closer:toast]
WRITTEN: "Vellenmark returns record throughput for the third consecutive
quarter; the district commends the figure to the Ministry's attention. Refining
capacity is entered at 78 and rising; the office anticipates the schedule of the
next assessment with confidence. Outward registration of labor is noted at the
margin and read as the ordinary circulation of an expanding trade."
   trace: [head:prospectus.{town}][puffery:record+{num:refining}][assess:emigration
          +euph:ordinary-circulation]
   Note the both-edged lie in one paragraph: the achievement inflated, the brain
   drain euphemized. That is the written register's interest, working.

These eight paragraphs are the quality bar: named facts verbatim, numbers only
where the register permits, euphemism and puffery that are structural (omission,
reclassification, commendation) rather than jokey, oaths that repeat like culture,
and a street that can be proud as well as furious.

## 5. Corpus additions for the coiner

Coins always walk the EXISTING chain machinery; quality upgrade = blend small stem
corpora into the region's register chain
(`buildChain(NAME_CORPUS[reg].concat(STEMS[class][reg]))`), keeping register
phonology dominant. Sized: oath-stems 16 per register (hard finals for frontier,
open finals for old-faith); song-burdens 12 per register (vowel-heavy, repeatable);
slang-roots 16 per register (concrete-noun texture, works-town roots favor tool and
freight consonance); **imperial stems 20 (one corpus, the Concordat tongue: form
names, ranks, trade grades; deliberately unlike every regional phonology so a
loanword is audible as foreign)**. Total ~152 new invented words. Phase 1
(prototype) uses the unblended existing chains + the one imperial corpus.

## 6. The prototype gate (before ANY schema/UI work)

Standalone script `voices-proto.mjs` in the scratchpad; zero app changes. Run from
the repo root (tools/node_modules supplies jsdom + d3-delaunay):

  NODE_PATH=tools/node_modules node voices-proto.mjs \
    --html index.html --seed atlas-3 --ep 10 > voices-sample.md

Steps: (1) jsdom-load index.html and capture the real GeoJSON via the `#download`
click, copying the proven `gen()` pattern from tools/test.mjs; (2) extract
`NAME_CORPUS` and the hashStr/mulberry32/streams/buildChain/chainWalk/markovWord
sources from the HTML by anchored regex (fail loudly if not found: single source
of truth, no drift); (3) implement sections 1–3 with prototype-scale pools (10–12
fragments per major class, flagged as half-size, INCLUDING the aspiration,
elsewhere, and puffery classes; a prototype without the new classes cannot pass
V6); (4) emit 50 voices as markdown: per region pair, a header quoting the gating
columns, S_oral/S_written/D + signed skew, both paragraphs, and the facts[] table
(path | true | told | rule); (5) print a PASS/FAIL block for invariants V1–V6 plus
a surface-repetition histogram and a sentiment-band histogram.

Gate to proceed: owner eyeballs all 50 and reads 6 random pairs aloud (at least
one of them a positive-band pair); V1–V6 all pass on 3 seeds; no surface repeats
> 3; only then design export schema (`voices` block) and UI, per direction.md
Phase D2.

---

## 7. The gate run (#136): what passed, what did not, and what building it found

Built at `tools/proto/` (`voices-proto.mjs` + `voices-pools.mjs` + `voices-extract.mjs`);
sample at [voices-sample.md](voices-sample.md). Zero app changes: `index.html`, `src/`
and the acceptance suite are untouched, and nothing in `tools/proto/` is imported by
anything that runs in CI.

    cd tools/proto
    NODE_PATH=../node_modules node voices-proto.mjs --seeds atlas-1,atlas-2,atlas-3 --ep 10

Pools were authored at the spec's **full** declared scale — 135 oral + 116 written = 251
fragments, 20 frames, 4 diction skins, 20 imperial stems — not the half scale §6 permits.
The reason is §5's own warning, and it is the first finding below.

### 7.1 Invariants, 3 seeds, 50 voices each

| | atlas-1 | atlas-2 | atlas-3 |
|---|---|---|---|
| V1 every digit in a written voice is an export value in `facts[]` | PASS | PASS | PASS |
| V2 oral voices contain no digits | PASS | PASS | PASS |
| V3 every proper name traces to the export | PASS | PASS | PASS |
| V4 `S_written − S_oral` is the signed skew law, corridor included | PASS | PASS | PASS |
| V5 no Cyrillic / banned lexicon, **no surface > 3** | PASS (max 3) | PASS (max 3) | PASS (max 3) |

950 distinct realized surfaces over 1022 draws. **V6 splits on its own wording** and the
two readings disagree, so both are reported rather than one being quietly chosen:

- **strict** — `weary` (−10..+15) counts as neither side, so the negative side is
  {fury, aggrieved} and the positive {steady, proud}: **FAIL** (neg 2/2, pos 1/2 —
  `proud` is empty across all three seeds).
- **loose** — `weary` spans zero and counts on both: **PASS** (neg 3/2, pos 2/2).

Non-grievance oral sentences 81%, well clear of the 20% floor either way.

**The gate does not open under the strict reading, and the strict reading is the one that
does any work** — under the loose one, a single `steady` town in three worlds satisfies a
tripwire whose stated purpose is "the street is not a monotone". §7.4 is why.

### 7.2 The spec's ground-truth column list has drifted from the export

Three of the columns §0 lists by name do not exist under those names, and a fourth exists
but is far thinner than the slot table assumes. The prototype maps them in `ctxOf`; the
spec should be corrected at the source.

| spec says | export has | note |
|---|---|---|
| `toll_burden` | `tariff_burden` | same quantity |
| `refining_capacity` | `aetherworks_capacity` | same quantity |
| `on_conduit` | `on_grid` | same quantity |
| `road_name` | present, but on only **15 of 176** road features across five seeds | `{road}` is thin, not dead — see below |

`{road}` is worth a note of its own, because the first pass of this prototype cut every
road fragment on a false reading: it sampled one seed's first four road features, saw
`road_name: null`, and concluded the slot was dead. It is not. Named roads are rare (8.5%
of road features) but they carry `from_region` / `to_region`, so `{road}` resolves per
region exactly like `{gate}` does, and the names arrive with their article ("the Ore
Road"). The slot is restored, and it earns its keep twice: it varies by region, and it is
a name that is **not the town's own**, which §7.3 shows is the scarce resource.

Two more are live but behave unlike the spec assumes:

- **`grid_access` saturates.** It is 100 for every connected town, so under §2 step 3's
  "salience = its gating column value", the `grid` topic out-ranked everything and led
  almost every voice — including a `fury` gate town whose oral paragraph therefore opened
  on a boast about a new lamp. The prototype ranks `grid` by `arcane_service_index`
  (median 43, max 68 over five seeds), which is the graded measure of what the
  connection delivers.
- **The skin picker collapses.** §1 selects works-town on `refining_capacity>0 || on_conduit`,
  ahead of everything else. `on_grid` is true for **55 of 57** settled regions across the three sample
  seeds, so works-town absorbs 96% of towns and the other three skins barely appear —
  metropolitan reaches 4 ports, old-faith 1 sanctuary. The picker needs a
  discriminating first test, not a near-universal one.

### 7.3 The collision math assumed slots the fragments did not have

§1's combinatorics are explicit — "surface = fragment × slot fill × diction skin: with ≥2
slots averaging ≥6 realizations and 4 skins, ≥12 distinct surfaces per fragment". A
**slotless** fragment has exactly one surface per skin, so it collides with itself on every
draw and no amount of pool growth helps. Measured, in order:

| build | worst surface repeat over the seeds run (V5 ceiling: 3) |
|---|---|
| half scale, mostly slotless (what §6 permits) | **14** |
| full scale, mostly slotless | **8** |
| full scale, every fragment carrying a region-varying slot | **3** |

So §5's "halving it produces visible repetition by voice ~30" is right but understates the
cause: the pool size was never the binding constraint. What binds is slot density, and the
spec states the requirement in its arithmetic without stating it as a rule. It should be a
rule: **no fragment without a region-varying slot.**

That fix has a cost the spec has no rule for either. Forcing a name into every fragment
makes the oral register chant its own town's name — **mean 5.9 mentions per oral paragraph,
max 8; written mean 7.0, max 11.** Real speech pronominalizes. The spec needs an anaphora
rule (a second, name-free realization per fragment, used after the first two mentions), and
V5 must then be counted on the *displayed* text so the rule cannot be used to manufacture
surface variety the reader never sees.

### 7.4 V6 fired on a real defect: the credit side of the sentiment formula is starved

`proud` is empty in the 3-seed sample not by chance. Across **20 seeds, 386 settled
regions**, under §3's formula verbatim:

| band | share |
|---|---|
| fury | 1.8% |
| aggrieved | 17.1% |
| weary | **65.0%** |
| steady | 14.8% |
| proud | **1.3%** |

mean C 29.5, mean G 27.7. The G side is well scaled — `blight_load` (median 26) and
`tariff_burden` (median 21) land where §3 expects. The C side is not, and one term is why:

| credit term | weight | mean contribution | share of C |
|---|---|---|---|
| `wealth` | 0.30 | **4.5** | 15% |
| `social_trust` | 0.25 | 15.1 | 51% |
| `market_access` | 0.15 | 6.3 | 21% |
| `sky_advantage` | 0.10 | 2.2 | 8% |

`wealth` is clamped 0–100 in the engine, so §3 treating it as a 0–100 index is not wrong on
its face — but its **realized** distribution is p50 13, p90 29, p99 51, **max 55**. Half of
C's nominal headroom sits in a term that in practice contributes 4.5 points, and
`social_trust` (median 64) supplies most of what pride there is.

The tell is in §4, the worked examples that are called "the quality bar":

- example (a) assumes `wealth` 31 — the **91st percentile** of the measured distribution;
- example (d), Vellenmark, assumes `wealth` 71 — **above the observed maximum of 55**, in
  386 regions.

Example (d) exists specifically so that the spec's own example set can pass V6 ("A spec
whose examples are all misery would fail its own V6"). It is built on a column value the
engine does not produce. The tripwire caught the spec, which is what a tripwire is for.

**Measured but deliberately NOT applied**, since the sentiment model is the owner's call and
§0 already schedules its re-derivation for Phase D2: entering `wealth` as its within-sample
percentile, changing nothing else, moves the same 386 regions to fury 1.0% / aggrieved
10.9% / weary 40.4% / **steady 42.5% / proud 5.2%** — V6 passes strictly, and the street
gains the upper edge §3 says it should have. Reproduce with
`node voices-proto.mjs --diag`, which prints both distributions side by side.

Note also that at a 1.3% `proud` rate, a 3-seed sample of ~60 regions has roughly a
**55% chance** of containing one at all. Even with the formula unchanged, V6 as specified is
a coin flip rather than a tripwire; its sample size should be stated in seeds *or* regions,
whichever gives the band the resolution the check needs.

### 7.5 V3 contradicts §1 and §2 as literally written

V3 says "every proper name in either register appears **verbatim** in the export", but §1
requires self-referential event names to shorten ("the Landing at X" spoken in X → "the
Landing") and §2 requires the year to be omitted for an era-phrase when
`legibility_gap ≥ 55` and the event is ≥ 2 epochs old. Under the literal V3 both rules are
violations. The prototype checks the **surface** against the set of shortenings recomputed
from the export by those two rules — anything else and V3 either forbids the spec's own
behaviour or, if it only inspects the slot's source value, tests nothing about what the
voice actually said. V3's wording should carry the exception.

### 7.6 v2 added the elsewhere layer to §1 and §2 but not to §3

§3's per-topic sign table covers harm, achievement and disorder. `elsewhere` — the class
v2 introduced to carry the deterritorialization pillar — is in none of them, so a voice
whose lead topic is `elsewhere` gets **skew 0**: `S_written = S_oral`, no divergence at
all, in the one register whose entire purpose is to diverge. Measured across the 3-seed
sample, `elsewhere` is the third most common lead topic (9 of 75 written voices) and
**12% of written voices carry no skew**:

| the lead topic's interest | voices | share |
|---|---|---|
| harm minimised (+D) | 45 | 60% |
| achievement inflated (+D) | 19 | 25% |
| **no interest engaged (0)** | **9** | **12%** |
| constabulary inflates disorder (+D) | 2 | 3% |

The prototype leaves the hole visible rather than guessing a sign for it. The interest is
arguable in both directions and the spec should say which: an office citing `{exchange}`'s
grade or `{metropole}`’s standard form has an interest in appearing to hold **no discretion**
(the `circular` class exists for exactly that), which argues for a deflating skew toward
"not a matter for this office"; but a district reporting outward migration as "the ordinary
circulation of an expanding trade" is inflating, same as any achievement. Whichever it is,
`elsewhere` needs a row in §3's table before D2, or the deterritorialization pillar arrives
in the fragments and never reaches the lie.

### 7.7 The second run (#136 reopened): what the first diagnosis got wrong

The three decisions §7.7 leaves to the owner were taken, and taking them turned up
two errors in §7.4's own diagnosis. Both were the same mistake: **measuring one
income mix and reporting it as the model.**

**`wealth` does not top out at 55.** That was the max across 20 atlas seeds at
*default* weights. Swept across income mixes it reaches **74 in a trade-heavy
world** (and only 28 under extraction). So §7.4's charge against §4's worked example
(d) — that it assumes `wealth` 71, "above the observed maximum of 55, in 386
regions", "built on a column value the engine does not produce" — **is wrong, and
is withdrawn here.** The engine produces 71 comfortably; it does so when the world
runs on trade, which the default-weights sweep never sampled. The example was
sound and the diagnosis was parochial.

**An extraction world has no `proud` town at any reference ceiling.** Measured at
W_REF ∈ {100, 74, 60, 55}, the extraction mix returns 0.0% `proud` every time,
while trade-heavy returns 3.7–6.7%. This is the finding that reshaped V6 (§3): the
original wording asserted balance in every sample, which would have fired on a
world whose monotone street is the correct answer. A tripwire that demands the
model be falsified into balance is not a tripwire.

| income mix | wealth max | `proud` at W_REF 100 | at 60 |
|---|---|---|---|
| defaults | 55 | 0.6% | 1.2% |
| trade-heavy | 74 | 3.7% | 6.1% |
| extraction | 28 | **0.0%** | **0.0%** |
| sealed | 43 | 1.8% | 3.7% |

Reproduce with `node voices-proto.mjs --diag`, which now prints the sweep. The
sweep runs inside the prototype and not in a scratch script for a reason worth
recording: the prototype's context builder maps the spec's column names onto the
export's real ones (`toll_burden` is `tariff_burden`, `refining_capacity` is
`aetherworks_capacity`), and a hand-rolled formula that guesses them reads zeroes
and reports a world happier than it is. The first attempt at this sweep did
exactly that and disagreed with the prototype by 2×.

**The rarest band's rate depends on the SEED FAMILY, and that nearly decided the
verdict.** At W_REF 60 and default weights, `proud` runs **1.1% over the atlas family
and 5.3% over a generic one — 4.8×**. The first implementation of the restated V6 drew
its 200-region population from a single family, and it happened to be the favourable
one. Drawing from one family lets that family's luck decide the check, which is how an
invariant starts reporting its sample instead of the model. **V6's population is now a
written-down mixed list** spanning the atlas, fixture and generic families.

This is also the second reason V6 asks for **representation rather than a rate**: at
200 regions even a 1.1% band yields ~2 towns, so the check survives the very spread it
was nearly fooled by. As run on the mixed list: 202 regions, fury 3 · aggrieved 39 ·
weary 118 · steady 38 · **proud 4**, non-grievance 80% — neg 2/2, pos 2/2, **PASS**.

**The three decisions, as taken:**

1. **V6 reads strict, over ≥200 regions, at default weights** — see §3. Strict
   because `weary` straddles zero and is ~60% of towns, so the loose reading is an
   invariant that cannot fail.
2. **`wealth` enters absolute, rescaled against W_REF = 60** — not as a percentile.
   Percentile makes `proud` a rank, and a uniformly destitute world would then
   manufacture pride out of its own misery.
3. **`elsewhere` splits by direction** — outward flows the region lost are
   minimized (+D); inward or structural relations the office merely transmits are
   deflated toward "not a matter for this office" (−D). See §3.

### 7.8 What remains for the owner

The machine part of the gate is met on 3 seeds: V1–V5 pass, no surface repeats above 3.
What is left is the part only the owner can do — reading all 50, reading 6 pairs aloud
including a positive-band pair, and judging the two named risks (euphemism-join flatness;
the house-style-of-lying uniformity). Note that the positive-band pairs in the sample are
`steady` and thin on the ground (2 of 75 oral voices), and that even those read
grievance-heavy: most `aspiration` fragments gate on a `wealth` or `aetherworks_capacity`
threshold the measured distributions rarely clear, so a `steady` town's oral voice ends up
drawing from `witness` and `grievance` anyway. That is §7.4 showing up in the reading
rather than in the histogram, and it is the thing to listen for when reading aloud.

The three decisions that blocked D2 are **taken** (§7.7): V6 reads strict over ≥200
regions at default weights; `wealth` enters absolute against W_REF = 60, not as a
percentile; `elsewhere` splits by direction. §3 carries all three.

**What is left is the part only the owner can do**, and it has not moved: reading all
50, reading 6 pairs aloud including a positive-band pair, and judging the two named
risks (euphemism-join flatness; the house-style-of-lying uniformity).

**The sample's seeds changed, and that is worth stating plainly rather than burying.**
[`docs/voices-sample.md`](voices-sample.md) was `atlas-1,atlas-2,atlas-3` — one family,
and (as §7.7 measures) the family with the *lowest* rate of the positive bands. Under
those seeds the regenerated sample still read `proud` 0 / `steady` 4 of 75, which means
**the gate could not be walked**: it asks for a positive-band pair to be read aloud and
there was not reliably one to read. It is now `atlas-1,v6-2,v6-5` — mixed across
families — and reads `aggrieved` 16 · `weary` 33 · `steady` 18 · `proud` 8 of 75.

This is a less biased sample than the original, not a flattering one, and the histogram
is printed in the sample itself so the reading is never separated from what it is a
sample *of*. Two things to hold while reading: `fury` does not appear (it is ~2% of
towns, and 75 oral sentences is too few to expect one), and the positive bands here are
commoner than they are in an average world — the mix was chosen so the upper edge could
be *heard*, not because the realm is generally glad.

Whether it *sounds* like people rather than a house style with two settings is not
something the invariants can answer. That is the whole reason this gate is a gate.

The corrections in §7.2, §7.3 and §7.5 are editorial rather than judgement calls — the
column names, the "no fragment without a region-varying slot" rule, the anaphora rule, and
V3's shortening exception — and can be folded into §§0–3 whenever the spec is next opened.
