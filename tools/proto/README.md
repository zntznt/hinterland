# `tools/proto` — prototypes that run against the generator, outside the suite

Nothing in here is imported by `test.mjs`, `stress.mjs`, `sweep.mjs`, `atlas.mjs` or
`bundle.mjs`, and nothing in here is loaded by the app. These are gate artifacts: a
prototype is built, run, judged, and then either promoted into the app in a separate PR
or left standing as the record of a gate that did not open.

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
