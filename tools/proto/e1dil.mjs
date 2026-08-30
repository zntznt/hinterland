import { setupEngine } from "../lib.mjs";
const E = await setupEngine();
const run = (h) => { const S = E.parseHash(h); const r = E.buildTopology(S), g = E.buildGeology(r, S);
  const m = E.applyAttributes(r, S, g); const gj = E.toGeoJSON(m, S);
  const { ch, ...prov } = gj.hinterland;
  return { m, S, dec: m.decisions, F: E.getFindings(m),
    world: JSON.stringify({ f: gj.features, p: prov }) };
};
const KIND = { c:"conduit", g:"granary", o:"ore floor", t:"gates", s:"spoil", n:"charter",
               w:"wound", r:"revolt", d:"Dominion" };
const offered = {}, forked = {}, changed = {};
let worlds = 0, echoOK = 0, echoN = 0;
for (let i = 0; i < 60; i++) {
  const base = `#seed=e1-${i}&regions=24&ep=10`;
  const auto = run(base); worlds++;
  for (const d of auto.dec) offered[d.kind] = (offered[d.kind] || 0) + 1;
  if (!auto.dec.length) continue;
  // echo: every decision at option 0 must reproduce the world exactly
  const echo = auto.dec.map(d => `${d.key}:0`).join(",");
  const e2 = run(`${base}&ch=${echo}`); echoN++;
  if (e2.world === auto.world) echoOK++;
  // each offered dilemma, taken: does it change the world?
  for (const d of auto.dec) {
    if (d.options.length < 2) continue;
    forked[d.kind] = (forked[d.kind] || 0) + 1;
    const alt = run(`${base}&ch=${d.key}:1`);
    if (alt.world !== auto.world) changed[d.kind] = (changed[d.kind] || 0) + 1;
  }
}
console.log(`# ${worlds} worlds at defaults`);
console.log(`  echo the dice/status quo: ${echoOK}/${echoN} reproduce the auto world byte-identically\n`);
console.log(`  kind        offered  forkable  taking it changes the world`);
for (const k of "wrdcgotsn") {
  if (!offered[k]) { console.log(`  ${KIND[k].padEnd(11)} ${String(0).padStart(6)}       -   NEVER OFFERED`); continue; }
  console.log(`  ${KIND[k].padEnd(11)} ${String(offered[k]).padStart(6)}  ${String(forked[k]||0).padStart(8)}  ${String(changed[k]||0).padStart(6)}`);
}
