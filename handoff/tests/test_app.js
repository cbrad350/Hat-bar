// Hat Bar Tally — browser test suite (124 checks).
//
// Portable: no absolute paths. Run it with ./run_tests.sh, which creates the
// Square-sync fixtures, launches this, and always restores the real synced
// catalog afterwards.
//
//   REPO_ROOT   defaults to the parent of this file's directory
//   CHROME_PATH defaults to Playwright's chromium; override if yours differs
//
const { chromium } = require("playwright-core");
const http = require("http");
const fs = require("fs");
const path = require("path");

const SCRATCH = __dirname;
const ROOT = process.env.REPO_ROOT || path.resolve(__dirname, "..", "..");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };

let failures = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log((ok ? "PASS" : "FAIL") + " | " + label + ": " + actual + (ok ? "" : " (expected " + expected + ")"));
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end("nope"); return;
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  res.end(fs.readFileSync(file));
});

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const APP = "http://localhost:" + server.address().port + "/";

  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    // square-commerce-v1:// has no handler in the test browser (no Square app) — expected.
    if (m.type() === "error" && !m.text().includes("404") && !m.text().includes("square-commerce-v1")) errors.push("console: " + m.text());
  });
  page.on("dialog", (d) => d.accept());

  await page.goto(APP);
  await page.waitForTimeout(400);
  check("initial total", await page.textContent("#total-amount"), "$0");
  check("initial label", await page.textContent("#item-count"), "Choose a hat");
  check("hats open by default", await page.locator(".sec.open .sec-title").first().textContent(), "Hats");
  check("charge dimmed at $0", await page.locator("#charge-btn.dim").count(), 1);
  check("step numerals render", await page.locator(".sec-num").count(), 5);
  check("first step numbered 1", await page.locator(".sec-num").first().textContent(), "1");
  await page.screenshot({ path: SCRATCH + "/shot-1-hats.png" });

  // Pick a hat -> selects, collapses, advances to next section
  await page.click('.pick-card:has-text("Classic Collection Hat")');
  await page.waitForTimeout(400);
  check("hat total", await page.textContent("#total-amount"), "$185");
  check("hats status shows pick", (await page.textContent('.sec:has-text("Hats") .sec-status')).includes("Classic Collection Hat"), true);
  check("advanced to next section", await page.locator(".sec.open .sec-title").first().textContent(), "Hat Upgrades");
  check("hats step shows check", await page.locator('.sec:has-text("Hats") .sec-num').textContent(), "✓");
  check("charge undimmed after pick", await page.locator("#charge-btn.dim").count(), 0);
  check("total pulses on change", await page.locator("#total-amount.bump").count(), 1);

  // Open Bands, add Scarf and a variable Luxe Band @ $22
  await page.click('.sec-head:has-text("Bands")');
  await page.waitForTimeout(300);
  check("steppers carry item context", await page.getAttribute('.item-card:has-text("Scarf") [data-inc]', "aria-label"), "Add Scarf");
  await page.click('.item-card:has-text("Scarf") [data-inc]');
  await page.click('.item-card:has-text("Luxe Band") [data-inc]');
  await page.waitForTimeout(200);
  check("stepper sheet says Add", await page.textContent("#sheet-save"), "Add");
  await page.fill("#sheet-price", "");
  await page.click("#sheet-save");
  await page.waitForTimeout(150);
  check("blank price rejected, sheet stays", await page.locator("#sheet-price").count(), 1);
  await page.fill("#sheet-price", "22");
  await page.click("#sheet-save");
  await page.waitForTimeout(200);
  check("after bands (185+15+22)", await page.textContent("#total-amount"), "$222");

  // A second unit of a "$N+" item asks for ITS OWN price (no silent clone)
  await page.click('.item-card:has-text("Luxe Band") [data-inc]');
  await page.waitForTimeout(200);
  check("second variable unit asks price", await page.locator("#sheet-price").count(), 1);
  await page.fill("#sheet-price", "35");
  await page.click("#sheet-save");
  await page.waitForTimeout(200);
  check("mixed unit prices (185+15+22+35)", await page.textContent("#total-amount"), "$257");
  check("one price chip per unit", await page.locator('.item-card:has-text("Luxe Band") [data-editprice]').count(), 2);
  check("summary shows x2", (await page.textContent('.sec:has-text("Bands") .sec-status')).includes("Luxe Band ×2"), true);

  // Adjust ONE unit without touching the other; Escape dismisses the sheet
  await page.click('.item-card:has-text("Luxe Band") [data-editprice][data-unit="1"]');
  await page.waitForTimeout(150);
  check("adjust sheet says Save", await page.textContent("#sheet-save"), "Save");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  check("escape closes sheet", await page.locator("#sheet-price").count(), 0);
  await page.click('.item-card:has-text("Luxe Band") [data-editprice][data-unit="1"]');
  await page.waitForTimeout(150);
  await page.fill("#sheet-price", "30");
  await page.click("#sheet-save");
  await page.waitForTimeout(200);
  check("second unit repriced (185+15+22+30)", await page.textContent("#total-amount"), "$252");
  check("first unit untouched", await page.textContent('.item-card:has-text("Luxe Band") [data-editprice][data-unit="0"]'), "$22");

  // Decimal-comma entry can't 100x the price: "15,50" is $15.50
  await page.click('.item-card:has-text("Luxe Band") [data-editprice][data-unit="0"]');
  await page.waitForTimeout(150);
  await page.fill("#sheet-price", "15,50");
  await page.click("#sheet-save");
  await page.waitForTimeout(200);
  check("comma reads as decimal (185+15+15.50+30)", await page.textContent("#total-amount"), "$245.50");

  // Restore: unit 0 back to $22, then "−" removes the last-added unit
  await page.click('.item-card:has-text("Luxe Band") [data-editprice][data-unit="0"]');
  await page.waitForTimeout(150);
  await page.fill("#sheet-price", "22");
  await page.click("#sheet-save");
  await page.waitForTimeout(200);
  await page.click('.item-card:has-text("Luxe Band") [data-dec]');
  await page.waitForTimeout(200);
  check("minus removes last-added unit", await page.textContent("#total-amount"), "$222");

  // "Next" is labeled with the destination and advances Bands -> Feathers
  check("next names the next section", (await page.textContent("[data-next]")).includes("Next: Feathers"), true);
  await page.click("[data-next]");
  await page.waitForTimeout(300);
  check("next advances to Feathers", await page.locator(".sec.open .sec-title").first().textContent(), "Feathers");
  check("bands summary lists items", (await page.textContent('.sec:has-text("Bands") .sec-status')).includes("Scarf, Luxe Band · +$37"), true);
  await page.screenshot({ path: SCRATCH + "/shot-2-flow.png" });

  // Last section's button reads as a finish, not another "next"
  await page.click('.sec-head:has-text("Details")');
  await page.waitForTimeout(300);
  check("last section shows done label", (await page.textContent("[data-next]")).includes("Done"), true);

  // Define a discount code in Edit Menu (FRIENDS -> 10%)
  await page.click("#mode-btn");
  await page.waitForTimeout(300);
  await page.click("#add-discount");
  await page.waitForTimeout(200);
  const codeInput = page.locator("[data-dcode]").last();
  await codeInput.fill("FRIENDS");
  await page.click("#mode-btn");
  await page.waitForTimeout(300);

  // Apply it at the register
  await page.fill("#discount-input", "friends");
  await page.click("#discount-apply");
  await page.waitForTimeout(200);
  check("discount applied (222 - 22.20)", await page.textContent("#total-amount"), "$199.80");
  await page.click("#receipt-toggle");
  await page.waitForTimeout(400);
  check("toggle labeled open", await page.getAttribute("#receipt-toggle", "aria-label"), "Hide itemized list");
  check("toggle aria-expanded", await page.getAttribute("#receipt-toggle", "aria-expanded"), "true");
  const receipt = (await page.textContent("#receipt")).replace(/\s+/g, " ").trim();
  check("receipt shows discount", receipt.includes("Discount (FRIENDS)") && receipt.includes("−$22.20"), true);
  check("receipt shows includes", receipt.includes("Hat includes"), true);
  await page.screenshot({ path: SCRATCH + "/shot-3-receipt.png" });

  // Tapping a receipt line jumps back to its section (one-tap correction)
  check("receipt lines are tappable", await page.locator("#receipt [data-goto]").count(), 3);
  await page.click('#receipt [data-goto]:has-text("Classic Collection Hat")');
  await page.waitForTimeout(400);
  check("receipt line jumps to section", await page.locator(".sec.open .sec-title").first().textContent(), "Hats");
  check("receipt closes after jump", await page.locator(".total-bar.open").count(), 0);

  // Bad code rejected
  await page.click("#discount-remove");
  await page.waitForTimeout(200);
  await page.fill("#discount-input", "NOPE");
  await page.click("#discount-apply");
  await page.waitForTimeout(200);
  check("bad code keeps total", await page.textContent("#total-amount"), "$222");
  await page.fill("#discount-input", "FRIENDS");
  await page.click("#discount-apply");
  await page.waitForTimeout(200);

  // Charge URL uses discounted total
  await page.click("#mode-btn");
  await page.waitForTimeout(200);
  await page.fill("#square-app-id", "sq0idp-TESTAPP123");
  await page.click("#mode-btn");
  await page.waitForTimeout(200);
  // Credentials that Square will certainly reject are named before the screen
  // flips, instead of surfacing as its generic "application ID was invalid".
  const idCases = await page.evaluate(() => ({
    token: diagnoseAppId("EAAAlxUo1Ust7vKrGRPvSaGJZ0YZmpZlmnop"),
    sandbox: diagnoseAppId("sandbox-sq0idb-abc123"),
    odd: diagnoseAppId("some-other-thing"),
    good: diagnoseAppId("sq0idp-TESTAPP123"),
  }));
  check("access token diagnosed", idCases.token.block && /Access Token/.test(idCases.token.msg), true);
  check("sandbox id diagnosed", idCases.sandbox.block && /Sandbox/.test(idCases.sandbox.msg), true);
  check("unknown shape warns but never blocks", idCases.odd.block, false);
  check("production id accepted", idCases.good, null);
  const url = await page.evaluate(() => { const b = computeBill(); return buildSquareUrl(Math.round(b.total * 100), "note"); });
  const data = JSON.parse(decodeURIComponent(url.split("?data=")[1]));
  check("square amount uses discount", data.amount_money.amount, 19980);
  check("square client id", data.client_id, "sq0idp-TESTAPP123");

  // Logo shows in header
  await page.evaluate(() => {
    const c = document.createElement("canvas"); c.width = 120; c.height = 40;
    const x = c.getContext("2d"); x.fillStyle = "#7C4425"; x.fillRect(0, 0, 120, 40);
    catalog.logo = c.toDataURL("image/png"); saveCatalog(); renderHeader();
  });
  check("logo renders", await page.locator("#masthead img.logo-img").count(), 1);

  // Import from the synced Square fixture (with the service worker active,
  // so imported photos land in the offline cache via the pre-warm)
  const swState = await page.evaluate(() => Promise.race([
    navigator.serviceWorker.ready.then(() => "ready"),
    new Promise((r) => setTimeout(() => r("timeout"), 8000)),
  ]));
  check("service worker ready", swState, "ready");
  // The page must be served network-first: a cache-first worker pinned the
  // phone to the first build ever deployed and no fix could reach it.
  const swBehaviour = await page.evaluate(async () => {
    const res = await fetch(location.pathname, { cache: "no-store" });
    const html = await res.text();
    return { servesPage: html.includes("Hat Bar Tally"), fresh: html.includes("APP_BUILD") };
  });
  check("page still served through the worker", swBehaviour.servesPage, true);
  check("worker serves the current build, not a pinned copy", swBehaviour.fresh, true);
  check("build stamp is visible for support", await page.evaluate(() => typeof APP_BUILD === "string" && APP_BUILD.length > 0), true);

  // --- Backup round-trip: everything Square can't rebuild must come back ---
  const backup = await page.evaluate(() => {
    // Stand up the irreplaceable settings, capture a backup, then wipe.
    const band = allItems().find((i) => i.name === "Signature Band");
    band.variable = true;
    band.photo = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    catalog.shopName = "Details Austin";
    catalog.logo = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    catalog.squareAppId = "sq0idp-BACKUPTEST";
    catalog.discounts = [{ id: uid(), code: "FRIENDS", type: "percent", value: 10 }];
    catalog.includes = [{ id: uid(), name: "Signature Bands", qty: 3, itemIds: [band.id] }];
    saveCatalog();
    const payload = { format: "hatbar-settings", version: 1, exportedAt: "2026-08-10T00:00:00.000Z", catalog: JSON.parse(JSON.stringify(catalog)) };
    // Now lose everything, the way a new phone would start.
    catalog = defaultCatalog();
    saveCatalog();
    renderHeader();
    return JSON.stringify(payload);
  });
  check("wipe really cleared the settings", await page.evaluate(() => catalog.squareAppId), "");

  await page.evaluate((json) => {
    const file = new File([json], "backup.json", { type: "application/json" });
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.getElementById("restore-input");
    input.files = dt.files;
    input.dispatchEvent(new Event("change"));
  }, backup);
  await page.waitForTimeout(500);
  const restored = await page.evaluate(() => {
    const band = allItems().find((i) => i.name === "Signature Band");
    return {
      appId: catalog.squareAppId,
      shop: catalog.shopName,
      logo: String(catalog.logo || "").startsWith("data:"),
      code: (catalog.discounts[0] || {}).code,
      allowanceLinked: (catalog.includes[0] || {}).itemIds.includes(band.id),
      variableFlag: band.variable,
      manualPhoto: String(band.photo || "").startsWith("data:"),
    };
  });
  check("restore brings back the Square app id", restored.appId, "sq0idp-BACKUPTEST");
  check("restore brings back the shop name", restored.shop, "Details Austin");
  check("restore brings back the logo", restored.logo, true);
  check("restore brings back discount codes", restored.code, "FRIENDS");
  check("restore brings back allowance links", restored.allowanceLinked, true);
  check("restore brings back the + flags", restored.variableFlag, true);
  check("restore brings back camera-roll photos", restored.manualPhoto, true);

  // A file that isn't ours must be refused, not half-applied
  await page.evaluate(() => {
    const file = new File(['{"hello":"world"}'], "notes.json", { type: "application/json" });
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.getElementById("restore-input");
    input.files = dt.files;
    input.dispatchEvent(new Event("change"));
  });
  await page.waitForTimeout(400);
  check("foreign file refused", (await page.textContent("#toast-msg")).includes("isn't a Hat Bar backup"), true);
  check("foreign file left settings intact", await page.evaluate(() => catalog.squareAppId), "sq0idp-BACKUPTEST");
  await page.click("#mode-btn");
  await page.waitForTimeout(300);
  await page.click("#import-square");
  await page.waitForTimeout(500);
  await page.click("#mode-btn"); // Done -> tally
  await page.waitForTimeout(400);
  await page.screenshot({ path: SCRATCH + "/shot-4-imported.png" });
  // Names must be exact: category prefix, "+ Basic ... Package", trailing
  // "Copy", and doubled spaces are all stripped for the customer-facing menu.
  // "HAT: AHM  Wool Cattleman - Black + Basic Customization Package" must land
  // as an exact match: prefix, suffix, and the doubled space all handled.
  check("hat name fully cleaned", await page.locator('.pick-card .pick-label:text-is("AHM Wool Cattleman - Black")').count(), 1);
  check("Copy tail stripped exactly", await page.locator('.pick-card .pick-label:text-is("Austrian Wool Rancher - Stone")').count(), 1);
  check("no package suffix leaks through", await page.locator('.pick-card:has-text("Basic")').count(), 0);
  check("no Copy suffix leaks through", await page.locator('.pick-card:has-text("Copy")').count(), 0);
  check("imported hat present (prefix stripped)", await page.locator('.pick-card:has-text("Austrian Wool Rancher - Stone")').count(), 1);
  check("imported hat photo", (await page.locator('.pick-card:has-text("Austrian Wool Rancher - Stone") img').getAttribute("src")).includes("square-photos/hat1.jpg"), true);
  check("upgrade split out of hats", await page.locator('.sec:has-text("Hat Upgrades")').count(), 1);
  check("upgrade not a hat option", await page.locator('.pick-card:has-text("Premium Hat Upgrade")').count(), 0);
  // Hats show as a photo grid split by price, cheaper tier first, so the
  // $225 styles aren't buried below sixteen $185 ones.
  const tiers = await page.locator(".tier-head").allTextContents();
  check("hat tiers grouped by price", tiers.map((t) => t.replace(/\s+/g, " ").trim()).join(" | "), "$1851 style | $2251 style");
  check("hats render as photo cards", await page.locator(".pick-grid .pick-card").count(), 2);

  // --- Re-import must MERGE, not replace ---------------------------------
  // Set up the three things the owner customizes by hand, plus a hand-made
  // item that Square has never heard of, then re-import and require all four
  // to survive while Square's own price change still lands.
  await page.evaluate(() => {
    const band = allItems().find((i) => i.name === "Signature Band");
    band.variable = true;                       // her "$N+" flag
    band.photo = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";  // camera-roll photo
    band.price = 999;                           // stale price Square should correct
    const sec = catalog.sections.find((x) => x.items.includes(band));
    sec.items.push({ id: uid(), name: "Hand-made Extra", price: 7, variable: false, note: "", photo: null });
    saveCatalog();
  });
  await page.click("#mode-btn"); // into Edit Menu, where Import lives
  await page.waitForTimeout(300);
  await page.click("#import-square");
  await page.waitForTimeout(600);
  const merged = await page.evaluate(() => {
    const band = allItems().find((i) => i.name === "Signature Band");
    return {
      variable: band.variable,
      photoKept: String(band.photo).startsWith("data:"),
      price: band.price,
      handMadeSurvived: allItems().filter((i) => i.name === "Hand-made Extra").length,
      bandCount: allItems().filter((i) => i.name === "Signature Band").length,
      total: allItems().length,
    };
  });
  check("re-import keeps the + flag", merged.variable, true);
  check("re-import keeps camera-roll photo", merged.photoKept, true);
  check("re-import refreshes price from Square", merged.price, 3);
  check("re-import keeps hand-made item", merged.handMadeSurvived, 1);
  check("re-import does not duplicate items", merged.bandCount, 1);
  check("re-import item count stable (8 Square + 1 hand-made)", merged.total, 9);
  await page.click("#mode-btn"); // back to tally

  // --- Allowance: the hat's included items must ring up at $0 -------------
  // 3 free "Signature Band"s, then list price. Mirrors the real rule: no
  // deducts for skipping, only upcharges past what the hat already covers.
  await page.evaluate(() => {
    const band = allItems().find((i) => i.name === "Signature Band");
    band.variable = false;   // the merge test flagged it "$N+"; allowance test wants a flat price
    band.photo = null;
    catalog.includes = [{ id: uid(), name: "Signature Bands", qty: 3, itemIds: [band.id] }];
    saveCatalog();
    tally = { selections: {}, items: {}, discountCode: "" };
    save(TALLY_KEY, tally);
    render();
  });
  await page.waitForTimeout(300);
  await page.click('.pick-card:has-text("Austrian Wool Rancher - Stone")');
  await page.waitForTimeout(400);
  await page.click('.sec-head:has-text("Bands")');
  await page.waitForTimeout(300);
  const bandPlus = page.locator('.item-card:has(.item-name:text-is("Signature Band")) [data-inc]');
  await bandPlus.click();
  await page.waitForTimeout(200);
  check("1st included band is free", await page.textContent("#total-amount"), "$185");
  check("allowance chip counts up", (await page.textContent('.item-card:has(.item-name:text-is("Signature Band")) .allow-chip')).trim(), "1 of 3 Signature Bands");
  await bandPlus.click();
  await bandPlus.click();
  await page.waitForTimeout(250);
  check("3 included bands still free", await page.textContent("#total-amount"), "$185");
  check("allowance shows exhausted", (await page.textContent('.item-card:has(.item-name:text-is("Signature Band")) .allow-chip')).trim(), "3 of 3 Signature Bands");
  await bandPlus.click();
  await page.waitForTimeout(250);
  check("4th band charges list price", await page.textContent("#total-amount"), "$188");
  await bandPlus.click();
  await page.waitForTimeout(250);
  check("5th band charges again", await page.textContent("#total-amount"), "$191");

  // A non-allowance item in the same section is never free
  await page.click('.item-card:has(.item-name:text-is("Scarf")) [data-inc]');
  await page.waitForTimeout(250);
  check("unlinked item charges immediately", await page.textContent("#total-amount"), "$206");

  // The receipt shows the free units as their own "Included" line
  await page.click("#receipt-toggle");
  await page.waitForTimeout(400);
  const allowReceipt = (await page.textContent("#receipt")).replace(/\s+/g, " ");
  check("receipt lists included units", allowReceipt.includes("Signature Band ×3Included"), true);
  check("receipt lists paid units separately", allowReceipt.includes("Signature Band ×2$6"), true);
  await page.click("#receipt-toggle");
  await page.waitForTimeout(300);
  await page.screenshot({ path: SCRATCH + "/shot-6-allowance.png" });

  // Removing units returns them to the allowance
  const bandMinus = page.locator('.item-card:has(.item-name:text-is("Signature Band")) [data-dec]');
  await bandMinus.click(); await bandMinus.click();
  await page.waitForTimeout(250);
  check("removing units frees the allowance again", await page.textContent("#total-amount"), "$200");
  // The collapsed section summary must price the allowance the same way the
  // bill does — a free unit can't reappear as a charge in the header.
  const bandsSummary = await page.textContent('.sec:has-text("Bands") .sec-status');
  check("section summary excludes free units", bandsSummary.includes("+$15"), true);

  // --- Trade-up credit: unused included bands pay toward better bands ------
  // Only when they're actually buying an upgrade in that same category, capped
  // at what they spend there, and never money back.
  await page.evaluate(() => {
    const band = allItems().find((i) => i.name === "Signature Band");
    const scarf = allItems().find((i) => i.name === "Scarf");
    band.price = 3; band.variable = false;
    scarf.price = 15; scarf.variable = false;
    catalog.includes = [{ id: uid(), name: "Signature Bands", qty: 3, itemIds: [band.id], credits: true }];
    saveCatalog();
    tally = { selections: {}, items: {}, discountCode: "" };
    save(TALLY_KEY, tally);
    expandedId = catalog.sections[0].id;   // Hats, so the pick grid is on screen
    render();
  });
  await page.waitForTimeout(300);
  await page.click('.pick-card:has-text("Austrian Wool Rancher - Stone")');
  await page.waitForTimeout(400);
  await page.click('.sec-head:has-text("Bands")');
  await page.waitForTimeout(300);

  // Skipping the included bands alone earns nothing — the no-deducts rule.
  check("no credit without an upgrade", await page.textContent("#total-amount"), "$185");

  // 0 of 3 used + one $15 Scarf -> $9 credit -> $6. His worked example.
  const scarfPlus = page.locator('.item-card:has(.item-name:text-is("Scarf")) [data-inc]');
  await scarfPlus.click();
  await page.waitForTimeout(300);
  check("all 3 unused credits $9 against a $15 band", await page.textContent("#total-amount"), "$191");

  // Take one signature band: only 2 unused now, so credit drops to $6.
  const tradeBandPlus = page.locator('.item-card:has(.item-name:text-is("Signature Band")) [data-inc]');
  await tradeBandPlus.click();
  await page.waitForTimeout(300);
  check("using one band lowers the credit to $6", await page.textContent("#total-amount"), "$194");

  // Receipt names the credit rather than silently shrinking a line
  await page.click("#receipt-toggle");
  await page.waitForTimeout(400);
  const creditReceipt = (await page.textContent("#receipt")).replace(/\s+/g, " ");
  check("receipt names the credit", creditReceipt.includes("2 unused Signature Bands"), true);
  check("receipt shows it as a credit", creditReceipt.includes("−$6"), true);
  check("scarf still listed at full price", creditReceipt.includes("Scarf$15"), true);
  await page.click("#receipt-toggle");
  await page.waitForTimeout(300);
  await page.screenshot({ path: SCRATCH + "/shot-9-credit.png" });

  // Credit can zero an item but never pays out: $9 pool vs a $3 purchase
  await page.evaluate(() => {
    tally = { selections: tally.selections, items: {}, discountCode: "" };
    save(TALLY_KEY, tally);
    const cord = allItems().find((i) => i.name === "Leather Cord");
    if (cord) { cord.price = 2; saveCatalog(); }
    render();
  });
  await page.waitForTimeout(300);
  await page.click('.sec-head:has-text("Bands")');
  await page.waitForTimeout(300);
  const cordPlus = page.locator('.item-card:has(.item-name:text-is("Leather Cord")) [data-inc]');
  if (await cordPlus.count()) {
    await cordPlus.click();
    await page.waitForTimeout(300);
    check("credit caps at what was spent, never negative", await page.textContent("#total-amount"), "$185");
  }

  // Credit must not leak into another category
  await page.evaluate(() => {
    tally = { selections: tally.selections, items: {}, discountCode: "" };
    save(TALLY_KEY, tally);
    render();
  });
  await page.waitForTimeout(300);
  await page.click('.sec-head:has-text("Feathers")');
  await page.waitForTimeout(300);
  await page.click('.item-card:has(.item-name:text-is("Luxe Feathers")) [data-inc]');
  await page.waitForTimeout(300);
  check("band credit does not pay for feathers", await page.textContent("#total-amount"), "$191");

  // Put the catalog back the way the later tests expect it: allowance still
  // linked, but not crediting, and prices restored.
  await page.evaluate(() => {
    const band = allItems().find((i) => i.name === "Signature Band");
    const cord = allItems().find((i) => i.name === "Leather Cord");
    if (cord) cord.price = 8;
    catalog.includes = [{ id: uid(), name: "Signature Bands", qty: 3, itemIds: [band.id] }];
    saveCatalog();
    newHat(true);
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => { newHat(true); });
  await page.waitForTimeout(300);

  // Import pre-warms every synced photo into the versioned cache (offline-ready)
  let photoCached = false;
  try {
    await page.waitForFunction(async () => !!(await caches.match("square-photos/hat1.jpg", { ignoreSearch: true })), null, { timeout: 8000 });
    photoCached = true;
  } catch (e) {}
  check("imported photos runtime-cached", photoCached, true);

  // Pick imported hat, verify persistence, then Square callback clears
  await page.click('.pick-card:has-text("AHM Wool Cattleman - Black")');
  await page.waitForTimeout(300);
  check("imported hat price", await page.textContent("#total-amount"), "$225");
  await page.reload();
  await page.waitForTimeout(400);
  check("persists after reload", await page.textContent("#total-amount"), "$225");
  check("logo persists", await page.locator("#masthead img.logo-img").count(), 1);

  await page.goto(APP + '?data=%7B%22status%22%3A%22ok%22%7D');
  await page.waitForTimeout(400);
  check("callback clears", await page.textContent("#total-amount"), "$0");

  // New Hat + Undo round trip
  await page.click('.pick-card:has-text("Austrian Wool Rancher - Stone")');
  await page.waitForTimeout(300);
  await page.click("#new-hat-btn");
  await page.waitForTimeout(200);
  check("new hat", await page.textContent("#total-amount"), "$0");
  await page.click("#toast-undo");
  await page.waitForTimeout(200);
  check("undo", await page.textContent("#total-amount"), "$185");

  // A mis-tapped New Hat is still undoable well past the old 4.5s window...
  await page.click("#new-hat-btn");
  await page.waitForTimeout(5200);
  check("undo still available after 5s", await page.locator("#toast.show #toast-undo:not([hidden])").count(), 1);
  await page.click("#toast-undo");
  await page.waitForTimeout(200);
  check("late undo restores", await page.textContent("#total-amount"), "$185");
  // ...but starting the next hat retires the stale Undo (can't revert new work)
  await page.click("#new-hat-btn");
  await page.waitForTimeout(200);
  await page.click('.pick-card:has-text("Austrian Wool Rancher - Stone")');
  await page.waitForTimeout(300);
  check("tally change dismisses undo toast", await page.locator("#toast.show").count(), 0);
  check("hat picked after dismiss", await page.textContent("#total-amount"), "$185");

  // Storage failure: screen and bill must not diverge, and the owner is told
  await page.evaluate(() => {
    const proto = Object.getPrototypeOf(localStorage);
    window.__origSetItem = proto.setItem;
    proto.setItem = function () { throw new DOMException("quota", "QuotaExceededError"); };
  });
  await page.click('.sec-head:has-text("Bands")');
  await page.waitForTimeout(300);
  await page.click('.item-card:has-text("Scarf") [data-inc]');
  await page.waitForTimeout(300);
  check("render survives save failure", await page.textContent("#total-amount"), "$200");
  check("save failure surfaces toast", (await page.textContent("#toast-msg")).includes("Couldn't save"), true);
  await page.evaluate(() => { Object.getPrototypeOf(localStorage).setItem = window.__origSetItem; });
  await page.click('.item-card:has-text("Scarf") [data-inc]');
  await page.waitForTimeout(200);
  check("recovers after storage returns", await page.textContent("#total-amount"), "$215");

  // Full comp: Charge explains the $0 total instead of the generic message
  await page.evaluate(() => { catalog.discounts.push({ id: "comp-test", code: "COMP", type: "percent", value: 100 }); saveCatalog(); });
  await page.fill("#discount-input", "COMP");
  await page.click("#discount-apply");
  await page.waitForTimeout(200);
  check("comp zeroes total", await page.textContent("#total-amount"), "$0");
  await page.click("#charge-btn");
  await page.waitForTimeout(200);
  check("comp charge explains the $0", (await page.textContent("#toast-msg")).includes("Total is $0 after COMP"), true);
  await page.click("#discount-remove");
  await page.waitForTimeout(200);

  // Charge hand-off guard: pending flag, no double-launch, ask on return
  check("pre-charge total", await page.textContent("#total-amount"), "$215");
  await page.click("#charge-btn");
  await page.waitForTimeout(400);
  check("charge records pending hand-off", await page.evaluate(() => (JSON.parse(localStorage.getItem("hatbar-tally-v3")).pendingCharge || {}).total), 215);
  check("tally intact after hand-off", await page.textContent("#total-amount"), "$215");
  // NOTE: after the (expected) failed square-commerce-v1:// launch, headless
  // Chromium stops delivering trusted input (stuck provisional navigation — a
  // test-env quirk; on the iPhone the app-switch really happens), so the steps
  // until the next reload drive the app via element.click() in evaluate.
  await page.evaluate(() => document.getElementById("charge-btn").click()); // re-tap must confirm, not re-launch Square
  await page.waitForTimeout(200);
  check("re-tap opens confirm not relaunch", await page.locator("#pending-paid").count(), 1);
  check("confirm shows the amount", (await page.textContent("#modal-root h3")).includes("$215"), true);
  await page.evaluate(() => document.getElementById("pending-keep").click());
  await page.waitForTimeout(200);
  check("keep-tally keeps the build", await page.textContent("#total-amount"), "$215");
  check("keep-tally clears pending", await page.evaluate(() => JSON.parse(localStorage.getItem("hatbar-tally-v3")).pendingCharge === undefined), true);
  // Relaunching the app with a hand-off outstanding asks on startup
  await page.evaluate(() => document.getElementById("charge-btn").click());
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForTimeout(500);
  check("relaunch asks about payment", await page.locator("#pending-paid").count(), 1);
  await page.evaluate(() => document.getElementById("pending-keep").click());
  await page.waitForTimeout(200);
  // Returning to the foreground with a hand-off outstanding asks too
  await page.evaluate(() => { tally.pendingCharge = { total: 215, at: Date.now() }; save(TALLY_KEY, tally); });
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await page.waitForTimeout(200);
  check("return-to-app asks about payment", await page.locator("#pending-paid").count(), 1);
  await page.evaluate(() => document.getElementById("pending-paid").click());
  await page.waitForTimeout(300);
  check("paid clears for next customer", await page.textContent("#total-amount"), "$0");

  // A CACHE_VERSION bump must carry synced Square data into the new cache
  const carry = await page.evaluate(async () => {
    const old = await caches.open("hatbar-v0-test");
    await old.put(new Request("square-photos/legacy-test.jpg"), new Response("legacy", { headers: { "Content-Type": "image/jpeg" } }));
    await navigator.serviceWorker.register("sw.js?bump=test"); // byte-different URL -> install+activate again
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline && (await caches.has("hatbar-v0-test"))) {
      await new Promise((r) => setTimeout(r, 200));
    }
    return {
      oldGone: !(await caches.has("hatbar-v0-test")),
      carried: !!(await caches.match("square-photos/legacy-test.jpg")),
    };
  });
  check("update deletes retired cache", carry.oldGone, true);
  check("update carries square data forward", carry.carried, true);

  console.log(errors.length ? "JS ERRORS:\n" + errors.join("\n") : "NO JS ERRORS");
  console.log(failures ? failures + " FAILURES" : "ALL CHECKS PASSED");
  await browser.close();
  server.close();
  process.exit(failures || errors.length ? 1 : 0);
})();
