// Bundle the modular src/ into a single index.html.
// Produces the root index.html artifact: vendor inlined, engine + UI as one IIFE.
// JSDOM tests depend on this file (gen() in lib.mjs reads ../index.html).
//
// Usage: node tools/bundle.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// #173: this bundler slices source on marker strings, so a renamed marker, a
// duplicated header, or an edited comment could silently change what ships.
// Every cut is now guarded: a marker must appear EXACTLY once, each replacement
// must actually fire, and the assembled script must parse before it is written.
function cutOnce(text, marker, what) {
  let count = 0, from = 0, at;
  while ((at = text.indexOf(marker, from)) !== -1) { count++; from = at + marker.length; }
  if (count === 0) throw new Error(`${what}: marker not found: ${JSON.stringify(marker)}`);
  if (count > 1) throw new Error(`${what}: marker appears ${count} times, expected exactly once: ${JSON.stringify(marker)}`);
  return text.indexOf(marker);
}

function replaceOnce(haystack, needle, replacement, what) {
  const parts = haystack.split(needle);
  if (parts.length === 1) throw new Error(`${what}: nothing to replace, tag not found: ${JSON.stringify(needle)}`);
  if (parts.length > 2) throw new Error(`${what}: tag appears ${parts.length - 1} times, expected exactly once: ${JSON.stringify(needle)}`);
  return parts[0] + replacement + parts[1];
}

// Build the bundle in memory and return it. Exported so the suite can verify the
// committed index.html still matches src/ (#173): Pages deploys src/, while the
// JSDOM tests read the bundled index.html, so a stale bundle means the tests and
// the live site are checking different code.
export function buildBundle() {
const html    = readFileSync(resolve(root, "src/index.html"), "utf8");
const engine  = readFileSync(resolve(root, "src/engine/engine.mjs"), "utf8");
const app     = readFileSync(resolve(root, "src/app.mjs"), "utf8");
const vendor  = readFileSync(resolve(root, "src/vendor/d3-delaunay.min.js"), "utf8");

// ---- Extract engine body (between Constants and Public API) ------------------
const engineBody = (() => {
  const start = cutOnce(engine, "    // ---- Constants ", "engine.mjs");
  const end = cutOnce(engine, "// ---- Public API ", "engine.mjs");
  if (end <= start) throw new Error("engine.mjs: Public API marker precedes Constants marker");
  return engine.slice(start, end).trimEnd();
})();

// ---- Extract app body (after imports, before closing) -----------------------
const appBody = (() => {
  // Everything after the import block and const d3, up to end of file
  const D3_MARK = "const d3 = globalThis.d3;";
  const importEnd = cutOnce(app, D3_MARK, "app.mjs");

  // Find next blank line after const d3
  let start = importEnd + D3_MARK.length;
  while (start < app.length && app[start] === '\n') start++;
  if (app[start] === '\r') start++;

  return app.slice(start).trimEnd();
})();

// The engine's exports are stripped by the slice above (everything is one scope
// in the bundle). If an `import`/`export` survived into either body the browser
// would fail on a non-module <script>, so refuse to ship it.
for (const [what, body] of [["engine.mjs", engineBody], ["app.mjs", appBody]]) {
  const stray = body.match(/^\s*(?:import|export)\s/m);
  if (stray) throw new Error(`${what}: module syntax survived into the bundled body ("${stray[0].trim()}"), which cannot run in a classic <script>`);
}

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
bundle = replaceOnce(bundle, vendorTag, `<script>\n${vendor}\n</script>`, "index.html vendor tag");
bundle = replaceOnce(bundle, moduleTag, `<script>\n${combined}\n</script>`, "index.html module tag");

// ---- Verify the assembled script actually parses -----------------------------
// The fixture pin only covers the paths the tests exercise; a syntax error in an
// unexercised branch would otherwise ship a blank page. Parse it here instead.
try {
  new vm.Script(combined, { filename: "index.html (bundled IIFE)" });
} catch (e) {
  throw new Error(`bundled script does not parse: ${e.message}`);
}
if (bundle.includes("</script>\n</script>")) throw new Error("bundle: nested script tags, a replacement went wrong");

  return { bundle, combined };
}

// ---- Write (CLI only) --------------------------------------------------------
// Importing this module builds nothing; only running it writes the artifact.
const isCLI = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCLI) {
  const { bundle, combined } = buildBundle();
  const dest = resolve(root, "index.html");
  writeFileSync(dest, bundle);
  console.log("Bundle written:", dest, `(${(bundle.length / 1024).toFixed(0)} KB)`);
  console.log(`  guards ok: markers unique, tags replaced once, ${(combined.length / 1024).toFixed(0)} KB of script parses`);
}
