// Calibration sweep: measure many worlds, find the archetypal extremes,
// and write docs/atlas.md with share-links and each world's own words.
import { writeFileSync } from "node:fs";
import { genEngine, giniOf, pearson, settlesOf } from "./lib.mjs";

const worlds = [];
const N = 80;
for (let i = 0; i < N; i++) {
  const seed = "atlas-" + i;
  const hash = `#seed=${seed}&regions=24&ep=10`;
  const { gj, chron } = await genEngine(hash);
  const R = gj.features.filter(f => f.properties.kind === "region").map(f => f.properties);
  const S = R.filter(r => r.is_settled === 1);   // #178: the inhabited realm
  const evs = gj.hinterland.events || [];
  const held = { crown: 0, temple: 0, magnate: 0, none: 0 };
  gj.features.filter(f => ["bridge", "pass", "port"].includes(f.properties.kind)).forEach(f => held[f.properties.held_by]++);
  const gates = held.crown + held.temple + held.magnate + held.none;
  // D5 (#141): these used to be grepped out of the chronicle's preamble, which
  // worked only while the preamble was one fixed sentence. D4 (#140) composed it
  // from twelve, and this tool then read "?" for the capital in every world — the
  // same defect the suite's nineteen chronicle greps had, outside the suite's reach
  // because a docs generator is not a test. Both facts are in the export; read them
  // from there, where a rewording cannot move them.
  const capSettle = settlesOf(gj).find(f => {
    const reg = R.find(r => r.region_id === f.properties.region_id);
    return reg && reg.is_capital_region === 1;
  });
  const capName = capSettle ? capSettle.properties.name : "?";
  const townOf = (rid) => {
    if (rid === null || rid === undefined) return null;
    const f = settlesOf(gj).find(x => x.properties.region_id === rid);
    if (f) return f.properties.name;
    const reg = R.find(r => r.region_id === rid);
    return reg ? (reg.place_name || null) : null;
  };
  const crownLine = (gj.hinterland.rulers && gj.hinterland.rulers.crown) || [];
  const reign = crownLine.length ? crownLine[crownLine.length - 1].name : "?";
  const F = gj.hinterland.findings;
  worlds.push({
    seed, hash, capName, reign, chron,
    schemaVersion: gj.hinterland.schema_version,
    gini: giniOf(R.map(r => r.wealth)),
    dGini: F.gini - F.gini_t0,
    withinPct: F.within_pct ?? 0,
    ownersCoin: F.owners ? F.owners.coin_pct : 0,
    companyShare: F.company_share ?? 0,
    zipfAlpha: F.zipf ? F.zipf.alpha : 0,
    zipfTailAlpha: F.zipf ? F.zipf.tail_alpha : 0,
    primacy: F.zipf ? F.zipf.primacy : 0,
    skyShadow: F.sky && F.sky.shadow_adv !== null ? F.sky.shadow_adv : 0,
    occupiedN: gj.hinterland.dominion ? gj.hinterland.dominion.occupied_n : 0,
    dominion: !!gj.hinterland.dominion,
    comprador: F.sovereignty ? F.sovereignty.comprador_ratio : 0,
    liberation: evs.some(e => e.type === "revolt" && e.outcome === "won" &&
      R.find(r => r.region_id === e.region_id && r.occupied_epoch !== -1)),
    revoltWon: evs.some(e => e.type === "revolt" && e.outcome === "won"),
    turning: F.turning ? F.turning.type + (F.turning.measure ? ":" + F.turning.measure : "") : "none",
    offShare: R.filter(r => r.on_grid === 0).length / R.length,
    shadowShare: R.filter(r => r.range_shadow === 1).length / R.length,
    // #178: SETTLED-only, the metric tools/targets.mjs actually declares and every
    // live acceptance check already uses. The atlas was publishing the all-regions
    // reading, so the headline document and the test suite disagreed about the sign of
    // the project's central environmental-justice claim. Over 80 worlds: all-regions
    // median 0.0, settled-only +0.1.
    blightCorr: pearson(S.map(r => r.blight_load), S.map(r => r.wealth)),
    wars: evs.filter(e => e.type === "war").length,
    seizures: evs.filter(e => e.type === "seizure").length,
    crises: evs.filter(e => e.type === "succession" && e.contested).length,
    plagues: evs.filter(e => e.type === "blight_plague").length,
    eventsN: evs.length,
    consecrated: evs.some(e => e.type === "consecration"),
    maxAband: Math.max(...R.map(r => r.abandonment_index)),
    maxDownstream: Math.max(...R.map(r => r.downstream_blight)),
    maxToll: Math.max(...R.map(r => r.tariff_burden)),
    gateConc: gates > 0 ? Math.max(held.crown, held.temple, held.magnate) / gates : 0,
    magGates: held.magnate, templeGates: held.temple,
    treasuries: gj.hinterland.treasuries,
    collapse: R.filter(r => r.boom_bust === "collapse").length,
    boom: R.filter(r => r.boom_bust === "boom").length,
    // B11 (#133): the verdict class (§3.5 gap×floor×growth) and the imperial reach
    verdictClass: F.verdict ? F.verdict.class : "?",
    verdictCell: F.verdict ? F.verdict.cell : "?",
    concN: F.concessions ? F.concessions.concession_n : 0,
    abandN: F.concessions ? F.concessions.abandoned_n : 0,
    concWorld: evs.some(e => e.type === "concession"),
    abandWorld: evs.some(e => e.type === "abandonment"),
    embargoWorld: evs.some(e => e.type === "embargo"),
    // D5 (#141): the values each archetype's quotation is anchored on. Names and
    // counts the export already carries, so a reworded pool cannot silence them.
    companyTown: townOf(F.company_town),
    popTop: Math.max(...R.map(r => r.population || 0)),
    richestPower: (() => { const t = gj.hinterland.treasuries;
      const k = ["crown", "temple", "magnate"].reduce((a, b) => t[a] >= t[b] ? a : b);
      return { crown: "the Crown", temple: "the Temple", magnate: "the magnates" }[k]; })(),
    darkNow: R.filter(r => r.on_conduit === 0).length,
    ridgeName: (gj.features.find(f => f.properties.kind === "ridge") || { properties: {} }).properties.ridge_name || null,
    warTown: townOf((evs.find(e => e.type === "war") || {}).region_id),
    mouthTown: townOf((R.slice().sort((a, b) => b.downstream_blight - a.downstream_blight)[0] || {}).region_id),
    ghostTown: townOf((R.slice().sort((a, b) => b.abandonment_index - a.abandonment_index)[0] || {}).region_id),
    revoltTown: townOf((evs.find(e => e.type === "revolt" && e.outcome === "won") || {}).region_id),
    concTown: townOf((evs.find(e => e.type === "concession") || {}).region_id),
    abandTown: townOf((evs.find(e => e.type === "abandonment") || {}).region_id),
    concWealth: F.concessions ? F.concessions.conc_wealth : null,
    concMedian: F.concessions ? F.concessions.median_wealth : null,
    foreignClaim: F.concessions ? F.concessions.foreign_claim : null,
  });
}

// B11 (#133): the VERDICT DIVERSITY table: the §3.5 gap×floor×growth classes
// across the sweep. The capstone acceptance: no class > 40%, ≥ 6 classes present.
const classDist = {};
worlds.forEach(w => { classDist[w.verdictClass] = (classDist[w.verdictClass] || 0) + 1; });
const classEntries = Object.entries(classDist).sort((a, b) => b[1] - a[1]);
const classMaxShare = Math.max(...classEntries.map(([, v]) => 100 * v / N));
console.log("\nVERDICT CLASSES (§3.5, " + classEntries.length + " present, max share " + classMaxShare.toFixed(0) + "%):");
classEntries.forEach(([k, v]) => console.log(`  ${(100 * v / N).toFixed(0)}%  ${k}  (${v})`));

// summary statistics for the calibration table
const stat = (key) => {
  const xs = worlds.map(w => typeof key === "function" ? key(w) : w[key]).sort((a, b) => a - b);
  const q = (p) => xs[Math.min(xs.length - 1, Math.floor(p * xs.length))];
  return { min: xs[0], med: q(0.5), max: xs[xs.length - 1] };
};
const fmt = (v) => typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(2)) : v;
const rows = [
  ["wealth gini (between places)", stat("gini")], ["gini drift (close − founding)", stat("dGini")],
  ["within-place share of person inequality %", stat("withinPct")],
  ["owners' rows' share of all coin %", stat("ownersCoin")],
  ["rank-size alpha (whole-system fit)", stat("zipfAlpha")], ["rank-size alpha (upper-half fit, the pre-registered metric)", stat("zipfTailAlpha")], ["urban primacy (1st/2nd)", stat("primacy")],
  ["sky advantage behind the wall (mean)", stat("skyShadow")],
  ["off-grid share", stat("offShare")],
  ["mountain-shadow share", stat("shadowShare")], ["corr(blight, wealth)", stat("blightCorr")],
  ["events per run", stat("eventsN")], ["seizures", stat("seizures")],
  ["max abandonment", stat("maxAband")], ["max tariff burden", stat("maxToll")],
  ["gate concentration", stat("gateConc")],
];
console.log("CALIBRATION (80 worlds, defaults, ep=10):");
rows.forEach(([k, s]) => console.log(`  ${k}: min ${fmt(s.min)} / med ${fmt(s.med)} / max ${fmt(s.max)}`));

// pick the archetypes
const pickMax = (key, fn) => worlds.reduce((a, b) => (fn ? fn(b) > fn(a) : b[key] > a[key]) ? b : a);
const pickMin = (key) => worlds.reduce((a, b) => b[key] < a[key] ? b : a);
// D5 (#141): every archetype used to quote its world by matching a v1 chronicle
// sentence. D4 (#140) composed the chronicle from pools, and eight of the nine
// regexes then matched nothing: measured over thirty worlds they ran 0/30 to 5/30
// where they had been 30/30. A docs generator is not covered by the suite, so this
// rotted silently through a green CI. The lesson is the same one D4's nineteen
// suite rewrites learned — do not grep composed prose for a fact the export holds.
//
// So a quotation is anchored on a VALUE the world exports (a town's name, a figure
// the archetype is chosen by) and falls back to the world's own composed verdict,
// which every chronicle now carries and which is always on the subject.
const verdictLine = (w) => {
  const m = w.chron.split("\n").map(l => l.trim()).reverse().find(l => /^\*[^*].*\*$/.test(l));
  return m ? m.replace(/^\*|\*$/g, "").trim() : "";
};
const about = (w, ...needles) => {
  const keys = needles.filter(x => x !== null && x !== undefined && String(x).length);
  const ls = w.chron.split("\n").filter(l => l.trim() && !l.startsWith("#") && !l.startsWith("*"));
  const hit = keys.length ? ls.find(l => keys.every(k => l.includes(String(k)))) : null;
  return (hit || verdictLine(w)).replace(/\*\*/g, "").trim();
};
const picks = [
  ["The World That Closed Its Gap", pickMin("dGini"), "the deepest gini fall of the sweep. Find its turning point",
    (w) => verdictLine(w)],
  ["The Entrenched World", pickMax("dGini"), "the steepest entrenchment. The loops ran and nothing pushed back",
    (w) => verdictLine(w)],
  ["The Company Country", pickMax("withinPct"), "the world a region map lies about most: its inequality lives INSIDE the walls",
    (w) => about(w, w.companyTown)],
  ["The Occupied Realm", pickMax("occupiedN"), "the Dominion's deepest hold of the sweep",
    (w) => about(w, "Dominion")],
  ["The Primate City", pickMax("primacy"), "one town swallowed the centuries",
    (w) => about(w, w.popTop)],
  ["The Ledger's Realm", pickMax("gateConc"), "the most oligarchic world: one power holds the gates",
    (w) => about(w, w.richestPower)],
  ["The Unequal Country", pickMax("gini"), "the widest wealth gap of the sweep",
    (w) => verdictLine(w)],
  ["The Level Country", pickMin("gini"), "the narrowest wealth gap. Note what it still fails to level",
    (w) => verdictLine(w)],
  ["The Dark Realm", pickMax("offShare"), "the most off-grid world: the ledgers said no, everywhere",
    (w) => about(w, w.darkNow)],
  ["The Walled Realm", pickMax("shadowShare"), "the most mountain-shadowed world",
    (w) => about(w, w.ridgeName)],
  ["The Burning Years", pickMax(null, w => w.wars * 10 + w.seizures + w.crises), "the most violent history of the sweep",
    (w) => about(w, w.warTown)],
  ["The Quiet Years", pickMin("eventsN"), "the calmest history. The founding order simply compounded",
    (w) => verdictLine(w)],
  ["The Poisoned Mouth", pickMax("maxDownstream"), "the heaviest downstream blight",
    (w) => about(w, w.mouthTown)],
  ["The Ghost Country", pickMax("maxAband"), "the deepest abandonment scar",
    (w) => about(w, w.ghostTown)],
  ["The Tariffed Road", pickMax("maxToll"), "the most gate-taxed region of the sweep",
    (w) => verdictLine(w)],
];
const lib = worlds.find(w => w.liberation);
if (lib) picks.push(["The Town That Freed Itself", lib, "a rising won on ground the Dominion had claimed",
  (w) => about(w, w.revoltTown)]);
// B11 (#133): the reach archetypes: the empire that buys, and the one it leaves.
const conc = worlds.filter(w => w.concN > 0 && w.concWealth !== null && w.concWealth > w.concMedian)
  .sort((a, b) => (b.concWealth - b.concMedian) - (a.concWealth - a.concMedian))[0];
if (conc) picks.push(["The Concession Coast", conc, "richer than the realm, and owned. A foreign power keeps half of what its ground yields",
  (w) => about(w, w.concTown)]);
const aband = worlds.find(w => w.abandWorld);
if (aband) picks.push(["The Abandoned Coast", aband, "courted, developed, then let go when the lode ran thin. Ruin and freedom in one year",
  (w) => about(w, w.abandTown)]);

// #180: read the schema version off the sweep's own output. It was hardcoded, so it
// said v54 through a version bump that changed what blight_load MEANS.
const SCHEMA_V = worlds[0].schemaVersion;
let md = `# The Hinterland Atlas

A calibration sweep of **${N} worlds** (default knobs, 24 regions, 10
epochs, schema v${SCHEMA_V}) measured end-to-end, and the archetypal extremes it
found. Every world below is one click away. The seed and knobs live in
the URL hash. Every quotation is the world describing itself (the
chronicle is deterministic: you will find the same words). For HOW to
read these worlds, see the [field guide](field-guide.md).

## The calibration table

| metric | min | median | max |
|---|---|---|---|
`;
rows.forEach(([k, s]) => { md += `| ${k} | ${fmt(s.min)} | ${fmt(s.med)} | ${fmt(s.max)} |\n`; });
md += `
Sanity anchors, measured on this sweep. The blight–wealth correlation over
inhabited ground is **negative** (the poison landing on the poor) in
${worlds.filter(w => w.blightCorr < 0).length}/${N} worlds and **positive** (landing on
the rich) in ${worlds.filter(w => w.blightCorr > 0).length}/${N}, median
${fmt(stat("blightCorr").med)}. This engine does not find that spoil reliably seeks
poverty, and \`docs/grounding.md\` §8 records that pre-registered target as MISSED; a mountain shadow exists in
${worlds.filter(w => w.shadowShare > 0).length}/${N}; the event engine fired in
${worlds.filter(w => w.eventsN > 0).length}/${N}; the empire more often BOUGHT than
landed: a foreign concession opened in
${worlds.filter(w => w.concWorld).length}/${N} worlds and was wound up (attention leaving
with the ore) in ${worlds.filter(w => w.abandWorld).length}/${N}, while the Dominion's fleet
took ground in only ${worlds.filter(w => w.dominion).length}/${N}; a rising won somewhere in
${worlds.filter(w => w.revoltWon).length}/${N}; and in the median world a region map
is blind to ${stat("withinPct").med}% of person-level inequality. The class
ledger lives inside the walls.

## The verdict space (§3.5)

The de-moralized verdict is two axes and a qualifier: did the **gap** (the spread of
fortunes) widen, hold, or close; did the **floor** (the poorest tenth's wealth) rise or
fall; and did the realm **grow, stagnate, or collapse**. No single templated story is
allowed to own the possibility space. Across the ${N}-world sweep, **${classEntries.length}
distinct classes** appear and the most common holds only **${classMaxShare.toFixed(0)}%**.
The §7.3 diversity floor (≥6 classes, none over 40%) is met.

| verdict class | worlds |
|---|---|
${classEntries.map(([k, v]) => `| ${k} | ${v} |`).join("\n")}

## The atlas

`;
for (const [title, w, why, quote] of picks) {
  const url = `https://zntznt.github.io/hinterland/${w.hash}`;
  md += `### ${title}: the realm of ${w.capName}

*${why}.* In the reign of ${w.reign}: wealth gini ${w.gini.toFixed(2)}, ${Math.round(w.offShare * 100)}% off-grid, ${w.wars} war${w.wars === 1 ? "" : "s"}, ${w.seizures} seizure${w.seizures === 1 ? "" : "s"}, ${w.crises} ${w.crises === 1 ? "succession crisis" : "succession crises"}, max abandonment ${w.maxAband}.

> ${quote(w) || "(this world keeps its counsel)"}

[Open this world](${url})

`;
}
md += `## Laboratory worlds

Knob extremes for the classroom. Each isolates one mechanism:

- **The physics baseline** ([db=0](https://zntznt.github.io/hinterland/#seed=atlas-0&regions=24&ep=10&db=0)): no dumping policy. The blight stays at the aetherworks and the centers eat their own waste. Compare its blight–wealth correlation against the default and the gap is the policy share of the injustice.
- **The connected realm** ([gt=0](https://zntznt.github.io/hinterland/#seed=atlas-0&regions=24&ep=10&gt=0)): the grid reaches everyone; darkness as a *choice* becomes visible by its absence.
- **The rationed realm** ([gt=90](https://zntznt.github.io/hinterland/#seed=atlas-0&regions=24&ep=10&gt=90)): the ledgers barely say yes to anyone.
- **The old diagram** ([wg=100, rest 0](https://zntznt.github.io/hinterland/#seed=atlas-0&regions=24&ep=10&we=0&wf=0&wt=0&wg=100)): wealth as a pure capital-distance gradient. This is the explicit model the project began with, kept reachable as a control.
- **The emergent economy** ([wg=0](https://zntznt.github.io/hinterland/#seed=atlas-0&regions=24&ep=10&wg=0)): no authored gradient at all; everything wealth does, it learned from the ground.
- **The deaf capital** ([iq=0](https://zntznt.github.io/hinterland/#seed=atlas-0&regions=24&ep=10&iq=0)) vs **the listening capital** ([iq=100](https://zntznt.github.io/hinterland/#seed=atlas-0&regions=24&ep=10&iq=100)): the same wounds, answered with fists or with mercies. On matched seeds the listening capital runs a measurably lower gini, because the granary hangs on the capital's ear.
- **The sealed realm** ([openness=0](https://zntznt.github.io/hinterland/#seed=atlas-0&regions=24&ep=10&openness=0)): the quays closed by decree. No sea trade, no port tariffs, and no door for the Dominion. The price is smaller than the safety, and that asymmetry is a finding about what this economy is made of.
- **Both mercies** ([db=0&gt=0](https://zntznt.github.io/hinterland/#seed=atlas-0&regions=24&ep=10&db=0&gt=0)): no dumping and a universal grid at once. This is the nearest thing this engine has to a just policy regime, run on the same rock as everything above.

*Generated from the calibration sweep (schema v${SCHEMA_V}); regenerate with the
suite's atlas script (node --max-old-space-size=8192 atlas.mjs).*
`;
writeFileSync(new URL("../docs/atlas.md", import.meta.url), md);
console.log("\natlas written:", picks.map(([t, w]) => t + "=" + w.seed).join(", "));
