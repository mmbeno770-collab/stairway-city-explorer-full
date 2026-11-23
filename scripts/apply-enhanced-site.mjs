import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "www");
const assetsDir = path.join(outDir, "assets");
const originalName = "index-B0c8XccV.js";
const upgradedName = "index-STAIRWAY_UPGRADED_44ddfff.js";
const originalPath = path.join(assetsDir, originalName);
const upgradedPath = path.join(assetsDir, upgradedName);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

if (!fs.existsSync(originalPath)) throw new Error(`Expected original Vite bundle not found: ${originalPath}`);
let bundle = fs.readFileSync(originalPath, "utf8");
const parts = [1, 2].map((n) => {
  const encoded = fs.readFileSync(path.join(root, `scripts/patches/upgrade-part-${n}.json.gz.b64`), "utf8").trim();
  return JSON.parse(gunzipSync(Buffer.from(encoded, "base64")).toString("utf8"));
});
const baseSha256 = parts[0].baseSha256;
const resultSha256 = parts[0].resultSha256;
if (parts.some((part) => part.baseSha256 !== baseSha256 || part.resultSha256 !== resultSha256)) {
  throw new Error("Upgrade patch metadata does not match across patch files.");
}
if (sha256(bundle) !== baseSha256) {
  throw new Error(`Unexpected Vite bundle hash. Expected ${baseSha256}, got ${sha256(bundle)}. Refusing to patch a different build.`);
}
const patches = parts.flatMap((part) => part.patches).sort((a, b) => b.start - a.start);
if (patches.length !== parts[0].patchCount) throw new Error("Upgrade patch count mismatch.");
for (const patch of patches) {
  const actual = bundle.slice(patch.start, patch.start + patch.old.length);
  if (actual !== patch.old) throw new Error(`Upgrade patch anchor mismatch at offset ${patch.start}.`);
  bundle = bundle.slice(0, patch.start) + patch.replacement + bundle.slice(patch.start + patch.old.length);
}
if (sha256(bundle) !== resultSha256) throw new Error("Upgraded bundle hash does not match the supplied release.");
fs.writeFileSync(upgradedPath, bundle);
fs.unlinkSync(originalPath);

const htmlPath = path.join(outDir, "index.html");
let html = fs.readFileSync(htmlPath, "utf8");
if (!html.includes(originalName)) throw new Error("Could not locate the original bundle reference in www/index.html.");
html = html.replace(originalName, upgradedName);
if (!html.includes("stairway-controls.js")) throw new Error("Supplemental controls script is missing from the built HTML.");
if (!html.includes("https://cecgegnskbhuswlyptus.supabase.co")) throw new Error("Supabase is not in the built Content Security Policy.");
fs.writeFileSync(htmlPath, html);
for (const required of ["index.html", "service-worker.js", "stairway-controls.js", "boot.js", "manifest.webmanifest", `assets/${upgradedName}`, "assets/index-lIwe_DA3.css"]) {
  if (!fs.existsSync(path.join(outDir, required))) throw new Error(`Required release file missing: ${required}`);
}
console.log(`Applied ${patches.length} verified gameplay upgrades. Bundle SHA-256: ${resultSha256}`);
