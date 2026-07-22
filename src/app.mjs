// Hinterland — UI layer: rendering, inspector, camera, controls, boot.
// Imports the pure engine; adds SVG rendering and DOM interaction for GitHub Pages.

import {
  WX, WY, WDIAG, SCHEMA_VERSION,
  DEFAULTS,
  hashStr, mulberry32, streams, worldStreams,
  round2, clamp, lerp,
  makeName, buildChain, chainWalk, markovWord, harborName, nameRegister,
  signedArea, centroid, asCCW, pointInRing, segInt, distPointSeg,
  clipSeg, clipPolyline, polyLen, polyPointAt, dpSimplify, bumpField,
  relaxPts,
  buildTopology, buildGeology, applyAttributes,
  edgeCost, costDistances,
  toGeoJSON, toEpochSeries, toCsvTables, epochDate,
  computeFindings, getFindings, composeChronicle,
} from './engine/engine.mjs';

const d3 = globalThis.d3;

    // ---- Rendering (SVG, responsive) ----------------------------------------
    const RAMPS = {
      wealth:     { lo: [237, 248, 233], hi: [0, 90, 50],    label: "wealth" },
      class:      { lo: [246, 242, 250], hi: [63, 0, 125],   label: "elite share of wealth (who owns it)" },
      sky:        { lo: [241, 246, 253], hi: [10, 60, 110],  label: "sky advantage (what flight abolishes)" },
      endowment:  { lo: [242, 240, 247], hi: [84, 39, 143],  label: "aetherstone endowment" },
      centrality: { lo: [239, 243, 255], hi: [8, 48, 107],   label: "centrality to capital" },
      services:   { lo: [237, 248, 251], hi: [0, 109, 119],  label: "arcane services" },
      blight:     { lo: [253, 244, 249], hi: [174, 1, 126],  label: "blight load" },
      injustice:  { lo: [255, 245, 240], hi: [103, 0, 13],   label: "injustice (blight × poverty)" },
      burden:     { lo: [255, 247, 243], hi: [128, 0, 38],   label: "disease burden per 1k" },
      gap:        { lo: [247, 247, 247], hi: [37, 37, 37],   label: "service gap" },
      bloc:       { lo: [247, 247, 247], hi: [37, 37, 37],   label: "dominant bloc" }, // categorical; colors below
      market:     { lo: [255, 255, 204], hi: [37, 52, 148],  label: "market access" },
      egap:       { lo: [255, 255, 229], hi: [102, 37, 6],   label: "enforcement gap (shadow > state)" },
      aband:      { lo: [250, 246, 240], hi: [59, 40, 12],   label: "abandonment (hysteresis)" },
      legib:      { lo: [247, 247, 252], hi: [50, 48, 96],   label: "legibility gap (the uncounted)" },
      density:    { lo: [254, 237, 222], hi: [166, 54, 3],   label: "pop. density (per 100×100 cell)" },
      delta:      { lo: [179, 88, 6],    hi: [84, 39, 136],  label: "wealth since the founding (fell → rose)" }, // orange→purple: readable to every kind of eye
      elev:       { lo: [234, 238, 230], hi: [92, 64, 51],   label: "elevation" },
      rug:        { lo: [245, 243, 240], hi: [80, 60, 40],   label: "ruggedness (the slope of the land)" },
      temp:       { lo: [225, 238, 249], hi: [190, 84, 50],  label: "temperature (cold → warm)" },
      rain:       { lo: [248, 243, 227], hi: [26, 82, 118],  label: "rainfall (dry → wet)" },
      fert:       { lo: [247, 246, 239], hi: [62, 105, 43],  label: "fertility (derived from climate)" },
      retention:  { lo: [235, 224, 200], hi: [0, 84, 72],    label: "value retention (who keeps what it makes)" }, // floor: the low end must survive a white halo
      tolls:      { lo: [246, 246, 242], hi: [122, 31, 31],  label: "tariff burden (who pays at the gates)" },
      tribute:    { lo: [246, 244, 240], hi: [58, 47, 42],   label: "tribute rate (who pays the Dominion)" },
      seaacc:     { lo: [240, 247, 250], hi: [13, 71, 105],  label: "sea access (the second pole)" },
      smug:       { lo: [246, 242, 246], hi: [84, 39, 80],   label: "smuggling intensity (the shadow's roads)" },
      trust:      { lo: [247, 244, 238], hi: [32, 84, 120],  label: "social trust (who believes the realm)" },
      mobility:   { lo: [235, 224, 200], hi: [140, 84, 16],  label: "mobility ceiling (who can rise)" }, // floor: the low end must survive a white halo
      // the full index: every exported column earns a plate
      crown:      { lo: [222, 235, 247], hi: [33, 102, 172],  label: "crown reach (the capital's writ)" },
      temple:     { lo: [237, 231, 242], hi: [106, 61, 154],  label: "temple reach (the god's word)" },
      magnate:    { lo: [253, 232, 213], hi: [204, 76, 2],    label: "magnate reach (private coin)" },
      healing:    { lo: [237, 248, 233], hi: [0, 109, 44],    label: "healing reach (who can reach a healer)" },
      wardline:   { lo: [235, 237, 248], hi: [54, 50, 127],   label: "constabulary strength (where the wards hold)" },
      force:      { lo: [242, 242, 242], hi: [60, 60, 66],    label: "force projection (who the state can compel)" },
      order:      { lo: [237, 245, 237], hi: [40, 44, 66],    label: "order level (open ground → the police state)" }, // B9 (#131)
      blackmkt:   { lo: [246, 240, 246], hi: [74, 20, 71],    label: "black market index (the fenced goods)" },
      predation:  { lo: [253, 240, 237], hi: [152, 0, 30],    label: "predation risk (where the road is robbed)" },
      delver:     { lo: [248, 240, 227], hi: [124, 80, 30],   label: "delver flux (who digs the ruins)" },
      pilgrim:    { lo: [244, 242, 248], hi: [96, 80, 138],   label: "pilgrim flux (where the pilgrims walk)" },
      vuln:       { lo: [253, 240, 244], hi: [174, 28, 84],   label: "vulnerability (fragile when sickness comes)" },
      safewater:  { lo: [239, 246, 251], hi: [24, 100, 148],  label: "safe water (who drinks safely)" },
      kinship:    { lo: [249, 241, 231], hi: [130, 74, 34],   label: "kinship reliance (kin, not the realm)" },
      cultdist:   { lo: [246, 240, 240], hi: [112, 58, 82],   label: "cultural distance (far from the capital's manner)" },
      segreg:     { lo: [244, 242, 238], hi: [58, 50, 44],    label: "segregation (walled apart)" },
      churn:      { lo: [250, 246, 226], hi: [150, 110, 10],  label: "tenure churn (the land changed written hands)" },
      foundage:   { lo: [247, 243, 233], hi: [112, 84, 56],   label: "founding age (how old the town is)" },
      legacy:     { lo: [250, 244, 227], hi: [161, 120, 38],  label: "legacy advantage (born ahead)" },
      refining:   { lo: [252, 240, 230], hi: [176, 88, 26],   label: "refining capacity (where value is added)" },
      finance:    { lo: [246, 242, 250], hi: [63, 0, 125],    label: "elite share: ¤ marks the counting houses (+6 to the owners' row where finance sits)" },
      flips:      { lo: [246, 244, 240], hi: [122, 31, 31],   label: "bloc flips (ground that changed hands as fortunes shifted)" },
      elitedelta: { lo: [179, 88, 6],    hi: [84, 39, 136],   label: "owners' row since the founding (shrank → grew)" }, // diverging like delta: readable to every kind of eye
      rankchurn:  { lo: [140, 45, 4],    hi: [1, 102, 94],    label: "wealth rank since the founding (fell → climbed)" }, // B5 (#127): diverging — ordinary mobility
      growth:     { lo: [140, 81, 10],   hi: [1, 102, 94],    label: "wealth growth since founding (shrank → multiplied)" }, // diverging (BrBG): the ground that grew vs the ground that shrank
      volatility: { lo: [255, 247, 236], hi: [179, 0, 0],     label: "volatility (boom/bust amplitude)" },
      artifice:   { lo: [244, 240, 250], hi: [74, 20, 140],   label: "artifice (where the aetherworks learn)" }
    };
    // #62: many ramps bottom out near-white, so a view where one region spikes
    // (injustice/burden/tolls, maroon hi) reads as a single loud cell on blank
    // parchment, not a gradient. Lift every floor a step toward its hi so a low
    // cell shows a distinct tint and survives the white glyph halos. A uniform
    // lift, so the already-tinted ramps (retention/mobility) just deepen a touch;
    // delta is diverging and bloc is categorical, so both are skipped.
    for (const k in RAMPS) {
      if (k === "delta" || k === "elitedelta" || k === "rankchurn" || k === "growth" || k === "bloc") continue; // diverging/categorical: no floor-lift
      const r = RAMPS[k], lift = 0.12;
      r.lo = r.lo.map((c, i) => Math.round(c + (r.hi[i] - c) * lift));
    }
    const BLOC_COLORS = { crown: "#6baed6", temple: "#9e9ac8", magnate: "#fd8d3c", contested: "#cccccc", ungoverned: "#f7f7f7", dominion: "#5a5550" };
    const TRAJ_COLORS = { boom: "#2f9e44", stable: "#d9d9d9", decline: "#f08c00", collapse: "#7a1f1f" };
    const TENURE_COLORS = { titled: "#6b93b8", mixed: "#a3bd6b", customary: "#cfc06e", contested: "#c96a2b", none: "#f7f7f7" };
    const SITE_COLORS = { holy: "#9e9ac8", market: "#d9a05b", "fortress-works": "#8c5a2f", fortress: "#6b6560", works: "#c96a2b", hamlet: "#a3bd6b", outpost: "#d8cfbe", none: "#f7f7f7" };
    const CAUSE_COLORS = { poison: "#ae017e", water: "#2b6ba5", unmet: "#62625e", well: "#f7f7f7" };
    // the dominant driver of a region's disease burden (well = negligible burden)
    function burdenCause(reg) {
      const e = reg.burdenEnv || 0, w = reg.burdenWater || 0, u = reg.burdenUnmet || 0;
      if (e + w + u < 0.5) return "well";
      return e >= w && e >= u ? "poison" : w >= u ? "water" : "unmet";
    }
    const BIOME_COLORS = { alpine: "#e8e6e1", badland: "#d9a066", moor: "#a8a58c", marsh: "#7fa88c", forest: "#4f7a4f", steppe: "#cfc06e", grassland: "#a3bd6b" };
    // Atlas land: the biome color blended toward parchment cream (#f4ecd8), so
    // the ground shows climate as a quiet tint, not a data choropleth.
    const PARCH = [244, 236, 216];
    function parchmentBiome(biome) {
      const hex = BIOME_COLORS[biome] || "#f4ecd8", mix = 0.32;
      const c = i => Math.round(PARCH[i] + (parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) - PARCH[i]) * mix);
      return `rgb(${c(0)},${c(1)},${c(2)})`;
    }
    function rampColor(ramp, t) {
      const m = (a, b) => Math.round(a + (b - a) * t);
      return `rgb(${m(ramp.lo[0], ramp.hi[0])},${m(ramp.lo[1], ramp.hi[1])},${m(ramp.lo[2], ramp.hi[2])})`;
    }
    // Multiply an rgb() colour by a brightness factor (0.5–1.0), keeping it in gamut
    const shadeColor = (rgb, f) => {
      const m = rgb.match(/\d+/g); if (!m) return rgb;
      return `rgb(${Math.round(m[0] * f)},${Math.round(m[1] * f)},${Math.round(m[2] * f)})`;
    };

    // ---- The lens registry ---------------------------------------------------
    // One entry per map lens, replacing the three parallel ternary chains that
    // render() used to switch on. Each entry carries how the lens paints (t →
    // 0..1 against RAMPS[id], or cats/fill for categoricals), what it prints as
    // the region value, and the browse metadata (group, q — the question the
    // plate answers) that the lens index reads. C is the per-render context of
    // scrub-aware accessors built inside render(), so every lens stays live
    // under the epoch scrubber for free.
    // Most lenses read one 0–100 field: t = field/100, value = the raw field.
    const pctLens = (group, q, get) =>
      ({ group, q, t: (r, C) => get(r, C) / 100, value: (r, C) => get(r, C) });
    const LENSES = {
      injustice: { group: "THE ARGUMENT", q: "blight × poverty (a composite)",
        t: (r, C) => (C.RB(r) / 100) * (1 - C.RW(r) / 100),
        value: (r, C) => Math.round(100 * (C.RB(r) / 100) * (1 - C.RW(r) / 100)) },
      class: pctLens("THE ARGUMENT", "who owns the town", (r, C) => C.SE(r)),
      sky: pctLens("THE ARGUMENT", "who escapes the ground", r => r.skyAdvantage),
      delta: { group: "THE ARGUMENT", q: "who rose, who fell",
        t: (r, C) => clamp((C.RW(r) - r.wealthT0 + 40) / 80, 0, 1),
        value: (r, C) => { const d = C.RW(r) - r.wealthT0; return (d > 0 ? "+" : "") + d; } },
      // #93: elite drift as its own plate — scrub-aware since SE reads the snapshot
      elitedelta: { group: "THE ARGUMENT", q: "whose owners' row grew", featured: true,
        t: (r, C) => clamp((C.SE(r) - (C.snaps[0] ? C.snaps[0].eliteShare[r.id] : C.SE(r)) + 20) / 40, 0, 1),
        value: (r, C) => { const d = C.SE(r) - (C.snaps[0] ? C.snaps[0].eliteShare[r.id] : C.SE(r)); return (d > 0 ? "+" : "") + d; } },
      rankchurn: { group: "THE ARGUMENT", q: "who climbed, who fell (wealth rank)",
        t: (r) => clamp(((r.rankChurn || 0) + 100) / 200, 0, 1),
        value: (r) => { const c = r.rankChurn || 0; return (c > 0 ? "+" : "") + c; } },
      // A3 (#120): the neutral shape instruments — see any world, not the one
      // the old argument expected. growth reads live under the scrubber; volatility
      // reads the whole run's amplitude (max−min wealth across every epoch).
      growth: { group: "THE SHAPE", q: "how much the ground multiplied",
        t: (r, C) => { const g = (C.RW(r) - r.wealthT0) / Math.max(1, r.wealthT0); return clamp(g / 2 + 0.5, 0, 1); },
        value: (r, C) => { const g = r.wealthT0 > 0 ? Math.round(100 * (C.RW(r) - r.wealthT0) / r.wealthT0) : 0; return (g > 0 ? "+" : "") + g + "%"; } },
      volatility: { group: "THE SHAPE", q: "who boomed and busted",
        t: (r, C) => { const ws = C.snaps.map(s => s.wealth[r.id]); return clamp((Math.max(...ws) - Math.min(...ws)) / 60, 0, 1); },
        value: (r, C) => { const ws = C.snaps.map(s => s.wealth[r.id]); return Math.max(...ws) - Math.min(...ws); } },
      artifice: pctLens("THE SHAPE", "where the aetherworks learn", (r, C) => C.RA(r)), // B1: the growth channel, scrub-aware
      biome: { group: "THE LAND", q: "what the land is", cats: BIOME_COLORS, catLabel: "biome",
        value: r => r.biome.slice(0, 5), fill: r => BIOME_COLORS[r.biome] },
      elev: pctLens("THE LAND", "how high it stands", r => r.elevation),
      terrace: { group: "THE LAND", q: "stepped relief",
        cats: { water: "#4a7fae", lowland: "#8db580", upland: "#c4b87a", highland: "#b0855e", alpine: "#e8e6e1" },
        catLabel: "elevation band",
        value: r => (r.elevation >= 78 ? "alpine" : r.elevation >= 60 ? "highland" : r.elevation >= 40 ? "upland" : r.elevation >= 20 ? "lowland" : r.onCoast ? "water" : "lowland").slice(0, 6),
        fill: r => {
          const el = r.elevation;
          if (r.onCoast && el < 25) return "#4a7fae";
          if (el >= 78) return "#e8e6e1";
          if (el >= 60) return "#b0855e";
          if (el >= 40) return "#c4b87a";
          return "#8db580";
        }
      },
      rug: pctLens("THE LAND", "how rough the going", r => r.ruggedness),
      temp: pctLens("THE LAND", "how warm the year", r => r.temperature),
      rain: pctLens("THE LAND", "where the rain falls", r => r.rainfall),
      fert: pctLens("THE LAND", "where the farms pay", r => r.fertility),
      endowment: pctLens("THE LAND", "where the ore lies", (r, C) => C.RE(r)),
      wealth: pctLens("THE COIN", "who holds the coin", (r, C) => C.RW(r)),
      retention: pctLens("THE COIN", "who keeps what it makes", r => r.retention),
      tolls: pctLens("THE COIN", "who pays at the gates", r => r.tollBurden),
      tribute: { group: "THE COIN", q: "who pays the Dominion",
        t: (r, C) => C.TRIBV(r) / 3, value: (r, C) => C.TRIBV(r) },
      market: pctLens("THE COIN", "who reaches the market", r => r.marketAccess),
      seaacc: pctLens("THE COIN", "who reaches the water", r => r.seaAccess),
      centrality: pctLens("THE COIN", "who reaches the capital", r => r.centrality),
      // #93: the bloc lens reads the SNAPSHOT, so scrubbing shows the map
      // re-contesting as fortunes shift (snapshots carry dominion-mapped bloc)
      bloc: { group: "THE STATE", q: "who rules here", cats: BLOC_COLORS, catLabel: "dominant bloc",
        value: (r, C) => (C.live.bloc ? C.live.bloc[r.id] : (C.RO(r) === 1 ? "dominion" : r.bloc)).slice(0, 3),
        fill: (r, C) => BLOC_COLORS[C.live.bloc ? C.live.bloc[r.id] : (C.RO(r) === 1 ? "dominion" : r.bloc)] },
      flips: { group: "THE STATE", q: "who changed hands", featured: true,
        t: r => Math.min((r.blocChanges || 0) / 4, 1), value: r => r.blocChanges || 0 },
      services: pctLens("THE STATE", "who gets served", r => r.arcaneServices),
      gap: pctLens("THE STATE", "who was left unserved", r => r.serviceGap),
      blight: pctLens("THE STATE", "who breathes the poison", (r, C) => C.RB(r)),
      burden: { group: "THE STATE", q: "who gets sick",
        t: (r, C) => r.burden / C.maxBurden, value: r => r.burden.toFixed(1) },
      egap: pctLens("THE STATE", "where the law runs out", r => r.enforceGap),
      smug: pctLens("THE STATE", "where the shadow trades", r => r.smuggling),
      density: { group: "THE PEOPLE", q: "how many souls",
        t: (r, C) => Math.sqrt(C.dens(r) / C.maxDensity),
        value: (r, C) => (Math.round(C.dens(r) * 10) / 10).toFixed(1) },
      traj: { group: "THE PEOPLE", q: "boom and bust", cats: TRAJ_COLORS, catLabel: "trajectory",
        value: r => r.boomBust.slice(0, 4), fill: r => TRAJ_COLORS[r.boomBust] },
      trust: pctLens("THE PEOPLE", "who believes the realm", r => r.socialTrust),
      mobility: pctLens("THE PEOPLE", "who can rise", r => r.mobility),
      aband: pctLens("THE PEOPLE", "who was left behind", r => r.abandonment),
      legib: pctLens("THE PEOPLE", "who goes uncounted", r => r.legibility),
      // ---- the full index: the columns that only the export used to carry ----
      crown: pctLens("THE REACH", "how far the capital's writ runs", r => r.crownReach !== undefined ? r.crownReach : r.centrality),
      temple: pctLens("THE REACH", "how far the god's word carries", r => r.templeReach),
      magnate: pctLens("THE REACH", "how far the magnates' coin reaches", r => r.magnateReach),
      healing: pctLens("THE REACH", "who can reach a healer", r => r.healingReach),
      wardline: pctLens("THE REACH", "where the wards hold", r => r.wardline),
      force: pctLens("THE REACH", "who the state can compel", r => r.forceProjection),
      order: pctLens("THE REACH", "order and liberty (open → police state)", r => r.orderLevel), // B9 (#131): the order/liberty lens (A3)
      blackmkt: pctLens("THE SHADOW", "where the fenced goods flow", r => r.blackMarket),
      predation: pctLens("THE SHADOW", "where the road is robbed", r => r.predation),
      delver: pctLens("THE SHADOW", "who digs the ruins for a wage", r => r.delverFlux),
      pilgrim: pctLens("THE SHADOW", "where the pilgrims walk", r => r.pilgrimFlux),
      vuln: pctLens("THE BODY", "who is fragile when sickness comes", r => r.vulnerability),
      cause: { group: "THE BODY", q: "what makes them sick", cats: CAUSE_COLORS, catLabel: "dominant burden cause",
        value: r => burdenCause(r), fill: r => CAUSE_COLORS[burdenCause(r)] },
      safewater: pctLens("THE BODY", "who drinks safely", r => r.safeWater),
      kinship: pctLens("THE UNSEEN", "who relies on kin, not the realm", r => r.kinship),
      cultdist: pctLens("THE UNSEEN", "who lives far from the capital's manner", r => r.culturalDistance),
      segreg: pctLens("THE UNSEEN", "who walls themselves apart", r => r.segregation),
      tenure: { group: "THE UNSEEN", q: "whose land the registry sees", cats: TENURE_COLORS, catLabel: "tenure regime",
        value: r => (r.tenure || "none").slice(0, 6), fill: r => TENURE_COLORS[r.tenure] || TENURE_COLORS.none },
      churn: pctLens("THE UNSEEN", "how often the land changed written hands", r => r.tenureChurn),
      foundage: pctLens("DEEP TIME", "how old the town is", r => r.foundingAge),
      legacy: pctLens("DEEP TIME", "who was born ahead", r => r.legacy),
      refining: pctLens("DEEP TIME", "where the value is added", r => r.refining),
      // ---- the institutions (#91): a town is its buildings ----
      sitechar: { group: "THE INSTITUTIONS", q: "what kind of place it is", featured: true,
        cats: SITE_COLORS, catLabel: "site character",
        value: r => (r.siteCharacter || "none").slice(0, 5), fill: r => SITE_COLORS[r.siteCharacter] || SITE_COLORS.none },
      finance: { group: "THE INSTITUTIONS", q: "where finance sits", featured: true,
        t: (r, C) => C.SE(r) / 100, value: (r, C) => C.SE(r) }
    };
    const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const fy = (y) => WY - y; // flip y for display so preview matches QGIS (y-up)
    // V2: the organic pen — PREVIEW-ONLY geometry. Exports never touch these.
    // jitter is a pure function of the coordinates, so every render of the
    // same world draws the same ink (no RNG streams are consumed here)
    const jit = (x, y, k) => {
      const s = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453;
      return (s - Math.floor(s)) * 2 - 1;
    };
    // closed uniform cubic B-spline: melts polygon corners into inked curves
    const bsplineClosed = (pts) => {
      const n = pts.length;
      if (n < 3) return "";
      const P = (i) => pts[(i + n) % n];
      let d = "";
      for (let i = 0; i < n; i++) {
        const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
        const sx1 = (p0[0] + 4 * p1[0] + p2[0]) / 6, sy1 = (p0[1] + 4 * p1[1] + p2[1]) / 6;
        const c1x = (2 * p1[0] + p2[0]) / 3, c1y = (2 * p1[1] + p2[1]) / 3;
        const c2x = (p1[0] + 2 * p2[0]) / 3, c2y = (p1[1] + 2 * p2[1]) / 3;
        const ex = (p1[0] + 4 * p2[0] + p3[0]) / 6, ey = (p1[1] + 4 * p2[1] + p3[1]) / 6;
        d += (i === 0 ? `M${sx1.toFixed(1)},${sy1.toFixed(1)}` : "") +
          `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`;
      }
      return d + "Z";
    };
    // open Catmull-Rom through the points (the line passes THROUGH its data)
    const catRom = (pts) => {
      const n = pts.length;
      if (n < 2) return "";
      let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < n - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
        const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
      }
      return d;
    };

    function findingsHTML(model) {
      const F = getFindings(model);
      const town = (id) => model.settlements.find(st => st.regionId === id) || { name: ((model.regions.find(r => r.id === id) || {}).placeName) || "the wild", regionId: id, tier: "none", population: 0 };
      const reg = (id) => model.regions.find(r => r.id === id);
      const L = [];
      {
        const dG = F.gini - F.gini_t0;
        const EP = model.epochSnaps.length - 1;
        const MEASURES = { dumping_reform: "a Dumping Reform", grid_charter: "a Grid Charter", toll_amnesty: "a Tariff Amnesty",
          retention_act: "a Retention Act", crown_granary: "the Crown Granary", dumping_entrenched: "the dumping entrenched in law", toll_crackdown: "a tariff crackdown" };
        let lead = dG <= -0.04
          ? `<span style="color:#8fbf7f; font-weight:700">THIS WORLD CLOSED THE GAP.</span> The wealth gap went from ${F.gini_t0.toFixed(2)} at the founding to ${F.gini.toFixed(2)} at the close.`
          : dG >= 0.04
          ? `<span style="color:#e08268; font-weight:700">THIS WORLD GOT MORE UNEQUAL.</span> The wealth gap went from ${F.gini_t0.toFixed(2)} at the founding to ${F.gini.toFixed(2)} at the close.`
          : `<b>This world held its shape.</b> The wealth gap stayed at ${F.gini.toFixed(2)}` +
            (F.gini < 0.35 ? ". That is unusually level." : F.gini > 0.62 ? ". That is about as unequal as these worlds get." : ". That is near the middle of all possible worlds.");
        if (F.turning) {
          const y = 1000 + 25 * F.turning.epoch;
          lead += F.turning.type === "revolt"
            ? ` It turned on the revolt of ${y}. ${F.turning.outcome === "won" ? (F.turning.arc === "starved" ? "<b>The revolt won, then the town starved.</b>" : "<b>The revolt won, and the town flourished.</b>") : "<b>The revolt was crushed.</b>"}` // B8 (#130): the two won-arcs
            : F.turning.type === "reform"
            ? ` It turned on ${MEASURES[F.turning.measure]} in ${y}.`
            : ` It turned on a reaction, ${MEASURES[F.turning.measure]}, in ${y}.`;
        } else if (EP > 0) {
          lead += ` No reform came and no revolt came. The loops ran unopposed.`;
        }
        L.push(lead);
      }
      // #86: the periodization, argued up front — the ages are computed from the
      // same epoch series the timeline draws, so the two surfaces always agree
      if (F.ages && F.ages.length > 1) {
        L.push(`The record divides into ages: ` + F.ages.map(a =>
          `<b>${a.name}</b> (${1000 + 25 * a.from_epoch}–${1000 + 25 * a.to_epoch}, gini ${a.gini_start.toFixed(2)} → ${a.gini_end.toFixed(2)})`).join(", ") + `.`);
      }
      if (F.owners && F.class_gap !== null) {
        const ct = town(F.company_town);
        L.push(`The gap runs inside each town, not only between them. <b>${F.owners.pop_pct}%</b> of this realm's people hold <b>${F.owners.coin_pct}%</b> of its coin, and the owners' row lives <b>${F.class_gap}×</b> better than the labor it hires` +
          (F.within_pct !== null && F.within_pct >= 15 ? `. A map drawn by region misses much of it: <b>${F.within_pct}%</b> of the spread sits inside the towns` : ``) +
          `. The sharpest company town is <b>${esc(ct.name)}</b>, where ${F.company_share} of every 100 coins belong to its owners' row.`);
      }
      L.push(`The poorest fifth of this realm carries <b>${F.blight_ratio}×</b> the blight of the richest fifth.`);
      if (F.moran && F.moran_blight)
        L.push(`The clustering is measured, not guessed. Global Moran's I puts wealth at <b>${F.moran.I.toFixed(3)}</b> and blight at <b>${F.moran_blight.I.toFixed(3)}</b>, against ${F.moran.expected.toFixed(3)} expected under no structure (p ${F.moran.p.toFixed(3)} / ${F.moran_blight.p.toFixed(3)}, ${F.moran.n_perm} permutations over the region adjacency).`);
      if (F.shadow_gap_pct !== null && F.shadow_gap_pct > 0 && model.ridges.length)
        L.push(`Behind the ${esc(model.ridges[0].name)} wall, the median settlement earns <b>${F.shadow_gap_pct}% less</b> than the open country at the same distance from the capital.`);
      L.push(`<b>${F.dark_n}</b> of ${model.regions.length} regions sit off the grid because serving them would not pay` +
        (F.dark_burden_ratio !== null && F.dark_burden_ratio > 1 ? `. They carry <b>${F.dark_burden_ratio}×</b> the disease burden of the lit core.` : `.`));
      if (F.mouth_region !== null)
        L.push(`${esc(town(F.mouth_region).name)}, at the river's mouth, drinks <b>${F.mouth_downstream} points</b> of other towns' poison. The land set that order before anyone built anything.`);
      if (F.toll_paying_n > 0)
        L.push(`<b>${F.toll_paying_n}</b> regions pay a tariff at gates whose holders they never chose.`);
      if (F.rain_split && F.rain_split.wet - F.rain_split.dry >= 8 && model.ridges.length)
        L.push(`The ${esc(model.ridges[0].name)} splits the rain: median rainfall <b>${F.rain_split.wet}</b> on its wet side and <b>${F.rain_split.dry}</b> in its shadow. The farms followed the rain.`);
      if (F.twins) {
        const a = reg(F.twins.shadow), b = reg(F.twins.open);
        L.push(`<span style="color:#d9b96c">THE TWINS:</span> <b>${esc(town(b.id).name)}</b> and <b>${esc(town(a.id).name)}</b> stand the same distance from the capital. ` +
          `${esc(town(b.id).name)}: wealth ${b.wealth}, market ${b.marketAccess}, burden ${b.burden}. ` +
          `${esc(town(a.id).name)}, behind the wall: wealth ${a.wealth}, market ${a.marketAccess}, burden ${a.burden}. ` +
          `<b>The difference is the mountain.</b> The red line on the map joins them.`);
      }
      if (F.zipf)
        L.push(`The towns obey a <b>rank-size law no one decreed</b>: slope α ${F.zipf.alpha.toFixed(2)} across the whole system (Zipf's constant is ≈1), the big-town tail on a straight line (fit ${F.zipf.tail_r2.toFixed(2)}), the largest holding ${F.zipf.primacy}× the second. Sizes were GROWN. The same compounding that writes the wealth map wrote the census first.`);
      if (F.sovereignty) {
        L.push(`<span style="color:#8a7a68">THE DOMINION:</span> <b>${F.sovereignty.occupied_n}</b> regions are occupied ground, and every levy in them is paid to a power no one here can petition. ` +
          `The free country keeps <b>${F.sovereignty.retent_ratio}×</b> the share of its own value that the occupied country keeps. Yet the occupied zone is the realm's best-wired country (${F.sovereignty.corridor_wired}/${F.sovereignty.occupied_n} on the grid): <b>the grid reaches you when someone else wants what you have</b>.` +
          (F.sovereignty.comprador_ratio > 1 ? ` And the occupied owners' row holds ${F.sovereignty.comprador_ratio}× the free realm's share. The occupation did not replace the owners; it hired them.` : ``));
      }
      if (F.concessions && (F.concessions.concession_n > 0 || F.concessions.abandoned_n > 0)) {
        L.push(`<span style="color:#8a7a68">THE REACH:</span> the empire mostly did not invade. It bought in. ` +
          (F.concessions.concession_n > 0 ? `<b>${F.concessions.concession_n}</b> ${F.concessions.concession_n === 1 ? "coast is" : "coasts are"} a foreign concession, richer than the median (<b>${F.concessions.conc_wealth}</b> vs ${F.concessions.median_wealth}), with <b>${Math.round(100 * F.concessions.foreign_claim)}%</b> of the yield sent home to ${esc(model.metropole)}. <b>It was developed and owned in the same ledger.</b> ` : ``) +
          (F.concessions.abandoned_n > 0 ? `<b>${F.concessions.abandoned_n}</b> ${F.concessions.abandoned_n === 1 ? "coast was" : "coasts were"} wound up when the lode ran thin. <b>The attention left with the ore</b>, and the ground got its ruin and its freedom in the same year.` : ``));
      }
      if (F.sky && F.sky.shadow_adv !== null && F.sky.open_adv !== null && F.sky.shadow_adv >= F.sky.open_adv + 5)
        L.push(`<span style="color:#8fa8d9">THE SKYWAY:</span> behind the wall the lanes would cut the road to the capital by <b>${F.sky.shadow_adv}%</b> (the open country gains ${F.sky.open_adv}%). But boarding is an owners' privilege. ` +
          (F.twins && F.sky.twin_sky !== null && F.sky.twin_sky > 0 ? `The owners' row of the shadow twin measures the wall at <b>${F.sky.twin_sky}% less</b>; its labor still walks the pass. ` : ``) +
          `<b>The sky would help the walled country most, but only its owners can board.</b>`);
      L.push(`<span style="opacity:0.75; font-size:13px">None of this was painted. It fell out of where the ore lay, where the wall stood, which way the water ran, and what the ledgers said would pay. Every number recomputes from the exported columns.</span>`);
      return L.join("<br>");
    }

    // U1: the chronicle reader renders its own minimal markdown (the
    // downloaded artifact stays byte-exact; this is presentation only)
    // The chronicle as the report's main article: acts get eyebrow headers and
    // drop caps, pull quotes are COMPUTED from the findings (never parsed from
    // prose, so they cannot drift from the record), and a non-interactive echo
    // of the plate's timeline heads the history it narrates. The downloadable
    // .md stays byte-exact — this styles the page only, composeChronicle is law.
    function chronicleArticleHTML(md, model, params) {
      const F = getFindings(model);
      const dG = F.gini - F.gini_t0;
      const pulls = [
        `<b>${dG <= -0.04 ? "the gap closed" : dG >= 0.04 ? "the world got more unequal" : "the world held its shape"}</b>: gini ${F.gini_t0.toFixed(2)} → ${F.gini.toFixed(2)}`
      ];
      if (F.owners) pulls.push(`<b>${F.owners.pop_pct}%</b> of the people hold <b>${F.owners.coin_pct}%</b> of the coin`);
      const echo = timelineHTML(model, params);
      let acts = 0, dropNext = false;
      return (echo ? `<div class="chron-tl">${echo}</div>` : "") +
        esc(md).split(/\n\n+/).map(block => {
          let b = block;
          if (b.startsWith("## ")) {
            acts++;
            const pull = acts >= 2 && pulls.length ? `<aside class="pullquote">${pulls.shift()}</aside>` : "";
            dropNext = true;
            return `${pull}<h3 class="chron-act">${b.slice(3)}</h3>`;
          }
          if (b.startsWith("# ")) return `<h2 class="chron-title">${b.slice(2)}</h2>`;
          b = b.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
          b = b.replace(/^\*([^*]+)\*$/gm, "<i>$1</i>");
          const cls = dropNext ? ` class="lede"` : "";
          dropNext = false;
          return `<p${cls}>${b}</p>`;
        }).join("");
    }

    function render(model, params) {
      document.getElementById("chronText").innerHTML = chronicleArticleHTML(composeChronicle(model, params), model, params);
      document.getElementById("findingsText").innerHTML = findingsHTML(model);
      const lensId = LENSES[view] ? view : "wealth"; // an unknown lens (hand-edited hash) falls back
      const LENS = LENSES[lensId];
      const ramp = RAMPS[lensId]; // undefined for traj/biome — categoricals never dereference it
      // #63: two genres, one switch — atlas is the pen's map (no lens),
      // data is the lens (terrain demoted); the model is never touched
      const atlas = mapMode === "atlas";
      const poi = atlas || showPoi;
      // Hybrid semantic zoom (§2.5): geometric scaling rides the gesture; on settle
      // this re-render compensates label/glyph sizes by zc so they hold screen size,
      // and the declutter below re-runs at zc so MORE names win deeper in. zc is
      // EXACTLY 1 at fit/contain, so the default plate is unchanged.
      const zc = labelZoom();
      const cz = (base, dp) => zc === 1 ? base : +(base * zc).toFixed(dp == null ? 2 : dp);
      // #60 G1: preview-only water guard — ink whose anchor floats is a lie
      const inSea = (x, y) => model.seaShapes.some(S =>
        pointInRing(x, y, S.outer) && !S.holes.some(h => pointInRing(x, y, h)));
      // Scrub-aware accessors: the stock fields read the selected epoch's
      // snapshot; derived layers always show the final state.
      const snaps = model.epochSnaps;
      const live = snaps[Math.max(0, Math.min(scrubEpoch, snaps.length - 1))];
      const RW = (reg) => live.wealth[reg.id];
      const RE = (reg) => live.E[reg.id];
      const RA = (reg) => live.A ? live.A[reg.id] : reg.A; // B1: artifice, scrub-aware
      const RB = (reg) => live.blight[reg.id];
      const RP = (reg) => live.pop[reg.id];
      const RG = (reg) => live.onGrid[reg.id];
      const SE = (reg) => live.eliteShare[reg.id];
      const RO = (reg) => live.occupied ? live.occupied[reg.id] : (reg.occupied ? 1 : 0);
      const TRIBV = (reg) => model.dominion ? (RO(reg) === 1 ? 3 : (reg.bloc === "crown" ? 1 : 2)) : 0;
      const dens = (reg) => (RP(reg) * (1 + reg.rural)) / (reg.area / 10000);
      const maxDensity = Math.max(...model.regions.map(dens), 1e-9);
      const maxBurden = Math.max(...model.regions.map(r => r.burden), 1e-9);
      const maxPop = Math.max(...model.regions.map(RP), 1);
      // #61: the satellite glyphs (refinery, skyport, dominion, event, garrison,
      // facility, still, camp) all share one anchor, reg.c, and used to stack.
      // A per-region compass-slot allocator hands each a distinct free slot,
      // scaled past the settlement dot. The subject marks (dot, value number,
      // name label) keep the anchor; everything else claims a ring slot.
      const RING8 = [[0, -1], [0.7, -0.7], [1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7]]; // N NE E SE S SW W NW
      const slotUsed = new Map();
      const slotAt = (reg, pref) => {
        // slot 4 (due S) is pre-reserved: the value number lives just below the
        // anchor, so glyphs never claim that direction.
        const used = slotUsed.get(reg.id) || new Set([4]);
        let i = pref;
        for (let n = 0; n < 8 && used.has(i); n++) i = (i + 1) % 8;
        used.add(i); slotUsed.set(reg.id, used);
        const R = 22 + 13 * Math.sqrt(RP(reg) / maxPop); // past the dot (max r 16) + a gap
        // clamp to the frame so an edge region's glyph never draws off-canvas
        return [clamp(reg.c[0] + RING8[i][0] * R, 10, WX - 10), clamp(fy(reg.c[1]) + RING8[i][1] * R, 10, WY - 10)];
      };
      // The lens registry does the switching; C hands each lens the scrub-aware
      // accessors above. Categoricals have no t (paint 0) and override fill.
      const C = { live, snaps, RW, RE, RA, RB, RP, RG, SE, RO, TRIBV, dens, maxDensity, maxBurden };
      const cellT = (reg) => LENS.t ? LENS.t(reg, C) : 0;
      const cellValue = (reg) => LENS.value(reg, C);
      // Hillshade: crude slope-aspect lighting from neighbour heights. Northwest
      // sun (FMG direction), clamped 0.70 (shadow) to 1.0 (full sun). Only
      // applies to continuous choropleth lenses — categoricals keep flat colour.
      const _hs = new Float64Array(model.regions.length);
      if (!atlas) {
        const sx = -0.55, sy = -0.55, sz = 0.85, sm = Math.hypot(sx, sy, sz);
        const sxn = sx / sm, syn = sy / sm, szn = sz / sm;
        model.regions.forEach(reg => {
          let gx = 0, gy = 0;
          for (const nid of reg.neighbors) {
            const n = model.regions[nid]; if (!n) continue;
            const dh = n.elevation - reg.elevation;
            gx += (n.c[0] - reg.c[0]) * dh;
            gy += (n.c[1] - reg.c[1]) * dh;
          }
          const m = Math.hypot(gx, gy, reg.neighbors.length || 1);
          const dot = (gx / m) * sxn + (gy / m) * syn + ((reg.neighbors.length || 1) / m) * szn;
          _hs[reg.id] = clamp(0.55 + 0.45 * dot, 0.50, 1.0);
        });
      }
      const cellFill = (reg) => {
        const fill = LENS.fill ? LENS.fill(reg, C) : rampColor(ramp, cellT(reg));
        return (!atlas && !LENS.fill && _hs[reg.id])
          ? shadeColor(fill, _hs[reg.id])
          : fill;
      };

      const parts = [`<svg id="map" viewBox="${camViewBox()}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">`];
      // A small filter library: a soft lift for the point marks so they sit
      // above the map, a fibrous paper texture for the land, and a soft edge
      // vignette. Preview-only; the export never sees any of it.
      parts.push(`<defs>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.1"/><feOffset dx="0.5" dy="1"/><feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" seed="7" result="n"/><feDiffuseLighting in="n" lighting-color="#fff" surfaceScale="2.4" result="l"><feDistantLight azimuth="235" elevation="32"/></feDiffuseLighting><feComponentTransfer in="l" result="g"><feFuncR type="linear" slope="1" intercept="-0.12"/><feFuncG type="linear" slope="1" intercept="-0.12"/><feFuncB type="linear" slope="1" intercept="-0.12"/></feComponentTransfer><feComposite in="g" in2="SourceGraphic" operator="in"/></filter>
        <radialGradient id="vignette" cx="50%" cy="48%" r="72%"><stop offset="62%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#2a2018" stop-opacity="0.16"/></radialGradient>
      </defs>`);
      // Greedy label de-clutter: a shared list of placed name boxes. A label is
      // suppressed if its box overlaps one already reserved by a higher rank.
      // Settlement names (the loudest) are pre-reserved so the decorative
      // sea/river/ridge names (drawn earlier) yield to them. Widths estimated
      // from char count, so no DOM measure/reflow is needed.
      const placedLabels = [];
      const labelBox = (x, y, text, fsize) => {
        // boxes shrink with zoom (zc<1): the on-screen text holds size while its
        // world footprint contracts, so the greedy declutter admits more names deeper in.
        const efs = fsize * zc;
        const w = String(text).length * efs * 0.55, h = efs;
        return [x - w / 2, y - h, x + w / 2, y]; // text-anchor=middle, baseline at y
      };
      const tryLabel = (box, rank) => {
        for (const [b, r] of placedLabels) {
          if (!(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]) && rank <= r) return false;
        }
        placedLabels.push([box, rank]);
        return true;
      };
      // pre-reserve settlement label boxes (rank 4) before the decorative labels run
      const maxPop0 = Math.max(...model.regions.map(RP), 1);
      model.settlements.forEach(s => {
        if (s.tier !== "metropolis" && s.tier !== "city") return;
        const sreg = model.regions[s.regionId];
        let fs = 12 + 11 * Math.sqrt(RP(sreg) / maxPop0);
        fs = s.tier === "metropolis" ? Math.max(fs, 20) : Math.min(fs, 18);
        const r = 3 + 13 * Math.sqrt(RP(sreg) / maxPop0);
        placedLabels.push([labelBox(s.x, fy(s.y) - r - 5, s.name, fs), 4]);
      });
      model.regions.forEach(reg => {
        const d = "M" + reg.ring.map(p => `${p[0].toFixed(1)},${fy(p[1]).toFixed(1)}`).join("L") + "Z";
        // #62: the capital ring is red only on parchment; on a ramp it is ink.
        // On the finance lens a counting-house town wears the gold ring — the
        // cause drawn on the same plate as its effect (the deepened owners' row).
        const hasCH = !atlas && lensId === "finance" && reg.structures && reg.structures.includes("counting_house");
        const stroke = reg.isCapital ? (atlas ? "#d62728" : "#1f1a14") : hasCH ? "#d9b96c" : (atlas ? "#b9ab8f" : "#333");
        const sw = reg.isCapital ? 4 : hasCH ? 4 : (atlas ? 1 : 1.5);
        // native tooltip: name — the question: value, plus the drift clause when
        // the owners' row moved enough to matter; still a plain <title>, no JS
        const tt = model.settlements.find(s => s.regionId === reg.id);
        const dE = snaps.length > 1 ? SE(reg) - snaps[0].eliteShare[reg.id] : 0;
        const tip = atlas
          ? `${tt ? esc(tt.name) : "region " + reg.id}`
          : `${tt ? esc(tt.name) : "region " + reg.id} · ${LENS.q}: ${esc(String(cellValue(reg)))}` +
            (reg.siteCharacter && reg.siteCharacter !== "none" && reg.siteCharacter !== "outpost" ? ` · ${reg.siteCharacter}` : "") +
            (Math.abs(dE) >= 3 ? ` · owners' row ${dE > 0 ? "+" : ""}${dE} since founding` : "");
        parts.push(`<path d="${d}" data-region="${reg.id}" fill="${atlas ? parchmentBiome(reg.biome) : cellFill(reg)}" stroke="${stroke}" stroke-width="${sw}"><title>${tip}</title></path>`);
        if (!atlas && SHOW_NUMBERS) { // the one number the map exists to show: halo + contrast, never a ghost
          const fc = cellFill(reg);
          // #62: hex fills parse as hex — the digit regex read "#5a5550" as garbage
          let lum = 200;
          if (fc[0] === "#") {
            lum = 0.299 * parseInt(fc.slice(1, 3), 16) + 0.587 * parseInt(fc.slice(3, 5), 16) + 0.114 * parseInt(fc.slice(5, 7), 16);
          } else {
            const m2 = fc.match(/\d+/g);
            if (m2) lum = 0.299 * +m2[0] + 0.587 * +m2[1] + 0.114 * +m2[2];
          }
          const ink = lum < 120 ? "#fff" : "#1a1611";
          const halo = lum < 120 ? "#00000055" : "#ffffff";
          parts.push(`<text x="${reg.c[0].toFixed(1)}" y="${(fy(reg.c[1]) + cz(26)).toFixed(1)}" font-size="${cz(15)}" font-weight="600" text-anchor="middle" fill="${ink}" paint-order="stroke" stroke="${halo}" stroke-width="${cz(3)}">${cellValue(reg)}</text>`);
        }
        if (reg.refining > 0) { // refinery glyph, a slotted 16x16 square (#61)
          const [rx, ry] = slotAt(reg, 2); // prefer E
          parts.push(`<rect x="${(rx - 8).toFixed(1)}" y="${(ry - 8).toFixed(1)}" width="16" height="16" fill="#111" stroke="#fff" stroke-width="2"/>`);
        }
      });
      // Paper grain, atlas only: a dark fibrous texture laid OVER the land (not
      // under it, where the opaque region fills would hide it) so the parchment
      // reads as grained, not flat. Blends by multiply so it darkens the land.
      if (atlas) parts.push(`<path d="M0,0H${WX}V${WY}H0Z" fill="#fff" filter="url(#paper)" opacity="0.18" style="mix-blend-mode:multiply" pointer-events="none"/>`);

      // G4: the terrain — contour lines over the fills, then the sea itself.
      // #60: only levels above the water draw — a ring under the sea is noise;
      // the fine set is atlas ink (#63)
      if (atlas) model.contoursFine.filter(cl => cl.level > model.seaLevel).forEach(cl => {
        const d = cl.segs.map(sg2 => `M${sg2[0][0].toFixed(1)},${fy(sg2[0][1]).toFixed(1)}L${sg2[1][0].toFixed(1)},${fy(sg2[1][1]).toFixed(1)}`).join("");
        parts.push(`<path class="contourfine" d="${d}" fill="none" stroke="#6d604c" stroke-width="0.8" opacity="${0.12 + cl.level * 0.0016}"/>`);
      });
      model.contours.filter(cl => cl.level > model.seaLevel).forEach(cl => {
        const d = cl.segs.map(sg2 => `M${sg2[0][0].toFixed(1)},${fy(sg2[0][1]).toFixed(1)}L${sg2[1][0].toFixed(1)},${fy(sg2[1][1]).toFixed(1)}`).join("");
        parts.push(`<path class="contour" d="${d}" fill="none" stroke="#6d604c" stroke-width="1" opacity="0.3"/>`);
      });
      // H1: relief icons — elevation and biome landmarks drawn above the
      // terrain, below labels. Sorted by Y for back-to-front occlusion.
      if (!atlas) {
        const icons = [];
        const s = streams(params.seed)("hsIcons"); // deterministic jitter per seed
        model.regions.forEach(reg => {
          const cx = reg.c[0], cy = fy(reg.c[1]);
          if (reg.elevation >= 70) {
            // mountain ▲: sized by elevation, darkest at the peaks
            const sz = 14 + (reg.elevation - 70) * 1.0;
            const peak = clamp((reg.elevation - 70) / 30, 0, 1);
            const c = `rgb(${Math.round(120-50*peak)},${Math.round(100-50*peak)},${Math.round(85-35*peak)})`;
            const jx = cx + (s() - 0.5) * 14, jy = cy + (s() - 0.5) * 12;
            icons.push({ y: jy, h: sz, el: `<path d="M${(jx).toFixed(1)},${(jy-sz*1.3).toFixed(1)} L${(jx-sz*0.85).toFixed(1)},${(jy+sz*0.5).toFixed(1)} L${(jx+sz*0.85).toFixed(1)},${(jy+sz*0.5).toFixed(1)} Z" fill="${c}" stroke="#4a3d2f" stroke-width="1.2" opacity="0.82"/>` });
          } else if (reg.elevation >= 50 && reg.ruggedness >= 30) {
            // hill △: on rugged mid-elevation ground
            const sz = 6 + (reg.elevation - 50) * 0.4;
            const jx = cx + (s() - 0.5) * 16, jy = cy + (s() - 0.5) * 14;
            icons.push({ y: jy, h: sz, el: `<path d="M${(jx).toFixed(1)},${(jy-sz*1.2).toFixed(1)} L${(jx-sz*0.7).toFixed(1)},${(jy+sz*0.4).toFixed(1)} L${(jx+sz*0.7).toFixed(1)},${(jy+sz*0.4).toFixed(1)} Z" fill="#8a7a65" stroke="#6d5d4a" stroke-width="0.8" opacity="0.62"/>` });
          } else if (reg.biome === "forest" && reg.elevation < 65) {
            // tree cluster ♣: a few tree glyphs on forested low ground
            const n = 2 + Math.floor(s() * 2); // 2-3 trees per forest region
            for (let t = 0; t < n; t++) {
              const jx = cx + (s() - 0.5) * 20, jy = cy + (s() - 0.5) * 16;
              const ts = 4 + s() * 2.5;
              icons.push({ y: jy, h: ts, el: `<circle cx="${jx.toFixed(1)}" cy="${(jy-ts).toFixed(1)}" r="${(ts*0.85).toFixed(1)}" fill="#3f6a3f" opacity="0.6"/><circle cx="${jx.toFixed(1)}" cy="${(jy).toFixed(1)}" r="${ts.toFixed(1)}" fill="#2f552f" opacity="0.55"/>` });
            }
          }
        });
        icons.sort((a, b) => a.y + a.h - (b.y + b.h));
        if (icons.length) parts.push(`<g class="relief">${icons.map(ic => ic.el).join("")}</g>`);
      }
      const seaClipPaths = []; // the roughened sea outlines, to punch holes in the land clip
      model.seaShapes.forEach(S => {
        // decimate lightly (heavy decimation is what made the coast blobby),
        // then roughen: insert a displaced midpoint on each edge, pushed along
        // the edge normal by a seam-free roughness profile so some stretches
        // stay calm (bays) and others crag (headlands). Render-only; the
        // exported S.outer polygon is untouched.
        const dec = (rg) => rg.length > 320 ? rg.filter((_, i2) => i2 % 2 === 0) : rg;
        const roughen = (rg) => {
          const n = rg.length; if (n < 4) return rg;
          const out = [];
          for (let i2 = 0; i2 < n; i2++) {
            const a = rg[i2], b = rg[(i2 + 1) % n];
            out.push(a);
            const t = i2 / n; // seam-free: profile is periodic in t
            let rough = 0.5 + 0.5 * Math.cos(2 * Math.PI * (3 * t + 0.11)) * Math.cos(2 * Math.PI * (7 * t + 0.53));
            rough = rough < 0.25 ? 0 : rough; // calm stretches stay smooth
            const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len, ny = dx / len; // edge normal
            const disp = jit(a[0], a[1], i2 * 7 + 3) * Math.sqrt(len) * 1.3 * rough;
            out.push([(a[0] + b[0]) / 2 + nx * disp, (a[1] + b[1]) / 2 + ny * disp]);
          }
          return out;
        };
        const sub = (rg) => bsplineClosed(roughen(dec(rg)).map(pt => [pt[0], fy(pt[1])]));
        const d = [S.outer, ...S.holes].map(sub).join(" ");
        seaClipPaths.push(d); // remember the exact water outline for the land clip
        // V2: the shore glows — one path in defs, three translucent ring
        // strokes by reference, then the water itself (memory: 1 copy, not 4)
        const sid = "seashape" + model.seaShapes.indexOf(S);
        parts.push(`<defs><path id="${sid}" d="${d}" fill="none"/></defs>`);
        parts.push(`<use href="#${sid}" stroke="#1f3846" stroke-width="2" opacity="0.3" transform="translate(1.4,2)"/>`);
        for (const [rw, ro] of (atlas ? [[26, 0.10], [14, 0.13], [6, 0.16]] : [[6, 0.16]])) // data: one ring, not a glow
          parts.push(`<use href="#${sid}" stroke="#9dbdd9" stroke-width="${rw}" opacity="${ro}" stroke-linejoin="round"/>`);
        parts.push(`<path class="sea" d="${d}" fill-rule="evenodd" fill="#4a7fae" fill-opacity="0.55" stroke="#2b5f8a" stroke-width="1.4"/>`);
        if (S.name && poi) { // E6: the chart takes its name at the water's centroid
          let cx = 0, cy = 0, aa = 0;
          for (let k = 0; k + 1 < S.outer.length; k++) {
            const w2 = S.outer[k][0] * S.outer[k + 1][1] - S.outer[k + 1][0] * S.outer[k][1];
            aa += w2; cx += (S.outer[k][0] + S.outer[k + 1][0]) * w2; cy += (S.outer[k][1] + S.outer[k + 1][1]) * w2;
          }
          if (Math.abs(aa) > 1e-6) { cx /= 3 * aa; cy /= 3 * aa;
            const arcId = "sealbl" + model.seaShapes.indexOf(S);
            const spread = Math.min(190, 34 + S.name.length * 13);
            if (tryLabel(labelBox(cx, fy(cy), S.name, 15), 2)) {
              parts.push(`<defs><path id="${arcId}" d="M${(cx - spread).toFixed(1)},${(fy(cy) + 9).toFixed(1)} Q${cx.toFixed(1)},${(fy(cy) - 9).toFixed(1)} ${(cx + spread).toFixed(1)},${(fy(cy) + 9).toFixed(1)}"/></defs>`);
              parts.push(`<text font-size="${cz(15)}" font-style="italic" letter-spacing="${Math.min(6, 2 + spread / 60).toFixed(1)}" fill="#1d4f7a" opacity="0.78"><textPath href="#${arcId}" startOffset="50%" text-anchor="middle">${esc(S.name)}</textPath></text>`);
            }
          }
        }
      });
      // LAKES: inland water. Same roughened-outline treatment as the sea, a
      // touch lighter, and added to the land clip so rivers stop at the shore.
      (model.lakeShapes || []).forEach((S, li) => {
        const dec = (rg) => rg.length > 320 ? rg.filter((_, i2) => i2 % 2 === 0) : rg;
        const roughen = (rg) => {
          const n = rg.length; if (n < 4) return rg;
          const out = [];
          for (let i2 = 0; i2 < n; i2++) {
            const a = rg[i2], b = rg[(i2 + 1) % n];
            out.push(a);
            const t = i2 / n;
            let rough = 0.5 + 0.5 * Math.cos(2 * Math.PI * (2 * t + 0.2)) * Math.cos(2 * Math.PI * (5 * t + 0.4));
            rough = rough < 0.35 ? 0 : rough; // lakeshores are gentler than coasts
            const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len, ny = dx / len;
            const disp = jit(a[0], a[1], i2 * 5 + 9) * Math.sqrt(len) * 0.9 * rough;
            out.push([(a[0] + b[0]) / 2 + nx * disp, (a[1] + b[1]) / 2 + ny * disp]);
          }
          return out;
        };
        const sub = (rg) => bsplineClosed(roughen(dec(rg)).map(pt => [pt[0], fy(pt[1])]));
        const d = [S.outer, ...S.holes].map(sub).join(" ");
        seaClipPaths.push(d); // rivers stop at the lakeshore too
        const lid = "lakeshape" + li;
        parts.push(`<defs><path id="${lid}" d="${d}" fill="none"/></defs>`);
        if (atlas) parts.push(`<use href="#${lid}" stroke="#9dbdd9" stroke-width="8" opacity="0.14" stroke-linejoin="round"/>`);
        parts.push(`<path class="lake" d="${d}" fill-rule="evenodd" fill="#5b8fb0" fill-opacity="0.6" stroke="#3f6f8f" stroke-width="1.2"/>`);
      });

      // Roads (under everything else): width by class, tracks dashed
      model.roadEdges.forEach(e => {
        const A = model.regions[e.a], B = model.regions[e.b];
        // U2: width by the FLOW the model always computed — the pass
        // funnels, the backroads thin to tracks
        const w = 0.8 + (e.traffic || 0) * 0.032;
        const dash = e.cls === "track" ? ` stroke-dasharray="1.6 3.2"` : e.cls === "road" ? ` stroke-dasharray="7 2.4"` : "";
        { // V2: three points and a curve — the road finds its own line
          const ax = A.c[0], ay = fy(A.c[1]), bx = B.c[0], by = fy(B.c[1]);
          const mx = (ax + bx) / 2, my = (ay + by) / 2, L2 = Math.hypot(bx - ax, by - ay) || 1;
          const bend = Math.min(10, L2 * 0.08) * jit(mx, my, e.a * 31 + e.b);
          const px = mx - (by - ay) / L2 * bend, py = my + (bx - ax) / L2 * bend;
          parts.push(`<path class="road" d="${catRom([[ax, ay], [px, py], [bx, by]])}" fill="none" stroke="${atlas ? "#6b5844" : "#8a8378"}" stroke-width="${w.toFixed(2)}" opacity="0.8" stroke-linecap="round"${dash}/>`);
        }
      });

      // A1: the twins — same distance, different fate; the line is the argument.
      // #62: amber, not a sixth red, over a white casing; #63: in data mode it
      // surfaces only on the lens it argues for
      if (atlas || view === "injustice") {
        const F2 = getFindings(model);
        if (F2.twins) {
          const a = model.regions.find(r => r.id === F2.twins.shadow);
          const b = model.regions.find(r => r.id === F2.twins.open);
          const seg = `x1="${a.c[0].toFixed(1)}" y1="${fy(a.c[1]).toFixed(1)}" x2="${b.c[0].toFixed(1)}" y2="${fy(b.c[1]).toFixed(1)}"`;
          parts.push(`<line ${seg} stroke="#fff" stroke-width="5" stroke-dasharray="8 5" opacity="0.85"/>`);
          parts.push(`<line class="twin" ${seg} stroke="#b45309" stroke-width="2.5" stroke-dasharray="8 5" opacity="0.85"/>`);
        }
      }

      // P1: the wild layer — ◆ ruins, ♜ towers, ═ bridges, ◉ the maelstrom
      // (#63: data mode files the wild layer under points of interest)
      if (poi) model.ruins.forEach(r => {
        const reg = model.regions[r.regionIdx];
        parts.push(`<text class="ruin" x="${reg.wildPt[0].toFixed(1)}" y="${(fy(reg.wildPt[1]) + 5).toFixed(1)}" font-size="${cz(16)}" text-anchor="middle" fill="#4c4c4c" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">◆</text>`);
      });
      if (poi) model.regions.filter(r => r.hasTower === 1).forEach(reg => {
        parts.push(`<text class="tower" x="${reg.towerPt[0].toFixed(1)}" y="${(fy(reg.towerPt[1]) + 6).toFixed(1)}" font-size="${cz(17)}" text-anchor="middle" fill="#3b1f4e" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">♜</text>`);
      });
      if (poi) model.bridges.forEach(b => {
        // R1: the glyph stands on the bed (nearest trace point); the
        // exported bridge point stays the region anchor — data untouched
        const tr2 = (model.rivers.find(rv => rv.id === b.riverId) || {}).trace || [];
        let bx = b.x, by = b.y, bd2 = Infinity;
        for (const p of tr2) { const d = Math.hypot(p[0] - b.x, p[1] - b.y); if (d < bd2) { bd2 = d; bx = p[0]; by = p[1]; } }
        // #93: a held gate wears its holder's ring — who owns the crossing
        if (b.heldBy && b.heldBy !== "none") parts.push(`<circle class="gatering" cx="${bx.toFixed(1)}" cy="${fy(by).toFixed(1)}" r="11" fill="none" stroke="${BLOC_COLORS[b.heldBy]}" stroke-width="2.5" opacity="0.85"/>`);
        // B6 (#128): a DECAYED span reads rust-red with a broken ring — the ford is coming back
        const bdec = b.condition !== undefined && b.condition < 0.7;
        if (bdec) parts.push(`<circle cx="${bx.toFixed(1)}" cy="${fy(by).toFixed(1)}" r="9" fill="none" stroke="#b0432e" stroke-width="1.8" stroke-dasharray="3 3" opacity="0.9"/>`);
        parts.push(`<text class="bridge${bdec ? " decayed" : ""}" x="${bx.toFixed(1)}" y="${(fy(by) + 6).toFixed(1)}" font-size="${cz(15)}" font-weight="700" text-anchor="middle" fill="${bdec ? "#b0432e" : "#6b5844"}" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">═</text>`);
      });
      if (poi && model.maelstrom) {
        const mx = clamp(model.maelstrom.x, 22, WX - 22), my = clamp(model.maelstrom.y, 22, WY - 22);
        parts.push(`<text class="maelstrom" x="${mx.toFixed(1)}" y="${(fy(my) + 7).toFixed(1)}" font-size="${cz(20)}" text-anchor="middle" fill="#1d4e79" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">◉</text>`);
      }

      // S1: the skyway — violet dashes between the aeries, above every wall
      {
        const sp = model.regions.filter(r => r.isSkyport === 1);
        if (atlas || view === "sky") { // #63: the lanes argue on the sky lens
          for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) {
            const seg = `x1="${sp[i].c[0].toFixed(1)}" y1="${fy(sp[i].c[1]).toFixed(1)}" x2="${sp[j].c[0].toFixed(1)}" y2="${fy(sp[j].c[1]).toFixed(1)}"`;
            parts.push(`<line ${seg} stroke="#fff" stroke-width="5" stroke-dasharray="2 7" opacity="0.7"/>`);
            parts.push(`<line class="skylane" ${seg} stroke="#3f007d" stroke-width="2.5" stroke-dasharray="2 7" opacity="0.6"/>`);
          }
        }
        sp.forEach(reg => {
          const [x, y] = slotAt(reg, 7); // prefer NW
          parts.push(`<text class="skyport" x="${x.toFixed(1)}" y="${(y + 6).toFixed(1)}" font-size="${cz(17)}" text-anchor="middle" fill="#3f007d" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">⍟</text>`);
        });
      }

      // X1: the Dominion's standard flies at its foothold
      if (model.dominion) {
        const f = model.regions[model.dominion.foothold];
        const [x, y] = slotAt(f, 1); // prefer NE
        parts.push(`<text class="dominion" x="${x.toFixed(1)}" y="${(y + 6).toFixed(1)}" font-size="${cz(18)}" text-anchor="middle" fill="#3a2f2a" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">⚑</text>`);
      }

      // G3: the ports — ⚓ where the realm meets the water
      model.regions.filter(r => r.isPort === 1).forEach(reg => {
        // #93: port holdings stamp heldBy on the region itself
        if (reg.heldBy && reg.heldBy !== "none") parts.push(`<circle class="gatering" cx="${reg.shorePt[0].toFixed(1)}" cy="${fy(reg.shorePt[1]).toFixed(1)}" r="12" fill="none" stroke="${BLOC_COLORS[reg.heldBy]}" stroke-width="2.5" opacity="0.85"/>`);
        parts.push(`<text class="port" x="${reg.shorePt[0].toFixed(1)}" y="${(fy(reg.shorePt[1]) + 6).toFixed(1)}" font-size="${cz(18)}" text-anchor="middle" fill="#1d4e79" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">⚓</text>`);
      });

      // R1: the rivers ride their beds — RV.trace IS the centerline (the
      // fine downhill walk over the continuous field; the chain stays the
      // drinking order). Tapered two-bank ribbon over a white casing (#60).
      // Clip the whole river group to the LAND (a full-canvas rect with the sea
      // outlines punched out, evenodd) so any bed reaching the coast is masked
      // at the water's edge (casing and all) instead of lying on the sea.
      // ONE path (rect subpath + each sea outline as a subpath) with evenodd so
      // the sea punches holes in the canvas rect: the clip region is the land.
      const landD = `M0,0H${WX}V${WY}H0Z ` + seaClipPaths.join(" ");
      parts.push(`<clipPath id="landClip"><path d="${landD}" clip-rule="evenodd"/></clipPath>`);
      parts.push(`<g clip-path="url(#landClip)">`);
      // corner-cutting pass (render-only; the exported trace keeps its points):
      // two rounds of 1/4-3/4 subdivision turn corridor corners into bends.
      // A river leans into its turns; it does not take them at right angles
      const meander = (pts) => {
        if (pts.length < 3) return pts;
        return pts.map((p, i) => {
          const dx = pts[Math.min(pts.length - 1, i + 1)][0] - pts[Math.max(0, i - 1)][0];
          const dy = pts[Math.min(pts.length - 1, i + 1)][1] - pts[Math.max(0, i - 1)][1];
          const len = Math.hypot(dx, dy) || 1;
          const amp = (6 + i * 0.35) * (0.6 + 0.4 * Math.sin(i * 1.7 + pts.length * 0.4));
          return [p[0] + (-dy / len) * amp, p[1] + (dx / len) * amp];
        });
      };
      const relaxBed = (P) => {
        for (let r = 0; r < 2; r++) {
          if (P.length < 3) return P;
          const out = [P[0]];
          for (let i = 0; i + 1 < P.length; i++) {
            const a = P[i], b = P[i + 1];
            out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25],
                     [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
          }
          out.push(P[P.length - 1]);
          P = out;
        }
        return P;
      };
      model.rivers.forEach(RV => {
        const ctr = relaxBed(meander((RV.trace || []).map(p => [p[0], fy(p[1])])));
        if (ctr.length < 2) return;
        const left = [], right = [];
        const wMul = atlas ? 1 : 0.6; // #63: data mode thins the ribbon — context, not subject
        // width by discharge: accumulated flow (own length + tributaries) makes
        // a trunk below a confluence read broader than a headwater creek.
        const mag = Math.min(1, ((RV.flow || (RV.chain || []).length || 2)) / 10);
        for (let k = 0; k < ctr.length; k++) {
          const a2 = ctr[Math.max(0, k - 1)], b2 = ctr[Math.min(ctr.length - 1, k + 1)];
          const dx = b2[0] - a2[0], dy = b2[1] - a2[1], L2 = Math.hypot(dx, dy) || 1;
          const nx = -dy / L2, ny = dx / L2;
          const hw = (0.9 + 2.6 * (k / (ctr.length - 1))) * wMul * (0.6 + 0.9 * mag); // source thin, mouth broad; scaled by discharge
          left.push([ctr[k][0] + nx * hw, ctr[k][1] + ny * hw]);
          right.push([ctr[k][0] - nx * hw, ctr[k][1] - ny * hw]);
        }
        right.reverse();
        const dRiv = catRom(left) + "L" + right.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L") + "Z";
        parts.push(`<path d="${dRiv}" fill="#fff" stroke="#fff" stroke-width="2"/>`);
        parts.push(`<path class="river" d="${dRiv}" fill="${atlas ? "#3d7ab5" : "#6b90ad"}" opacity="0.65" stroke="none"/>`);
        if (poi) {
          const mc = RV.trace[Math.floor(RV.trace.length / 2)]; // the name sits on the bed
          const rlbl = RV.kind === "River" ? "the " + RV.name : RV.name + " " + RV.kind;
          if (tryLabel(labelBox(mc[0], fy(mc[1]) + 18, rlbl, 12), 1)) {
            parts.push(`<text x="${mc[0].toFixed(1)}" y="${(fy(mc[1]) + 18).toFixed(1)}" font-size="${cz(12)}" font-style="italic" text-anchor="middle" fill="#3d7ab5" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">${RV.kind === "River" ? "the " + esc(RV.name) : esc(RV.name) + " " + esc(RV.kind)}</text>`);
          }
        }
      });
      parts.push(`</g>`); // end land-clipped river group

      // M1: the mountains are MASS — hachures down both flanks, peaks at
      // the crests; the axis survives only as a faint guide under its name.
      // hachures are atlas ink (#63); no stroke anchors on the water (#60);
      // white casings keep the ink legible on any ground (#62)
      if (atlas) model.hachures.forEach(h => {
        if (inSea((h[0] + h[2]) / 2, (h[1] + h[3]) / 2)) return;
        const seg = `x1="${h[0].toFixed(1)}" y1="${fy(h[1]).toFixed(1)}" x2="${h[2].toFixed(1)}" y2="${fy(h[3]).toFixed(1)}"`;
        parts.push(`<line ${seg} stroke="#fff" stroke-width="3.4" opacity="0.7" stroke-linecap="round"/>`);
        parts.push(`<line class="hachure" ${seg} stroke="#5b4a33" stroke-width="1.3" opacity="0.5"/>`);
      });
      // #60/#63: the ridge axis is terrain ink, so it only draws where its
      // mountain body (hachures/profiles above) draws, i.e. atlas mode.
      if (atlas) model.ridges.forEach(R => {
        const dR = catRom(R.pts.map(p => [p[0], fy(p[1])]));
        parts.push(`<path d="${dR}" fill="none" stroke="#fff" stroke-width="4.5" stroke-dasharray="1 6" stroke-linejoin="round" stroke-linecap="round" opacity="0.7"/>`);
        parts.push(`<path class="ridge" d="${dR}" fill="none" stroke="#4a3421" stroke-width="2" stroke-dasharray="1 6" stroke-linejoin="round" stroke-linecap="round" opacity="0.3"/>`);
        if (poi) {
          const mid = R.pts[Math.floor(R.pts.length / 2)];
          if (tryLabel(labelBox(mid[0], fy(mid[1]) - 10, R.name + " " + R.kind, 13), 1)) {
            parts.push(`<text x="${mid[0].toFixed(1)}" y="${(fy(mid[1]) - 10).toFixed(1)}" font-size="${cz(13)}" font-style="italic" text-anchor="middle" fill="#4a3421" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">${esc(R.name)} ${esc(R.kind)}</text>`);
          }
        }
      });
      // V2-B: the range is a PROFILE — small inked mountain shapes stamped
      // along each crest (size falls off toward the ends; the left face is
      // shaded, the right lit), sorted far-to-near so they overlap like a
      // painting. Deterministic: the size jitter is a function of position;
      // the stamps sit ON the crest walk (#60). Atlas ink only (#63).
      if (atlas) {
        const stamps = [];
        model.ridges.forEach(R => {
          let acc = 0;
          for (let k = 1; k < R.pts.length; k++) {
            const [ax, ay] = R.pts[k - 1], [bx, by] = R.pts[k];
            const segL = Math.hypot(bx - ax, by - ay);
            for (let t = acc; t < segL; t += 34) {
              const u = t / segL, x = ax + (bx - ax) * u, y = ay + (by - ay) * u;
              const along = (k - 1 + u) / (R.pts.length - 1);
              const endFall = Math.sin(Math.PI * Math.min(1, Math.max(0, along)));
              const s2 = (7 + (R.maxElev - 60) * 0.16) * (0.55 + 0.45 * endFall) * (0.82 + 0.36 * Math.abs(jit(x, y, 5)));
              if (s2 < 4) continue;
              if (inSea(x, y)) continue; // #60: no mountains on the water
              stamps.push([x, y, s2]);
            }
            acc = (acc + segL) % 34;
          }
        });
        stamps.sort((p2, q2) => (fy(p2[1]) + p2[2]) - (fy(q2[1]) + q2[2]));
        for (const [x, y, s2] of stamps) {
          const px = x, py = fy(y), wHalf = s2 * 0.95;
          const apexX = px, apexY = py - s2;
          parts.push(`<path d="M${(px - wHalf).toFixed(1)},${py.toFixed(1)}L${apexX.toFixed(1)},${apexY.toFixed(1)}L${(px + wHalf).toFixed(1)},${py.toFixed(1)}" fill="#efe7d9" stroke="#4a3421" stroke-width="0.9" stroke-linejoin="round" opacity="0.9"/>`);
          parts.push(`<path d="M${(px - wHalf).toFixed(1)},${py.toFixed(1)}L${apexX.toFixed(1)},${apexY.toFixed(1)}L${(apexX + wHalf * 0.16).toFixed(1)},${py.toFixed(1)}Z" fill="#c9b592" stroke="none" opacity="0.55"/>`);
        }
      }
      // #60/#63: ▲ peaks and ∩ passes are terrain glyphs. They orphan on
      // flat choropleth in data mode where the mountain body is suppressed,
      // so gate them on atlas. Passes on trivial ridges (maxElev < 60, the
      // "Hills" grade that draws almost no relief) are dropped even in atlas.
      if (atlas) model.peaks.forEach(pk => {
        if (inSea(pk.x, pk.y)) return; // #60: no summits at sea
        parts.push(`<text class="peak" x="${pk.x.toFixed(1)}" y="${(fy(pk.y) + 5).toFixed(1)}" font-size="${cz(14)}" text-anchor="middle" fill="#4a3421" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">▲</text>`);
      });
      if (atlas) model.passes.forEach(p => {
        const R = model.ridges.find(r => r.id === p.ridgeId);
        if (R && R.maxElev < 60) return; // orphaned pass on a barely-there ridge
        if (p.heldBy && p.heldBy !== "none") parts.push(`<circle class="gatering" cx="${p.x.toFixed(1)}" cy="${fy(p.y).toFixed(1)}" r="11" fill="none" stroke="${BLOC_COLORS[p.heldBy]}" stroke-width="2.5" opacity="0.85"/>`);
        // B6 (#128): a DECAYED pass reads rust-red with a broken ring — the wall is coming back
        const pdec = p.condition !== undefined && p.condition < 0.7;
        if (pdec) parts.push(`<circle cx="${p.x.toFixed(1)}" cy="${fy(p.y).toFixed(1)}" r="9" fill="none" stroke="#b0432e" stroke-width="1.8" stroke-dasharray="3 3" opacity="0.9"/>`);
        parts.push(`<text class="pass${pdec ? " decayed" : ""}" x="${p.x.toFixed(1)}" y="${(fy(p.y) + 6).toFixed(1)}" font-size="${cz(17)}" font-weight="700" text-anchor="middle" fill="${pdec ? "#b0432e" : "#4a3421"}" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">∩</text>`);
        if (poi) parts.push(`<text x="${p.x.toFixed(1)}" y="${(fy(p.y) + 20).toFixed(1)}" font-size="${cz(10)}" font-style="italic" text-anchor="middle" fill="#4a3421" paint-order="stroke" stroke="#fff" stroke-width="${cz(2.5)}" opacity="0.85">${esc(p.name)}</text>`);
      });

      // Sanctioned sites (Temple): a violet cross — ▲ belongs to the peaks alone
      if (poi) model.sanctionedSites.forEach(s => {
        parts.push(`<text class="sanct" x="${s.x.toFixed(1)}" y="${(fy(s.y) + 6).toFixed(1)}" font-size="${cz(18)}" text-anchor="middle" fill="#54278f" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">✚</text>`);
      });

      // Event markers: amber ✱ where lived history struck (#62: the ramp owns
      // red). A gazetteer/history mark, not the data subject, so gate on poi
      // and it leaves the region numbers alone in data mode. Also smaller: it
      // was 22, the largest glyph on the map, and now reads as a footnote (#61).
      if (poi) model.regions.forEach(reg => {
        if (reg.eventType !== "none" && reg.eventEpoch <= Math.min(scrubEpoch, snaps.length - 1)) {
          const [x, y] = slotAt(reg, 3); // prefer SE
          parts.push(`<text class="evt" x="${x.toFixed(1)}" y="${(y + 6).toFixed(1)}" font-size="${cz(16)}" text-anchor="middle" fill="#c2670a" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">✱</text>`);
        }
      });

      // Garrisons (Crown force): near-black G beside the settlement (#62)
      model.garrisons.forEach(g => {
        const reg = model.regions.find(r => r.id === g.regionId);
        const [x, y] = slotAt(reg, 6); // prefer W
        parts.push(`<text class="gar" x="${x.toFixed(1)}" y="${(y + 6).toFixed(1)}" font-size="${cz(16)}" font-weight="700" text-anchor="middle" fill="#26201a" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">G</text>`);
      });

      // Facility glyphs (H = healer, W = waterworks, D = wardstation). The
      // trio shares ONE region slot (#61) and fans out horizontally within it.
      const FAC_STYLE = { healer: ["H", "#006d2c", -14], waterworks: ["W", "#08519c", 0], wardstation: ["D", "#54278f", 14] };
      const facSlot = new Map(); // regionId -> [x,y], so H/W/D don't each grab a slot
      if (poi) model.facilities.forEach(f => {
        const [ch, color, dx] = FAC_STYLE[f.type];
        let base = facSlot.get(f.regionId);
        if (!base) { base = slotAt(model.regions.find(r => r.id === f.regionId), 4); facSlot.set(f.regionId, base); } // prefer S
        parts.push(`<text class="fac" x="${(base[0] + dx).toFixed(1)}" y="${(base[1] + 6).toFixed(1)}" font-size="${cz(14)}" font-weight="700" text-anchor="middle" fill="${color}" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">${ch}</text>`);
      });

      // #91: the institutions — a town IS its buildings. At most three glyphs
      // by priority (the ledger carries the full list), fanned like H/W/D.
      // Drawn on parchment always, and on the two institution lenses in data
      // mode; the tavern never draws (most common, least signal).
      const STRUCT_STYLE = { counting_house: ["¤", "#3f007d"], temple: ["†", "#54278f"], keep: ["♖", "#26201a"], library: ["✒", "#323060"], guildhall: ["⚒", "#8c5a2f"], market: ["◇", "#b8860b"] };
      const STRUCT_PRIORITY = ["counting_house", "temple", "keep", "library", "guildhall", "market"];
      if (atlas || lensId === "sitechar" || lensId === "finance") model.regions.forEach(reg => {
        if (!reg.structures || !reg.structures.length) return;
        const show = STRUCT_PRIORITY.filter(t => reg.structures.includes(t)).slice(0, 3);
        if (!show.length) return;
        const base = slotAt(reg, 1); // NE: the name label owns N, the value owns S
        show.forEach((t, i) => {
          const [ch, color] = STRUCT_STYLE[t];
          parts.push(`<text class="struct" x="${(base[0] + (i - (show.length - 1) / 2) * 13).toFixed(1)}" y="${(base[1] + 5).toFixed(1)}" font-size="${cz(13)}" font-weight="700" text-anchor="middle" fill="${color}" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">${ch}</text>`);
        });
      });

      // L1: the places between — the freeport's black anchor, the
      // sanctuary's star, the hunters' stands, the veil over the still
      // (#63: all of it files under points of interest in data mode)
      if (poi && model.freeport) {
        const reg = model.regions.find(r => r.id === model.freeport.regionId);
        const P = reg.shorePt || reg.c;
        parts.push(`<text x="${P[0].toFixed(1)}" y="${(fy(P[1]) + 6).toFixed(1)}" font-size="${cz(18)}" text-anchor="middle" fill="#1a1a1a" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">⚓</text>`);
        parts.push(`<text x="${P[0].toFixed(1)}" y="${(fy(P[1]) + 21).toFixed(1)}" font-size="${cz(10)}" font-style="italic" text-anchor="middle" fill="#1a1a1a" paint-order="stroke" stroke="#fff" stroke-width="${cz(2.5)}">${esc(model.freeport.name)}</text>`);
      }
      if (poi && model.sanctuary) {
        parts.push(`<text x="${model.sanctuary.x.toFixed(1)}" y="${(fy(model.sanctuary.y) - 16).toFixed(1)}" font-size="${cz(16)}" text-anchor="middle" fill="#8a6d00" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">✦</text>`);
        parts.push(`<text x="${model.sanctuary.x.toFixed(1)}" y="${(fy(model.sanctuary.y) - 30).toFixed(1)}" font-size="${cz(10)}" font-style="italic" text-anchor="middle" fill="#8a6d00" paint-order="stroke" stroke="#fff" stroke-width="${cz(2.5)}">${esc(model.sanctuary.name)}</text>`);
      }
      if (poi) model.camps.forEach(cp => {
        const reg = model.regions.find(r => r.id === cp.regionId);
        const [x, y] = slotAt(reg, 5); // prefer SW
        parts.push(`<text x="${x.toFixed(1)}" y="${(y + 6).toFixed(1)}" font-size="${cz(13)}" font-weight="700" text-anchor="middle" fill="#5c4327" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">∧</text>`);
      });
      if (poi) {
        const still = model.regions.filter(r => r.stillair === 1);
        still.forEach(reg => {
          const [x, y] = slotAt(reg, 2); // prefer E
          parts.push(`<text x="${x.toFixed(1)}" y="${(y + 6).toFixed(1)}" font-size="${cz(13)}" text-anchor="middle" fill="#667" paint-order="stroke" stroke="#fff" stroke-width="${cz(2.5)}">⌀</text>`);
        });
        if (still.length && model.stillName) {
          const cx2 = still.reduce((s2, r) => s2 + r.c[0], 0) / still.length;
          const cy2 = still.reduce((s2, r) => s2 + r.c[1], 0) / still.length;
          parts.push(`<text x="${cx2.toFixed(1)}" y="${(fy(cy2) - 44).toFixed(1)}" font-size="${cz(12)}" font-style="italic" letter-spacing="2" text-anchor="middle" fill="#556" opacity="0.85" paint-order="stroke" stroke="#fff" stroke-width="${cz(2.5)}">${esc(model.stillName)}</text>`);
        }
      }

      // Conduit lines (drawn under settlement symbols) — sliced to the epoch
      // (#63: in data mode the grid argues only on its own lenses)
      if (atlas || view === "services" || view === "gap") model.conduitEdges.slice(0, live.edgeCount).forEach(e => {
        const A = model.regions[e.a], B = model.regions[e.b];
        parts.push(`<line x1="${A.c[0].toFixed(1)}" y1="${fy(A.c[1]).toFixed(1)}" x2="${B.c[0].toFixed(1)}" y2="${fy(B.c[1]).toFixed(1)}" stroke="#b8860b" stroke-width="${e.cls === "trunk" ? 6 : 3}" opacity="0.85"/>`);
      });

      model.settlements.forEach(s => {
        const sreg = model.regions[s.regionId];
        const cx = s.x, cy = fy(s.y), isPrime = s.tier === "metropolis";
        const r = 3 + 13 * Math.sqrt(RP(sreg) / maxPop);
        const off = !RG(sreg);
        const fill = off ? "#8a8a8a" : (isPrime ? "#d62728" : (s.tier === "city" ? "#fff" : "#ccc"));
        const dash = off ? ` stroke-dasharray="4 3"` : "";
        parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" stroke="#000" stroke-width="${isPrime ? 2 : 1.2}"${dash} filter="url(#softShadow)"/>`);
        if (isPrime || s.tier === "city") {
          // label size tracks population (like the dot), not a two-value tier,
          // so a big hub reads louder than a small one; the seat keeps a floor.
          let fsize = 12 + 11 * Math.sqrt(RP(sreg) / maxPop);
          fsize = isPrime ? Math.max(fsize, 20) : Math.min(fsize, 18);
          const dfs = zc === 1 ? fsize.toFixed(1) : (fsize * zc).toFixed(1);
          parts.push(`<text class="placename" x="${cx.toFixed(1)}" y="${(cy - r - 5).toFixed(1)}" font-size="${dfs}" text-anchor="middle" fill="#000" font-weight="600" paint-order="stroke" stroke="#fff" stroke-width="${cz(4)}">${esc(s.name)}</text>`);
        } else if (zc < 1 && (s.tier === "works-town" || s.tier === "frontier-post")) {
          // deeper zoom earns the smaller seats their names — decluttered like the
          // rest (rank 3: yields to prime/hub, outranks the decorative water/ridge).
          const rawfs = 10 + 8 * Math.sqrt(RP(sreg) / maxPop);
          if (tryLabel(labelBox(cx, cy - r - 5, s.name, rawfs), 3)) {
            parts.push(`<text class="placename" x="${cx.toFixed(1)}" y="${(cy - r - 5).toFixed(1)}" font-size="${(rawfs * zc).toFixed(1)}" text-anchor="middle" fill="#111" font-weight="600" paint-order="stroke" stroke="#fff" stroke-width="${cz(3)}">${esc(s.name)}</text>`);
          }
        }
      });
      // Wind arrow (top-left; display coords flip y)
      {
        const a = model.windDeg * Math.PI / 180;
        const dx = Math.cos(a), dy = -Math.sin(a);
        const cx0 = 70, cy0 = 70, L = 36;
        const x1 = cx0 - dx * L, y1 = cy0 - dy * L, x2 = cx0 + dx * L, y2 = cy0 + dy * L;
        const hx = -dx * 14, hy = -dy * 14; // arrowhead back-vector
        const px = -dy, py = dx;            // perpendicular
        parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#000" stroke-width="4" opacity="0.65"/>`);
        parts.push(`<polygon points="${x2.toFixed(1)},${y2.toFixed(1)} ${(x2 + hx + px * 8).toFixed(1)},${(y2 + hy + py * 8).toFixed(1)} ${(x2 + hx - px * 8).toFixed(1)},${(y2 + hy - py * 8).toFixed(1)}" fill="#000" opacity="0.65"/>`);
        parts.push(`<text x="${cx0}" y="${cy0 + 58}" font-size="16" text-anchor="middle" fill="#000" opacity="0.6" paint-order="stroke" stroke="#fff" stroke-width="3">wind</text>`);
      }
      // Compass (bottom-right): north is screen-up (world is y-up, display flips
      // y). Placed clear of the wind arrow (top-left) and epoch label (top-right)
      // so the compass and the wind arrow are never read as one thing.
      {
        const nx = WX - 52, ny = WY - 66;
        parts.push(`<line x1="${nx}" y1="${ny}" x2="${nx}" y2="${ny + 40}" stroke="#000" stroke-width="3" opacity="0.6"/>`);
        parts.push(`<polygon points="${nx},${ny - 8} ${nx - 6},${ny + 6} ${nx + 6},${ny + 6}" fill="#000" opacity="0.6"/>`);
        parts.push(`<text x="${nx}" y="${ny - 12}" font-size="15" font-weight="700" text-anchor="middle" fill="#000" opacity="0.7" paint-order="stroke" stroke="#fff" stroke-width="3">N</text>`);
      }
      if (params.ep > 0) {
        const ageName = ageAt(getFindings(model).ages, Math.min(scrubEpoch, snaps.length - 1));
        parts.push(`<text x="${WX - 40}" y="46" font-size="26" text-anchor="end" fill="#000" opacity="0.65" paint-order="stroke" stroke="#fff" stroke-width="4">epoch ${Math.min(scrubEpoch, snaps.length - 1)}/${params.ep}${ageName ? " · " + ageName : ""}</text>`);
      }
      if (inspectId >= 0 && inspectId < model.regions.length) {
        const reg = model.regions[inspectId];
        const d = "M" + reg.ring.map(p => `${p[0].toFixed(1)},${fy(p[1]).toFixed(1)}`).join("L") + "Z";
        parts.push(`<path class="sel" d="${d}" fill="none" stroke="#d9b96c" stroke-width="5" pointer-events="none"/>`);
      }
      // U3: the SELECTED FEATURE glows — a halo so the reader sees what the
      // side card is describing. Drawn last (above the map, under the frame),
      // non-interactive so it never eats the next click.
      if (selFeat) {
        const halo = (x, y, r) => parts.push(`<circle cx="${x.toFixed(1)}" cy="${fy(y).toFixed(1)}" r="${r}" fill="none" stroke="#c2670a" stroke-width="2.5" opacity="0.9" pointer-events="none"/>`);
        const k = selFeat.kind, id = selFeat.id;
        if (k === "ridge") { const R = model.ridges.find(r => r.id === id); if (R) parts.push(`<path d="${catRom(R.pts.map(p => [p[0], fy(p[1])]))}" fill="none" stroke="#c2670a" stroke-width="4" opacity="0.85" stroke-linecap="round" pointer-events="none"/>`); }
        else if (k === "river") { const RV = model.rivers.find(r => r.id === id); if (RV && RV.trace) parts.push(`<path d="${catRom(RV.trace.map(p => [p[0], fy(p[1])]))}" fill="none" stroke="#c2670a" stroke-width="4" opacity="0.85" stroke-linecap="round" pointer-events="none"/>`); }
        else if (k === "pass") { const p = model.passes[id]; if (p) halo(p.x, p.y, 15); }
        else if (k === "port") { const r = model.regions.filter(rr => rr.isPort === 1)[id]; if (r) halo(r.shorePt[0], r.shorePt[1], 15); }
        else if (k === "bridge") { const b = model.bridges[id]; if (b) halo(b.x, b.y, 15); }
        else if (k === "tower") { const r = model.regions.filter(rr => rr.hasTower === 1)[id]; if (r) halo(r.towerPt[0], r.towerPt[1], 15); }
        else if (k === "ruin") { const r = model.ruins[id]; if (r) { const reg = model.regions[r.regionIdx]; halo(reg.wildPt[0], reg.wildPt[1], 15); } }
        else if (k === "deadhold") { const r = model.regions.filter(rr => !rr.settled && rr.abandonedEpoch >= 0)[id]; if (r) halo(r.c[0], r.c[1], 15); }
        else if (k === "sanct") { const s = model.sanctionedSites[id]; if (s) halo(s.x, s.y, 15); }
        else if (k === "maelstrom" && model.maelstrom) halo(clamp(model.maelstrom.x, 22, WX - 22), clamp(model.maelstrom.y, 22, WY - 22), 17);
      }
      // Frame: a soft corner vignette to center the eye, and a thin double
      // neatline just inside the edge (the classic map border).
      parts.push(`<path d="M0,0H${WX}V${WY}H0Z" fill="url(#vignette)" pointer-events="none"/>`);
      parts.push(`<path d="M6,6H${WX - 6}V${WY - 6}H6Z" fill="none" stroke="#8a7a5c" stroke-width="1" opacity="0.6" pointer-events="none"/>`);
      parts.push(`<path d="M10,10H${WX - 10}V${WY - 10}H10Z" fill="none" stroke="#8a7a5c" stroke-width="0.5" opacity="0.4" pointer-events="none"/>`);
      parts.push(`</svg>`);
      const stage = document.getElementById("stage");
      stage.innerHTML = parts.join("");
      wireMap(stage.querySelector("#map"));
      updateScaleBar();

      { // U2: categorical views get NAMED swatches; choropleths keep the bar
        const bar = document.getElementById("legendBar");
        const CATS = LENS.cats || null;
        if (atlas) { // #63: no lens on parchment — the legend stands down
          document.getElementById("legendLabel").textContent = "atlas: the land itself";
          bar.classList.remove("cats");
          bar.parentElement.classList.add("no-ends");
          bar.innerHTML = "";
          bar.style.background = "none";
        } else if (CATS) {
          document.getElementById("legendLabel").textContent = LENS.catLabel;
          bar.classList.add("cats");
          bar.parentElement.classList.add("no-ends");
          bar.style.background = "none";
          bar.innerHTML = `<span class="swatches">` + Object.entries(CATS).map(([k, c]) =>
            `<span class="swatch"><i style="background:${c}"></i>${k}</span>`).join("") + `</span>`;
        } else {
          document.getElementById("legendLabel").textContent = ramp.label + " (choropleth)";
          bar.classList.remove("cats");
          bar.parentElement.classList.remove("no-ends");
          bar.innerHTML = "";
          bar.style.background = `linear-gradient(to right, rgb(${ramp.lo.join(",")}), rgb(${ramp.hi.join(",")}))`;
        }
      }

      const ws = model.regions.map(r => r.wealth);
      const totalPop = model.regions.reduce((s, r) => s + r.population, 0);
      const tierCounts = model.settlements.reduce((m, s) => { m[s.tier] = (m[s.tier] || 0) + 1; return m; }, {});
      const refineries = model.regions.filter(r => r.refining > 0).length;
      const rows = [
        ["seed", esc(params.seed)],
        ...(params.fate ? [["fate", esc(params.fate)]] : []),
        ["regions", model.regions.length],
        ["capital", `${esc(model.capitalName)} (region #${model.capital.id})`],
        ["income mix", `ext ${params.we} / ref ${params.wf} / trade ${params.wt} / grad ${params.wg}`],
        ["population", totalPop.toLocaleString("en-US")],
        ["tiers", `${tierCounts.metropolis || 0} metropolis / ${tierCounts.city || 0} city / ${tierCounts["works-town"] || 0} works-town / ${tierCounts["frontier-post"] || 0} frontier-post`],
        ["aetherworks", refineries],
        ["on-grid", `${model.settlements.filter(s => s.onConduit).length} of ${model.settlements.length} settlements (threshold ${params.gt})`],
        ["wind / disposal", `${model.windDeg}° / ${model.disposalDoctrine}`],
        ["facilities", (() => { const c = model.facilities.reduce((m, f) => { m[f.type] = (m[f.type] || 0) + 1; return m; }, {}); return `${c.healer || 0} healer / ${c.waterworks || 0} water / ${c.wardstation || 0} ward`; })()],
        ["worst burden", Math.max(...model.regions.map(r => r.burden)).toFixed(1) + " /1k"],
        ["blocs", (() => { const c = model.regions.reduce((m, r) => { const b = r.occupied ? "dominion" : r.bloc; m[b] = (m[b] || 0) + 1; return m; }, {}); return ["crown", "temple", "magnate", "contested", "ungoverned"].map(b => `${c[b] || 0} ${b.slice(0, 3)}`).join(" / ") + (c.dominion ? ` / ${c.dominion} dom` : ``); })()],
        ["roads", (() => { const c = model.roadEdges.reduce((m, e) => { m[e.cls] = (m[e.cls] || 0) + 1; return m; }, {}); return `${model.roadEdges.length} edges (${c.highway || 0} hwy / ${c.road || 0} road / ${c.track || 0} track)`; })()],
        ["security", (() => { const c = model.regions.reduce((m, r) => { m[r.security] = (m[r.security] || 0) + 1; return m; }, {}); return `${model.garrisons.length} constabularies: ${c.secured || 0} sec / ${c.patrolled || 0} pat / ${c.contested || 0} con / ${c.ungoverned || 0} ung`; })()],
        ["deep time", (() => { const dead = model.regions.filter(r => r.exhausted).length; const shocked = model.regions.filter(r => r.shock !== "none").length; return `${dead} dead-lode regions · ${shocked} scarred by shocks`; })()],
        ["uncounted", model.regions.reduce((s, r) => s + r.uncounted, 0).toLocaleString("en-US") + " people the census misses"],
        ["epochs", (() => { const c = model.regions.reduce((m, r) => { m[r.boomBust] = (m[r.boomBust] || 0) + 1; return m; }, {}); return `${params.ep} run: ${c.boom || 0} boom / ${c.stable || 0} stable / ${c.decline || 0} decline / ${c.collapse || 0} collapse`; })()],
        ["events", model.events.length
          // C1 (#134): the enum DATA-keys stay stable (refinery_collapse etc.), but the
          // readout renders them in the new register — the data is the anchor, the
          // presentation is the skin (so no medieval word reaches the reader).
          ? (() => {
              const EVL = { refinery_collapse: "aetherworks collapse", refinery_founded: "aetherworks founded", toll_amnesty: "tariff amnesty", toll_crackdown: "tariff crackdown", conduit_boom: "grid boom" };
              const lab = (k) => EVL[k] || k.replace("_", " ");
              return model.events.map(ev => `e${ev.epoch}: ${ev.name && ev.name.startsWith("the ") ? ev.name : lab(ev.type) + (ev.region_id !== undefined ? " @ #" + ev.region_id : ev.measure ? " (" + lab(ev.measure) + ")" : ev.name ? " (" + ev.name + ")" : "")}`).join(" · ");
            })()
          : "none: a quiet age"],
        ["wealth min / max", `${Math.min(...ws)} / ${Math.max(...ws)}`],
        ["the owners", (() => { const FR = getFindings(model); return FR.owners ? `${FR.owners.pop_pct}% of people hold ${FR.owners.coin_pct}% of the coin` : "not measured"; })()],
        ["the skyway", (() => { const sp = model.regions.filter(r => r.isSkyport === 1); return sp.length >= 2 ? `${esc(model.skywayName)} Lane: ${sp.length} aeries (${sp.map(r => esc((model.settlements.find(s => s.regionId === r.id) || {name:(model.regions.find(rg=>rg.id===r.id)||{}).placeName||"the aerie"}).name)).join(", ")})` : "no lane worth the lift"; })()],
        ["the dominion", model.dominion ? `arrived ${1000 + 25 * model.dominion.arrived}: ${model.regions.filter(r => r.occupied).length} regions occupied` : "beyond the horizon, this age"],
        ["the powers", (() => { const c = model.regions.filter(r => r.concession).length, a = model.regions.filter(r => r.concessionEnded).length; return `${esc(model.metropole || "?")} courts · ${esc(model.rival || "?")} rivals` + (c ? ` · ${c} concession${c > 1 ? "s" : ""}` : "") + (a ? `${c ? "," : " ·"} ${a} wound up` : "") + (!c && !a ? " · reach, not a landing, this age" : ""); })()],
        ["rank-size", (() => { const F5 = getFindings(model); return F5.zipf ? `α ${F5.zipf.alpha.toFixed(2)} · tail fit ${F5.zipf.tail_r2.toFixed(2)} · primacy ${F5.zipf.primacy}×` : "too few towns to fit"; })()],
        ["richest lode", Math.max(...model.regions.map(r => r.endowment)) + " (endowment)"],
        ["CRS", "planar 0–1600 × 0–1000 (y-up)"]
      ];
      document.getElementById("info").innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
      document.getElementById("powersPanel").innerHTML = powersHTML(model);
      document.getElementById("instPanel").innerHTML = institutionsHTML(model);
    }

    // ---- The inspector (U2): one click, the whole ledger ---------------------
    let inspectId = -1, pinArm = false;
    // U3: the SELECTED FEATURE — a ridge, river, pass, or wild-layer glyph the
    // reader clicked. Mutually exclusive with a region: clicking a feature shows
    // its own card, clicking a region (or dead water) clears it. {kind, id}.
    let selFeat = null;

    // U3: the feature card — a ridge/river/pass/port/etc reads its own data.
    // Returns true if it painted a feature (so renderInspector can return early).
    function renderFeatureCard() {
      const card = document.getElementById("inspector");
      if (!selFeat || !model) return false;
      const row = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
      const yr = (e) => 1000 + 25 * e;
      const townAt = (idx) => (model.settlements.find(s => s.regionId === model.regions[idx].id) || { name: model.regions[idx].placeName || "open country" }).name;
      let name = "", sub = "", L = [];
      if (selFeat.kind === "ridge") {
        const R = model.ridges.find(r => r.id === selFeat.id); if (!R) { selFeat = null; return false; }
        const myPasses = model.passes.filter(p => p.ridgeId === R.id);
        const spurs = model.ridges.filter(r => r.isSpur).length;
        name = `${R.name} ${R.kind}`;
        sub = `mountain range · ${R.isSpur ? "spur" : "main range"} #${R.id}`;
        L.push(`<div class="insp-sec">THE RANGE</div><table>` +
          row("grade", `${R.kind} · peak elevation ${R.maxElev}`) +
          row("form", `${R.pts.length}-node crest${R.isSpur ? " (a spur off a main range)" : ""}`) +
          row("passes", myPasses.length ? myPasses.map(p => esc(p.name || "an unnamed pass")).join(" · ") : "no pass crosses it, a full wall") +
          `</table>`);
        if (spurs && !R.isSpur) L.push(`<div class="insp-ev">the realm's ranges throw ${spurs} spur${spurs === 1 ? "" : "s"} between them</div>`);
      } else if (selFeat.kind === "river") {
        const RV = model.rivers.find(r => r.id === selFeat.id); if (!RV) { selFeat = null; return false; }
        const chainLen = model.regions.filter(r => r.riverId === RV.id).length;
        const into = RV.confluenceInto !== undefined && RV.confluenceInto >= 0 ? (model.rivers.find(r => r.id === RV.confluenceInto) || {}).name : null;
        const mouthReg = RV.chain && RV.chain.length ? model.regions[RV.chain[RV.chain.length - 1]] : null;
        name = RV.kind === "River" ? "the " + RV.name : `${RV.name} ${RV.kind}`;
        sub = `watercourse · ${RV.kind.toLowerCase()} #${RV.id}`;
        L.push(`<div class="insp-sec">THE WATER</div><table>` +
          row("grade", `${RV.kind} · ${chainLen} region${chainLen === 1 ? "" : "s"} on its course`) +
          row("joins", into ? `flows into the ${esc(into)}` : "runs its own course to the sea or a lake") +
          (mouthReg ? row("mouth", `reaches ${mouthReg.onCoast === 1 ? "the coast" : "still water"} at ${townAt(RV.chain[RV.chain.length - 1])}`) : "") +
          `</table>`);
      } else if (selFeat.kind === "pass") {
        const p = model.passes[selFeat.id]; if (!p) { selFeat = null; return false; }
        const R = model.ridges.find(r => r.id === p.ridgeId);
        name = p.name || "the pass";
        sub = `mountain pass${R ? " through the " + R.name + " " + R.kind : ""}`;
        L.push(`<div class="insp-sec">THE CROSSING</div><table>` +
          row("through", R ? `${R.name} ${R.kind} (peak ${R.maxElev})` : "a range") +
          row("worth", "the one gap an army or a caravan takes instead of the wall") +
          row("held by", p.heldBy && p.heldBy !== "none" ? p.heldBy : "no one, a free crossing") +
          `</table>`);
      } else {
        // wild-layer point features: {kind, id} where id indexes the model array
        const F = FEATURE_META[selFeat.kind];
        const item = F.get(selFeat.id); if (!item) { selFeat = null; return false; }
        name = F.name(item); sub = F.sub(item);
        L.push(`<div class="insp-sec">${F.cap}</div><table>${F.rows(item, row)}</table>`);
      }
      card.style.display = "block";
      document.getElementById("inspName").textContent = name;
      document.getElementById("inspSub").textContent = sub;
      document.getElementById("inspBody").innerHTML = L.join("");
      return true;
    }

    // per-kind readers for the wild-layer point features (ports, bridges, ruins,
    // deadholds, towers, shrines, the maelstrom). get() returns the datum; the
    // rest read its fields for the card.
    const FEATURE_META = {
      port: { get: (i) => model.regions.filter(r => r.isPort === 1)[i],
        name: (r) => harborName((model.settlements.find(s => s.regionId === r.id) || { name: r.placeName }).name), sub: () => "port · where the realm meets the water", cap: "THE HARBOR",
        rows: (r, row) => row("held by", r.heldBy || "no one") + row("sea reach", `${r.seaAccess}`) },
      bridge: { get: (i) => model.bridges[i],
        name: (b) => `${(model.settlements.find(s => s.regionId === model.regions[b.regionIdx].id) || { name: model.regions[b.regionIdx].placeName }).name} Bridge`, sub: (b) => `span over the ${(model.rivers.find(r => r.id === b.riverId) || {}).name || "river"}`, cap: "THE SPAN",
        rows: (b, row) => row("held by", b.heldBy || "no one") + row("worth", "a gate on the river: whoever holds it holds the crossing") },
      tower: { get: (i) => model.regions.filter(r => r.hasTower === 1)[i],
        name: (r) => `${(model.settlements.find(s => s.regionId === r.id) || { name: r.placeName }).name} Tower`, sub: () => "apostate tower · out where no writ runs", cap: "THE TOWER",
        rows: (r, row) => row("stands where", "governance failed and the grid never came") },
      ruin: { get: (i) => model.ruins[i],
        name: (r) => `the ${r.type} ${r.name}`, sub: (r) => `ruin (${r.type}) · the past on the land`, cap: "THE RUIN",
        rows: (r, row) => row("peril / yield", `${r.peril} / ${r.yield}`) + row("kind", r.type === "delve" ? "old workings, still worth the digging" : r.type === "tomb" ? "a barrow best left shut" : "a deadhold, poisoned before living memory") },
      deadhold: { get: (i) => model.regions.filter(r => !r.settled && r.abandonedEpoch >= 0)[i],
        name: (r) => "the ruins of " + (r.placeName || "a forgotten hold"), sub: (r) => `deadhold · a town that emptied in ${1000 + 25 * r.abandonedEpoch}`, cap: "THE DEADHOLD",
        rows: (r, row) => row("fell", `${1000 + 25 * r.abandonedEpoch}`) + row("rebirths", r.rebirths ? `came back ${r.rebirths}× before` : "never came back") + row("the ground", "still what it was, only the people are gone") },
      sanct: { get: (i) => model.sanctionedSites[i],
        name: (s) => `the shrine ${s.name}`, sub: () => "sanctioned site · holy ground", cap: "THE SHRINE",
        rows: (s, row) => row("consecrated", "where the Temple planted its standard, often after the harm") },
      maelstrom: { get: () => model.maelstrom,
        name: (m) => m.name, sub: () => "the maelstrom · a turning of the sea", cap: "THE MAELSTROM",
        rows: (m, row) => row("side", `the ${m.side} water`) + row("sailors", "they shun it, and ports keep clear of its reach") }
    };

    function renderInspector() {
      const card = document.getElementById("inspector");
      if (selFeat && renderFeatureCard()) return; // U3: a feature is selected
      if (inspectId < 0 || !model || inspectId >= model.regions.length) { card.style.display = "none"; return; }
      card.style.display = "block"; // the stylesheet hides it; inline must override
      const reg = model.regions[inspectId];
      const st = model.settlements.find(s => s.regionId === reg.id);
      const yr = (e) => 1000 + 25 * e;
      // living world: a dead zone is LAND with no town. It has no settlement, so
      // the society sections (which read `st`) do not apply — show the ground and
      // its story instead of crashing on a missing settlement.
      if (!st) {
        document.getElementById("inspName").textContent = reg.placeName || "open country";
        document.getElementById("inspSub").textContent = `dead zone · region #${reg.id} · ${reg.biome}`;
        const drow = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
        const D = [`<div class="insp-sec">THE LAND</div><table>` +
          drow("elevation / rugged", `${reg.elevation} / ${reg.ruggedness}`) +
          drow("climate", `temp ${reg.temperature} · rain ${reg.rainfall} · fertility ${reg.fertility}`) +
          drow("livability", `${reg.livability !== undefined ? reg.livability : 0} · the land could hold life, but no one holds it`) +
          drow("ore", `${reg.E} in the ground${reg.exhausted ? " · DEAD LODE" : ""}`) +
          `</table>`];
        D.push(`<div class="insp-sec">THE GHOST COUNTRY</div><div class="insp-ev">` +
          (reg.abandonedEpoch >= 0 ? `a town stood here and emptied in <b>${yr(reg.abandonedEpoch)}</b>${reg.rebirths ? `. It had come back ${reg.rebirths}× before` : ""}. The ground is still what it was; only the people are gone.` : `no one ever settled this ground.`) +
          `</div>`);
        const dev = model.events.filter(ev => ev.region_id === reg.id);
        if (dev.length) D.push(`<div class="insp-sec">ITS STORY</div>` +
          dev.map(ev => `<div class="insp-ev"><b>${yr(ev.epoch)}</b>: ${ev.name && ev.name.startsWith("the ") ? ev.name : ev.type.replace(/_/g, " ")}</div>`).join(""));
        document.getElementById("inspBody").innerHTML = D.join("");
        return;
      }
      document.getElementById("inspName").textContent = st.name + (reg.epithet ? ", " + reg.epithet : "");
      document.getElementById("inspSub").textContent =
        `${reg.tier} · ${reg.siteCharacter} · region #${reg.id} · ${reg.biome}${reg.occupied ? " · OCCUPIED" : ""}`;
      const row = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
      const L = [];
      L.push(`<div class="insp-sec">THE LAND</div><table>` +
        row("elevation / rugged", `${reg.elevation} / ${reg.ruggedness}`) +
        row("climate", `temp ${reg.temperature} · rain ${reg.rainfall} · fertility ${reg.fertility}`) +
        row("ore", `${reg.E} in the ground (founded ${reg.endowment0})${reg.exhausted ? " · DEAD LODE" : ""}`) +
        row("features", [reg.onRiver === 1 ? "river" : "", reg.onCoast === 1 ? "coast" : "", reg.isPass === 1 ? "pass" : "", reg.rangeShadow === 1 ? "mountain shadow" : "", reg.aquifer === 1 ? "aquifer" : "", reg.stillair === 1 ? "STILLAIR (no lift)" : ""].filter(Boolean).join(" · ") || "open country") +
        row("founded", `${(reg.era || "").replace(/_/g, " ")} · age ${reg.foundingAge} · legacy ${reg.legacy}`) +
        `</table>`);
      L.push(`<div class="insp-sec">THE COIN</div><table>` +
        row("wealth", `${reg.wealth} (founded ${reg.wealthT0}, peak ${reg.peakWealth})`) +
        row("keeps", `${reg.retention} of every 100 it makes`) +
        row("tariffs", reg.tollBurden > 0 ? `${reg.tollBurden} at gates it never chose` : "pays no gate") +
        // B6 (#128): the crossing this town keeps (if any) — sound, decaying, or rotted —
        // and the friction it PAYS for others' rotted spans on its road to market
        (reg.crossingCondition !== null && reg.crossingCondition !== undefined
          ? row("crossing", `its ${reg.crossingType} is ${reg.crossingCondition >= 0.85 ? "sound" : reg.crossingCondition >= 0.4 ? "decaying" : "rotted"} (${Math.round(reg.crossingCondition * 100)}% kept, ${reg.crossingHeldBy && reg.crossingHeldBy !== "none" ? "tariffs fund upkeep" : "no tariff funds it"})`)
          : "") +
        (reg.crossFriction > 0 ? row("rotted road", `+${reg.crossFriction} trade friction from decayed spans between it and the market`) : "") +
        (model.dominion ? row("tribute", `${reg.occupied ? 3 : (reg.bloc === "crown" ? 1 : 2)} per year to the Dominion`) : "") +
        row("reach", `market ${reg.marketAccess} · sea ${reg.seaAccess} · capital ${reg.centrality} · sky +${reg.skyAdvantage}%`) +
        `</table>`);
      { // #93: THE DRIFT — the region's history drawn, cursor on the scrubbed epoch
        const snaps = model.epochSnaps || [];
        if (snaps.length > 1) {
          const ser = (k) => snaps.map(S => S[k][reg.id]);
          const cur = Math.min(scrubEpoch, snaps.length - 1);
          const dRow = (label, k) => { const s = ser(k); return row(label, `${sparkSVG(s, cur)} ${s[0]} → ${s[s.length - 1]}`); };
          const wSer = ser("wealth");
          const peakE = wSer.indexOf(Math.max(...wSer));
          const eSer = ser("eliteShare");
          const dElite = eSer[eSer.length - 1] - eSer[0];
          L.push(`<div class="insp-sec">THE DRIFT</div><table>` +
            dRow("wealth", "wealth") +
            dRow("artifice", "A") + // B1: the growth channel drawn — where the works learned or forgot
            dRow("owners' share", "eliteShare") +
            dRow("souls", "pop") +
            dRow("blight", "blight") +
            // B3 (#125): the diaspora, drawn only where it exists — the emigration
            // era reads as a souls dip against a wealth floor the remittances hold.
            ((reg.emigrantsTotal || 0) > 0 ? dRow("emigration", "emig") + dRow("remittances", "remit") : "") +
            row("trajectory", `${reg.boomBust} · peaked ${1000 + 25 * peakE} at wealth ${wSer[peakE]} · owners' row ${dElite >= 0 ? "+" : ""}${dElite} since founding` +
              ((reg.emigrantsTotal || 0) > 0 ? ` · ${reg.emigrantsTotal} gone to the metropole, ${reg.remittanceTotal} coin sent home` : "")) +
            `</table>`);
        }
      }
      L.push(`<div class="insp-sec">THE TWO ROWS</div><table>` +
        row("the owners", `${reg.elitePopPct} in 100 people hold ${reg.eliteShare} of every 100 coins`) +
        row("the gap", `an owner lives ${reg.classGap}× better than a laborer here`) +
        ((reg.structures || []).includes("counting_house")
          ? row("why", reg.A - reg.A0 > 3
              // B2 (#124): the counting house has two edges. It intermediates
              // world capital into the local works — and whether that reads as
              // development finance or comprador extraction is a fact about THIS
              // town's history, not a verdict: did the works actually grow?
              ? `development finance: the counting house built the aetherworks here (artifice ${reg.A0}→${reg.A}). It still banks +6 to the owners' row`
              : `comprador extraction: the counting house banks the town's coin to the owners' row (+6), the aetherworks no richer for it (artifice ${reg.A0}→${reg.A})`)
          : "") +
        `</table>`);
      // #93: read the bloc dynamism as the oligarchy story, not just the current
      // ruler — ground that changed hands is where the compounding of power shows
      const rulesStr = (reg.occupied ? "the Dominion" : reg.bloc) +
        (reg.blocChanges > 0 ? ` · changed hands ${reg.blocChanges}× as the balance shifted` : reg.bloc === "contested" ? " · still contested" : "");
      L.push(`<div class="insp-sec">THE STATE</div><table>` +
        row("who rules", rulesStr) +
        row("the grid", reg.onConduit ? `on the grid · services ${reg.arcaneServices}` : `OFF THE GRID · access ${reg.conduitAccess}`) +
        row("order", `${reg.security} · force ${reg.forceProjection} · shadow ${reg.smuggling}`) +
        `</table>`);
      L.push(`<div class="insp-sec">THE PEOPLE</div><table>` +
        row("souls", `${reg.population.toLocaleString("en-US")} (founded ${Math.round(reg.popT0 * (1 + reg.rural)).toLocaleString("en-US")}) · ${reg.boomBust}`) +
        row("health", `burden ${reg.burden}/1k = ${reg.burdenEnv} poison + ${reg.burdenWater} water + ${reg.burdenUnmet} unmet`) +
        row("care", `healer reach ${reg.healingReach} · safe water ${reg.safeWater} · fragility ${reg.vulnerability}`) +
        row("standing", `trust ${reg.socialTrust} · mobility ${reg.mobility} · uncounted ${reg.uncounted.toLocaleString("en-US")}`) +
        `</table>`);
      const stands = [];
      // #91: the institutions lead — they are what the town IS, with the
      // counting house carrying its mechanism so the cause is never silent
      const STRUCT_TELL = {
        counting_house: "a counting house: it intermediates world capital into the aetherworks, and banks its cut to the owners' row (+6 elite share)",
        temple: "a temple", keep: "a keep", guildhall: "a guildhall",
        library: "a library", market: "a market", tavern: "a tavern"
      };
      (reg.structures || []).forEach(t => { if (STRUCT_TELL[t]) stands.push(STRUCT_TELL[t]); });
      if (reg.refining > 0) stands.push("the aetherworks");
      if (reg.isPort === 1) stands.push(harborName(st.name));
      if (reg.isFreeport === 1 && model.freeport) stands.push(`${model.freeport.name} (freeport, no writ runs here)`);
      if (reg.hasSanctuary === 1 && model.sanctuary) stands.push(`${model.sanctuary.name} (unsanctioned)`);
      for (const cp of model.camps) if (cp.regionId === reg.id) stands.push(`${cp.name} (hunters)`);
      if (reg.isSkyport === 1) stands.push(`${st.name} Aerie`);
      if (reg.hasTower === 1) stands.push(`${st.name} Tower (apostate)`);
      if (reg.hasBridge === 1) stands.push(`${st.name} Bridge`);
      for (const r of model.ruins) if (model.regions[r.regionIdx].id === reg.id) stands.push(`the ${r.type} ${r.name}`);
      for (const s2 of model.sanctionedSites) if (s2.regionId === reg.id) stands.push(`the shrine ${s2.name}`);
      for (const g of model.garrisons) if (g.regionId === reg.id) stands.push("a constabulary");
      if (stands.length) L.push(`<div class="insp-sec">WHAT STANDS HERE</div><div class="insp-ev">${stands.join(" · ")}</div>`);
      // the gates on its road to the seat
      if (!model._seatRun) {
        const seatIdx = model.regions.findIndex(r => r.isCapital);
        model._seatRun = costDistances(model.regions, [seatIdx]);
      }
      {
        const held = new Map();
        model.holdings.forEach(h => { if (h.heldBy !== "none") held.set(h.regionIdx, h.heldBy); });
        const gates = [];
        let cur = inspectId;
        while (model._seatRun.parent[cur] !== -1) {
          cur = model._seatRun.parent[cur];
          if (held.has(cur)) gates.push(`${(model.settlements.find(s => s.regionId === model.regions[cur].id) || {name: model.regions[cur].placeName || "the gate"}).name} (${held.get(cur)})`);
        }
        if (gates.length) L.push(`<div class="insp-sec">THE ROAD TO THE CAPITAL</div><div class="insp-ev">pays at ${gates.join(", ")}</div>`);
      }
      const evs = model.events.filter(ev => ev.region_id === reg.id);
      if (evs.length || reg.occupiedEpoch !== -1) {
        L.push(`<div class="insp-sec">ITS STORY</div>` +
          evs.map(ev => `<div class="insp-ev"><b>${yr(ev.epoch)}</b>: ${ev.name && ev.name.startsWith("the ") ? ev.name : ev.type.replace(/_/g, " ")}${ev.outcome ? " (" + ev.outcome + ")" : ""}${ev.faction ? " (" + ev.faction + ")" : ""}</div>`).join("") +
          (reg.occupiedEpoch !== -1 && !reg.occupied ? `<div class="insp-ev"><b>freed</b>: threw the Dominion out</div>` : ""));
      }
      document.getElementById("inspBody").innerHTML = L.join("");
    }

    // ---- The counterfactual (C1) ---------------------------------------------
    // One button re-runs THIS world with lambda = 0 and puts the two
    // injustice maps side by side. Built on stage-3 purity: run the
    // alternate, extract plain numbers, restore the real world — the
    // export is byte-identical before and after.
    let cfOn = false, cfMode = "db";
    const CF_MODES = {
      db:   { over: (p) => ({ ...p, db: 0 }),        capR: "DISPERSED (spoil spread, none aimed): injustice",
              already: (p) => p.db < 34,
              note: `This world already disperses its spoil (doctrine below concentrate): the blight falls where the wind and the water carry it, with no hand aiming it. Concentrate or treat to see what a doctrine adds.` },
      gt:   { over: (p) => ({ ...p, gt: 0 }),        capR: "THE FULL GRID (threshold 0): injustice",
              already: (p) => p.gt === 0,
              note: `This world already wires everyone (threshold 0): the grid is a right, not a return. Raise the grid threshold to see what the ledgers withhold.` },
      both: { over: (p) => ({ ...p, db: 0, gt: 0 }), capR: "BOTH MERCIES (dispersed, threshold 0): injustice",
              already: (p) => p.db < 34 && p.gt === 0,
              note: `This world already runs on both mercies. There is nothing left to forgive it.` }
    };
    function cfPaneSVG(vals) {
      const parts = [`<svg viewBox="0 0 ${WX} ${WY}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">`];
      model.regions.forEach((reg, i) => {
        const d = "M" + reg.ring.map(p => `${p[0].toFixed(1)},${fy(p[1]).toFixed(1)}`).join("L") + "Z";
        parts.push(`<path d="${d}" fill="${rampColor(RAMPS.injustice, vals[i])}" stroke="#40352a" stroke-width="1.2"/>`);
      });
      model.seaShapes.forEach(S => {
        const sub = (rg) => "M" + rg.map(pt => `${pt[0].toFixed(1)},${fy(pt[1]).toFixed(1)}`).join("L") + "Z";
        parts.push(`<path d="${[S.outer, ...S.holes].map(sub).join(" ")}" fill-rule="evenodd" fill="#4a7fae" fill-opacity="0.55" stroke="#2b5f8a" stroke-width="1.5"/>`);
      });
      model.ridges.forEach(R => {
        const pl = R.pts.map(p => `${p[0].toFixed(1)},${fy(p[1]).toFixed(1)}`).join(" ");
        parts.push(`<polyline points="${pl}" fill="none" stroke="#5b4a33" stroke-width="5" opacity="0.5"/>`);
      });
      parts.push(`</svg>`);
      return parts.join("");
    }
    function updateCf() {
      const box = document.getElementById("cfBox");
      box.style.display = cfOn ? "" : "none";
      if (!cfOn) return;
      const note = document.getElementById("cfNote");
      const grid = document.getElementById("cfGrid");
      const stats = document.getElementById("cfStats");
      const MODE = CF_MODES[cfMode];
      if (MODE.already(params)) {
        note.innerHTML = MODE.note;
        grid.style.display = "none"; stats.innerHTML = "";
        return;
      }
      note.innerHTML = "";
      grid.style.display = "";
      // the alternate world: identical in everything but the policy
      const cfModel = applyAttributes(topology, MODE.over(params), geo);
      const cfVals = cfModel.regions.map(r => (r.blight / 100) * (1 - r.wealth / 100));
      const cfF = computeFindings(cfModel);
      const cfPlagues = cfModel.events.filter(ev => ev.type === "blight_plague").length;
      const cfDark = cfModel.regions.filter(r => !r.onConduit).length;
      // restore the world as rolled (stage 3 is pure: byte-identical)
      model = applyAttributes(topology, params, geo);
      const asVals = model.regions.map(r => (r.blight / 100) * (1 - r.wealth / 100));
      const asF = getFindings(model);
      const asPlagues = model.events.filter(ev => ev.type === "blight_plague").length;
      const asDark = model.regions.filter(r => !r.onConduit).length;
      document.getElementById("cfCapL").innerHTML = `AS ROLLED (${model.disposalDoctrine}, threshold ${params.gt}): injustice`;
      document.getElementById("cfCapR2").innerHTML = MODE.capR;
      document.getElementById("cfLeft").innerHTML = cfPaneSVG(asVals);
      document.getElementById("cfRight").innerHTML = cfPaneSVG(cfVals);
      const dRatio = Math.round((asF.blight_ratio - cfF.blight_ratio) * 10) / 10;
      const dDark = asDark - cfDark;
      const verdict = cfMode === "gt"
        ? (dDark > 0
          ? `The charter alone lights <b>${dDark} settlement${dDark === 1 ? "" : "s"}</b> the ledgers left in darkness. <b>The gap between these maps is a policy.</b>`
          : `The ledgers already reached everyone here; the charter would change nothing. Luck, not virtue.`)
        : cfMode === "both"
        ? `Both mercies together: <b>${dRatio > 0 ? dRatio + "&times; less blight on the poorest fifth" : "the blight unchanged"}</b> and <b>${dDark > 0 ? dDark + " settlements lit" : "the grid unchanged"}</b>. <b>The gap between these maps is a policy.</b>`
        : dRatio > 0
        ? `The doctrine alone puts <b>${dRatio}&times; extra blight</b> on the poorest fifth, over the dispersed spread the wind and water would have made. <b>The gap between these maps is a policy.</b>`
        : `In this world the dispersed spread already found the poor; the doctrine moved little the terrain had not. That kind of innocence is luck, not virtue. A doctrine can also land the poison on the RICH, where the ratio reads the other way.`;
      stats.innerHTML = verdict +
        `<table><tr><th></th><th>as rolled</th><th>the counterfactual</th></tr>` +
        `<tr><td>poorest fifth's blight vs richest's</td><td><b>${asF.blight_ratio}&times;</b></td><td><b>${cfF.blight_ratio}&times;</b></td></tr>` +
        `<tr><td>settlements off the grid</td><td>${asDark}</td><td>${cfDark}</td></tr>` +
        `<tr><td>plagues in the record</td><td>${asPlagues}</td><td>${cfPlagues}</td></tr>` +
        `<tr><td>gini at the close</td><td>${asF.gini.toFixed(2)}</td><td>${cfF.gini.toFixed(2)}</td></tr></table>`;
    }

    // ---- State + recompute orchestration ------------------------------------
    let params = { ...DEFAULTS };
    let topology = null;   // regions with geology baked in (stages 1+2)
    let geo = null;        // world-level geology (wind)
    let model = null;
    let view = "wealth";   // A3 (#120, decision 3): boot into the neutral coin, not a verdict
    let mapMode = "data";  // #63: atlas = the pen's map, data = the lens; render-only
    let showPoi = true;    // #63: data mode files the gazetteer under one checkbox
    // #63 wants the numbers hover-only in data mode; the suite counts them,
    // so the flag stays true until the hover layer lands
    const SHOW_NUMBERS = true;
    let scrubEpoch = 0;    // preview-only: which epoch the map shows

    // ---- The camera (#116/#117): the main map's viewBox becomes a pan/zoom rect
    // over the world [0,W]². It is a module-level value, so it survives render()'s
    // innerHTML rebuilds untouched; the counterfactual panes (cfPaneSVG) carry no
    // #map and keep their whole-world framing. Click math moved to
    // getScreenCTM().inverse(), so any viewBox is correct — the old square-box
    // invariant is retired.
    let cam = null;                 // {x,y,w,h} in SVG user space (= the viewBox), null before first frame
    let _pendingCam = null;         // {x,y,z} parsed from a cam= hash, materialized once the box is known
    const CAM_MAX_ZOOM = 16;        // deepest zoom: viewBox = contain / 16
    const CAM_SLOP = 5;             // px: sub-threshold pointer travel stays a click (inspect/pin unharmed)
    let suppressClick = false;      // a pan just ended on this pointer — swallow the click it spawns
    const _ptrs = new Map();        // live pointers (id -> {x,y}) for pan + pinch
    let _drag = null;               // active one-finger pan
    let _pinch = null;              // active two-finger zoom
    let _settleTimer = null;

    function mapSvg() { const s = document.getElementById("stage"); return s ? s.querySelector("#map") : null; }
    function mapBox() {
      const svg = mapSvg();
      if (!svg || typeof svg.getBoundingClientRect !== "function") return null;
      const b = svg.getBoundingClientRect();
      return (b && b.width > 0 && b.height > 0) ? b : null;
    }
    // the pixel box's aspect (h/w); 1 (square) when unmeasurable — jsdom, or before
    // the first paint. The plate is CSS-square, so this is ~1 in the browser too.
    function camAspect() { const b = mapBox(); return b ? b.height / b.width : 1; }
    // the smallest viewBox at the box's aspect that shows the whole world — min zoom.
    function camContain() {
      const a = camAspect();               // viewport h/w
      const worldA = WY / WX;              // the world's own h/w (0.625 at 16:10)
      let w, h;
      if (a >= worldA) { w = WX; h = WX * a; }  // viewport taller than the world → fit width, mat top/bottom
      else { h = WY; w = WY / a; }              // viewport wider → fit height, mat left/right
      return { x: (WX - w) / 2, y: (WY - h) / 2, w, h };
    }
    // the default: the world fills the viewport WIDTH (a wider box then pans N–S).
    function camFitWidth() { return clampRect({ x: 0, y: 0, w: WX, h: WX * camAspect() }); }
    function clampRect(c) {
      const contain = camContain();
      c.w = Math.min(c.w, contain.w);
      c.h = Math.min(c.h, contain.h);
      c.x = c.w >= WX ? (WX - c.w) / 2 : clamp(c.x, 0, WX - c.w);
      c.y = c.h >= WY ? (WY - c.h) / 2 : clamp(c.y, 0, WY - c.h);
      return c;
    }
    function clampCam() { if (cam) clampRect(cam); }
    function ensureCam() {
      if (cam) return;
      if (_pendingCam) {
        const a = camAspect(), contain = camContain();
        const w = clamp(WX / _pendingCam.z, contain.w / CAM_MAX_ZOOM, contain.w);
        cam = { x: _pendingCam.x, y: _pendingCam.y, w, h: w * a };
        clampCam();
        _pendingCam = null;
      } else {
        cam = camFitWidth();
      }
    }
    const camN = (v) => Math.round(v * 100) / 100;   // 2-dp viewBox numbers, stable strings
    function camViewBox() { ensureCam(); return `${camN(cam.x)} ${camN(cam.y)} ${camN(cam.w)} ${camN(cam.h)}`; }
    function applyCam() {   // cheap: update the live viewBox during a gesture, no full re-render
      const svg = mapSvg();
      if (svg && cam) svg.setAttribute("viewBox", camViewBox());
      updateScaleBar();
    }
    // zoom compensation for labels/glyphs: world-unit sizes × this hold screen size.
    // EXACTLY 1 at fit/contain, so the default render stays byte-for-byte unchanged.
    function labelZoom() { ensureCam(); return clamp(cam.w / WX, 1 / CAM_MAX_ZOOM, 1); }
    function camIsDefault() {
      ensureCam();
      const f = camFitWidth();
      return Math.abs(cam.x - f.x) < 0.5 && Math.abs(cam.y - f.y) < 0.5 &&
             Math.abs(cam.w - f.w) < 0.5 && Math.abs(cam.h - f.h) < 0.5;
    }
    // client (screen) px -> SVG user coords, correct under any viewBox/pan/zoom.
    // null when unavailable (jsdom, or a detached node) so callers fall back safely.
    function clientToUser(svg, clientX, clientY) {
      if (!svg || typeof svg.getScreenCTM !== "function" || typeof svg.createSVGPoint !== "function") return null;
      const m = svg.getScreenCTM();
      if (!m || typeof m.inverse !== "function") return null;
      const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
      const loc = pt.matrixTransform(m.inverse());
      return (isFinite(loc.x) && isFinite(loc.y)) ? { x: loc.x, y: loc.y } : null;
    }
    // set the viewBox width to targetW, keeping the given screen point pinned.
    function zoomToWidthAbout(svg, clientX, clientY, targetW) {
      ensureCam();
      const contain = camContain();
      targetW = clamp(targetW, contain.w / CAM_MAX_ZOOM, contain.w);
      const before = clientToUser(svg, clientX, clientY);
      const scale = targetW / cam.w;
      if (before) { cam.x = before.x - (before.x - cam.x) * scale; cam.y = before.y - (before.y - cam.y) * scale; }
      cam.w = targetW; cam.h = cam.h * scale;
      clampCam(); applyCam(); scheduleSettle();
    }
    function zoomAbout(svg, clientX, clientY, factor) { ensureCam(); zoomToWidthAbout(svg, clientX, clientY, cam.w * factor); }
    // zoom about the viewport centre — used by the HUD buttons + keyboard (no CTM
    // needed, so it works headlessly); renders synchronously since it is discrete.
    function zoomAboutCenter(factor) {
      ensureCam();
      const cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
      const contain = camContain();
      const nw = clamp(cam.w * factor, contain.w / CAM_MAX_ZOOM, contain.w);
      const scale = nw / cam.w;
      cam.w = nw; cam.h = cam.h * scale;
      cam.x = cx - cam.w / 2; cam.y = cy - cam.h / 2;
      clampCam(); camRenderNow();
    }
    function camRenderNow() { if (model) render(model, params); else applyCam(); writeHash(); }
    // debounced "semantic settle" for continuous gestures: one re-render with the
    // declutter re-run and labels/glyphs re-sized for the new zoom (§2.5 hybrid).
    function scheduleSettle() {
      if (typeof setTimeout !== "function") { if (model) render(model, params); writeHash(); return; }
      if (_settleTimer) clearTimeout(_settleTimer);
      _settleTimer = setTimeout(() => { _settleTimer = null; if (model) render(model, params); writeHash(); }, 130);
    }
    function updateScaleBar() {
      const cap = document.querySelector("#scaleBar .scale-cap");
      if (!cap || !cam) return;
      // the bar is a fixed 20% of the viewport; the world's WIDTH (WX) reads as
      // 100 leagues, so 20% of a cam.w-wide view is (20 * cam.w / WX) leagues —
      // 20 at fit-width, honest at any zoom (the fixed 16:10 world is 100 leagues across).
      const leagues = 20 * cam.w / WX;
      const nice = leagues >= 10 ? Math.round(leagues) : Math.round(leagues * 10) / 10;
      cap.textContent = `${nice} leagues`;
    }

    // ---- Map pointer wiring: pan + pinch + wheel + double-click zoom, re-bound on
    // every render (the old #map dies with the innerHTML rebuild, taking its
    // listeners). onMapClick stays on the click event so a plain tap still inspects.
    function wireMap(svg) {
      if (!svg) return;
      svg.addEventListener("click", onMapClick);
      svg.addEventListener("dblclick", onMapDblClick);
      svg.addEventListener("wheel", onMapWheel, { passive: false });
      svg.addEventListener("pointerdown", onMapPointerDown);
      svg.addEventListener("pointermove", onMapPointerMove);
      svg.addEventListener("pointerup", onMapPointerUp);
      svg.addEventListener("pointercancel", onMapPointerUp);
    }
    function onMapWheel(e) {
      e.preventDefault();
      // scroll up (deltaY<0) zooms in; about the cursor
      zoomAbout(e.currentTarget, e.clientX, e.clientY, Math.exp((e.deltaY || 0) * 0.0015));
    }
    function onMapDblClick(e) { e.preventDefault(); zoomAbout(e.currentTarget, e.clientX, e.clientY, 0.5); }
    function onMapPointerDown(e) {
      const svg = e.currentTarget;
      suppressClick = false;   // a new gesture starts clean: never let a stale flag swallow this tap
      _ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (_ptrs.size === 2) {                       // a pinch takes over from any pan
        _drag = null;
        const [a, b] = [..._ptrs.values()];
        ensureCam();
        _pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, camw0: cam.w };
        return;
      }
      if (e.pointerType === "mouse" && e.button !== 0) return;   // left button only
      ensureCam();
      _drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, camx0: cam.x, camy0: cam.y, moved: false };
      if (svg.setPointerCapture) { try { svg.setPointerCapture(e.pointerId); } catch (_) {} }
    }
    function onMapPointerMove(e) {
      if (_ptrs.has(e.pointerId)) _ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (_pinch && _ptrs.size >= 2) {
        const [a, b] = [..._ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > 0) zoomToWidthAbout(e.currentTarget, (a.x + b.x) / 2, (a.y + b.y) / 2, _pinch.camw0 * (_pinch.d0 / d));
        return;
      }
      if (!_drag || e.pointerId !== _drag.id) return;
      const b = mapBox();
      if (!b) return;
      const dx = e.clientX - _drag.x0, dy = e.clientY - _drag.y0;
      if (!_drag.moved && Math.hypot(dx, dy) <= CAM_SLOP) return;   // still a click
      _drag.moved = true;
      cam.x = _drag.camx0 - dx * cam.w / b.width;
      cam.y = _drag.camy0 - dy * cam.h / b.height;
      clampCam(); applyCam();
    }
    function onMapPointerUp(e) {
      const wasPinch = !!_pinch;
      _ptrs.delete(e.pointerId);
      if (_ptrs.size < 2) _pinch = null;
      let dragged = false;
      if (_drag && e.pointerId === _drag.id) {
        const svg = e.currentTarget;
        if (svg && svg.releasePointerCapture) { try { svg.releasePointerCapture(e.pointerId); } catch (_) {} }
        dragged = _drag.moved;
        if (dragged) suppressClick = true;   // the click this pointerup spawns is a pan artefact
        _drag = null;
      }
      if (dragged || wasPinch) scheduleSettle();
    }

    function regenerateTopology() {
      topology = buildTopology(params);
      geo = buildGeology(topology, params);   // stage 2: seed + topology only
      recomputeAttributes();
    }
    let toastT = null;
    function toast(msg) {
      let el = document.getElementById("toast");
      if (!el) { el = document.createElement("div"); el.id = "toast"; document.body.appendChild(el); }
      el.textContent = msg;
      el.classList.add("show");
      clearTimeout(toastT);
      toastT = setTimeout(() => el.classList.remove("show"), 1100);
    }
    function recomputeAttributes() {    // stage 3 only — geology untouched
      model = applyAttributes(topology, params, geo);
      scrubEpoch = params.ep;           // land on the present
      const row = document.getElementById("scrubRow");
      row.style.display = params.ep > 0 ? "" : "none";
      const sc = document.getElementById("scrub");
      sc.max = params.ep; sc.value = params.ep;
      document.getElementById("scrubVal").textContent = `${params.ep}/${params.ep}`;
      document.getElementById("timeline").innerHTML = timelineHTML(model, params);
      updateAgeLabel();
      delete model._seatRun;
      if (inspectId >= model.regions.length) inspectId = -1;
      selFeat = null; // U3: a new world invalidates any selected feature
      render(model, params);
      renderInspector();
      updateCf();
      writeHash();
      toast("world recomputed: same rock, new society"); // the rewrite is never silent
    }

    // Coalesce rapid re-render requests (view/POI/mode toggles, scrub drags)
    // into one paint per frame, so a fast drag does not rebuild the SVG dozens
    // of times. Model recompute stays synchronous; only the redraw is deferred.
    let _renderPending = false;
    function scheduleRender() {
      if (_renderPending || !model) return;
      // no frame scheduler (jsdom, old embedders): paint now, correctness
      // beats coalescing wherever there is no frame to coalesce into
      if (typeof requestAnimationFrame !== "function") { render(model, params); return; }
      _renderPending = true;
      requestAnimationFrame(() => { _renderPending = false; render(model, params); });
    }

    // ---- URL hash <-> params (shareable, reproducible worlds) ---------------
    function writeHash() {
      const p = new URLSearchParams();
      p.set("seed", params.seed);
      if (params.fate) p.set("fate", params.fate);   // off-default only (the lens= precedent)
      if (params.world && params.world !== DEFAULTS.world) p.set("world", params.world); // the Concordat era stays clean
      p.set("regions", params.regions);
      p.set("relax", params.relax);
      if (params.bias !== DEFAULTS.bias) p.set("bias", params.bias); // B10: bias retired into legacy; emit off-default only (forward-compat)
      p.set("we", params.we); p.set("wf", params.wf);
      p.set("wt", params.wt); p.set("wg", params.wg);
      p.set("gt", params.gt);
      p.set("db", params.db);
      p.set("iq", params.iq);
      if (params.order !== DEFAULTS.order) p.set("order", params.order); // B9: keep the default link clean
      if (params.openness !== DEFAULTS.openness) p.set("openness", params.openness); // B10: hb retired into openness; emit off-default only
      p.set("ep", params.ep);
      if (params.capital) { p.set("cx", round2(params.capital[0])); p.set("cy", round2(params.capital[1])); }
      // the lens and mode change what a shared map argues, so they ride along —
      // but only off-default, so stock links stay exactly as they always were
      if (view !== "wealth") p.set("lens", view);
      if (mapMode !== "data") p.set("mode", mapMode);
      // the camera rides too, off-default only (the lens= precedent): a share link
      // reproduces the exact view; a fit-width/contain view keeps the link clean.
      if (cam && !camIsDefault()) p.set("cam", `${round2(cam.x)},${round2(cam.y)},${round2(WX / cam.w)}`);
      history.replaceState(null, "", "#" + p.toString());
    }
    // lens/mode arrive OUTSIDE readHash's return shape on purpose: params stays
    // byte-compatible with every consumer; the view state applies to the DOM here
    function applyHashView() {
      const p = new URLSearchParams(location.hash.replace(/^#/, ""));
      const lens = p.get("lens");
      if (lens && LENSES[lens]) {
        view = lens;
        const r = document.querySelector(`input[name="view"][value="${lens}"]`);
        if (r) r.checked = true;
      }
      const m = p.get("mode") === "atlas" ? "atlas" : "data";
      if (m !== mapMode) {
        mapMode = m;
        document.getElementById("modeAtlas").classList.toggle("on", m === "atlas");
        document.getElementById("modeData").classList.toggle("on", m === "data");
      }
      // the camera: the hash fully drives the frame on load/hashchange. cam is
      // rebuilt from cam= (or the default) by ensureCam once the box is known.
      // (Our own writeHash uses replaceState, which never fires hashchange — so
      // interacting never round-trips back through here and resets the view.)
      const camStr = p.get("cam");
      _pendingCam = null;
      if (camStr) {
        const a = camStr.split(",").map(Number);
        if (a.length === 3 && a.every(isFinite) && a[2] > 0) _pendingCam = { x: a[0], y: a[1], z: a[2] };
      }
      cam = null;
      syncLensChip();
    }
    function readHash() {
      const h = location.hash.replace(/^#/, "");
      if (!h) return { ...DEFAULTS };
      const p = new URLSearchParams(h);
      // Empty/whitespace values fall back to the default (not the clamp minimum).
      const num = (key, def) => { const v = p.get(key); return (v != null && v.trim() !== "" && isFinite(+v)) ? +v : def; };
      const w = (key, def) => clamp(Math.round(num(key, def)), 0, 100);
      // B10 (#132): `hb` retired into `openness`. An explicit openness wins; else an
      // old hb=0 link maps forward to openness=0 (sealed); else the default (open).
      const openness = p.has("openness") ? w("openness", DEFAULTS.openness) : (p.get("hb") === "0" ? 0 : DEFAULTS.openness);
      const out = {
        seed: p.get("seed") || DEFAULTS.seed,
        fate: (p.get("fate") || DEFAULTS.fate).trim(),
        world: (p.get("world") || DEFAULTS.world).trim() || DEFAULTS.world,
        regions: clamp(Math.round(num("regions", DEFAULTS.regions)), 5, 64),
        relax: clamp(Math.round(num("relax", DEFAULTS.relax)), 0, 8),
        bias: w("bias", DEFAULTS.bias),
        we: w("we", DEFAULTS.we), wf: w("wf", DEFAULTS.wf),
        wt: w("wt", DEFAULTS.wt), wg: w("wg", DEFAULTS.wg),
        gt: w("gt", DEFAULTS.gt),
        db: w("db", DEFAULTS.db),
        iq: w("iq", DEFAULTS.iq),
        order: w("order", DEFAULTS.order),
        openness,
        hb: openness === 0 ? 0 : 1, // derived: the sealed end of openness IS the old closed harbor
        ep: clamp(Math.round(num("ep", DEFAULTS.ep)), 0, 24),
        capital: null
      };
      if (p.has("cx") && p.has("cy") && isFinite(+p.get("cx")) && isFinite(+p.get("cy")))
        out.capital = [clamp(+p.get("cx"), 0, WX), clamp(+p.get("cy"), 0, WY)];
      return out;
    }

    // ---- UI sync ------------------------------------------------------------
    function syncControls() {
      const set = (id, v) => { document.getElementById(id).value = v; };
      set("seed", params.seed); set("fate", params.fate); set("world", params.world); set("regions", params.regions); set("relax", params.relax);
      set("we", params.we); set("wf", params.wf);
      set("wt", params.wt); set("wg", params.wg); set("gt", params.gt); set("db", params.db); set("order", params.order); set("openness", params.openness); set("ep", params.ep);
      document.getElementById("regionsVal").textContent = params.regions;
      document.getElementById("relaxVal").textContent = params.relax;
      for (const kid of ["we", "wf", "wt", "wg", "gt", "iq", "order", "openness", "ep"])
        document.getElementById(kid + "Val").textContent = params[kid];
      // B4 (#126): the disposal knob reads out its DOCTRINE, not a bare number
      document.getElementById("dbVal").textContent =
        params.db + " · " + (params.db < 34 ? "disperse" : params.db < 67 ? "concentrate" : "treat");
      // the hints say what the dial does; the default says where home is
      if (!document.body.dataset.hintsStamped) {
        document.body.dataset.hintsStamped = "1";
        for (const [kid, dv] of Object.entries(DEFAULTS)) {
          const el = document.getElementById(kid);
          const row = el && el.closest ? el.closest(".row") : null;
          const hint = row ? row.querySelector(".hint") : null;
          if (hint && typeof dv === "number") hint.textContent += ` Default ${dv}.`;
        }
      }
    }

    // ---- The institutions card (#91): the record's built landscape ----------
    function institutionsHTML(model) {
      const counts = {};
      (model.structures || []).forEach(s => { counts[s.type] = (counts[s.type] || 0) + 1; });
      const ORDER = ["counting_house", "temple", "keep", "library", "guildhall", "market", "tavern"];
      const rows = ORDER.filter(t => counts[t]).map(t =>
        `<tr><td>${t.replace(/_/g, " ")}</td><td>${counts[t]}</td></tr>`).join("");
      if (!rows) return `<div class="sec-title">THE INSTITUTIONS</div><div class="insp-ev">nothing stands but huts and roads.</div>`;
      const chTowns = model.regions.filter(r => (r.structures || []).includes("counting_house"))
        .sort((a, b) => b.eliteShare - a.eliteShare);
      const st = chTowns.length ? model.settlements.find(s => s.regionId === chTowns[0].id) : null;
      return `<div class="sec-title">THE INSTITUTIONS</div><table>${rows}</table>` +
        (st ? `<div class="insp-ev">the sharpest counting-house town is <b>${esc(st.name)}</b>. The house banks the coin to the owners' row (+6 elite share).</div>` : "");
    }

    // ---- The drift (#93): a region's history as sparklines ------------------
    // Pure string builder; preserveAspectRatio=none stretches to the table cell,
    // so only shapes live inside. The gold cursor marks the scrubbed epoch.
    function sparkSVG(vals, cursor) {
      if (!vals || vals.length < 2) return "";
      const SW = 120, SH = 22, mn = Math.min(...vals), span = (Math.max(...vals) - mn) || 1;
      const X = (i) => (i / (vals.length - 1)) * SW, Y = (v) => SH - 3 - ((v - mn) / span) * (SH - 6);
      return `<svg class="spark" viewBox="0 0 ${SW} ${SH}" preserveAspectRatio="none">` +
        `<polyline points="${vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}" fill="none" stroke="#221d16" stroke-width="1.2" opacity="0.75"/>` +
        (cursor != null && cursor < vals.length ? `<line x1="${X(cursor).toFixed(1)}" y1="0" x2="${X(cursor).toFixed(1)}" y2="${SH}" stroke="#d9b96c" stroke-width="1.5"/>` : "") +
        `</svg>`;
    }

    // ---- The powers (#93): treasuries, tensions, and the gate ledger -------
    function powersHTML(model) {
      const FACTIONS = ["crown", "temple", "magnate"];
      const maxT = Math.max(...FACTIONS.map(f => model.treasuries[f]), 1);
      const holdCount = (f) => model.holdings.filter(h => h.heldBy === f).length;
      const bar = (f) => { const n = holdCount(f); return `<tr><td>${f}</td><td><span class="pw-bar"><i style="width:${Math.round(100 * model.treasuries[f] / maxT)}%; background:${BLOC_COLORS[f]}"></i></span> ${Math.round(model.treasuries[f])} coin · ${n} gate${n === 1 ? "" : "s"}</td></tr>`; };
      const TN = { crown_magnate: "crown ↔ magnate", crown_temple: "crown ↔ temple", magnate_temple: "magnate ↔ temple" };
      // war fires when a tension clears a per-world bar rolled in 55–75; the
      // gauge shades that band rather than faking a precise line
      const gauge = (k) => { const v = Math.round(model.tensions[k]); return `<tr><td>${TN[k]}</td><td><span class="pw-bar pw-tension"><i style="width:${Math.min(100, v)}%"></i></span> ${v}${v >= 55 ? " · war-ripe" : ""}</td></tr>`; };
      const ledger = model.events.filter(ev => ["war", "seizure", "treaty", "annexation"].includes(ev.type))
        .map(ev => `<div class="insp-ev"><b>${1000 + 25 * ev.epoch}</b>: ${esc(ev.name || ev.type.replace(/_/g, " "))}</div>`).join("");
      return `<div class="sec-title">THE POWERS</div><table>` +
        FACTIONS.map(bar).join("") + Object.keys(TN).map(gauge).join("") + `</table>` +
        (ledger ? `<div class="lens-cap">SEIZURES, TREATIES, WARS</div>${ledger}`
                : `<div class="insp-ev">no gate changed hands; no war came.</div>`);
    }

    // ---- The timeline (#86): the realm's ages under the scrubber -----------
    const AGE_COLORS = { accumulation: "#5a4a7a", gates: "#7a1f1f", desolation: "#4a4038", restoration: "#2f7a4a", quiet: "#cfc4a8" };
    // per-epoch between-place gini over settled wealth — the same formula the
    // findings use, kept UI-side so the exported findings blob never changes
    const giniOf = (xs) => {
      const t = xs.slice().sort((a, b) => a - b);
      const m = t.reduce((a, b) => a + b, 0) / t.length;
      if (m === 0) return 0;
      let g = 0;
      for (let i = 0; i < t.length; i++) g += (2 * (i + 1) - t.length - 1) * t[i];
      return Math.round(g / (t.length * t.length * m) * 100) / 100;
    };
    function perEpochGini(snaps) {
      return snaps.map(S => {
        const xs = S.wealth.filter((_, i) => S.pop[i] > 0);
        return giniOf(xs);
      });
    }
    function ageAt(ages, e) {
      const a = (ages || []).find(x => e >= x.from_epoch && e <= x.to_epoch);
      return a ? a.name : "";
    }
    function timelineHTML(model, params) {
      const snaps = model.epochSnaps || [];
      const N = params.ep;
      if (!N || snaps.length < 2) return "";
      const F = getFindings(model);
      const TW = 300, TH = 34, X = (e) => (e / N) * TW;
      // preserveAspectRatio=none stretches the strip to its CSS box, so only
      // shapes live inside (text would distort); words ride the <title>s
      const parts = [`<svg viewBox="0 0 ${TW} ${TH}" preserveAspectRatio="none">`];
      for (const a of (F.ages || [])) {
        // an age spans epochs [from, to] INCLUSIVE: paint through to+1 so
        // adjacent ages tile the strip with no gap (clamped at the right edge)
        const w = Math.max(Math.min(X(a.to_epoch + 1), TW) - X(a.from_epoch), 2);
        parts.push(`<rect x="${X(a.from_epoch).toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${TH}" fill="${AGE_COLORS[a.character] || "#cfc4a8"}" opacity="0.4"><title>${a.name} · ${1000 + 25 * a.from_epoch}–${1000 + 25 * a.to_epoch} · gini ${a.gini_start} → ${a.gini_end}</title></rect>`);
      }
      const gs = perEpochGini(snaps);
      const gmin = Math.min(...gs), span = (Math.max(...gs) - gmin) || 1;
      parts.push(`<polyline points="${gs.map((g, e) => `${X(e).toFixed(1)},${(TH - 5 - ((g - gmin) / span) * (TH - 12)).toFixed(1)}`).join(" ")}" fill="none" stroke="#221d16" stroke-width="1" opacity="0.7"/>`);
      for (let e = 0; e <= N; e++)
        parts.push(`<line x1="${X(e).toFixed(1)}" y1="${TH - 4}" x2="${X(e).toFixed(1)}" y2="${TH}" stroke="#5b544a" stroke-width="0.6"/>`);
      for (const ev of model.events)
        parts.push(`<rect x="${(X(ev.epoch) - 1).toFixed(1)}" y="0" width="2" height="6" fill="#c2670a"><title>${1000 + 25 * ev.epoch}: ${esc(ev.name || ev.type.replace(/_/g, " "))}</title></rect>`);
      parts.push(`</svg>`);
      return parts.join("");
    }
    function updateAgeLabel() {
      if (!model) return;
      const name = ageAt(getFindings(model).ages, scrubEpoch);
      document.getElementById("ageLabel").textContent = name ? `· ${name}` : "";
    }

    // ---- The index of plates: the lens browser, generated from LENSES ------
    // Rows are REAL name=view radios so selection keeps native radio-group
    // semantics (arrows preview lenses live); RECENT rows are plain buttons
    // that check the one real radio, so a value never exists twice as a radio.
    let recentLenses = [];
    function lensMiniHTML(id) {
      const L = LENSES[id];
      if (L.cats) return `<span class="lens-mini cats">${Object.values(L.cats).slice(0, 4).map(c => `<i style="background:${c}"></i>`).join("")}</span>`;
      const r = RAMPS[id];
      return `<span class="lens-mini" style="background:linear-gradient(to right, rgb(${r.lo.join(",")}), rgb(${r.hi.join(",")}))"></span>`;
    }
    function renderLensList() {
      const groups = [];
      const featured = Object.keys(LENSES).filter(id => LENSES[id].featured);
      if (featured.length) groups.push(["FEATURED PLATES", featured, true]);
      if (recentLenses.length) groups.push(["RECENT", recentLenses.slice(0, 5), true]);
      const byGroup = new Map();
      for (const id of Object.keys(LENSES)) {
        if (!byGroup.has(LENSES[id].group)) byGroup.set(LENSES[id].group, []);
        byGroup.get(LENSES[id].group).push(id);
      }
      for (const [g, ids] of byGroup) groups.push([g, ids, false]);
      document.getElementById("lensList").innerHTML = groups.map(([cap, ids, asButtons]) =>
        `<div class="lens-cap">${cap}</div>` + ids.map(id => asButtons
          ? `<button type="button" class="plate-row recent-row" data-lens="${id}">${lensMiniHTML(id)}<span>${LENSES[id].q}</span></button>`
          : `<label class="plate-row" data-lens="${id}"><input type="radio" name="view" value="${id}"${id === view ? " checked" : ""} />${lensMiniHTML(id)}<span>${LENSES[id].q}</span></label>`
        ).join("")).join("");
      filterLenses(document.getElementById("lensFilter").value);
    }
    function filterLenses(q) {
      q = (q || "").trim().toLowerCase();
      const list = document.getElementById("lensList");
      list.querySelectorAll(".plate-row").forEach(row => {
        const id = row.dataset.lens, L = LENSES[id];
        row.style.display = !q || id.includes(q) || L.q.includes(q) || L.group.toLowerCase().includes(q) ? "" : "none";
      });
      list.querySelectorAll(".lens-cap").forEach(cap => {
        let el = cap.nextElementSibling, any = false;
        while (el && !el.classList.contains("lens-cap")) { if (el.style.display !== "none") any = true; el = el.nextElementSibling; }
        cap.style.display = any ? "" : "none";
      });
    }
    function syncLensChip() {
      const L = LENSES[view];
      if (L) document.getElementById("lensChipQ").textContent = L.q;
    }
    function applyLens(id) {
      view = id;
      recentLenses = [id, ...recentLenses.filter(x => x !== id)].slice(0, 5);
      syncLensChip();
      writeHash();
      scheduleRender();
    }
    function setLensPanel(open) {
      document.getElementById("lensPanel").classList.toggle("open", open);
      document.getElementById("lensChip").setAttribute("aria-expanded", String(open));
      if (open) { renderLensList(); document.getElementById("lensFilter").focus(); }
      else document.getElementById("lensChip").focus();
    }

    // ---- Drawers (the shell): overlays on the plate's mat. Visibility is a
    // class on the DRAWER; renderInspector keeps owning #inspector's inline
    // display — two independent switches, so the inspector logic never changed.
    const UI_KEY = "hl.ui";
    function uiLoad() { try { return JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch (_) { return {}; } }
    function uiSave(patch) { try { localStorage.setItem(UI_KEY, JSON.stringify({ ...uiLoad(), ...patch })); } catch (_) {} }
    function setDrawer(which, open) {
      const el = document.getElementById(which === "controls" ? "drawerControls" : "drawerInspect");
      const tab = document.getElementById(which === "controls" ? "tabControls" : "tabInspect");
      el.classList.toggle("open", open);
      tab.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle(which === "controls" ? "controls-open" : "inspect-open", open);
      uiSave({ [which]: open });
    }
    function drawerOpen(which) {
      return document.getElementById(which === "controls" ? "drawerControls" : "drawerInspect").classList.contains("open");
    }

    function onMapClick(ev) {
      if (suppressClick) { suppressClick = false; return; }   // a pan ended here — not a click
      if (ev.detail && ev.detail > 1) return;                 // the 2nd tap of a double-click; onMapDblClick zooms
      const svg = ev.currentTarget;
      // click math via getScreenCTM().inverse(): correct under any viewBox (the
      // camera's pan/zoom), retiring the old linear square-box map. null headlessly.
      const loc = clientToUser(svg, ev.clientX, ev.clientY);
      if (pinArm) { // the armed pin: this click moves the seat
        pinArm = false;
        document.getElementById("pinCap").classList.remove("armed");
        if (!loc) return;
        params.capital = [clamp(round2(loc.x), 0, WX), clamp(round2(WY - loc.y), 0, WY)]; // un-flip y
        recomputeAttributes(); // society only — geology and polygons untouched
        return;
      }
      // U3: resolve the click. A direct hit on a region path (it carries its id,
      // no coords needed) inspects that region. Otherwise use the click point to
      // hit-test the FEATURES the reader can now inspect (terrain + wild layer),
      // and only then fall back to the nearest town.
      const haveXY = !!loc;
      const wx = haveXY ? loc.x : null;
      const wy = haveXY ? WY - loc.y : null;
      const feat = haveXY ? hitTestFeature(wx, wy) : null;
      if (feat) {
        selFeat = feat; inspectId = -1; // a feature card supersedes the region
      } else {
        selFeat = null;
        // U2: the region path carries its id; else nearest town by map point
        const t = ev.target && ev.target.getAttribute ? ev.target.getAttribute("data-region") : null;
        if (t !== null && t !== undefined && t !== "") {
          inspectId = +t;
        } else if (haveXY) {
          let bi = -1, bd = Infinity;
          model.regions.forEach((reg, i) => {
            const d2 = Math.hypot(reg.c[0] - wx, reg.c[1] - wy);
            if (d2 < bd) { bd = d2; bi = i; }
          });
          inspectId = bi;
        } else return; // no target and no usable coords: nothing to inspect
      }
      setDrawer("inspect", true); // the ledger slides in with its subject
      render(model, params);
      renderInspector();
    }

    // U3: find the feature nearest a click, within a pixel-ish threshold in world
    // units. POINT glyphs (passes, ports, ruins, ...) win over LINE features
    // (ridges, rivers) so clicking a pass on a ridge selects the pass; both win
    // over the region beneath. Returns {kind, id} or null.
    function hitTestFeature(wx, wy) {
      if (!model) return null;
      const atlas = mapMode === "atlas", poi = atlas || showPoi; // only what is DRAWN is clickable
      // grab radii divide by the zoom factor so targets stay screen-constant: at
      // 4× the world-unit radius is 4× smaller, i.e. the same number of pixels.
      const z = cam ? (WX / cam.w) : 1;
      const PT = 20 / z, LN = 14 / z; // points are forgiving, lines tighter
      const d2 = (x, y) => Math.hypot(x - wx, y - wy);
      let best = null, bestD = Infinity;
      const tryPt = (x, y, kind, id, r) => { const d = d2(x, y); if (d < r && d < bestD) { bestD = d; best = { kind, id }; } };
      // point features (checked first, ties broken by proximity). The wild layer
      // draws under `poi`; passes/peaks are atlas ink; ports draw always.
      model.regions.filter(r => r.isPort === 1).forEach((r, i) => tryPt(r.shorePt[0], r.shorePt[1], "port", i, PT));
      if (poi) {
        model.bridges.forEach((b, i) => tryPt(b.x, b.y, "bridge", i, PT));
        model.regions.filter(r => r.hasTower === 1).forEach((r, i) => tryPt(r.towerPt[0], r.towerPt[1], "tower", i, PT));
        model.ruins.forEach((r, i) => { const reg = model.regions[r.regionIdx]; tryPt(reg.wildPt[0], reg.wildPt[1], "ruin", i, PT); });
        model.regions.filter(r => !r.settled && r.abandonedEpoch >= 0).forEach((r, i) => tryPt(r.c[0], r.c[1], "deadhold", i, PT));
        model.sanctionedSites.forEach((s, i) => tryPt(s.x, s.y, "sanct", i, PT));
        if (model.maelstrom) tryPt(model.maelstrom.x, model.maelstrom.y, "maelstrom", 0, PT);
      }
      if (atlas) model.passes.forEach((p, i) => { const R = model.ridges.find(r => r.id === p.ridgeId); if (R && R.maxElev < 60) return; tryPt(p.x, p.y, "pass", i, PT); });
      if (best) return best; // a point glyph was hit — it wins over lines
      // line features: nearest point on the polyline. Ridges are atlas ink;
      // rivers draw in both genres.
      const nearPoly = (pts) => { let m = Infinity; for (const p of pts) { const d = d2(p[0], p[1]); if (d < m) m = d; } return m; };
      if (atlas) model.ridges.forEach(R => { const d = nearPoly(R.pts); if (d < LN && d < bestD) { bestD = d; best = { kind: "ridge", id: R.id }; } });
      model.rivers.forEach(RV => { const d = nearPoly(RV.trace || []); if (d < LN && d < bestD) { bestD = d; best = { kind: "river", id: RV.id }; } });
      return best;
    }

    // ---- Wiring -------------------------------------------------------------
    function wire() {
      const $ = (id) => document.getElementById(id);

      $("seed").addEventListener("change", (e) => { params.seed = e.target.value || DEFAULTS.seed; params.capital = null; regenerateTopology(); });
      $("diceSeed").addEventListener("click", () => {
        params.seed = makeName(mulberry32((hashStr(params.seed) ^ (params.regions << 8) ^ params.bias) >>> 0)) +
          "-" + (1000 + Math.floor((Date.now ? (Date.now() % 9000) : 0)));
        params.capital = null; syncControls(); regenerateTopology();
      });
      $("fate").addEventListener("change", (e) => { params.fate = e.target.value.trim(); regenerateTopology(); });
      $("diceFate").addEventListener("click", () => {
        // a random 5-char token, then deterministic: the luck reshuffles, the rock holds.
        // capital is untouched — fate never moves geology or the seat.
        const rr = mulberry32((hashStr(params.fate || params.seed) ^ (params.regions << 4) ^ ((Date.now ? Date.now() : 0) >>> 0)) >>> 0);
        const ch = "abcdefghijkmnpqrstuvwxyz23456789";
        let tok = ""; for (let i = 0; i < 5; i++) tok += ch[Math.floor(rr() * ch.length)];
        params.fate = tok; syncControls(); regenerateTopology();
      });
      $("world").addEventListener("change", (e) => { params.world = e.target.value.trim() || DEFAULTS.world; regenerateTopology(); });
      $("diceWorld").addEventListener("click", () => {
        // a different world history — a new regime chain and price series; the
        // rock and its names never move (the world is exogenous).
        const rr = mulberry32((hashStr(params.world) ^ (params.regions << 6) ^ ((Date.now ? Date.now() : 0) >>> 0)) >>> 0);
        const ch = "abcdefghijkmnpqrstuvwxyz23456789";
        let tok = ""; for (let i = 0; i < 6; i++) tok += ch[Math.floor(rr() * ch.length)];
        params.world = tok; syncControls(); regenerateTopology();
      });

      $("regions").addEventListener("input", (e) => { params.regions = +e.target.value; $("regionsVal").textContent = params.regions; params.capital = null; regenerateTopology(); });
      $("relax").addEventListener("input", (e) => { params.relax = +e.target.value; $("relaxVal").textContent = params.relax; regenerateTopology(); });
      for (const kid of ["we", "wf", "wt", "wg", "gt", "db", "ep"]) {
        $(kid).addEventListener("input", (e) => {
          params[kid] = +e.target.value;
          $(kid + "Val").textContent = params[kid];
          recomputeAttributes();
        });
      }

      $("diceCapital").addEventListener("click", () => {
        const reg = topology[Math.floor(Math.random() * topology.length)];
        params.capital = [round2(reg.c[0]), round2(reg.c[1])];
        recomputeAttributes();
      });

      // the index of plates: one delegated listener survives list rebuilds
      $("lensPanel").addEventListener("change", (e) => {
        if (e.target && e.target.name === "view") applyLens(e.target.value);
      });
      $("lensList").addEventListener("click", (e) => {
        const btn = e.target.closest ? e.target.closest(".recent-row") : null;
        if (!btn) return;
        const r = document.querySelector(`input[name="view"][value="${btn.dataset.lens}"]`);
        if (r) { r.checked = true; applyLens(btn.dataset.lens); }
        setLensPanel(false);
      });
      $("lensChip").addEventListener("click", () => setLensPanel(!$("lensPanel").classList.contains("open")));
      $("lensClose").addEventListener("click", () => setLensPanel(false));
      $("lensFilter").addEventListener("input", (e) => filterLenses(e.target.value));
      $("lensPanel").addEventListener("keydown", (e) => {
        if (e.key === "Escape") { setLensPanel(false); return; }
        if (e.target === $("lensFilter") && e.key === "ArrowDown") {
          const rows = [...$("lensList").querySelectorAll('input[name="view"]')]
            .filter(r => r.closest(".plate-row").style.display !== "none");
          const target = rows.find(r => r.checked) || rows[0];
          if (target) { e.preventDefault(); target.focus(); }
        } else if (e.target === $("lensFilter") && e.key === "Enter") {
          const first = [...$("lensList").querySelectorAll('input[name="view"]')]
            .find(r => r.closest(".plate-row").style.display !== "none");
          if (first) { first.checked = true; applyLens(first.value); setLensPanel(false); }
        } else if (e.key === "Enter" && e.target.name === "view") {
          setLensPanel(false);
        }
      });
      document.addEventListener("mousedown", (e) => {
        if (!$("lensPanel").classList.contains("open")) return;
        if (e.target.closest && (e.target.closest("#lensPanel") || e.target.closest("#lensChip"))) return;
        setLensPanel(false);
      });

      // #63: the mode toggle re-renders only — the model never recomputes
      const setMode = (m) => {
        if (mapMode === m) return;
        mapMode = m;
        $("modeAtlas").classList.toggle("on", m === "atlas");
        $("modeData").classList.toggle("on", m === "data");
        writeHash();
        scheduleRender();
      };
      $("modeAtlas").addEventListener("click", () => setMode("atlas"));
      $("modeData").addEventListener("click", () => setMode("data"));
      $("showPoiCk").addEventListener("change", (e) => { showPoi = e.target.checked; scheduleRender(); });

      $("iq").addEventListener("input", (e) => {
        params.iq = +e.target.value;
        $("iqVal").textContent = params.iq;
        recomputeAttributes();
      });
      $("order").addEventListener("input", (e) => { // B9 (#131): the order axis
        params.order = +e.target.value;
        $("orderVal").textContent = params.order;
        recomputeAttributes();
      });
      $("openness").addEventListener("input", (e) => { // B10 (#132): openness (hb folded in)
        params.openness = +e.target.value;
        params.hb = params.openness === 0 ? 0 : 1; // the sealed end IS the closed harbor
        $("opennessVal").textContent = params.openness;
        recomputeAttributes();
      });
      $("scrub").addEventListener("input", (e) => {
        scrubEpoch = +e.target.value;
        $("scrubVal").textContent = `${scrubEpoch}/${params.ep}`;
        updateAgeLabel();
        renderInspector(); // the drift cursor tracks the timeline
        scheduleRender();
      });

      $("dlSeries").addEventListener("click", () => {
        if (!model) return;
        const blob = new Blob([JSON.stringify(toEpochSeries(model, params), null, 2)], { type: "application/geo+json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "hinterland-epochs.geojson";
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      });

      $("pinCap").addEventListener("click", () => {
        pinArm = !pinArm;
        $("pinCap").classList.toggle("armed", pinArm);
      });

      // the camera's HUD: discrete steps (2× per press) about the viewport centre,
      // plus a reset to the default fit-width frame.
      $("camZoomIn").addEventListener("click", () => zoomAboutCenter(0.5));
      $("camZoomOut").addEventListener("click", () => zoomAboutCenter(2));
      $("camFit").addEventListener("click", () => { cam = camFitWidth(); camRenderNow(); });
      // the box aspect can only change on resize; keep the frame centred + valid
      // (the CSS-square plate makes this a no-op in practice, but tall embeds pan).
      if (typeof window !== "undefined") window.addEventListener("resize", () => {
        if (!cam) return;
        const cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
        cam.h = cam.w * camAspect();
        cam.x = cx - cam.w / 2; cam.y = cy - cam.h / 2;
        clampCam(); applyCam();
      });
      $("inspClose").addEventListener("click", () => { inspectId = -1; selFeat = null; setDrawer("inspect", false); renderInspector(); if (model) render(model, params); });

      // the shell: edge tabs toggle the drawers; open-state persists locally
      // (the hash describes the WORLD; chrome state never rides a share link)
      $("tabControls").addEventListener("click", () => setDrawer("controls", !drawerOpen("controls")));
      $("tabInspect").addEventListener("click", () => setDrawer("inspect", !drawerOpen("inspect")));
      $("ctrlClose").addEventListener("click", () => setDrawer("controls", false));
      const ui = uiLoad();
      const wide = typeof matchMedia === "function" ? matchMedia("(min-width: 1080px)").matches : true;
      setDrawer("controls", ui.controls !== undefined ? !!ui.controls : wide);
      if (ui.inspect) setDrawer("inspect", true);
      // the drawers follow the plate: scrolled into the report, they retreat
      if (typeof IntersectionObserver === "function") {
        new IntersectionObserver((es) =>
          document.body.classList.toggle("plate-away", !es[0].isIntersecting),
          { threshold: 0.12 }).observe(document.getElementById("plate"));
      }

      // ---- the keyboard grammar: one listener, guarded off every input ----
      const keyHelp = (show) => { $("keyCard").style.display = show ? "block" : "none"; };
      document.addEventListener("keydown", (e) => {
        if (e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.target.closest && e.target.closest("input,textarea,select,[contenteditable]")) return;
        if (e.key === "Escape") {
          // one layer per press: the pin, the key card, the index, the
          // selection, then the drawers — the same order a reader backs out in
          if (pinArm) { pinArm = false; $("pinCap").classList.remove("armed"); return; }
          if ($("keyCard").style.display !== "none") { keyHelp(false); return; }
          if ($("lensPanel").classList.contains("open")) { setLensPanel(false); return; }
          if (inspectId >= 0 || selFeat) { inspectId = -1; selFeat = null; setDrawer("inspect", false); renderInspector(); if (model) render(model, params); return; }
          if (drawerOpen("inspect")) { setDrawer("inspect", false); return; }
          if (drawerOpen("controls")) { setDrawer("controls", false); return; }
          return;
        }
        if (e.key === "+" || e.key === "=") {           // '=' is the unshifted '+' key
          e.preventDefault(); zoomAboutCenter(0.5);
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault(); zoomAboutCenter(2);
        } else if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
          e.preventDefault();                            // Shift+arrows pan; bare arrows stay the epoch scrub
          ensureCam();
          const sx = cam.w * 0.15, sy = cam.h * 0.15;
          if (e.key === "ArrowLeft") cam.x -= sx;
          else if (e.key === "ArrowRight") cam.x += sx;
          else if (e.key === "ArrowUp") cam.y -= sy;     // user-space up = north (fy flips y)
          else cam.y += sy;
          clampCam(); camRenderNow();
        } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && params.ep > 0) {
          e.preventDefault();
          const sc = $("scrub");
          sc.value = clamp(+sc.value + (e.key === "ArrowRight" ? 1 : -1), 0, params.ep);
          sc.dispatchEvent(new Event("input", { bubbles: true }));
        } else if (e.key === "m") {
          setMode(mapMode === "atlas" ? "data" : "atlas");
        } else if (e.key === "p") {
          const ck = $("showPoiCk");
          ck.checked = !ck.checked;
          ck.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (e.key === "c") {
          setDrawer("controls", !drawerOpen("controls"));
        } else if (e.key === "i") {
          setDrawer("inspect", !drawerOpen("inspect"));
        } else if (e.key === "l" || e.key === "/") {
          e.preventDefault();
          setLensPanel(true);
        } else if (e.key === "?") {
          keyHelp($("keyCard").style.display === "none");
        }
      });
      $("cfBtnGrid").addEventListener("click", () => {
        if (cfOn && cfMode === "gt") { cfOn = false; } else { cfOn = true; cfMode = "gt"; }
        updateCf();
        const bx2 = document.getElementById("cfBox");
        if (cfOn && typeof bx2.scrollIntoView === "function") bx2.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      $("cfBtnBoth").addEventListener("click", () => {
        if (cfOn && cfMode === "both") { cfOn = false; } else { cfOn = true; cfMode = "both"; }
        updateCf();
        const bx3 = document.getElementById("cfBox");
        if (cfOn && typeof bx3.scrollIntoView === "function") bx3.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      $("cfBtn").addEventListener("click", () => {
        if (cfOn && cfMode === "db") { cfOn = false; } else { cfOn = true; cfMode = "db"; }
        updateCf();
        const bx = document.getElementById("cfBox");
        if (cfOn && typeof bx.scrollIntoView === "function") bx.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      $("dlChron").addEventListener("click", () => {
        if (!model) return;
        const blob = new Blob([composeChronicle(model, params)], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "hinterland-chronicle.md";
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      });

      $("dlTables").addEventListener("click", () => {
        if (!model) return;
        // one click, six tables — the same blob+anchor path as every download
        for (const [fname, text] of toCsvTables(model)) {
          const blob = new Blob([text], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = fname;
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
        }
      });

      $("download").addEventListener("click", () => {
        if (!model) return;
        const blob = new Blob([JSON.stringify(toGeoJSON(model, params), null, 2)], { type: "application/geo+json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "hinterland.geojson";
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      });

      $("share").addEventListener("click", async () => {
        writeHash();
        const link = location.href;
        try { await navigator.clipboard.writeText(link); toast("Share link copied ✓"); }
        catch (_) { toast("Copy failed. The link is in the address bar"); }
      });

      window.addEventListener("hashchange", () => { params = readHash(); applyHashView(); syncControls(); regenerateTopology(); });
    }

    // ---- Boot ---------------------------------------------------------------
    function boot() {
      if (typeof d3 === "undefined" || !d3.Delaunay) {
        document.getElementById("stage").innerHTML =
          `<p class="err" style="padding:16px;max-width:60ch">Could not load the Voronoi library (d3-delaunay).
           The vendor script may have failed to load. Check that the file is deployed
           alongside the page and reload.</p>`;
        return;
      }
      renderLensList(); // the name=view radios must exist before the hash applies
      params = readHash();
      applyHashView();
      syncControls();
      wire();
      try { regenerateTopology(); }
      catch (e) {
        document.getElementById("stage").innerHTML =
          `<p class="err" style="padding:16px;max-width:60ch">Failed to generate the world.
           ${e.message || "Unknown error"}. Try changing the seed or reloading.</p>`;
      }
    }

    if (typeof document !== "undefined") boot();
