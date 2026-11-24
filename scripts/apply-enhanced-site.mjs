import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "www");
const assetsDir = path.join(outDir, "assets");
const htmlPath = path.join(outDir, "index.html");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const html = fs.readFileSync(htmlPath, "utf8");
const match = html.match(/src=["'](?:\.\/|\/)??assets\/([^"']+\.js)["']/);
if (!match) throw new Error("Could not locate the built Vite JavaScript bundle in www/index.html.");
const originalName = match[1];
const originalPath = path.join(assetsDir, originalName);
const upgradedName = "index-STAIRWAY_CITY_LATEST.js";
const upgradedPath = path.join(assetsDir, upgradedName);
if (!fs.existsSync(originalPath)) throw new Error(`Expected Vite bundle not found: ${originalPath}`);
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
const patches = parts.flatMap((part) => part.patches);
if (patches.length !== parts[0].patchCount) throw new Error("Upgrade patch count mismatch.");
const exactBase = sha256(bundle) === baseSha256;
let applied = [];
if (exactBase) {
  applied = patches.map((patch) => ({ patch, position: patch.start }));
  applied.sort((a, b) => b.position - a.position);
  for (const { patch, position } of applied) {
    if (bundle.slice(position, position + patch.old.length) !== patch.old) {
      throw new Error(`Upgrade patch anchor mismatch at offset ${position}.`);
    }
    bundle = bundle.slice(0, position) + patch.replacement + bundle.slice(position + patch.old.length);
  }
  if (sha256(bundle) !== resultSha256) throw new Error("Upgraded bundle hash does not match the uploaded site release.");
} else {
  // Source changes shift Vite offsets. Re-apply only exact, unique string anchors so
  // source edits can coexist with the previously uploaded gameplay improvements.
  const candidates = [];
  for (const patch of patches) {
    const position = bundle.indexOf(patch.old);
    if (position < 0 || bundle.indexOf(patch.old, position + 1) >= 0) continue;
    candidates.push({ patch, position });
  }
  const ordered = candidates.sort((a, b) => b.position - a.position);
  let lowerBoundary = bundle.length;
  for (const candidate of ordered) {
    if (candidate.position + candidate.patch.old.length > lowerBoundary) continue;
    if (bundle.slice(candidate.position, candidate.position + candidate.patch.old.length) !== candidate.patch.old) continue;
    applied.push(candidate);
    lowerBoundary = candidate.position;
  }
  for (const { patch, position } of applied) {
    bundle = bundle.slice(0, position) + patch.replacement + bundle.slice(position + patch.old.length);
  }
  console.log(`Source build changed; safely re-applied ${applied.length}/${patches.length} legacy gameplay updates by unique anchors.`);
}
if (fs.existsSync(upgradedPath)) fs.unlinkSync(upgradedPath);
fs.writeFileSync(upgradedPath, bundle);
fs.unlinkSync(originalPath);
let outputHtml = html;
if (!outputHtml.includes(originalName)) throw new Error("Built HTML does not reference the generated Vite bundle.");
outputHtml = outputHtml.split(originalName).join(upgradedName);
if (!outputHtml.includes("stairway-controls.js")) throw new Error("Supplemental controls script is missing from the built HTML.");
if (!outputHtml.includes("https://cecgegnskbhuswlyptus.supabase.co")) throw new Error("Supabase is not in the built Content Security Policy.");
const cssNames = [...outputHtml.matchAll(/href=["'](?:\.\/|\/)??assets\/([^"']+\.css)["']/g)].map((item) => item[1]);
if (!cssNames.length || cssNames.some((name) => !fs.existsSync(path.join(assetsDir, name)))) {
  throw new Error("One or more generated CSS assets are missing from the Pages build.");
}
fs.writeFileSync(htmlPath, outputHtml);
for (const required of ["index.html", "service-worker.js", "stairway-controls.js", "boot.js", "manifest.webmanifest", `assets/${upgradedName}`]) {
  if (!fs.existsSync(path.join(outDir, required))) throw new Error(`Required release file missing: ${required}`);
}
console.log(`Verified release bundle SHA-256: ${sha256(bundle)}. Gameplay overlay updates applied: ${applied.length}/${patches.length}.`);
