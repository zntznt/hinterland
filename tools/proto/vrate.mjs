// #141: how rare is `unequal growth` (a widening gap over a RISING floor) at
// defaults? Earlier statements were bounds taken from single seed families; this
// measures a rate across several, so the docs can quote one.
import { setupEngine } from "../lib.mjs";
const E = await setupEngine();
const of_ = (h) => { const S = E.parseHash(h); const r = E.buildTopology(S), g = E.buildGeology(r, S);
  return E.getFindings(E.applyAttributes(r, S, g)); };
const FAMS = ["v5", "v5s", "hunt", "atlas", "ir", "vd", "fl", "vp"];
const PER = 150;
let n = 0, widened = 0, widenedRose = 0;
const cells = new Map(), hits = [];
for (const f of FAMS) for (let i = 0; i < PER; i++) {
  const F = of_(`#seed=${f}-${i}&regions=24&ep=10`); n++;
  cells.set(F.verdict.cell, (cells.get(F.verdict.cell) || 0) + 1);
  if (F.verdict.gap === "widened") { widened++; if (F.verdict.floor === "rose") widenedRose++; }
  if (F.verdict.cell === "unequal growth") hits.push(`${f}-${i}`);
}
console.log(`# ${n} worlds at defaults (regions=24, ep=10) across ${FAMS.length} seed families`);
for (const [c, k] of [...cells].sort((a, b) => b[1] - a[1]))
  console.log(`  ${String(k).padStart(5)}  ${(100 * k / n).toFixed(2).padStart(6)}%  ${c}`);
console.log(`\nunequal growth: ${hits.length}/${n} = ${(100 * hits.length / n).toFixed(2)}%  (1 in ${hits.length ? Math.round(n / hits.length) : "∞"})`);
console.log(`  seeds: ${hits.slice(0, 8).join(", ") || "none"}`);
console.log(`\nthe mechanism: of ${widened} worlds whose gap widened, ${widenedRose} also raised the floor`);
console.log(`  = ${(100 * widenedRose / Math.max(1, widened)).toFixed(1)}%, about 1 in ${widenedRose ? Math.round(widened / widenedRose) : "∞"}`);
