// The diagnosis sweep (issue #120, A3): the tracked numbers that tell us
// whether the knobs REACH (a dial that moves nothing is a lie) and whether the
// worlds are DISTINCT (one templated story wearing many seeds is the failure
// this project exists to avoid). Promoted out of the inline measurements in
// test.mjs so the reach/sameness table is a thing you can run and read.
//
//   node --max-old-space-size=8192 sweep.mjs
//
// These are MEASURED, not pinned — the ceilings land in D4 (#140). Until then
// this is an instrument, printed for the eye, not an assertion.
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import * as d3d from "d3-delaunay";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

// One world, the page's own exports + the findings lead the panel shows.
function gen(hash) {
  let cap = null;
  const dom = new JSDOM(html, {
    runScripts: "dangerously", url: "https://h.test/" + hash,
    beforeParse(w) {
      w.d3 = { Delaunay: d3d.Delaunay, Voronoi: d3d.Voronoi };
      const RB = w.Blob; w.Blob = class extends RB { constructor(p, o) { super(p, o); cap = p.join(""); } };
      w.URL.createObjectURL = () => "blob:x"; w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () {};
    },
  });
  const doc = dom.window.document;
  doc.getElementById("download").click(); const gj = JSON.parse(cap);
  const lead = (doc.getElementById("findingsText") || {}).textContent || "";
  doc.getElementById("dlChron").click(); const chron = cap;
  dom.window.close();
  return { gj, lead, chron };
}
const regionsOf = (g) => g.features.filter(f => f.properties.kind === "region");
const col = (g, name) => regionsOf(g).map(f => f.properties[name]);
const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const r1 = (v) => Math.round(v * 10) / 10;

const BASE = "regions=20&ep=10";
const SEED = "sweep";

// ---- 1. Knob reach: does moving the dial move the world? -------------------
// Each knob is pushed to an extreme against a fixed seed; we report how far the
// wealth vector moved and whether the events and the chronicle changed at all.
// A knob whose reach is ~0 everywhere is a dial wired to nothing.
console.log(`KNOB REACH (seed=${SEED}, ${BASE}) — did the dial move the world?`);
console.log("  knob        meanΔwealth   events   chronicle");
const base = gen(`#seed=${SEED}&${BASE}`);
const KNOBS = [
  ["db", 0], ["gt", 0], ["iq", 100], ["wg", 0],
  ["we", 100], ["wf", 100], ["wt", 100], ["bias", 0], ["hb", 0],
];
for (const [k, v] of KNOBS) {
  const g = gen(`#seed=${SEED}&${BASE}&${k}=${v}`);
  const w0 = col(base.gj, "wealth"), w1 = col(g.gj, "wealth");
  const dW = r1(mean(w0.map((x, i) => Math.abs(x - w1[i]))));
  const evCh = JSON.stringify(base.gj.hinterland.events) !== JSON.stringify(g.gj.hinterland.events);
  const chCh = base.chron !== g.chron;
  console.log(`  ${(k + "=" + v).padEnd(10)}  ${String(dW).padStart(9)}   ${(evCh ? "moved" : "—").padEnd(6)}   ${chCh ? "moved" : "—"}`);
}

// ---- 2. Chronicle sameness: are the worlds distinct, or one template? ------
// Across N seeds we count DISTINCT opening claims (the findings lead) — the
// fraction that are unique — and a crude cross-seed chronicle overlap (mean
// pairwise shared-line Jaccard). Higher distinctness / lower overlap = the
// worlds tell their own stories. The real skeleton-masked ceilings land in D4.
const N = 24;
console.log(`\nCHRONICLE SAMENESS (${N} seeds, ${BASE}) — one story, or many?`);
const worlds = [];
for (let i = 0; i < N; i++) worlds.push(gen(`#seed=${SEED}-${i}&${BASE}`));
const leads = new Set(worlds.map(w => w.lead.slice(0, 110)));
const lineSet = (t) => new Set(t.split("\n").map(s => s.trim()).filter(s => s.length > 8));
const sets = worlds.map(w => lineSet(w.chron));
let pairs = 0, jac = 0;
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
  const a = sets[i], b = sets[j]; let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const uni = a.size + b.size - inter;
  jac += uni ? inter / uni : 0; pairs++;
}
console.log(`  distinct opening claims : ${leads.size}/${N} (${Math.round(100 * leads.size / N)}%)`);
console.log(`  mean cross-seed chronicle line-overlap (Jaccard) : ${r1(100 * jac / pairs)}%`);

// ---- 3. Cross-knob sameness within one seed --------------------------------
// The same seed under different knobs SHOULD still tell recognizably different
// stories where the knob bites; a high within-seed overlap means the dials
// barely touch the prose. (Tracked, not pinned — D4.)
console.log(`\nCROSS-KNOB SAMENESS (seed=${SEED}, one seed under ${KNOBS.length} knob extremes)`);
const knobWorlds = [base, ...KNOBS.map(([k, v]) => gen(`#seed=${SEED}&${BASE}&${k}=${v}`))];
const kleads = new Set(knobWorlds.map(w => w.lead.slice(0, 110)));
console.log(`  distinct opening claims under knob extremes : ${kleads.size}/${knobWorlds.length}`);

// ---- 4. Verdict diversity (§7.3 precursor, B2 #124) ------------------------
// The de-moralized verdict (§3.5) is a two-axis judgement, not a banner: did the
// GAP widen / hold / close (gini vs founding), and did the FLOOR — p10 regional
// wealth (§3.4) — rise or fall? A world engine that only ever lands in one corner
// is exactly the mush this project exists to avoid, so we count how many of the
// six gap×floor quadrants the seed sweep reaches. The B2 investment pool is the
// first mechanism that can push a world into "gap widened while the floor rose"
// (development finance) as readily as "gap widened, floor fell" (comprador
// extraction). §7.3's tripwire: ≥3 distinct quadrants, or the space has collapsed.
console.log(`\nVERDICT DIVERSITY (${N} seeds, ${BASE}) — the gap × floor space (§3.5)`);
const quad = new Map();
for (const w of worlds) {
  const f = w.gj.hinterland.findings;
  const dGap = f.gini - f.gini_t0, dFloor = f.floor.p10 - f.floor.p10_t0;
  const g = dGap <= -0.02 ? "gap closed" : dGap >= 0.02 ? "gap widened" : "gap held";
  const fl = dFloor > 0 ? "floor rose" : "floor fell";
  const key = `${g} × ${fl}`;
  quad.set(key, (quad.get(key) || 0) + 1);
}
for (const [k, v] of [...quad.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(26)} ${String(v).padStart(2)}`);
console.log(`  distinct gap×floor quadrants : ${quad.size}/6  (§7.3 floor: ≥3)`);

console.log("\nsweep done — measurements only; the ceilings are pinned in D4 (#140).");
