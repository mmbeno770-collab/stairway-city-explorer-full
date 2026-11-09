import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const iconSvg = await readFile("assets/icon.svg");
const splashSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b1720"/><stop offset="1" stop-color="#1d4653"/></linearGradient><radialGradient id="glow"><stop stop-color="#d7b777" stop-opacity=".25"/><stop offset="1" stop-color="#d7b777" stop-opacity="0"/></radialGradient></defs>
<rect width="2732" height="2732" fill="url(#bg)"/><circle cx="2100" cy="520" r="820" fill="url(#glow)"/>
<image href="data:image/svg+xml;base64,${iconSvg.toString("base64")}" x="854" y="510" width="1024" height="1024"/>
<text x="1366" y="1880" text-anchor="middle" font-family="Arial,sans-serif" font-size="112" font-weight="700" fill="#f4e7ca">STAIRWAY CITY</text>
<text x="1366" y="2010" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" fill="#b9cbd1">EXPLORE • DRIVE • DISCOVER</text>
</svg>`);
await mkdir("assets", { recursive: true });
await mkdir("public/icons", { recursive: true });
await sharp(iconSvg).resize(1024, 1024).png().toFile("assets/icon-only.png");
await sharp(splashSvg).png().toFile("assets/splash.png");
await sharp(splashSvg).png().toFile("assets/splash-dark.png");
for (const size of [192, 512]) {
  await sharp(iconSvg).resize(size, size).png().toFile(`public/icons/app-icon-${size}.png`);
}
await sharp(iconSvg).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
console.log("Generated PWA and native app icons.");
