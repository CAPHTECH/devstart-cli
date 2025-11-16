import { describe, expect, it } from "vitest";

import { HelpRequested, VersionRequested, parseArgs } from "../options.js";

describe("parseArgs", () => {
  it("parses ticket number without implicit opener", () => {
    const result = parseArgs(["123"]);
    expect(result.mode).toEqual({ kind: "ticket", ticket: "123" });
    expect(result.openers).toEqual([]);
    expect(result.runners).toEqual([]);
    expect(result.inPlace).toBe(false);
  });

  it("handles issues command with custom openers", () => {
    const result = parseArgs(["--cursor", "issues"]);
    expect(result.mode).toEqual({ kind: "issues" });
    expect(result.openers).toEqual(["cursor"]);
    expect(result.inPlace).toBe(false);
  });

  it("enables codex runner and accumulates args", () => {
    const result = parseArgs([
      "--codex-arg",
      "--model=gpt",
      "--codex=--max-tokens=2000",
      "--claude",
      "--claude-arg",
      "--temperature=0.2",
      "123",
    ]);

    expect(result.runners).toEqual([
      { command: "codex", args: ["--model=gpt", "--max-tokens=2000"] },
      { command: "claude", args: ["--temperature=0.2"] },
    ]);
  });

  it("enables shell runner and forwards args", () => {
    const result = parseArgs(["--shell", "--shell-arg", "-l", "123"]);
    expect(result.runners).toEqual([{ command: "shell", args: ["-l"] }]);
  });

  it("accepts inline shell executable value", () => {
    const result = parseArgs(["--shell=/bin/zsh", "prs"]);
    expect(result.runners).toEqual([{ command: "shell", args: [], executable: "/bin/zsh" }]);
  });

  it("accepts inline claude argument", () => {
    const result = parseArgs(["--claude=--model=opus", "issues"]);
    expect(result.runners).toEqual([{ command: "claude", args: ["--model=opus"] }]);
  });

  it("throws when runner arg is missing a value", () => {
    expect(() => parseArgs(["--codex-arg"])).toThrowError(/--codex-arg/);
    expect(() => parseArgs(["--codex="])).toThrowError(/--codex=/);
    expect(() => parseArgs(["--claude="])).toThrowError(/--claude=/);
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

  it("signals version request", () => {
    expect(() => parseArgs(["--version"])).toThrow(VersionRequested);
  });
});
