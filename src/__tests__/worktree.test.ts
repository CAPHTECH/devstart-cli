import { describe, expect, it } from "vitest";

import {
  formatBranchRef,
  parseWorktreeList,
  validateExistingWorktree,
} from "../worktree.js";

describe("parseWorktreeList", () => {
  it("parses multiple entries with branch info", () => {
    const output = `worktree /repo
branch refs/heads/main

worktree /repo/worktrees/feature
branch refs/heads/feature
`;

    const entries = parseWorktreeList(output);
    expect(entries).toHaveLength(2);
    expect(entries[1]).toEqual({ path: "/repo/worktrees/feature", branch: "refs/heads/feature" });
  });
});

describe("validateExistingWorktree", () => {
  it("accepts matching branch", () => {
    expect(() =>
      validateExistingWorktree(
        { path: "/repo/worktrees/feature", branch: "refs/heads/feature" },
        "feature"
      )
    ).not.toThrow();
  });

  it("throws on mismatched branch", () => {
    expect(() =>
      validateExistingWorktree(
        { path: "/repo/worktrees/feature", branch: "refs/heads/other" },
        "feature"
      )
    ).toThrowError(/expected feature/);
  });
});

describe("formatBranchRef", () => {
  it("removes refs prefix", () => {
    expect(formatBranchRef("refs/heads/feature"))
      .toBe("feature");
  });
});
