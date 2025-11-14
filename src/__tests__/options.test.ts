import { describe, expect, it } from "vitest";

import { HelpRequested, parseArgs } from "../options.js";

describe("parseArgs", () => {
  it("parses ticket number with default opener", () => {
    const result = parseArgs(["123"]);
    expect(result.mode).toEqual({ kind: "ticket", ticket: "123" });
    expect(result.openers).toEqual(["code"]);
    expect(result.runners).toEqual([]);
    expect(result.inPlace).toBe(false);
  });

  it("handles issues command with custom openers", () => {
    const result = parseArgs(["--cursor", "issues"]);
    expect(result.mode).toEqual({ kind: "issues" });
    expect(result.openers).toEqual(["cursor"]);
    expect(result.inPlace).toBe(false);
  });

  it("sets in-place flag", () => {
    const result = parseArgs(["--in-place", "123"]);
    expect(result.inPlace).toBe(true);
  });

  it("throws on multiple positional arguments", () => {
    expect(() => parseArgs(["123", "456"])).toThrowError();
  });

  it("signals help request", () => {
    expect(() => parseArgs(["--help"])).toThrow(HelpRequested);
  });
});
