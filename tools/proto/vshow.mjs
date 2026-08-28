import { setupEngine } from "../lib.mjs";
const E = await setupEngine();
const of_ = (h) => { const S = E.parseHash(h); const r = E.buildTopology(S), g = E.buildGeology(r, S);
  const m = E.applyAttributes(r, S, g); return { m, S }; };
console.log("# lint");
const probs = E.loomLint(E.VERDICT_POOL);
const n = Object.values(E.VERDICT_POOL).reduce((a,v)=>a+v.length,0);
console.log(`  ${n} fragments over ${Object.keys(E.VERDICT_POOL).length} classes | ${probs.length ? "PROBLEMS" : "CLEAN"}`);
for (const p of probs.slice(0,10)) console.log("   ", p);
console.log("\n# five verdicts");
for (const sd of ["v5-0","v5-1","v5-3","v5-7","v5-12"]) {
  const { m, S } = of_(`#seed=${sd}&regions=24&ep=10`);
  const v = E.composeVerdict(m, S);
  const bad = E.loomAudit(v, "judge", null);
  console.log(`\n[${v.class}]${bad.ok ? "" : "  AUDIT: " + JSON.stringify(bad.offenders.slice(0,2))}`);
  console.log("  " + v.text);
}
