import { setupEngine } from "../lib.mjs";
const E = await setupEngine();
const of_ = (h) => { const S = E.parseHash(h); const r = E.buildTopology(S), g = E.buildGeology(r, S);
  const m = E.applyAttributes(r, S, g); return { F: E.getFindings(m), m }; };
// floor.p10 compares the p10 of CURRENT wealth against the p10 of FOUNDING wealth,
// both taken over the regions settled AT THE CLOSE. A region abandoned in between
// leaves the sample. So: when the floor "rose", did it rise because the poorest
// ground gained, or because the poorest ground stopped counting?
let rose = 0, roseWithDeaths = 0, roseOnlyBecauseOfDeaths = 0, examples = [];
const N = 200;
for (let i = 0; i < N; i++) {
  const { F, m } = of_(`#seed=fl-${i}&regions=24&ep=10`);
  const dF = F.floor.p10 - F.floor.p10_t0;
  if (dF <= 0) continue;
  rose++;
  const settledNow = m.regions.filter(r => r.settled);
  const founded = m.regions.filter(r => r.wealthT0 > 0 || r.settled);
  const died = founded.length - settledNow.length;
  if (died > 0) roseWithDeaths++;
  // recompute the founding p10 over the FOUNDING set (including the ones that died)
  const p10 = (a) => { const t = a.slice().sort((x,y)=>x-y); return t.length ? t[Math.floor(0.1*(t.length-1))] : 0; };
  const t0AllSet = p10(founded.map(r => r.wealthT0));
  const nowSet = p10(settledNow.map(r => r.wealth));
  if (nowSet <= t0AllSet) { roseOnlyBecauseOfDeaths++; if (examples.length < 3) examples.push(`fl-${i}: p10 ${F.floor.p10_t0}→${F.floor.p10} on survivors, but ${t0AllSet}→${nowSet} against the founding set (${died} regions left the sample)`); }
}
console.log(`# ${N} worlds at defaults`);
console.log(`  floor rose in ${rose}`);
console.log(`  ...of those, ${roseWithDeaths} lost at least one settled region between founding and close`);
console.log(`  ...and in ${roseOnlyBecauseOfDeaths} the rise DISAPPEARS when the founding p10 is taken over the founding set`);
for (const e of examples) console.log("   " + e);
