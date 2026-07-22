// Worker thread for parallel world generation.
// Loads engine once, processes hash batches, returns results.

import { parentPort } from "node:worker_threads";
import { genEngine, setupEngine } from "./lib.mjs";

await setupEngine();

parentPort.on("message", async (hashes) => {
  const results = [];
  for (const hash of hashes) {
    const r = await genEngine(hash);
    results.push(r);
  }
  parentPort.postMessage(results);
});
