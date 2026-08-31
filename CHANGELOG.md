# Hinterland: the design history (newest first)

**Schema history:**
- **the reign engine: a governor's choices, replayable from a URL** (issue #142, E1;
  **schema 56 → 57, additive** — all 30 `world.geojson` fixtures differ in the version
  number and in nothing else, verified field by field: `ch` and its decision log appear
  in provenance only when a reign was played, `by` is empty on every auto-run event row,
  and the three new event types only a reign can produce cannot occur without one.
  All 30 `events.csv` files gained an empty `by` column — a trailing comma on every
  row, verified as the only change — which is exactly the case the fixture allowlist
  admits: a new column, empty for every config in the matrix. 5 `chronicle.md` files also
  moved, for a prose fix unrelated to the reign, described below).
  A world was a thing that happened to you. Now a governor can stand at the points
  where the dice decided and decide instead, and the whole reign is a string in the
  URL: `#seed=…&ch=w4:1,r6:2,t3:1`. No UI (that is E2/#143) — the engine is playable
  by hand.
  **THE BYTE-PIN WAS BUILT FIRST AND IS THE POINT.** §5 amendment (d) says the reign
  engine may not move the auto-history, so the first check written was the one that
  fails if it does: over four worlds, an explicit empty `&ch=`/`&fate=` and five
  malformed reigns each export byte-identically to the bare hash. Every later stage
  adds another way for a decision to reach the loop, and each is a chance to disturb
  the draw order of worlds that decided nothing. **A world with no reign is the world
  that existed before the reign engine did**, and that is checked, not asserted.
  **The echo-the-dice invariant is structural, not lucky.** Option 0 of every decision
  is the dice's own outcome, so a reign that echoes every die runs the same branch in
  the same order drawing the same numbers. Over 40 worlds, echoing reproduces the auto
  world byte-identically 40/40; taking a different road changes it 40/40. Diverging is
  *allowed* to change the draws that follow — a different history has different luck —
  so the invariant is asserted on the echo case only, and the fork case is asserted
  the other way round: **a decision that changes nothing is not a decision.**
  **Nine decisions: three dice taken over, six dilemmas authored.** The dice are `w`
  (the wound response, offering the top two *distinct* eligible measures), `r` (the
  rising: crushed / won / **averted**) and `d` (the Dominion: the quay opened or the
  approaches burned, **repelled**). The six dilemmas are `c` the conduit, `g` the
  granary, `o` the ore floor, `t` the gates, `s` the spoil, `n` the charter.
  **THE SIX ARE NOT §5.1'S SIX, AND THAT IS WHAT THE TICKET ASKED FOR.** §5.1 froze six
  flavours (the aetherstone concession, the imperial embassy, the sanctuary writ, the
  skyway charter, conduit rationing, the freeport pardon) authored against pre-pivot
  physics, and #142 asks for them "re-anchored to the GOVERNOR seat (comply/resist/skim
  vs the metropole) … long edges via Phase B mechanisms". Their *triggers* mostly
  survived the pivot — there is an ore strike, an annexation, a sanctuary, a skyway, a
  freeport. Their *long edges* did not: absentee rents, enriched collaborators and
  gentrifying smugglers are not mechanisms Phase B left behind, so five of the six
  would mean adding physics inside a ticket whose acceptance is a byte-pin, and then
  re-authoring the prose around it. So the six are instead the six Phase B levers that
  **already carry a discovered far edge**: B7's charter debt (`c` — the wires reach the dark country on the metropole's
  credit, and the interest reaches too), B7's granary dependency (`g` — bread now
  against a habit later, which curdles only in a sustained peace), B7's capital flight
  (`o` — resist the metropole's price and the diggers keep more, and the owners' row
  thins along with the works it funded), the tariff scale (`t` — the skim: cut and the
  roads open while the treasury thins, raise and the crown eats while the taxed road
  pays), B4's disposal doctrine (`s` — concentrate writes one zone off and spares
  everywhere else; disperse spreads the same poison thin) and B11's concession (`n` —
  refuse the charter, keep the yield, lose the capital that would have built on it).
  Only `c` survives §5.1 by letter and trigger (dark share ≥ 0.4); its edges are B7's
  rather than the ones §5.1 sketched. Each is offered once per run, consumes
  **zero randomness**, and has option 0 = the status quo, which is why merely being
  asked cannot move a world that answered nothing.
  **Each option is a different road, and that is measured rather than intended.** Over
  18 decisions spanning all nine kinds, every option of every decision lands in a world
  distinct from every other option of that decision, option 0 reproduces the auto run
  exactly, and 18/18 reigns replay byte-identically from `ch`+`fate` alone.
  **G5's four adversarial findings, each landed with its fix.**
  (1) *The averted rising's ripples.* G5 names this case for its consequences, not its
  existence: a rising that never happens must leave every consumer of revolt state
  coherent, and there are six. Five were easy. The garrison is the one that bit — **the
  Crown fortifies a crushed town after the hangings, and there were none.** Over 12
  worlds an aversion now leaves no revolt event, no stamp on the region, no byname
  (`the Free`, `the Famished`), no won-arc, and no garrison posted for hangings that
  never happened, and the once-per-run guard still closes so the rising is not offered
  twice. The first version of this branch had exactly that bug: the tail
  after the branch set `reg.eventType = "revolt"` and pushed the revolt event
  unconditionally, so the first averted rising averted nothing at all.
  (2) *The null fork — in a second sense G5 did not have in mind.* G5's finding names a
  run that offers **no** fork at all, and asks the verdict panel for a line rather than
  a degenerate diff table; that is a panel, so it belongs to E2. Building the engine
  turned up a nearer relative: the wound's ladder can name a measure with **one**
  option, because its runner-up is not distinct. Offering it would put a card in front
  of a governor whose only move is the move already made, and log a choice in the
  export that no reign could have taken differently. `decide` returns 0 without logging
  when handed fewer than two options; across 40 worlds every logged decision offers at
  least two distinct roads. G5's own case is real but not reachable by accident at
  defaults: over 60 worlds at ep=10 **none** offered zero forks and the thinnest
  offered three. It is reachable at ep=0, where there are no epochs to decide in, and
  E2 will need the line.
  (3) *The treasury floor.* No decree may drive a treasury below nothing, whatever it
  costs; all three are clamped after the dilemma block.
  (4) *Repelled narration.* A Dominion that is turned away and a rising that is talked
  down are outcomes the chronicle had no words for, because they could not previously
  happen. They have their own fragment classes now, alongside the decree block, and the
  loom's house law applies to them like everything else.
  **The parser is total and canonical, because a reign is a link.** Any input yields a
  decisions map and anything unreadable yields an empty one, so a malformed `ch` is
  exactly a world with no reign. Keys are **epoch-qualified** (`w4:1`) so a reign shared
  at ep=10 and replayed at ep=6 carries decisions for years that never arrive — they
  are simply not reached, rather than sliding onto the wrong one. Whatever order it was
  typed in, it comes back epoch-ordered and last-wins, and the canonical form is a fixed
  point: twelve inputs sanitize correctly and every one of them re-parses to itself,
  which is what keeps two links to the same reign from disagreeing in provenance.
  **A finding about `fate`, from a test it starved.** The per-option coverage table
  originally held one fate constant across 60 seeds and found the wound takeover in
  **0 of them**, while the Dominion arrived in 58. Nothing was broken: fate *is* the
  luck (A2), so a fixed fate over many seeds is a single run of luck over many maps,
  and event-triggered decisions vanish or saturate accordingly. Without a fixed fate
  the same 60 worlds offer `w` in 22, `d` in 16, `o` in 7, `s`/`t` in 60. The check
  varies fate with the seed and says why in a comment, because the next person to hold
  a knob still would read 0/60 as a dead branch.
  **Two prose bugs of the same shape, one of them E1's own, and 5 fixtures moved to
  fix them (a declared act).** The decree gloss for a dissolved sacrifice zone said its
  share of the spoil "went to the other 24 regions" — in a realm of 24. `n_regions` is
  the total; "the other N" is never the total. Grepping the shape found the same
  mistake already shipped in the gates block, where the one gate that charges nothing
  is followed by "the other 5 do" **in a realm of 5 gates**, four of which charge. Both
  now read a `n_others`/`gate_others` slot, both gained a singular arm for the count of
  one, and the second is the reason **5 of the 30 chronicle fixtures were regenerated**
  — `default/db0/gt0/wg0/iq100 × fix-3`, all five the same sentence in the same realm.
  No `geojson` or `events.csv` byte moves.
  **Two vacuous assertions, caught by asking whether an assertion CAN fail.** The
  averted-rising check read `epithet` off the region — the byname rides the settlement
  — and filtered garrisons on `kind === "garrison"`, which the export calls
  `constabulary`. Both arms were green over 12 worlds because neither ever found
  anything to look at, including the garrison ripple G5 names as the one that bit. The
  fix is not only the two names: the check now **counts its own witnesses** and fails
  if the sample contains no rising that earned a byname and no garrison lifted, and
  because a byname is rare (3 of 40 risings earn one) it hunts a witness deliberately
  rather than hoping the first twelve worlds contain one.
  **The `by` column was inconsistent on the three things only a reign can do.**
  `revolt_averted` carried `by: "governor"`; `dominion_repelled` did not, so the column
  the schema bumped for did not mark one of the three events that cannot exist without
  a governor. It does now, and the suite holds the set in both directions: over 102
  auto-run event rows not one is a decree, an aversion or a repulse and **not one
  carries a `by` at all**, and each of the three, once a reign produces it, is stamped.
  `by` is deliberately *not* set on a rising the governor chose to crush — the dice
  could have crushed it too, and marking those needs the "the seat chose" lead-in §5.1
  describes, which is prose this ticket does not author.
  **The suite no longer spells the schema version.** Two checks asserted
  `schema_version === 56` literally and went red on this bump while saying nothing about
  what they guard; an *accidental* bump is already caught by 30 byte-pinned fixtures
  moving at once. They read `SCHEMA_VERSION` off the engine now, and assert separately
  that the engine exports a usable one.
  **Two deviations from §5.1's plumbing line, both deliberate.** Provenance gains
  `hinterland.ch` and `hinterland.decisions` (the log, in lived order, with `stale`
  riding only when true) — under the same gate, because the log is *not* empty for an
  auto run and writing it unconditionally would move all thirty fixtures. events.csv
  gains `by` and **not** `option`: an option index alone is unreadable without the
  option list, and the readable form of the same fact — which road was taken — is
  already the row's `measure`/`outcome` beside `by`.
- **the verdict is composed now, and the app stopped grading worlds** (issue #141, D5;
  **no schema change and no exported byte moves** — the regen touched 30 `chronicle.md`
  files and 0 `geojson`/`events.csv`, the same shape as #140 and for the same reason:
  `findings.verdict` already existed and did not move, only the prose did).
  §3.5's verdict space has existed as a CLASS since B11 (#133): the gap's move crossed
  with the floor's, qualified by growth. **Nothing read it.** The findings band, the
  chronicle's close and the article's pull quote each did their own three-way read of
  the gini delta alone, which is why a world whose gap closed while its poorest ground
  emptied still opened with "this world closed the gap". All three read one verdict
  function now, and the judge register composes the verdict itself from an 83-fragment
  pool. Sample at [docs/verdict-sample.md](docs/verdict-sample.md).
  **The judge is on the SPELLED law and that is the register, not an inconvenience.**
  No numeral may appear in verdict prose. The analyst quotes to two decimals and the
  historian to the digit; the judge argues, and an argument leaning on a third decimal
  is not an argument. So the judge speaks in counts and parts of a hundred, spelled
  out, and every one of them is still an integer audited against the export: 680 facts
  over 80 worlds, 0 offenders, and the suite plants a tampered number-word and requires
  it back as the one offender.
  **CONTINGENT CONVICTION (§3.5).** The pool has no vocabulary for "usually", "worlds
  like this", or "as always" — the app measures one world at a time, and a claim across
  worlds is a claim the export cannot support. The judge argues hard about this realm
  and holds no opinion about realms.
  **The moral colour-coding is gone.** The findings lead was painted green when the gap
  closed and red when it widened: the app grading a world on one axis of three, and
  grading at all. A world that closed its gap by emptying its poorest ground was
  painted green. The words are the whole of the reading now.
  **§7.3 pinned on the instrument the issue names**: the 80-world calibration sweep at
  defaults, ep=10. Eleven distinct §3.5 classes, the commonest 20% against a 40%
  ceiling.
  **Three findings, and the first is the one that matters.**
  (1) *#140 broke `tools/atlas.mjs` and CI could not see it.* The atlas parsed the
  capital's name and the reigning ruler out of the chronicle's preamble with regexes,
  and quoted each archetype by matching a v1 chronicle sentence. D4 composed the
  chronicle from pools, and measured afterwards: the capital name parsed in **0 of 20**
  worlds, the reign in 2 of 20, and **eight of the nine archetype quotations matched
  nothing** (0/30 to 5/30, from 30/30). The atlas is a docs generator, so nothing in
  the suite ran it and #140 went green and merged with the tool broken. It is the same
  defect the nineteen chronicle greps inside the suite had, sitting just outside the
  suite's reach. Both facts now come from the export, and every quotation is anchored
  on a value the world exports — a town's name, the figure the archetype was chosen by
  — falling back to the world's own composed verdict, which every chronicle now carries
  and which is always on the subject.
  (2) *`unequal growth` is rare, and the acceptance asked to display it.* The sixth
  cell of §3.5's matrix — a gap that widens over a RISING floor — appears **2 times in
  1200 worlds** at defaults across eight seed families (`verdict-proto.mjs --rate`):
  one in six hundred. The mechanism behind the rarity is the checkable part, and is
  what the suite asserts: of the **191** worlds whose gap widened, **2** also raised
  their floor, one in ninety-six. In this model a widening gap almost always takes the
  floor down with it. That is a finding about the world-model rather than the prose, so
  the cell's prose is authored and the check is a tripwire: if a later mechanism makes
  the cell common it turns red and the claim is re-measured instead of inherited.
  (*This entry twice said something the evidence did not support before it was
  measured — first "unreachable" from one seed family, then "one in twenty-five" for
  the mechanism from a 48-world probe, against a measured one in ninety-six. The rate
  above is from 1200 worlds and the script that produced it ships.*)
  (3) *The floor axis is measured on survivors, and the verdict never said so.* The
  floor is the poorest tenth of the regions still standing, taken at both ends on that
  same set — which is the right way to measure a change and the wrong way to be quiet
  about. A realm that abandoned its poorest ground can show a risen floor because the
  ground that would have dragged it down stopped being counted: measured, that flips
  the sign in **8 of the 89 risen-floor worlds** in a 200-world sweep. The measure is
  unchanged, because comparing the same regions at two times is correct; what changed
  is that the judge now says how many settlements left the count, whenever the floor
  rose and any did.
  The register's own laws caught two more in passing: eleven fragments carried their
  own colon or semicolon into frames that own the punctuation, and a plural was written
  into clauses whose count can be one ("one of the eighteen settled regions end richer
  than they began").
- **the chronicle is composed now, not recited** (issue #140, D4; **no schema change and
  no exported byte moves** — the fixture regeneration touched 30 `chronicle.md` files
  and 0 `geojson`/`events.csv`, which is the pin proving the export did not move).
  The chronicle was one fixed template per beat and one per event type: a
  twenty-seven-branch `if` ladder for the years, four hand-written acts around it, and
  every world saying all of it in the same words with only the names and figures
  changed. It composes on the loom (#137) now, in the historian register, from
  **CHRONICLE_POOL (56 classes) and EVENT_POOL (92 classes)**. The branches that used
  to choose a template — contested or not, won or lost, chained to an ore strike or
  not, shrine or no shrine — are `req` predicates on fragments, so a world that does
  not meet one never sees the clause, and an ABSENCE ("no wall of rock crosses this
  realm") is a fragment like any other rather than the else-branch of a template.
  Sample at [docs/chronicle-sample.md](docs/chronicle-sample.md); the instrument is
  `tools/proto/chronicle-proto.mjs`, which measured the baseline before anything was
  authored and measures the result with the same mask.
  **The closing act was the findings panel written a second time.** "What the Record
  Shows" restated, in the historian's voice, what `findingsHTML` already argued —
  fifteen findings, two independent copies to keep in step. It calls `composeFindings`
  now on its own substream, skipping the three topics the State of the Realm already
  carries (class, sovereignty, dark grid), which were being stated twice in one
  document. One pool to maintain instead of two, and the two surfaces cannot drift.
  **The sameness ceiling, measured and earned.** §4 pins cross-seed chronicle overlap
  below 0.20, skeleton-masked so one template run over different town names scores as
  the SAME prose. The v1 chronicle measured **0.62**; it measures **0.197** now (0.1968
  over 40 seeds), and by act: preamble 0.98 → 0.47, The Years 0.50 → 0.19, State of the
  Realm 0.76 → 0.17, The Founding 0.71 → 0.15, What the Record Shows 0.65 → 0.18. The
  instrument's own floor was measured rather than assumed: two acts of the SAME
  chronicle, sharing register and subject but no template, score 0.045–0.073, and a
  chronicle against another world's findings panel scores 0.092. 0.20 is well clear of
  that floor, so the ceiling is a claim about the prose and not about the measure.
  **The within-seed cross-knob ceiling (§4: 0.45) is reported and deliberately NOT
  pinned, and the reason is a measurement.** It reads 0.76 against a v1 baseline of
  0.93. A knob at its extreme leaves 77–96% of the beat structure standing — `iq=100`
  shares 53 of 54 beats with the default — and the composition substream is keyed on
  the seed, so two knob settings of one seed draw the same fragments for the beats they
  share. Reaching 0.45 would mean keying composition on world state and rewording a
  chronicle whose content did not change: tuning to the metric. The number is in the
  suite's message where a later reader can see it move.
  **Nine defects, and two of them are about the measure itself.**
  (1) *A wordy frame RAISES cross-world sameness.* A frame's own words are shared by
  every world that draws it, so adding five phrase-frames ("{A}. What followed: {B}.")
  moved the corpus from 0.197 to 0.200 even as it varied the sentences. Frames stay at
  punctuation and the smallest connectives; the variety is bought in the pool.
  (2) *The metric rewards a chronicle that repeats itself.* Sharing one clause tally
  across The Years — so that no clause is written twice in one chronicle, however many
  droughts or successions a world has — moved cross-seed overlap from 0.21 to 0.22,
  because suppressing within-world repeats raises each world's coverage of the pool.
  The tally stayed. The prose is what ships, and a reader meeting the same sentence
  twice in one document notices something no cross-seed statistic can see.
  (3) *A gloss that restated the claim's list.* Seven classes had claim and gloss both
  printing the same flattened list; the bynames pair printed a fifteen-name list twice
  in one paragraph. The glosses carry the COUNT now, which keeps the region-varying
  slot the house law requires without saying it twice.
  (4) *A list that ran one template per item.* The ruins, the ages and the fates each
  built every item from a single template, so a realm with four delves said the same
  nine words four times. Each item draws its own phrasing now, on the list's own
  substream.
  (5) *A plural written into a fragment whose list can hold one item.* "the work at all
  1 of them", "Vonkar Camp by Dhurn are kept by hunters", "1 ended richer than they
  began". The plural fragments gate on there being more than one and the singular ones
  are their own fragments, which is how every other branch in the pool is written.
  (6) *Two agreement bugs in the FINDINGS pool, found by reading the chronicle.* "the
  empire came to **1** coast was and then stopped coming" (a slot that renders a
  subject and its verb, used where the sentence wanted a bare noun) and "**1** of **5**
  crossings are past their upkeep". Both shipped in #139's panel; composing a second
  surface off the same pool is what made them visible.
  (7) *A beat that could contrast the capital with itself.* "The refining is done at
  Herow Ford, from which the trunk lines reach Herow Ford", and the same shape in the
  concession and writ beats. Gated now on the works standing somewhere other than the
  capital, and on the event's town not being the capital.
  (8) *Three guarantees the v1 templates gave by accident.* A contested succession
  could be narrated without naming who took the place; a treaty could state its terms
  without naming their author; a consecration could consecrate without naming the
  shrine. E5, F3 and D6 all require those by name. They are properties of the pool now:
  every succession coda carries the successor, every terms fragment carries the winner,
  and every consecration claim that does not name the shrine is gated on there being no
  shrine to name.
  (9) *The C1 vocabulary ban caught the tier name.* `\bthe works\b` matches "the
  works-town", which the war beat prints whenever a works-town is fought over. The tier
  reads "the aetherworks town" now. Two more fragments ("took the works with it", a
  "toll-post") were caught by the same tripwire.
  **The suite stopped grepping the chronicle for phrases — nineteen checks.** They
  asserted a beat's ARGUMENT by matching its WORDING, which a composed surface breaks
  by design and a *dropped beat* does not. They assert the beat now: fill every
  fragment of the class against this world's own context and require one of them to be
  on the page (`beatFired`), or assert the figures and names directly — the reigning
  ruler and the close year rather than "the reign of", each river's mouth town rather
  than "gets it clean", the two war powers rather than "The two powers fighting there
  were". A reword leaves them green; dropping the beat turns them red.
  **And the "no fixed sentence survives" check does not grep either.** A composed pool
  may legitimately keep a v1 sentence as one of its realizations, and does. What
  separates a template from a fragment is frequency, not wording: a template is a
  sentence every world says. Masked and measured, the corpus's most-repeated sentence
  now appears in **0.58** of worlds against v1's 1.00 by construction, pinned at 0.67.
- **the findings are composed now, not recited** (issue #139, D3; **no schema change and
  no exported byte moves** — the panel is a UI surface, so no fixture regeneration was
  called for and the golden pin proves it). `findingsHTML` held about fifteen canned
  sentences with this world's numbers interpolated into them, which meant every world
  argued its case in the same words and only the figures changed. The prose now composes
  on the loom (#137) from a **238-fragment analyst-register pool** over 32 classes, and
  `findingsHTML` is a renderer: markdown emphasis to HTML, the topic accents, the joins.
  Composition lives in the engine (`composeFindings`), so the whole surface is testable
  without jsdom and the engine stays DOM-free.
  Sample committed at [docs/findings-sample.md](docs/findings-sample.md); the gate script
  is `tools/proto/findings-proto.mjs`, and unlike #136's it reads the SHIPPING composer
  rather than a fork of it — which is what building the loom first bought.
  **Every figure is audited, and the audit is not decorative.** Across 20 seeds, 298
  blocks and **967 facts**, every told was recomputed from its source value under the
  rule the fact declares: **0 offenders**. The suite plants a single moved digit and
  requires it to come back as the one offender.
  **The suite stopped grepping the panel for phrases.** Two checks asserted the panel's
  ARGUMENT by matching its WORDING (`/owners' row/`, `/steepness is the finding/`), which
  a composed surface breaks by design and a *dropped finding* does not. They assert the
  figures now — pop_pct, coin_pct, class_gap, the company town's name; the tail slope
  plus a concession drawn from a set of six forms — so a reword cannot fool them and a
  missing finding cannot hide behind one.
  **Diversity, measured and pinned.** Cross-seed panel skeleton overlap is **0.18**,
  inside §4's pinned 0.20 ceiling. Per topic the worst is `sovereignty` at 0.23, pinned
  at 0.24 rather than rounded to 0.20, and the reason is stated: the four topics above
  0.20 (sovereignty, moran, sky, shadow) share a long technical clause that IS the
  claim — the permutation caveat, the fare argument, the distance control — and varying
  it away would vary away what the finding says.
  The panel-level type-token ratio reads 0.47 against a 0.55 floor and that is a **scale
  artifact, not sameness**: the panel is fifteen blocks concatenated, and function words
  repeat across any fifteen sentences. Per BLOCK, the unit a reader actually compares
  between two worlds, it runs **0.64 to 0.88**. The pin is on the block.
  **Three defects the migration found, none of them in the migration.**
  (1) *The slot grammar silently ignored a malformed slot.* The pool shipped
  `{num:moran_I}` during development; the slot key charset is `[a-z0-9_]`, so the regex
  matched nothing, nothing filled, no fact was recorded, and the literal braces went to
  the page. `loomLint` knew about unknown slot KINDS but not about unreadable keys. It
  does now, and the D1 lint test grew a seventh planted problem to prove it.
  (2) *A block argued a finding it did not always show, twice.* The rank-size block
  calls the tail slope "the finding" and then, in two of its fifteen realizations,
  quoted only the whole-system α and never the tail. The class block argued the ledger
  in three of six glosses without ever quoting the owners-to-labour ratio, which is the
  finding's whole point and which the v1 sentence always carried. Grepping for a phrase
  could not have caught either; asserting on `facts[]` caught both, the second of them
  in a check written for this very PR. Every zipf claim now carries `tail_alpha` and
  every gloss `tail_r2`; every class gloss carries `class_gap`.
  (3) *A gloss asserted something the numbers contradicted.* "Richer than the median"
  fired on every concession, including one worth 0 against a median of 11. The v1 panel
  had the same bug — composing it is what made it visible — and the claim is now gated
  on the comparison it makes, with a branch for the other case.
  Two house tripwires also caught this pool, which is what they are for: the em-dash ban
  took a frame, and the C1 medieval-vocabulary ban took three fragments. A composed
  surface can smuggle a banned word in a fragment exactly as easily as a canned one could.
- **the loom: the house prose engine's runtime, built and left dormant** (issue #137,
  D1; no schema change; **exports byte-identical**, verified directly as well as by the
  golden pin). Principle P5 (direction.md §4) says the app must COMPOSE sentences where
  it now SELECTS them. This lands the machine that will do it and nothing that consumes
  it: frames, typed slots, column-predicate gating, per-surface substreams, world
  lexica, the slot audit, the skeleton-masked diversity measure, and the pool linter.
  No fragment pool ships with it. A pool belongs to the surface that migrates onto it,
  behind that surface's own prototype gate — voices D2 (#138), findings D3 (#139),
  chronicle D4 (#140), verdict D5 (#141).
  **Dormant is one letter from dead**, which is the exact failure the suite's own
  self-audit exists to catch, so the dormancy is checked: every one of the 19 exported
  `loom*` symbols must be exercised by the suite or the check fails. It found six that
  were not on its first run.
  **Byte-identity was verified two ways**: the 30 golden cells, and a direct
  before/after diff of 1.9 MB of export (GeoJSON + epoch series + chronicle + CSV,
  four configs) against the pre-loom engine. Identical. The new `imperial` name
  register — the Concordat tongue, §3.6's audible loanword tier — moves nothing
  either, because `nameRegister()` never selects it.
  **Three findings came out of building it.**
  (1) *The one-slot rule is now house law, enforced by lint.* §1's collision
  arithmetic assumes "≥2 slots averaging ≥6 realizations"; a slotless fragment has one
  surface and collides with itself on every draw. The #136 gate measured worst-surface
  repeats of 14 at half pool scale and **8 at full scale** against a ceiling of 3. Pool
  size was never the binding constraint. Slot density was.
  (2) *The pooled type-token ratio was the wrong measure and had to go.* Types grow
  sublinearly in tokens, so a pooled ratio falls as a corpus grows and a fixed floor on
  it fails good corpora for being large — the first version of this measure did exactly
  that to a 20-paragraph sample. It is now the mean WITHIN-skeleton ratio, which is
  stable in n; the suite pins that stability.
  (3) *§4's 0.20 cross-seed overlap ceiling has a price, and it is now measured.*
  Pairwise skeleton overlap against pool size, everything else held: **8 fragments →
  0.56, 9 → 0.46, 11 → 0.41, 16 → 0.28, 22 → 0.20**. So the ceiling costs roughly 22
  fragments at this frame count, and an 11-fragment pool lands at 0.41, squarely inside
  the 0.36-0.52 band §4 records for today's chronicle. D3 and D4 now have a number to
  author against instead of a target to discover late.
- **the voices prototype gate: V1-V5 hold, V6 caught the spec** (issue #136; no schema
  change; no app change; nothing in `tools/proto/` runs in CI). The gate asked for 50
  voices, the six invariants, and a judgement. The invariants are in
  [docs/voices-sample.md](docs/voices-sample.md); the judgement is written up as
  [docs/voices-spec.md](docs/voices-spec.md) §7.
  **V1-V5 pass on all three seeds** — every digit in a written voice traces to an export
  value in its `facts[]`, no oral voice contains a digit, every name traces to the export
  under the shortening rules, the divergence law holds exactly including the censor's
  corridor, and the worst surface repeat is **3** against V5's ceiling of 3 (950 distinct
  realized surfaces over 1022 draws).
  **V6 failed, and it failed on the spec rather than on the prototype.** Across 20 seeds
  and 386 settled regions, §3's sentiment formula applied verbatim puts **65% of towns in
  `weary`** and reaches `proud` in **1.3%**. The G side is well scaled; the C side is
  starved, and one term is why. `wealth` is nominally 0-100 but realized p50 **13**, p90
  29, max **55**, so `0.30·wealth` contributes a mean of **4.5 points, 15% of C**, and
  `social_trust` supplies most of what pride exists. The tell is in §4: the worked
  examples the spec calls "the quality bar" assume `wealth` 31 (the **91st percentile**)
  and `wealth` 71 (**above the observed maximum**). Example (d) exists precisely so the
  spec's own example set can pass V6, and it is built on a column value the engine does
  not produce.
  **Measured and deliberately not applied**, the same move as #185: entering `wealth` as
  its within-sample percentile, changing nothing else, moves those 386 regions to steady
  **42.5%** and proud **5.2%** and V6 passes strictly. The sentiment model is the owner's
  and §0 already schedules its re-derivation for Phase D2, so `--diag` prints both
  distributions side by side and the formula stays as written. **The gate stays shut**,
  which is what a gate is for.
  Four more spec defects fell out of building it, all in §7: the ground-truth column list
  has drifted (`toll_burden`/`refining_capacity`/`on_conduit` do not exist under those
  names); §1's collision math assumes every fragment carries slots and the fragments did
  not, which is the whole of V5's failure at half scale (max repeat **14**) and at full
  scale (**8**) — pool size was never the binding constraint, slot density was; V3 as
  literally worded forbids the shortening rules §1 and §2 require; and v2 added the
  `elsewhere` layer to §1 and §2 but never gave it a row in §3's sign table, so **12% of
  written voices carry no skew at all** in the one register whose purpose is to diverge.
- **the environmental limb of the disease burden was decorative; it is now derived from
  the epidemiology** (issue #192; no schema change; all 30 golden cells moved, atlas
  regenerated). `burdenEnv`'s coefficient came out of a units conversion in #180
  (`0.55 / 4.8`), not from any literature, and #168 then showed it explained essentially
  nothing about who is sick once the retired `^6` siting exponent stopped coupling
  contamination to poverty — a partial correlation of **+0.01**. A limb of a three-part
  decomposition that moves the outcome by nothing is not a mechanism.
  **The target was declared first, in its own commit, before the coefficient moved and
  before the status quo was measured against it** — which is what `tools/targets.mjs`
  is for. `burden_env_fraction`, band **[10%, 25%]**, cited to Landrigan et al. 2018
  (the Lancet Commission on Pollution and Health: ~9 million premature deaths a year,
  about **16% of deaths worldwide**) and Prüss-Ustün et al. 2016 (WHO: ~23% of deaths
  from modifiable environmental factors, a broader category this model bills partly to
  its water component). The engine was expected to sit below the band; by how much was
  not known when the band was written down.
  **The metric is a counterfactual, not a correlation, and that is the whole point.**
  Zero the contamination and ask what share of the burden disappears — the quantity the
  cited studies themselves report. #168 had just shown that the correlation reading of
  this mechanism was an artifact of a siting rule, because whatever covaries with blight
  rides along with a correlation. A counterfactual cannot be gamed that way. It is also
  exactly recomputable from the export, since `care` and `jit` multiply every limb of
  the burden and cancel in the ratio, so the suite pins it from the columns.
  **Only the magnitude turned out to be free.** Measured first, the model's own split
  between direct exposure and contaminated water was **3.55 : 1**, against Landrigan's
  ~6.5M air to ~1.8M water — about **3.6 : 1**. The structure was already right, so the
  ratio is preserved untouched and both channels scale by the same factor of **2**,
  which lands the attributable fraction at **16.0%** against 8.8% before. Note what it
  does not do: median burden moves 40 to 42. The realm is not made sicker; the sickness
  is attributed to what causes it.
  The partial correlation recovers to **+0.31** as a *consequence*. It was not the
  target — #192 was explicit that restoring the old +0.23 must not be the success
  criterion, because that number was itself the artifact — and the shipped value
  overshoots it, which is what deriving from a different quantity looks like.
- **the poverty-targeting siting exponent is gone, and the target it was propping up is
  now missed honestly** (issue #168, R5; no schema change; all 30 golden cells moved).
  #168 was filed against `(1 − wealth/100)^6`, the weight the concentrate doctrine used
  to spread residual spoil: at that exponent the poorest cell is weighted **sixty-four
  times** the median one, which does not model siting so much as author the
  blight-poverty correlation the findings then report as a discovery. It had been parked
  twice — once on #165, then on #180 — with the note "#180 step 3 returns to this issue
  once the field is absolute". #180 landed, so the question was live again, and
  re-measuring turned up two things.
  **#180 had already narrowed this target a long way, and nobody recorded it.** The
  misses register still read "+0.46, only 3 of 24 worlds negative" — the pre-#180
  number. Measured across four seed families before and after the absolute blight field:
  `atlas-*` went **+0.509 → +0.167** (4/24 negative → 9/24), `bw-*` +0.144 → **+0.055**
  (6/24 → **12/24**), `r5-*` +0.280 → +0.104, `dbsw-*` +0.200 → +0.071. Giving inhabited
  ground a real contamination gradient did more for this EJ target than any response-side
  mechanism managed, which is exactly what #178 predicted.
  **And the exponent is now `^2`, which widens the miss on purpose.** Two income-elastic
  siting channels — cheap land and weak resistance (Banzhaf, Ma & Timmins 2019;
  Banzhaf & Walsh 2008) — multiplying: the poorest ground carries four times the median
  weight rather than sixty-four. The cost is stated because it *is* the point: the median
  moves from +0.055 back to **+0.436**. The negative mode was closest at the exponent
  that manufactured it, and a target met by authoring its own answer was never met. The
  engine now misses it honestly instead of hitting it by construction — the same trade
  #180 made for the city-size band.
  **Not the `^1.5` the issue prescribes, and the reason is P2 rather than fit.** At 1.5
  the concentrate doctrine loses its poverty-targeting blade outright: over the suite's
  48-world doctrine sweep the most negative world reads −0.18 and exactly **one** world
  is clearly negative, so "concentrate can put the poison on the poor" stops being
  reachable and the knob stops having two edges. `^2` is the shallowest value at which
  both blades survive, and it is not a knife-edge once you look past the suite's own
  seeds: on **24 unseen worlds** the most negative reads −0.33, and pooled over 120
  worlds five are clearly negative. One obstacle from the last attempt is also simply
  gone — `^1.5` used to fail "water access tracks prosperity" at 11/20 against a floor of
  12, and post-#180 every exponent tested passes it.
  **It was propping up a second finding too, which is a sharper vindication than the
  issue expected.** "Burden is emergent: it rises with blight" read +0.21 only because
  `^6` coupled blight to poverty by construction (corr(blight, wealth) −0.35) and burden
  falls steeply with wealth. Retire the exponent and the coupling goes (+0.07), and the
  environmental term turns out to explain **nothing measurable** about who is sick: the
  partial correlation holding wealth and healing reach fixed collapses from +0.23 to
  **+0.01**. The `burdenEnv` coefficient was NOT raised to bring it back — that lever
  does work, and using it would be restoring a number an indefensible siting rule had
  manufactured. The check now reports that leg with the measurement inline; the two legs
  that were never confounded are still asserted and both got stronger. Filed as #192.
  **Four mirrors and exhibits moved with it.** The consecration check completes a
  correction #180 only half-made: #180 excluded sacrifice-zone plagues from the
  denominator, but a RELIC CALAMITY also sets the wound flag, and calamities strike
  sanctuaries by construction, so the Temple declines ground it already holds. A world
  whose first wound is a calamity can never produce a consecration; 5 of 6 apparent
  failures were exactly that, and the corrected denominator reads 5/6 against a floor of
  half — on **both** exponents (^6 reads 8/9), which is how you tell a mirror fix from a
  tuned one. Three pinned exhibits moved seeds with their conditions unchanged: the
  toll-heavy realm am-19 → am-25 (the fourth such move), the creditor imposition
  le-14 → le-15, and the retention act's capital flight ra-8 → ra-18.
- **"the poorest fifth of the realm" was 85% empty cells** (issue #178's two remaining
  defects; **schema v55 → v56**, because `findings.blight_ratio` keeps its key, changes
  its population, and becomes nullable; all 30 golden cells moved). #178's mechanism —
  the differential exit — landed in #179; what stayed open were the two defects it found
  along the way, and both were worse than filed.
  **The published ratio measured abandoned ground.** `blight_ratio` ranked every cell by
  wealth and called the bottom fifth "the poorest fifth of the realm" — but an empty cell
  exports wealth exactly 0, so empty cells **are** the bottom fifth. Measured over 80
  worlds that fifth was **85% uninhabited on average**, 100% of it in the worst worlds,
  and the value differs from the inhabited reading in **73 of 80**. It now ranks the
  realm's towns, and is null where fewer than five stand to rank a fifth against a fifth
  (reachable — null in 36 of 48 worlds at 5-8 regions, where the old form quietly
  reported a number computed from empty ground). This was not the easier reading: the
  median sits at **1.0** either way. On the corrected one the direction runs opposite to
  the headline the docs used to carry — the poison lands on the **rich** in 34 of 80
  worlds against the poor in 22, with 24 at parity.
  **The chronicle, the app and the atlas were asserting the sign.** The chronicle and the
  readout both stated the ratio unconditionally as "carries N times the blight of the
  richest fifth", which reads as a finding of injustice even at 1.0 — parity, and the
  commonest case — or below it, where the richest fifth carries more. Both now report
  what the number says. The atlas was worse: it published the **all-regions**
  correlation while `tools/targets.mjs` and every live acceptance check use settled-only,
  so the headline document and the test suite disagreed about the sign of the project's
  central environmental-justice claim; and its prose read "blight–wealth correlation
  **stays negative** (the poison lands on the poor) in N/80 worlds", asserting the
  conclusion and filling in a count, so a refuting number still rendered as
  confirmation. It now reports both directions with the median beside them and points at
  the MISSED target in `docs/grounding.md` §8.
  The counterfactual panel's arithmetic is guarded for the new null, and the
  exactly-recomputable mirror in `tools/stress.mjs` carries the settled ranking.
- **the model measured environmental injustice in the unserved country and then declined
  to report it** (issue #189, the empty-ground audit; no schema change, 30 of 30 golden
  cells moved). A systematic sweep of every aggregate in the findings block, prompted by
  the same defect surfacing three times in a row across #180 and #185: a statistic about
  *people* computed over a population that includes cells with nobody on them, where the
  human columns read 0 by construction. 29 aggregate sites, 8 already guarded, each
  suspect recomputed from the exported columns both ways over 40 worlds and checked
  against the engine's own value first.
  **`dark_burden_ratio` inverted a published claim.** It publishes how much heavier
  sickness runs off the grid than in the lit core, and the chronicle prints that
  sentence only when the ratio exceeds 1. The off-grid country is **59% empty cells**,
  each exporting `disease_burden_per_1k = 0` — "a dead zone has no people, so no health
  burden" — and the zeros ran the numerator. Published median **0.4**: the unserved
  country reading *healthier* than the core, so the sentence was suppressed in **30 of
  39 worlds**. Over the people actually living out there the ratio is **2.0** and the
  finding holds in **21 of 22**. It is now pinned as a positive claim in the suite
  rather than merely fixed.
  **`sovereignty`'s ratios were averaging in towns that no longer exist.** A cell the
  years emptied exports wealth 0 while **keeping** its `elite_share` and `retention`,
  because the abandonment pass clears population and tier but not the economic columns.
  `comprador_ratio` fell 1.8 → 1.4 (a third of the occupation premium was the ownership
  of dead towns) and `growth_gap` moved 7 → 8, since each dead cell's whole founding
  wealth was counted as a loss, mostly on the free side. `occupied_n` and
  `corridor_wired` were deliberately left territorial: occupied ground is occupied
  whether or not anyone lives on it, and the Dominion force-wires empty cells too.
  **What the sweep cleared**, checked rather than assumed: the coin and headcount
  aggregates are population-weighted, so empty cells contribute 0 on their own; the
  company town has never once been an empty cell (0 of 40 worlds); no unsettled cell has
  ever carried a nonzero tariff burden (0 of 40); and gini, the size distribution and
  the median-wealth findings were already filtered.
  **What it flagged and did not change**, with reasons on #189: `findings.moran` over
  wealth admits empty cells at 0 and empty cells cluster spatially, but Moran's I is a
  *lattice* statistic — restricting the sample means restricting the graph, which
  changes the number's meaning rather than correcting it. `sky.reached_n` counts
  unsettled ground as reached in 38 of 40 worlds, vacuous rather than distorting.
  `blight_ratio` carries the identical defect, is already tracked as #178, and is left
  alone because it is byte-pinned in all 30 fixtures and quoted in every chronicle — the
  sweep confirms it differs from the settled reading in 36 of 40 worlds.
  The exactly-recomputable mirrors in `tools/stress.mjs` now carry the settled filters
  and are the guard: a regression in these columns flips 120 configs red. A syntactic
  rule would false-positive on every legitimate land column, so the mirrors are the
  enforcement point.
- **the mountain wall's cost was measured against fields, not towns** (issue #185; no
  schema change, but two headline claims move; 9 of 30 golden cells moved). Two
  arrays decide everything this model says about what a mountain wall costs — the
  shadowed regions and the open ones — and both were drawn from **every region**,
  settled or not. A cell the years emptied exports wealth exactly 0, so it entered
  both claims as a settlement earning nothing.
  **The headline number.** `shadow_gap_pct` is quoted in every chronicle as "the median
  settlement earns N in the hundred less than the open country at the same distance".
  Measured over 40 worlds at `ep=10`, it falls from a median of **72% to 50%** once the
  median is taken over actual settlements. Its old maximum was **100%** — the walled
  country earning literally nothing — which is only reachable when over half the
  shadowed cells are fields. The engine was not finding a mountain effect that large;
  it was counting empty ground.
  **The exhibit.** The twins are the *same distance, different fate* argument: the
  sharpest same-distance pair across the wall, picked by the widest wealth gap. An
  abandoned cell wins that contest outright whenever one sits in the shadow. Twins were
  found in 33 of those 40 worlds, and in **24 of the 33 (73%)** the shadow twin was
  empty ground — named in the panel and the chronicle as a place that has no name to
  print. A dead cell is not the wall's victim; it is nobody's town.
  Both sides of both claims must now be settled; the sky means (`shadow_adv` /
  `open_adv`, which ask whether the skyway would help the walled country) follow the
  same rule, since an empty cell has nobody to board. A check pins the twins invariant,
  and the exactly-recomputable mirrors in `tools/stress.mjs` were updated with it.
  **The rest of #185 was built, measured, and deliberately not landed**, which is the
  more useful half. The issue was filed on a finding — that **first-time settlement
  foundings are 0.0 per world**, so every "new town" this engine has ever produced is a
  resettlement — and its cause turned out to be one line: the founding sets
  `settled = 1` on every region, two lines under a comment promising that whether a
  region holds a settlement "is now an outcome". It is not an outcome. The pool the
  frontier path draws from is empty by construction. Worse, the founding centuries grow
  a hamlet on every cell using a quality term blind to ruggedness, temperature,
  elevation and biome, so **66 of 384 cells start below the loop's own abandonment bar
  and exactly 66 abandonments fire in epoch 1** — a correction wave the chronicles have
  been narrating as town deaths.
  A founding gate was implemented against the loop's own bar and it works: epoch-1
  abandonments fall 66 → 13, later abandonment is untouched (43 → 44), the end state is
  identical (79% settled either way), the realm keeps its people, and first-time
  foundings go **0.0 → 1.6 per world** — the frontier path firing on virgin ground for
  the first time. **And it does not do what the issue was filed for:** upper-half α
  moves 0.685 → **0.630**, *away* from the pre-registered band. The premise that a real
  settlement frontier would produce the tail is measured and false at this magnitude.
  #185 was filed with "do not build this to reach the band" written into it; it did not
  reach it, and that is the finding rather than a reason to keep tuning. The cost of
  landing it anyway would have been 15 broken checks — mostly correlations over all
  regions in `ep=0` sweeps, which were clean only because main happened to settle every
  cell — plus two real ones: sample truncation drops `corr(burden, blight)` 0.21 → 0.10,
  and R3's pre-registered `upward_mode_absent_shocks` flips to 61 up / 62 down, since
  `k = 0.6` was chosen in #184 as the *smallest* value clearing all three sub-targets
  and is marginal by construction. Re-tuning `k` to keep a target met after perturbing
  the world would be fitting the knob to the test. The evidence is written up in full on
  #185 for whoever picks it up; the band question stays open in `docs/grounding.md` §4,
  and nothing here has moved it.
- **blight becomes an absolute load, and the city-size band turns out to have been
  numerical noise** (issue #180; **schema v54 → v55**, because `blight_load` changes
  meaning; all 30 golden cells moved and the atlas was regenerated). Two follow-ups
  filed out of it: #185 and #186.
  **The defect.** `blight_load` was normalised to each world's own maximum on every
  recompute, so it never said "how poisoned is this place", only "how poisoned
  relative to the single worst cell right now". That anchor is pathological: the worst
  cell is the sacrifice zone, poisoned until it empties, and it is **uninhabited in 15
  of 16 worlds**. Every inhabited place was squeezed into the bottom eighth of an
  integer scale — settled p10/median/p90 of **2 / 5 / 13**, about twelve distinct
  values for the entire population of the model. The "Ashen" byname, meant to mark a
  poisoned town, was reachable by **1 of 291** settled regions.
  **The change.** An absolute load with a fixed ceiling, so 100 means *ruined* rather
  than *worst in show*; inhabited ground now spans **10 / 28 / 51** and the Ashen
  byname is reached by 5 of 301, in 5 worlds rather than 1. Contamination is also a
  **stock** rather than a live reading: it used to be rebuilt from scratch each epoch
  out of whichever works were running at that moment, so closing a works healed its
  ground instantly and completely (measured on main, 27 → 9 in one step). It now
  carries at a ~50-year half-life, so poison outlives its source. Habitability is
  convex, because one linear coefficient cannot say both that ordinary contamination
  is a nuisance and that ruined ground is uninhabitable.
  **The finding, which is bigger than the change.** #180 misses the pre-registered
  `rank_size_alpha` band — 0.685 against [1.2, 1.8] — and the band **was being met by
  an artifact**. The first diagnosis (ruined ground is expensive to resettle, so the
  churn that steepened the tail stops) is **wrong**, and was disproved by trying to
  reproduce it: strip the ruin penalty out entirely and α does not recover (0.655,
  with *fewer* rebirths, because towns then simply never die). What actually did it is
  the **motion of the denominator**. Measured over 8 worlds, the per-world normaliser
  ranged **5× within a single run** (single steps up to 2.6×), so a cell whose own
  contamination never changed could read double or half from one epoch to the next
  because some *other* cell's works opened or closed. That jitter pushed marginal
  cells across the abandonment and founding bars, and the spread of town **ages** it
  produced is what the upper-half fit read as a Zipf tail. Freeze main's denominator
  at any constant and α collapses to 0.65–0.70; at a frozen denominator of 8.0 the
  blight distribution is p50 4 against main's p50 5 — the same field, the same units —
  and α still falls 1.255 → 0.650. The level of blight never met that band; the motion
  of the scale did. Recorded as MISSED in `tools/targets.mjs` with the band untouched,
  and the suite now reports α while keeping the failure modes that are still real (the
  tail must stay a good power-law fit — it improved, r² 0.85 → 0.92 — and no world may
  go degenerate). Retaining the artifact to keep the number would have been
  target-fitting of the purest kind: preserving a bug because it makes a metric look
  right.
  **Two more pins rested on the same artifact**, and both are now reported with their
  evidence rather than asserted. B3's "migration favours winners in the median world"
  reads **−0.111 on main** once restricted to continuously inhabited ground, against
  the +0.248 it published — the positive result came entirely from cells that emptied
  and came back, whose population delta is abandonment, not migration (filed as #186;
  the mirror never excluded them because the engine resets a reborn cell's
  `event_type` to `"none"`). And the blight leg of the disease-burden emergence check
  is re-pinned 0.3 → 0.15: when blight was rebuilt each epoch from the works running
  *now*, it and disease burden were near-duplicate readings of one instantaneous
  quantity, which is why the partial correlation was 0.85. Under contaminant
  persistence they legitimately come apart (0.23). Sweeping the `burdenEnv`
  coefficient does move it (0.115 → 0.40 lifts the partial to 0.67) and it was
  deliberately **not** touched: it sits where the stated conversion rule put it, and
  moving it to recover a number a memoryless field manufactured would be fitting the
  artifact.
  **One threshold was genuinely mis-converted, and that was a real regression.** The
  plague gate had been transplanted rather than re-derived: `blight >= 85` used to mean
  "within 15% of this world's worst cell" and now means "85% of ruined", so it
  collapsed onto the sacrifice zone — which silently disabled the whole wound-response
  system, because a plague in the written-off zone deliberately does not set
  `firstWoundEpoch`. Consecrations fell 11/20 → 2/20 and the seat's reforms 17/20 →
  11/20 while nobody had changed either mechanism. Re-derived to **70**, the value that
  preserves the mechanism's incidence on inhabited ground (47 plagues, 36 outside the
  zone, against main's 40 and 34), and which lands just above the ruin knee at 60 so a
  plague strikes ground that has crossed into ruin rather than answering to a second
  unrelated number.
  **Four stale mirrors, all of the same family**, surfaced because an absolute field
  lets the sacrifice zone saturate while it still holds people. The listening-seat
  check counted a zone plague as a wound the seat should answer (the engine excludes
  it by design; the mirror was wrong on main too, 9/10 there against 9/9 corrected).
  The consecration check counted wounds the Temple *cannot* answer — zone plagues, and
  relic calamities, which strike sanctuaries by construction while the Temple declines
  ground that is already holy; corrected, the check gets much **stronger** and the
  engines agree, main 15/16 (94%) and #180 8/9 (89%) against a 50% floor. The policy-gap
  check read `findings.blight_ratio`, whose "poorest fifth" is 89-100% uninhabited
  ground exporting wealth exactly 0; measured on the people it is about, #180 scores
  **6/6** where main scores 5/6 — the tell that this is precision and not convenience
  is that it makes the incumbent look worse. And the migration mirror above.
  **Three exhibits re-pinned**, conditions unchanged, each re-scanned so the world is
  representative and not lucky: the toll-heavy realm am-52 → am-19 (10 of 60 seeds
  satisfy it), the granary's crisis arm le-5 → le-8 (4 of 40), the creditor imposition
  le-7 → le-14 (5 of 40, all five narrated). Capital flight stopped being read off a
  24-world lottery that fired **once** on main and zero times here, and is now proved
  on an ore-heavy realm where the retention act actually fires — on both engines.
  **What #180 does NOT unblock.** Its own sequencing assumed a flat field was why
  #168's `^1.5` siting exponent could not work. Measured with a real inhabited gradient
  in place, `^1.5` still fails the both-signs gate and still makes the correlation
  worse (`^6` +0.103, `^3` +0.409, `^1.5` +0.583, no negative worlds). #168 should stop
  being framed as blocked on this.
  **In the atlas**, regenerated over the same 80 worlds: the upper-half rank-size fit
  moves 1.42 → 0.67 (the recorded miss), urban primacy's maximum falls 16.9× → 3.6×
  (with no churn, no single town runs away from the field), events per run 57 → 40, the
  within-place share of person inequality 56% → 46%, and the all-regions
  `corr(blight, wealth)` median −0.15 → +0.03. `tools/atlas.mjs` also stopped
  hardcoding the schema version in its own header, which is why it had been announcing
  v54 through this very bump.
  **The honest route back to a tail**, filed as #185 rather than built here to hit a
  number: **first-time foundings are 0.0 per world**, on main and under #180 alike.
  Every "new town" this engine has produced is a resettlement; the frontier path
  (`livability >= 45 && a settled neighbour`) has never once fired on ground that never
  held a town, because the founding pass already settles everything above the bar.
- **the ordinary channel becomes r − g** (issue #166, R3; no schema change, but all 30
  golden cells moved and the atlas was regenerated). The owners' row used to move by an
  additive pile: common events incremented it (+12 a company town, +5 a war, +4 an
  occupation, +3 a new holder, +3 the works' factors) while the ordinary *decrements*
  were threshold-gated — the competition term only bit once the share already exceeded
  33 — or shunted onto the catastrophe ledger. That is a hardcoded moral sign in a model
  whose stated principles forbid one. It is now Piketty's own dynamic,
  `dS = k·(r − g)·S·(1 − S)`: `r` is what the owners' stock earns (held gates, works,
  live seams, the sky lanes, B2's placements net of busts), `g` is per-capita growth
  **plus** the old competition and boom-churn terms folded in and no longer gated on any
  threshold, and `S(1 − S)` is what keeps a share a share, so the 8/92 clamp is a guard
  rather than the mechanism. War and occupation moved onto the Scheidel shock ledger
  beside expropriation, where #166 puts them.
  **The result, measured** (24 worlds, `rg-*`, `regions=12`, `ep=10`, 195 settled
  regions): stagnant ground deepens the owners' row **+7.74** while booming ground
  **thins** it **−0.30**, and 36 of 65 booming regions compress with no event at all.
  Before the change the same comparison ran **backwards** — −3.57 against +2.19 — because
  the row simply tracked the wealth swing, so a boom concentrated and a bust compressed,
  which is the opposite of the mechanism the docs claimed. It replicates on an
  independent sweep (`atlas-*`, `regions=24`): +4.32 against +1.61, 41% of booming
  regions compressing. Three checks now hold the three targets `tools/targets.mjs`
  pre-registered for this (`ordinary_two_signed`, `upward_mode_absent_shocks`,
  `catastrophic_leveling_discrete`); **two of the three did not hold before**.
  **Two things the calibration turned up.** First, the constant `k` is not free to be
  chosen for effect: the pre-registered targets **bracket it from opposite sides**.
  Below 0.6 the no-shock median sits at 0 — a coin flip, not the upward mode
  `upward_mode_absent_shocks` asks for; above it the drift starts swamping the discrete
  ledger and starving the compressing half. 0.6 is the smallest value clearing all
  three, and no target was moved to meet it. Second, **removing #93's direct capture
  term made the model worse, not purer.** It looks like the authored ratchet, and the
  obvious tidy is to delete it as double-counting the swing that `g` already carries —
  but measured at the shipped `k`, dropping it cuts booming-region compression from
  **55% to 32%** (41% to 25% on the wider `atlas-*` sweep), because without it `r` beats
  `g` almost everywhere in a realm this poorly connected. It was kept, and the reason is
  now in the code rather than in a guess.
  **One divergence from the issue's own wording**, kept deliberately: #166 files war
  among the "levelings", and here war **concentrates** (+5, property surviving people).
  Scheidel's levelling war is *mass-mobilization* war; this engine's war is a dynastic
  border war, which historically consolidated surviving property claims rather than
  levelling them. It went on the ledger with its sign as the engine has it, not flipped
  to match a label.
  **A calibration error worth recording**, since the formula reads as if it could not
  have one: the first cut divided elite-share **points** by 100 on one side of the
  comparison and left a rate on the other, so `r ≈ 0.006` met a `g` swinging to −0.29
  and `(r − g)` was simply `−g`. Every region whose wealth fell concentrated violently
  and the row ran straight to its clamp. Both sides are per-epoch rates now, and `g`'s
  per-capita term is clamped to ±0.15 so a collapse cannot enter the ordinary channel
  and be counted a second time against the shock ledger.
  **What it cost, recorded rather than tuned away.** Because `r` outrunning `g` is the
  ordinary case, the whole ordinary channel sits slightly higher, and B5's older claim
  that the owners' row falls with no fire at all got rarer: `elite_ordinary_mean` reads
  negative in **3 of 24** `eo-*` worlds where #127 measured 6. That is *exactly* the
  suite's pin — the claim survives with no headroom left. The pin was **not** relaxed to
  restore margin; it is annotated in `tools/test.mjs` so a later change here has to
  re-measure. The `eo-2` exhibit did move, to `eo-19`: under the new form eo-2 reads
  +4.5 ordinary against +1.3 total and would have illustrated the opposite of the claim.
  Re-picking an illustration is legitimate where the sweep establishes the claim
  independently; relaxing the sweep's own pin would not be.
  **No pre-registered target moved out of range.** Same probe over the same 20-world
  `atlas-*` sweep, before and after: the upper-half rank-size α median held at **1.255**
  (band [1.2, 1.8]), `blight_wealth_corr` moved +0.508 → **+0.510**, between-place gini
  held at **0.310**, and the resource-curse share held at 16 of 20 worlds (on a coarse
  median-split reading, looser than §1's populated-quadrant count and quoted only
  because it is *unmoved*, not for its level). The owners'
  row itself sits about four points higher at every quantile — elite share p10/median/p90
  went 14/24/45 to **19/28/48** — which is the direct consequence of
  `upward_mode_absent_shocks`: `r` outrunning `g` is the ordinary case, and `S(1 − S)`
  stalls the drift near the bounds, so fewer regions ride the floor. There is no
  pre-registered target on the *level* of the elite share, only on its dynamics, so this
  is reported rather than corrected. All 30 golden cells moved (63 of 90 artifacts) and
  `docs/atlas.md` was regenerated: the owners' median share of all coin went 44.2% to
  46.7%, and the median world's region map is now blind to 56% of person-level
  inequality rather than 54%.
- **suite audit: 284 assertions that could not fail** (no schema change, no engine change).
  Prompted by R1 (#164) turning up a third stale test mirror in one session. The audit
  found something worse than drift: `tools/test.mjs` carried a **1138-line `validate()`
  with 284 assertions and no call site anywhere**. Not exported, not imported, not
  referenced, only three comments elsewhere in the file claiming it ran. It had been
  inert long enough to rot: its fertility mirror still carried the pre-`5beea32`
  coefficients (`0.56/0.30/0.10`, no biome term) and its biome rule still opened forest
  at rainfall 68 rather than 48. Nothing failed, because nothing ran. Of its 270
  distinct checks, **263 were already enforced** by the live `validate()` in
  `stress.mjs`; the four that were not have been moved there. **Two of those four were
  wrong as written** and failed on the current engine: the market-access check demanded
  a maximum of exactly 100 and broke on degenerate worlds where every access is zeroed
  by the dead-zone pass (an allowance the `delver_flux` check beside it already makes),
  and the consecration check re-derived "the first wound" as the earliest plague or
  calamity in the event list while the engine deliberately **skips a wound in the
  sacrifice zone** when choosing which one the Temple answers. So the dead code was not
  merely unused, it was incorrect, and resurrecting it naively would have produced false
  failures on 5 of 120 configs. It was rescued rather than copied: the consecration
  claim now checks only what holds without guessing the engine's selection rule, that a
  consecration lands on wounded ground two epochs after the wound there. The dead helper
  `batchN()` went too. **A guard against recurrence:** the suite now audits itself, and
  fails if any top-level function across the eleven tool files is unreferenced anywhere
  in the corpus, because the worst failure mode in a test suite is not a wrong assertion
  but one that cannot fail. Main goes 334 checks to 335; stress keeps its coverage and
  gains four checks it never had.
- **Solow-form production scaling** (issue #164, R1, no schema change): the artifice
  multiplier in `income()` was `0.3 + A/100`, a linear form with no cited basis that
  paid a constant marginal return to industry forever and punished a crash far harder
  than any production function of its kind. It is now `(A/70)^0.35`: artifice read as
  capital-intensity in a Solow frame (Solow 1956), with the exponent set to the
  conventional capital share of about a third (Cobb and Douglas 1928; Gollin 2002),
  normalised at the founding mean of 70 so founding wealth barely moves. Diminishing
  returns at last: 1.13 at full artifice against the old 1.30, and gentler where it
  matters. One correction to the issue's own framing while landing it: the "70%
  collapse" it cites is the worst case at A = 0, which the engine never reaches.
  Measured over 214 settled regions across 12 worlds, artifice never fell below **23**,
  where the honest comparison is a 47% income cut under the old form against **32%**
  under the new one. **No pre-registered target moved out of range**: rank-size
  upper-half median 1.44 to 1.58 (band [1.2, 1.8]), resource-curse share unchanged at
  8 of 20 worlds, median elite share 25 to 24. `blight_wealth_corr` drifted +0.481 to
  +0.519, further from its declared negative mode, which is recorded in
  `docs/grounding.md` rather than tuned away since that target is already documented as
  missed and carries no numeric band. **One acceptance test was re-derived, not
  re-pinned.** The migration check hand-copied the engine's old attractiveness sum
  (`0.5*wealth + 25*on_grid + 0.25*(100-blight)`), which R2 had already replaced with
  Harris-Todaro expected income, so it was measuring a formula the engine no longer
  used and sat close enough to zero (+0.085) that this change tipped it negative. Rather
  than copy the new formula in and plant a third stale mirror, the claim now runs
  against an **observable**: did people move toward ground that was already rich at the
  founding? `wealth_t0` is fixed before any epoch migration, so it cannot be circular
  with the population change it is measured against, and it needs no maintenance the
  next time attractiveness changes. Measured median +0.29 before this change and +0.15
  after, with 71% and 76% of worlds positive. **Declared fixture regeneration**: 75 of
  90 files across 30 cells. `schema_version` stays 54.
- **the differential exit** (issue #178, no schema change): the environmental-justice
  mechanism that was missing under R5. Post-siting sorting, "coming to the nuisance"
  (Banzhaf and Walsh 2008; Banzhaf, Ma and Timmins 2019): along the road edges migration
  already walks, and against the previous epoch's blight field, the propertied stratum of
  the dirtier end relocates toward the cleaner end at 1.73 times labour's rate, and the
  coin walks with them. A blighted town keeps its heads and loses its money, so its mean
  income falls by an accounting identity rather than by a hand aiming spoil at the poor.
  The one-epoch lag is the correctness condition, not an oversight: sorting answers poison
  already on the ground. It is built not to be a dial, the two relocation rates are derived
  so their head-weighted mean is exactly `SORT_CHURN * gap`, meaning the realm gains **no
  net aversion to blight**, only a split in who acts on it; set the willingness-to-pay
  ratio to 1 and the block is a no-op by construction. It never reads the doctrine knob, so
  under *disperse* the spoil lands around the rich works and the identical code drains
  **their** coin, and a town whose blight falls receives coin and gentrifies.
  **The rate was set by what it must not break, and the gap between that and what it moves
  is the finding.** This channel redistributes wealth along blight gradients, an axis
  orthogonal to the ones other claims measure, so every increment of it erodes them. Two
  bind. "Water access tracks prosperity" passes 13 of 20 worlds on a floor of 12, one world
  of headroom (0.03 keeps 12, 0.05 keeps 12, 0.10 gives 11, 0.30 gives 10). "The toll wounds
  the taxed road" has real margin at baseline, -0.095 against a floor of -0.03, and erodes
  monotonically: -0.041 at 0.03, **-0.019 and failing at 0.05**. The toll check binds first,
  so **0.03** is the ceiling. At 0.03 the mechanism is close to inert on the very number it
  exists to move: `corr(blight, wealth)` median +0.458 to +0.432, negative worlds 3 of 24,
  unchanged from baseline. That is reported rather than dressed up. Realm median
  `elite_share` holds at 25 to 23 (a rejected variant that wrote `elite_share` directly
  ratcheted it to 50 through the B2 investment loop), and replay stays byte-identical.
  The alternative was to re-pin the toll floor so a stronger rate would fit, which is the
  one move this repo's discipline forbids: a pin set by observing output can never fail.
  **R5's exponent change did not land, and the measurement is why.** Dropping the siting
  weight to `^1.5` breaks the water claim on its own (11 of 20 at zero churn, before this
  mechanism exists) and needs churn at or above 0.10 to hold the both-signs gate, which
  breaks water further to 10. No configuration satisfies both, so the `^6` exponent stays
  and #168 remains open with the evidence attached. `schema_version` stays 54. **Declared
  fixture regeneration**, 53 of 90 files across 30 cells, because the model moved.
- **the rank-size claim comes clean** (issues #167 R4 and #169 R7, no schema change):
  the app used to announce "a rank-size law **no one decreed**", which was false on
  its own terms. The founding centuries grow every town by proportional random
  increments, which is Gibrat's rule, and that rule produces a size law by
  construction. The panel now says so, and claims only what is actually contingent:
  **the steepness**, reported as the upper-half slope with the whole-system slope
  beside it. **R4 needed no retune, because the miss was a metric mismatch.**
  `tools/targets.mjs` pre-registered its metric precisely, the sweep median of the
  **upper-half fit**, band [1.2, 1.8]; the number everyone was quoting (median 2.31)
  was the **whole-system fit**, which includes the hamlets that deviate from the tail
  and therefore runs steeper. On the declared metric the engine already lands inside
  the declared band (1.44 over 60 worlds, 1.65 over 120, 1.60 over the atlas sweep).
  Retuning the growth-shock variance would have been tuning the model to fix a
  reading error, so the band was left exactly as declared, nothing was re-aimed, and
  the resolution is written up in `docs/grounding.md` §4 with both exponents
  tabulated. The suite now tests the pre-registered metric against
  `targets.mjs` directly rather than a hand-set window, and the atlas prints both
  fits so they cannot be confused again. Two more honesty fixes ship with it: the
  chronicle close conceded authorship (**"no villain in the record"** under **"rules
  an author chose"**, replacing "no villain wrote it" after "None of it was
  decreed"), and the Moran paragraph now states that the terrain is laid down with
  smoothing kernels, so neighbouring cells resemble each other **by construction**
  and some spatial correlation is guaranteed before any economy runs. **Declared
  fixture regeneration**, chronicle only: all 30 `chronicle.md` cells moved and
  **0 `world.geojson` / 0 `events.csv`**, confirming prose-only change with no model
  drift. `schema_version` stays 54.
- **the stress suite comes back** (issue #175, no schema change): `tools/stress.mjs`
  had been failing on `main` and nobody could see it, because CI ran only `npm test`
  and never the stress sweep. Every failure was the test's **recompute mirror going
  stale against a deliberate engine change**, not a model regression, and all of them
  trace to two commits that landed while the sweep was unwatched. `5beea32` (biome
  habitability, contour coastlines) changed **fertility**, which is now
  `0.48·rain + 0.26·temp + 0.08·water + 0.12·biome habitability` where the mirror
  still computed the old three-term `0.56/0.30/0.10`, and changed **coastal
  detection**, where the engine counts a cell as coastal if any ring vertex lies
  within ~1.5 grid cells of the smooth sea contour and the mirror still required the
  polygons to actually overlap. `f47600e` lowered the **forest threshold** from
  rainfall 68 to 48 and the mirror kept the old bar. The mirror now matches the
  engine on all three. One more failure was the **SVG glyph census** counting every
  `<circle>` that was not a gate ring, so the freeport's anchor ring read as a
  settlement dot; settlement dots now carry `class="settle"` and the census counts
  that, which also makes the pin immune to the decorative rings around decayed
  crossings and the selection halo. That check was a single sixteen-way `&&` whose
  failure message printed only half the counts, so it is now checked one layer at a
  time and names the layer that broke. **`npm run stress` runs in CI on every push**,
  so the sweep cannot rot silently again. Worth knowing for the next person: the
  per-config validator returns on its first failure, so a broken invariant masks
  every later one behind it (the coastal breakage only surfaced once fertility was
  fixed). One check was not a stale mirror but a **wrong claim**: the validator
  demanded `corr(centrality, wealth) >= 0.1` in **every** world, which is the
  sign-locked assumption the instrument pivot exists to remove, since a frontier
  boom or a gutted core is allowed to invert one world's gradient. Measured across
  the sweep the pull is strong and consistent (median **0.73**, q25 0.60, **93 of 94
  worlds positive**, worst -0.21), so the claim now runs on the **distribution**
  after the sweep (median floor 0.45, positive-share floor 85%, with a
  sample-count floor so it cannot pass vacuously) instead of world by world. The
  controlled versions of the same claim already existed in the Phase 2 block
  (`gradient=0` / `gradient=100`) and are untouched. Thresholds were set from the
  measured distribution, not from what made the suite green. No engine change, no
  fixture movement.
- **the build seam** (issues #172 and #173, no schema change): two pieces of tooling
  debt that had already cost real CI time. **One hash parser.** The URL-hash reader
  was hand-rolled twice, once in `src/app.mjs` (`readHash`) and once in
  `tools/lib.mjs` (`genEngine`), and the copies had drifted: different clamps (relax
  8 vs 20, ep 24 vs 99), no rounding on the tooling side (a fractional `regions=14.7`
  stayed fractional instead of rounding to 15), an unclamped `bias`, and a manual
  `split()` that never URL-decoded a value, so a percent-encoded seed built a
  different world in the tools than in the browser. Both now call
  `engine.parseHash`, with the **app's reading canonical**: a hash is a shareable
  link, so whatever a URL does in the browser is what the tools must reproduce. The
  parser lives in the engine, which both sides already import and the bundler already
  inlines, so no build change was needed. **A guarded bundler.** `tools/bundle.mjs`
  slices source on marker strings; a renamed marker, a duplicated header, or a
  missing script tag used to change what shipped in silence. Every cut is now
  checked: each marker must appear exactly once, each tag replacement must actually
  fire, no `import`/`export` may survive into the classic-script body, and the
  assembled script must parse before it is written. `buildBundle()` is exported so
  the suite can rebuild in memory. **A freshness pin.** Pages deploys `src/` while
  the suite reads the bundled `index.html`, so a stale bundle meant the tests were
  checking code the live site never ran; the suite now fails if `index.html` differs
  from a fresh bundle of `src/`. Acceptance tests: the bundle-freshness pin, and an
  app-versus-tooling parity battery over eight hashes, every one a case where the two
  parsers used to disagree (three of them world-visible: the ep cap, the fractional
  region count, and the percent-encoded seed). No model change, no fixture movement.
- **honesty pass** (owner-directed, 2026-07, docs only, no schema change): the repo
  stops borrowing empirical authority. New docs/provenance.md (what this project is:
  AI-generated by a single author, a fiction generator and teaching instrument, not
  peer-reviewed, not validated; every "measurement" an internal consistency check on
  self-generated data) and docs/grounding.md (every mechanism mapped to the real,
  cited literature it draws on, ~50 references, each web-verified with a tested
  open-access link, divergences stated). The "expert panel" of attribute-model.md was
  AI-authored writing personas and is now labeled as such, each lens anchored to real
  literature. "Calibrated to measurement after implementation" is renamed what it is
  (a regression tripwire, not validation); the falsifiability vocabulary becomes
  sign-reach (internal checks on generated output); the verdict-diversity floor is
  retired as an acceptance target (a designed property was being reported as a
  discovery); the geology-independence claim now states the shared elevation
  ancestor; this file and direction.md were rewritten in place, wording only, every
  date, number, and schema fact preserved (a numeric-token frequency diff against the
  pre-rewrite file is empty). Pre-registered calibration targets land in
  tools/targets.mjs, declared from literature BEFORE any tuning; the engine changes
  they govern are deferred and tracked as issues #164-#169 (Solow production scaling,
  Harris-Todaro migration, two-signed r−g elite drift, city-tail retune + rank-size
  claim fix, blight exposure gradient, generated-prose honesty fixes). No export
  column, no generated byte, and no fixture moved in this pass.
- **generation variety** (owner-directed, no schema change): a wider range of names and
  more options in every fixed pool. The Markov name corpus grew from 292 to 612 seeds
  (lowland, frontier, and temple to 100 each; corporate 84; precinct, gazette, and
  chthonic 76), so the seven registers walk a much larger name space. The toponym grammar
  `PLACE_PARTS` went from 22 patterns to 62, with new forms per terrain (coves, points,
  bights, cairns, scars, groves, mires, and more), and `SUFFIXY` extended to guard the new
  fused endings. Sea names draw from expanded pools (Reach, Main, Waters, Expanse, Sound,
  Bight, Firth, Bay of X). The land kinds gained deterministic bands: ridges now read
  Teeth / Crest / Spine / Range / Wall / Ridge / Hills, passes Stair / Steps / Pass /
  Saddle / Gap, rivers Rill / Beck / Brook / River / Water, each still recomputable from
  measured terrain. Town bynames grew from 9 to 16 (added: the Tithed, the Kindled, the
  Waning, the Lofted, the Shadowed, the Open, the Steadfast), each derived from an exported
  column. Off-map powers went from 7 to 18. Era names became pools of four per character
  (20 total). Every chronicle event phrasing that had two variants now has five (refinery
  collapse and founding, plague, relic, ore strike, seizure), and the plague disease-name
  pools grew. All new prose keeps the plain register and holds the no-em-dash rule; new
  names avoid the banned real-world and medieval lexicons. `schema_version` stays 54; the
  columns and enum data-keys are unchanged. **Declared fixture regeneration** (all 30
  cells, all three surfaces: names, event names, and chronicle all moved). Test mirrors
  updated in lockstep for the ridge, pass, and river kinds, the sea forms, the epithet
  ladder, the disease pools, the seizure narration, and the stress name and pass-name
  validators.
- **tone pass** (owner-directed, no schema change): the whole app moved to a plain,
  message-first voice. The old register leaned medieval and strung words together in a
  way that buried the point: aphorisms, inverted clever bits, grand abstractions,
  editorial asides. Those are gone. The chronicle, the findings panel, the inspector,
  the HUD, the hints, the lens labels, the title and colophon, and the reader-facing docs
  (README, field guide, attribute model, old thesis, atlas, QGIS bundle) all say what
  happened in short, plain sentences. The setting texture stays (aetherworks, grid,
  Concordat, Dominion, tariffs, gates), stated plainly, not stripped to generic. **Hard
  rule: no em dashes anywhere.** Every em dash in the app, the docs, and the tooling was
  restructured into a period, a comma, or two sentences, never swapped for a hyphen. A
  committed grep test now fails the build if an em dash appears in the rendered chronicle,
  findings, report, or info across the seed sweep. `schema_version` stays 54; the export
  columns, event data-keys, and QGIS styles are untouched. **Declared fixture
  regeneration** (all 30 cells; only `chronicle.md` moved, the GeoJSON and `events.csv`
  are byte-identical). Roughly 20 chronicle and findings phrase assertions re-pinned to
  the new prose.
- **v54** (the re-skin C1): out of the shire, into the arcane-industrial state (issue
  #134, §2 + §8 decision 1, the setting pivot). A **clean versioned break**: the export
  vocabulary renames once, no alias columns, and old exports stay readable under their old
  `schema_version`. Column renames: `on_conduit`→`on_grid`, `conduit_access`→`grid_access`,
  `seat_cost_ground/sky`→`capital_cost_ground/sky`, `centrality_to_seat`→
  `centrality_to_capital`, `refining_capacity`→`aetherworks_capacity`, `toll_burden`→
  `tariff_burden`, `wardline_strength`→`constabulary_strength`. Feature kinds: `conduit`→
  `grid`, `garrison`→`constabulary`. Settlement tiers: `prime/hub/outpost/holdfast`→
  `metropolis/city/works-town/frontier-post`. And every USER-FACING string moves to the new
  register: the seat becomes **the capital**, the works/refinery the **aetherworks**, tolls
  **tariffs**, the conduit the **grid**, the garrison the **constabulary**. Internal identifiers
  and enum DATA-keys (event types `refinery_collapse`, era `conduit_boom`, measures
  `toll_amnesty`) stay stable. The data is the anchor, the presentation is the skin, so the
  readout renders them in the new register (a display-label map) while the columns keep their
  meaning. The QGIS `.qml` styles need **no change** (they bind only non-renamed fields). New
  **name registers** extend the Markov corpus: **corporate** (the exchanges), **precinct** (the
  administration), **gazette** (the record/press), and **chthonic** (the old faith beneath the
  city), surfaced as an `institutions` provenance block (exchange / gazette / precinct / buried
  power), deterministic per seed and novel-walked. `schema_version` 53→54; **declared fixture
  regeneration** (all 30 cells). Acceptance tests: the new registers produce plausible NOVEL
  names across 10 seeds; and a committed **grep test** confirms no medieval vocabulary (seat /
  toll / conduit / garrison / wardline / refinery / holdfast / the works) survives in the
  rendered record, readout, or findings across a sweep. Two death-toll lines reworded off the
  word "toll" so the invariant can forbid it outright.
- **v53** (imperial reach B11): the empire mostly never comes, it buys (issue #133,
  §3.6, the Phase B capstone). The Dominion was a Viking: it lands, it takes tribute.
  Real contemporary empire works by **REACH**, and the fleet is the rare exception.
  B11 mechanizes one empire pressing on the coast through three channels struck each
  epoch BEFORE income: **CONCESSIONS**, the Metropole's **attention**, keyed to a
  region's **remaining ore** (`attention × sea-reach × E`), courts a rich coast; when
  it crosses the bar a concession opens: foreign capital **owns the works** (`retention`
  becomes a **foreign claim**: half the ore-yield repatriates, the dependency-theory
  column applied one level up), the coast is force-wired, and **development capital**
  flows in while the ore is wanted. As the lode draws down (or attention turns) the
  concession is **wound up**: the markets leave (**ruin**) and the levies stop
  (**freedom**): the *courted → developed → squeezed → abandoned* arc, generated from
  the depleting ore alone. **EMBARGO**: a hostile world regime (`trade_war`) shuts the
  sea lanes, so an exposed coast loses its trade pole for the epoch and the second pole
  **busts**. **THE LIMIT CASE**: the Dominion's landing is demoted (the coin cut from a
  half to a third): the empire mostly judges reach enough and sends factors, not a
  garrison; annexation is now the exception, not the rule. A named **RIVAL** rides the
  regime chain, the gazette ("the powers" row), and a **courting** diplomacy event:
  the second power, with no reach machinery of its own. And the de-moralized **VERDICT
  CLASS** ships: §3.5's **gap × floor**, qualified by realm **growth** (boom/stagnant/
  collapse): a class per world in `findings.verdict`. New columns: `concession`,
  `concession_epoch`, `foreign_claim`, `concession_ended`, `concession_ended_epoch`
  per region; `powers` (metropole/rival/counts) in provenance; `findings.verdict` and
  `findings.concessions`. `schema_version` 52→53; **declared fixture regeneration**.
  Exhibits (pinned): **the concession**, `#seed=ir-0&regions=24&ep=10`: a coast the
  Metropole developed to wealth **70** against the realm's median **14**, and keeps
  **half** of what its own ground yields, richer, and owned. **The abandonment arc**,
  `#seed=ir-7&regions=24&ep=10`: a concession opened in 1025 and wound up in 1250, the
  attention leaving with the ore, narrated end to end. **ATLAS REGENERATION** (§3.5
  verdict diversity, the §7.3 pin): across the 80-world sweep the possibility space
  stays open: **≥6 §3.5 classes present, none over 40%** (measured 12–13 classes,
  ~23–25% max), so no templated verdict owns the world. Downstream re-pin (§2.5, the
  landing demoted): the Dominion X1 arrival band relaxed `25–75% → 10–55%` (measured
  25% on the design sweep, down from ~48%); the reach events (concession/abandonment/
  embargo/courting) are world-scale, located at a coast but not a region's headline
  `event_type`, so the event-column invariant excludes them.
- **v52** (the mix pulls apart B10): a second pole, two knobs retired (issue #132,
  §3.3 decisions 4). The income mix promised four levers and delivered a
  re-parameterization: trade and legacy both peaked at the seat, so the four weights
  moved the same relation. B10 **de-collinearizes** the mix: the four terms now anchor
  to DIFFERENT geography: **extraction** to the seams (ore stock), **artifice** to `A`
  (trained capacity, strongest at the works), **legacy** to the authored gradient (the
  seat), and **trade** re-anchors to the **COAST**: `sea_access`, gated by a new
  **`openness`** knob and scaled by the world's **foreign demand**, priced against
  seat-centrality. So a trade-heavy, open, demand-favoured coast grows a **SECOND POLE**
  that RIVALS the capital instead of feeding it: across a 24-world `tp-*` trade sweep,
  the largest city is a coast, not the seat, in **16/24** worlds. Observed in the sweep, each weight
  now makes its OWN anchor the strongest predictor of wealth (trade→sea corr 0.91 vs
  legacy's 0.57; legacy→seat centrality 0.81 vs trade's 0.65; artifice→A 0.84 vs
  extraction's 0.51): the four ratios move relations in **distinguishable directions**
  (the §7.2 mix-reach acceptance). **Two knobs retire for two added** (the panel stays
  flat: `order` landed in B9, `openness` here): **`hb`** (harbors) folds into `openness`:
  its sealed end (openness 0) IS the old closed harbor, and old `hb=0` links map
  forward; **`bias`** folds into the legacy gradient's definition (parse-only, so old
  `bias=` links keep meaning). New `openness` provenance field + slider; `bias`/`hb`
  sliders removed; `schema_version` 51→52; declared fixture regeneration. Exhibit
  (pinned): **the second pole**, `#seed=tp-0&regions=24&ep=10&wt=80&we=8&wf=6&wg=6`:
  a coastal city out-grew the seat many times over, a trade republic that never asked
  the capital's leave. Downstream re-pins (§2.5, the mix moved the worlds): the crushed-
  revolt expropriation pin relaxed `=== -> >= seen-1` (a poor coast-less town's ordinary
  erosion can trim the garrison's +10 below the +5 bar); the B7 amnesty→decay density
  threshold eased (`ceil.6 -> floor.5`); the B6 toll-heavy exhibit moved am-8 -> am-23
  and the B8 starved-chronicle exhibit ris-1 -> ris-6 (the shifted worlds); the stress
  settlement-pop floor eased 25 -> 20 (the epoch floor, which an out-competed inland town
  can now reach). Primacy, zipf, the H1 class band, and the golden fixtures held.
- **v51** (the order axis B9): safety and stagnation share a root (issue #131, §3.2
  policing row + §3.3 order knob). A new knob, **`order`** (0 **open** ↔ 100 **police
  state**; **50 = neutral, the old world**). High order **STILLS** the shadow and the
  street: predation (the constabulary's `force_projection` stiffens realm-wide, ±30
  off the midpoint), smuggling, and revolt (the bar to rise climbs). **AND STILLS the
  ladder**: mobility freezes, the appetite to **risk capital** dampens (the B2 invest
  pool shrinks, so the works grow slower), and elite churn locks. Safety and stagnation
  are the two edges of the one root: a police state is stable and can **stagnate**; an
  open realm is dynamic and **dangerous**. The axis **retires B5's raw `occupied` churn
  proxy**: churn now freezes with the **order LEVEL**, of which occupation is a local
  **+50** (so an occupied region at the default order still reads order_level 100 and
  fully freezes, byte-identical to B5; a global police state freezes everyone; an open
  realm churns harder). Because every wiring is **scaled off the midpoint**, `order=50`
  is a **no-op**: the default realm is untouched to the byte (only the new `order`
  provenance field and `order_level` column move; events and chronicle are identical),
  and every existing pin holds. The knob's **reach shows at the extremes**: the §7.2
  knob-reach acceptance: `order`'s extremes change a **relation**, not just a magnitude.
  New `order_level` region column (realm order + occupation's local police state) and
  the **order/liberty lens** (A3 family); a UI slider; `schema_version` 50→51; declared
  fixture regeneration (30/90, only the geojson, since the dynamics are unmoved at the
  default). Measured (16-world `ord-*` sweep, order 0 vs 100): the police state runs
  **safer** (predation lower in ~16/16 worlds) and **more stagnant** (mobility lower in
  ~16/16): the two edges move together. Exhibits (pinned): **the police state stagnates**,
  in 12/16 seeds the OPEN realm (order 0) out-grew and out-mobilized the same world
  under a police state (order 100), e.g. `#seed=ord-1&regions=24&ep=10&order=0` vs
  `&order=100`; **the open ground is eaten**, `#seed=ord-2&...&order=0` carries a region
  whose predation the police state would have cut by 15+, liberty's price the unguarded
  road.
- **v50** (after the rising B8): liberation is a distribution, not a verdict
  (issue #130, §3.2 revolts row). A won rising used to resolve to a single verdict:
  the town goes Free, keeps what it makes, its charters burn. B8 makes the **won
  outcome a DISTRIBUTION** that forks against the freed town's **own fundamentals**:
  a town of **suppressed potential**, real artifice, an economic base the tolls and
  the charter throttled, a reach held down, **BOOMS** when the manor burns (its `A`
  and population surge, people flock to the Free town from the tolled country around
  it); a town **propped up** by the magnates' capital and the garrison's order
  **STARVES** when both flee (the works go dark, the skilled leave, `A` and population
  fall). World noise so two towns of the same fundamentals can still fork (the §3.5
  verdict). Crushed and averted arms are unchanged. New `arc` on the won revolt event
  (`flourished` | `starved`) and a `won_arc` region column; the **consumers learn both
  arcs**: the chronicle narrates the Free that flourished vs the Free that starved,
  the epithet forks (`the Free` / `the Famished`), and the turning-point prose closes
  on which fate the rising bought. The **retention act's** old sibling, the freed
  town, now has its own two-sided story. Measured across a 40-world `ris-*` sweep:
  13 risings flourished, 21 starved, both present at frequency (pinned floor). The
  arc is no label: the freed town's artifice ends a median 57 where it flourished and
  24 where it starved. `schema_version` 49→50; `won_arc` reset at the founding for
  stage-3 purity; declared fixture regeneration. The G5 revolt-consumer consistency
  audit (crushedIdx, epithets, turning prose) re-audited for the two new won-arms.
- **v49** (reform long edges B7): every mercy can curdle, every levy can build
  (issue #129, §3.2 reforms row + §3.6 debt conditionality). Under V1 a reform just
  damped a term and only the granary moved coin down. B7 gives **every measure a
  LONG EDGE**: delayed and state-contingent (P4: time + the state it lands in):
  the **grid charter** is strung on an imperial loan the seat services out of its
  treasury for the rest of the run (`charter_debt` / `debt_service`); the **granary**,
  run on through a **sustained peace** (3+ quiet epochs), breeds `granary_dependency`
  and a `granary_drain` on the treasury with no famine to justify it; the **retention
  act** (an ore price floor) frightens elite capital into `capital_flight`, thinning
  the owners' row and the artifice it funded; the **toll amnesty** rots the bridges
  (the B6 decay arc). And `iq` becomes a **posture**: when a **deaf seat** (low iq)
  stays silent while the world's **doctrine presses** (`doctrine_pressure` from the
  world series), its **creditors DEMAND a measure** the realm did not choose:
  structural adjustment (see docs/grounding.md), a reform **imposed from outside**, a new event class
  (`imposition`, `imposed_by: creditors`) distinct from the seat's iq-chosen mercies;
  the chronicle names it a decree written in another capital. The **retention act is
  now reachable**: it reads the realm's richest ore *seam* (a concentrated resource
  a price floor can protect) rather than its ore-poor bottom half, so a resource-rich
  unequal realm can floor the price instead of importing bread. New `reform_edges`
  block in provenance (charter_debt, debt_service, granary_dependency, granary_drain,
  capital_flight, impositions); `schema_version` 48→49; declared fixture regeneration.
  This is the **knob-reach fix** the inversion suite (§7.2) named: `iq`'s extremes
  now change a **relation**, not just magnitudes: a deaf seat (iq=0) is governed from
  OUTSIDE (5/24 worlds take an imposed measure, 0 reform) while a listening one (iq=100)
  governs itself (23/24 reform, 0 imposed): the CLASS of governance flips. Exhibits
  (pinned): **the granary's double edge**, the same decree fed a famine world with
  little idle waste (`#seed=le-2&regions=24&ep=10&iq=100`: drain 1, dependency 9) and
  bred a fiscal crisis in a quieter-run realm (`#seed=le-5&...`: drain 5, dependency 45);
  **the measure imposed**, `#seed=le-7&regions=24&ep=10&iq=0`: the deaf seat reformed
  nothing, so its creditors demanded a structural adjustment, narrated as foreign.
- **v48** (tariffs fund the bridges B6): extraction and upkeep are one ledger
  (issue #128, §3.2 tariffs row). The gates that TAX the roads are the same gates
  that MAINTAIN them. A held crossing (bridge/pass/port) that still collects a real
  toll keeps itself in repair; an **unheld span**, or one under a **toll amnesty**
  (the reform caps `tollScale` to 0.4, below the `UPKEEP_TOLL_MIN` 0.7 that funds
  upkeep), goes unfunded and **ROTS** a step each epoch: its spared wall creeps
  back (a rotted bridge re-fords its river, 0.6→2.2; a rotted pass re-walls its
  ridge, 1.4→4.5). A garrison re-tolls for the Dominion, so occupied crossings stay
  funded. The decay **chokes trade**: `computeCrossingFriction` walks each region's
  least-cost roads to the seat and the sea (the same paths the tolls walk) and sums
  the friction of every decayed span on them into `crossing_friction`, which throttles
  the region's trade income (capped −60%). So the **toll amnesty grows a long edge**
  (§3.2 reforms row): the relief that lifts the tolls also starves the bridges, and a
  decade on the realm that kept its tolls out-trades the one that freed them. Decay is
  **visible**: the atlas draws a rotted span in rust with a broken ring; the feature
  card states its condition (sound / decaying / rotted) and the friction a town pays
  for others' rotted spans; the exported edges carry `condition` + `is_decayed` and
  their `cost` shows the wall creeping back. New columns: `crossing_condition` /
  `crossing_type` / `crossing_friction` (regions), `condition` / `is_decayed` (edges);
  findings `crossings_total` / `crossings_decayed` / `trade_drag`. The founding is
  sound (all spans condition 1, so an `ep=0` world is unmoved but for the new zeroed
  columns). `schema_version` 47→48; declared fixture regeneration; the edge-cost
  consistency suite extended for decay states (a re-forded river edge is exempt from
  the sound 1.5× barge ceiling but floors at its sound multiplier; `is_decayed` agrees
  with `condition < 1` on river/pass edges only). Exhibits (pinned): **the reform
  backfires**, `#seed=am-8&regions=24&ep=10&iq=100`: the toll amnesty (epoch 3) lifts
  the tolls, then all 8 spans rot and trade collapses: 22 towns pay the friction, 82%
  end poorer than they founded, mean wealth 21→13; **the toll-heavy realm outlasts the
  toll-free**, the SAME world at `iq=0` hears no reform, keeps its tolls, funds every
  span (0 decayed, trade_drag 0) and its towns end richer (mean 17.5 vs 12.7) than the
  `iq=100` world that granted the amnesty and rotted them.
- **v47** (ordinary erosion B5): the owners' row can fall without a catastrophe
  (issue #127, §3.2 elite-share row). Under H1 the owners' row RATCHETED UP
  structurally and fell **only on catastrophe** (a won revolt burning the charters,
  a refinery collapse, a plague). B5 gives it an ordinary downward edge: where the
  **market reaches**, competition bids concentrated rents down and the owners capture
  less of every gain: a wired, central hub does not hold a monopoly the way an
  isolated valley does. One `rentKeep = 1 − 0.85·marketAccess` term (market access =
  central AND on the grid) now scales BOTH the rent-capture ratchet (the toll house,
  the works, the seam, the aerie) AND the owners' share of the town's **wealth
  upswing**: the boom is bid toward labor where rivals compete for it, though the
  owners still bear the whole of a bust. On top of that a standing **competition**
  decay eats at high concentration where access is high, and **boom-churn** mints new
  owners (rank churn without collapse): the §3.2 "boom entry mints new owners." A
  **police state freezes it all**: under occupation the rents are held by force, so
  the row neither erodes nor churns (an `occupied` proxy until B9's order axis).
  Because a **refinery collapse is a universal endgame** (extraction always depletes,
  the works always eventually go dark), no full-length world is literally event-free,
  so "falls without a catastrophe" is measured on the **ordinary component**, not on
  event-absence: new `elite_ordinary_delta` (per region) / `elite_ordinary_mean`
  (findings) read the row's move since founding with the catastrophe shocks charged
  OUT (won-revolt −25, refinery collapse −10, plague −8, crushed-revolt +10 all
  removed). Where the ordinary mean reads NEGATIVE, competition and churn, not a
  shock, thinned the row. Measured across a 24-world `eo-*` sweep (regions=12 ep=10):
  the ordinary mean falls in **6/24** worlds while its MEDIAN stays POSITIVE (+1.2),
  the ratchet still rules the average, the fall is the meaningful-minority INVERSION,
  not the new rule; per-region rank_churn spans −71..+67 (climbers and fallers both).
  The H1 class pins recomputed and held (corr(refining, elite) median 0.65, owners
  still hold ~48% of the coin, no saturation, within-region inequality intact). New
  `elite_ordinary_delta` column (main export) + `elite_ordinary_mean` finding;
  `schema_version` 46→47; declared fixture regeneration. Exhibit (pinned): **the row
  falls without a fire**, `#seed=eo-2&regions=12&ep=10`: the owners' row fell 7.9
  points; charge out the revolt, the refinery collapse, AND the plague this world DID
  suffer and it STILL fell (ordinary mean −2.6): ordinary erosion, not the fires,
  thinned the row.
- **v46** (the disposal doctrine B4): the λ dial retired (issue #126, §3.2 spoil
  row + §3.3). The saturated "dump bias" dial, a one-way knob whose extreme just
  aimed the refinery spoil harder at the poor, becomes a three-way **disposal
  doctrine** the `db` knob now selects (0–33 **disperse**, 34–66 **concentrate**,
  67–100 **treat**; old `db=` links keep meaning: low db was the physics spread,
  mid-high aimed the spoil at the poor; default 60 → concentrate). **Disperse**
  spreads the tailings by distance alone: no hand aims them, so they settle near
  the industrial (wealthy) core. **Concentrate** hauls the bulk onto ONE fixed
  sacrifice zone, a currently-sparse, cheap, grid-wired seat the realm writes off,
  with the rest on the poor margin; the zone's poison **ramps with the works**
  (near-nothing at the founding, full by mid-run), so a cheap empty zone reads as
  attractive frontier early and the harm arrives late (P4). **Treat** disperses,
  then the realm cleans up where it can afford the coin AND fields the works (`A`):
  a rich, developed core clears its own spoil while a wealthy-but-A-poor seat
  cannot, so the poison can land on the RICH. The consequence is the whole point:
  the old near-tautology (injustice = blight × poverty, after blight was *aimed* at
  poverty) is broken: across the sweep **corr(blight, wealth) now spans both signs**
  (measured −0.40 concentrate to +0.98 disperse), the model no longer counted on to
  put the blight on the poor. New `disposal_doctrine` + `sacrifice_zone` columns
  (both metadata blocks); the counterfactual reframed to the dispersed baseline;
  the mid-run dumping reforms now override the doctrine (reform → disperse,
  entrenchment → concentrate) rather than nudging a scalar. `schema_version` 45→46;
  declared fixture regeneration; the old λ-sweep pin (which asserted blight LOCKED
  negative) rewritten as the sign-unlock pin. Downstream calibrations (the doctrine
  reshaped the default world): the concentrate margin is **population×poverty
  weighted** so the poison harms PEOPLE: it plagues the crowded poor towns and
  gives the Temple LIVING ground to consecrate (the sacrifice zone is written off
  and never consecrated, or a shrine would die with it); the plague, revolt, and
  harbor pins recomputed (won risings still burn the charters at 14/15; the
  isolation price stays modest; the plague still levels at 41/41). Exhibits
  (pinned): **the contained
  sacrifice**, `#seed=dbz-2&db=50&regions=20&ep=10`, "Skalgarruk Fell" (region 8):
  blight 100 on ground its 636 people had left, the harm landing on no one, the
  doctrine "worked"; **the ruined sacrifice**, `#seed=dbz-8&db=50&regions=20&ep=10`,
  "Crannord" (region 4): the same doctrine, but the opened cheap land drew a settler
  rush (1,319 → 2,264, +72%) before the poison ramped in, 2,109 souls still stood
  on it at blight 72, the harm the containment was supposed to prevent (P4); **the
  poison on the rich**, `#seed=dbz-11&db=15&regions=20&ep=10`, "Forrow" (region 8):
  under disperse the wealthiest ground carries blight 100, corr(blight, wealth) 0.99,
  the marquee inversion of the old thesis.
- **v45** (migration both ways B3): migration's second edge (issue #125, §3.2
  migration row + §3.6 diaspora). Three new flows join the old drift-toward-
  winners, and populations can now move DOWN the wealth gradient when opportunity
  or the metropole says so. **Emigration off-map**: the metropole pulls the young
  away, hardest where the grid exposes them to it and the local ladder is short,
  a proxy for the §3.4 attention column (where a region's mind lives). It is a
  real population dip, not a move to a neighbour, and it concentrates in the poor
  grid towns, not the prosperous seats. **Remittances**: the accumulated diaspora
  sends coin home: a wealth inflow decoupled from local production that holds a
  floor under the emptying town (dependency theory's remittance economy, see docs/grounding.md),
  sqrt-scaled and capped at ONE coin an epoch so it is a floor, not a fortune. A
  heavy-diaspora periphery can draw a real remittance-economy share (a fifth of
  some worlds' wealth, as it is for the Nepals and Tajikistans of the world), but
  the inflow never pegs a town's wealth or reverses a bust world's decline: under
  the hard Concordat default the pie still shrinks in 18/20 worlds (the calibration
  that keeps the B1 "un-conserved, world-driven" pin true: cap 1, not 2). **The
  frontier term**: when the
  realm's cores squeeze rents hard (high mean owners' share), the dear cores push
  their squeezed labour OUT (a rent drag) and a cheap peripheral cell the grid has
  reached pulls it IN: people flow OUTWARD against the wealth gradient and a
  periphery can boom. New `emigrants_total` + `remittance_income` columns (main
  export), per-epoch `emigration`/`remittance` in the series, and the diaspora
  drawn in THE DRIFT (the souls dip against the wealth floor). So migration is no
  longer a one-way drain: the pooled pop→attractiveness correlation falls to ~0,
  but the MEDIAN world still favours its winners: the drift toward attractiveness
  is the common case (~54% of worlds), the frontier and the diaspora the negative
  tail. `schema_version` 44→45; declared fixture regeneration; the migration suite
  pin re-based from the pooled correlation (B2's robust-under-volatility choice)
  to the **per-world median** (B3 lets migration run both ways, so the pooled
  measure is no longer the claim: the acceptance is "favours winners in the
  median world, not the only case"). Two more suite adjustments B3 forced out into
  the open: (a) the **rush pin** re-pinned 0.55→0.50: the metropole now SKIMS the
  ore rush (emigration pulls the young off-map exactly where opportunity flares, so
  a struck lode keeps none of the people it draws; the honest floor is "half the
  strikes visibly boom", not "most"); (b) the **world-isolation** check ("the world
  never touches the rock") corrected to assert the FOUNDING endowment (`endowment_t0`)
  rather than the current ore stock: the latter is moved by economy-driven
  discoveries whose target keys on world-dependent wealth, so two worlds legitimately
  hold different ore in the same seat (a latent test-field bug that passed under B2
  only because seed=wo's discovery didn't flip seats until B3's remittances moved
  wealth; the model's world-dependence there is correct, the B0 premise itself).
  Exhibits (pinned): **the frontier**,
  `#seed=fr-13&regions=22&ep=10`, "Oxmook" (region 13, centrality 39): a
  low-centrality cell grew its population 525→830 (+58%) as rent-squeezed labour
  flowed outward to cheap land; **the remittance floor**,
  `#seed=em-22&regions=22&ep=10`, "Quillmere" (region 21): its population dipped
  25334→21683 (−14%) under a diaspora of 2,010, and its wealth held at 20 on the
  coin sent home: a floor no local production put there.
- **v44** (the investment pool B2): the counting house's second edge (issue
  #124, §3.2 double-edge inventory + §3.6 comprador split). Concentration stops
  being a one-way ratchet. Each epoch an **investment pool** forms from the
  owners' coin: `1.8 × wealth × eliteShare`, LEVERAGED by the counting house
  (credit reaches past cash on hand) and tilted by the world price. A
  **development share** decides how much of it BUILDS the works (`A` grows,
  opportunity-gated by `(100−A)/100`) versus merely HOARDS to the owners' row:
  `dev = 0.16 + 0.006·retention + 0.55·(price−1)`. So the same institution reads
  two ways, and WHICH is a fact about the town's RETENTION (does value stay to
  build, or is it a foreign claim?) and the world REGIME (does capital dare?),
  never a verdict the code writes: a high-retention boom finances development; a
  low-retention bust hoards (comprador extraction, see docs/grounding.md, the §3.6 fractal reframe: the
  seat is itself somebody's periphery). A **bust risk** rises as the price falls
  (rare in good times, to 40%/epoch in a deep downturn): a busted placement wipes
  part of the works (`A ×0.72`) and the owners eat the loss (−4 elite share),
  **elite share's first ORDINARY decrement pathway** (before B2 the owners' row
  fell only on war or industrial collapse).
  New `artifice_index_t0` column (the works as founded) so "the counting house
  built here" (`A` rose) is recomputable from the file, not a claim on faith. The
  counting-house inspector's "why" row now tells the two-edged truth per town
  (development finance where the works grew, comprador extraction where they did
  not). A **verdict-diversity instrument** lands in the sweep and a suite pin: the
  §3.5 gap × floor verdict space must reach ≥3 of its six quadrants across the
  seeds (§7.3's mush tripwire: a world engine that only lands in one corner is
  the failure this project exists to avoid); measured 5/6. `schema_version` 43→44;
  declared fixture regeneration. **Two prior suite pins re-pinned** against
  B2's tighter world-coupling (to the implementation's own observed output, a
  regression tripwire, not validation): (1) the migration→attractiveness correlation moves
  from a fragile per-world median to a **pooled** estimate over every calm region
  in the sweep: B2's wealth volatility genuinely weakened the close-state
  cross-section (a town that boomed early and busted late reads low attractiveness
  at the close yet gained population), but the drain stays positive on net; (2)
  the "un-conserved pie" demonstration moves from the default world to **world
  histories**: the investment pool's bust channel tightened the coupling so hard
  that the shared, bust-leaning Concordat default now shrinks the pie in every
  geology, so un-conservation is shown across worlds (the hard default shrinks,
  a sustained boom grows the very same ground). The matched exhibits (pinned) are
  two low-retention, foreign-intermediated towns under opposite regimes, the
  inversion keystone made concrete:
  **development finance**, `#seed=e-3&world=era-26&regions=22&ep=10`,
  "Marnmerwick Strand" (region 4, retention 34): a decade-long boom drove the
  counting house to BUILD: artifice 62→85, and the realm floor (p10 regional
  wealth) rose 7→13 with it. **comprador extraction**,
  `#seed=e-4&world=era-49&regions=22&ep=10`, "Linden" (region 9, retention 27,
  owners' row 82): the same kind of structure in a trade war HOARDED, artifice
  fell 86→43, the works gutted, the owners' row deep and the class gap 71×. Alike
  in how little they keep; only the world differs: the edge is produced by the
  simulated world regime, not decreed in the code.
- **v43** (the artifice index B1): the zero-sum breaker (issue #123, §3.1). Each
  region gains **`A` (0–100)**: its command of magically-enabled productivity
  (machinery, trained hands, licensed workings). Income is A-SCALED (the mix
  terms multiply against `0.3 + A/100`, ≈1.0 at the founding artifice so founding
  wealth barely moves, rising to 1.3 as the works learn and falling toward 0.3 as
  they're forgotten). `A` is seeded from development, then each epoch **investment
  keyed to the world price** lifts it (a boom pours capital into the works), it
  **diffuses** weakly to neighbours (works teach), **decays** without upkeep, and
  **crashes** on war (×0.6) and industrial collapse (×0.55). So **total realm
  wealth is no longer conserved**: before B1 depletion only ever shrank the pie;
  now a boom world GROWS it (measured 5/10 boom worlds vs 0 before) and a trade-war
  world starves it. New `artifice_index` column (main + epoch series), an
  `A`-per-epoch snapshot, the **artifice lens** ("where the works learn") in THE
  SHAPE, and an artifice spark in THE DRIFT. `schema_version` 42→43; declared
  fixture regeneration. Exhibit (pinned):
  `#seed=piv-19&regions=18&ep=10`: a high-artifice periphery (region 7, A=67,
  wealth 29) out-earns the low-artifice SEAT itself (region 15, A=51, wealth 15):
  the works learned faster than the capital, and artifice beat centrality.
- **v42** (the world becomes a rectangle B0.5): the world stops being a square
  (issue #122, §2.5 decision 11). `W = 1000` generalizes to **`WX = 1600, WY =
  1000`** (a fixed 16:10 rectangle for every world) across ~90 coordinate sites:
  Voronoi bounds, seed/lode scatter, the ridge walk, river tracing and clamps,
  the flood/elevation grid (`CS` split into `CSX`/`CSY`), coastline/sea sides,
  temperature latitude, hit-testing, the frame/neatline/vignette, and the
  counterfactual panes. The six tuned decay constants grow ×1.334 (the diagonal
  ratio) so reach and spoil stay self-consistent on the wider ground: spoil
  `/800→/1068`, temple+magnate `/300→/400`, healer+conduit `/250→/334`, force
  `/280→/374`. The **camera is shape-agnostic**: `camContain` reworks for 16:10,
  fit-width frames the world's width and pans N–S on wide viewports, and the
  scale bar keeps 20 leagues at fit (the world is 100 leagues across). Exports
  declare the CRS as **planar 0–1600 × 0–1000, y-up**; the QGIS README and the
  edge-cost buckets update in the same bump. `schema_version` 41→42; declared
  fixture regeneration; both suites re-pinned against the rectangle (the camera
  viewBoxes recomputed, distance-dependent thresholds recomputed). One emergent
  finding worth naming: the wider realm **steepens the urban hierarchy from
  Zipf-like (α≈1.2) to PRIMATE (α median ≈1.8)**: a bigger hinterland for the
  capital to dominate. The rank-size claim is re-pinned to primacy accordingly
  (see docs/grounding.md; the Zipf calc is coordinate-free, so this is geography,
  not a bug). Four other
  distance-dependent thresholds (plagues, ruin-shadow, twins, risings-on-occupied
  ground) recomputed; `PASS_R` stays 90 (a local crossing tolerance, not a reach).
- **v41** (the world outside B0): the Hinterland stops being a closed system
  (issue #121). A THIRD seed, `world=`, default the shared **Concordat era**
  (decision 7), keys `worldStreams()`, a Markov **regime chain** over six world
  conditions (long boom / trade war / imperial rivalry / doctrinal panic /
  distant war / retrenchment) with real persistence (median run ≥ 2 epochs), and
  five derived per-epoch series: the **aetherstone price index** (the first
  consumer, it shocks extraction + refining income in the epoch loop),
  imperial attention, foreign demand, doctrine pressure, and metropole pull (the
  latter four ride the export now and couple to their mechanisms later). The
  **observability law** holds: the outside is never drawn, only exported as
  numbers under `hinterland.world`. Deterministic in the world seed alone: two
  worlds differ in prices, wealth, and (through wealth → injustice → the revolt)
  sometimes events, but NEVER in geology or names; the founding (ep=0) is
  world-invariant (the world acts only through the epochs). This is the
  inversion keystone: a region can do everything right and be ruined by a
  price collapse, or everything wrong and be rescued by a boom: no verdict reads
  off the policies alone. `world=` rides the hash off-default only (the `lens=`
  precedent); THE WORLD gains a `World` input + a reroll die. Declared fixture
  regeneration; `schema_version` bumps 40→41; two suite pins re-pinned against
  the world-coupled model's own output (a region the world killed has no owners' row to
  expropriate; the toll sample widened as more revolts win). The inversion
  exhibits, pinned: a **badly-knobbed realm rescued** by a decade-long boom
  (`#seed=rescue-a&world=era-26&regions=18&ep=10&we=10&wf=10&wt=15&wg=5`, mean
  wealth 13→17) and a **well-knobbed realm ruined** by a decade-long trade war
  (`#seed=ruin5&world=era-49&regions=18&ep=10&we=45&wf=35&wt=40&wg=5`, 15→11):
  no verdict reads off the policies alone.
- **v40 addendum (A3, the neutral instruments, declared regen, no format bump)**:
  the shape metrics land (issue #120) so a reader can see *any* world, not only
  the one the old argument expected. Five new findings, additive under
  `hinterland.findings`: `growth` (total + population-weighted per-capita wealth,
  close vs founding), `floor` (p10 regional wealth, close vs founding),
  `absolute_mobility` (share of settled regions richer than their founding
  selves), `rank_churn` (Spearman ρ of wealth ranks founding→close, 1 = the
  order froze), and `volatility` (mean per-region boom/bust amplitude). All
  measured on the SETTLED realm at both ends, so abandoned zeros never fake
  growth or a fallen floor. Two new lenses join a **THE SHAPE** group: `growth`
  (per-region wealth since founding, a diverging %) and `volatility` (boom/bust
  amplitude). The **boot lens flips to `wealth`** (decision 3): the neutral coin,
  not a verdict; `injustice` survives as one plate among many, relabeled to what
  it is, the `blight × poverty` composite, in both legend and index. New
  `tools/sweep.mjs` prints the knob-reach and chronicle-sameness table
  (measured, not yet pinned; the ceilings land in D4). Additive only:
  `schema_version` stays 40; the golden fixtures were regenerated
  (`node tools/refixture.mjs`) to carry the new findings, a DECLARED act, this
  entry its record. The old 3-way ΔGini verdict is untouched (the §3.5 swap is D5).
- **v40** (the fate seed A2): same rock, different luck (issue #119). A second
  RNG family `fx = streams(params.fate || params.seed)` runs beside `sx`, and
  exactly six political tags re-key to it: `events`, `factions`,
  `institutions`, `revolt`, `dominion`, `dynasty`. Geology, founding, siting and
  naming stay on `sx`, so two fates on one seed share a byte-identical founding
  snapshot (ep=0) and diverge only in their histories. `fate` defaults to empty
  and falls back to the seed, so `fx === sx` draw-for-draw and the default world
  is unchanged: the golden fixtures (v39-addendum) stay green untouched, the
  first proof the allowlist works: `schema_version` bumps 39→40 (allowlisted)
  and `fate` rides the hash and provenance OFF-DEFAULT ONLY (the `lens=`
  precedent), so a default export never carries the key. A reroll die in THE
  WORLD reshuffles the luck (random 5-char token, then deterministic) without
  moving the seat or the rock.
- **v39 addendum (A1, the byte-pin, no format change)**: the golden fixture
  harness lands (issue #118). `tools/fixtures/` freezes the exports of a
  seed×knob matrix: 6 seeds × { default + `db=0` / `gt=0` / `wg=0` / `iq=100` }
  × { `world.geojson`, `events.csv`, `chronicle.md` }, 30 cells at 12 regions,
  `ep=10`. The suite's last check re-derives every cell live and asserts
  it equal **modulo an explicit allowlist** (schema_version; provenance keys
  emitted only when a new param is non-empty; csv columns added only when
  steered). This is the enforcement every later pivot PR answers to: a model
  change that moves a world moves these bytes, and the check fails until the
  move is DECLARED: `node tools/refixture.mjs` to regenerate, `git diff
  tools/fixtures` to read what moved, and a line HERE saying why. A fixture
  change with no schema-history note is exactly what the pin exists to catch.
  The matrix and the compare live in `tools/fixtures.matrix.mjs`, imported by
  both the checker (`test.mjs`) and the writer (`refixture.mjs`) so the two
  cannot diverge. No export bytes change; `schema_version` stays 39.
- **v39** (the river finds its bed): a river's LineString was its 3–7
  settlement anchors drawn point-to-point. On the map the water wandered
  sideways and could die inland, which no river does. Now each river ships
  its BED: a fine polyline (measured 9–37 points after Douglas-Peucker at
  tolerance 2.5) walked downhill over the continuous elevation surface from
  a sampled high source, bent through the chain regions in order (every
  chain region still holds a trace point, tested), and ended only in the
  traced sea (the mouth visibly enters the water) or off the map edge,
  never mid-land. New river property `chain_regions` (region ids in
  downstream order) carries what the geometry used to: `river_kind` and the
  drinking order recompute from it, not from the coordinate count. The
  chains themselves, the region columns (`on_river` / `river_id` /
  `river_pos` / `downstream_blight`), the carriage, and the exported bridge
  points are all byte-unchanged: the bed is additive geology, byte-stable
  across every knob, capital move, and epoch (measured 91/91 river mouths
  in the sea across 62 worlds). The suites got two repairs along the way:
  gen() now takes one event-loop breath per world (V8 pins every WeakRef
  target until a microtask checkpoint, so the old synchronous run retained
  all ~450 closed JSDOM windows and could die at the heap cap), and the
  stress render smoke was re-pinned to the two-genre split it predated
  (ridges and passes are atlas ink since #60/#63: the data-mode boot
  draws none, and a mode flip now checks the pen's map instead).
- **v38** (the substrates ship): the export stops withholding what it was
  computed on (issues #55/#56). New `edge` LineString features (main
  export only): one per region-adjacency edge the cost engine walks:
  `base_len`, `cost` (the engine's own edgeCost), `friction_mult`, exactly
  one of `is_ridge_crossing` / `is_pass` / `is_river` / `is_ford`, and
  `held_by` (the gate holder among the edge's two regions), so QGIS
  Network Analysis can reproduce `centrality_to_seat` and run
  close-the-pass counterfactuals. A **Download tables (CSV)** button
  flattens the provenance no table join could reach: `events.csv`,
  `epoch_region.csv` (the long per-(region, epoch) table, now carrying
  `dominant_bloc` and `toll_burden` per epoch), `rulers.csv`,
  `tensions.csv`, `treasuries.csv`, `findings.csv`. All RFC-quoted,
  deterministic row order, byte-stable per world. New
  `findings.moran` / `findings.moran_blight`: global Moran's I of wealth
  and blight over the SAME adjacency (row-standardized, 199 permutations
  from a dedicated `moran` substream; measured on 3 seeds: wealth I
  0.47–0.57 at p 0.005; the clustering claim now ships with its own
  significance test, recomputable from the exported edges + columns).
  Plus a static QGIS bundle (`docs/qgis/`): a WKT2 engineering CRS
  (`hinterland.prj`, kills the WGS84 warning), 7-class `.qml` styles
  matching the app's ramps, and the join recipes. Everything already in
  the export is byte-identical minus the additions (tested).
- **v37** (the honest artifact): the numbers ship with the claim,
  recomputable from the export. The
  verification suite, the structural-stress runner, and the 80-world
  atlas sweep are now IN THE REPO (`tools/`: every "measured across N
  worlds" number and every "the test suite does" sentence has a
  producer you can run). `d3-delaunay` is vendored inline, so the
  one-file, open-from-disk promise holds with no network and no CDN.
  New region columns `anchor_x` / `anchor_y` export the settlement
  anchor that `range_shadow` and every seat-distance is measured from
  (it is NOT the polygon centroid on relocated coastal ground; using
  the centroid recomputes the wrong shadow; join the settlement point
  or read the new columns). `within_pct` reconciled to the current
  computed median (39%) everywhere it is quoted.
- **v36** (the places between L1): four location types that influence the
  model: the freeport (shadow gate: smuggler sink, founding retention
  offset, invisible to official sea_access, immune to sealed quays and
  to the Dominion), the stillair (geology-stable no-lift tract: no
  aeries, a stilled seat grounds the whole skyway), the high sanctuary
  (unchartered healer + pilgrim draw + legibility hole), and hunter
  camps (predation counter, a wage rung, a fenced market). New region
  columns `is_freeport` / `stillair` / `has_sanctuary` / `has_camp`;
  new point features `freeport` / `sanctuary` / `camp`; all named in
  their own registers, drawn, inspected, and chronicled. Presence
  measured across 24 worlds: 18 freeports, 14 stills, 13 sanctuaries,
  17 camp worlds.
- **v35** (the naming of things E6): the words are grown from the world.
  Settlement names gain a toponym grammar whose qualifying parts are
  selected by GEOLOGY (mouth/ford/haven/tor/fen/holt/delf/hold…, ~half
  stay plain, measured 53/22/25 plain/fused/spaced); ridges, rivers,
  passes and seas take kinds from their measured size (`ridge_kind` +
  `max_elev`, `river_kind`, `pass_name` + `pass_elev` with Stair/Pass/Gap
  pinned to the measured elevation quartiles, `sea_name` by area); the
  top three roads are named for what they carry (`road_name`); history
  files its events under names that recompute exactly from the exported
  columns (`events[].name`: Seam Wars, Peaces, Risings, Landings,
  ground-matched plague names); towns earn DERIVED bynames (`epithet`:
  the Yoked/Unyoked/Free/Gilded/Ashen/Hollow/Mourning/Rising, 26% of
  towns). The toponymy stays byte-stable across every knob, weight, and
  capital move (tested); society flavors bynames and events, never
  places. A Haven/Strand-named port town no longer stacks "Harbor".
- **v34** (the two levers P2): `responsiveness` (0–100, default 45 = the
  old hidden dice, byte-identical at the default) weights the
  reform-or-reaction coin; `harbors_closed` seals the quays (no ports,
  no sea trade, no port tolls, no Dominion: the fleet needs a quay).
  Both ride the hash and the provenance. Observed in the sweep: deaf seat 0 reforms /
  listening seat all-wounded-reformed, mean gini 0.058 lower on the same
  seeds; sealed quays 0 arrivals with a small honest price (~0.6 coastal
  wealth, mineral realm, not maritime).
- **v33 addendum (U2, no format change)**: the surface catches up: the
  region inspector (one click, the whole ledger), 13 new lenses under
  grouped headings, named swatches on categorical legends, the
  counterfactual menu (λ / the full grid / both), traffic-weighted
  roads, the occupation animated on the scrubber. And a second stage-3
  purity fix: the occupied flag was reset AFTER the founding snapshot,
  so in-page re-runs leaked the previous run's occupation into the
  series' frame zero; the reset moved before the snapshot and the
  in-page-equals-fresh-boot byte test (shipped: `tools/test.mjs`) now
  covers the series export too.
- **v33** (the map is a map M1): the sea becomes a coastline: the shore
  shelf wanders (bays/headlands/skerries), sea features become polygons
  WITH HOLES (islands; `islands` property), the sea level negotiates
  down until every region keeps dry ground, and last-resort towns stand
  on raised holms. Region anchors relocate off wet centroids (two
  passes: against the continuous field, then against the traced
  polygon, the authoritative water). Harbors move to the waterfront;
  ruins/towers/sanctioned sites move to their own dry in-cell points
  (the wild-reach columns recompute from the exported points, as
  before). Mountains render as mass (hachures/peaks/fine display
  contours; exported contour levels unchanged). Honest re-pins: the
  won-revolt deep-fall share and the collapse-aftermath share moved
  under the re-rolled coastal geography; the D6 chain and pinned seeds
  held.
- **v32 addendum (C1, no format change)**: the counterfactual exhibit:
  the λ experiment moves from the test suite onto the page (side-by-side
  injustice maps + numbers; alternate run restored byte-exactly). And
  the STAGE-3 PURITY FIX: in-page society-knob changes after an ep>0
  render had silently recomputed on depleted ore since the dynamic
  engine landed; applyAttributes now restores the geology as founded on
  entry. Fresh-load exports were never affected.
- **v32** (the founding centuries Z1): the census is grown, not painted.
  POP_BANDS deleted; sizes emerge from 30 rounds of pre-history running
  the loop's own physics (compound growth on land quality, road migration
  with log-damped agglomeration + preferential attachment, see
  docs/grounding.md, distance
  shielding the remote, a floor under the smallest), then one rescale to
  the familiar realm scale so every per-1k rate keeps meaning. Findings
  gain `zipf` (full-system `alpha` med 1.22, `tail_alpha`, `tail_r2` med
  0.91, `primacy`), exactly recomputable. Tiers become labels for the
  outcome (recomputable from exported sizes). Honest recalibrations under
  the new census, re-pinned to its own observed output: H1 `within_pct` med 58 → ≈39 (real city
  sizes carry more of the between-place spread); the G1 market-shadow
  claim moved from matched pairs (blurred: a big grown town behind the
  wall is its own market) to the distribution level (shadow median <
  open in ≈9/10 worlds, gap ≈24 points); a capital move now re-grows the
  census around the new seat at the same realm scale; won-revolt ledger
  drops re-pinned −8..−24 (gate-town rents soften some falls); mobility
  ceiling 0.75 → 0.7.
- **v31** (the Dominion X1): sovereignty is the last inequality: the
  whole realm can be someone else's hinterland. An off-map empire lands
  (seeded coin + a clear harbor; ~half of worlds with time) at the best
  quay: `annexation` event, `occupied`/`occupied_epoch`/`tribute_burden`
  columns, `dominant_bloc` gains `dominion`, `held_by` gains `dominion`
  (garrisoned gates that no faction can seize back), retention ×0.6 in
  the zone, the zone force-wired to the quay (an ENCLAVE grid: the
  corridor connects the mine to the ship, not the country to itself),
  occupied elite_share +4 (the comprador bargain, see docs/grounding.md), tribute incidence
  shields the crown bloc, risings on occupied ground face the imperial
  garrison (+25 state strength) and win a LIBERATION. `hinterland.dominion`
  provenance; `findings.sovereignty` (all exactly recomputable). Observed in the sweep:
  arrival 19/40, occupied share med 19%, corridor fully wired 19/19,
  retention ratio med 1.4, comprador med 1.2–1.4, growth gap med 3.
  Re-pinned: the D6 chain seed moved to a Dominion-free world (chain56,
  strike@5 → war@7, ablation: no war); security/social-trust formulas now
  read the same bloc the export carries (the realm's writ ends at the
  garrison line).
- **v30** (the skyway S1): geography is destiny only for those who can't
  afford to leave it. Aeries + lanes chartered at the founding by gain ×
  value (flight's saving over the ground, times the wealth/ore/works
  worth moving), so the lanes emergently serve the far, walled, rich
  country; `seat_cost_ground` / `seat_cost_sky` / `sky_advantage` (derived,
  exactly recomputable), `is_skyport`; `hinterland.skyway` provenance;
  findings gain `sky` (shadow vs open mean advantage, `reached_n`,
  `twin_sky`). Class-conditional geography: aeries are owners' districts
  (`elite_pop_pct` +1, +0.6 elite share per epoch: the ONLY loop
  coupling; wealth, migration, and every event history are byte-identical
  to v29). Observed in the sweep: shadow mean advantage ≥ open in 27/29 worlds (median
  ~44–50%), twins split by class in 25/29, aeries at/above the median
  elite share in 29/30.
- **v29** (the strata H1): class exists: within the walls, not only
  between them. `elite_share` (simulated like wealth: structure-founded,
  history-moved, NO new dice: every seeded world keeps its exact old
  history with a class ledger written under it), `elite_pop_pct` +
  `class_gap` (derived, exactly recomputable), `elite_share` per frame in
  the epoch series, and the findings gain the two-level ledger:
  `gini_people` vs `gini_between_people`, `within_pct` (computed median
  58% of person-level inequality is INSIDE regions, invisible to any
  between-place map), `owners` (~5% of people hold ~53% of coin,
  `class_gap` ≈24×), `company_town`/`company_share`. Read from the run's own
  output before calibrating: corr(refining, elite_share) 0.72; won revolts drop the
  owners' share ≥16 points in 10/10; plagues level in 67/69 (the two
  exceptions are gate towns whose rents out-ran the shock: the ratchet
  is honest).
- **v28** (the physical world G4): geology becomes a causal chain:
  elevation is a continuous surface (continental tilt + tectonic uplift
  along the ridge axes + shelving shore), ruggedness is its SLOPE, the sea
  is a flooded shape (`sea` polygons + `hinterland.sea_level`, `on_coast`
  recomputable against it), contours export, and climate arrives:
  `temperature`, `rainfall` (with orographic rain shadow), `biome`
  (exactly recomputable), fertility DERIVED from climate. Findings gain
  `rain_split`. Recalibrated, re-pinned to the run's own output: the plume's downhill term
  damped (the tilt made downhill systematic), the D1 drain reframed onto
  the attractiveness composite the migration mechanic actually reads, λ
  floor −0.15, resource-curse and several shares eased: the physical
  world legitimately moved them.
- **v27** (divergent histories V1): the counter-currents: leveling plagues
  (+15 retention to survivors), reform/reaction events two epochs after the
  first wound (measures that mutate the loop's own parameters: dumping
  eased or entrenched, grid charter, toll amnesty/crackdown, retention act,
  the Crown Granary transfer), and the revolt (once per run, `outcome`
  won/crushed; a won rising frees its town, softens every toll, and can
  extract a granary concession; a crushed one gets a garrison). Findings
  gain `gini` / `gini_t0` / `turning`; histories measurably fork.
- **v26** (the argument surface A1): the app states its findings:
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
- **v24** (peace terms F3): wars end in treaties: the winter after a war
  with room in the record, a `treaty` event (factions, `winner`, `ceded`,
  `tribute`) redraws the map at the table: the loser cedes up to two held
  gates nearest the battlefield and pays half its treasury to the victor.
  Defeat is an institution; victory compounds through the ledger.
- **v23** (escalation + the oligarchy loop F2): faction treasuries (held
  gates pay 3/epoch; seizures cost 12; the ledger lowers the next seizure
  bar) and pair tensions (+25 per rival taking, +1.2 per contested meeting
  ground per epoch, 8% decay) exported in provenance; wars become policy:
  a pair past a seeded tension bar fires the war machinery, the battlefield
  prefers that pair's contested ground, and every war event carries its two
  `factions`. Recalibrated (re-pinned to the run's own output): drain floor 0.2→0.15 (policy
  wars legitimately redistribute people against the spiral).
- **v22** (the faction turn F1): the blocs become agents. Bridges, passes,
  and ports are HOLDINGS (`held_by`; founding owner = the host's founding
  bloc); each epoch the single strongest claim seizes a gate (`seizure`
  events with a `faction` field); `toll_burden` walks each region's
  least-cost paths and is dragged from wealth each epoch while the gate
  town banks it; apostate towers are raised (`tower_raised`) where
  governance keeps failing and burned (`tower_burned`) when Crown or
  Temple reach closes in. Recalibrated (re-pinned to the run's own output): collapse
  aftermath 0.8→0.65: a collapsed works town that holds a tolled gate
  can bank its way back to peak.
- **v21** (the wild layer P1): anomalies: objects the ledger did not order.
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
  trade income stream becomes 0.65 centrality + 0.35 sea access: two
  geographic poles. Recalibrated (re-pinned to the run's own output): λ-sweep floor −0.25→−0.20
  (the sea is a blight-independent wealth pole; the policy gap is unchanged
  at ~1.0) and resource-curse ratio 35%→28% (ore country near the harbor
  now has an export escape route; the curse holds inland).
- **v19** (rivers + downstream blight G2): 1–2 named rivers per world traced
  blind downhill from the ridge flanks; new `river` feature kind; region
  columns `on_river`, `river_id`, `river_pos`, `downstream_blight` (exactly
  recomputable); river edges ×0.6 in the cost graph, ridge crossings become
  pass-grade gorges; floodplain fertility; riverine `safe_water` bonus that
  upstream contamination eats; the chronicle tells the drinking order.
- **v18** (mountain ranges + passes G1): geography with shape: 1–2 named
  ridge polylines per world (blind geology) that wall the cost graph except
  at 1–2 passes each; new `ridge` and `pass` feature kinds, region columns
  `range_shadow` (exactly recomputable) and `is_pass`; the epoch series
  carries both; the chronicle names the ranges. Recalibrated: the drain
  spiral is now measured on the open side of the wall (geography legitimately
  fragments the global correlation into per-side spirals).
- **v17** (Markov toponymy E3): real procedural names: order-2 character
  chains over three invented registers replace the syllable placeholder;
  settlements gain `name_register` (lowland/frontier, a pure geology fact),
  sanctioned sites gain `site_name` (liturgical register); all names unique
  per world and stable across capital moves, weights, and epochs.
- **v16** (causal chains + the faith in motion D6): events cause events: an
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
  sanctioned sites now anchor to the founding geology (`endowment_t0`):
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

## The check-by-check tour (moved from the README)

5. **The P2 check (the two levers):** institutions and isolation are
   dials now, both in provenance and the share link. **Responsiveness**
   (`responsiveness`, default 45): P(reform) = the slider; the next 30
   points are reaction; the rest is silence. At the default the dice are
   byte-identical to every world ever rolled; at 0 the seat never
   reforms (observed 0/N worlds); at 100 every wounded world gets its
   mercy (N/N), and the same seeds run a mean **0.058 gini lower**
   under the listening seat, because the granary, the only measure that
   ever closes a gap, hangs on the seat's ear. **Close the harbors**
   (`harbors_closed`): no ports are chartered: no sea trade, no port
   tolls, and NO DOOR FOR THE DOMINION (0/N arrivals sealed vs ~60%
   open). The computed price of isolation is real but small (~0.6
   median coastal wealth): this realm's wealth is mineral, not
   maritime: the chronicle calls the sealing safety bought with
   poverty, and the ledger calls it cheap. Geology untouched: the sea
   is still there; the realm just refuses it.
6. **The U2 check (the surface catches up):** the app now shows what it
   computes. **Click any region** for its full ledger: the land, the
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
   grid (threshold 0), or both mercies at once: each verified byte-
   equal to a fresh world at those knobs. Roads draw by the **traffic**
   the model always computed, and the scrubber animates the
   **occupation** (the flag goes up in the year it went up, which
   exposed and fixed a second stage-3 purity leak: the occupied flag was
   reset after the founding snapshot, so re-runs leaked last run's
   occupation into frame zero of the series; the purity byte-test (in the
   shipped suite, `tools/test.mjs`) now
   covers the series too).
7. **The M1 check (the map is a map):** the physical world now survives
   contact with a cartographer. **The sea is a coastline**: the shore
   shelf's reach and steepness wander along the coast (bays reaching a
   median ~150 units inland, headlands, the occasional skerry), sea
   polygons carry **island holes** (GeoJSON polygons with interior rings;
   `islands` counts them), and the sea level **negotiates**: it lowers
   itself until every region keeps dry ground, and a town sunk in a
   noise pit raises a **holm** (a small island under the town). **No
   town, ruin, tower, or shrine stands in the water**: a permanent
   invariant tested on every stress config. **Places are places**:
   harbors sit at the waterfront (the cell's lowest boundary point),
   ruins/towers/shrines at their own dry sites away from the town: load
   the point layers over the polygons and nothing hovers. **Mountains
   are mass**: hachure strokes down the flanks, ▲ peaks, fine display
   contours; the ridge axis survives only as a faint dashed guide under
   its name. Region anchors moved off wet centroids (the anchor is a
   town site), so every euclidean column keeps recomputing from the
   settlement points the file actually carries.
8. **The C1 check (the counterfactual, the λ experiment on the page):**
   under the Dump bias slider, one button re-runs THIS world at **λ = 0**
   (same rock, same wind, same dice; only the spoil routing differs)
   and shows the two injustice maps side by side with the numbers: the
   poorest fifth's blight burden, the plague count, the gini, as rolled
   vs physics-only. On the default world the dumping alone adds 0.6× to
   the poorest fifth's burden and **five of its nine plagues**. The gap
   between the maps is a policy. The panel's λ=0 numbers are byte-equal
   to a fresh world generated at db=0 (tested), and opening the exhibit
   leaves the world as rolled **byte-untouched**. C1 also fixed a real,
   silent bug this feature depended on: the loop wrote ore depletion
   back into the founding endowment, so after any ep>0 render, dragging
   any society slider recomputed the world on **mined-out ground**: the
   screen and its own share link disagreed. Stage 3 is now a pure
   function of (geology, knobs), proven by an in-page-equals-fresh-boot
   byte test. Exports from fresh loads were never affected (no schema
   change).
9. **The Z1 check (the founding centuries, the census is grown, not
   painted):** settlement sizes are no longer dealt from tier bands. Every
   region starts as a hamlet and the centuries before year 1000 run the
   same physics as the recorded epochs, blind to wealth: compound growth
   on land quality, migration along the ROADS toward the bigger market
   (log-damped agglomeration + preferential attachment; distance shields
   the remote hamlet from being emptied), a floor under the smallest.
   Plot log(population) against log(rank) on the settlements layer: a
   line produced by the Gibrat-style growth rule the pre-history runs
   (see docs/grounding.md); its steepness is the observed variable.
   `findings.zipf` carries the fit: full-system slope
   `alpha` (median ≈1.2, Zipf's constant is ≈1), `tail_alpha` and
   `tail_r2` (the big-town tail is straight at ≈0.91, hamlets deviate,
   cities obey, the stylized fact the growth rule is built to produce),
   and `primacy`, all exactly
   recomputable from the exported settlement populations. **Tiers are now
   labels for the outcome**: the seat is prime by office; everyone else
   ranks by what they grew to, and the suite recomputes every tier from
   the exported sizes. Moving the capital now re-grows the census around
   the new seat (the seat's pull is physics) at the same realm scale.
10. **The X1 check (the Dominion, sovereignty is the last inequality):**
   in roughly half of all worlds with time and a harbor, an empire from
   beyond the sea lands at the realm's best quay (an `annexation` event;
   `hinterland.dominion` carries the arrival epoch, the foothold, and the
   occupied count; landlocked coasts and harbors inside the maelstrom's
   reach are shielded: the whole world has a geographic lottery of its
   own). Categorize `dominant_bloc`: occupied ground reads **`dominion`**.
   Filter `occupied = 1` and check three things the columns prove: the
   occupied country keeps the **smallest share of its own value**
   (`value_retention` cut at annexation), carries the **best wires in the
   realm** (`occupied = 1 ⇒ on_conduit = 1`, the extractive corridor, an
   ENCLAVE grid running to the quay, not the seat), and pays
   `tribute_burden = 3` while the free realm pays the Crown's assessment
   (crown-bloc 1, everyone else 2; the Crown shields its own; sovereignty
   inequality reproduces the domestic hierarchy). Gates on occupied ground
   read `held_by = "dominion"`: tolls paid to a power no one in the realm
   can petition, banked by no one in it. `findings.sovereignty` states the
   ledger (retention ratio, the corridor, the growth gap, and the
   **comprador ratio**, see docs/grounding.md: the occupied owners' row out-holds the free
   realm's: the occupation does not replace the owners, it hires them).
   A won revolt on occupied ground is a **liberation** (`occupied = 0`
   with `occupied_epoch` kept as the scar).
11. **The S1 check (the skyway, geography is destiny only for those who
   can't afford to leave it):** load the `skyport` points and `skylane`
   lines: lift lanes chartered at the founding by the same ledger logic
   that rations the conduit: an aerie goes where flight beats the ground
   by the most and where there is value worth moving (wealth, ore, the
   works), which is exactly the far, walled, rich country, because a lane
   to the easy lowland saves nothing. Choropleth `sky_advantage` (exactly
   recomputable from `seat_cost_ground` and `seat_cost_sky`): the deep
   end of the ramp pools **behind the wall**: the mean advantage in the
   mountains' shadow beats the open country's in ~85% of worlds (median
   ~44%), while the median region gains nothing; the lanes serve the
   tail, which is the point. The catch is the boarding rule, and the
   boarding rule is CLASS: aeries are owners' districts (`elite_pop_pct`
   counts them; the aerie accrues elite share each epoch), so the twins
   finding splits by row: `findings.sky.twin_sky` is how much of the
   wall the shadow twin's owners simply fly over while its labor walks
   the pass. The skyway touches ONLY the class ledger: wealth, migration,
   and every event history are byte-identical to v29.
12. **The H1 check (class exists: within the walls):** every region is now
   two peoples under one name: the owners' row and the labor it hires.
   Choropleth `elite_share` (the owners' slice of the region's coin,
   founded on pure structure: the works, the claimed seams, the court; then
   moved by the same history as everything else, with **no new dice**) and
   set it beside `wealth`: the company town is rich AND owned.
   `elite_pop_pct` and `class_gap` are **derived and exactly recomputable**
   (tier + works + harbor; owners' coin per owner over labor's coin per
   laborer, field-calc it yourself and diff). The findings carry the
   two-level ledger: `gini_people` (population-weighted gini over the 2N
   class rows) against `gini_between_people` (the same gini with each
   region collapsed to one people), and `within_pct`, the share of the
   realm's person-level inequality a region map **cannot see** (median
   ≈39% under the grown census, a third to a half; it measured ≈58%
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
   shoreline), and choropleth the new climate columns: `temperature`
   (latitude minus mountain lapse, corr with latitude ≈ −0.85) and
   `rainfall` (moisture marched in against the wind, raining out on the
   windward slopes). Categorize `biome` (alpine / badland / moor / marsh /
   forest / steppe / grassland, **exactly recomputable** from the ordered
   rules over temperature, rainfall, elevation, and the river) and check
   `fertility`: it is now **derived**: 0.5·rain + 0.3·warmth + floodplain −
   altitude, so any farm traces back to a rainfall pattern, a mountain, a
   plate. The rain shadow is the sharpest new lottery: the findings carry
   `rain_split` (median rainfall either side of the first ridge, the wall
   that cuts you off from trade also decides whether you get rain), and
   `on_coast` now means your cell touches the actual water shape.
14. **The V1 check (histories diverge):** the criticism this phase answers,
   "the same story is told regardless of how it's rolled", is now a tested
   falsehood. `hinterland.findings` carries `gini_t0` and `gini` (exactly
   recomputable from `wealth_t0` / `wealth`) and a `turning` point: across a
   sweep, some worlds **close their gap**, some **entrench**, some hold,
   and the cause is always in the timeline. The counter-currents: the
   **leveling plague** (survivors charge more: +15 permanent retention),
   **reform and reaction** two epochs after the first wound (Dumping Reform,
   Grid Charter, Toll Amnesty, Retention Act, or the Crown Granary; the
   only measure that ever closes a gap is the one that moves coin downhill,
   versus entrenched dumping and toll crackdowns, all of which shift the
   loop's own parameters mid-run), and the **revolt**: the periphery's one
   rising per run, `outcome` won (a free town: keeps what it makes, tolls
   no one, and may frighten the seat into a concession) or crushed (a
   garrison after the hangings). Filter events on `reform` / `reaction` /
   `revolt` and join against the gini trajectory: the fork is the finding.
15. **The A1 check (the argument surface):** the app now says what it
   computes. `hinterland.findings` in the provenance carries this world's
   thesis claims: the poorest fifth's blight against the richest fifth's,
   the mountain-shadow earnings gap, the darkness count and its burden
   ratio, who drinks the river last, who pays the gates, and **the twins**
   (the sharpest same-distance pair across the wall, drawn as a red line on
   the preview), every one *exactly recomputable from the exported
   columns*, and the same numbers appear in the on-page findings panel and
   in the chronicle's closing section, "What the Record Shows." In QGIS,
   recompute any finding from the file and it will match to the digit.
16. **The E5 check (the powers have faces):** the provenance carries
   `hinterland.rulers`: three full lines (Sovereign / Hierarch / First
   Magnate) with `name`, `from_epoch`, `contested`, reigns of 3–7 epochs
   drawn blind. `succession` events are **courtly**: they carry a faction
   and a ruler, never a region. Power changes hands in a room, not on a
   map. A contested succession (~30%) freezes that faction's seizures for
   the year and raises its tension with both rivals: cross the succession
   epochs against the seizure/war timeline and watch rivals move on a
   divided house. The chronicle is dated by the reigning Sovereign, and the
   founding three rulers are byte-stable across epoch settings of a seed.
17. **The F3 check (defeat is an institution):** the winter after every war
   with room in the record, a `treaty` event lands (epoch = war + 1, same
   two `factions`, plus `winner`, `ceded`, `tribute`): the winner is
   whichever power brings more to the battlefield (live reach plus ledger
   depth), the loser cedes up to two of its held gates nearest the field
   (watch `held_by` flip on the asset layers), and half its treasury moves
   to the victor's. **Victory compounds**: the tribute funds the winner's
   next seizure, so the oligarchy loop runs through war as well as
   commerce. Join `treaty.winner` against the final `held_by` map and
   `hinterland.treasuries`: the peace explains the ownership map better
   than the war does.
18. **The F2 check (money begets reach begets money):** the provenance now
   carries the ledgers: `hinterland.treasuries` (every held gate pays its
   holder 3 per epoch; each seizure debits 12, and a fat ledger lowers the
   next seizure's bar) and `hinterland.tensions` (the three faction pairs:
   +25 when one seizes from the other, +1.2 per epoch per contested region
   where the two claims meet, −8%/epoch decay). The oligarchy loop is
   measurable: in acquisitive worlds the deepest ledger ends holding the
   most gates (~79%). And wars are **policy, not weather**: a pair past the
   tension bar fires the war machinery within two epochs, the battlefield
   prefers contested ground where THAT pair meets, and every `war` event
   carries its two `factions`: join them against `dominant_bloc` and the
   front line explains itself.
19. **The F1 check (the blocs become agents):** the chokepoints are now
   OWNED: style `held_by` on the bridge/pass/port layers (crown / temple /
   magnate / none) and read `hinterland.events` for the `seizure` entries
   (each carries a `faction`): the ownership map is a history of takings,
   not a paint job. Choropleth `toll_burden` (every held gate on a
   region's least-cost paths to the seat and to its port levies) against
   `wealth − wealth_t0`: the taxed roads grow slower (corr ≈ −0.19) while
   the gate towns bank the difference. Watch the tower lifecycle in the
   timeline too: `tower_raised` where governance keeps failing,
   `tower_burned` when Crown force or Temple reach closes in, and the
   burned region's black market and trust heal, because the exports carry
   the final state.
20. **The P1 check (the wild layer):** everything on the map before this was
   infrastructure obeying a ledger; the wild layer is the objects that
   don't. Overlay **ruins** (◆, `ruin_type` = delve / tomb / deadhold, with
   `peril` and `yield`), **towers** (♜), **bridges** (═) and the
   **maelstrom** (◉) on the shadow-economy maps: ruin hosts sit in the
   high-predation/high-black-market quadrant (~70%), tower hosts are
   low-trust and high-black-market (measured 21/21, the `social_trust`
   penalty is exactly recomputable: any tower point within 220 planar units
   of the settlement anchor), and deadholds carry a founding blight scar
   (7/7 above median). Choropleth `delver_flux` for the poverty-driven
   traffic to the ruins: risk is a wage. River banks are now fords (×2.2)
   except at bridge towns (`has_bridge = 1`): bridge towns out-earn their
   bridgeless river peers in ~88% of worlds. Ruins, bridges, and the
   maelstrom are blind geology, knob-stable; towers are sited on the
   founding political map (state failure is a social fact, so the tower
   moves when the state does).
21. **The G3 check (the double lottery):** the map now has TWO geographic
   poles: the seat and the sea. Overlay the **coast** lines and **port**
   points (⚓, `port_name`), choropleth `sea_access` (exp-decayed
   cost-distance from the harbors over the same friction graph, the
   mountains block the way to the water too), and cross it with
   `range_shadow`: **open-and-coastal out-earns walled-and-inland in ~93% of
   worlds**. A region's fate is the sum of its lotteries, both drawn at the
   founding. Ports are sited on geology alone (flat, low coast, river-mouth
   bonus) so in a share of worlds the harbor IS the poisoned mouth: it
   drinks the river last and ships it first; check `is_port = 1 AND
   on_river = 1` against `downstream_blight`. `on_coast` is exactly
   recomputable: does the region's ring touch an exported `sea_sides` edge?
22. **The G2 check (who drinks first):** overlay the **river** lines on a
   `downstream_blight` choropleth: the poison accumulates down the chain, so
   the mouth drinks what every town and works upstream let fall in
   (`river_pos` gives the drinking order; the max load sits in the lower
   half of ~100% of chains). The column is exactly recomputable:
   `blight_load − downstream_blight` is the pre-river field; re-run the
   carriage (30% shipped per region, ×0.75 decay per step) along
   `river_pos`. Rivers are conductors: floodplain fertility plus ×0.6 barge
   edges pull the seat, the roads, and the money into the valleys (riverine
   regions out-earn dry ones in ~80% of worlds), which is exactly what makes
   the downstream seat at the mouth so bitter. Where a river cuts a ridge it
   opens a **gorge**: pass-grade crossing the traffic also threads.
23. **The G1 check (geography is destiny):** overlay the **ridge** lines and
   **pass** points on the wealth choropleth, then categorize regions on
   `range_shadow`, same distance from the seat, different fate: at matched
   crow-flies distance the shadowed region is poorer in ~93% of pairs and cut
   out of the market in ~98% (the wall multiplies edge costs ×4.5 except at
   the passes, and every social outcome flows through that graph). Style
   roads by `traffic` and watch ~98% of wall-crossing flow thread the passes
   chokepoints you can point at (`is_pass = 1` regions). NOTE: the shadow
   is measured from the region ANCHOR (`anchor_x`/`anchor_y`, = its
   settlement point), which is NOT the polygon centroid on relocated
   coastal ground: recompute from the anchor, not the centroid. `range_shadow` is
   exactly recomputable: does the straight line from the settlement anchor to
   the seat cross an exported ridge LineString? The mountains are drawn in
   the blind-geology stage: sliders and capital moves never move them.
24. **The E3 check (the world names itself):** categorize settlements on
   `name_register`, the map has a linguistic geography, and it tracks the
   **ore, not the border**: frontier-register names (hard, clipped) sit on
   high founding endowment or rugged ground, lowland-register names (soft,
   agrarian) on the settled core, exactly recomputable from `endowment_t0`
   and `terrain_ruggedness`. Names are walked by an order-2 Markov chain
   over invented corpora, unique per world, and byte-stable across capital
   moves, weight changes, and epoch settings of a seed, and since E6 the
   grammar goes further: the qualifying parts of a name are themselves
   geology (label a `-mouth` town and check it sits at a river's last
   region; find the `Delf`s and `hold`s on `endowment_t0` ≥ 50 or rugged
   ground; `High`/`Tor`/`Fell` on `elevation` ≥ 62). Label the
   `sanctioned_site` layer with `site_name` for the shrines' liturgical
   dedications ("Shrine of " || "site_name" in the label expression).
   For the bynames, label settlements `name || coalesce(', ' || epithet, '')`
   and verify each epithet against the columns that earn it (the cascade in
   the settlement table above): the byname is DERIVED, never drawn.
25. **The D6 check (events cause events):** history is no longer a set of
   independent dice: read `hinterland.events` as a causal chain. An
   **`ore_strike`** whose epicenter is *contested* ground guarantees and
   accelerates the **`war`** (the rush arrives, then the armies; the war lands
   within two epochs of the strike). And the faith arrives where the suffering
   is: two epochs after the run's first wound (`blight_plague` or
   `relic_calamity`), the Temple **consecrates** the ground:
   `event_type = 'consecration'`, a new `sanctioned_site` point appears,
   `temple_reach` hits 100 there, pilgrim routes re-aim, and `dominant_bloc`
   re-contests around the live shrine set. Filter the epoch series to the
   frames around a wound and watch the shrine appear two frames later.
26. **The D3 check (history with dates):** the provenance member now carries an
   `events` timeline, and regions carry `event_type` / `event_epoch` /
   `event_severity`. Since E6 the great events also carry a `name` that
   recomputes exactly from the record: a war within two epochs of an ore
   strike is `the War of the <town> Seam`; treaties are `the Peace of
   <town>`, revolts `the <town> Rising`, annexations `the Landing at
   <town>`; a plague is named by the ground it struck (`Fen-Ague` in the
   marshes, `Water-Rot` where `downstream_blight` > 0, `Grey Breath`
   elsewhere, always "of <year>"). Filter the epoch series to the frames around an event and
   watch the aftermath: a **refinery collapse** kills a region's income and
   blight plume and orphans its trunk conduit (ghost infrastructure); a
   **blight plague** empties a poisoned town and hands it to the drain spiral;
   a **relic calamity** leaves a permanent scar in the blight field. Deep-past
   `shock_legacy` is reconstruction; `event_*` is lived history: a region can
   have both (a plagued refinery town whose works later close keeps its full
   story in the timeline, latest event in its columns). And capital doesn't
   die, it moves: two epochs after a collapse a **replacement refinery**
   (`refinery_founded`) opens where the money went, with a trunk hookup and a
   fresh blight plume. Politics are live too: `dominant_bloc` re-contests
   whenever the refinery set changes, and `bloc_changes` counts each region's
   actual changes of ruler during the run. D5 completes the repertoire:
   **`ore_strike`** (a hidden lode, blind geology, always there, just unfound,
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
   The founding geology is preserved in `endowment_t0`: identical across all
   epoch settings of the same seed, so the dynamics are auditable against a
   fixed world.
29. **The W4 check (the uncounted):** choropleth `legibility_gap`: the census
   undercounts exactly where need is greatest, so **every per-capita map you
   have made so far is optimistic**. Recompute any rate with
   `population + uncounted_population` in the field calculator and put the
   official and corrected maps side by side: the correction is largest in the
   places already worst off. Also worth a look: `social_trust` vs
   `kinship_reliance` (near-perfect mirrors, where the state fails, kin
   absorb it), `mobility_ceiling` (ore-only frontier: born labor, die labor),
   `segregation_index` (refinery enclaves standing apart from their
   surroundings), and `tenure_regime` (whose land the registry recognizes).
30. **The W3 check (the past sits on the land):** choropleth
   `abandonment_index`: the dark patches are old ore country
   (`exhausted_lode = 1`, real blind geology that feeds no income today) whose
   value left and whose people stayed. Categorize `founding_era` to see the
   settlement cohorts, `shock_legacy` for the scars (collapses at the dead
   lodes, plagues at the worst blight, wars on the bloc seams), and scatter
   `legacy_advantage` × `wealth` to watch head starts persist. Every column is
   exactly recomputable from the other exported fields.
31. **The W2 check (the shadow is the state's negative image):** choropleth
   `enforcement_gap` next to `force_projection`: the lawless hinterland is
   the exact complement of where the garrisons (`kind = 'garrison'`, G) can
   reach. Style `smuggling_intensity` and watch the contraband corridors
   thread between patrol umbrellas; `predation_risk` picks out the
   busy-but-unguarded roads; `black_market_index` is a per-capita reliance
   index (multiply by `population` in the field calculator for volume) and
   correlates ≈ −0.9 with `arcane_service_index`: the shadow prices the
   underservice. `security_status` gives the categorical version.
32. **The W1 check (two networks, one lie):** style roads by `road_class`
   (width) or graduated on `traffic`, and overlay the conduit. **Every**
   settlement is on the road network: connection is universal, because people
   walk. The conduit is what gets rationed. That side-by-side is the sharpest
   version of the underservice argument: the periphery isn't unreachable, it's
   *unserved*. Then choropleth `market_access` (Hansen gravity, see
   docs/grounding.md, over road costs) and `pilgrim_flux` (through-traffic to the sanctioned sites, the
   on-route economy the bypassed never see).
33. **The Phase 6 check (who governs whom):** categorize regions on
   `dominant_bloc` (5 classes). The Crown holds the center, the magnates hold
   the refinery districts, the Temple holds its sanctioned sites (▲ points,
   `kind = 'sanctioned_site'`) out on the ore and the margins, and between
   them lie `contested` seams and `ungoverned` hinterland. Overlay
   `service_gap_idx` to ask the panel's question: *which bloc neglects most?*
   The reach fields behind the classification (`centrality_to_seat`,
   `temple_reach`, `magnate_reach`) are all exported, so the argmax is
   auditable.
34. **The Phase 5 check (the payload, who gets sick, who gets care):**
   choropleth `disease_burden_per_1k` (a rate, Jenks, 5 classes, sequential
   ramp) and overlay facility points filtered to `facility_type = 'healer'`.
   The burden concentrates exactly where `healing_reach` collapses: the
   high-burden/low-care quadrant is the whole project's thesis in one map. The
   cause components (`burden_env_per_1k`, `burden_water_per_1k`,
   `burden_unmet_per_1k`) let you attribute each region's sickness to blight,
   unsafe water, or structural vulnerability as small multiples. For coverage:
   `service_gap_idx` choropleth, or buffer the healer points for a service-area
   view and see who falls outside.
35. **The Phase 4 check (environmental injustice):** choropleth `blight_load`
   and bivariate it against `wealth` (or just map the precomputed
   `injustice_idx`). Under the default dump bias the blight–wealth correlation
   is strongly **negative**: the poison lands on the poor. Re-export at
   dump bias 0 and the correlation **flips positive**: with no dumping policy
   the spoil stays at the refineries and the centers eat their own waste. That
   sign flip, side by side in a print layout, is the computed *policy share*
   of the injustice.
36. **The Phase 3 check (off-grid darkness):** style regions by
   `arcane_service_index`, overlay the conduit lines, and categorize settlements
   by `on_conduit`: the dark periphery is exactly where the grid's economics
   said "not worth it" (`population × wealth` below the threshold), never a
   hand-picked list. Compute darkness as `100 - "conduit_access"` in the field
   calculator if you want the negative image. Sweep the grid-threshold slider
   (0 = everyone connected) and re-export to watch darkness spread.
37. **The Phase 2 check (the resource curse):** scatter or bivariate
   `aetherstone_endowment` × `wealth`, under default weights a visible share of
   high-endowment regions sits below median wealth: rich ground, poor people,
   and no layer was authored to produce it (ore is blind noise; the seat prefers
   farmland; refining follows centrality). Also worth a look: choropleth
   `centrality_to_seat` (the cost-distance backbone) and `value_retention`
   (who keeps the value their ground generates), and check the seat sits in
   high-`fertility`, low-`terrain_ruggedness` land.
38. **The L1 check (the places between):** load the `freeport`, `sanctuary`
   and `camp` point layers over the region choropleths and verify each one
   pulls on the columns around it. The freeport stands where `sea_access`
   says nothing does (the official metric cannot see it) while
   `smuggling_intensity` pools at its quay; filter `stillair = 1` and
   confirm `is_skyport = 0` on every stilled region (and that the tract
   is identical across two exports with different society knobs: it is
   geology); at `has_sanctuary = 1` check `legibility` runs ~+15 over
   its own recomputed base and `nearest_healer_dist` relief spreads to
   the neighbors; at `has_camp = 1` recompute `predation_risk` yourself
   (−18 on camp ground, −8 adjacent) and match the export exactly.

## The long status narrative (moved from docs/attribute-model.md)

> Status: authoritative design; **all six phases are implemented**: settlement
> skeleton + population, blind geology (ore, terrain, fertility, elevation,
> wind), agrarian-core seat, cost-distance centrality, refining, retention,
> three-stream emergent wealth, the cost-gated conduit with off-grid darkness +
> arcane services, exported blight with the λ dump-bias sweep,
> facilities/coverage/health with the emergent cause-split disease burden, and
> the governance overlay (dominant_bloc from three competing reach fields).
> The second wave is underway: **W1 (road network + flows)** and **W2
> (security + the shadow economy)** are implemented: roads spanning every
> settlement with gravity traffic and classes, `market_access`, `pilgrim_flux`,
> garrisons with `force_projection`, lumen-gated `wardline_strength`,
> `security_status`, and the criminologist's set (`smuggling_intensity` routed
> around patrols, `predation_risk`, `black_market_index`, `enforcement_gap`).
> **The second wave is complete** (W1 roads/flows, W2 security/shadow economy,
> W3 deep time, W4 social texture). Every cluster of the original design model
> is implemented. **The dynamic engine (D1) is live** through schema v12: an
> epochs knob (neutral zero = the founding snapshot) runs the world forward
> through coupled loops: ore depletes, wealth compounds, people migrate along
> roads, the grid ratchets after the winners, the dumping re-targets the poor,
> so the design model's feedback spirals (extraction, drain, agglomeration) now
> actually RUN instead of being implied by correlations. **The temporal bridge
> (D2)** exports the run as an epoch series for the QGIS Temporal Controller
> and adds an in-browser epoch scrubber: the compounding is watchable.
> **In-run events (D3)** add lived history with dates: refinery collapses as
> the ore economy tires (orphaning trunk conduit as ghost infrastructure),
> plagues at maximum contamination, and relic calamities that scar the blight
> field permanently, recorded per region and as a provenance timeline.
> **Dynamic institutions (D4)**: capital doesn't die, it moves. Replacement
> refineries founded mid-run where the money went, and the political map is
> live: blocs re-contest as magnate reach shifts, with `bloc_changes` counting
> each region's lived changes of ruler. **Conflict and fortune (D5)**: hidden
> lodes surface as in-run ore strikes, and wars burn the most valuable
> contested ground, permanently wounding its capacity, with the Crown
> garrisoning the battlefield only after the blood. **Causal chains + the faith
> in motion (D6)**: events now cause events: an ore strike on contested ground
> guarantees and accelerates the war (fortune turns the seam hot), and two
> epochs after the run's first wound (plague or calamity) the Temple
> consecrates the ground as a new sanctioned site, with temple reach, pilgrim
> routing, and the political map all re-contesting around the live shrine set
> (observed in the sweep: consecration in ~72% of wounded worlds; every new shrine reaches
> temple_reach 100; a pinned seed carries a war that would not exist without
> the chain). **Markov toponymy (E3)**: the world names itself: order-2
> character chains over three invented registers walk novel, per-world-unique
> names from per-region substreams; the register is a blind-geology fact
> (ore/rugged country speaks frontier, the settled core lowland, holy ground
> the Temple's liturgical register), so the linguistic frontier tracks the ore
> rather than the border and the entire toponymy is byte-stable across
> capital moves, weights, and epochs (observed in the sweep: ~97% of names are novel
> compositions, not corpus quotes). **The physical world (G4)**: geology
> became a causal chain of shapes: elevation is a continuous surface
> (tilt + tectonic uplift + shore), ruggedness its slope, the sea a flooded
> polygon with a per-world level, climate real (temperature by latitude and
> lapse; rainfall advected against the wind with orographic RAIN SHADOW),
> biomes classified and exactly recomputable, fertility DERIVED from
> climate (corr with rainfall 0.63; temperature–latitude corr −0.85; the
> ridge splits the rain in 12/20 worlds; 7/7 biomes across the sweep).
> Honest physics fallout, read from the run's own output first: the coherent tilt began pouring
> plumes into the wealthy lowlands (hill term damped; λ floor −0.15) and
> the old popΔ↔wealth drain legitimately decorrelated, reframed onto the
> attractiveness composite the mechanic actually reads. **The two levers
> (P2)**: institutions and isolation become dials. Responsiveness makes
> the reform-or-reaction coin a policy (default 45 = the old dice,
> byte-identical; 0 = the deaf seat, never a reform; 100 =
> every wound buys a mercy), and the same seeds run mean gini 0.058
> lower under the listening seat: the granary hangs on the seat's ear.
> Close-the-harbors seals the quays: no ports, no sea trade, no door for
> the Dominion, computed price small (~0.6 coastal wealth; the realm's
> wealth is mineral, not maritime): safety bought with poverty, cheaply.
> **The surface
> catches up (U2)**: the app shows what it computes: a region INSPECTOR
> (one click: the land, the coin, the two rows, the state, the people,
> what stands there, the gates on its road to the seat, its whole event
> history), 13 new lenses (retention, tolls, tribute, climate, terrain,
> trust, mobility, smuggling, sea access, wealth-since-founding) under
> grouped headings, named swatches for categorical legends, the
> counterfactual menu (lambda / full grid / both mercies), roads drawn
> by computed traffic, and the occupation animated on the scrubber,
> which exposed a second stage-3 purity leak (the occupied flag reset
> after the founding snapshot), now fixed and byte-tested on the series
> export as well. **The map is a
> map (M1)**: the physical world survives contact with a cartographer.
> The straight-strip shore became a coastline (the shelf's reach and
> steepness wander: bays with a median ~150-unit inland reach, headlands,
> skerries; islands export as polygon holes); the sea level NEGOTIATES
> down until every region keeps dry ground, and a town sunk in a noise
> pit stands on a raised holm. Anchors relocated off wet centroids in two
> passes (field, then traced polygon, the authoritative water); harbors
> stand at the waterfront, ruins/towers/shrines at their own dry sites;
> mountains render as hachured mass with peaks. "No town in the water"
> is now a permanent invariant on every stress config. **The
> counterfactual (C1)**: the λ experiment moves onto the page: one
> button re-runs the same world at λ=0 (same rock, wind, and dice) and
> sets the two injustice maps side by side with the numbers; on the
> default world the dumping alone adds 0.6× to the poorest fifth's
> burden and five of its nine plagues. Built on a STAGE-3 PURITY FIX
> for a real latent bug: the loop wrote depletion back into the founding
> endowment, so any in-page society-knob change after a timed render
> recomputed the world on mined-out ground (the screen and its share
> link disagreed); stage 3 is now a pure function of (geology, knobs),
> proven byte-for-byte. **The founding
> centuries (Z1)**: the census is grown, not painted. The authored tier
> bands are gone; every region starts a hamlet and the centuries before
> year 1000 run the same physics as the recorded epochs, blind to wealth:
> compound growth on land quality, road migration toward the bigger
> market (size begets size, log-damped + preferential attachment;
> distance shields the remote hamlet), a floor under the smallest, one
> rescale to the familiar realm scale. The rank-size regularity is produced
> by that growth rule itself (see docs/grounding.md), its steepness the
> observed variable:
> full-system slope med 1.22 (Zipf ≈1), the big-town tail straight at
> r² 0.91, primacy med 1.4, and tiers are now labels for the outcome,
> exactly recomputable from the exported sizes. Honest fallout, read from
> the run's own output first: H1's within-region share med 58 → ≈37 (real city sizes weight
> the between-place spread); the market shadow moved from matched pairs
> to the distribution level (a big grown town behind the wall is its own
> market, the pairs blur, the median still trails by ≈24). **The Dominion
> (X1)**: sovereignty is the last inequality. Every loop before X1 ran
> inside the map; now the outside exists: an empire from beyond the sea
> lands at the realm's best quay in ~half of the worlds with time and a
> clear harbor (the door the ports opened: G3's second lottery is also
> the vulnerability; landlocked and storm-guarded coasts are shielded).
> The occupied zone keeps the smallest share of its own value (retention
> ×0.6), carries the best wires in the realm (force-wired to the quay,
> an enclave grid: the corridor connects the mine to the ship, not the
> country to itself), and pays tribute whose incidence the Crown passes
> to the politically weak (crown-bloc 1, others 2, occupied 3). The
> occupation hires the local owners' row rather than replacing it
> (comprador ratio 1.2–1.4), no faction can seize a garrisoned gate, no
> domestic war burns occupied ground, and a rising that beats the
> imperial garrison is a liberation. Observed in the sweep: corridor fully wired in
> 19/19 occupied worlds; free country keeps 1.4× the occupied share of
> its own value; growth gap med 3 points. **The skyway
> (S1)**: geography is destiny only for those who can't afford to leave
> it. Lift lanes are chartered at the founding by the same ledger logic
> that rations the conduit, gain × value: an aerie goes where flight
> beats the ground by the most (the walled, far country) and where there
> is cargo worth moving (wealth, ore, the works), a lane to the easy
> lowland saves nothing. `sky_advantage` is exactly recomputable from the
> two exported cost columns; the mean advantage behind the wall beats the
> open country's in 27/29 worlds (median ~44–50%) while the MEDIAN region
> gains nothing: the lanes serve the tail, which is the point. And the
> boarding rule is class: aeries are owners' districts (the only loop
> coupling is +0.6 elite share per epoch at the aerie; wealth, migration,
> and every event history are byte-identical), so the twins finding
> splits by row: the shadow twin's owners fly the wall its labor walks
> (twin_sky > 0 in 25/29 twin worlds). **The strata (H1)**:
> class exists. Before H1 every region was one people with one number, so
> every inequality the generator could speak of was BETWEEN places: the
> magnate who owns the works and the hauler who coughs in them were the
> same row of the table. Now each region splits into an owners' row and a
> labor row: `elite_share` is founded on pure structure (the works, the
> claimed seams, the court; company towns concentrate, smallholder
> valleys spread) and then moved by the SAME history with no new dice
> (rents concentrate it; bread, plagues, and won revolts level it; crushed
> revolts expropriate under the garrison); `elite_pop_pct` and `class_gap`
> are derived and exactly recomputable. The findings' two-level ledger
> (population-weighted `gini_people` vs `gini_between_people`) measures
> the thesis directly: median ≈37% under the grown census (58% before Z1) of person-level inequality is WITHIN
> regions, invisible on any map of places, with ~5% of the people
> holding ~53% of the coin, ~24× apart from the labor they hire
> (corr(refining, elite_share) 0.72, ownership follows the works,
> emergently). **Mountain ranges + passes (G1)**:
> geography with SHAPE: 1–2 ridge polylines drawn blind per world raise the
> rock in a band and WALL the cost graph (×4.5 to cross, ×1.4 at the 1–2
> passes), so centrality, the conduit, roads, markets, and migration all
> react through the one graph they already run on. Observed in the sweep: at matched
> crow-flies distance from the seat, the region behind the wall is poorer in
> ~93% of pairs and cut out of the market in ~98%; darkness pools in the
> shadow in 25/25 worlds; ~98% of wall-crossing road traffic threads a pass.
> `range_shadow` is exactly recomputable from exported geometry; ranges are
> named in the frontier register and narrated by the chronicle. The drain
> spiral is now measured per-side of the wall (geography legitimately
> fragments the global correlation). **Rivers + downstream blight (G2)**: the
> conductors: 1–2 rivers per world traced blind, gentlest-descent, from high
> interior ground to the border; floodplains gain fertility (the seat is
> drawn to the water, emergent), river edges cost ×0.6 (ridge crossings
> become pass-grade gorges), and the blight CARRIES DOWNSTREAM inside
> computeBlight (30% shipped, ×0.75 decay per step; `downstream_blight`
> exactly recomputable from the exported chain order). Observed in the sweep: the lower
> river carries the heavier load in 23/23 chains; riverine regions out-earn
> dry ones in 16/20 worlds: the river gives before it takes, and who drinks
> first was set by the land before anyone built anything. **The sea + ports
> (G3)**: the edge of the world is a market: 1–2 adjacent box edges become
> sea (blind), ports are sited on geology alone (flat, low coast, river-mouth
> bonus: the town that drinks last often ships first), and `sea_access`
> (exp-decayed cost-distance from the harbors over the same friction graph)
> joins centrality inside the trade stream (0.65/0.35): TWO geographic
> poles. Observed in the sweep: mean corr(sea_access, wealth) 0.29 beside centrality's
> 0.81; the DOUBLE LOTTERY holds in 13/14 worlds (open-and-coastal out-earns
> walled-and-inland); river-mouth harbors in 6/20 worlds. Two honest
> recalibrations, re-pinned to the run's own output: the λ-sweep floor eases to −0.20 (the sea
> is a blight-independent wealth pole; the policy gap is unchanged) and the
> resource-curse ratio to 28% (the coast is an escape route from the curse;
> it still holds inland). **The wild layer
> (P1)**: anomalies: objects the ledger did not order. Relic ruins drawn
> blind in the deep past (a delve in the old workings, a tomb in the
> barrens, sometimes a deadhold whose ground seeds a founding blight scar),
> each with peril and yield; `delver_flux` routes the poor to them (risk is
> a wage) and the shadow economy fences what they carry out (ruin hosts in
> the high-predation/high-black-market quadrant ~70%). River banks become
> fords (×2.2) except at 1–2 bridge towns per river: bridge towns out-earn
> their bridgeless river peers in ~88% of worlds. Apostate towers (0–2)
> squat where governance and the grid both fail, sited on the founding
> political map, NOT geology, because state failure is a social fact,
> suppressing trust (exactly recomputable) and feeding the black market
> (21/21 tower hosts low-trust/high-black-market). Half of worlds carry a
> maelstrom that port siting shuns. **The faction turn (F1)**: the blocs
> become agents. The chokepoint assets (bridges, passes, ports) are
> holdings (founding owner = the host's founding bloc); each epoch every
> faction scores every gate it does not hold (live reach × a per-faction
> taste; the magnates want quays and spans, the Crown wants passes; minus
> the holder's reach and inertia) and the single strongest claim above the
> bar seizes it. `toll_burden` walks each region's least-cost paths to the
> seat and its port, drags wealth each epoch, and is banked by the gate
> town (observed in the sweep: seizures in 13/20 worlds, magnates the most acquisitive;
> corr(toll_burden, wealth growth) ≈ −0.19). Apostate towers are raised
> mid-run where governance keeps failing and burned when Crown or Temple
> reach closes in (raise 12/20, burn 5/20 worlds), and the burned region's
> shadow economy heals, because every column reads the final state.
> **Escalation + the oligarchy loop (F2)**: money begets reach begets money:
> every held gate pays its faction's treasury 3/epoch, the ledger lowers the
> next seizure's bar (up to +15) and each taking debits it (12), so gates
> fund the next gate (observed in the sweep: the deepest ledger holds the most gates in
> 11/14 acquisitive worlds). The three faction pairs accrue tension (+25 per
> rival taking, +1.2 per epoch per contested region where the two claims
> meet, 8%/epoch decay; exported in provenance) and a pair past a seeded bar
> FIRES the war machinery within two epochs: the battlefield prefers
> contested ground where that pair meets, every war event carries its two
> factions, and the grievance is spent in blood (tension resets). Wars are
> policy, not weather; the chronicle names the powers, not just the ground
> (14/14 war worlds). **Peace terms (F3)**: defeat is an institution. The
> winter after a war with room in the record, terms are set at the
> battlefield: the winner (live reach at the ground + ledger depth) takes up
> to two of the loser's gates nearest the field and half its treasury in
> tribute, which then funds the winner's next seizure: victory compounds
> through the ledger (observed in the sweep: treaties follow 14/14 eligible wars; gates
> ceded in 9/14 treaty worlds; the chronicle names the terms' author in
> every one). **Dynasties (E5)**: the powers have faces: three ruler lines
> (Sovereign/Hierarch/First Magnate) with blind-drawn reigns, named in each
> power's register and unique against the whole world; successions are
> courtly events (faction + ruler, no region), ~30% contested: a divided
> court takes no gates that year and its rivals' tension rises (observed in the sweep:
> successions in 12/12 ep=10 worlds, crises in 11/12; every succession
> narrated; the founding three byte-stable across the epoch knob; the
> chronicle dated by the reigning Sovereign). **The argument surface (A1)**:
> readers praised the fantasy and missed the point, so the app now SAYS what
> it computes: a findings panel computed live from the exported columns
> (quintile blight ratio, the shadow earnings gap, darkness and its burden,
> who drinks last, who pays the gates), echoed in provenance as
> `hinterland.findings` (exactly recomputable, stress-tested), a TWIN
> exhibit drawing the world's sharpest same-distance pair across the wall,
> an injustice default view with question-labels, and a chronicle that
> closes with a verdict: the outcome follows from the modeled feedback
> loops, with no villain written in.
> **Divergent histories (V1)**: the deepest critique: every loop amplified
> inequality, so every world converged to one story, answered with real
> counter-currents: the leveling plague (survivors charge more), reform and
> reaction (measures that mutate the loop's own parameters mid-run: dumping
> eased/entrenched, grid charters, toll amnesties/crackdowns, retention
> acts, and the Crown Granary, a bounded transfer toward the median), and
> the revolt (once per run; won = a free town + softened tolls + possible
> granary concession, crushed = a garrison after the hangings). Measured
> across 24 worlds: 7 closed their gap, 9 entrenched, 8 held; revolts won
> 14 and died 7; 24/24 findings panels open with distinct claims. The
> sharpest finding of the phase: the only measure that ever closed a gap
> was the one that moved coin downhill. **The
> chronicle
> (E4)**: the world narrates
> itself: a deterministic written history (downloadable markdown + on-page
> panel) composed from the founding, the dated event timeline with the causal
> chains told as chains, and the closing state of the realm; every event is
> narrated by settlement name and date, and the prose references only what
> the export carries. **The naming of things (E6)**: the words are grown
> from the world: a toponym grammar whose qualifying parts are selected by
> GEOLOGY (a river-mouth town earns "-mouth", ore country its Delf, the
> high country High/Tor/Fell, the fens their Fen; measured 53/22/25
> plain/fused/spaced), so the toponymy stays byte-stable across every knob
> while no longer being a list of single words; the land takes kinds from
> its measured size (Teeth/Spine/Range/Hills, Beck/Brook/River,
> Stair/Pass/Gap pinned to the elevation quartiles, seas named by area);
> the top three roads are named for their cargo; history files its events
> under names that recompute exactly (Seam Wars, Peaces, Risings, Landings,
> ground-matched plagues); and towns earn DERIVED bynames (the Yoked / the
> Free / the Gilded / the Ashen…, 26% of towns, first match wins): the
> chronicle closes The Years with the byname roll. Society flavors the
> byname and the event name, never the place name. **The places between
> (L1)**: four location types that pull on the model: the FREEPORT (a
> harbor beyond the writ on the farthest coast: a smuggler sink, a
> founding retention offset, invisible to official sea access, open
> under sealed quays, closed to the Dominion), the STILLAIR (a
> geology-stable tract where lift dies: no aeries, and a stilled seat
> grounds the skyway entirely), the HIGH SANCTUARY (an unchartered
> healer and pilgrim draw that hides its people from the census:
> legibility +15, measured ~96 at the refuge vs ~38 elsewhere), and
> HUNTER CAMPS (predation −18/−8, mobility +4, black market +6, risk
> as the poor's one wage). All named, drawn, inspected, chronicled,
> exported. With time real,
> `abandonment_index` became true hysteresis (peak wealth − present wealth) and
> dead lodes emerge in-run; the arrow-inversion caveat on deep time is thereby
> partially resolved (founding-era/shock reconstruction remains). Remaining
> note: the segregation index uses neighbor contrast at region granularity.
> This document decides which attributes exist, in what order they land, and
> why.
