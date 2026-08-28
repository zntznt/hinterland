import { setupEngine } from "../lib.mjs";
const E = await setupEngine();
const of_ = (h) => { const S = E.parseHash(h); const r = E.buildTopology(S), g = E.buildGeology(r, S);
  const m = E.applyAttributes(r, S, g); return E.getFindings(m); };
const rows = [];
const KNOBS = ["", "&db=0", "&db=100", "&gt=0", "&gt=100", "&iq=0", "&iq=100", "&wg=0", "&we=100", "&wf=100", "&bias=0", "&bias=100", "&openness=0", "&openness=100"];
for (const k of KNOBS) for (let i = 0; i < 24; i++) {
  const F = of_(`#seed=vp-${i}&regions=24&ep=10${k}`);
  const dG = F.gini - F.gini_t0, dF = F.floor.p10 - F.floor.p10_t0;
  const gr = F.growth.per_capita_t0 > 0 ? F.growth.per_capita / F.growth.per_capita_t0 : 1;
  rows.push({ k: k || "(defaults)", cls: F.verdict.class, cell: F.verdict.cell, dG, dF, gr });
}
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
const grs = rows.map(r => r.gr);
console.log(`# growth ratio (per-capita close / founding), ${rows.length} worlds across ${KNOBS.length} knob settings`);
console.log(`  min ${q(grs,0).toFixed(2)}  p10 ${q(grs,.1).toFixed(2)}  p25 ${q(grs,.25).toFixed(2)}  median ${q(grs,.5).toFixed(2)}  p75 ${q(grs,.75).toFixed(2)}  p90 ${q(grs,.9).toFixed(2)}  max ${q(grs,1).toFixed(2)}`);
console.log(`  >=1.08 "boom": ${grs.filter(v=>v>=1.08).length}   <=0.92 "collapse": ${grs.filter(v=>v<=0.92).length}   between "stagnant": ${grs.filter(v=>v>0.92&&v<1.08).length}`);
const cells = new Map(); for (const r of rows) cells.set(r.cell, (cells.get(r.cell)||0)+1);
console.log(`\n# cells reached anywhere in the knob space`);
for (const [c,n] of [...cells].sort((a,b)=>b[1]-a[1])) console.log(`  ${String(n).padStart(4)}  ${c}`);
const hit = rows.filter(r => r.cell === "unequal growth");
console.log(`\n"unequal growth": ${hit.length} of ${rows.length}` + (hit.length ? ` — e.g. ${hit[0].k}` : " — NEVER REACHED"));
const near = rows.filter(r => r.dG >= 0.04).map(r => r.dF).sort((a,b)=>b-a);
console.log(`\nAmong the ${near.length} worlds whose gap WIDENED, the floor move (p10 - p10_t0) runs`);
console.log(`  max ${near[0]}  median ${near[Math.floor(near.length/2)]}  min ${near[near.length-1]}`);
console.log(`  positive ${near.filter(v=>v>0).length} | zero ${near.filter(v=>v===0).length} | negative ${near.filter(v=>v<0).length}`);
const p10s = rows.map(r => r.dF);
console.log(`\nfloor move across ALL worlds: positive ${p10s.filter(v=>v>0).length} | zero ${p10s.filter(v=>v===0).length} | negative ${p10s.filter(v=>v<0).length}`);
