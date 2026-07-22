// Bundle the modular src/ into a single index.html.
// Produces the root index.html artifact: vendor inlined, engine + UI as one IIFE.
// JSDOM tests depend on this file (gen() in lib.mjs reads ../index.html).
//
// Usage: node tools/bundle.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const html    = readFileSync(resolve(root, "src/index.html"), "utf8");
const engine  = readFileSync(resolve(root, "src/engine/engine.mjs"), "utf8");
const app     = readFileSync(resolve(root, "src/app.mjs"), "utf8");
const vendor  = readFileSync(resolve(root, "src/vendor/d3-delaunay.min.js"), "utf8");

// ---- Extract engine body (between Constants and Public API) ------------------
const engineBody = (() => {
  const start = engine.indexOf("    // ---- Constants ");
  const end = engine.lastIndexOf("// ---- Public API ");
  if (start < 0 || end < 0) throw new Error("engine.mjs: cannot find section boundaries");
  return engine.slice(start, end).trimEnd();
})();

// ---- Extract app body (after imports, before closing) -----------------------
const appBody = (() => {
  // Everything after the import block and const d3, up to end of file
  const importEnd = app.indexOf("const d3 = globalThis.d3;");
  if (importEnd < 0) throw new Error("app.mjs: cannot find import end");

  // Find next blank line after const d3
  let start = importEnd + "const d3 = globalThis.d3;".length;
  while (start < app.length && app[start] === '\n') start++;
  if (app[start] === '\r') start++;

  return app.slice(start).trimEnd();
})();

// ---- Combine into a single IIFE ---------------------------------------------
const combined = `(function () {
"use strict";

${engineBody}

${appBody}
})();`;

// ---- Build the final HTML ---------------------------------------------------
const vendorTag = `<script src="./vendor/d3-delaunay.min.js"></script>`;
const moduleTag = `<script type="module" src="./app.mjs"></script>`;

let bundle = html;
bundle = bundle.replace(vendorTag, `<script>\n${vendor}\n</script>`);
bundle = bundle.replace(moduleTag, `<script>\n${combined}\n</script>`);

// ---- Write ------------------------------------------------------------------
const dest = resolve(root, "index.html");
writeFileSync(dest, bundle);
console.log("Bundle written:", dest, `(${(bundle.length / 1024).toFixed(0)} KB)`);
