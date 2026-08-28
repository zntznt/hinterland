// #140 D4 — the chronicle on the loom. The gate script and the sameness instrument.
//
//   cd tools/proto
//   NODE_PATH=../node_modules node chronicle-proto.mjs --baseline   (measure BEFORE pinning)
//   NODE_PATH=../node_modules node chronicle-proto.mjs --sample > ../../docs/chronicle-sample.md
//
// The issue is explicit that §7.4's ceilings are "measured on tools/sweep.mjs first",
// so this takes the baseline with the SAME instrument the pin will use. The sweep's
// existing figure is a raw line-Jaccard, which counts a line as shared only if the
// town names in it match too — it therefore flatters the chronicle, because two worlds
// running identical templates over different names score as different. Masking the
// names and figures back out is the whole point of a skeleton.
//
// The v1 chronicle carries no facts[], so the mask here is textual: digit runs and
// proper nouns go to a placeholder. The SAME mask runs on the composed chronicle, so
// before and after are the same measurement and the comparison means something.
//
// MEASURED, 2026-08-28, before any authoring (24 seeds, regions=20&ep=10):
//   cross-seed overlap             0.62   (§7.4 ceiling < 0.20)
//   within-seed cross-knob overlap 0.93   (§7.4 ceiling < 0.45)
// Both are worse than the figures direction.md §4 records (0.36-0.52 and 0.68-0.89),
// which were taken with the sweep's raw line-Jaccard — that instrument reads 0.059 on
// this same corpus, because it counts a line as shared only when the town names in it
// match, and so scores one template over twenty-four different towns as twenty-four
// different chronicles. Whatever gets pinned has to name its instrument.
//
// --sections localises it: preamble 0.98, State of the Realm 0.76, Founding 0.71,
// What the Record Shows 0.65, The Years 0.50. The Years is 51% of the words and the
// LEAST repetitive act, because its event prose already picks from five variants; the
// four fixed acts are 49% of the words and carry the sameness.
//
// --knobs is the one that decides the shape of D4: a knob at its extreme leaves
// 77-96% of the beat structure standing, so the within-seed ceiling is not a prose
// target. See the note this prints.
import { setupEngine } from "../lib.mjs";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes("--" + k);
const E = await setupEngine();

// Words that start a sentence, or are simply capitalised in ordinary use, are not
// proper nouns and must survive the mask or every sentence opener reads as a name.
const STOP = new Set(["the","a","an","and","but","or","of","in","on","at","to","by","for","from","with",
  "no","not","this","that","these","those","it","its","they","their","them","there","here",
  "what","when","where","which","who","whom","whose","why","how","all","every","each","some","most",
  "one","two","three","four","five","six","seven","eight","nine","ten","year","years","past","over",
  "high","low","above","below","under","after","before","since","until","while","as","if","so","then",
  "crown","temple","magnates","magnate","dominion","apostates","apostate","pilgrims","assessors",
  "nobody","nothing","anyone","anything","everywhere","somewhere","north","south","east","west",
  "northeast","northwest","southeast","southwest","chronicle","record","realm","founding","state"]);

function chronSkeleton(text) {
  let s = String(text);
  s = s.replace(/\d[\d,.]*/g, " NUM ");                          // every figure
  s = s.replace(/\b([A-Z][a-zA-Z'’-]+)\b/g, (m, w) =>             // every proper noun
    STOP.has(w.toLowerCase()) ? w.toLowerCase() : " NAME ");
  return s.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

const BASE = "regions=20&ep=10";
const chronOf = (hash) => {
  const S = E.parseHash(hash);
  const regions = E.buildTopology(S), geo = E.buildGeology(regions, S);
  const model = E.applyAttributes(regions, S, geo);
  return { text: E.composeChronicle(model, S), model, S };
};

// ---- the sameness instrument ------------------------------------------------
// Reported the way §7.4 asks for it: cross-seed (do different worlds tell it in
// different words) and within-seed cross-knob (do the dials touch the prose).
function sameness(label, texts) {
  const sk = texts.map(chronSkeleton);
  const d = E.loomDiversity(sk);
  return { label, n: d.n, distinct: d.distinct, overlap: d.overlap, typeToken: d.typeToken, entropy: d.bigramEntropy };
}

const KNOBS = [["db", 0], ["gt", 0], ["iq", 100], ["wg", 0], ["we", 100], ["wf", 100], ["wt", 100], ["bias", 0], ["hb", 0]];
const N = Number(arg("n", "24"));

if (has("baseline") || has("measure")) {
  const tag = has("baseline") ? "BASELINE (chronicle as it stands)" : "MEASURED";
  console.log(`# #140 — chronicle sameness, ${tag}\n`);
  console.log(`Skeleton-masked: every figure and every proper noun replaced before comparing,`);
  console.log(`so two worlds running one template over different names score as the SAME.\n`);

  const seedTexts = [];
  for (let i = 0; i < N; i++) seedTexts.push(chronOf(`#seed=d4-${i}&${BASE}`).text);
  const cross = sameness("cross-seed", seedTexts);

  const knobTexts = [chronOf(`#seed=d4-knob&${BASE}`).text];
  for (const [k, v] of KNOBS) knobTexts.push(chronOf(`#seed=d4-knob&${BASE}&${k}=${v}`).text);
  const within = sameness("within-seed cross-knob", knobTexts);

  console.log(`| measure | n | distinct | **overlap** | §7.4 ceiling | |`);
  console.log(`|---|---|---|---|---|---|`);
  for (const [r, ceil] of [[cross, 0.20], [within, 0.45]])
    console.log(`| ${r.label} | ${r.n} | ${r.distinct}/${r.n} | **${r.overlap}** | < ${ceil} | ${r.overlap < ceil ? "PASS" : "**OVER**"} |`);
  console.log(`\ncross-seed type-token ${cross.typeToken}, bigram entropy ${cross.entropy}`);
  console.log(`within-seed type-token ${within.typeToken}, bigram entropy ${within.entropy}`);

  // the raw line-Jaccard the sweep prints today, for the comparison
  const lineSet = (t) => new Set(t.split("\n").map(s => s.trim()).filter(s => s.length > 8));
  const sets = seedTexts.map(lineSet);
  let jac = 0, pairs = 0;
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
    let inter = 0; for (const x of sets[i]) if (sets[j].has(x)) inter++;
    const uni = sets[i].size + sets[j].size - inter;
    jac += uni ? inter / uni : 0; pairs++;
  }
  console.log(`\nFor comparison, the RAW line-Jaccard the sweep prints today: ${(jac / pairs).toFixed(3)}.`);
  console.log(`It is lower because it counts a line as shared only when the NAMES in it match too,`);
  console.log(`which scores one template over different towns as different prose.`);
  process.exit(0);
}

// Where does the sameness LIVE? Overlap per act, so the authoring goes where the
// repetition is rather than spread evenly over a chronicle whose event prose is
// already five-way varied.
if (has("sections")) {
  const texts = [];
  for (let i = 0; i < N; i++) texts.push(chronOf(`#seed=d4-${i}&${BASE}`).text);
  const acts = new Map();
  for (const t of texts) {
    let cur = "(preamble)";
    const buf = new Map();
    for (const line of t.split("\n")) {
      if (line.startsWith("## ")) cur = line.slice(3).replace(/,? *(Year )?\d+/g, "").trim();
      else if (line.trim()) buf.set(cur, (buf.get(cur) || "") + " " + line);
    }
    for (const [k, v] of buf) { if (!acts.has(k)) acts.set(k, []); acts.get(k).push(v); }
  }
  console.log(`# #140 — where the sameness lives, ${N} seeds\n`);
  console.log(`| act | n | distinct | overlap | words/seed |\n|---|---|---|---|---|`);
  const rows = [...acts.entries()].map(([k, v]) => {
    const d = E.loomDiversity(v.map(chronSkeleton));
    const w = Math.round(v.reduce((a, x) => a + chronSkeleton(x).split(" ").length, 0) / v.length);
    return { k, n: d.n, distinct: d.distinct, overlap: d.overlap, w };
  }).sort((a, b) => b.overlap - a.overlap);
  for (const r of rows) console.log(`| ${r.k} | ${r.n} | ${r.distinct} | **${r.overlap}** | ${r.w} |`);
  const tot = rows.reduce((a, r) => a + r.w, 0);
  console.log(`\nWeighted by words, the acts contribute to the whole-chronicle overlap in`);
  console.log(`proportion ` + rows.map(r => `${r.k} ${(100*r.w/tot).toFixed(0)}%`).join(", ") + `.`);
  process.exit(0);
}

// Do the KNOBS change which beats fire at all? This is the measurement that decides
// whether §7.4's within-seed ceiling is a prose target or a knob-reach finding. Strip
// every figure and every name and what is left is the beat structure; if two knob
// variants share it, the beats fired identically and only the values moved, and no
// amount of composing will separate them — the composition substream is keyed on the
// seed, so both variants draw the same fragments too.
if (has("knobs")) {
  const beats = (t) => t.split("\n").map(x => x.trim()).filter(x => x.length > 8)
    .map(x => x.replace(/\d[\d,.]*/g, "#").replace(/\b[A-Z][a-zA-Z'’-]+\b/g, "N"));
  const b0 = new Set(beats(chronOf(`#seed=d4-knob&${BASE}`).text));
  console.log(`# #140 — do the knobs change WHICH BEATS FIRE?\n`);
  console.log(`base chronicle: ${b0.size} distinct beat-skeletons\n`);
  console.log(`| knob | beats | shared with base | Jaccard |\n|---|---|---|---|`);
  let worst = 0;
  for (const [k, v] of KNOBS) {
    const b1 = new Set(beats(chronOf(`#seed=d4-knob&${BASE}&${k}=${v}`).text));
    let inter = 0; for (const x of b0) if (b1.has(x)) inter++;
    const j = inter / (b0.size + b1.size - inter);
    worst = Math.max(worst, j);
    console.log(`| \`${k}=${v}\` | ${b1.size} | ${inter} | **${j.toFixed(2)}** |`);
  }
  console.log(`\nWorst case ${worst.toFixed(2)}: a knob at its extreme leaves that share of the`);
  console.log(`beat structure standing. The within-seed prose overlap cannot fall below what the`);
  console.log(`beats themselves share, so §7.4's 0.45 is not reachable by authoring — it is a`);
  console.log(`statement about how far the dials reach into the world, which is what`);
  console.log(`sweep.mjs section 1 already measures.`);
  process.exit(0);
}

if (has("sample")) {
  const seeds = arg("seeds", "d4-1,d4-2,d4-3").split(",");
  let md = `# The chronicle, composed — D4 sample (#140)\n\n`;
  md += `Generated by \`tools/proto/chronicle-proto.mjs\` against the shipping \`composeChronicle\`.\n\n`;
  for (const sd of seeds) {
    const { text } = chronOf(`#seed=${sd}&${BASE}`);
    md += `\n---\n\n## Seed \`${sd}\`\n\n`;
    md += text.split("\n").map(l => l.startsWith("#") ? "#" + l : l).join("\n");
  }
  console.log(md);
  process.exit(0);
}

// --floor answers the question the ceiling depends on: how low CAN this instrument
// go? Two acts of the SAME chronicle share a register, a world and a subject, and
// share no template at all; a chronicle and another world's findings panel share
// only the world's vocabulary. If 0.20 were near those numbers the ceiling would be
// a statement about the mask rather than about the prose.
if (has("floor")) {
  const bg = (t) => { const w = chronSkeleton(t).split(" "); const S = new Set();
    for (let i = 0; i < w.length - 1; i++) S.add(w[i] + " " + w[i + 1]); return S; };
  const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };
  const { text, model, S } = chronOf(`#seed=floor&${BASE}`);
  const acts = {}; let cur = "(preamble)";
  for (const line of text.split("\n")) {
    const h = /^## (.+)$/.exec(line);
    if (h) { cur = h[1].replace(/, Year \d+/, ""); continue; }
    (acts[cur] ||= []).push(line);
  }
  const keys = Object.keys(acts).filter(k => acts[k].join(" ").split(/\s+/).length > 120);
  console.log(`# #140 — the instrument's floor\n`);
  console.log(`Within ONE chronicle, act against act: same world, same register, no shared template.\n`);
  let worst = 0;
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const v = jac(bg(acts[keys[i]].join(" ")), bg(acts[keys[j]].join(" ")));
    worst = Math.max(worst, v);
    console.log(`  ${v.toFixed(3)}  ${keys[i]} vs ${keys[j]}`);
  }
  const other = chronOf(`#seed=floor2&${BASE}`);
  const panel = E.composeFindings(other.model, other.S, {}).map(b => b.text).join(" ");
  const vs = jac(bg(text), bg(panel));
  console.log(`\n  ${vs.toFixed(3)}  whole chronicle vs another world's findings panel`);
  console.log(`\nFloor ${Math.max(worst, vs).toFixed(3)}. The 0.20 ceiling sits well clear of it, so it is`);
  console.log(`a claim about the prose and not an artifact of the mask.`);
  process.exit(0);
}

// --repeats is the template test that does not depend on a hand-list of v1 strings.
// A template is a sentence EVERY world says; a fragment is one some worlds draw. So
// mask the names and figures out and count how many worlds share each sentence.
if (has("repeats")) {
  const df = new Map();
  for (let i = 0; i < N; i++) {
    const { text } = chronOf(`#seed=d4-${i}&${BASE}`);
    const seen = new Set();
    for (const line of text.split("\n")) {
      if (!line.trim() || line.startsWith("#") || line.startsWith("---")) continue;
      for (const sent of line.replace(/^\*\*Year \d+\.\*\* /, "").split(/(?<=[.;:])\s+/)) {
        const k = chronSkeleton(sent);
        if (k.split(" ").length >= 7) seen.add(k);
      }
    }
    for (const k of seen) df.set(k, (df.get(k) || 0) + 1);
  }
  const top = [...df.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log(`# #140 — is any sentence still a template? ${N} seeds\n`);
  for (const [k, n] of top) console.log(`  ${n}/${N}  ${k.slice(0, 100)}`);
  console.log(`\nWorst share ${(top[0][1] / N).toFixed(2)}. The v1 chronicle sat at 1.00 by construction:`);
  console.log(`every beat was one sentence, so every world said it.`);
  process.exit(0);
}

console.error("usage: --baseline | --sections | --knobs | --floor | --repeats | --sample [--seeds a,b,c] [--n 24]");
process.exit(1);
