// Sync the Square item catalog into the repo so the app can import it.
//
// Runs in GitHub Actions (see .github/workflows/sync-square.yml) with the
// account's access token in the SQUARE_ACCESS_TOKEN secret — the token never
// leaves the Action; the app only ever sees the generated square-catalog.json
// and downloaded square-photos/ files.
//
// Output:
//   square-catalog.json  { generatedAt, items: [{id, name, category, price, priceMax, photo}] }
//   square-photos/       one image per item that has one

const fs = require("fs");
const path = require("path");

const TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const API = "https://connect.squareup.com/v2";
const SQUARE_VERSION = "2025-01-23";
const ROOT = path.join(__dirname, "..");
const PHOTO_DIR = path.join(ROOT, "square-photos");

if (!TOKEN) {
  console.error("SQUARE_ACCESS_TOKEN is not set. Add it as a repository secret (see README).");
  process.exit(1);
}

async function listCatalog() {
  const objects = [];
  let cursor;
  do {
    const url = new URL(API + "/catalog/list");
    url.searchParams.set("types", "ITEM,CATEGORY,IMAGE");
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url, {
      headers: { Authorization: "Bearer " + TOKEN, "Square-Version": SQUARE_VERSION },
    });
    if (!res.ok) throw new Error("Square API " + res.status + ": " + (await res.text()));
    const data = await res.json();
    objects.push(...(data.objects || []));
    cursor = data.cursor;
  } while (cursor);
  return objects;
}

function extension(url) {
  const m = /\.(jpe?g|png|gif|webp)(?:\?|$)/i.exec(url || "");
  return m ? "." + m[1].toLowerCase() : ".jpg";
}

async function main() {
  const objects = await listCatalog();

  const categories = new Map(); // id -> name
  const images = new Map();     // id -> url
  for (const obj of objects) {
    if (obj.type === "CATEGORY" && obj.category_data) categories.set(obj.id, obj.category_data.name || "Other");
    if (obj.type === "IMAGE" && obj.image_data && obj.image_data.url) images.set(obj.id, obj.image_data.url);
  }

  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  const usedPhotos = new Set();
  const items = [];

  for (const obj of objects) {
    if (obj.type !== "ITEM" || !obj.item_data) continue;
    const d = obj.item_data;

    const prices = (d.variations || [])
      .map((v) => v.item_variation_data && v.item_variation_data.price_money && v.item_variation_data.price_money.amount)
      .filter((a) => typeof a === "number");
    if (!prices.length) { console.log("skip (no fixed price):", d.name); continue; }

    const categoryId = d.reporting_category?.id || d.category_id || (d.categories && d.categories[0] && d.categories[0].id);
    const category = categories.get(categoryId) || "Other";

    let photo = null;
    const imageId = (d.image_ids || []).find((id) => images.has(id));
    if (imageId) {
      const url = images.get(imageId);
      const file = imageId + extension(url);
      const dest = path.join(PHOTO_DIR, file);
      if (!fs.existsSync(dest)) {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error("HTTP " + res.status);
          fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
        } catch (e) {
          console.warn("photo download failed for", d.name, "-", e.message);
        }
      }
      if (fs.existsSync(dest)) {
        photo = "square-photos/" + file;
        usedPhotos.add(file);
      }
    }

    items.push({
      id: obj.id,
      name: d.name || "Unnamed item",
      category,
      price: Math.min(...prices) / 100,
      priceMax: Math.max(...prices) / 100,
      photo,
    });
  }

  // Prune photos no longer referenced by any item.
  for (const file of fs.readdirSync(PHOTO_DIR)) {
    if (!usedPhotos.has(file)) fs.unlinkSync(path.join(PHOTO_DIR, file));
  }

  items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  const out = { generatedAt: new Date().toISOString(), items };
  fs.writeFileSync(path.join(ROOT, "square-catalog.json"), JSON.stringify(out, null, 2));
  console.log("Wrote square-catalog.json with " + items.length + " items (" + usedPhotos.size + " photos).");
}

main().catch((e) => { console.error(e); process.exit(1); });
