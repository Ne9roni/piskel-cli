import { describe, expect, test } from "vitest";

import {
  buildEditorPageUrl,
  buildSessionLoadPath,
  tryDecodeUriPathname,
} from "../src/cli/serve-editor.js";

describe("serve-editor helpers", () => {
  test("tryDecodeUriPathname rejects malformed percent-encoding", () => {
    expect(tryDecodeUriPathname("/%ZZ")).toBeNull();
  });

  test("tryDecodeUriPathname decodes valid paths", () => {
    expect(tryDecodeUriPathname("/foo%20bar")).toBe("/foo bar");
    expect(tryDecodeUriPathname("/")).toBe("/");
  });

  test("buildSessionLoadPath", () => {
    expect(buildSessionLoadPath("deadbeef")).toBe("/__piskel/open/deadbeef");
  });

  test("buildEditorPageUrl with load path", () => {
    const u = buildEditorPageUrl("http://127.0.0.1:5555/", "/__piskel/open/tok");
    expect(u).toContain("index.html");
    expect(u).toContain("load=%2F__piskel%2Fopen%2Ftok");
  });

  test("buildEditorPageUrl without load path", () => {
    const u = buildEditorPageUrl("http://127.0.0.1:5555/", null);
    expect(u).toContain("index.html");
    expect(u).not.toContain("load=");
  });
});
