# Voices from the People — generative spec, v2 (aligned to the Instrument Pivot)

> v2 of the drafting agent's companion spec (the file `direction.md` §5.1 references).
> The machinery of v1 survives intact — fragment/slot taxonomy, collision math, the
> facts[] audit, the folk-fraction ladder, invariants V1–V5, the prototype gate. What
> changed, per the owner's ruling that v1 was "still opinionated about the old
> medieval frame":
>
> 1. **De-medievalized** — diction skins, trades, folk units, and worked examples move
>    to the arcane-industrial register (direction.md §2); nothing speaks in sacks and
>    fair-days anymore.
> 2. **De-biased** — the sentiment model gains BOTH edges (trajectory terms; pride and
>    aspiration classes; written-record unreliability toward the institution's
>    INTEREST per topic — which is sometimes rosier and sometimes grimmer — not
>    uniformly euphemistic about harm).
> 3. **The elsewhere layer** — new fragment classes and an imperial coin tier carry
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

Two registers. A fragment is a CLAUSE with typed slots — never a full sentence
(lint: fragments carry no sentence-initial capital and no terminal punctuation;
frames own both). Classes and pool sizes:

ORAL — open (street-cry/address) 16 · grievance 20 · **aspiration/boast 16** ·
  witness (sensory/memory) 20 · rumor 14 · **elsewhere (letters, prices, the
  metropole) 14** · oath-frame 10 · song-burden 8 · closer (kicker/defiance/
  toast) 16 = **134 fragments**

WRITTEN — head (document frame) 12 · assess (observation) 20 · euphemism
  (harm-minimizing) 18 · **puffery (achievement-inflating: the prospectus, the
  throughput report, the commendation-to-the-ministry) 14** · **circular (citations
  of off-map authority: price notices, Concordat standards, imperial memoranda) 10**
  · plea (petition ask) 14 · marginalia (aside) 12 · closer (formula) 14
  = **114 fragments**

Plus 10 sentence FRAMES per register (structural: `[CORE] — [TAIL]`,
`[OPEN], [CORE]` …) and 8–12 connectives/diction skins per register per sentiment
band.

**Diction skins (arcane-industrial, replacing the shire set):**
- *works-town*: clipped, shift-counted, tool-metaphors ("since the third whistle",
  "the line eats what the line eats");
- *metropolitan/precinct*: bureaucratic cadence bleeding into speech, forms cited
  by number, queue idiom;
- *old-faith*: liturgical, the deep layer under the modern ministry — survives from
  v1's temple skin, now explicitly the OLD register persisting beneath;
- *frontier*: consonantal, distance-marked — survives from v1.
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
- Coin slots: {coin:oath} {coin:slang} {coin:burden} — walked by the EXISTING
  `markovWord` on the region's `name_register` chain (oath/slang 3–6 letters,
  burden 3–5 repeated). **Three tiers** (was two):
  - *world-coins* (oaths, scrip slang; minted once per world per register from
    substream `voicecoin#<register>#<i>`, shared across voices — oaths are culture);
  - *voice-coins* (burdens, insults; from the voice's own substream);
  - **imperial-coins** (loanwords of the Concordat tongue: trade terms, form names,
    ranks; minted once per world from the EMPIRE's name register and blended into
    voices at a rate driven by the attention proxy — market_access/sky in the
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
absorb the rest) → n≈26 draws. Expected same-FRAGMENT pairs = C(26,2)/20 ≈ 16 —
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
"#" + register + "#" + k)`. Every draw — frames, fragments, skins, coins
(`markovWord(name_register, rv, …)`) — comes from `rv` only.

1. Voice allocation: each region gets one oral+written PAIR; regions ranked by
   extremity `X = |S_oral| + 10·occupied + 8·[epithet ≠ null]` — NOTE |S_oral| is
   absolute: the proudest boom town ranks beside the angriest gate town; extremity
   is not grievance. If regions·2 < 50, top regions get a second pair (k=1) forced
   onto different topics. Deterministic, no draws.
2. Sentence count: `n = 2 + [|S_oral| ≥ 35] + [rv() < 0.35]`, clamped to [2,4].
3. Topic ranking (deterministic): for each gated topic, salience = its gating
   column value (0–100 scale) + 15 if a NAMED fact anchors it (event, gate,
   plague, works) + 10 for elsewhere topics when the attention proxy is high. The
   voice speaks its top-n topics, one sentence each; oral and written pairs share
   topics — the divergence is in treatment, which is the point.
4. Per sentence: draw a frame legal for (register, band, topic); fill its 2+
   fragment slots from the topic's class pair (oral toll → grievance+witness or
   grievance+oath; oral boom → boast+witness or boast+elsewhere; written toll →
   assess+euphemism; written boom → assess+puffery); fill slots; apply the diction
   skin.
5. **Folk attribution (ORAL only, both edges)** — a PURE function of exported
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
     era-phrase ("two lifetimes gone") — oral drifts by omission, never by stating
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
   folk-form is emitted alongside its source — each voice carries
   `facts: [{path, true, told, rule}]`, and told must equal rule(true, columns).

## 3. Sentiment and the divergence law (both edges)

All from exported columns, integer arithmetic, JS Math.round:

  T = trajectory term from boom_bust: {boom:+18, stable:0, decline:−14, collapse:−30}
  G = 0.30·blight_load + 0.35·toll_burden + 0.20·injustice_idx + 18·occupied
      + 3·tribute_burden + max(0, −T)
  C = 0.30·wealth + 0.25·social_trust + 0.15·market_access + 0.10·sky_advantage
      + max(0, T)
  S_oral = clamp(round(C − G), −100, +100)

Sentiment reacts to WHERE A REGION IS GOING, not only where it sits: a rising poor
town can be hopeful, a sliding rich one furious. [POST-B: T re-derives from the
wealth/A snapshot series; a price-collapse epoch (world series) enters G through
exposure.]

Bands: fury ≤ −45 < aggrieved ≤ −10 < weary ≤ +15 < steady ≤ +40 < proud.

**The divergence law — magnitude from illegibility + distrust, SIGN from the
institution's interest (this is the v2 fix: the written record is unreliable
toward power's INTEREST, which is not always rosier):**

  D = round(0.45·legibility_gap + 0.15·(100 − social_trust))

  Per-topic sign of the written skew:
  - harm topics (blight, burden, hunger, abandonment): written skews +D
    (minimized — the euphemism classes);
  - achievement topics (throughput, the works, growth): written skews +D
    (inflated — the puffery classes; same sign, opposite lie);
  - disorder topics (smuggling, sedition, revolt-pressure): sign depends on who
    writes — the censorate of an occupied or high-order region DEFLATES disorder
    (−D toward calm: "commerce awaiting classification"); a contested region's
    constabulary INFLATES it (+D toward threat: the budget request)
    [order axis POST-B; occupied is the v1 proxy];
  - S_written = clamp(S_oral + signed skew of the voice's LEAD topic, −100, +100).

  The censor's corridor generalizes: if occupied=1 [POST-B: or order ≥ 70],
  S_written = clamp(S_written, −10, +25) — a controlled ledger is never furious
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
  **V6 (new, the balance tripwire): across a 3-seed sample, at least two of the
     five sentiment bands on EACH side of zero are represented among oral voices,
     and ≥20% of oral sentences draw from non-grievance classes — the spec's own
     falsifiability check that the street is not a monotone.**

## 4. Worked examples (hand-simulated; the quality bar)

Coins reuse the v1 hand-verified walks: oaths "Farrow", "Velisse"; slang "osten",
"norby"; burden "gruk". Illustrative world: towns Ostenford, Haldenmouth "the
Ashen", Pellow Haven "the Yoked", Vellenmark; river the Melverow, the Ulverwell;
skyway the Larkmere Lane; events the Water-Rot of 1150, the Landing at Pellow
Haven (1200). **The example SET must span the space: two aggrieved, one occupied,
one proud — a spec whose examples are all misery would fail its own V6.**

(a) Gate town — Ostenford: toll 62, wealth 31, trust 34, legib 48, blight 22,
    market 38, pop 8,400, uncounted 1,210. S_oral −13 (aggrieved); D=32, harm
    lead → S_written +19 (steady); m=1.57, toll told: 62·1.57=97 → "all but the
    sweepings".
ORAL — "You pay going over and you pay coming back, and Ostenford Bridge keeps all
but the sweepings. The syndicate's factor sits his tally-booth on the far bank and
counts, and the counting has never once come out for us. By the Farrow, the Ore
Road ran free in my mother's day. Now they say even the Melverow pays, where it
goes under the arch."
WRITTEN — "The crossing at Ostenford Bridge returns its schedule punctually, and
the receipts are found in good order. Toll burden is entered at 62; the office
reads the figure as commensurate with the traffic borne. Of the district's 8,400
souls, some 1,210 decline enumeration; assessment proceeds upon the counted."

(b) Blighted river-mouth — Haldenmouth the Ashen: blight 84, wealth 18, trust 22,
    legib 71, burden 61/1k, uncounted 660, plague age 4 epochs. S_oral −34; D=44 →
    S_written +10; burden told → "one soul in ten" (true: one in 16); year omitted
    for an era-phrase.
ORAL — "Every works above us lets fall what it likes into the Ulverwell, and
Haldenmouth drinks it last. One soul in ten has the cough since the Water-Rot
came — Velisse keep us, we bury more than we name. The Ashen, they call us from
the freight platforms, and no hauler idles here past noon."
WRITTEN — "Haldenmouth, at the mouth of the Ulverwell: blight load 84, disease
burden 61 in the thousand, entered without remark. The Water-Rot of 1150 is
carried as abated; what mortality continues is booked under ordinary wastage. 660
persons stand outside the count, and therefore outside the levy; the office notes
the saving."

(c) Occupied port — Pellow Haven the Yoked: occupied 1, tribute 3, smuggling 66,
    trust 18. S_oral −35; disorder lead under a censorate → deflating skew, then
    the corridor holds S_written at −5.
ORAL — "Since the Landing they weigh the catch on Dominion scales, and the scales
find one crate in three to be the sea's rent. The Larkmere barges still lift over
the boom, for them that pay in ostens; the rest of us row under the garrison's
eye. Farrow take their scales — the fish never swore to any Dominion."
WRITTEN — "Pellow Haven reports an orderly quarter; the harbor boom is entered as
an aid to navigation. Tribute is collected at the highest schedule without
incident, incident being a term the office defines. Smuggling intensity stands at
66 in the register; the digest recommends the figure be read as commerce awaiting
classification."

(d) **Boom works-town — Vellenmark (the other edge, new in v2): refining 78,
    wealth 71, boom, trust 51, legib 26, market 64. T=+18 → S_oral +34 (steady,
    nearly proud); D=19, achievement lead → puffery, S_written +53.**
ORAL — "Three new lines at the works since spring, and the third whistle never
blows an empty shift. My brother signed the recruiter's book for the capital, and
his letter says they burn Vellenmark lumen in streets that have never seen the
Melverow. The pay comes in ostens now — norby coin, my father calls it — but it
comes, by the Farrow, it comes."
   trace: [boast:works+witness:shift][elsewhere:letter.{town}{trade}+witness:memory]
          [boast:pay+{coin:slang}+oath:{coin}+closer:toast]
WRITTEN — "Vellenmark returns record throughput for the third consecutive
quarter; the district commends the figure to the Ministry's attention. Refining
capacity is entered at 78 and rising; the office anticipates the schedule of the
next assessment with confidence. Outward registration of labor is noted at the
margin and read as the ordinary circulation of an expanding trade."
   trace: [head:prospectus.{town}][puffery:record+{num:refining}][assess:emigration
          +euph:ordinary-circulation]
   — note the both-edged lie in one paragraph: the achievement inflated, the brain
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
freight consonance); **imperial stems 20 (one corpus — the Concordat tongue: form
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
sources from the HTML by anchored regex (fail loudly if not found — single source
of truth, no drift); (3) implement sections 1–3 with prototype-scale pools (10–12
fragments per major class, flagged as half-size — INCLUDING the aspiration,
elsewhere, and puffery classes; a prototype without the new classes cannot pass
V6); (4) emit 50 voices as markdown: per region pair, a header quoting the gating
columns, S_oral/S_written/D + signed skew, both paragraphs, and the facts[] table
(path | true | told | rule); (5) print a PASS/FAIL block for invariants V1–V6 plus
a surface-repetition histogram and a sentiment-band histogram.

Gate to proceed: owner eyeballs all 50 and reads 6 random pairs aloud (at least
one of them a positive-band pair); V1–V6 all pass on 3 seeds; no surface repeats
> 3; only then design export schema (`voices` block) and UI, per direction.md
Phase D2.
