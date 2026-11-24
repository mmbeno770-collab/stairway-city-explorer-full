import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "www");
const assetsDir = path.join(outDir, "assets");
const htmlPath = path.join(outDir, "index.html");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const html = fs.readFileSync(htmlPath, "utf8");
const match = html.match(/src=["'](?:\.\/|\/)??assets\/([^"']+\.js)["']/);
if (!match) throw new Error("Could not locate the built Vite JavaScript bundle in www/index.html.");
const bundleName = match[1];
const bundlePath = path.join(assetsDir, bundleName);
if (!fs.existsSync(bundlePath)) throw new Error(`Expected source-built Vite bundle not found: ${bundlePath}`);
const bundle = fs.readFileSync(bundlePath);
if (!bundle.length) throw new Error("The generated game bundle is empty.");
if (!html.includes("stairway-controls.js")) throw new Error("Supplemental compatibility script is missing from the built HTML.");
if (!html.includes("https://cecgegnskbhuswlyptus.supabase.co")) throw new Error("Supabase is not in the built Content Security Policy.");
const cssNames = [...html.matchAll(/href=["'](?:\.\/|\/)??assets\/([^"']+\.css)["']/g)].map((item) => item[1]);
if (!cssNames.length || cssNames.some((name) => !fs.existsSync(path.join(assetsDir, name)))) {
  throw new Error("One or more generated CSS assets are missing from the Pages build.");
}
for (const required of ["index.html", "service-worker.js", "stairway-controls.js", "boot.js", "manifest.webmanifest"]) {
  if (!fs.existsSync(path.join(outDir, required))) throw new Error(`Required release file missing: ${required}`);
}
const containsProjectileUpgrade = bundle.includes(Buffer.from("SRE_TankUpgrade"))
  || bundle.includes(Buffer.from("shotSequence"));
if (containsProjectileUpgrade) throw new Error("A restricted tank projectile feature was found in the release bundle.");
console.log(`Verified source-built release bundle ${bundleName} · SHA-256 ${sha256(bundle.toString("utf8"))}`);
console.log("Safe source features are included; legacy compiled tank-projectile patches are intentionally excluded.");
