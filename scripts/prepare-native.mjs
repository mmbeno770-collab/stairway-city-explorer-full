import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const requested = process.argv.slice(2);
const platforms = requested.length ? requested : ["ios", "android"];
for (const platform of platforms) {
  if (!["ios", "android"].includes(platform)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  if (!existsSync(platform)) {
    execFileSync("npx", ["cap", "add", platform], { stdio: "inherit" });
  }
  execFileSync("npx", ["cap", "sync", platform], { stdio: "inherit" });
  execFileSync("npx", ["capacitor-assets", "generate", `--${platform}`], { stdio: "inherit" });
}
console.log(`Prepared native project(s): ${platforms.join(", ")}`);
