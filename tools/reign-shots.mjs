// E2 (#143) — the reign, walked in a real browser, with the plates it produces.
//
//   cd tools && npm install --no-save playwright-core
//   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 node reign-shots.mjs
//
// The acceptance asks for a Playwright 6-epoch reign (choose, step, verdict) with
// screenshots. It is NOT part of `npm test`, and that is deliberate: the suite runs
// on every push and installing a browser would add minutes and ~300MB to a job that
// already takes fifteen. What jsdom cannot show is LAYOUT — whether the docked card
// actually sits over the plate, whether the verdict table fits its column — so this
// runs on demand and leaves its evidence in docs/reign/.
//
// It is also a real end-to-end check, not only a camera: it fails loudly if the
// reign does not advance, if the card is offered outside the plate, or if the
// verdict never arrives.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, "docs", "reign");
const EXE = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const HASH = process.argv.includes("--hash")
  ? process.argv[process.argv.indexOf("--hash") + 1]
  : "#seed=e2-11&regions=24&ep=6";

mkdirSync(OUT, { recursive: true });
let failures = 0;
const ok = (m) => console.log("  ok  " + m);
const fail = (m) => { failures++; console.log("FAIL  " + m); };

// JPEG, not PNG: these are evidence, not plates to print. Lossless shots of a
// 1400px map run ~850KB each, which would make four screenshots the largest thing
// in a repository whose biggest tracked file is the 1MB bundle — and they are
// regenerated whenever the surface changes, so every regeneration would carry that
// weight into history again.
const shot = (name) => page.screenshot({ path: join(OUT, name + ".jpg"), type: "jpeg", quality: 82 });

const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
await page.goto(pathToFileURL(join(ROOT, "index.html")).href + HASH);
await page.waitForSelector("#stage svg", { timeout: 20000 });
await page.waitForTimeout(600);
await shot("01-the-world");

// the seat lives in the compose drawer
// the compose drawer is open at boot on a wide viewport; clicking the tab would
// CLOSE it. Open it only if it is shut.
if (!(await page.evaluate(() => document.querySelector("#drawerControls").classList.contains("open")))) {
  await page.click("#tabControls");
  await page.waitForTimeout(350);
}
// THE REIGN is the last section in a 2230px stack inside a ~900px drawer, and the
// drawer head is sticky:
// centre the control in its scroller or the header eats the click. (jsdom never
// sees this, which is exactly the class of thing this script exists to catch.)
await page.$eval("#reignTake", (el) => el.scrollIntoView({ block: "center" }));
await page.waitForTimeout(250);
await page.click("#reignTake");
await page.waitForTimeout(350);
if (await page.isVisible("#dilemmaCard")) ok("the card opens over the plate when the seat is taken");
else fail("no card after taking the seat");
await shot("02-a-decision-stands");

// the card must sit INSIDE the plate: a docked panel that overflows its own
// section is a panel nobody can read on a laptop, and jsdom cannot see it
{
  const card = await page.locator("#dilemmaCard").boundingBox();
  const plate = await page.locator("#plate").boundingBox();
  if (card && plate && card.x >= plate.x - 1 && card.y >= plate.y - 1 &&
      card.x + card.width <= plate.x + plate.width + 1 &&
      card.y + card.height <= plate.y + plate.height + 1)
    ok(`the card is docked inside the plate (${Math.round(card.width)}x${Math.round(card.height)} within ${Math.round(plate.width)}x${Math.round(plate.height)})`);
  else fail(`the card escapes the plate: card ${JSON.stringify(card)} plate ${JSON.stringify(plate)}`);
}

const years = [];
let n = 0;
while (await page.isVisible("#dilemmaCard") && n < 12) {
  const year = (await page.textContent("#dcYear")) || "";
  const kind = (await page.textContent("#dcKind")) || "";
  years.push(`${year.trim()} · ${kind.trim()}`);
  const roads = page.locator("#dcOptions button");
  const count = await roads.count();
  if (count < 2) { fail(`a card offered ${count} road(s)`); break; }
  // take the last road every time: the seat that always resists
  await roads.nth(count - 1).click();
  await page.waitForTimeout(320);
  n++;
  if (n === 1) await shot("03-after-the-first-decree");
}
if (n >= 1) ok(`the reign advanced through ${n} decision(s): ${years.join(" | ")}`);
else fail("the reign never advanced");

await page.waitForTimeout(400);
if (await page.isVisible("#reignVerdict")) ok("the verdict arrives when the last card is answered");
else fail("no verdict panel at the end of the reign");
await page.locator("#reignVerdict").scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await shot("04-the-verdict");
{
  const judged = ((await page.textContent("#rvJudgment")) || "").trim();
  const table = ((await page.textContent("#rvTable")) || "").replace(/\s+/g, " ").trim();
  if (judged.length > 40) ok(`the judge composed a line (${judged.length} chars): "${judged.slice(0, 90)}…"`);
  else fail(`the judgment is thin: "${judged}"`);
  if (/your reign/.test(table) && /the dice/.test(table)) ok("the verdict table names both histories");
  else fail(`verdict table: ${table.slice(0, 140)}`);
  const hash = new URL(page.url()).hash;
  if (/[?&#]ch=/.test(hash)) ok(`the reign rides the link: ${decodeURIComponent((hash.match(/ch=([^&]*)/) || [])[1] || "")}`);
  else fail(`no ch= in the hash after a reign: ${hash}`);
}

await browser.close();
console.log(`\nplates written to docs/reign/`);
console.log(failures === 0 ? "REIGN SHOTS ALL PASS" : `REIGN SHOTS ${failures} FAILURE(S)`);
process.exitCode = failures ? 1 : 0;
