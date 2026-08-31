// #142 E1 — the reign engine. The instrument, and the sample the ticket's
// "playable via hash alone (no UI)" line is demonstrated with.
//
//   cd tools/proto
//   NODE_PATH=../node_modules node reign-proto.mjs --reach       # which decisions are reached, and how often
//   NODE_PATH=../node_modules node reign-proto.mjs --echo        # the echo-the-dice invariant, at survey scale
//   NODE_PATH=../node_modules node reign-proto.mjs --avert       # the averted rising's six consumers
//   NODE_PATH=../node_modules node reign-proto.mjs --sample > ../../docs/reign-sample.md
//
// The invariants below also live in tools/test.mjs, which is where they can FAIL a
// build. What they cannot do there is survey: the suite runs 40 worlds because it
// runs beside 360 other checks, and a rate wants more. This file is the wider
// instrument, and it is how the numbers quoted in the CHANGELOG were produced.
//
// --reach is the one to run after any change to the economy. A dilemma is offered
// when a Phase B lever is live, so a mechanism that stops firing takes its dilemma
// with it silently: the reign still works, there is simply one fewer road, and
// nothing goes red. The table is the tripwire.
import { setupEngine } from "../lib.mjs";
const E = await setupEngine();
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes("--" + k);
const N = Number(arg("n", "60"));

const run = (h) => {
  const S = E.parseHash(h);
  const r = E.buildTopology(S), g = E.buildGeology(r, S);
  const m = E.applyAttributes(r, S, g);
  const gj = E.toGeoJSON(m, S);
  // the WORLD, not the record of which reign produced it: provenance honestly gains
  // `ch` and its decision log when a reign was played, echoing or not, so neither is
  // part of the invariant. Everything the world IS must match.
  const { ch, decisions, ...prov } = gj.hinterland;
  return { m, S, gj, dec: m.decisions, F: E.getFindings(m),
    chron: E.composeChronicle(m, S),
    ev: gj.hinterland.events || [],
    R: gj.features.filter(f => f.properties.kind === "region").map(f => f.properties),
    gar: gj.features.filter(f => f.properties.kind === "garrison"),
    world: JSON.stringify({ f: gj.features, p: prov }) };
};

const KIND = { w: "wound", r: "revolt", d: "Dominion", c: "conduit", g: "granary",
               o: "ore floor", t: "gates", s: "spoil", n: "charter" };
const base = (i, fate) => `#seed=e1-${i}&regions=24&ep=10${fate ? `&fate=${fate}-${i}` : ""}`;

if (has("reach")) {
  // How often is each road even offered? A kind at 0 is a lever that stopped firing.
  const offered = {}, forkable = {}, moved = {};
  for (let i = 0; i < N; i++) {
    const auto = run(base(i));
    for (const d of auto.dec) {
      offered[d.kind] = (offered[d.kind] || 0) + 1;
      if (d.options.length < 2) continue;
      forkable[d.kind] = (forkable[d.kind] || 0) + 1;
      if (run(`${base(i)}&ch=${d.key}:1`).world !== auto.world) moved[d.kind] = (moved[d.kind] || 0) + 1;
    }
  }
  console.log(`# ${N} worlds at defaults, ep=10\n`);
  console.log(`  kind         offered  forkable  taking another road moves the world`);
  for (const k of "wrdcgotsn") {
    if (!offered[k]) { console.log(`  ${KIND[k].padEnd(11)} ${"0".padStart(7)}         -  NEVER OFFERED — a lever stopped firing`); continue; }
    console.log(`  ${KIND[k].padEnd(11)} ${String(offered[k]).padStart(7)}  ${String(forkable[k] || 0).padStart(8)}  ${String(moved[k] || 0).padStart(8)}`);
  }
}

if (has("echo")) {
  // Option 0 is the dice's own outcome everywhere, so a reign that echoes every die
  // IS the auto run. Diverging is ALLOWED to change the draws that follow.
  let echoOK = 0, echoN = 0, forked = 0, forkN = 0;
  const bad = [];
  for (let i = 0; i < N; i++) {
    const auto = run(base(i));
    if (!auto.dec.length) continue;
    const echo = auto.dec.map(d => `${d.key}:0`).join(",");
    const e2 = run(`${base(i)}&ch=${echo}`); echoN++;
    if (e2.world === auto.world && e2.chron === auto.chron) echoOK++;
    else bad.push(`e1-${i}: echoing ${echo} did not reproduce the auto run`);
    const f = auto.dec.find(d => d.options.length > 1);
    if (!f) continue;
    forkN++;
    if (run(`${base(i)}&ch=${f.key}:1`).world !== auto.world) forked++;
    else bad.push(`e1-${i}: ${f.key}:1 (${f.options[1]}) changed nothing`);
  }
  console.log(`# ${N} worlds at defaults, ep=10`);
  console.log(`  ECHO the dice   : ${echoOK}/${echoN} reproduce the auto run byte-identically`);
  console.log(`  take another road: ${forked}/${forkN} actually move the world`);
  for (const x of bad.slice(0, 5)) console.log(`   ${x}`);
}

if (has("avert")) {
  // G5 finding 1: a rising that never happens must leave every consumer of revolt
  // state coherent. There are six, and the garrison is the one that bit.
  const bad = [], seen = [];
  for (let i = 0; i < N && seen.length < 20; i++) {
    const auto = run(base(i));
    const rv = auto.dec.find(d => d.kind === "r");
    const fired = auto.ev.find(e => e.type === "revolt");
    if (!rv || !fired) continue;
    seen.push(`e1-${i}`);
    const av = run(`${base(i)}&ch=${rv.key}:2`);              // 2 = averted
    const reg = av.R.find(r => r.region_id === fired.region_id);
    if (av.ev.some(e => e.type === "revolt")) bad.push(`e1-${i}: a revolt event survives its aversion`);
    if (!av.ev.some(e => e.type === "revolt_averted")) bad.push(`e1-${i}: nothing records the aversion`);
    if (reg && reg.event_type === "revolt") bad.push(`e1-${i}: the region is still stamped revolt`);
    if (reg && ["the Free", "the Famished"].includes(reg.epithet)) bad.push(`e1-${i}: byname ${reg.epithet}`);
    if (reg && reg.won_arc) bad.push(`e1-${i}: won_arc on a rising that did not happen`);
    if (fired.outcome === "crushed" &&
        auto.gar.some(g => g.properties.region_id === fired.region_id) &&
        av.gar.some(g => g.properties.region_id === fired.region_id))
      bad.push(`e1-${i}: a garrison is posted for hangings that never happened`);
    if (av.dec.filter(d => d.kind === "r").length !== 1) bad.push(`e1-${i}: the rising was offered more than once`);
  }
  console.log(`# averted risings, checked on ${seen.length} worlds`);
  console.log(bad.length ? bad.slice(0, 6).join("\n")
    : "  all six consumers coherent: no revolt event, no stamp, no byname, no won-arc,\n  no garrison for hangings that never happened, and the once-per-run guard closed");
}

if (has("sample")) {
  // The artifact. For each seed: what the world offered, what a reign that took every
  // road did to it, and the prose the decrees produced — the ticket's "playable via
  // hash alone" line, shown rather than asserted.
  const seeds = arg("seeds", "e1-3,e1-11,e1-19").split(",");
  const dec2 = (n) => (n == null ? "—" : Number(n).toFixed(2));
  console.log(`# A reign, played from the URL bar (#142, E1)\n`);
  console.log(`Generated by \`tools/proto/reign-proto.mjs --sample\`. Every hash below is a link the`);
  console.log(`app already understands; there is no reign UI yet (that is #143).\n`);
  console.log(`A reign is a list of roads taken at the points where the dice used to decide alone.`);
  console.log(`Option 0 is always the dice's own outcome, so a reign that echoes every die *is* the`);
  console.log(`auto-history — which is why the world below only moves where a governor chose`);
  console.log(`differently.\n`);
  for (const seed of seeds) {
    const h = `#seed=${seed}&regions=24&ep=10`;
    const auto = run(h);
    console.log(`\n---\n\n## \`${h}\`\n`);
    console.log(`### The roads this world offered\n`);
    console.log(`| year | decision | roads | the dice took |`);
    console.log(`| --- | --- | --- | --- |`);
    for (const d of auto.dec)
      console.log(`| ${1000 + 25 * d.epoch} | ${KIND[d.kind]} (\`${d.key}\`) | ${d.options.map((o, k) => `${k}. ${o}`).join(" · ")} | ${d.chose} |`);
    // A reign is built the way §5.1's controller builds it: re-run, read the next
    // decision the CURRENT history offers, append, re-run. Taking the auto-history's
    // whole decision list at once does not work — the first road changes which
    // decisions the rest of the run reaches, so later keys go stale and are ignored,
    // exactly as designed. This is that mechanism, run by hand.
    let taken = [], played = auto;
    for (let step = 0; step < 12; step++) {
      const next = played.dec.find(d => d.options.length > 1 &&
        !taken.some(t => t.startsWith(`${d.key}:`)));
      if (!next) break;
      taken.push(`${next.key}:${next.options.length - 1}`);
      played = run(`${h}&ch=${taken.join(",")}`);
    }
    const reign = taken.join(",");
    console.log(`\n### The reign: \`&ch=${reign}\`\n`);
    console.log(`Every fork taken the other way. The §3.5 verdict on each history:\n`);
    console.log(`| | the auto-history | this reign |`);
    console.log(`| --- | --- | --- |`);
    console.log(`| verdict | ${auto.F.verdict.cell}, ${auto.F.verdict.growth} | ${played.F.verdict.cell}, ${played.F.verdict.growth} |`);
    console.log(`| gini | ${dec2(auto.F.gini)} | ${dec2(played.F.gini)} |`);
    // the floor is the poorest tenth of the regions STILL STANDING, at both ends
    console.log(`| floor (p10) | ${auto.F.floor.p10} (from ${auto.F.floor.p10_t0}) | ${played.F.floor.p10} (from ${played.F.floor.p10_t0}) |`);
    console.log(`| settled at the end | ${auto.R.filter(r => r.is_settled).length} | ${played.R.filter(r => r.is_settled).length} |`);
    console.log(`| events | ${auto.ev.length} | ${played.ev.length} |`);
    const decrees = played.ev.filter(e => e.by === "governor");
    if (decrees.length) {
      console.log(`\n### What the record says the seat did\n`);
      for (const e of decrees)
        console.log(`- **${1000 + 25 * e.epoch}** — \`${e.type}\`${e.measure ? ` (${e.measure})` : ""}`);
    }
    // and the prose: the chronicle years a decree touched
    const years = new Set(decrees.map(e => 1000 + 25 * e.epoch));
    const lines = played.chron.split("\n").filter(l => [...years].some(y => l.startsWith(`**Year ${y}.**`)));
    if (lines.length) {
      console.log(`\n### And what the chronicle makes of it\n`);
      for (const l of lines) console.log(`> ${l}\n`);
    }
  }
  console.log(`\n---\n`);
  console.log(`*Composed by the loom (#137), on the chronicle's own substream. The decree, the`);
  console.log(`averted rising and the repelled Dominion have their own fragment classes: outcomes`);
  console.log(`the record had no words for, because before a governor existed they could not happen.*`);
}

if (!["reach", "echo", "avert", "sample"].some(has))
  console.log("pick a mode: --reach | --echo | --avert | --sample  (--n 60, --seeds a,b,c)");
