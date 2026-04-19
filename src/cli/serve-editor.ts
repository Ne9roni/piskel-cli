import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
};

export function getPackageRoot(): string {
  return join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");
}

export function getBundledEditorRoot(): string {
  return join(getPackageRoot(), "vendor", "piskel-prod");
}

export function buildSessionLoadPath(token: string): string {
  return `/__piskel/open/${token}`;
}

export function buildEditorPageUrl(baseUrl: string, loadPath: string | null): string {
  const url = new URL("index.html", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (loadPath) {
    url.searchParams.set("load", loadPath);
  }
  return url.href;
}

function getMime(filePath: string): string {
  const lower = filePath.toLowerCase();
  const dot = lower.lastIndexOf(".");
  const ext = dot >= 0 ? lower.slice(dot) : "";
  return MIME[ext] ?? "application/octet-stream";
}

function isPathUnderRoot(filePath: string, root: string): boolean {
  const resolvedFile = resolve(filePath);
  const resolvedRoot = resolve(root);
  return resolvedFile === resolvedRoot || resolvedFile.startsWith(resolvedRoot + sep);
}

/** Decodes a URL pathname segment; returns null if percent-encoding is malformed. */
export function tryDecodeUriPathname(pathname: string): string | null {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

export interface ServeEditorOptions {
  projectPath?: string;
  port?: number;
  host?: string;
  openBrowser: boolean;
  json: boolean;
}

export interface ServeEditorIo {
  writeStdout: (line: string) => void;
  writeStderr: (line: string) => void;
}

/**
 * Serves the bundled Piskel web app and optionally exposes one .piskel file at a secret URL.
 */
export async function serveEditor(io: ServeEditorIo, options: ServeEditorOptions): Promise<number> {
  const root = getBundledEditorRoot();
  const indexPath = join(root, "index.html");
  if (!existsSync(indexPath)) {
    if (options.json) {
      io.writeStdout(
        JSON.stringify(
          {
            ok: false,
            error: {
              code: "VENDOR_MISSING",
              message:
                "Bundled Piskel editor not found under vendor/piskel-prod. Run: node scripts/sync-piskel-vendor.mjs (from a built piskel clone, set PISKEL_ROOT).",
            },
          },
          null,
          2,
        ),
      );
    } else {
      io.writeStderr(
        "Bundled Piskel editor not found under vendor/piskel-prod.\nRun: node scripts/sync-piskel-vendor.mjs\n(Requires a built piskel clone; set PISKEL_ROOT if it is not ../piskel.)",
      );
    }
    return 1;
  }

  let projectResolved: string | undefined;
  if (options.projectPath) {
    projectResolved = resolve(options.projectPath);
    if (!existsSync(projectResolved)) {
      const msg = `File not found: ${options.projectPath}`;
      if (options.json) {
        io.writeStdout(JSON.stringify({ ok: false, error: { code: "FILE_NOT_FOUND", message: msg } }, null, 2));
      } else {
        io.writeStderr(msg);
      }
      return 1;
    }
    const st = await stat(projectResolved);
    if (!st.isFile()) {
      const msg = `Not a file: ${options.projectPath}`;
      if (options.json) {
        io.writeStdout(JSON.stringify({ ok: false, error: { code: "USAGE_ERROR", message: msg } }, null, 2));
      } else {
        io.writeStderr(msg);
      }
      return 1;
    }
  }

  const sessions = new Map<string, string>();
  const registerSession = (absPath: string): string => {
    const token = randomBytes(16).toString("hex");
    sessions.set(token, absPath);
    return token;
  };

  const host = options.host ?? "127.0.0.1";
  const requestedPort = options.port;

  const server = createServer((req, res) => {
    const urlRaw = req.url ?? "/";
    const url = new URL(urlRaw, `http://${req.headers.host ?? "localhost"}`);

    if (url.pathname.startsWith("/__piskel/open/")) {
      const token = url.pathname.slice("/__piskel/open/".length).replace(/\/+$/, "");
      if (!/^[a-f0-9]{32}$/.test(token)) {
        res.writeHead(400);
        res.end("Bad request");
        return;
      }
      const mapped = sessions.get(token);
      if (!mapped) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      void stat(mapped).then(
        (st) => {
          if (!st.isFile()) {
            res.writeHead(404);
            res.end("Not found");
            return;
          }
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          });
          createReadStream(mapped).pipe(res);
        },
        () => {
          res.writeHead(404);
          res.end("Not found");
        },
      );
      return;
    }

    const decodedPath = tryDecodeUriPathname(url.pathname);
    if (decodedPath === null) {
      res.writeHead(400);
      res.end("Bad request");
      return;
    }

    let pathname = decodedPath.replace(/^\/+/, "");
    if (!pathname) {
      pathname = "index.html";
    }

    const candidate = resolve(join(root, pathname));
    if (!isPathUnderRoot(candidate, root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    void stat(candidate).then(
      (st) => {
        if (!st.isFile()) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, {
          "Content-Type": getMime(candidate),
          "Cache-Control": "no-cache",
        });
        createReadStream(candidate).pipe(res);
      },
      () => {
        res.writeHead(404);
        res.end("Not found");
      },
    );
  });

  try {
    await new Promise<void>((done, reject) => {
      server.once("error", reject);
      server.listen(requestedPort ?? 0, host, () => done());
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (options.json) {
      io.writeStdout(JSON.stringify({ ok: false, error: { code: "READ_FAILED", message: msg } }, null, 2));
    } else {
      io.writeStderr(`Failed to start server: ${msg}`);
    }
    return 1;
  }

  const addr = server.address();
  const port =
    typeof addr === "object" && addr && "port" in addr ? (addr as { port: number }).port : requestedPort ?? 0;
  const baseUrl = `http://${host}:${port}/`;
  let editorUrl = baseUrl;
  if (projectResolved) {
    const token = registerSession(projectResolved);
    const loadPath = buildSessionLoadPath(token);
    editorUrl = buildEditorPageUrl(baseUrl, loadPath);
  } else {
    editorUrl = buildEditorPageUrl(baseUrl, null);
  }

  if (options.json) {
    io.writeStdout(
      JSON.stringify(
        {
          ok: true,
          data: {
            url: editorUrl,
            baseUrl,
            port,
            host,
            projectPath: projectResolved ?? null,
          },
        },
        null,
        2,
      ),
    );
  } else {
    io.writeStdout(editorUrl);
    io.writeStdout(`\nServing Piskel from ${root}`);
    io.writeStdout(`\nPress Ctrl+C to stop.\n`);
  }

  if (options.openBrowser) {
    openUrlInBrowser(editorUrl, io);
  }

  await new Promise<void>(() => {
    /* keep process alive until SIGINT */
  });

  return 0;
}

function getOpenUrlCandidates(url: string): Array<[string, string[]]> {
  const platform = process.platform;
  if (platform === "darwin") {
    return [["open", [url]]];
  }
  if (platform === "win32") {
    return [["cmd", ["/c", "start", "", url]]];
  }
  return [
    ["xdg-open", [url]],
    ["wslview", [url]],
    ["gio", ["open", url]],
    ["sensible-browser", [url]],
  ];
}

function openUrlInBrowser(url: string, io: ServeEditorIo): void {
  const candidates = getOpenUrlCandidates(url);
  const tryAt = (index: number) => {
    if (index >= candidates.length) {
      io.writeStderr(
        "Could not launch a browser automatically. Open the URL printed above, install xdg-utils (xdg-open) or wslu (wslview) on WSL, or pass --no-open.\n",
      );
      return;
    }
    const [cmd, args] = candidates[index]!;
    const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        tryAt(index + 1);
      }
    });
    child.unref();
  };
  tryAt(0);
}

/**
 * Parse `serve` argv: optional project path, `--port`, `--host`, `--no-open`, `--json`.
 */
export function parseServeArgs(args: string[]): {
  positionals: string[];
  flags: Record<string, string | boolean>;
} {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  const booleans = new Set(["no-open", "json"]);

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (booleans.has(key)) {
      flags[key] = true;
      continue;
    }
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i += 1;
  }

  return { positionals, flags };
}
