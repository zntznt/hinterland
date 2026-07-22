// Hinterland — procedural region-scale map generator — engine.
// Pure computation: no DOM, no rendering. Importable from Node or browser.
//

const d3 = globalThis.d3;
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    // ---- Constants ----------------------------------------------------------
    const WX = 1600, WY = 1000;   // world is [0,WX] x [0,WY], planar, y-up (16:10)
    const WDIAG = Math.hypot(WX, WY); // characteristic length for distance normalization
    const SCHEMA_VERSION = 54;
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
    const RIVER_CARRY = 0.3;  // share of a riverine region's blight shipped downstream
    const RIVER_DECAY = 0.75; // per-step decay of the carried load
    const RIDGE_WALL = 4.5;  // edge-cost multiplier for crossing a ridge off-pass
    const PASS_MULT = 1.4;   // crossing at a pass: a climb, not a wall
    const PASS_R = 90;       // how close a crossing must be to a pass to count as one (B0.5: a LOCAL crossing tolerance, not a reach — unscaled)
    const BLOC_TOL = 12;    // top-two reach gap below this => contested
    const BLOC_FLOOR = 25;  // all reaches below this => ungoverned
    const FRICTION = 1.5;  // how much ruggedness multiplies travel cost

    const DEFAULTS = {
      seed: "hinterland", fate: "", world: "concordat-settlement", regions: 24, relax: 2, bias: 80,
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
          reg.rainfall >= 68 ? "forest" :
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
        // Calibrated to (0.3 + A/100): ~1.0 at the founding artifice (mean ≈70,
        // so founding wealth barely moves), rising to 1.3 as the works learn (the
        // pie GROWS) and falling toward 0.3 as artifice decays or crashes (it
        // SHRINKS) — symmetric about the founding, unlike the (0.5+A/200) floor.
        const artMult = 0.3 + (reg.A !== undefined ? reg.A : 70) / 100;
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
            const wts = regions.map((reg, idx) => { const w = (idx === sacrificeZone || !reg.settled) ? 0 : Math.pow(1 - reg.wealth / 100, 6) * clamp(reg.settlementPop / 1200, 0.15, 1); wsum += w; return w; });
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
        let maxB = 0;
        const rawB = blightRaw.map(v => { if (v > maxB) maxB = v; return v; });
        const pre = regions.map((_, i) => maxB > 0 ? Math.round(100 * (rawB[i] / maxB)) : 0);
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
          const degradation =
            0.55 * reg.blight +
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
          const competition = churnFactor * 5.5 * marketAccess * clamp((reg.eliteShare - 33) / 59, 0, 1); // active decay of concentration
          const boomChurn = churnFactor * 2.4 * clamp(wealthSwing / 10, 0, 1);            // a boom mints new owners
          reg.eliteShare = clamp(reg.eliteShare
            + wealthDrift                          // the owners capture the swing — the upside only where the market lets them
            + rentKeep * (0.75 * gateIncome        // the toll house pays the holder's men (competition bids it down)
              + (reg.refining > 0 ? 0.8 : 0)       // the works pay their masters
              + (reg.E >= 40 ? 0.5 : 0)            // live seams pay their charter-holders
              + (reg.isSkyport === 1 ? 0.6 : 0))   // the aerie: absentee owners cluster at the lanes
            + (reg.compradorGain || 0)             // B2: the coin that didn't build deepens the owners' row
            - (reg.investBustLoss || 0)            // B2: a busted placement — the owners take the loss
            - competition                          // B5: high market access bids concentrated rents down
            - boomChurn                            // B5: a boom mints new owners, diluting the row
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
          const base = 0.5 * reg.wealth + 25 * (onGrid[i] ? 1 : 0) + 0.25 * (100 - reg.blight);
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
            ? 26 * clamp(1 - reg.blight / 55, 0, 1) * (onGrid[i] ? 1 : 0.5)
            : 0;
          return base - rentDrag + frontier + rush;
        });
        const delta = new Array(regions.length).fill(0);
        roadEdges.forEach(edge => {
          const gA = attract[edge.b] - attract[edge.a];
          if (gA > 0) { const m = 0.05 * regions[edge.a].settlementPop * gA / 100; delta[edge.a] -= m; delta[edge.b] += m; }
          else if (gA < 0) { const m = 0.05 * regions[edge.b].settlementPop * (-gA) / 100; delta[edge.b] -= m; delta[edge.a] += m; }
        });
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
            wreg.eliteShare = Math.min(92, wreg.eliteShare + 5); // property survives people
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
          if (best >= 0) {
            footholdIdx = best; dominionAt = e + 1;
            const occRun = costDistances(regions, [footholdIdx]);
            regions.forEach((reg, i) => {
              if (occRun.dist[i] > OCC_R) return;
              reg.occupied = true; reg.occupiedEpoch = e + 1;
              reg.retention = Math.round(reg.retention * 0.6);   // the yield leaves the realm
              reg.eliteShare = Math.min(92, reg.eliteShare + 4); // the occupation hires the owners' row
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
        blightEpoch = e + 1; // B4: the concentrate ramp reads the current year
        computeBlight();   // the poison follows the poor wherever they end up
        computeLivability(); // and the land's worth-living-in is re-reckoned
        regions.forEach(reg => { // plague: maximum contamination + real population, once per region
          if (!reg.plagued && reg.blight >= 85 && reg.settlementPop >= 500) {
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
            let measure;
            // a RESOURCE-RICH but unequal realm floors its commodity price (a levy the
            // diggers keep) rather than importing bread — the retention act competes
            // with the granary where a rich seam runs (B7: gives the act a home).
            if (giniNow >= 0.42 && richSeam >= 60) { measure = "retention_act"; retentionAct(); }
            else if (giniNow >= 0.42) { measure = "crown_granary"; granaryOn = true; granaryEpoch = e + 1; }
            else if (darkShare >= 0.55) { measure = "grid_charter"; gtShift = -18; expandConduit(); charterDebt = CHARTER_LOAN; charterDebtEpoch = e + 1; } // B7: the wires are strung on imperial credit
            else if (meanToll >= 12) { measure = "toll_amnesty"; tollScale = 0.4; }
            else if (params.db >= 34 && rIns() < 0.5) { measure = "dumping_reform"; disposalOverride = "disperse"; }
            else if (bottomOre >= 18) { measure = "retention_act"; retentionAct(); }
            else { measure = "crown_granary"; granaryOn = true; granaryEpoch = e + 1; }
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
            revoltWon = rs > stateStr + 20;
            if (revoltWon) {
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
            reg.eventType = "revolt"; reg.eventEpoch = e + 1;
            reg.eventSeverity = 70 + Math.round(rV() * 25);
            events.push({ epoch: e + 1, type: "revolt", region_id: reg.id, outcome: revoltWon ? "won" : "crushed",
              ...(revoltWon ? { arc: reg.wonArc } : {}) }); // B8 (#130): the won rising's arc — flourished or starved
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
        reg.elitePopPct = 2 + (reg.tier === "metropolis" ? 3 : reg.tier === "city" ? 2 : 0)
          + (reg.refining > 0 ? 2 : 0) + (reg.isPort === 1 ? 1 : 0) + (reg.isSkyport === 1 ? 1 : 0);
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
          (wwHere ? 85 : (reg.onConduit ? 45 : 15)) + 0.25 * reg.wealth - 0.35 * reg.blight
          // G2: the river gives water — unless upstream already fouled it
          + (reg.onRiver ? Math.max(0, 12 - 0.25 * reg.downstreamBlight) : 0)
        ), 0, 100);
        const tierF = { metropolis: 0, city: 30, "works-town": 60, "frontier-post": 85 }[reg.tier];
        reg.vulnerability = clamp(Math.round(
          0.5 * (100 - reg.wealth) + 0.3 * (100 - reg.centrality) + 0.2 * tierF
        ), 0, 100);
        const care = 1 - 0.55 * reg.healingReach / 100; // reach averts burden
        const jit = 0.94 + sx("health#" + reg.id)() * 0.12;
        reg.burdenEnv = r1(0.55 * reg.blight * care * jit);
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
      const crushedIdx = (revoltIdx >= 0 && !revoltWon) ? revoltIdx : -1;
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
          20 + 0.4 * reg.centrality + (reg.onConduit ? 12 : 0) - 0.2 * reg.blight +
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
      return { seed: String(params.seed), regions, settlements, facilities, structures, sanctionedSites, garrisons, conduitEdges, roadEdges, epochSnaps, events, capital: cap, capPoint, capitalName, windDeg: geo.windDeg, ridges: geo.ridges, passes: geo.passes, rivers: geo.rivers, seaSides: geo.seaSides, bridges: liveBridges, ruins: geo.ruins, maelstrom: geo.maelstrom, holdings, treasuries, tensions, dynasties, seaShapes: geo.seaShapes, lakeShapes: geo.lakeShapes, seaLevel: geo.seaLevel, contours: geo.contours, contoursFine: geo.contoursFine, hachures: geo.hachures, peaks: geo.peaks, skywayName, freeport, sanctuary, camps, stillName,
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
          seed: String(params.seed), ...(params.fate ? { fate: String(params.fate) } : {}), regions: params.regions, relax: params.relax,
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
          seed: String(params.seed), ...(params.fate ? { fate: String(params.fate) } : {}), regions: params.regions, relax: params.relax,
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
      // the poorest fifth against the richest fifth
      const k = Math.max(1, Math.floor(n / 5));
      const byWealth = R.slice().sort((a, b) => a.wealth - b.wealth || a.id - b.id);
      const blightRatio = r1(mean(byWealth.slice(0, k).map(r => r.blight)) /
        Math.max(1, mean(byWealth.slice(-k).map(r => r.blight))));
      // the mountain-shadow earnings gap (medians; seat excluded from the open side)
      const shadow = R.filter(r => r.rangeShadow === 1);
      const open = R.filter(r => r.rangeShadow === 0 && !r.isCapital);
      const shadowGap = (shadow.length >= 2 && open.length >= 2 && med(open.map(r => r.wealth)) > 0)
        ? Math.round(100 * (1 - med(shadow.map(r => r.wealth)) / med(open.map(r => r.wealth)))) : null;
      // darkness and its burden
      const dark = R.filter(r => !r.onConduit), lit = R.filter(r => r.onConduit);
      const darkBurden = (dark.length && lit.length)
        ? r1(mean(dark.map(r => r.burden)) / Math.max(0.1, mean(lit.map(r => r.burden)))) : null;
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
      const occs = R.filter(r => r.occupied);
      const freeR = R.filter(r => !r.occupied);
      const sovereignty = occs.length && freeR.length ? {
        occupied_n: occs.length,
        corridor_wired: occs.filter(r => r.onConduit).length,
        retent_ratio: r1(mean(freeR.map(r => r.retention)) / Math.max(1, mean(occs.map(r => r.retention)))),
        growth_gap: med(freeR.map(r => r.wealth - r.wealthT0)) - med(occs.map(r => r.wealth - r.wealthT0)),
        comprador_ratio: r1(mean(occs.map(r => r.eliteShare)) / Math.max(1, mean(freeR.map(r => r.eliteShare))))
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
    function composeChronicle(model, params) {
      const rc = streams(params.seed)("chronicle");
      const pick = (v) => v[Math.floor(rc() * v.length)];
      const year = (e) => 1000 + 25 * e;
      const closeY = year(params.ep);
      const town = (id) => model.settlements.find(s => s.regionId === id) || { name: ((model.regions.find(r => r.id === id) || {}).placeName) || "the wild", regionId: id, tier: "none", population: 0 };
      const tierWord = { metropolis: "the capital", city: "the city", "works-town": "the works-town", "frontier-post": "the frontier post" };
      const list = (xs) => xs.length <= 1 ? (xs[0] || "") :
        xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];
      const compass = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"][Math.round(model.windDeg / 45) % 8];
      const L = [];

      // -- the founding ------------------------------------------------------
      L.push(`# A Chronicle of the Hinterland`);
      L.push(``);
      const crownLine = model.dynasties.crown;
      const reigning = (crownLine[crownLine.length - 1] || {}).name || "an unnamed regent";
      L.push(`*The world called "${params.seed}". Written down at ${model.capitalName} in the year ${closeY}, during the reign of ${reigning}.*`);
      L.push(``);
      L.push(`## The Founding, Year 1000`);
      L.push(``);
      const n = model.regions.length;
      // founding works: today's refineries, minus the mid-run foundings, plus the collapsed
      const foundedIds = new Set(model.events.filter(ev => ev.type === "refinery_founded").map(ev => ev.region_id));
      const collapsedIds = model.events.filter(ev => ev.type === "refinery_collapse").map(ev => ev.region_id);
      const works0 = model.regions.filter(r => (r.refining > 0 && !foundedIds.has(r.id))).map(r => r.id).concat(collapsedIds);
      const consIds = new Set(model.events.filter(ev => ev.type === "consecration").map(ev => ev.region_id));
      const shrines0 = model.sanctionedSites.filter(s => !consIds.has(s.regionId));
      const dark0 = model.epochSnaps[0].onGrid.filter(v => !v).length;
      L.push(`This record covers a realm of ${n} settled regions, with its capital at ${model.capitalName}. ` +
        `The wind comes from the ${compass}. Most of what follows was set by the ground itself: ` +
        `where the aetherstone lies, where the land will carry a road, and where it won't.`);
      {
        const pops = model.regions.map(r => r.popT0).sort((a, b) => b - a);
        const medP = pops[Math.floor(pops.length / 2)];
        L.push(``);
        L.push(`No one planned the towns' sizes. They grew that way over centuries: good land paid off, and trade pulled people in. By year 1000 the largest town held ${pops[0].toLocaleString("en-US")} people to the median town's ${medP.toLocaleString("en-US")}. The bigger a town got, the faster it grew.`);
      }
      L.push(``);
      L.push(`The aetherworks at ${list(works0.map(id => town(id).name))} refine aetherstone into lumen, and the trunk lines run from them to the capital. ` +
        `The Temple holds sacred ground at ${list(shrines0.map(s => `${s.name} (by ${town(s.regionId).name})`))}, out where the aetherstone lies and the Crown's authority is weak. ` +
        (dark0 > 0
          ? `${dark0} settlements started off the grid: reachable by road, but with no power line, because the ledgers said wiring them wouldn't pay.`
          : `Every settlement started on the grid. The ledgers rarely allow that, and never for long.`));
      {
        const aeries = model.regions.filter(r => r.isSkyport === 1).map(r => town(r.id).name);
        L.push(``);
        L.push(aeries.length >= 2
          ? `There is also the ${model.skywayName} Lane: lift-barges running between ${list(aeries)}, over the walls, fords, and gates below. ` +
            `The lanes go where the ground is hardest and the cargo most valuable, and you pay to board at the aerie. ` +
            `The road is open to everyone; the sky isn't.`
          : `No skyway was built here. The ledgers found no lane worth the lift.`);
      }
      if (model.ridges.length) {
        const shadowN = model.regions.filter(r => r.rangeShadow === 1).length;
        const passNames = model.passes.map(p => p.name);
        L.push(``);
        L.push(`The ${list(model.ridges.map(R => `${R.name} ${R.kind}`))} ${model.ridges.length > 1 ? "wall" : "walls"} off the country, and the roads across ${model.ridges.length > 1 ? "them" : "it"} go through ${list(passNames)}. ` +
          (shadowN > 0
            ? `${shadowN} regions sit in the mountains' shadow, cut off from ${model.capitalName} by the wall. That costs them, as the record will show.`
            : `As it happened, no region ended up cut off from ${model.capitalName} by the wall. That was luck, not fairness.`));
      }
      for (const RV of model.rivers) {
        const head = town(model.regions[RV.chain[0]].id).name;
        const mouth = town(model.regions[RV.chain[RV.chain.length - 1]].id).name;
        L.push(``);
        L.push(`The ${RV.name}${RV.kind === "River" ? "" : " " + RV.kind} runs down from the high ground by ${head} through ${RV.chain.length} regions to the border. ` +
          `The towns drink from it in order: ${head} gets it clean; ${mouth}, at the mouth, gets whatever every town and aetherworks upstream have dumped in. ` +
          `Nobody at the mouth chose to be last. The land decided that.`);
      }
      if (model.seaSides.length) {
        const ports = model.regions.filter(r => r.isPort === 1);
        const portBits = ports.map(reg => {
          const t = town(reg.id);
          const riverPort = reg.onRiver === 1 && reg.downstreamBlight > 0;
          return harborName(t.name) + (riverPort ? ` (which drinks the river last and ships it first)` : ``);
        });
        L.push(``);
        const chartNames = model.seaShapes.map(S => S.name).filter(Boolean);
        L.push(`The sea lies to the ${list(model.seaSides)}${chartNames.length ? `, and the charts call it ${list(chartNames)}` : ""}. ` +
          (ports.length
            ? `The realm's ${ports.length > 1 ? "gates are" : "gate is"} ${list(portBits)}: everything the mines raise and the aetherworks refine leaves through ${ports.length > 1 ? "them" : "it"}, and whoever holds the quay collects the tariff. ` +
              `How far a town sits from the water was luck, decided at the founding like everything else.`
            : (params.hb === 0
              ? `The quays are sealed by decree: the realm trades with no one across the water, and no one lands. The cost of that safety falls on every coast that could have been a gate.`
              : `No harbor was built at the founding; the coast waits.`)) +
          (model.maelstrom ? ` Sailors keep well clear of the ${model.maelstrom.name}, where the sea turns on itself; no quay was ever built within its reach.` : ``));
      }
      if (model.ruins.length) {
        const ruinBits = model.ruins.map(r => {
          const t = town(model.regions[r.regionIdx].id).name;
          return r.type === "delve" ? `the delve called ${r.name} gapes in the old workings by ${t}`
            : r.type === "tomb" ? `the tomb of ${r.name} keeps its silence in the barrens by ${t}`
            : `the deadhold of ${r.name} stands empty by ${t}, and its ground is poisoned yet`;
        });
        const busiest = model.regions.reduce((a, b) => a.delverFlux >= b.delverFlux ? a : b);
        L.push(``);
        L.push(`The old world is still here: ${list(ruinBits)}. ` +
          `Delvers work the ${town(busiest.id).name} road every season, because it pays when nothing else does. Not all of them come back, and what they carry out is sold off the books.`);
      }
      if (model.freeport) {
        const t = town(model.freeport.regionId);
        L.push(``);
        L.push(`Past the last boundary stone, by ${t.name}, the lawless keep their own harbor: ${model.freeport.name}. No charter lists it, no gate taxes it, and assessors who visit don't come back a second time. Anything the realm won't carry on its books leaves through here, and the ground around it keeps what the gates would have taken` +
          (params.hb === 0 ? `. With the quays sealed by decree, this is the only working gate left.` : `.`));
      }
      if (model.sanctuary) {
        const t = town(model.sanctuary.regionId);
        L.push(``);
        L.push(`High above the roads, by ${t.name}, stands ${model.sanctuary.name}, holy ground the Temple never sanctioned and can't forgive. It heals anyone who climbs to it and asks nothing. The census never climbs that far, so the people it shelters go uncounted. Pilgrims walk to it alongside the official roads, which the Temple is reminded of every festival.`);
      }
      {
        const still = model.regions.filter(r => r.stillair === 1);
        if (still.length) {
          const bits = still.map(r => town(r.id).name);
          L.push(``);
          L.push(`Over ${list(bits)} lies ${model.stillName}: ground where the lift-stones just stop working. No aerie can be built there and no lane can land. Everywhere else the sky costs money; here it isn't for sale at any price.` +
            (model.regions.find(r => r.isCapital).stillair === 1 ? ` The capital itself sits in the still, so no skyway flies in this realm at all.` : ``));
        }
      }
      if (model.camps.length) {
        const bits = model.camps.map(cp => `${cp.name} by ${town(cp.regionId).name}`);
        L.push(``);
        L.push(`Where the beasts are worth a bounty and the constabularies never come, hunters keep ${list(bits)}. The stands thin the predation on their ground, the trophies are fenced where nothing is taxed, and for the poorest the bounty is the one rung of a ladder the realm never built.`);
      }
      {
        const towers = model.regions.filter(r => r.hasTower === 1);
        if (towers.length) {
          const bits = towers.map(reg => `${town(reg.id).name} Tower`);
          L.push(``);
          L.push(`${towers.length > 1 ? "Apostates keep" : "An apostate keeps"} ${list(bits)}, out where the constabulary line fails and the grid never came, selling in the darkness what the grid will not carry. ` +
            `The Temple calls it heresy; the magnates call it competition; the people it heals call it the only healer who ever came.`);
        }
      }
      if (model.bridges.length) {
        const bits = model.bridges.map(b => `${town(model.regions[b.regionIdx].id).name} Bridge`);
        L.push(``);
        L.push(`The rivers are crossed at ${list(bits)}${model.bridges.length > 1 ? "" : " alone"}; everywhere else the banks are marsh and the water must be forded, and the fords are where the wagons drown. ` +
          `Whoever holds a bridge holds a queue of people who cannot go around.`);
      }

      // -- the years ---------------------------------------------------------
      if (params.ep > 0) {
        L.push(``);
        L.push(`## The Years`);
        L.push(``);
        // #86: the realm's own ages open The Years — a periodization the reader
        // can point at ("the gap opened in the Age of the Gates").
        {
          const FA = getFindings(model).ages;
          if (FA && FA.length) {
            const span = (a) => `${year(a.from_epoch)}–${year(a.to_epoch)}`;
            const spread = (a) => a.gini_end > a.gini_start + 0.02 ? "the gap widened"
              : a.gini_start > a.gini_end + 0.02 ? "the gap narrowed" : "the gap held";
            const bits = FA.map(a => `**${a.name}** (${span(a)}), when ${spread(a)}`);
            L.push(`These years split into ages, each named for what the realm was living through: ${list(bits)}. ` +
              `No one decreed the names. They come from the record itself: where the wealth piled up, where the gates charged tariffs, and where the towns emptied out or came back.`);
            L.push(``);
          }
        }
        if (model.events.length === 0) {
          L.push(`No upheavals are recorded. The years passed as the founding had set them up, which does not mean they passed kindly. ` +
            `The grid crawled toward the money, the ore drew down, and the poison settled where it always settles.`);
        }
        const strikeEv = model.events.find(ev => ev.type === "ore_strike");
        for (const ev of model.events) {
          const t = ev.region_id !== undefined ? town(ev.region_id) : null;
          const y = year(ev.epoch);
          let line = "";
          if (ev.type === "refinery_collapse") line = pick([
            `The aetherworks at ${t.name} shut down. The fields that fed them were worked out, and the magnates left as soon as the ore did. The trunk lines still stand there, carrying nothing.`,
            `The aetherworks at ${t.name} closed its yards for good. The ore that built the town ran out, and the town kept its wires but lost its wages.`,
            `The last shift at the ${t.name} aetherworks clocked out and did not come back. The lode was spent. The lumen tanks went cold within the month.`,
            `The magnates pulled their money out of ${t.name} when the ore stopped paying. The aetherworks went dark, and the town it had grown around emptied behind it.`,
            `The aetherworks at ${t.name} failed. The seam it drew from was mined to nothing, and the wages stopped a season before the wires did.`,
          ]);
          else if (ev.type === "refinery_founded") line = pick([
            `The magnates built new aetherworks at ${t.name}, where the money had gone. The capital sealed the charter, and the trunk line followed within the season.`,
            `New aetherworks fires were lit at ${t.name}. The capital called it progress. The towns the new trunk line skipped did not.`,
            `The magnates broke ground on aetherworks at ${t.name}. Where the ore was rich the money followed, and the grid was run out to meet it.`,
            `Aetherworks rose at ${t.name} on a fresh charter. The lumen came online that year, and the town doubled before the next census could count it.`,
            `The capital chartered aetherworks at ${t.name}. The wires reached it fast, because someone had already decided the ore was worth the copper.`,
          ]);
          else if (ev.type === "blight_plague") line = pick([
            `Plague took ${t.name}. The blight had sat heavy on that country for years, so the sickness arrived to a town already half-poisoned. A third of the people died or fled.`,
            `Sickness came to ${t.name}. Anyone who had seen the blight-mark had expected it. Where there were healers, their registers do not agree on the death count. The roads out of town do.`,
            `A plague settled on ${t.name}. The ground had been fouled long before the fever came, and the fever found little to stop it. Whole streets went quiet.`,
            `Fever ran through ${t.name}. The blight had weakened the town for a generation, and the sick had nowhere clean to lie. The burial rolls ran longer than the tax rolls that year.`,
            `The sickness reached ${t.name} and stayed. The poisoned ground had done half the work already. Those who could walk left; those who could not were counted after.`,
          ]) + (ev.name ? ` The roads named it ${ev.name}.` : ``);
          else if (ev.type === "relic_calamity") line = pick([
            `The relic ground by ${t.name} woke. The surviving accounts do not say clearly what the old power did there. The land it touched still carries the scar.`,
            `At the sanctioned ground by ${t.name}, something of the old world stirred and broke. The Temple calls it a test. The survivors did not. The blight it left has not faded.`,
            `Something old came awake in the ground by ${t.name}. What it was, no two accounts agree. What it left behind is plain enough: land that will not grow.`,
            `The buried power near ${t.name} turned over in its sleep. The Temple sealed the site and said little. The scar it burned into the country is still there to read.`,
            `Whatever the old world left under ${t.name} broke loose. The records are thin and frightened. The blighted ring around the site kept everyone honest about that much.`,
          ]);
          else if (ev.type === "ore_strike") {
            line = pick([
              `Prospectors struck a hidden lode under ${t.name}. By winter the roads were full of wagons and the town was full of strangers.`,
              `A lode no survey had found came up under ${t.name}. The rush was immediate: retainers, chancers, assayers, and everyone who trails them.`,
              `Diggers hit rich ore under ${t.name} where no one had thought to look. Within a season the town had tripled, and the price of a bed had tripled with it.`,
              `A new seam opened under ${t.name}. Word travels fast where ore is concerned, and the strangers were on the road before the assay was even filed.`,
              `The ground under ${t.name} gave up a lode nobody had mapped. The town filled overnight with people who had nothing but a shovel and a claim.`,
            ]);
            const warAfter = model.events.find(w => w.type === "war" && w.epoch > ev.epoch && w.epoch <= ev.epoch + 2);
            if (warAfter) line += ` The ground was already disputed, and every magnate, priest, and captain in the realm knew what a lode there meant.`;
          }
          else if (ev.type === "war") {
            const chained = strikeEv && ev.epoch > strikeEv.epoch && ev.epoch <= strikeEv.epoch + 2;
            const FN = { crown: "the Crown", temple: "the Temple", magnate: "the magnates" };
            const powers = ev.factions ? ` The two powers fighting there were ${FN[ev.factions[0]]} and ${FN[ev.factions[1]]}. The town was just where they met.` : ``;
            line = (chained
              ? `War came to ${t.name}, ${25 * (ev.epoch - strikeEv.epoch)} years after the strike. Armies follow ore.${powers} `
              : `War came to ${t.name}. It comes to ground that great powers claim and none can hold.${powers} `) +
              `When the fighting stopped, ${tierWord[t.tier]} had lost a third of its people and a quarter of its wealth, and the mines and aetherworks were wrecked. The Crown's constabulary arrived after the blood, and stayed.` +
              (ev.name ? ` The scribes titled the page ${ev.name}.` : ``);
          }
          else if (ev.type === "seizure") {
            const F = ev.faction === "crown" ? "the Crown" : ev.faction === "temple" ? "the Temple" : "the magnates";
            const what = t.name; // the gate is named for its town
            line = pick([
              `${F.charAt(0).toUpperCase() + F.slice(1)} took the gate at ${what}. A gate is a quay, a span, or a pass, and whoever holds it holds a line of people who cannot go around. The tariff was posted by winter.`,
              `${F.charAt(0).toUpperCase() + F.slice(1)} pressed ${F === "the magnates" ? "their" : "its"} claim on the crossing at ${what}. No blood is recorded. The claim was made on paper, and the tariff kept it.`,
              `${F.charAt(0).toUpperCase() + F.slice(1)} seized the crossing at ${what}. Whoever holds the narrow ground sets the price to pass it, and the price went up that season.`,
              `${F.charAt(0).toUpperCase() + F.slice(1)} moved on the gate at ${what} and held it. There was no fight worth recording. The first tariff notice went up before the ink on the claim was dry.`,
              `${F.charAt(0).toUpperCase() + F.slice(1)} claimed the gate at ${what} for ${F === "the magnates" ? "their" : "its"} own. The people who used the crossing found the fee waiting the next market day.`,
            ]);
          }
          else if (ev.type === "tower_burned") {
            const F = ev.faction === "crown" ? "the Crown's soldiers" : "the Temple's censors";
            line = `${F.charAt(0).toUpperCase() + F.slice(1)} burned the tower at ${t.name}. The writs do not say what this cost. The one healer the darkness had is gone, and nothing came to replace it.`;
          }
          else if (ev.type === "tower_raised") {
            line = `An apostate raised a tower at ${t.name}, out where no writ runs and the grid never came. The neighbors did not report it for a season. They were its first customers.`;
          }
          else if (ev.type === "succession") {
            const TITLE = { crown: "Sovereign", temple: "Hierarch", magnate: "First Magnate" };
            const SEATW = { crown: "the capital", temple: "the censer", magnate: "the chair" };
            line = ev.contested
              ? `The old ${TITLE[ev.faction]} died, and the succession was contested. While the court fought itself, the gates went unwatched and the realm's rivals moved in. In the end ${ev.name} took ${SEATW[ev.faction]}. Some who objected were killed, and the objections did not stop.`
              : `The old ${TITLE[ev.faction]} died, and ${ev.name} took ${SEATW[ev.faction]} without incident. That is rare enough to be worth recording.`;
          }
          else if (ev.type === "reform") {
            const PROSE = {
              dumping_reform: "a Dumping Reform. The spoil trains now go where the land is empty, not where the people are poor",
              grid_charter: "a Grid Charter. The bar for connection dropped, and the wires reached further out than the ledgers alone would ever have carried them",
              toll_amnesty: "a Tariff Amnesty. The gates still stand, but the fees are capped by decree",
              retention_act: "a Retention Act. It set a floor under the ore price, fixed at the capital, so the bottom half of the realm keeps more of what its own ground produces",
              crown_granary: "the Crown Granary. It taxes the fat years to buy bread for the lean ones. It is the first decree in the realm's history to move coin downhill"
            };
            line = `The capital passed ${PROSE[ev.measure]}. It had blocked reform for years, and only gave in once the damage was bad enough.`;
          }
          else if (ev.type === "reaction") {
            const PROSE = {
              dumping_entrenched: "the dumping was written into law, and the spoil trains sought out the poor more openly than before",
              toll_crackdown: "the tariffs rose by decree. The gates' holders had paid for their privileges, and the capital owed them"
            };
            line = `The capital met the unrest with force: ${PROSE[ev.measure]}. There was no debate on record.`;
          }
          else if (ev.type === "imposition") {
            // B7 (#129): a measure the realm did not choose — narrated AS imposed
            line = `This measure did not come from the capital. It came from the capital's creditors. The imperial loans had gone unpaid and the doctrine was pressing abroad, so the financiers demanded an adjustment: close the granary, order the gates to collect, and balance the books on the people who could least afford it. The official term is structural adjustment. The towns called it a decree written in another capital.`;
          }
          else if (ev.type === "revolt") {
            const rr = model.regions.find(r => r.id === ev.region_id);
            const underDominion = rr.occupiedEpoch !== -1 && rr.occupiedEpoch < ev.epoch;
            // B8 (#130): the won rising is a distribution — the chronicle learns its
            // two arcs. A Free town that FLOURISHED (suppressed potential released) or
            // one that STARVED (the fled capital and order left it hollow).
            const wonArc = ev.arc === "starved"
              ? ` But freedom is not food. The magnates' capital left with the magnates, the aetherworks it had funded went dark, and the skilled workers followed the money out. The free town starved. The injustice had been real and so was the freedom, and neither one fed anyone.`
              : ` And it flourished. The aetherworks the charter had held back ran at full tilt, the crafts the tariffs had taxed to the bone found their feet, and people came to the free town from the tariffed country around it. Freedom released what the old order had held down.`;
            line = underDominion
              ? (ev.outcome === "won"
                ? `${t.name} rose against the Dominion itself, and won. The factors were thrown into the harbor, the assessment tables were burned, and the town keeps what it makes now.${wonArc}`
                : `${t.name} rose against the Dominion, and the imperial constabulary put it down, which is what the imperial constabulary is there to do. The assessment tables do not mention the rising, so this record does.`)
              : (ev.outcome === "won"
                ? `${t.name} rose. The constabulary line broke and the mob held. ${t.name} keeps what it makes now, and its gates charge no one.${wonArc}`
                : `${t.name} rose, and was put down. The constabulary arrived after the hangings. The injustice that caused the rising was written down in full and then left alone.`);
            if (ev.name) line += ` The people keep the date as ${ev.name}.`;
          }
          else if (ev.type === "treaty") {
            const FN3 = { crown: "the Crown", temple: "the Temple", magnate: "the magnates" };
            const W2 = FN3[ev.winner], L2 = FN3[ev.factions.find(f => f !== ev.winner)];
            const terms = (ev.ceded > 0 ? `${L2} ceded ${ev.ceded === 1 ? "a gate" : ev.ceded + " gates"}` : `${L2} ceded nothing but its claim`) +
              (ev.tribute > 0 ? ` and paid ${ev.tribute} in tribute out of its ledger` : ` and kept its ledger, which held little`);
            line = `In the winter after the fighting, terms were set at ${t.name}. ${W2.charAt(0).toUpperCase() + W2.slice(1)} wrote them: ${terms}. ` +
              `The side with the deeper ledger wrote the terms, which is how terms are usually written.` +
              (ev.name ? ` The clerks filed the fair copy as ${ev.name}.` : ``);
          }
          else if (ev.type === "annexation") {
            line = `The Dominion's fleet stood off ${harborName(t.name)} at dawn, and by winter it held ${ev.occupied} regions. ` +
              `There was no fighting. Nobody could stop it. The quays now collect for a power across the sea, the yield of the occupied country is assessed at the water, ` +
              `and the wires arrived with the constabulary. It is the first country in the realm to be wired end to end, because its cargo is wanted elsewhere.` +
              (ev.name ? ` The Dominion's own registers file it as ${ev.name}.` : ``);
          }
          else if (ev.type === "concession") {
            // B11 (#133): the empire that buys instead of landing
            line = `${ev.power || "the Metropole"} did not send a fleet to ${harborName(t.name)}. It sent factors and a charter. ` +
              `The aetherworks were bought, the coast was wired to the sea within the season, and money came in to build. The town grew richer than it had ever been. ` +
              `The registers at the capital still carry the town's name. The registers that matter now are kept in another capital, and half of what the ground yields is entered there.`;
          }
          else if (ev.type === "abandonment") {
            const startY = ev.since !== undefined ? 1000 + 25 * ev.since : null;
            line = `${ev.power || "the Metropole"} wound up its concession at ${t.name}${startY ? `, ${25 * (ev.epoch - ev.since)} years after it opened it in ${startY}` : ``}. ` +
              `The lode had drawn down, and the attention left with the ore. The factors sailed, the credit stopped, and the aetherworks they had built went quiet. ` +
              `It cut both ways. The markets that had made the town rich were gone, but so were the levies, and the ground kept what it made for the first time in a generation. The town got its ruin and its freedom in the same year.`;
          }
          else if (ev.type === "embargo") {
            line = `Politics in a capital ${t.name} had never seen closed the sea lanes to it. A quarrel between ${ev.power || "a rival power"} and the Metropole became ${t.name}'s ruin. ` +
              `The quays that had built a second fortune on foreign trade stood idle, the cargoes stopped coming, and the coast that had rivalled the capital went bust in a single year. The wealth the trade had brought was gone, and the town had no say in any of it.`;
          }
          else if (ev.type === "courting") {
            line = `${ev.power || "the Rival"} sent envoys to ${harborName(t.name)}, and the capital pretended not to notice. ` +
              `Nothing was signed. A rich coast the Metropole has not yet claimed is a coast worth courting, and the powers across the sea prefer to be invited. This is how the next annexation usually begins.`;
          }
          else if (ev.type === "consecration") {
            const shrine = model.sanctionedSites.find(s => s.regionId === ev.region_id);
            line = `The Temple came to ${t.name}, to the ground of its suffering, and consecrated it as ${shrine ? shrine.name : "holy ground"}. ` +
              `Pilgrims walk that road now. The Crown's writ had failed there and the magnates' ledgers had seen nothing worth the ink. The faith moved in after the harm was done, and claimed the ground.`;
          }
          // D7: the years' shocks — weather, ground, discovery, and the god
          else if (ev.type === "drought") line = `The rains failed over ${t.name}, and failed again. Wells that had been shared were closed off, and the country the water had barely reached went to dust first. The scribes titled the dry page ${ev.name}.`;
          else if (ev.type === "flood") line = `The river rose over ${t.name} and took the low ground with it: the fields, the founding wharves, whatever stood in the way. The accounts call it ${ev.name}, and they do not agree on how many it took.`;
          else if (ev.type === "quake") line = `The ground moved under ${t.name}, where the wall's own folding runs closest to the surface. Roads cracked, the pass shifted, and what stood on soft ground did not stand after. The record keeps it as ${ev.name}.`;
          else if (ev.type === "storm") line = `A storm came off the water and stood over the coast for three days. ${t.name} took the worst of it, as the exposed shore always does; ${ev.name} is the name the survivors gave the year.`;
          else if (ev.type === "discovery") line = `Fortune turned at ${t.name}: a lode, a lost road, a relic worth the carrying. The accounts differ on what it was, but the wagons all came the same way. People came back to ground they had been leaving. The clerks file it as ${ev.name}.`;
          else if (ev.type === "ascendancy") line = `The god's fortune rose at ${t.name}, and with it the town's. Pilgrims rerouted, coin followed the pilgrims, and the temple that had gone quiet was affluent again. The faithful keep the year as ${ev.name}.`;
          if (!line) continue; // an unrecognized event leaves no year-line
          L.push(`**Year ${y}.** ${line}`);
          L.push(``);
        }
        // E6: the years leave bynames where they pass — derived, not drawn
        const byn = model.regions.filter(r => r.epithet).map(r => `${town(r.id).name} ${r.epithet}`);
        if (byn.length) {
          L.push(`The years leave names behind them. The realm now speaks of ${list(byn)}: bynames no charter granted and no decree can take away. They are the plainest record in this document, because the people kept them on their own.`);
          L.push(``);
        }
      }

      // -- the state of the realm --------------------------------------------
      L.push(``);
      L.push(`## The State of the Realm, Year ${closeY}`);
      L.push(``);
      if (params.ep > 0) {
        const bb = { boom: 0, stable: 0, decline: 0, collapse: 0, abandoned: 0 };
        model.regions.forEach(r => { bb[r.boomBust] = (bb[r.boomBust] || 0) + 1; });
        const settledCount = model.regions.filter(r => r.settled).length;
        const parts = [];
        if (bb.boom) parts.push(`${bb.boom} rose through the years`);
        if (bb.stable) parts.push(`${bb.stable} held steady`);
        if (bb.decline) parts.push(`${bb.decline} declined`);
        if (bb.collapse) parts.push(`${bb.collapse} collapsed outright`);
        L.push(`Of the realm's ${settledCount} settled regions, ${list(parts)}.`);
        // D8: the ghost country — cells the years emptied, and cells reborn
        const deadholds = model.regions.filter(r => !r.settled && r.abandonedEpoch >= 0);
        if (deadholds.length) {
          const names = deadholds.slice(0, 4).map(r => r.placeName).filter(Boolean);
          L.push(`${deadholds.length} ${deadholds.length === 1 ? "holding stands" : "holdings stand"} empty now. These are the deadholds, places where a town once stood and no longer does. The maps still name ${list(names)}${deadholds.length > names.length ? " among others" : ""}, but the roads have stopped going there.`);
        }
        const reborn = model.regions.filter(r => r.settled && r.rebirths >= 1);
        if (reborn.length) {
          const rn2 = reborn.slice(0, 3).map(r => town(r.id).name).filter(Boolean);
          L.push(`And ${reborn.length} ${reborn.length === 1 ? "place has" : "places have"} come back as something else. ${list(rn2)} stand again on ground that had been left for dead, under names in a different tongue than the one they carried before.`);
        }
        const ghost = model.regions.reduce((a, b) => a.abandonment >= b.abandonment ? a : b);
        if (ghost.abandonment >= 35)
          L.push(`${town(ghost.id).name} is the emptiest of the ghost country. Its best years are gone, and the roads no longer go there.`);
        const riser = model.regions.reduce((a, b) => (a.wealth - a.wealthT0) >= (b.wealth - b.wealthT0) ? a : b);
        if (riser.wealth - riser.wealthT0 > 10)
          L.push(`${town(riser.id).name} rose further than any other place in the record. In this realm, that says as much about where it stood as about anything it did.`);
        L.push(``);
      }
      const bc = { crown: 0, temple: 0, magnate: 0, contested: 0, ungoverned: 0 };
      model.regions.forEach(r => { bc[r.bloc]++; });
      L.push(`The Crown holds ${bc.crown} regions, the Temple ${bc.temple}, the magnates ${bc.magnate}; ` +
        `${bc.contested} are contested between them, and ${bc.ungoverned} answer to no one at all.`);
      if (model.holdings.length) {
        const hc = { crown: 0, temple: 0, magnate: 0, none: 0 };
        model.holdings.forEach(h => { hc[h.heldBy]++; });
        L.push(``);
        L.push(`Of the realm's ${model.holdings.length} gates, meaning the bridges, the passes, and the quays, ` +
          `the Crown keeps ${hc.crown}, the Temple ${hc.temple}, and the magnates ${hc.magnate}. ${hc.none} stand untolled. ` +
          `Every levy on the list is paid by people who did not choose the road.`);
        const tr = model.treasuries;
        if (tr.crown + tr.temple + tr.magnate > 0) {
          const FN2 = { crown: "the Crown", temple: "the Temple", magnate: "the magnates" };
          const richest = ["crown", "temple", "magnate"].reduce((a, b) => tr[a] >= tr[b] ? a : b);
          const tn = model.tensions;
          const pairs = [["crown_magnate", "the Crown and the magnates"], ["crown_temple", "the Crown and the Temple"], ["magnate_temple", "the magnates and the Temple"]];
          const worst = pairs.reduce((a, b) => tn[a[0]] >= tn[b[0]] ? a : b);
          L.push(``);
          L.push(`The tariff ledgers run deepest with ${FN2[richest]}, and coin buys the next gate. More gates mean more coin, which buys more gates. ` +
            (tn[worst[0]] >= 20
              ? `Of the powers, ${worst[1]} stand nearest to blows.`
              : `For now, none of the powers hold a grievance worth the ink.`));
        }
      }
      { // H1: the chronicle counts the owners' row (no phrasing dice:
        // the older histories keep their exact words)
        const FS = getFindings(model);
        if (FS.owners && FS.class_gap !== null) {
          const ct0 = town(FS.company_town);
          L.push(``);
          L.push(`And every town holds two peoples under one name: the owners' row and the labor it hires. ` +
            `Together, ${FS.owners.pop_pct} in every hundred of the realm's people hold ${FS.owners.coin_pct} of every hundred coins, and live ${FS.class_gap} times better than the people who work for them. ` +
            `The gap is sharpest at ${ct0.name}, where ${FS.company_share} coins in every hundred belong to the few` +
            (FS.within_pct !== null && FS.within_pct >= 15 ? `. A map drawn by region cannot show this, since it sees towns but not rows, and it misses ${FS.within_pct} parts in a hundred of the whole spread` : ``) + `.`);
        }
      }
      { // X1: the state of the realm counts its sovereign — or its master
        const occN = model.regions.filter(r => r.occupied).length;
        if (model.dominion && occN > 0) {
          const fh = town(model.regions[model.dominion.foothold].id);
          L.push(``);
          L.push(`And over all of it stands the Dominion, which holds ${occN} regions from its foothold at ${fh.name} and calls the arrangement trade. ` +
            `The occupied country keeps the smallest share of what it makes and carries the best wires in the realm, both for the same reason. ` +
            `The Crown still reigns. It no longer rules the occupied country, and the two are not the same thing.`);
        } else if (model.dominion === null && params.ep > 0) {
          // no clause: worlds the Dominion never reached tell no tale of it
        }
      }
      const darkNow = model.regions.filter(r => !r.onConduit).length;
      L.push(``);
      L.push(darkNow > 0
        ? `${darkNow} of the realm's settlements still sit off the grid, in darkness. The grid goes where the ledgers say it pays to go. Year after year, this record can only mark where that is not.`
        : `At the record's close, the grid reaches every settlement in the realm. That is written here plainly, so a later reader can check whether it lasted.`);
      // A1: the chronicler is required to close with what the numbers say
      {
        const F = getFindings(model);
        L.push(``);
        L.push(`## What the Record Shows`);
        L.push(``);
        const V = [];
        {
          const dG = F.gini - F.gini_t0;
          const rev = model.events.find(ev => ev.type === "revolt");
          const MEAS = { dumping_reform: "the Dumping Reform", grid_charter: "the Grid Charter", toll_amnesty: "the Tariff Amnesty",
            retention_act: "the Retention Act", crown_granary: "the Crown Granary", dumping_entrenched: "the entrenchment of the dumping", toll_crackdown: "the tariff crackdown" };
          let tsent = dG <= -0.04
            ? `This world closed some of its gap. The wealth gap went from ${F.gini_t0.toFixed(2)} at the founding to ${F.gini.toFixed(2)} at the close`
            : dG >= 0.04
            ? `This world got more unequal. The wealth gap went from ${F.gini_t0.toFixed(2)} at the founding to ${F.gini.toFixed(2)} at the close`
            : `This world held its shape. The wealth gap stayed at ${F.gini.toFixed(2)}`;
          if (F.turning) {
            const y = 1000 + 25 * F.turning.epoch;
            tsent += F.turning.type === "revolt" && rev
              ? `. It turned on the rising at ${town(rev.region_id).name} in ${y}${F.turning.outcome === "won" ? (rev.arc === "starved" ? ", which won its freedom and then starved" : ", which won and flourished") : ", which was put down"}.` // B8 (#130): the two won-arcs
              : `. It turned on ${MEAS[F.turning.measure]} in ${y}.`;
          } else {
            tsent += `. No reform came and no rising came, and the loops ran unopposed.`;
          }
          V.push(tsent);
        }
        V.push(`The poorest fifth of the realm carries ${F.blight_ratio} times the blight of the richest fifth.`);
        if (F.shadow_gap_pct !== null && F.shadow_gap_pct > 0 && model.ridges.length)
          V.push(`Behind the ${model.ridges[0].name} wall, the median settlement earns ${F.shadow_gap_pct} in the hundred less than the open country at the same distance.`);
        V.push(`${F.dark_n} regions sit off the grid because the ledgers said serving them would not pay` +
          (F.dark_burden_ratio !== null && F.dark_burden_ratio > 1 ? `, and sickness runs ${F.dark_burden_ratio} times heavier there than in the lit core.` : `.`));
        if (F.mouth_region !== null)
          V.push(`${town(F.mouth_region).name} drinks ${F.mouth_downstream} points of other towns' poison, only because it stands at the mouth.`);
        if (F.toll_paying_n > 0)
          V.push(`${F.toll_paying_n} regions pay tariffs at gates whose holders they never chose.`);
        if (F.owners && F.class_gap !== null)
          V.push(`And inside every town, the shares were set from the start: ${F.owners.pop_pct} in a hundred hold ${F.owners.coin_pct} of every hundred coins, and live ${F.class_gap} times better than the rest.`);
        if (F.sky && F.sky.shadow_adv !== null && F.sky.open_adv !== null && F.sky.shadow_adv > F.sky.open_adv)
          V.push(`The skyway would cut ${F.sky.shadow_adv} parts in a hundred off the walled country's distance to the capital, but the walled country's labor is not allowed to board it.`);
        if (F.sovereignty)
          V.push(`And the whole realm's ledger is now one column in someone else's book: ${F.sovereignty.occupied_n} regions occupied, the yield assessed at the quay, the free country keeping ${F.sovereignty.retent_ratio} times the share the occupied country keeps. The gap between who is sovereign and who is occupied is the largest one in the realm, and it shapes every other.`);
        if (F.concessions && F.concessions.concession_n > 0)
          V.push(`The empire mostly did not invade. It bought in. ${F.concessions.concession_n} ${F.concessions.concession_n === 1 ? "coast is" : "coasts are"} a foreign concession, richer than the realm's median at ${F.concessions.conc_wealth} against ${F.concessions.median_wealth}, and owning barely half of it: ${Math.round(100 * F.concessions.foreign_claim)} in the hundred of the yield is entered in ${esc(model.metropole)}'s books, not the realm's.`);
        if (F.concessions && F.concessions.abandoned_n > 0)
          V.push(`And ${F.concessions.abandoned_n} ${F.concessions.abandoned_n === 1 ? "coast was" : "coasts were"} courted, developed, and then let go when the lode ran thin. The attention left with the ore, and the ground got its ruin and its freedom in the same year.`);
        if (F.rain_split && F.rain_split.wet - F.rain_split.dry >= 8 && model.ridges.length)
          V.push(`The ${model.ridges[0].name} divides even the weather: the rain falls at ${F.rain_split.wet} on one side and ${F.rain_split.dry} in its lee, and no one on the dry side chose the wind.`);
        if (F.twins)
          V.push(`And ${town(F.twins.open).name} and ${town(F.twins.shadow).name} stand the same distance from the capital, one in the open and one behind the wall. The record shows which one prospered, and the mountain is the only thing that separates them.`);
        L.push(`The record closes with what the numbers say. ` + V.join(` `));
        L.push(``);
        L.push(`None of it was decreed. It fell out of where the ore lay, where the wall stood, which way the water ran, and what the ledgers said would pay. That is the finding: no villain wrote it, and it happened anyway.`);
      }
      if (params.ep === 0) {
        L.push(``);
        L.push(`*The record ends where it began. The world is newly founded, and its years are still to run.*`);
      }
      return L.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
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
  signedArea, centroid, asCCW, pointInRing, segInt, distPointSeg,
  clipSeg, clipPolyline, polyLen, polyPointAt, dpSimplify, bumpField,
  relaxPts,
  buildTopology, buildGeology, applyAttributes,
  edgeCost, costDistances,
  toGeoJSON, toEpochSeries, toCsvTables, epochDate,
  computeFindings, getFindings, composeChronicle,
};
