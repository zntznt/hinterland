# tools — the evidence

Every "measured across N worlds" number and every "the test suite does"
sentence in the docs has a producer here. The suite runs the REAL page
(jsdom executes `../index.html` and clicks its own export buttons), so
what is tested is what ships.

```sh
cd tools
npm install                                   # jsdom + d3-delaunay
node --max-old-space-size=14000 test.mjs      # the main suite (~241 checks + the fixture pin)
node --max-old-space-size=10000 stress.mjs    # 120-config structural stress + render smoke
node --max-old-space-size=8192  atlas.mjs     # regenerates ../docs/atlas.md (80-world sweep)
node --max-old-space-size=8192  sweep.mjs     # prints the knob-reach + chronicle-sameness table (~1 min; measured, not pinned)
node --max-old-space-size=8192  refixture.mjs # regenerates the golden fixtures (a declared act — see below)
```

Two processes on purpose: jsdom retains memory per world, and the full
run generates several hundred worlds — split, each pass fits in an
ordinary 16 GB container. Both must end `ALL PASS`; a nonzero exit code
means a failed check, printed with its measured value.

The suite's acceptance thresholds were MEASURED before they were pinned
(the numbers in the docs are these numbers), and re-pins are documented
in the schema history — never silently adjusted.

## The golden fixtures — the byte-pin (issue #118)

`fixtures/` holds the frozen exports of a **seed×knob matrix** — 6 seeds ×
{ default + 4 knob configs } × { `world.geojson`, `events.csv`,
`chronicle.md` }, 30 cells, generated at 12 regions and `ep=10`. The last
check in `test.mjs` re-derives every cell live and asserts it is **equal
modulo an explicit allowlist** to the frozen bytes. The matrix and the
compare live in `fixtures.matrix.mjs`, imported by both the checker
(`test.mjs`) and the writer (`refixture.mjs`) so the two can never diverge.

The pin is **strict** on world state (features), events, and chronicle
text, and **tolerant only** where the direction's allowlist says:

- `hinterland.schema_version` may differ (a bump is a declared act);
- provenance may gain keys the fixture lacks, but only when they are
  **empty** (a new param's key is emitted only when that param is
  non-default — a default cell never sees it);
- `events.csv` may gain columns, but only when **unsteered** (every new
  cell empty for these configs).

Anything else — a moved coordinate, a reordered event, a reworded line —
is a real diff and the check fails.

### The regeneration ritual

A world moving is not a bug; it is a **schema event**, and it is regenerated
on purpose, never as a silent side effect of a model PR:

1. `node --max-old-space-size=8192 refixture.mjs` — re-derives all 30 cells,
   overwrites only the files that moved, and prints each one.
2. `git diff tools/fixtures` — read exactly what moved. The geojson is stored
   canonicalized (minified) for size; pretty-print a cell to inspect it:
   `jq . tools/fixtures/default__fix-1/world.geojson`.
3. Add a line to `../CHANGELOG.md`'s schema history saying **why** the world
   moved. A fixture change with no CHANGELOG entry is the thing this pin
   exists to catch.
