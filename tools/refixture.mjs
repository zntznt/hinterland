// Regenerate the golden fixtures (issue #118 — Phase A1). A DECLARED act.
//
// The suite's fixture check re-derives these exports on every run and fails if
// they've drifted. When a model PR MEANS to move a world, that is not a bug —
// it is a schema event — and this script is how you record it: run it, read the
// diff it prints, `git diff tools/fixtures` to see exactly what moved, and add
// a line to CHANGELOG.md's schema history saying why. Never let a model change
// overwrite the fixtures as a silent side effect; the whole point of the pin is
// that a world moving is a thing a human signed for.
//
//   node --max-old-space-size=8192 tools/refixture.mjs
//
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cells, captureCell, canonicalGeojson } from "./fixtures.matrix.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "..", "index.html"), "utf8");
const fixRoot = join(here, "fixtures");

const all = cells();
let changed = 0, files = 0;
for (const cell of all) {
  const cap = captureCell(html, cell.hash);
  const artifacts = {
    "world.geojson": canonicalGeojson(cap.geojson),
    "events.csv": cap.eventsCsv,
    "chronicle.md": cap.chronicle,
  };
  const cellDir = join(fixRoot, cell.id);
  mkdirSync(cellDir, { recursive: true });
  for (const [fname, next] of Object.entries(artifacts)) {
    files++;
    const path = join(cellDir, fname);
    let prev = null;
    try { prev = readFileSync(path, "utf8"); } catch { /* new fixture */ }
    if (prev !== next) {
      writeFileSync(path, next);
      changed++;
      console.log(`  ${prev === null ? "new  " : "moved"}  ${cell.id}/${fname}`);
    }
  }
}
console.log(
  changed
    ? `\nrefixture: ${changed}/${files} file(s) updated across ${all.length} cells.\n` +
      `Record WHY in CHANGELOG.md's schema history — a moved world is a declared event.`
    : `\nrefixture: no changes — all ${files} files across ${all.length} cells already match index.html.`,
);
