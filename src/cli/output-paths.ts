import { resolve } from "node:path";

export function getDefaultProjectPath(cwd: string): string {
  return resolve(cwd, "output", "output.piskel");
}

export function getDefaultExportPath(
  cwd: string,
  kind: "png" | "gif" | "spritesheet" | "metadata",
): string {
  const extension = kind === "gif" ? "gif" : kind === "metadata" ? "json" : "png";
  return resolve(cwd, "output", `output.${extension}`);
}

export function getDefaultExportFramesDir(cwd: string): string {
  return resolve(cwd, "output", "frames");
}
