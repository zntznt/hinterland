import { setupEngine } from "../lib.mjs";
const E = await setupEngine();
const S = E.parseHash(`#seed=${process.argv[2]||"atlas-1"}&regions=${process.argv[3]||20}&ep=10`);
const r = E.buildTopology(S), g = E.buildGeology(r, S);
console.log(E.composeChronicle(E.applyAttributes(r, S, g), S));
