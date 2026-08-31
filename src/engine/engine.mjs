// Hinterland — procedural region-scale map generator — engine.
// Pure computation: no DOM, no rendering. Importable from Node or browser.
//

const d3 = globalThis.d3;
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    // ---- Constants ----------------------------------------------------------
    const WX = 1600, WY = 1000;   // world is [0,WX] x [0,WY], planar, y-up (16:10)
    const WDIAG = Math.hypot(WX, WY); // characteristic length for distance normalization
    const SCHEMA_VERSION = 56;   // #178: v56 redefines findings.blight_ratio over the INHABITED realm — its "poorest fifth" was 85% empty cells, which export wealth 0 and so ARE the bottom fifth — and makes it nullable where too few towns stand to rank. Same key, different population, new null: a break, not a silent move.
    // v55 (#180) redefined blight_load as an ABSOLUTE load (100 = ruined) carried as a decaying stock, where v54 normalised it to each world's own worst cell.
    const TOLL_SEAT = 15;     // toll per held chokepoint on the path to the seat
    const TOLL_PORT = 10;     // toll per held chokepoint on the path to the port
    // B6 (#128): tariffs fund the bridges. A held crossing that still collects a real
    // toll maintains itself; below UPKEEP_TOLL_MIN of the full rate (a toll amnesty
    // caps tollScale to 0.4) the fund dries up and the span DECAYS. Decay/recovery are
    // per-epoch steps on the [0,1] condition; friction rises with (1 − condition).
    const UPKEEP_TOLL_MIN = 0.7;  // the tollScale below which upkeep is no longer funded
    const DECAY_STEP = 0.22;      // condition lost per epoch by an unfunded span (rots in ~5)
    const REPAIR_STEP = 0.15;     // condition regained per epoch by a funded one
    const DECAY_FRICTION = 40;    // a fully-rotted crossing's friction surcharge on a path that needs it
    // B7 (#129): reform long edges — the delayed cost of each measure.
    const CHARTER_LOAN = 34;      // the imperial loan a grid charter draws to string the wires
    const DEBT_RATE = 0.14;       // fraction of the outstanding debt the seat services each epoch
    const DEPENDENCY_STEP = 9;    // dependency the granary breeds each epoch it runs on through peace
    const FLIGHT_STEP = 7;        // elite capital that flees a floored region each epoch after the act
    const FLY_COST = 0.3;     // skyway friction per unit distance — nothing below matters
    const FLY_BOARD = 35;     // boarding the lift-barge: the fixed price of the sky
    const OCC_R = 600;        // the Dominion's garrison line: cost-radius of the occupied zone (B0.5: ×1.334 for the 1600×1000 world)
    const SEA_L = 534;        // sea_access decay length over the cost graph (B0.5: 400 ×1.334)
    const FORD_MULT = 2.2;    // crossing a river off-bridge: wide water is a wall too
    const WILD_R = 220;       // euclidean reach of a ruin's peril / a tower's shadow (B0.5: a LOCAL euclidean peril radius, not a cost-graph reach — unscaled, like PASS_R)
    const RIVER_EDGE = 0.6;   // barge transport: river edges are cheap
    // R3 (#166): how hard the ordinary r-g gap moves the owners' row per epoch.
    // Swept against the three PRE-REGISTERED sub-targets, which BRACKET k from
    // opposite sides. Raising k widens the correct Piketty ordering (stagnant ground
    // concentrates, booming ground compresses) and lifts the no-shock distribution
    // until its central tendency is upward, which `upward_mode_absent_shocks` wants;
    // raising it further swamps the discrete shock ledger and starves the compressing
    // half, which `ordinary_two_signed` and `catastrophic_leveling_discrete` forbid.
    // 0.6 is the SMALLEST k that clears all three: below it the no-shock median sits
    // at 0 (a coin flip, not an upward mode), above it high-growth compression starts
    // falling away. The target was not moved to meet the knob.
    const R3_DRIFT_K = 0.6;
    const R3_R_BASE = 0.05;    // return on the owners' holdings per 25-year epoch at reference intensity
    const R3_YIELD_REF = 2.0;  // the holdings intensity that counts as reference (a gate plus a works)
    // #180: blight is an ABSOLUTE load now, not a share of the worst cell. It used to
    // be normalised to each world's own maximum, which made the scale's anchor a cell
    // that is uninhabited in 15 of 16 worlds (the sacrifice zone, poisoned until it
    // empties), and squeezed every inhabited place into p10 2 / median 5 / p90 13 on an
    // integer field. BLIGHT_FULL is the raw spoil load that reads as 100: land ruined.
    // One works produces SPOIL = 5*C raw units per epoch, so 1.0 is a fifth of one
    // fully-running works' output landing on a single region. Measured against the
    // engine's own output, inhabited ground then spans p10 8 / median 25 / p90 56 and
    // about 2% saturates, while the sacrifice zone (median 4.8 raw) saturates as it
    // should, because it IS ruined. This is a choice of UNIT, not of target: it fixes
    // what 100 means and gives the inhabited range about 4x the resolution.
    const BLIGHT_FULL = 3.3;
    // #180: POISON HAS A MEMORY. Until now blight was recomputed from scratch every
    // epoch out of the CURRENT works, so a closed works meant land that healed
    // instantly and completely, in a single step, which is the one thing
    // contaminated ground reliably does not do. Blight is now a STOCK: each epoch's
    // deposition settles on top of what is already there, and what is already there
    // decays. BLIGHT_RETAIN is the share surviving one 25-year epoch. Natural
    // attenuation of persistent soil and groundwater contaminants runs on decadal
    // half-lives, so a ~50-year half-life gives 0.5^(25/50) = 0.707; 0.70 is used.
    // Ruined land therefore recovers on a timescale of a century or two rather than
    // either never or overnight, and a sacrifice zone whose works have closed can be
    // resettled by people who arrive long enough after the harm.
    const BLIGHT_RETAIN = 0.70;
    // With deposition d held steady the stock settles at d / (1 - RETAIN) = 3.33 d,
    // so BLIGHT_FULL above is the old deposition ceiling of 1.0 carried onto the
    // stock's equilibrium footing. Same meaning: 100 is land ruined.
    // R5 (#168): how sharply the concentrate doctrine's residual spoil seeks poor
    // ground. It was 6, which #168 correctly calls "far beyond anything in the EJ
    // literature": at that exponent the poorest cell is weighted SIXTY-FOUR times the
    // median one, and a rule that aggressive does not model siting, it authors the
    // blight-poverty correlation the findings then report as a discovery.
    //
    // The literature says facilities go where land is cheap AND where resistance is
    // weak (Banzhaf, Ma & Timmins 2019; Banzhaf & Walsh 2008). Those are two channels,
    // each roughly unit-elastic in income, which multiply: an exponent near 2, a 4x
    // weight on the poorest ground against the median. That is the derivation.
    //
    // NOT the 1.5 the issue prescribes, and the reason is P2 rather than fit. At 1.5
    // the concentrate doctrine loses its poverty-targeting blade entirely: over the
    // suite's own 48-world doctrine sweep the most negative world reads -0.18 and
    // exactly ONE world is clearly negative, so "concentrate can put the poison on the
    // poor" stops being reachable and the knob stops having two edges. 2 is the
    // shallowest value at which both blades survive, and it is not marginal once you
    // look past the suite's own seeds: on 24 UNSEEN worlds the most negative reads
    // -0.33, and pooled over 120 worlds five are clearly negative.
    //
    // This WIDENS a pre-registered miss, deliberately. See tools/targets.mjs and
    // docs/grounding.md section 8: the negative mode was closest at the indefensible
    // exponent, and a target met by authoring its own answer is not met.
    const SITE_POV = 2;
    const RIVER_CARRY = 0.3;  // share of a riverine region's blight shipped downstream
    const RIVER_DECAY = 0.75; // per-step decay of the carried load
    // #178: THE DIFFERENTIAL EXIT. Post-siting sorting, "coming to the nuisance"
    // (Banzhaf & Walsh 2008; Banzhaf, Ma & Timmins 2019): once a nuisance is on the
    // ground, the households who can afford to leave do, and the ones who cannot
    // stay, so a blighted place gets poorer without anyone aiming poverty at it.
    // SORT_WTP is how much readier the propertied are to move than labour. Willingness
    // to pay for environmental quality is income-elastic at 0.3 to 0.6 (Kristrom &
    // Riera 1996; Hokby & Soderqvist 2003); with a coarse two-way income ratio of 3,
    // 3^0.5 = 1.73. The income ratio is an authored gesture under this file's standing
    // caveat, not an estimate.
    const SORT_WTP = 1.73;
    // The only rate. Fraction of a town's households that relocate per epoch (25 years)
    // per unit of normalised blight gap to a road-adjacent alternative. 1.0 is the
    // structural ceiling: a maximal gradient fully re-sorting the mobile stratum inside
    // one epoch. Above that the claim is incoherent, and a large enough value here
    // would simply be the poverty exponent this mechanism exists to retire, wearing a
    // new costume.
    //
    // 0.03 is NOT the value that maximises the environmental-justice effect. It is the
    // largest rate that breaks nothing this model already claimed, and the gap between
    // those two things is the finding. This channel redistributes wealth along blight
    // gradients, an axis orthogonal to the ones other claims measure, so every increment
    // of it erodes them. Two bind, measured:
    //   water access tracks prosperity (floor 12/20): base 13 | .03 12 | .05 12 | .10 11
    //   the toll wounds the taxed road (floor -0.03): base -.095 | .03 -.041 | .05 -.019
    // The toll check binds first, so 0.03 is the ceiling. At 0.03 the mechanism is close
    // to inert on the target it exists to move (blight-wealth median +0.458 to +0.432,
    // negative worlds 3/24, unchanged from baseline), and that is reported rather than
    // dressed up: a response-side channel cannot outrun the upstream problem, which is a
    // blight field the max-normalisation flattens to p10 2 / median 6 / p90 12 with its
    // worst cell abandoned. See #178 and grounding.md section 8.
    // The alternative was to re-pin the toll floor so a stronger rate fit. That is the
    // one move this repo's discipline forbids, since a pin set by observing output can
    // never fail. If -0.03 is the wrong floor, that is a separate argument.
    const SORT_CHURN = 0.03;
    const RIDGE_WALL = 4.5;  // edge-cost multiplier for crossing a ridge off-pass
    const PASS_MULT = 1.4;   // crossing at a pass: a climb, not a wall
    const PASS_R = 90;       // how close a crossing must be to a pass to count as one (B0.5: a LOCAL crossing tolerance, not a reach — unscaled)
    const BLOC_TOL = 12;    // top-two reach gap below this => contested
    const BLOC_FLOOR = 25;  // all reaches below this => ungoverned
    const FRICTION = 1.5;  // how much ruggedness multiplies travel cost

    const DEFAULTS = {
      seed: "hinterland", fate: "", ch: "", world: "concordat-settlement", regions: 24, relax: 2, bias: 80,
      we: 35, wf: 25, wt: 30, wg: 10,   // income-mix weights
      gt: 35,                            // grid threshold (0 = conduit reaches everyone)
      db: 60,                            // disposal doctrine: 0–33 disperse, 34–66 concentrate, 67–100 treat
      iq: 45,                            // the seat's ear (P(reform); default = the old dice)
      order: 50,                         // B9 (#131): the order axis (0 open ↔ 100 police state); 50 = neutral (the old world)
      openness: 100,                     // B10 (#132): foreign trade/diplomacy exposure (0 sealed ↔ 100 open); default open. hb=0 maps to openness=0
      hb: 1,                             // B10 (#132): RETIRED into openness (parse-only, for forward-compat of old links)
      ep: 0,                             // epochs (0 = founding snapshot, no dynamics)
      capital: null                      // null => seat derived from geology
    };

    // ---- E1 (#142): the reign, as a string ----------------------------------
    // A reign is a list of decisions the governor took, and it has to survive a
    // paste into a URL bar. `ch=w4:1,r6:0,d3:1` reads "at epoch 4 the wound
    // response was option 1; at epoch 6 the revolt was option 0; at epoch 3 the
    // Dominion was option 1".
    //
    // The keys are EPOCH-QUALIFIED on purpose. A reign shared at ep=10 and replayed
    // at ep=6 carries decisions for epochs that never arrive; keyed by epoch they
    // are simply not reached, rather than sliding onto the wrong year. Same for a
    // decision whose trigger moved when a knob changed: the entry goes stale and is
    // ignored, and the dice decide as they always did.
    //
    // Everything here is TOTAL: any input produces a decisions map, and anything
    // unreadable produces an empty one. That is the robustness acceptance ("malformed
    // /stale ch sanitized === no-ch") and it is a property of the parser rather than
    // of the caller's care.
    // wrd: the three dice the governor may take over (wound response, revolt, Dominion)
    // cgotsn: the six authored dilemmas (conduit, granary, ore floor, gates, spoil,
    // charter). Each is anchored to a Phase B mechanism that ALREADY has two live
    // edges — direction.md §5 amendment (a): "each dilemma option maps onto §3.2
    // mechanisms, so its long edge exists in the physics". Nothing here invents a
    // consequence; every option pulls a lever the economy already had.
    const CH_KINDS = "wrdcgotsn";
    const CH_MAX_EPOCH = 24;                   // the ep clamp; beyond it nothing can fire
    const CH_MAX_OPTION = 7;                   // no dilemma offers more than this
    function parseDecisions(raw) {
      const out = {};
      const text = String(raw == null ? "" : raw).trim();
      if (!text) return out;
      // a cap on entries: a hash is a shareable link, not an input channel
      for (const part of text.split(",").slice(0, 64)) {
        const m = /^([a-z])(\d{1,2}):(\d)$/.exec(part.trim());
        if (!m) continue;                                        // malformed: ignored
        const [, kind, ep, opt] = m;
        if (!CH_KINDS.includes(kind)) continue;                  // unknown decision
        const e = Number(ep), o = Number(opt);
        if (!(e >= 1 && e <= CH_MAX_EPOCH)) continue;            // out of range
        if (!(o >= 0 && o <= CH_MAX_OPTION)) continue;
        out[kind + e] = o;                                       // last wins
      }
      return out;
    }
    // The canonical form, so a reign round-trips through provenance and a share link
    // byte-identically however it was typed.
    const formatDecisions = (dec) => Object.keys(dec).sort((a, b) => {
      const ea = Number(a.slice(1)), eb = Number(b.slice(1));
      return ea - eb || a.localeCompare(b);
    }).map(k => `${k}:${dec[k]}`).join(",");

    // A decision is offered exactly where the dice already decided, and OPTION 0 IS
    // ALWAYS THE DICE'S OWN OUTCOME. That is what makes the echo-the-dice invariant
    // structural instead of tested-in: a reign that echoes every die IS the auto run,
    // because picking option 0 runs the same branch the auto run ran, in the same
    // order, drawing the same numbers.
    //
    // `decide` consumes NO randomness — not one draw, ever. If offering a choice cost
    // a draw, merely being ASKED would move a world that answered nothing, and the
    // byte-pin would be unsatisfiable rather than merely broken.
    //
    // A `ch` entry naming an option a decision does not offer is STALE: the world
    // moved under the reign (a knob changed, a trigger fired at another epoch), so
    // the dice decide, which is exactly what would have happened with no entry at
    // all. That is the "stale entries ignored === no-ch" acceptance, and it falls out
    // of the same clamp rather than needing its own path.
    function makeReign(params) {
      const want = parseDecisions(params && params.ch);
      const log = [];
      const decide = (kind, epoch, options) => {
        const key = kind + epoch;
        const asked = Object.prototype.hasOwnProperty.call(want, key);
        const raw = asked ? want[key] : 0;
        const ok = Number.isInteger(raw) && raw >= 0 && raw < options.length;
        const pick = ok ? raw : 0;
        log.push({
          epoch, kind, key,
          options: options.slice(),
          chose: options[pick],
          by: pick === 0 ? "dice" : "governor",
          stale: asked && !ok,
        });
        return pick;
      };
      return { decide, log };
    }

    // ---- Deterministic RNG (mulberry32) + string hashing --------------------
    function hashStr(str) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return h >>> 0;
    }
    function mulberry32(a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    // Independent named sub-streams from one seed. Per-region tags (e.g. "pop#7")
    // make each region's draws stable regardless of iteration order.
    function streams(seedText) {
      const base = hashStr(String(seedText));
      return (tag) => mulberry32((base ^ hashStr(tag)) >>> 0);
    }

    // B0 (#121): the world outside — a THIRD seed (beside the rock's world seed
    // and G5's fate seed) keying the exogenous history the region consumes but
    // cannot touch. A Markov regime chain with real persistence (regimes last
    // years, not epochs) drives per-epoch series; the region reads them as
    // NUMBERS ONLY — the observability law: no second map, no simulated empire.
    // Deterministic in the world seed alone, so two worlds differ in prices and
    // events, never in geology or names. The default is the shared Concordat era
    // (decision 7): every region at defaults lives through one world history.
    const WORLD_REGIMES = ["long_boom", "trade_war", "imperial_rivalry", "doctrinal_panic", "distant_war", "retrenchment"];
    // Per-regime boundary conditions. `price` is the FIRST consumer (an income
    // shock to every seam and works, coupled in the epoch loop); the rest ride
    // the export now and couple to their mechanisms later (attention→§3.6 reach,
    // demand→the trade pole, doctrine→creditor demands, metropole→emigration).
    // price is mild and mean≈1.0 so the default world barely moves the aggregate,
    // while a seed that lands a long boom or a long trade war compounds into a
    // real rescue or ruin — the falsifiability keystone.
    const WORLD_TABLE = {
      long_boom:        { price: 1.28, attention: 0.55, demand: 1.20, doctrine: 0.30, metropole: 0.55 },
      trade_war:        { price: 0.76, attention: 0.50, demand: 0.60, doctrine: 0.55, metropole: 0.40 },
      imperial_rivalry: { price: 1.06, attention: 0.90, demand: 1.00, doctrine: 0.60, metropole: 0.70 },
      doctrinal_panic:  { price: 0.94, attention: 0.70, demand: 0.90, doctrine: 0.95, metropole: 0.50 },
      distant_war:      { price: 1.14, attention: 0.80, demand: 1.10, doctrine: 0.70, metropole: 0.80 },
      retrenchment:     { price: 0.82, attention: 0.30, demand: 0.75, doctrine: 0.40, metropole: 0.30 },
    };
    function worldStreams(worldSeed, nEpochs) {
      const w = streams(String(worldSeed));
      const rReg = w("regime"), rJit = w("jitter");
      const P_STAY = 0.72; // geometric run-length: median ~2-3, mean ~3.6 epochs — long enough for a price regime to compound into wealth
      const chain = [], price = [], attention = [], demand = [], doctrine = [], metropole = [];
      let cur = Math.floor(rReg() * WORLD_REGIMES.length);
      for (let e = 0; e < Math.max(0, nEpochs); e++) {
        if (e > 0 && rReg() >= P_STAY) {            // persistence: mostly stay put
          let nxt = Math.floor(rReg() * (WORLD_REGIMES.length - 1));
          if (nxt >= cur) nxt++;                     // uniform among the OTHER regimes
          cur = nxt;
        }
        const reg = WORLD_REGIMES[cur], t = WORLD_TABLE[reg];
        const jit = (rJit() * 2 - 1) * 0.04;         // small within-regime wobble
        chain.push(reg);
        price.push(Math.round(t.price * (1 + jit) * 1000) / 1000);
        attention.push(t.attention); demand.push(t.demand);
        doctrine.push(t.doctrine); metropole.push(t.metropole);
      }
      return { seed: String(worldSeed), regime_chain: chain, price_index: price,
        imperial_attention: attention, foreign_demand: demand,
        doctrine_pressure: doctrine, metropole_pull: metropole };
    }

    // ---- Tiny helpers -------------------------------------------------------
    const round2 = (v) => Math.round(v * 100) / 100;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const lerp = (a, b, t) => a + (b - a) * t;

    // ---- Markov toponymy (E3) -----------------------------------------------
    // Order-2 character chains learn the phonology of three invented registers
    // and walk NOVEL names from per-region substreams. The register a place
    // names itself in is GEOLOGY, not politics: ore country and rugged
    // country speak the frontier tongue, the settled core speaks lowland,
    // and the Temple keeps its own liturgical register for holy ground —
    // so the linguistic map is a landscape fact that survives capital moves,
    // weight changes, and time. All corpus entries are invented.
    const NAME_CORPUS = {
      lowland: [
        "maresden","calverow","fenbriar","astermere","bramholt","dellwick",
        "ockleford","thornmere","witherby","cranmoor","elsden","farrowell",
        "gorsebrook","haldenmere","kelverton","larkfield","melwick","norbriar",
        "ostenholt","pellworth","quillmere","rushdale","selverby","tarnwell",
        "ulvermere","vannock","wexbriar","yeldham","birchstead","coldmere",
        "everwick","foxmoor","gladeholt","hartswell","ivenbrook","lindenmere",
        "millowden","nettlewick","oxenholt","pallowmere","ravensden","sorrelfield",
        "thistlemoor","umberwell","willowmere","aldergate","dunhollow","merrifold",
        "brackenford","hazelmoor","brackleigh","ashenholt","rowanmere","heatherby",
        "sedgemere","reedholt","mosswell","hollasden","elderwick","larchford",
        "teaselmoor","mallowmere","yarrowfield","comfreymere","tansywick","vetchford",
        "wrenholt","heronmere","otterby","badgerholt","harrowmere","mirefold",
        "wealdmere","woldbrook","coppicewell","spinneyholt","briermoor","marlstead",
        "dunbriar","fellmoor","mootwell","glenbriar","bramwick","gorsemere",
        "larkholt","crakemere","ravensholt","hartmere","witherfold","pellbrook",
        "tarnholt","umbermoor","quillfold","sorrelby","thistleford","nettlemere",
        "foxbriar","oxenmere","lindenby","willowfold"
      ],
      frontier: [
        "kharzek","drossvar","grendhak","zarvolk","thulgar","vorruk",
        "brakketh","durnhak","skarvolt","morgruk","tazzurn","kraldek",
        "ostrag","vulzar","gharrek","drumketh","zolvar","narrok",
        "thrakmar","urzhak","belkruk","dovrag","skallorn","murzek",
        "grothal","varnak","hulderk","brazzek","korvask","drellok",
        "stromvar","gnarrek","thozzurn","valgrek","harrgak","zundrak",
        "ferrok","molvarn","quarzek","rukketh","dhorvek","krazzul",
        "ulgrath","vondrek","zharkul","tremmok","goldrak","surtash",
        "brokthar","dhulverk","skornak","murgruth","vraskul","grumdek",
        "khazrok","dronkar","skelvurn","thurgak","brolzek","gnathrok",
        "zerrvak","drumthal","karnhek","vorluk","skraddok","thulmar",
        "grennak","dhorruk","brakvurn","zolgrath","mordrak","kravzek",
        "thornuk","druggath","skalvek","vrundak","gharzul","belthok",
        "korrgak","dhunvar","threggok","mulzeth","skavurn","graldek",
        "brozzurn","khelrak","vantgrok","druzhak","gnorvek","thulzak",
        "molgrath","serkvar","brakthul","dhargek","zurnok","kravdurn",
        "skorvath","vulgrek","thromnak","grommurk"
      ],
      temple: [
        "santhiel","velionne","oriseth","amaranthe","calisse","therane",
        "ellisar","novienne","seraphel","ilmarene","ostrienne","vessaline",
        "aurelith","mirasole","thaliorne","evanthe","solenne","carithiel",
        "umbrielle","lorasanthe","adorielle","synthaine","meriveth","olisandre",
        "tessaline","virelaine","anthiel","corvasse","delorienne","faelith",
        "galliethe","halcyone","isolaire","jessamine","kyrielle","liothaine",
        "marivelle","nivienne","ophelith","perisandre","rosariel","sylvaine",
        "theonelle","valisse","yseriane","zephyrelle","irisonne","elowenne",
        "aurienne","cerinthe","thessarion","ophaline","seraphelle","velanthe",
        "mariselle","orivane","lysianthe","caeliane","sithariel","novariel",
        "elorienne","amareth","thalienne","vessorine","isolienne","ophirane",
        "calyphine","seriane","mirialle","tessarelle","valorienne","anthelune",
        "corialene","delvienne","faeliane","galienthe","halisorne","ilyanthe",
        "jessarelle","kyrilane","liosanthe","marivenne","nivelaire","ostralene",
        "perisonne","rosalienne","sylvorine","theliane","umbrienne","valisienne",
        "yseraline","zephiriel","elowaine","avelienne","cerulaine","lorianthe",
        "sarivelle","venthiane","myrialene","althienne"
      ],
      // C1 (#134): the arcane-industrial registers — the finance houses, the
      // administrative precincts, the papers, and the OLD faith beneath the city
      // (the deep-magic layer the modern state paved over). All entries invented.
      corporate: [
        "ostrend","calmerce","vantoric","credell","solvent","marchend","ferrand","cindrel",
        "ledren","wexort","ambrec","sterlow","corven","draymer","vallent","ryndal",
        "prosek","halcott","mervent","ostrel","fennick","cargen","lumbrec","tressel",
        "ordwen","vantrum","grellim","ashcred","belloc","dornex","invmark","quorren",
        "sableco","trennask","virmont","weldcred","osterment","calvent","dravance","merchant",
        "brantell","drammerce","invecord","kelvort","ostravent","calvend",
        "mercantel","vandrec","sterrend","corvenell","dravell","ferrend",
        "lumbrend","quorrent","tressend","ambrend","valdoren","cindorec",
        "wexerce","prosend","calmoren","vantrell","grellant","sabloren",
        "dornant","ledroren","mervoren","halcend","carrend","weldrend",
        "virmell","trennort","ostrecred","brammort","dravorent","kelrend",
        "solvend","marchent","cordwent","venthorec","stannerce","brenolant",
        "quillerce","calpherce"
      ],
      precinct: [
        "wardren","sextant","belloq","cornice","mallory","verund","ordinal","prevost",
        "cassock","mullion","ferrule","baldric","sennet","corvid","marlow","ostrey",
        "quadran","vellum","cistern","precept","lindward","thessal","gantry","corriel",
        "sablen","wardmoor","censwick","tribune","ostrand","mervault","cassend","bellward",
        "corregate","vantrey","ordwick","precinct",
        "cadrent","dennock","essary","quennard","wardock","sextule",
        "mullent","ferrant","baldary","cassary","corvent","vellard",
        "cistock","preceptic","ordane","tribent","quadrent","sennock",
        "marlent","ostrix","verundic","prevary","bellent","corregen",
        "vantule","thessic","gantrix","censard","mervard","sablock",
        "wardule","dennard","cornock","verrent","quennock","ballent",
        "ostrary","mullary","verdock","cadrock"
      ],
      gazette: [
        "clarion","ledger","herald","beacon","dispatch","sentinel","courier","register",
        "bulletin","gazette","observer","mercury","tribune","standard","vantage","lantern",
        "argus","ensign","recorder","almanac","compass","signal","digest","chronicle",
        "bellweather","watchword","pillar","meridian","clarence","heraldry","dispatcher","couriel",
        "mercurel","tribunel","observ","registrel",
        "clariel","heraldar","dispatchel","bannerol","forecrier","sentinal",
        "courieron","beaconel","gazettel","observon","mercuriel","tribunard",
        "standerol","lanternel","registron","chronel","almanel","compassel",
        "signalon","digestel","bulletel","meridiel","pillaron","watchcrier",
        "ensignol","argusel","vantel","couriard","heraldon","clariograph",
        "presscrier","dispatchon","clarionel","sentinol","beaconry","gazettard",
        "observgraph","couriette","heraldette","bannergraph"
      ],
      chthonic: [
        "ummeroth","khelvane","sythrak","ondimar","vaeloth","threnn","marrowdeep","ossuar",
        "nyxareth","drommel","gethsemer","corvath","sablemaw","undreth","vorrigal","thessulm",
        "grendmar","aethungr","molvane","skarn","ulvereth","dwimmer","cthonar","baelgrim",
        "vessering","morrholt","ashunder","nethrys","umbraxle","khaldreth","syrvane","ondraxa",
        "vaelmourn","thrennok","ossurath","drommurk",
        "baelmoth","drommgrim","ossgrim","cindreth","vaelgrim","khelmoth",
        "ummereth","nyxoloth","sythrane","ondugrim","vorreth","thessgrim",
        "grendoth","molvareth","ulvegrim","corvimar","sablereth","undermoth",
        "nethgrim","baeluther","drommoth","khaldmar","vessmoth","morrgrim",
        "ashgroth","umbrareth","syrgane","thrennoth","ossureth","gethmoth",
        "skarngrim","vaunmoth","cindgrim","vraethoth","gloamdeep","dravemoth",
        "haldreth","murkgrim","ossvane","baelreth"
      ],
      // D1 (#137): the IMPERIAL tier — the Concordat tongue. §3.6 and voices-spec §5
      // both call for a register deliberately unlike every regional phonology, so a
      // loanword is audible as foreign the moment it lands in a local voice: romance
      // stress, doubled consonants, -ine/-ec/-o finals, no -mere/-holt/-grim at all.
      // Nothing selects this register as a place-name register (nameRegister returns
      // only frontier/lowland/temple), so its presence moves no exported byte; it
      // exists for the loom's imperial coin tier.
      imperial: [
        "calderine","vetriax","solmara","quirinal","aurelio","tessarine","obrecht",
        "pallavine","cinquert","marovec","ostravin","belmiro","trascendo","juvarra",
        "cortalis","sabrenne","delvarro","murazzi","lenticor","praetine",
        "argenzo","corvalle","dominex","ferraline","grazzano","interdicto",
        "lucressa","mandevin","novarro","perpetua","quadrante","rescissio",
        "santerre","tribunal","ultrimo","valdesco","zerbino","assessore",
        "brancato","concordat"
      ]
    };
    const buildChain = (names) => {
      const t = new Map();
      for (const n of names) {
        const s = "^^" + n + "$";
        for (let i = 0; i + 2 < s.length; i++) {
          const k = s.slice(i, i + 2);
          if (!t.has(k)) t.set(k, []);
          t.get(k).push(s[i + 2]);
        }
      }
      return t;
    };
    const NAME_CHAINS = {};
    for (const reg in NAME_CORPUS) NAME_CHAINS[reg] = buildChain(NAME_CORPUS[reg]);
    // A walk only counts if it ENDS naturally (reaches the end token): names
    // truncated by the length cap sound cut off mid-phoneme and are rejected.
    const chainWalk = (chain, r, maxLen) => {
      let s = "^^";
      while (s.length < maxLen + 2) {
        const opts = chain.get(s.slice(-2));
        if (!opts) return null;
        const c = opts[Math.floor(r() * opts.length)];
        if (c === "$") return s.slice(2);
        s += c;
      }
      return null;
    };
    // Deterministic draw: retry the walk for shape (5-12 letters, natural
    // ending) and novelty against the used set; the exhaustion fallback
    // extends with the same register's phonology, so even collisions stay
    // in-voice.
    // E6: the raw walk, reusable — a natural-ended word in a register's
    // phonology within [minL, maxL], or null after honest retries
    const markovWord = (register, r, minL, maxL) => {
      const chain = NAME_CHAINS[register];
      for (let a = 0; a < 24; a++) {
        const w = chainWalk(chain, r, maxL);
        if (!w || w.length < minL) continue;
        if (/(..).*\1.*\1/.test(w)) continue; // order-2 stutter loops (e.g. mer-mer-mere)
        return w;
      }
      return null;
    };
    const markovName = (register, r, used) => {
      let last = "";
      for (let a = 0; a < 32; a++) {
        const w = markovWord(register, r, 5, 12);
        if (!w) continue;
        last = w;
        const n = w[0].toUpperCase() + w.slice(1);
        if (!used.has(n)) { used.add(n); return n; }
      }
      let n = (last || register)[0].toUpperCase() + (last || register).slice(1);
      while (used.has(n)) n += ((chainWalk(NAME_CHAINS[register], r, 8) || "an").slice(0, 2));
      used.add(n);
      return n;
    };
    // E6: THE TOPONYM GRAMMAR — the qualifying parts are chosen by the
    // LAND itself (geology only, so the toponymy stays byte-stable across
    // every society knob and capital move): a river mouth earns its
    // -mouth, the fens their Fen, ore country its Delf, the high country
    // its Tor. Roughly half of all places keep the plain base word.
    const PLACE_PARTS = {
      mouth:  ["{b}mouth", "{b}pool", "{b}wash", "{b} Reach", "{b} Landing", "{b}mere"],
      river:  ["{b}ford", "{b} Ford", "{b}mere", "{b}-on-{R}", "{b}bourne", "{b} Crossing", "{b}beck", "{b} Ferry", "{b}wick"],
      coast:  ["{b} Haven", "{b} Strand", "{b}ness", "{b} Cove", "{b}port", "{b} Point", "{b} Bight"],
      high:   ["High {b}", "{b} Crag", "{b} Fell", "{b} Tor", "Upper {b}", "{b} Height", "{b} Scar", "Over {b}", "{b} Cairn"],
      marsh:  ["{b} Fen", "{b}sedge", "{b} Mire", "{b}marsh", "Low {b}", "{b} Slade", "{b}reed"],
      forest: ["{b}holt", "{b} Weald", "{b}wood", "{b} Shaws", "{b} Grove", "{b}hurst", "{b} Coppice"],
      ore:    ["{b} Delf", "Nether {b}", "{b}delve", "{b} Lode", "{b}scar", "Deep {b}", "{b} Diggings", "{b}pit"],
      hold:   ["{b}hold", "{b}gard", "{b} Watch", "{b}stead", "{b} Bastion", "{b}burg"],
      plain:  ["{b}", "{b}", "{b}", "{b}ton", "{b}by"]
    };
    const SUFFIXY = /(mere|ford|holt|wick|mouth|ness|delf|hold|gard|sedge|delve|by|moor|well|brook|field|dale|stead|pool|wash|bourne|beck|port|marsh|reed|wood|hurst|scar|pit|burg|ton)$/;
    const harborName = (n) => / (Haven|Strand)$/.test(n) ? n : n + " Harbor";
    // register is a landscape fact: read only from blind geology
    const nameRegister = (reg) => (reg.endowment0 >= 50 || reg.ruggedness >= 60) ? "frontier" : "lowland";
    const makeName = (r) => markovName("lowland", r, new Set());

    // ---- Planar polygon geometry (Euclidean, per the flat-plane CRS) --------
    function signedArea(ring) {
      let a = 0;
      for (let i = 0; i < ring.length - 1; i++) {
        const [x0, y0] = ring[i], [x1, y1] = ring[i + 1];
        a += x0 * y1 - x1 * y0;
      }
      return a / 2; // >0 == counter-clockwise in y-up space
    }
    function centroid(ring) {
      let a = 0, cx = 0, cy = 0;
      for (let i = 0; i < ring.length - 1; i++) {
        const [x0, y0] = ring[i], [x1, y1] = ring[i + 1];
        const f = x0 * y1 - x1 * y0;
        a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
      }
      a *= 0.5;
      if (Math.abs(a) < 1e-9) {
        let sx = 0, sy = 0, n = ring.length - 1;
        for (let i = 0; i < n; i++) { sx += ring[i][0]; sy += ring[i][1]; }
        return [sx / n, sy / n];
      }
      return [cx / (6 * a), cy / (6 * a)];
    }
    const asCCW = (ring) => (signedArea(ring) < 0 ? ring.slice().reverse() : ring);

    // ---- Voronoi + Lloyd's relaxation --------------------------------------
    function relaxPts(pts, iters) {
      for (let it = 0; it < iters; it++) {
        const vor = d3.Delaunay.from(pts).voronoi([0, 0, WX, WY]);
        pts = pts.map((p, i) => { const c = vor.cellPolygon(i); return c ? centroid(c) : p; });
      }
      return pts;
    }

    // ---- Stage 1: topology (seed / regions / relax) --------------------------
    function buildTopology(params) {
      const r = streams(params.seed)("topo");
      let seeds = Array.from({ length: params.regions }, () => [r() * WX, r() * WY]);
      seeds = relaxPts(seeds, params.relax);
      const del = d3.Delaunay.from(seeds);
      const vor = del.voronoi([0, 0, WX, WY]);
      const regions = [];
      const regionIdxBySeed = new Array(seeds.length).fill(-1);
      seeds.forEach((s, i) => {
        const raw = vor.cellPolygon(i);
        if (!raw) return;
        const ring = asCCW(raw);
        regionIdxBySeed[i] = regions.length;
        regions.push({ id: regions.length, seedIndex: i, ring, c: centroid(ring) });
      });
      // Region adjacency (Delaunay neighbors) — the graph the cost-distance runs on.
      regions.forEach(reg => {
        const ns = [];
        for (const j of del.neighbors(reg.seedIndex)) {
          const ri = regionIdxBySeed[j];
          if (ri >= 0) ns.push(ri);
        }
        reg.neighbors = ns;
      });
      return regions;
    }

    // ---- Line geometry for ridges (G1) --------------------------------------
    // Segment intersection: returns the crossing point or null. The SAME
    // predicate runs on the rounded exported geometry in the app and in the
    // verification suite, so range_shadow is exactly recomputable.
    function segInt(p, q, a, b) {
      const d1x = q[0] - p[0], d1y = q[1] - p[1], d2x = b[0] - a[0], d2y = b[1] - a[1];
      const den = d1x * d2y - d1y * d2x;
      if (den === 0) return null;
      const t = ((a[0] - p[0]) * d2y - (a[1] - p[1]) * d2x) / den;
      const u = ((a[0] - p[0]) * d1y - (a[1] - p[1]) * d1x) / den;
      if (t < 0 || t > 1 || u < 0 || u > 1) return null;
      return [p[0] + t * d1x, p[1] + t * d1y];
    }
    // point-in-ring (ray cast) — same predicate in app and suite, run on the
    // same rounded exported geometry
    function pointInRing(x, y, ring) {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
    function distPointSeg(px, py, a, b) {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const L2 = dx * dx + dy * dy;
      const t = L2 === 0 ? 0 : clamp(((px - a[0]) * dx + (py - a[1]) * dy) / L2, 0, 1);
      return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
    }
    // Liang-Barsky segment clip to the world box.
    function clipSeg(P, Q, x0, y0, x1, y1) {
      let t0 = 0, t1 = 1;
      const dx = Q[0] - P[0], dy = Q[1] - P[1];
      const edge = (p, q) => {
        if (p === 0) return q >= 0;
        const r = q / p;
        if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
        else { if (r < t0) return false; if (r < t1) t1 = r; }
        return true;
      };
      if (edge(-dx, P[0] - x0) && edge(dx, x1 - P[0]) && edge(-dy, P[1] - y0) && edge(dy, y1 - P[1]) && t0 <= t1)
        return [[P[0] + t0 * dx, P[1] + t0 * dy], [P[0] + t1 * dx, P[1] + t1 * dy]];
      return null;
    }
    // Clip a polyline to the box; returns the visible pieces stitched back up.
    function clipPolyline(pts, x0, y0, x1, y1) {
      const out = [];
      let cur = null;
      for (let i = 0; i + 1 < pts.length; i++) {
        const seg = clipSeg(pts[i], pts[i + 1], x0, y0, x1, y1);
        if (!seg) { cur = null; continue; }
        const [A, B] = seg;
        if (cur && Math.hypot(cur[cur.length - 1][0] - A[0], cur[cur.length - 1][1] - A[1]) < 1e-9) cur.push(B);
        else { cur = [A, B]; out.push(cur); }
      }
      return out;
    }
    const polyLen = (pts) => {
      let L = 0;
      for (let i = 0; i + 1 < pts.length; i++) L += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      return L;
    };
    const polyPointAt = (pts, s) => {
      for (let i = 0; i + 1 < pts.length; i++) {
        const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
        if (s <= L) { const t = L === 0 ? 0 : s / L; return [pts[i][0] + t * (pts[i + 1][0] - pts[i][0]), pts[i][1] + t * (pts[i + 1][1] - pts[i][1])]; }
        s -= L;
      }
      return pts[pts.length - 1];
    };
    // Douglas-Peucker with mandatory anchors: kept indices survive, so a
    // simplified river trace still owns a point inside every chain region.
    function dpSimplify(pts, tol, keepIdx) {
      const marks = new Array(pts.length).fill(false);
      marks[0] = marks[pts.length - 1] = true;
      (keepIdx || []).forEach(i => { marks[i] = true; });
      const rec = (a, b) => {
        if (b - a < 2) return;
        let mi = -1, md = -1;
        for (let i = a + 1; i < b; i++) {
          const d = distPointSeg(pts[i][0], pts[i][1], pts[a], pts[b]);
          if (d > md) { md = d; mi = i; }
        }
        if (md > tol) { marks[mi] = true; rec(a, mi); rec(mi, b); }
      };
      const anchors = marks.map((m, i) => (m ? i : -1)).filter(i => i >= 0);
      for (let k = 0; k + 1 < anchors.length; k++) rec(anchors[k], anchors[k + 1]);
      return pts.filter((_, i) => marks[i]);
    }

    // ---- Stage 2: geology (seed + topology ONLY — blind to every social layer)
    // Smooth signed-bump noise field factory: sum of K gaussian bumps.
    function bumpField(rng, count, rLo, rHi) {
      const bs = Array.from({ length: count }, () => ({
        x: rng() * WX, y: rng() * WY,
        amp: rng() * 2 - 1,
        radius: rLo + rng() * (rHi - rLo)
      }));
      return (x, y) => bs.reduce((s, b) =>
        s + b.amp * Math.exp(-(((x - b.x) ** 2 + (y - b.y) ** 2)) / (2 * b.radius * b.radius)), 0);
    }
    function buildGeology(regions, params) {
      const sg = streams(params.seed);

      // Ore lodes: sparse, tight, rich pockets — the ore does not know where the
      // capital is. (The frontier emerges later, from seat placement.)
      const rg = sg("geology");
      const lodeCount = 2 + Math.floor(rg() * 3); // 2–4 lodes
      const lodes = Array.from({ length: lodeCount }, () => ({
        x: rg() * WX, y: rg() * WY,
        strength: 0.5 + rg() * 0.5,
        radius: 80 + rg() * 140
      }));
      let maxRaw = 0;
      const raw = regions.map(reg => {
        let v = 0;
        for (const L of lodes) {
          const d = Math.hypot(reg.c[0] - L.x, reg.c[1] - L.y);
          v += L.strength * Math.exp(-(d * d) / (2 * L.radius * L.radius));
        }
        if (v > maxRaw) maxRaw = v;
        return v;
      });

      // Exhausted lodes: ore fields mined out in the deep past. Blind geology
      // that feeds NO income today — the raw material of abandonment.
      const deadCount = 1 + Math.floor(rg() * 2); // 1–2 dead lodes
      const dead = Array.from({ length: deadCount }, () => ({
        x: rg() * WX, y: rg() * WY, radius: 80 + rg() * 120
      }));
      regions.forEach(reg => {
        let e = 0;
        for (const L of dead) {
          const d = Math.hypot(reg.c[0] - L.x, reg.c[1] - L.y);
          e = Math.max(e, Math.exp(-(d * d) / (2 * L.radius * L.radius)));
        }
        reg.exhausted = e > 0.5;
      });

      // Ore is tectonic chance; everything else is DERIVED down the chain
      // (tectonics -> elevation -> climate -> biome -> fertility).
      regions.forEach((reg, i) => {
        const t = maxRaw > 0 ? raw[i] / maxRaw : 0;
        reg.endowment = Math.round(100 * Math.pow(t, 2)); // sparse: most ~0, few rich
      });

      // G4: the ocean's direction and the prevailing wind come first —
      // the land tilts toward the water, and the rain rides the wind.
      const rsSea = sg("sea");
      const SIDES0 = ["west", "east", "south", "north"];
      const seaSides = [SIDES0[Math.floor(rsSea() * 4)]];
      if (rsSea() < 0.35) {
        const adj0 = { west: ["south", "north"], east: ["south", "north"], south: ["west", "east"], north: ["west", "east"] };
        seaSides.push(adj0[seaSides[0]][rsSea() < 0.5 ? 0 : 1]);
      }
      const windDeg = Math.floor(sg("wind")() * 360);

      // One HIDDEN lode: ore that was always there, not yet found. Blind
      // geology, revealed (maybe) by an in-run strike.
      const hid = { x: rg() * WX, y: rg() * WY, strength: 0.6 + rg() * 0.4, radius: 90 + rg() * 110 };
      regions.forEach(reg => {
        const d = Math.hypot(reg.c[0] - hid.x, reg.c[1] - hid.y);
        const v = hid.strength * Math.exp(-(d * d) / (2 * hid.radius * hid.radius));
        reg.hiddenOre = Math.round(100 * Math.pow(Math.min(1, v / (maxRaw || 1)), 2));
      });

      // G1: mountain ranges — geography with SHAPE. Each ridge is a connected
      // polyline drawn blind (seed only), clipped to the world box. It raises
      // ruggedness/elevation in a band, and its real power is in the cost
      // graph below: crossing it is a wall, except at the passes.
      const rr = sg("ridges");
      const NR = (params.regions >= 12 && rr() < 0.4) ? 2 : 1;
      const ridges = [];
      const passes = [];
      // A CREST IS NOT A RULED LINE. Real ranges follow a curving tectonic
      // suture and grow massifs and saddles along their length; they branch
      // (a main spine throws off spurs) rather than run corner to corner. So
      // the crest is WALKED like a river bed: a sine-generated deflection
      // (Langbein & Leopold, the same curve that freed the rivers) swings the
      // heading around the fault axis, the walk stops at a natural extent
      // (not always the full map), and a mid-crest spur forks off at an angle.
      // Each crest also carries an ELEVATION PROFILE along its arc length so
      // the uplift below rises into massifs and dips into saddles, instead of
      // walling the map at one uniform height.
      const walkCrest = (sx, sy, axis, extent, wavelen, amp, seedK) => {
        const pts = [[sx, sy]];
        let x = sx, y = sy, phase = rr() * 2 * Math.PI, travelled = 0;
        const STEPC = 26;
        for (let g = 0; travelled < extent && g < 120; g++) {
          phase += (2 * Math.PI * STEPC) / wavelen;
          const th = axis + amp * Math.sin(phase) + (rr() - 0.5) * 0.12; // curve + slight grain
          x += Math.cos(th) * STEPC; y += Math.sin(th) * STEPC; travelled += STEPC;
          if (x < -60 || x > WX + 60 || y < -60 || y > WY + 60) break;
          pts.push([x, y]);
        }
        return pts;
      };
      // a seeded massif/saddle profile as a function of position along a
      // crest's arc-length fraction t in [0,1]: 1 = massif crown, ~0.35 = saddle
      const crestProfile = (t, seedK) => {
        const a = 0.5 + 0.5 * Math.cos(2 * Math.PI * (1.5 * t + 0.13 * seedK));
        const b = 0.5 + 0.5 * Math.cos(2 * Math.PI * (3.2 * t + 0.51 * seedK));
        return clamp(0.32 + 0.68 * (0.6 * a + 0.4 * b), 0, 1); // saddles never fully collapse
      };
      for (let ri = 0; ri < NR; ri++) {
        let main = null, seedK = ri * 3 + 1;
        for (let attempt = 0; attempt < 10 && !main; attempt++) {
          // start off one side and aim ACROSS THE INTERIOR (toward a point
          // near the far center, with spread), so the crest spans real ground
          // instead of curving off the box. A sinuous walk aimed randomly can
          // wander straight out an edge; aiming it inward keeps the range on
          // the map, and the fallback below guarantees one always lands.
          const startEdge = Math.floor(rr() * 4);
          const sx = startEdge === 0 ? 40 : startEdge === 1 ? WX - 40 : 100 + rr() * (WX - 200);
          const sy = startEdge === 2 ? 40 : startEdge === 3 ? WY - 40 : 100 + rr() * (WY - 200);
          const tx = WX / 2 + (rr() - 0.5) * WX * 0.5, ty = WY / 2 + (rr() - 0.5) * WY * 0.5;
          const axis = Math.atan2(ty - sy, tx - sx);
          const extent = 620 + rr() * 460;              // varied length, not corner-to-corner
          const wavelen = 320 + rr() * 260;             // long-wavelength curve of the whole range
          const amp = (0.28 + rr() * 0.22) * (attempt < 5 ? 1 : 0.5); // calmer curve if the first tries fell off
          const walked = walkCrest(sx, sy, axis, extent, wavelen, amp, seedK);
          const pieces = clipPolyline(walked, 0, 0, WX, WY);
          for (const pl of pieces) if (!main || polyLen(pl) > polyLen(main)) main = pl;
          if (main && polyLen(main) < 320) main = null;  // fell off the box: redraw
        }
        // GUARANTEE a range on ri=0: if the sinuous walk never held the box,
        // fall back to a gentle diagonal across the interior (still curved,
        // just calmer). Every world has mountains.
        if (!main && ri === 0) {
          const axis = Math.PI * (0.15 + rr() * 0.2) + (rr() < 0.5 ? 0 : Math.PI / 2);
          const sx = 120 + rr() * 120, sy = 120 + rr() * 120;
          const walked = walkCrest(sx, sy, axis, 900, 500, 0.16, seedK);
          const pieces = clipPolyline(walked, 0, 0, WX, WY).sort((a, b) => polyLen(b) - polyLen(a));
          if (pieces[0] && polyLen(pieces[0]) >= 300) main = pieces[0];
        }
        if (!main) continue;
        const rounded = main.map(p => [round2(p[0]), round2(p[1])]);
        const R = { id: ridges.length, pts: rounded, seedK, profile: (t) => crestProfile(t, seedK) };
        ridges.push(R);
        // BRANCH: a longer range forks a spur off a mid-crest point, angled
        // away from the spine (dendritic / en-echelon, as real orogens do).
        if (polyLen(rounded) > 600 && rr() < 0.7 && ridges.length < 4) {
          const bt = 0.35 + rr() * 0.3;
          const bp = polyPointAt(rounded, bt * polyLen(rounded));
          const bi = Math.max(1, Math.min(rounded.length - 1, Math.round(bt * (rounded.length - 1))));
          const seg = [rounded[bi][0] - rounded[bi - 1][0], rounded[bi][1] - rounded[bi - 1][1]];
          const segA = Math.atan2(seg[1], seg[0]);
          const spurAxis = segA + (rr() < 0.5 ? 1 : -1) * (0.7 + rr() * 0.5); // fork angle
          const spur = walkCrest(bp[0], bp[1], spurAxis, 260 + rr() * 240, 240 + rr() * 160, 0.3 + rr() * 0.2, seedK + 7);
          const spurClipped = clipPolyline(spur, 0, 0, WX, WY).sort((a, b) => polyLen(b) - polyLen(a))[0];
          if (spurClipped && polyLen(spurClipped) > 180) {
            const sk2 = seedK + 7;
            ridges.push({ id: ridges.length, pts: spurClipped.map(p => [round2(p[0]), round2(p[1])]), seedK: sk2, profile: (t) => crestProfile(t, sk2), isSpur: true });
          }
        }
        // passes: 1-2 low gaps, placed blind along the ridge's length
        const nPass = 1 + (rr() < 0.5 ? 1 : 0);
        const L = polyLen(rounded);
        const ts = nPass === 1 ? [0.3 + rr() * 0.4] : [0.15 + rr() * 0.25, 0.6 + rr() * 0.25];
        for (const t of ts) {
          const p = polyPointAt(rounded, t * L);
          passes.push({ ridgeId: R.id, x: round2(p[0]), y: round2(p[1]) });
        }
      }
      // G4: THE ELEVATION SURFACE — one continuous field the whole physical
      // world reads: continental tilt off the sea + tectonic uplift along
      // the ridge axes + noise texture + a shelving shore.
      const distToRidge = (x, y) => {
        let best = Infinity;
        for (const R of ridges) for (let k = 0; k + 1 < R.pts.length; k++)
          best = Math.min(best, distPointSeg(x, y, R.pts[k], R.pts[k + 1]));
        return best;
      };
      // per-ridge cumulative arc length, so a point can be located ALONG the
      // crest (its profile fraction t) and the massif/saddle height read there
      ridges.forEach(R => {
        R.cum = [0];
        for (let k = 0; k + 1 < R.pts.length; k++)
          R.cum.push(R.cum[k] + Math.hypot(R.pts[k + 1][0] - R.pts[k][0], R.pts[k + 1][1] - R.pts[k][1]));
        R.total = R.cum[R.cum.length - 1] || 1;
      });
      // nearest ridge to (x,y): returns { dist, uplift } where uplift in [0,1]
      // is the crest's massif/saddle height at the nearest point. A massif
      // walls to full height; a saddle is a natural low the range dips to.
      const ridgeUpliftAt = (x, y) => {
        let best = Infinity, up = 0;
        for (const R of ridges) for (let k = 0; k + 1 < R.pts.length; k++) {
          const a = R.pts[k], b = R.pts[k + 1];
          const abx = b[0] - a[0], aby = b[1] - a[1], L2 = abx * abx + aby * aby || 1;
          const tt = Math.max(0, Math.min(1, ((x - a[0]) * abx + (y - a[1]) * aby) / L2));
          const qx = a[0] + abx * tt, qy = a[1] + aby * tt;
          const d = Math.hypot(qx - x, qy - y);
          if (d < best) {
            best = d;
            const arc = R.cum[k] + tt * (R.cum[k + 1] - R.cum[k]);
            up = R.profile ? R.profile(arc / R.total) : 1;
          }
        }
        return { dist: best, uplift: up };
      };
      // DOMAIN WARP: the raw edge distance is axis-aligned, so its gradient
      // is a constant compass vector and the continental tilt descends in
      // dead-straight lines: a river with no ridge to follow runs ruler
      // straight, worst against a map edge where the meander cannot swing
      // outward. Displacing the sample point by a low-frequency vector field
      // bends every iso-distance contour, so the tilt itself flows at an
      // angle that wanders across the map. Geology, not render: the coast,
      // the flood, and every bed read this warped field.
      const warpX = bumpField(sg("tiltwarpx"), 5, 90, 210);
      const warpY = bumpField(sg("tiltwarpy"), 5, 90, 210);
      const distToSeaEdge = (x, y) => {
        const wx = x + 130 * warpX(x, y), wy = y + 130 * warpY(x, y);
        return Math.min(...seaSides.map(side =>
          side === "west" ? wx : side === "east" ? WX - wx : side === "south" ? wy : WY - wy));
      };
      const elevNoise = bumpField(sg("elevation"), 6, 120, 300);
      // M1: the shore is a COASTLINE, not a strip. The old shelf clamped a
      // fixed 26-unit band to a straight ramp, so the flood line ran
      // parallel to the map edge. Now the shelf's reach and steepness
      // WANDER along the shore — wide low shelves become bays and firths,
      // steep narrow ones become headlands — and the odd skerry pokes
      // back above the water inside the band.
      const shoreNoise = bumpField(sg("shore"), 14, 50, 130);
      const skerryNoise = bumpField(sg("skerries"), 18, 22, 56);
      // FRACTAL COAST, three octaves so the shore has detail at every scale
      // (a real coast is not one tilted edge with a crinkly crust, which is
      // what a single fine octave leaves; it is deep gulfs holding coves
      // holding rocks). The GULF octave is coarse and strong: it does not
      // just ripple the waterline, it pushes the whole low shore ZONE tens of
      // units inland (a gulf, a firth) or out to sea (a broad peninsula), so
      // the silhouette itself varies instead of paralleling the map edge.
      const gulfNoise = bumpField(sg("gulfs"), 9, 150, 340);  // gulf / peninsula scale (silhouette)
      const coveNoise = bumpField(sg("coves"), 40, 18, 40);   // cove / small-bay scale
      const crenNoise = bumpField(sg("crenels"), 70, 9, 20);  // crenellation / rock scale
      const elevAt = (x, y) => {
        const t = clamp(distToSeaEdge(x, y) / Math.max(WX, WY), 0, 1);
        let e = 12 + 58 * Math.pow(t, 1.15);                       // the land tilts off the water
        // tectonic uplift, but MODULATED along the crest: a massif reaches
        // full height, a saddle only partway, so the range has a skyline of
        // peaks and gaps instead of one uniform wall. The Gaussian falloff
        // across the crest (width ~95) is unchanged, preserving the flanks
        // the rivers rise on and the cost-graph wall.
        const ru = ridgeUpliftAt(x, y);
        // massif reaches ABOVE the old uniform wall (58), saddle dips to 34,
        // so the range still throws real peaks (the rain shadow needs the
        // height) while gaining a varied skyline instead of a flat top.
        e += (34 + 40 * ru.uplift) * Math.exp(-(ru.dist * ru.dist) / (2 * 95 * 95)); // 34..74 by massif/saddle
        e += 14 * elevNoise(x, y);                                 // texture
        // GULF OCTAVE reshapes the SILHOUETTE: it shifts the effective
        // distance-to-water by tens of units, so the low shore zone floods
        // deep inland where the field dips (a gulf/firth) and the land runs
        // out to sea where it rises (a peninsula/cape). This is what breaks
        // the "tilted toast edge": the coast no longer parallels the map
        // border, it bites in and juts out.
        const ds = clamp(distToSeaEdge(x, y) + 78 * gulfNoise(x, y), -40, Math.max(WX, WY));
        const sh = clamp(0.5 + 0.5 * shoreNoise(x, y), 0, 1);
        const band = 16 + 70 * sh;
        if (ds < band) {
          e = Math.min(e, 2 + (Math.max(0, ds) / band) * (10 + 30 * (1 - sh))); // bays reach far; headlands climb fast
          // fractal shore: the fine octaves push the shelf up and down across
          // a few units, cutting coves into the land and throwing small points
          // out to sea. Strongest right at the waterline (weighted by how deep
          // into the shelf we are), fading inland so it only shapes the COAST.
          const shoreW = 1 - Math.max(0, ds) / band;               // 1 at the water, 0 at the band's inland edge
          e += (12 * coveNoise(x, y) + 7 * crenNoise(x, y)) * shoreW;
          const sk = skerryNoise(x, y);
          if (sk > 0.45) e += (sk - 0.45) * 55;                    // skerries and dune ridges
        }
        return clamp(e, 0, 100);
      };
      // ruggedness is the SLOPE of the surface, plus surface grain
      const rugNoise = sg("rugged");
      regions.forEach(reg => {
        const [ax, ay] = reg.c;
        const e0 = elevAt(ax, ay);
        reg.elevation = Math.round(e0);
        const g4 = Math.max(
          Math.abs(elevAt(ax + 30, ay) - e0), Math.abs(elevAt(ax - 30, ay) - e0),
          Math.abs(elevAt(ax, ay + 30) - e0), Math.abs(elevAt(ax, ay - 30) - e0));
        const crest = e0 > 60 ? (e0 - 60) * 0.7 : 0; // the high country is crag country
        reg.ruggedness = clamp(Math.round(g4 * 4.6 + crest + rugNoise() * 26), 0, 100);
      });

      // M1: THE ANCHOR IS A TOWN SITE, NOT A CENTROID. Candidates fan from
      // the centroid toward each vertex (convex cells keep them inside).
      // The sea level is capped so EVERY region keeps at least one dry
      // candidate, and a wet founding site moves to its cell's driest
      // ground: no town in the water, by construction.
      const candsOf = (reg) => {
        const cs = [reg.c.slice()];
        for (const v of reg.ring) for (const tt of [0.25, 0.45, 0.62, 0.78, 0.9])
          cs.push([reg.c[0] + (v[0] - reg.c[0]) * tt, reg.c[1] + (v[1] - reg.c[1]) * tt]);
        return cs;
      };
      const maxDry = Math.min(...regions.map(reg => Math.max(...candsOf(reg).map(p => elevAt(p[0], p[1])))));
      let seaLevel = Math.max(6, Math.min(16 + Math.round(rsSea() * 8), Math.floor(maxDry) - 1));
      regions.forEach(reg => {
        if (elevAt(reg.c[0], reg.c[1]) >= seaLevel + 1.5) return; // dry: the site stands
        let best = reg.c, bestE = -Infinity;
        for (const p of candsOf(reg)) {
          const e2 = elevAt(p[0], p[1]);
          if (e2 > bestE + 1e-9) { bestE = e2; best = p; }
        }
        reg.c = [best[0], best[1]];
        // re-read the surface at the town site it actually stands on
        const e0b = elevAt(reg.c[0], reg.c[1]);
        reg.elevation = Math.round(e0b);
        const g4b = Math.max(
          Math.abs(elevAt(reg.c[0] + 30, reg.c[1]) - e0b), Math.abs(elevAt(reg.c[0] - 30, reg.c[1]) - e0b),
          Math.abs(elevAt(reg.c[0], reg.c[1] + 30) - e0b), Math.abs(elevAt(reg.c[0], reg.c[1] - 30) - e0b));
        reg.ruggedness = clamp(Math.round(g4b * 4.6 + (e0b > 60 ? (e0b - 60) * 0.7 : 0) + rugNoise() * 26), 0, 100);
      });


      // each pass belongs to the region whose anchor point sits closest
      passes.forEach(p => {
        let bi = 0, bd = Infinity;
        regions.forEach((reg, i) => {
          const d = Math.hypot(round2(reg.c[0]) - p.x, round2(reg.c[1]) - p.y);
          if (d < bd) { bd = d; bi = i; }
        });
        p.regionIdx = bi;
        p.elev = Math.round(elevAt(p.x, p.y)); // E6: the crossing's height names its kind
      });
      regions.forEach(reg => { reg.isPass = 0; });
      passes.forEach(p => { regions[p.regionIdx].isPass = 1; });
      // precompute the wall: for every adjacency edge, does the centroid
      // segment cross a ridge — and if so, does it cross AT a pass?
      regions.forEach(reg => { reg.ridgeMult = new Map(); });
      regions.forEach((A, i) => {
        for (const j of A.neighbors) {
          if (j <= i) continue;
          const B = regions[j];
          let mult = 1;
          for (const R of ridges) {
            for (let k = 0; k + 1 < R.pts.length; k++) {
              const X = segInt(A.c, B.c, R.pts[k], R.pts[k + 1]);
              if (!X) continue;
              const atPass = passes.some(p => Math.hypot(X[0] - p.x, X[1] - p.y) < PASS_R);
              mult = Math.max(mult, atPass ? PASS_MULT : RIDGE_WALL);
            }
          }
          A.ridgeMult.set(B.id, mult);
          B.ridgeMult.set(A.id, mult);
        }
      });

      // G2: rivers — the conductors. A strictly-downhill walk on the region
      // adjacency graph from high ground toward the border. Runs AFTER the
      // ridge boost, so rivers rise on the mountain flanks and flow away
      // from the wall. The chain order IS the downstream order.
      const rv2 = sg("rivers");
      const isBorder = regions.map(reg =>
        reg.ring.some(([x, y]) => x <= 0.01 || x >= WX - 0.01 || y <= 0.01 || y >= WY - 0.01));
      const rivers = [];
      regions.forEach(reg => { reg.onRiver = 0; reg.riverId = -1; reg.riverPos = -1; });
      // a few rivers, more on bigger maps, kept sparse so beds do not crowd
      // (they now branch via confluences rather than avoiding each other)
      const NRIV = Math.max(1, Math.min(3, 1 + Math.floor(params.regions / 22)));
      // sources: high INTERIOR ground (a source on the border is a one-step
      // river); descent is GENTLEST-first — water meanders, it does not dive
      const interior = regions.map((_, i) => i).filter(i => !isBorder[i]);
      const srcPool = (interior.length ? interior : regions.map((_, i) => i)).sort((a, b) =>
        regions[b].elevation - regions[a].elevation || a - b);
      for (let vi = 0; vi < NRIV; vi++) {
        let bestChain = null;
        for (let attempt = 0; attempt < 8; attempt++) {
          const src = srcPool[Math.floor(rv2() * Math.min(8, srcPool.length))];
          if (regions[src].onRiver) continue;
          const chain = [src];
          let cur = src, joinRegion = -1;
          // the river's current heading in map space: the direction from the
          // previous chain anchor to this one. Descent must not fold back on
          // it, or the chain hairpins and the traced bed loops over itself.
          // SEED the heading at the source from the mean direction of its
          // downhill neighbors (where the water actually wants to go), so even
          // the FIRST step prefers the natural flow line instead of picking a
          // neighbor that sets up a hairpin with the second step.
          let hdx = 0, hdy = 0;
          {
            const sc0 = regions[src].c;
            for (const j of regions[src].neighbors) {
              if (regions[j].elevation >= regions[src].elevation) continue;
              const dvx = regions[j].c[0] - sc0[0], dvy = regions[j].c[1] - sc0[1];
              const dl = Math.hypot(dvx, dvy) || 1;
              const w = regions[src].elevation - regions[j].elevation; // steeper pulls more
              hdx += (dvx / dl) * w; hdy += (dvy / dl) * w;
            }
            const hl = Math.hypot(hdx, hdy);
            if (hl > 1e-6) { hdx /= hl; hdy /= hl; } else { hdx = 0; hdy = 0; }
          }
          while (!isBorder[cur]) {
            let joinCand = -1; // an already-river neighbor lower than us (a confluence)
            // score every FREE strictly-lower neighbor: gentlest descent
            // (highest lower ground) is the drinking-order rule, but among
            // comparably-low neighbors we prefer the one that CONTINUES the
            // river's direction over one that doubles back. Elevation still
            // strictly decreases, so the chain stays a valid drinking order;
            // it just stops choosing a downhill hairpin over a downhill run.
            const curC = regions[cur].c, curE = regions[cur].elevation;
            // gather every FREE strictly-lower neighbor with its heading
            // alignment, so we can VETO the hairpins (a downhill step that
            // folds back on the river's course) unless one is the only way
            // down. A veto, not a soft score: a big elevation drop toward a
            // fold otherwise still wins and the chain doubles back.
            const cands = [];
            for (const j of regions[cur].neighbors) {
              if (chain.includes(j)) continue;
              if (regions[j].elevation >= curE) continue;
              if (regions[j].onRiver) { // a lower neighbor already a river: a place to join
                if (joinCand === -1 || regions[j].elevation > regions[joinCand].elevation) joinCand = j;
                continue;
              }
              const jc = regions[j].c;
              const vx = jc[0] - curC[0], vy = jc[1] - curC[1], vL = Math.hypot(vx, vy) || 1;
              const align = (hdx || hdy) ? (vx * hdx + vy * hdy) / vL : 1; // no heading yet: neutral
              cands.push({ j, drop: curE - regions[j].elevation, align });
            }
            // onward candidates (align >= 0.1, i.e. turning less than ~84deg)
            // are preferred wholesale; only if none exists do we accept a
            // sharper turn, and then the gentlest descent among them, so the
            // river still goes down. A river bends; it does not switchback.
            let pool = cands.filter(c => c.align >= 0.1);
            if (!pool.length) pool = cands;
            // within the pool: gentlest descent (drinking order), and among
            // near-equal drops the most onward-pointing wins
            let nxt = -1, bestScore = -Infinity;
            for (const c of pool) {
              const score = -c.drop + 6 * c.align;
              if (score > bestScore) { bestScore = score; nxt = c.j; }
            }
            if (nxt === -1) { // no free downhill: join a river if one is adjacent and lower
              if (joinCand !== -1) joinRegion = joinCand;
              break; // otherwise an inland basin (the marsh terminus, until lakes land)
            }
            const pc = regions[cur].c, ncC = regions[nxt].c;
            hdx = ncC[0] - pc[0]; hdy = ncC[1] - pc[1];
            const hL = Math.hypot(hdx, hdy) || 1; hdx /= hL; hdy /= hL; // unit heading
            chain.push(nxt);
            cur = nxt;
          }
          if (!bestChain || chain.length > bestChain.length) { bestChain = chain; bestChain.joinRegion = joinRegion; }
          if (bestChain.length >= 5) break;
        }
        if (!bestChain || bestChain.length < 2) continue;
        const R = { id: rivers.length, chain: bestChain };
        // a tributary records where it meets its trunk (the trunk region it feeds)
        if (bestChain.joinRegion !== undefined && bestChain.joinRegion >= 0) {
          R.confluenceInto = regions[bestChain.joinRegion].riverId;
          R.confluenceRegion = bestChain.joinRegion;
        }
        rivers.push(R);
        bestChain.forEach((ri, k) => {
          const reg = regions[ri];
          reg.onRiver = 1; reg.riverId = R.id; reg.riverPos = k;
        });
        // (barge-edge relaxation moved below the bed walk: a chain can be
        // truncated at a confluence, and only the served reach is barge water)
      }
      // (discharge accumulation moved below the bed walk: beds can now MERGE
      // into an earlier bed mid-walk, and that merge is what sets the trunk)

      // G4/M1: THE SEA IS A SHAPE — and it NEGOTIATES. Flood the low
      // ground connected to the ocean side, trace the coastline (marching
      // squares, padded so every ring closes, rings nested so islands are
      // holes), then CHECK: if any region lost every candidate point to
      // the traced water, the sea level drops and the trace re-runs. The
      // exported level is the negotiated one — no town in the water is a
      // property of the shape itself, not of a hopeful estimate.
      // GN was 64 (cells ~15.6 wide), coarser than the cove/crenel shore
      // detail, so the coast could not resolve below one cell and read blocky.
      // 96 (cells ~10.4) captures the fractal shore octaves while keeping the
      // transient grid arrays (flood mask, label, marching squares) and the
      // retained coastline vertex count from ballooning the way 128 did (the
      // suite generates hundreds of worlds; 128 exhausted memory).
      const GN = 96, CSX = WX / GN, CSY = WY / GN;
      const nodeElev = [];
      for (let gy = 0; gy <= GN; gy++) {
        const row = [];
        for (let gx = 0; gx <= GN; gx++) row.push(elevAt(gx * CSX, gy * CSY));
        nodeElev.push(row);
      }
      // G4b: fractal noise on the elevation grid before the sea flood-fill.
      // Perturbs the land/water boundary at the sub-cell level, creating
      // organic headlands, bays, and coves instead of a straight cell-edge
      // coastline. Deterministic per seed; only affects coastal cells (±5 units
      // of noise vs the ±1.5 sea-level margin).
      const rCoast = streams(params.seed)("coastNoise");
      for (let gy = 0; gy <= GN; gy++) {
        for (let gx = 0; gx <= GN; gx++) {
          let n = 0, amp = 3.5, freq = 0.008;
          const bx = gx * CSX, by = gy * CSY;
          for (let o = 0; o < 3; o++) {
            n += Math.sin(bx * freq + rCoast() * 6.28) * Math.cos(by * freq * 1.3 + rCoast() * 6.28) * amp;
            amp *= 0.5; freq *= 2.2;
          }
          nodeElev[gy][gx] += n;
        }
      }
      const raisedHolm = new Set(); // grid nodes lifted for a town with no dry ground
      // opts.seed(floodSeed) chooses the flood origins (default: the sea sides);
      // opts.block is a Set of "gx:gy" nodes the flood may not enter (used to
      // keep lakes out of the already-flooded sea). Returns the flooded mask via
      // opts.floodedOut if requested, so a second pass can subtract it.
      const traceSea = (level, opts) => {
        opts = opts || {};
        const flooded = nodeElev.map(row => row.map(() => false));
        const fq = [];
        const floodSeed = (gx, gy) => {
          if (gx < 0 || gy < 0 || gx > GN || gy > GN) return;
          if (raisedHolm.has(gx + ":" + gy)) return;
          if (opts.block && opts.block.has(gx + ":" + gy)) return;
          if (flooded[gy][gx] || nodeElev[gy][gx] >= level) return;
          flooded[gy][gx] = true;
          fq.push([gx, gy]);
        };
        if (opts.seed) opts.seed(floodSeed);
        else for (let k = 0; k <= GN; k++) {
          if (seaSides.includes("west")) floodSeed(0, k);
          if (seaSides.includes("east")) floodSeed(GN, k);
          if (seaSides.includes("south")) floodSeed(k, 0);
          if (seaSides.includes("north")) floodSeed(k, GN);
        }
        while (fq.length) {
          const [gx, gy] = fq.pop();
          floodSeed(gx + 1, gy); floodSeed(gx - 1, gy); floodSeed(gx, gy + 1); floodSeed(gx, gy - 1);
        }
        if (opts.floodedOut) opts.floodedOut.mask = flooded;
        const F4 = (gx, gy) => (gx >= 0 && gy >= 0 && gx <= GN && gy <= GN && flooded[gy][gx]) ? 1 : 0;
        const segs4 = [];
        // SUB-CELL INTERPOLATION: the crossing on a cell edge is placed where
        // the elevation actually reaches sea level between the two corners,
        // not at the geometric midpoint. Midpoints lock every coast vertex to
        // the grid lattice and every segment to a 0/45/90-degree angle, which
        // is what made the coastline read blocky and square. Interpolating on
        // the real corner elevations lets the shore follow the true contour,
        // curving at any angle. A flooded corner may sit above `level` (it was
        // reached by connectivity, not depth), so the fraction is clamped and
        // falls back to the midpoint when the two corners are on the same side.
        const eAt = (gx, gy) => (gx >= 0 && gy >= 0 && gx <= GN && gy <= GN) ? nodeElev[gy][gx] : 200; // off-grid = dry wall
        const crossX = (gxa, gya, gxb, gyb) => {
          const ea = eAt(gxa, gya), eb = eAt(gxb, gyb);
          let t = 0.5;
          if ((ea < level) !== (eb < level) && ea !== eb) t = clamp((level - ea) / (eb - ea), 0.02, 0.98);
          return [ (gxa + (gxb - gxa) * t) * CSX, (gya + (gyb - gya) * t) * CSY ];
        };
        for (let gy = -1; gy <= GN; gy++) for (let gx = -1; gx <= GN; gx++) {
          const tl = F4(gx, gy), tr = F4(gx + 1, gy), br = F4(gx + 1, gy + 1), bl = F4(gx, gy + 1);
          const code = tl * 8 + tr * 4 + br * 2 + bl;
          if (code === 0 || code === 15) continue;
          const T = crossX(gx, gy, gx + 1, gy), R2 = crossX(gx + 1, gy, gx + 1, gy + 1),
                B = crossX(gx, gy + 1, gx + 1, gy + 1), L2 = crossX(gx, gy, gx, gy + 1);
          const add = (a, b) => segs4.push([a, b]);
          if (code === 1 || code === 14) add(L2, B);
          else if (code === 2 || code === 13) add(B, R2);
          else if (code === 3 || code === 12) add(L2, R2);
          else if (code === 4 || code === 11) add(T, R2);
          else if (code === 5 || code === 10) { add(L2, T); add(B, R2); }
          else if (code === 6 || code === 9) add(T, B);
          else if (code === 7 || code === 8) add(L2, T);
        }
        // stitch segments into rings (endpoints live on a snap lattice)
        const shapes = [];
        const rawRings = [];
        const key5 = (pt) => Math.round(pt[0] * 8) + ":" + Math.round(pt[1] * 8);
        const atKey = new Map();
        segs4.forEach((sg2, i) => {
          for (const k of [key5(sg2[0]), key5(sg2[1])]) {
            if (!atKey.has(k)) atKey.set(k, []);
            atKey.get(k).push(i);
          }
        });
        const usedSeg = new Array(segs4.length).fill(false);
        for (let i = 0; i < segs4.length; i++) {
          if (usedSeg[i]) continue;
          usedSeg[i] = true;
          const ring = [segs4[i][0].slice(), segs4[i][1].slice()];
          let guard = segs4.length * 2 + 4;
          while (guard-- > 0) {
            const tk = key5(ring[ring.length - 1]);
            const cands = (atKey.get(tk) || []).filter(j => !usedSeg[j]);
            if (!cands.length) break;
            const j = cands[0];
            usedSeg[j] = true;
            const nxt = key5(segs4[j][0]) === tk ? segs4[j][1] : segs4[j][0];
            if (key5(nxt) === key5(ring[0])) { ring.push(ring[0].slice()); break; }
            ring.push(nxt.slice());
          }
          if (ring.length >= 4 && key5(ring[0]) === key5(ring[ring.length - 1]))
            rawRings.push(ring.map(pt => [round2(clamp(pt[0], 0, WX)), round2(clamp(pt[1], 0, WY))]));
        }
        // rings NEST — an island is a ring inside a sea ring: a hole
        const ringArea = (rg) => {
          let s2 = 0;
          for (let i2 = 0; i2 + 1 < rg.length; i2++) s2 += rg[i2][0] * rg[i2 + 1][1] - rg[i2 + 1][0] * rg[i2][1];
          return Math.abs(s2) / 2;
        };
        rawRings.sort((a2, b2) => ringArea(b2) - ringArea(a2));
        const parentOf = rawRings.map((rg, i2) => {
          for (let j2 = i2 - 1; j2 >= 0; j2--)
            if (pointInRing(rg[0][0] + 0.01, rg[0][1] + 0.01, rawRings[j2])) return j2;
          return -1;
        });
        const depth = parentOf.map((p2) => { let d2 = 0, k2 = p2; while (k2 !== -1) { d2++; k2 = parentOf[k2]; } return d2; });
        const shapeIdx = new Map();
        rawRings.forEach((rg, i2) => {
          if (depth[i2] % 2 === 0) { shapeIdx.set(i2, shapes.length); shapes.push({ outer: rg, holes: [] }); }
        });
        rawRings.forEach((rg, i2) => {
          if (depth[i2] % 2 === 1 && shapeIdx.has(parentOf[i2])) shapes[shapeIdx.get(parentOf[i2])].holes.push(rg);
        });
        return shapes;
      };
      let seaShapes = traceSea(seaLevel);
      {
        const inShapes = (shapes, x, y) => shapes.some(S =>
          pointInRing(x, y, S.outer) && !S.holes.some(h => pointInRing(x, y, h)));
        let guard = 24; // enough to walk any seeded level down to the floor
        while (guard-- > 0 && seaLevel > 3) {
          const wholly = regions.some(reg => candsOf(reg).every(p => inShapes(seaShapes, p[0], p[1])));
          if (!wholly) break;
          seaLevel -= 1;
          seaShapes = traceSea(seaLevel);
        }
        // M1: the last resort. A cell sunk in a noise pit can be wet at
        // ANY level that still leaves a sea. Such a town raises a HOLM:
        // the grid nodes around its best point become land and the trace
        // re-runs — the lagoon town stands on its mound above the tide,
        // drawn and exported as a small island.
        const sunk = regions.filter(reg => candsOf(reg).every(p => inShapes(seaShapes, p[0], p[1])));
        if (sunk.length) {
          for (const reg of sunk) {
            let best = reg.c, bestE = -Infinity;
            for (const p of candsOf(reg)) {
              const e2 = elevAt(p[0], p[1]);
              if (e2 > bestE + 1e-9) { bestE = e2; best = p; }
            }
            const cgx = Math.round(best[0] / CSX), cgy = Math.round(best[1] / CSY);
            for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
              if (Math.hypot(dx, dy) > 2.2) continue;
              raisedHolm.add((cgx + dx) + ":" + (cgy + dy));
            }
          }
          seaShapes = traceSea(seaLevel);
        }
      }
      // LAKES: an ENCLOSED low basin the sea never reached. A basin is a lake
      // only if its water body touches NEITHER the map edge NOR the sea. We
      // label connected low components at the sea level, and keep only the ones
      // that are fully interior (the sea itself, and coastal shelves reaching
      // the border, are excluded).
      let lakeShapes = [];
      {
        const seaHold = {};
        traceSea(seaLevel, { floodedOut: seaHold }); // the sea's flooded mask
        const seaMask = seaHold.mask;
        // label connected components of "wet but not sea" nodes (below seaLevel)
        // town anchors on the grid, so a lake never drowns a settlement
        const townNodes = new Set();
        regions.forEach(reg => {
          const gx = Math.round(reg.c[0] / CSX), gy = Math.round(reg.c[1] / CSY);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) townNodes.add((gx + dx) + ":" + (gy + dy));
        });
        // a lake is a DEEP pit: nodes well below sea level (not a broad low
        // plain), so use a stricter threshold than the coastline.
        const lakeThresh = seaLevel - 8;
        const label = nodeElev.map(row => row.map(() => 0));
        let nextLabel = 0;
        const compTouchesEdge = new Map(), compTouchesSea = new Map(), compTouchesTown = new Map(), compNodes = new Map();
        for (let gy = 0; gy <= GN; gy++) for (let gx = 0; gx <= GN; gx++) {
          if (label[gy][gx] || seaMask[gy][gx] || nodeElev[gy][gx] >= lakeThresh) continue;
          const id = ++nextLabel; const st = [[gx, gy]]; label[gy][gx] = id;
          let edge = false, nearSea = false, hasTown = false, count = 0;
          while (st.length) {
            const [x, y] = st.pop(); count++;
            if (x === 0 || y === 0 || x === GN || y === GN) edge = true;
            if (townNodes.has(x + ":" + y)) hasTown = true;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || ny < 0 || nx > GN || ny > GN) continue;
              if (seaMask[ny][nx]) { nearSea = true; continue; }
              if (label[ny][nx] || nodeElev[ny][nx] >= lakeThresh) continue;
              label[ny][nx] = id; st.push([nx, ny]);
            }
          }
          compTouchesEdge.set(id, edge); compTouchesSea.set(id, nearSea); compTouchesTown.set(id, hasTown); compNodes.set(id, count);
        }
        // a lake: interior (no edge), not sea-adjacent, no town in it, and a
        // sensible SIZE (big enough to matter, small enough to be a lake and not
        // a drowned plain): a few nodes up to a small fraction of the grid.
        const maxNodes = Math.round((GN + 1) * (GN + 1) * 0.05);
        const lakeIds = new Set();
        for (const [id, count] of compNodes)
          if (!compTouchesEdge.get(id) && !compTouchesSea.get(id) && !compTouchesTown.get(id) && count >= 3 && count <= maxNodes) lakeIds.add(id);
        if (lakeIds.size) {
          // trace exactly those components (flood seeded from their nodes, and
          // everything else blocked) with the same marching squares as the sea
          const block = new Set();
          for (let gy = 0; gy <= GN; gy++) for (let gx = 0; gx <= GN; gx++)
            if (!lakeIds.has(label[gy][gx])) block.add(gx + ":" + gy);
          const seed = (floodSeed) => {
            for (let gy = 0; gy <= GN; gy++) for (let gx = 0; gx <= GN; gx++)
              if (lakeIds.has(label[gy][gx])) floodSeed(gx, gy);
          };
          const raw = traceSea(lakeThresh, { seed, block }); // trace at the deep pit level
          const areaOf = (rg) => { let s2 = 0; for (let i2 = 0; i2 + 1 < rg.length; i2++) s2 += rg[i2][0] * rg[i2 + 1][1] - rg[i2 + 1][0] * rg[i2][1]; return Math.abs(s2) / 2; };
          lakeShapes = raw.filter(S => areaOf(S.outer) >= 250);
          lakeShapes.forEach((S, i) => { S.lake_id = i; });
        }
      }
      const inLakePoly = (x, y) => lakeShapes.some(S =>
        pointInRing(x, y, S.outer) && !S.holes.some(h => pointInRing(x, y, h)));
      regions.forEach(reg => { reg.onLake = inLakePoly(reg.c[0], reg.c[1]) ? 1 : 0; });
      // M1: the marching-squares polygon is the AUTHORITATIVE water — a
      // grid-resolution coastline can swing past a point that is above
      // sea level in the continuous field. Second relocation pass: any
      // anchor inside the traced sea moves to its cell's best candidate
      // OUTSIDE it. Same for the wild sites below. No town in the water,
      // now against the very shape the map draws and the file exports.
      const inSeaPoly = (x, y) => seaShapes.some(S =>
        pointInRing(x, y, S.outer) && !S.holes.some(h => pointInRing(x, y, h)));
      regions.forEach(reg => {
        if (!inSeaPoly(reg.c[0], reg.c[1])) return;
        const dryC = candsOf(reg)
          .map(p => ({ p, e: elevAt(p[0], p[1]) }))
          .filter(o => !inSeaPoly(o.p[0], o.p[1]))
          .sort((a2, b2) => b2.e - a2.e || a2.p[0] - b2.p[0]);
        if (!dryC.length) return; // a cell wholly under the sea: keep (never seen; guarded by the cap)
        reg.c = [dryC[0].p[0], dryC[0].p[1]];
        const e0c = elevAt(reg.c[0], reg.c[1]);
        reg.elevation = Math.round(e0c);
        const g4c = Math.max(
          Math.abs(elevAt(reg.c[0] + 30, reg.c[1]) - e0c), Math.abs(elevAt(reg.c[0] - 30, reg.c[1]) - e0c),
          Math.abs(elevAt(reg.c[0], reg.c[1] + 30) - e0c), Math.abs(elevAt(reg.c[0], reg.c[1] - 30) - e0c));
        reg.ruggedness = clamp(Math.round(g4c * 4.6 + (e0c > 60 ? (e0c - 60) * 0.7 : 0) + rugNoise() * 26), 0, 100);
      });

      // R1: the river finds its bed. The chain above stays the DRINKING
      // ORDER society reads — untouched. The BED is additive geology: a
      // fine polyline walked downhill over the continuous elevAt field,
      // bent through the chain regions in order, ending only in the water
      // or off the box. Walked HERE, not at chain time, because the bed
      // must read the negotiated sea and the relocated anchors.
      // (segCross + cutSelfLoops are hoisted to this scope so the final
      // cross-river repair pass below can re-simplify beds it splices.)
      const segCross = (a, b, c, d) => {
        const rX = b[0] - a[0], rY = b[1] - a[1], sX = d[0] - c[0], sY = d[1] - c[1];
        const den = rX * sY - rY * sX;
        if (!den) return null;
        const t = ((c[0] - a[0]) * sY - (c[1] - a[1]) * sX) / den;
        const u = ((c[0] - a[0]) * rY - (c[1] - a[1]) * rX) / den;
        if (t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6)
          return [round2(a[0] + rX * t), round2(a[1] + rY * t)];
        return null;
      };
      const cutSelfLoops = (T, protectRings) => {
        const rings = protectRings || [];
        for (let guard = 0; guard < 60; guard++) {
          let cut = false;
          for (let i = 0; i < T.length && !cut; i++)
            for (let k = i + 2; k < T.length; k++)
              if (Math.hypot(T[k][0] - T[i][0], T[k][1] - T[i][1]) < 7) {
                T = T.slice(0, i + 1).concat(T.slice(k + 1)); cut = true; break;
              }
          if (!cut) break;
        }
        for (let guard = 0; guard < 60; guard++) {
          let done = true;
          outer:
          for (let i = 0; i + 1 < T.length; i++)
            for (let k = i + 2; k + 1 < T.length; k++) {
              if (i === 0 && k + 1 === T.length - 1) continue;
              const p = segCross(T[i], T[i + 1], T[k], T[k + 1]);
              if (!p) continue;
              const head = T.slice(0, i + 1), tail = T.slice(k + 1);
              const span = T.slice(i + 1, k + 1);
              const rescue = [];
              const wouldCross = (pt) =>
                segCross(head[head.length - 1], p, pt, tail[0] || pt);
              for (const ring of rings) {
                const stillIn = q => pointInRing(q[0], q[1], ring);
                if (head.some(stillIn) || tail.some(stillIn)) continue;
                const keepPt = span.find(stillIn);
                if (keepPt && !wouldCross(keepPt)) rescue.push(keepPt);
              }
              T = head.concat([p], rescue, tail);
              done = false; break outer;
            }
          if (done) break;
        }
        return T;
      };
      {
        const rt = sg("rivertrace");
        // cross-track wander: a pure function of place, no stream consumed
        const wob = (x, y, k) => {
          const s2 = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453;
          return (s2 - Math.floor(s2)) * 2 - 1;
        };
        // excise self-intersections from a polyline: the earliest later
        // segment that cuts an earlier one closes an oxbow; splice both to
        // the crossing point and drop the loop between. Repeat until simple.
        // CAP is the meandering budget: a sinuous bed is LONGER than a
        // straight one (sinuosity up to ~2), so the walk needs headroom to
        // reach the sea before "forced" trips and rules a straight line.
        // 700 covers a 2x-sinuous crossing of the whole map at 9-unit steps.
        const STEP = 9, CAP = 700, PULL = 6.5;
        // the mouth aims at the SHORE the map actually draws, and takes the
        // LOW road to it: shore vertices score by distance plus midpoint
        // elevation, so the run-out rounds a coastal rise into the next bay
        // instead of climbing straight over it
        const seaVerts = [];
        seaShapes.forEach(S => S.outer.forEach(v => seaVerts.push(v)));
        const seaTarget = (x, y, banned) => {
          let best = null, bsc = Infinity;
          for (let i = 0; i < seaVerts.length; i += 3) {
            const v = seaVerts[i];
            if (banned && banned.has(v[0] + ":" + v[1])) continue; // proved a dry corner
            const d = Math.hypot(v[0] - x, v[1] - y);
            if (d >= bsc) continue; // sc >= d: cannot win
            const sc = d + 3 * elevAt((x + v[0]) / 2, (y + v[1]) / 2);
            if (sc < bsc) { bsc = sc; best = v; }
          }
          if (best) return best;
          let bd = Infinity;
          best = [x, 0];
          for (const side of seaSides) { // no traced sea at all: the border ends it
            const p = side === "west" ? [0, y] : side === "east" ? [WX, y] : side === "south" ? [x, 0] : [x, WY];
            const d = Math.hypot(p[0] - x, p[1] - y);
            if (d < bd) { bd = d; best = p; }
          }
          return best;
        };
        // beds already walked: a later river that touches one MERGES into it
        // (rivers join and share the downstream course; they never cross)
        const tracedBeds = [];
        for (const RV of rivers) {
          const chain = RV.chain;
          const head = regions[chain[0]];
          // source: ~12 candidates fanned over the head cell; the highest
          // dry ground above the anchor wins, else the anchor stands
          let sx2 = head.c[0], sy2 = head.c[1], se2 = elevAt(sx2, sy2);
          for (let s2 = 0; s2 < 12; s2++) {
            const v = head.ring[Math.floor(rt() * (head.ring.length - 1))];
            const tt = 0.2 + rt() * 0.7;
            const px = head.c[0] + (v[0] - head.c[0]) * tt, py = head.c[1] + (v[1] - head.c[1]) * tt;
            const pe = elevAt(px, py);
            if (!inSeaPoly(px, py) && pe > se2) { se2 = pe; sx2 = px; sy2 = py; }
          }
          // the walker starts pointed DOWNHILL, not east: th0 seeds every
          // turn-continuity rule below, so its first value must be physical
          const g0x = elevAt(sx2 + 6, sy2) - elevAt(sx2 - 6, sy2);
          const g0y = elevAt(sx2, sy2 + 6) - elevAt(sx2, sy2 - 6);
          let x = sx2, y = sy2, ci = 0, th0 = Math.atan2(-g0y, -g0x);
          // MEANDER STATE (sine-generated curve, Langbein & Leopold 1966):
          // a river's direction swings sinusoidally with distance along the
          // bed; that oscillation, not noise, is what a meander IS. The
          // wavelength scales with the river's size (bigger rivers swing
          // wider, not faster) and the amplitude is gated by local slope
          // below: steep reaches run straight, floodplains swing hard.
          let meaPhase = rt() * 2 * Math.PI;
          // wavelength ~11x channel width (Leopold & Wolman)
          const meaLambda = 55 + chain.length * 4 + rt() * 30; // wavelength, map units
          const pts = [[x, y]];
          const intoWater = (dx2, dy2) => { // 2 extra steps: the mouth visibly enters the sea
            for (let e2 = 0; e2 < 2; e2++) {
              const nx2 = clamp(x + dx2 * STEP, 0, WX), ny2 = clamp(y + dy2 * STEP, 0, WY);
              if (!inSeaPoly(nx2, ny2)) break; // never back OUT onto an island bank
              x = nx2; y = ny2;
              pts.push([x, y]);
            }
          };
          let forced = false; // fallback mode: straight for the sea, never die mid-land
          let sinceAdv = 0;   // steps since the walker last made real progress
          let finalSteps = 0; // steps spent past the last chain cell
          let burst = 0;      // terrain-blind steps: punch through a stalemate wall
          let shoreTgt = null, shoreAge = 0; // the scored shore pick, re-scored every 10 steps
          let banned = null;  // shore vertices that turned out to be dry corners
          // a chain-level tributary runs at its trunk's bed, not at the sea
          const trunkBed = (RV.confluenceInto !== undefined && RV.confluenceInto >= 0)
            ? ((rivers.find(t => t.id === RV.confluenceInto) || {}).trace || null) : null;
          const nearestBedPt = (bed) => {
            let bp = bed[0], bd = Infinity;
            for (const p of bed) { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; bp = p; } }
            return bp;
          };
          // the tributary's confluence AIM is fixed once, at the trunk point
          // nearest its LAST chain anchor (the point it is already heading
          // toward), not the perpetually-nearest trunk point. Re-picking the
          // nearest each step lets the run-out turn BACK upstream and cross
          // its own bed; a fixed forward aim keeps the join ahead of it.
          let trunkAim = null;
          if (trunkBed && trunkBed.length) {
            const lastAnchor = regions[chain[chain.length - 1]].c;
            let bd = Infinity;
            for (const p of trunkBed) {
              const d = Math.hypot(p[0] - lastAnchor[0], p[1] - lastAnchor[1]);
              if (d < bd) { bd = d; trunkAim = p; }
            }
          }
          let merged = false; // ended by joining an earlier bed, not by reaching water
          // an earlier bed repels the walker at close range: skirting inside
          // the simplifier's tolerance would let the straightened line cross
          const nearBed = (qx, qy, r) => {
            for (const TB of tracedBeds)
              for (let si = 0; si + 1 < TB.pts.length; si++) {
                const a = TB.pts[si], b = TB.pts[si + 1];
                const abx = b[0] - a[0], aby = b[1] - a[1];
                const t = Math.max(0, Math.min(1, ((qx - a[0]) * abx + (qy - a[1]) * aby) / (abx * abx + aby * aby || 1)));
                const ddx = a[0] + abx * t - qx, ddy = a[1] + aby * t - qy;
                if (ddx * ddx + ddy * ddy < r * r) return true;
              }
            return false;
          };
          for (let step = 1; step <= CAP + 220; step++) {
            const corridorLive = !forced && ci + 1 < chain.length;
            if (!corridorLive) finalSteps++;
            let tgt;
            if (corridorLive) tgt = regions[chain[ci + 1]].c;
            else if (trunkAim) tgt = trunkAim;               // fixed forward aim at the trunk join
            else if (trunkBed) tgt = nearestBedPt(trunkBed); // (fallback) seek the trunk
            else {
              if (!shoreTgt || shoreAge >= 10) { shoreTgt = seaTarget(x, y, banned); shoreAge = 0; }
              shoreAge++;
              tgt = shoreTgt;
            }
            meaPhase += (2 * Math.PI * STEP) / meaLambda; // one advance per step
            // THE PULL FOLLOWS A SINUOUS AIM, not a straight one. Offsetting
            // the target point sideways by the meander phase means the very
            // force that guarantees cell service now traces the meander
            // itself, instead of the meander having to fight a straight pull
            // (which the DP simplifier then flattens back into a ruled line).
            // Amplitude is slope-gated and scaled to how far the target is,
            // so a long corridor leg bows in proportion and a short in-cell
            // hop stays tame. Off steep ground the gate closes and the aim
            // is straight down the valley, as a real channel runs.
            let tgtX = tgt[0], tgtY = tgt[1];
            {
              const rawL = Math.hypot(tgt[0] - x, tgt[1] - y) || 1;
              const gxa = elevAt(x + 6, y) - elevAt(x - 6, y);
              const gya = elevAt(x, y + 6) - elevAt(x, y - 6);
              const flata = 1 / (1 + (Math.hypot(gxa, gya) / 12) * 18);
              // STABILITY BOUND: a sine curve A*sin(2*pi*s/lambda) never folds
              // back on itself (never crosses its own bed) only while its peak
              // offset A stays under lambda/pi. Past that the loop closes and
              // the trace self-intersects, which was the over-wiggle defect.
              // Cap the offset there (with margin), so the meander is as wide
              // as it can be while staying a simple, non-crossing curve.
              const ampCap = meaLambda / Math.PI * 0.85;
              const amp = Math.min(0.32 * flata * Math.min(rawL, 140), ampCap);
              const nxa = -(tgt[1] - y) / rawL, nya = (tgt[0] - x) / rawL;
              const off = amp * Math.sin(meaPhase);
              tgtX = tgt[0] + nxa * off; tgtY = tgt[1] + nya * off;
            }
            const tdx = tgtX - x, tdy = tgtY - y, tL = Math.hypot(tdx, tdy) || 1;
            let bth;
            if (forced || burst > 0) {
              // march at the target: gravity lost the argument. But a bare
              // atan2 rules a dead-straight line to the shore, the single
              // ugliest artifact on the map. Keep the meander phase swinging
              // the heading so even a forced run-out arrives with the same
              // curve as a free one; the target bias still guarantees it
              // reaches water. (burst, a short wall-punch, stays straight.)
              if (forced) {
                const fgx = elevAt(x + 6, y) - elevAt(x - 6, y), fgy = elevAt(x, y + 6) - elevAt(x, y - 6);
                const fflat = 1 / (1 + (Math.hypot(fgx, fgy) / 12) * 18);
                bth = Math.atan2(tdy, tdx) + 0.9 * fflat * Math.sin(meaPhase);
              } else bth = Math.atan2(tdy, tdx);
              if (burst > 0) burst--;
              if (forced && tL < STEP * 1.2) {
                // arrived at the vertex still dry (a marching-squares land
                // corner): step onto the wet side, or ban it and re-score
                let wetTh = null;
                for (let k = 0; k < 16 && wetTh === null; k++) {
                  const th = (k / 16) * 2 * Math.PI;
                  if (inSeaPoly(x + Math.cos(th) * STEP, y + Math.sin(th) * STEP)) wetTh = th;
                }
                if (wetTh !== null) bth = wetTh;
                else { (banned = banned || new Set()).add(tgt[0] + ":" + tgt[1]); shoreTgt = null; }
              }
            } else {
              // THE PULL is a rescue force, not a steering wheel. At full
              // strength it beelines the walker at a fixed target point, and
              // that straight aim (not the gradient, not a weak meander) is
              // what pinned run-out beds into ruler lines. So: while the
              // corridor is live the pull must still visit each chain cell,
              // but on the free run to the sea it drops to a whisper and
              // only swells back when the walker actually STALLS (sinceAdv
              // climbs against a basin lip). A flowing river is left to the
              // terrain and its own meander; a stuck one gets hauled out.
              // even in the corridor the pull only needs to make the walker
              // ENTER the next cell (a whole region wide), not aim at its
              // centroid: a gentler steady pull lets the bed bow between
              // cells instead of ruling a line from anchor to anchor. On the
              // free run to the sea it drops to a whisper. The stall ramp
              // still hauls hard out of a true basin.
              const basePull = corridorLive ? 3.5 : 1.2;
              const pull = Math.min(30, basePull + 0.6 * sinceAdv);
              // MEANDER TERM: advance the phase with arc length and gate the
              // amplitude by local slope. Real channels hold their bend
              // radius near 2-3 widths, so a hard turn cap rides along: a
              // river leans, it never jinks. On steep ground the gradient
              // term dwarfs the (near-zero) meander weight and the bed runs
              // straight down its valley, which is also what real ones do.
              const gx3 = elevAt(x + 6, y) - elevAt(x - 6, y);
              const gy3 = elevAt(x, y + 6) - elevAt(x, y - 6);
              const slope3 = Math.hypot(gx3, gy3);       // elevation units per ~12
              const flat3 = 1 / (1 + (slope3 / 12) * 18); // 1 on plains, ~0 on walls
              // the aim (tdx,tdy) already points at the sinuous offset
              // target, so it carries most of the meander; this reinforces
              // it in the same phase. The two together are tuned as a pair
              // (measured: 18% of rivers keep a >200u straight, worst 387u,
              // max sinuosity in band) and are sensitive, so change them
              // together against the straightsweep + sinmax harnesses.
              const thPref = Math.atan2(tdy, tdx) + 1.15 * flat3 * Math.sin(meaPhase);
              // meander weight, gated by slope (straight in gorges, free on
              // plains). With the shore-pull no longer beelining the run-out,
              // this is now the dominant lateral force on gentle ground.
              const meaW = 11 * flat3;
              // 16 compass probes at step radius: steepest descent, bent
              // toward the corridor target, swung by the meander phase.
              // A second probe at 2.5x radius gives the walker foresight:
              // it aims at saddles instead of climbing the nearest crest.
              let bs = Infinity;
              bth = th0;
              for (let k = 0; k < 16; k++) {
                const th = (k / 16) * 2 * Math.PI;
                const dx2 = Math.cos(th), dy2 = Math.sin(th);
                const px = x + dx2 * STEP, py = y + dy2 * STEP;
                let sc = 0.6 * elevAt(px, py) + 0.4 * elevAt(x + dx2 * STEP * 2.5, y + dy2 * STEP * 2.5)
                  - pull * (dx2 * tdx + dy2 * tdy) / tL
                  + meaW * (1 - Math.cos(th - thPref)) + 0.3 * wob(px, py, k);
                // curvature bound: more than ~67 degrees in one 9-unit step
                // is a bend radius no channel holds; soft wall, the stall
                // and burst machinery still handle a true dead end
                const dth = Math.abs(Math.atan2(Math.sin(th - th0), Math.cos(th - th0)));
                if (dth > 3 * Math.PI / 8) sc += 500;
                // the corridor outranks the water: while chain cells remain
                // the sea is a wall too — the bed skirts the bay to reach
                // every region that drinks from it
                if (corridorLive && inSeaPoly(px, py)) sc += 1000;
                // another river's bed is a wall while the corridor is live;
                // meeting it is a decision (the merge below), not a drift
                if (corridorLive && tracedBeds.length && nearBed(px, py, 6)) sc += 400;
                if (px < 0 || px > WX || py < 0 || py > WY) {
                  // dry borders are walls; only a sea side lets the river
                  // out, and never before the corridor is complete
                  const wetExit = (px < 0 && seaSides.includes("west")) || (px > WX && seaSides.includes("east")) ||
                    (py < 0 && seaSides.includes("south")) || (py > WY && seaSides.includes("north"));
                  if (corridorLive || !wetExit) sc += 1000;
                }
                if (sc < bs) { bs = sc; bth = th; }
              }
            }
            th0 = bth;
            const dxs = Math.cos(bth), dys = Math.sin(bth);
            const px2 = x, py2 = y;
            x += dxs * STEP; y += dys * STEP;
            // NEVER CROSS an earlier bed: two rivers meeting become one.
            // If this step would cut another river, end HERE, at the cut
            // (a confluence), and release any chain cells left unserved.
            {
              let cut = null;
              for (const TB of tracedBeds) {
                for (let si = 0; si + 1 < TB.pts.length && !cut; si++) {
                  const c = TB.pts[si], d = TB.pts[si + 1];
                  const rX = x - px2, rY = y - py2, sX = d[0] - c[0], sY = d[1] - c[1];
                  const den = rX * sY - rY * sX;
                  if (!den) continue;
                  const t = ((c[0] - px2) * sY - (c[1] - py2) * sX) / den;
                  const u = ((c[0] - px2) * rY - (c[1] - py2) * rX) / den;
                  if (t >= 0 && t <= 1 && u >= 0 && u <= 1)
                    cut = { id: TB.id, p: [round2(px2 + rX * t), round2(py2 + rY * t)] };
                }
                if (cut) break;
              }
              if (cut) {
                pts.push(cut.p);
                RV.confluenceInto = cut.id;
                merged = true;
                if (ci + 1 < chain.length) { // the tail past the junction is not this river's water
                  for (let k = ci + 1; k < chain.length; k++) {
                    const r2 = regions[chain[k]];
                    r2.onRiver = 0; r2.riverId = -1; r2.riverPos = -1;
                  }
                  chain.length = ci + 1;
                }
                break;
              }
            }
            pts.push([x, y]);
            if (ci + 1 < chain.length && pointInRing(x, y, regions[chain[ci + 1]].ring)) { ci++; sinceAdv = 0; }
            else sinceAdv++;
            // CONFLUENCE: past its corridor, a bed that touches an earlier bed
            // joins it and ends there. Two rivers meeting become one river;
            // they do not braid, cross, or race each other to the same bay
            if (!corridorLive && pts.length > 3) {
              // distance to the bed's SEGMENTS: a simplified straight reach
              // has sparse points, and a crossing must not slip between them
              let met = null;
              for (const TB of tracedBeds) {
                for (let si = 0; si + 1 < TB.pts.length && !met; si++) {
                  const a = TB.pts[si], b = TB.pts[si + 1];
                  const abx = b[0] - a[0], aby = b[1] - a[1];
                  const t = Math.max(0, Math.min(1, ((x - a[0]) * abx + (y - a[1]) * aby) / (abx * abx + aby * aby || 1)));
                  const qx = a[0] + abx * t, qy = a[1] + aby * t;
                  if (Math.hypot(qx - x, qy - y) < STEP * 1.4) met = { id: TB.id, p: [round2(qx), round2(qy)] };
                }
                if (met) break;
              }
              if (met) {
                pts.push(met.p); // land exactly on the trunk's centerline
                RV.confluenceInto = met.id;
                merged = true;
                break;
              }
            }
            // only a served corridor (or the forced fallback) may end wet —
            // a burst can hop a submerged strait mid-corridor and walk on
            if ((forced || ci + 1 >= chain.length) && inSeaPoly(x, y)) { intoWater(dxs, dys); break; }
            if (x < 0 || x > WX || y < 0 || y > WY) { pts[pts.length - 1] = [clamp(x, 0, WX), clamp(y, 0, WY)]; break; }
            // tight loop OR a lap around a wide basin: both are stuck
            const orbit = (pts.length > 12 && Math.hypot(x - pts[pts.length - 13][0], y - pts[pts.length - 13][1]) < STEP) ||
              (pts.length > 40 && Math.hypot(x - pts[pts.length - 41][0], y - pts[pts.length - 41][1]) < 3 * STEP);
            if (!forced && (step >= CAP || finalSteps > 320 || (orbit && ci + 1 >= chain.length))) forced = true;
            else if (orbit && corridorLive && burst === 0) burst = 8; // wall stalemate: punch through
          }
          // absolute fallback (never observed in measurement, kept for the
          // guarantee): if even the forced walk ran out, end ON the border —
          // a river may leave the map, it may not die mid-land
          if (!merged && !trunkBed && !inSeaPoly(x, y) && x > 0 && x < WX && y > 0 && y < WY) {
            const dW = Math.min(x, WX - x), dH = Math.min(y, WY - y);
            pts.push(dW <= dH ? [x < WX - x ? 0 : WX, y] : [x, y < WY - y ? 0 : WY]);
          }
          let rpts = pts.map(p => [round2(clamp(p[0], 0, WX)), round2(clamp(p[1], 0, WY))]);
          // SELF-CROSSING GUARANTEE, applied to the RAW walk before anything
          // else reads it: a river never crosses its own bed. Where a later
          // segment cuts an earlier one it closes an oxbow; splice both to
          // the crossing and drop the loop between (exactly how a real river
          // cuts an oxbow off). Done here, before the chain-service points
          // are chosen, so a de-looped path is what gets sampled and every
          // chain region is still served by a surviving visit (the chain
          // rings are protected: a loop-cut keeps a point in any cell it
          // would otherwise orphan).
          const chainRings = chain.map(ri => regions[ri].ring);
          rpts = cutSelfLoops(rpts, chainRings);
          // per chain cell, keep the walk point nearest its anchor: the
          // simplified bed still testably visits every region it waters
          const keep = [];
          for (const ri of chain) {
            let bi = -1, bd2 = Infinity;
            for (let i = 0; i < rpts.length; i++) {
              if (!pointInRing(rpts[i][0], rpts[i][1], regions[ri].ring)) continue;
              const d = Math.hypot(rpts[i][0] - regions[ri].c[0], rpts[i][1] - regions[ri].c[1]);
              if (d < bd2) { bd2 = d; bi = i; }
            }
            if (bi >= 0) keep.push(bi);
          }
          RV.trace = dpSimplify(rpts, 2.5, keep);
          // a chain-level tributary that somehow ran out of steps still ends
          // ON its trunk, never hanging mid-land (the merge above is the
          // normal ending; this is the guarantee)
          if (trunkBed && !merged && RV.trace.length) {
            RV.trace.push(nearestBedPt(trunkBed).slice());
            RV.trace = cutSelfLoops(RV.trace, chainRings); // the join step must not re-cross
          }
          // CHAIN / BED CONSISTENCY: excising a fold can drop the only visit
          // to a chain region, because serving that region REQUIRED the
          // doubled-back excursion the excision removed. Such a region was a
          // geographic hairpin that never belonged on a sound course, so it
          // leaves the chain: prune it (and its society bookkeeping) so the
          // drinking order and the drawn bed always agree. The source (k=0)
          // and any region still visited stay; only genuinely orphaned
          // interior/tail cells are cut.
          {
            // Excision can drop the only visit to a chain region (serving it
            // needed the doubled-back excursion that was cut). Prune such an
            // orphaned region and its bookkeeping so the drinking order and
            // the drawn bed agree. But NEVER prune the mouth region (the last
            // chain cell): the river's ending is anchored there, and dropping
            // it would leave the bed dying inland. If the mouth is the orphan,
            // leave the chain intact and trust the ending the walk already
            // built (sea / border / confluence) rather than cut the terminus.
            const visits = (k) => RV.trace.some(([px, py]) => pointInRing(px, py, regions[chain[k]].ring));
            // prune EVERY chain region the drawn bed never enters, mouth
            // included: when the terrain sends the bed to a different exit than
            // the chain's last cell (the mountain field can reroute a river),
            // that last cell is a stranded orphan, not a real mouth, and must
            // leave the chain or the drinking order and the bed disagree.
            for (let k = chain.length - 1; k >= 1; k--) {
              if (visits(k)) continue;
              const dropped = regions[chain[k]];
              dropped.onRiver = 0; dropped.riverId = -1; dropped.riverPos = -1;
              chain.splice(k, 1);
            }
            chain.forEach((ri, k) => { regions[ri].riverPos = k; });
            // if that left a trunk below two regions, adopt the regions the
            // bed ACTUALLY crosses as the chain (in bed order), so a river is
            // always the places its water truly touches, never fewer.
            if (chain.length < 2 && (RV.confluenceInto === undefined || RV.confluenceInto < 0)) {
              const crossed = [];
              for (const p of RV.trace) {
                const hit = regions.findIndex(rg => pointInRing(p[0], p[1], rg.ring));
                if (hit >= 0 && !crossed.includes(hit)) crossed.push(hit);
              }
              if (crossed.length >= 2) {
                chain.forEach(ri => { const r = regions[ri]; if (!crossed.includes(ri)) { r.onRiver = 0; r.riverId = -1; r.riverPos = -1; } });
                chain.length = 0; crossed.forEach((ri, k) => { chain.push(ri); const r = regions[ri]; r.onRiver = 1; r.riverId = RV.id; r.riverPos = k; });
              }
            }
          }
          // ABSOLUTE GUARANTEE: one final unprotected excision. Chain service
          // is already secured above, so this can only remove a residual loop
          // the junction approach or a protected rescue left behind. After
          // this the bed is a simple, non-self-crossing polyline, always.
          RV.trace = cutSelfLoops(RV.trace);
          tracedBeds.push({ id: RV.id, pts: RV.trace });
        }
      }
      // THE INVARIANT: no bed crosses an earlier bed, ever. The walk already
      // refuses to (it merges instead), but the simplifier can straighten an
      // approach across a trunk elbow right at the junction. So the final
      // traces are checked once more, and a crossing is cut AT the crossing:
      // that point on the trunk becomes the junction.
      for (let ri2 = 1; ri2 < rivers.length; ri2++) {
        const T2 = rivers[ri2].trace || [];
        let cutAt = -1, cutP = null, cutInto = -1;
        for (let a2 = 0; a2 + 1 < T2.length && cutAt < 0; a2++) {
          let bestT = Infinity;
          for (let rj = 0; rj < ri2; rj++) {
            const U2 = rivers[rj].trace || [];
            for (let b2 = 0; b2 + 1 < U2.length; b2++) {
              const rX = T2[a2 + 1][0] - T2[a2][0], rY = T2[a2 + 1][1] - T2[a2][1];
              const sX = U2[b2 + 1][0] - U2[b2][0], sY = U2[b2 + 1][1] - U2[b2][1];
              const den = rX * sY - rY * sX;
              if (!den) continue;
              const t = ((U2[b2][0] - T2[a2][0]) * sY - (U2[b2][1] - T2[a2][1]) * sX) / den;
              const u = ((U2[b2][0] - T2[a2][0]) * rY - (U2[b2][1] - T2[a2][1]) * rX) / den;
              // the junction endpoint itself sits ON the trunk: t just below 1
              // there is the meeting we built, not a crossing to repair
              if (t > 0.001 && t < 0.999 && u >= 0 && u <= 1 && t < bestT) {
                bestT = t;
                cutAt = a2; cutInto = rivers[rj].id;
                cutP = [round2(T2[a2][0] + rX * t), round2(T2[a2][1] + rY * t)];
              }
            }
          }
        }
        if (cutAt >= 0) {
          rivers[ri2].trace = T2.slice(0, cutAt + 1).concat([cutP]);
          rivers[ri2].confluenceInto = cutInto;
        }
      }
      // FINAL self-simplification: the cross-river repair above can leave a
      // tiny spur or a fold where it spliced in the junction point. One last
      // spur-collapse + self-loop excision on every bed makes the guarantee
      // absolute: no bed self-crosses and none doubles back on a point.
      rivers.forEach(RV => { if (RV.trace && RV.trace.length > 3) RV.trace = cutSelfLoops(RV.trace); });
      // CHAIN IS THE SINGLE SOURCE OF TRUTH: pruning and re-derivation above
      // mutate both the chain arrays and each region's on_river bookkeeping,
      // and a mismatch (a region left in a chain but flagged off-river, or
      // vice versa) breaks downstream invariants (blight rides the chain,
      // stress checks on_river against the river fields). Reconcile once, at
      // the end: a region is on-river IFF it sits in exactly one final chain.
      // A region belongs to EXACTLY ONE chain, and each chain must stay a
      // strictly-descending drinking order. A confluence can leave the same
      // region in two rivers' chains (the trunk cell a tributary fed). Simply
      // deleting the shared cell from the later chain would splice two
      // non-adjacent cells together and can read as flowing uphill. Instead:
      // where a chain first hits a cell an earlier river already claimed, that
      // is its CONFLUENCE, so TRUNCATE the chain just before it (the shared
      // cell belongs to the trunk) and record the join. Contiguous river_pos
      // and monotone descent both survive, and chain_regions length matches
      // the on-river count.
      regions.forEach(reg => { reg.onRiver = 0; reg.riverId = -1; reg.riverPos = -1; });
      // MONOTONE DESCENT against the FINAL elevation: chains were built on the
      // pre-relocation field, but a wet cell gets moved to its driest dry
      // ground (sea negotiation), which can lift it above its upstream cell.
      // A river cannot climb to a relocated hilltop, so truncate each chain at
      // the first cell that is not strictly lower than the one before it.
      rivers.forEach(RV => {
        for (let k = 1; k < RV.chain.length; k++) {
          if (regions[RV.chain[k]].elevation >= regions[RV.chain[k - 1]].elevation) { RV.chain = RV.chain.slice(0, k); break; }
        }
      });
      const claimed = new Set();
      rivers.forEach(RV => {
        let cut = RV.chain.length;
        for (let k = 0; k < RV.chain.length; k++) if (claimed.has(RV.chain[k])) { cut = k; break; }
        if (cut < RV.chain.length) {
          // meets an elder river here: the join is that trunk cell's river
          const trunkRi = RV.chain[cut];
          if (regions[trunkRi].riverId >= 0 && (RV.confluenceInto === undefined || RV.confluenceInto < 0))
            RV.confluenceInto = regions[trunkRi].riverId;
          RV.chain = RV.chain.slice(0, cut);
        }
        RV.chain.forEach((ri, k) => {
          claimed.add(ri);
          const reg = regions[ri];
          reg.onRiver = 1; reg.riverId = RV.id; reg.riverPos = k;
        });
      });
      // a river truncated below two cells is no longer a river; drop it so
      // the stress "chain >= 2 for a trunk" and "no 1-cell river" hold. Its
      // tributaries (if any) re-home to the sea via their own bed ending.
      for (let i = rivers.length - 1; i >= 0; i--) {
        const RV = rivers[i];
        const isTrib = RV.confluenceInto !== undefined && RV.confluenceInto >= 0;
        if (RV.chain.length < (isTrib ? 1 : 2)) {
          RV.chain.forEach(ri => { const r = regions[ri]; r.onRiver = 0; r.riverId = -1; r.riverPos = -1; });
          rivers.forEach(t => { if (t.confluenceInto === RV.id) t.confluenceInto = -1; });
          rivers.splice(i, 1);
        }
      }
      // REINDEX after any splice: several readers use rivers[id] as a direct
      // array index (name composition, trace lookups), which the splice would
      // break. Reassign each surviving river's id to its array position and
      // remap every region's river_id and every confluence_into to match, so
      // rivers[id] === that river holds again everywhere downstream.
      {
        const oldToNew = new Map();
        rivers.forEach((RV, newId) => oldToNew.set(RV.id, newId));
        rivers.forEach((RV, newId) => {
          RV.id = newId;
          if (RV.confluenceInto !== undefined && RV.confluenceInto >= 0)
            RV.confluenceInto = oldToNew.has(RV.confluenceInto) ? oldToNew.get(RV.confluenceInto) : -1;
        });
        regions.forEach(reg => { if (reg.riverId >= 0) reg.riverId = oldToNew.has(reg.riverId) ? oldToNew.get(reg.riverId) : -1; });
      }
      // barge transport: consecutive river edges are cheap. Where the river
      // crosses a ridge it cuts a GORGE (passable, but pass-grade, not
      // barge-grade): the wall multiplier relaxes to the pass rate. Applied
      // AFTER the bed walk, on the chains a confluence may have shortened.
      rivers.forEach(RV => {
        for (let k = 0; k + 1 < RV.chain.length; k++) {
          const A = regions[RV.chain[k]], B = regions[RV.chain[k + 1]];
          const prev = A.ridgeMult.get(B.id) || 1;
          const m = prev > 1 ? PASS_MULT : RIVER_EDGE;
          A.ridgeMult.set(B.id, m);
          B.ridgeMult.set(A.id, m);
        }
      });
      // Discharge: accumulated rainfall along each river chain (headwater→mouth),
      // plus tributary contributions. Replaces the old chain-length-based flow
      // with actual water volume from the climate model.
      const FLUX_NAV = 40; // flux threshold for navigability
      regions.forEach(reg => { reg.riverFlux = 0; reg.riverNavigable = 0; });
      rivers.forEach(RV => {
        let acc = 0;
        for (const ridx of RV.chain) {
          const reg = regions[ridx]; if (!reg) continue;
          acc += reg.rainfall;
          reg.riverFlux = Math.max(reg.riverFlux, Math.round(acc / 5));
        }
        RV.flow = Math.round(acc / 5);
      });
      rivers.forEach(RV => {
        if (RV.confluenceInto === undefined || RV.confluenceInto < 0) return;
        const trunk = rivers.find(t => t.id === RV.confluenceInto);
        if (trunk) trunk.flow += RV.flow; // tributaries feed trunks
      });
      // Navigability: regions on a river whose accumulated flux clears the threshold
      regions.forEach(reg => {
        if (reg.riverFlux >= FLUX_NAV) reg.riverNavigable = 1;
      });

      // M1: every cell gets real PLACES. The waterfront: its lowest
      // boundary point, pulled just inside — where a harbor would stand.
      // And up to three dry wild sites away from the town — where the
      // ruins gape, the towers stand, the Temple fences its ground.
      regions.forEach(reg => {
        let low = null, lowE = Infinity;
        for (let k = 0; k + 1 < reg.ring.length; k++) {
          const v = reg.ring[k];
          const m = [(reg.ring[k][0] + reg.ring[k + 1][0]) / 2, (reg.ring[k][1] + reg.ring[k + 1][1]) / 2];
          for (const p of [v, m]) {
            const e2 = elevAt(p[0], p[1]);
            if (e2 < lowE) { lowE = e2; low = p; }
          }
        }
        reg.shorePt = [low[0] + (reg.c[0] - low[0]) * 0.06, low[1] + (reg.c[1] - low[1]) * 0.06];
        const dry = candsOf(reg)
          .map(p => ({ p, e: elevAt(p[0], p[1]), d: Math.hypot(p[0] - reg.c[0], p[1] - reg.c[1]) }))
          .filter(o => !inSeaPoly(o.p[0], o.p[1]))
          .sort((a2, b2) => b2.d - a2.d || a2.p[0] - b2.p[0]);
        reg.wildPt = dry.length > 0 ? dry[0].p : reg.c.slice();
        reg.towerPt = dry.length > 1 ? dry[1].p : reg.wildPt.slice();
        reg.sitePt = dry.length > 2 ? dry[2].p : reg.towerPt.slice();
      });

      // coastal = the cell touches the water (recomputable from the exports)
      const rRing4 = (ring) => ring.map(pt => [round2(pt[0]), round2(pt[1])]);
      // Pre-build contour segment set for fast distance queries
      const contourSegs = [];
      seaShapes.forEach(S => {
        for (let i = 0; i + 1 < S.outer.length; i++)
          contourSegs.push([S.outer[i], S.outer[i + 1]]);
        contourSegs.push([S.outer[S.outer.length - 1], S.outer[0]]);
      });
      const distToContour = (x, y) => {
        let best = Infinity;
        for (const [a, b] of contourSegs) {
          const dx = b[0] - a[0], dy = b[1] - a[1];
          const len2 = dx * dx + dy * dy;
          if (len2 < 1e-12) { const d = Math.hypot(x - a[0], y - a[1]); if (d < best) best = d; continue; }
          let t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / len2, 0, 1);
          const d = Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
          if (d < best) best = d;
        }
        return best;
      };
      // A region touches the coast if any ring vertex is inside the sea shape
      // (classic test) OR if any vertex lies within ~1.5 cells of the contour.
      const coastTouch = (ring) => {
        for (const S of seaShapes) {
          for (const v of ring)
            if (pointInRing(v[0], v[1], S.outer) && !S.holes.some(h => pointInRing(v[0], v[1], h))) return true;
          for (const v of S.outer) if (pointInRing(v[0], v[1], ring)) return true;
          for (let a2 = 0; a2 + 1 < ring.length; a2++)
            for (let b2 = 0; b2 + 1 < S.outer.length; b2++)
              if (segInt(ring[a2], ring[a2 + 1], S.outer[b2], S.outer[b2 + 1])) return true;
        }
        // Contour proximity: a near-miss on the smooth contour still counts
        const prox = Math.min(...ring.map(v => distToContour(v[0], v[1])));
        return prox < CSX * 1.5;
      };
      regions.forEach(reg => { reg.onCoast = coastTouch(rRing4(reg.ring)) ? 1 : 0; });

      // G4: CLIMATE — temperature falls with latitude and altitude; rainfall
      // marches in against the wind, drying with distance and raining out on
      // the windward slopes. The rain shadow is the mountain's second toll.
      const rc4 = sg("climate");
      const windRad4 = windDeg * Math.PI / 180;
      const wvx4 = Math.cos(windRad4), wvy4 = Math.sin(windRad4);
      regions.forEach(reg => {
        const [ax, ay] = reg.c;
        reg.temperature = clamp(Math.round(88 - 46 * (ay / WY) - 0.35 * reg.elevation + (rc4() - 0.5) * 8), 0, 100);
        let px = ax, py = ay, peak = 0, dist = 0;
        while (px >= -25 && px <= WX + 25 && py >= -25 && py <= WY + 25 && dist < 2200) {
          px -= wvx4 * 25; py -= wvy4 * 25; dist += 25;
          if (px >= 0 && px <= WX && py >= 0 && py <= WY) peak = Math.max(peak, elevAt(px, py));
        }
        const exitSide = px < 0 ? "west" : px > WX ? "east" : py < 0 ? "south" : "north";
        const fromSea = seaSides.includes(exitSide);
        const shadow = 0.5 * Math.max(0, peak - reg.elevation - 8);
        reg.rainfall = clamp(Math.round((fromSea ? 92 : 50) - 0.028 * dist - shadow + (rc4() - 0.5) * 10), 2, 100);
      });

      // WATER ACCESS: a region's water is not the binary "does a river cross
      // it". It is a GRADIENT from every source (river, lake, and the hidden
      // one, groundwater) that falls off with distance, so a town beside the
      // water still drinks (the floodplain is wider than the channel). This
      // replaces the old on_river flag as the fertility input, which restores
      // the watered ground a shorter (sounder) river would otherwise strand.
      // AQUIFER: low-frequency groundwater. History is full of civilizations
      // the rivers never reached (oasis wells, spring-fed hill towns), so a
      // slice of dry country sits on groundwater regardless of surface water.
      const aquiferField = bumpField(sg("aquifer"), 7, 70, 150);
      // nearest distance from a region anchor to any drawn river bed / lake
      // shore, in map units (rivers and lakes are already traced above)
      const nearWaterDist = (reg) => {
        let best = Infinity;
        for (const RV of rivers) for (const p of (RV.trace || [])) {
          const d = Math.hypot(p[0] - reg.c[0], p[1] - reg.c[1]);
          if (d < best) best = d;
        }
        for (const S of lakeShapes) for (const v of S.outer) {
          const d = Math.hypot(v[0] - reg.c[0], v[1] - reg.c[1]);
          if (d < best) best = d;
        }
        return best;
      };
      regions.forEach(reg => {
        // surface access: 100 on the water, tapering to 0 by ~140 units out
        // (roughly two region widths, the reach of a floodplain / a haul to
        // the river). on_river / on_lake anchor the full-access end.
        const surfD = (reg.onRiver === 1 || reg.onLake === 1) ? 0 : nearWaterDist(reg);
        const surface = clamp(Math.round(100 * Math.max(0, 1 - surfD / 140)), 0, 100);
        // groundwater: the aquifer field, thresholded so ~a fifth of the map
        // has usable groundwater; independent of surface water
        const aq = aquiferField(reg.c[0], reg.c[1]);       // ~[-1,1]
        reg.aquifer = aq > 0.25 ? 1 : 0;                   // usable groundwater here
        const ground = reg.aquifer ? clamp(Math.round(45 + 120 * (aq - 0.25)), 0, 80) : 0;
        // physical access is the best source available (you drink from
        // whichever is nearest); relationship-mediated denial comes later,
        // in the society stage, once blocs and wealth exist.
        reg.waterAccess = Math.max(surface, ground);
      });

      // G4: BIOME (ordered rules — exactly recomputable from the exports) and
      // FERTILITY, now DERIVED: rain + warmth + water access − altitude, with
      // a biome-habitability term so the land's character feeds its yield.
      const BIOME_DATA = {
        alpine:   { habitability: 10, moveCost: 1.5 },
        badland:  { habitability: 15, moveCost: 1.3 },
        moor:     { habitability: 40, moveCost: 1.1 },
        marsh:    { habitability: 25, moveCost: 1.4 },
        forest:   { habitability: 65, moveCost: 1.2 },
        steppe:   { habitability: 55, moveCost: 0.9 },
        grassland:{ habitability: 80, moveCost: 0.8 },
      };
      regions.forEach(reg => {
        reg.biome =
          reg.elevation >= 78 ? "alpine" :
          reg.rainfall < 25 ? "badland" :
          reg.temperature < 32 ? "moor" :
          (reg.onRiver === 1 && reg.elevation < 35) ? "marsh" :
          reg.rainfall >= 48 ? "forest" :
          reg.rainfall < 42 ? "steppe" : "grassland";
        const bd = BIOME_DATA[reg.biome] || { habitability: 50, moveCost: 1.0 };
        reg.biomeHabitability = bd.habitability;
        reg.biomeMoveCost = bd.moveCost;
        // rain is still the dominant term (the farms follow the rain); water
        // access is a SECONDARY input worth ~10 points at full access, so a
        // floodplain or a well lifts dry ground without decoupling fertility
        // from the climate that the rain-shadow story turns on. The biome
        // habitability term captures what the climate terms miss — marsh vs.
        // moor vs. badland — at similar rainfall levels.
        reg.fertility = clamp(Math.round(
          0.48 * reg.rainfall + 0.26 * Math.max(0, 100 - 1.8 * Math.abs(reg.temperature - 55)) +
          0.08 * reg.waterAccess + 0.12 * reg.biomeHabitability - (reg.elevation >= 78 ? 25 : 0)
        ), 0, 100);
      });

      // G4: contour lines for the map and the export (interpolated marching
      // squares on the elevation surface)
      const contours = [];
      for (const level of [seaLevel, 35, 50, 65, 80]) {
        const csegs = [];
        const lerp2 = (a, b, va, vb) => {
          const t = (level - va) / (vb - va || 1e-9);
          return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        };
        for (let gy = 0; gy < GN; gy++) for (let gx = 0; gx < GN; gx++) {
          const x0 = gx * CSX, y0 = gy * CSY, x1 = (gx + 1) * CSX, y1 = (gy + 1) * CSY;
          const vtl = nodeElev[gy][gx], vtr = nodeElev[gy][gx + 1], vbr = nodeElev[gy + 1][gx + 1], vbl = nodeElev[gy + 1][gx];
          const code = (vtl >= level ? 8 : 0) + (vtr >= level ? 4 : 0) + (vbr >= level ? 2 : 0) + (vbl >= level ? 1 : 0);
          if (code === 0 || code === 15) continue;
          const T = lerp2([x0, y0], [x1, y0], vtl, vtr), R3 = lerp2([x1, y0], [x1, y1], vtr, vbr),
                B = lerp2([x0, y1], [x1, y1], vbl, vbr), L3 = lerp2([x0, y0], [x0, y1], vtl, vbl);
          const add = (a, b) => csegs.push([[round2(a[0]), round2(a[1])], [round2(b[0]), round2(b[1])]]);
          if (code === 1 || code === 14) add(L3, B);
          else if (code === 2 || code === 13) add(B, R3);
          else if (code === 3 || code === 12) add(L3, R3);
          else if (code === 4 || code === 11) add(T, R3);
          else if (code === 5 || code === 10) { add(L3, T); add(B, R3); }
          else if (code === 6 || code === 9) add(T, B);
          else if (code === 7 || code === 8) add(L3, T);
        }
        if (csegs.length) contours.push({ level: Math.round(level), segs: csegs });
      }

      // M1: MOUNTAINS ARE MASS, not a line — hachure strokes down both
      // flanks of the uplift, ▲ peaks at the crests, and a finer set of
      // display-only contour lines (the exported set is unchanged).
      const contoursFine = [];
      for (const level of [28, 42, 58, 72, 88]) {
        const csegs = [];
        const lerp2 = (a, b, va, vb) => {
          const t = (level - va) / (vb - va || 1e-9);
          return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        };
        for (let gy = 0; gy < GN; gy++) for (let gx = 0; gx < GN; gx++) {
          const x0 = gx * CSX, y0 = gy * CSY, x1 = (gx + 1) * CSX, y1 = (gy + 1) * CSY;
          const vtl = nodeElev[gy][gx], vtr = nodeElev[gy][gx + 1], vbr = nodeElev[gy + 1][gx + 1], vbl = nodeElev[gy + 1][gx];
          const code = (vtl >= level ? 8 : 0) + (vtr >= level ? 4 : 0) + (vbr >= level ? 2 : 0) + (vbl >= level ? 1 : 0);
          if (code === 0 || code === 15) continue;
          const T = lerp2([x0, y0], [x1, y0], vtl, vtr), R3 = lerp2([x1, y0], [x1, y1], vtr, vbr),
                B = lerp2([x0, y1], [x1, y1], vbl, vbr), L3 = lerp2([x0, y0], [x0, y1], vtl, vbl);
          const add = (a, b) => csegs.push([[round2(a[0]), round2(a[1])], [round2(b[0]), round2(b[1])]]);
          if (code === 1 || code === 14) add(L3, B);
          else if (code === 2 || code === 13) add(B, R3);
          else if (code === 3 || code === 12) add(L3, R3);
          else if (code === 4 || code === 11) add(T, R3);
          else if (code === 5 || code === 10) { add(L3, T); add(B, R3); }
          else if (code === 6 || code === 9) add(T, B);
          else if (code === 7 || code === 8) add(L3, T);
        }
        if (csegs.length) contoursFine.push({ level, segs: csegs });
      }
      const hachures = [], peaks = [];
      for (const R of ridges) {
        const top = [];
        for (let k = 0; k + 1 < R.pts.length; k++) {
          const [x1, y1] = R.pts[k], [x2, y2] = R.pts[k + 1];
          const segL = Math.hypot(x2 - x1, y2 - y1);
          if (segL < 1) continue;
          const nx = -(y2 - y1) / segL, ny = (x2 - x1) / segL;
          for (let s2 = 7; s2 < segL; s2 += 13) {
            const qx = x1 + (x2 - x1) * s2 / segL, qy = y1 + (y2 - y1) * s2 / segL;
            const eq = elevAt(qx, qy);
            if (eq < 45) continue;
            const len = 6 + (eq - 45) * 0.35;
            for (const sgn of [1, -1])
              hachures.push([qx + nx * sgn * 5, qy + ny * sgn * 5, qx + nx * sgn * (5 + len), qy + ny * sgn * (5 + len)]);
            top.push({ x: qx, y: qy, e: eq });
          }
        }
        top.sort((a2, b2) => b2.e - a2.e || a2.x - b2.x);
        R.maxElev = top.length ? Math.round(top[0].e) : Math.round(elevAt(R.pts[0][0], R.pts[0][1]));
        for (const t2 of top) {
          if (peaks.length && peaks.some(pk => Math.hypot(pk.x - t2.x, pk.y - t2.y) < 70)) continue;
          peaks.push({ x: t2.x, y: t2.y });
          if (peaks.length >= 2 * ridges.length) break;
        }
      }

      // P1: bridges & fords — the river as a barrier ACROSS. At region
      // granularity all bank-to-bank travel passes THROUGH a river town, so
      // the crossing lives there: reaching a riverine region from dry land
      // means marsh, levee, and water — a ford (x2.2) — unless the town
      // carries a bridge (1-2 per river, sited blind at the flattest chain
      // towns; mid-chain preferred). Along the water the barge rules hold.
      const rb = sg("bridges");
      const bridges = [];
      const allChain = new Set();
      rivers.forEach(RV => RV.chain.forEach(ri => allChain.add(ri)));
      regions.forEach(reg => { reg.hasBridge = 0; });
      rivers.forEach(RV => {
        const nB = Math.min(RV.chain.length, 1 + (rb() < 0.4 ? 1 : 0));
        const scored = RV.chain.map((ri, k) => ({
          ri, s: 100 - regions[ri].ruggedness +
            (k > 0 && k < RV.chain.length - 1 ? 10 : 0) + (rb() - 0.5) * 10
        })).sort((x, y) => y.s - x.s || x.ri - y.ri);
        const bridgeSet = new Set(scored.slice(0, nB).map(o => o.ri));
        bridgeSet.forEach(ri => {
          regions[ri].hasBridge = 1;
          bridges.push({ id: bridges.length, riverId: RV.id, regionIdx: ri,
            x: round2(regions[ri].c[0]), y: round2(regions[ri].c[1]) });
        });
        RV.chain.forEach(ri => {
          if (bridgeSet.has(ri)) return;
          const A = regions[ri];
          for (const j of A.neighbors) {
            if (allChain.has(j)) continue; // along the water: barge rules
            const B = regions[j];
            const m = Math.max(A.ridgeMult.get(B.id) || 1, FORD_MULT);
            A.ridgeMult.set(B.id, m);
            B.ridgeMult.set(A.id, m);
          }
        });
      });

      // P1: relic ruins — the old world's structures, drawn in the deep
      // past. A DELVE in the old workings (dead lodes, ore country), a TOMB
      // in the high barrens, and sometimes a DEADHOLD: a city the old
      // cataclysm killed, whose ground still poisons.
      const ru = sg("ruins");
      const ruins = [];
      const takenR = new Set();
      const pickRuin = (scoreFn) => {
        let bi = -1, bs = -Infinity;
        regions.forEach((reg, i) => {
          if (takenR.has(i)) return;
          const s = scoreFn(reg);
          if (s > bs || (s === bs && (bi === -1 || i < bi))) { bs = s; bi = i; }
        });
        if (bi >= 0) takenR.add(bi);
        return bi;
      };
      const addRuin = (type, idx, perilLo, perilW, yieldLo, yieldW) => {
        if (idx < 0) return;
        ruins.push({ id: ruins.length, type, regionIdx: idx,
          peril: perilLo + Math.round(ru() * perilW), yield: yieldLo + Math.round(ru() * yieldW) });
      };
      addRuin("delve", pickRuin(reg => (reg.exhausted ? 60 : 0) + reg.endowment * 0.4 + (ru() - 0.5) * 8), 40, 30, 50, 40);
      addRuin("tomb", pickRuin(reg => reg.ruggedness * 0.3 + (100 - reg.fertility) * 0.3 + (ru() - 0.5) * 8), 55, 35, 40, 40);
      const third = ru();
      if (third < 0.4) {
        addRuin("delve", pickRuin(reg => (reg.exhausted ? 60 : 0) + reg.endowment * 0.4 + (ru() - 0.5) * 8), 40, 30, 50, 40);
      } else if (third < 0.75) {
        addRuin("deadhold", pickRuin(reg => (100 - reg.fertility) * 0.25 + (100 - reg.elevation) * 0.15 + (ru() - 0.5) * 10), 75, 20, 60, 30);
      }

      // P1: the maelstrom — half of worlds carry a turning of the sea
      const rm = sg("maelstrom");
      let maelstrom = null;
      if (rm() < 0.5) {
        const side = seaSides[Math.floor(rm() * seaSides.length)];
        const t = round2(200 + rm() * 600);
        maelstrom = { side,
          x: side === "west" ? 0 : side === "east" ? WX : t,
          y: side === "south" ? 0 : side === "north" ? WY : t };
      }

      return { windDeg, ridges, passes, rivers, seaSides, bridges, ruins, maelstrom, seaShapes, lakeShapes, seaLevel, contours, contoursFine, hachures, peaks };
    }

    // ---- Cost-distance over the adjacency graph (Dijkstra, O(n^2)) ----------
    // Edge cost = centroid distance x (1 + FRICTION x mean ruggedness). This is
    // the friction surface at region granularity: rugged country is "farther".
    function edgeCost(a, b) {
      const d = Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1]);
      const wall = a.ridgeMult ? (a.ridgeMult.get(b.id) || 1) : 1; // G1: the mountains are in the graph
      return d * (1 + FRICTION * ((a.ruggedness + b.ruggedness) / 200)) * wall;
    }
    // Multi-source: every index in fromIdxs starts at 0. Returns parents too,
    // so least-cost paths (the conduit trunk) can be reconstructed.
    function costDistances(regions, fromIdxs) {
      const n = regions.length;
      const dist = new Array(n).fill(Infinity);
      const parent = new Array(n).fill(-1);
      const done = new Array(n).fill(false);
      for (const i of fromIdxs) dist[i] = 0;
      for (let it = 0; it < n; it++) {
        let u = -1, best = Infinity;
        for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
        if (u === -1) break;
        done[u] = true;
        for (const v of regions[u].neighbors) {
          if (done[v]) continue;
          const w = edgeCost(regions[u], regions[v]);
          if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; parent[v] = u; }
        }
      }
      return { dist, parent };
    }

    // ---- Stage 3: society ----------------------------------------------------
    // Order per the DAG: seat -> centrality -> refining -> retention -> wealth
    // -> skeleton -> population. No step reads anything computed after it.
    function applyAttributes(regions, params, geo) {
      const sx = streams(params.seed);
      // A2 (#119): the fate seed — same rock, different luck. The world's
      // POLITICS (events, factions, institutions, revolts, the Dominion, the
      // dynasties) draw from fx; its geology, founding, siting and naming stay
      // on sx. Empty fate falls back to the seed, so fx === sx draw-for-draw and
      // the default world is byte-identical — the pivot the fixture pin proves.
      const fx = streams(params.fate || params.seed);
      // E1 (#142): the governor's reign, read from the hash. Consumes no randomness.
      const reign = makeReign(params);

      // STAGE-3 PURITY (C1): the loop writes depletion back into
      // reg.endowment for the export, so a SECOND society run on the same
      // regions would read mined-out ground as the founding geology. That
      // was a real, silent bug: after any ep>0 render, dragging any
      // society slider recomputed the world on depleted ore — the map on
      // screen and its own share link disagreed. Restore the geology as
      // founded before every run; stage 3 is now a pure function of
      // (geology, knobs), and the counterfactual below depends on it.
      regions.forEach(reg => {
        if (reg.endowmentGeo === undefined) reg.endowmentGeo = reg.endowment;
        reg.endowment = reg.endowmentGeo;
        // the living-world lifecycle also writes per-cell state across a run
        // (settled/abandonment, the decaying event legacy, and the POI roles
        // an abandonment clears); reset it here so a second run on the same
        // regions is a pure function of (geology, knobs), like the ore above.
        reg.eventLegacy = 0;
        reg.settled = 1; reg.settledEpoch = 0; reg.abandonedEpoch = -1; reg.rebirths = 0;
        reg.tier = undefined; reg.livability = undefined; reg.plagued = false;
        reg.peakPop = undefined;
        // templeReach is computed AFTER the founding livability call reads it,
        // so on the first run it is 0 there but a prior run's value would leak
        // in on a recompute; clear it so founding livability is run-identical.
        reg.templeReach = 0;
      });

      // Seat resolution. Pinned: nearest region to the click. Unpinned: the
      // agrarian core — high fertility, low ruggedness (geology only). This is
      // what makes the ore-rich frontier emergent rather than authored.
      let cap = null, capPoint = params.capital;
      if (capPoint) {
        let best = Infinity;
        for (const reg of regions) {
          const d = Math.hypot(reg.c[0] - capPoint[0], reg.c[1] - capPoint[1]);
          if (d < best) { best = d; cap = reg; }
        }
      } else {
        let bestScore = -Infinity;
        for (const reg of regions) {
          const rj = sx("seat#" + reg.id);
          const s = reg.fertility - 0.7 * reg.ruggedness + (rj() - 0.5) * 6;
          if (s > bestScore) { bestScore = s; cap = reg; }
        }
        capPoint = [cap.c[0], cap.c[1]];
      }

      // G1: the mountain's shadow — a pure geometric fact relative to the seat:
      // does the straight line from a region's anchor to the seat cross a
      // ridge? Computed on the SAME rounded geometry the export carries, so
      // the column is exactly recomputable from the file alone.
      {
        const rp = (c) => [round2(c[0]), round2(c[1])];
        const seatP = rp(cap.c);
        regions.forEach(reg => {
          const P = rp(reg.c);
          let hit = false;
          for (const R of geo.ridges) for (let k = 0; !hit && k + 1 < R.pts.length; k++)
            if (segInt(P, seatP, R.pts[k], R.pts[k + 1])) hit = true;
          reg.rangeShadow = (reg !== cap && hit) ? 1 : 0;
        });
      }

      // Centrality to seat: inverted, normalized cost-distance (0..100; seat = 100).
      const seatIdx = regions.indexOf(cap);
      const seatRun = costDistances(regions, [seatIdx]);
      const cd = seatRun.dist;
      const maxCd = Math.max(...cd.filter(isFinite), 0);
      regions.forEach((reg, i) => {
        reg.centrality = !isFinite(cd[i]) ? 0
          : Math.round(100 * (1 - (maxCd > 0 ? cd[i] / maxCd : 0)));
      });

      // Euclidean distance from the seat: used ONLY by the legacy gradient term,
      // so gradient=100 reproduces the old explicit diagram exactly.
      let maxD = 0;
      regions.forEach(reg => {
        reg.dist = Math.hypot(reg.c[0] - cap.c[0], reg.c[1] - cap.c[1]);
        if (reg.dist > maxD) maxD = reg.dist;
      });

      // Refining: few capital-intensive sites, chosen by centrality + flat
      // terrain. Reads NO social layer (keeps the DAG acyclic) — and never the ore.
      const K = Math.max(1, Math.round(regions.length / 16));
      const sited = regions.map(reg => {
        const rj = sx("site#" + reg.id);
        return { reg, s: reg.centrality * 0.7 + (100 - reg.ruggedness) * 0.3 + (rj() - 0.5) * 8 };
      }).sort((a, b) => b.s - a.s || a.reg.id - b.reg.id);
      regions.forEach(reg => { reg.refining = 0; });
      for (let i = 0; i < K; i++) {
        const reg = sited[i].reg;
        const rr = sx("refcap#" + reg.id);
        reg.refining = Math.round(60 + rr() * 40);
      }

      // Value retention: how much locally-generated value stays local. Mining-only
      // frontier keeps a sliver; refinery hosts and central regions keep most.
      regions.forEach(reg => {
        const rr = sx("ret#" + reg.id);
        reg.retention = clamp(Math.round(
          15 + 60 * (reg.refining / 100) + 25 * (reg.centrality / 100) + (rr() - 0.5) * 8
        ), 0, 100);
      });

      // Roads: the travel network — pure geometry (MST + shortcuts), built
      // BEFORE the dynamic loop because migration flows along it. Unlike the
      // conduit, roads reach EVERYONE; connection is not rationed.
      const candEdges = [];
      regions.forEach((reg, i) => reg.neighbors.forEach(j => {
        if (j > i) candEdges.push({ a: i, b: j, cost: edgeCost(reg, regions[j]) });
      }));
      candEdges.sort((e1, e2) => e1.cost - e2.cost || e1.a - e2.a || e1.b - e2.b);
      const ekey = (a, b) => a < b ? a + ":" + b : b + ":" + a;
      const uf = regions.map((_, i) => i);
      const ufFind = (x) => { while (uf[x] !== x) { uf[x] = uf[uf[x]]; x = uf[x]; } return x; };
      const roadEdges = [];
      const inRoad = new Set();
      for (const e of candEdges) { // Kruskal MST
        const ra = ufFind(e.a), rb = ufFind(e.b);
        if (ra !== rb) { uf[ra] = rb; roadEdges.push(e); inRoad.add(ekey(e.a, e.b)); }
      }
      const roadAdj = () => {
        const adj = regions.map(() => []);
        for (const e of roadEdges) { adj[e.a].push({ to: e.b, c: e.cost }); adj[e.b].push({ to: e.a, c: e.cost }); }
        return adj;
      };
      const spFrom = (adj, s) => { // Dijkstra with parents over the road graph
        const n = adj.length, dist = new Array(n).fill(Infinity), par = new Array(n).fill(-1), done = new Array(n).fill(false);
        dist[s] = 0;
        for (let it = 0; it < n; it++) {
          let u = -1, best = Infinity;
          for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
          if (u === -1) break;
          done[u] = true;
          for (const { to, c } of adj[u]) if (!done[to] && dist[u] + c < dist[to]) { dist[to] = dist[u] + c; par[to] = u; }
        }
        return { dist, par };
      };
      { // shortcuts: add a skipped adjacency edge when the MST detour is long
        const adj = roadAdj();
        const spCache = regions.map(() => null);
        for (const e of candEdges) {
          if (inRoad.has(ekey(e.a, e.b))) continue;
          if (!spCache[e.a]) spCache[e.a] = spFrom(adj, e.a);
          if (spCache[e.a].dist[e.b] > 1.6 * e.cost) { roadEdges.push(e); inRoad.add(ekey(e.a, e.b)); }
        }
      }

      // G3: ports — the sea's gates, sited on geology ALONE (flat, low coast,
      // heavy bonus for a river mouth), so the harbor set is stable across
      // every society knob. sea_access decays with cost-distance from the
      // ports over the same friction graph: the mountains block the way to
      // the water exactly as they block the way to the seat.
      const coastal = regions.filter(reg => reg.onCoast === 1);
      // P2: sealed quays charter no ports — and the Dominion needs a quay
      const KP = params.hb === 0 ? 0 : (coastal.length === 0 ? 0 : (coastal.length >= 8 ? 2 : 1));
      const mouths = new Set();
      geo.rivers.forEach(RV => {
        const m = RV.chain[RV.chain.length - 1];
        if (regions[m].onCoast === 1) mouths.add(m);
      });
      regions.forEach(reg => { reg.isPort = 0; });
      // P1: sailors shun the maelstrom — port siting avoids its reach
      // (unless the whole coast is inside it and a harbor must exist)
      const clearOfMael = (reg) => !geo.maelstrom ||
        Math.hypot(round2(reg.c[0]) - geo.maelstrom.x, round2(reg.c[1]) - geo.maelstrom.y) >= 180;
      const portPool = coastal.filter(clearOfMael).length ? coastal.filter(clearOfMael) : coastal;
      const portScore = portPool.map(reg => {
        const rj = sx("port#" + reg.id);
        return { reg, s: 0.45 * (100 - reg.ruggedness) + 0.2 * (100 - reg.elevation) +
          (mouths.has(regions.indexOf(reg)) ? 25 : 0) + (rj() - 0.5) * 8 };
      }).sort((a, b) => b.s - a.s || a.reg.id - b.reg.id);
      portScore.slice(0, KP).forEach(x => { x.reg.isPort = 1; });
      const portIdxs = regions.map((reg, i) => reg.isPort ? i : -1).filter(i => i >= 0);
      const seaRun = portIdxs.length ? costDistances(regions, portIdxs) : null;
      const seaCd = seaRun ? seaRun.dist : null;
      regions.forEach((reg, i) => {
        reg.seaAccess = seaCd
          ? Math.round(100 * Math.exp(-(isFinite(seaCd[i]) ? seaCd[i] : 1e9) / SEA_L)) : 0;
      });

      // L1: THE FREEPORT — the harbor beyond the writ, founded where the
      // seat's arm has the farthest to reach: never a chartered port, never
      // in the maelstrom's turning. Its trade enters no ledger (official
      // sea_access does not see the shadow gate), but its ground keeps what
      // the gates would have taken, the smugglers route to its quay, and
      // sealed quays do not close it — a decree is not a reef. It refuses
      // the Dominion's charter besides: no foothold ever lands there.
      let freeport = null;
      regions.forEach(reg => { reg.isFreeport = 0; });
      {
        const rfp = sx("freeport");
        const fpPool = coastal.filter(r2 => r2.isPort === 0 && clearOfMael(r2));
        if (coastal.length >= 4 && fpPool.length && rfp() < 0.65) {
          const far = fpPool.map(r2 => {
            const i2 = regions.indexOf(r2);
            return { r2, s: (isFinite(cd[i2]) ? cd[i2] : 0) + 0.6 * (100 - r2.ruggedness) + (rfp() - 0.5) * 12 };
          }).sort((a2, b2) => b2.s - a2.s || a2.r2.id - b2.r2.id)[0].r2;
          far.isFreeport = 1;
          far.retention = Math.min(100, far.retention + 10); // no gate takes its rake
          freeport = { regionId: far.id };
        }
      }

      // Wealth: three emergent income streams + the legacy gradient term.
      // income() reads the CURRENT ore stock (reg.E), so it can be re-run
      // per epoch as mines deplete. Epoch-0 wealth carries the seeded noise.
      const k = lerp(0.4, 3.0, params.bias / 100);
      const rNoise = sx("wealth");
      const total = params.we + params.wf + params.wt + params.wg;
      // priceMult (B0 #121): the world aetherstone price index shocks the
      // region's EXPORT INCOME. Aetherstone is the region's main export, so a
      // world price swing moves the whole earning economy, not one term — the
      // shock scales the composed income. Sustained (regimes persist), this
      // compounds against the 0.6 wealth carryover toward wealth ∝ price, which
      // is what lets a boom rescue and a bust ruin. Defaults to 1 (the founding
      // is pre-history: no world price has acted, so ep=0 is world-invariant).
      const income = (reg, priceMult = 1, demandMult = 1) => {
        // B10 (#132): the mix pulls apart — the four terms anchor to DIFFERENT geography
        // so the four weights move relations in distinguishable directions.
        const t = maxD > 0 ? 1 - reg.dist / maxD : 1;
        const legacy = lerp(5, 100, Math.pow(t, k)) / 100;         // the AUTHORED gradient (bias folded into k) — near the seat
        const ext = (reg.E / 100) * (reg.retention / 100) * (1 - (reg.foreignClaim || 0)); // EXTRACTION anchors to the seams (current ore stock); a concession repatriates its share off-map (B11 #133)
        const ref = (reg.refining > 0 ? 1 : 0.35) * (reg.A !== undefined ? reg.A : 70) / 100; // ARTIFICE anchors to A (trained capacity), strongest at the works
        // B10 (#132): TRADE re-anchors to the COAST and FOREIGN demand, priced against
        // the seat. The sea leg (seaAccess) is gated by OPENNESS (sealed harbors = no
        // foreign trade, the old hb=0) and scaled by the world's foreign demand; only a
        // small residual rides seat-centrality. So a trade-heavy, open, demand-favoured
        // coast grows a SECOND POLE that RIVALS the capital instead of feeding it.
        // B6 (#128): a decayed span on the road to market still chokes the trade (−60% cap).
        const crossChoke = 1 - clamp((reg.crossFriction || 0) / 100, 0, 0.6);
        const openF = params.openness / 100;
        const seaLeg = reg.embargoed ? 0 : reg.seaAccess; // B11 (#133): a regime-gated embargo shuts the sea lanes — the coast's second pole busts
        const trade = crossChoke * (0.78 * seaLeg * openF * demandMult + 0.22 * reg.centrality) / 100;
        const base = total > 0
          ? priceMult * (params.we * ext + params.wf * ref + params.wt * trade + params.wg * legacy) / total
          : 0.5; // all weights zero: no income model — flat
        // WATER is a precondition, not a fourth income stream: no economy
        // sustains itself without it, so it MULTIPLIES the base rather than
        // adding to it. A well-watered region keeps its full income; a dry
        // one is throttled toward a floor. effWaterAccess is the RELATIONSHIP
        // -MEDIATED figure (a neighbor can price a region out of nearby
        // water); it falls back to the physical figure before society exists.
        const wa = (reg.effWaterAccess !== undefined ? reg.effWaterAccess : reg.waterAccess);
        const waterMult = 0.7 + 0.3 * (wa / 100); // dry floor 0.70, full 1.00
        // B1: income is A-SCALED so a high-artifice periphery can out-earn a
        // low-artifice core, and the realm's total wealth stops being conserved.
        // R1 (#164): A is capital-intensity/TFP in a SOLOW frame (Solow 1956), so
        // output scales as a power of it with DIMINISHING RETURNS, not linearly.
        // The exponent is the conventional capital share, about a third
        // (Cobb & Douglas 1928; Gollin 2002). Normalised at A = 70, the founding
        // mean, so founding wealth barely moves.
        //
        // The linear form it replaces (0.3 + A/100) had no cited basis and was
        // wrong at both ends: it paid a constant marginal return to artifice
        // forever, and an artifice crash cut income by up to 70%, which is a
        // scale of collapse no production function of this kind produces. The
        // power form is gentler where it matters (at A = 23, the lowest artifice
        // measured on settled ground, it returns 0.68 against the linear 0.53)
        // and more modest at the top (1.13 at A = 100 against 1.30), which is
        // what diminishing returns means.
        const artA = (reg.A !== undefined ? reg.A : 70);
        const artMult = Math.pow(artA / 70, 0.35);
        return base * waterMult * artMult * (reg.warTorn ? 0.85 : 1); // war permanently wounds capacity
      };
      const rArt = sx("artifice");
      regions.forEach(reg => {
        reg.E = reg.endowment;           // current ore stock (depletes per epoch)
        reg.endowment0 = reg.endowment;  // the geology as founded
        reg.warTorn = false;
        reg.occupied = false;            // reset BEFORE the founding snapshot
        reg.occupiedEpoch = -1;          // (stage-3 purity: re-runs must not leak)
        // B11 (#133): imperial REACH — the empire mostly never comes, it buys.
        // A concession is foreign capital owning the works: the yield is
        // partly a FOREIGN claim (foreignClaim), the coast is force-wired and
        // fed capital while the ore is wanted, and it is WOUND UP when the ore
        // depletes or attention leaves — the courted→developed→squeezed→
        // abandoned arc. All reset before the founding snapshot (stage-3
        // purity: the founding is pre-history, no world attention has acted).
        reg.concession = false; reg.concessionEpoch = -1;
        reg.foreignClaim = 0;   // share of the ore-retention repatriated off-map
        reg.concessionEnded = false; reg.concessionEndEpoch = -1; // wound up (NOT reg.abandonedEpoch — that is the depopulation deadhold)
        reg.embargoed = false;  // per-epoch: a hostile regime cut this coast off
        reg.effWaterAccess = reg.waterAccess; // founding: no bloc has priced anyone out yet
        reg.waterDenial = 0;             // (stage-3 purity: the epoch loop's denial must not leak)
        reg.crossFriction = 0;           // B6 (#128): the founding roads are whole — reset BEFORE
                                         // income() reads it below, or an in-page re-run would choke
                                         // the founding wealth with the LAST run's rotted spans (purity)
        reg.wonArc = null;               // B8 (#130): no town is Free at the founding (stage-3 purity)
        // B1 (#123): the artifice index A — command of magically-enabled
        // productivity (machinery, trained hands, licensed workings). Founding A
        // is the developed base: refining works and the trained core lift it,
        // rough frontier country lags. It scales income and moves over epochs.
        reg.A = clamp(Math.round(60 + 0.3 * reg.refining + 0.18 * reg.centrality - 0.12 * reg.ruggedness + (rArt() * 2 - 1) * 12), 0, 100);
        reg.A0 = reg.A;                  // the artifice as founded (for the drift/growth surfaces)
        const noise = (rNoise() * 2 - 1) * 5;
        reg.wealth = clamp(Math.round(100 * income(reg) + noise), 0, 100);
        reg.wealthT0 = reg.wealth;
        reg.peakWealth = reg.wealth;
        reg.emigrantsTotal = 0;         // B3 (#125): the diaspora, accumulated off-map
        reg.remittanceTotal = 0;        // B3: the coin the diaspora has sent home
        reg.emigEpoch = 0;              // B3: reset the per-epoch flows so frame 0 (the founding
        reg.remitEpoch = 0;            //     snapshot) carries no ghost of a previous in-page run
        reg.isCapital = (reg === cap);
      });

      // Z1: THE FOUNDING CENTURIES — population is GROWN, not painted.
      // Every region starts as a hamlet on its land quality, and the
      // centuries before year 1000 run the SAME physics as the recorded
      // epochs, blind to wealth (which does not exist yet): compound
      // growth where the land is good, migration along the roads toward
      // the bigger market (size begets size, log-damped), a floor under
      // the smallest hamlet. The rank-size law that falls out is a line
      // no one drew.
      const q0 = regions.map(reg =>
        (0.5 * reg.fertility + 0.3 * reg.centrality + (reg === cap ? 8 : 0) +
         (reg.onRiver === 1 ? 10 : 0) + (reg.onCoast === 1 ? 10 : 0)) / 100);
      const popDice = regions.map(reg => sx("pop#" + reg.id));
      const luck0 = [];
      regions.forEach((reg, i) => {
        reg.rural = 0.15 + popDice[i]() * 0.45;
        reg.settlementPop = 60 + popDice[i]() * 120; // every town starts a hamlet
        luck0.push(0.7 + popDice[i]() * 0.6);        // persistent founding luck (Gibrat)
      });
      for (let g = 0; g < 30; g++) {
        regions.forEach((reg, i) => {
          reg.settlementPop *= 1 + 0.05 * q0[i] * luck0[i] * (0.2 + 1.6 * popDice[i]());
        });
        const maxP0 = Math.max(...regions.map(r => r.settlementPop));
        const attract0 = regions.map((reg, i) =>
          55 * q0[i] + 19 * Math.log(reg.settlementPop) + 26 * (reg.settlementPop / maxP0));
        const delta0 = new Array(regions.length).fill(0);
        roadEdges.forEach(edge => {
          // distance shields the hinterland: a long, costly road bleeds
          // its hamlet slowly — remoteness is the tail's only defense
          const damp = 200 / (200 + edge.cost);
          const gA = attract0[edge.b] - attract0[edge.a];
          if (gA > 0) { const m = 0.16 * damp * regions[edge.a].settlementPop * gA / 100; delta0[edge.a] -= m; delta0[edge.b] += m; }
          else if (gA < 0) { const m = 0.16 * damp * regions[edge.b].settlementPop * (-gA) / 100; delta0[edge.b] -= m; delta0[edge.a] += m; }
        });
        regions.forEach((reg, i) => {
          reg.settlementPop = Math.max(25, reg.settlementPop + Math.max(delta0[i], -0.1 * reg.settlementPop));
        });
      }
      { // one rescale to the realm's familiar size, so every downstream
        // rate (the plague bar, the burdens per 1k) keeps its meaning —
        // a rescale preserves the rank-size shape exactly
        const totS = regions.reduce((s, r) => s + r.settlementPop, 0);
        const target = 3800 * regions.length;
        regions.forEach(reg => {
          reg.settlementPop = Math.max(25, Math.round(reg.settlementPop * target / totS));
          reg.popT0 = reg.settlementPop;
          reg.peakPop = reg.settlementPop;
          reg.population = Math.round(reg.settlementPop * (1 + reg.rural));
          reg.area = Math.abs(signedArea(reg.ring));
          reg.popDensity = Math.round((reg.population / (reg.area / 10000)) * 10) / 10;
        });
      }
      // tiers are LABELS for the outcome, not its cause: the seat is
      // prime by office; the rest rank by what they grew to — the same
      // rule the post-loop re-rank has always used
      cap.tier = "metropolis";
      // SETTLEMENT STATE: a region is a piece of LAND; whether it holds a
      // settlement is now an outcome. Every region starts settled (the
      // founding-centuries growth model runs on all of them); the epoch loop
      // lets a poisoned or emptied cell go UNSETTLED (a dead zone), and an
      // unsettled cell with good livability and a settled neighbor be founded
      // (or reborn). settled=1 until proven otherwise here.
      regions.forEach(reg => {
        reg.settled = 1; reg.settledEpoch = 0; reg.abandonedEpoch = -1; reg.rebirths = 0;
      });
      {
        const others = regions.filter(reg => reg !== cap && reg.settled)
          .sort((a, b) => b.settlementPop - a.settlementPop || a.id - b.id);
        const nHub = Math.max(1, Math.round(others.length * 0.2));
        const nOut = Math.max(1, Math.round(others.length * 0.4));
        others.forEach((reg, i) => {
          reg.tier = i < nHub ? "city" : (i < nHub + nOut ? "works-town" : "frontier-post");
        });
      }

      // The owners' headcount as a share of the town, hoisted so the sorting block
      // (#178) can weight its head-mix with the same formula the export uses. Called
      // after the final tier ranking it reproduces elite_pop_pct byte for byte; called
      // in-loop it reads the FOUNDING tiers, which is a deliberate approximation,
      // acceptable because in-loop it only ever appears in a head-mix denominator
      // where 2% against 5% moves the result by under 3%.
      const ownerHeadPct = (reg) => 2
        + (reg.tier === "metropolis" ? 3 : reg.tier === "city" ? 2 : 0)
        + (reg.refining > 0 ? 2 : 0) + (reg.isPort === 1 ? 1 : 0) + (reg.isSkyport === 1 ? 1 : 0);

      // H1: THE STRATA — every region is two peoples under one name: the
      // owners' row (the charter-holders, the works' masters, the court)
      // and the labor it hires. The founding split is pure structure —
      // the company town concentrates, the smallholder valley spreads —
      // and history moves it from there. No new dice: every seeded world
      // keeps its exact old history, with a class ledger written under it.
      regions.forEach(reg => {
        reg.eliteShare = clamp(Math.round(
          24 + 0.32 * reg.refining + 0.12 * reg.endowment0 +
          (reg.tier === "metropolis" ? 8 : reg.tier === "city" ? 4 : 0)
        ), 8, 92);
        reg.eliteShareT0 = reg.eliteShare; // B5 (#127): the founding row, for the ordinary-erosion delta
        reg.eliteCatDelta = 0; // B5 (#127): running sum of CATASTROPHE-driven elite moves (revolt/collapse/plague),
                               // so the ORDINARY-erosion component can be read clean of the shocks
      });

      // S1: THE SKYWAY — the elite bypass. Lift lanes are chartered by the
      // same ledger logic that rations the conduit: an aerie goes where
      // flight beats the ground by the MOST (the gain) and where there is
      // value worth moving (wealth, ore, the works) — which is exactly the
      // far, walled, rich country, because a lane to the easy lowland
      // saves nothing. Flight ignores the walls, the fords, and the gates
      // that price everyone else's distance; the ground below keeps every
      // multiplier it ever had. Geography is destiny only for those who
      // can't afford to leave it, and boarding is an owners' privilege.
      // L1: THE STILLAIR — the tract where the lift-stones die. Inputs are
      // geology alone (ruggedness, elevation, its own substream), so the
      // tract is byte-stable across every knob and capital move.
      regions.forEach(reg => { reg.stillair = 0; });
      {
        const rst = sx("stillair");
        rst(); rst(); // warm the stream: first draws correlate across sibling seeds
        if (regions.length >= 12 && rst() < 0.45) {
          const cands = regions.filter(r2 => r2.ruggedness >= 45 || r2.elevation >= 55);
          if (cands.length) {
            const core = cands.map(r2 => ({ r2, s: 0.6 * r2.ruggedness + 0.4 * r2.elevation + (rst() - 0.5) * 10 }))
              .sort((a2, b2) => b2.s - a2.s || a2.r2.id - b2.r2.id)[0].r2;
            regions.forEach(r2 => {
              if (Math.hypot(round2(r2.c[0]) - round2(core.c[0]), round2(r2.c[1]) - round2(core.c[1])) <= 175) r2.stillair = 1;
            });
          }
        }
      }
      const KS = regions.length >= 40 ? 4 : regions.length >= 16 ? 3 : 2;
      regions.forEach(reg => { reg.isSkyport = 0; });
      // L1: physics does not negotiate — a stilled seat charters no skyway
      if (cap.stillair === 0) cap.isSkyport = 1;
      {
        const rpS = (c) => [round2(c[0]), round2(c[1])];
        const sA = rpS(cap.c);
        regions.map((reg, i) => {
          if (reg === cap || reg.stillair === 1 || cap.stillair === 1) return null; // L1: no aerie on stilled ground
          const a = rpS(reg.c);
          const gain = cd[i] - (FLY_BOARD + FLY_COST * Math.hypot(a[0] - sA[0], a[1] - sA[1]));
          if (gain <= 0) return null; // a lane that saves nothing is never chartered
          const rj = sx("skyport#" + reg.id);
          const value = 0.5 * reg.wealthT0 + 0.3 * reg.endowment0 + 0.2 * reg.refining;
          return { reg, s: gain * value / 100 + (rj() - 0.5) * 4 };
        }).filter(Boolean)
          .sort((a, b) => b.s - a.s || a.reg.id - b.reg.id)
          .slice(0, KS - 1).forEach(x => { x.reg.isSkyport = 1; });
      }
      {
        // the walk to the nearest aerie, then the flight to the seat —
        // euclidean over ROUNDED anchors, so sky_advantage recomputes
        // from the exported columns alone
        const rp2 = (c) => [round2(c[0]), round2(c[1])];
        const seatA = rp2(cap.c);
        const skyIdxs = regions.map((reg, i) => reg.isSkyport === 1 ? i : -1).filter(i => i >= 0);
        const runs = skyIdxs.map(si => {
          const a = rp2(regions[si].c);
          return { run: costDistances(regions, [si]).dist,
            fly: FLY_BOARD + FLY_COST * Math.hypot(a[0] - seatA[0], a[1] - seatA[1]) };
        });
        const r1s = (v) => Math.round(v * 10) / 10;
        regions.forEach((reg, i) => {
          let best = cd[i];
          for (const R of runs) best = Math.min(best, R.run[i] + R.fly);
          reg.seatCostGround = r1s(cd[i]);
          reg.seatCostSky = r1s(best);
          reg.skyAdvantage = reg.seatCostGround > 0
            ? Math.max(0, Math.round(100 * (1 - reg.seatCostSky / reg.seatCostGround))) : 0;
        });
      }

      // V1: the loop's own parameters are now history-mutable — reforms and
      // reactions shift them mid-run, and the free town escapes the tolls
      let disposalOverride = null, gtShift = 0, tollScale = 1, freeTownIdx = -1, granaryOn = false;
      // B7 (#129): every measure grows a LONG EDGE — delayed, state-contingent. The
      // grid charter is financed by imperial loans (a debt the seat services out of
      // its treasury for the rest of the run); the granary breeds dependency and a
      // fiscal drain if it runs on through a LONG PEACE; the retention act frightens
      // elite capital into flight. And when the debt goes unserviced under a doctrine-
      // pressing world, the creditors DEMAND a measure — structural adjustment, a
      // reform imposed from OUTSIDE, distinct from the seat's own iq-chosen mercies.
      let charterDebt = 0, charterDebtEpoch = -1, debtServicePaid = 0;
      let granaryEpoch = -1, granaryDependency = 0, granaryDrain = 0;
      let retentionEpoch = -1, capitalFlight = 0;
      let impositions = 0, lastWoundEpoch = -99;
      let blightEpoch = 0; // B4 (#126): concentrate's poison RAMPS with the works — 0 at the founding, full late (P4 delay)
      // #180: the contaminant stock carried between epochs. `committed` is the load
      // standing at the END of the last epoch; computeBlight may run several times
      // within one epoch (migration moves the poor, a relic calamity scars ground),
      // so it always derives from `committed` and never from its own output, which
      // keeps it idempotent inside an epoch and accumulating across them.
      const blightCommitted = new Array(regions.length).fill(0);
      let blightPending = new Array(regions.length).fill(0);
      let blightSeeded = false;
      // #93: a maturing realm wires more of itself. gtEase lowers the hook-up bar
      // a touch each epoch so the grid keeps ratcheting outward through the
      // history instead of freezing after the founding expansion. It is 0 at
      // founding (byte-identical there), grows only inside the loop, and is
      // bounded so it eases the bar, never floors it.
      let gtEase = 0;

      // Conduit (grid economics). Trunk: least-cost refinery->seat paths, with
      // pass-through regions tapped. Then greedy gated expansion: repeatedly
      // connect the best benefit/cost candidate while (population x wealth) /
      // build-cost clears the threshold. Neutral zero: gt=0 connects everyone.
      const onGrid = new Array(regions.length).fill(false);
      const conduitEdges = []; // {a, b, cls} — indices into regions
      const seenEdge = new Set();
      const addEdge = (a, b, cls) => {
        const k = a < b ? a + ":" + b : b + ":" + a;
        if (!seenEdge.has(k)) { seenEdge.add(k); conduitEdges.push({ a, b, cls }); }
      };
      onGrid[seatIdx] = true;
      regions.forEach((reg, i) => {
        if (reg.refining <= 0) return;
        onGrid[i] = true;
        let cur = i;
        while (cur !== seatIdx && seatRun.parent[cur] !== -1) {
          const p = seatRun.parent[cur];
          addEdge(cur, p, "trunk");
          onGrid[p] = true;
          cur = p;
        }
      });
      const thresh = () => Math.pow(clamp(params.gt + gtShift - gtEase, 0, 100) / 40, 4); // V1: charters move the bar; #93: maturity eases it
      const expandConduit = () => { // greedy gated expansion (ratchet: adds only)
        for (;;) {
          let best = null;
          regions.forEach((reg, i) => {
            if (onGrid[i]) return;
            let cheapest = Infinity, via = -1;
            for (const nb of reg.neighbors) if (onGrid[nb]) {
              const c = edgeCost(reg, regions[nb]);
              if (c < cheapest) { cheapest = c; via = nb; }
            }
            if (via === -1) return;
            const score = (reg.population * (reg.wealth / 100)) / cheapest;
            if (!best || score > best.score || (score === best.score && i < best.i))
              best = { i, via, score };
          });
          if (!best || best.score < thresh()) break;
          onGrid[best.i] = true;
          addEdge(best.i, best.via, "branch");
        }
      };
      expandConduit();

      // B4 (#126): BLIGHT under the DISPOSAL DOCTRINE — the saturated λ dial retired
      // for a three-way regime the `db` knob now selects (0–33 DISPERSE, 34–66
      // CONCENTRATE, 67–100 TREAT; old db= links keep meaning — low db was the
      // physics spread, mid-high db aimed the spoil at the poor). Two parts per
      // refinery:
      //   PLUME (physics): leakage spread by a distance kernel, elongated downwind,
      //     pulled downhill. Always present, doctrine-independent.
      //   SPOIL (policy): a FIXED mass of tailings per refinery, placed by the
      //     doctrine — DISPERSE spreads it by distance alone (everyone a little, no
      //     hand aims it); CONCENTRATE hauls it ALL onto one sacrifice zone (harm
      //     contained WHILE the zone stays empty — but B3 migration can fill a cheap
      //     periphery, and the poison was waiting: the harm is delayed and lands on
      //     whoever moved in, P4); TREAT spreads it, then the realm cleans up where
      //     it can AFFORD the coin and fields the WORKS (A) — so a rich, developed
      //     core clears its own spoil while a wealthy-but-A-poor seat cannot, and the
      //     poison can land on the RICH with no hand having aimed it there.
      const scar = new Array(regions.length).fill(0); // permanent contamination (relic calamities)
      // P1: the deadhold's ground was poisoned before anyone alive was born
      geo.ruins.filter(r => r.type === "deadhold").forEach(r => { scar[r.regionIdx] = Math.max(scar[r.regionIdx], 1.8); });
      // CONCENTRATE's sacrifice zone is chosen ONCE, at the founding: the poorest,
      // most peripheral settled seat the realm is willing to write off. It does NOT
      // chase the poor each epoch (that was λ) — it is a fixed place on the map, and
      // history alone decides whether anyone comes to live in it.
      // The sacrifice zone: a currently-SPARSE seat (few to harm now = "contained")
      // that is ALSO exactly what B3's frontier term fills — cheap, peripheral, and
      // grid-wired. So the realm writes off an empty margin, and if the centuries
      // turn its cheap land into a frontier the squeezed core flees to, the poison
      // is already there waiting (P4). Empty enough to write off, attractive enough
      // to fill: the two faces of the same choice.
      let sacrificeZone = -1, szBest = -Infinity;
      regions.forEach((reg, i) => {
        if (!reg.settled || reg.settlementPop > 1200) return; // must be sparse now
        const cheap = clamp((52 - reg.wealth) / 52, 0, 1);
        const periph = clamp((52 - reg.centrality) / 52, 0, 1);
        const potential = cheap * periph * (onGrid[i] ? 1 : 0.4); // what the frontier fills
        if (potential > szBest || (potential === szBest && sacrificeZone >= 0 && i < sacrificeZone)) { szBest = potential; sacrificeZone = i; }
      });
      if (sacrificeZone < 0) { // fallback: the emptiest settled ground
        let m = Infinity; regions.forEach((reg, i) => { if (reg.settled && reg.settlementPop < m) { m = reg.settlementPop; sacrificeZone = i; } });
      }
      const computeBlight = () => { // recomputed each epoch; the doctrine reads current state
        const windRad = geo.windDeg * Math.PI / 180;
        const wvx = Math.cos(windRad), wvy = Math.sin(windRad);
        const eff = clamp(params.db, 0, 100); // the doctrine selector; a reform can override it mid-run
        const doctrine = disposalOverride || (eff < 34 ? "disperse" : eff < 67 ? "concentrate" : "treat");
        const blightRaw = regions.map((_, i) => scar[i]);
        regions.forEach(rf => {
          if (rf.refining <= 0) return;
          const C = rf.refining / 100;
          regions.forEach((reg, i) => {
            const dx = reg.c[0] - rf.c[0], dy = reg.c[1] - rf.c[1];
            const d = Math.hypot(dx, dy);
            const base = Math.exp(-(d * d) / (2 * 160 * 160));
            const windBoost = d > 1 ? 1 + 0.8 * Math.max(0, (dx * wvx + dy * wvy) / d) : 1;
            const hillBoost = 1 + 0.4 * Math.max(0, (rf.elevation - reg.elevation) / 100); // G4: tilt made downhill systematic; damped
            blightRaw[i] += 0.3 * C * base * windBoost * hillBoost;
          });
          const SPOIL = 5 * C;
          if (doctrine === "concentrate" && sacrificeZone >= 0) {
            // the zone's share RAMPS with the works (P4): ~nothing at the founding,
            // full only by mid-run. So a cheap, empty zone reads as attractive
            // frontier EARLY — B3 migration can flow in — and the poison arrives
            // LATER, onto whoever came. The rest hauls onto the poor MARGIN, so the
            // realm-scale reading stays poverty-seeking (blight on the poor, a
            // negative wealth-correlation) even as one zone bears the concentrated brunt.
            const ramp = clamp(blightEpoch / 6, 0, 1);
            const zoneShare = 0.55 * ramp;
            blightRaw[sacrificeZone] += zoneShare * SPOIL;
            const margin = SPOIL - zoneShare * SPOIL;
            let wsum = 0;
            // the margin goes to the poor where the poor LIVE — population×poverty
            // weighted, never onto the zone or empty ground — so the poison harms
            // PEOPLE: it plagues the crowded poor towns and gives the Temple living
            // ground to consecrate, while the realm-scale reading stays poverty-seeking
            // (blight on the poor, a negative wealth-correlation) and the ramp keeps
            // the zone's own early window clean for the rush.
            const wts = regions.map((reg, idx) => { const w = (idx === sacrificeZone || !reg.settled) ? 0 : Math.pow(1 - reg.wealth / 100, SITE_POV) * clamp(reg.settlementPop / 1200, 0.15, 1); wsum += w; return w; });
            if (wsum > 0) regions.forEach((_, i) => { blightRaw[i] += margin * (wts[i] / wsum); });
          } else {
            // DISPERSE (and TREAT's pre-cleanup spread): distance decay ONLY, no
            // poverty exponent — no hand aims the spoil at the poor; it lands by
            // geography, and TREAT then decides who can afford to clean it up.
            let wsum = 0;
            const wts = regions.map(reg => {
              const d = Math.hypot(reg.c[0] - rf.c[0], reg.c[1] - rf.c[1]);
              // Distance-decay constants (here and templeReach/magnateReach/conduit/
              // healingReach/forceProjection) were rescaled ×1.334 for the 1600×1000
              // world so reach reads the same in world-units (B0.5, #122).
              const w = Math.exp(-d / 1068);
              wsum += w; return w;
            });
            if (wsum > 0) regions.forEach((_, i) => { blightRaw[i] += SPOIL * (wts[i] / wsum); });
          }
        });
        // #180: fixed ceiling, not the per-world maximum. A clean world now reads clean
        // instead of being stretched to fill the scale, and a cell at 100 is ruined
        // rather than merely worst-in-show.
        // blightRaw currently holds SCAR + this epoch's fresh deposition. Split them:
        // scar is permanent ground truth and does not decay, the rest is deposition
        // that lands on the decaying stock.
        const depos = regions.map((_, i) => blightRaw[i] - scar[i]);
        if (!blightSeeded) {
          // The founding is a snapshot of a world already running, not year zero of a
          // clean one, so the stock starts at the equilibrium of its own founding
          // deposition rather than at nothing. Without this the map would open
          // artificially clean and darken for its first few epochs.
          for (let i = 0; i < regions.length; i++) blightCommitted[i] = depos[i] / (1 - BLIGHT_RETAIN);
          blightSeeded = true;
        }
        blightPending = regions.map((_, i) => blightCommitted[i] * BLIGHT_RETAIN + depos[i]);
        const rawB = regions.map((_, i) => blightPending[i] + scar[i]);
        const pre = regions.map((_, i) => clamp(Math.round(100 * (rawB[i] / BLIGHT_FULL)), 0, 100));
        // TREAT: the realm cleans up its spoil, but only where it can afford the
        // coin AND fields the works. Cleanup scales with wealth (the coin) × A (the
        // works) — a rich, developed core clears nearly all of its load; a poor or
        // undeveloped seat clears little. Applied to the PRE-RIVER source so the
        // export invariant holds (blight_load − downstream_blight is the pre-river
        // field) and so a treated town also ships less downstream. The A×wealth gate
        // IS the dilemma: treatment is a privilege of the rich-and-developed, so the
        // poison stays on everyone else — a wealthy-but-undeveloped seat included.
        if (doctrine === "treat") {
          regions.forEach((reg, i) => {
            const cleared = clamp(0.9 * (reg.A / 100) * (reg.wealth / 100), 0, 0.9);
            pre[i] = Math.round(pre[i] * (1 - cleared));
            blightPending[i] *= (1 - cleared); // #180: cleanup lifts the STOCK, or the poison returns next epoch
          });
        }
        // G2: the river carries it — every riverine region ships RIVER_CARRY
        // of its (pre-carriage) load down the chain, decaying per step. The
        // mouth drinks what everyone upstream let fall in. Computed from the
        // pre-carriage field only, so the export is exactly recomputable:
        // blight_load - downstream_blight IS the pre-river field.
        regions.forEach(reg => { reg.downstreamBlight = 0; });
        for (const RV of geo.rivers) {
          RV.chain.forEach((ri, k) => {
            let extra = 0;
            for (let u = 0; u < k; u++) extra += pre[RV.chain[u]] * RIVER_CARRY * Math.pow(RIVER_DECAY, k - u);
            const fin = clamp(Math.round(pre[ri] + extra), 0, 100);
            regions[ri].downstreamBlight = fin - pre[ri];
          });
        }
        regions.forEach((reg, i) => {
          reg.blight = clamp(pre[i] + reg.downstreamBlight, 0, 100);
          // presentation column: the argument rests on the raw fields
          reg.injustice = Math.round(100 * (reg.blight / 100) * (1 - reg.wealth / 100));
        });
      };
      computeBlight();

      // LIVABILITY: how much a place is worth living in, recomputed each epoch
      // like blight. It is EMERGENT (every term is an already-computed field,
      // so it recomputes exactly from the export) and it is what the coming
      // settlement lifecycle reads: a blooming cell fills, a poisoned one
      // empties, a dead-zone cell never clears the bar. Structure:
      //   BASE (the land's intrinsic capacity: fertility, water, gentle ground,
      //     temperate, off the crags) MINUS what civilization does to it
      //     (blight from refining, a mined-out lode's lost reason) PLUS what
      //     draws people (trade reach, a temple's pull) PLUS a decaying legacy
      //     of shocks the events write (war desolation, flood, a discovery
      //     boom). eventLegacy is seeded at 0 and only the epoch events move it.
      const computeLivability = () => {
        regions.forEach(reg => {
          if (reg.eventLegacy === undefined) reg.eventLegacy = 0;
          const wa = (reg.effWaterAccess !== undefined ? reg.effWaterAccess : reg.waterAccess) || 0;
          const base =
            0.28 * reg.fertility +
            0.26 * wa +
            0.18 * (100 - reg.ruggedness) +
            0.10 * Math.max(0, 100 - 1.8 * Math.abs(reg.temperature - 55)) +
            0.08 * (reg.elevation >= 78 ? 0 : 100) +
            0.10 * reg.biomeHabitability;                   // grassland ~80 lifts, alpine ~10 drags
          // #180: convex, because a flat coefficient cannot say both true things at once.
          // The old max-normalised field was effectively bimodal: ordinary towns sat at
          // 2-13 and barely felt it, while the sacrifice zone sat at 100 and was
          // annihilated (0.55 * 100 = 55 livability, certain abandonment). On an absolute
          // scale the same two facts need two regimes, or ruined land keeps its town.
          // Below the ruin knee the load is a nuisance priced like the old field at
          // median load; above it, habitability collapses, which is what "ruined" means.
          const degradation =
            0.115 * reg.blight + 0.9 * Math.max(0, reg.blight - 60) +
            (reg.exhausted ? 14 : 0);                     // a dead lode is a town's lost reason
          const draw =
            0.16 * reg.centrality +
            0.14 * (reg.templeReach || 0);                // the god's town pulls pilgrims and coin
          reg.livability = clamp(Math.round(base - degradation + 0.5 * (draw - 15) + reg.eventLegacy), 0, 100);
        });
      };
      computeLivability();

      // Per-epoch snapshots: the raw material of the scrubber and the
      // QGIS temporal export.
      const epochSnaps = [];
      const snapNow = () => epochSnaps.push({
        wealth: regions.map(r => r.wealth),
        pop: regions.map(r => r.settlementPop),
        E: regions.map(r => r.E),
        A: regions.map(r => r.A), // B1: artifice per epoch — the drift/timeline read it
        emig: regions.map(r => r.emigEpoch || 0),   // B3: this epoch's emigration off-map
        remit: regions.map(r => r.remitEpoch || 0), // B3: this epoch's remittance inflow
        blight: regions.map(r => r.blight),
        eliteShare: regions.map(r => Math.round(r.eliteShare)),
        occupied: regions.map(r => r.occupied ? 1 : 0),
        concession: regions.map(r => r.concession ? 1 : 0),        // B11 (#133): the foreign-owned coast, per epoch
        concessionEnded: regions.map(r => r.concessionEnded ? 1 : 0), // B11 (#133): wound up — the attention left
        onGrid: regions.map((_, i) => onGrid[i]),
        // #55: the CSV long table wants politics per epoch too
        bloc: regions.map(r => r.occupied ? "dominion" : r.bloc),
        toll: regions.map(r => r.tollBurden),
        edgeCount: conduitEdges.length
      });
      snapNow(); // the founding

      // Sanctioned sites are ANCIENT: the Temple sanctified them where the
      // sacred substance lay at the founding (endowment0) and where the
      // Crown's writ was thin. Selected before the loop — sites do not move
      // as mines deplete.
      const S = Math.max(1, Math.round(regions.length / 12));
      const sanctScored = regions.map(reg => {
        const rj = sx("sanct#" + reg.id);
        return { reg, s: 0.45 * (100 - reg.centrality) + 0.35 * reg.endowment0 + (rj() - 0.5) * 12 };
      }).sort((a, b) => b.s - a.s || a.reg.id - b.reg.id);
      const sanctIdxs = [], sanctionedSites = [];
      for (let i = 0; i < S; i++) {
        const reg = sanctScored[i].reg;
        sanctIdxs.push(regions.indexOf(reg));
        sanctionedSites.push({ regionId: reg.id, x: reg.sitePt[0], y: reg.sitePt[1] });
      }

      // D4/D6 live politics: blocs recomputed whenever the refinery set OR the
      // sanctioned-site set changes. Crown reach is centrality (static);
      // Temple reach follows the LIVE shrines; magnate reach the SURVIVING
      // refineries.
      regions.forEach(reg => { reg.blocChanges = 0; reg.bloc = undefined; });
      // #93: declared before computeBlocs so the per-epoch re-contest can read a
      // faction's fortune. Starts at 0 (founding politics unchanged); the F2
      // toll-war loop fills it each epoch.
      const treasuries = { crown: 0, temple: 0, magnate: 0 };
      const computeBlocs = () => {
        const templeCdNow = costDistances(regions, sanctIdxs).dist;
        const refNow = regions.map((_, i) => i).filter(i => regions[i].refining > 0);
        const magCdNow = costDistances(regions, refNow).dist;
        regions.forEach((reg, i) => {
          // #93: a faction's REACH follows its FORTUNE, not only distance. The
          // base is geography (temple/refinery cost-distance, seat centrality),
          // static — so blocs almost never re-contested. Fold the faction's
          // treasury (its winnings from the toll wars) INTO the reach itself, so
          // a winning faction's grip extends and contested ground changes hands
          // as the balance of power shifts. Bounded + 0 at founding (treasuries
          // start at 0, so the founding reach and politics are unchanged). These
          // ARE the exported reach columns, so dominant_bloc stays the exact
          // argmax of what the file carries — the recomputability contract holds.
          const boost = (F) => Math.min(treasuries[F], 40) * 0.25;
          reg.templeReach = clamp(Math.round(100 * Math.exp(-(isFinite(templeCdNow[i]) ? templeCdNow[i] : 1e9) / 400) + boost("temple")), 0, 100);
          reg.magnateReach = clamp(Math.round(100 * Math.exp(-(isFinite(magCdNow[i]) ? magCdNow[i] : 1e9) / 400) + boost("magnate")), 0, 100);
          reg.crownReach = clamp(Math.round(reg.centrality + boost("crown")), 0, 100); // the seat's pull = centrality + the Crown's fortune
          const fields = [["crown", reg.crownReach], ["temple", reg.templeReach], ["magnate", reg.magnateReach]];
          fields.sort((a, b) => b[1] - a[1]); // stable: crown wins exact ties deterministically
          const b = fields[0][1] < BLOC_FLOOR ? "ungoverned"
            : (fields[0][1] - fields[1][1] < BLOC_TOL ? "contested" : fields[0][0]);
          if (reg.bloc !== undefined && reg.bloc !== b) reg.blocChanges++;
          reg.bloc = b;
          // F2: on contested ground, remember WHICH two claims meet there
          reg.topTwo = b === "contested" ? [fields[0][0], fields[1][0]] : null;
        });
      };
      computeBlocs(); // the founding politics

      // P1: apostate towers — 0-2 rogue arcanists squatting where governance
      // and the grid both fail. Sited on the founding POLITICAL map, not
      // geology: the tower is a symptom of state failure, and it moves when
      // the state does.
      const rT = sx("towers");
      const nTower = (() => { const c = rT(); return c < 0.15 ? 0 : c < 0.75 ? 1 : 2; })();
      const towerIdxs = [];
      if (nTower > 0) {
        const tCands = regions.map((reg, i) => ({
          i, s: (reg.bloc === "ungoverned" ? 40 : reg.bloc === "contested" ? 20 : reg.bloc === "crown" ? -30 : 0) +
            (onGrid[i] ? 0 : 25) + (100 - reg.centrality) * 0.2 + (rT() - 0.5) * 8
        })).sort((a, b) => b.s - a.s || a.i - b.i);
        tCands.slice(0, nTower).forEach(c => towerIdxs.push(c.i));
      }
      regions.forEach((reg, i) => { reg.hasTower = towerIdxs.includes(i) ? 1 : 0; });

      // F1 HOLDINGS: the chokepoint assets are owned. At the founding each
      // belongs to its host's dominant bloc; contested or ungoverned ground
      // holds its own tolls for no one.
      const holdings = [];
      geo.bridges.forEach(b => holdings.push({ type: "bridge", regionIdx: b.regionIdx, ref: b }));
      geo.passes.forEach(p => holdings.push({ type: "pass", regionIdx: p.regionIdx, ref: p }));
      portIdxs.forEach(i => holdings.push({ type: "port", regionIdx: i, ref: regions[i] }));
      holdings.forEach(h => {
        const b = regions[h.regionIdx].bloc;
        h.heldBy = (b === "crown" || b === "temple" || b === "magnate") ? b : "none";
        h.ref.heldBy = h.heldBy;
        // B6 (#128): the crossing's CONDITION — sound at the founding (1), it decays
        // when its tolls go unfunded (a toll amnesty, or an unheld span no one pays
        // to keep). A rotted span brings its friction back: the ford and the wall
        // the bridge and the pass were built to spare. Sound until time runs.
        h.condition = 1;
        h.ref.condition = 1;
      });
      // tolls: walk each region's least-cost paths to the seat and to its
      // port; every HELD chokepoint along the way (self excluded) levies
      const computeTolls = () => {
        const heldSet = new Set(holdings.filter(h => h.heldBy !== "none").map(h => h.regionIdx));
        regions.forEach((reg, i) => {
          let t = 0;
          let cur = i;
          while (cur !== seatIdx && seatRun.parent[cur] !== -1) {
            cur = seatRun.parent[cur];
            if (heldSet.has(cur)) t += TOLL_SEAT * tollScale; // every held gate on the king's road
          }
          if (seaRun) {
            cur = i;
            while (seaRun.parent[cur] !== -1) {
              cur = seaRun.parent[cur];
              if (heldSet.has(cur)) t += TOLL_PORT * tollScale; // and on the way to the water
            }
          }
          reg.tollBurden = i === freeTownIdx ? 0 : clamp(Math.round(t), 0, 100); // the free town tolls no one
        });
      };
      // B6 (#128): the OTHER face of the same paths — a DECAYED crossing brings its
      // friction back for everyone whose least-cost road to the seat or the sea must
      // thread it, tolled or free (a rotted bridge is a ford again; a rotted pass, a
      // wall). Mirrors computeTolls, but counts CONDITION, not who holds the gate.
      const computeCrossingFriction = () => {
        const decayMap = new Map();
        holdings.forEach(h => {
          if (h.condition < 1) {
            const pen = DECAY_FRICTION * (1 - h.condition);
            decayMap.set(h.regionIdx, Math.max(decayMap.get(h.regionIdx) || 0, pen));
          }
        });
        regions.forEach((reg, i) => {
          if (decayMap.size === 0) { reg.crossFriction = 0; return; }
          let f = 0, cur = i;
          while (cur !== seatIdx && seatRun.parent[cur] !== -1) {
            cur = seatRun.parent[cur];
            if (decayMap.has(cur)) f += decayMap.get(cur);
          }
          if (seaRun) {
            cur = i;
            while (seaRun.parent[cur] !== -1) {
              cur = seaRun.parent[cur];
              if (decayMap.has(cur)) f += decayMap.get(cur);
            }
          }
          reg.crossFriction = clamp(Math.round(f), 0, 100);
        });
      };
      computeTolls(); // the founding exposure: who WOULD pay, before time runs
      computeCrossingFriction(); // all sound at the founding → 0 for everyone
      // #55: the founding snapshot predates politics — refresh its two
      // political columns now that blocs and tolls exist (epoch-0 truth)
      epochSnaps[0].bloc = regions.map(r => r.occupied ? "dominion" : r.bloc);
      epochSnaps[0].toll = regions.map(r => r.tollBurden);

      // D3 event machinery: seeded triggers, epoch-stamped consequences.
      const events = [];
      const rEv = fx("events");
      // #88: the scheduling WINDOW for a one-shot event. Historically each was
      // `min(ep, CAP)` — a fixed early cap tuned for a ~12-epoch world, so a
      // longer history front-loaded all its politics into the first ~third and
      // ran quiet after. Widen the window PROPORTIONALLY once the timeline
      // outgrows the cap, so a long world spreads its politics the way its
      // weather already does. Tuned so ep<=12 is BYTE-IDENTICAL: at ep=12 the
      // proportional term (ep*CAP/12) equals CAP, so max() picks the old value;
      // it only grows for ep>12. Pure arithmetic on params.ep — no stream draw,
      // so determinism is untouched and the same rand draw lands in a wider span.
      const evWindow = (cap) => Math.max(Math.min(Math.max(params.ep, 1), cap), Math.round(Math.max(params.ep, 1) * cap / 12));
      const collapseThresh = 0.35 + rEv() * 0.2;          // ore share that breaks the industry
      const calamityCoin = rEv() < 0.65;                   // most worlds, not all
      const calamityEpoch = 1 + Math.floor(rEv() * evWindow(8));
      const calamitySite = sanctIdxs.length ? sanctIdxs[Math.floor(rEv() * sanctIdxs.length)] : -1;
      const strikeCoin = rEv() < 0.5;                      // half of worlds find the hidden lode
      const strikeEpoch = 2 + Math.floor(rEv() * evWindow(7));
      let warCoin = rEv() < 0.55;                          // most contested seams eventually burn
      let warEpoch = 3 + Math.floor(rEv() * evWindow(7));
      const E0sum = regions.reduce((s, r) => s + r.endowment, 0);
      let collapsed = false, collapseEpoch = -1, refounded = false, warIdx = -1;
      let firstWoundIdx = -1, firstWoundEpoch = -1, consecrated = false;
      // F1 faction machinery: its own stream, so the older histories only
      // shift where the new mechanics genuinely touch them
      const rF = fx("factions");
      const SEIZE_PREF = {
        crown: { pass: 1.25, bridge: 1.0, port: 0.9 },
        temple: { pass: 0.95, bridge: 0.95, port: 0.9 },
        magnate: { pass: 0.85, bridge: 1.15, port: 1.3 }
      };
      const reachOf = (F, reg) => F === "crown" ? reg.centrality : F === "temple" ? reg.templeReach : reg.magnateReach;
      const towerBurnT = 42 + rF() * 15;   // the bar past which the strong burn the strange
      const raiseCoin = rF() < 0.6;
      const raiseEpoch = 3 + Math.floor(rF() * evWindow(6));
      // F2: tensions and the war bar (treasuries declared above for #93)
      const pairKey = (a, b) => [a, b].sort().join("_");
      const tensions = { crown_magnate: 0, crown_temple: 0, magnate_temple: 0 };
      const T_WAR = 55 + rF() * 20;
      let warPair = null;
      // F3: the treaty that follows the war
      let warFactions = null, warEpochFired = -1, treatyDone = false;
      // V1: institutions and the revolt — the counter-currents' dice
      const rIns = fx("institutions");
      const respCoin = rIns();                 // <0.45 reform, <0.75 reaction, else nothing
      const rV = fx("revolt");
      const revoltBar = 95 + rV() * 25 + (params.order - 50) * 0.5; // B9 (#131): order raises the bar to rise — a police state suppresses revolt; an open realm invites it (neutral at 50)
      let responded = false, revoltIdx = -1, revoltWon = false;
      let revoltAvertedIdx = -1;   // E1 (#142): a rising the governor headed off
      // B11 (#133): THE POWERS BEYOND THE SEA. Empire works by REACH, not by
      // the fleet — it courts, it wires, it owns the works, and it leaves when
      // the ore runs out. Two are named: the METROPOLE that courts this realm,
      // and the RIVAL it is courted against (imperial_rivalry). Deterministic
      // in the world seed's sibling stream, so the powers are stable per world.
      const rImp = fx("imperial");
      const POWERS = ["the Meridian Concord", "the Tashkar Compact", "the Aurean League",
        "the Cindral Directorate", "the Vantic Crown", "the Kestrel Powers", "the Solvent States",
        "the Ferran Concord", "the Osmark Combine", "the Calderon Accord", "the Verrant Hegemony",
        "the Corvine League", "the Halcyon Powers", "the Ostreme Coalition", "the Peregrine States",
        "the Sable Ascendancy", "the Drammel Consortium", "the Vantreth Imperium"];
      const mpi = Math.floor(rImp() * POWERS.length);
      let rvi = Math.floor(rImp() * (POWERS.length - 1)); if (rvi >= mpi) rvi++;
      const metropoleName = POWERS[mpi], rivalName = POWERS[rvi];
      let concessionFired = false, embargoFired = false, courtingFired = false; // one narrated marker apiece
      // X1 → THE LIMIT CASE: THE DOMINION — the power that stops courting and
      // lands. Real empire mostly never invades: it reaches (concessions,
      // embargo, attention). So the fleet is now RARE — the coin is cut from a
      // half to a third: most of the time the empire judges reach enough and
      // sends factors, not a garrison. Annexation is the exception now, not the
      // rule (B11 #133). It still lands at the wealthiest quay it can reach.
      const rX = fx("dominion");
      const dominionCoin = rX() < 0.33;
      // the Dominion favors an early arrival (a fleet does not wait a realm out),
      // so its window stays the smallest — it still scales, but lands sooner.
      const dominionEpoch = 2 + Math.floor(rX() * evWindow(5));
      let dominionAt = -1, footholdIdx = -1; // occupied/occupiedEpoch reset at wealth init
      let dominionRepelled = -1;   // E1 (#142): the epoch a governor turned the fleet away
      const dilemmaFired = {};     // E1: each authored dilemma is offered once
      let charterRefused = -1;     // E1: the epoch a governor refused the metropole's charter
      // E5: the dynasty structure — reigns drawn blind before time runs;
      // the names come later (after the world has taken all of its own)
      const rD = fx("dynasty");
      const dynasties = { crown: [], temple: [], magnate: [] };
      for (const F of ["crown", "temple", "magnate"]) {
        dynasties[F].push({ from: 0, contested: false });
        let at = 0;
        while (true) {
          const reign = 3 + Math.floor(rD() * 5); // 3-7 epochs on the seat
          at += reign;
          if (at > params.ep) break;
          dynasties[F].push({ from: at, contested: rD() < 0.3 });
        }
      }
      regions.forEach(reg => { reg.eventType = "none"; reg.eventEpoch = -1; reg.eventSeverity = 0; reg.plagued = false; });

      // D7: THE YEARS MOVE THE LAND — weather, ground, discovery, and the god.
      // Six seeded, epoch-stamped shocks write a decaying eventLegacy that feeds
      // livability, so places bloom and wither with the passing centuries. Each
      // strikes where the GEOGRAPHY makes it likely (a drought on dry ground, a
      // storm on an exposed coast) so the same world always suffers the same
      // way. Susceptibility is read from founding geography, fixed for the run.
      const rW = sx("weather");
      // quake country: near a ridge axis (a pass sits on one; a shadow cell lies
      // behind the wall) — the ground that folds is the ground that shakes.
      const quakeProne = regions.map(reg => (reg.isPass ? 1 : 0) || (reg.rangeShadow === 1 && reg.elevation >= 55 ? 1 : 0));
      // each shock is a coin + a target epoch, drawn blind before time runs; a
      // world may see several across its centuries. Draw a small schedule.
      const SHOCKS = ["drought", "flood", "quake", "storm", "discovery", "ascendancy"];
      const shockPlan = [];
      const span = Math.max(params.ep, 1);
      for (const kind of SHOCKS) {
        // frequency by kind: weather is common, a discovery or a god's rise rarer
        const p = kind === "discovery" ? 0.4 : kind === "ascendancy" ? 0.45 : 0.6;
        let at = 1 + Math.floor(rW() * span);
        while (at <= params.ep) {
          if (rW() < p) shockPlan.push({ kind, epoch: at });
          at += 1 + Math.floor(rW() * 3); // a few years between repeats of a kind
        }
      }

      // ---- THE DYNAMIC LOOP (D1) --------------------------------------------
      // Epoch 0 is the founding snapshot above (params.ep = 0 reproduces the
      // static model exactly). Each further epoch: ore depletes, wealth
      // accumulates, people migrate along roads, the grid ratchets outward
      // chasing the winners, and the dumping re-targets the poor.
      // B0 (#121): the world outside arrives as numbers — the price index shocks
      // this epoch's aetherstone income; the rest of the series rides for its
      // future consumers. Founding above already ran at price 1 (world-invariant).
      const worldSeries = worldStreams(params.world || DEFAULTS.world, params.ep);
      const rInv = fx("investment"); // B2: the counting house's luck — which placements build and which bust
      for (let e = 0; e < params.ep; e++) {
        const worldPrice = worldSeries.price_index[e]; // this epoch's aetherstone price
        regions.forEach(reg => { reg.E = Math.round(reg.E * 0.78); }); // mines draw down
        // B1 (#123): artifice moves once per epoch. Investment lifts it where the
        // town can afford to reinvest (a STUB — B2 makes credit the real channel);
        // it diffuses weakly from higher-artifice neighbours (works teach); it
        // decays slowly without upkeep. Diffusion reads the epoch-start A, so the
        // pass is order-independent. Crashes (war/collapse) are applied at those
        // events below. This is the one un-conserved channel: total wealth now
        // rises where A rises and falls where A decays or crashes.
        {
          const Aprev = regions.map(r => r.A);
          regions.forEach((reg, i) => {
            // investment lifts A where the town has surplus to reinvest (wealth
            // is a low index, ~10 typical, so the bar is low); works teach the
            // neighbours; upkeep-less artifice erodes. Wealthy realms out-invest
            // the decay and GROW the pie; poor ones fall behind and shrink it.
            // B2 (#124): the investment pool. The owners' coin (elite share of
            // the town's wealth) is the investable capital; the counting house
            // intermediates it into the works. How much BUILDS (A grows, the
            // floor rises) vs merely DEEPENS the owners' row (comprador
            // extraction) turns on RETENTION (does the coin stay to build?) and
            // the world REGIME (does capital dare?). Booms attract capital and
            // build; busts starve it and, with the counting house's luck, wipe
            // part of the works — the owners eat that loss (elite share's first
            // ordinary decrement). worldPrice still tilts the whole channel.
            const nbrs = reg.neighbors;
            const nbrA = nbrs.length ? nbrs.reduce((s, n) => s + Aprev[n], 0) / nbrs.length : Aprev[i];
            const diffuse = 0.08 * (nbrA - Aprev[i]);
            // the pool: the owners' coin, LEVERAGED by the counting house
            // (credit reaches past cash on hand) and tilted by the world price.
            // B9 (#131): order dampens the appetite to RISK capital — a police state's
            // owners hoard behind the wall, an open realm's dare (the pool is where the
            // safety/stagnation trade bites the works). Neutral at 50 (the old world).
            const pool = 1.8 * reg.wealth * (reg.eliteShare / 100) * (0.5 + 0.5 * worldPrice) * (1 - (params.order - 50) / 100 * 0.8);
            // the development share — the coin that BUILDS vs merely hoards.
            // Retention (does value stay local, or is it a foreign claim?) and
            // the world price (does capital dare?) decide. A high-retention
            // boom builds hardest; a low-retention bust barely builds at all —
            // that is the development-finance / comprador split of §3.6.
            const dev = clamp(0.16 + 0.006 * reg.retention + 0.55 * (worldPrice - 1), 0.05, 0.95);
            const bustP = clamp(0.05 - 0.35 * (worldPrice - 1), 0.01, 0.40);
            if (rInv() < bustP) {
              reg.A = clamp(Math.round(Aprev[i] * 0.72 + diffuse), 0, 100); // the works go dark in the bust
              reg.investBustLoss = 4;       // the owners eat the loss (applied in the elite drift below)
              reg.compradorGain = 0;
            } else {
              const build = pool * dev * (100 - Aprev[i]) / 100;            // opportunity-gated development
              reg.A = clamp(Math.round(Aprev[i] + build + diffuse - 1.3), 0, 100);
              reg.compradorGain = 0.08 * pool * (1 - dev);                  // the coin that didn't build hoards up
              reg.investBustLoss = 0;
            }
          });
        }
        // V1: the Crown Granary, where decreed — a levy on the fat years,
        // bread in the lean ones; wealth is pulled toward the median, ±3 a year
        const medW2 = granaryOn
          ? regions.map(r => r.wealth).sort((a, b) => a - b)[Math.floor(regions.length / 2)] : 0;
        // WATER ACCESS IS CONTESTED. A region with little water of its own
        // depends on a neighbor's, and that neighbor may SHARE it or PRICE it
        // OUT. The denial rises when the water-holding neighbor is (a) a
        // different bloc (political rivalry, feeds tension and war) or (b)
        // much richer (economic pricing, feeds injustice and revolt). A
        // well-watered region owes no one; a dry one at the mercy of a
        // hostile, wealthy neighbor loses much of its effective access. This
        // is the inequality Zeo wanted: not raw geography, but who controls
        // the water and whether they let you drink.
        regions.forEach(reg => {
          // the region's own surface/ground water is never denied
          const own = reg.waterAccess;
          if (own >= 70) { reg.effWaterAccess = own; reg.waterDenial = 0; return; }
          // else it leans on the best-watered neighbor; that neighbor's
          // disposition sets how much of the shortfall it actually gets
          let bestNbr = null, bestNbrWA = -1;
          for (const nb of reg.neighbors) {
            if (regions[nb].waterAccess > bestNbrWA) { bestNbrWA = regions[nb].waterAccess; bestNbr = regions[nb]; }
          }
          if (!bestNbr || bestNbrWA <= own) { reg.effWaterAccess = own; reg.waterDenial = 0; return; }
          const shortfall = bestNbrWA - own;           // the water it could borrow
          const hostile = (bestNbr.bloc !== undefined && reg.bloc !== undefined &&
                           bestNbr.bloc !== reg.bloc && bestNbr.bloc !== "ungoverned" && reg.bloc !== "ungoverned") ? 1 : 0;
          const richer = Math.max(0, (bestNbr.wealth - reg.wealth)) / 100; // 0..1
          // denial in [0,1]: worst case both political and economic gates shut
          const denial = clamp(0.45 * hostile + 0.7 * richer, 0, 1);
          reg.waterDenial = Math.round(100 * denial * (shortfall / 100)); // 0..~
          reg.effWaterAccess = clamp(Math.round(own + shortfall * (1 - denial)), 0, 100);
        });
        // B11 (#133): IMPERIAL REACH — the empire presses on the coast this epoch,
        // struck BEFORE income so both channels land in this year's wealth.
        //   EMBARGO: a hostile world regime (trade_war) closes the sea lanes; an
        //     exposed coast loses its trade pole for the epoch (income reads
        //     reg.embargoed). The deepest-exposed live port marks the bust.
        //   CONCESSIONS: the Metropole's ATTENTION is keyed to REMAINING ORE —
        //     attention × (E/100) × sea-reach = the imperial interest. Cross the
        //     high bar and a concession OPENS (foreign capital owns the works: a
        //     FOREIGN CLAIM on the ore-yield, the coast force-wired, capital fed
        //     in while the ore is wanted). Fall below the low bar — the ore drawn
        //     down or the attention gone — and it is WOUND UP: the markets leave
        //     (ruin) and the levies stop (freedom). The courted→developed→
        //     squeezed→abandoned arc, generated from the depleting ore alone.
        const regime = worldSeries.regime_chain[e];
        const attention = worldSeries.imperial_attention[e];
        const embargoOn = (regime === "trade_war");
        let embBest = -1;
        regions.forEach((reg, i) => {
          reg.embargoed = false;
          if (!reg.settled) return;
          const coastal = reg.isPort === 1 || reg.seaAccess >= 40;
          if (embargoOn && coastal) {
            reg.embargoed = true; // the lanes are shut; income zeros the sea leg
            if (embBest === -1 || reg.seaAccess > regions[embBest].seaAccess) embBest = i;
          }
          const reach = reg.isPort === 1 ? 1 : clamp(reg.seaAccess / 100, 0, 1);
          // interest keys to the remaining lode with a floor: a rich coast is
          // courted even part-depleted while attention runs high, and is let go
          // when the ore thins AND the attention turns elsewhere — aetherstone
          // is why the attention exists, so it leaves with the ore.
          const interest = attention * reach * (0.30 + 0.70 * clamp(reg.E / 40, 0, 1));
          if (!reg.concession) {
            if (!reg.occupied && !reg.concessionEnded && coastal && interest >= 0.40) {
              reg.concession = true; reg.concessionEpoch = e + 1;
              reg.foreignClaim = 0.5;                               // half the ore-yield repatriates
              // NB: the concession is wired to the METROPOLE by sea, not force-hooked
              // into the realm's aetherstone conduit — so it is NOT marked on_grid
              // (that grid is the seat's, and an enclave hookup with no trunk edge
              // would leave a region on-grid but disconnected). Development rides the
              // capital inflow below, not the conduit.
              reg.eliteShare = Math.min(92, reg.eliteShare + 3);    // the works' owners are its factors (comprador)
              if (!concessionFired) {
                concessionFired = true;
                events.push({ epoch: e + 1, type: "concession", region_id: reg.id, power: metropoleName });
              }
            }
          } else if (interest < 0.20) {
            // the ore or the attention has gone — the concession is wound up
            reg.concession = false; reg.foreignClaim = 0;           // the levies stop: FREEDOM
            reg.concessionEnded = true; reg.concessionEndEpoch = e + 1;
            reg.A = Math.round(reg.A * 0.85);                       // the foreign works go quiet: RUIN
            events.push({ epoch: e + 1, type: "abandonment", region_id: reg.id,
              power: metropoleName, since: reg.concessionEpoch });
          }
        });
        if (embargoOn && embBest >= 0 && !embargoFired) {
          embargoFired = true;
          events.push({ epoch: e + 1, type: "embargo", region_id: regions[embBest].id, power: rivalName });
        }
        // a courting note during the rivalry — the RIVAL bids for a rich coast the
        // Metropole has not taken (diplomacy surface; no reach machinery of its own)
        if (regime === "imperial_rivalry" && !courtingFired) {
          let cb = -1;
          regions.forEach((reg, i) => { if (reg.settled && reg.isPort === 1 && !reg.concession && !reg.occupied && (cb === -1 || reg.wealth > regions[cb].wealth)) cb = i; });
          if (cb >= 0) { courtingFired = true; events.push({ epoch: e + 1, type: "courting", region_id: regions[cb].id, power: rivalName }); }
        }
        regions.forEach((reg, ri) => {
          // F1: connection itself is taxed — every held gate on the way out
          // takes its cut before anything compounds — and the cut is not
          // burned, it is BANKED at the gate: the toll house enriches the
          // holder's town with money that was someone else's growth
          const gateIncome = holdings.reduce((s2, h) => s2 + (h.regionIdx === ri && h.heldBy !== "none" && h.heldBy !== "dominion" ? 2 : 0), 0);
          const bread = granaryOn ? clamp(Math.round(0.18 * (medW2 - reg.wealth)), -6, 6) : 0;
          // X1: the tribute — the Dominion's column in the realm's ledger.
          // The occupied pay at the quay; the free pay the Crown's
          // assessment, and the Crown assesses its own bloc gently
          const trib = dominionAt === -1 ? 0 : (reg.occupied ? 3 : (reg.bloc === "crown" ? 1 : 2));
          // B11 (#133): the concession's capital — foreign investment fed to the
          // works while the ore is wanted, decoupled from local production (the
          // DEVELOPMENT-FINANCE reading of the same coin the foreignClaim skims).
          // It scales with attention × remaining ore, so it FADES as the lode
          // draws down — development that leaves before the town does.
          const concIn = reg.concession ? Math.round(2 + 6 * attention * clamp(reg.E / 40, 0, 1)) : 0;
          const wealthBefore = reg.wealth; // #93: for the ownership drift below
          reg.wealth = clamp(Math.round(0.6 * reg.wealth + 0.4 * 100 * income(reg, worldPrice, worldSeries.foreign_demand[e]) - 0.035 * reg.tollBurden + gateIncome + bread - trib + concIn), 0, 100); // B10 (#132): foreign demand scales the coast's trade; B11 (#133): + concession capital
          if (reg.wealth > reg.peakWealth) reg.peakWealth = reg.wealth;
          // H1: the rents concentrate before anything trickles — the gate's
          // take and the works' profit land on the owners' row first; only
          // the granary's bread lands on labor's
          // B5 (#127): the owners' row can fall in ORDINARY times, not only in the
          // fires. Where MARKET ACCESS is high, competition bids concentrated rents
          // DOWN (an isolated valley keeps its monopoly; a well-connected town does
          // not); a BOOM mints new owners who dilute the old row (rank churn without
          // collapse); and the owners' capture of the town's upswing is itself bid
          // toward labor where the market reaches. A POLICE STATE freezes it all —
          // under occupation the rents are held by force, so the row neither erodes
          // nor churns (an `occupied` proxy until B9's order axis). No catastrophe.
          const marketAccess = clamp(0.5 * reg.centrality / 100 + (onGrid[ri] ? 0.5 : 0), 0, 1); // central AND wired = reached by the market
          // rentKeep: how much of a gain the owners still capture where rivals bid it
          // down — scales the whole rent-capture ratchet AND the wealth upswing; an
          // isolated valley keeps its monopoly (rentKeep 1), a wired hub does not.
          const rentKeep = reg.occupied ? 1 : (1 - 0.85 * marketAccess);
          // #93: ownership drifts with the town's FORTUNES, not only its assets.
          // When wealth rises the owners' row captures the upside first (rents
          // concentrate before wages) — but only where competition does not bid the
          // gain toward labor; when wealth FALLS, the owners bear it in full (scarce
          // labor bargains the whole loss up). A gentle 0.2/point drift so a plain
          // town's ownership tracks its trajectory instead of freezing between shocks.
          const wealthSwing = reg.wealth - wealthBefore;
          const wealthDrift = 0.2 * wealthSwing * (wealthSwing > 0 ? rentKeep : 1); // the upside is competed away; the downside is not
          // B9 (#131): the ORDER AXIS retires B5's raw `occupied` churn proxy. Churn
          // freezes with ORDER: occupied ground is a local police state (orderLevel +50),
          // so at the default order (50) it STILL fully freezes (byte-identical to B5);
          // a global police state (order 100) freezes everyone, an open realm (order 0)
          // churns harder. churnFactor: 50→1 neutral, 100→0 frozen, 0→2 wide-open.
          const orderLevel = clamp(params.order + (reg.occupied ? 50 : 0), 0, 100);
          const churnFactor = clamp(1 - (orderLevel - 50) / 50, 0, 2);
          // R3 (#166): THE ORDINARY CHANNEL IS r - g. It used to be a pile of authored
          // increments: events added to the owners' row while the decrements were
          // threshold-gated (the old competition term only bit above eliteShare 33) or
          // shunted to the catastrophe ledger. That is a hardcoded moral sign, which is
          // exactly what P2 says this model must not do, and it meant ordinary times
          // could only concentrate.
          //
          // Now concentration drifts by whether returns on holdings outrun growth
          // (Piketty 2014; Piketty & Saez 2003): dS = k*(r - g)*S*(1-S).
          //   r  what the owners' stock earns: tolls, works, live seams, the sky lanes,
          //      plus B2's placements, net of what a bust took off them.
          //   g  what the region earns per head, PLUS the competitive churn that bids
          //      concentrated rents toward labour (the old competition and boom-churn
          //      terms, folded in as #166 asks, and no longer gated on a threshold).
          // S(1-S) is what keeps a share a share: drift stalls as the row approaches
          // either bound, so the 8/92 clamp is a guard rather than the mechanism.
          //
          // A boom region where g outruns r now COMPRESSES through the ordinary
          // channel, with no event required. The discrete levelings (plague, revolt,
          // the company leaving) and concentrations (war, occupation, expropriation)
          // stay where the literature puts them, on the Scheidel 2017 shock ledger,
          // and are all charged to eliteCatDelta so the ordinary reading is clean.
          const S = reg.eliteShare / 100;
          const ownerYield = 0.75 * gateIncome      // the toll house pays the holder's men
            + (reg.refining > 0 ? 0.8 : 0)          // the works pay their masters
            + (reg.E >= 40 ? 0.5 : 0)               // live seams pay their charter-holders
            + (reg.isSkyport === 1 ? 0.6 : 0);      // the aerie: absentee owners cluster at the lanes
          // Both sides must be PER-EPOCH RATES or the comparison is meaningless. The
          // first cut of this divided elite-share POINTS by 100 and got r about 0.006
          // against a g swinging to -0.29, so (r - g) was just -g: any region whose
          // wealth fell concentrated violently, and the row ran to its clamp.
          const yieldNorm = clamp((rentKeep * ownerYield
            + (reg.compradorGain || 0)              // B2: the coin that didn't build deepens the row
            - (reg.investBustLoss || 0)) / R3_YIELD_REF, 0, 3);
          const rReturn = R3_R_BASE * yieldNorm;    // holdings earn ~5% an epoch at reference intensity
          // g is ORDINARY growth. A collapse is not ordinary, and routing it through
          // this channel would let the shock ledger's business leak in twice, so the
          // per-capita term is bounded to ordinary swings; catastrophes stay discrete.
          const growthRaw = wealthBefore > 0 ? wealthSwing / wealthBefore : 0;
          const gGrowth = clamp(growthRaw, -0.15, 0.15)
            + churnFactor * 5.5 * marketAccess / 100          // the market bids concentrated rents down
            + churnFactor * 2.4 * clamp(wealthSwing / 10, 0, 1) / 100; // a boom mints new owners
          const dS = R3_DRIFT_K * (rReturn - gGrowth) * S * (1 - S) * 100;
          reg.eliteShare = clamp(reg.eliteShare
            + dS
            // #93's direct capture, KEPT. The obvious tidy is to delete it as
            // double-counting the swing g already carries, and that was measured:
            // without it, booming-region compression falls from 55% to 32% (41% to 25%
            // on the wider atlas sweep), because r beats g nearly everywhere in a realm
            // this poorly connected. The term that LOOKS like the authored ratchet is
            // what gives the r-g channel its other sign.
            + wealthDrift                          // the owners still capture the swing first, before r-g settles it
            - 0.6 * Math.max(0, bread), 8, 92);    // bread reaches the bottom
        });
        // B3 (#125): migration's SECOND edge — three flows before the old drift.
        // EMIGRATION off-map: the metropole pulls the young away, hardest where
        // the grid exposes them to it and the local ladder is short (a proxy for
        // the §3.4 attention column — where a region's mind lives). It is a real
        // population dip, not a move to a neighbour. REMITTANCES: the accumulated
        // diaspora sends coin home, a wealth inflow decoupled from local
        // production that holds a floor under the emptying town.
        const metroPull = worldSeries.metropole_pull[e];
        regions.forEach((reg, i) => {
          reg.emigEpoch = 0; reg.remitEpoch = 0;
          if (!reg.settled) return;
          const exposure = onGrid[i] ? 1 : 0.4;
          const shortLadder = clamp((45 - reg.wealth) / 45, 0, 1);
          // the pull concentrates where the local ladder is SHORT — a prosperous
          // seat with opportunity at home barely empties; a poor grid town whose
          // young can see the metropole down the line empties fastest.
          const attn = clamp(metroPull * (0.12 + 0.88 * shortLadder) * exposure, 0, 1);
          const emig = Math.round(0.03 * reg.settlementPop * attn);
          reg.emigEpoch = emig;
          reg.emigrantsTotal += emig;
          reg.settlementPop = Math.max(20, reg.settlementPop - emig);
          // remittances hold a FLOOR under the emptying town, not a fortune —
          // sqrt-scaled off the diaspora and capped at ONE coin an epoch (a handful
          // of points across a decade). A heavy-diaspora periphery can draw a real
          // remittance-economy share (the coin abroad is a fifth of some worlds'
          // wealth, as it is for the Nepals and Tajikistans of the world), but the
          // inflow never PEGS a town's wealth or reverses a bust world's decline:
          // under the hard Concordat default the pie still shrinks in 18/20 worlds.
          const remit = clamp(Math.round(Math.sqrt(reg.emigrantsTotal) * metroPull * 0.30), 0, 1);
          reg.remitEpoch = remit;
          reg.remittanceTotal += remit;
          reg.wealth = clamp(reg.wealth + remit, 0, 100); // decoupled from income
          // the remittance floor is real wealth this epoch: the peak must see it,
          // or a town lifted above its old high by the coin sent home would export
          // peak_wealth < wealth (the invariant the stress sweep guards).
          if (reg.wealth > reg.peakWealth) reg.peakWealth = reg.wealth;
        });
        // migration: toward wealth, light, and clean land — capped at 15%/epoch
        // out. B3: the FRONTIER term. When the realm's cores squeeze rents hard
        // (high mean owners' share), two things happen: the high-rent cores push
        // their squeezed labor OUT (the rent drag), and a cheap peripheral cell
        // the grid has reached pulls that labor IN (the frontier bonus). People
        // flow OUTWARD against the wealth gradient and a periphery can boom.
        const settledElite = regions.filter(r => r.settled).map(r => r.eliteShare);
        const meanElite = settledElite.length ? settledElite.reduce((a, b) => a + b, 0) / settledElite.length : 55;
        const rentPush = clamp((meanElite - 58) / 14, 0, 1); // only higher-rent realms push labor out; the ordinary world still drifts toward its winners
        const isConcentrate = disposalOverride ? disposalOverride === "concentrate" : (params.db >= 34 && params.db < 67);
        const attract = regions.map((reg, i) => {
          // R2 (#165): HARRIS-TODARO expected income, replacing an ad-hoc weighted
          // sum. People do not move toward the highest wage, they move toward the
          // highest wage TIMES the chance of actually getting work (Harris & Todaro
          // 1970). Employment probability is proxied by artifice per head: the works
          // and trades a place carries (A), divided by the labour already queuing for
          // them, so a rich town with no jobs left to give pulls less than its wage
          // suggests, and a modest town still hiring pulls more.
          const jobsPerHead = reg.A / (1 + reg.settlementPop / 900);
          const opportunity = clamp(jobsPerHead / 100, 0, 1);
          const expectedIncome = reg.wealth * opportunity;
          // ROBACK 1982 compensating differentials: wages are not the whole story.
          // The grid and clean ground are amenities people will trade income for, so
          // they enter as a separate term rather than being folded into the wage.
          // NOTE: this is uniform avoidance of blight, NOT the income-sorting channel
          // ("coming to the nuisance") that R5 (#168) needs. This model has no
          // household-level income heterogeneity, so poor and rich value the
          // dis-amenity identically here. See the R5 discussion before assuming this
          // supplies the EJ negative mode.
          const amenity = 25 * (onGrid[i] ? 1 : 0) + (25 - 0.052 * reg.blight); // #180: was 0.25*(100-blight); 0.25/4.8 keeps the same pull at median load
          const base = expectedIncome + amenity;
          const rentDrag = 0.4 * Math.max(0, reg.eliteShare - 62);     // the squeezed leave the dear core
          const frontier = 26 * rentPush
            * clamp((52 - reg.wealth) / 52, 0, 1)             // the land is still cheap
            * clamp((52 - reg.centrality) / 52, 0, 1)         // and it is the periphery
            * (onGrid[i] ? 1 : 0.35);                         // the grid carries the boom outward
          // B4 (#126): the OPENED FRONTIER. Concentrate writes the sacrifice zone off
          // as cheap land — and cheap land, while it is still CLEAN, draws a settler
          // rush (P4). The pull fades as the concentrated poison ramps in, so a zone
          // that filled early is left holding the blight it was promised would stay
          // empty. Whether the rush wins the race with the poison is the contingency:
          // some worlds fill and are ruined, others never fill and stay contained.
          const rush = (i === sacrificeZone && isConcentrate)
            ? 26 * clamp(1 - reg.blight / 100, 0, 1) * (onGrid[i] ? 1 : 0.5) // #180: was /55 in max-normalised units
            : 0;
          return base - rentDrag + frontier + rush;
        });
        const delta = new Array(regions.length).fill(0);
        roadEdges.forEach(edge => {
          const gA = attract[edge.b] - attract[edge.a];
          if (gA > 0) { const m = 0.05 * regions[edge.a].settlementPop * gA / 100; delta[edge.a] -= m; delta[edge.b] += m; }
          else if (gA < 0) { const m = 0.05 * regions[edge.b].settlementPop * (-gA) / 100; delta[edge.b] -= m; delta[edge.a] += m; }
        });
        // #178: THE DIFFERENTIAL EXIT, the post-siting half of the story. The block
        // above moves PEOPLE toward income. This one moves COIN away from poison, and
        // it moves it at different speeds for different pockets: the propertied are
        // SORT_WTP times readier to leave a dirty place than labour is, because they
        // can afford to be. A town the mobile stratum walks out of keeps its heads and
        // loses its money, so its mean income falls. That is the accounting shadow of
        // "coming to the nuisance", and it is why the blight-poverty relation no longer
        // needs a poverty-targeting exponent to exist at all.
        //
        // It reads LAST epoch's blight (computeBlight runs later in this loop), which is
        // the correctness condition rather than an oversight: sorting is a response to
        // poison already on the ground, not a forecast of poison to come.
        //
        // POOLED PRESERVATION is what keeps this from being a dial. phiP and phiL are
        // derived so their head-mix-weighted mean is exactly SORT_CHURN * g: the realm
        // gains NO net aversion to blight, only a SPLIT in who acts on it. Turn
        // SORT_WTP to 1 and the whole block becomes a no-op by construction.
        //
        // It is UNGATED and therefore two-signed. It never reads params.db, never reads
        // the doctrine, never reads refining, and never reads wealth-as-poverty. Under
        // concentrate the dirty ends are poor towns and their coin drains. Under
        // disperse the spoil lands around the works, which are RICH, and the identical
        // code drains theirs. A town whose blight FALLS receives coin and gets richer,
        // which is gentrification, on the same three lines, with no special case.
        //
        // WHAT IT DOES NOT DO: no headcount moves. settlementPop, attract[] and delta[]
        // are untouched and elite_pop_pct stays the structural formula both suites pin
        // exactly. What moves is coin and a mean. The model carries one population
        // number per region, so a true two-stream sort is not buildable here without
        // falsifying an exported-column identity. Read this as a reduced form.
        // It also reads eliteShare and NEVER writes it: writing it was prototyped and
        // rejected for ratcheting realm median elite_share from 25 to 50 through the B2
        // investment loop, which would have let R5 contaminate R3's evidence.
        {
          const move = new Array(regions.length).fill(0);
          roadEdges.forEach(edge => {
            const A = regions[edge.a], B = regions[edge.b];
            if (!A.settled || !B.settled) return;
            const g = Math.abs(A.blight - B.blight) / 480; // #180: /4.8 keeps the rate #178 pinned at 0.03
            if (g === 0) return; // deterministic no-op on ties
            const di = A.blight > B.blight ? edge.a : edge.b; // the dirtier end
            const ci = di === edge.a ? edge.b : edge.a;
            const dirty = regions[di];
            const q = ownerHeadPct(dirty) / 100;
            const phiP = SORT_CHURN * g * SORT_WTP / (q * SORT_WTP + (1 - q));
            const phiL = phiP / SORT_WTP;
            const dphi = clamp(phiP - phiL, 0, 1);
            const coin = dirty.settlementPop * dirty.wealth * (dirty.eliteShare / 100) * dphi;
            move[di] -= coin;
            move[ci] += coin;
          });
          regions.forEach((reg, i) => {
            if (!reg.settled || move[i] === 0) return;
            const C = reg.settlementPop * reg.wealth;
            const nC = Math.max(1, C + move[i]);
            reg.wealth = clamp(Math.round(nC / reg.settlementPop), 0, 100);
            if (reg.wealth > reg.peakWealth) reg.peakWealth = reg.wealth;
          });
        }
        regions.forEach((reg, i) => {
          if (reg.settled) {
            // a living town: migrate, then check whether the land has failed
            // it. Livability below the ABANDON floor, or a population bled to
            // nothing, empties the cell: it becomes a dead zone (a ruin, a
            // name on an old map), and its people are already gone (migrated
            // out above). Hysteresis: abandon at <20, found at >=45, so a
            // place on the edge does not flicker in and out year to year.
            // The SEAT never empties: a capital is held by will, not just by
            // the land, so it is immune to abandonment (and stays exported).
            const d = Math.max(delta[i], -0.15 * reg.settlementPop);
            reg.settlementPop = Math.max(20, Math.round(reg.settlementPop + d));
            // occupied ground is held by the garrison as the seat is held by
            // will: the imperial peace keeps it manned, so it (and the Dominion's
            // foothold harbor) never empties into a dead zone under occupation.
            if (!reg.isCapital && !reg.occupied && (reg.livability < 20 || reg.settlementPop <= 22)) {
              reg.settled = 0; reg.abandonedEpoch = e + 1;
              reg.settlementPop = 0; reg.population = 0; reg.tier = "none";
              // the abandonment is now this cell's headline event: it overrides
              // any earlier same-cell event (a tower raised then deserted, a gate
              // seized then emptied) so event_type never promises a standing
              // asset the dead zone no longer holds.
              reg.eventType = "settlement_abandoned"; reg.eventEpoch = e + 1;
              reg.eventSeverity = Math.max(reg.eventSeverity, 60);
              events.push({ epoch: e + 1, type: "settlement_abandoned", region_id: reg.id });
            } else {
              if (reg.settlementPop > reg.peakPop) reg.peakPop = reg.settlementPop;
              reg.population = Math.round(reg.settlementPop * (1 + reg.rural));
            }
          } else {
            // empty land: does anyone come? Only if the ground is now worth
            // living on AND a settled neighbor can spill people onto it (the
            // frontier spreads from the settled, it does not spark in a void).
            // A cell abandoned before and resettled now is REBORN, often as a
            // different kind of place (a mined-out ore town resettled around a
            // later shrine); rebirths counts how many lives it has had.
            const founded = reg.livability >= 45 &&
              reg.neighbors.some(nb => regions[nb].settled);
            if (founded) {
              reg.settled = 1; reg.settledEpoch = e + 1;
              if (reg.abandonedEpoch >= 0) reg.rebirths++;
              reg.settlementPop = 40 + Math.round(0.3 * (reg.livability - 45));
              reg.peakPop = Math.max(reg.peakPop || 0, reg.settlementPop);
              reg.population = Math.round(reg.settlementPop * (1 + reg.rural));
              reg.tier = "frontier-post"; // re-ranked below; a newcomer starts small
              // a fresh life clears the abandonment headline: the cell holds a
              // town again, so its event column resets to none until a later
              // shock stamps it (a real event this same epoch may overwrite).
              reg.eventType = "none"; reg.eventEpoch = -1; reg.eventSeverity = 0;
              events.push({ epoch: e + 1, type: "settlement_founded", region_id: reg.id });
            }
          }
        });
        gtEase = Math.min(gtEase + 2, 24); // #93: the bar eases as the realm matures, bounded
        expandConduit();   // the grid chases the winners (ratchet: once built, kept)

        // D3 events — lived history, epoch-stamped
        if (!collapsed && E0sum > 0) { // industry consolidates as the fields tire
          const Esum = regions.reduce((s, r) => s + r.E, 0);
          if (Esum / E0sum < collapseThresh) {
            let victim = null;
            regions.forEach(r => {
              if (r.refining > 0 && (!victim || r.refining < victim.refining ||
                  (r.refining === victim.refining && r.id < victim.id))) victim = r;
            });
            if (victim) {
              victim.refining = 0; victim.A = Math.round(victim.A * 0.55); collapsed = true; collapseEpoch = e + 1; // B1: the works go dark — artifice crashes with the industry
              { const _es0 = victim.eliteShare; victim.eliteShare = Math.max(8, victim.eliteShare - 10); victim.eliteCatDelta += victim.eliteShare - _es0; } // the owners' row leaves with the company (B5: charged to the catastrophe ledger, not ordinary erosion)
              victim.eventType = "refinery_collapse"; victim.eventEpoch = e + 1;
              victim.eventSeverity = 70 + Math.round(rEv() * 20);
              events.push({ epoch: e + 1, type: "refinery_collapse", region_id: victim.id });
              computeBlocs(); // the magnates' reach recedes; the map re-contests
            }
          }
        }
        // D4: capital doesn't die, it moves. Two epochs after a collapse, the
        // magnates found a replacement where the money went.
        if (collapsed && !refounded && e + 1 >= collapseEpoch + 2) {
          let site = null, bestS = -Infinity;
          regions.forEach(reg => {
            if (reg.refining > 0 || reg.eventType === "refinery_collapse") return;
            const s2 = 0.5 * reg.wealth + 0.3 * reg.centrality + 0.2 * (100 - reg.ruggedness);
            if (s2 > bestS || (s2 === bestS && site && reg.id < site.id)) { bestS = s2; site = reg; }
          });
          if (site) {
            refounded = true;
            site.refining = Math.round(60 + rEv() * 40);
            site.eliteShare = Math.min(92, site.eliteShare + 12); // the company arrives, owners first
            const siteIdx = regions.indexOf(site);
            onGrid[siteIdx] = true; // trunk hookup to the seat
            let cur = siteIdx;
            while (cur !== seatIdx && seatRun.parent[cur] !== -1) {
              const pnode = seatRun.parent[cur];
              addEdge(cur, pnode, "trunk");
              onGrid[pnode] = true;
              cur = pnode;
            }
            site.eventType = "refinery_founded"; site.eventEpoch = e + 1;
            site.eventSeverity = 60 + Math.round(rEv() * 30);
            events.push({ epoch: e + 1, type: "refinery_founded", region_id: site.id });
            computeBlocs(); // magnate reach surges at the new works
          }
        }
        // D5: the strike — the hidden lode surfaces; a rush begins
        if (strikeCoin && e + 1 === strikeEpoch) {
          let epi = null;
          regions.forEach(reg => {
            if (reg.hiddenOre > 20 && (!epi || reg.hiddenOre > epi.hiddenOre ||
                (reg.hiddenOre === epi.hiddenOre && reg.id < epi.id))) epi = reg;
          });
          if (epi) {
            regions.forEach(reg => { if (reg.hiddenOre > 0) reg.E = clamp(reg.E + reg.hiddenOre, 0, 100); });
            epi.E = clamp(epi.E + Math.max(50, epi.hiddenOre), 0, 100); // the epicenter is rich
            epi.eventType = "ore_strike"; epi.eventEpoch = e + 1;
            epi.eventSeverity = Math.max(60, Math.min(100, epi.hiddenOre));
            events.push({ epoch: e + 1, type: "ore_strike", region_id: epi.id });
            if (epi.bloc === "contested") { // D6: fortune on disputed ground turns it hot
              warCoin = true;
              // accelerate a pending war, or schedule one if the date passed
              // cold (>= e+1: the war block below still runs this epoch)
              warEpoch = warEpoch >= e + 1 ? Math.min(warEpoch, e + 3) : e + 3;
            }
          }
        }
        // D5: war — live politics chooses the battlefield: the most valuable
        // CONTESTED region burns. The garrison comes after the blood.
        if (warCoin && warIdx === -1 && e + 1 === warEpoch) {
          let wreg = null, wbest = -Infinity;
          regions.forEach(reg => {
            if (reg.bloc !== "contested" || reg.occupied) return; // the Dominion keeps its own peace
            // F2: the battlefield prefers ground where the warring pair meets
            const pairBonus = (warPair && reg.topTwo &&
              pairKey(reg.topTwo[0], reg.topTwo[1]) === pairKey(warPair[0], warPair[1])) ? 40 : 0;
            const v = 0.5 * reg.E + 0.5 * reg.wealth + pairBonus;
            if (v > wbest || (v === wbest && wreg && reg.id < wreg.id)) { wbest = v; wreg = reg; }
          });
          if (wreg) {
            warIdx = regions.indexOf(wreg);
            wreg.settlementPop = Math.max(20, Math.round(wreg.settlementPop * 0.7));
            wreg.population = Math.round(wreg.settlementPop * (1 + wreg.rural));
            wreg.wealth = Math.round(wreg.wealth * 0.75);
            // war wrecks the productive base, not just the stock — mines
            // ruined, institutions broken, capacity permanently wounded —
            // so the scar persists whatever the region produced
            wreg.E = Math.round(wreg.E * 0.7);
            wreg.retention = Math.round(wreg.retention * 0.7);
            wreg.warTorn = true; wreg.A = Math.round(wreg.A * 0.6); // B1: war wrecks the works — artifice crashes
            // R3 (#166): ON THE SHOCK LEDGER. #166 enumerates war among the discrete
            // Scheidel channels, so its move is charged to eliteCatDelta and OUT of the
            // ordinary reading. One honest divergence from the issue's own wording: it
            // files war under "levelings", and here war CONCENTRATES (+5). Scheidel's
            // leveling war is MASS-MOBILIZATION war (Scheidel 2017, ch. 3-5); this
            // engine's war is a dynastic border war, which historically consolidated
            // surviving property claims rather than levelling them. The sign is left as
            // the engine has it rather than flipped to match a label.
            { const _es0 = wreg.eliteShare; wreg.eliteShare = Math.min(92, wreg.eliteShare + 5); wreg.eliteCatDelta += wreg.eliteShare - _es0; } // property survives people (shock ledger)
            wreg.eventType = "war"; wreg.eventEpoch = e + 1;
            wreg.eventSeverity = 70 + Math.round(rEv() * 25);
            const facs = warPair || wreg.topTwo || ["crown", "magnate"];
            warFactions = facs.slice().sort();
            warEpochFired = e + 1;
            events.push({ epoch: e + 1, type: "war", region_id: wreg.id, factions: warFactions });
          }
        }
        // X1: THE ARRIVAL — the Dominion's fleet stands off the realm's
        // best quay. A coast inside the maelstrom's reach turns it back:
        // the storm is a wall the empire cannot toll.
        if (dominionCoin && dominionAt === -1 && e + 1 === dominionEpoch) {
          let best = -1;
          regions.forEach((reg, i) => {
            // the Dominion lands at a LIVE harbor: an abandoned quay is no prize
            // (and occupying a dead zone would resurrect it with settled === 0)
            if (reg.isPort !== 1 || !reg.settled || !clearOfMael(reg)) return;
            if (best === -1 || reg.wealth > regions[best].wealth ||
                (reg.wealth === regions[best].wealth && i < best)) best = i;
          });
          // E1 (#142): the fleet stands off the quay and the governor answers it.
          // The choice is only offered where the dice actually produced a landing —
          // option 0 is the fleet coming ashore, as it always did. There is no option
          // to summon a fleet the dice never sent: a decision may redirect history,
          // not invent an event.
          if (best >= 0 && ["land", "repel"][reign.decide("d", e + 1, ["land", "repel"])] === "repel") {
            // REPELLED. G5's adversarial list names this case for a reason: it is the
            // one takeover whose refusal has to be narrated, or the chronicle simply
            // has a quiet year where an empire was turned away. The refusal is not
            // free — the realm pays for the fleet it kept out.
            const fh = regions[best];
            fh.eventType = "dominion_repelled"; fh.eventEpoch = e + 1;
            fh.eventSeverity = 55;                       // fixed: refusing consumes no die
            dominionRepelled = e + 1;
            treasuries.crown = Math.max(0, treasuries.crown - 12);  // the muster is paid for
            tensions[pairKey("crown", "magnate")] += 10;            // the quay's owners wanted the trade
            events.push({ epoch: e + 1, type: "dominion_repelled", region_id: fh.id });
          } else if (best >= 0) {
            footholdIdx = best; dominionAt = e + 1;
            const occRun = costDistances(regions, [footholdIdx]);
            regions.forEach((reg, i) => {
              if (occRun.dist[i] > OCC_R) return;
              reg.occupied = true; reg.occupiedEpoch = e + 1;
              reg.retention = Math.round(reg.retention * 0.6);   // the yield leaves the realm
              { const _es0 = reg.eliteShare; reg.eliteShare = Math.min(92, reg.eliteShare + 4); reg.eliteCatDelta += reg.eliteShare - _es0; } // the occupation hires the owners' row (R3 #166: an UPWARD shock, charged to the ledger beside expropriation)
              // the extractive corridor: the zone is force-wired to the
              // quay — the conduit reaches you when someone else wants
              // what you have (Dijkstra prefix: the path stays in the ball)
              onGrid[i] = true;
              let cur = i;
              while (cur !== footholdIdx && occRun.parent[cur] !== -1) {
                addEdge(cur, occRun.parent[cur], "trunk");
                onGrid[occRun.parent[cur]] = true;
                cur = occRun.parent[cur];
              }
            });
            // the quays and gates of the occupied country now toll for a
            // power no one in the realm can even petition
            holdings.forEach(h => {
              if (regions[h.regionIdx].occupied) { h.heldBy = "dominion"; h.ref.heldBy = "dominion"; }
            });
            const fh = regions[footholdIdx];
            fh.eventType = "annexation"; fh.eventEpoch = e + 1;
            fh.eventSeverity = 75 + Math.round(rX() * 20);
            events.push({ epoch: e + 1, type: "annexation", region_id: fh.id,
              occupied: regions.filter(r => r.occupied).length });
          }
        }
        // E5: successions — power changes hands in a room, not on a map.
        // A contested court takes no gates this year, and the rivals circle.
        for (const F of ["crown", "temple", "magnate"]) {
          const idx = dynasties[F].findIndex(r => r.from === e + 1);
          if (idx > 0) {
            const R = dynasties[F][idx];
            events.push({ epoch: e + 1, type: "succession", faction: F, ruler: idx, contested: R.contested });
            if (R.contested)
              for (const G of ["crown", "temple", "magnate"])
                if (G !== F) tensions[pairKey(F, G)] += 12;
          }
        }
        // F1: THE FACTION TURN. Every faction scores every gate it does not
        // hold — live reach at the host, a taste for the asset type, minus
        // the holder's reach and an inertia bar. The single strongest claim
        // in the realm is pressed this epoch, if any clears zero.
        {
          // F2: the toll ledgers fill — every held gate pays its holder
          for (const F of ["crown", "temple", "magnate"])
            treasuries[F] += 3 * holdings.filter(h => h.heldBy === F).length;
          let best = null;
          for (const F of ["crown", "temple", "magnate"]) {
            if (dynasties[F].some(r => r.from === e + 1 && r.contested)) continue; // the court fights itself
            for (const h of holdings) {
              if (h.heldBy === F || h.heldBy === "dominion") continue; // garrisoned gates are not for sale
              const host = regions[h.regionIdx];
              const mine = reachOf(F, host) * SEIZE_PREF[F][h.type];
              const theirs = h.heldBy === "none" ? 30 : reachOf(h.heldBy, host);
              // the ledger buys: a fat treasury lowers the bar
              const s = mine - theirs * 0.9 - 22 + rF() * 8 + Math.min(treasuries[F], 30) * 0.5;
              if (s > 0 && (!best || s > best.s)) best = { F, h, s };
            }
          }
          if (best) {
            const host = regions[best.h.regionIdx];
            const victim = best.h.heldBy;
            best.h.heldBy = best.F;
            best.h.ref.heldBy = best.F;
            treasuries[best.F] = Math.max(0, treasuries[best.F] - 12); // takings cost
            host.eliteShare = Math.min(92, host.eliteShare + 3); // the new holder installs its own men
            if (victim !== "none") tensions[pairKey(best.F, victim)] += 25; // grievance
            host.eventType = "seizure"; host.eventEpoch = e + 1;
            host.eventSeverity = 60 + Math.round(rF() * 25);
            events.push({ epoch: e + 1, type: "seizure", region_id: host.id, faction: best.F });
          }
          // grievance accrues wherever two claims meet, and old grudges fade
          regions.forEach(reg => {
            if (reg.topTwo) tensions[pairKey(reg.topTwo[0], reg.topTwo[1])] += 1.2;
            // WATER GRIEVANCE: a region priced out of a hostile neighbor's
            // water resents the bloc that holds it. Thirst is a casus belli
            // the world over; this feeds the SAME tension the war trigger
            // reads, so a dry frontier under a rival's dam drifts to war.
            if (reg.waterDenial > 12 && reg.bloc !== undefined && reg.bloc !== "ungoverned" && reg.bloc !== "contested") {
              let holder = null, bestWA = reg.waterAccess;
              for (const nb of reg.neighbors)
                if (regions[nb].waterAccess > bestWA) { bestWA = regions[nb].waterAccess; holder = regions[nb]; }
              if (holder && holder.bloc !== undefined && holder.bloc !== reg.bloc &&
                  holder.bloc !== "ungoverned" && holder.bloc !== "contested")
                tensions[pairKey(reg.bloc, holder.bloc)] += 0.03 * reg.waterDenial; // scaled by how parched
            }
          });
          for (const k of Object.keys(tensions)) tensions[k] *= 0.92;
          // #93: re-contest the map each epoch now that the treasuries have moved
          // — a faction that won the year's gates extends its pull, so contested
          // ground changes hands as the balance of power shifts (blocs were
          // near-frozen: only 5% of cells ever flipped). blocChanges counts it.
          computeBlocs();
          // F2: war becomes policy — a pair past the bar spends its grievance
          if (warIdx === -1) {
            let hot = null;
            for (const k of Object.keys(tensions))
              if (tensions[k] >= T_WAR && (!hot || tensions[k] > tensions[hot])) hot = k;
            if (hot) {
              warCoin = true;
              warEpoch = warEpoch >= e + 1 ? Math.min(warEpoch, e + 2) : e + 2;
              warPair = hot.split("_");
              tensions[hot] = 0; // the grievance is spent in blood
            }
          }
        }
        // F1: the strong burn the strange — when Crown or Temple reach at a
        // tower clears the bar, the stronger of the two puts it to fire.
        // Tolerance decays as the realm consolidates: the bar drops with time.
        regions.forEach(reg => {
          if (reg.hasTower !== 1 || !reg.settled) return; // an emptied cell's tower falls with it, not to fire
          if (Math.max(reg.centrality, reg.templeReach) + 2.2 * (e + 1) >= towerBurnT) {
            reg.hasTower = 0;
            reg.eventType = "tower_burned"; reg.eventEpoch = e + 1;
            reg.eventSeverity = 65 + Math.round(rF() * 25);
            events.push({ epoch: e + 1, type: "tower_burned", region_id: reg.id, faction: reg.centrality >= reg.templeReach ? "crown" : "temple" });
          }
        });
        // F1: and where governance keeps failing, apostates raise new walls
        if (raiseCoin && e + 1 === raiseEpoch && regions.filter(r => r.hasTower === 1).length < 2) {
          let bi = -1, bs = -Infinity;
          regions.forEach((reg, ri) => {
            // no tower rises under the garrison, and none in a dead zone: an
            // apostate needs a failing town to squat in, not empty ground (else
            // the post-loop pass would strip the tower and leave a stale
            // tower_raised event on an abandoned cell).
            if (reg.hasTower === 1 || reg.occupied || !reg.settled) return;
            const s = (reg.bloc === "ungoverned" ? 40 : reg.bloc === "contested" ? 20 : reg.bloc === "crown" ? -30 : 0) +
              (onGrid[ri] ? 0 : 25) + (100 - reg.centrality) * 0.2 + (rF() - 0.5) * 8;
            if (s > bs || (s === bs && (bi === -1 || ri < bi))) { bs = s; bi = ri; }
          });
          if (bi >= 0 && bs > 30) {
            const reg = regions[bi];
            reg.hasTower = 1;
            reg.eventType = "tower_raised"; reg.eventEpoch = e + 1;
            reg.eventSeverity = 60 + Math.round(rF() * 20);
            events.push({ epoch: e + 1, type: "tower_raised", region_id: reg.id, faction: "apostate" });
          }
        }
        // F3: PEACE TERMS — the winter after the war, terms are set at the
        // battlefield. The winner brings more to the table: live reach at
        // the ground plus the depth of its ledger. The loser cedes its
        // nearest gates and pays tribute — and the winner's fattened ledger
        // buys the next seizure. Victory compounds.
        if (warIdx !== -1 && !treatyDone && warEpochFired > 0 && e + 1 === warEpochFired + 1) {
          treatyDone = true;
          const field = regions[warIdx];
          const strength = (F) => reachOf(F, field) + Math.min(treasuries[F], 40);
          const [a, b] = warFactions;
          const winner = strength(a) >= strength(b) ? a : b;
          const loser = winner === a ? b : a;
          const trib = Math.round(treasuries[loser] * 0.5);
          treasuries[loser] -= trib;
          treasuries[winner] += trib;
          const fp2 = [round2(field.c[0]), round2(field.c[1])];
          const ceded = holdings
            .filter(h => h.heldBy === loser)
            .sort((x, y) => {
              const dx = Math.hypot(round2(regions[x.regionIdx].c[0]) - fp2[0], round2(regions[x.regionIdx].c[1]) - fp2[1]);
              const dy = Math.hypot(round2(regions[y.regionIdx].c[0]) - fp2[0], round2(regions[y.regionIdx].c[1]) - fp2[1]);
              return dx - dy || x.regionIdx - y.regionIdx;
            })
            .slice(0, 2);
          ceded.forEach(h => { h.heldBy = winner; h.ref.heldBy = winner; });
          field.eventType = "treaty"; field.eventEpoch = e + 1;
          field.eventSeverity = 60 + Math.round(rF() * 20);
          events.push({ epoch: e + 1, type: "treaty", region_id: field.id, factions: warFactions, winner, ceded: ceded.length, tribute: trib });
        }
        // D7: the years' shocks. First the old wounds fade — eventLegacy decays
        // ~15%/epoch, so a drought's scar or a discovery's boom is loud the year
        // it lands and a memory a decade on. Then this epoch's scheduled shocks
        // land where geography invites them, stamping the cell and moving its
        // legacy (which computeLivability reads just below).
        regions.forEach(reg => { reg.eventLegacy = Math.round((reg.eventLegacy || 0) * 0.85); });
        for (const shock of shockPlan) {
          if (shock.epoch !== e + 1) continue;
          const rq = () => rW();
          // pick the cell the shock hits: the most susceptible, ties by id
          let best = null, bestScore = -1;
          const score = (reg) => {
            switch (shock.kind) {
              // dry ground with little water of its own suffers the drought
              case "drought": return reg.settled ? (100 - reg.waterAccess) * 0.6 + (100 - reg.effWaterAccess) * 0.4 : -1;
              // low river cells flood; a wet valley bottom drowns first
              case "flood": return (reg.onRiver === 1 && reg.elevation < 45) ? (60 - reg.elevation) + (reg.onRiver ? 20 : 0) : -1;
              // the folding ground shakes: passes and shadowed highland
              case "quake": return quakeProne[regions.indexOf(reg)] ? reg.elevation : -1;
              // the exposed coast takes the storm
              case "storm": return reg.onCoast === 1 ? 60 + (reg.settled ? 20 : 0) : -1;
              // a discovery surfaces where ore still hides, or on a live town
              case "discovery": return reg.settled ? (reg.hiddenOre || 0) + reg.wealth * 0.3 : -1;
              // the god's town rises: the strongest temple reach blooms
              case "ascendancy": return reg.templeReach || 0;
              default: return -1;
            }
          };
          regions.forEach(reg => { const s = score(reg); if (s > bestScore || (s === bestScore && best && reg.id < best.id)) { bestScore = s; best = reg; } });
          if (!best || bestScore <= 0) continue;
          const reg = best;
          const sev = 62 + Math.round(rq() * 30); // 62-92; event_severity floor is 60
          if (shock.kind === "drought") {
            reg.eventLegacy -= Math.round(sev * 0.35 * (1 - reg.effWaterAccess / 100)); // scaled by how dry
            reg.blight = clamp(reg.blight + 4, 0, 100); // parched land sours
          } else if (shock.kind === "flood") {
            reg.eventLegacy -= Math.round(sev * 0.3);
            // the flood scours blight downstream and dumps it here
            reg.blight = clamp(reg.blight + 6, 0, 100);
          } else if (shock.kind === "quake") {
            reg.eventLegacy -= Math.round(sev * 0.4);
            reg.blight = clamp(reg.blight + 3, 0, 100); // slides and broken ground
          } else if (shock.kind === "storm") {
            reg.eventLegacy -= Math.round(sev * 0.28);
          } else if (shock.kind === "discovery") {
            reg.eventLegacy += Math.round(sev * 0.45);      // a boom draws people back
            reg.E = clamp(reg.E + Math.round(sev * 0.3), 0, 100);
            reg.wealth = clamp(reg.wealth + Math.round(sev * 0.2), 0, 100);
            if (reg.wealth > reg.peakWealth) reg.peakWealth = reg.wealth;
          } else if (shock.kind === "ascendancy") {
            reg.eventLegacy += Math.round(sev * 0.4);       // pilgrims and coin flock
            reg.templeReach = clamp(reg.templeReach + 12, 0, 100);
          }
          reg.eventLegacy = clamp(reg.eventLegacy, -60, 60);
          reg.eventType = shock.kind; reg.eventEpoch = e + 1; reg.eventSeverity = sev;
          events.push({ epoch: e + 1, type: shock.kind, region_id: reg.id });
        }
        computeTolls(); // next epoch pays whoever holds the gates NOW
        // B6 (#128): tariffs fund the bridges. A crossing whose holder still collects a
        // real toll maintains itself; an unheld span, or one under a toll amnesty
        // (tollScale capped low), goes unfunded and ROTS a step this epoch. A garrison
        // re-tolls for the Dominion, so occupied crossings stay funded. Then the
        // friction the decay let back in is re-reckoned for the next epoch's trade.
        holdings.forEach(h => {
          const funded = h.heldBy !== "none" && (h.heldBy === "dominion" || tollScale >= UPKEEP_TOLL_MIN);
          h.condition = clamp(h.condition + (funded ? REPAIR_STEP : -DECAY_STEP), 0, 1);
          h.ref.condition = h.condition;
        });
        computeCrossingFriction();
        // #180: settle the epoch's contamination into the standing stock. Done ONCE
        // per epoch, here, so the several computeBlight calls inside an epoch all read
        // the same starting ground.
        for (let i = 0; i < regions.length; i++) blightCommitted[i] = blightPending[i];
        blightEpoch = e + 1; // B4: the concentrate ramp reads the current year
        computeBlight();   // the poison follows the poor wherever they end up
        computeLivability(); // and the land's worth-living-in is re-reckoned
        regions.forEach(reg => { // plague: maximum contamination + real population, once per region
          // #180: RE-DERIVED, not transplanted. 85 used to mean "within 15% of this
          // world's worst cell"; on an absolute scale it means "85% of ruined", and
          // settled ground reaches p90 53, so the gate collapsed onto the sacrifice
          // zone. That silently disabled the whole wound-response system, because a
          // plague in the written-off zone deliberately does not set firstWoundEpoch:
          // measured over 20 worlds, consecrations fell 11/20 -> 2/20 and the seat's
          // reforms 17/20 -> 11/20 while the units changed underneath them.
          // 70 is the value that preserves the MECHANISM'S INCIDENCE on inhabited
          // ground under the new units (47 plagues, 36 of them outside the zone,
          // against main's 40 and 34), which is what the units change was supposed to
          // leave alone. It also sits just above the ruin knee at 60, so a plague
          // strikes ground that has crossed into ruin — the same line the habitability
          // regime already draws, rather than a second unrelated number.
          if (!reg.plagued && reg.blight >= 70 && reg.settlementPop >= 500) {
            reg.plagued = true;
            reg.settlementPop = Math.max(20, Math.round(reg.settlementPop * 0.65));
            reg.population = Math.round(reg.settlementPop * (1 + reg.rural));
            // V1: the leveling plague — labor is scarce now, survivors charge
            // more; the same shock that scars can also compress
            reg.retention = Math.min(100, reg.retention + 15);
            { const _es0 = reg.eliteShare; reg.eliteShare = Math.max(8, reg.eliteShare - 8); reg.eliteCatDelta += reg.eliteShare - _es0; } // scarce labor bargains up (B5: catastrophe ledger)
            reg.eventType = "blight_plague"; reg.eventEpoch = e + 1; // latest event wins the columns
            reg.eventSeverity = 60 + Math.round(rEv() * 30);
            events.push({ epoch: e + 1, type: "blight_plague", region_id: reg.id });
            // B4 (#126): the Temple consecrates the ground of suffering — but NOT the
            // written-off sacrifice zone, which the concentrate doctrine dooms to die
            // (a shrine on it would be a dead shrine the moment the poison takes it).
            // The faith finds the next living wound instead.
            if (firstWoundIdx === -1 && regions.indexOf(reg) !== sacrificeZone) { firstWoundIdx = regions.indexOf(reg); firstWoundEpoch = e + 1; }
          }
        });
        if (calamityCoin && e + 1 === calamityEpoch && calamitySite >= 0) { // the unexplained erupts
          const site = regions[calamitySite];
          scar[calamitySite] = 3.5;
          site.eventType = "relic_calamity"; site.eventEpoch = e + 1;
          site.eventSeverity = 65 + Math.round(rEv() * 30);
          events.push({ epoch: e + 1, type: "relic_calamity", region_id: site.id });
          computeBlight(); // the scar shows immediately
          if (firstWoundIdx === -1) { firstWoundIdx = calamitySite; firstWoundEpoch = e + 1; }
        }
        // V1: REFORM AND REACTION — two epochs after the run's first wound,
        // the seat responds (or does not). The measure is chosen by what
        // ails the realm most, and it changes the loop's own parameters.
        if (!responded && firstWoundEpoch !== -1 && e + 1 >= firstWoundEpoch + 2) {
          responded = true;
          if (respCoin < params.iq / 100) {
            const darkShare = onGrid.filter(v => !v).length / regions.length;
            const meanToll = regions.reduce((a, r) => a + r.tollBurden, 0) / regions.length;
            // the spread of fortunes is itself an ailment the seat can read
            const ws = regions.map(r => r.wealth).sort((a, b) => a - b);
            const mw = ws.reduce((a, b) => a + b, 0) / ws.length;
            let gsum = 0;
            for (let gi = 0; gi < ws.length; gi++) gsum += (2 * (gi + 1) - ws.length - 1) * ws[gi];
            const giniNow = mw > 0 ? gsum / (ws.length * ws.length * mw) : 0;
            const medW = regions.map(r => r.wealth).sort((a, b) => a - b)[Math.floor(regions.length / 2)];
            const bottom = regions.filter(reg => reg.wealth < medW);
            const bottomOre = bottom.reduce((a, r) => a + r.E, 0) / Math.max(1, bottom.length);
            // the ore is CONCENTRATED — a realm's mean is near-nothing but its richest
            // seam runs deep. A price floor protects THAT seam's diggers, so the act
            // reads the realm's best ore, not its poor half (which is poor for lack of it).
            const richSeam = regions.reduce((m, r) => Math.max(m, r.E), 0);
            // the Retention Act: an ore price floor — the diggers keep more of what
            // their ground produces (only where the ground still holds a rich seam).
            const retentionAct = () => {
              retentionEpoch = e + 1; // B7 (#129): the floor frightens elite capital — flight begins
              bottom.forEach(reg => {
                reg.retention = Math.min(100, reg.retention + 15);
                reg.eliteShare = Math.max(8, reg.eliteShare - 4); // the price floor pays the digger
              });
            };
            // E1 (#142): SELECTION IS SEPARATED FROM APPLICATION. The cascade below
            // is the same ladder in the same order drawing the same numbers — note
            // `dumping_reform` still consumes rIns() exactly where it always did, so
            // a governor cannot change what the seat drew merely by being offered a
            // choice. What changes is that the ladder now NAMES a measure instead of
            // enacting one, and the enactment happens after the governor has spoken.
            const APPLY = {
              retention_act: () => retentionAct(),
              crown_granary: () => { granaryOn = true; granaryEpoch = e + 1; },
              grid_charter: () => { gtShift = -18; expandConduit(); charterDebt = CHARTER_LOAN; charterDebtEpoch = e + 1; }, // B7: the wires are strung on imperial credit
              toll_amnesty: () => { tollScale = 0.4; },
              dumping_reform: () => { disposalOverride = "disperse"; },
            };
            // The runner-up is the next DISTINCT measure the same ladder would reach,
            // computed from predicate state alone — it may not draw, because a draw
            // here would depend on which measure the ladder had already named and the
            // auto run's draw order would shift under it.
            const ladder = [
              ["retention_act", giniNow >= 0.42 && richSeam >= 60],
              ["crown_granary", giniNow >= 0.42],
              ["grid_charter", darkShare >= 0.55],
              ["toll_amnesty", meanToll >= 12],
              ["retention_act", bottomOre >= 18],
              ["crown_granary", true],
            ];
            let measure;
            // a RESOURCE-RICH but unequal realm floors its commodity price (a levy the
            // diggers keep) rather than importing bread — the retention act competes
            // with the granary where a rich seam runs (B7: gives the act a home).
            if (giniNow >= 0.42 && richSeam >= 60) measure = "retention_act";
            else if (giniNow >= 0.42) measure = "crown_granary";
            else if (darkShare >= 0.55) measure = "grid_charter";
            else if (meanToll >= 12) measure = "toll_amnesty";
            else if (params.db >= 34 && rIns() < 0.5) measure = "dumping_reform";
            else if (bottomOre >= 18) measure = "retention_act";
            else measure = "crown_granary";
            // the card: what the seat chose, and the nearest thing it nearly chose
            const alt = ladder.find(([m, live]) => live && m !== measure);
            const wOpts = alt ? [measure, alt[0]] : [measure];
            measure = wOpts[reign.decide("w", e + 1, wOpts)];
            APPLY[measure]();
            events.push({ epoch: e + 1, type: "reform", measure });
          } else if (respCoin < params.iq / 100 + 0.3) {
            let measure;
            if (rIns() < 0.5 && params.db < 67) { measure = "dumping_entrenched"; disposalOverride = "concentrate"; }
            else { measure = "toll_crackdown"; tollScale = 1.6; }
            events.push({ epoch: e + 1, type: "reaction", measure });
          } else if (worldSeries.doctrine_pressure[e] >= 0.55) {
            // B7 (#129): the seat is SILENT — but the creditors are not. Under a
            // pressing doctrine the imperial financiers DEMAND a measure the realm
            // did not choose: structural adjustment, austerity imposed from OUTSIDE.
            // This is the flip a deaf seat (low iq) invites and a listening one
            // (high iq, which reforms above and never reaches here) never sees —
            // the relation iq's extremes change: WHO governs, the seat or the loan.
            impositions++;
            granaryOn = false;                        // the bread stops
            tollScale = Math.min(2, tollScale + 0.4); // the gates are told to collect
            charterDebt = Math.max(charterDebt, CHARTER_LOAN); // and the adjustment is financed on more credit
            if (charterDebtEpoch === -1) charterDebtEpoch = e + 1;
            events.push({ epoch: e + 1, type: "imposition", measure: "structural_adjustment", imposed_by: "creditors" });
          }
        }
        // B7 (#129): THE LONG EDGES accrue EVERY epoch after their measure lands —
        // the delayed, state-contingent cost the §3.2 table promises (P4 delays).
        {
          // peace is read from THIS run's own log: any wound this epoch ends it
          const woundedThisEpoch = events.some(ev => ev.epoch === e + 1 &&
            ["blight_plague", "relic_calamity", "revolt", "refinery_collapse", "tower_burned"].includes(ev.type));
          // (a) THE GRID CHARTER'S DEBT: the imperial loan is serviced out of the
          // crown's treasury for the rest of the run — the wires reached the dark,
          // and the seat pays interest on them long after the ribbon-cutting.
          if (charterDebt > 0) {
            const service = Math.max(1, Math.round(charterDebt * DEBT_RATE));
            const paid = Math.min(service, treasuries.crown);
            treasuries.crown -= paid;
            debtServicePaid += paid;
            charterDebt = Math.max(0, charterDebt - paid * 0.5); // half retires principal, half is interest
          }
          if (woundedThisEpoch) lastWoundEpoch = e + 1;
          const peaceLen = (e + 1) - lastWoundEpoch; // epochs since the realm last bled
          // (b) THE GRANARY'S DEPENDENCY: run on through a LONG PEACE (3+ quiet epochs)
          // and the bread becomes a habit the realm cannot put down — dependency climbs
          // and the levy drains the treasury with no famine to justify it. The mercy
          // curdles ONLY in a SUSTAINED peace: a world still taking wounds every few
          // years has a granary doing its job, not rotting into a fiscal drain.
          if (granaryOn && granaryEpoch !== -1 && e + 1 >= granaryEpoch + 2 && peaceLen >= 3) {
            granaryDependency = Math.min(100, granaryDependency + DEPENDENCY_STEP);
            granaryDrain += 1;
            treasuries.crown = Math.max(0, treasuries.crown - 1);
          }
          // (c) THE RETENTION ACT'S CAPITAL FLIGHT: a price floor caps the owners'
          // return, so elite capital leaves the floored ground for freer air — the
          // owners' row and the artifice it funded thin where the act bit hardest.
          if (retentionEpoch !== -1 && e + 1 >= retentionEpoch + 1) {
            capitalFlight = Math.min(100, capitalFlight + FLIGHT_STEP);
            regions.forEach(reg => {
              if (reg.settled && reg.retention >= 90 && reg.eliteShare > 20) {
                reg.eliteShare = Math.max(8, reg.eliteShare - 1); // the row thins as capital flees
                reg.A = Math.max(0, reg.A - 1);                    // and the works it funded lose their edge
              }
            });
          }
        }
        // ---- E1 (#142): THE GOVERNOR'S DILEMMAS ----------------------------
        // Six authored decisions, each offered ONCE, at the first epoch its trigger
        // reads true. Every one of them:
        //   * consumes no randomness, so being offered cannot move a world;
        //   * has OPTION 0 = THE STATUS QUO, so a reign that answers nothing runs
        //     exactly the code that ran before the dilemmas existed;
        //   * pulls a Phase B lever with a long edge already in the physics, which
        //     is why the near edge is on the card and the far edge is discovered.
        // The seat is a GOVERNOR's, so the axis is comply / resist / skim against a
        // metropole that is always the other party to the bargain.
        {
          const settledNow = regions.filter(r => r.settled);
          const dark = onGrid.filter(v => !v).length / Math.max(1, regions.length);
          const tollMean = regions.reduce((a, r) => a + r.tollBurden, 0) / Math.max(1, regions.length);
          const wsv = settledNow.map(r => r.wealth).sort((a, b) => a - b);
          const mwv = wsv.reduce((a, b) => a + b, 0) / Math.max(1, wsv.length);
          let gs = 0;
          for (let gi = 0; gi < wsv.length; gi++) gs += (2 * (gi + 1) - wsv.length - 1) * wsv[gi];
          const giniHere = mwv > 0 ? gs / (wsv.length * wsv.length * mwv) : 0;
          const bled = events.some(ev => ev.epoch === e + 1 &&
            ["blight_plague", "relic_calamity", "revolt", "war"].includes(ev.type));

          const offer = (kind, live, options) => {
            if (dilemmaFired[kind] || !live) return 0;
            dilemmaFired[kind] = true;
            return reign.decide(kind, e + 1, options);
          };

          // (c) THE CONDUIT. The dark country can be wired on the metropole's credit.
          //     Long edge: B7's charter debt, serviced out of the crown for the rest
          //     of the run. Comply and the wires reach; the interest reaches too.
          if (offer("c", dark >= 0.40 && charterDebt <= 0 && gtShift === 0, ["hold", "borrow"]) === 1) {
            gtShift = -18; expandConduit();
            charterDebt = CHARTER_LOAN; if (charterDebtEpoch === -1) charterDebtEpoch = e + 1;
            events.push({ epoch: e + 1, type: "decree", measure: "conduit_charter", by: "governor" });
          }
          // (g) THE GRANARY. Bread now against a habit later — B7's dependency curdles
          //     the mercy only in a SUSTAINED peace, which is the far edge exactly.
          if (offer("g", bled && !granaryOn, ["hold", "open"]) === 1) {
            granaryOn = true; granaryEpoch = e + 1;
            events.push({ epoch: e + 1, type: "decree", measure: "crown_granary", by: "governor" });
          }
          // (o) THE ORE FLOOR. Resist the metropole's price and the diggers keep more;
          //     B7's capital flight thins the owners' row and the works it funded.
          if (offer("o", giniHere >= 0.45 && retentionEpoch === -1, ["hold", "floor"]) === 1) {
            retentionEpoch = e + 1;
            const medHere = wsv[Math.floor(wsv.length / 2)] || 0;
            regions.forEach(reg => {
              if (!reg.settled || reg.wealth >= medHere) return;
              reg.retention = Math.min(100, reg.retention + 15);
              reg.eliteShare = Math.max(8, reg.eliteShare - 4);
            });
            events.push({ epoch: e + 1, type: "decree", measure: "retention_act", by: "governor" });
          }
          // (t) THE GATES. Cut the tariff and the roads open while the treasury thins;
          //     raise it and the crown eats while the taxed road pays. The skim.
          {
            const pick = offer("t", tollMean >= 15, ["hold", "cut", "raise"]);
            if (pick === 1) { tollScale = 0.4; events.push({ epoch: e + 1, type: "decree", measure: "toll_amnesty", by: "governor" }); }
            else if (pick === 2) { tollScale = 1.6; events.push({ epoch: e + 1, type: "decree", measure: "toll_crackdown", by: "governor" }); }
          }
          // (s) THE SPOIL. B4's doctrine, taken by hand: concentrate writes a zone off
          //     and spares everywhere else; disperse spreads the same poison thin.
          {
            const conc = disposalOverride ? disposalOverride === "concentrate" : (params.db >= 34 && params.db < 67);
            const pick = offer("s", conc && sacrificeZone >= 0, ["hold", "disperse"]);
            if (pick === 1) { disposalOverride = "disperse"; events.push({ epoch: e + 1, type: "decree", measure: "dumping_reform", by: "governor" }); }
          }
          // (n) THE CHARTER. A coast the metropole wants. Today it simply takes it;
          //     a governor may refuse, and keep the yield and lose the capital that
          //     would have built on it (B11's concession, both edges).
          {
            const wanted = regions.findIndex(r => r.concession && r.concessionEpoch === e + 1);
            const pick = offer("n", wanted >= 0, ["accept", "refuse"]);
            if (pick === 1) {
              const reg = regions[wanted];
              reg.concession = false; reg.concessionEpoch = -1; reg.foreignClaim = 0;
              reg.eliteShare = Math.max(8, reg.eliteShare - 3);   // the factors never arrive
              reg.A = Math.max(0, reg.A - 6);                     // and neither does their capital
              charterRefused = e + 1;
              events.push({ epoch: e + 1, type: "decree", measure: "charter_refused", by: "governor", region_id: reg.id });
            }
          }
          // G5's adversarial list names the treasury floor: no decree may drive the
          // crown below nothing, whatever it costs.
          treasuries.crown = Math.max(0, treasuries.crown);
          treasuries.temple = Math.max(0, treasuries.temple);
          treasuries.magnate = Math.max(0, treasuries.magnate);
        }
        // V1: THE REVOLT — once per run, the region where injustice, tolls,
        // and darkness stack highest can rise. Its strength against the
        // seat's decides: crushed, or a free town.
        if (revoltIdx === -1 && e + 1 >= 4) {
          let ri = -1, rs = -Infinity;
          regions.forEach((reg, i) => {
            if (reg.isCapital || i === warIdx) return;
            const sc = reg.injustice + 0.5 * reg.tollBurden + (onGrid[i] ? 0 : 15) + (reg.occupied ? 18 : 0);
            if (sc > rs || (sc === rs && (ri === -1 || i < ri))) { rs = sc; ri = i; }
          });
          if (ri >= 0 && rs >= revoltBar) {
            revoltIdx = ri;
            const reg = regions[ri];
            const stateStr = 42 + 0.5 * reg.centrality + Math.min(40, treasuries.crown) + rV() * 25
              + (reg.occupied ? 25 : 0); // the imperial garrison stands behind the wardline
            // E1 (#142): the seat's dice say one thing; the governor may say another.
            // Option 0 is what the dice rolled, so echoing them runs this block
            // unchanged. Diverging legitimately changes the draws that follow —
            // a different history has different luck, and that is not a byte-pin
            // failure but the whole point of taking the seat.
            const diceWon = rs > stateStr + 20;
            // AVERTED is the third road, and G5's adversarial list names its ripples
            // rather than its existence: a rising that never happens must leave every
            // consumer of revolt state coherent. Six of them read it —
            //   (1) the once-per-run guard `revoltIdx`, which must still close, or the
            //       next epoch simply offers the same rising again;
            //   (2) `freeTownIdx`, which sets tollBurden to zero for a town that was
            //       never freed — it stays -1;
            //   (3) `crushedIdx`, which posts a garrison after the hangings — there
            //       were no hangings, so it must not fire (the ripple that bites);
            //   (4) `wonArc`, which earns a town the byname "the Free" or "the
            //       Famished" — it stays null;
            //   (5) the region's own `eventType`, which must not read "revolt";
            //   (6) the `revolt` event itself, which the chronicle narrates and the
            //       findings read as the run's turning point — an aversion is its own
            //       event type, so neither mistakes it for a rising that happened.
            const rOpts = diceWon ? ["won", "crushed", "averted"] : ["crushed", "won", "averted"];
            const outcome = rOpts[reign.decide("r", e + 1, rOpts)];
            if (outcome === "averted") {
              // the seat reads the fires on the horizon and buys the grievance off
              // before it lights. Peace is not free: it is paid for out of the crown
              // and conceded out of the yield.
              revoltAvertedIdx = ri;
              treasuries.crown = Math.max(0, treasuries.crown - 15);
              reg.retention = Math.min(100, reg.retention + 8);
              reg.injustice = Math.round(100 * (reg.blight / 100) * (1 - reg.wealth / 100));
              events.push({ epoch: e + 1, type: "revolt_averted", region_id: reg.id, by: "governor" });
            } else if ((revoltWon = outcome === "won")) {
              freeTownIdx = ri;                       // tolls no one, ever again
              reg.retention = 100;                    // keeps what it makes
              { const _es0 = reg.eliteShare; reg.eliteShare = Math.max(8, reg.eliteShare - 25); reg.eliteCatDelta += reg.eliteShare - _es0; } // the charters burn with the manor (B5: catastrophe ledger)
              holdings.forEach(h => { if (h.regionIdx === ri) { h.heldBy = "none"; h.ref.heldBy = "none"; } });
              reg.occupied = false; // liberation: the factors are thrown into the harbor
              tollScale *= 0.7;                       // fear spreads: every holder softens
              // B8 (#130): LIBERATION IS A DISTRIBUTION, NOT A VERDICT. The won rising
              // resolves against the freed town's OWN fundamentals. A town of suppressed
              // POTENTIAL — real artifice, an economic base, a reach the tolls and the
              // charter throttled — BOOMS when the manor burns: the capacity releases,
              // and people flock to the free town. A town PROPPED UP by the magnates'
              // capital and the garrison's order STARVES when both flee: the works go
              // dark, the skilled leave, and freedom is a hungry thing. World noise so
              // two towns of the same fundamentals can still fork (the §3.5 verdict).
              const potential = reg.A + 0.5 * reg.E + 0.4 * reg.centrality + (reg.refining > 0 ? 25 : 0) + (rV() * 2 - 1) * 30;
              const flourished = potential >= 66;
              if (flourished) {
                reg.A = Math.min(100, reg.A + 18);                          // the works run free
                reg.settlementPop = Math.round(reg.settlementPop * 1.15);   // people flock to the Free
                reg.wealth = clamp(reg.wealth + 12, 0, 100);
              } else {
                reg.A = Math.max(0, reg.A - 25);                            // capital flees; the works go dark
                reg.settlementPop = Math.max(20, Math.round(reg.settlementPop * 0.78)); // the skilled leave with it
                reg.wealth = clamp(reg.wealth - 8, 0, 100);
              }
              reg.population = Math.round(reg.settlementPop * (1 + reg.rural));
              reg.wonArc = flourished ? "flourished" : "starved";
              if (reg.wealth > reg.peakWealth) reg.peakWealth = reg.wealth;
              reg.injustice = Math.round(100 * (reg.blight / 100) * (1 - reg.wealth / 100));
              if (!granaryOn && rV() < 0.5) {
                // THE CONCESSION: the seat reads the fires on the horizon
                // and opens the granary before the next town rises
                granaryOn = true; granaryEpoch = e + 1;
                events.push({ epoch: e + 1, type: "reform", measure: "crown_granary", concession: true });
              }
            } else {
              reg.settlementPop = Math.max(20, Math.round(reg.settlementPop * 0.85));
              reg.population = Math.round(reg.settlementPop * (1 + reg.rural));
              reg.wealth = Math.round(reg.wealth * 0.85);
              { const _es0 = reg.eliteShare; reg.eliteShare = Math.min(92, reg.eliteShare + 10); reg.eliteCatDelta += reg.eliteShare - _es0; } // expropriation under the garrison (B5: catastrophe ledger — an UPWARD shock)
              reg.injustice = Math.round(100 * (reg.blight / 100) * (1 - reg.wealth / 100));
            }
            // consumers (5) and (6): a rising that never happened stamps no region
            // and files no revolt. The severity die is not drawn either — there is
            // no rising to rate — which is the same rule the rest of the takeovers
            // follow: a road not taken draws nothing.
            if (outcome !== "averted") {
              reg.eventType = "revolt"; reg.eventEpoch = e + 1;
              reg.eventSeverity = 70 + Math.round(rV() * 25);
              events.push({ epoch: e + 1, type: "revolt", region_id: reg.id, outcome: revoltWon ? "won" : "crushed",
                ...(revoltWon ? { arc: reg.wonArc } : {}) }); // B8 (#130): the won rising's arc — flourished or starved
            }
          }
        }
        // D6: the faith arrives where the suffering is — two epochs after the
        // run's first wound, the Temple consecrates the ground.
        if (!consecrated && firstWoundEpoch !== -1 && e + 1 >= firstWoundEpoch + 2) {
          consecrated = true;
          if (!sanctIdxs.includes(firstWoundIdx)) {
            const target = regions[firstWoundIdx];
            sanctIdxs.push(firstWoundIdx);
            sanctionedSites.push({ regionId: target.id, x: target.sitePt[0], y: target.sitePt[1] });
            target.eventType = "consecration"; target.eventEpoch = e + 1;
            target.eventSeverity = 60 + Math.round(rEv() * 20);
            events.push({ epoch: e + 1, type: "consecration", region_id: target.id });
            computeBlocs(); // temple reach surges at the new shrine
          }
        }
        snapNow();
      }

      // DEAD-ZONE CONSISTENCY: a war, plague, or revolt in the loop can strike
      // a cell that had already emptied and leave it a scrap of population.
      // Close the books: an unsettled cell holds no one and no tier, always.
      regions.forEach(reg => {
        if (!reg.settled) { reg.settlementPop = 0; reg.population = 0; reg.tier = "none"; }
      });

      // B5 (#127): per-region RANK CHURN — did WHO is rich change? Each settled
      // region's wealth rank at the founding vs the close (rank 0 = poorest). A
      // climb reads positive, a fall negative; the still world reads ~0. The realm-
      // scale Spearman is already in findings — this is the per-place lens on
      // ordinary mobility (rank churn without a collapse to cause it).
      {
        const live = regions.filter(r => r.settled);
        const n = live.length;
        const rankBy = (get) => {
          const idx = live.map((_, i) => i).sort((a, b) => get(live[a]) - get(live[b]) || live[a].id - live[b].id);
          const rk = []; idx.forEach((si, r) => { rk[si] = r; }); return rk;
        };
        const r0 = rankBy(r => r.wealthT0), rC = rankBy(r => r.wealth);
        regions.forEach(r => { r.rankChurn = 0; });
        if (n > 1) live.forEach((r, i) => { r.rankChurn = Math.round(100 * (rC[i] - r0[i]) / (n - 1)); });
      }

      // Final classification: trajectories recorded, tiers re-ranked by what
      // the settlements have BECOME (a hub can hollow to a holdfast).
      regions.forEach(reg => {
        reg.eliteShare = clamp(Math.round(reg.eliteShare), 8, 92); // the ledger closes in whole coins
        reg.endowment = reg.E; // exported endowment = what's left in the ground
        reg.oreDepleted = reg.E < 15 && reg.endowment0 >= 40;
        reg.boomBust = reg.settlementPop < 0.55 * reg.peakPop ? "collapse"
          : reg.settlementPop > 1.5 * reg.popT0 ? "boom"
          : reg.settlementPop < 0.8 * reg.popT0 ? "decline" : "stable";
      });

      // The wild layer's reach, read from the FINAL state (towers burn and
      // rise mid-run): euclidean over the exported (rounded) points, so
      // every downstream column that reads it stays exactly recomputable.
      regions.forEach(reg => {
        const P = [round2(reg.c[0]), round2(reg.c[1])];
        reg.ruinPerilNear = 0; reg.ruinYieldNear = 0; reg.towerNear = 0;
        geo.ruins.forEach(r => {
          const R = regions[r.regionIdx];
          if (Math.hypot(P[0] - round2(R.wildPt[0]), P[1] - round2(R.wildPt[1])) < WILD_R) {
            reg.ruinPerilNear = Math.max(reg.ruinPerilNear, r.peril);
            reg.ruinYieldNear = Math.max(reg.ruinYieldNear, r.yield);
          }
        });
        regions.forEach(T => {
          // a tower whose town is abandoned is pulled down with it (its POI is
          // dropped from the export too), so its shadow must not linger — gate
          // on T.settled to keep social_trust recomputable from the export.
          if (T.hasTower === 1 && T.settled && Math.hypot(P[0] - round2(T.towerPt[0]), P[1] - round2(T.towerPt[1])) < WILD_R) reg.towerNear = 1;
        });
      });
      if (params.ep > 0) {
        // re-rank only the SETTLED (the dead zones hold no tier); an abandoned
        // cell keeps tier "none" from the lifecycle above
        const others2 = regions.filter(reg => reg !== cap && reg.settled)
          .sort((a, b) => b.settlementPop - a.settlementPop || a.id - b.id);
        const nHub2 = Math.max(1, Math.round(others2.length * 0.2));
        const nOut2 = Math.max(1, Math.round(others2.length * 0.4));
        others2.forEach((reg, i) => {
          reg.tier = i < nHub2 ? "city" : (i < nHub2 + nOut2 ? "works-town" : "frontier-post");
        });
      }
      regions.forEach(reg => {
        reg.popDensity = Math.round((reg.population / (reg.area / 10000)) * 10) / 10;
      });

      // H1: the owners' headcount and the per-head gap — DERIVED columns,
      // exactly recomputable from the exported file alone: elite_pop_pct
      // from final tier + works + harbor + aerie (the court, the company
      // district, the quay masters, the lane's keepers); class_gap = the
      // owners' coin per owner over labor's coin per laborer.
      regions.forEach(reg => {
        reg.elitePopPct = ownerHeadPct(reg); // same formula, hoisted for #178; value unchanged
        reg.classGap = Math.round(
          ((reg.eliteShare / reg.elitePopPct) / ((100 - reg.eliteShare) / (100 - reg.elitePopPct))) * 10) / 10;
      });

      // Graded access (canister trade decays off the wire) + arcane services.
      // Services need the grid AND the wealth to pay the meter; need is NOT an
      // input. Computed from the FINAL state.
      const offCd = costDistances(regions, regions.map((_, i) => i).filter(i => onGrid[i])).dist;
      regions.forEach((reg, i) => {
        reg.onConduit = onGrid[i];
        reg.conduitAccess = onGrid[i] ? 100
          : Math.round(100 * Math.exp(-(isFinite(offCd[i]) ? offCd[i] : 1e9) / 334));
        reg.arcaneServices = clamp(Math.round(
          100 * Math.pow(reg.conduitAccess / 100, 1.2) * (0.35 + 0.65 * reg.wealth / 100)
        ), 0, 100);
      });

      // Facilities: the planner's rationing rule — prime always served; hubs
      // only when on-conduit (arcane facilities need lumen). Wardstations also
      // guard refinery regions: assets get protection whether people do or not.
      // L1: THE HIGH SANCTUARY — a refuge above the sanctioned faith, on
      // high remote ground the Temple never consecrated and the census
      // would rather not climb for. It heals without a charter, draws its
      // own pilgrims, and hides the people who come to it.
      let sanctuary = null;
      regions.forEach(reg => { reg.hasSanctuary = 0; });
      {
        const rhs = sx("sanctuary");
        const hsPool = regions.filter((r2, i2) => r2.elevation >= 58 && r2.centrality <= 45 && !sanctIdxs.includes(i2));
        if (hsPool.length && rhs() < 0.6) {
          const site = hsPool.map(r2 => ({ r2, s: 0.5 * r2.elevation + 0.5 * (100 - r2.centrality) + (rhs() - 0.5) * 10 }))
            .sort((a2, b2) => b2.s - a2.s || a2.r2.id - b2.r2.id)[0].r2;
          site.hasSanctuary = 1;
          sanctuary = { regionId: site.id, x: site.c[0], y: site.c[1] };
        }
      }

      const facilities = [];
      const servedIdxs = [], anyFacIdxs = [];
      regions.forEach((reg, i) => {
        const served = reg.tier === "metropolis" || (reg.tier === "city" && reg.onConduit);
        if (served) {
          facilities.push({ type: "healer", regionId: reg.id, x: reg.c[0], y: reg.c[1] });
          facilities.push({ type: "waterworks", regionId: reg.id, x: reg.c[0], y: reg.c[1] });
          servedIdxs.push(i);
        }
        if (served || reg.refining > 0)
          facilities.push({ type: "wardstation", regionId: reg.id, x: reg.c[0], y: reg.c[1] });
        if (served || reg.refining > 0) anyFacIdxs.push(i);
      });
      // L1: the sanctuary is a healer source the planner never rationed
      const healerIdxs = [...servedIdxs];
      regions.forEach((reg, i) => { if (reg.hasSanctuary === 1 && !healerIdxs.includes(i)) healerIdxs.push(i); });
      const healerCd = costDistances(regions, healerIdxs).dist;
      const anyFacCd = costDistances(regions, anyFacIdxs).dist;

      // Health: exposure, water, vulnerability -> EMERGENT burden, averted by
      // reach. Need is computed, never painted.
      const r1 = (v) => Math.round(v * 10) / 10;
      regions.forEach((reg, i) => {
        reg.healerDist = r1(isFinite(healerCd[i]) ? healerCd[i] : 9999);
        reg.facDist = r1(isFinite(anyFacCd[i]) ? anyFacCd[i] : 9999);
        reg.healingReach = Math.round(100 * Math.exp(-(isFinite(healerCd[i]) ? healerCd[i] : 1e9) / 334));
        if (!reg.settled) {
          // a dead zone has no people, so no health, water-safety, or service
          // burden: the human columns are zero, not a fit over an empty town.
          reg.safeWater = 0; reg.vulnerability = 0;
          reg.burdenEnv = 0; reg.burdenWater = 0; reg.burdenUnmet = 0; reg.burden = 0;
          reg.serviceGap = 0;
          return;
        }
        const wwHere = reg.tier === "metropolis" || (reg.tier === "city" && reg.onConduit);
        reg.safeWater = clamp(Math.round(
          (wwHere ? 85 : (reg.onConduit ? 45 : 15)) + 0.25 * reg.wealth - 0.146 * reg.blight // #192: 0.073 x2, the same factor as burdenEnv so the 3.6:1 split holds
          // G2: the river gives water — unless upstream already fouled it
          + (reg.onRiver ? Math.max(0, 12 - 0.104 * reg.downstreamBlight) : 0) // #192: 0.052 x2, same factor
        ), 0, 100);
        const tierF = { metropolis: 0, city: 30, "works-town": 60, "frontier-post": 85 }[reg.tier];
        reg.vulnerability = clamp(Math.round(
          0.5 * (100 - reg.wealth) + 0.3 * (100 - reg.centrality) + 0.2 * tierF
        ), 0, 100);
        const care = 1 - 0.55 * reg.healingReach / 100; // reach averts burden
        const jit = 0.94 + sx("health#" + reg.id)() * 0.12;
        // #192: DERIVED, not converted. This coefficient came out of a units change in
        // #180 (0.55 / 4.8), and #168 then showed the component explained essentially
        // nothing about who is sick once the retired siting exponent stopped coupling
        // contamination to poverty. A limb of the burden decomposition that moves the
        // outcome by nothing is decorative.
        //
        // It is now set against the quantity the epidemiology actually reports, the
        // ATTRIBUTABLE FRACTION: zero the contamination and ask what share of the
        // disease burden goes away. Landrigan et al. 2018 (the Lancet Commission on
        // Pollution and Health) put ~9 million premature deaths a year on pollution,
        // about 16% of deaths worldwide; Prüss-Ustün et al. 2016 (WHO) put ~23% of
        // deaths on modifiable environmental factors overall. tools/targets.mjs declared
        // the band [10%, 25%] on the 16% anchor BEFORE this line moved.
        //
        // Only the magnitude was free. Measured first, the model's own split between
        // direct exposure and contaminated water was **3.55 : 1** against Landrigan's
        // ~3.6 : 1, so the structure was already right and the ratio is preserved
        // untouched: both channels scale by the same factor 2, which lands the
        // attributable fraction at 16.0% against 8.8% before. Note what this does NOT
        // do — median burden moves 40 to 42. The realm does not get sicker; the
        // sickness gets attributed to what causes it.
        reg.burdenEnv = r1(0.23 * reg.blight * care * jit); // #192: 0.115 x2, derived above
        reg.burdenWater = r1(0.45 * (100 - reg.safeWater) * care * jit);
        reg.burdenUnmet = r1(0.35 * reg.vulnerability * care * jit);
        reg.burden = r1(reg.burdenEnv + reg.burdenWater + reg.burdenUnmet);
        reg.serviceGap = clamp(Math.round(
          0.45 * (100 - reg.healingReach) + 0.3 * Math.min(100, reg.facDist / 6) +
          0.25 * (reg.onConduit ? 0 : 100)
        ), 0, 100);
      });

      // Governance overlay: LIVE since D4. The blocs were computed at the
      // founding and re-contested inside the loop whenever the refinery set
      // changed; reg.bloc / templeReach / magnateReach already hold the final
      // political map, and reg.blocChanges counts each region's lived flips.

      // Traffic assignment: gravity flows between all pairs, routed along
      // least-cost road paths. Accumulated edge traffic IS flow betweenness —
      // the busy edges are the chokepoints someone can tax.
      const adjR = roadAdj();
      const sp = regions.map((_, i) => spFrom(adjR, i));
      const edgeTraffic = new Map();
      for (let i = 0; i < regions.length; i++) {
        for (let j = i + 1; j < regions.length; j++) {
          if (!isFinite(sp[i].dist[j])) continue;
          const flow = (regions[i].population * regions[j].population) / Math.pow(1 + sp[i].dist[j] / 100, 2) / 1e6;
          let cur = j;
          while (cur !== i && sp[i].par[cur] !== -1) {
            const p = sp[i].par[cur];
            const k = ekey(cur, p);
            edgeTraffic.set(k, (edgeTraffic.get(k) || 0) + flow);
            cur = p;
          }
        }
      }
      const maxTraffic = Math.max(...roadEdges.map(e => edgeTraffic.get(ekey(e.a, e.b)) || 0), 1e-9);
      roadEdges.forEach(e => { e.traffic = Math.round(100 * (edgeTraffic.get(ekey(e.a, e.b)) || 0) / maxTraffic * 10) / 10; });
      const byTraffic = [...roadEdges].sort((x, y) => y.traffic - x.traffic || x.a - y.a || x.b - y.b);
      const nHwy = Math.max(1, Math.ceil(roadEdges.length * 0.2));
      const nRoad = Math.ceil(roadEdges.length * 0.4);
      byTraffic.forEach((e, i) => { e.cls = i < nHwy ? "highway" : (i < nHwy + nRoad ? "road" : "track"); });

      // Market access: Hansen gravity over road-network costs (max = 100).
      // Normalize by the top SETTLED cell: a dead zone can have high raw
      // gravity (it sits near a city) but no market of its own, and its column
      // is zeroed later, so letting it define the max would leave no town at
      // 100. The best-served living town is the 100 the scale is built on.
      let maxMA = 0;
      const maRaw = regions.map((reg, i) => {
        let A = 0;
        regions.forEach((o, j) => {
          if (i !== j && isFinite(sp[i].dist[j])) A += o.population / Math.pow(1 + sp[i].dist[j] / 100, 2);
        });
        if (reg.settled && A > maxMA) maxMA = A;
        return A;
      });
      regions.forEach((reg, i) => { reg.marketAccess = maxMA > 0 ? Math.round(100 * maRaw[i] / maxMA) : 0; });

      // B6 (#128): stamp each region that HOSTS a crossing with its worst condition,
      // for the export column, the inspector card, and the atlas ink. crossFriction
      // (what a region PAYS to thread others' rotted spans) is already stamped by
      // computeCrossingFriction; this is what the region itself KEEPS in repair.
      regions.forEach(r => { r.crossingCondition = null; r.crossingType = null; r.crossingHeldBy = null; r.bridgeCond = null; r.passCond = null; });
      holdings.forEach(h => {
        const r = regions[h.regionIdx];
        if (r.crossingCondition === null || h.condition < r.crossingCondition) {
          r.crossingCondition = Math.round(h.condition * 100) / 100;
          r.crossingType = h.type;
          r.crossingHeldBy = h.heldBy;
        }
        // per-type worst condition, so a decayed BRIDGE only re-fords a river edge and
        // a decayed PASS only re-walls a ridge edge (the export matches wall to span)
        if (h.type === "bridge") r.bridgeCond = r.bridgeCond === null ? h.condition : Math.min(r.bridgeCond, h.condition);
        if (h.type === "pass") r.passCond = r.passCond === null ? h.condition : Math.min(r.passCond, h.condition);
      });

      // Pilgrim flux: every settlement's pilgrims travel the roads to the
      // NEAREST sanctioned site; through-traffic accumulates on every region
      // along the way (destination included, origin excluded). On-route
      // places harvest the pilgrim economy; bypassed places don't.
      const nodeFlux = new Array(regions.length).fill(0);
      // L1: the sanctuary draws pilgrims of its own, beside the sanctioned set
      const pilgrimSites = [...sanctIdxs];
      regions.forEach((reg, i) => { if (reg.hasSanctuary === 1 && !pilgrimSites.includes(i)) pilgrimSites.push(i); });
      regions.forEach((reg, i) => {
        let bestSite = -1, bestCost = Infinity;
        for (const s of pilgrimSites) {
          if (sp[s].dist[i] < bestCost) { bestCost = sp[s].dist[i]; bestSite = s; }
        }
        if (bestSite === -1 || !isFinite(bestCost)) return;
        let cur = i;
        while (cur !== bestSite && sp[bestSite].par[cur] !== -1) {
          const p = sp[bestSite].par[cur];
          nodeFlux[p] += reg.population;
          cur = p;
        }
      });
      const maxFlux = Math.max(...nodeFlux, 1e-9);
      regions.forEach((reg, i) => { reg.pilgrimFlux = Math.round(100 * nodeFlux[i] / maxFlux); });

      // P1 delver flux: the poor walk to the ruins — risk is a wage. Every
      // settlement's delvers route to the NEAREST ruin, poverty-weighted;
      // through-traffic accumulates like the pilgrims' (destination in,
      // origin out). The towns on the delvers' roads get the trade — and
      // the bodies.
      const ruinIdxs = geo.ruins.map(r => r.regionIdx);
      const delFlux = new Array(regions.length).fill(0);
      regions.forEach((reg, i) => {
        let best = -1, bc = Infinity;
        for (const rI of ruinIdxs) if (sp[rI].dist[i] < bc) { bc = sp[rI].dist[i]; best = rI; }
        if (best === -1 || !isFinite(bc)) return;
        const mass = reg.population * (1 - reg.wealth / 100); // poverty pushes
        let cur = i;
        while (cur !== best && sp[best].par[cur] !== -1) {
          const p = sp[best].par[cur];
          delFlux[p] += mass;
          cur = p;
        }
      });
      // normalize over SETTLED cells only: a dead zone's stretch of road carries
      // no town to tax the delvers, and its flux is zeroed in the export, so it
      // must not set the 100. Collapsed/ruinless worlds leave the column at 0.
      let maxDel = 1e-9;
      regions.forEach((reg, i) => { if (reg.settled && delFlux[i] > maxDel) maxDel = delFlux[i]; });
      regions.forEach((reg, i) => { reg.delverFlux = reg.settled ? Math.round(100 * delFlux[i] / maxDel) : 0; });

      // W2 security: garrisons guard the seat and the busiest corridors near
      // the core — protection follows the center's arteries, not the frontier.
      const thr = new Array(regions.length).fill(0);
      roadEdges.forEach(e => { thr[e.a] += e.traffic; thr[e.b] += e.traffic; });
      const maxThr = Math.max(...thr, 1e-9);
      const KG = Math.max(1, Math.round(regions.length / 12));
      // E1 (#142): an AVERTED rising leaves no crushed town to fortify (consumer 3)
      const crushedIdx = (revoltIdx >= 0 && !revoltWon && revoltAvertedIdx === -1) ? revoltIdx : -1;
      const garScored = regions.map((reg, i) => {
        const rj = sx("gar#" + reg.id);
        return { i, s: 0.6 * (100 * thr[i] / maxThr) + 0.4 * reg.centrality + (rj() - 0.5) * 8 };
      }).filter(o => o.i !== seatIdx && o.i !== warIdx && o.i !== crushedIdx).sort((a, b) => b.s - a.s || a.i - b.i);
      // the Crown fortifies the war region AFTER the blood — and the crushed
      // revolt after the hangings; security arrives late either way
      const garrisonIdxs = [seatIdx, ...(warIdx >= 0 ? [warIdx] : []), ...(crushedIdx >= 0 ? [crushedIdx] : []), ...garScored.slice(0, KG).map(o => o.i)];
      // a garrison holds a living town, not a dead zone: drop any that fell on
      // an abandoned cell (its force_projection was zeroed with its people)
      const garrisons = garrisonIdxs.filter(i => regions[i].settled).map(i => ({ regionId: regions[i].id, x: regions[i].c[0], y: regions[i].c[1] }));
      const garCd = costDistances(regions, garrisonIdxs).dist;
      regions.forEach((reg, i) => {
        // B9 (#131): ORDER projects force. A police state (order 100) stiffens the
        // constabulary's reach everywhere (+30), suppressing predation and the black
        // market; an open realm (order 0) thins it (−30). Neutral at 50 (the old world).
        reg.forceProjection = clamp(Math.round(100 * Math.exp(-(isFinite(garCd[i]) ? garCd[i] : 1e9) / 374) + (params.order - 50) * 0.6), 0, 100);
        reg.orderLevel = clamp(params.order + (reg.occupied ? 50 : 0), 0, 100); // B9 (#131): the realm's order + the local police state of occupation
        // wardlines need BOTH strategic priority and lumen: off-grid darkness
        // is near-defenseless no matter how exposed it is
        const priority = clamp(0.4 * reg.centrality + 0.4 * reg.forceProjection + 0.2 * reg.refining, 0, 100);
        reg.wardline = Math.round(Math.pow(reg.conduitAccess / 100, 1.5) * priority);
        // X1: occupied ground admits no domestic contest — the column
        // measures the REALM's writ, and the realm's writ ends at the
        // garrison line (reads the same bloc the export carries)
        reg.security = reg.forceProjection >= 65 ? "secured"
          : reg.forceProjection >= 35 ? "patrolled"
          : ((reg.occupied ? "dominion" : reg.bloc) === "contested" ? "contested" : "ungoverned");
      });

      // W2 shadow economy: the negative image of the state. Smugglers move
      // unretained ore value to the big markets along roads, but pay a premium
      // to cross patrolled ground — they route AROUND force projection.
      const smugAdj = regions.map(() => []);
      roadEdges.forEach(e => {
        const c = e.cost * (1 + 2 * ((regions[e.a].forceProjection + regions[e.b].forceProjection) / 200));
        smugAdj[e.a].push({ to: e.b, c });
        smugAdj[e.b].push({ to: e.a, c });
      });
      const sinkIdxs = regions.map((_, i) => i).filter(i => regions[i].tier === "metropolis" || regions[i].tier === "city");
      // L1: the freeport is the shadow's own gate — smugglers export through it
      regions.forEach((reg, i) => { if (reg.isFreeport === 1 && !sinkIdxs.includes(i)) sinkIdxs.push(i); });
      const smugFlux = new Array(regions.length).fill(0);
      regions.forEach((reg, i) => {
        if (reg.endowment < 30) return;
        const mass = reg.endowment * (100 - reg.retention) / 100; // what leaks is what wasn't retained
        const run = spFrom(smugAdj, i);
        let sink = -1, bc = Infinity;
        for (const s of sinkIdxs) if (s !== i && run.dist[s] < bc) { bc = run.dist[s]; sink = s; }
        if (sink === -1 || !isFinite(bc)) return;
        smugFlux[i] += mass;
        let cur = sink;
        while (cur !== i && run.par[cur] !== -1) { smugFlux[cur] += mass; cur = run.par[cur]; }
      });
      const maxSmug = Math.max(...smugFlux, 1e-9);
      regions.forEach((reg, i) => {
        reg.smuggling = clamp(Math.round(100 * smugFlux[i] / maxSmug * (1 - (params.order - 50) / 100 * 0.5)), 0, 100); // B9 (#131): order polices the shadow roads (neutral at 50)
        // banditry: where traffic, pilgrims, and delvers are worth robbing,
        // where the ruins breed peril, and nobody guards any of it
        const preyN = 0.55 * (thr[i] / maxThr) + 0.25 * reg.pilgrimFlux / 100 + 0.2 * reg.ruinPerilNear / 100;
        reg.predation = Math.round(100 * preyN * (1 - reg.forceProjection / 100));
      });
      // L1: HUNTER CAMPS — where the beasts are worth a bounty and the
      // garrisons never come, hunters pitch a stand: risk is a wage where
      // nothing else pays one. Effects are exactly recomputable from
      // has_camp: predation -18 on camp ground, -8 next door.
      const camps = [];
      regions.forEach(reg => { reg.hasCamp = 0; });
      {
        const KC = regions.length >= 32 ? 2 : 1;
        regions.map((reg, i) => ({ i, s: reg.predation - 0.4 * reg.forceProjection }))
          .filter(o => regions[o.i].predation >= 35 && regions[o.i].forceProjection < 40)
          .sort((a2, b2) => b2.s - a2.s || a2.i - b2.i)
          .slice(0, KC)
          .forEach(o => { regions[o.i].hasCamp = 1; camps.push({ regionId: regions[o.i].id, x: regions[o.i].c[0], y: regions[o.i].c[1] }); });
      }
      regions.forEach((reg, i) => {
        if (reg.hasCamp === 1) reg.predation = Math.max(0, reg.predation - 18);
        else if (reg.neighbors.some(nb => regions[nb].hasCamp === 1)) reg.predation = Math.max(0, reg.predation - 8);
        // the black market prices the underservice — and fences what the
        // delvers carry out, what the apostate sells off-grid, and what
        // the hunters bring down off the bounty ground
        reg.blackMarket = clamp(Math.round(0.55 * (100 - reg.arcaneServices) + 0.35 * (100 - reg.forceProjection) +
          (reg.towerNear === 1 ? 12 : 0) + 0.12 * reg.ruinYieldNear + (reg.hasCamp === 1 ? 6 : 0)), 0, 100);
        const pressure = 0.4 * reg.smuggling + 0.35 * reg.predation + 0.25 * reg.blackMarket;
        const capacity = 0.6 * reg.forceProjection + 0.4 * reg.wardline;
        reg.enforceGap = clamp(Math.round(pressure - capacity), 0, 100);
      });

      // W3 deep time: the past reconstructed from blind geology + the present
      // structures it would have produced. Exhausted lodes are real geology
      // (no income today), so abandonment is genuinely emergent.
      const trunkTouched = new Set();
      conduitEdges.forEach(e => { if (e.cls === "trunk") { trunkTouched.add(e.a); trunkTouched.add(e.b); } });
      // plagues scar the WORST-blighted few, not all contaminated land — a
      // shock is an event, not weather (cutoff recomputable from the export)
      const K_PLAGUE = Math.max(1, Math.round(regions.length / 12));
      const blightSorted = regions.map(r => r.blight).sort((a, b) => b - a);
      const plagueCutoff = Math.max(60, blightSorted[Math.min(K_PLAGUE - 1, blightSorted.length - 1)]);
      regions.forEach((reg, i) => {
        const rh = sx("hist#" + reg.id);
        reg.era = (reg.exhausted || reg.endowment0 >= 50) ? "relic_era"
          : reg.fertility >= 60 ? "first_settlement"
          : (trunkTouched.has(i) || reg.refining > 0) ? "conduit_boom"
          : "recent_frontier";
        const base = { relic_era: 88, first_settlement: 68, conduit_boom: 40, recent_frontier: 12 }[reg.era];
        reg.foundingAge = clamp(Math.round(base + (rh() - 0.5) * 20), 0, 100);
        let diffN = 0;
        reg.neighbors.forEach(nb => { if (regions[nb].bloc !== reg.bloc) diffN++; });
        const coin1 = rh(), coin2 = rh(), sevDraw = Math.round(40 + rh() * 50);
        reg.shock = reg.exhausted ? "refinery_collapse"
          : reg.blight >= plagueCutoff ? "blight_plague"
          : (sanctIdxs.includes(i) && coin1 >= 0.5) ? "relic_disaster"
          : (diffN >= 2 && coin2 >= 0.4) ? "war"
          : "none";
        reg.shockSeverity = reg.shock === "none" ? 0 : sevDraw;
        reg.legacy = Math.round(0.5 * reg.foundingAge + 0.3 * reg.conduitAccess + 0.2 * reg.centrality);
        // TRUE hysteresis now that time exists: the gap between what a place
        // was at its peak and what it is — plus the dead ore that explains it.
        reg.abandonment = clamp(Math.round(
          0.7 * (reg.peakWealth - reg.wealth) + ((reg.exhausted || reg.oreDepleted) ? 30 : 0)
        ), 0, 100);
        // churn = lived flips of ruler (D4) + frontier seam pressure + war memory
        reg.tenureChurn = clamp(Math.round(
          30 * Math.min(reg.blocChanges, 2) +
          40 * (reg.neighbors.length ? diffN / reg.neighbors.length : 0) +
          (reg.bloc === "contested" ? 20 : 0) + (reg.shock === "war" ? 10 : 0) + (rh() - 0.5) * 8
        ), 0, 100);
      });

      // W4 social texture: who the map serves, who routes around it, and who
      // it cannot even see.
      regions.forEach(reg => {
        const rs = sx("soc#" + reg.id);
        // enclave signature: wealth standing above its neighbors + company districts
        const nbrW = reg.neighbors.length
          ? reg.neighbors.reduce((s, nb) => s + regions[nb].wealth, 0) / reg.neighbors.length
          : reg.wealth;
        reg.segregation = clamp(Math.round(
          1.2 * Math.max(0, reg.wealth - nbrW) + (reg.refining > 0 ? 30 : 0) +
          (reg.tier === "metropolis" ? 15 : reg.tier === "city" ? 8 : 0)
        ), 0, 100);
        // in a refinery town you may rise; in an ore-only outpost you are born labor
        const chainVal = reg.refining > 0 ? 85 : reg.tier === "metropolis" ? 80 : reg.tier === "city" ? 55
          : (reg.endowment >= 50 ? 15 : 30);
        reg.mobility = clamp(Math.round(0.4 * chainVal + 0.35 * reg.arcaneServices + 0.25 * reg.marketAccess) +
          (reg.hasCamp === 1 ? 4 : 0) - Math.round((params.order - 50) * 0.3), 0, 100); // L1: the bounty is a rung; B9 (#131): a police state freezes the ladder (order stagnates mobility; neutral at 50)
        reg.culturalDistance = clamp(Math.round(
          0.55 * (100 - reg.centrality) + (reg.onConduit ? 0 : 20) + (rs() - 0.5) * 16
        ), 0, 100);
        // trust in institutions vs reliance on kin: designed mirrors
        // X1: reads the exported bloc (occupied = "dominion"): the Crown's
        // civic bonus does not survive the Crown's abdication
        const effBloc = reg.occupied ? "dominion" : reg.bloc;
        reg.socialTrust = clamp(Math.round(
          20 + 0.4 * reg.centrality + (reg.onConduit ? 12 : 0) - 0.042 * reg.blight + // #180: was 0.2, /4.8
          0.1 * reg.forceProjection + (effBloc === "crown" ? 8 : effBloc === "ungoverned" ? -8 : 0) -
          (reg.towerNear === 1 ? 12 : 0) // fear lives near the apostate's walls
        ), 0, 100);
        reg.kinship = clamp(Math.round(
          0.55 * (100 - reg.arcaneServices) + 0.25 * (100 - reg.forceProjection) + 0.2 * reg.culturalDistance
        ), 0, 100);
        // land the registry recognizes vs land the magnates read as empty title
        reg.tenure = (reg.centrality < 60 && (reg.endowment >= 50 || reg.exhausted)) ? "contested"
          : reg.centrality >= 60 ? "titled"
          : reg.centrality < 30 ? "customary" : "mixed";
        // the census undercounts exactly where need is greatest
        reg.legibility = clamp(Math.round(
          0.4 * reg.culturalDistance + 0.3 * (100 - reg.centrality) + (reg.onConduit ? 0 : 15) +
          ((reg.tenure === "customary" || reg.tenure === "contested") ? 15 : 0) +
          (reg.hasSanctuary === 1 ? 15 : 0) // L1: the refuge hides its people
        ), 0, 100);
        reg.uncounted = Math.round(reg.population * reg.legibility / 100 * 0.3);
      });

      // #91: THE STRUCTURE LAYER. A town is not a bag of loose flags — it is a
      // set of institutions, and its CHARACTER is which ones it holds. Each is
      // DERIVED from what the town already is (tier, wealth, reach, market,
      // force, mobility, service — all computed ABOVE this point), so the layer
      // recomputes from the exported columns. Placed here, after every input it
      // reads, so a stage-3 re-run reads current values, never a prior run's.
      // Descriptive for now (feeds no metric yet); the institutional channel into
      // the metrics is wired in a following step so the drift can be measured.
      // The counting-house wealth bar is RELATIVE — wealth is heavily bottom-
      // skewed (the inequality in the data), so finance concentrates at the top
      // of the realm's own distribution (85th percentile), not an absolute line.
      const settledW = regions.filter(r => r.settled).map(r => r.wealth).sort((a, b) => a - b);
      const richBar = settledW.length ? settledW[Math.floor(0.85 * settledW.length)] : 100;
      const structures = [];
      regions.forEach(reg => { reg.structures = []; reg.siteCharacter = reg.settled ? "outpost" : "none"; }); // clear first (purity)
      regions.forEach(reg => {
        if (!reg.settled) return;
        const has = [];
        if (reg.tier === "metropolis" || reg.tier === "city" || reg.marketAccess >= 55) has.push("market");                 // trade towns
        if (reg.wealth >= richBar && (reg.tier === "metropolis" || reg.tier === "city")) has.push("counting_house");         // finance concentrates
        if (reg.templeReach >= 55 || reg.hasSanctuary === 1) has.push("temple");                                       // holy ground
        if (reg.isCapital || reg.tier === "metropolis" || reg.forceProjection >= 60) has.push("keep");                      // a seat of force
        if (reg.refining > 0 || (reg.tier === "city" && reg.mobility >= 45)) has.push("guildhall");                     // a craft town
        if (reg.isCapital || reg.arcaneServices >= 55) has.push("library");                                            // knowledge/administration
        if (reg.settlementPop >= 120) has.push("tavern");                                                              // society gathers
        reg.structures = has;
        has.forEach(t => structures.push({ type: t, regionId: reg.id, x: reg.c[0], y: reg.c[1] }));
        reg.siteCharacter =
          has.includes("temple") && !has.includes("counting_house") ? "holy" :
          has.includes("counting_house") ? "market" :
          has.includes("keep") && has.includes("guildhall") ? "fortress-works" :
          has.includes("keep") ? "fortress" :
          has.includes("guildhall") ? "works" :
          has.includes("market") ? "market" :
          has.includes("tavern") ? "hamlet" : "outpost";
        // #91 step 2: the INSTITUTIONAL CHANNEL into the metrics. A counting
        // house concentrates ownership — finance banks the region's coin to the
        // owners' row, the sharpest structural driver of inequality. Bump
        // elite_share where one stands (bounded), then re-derive class_gap from
        // the new share so the exported ledger stays internally exact (the suite
        // recomputes class_gap from elite_share/elite_pop_pct, and can verify the
        // bump traces to the exported `structures` column: a counting_house town
        // carries +6 to its owners' row). Other structure->metric wirings follow.
        if (has.includes("counting_house")) {
          reg.eliteShare = clamp(Math.round(reg.eliteShare + 6), 8, 92);
          reg.classGap = Math.round(
            ((reg.eliteShare / reg.elitePopPct) / ((100 - reg.eliteShare) / (100 - reg.elitePopPct))) * 10) / 10;
        }
      });

      // E3/E6: names walked from the region's own substream, register AND
      // grammar from its geology — the whole toponymy is identical across
      // capital moves, weight changes, and epoch settings of the same
      // seed. One shared used-set keeps every name in the world unique.
      const usedNames = new Set();
      regions.forEach(reg => {
        reg.nameRegister = nameRegister(reg);
        // D8: REBORN AS SOMETHING ELSE. A cell that emptied and was resettled
        // (rebirths >= 1) does not come back as what it was — the ore town
        // reborn is not an ore town. Its new life takes a different register,
        // read from WHAT drew it back: a strong temple reach means the god
        // called the people home (liturgical); otherwise the land's character
        // simply turned over (frontier <-> lowland). Keyed on rebirths so it is
        // recomputable from the exported columns, and stable across re-runs.
        if (reg.rebirths >= 1) {
          reg.nameRegister = reg.templeReach >= 45 ? "temple"
            : reg.nameRegister === "frontier" ? "lowland" : "frontier";
        }
      });
      // rivers and ridges take their names FIRST now: the grammar can say
      // "{town}-on-{river}", and the mountain kinds read their height
      geo.ridges.forEach(R => {
        R.name = markovName("frontier", sx("ridge#" + R.id), usedNames);
        const span = Math.hypot(R.pts[0][0] - R.pts[R.pts.length - 1][0], R.pts[0][1] - R.pts[R.pts.length - 1][1]);
        R.kind = (R.maxElev >= 90) ? "Teeth" : (R.maxElev >= 80) ? "Crest" : (span >= 560) ? "Spine" : (R.maxElev >= 70) ? "Range" : (span >= 400) ? "Wall" : (R.maxElev >= 60) ? "Ridge" : "Hills";
      });
      geo.rivers.forEach(RV => {
        RV.name = markovName("lowland", sx("river#" + RV.id), usedNames);
        // kind by discharge (flow), so a trunk swollen by tributaries is a River
        // even if its own chain is short; recomputable from the exported flow.
        const fl = RV.flow || RV.chain.length;
        RV.kind = fl <= 2 ? "Rill" : fl <= 3 ? "Beck" : fl <= 5 ? "Brook" : fl <= 8 ? "River" : "Water";
      });
      const mouthSet = new Set(geo.rivers.map(RV => RV.chain[RV.chain.length - 1]));
      const capWord = (w) => w[0].toUpperCase() + w.slice(1);
      const placeName = (reg2, idx, r) => {
        const pools = [];
        if (mouthSet.has(idx)) pools.push(PLACE_PARTS.mouth);
        else if (reg2.onRiver === 1) pools.push(PLACE_PARTS.river);
        if (reg2.onCoast === 1) pools.push(PLACE_PARTS.coast);
        if (reg2.elevation >= 62) pools.push(PLACE_PARTS.high);
        if (reg2.biome === "marsh") pools.push(PLACE_PARTS.marsh);
        if (reg2.biome === "forest") pools.push(PLACE_PARTS.forest);
        if (reg2.endowment0 >= 50) pools.push(PLACE_PARTS.ore);
        if (reg2.ruggedness >= 60) pools.push(PLACE_PARTS.hold);
        pools.push(PLACE_PARTS.plain, PLACE_PARTS.plain); // the plain majority
        for (let t = 0; t < 24; t++) {
          const pool = pools[Math.floor(r() * pools.length)];
          const pat = pool[Math.floor(r() * pool.length)];
          const fused = !pat.includes(" ") && pat !== "{b}" && !pat.includes("-on-");
          const w = markovWord(reg2.nameRegister, r, fused ? 4 : 5, fused ? 7 : 12);
          if (!w) continue;
          if (fused && SUFFIXY.test(w)) continue; // no Astermereford
          let n = pat.replace("{b}", capWord(w));
          if (n.includes("{R}")) {
            if (reg2.riverId < 0) continue;
            n = n.replace("{R}", geo.rivers[reg2.riverId].name);
          }
          if (!usedNames.has(n)) { usedNames.add(n); return n; }
        }
        return markovName(reg2.nameRegister, r, usedNames); // exhaustion: the old way
      };
      // EVERY region gets a name, settled or not: a dead zone keeps the name
      // of what stood there (the ruins of X), and events on abandoned ground
      // still have a place to be named for. Names are assigned in id order so
      // they are stable regardless of which cells ended up settled.
      regions.forEach(reg => { reg.placeName = placeName(reg, regions.indexOf(reg), sx("name#" + reg.id)); });
      const settlements = regions.filter(reg => reg.settled).map(reg => ({
        name: reg.placeName,
        nameRegister: reg.nameRegister,
        tier: reg.tier, regionId: reg.id,
        x: reg.c[0], y: reg.c[1],
        population: reg.settlementPop,
        wealth: reg.wealth,
        onConduit: reg.onConduit,
        arcaneServices: reg.arcaneServices,
        nearestFacility: reg.facDist,
        nearestHealer: reg.healerDist,
        burden: reg.burden,
        serviceGap: reg.serviceGap
      }));

      // holy ground is dedicated in the Temple's own register (including any
      // site consecrated mid-run; its stream is keyed by region id, so the
      // dedication is stable however the site came to be)
      sanctionedSites.forEach(s => { s.name = markovName("temple", sx("shrine#" + s.regionId), usedNames); });
      // the old world's places keep the old registers (delves in the
      // miners' tongue, tombs and deadholds in the liturgy)
      geo.ruins.forEach(r => {
        r.name = markovName(r.type === "delve" ? "frontier" : "temple", sx("ruin#" + r.id + "#" + regions[r.regionIdx].id), usedNames);
      });
      if (geo.maelstrom) geo.maelstrom.name = markovName("temple", sx("maelstrom"), usedNames);

      // E6: the waters and the crossings take names of their own — the
      // sea by its size, the pass by its height
      const SEA_BIG = [w => `${w} Sea`, w => `${w} Reach`, w => `the ${w} Main`, w => `${w} Waters`, w => `${w} Expanse`];
      const SEA_SMALL = [w => `Gulf of ${w}`, w => `${w} Deep`, w => `${w} Sound`, w => `${w} Bight`, w => `Bay of ${w}`, w => `${w} Firth`];
      geo.seaShapes.forEach((S, i) => {
        const r2 = sx("seaname#" + i);
        let area = 0;
        for (let k = 0; k + 1 < S.outer.length; k++)
          area += S.outer[k][0] * S.outer[k + 1][1] - S.outer[k + 1][0] * S.outer[k][1];
        const big = Math.abs(area) / 2 > 120000;
        for (let t = 0; t < 24; t++) {
          const w = markovWord("lowland", r2, 4, 9);
          if (!w) continue;
          const forms = big ? SEA_BIG : SEA_SMALL;
          const n = forms[Math.floor(r2() * forms.length)](capWord(w));
          if (!usedNames.has(n)) { usedNames.add(n); S.name = n; break; }
        }
        if (!S.name) S.name = markovName("lowland", r2, usedNames) + " Sea";
      });
      geo.passes.forEach((p, i) => {
        const r2 = sx("passname#" + i);
        const kind = p.elev >= 92 ? "Stair" : p.elev >= 84 ? "Steps" : p.elev >= 75 ? "Pass" : p.elev >= 62 ? "Saddle" : "Gap"; // measured: pass elev med 90, q25 83
        for (let t = 0; t < 24; t++) {
          const w = markovWord("frontier", r2, 4, 8);
          if (!w) continue;
          const n = `${capWord(w)} ${kind}`;
          if (!usedNames.has(n)) { usedNames.add(n); p.name = n; break; }
        }
        if (!p.name) p.name = markovName("frontier", r2, usedNames) + " " + kind;
      });

      // L1: the places between take their names — the freeport in the
      // sailors' lowland tongue, the sanctuary in the liturgy, the camps
      // and the still in the frontier's
      if (freeport) {
        const rq = sx("freeportname");
        for (let t3 = 0; t3 < 24 && !freeport.name; t3++) {
          const w = markovWord("lowland", rq, 4, 8);
          if (!w) continue;
          const n2 = capWord(w) + " Quay";
          if (!usedNames.has(n2)) { usedNames.add(n2); freeport.name = n2; }
        }
        if (!freeport.name) freeport.name = markovName("lowland", rq, usedNames) + " Quay";
      }
      if (sanctuary) {
        const rq = sx("sanctuaryname");
        for (let t3 = 0; t3 < 24 && !sanctuary.name; t3++) {
          const w = markovWord("temple", rq, 4, 9);
          if (!w) continue;
          const n2 = capWord(w) + " Refuge";
          if (!usedNames.has(n2)) { usedNames.add(n2); sanctuary.name = n2; }
        }
        if (!sanctuary.name) sanctuary.name = markovName("temple", rq, usedNames) + " Refuge";
      }
      camps.forEach((cp, ci) => {
        const rq = sx("campname#" + cp.regionId);
        for (let t3 = 0; t3 < 24 && !cp.name; t3++) {
          const w = markovWord("frontier", rq, 4, 8);
          if (!w) continue;
          const n2 = capWord(w) + " Camp";
          if (!usedNames.has(n2)) { usedNames.add(n2); cp.name = n2; }
        }
        if (!cp.name) cp.name = markovName("frontier", rq, usedNames) + " Camp";
      });
      let stillName = null;
      if (regions.some(r2 => r2.stillair === 1)) {
        const rq = sx("stillname");
        for (let t3 = 0; t3 < 24 && !stillName; t3++) {
          const w = markovWord("frontier", rq, 4, 8);
          if (!w) continue;
          const n2 = "the " + capWord(w) + " Still";
          if (!usedNames.has(n2)) { usedNames.add(n2); stillName = n2; }
        }
        if (!stillName) stillName = "the " + markovName("frontier", rq, usedNames) + " Still";
      }

      // E5: the rulers take their names last — in each power's register
      const RULER_REG = { crown: "lowland", temple: "temple", magnate: "frontier" };
      for (const F of ["crown", "temple", "magnate"])
        dynasties[F].forEach((R, i) => { R.name = markovName(RULER_REG[F], sx("ruler#" + F + "#" + i), usedNames); });
      events.forEach(ev => { if (ev.type === "succession") ev.name = dynasties[ev.faction][ev.ruler].name; });

      // S1: the skyway is chartered in the court's own register — named
      // LAST, so every place keeps the name it already had
      const skywayName = markovName("lowland", sx("skyway"), usedNames);

      const capitalName = settlements.find(s => s.tier === "metropolis").name;

      // E6: the great roads take names from what they carry — the seat's
      // road, the ore road, the salt road — walking the traffic ranking
      {
        const byT = [...roadEdges].sort((a2, b2) => b2.traffic - a2.traffic || a2.a - b2.a || a2.b - b2.b);
        const givenRoad = new Set();
        let namedRoads = 0;
        for (const e of byT) {
          if (namedRoads >= 3) break;
          const touches = (pred) => pred(regions[e.a]) || pred(regions[e.b]);
          let n = null;
          if ((regions[e.a].isCapital || regions[e.b].isCapital) && !givenRoad.has("seat")) { n = `the ${capitalName} Road`; givenRoad.add("seat"); }
          else if (touches(r3 => r3.refining > 0) && !givenRoad.has("ore")) { n = "the Ore Road"; givenRoad.add("ore"); }
          else if (touches(r3 => r3.isPort === 1) && !givenRoad.has("salt")) { n = "the Salt Road"; givenRoad.add("salt"); }
          if (n) { e.name = n; namedRoads++; }
        }
      }

      // E6: HISTORY TAKES NAMES — matched to what actually happened: a war
      // that followed a strike is a Seam War; a plague in the fens is the
      // Fen-Ague; the treaty is copied fair as the Peace of its table
      events.forEach((ev, i) => {
        if (ev.region_id === undefined) return;
        const rn = sx("evname#" + i);
        // the region's own name, which survives abandonment (an event can land
        // on ground that is now a dead zone, e.g. the abandonment itself)
        const evReg = regions.find(rg => rg.id === ev.region_id);
        const tn = { name: (evReg && evReg.placeName) || "the frontier" };
        const y = 1000 + 25 * ev.epoch;
        if (ev.type === "war") {
          const chained = events.some(s2 => s2.type === "ore_strike" && ev.epoch > s2.epoch && ev.epoch <= s2.epoch + 2);
          ev.name = chained ? `the War of the ${tn.name} Seam`
            : rn() < 0.5 ? `the ${tn.name} War` : `the War of ${y}`;
        } else if (ev.type === "treaty") ev.name = `the Peace of ${tn.name}`;
        else if (ev.type === "annexation") ev.name = `the Landing at ${tn.name}`;
        else if (ev.type === "revolt") ev.name = `the ${tn.name} Rising`;
        else if (ev.type === "blight_plague") {
          const reg3 = regions.find(r3 => r3.id === ev.region_id);
          const pool = reg3.biome === "marsh" ? ["Fen-Ague", "Marsh Breath", "Reedwater Fever", "Bog-Rot", "Sedge Chills"]
            : reg3.downstreamBlight > 0 ? ["Water-Rot", "River Fever", "Downstream Flux", "Grey Water Fever", "Millrace Cough"]
            : ["Grey Breath", "Ash Fever", "Long Cough", "Dust Fever", "Wasting", "Blacklung"];
          ev.name = `the ${pool[Math.floor(rn() * pool.length)]} of ${y}`;
        }
        // D7: the years' shocks take names too — the land's toponym and the year
        else if (ev.type === "drought") ev.name = `the Drought of ${y}`;
        else if (ev.type === "flood") ev.name = `the ${tn.name} Flood`;
        else if (ev.type === "quake") ev.name = `the ${tn.name} Quake`;
        else if (ev.type === "storm") ev.name = `the Great Storm of ${y}`;
        else if (ev.type === "discovery") ev.name = `the ${tn.name} Find`;
        else if (ev.type === "ascendancy") ev.name = `the Rise of ${tn.name}`;
      });

      // E6: EPITHETS — social bynames, DERIVED (exactly recomputable from
      // the exported columns and timeline; first match wins, most never
      // earn one). The name is the land's; the byname is history's.
      regions.forEach(reg => {
        const won = events.some(ev => ev.type === "revolt" && ev.outcome === "won" && ev.region_id === reg.id);
        const plag = events.some(ev => ev.type === "blight_plague" && ev.region_id === reg.id);
        reg.epithet =
          (reg.occupiedEpoch !== -1 && !reg.occupied) ? "the Unyoked" :
          reg.occupied ? "the Yoked" :
          won ? (reg.wonArc === "starved" ? "the Famished" : "the Free") : // B8 (#130): the Free that starved wears its own byname

          reg.eliteShare >= 80 ? "the Gilded" :
          reg.blight >= 80 ? "the Ashen" :
          reg.boomBust === "collapse" ? "the Hollow" :
          plag ? "the Mourning" :
          (reg.boomBust === "boom" && reg.wealth >= 60) ? "the Rising" :
          reg.tollBurden >= 80 ? "the Tithed" :
          reg.refining >= 75 ? "the Kindled" :
          reg.abandonment >= 60 ? "the Waning" :
          reg.skyAdvantage >= 58 ? "the Lofted" :
          reg.blackMarket >= 62 ? "the Shadowed" :
          reg.marketAccess >= 80 ? "the Open" :
          reg.socialTrust >= 80 ? "the Steadfast" : null;
      });
      settlements.forEach(s2 => { s2.epithet = regions[s2.regionId].epithet; });
      // DEAD-ZONE ZEROING: an unsettled cell is land with no society, so every
      // HUMAN / ECONOMIC column reads a clean zero (there is no town to have a
      // wealth, a class split, a health burden, a market). The LAND columns
      // (livability, blight, fertility, water access, elevation, biome, and
      // the geographic flags) stay intact: the ground is still what it is.
      // One consolidated pass so the export is coherent no matter which post-
      // loop block computed a metric over an empty town.
      regions.forEach(reg => {
        if (reg.settled) return;
        for (const k of ["wealth", "eliteShare", "elitePopPct", "classGap", "segregation", "socialTrust",
          "kinship", "culturalDistance", "mobility", "legibility", "uncounted",
          "marketAccess", "arcaneServices", "safeWater", "vulnerability", "burden",
          "burdenEnv", "burdenWater", "burdenUnmet", "serviceGap", "predation", "tollBurden",
          "tenureChurn", "blocChanges", "smuggling", "blackMarket", "enforceGap", "forceProjection",
          "wardline", "pilgrimFlux", "delverFlux", "abandonment", "legacy"]) reg[k] = 0;
        // onConduit stays as the app set it: the conduit is force-wired stone
        // (like a bridge or a road), a PHYSICAL fact that outlasts the town, and
        // the grid is a connected network that fractures if a mid-trunk node is
        // pulled. The town simply draws no SERVICE from it (conduitAccess and
        // arcaneServices are zeroed above), so a dead node is grid-present but
        // service-dead — its edges and the seat-connectivity invariant hold.
        reg.tier = "none"; reg.tenure = "none"; reg.security = "none";
        reg.boomBust = "abandoned";
        // a dead zone runs no harbor, mans no tower, keeps no bridge, aerie,
        // freeport, or shrine: its infrastructure roles lapse with its people,
        // so every POI export loop (which filters on these flags) skips it.
        // Done in this post-loop pass, NOT mid-loop, so it cannot desync the
        // tower dynamics the epoch loop runs.
        reg.isPort = 0; reg.hasTower = 0; reg.hasBridge = 0; reg.isSkyport = 0;
        reg.isFreeport = 0; reg.hasSanctuary = 0;
        // injustice stays the presentation product of the raw fields, now that
        // wealth is zeroed: poisoned abandoned ground reads its blight as its
        // injustice (blight * (1 - 0)), and the export stays recomputable.
        reg.injustice = Math.round(100 * (reg.blight / 100) * (1 - reg.wealth / 100));
      });
      // a bridge on an abandoned river town is gone with it (no one keeps the
      // span); keep only bridges whose host cell is still settled
      const liveBridges = geo.bridges.filter(b => regions[b.regionIdx] && regions[b.regionIdx].settled);
      return { decisions: reign.log, dominionRepelled, seed: String(params.seed), regions, settlements, facilities, structures, sanctionedSites, garrisons, conduitEdges, roadEdges, epochSnaps, events, capital: cap, capPoint, capitalName, windDeg: geo.windDeg, ridges: geo.ridges, passes: geo.passes, rivers: geo.rivers, seaSides: geo.seaSides, bridges: liveBridges, ruins: geo.ruins, maelstrom: geo.maelstrom, holdings, treasuries, tensions, dynasties, seaShapes: geo.seaShapes, lakeShapes: geo.lakeShapes, seaLevel: geo.seaLevel, contours: geo.contours, contoursFine: geo.contoursFine, hachures: geo.hachures, peaks: geo.peaks, skywayName, freeport, sanctuary, camps, stillName,
        dominion: dominionAt !== -1 ? { arrived: dominionAt, foothold: footholdIdx } : null,
        // B11 (#133): the off-map powers — the Metropole that courts this realm
        // (concessions/attention) and the Rival it is courted against (rivalry/
        // embargo). Named for the gazette and the chronicle; no reach machinery
        // of the Rival's own — it exists in the regime chain and the diplomacy.
        metropole: metropoleName, rival: rivalName,
        world: worldSeries,
        // B4 (#126): the final disposal doctrine (after any mid-run reform override)
        // and the fixed sacrifice zone concentrate dumps on (region id, or null).
        disposalDoctrine: disposalOverride || (params.db < 34 ? "disperse" : params.db < 67 ? "concentrate" : "treat"),
        sacrificeZoneId: sacrificeZone >= 0 ? regions[sacrificeZone].id : null,
        // B7 (#129): the reforms' long edges, measurable in provenance
        reformEdges: {
          charter_debt: Math.round(charterDebt),          // principal still outstanding at close
          debt_service: Math.round(debtServicePaid),       // total coin the seat paid to service it
          granary_dependency: granaryDependency,           // habit bred by a granary running through peace
          granary_drain: granaryDrain,                     // epochs of fiscal drain with no famine to justify it
          capital_flight: capitalFlight,                   // elite capital frightened off by the retention floor
          impositions: impositions                         // measures the creditors DEMANDED (structural adjustment)
        } };
    }

    // ---- Export: one valid GeoJSON FeatureCollection (the bridge) -----------
    function toGeoJSON(model, params) {
      const features = [];
      model.regions.forEach(reg => {
        features.push({
          type: "Feature",
          properties: {
            kind: "region",
            region_id: reg.id,
            wealth: reg.wealth,
            is_capital_region: reg.isCapital ? 1 : 0,
            population: reg.population,
            pop_density: reg.popDensity,
            emigrants_total: reg.emigrantsTotal || 0,        // B3 (#125): souls gone off-map to the metropole
            remittance_income: reg.remittanceTotal || 0,     // B3: coin the diaspora sent home (decoupled from local production)
            aetherstone_endowment: reg.endowment,
            artifice_index: reg.A,
            artifice_index_t0: reg.A0,     // B2 (#124): the works as founded — so "the counting house built here" (A rose) is recomputable from the file
            terrain_ruggedness: reg.ruggedness,
            fertility: reg.fertility,
            water_access: reg.waterAccess,
            water_access_effective: (reg.effWaterAccess !== undefined ? reg.effWaterAccess : reg.waterAccess),
            water_denial: reg.waterDenial || 0,
            aquifer: reg.aquifer || 0,
            centrality_to_capital: reg.centrality,
            aetherworks_capacity: reg.refining,
            value_retention: reg.retention,
            on_grid: reg.onConduit ? 1 : 0,
            grid_access: reg.conduitAccess,
            arcane_service_index: reg.arcaneServices,
            elevation: reg.elevation,
            blight_load: reg.blight,
            injustice_idx: reg.injustice,
            livability: (reg.livability !== undefined ? reg.livability : 0),
            is_settled: reg.settled ? 1 : 0,
            settled_epoch: (reg.settledEpoch !== undefined ? reg.settledEpoch : 0),
            abandoned_epoch: (reg.abandonedEpoch !== undefined ? reg.abandonedEpoch : -1),
            rebirths: reg.rebirths || 0,
            // the region's own toponym survives abandonment (a settled cell's
            // settlement carries the same string). Exported per-region so event
            // names on now-dead ground ("the <place> Rising") still recompute.
            place_name: reg.placeName,
            healing_reach: reg.healingReach,
            safe_water: reg.safeWater,
            vulnerability_idx: reg.vulnerability,
            burden_env_per_1k: reg.burdenEnv,
            burden_water_per_1k: reg.burdenWater,
            burden_unmet_per_1k: reg.burdenUnmet,
            disease_burden_per_1k: reg.burden,
            service_gap_idx: reg.serviceGap,
            temple_reach: reg.templeReach,
            magnate_reach: reg.magnateReach,
            crown_reach: (reg.crownReach !== undefined ? reg.crownReach : reg.centrality), // #93: the seat's pull incl. the Crown's fortune; bloc argmax uses this, not raw centrality
            dominant_bloc: reg.occupied ? "dominion" : reg.bloc,
            site_character: reg.siteCharacter || (reg.settled ? "outpost" : "none"), // #91: what kind of place its institutions make it
            structures: (reg.structures || []).join(" "),                            // #91: the institutions it holds (space-joined; a deadhold has none)
            market_access: reg.marketAccess,
            pilgrim_flux: reg.pilgrimFlux,
            force_projection: reg.forceProjection,
            order_level: reg.orderLevel,   // B9 (#131): the region's order (realm order + occupation's local police state)

            constabulary_strength: reg.wardline,
            security_status: reg.security,
            smuggling_intensity: reg.smuggling,
            predation_risk: reg.predation,
            black_market_index: reg.blackMarket,
            enforcement_gap: reg.enforceGap,
            exhausted_lode: reg.exhausted ? 1 : 0,
            founding_era: reg.era,
            founding_age: reg.foundingAge,
            legacy_advantage: reg.legacy,
            shock_legacy: reg.shock,
            shock_severity: reg.shockSeverity,
            abandonment_index: reg.abandonment,
            tenure_churn: reg.tenureChurn,
            segregation_index: reg.segregation,
            mobility_ceiling: reg.mobility,
            social_trust: reg.socialTrust,
            kinship_reliance: reg.kinship,
            cultural_distance: reg.culturalDistance,
            tenure_regime: reg.tenure,
            legibility_gap: reg.legibility,
            uncounted_population: reg.uncounted,
            endowment_t0: reg.endowment0,
            wealth_t0: reg.wealthT0,
            population_t0: Math.round(reg.popT0 * (1 + reg.rural)),
            peak_wealth: reg.peakWealth,
            ore_depleted: reg.oreDepleted ? 1 : 0,
            boom_bust: reg.boomBust,
            event_type: reg.eventType,
            event_epoch: reg.eventEpoch,
            event_severity: reg.eventSeverity,
            won_arc: reg.wonArc || null,   // B8 (#130): a freed town's arc — "flourished" | "starved" | null

            bloc_changes: reg.blocChanges,
            range_shadow: reg.rangeShadow,
            is_pass: reg.isPass,
            on_river: reg.onRiver,
            river_id: reg.riverId,
            river_pos: reg.riverPos,
            river_flux: reg.riverFlux,
            river_navigable: reg.riverNavigable,
            downstream_blight: reg.downstreamBlight,
            on_coast: reg.onCoast,
            is_port: reg.isPort,
            sea_access: reg.seaAccess,
            temperature: reg.temperature,
            rainfall: reg.rainfall,
            biome: reg.biome,
            biome_habitability: reg.biomeHabitability,
            biome_move_cost: reg.biomeMoveCost,
            delver_flux: reg.delverFlux,
            has_tower: reg.hasTower,
            has_bridge: reg.hasBridge,
            tariff_burden: reg.tollBurden,
            crossing_friction: reg.crossFriction || 0,          // B6 (#128): trade cost the region pays for decayed spans on its road to market
            crossing_condition: reg.crossingCondition,          // the condition of a crossing this region HOSTS (null if none): 1 sound → 0 rotted
            crossing_type: reg.crossingType,                    // "bridge" | "pass" | "port" | null
            elite_share: reg.eliteShare,
            elite_delta: reg.eliteShare - reg.eliteShareT0, // B5 (#127): the owners' row since the founding (can now fall in ordinary times)
            elite_ordinary_delta: (reg.eliteShare - reg.eliteShareT0) - (reg.eliteCatDelta || 0), // B5 (#127): the row's move with the catastrophe shocks (revolt/collapse/plague) charged OUT — pure ordinary erosion/churn
            rank_churn: reg.rankChurn || 0,                 // B5 (#127): wealth-rank change founding→close (climbed +, fell −)
            elite_pop_pct: reg.elitePopPct,
            class_gap: reg.classGap,
            is_skyport: reg.isSkyport,
            anchor_x: round2(reg.c[0]),  // v37: the anchor range_shadow (and
            anchor_y: round2(reg.c[1]),  // every seat-distance) is measured from
            is_freeport: reg.isFreeport,
            stillair: reg.stillair,
            has_sanctuary: reg.hasSanctuary,
            has_camp: reg.hasCamp,
            capital_cost_ground: reg.seatCostGround,
            capital_cost_sky: reg.seatCostSky,
            sky_advantage: reg.skyAdvantage,
            occupied: reg.occupied ? 1 : 0,
            occupied_epoch: reg.occupiedEpoch,
            tribute_burden: model.dominion ? (reg.occupied ? 3 : (reg.bloc === "crown" ? 1 : 2)) : 0,
            concession: reg.concession ? 1 : 0,          // B11 (#133): foreign capital owns the works here
            concession_epoch: reg.concessionEpoch,
            foreign_claim: reg.foreignClaim || 0,        // share of the ore-yield repatriated off-map
            concession_ended: reg.concessionEnded ? 1 : 0,   // B11 (#133): the concession was wound up (ore/attention gone) — NOT the depopulation abandoned_epoch above
            concession_ended_epoch: (reg.concessionEndEpoch !== undefined ? reg.concessionEndEpoch : -1)
          },
          geometry: { type: "Polygon", coordinates: [reg.ring.map(p => [round2(p[0]), round2(p[1])])] }
        });
      });
      model.conduitEdges.forEach(e => {
        const A = model.regions[e.a], B = model.regions[e.b];
        features.push({
          type: "Feature",
          properties: { kind: "grid", edge_class: e.cls, from_region: A.id, to_region: B.id },
          geometry: { type: "LineString", coordinates: [
            [round2(A.c[0]), round2(A.c[1])], [round2(B.c[0]), round2(B.c[1])]
          ] }
        });
      });
      model.roadEdges.forEach(e => {
        const A = model.regions[e.a], B = model.regions[e.b];
        features.push({
          type: "Feature",
          properties: { kind: "road", road_class: e.cls, road_name: e.name || null, traffic: e.traffic, from_region: A.id, to_region: B.id },
          geometry: { type: "LineString", coordinates: [
            [round2(A.c[0]), round2(A.c[1])], [round2(B.c[0]), round2(B.c[1])]
          ] }
        });
      });
      // #55: the routable graph itself — one line per adjacency edge the
      // cost engine actually walks (roads are a subset; centrality, tolls
      // and market access all run on THIS graph). cost is the engine's own
      // edgeCost; exactly one wall flag names which crossing rule applied.
      {
        const gate = new Map(); // region idx -> first gate holder (bridge/pass/port order)
        model.holdings.forEach(h => {
          if (h.heldBy !== "none" && !gate.has(h.regionIdx)) gate.set(h.regionIdx, h.heldBy);
        });
        model.regions.forEach((A, i) => {
          [...A.neighbors].sort((x, y) => x - y).forEach(j => {
            if (j <= i) return;
            const B = model.regions[j];
            const ax = round2(A.c[0]), ay = round2(A.c[1]);
            const bx = round2(B.c[0]), by = round2(B.c[1]);
            const base = round2(Math.hypot(ax - bx, ay - by));
            let cost = round2(edgeCost(A, B));
            const wall = A.ridgeMult ? (A.ridgeMult.get(B.id) || 1) : 1;
            // B6 (#128): a DECAYED span lets the wall it was built to spare creep back
            // into this edge's cost — a rotted bridge re-fords its river (0.6 → 2.2), a
            // rotted pass re-walls its ridge (1.4 → 4.5). Sound at the founding, so this
            // is a no-op there; only the wall's OWN kind of span can spare/lose it.
            let condition = 1, is_decayed = 0;
            if (wall === RIVER_EDGE) {
              const bc = Math.min(A.bridgeCond === null || A.bridgeCond === undefined ? 1 : A.bridgeCond,
                                  B.bridgeCond === null || B.bridgeCond === undefined ? 1 : B.bridgeCond);
              if (bc < 1) { cost = round2(cost * lerp(RIVER_EDGE, FORD_MULT, 1 - bc) / RIVER_EDGE); condition = round2(bc); is_decayed = 1; }
            } else if (wall === PASS_MULT) {
              const pc = Math.min(A.passCond === null || A.passCond === undefined ? 1 : A.passCond,
                                  B.passCond === null || B.passCond === undefined ? 1 : B.passCond);
              if (pc < 1) { cost = round2(cost * lerp(PASS_MULT, RIDGE_WALL, 1 - pc) / PASS_MULT); condition = round2(pc); is_decayed = 1; }
            }
            features.push({
              type: "Feature",
              properties: {
                kind: "edge", from_region: A.id, to_region: B.id,
                base_len: base, cost: cost,
                friction_mult: base > 0 ? round2(cost / base) : 1,
                is_ridge_crossing: wall === RIDGE_WALL ? 1 : 0,
                is_pass: wall === PASS_MULT ? 1 : 0,
                is_river: wall === RIVER_EDGE ? 1 : 0,
                is_ford: wall === FORD_MULT ? 1 : 0,
                condition: condition,        // B6: the spanning crossing's health (1 sound → 0 rotted); 1 where no span applies
                is_decayed: is_decayed,      // B6: this edge's spared wall is creeping back
                held_by: gate.get(i) || gate.get(j) || "none"
              },
              geometry: { type: "LineString", coordinates: [[ax, ay], [bx, by]] }
            });
          });
        });
      }
      model.facilities.forEach(f => {
        features.push({
          type: "Feature",
          properties: { kind: "facility", facility_type: f.type, region_id: f.regionId },
          geometry: { type: "Point", coordinates: [round2(f.x), round2(f.y)] }
        });
      });
      // #91: the structure layer — each institution a town holds, as its own point
      model.structures.forEach(s => {
        features.push({
          type: "Feature",
          properties: { kind: "structure", structure_type: s.type, region_id: s.regionId },
          geometry: { type: "Point", coordinates: [round2(s.x), round2(s.y)] }
        });
      });
      model.sanctionedSites.forEach(s => {
        features.push({
          type: "Feature",
          properties: { kind: "sanctioned_site", region_id: s.regionId, site_name: s.name },
          geometry: { type: "Point", coordinates: [round2(s.x), round2(s.y)] }
        });
      });
      model.ridges.forEach(R => {
        features.push({
          type: "Feature",
          properties: { kind: "ridge", ridge_id: R.id, ridge_name: R.name, ridge_kind: R.kind, max_elev: R.maxElev, is_spur: R.isSpur ? 1 : 0 },
          geometry: { type: "LineString", coordinates: R.pts }
        });
      });
      model.passes.forEach(p => {
        const t = model.settlements.find(s => s.regionId === model.regions[p.regionIdx].id);
        features.push({
          type: "Feature",
          properties: { kind: "pass", ridge_id: p.ridgeId, region_id: model.regions[p.regionIdx].id, pass_name: p.name, pass_elev: p.elev, held_by: p.heldBy },
          geometry: { type: "Point", coordinates: [p.x, p.y] }
        });
      });
      model.rivers.forEach(RV => {
        features.push({
          type: "Feature",
          // v39: the geometry is the traced bed; chain_regions carries the
          // downstream order that river_kind and the columns recompute from
          properties: { kind: "river", river_id: RV.id, river_name: RV.name, river_kind: RV.kind,
            chain_regions: RV.chain.map(ri => model.regions[ri].id),
            // v40: tributaries record the trunk they join and their accumulated flow
            confluence_into: (RV.confluenceInto !== undefined && RV.confluenceInto >= 0) ? RV.confluenceInto : null,
            flow: RV.flow || RV.chain.length },
          geometry: { type: "LineString", coordinates: RV.trace }
        });
      });
      const SEA_LINES = { west: [[0, 0], [0, 1000]], east: [[1600, 0], [1600, 1000]], south: [[0, 0], [1600, 0]], north: [[0, 1000], [1600, 1000]] };
      model.seaSides.forEach(side => {
        features.push({
          type: "Feature",
          properties: { kind: "coast", side },
          geometry: { type: "LineString", coordinates: SEA_LINES[side] }
        });
      });
      model.seaShapes.forEach((S, i) => {
        features.push({
          type: "Feature",
          properties: { kind: "sea", sea_id: i, sea_name: S.name || null, sea_level: model.seaLevel, islands: S.holes.length },
          geometry: { type: "Polygon", coordinates: [S.outer, ...S.holes] }
        });
      });
      // v40: inland lakes (interior basins the sea flood never reached)
      (model.lakeShapes || []).forEach((S, i) => {
        features.push({
          type: "Feature",
          properties: { kind: "lake", lake_id: i, islands: S.holes.length },
          geometry: { type: "Polygon", coordinates: [S.outer, ...S.holes] }
        });
      });
      model.contours.forEach(cl => {
        features.push({
          type: "Feature",
          properties: { kind: "contour", level: cl.level },
          geometry: { type: "MultiLineString", coordinates: cl.segs }
        });
      });
      model.regions.filter(r => r.isPort === 1).forEach(reg => {
        const t = model.settlements.find(s => s.regionId === reg.id);
        features.push({
          type: "Feature",
          properties: { kind: "port", region_id: reg.id, port_name: harborName((t && t.name) || reg.placeName || "the quay"), held_by: reg.heldBy },
          geometry: { type: "Point", coordinates: [round2(reg.shorePt[0]), round2(reg.shorePt[1])] }
        });
      });
      // L1: the places between
      if (model.freeport) {
        const reg = model.regions.find(r => r.id === model.freeport.regionId);
        features.push({
          type: "Feature",
          properties: { kind: "freeport", region_id: reg.id, freeport_name: model.freeport.name, writ: "none" },
          geometry: { type: "Point", coordinates: [round2((reg.shorePt || reg.c)[0]), round2((reg.shorePt || reg.c)[1])] }
        });
      }
      if (model.sanctuary) {
        features.push({
          type: "Feature",
          properties: { kind: "sanctuary", region_id: model.sanctuary.regionId, sanctuary_name: model.sanctuary.name },
          geometry: { type: "Point", coordinates: [round2(model.sanctuary.x), round2(model.sanctuary.y)] }
        });
      }
      model.camps.forEach(cp => {
        features.push({
          type: "Feature",
          properties: { kind: "camp", region_id: cp.regionId, camp_name: cp.name },
          geometry: { type: "Point", coordinates: [round2(cp.x), round2(cp.y)] }
        });
      });
      { // S1: the skyway — aeries, and a lane between every pair of them
        const sp = model.regions.filter(r => r.isSkyport === 1);
        sp.forEach(reg => {
          const t = model.settlements.find(s => s.regionId === reg.id);
          features.push({
            type: "Feature",
            properties: { kind: "skyport", region_id: reg.id, skyport_name: ((t && t.name) || reg.placeName || "the aerie") + " Aerie" },
            geometry: { type: "Point", coordinates: [round2(reg.c[0]), round2(reg.c[1])] }
          });
        });
        for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) {
          const A = sp[i], B = sp[j];
          features.push({
            type: "Feature",
            properties: { kind: "skylane", skyway_name: model.skywayName, from_region: A.id, to_region: B.id,
              fly_cost: Math.round((FLY_BOARD + FLY_COST * Math.hypot(round2(A.c[0]) - round2(B.c[0]), round2(A.c[1]) - round2(B.c[1]))) * 10) / 10 },
            geometry: { type: "LineString", coordinates: [[round2(A.c[0]), round2(A.c[1])], [round2(B.c[0]), round2(B.c[1])]] }
          });
        }
      }
      model.ruins.forEach(r => {
        const reg = model.regions[r.regionIdx];
        features.push({
          type: "Feature",
          properties: { kind: "ruin", ruin_type: r.type, region_id: reg.id, peril: r.peril, yield: r.yield, ruin_name: r.name },
          geometry: { type: "Point", coordinates: [round2(reg.wildPt[0]), round2(reg.wildPt[1])] }
        });
      });
      model.bridges.forEach(b => {
        const t = model.settlements.find(s => s.regionId === model.regions[b.regionIdx].id);
        features.push({
          type: "Feature",
          properties: { kind: "bridge", river_id: b.riverId, region_id: model.regions[b.regionIdx].id, bridge_name: ((t && t.name) || model.regions[b.regionIdx].placeName || "the crossing") + " Bridge", held_by: b.heldBy },
          geometry: { type: "Point", coordinates: [b.x, b.y] }
        });
      });
      model.regions.filter(r => r.hasTower === 1).forEach(reg => {
        const t = model.settlements.find(s => s.regionId === reg.id);
        features.push({
          type: "Feature",
          properties: { kind: "tower", region_id: reg.id, tower_name: ((t && t.name) || reg.placeName || "the watch") + " Tower" },
          geometry: { type: "Point", coordinates: [round2(reg.towerPt[0]), round2(reg.towerPt[1])] }
        });
      });
      // D8: DEADHOLDS. A cell that once held a town and now holds none leaves a
      // ruin at its anchor — the deadhold, named for what it was, dated to the
      // year it emptied. Emitted only for cells abandoned AND not resettled
      // (is_settled 0, abandoned_epoch >= 0), so a reborn cell has none. The
      // land keeps the name even when the people are gone.
      model.regions.filter(r => !r.settled && r.abandonedEpoch >= 0).forEach(reg => {
        features.push({
          type: "Feature",
          properties: { kind: "deadhold", region_id: reg.id, deadhold_name: "the ruins of " + (reg.placeName || "a forgotten hold"), fell_epoch: reg.abandonedEpoch },
          geometry: { type: "Point", coordinates: [round2(reg.c[0]), round2(reg.c[1])] }
        });
      });
      if (model.maelstrom) {
        features.push({
          type: "Feature",
          properties: { kind: "maelstrom", side: model.maelstrom.side, maelstrom_name: model.maelstrom.name },
          geometry: { type: "Point", coordinates: [model.maelstrom.x, model.maelstrom.y] }
        });
      }
      model.garrisons.forEach(g => {
        features.push({
          type: "Feature",
          properties: { kind: "constabulary", region_id: g.regionId },
          geometry: { type: "Point", coordinates: [round2(g.x), round2(g.y)] }
        });
      });
      model.settlements.forEach(s => {
        features.push({
          type: "Feature",
          properties: {
            kind: "settlement",
            name: s.name,
            name_register: s.nameRegister,
            epithet: s.epithet || null,
            tier: s.tier,
            region_id: s.regionId,
            population: s.population,
            wealth: s.wealth,
            on_grid: s.onConduit ? 1 : 0,
            arcane_service_index: s.arcaneServices,
            nearest_facility_distance: s.nearestFacility,
            nearest_healer_dist: s.nearestHealer,
            disease_burden_per_1k: s.burden,
            service_gap_idx: s.serviceGap
          },
          geometry: { type: "Point", coordinates: [round2(s.x), round2(s.y)] }
        });
      });
      return {
        type: "FeatureCollection",
        name: "hinterland",
        hinterland: {
          schema_version: SCHEMA_VERSION,
          world: model.world,
          seed: String(params.seed), ...(params.fate ? { fate: String(params.fate) } : {}), ...(params.ch ? { ch: String(params.ch) } : {}), regions: params.regions, relax: params.relax,
          bias: params.bias,
          weights: { extraction: params.we, refining: params.wf, trade: params.wt, gradient: params.wg },
          grid_threshold: params.gt,
          dump_bias: params.db,
          disposal_doctrine: model.disposalDoctrine,
          sacrifice_zone: model.sacrificeZoneId,
          reform_edges: model.reformEdges,
          responsiveness: params.iq,
          order: params.order,
          openness: params.openness,
          harbors_closed: params.hb === 0,
          epochs: params.ep,
          events: model.events,
          wind_deg: model.windDeg,
          sea_sides: model.seaSides,
          sea_level: model.seaLevel,
          treasuries: { crown: Math.round(model.treasuries.crown), temple: Math.round(model.treasuries.temple), magnate: Math.round(model.treasuries.magnate) },
          rulers: { crown: model.dynasties.crown.map(r => ({ name: r.name, from_epoch: r.from, contested: r.contested })),
                    temple: model.dynasties.temple.map(r => ({ name: r.name, from_epoch: r.from, contested: r.contested })),
                    magnate: model.dynasties.magnate.map(r => ({ name: r.name, from_epoch: r.from, contested: r.contested })) },
          skyway: { name: model.skywayName, ports: model.regions.filter(r => r.isSkyport === 1).map(r => r.id) },
          dominion: model.dominion ? { arrived_epoch: model.dominion.arrived, foothold: model.regions[model.dominion.foothold].id, occupied_n: model.regions.filter(r => r.occupied).length } : null,
          // B11 (#133): the off-map powers — the Metropole that courts by reach, the Rival it is courted against
          powers: { metropole: model.metropole, rival: model.rival, concessions: model.regions.filter(r => r.concession).length, abandoned: model.regions.filter(r => r.concessionEnded).length },
          // C1 (#134): the arcane-industrial institutions, each named from its own
          // register — the exchange (finance), the gazette (the record/press), the
          // precinct (administration), and the buried power (the old faith beneath).
          // Deterministic in the seed; novel Markov names walked from the new corpora.
          institutions: (() => {
            const r = streams(model.seed)("institutions"), u = new Set();
            return {
              exchange: markovName("corporate", r, u) + " Exchange",
              gazette: "The " + markovName("gazette", r, u),
              precinct: markovName("precinct", r, u) + " Precinct",
              buried_power: markovName("chthonic", r, u)
            };
          })(),
          findings: getFindings(model),
          tensions: { crown_magnate: Math.round(model.tensions.crown_magnate), crown_temple: Math.round(model.tensions.crown_temple), magnate_temple: Math.round(model.tensions.magnate_temple) },
          capital: [round2(model.capPoint[0]), round2(model.capPoint[1])],
          space: "planar 0..1600 x 0..1000, y-up (flat-plane CRS)"
        },
        features
      };
    }

    // ---- Epoch-series export: QGIS Temporal Controller food -----------------
    // Regions + settlements repeat per epoch with epoch/epoch_date fields
    // (one epoch = 25 fictional years); conduit edges carry the epoch they
    // were built; roads exist from the founding.
    const epochDate = (e) => `${String(1000 + e * 25).padStart(4, "0")}-01-01`;
    function toEpochSeries(model, params) {
      const features = [];
      const edgeEpoch = model.conduitEdges.map((_, idx) => {
        for (let e = 0; e < model.epochSnaps.length; e++)
          if (idx < model.epochSnaps[e].edgeCount) return e;
        return model.epochSnaps.length - 1;
      });
      const lastFrame = model.epochSnaps.length - 1;
      model.epochSnaps.forEach((S, e) => {
        const date = epochDate(e);
        model.regions.forEach((reg, i) => {
          // the FINAL frame must equal the main map, which zeros a dead zone's
          // human columns; an intermediate frame keeps the town's living values
          // (it was alive then). So on the last frame only, a now-unsettled cell
          // reads the same zeroed wealth/elite_share the main export carries.
          const dead = e === lastFrame && !reg.settled;
          const wealthE = dead ? 0 : S.wealth[i];
          // #91: the final frame IS the main map, so a settled cell's elite_share
          // there must carry the counting-house boost the main export applied
          // AFTER the loop (the snapshot was taken mid-loop, pre-structure). Use
          // the final reg.eliteShare on the last frame; intermediate frames keep
          // the snapshot (the town had no counting-house boost yet those years).
          const eliteE = dead ? 0 : (e === lastFrame && reg.settled ? Math.round(reg.eliteShare) : S.eliteShare[i]);
          features.push({
            type: "Feature",
            properties: {
              kind: "region", epoch: e, epoch_date: date, region_id: reg.id,
              wealth: wealthE,
              population: dead ? 0 : Math.round(S.pop[i] * (1 + reg.rural)),
              aetherstone_endowment: S.E[i],
              artifice_index: S.A[i],
              blight_load: S.blight[i],
              on_grid: S.onGrid[i] ? 1 : 0,
              injustice_idx: Math.round(100 * (S.blight[i] / 100) * (1 - wealthE / 100)),
              elite_share: eliteE,
              emigration: dead ? 0 : (S.emig ? S.emig[i] : 0),       // B3 (#125): this epoch's souls gone off-map
              remittance: dead ? 0 : (S.remit ? S.remit[i] : 0),     // B3: this epoch's coin sent home
              occupied: S.occupied[i]
            },
            geometry: { type: "Polygon", coordinates: [reg.ring.map(p => [round2(p[0]), round2(p[1])])] }
          });
        });
        model.settlements.forEach(s => {
          features.push({
            type: "Feature",
            properties: {
              kind: "settlement", epoch: e, epoch_date: date, region_id: s.regionId,
              name: s.name, name_register: s.nameRegister, population: S.pop[s.regionId],
              on_grid: S.onGrid[s.regionId] ? 1 : 0
            },
            geometry: { type: "Point", coordinates: [round2(s.x), round2(s.y)] }
          });
        });
      });
      model.conduitEdges.forEach((e2, idx) => {
        const A = model.regions[e2.a], B = model.regions[e2.b];
        features.push({
          type: "Feature",
          properties: { kind: "grid", edge_class: e2.cls, epoch: edgeEpoch[idx], epoch_date: epochDate(edgeEpoch[idx]), from_region: A.id, to_region: B.id },
          geometry: { type: "LineString", coordinates: [[round2(A.c[0]), round2(A.c[1])], [round2(B.c[0]), round2(B.c[1])]] }
        });
      });
      model.roadEdges.forEach(e2 => {
        const A = model.regions[e2.a], B = model.regions[e2.b];
        features.push({
          type: "Feature",
          properties: { kind: "road", road_class: e2.cls, epoch: 0, epoch_date: epochDate(0), from_region: A.id, to_region: B.id },
          geometry: { type: "LineString", coordinates: [[round2(A.c[0]), round2(A.c[1])], [round2(B.c[0]), round2(B.c[1])]] }
        });
      });
      model.ridges.forEach(R => {
        features.push({
          type: "Feature",
          properties: { kind: "ridge", ridge_id: R.id, ridge_name: R.name, epoch: 0, epoch_date: epochDate(0) },
          geometry: { type: "LineString", coordinates: R.pts }
        });
      });
      model.passes.forEach(p => {
        features.push({
          type: "Feature",
          properties: { kind: "pass", ridge_id: p.ridgeId, region_id: model.regions[p.regionIdx].id, epoch: 0, epoch_date: epochDate(0) },
          geometry: { type: "Point", coordinates: [p.x, p.y] }
        });
      });
      model.rivers.forEach(RV => {
        features.push({
          type: "Feature",
          properties: { kind: "river", river_id: RV.id, river_name: RV.name, chain_regions: RV.chain.map(ri => model.regions[ri].id), epoch: 0, epoch_date: epochDate(0) },
          geometry: { type: "LineString", coordinates: RV.trace }
        });
      });
      const SEA_LINES2 = { west: [[0, 0], [0, 1000]], east: [[1600, 0], [1600, 1000]], south: [[0, 0], [1600, 0]], north: [[0, 1000], [1600, 1000]] };
      model.seaSides.forEach(side => {
        features.push({
          type: "Feature",
          properties: { kind: "coast", side, epoch: 0, epoch_date: epochDate(0) },
          geometry: { type: "LineString", coordinates: SEA_LINES2[side] }
        });
      });
      model.seaShapes.forEach((S, i) => {
        features.push({
          type: "Feature",
          properties: { kind: "sea", sea_id: i, epoch: 0, epoch_date: epochDate(0) },
          geometry: { type: "Polygon", coordinates: [S.outer, ...S.holes] }
        });
      });
      model.contours.forEach(cl => {
        features.push({
          type: "Feature",
          properties: { kind: "contour", level: cl.level, epoch: 0, epoch_date: epochDate(0) },
          geometry: { type: "MultiLineString", coordinates: cl.segs }
        });
      });
      model.regions.filter(r => r.isPort === 1).forEach(reg => {
        features.push({
          type: "Feature",
          properties: { kind: "port", region_id: reg.id, epoch: 0, epoch_date: epochDate(0) },
          geometry: { type: "Point", coordinates: [round2(reg.shorePt[0]), round2(reg.shorePt[1])] }
        });
      });
      { // S1: the skyway is founding infrastructure — epoch 0, like the roads
        const sp = model.regions.filter(r => r.isSkyport === 1);
        sp.forEach(reg => {
          features.push({
            type: "Feature",
            properties: { kind: "skyport", region_id: reg.id, epoch: 0, epoch_date: epochDate(0) },
            geometry: { type: "Point", coordinates: [round2(reg.c[0]), round2(reg.c[1])] }
          });
        });
        for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) {
          features.push({
            type: "Feature",
            properties: { kind: "skylane", from_region: sp[i].id, to_region: sp[j].id, epoch: 0, epoch_date: epochDate(0) },
            geometry: { type: "LineString", coordinates: [[round2(sp[i].c[0]), round2(sp[i].c[1])], [round2(sp[j].c[0]), round2(sp[j].c[1])]] }
          });
        }
      }
      model.ruins.forEach(r => {
        const reg = model.regions[r.regionIdx];
        features.push({
          type: "Feature",
          properties: { kind: "ruin", ruin_type: r.type, region_id: reg.id, epoch: 0, epoch_date: epochDate(0) },
          geometry: { type: "Point", coordinates: [round2(reg.wildPt[0]), round2(reg.wildPt[1])] }
        });
      });
      model.bridges.forEach(b => {
        features.push({
          type: "Feature",
          properties: { kind: "bridge", river_id: b.riverId, epoch: 0, epoch_date: epochDate(0) },
          geometry: { type: "Point", coordinates: [b.x, b.y] }
        });
      });
      model.regions.filter(r => r.hasTower === 1).forEach(reg => {
        features.push({
          type: "Feature",
          properties: { kind: "tower", region_id: reg.id, epoch: 0, epoch_date: epochDate(0) },
          geometry: { type: "Point", coordinates: [round2(reg.towerPt[0]), round2(reg.towerPt[1])] }
        });
      });
      if (model.maelstrom) {
        features.push({
          type: "Feature",
          properties: { kind: "maelstrom", side: model.maelstrom.side, epoch: 0, epoch_date: epochDate(0) },
          geometry: { type: "Point", coordinates: [model.maelstrom.x, model.maelstrom.y] }
        });
      }
      return {
        type: "FeatureCollection",
        name: "hinterland_epochs",
        hinterland: {
          schema_version: SCHEMA_VERSION, series: true, epochs: params.ep,
          world: model.world,
          skyway: { name: model.skywayName, ports: model.regions.filter(r => r.isSkyport === 1).map(r => r.id) },
          dominion: model.dominion ? { arrived_epoch: model.dominion.arrived, foothold: model.regions[model.dominion.foothold].id, occupied_n: model.regions.filter(r => r.occupied).length } : null,
          powers: { metropole: model.metropole, rival: model.rival, concessions: model.regions.filter(r => r.concession).length, abandoned: model.regions.filter(r => r.concessionEnded).length },
          years_per_epoch: 25,
          seed: String(params.seed), ...(params.fate ? { fate: String(params.fate) } : {}), ...(params.ch ? { ch: String(params.ch) } : {}), regions: params.regions, relax: params.relax,
          bias: params.bias,
          weights: { extraction: params.we, refining: params.wf, trade: params.wt, gradient: params.wg },
          grid_threshold: params.gt, dump_bias: params.db,
          disposal_doctrine: model.disposalDoctrine, sacrifice_zone: model.sacrificeZoneId,
          reform_edges: model.reformEdges,
          responsiveness: params.iq, order: params.order, openness: params.openness, harbors_closed: params.hb === 0,
          events: model.events,
          wind_deg: model.windDeg,
          sea_sides: model.seaSides,
          sea_level: model.seaLevel,
          treasuries: { crown: Math.round(model.treasuries.crown), temple: Math.round(model.treasuries.temple), magnate: Math.round(model.treasuries.magnate) },
          rulers: { crown: model.dynasties.crown.map(r => ({ name: r.name, from_epoch: r.from, contested: r.contested })),
                    temple: model.dynasties.temple.map(r => ({ name: r.name, from_epoch: r.from, contested: r.contested })),
                    magnate: model.dynasties.magnate.map(r => ({ name: r.name, from_epoch: r.from, contested: r.contested })) },
          tensions: { crown_magnate: Math.round(model.tensions.crown_magnate), crown_temple: Math.round(model.tensions.crown_temple), magnate_temple: Math.round(model.tensions.magnate_temple) },
          capital: [round2(model.capPoint[0]), round2(model.capPoint[1])],
          space: "planar 0..1600 x 0..1000, y-up (flat-plane CRS)"
        },
        features
      };
    }

    // ---- Companion CSV tables (#55): the provenance, flattened ---------------
    // hinterland.events / rulers / treasuries / tensions / findings and the
    // epoch snapshots live as nested JSON no table join can reach; these are
    // the same facts as flat rows. RFC 4180 quoting; deterministic row order
    // (region then epoch; events in timeline order) so the same world always
    // produces the same bytes.
    const csvCell = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csvOf = (header, rows) =>
      [header.join(","), ...rows.map(r => r.map(csvCell).join(","))].join("\n") + "\n";
    function toCsvTables(model) {
      const F = getFindings(model);
      const eventRows = model.events.map(ev => [
        ev.epoch, 1000 + 25 * ev.epoch, ev.type, ev.region_id, ev.name, ev.outcome,
        ev.faction !== undefined ? ev.faction : (ev.factions ? ev.factions.join("|") : undefined),
        ev.measure, ev.winner, ev.ceded, ev.tribute, ev.occupied, ev.contested, ev.ruler
      ]);
      const epochRows = [];
      model.regions.forEach((reg, i) => {
        model.epochSnaps.forEach((S, e) => {
          epochRows.push([reg.id, e, epochDate(e), S.wealth[i], S.eliteShare[i],
            Math.round(S.pop[i] * (1 + reg.rural)), S.bloc[i], S.occupied[i], S.toll[i]]);
        });
      });
      const rulerRows = [];
      for (const fac of ["crown", "temple", "magnate"])
        model.dynasties[fac].forEach(r => rulerRows.push([fac, r.name, r.from, r.contested]));
      return [
        ["events.csv", csvOf(
          ["epoch", "year", "type", "region_id", "name", "outcome", "faction", "measure", "winner", "ceded", "tribute", "occupied", "contested", "ruler"],
          eventRows)],
        ["epoch_region.csv", csvOf(
          ["region_id", "epoch", "epoch_date", "wealth", "elite_share", "population", "dominant_bloc", "occupied", "tariff_burden"],
          epochRows)],
        ["rulers.csv", csvOf(["faction", "name", "from_epoch", "contested"], rulerRows)],
        ["tensions.csv", csvOf(["pair", "tension"],
          ["crown_magnate", "crown_temple", "magnate_temple"].map(k => [k, Math.round(model.tensions[k])]))],
        ["treasuries.csv", csvOf(["faction", "coin"],
          ["crown", "temple", "magnate"].map(k => [k, Math.round(model.treasuries[k])]))],
        ["findings.csv", csvOf(["key", "value"],
          Object.keys(F).map(k => [k, F[k] !== null && typeof F[k] === "object" ? JSON.stringify(F[k]) : F[k]]))]
      ];
    }

    // ---- The findings (A1): the world argued -------------------------------
    // Every number here is computed from the SAME fields the export carries
    // (rounded anchors included), so the panel, the chronicle's verdict, and
    // hinterland.findings in the file are all exactly recomputable by anyone.
    // computeFindings is pure in the model, but render() needs it in as many as
    // seven places per paint (chronicle ×3, findings band, twins line, info
    // table ×2). Memo on the model object itself: recomputeAttributes builds a
    // fresh model, so the cache can never go stale — same pattern as _seatRun.
    function getFindings(model) { return model._F || (model._F = computeFindings(model)); }
    function computeFindings(model) {
      const R = model.regions;
      const n = R.length;
      const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
      const med = (xs) => { const t = xs.slice().sort((a, b) => a - b); return t.length ? t[Math.floor(t.length / 2)] : 0; };
      const r1 = (v) => Math.round(v * 10) / 10;
      // the poorest fifth against the richest fifth — OF THE INHABITED REALM.
      // #178: this ranked every cell by wealth and called the bottom fifth "the
      // poorest fifth of the realm", but an empty cell exports wealth exactly 0, so
      // empty cells ARE the bottom fifth: measured over 80 worlds, that fifth was
      // **85% uninhabited on average**, and 100% of it in the worst worlds. The
      // published claim about who breathes the poison was, in most worlds, a statement
      // about abandoned ground. It differs from the inhabited reading in 73 of 80
      // worlds. Settled-only is the same correction, on the same stated grounds, that
      // targets.mjs already applied to blight_wealth_corr: exposure is about people
      // breathing something. It is not the easier reading — both medians sit at 1.0.
      const peopledByWealth = R.filter(r => r.settled).sort((a, b) => a.wealth - b.wealth || a.id - b.id);
      const k = Math.max(1, Math.floor(peopledByWealth.length / 5));
      const blightRatio = peopledByWealth.length >= 5
        ? r1(mean(peopledByWealth.slice(0, k).map(r => r.blight)) /
             Math.max(1, mean(peopledByWealth.slice(-k).map(r => r.blight))))
        : null;
      // the mountain-shadow earnings gap (medians; seat excluded from the open side)
      // #185: SETTLED ground on both sides, and this was a real bug, not a precaution.
      // The twins are "the sharpest same-distance pair across the wall" — a comparison
      // between two TOWNS, one walled in and one not — and the pick is by the widest
      // WEALTH GAP. But the candidates were drawn from every region, and a cell the
      // years emptied exports wealth exactly 0, so an abandoned cell won the gap
      // contest outright almost whenever one sat in the shadow. Measured over 40
      // worlds at ep=10: twins were found in 33, and in **24 of those 33** the shadow
      // twin was empty ground. The headline exhibit was comparing a living town
      // against a field three times out of four, and naming a place with no name to
      // print. A dead cell is not the wall's victim; it is nobody's town.
      const shadow = R.filter(r => r.rangeShadow === 1 && r.settled);
      const open = R.filter(r => r.rangeShadow === 0 && !r.isCapital && r.settled);
      const shadowGap = (shadow.length >= 2 && open.length >= 2 && med(open.map(r => r.wealth)) > 0)
        ? Math.round(100 * (1 - med(shadow.map(r => r.wealth)) / med(open.map(r => r.wealth)))) : null;
      // darkness and its burden
      // dark_n counts REGIONS the grid skips, which is true of empty ground too, so it
      // stays over all of them. The burden ratio is a different claim — how much sicker
      // are the people the ledgers declined to serve — and it was averaging fields in
      // as healthy citizens. An unsettled cell exports disease_burden_per_1k = 0 by
      // construction ("a dead zone has no people, so no health burden"), and the
      // off-grid country is 59% empty cells, so the zeros dominated the numerator.
      //
      // It inverted the finding. Published median over 40 worlds: 0.9 — the unserved
      // country reading HEALTHIER than the lit core. Over the people actually living
      // there: 2.0, twice as sick. And the chronicle prints its sentence only when the
      // ratio exceeds 1, so the model measured environmental injustice in the unserved
      // country and then declined to report it in 13 of 22 worlds — in 12 of those 13
      // the finding held on inhabited ground. It holds in 21 of 22 worlds.
      const dark = R.filter(r => !r.onConduit), lit = R.filter(r => r.onConduit);
      const darkPeopled = dark.filter(r => r.settled), litPeopled = lit.filter(r => r.settled);
      const darkBurden = (darkPeopled.length && litPeopled.length)
        ? r1(mean(darkPeopled.map(r => r.burden)) / Math.max(0.1, mean(litPeopled.map(r => r.burden)))) : null;
      // who drinks last
      const mouth = R.reduce((a, b) => b.downstreamBlight > a.downstreamBlight ? b : a, R[0]);
      // who pays the gates
      const paying = R.filter(r => r.tollBurden > 0).length;
      // THE TWINS: the sharpest same-distance pair across the wall (rounded
      // anchors, so the pick is reproducible from the exported points)
      const seat = R.find(r => r.isCapital);
      const A = (r) => [round2(r.c[0]), round2(r.c[1])];
      const sp2 = A(seat);
      const dSeat = (r) => { const a = A(r); return Math.hypot(a[0] - sp2[0], a[1] - sp2[1]); };
      let twins = null, bestGap = 0;
      for (const sh of shadow) {
        let mate = null, bd = Infinity;
        for (const o of open) {
          const dd = Math.abs(dSeat(o) - dSeat(sh));
          if (dd < bd || (dd === bd && mate && o.id < mate.id)) { bd = dd; mate = o; }
        }
        if (!mate || bd > 80) continue;
        const gap = mate.wealth - sh.wealth;
        if (gap > bestGap || (gap === bestGap && twins && sh.id < twins.shadow)) {
          bestGap = gap;
          twins = { shadow: sh.id, open: mate.id };
        }
      }
      // V1: the trajectory is the finding — gini at founding and at close
      // (both exactly recomputable: wealth_t0 and wealth columns)
      const giniOf = (xs) => {
        const t = xs.slice().sort((a, b) => a - b);
        const m = mean(t);
        if (m === 0) return 0;
        let g = 0;
        for (let i = 0; i < t.length; i++) g += (2 * (i + 1) - t.length - 1) * t[i];
        return Math.round(g / (t.length * t.length * m) * 100) / 100;
      };
      const turn = model.events.find(ev => ev.type === "reform" || ev.type === "reaction" || ev.type === "revolt");
      // G4: the rain split — median rainfall on either side of the first
      // ridge's axis (recomputable: side = cross product against the exported
      // ridge endpoints; wet = the higher median)
      let rainSplit = null;
      if (model.ridges.length) {
        const pts = model.ridges[0].pts;
        const A2 = pts[0], B2 = pts[pts.length - 1];
        const sideOf = (r) => (B2[0] - A2[0]) * (round2(r.c[1]) - A2[1]) - (B2[1] - A2[1]) * (round2(r.c[0]) - A2[0]);
        const left = R.filter(r => sideOf(r) > 0).map(r => r.rainfall);
        const right = R.filter(r => sideOf(r) <= 0).map(r => r.rainfall);
        if (left.length >= 3 && right.length >= 3) {
          const ml = med(left), mr = med(right);
          rainSplit = { wet: Math.max(ml, mr), dry: Math.min(ml, mr) };
        }
      }
      // H1: the two-level ledger. A region map can only see inequality
      // BETWEEN places; the class ledger lives within them. Each region
      // contributes its owners' row and its labor row (per-head wealth
      // from elite_share and elite_pop_pct; the population-weighted mean
      // of the two rows is the region's wealth exactly), and the weighted
      // gini over the 2N rows is set against the same gini computed as if
      // each region were one people. Collapsing rows to their mean can
      // only lower a gini, so within_pct >= 0 always. All exactly
      // recomputable from the exported columns.
      const wgini = (gs) => {
        const P = gs.reduce((a, g) => a + g.p, 0);
        const mu = P > 0 ? gs.reduce((a, g) => a + g.p * g.v, 0) / P : 0;
        if (!(mu > 0)) return 0;
        let s = 0;
        for (const a of gs) for (const b of gs) s += a.p * b.p * Math.abs(a.v - b.v);
        return Math.round(s / (2 * P * P * mu) * 100) / 100;
      };
      // only inhabited cells carry a class split; a dead zone has population 0
      // and a zeroed ledger (elitePopPct 0), so including it would form a 0/0
      // row. Filter it out — its zero weight adds nothing but the NaN.
      const peopled = R.filter(r => r.population > 0 && r.elitePopPct > 0 && r.elitePopPct < 100);
      const rows = [];
      peopled.forEach(r => {
        const pe = r.population * r.elitePopPct / 100;
        rows.push({ p: pe, v: r.wealth * (r.eliteShare / r.elitePopPct) });
        rows.push({ p: r.population - pe, v: r.wealth * ((100 - r.eliteShare) / (100 - r.elitePopPct)) });
      });
      const giniPeople = wgini(rows);
      const giniBetween = wgini(peopled.map(r => ({ p: r.population, v: r.wealth })));
      const popAll = R.reduce((a, r) => a + r.population, 0);
      const popE = R.reduce((a, r) => a + r.population * r.elitePopPct / 100, 0);
      const coinAll = R.reduce((a, r) => a + r.population * r.wealth, 0);
      const coinE = R.reduce((a, r) => a + r.population * r.wealth * r.eliteShare / 100, 0);
      const owners = coinAll > 0 ? {
        pop_pct: Math.round(popE / popAll * 1000) / 10,
        coin_pct: Math.round(coinE / coinAll * 1000) / 10
      } : null;
      const classGapRealm = coinAll - coinE > 0
        ? Math.round(((coinE / popE) / ((coinAll - coinE) / (popAll - popE))) * 10) / 10 : null;
      const compTown = R.reduce((a, b) => b.eliteShare > a.eliteShare ? b : a, R[0]);
      // Z1: the rank-size law — an urban hierarchy no one decreed. OLS of
      // ln(pop) on ln(rank) over the settlement populations; alpha near 1
      // is Zipf. Exactly recomputable from the exported settlements.
      const zipf = (() => {
        // two honest numbers, as the law is found in the world we live
        // in: the slope over the WHOLE system (Zipf's constant is ~1)
        // and the straightness of the big-town tail (hamlets deviate;
        // cities obey). Exactly recomputable from exported settlements.
        // the rank-size law is a law of TOWNS: only settled cells count (an
        // unsettled dead zone has no population to rank, and log(0) is not a
        // number). This matches the exported settlements the suite recomputes.
        const all = R.filter(r => r.settled && r.settlementPop > 0).map(r => r.settlementPop).sort((a, b) => b - a);
        if (all.length < 8) return null;
        const fit = (pops) => {
          const xs = pops.map((_, i) => Math.log(i + 1)), ys = pops.map(p => Math.log(p));
          const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
          let sxy = 0, sxx = 0, syy = 0;
          for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
          return { slope: sxy / sxx, r2: syy > 0 ? (sxy * sxy) / (sxx * syy) : 0 };
        };
        const full = fit(all);
        const tail = fit(all.slice(0, Math.ceil(all.length / 2)));
        return {
          alpha: Math.round(-full.slope * 100) / 100,
          tail_alpha: Math.round(-tail.slope * 100) / 100,
          tail_r2: Math.round(tail.r2 * 100) / 100,
          primacy: Math.round(all[0] / Math.max(1, all[1]) * 10) / 10
        };
      })();
      // S1: the skyway abolishes geography — for those who may board. The
      // lanes were chartered where flight beats the ground by the most, so
      // the walled country's mean advantage beats the open country's; and
      // the twin behind the wall measures the mountain at twin_sky% less —
      // if it sits in the owners' row. Means over exported columns
      // (medians collapse to zero: the lanes serve the tail, which is the
      // point), plus the headcount the lanes actually reach.
      const sky = {
        shadow_adv: shadow.length >= 2 ? r1(mean(shadow.map(r => r.skyAdvantage))) : null,
        open_adv: open.length >= 2 ? r1(mean(open.map(r => r.skyAdvantage))) : null,
        reached_n: R.filter(r => r.skyAdvantage >= 10).length,
        twin_sky: twins ? R.find(r => r.id === twins.shadow).skyAdvantage : null
      };
      // X1: sovereignty — the last inequality. The occupied country keeps
      // less of its own value, is the ONLY fully-wired country (the
      // extractive corridor), grows slower, and its owners' row does
      // better than the free realm's (the comprador bargain). All exactly
      // recomputable from the exported columns.
      // #185 sweep: TERRITORY and PEOPLE are different questions here, and this block
      // was answering both with one array. Occupied ground is occupied whether or not
      // anyone lives on it — the Dominion's ball covers empty cells and force-wires
      // them too — so `occupied_n` and `corridor_wired` stay territorial. The three
      // RATIOS are claims about an economy and an owning class, and a cell the years
      // emptied has neither: it exports wealth 0 while KEEPING its elite_share and
      // retention (the abandonment pass clears population and tier, not the economic
      // columns). So they were averaging in the ownership and the yield of towns that
      // no longer exist, and `growth_gap` in particular took each dead cell's whole
      // founding wealth as a loss, mostly on the free side.
      const occs = R.filter(r => r.occupied);
      const freeR = R.filter(r => !r.occupied);
      const occsP = occs.filter(r => r.settled), freeP = freeR.filter(r => r.settled);
      const sovereignty = occs.length && freeR.length && occsP.length && freeP.length ? {
        occupied_n: occs.length,
        corridor_wired: occs.filter(r => r.onConduit).length,
        retent_ratio: r1(mean(freeP.map(r => r.retention)) / Math.max(1, mean(occsP.map(r => r.retention)))),
        growth_gap: med(freeP.map(r => r.wealth - r.wealthT0)) - med(occsP.map(r => r.wealth - r.wealthT0)),
        comprador_ratio: r1(mean(occsP.map(r => r.eliteShare)) / Math.max(1, mean(freeP.map(r => r.eliteShare))))
      } : null;
      // #56: the thesis, measured — global Moran's I over the SAME region
      // adjacency the cost graph walks (row-standardized weights), with a
      // permutation pseudo-p drawn from a dedicated substream: "the wealth
      // map is clustered" now ships with its own significance test, and
      // both numbers recompute exactly from the exported edges + columns.
      const round3 = (v) => Math.round(v * 1000) / 1000;
      const rMoran = streams(model.seed)("moran");
      const moranOf = (vals) => {
        const mu = mean(vals);
        const z = vals.map(v => v - mu);
        const den = z.reduce((a, v) => a + v * v, 0);
        const lag = (zz) => {
          let s = 0;
          R.forEach((r, i) => {
            if (!r.neighbors.length) return;
            let li = 0;
            for (const j of r.neighbors) li += zz[j];
            s += zz[i] * (li / r.neighbors.length);
          });
          return s;
        };
        const I = den > 0 ? lag(z) / den : 0;
        const EI = -1 / (n - 1);
        // pseudo-p: rank of the observed I among 199 label shuffles,
        // one-sided toward the observed side of the expectation
        const NP = 199;
        let asFar = 0;
        const idx = z.map((_, i) => i);
        for (let t = 0; t < NP; t++) {
          for (let i = idx.length - 1; i > 0; i--) {
            const j = Math.floor(rMoran() * (i + 1));
            const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp;
          }
          const Ip = den > 0 ? lag(idx.map(i2 => z[i2])) / den : 0;
          if (I >= EI ? Ip >= I : Ip <= I) asFar++;
        }
        return { I: round3(I), expected: round3(EI), p: round3((asFar + 1) / (NP + 1)), n_perm: NP };
      };
      const moran = moranOf(R.map(r => r.wealth));
      const moranBlight = moranOf(R.map(r => r.blight));

      // #86: THE AGES. The realm names its own eras from its socioeconomic state,
      // the way a legend calls a stretch of years an Age of Heroes. Read each
      // epoch's condition off the snapshots (recomputable: the same wealth/pop/
      // toll/grid the series export carries), classify it, then coalesce runs of
      // the same character into named ages. So the timeline becomes a
      // PERIODIZATION of inequality — you can point and say the gap opened during
      // the Age of the Gates. Every boundary traces to the exported epoch series.
      const ages = (() => {
        const snaps = model.epochSnaps || [];
        if (snaps.length < 2) return []; // a static world (ep=0) has no ages
        const settledAt = (S) => S.pop.map((p, i) => ({ p, w: S.wealth[i], toll: S.toll[i], grid: S.onGrid[i] })).filter(x => x.p > 0);
        const per = snaps.map((S, e) => {
          const live = settledAt(S);
          const gini = giniOf(live.map(x => x.w));
          const deadFrac = S.pop.length ? (S.pop.filter(p => p === 0).length / S.pop.length) : 0;
          const tollTake = S.toll.reduce((a, b) => a + b, 0);
          const gridFrac = S.onGrid.length ? (S.onGrid.filter(Boolean).length / S.onGrid.length) : 0;
          return { e, gini, deadFrac, tollTake, gridFrac };
        });
        // per-epoch CHARACTER from how the condition changed since the last epoch
        const maxToll = Math.max(...per.map(p => p.tollTake), 1);
        const label = (i) => {
          const p = per[i], q = i > 0 ? per[i - 1] : p;
          if (p.deadFrac - q.deadFrac > 0.04) return "desolation";       // dead zones spreading
          if (q.deadFrac - p.deadFrac > 0.03) return "restoration";      // the ghost country coming back
          if (p.tollTake >= 0.75 * maxToll && p.tollTake > 0) return "gates"; // the chokepoint economy at its height
          if (p.gini - q.gini > 0.015 || p.gridFrac - q.gridFrac > 0.02) return "accumulation"; // wealth compounding, grid reaching
          return "quiet";                                                // the years passed as the founding arranged them
        };
        const NAME = {
          accumulation: ["the Age of Accumulation", "the Gathering Years", "the Long Ascent", "the Compounding Age"],
          gates: ["the Age of the Gates", "the Age of the Crossings", "the Gated Age", "the Age of Tariffs"],
          desolation: ["the Long Desolation", "the Emptying", "the Hollow Years", "the Great Desolation"],
          restoration: ["the Restoration", "the Return", "the Mending Years", "the Second Spring"],
          quiet: ["the Quiet Years", "the Still Years", "the Ordinary Age", "the Settled Years"] };
        // per-epoch character, then SMOOTH it: a single blip year is not an age.
        // Absorb any epoch whose character differs from BOTH neighbours into the
        // run around it, so an age is a genuine stretch, not a flicker.
        const raw = per.map((_, i) => label(i));
        const sm = raw.slice();
        for (let i = 1; i < sm.length - 1; i++)
          if (raw[i] !== raw[i - 1] && raw[i] !== raw[i + 1] && raw[i - 1] === raw[i + 1]) sm[i] = raw[i - 1];
        // coalesce consecutive same-character epochs into ages
        let out = [];
        for (let i = 0; i < sm.length; i++) {
          if (out.length && out[out.length - 1].character === sm[i]) out[out.length - 1].to_epoch = i;
          else out.push({ character: sm[i], name: NAME[sm[i]][i % NAME[sm[i]].length], from_epoch: i, to_epoch: i });
        }
        // merge any age still only ONE epoch long into its longer neighbour, so
        // the periodization is a handful of real eras, not a year-by-year list
        if (out.length > 1) {
          const merged = [out[0]];
          for (let i = 1; i < out.length; i++) {
            const prev = merged[merged.length - 1], cur = out[i];
            const curLen = cur.to_epoch - cur.from_epoch + 1;
            if (curLen === 1 && i < out.length) { prev.to_epoch = cur.to_epoch; } // absorb the singleton into what came before
            else merged.push(cur);
          }
          out = merged;
        }
        // stamp each age's measured gini span so the periodization is auditable
        return out.map(a => ({ ...a, gini_start: per[a.from_epoch].gini, gini_end: per[a.to_epoch].gini }));
      })();

      // A3 (#120): the neutral shape instruments — founding→close, measured on
      // the SETTLED realm (same set at both ends, matching gini/gini_t0 above),
      // so a pile of abandoned zeros can never fake growth or a fallen floor.
      const settled = R.filter(r => r.settled);
      const sN = settled.length;
      const snapsF = model.epochSnaps, lastF = snapsF.length - 1;
      const totW = settled.reduce((s, r) => s + r.wealth, 0);
      const totW0 = settled.reduce((s, r) => s + r.wealthT0, 0);
      // per-capita = the wealth index the AVERAGE PERSON lives at: each region's
      // wealth weighted by its population (0–100), not the summed index over a
      // headcount (which would read ~0 — wealth is an index, not a coin pile).
      const wmean = (getW, frame) => {
        let sw = 0, sp = 0;
        for (const r of settled) { const p = snapsF[frame] ? snapsF[frame].pop[r.id] : r.settlementPop; sw += getW(r) * p; sp += p; }
        return sp ? r1(sw / sp) : 0;
      };
      // growth: total and per-capita wealth, close vs founding (the pie can move)
      const growth = { total: totW, total_t0: totW0, per_capita: wmean(r => r.wealth, lastF), per_capita_t0: wmean(r => r.wealthT0, 0) };
      // the floor: the p10 of regional wealth, close vs founding (did the poorest ground rise?)
      const p10 = (get) => { const t = settled.map(get).sort((a, b) => a - b); return t.length ? t[Math.floor(0.1 * (t.length - 1))] : 0; };
      const floor = { p10: p10(r => r.wealth), p10_t0: p10(r => r.wealthT0) };
      // absolute mobility: share of settled regions richer than their founding selves
      const absMobility = sN ? Math.round(100 * settled.filter(r => r.wealth > r.wealthT0).length / sN) / 100 : 0;
      // rank churn: Spearman rho of wealth ranks, founding→close (1 = the order froze;
      // low/negative = who is rich actually changed). Ties broken by id, so ranks are
      // distinct and the classic 1 - 6Σd²/(n(n²−1)) form is exact.
      const rankChurn = (() => {
        if (sN < 2) return null;
        const rank = (get) => {
          const idx = settled.map((_, i) => i).sort((a, b) => get(settled[a]) - get(settled[b]) || settled[a].id - settled[b].id);
          const rk = []; idx.forEach((si, r) => { rk[si] = r; }); return rk;
        };
        const r0 = rank(r => r.wealthT0), rC = rank(r => r.wealth);
        let d2 = 0; for (let i = 0; i < sN; i++) d2 += (r0[i] - rC[i]) ** 2;
        return Math.round((1 - 6 * d2 / (sN * (sN * sN - 1))) * 100) / 100;
      })();
      // volatility: per-region boom/bust amplitude (max−min wealth across epochs), realm mean
      const ampOf = (r) => { const ws = snapsF.map(s => s.wealth[r.id]); return Math.max(...ws) - Math.min(...ws); };
      const volatility = sN ? Math.round(10 * mean(settled.map(ampOf))) / 10 : 0;
      // B5 (#127): the ORDINARY-erosion world mean — every settled region's row move since
      // founding with the CATASTROPHE shocks (revolt/collapse/plague) charged out. Negative
      // means the owners' row fell on ordinary competition and boom-churn ALONE, with no
      // catastrophe doing the cutting: the B5 inversion, "falls without a catastrophe."
      const eliteOrdinaryMean = sN
        ? Math.round(100 * mean(settled.map(r => (r.eliteShare - r.eliteShareT0) - (r.eliteCatDelta || 0)))) / 100
        : 0;
      // B6 (#128): the crossings ledger — how many spans rotted (below half condition),
      // and the mean trade friction the settled realm pays for decayed spans on its
      // roads to market. trade_drag > 0 means the bridges cost trade this run.
      const crossingRegs = R.filter(r => r.crossingCondition !== null && r.crossingCondition !== undefined);
      const crossingsDecayed = crossingRegs.filter(r => r.crossingCondition < 0.5).length;
      const tradeDrag = sN ? Math.round(mean(settled.map(r => r.crossFriction || 0)) * 10) / 10 : 0;

      // B11 (#133): the VERDICT CLASS — §3.5's gap × floor matrix, qualified by
      // realm growth. All recomputable from the exported wealth columns: the gap
      // is the gini move, the floor is the p10 move, the growth is per-capita.
      // The sweep pins verdict DIVERSITY (§7.3): no class > 40%, ≥ 6 classes.
      const verdict = (() => {
        const dG = giniOf(R.filter(r => r.settled).map(r => r.wealth)) - giniOf(R.filter(r => r.settled).map(r => r.wealthT0));
        const dFloor = floor.p10 - floor.p10_t0;
        const gap = dG <= -0.04 ? "closed" : dG >= 0.04 ? "widened" : "held";
        const flo = dFloor > 0 ? "rose" : "fell";
        const CELL = {
          "closed|rose": "shared rise",     "closed|fell": "leveling down",
          "held|rose":   "quiet growth",    "held|fell":   "quiet decay",
          "widened|rose":"unequal growth",  "widened|fell":"extraction"
        };
        const cell = CELL[gap + "|" + flo];
        const gr = growth.per_capita_t0 > 0 ? growth.per_capita / growth.per_capita_t0 : 1;
        const growthQ = gr >= 1.08 ? "boom" : gr <= 0.92 ? "collapse" : "stagnant";
        return { gap, floor: flo, growth: growthQ, cell, class: cell + " · " + growthQ };
      })();
      // B11 (#133): the concessions ledger — foreign-owned coasts and wound-up ones.
      // "richer but owned" is the mean concession wealth beside the realm median
      // (development) and the mean foreign claim (ownership); the abandonment is
      // the double edge, the yield returned to a hollowed town.
      const conc = R.filter(r => r.concession), aband = R.filter(r => r.concessionEnded);
      const medWealthAll = med(R.filter(r => r.settled).map(r => r.wealth));
      const concessions = (conc.length || aband.length) ? {
        concession_n: conc.length,
        abandoned_n: aband.length,
        conc_wealth: conc.length ? Math.round(mean(conc.map(r => r.wealth))) : null,
        median_wealth: Math.round(medWealthAll),
        foreign_claim: conc.length ? r1(mean(conc.map(r => r.foreignClaim))) : null,
        aband_wealth: aband.length ? Math.round(mean(aband.map(r => r.wealth))) : null
      } : null;

      return {
        ages,
        zipf,
        sky,
        growth,
        floor,
        absolute_mobility: absMobility,
        rank_churn: rankChurn,
        elite_ordinary_mean: eliteOrdinaryMean,
        crossings_total: crossingRegs.length,
        crossings_decayed: crossingsDecayed,
        trade_drag: tradeDrag,
        volatility,
        sovereignty,
        verdict,
        concessions,
        rain_split: rainSplit,
        gini_people: giniPeople,
        gini_between_people: giniBetween,
        within_pct: giniPeople > 0 ? Math.round(100 * (1 - giniBetween / giniPeople)) : null,
        owners,
        class_gap: classGapRealm,
        company_town: compTown.id,
        company_share: compTown.eliteShare,
        // the wealth-gap trajectory is measured over the SURVIVING realm (cells
        // still settled): a dead zone reads wealth 0, and counting a pile of
        // abandoned zeros would inflate every world's final gini and read as
        // entrenchment that never happened to the people. Both endpoints use the
        // same set of places, so the gap's rise or fall is real, not a headcount
        // artifact of who emptied out. (Recomputable: is_settled + the two
        // wealth columns.)
        gini: giniOf(R.filter(r => r.settled).map(r => r.wealth)),
        gini_t0: giniOf(R.filter(r => r.settled).map(r => r.wealthT0)),
        moran,
        moran_blight: moranBlight,
        turning: turn ? { type: turn.type, epoch: turn.epoch, measure: turn.measure || null, outcome: turn.outcome || null } : null,
        blight_ratio: blightRatio,
        shadow_gap_pct: shadowGap,
        dark_n: dark.length,
        dark_burden_ratio: darkBurden,
        mouth_region: mouth.downstreamBlight > 0 ? mouth.id : null,
        mouth_downstream: mouth.downstreamBlight,
        toll_paying_n: paying,
        twins
      };
    }
    // `audit`, when passed, collects one entry per composed beat: {key, text, facts,
    // names}. The chronicle returns markdown, and markdown cannot be audited — the
    // facts can. Nothing in the app passes it; the suite does, so that every figure
    // on the page can be recomputed from the column it claims to quote.
    function composeChronicle(model, params, audit) {
      const keep = (key, v) => { if (v && audit) audit.push({ key, text: v.text, facts: v.facts, names: v.names }); return v; };
      const year = (e) => 1000 + 25 * e;
      const closeY = year(params.ep);
      const L = [];

      // -- the founding ------------------------------------------------------
      // D4 (#140): composed on the loom in the historian register. What was one fixed
      // template per beat is now a gated pool, and an ABSENCE is a fragment like any
      // other rather than the else-branch of a template.
      const CC = chronicleCtx(model, params);
      L.push(`# A Chronicle of the Hinterland`);
      L.push(``);
      {
        const v = keep("preamble", chronicleBeat(CHRONICLE_POOL, "preamble", null, CC, params.seed, "preamble"));
        L.push(`*${v ? v.text.replace(/\.$/, "") : `The world called "${params.seed}"`}.*`);
      }
      L.push(``);
      L.push(`## The Founding, Year 1000`);
      L.push(``);
      for (const [claim, gloss] of CHRONICLE_FOUNDING) {
        const v = keep(claim, chronicleBeat(CHRONICLE_POOL, claim, gloss, CC, params.seed, claim));
        if (!v) continue;
        L.push(v.text);
        L.push(``);
        // the rivers are told one at a time, each on its own substream
        if (claim === "sea") for (const [ri, RV] of model.rivers.entries()) {
          const rc = Object.assign({}, CC, {
            hasRiver: true, river: RV.name + (RV.kind === "River" ? "" : " " + RV.kind),
            river_head: CC.town(model.regions[RV.chain[0]].id).name,
            river_mouth: CC.town(model.regions[RV.chain[RV.chain.length - 1]].id).name,
            river_len: RV.chain.length,
          });
          const rv = keep("river#" + ri, chronicleBeat(CHRONICLE_POOL, "river", "river_gloss", rc, params.seed, "river#" + ri));
          if (rv) { L.push(rv.text); L.push(``); }
        }
      }
      if (L[L.length - 1] === ``) L.pop();

      // -- the years ---------------------------------------------------------
      if (params.ep > 0) {
        L.push(``);
        L.push(`## The Years`);
        L.push(``);
        // #86: the realm's own ages open The Years — a periodization the reader
        // can point at ("the gap opened in the Age of the Gates"). D4 (#140):
        // composed, along with the quiet-years clause that used to be its else-branch.
        for (const [claim, gloss] of CHRONICLE_YEARS_OPEN) {
          const v = keep("years#" + claim, chronicleBeat(CHRONICLE_POOL, claim, gloss, CC, params.seed, "years#" + claim));
          if (!v) continue;
          L.push(v.text);
          L.push(``);
        }
        // D4 (#140): every year-line is composed. What was a twenty-seven branch
        // `if` ladder of fixed templates is EVENT_POOL, gated per type; the branches
        // that used to choose a template (contested or not, won or lost, chained to
        // a strike or not) are `req` predicates on fragments, so a world that does
        // not meet one never sees the clause.
        const strikeEv = model.events.find(ev => ev.type === "ore_strike");
        // One tally for the whole act: no clause is written twice in one chronicle's
        // years, however many droughts or successions this world happens to have.
        const yearsUsed = new Set();
        model.events.forEach((ev, i) => {
          const v = keep(`ev#${i}#${ev.type}`, eventLine(ev, i, CC, model, params, strikeEv, yearsUsed));
          if (!v.text) return; // an unrecognized event leaves no year-line
          L.push(`**Year ${year(ev.epoch)}.** ${v.text}`);
          L.push(``);
        });
        // E6: the years leave bynames where they pass — derived, not drawn
        for (const [claim, gloss] of CHRONICLE_YEARS_CLOSE) {
          const v = keep("years#" + claim, chronicleBeat(CHRONICLE_POOL, claim, gloss, CC, params.seed, "years#" + claim));
          if (!v) continue;
          L.push(v.text);
          L.push(``);
        }
      }

      // -- the state of the realm --------------------------------------------
      // D4 (#140): composed, and one act shorter than it was. The class ledger and
      // the sovereignty paragraph were each stated twice in v1 — once here and once
      // in What the Record Shows — so the Record act skips what this one says.
      L.push(``);
      L.push(`## The State of the Realm, Year ${closeY}`);
      L.push(``);
      for (const [claim, gloss] of CHRONICLE_STATE) {
        const v = keep("state#" + claim, chronicleBeat(CHRONICLE_POOL, claim, gloss, CC, params.seed, "state#" + claim));
        if (!v) continue;
        L.push(v.text);
        L.push(``);
      }
      if (L[L.length - 1] === ``) L.pop();
      // A1: the chronicler is required to close with what the numbers say
      {
        const F = getFindings(model);
        L.push(``);
        L.push(`## What the Record Shows`);
        L.push(``);
        // D4 (#140): this act WAS the findings panel written a second time in the
        // historian's voice — same facts, same conditions, different words, and two
        // copies to keep in step. It calls the same composer now, on its own
        // substream, so the two surfaces cannot drift and there is one pool to
        // maintain rather than two. The `lead` block is skipped because the act's
        // own opening sentence already carries the gap's movement.
        {
          const blocks = composeFindings(model, params, {
            register: "historian", surface: "chronicle-record",
            skip: ["class", "sovereignty", "dark"],   // the State act carries these
          });
          if (audit) for (const b of blocks) audit.push({ key: "record#" + b.topic, text: b.text, facts: b.facts, names: b.names });
          // a block that opens on **emphasis** starts with an asterisk, so loomCompose's
          // capitalization pass did not see a letter to raise. Stripping the markers
          // for the markdown surface therefore has to raise it here.
          const plain = (t) => t.replace(/\*\*/g, "").replace(/^([a-z])/, (m, c) => c.toUpperCase());
          const lead = keep("record_lead", chronicleBeat(CHRONICLE_POOL, "record_lead", null, CC, params.seed, "record_lead"));
          L.push((lead ? lead.text : `The record closes with what the numbers say.`) + ` ` +
            blocks.filter(b => b.topic !== "closer").map(b => plain(b.text)).join(` `));
          L.push(``);
          const close = blocks.find(b => b.topic === "closer");
          if (close) L.push(plain(close.text));
          // D5 (#141): and then the verdict, in the judge's register, from the same
          // verdict function the findings band reads. The chronicle used to close on
          // the analyst's closer alone, which reports and does not judge; the record
          // is entitled to a judgement as long as it is a judgement about THIS world.
          L.push(``);
          const vv = composeVerdict(model, params, { surface: "chronicle-verdict" });
          if (audit) audit.push({ key: "verdict", text: vv.text, facts: vv.facts, names: vv.names });
          L.push(`*${vv.text}*`);
        }
      }
      if (params.ep === 0) {
        L.push(``);
        L.push(`*The record ends where it began. The world is newly founded, and its years are still to run.*`);
      }
      return L.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
    }

    // ---- The chronicle, composed (D4, #140) ---------------------------------
    //
    // The historian register, on the loom. The founding and the state of the realm
    // were single fixed templates: every world said them in the same words and only
    // the names and figures moved. Measured before any of this was written (24 seeds,
    // skeleton-masked so a template over different towns scores as the SAME):
    //
    //   whole chronicle   0.62      preamble           0.98
    //   Founding          0.71      State of the Realm 0.76
    //   What the Record Shows 0.65  The Years          0.50
    //
    // The Years is 51% of the words and the LEAST repetitive act, because its event
    // prose already picks from five variants per type. The fixed acts are where the
    // sameness lives, so that is where this pool is.
    //
    // "What the Record Shows" gets no pool at all: it was the findings panel written
    // a second time in the historian's voice, and it calls composeFindings now.
    //
    // §7.4's WITHIN-SEED ceiling is deliberately NOT pinned, and the reason is
    // measured: strip every figure and name and a knob at its extreme still leaves
    // 77-96% of the beat structure standing (iq=100 shares 53 of 54 beats with the
    // base world). Prose cannot separate two worlds that fired the same beats over
    // the same values; the only way to hit 0.45 would be keying composition on world
    // state so a dial rewords a chronicle whose content did not change, which is
    // tuning to the metric. 0.93 is a statement about how far the dials reach, which
    // is what sweep.mjs already measures. Run `chronicle-proto.mjs --knobs`.


    // The phrasings the flattened lists draw from. Each item of a list draws its own,
    // so a list is not one sentence repeated with the names swapped.
    const RUIN_SAID = {
      delve: [
        (n, t) => `the delve called ${n} gapes in the old workings by ${t}`,
        (n, t) => `${n} is a delve, open in the old workings above ${t}`,
        (n, t) => `there is a hole in the workings by ${t} that the charts call ${n}`,
        (n, t) => `${n}, a delve past ${t}, has never been surveyed to the bottom`,
        (n, t) => `the old workings by ${t} are open at ${n} and nobody has closed them`,
      ],
      tomb: [
        (n, t) => `the tomb of ${n} keeps its silence in the barrens by ${t}`,
        (n, t) => `${n} lies in a tomb out in the barrens past ${t}`,
        (n, t) => `there is a tomb by ${t} with ${n} in it and nothing else recorded`,
        (n, t) => `the barrens beyond ${t} hold ${n}, sealed and unentered`,
        (n, t) => `${n} was buried by ${t} before the founding and has not been disturbed`,
      ],
      deadhold: [
        (n, t) => `the deadhold of ${n} stands empty by ${t}, and its ground is poisoned yet`,
        (n, t) => `${n} stands empty by ${t} on ground that has not recovered`,
        (n, t) => `by ${t} the deadhold ${n} keeps its walls and its poison`,
        (n, t) => `nothing has moved back into ${n} by ${t}, and nothing is going to`,
        (n, t) => `${n} is roofed and empty by ${t}, which is worse than a ruin`,
      ],
    };
    const AGE_SAID = {
      wider: ["when the gap widened", "when the spread opened out", "when the distance grew",
        "in which the gap got wider", "when what separated the top from the middle grew"],
      narrower: ["when the gap narrowed", "when the spread closed up", "when the distance shrank",
        "in which the gap got smaller", "when the top and the middle moved toward each other"],
      held: ["when the gap held", "when nothing in the spread moved", "when the distance stayed put",
        "in which the gap did not move", "when the shape of the realm sat still"],
    };
    const FATE_SAID = {
      boom: [n => `${n} rose through the years`, n => `${n} gained`, n => `${n} came up`,
        n => `${n} ended richer than at the founding`, n => `${n} climbed`],
      stable: [n => `${n} held steady`, n => `${n} neither rose nor fell`, n => `${n} held`,
        n => `${n} ended where the founding left ${n === 1 ? "it" : "them"}`, n => `${n} stayed put`],
      decline: [n => `${n} declined`, n => `${n} slid`, n => `${n} lost ground`,
        n => `${n} ended poorer`, n => `${n} went down`],
      collapse: [n => `${n} collapsed outright`, n => `${n} went under`, n => `${n} failed`,
        n => `${n} collapsed`, n => `${n} did not survive the years`],
    };

    const CHRONICLE_FRAMES = [
      "{A}. {B}.", "{A}, and {B}.", "{A}; {B}.", "{A}. {B}.",
      "{A}: {B}.", "{A}, though {B}.", "{A}. And {B}.", "{A}, so {B}.",
    ];

    const CHRONICLE_POOL = {
      // ---- the preamble ------------------------------------------------------
      // the lead into What the Record Shows: one fixed sentence in v1, so every
      // world in the corpus opened its closing act with the same eight words.
      record_lead: [
        { t: "the record closes with what the numbers say about {num:n_regions} regions", req: () => true },
        { t: "what follows is the arithmetic of {num:n_regions} regions, without commentary", req: () => true },
        { t: "{name:capital} closes the account with the figures", req: () => true },
        { t: "the last of it is what the {num:n_regions} regions add up to", req: () => true },
        { t: "the numbers for all {num:n_regions} regions are set out here, and they are not flattering", req: () => true },
        { t: "what {name:capital} can count, it counts here", req: () => true },
        { t: "this is the reckoning: {num:n_regions} regions, measured rather than described", req: () => true },
        { t: "the figures close the record, as {name:capital} requires", req: () => true },
        { t: "before the record closes, the arithmetic over {num:n_regions} regions", req: () => true },
        { t: "what the survey of {num:n_regions} regions supports, and nothing beyond it", req: () => true },
        { t: "what {num:n_regions} regions come to, in figures", req: () => true },
        { t: "the arithmetic of the {num:n_regions} regions closes the account", req: () => true },
        { t: "the last of this record is what can be counted across {num:n_regions} regions", req: () => true },
      ],

      preamble: [
        { t: "the world called \"{term:seed}\", written down at {name:capital} in the year {num:close_year}, during the reign of {name:reigning}", req: () => true },
        { t: "set down at {name:capital} in {num:close_year}, under {name:reigning}, concerning the world called \"{term:seed}\"", req: () => true },
        { t: "the record of the world called \"{term:seed}\", kept at {name:capital} and closed in {num:close_year} under {name:reigning}", req: () => true },
        { t: "compiled at {name:capital}, year {num:close_year}, in the reign of {name:reigning}, of the world called \"{term:seed}\"", req: () => true },
        { t: "of the world called \"{term:seed}\": this copy written at {name:capital}, {num:close_year}, {name:reigning} reigning", req: () => true },
        { t: "{name:capital} keeps this record of the world called \"{term:seed}\", closed in {num:close_year} while {name:reigning} reigned", req: () => true },
        { t: "closed at {name:capital} in {num:close_year}, {name:reigning} on the throne, of the world called \"{term:seed}\"", req: () => true },
        { t: "the world called \"{term:seed}\", as {name:capital} had it in {num:close_year}, {name:reigning} reigning", req: () => true },
        { t: "a fair copy made at {name:capital} in {num:close_year} under {name:reigning}, of the world called \"{term:seed}\"", req: () => true },
        { t: "concerning the world called \"{term:seed}\", closed {num:close_year} at {name:capital}, in the reign of {name:reigning}", req: () => true },
        { t: "{name:reigning} reigning, {num:close_year}, at {name:capital}: the record of the world called \"{term:seed}\"", req: () => true },
        { t: "this is what {name:capital} wrote down about the world called \"{term:seed}\", up to {num:close_year} and the reign of {name:reigning}", req: () => true },
      ],

      // ---- the founding ------------------------------------------------------
      realm: [
        { t: "this record covers a realm of {num:n_regions} settled regions, with its capital at {name:capital}", req: () => true },
        { t: "{num:n_regions} settled regions answer to {name:capital}, and this is their record", req: () => true },
        { t: "the realm is {num:n_regions} regions and one capital, {name:capital}", req: () => true },
        { t: "what follows concerns {num:n_regions} regions and the capital that counts them, {name:capital}", req: () => true },
        { t: "{name:capital} sits at the middle of {num:n_regions} settled regions", req: () => true },
        { t: "a realm of {num:n_regions} regions, kept from {name:capital}", req: () => true },
        { t: "the survey that opens this record counts {num:n_regions} regions and one capital at {name:capital}", req: () => true },
        { t: "{num:n_regions} regions were surveyed and {name:capital} was chosen to count them", req: () => true },
        { t: "this is the account of {num:n_regions} regions as {name:capital} keeps it", req: () => true },
        { t: "{num:n_regions} regions, one capital at {name:capital}, and this account of both", req: () => true },
        { t: "the realm in this record is {num:n_regions} regions answering to {name:capital}", req: () => true },
      ],
      realm_gloss: [
        { t: "the wind comes from the {term:compass}, and most of what follows was set by the ground itself: where the aetherstone lies, where the land will carry a road, and where it will not", req: () => true },
        { t: "the prevailing wind is {term:compass}, and the rest was decided by the rock: where the aetherstone lies, and where a road can be cut", req: () => true },
        { t: "the weather comes {term:compass} and the rest came from underneath: the ore, the gradient, and what a wagon can climb", req: () => true },
        { t: "with the wind out of the {term:compass}, almost everything here follows from where the aetherstone lies and where the ground will take a road", req: () => true },
        { t: "the {term:compass} wind and the shape of the rock between them account for most of this record before anyone in it made a choice", req: () => true },
        { t: "almost nothing that follows was chosen: the wind sets {term:compass}, the aetherstone lies where it lies, and the roads go where the ground permits", req: () => true },
        { t: "the ground decided most of this before anyone arrived, and the {term:compass} wind decided the rest", req: () => true },
        { t: "where the ore sits and where a wagon can climb explain more of the next {num:n_regions} pages than any decree does", req: () => true },
      ],
      sizes: [
        { t: "no one planned the towns' sizes: by year 1000 the largest held {num:pop_top} people to the median town's {num:pop_med}", req: () => true },
        { t: "the census at the founding runs from {num:pop_top} in the largest town down to {num:pop_med} in the median one, and nobody set that spread", req: () => true },
        { t: "at the founding the biggest town held {num:pop_top} and the middling one {num:pop_med}", req: () => true },
        { t: "the towns came out at {num:pop_top} for the largest and {num:pop_med} for the median, unplanned", req: () => true },
        { t: "{num:pop_top} people in the largest town against {num:pop_med} in the median: a spread nobody decreed", req: () => true },
        { t: "town sizes at the founding spread from {num:pop_med} at the middle to {num:pop_top} at the top", req: () => true },
        { t: "nobody sized the towns: the largest closed the founding at {num:pop_top} and the middling one at {num:pop_med}", req: () => true },
        { t: "the founding census puts {num:pop_top} at the top and {num:pop_med} at the middle, and no charter says why", req: () => true },
        { t: "from {num:pop_med} at the median to {num:pop_top} at the head, and not a line of it planned", req: () => true },
        { t: "the largest town closed the founding at {num:pop_top} against {num:pop_med} at the middle", req: () => true },
        { t: "at the founding the spread ran {num:pop_med} to {num:pop_top}, and nobody set it", req: () => true },
      ],
      sizes_gloss: [
        { t: "they grew that way over centuries across all {num:n_regions} regions: good land paid off, trade pulled people in, and the bigger a town got the faster it grew", req: () => true },
        { t: "centuries of it across {num:n_regions} regions: good land paid, trade drew, and growth went to whatever was already growing", req: () => true },
        { t: "the rule was simple and nobody wrote it down, that a town grows in proportion to what it already has, which is how {num:pop_top} and {num:pop_med} came to be that far apart", req: () => true },
        { t: "good ground and a road to somewhere did the work, compounding, so the lead at {num:pop_top} was built a little at a time", req: () => true },
        { t: "nothing decided it but arithmetic run for centuries over {num:n_regions} regions, where every town grew by a share of itself", req: () => true },
        { t: "what a town already had is what it got more of, which is how {num:pop_top} pulled that far clear", req: () => true },
        { t: "advantage compounds, and over {num:n_regions} regions it compounded into this spread", req: () => true },
        { t: "nobody was rewarded and nobody was punished: the arithmetic ran, and {num:pop_med} is where the middle of it landed", req: () => true },
      ],
      works: [
        { t: "the aetherworks at {term:works_list} refine aetherstone into lumen, and the trunk lines run from them to {name:capital}", req: c => c.hasWorks && c.worksOffCapital },
        { t: "aetherstone becomes lumen at {term:works_list}, and the trunk lines carry it to {name:capital}", req: c => c.hasWorks && c.worksOffCapital },
        { t: "{term:works_list} {term:works_verb} the aetherworks, and the wires run from them to {name:capital}", req: c => c.hasWorks && c.worksOffCapital },
        { t: "the refining is done at {term:works_list}, from which the trunk lines reach {name:capital}", req: c => c.hasWorks && c.worksOffCapital },
        { t: "at the founding the aetherworks stand at {term:works_list}, wired through to {name:capital}", req: c => c.hasWorks && c.worksOffCapital },
        { t: "not one of the {num:n_regions} regions held an aetherworks at the founding, which the ledgers of every neighbouring realm found remarkable", req: c => !c.hasWorks },
        { t: "the aetherworks are at {term:works_list}, and every trunk line in the realm runs from them to {name:capital}", req: c => c.hasWorks && c.worksOffCapital },
        { t: "what is dug up becomes lumen at {term:works_list} before it goes anywhere near {name:capital}", req: c => c.hasWorks && c.worksOffCapital },
        { t: "{term:works_list} {term:works_verb} the refining, and {name:capital} takes the wire from there", req: c => c.hasWorks && c.worksOffCapital },
        { t: "the {num:n_regions} regions had no aetherworks at all at the founding, which no neighbouring ledger could account for", req: c => !c.hasWorks },
        { t: "there was aetherstone in the ground of these {num:n_regions} regions and nothing built to refine it", req: c => !c.hasWorks },
        { t: "the aetherworks stand at {term:works_list}, which is also where the capital is, so nothing has to be carried anywhere", req: c => c.hasWorks && !c.worksOffCapital },
        { t: "the refining is done at {term:works_list} and consumed where it is made", req: c => c.hasWorks && !c.worksOffCapital },
        { t: "{term:works_list} {term:works_verb} the aetherworks and the whole of the grid that draws on them", req: c => c.hasWorks && !c.worksOffCapital },
      ],
      works_gloss: [
        { t: "the Temple holds sacred ground at {term:shrine_list}, out where the aetherstone lies and the capital's authority is weak", req: c => c.hasShrines },
        { t: "sacred ground is held at {term:shrine_list}, which is also where the ore is and where the writ runs thin", req: c => c.hasShrines },
        { t: "{term:shrine_list} are sanctioned ground, sited where the aetherstone lies and the capital cannot easily reach", req: c => c.hasShrines },
        { t: "{num:dark0} settlements started off the grid: reachable by road, but with no power line, because the ledgers said wiring them would not pay", req: c => c.dark0 > 0 },
        { t: "the wire skipped {num:dark0} settlements at the founding, on the grounds that they would not repay the copper", req: c => c.dark0 > 0 },
        { t: "every one of the {num:n_regions} settlements started on the grid, which the ledgers rarely allow and never for long", req: c => c.dark0 === 0 },
        { t: "the Temple's sanctioned ground stands at {term:shrine_list}, which is where the ore is and where the writ is thinnest", req: c => c.hasShrines },
        { t: "faith holds {term:shrine_list}, sited on the aetherstone and out of the capital's easy reach", req: c => c.hasShrines },
        { t: "{num:dark0} settlements began with a road and no wire, because the copper would not have repaid itself", req: c => c.dark0 > 0 },
        { t: "the founding left {num:dark0} settlements dark, on an arithmetic nobody in them was shown", req: c => c.dark0 > 0 },
        { t: "all {num:n_regions} regions began wired, which the ledgers permit only when somebody else is paying", req: c => c.dark0 === 0 },
      ],
      skyway: [
        { t: "there is also the {name:skyway} Lane: lift-barges running between {term:aerie_list}, over the walls and fords and gates below", req: c => c.hasSkyway },
        { t: "above all of it runs the {name:skyway} Lane, lift-barges between {term:aerie_list} that cross what the roads must go around", req: c => c.hasSkyway },
        { t: "the {name:skyway} Lane connects {term:aerie_list} by air, over every obstacle the ground puts in the way", req: c => c.hasSkyway },
        { t: "lift-barges work the {name:skyway} Lane between {term:aerie_list}", req: c => c.hasSkyway },
        { t: "no skyway was built over these {num:n_regions} regions at all, and the ledgers that refused it found no lane worth the lift", req: c => !c.hasSkyway },
        { t: "{name:capital} has no lane and no aerie to reach: nowhere in the realm was the cargo valuable enough or the ground hard enough to justify the stones", req: c => !c.hasSkyway },
        { t: "the {name:skyway} Lane runs above the roads between {term:aerie_list}, crossing what the ground makes wagons go around", req: c => c.hasSkyway },
        { t: "between {term:aerie_list} the {name:skyway} Lane carries what will pay the lift", req: c => c.hasSkyway },
        { t: "nothing flies over these {num:n_regions} regions, because no lane in them was worth the stones", req: c => !c.hasSkyway },
        { t: "the ledgers looked at all {num:n_regions} regions and found no route worth an aerie", req: c => !c.hasSkyway },
      ],
      skyway_gloss: [
        { t: "the {name:skyway} lanes go where the ground is hardest and the cargo most valuable, and you pay to board at the aerie: the road is open to everyone and the sky is not", req: c => c.hasSkyway },
        { t: "you pay at the aerie to board the {name:skyway}, so the sky belongs to whoever can afford the fare while the road belongs to everyone", req: c => c.hasSkyway },
        { t: "a {name:skyway} lane is cut where the walk is worst and the freight is richest, and the fare decides who gets the saving", req: c => c.hasSkyway },
        { t: "everything bound for {name:capital} therefore travels at the speed of the worst road on its route", req: c => !c.hasSkyway },
        { t: "so every crossing between these {num:n_regions} regions is made on the ground, at the ground's price", req: c => !c.hasSkyway },
        { t: "the {name:skyway} was cut where the walk is worst and the cargo richest, which is the same place twice", req: c => c.hasSkyway },
        { t: "a fare at the aerie buys what the {name:skyway} saves, and the saving was never going to be shared", req: c => c.hasSkyway },
        { t: "every load in these {num:n_regions} regions moves at the pace of the worst stretch of its road", req: c => !c.hasSkyway },
        { t: "{name:capital} is reached on the ground or not at all", req: c => !c.hasSkyway },
      ],
      ridges: [
        { t: "the {term:ridge_list} wall off the country, and the roads across go through {term:pass_list}", req: c => c.hasRidges && c.hasPasses },
        { t: "{term:ridge_list} divide the realm, crossed only at {term:pass_list}", req: c => c.hasRidges && c.hasPasses },
        { t: "the country is cut in two by {term:ridge_list}, and {term:pass_list} are the ways through", req: c => c.hasRidges && c.hasPasses },
        { t: "{term:ridge_list} stand across the realm and the roads must find {term:pass_list} to get over", req: c => c.hasRidges && c.hasPasses },
        { t: "the {term:ridge_list} close the country off, and no pass was ever cut through", req: c => c.hasRidges && !c.hasPasses },
        { t: "no wall of rock crosses the {num:n_regions} regions of this realm, which is rarer than the maps suggest and worth more than any charter", req: c => !c.hasRidges },
        { t: "{term:ridge_list} run across the country and {term:pass_list} are the only way over", req: c => c.hasRidges && c.hasPasses },
        { t: "the wall is {term:ridge_list}, and everything that crosses it crosses at {term:pass_list}", req: c => c.hasRidges && c.hasPasses },
        { t: "nothing crosses {term:ridge_list}, because nothing was ever cut through them", req: c => c.hasRidges && !c.hasPasses },
        { t: "{term:ridge_list} stand unbroken, and the country behind them is behind them for good", req: c => c.hasRidges && !c.hasPasses },
        { t: "no rock divides these {num:n_regions} regions from each other, which the maps make look ordinary and is not", req: c => !c.hasRidges },
        { t: "nothing walls off any part of the {num:n_regions} regions, and that is worth more than any charter granted here", req: c => !c.hasRidges },
      ],
      ridges_gloss: [
        { t: "{num:shadow_n} regions sit in the mountains' shadow, cut off from {name:capital} by the wall, and it costs them", req: c => c.shadowN > 0 },
        { t: "the wall puts {num:shadow_n} regions behind it, further from {name:capital} than the map alone would say", req: c => c.shadowN > 0 },
        { t: "being one of the {num:shadow_n} regions behind it is not a thing any of them chose", req: c => c.shadowN > 0 },
        { t: "as it happened no region ended up cut off from {name:capital} by the wall, which was luck and not fairness", req: c => c.hasRidges && c.shadowN === 0 },
        { t: "every region here reaches {name:capital} without crossing rock, and no one arranged that", req: c => !c.hasRidges },
        { t: "{num:shadow_n} regions are on the far side of it, further from {name:capital} in cost than in distance", req: c => c.shadowN > 0 },
        { t: "the wall does not care who is behind it, and {num:shadow_n} regions are", req: c => c.shadowN > 0 },
        { t: "the ridges fell where nobody lived behind them, so all {num:n_regions} regions reach {name:capital} anyway", req: c => c.hasRidges && c.shadowN === 0 },
        { t: "all {num:n_regions} regions reach the capital on the flat, which nobody arranged and everybody benefits from", req: c => !c.hasRidges },
      ],
      river: [
        { t: "the {name:river} runs down from the high ground by {name:river_head} through {num:river_len} regions to the border", req: c => c.hasRiver },
        { t: "from the high ground at {name:river_head} the {name:river} falls through {num:river_len} regions and out of the realm", req: c => c.hasRiver },
        { t: "{num:river_len} regions share the {name:river}, which rises by {name:river_head}", req: c => c.hasRiver },
        { t: "the {name:river} gathers at {name:river_head} and crosses {num:river_len} regions before it leaves", req: c => c.hasRiver },
        { t: "the {name:river} falls from {name:river_head} and crosses {num:river_len} regions on its way out", req: c => c.hasRiver },
        { t: "{num:river_len} regions take their water from the {name:river}, which starts above {name:river_head}", req: c => c.hasRiver },
        { t: "the {name:river} is one river and {num:river_len} claims on it, from {name:river_head} down", req: c => c.hasRiver },
        { t: "water leaves the high ground at {name:river_head} and does not stop until it has passed {num:river_len} regions", req: c => c.hasRiver },
      ],
      river_gloss: [
        { t: "the towns drink from it in order, so {name:river_head} gets it clean and {name:river_mouth} at the mouth gets whatever every town and aetherworks above has put in it", req: c => c.hasRiver },
        { t: "the order is fixed by gradient: clean at {name:river_head}, and at {name:river_mouth} whatever the {num:river_len} regions upstream have finished with", req: c => c.hasRiver },
        { t: "{name:river_mouth} is last on it, which nobody at {name:river_mouth} chose and nobody upstream had to think about", req: c => c.hasRiver },
        { t: "being upstream of {name:river_mouth} is worth more than any charter, and cost nothing to acquire", req: c => c.hasRiver },
        { t: "gradient decides the order, and the order puts {name:river_mouth} last", req: c => c.hasRiver },
        { t: "what {num:river_len} regions put into it, {name:river_mouth} takes out of it", req: c => c.hasRiver },
        { t: "no charter allocated the {name:river}, and the allocation is the steepest thing in this record", req: c => c.hasRiver },
        { t: "nobody at {name:river_head} has ever had to think about {name:river_mouth}, and that is the arrangement", req: c => c.hasRiver },
      ],
      sea: [
        { t: "the sea lies to the {term:sea_sides}, and the charts call it {term:chart_names}", req: c => c.hasSea && c.hasCharts },
        { t: "to the {term:sea_sides} is open water, {term:chart_names} on the charts", req: c => c.hasSea && c.hasCharts },
        { t: "the realm meets the sea on the {term:sea_sides}", req: c => c.hasSea && !c.hasCharts },
        { t: "open water lies {term:sea_sides} of the realm", req: c => c.hasSea && !c.hasCharts },
        { t: "not one of the {num:n_regions} regions touches the sea, and everything the realm sells must go out overland", req: c => !c.hasSea },
        { t: "open water lies to the {term:sea_sides}, and it is drawn as {term:chart_names}", req: c => c.hasSea && c.hasCharts },
        { t: "the charts put {term:chart_names} off the {term:sea_sides} coast", req: c => c.hasSea && c.hasCharts },
        { t: "the {term:sea_sides} edge of the realm is water", req: c => c.hasSea && !c.hasCharts },
        { t: "the realm runs out at the water on the {term:sea_sides}", req: c => c.hasSea && !c.hasCharts },
        { t: "the {num:n_regions} regions are landlocked entire, and everything they sell goes out by road", req: c => !c.hasSea },
        { t: "there is no coast anywhere in these {num:n_regions} regions, so every gate is a gate on land", req: c => !c.hasSea },
      ],
      sea_gloss: [
        { t: "the realm's {term:port_is} {term:port_list}: everything the mines raise and the aetherworks refine leaves through them, and whoever holds the quay collects the tariff", req: c => c.hasPorts },
        { t: "{term:port_list} {term:port_verb} the whole outward trade, and the tariff belongs to whoever holds the quay", req: c => c.hasPorts },
        { t: "how far a town sits from the water was luck, decided at the founding like everything else, and {term:port_list} won it", req: c => c.hasPorts },
        { t: "the quays are sealed by decree, so {name:capital} trades with no one across the water and no one lands: the cost of that safety falls on every coast that could have been a gate", req: c => c.hasSea && !c.hasPorts && c.hbSealed },
        { t: "no harbour was built at the founding and the {term:sea_sides} coast waits, which is its own kind of decision", req: c => c.hasSea && !c.hasPorts && !c.hbSealed },
        { t: "sailors keep well clear of the {name:maelstrom}, where the sea turns on itself, and no quay was ever built within its reach", req: c => c.hasMaelstrom },
        { t: "{term:port_list} {term:port_verb} everything that leaves, and the quay collects before the road does", req: c => c.hasPorts },
        { t: "the outward trade of the realm goes through {term:port_list} and pays there", req: c => c.hasPorts },
        { t: "{term:port_list} won the founding lottery, and the winning ticket was a shoreline", req: c => c.hasPorts },
        { t: "with the quays shut by decree nothing leaves {name:capital} by water and nothing arrives, and every coast that could have been a gate pays for that", req: c => c.hasSea && !c.hasPorts && c.hbSealed },
        { t: "the {term:sea_sides} coast has no harbour on it, which was decided by not deciding", req: c => c.hasSea && !c.hasPorts && !c.hbSealed },
        { t: "the {name:maelstrom} keeps its own water, and no quay was built inside its reach", req: c => c.hasMaelstrom },
      ],
      ruins: [
        { t: "the old world is still here: {term:ruin_list}", req: c => c.hasRuins },
        { t: "what came before has not gone: {term:ruin_list}", req: c => c.hasRuins },
        { t: "the realm is built over an older one, and {term:ruin_list}", req: c => c.hasRuins },
        { t: "{term:ruin_list}, and the maps mark them because nothing else will", req: c => c.hasRuins },
        { t: "nothing older than the founding stands in any of the {num:n_regions} regions, which means either that nothing was here or that nothing survived", req: c => !c.hasRuins },
        { t: "an older world is underneath this one: {term:ruin_list}", req: c => c.hasRuins },
        { t: "the survey found what was here before: {term:ruin_list}", req: c => c.hasRuins },
        { t: "{term:ruin_list}, and none of it is on any charter", req: c => c.hasRuins },
        { t: "across all {num:n_regions} regions nothing stands that predates the founding, which is either an empty country or a thorough one", req: c => !c.hasRuins },
        { t: "the {num:n_regions} regions hold no ruin, no tomb and no delve, and the record does not say which of the two reasons applies", req: c => !c.hasRuins },
      ],
      ruins_gloss: [
        { t: "delvers work the {name:delver_town} road every season because it pays when nothing else does, not all of them come back, and what they carry out is sold off the books", req: c => c.hasRuins },
        { t: "the {name:delver_town} road carries delvers every season, and the trade in what they bring up is not written down anywhere", req: c => c.hasRuins },
        { t: "there is a living on the {name:delver_town} road for whoever will take the risk, and the ledgers never see a coin of it", req: c => c.hasRuins },
        { t: "so the oldest thing on the {name:capital} maps is the survey that made them", req: c => !c.hasRuins },
        { t: "the {name:delver_town} road fills every season with people the ledgers will never count, carrying out what the ledgers will never see", req: c => c.hasRuins },
        { t: "delving pays at {name:delver_town} when nothing else does, and it is priced accordingly", req: c => c.hasRuins },
        { t: "what comes up the {name:delver_town} road is sold before anyone official hears of it", req: c => c.hasRuins },
        { t: "the survey that made the {name:capital} maps is the oldest thing on them", req: c => !c.hasRuins },
      ],
      freeport: [
        { t: "past the last boundary stone, by {name:freeport_town}, the lawless keep their own harbour: {name:freeport}", req: c => c.hasFreeport },
        { t: "beyond the boundary stones at {name:freeport_town} lies {name:freeport}, which belongs to nobody", req: c => c.hasFreeport },
        { t: "{name:freeport} sits past the last stone by {name:freeport_town}, on no charter and no map the capital keeps", req: c => c.hasFreeport },
        { t: "the realm's edge at {name:freeport_town} is where {name:freeport} was allowed to happen", req: c => c.hasFreeport },
        { t: "{name:freeport} keeps the water past the last stone by {name:freeport_town}, on nobody's charter", req: c => c.hasFreeport },
        { t: "out past {name:freeport_town} the boundary stops and {name:freeport} begins", req: c => c.hasFreeport },
        { t: "there is a harbour at {name:freeport} that {name:capital} does not admit exists", req: c => c.hasFreeport },
        { t: "{name:freeport}, beyond {name:freeport_town}, answers to no charter in the realm", req: c => c.hasFreeport },
      ],
      freeport_gloss: [
        { t: "no charter lists {name:freeport}, no gate taxes it, and assessors who visit do not come back a second time", req: c => c.hasFreeport },
        { t: "anything the realm will not carry on its books leaves through {name:freeport}, and the ground around it keeps what the gates would have taken", req: c => c.hasFreeport },
        { t: "with the quays sealed by decree, {name:freeport} is the only working gate left in the realm", req: c => c.hasFreeport && c.hbSealed },
        { t: "{name:freeport} exists because the realm's own rules made it profitable, which is the only reason anything exists here", req: c => c.hasFreeport },
        { t: "nothing is taxed at {name:freeport} and nothing is recorded, which are the same service sold twice", req: c => c.hasFreeport },
        { t: "the ground around {name:freeport} keeps what the gates would have taken from it", req: c => c.hasFreeport },
        { t: "{name:freeport} is not a failure of the realm's rules, it is what the rules pay for", req: c => c.hasFreeport },
        { t: "assessors have gone to {name:freeport} and the register does not show them going twice", req: c => c.hasFreeport },
      ],
      sanctuary: [
        { t: "high above the roads, by {name:sanctuary_town}, stands {name:sanctuary}, holy ground the Temple never sanctioned and cannot forgive", req: c => c.hasSanctuary },
        { t: "{name:sanctuary} keeps the high ground by {name:sanctuary_town}, unsanctioned and unforgiven", req: c => c.hasSanctuary },
        { t: "above {name:sanctuary_town} is {name:sanctuary}, which the Temple did not consecrate and cannot suppress", req: c => c.hasSanctuary },
        { t: "there is holy ground at {name:sanctuary} above {name:sanctuary_town} that no authority in this realm authorised", req: c => c.hasSanctuary },
        { t: "{name:sanctuary} stands above {name:sanctuary_town} on ground no authority granted", req: c => c.hasSanctuary },
        { t: "high over {name:sanctuary_town} there is holy ground at {name:sanctuary} that the Temple did not make holy", req: c => c.hasSanctuary },
        { t: "the climb above {name:sanctuary_town} ends at {name:sanctuary}, which was sanctioned by nobody", req: c => c.hasSanctuary },
        { t: "{name:sanctuary} keeps the height over {name:sanctuary_town}, unlicensed and unmoved", req: c => c.hasSanctuary },
      ],
      sanctuary_gloss: [
        { t: "{name:sanctuary} heals anyone who climbs to it and asks nothing, the census never climbs that far, and the people it shelters go uncounted", req: c => c.hasSanctuary },
        { t: "the healing at {name:sanctuary} is free and the climb is the price, and nobody who takes it appears in any register", req: c => c.hasSanctuary },
        { t: "pilgrims walk to {name:sanctuary} alongside the official roads, which the Temple is reminded of every festival", req: c => c.hasSanctuary },
        { t: "what {name:sanctuary} offers is exactly what the realm's own institutions charge for, which is the whole of the offence", req: c => c.hasSanctuary },
        { t: "the price at {name:sanctuary} is the walk, and no register records who paid it", req: c => c.hasSanctuary },
        { t: "nobody healed at {name:sanctuary} appears in any count the realm keeps", req: c => c.hasSanctuary },
        { t: "the Temple's objection to {name:sanctuary} is not that it fails but that it does not charge", req: c => c.hasSanctuary },
        { t: "the road to {name:sanctuary} carries more people every festival than the Temple would like recorded", req: c => c.hasSanctuary },
      ],
      still: [
        { t: "over {term:still_list} lies {name:stillname}: ground where the lift-stones simply stop working", req: c => c.hasStill },
        { t: "{name:stillname} covers {term:still_list}, and no lift-stone will hold there", req: c => c.hasStill },
        { t: "the air over {term:still_list} is dead to the stones, and the charts name it {name:stillname}", req: c => c.hasStill },
        { t: "{name:stillname} lies over {term:still_list}, where the lift-stones will not hold", req: c => c.hasStill },
        { t: "there is dead air over {term:still_list}, and the charts call it {name:stillname}", req: c => c.hasStill },
        { t: "{term:still_list} lie under {name:stillname}, and nothing rises there", req: c => c.hasStill },
        { t: "the stones stop working over {term:still_list}, which the charts mark as {name:stillname}", req: c => c.hasStill },
        { t: "no lift will hold anywhere in {name:stillname}, and {term:still_list} are inside it", req: c => c.hasStill },
      ],
      still_gloss: [
        { t: "no aerie can be built in {name:stillname} and no lane can land: everywhere else the sky costs money, and there it is not for sale at any price", req: c => c.hasStill },
        { t: "over the {num:still_n} regions in the still the sky is refused rather than priced, which is the one place in the realm where money is not the answer", req: c => (c.hasStill) && c.still_n > 1 },
        { t: "{name:capital} itself sits in the still, so no skyway flies in this realm at all", req: c => c.capitalInStill },
        { t: "nothing can be built in {name:stillname} at any price, which makes it unique in this record", req: c => c.hasStill },
        { t: "the {num:still_n} regions under it are the only ground in the realm money cannot buy its way over", req: c => (c.hasStill) && c.still_n > 1 },
        { t: "elsewhere the sky is expensive; over those {num:still_n} regions it is simply absent", req: c => (c.hasStill) && c.still_n > 1 },
        { t: "{name:stillname} refuses the lift rather than pricing it, which nothing else here does", req: c => c.hasStill },
        { t: "no lane can reach {name:capital}, because {name:capital} is inside the still", req: c => c.capitalInStill },
        { t: "the one region under {name:stillname} is the only ground in the realm money cannot buy its way over", req: c => c.hasStill && c.still_n === 1 },
        { t: "elsewhere across {num:n_regions} regions the sky is expensive, and over that one it is simply absent", req: c => c.hasStill && c.still_n === 1 },
      ],
      camps: [
        { t: "where the beasts are worth a bounty and the constabularies never come, hunters keep {term:camp_list}", req: c => c.hasCamps },
        { t: "{term:camp_list} are kept by hunters, out past where any constabulary rides", req: c => c.hasCamps },
        { t: "the bounty country holds {term:camp_list}, unpoliced and unbothered", req: c => c.hasCamps },
        { t: "hunters hold {term:camp_list}, out past the last constabulary", req: c => c.hasCamps },
        { t: "{term:camp_list} stand where the bounty is worth more than the risk", req: c => c.hasCamps },
        { t: "the bounty country keeps {term:camp_list} and keeps no records", req: c => c.hasCamps },
        { t: "out past the writ there are stands at {term:camp_list}", req: c => c.hasCamps },
        { t: "{term:camp_list} were built by the people who use them and licensed by nobody", req: c => c.hasCamps },
      ],
      camps_gloss: [
        { t: "the stands thin the predation on that ground, the trophies are fenced where nothing is taxed, and for the poorest of the realm's {num:n_regions} regions the bounty is the one rung of a ladder nobody built", req: c => c.hasCamps },
        { t: "the work at all {num:camp_n} stands is dangerous, untaxed, and for some of the people who do it the only ladder on offer", req: c => (c.hasCamps) && c.camp_n > 1 },
        { t: "the ground around the {num:camp_n} stands is safer for it and the coin they make is invisible, both of which suit everyone involved", req: c => (c.hasCamps) && c.camp_n > 1 },
        { t: "those {num:camp_n} stands thin what preys on that country, and nothing they earn is entered anywhere", req: c => (c.hasCamps) && c.camp_n > 1 },
        { t: "a bounty is the one wage in these {num:n_regions} regions that asks for no charter", req: c => c.hasCamps },
        { t: "for the poorest the {num:camp_n} stands are the only ladder anyone put up", req: c => (c.hasCamps) && c.camp_n > 1 },
        { t: "dangerous, untaxed and open to anyone, which is why those {num:camp_n} stands exist at all", req: c => (c.hasCamps) && c.camp_n > 1 },
        { t: "those {num:camp_n} stands are outside the writ, the tariff and the register alike", req: c => (c.hasCamps) && c.camp_n > 1 },
        { t: "the one stand thins what preys on the ground around it, and nothing it earns is entered at {name:capital}", req: c => c.hasCamps && c.camp_n === 1 },
        { t: "it is dangerous, untaxed and open to anyone, which is why the realm's {num:n_regions} regions have exactly one", req: c => c.hasCamps && c.camp_n === 1 },
        { t: "for the poorest of the {num:n_regions} regions that single stand is the only ladder anyone put up", req: c => c.hasCamps && c.camp_n === 1 },
        { t: "nothing the one stand earns reaches a register in {name:capital}", req: c => c.hasCamps && c.camp_n === 1 },
      ],
      towers: [
        { t: "{term:tower_holder} {term:tower_list}, out where the constabulary line fails and the grid never came", req: c => c.hasTowers },
        { t: "beyond the wire and the constabulary, {term:tower_holder} {term:tower_list}", req: c => c.hasTowers },
        { t: "{term:tower_list} stand where neither the grid nor the law arrived, and {term:tower_holder} them", req: c => c.hasTowers },
        { t: "{term:tower_holder} {term:tower_list}, past the last wire and the last constabulary", req: c => c.hasTowers },
        { t: "out where nothing official arrives, {term:tower_holder} {term:tower_list}", req: c => c.hasTowers },
        { t: "{term:tower_list} were raised where the grid stopped, and {term:tower_holder} them still", req: c => c.hasTowers },
        { t: "there are towers at {term:tower_list} that no charter permits and no writ reaches", req: c => c.hasTowers },
        { t: "{term:tower_holder} {term:tower_list} in the dark country, unlicensed", req: c => c.hasTowers },
      ],
      towers_gloss: [
        { t: "they sell in the darkness what the grid across {num:n_regions} regions will not carry, and the Temple calls it heresy, the magnates call it competition, and the people it heals call it the only healer who ever came", req: c => c.hasTowers },
        { t: "what those {num:tower_n} towers offer is what the wire refuses to deliver, which is why three different authorities have three different words for it", req: c => (c.hasTowers) && c.tower_n > 1 },
        { t: "all {num:tower_n} towers are heresy to the Temple, competition to the magnates, and to the people they treat simply the only ones who came", req: c => (c.hasTowers) && c.tower_n > 1 },
        { t: "what those {num:tower_n} towers sell is what the wire never brought, at a price the wire never quoted", req: c => (c.hasTowers) && c.tower_n > 1 },
        { t: "three authorities have three words for those {num:tower_n} towers, and the people they treat have a fourth", req: c => (c.hasTowers) && c.tower_n > 1 },
        { t: "the grid across {num:n_regions} regions decided not to come, and something came instead", req: c => c.hasTowers },
        { t: "nothing about those {num:tower_n} towers is legal, and nothing else was offered", req: c => (c.hasTowers) && c.tower_n > 1 },
        { t: "those {num:tower_n} towers are illegal and the wire's absence across {num:n_regions} regions is not", req: c => (c.hasTowers) && c.tower_n > 1 },
        { t: "the one of them sells in the darkness what the grid across {num:n_regions} regions will not carry", req: c => c.hasTowers && c.tower_n === 1 },
        { t: "what the single tower offers is what the wire refuses to deliver to any of the {num:n_regions} regions", req: c => c.hasTowers && c.tower_n === 1 },
        { t: "one tower stands against the whole of {name:capital}'s writ, and the writ has not reached it", req: c => c.hasTowers && c.tower_n === 1 },
        { t: "there is exactly one in {num:n_regions} regions, and the Temple calls it heresy anyway", req: c => c.hasTowers && c.tower_n === 1 },
      ],
      bridges: [
        { t: "the rivers are crossed at {term:bridge_list}", req: c => c.hasBridges },
        { t: "{term:bridge_list} carry every crossing in the realm", req: c => c.hasBridges },
        { t: "there are spans at {term:bridge_list} and nowhere else", req: c => c.hasBridges },
        { t: "every river in the realm is crossed at {term:bridge_list} and nowhere else", req: c => c.hasBridges },
        { t: "{term:bridge_list} are the spans, and the rest is water", req: c => c.hasBridges },
        { t: "the water is bridged at {term:bridge_list}", req: c => c.hasBridges },
        { t: "the realm's crossings are {term:bridge_list}", req: c => c.hasBridges },
        { t: "there are {num:bridge_n} spans in the realm, at {term:bridge_list}", req: c => (c.hasBridges) && c.bridge_n > 1 },
        { t: "the realm has one span, at {term:bridge_list}, and no other crossing", req: c => c.hasBridges && c.bridge_n === 1 },
        { t: "{term:bridge_list} is the only bridge in {num:n_regions} regions", req: c => c.hasBridges && c.bridge_n === 1 },
      ],
      bridges_gloss: [
        { t: "everywhere but at those {num:bridge_n} crossings the banks are marsh and the water must be forded, and the fords are where the wagons drown", req: c => (c.hasBridges) && c.bridge_n > 1 },
        { t: "whoever holds one of the {num:bridge_n} spans holds a queue of people who cannot go around", req: c => (c.hasBridges) && c.bridge_n > 1 },
        { t: "the alternative to all {num:bridge_n} spans is a ford, and the fords are counted in wagons rather than in tariffs", req: c => (c.hasBridges) && c.bridge_n > 1 },
        { t: "a span is a queue that cannot go around, and there are {num:bridge_n} queues", req: c => (c.hasBridges) && c.bridge_n > 1 },
        { t: "those {num:bridge_n} spans are worth holding for exactly that reason", req: c => (c.hasBridges) && c.bridge_n > 1 },
        { t: "the fords are free and the fords drown wagons, which is what makes those {num:bridge_n} spans valuable", req: c => (c.hasBridges) && c.bridge_n > 1 },
        { t: "whoever came to hold one of the {num:bridge_n} spans did not have to build it", req: c => (c.hasBridges) && c.bridge_n > 1 },
        { t: "the {num:bridge_n} spans were built by the realm and are held by whoever got there first", req: c => (c.hasBridges) && c.bridge_n > 1 },
        { t: "the one span is worth holding for exactly that reason, and there is no second in {num:n_regions} regions", req: c => c.hasBridges && c.bridge_n === 1 },
        { t: "the alternative to the single span is a ford, and across {num:n_regions} regions the fords are counted in wagons rather than in tariffs", req: c => c.hasBridges && c.bridge_n === 1 },
        { t: "whoever came to hold the only span in {num:n_regions} regions did not have to build it", req: c => c.hasBridges && c.bridge_n === 1 },
        { t: "one crossing serves {num:n_regions} regions, and everywhere else the water must be forded", req: c => c.hasBridges && c.bridge_n === 1 },
      ],
      // ---- the years ---------------------------------------------------------
      ages: [
        { t: "these years split into ages, each named for what the realm was living through: {term:age_list}", req: c => c.hasAges },
        { t: "the run divides into {num:n_ages} ages, named from the record itself: {term:age_list}", req: c => (c.hasAges) && c.n_ages > 1 },
        { t: "the years fall into periods rather than a single stretch: {term:age_list}", req: c => c.hasAges },
        { t: "cut where the record turns, the years give {term:age_list}", req: c => c.hasAges },
        { t: "{num:n_ages} ages carry the years between them: {term:age_list}", req: c => (c.hasAges) && c.n_ages > 1 },
        { t: "the record does not run flat: it falls into {num:n_ages} ages, {term:age_list}", req: c => (c.hasAges) && c.n_ages > 1 },
        { t: "read at a distance the years are {term:age_list}", req: c => c.hasAges },
        { t: "{term:age_list}: {num:n_ages} periods the record cuts itself into", req: c => (c.hasAges) && c.n_ages > 1 },
        { t: "the whole run reads as one age: {term:age_list}", req: c => c.hasAges && c.n_ages === 1 },
        { t: "the years do not divide: {term:age_list}, start to close", req: c => c.hasAges && c.n_ages === 1 },
      ],
      ages_gloss: [
        { t: "no one decreed the {num:n_ages} names, and they come from the record itself: where the wealth piled up, where the gates charged tariffs, and where the towns emptied out or came back", req: c => (c.hasAges) && c.n_ages > 1 },
        { t: "the {num:n_ages} names were not granted by anybody; they are what the wealth, the tariffs and the emptied towns add up to", req: c => (c.hasAges) && c.n_ages > 1 },
        { t: "nothing named those {num:n_ages} periods but the shape of the record: the pile-ups, the levies, and the towns that went dark", req: c => (c.hasAges) && c.n_ages > 1 },
        { t: "they are cut where the wealth turned, which is the only boundary the {num:n_ages} ages actually have", req: c => (c.hasAges) && c.n_ages > 1 },
        { t: "the {num:n_ages} boundaries are where the wealth turned, and nothing else marks them", req: c => (c.hasAges) && c.n_ages > 1 },
        { t: "nobody in the {num:n_regions} regions was told they were living in any of them", req: c => c.hasAges },
        { t: "the names are descriptions, not decrees, and all {num:n_ages} were derived after the fact", req: c => (c.hasAges) && c.n_ages > 1 },
        { t: "what separates one from the next is a change in the ledgers of {name:capital} and nothing more ceremonial than that", req: c => c.hasAges },
        { t: "the single age is less a period than the absence of one, across {num:n_regions} regions", req: c => c.hasAges && c.n_ages === 1 },
        { t: "one age covers the whole run over {num:n_regions} regions, which is what a record with no turns in it looks like", req: c => c.hasAges && c.n_ages === 1 },
        { t: "nobody decreed the name, and there was only ever one shape for {num:n_regions} regions to be in", req: c => c.hasAges && c.n_ages === 1 },
      ],
      quiet: [
        { t: "no upheavals are recorded across the {num:n_epochs} epochs, and the years passed as the founding had set them up", req: c => c.noEvents },
        { t: "the record marks nothing across {num:n_epochs} epochs: no rising, no reform, no calamity", req: c => c.noEvents },
        { t: "{num:n_epochs} epochs ran without a single upheaval worth the ink", req: c => c.noEvents },
        { t: "nothing interrupted the {num:n_epochs} epochs, which is not the same as nothing happening", req: c => c.noEvents },
        { t: "across {num:n_epochs} epochs the record has nothing to enter", req: c => c.noEvents },
        { t: "the {num:n_epochs} epochs produced no event the clerks thought worth a page", req: c => c.noEvents },
        { t: "no year in the {num:n_epochs} epochs earned a heading", req: c => c.noEvents },
        { t: "the founding arrangement ran {num:n_epochs} epochs without being interrupted", req: c => c.noEvents },
      ],
      quiet_gloss: [
        { t: "that does not mean the {num:n_epochs} epochs passed kindly: the grid crawled toward the money, the ore drew down, and the poison settled where it always settles", req: c => c.noEvents },
        { t: "the loops ran unopposed for {num:n_epochs} epochs, which is its own kind of history", req: c => c.noEvents },
        { t: "the grid still crawled toward the money over {num:n_regions} regions and the ore still drew down, without anyone recording a year for it", req: c => c.noEvents },
        { t: "an empty page is not a kind one, and over {num:n_regions} regions the loops ran without a single check on them", req: c => c.noEvents },
        { t: "nothing was recorded because nothing resisted, which across {num:n_epochs} epochs is the harshest entry available", req: c => c.noEvents },
        { t: "the ore drew down and the poison settled where it settles, and no clerk in {name:capital} was required to write it down", req: c => c.noEvents },
        { t: "what happened over {num:n_epochs} epochs happened slowly, which is the one way to happen unrecorded", req: c => c.noEvents },
        { t: "over {num:n_epochs} epochs nothing pushed back, which is the entry", req: c => c.noEvents },
      ],
      bynames: [
        { t: "the years leave names behind them, and the realm now speaks of {term:byname_list}", req: c => c.hasBynames },
        { t: "the realm has learned to call places by what happened to them: {term:byname_list}", req: c => c.hasBynames },
        { t: "{term:byname_list} are what the years left on the map", req: c => c.hasBynames },
        { t: "bynames settled on the places the years used hardest: {term:byname_list}", req: c => c.hasBynames },
        { t: "{num:byname_n} places now answer to what happened to them: {term:byname_list}", req: c => (c.hasBynames) && c.byname_n > 1 },
        { t: "the map carries {term:byname_list}, which no survey put there", req: c => c.hasBynames },
        { t: "the years wrote on the map, and what they wrote is {term:byname_list}", req: c => c.hasBynames },
        { t: "people renamed the places the years used hardest, and the names stuck: {term:byname_list}", req: c => c.hasBynames },
        { t: "one place now answers to what happened to it: {term:byname_list}", req: c => c.hasBynames && c.byname_n === 1 },
        { t: "the years left one name on the map of {num:n_regions} regions: {term:byname_list}", req: c => c.hasBynames && c.byname_n === 1 },
      ],
      bynames_gloss: [
        { t: "those {num:byname_n} bynames were granted by no charter and can be lifted by no decree, which makes them the plainest record in this document", req: c => (c.hasBynames) && c.byname_n > 1 },
        { t: "the people kept all {num:byname_n} names on their own, without permission and without a register", req: c => (c.hasBynames) && c.byname_n > 1 },
        { t: "nobody issued those {num:byname_n} names, which is exactly why they are the part of this record that can be trusted", req: c => (c.hasBynames) && c.byname_n > 1 },
        { t: "those {num:byname_n} names are the only entries here that nobody in authority approved", req: c => (c.hasBynames) && c.byname_n > 1 },
        { t: "names given from below survive better than names given from above, and {num:byname_n} of these did", req: c => (c.hasBynames) && c.byname_n > 1 },
        { t: "nothing in {name:capital} authorised those {num:byname_n} names and nothing in {name:capital} can withdraw them", req: c => (c.hasBynames) && c.byname_n > 1 },
        { t: "what those {num:byname_n} names record is what people decided a place had become", req: c => (c.hasBynames) && c.byname_n > 1 },
        { t: "{num:byname_n} names given from below, and every one of them still in use", req: c => (c.hasBynames) && c.byname_n > 1 },
        { t: "the one byname was granted by no charter and can be lifted by no decree, which makes it the plainest entry in this record of {num:n_regions} regions", req: c => c.hasBynames && c.byname_n === 1 },
        { t: "nothing in {name:capital} authorised it and nothing in {name:capital} can withdraw it", req: c => c.hasBynames && c.byname_n === 1 },
        { t: "one name out of {num:n_regions} regions, and it was given from below", req: c => c.hasBynames && c.byname_n === 1 },
      ],
      // ---- the state of the realm --------------------------------------------
      fates: [
        { t: "of the realm's {num:settled_n} settled regions, {term:fate_parts}", req: c => c.hasFates },
        { t: "the {num:settled_n} settled regions came out of the years as follows: {term:fate_parts}", req: c => c.hasFates },
        { t: "counted at the close, the {num:settled_n} settled regions divide: {term:fate_parts}", req: c => c.hasFates },
        { t: "{term:fate_parts}, out of {num:settled_n} settled regions", req: c => c.hasFates },
        { t: "the ledger of fates over {num:settled_n} regions reads {term:fate_parts}", req: c => c.hasFates },
        { t: "by the last epoch, of {num:settled_n} settled regions, {term:fate_parts}", req: c => c.hasFates },
        { t: "at the close the {num:settled_n} settled regions stand thus: {term:fate_parts}", req: c => c.hasFates },
        { t: "the years sorted {num:settled_n} settled regions into {term:fate_parts}", req: c => c.hasFates },
      ],
      deadholds: [
        { t: "{num:dead_n} {term:dead_stand} empty now, the deadholds, places where a town once stood and no longer does", req: c => c.deadN > 0 },
        { t: "the years emptied {num:dead_n} {term:dead_holdings} outright, and the maps still name {term:dead_list}", req: c => c.deadN > 0 },
        { t: "{term:dead_list} are deadholds now: {num:dead_n} {term:dead_stand} where towns used to", req: c => c.deadN > 0 },
        { t: "of the ground that was settled at the founding, {num:dead_n} {term:dead_stand} empty at the close", req: c => c.deadN > 0 },
        { t: "not one of the {num:settled_n} settlements was abandoned across the whole run, which is rarer than the record makes it look", req: c => c.deadN === 0 && c.hasFates },
        { t: "{num:dead_n} {term:dead_stand} where a town was and is not", req: c => c.deadN > 0 },
        { t: "the record closes with {num:dead_n} {term:dead_holdings} abandoned outright", req: c => c.deadN > 0 },
        { t: "what the years emptied comes to {num:dead_n} {term:dead_holdings}", req: c => c.deadN > 0 },
        { t: "every one of the {num:settled_n} settlements founded here is still standing, which the record makes look ordinary and is not", req: c => c.deadN === 0 && c.hasFates },
      ],
      deadholds_gloss: [
        { t: "the maps still name all {num:dead_n} deadholds, but the roads have stopped going there", req: c => (c.deadN > 0) && c.dead_n > 1 },
        { t: "those {num:dead_n} deadholds keep their names on the charts and nothing else", req: c => (c.deadN > 0) && c.dead_n > 1 },
        { t: "nobody struck those {num:dead_n} deadholds from the survey, and the traffic simply stopped", req: c => (c.deadN > 0) && c.dead_n > 1 },
        { t: "every one of the {num:settled_n} regions that was settled at the founding is settled still", req: c => c.deadN === 0 && c.hasFates },
        { t: "the roads to those {num:dead_n} deadholds were never closed, they were simply stopped being taken", req: c => (c.deadN > 0) && c.dead_n > 1 },
        { t: "a deadhold keeps its name because striking it costs a clerk more than leaving it, and {num:dead_n} of them were left", req: c => (c.deadN > 0) && c.dead_n > 1 },
        { t: "all {num:settled_n} founded regions ended the record settled, which is not the usual shape", req: c => c.deadN === 0 && c.hasFates },
        { t: "those {num:dead_n} deadholds were not closed, they were left", req: c => (c.deadN > 0) && c.dead_n > 1 },
        { t: "the maps still name it, and the roads out of {name:capital} have stopped going there", req: c => c.deadN === 1 },
        { t: "nobody struck the one deadhold from the {name:capital} survey, and the traffic simply stopped", req: c => c.deadN === 1 },
        { t: "one holding of the {num:settled_n} that were settled keeps its name and nothing else", req: c => c.deadN === 1 },
      ],
      reborn: [
        { t: "{num:reborn_n} {term:reborn_has} come back as something else, and {term:reborn_list} {term:reborn_stand} again on ground that had been left for dead", req: c => c.rebornN > 0 },
        { t: "{term:reborn_list} were resettled after being abandoned: {num:reborn_n} {term:reborn_has} returned under new names", req: c => c.rebornN > 0 },
        { t: "ground given up for dead was taken again at {term:reborn_list}", req: c => c.rebornN > 0 },
        { t: "{num:reborn_n} {term:reborn_has} been resettled: {term:reborn_list}", req: c => c.rebornN > 0 },
        { t: "ground written off was taken up again at {term:reborn_list}", req: c => c.rebornN > 0 },
        { t: "what was abandoned came back at {term:reborn_list}, {num:reborn_n} {term:reborn_places} of it", req: c => c.rebornN > 0 },
        { t: "{term:reborn_list} {term:reborn_stand} on ground the record had already closed", req: c => c.rebornN > 0 },
        { t: "{num:reborn_n} {term:reborn_has} come back under names nobody there had used before", req: c => c.rebornN > 0 },
        { t: "one place came back: {term:reborn_list} stands again on ground that had been left for dead", req: c => c.rebornN === 1 },
        { t: "ground given up for dead was taken again, once, at {term:reborn_list}", req: c => c.rebornN === 1 },
      ],
      reborn_gloss: [
        { t: "all {num:reborn_n} places stand under names in a different tongue than the ones they carried before", req: c => (c.rebornN > 0) && c.reborn_n > 1 },
        { t: "the {num:reborn_n} names are not the old names, because the people who came back were not the people who left", req: c => (c.rebornN > 0) && c.reborn_n > 1 },
        { t: "what made those {num:reborn_n} places worth resettling is what made them worth leaving, arriving in a different order", req: c => (c.rebornN > 0) && c.reborn_n > 1 },
        { t: "those {num:reborn_n} places are proof that nothing here is abandoned for a reason that stays true", req: c => (c.rebornN > 0) && c.reborn_n > 1 },
        { t: "what emptied those {num:reborn_n} places and what refilled them was the same arithmetic pointing the other way", req: c => (c.rebornN > 0) && c.reborn_n > 1 },
        { t: "nobody returned out of sentiment, and the {num:reborn_n} names show it", req: c => (c.rebornN > 0) && c.reborn_n > 1 },
        { t: "the arithmetic that emptied those {num:reborn_n} places refilled them, pointing the other way", req: c => (c.rebornN > 0) && c.reborn_n > 1 },
        { t: "nobody returned to any of those {num:reborn_n} places out of sentiment", req: c => (c.rebornN > 0) && c.reborn_n > 1 },
        { t: "it stands under a name in a different tongue than the one the {name:capital} charts carried before", req: c => c.rebornN === 1 },
        { t: "what emptied that one place and what refilled it was the arithmetic of {num:n_regions} regions, pointing the other way", req: c => c.rebornN === 1 },
        { t: "nobody returned to it out of sentiment, and the name on the {name:capital} charts shows it", req: c => c.rebornN === 1 },
      ],
      ghost: [
        { t: "{name:ghost_town} is the emptiest of the ghost country, its best years gone and the roads no longer going there", req: c => c.hasGhost },
        { t: "the emptiest place in the record is {name:ghost_town}, which the roads have given up on", req: c => c.hasGhost },
        { t: "nothing has hollowed out further than {name:ghost_town}", req: c => c.hasGhost },
        { t: "{name:ghost_town} has hollowed out further than anywhere else in the record", req: c => c.hasGhost },
        { t: "the deepest fall in the record is {name:ghost_town}", req: c => c.hasGhost },
        { t: "{name:ghost_town} kept its name and lost everything the name referred to", req: c => c.hasGhost },
        { t: "the roads still reach {name:ghost_town} and nothing uses them", req: c => c.hasGhost },
        { t: "nowhere in these {num:n_regions} regions emptied like {name:ghost_town}", req: c => c.hasGhost },
      ],
      riser: [
        { t: "{name:riser_town} rose further than any other place in the record", req: c => c.hasRiser },
        { t: "the sharpest rise in the record belongs to {name:riser_town}", req: c => c.hasRiser },
        { t: "no place gained more across the years than {name:riser_town}", req: c => c.hasRiser },
        { t: "{name:riser_town} gained more than anywhere else across the years", req: c => c.hasRiser },
        { t: "nothing in the record climbed like {name:riser_town}", req: c => c.hasRiser },
        { t: "of all {num:n_regions} regions {name:riser_town} rose furthest", req: c => c.hasRiser },
        { t: "the record's steepest climb belongs to {name:riser_town}", req: c => c.hasRiser },
        { t: "{name:riser_town} ended the years further up than it began by more than anywhere else", req: c => c.hasRiser },
      ],
      riser_gloss: [
        { t: "across {num:n_regions} regions that says as much about where {name:riser_town} stood as about anything it did", req: c => c.hasRiser },
        { t: "where {name:riser_town} stood mattered more than anything {name:riser_town} decided", req: c => c.hasRiser },
        { t: "the ground under {name:riser_town} did most of the work, as it did everywhere else in this record", req: c => c.hasRiser },
        { t: "nothing {name:riser_town} decided accounts for as much as where {name:riser_town} was put", req: c => c.hasRiser },
        { t: "position did the work at {name:riser_town}, as position does everywhere in these {num:n_regions} regions", req: c => c.hasRiser },
        { t: "what rose was the value of the ground, and {name:riser_town} happened to be standing on it", req: c => c.hasRiser },
        { t: "no charter, no decree and no decision explains {name:riser_town} as well as the map does", req: c => c.hasRiser },
        { t: "what rose at {name:riser_town} was the ground's value, and {name:riser_town} was standing on it", req: c => c.hasRiser },
      ],
      blocs: [
        { t: "the Crown holds {num:bloc_crown} regions, the Temple {num:bloc_temple}, the magnates {num:bloc_magnate}", req: () => true },
        { t: "the realm divides {num:bloc_crown} to the Crown, {num:bloc_temple} to the Temple and {num:bloc_magnate} to the magnates", req: () => true },
        { t: "of the {num:n_regions} regions, {num:bloc_crown} answer to the Crown, {num:bloc_temple} to the Temple and {num:bloc_magnate} to the magnates", req: () => true },
        { t: "the three powers hold {num:bloc_crown}, {num:bloc_temple} and {num:bloc_magnate} regions between them", req: () => true },
        { t: "allegiance at the close runs Crown {num:bloc_crown}, Temple {num:bloc_temple}, magnates {num:bloc_magnate}", req: () => true },
        { t: "at the close it stands Crown {num:bloc_crown}, Temple {num:bloc_temple}, magnates {num:bloc_magnate}", req: () => true },
        { t: "the allegiance of the {num:n_regions} regions runs {num:bloc_crown} Crown, {num:bloc_temple} Temple, {num:bloc_magnate} magnate", req: () => true },
        { t: "{num:bloc_crown} regions to the Crown against {num:bloc_temple} to the Temple and {num:bloc_magnate} to the magnates", req: () => true },
        { t: "what the three powers hold is {num:bloc_crown}, {num:bloc_temple} and {num:bloc_magnate}", req: () => true },
        { t: "at the close it is {num:bloc_crown} to the Crown, {num:bloc_temple} to the Temple, {num:bloc_magnate} to the magnates", req: () => true },
        { t: "the {num:n_regions} regions divide {num:bloc_crown}, {num:bloc_temple} and {num:bloc_magnate} between the three powers", req: () => true },
      ],
      blocs_gloss: [
        { t: "{num:bloc_contested} {term:contest_are} contested between them, and {num:bloc_ungoverned} {term:ungov_answer} to no one at all", req: () => true },
        { t: "a further {num:bloc_contested} {term:contest_are} disputed and {num:bloc_ungoverned} acknowledge nobody", req: () => true },
        { t: "{num:bloc_ungoverned} regions {term:ungov_recognise} no authority whatever, and {num:bloc_contested} {term:contest_are} claimed by more than one", req: () => true },
        { t: "the remainder is {num:bloc_contested} contested and {num:bloc_ungoverned} ungoverned, which the capital counts separately for a reason", req: () => true },
        { t: "{num:bloc_ungoverned} {term:ungov_answer} to nobody and {num:bloc_contested} answer to more than one, which are different problems", req: () => true },
        { t: "the capital counts {num:bloc_contested} contested and {num:bloc_ungoverned} ungoverned, and counts them apart on purpose", req: () => true },
        { t: "a further {num:bloc_ungoverned} of the {num:n_regions} regions acknowledge no authority at all", req: () => true },
        { t: "{num:bloc_contested} {term:contest_have} two claimants and {num:bloc_ungoverned} {term:ungov_have} none, and the second number is the one the capital dislikes", req: () => true },
      ],
      gates: [
        { t: "of the realm's {num:gate_n} gates, meaning the bridges, the passes and the quays, the Crown keeps {num:gate_crown}, the Temple {num:gate_temple} and the magnates {num:gate_magnate}", req: c => c.gateN > 0 },
        { t: "there are {num:gate_n} gates in the realm and they are held {num:gate_crown} by the Crown, {num:gate_temple} by the Temple and {num:gate_magnate} by the magnates", req: c => c.gateN > 0 },
        { t: "the bridges, passes and quays number {num:gate_n}: Crown {num:gate_crown}, Temple {num:gate_temple}, magnates {num:gate_magnate}", req: c => c.gateN > 0 },
        { t: "every road out of the realm passes one of {num:gate_n} gates, of which the Crown holds {num:gate_crown} and the magnates {num:gate_magnate}", req: c => c.gateN > 0 },
        { t: "{num:gate_n} gates stand in the realm, held {num:gate_crown} Crown, {num:gate_temple} Temple, {num:gate_magnate} magnate", req: c => c.gateN > 0 },
        { t: "a gate is a quay, a span or a pass, and of the {num:gate_n} the Crown holds {num:gate_crown}", req: c => c.gateN > 0 },
        { t: "the count of gates is {num:gate_n}, divided {num:gate_crown} to {num:gate_temple} to {num:gate_magnate}", req: c => c.gateN > 0 },
        { t: "everything that leaves these {num:n_regions} regions passes one of {num:gate_n} gates", req: c => c.gateN > 0 },
        { t: "the {num:gate_n} gates are held {num:gate_crown} Crown, {num:gate_temple} Temple, {num:gate_magnate} magnate", req: c => c.gateN > 0 },
        { t: "nothing leaves these {num:n_regions} regions without passing one of {num:gate_n} gates", req: c => c.gateN > 0 },
      ],
      gates_gloss: [
        { t: "{num:gate_none} stand untolled, and every levy on the list is paid by people who did not choose the road", req: c => c.gateN > 0 && c.gate_none > 1 },
        { t: "{num:gate_none} of them take nothing, and the rest are paid by whoever had no other way through", req: c => c.gateN > 0 && c.gate_none > 1 },
        { t: "the {num:gate_none} that charge nothing charge nothing because nobody found them worth holding", req: c => c.gateN > 0 && c.gate_none > 1 },
        { t: "not one of the {num:gate_n} gates was chosen by the people who pay at it", req: c => c.gateN > 0 },
        { t: "{num:gate_none} take nothing, and every one of the rest is paid by somebody with no second road", req: c => c.gateN > 0 && c.gate_none > 1 },
        { t: "of the {num:gate_n}, the {num:gate_none} that charge nothing charge nothing because nobody wanted them", req: c => c.gateN > 0 && c.gate_none > 1 },
        { t: "nobody who pays at any of the {num:gate_n} agreed to the arrangement", req: c => c.gateN > 0 },
        { t: "a levy at a gate is not a price, because a price implies a choice, and the {num:gate_n} offer none", req: c => c.gateN > 0 },
        { t: "every one of the {num:gate_n} charges, and every charge is paid by somebody with no second road", req: c => c.gateN > 0 && c.gate_none === 0 },
        { t: "every one of the {num:gate_n} charges, and none of them was put there by anyone who pays", req: c => c.gateN > 0 && c.gate_none === 0 },
        { t: "the one that charges nothing charges nothing because nobody found it worth holding, and the other {num:gate_n} do", req: c => c.gateN > 1 && c.gate_none === 1 },
      ],
      treasuries: [
        { t: "the tariff ledgers run deepest with {term:richest_power}, and coin buys the next gate", req: c => c.hasTreasuries },
        { t: "{term:richest_power} hold the deepest tariff ledger, and a deep ledger buys the next gate", req: c => c.hasTreasuries },
        { t: "the coin from the gates has pooled with {term:richest_power}", req: c => c.hasTreasuries },
        { t: "{term:richest_power} came out of the years with the deepest ledger", req: c => c.hasTreasuries },
        { t: "the gate money has pooled with {term:richest_power}, and money buys gates", req: c => c.hasTreasuries },
        { t: "of the three powers it is {term:richest_power} whose ledger runs deepest", req: c => c.hasTreasuries },
        { t: "what the gates collected went mostly to {term:richest_power}", req: c => c.hasTreasuries },
        { t: "{term:richest_power} hold the coin, and the coin holds the next gate", req: c => c.hasTreasuries },
      ],
      treasuries_gloss: [
        { t: "more gates mean more coin, which buys more gates, and of the powers {term:worst_pair} stand nearest to blows", req: c => c.hasTreasuries && c.tenseHigh },
        { t: "the loop is closed: gates pay for gates, and {term:worst_pair} are the pair the capital watches", req: c => c.hasTreasuries && c.tenseHigh },
        { t: "more gates mean more coin and more coin buys more gates, though for now not one of the {num:gate_n} gates has bought a grievance worth the ink", req: c => c.hasTreasuries && !c.tenseHigh },
        { t: "gates buy gates across all {num:gate_n} of the realm's, and no quarrel among the powers has yet been worth writing down", req: c => c.hasTreasuries && !c.tenseHigh },
        { t: "the loop closes on itself: {term:worst_pair} are simply the two nearest to acting on it", req: c => c.hasTreasuries && c.tenseHigh },
        { t: "what the gates earn buys more gates, and of the powers {term:worst_pair} are the pair worth watching", req: c => c.hasTreasuries && c.tenseHigh },
        { t: "gates buy gates, and no grievance among the powers has yet been set down about any of the {num:gate_n}", req: c => c.hasTreasuries && !c.tenseHigh },
        { t: "the loop runs unopposed over all {num:gate_n} gates, and nobody has quarrelled about it in the record", req: c => c.hasTreasuries && !c.tenseHigh },
      ],
      classledger: [
        { t: "every town holds two peoples under one name, the owners' row and the labour it hires: together {num:pop_pct} in every hundred of the realm's people hold {num:coin_pct} of every hundred coins", req: c => c.hasClass },
        { t: "within every town there are two peoples: {num:pop_pct} in every hundred hold {num:coin_pct} coins in every hundred", req: c => c.hasClass },
        { t: "the sharper division is not between towns but inside them, where {num:pop_pct} of the people hold {num:coin_pct} of the coin", req: c => c.hasClass },
        { t: "one name covers two peoples in every town, and {num:pop_pct} in the hundred of them hold {num:coin_pct} in the hundred of the coin", req: c => c.hasClass },
        { t: "the division that matters is inside the towns, not between them: {num:pop_pct} in the hundred hold {num:coin_pct} in the hundred", req: c => c.hasClass },
        { t: "a town is two peoples with one name, and {num:pop_pct} in every hundred of them hold {num:coin_pct} coins in every hundred", req: c => c.hasClass },
        { t: "counted by row rather than by town, {num:pop_pct} in every hundred hold {num:coin_pct} of every hundred coins", req: c => c.hasClass },
        { t: "the owners' row is {num:pop_pct} in the hundred and holds {num:coin_pct} in the hundred", req: c => c.hasClass },
        { t: "inside every town, {num:pop_pct} in the hundred hold {num:coin_pct} in the hundred", req: c => c.hasClass },
        { t: "the division that decides most lives here is {num:pop_pct} against {num:coin_pct}, and it is inside the towns", req: c => c.hasClass },
      ],
      classledger_gloss: [
        { t: "they live {num:class_gap} times better than the people who work for them, and the gap is sharpest at {name:company_town}, where {num:company_share} coins in every hundred belong to the few", req: c => c.hasClass },
        { t: "the ratio is {num:class_gap} to one, owner to labour, and at {name:company_town} it reaches {num:company_share} coins in the hundred", req: c => c.hasClass },
        { t: "{name:company_town} is the sharpest of them at {num:company_share} in the hundred, and across the realm the owners live {num:class_gap} times better", req: c => c.hasClass },
        { t: "a map drawn by region cannot show this, since it sees towns and not rows, and it misses {num:within_pct} parts in a hundred of the whole spread", req: c => c.hasWithin },
        { t: "owner to labour is {num:class_gap} to one across the realm, and {num:company_share} in the hundred at {name:company_town}", req: c => c.hasClass },
        { t: "the sharpest of them is {name:company_town} at {num:company_share} coins in the hundred", req: c => c.hasClass },
        { t: "{num:class_gap} times better is not a figure of speech, it is the ratio, and at {name:company_town} it is worse", req: c => c.hasClass },
        { t: "a regional map sees towns and not rows, and misses {num:within_pct} parts in a hundred of the spread doing so", req: c => c.hasWithin },
      ],
      dominion: [
        { t: "over all of it stands the Dominion, which holds {num:occ_n} regions from its foothold at {name:foothold} and calls the arrangement trade", req: c => c.hasDominion },
        { t: "the Dominion holds {num:occ_n} regions from {name:foothold}, and the word it uses for that is trade", req: c => c.hasDominion },
        { t: "from its foothold at {name:foothold} the Dominion has taken {num:occ_n} regions", req: c => c.hasDominion },
        { t: "the Dominion holds {num:occ_n} of the realm's regions and calls it trade", req: c => c.hasDominion },
        { t: "{num:occ_n} regions answer across the water, from the foothold at {name:foothold}", req: c => c.hasDominion },
        { t: "above the three powers stands a fourth: the Dominion, {num:occ_n} regions and a foothold at {name:foothold}", req: c => c.hasDominion },
        { t: "what began at {name:foothold} is {num:occ_n} regions now", req: c => c.hasDominion },
        { t: "{num:occ_n} of the realm's regions answer across the water now", req: c => c.hasDominion },
      ],
      dominion_gloss: [
        { t: "those {num:occ_n} regions keep the smallest share of what they make and carry the best wires in the realm, both for the same reason", req: c => c.hasDominion },
        { t: "those {num:occ_n} regions retain least and are wired best, which is one fact and not two", req: c => c.hasDominion },
        { t: "the Crown still reigns, and it no longer rules the {num:occ_n} regions the Dominion holds, and the two are not the same thing", req: c => c.hasDominion },
        { t: "the best wires in the realm run through the {num:occ_n} regions that keep the least of what they make", req: c => c.hasDominion },
        { t: "to reign over {num:occ_n} regions and not rule them is a distinction {name:capital} now has to make", req: c => c.hasDominion },
        { t: "the wire followed the cargo into all {num:occ_n}, and the cargo was never for them", req: c => c.hasDominion },
        { t: "the best wire in the realm serves the {num:occ_n} regions that keep least of what they make", req: c => c.hasDominion },
        { t: "reigning over {num:occ_n} regions and ruling them are now two different things at {name:capital}", req: c => c.hasDominion },
      ],
      darkgrid: [
        { t: "{num:dark_now} of the realm's settlements still sit off the grid, in darkness", req: c => c.darkNow > 0 },
        { t: "the wire still does not reach {num:dark_now} settlements", req: c => c.darkNow > 0 },
        { t: "{num:dark_now} settlements end the record unwired", req: c => c.darkNow > 0 },
        { t: "at the record's close the grid reaches every one of the realm's {num:n_regions} regions", req: c => c.darkNow === 0 },
        { t: "{num:dark_now} settlements are still dark at the close", req: c => c.darkNow > 0 },
        { t: "the grid has not reached {num:dark_now} of the realm's settlements and has stopped trying", req: c => c.darkNow > 0 },
        { t: "{num:dark_now} settlements end the years exactly as dark as they began", req: c => c.darkNow > 0 },
        { t: "every settlement in the {num:n_regions} regions is wired at the close", req: c => c.darkNow === 0 },
        { t: "the wire ends short of {num:dark_now} settlements and has stopped advancing", req: c => c.darkNow > 0 },
        { t: "{num:dark_now} settlements are dark at the close and were dark at the founding", req: c => c.darkNow > 0 },
      ],
      darkgrid_gloss: [
        { t: "the grid goes where the ledgers say it pays to go, and across {num:n_regions} regions this record can only mark where that is not", req: c => c.darkNow > 0 },
        { t: "a projection drew that line and {num:dark_now} settlements fell the wrong side of it", req: c => c.darkNow > 0 },
        { t: "the ledgers decide the boundary, and the record can only say that {num:dark_now} fell outside it", req: c => c.darkNow > 0 },
        { t: "that is written here plainly, across all {num:n_regions} regions, so a later reader can check whether it lasted", req: c => c.darkNow === 0 },
        { t: "the wire goes where a ledger says it repays, and {num:dark_now} settlements do not", req: c => c.darkNow > 0 },
        { t: "nobody decided against those {num:dark_now}; a projection did, and projections do not have to explain themselves", req: c => c.darkNow > 0 },
        { t: "the line was drawn in {name:capital} and fell where it fell, with {num:dark_now} on the wrong side", req: c => c.darkNow > 0 },
        { t: "the grid reached all {num:n_regions} regions, and this record says so plainly so a later one can be checked against it", req: c => c.darkNow === 0 },
      ],
    };

    // The founding's beats, in the order they are told. A beat appears only if its
    // claim class has a fragment whose req passes — the gating does the work the old
    // `if` ladder did, and an ABSENCE is a fragment like any other rather than the
    // else-branch of a template (§4: "no wall crosses this realm" should be rare and
    // startling, not a default).
    const CHRONICLE_FOUNDING = [
      ["realm", "realm_gloss"], ["sizes", "sizes_gloss"], ["works", "works_gloss"],
      ["skyway", "skyway_gloss"], ["ridges", "ridges_gloss"],
      ["sea", "sea_gloss"], ["ruins", "ruins_gloss"], ["freeport", "freeport_gloss"],
      ["sanctuary", "sanctuary_gloss"], ["still", "still_gloss"], ["camps", "camps_gloss"],
      ["towers", "towers_gloss"], ["bridges", "bridges_gloss"],
    ];

    // The years: the two fixed templates that wrap the event lines. The events
    // themselves already pick from five variants per type, which is why The Years
    // measured 0.50 against the fixed acts' 0.65-0.98 before any of this.
    const CHRONICLE_YEARS_OPEN = [["ages", "ages_gloss"], ["quiet", "quiet_gloss"]];
    const CHRONICLE_YEARS_CLOSE = [["bynames", "bynames_gloss"]];

    // The state of the realm, at the close. `fates` through `riser` are told only
    // when the years actually ran; the rest hold at any epoch count.
    const CHRONICLE_STATE = [
      ["fates", "deadholds_gloss"], ["deadholds", null], ["reborn", "reborn_gloss"],
      ["ghost", null], ["riser", "riser_gloss"], ["blocs", "blocs_gloss"],
      ["gates", "gates_gloss"], ["treasuries", "treasuries_gloss"],
      ["classledger", "classledger_gloss"], ["dominion", "dominion_gloss"],
      ["darkgrid", "darkgrid_gloss"],
    ];

    // Everything the historian may name or count, flattened, with the branch
    // predicates precomputed so a `req` reads as a claim about the world.
    function chronicleCtx(model, params) {
      const STREAMS = {};
      const rvList = (k) => (STREAMS[k] || (STREAMS[k] = loomStream(params.seed, "chronicle", "list#" + k)));
      const town = (id) => model.settlements.find(s => s.regionId === id)
        || { name: ((model.regions.find(r => r.id === id) || {}).placeName) || "the wild", regionId: id };
      const list = (xs) => xs.length <= 1 ? (xs[0] || "")
        : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];
      const compass = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"][Math.round(model.windDeg / 45) % 8];
      const crownLine = model.dynasties.crown;
      const foundedIds = new Set(model.events.filter(ev => ev.type === "refinery_founded").map(ev => ev.region_id));
      const collapsedIds = model.events.filter(ev => ev.type === "refinery_collapse").map(ev => ev.region_id);
      const works0 = model.regions.filter(r => (r.refining > 0 && !foundedIds.has(r.id))).map(r => r.id).concat(collapsedIds);
      const consIds = new Set(model.events.filter(ev => ev.type === "consecration").map(ev => ev.region_id));
      const shrines0 = model.sanctionedSites.filter(s => !consIds.has(s.regionId));
      const pops = model.regions.map(r => r.popT0).sort((a, b) => b - a);
      const aeries = model.regions.filter(r => r.isSkyport === 1).map(r => town(r.id).name);
      const ports = model.regions.filter(r => r.isPort === 1);
      const still = model.regions.filter(r => r.stillair === 1);
      const towers = model.regions.filter(r => r.hasTower === 1);
      const busiest = model.regions.reduce((a, b) => a.delverFlux >= b.delverFlux ? a : b);
      const c = {
        town, list,
        seed: params.seed, close_year: 1000 + 25 * params.ep,
        capital: model.capitalName,
        reigning: (crownLine[crownLine.length - 1] || {}).name || "an unnamed regent",
        n_regions: model.regions.length, compass,
        pop_top: pops[0], pop_med: pops[Math.floor(pops.length / 2)],
        hasWorks: works0.length > 0, works_list: list(works0.map(id => town(id).name)),
        // the trunk lines run from the works TO the capital, so a beat that says so
        // needs at least one works standing somewhere other than the capital
        worksOffCapital: works0.some(id => !(model.regions.find(r => r.id === id) || {}).isCapital),
        works_verb: works0.length === 1 ? "holds" : "hold",
        works_are: works0.length === 1 ? "is" : "are",
        hasShrines: shrines0.length > 0,
        shrine_list: list(shrines0.map(s => `${s.name} (by ${town(s.regionId).name})`)),
        dark0: model.epochSnaps[0].onGrid.filter(v => !v).length,
        hasSkyway: aeries.length >= 2, skyway: model.skywayName, aerie_list: list(aeries),
        hasRidges: model.ridges.length > 0,
        ridge_list: list(model.ridges.map(R => `${R.name} ${R.kind}`)),
        hasPasses: model.passes.length > 0, pass_list: list(model.passes.map(p => p.name)),
        shadowN: model.regions.filter(r => r.rangeShadow === 1).length,
        shadow_n: model.regions.filter(r => r.rangeShadow === 1).length,
        hasSea: model.seaSides.length > 0, sea_sides: list(model.seaSides),
        hasCharts: model.seaShapes.some(S => S.name),
        chart_names: list(model.seaShapes.map(S => S.name).filter(Boolean)),
        hasPorts: ports.length > 0, port_verb: ports.length === 1 ? "takes" : "take",
        port_is: ports.length === 1 ? "gate is" : "gates are",
        port_list: list(ports.map(reg => harborName(town(reg.id).name)
          + (reg.onRiver === 1 && reg.downstreamBlight > 0 ? " (which drinks the river last and ships it first)" : ""))),
        hbSealed: params.hb === 0,
        hasMaelstrom: !!model.maelstrom, maelstrom: model.maelstrom ? model.maelstrom.name : null,
        hasRuins: model.ruins.length > 0,
        // A list whose items all run one template says the same nine words once per
        // item. Each item draws its own phrasing, on the list's own substream, so a
        // realm with four delves does not read as one delve written four times.
        ruin_list: list(model.ruins.map(r => {
          const t = town(model.regions[r.regionIdx].id).name;
          const V = RUIN_SAID[r.type] || RUIN_SAID.deadhold;
          return V[Math.floor(rvList("ruins")() * V.length)](r.name, t);
        })),
        delver_town: town(busiest.id).name,
        hasFreeport: !!model.freeport,
        freeport: model.freeport ? model.freeport.name : null,
        freeport_town: model.freeport ? town(model.freeport.regionId).name : null,
        hasSanctuary: !!model.sanctuary,
        sanctuary: model.sanctuary ? model.sanctuary.name : null,
        sanctuary_town: model.sanctuary ? town(model.sanctuary.regionId).name : null,
        hasStill: still.length > 0, stillname: model.stillName,
        still_list: list(still.map(r => town(r.id).name)),
        capitalInStill: (model.regions.find(r => r.isCapital) || {}).stillair === 1,
        hasCamps: model.camps.length > 0,
        camp_list: list(model.camps.map(cp => `${cp.name} by ${town(cp.regionId).name}`)),
        hasTowers: towers.length > 0,
        tower_holder: towers.length > 1 ? "apostates keep" : "an apostate keeps",
        tower_list: list(towers.map(reg => `${town(reg.id).name} Tower`)),
        bridge_n: model.bridges.length, camp_n: model.camps.length,
        tower_n: towers.length, still_n: still.length,
        hasBridges: model.bridges.length > 0,
        bridge_list: list(model.bridges.map(b => `${town(model.regions[b.regionIdx].id).name} Bridge`)),
        // the rivers are told one at a time; the loop fills these per river
        hasRiver: false, river: null, river_head: null, river_mouth: null, river_len: 0,
      };

      // ---- the state of the realm, at the close ------------------------------
      const bb = { boom: 0, stable: 0, decline: 0, collapse: 0 };
      model.regions.forEach(r => { bb[r.boomBust] = (bb[r.boomBust] || 0) + 1; });
      const fateParts = [];
      const said = (key, n) => { const V = FATE_SAID[key]; return V[Math.floor(rvList("fates")() * V.length)](n); };
      if (bb.boom) fateParts.push(said("boom", bb.boom));
      if (bb.stable) fateParts.push(said("stable", bb.stable));
      if (bb.decline) fateParts.push(said("decline", bb.decline));
      if (bb.collapse) fateParts.push(said("collapse", bb.collapse));
      const deadholds = model.regions.filter(r => !r.settled && r.abandonedEpoch >= 0);
      const deadNames = deadholds.slice(0, 4).map(r => r.placeName).filter(Boolean);
      const reborn = model.regions.filter(r => r.settled && r.rebirths >= 1);
      const ghost = model.regions.reduce((a, b) => a.abandonment >= b.abandonment ? a : b);
      const riser = model.regions.reduce((a, b) => (a.wealth - a.wealthT0) >= (b.wealth - b.wealthT0) ? a : b);
      const bc = { crown: 0, temple: 0, magnate: 0, contested: 0, ungoverned: 0 };
      model.regions.forEach(r => { bc[r.bloc]++; });
      const hc = { crown: 0, temple: 0, magnate: 0, none: 0 };
      model.holdings.forEach(h => { hc[h.heldBy]++; });
      const tr = model.treasuries, tn = model.tensions;
      const FN2 = { crown: "the Crown", temple: "the Temple", magnate: "the magnates" };
      const richest = ["crown", "temple", "magnate"].reduce((a, b) => tr[a] >= tr[b] ? a : b);
      const tPairs = [["crown_magnate", "the Crown and the magnates"], ["crown_temple", "the Crown and the Temple"], ["magnate_temple", "the magnates and the Temple"]];
      const worstPair = tPairs.reduce((a, b) => tn[a[0]] >= tn[b[0]] ? a : b);
      const FS = getFindings(model);
      const occN = model.regions.filter(r => r.occupied).length;
      Object.assign(c, {
        hasFates: params.ep > 0, settled_n: model.regions.filter(r => r.settled).length,
        fate_parts: list(fateParts),
        deadN: params.ep > 0 ? deadholds.length : 0, dead_n: deadholds.length,
        dead_stand: deadholds.length === 1 ? "holding stands" : "holdings stand",
        dead_holdings: deadholds.length === 1 ? "holding" : "holdings",
        reborn_places: reborn.length === 1 ? "place" : "places",
        reborn_stand: reborn.length === 1 ? "stands" : "stand",
        dead_list: list(deadNames) + (deadholds.length > deadNames.length ? " among others" : ""),
        rebornN: params.ep > 0 ? reborn.length : 0, reborn_n: reborn.length,
        reborn_has: reborn.length === 1 ? "place has" : "places have",
        reborn_list: list(reborn.slice(0, 3).map(r => town(r.id).name).filter(Boolean)),
        hasGhost: params.ep > 0 && ghost.abandonment >= 35, ghost_town: town(ghost.id).name,
        hasRiser: params.ep > 0 && riser.wealth - riser.wealthT0 > 10, riser_town: town(riser.id).name,
        bloc_crown: bc.crown, bloc_temple: bc.temple, bloc_magnate: bc.magnate,
        bloc_contested: bc.contested, bloc_ungoverned: bc.ungoverned,
        contest_are: bc.contested === 1 ? "is" : "are",
        contest_have: bc.contested === 1 ? "has" : "have",
        ungov_have: bc.ungoverned === 1 ? "has" : "have",
        ungov_answer: bc.ungoverned === 1 ? "answers" : "answer",
        ungov_recognise: bc.ungoverned === 1 ? "recognises" : "recognise",
        gateN: model.holdings.length, gate_n: model.holdings.length,
        gate_crown: hc.crown, gate_temple: hc.temple, gate_magnate: hc.magnate, gate_none: hc.none,
        gate_none_n: hc.none,
        hasTreasuries: model.holdings.length > 0 && (tr.crown + tr.temple + tr.magnate) > 0,
        richest_power: FN2[richest], tenseHigh: tn[worstPair[0]] >= 20, worst_pair: worstPair[1],
        hasClass: !!(FS.owners && FS.class_gap !== null),
        pop_pct: FS.owners ? FS.owners.pop_pct : null, coin_pct: FS.owners ? FS.owners.coin_pct : null,
        class_gap: FS.class_gap, company_share: FS.company_share,
        company_town: FS.company_town !== undefined && FS.company_town !== null ? town(FS.company_town).name : null,
        hasWithin: FS.within_pct !== null && FS.within_pct >= 15, within_pct: FS.within_pct,
        hasDominion: !!(model.dominion && occN > 0), occ_n: occN,
        foothold: model.dominion ? town(model.regions[model.dominion.foothold].id).name : null,
        darkNow: model.regions.filter(r => !r.onConduit).length,
        dark_now: model.regions.filter(r => !r.onConduit).length,
        // the years
        n_epochs: params.ep,
        noEvents: params.ep > 0 && model.events.length === 0,
        hasAges: !!(FS.ages && FS.ages.length), n_ages: FS.ages ? FS.ages.length : 0,
        age_list: FS.ages ? list(FS.ages.map(a => {
          const way = a.gini_end > a.gini_start + 0.02 ? "wider" : a.gini_start > a.gini_end + 0.02 ? "narrower" : "held";
          const V = AGE_SAID[way];
          return `**${a.name}** (${1000 + 25 * a.from_epoch}–${1000 + 25 * a.to_epoch}), ` +
            V[Math.floor(rvList("ages")() * V.length)];
        })) : null,
        hasBynames: model.regions.some(r => r.epithet),
        byname_list: list(model.regions.filter(r => r.epithet).map(r => `${town(r.id).name} ${r.epithet}`)),
        byname_n: model.regions.filter(r => r.epithet).length,
      });
      return c;
    }

    const CHRONICLE_FIXED = { pop_top: "verbatim", pop_med: "verbatim" };
    const chronicleResolve = (kind, key, c) => {
      if (kind === "name" || kind === "term") return c[key];
      if (kind === "num") { const v = c[key]; return (v === null || v === undefined) ? null : v; }
      return null;
    };

    // One beat, composed. Returns "" when the beat has nothing to say for this world,
    // which is how a conditional act stays conditional.
    function chronicleBeat(pool, claim, gloss, c, seed, key) {
      if (!loomGate(pool, claim, c, undefined, new Set()).length) return null;
      const v = loomCompose({
        register: "historian", frames: CHRONICLE_FRAMES, pool,
        classes: [gloss ? [claim, gloss] : [claim]], ctx: c, resolve: chronicleResolve,
        rv: loomStream(seed, "chronicle", key || claim),
      });
      return v.text ? v : null;
    }

    // ---- the years, composed -------------------------------------------------
    // D4 (#140): the event lines were the last fixed prose in the chronicle. Six of
    // the twenty-seven types already picked from five variants; the other twenty-one
    // were one template each, which is why The Years held at 0.44 after every other
    // act came down. Each type is now a claim class and one or more gloss classes,
    // gated the same way the founding is: a branch that used to be an `if` is a
    // `req` on a fragment, so a world that does not meet it never sees the clause.
    //
    // The joins are narrower than the founding's. A chronicle beat can afford
    // "though"; a year-line cannot, because the reader is being told what happened
    // and a wrong connective reads as a wrong claim.
    // A frame's own words are shared by every world that draws it, so a wordy frame
    // RAISES cross-world sameness even as it varies the sentence: measured, adding
    // five phrase-frames here moved the corpus from 0.197 to 0.200. Frames stay at
    // punctuation and the smallest connectives, and the variety is bought in the pool.
    const EVENT_FRAMES = ["{A}. {B}.", "{A}, and {B}.", "{A}; {B}.", "{A}: {B}.", "{A}. And {B}.", "{A}, so {B}."];

    // Which classes each type composes, in order. A pair whose classes both gate
    // empty contributes nothing, so an optional coda costs nothing to declare.
    const EVENT_CLASSES = {
      blight_plague: [["blight_plague", "blight_plague_gloss"], ["blight_plague_coda", "blight_plague_name"]],
      ore_strike: [["ore_strike", "ore_strike_gloss"], ["ore_strike_war", null]],
      war: [["war", "war_powers"], ["war_loss", "war_name"]],
      revolt: [["revolt", "revolt_gloss"], ["revolt_arc", "revolt_name"]],
      treaty: [["treaty", "treaty_terms"], ["treaty_gloss", "treaty_name"]],
      annexation: [["annexation", "annexation_gloss"], ["annexation_gloss2", "annexation_name"]],
      succession: [["succession", "succession_gloss"], ["succession_coda", null]],
      reform: [["reform", "reform_gloss"], ["reform_coda", null]],
      reaction: [["reaction", "reaction_gloss"], ["reaction_coda", null]],
      imposition: [["imposition", "imposition_gloss"], ["imposition_coda", null]],
      concession: [["concession", "concession_gloss"], ["concession_coda", null]],
      refinery_collapse: [["refinery_collapse", "refinery_collapse_gloss"], ["refinery_collapse_coda", null]],
      refinery_founded: [["refinery_founded", "refinery_founded_gloss"], ["refinery_founded_coda", null]],
      relic_calamity: [["relic_calamity", "relic_calamity_gloss"], ["relic_calamity_coda", null]],
      tower_burned: [["tower_burned", "tower_burned_gloss"], ["tower_burned_coda", null]],
      tower_raised: [["tower_raised", "tower_raised_gloss"], ["tower_raised_coda", null]],
      embargo: [["embargo", "embargo_gloss"], ["embargo_coda", null]],
      courting: [["courting", "courting_gloss"], ["courting_coda", null]],
      abandonment: [["abandonment", "abandonment_gloss"], ["abandonment_coda", null]],
      drought: [["drought", "drought_gloss"], ["drought_coda", "drought_name"]],
      flood: [["flood", "flood_gloss"], ["flood_coda", "flood_name"]],
      quake: [["quake", "quake_gloss"], ["quake_coda", "quake_name"]],
      storm: [["storm", "storm_gloss"], ["storm_coda", "storm_name"]],
      discovery: [["discovery", "discovery_gloss"], ["discovery_coda", "discovery_name"]],
      ascendancy: [["ascendancy", "ascendancy_gloss"], ["ascendancy_coda", "ascendancy_name"]],
      consecration: [["consecration", "consecration_gloss"], ["consecration_coda", null]],
      seizure: [["seizure", "seizure_gloss"], ["seizure_coda", null]],
    };
    const eventClasses = (type) => EVENT_CLASSES[type] || [[type, type + "_gloss"]];

    const EVENT_POOL = {
      // -- the aetherworks ----------------------------------------------------
      refinery_collapse: [
        { t: "the aetherworks at {name:ev_town} shut down, the fields that fed them worked out", req: () => true },
        { t: "the aetherworks at {name:ev_town} closed its yards for good", req: () => true },
        { t: "the last shift at the {name:ev_town} aetherworks clocked out and did not come back", req: () => true },
        { t: "the magnates pulled their money out of {name:ev_town} when the ore stopped paying", req: () => true },
        { t: "the aetherworks at {name:ev_town} failed in {num:ev_year}", req: () => true },
        { t: "the lode under {name:ev_town} was mined to nothing, and the aetherworks stopped with it", req: () => true },
        { t: "the yards at {name:ev_town} stopped, and the ore they were built on was gone", req: () => true },
        { t: "{name:ev_town} lost its aetherworks in {num:ev_year}", req: () => true },
        { t: "the seam under {name:ev_town} ran out and took the yards with it", req: () => true },
        { t: "the lode under {name:ev_town} was finished, and so was {name:ev_town}", req: () => true },
        { t: "the aetherworks at {name:ev_town} went cold in {num:ev_year}", req: () => true },
        { t: "the money that had built {name:ev_town} was withdrawn from it", req: () => true },
        { t: "the yards at {name:ev_town} shut, and the town shut behind them", req: () => true },
      ],
      refinery_collapse_gloss: [
        { t: "the magnates left as soon as the ore did, and the trunk lines into {name:ev_town} still stand there carrying nothing", req: () => true },
        { t: "{name:ev_town} kept its wires and lost its wages", req: () => true },
        { t: "the lumen tanks at {name:ev_town} went cold within the month", req: () => true },
        { t: "the town the yards had grown around emptied behind them, and the survey still lists {name:ev_town} at its old size", req: () => true },
        { t: "the wages at {name:ev_town} stopped a season before the wires did", req: () => true },
        { t: "what the ledgers built at {name:ev_town} in a generation they unbuilt in a year, and nobody took the copper up", req: () => true },
        { t: "the wire to {name:ev_town} was never taken up, and nothing was ever sent along it again", req: () => true },
        { t: "everyone at {name:ev_town} who could leave left, in the order their savings allowed", req: () => true },
        { t: "the charter for {name:ev_town} is still on file at {name:capital} and refers to nothing", req: () => true },
        { t: "the wire into {name:ev_town} remained and had nothing to carry", req: () => true },
        { t: "the machinery left {name:ev_town} and the housing stayed", req: () => true },
        { t: "the wage at {name:ev_town} stopped before the lease did", req: () => true },
        { t: "what {name:ev_town} had instead of a future was a seam", req: () => true },
      ],
      refinery_founded: [
        { t: "the magnates built new aetherworks at {name:ev_town}, where the money had gone", req: () => true },
        { t: "new aetherworks fires were lit at {name:ev_town} in {num:ev_year}", req: () => true },
        { t: "the magnates broke ground on aetherworks at {name:ev_town}", req: () => true },
        { t: "aetherworks rose at {name:ev_town} on a fresh charter", req: () => true },
        { t: "{name:capital} chartered aetherworks at {name:ev_town}", req: () => true },
        { t: "the money that had been looking for ore found it under {name:ev_town}", req: () => true },
        { t: "aetherworks were chartered at {name:ev_town} in {num:ev_year}", req: () => true },
        { t: "the money found {name:ev_town}, and the yards went up", req: () => true },
        { t: "{name:ev_town} was where the next aetherworks were built", req: () => true },
        { t: "the yards at {name:ev_town} were lit in {num:ev_year}", req: () => true },
        { t: "the money arrived at {name:ev_town} and the charter followed it", req: () => true },
        { t: "aetherworks were put up at {name:ev_town} because the assay said so", req: () => true },
        { t: "{name:capital} chartered what the magnates had already begun at {name:ev_town}", req: () => true },
      ],
      refinery_founded_gloss: [
        { t: "the capital sealed the charter, and the trunk line reached {name:ev_town} within the season", req: () => true },
        { t: "{name:capital} called it progress, and the towns the new trunk line skipped did not", req: () => true },
        { t: "where the ore was rich the money followed, and the grid was run out to meet {name:ev_town}", req: () => true },
        { t: "the lumen came online that year, and {name:ev_town} doubled before the next census could count it", req: () => true },
        { t: "the wires reached {name:ev_town} fast, because somebody had already decided the ore was worth the copper", req: () => true },
        { t: "no charter had ever been sealed that quickly for anything {name:ev_town} needed", req: () => true },
        { t: "the copper to {name:ev_town} was laid faster than any road ever was", req: () => true },
        { t: "{name:ev_town} was worth wiring the moment it was worth extracting from", req: () => true },
        { t: "the census could not keep up with {name:ev_town} for a decade", req: () => true },
        { t: "{name:ev_town} was wired before it was paved", req: () => true },
        { t: "the census at {name:ev_town} was out of date within the year", req: () => true },
        { t: "the copper reached {name:ev_town} on the strength of an assay", req: () => true },
        { t: "everything {name:ev_town} got, it got because the ore was worth it", req: () => true },
      ],

      // -- the blight and the old power ---------------------------------------
      blight_plague: [
        { t: "plague took {name:ev_town}", req: () => true },
        { t: "sickness came to {name:ev_town} in {num:ev_year}", req: () => true },
        { t: "a plague settled on {name:ev_town}", req: () => true },
        { t: "fever ran through {name:ev_town}", req: () => true },
        { t: "the sickness reached {name:ev_town} and stayed", req: () => true },
        { t: "{name:ev_town} was taken by the sickness in {num:ev_year}", req: () => true },
        { t: "the fever found {name:ev_town} on ground already poisoned", req: () => true },
        { t: "what came to {name:ev_town} was a plague on top of a blight", req: () => true },
        { t: "{name:ev_town} lost a third of itself to a fever", req: () => true },
        { t: "the sickness came to {name:ev_town} and the blight had prepared the ground", req: () => true },
        { t: "in {num:ev_year} the fever reached {name:ev_town} and did not leave", req: () => true },
        { t: "what arrived at {name:ev_town} finished what the poison had started", req: () => true },
        { t: "{name:ev_town} was ill before it was infected", req: () => true },
      ],
      blight_plague_gloss: [
        { t: "the blight had sat heavy on {name:ev_town} for years, so the fever arrived to a town already half-poisoned", req: () => true },
        { t: "a third of {name:ev_town} died or fled", req: () => true },
        { t: "the registers do not agree on the death count, and the roads out of {name:ev_town} do", req: () => true },
        { t: "the ground had been fouled long before the fever came, and whole streets of {name:ev_town} went quiet", req: () => true },
        { t: "the burial rolls at {name:ev_town} ran longer than the tax rolls that year", req: () => true },
        { t: "those who could walk left {name:ev_town}, and those who could not were counted after", req: () => true },
        { t: "the healers at {name:ev_town} counted what they could and stopped counting", req: () => true },
        { t: "the blight had made {name:ev_town} ready for it years before", req: () => true },
        { t: "the road out of {name:ev_town} was the only remedy anyone could afford", req: () => true },
        { t: "the healers at {name:ev_town} ran out of everything except paper", req: () => true },
        { t: "the dead at {name:ev_town} were counted where they could be counted", req: () => true },
        { t: "the road out of {name:ev_town} was the only treatment on offer", req: () => true },
        { t: "the tax rolls at {name:ev_town} were shorter the following year and were collected in full", req: () => true },
        { t: "nothing that reached {name:ev_town} that year came to help", req: () => true },
      ],
      blight_plague_name: [
        { t: "the roads named it {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is what the roads out of {name:ev_town} still call that year", req: c => c.hasEvName },
        { t: "the scribes wrote it down as {name:ev_name} and moved on", req: c => c.hasEvName },
        { t: "the year is entered as {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is the heading, and the count under it is an estimate", req: c => c.hasEvName },
        { t: "the clerks called it {name:ev_name} because the year needed a name", req: c => c.hasEvName },
        { t: "it stands as {name:ev_name} in every copy that survives", req: c => c.hasEvName },
        { t: "{name:ev_name} is what the burial rolls are filed under", req: c => c.hasEvName },
      ],
      relic_calamity: [
        { t: "the sanctioned ground by {name:ev_town} woke", req: () => true },
        { t: "something of the old world stirred and broke in the ground by {name:ev_town}", req: () => true },
        { t: "something old came awake under {name:ev_town} in {num:ev_year}", req: () => true },
        { t: "the buried power near {name:ev_town} turned over in its sleep", req: () => true },
        { t: "whatever the old world left under {name:ev_town} broke loose", req: () => true },
        { t: "the old ground by {name:ev_town} let something out", req: () => true },
        { t: "in {num:ev_year} something under {name:ev_town} stopped sleeping", req: () => true },
        { t: "the sanctioned site by {name:ev_town} failed, and what it held did not stay held", req: () => true },
        { t: "the sanctioned ground by {name:ev_town} gave way in {num:ev_year}", req: () => true },
        { t: "what was buried under {name:ev_town} did not stay buried", req: () => true },
      ],
      relic_calamity_gloss: [
        { t: "the surviving accounts do not say what the old power did at {name:ev_town}, and the land it touched still carries the scar", req: () => true },
        { t: "the Temple calls it a test, the survivors did not, and the blight around {name:ev_town} has not faded", req: () => true },
        { t: "no two accounts agree on what it was, and what it left is plain enough: ground by {name:ev_town} that will not grow", req: () => true },
        { t: "the Temple sealed the site and said little, and the scar it burned into the country by {name:ev_town} is still there to read", req: () => true },
        { t: "the records are thin and frightened, and the blighted ring around {name:ev_town} kept everyone honest about that much", req: () => true },
        { t: "the accounts from {name:ev_town} are short, and they are short because of who wrote them", req: () => true },
        { t: "the Temple's version and the survivors' version of {name:ev_town} agree on nothing but the scar", req: () => true },
        { t: "the ring of dead ground around {name:ev_town} is the only part of it nobody disputes", req: () => true },
        { t: "the ring of dead ground around {name:ev_town} is the only undisputed part of it", req: () => true },
        { t: "the Temple sealed the site at {name:ev_town} and wrote the account", req: () => true },
      ],

      // -- ore, and what follows ore ------------------------------------------
      ore_strike: [
        { t: "prospectors struck a hidden lode under {name:ev_town}", req: () => true },
        { t: "a lode no survey had found came up under {name:ev_town} in {num:ev_year}", req: () => true },
        { t: "diggers hit rich ore under {name:ev_town} where nobody had thought to look", req: () => true },
        { t: "a new seam opened under {name:ev_town}", req: () => true },
        { t: "the ground under {name:ev_town} gave up a lode nobody had mapped", req: () => true },
        { t: "a seam came up under {name:ev_town} that no chart had", req: () => true },
        { t: "in {num:ev_year} the ground under {name:ev_town} turned out to be worth something", req: () => true },
        { t: "the ore under {name:ev_town} was found by people who were not looking for it", req: () => true },
        { t: "{name:ev_town} was standing on a lode and did not know it", req: () => true },
      ],
      ore_strike_gloss: [
        { t: "by winter the roads were full of wagons and {name:ev_town} was full of strangers", req: () => true },
        { t: "the rush was immediate: retainers, chancers, assayers, and everyone who trails them into {name:ev_town}", req: () => true },
        { t: "within a season {name:ev_town} had tripled, and the price of a bed had tripled with it", req: () => true },
        { t: "word travels fast where ore is concerned, and the strangers were on the {name:ev_town} road before the assay was filed", req: () => true },
        { t: "{name:ev_town} filled overnight with people who had nothing but a shovel and a claim", req: () => true },
        { t: "the road to {name:ev_town} filled with people who owned a shovel and a claim", req: () => true },
        { t: "assayers, chancers and retainers were at {name:ev_town} inside a season", req: () => true },
        { t: "the price of everything at {name:ev_town} moved before the ore did", req: () => true },
        { t: "{name:ev_town} tripled and none of the tripling was planned for", req: () => true },
      ],
      ore_strike_war: [
        { t: "the ground under {name:ev_town} was already disputed, and every magnate, priest and captain in the realm knew what a lode there meant", req: c => c.strikeWar },
        { t: "armies were on the {name:ev_town} road inside two epochs, because armies follow ore", req: c => c.strikeWar },
        { t: "what was found under {name:ev_town} was worth fighting for, and it was fought for", req: c => c.strikeWar },
        { t: "what came up under {name:ev_town} was worth an army, and an army came", req: c => c.strikeWar },
        { t: "the claim on the {name:ev_town} ground was disputed before the assay was filed", req: c => c.strikeWar },
        { t: "every power in the realm read the {name:ev_town} assay the same way", req: c => c.strikeWar },
      ],
      war: [
        { t: "war came to {name:ev_town}", req: c => !c.warChained },
        { t: "the fighting reached {name:ev_town} in {num:ev_year}", req: c => !c.warChained },
        { t: "{name:ev_town} became the ground two powers met on", req: c => !c.warChained },
        { t: "war came to {name:ev_town}, {num:war_gap} years after the strike, because armies follow ore", req: c => c.warChained },
        { t: "{num:war_gap} years after the lode was found, the armies arrived at {name:ev_town}", req: c => c.warChained },
        { t: "the ore under {name:ev_town} drew the armies to it within {num:war_gap} years", req: c => c.warChained },
        { t: "the fighting came to {name:ev_town} and stayed a season", req: c => !c.warChained },
        { t: "armies met at {name:ev_town} in {num:ev_year}", req: c => !c.warChained },
        { t: "{name:ev_town} was where two claims came to blows", req: c => !c.warChained },
        { t: "the strike under {name:ev_town} brought the armies within {num:war_gap} years", req: c => c.warChained },
        { t: "{name:ev_town} was fought over {num:war_gap} years after the ore was found under it", req: c => c.warChained },
      ],
      war_powers: [
        { t: "the two powers fighting there were {term:war_powers}, and {name:ev_town} was just where they met", req: c => c.hasWarPowers },
        { t: "{term:war_powers} did the fighting, and {name:ev_town} did the dying", req: c => c.hasWarPowers },
        { t: "it comes to ground that great powers claim and none can hold, and {name:ev_town} was claimed by two", req: c => !c.hasWarPowers },
        { t: "war goes where a claim is worth more than the people standing on it, which was the case at {name:ev_town}", req: c => !c.hasWarPowers },
        { t: "{term:war_powers} met at {name:ev_town}, which had no part in the quarrel", req: c => c.hasWarPowers },
        { t: "the quarrel belonged to {term:war_powers} and the ground belonged to {name:ev_town}", req: c => c.hasWarPowers },
        { t: "{name:ev_town} was claimed by more than one power and held by none of them", req: c => !c.hasWarPowers },
        { t: "nothing about {name:ev_town} caused it except where {name:ev_town} stands", req: c => !c.hasWarPowers },
      ],
      war_loss: [
        { t: "when the fighting stopped, {term:ev_tier} had lost a third of its people and a quarter of its wealth", req: () => true },
        { t: "the mines and aetherworks at {name:ev_town} were wrecked, and a third of the people were gone", req: () => true },
        { t: "{term:ev_tier} came out of it a third smaller and a quarter poorer, and the constabulary arrived after the blood and stayed", req: () => true },
        { t: "a quarter of the wealth of {name:ev_town} was gone and the Crown's constabulary was in the streets by spring", req: () => true },
        { t: "{term:ev_tier} lost a third of its people and a quarter of what it had", req: () => true },
        { t: "the yards and the mines at {name:ev_town} were wrecked and the constabulary stayed on", req: () => true },
        { t: "what {name:ev_town} lost was a third of its people and a quarter of its coin", req: () => true },
        { t: "{term:ev_tier} was a third emptier at the end of it", req: () => true },
        { t: "the fighting cost {name:ev_town} a third of its people and the constabulary stayed on", req: () => true },
        { t: "{term:ev_tier} was poorer by a quarter and emptier by a third when it stopped", req: () => true },
      ],
      war_name: [
        { t: "the scribes titled the page {name:ev_name}", req: c => c.hasEvName },
        { t: "the fair copy at {name:capital} is headed {name:ev_name}", req: c => c.hasEvName },
        { t: "it is filed at {name:capital} under {name:ev_name}", req: c => c.hasEvName },
        { t: "the page at {name:capital} is headed {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is what the clerks agreed to call it", req: c => c.hasEvName },
        { t: "it survives as {name:ev_name} in both sides' copies", req: c => c.hasEvName },
      ],

      // -- the gates ----------------------------------------------------------
      seizure: [
        { t: "{term:ev_faction} took the gate at {name:ev_town}", req: () => true },
        { t: "{term:ev_faction} pressed {term:ev_their} claim on the crossing at {name:ev_town}", req: () => true },
        { t: "{term:ev_faction} seized the crossing at {name:ev_town} in {num:ev_year}", req: () => true },
        { t: "{term:ev_faction} moved on the gate at {name:ev_town} and held it", req: () => true },
        { t: "{term:ev_faction} claimed the gate at {name:ev_town} for {term:ev_their} own", req: () => true },
        { t: "{term:ev_faction} put a claim on the {name:ev_town} crossing and made it stick", req: () => true },
        { t: "the gate at {name:ev_town} changed hands in {num:ev_year}, to {term:ev_faction}", req: () => true },
        { t: "{term:ev_faction} came for the narrow ground at {name:ev_town}", req: () => true },
        { t: "what {term:ev_faction} wanted at {name:ev_town} was the crossing, and {term:ev_faction} got it", req: () => true },
        { t: "the crossing at {name:ev_town} belonged to {term:ev_faction} by the end of the year", req: () => true },
        { t: "the crossing at {name:ev_town} was taken in {num:ev_year} and has not changed hands since", req: () => true },
        { t: "{term:ev_faction} decided the gate at {name:ev_town} was worth having", req: () => true },
        { t: "the {name:ev_town} gate went to {term:ev_faction} on a claim nobody contested", req: () => true },
        { t: "{term:ev_faction} arrived at {name:ev_town} with a document and left with a gate", req: () => true },
        { t: "a claim was filed on the {name:ev_town} crossing and enforced the same season", req: () => true },
        { t: "{term:ev_faction} put a post on the {name:ev_town} road and called it a gate", req: () => true },
      ],
      seizure_gloss: [
        { t: "a gate is a quay, a span or a pass, and whoever holds one holds a line of people who cannot go around {name:ev_town}", req: () => true },
        { t: "no blood is recorded, the claim was made on paper, and the tariff at {name:ev_town} kept it", req: () => true },
        { t: "whoever holds the narrow ground sets the price to pass it, and the price at {name:ev_town} went up that season", req: () => true },
        { t: "there was no fight worth recording, and the first tariff notice at {name:ev_town} went up before the ink on the claim was dry", req: () => true },
        { t: "the people who used the {name:ev_town} crossing found the fee waiting the next market day", req: () => true },
        { t: "nothing about the crossing at {name:ev_town} changed except who collected at it", req: () => true },
        { t: "the notice went up at {name:ev_town} and the queue formed under it the same week", req: () => true },
        { t: "{term:ev_faction} did not build the crossing at {name:ev_town} and {term:ev_faction} collects at it", req: () => true },
        { t: "everyone who crosses at {name:ev_town} still crosses, and now pays for the privilege", req: () => true },
        { t: "the register at {name:capital} records a transfer and no objection", req: () => true },
        { t: "the tariff post at {name:ev_town} went up before the claim was answered", req: () => true },
        { t: "nothing changed at {name:ev_town} except who stands at the far end", req: () => true },
        { t: "the crossing at {name:ev_town} was built by people who now pay to use it", req: () => true },
        { t: "{term:ev_faction} collects at {name:ev_town} and maintains nothing", req: () => true },
        { t: "everyone who goes through {name:ev_town} still goes through, and pays", req: () => true },
        { t: "the fee at {name:ev_town} was set by whoever could set it", req: () => true },
      ],

      // -- the towers ---------------------------------------------------------
      tower_burned: [
        { t: "{term:ev_burner} burned the tower at {name:ev_town}", req: () => true },
        { t: "{term:ev_burner} came for the tower at {name:ev_town} and left ash", req: () => true },
        { t: "the tower at {name:ev_town} was burned out by {term:ev_burner}", req: () => true },
        { t: "in {num:ev_year} {term:ev_burner} put the {name:ev_town} tower to the torch", req: () => true },
        { t: "{term:ev_burner} took the {name:ev_town} tower down in {num:ev_year}", req: () => true },
        { t: "the tower at {name:ev_town} was found and burned", req: () => true },
        { t: "what stood outside the writ at {name:ev_town} was burned by {term:ev_burner}", req: () => true },
        { t: "the {name:ev_town} tower came down in {num:ev_year}", req: () => true },
        { t: "the tower outside {name:ev_town} was found and destroyed", req: () => true },
        { t: "{term:ev_burner} reached {name:ev_town} and left nothing standing at the tower", req: () => true },
      ],
      tower_burned_gloss: [
        { t: "the writs do not say what this cost, and the one healer the darkness at {name:ev_town} had is gone", req: () => true },
        { t: "nothing came to replace it, and {name:ev_town} keeps its darkness", req: () => true },
        { t: "the charge was written down and the loss was not, which is the usual shape of a writ out of {name:capital}", req: () => true },
        { t: "whoever came to the {name:ev_town} tower for medicine now does without, and the writ has no line for that", req: () => true },
        { t: "the darkness at {name:ev_town} was there before the tower and is there after it", req: () => true },
        { t: "nothing was chartered to replace it at {name:ev_town}, and nothing arrived unchartered either", req: () => true },
        { t: "the {name:capital} writ counted the offence and not the treatment", req: () => true },
        { t: "the offence was recorded at {name:capital} and the loss was not", req: () => true },
        { t: "what {name:ev_town} lost was the only medicine that had ever come to it", req: () => true },
        { t: "the writ records an offence at {name:ev_town} and no consequence", req: () => true },
      ],
      tower_raised: [
        { t: "an apostate raised a tower at {name:ev_town}, out where no writ runs and the grid never came", req: () => true },
        { t: "a tower went up at {name:ev_town} in {num:ev_year}, unchartered and unwired", req: () => true },
        { t: "somebody raised a tower on the dark ground at {name:ev_town}", req: () => true },
        { t: "an apostate set up at {name:ev_town}, past the last wire and the last writ", req: () => true },
        { t: "a tower was raised beyond the writ at {name:ev_town}", req: () => true },
        { t: "somebody set up at {name:ev_town} where the grid had never come", req: () => true },
        { t: "the dark country around {name:ev_town} got a healer in {num:ev_year}", req: () => true },
        { t: "a healer set up beyond the writ at {name:ev_town}", req: () => true },
        { t: "a tower stood at {name:ev_town} by the end of {num:ev_year}, chartered by nobody", req: () => true },
        { t: "somebody came to the dark ground at {name:ev_town} and stayed", req: () => true },
      ],
      tower_raised_gloss: [
        { t: "nobody at {name:ev_town} reported it for a season, and they were its first customers", req: () => true },
        { t: "nobody at {name:ev_town} reported it, because the alternative was nothing at all", req: () => true },
        { t: "the writ that would have stopped it does not reach {name:ev_town}, which is why it was raised there", req: () => true },
        { t: "what it sells is what the grid never carried to {name:ev_town}", req: () => true },
        { t: "an apostate at {name:ev_town} is what the absence of everything else produces", req: () => true },
        { t: "it was reported eventually, and by then everyone at {name:ev_town} had used it", req: () => true },
        { t: "the charter that forbids it does not run as far as {name:ev_town}", req: () => true },
        { t: "the wire never came to {name:ev_town} and this did", req: () => true },
        { t: "{name:ev_town} had nothing else and did not report it", req: () => true },
        { t: "the wire had refused {name:ev_town} and this had not", req: () => true },
      ],

      // -- the succession -----------------------------------------------------
      succession: [
        { t: "the old {term:ev_title} died, and the succession was contested", req: c => c.evContested },
        { t: "the {term:ev_title} died in {num:ev_year} and left no undisputed heir", req: c => c.evContested },
        { t: "the death of the {term:ev_title} opened a quarrel that ran for years", req: c => c.evContested },
        { t: "{term:ev_place} stood empty for a season after the {term:ev_title} died", req: c => c.evContested },
        { t: "two claims were pressed on {term:ev_place} in {num:ev_year}, and neither would yield", req: c => c.evContested },
        { t: "the {term:ev_title} died without settling who came next", req: c => c.evContested },
        { t: "the succession to {term:ev_place} was fought over rather than decided", req: c => c.evContested },
        { t: "when the {term:ev_title} died the question of {term:ev_place} was open, and it stayed open", req: c => c.evContested },
        { t: "the {term:ev_title} left an heir and a rival, which is to say no heir at all", req: c => c.evContested },
        { t: "there was a body in {num:ev_year} and no agreed successor to it", req: c => c.evContested },
        { t: "the old {term:ev_title} died, and {name:ev_name} took {term:ev_place} without incident", req: c => !c.evContested },
        { t: "the {term:ev_title} died in {num:ev_year} and the succession went as written, to {name:ev_name}", req: c => !c.evContested },
        { t: "{name:ev_name} succeeded the old {term:ev_title} and nobody contested it", req: c => !c.evContested },
        { t: "{term:ev_place} passed to {name:ev_name} in {num:ev_year}, exactly as the charter said it would", req: c => !c.evContested },
        { t: "the {term:ev_title} died, and {name:ev_name} was already the answer", req: c => !c.evContested },
        { t: "there was a funeral, and then {name:ev_name} held {term:ev_place}", req: c => !c.evContested },
        { t: "{name:ev_name} came to {term:ev_place} by the ordinary route", req: c => !c.evContested },
        { t: "the {term:ev_title} died in {num:ev_year}, and the transfer of {term:ev_place} took a fortnight", req: c => !c.evContested },
        { t: "no claim was pressed against {name:ev_name}, so {name:ev_name} took {term:ev_place}", req: c => !c.evContested },
        { t: "the succession of {num:ev_year} was uneventful, and {name:ev_name} is the name it produced", req: c => !c.evContested },
        { t: "the {term:ev_title} died in {num:ev_year} with two claims outstanding", req: c => c.evContested },
        { t: "nothing was settled when the {term:ev_title} died, least of all {term:ev_place}", req: c => c.evContested },
        { t: "the quarrel over {term:ev_place} began at a funeral", req: c => c.evContested },
        { t: "{term:ev_place} was claimed twice over in {num:ev_year}", req: c => c.evContested },
        { t: "the {term:ev_title} died and left the question of {term:ev_place} to whoever could take it", req: c => c.evContested },
        { t: "the succession of {num:ev_year} was decided by force and recorded as a succession", req: c => c.evContested },
        { t: "{name:ev_name} took {term:ev_place} in {num:ev_year} and the old {term:ev_title} was buried first", req: c => !c.evContested },
        { t: "the {term:ev_title} died and the charter answered the question", req: c => !c.evContested },
        { t: "{term:ev_place} passed quietly to {name:ev_name}", req: c => !c.evContested },
        { t: "nothing was disputed when the {term:ev_title} died, and {name:ev_name} took {term:ev_place}", req: c => !c.evContested },
        { t: "the {term:ev_title} was buried and {name:ev_name} was installed in the same month", req: c => !c.evContested },
        { t: "{name:ev_name} inherited {term:ev_place} against no opposition at all", req: c => !c.evContested },
      ],
      succession_gloss: [
        { t: "while the court fought itself the gates went unwatched, and the rivals of {name:capital} moved in", req: c => c.evContested },
        { t: "in the end {name:ev_name} took {term:ev_place}, and some who objected were killed", req: c => c.evContested },
        { t: "the objections did not stop, and {name:ev_name} held {term:ev_place} anyway", req: c => c.evContested },
        { t: "{name:ev_name} came out of it holding {term:ev_place}, which is all this record will commit to", req: c => c.evContested },
        { t: "nothing was governed for the length of it, and the {num:n_regions} regions noticed", req: c => c.evContested },
        { t: "the quarrel was settled the way quarrels over {term:ev_place} are settled, and {name:ev_name} settled it", req: c => c.evContested },
        { t: "{name:ev_name} was not the obvious claimant and is the one who is written down", req: c => c.evContested },
        { t: "the clerks at {name:capital} recorded the outcome and not the method", req: c => c.evContested },
        { t: "by the end of it {name:ev_name} held {term:ev_place} and the treasury held less", req: c => c.evContested },
        { t: "the rivals to {name:ev_name} are not named here, which is itself a kind of record", req: c => c.evContested },
        { t: "that is rare enough in this record to be worth the ink, and {name:ev_name} held {term:ev_place} for the rest of the reign", req: c => !c.evContested },
        { t: "no gate changed hands over it, which the clerks at {name:capital} noted as unusual", req: c => !c.evContested },
        { t: "the {num:n_regions} regions carried on as though nothing had happened, because nothing had", req: c => !c.evContested },
        { t: "the treasury at {name:capital} paid for a funeral and for nothing else", req: c => !c.evContested },
        { t: "{name:ev_name} inherited the arrangement whole and changed none of it", req: c => !c.evContested },
        { t: "the ledgers at {name:capital} did not move, which is the only test of a succession that matters", req: c => !c.evContested },
        { t: "what {name:ev_name} inherited was the arrangement and not the choosing of it", req: c => !c.evContested },
        { t: "the entry at {name:capital} runs to one line, and that is generous", req: c => !c.evContested },
        { t: "nobody in the {num:n_regions} regions was consulted, and nobody expected to be", req: c => !c.evContested },
        { t: "the peaceful ones are the short entries, and {name:ev_name} got a short entry", req: c => !c.evContested },
        { t: "the gates went unwatched for as long as it lasted, and the rivals of {name:capital} noticed", req: c => c.evContested },
        { t: "what settled it was not law, and {name:ev_name} is who it settled on", req: c => c.evContested },
        { t: "the register at {name:capital} names the survivor and not the dispute", req: c => c.evContested },
        { t: "nothing in the {num:n_regions} regions was governed while it ran, and it ran for years", req: c => c.evContested },
        { t: "{name:ev_name} held {term:ev_place} at the end of it and holds it still", req: c => c.evContested },
        { t: "the objections were entered at {name:capital} and the objectors were not heard from again", req: c => c.evContested },
        { t: "nothing in the {num:n_regions} regions moved on account of it", req: c => !c.evContested },
        { t: "the ledgers at {name:capital} carried on without a correction", req: c => !c.evContested },
        { t: "{name:ev_name} took the arrangement as found and left it as found", req: c => !c.evContested },
        { t: "what changed at {name:capital} was a name at the head of the page", req: c => !c.evContested },
        { t: "the {num:n_regions} regions were told and were not asked", req: c => !c.evContested },
        { t: "a quiet succession gets three lines in the {name:capital} register, and this one got three", req: c => !c.evContested },
      ],

      succession_coda: [
        { t: "in none of the {num:n_regions} regions is a {term:ev_title} chosen by the people who live under one, and {name:ev_name} is no exception", req: () => true },
        { t: "the {term:ev_title} changes and the arrangement does not, and {name:ev_name} inherits it entire", req: () => true },
        { t: "the {num:n_regions} regions were told afterwards that {name:ev_name} held it", req: () => true },
        { t: "{name:capital} kept the date and the name {name:ev_name} and dropped everything else", req: () => true },
        { t: "what a {term:ev_title} inherits is a ledger, and the ledger at {name:capital} did not change hands with {name:ev_name}", req: () => true },
        { t: "the {num:n_regions} regions were informed by notice that {name:ev_name} had the title", req: () => true },
        { t: "nothing about the arrangement over {num:n_regions} regions turned on whether the name was {name:ev_name}", req: () => true },
        { t: "the ledger at {name:capital} did not notice that a {term:ev_title} had become {name:ev_name}", req: () => true },
        { t: "the title at {name:capital} changed to {name:ev_name} and the arrangement did not", req: () => true },
        { t: "what {name:ev_name} inherits across {num:n_regions} regions is a ledger, and it did not move", req: () => true },
        { t: "neither the ledger nor the map at {name:capital} records that {name:ev_name} arrived", req: () => true },
        { t: "across {num:n_regions} regions the only thing that changed was a name, and the name is {name:ev_name}", req: () => true },
        { t: "{name:ev_name} inherits a {term:ev_title}'s ledger and none of a {term:ev_title}'s choices", req: () => true },
        { t: "what {name:ev_name} took was an office, and the office had already been settled", req: () => true },
        { t: "the {num:n_regions} regions kept paying through it, to {name:ev_name} instead", req: () => true },
        { t: "nothing in {name:capital} was decided by the arrival of {name:ev_name}", req: () => true },
      ],
      seizure_coda: [
        { t: "a gate is worth what the people who must cross it can be made to pay, and {name:ev_town} could be made to pay", req: () => true },
        { t: "one more of the realm's {num:n_regions} regions now pays to leave itself", req: () => true },
        { t: "nobody who crosses at {name:ev_town} was asked, and nobody who crosses there has another way round", req: () => true },
        { t: "gates are the cheapest thing in the realm to take and the dearest to be under, at {name:ev_town} as anywhere", req: () => true },
        { t: "the {num:n_regions} regions gained no road that year and lost a free one", req: () => true },
        { t: "gates are cheap to take and dear to be under, at {name:ev_town} as everywhere", req: () => true },
        { t: "the crossing at {name:ev_town} cost nothing to build and pays forever", req: () => true },
        { t: "one more of the {num:n_regions} regions now pays a stranger to leave itself", req: () => true },
        { t: "nobody who crosses at {name:ev_town} was asked, and nobody has a second road", req: () => true },
        { t: "the {num:n_regions} regions gained no road that year and lost a free crossing", req: () => true },
      ],

      // -- what the capital decides -------------------------------------------
      reform: [
        { t: "{name:capital} passed {term:ev_measure}", req: () => true },
        { t: "{term:ev_measure} was passed at {name:capital} in {num:ev_year}", req: () => true },
        { t: "in {num:ev_year} the capital gave way and passed {term:ev_measure}", req: () => true },
        { t: "{name:capital} put {term:ev_measure} on the books", req: () => true },
        { t: "{term:ev_measure} was carried at {name:capital}", req: () => true },
        { t: "in {num:ev_year} {name:capital} passed {term:ev_measure} and said little about why", req: () => true },
        { t: "the capital carried {term:ev_measure} in {num:ev_year}", req: () => true },
        { t: "{term:ev_measure} passed at {name:capital} after years of not passing", req: () => true },
        { t: "{name:capital} conceded {term:ev_measure}", req: () => true },
        { t: "after years of refusal, {term:ev_measure} came out of {name:capital}", req: () => true },
      ],
      reform_gloss: [
        { t: "the spoil trains out of {name:capital} now go where the land is empty, not where the people are poor", req: c => c.evMeasure === "dumping_reform" },
        { t: "the bar for connection dropped, and the wires ran further from {name:capital} than the ledgers alone would ever have carried them", req: c => c.evMeasure === "grid_charter" },
        { t: "the gates still stand, but their fees are capped by decree out of {name:capital}", req: c => c.evMeasure === "toll_amnesty" },
        { t: "it set a floor under the ore price, fixed at {name:capital}, so the bottom half of the realm keeps more of what its own ground produces", req: c => c.evMeasure === "retention_act" },
        { t: "it taxes the fat years to buy bread for the lean ones, and it is the first decree in the history of {name:capital} to move coin downhill", req: c => c.evMeasure === "crown_granary" },
        { t: "the spoil now goes to empty ground rather than poor ground, by order of {name:capital}", req: c => c.evMeasure === 'dumping_reform' },
        { t: "where the spoil trains unload was, for the first time, decided at {name:capital} on something other than price", req: c => c.evMeasure === 'dumping_reform' },
        { t: "the connection bar was lowered and the wire went past the {num:n_regions} regions where it repaid itself", req: c => c.evMeasure === 'grid_charter' },
        { t: "for once the copper out of {name:capital} was laid ahead of the ledger rather than behind it", req: c => c.evMeasure === 'grid_charter' },
        { t: "the fees at every gate were capped by decree out of {name:capital}, and the gates were left standing", req: c => c.evMeasure === 'toll_amnesty' },
        { t: "{name:capital} capped what the gates may charge and did not touch who holds them", req: c => c.evMeasure === 'toll_amnesty' },
        { t: "a floor was fixed at {name:capital} under the ore price, so the poorer half keeps more of its own ground's yield", req: c => c.evMeasure === 'retention_act' },
        { t: "the price is now set at {name:capital} rather than at the gate, which moves coin the unusual way", req: c => c.evMeasure === 'retention_act' },
        { t: "the fat years are taxed at {name:capital} to buy bread for the lean ones", req: c => c.evMeasure === 'crown_granary' },
        { t: "it is the first measure in the {name:capital} register that moves coin downhill on purpose", req: c => c.evMeasure === 'crown_granary' },
      ],
      reform_coda: [
        { t: "{name:capital} had blocked reform for years and only gave in once the damage was bad enough", req: () => true },
        { t: "no measure like it had passed at {name:capital} while the harm was merely predictable", req: () => true },
        { t: "it was not passed because it was right, it was passed because the harm across {num:n_regions} regions had grown more expensive than the remedy", req: () => true },
        { t: "{name:capital} had heard the argument for years and acted on the arithmetic", req: () => true },
        { t: "the {num:n_regions} regions had been petitioning about it since before it was cheap to fix", req: () => true },
        { t: "the {num:n_regions} regions had asked for it before it was cheap to grant", req: () => true },
        { t: "{name:capital} conceded the arithmetic, not the argument", req: () => true },
        { t: "nothing in the {name:capital} register credits anyone with having been right earlier", req: () => true },
      ],
      reaction: [
        { t: "{name:capital} met the unrest with force", req: () => true },
        { t: "the answer out of {name:capital} was force, not remedy", req: () => true },
        { t: "in {num:ev_year} the capital answered the unrest by hardening", req: () => true },
        { t: "{name:capital} answered with a decree rather than a remedy", req: () => true },
        { t: "the unrest was met, in {num:ev_year}, with more of what had caused it", req: () => true },
        { t: "{name:capital} hardened rather than yielded", req: () => true },
        { t: "{name:capital} answered the unrest with the instrument that had caused it", req: () => true },
        { t: "the decree out of {name:capital} in {num:ev_year} went the other way", req: () => true },
      ],
      reaction_gloss: [
        { t: "the dumping was written into the law of {name:capital}, and the spoil trains sought out the poor more openly than before", req: c => c.evMeasure === "dumping_entrenched" },
        { t: "the tariffs rose by decree, because the gates' holders had paid {name:capital} for their privileges and were owed", req: c => c.evMeasure === "toll_crackdown" },
        { t: "the spoil trains were licensed to do openly what they had done anyway, and {name:capital} wrote it down", req: c => c.evMeasure === 'dumping_entrenched' },
        { t: "dumping stopped being a practice at {name:capital} and started being a policy", req: c => c.evMeasure === 'dumping_entrenched' },
        { t: "the gate holders had bought their privileges from {name:capital} and were paid in tariff", req: c => c.evMeasure === 'toll_crackdown' },
        { t: "the rates went up because a debt to the gate holders came due at {name:capital}", req: c => c.evMeasure === 'toll_crackdown' },
      ],
      reaction_coda: [
        { t: "there was no debate on record at {name:capital}", req: () => true },
        { t: "the registers at {name:capital} keep the decree and not one word of argument", req: () => true },
        { t: "the {num:n_regions} regions were informed rather than consulted", req: () => true },
        { t: "the {num:n_regions} regions found out afterwards, from the notice", req: () => true },
        { t: "nothing in the {name:capital} register suggests anybody argued against it", req: () => true },
        { t: "nobody in the {num:n_regions} regions was asked and nobody expected to be", req: () => true },
        { t: "the {name:capital} register has the decree and no argument beside it", req: () => true },
        { t: "what {name:capital} met with force it had met with nothing for a decade", req: () => true },
      ],
      // B7 (#129): a measure the realm did not choose, narrated AS imposed.
      imposition: [
        { t: "this measure did not come from {name:capital}, it came from the creditors of {name:capital}", req: () => true },
        { t: "the adjustment of {num:ev_year} was written in another capital and signed in {name:capital}", req: () => true },
        { t: "the decree of {num:ev_year} was not the realm's to make", req: () => true },
        { t: "what {name:capital} signed in {num:ev_year} was written by its creditors", req: () => true },
        { t: "the adjustment reached {name:capital} as a condition and not as a proposal", req: () => true },
        { t: "the terms reached {name:capital} in {num:ev_year} already written", req: () => true },
        { t: "{name:capital} was told what its policy would be", req: () => true },
        { t: "the measure of {num:ev_year} arrived as a condition of credit", req: () => true },
      ],
      imposition_gloss: [
        { t: "the imperial loans had gone unpaid and the doctrine was pressing abroad, so the financiers demanded an adjustment of {name:capital}", req: () => true },
        { t: "close the granary, order the gates to collect, and balance the books on whichever of the {num:n_regions} regions could least afford it", req: () => true },
        { t: "the terms were set by people who hold none of the {num:n_regions} regions and are owed by all of them", req: () => true },
        { t: "the loans were unpaid and the doctrine was fashionable, and between them they set policy for {num:n_regions} regions", req: () => true },
        { t: "the granary was closed and the gates were ordered to collect, and neither was {name:capital}'s idea", req: () => true },
        { t: "the granary was closed and the gates were told to collect, and neither came from {name:capital}", req: () => true },
        { t: "the financiers required an adjustment of {name:capital} and named its terms", req: () => true },
        { t: "the books of {num:n_regions} regions were balanced on whoever could least object", req: () => true },
      ],
      imposition_coda: [
        { t: "the official term is structural adjustment, and the towns of the {num:n_regions} regions called it a decree written in another capital", req: () => true },
        { t: "{name:capital} kept its seal on the paper and nothing else", req: () => true },
        { t: "what {name:capital} could not be argued into it was lent into", req: () => true },
        { t: "the towns of the {num:n_regions} regions had a word for structural adjustment and it was not that one", req: () => true },
        { t: "sovereignty at {name:capital} survived the year and did not do anything during it", req: () => true },
        { t: "sovereignty at {name:capital} survived the year without doing anything in it", req: () => true },
        { t: "the towns of the {num:n_regions} regions had their own word for structural adjustment", req: () => true },
        { t: "what {name:capital} would not be argued into it was lent into", req: () => true },
      ],

      // -- the risings --------------------------------------------------------
      revolt: [
        { t: "{name:ev_town} rose against the Dominion itself, and won", req: c => c.evDominion && c.evWon },
        { t: "{name:ev_town} threw the Dominion out in {num:ev_year}", req: c => c.evDominion && c.evWon },
        { t: "{name:ev_town} rose against the Dominion, and the imperial constabulary put it down", req: c => c.evDominion && !c.evWon },
        { t: "the rising at {name:ev_town} was broken by the imperial constabulary, which is what the imperial constabulary is there to do", req: c => c.evDominion && !c.evWon },
        { t: "{name:ev_town} rose, the constabulary line broke, and the mob held", req: c => !c.evDominion && c.evWon },
        { t: "{name:ev_town} rose in {num:ev_year} and was not put down", req: c => !c.evDominion && c.evWon },
        { t: "{name:ev_town} rose in {num:ev_year}, and was put down", req: c => !c.evDominion && !c.evWon },
        { t: "the rising at {name:ev_town} lasted a season", req: c => !c.evDominion && !c.evWon },
        { t: "the Dominion was thrown out of {name:ev_town}", req: c => c.evDominion && c.evWon },
        { t: "what {name:ev_town} rose against was an empire, and {name:ev_town} won", req: c => c.evDominion && c.evWon },
        { t: "{name:ev_town} rose against the Dominion in {num:ev_year} and did not hold", req: c => c.evDominion && !c.evWon },
        { t: "the imperial constabulary broke the rising at {name:ev_town}", req: c => c.evDominion && !c.evWon },
        { t: "{name:ev_town} broke the constabulary line and kept the town", req: c => !c.evDominion && c.evWon },
        { t: "the rising at {name:ev_town} held", req: c => !c.evDominion && c.evWon },
        { t: "{name:ev_town} rose and the constabulary ended it", req: c => !c.evDominion && !c.evWon },
        { t: "what began at {name:ev_town} in {num:ev_year} was over by the autumn", req: c => !c.evDominion && !c.evWon },
      ],
      revolt_gloss: [
        { t: "the factors were thrown into the harbour, the assessment tables were burned, and {name:ev_town} keeps what it makes now", req: c => c.evDominion && c.evWon },
        { t: "what the assessment tables had taken out of {name:ev_town} for a generation stayed in it", req: c => c.evDominion && c.evWon },
        { t: "the assessment tables do not mention the rising at {name:ev_town}, so this record does", req: c => c.evDominion && !c.evWon },
        { t: "the imperial registers carried on assessing {name:ev_town} at the water as though nothing had happened", req: c => c.evDominion && !c.evWon },
        { t: "{name:ev_town} keeps what it makes now, and its gates charge no one", req: c => !c.evDominion && c.evWon },
        { t: "no tariff has been collected at {name:ev_town} since", req: c => !c.evDominion && c.evWon },
        { t: "the constabulary arrived after the hangings at {name:ev_town}", req: c => !c.evDominion && !c.evWon },
        { t: "the injustice that caused it was written down in full and then left alone, and {name:ev_town} was left with it", req: c => !c.evDominion && !c.evWon },
        { t: "the assessment tables were burned at {name:ev_town} and nothing has been assessed there since", req: c => c.evDominion && c.evWon },
        { t: "{name:ev_town} keeps at the water what it used to hand over at the water", req: c => c.evDominion && c.evWon },
        { t: "nothing in the imperial registers marks the rising at {name:ev_town}, so this entry does", req: c => c.evDominion && !c.evWon },
        { t: "{name:ev_town} was assessed the following season exactly as before", req: c => c.evDominion && !c.evWon },
        { t: "no gate at {name:ev_town} has charged anyone since", req: c => !c.evDominion && c.evWon },
        { t: "what {name:ev_town} makes stays at {name:ev_town}", req: c => !c.evDominion && c.evWon },
        { t: "the grievance at {name:ev_town} was recorded in full and answered not at all", req: c => !c.evDominion && !c.evWon },
        { t: "the hangings at {name:ev_town} came first and the constabulary came after", req: c => !c.evDominion && !c.evWon },
      ],
      // B8 (#130): the won rising is a distribution, and the chronicle tells both arcs.
      revolt_arc: [
        { t: "and it flourished: the aetherworks the charter had held back ran at full tilt, and people came to {name:ev_town} from the tariffed country around it", req: c => c.evWon && c.evArc === "flourished" },
        { t: "freedom released what the old order had held down, and the crafts the tariffs had taxed to the bone found their feet at {name:ev_town}", req: c => c.evWon && c.evArc === "flourished" },
        { t: "but freedom is not food: the magnates' capital left with the magnates, and the aetherworks it had funded at {name:ev_town} went dark", req: c => c.evWon && c.evArc === "starved" },
        { t: "the skilled workers followed the money out of {name:ev_town} and the free town starved, which is the other thing that happens", req: c => c.evWon && c.evArc === "starved" },
        { t: "the injustice had been real and so was the freedom, and neither one fed anybody in {name:ev_town}", req: c => c.evWon && c.evArc === "starved" },
        { t: "what the charter had held back at {name:ev_town} ran at full tilt the moment the charter went", req: c => c.evWon && c.evArc === 'flourished' },
        { t: "people came to {name:ev_town} from the tariffed country around it, which is the plainest verdict available", req: c => c.evWon && c.evArc === 'flourished' },
        { t: "the money left {name:ev_town} with the people who owned it, and the yards went cold behind them", req: c => c.evWon && c.evArc === 'starved' },
        { t: "{name:ev_town} was free and hungry in the same year, and the record does not resolve that", req: c => c.evWon && c.evArc === 'starved' },
      ],
      revolt_name: [
        { t: "the people keep the date as {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is the date they keep, and they keep it without permission", req: c => c.hasEvName },
        { t: "the date is kept at {name:ev_town} as {name:ev_name}", req: () => true },
        { t: "{name:ev_town} keeps the date as {name:ev_name} without asking", req: c => c.hasEvName },
        { t: "the register at {name:capital} avoids the name {name:ev_name} and the streets do not", req: c => c.hasEvName },
        { t: "{name:ev_name} is kept where it happened and nowhere else", req: c => c.hasEvName },
        { t: "the date survives as {name:ev_name}, unofficially", req: c => c.hasEvName },
      ],

      // -- the terms ----------------------------------------------------------
      treaty: [
        { t: "in the winter after the fighting, terms were set at {name:ev_town}", req: () => true },
        { t: "the war ended at a table in {name:ev_town}", req: () => true },
        { t: "terms were written at {name:ev_town} in {num:ev_year}", req: () => true },
        { t: "the fighting stopped when {term:ev_winner} got the paper it wanted at {name:ev_town}", req: () => true },
        { t: "the terms that ended it were written at {name:ev_town}", req: () => true },
        { t: "{name:ev_town} is where the paper was signed", req: () => true },
        { t: "in {num:ev_year} the fighting stopped and the writing started, at {name:ev_town}", req: () => true },
        { t: "the paper that ended it was signed at {name:ev_town}", req: () => true },
        { t: "the settlement was written at {name:ev_town} in the winter", req: () => true },
        { t: "{name:ev_town} was chosen for the table because the fighting had stopped there", req: () => true },
      ],
      treaty_terms: [
        { t: "{term:ev_winner} wrote them: {term:ev_terms}", req: () => true },
        { t: "the paper says {term:ev_terms}, and {term:ev_winner} chose the words", req: () => true },
        { t: "{term:ev_terms}, which is what {term:ev_winner} had come to {name:ev_town} for", req: () => true },
        { t: "the terms are {term:ev_terms}, in the wording {term:ev_winner} chose", req: () => true },
        { t: "{term:ev_terms}: the terms {term:ev_winner} came for", req: () => true },
        { t: "on paper and in {term:ev_winner}'s hand, {term:ev_terms}", req: () => true },
        { t: "the settlement {term:ev_winner} wrote reads {term:ev_terms}", req: () => true },
        { t: "{term:ev_winner} set it down as {term:ev_terms}", req: () => true },
      ],
      treaty_gloss: [
        { t: "the side with the deeper ledger wrote the terms, at {name:ev_town} as everywhere else", req: () => true },
        { t: "nothing at {name:ev_town} was settled by argument that had not already been settled by ledger", req: () => true },
        { t: "what was agreed at {name:ev_town} had been decided before anyone sat down", req: () => true },
        { t: "the paper at {name:ev_town} records a balance of ledgers and calls it a peace", req: () => true },
        { t: "the ledgers had settled it before the table did, at {name:ev_town} as elsewhere", req: () => true },
        { t: "what {term:ev_winner} took at {name:ev_town} it had already won", req: () => true },
        { t: "no clause at {name:ev_town} surprised anyone who had read the accounts", req: () => true },
        { t: "the losing side signed at {name:ev_town} because signing was cheaper than continuing", req: () => true },
      ],
      treaty_name: [
        { t: "the clerks filed the fair copy as {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is the title on the copy kept at {name:capital}", req: c => c.hasEvName },
        { t: "the copy at {name:capital} is titled {name:ev_name}", req: c => c.hasEvName },
        { t: "the fair copy is titled {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is the name on the paper", req: c => c.hasEvName },
        { t: "the archive at {name:capital} files it as {name:ev_name}", req: c => c.hasEvName },
      ],

      // -- the powers across the water ----------------------------------------
      annexation: [
        { t: "the Dominion's fleet stood off {name:ev_harbor} at dawn", req: () => true },
        { t: "by winter the Dominion held {num:ev_occupied} regions, and it began at {name:ev_harbor}", req: () => true },
        { t: "the Dominion landed at {name:ev_harbor} in {num:ev_year}", req: () => true },
        { t: "the Dominion took {name:ev_harbor} and did not have to fight for it", req: () => true },
        { t: "{name:ev_harbor} was the landing, and {num:ev_occupied} regions followed it", req: () => true },
        { t: "the fleet arrived off {name:ev_harbor} and the question was settled by its arriving", req: () => true },
        { t: "the water off {name:ev_harbor} carried a fleet nobody could answer", req: () => true },
        { t: "{name:ev_harbor} was taken without a shot in {num:ev_year}", req: () => true },
        { t: "the fleet was off {name:ev_harbor} at first light and ashore by evening", req: () => true },
        { t: "{name:ev_harbor} changed hands without a shot in {num:ev_year}", req: () => true },
      ],
      annexation_gloss: [
        { t: "there was no fighting at {name:ev_harbor}, and nobody could stop it", req: () => true },
        { t: "the quays at {name:ev_harbor} collect for a power across the sea now", req: () => true },
        { t: "the yield of those {num:ev_occupied} regions is assessed at the water, and the wires arrived with the constabulary", req: () => true },
        { t: "the assessment now happens at the water at {name:ev_harbor}, before anything moves inland", req: () => true },
        { t: "nothing at {name:ev_harbor} was destroyed, and everything at {name:ev_harbor} changed owner", req: () => true },
        { t: "the constabulary and the wire reached {name:ev_harbor} together, which is not a coincidence", req: () => true },
        { t: "the assessment moved to the water at {name:ev_harbor} and stayed there", req: () => true },
        { t: "the wire and the constabulary reached {name:ev_harbor} in the same season", req: () => true },
      ],
      annexation_gloss2: [
        { t: "it is the first country in the realm wired end to end, because the cargo of those {num:ev_occupied} regions is wanted elsewhere", req: () => true },
        { t: "those {num:ev_occupied} regions retain least of what they make and carry the best wires in the realm, which is one fact and not two", req: () => true },
        { t: "the Crown still reigns over {name:ev_harbor} and no longer rules it", req: () => true },
        { t: "those {num:ev_occupied} regions are the best-connected and worst-paid ground in the realm", req: () => true },
        { t: "what the Dominion wants out of {num:ev_occupied} regions is why they are wired at all", req: () => true },
        { t: "the {num:ev_occupied} occupied regions are the best-connected and worst-paid ground in the realm", req: () => true },
        { t: "what the Dominion wants from {num:ev_occupied} regions is why they were wired at all", req: () => true },
        { t: "{name:capital} reigns over {name:ev_harbor} and does not govern it", req: () => true },
      ],
      annexation_name: [
        { t: "the Dominion's own registers file it as {name:ev_name}", req: c => c.hasEvName },
        { t: "the Dominion's registers head it {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is the imperial name for it, and the only one written down", req: c => c.hasEvName },
        { t: "it is entered as {name:ev_name} in a language {name:ev_town} does not use", req: c => c.hasEvName },
        { t: "the capital's copy calls it {name:ev_name} and says nothing further", req: c => c.hasEvName },
      ],
      // B11 (#133): the empire that buys instead of landing.
      concession: [
        { t: "{term:ev_power} did not send a fleet to {name:ev_harbor}, it sent factors and a charter", req: () => true },
        { t: "{term:ev_power} bought its way into {name:ev_harbor} in {num:ev_year}", req: () => true },
        { t: "the charter at {name:ev_harbor} was signed rather than imposed", req: () => true },
        { t: "{term:ev_power} arrived at {name:ev_harbor} with money instead of soldiers", req: () => true },
        { t: "the charter at {name:ev_harbor} was bought in {num:ev_year}", req: () => true },
        { t: "{term:ev_power} did not need a fleet at {name:ev_harbor}, and did not send one", req: () => true },
        { t: "{term:ev_power} arrived at {name:ev_harbor} with a charter and a chequebook", req: () => true },
        { t: "the charter over {name:ev_harbor} was purchased rather than imposed", req: () => true },
        { t: "{term:ev_power} took {name:ev_harbor} by charter in {num:ev_year}", req: () => true },
        { t: "no fleet came to {name:ev_harbor}, and the outcome was the same", req: () => true },
      ],
      concession_gloss: [
        { t: "the aetherworks at {name:ev_town} were bought, the coast was wired to the sea within the season, and money came in to build", req: () => true },
        { t: "{name:ev_town} grew richer than it had ever been", req: () => true },
        { t: "the yards at {name:ev_town} changed owners and kept their names", req: () => true },
        { t: "the wire reached {name:ev_town} within the season, because the cargo now had somewhere to go", req: () => true },
        { t: "{name:ev_town} was built up faster than the capital had ever built it", req: () => true },
        { t: "the yards at {name:ev_town} kept every worker and changed every owner", req: () => true },
        { t: "the coast at {name:ev_town} was wired within the season, because the cargo now had a destination", req: () => true },
        { t: "{name:ev_town} was built up faster by {term:ev_power} than {name:capital} had managed in a century", req: () => true },
      ],
      concession_coda: [
        { t: "the registers at {name:capital} still carry the name of {name:ev_town}, and the registers that matter now are kept in another capital", req: () => true },
        { t: "half of what the ground at {name:ev_town} yields is entered in a ledger nobody in the realm may read", req: () => true },
        { t: "nothing was taken from {name:ev_town} that was not first bought", req: () => true },
        { t: "nothing at {name:ev_town} was seized, which is what makes it difficult to complain about", req: () => true },
        { t: "the ledger that decides {name:ev_town} is kept where nobody in {name:ev_town} can read it", req: () => true },
        { t: "the ledger that governs {name:ev_town} is kept where nobody in {name:ev_town} can read it", req: () => true },
        { t: "nothing at {name:ev_town} was seized, which is what makes it hard to protest", req: () => true },
        { t: "{name:capital} still lists {name:ev_town} and no longer counts what it makes", req: () => true },
      ],
      abandonment: [
        { t: "{term:ev_power} wound up its concession at {name:ev_town}", req: () => true },
        { t: "{term:ev_power} left {name:ev_town} in {num:ev_year}, {num:ev_span} years after it opened the concession", req: c => c.hasEvSpan },
        { t: "the factors sailed from {name:ev_town} and did not come back", req: () => true },
        { t: "{term:ev_power} closed its books on {name:ev_town}", req: () => true },
        { t: "the charter over {name:ev_town} was wound up in {num:ev_year}", req: () => true },
        { t: "{term:ev_power} stopped sending anything to {name:ev_town}", req: () => true },
        { t: "{term:ev_power} closed its books on {name:ev_town} and sailed", req: () => true },
        { t: "the concession at {name:ev_town} was wound up without notice", req: () => true },
        { t: "the concession at {name:ev_town} was closed in {num:ev_year} without ceremony", req: () => true },
      ],
      abandonment_gloss: [
        { t: "the lode under {name:ev_town} had drawn down, and the attention left with the ore", req: () => true },
        { t: "the credit stopped, and the aetherworks they had built at {name:ev_town} went quiet", req: () => true },
        { t: "what had been bought was not sold on, it was simply put down and walked away from at {name:ev_town}", req: () => true },
        { t: "the ore at {name:ev_town} drew down and the interest drew down with it", req: () => true },
        { t: "what had been built at {name:ev_town} was left standing and left cold", req: () => true },
        { t: "the factors at {name:ev_town} were gone before the last shift knew", req: () => true },
        { t: "the interest in {name:ev_town} drew down at the same rate as the lode", req: () => true },
        { t: "what {term:ev_power} had built at {name:ev_town} was left standing and left cold", req: () => true },
        { t: "the credit to {name:ev_town} stopped in the same season as the shipping", req: () => true },
      ],
      abandonment_coda: [
        { t: "it cut both ways: the markets that had made {name:ev_town} rich were gone, and so were the levies", req: () => true },
        { t: "the ground at {name:ev_town} kept what it made for the first time in a generation", req: () => true },
        { t: "{name:ev_town} got its ruin and its freedom in the same year", req: () => true },
        { t: "{name:ev_town} kept the buildings and lost the market, and kept the ground and lost the levy", req: () => true },
        { t: "for the first time in a generation nothing was assessed at {name:ev_town}", req: () => true },
        { t: "{name:ev_town} kept the buildings and lost the market", req: () => true },
        { t: "for the first time in a generation nothing left {name:ev_town} to be assessed elsewhere", req: () => true },
        { t: "the ruin and the freedom arrived at {name:ev_town} together and are hard to tell apart", req: () => true },
      ],
      embargo: [
        { t: "politics in a capital {name:ev_town} had never seen closed the sea lanes to it", req: () => true },
        { t: "a quarrel between {term:ev_power} and the Metropole became the ruin of {name:ev_town}", req: () => true },
        { t: "the lanes to {name:ev_town} were shut in {num:ev_year} over a quarrel it had no part in", req: () => true },
        { t: "the lanes to {name:ev_town} closed over an argument in a capital {name:ev_town} has never seen", req: () => true },
        { t: "{name:ev_town} was cut off from the water in {num:ev_year}", req: () => true },
        { t: "a quarrel elsewhere shut the sea to {name:ev_town}", req: () => true },
        { t: "{name:ev_town} was shut out of the water by a quarrel it had no part in", req: () => true },
        { t: "the sea closed on {name:ev_town} in {num:ev_year}", req: () => true },
        { t: "the water closed on {name:ev_town} for reasons made elsewhere", req: () => true },
        { t: "{name:ev_town} lost its trade to a treaty it never saw", req: () => true },
        { t: "the lanes to {name:ev_town} were shut and stayed shut", req: () => true },
      ],
      embargo_gloss: [
        { t: "the quays at {name:ev_town} that had built a second fortune on foreign trade stood idle", req: () => true },
        { t: "the cargoes stopped coming, and the coast that had rivalled {name:capital} went bust in a single year", req: () => true },
        { t: "the wealth the trade had brought to {name:ev_town} was gone, and the town had no say in any of it", req: () => true },
        { t: "the second fortune at {name:ev_town} was made on trade and unmade the same way", req: () => true },
        { t: "{name:ev_town} had no say in the quarrel and paid the whole of the settlement", req: () => true },
        { t: "the quays at {name:ev_town} stood full and still for a year", req: () => true },
        { t: "the trade that made {name:ev_town} rich stopped in a single season", req: () => true },
        { t: "{name:ev_town} was not consulted and was not spared", req: () => true },
        { t: "{name:ev_town} had built on foreign trade, and foreign trade was withdrawn", req: () => true },
        { t: "the quays at {name:ev_town} were full and idle in the same season", req: () => true },
        { t: "the coast that had rivalled {name:capital} was bust inside a year", req: () => true },
      ],
      courting: [
        { t: "{term:ev_power} sent envoys to {name:ev_harbor}, and {name:capital} pretended not to notice", req: () => true },
        { t: "envoys from {term:ev_power} were received at {name:ev_harbor} in {num:ev_year}", req: () => true },
        { t: "{term:ev_power} began paying calls at {name:ev_harbor}", req: () => true },
        { t: "{term:ev_power} began calling at {name:ev_harbor}, and nothing was signed", req: () => true },
        { t: "envoys were at {name:ev_harbor} through {num:ev_year}", req: () => true },
        { t: "{term:ev_power} took an interest in {name:ev_harbor} and said so politely", req: () => true },
        { t: "{term:ev_power} began taking an interest in {name:ev_harbor}", req: () => true },
        { t: "envoys came to {name:ev_harbor} and the capital looked away", req: () => true },
        { t: "{term:ev_power} started calling at {name:ev_harbor} and stopped leaving quickly", req: () => true },
        { t: "the calls at {name:ev_harbor} became regular in {num:ev_year}", req: () => true },
        { t: "{term:ev_power} found {name:ev_harbor} interesting and said as much", req: () => true },
      ],
      courting_gloss: [
        { t: "nothing was signed at {name:ev_harbor}", req: () => true },
        { t: "a rich coast the Metropole has not yet claimed is a coast worth courting, and {name:ev_harbor} is rich", req: () => true },
        { t: "the powers across the sea prefer to be invited, and this is how the next landing at {name:ev_harbor} usually begins", req: () => true },
        { t: "{name:capital} saw it and chose to see nothing", req: () => true },
        { t: "an invitation is cheaper than a fleet, and {name:ev_harbor} is being invited", req: () => true },
        { t: "nothing was agreed at {name:ev_harbor}, which is how these things start", req: () => true },
        { t: "nothing was agreed at {name:ev_harbor}, which is how these things begin", req: () => true },
        { t: "a coast the Metropole has not claimed is a coast worth calling on, and {name:ev_harbor} is one", req: () => true },
        { t: "the capital watched and recorded nothing about {name:ev_harbor}", req: () => true },
        { t: "{name:ev_harbor} is rich and unclaimed, which is a temporary condition", req: () => true },
        { t: "nothing binding was signed at {name:ev_harbor}, and nothing needed to be", req: () => true },
      ],

      // -- the faith ----------------------------------------------------------
      consecration: [
        { t: "the Temple came to {name:ev_town}, to the ground of its suffering, and consecrated it as {name:ev_shrine}", req: c => c.hasEvShrine },
        { t: "{name:ev_shrine} was raised on the ground of the worst year {name:ev_town} ever had", req: c => c.hasEvShrine },
        { t: "the Temple consecrated the ground at {name:ev_town} in {num:ev_year}", req: c => !c.hasEvShrine },
        { t: "the Temple took the harmed ground at {name:ev_town} and made it holy", req: c => !c.hasEvShrine },
        { t: "the ground at {name:ev_town} was consecrated after the harm was done", req: c => !c.hasEvShrine },
        { t: "the Temple arrived at {name:ev_town} once there was suffering to sanctify", req: c => !c.hasEvShrine },
        { t: "{name:ev_shrine} stands on the worst ground of the worst year at {name:ev_town}", req: c => c.hasEvShrine },
        { t: "the Temple raised {name:ev_shrine} where the harm had been", req: c => c.hasEvShrine },
        { t: "the ground at {name:ev_town} was made holy in {num:ev_year}", req: () => true },
        { t: "the Temple arrived at {name:ev_town} after everything else had happened to it", req: () => true },
        { t: "the Temple consecrated the ground at {name:ev_town} as {name:ev_shrine} in {num:ev_year}", req: c => c.hasEvShrine },
        { t: "the harmed ground at {name:ev_town} was made holy and named {name:ev_shrine}", req: c => c.hasEvShrine },
        { t: "{name:ev_shrine} was consecrated at {name:ev_town} once there was suffering to sanctify", req: c => c.hasEvShrine },
      ],
      consecration_gloss: [
        { t: "pilgrims walk the {name:ev_town} road now", req: () => true },
        { t: "the road to {name:ev_town} carries pilgrims where it used to carry the people leaving", req: () => true },
        { t: "the Crown's writ had failed there, and the magnates' ledgers had seen nothing at {name:ev_town} worth the ink", req: () => true },
        { t: "the road to {name:ev_town} carries pilgrims now and carried refugees before", req: () => true },
        { t: "nothing official had come to {name:ev_town} until the faith did", req: () => true },
        { t: "nothing official had reached {name:ev_town} before the faith did", req: () => true },
        { t: "the road into {name:ev_town} carries pilgrims now and carried refugees before", req: () => true },
        { t: "the Crown's writ had failed at {name:ev_town} and the ledgers had never opened there", req: () => true },
      ],
      consecration_coda: [
        { t: "the faith moved in after the harm was done, and claimed the ground at {name:ev_town}", req: () => true },
        { t: "nothing was prevented at {name:ev_town}, and a great deal was consecrated", req: () => true },
        { t: "{name:ev_town} got a shrine where it had wanted a constabulary", req: () => true },
        { t: "the Temple did not prevent what happened at {name:ev_town} and did consecrate it, and the record keeps both", req: () => true },
        { t: "{name:ev_town} wanted a constabulary and received a shrine", req: () => true },
        { t: "the Temple takes its share at {name:ev_town} and the share is not small", req: () => true },
        { t: "what happened at {name:ev_town} is now a pilgrimage, which is one way of not answering for it", req: () => true },
      ],

      // -- D7: the years' shocks: weather, ground, fortune, and the god --------
      drought: [
        { t: "the rains failed over {name:ev_town}, and failed again", req: () => true },
        { t: "the rains did not come to {name:ev_town} in {num:ev_year}, nor the year after", req: () => true },
        { t: "{name:ev_town} went two seasons without water", req: () => true },
        { t: "the sky held over {name:ev_town} for two years running", req: () => true },
        { t: "the wells at {name:ev_town} were reading low by midsummer and dry by the next", req: () => true },
        { t: "{num:ev_year} was the first dry year at {name:ev_town} and not the last", req: () => true },
        { t: "the water went out of the country around {name:ev_town}", req: () => true },
        { t: "the water failed at {name:ev_town} and kept failing", req: () => true },
        { t: "nothing fell on {name:ev_town} for two summers together", req: () => true },
        { t: "the streams above {name:ev_town} were down to stones by {num:ev_year}", req: () => true },
        { t: "{name:ev_town} had no rain worth the name for two years", req: () => true },
        { t: "the country around {name:ev_town} dried from the edges inward", req: () => true },
        { t: "in {num:ev_year} and the year after, nothing fell on {name:ev_town}", req: () => true },
        { t: "the water table under {name:ev_town} dropped below the wells", req: () => true },
        { t: "the streams that feed {name:ev_town} ran to gravel", req: () => true },
        { t: "{name:ev_town} watched its ground go pale and then go hard", req: () => true },
      ],
      drought_gloss: [
        { t: "wells around {name:ev_town} that had been shared were closed off", req: () => true },
        { t: "the country the water had barely reached went to dust first, as it always does around {name:ev_town}", req: () => true },
        { t: "there was enough at {name:ev_town} for some, which is how a drought becomes a quarrel", req: () => true },
        { t: "the fields nearest the channels held, and everything past them at {name:ev_town} did not", req: () => true },
        { t: "what water there was went where it had always gone, which at {name:ev_town} meant uphill", req: () => true },
        { t: "the herds were sold off around {name:ev_town} at whatever the buyers cared to offer", req: () => true },
        { t: "the shared wells at {name:ev_town} stopped being shared inside a season", req: () => true },
        { t: "the ground furthest from the channels went first, as it does everywhere around {name:ev_town}", req: () => true },
        { t: "the price of water at {name:ev_town} was set by the people who had some", req: () => true },
        { t: "the channels at {name:ev_town} carried what there was to whoever owned them", req: () => true },
        { t: "grazing around {name:ev_town} failed a season before the grain did", req: () => true },
        { t: "the poorest ground at {name:ev_town} was the first to be given up", req: () => true },
        { t: "what {name:ev_town} had stored was gone by the second summer", req: () => true },
        { t: "the price of water at {name:ev_town} was set by whoever still had some", req: () => true },
        { t: "the wells that had been common at {name:ev_town} stopped being common", req: () => true },
      ],
      drought_name: [
        { t: "the scribes titled the dry page {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is what the dry page is headed", req: c => c.hasEvName },
        { t: "the clerks headed the year {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is the entry, and it is a short one", req: c => c.hasEvName },
        { t: "the dry page is headed {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is the name and the whole of the explanation", req: c => c.hasEvName },
        { t: "the year went into the register as {name:ev_name}", req: c => c.hasEvName },
        { t: "it survives as {name:ev_name}, three lines long", req: c => c.hasEvName },
      ],
      flood: [
        { t: "the river rose over {name:ev_town} and took the low ground with it", req: () => true },
        { t: "the water came up at {name:ev_town} in {num:ev_year} and did not stop at the wharves", req: () => true },
        { t: "{name:ev_town} lost its low ground to the river", req: () => true },
        { t: "the river went over its banks at {name:ev_town}", req: () => true },
        { t: "in {num:ev_year} the river took back everything at {name:ev_town} that had been built on its floor", req: () => true },
        { t: "the water stood in the streets of {name:ev_town} for a fortnight", req: () => true },
        { t: "the river took the bottom of {name:ev_town}", req: () => true },
        { t: "{name:ev_town} was under water to the second street", req: () => true },
        { t: "the water came through {name:ev_town} in {num:ev_year} and stayed a fortnight", req: () => true },
        { t: "the river went through {name:ev_town} rather than past it", req: () => true },
        { t: "{name:ev_town} was under water from the wharves to the second street", req: () => true },
        { t: "the water rose at {name:ev_town} in {num:ev_year} and took a fortnight to leave", req: () => true },
        { t: "the {name:ev_town} banks gave and the river took the difference", req: () => true },
        { t: "everything low at {name:ev_town} went under", req: () => true },
        { t: "the river reclaimed what {name:ev_town} had built on its floor", req: () => true },
      ],
      flood_gloss: [
        { t: "the fields, the founding wharves, whatever stood in the way at {name:ev_town}", req: () => true },
        { t: "what the river took at {name:ev_town} it took from the people who could not afford to build higher", req: () => true },
        { t: "the high streets of {name:ev_town} were dry throughout, as the high streets were built to be", req: () => true },
        { t: "the warehouses at {name:ev_town} were emptied first, and the houses were not emptied at all", req: () => true },
        { t: "the survey had marked that ground as floodable and {name:ev_town} had built on it anyway, because it was cheap", req: () => true },
        { t: "the grain in store at {name:ev_town} was lost, and the grain was the year", req: () => true },
        { t: "the ground that floods at {name:ev_town} is where the rents were low enough to reach", req: () => true },
        { t: "everything stored at the {name:ev_town} wharves was a loss, and the stores were the year", req: () => true },
        { t: "the river had done it before and the survey at {name:ev_town} said so", req: () => true },
        { t: "the stores at {name:ev_town} were lost, and the stores were the year", req: () => true },
        { t: "the ground that floods at {name:ev_town} is the only ground the poor could afford", req: () => true },
        { t: "the {name:ev_town} wharves were rebuilt at public cost and the houses were not", req: () => true },
        { t: "the survey had marked it and the leases at {name:ev_town} were signed anyway", req: () => true },
        { t: "nobody at {name:ev_town} was compensated and nobody had expected to be", req: () => true },
        { t: "the count of what the water took at {name:ev_town} was never completed", req: () => true },
      ],
      flood_name: [
        { t: "the accounts call it {name:ev_name}, and they do not agree on how many it took", req: c => c.hasEvName },
        { t: "it is filed as {name:ev_name}, with the count left blank", req: c => c.hasEvName },
        { t: "it is entered as {name:ev_name}", req: c => c.hasEvName },
        { t: "the accounts head it {name:ev_name} and stop counting there", req: c => c.hasEvName },
        { t: "the water year is entered as {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is the heading and the count is left open", req: c => c.hasEvName },
        { t: "the clerks filed it under {name:ev_name} and moved on", req: c => c.hasEvName },
        { t: "it is {name:ev_name} in the register and something shorter in {name:ev_town}", req: c => c.hasEvName },
      ],
      quake: [
        { t: "the ground moved under {name:ev_town}, where the wall's own folding runs closest to the surface", req: () => true },
        { t: "the ground gave under {name:ev_town} in {num:ev_year}", req: () => true },
        { t: "the folding under {name:ev_town} slipped", req: () => true },
        { t: "the rock under {name:ev_town} shifted, as rock under a fold does", req: () => true },
        { t: "something let go beneath {name:ev_town} in {num:ev_year}", req: () => true },
        { t: "{name:ev_town} sits on the fold, and in {num:ev_year} the fold moved", req: () => true },
        { t: "the fold under {name:ev_town} moved for the first time in living memory", req: () => true },
        { t: "{name:ev_town} felt the rock let go beneath it", req: () => true },
        { t: "the earth shifted at {name:ev_town} in {num:ev_year}", req: () => true },
        { t: "{name:ev_town} was shaken in {num:ev_year} and did not recover its shape", req: () => true },
        { t: "the country under {name:ev_town} moved without warning", req: () => true },
        { t: "there was an hour at {name:ev_town} when nothing stood still", req: () => true },
        { t: "the fold beneath {name:ev_town} released what it had been holding", req: () => true },
        { t: "{name:ev_town} lost streets to the ground itself", req: () => true },
        { t: "the rock under {name:ev_town} settled by a few feet and took the town with it", req: () => true },
      ],
      quake_gloss: [
        { t: "roads cracked, the pass shifted, and what stood on soft ground at {name:ev_town} did not stand after", req: () => true },
        { t: "the ground under {name:ev_town} had been folding for longer than the realm has been counting", req: () => true },
        { t: "what was built well at {name:ev_town} stood, and the rest was where the poor lived", req: () => true },
        { t: "the pass above {name:ev_town} closed, and with it the only route that did not pay a tariff", req: () => true },
        { t: "the masons at {name:ev_town} had known which streets would go, and had not been paid to say so", req: () => true },
        { t: "nothing about it was a surprise to anyone who had read the survey of {name:ev_town}", req: () => true },
        { t: "the pass above {name:ev_town} was days clearing, and the tariff on it was collected throughout", req: () => true },
        { t: "the survey had marked the ground under {name:ev_town} and the building went on regardless", req: () => true },
        { t: "what fell at {name:ev_town} fell where the mortar was cheapest", req: () => true },
        { t: "the well shafts at {name:ev_town} closed and the water came up brown for a year", req: () => true },
        { t: "what fell at {name:ev_town} was what had been built cheapest", req: () => true },
        { t: "the road out of {name:ev_town} was impassable in both directions", req: () => true },
        { t: "the count at {name:ev_town} was taken by the people who survived to take it", req: () => true },
        { t: "nothing at {name:ev_town} was insured, because nothing at {name:ev_town} was insurable", req: () => true },
        { t: "the survey had said what the ground under {name:ev_town} would do", req: () => true },
      ],
      quake_name: [
        { t: "the record keeps it as {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is the entry, and the entry is short", req: c => c.hasEvName },
        { t: "the entry at {name:capital} reads {name:ev_name} and runs three lines", req: c => c.hasEvName },
        { t: "it is filed as {name:ev_name}, under weather, which is wrong", req: c => c.hasEvName },
        { t: "the register carries it as {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is the entry, and it does not mention the ground", req: c => c.hasEvName },
        { t: "the year is filed as {name:ev_name}", req: c => c.hasEvName },
        { t: "the copy at {name:capital} heads it {name:ev_name}", req: c => c.hasEvName },
      ],
      storm: [
        { t: "a storm came off the water and stood over the {name:ev_town} coast for three days", req: () => true },
        { t: "the weather turned on {name:ev_town} in {num:ev_year} and stayed turned", req: () => true },
        { t: "three days of storm sat on the coast at {name:ev_town}", req: () => true },
        { t: "the sea came at {name:ev_town} for three days without stopping", req: () => true },
        { t: "a storm out of the open water found {name:ev_town} in {num:ev_year}", req: () => true },
        { t: "the wind held onto the {name:ev_town} shore and would not let go of it", req: () => true },
        { t: "the water threw a storm at {name:ev_town} and held it there", req: () => true },
        { t: "{name:ev_town} lost three days to the weather", req: () => true },
        { t: "the coast at {name:ev_town} was under storm from the {num:ev_year} equinox", req: () => true },
        { t: "the water came at {name:ev_town} out of a clear autumn", req: () => true },
        { t: "{name:ev_town} was under weather for three days and under water for one", req: () => true },
        { t: "the sea rose against {name:ev_town} in {num:ev_year}", req: () => true },
        { t: "wind and water together took the {name:ev_town} shore apart", req: () => true },
        { t: "the storm found {name:ev_town} first, as the storms do", req: () => true },
        { t: "there was nothing between {name:ev_town} and the open water, and there never had been", req: () => true },
      ],
      storm_gloss: [
        { t: "{name:ev_town} took the worst of it, as the exposed shore always does", req: () => true },
        { t: "the shore that pays for the harbour in the good years paid again at {name:ev_town}", req: () => true },
        { t: "the boats that could be hauled out were hauled out, and the people at {name:ev_town} who worked from them could not be", req: () => true },
        { t: "the quay at {name:ev_town} held and the houses behind it did not, which tells you what the money was spent on", req: () => true },
        { t: "the fleet at {name:ev_town} was insured and the crews were not", req: () => true },
        { t: "what {name:ev_town} lost was a season, and a season is what most of it lives on", req: () => true },
        { t: "the exposure that makes {name:ev_town} a harbour is the exposure that cost it the season", req: () => true },
        { t: "what was insured at {name:ev_town} was replaced and what was not was not", req: () => true },
        { t: "the wharves at {name:ev_town} were rebuilt within the year, and the houses behind them were not", req: () => true },
        { t: "the shipping at {name:ev_town} was lost at anchor", req: () => true },
        { t: "the roofs at {name:ev_town} went in the first night and the wharves in the second", req: () => true },
        { t: "the crews at {name:ev_town} were not insured and the hulls were", req: () => true },
        { t: "the exposure that makes {name:ev_town} a harbour is the exposure that emptied it", req: () => true },
        { t: "the {name:ev_town} defences were built to the standard the ledgers would pay for", req: () => true },
        { t: "what {name:ev_town} lost it lost in one season and repaid over ten", req: () => true },
      ],
      storm_name: [
        { t: "{name:ev_name} is the name the survivors gave the year", req: c => c.hasEvName },
        { t: "the year is kept as {name:ev_name}", req: c => c.hasEvName },
        { t: "the clerks entered it as {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is the year in every account that survives", req: c => c.hasEvName },
        { t: "the year survives as {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is the name that stuck", req: c => c.hasEvName },
        { t: "the clerks wrote {name:ev_name} and the survivors agreed with them", req: c => c.hasEvName },
        { t: "it is entered as {name:ev_name} and dated to the equinox", req: c => c.hasEvName },
      ],
      discovery: [
        { t: "fortune turned at {name:ev_town}: a lode, a lost road, a relic worth the carrying", req: () => true },
        { t: "something worth carrying was found at {name:ev_town} in {num:ev_year}", req: () => true },
        { t: "{name:ev_town} found something the surveys had walked past", req: () => true },
        { t: "a find was made at {name:ev_town} that nobody had budgeted for", req: () => true },
        { t: "in {num:ev_year} the luck at {name:ev_town} turned, and turned upward", req: () => true },
        { t: "what turned up at {name:ev_town} was worth more than the year it turned up in", req: () => true },
        { t: "{name:ev_town} turned up something the surveys had missed", req: () => true },
        { t: "a find at {name:ev_town} in {num:ev_year} changed what the ground was worth", req: () => true },
        { t: "the luck at {name:ev_town} turned upward, and nobody had predicted it", req: () => true },
        { t: "something under {name:ev_town} turned out to be worth carrying", req: () => true },
        { t: "{name:ev_town} came into a piece of luck in {num:ev_year}", req: () => true },
        { t: "what the surveys had walked past at {name:ev_town} was found by accident", req: () => true },
        { t: "a lost road, a lode, a relic: the accounts of {name:ev_town} do not agree", req: () => true },
        { t: "the ground at {name:ev_town} was suddenly worth the trouble", req: () => true },
        { t: "{name:ev_town} found something and did not have to build it", req: () => true },
      ],
      discovery_gloss: [
        { t: "the accounts differ on what it was, and the wagons all came the same way into {name:ev_town}", req: () => true },
        { t: "people came back to ground at {name:ev_town} they had been leaving", req: () => true },
        { t: "for one generation {name:ev_town} was worth going to", req: () => true },
        { t: "the road to {name:ev_town} was repaired within the year, which no petition had managed in fifty", req: () => true },
        { t: "the money arrived before the assessors did, which is the only order that ever helps {name:ev_town}", req: () => true },
        { t: "nothing about {name:ev_town} had changed except what was known about it", req: () => true },
        { t: "the wagons went to {name:ev_town} before the assessors did, which is the only order that helps", req: () => true },
        { t: "for a while {name:ev_town} was somewhere to go rather than somewhere to leave", req: () => true },
        { t: "what was found at {name:ev_town} was worth more than everything built there", req: () => true },
        { t: "the wagons came to {name:ev_town} before anyone official did", req: () => true },
        { t: "{name:ev_town} stopped being a place people left", req: () => true },
        { t: "the assessment at {name:ev_town} caught up within three years", req: () => true },
        { t: "for one generation {name:ev_town} was worth the journey", req: () => true },
        { t: "what was found at {name:ev_town} outvalued everything built there", req: () => true },
        { t: "the road to {name:ev_town} was mended by people who wanted to use it", req: () => true },
      ],
      discovery_name: [
        { t: "the clerks file it as {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is how it is filed, without a description", req: c => c.hasEvName },
        { t: "the register calls it {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is the entry and the entry says nothing else", req: c => c.hasEvName },
        { t: "it goes into the register as {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is the heading and the contents are left vague", req: c => c.hasEvName },
        { t: "the clerks called it {name:ev_name} without saying what it was", req: c => c.hasEvName },
        { t: "the entry is {name:ev_name}, filed under fortune", req: c => c.hasEvName },
      ],
      ascendancy: [
        { t: "the god's fortune rose at {name:ev_town}, and with it the town's", req: () => true },
        { t: "the temple at {name:ev_town} came back into favour in {num:ev_year}", req: () => true },
        { t: "the shrine at {name:ev_town} was busy again", req: () => true },
        { t: "the pilgrim roads bent toward {name:ev_town} again", req: () => true },
        { t: "in {num:ev_year} the faithful remembered {name:ev_town}", req: () => true },
        { t: "what had gone quiet at {name:ev_town} was loud again within a season", req: () => true },
        { t: "the roads bent back toward {name:ev_town}", req: () => true },
        { t: "{name:ev_town} was a destination again by {num:ev_year}", req: () => true },
        { t: "the god remembered {name:ev_town}, or the pilgrims did", req: () => true },
        { t: "the pilgrim traffic found {name:ev_town} again", req: () => true },
        { t: "{name:ev_town} became a destination in {num:ev_year} without doing anything", req: () => true },
        { t: "the god's fortune turned toward {name:ev_town}", req: () => true },
        { t: "the shrine at {name:ev_town} filled after a generation of standing empty", req: () => true },
        { t: "what had been quiet at {name:ev_town} was loud again inside a season", req: () => true },
        { t: "the roads bent, and they bent toward {name:ev_town}", req: () => true },
      ],
      ascendancy_gloss: [
        { t: "pilgrims rerouted, coin followed the pilgrims, and the {name:ev_town} temple that had gone quiet was affluent again", req: () => true },
        { t: "nothing about {name:ev_town} changed except where the roads decided to bend", req: () => true },
        { t: "the coin arrived on foot, one pilgrim at a time, and {name:ev_town} counted it as a blessing", req: () => true },
        { t: "the innkeepers at {name:ev_town} did better out of it than the priests, and said so quietly", req: () => true },
        { t: "a shrine is a market that does not have to call itself one, and {name:ev_town} had one", req: () => true },
        { t: "the favour was not asked for and the tariff on it was collected all the same at {name:ev_town}", req: () => true },
        { t: "coin arrives at {name:ev_town} on foot when it arrives at all, and that year it arrived", req: () => true },
        { t: "the shrine at {name:ev_town} did what no charter had managed, which was to bring people", req: () => true },
        { t: "nothing at {name:ev_town} was built or found; the traffic simply changed its mind", req: () => true },
        { t: "the inns at {name:ev_town} were full and the granaries followed", req: () => true },
        { t: "coin walks into {name:ev_town} one pilgrim at a time, and it walked", req: () => true },
        { t: "the {name:ev_town} temple that had been shut was funded again", req: () => true },
        { t: "nothing was built at {name:ev_town} and everything was worth more", req: () => true },
        { t: "the assessment at {name:ev_town} rose with the traffic, as it does", req: () => true },
        { t: "the favour cost {name:ev_town} nothing and was not {name:ev_town}'s to keep", req: () => true },
      ],
      ascendancy_name: [
        { t: "the faithful keep the year as {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is the year in the Temple's own count", req: c => c.hasEvName },
        { t: "the Temple keeps the year as {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is what the faithful call it, and they call it that still", req: c => c.hasEvName },
        { t: "the Temple's own count keeps it as {name:ev_name}", req: c => c.hasEvName },
        { t: "{name:ev_name} is what the faithful call the year", req: c => c.hasEvName },
        { t: "the pilgrim roads know it as {name:ev_name}", req: c => c.hasEvName },
        { t: "it stands in the Temple register as {name:ev_name}", req: c => c.hasEvName },
      ],

      drought_coda: [
        { t: "the herds around {name:ev_town} were sold at whatever was offered", req: () => true },
        { t: "nothing at {name:ev_town} was rationed, which is a decision even when nobody makes it", req: () => true },
        { t: "the water that was left at {name:ev_town} went where water always goes, which is to whoever owns the channel", req: () => true },
        { t: "two dry years is not a disaster in {name:capital}'s ledgers and is one at {name:ev_town}", req: () => true },
        { t: "the grain price at {name:ev_town} doubled and the wage did not", req: () => true },
        { t: "what {name:ev_town} lost was the margin it had never been allowed to build", req: () => true },
        { t: "the drought at {name:ev_town} was a shortage for some and a market for others", req: () => true },
        { t: "nothing at {name:ev_town} was rationed, which is a decision even unmade", req: () => true },
      ],

      flood_coda: [
        { t: "the survey had the {name:ev_town} floodline on it and the leases ignored it", req: () => true },
        { t: "the wharves at {name:ev_town} were public and the warehouses were not, and only one of them was rebuilt at public cost", req: () => true },
        { t: "nobody at {name:ev_town} was compensated, because nobody at {name:ev_town} had insured anything", req: () => true },
        { t: "the river will do it again, and the {name:ev_town} leases still run to the water", req: () => true },
        { t: "what stood high at {name:ev_town} stood dry, and what stood high was not where most people lived", req: () => true },
        { t: "the count of the dead at {name:ev_town} is an estimate and always was", req: () => true },
        { t: "the leases at {name:ev_town} still run to the water", req: () => true },
        { t: "nobody at {name:ev_town} was compensated for ground they did not own", req: () => true },
      ],

      quake_coda: [
        { t: "the pass above {name:ev_town} was the cheap route, and it was days before it was a route again", req: () => true },
        { t: "the masons at {name:ev_town} had said which streets would go and had not been asked twice", req: () => true },
        { t: "nothing under {name:ev_town} has settled, and the record does not pretend otherwise", req: () => true },
        { t: "the rebuilding at {name:ev_town} used the same ground and the same mortar", req: () => true },
        { t: "the fold runs the length of these {num:n_regions} regions and {name:ev_town} sits on it", req: () => true },
        { t: "what the ground did at {name:ev_town} it had done before the realm was surveyed", req: () => true },
      ],

      storm_coda: [
        { t: "the fleet at {name:ev_town} was insured and the crews were not", req: () => true },
        { t: "the season is what {name:ev_town} lives on, and the season was the loss", req: () => true },
        { t: "the quay at {name:ev_town} held because the quay had money spent on it", req: () => true },
        { t: "the exposure that makes a harbour is the exposure that empties it, at {name:ev_town} as everywhere", req: () => true },
        { t: "nothing was rebuilt at {name:ev_town} that did not earn its rebuilding", req: () => true },
        { t: "the tariff at {name:ev_town} was collected that year on nothing", req: () => true },
        { t: "what {name:ev_town} lost was a season, and a season is what it lives on", req: () => true },
      ],

      discovery_coda: [
        { t: "the road to {name:ev_town} was repaired inside a year, which fifty years of petitions had not managed", req: () => true },
        { t: "the money reached {name:ev_town} before the assessors, which is the only sequence that ever helps a town", req: () => true },
        { t: "nothing about {name:ev_town} had changed except what was known about it", req: () => true },
        { t: "the people who left {name:ev_town} before it came back did not come back", req: () => true },
        { t: "for a generation {name:ev_town} was somewhere to arrive at", req: () => true },
        { t: "what was found at {name:ev_town} was worth more than everything anyone had built there", req: () => true },
        { t: "the people who had already left {name:ev_town} did not come back", req: () => true },
        { t: "the road to {name:ev_town} was repaired in a year that fifty petitions had not moved", req: () => true },
      ],

      ascendancy_coda: [
        { t: "a shrine is a market that need not call itself one, and {name:ev_town} had one", req: () => true },
        { t: "the innkeepers at {name:ev_town} did better out of it than the priests did", req: () => true },
        { t: "the coin came on foot, one pilgrim at a time, and {name:ev_town} counted every step of it", req: () => true },
        { t: "nothing at {name:ev_town} was built, found or decided; the traffic changed its mind", req: () => true },
        { t: "the Temple took its share at {name:ev_town} and the share was not small", req: () => true },
        { t: "favour is not a resource anyone at {name:ev_town} can hold on to, and they knew it", req: () => true },
        { t: "favour is not a thing anyone at {name:ev_town} can hold on to", req: () => true },
        { t: "the Temple's share of what came to {name:ev_town} was taken first", req: () => true },
      ],

      blight_plague_coda: [
        { t: "the burial rolls at {name:ev_town} were kept and the cause was not", req: () => true },
        { t: "the ground around {name:ev_town} was fouled by a decision, and the fever was not", req: () => true },
        { t: "nothing came to {name:ev_town} from {name:capital} except the assessment, on time", req: () => true },
        { t: "those who could leave {name:ev_town} left, in the order their savings allowed", req: () => true },
        { t: "the blight at {name:ev_town} was decades old and nobody had been charged for it", req: () => true },
        { t: "what killed {name:ev_town} arrived last and is what the entry names", req: () => true },
        { t: "nothing reached {name:ev_town} from {name:capital} except the assessment, on time", req: () => true },
        { t: "the blight at {name:ev_town} was decades old and nobody was ever charged for it", req: () => true },
      ],

      refinery_collapse_coda: [
        { t: "the charter for {name:ev_town} is still on file and refers to nothing standing", req: () => true },
        { t: "the wire into {name:ev_town} was never taken up and never used again", req: () => true },
        { t: "the magnates who left {name:ev_town} took the machinery and left the housing", req: () => true },
        { t: "what {name:ev_town} was built for lasted one lode", req: () => true },
        { t: "nobody at {name:ev_town} was paid to plan for this, and so nobody did", req: () => true },
        { t: "the census still carries {name:ev_town} at the size it never returned to", req: () => true },
        { t: "the census still carries {name:ev_town} at a size it never came back to", req: () => true },
        { t: "nobody at {name:ev_town} was paid to think about the seam ending, so nobody thought about it", req: () => true },
      ],

      refinery_founded_coda: [
        { t: "the copper to {name:ev_town} was laid faster than any road to {name:ev_town} ever was", req: () => true },
        { t: "{name:ev_town} was worth wiring the moment it was worth taking from", req: () => true },
        { t: "the towns the trunk line passed on the way to {name:ev_town} are not named in the charter", req: () => true },
        { t: "what {name:ev_town} got was a decade, and it was told it was getting a future", req: () => true },
        { t: "the assessment at {name:ev_town} was raised in the same season as the wages", req: () => true },
        { t: "nothing was asked of {name:ev_town} and nothing was offered to it either", req: () => true },
        { t: "the towns the trunk line passed on its way to {name:ev_town} are not in the charter", req: () => true },
        { t: "the assessment at {name:ev_town} rose in the same season as the wages", req: () => true },
      ],

      relic_calamity_coda: [
        { t: "the site by {name:ev_town} is sealed and the seal is the whole of the response", req: () => true },
        { t: "nothing grows in the ring around {name:ev_town} and nothing is expected to", req: () => true },
        { t: "the Temple's account of {name:ev_town} was written by the Temple", req: () => true },
        { t: "what the old world left under {name:ev_town} was not surveyed before it was built over", req: () => true },
        { t: "the people who lived nearest {name:ev_town} are the ones the record has least of", req: () => true },
        { t: "the people nearest {name:ev_town} are the ones this record has least of", req: () => true },
        { t: "the seal on the {name:ev_town} site is the whole of the response", req: () => true },
        { t: "nothing was surveyed under {name:ev_town} before it was built on", req: () => true },
      ],

      tower_burned_coda: [
        { t: "the darkness at {name:ev_town} predates the tower and outlasts it", req: () => true },
        { t: "what was destroyed at {name:ev_town} was the only thing that had ever come", req: () => true },
        { t: "the writ out of {name:capital} counts the offence and has no column for the treatment", req: () => true },
        { t: "nothing chartered arrived at {name:ev_town} afterwards, and nothing unchartered did either", req: () => true },
        { t: "the cost of it at {name:ev_town} is not written down anywhere in this record but here", req: () => true },
        { t: "the darkness at {name:ev_town} was there before the tower and remains after it", req: () => true },
        { t: "what was burned at {name:ev_town} was the only thing that ever came", req: () => true },
        { t: "no charter offered {name:ev_town} an alternative and none was expected", req: () => true },
      ],

      tower_raised_coda: [
        { t: "the grid never came to {name:ev_town}, and something did", req: () => true },
        { t: "an apostate is what the absence of everything else produces at {name:ev_town}", req: () => true },
        { t: "the writ that would have stopped it never reached {name:ev_town} in the first place", req: () => true },
        { t: "the charter that forbids it does not reach as far as {name:ev_town}", req: () => true },
        { t: "nothing legal was on offer at {name:ev_town} and this was", req: () => true },
        { t: "an apostate at {name:ev_town} is what the absence of everything else produces", req: () => true },
        { t: "the charter forbidding it does not reach as far as {name:ev_town}", req: () => true },
      ],

      embargo_coda: [
        { t: "{name:ev_town} had no voice in the quarrel and paid the whole settlement", req: () => true },
        { t: "the second fortune at {name:ev_town} was made on trade and unmade the same way", req: () => true },
        { t: "the quays at {name:ev_town} stood full and still for a year", req: () => true },
        { t: "nothing at {name:ev_town} was destroyed and everything at {name:ev_town} stopped", req: () => true },
        { t: "the capital that closed the lanes has never heard of {name:ev_town}", req: () => true },
        { t: "{name:ev_town} discovered what a fortune built on somebody else's politics is worth", req: () => true },
      ],

      courting_coda: [
        { t: "an invitation costs less than a fleet, and {name:ev_harbor} is being invited", req: () => true },
        { t: "{name:capital} saw it and chose to see nothing", req: () => true },
        { t: "nothing signed at {name:ev_harbor} is still a change in what {name:ev_harbor} is", req: () => true },
        { t: "the powers across the water prefer a charter at {name:ev_harbor} to a landing, and prefer both to neither", req: () => true },
        { t: "what happens at {name:ev_harbor} next is not {name:ev_harbor}'s to decide", req: () => true },
        { t: "what happens at {name:ev_harbor} next will not be decided at {name:ev_harbor}", req: () => true },
        { t: "{name:capital} saw the envoys and recorded nothing", req: () => true },
      ],
    };

    // One event's context: the chronicle's, plus what this event alone can name or
    // count. Everything a `req` reads is precomputed here, so a predicate in the
    // pool is a claim about the event and never a lookup into the model.
    function eventCtx(c, ev, model, params, strikeEv) {
      const FN = { crown: "the Crown", temple: "the Temple", magnate: "the magnates" };
      const TITLE = { crown: "Sovereign", temple: "Hierarch", magnate: "First Magnate" };
      const PLACE = { crown: "the throne", temple: "the censer", magnate: "the chair" };
      const MEASURE = {
        dumping_reform: "a Dumping Reform", grid_charter: "a Grid Charter",
        toll_amnesty: "a Tariff Amnesty", retention_act: "a Retention Act",
        crown_granary: "the Crown Granary",
      };
      const t = ev.region_id !== undefined ? c.town(ev.region_id) : null;
      const reg = ev.region_id !== undefined ? model.regions.find(r => r.id === ev.region_id) : null;
      const e = Object.create(c);
      e.ev_town = t ? t.name : null;
      e.ev_harbor = t ? harborName(t.name) : null;
      e.ev_year = 1000 + 25 * ev.epoch;
      e.ev_tier = t ? ({ metropolis: "the capital", city: "the city", "works-town": "the aetherworks town", "frontier-post": "the frontier post" }[t.tier] || t.name) : null;
      e.hasEvName = !!ev.name; e.ev_name = ev.name || null;
      e.ev_faction = FN[ev.faction] || "the Crown";
      e.ev_their = ev.faction === "magnate" ? "their" : "its";
      e.ev_burner = ev.faction === "crown" ? "the Crown's soldiers" : "the Temple's censors";
      e.ev_title = TITLE[ev.faction] || "Sovereign";
      e.ev_place = PLACE[ev.faction] || "the capital";
      e.evContested = !!ev.contested;
      e.evMeasure = ev.measure || null;
      e.ev_measure = MEASURE[ev.measure] || "a measure the clerks did not title";
      e.ev_power = ev.power || (ev.type === "courting" ? "the Rival" : "the Metropole");
      e.ev_occupied = ev.occupied !== undefined ? ev.occupied : null;
      e.hasEvSpan = ev.since !== undefined;
      e.ev_span = ev.since !== undefined ? 25 * (ev.epoch - ev.since) : null;
      // war: chained to a strike within two epochs, and who was fighting
      e.warChained = !!(strikeEv && ev.type === "war" && ev.epoch > strikeEv.epoch && ev.epoch <= strikeEv.epoch + 2);
      e.war_gap = strikeEv ? 25 * (ev.epoch - strikeEv.epoch) : null;
      e.hasWarPowers = !!(ev.factions && ev.factions.length === 2);
      e.war_powers = ev.factions ? `${FN[ev.factions[0]]} and ${FN[ev.factions[1]]}` : null;
      // a strike that a war followed within two epochs
      e.strikeWar = ev.type === "ore_strike" &&
        model.events.some(w => w.type === "war" && w.epoch > ev.epoch && w.epoch <= ev.epoch + 2);
      // the risings
      e.evDominion = !!(reg && reg.occupiedEpoch !== -1 && reg.occupiedEpoch < ev.epoch);
      e.evWon = ev.outcome === "won";
      e.evArc = ev.arc || null;
      // the terms
      if (ev.type === "treaty" && ev.factions) {
        const loser = ev.factions.find(f => f !== ev.winner);
        e.ev_winner = FN[ev.winner] || "the winning side";
        const their = loser === "magnate" ? "their" : "its";   // the magnates are plural and the ledger is theirs
        e.ev_terms = (ev.ceded > 0 ? `${FN[loser]} ceded ${ev.ceded === 1 ? "a gate" : ev.ceded + " gates"}` : `${FN[loser]} ceded nothing but ${their} claim`) +
          (ev.tribute > 0 ? ` and paid ${ev.tribute} in tribute out of ${their} ledger` : ` and kept ${their} ledger, which held little`);
      }
      const shrine = ev.type === "consecration" ? model.sanctionedSites.find(s => s.regionId === ev.region_id) : null;
      e.hasEvShrine = !!shrine; e.ev_shrine = shrine ? shrine.name : null;
      return e;
    }

    // One year-line, composed. Returns "" when the type has nothing gated true,
    // which is how an unrecognized event still leaves no line.
    function eventLine(ev, i, c, model, params, strikeEv, used) {
      const e = eventCtx(c, ev, model, params, strikeEv);
      const v = loomCompose({
        register: "historian", frames: EVENT_FRAMES, pool: EVENT_POOL,
        classes: eventClasses(ev.type), ctx: e, resolve: chronicleResolve,
        rv: loomStream(params.seed, "chronicle", `ev#${i}#${ev.type}`),
        used,
      });
      return v;
    }

    // ---- The findings, composed (D3, #139) ----------------------------------
    //
    // The analyst register, on the loom. `findingsHTML` used to hold about fifteen
    // canned sentences with the numbers interpolated into them, so every world
    // argued its case in the same words and only the figures moved. Same facts now,
    // composed prose: a claim and a gloss drawn from a gated pool, filled from the
    // findings object, and audited slot by slot against it.
    //
    // The engine composes; it does not render. Emphasis is marked **like this**,
    // the way composeChronicle already marks it, and app.mjs turns the markers into
    // whatever the panel wants. That keeps the engine DOM-free and makes the whole
    // surface testable without jsdom.
    //
    // Every fragment obeys the loom's house law (loomLint enforces it in the suite):
    // a clause, never a sentence; no opening capital, no terminal stop; at least one
    // slot. The frames own the punctuation.

    const FINDINGS_FRAMES = [
      "{A}. {B}.", "{A}; {B}.", "{A}, and {B}.", "{A}. {B}.",
      "{A}: {B}.", "{A}, though {B}.", "{A}, and so {B}.", "{A}. And {B}.",
    ];

    const FINDINGS_POOL = {
      // -- the lead: which way the gap moved, and on what ----------------------
      lead: [
        { t: "**this world closed the gap and raised its floor**: the spread ran {num:gini_t0} at the founding and {num:gini} at the close", req: f => f.cell === "shared rise" },
        { t: "**the distance narrowed and the bottom rose with it**, from {num:gini_t0} to {num:gini}", req: f => f.cell === "shared rise" },
        { t: "**a shared rise**: the gap went {num:gini_t0} to {num:gini} and the poorest tenth went up too", req: f => f.cell === "shared rise" },
        { t: "the gap closed from {num:gini_t0} to **{num:gini}**, and it closed by lifting the floor rather than lowering the top", req: f => f.cell === "shared rise" },
        { t: "**this world levelled down**: the gap closed from {num:gini_t0} to {num:gini} and the poorest tenth fell with it", req: f => f.cell === "leveling down" },
        { t: "**the gap closed downward**, {num:gini_t0} to {num:gini}, with the floor lower at the close than at the founding", req: f => f.cell === "leveling down" },
        { t: "**levelling down**: a narrower spread at {num:gini} against {num:gini_t0}, over a floor that dropped", req: f => f.cell === "leveling down" },
        { t: "the spread narrowed to **{num:gini}** from {num:gini_t0}, and the bottom of the realm is worse off for it", req: f => f.cell === "leveling down" },
        { t: "**this world held its shape and raised its floor**: the gap sat at {num:gini_t0} and sits at {num:gini}", req: f => f.cell === "quiet growth" },
        { t: "**quiet growth**: nothing redistributed, the gap holding at {num:gini_t0} then {num:gini}, and the poorest tenth still rose", req: f => f.cell === "quiet growth" },
        { t: "the gap kept its place, {num:gini_t0} to **{num:gini}**, and the floor came up underneath it", req: f => f.cell === "quiet growth" },
        { t: "**this world held its shape and lost its floor**: the gap sat at {num:gini_t0} and sits at {num:gini}", req: f => f.cell === "quiet decay" },
        { t: "**quiet decay**: the spread did not move, {num:gini_t0} to {num:gini}, and the poorest tenth sank anyway", req: f => f.cell === "quiet decay" },
        { t: "the gap held, {num:gini_t0} to **{num:gini}**, while the bottom of the realm gave way", req: f => f.cell === "quiet decay" },
        { t: "**nothing moved the shape of this world** and the floor fell under it, {num:gini_t0} to {num:gini}", req: f => f.cell === "quiet decay" },
        { t: "**this world grew apart while its floor rose**: the gap ran {num:gini_t0} at the founding and {num:gini} at the close", req: f => f.cell === "unequal growth" },
        { t: "**unequal growth**: the poorest tenth gained and the spread widened over it, {num:gini_t0} to {num:gini}", req: f => f.cell === "unequal growth" },
        { t: "**this world got more unequal and poorer at the bottom**: the gap ran {num:gini_t0} at the founding and {num:gini} at the close", req: f => f.cell === "extraction" },
        { t: "**extraction**: the spread opened from {num:gini_t0} to {num:gini} and the poorest tenth fell", req: f => f.cell === "extraction" },
        { t: "what began at {num:gini_t0} ends at **{num:gini}**, and **the floor fell with the widening**", req: f => f.cell === "extraction" },
        { t: "**the distance opened and the bottom dropped**: {num:gini_t0} to {num:gini} across the run", req: f => f.cell === "extraction" },
      ],
      lead_gloss: [
        { t: "that is unusually level for a world of {num:n_regions} regions", req: f => f.gini < 0.35 },
        { t: "worlds this level are rare across {num:n_regions} regions", req: f => f.gini < 0.35 },
        { t: "a realm of {num:n_regions} regions is about as unequal as these worlds get", req: f => f.gini > 0.62 },
        { t: "a gap of {num:gini} is near the ceiling these rules can produce", req: f => f.gini > 0.62 },
        { t: "{num:gini} sits near the middle of all the worlds these rules can roll", req: f => f.gini >= 0.35 && f.gini <= 0.62 },
        { t: "{num:gini} is an ordinary reading for this ruleset", req: f => f.gini >= 0.35 && f.gini <= 0.62 },
        { t: "the founding roll set {num:gini_t0} and the centuries did the rest", req: () => true },
        { t: "the same {num:n_regions} regions carried both readings", req: () => true },
        { t: "few of the worlds these rules can roll come out under {num:gini}", req: f => f.gini < 0.35 },
        { t: "a gap of {num:gini} across {num:n_regions} regions is at the top of this ruleset's range", req: f => f.gini > 0.62 },
        { t: "that is an unremarkable {num:gini} for a run of {num:n_epochs} epochs", req: f => f.gini >= 0.35 && f.gini <= 0.62 },
        { t: "the founding rolled {num:gini_t0} and {num:n_epochs} epochs of compounding did the rest", req: () => true },
      ],
      turning: [
        { t: "it turned on the revolt of {num:turn_year}, and **the rising was put down**", req: f => f.turnKind === "crushed" },
        { t: "the hinge is {num:turn_year}, when the rising came and **was crushed**", req: f => f.turnKind === "crushed" },
        { t: "**the revolt of {num:turn_year} won, and then the town starved**", req: f => f.turnKind === "starved" },
        { t: "the rising of {num:turn_year} carried, and **the winners went hungry**", req: f => f.turnKind === "starved" },
        { t: "**the revolt of {num:turn_year} won, and the town flourished after**", req: f => f.turnKind === "flourished" },
        { t: "the rising of {num:turn_year} carried, and **the ledger turned with it**", req: f => f.turnKind === "flourished" },
        { t: "it turned on {term:measure}, passed in {num:turn_year}", req: f => f.turnKind === "reform" },
        { t: "the hinge is {term:measure} in {num:turn_year}", req: f => f.turnKind === "reform" },
        { t: "it turned on a reaction, {term:measure}, in {num:turn_year}", req: f => f.turnKind === "reaction" },
        { t: "the hinge is {num:turn_year}, when the capital answered with {term:measure}", req: f => f.turnKind === "reaction" },
        { t: "no reform came and no revolt came, so the loops ran unopposed for {num:n_epochs} epochs", req: f => f.turnKind === "none" },
        { t: "nothing interrupted it: {num:n_epochs} epochs and not one reform or rising", req: f => f.turnKind === "none" },
        { t: "the rising of {num:turn_year} was **put down**, and the ledger closed over it", req: f => f.turnKind === "crushed" },
        { t: "**{term:measure}** in {num:turn_year} is where the curve bends", req: f => f.turnKind === "reform" },
        { t: "the answer came in {num:turn_year} as {term:measure}, and it was a **reaction**", req: f => f.turnKind === "reaction" },
        { t: "the rising of {num:turn_year} took the town and then **the harvest failed it**", req: f => f.turnKind === "starved" },
        { t: "{num:turn_year} carried the rising, and **what followed was better**", req: f => f.turnKind === "flourished" },
        { t: "{num:n_epochs} epochs and no hinge at all: neither reform nor rising came", req: f => f.turnKind === "none" },
      ],

      // -- the periodization ---------------------------------------------------
      ages: [
        { t: "the record divides into ages: {term:ages}", req: f => f.hasAges },
        { t: "the run does not read as one period but as {num:n_ages}: {term:ages}", req: f => f.hasAges && f.n_ages > 1 },
        { t: "cut at the turns, the record gives {term:ages}", req: f => f.hasAges },
        { t: "the epochs group into {num:n_ages} ages, {term:ages}", req: f => f.hasAges && f.n_ages > 1 },
        { t: "read as periods rather than years, it runs {term:ages}", req: f => f.hasAges },
        { t: "the run breaks into {num:n_ages} periods rather than reading as one: {term:ages}", req: f => f.hasAges && f.n_ages > 1 },
        { t: "by the gini's own turns the record is {num:n_ages} ages: {term:ages}", req: f => f.hasAges && f.n_ages > 1 },
      ],
      ages_gloss: [
        { t: "the {num:n_ages} ages are cut from the same epoch series the timeline draws, so the two surfaces cannot disagree", req: f => f.n_ages > 1 },
        { t: "the {num:n_ages} cut points are the series' own, not an editor's", req: f => f.n_ages > 1 },
        { t: "nothing chose those boundaries but the turns of the gini itself, {num:gini_t0} to {num:gini}", req: () => true },
        { t: "the same {num:n_epochs} epochs, grouped by where the curve bent", req: () => true },
      ],

      // -- the class ledger inside each town -----------------------------------
      class: [
        { t: "the gap runs inside each town and not only between them: **{num:pop_pct}%** of this realm's people hold **{num:coin_pct}%** of its coin", req: f => f.hasClass },
        { t: "**{num:pop_pct}%** of the people hold **{num:coin_pct}%** of the coin, which is a gap the region map cannot show", req: f => f.hasClass },
        { t: "inside the towns, **{num:pop_pct}%** of the people hold **{num:coin_pct}%** of the coin", req: f => f.hasClass },
        { t: "the owners' row is **{num:pop_pct}%** of this realm and holds **{num:coin_pct}%** of what it earns", req: f => f.hasClass },
        { t: "between towns is not where most of it sits: **{num:pop_pct}%** of the people hold **{num:coin_pct}%** of the coin", req: f => f.hasClass },
        { t: "the sharper gap is within the towns, not between them: **{num:pop_pct}%** hold **{num:coin_pct}%**", req: f => f.hasClass },
        { t: "a region map shows the wrong gap: inside the towns, **{num:pop_pct}%** of the people hold **{num:coin_pct}%** of the coin", req: f => f.hasClass },
        { t: "**{num:coin_pct}%** of the realm's coin belongs to **{num:pop_pct}%** of its people", req: f => f.hasClass },
      ],
      class_gloss: [
        { t: "the owners' row lives **{num:class_gap}×** better than the labour it hires, and the sharpest company town is **{name:company_town}**, where {num:company_share} coins in every hundred belong to that row", req: f => f.hasClass },
        { t: "that row lives **{num:class_gap}×** better than the labour it hires; at **{name:company_town}** it takes {num:company_share} coins in every hundred", req: f => f.hasClass },
        { t: "**{num:within_pct}%** of the whole spread sits inside the towns, which a map drawn by region misses entirely, and inside them the owners live **{num:class_gap}×** better than the labour they hire", req: f => f.hasWithin },
        { t: "a region map misses **{num:within_pct}%** of the spread, because that much of it is within the towns, where the ratio of owner to labour is **{num:class_gap}×**", req: f => f.hasWithin },
        { t: "**{name:company_town}** is the sharpest of them, {num:company_share} coins in every hundred to a row that lives **{num:class_gap}×** better than the labour it hires", req: f => f.hasClass },
        { t: "the ratio is **{num:class_gap}×**, owners to labour, in the same town", req: f => f.hasClass },
      ],

      // -- who carries the poison ----------------------------------------------
      blight: [
        { t: "the poorest fifth of this realm's towns carries **{num:blight_ratio}×** the blight of its richest fifth", req: f => f.hasBlightRatio },
        { t: "poison sorts by wealth here: the poorest fifth of the towns carries **{num:blight_ratio}×** what the richest fifth carries", req: f => f.hasBlightRatio && f.blight_ratio > 1.1 },
        { t: "the bottom fifth of the towns breathes **{num:blight_ratio}×** the blight of the top fifth", req: f => f.hasBlightRatio },
        { t: "measured over the towns that have people in them, the ratio of poorest fifth to richest is **{num:blight_ratio}×**", req: f => f.hasBlightRatio },
        { t: "sorted by wealth, the towns give a blight ratio of **{num:blight_ratio}×**, poorest fifth to richest", req: f => f.hasBlightRatio },
        { t: "the ratio of the poorest fifth's blight to the richest fifth's is **{num:blight_ratio}×**", req: f => f.hasBlightRatio },
        { t: "counted over inhabited towns only, the bottom fifth carries **{num:blight_ratio}×** the top fifth's blight", req: f => f.hasBlightRatio },
      ],
      blight_gloss: [
        { t: "the poison did not settle on the poor across these {num:n_regions} regions: the wealthy end breathes more of it", req: f => f.hasBlightRatio && f.blight_ratio < 0.9 },
        { t: "at {num:blight_ratio}× it is the wealthy end carrying the heavier load, which these rules permit and do not require", req: f => f.hasBlightRatio && f.blight_ratio < 0.9 },
        { t: "over {num:n_regions} regions the poison fell on rich and poor alike", req: f => f.hasBlightRatio && f.blight_ratio >= 0.9 && f.blight_ratio <= 1.1 },
        { t: "at {num:blight_ratio}× the burden is not sorted by wealth at all", req: f => f.hasBlightRatio && f.blight_ratio >= 0.9 && f.blight_ratio <= 1.1 },
        { t: "nobody sited an aetherworks to reach {num:blight_ratio}×; the ratio is what the siting rule produced", req: f => f.hasBlightRatio && f.blight_ratio > 1.1 },
        { t: "across {num:n_regions} regions the ground took it wherever the ground was cheapest", req: f => f.hasBlightRatio && f.blight_ratio > 1.1 },
      ],

      // -- the clustering, with its caveat -------------------------------------
      moran: [
        { t: "clustering is computed from this world's own map: Moran's I puts wealth at **{num:moran_i}** and blight at **{num:moran_blight_i}**, against {num:moran_expected} expected under no structure", req: f => f.hasMoran },
        { t: "wealth clusters at Moran's I **{num:moran_i}** and blight at **{num:moran_blight_i}**, where no structure would give {num:moran_expected}", req: f => f.hasMoran },
        { t: "over the region adjacency, wealth returns Moran's I **{num:moran_i}** and blight **{num:moran_blight_i}**", req: f => f.hasMoran },
        { t: "the two clustering statistics are **{num:moran_i}** for wealth and **{num:moran_blight_i}** for blight, against {num:moran_expected} under no structure", req: f => f.hasMoran },
        { t: "spatial clustering returns **{num:moran_i}** for wealth and **{num:moran_blight_i}** for blight over the region adjacency", req: f => f.hasMoran },
        { t: "the adjacency graph gives Moran's I **{num:moran_i}** on wealth, **{num:moran_blight_i}** on blight", req: f => f.hasMoran },
        { t: "neither field is randomly arranged: Moran's I reads **{num:moran_i}** and **{num:moran_blight_i}** against {num:moran_expected}", req: f => f.hasMoran },
        { t: "wealth and blight both cluster, at **{num:moran_i}** and **{num:moran_blight_i}**, where no structure would return {num:moran_expected}", req: f => f.hasMoran },
      ],
      moran_gloss: [
        { t: "the figure describes this generated map's internal structure and not the world outside: the terrain is laid down with smoothing kernels, so neighbouring cells resemble each other by construction and some correlation is guaranteed before any economy runs (p {num:moran_p} and {num:moran_blight_p} over {num:moran_perm} permutations)", req: f => f.hasMoran },
        { t: "the smoothing kernels that lay down the terrain guarantee some of this before any economy runs, so the number describes the map's construction as much as its history (p {num:moran_p} and {num:moran_blight_p}, {num:moran_perm} permutations)", req: f => f.hasMoran },
        { t: "p {num:moran_p} and {num:moran_blight_p} over {num:moran_perm} permutations of the adjacency, which tests the arrangement and not the cause", req: f => f.hasMoran },
        { t: "neighbouring cells resemble each other by construction here, so treat the figure as a property of the generated map (p {num:moran_p} / {num:moran_blight_p})", req: f => f.hasMoran },
        { t: "some of that is guaranteed by construction, since the terrain is laid down with smoothing kernels and neighbours resemble each other before any economy runs (p {num:moran_p} / {num:moran_blight_p}, {num:moran_perm} permutations)", req: f => f.hasMoran },
        { t: "the permutation test ({num:moran_perm} draws, p {num:moran_p} and {num:moran_blight_p}) asks whether this arrangement is unusual for this map, not whether it is unusual for a world", req: f => f.hasMoran },
        { t: "treat it as a property of the generated map: smoothing kernels put correlation into the terrain before the first town was placed (p {num:moran_p} / {num:moran_blight_p})", req: f => f.hasMoran },
      ],

      // -- the wall, the rain, the twins ---------------------------------------
      shadow: [
        { t: "behind the {name:ridge} wall a median settlement takes **{num:shadow_gap}% less** than the open country at the same remove from the capital", req: f => f.hasShadow },
        { t: "the {name:ridge} costs the country behind it **{num:shadow_gap}%** of the median settlement's earnings, distance held equal", req: f => f.hasShadow },
        { t: "at equal distance from the capital, the country behind the {name:ridge} earns **{num:shadow_gap}% less**", req: f => f.hasShadow },
        { t: "the shadow of the {name:ridge} is worth **{num:shadow_gap}%** of a median settlement's earnings", req: f => f.hasShadow },
        { t: "the country behind the {name:ridge} earns **{num:shadow_gap}% less** than its equals in the open", req: f => f.hasShadow },
        { t: "hold the distance to the capital constant and the {name:ridge} still costs **{num:shadow_gap}%**", req: f => f.hasShadow },
        { t: "a median settlement behind the {name:ridge} is **{num:shadow_gap}%** poorer than one the same distance out in the open", req: f => f.hasShadow },
      ],
      shadow_gloss: [
        { t: "distance is held equal in that comparison, so the {name:ridge} is what is left", req: f => f.hasShadow },
        { t: "nothing but the {name:ridge} separates the two sides of it", req: f => f.hasShadow },
        { t: "the roads across it go through {num:crossings} crossings and no further", req: f => f.hasCrossings },
        { t: "the capital at {term:realm} is the same walk away for both", req: f => f.hasShadow },
        { t: "the {name:ridge} is the only term left once distance is controlled for", req: f => f.hasShadow },
        { t: "there are {num:crossings} ways through the {name:ridge} and no fourth option", req: f => f.hasCrossings },
        { t: "the {name:ridge} was there before the capital chose its site", req: f => f.hasShadow && f.hasCrossings },
      ],
      rain: [
        { t: "the {name:ridge} splits the rain: median rainfall **{num:rain_wet}** on its wet side and **{num:rain_dry}** in its lee", req: f => f.hasRain },
        { t: "rainfall reads **{num:rain_wet}** on the windward side of the {name:ridge} and **{num:rain_dry}** behind it", req: f => f.hasRain },
        { t: "the same {name:ridge} divides the weather, **{num:rain_wet}** against **{num:rain_dry}**", req: f => f.hasRain },
        { t: "the {name:ridge} takes the rain: **{num:rain_wet}** on the windward side, **{num:rain_dry}** in the lee", req: f => f.hasRain },
        { t: "median rainfall falls from **{num:rain_wet}** to **{num:rain_dry}** across the {name:ridge}", req: f => f.hasRain },
        { t: "one side of the {name:ridge} gets **{num:rain_wet}** and the other **{num:rain_dry}**", req: f => f.hasRain },
      ],
      rain_gloss: [
        { t: "the farms followed the rain, and nobody in the {name:ridge} lee chose the wind", req: () => true },
        { t: "the wind over these {num:n_regions} regions was set before the first settlement and has not been asked since", req: () => true },
        { t: "a difference of {num:rain_wet} to {num:rain_dry} is upstream of every choice anyone here made", req: () => true },
        { t: "the farms went where the water was, {num:rain_wet} against {num:rain_dry}, and the wind was not consulted", req: () => true },
        { t: "a {num:rain_wet}-to-{num:rain_dry} split in the rain is upstream of every settlement decision that followed", req: () => true },
      ],
      twins: [
        { t: "**{name:twin_open}** and **{name:twin_shadow}** stand the same distance from the capital, one in the open and one behind the wall", req: f => f.hasTwins },
        { t: "two towns at one distance: **{name:twin_open}** in the open, **{name:twin_shadow}** behind the wall", req: f => f.hasTwins },
        { t: "the pair to read is **{name:twin_open}** and **{name:twin_shadow}**, equidistant from the capital and divided by rock", req: f => f.hasTwins },
        { t: "the exhibit is **{name:twin_open}** against **{name:twin_shadow}**: same distance from the capital, opposite sides of the rock", req: f => f.hasTwins },
        { t: "hold distance constant and you get **{name:twin_open}** and **{name:twin_shadow}**, one open and one walled", req: f => f.hasTwins },
        { t: "**{name:twin_shadow}** sits behind the wall at the same remove from the capital as **{name:twin_open}** sits in front of it", req: f => f.hasTwins },
      ],
      twins_gloss: [
        { t: "{name:twin_open} returns wealth {num:twin_open_wealth}, market {num:twin_open_market}, burden {num:twin_open_burden}; {name:twin_shadow} returns {num:twin_shadow_wealth}, {num:twin_shadow_market}, {num:twin_shadow_burden}, and **the difference is the mountain**", req: f => f.hasTwins },
        { t: "wealth {num:twin_open_wealth} against {num:twin_shadow_wealth}, market {num:twin_open_market} against {num:twin_shadow_market}, burden {num:twin_open_burden} against {num:twin_shadow_burden}: **the mountain is the whole of it**", req: f => f.hasTwins },
        { t: "the open twin carries wealth {num:twin_open_wealth} and burden {num:twin_open_burden}, the walled one {num:twin_shadow_wealth} and {num:twin_shadow_burden}, and **nothing else separates them**", req: f => f.hasTwins },
        { t: "wealth {num:twin_open_wealth} against {num:twin_shadow_wealth} and burden {num:twin_open_burden} against {num:twin_shadow_burden}, with **the rock as the only variable**", req: f => f.hasTwins },
        { t: "market access {num:twin_open_market} against {num:twin_shadow_market}, wealth {num:twin_open_wealth} against {num:twin_shadow_wealth}: **the mountain is the whole of the difference**", req: f => f.hasTwins },
        { t: "one carries burden {num:twin_open_burden} and the other {num:twin_shadow_burden} at identical distance, so **the wall is the explanation and there is no other**", req: f => f.hasTwins },
      ],

      // -- the grid, the mouth, the gates --------------------------------------
      dark: [
        { t: "**{num:dark_n}** of {num:n_regions} regions have no grid line, the projection being that serving them would not repay it", req: () => true },
        { t: "the ledgers left **{num:dark_n}** of {num:n_regions} regions unwired, on the grounds that wiring them would not pay", req: () => true },
        { t: "**{num:dark_n}** regions in {num:n_regions} have no line to them, and the reason entered was cost", req: () => true },
        { t: "of {num:n_regions} regions, **{num:dark_n}** were found not worth connecting", req: () => true },
        { t: "**{num:dark_n}** regions were left off the grid on a projection that they would not repay the wire", req: () => true },
        { t: "the wire stops short of **{num:dark_n}** of {num:n_regions} regions, by arithmetic rather than by accident", req: () => true },
        { t: "a cost projection drew a line and **{num:dark_n}** regions fell outside it", req: () => true },
      ],
      dark_gloss: [
        { t: "they carry **{num:dark_burden}×** the disease burden of the lit core", req: f => f.hasDarkBurden },
        { t: "sickness runs **{num:dark_burden}×** heavier there than where the wires reach", req: f => f.hasDarkBurden },
        { t: "the decision was arithmetic across all {num:n_regions} and the consequence is not", req: f => !f.hasDarkBurden },
        { t: "no one in any of the {num:dark_n} voted on that boundary; a projection drew it", req: f => !f.hasDarkBurden },
        { t: "disease runs **{num:dark_burden}×** heavier outside the wire than inside it", req: f => f.hasDarkBurden },
        { t: "the unwired carry **{num:dark_burden}×** the burden of the wired, which is the projection's cost, paid by someone else", req: f => f.hasDarkBurden },
        { t: "the boundary was drawn once, on cost, and has held for {num:n_epochs} epochs", req: f => !f.hasDarkBurden },
      ],
      mouth: [
        { t: "**{name:mouth_town}** stands at the river mouth and takes **{num:mouth_downstream} points** of other towns' poison with the water", req: f => f.hasMouth },
        { t: "everything upstream ends at **{name:mouth_town}**, which carries **{num:mouth_downstream} points** of blight it did not make", req: f => f.hasMouth },
        { t: "**{num:mouth_downstream} points** of the blight at **{name:mouth_town}** were put in the water by towns above it", req: f => f.hasMouth },
        { t: "the last town on the water is **{name:mouth_town}**, and it carries **{num:mouth_downstream} points** of blight from upstream", req: f => f.hasMouth },
        { t: "**{name:mouth_town}** drinks what {num:n_regions} regions upstream of it discard: **{num:mouth_downstream} points**", req: f => f.hasMouth },
        { t: "at the mouth, **{name:mouth_town}** takes delivery of **{num:mouth_downstream} points** of other towns' poison", req: f => f.hasMouth },
      ],
      mouth_gloss: [
        { t: "the land set {name:mouth_town} last in that order before anyone built anything", req: () => true },
        { t: "nobody in {name:mouth_town} chose to be last in the queue", req: () => true },
        { t: "the river decided that sequence for all {num:n_regions} regions, and the ledger kept it", req: () => true },
        { t: "{name:mouth_town}'s position in the chain was fixed by the water and has never been renegotiated", req: f => f.hasMouth },
        { t: "being last on {num:n_regions} regions' river is not a policy anyone adopted", req: () => true },
        { t: "the order that put {name:mouth_town} last was set by gradient, not by anyone's choice", req: f => f.hasMouth },
      ],
      toll: [
        { t: "**{num:toll_n}** regions hand a tariff to gate-holders they had no part in choosing", req: f => f.hasToll },
        { t: "at **{num:toll_n}** regions the crossing is held by someone the region did not pick, and the tariff is paid anyway", req: f => f.hasToll },
        { t: "**{num:toll_n}** regions cross ground they do not hold, and are charged for it", req: f => f.hasToll },
        { t: "**{num:toll_n}** regions are charged at crossings they do not own", req: f => f.hasToll },
        { t: "a tariff falls on **{num:toll_n}** regions at gates chosen by geology and held by someone else", req: f => f.hasToll },
        { t: "**{num:toll_n}** of {num:n_regions} regions pay to pass ground held by a party they never selected", req: f => f.hasToll },
      ],
      toll_gloss: [
        { t: "the drag those tariffs put on trade across the realm reads {num:trade_drag}", req: f => f.hasDrag && f.trade_drag > 0 },
        { t: "the upkeep has lapsed on {num:crossings_decayed} of {num:crossings} crossings, which raises the charge again", req: f => f.hasDecay },
        { t: "at every one of the {num:crossings} crossings the holder was decided by where the rock narrowed", req: f => f.hasCrossings },
        { t: "{num:crossings_decayed} of {num:crossings} crossings have fallen past their upkeep, which raises what the passage costs again", req: f => f.hasDecay },
        { t: "geology chose the {num:crossings} narrow places and whoever held them at the founding still does", req: f => f.hasCrossings },
        { t: "there is no route around the {num:crossings} of them; that is what makes them worth holding", req: f => f.hasToll && f.hasCrossings },
      ],

      // -- the census, the empire, the sky --------------------------------------
      zipf: [
        { t: "the towns fall into a **rank-size hierarchy**, and the big-town tail runs at slope α {num:tail_alpha}", req: f => f.hasZipf },
        { t: "the census sorts into a **rank-size hierarchy** whose tail slope is α {num:tail_alpha}", req: f => f.hasZipf },
        { t: "town sizes lie on a **rank-size line**: tail slope α {num:tail_alpha}, α {num:alpha} across the whole system", req: f => f.hasZipf },
        { t: "the size distribution is a **rank-size hierarchy**, fitted at α {num:alpha} overall and α {num:tail_alpha} in the tail", req: f => f.hasZipf },
        { t: "town sizes here obey a **rank-size law**, α {num:alpha} across the system and α {num:tail_alpha} in the tail, with the largest holding {num:primacy}× the second", req: f => f.hasZipf },
        { t: "the census is a **rank-size hierarchy** and the tail is the part worth reading: α {num:tail_alpha}", req: f => f.hasZipf },
        { t: "ranked by size, the towns lie on a line: α {num:alpha} over the system, α {num:tail_alpha} in the big-town tail", req: f => f.hasZipf },
        { t: "the size distribution came out **rank-size**, tail slope α {num:tail_alpha}, fit {num:tail_r2}", req: f => f.hasZipf },
      ],
      zipf_gloss: [
        { t: "the regularity itself is built in: the founding centuries grow every town by proportional random increments, which is Gibrat's rule, and that rule produces a size law on its own. What is **not** decided in advance is how steep it comes out, and the steepness is the finding, not the law (fit {num:tail_r2}, primacy {num:primacy}×)", req: f => f.hasZipf },
        { t: "the shape is Gibrat's rule, written in at the founding, so the law is not the finding; the steepness is, at fit {num:tail_r2} with the largest town holding {num:primacy}× the second", req: f => f.hasZipf },
        { t: "proportional growth guarantees a size law before any economy runs, so read the slope and not the line: fit {num:tail_r2}, primacy {num:primacy}×", req: f => f.hasZipf },
        { t: "the law was written in at the founding by proportional growth, so it is not evidence of anything; the slope is, at α {num:tail_alpha} and fit {num:tail_r2}", req: f => f.hasZipf },
        { t: "a size law is guaranteed here before any economy runs, which is why the claim is about steepness (α {num:tail_alpha}, fit {num:tail_r2}) and not about shape", req: f => f.hasZipf },
        { t: "primacy {num:primacy}× and fit {num:tail_r2}: the regularity was decreed at the founding, the steepness was not", req: f => f.hasZipf },
        { t: "proportional growth produces this line on its own, so read α {num:tail_alpha} at fit {num:tail_r2} and not the fact that there is a line at all", req: f => f.hasZipf },
      ],
      sovereignty: [
        { t: "**{num:occupied_n}** regions are occupied ground, and every levy in them is paid to a power no one here can petition", req: f => f.hasSov },
        { t: "on **{num:occupied_n}** regions the levy leaves the realm entirely, to a power with no petitioner in it", req: f => f.hasSov },
        { t: "**{num:occupied_n}** regions answer to an authority outside this map", req: f => f.hasSov },
        { t: "**{num:occupied_n}** regions are under occupation, and the levy leaves with the cargo", req: f => f.hasSov },
        { t: "sovereignty is the last inequality here: **{num:occupied_n}** regions do not hold their own", req: f => f.hasSov },
        { t: "on **{num:occupied_n}** regions the question of who is owed is settled outside the realm", req: f => f.hasSov },
      ],
      sovereignty_gloss: [
        { t: "the free country keeps **{num:retent}×** the share of its own value that the occupied country keeps, and yet the occupied zone is the realm's best-wired ({num:wired} of {num:occupied_n} on the grid): **the grid reaches you when someone else wants what you have**", req: f => f.hasSov },
        { t: "retention runs **{num:retent}×** higher in the free country, while the wires run the other way, {num:wired} of {num:occupied_n} occupied regions connected: **the line follows the cargo**", req: f => f.hasSov },
        { t: "the occupied owners' row holds {num:comprador}× the free realm's share, so the occupation did not replace the owners; **it hired them**", req: f => f.hasComprador },
        { t: "the free country retains **{num:retent}×** what the occupied country retains, and {num:wired} of {num:occupied_n} occupied regions are wired: **the line follows what someone else wants**", req: f => f.hasSov },
        { t: "**{num:wired}** of {num:occupied_n} occupied regions carry a grid line, which is the best coverage in the realm, and retention there runs at **{num:retent}×** below the free country's", req: f => f.hasSov },
        { t: "the occupied owners' row holds **{num:comprador}×** the free realm's share, so the occupation kept the owners and changed only who they answer to", req: f => f.hasComprador },
      ],
      concessions: [
        { t: "the empire mostly did not invade, it bought in: **{num:conc_n}** {term:coast_is} a foreign concession", req: f => f.hasConc },
        { t: "**{num:conc_n}** {term:coast_is} held by concession rather than by conquest", req: f => f.hasConc },
        { t: "**{num:aband_n}** {term:coast_was} wound up when the lode ran thin, and **the attention left with the ore**", req: f => f.hasAband && !f.hasConc },
        { t: "**{num:conc_n}** {term:coast_is} owned from outside without ever being invaded", req: f => f.hasConc },
        { t: "the empire took **{num:conc_n}** {term:coast_is} by contract, which is cheaper than taking {term:coast_is} by force", req: f => f.hasConc },
        { t: "the reach here is commercial: **{num:conc_n}** {term:coast_is} a concession of {name:metropole}", req: f => f.hasConc },
        { t: "no fleet was needed for **{num:conc_n}** {term:coast_is}; a contract with {name:metropole} did it", req: f => f.hasConc },
        { t: "**{num:aband_n}** {term:coast_was} developed and then dropped", req: f => f.hasAband && !f.hasConc },
        { t: "the empire came to **{num:aband_n}** of these coasts and then stopped coming", req: f => f.hasAband && !f.hasConc },
      ],
      concessions_gloss: [
        { t: "richer than the median at **{num:conc_wealth}** against {num:median_wealth}, with **{num:foreign_claim}%** of the yield entered in {name:metropole}'s books: **it was developed and owned in the same ledger**", req: f => f.hasConc && f.concRicher },
        { t: "the concession outearns the median, {num:conc_wealth} to {num:median_wealth}, and sends **{num:foreign_claim}%** of it home to {name:metropole}", req: f => f.hasConc && f.concRicher },
        { t: "poorer than the median it sits in, **{num:conc_wealth}** against {num:median_wealth}, and still sending **{num:foreign_claim}%** of its yield to {name:metropole}", req: f => f.hasConc && !f.concRicher },
        { t: "worth **{num:conc_wealth}** against a median of {num:median_wealth} and remitting **{num:foreign_claim}%** to {name:metropole} regardless: **the claim does not wait on the yield**", req: f => f.hasConc && !f.concRicher },
        { t: "**{num:aband_n}** {term:coast_was} let go when the ore thinned, and **the attention left with the ore**", req: f => f.hasAband && f.hasConc },
        { t: "the yield is entered in {name:metropole}'s books at **{num:foreign_claim}%**, whatever the ground itself returns", req: f => f.hasConc },
        { t: "{name:metropole} books **{num:foreign_claim}%** of what comes out, and the ground keeps the rest and the ruin", req: f => f.hasConc },
        { t: "at **{num:conc_wealth}** against a median of {num:median_wealth}, the concession is not a gift to the district it sits in", req: f => f.hasConc },
        { t: "**{num:aband_n}** more {term:coast_was} wound up when the ore thinned, and the ground got its ruin and its freedom in the same year", req: f => f.hasAband && f.hasConc },
      ],
      sky: [
        { t: "behind the wall the lanes would cut the road to the capital by **{num:sky_shadow}%**, where the open country gains {num:sky_open}%", req: f => f.hasSky },
        { t: "the skyway is worth **{num:sky_shadow}%** of the walled country's distance and only {num:sky_open}% of the open country's", req: f => f.hasSky },
        { t: "flight would help the walled country most: **{num:sky_shadow}%** off its road to the capital against {num:sky_open}% off the open country's", req: f => f.hasSky },
        { t: "the lanes are worth **{num:sky_shadow}%** of the walled country's road and {num:sky_open}% of the open country's", req: f => f.hasSky },
        { t: "measured in distance saved, the skyway gives the shadow **{num:sky_shadow}%** and the open country {num:sky_open}%", req: f => f.hasSky },
        { t: "**{num:sky_shadow}%** off the walled road, {num:sky_open}% off the open one: the sky is worth most where the ground is worst", req: f => f.hasSky },
      ],
      sky_gloss: [
        { t: "boarding is a privilege of the owners' row, so **the {num:sky_shadow}% goes to the country that can least afford the fare**", req: f => f.hasSky },
        { t: "the fare is the filter: **the lane saves {num:sky_shadow}% for whoever can board, and the walk is what the rest keep**", req: f => f.hasSky },
        { t: "the owners' row of the shadow twin measures the wall at **{num:twin_sky}% less**, and its labour still walks the pass", req: f => f.hasTwinSky },
        { t: "the fare sorts who gets the **{num:sky_shadow}%**, and it is not the country that needs it", req: f => f.hasSky },
        { t: "a lane that saves **{num:sky_shadow}%** is a lane priced beyond the people it would save it for", req: f => f.hasSky },
        { t: "the shadow twin's owners' row measures the wall at **{num:twin_sky}% less** and its labour still walks the pass", req: f => f.hasTwinSky },
      ],

      // -- the close -----------------------------------------------------------
      closer: [
        { t: "none of this was painted: it fell out of where the ore lay, where the wall stood, which way the water ran, and what the ledgers said would pay, and every one of these {num:n_facts} figures recomputes from the exported columns", req: () => true },
        { t: "nobody steered this: it fell out of the ore, the wall, the water and the ledgers, and all {num:n_facts} figures above recompute from the exported columns", req: () => true },
        { t: "no author placed any of it. The ground, the wall, the water and the arithmetic did, and each of the {num:n_facts} figures here recomputes from the export", req: () => true },
        { t: "there is no villain in this record and it happened anyway; every one of the {num:n_facts} figures recomputes from the exported columns", req: () => true },
        { t: "no author placed any of this. The ore, the wall, the water and the arithmetic did, and all {num:n_facts} figures recompute from the export", req: () => true },
        { t: "every one of these {num:n_facts} figures came out of the same {num:n_regions} regions and recomputes from the exported columns", req: () => true },
        { t: "the record is arithmetic all the way down: {num:n_facts} figures, each recomputable from the export, none of them written by hand", req: () => true },
        { t: "nothing above was authored. It fell out of the ore, the wall, the water and what the ledgers said would pay, across {num:n_epochs} epochs", req: () => true },
        { t: "not one of the {num:n_facts} figures here was chosen; each is what the rules returned, and each recomputes from the exported columns", req: () => true },
        { t: "the ground, the wall and the arithmetic wrote this between them, and all {num:n_facts} figures recompute from the export", req: () => true },
        { t: "{num:n_epochs} epochs of it, {num:n_facts} figures, and no hand on the scale: every value recomputes from the exported columns", req: () => true },
        { t: "read it as arithmetic rather than as argument: {num:n_facts} figures over {num:n_regions} regions, all of them recomputable", req: () => true },
      ],
    };

    // The order the blocks argue in. Each entry is [claim class, gloss class]; a
    // block appears only if its claim class has a fragment whose req passes, which
    // is the gating doing the work the old `if` ladder did.
    const FINDINGS_ORDER = [
      ["lead", "lead_gloss"], ["turning", null], ["ages", "ages_gloss"],
      ["class", "class_gloss"], ["blight", "blight_gloss"], ["moran", "moran_gloss"],
      ["shadow", "shadow_gloss"], ["dark", "dark_gloss"], ["mouth", "mouth_gloss"],
      ["toll", "toll_gloss"], ["rain", "rain_gloss"], ["twins", "twins_gloss"],
      ["zipf", "zipf_gloss"], ["sovereignty", "sovereignty_gloss"],
      ["concessions", "concessions_gloss"], ["sky", "sky_gloss"], ["closer", null],
    ];

    const FINDINGS_MEASURES = {
      dumping_reform: "a Dumping Reform", grid_charter: "a Grid Charter",
      toll_amnesty: "a Tariff Amnesty", retention_act: "a Retention Act",
      crown_granary: "the Crown Granary", dumping_entrenched: "the dumping entrenched in law",
      toll_crackdown: "a tariff crackdown",
    };

    // The context every fragment gates on and every slot fills from: the findings
    // object, flattened, with the branch predicates precomputed so a `req` reads as
    // a claim about the world rather than as a null check.
    function findingsCtx(model, params) {
      const F = getFindings(model);
      const town = (id) => model.settlements.find(st => st.regionId === id)
        || { name: ((model.regions.find(r => r.id === id) || {}).placeName) || "the wild" };
      const reg = (id) => model.regions.find(r => r.id === id) || {};
      const tw = F.twins ? { open: reg(F.twins.open), shadow: reg(F.twins.shadow) } : null;
      const t = F.turning;
      const turnKind = !t ? "none"
        : t.type === "revolt" ? (t.outcome === "won" ? (t.arc === "starved" ? "starved" : "flourished") : "crushed")
        : t.type === "reform" ? "reform" : "reaction";
      return {
        F, dG: F.gini - F.gini_t0, gini: F.gini, gini_t0: F.gini_t0,
        // D5 (#141): the lead read dG alone, so a world whose gap closed while its
        // poorest ground emptied still opened with "this world closed the gap". The
        // band reads the same verdict function the judge and the chronicle read.
        cell: F.verdict.cell, gapDir: F.verdict.gap, floorDir: F.verdict.floor, growthQ: F.verdict.growth,
        floor_now: F.floor.p10, floor_t0: F.floor.p10_t0,
        n_regions: model.regions.length, n_epochs: model.epochSnaps.length - 1,
        realm: model.capitalName,
        turnKind: (t || params.ep > 0) ? turnKind : "none",
        turn_year: t ? 1000 + 25 * t.epoch : null,
        measure: t && t.measure ? FINDINGS_MEASURES[t.measure] : null,
        hasAges: !!(F.ages && F.ages.length > 1), n_ages: F.ages ? F.ages.length : 0,
        ages: F.ages ? F.ages.map(a => `**${a.name}** (${1000 + 25 * a.from_epoch}–${1000 + 25 * a.to_epoch}, gini ${a.gini_start.toFixed(2)} → ${a.gini_end.toFixed(2)})`).join(", ") : null,
        hasClass: !!(F.owners && F.class_gap !== null),
        pop_pct: F.owners ? F.owners.pop_pct : null, coin_pct: F.owners ? F.owners.coin_pct : null,
        class_gap: F.class_gap, company_town: F.company_town !== undefined && F.company_town !== null ? town(F.company_town).name : null,
        company_share: F.company_share,
        hasWithin: F.within_pct !== null && F.within_pct >= 15, within_pct: F.within_pct,
        hasBlightRatio: F.blight_ratio !== null, blight_ratio: F.blight_ratio,
        hasMoran: !!(F.moran && F.moran_blight),
        moran_i: F.moran ? F.moran.I : null, moran_blight_i: F.moran_blight ? F.moran_blight.I : null,
        moran_expected: F.moran ? F.moran.expected : null, moran_p: F.moran ? F.moran.p : null,
        moran_blight_p: F.moran_blight ? F.moran_blight.p : null, moran_perm: F.moran ? F.moran.n_perm : null,
        ridge: model.ridges.length ? model.ridges[0].name : null,
        hasShadow: F.shadow_gap_pct !== null && F.shadow_gap_pct > 0 && model.ridges.length > 0,
        shadow_gap: F.shadow_gap_pct,
        hasCrossings: F.crossings_total > 0, crossings: F.crossings_total,
        crossings_decayed: F.crossings_decayed, hasDecay: F.crossings_decayed > 0,
        hasRain: !!(F.rain_split && F.rain_split.wet - F.rain_split.dry >= 8 && model.ridges.length),
        rain_wet: F.rain_split ? F.rain_split.wet : null, rain_dry: F.rain_split ? F.rain_split.dry : null,
        hasTwins: !!F.twins,
        twin_open: tw ? town(F.twins.open).name : null, twin_shadow: tw ? town(F.twins.shadow).name : null,
        twin_open_wealth: tw ? tw.open.wealth : null, twin_open_market: tw ? tw.open.marketAccess : null,
        twin_open_burden: tw ? tw.open.burden : null, twin_shadow_wealth: tw ? tw.shadow.wealth : null,
        twin_shadow_market: tw ? tw.shadow.marketAccess : null, twin_shadow_burden: tw ? tw.shadow.burden : null,
        dark_n: F.dark_n, hasDarkBurden: F.dark_burden_ratio !== null && F.dark_burden_ratio > 1,
        dark_burden: F.dark_burden_ratio,
        hasMouth: F.mouth_region !== null,
        mouth_town: F.mouth_region !== null ? town(F.mouth_region).name : null,
        mouth_downstream: F.mouth_downstream,
        hasToll: F.toll_paying_n > 0, toll_n: F.toll_paying_n,
        hasDrag: F.trade_drag !== null && F.trade_drag !== undefined, trade_drag: F.trade_drag,
        hasZipf: !!F.zipf, alpha: F.zipf ? F.zipf.alpha : null, tail_alpha: F.zipf ? F.zipf.tail_alpha : null,
        tail_r2: F.zipf ? F.zipf.tail_r2 : null, primacy: F.zipf ? F.zipf.primacy : null,
        hasSov: !!F.sovereignty, occupied_n: F.sovereignty ? F.sovereignty.occupied_n : null,
        retent: F.sovereignty ? F.sovereignty.retent_ratio : null,
        wired: F.sovereignty ? F.sovereignty.corridor_wired : null,
        hasComprador: !!(F.sovereignty && F.sovereignty.comprador_ratio > 1),
        comprador: F.sovereignty ? F.sovereignty.comprador_ratio : null,
        hasConc: !!(F.concessions && F.concessions.concession_n > 0),
        concRicher: !!(F.concessions && F.concessions.conc_wealth > F.concessions.median_wealth),
        hasAband: !!(F.concessions && F.concessions.abandoned_n > 0),
        conc_n: F.concessions ? F.concessions.concession_n : null,
        aband_n: F.concessions ? F.concessions.abandoned_n : null,
        conc_wealth: F.concessions ? F.concessions.conc_wealth : null,
        median_wealth: F.concessions ? F.concessions.median_wealth : null,
        foreign_claim: F.concessions ? F.concessions.foreign_claim : null,
        coast_is: F.concessions && F.concessions.concession_n === 1 ? "coast is" : "coasts are",
        coast_was: F.concessions && F.concessions.abandoned_n === 1 ? "coast was" : "coasts were",
        metropole: model.metropole,
        hasSky: !!(F.sky && F.sky.shadow_adv !== null && F.sky.open_adv !== null && F.sky.shadow_adv >= F.sky.open_adv + 5),
        sky_shadow: F.sky ? F.sky.shadow_adv : null, sky_open: F.sky ? F.sky.open_adv : null,
        hasTwinSky: !!(F.twins && F.sky && F.sky.twin_sky !== null && F.sky.twin_sky > 0),
        twin_sky: F.sky ? F.sky.twin_sky : null,
        n_facts: 0,          // filled in on the second pass: the closer counts the rest
      };
    }

    // Slot resolution. `num` returns {value, rule} where the analyst quotes to a
    // fixed precision — a gini to two places, a Moran's I to three — so the audit
    // recomputes the told from the true and a moved digit fails.
    const FINDINGS_FIXED = {
      gini: "fixed2", gini_t0: "fixed2", moran_i: "fixed3", moran_blight_i: "fixed3",
      moran_expected: "fixed3", moran_p: "fixed3", moran_blight_p: "fixed3",
      alpha: "fixed2", tail_alpha: "fixed2", tail_r2: "fixed2", primacy: "fixed1",
      dark_burden: "fixed1", blight_ratio: "fixed1", retent: "fixed1", comprador: "fixed1",
      class_gap: "fixed1", trade_drag: "fixed1", foreign_claim: "pct",
    };
    const findingsResolve = (kind, key, c) => {
      if (kind === "name" || kind === "term") return c[key];
      if (kind === "num") {
        const v = c[key];
        if (v === null || v === undefined) return null;
        return FINDINGS_FIXED[key] ? { value: v, rule: FINDINGS_FIXED[key] } : v;
      }
      return null;
    };

    // Compose the panel. Returns blocks, each with its own facts[], so the caller
    // can render and the suite can audit without either one parsing prose.
    // D4 (#140) parameterises the register and the surface. "What the Record Shows"
    // was this same argument written a SECOND time in the historian's voice: same
    // facts, same conditions, different words, maintained twice. The chronicle calls
    // this now instead of carrying its own copy, which is also the only way the two
    // surfaces cannot drift — a hazard the app already worried about for its pull
    // quotes ("COMPUTED from the findings, never parsed from prose").
    function composeFindings(model, params, opts) {
      const o = opts || {};
      const register = o.register || "analyst", surface = o.surface || "findings";
      const c = findingsCtx(model, params);
      const blocks = [];
      let factN = 0;
      for (const [claim, gloss] of FINDINGS_ORDER) {
        if (o.skip && o.skip.includes(claim)) continue;
        if (!loomGate(FINDINGS_POOL, claim, c, undefined, new Set()).length) continue;
        if (claim === "closer") c.n_facts = factN;
        const v = loomCompose({
          register, frames: FINDINGS_FRAMES, pool: FINDINGS_POOL,
          classes: [gloss ? [claim, gloss] : [claim]], ctx: c, resolve: findingsResolve,
          rv: loomStream(params.seed, surface, claim),
        });
        if (!v.text) continue;
        factN += v.facts.filter(f => f.path.startsWith("num:")).length;
        blocks.push({ topic: claim, text: v.text, facts: v.facts, names: v.names });
      }
      return blocks;
    }

    // ---- The verdict, composed (D5, #141) -----------------------------------
    //
    // §3.5's verdict space already exists as a CLASS (B11, #133): the gap's move
    // crossed with the floor's, qualified by growth. Nothing has ever read it. The
    // three surfaces that pass judgement — the findings band's lead, the chronicle's
    // close, and (E1) the reign panel — each did their own three-way read of the
    // gini delta alone, which is why a world whose gap closed while its poorest
    // ground emptied still opened with "this world closed the gap".
    //
    // The judge register is on the SPELLED law: no numeral may appear on the page.
    // That is the register's whole character rather than an inconvenience. The
    // analyst quotes to two decimal places and the historian to the digit; the judge
    // argues, and an argument that leans on a third decimal is not an argument. So
    // the judge speaks in counts and in parts of a hundred, spelled out, and every
    // one of them is still audited against the same export column.
    //
    // CONTINGENT CONVICTION (§3.5): the judge argues hard about THIS world and holds
    // no opinion about worlds in general. Nothing here says "usually", "worlds like
    // this", or "as always" — the pool has no vocabulary for a comparison it cannot
    // make, because the app measures one world at a time and a claim across worlds
    // would be a claim the export cannot support.
    const VERDICT_FRAMES = [
      "{A}. {B}.", "{A}, and {B}.", "{A}; {B}.", "{A}: {B}.", "{A}. And {B}.",
      "{A}, though {B}.", "{A}, so {B}.",
    ];

    const VERDICT_POOL = {
      // -- the six cells of §3.5's matrix -------------------------------------
      claim: [
        // closed | rose
        { t: "{name:realm} shared what it gained, and the distance between its regions closed while its poorest ground rose with it", req: c => c.cell === "shared rise" },
        { t: "the gap across {num:settled_n} regions narrowed and the floor came up underneath it, which are two different achievements and this realm managed both", req: c => c.cell === "shared rise" },
        { t: "what {name:realm} closed it closed from below, and the bottom of the ledger moved with the middle", req: c => c.cell === "shared rise" },
        { t: "the distance across {num:settled_n} settled regions narrowed, and it narrowed by lifting rather than by levelling", req: c => c.cell === "shared rise" },
        { t: "both of the things a realm can get right went right across these {num:settled_n} regions, the spread closing and the floor rising", req: c => c.cell === "shared rise" },
        { t: "{name:realm} ends the record less unequal and less poor at the bottom than it began", req: c => c.cell === "shared rise" },
        { t: "the poorest ground in {name:realm} is better off than at the founding, and so is its position relative to the rest", req: c => c.cell === "shared rise" },
        { t: "across {num:settled_n} regions the spread closed while the floor rose, which is the harder of the two ways to close a spread", req: c => c.cell === "shared rise" },
        // closed | fell
        { t: "the gap in {name:realm} closed downward, the distance shrinking because the top came down and not because the bottom came up", req: c => c.cell === "leveling down" },
        { t: "{name:realm} levelled by losing, the spread narrowing and the floor falling with it", req: c => c.cell === "leveling down" },
        { t: "equality arrived here as a subtraction, with the poorest ground of {num:settled_n} regions lower at the close than at the founding", req: c => c.cell === "leveling down" },
        { t: "the distance closed in {name:realm} and nobody at the bottom is better for it", req: c => c.cell === "leveling down" },
        { t: "a narrower spread and a lower floor is what {name:realm} has to show, and only one of those is worth having", req: c => c.cell === "leveling down" },
        { t: "the ledger of {name:realm} is more even and less full, its gap closed and its floor gone down", req: c => c.cell === "leveling down" },
        { t: "what closed the gap across these {num:settled_n} regions was loss at the top, and loss at the bottom came with it", req: c => c.cell === "leveling down" },
        { t: "levelling down is the whole of the verdict on {name:realm}, which has less distance and less floor than it started with", req: c => c.cell === "leveling down" },
        // held | rose
        { t: "the shape of {name:realm} did not move and its floor did, the spread holding while the poorest ground gained", req: c => c.cell === "quiet growth" },
        { t: "nothing in {name:realm} redistributed and something in it improved, which the record is obliged to report as two separate facts", req: c => c.cell === "quiet growth" },
        { t: "the distance across {num:settled_n} regions kept its place and the bottom rose beneath it", req: c => c.cell === "quiet growth" },
        { t: "{name:realm} did not become more equal and did become less poor at the bottom", req: c => c.cell === "quiet growth" },
        { t: "the spread across {num:settled_n} regions stood still while the floor came up, so what improved improved without anything being rearranged", req: c => c.cell === "quiet growth" },
        { t: "the ordering of {name:realm} is what it was, and the ground under the ordering is higher", req: c => c.cell === "quiet growth" },
        { t: "held distance and a risen floor, so the arrangement of these {num:settled_n} regions survived intact and paid better", req: c => c.cell === "quiet growth" },
        // held | fell
        { t: "{name:realm} kept its shape and lost its floor, the spread holding while the poorest ground gave way", req: c => c.cell === "quiet decay" },
        { t: "nothing in the arrangement of these {num:settled_n} regions moved, and the bottom of it sank anyway", req: c => c.cell === "quiet decay" },
        { t: "the distance across {num:settled_n} regions held steady while the ground beneath it fell, which is a decline no spread can show", req: c => c.cell === "quiet decay" },
        { t: "the record closes on the same shape and a lower floor across {num:settled_n} regions", req: c => c.cell === "quiet decay" },
        { t: "{name:realm} is no more unequal than it was and its poorest ground is poorer", req: c => c.cell === "quiet decay" },
        { t: "the spread of {name:realm} did not move and its floor did, downward, which no measure of distance was ever going to catch", req: c => c.cell === "quiet decay" },
        { t: "held distance and a fallen floor, so everyone in {name:realm} kept their place and the place got worse", req: c => c.cell === "quiet decay" },
        // widened | rose
        { t: "{name:realm} grew apart while its floor rose, which the record can report and cannot reconcile", req: c => c.cell === "unequal growth" },
        { t: "the poorest ground of these {num:settled_n} regions gained and the distance to the rest grew faster", req: c => c.cell === "unequal growth" },
        { t: "the bottom of {name:realm} rose and the top rose further, so the spread widened over a floor that was going up", req: c => c.cell === "unequal growth" },
        { t: "everyone in {name:realm} gained and the gains were not shared evenly enough to hold the spread", req: c => c.cell === "unequal growth" },
        { t: "a rising floor and a widening gap is what these {num:settled_n} regions produced, and the two are not in contradiction", req: c => c.cell === "unequal growth" },
        // widened | fell
        { t: "{name:realm} took from the bottom and widened at the top, its gap opening and its floor falling", req: c => c.cell === "extraction" },
        { t: "the distance across these {num:settled_n} regions grew, and the poorest ground paid for the growing", req: c => c.cell === "extraction" },
        { t: "both measures went the wrong way in {name:realm}, which closes on a wider spread over a lower floor", req: c => c.cell === "extraction" },
        { t: "the ledger of {name:realm} closes further apart and lower down than it opened", req: c => c.cell === "extraction" },
        { t: "what the top of {name:realm} gained across the record, the bottom of it did not", req: c => c.cell === "extraction" },
        { t: "the spread across {num:settled_n} regions opened and the floor sank, which is the shape the record was built to be able to show", req: c => c.cell === "extraction" },
        { t: "widened distance and a fallen floor, leaving {num:settled_n} regions further apart and worse off at the bottom", req: c => c.cell === "extraction" },
        { t: "{name:realm} concentrated, and what left the bottom did not leave the realm", req: c => c.cell === "extraction" },
      ],

      // -- the gap, quantified, in the register's own numerals ----------------
      gap: [
        { t: "the spread ran {term:gap_t0_words} in the hundred at the founding and {term:gap_words} at the close", req: () => true },
        { t: "from {term:gap_t0_words} parts in the hundred to {term:gap_words}, measured on the same {num:settled_n} regions", req: () => true },
        { t: "the founding spread of {term:gap_t0_words} in the hundred reads {term:gap_words} now", req: () => true },
        { t: "measured in parts of a hundred the distance moved {term:gap_move_words}, from {term:gap_t0_words} to {term:gap_words}", req: c => c.gap !== "held" },
        { t: "the distance is {term:gap_words} in the hundred, against {term:gap_t0_words} when {name:realm} was surveyed", req: () => true },
        { t: "{term:gap_move_words} parts in the hundred separate the founding spread from the closing one", req: c => c.gap !== "held" },
        { t: "the spread across {num:settled_n} regions sits at {term:gap_words} in the hundred", req: c => c.gap === "held" },
        { t: "neither the founding {term:gap_t0_words} nor the closing {term:gap_words} is far from the other", req: c => c.gap === "held" },
      ],

      // -- the floor, which is the axis the old banner could not see ----------
      floor: [
        { t: "the poorest tenth of {name:realm} stood at {term:floor_t0_words} at the founding and stands at {term:floor_words} now", req: () => true },
        { t: "the floor moved from {term:floor_t0_words} to {term:floor_words}, counted on the poorest tenth of {num:settled_n} regions", req: () => true },
        { t: "at the bottom tenth the reading is {term:floor_words}, against {term:floor_t0_words} at the founding", req: () => true },
        { t: "{term:rose_words} of the {num:settled_n} settled regions {term:rose_verb} than at the founding, and the rest do not", req: c => c.roseN > 0 && c.roseN < c.settledN },
        { t: "not one of the {num:settled_n} settled regions ends richer than it began", req: c => c.roseN === 0 },
        { t: "every one of the {num:settled_n} settled regions ends richer than it began", req: c => c.roseN === c.settledN },
        { t: "the bottom tenth of {name:realm} reads {term:floor_words} where it read {term:floor_t0_words}", req: () => true },
        { t: "{term:fell_words} of the {num:settled_n} regions {term:fell_are} poorer at the close than at the founding", req: c => c.fellN > 0 && c.fellN < c.settledN },
        // The floor is the poorest tenth of the regions still standing, measured at
        // both ends on that same set — which is the right way to measure a change and
        // the wrong way to be quiet about. A realm that abandoned its poorest ground
        // can show a risen floor because the ground that would have dragged it down
        // stopped being counted: measured, that flips the sign in eight of the eighty-
        // nine risen-floor worlds in a two-hundred-world sweep. The judge says so.
        { t: "the floor is counted on ground still standing, and {term:dead_words} of the founding settlements {term:dead_are} not", req: c => c.deadN > 0 && c.floorDir === "rose" },
        { t: "{term:dead_words} {term:dead_settle} left the count between the founding and the close, so the tenth being measured is not the tenth that was surveyed", req: c => c.deadN > 0 && c.floorDir === "rose" },
        { t: "the poorest tenth reads better partly because {term:dead_words} of the settlements that would have sat in it {term:dead_were} abandoned", req: c => c.deadN > 0 && c.floorDir === "rose" },
        { t: "no settlement in {name:realm} was abandoned, so the tenth measured at the close is the tenth that was surveyed", req: c => c.deadN === 0 },
      ],

      // -- growth: the qualifier, and the honest size of it -------------------
      growth: [
        { t: "the realm as a whole is richer at the close by {term:growth_words} parts in the hundred", req: c => c.growth === "boom" },
        { t: "there was more to divide at the end than at the start, by {term:growth_words} in the hundred", req: c => c.growth === "boom" },
        { t: "{name:realm} gained {term:growth_words} parts in the hundred across the run", req: c => c.growth === "boom" },
        { t: "the pie of {name:realm} neither grew nor shrank by as much as a twelfth", req: c => c.growth === "stagnant" },
        { t: "there is no more and no less to divide across {num:settled_n} regions than there was", req: c => c.growth === "stagnant" },
        { t: "the ledger of {name:realm} held its size while its distribution did the moving", req: c => c.growth === "stagnant" },
        { t: "the realm is poorer at the close than at the founding by {term:growth_words} parts in the hundred", req: c => c.growth === "collapse" },
        { t: "there is {term:growth_words} in the hundred less to divide than {name:realm} began with", req: c => c.growth === "collapse" },
        { t: "the ledger of {num:settled_n} regions shrank by {term:growth_words} parts in the hundred while it was being redistributed", req: c => c.growth === "collapse" },
        { t: "what {name:realm} had to share fell by {term:growth_words} in the hundred", req: c => c.growth === "collapse" },
      ],

      // -- contingent conviction: hard about THIS world, silent about others ---
      conviction: [
        { t: "that is what these {num:settled_n} regions did, and this record makes no claim about any other realm", req: () => true },
        { t: "the verdict is on {name:realm} and on nothing else, and every figure in it recomputes from the exported columns", req: () => true },
        { t: "none of {name:realm} was steered, and all of it is chargeable to rules written down before the first settlement", req: () => true },
        { t: "the record holds {name:realm} to what it did and holds no opinion about what a realm ought to do", req: () => true },
        { t: "this is a reading of {num:settled_n} regions and not a rule about realms", req: () => true },
        { t: "the two axes above are the whole of the judgement, and both are recomputable from the export of {name:realm}", req: () => true },
        { t: "what is said here is said about {name:realm} at this close and about no other world and no other year", req: () => true },
        { t: "the arithmetic of {name:realm} is not in dispute, and the reading of it is offered as a reading", req: c => c.settledN > 0 },
        { t: "nothing in the {num:settled_n} regions was arranged to produce this, which is the part worth sitting with", req: () => true },
        { t: "this is what {name:realm} came to, argued from its own columns and from nothing outside them", req: () => true },
      ],
    };

    // Everything the judge may count, as integers, because the register's law
    // forbids a numeral and `loomSpell` rounds. A gini to two places has no spelled
    // form worth reading, so the gap is carried in PARTS OF A HUNDRED — the same
    // number the analyst prints as a decimal, times a hundred, and audited as such.
    function verdictCtx(model, params) {
      const F = getFindings(model);
      const v = F.verdict;
      const settled = model.regions.filter(r => r.settled);
      const roseN = settled.filter(r => r.wealth > r.wealthT0).length;
      const gr = F.growth.per_capita_t0 > 0 ? F.growth.per_capita / F.growth.per_capita_t0 : 1;
      const c = {
        cell: v.cell, gap: v.gap, floorDir: v.floor, growth: v.growth, class: v.class,
        realm: model.capitalName,
        settledN: settled.length, settled_n: settled.length,
        n_regions: model.regions.length,
        roseN, fellN: settled.length - roseN,
        deadN: model.regions.filter(r => !r.settled && r.abandonedEpoch >= 0).length,
        rose_verb: roseN === 1 ? "ends richer" : "end richer",
        fell_are: (settled.length - roseN) === 1 ? "is" : "are",
        // the spelled quantities, each one an integer the export can be checked against
        gap_pts: Math.round(100 * F.gini), gap_t0_pts: Math.round(100 * F.gini_t0),
        gap_move_pts: Math.abs(Math.round(100 * F.gini) - Math.round(100 * F.gini_t0)),
        floor_pts: Math.round(F.floor.p10), floor_t0_pts: Math.round(F.floor.p10_t0),
        growth_pts: Math.abs(Math.round(100 * (gr - 1))),
      };
      // The judge's numerals are words. They are `term` slots rather than `num` so
      // that the audit checks the INTEGER behind each one under the spelled rule and
      // the page still carries no digit.
      c.dead_are = c.deadN === 1 ? "is" : "are";
      c.dead_were = c.deadN === 1 ? "was" : "were";
      c.dead_settle = c.deadN === 1 ? "settlement" : "settlements";
      for (const [k, n] of [["gap_words", c.gap_pts], ["gap_t0_words", c.gap_t0_pts],
        ["gap_move_words", c.gap_move_pts], ["floor_words", c.floor_pts],
        ["floor_t0_words", c.floor_t0_pts], ["growth_words", c.growth_pts],
        ["rose_words", c.roseN], ["fell_words", c.fellN], ["dead_words", c.deadN]])
        c[k] = loomSpell(n);
      return c;
    }

    const verdictResolve = (kind, key, c) => {
      if (kind === "name" || kind === "term") return c[key];
      if (kind === "num") { const x = c[key]; return (x === null || x === undefined) ? null : x; }
      return null;
    };

    // The one verdict function every judging surface reads. The findings band, the
    // chronicle's close and (E1) the reign panel all call this, so a world cannot be
    // told it closed its gap on one surface and levelled down on another.
    const VERDICT_ORDER = [["claim", "gap"], ["floor", "growth"], ["conviction", null]];
    function composeVerdict(model, params, opts) {
      const o = opts || {};
      const c = verdictCtx(model, params);
      const v = loomCompose({
        register: "judge", frames: VERDICT_FRAMES, pool: VERDICT_POOL,
        classes: VERDICT_ORDER, ctx: c, resolve: verdictResolve,
        rv: loomStream(params.seed, o.surface || "verdict", o.key || "verdict"),
      });
      return { text: v.text, facts: v.facts, names: v.names, cell: c.cell, class: c.class, ctx: c };
    }

    // ---- The loom: one prose engine for every register (D1, #137) -----------
    //
    // Principle P5 (direction.md §4): the app SELECTS sentences today; it must
    // COMPOSE them. This is the loom's RUNTIME and nothing else — frames, typed
    // slots, column-predicate gating, per-surface substreams, world-level lexica,
    // the slot audit, the skeleton-masked diversity measure, and the pool linter.
    //
    // No surface consumes it and no fragment pool ships with it, so an export made
    // with the loom present is byte-identical to one made without it. That is D1's
    // acceptance, and it is deliberate: the pools arrive with each surface's own
    // migration, behind its own prototype gate — voices D2 (#138), findings D3
    // (#139), chronicle D4 (#140), verdict D5 (#141). Until then the suite is the
    // loom's only consumer, and the suite checks that it really is one: every
    // exported `loom*` symbol must be exercised by a test, or the dormancy has
    // quietly become dead code.
    //
    // House law, inherited from docs/voices-spec.md §1 and enforced by loomLint:
    // a fragment is a CLAUSE, never a complete sentence (frames own the opening
    // capital and the terminal stop); every fragment carries at least one slot;
    // classes gate on real columns; slots fill from true facts and are audited
    // against the export; coined words come from world lexica minted once per world,
    // so an oath repeats like culture instead of being re-invented per speaker.
    //
    // The one-slot rule is not decoration, and it is the #136 gate's finding
    // promoted to law. That gate ran first at half pool scale and then at full
    // scale with mostly slotless fragments; worst surface repeat was 14, then 8,
    // against V5's ceiling of 3. Pool size was never the binding constraint. A
    // slotless fragment has exactly one surface per skin and collides with itself
    // on every draw, which no amount of authoring fixes.

    // §4's table, made executable. `digits` generalises the voices spec's V1/V2
    // pair into a per-register law about what may appear on the page as a numeral:
    //   exact   — the export value, verbatim, and every one of them audited;
    //   folk    — a folk form, never a numeral (the street does not quote figures);
    //   spelled — number words, not numerals, at every magnitude a column reaches.
    // Which register gets which is a judgement about the surface, not a symmetry:
    // the chronicle quotes figures today and D4 is not going to stop it, so the
    // historian is on the exact law; the verdict composes a sentence rather than a
    // table, so the judge spells.
    // `coin` is the DEFAULT lexicon a register draws coined words from. A surface
    // that has a better answer overrides it — the street's oaths should come from
    // the speaker's own `name_register`, not from a house default.
    const LOOM_REGISTERS = {
      historian:   { surface: "chronicle", digits: "exact",   coin: "lowland",   voice: "the state record" },
      analyst:     { surface: "findings",  digits: "exact",   coin: "corporate", voice: "numbers, forward" },
      judge:       { surface: "verdict",   digits: "spelled", coin: "precinct",  voice: "measured, both-edged" },
      ministerial: { surface: "dilemma",   digits: "exact",   coin: "precinct",  voice: "the brief" },
      street:      { surface: "voices",    digits: "folk",    coin: "lowland",   voice: "the street" },
      ledger:      { surface: "voices",    digits: "exact",   coin: "precinct",  voice: "the censorate" },
      gazette:     { surface: "gazette",   digits: "exact",   coin: "gazette",   voice: "the world arriving" },
    };

    // Every surface draws its own substream, so a sentence added to the chronicle
    // cannot move a word of the findings. The key carries the region (or whatever
    // the surface iterates) so a voice is recomputable from the export alone.
    const loomStream = (seed, surface, key) => streams(seed)(`${surface}#${key}`);

    // ---- world lexica --------------------------------------------------------
    // Minted once per world per lexicon and shared by every surface: oaths and
    // slang are culture, not per-speaker invention. `imperial` is the third tier —
    // the Concordat tongue, audible as foreign wherever it lands. A walk that
    // reproduces a corpus word is rejected: a coin that is already a place name is
    // not a coin. Deterministic in the seed, so two runs mint the same lexicon.
    const LOOM_CORPUS_WORDS = (() => {
      const s = new Set();
      for (const reg in NAME_CORPUS) for (const w of NAME_CORPUS[reg]) s.add(w.toLowerCase());
      return s;
    })();
    function loomMint(register, r, minL, maxL, seen) {
      for (let a = 0; a < 24; a++) {
        const w = markovWord(register, r, minL, maxL);
        if (!w) continue;
        const k = w.toLowerCase();
        if (LOOM_CORPUS_WORDS.has(k)) continue;             // already a place name
        if (seen && seen.has(k)) continue;                  // one lexicon, distinct entries
        if (seen) seen.add(k);
        return w;
      }
      return null;
    }
    // { oath: [..3], slang: [..3] } per name register, plus imperial: [..4].
    // `n` is fixed rather than a parameter so the lexicon is a property of the
    // world, not of whoever asked for it.
    function loomLexicon(seed) {
      const cap = (w) => w[0].toUpperCase() + w.slice(1);
      const out = {};
      for (const reg in NAME_CORPUS) {
        if (reg === "imperial") continue;
        const ro = loomStream(seed, "lexicon", `${reg}#oath`);
        const rs = loomStream(seed, "lexicon", `${reg}#slang`);
        const so = new Set(), ss = new Set();
        out[reg] = {
          oath:  [0, 1, 2].map(() => loomMint(reg, ro, 3, 6, so)).filter(Boolean).map(cap),
          slang: [0, 1, 2].map(() => loomMint(reg, rs, 3, 6, ss)).filter(Boolean).map(w => w.toLowerCase()),
        };
      }
      const ri = loomStream(seed, "lexicon", "imperial");
      const si = new Set();
      out.imperial = [0, 1, 2, 3].map(() => loomMint("imperial", ri, 4, 9, si)).filter(Boolean).map(cap);
      return out;
    }

    // ---- typed slots ---------------------------------------------------------
    // A slot is `{kind:key}`. The kind decides how it fills AND how it is audited:
    //   name    — a proper noun, verbatim from the export, never distorted;
    //   num     — a quantity, rendered per the register's `digits` law;
    //   coin    — a word from the world lexicon;
    //   term    — a derived phrase (a trade, a holder, a compass point), which is a
    //             pure function of columns and is audited as such.
    // The caller supplies the resolvers; the loom supplies the discipline.
    const LOOM_SLOT_KINDS = ["name", "num", "coin", "term"];
    const LOOM_SLOT_RE = /\{(name|num|coin|term):([a-z0-9_]+)\}/g;

    // Renderers for the `digits` laws. `folk` is the voices spec's §2 ladder; a
    // register on the folk law may not emit a numeral at all, which loomAudit
    // checks rather than trusts.
    const LOOM_LADDER = [[5, "a twentieth"], [10, "a tithe"], [25, "a quarter part"],
      [33, "a third part"], [50, "half"], [67, "two parts in three"],
      [75, "three parts in four"], [90, "nine parts in ten"], [97, "all but the sweepings"]];
    const loomFolk = (x) => { let out = "next to none"; for (const L of LOOM_LADDER) if (x >= L[0]) out = L[1]; return out; };
    const LOOM_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
      "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
    const LOOM_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
    const LOOM_SCALES = [[1e9, "billion"], [1e6, "million"], [1e3, "thousand"]];
    function loomSpell(n) {
      const v = Math.round(n);
      if (!Number.isFinite(v)) return "an unreckoned number";
      if (v < 0) return "minus " + loomSpell(-v);
      if (v < 20) return LOOM_ONES[v];
      if (v < 100) return LOOM_TENS[Math.floor(v / 10)] + (v % 10 ? "-" + LOOM_ONES[v % 10] : "");
      if (v < 1000) return LOOM_ONES[Math.floor(v / 100)] + " hundred" + (v % 100 ? " and " + loomSpell(v % 100) : "");
      for (const [mag, word] of LOOM_SCALES) {
        if (v >= mag) {
          const rest = v % mag;
          return loomSpell(Math.floor(v / mag)) + " " + word +
            (rest ? (rest < 100 ? " and " : " ") + loomSpell(rest) : "");
        }
      }
      return String(v);
    }
    // The rule table the audit inverts. Each entry recomputes `told` from `true`,
    // so a fact whose told does not follow from its true is caught by arithmetic
    // rather than by inspection.
    // D3 (#139) adds the fixed-decimal and percentage rules the analyst register
    // needs: a gini is quoted to two places and a Moran's I to three, and "verbatim"
    // would print 0.15 as "0.15" but 0.1 as "0.1", which reads as a different
    // precision claim. Every rule stays a pure function of the value, so the audit
    // still catches a planted told by recomputing it.
    const LOOM_RULES = {
      verbatim: (v) => String(v),
      folk:     (v) => loomFolk(Math.round(v)),
      spelled:  (v) => loomSpell(v),
      share:    (v, ctx) => loomFolk(Math.round(100 * v / Math.max(1, ctx.of))),
      fixed1:   (v) => Number(v).toFixed(1),
      fixed2:   (v) => Number(v).toFixed(2),
      fixed3:   (v) => Number(v).toFixed(3),
      pct:      (v) => String(Math.round(100 * v)),
    };
    const loomRuleFor = (register) => ({ exact: "verbatim", folk: "folk", spelled: "spelled" }[
      (LOOM_REGISTERS[register] || {}).digits] || "verbatim");

    // ---- gating --------------------------------------------------------------
    // A fragment whose `req` fails does not exist for this context — it is not a
    // fragment that scores low, it is a fragment that is not there. `band`, where a
    // surface has one, gates the same way.
    function loomGate(pool, cls, ctx, band, used) {
      const cands = (pool[cls] || []).filter(f =>
        (typeof f.req !== "function" || f.req(ctx)) &&
        (typeof f.band !== "function" || band === undefined || f.band(band)) &&
        !(used && used.has(f.t)));
      return cands;
    }

    // ---- filling + the audit trail -------------------------------------------
    // Fills a clause and records one fact per slot: {path, true, told, rule}. The
    // facts are the whole point — a surface that cannot say where a word came from
    // has no business putting it in front of a reader.
    function loomFill(text, ctx, register, resolve, facts, names) {
      const rule = loomRuleFor(register);
      return String(text).replace(LOOM_SLOT_RE, (_, kind, key) => {
        const got = resolve(kind, key, ctx);
        // A slot the caller cannot fill leaves a hole in the sentence. Gating should
        // have kept the fragment out, but "should have" is what the audit is for:
        // record the miss so it fails loudly instead of reading as a typo.
        if (got === null || got === undefined) {
          if (facts) facts.push({ path: `${kind}:${key}`, true: null, told: "", rule: "unresolved" });
          return "";
        }
        if (kind === "name") {
          const told = String(got);
          if (names) names.push({ told, raw: told, rule: "verbatim" });
          if (facts) facts.push({ path: `${kind}:${key}`, true: told, told, rule: "verbatim" });
          return told;
        }
        if (kind === "num") {
          const of = (got && typeof got === "object") ? got.of : undefined;
          const val = (got && typeof got === "object") ? got.value : got;
          const r = (got && typeof got === "object" && got.rule) ? got.rule : (of !== undefined ? "share" : rule);
          const told = LOOM_RULES[r](val, { of });
          if (facts) facts.push({ path: `${kind}:${key}`, true: val, told, rule: r, of });
          return told;
        }
        const told = String(got);
        if (facts) facts.push({ path: `${kind}:${key}`, true: told, told, rule: kind === "coin" ? "minted" : "derived" });
        return told;
      });
    }

    // ---- composition ---------------------------------------------------------
    // Frames own the sentence: the capital, the stop, and the join. Fragments are
    // clauses dropped into {A} and {B}. Every draw comes from `rv` and nothing
    // else, so the whole paragraph is a pure function of (seed, surface, key, ctx).
    function loomCompose(spec) {
      const { register, frames, pool, classes, ctx, resolve, rv, band, open, close } = spec;
      const facts = [], names = [], surfaces = [], drawn = [];
      // `spec.used` lets a caller share one tally across many composes, so a document
      // that composes the same class fifty times does not say one clause twice. A
      // shared tally can run a class dry, and an exhausted class is not the same as a
      // class with nothing to say: it reuses rather than falling silent, because
      // silence here would drop a beat the world actually has. Refusal stays with the
      // gate, which is the only thing entitled to it.
      const used = spec.used || new Set();
      const pick = (a) => a[Math.floor(rv() * a.length)];
      const draw = (cls) => {
        let cands = loomGate(pool, cls, ctx, band, used);
        if (!cands.length && spec.used) cands = loomGate(pool, cls, ctx, band, null);
        if (!cands.length) return null;
        const f = pick(cands);
        used.add(f.t); drawn.push(cls);
        return f;
      };
      const say = (f, cls) => { const t = loomFill(f.t, ctx, register, resolve, facts, names); surfaces.push(cls + "|" + t); return t; };
      const out = [];
      if (open) { const f = draw(open); if (f) out.push(say(f, open) + "."); }
      for (const pair of classes) {
        const [ca, cb] = Array.isArray(pair) ? pair : [pair, null];
        const fa = draw(ca), fb = cb ? draw(cb) : null;
        if (!fa && !fb) continue;
        const A = fa ? say(fa, ca) : null, B = fb ? say(fb, cb) : null;
        const fr = (A && B) ? pick(frames) : "{A}.";
        out.push(fr.replace("{A}", A || B).replace("{B}", B || ""));
      }
      if (close) { const f = draw(close); if (f) out.push(say(f, close) + "."); }
      const seen = new Set(), kept = [];
      for (const sIt of out) { const k = sIt.toLowerCase(); if (seen.has(k)) continue; seen.add(k); kept.push(sIt); }
      const text = kept.join(" ").replace(/(^|[.!?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase()).replace(/\s+/g, " ").trim();
      return { text, facts, names, surfaces, classes: drawn };
    }

    // ---- the slot audit ------------------------------------------------------
    // Recomputes every told from its true under its declared rule and reports what
    // does not follow. This is what catches a planted false fact: a surface can lie
    // about the world only by writing a told the rule cannot produce, and the rule
    // is arithmetic, so the lie is arithmetic too.
    //
    // `digits` is audited separately and is not a matter of opinion: a register on
    // the folk law that puts a numeral on the page has broken its own law, whatever
    // its facts say.
    function loomAudit(voice, register, world) {
      const bad = [];
      for (const f of (voice.facts || [])) {
        const rule = LOOM_RULES[f.rule];
        if (f.rule === "unresolved") { bad.push({ why: `slot ${f.path} could not be filled and left a hole in the sentence`, fact: f }); continue; }
        if (!rule) { if (f.rule !== "minted" && f.rule !== "derived") bad.push({ why: `unknown rule ${JSON.stringify(f.rule)}`, fact: f }); continue; }
        const expect = rule(f.true, { of: f.of });
        if (String(f.told) !== String(expect)) bad.push({ why: `told ${JSON.stringify(f.told)}, rule gives ${JSON.stringify(expect)}`, fact: f });
      }
      const law = (LOOM_REGISTERS[register] || {}).digits;
      if (law === "folk" || law === "spelled") {
        if (/\d/.test(voice.text)) bad.push({ why: `register "${register}" is on the ${law} law and the text carries a numeral`, fact: null });
      }
      if (world && world.names) {
        for (const n of (voice.names || [])) if (!world.names.has(n.raw)) bad.push({ why: `name not in the export: ${JSON.stringify(n.raw)}`, fact: null });
      }
      return { ok: bad.length === 0, offenders: bad };
    }

    // ---- skeleton-masked diversity -------------------------------------------
    // Measuring raw text flatters the loom: two paragraphs built from one template
    // look different because the town names differ. Strip the fills back to their
    // slot tokens and what is left is the SKELETON, which is what a reader actually
    // notices repeating. Type-token ratio over skeletons and bigram entropy over
    // skeleton words; the floor is the value a corpus must clear.
    function loomSkeleton(text, facts) {
      let s = String(text);
      const fills = (facts || []).map(f => String(f.told)).filter(t => t.length > 1)
        .sort((a, b) => b.length - a.length);                  // longest first: no partial masking
      for (const t of fills) s = s.split(t).join("•");
      return s.toLowerCase().replace(/[^a-z•\s]/g, " ").replace(/\s+/g, " ").trim();
    }
    // Four numbers, and the choice of which four is the whole measurement:
    //   typeToken     — mean WITHIN-skeleton type-token ratio. Pooling it across the
    //                   corpus was the first version and it was wrong: types grow
    //                   sublinearly in tokens (Heaps), so a pooled ratio falls as the
    //                   corpus grows and a fixed floor on it fails good corpora for
    //                   being large. Per-skeleton, it is stable in n and measures what
    //                   it should — a clause that repeats itself inside one sentence.
    //   bigramEntropy — pooled over skeleton word-bigrams. Grows with n, so its floor
    //                   must grow with n too (below).
    //   distinct      — how many of the n skeletons are unique at all, the blunt half.
    //   overlap       — mean pairwise Jaccard of skeleton bigram sets. This is the
    //                   quantity direction.md §4 actually pins ("cross-seed chronicle
    //                   template overlap < 0.20"), and it is a CEILING, not a floor:
    //                   entropy can look healthy while every pair still shares most
    //                   of its skeleton.
    function loomDiversity(skeletons) {
      const texts = skeletons.filter(Boolean);
      if (!texts.length) return { n: 0, typeToken: 0, bigramEntropy: 0, distinct: 0, overlap: 0 };
      const bigrams = new Map(), sets = [];
      let ttSum = 0;
      for (const t of texts) {
        const w = t.split(" ").filter(Boolean);
        ttSum += w.length ? new Set(w).size / w.length : 0;
        const set = new Set();
        for (let i = 0; i + 1 < w.length; i++) {
          const k = w[i] + " " + w[i + 1];
          bigrams.set(k, (bigrams.get(k) || 0) + 1);
          set.add(k);
        }
        sets.push(set);
      }
      const total = [...bigrams.values()].reduce((a, b) => a + b, 0);
      let H = 0;
      for (const c of bigrams.values()) { const p = c / total; H -= p * Math.log2(p); }
      let jSum = 0, pairs = 0;
      for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
        let inter = 0;
        for (const k of sets[i]) if (sets[j].has(k)) inter++;
        const uni = sets[i].size + sets[j].size - inter;
        jSum += uni ? inter / uni : 1; pairs++;
      }
      return {
        n: texts.length,
        typeToken: round2(ttSum / texts.length),
        bigramEntropy: round2(H),
        distinct: new Set(texts).size,
        overlap: round2(pairs ? jSum / pairs : 0),
      };
    }
    // What a corpus of `n` skeletons must clear to be worth shipping. Entropy grows
    // with corpus size whatever the generator does, so its floor grows too —
    // log2(n) is the entropy of n equiprobable outcomes, and a share of it is the
    // honest bar. `overlap` is the one ceiling: §4 pins cross-seed chronicle
    // template overlap below 0.20 (today 0.36-0.52), and that number is what a
    // migration has to beat, not a number a migration gets to choose.
    function loomDiversityFloor(n, opts) {
      const o = opts || {};
      const share = o.entropyShare === undefined ? 0.55 : o.entropyShare;
      const distinctFrac = o.distinctFrac === undefined ? 0.80 : o.distinctFrac;
      return {
        n,
        typeToken: o.typeToken === undefined ? 0.55 : o.typeToken,
        bigramEntropy: round2(share * Math.log2(Math.max(2, n))),
        distinct: Math.ceil(distinctFrac * n),
        overlap: o.overlap === undefined ? 0.20 : o.overlap,
      };
    }
    function loomMeetsFloor(measured, floor) {
      const short = [];
      if (measured.typeToken < floor.typeToken) short.push(`within-skeleton type-token ${measured.typeToken} < ${floor.typeToken}`);
      if (measured.bigramEntropy < floor.bigramEntropy) short.push(`bigram entropy ${measured.bigramEntropy} < ${floor.bigramEntropy}`);
      if (measured.distinct < floor.distinct) short.push(`distinct skeletons ${measured.distinct} < ${floor.distinct}`);
      if (measured.overlap > floor.overlap) short.push(`pairwise skeleton overlap ${measured.overlap} > ${floor.overlap}`);
      return { ok: short.length === 0, short };
    }

    // ---- the pool linter -----------------------------------------------------
    // House law, checked mechanically. A canned complete sentence in a pool is the
    // failure mode the whole loom exists to end, so it is a lint error and not a
    // style note.
    function loomLint(pool) {
      const problems = [];
      for (const cls in pool) {
        // A fragment repeated inside its own class is invisible to every other check
        // here: it lints clean, it audits clean, and it quietly doubles its own draw
        // probability. #140 shipped nine of them before this looked for them.
        const said = new Set();
        for (const f of pool[cls]) {
          const key = String(f && f.t === undefined ? f : f.t).toLowerCase().replace(/[^a-z ]/g, "");
          if (said.has(key)) problems.push(`${cls}: ${JSON.stringify(key.slice(0, 48))} — appears twice in its own class`);
          said.add(key);
        }
        for (const f of pool[cls]) {
          const t = String(f && f.t === undefined ? f : f.t);
          const at = `${cls}: ${JSON.stringify(t.slice(0, 48))}`;
          if (/^[A-Z]/.test(t)) problems.push(`${at} — opens with a capital; frames own the capital`);
          if (/[.!?]$/.test(t)) problems.push(`${at} — ends with a stop; frames own the stop, and a fragment that carries one is a canned sentence`);
          LOOM_SLOT_RE.lastIndex = 0;
          if (!LOOM_SLOT_RE.test(t)) problems.push(`${at} — carries no slot; it has one surface and will collide with itself (see #136)`);
          const unknown = t.match(/\{([a-zA-Z]+):/g) || [];
          for (const u of unknown) {
            const kind = u.slice(1, -1);
            if (!LOOM_SLOT_KINDS.includes(kind)) problems.push(`${at} — unknown slot kind "${kind}"`);
          }
          // anything in braces that is not a WELL-FORMED slot: a valid kind with a
          // key the slot grammar cannot read is the quiet version of this bug, since
          // it reaches the page as literal braces and leaves no fact behind.
          for (const brace of (t.match(/\{[^}]*\}/g) || [])) {
            LOOM_SLOT_RE.lastIndex = 0;
            if (!LOOM_SLOT_RE.test(brace)) problems.push(`${at} — ${JSON.stringify(brace)} is not a well-formed slot; it would reach the page verbatim`);
          }
        }
      }
      return problems;
    }

    // ---- URL hash parameters (#172) ------------------------------------------
    // ONE parser, shared by the app and the tooling. A hash is a shareable link,
    // so the APP's reading is canonical: whatever a URL produces in the browser
    // is what the tools must reproduce. This used to be hand-rolled twice
    // (src/app.mjs readHash + tools/lib.mjs genEngine) and the copies drifted:
    // different clamps (relax 8 vs 20, ep 24 vs 99), no rounding on the tooling
    // side (regions=12.7 stayed fractional), an unclamped bias, and a manual
    // split() that never URL-decoded a value. Change the hash schema HERE.
    function parseHash(hash) {
      const h = String(hash == null ? "" : hash).replace(/^#/, "");
      if (!h) return { ...DEFAULTS };
      const p = new URLSearchParams(h);
      // Empty/whitespace values fall back to the default (not the clamp minimum).
      const num = (key, def) => { const v = p.get(key); return (v != null && v.trim() !== "" && isFinite(+v)) ? +v : def; };
      const w = (key, def) => clamp(Math.round(num(key, def)), 0, 100);
      // B10 (#132): `hb` retired into `openness`. An explicit openness wins; else an
      // old hb=0 link maps forward to openness=0 (sealed); else the default (open).
      const openness = p.has("openness") ? w("openness", DEFAULTS.openness) : (p.get("hb") === "0" ? 0 : DEFAULTS.openness);
      const out = {
        ...DEFAULTS,
        seed: p.get("seed") || DEFAULTS.seed,
        fate: (p.get("fate") || DEFAULTS.fate).trim(),
        ch: formatDecisions(parseDecisions(p.get("ch"))),   // sanitized on the way in
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
      // `capital=x,y` is the tooling's form; cx/cy is the app's and wins if both appear.
      if (p.has("capital")) {
        const parts = (p.get("capital") || "").split(",").map(Number);
        if (parts.length === 2 && parts.every(isFinite))
          out.capital = [clamp(parts[0], 0, WX), clamp(parts[1], 0, WY)];
      }
      if (p.has("cx") && p.has("cy") && isFinite(+p.get("cx")) && isFinite(+p.get("cy")))
        out.capital = [clamp(+p.get("cx"), 0, WX), clamp(+p.get("cy"), 0, WY)];
      return out;
    }

// ---- Public API ----------------------------------------------------------
export {
  WX, WY, WDIAG, SCHEMA_VERSION,
  TOLL_SEAT, TOLL_PORT, UPKEEP_TOLL_MIN, DECAY_STEP, REPAIR_STEP,
  DECAY_FRICTION, CHARTER_LOAN, DEBT_RATE, DEPENDENCY_STEP, FLIGHT_STEP,
  FLY_COST, RIDGE_WALL, PASS_MULT, PASS_R, FORD_MULT,
  BLOC_TOL, BLOC_FLOOR, OCC_R,
  DEFAULTS,
  hashStr, mulberry32, streams, worldStreams,
  round2, clamp, lerp, esc,
  makeName, buildChain, chainWalk, markovWord, markovName, harborName, nameRegister,
  NAME_CORPUS,
  signedArea, centroid, asCCW, pointInRing, segInt, distPointSeg,
  clipSeg, clipPolyline, polyLen, polyPointAt, dpSimplify, bumpField,
  relaxPts,
  buildTopology, buildGeology, applyAttributes,
  edgeCost, costDistances,
  toGeoJSON, toEpochSeries, toCsvTables, epochDate,
  computeFindings, getFindings, composeChronicle,
  parseHash,
  // The loom (D1, #137) — the house prose engine's runtime. Dormant: no surface
  // consumes it yet, so its presence moves no exported byte. The suite is its only
  // consumer until D2-D5, and the suite checks that every one of these is exercised.
  LOOM_REGISTERS, LOOM_SLOT_KINDS, LOOM_RULES, LOOM_LADDER,
  loomStream, loomLexicon, loomMint, loomFolk, loomSpell, loomRuleFor,
  loomGate, loomFill, loomCompose, loomAudit,
  loomSkeleton, loomDiversity, loomDiversityFloor, loomMeetsFloor, loomLint,
  // The findings, composed on the loom (D3, #139)
  FINDINGS_POOL, FINDINGS_ORDER, FINDINGS_FRAMES, composeFindings, findingsCtx, findingsResolve,
  // The chronicle, composed on the loom (D4, #140)
  CHRONICLE_POOL, CHRONICLE_FOUNDING, CHRONICLE_STATE,
  CHRONICLE_YEARS_OPEN, CHRONICLE_YEARS_CLOSE, CHRONICLE_FRAMES, chronicleCtx, chronicleBeat,
  EVENT_POOL, EVENT_FRAMES, EVENT_CLASSES, eventClasses, eventCtx, eventLine,
  chronicleResolve, CHRONICLE_FIXED,
  VERDICT_POOL, VERDICT_FRAMES, VERDICT_ORDER, verdictCtx, verdictResolve, composeVerdict,
  RUIN_SAID, AGE_SAID, FATE_SAID,
};
