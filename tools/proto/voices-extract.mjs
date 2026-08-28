// #136 step 2: pull the RNG and the Markov coiner OUT OF index.html by anchored
// regex, so the prototype cannot drift from the engine. Fail loudly if a symbol
// moves: a silent fallback would make every voice unreproducible from the export.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const HTML = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

const grab = (name, re) => {
  const m = HTML.match(re);
  if (!m) throw new Error(`#136 EXTRACTION FAILED: ${name} not found in index.html by its anchor. ` +
    `The prototype must read the engine's own coiner, not a copy — fix the anchor, do not fall back.`);
  return m[0];
};

const parts = [
  grab("hashStr",     /function hashStr\(str\) \{[\s\S]*?\n    \}/),
  grab("mulberry32",  /function mulberry32\(a\) \{[\s\S]*?\n    \}/),
  grab("streams",     /function streams\(seedText\) \{[\s\S]*?\n    \}/),
  grab("NAME_CORPUS", /const NAME_CORPUS = \{[\s\S]*?\n    \};/),
  grab("buildChain",  /const buildChain = \(names\) => \{[\s\S]*?\n    \};/),
  grab("NAME_CHAINS", /const NAME_CHAINS = \{\};/),
  grab("chainWalk",   /const chainWalk = \(chain, r, maxLen\) => \{[\s\S]*?\n    \};/),
  grab("markovWord",  /const markovWord = \(register, r, minL, maxL\) => \{[\s\S]*?\n    \};/),
];

const ctx = { Math, Object, Array, String, JSON, console };
vm.createContext(ctx);
vm.runInContext(parts.join("\n") + `
  for (const k of Object.keys(NAME_CORPUS)) NAME_CHAINS[k] = buildChain(NAME_CORPUS[k]);
  globalThis.__V = { streams, markovWord, buildChain, chainWalk, NAME_CHAINS, NAME_CORPUS, registers: Object.keys(NAME_CORPUS) };
`, ctx);

export const { streams, markovWord, buildChain, chainWalk, NAME_CHAINS, NAME_CORPUS, registers } = ctx.__V;
export const extractedBytes = parts.reduce((a, p) => a + p.length, 0);
