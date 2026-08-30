import { setupEngine } from "../lib.mjs";
const E = await setupEngine();
const run = (h) => { const S = E.parseHash(h); const r = E.buildTopology(S), g = E.buildGeology(r, S);
  const m = E.applyAttributes(r, S, g);
  const gj = E.toGeoJSON(m, S);
  // the WORLD, not the record of which reign produced it: provenance honestly gains
  // a `ch` key when a reign was played, echoing or not, so it is not part of the
  // invariant. Everything the world IS must match.
  const { ch, ...provNoCh } = gj.hinterland;
  return { m, S, dec: m.decisions,
    world: JSON.stringify({ features: gj.features, prov: provNoCh }),
    chron: E.composeChronicle(m, S) };
};
let offered = {w:0,r:0,d:0}, echoOK = 0, echoN = 0, divergeChanged = 0, divergeN = 0, worlds = 0;
const examples = [];
for (let i = 0; i < 60; i++) {
  const base = `#seed=e1-${i}&regions=24&ep=10`;
  const auto = run(base); worlds++;
  for (const d of auto.dec) offered[d.kind]++;
  if (!auto.dec.length) continue;
  // (1) ECHO: a reign that picks option 0 everywhere must BE the auto run
  const echo = auto.dec.map(d => `${d.key}:0`).join(",");
  const e2 = run(`${base}&ch=${echo}`); echoN++;
  if (e2.world === auto.world && e2.chron === auto.chron) echoOK++;
  else examples.push(`e1-${i}: echoing ${echo} did NOT reproduce the auto run`);
  // (2) DIVERGE: picking option 1 on the first decision with a real alternative
  const forkable = auto.dec.find(d => d.options.length > 1);
  if (forkable) {
    divergeN++;
    const dv = run(`${base}&ch=${forkable.key}:1`);
    if (dv.world !== auto.world) divergeChanged++;
    else examples.push(`e1-${i}: choosing ${forkable.key}:1 (${forkable.options[1]}) changed nothing`);
  }
}
console.log(`# ${worlds} worlds at defaults`);
console.log(`  decisions offered: w=${offered.w} wound, r=${offered.r} revolt, d=${offered.d} Dominion`);
console.log(`  ECHO the dice   : ${echoOK}/${echoN} reproduce the auto run byte-identically`);
console.log(`  DIVERGE one call: ${divergeChanged}/${divergeN} actually change the world`);
for (const x of examples.slice(0, 4)) console.log(`   ${x}`);
