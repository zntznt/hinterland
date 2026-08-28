import { setupEngine } from "../lib.mjs";
const E = await setupEngine();
const of_ = (h) => { const S = E.parseHash(h); const r = E.buildTopology(S), g = E.buildGeology(r, S);
  return E.getFindings(E.applyAttributes(r, S, g)); };
const found = new Map(), hits = [];
let n = 0;
for (let i = 0; i < 400; i++) {
  const h = `#seed=hunt-${i}&regions=24&ep=10`;
  const F = of_(h); n++;
  found.set(F.verdict.cell, (found.get(F.verdict.cell) || 0) + 1);
  if (F.verdict.cell === "unequal growth") hits.push({ h, cls: F.verdict.class });
}
console.log(`# ${n} worlds at DEFAULTS (regions=24, ep=10)`);
for (const [c, k] of [...found].sort((a,b)=>b[1]-a[1])) console.log(`  ${String(k).padStart(4)}  ${(100*k/n).toFixed(1).padStart(5)}%  ${c}`);
console.log(`\nunequal growth: ${hits.length}/${n}` + (hits.length ? "" : "  — NOT REACHED AT DEFAULTS"));
for (const x of hits.slice(0, 5)) console.log(`   ${x.h}  ${x.cls}`);
