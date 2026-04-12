#!/usr/bin/env node

import { runCli } from "./cli/run.js";

const exitCode = await runCli(process.argv.slice(2), {
  writeStdout: (line) => {
    process.stdout.write(`${line}\n`);
  },
  writeStderr: (line) => {
    process.stderr.write(`${line}\n`);
  },
});

process.exitCode = exitCode;
