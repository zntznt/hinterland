import { setupEngine } from "../lib.mjs";
const E = await setupEngine();
const run = (h) => { const S = E.parseHash(h); const r = E.buildTopology(S), g = E.buildGeology(r, S);
  const m = E.applyAttributes(r, S, g); const gj = E.toGeoJSON(m, S);
  return { m, gj, chron: E.composeChronicle(m, S), F: E.getFindings(m),
    R: gj.features.filter(f => f.properties.kind === "region").map(f => f.properties),
    gar: gj.features.filter(f => f.properties.kind === "garrison"),
    ev: gj.hinterland.events || [] };
};
const bad = [], seen = [];
for (let i = 0; i < 60 && seen.length < 20; i++) {
  const base = `#seed=e1-${i}&regions=24&ep=10`;
  const auto = run(base);
  const rv = auto.m.decisions.find(d => d.kind === "r");
  if (!rv) continue;
  const av = run(`${base}&ch=${rv.key}:2`);          // option 2 = averted
  const rid = (auto.ev.find(e => e.type === "revolt") || {}).region_id;
  if (rid === undefined) continue;
  seen.push(`e1-${i}`);
  const reg = av.R.find(r => r.region_id === rid);
  const wasCrushed = (auto.ev.find(e => e.type === "revolt") || {}).outcome === "crushed";
  // (6) no revolt event; an aversion of its own instead
  if (av.ev.some(e => e.type === "revolt")) bad.push(`e1-${i}: a revolt event survives an aversion`);
  if (!av.ev.some(e => e.type === "revolt_averted")) bad.push(`e1-${i}: nothing records the aversion`);
  // (5) the region's own event column
  if (reg && reg.event_type === "revolt") bad.push(`e1-${i}: region still stamped revolt`);
  // (4) no byname earned by a rising that did not happen
  if (reg && ["the Free", "the Famished"].includes(reg.epithet)) bad.push(`e1-${i}: epithet ${reg.epithet}`);
  if (reg && reg.won_arc) bad.push(`e1-${i}: won_arc ${reg.won_arc} on an averted rising`);
  // (2) no free town
  if (reg && reg.toll_burden === 0 && auto.R.find(r => r.region_id === rid).toll_burden !== 0)
    bad.push(`e1-${i}: town freed by an aversion`);
  // (3) THE RIPPLE: a crushed rising posts a garrison; an averted one must not
  if (wasCrushed) {
    const hadGar = auto.gar.some(g => g.properties.region_id === rid);
    const hasGar = av.gar.some(g => g.properties.region_id === rid);
    if (hadGar && hasGar) bad.push(`e1-${i}: garrison still posted where nothing was crushed`);
  }
  // (1) the guard closed: exactly one rising-shaped decision, not one per epoch
  if (av.m.decisions.filter(d => d.kind === "r").length !== 1) bad.push(`e1-${i}: the rising was offered more than once`);
}
console.log(`# averted risings checked on ${seen.length} worlds`);
console.log(bad.length ? bad.slice(0, 6).join("\n") : "  all six consumers coherent: no revolt event, no stamp, no byname,\n  no free town, no garrison for hangings that never happened, guard closed");
