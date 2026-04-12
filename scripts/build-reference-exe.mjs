import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const buildDir = join(rootDir, ".sea-build");
const seaEntryPath = join(buildDir, "sea-entry.cjs");
const seaConfigPath = join(buildDir, "sea-config.json");
const seaBlobPath = join(buildDir, "piskel-cli.blob");
const distDir = join(rootDir, "dist");
const outputExePath = join(distDir, "piskel-cli.exe");
const sentinelFuse = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

rmSync(buildDir, { force: true, recursive: true });
mkdirSync(buildDir, { recursive: true });
mkdirSync(distDir, { recursive: true });

await build({
  entryPoints: [join(rootDir, "src", "sea-cli.ts")],
  bundle: true,
  outfile: seaEntryPath,
  platform: "node",
  format: "cjs",
  target: "node24",
  banner: {
    js: "'use strict';",
  },
});

writeFileSync(
  seaConfigPath,
  JSON.stringify(
    {
      main: seaEntryPath,
      output: seaBlobPath,
      disableExperimentalSEAWarning: true,
    },
    null,
    2,
  ),
);

execFileSync(process.execPath, ["--experimental-sea-config", seaConfigPath], {
  cwd: rootDir,
  stdio: "inherit",
});

copyFileSync(process.execPath, outputExePath);

const postjectCliPath = require.resolve("postject/dist/cli.js");
execFileSync(
  process.execPath,
  [
    postjectCliPath,
    outputExePath,
    "NODE_SEA_BLOB",
    seaBlobPath,
    "--sentinel-fuse",
    sentinelFuse,
  ],
  {
    cwd: rootDir,
    stdio: "inherit",
  },
);

console.log(`Built ${outputExePath}`);
