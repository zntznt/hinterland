# tools — the evidence

Every "measured across N worlds" number and every "the test suite does"
sentence in the docs has a producer here. The suite runs the REAL page
(jsdom executes `../index.html` and clicks its own export buttons), so
what is tested is what ships.

```sh
cd tools
npm install                                   # jsdom + d3-delaunay
node --max-old-space-size=13000 test.mjs      # the main suite (~237 checks)
node --max-old-space-size=10000 stress.mjs    # 120-config structural stress + render smoke
node --max-old-space-size=8192  atlas.mjs     # regenerates ../docs/atlas.md (80-world sweep)
```

Two processes on purpose: jsdom retains memory per world, and the full
run generates several hundred worlds — split, each pass fits in an
ordinary 16 GB container. Both must end `ALL PASS`; a nonzero exit code
means a failed check, printed with its measured value.

The suite's acceptance thresholds were MEASURED before they were pinned
(the numbers in the docs are these numbers), and re-pins are documented
in the schema history — never silently adjusted.
