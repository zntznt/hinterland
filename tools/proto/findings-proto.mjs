// #139 D3 GATE — the findings, composed. The prototype the migration is judged on.
//
// Run from tools/proto:
//   NODE_PATH=../node_modules node findings-proto.mjs --seeds a,b,c > ../../docs/findings-sample.md
//   NODE_PATH=../node_modules node findings-proto.mjs --diag       (cross-seed overlap, 20 seeds)
//
// Unlike the #136 voices prototype, this one reads the SHIPPING composer out of the
// engine rather than reimplementing it in the scratchpad. D1 put the runtime in the
// engine and D3 put the analyst pool beside it, so there is nothing left for a
// prototype to fork from: what this script samples is exactly what the panel renders.
// That is the point of having built the loom first.
import { setupEngine } from "../lib.mjs";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes("--" + k);
const EP = arg("ep", "10"), REGIONS = arg("regions", "24");
const E = await setupEngine();

const world = (seed) => {
  const S = E.parseHash(`#seed=${seed}&regions=${REGIONS}&ep=${EP}`);
  const regions = E.buildTopology(S), geo = E.buildGeology(regions, S);
  return { S, model: E.applyAttributes(regions, S, geo) };
};
const panelOf = (seed) => { const { S, model } = world(seed); return { blocks: E.composeFindings(model, S), model, S }; };

// The slot audit, run over every block: every told recomputed from its true under
// the rule the fact declares, plus the analyst's digits law, plus the names.
const auditPanel = (blocks, model) => {
  const names = new Set();
  for (const st of model.settlements) names.add(st.name);
  for (const r of model.regions) if (r.placeName) names.add(r.placeName);
  for (const R of model.ridges) names.add(R.name);
  if (model.metropole) names.add(model.metropole);
  if (model.capitalName) names.add(model.capitalName);
  const bad = [];
  for (const b of blocks) {
    const r = E.loomAudit({ text: b.text.replace(/\*\*/g, ""), facts: b.facts, names: b.names }, "analyst", { names });
    for (const o of r.offenders) bad.push({ topic: b.topic, ...o });
  }
  return bad;
};

// ---- --diag: cross-seed skeleton overlap, per topic and for the whole panel ----
if (has("diag")) {
  const seeds = (arg("dseeds", "").length ? arg("dseeds", "").split(",")
    : Array.from({ length: 20 }, (_, i) => `d3-${i + 1}`));
  const byTopic = new Map(), panels = [];
  let blocks = 0, facts = 0, audited = 0;
  for (const sd of seeds) {
    const { blocks: bs, model } = panelOf(sd);
    blocks += bs.length;
    for (const b of bs) {
      facts += b.facts.length;
      const sk = E.loomSkeleton(b.text, b.facts);
      if (!byTopic.has(b.topic)) byTopic.set(b.topic, []);
      byTopic.get(b.topic).push(sk);
    }
    panels.push(bs.map(b => E.loomSkeleton(b.text, b.facts)).join(" "));
    audited += auditPanel(bs, model).length;
  }
  const panel = E.loomDiversity(panels);
  const floor = E.loomDiversityFloor(panels.length);
  console.log(`# #139 diagnostic — the composed findings, ${seeds.length} seeds\n`);
  console.log(`${blocks} blocks, ${facts} audited facts, **${audited} audit offenders**\n`);
  console.log(`## The whole panel, cross-seed\n`);
  console.log(`| measure | value | floor / ceiling | |\n|---|---|---|---|`);
  console.log(`| within-skeleton type-token | ${panel.typeToken} | ≥ ${floor.typeToken} | ${panel.typeToken >= floor.typeToken ? "ok" : "SHORT"} |`);
  console.log(`| bigram entropy | ${panel.bigramEntropy} | ≥ ${floor.bigramEntropy} | ${panel.bigramEntropy >= floor.bigramEntropy ? "ok" : "SHORT"} |`);
  console.log(`| distinct panels | ${panel.distinct}/${panel.n} | ≥ ${floor.distinct} | ${panel.distinct >= floor.distinct ? "ok" : "SHORT"} |`);
  console.log(`| pairwise skeleton overlap | **${panel.overlap}** | ≤ ${floor.overlap} | ${panel.overlap <= floor.overlap ? "ok" : "OVER"} |`);
  console.log(`\n## Per topic, cross-seed (the number that decides whether a reader notices)\n`);
  console.log(`| topic | n | distinct | overlap | type-token | pool |\n|---|---|---|---|---|---|`);
  const rows = [...byTopic.entries()].map(([t, sk]) => {
    const d = E.loomDiversity(sk);
    const claim = (E.FINDINGS_POOL[t] || []).length;
    const glossCls = (E.FINDINGS_ORDER.find(o => o[0] === t) || [])[1];
    const gloss = glossCls ? (E.FINDINGS_POOL[glossCls] || []).length : 0;
    return { t, n: d.n, distinct: d.distinct, overlap: d.overlap, tt: d.typeToken, pool: claim + gloss };
  }).sort((a, b) => b.overlap - a.overlap);
  for (const r of rows) console.log(`| \`${r.t}\` | ${r.n} | ${r.distinct} | ${r.overlap} | ${r.tt} | ${r.pool} |`);
  const worst = Math.max(...rows.map(r => r.overlap));
  const ttMin = Math.min(...rows.map(r => r.tt));
  console.log(`\nworst per-topic overlap **${worst}**; lowest per-topic type-token **${ttMin}**.`);
  console.log(`The panel row's type-token is measured over fifteen blocks concatenated, which is`);
  console.log(`not the unit a reader compares: function words repeat across any fifteen sentences.`);
  console.log(`Per BLOCK -- the unit that actually recurs seed to seed -- it is the figure above.`);
  process.exit(0);
}

// ---- the sample ---------------------------------------------------------------
const SEEDS = arg("seeds", "alpha,atlas-3,x1-1").split(",");
let md = `# The findings, composed — D3 sample (#139)\n\n`;
md += `Generated by \`tools/proto/findings-proto.mjs\` against the SHIPPING composer\n`;
md += `(\`composeFindings\` in \`src/engine/engine.mjs\`), not a fork of it — D1 put the loom\n`;
md += `in the engine, so what this samples is exactly what the panel renders.\n\n`;
md += `Pool: ${Object.values(E.FINDINGS_POOL).flat().length} fragments over ${Object.keys(E.FINDINGS_POOL).length} classes,\n`;
md += `${E.FINDINGS_FRAMES.length} frames, analyst register (digits law: exact).\n\n`;
md += `Emphasis is written \`**like this**\` by the engine; the panel renders it as bold.\n\n`;

let allBad = 0, allFacts = 0;
for (const sd of SEEDS) {
  const { blocks, model } = panelOf(sd);
  const bad = auditPanel(blocks, model);
  allBad += bad.length;
  md += `\n## Seed \`${sd}\` — ${blocks.length} blocks\n\n`;
  for (const b of blocks) {
    allFacts += b.facts.length;
    md += `**${b.topic}** — ${b.text}\n\n`;
    if (b.facts.length) {
      md += `| slot | true | told | rule |\n|---|---|---|---|\n`;
      for (const f of b.facts) md += `| \`${f.path}\` | ${String(f.true).slice(0, 70)} | ${String(f.told).slice(0, 70)} | ${f.rule} |\n`;
      md += `\n`;
    }
  }
  md += bad.length ? `**AUDIT: ${bad.length} offenders** — ${bad.map(o => `${o.topic}: ${o.why}`).join("; ")}\n` : `Audit: clean.\n`;
}
md += `\n---\n\n`;
md += `Across these ${SEEDS.length} seeds: ${allFacts} audited facts, **${allBad} offenders**. `;
md += `Every figure was recomputed from its source value under the rule the fact carries, `;
md += `and every proper name checked against the model's own name set.\n`;
console.log(md);
