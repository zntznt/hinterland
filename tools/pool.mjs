// Worker pool for parallel world generation.
// Spawns N workers, distributes hash batches, collects results.

import { Worker } from "node:worker_threads";
import { cpus } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createPool(size = 0) {
  size = size || Math.max(1, cpus().length);
  const workers = [];

  for (let i = 0; i < size; i++) {
    workers.push(new Worker(resolve(__dirname, "worker.mjs")));
  }

  async function dispatch(hashes) {
    if (!hashes || hashes.length === 0) return [];
    if (hashes.length <= size) {
      // Fewer hashes than workers: one hash per worker, only some workers used
      const chunks = hashes.map(h => [h]);
      const promises = chunks.map((chunk, i) => {
        return new Promise((res) => {
          workers[i].once("message", res);
          workers[i].postMessage(chunk);
        });
      });
      const results = await Promise.all(promises);
      return results.flat();
    }

    // Distribute hashes evenly across workers
    const chunkSize = Math.ceil(hashes.length / size);
    const chunks = [];
    for (let i = 0; i < size; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, hashes.length);
      if (start < hashes.length) chunks.push(hashes.slice(start, end));
    }

    const promises = chunks.map((chunk, i) => {
      return new Promise((res) => {
        workers[i].once("message", res);
        workers[i].postMessage(chunk);
      });
    });

    const results = await Promise.all(promises);
    return results.flat();
  }

  function terminate() {
    workers.forEach(w => w.terminate());
  }

  // Signal workers to go idle after use
  process.on("exit", () => terminate());

  return { dispatch, terminate };
}
