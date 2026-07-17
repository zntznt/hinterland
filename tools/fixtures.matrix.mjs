// The golden-fixture matrix (issue #118 — Phase A1) and its shared machinery.
//
// This is the byte-pin every later pivot PR answers to: the exact exports of a
// seed×knob matrix, frozen in tools/fixtures/, that the suite re-derives and
// compares on every run. A model change that moves a world moves these bytes,
// and the check fails until the change is DECLARED (node tools/refixture.mjs +
// a CHANGELOG schema entry). refixture.mjs (the writer) and test.mjs (the
// checker) both import from here, so the frozen bytes and the live bytes can
// never be produced two different ways.
import { JSDOM } from "jsdom";
import * as d3d from "d3-delaunay";

// ≥6 seeds × { default + 4 knob configs }, ep>0 — the matrix §6/A1 names.
export const SEEDS = ["fix-1", "fix-2", "fix-3", "fix-4", "fix-5", "fix-6"];

// A common base (a mid-sized world, dynamics on so ep>0 is exercised) with
// four knobs layered on, each isolating a distinct mechanism so a change
// anywhere in the model trips at least one cell:
//   db=0   the blight stays at the works (dumping policy off)
//   gt=0   the conduit reaches everyone (the grid)
//   wg=0   no authored wealth gradient (the emergent economy)
//   iq=100 the seat hears every wound (responsiveness / the granary)
// 12 regions keeps each snapshot lean while still growing rivers, edges,
// gates and a full event history — enough surface for a model change to move.
export const BASE = "regions=12&ep=10";
export const CONFIGS = [
  { id: "default", knobs: "" },
  { id: "db0", knobs: "db=0" },
  { id: "gt0", knobs: "gt=0" },
  { id: "wg0", knobs: "wg=0" },
  { id: "iq100", knobs: "iq=100" },
];

export const cellHash = (seed, cfg) =>
  `#seed=${seed}&${BASE}${cfg.knobs ? "&" + cfg.knobs : ""}`;
export const cellId = (seed, cfg) => `${cfg.id}__${seed}`;
export function cells() {
  const out = [];
  for (const cfg of CONFIGS)
    for (const seed of SEEDS)
      out.push({ id: cellId(seed, cfg), seed, cfg, hash: cellHash(seed, cfg) });
  return out;
}

// The three pinned artifacts (GeoJSON + events.csv + chronicle.md), captured
// from a live world by clicking the page's OWN export buttons — what ships is
// what's pinned. dlTables fires six blobs in a fixed order (events.csv first);
// the Blob list is reset before each click so a boot-time or render-time blob
// could never leak in. The caller owns the JSDOM lifecycle discipline.
export function captureCell(html, hash) {
  const blobs = [];
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://h.test/" + (hash || ""),
    beforeParse(window) {
      window.d3 = { Delaunay: d3d.Delaunay, Voronoi: d3d.Voronoi };
      const RB = window.Blob;
      window.Blob = class extends RB { constructor(p, o) { super(p, o); blobs.push(p.join("")); } };
      window.URL.createObjectURL = () => "blob:x";
      window.URL.revokeObjectURL = () => {};
      window.HTMLAnchorElement.prototype.click = function () {};
    },
  });
  const doc = dom.window.document;
  blobs.length = 0; doc.getElementById("download").click();
  const geojson = blobs[blobs.length - 1];
  blobs.length = 0; doc.getElementById("dlTables").click();
  const eventsCsv = blobs[0]; // events.csv is the first of the six tables
  blobs.length = 0; doc.getElementById("dlChron").click();
  const chronicle = blobs[blobs.length - 1];
  dom.window.close();
  return { geojson, eventsCsv, chronicle };
}

// ---- assert-equal-modulo-allowlist --------------------------------------
// The pin is STRICT on world state — features, events, chronicle bytes — and
// tolerant only where the direction's allowlist says to be:
//   (a) hinterland.schema_version may differ (a bump is a declared act);
//   (b) provenance may gain keys the fixture lacks, but ONLY when they are
//       empty — a new param's key is emitted only when that param is non-
//       default, so a default cell never sees it, and an empty one is safe
//       forward-compat, not a world change;
//   (c) events.csv may gain columns, but ONLY when unsteered — every new cell
//       empty for these configs.
// Anything else — a moved coordinate, a reordered event, a reworded line — is
// a real diff and the returned problem list is non-empty.
const isEmpty = (v) =>
  v === null || v === undefined || v === false || v === 0 || v === "" ||
  (Array.isArray(v) && v.length === 0) ||
  (v && typeof v === "object" && Object.keys(v).length === 0);
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function provDiff(fixProv, curProv) {
  const problems = [];
  const fx = { ...fixProv }, cu = { ...curProv };
  delete fx.schema_version; delete cu.schema_version; // allowlist (a)
  for (const k of Object.keys(fx)) {
    if (!(k in cu)) problems.push(`provenance lost key '${k}'`);
    else if (!deepEqual(fx[k], cu[k])) problems.push(`provenance key '${k}' changed`);
  }
  for (const k of Object.keys(cu)) // allowlist (b): added keys must be empty
    if (!(k in fx) && !isEmpty(cu[k])) problems.push(`provenance gained non-empty key '${k}'`);
  return problems;
}

export function geojsonDiff(fixStr, curStr) {
  let fx, cu;
  try { fx = JSON.parse(fixStr); } catch { return ["fixture geojson unparseable"]; }
  try { cu = JSON.parse(curStr); } catch { return ["current geojson unparseable"]; }
  const problems = [];
  if (fx.type !== cu.type) problems.push("geojson 'type' changed");
  if (fx.name !== cu.name) problems.push("geojson 'name' changed");
  if (!deepEqual(fx.features, cu.features)) problems.push("features differ — the world moved");
  problems.push(...provDiff(fx.hinterland || {}, cu.hinterland || {}));
  return problems;
}

export function csvDiff(fixStr, curStr) {
  const fx = fixStr.replace(/\n$/, "").split("\n");
  const cu = curStr.replace(/\n$/, "").split("\n");
  if (fx.length !== cu.length) return [`events.csv row count ${cu.length} != ${fx.length}`];
  const fh = fx[0].split(","), ch = cu[0].split(",");
  if (ch.length < fh.length) return [`events.csv lost columns (${ch.length} < ${fh.length})`];
  const problems = [];
  for (let i = 0; i < fh.length; i++) // fixture header must be a prefix of current
    if (fh[i] !== ch[i]) problems.push(`events.csv column ${i} changed: '${ch[i]}' != '${fh[i]}'`);
  if (problems.length) return problems;
  // allowlist (c): appended columns add one empty cell (one comma) per column;
  // the fixture portion of every row must be byte-identical.
  const pad = ",".repeat(ch.length - fh.length);
  for (let r = 1; r < fx.length; r++)
    if (cu[r] !== fx[r] + pad) return [`events.csv row ${r} changed`];
  return problems;
}

export function chronicleDiff(fixStr, curStr) {
  return fixStr === curStr ? [] : ["chronicle text differs"];
}

// How the geojson is stored on disk: canonical (minified) JSON. The check
// parses before comparing (geojsonDiff), so the pin is on world state, not on
// export whitespace — and the fixtures stay ~4× smaller than the pretty
// download. events.csv and chronicle.md are stored exactly as exported.
export const canonicalGeojson = (str) => JSON.stringify(JSON.parse(str));
