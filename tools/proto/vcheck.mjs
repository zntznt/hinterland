import { setupEngine } from "../lib.mjs";
const E = await setupEngine();
const of_ = (h) => { const S = E.parseHash(h); const r = E.buildTopology(S), g = E.buildGeology(r, S);
  const m = E.applyAttributes(r, S, g); return { m, S }; };
let digits = 0, offenders = 0, facts = 0, disagree = 0, n = 0;
const cells = new Map(), classes = new Map(), reached = new Set();
for (let i = 0; i < 80; i++) {
  const { m, S } = of_(`#seed=v5-${i}&regions=24&ep=10`); n++;
  const v = E.composeVerdict(m, S);
  if (/\d/.test(v.text)) { digits++; if (digits < 3) console.log("  DIGIT:", v.text.slice(0,120)); }
  const a = E.loomAudit(v, "judge", null);
  facts += v.facts.length;
  if (!a.ok) { offenders += a.offenders.length; if (offenders < 3) console.log("  AUDIT:", JSON.stringify(a.offenders[0])); }
  const F = E.getFindings(m);
  cells.set(F.verdict.cell, (cells.get(F.verdict.cell)||0)+1);
  classes.set(F.verdict.class, (classes.get(F.verdict.class)||0)+1);
  reached.add(F.verdict.cell);
  // one verdict function: the band's lead, the chronicle's close and the judge agree
  // "one verdict function" is not "one wording": each surface draws on its own
  // substream by design. The invariant is that no surface can claim a DIFFERENT
  // verdict, so every surface's prose must be a realization of THIS cell's class.
  const chron = E.composeChronicle(m, S);
  const vc = E.verdictCtx(m, S);
  const hay = chron.toLowerCase();
  const said = (E.VERDICT_POOL.claim || []).filter(f => f.req(vc))
    .map(f => E.loomFill(f.t, vc, "judge", E.verdictResolve, [], []));
  if (!said.some(t => hay.includes(t.toLowerCase()))) disagree++;
}
console.log(`# ${n} worlds at defaults`);
console.log(`  numerals in judge prose: ${digits} (the spelled law forbids any)`);
console.log(`  audited facts ${facts}, offenders ${offenders}`);
console.log(`  surfaces claiming a verdict other than this world's cell: ${disagree}`);
const tot = [...classes.values()].reduce((a,b)=>a+b,0);
const max = Math.max(...classes.values());
console.log(`  §7.3: ${classes.size} classes, largest ${(100*max/tot).toFixed(0)}% — ${classes.size>=6 && max/tot<=0.40 ? "PASS":"MISS"}`);
console.log(`  cells reached: ${[...reached].join(", ")}`);
const POOL = E.VERDICT_POOL.claim;
for (const c of ["shared rise","leveling down","quiet growth","quiet decay","unequal growth","extraction"]) {
  const k = POOL.filter(f => f.req({cell:c})).length;
  console.log(`    ${reached.has(c)?"reached":"UNREACHED"}  ${c.padEnd(16)} ${k} claim fragments`);
}
