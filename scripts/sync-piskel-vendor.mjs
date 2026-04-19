#!/usr/bin/env node
/**
 * Copies piskelapp/piskel `dest/prod` into vendor/piskel-prod and injects a small
 * script so `index.html?load=/path-on-server` can fetch and open a .piskel JSON.
 *
 * Usage:
 *   node scripts/sync-piskel-vendor.mjs
 *   PISKEL_ROOT=/path/to/piskel node scripts/sync-piskel-vendor.mjs
 *
 * Requires: upstream `npm install && npm run build` so dest/prod exists.
 */

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DEST_VENDOR = path.join(REPO_ROOT, "vendor", "piskel-prod");

const PISKEL_ROOT = process.env.PISKEL_ROOT
  ? path.resolve(process.env.PISKEL_ROOT)
  : path.resolve(REPO_ROOT, "..", "piskel");

const SRC_PROD = path.join(PISKEL_ROOT, "dest", "prod");

const BRIDGE_MARKER = "<!-- piskel-cli: load bridge -->";

const BRIDGE_SCRIPT = `  ${BRIDGE_MARKER}
  <script type="text/javascript">
  (function () {
    try {
      var params = new URLSearchParams(window.location.search);
      var loadPath = params.get("load");
      if (!loadPath) {
        return;
      }
      window.piskelReadyCallbacks = window.piskelReadyCallbacks || [];
      window.piskelReadyCallbacks.push(function () {
        fetch(loadPath, { credentials: "same-origin" })
          .then(function (r) {
            if (!r.ok) {
              throw new Error("HTTP " + r.status);
            }
            return r.json();
          })
          .then(function (data) {
            pskl.utils.serialization.Deserializer.deserialize(
              data,
              function (piskel) {
                pskl.app.piskelController.setPiskel(piskel);
              },
              function () {
                window.alert("Failed to deserialize .piskel data");
              }
            );
          })
          .catch(function (e) {
            console.error(e);
            window.alert("Failed to load Piskel file: " + loadPath);
          });
      });
    } catch (e) {
      console.error(e);
    }
  })();
  </script>
`;

function injectBridge(html) {
  if (html.includes(BRIDGE_MARKER)) {
    return html;
  }
  const normalized = html.replace(/\r\n/g, "\n");
  const anchor = '<script type="text/javascript">\n    (function () {';
  const idx = normalized.indexOf(anchor);
  if (idx === -1) {
    throw new Error(
      `Could not find Piskel boot script anchor in index.html. Is this a supported piskel build?`,
    );
  }
  return normalized.slice(0, idx) + BRIDGE_SCRIPT + "\n" + normalized.slice(idx);
}

async function main() {
  await mkdir(path.join(REPO_ROOT, "vendor"), { recursive: true });
  await rm(DEST_VENDOR, { recursive: true, force: true });
  await cp(SRC_PROD, DEST_VENDOR, { recursive: true });

  const indexPath = path.join(DEST_VENDOR, "index.html");
  let html = await readFile(indexPath, "utf8");
  html = injectBridge(html);
  await writeFile(indexPath, html, "utf8");

  console.log(`Synced ${SRC_PROD} -> ${DEST_VENDOR}`);
  console.log("Injected piskel-cli ?load= bridge into index.html");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
