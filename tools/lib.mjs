// Shared test utilities for the Hinterland consistency suite.
// Provides: JSDOM gen() for UI tests, engine-only genEngine() for fast data tests,
// GeoJSON helpers, geometry, statistics, and assertion primitives.

import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import * as d3d from "d3-delaunay";

// ---- d3-delaunay global (needed by engine for buildTopology) -----------------
const setupEngine = (() => {
  let engine = null;
  return async () => {
    if (engine) return engine;
    globalThis.d3 = { Delaunay: d3d.Delaunay, Voronoi: d3d.Voronoi };
    engine = await import("../src/engine/engine.mjs");
    return engine;
  };
})();

// ---- Test infrastructure -----------------------------------------------------
let failures = 0;
const fail = (m) => { console.error("FAIL: " + m); failures++; };
const ok = (m) => console.log("ok  : " + m);

// ---- JSDOM-based generation (for tests that need DOM) -----------------------
let _html = null;
function loadHtml() {
  if (!_html) _html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  return _html;
}

async function gen(hash, keepDom = false) {
  let captured = null;
  const html = loadHtml();
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://h.test/" + (hash || ""),
    beforeParse(window) {
      // d3-delaunay is loaded by the <script> tag in index.html, but
      // JSDOM runs the inline <script> which looks for globalThis.d3
      window.d3 = { Delaunay: d3d.Delaunay, Voronoi: d3d.Voronoi };
      const RB = window.Blob;
      window.Blob = class extends RB { constructor(p, o) { super(p, o); captured = p.join(""); } };
      window.URL.createObjectURL = () => "blob:x";
      window.URL.revokeObjectURL = () => {};
      window.HTMLAnchorElement.prototype.click = function () {};
    },
  });
  const doc = dom.window.document;
  doc.getElementById("download").click();
  const gj = JSON.parse(captured);
  doc.getElementById("dlSeries").click();
  const series = JSON.parse(captured);
  doc.getElementById("dlChron").click();
  const chron = captured;
  if (!keepDom) dom.window.close();
  await new Promise((r) => setImmediate(r));
  if (!keepDom && typeof global !== "undefined" && global.gc) global.gc();
  if (!keepDom) return { gj, series, chron, doc: null, window: null };
  return { gj, series, chron, doc, window: dom.window };
}

// ---- Fast engine-only generation (no JSDOM, no DOM) --------------------------
// Parses a URL hash like "#seed=alpha&regions=24&ep=10" and runs the
// engine pipeline directly. Returns { gj, series, chron } — same shape
// as gen() but without doc/window.
async function genEngine(hash) {
  const eng = await setupEngine();
  const raw = (hash || "").replace(/^#/, "");
  const query = {};
  raw.split("&").forEach(p => {
    const [k, v] = p.split("=");
    if (k) query[k] = v;
  });

  const S = { ...eng.DEFAULTS };

  if (query.seed !== undefined && query.seed.trim() !== "") S.seed = query.seed;
  if (query.fate !== undefined) S.fate = query.fate || "";
  if (query.world !== undefined) S.world = query.world;
  const n = (key, def, lo, hi) => {
    const v = query[key];
    const val = (v !== undefined && v.trim() !== "" && isFinite(+v)) ? +v : def;
    return (lo !== undefined && hi !== undefined) ? Math.max(lo, Math.min(hi, val)) : val;
  };
  S.regions = n("regions", S.regions, 5, 64);
  S.relax = n("relax", S.relax, 0, 20);
  S.bias = n("bias", S.bias);
  S.we = n("we", S.we, 0, 100);
  S.wf = n("wf", S.wf, 0, 100);
  S.wt = n("wt", S.wt, 0, 100);
  S.wg = n("wg", S.wg, 0, 100);
  S.gt = n("gt", S.gt, 0, 100);
  S.db = n("db", S.db, 0, 100);
  S.iq = n("iq", S.iq, 0, 100);
  S.order = n("order", S.order, 0, 100);
  S.openness = n("openness", S.openness, 0, 100);
  S.hb = n("hb", S.hb, 0, 1);
  // B10 forward-compat: hb retired into openness. If openness is absent from
  // the hash but hb=0 appears, map it to openness=0 (the old "sealed quays" link).
  // Reverse: if openness=0 was set directly, also set hb=0 so harbors_closed reads true.
  if (!("openness" in query) && S.hb === 0) S.openness = 0;
  if (S.openness === 0) S.hb = 0;
  S.ep = n("ep", S.ep, 0, 99);
  if (query.capital !== undefined) {
    const parts = query.capital.split(",").map(Number);
    if (parts.length === 2 && parts.every(isFinite)) S.capital = parts;
  }
  if (query.cx !== undefined && query.cy !== undefined) {
    S.capital = [+query.cx, +query.cy];
  }

  const regions = eng.buildTopology(S);
  const geo = eng.buildGeology(regions, S);
  const model = eng.applyAttributes(regions, S, geo);
  const gj = eng.toGeoJSON(model, S);
  const series = S.ep > 0 ? eng.toEpochSeries(model, S) : null;
  const chron = eng.composeChronicle(model, S);

  return { gj, series, chron };
}

// ---- GeoJSON extraction helpers ----------------------------------------------
const regionsOf = (gj) => gj.features.filter(f => f.properties.kind === "region");
const ridgesOf = (gj) => gj.features.filter(f => f.properties.kind === "ridge");
const riversOf = (gj) => gj.features.filter(f => f.properties.kind === "river");
const coastsOf = (gj) => gj.features.filter(f => f.properties.kind === "coast");
const portsOf = (gj) => gj.features.filter(f => f.properties.kind === "port");
const ruinsOf = (gj) => gj.features.filter(f => f.properties.kind === "ruin");
const bridgesOf = (gj) => gj.features.filter(f => f.properties.kind === "bridge");
const towersOf = (gj) => gj.features.filter(f => f.properties.kind === "tower");
const maelOf = (gj) => gj.features.filter(f => f.properties.kind === "maelstrom");
const passesOf = (gj) => gj.features.filter(f => f.properties.kind === "pass");
const settlesOf = (gj) => gj.features.filter(f => f.properties.kind === "settlement");
const conduitOf = (gj) => gj.features.filter(f => f.properties.kind === "grid");
const facilitiesOf = (gj) => gj.features.filter(f => f.properties.kind === "facility");
const sanctOf = (gj) => gj.features.filter(f => f.properties.kind === "sanctioned_site");
const roadsOf = (gj) => gj.features.filter(f => f.properties.kind === "road");
const garrisonsOf = (gj) => gj.features.filter(f => f.properties.kind === "constabulary");
const rings = (gj) => regionsOf(gj).map(f => JSON.stringify(f.geometry.coordinates));
const col = (gj, name) => regionsOf(gj).map(f => f.properties[name]);
const geology = (gj) => JSON.stringify(regionsOf(gj).map(f => [
  f.properties.aetherstone_endowment, f.properties.terrain_ruggedness, f.properties.fertility]));

// ---- Geometry primitives -----------------------------------------------------
function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function segInt(p, q, a, b) {
  const d1x = q[0] - p[0], d1y = q[1] - p[1], d2x = b[0] - a[0], d2y = b[1] - a[1];
  const den = d1x * d2y - d1y * d2x;
  if (den === 0) return null;
  const t = ((a[0] - p[0]) * d2y - (a[1] - p[1]) * d2x) / den;
  const u = ((a[0] - p[0]) * d1y - (a[1] - p[1]) * d1x) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [p[0] + t * d1x, p[1] + t * d1y];
}

// ---- Statistical helpers -----------------------------------------------------
const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const med = (xs) => { const t = xs.slice().sort((a, b) => a - b); return t.length ? t[Math.floor(t.length / 2)] : 0; };
const r1 = (v) => Math.round(v * 10) / 10;
const cen = (ring) => {
  let sx = 0, sy = 0;
  for (const [x, y] of ring) { sx += x; sy += y; }
  return [sx / ring.length, sy / ring.length];
};
const median = (arr) => {
  const xs = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2;
};
function pearson(xs, ys) {
  const n = xs.length, mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  const d = Math.sqrt(sxx * syy);
  return d < 1e-12 ? 0 : sxy / d;
}
function giniOf(xs) {
  const t = xs.slice().sort((a, b) => a - b);
  const m = mean(t);
  if (m === 0) return 0;
  let g = 0;
  for (let i = 0; i < t.length; i++) g += (2 * (i + 1) - t.length - 1) * t[i];
  return Math.round(g / (t.length * t.length * m) * 100) / 100;
}
function wgini(gs) {
  const P = gs.reduce((a, g) => a + g.p, 0);
  const mu = P > 0 ? gs.reduce((a, g) => a + g.p * g.v, 0) / P : 0;
  if (!(mu > 0)) return 0;
  let s = 0;
  for (const a of gs) for (const b of gs) s += a.p * b.p * Math.abs(a.v - b.v);
  return Math.round(s / (2 * P * P * mu) * 100) / 100;
}

const getFailures = () => failures;

export {
  // test runner
  fail, ok, getFailures,
  // generation
  gen, genEngine, setupEngine,
  // extraction
  regionsOf, ridgesOf, riversOf, coastsOf, portsOf, ruinsOf, bridgesOf, towersOf,
  maelOf, passesOf, settlesOf, conduitOf, facilitiesOf, sanctOf, roadsOf, garrisonsOf,
  rings, col, geology,
  // geometry
  pointInRing, segInt,
  // statistics
  mean, med, r1, cen, median, pearson, giniOf, wgini,
};
