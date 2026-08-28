import { setupEngine } from "../lib.mjs";
const E = await setupEngine();
const of_ = (h) => { const S = E.parseHash(h); const r = E.buildTopology(S), g = E.buildGeology(r, S);
  const m = E.applyAttributes(r, S, g); return { F: E.getFindings(m), m }; };
const q = (a,p)=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(p*(s.length-1))];};
const rows = [];
for (let i = 0; i < 80; i++) {
  const { F, m } = of_(`#seed=v5-${i}&regions=24&ep=10`);
  const settled = m.regions.filter(r => r.settled);
  // the same population-weighted ratio the verdict uses
  const gr = F.growth.per_capita_t0 > 0 ? F.growth.per_capita / F.growth.per_capita_t0 : 1;
  // (a) UNWEIGHTED mean wealth: did the average REGION get richer?
  const mean = (a) => a.reduce((s,x)=>s+x,0)/(a.length||1);
  const uw = mean(settled.map(r => r.wealth)) / (mean(settled.map(r => r.wealthT0)) || 1);
  // (b) share of settled regions whose own wealth rose
  const rose = settled.filter(r => r.wealth > r.wealthT0).length / (settled.length||1);
  // (c) TOTAL wealth: did the pie grow?
  const tot = F.growth.total / (F.growth.total_t0 || 1);
  rows.push({ gr, uw, rose, tot, cls: F.verdict.growth });
}
const col = (k) => rows.map(r => r[k]);
const line = (name, k) => console.log(`  ${name.padEnd(34)} p10 ${q(col(k),.1).toFixed(2)}  median ${q(col(k),.5).toFixed(2)}  p90 ${q(col(k),.9).toFixed(2)}`);
console.log(`# 80 worlds at defaults — what "collapse" is measuring`);
line("verdict's pop-weighted per-capita", "gr");
line("UNWEIGHTED mean region wealth", "uw");
line("TOTAL wealth (the whole pie)", "tot");
line("share of regions that got richer", "rose");
const disagree = rows.filter(r => r.gr <= 0.92 && r.uw >= 1.0);
const disagree2 = rows.filter(r => r.gr <= 0.92 && r.tot >= 1.0);
console.log(`\nworlds labelled "collapse" whose UNWEIGHTED mean region wealth ROSE: ${disagree.length}/80`);
console.log(`worlds labelled "collapse" whose TOTAL wealth ROSE:                  ${disagree2.length}/80`);
console.log(`worlds labelled "collapse" where a MAJORITY of regions got richer:   ${rows.filter(r=>r.gr<=0.92&&r.rose>0.5).length}/80`);
