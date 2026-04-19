#!/usr/bin/env node
/**
 * Ensures vendor/piskel-prod exists so `npm pack` / `npm publish` ships the
 * bundled Piskel web app (required for `piskel-cli serve`).
 *
 * Run: node scripts/assert-vendor.mjs
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexHtml = path.join(root, "vendor", "piskel-prod", "index.html");

if (!existsSync(indexHtml)) {
  console.error(
    [
      "Missing bundled Piskel editor: vendor/piskel-prod/index.html",
      "",
      "Publish would ship a package where `piskel-cli serve` cannot run.",
      "From a built piskel clone (npm install && npm run build), run:",
      "",
      "  npm run sync-piskel-vendor",
      "",
      "Or: PISKEL_ROOT=/path/to/piskel npm run sync-piskel-vendor",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

console.log("OK: vendor/piskel-prod is present.");
