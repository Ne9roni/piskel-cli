import { runCli } from "./cli/run.js";

async function main(): Promise<void> {
  const exitCode = await runCli(process.argv.slice(2), {
    writeStdout: (line) => {
      process.stdout.write(`${line}\n`);
    },
    writeStderr: (line) => {
      process.stderr.write(`${line}\n`);
    },
  });

  process.exitCode = exitCode;
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
