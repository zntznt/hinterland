# `tools/proto` — prototypes that run against the generator, outside the suite

Nothing in here is imported by `test.mjs`, `stress.mjs`, `sweep.mjs`, `atlas.mjs` or
`bundle.mjs`, and nothing in here is loaded by the app. These are gate artifacts: a
prototype is built, run, judged, and then either promoted into the app in a separate PR
or left standing as the record of a gate that did not open.

## `reign-proto.mjs` — the #142 reign instrument

The invariants it checks also live in `tools/test.mjs`, which is where they can fail a
build. What the suite cannot do is survey: it runs 40 worlds because it runs beside 370
other checks, and a rate wants more. This is the wider instrument, and the numbers
quoted in the CHANGELOG's E1 entry came out of it.

```
cd tools/proto
NODE_PATH=../node_modules node reign-proto.mjs --reach          # which decisions are reached, and how often
NODE_PATH=../node_modules node reign-proto.mjs --echo           # the echo-the-dice invariant, at survey scale
NODE_PATH=../node_modules node reign-proto.mjs --avert          # the averted rising's six consumers
NODE_PATH=../node_modules node reign-proto.mjs --sample > ../../docs/reign-sample.md
```

Flags: `--n` (worlds, default 60), `--seeds` (comma list, `--sample` only).

**`--reach` is the one to run after any change to the economy.** A dilemma is offered
when a Phase B lever is live, so a mechanism that stops firing takes its dilemma with
it silently: the reign still works, there is simply one fewer road, and nothing goes
red. The table is the tripwire. It is also how the fate finding surfaced — hold one
`fate` across many seeds and you are surveying a single run of luck over many maps,
which starved the wound takeover to 0 of 60 while the Dominion arrived in 58.

`--sample` builds its reign the way §5.1's controller does: re-run, read the next
decision the *current* history offers, append, re-run. Handing the engine the whole
auto-history decision list at once does not work, and shouldn't — the first road
changes which decisions the rest of the run reaches, so the later keys go stale and
are ignored by design.

## `voices-proto.mjs` — the #136 voices gate

Implements `docs/voices-spec.md` §§1–3 at the spec's declared full pool scale and prints
the sample the gate asks the owner to read, plus PASS/FAIL for invariants V1–V6.

```
cd tools/proto
NODE_PATH=../node_modules node voices-proto.mjs \
  --seeds atlas-1,atlas-2,atlas-3 --ep 10 > ../../docs/voices-sample.md
NODE_PATH=../node_modules node voices-proto.mjs --diag        # band reachability, 20 seeds
NODE_PATH=../node_modules node voices-proto.mjs --all-prose   # paragraphs for every seed
```

Flags: `--seeds` (comma list), `--ep`, `--regions`, `--voices`, `--all-prose`, `--diag`,
`--dseeds` (seeds for `--diag`).

Three files, and the split matters:

- `voices-extract.mjs` pulls `hashStr` / `mulberry32` / `streams` / `NAME_CORPUS` /
  `buildChain` / `chainWalk` / `markovWord` **out of `index.html` by anchored regex** and
  evaluates them in a `vm` context. It throws `#136 EXTRACTION FAILED` if any anchor
  misses. The prototype must walk the engine's own chains, not a copy of them, or a voice
  stops being recomputable from `export + index.html`; a silent fallback would hide that,
  so there is none.
- `voices-pools.mjs` is the authored content: 246 fragments, 20 frames, 4 diction skins,
  the imperial stem corpus.
- `voices-proto.mjs` is §§2–3 — folk forms, blame/credit shift, the sentiment formula and
  the divergence law, assembly, the invariants, and the markdown emitter.

The world is captured through the same `gen()` in `../lib.mjs` that the acceptance suite
uses, so the prototype reads exactly the export the app ships.
