// #136 GATE — the voices prototype. docs/voices-spec.md §6. ZERO app changes: this
// file lives in the scratchpad and reads the engine, never the other way round.
//
// Run from tools/proto (the repo's jsdom + d3-delaunay live one level up):
//   NODE_PATH=../node_modules node voices-proto.mjs \
//     --seeds atlas-1,atlas-2,atlas-3 --ep 10 > ../../docs/voices-sample.md
//   NODE_PATH=../node_modules node voices-proto.mjs --diag   (band reachability)
//
import { streams, markovWord, buildChain, chainWalk, NAME_CHAINS, NAME_CORPUS, registers, extractedBytes }
  from "./voices-extract.mjs";
import { ORAL, WRITTEN, FRAMES, SKINS, IMPERIAL_STEMS, SCALE } from "./voices-pools.mjs";
import { gen } from "../lib.mjs";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes("--" + k);
const EP = arg("ep", "10"), REGIONS = arg("regions", "24");
const SEEDS = arg("seeds", "atlas-1,atlas-2,atlas-3").split(",");
const N_VOICES = Number(arg("voices", "50"));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// =============================================================================
// §2  folk forms — pure functions of exported columns, no rv
// =============================================================================
const LADDER = [[5,"a twentieth"],[10,"a tithe"],[25,"a quarter part"],[33,"a third part"],
  [50,"half"],[67,"two parts in three"],[75,"three parts in four"],[90,"nine parts in ten"],
  [97,"all but the sweepings"]];
const folkFrac = (x) => { let best = "next to none"; for (const L of LADDER) if (x >= L[0]) best = L[1]; return best; };
const SOULS = [2,3,4,5,6,8,10,12,16,20,40,100];
const SOULW = ["two","three","four","five","six","eight","ten","twelve","sixteen","twenty","forty","a hundred"];
const folkCount = (per1k) => {
  if (per1k <= 0) return "not one soul in a hundred";
  const n = 1000 / per1k; let bi = 0, d = Infinity;
  for (let i = 0; i < SOULS.length; i++) { const dd = Math.abs(SOULS[i] - n); if (dd < d) { d = dd; bi = i; } }
  return `one soul in ${SOULW[bi]}`;
};
const TRIBUTE_FOLK = { 0: "nothing yet", 1: "one crate in ten", 2: "one crate in five", 3: "one crate in three" };
// §2 years: legib>=55 AND event age >= 2 epochs -> era-phrase, never a false year.
const ERA = (ageEp) => ageEp >= 8 ? "three lifetimes gone" : ageEp >= 5 ? "two lifetimes gone"
  : ageEp >= 3 ? "before the last reckoning" : "a lifetime gone";
const distortM = (c) => (c.trust < 40 || c.legib >= 55) ? 1 + (100 - c.trust + c.legib) / 200 : 1;

// =============================================================================
// §3  sentiment and the divergence law — spec formula, verbatim
// =============================================================================
const TRAJ = { boom: 18, stable: 0, decline: -14, collapse: -30 };
// §3's credit side reads `0.30·wealth` as if wealth were a 0-100 index. It is
// clamped 0-100 in the engine, but its REALIZED spread is far narrower and it
// depends on the income mix: p50 14 / max 61 at default weights, max 74 when the
// world runs on trade, max 35 under extraction. So the term carries a fraction of
// the headroom §3 assumed, and `proud` is starved.
//
// W_REF is the reference ceiling the term is stated against. Absolute, not a
// percentile: pride has to be a LEVEL (a town that holds something), never a RANK,
// or a uniformly destitute world manufactures proud towns out of its own misery —
// which is the one thing an instrument about inequality must not do.
let W_REF = Number(arg("wref", "60"));
function sentiment(c) {
  const T = TRAJ[c.boom] ?? 0;
  const G = 0.30*c.blight + 0.35*c.toll + 0.20*c.injustice + 18*(c.occupied?1:0) + 3*c.tribute + Math.max(0,-T);
  const C = 0.30*Math.min(100, c.wealth * 100 / W_REF) + 0.25*c.trust + 0.15*c.market + 0.10*c.sky + Math.max(0,T);
  return clamp(Math.round(C - G), -100, 100);
}
const bandOf = (s) => s <= -45 ? "fury" : s <= -10 ? "aggrieved" : s <= 15 ? "weary" : s <= 40 ? "steady" : "proud";
const SIDE = { fury: "neg", aggrieved: "neg", weary: "mid", steady: "pos", proud: "pos" };
const HARM = new Set(["toll","blight","burden","abandon","tribute","water"]);
const ACHIEVE = new Set(["works","boom","grid","port","sky"]);
const DISORDER = new Set(["smuggling"]);
// §3 (#136 §7.6, resolved): `elsewhere` splits by DIRECTION, because the office's
// interest does. What the region LOST to somewhere else is a harm it wants to look
// blameless for, and is minimised like any harm (+D). What was decided above it and
// merely passes through — the exchange's grade, the metropole's standard, a price
// set elsewhere — is a thing it wants to look powerless over, and deflates toward
// "not a matter for this office" (−D). The topic's own trigger already carries both
// conditions (`emig >= 100` outward; `market`/`isPort` inward), so the direction is
// read from the same columns that raised the topic.
const elsewhereOutward = (c) => c.emig >= 100;
function written(sOral, lead, c) {
  const D = Math.round(0.45*c.legib + 0.15*(100 - c.trust));
  let skew = 0, why;
  if (HARM.has(lead))          { skew = +D; why = "harm minimised"; }
  else if (ACHIEVE.has(lead))  { skew = +D; why = "achievement inflated"; }
  else if (DISORDER.has(lead)) { skew = c.occupied ? -D : +D; why = c.occupied ? "censorate deflates disorder" : "constabulary inflates disorder"; }
  else if (lead === "elsewhere") {
    const out = elsewhereOutward(c);
    skew = out ? +D : -D;
    why = out ? "outward loss minimised" : "structural relation deflated (no discretion claimed)";
  }
  else                         { skew = 0;  why = "no interest engaged"; }
  let s = clamp(sOral + skew, -100, 100);
  let corridor = false;
  if (c.occupied) { const t = clamp(s, -10, 25); corridor = t !== s; s = t; }
  return { D, skew, s, why, corridor };
}

// =============================================================================
// world facts: everything a voice may name must come from here, verbatim
// =============================================================================
const stripArt = (s) => String(s).replace(/^(the|The)\s+/, "");
function worldOf(gj, seed) {
  const F = gj.features.map(f => f.properties);
  const H = gj.hinterland;
  const regions = F.filter(p => p.kind === "region");
  const settle = new Map(F.filter(p => p.kind === "settlement").map(p => [p.region_id, p]));
  const holderOf = (h) => h === "crown" ? "the Crown's assessor" : h === "temple" ? "the Ministry's assessor"
    : h === "magnate" ? "the syndicate's factor" : h === "dominion" ? "the Dominion's officer" : "the office";
  const gates = new Map();
  for (const p of F) if (["bridge","pass","port"].includes(p.kind)) {
    const n = p.bridge_name || p.pass_name || p.port_name;
    if (n && !gates.has(p.region_id)) gates.set(p.region_id, { name: n, holder: holderOf(p.held_by) });
  }
  const rivers = F.filter(p => p.kind === "river" && p.river_name);
  const shrines = new Map(F.filter(p => p.kind === "sanctioned_site" && p.site_name).map(p => [p.region_id, p.site_name]));
  const ruins = new Map(F.filter(p => p.kind === "ruin" && p.ruin_name).map(p => [p.region_id, p.ruin_name]));
  const roads = F.filter(p => p.kind === "road" && p.road_name)
    .sort((a, b) => (b.traffic ?? 0) - (a.traffic ?? 0));      // the busiest named road wins
  const roadNamed = roads.length;
  const evs = H.events || [];
  const namedEv = new Map();
  for (const e of evs) if (e.region_id !== undefined && e.name) namedEv.set(e.region_id, { name: e.name, epoch: e.epoch });
  const rulers = H.rulers || {};
  const rulerNow = {};                       // faction -> the ruler in force at the last epoch
  for (const [f, list] of Object.entries(rulers)) {
    const cur = list.filter(r => r && r.name).sort((a,b) => a.from_epoch - b.from_epoch).pop();
    if (cur) rulerNow[f] = cur.name;
  }
  const inst = H.institutions || {}, pow = H.powers || {}, W = H.world || {};
  const lastEp = Math.max(0, (W.price_index || [1]).length - 1);
  const wf = {
    seed, regions, settle, gates, shrines, ruins, roadNamed, nEpochs: lastEp + 1,
    year: 1000 + 25 * (Number(EP)),
    metropole: pow.metropole || null, rival: pow.rival || null,
    exchange: inst.exchange || null, gazette: inst.gazette || null,
    precinct: inst.precinct || null, buried: inst.buried_power || null,
    skyway: (H.skyway || {}).name || null,
    priceIdx: (W.price_index || [])[lastEp] ?? null,
    attention: (W.imperial_attention || [])[lastEp] ?? 0,
    regime: (W.regime_chain || [])[lastEp] ?? null,
    rulerNow,
    riverOf: (id) => { const r = rivers.find(rv => (rv.chain_regions||[]).includes(id)); return r ? r.river_name : null; },
    eventOf: (id) => namedEv.get(id) || null,
    roadOf: (id) => { const r = roads.find(x => x.from_region === id || x.to_region === id); return r ? r.road_name : null; },
  };
  // every proper noun a voice may utter, plus its article-stripped form (V3 basis)
  const allNames = new Set();
  const add = (n) => { if (n) { allNames.add(String(n)); allNames.add(stripArt(n)); } };
  for (const p of F) for (const k of ["name","bridge_name","pass_name","port_name","river_name","road_name","site_name","ruin_name"]) add(p[k]);
  for (const v of namedEv.values()) add(v.name);
  for (const list of Object.values(rulers)) for (const r of (list||[])) add(r && r.name);
  for (const n of [wf.metropole, wf.rival, wf.exchange, wf.gazette, wf.precinct, wf.buried, wf.skyway]) add(n);
  wf.allNames = allNames;

  // ---- coins (spec §1, three tiers) ------------------------------------------
  // world-coins: minted ONCE per world per register, shared across voices (oaths are
  // culture, not per-speaker invention).
  const corpusWords = new Set();
  for (const list of Object.values(NAME_CORPUS)) for (const w of list) corpusWords.add(String(w).toLowerCase());
  // reject corpus words (§1); `seen` keeps a register's three oaths from being one
  // oath printed three times.
  const mint = (reg, r, lo, hi, seen) => {
    for (let i = 0; i < 24; i++) {
      const w = markovWord(reg, r, lo, hi);
      if (w && !corpusWords.has(w.toLowerCase()) && !(seen && seen.has(w.toLowerCase()))) {
        if (seen) seen.add(w.toLowerCase());
        return w;
      }
    }
    return null;
  };
  wf.worldCoin = {};
  for (const reg of registers) {
    const ro = streams(seed)(`voicecoin#${reg}#oath`), rs = streams(seed)(`voicecoin#${reg}#slang`);
    const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
    const so = new Set(), ss = new Set();
    wf.worldCoin[reg] = {
      oath:  [0,1,2].map(() => mint(reg, ro, 3, 6, so)).filter(Boolean).map(cap),   // an oath is a name
      slang: [0,1,2].map(() => (mint(reg, rs, 3, 6, ss) || "").toLowerCase()).filter(Boolean),
    };
  }
  wf.mint = mint;
  // imperial-coins: one corpus, the Concordat tongue, deliberately unlike every
  // regional phonology. Minted once per world; blend rate driven by the attention
  // proxy (world.imperial_attention, which the export already carries).
  NAME_CHAINS.__imperial = buildChain(IMPERIAL_STEMS);
  const ri = streams(seed)("voicecoin#imperial");
  wf.imperial = []; { const seen = new Set();
    for (let i = 0; i < 60 && wf.imperial.length < 4; i++) {
      const w = chainWalk(NAME_CHAINS.__imperial, ri, 8);
      if (!w || w.length < 4 || seen.has(w)) continue;
      seen.add(w); wf.imperial.push(w.charAt(0).toUpperCase() + w.slice(1));
    } }
  for (const w of wf.imperial) allNames.add(w);   // minted here, so nameable here
  return wf;
}

// =============================================================================
// context: one row of exported columns, renamed to the spec's vocabulary
// =============================================================================
function ctxOf(p, st, world) {
  const g = world.gates.get(p.region_id) || null;
  const ev = world.eventOf(p.region_id);
  return {
    id: p.region_id, town: st.name, epithet: st.epithet || null, register: st.name_register || "lowland",
    // spec column -> real export column (drifts noted in the report)
    wealth: p.wealth, pop: p.population, blight: p.blight_load, downstream: p.downstream_blight ?? 0,
    toll: p.tariff_burden ?? 0,                    // spec calls this toll_burden
    injustice: p.injustice_idx, occupied: p.occupied === 1, tribute: p.tribute_burden ?? 0,
    trust: p.social_trust, legib: p.legibility_gap, uncounted: p.uncounted_population ?? 0,
    market: p.market_access, sky: p.sky_advantage, isSkyport: p.is_skyport === 1, isPort: p.is_port === 1,
    onRiver: p.on_river === 1, burden: p.disease_burden_per_1k, eliteShare: p.elite_share,
    works: p.aetherworks_capacity ?? 0,            // spec calls this refining_capacity
    boom: p.boom_bust, abandon: p.abandonment_index ?? 0, smuggling: p.smuggling_intensity ?? 0,
    blackMarket: p.black_market_index ?? 0, onGrid: p.on_grid === 1, gridAccess: p.grid_access ?? 0,
    sanctuary: p.has_sanctuary === 1, safeWater: p.safe_water, serviceGap: p.service_gap_idx ?? 0,
    arcane: p.arcane_service_index ?? 0,
    endow: p.aetherstone_endowment ?? 0, emig: p.emigrants_total ?? 0, remit: p.remittance_income ?? 0,
    order: p.order_level ?? 50, security: p.security_status, exhausted: p.exhausted_lode === 1,
    tenure: p.tenure_regime, cultDist: p.cultural_distance ?? 0, pilgrim: p.pilgrim_flux ?? 0,
    rugged: p.terrain_ruggedness ?? 0, temp: p.temperature ?? 50, bloc: p.dominant_bloc,
    // named world facts
    gate: g ? g.name : null, holder: g ? g.holder : null,
    river: world.riverOf(p.region_id), road: world.roadOf(p.region_id),
    shrine: world.shrines.get(p.region_id) || null,
    ruin: world.ruins.get(p.region_id) || null,
    event: ev ? ev.name : null, eventEpoch: ev ? ev.epoch : null,
    ruler: world.rulerNow[p.dominant_bloc] || world.rulerNow.crown || null,
    metropole: world.metropole, rival: world.rival, exchange: world.exchange,
    gazette: world.gazette, precinct: world.precinct, buried: world.buried, skyway: world.skyway,
    priceIdx: world.priceIdx, attention: world.attention, regime: world.regime, year: world.year,
  };
}
// §1 skin selection, in the spec's stated order
const skinOf = (c) => (c.works > 0 || c.onGrid) ? "works-town"
  : (c.market >= 55 || c.isPort) ? "metropolitan"
  : (c.sanctuary || c.pilgrim >= 40) ? "old-faith" : "frontier";

// =============================================================================
// §2 folk attribution: blame-shift and its mirror, credit-shift
// =============================================================================
// oral grievance blames the nearest VISIBLE named institution, in the spec's
// precedence, regardless of the true driver; oral boast credits the nearest LOCAL
// agent. Both the shifted target and the true driver go into facts[].
const blameTarget = (c) =>
  c.holder ? c.holder
  : c.security !== "ungoverned" ? "the constabulary"
  : c.isSkyport && c.skyway ? `the ${c.skyway} line`
  : c.ruler ? `${c.ruler}'s assessor` : "the seat";
const creditTarget = (c) =>
  c.works > 0 ? "the works-master"
  : c.sanctuary && c.shrine ? `the keeper at ${c.shrine}`
  : c.ruler ? `${c.ruler}'s people` : "the row itself";
const driverOf = (c, topic) =>
  topic === "toll"    ? `tariff_burden ${c.toll} set on the crossing schedule`
  : topic === "blight"  ? (c.downstream >= 1 ? `downstream_blight ${c.downstream} from works upstream` : `blight_load ${c.blight} deposited in place`)
  : topic === "burden"  ? `disease_burden_per_1k ${c.burden} against safe_water ${c.safeWater}`
  : topic === "abandon" ? `abandonment_index ${c.abandon} with emigrants_total ${c.emig}`
  : topic === "tribute" ? `tribute_burden ${c.tribute} under occupation since epoch ${c.eventEpoch ?? "?"}`
  : ACHIEVE.has(topic)  ? `world price_index ${c.priceIdx} and grid_access ${c.gridAccess}`
  : `market_access ${c.market}`;

// =============================================================================
// topics
// =============================================================================
const TOPICS = [
  { k:"toll",     sal: c => c.toll,          on: c => c.toll >= 20 },
  { k:"blight",   sal: c => c.blight,        on: c => c.blight >= 30 },
  { k:"burden",   sal: c => c.burden,        on: c => c.burden >= 30 },
  { k:"water",    sal: c => 100 - c.safeWater, on: c => c.safeWater < 45 },
  { k:"tribute",  sal: c => 30 * c.tribute,  on: c => c.occupied },
  { k:"abandon",  sal: c => c.abandon,       on: c => c.abandon >= 25 },
  { k:"smuggling",sal: c => c.smuggling,     on: c => c.smuggling >= 25 || c.blackMarket >= 40 },
  { k:"works",    sal: c => c.works,         on: c => c.works >= 25 },
  { k:"boom",     sal: c => c.wealth + 20,   on: c => c.boom === "boom" || c.wealth >= 25 },
  { k:"grid",     sal: c => c.arcane,        on: c => c.onGrid },
  { k:"port",     sal: c => c.market,        on: c => c.isPort },
  { k:"sky",      sal: c => c.sky,           on: c => c.isSkyport || c.sky >= 40 },
  { k:"elsewhere",sal: c => c.market,        on: c => c.market >= 30 || c.isPort || c.emig >= 100 },
];
// salience bonus: +15 when a NAMED fact anchors the topic, +10 for elsewhere when
// the attention proxy is high (spec §2 step 3).
const anchored = (t, c) => (t === "toll" && c.gate) || (t === "blight" && c.river)
  || (t === "works" && c.works > 0) || (t === "abandon" && c.event) || (t === "tribute" && c.occupied);
const CLASSES = {
  oral: { toll:["grievance","witness"], blight:["grievance","witness"], burden:["grievance","witness"],
    water:["grievance","witness"], tribute:["grievance","oath"], abandon:["grievance","witness"],
    smuggling:["rumor","witness"], works:["aspiration","witness"], boom:["aspiration","elsewhere"],
    grid:["aspiration","witness"], port:["aspiration","elsewhere"], sky:["aspiration","rumor"],
    elsewhere:["elsewhere","rumor"] },
  written:{ toll:["assess","euphemism"], blight:["assess","euphemism"], burden:["assess","euphemism"],
    water:["assess","plea"], tribute:["assess","circular"], abandon:["assess","euphemism"],
    smuggling:["assess","euphemism"], works:["assess","puffery"], boom:["puffery","assess"],
    grid:["puffery","marginalia"], port:["assess","puffery"], sky:["puffery","assess"],
    elsewhere:["circular","assess"] },
};

// =============================================================================
// slot filling
// =============================================================================
// Article discipline: slots marked ART render WITH their article ("the Nettenhold");
// every other name slot renders bare. Fragments are authored to match, so no
// fragment ever writes "the {river}".
const NAME_SLOT = {
  town:      { get: c => c.town,       art: false },
  gate:      { get: c => c.gate,       art: false, fallback: "the crossing" },
  river:     { get: c => c.river,      art: true,  fallback: "the water" },
  road:      { get: c => c.road,       art: true,  fallback: "the road" },
  ruler:     { get: c => c.ruler,      art: false, fallback: "the seat" },
  shrine:    { get: c => c.shrine,     art: false, fallback: "the old porch" },
  ruin:      { get: c => c.ruin,       art: false, fallback: "the old stones" },
  metropole: { get: c => c.metropole,  art: true,  fallback: "the Concordat" },
  rival:     { get: c => c.rival,      art: true,  fallback: "the other power" },
  exchange:  { get: c => c.exchange,   art: false, fallback: "the exchange" },
  gazette:   { get: c => c.gazette,    art: true,  fallback: "the gazette" },
  precinct:  { get: c => c.precinct,   art: false, fallback: "the precinct" },
  buried:    { get: c => c.buried,     art: false, fallback: "the old power" },
  skyway:    { get: c => c.skyway,     art: false, fallback: "the lift" },
};
// {num:x} -> column + kind. index: 0-100, folkFrac in oral. count: per-1k, "one soul
// in N". share: rendered orally as a fraction of population. raw/float: written only.
const NUM = {
  toll:{ g:c=>c.toll, k:"index" }, blight:{ g:c=>c.blight, k:"index" },
  burden:{ g:c=>c.burden, k:"count" }, market:{ g:c=>c.market, k:"index" },
  works:{ g:c=>c.works, k:"index" }, elite:{ g:c=>c.eliteShare, k:"index" },
  abandon:{ g:c=>c.abandon, k:"index" }, smuggling:{ g:c=>c.smuggling, k:"index" },
  safewater:{ g:c=>c.safeWater, k:"index" }, legib:{ g:c=>c.legib, k:"index" },
  wealth:{ g:c=>c.wealth, k:"index" }, trust:{ g:c=>c.trust, k:"index" },
  injustice:{ g:c=>c.injustice, k:"index" }, servicegap:{ g:c=>c.serviceGap, k:"index" },
  order:{ g:c=>c.order, k:"index" }, endow:{ g:c=>c.endow, k:"index" },
  pop:{ g:c=>c.pop, k:"raw" }, emig:{ g:c=>c.emig, k:"raw" },
  uncounted:{ g:c=>c.uncounted, k:"share" },
  price:{ g:c=>c.priceIdx, k:"float" }, year:{ g:c=>c.year, k:"raw" },
  tribute:{ g:c=>c.tribute, k:"ordinal" },
};
const TRADE = (c) => c.isPort ? "fish and freight" : c.works > 0 ? "works"   // bare: fragments supply the article
  : c.endow >= 50 ? "ore" : c.market >= 45 ? "freight and factoring"
  : c.onGrid && c.arcane >= 45 ? "grid-work" : c.rugged >= 40 ? "quarry-work"
  : "hauling and mill-work";

function fill(text, c, reg, V) {
  return text.replace(/\{([a-z:]+)\}/g, (_, slot) => {
    if (NAME_SLOT[slot]) {
      const d = NAME_SLOT[slot], raw = d.get(c);
      if (!raw) return d.fallback;                      // a generic noun, never a name
      V.names.push({ told: String(raw), raw: String(raw), rule: "verbatim" });
      return d.art && !/^the\s/i.test(raw) ? "the " + raw : raw;
    }
    if (slot === "holder") return c.holder || "the office";
    if (slot === "trade")  return TRADE(c);
    if (slot === "blamed") { V.facts.push({ path:"attribution", true: V.driver, told: V.blamed,
      rule: "blame-shift: nearest visible named institution (§2)" }); return V.blamed; }
    if (slot === "credited") { V.facts.push({ path:"attribution", true: V.driver, told: V.credited,
      rule: "credit-shift: nearest local agent (§2)" }); return V.credited; }
    if (slot === "coin:oath")   return V.coins.oath;
    if (slot === "coin:slang")  return V.coins.slang;
    if (slot === "coin:burden") return V.coins.burden;
    if (slot === "coin:imperial") return V.coins.imperial;
    if (slot === "event") {
      if (!c.event) return "the bad year";
      if (reg === "written") { V.names.push({ told: c.event, raw: c.event, rule: "verbatim" }); return c.event; }
      // ORAL (§2): the year is dropped when the census cannot see the town and the
      // event is old; a self-referential event name shortens. Drift by omission,
      // never by stating a false year — and it is what lets V2 hold at all, since
      // export event names carry their year ("the Drought of 1025").
      const ageEp = c.eventEpoch === null ? 0 : (world_nEpochs - c.eventEpoch);
      let short = c.event
        .replace(new RegExp("\\s+at\\s+" + c.town + "\\b"), "")
        .replace(new RegExp("(^|\\s)" + c.town + "\\s+"), "$1");
      const hadYear = /\s+of\s+\d+/.test(short);
      short = short.replace(/\s+of\s+\d+.*$/, "");
      const told = (hadYear && c.legib >= 55 && ageEp >= 2) ? `${short}, ${ERA(ageEp)},` : short;
      const rule = hadYear ? (c.legib >= 55 && ageEp >= 2 ? "oral: year omitted for an era-phrase (legib≥55, age≥2)" : "oral: year dropped, name kept")
                           : "oral: self-reference dropped";
      V.facts.push({ path: "event", true: c.event, told, rule });
      V.names.push({ told, raw: c.event, rule });
      return told;
    }
    if (slot.startsWith("num:")) {
      const d = NUM[slot.slice(4)]; if (!d) return "";
      const val = d.g(c);
      if (val === null || val === undefined) return "";
      if (reg === "written") {                        // exact export digits, no separators
        const told = String(val);
        V.facts.push({ path: slot.slice(4), true: val, told, rule: "written: verbatim" });
        return told;
      }
      const m = distortM(c);
      let told;
      if (d.k === "ordinal")      told = TRIBUTE_FOLK[clamp(Math.round(val),0,3)];      // exempt from m
      else if (d.k === "count")   told = folkCount(val * m);
      else if (d.k === "share")   told = folkFrac(Math.round(100 * val / Math.max(1, c.pop) * m));
      else if (d.k === "index")   told = folkFrac(Math.round(val * m));
      else                        told = folkFrac(Math.round(100 * val / Math.max(1, c.pop) * m));
      V.facts.push({ path: slot.slice(4), true: val, told,
        rule: d.k === "ordinal" ? "folk ordinal (m exempt)" : m > 1 ? `folk ×${m.toFixed(2)}` : "folk" });
      return told;
    }
    return "";
  });
}
let world_nEpochs = 10;

// capitalize the opening letter and every letter that opens a new sentence.
const capitalize = (s) => s.replace(/(^|[.!?]\s+)([a-z])/g, (_, p, ch) => p + ch.toUpperCase());

// =============================================================================
// assembly (§2)
// =============================================================================
function buildVoice(c, reg, k, world, worldSurf) {
  const rv = streams(world.seed)(`voice#${c.id}#${reg}#${k}`);
  const sOral = sentiment(c), band = bandOf(sOral), side = SIDE[band], skin = skinOf(c);
  const S = SKINS[skin];

  const live = TOPICS.filter(t => t.on(c))
    .map(t => ({ k: t.k, s: t.sal(c) + (anchored(t.k, c) ? 15 : 0) + (t.k === "elsewhere" && c.attention >= 0.6 ? 10 : 0) }))
    .sort((a, b) => b.s - a.s || a.k.localeCompare(b.k));
  const n = clamp(2 + (Math.abs(sOral) >= 35 ? 1 : 0) + (rv() < 0.35 ? 1 : 0), 2, 4);
  const ordered = live.length ? live : [{ k: "elsewhere" }];
  // k=1 is the SECOND pair for a top region: forced onto different topics (§2 step 1).
  const topics = (k === 0 ? ordered.slice(0, n) : ordered.slice(n).concat(ordered).slice(0, n)).map(t => t.k);
  const lead = topics[0];
  const W = written(sOral, lead, c);

  const wc = world.worldCoin[c.register] || world.worldCoin[registers[0]];
  const pickW = (a) => a[Math.floor(rv() * a.length)];
  const V = {
    facts: [], names: [], driver: driverOf(c, lead), blamed: blameTarget(c), credited: creditTarget(c),
    coins: {
      oath:  pickW(wc.oath.length ? wc.oath : ["Farrow"]),                       // world-coin
      slang: pickW(wc.slang.length ? wc.slang : ["osten"]),                      // world-coin
      burden: (world.mint(c.register, rv, 3, 5, null) || "gruk").toLowerCase(),  // voice-coin
      imperial: world.imperial.length ? pickW(world.imperial) : "Calderine",     // imperial-coin
    },
  };

  const usedFrag = new Set(), classesUsed = [], surfaces = [];
  const pool = reg === "oral" ? ORAL : WRITTEN;
  // one forced re-draw when a realized SURFACE is already spent for the world (§1).
  // Surface = fragment x slot fill x diction skin, so the re-draw is on the realized
  // text, not on the template id.
  const draw = (cls) => {
    if (cls === "aspiration" && band === "fury") return null;   // no boasting in a fury voice
    const cands = (pool[cls] || []).filter(f => f.req(c) && (!f.band || f.band(band)) && !usedFrag.has(f.t));
    if (!cands.length) return null;
    let f = cands[Math.floor(rv() * cands.length)];
    const key = (x) => (cls + "|" + fill(x.t, c, reg, { ...V, facts: [], names: [] }) + "|" + skin);
    if ((worldSurf.get(key(f)) || 0) >= 3) {
      const fresh = cands.filter(x => (worldSurf.get(key(x)) || 0) < 3);
      if (fresh.length) f = fresh[Math.floor(rv() * fresh.length)];
    }
    usedFrag.add(f.t); classesUsed.push(cls);
    return f;
  };
  const realize = (f, cls) => { const t = fill(f.t, c, reg, V); surfaces.push(cls + "|" + t + "|" + skin); return t; };

  const sentences = []; const usedAside = new Set(), usedConn = new Set();
  const openCls = reg === "oral" ? "open" : "head";
  const openF = draw(openCls);
  if (openF) sentences.push(realize(openF, openCls) + ".");

  for (let i = 0; i < topics.length; i++) {
    const pair = CLASSES[reg][topics[i]] || (reg === "oral" ? ["witness","closer"] : ["assess","marginalia"]);
    const ca = pair[0], cb = pair[1];
    const fa = draw(ca), fb = draw(cb);
    if (!fa && !fb) continue;
    const A = fa ? realize(fa, ca) : null, B = fb ? realize(fb, cb) : null;
    let fr = FRAMES[reg][Math.floor(rv() * FRAMES[reg].length)];
    if (!A || !B) fr = "{A}.";                       // one clause, no dangling connective
    const connPool = reg === "oral" ? S.conn.oral[side] : S.conn.written;
    let conn = pickW(connPool);
    const freshConn = connPool.filter(x => !usedConn.has(x));
    if (usedConn.has(conn) && freshConn.length) conn = pickW(freshConn);
    usedConn.add(conn);
    let aside = pickW(S.aside[reg]);
    const freshAside = S.aside[reg].filter(a => !usedAside.has(a));
    if (usedAside.has(aside) && freshAside.length) aside = pickW(freshAside);
    usedAside.add(aside);
    let s = fr.replace("{A}", A || B).replace("{B}", B || "").replace("{conn}", conn).replace("{aside}", aside);
    sentences.push(s);
  }
  const closeF = draw("closer");
  if (closeF) sentences.push(realize(closeF, "closer") + ".");

  // a fragment may not repeat within a region's oral+written pair (usedFrag), and no
  // realized sentence may repeat within a voice.
  const seen = new Set(), out = [];
  for (const s of sentences) { const kk = s.toLowerCase(); if (seen.has(kk)) continue; seen.add(kk); out.push(s); }
  for (const s of surfaces) worldSurf.set(s, (worldSurf.get(s) || 0) + 1);

  return { text: capitalize(out.join(" ")).replace(/\s+/g, " ").trim(),
           facts: V.facts, names: V.names, sOral, band, side, skin, W, topics, lead,
           coins: V.coins, classes: classesUsed, surfaces, driver: V.driver,
           blamed: V.blamed, credited: V.credited };
}

// =============================================================================
// invariants V1-V6
// =============================================================================
const BANNED = /\b(dollar|euro|pound sterling|christ|allah|buddha|england|france|china|america|london|paris|xp|mana|quest|npc|loot|guild)\b/i;
function invariants(voices, world) {
  const R = {}, ev = {};
  const nameDigits = new Set();
  for (const n of world.allNames) for (const d of (String(n).match(/\d+/g) || [])) nameDigits.add(d);

  ev.V1 = [];
  R.V1 = voices.filter(v => v.reg === "written").every(v => {
    const told = new Set(v.facts.flatMap(f => String(f.told).match(/\d+/g) || []));
    const bad = (v.text.match(/\d+/g) || []).filter(d => !told.has(d) && !nameDigits.has(d));
    if (bad.length) ev.V1.push({ town: v.c.town, bad, text: v.text.slice(0, 120) });
    return !bad.length;
  });
  ev.V2 = [];
  R.V2 = voices.filter(v => v.reg === "oral").every(v => {
    const d = v.text.match(/\d/g); if (d) ev.V2.push({ town: v.c.town, text: v.text.slice(0, 120) });
    return !d;
  });
  ev.V3 = [];
  const legalShortenings = (raw, town) => {
    const set = new Set([raw]);
    const noSelf = raw.replace(new RegExp("\\s+at\\s+" + town + "\\b"), "")
                      .replace(new RegExp("(^|\\s)" + town + "\\s+"), "$1");
    set.add(noSelf);
    for (const base of [raw, noSelf]) {
      const noYear = base.replace(/\s+of\s+\d+.*$/, "");
      set.add(noYear);
      for (const e of ["a lifetime gone","before the last reckoning","two lifetimes gone","three lifetimes gone"])
        set.add(`${noYear}, ${e},`);
    }
    return set;
  };
  R.V3 = voices.every(v => v.names.every(n => {
    const inExport = world.allNames.has(n.raw);
    const legal = n.told === n.raw || legalShortenings(n.raw, v.c.town).has(n.told);
    if (!inExport || !legal) ev.V3.push({ town: v.c.town, told: n.told, raw: n.raw, inExport, legal });
    return inExport && legal;
  }));
  R.V4 = voices.filter(v => v.reg === "written").every(v => v.sWritten === v.W.s);
  const surf = new Map();
  for (const v of voices) for (const s of v.surfaces) surf.set(s, (surf.get(s) || 0) + 1);
  R.maxRepeat = Math.max(0, ...surf.values());
  ev.V5 = voices.filter(v => /[Ѐ-ӿ]/.test(v.text) || BANNED.test(v.text)).map(v => v.c.town);
  R.V5 = !ev.V5.length && R.maxRepeat <= 3;
  return { R, surf, ev };
}

// =============================================================================
// main
// =============================================================================
const runSeed = async (sd) => {
  const { gj } = await gen(`#seed=${sd}&regions=${REGIONS}&ep=${EP}`);
  const world = worldOf(gj, sd);
  world_nEpochs = world.nEpochs;
  const ctxs = world.regions.filter(p => p.is_settled === 1)
    .map(p => { const st = world.settle.get(p.region_id); return st ? ctxOf(p, st, world) : null; })
    .filter(Boolean);
  // §2 step 1: rank by extremity X = |S_oral| + 10·occupied + 8·[epithet]. Absolute:
  // the proudest boom town ranks beside the angriest gate town.
  const ranked = ctxs.map(c => ({ c, X: Math.abs(sentiment(c)) + 10*(c.occupied?1:0) + 8*(c.epithet?1:0) }))
    .sort((a,b) => b.X - a.X || a.c.id - b.c.id);
  const worldSurf = new Map(), voices = [];
  const emit = (c, k) => { for (const reg of ["oral","written"]) {
    const v = buildVoice(c, reg, k, world, worldSurf);
    voices.push({ ...v, reg, c, k, sWritten: v.W.s }); } };
  for (const { c } of ranked) { if (voices.length >= N_VOICES) break; emit(c, 0); }
  // if regions·2 < 50, the top regions get a second pair forced onto other topics
  for (const { c } of ranked) { if (voices.length >= N_VOICES) break; emit(c, 1); }
  return { sd, world, voices, ...invariants(voices, world) };
};

// ---- --diag: band reachability against the engine's measured columns ---------
if (has("diag")) {
  const seeds = arg("dseeds", "").length ? arg("dseeds","").split(",")
    : Array.from({length: 20}, (_, i) => `atlas-${i+1}`);
  const H = { fury:0, aggrieved:0, weary:0, steady:0, proud:0 }; let N = 0;
  const HR = { fury:0, aggrieved:0, weary:0, steady:0, proud:0 };
  const HS = { fury:0, aggrieved:0, weary:0, steady:0, proud:0 };
  const Cs = [], Gs = [], terms = { wealth:[], trust:[], market:[], sky:[] };
  const allW = [];
  const rows = [];
  for (const sd of seeds) {
    const { gj } = await gen(`#seed=${sd}&regions=${REGIONS}&ep=${EP}`);
    const w = worldOf(gj, sd);
    const cs = w.regions.filter(p => p.is_settled === 1)
      .map(p => { const st = w.settle.get(p.region_id); return st ? ctxOf(p, st, w) : null; }).filter(Boolean);
    for (const c of cs) allW.push(c.wealth);
    rows.push(cs);
  }
  const sortedW = allW.slice().sort((a,b) => a-b);
  const pct = (x) => 100 * sortedW.filter(v => v < x).length / sortedW.length;
  for (const cs of rows) for (const c of cs) {
    const s = sentiment(c); H[bandOf(s)]++; N++;
    Cs.push(0.30*c.wealth + 0.25*c.trust + 0.15*c.market + 0.10*c.sky + Math.max(0, TRAJ[c.boom] ?? 0));
    Gs.push(0.30*c.blight + 0.35*c.toll + 0.20*c.injustice + 18*(c.occupied?1:0) + 3*c.tribute + Math.max(0, -(TRAJ[c.boom] ?? 0)));
    terms.wealth.push(0.30*c.wealth); terms.trust.push(0.25*c.trust);
    terms.market.push(0.15*c.market); terms.sky.push(0.10*c.sky);
    HR[bandOf(sentiment({ ...c, wealth: pct(c.wealth) }))]++;   // counterfactual only
    // third counterfactual: wealth kept ABSOLUTE, its coefficient rescaled to the
    // realized ceiling. Percentile makes pride relative — a uniformly destitute
    // world would manufacture proud towns by construction, which is the one thing
    // an instrument about inequality must not do. A fixed rescale gives the term
    // the headroom §3 assumed while leaving a poor world poor.
    HS[bandOf(sentiment({ ...c, wealth: Math.min(100, c.wealth * 100 / 55) }))]++;
  }
  const mn = (a) => a.reduce((x,y)=>x+y,0)/a.length;
  console.log(`# #136 diagnostic — sentiment band reachability, ${seeds.length} seeds, n=${N} settled regions\n`);
  console.log("## Bands under the spec's formula, verbatim\n");
  console.log("| band | n | share |\n|---|---|---|");
  for (const b of ["fury","aggrieved","weary","steady","proud"])
    console.log(`| ${b} | ${H[b]} | ${(100*H[b]/N).toFixed(1)}% |`);
  console.log(`\nmean C ${mn(Cs).toFixed(1)}, mean G ${mn(Gs).toFixed(1)}, mean S ${(mn(Cs)-mn(Gs)).toFixed(1)}\n`);
  console.log("## Where C's ceiling goes — mean contribution of each credit term\n");
  console.log("| term | weight | mean contribution | share of C |\n|---|---|---|---|");
  for (const [k, wgt] of [["wealth",0.30],["trust",0.25],["market",0.15],["sky",0.10]])
    console.log(`| ${k} | ${wgt} | ${mn(terms[k]).toFixed(1)} | ${(100*mn(terms[k])/mn(Cs)).toFixed(0)}% |`);
  console.log(`\nwealth percentiles across the sample: p50 ${sortedW[Math.floor(.5*sortedW.length)]}, ` +
    `p90 ${sortedW[Math.floor(.9*sortedW.length)]}, p99 ${sortedW[Math.floor(.99*sortedW.length)]}, max ${sortedW[sortedW.length-1]}`);
  console.log(`spec worked example (a) assumes wealth 31 → percentile ${pct(31).toFixed(1)}; ` +
    `example (d) assumes wealth 71 → percentile ${pct(71).toFixed(1)}\n`);
  console.log("## Counterfactual (NOT applied): wealth entered as its within-sample percentile\n");
  console.log("| band | n | share |\n|---|---|---|");
  for (const b of ["fury","aggrieved","weary","steady","proud"])
    console.log(`| ${b} | ${HR[b]} | ${(100*HR[b]/N).toFixed(1)}% |`);
  console.log("\n## Counterfactual (NOT applied): wealth kept ABSOLUTE, coefficient rescaled to its realized ceiling (x100/55)\n");
  console.log("| band | n | share |\n|---|---|---|");
  for (const b of ["fury","aggrieved","weary","steady","proud"])
    console.log(`| ${b} | ${HS[b]} | ${(100*HS[b]/N).toFixed(1)}% |`);
  // W_REF sweep, across the income mixes that move wealth's ceiling. Done HERE and
  // not in a scratch script on purpose: the context builder above maps the spec's
  // column names onto the export's real ones (`toll_burden` is `tariff_burden`,
  // `refining_capacity` is `aetherworks_capacity`), and a hand-rolled formula that
  // guesses those reads zeroes and reports a world that is happier than it is.
  {
    const MIX = [["defaults", ""], ["trade-heavy", "&we=10&wf=15&wt=65&wg=10"],
                 ["extraction", "&we=70&wf=15&wt=10&wg=5"], ["sealed", "&openness=0"]];
    const keep = W_REF;
    console.log("\n## W_REF sweep: the reference ceiling the wealth term is stated against\n");
    console.log("| income mix | W_REF | weary | steady | proud | wealth max |\n|---|---|---|---|---|---|");
    for (const [nm, extra] of MIX) {
      const cs = [];
      for (const sd of seeds.slice(0, 8)) {
        const { gj } = await gen(`#seed=${sd}&regions=${REGIONS}&ep=${EP}${extra}`);
        const w2 = worldOf(gj, sd);
        for (const p2 of w2.regions.filter(x => x.is_settled === 1)) {
          const st = w2.settle.get(p2.region_id);
          if (st) cs.push(ctxOf(p2, st, w2));
        }
      }
      const wmax = Math.max(...cs.map(c => c.wealth));
      for (const W of [100, 74, 60, 55]) {
        W_REF = W;
        const H2 = { fury:0, aggrieved:0, weary:0, steady:0, proud:0 };
        for (const c of cs) H2[bandOf(sentiment(c))]++;
        const pc = (b2) => `${(100 * H2[b2] / cs.length).toFixed(1)}%`;
        console.log(`| ${nm} | ${W} | ${pc("weary")} | ${pc("steady")} | **${pc("proud")}** | ${wmax} |`);
      }
    }
    W_REF = keep;
  }
  console.log("\nThe difference that matters is not the histogram, it is what `proud` MEANS:");
  console.log("under the percentile it is a rank (the top of THIS world, however poor the world);");
  console.log("under the rescale it is a level (a town that actually holds something).");
  process.exit(0);
}

const all = [];
for (const sd of SEEDS) all.push(await runSeed(sd));

let md = `# Voices from the People — prototype sample (#136 gate)\n\n`;
md += `\`voices-proto.mjs\`, scratchpad, **zero app changes**. Generated against real exports of\n`;
md += `\`index.html\` captured through the \`gen()\` pattern from \`tools/lib.mjs\`. The RNG\n`;
md += `(\`hashStr\`/\`mulberry32\`/\`streams\`) and the coiner (\`NAME_CORPUS\`/\`buildChain\`/\n`;
md += `\`chainWalk\`/\`markovWord\`) are pulled out of \`index.html\` by anchored regex — ${extractedBytes} bytes,\n`;
md += `${registers.length} registers — so every voice is recomputable from the export + \`index.html\`, and a\n`;
md += `moved symbol fails loudly instead of silently forking.\n\n`;
md += `Pools: **${SCALE}**. Seeds \`${SEEDS.join("`, `")}\`, ${REGIONS} regions, ${EP} epochs, ${N_VOICES} voices per seed.\n\n`;

const PROSE = has("all-prose") ? all.length : 1;
md += `Paragraphs are printed for \`${SEEDS[0]}\` (the ${N_VOICES} the gate asks to be read); `;
md += `the other ${SEEDS.length-1} seeds contribute their invariants. \`--all-prose\` prints every seed.\n\n`;
for (const [ai, a] of all.entries()) {
  const w = a.world;
  md += `\n## Seed \`${a.sd}\` — ${a.voices.length} voices\n\n`;
  md += `> world: metropole ${w.metropole} · rival ${w.rival} · exchange ${w.exchange} · gazette ${w.gazette} · `;
  md += `precinct ${w.precinct} · regime \`${w.regime}\` · price index ${w.priceIdx} · imperial attention ${w.attention}\n>\n`;
  md += `> world-coins (oaths, minted once per world per register): `;
  md += Object.entries(w.worldCoin).map(([r, v]) => `${r} ${v.oath.join("/")}`).join(" · ") + `\n>\n`;
  md += `> imperial coins (the Concordat tongue, one corpus): ${w.imperial.join(", ")}\n\n`;
  if (ai >= PROSE) { md += `*(paragraphs omitted; invariants below cover this seed)*\n\n`; continue; }
  for (let i = 0; i < a.voices.length; i += 2) {
    const o = a.voices[i], v = a.voices[i+1], c = o.c;
    md += `\n### ${i/2+1}. ${c.town}${c.epithet ? " " + c.epithet : ""}${o.k ? " (second pair)" : ""} — *${o.band}*\n\n`;
    md += `> S_oral **${o.sOral >= 0 ? "+" : ""}${o.sOral}** · D ${v.W.D} · lead \`${o.lead}\` (${v.W.why}) · `;
    md += `skew ${v.W.skew >= 0 ? "+" : ""}${v.W.skew} → S_written **${v.sWritten >= 0 ? "+" : ""}${v.sWritten}**`;
    md += `${v.W.corridor ? " *(censor's corridor)*" : ""} · skin \`${o.skin}\`\n>\n`;
    md += `> columns: wealth ${c.wealth} · toll ${c.toll} · blight ${c.blight} · burden ${c.burden}/1k · `;
    md += `trust ${c.trust} · legib ${c.legib} · works ${c.works} · ${c.boom}${c.occupied ? " · **OCCUPIED**" : ""}\n\n`;
    md += `**ORAL** — ${o.text}\n\n`;
    md += `**WRITTEN** — ${v.text}\n\n`;
    const F = [...o.facts, ...v.facts];
    if (F.length) {
      md += `| path | true | told | rule |\n|---|---|---|---|\n`;
      const seen = new Set();
      for (const f of F) { const kk = f.path + "|" + f.told; if (seen.has(kk)) continue; seen.add(kk);
        md += `| ${f.path} | ${f.true} | ${f.told} | ${f.rule} |\n`; }
      md += `\n`;
    }
  }
}

// ---- V6 across the seed sample ------------------------------------------------
const oralAll = all.flatMap(a => a.voices.filter(v => v.reg === "oral"));
const hist = {}; for (const v of oralAll) hist[v.band] = (hist[v.band]||0)+1;
const negBands = ["fury","aggrieved"].filter(b => hist[b]).length;
const posBands = ["steady","proud"].filter(b => hist[b]).length;
const negLoose = negBands + (hist.weary ? 1 : 0), posLoose = posBands + (hist.weary ? 1 : 0);
const cls = oralAll.flatMap(v => v.classes);
const nonGriev = cls.filter(k => k !== "grievance").length / Math.max(1, cls.length);
const V6strict = negBands >= 2 && posBands >= 2 && nonGriev >= 0.20;
const V6loose  = negLoose >= 2 && posLoose >= 2 && nonGriev >= 0.20;

// V6 AS RESTATED (#136, second run). The band check is a statement about the
// MODEL'S RANGE, so it is asserted over >= 200 settled regions at DEFAULT income
// weights — not over the ~75 voices three seeds happen to produce, where at a ~1%
// `proud` rate the check is a coin flip rather than a tripwire. The non-grievance
// share stays on the actual oral sentences, because that IS a statement about the
// voices. `weary` counts toward neither side: it straddles zero and is ~60% of
// towns, so counting it on both makes the invariant unfailable.
const V6_MIN_REGIONS = 200;
// The seed list is MIXED and written down, because the rate of the rarest band
// depends on the family: measured at W_REF 60, `proud` runs 1.1% over the atlas
// family and 5.3% over a generic one — 4.8x. Drawing the population from a single
// family would let that family's luck decide the verdict, which is how a check
// starts reporting the sample instead of the model. (This is also why V6 asks for
// REPRESENTATION rather than a rate: at 200 regions even a 1.1% band yields ~2
// towns, so the check survives the spread it was nearly fooled by.)
const V6_SEEDS = ["atlas-1","atlas-2","atlas-3","atlas-4","atlas-5","atlas-6","atlas-7",
                  "v6-1","v6-2","v6-3","v6-4","v6-5","v6-6","v6-7",
                  "fix-1","fix-2","fix-3","fix-4","fix-5","fix-6","e2-1","e2-2","e2-3"];
const bandPop = { fury:0, aggrieved:0, weary:0, steady:0, proud:0 };
{
  let got = 0;
  for (const sd6 of V6_SEEDS) {
    if (got >= V6_MIN_REGIONS) break;
    const { gj } = await gen(`#seed=${sd6}&regions=${REGIONS}&ep=${EP}`);
    const w2 = worldOf(gj, sd6);
    for (const p2 of w2.regions.filter(x => x.is_settled === 1)) {
      const st = w2.settle.get(p2.region_id);
      if (!st) continue;
      bandPop[bandOf(sentiment(ctxOf(p2, st, w2)))]++; got++;
    }
  }
}
const popN = Object.values(bandPop).reduce((a2, b2) => a2 + b2, 0);
const negPop = ["fury","aggrieved"].filter(b2 => bandPop[b2]).length;
const posPop = ["steady","proud"].filter(b2 => bandPop[b2]).length;
const V6 = popN >= V6_MIN_REGIONS && negPop >= 2 && posPop >= 2 && nonGriev >= 0.20;

md += `\n---\n\n## Invariants\n\n| seed | check | result |\n|---|---|---|\n`;
for (const a of all) {
  const r = a.R;
  md += `| \`${a.sd}\` | V1 every digit in a written voice is an export value in facts[] | ${r.V1 ? "PASS" : `**FAIL** (${a.ev.V1.length})`} |\n`;
  md += `| \`${a.sd}\` | V2 oral voices contain no digits | ${r.V2 ? "PASS" : `**FAIL** (${a.ev.V2.length})`} |\n`;
  md += `| \`${a.sd}\` | V3 every proper name appears verbatim in the export | ${r.V3 ? "PASS" : `**FAIL** (${a.ev.V3.length})`} |\n`;
  md += `| \`${a.sd}\` | V4 S_written − S_oral is the signed skew law | ${r.V4 ? "PASS" : "**FAIL**"} |\n`;
  md += `| \`${a.sd}\` | V5 no Cyrillic / banned lexicon, no surface > 3 | ${r.V5 ? "PASS" : "**FAIL**"} (max repeat ${r.maxRepeat}) |\n`;
}
md += `| all | V6 (strict) ≥2 bands each side, \`weary\` counted as neither | ${V6strict ? "PASS" : "**FAIL**"} `;
md += `(neg ${negBands}/2, pos ${posBands}/2, non-grievance ${(100*nonGriev).toFixed(0)}%) |\n`;
md += `| all | V6 (loose) \`weary\` counted on both sides, since it spans −10..+15 | ${V6loose ? "PASS" : "**FAIL**"} `;
md += `(neg ${negLoose}/2, pos ${posLoose}/2) |\n`;
md += `| ${popN} regions | **V6 AS RESTATED** — strict, over ≥${V6_MIN_REGIONS} settled regions at default weights | ${V6 ? "**PASS**" : "**FAIL**"} `;
md += `(neg ${negPop}/2, pos ${posPop}/2, non-grievance ${(100*nonGriev).toFixed(0)}% ≥20%) |\n`;
md += `\n> The two rows above are the OLD wording on a 3-seed sample, kept so the change is legible. `;
md += `V6 is now a statement about the model's range rather than about whichever ~75 voices three seeds produced: `;
md += `bands ${["fury","aggrieved","weary","steady","proud"].map(b2 => `${b2} ${bandPop[b2]}`).join(" · ")}.\n`;

md += `\n### Sentiment bands (oral, all seeds, n=${oralAll.length})\n\n`;
for (const b of ["fury","aggrieved","weary","steady","proud"])
  md += `- \`${b.padEnd(9)}\` ${"█".repeat(hist[b]||0)} ${hist[b]||0}\n`;
md += `\n### The divergence law's reach (written voices, all seeds)\n\n`;
{
  const W = all.flatMap(a => a.voices.filter(v => v.reg === "written"));
  const why = {}; for (const v of W) why[v.W.why] = (why[v.W.why]||0)+1;
  const leadN = {}; for (const v of W) leadN[v.lead] = (leadN[v.lead]||0)+1;
  md += `| lead topic's interest | voices | share |\n|---|---|---|\n`;
  for (const [k, n] of Object.entries(why).sort((a,b)=>b[1]-a[1]))
    md += `| ${k} | ${n} | ${(100*n/W.length).toFixed(0)}% |\n`;
  md += `\nlead topics: ` + Object.entries(leadN).sort((a,b)=>b[1]-a[1])
    .map(([k,n]) => `\`${k}\` ${n}`).join(" · ") + `\n`;
}
md += `\n### Class mix (oral sentences, all seeds)\n\n`;
const cm = {}; for (const k of cls) cm[k] = (cm[k]||0)+1;
for (const [k, n] of Object.entries(cm).sort((a,b)=>b[1]-a[1]))
  md += `- \`${k.padEnd(10)}\` ${n} (${(100*n/cls.length).toFixed(0)}%)\n`;
md += `\n### Surface repetition — top realized surfaces, all seeds\n\n`;
const allSurf = new Map();
for (const a of all) for (const [s, n] of a.surf) allSurf.set(s, (allSurf.get(s)||0)+n);
for (const [s, n] of [...allSurf.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 8))
  md += `- ${n}× \`${s.split("|")[0]}\` — ${s.split("|")[1].slice(0, 78)}\n`;
md += `\ndistinct realized surfaces: ${allSurf.size} over ${[...allSurf.values()].reduce((a,b)=>a+b,0)} draws\n`;
{
  const cnt = (v) => (v.text.match(new RegExp(v.c.town.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const o = all.flatMap(a => a.voices.filter(v => v.reg === "oral")).map(cnt);
  const w = all.flatMap(a => a.voices.filter(v => v.reg === "written")).map(cnt);
  const mn = (x) => (x.reduce((a,b)=>a+b,0)/x.length).toFixed(1);
  md += `\ntown-name density (the cost of slotting every fragment): oral mean ${mn(o)}, max ${Math.max(...o)}; ` +
        `written mean ${mn(w)}, max ${Math.max(...w)} mentions per voice\n`;
}

for (const a of all) {
  if (a.ev.V1.length) { md += `\n#### V1 offenders, \`${a.sd}\`\n\n`;
    for (const e of a.ev.V1.slice(0,5)) md += `- ${e.town}: digits ${e.bad.join(",")} — ${e.text}\n`; }
  if (a.ev.V2.length) { md += `\n#### V2 offenders, \`${a.sd}\`\n\n`;
    for (const e of a.ev.V2.slice(0,5)) md += `- ${e.town}: ${e.text}\n`; }
  if (a.ev.V3.length) { md += `\n#### V3 offenders, \`${a.sd}\`\n\n`;
    for (const e of a.ev.V3.slice(0,8)) md += `- ${e.town}: "${e.name}"\n`; }
}

console.log(md);
