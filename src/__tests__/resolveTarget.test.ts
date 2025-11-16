import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../github.js", () => ({
  tryRunGhJson: vi.fn(),
}));

vi.mock("../commands.js", () => ({
  tryRunCommand: vi.fn(),
}));

import { resolveTarget } from "../worktree.js";
import { tryRunGhJson } from "../github.js";
import { tryRunCommand } from "../commands.js";

const mockedTryRunGhJson = vi.mocked(tryRunGhJson);
const mockedTryRunCommand = vi.mocked(tryRunCommand);

describe("resolveTarget", () => {
  const worktreesRoot = "/repo.worktrees";

  beforeEach(() => {
    mockedTryRunGhJson.mockReset();
    mockedTryRunCommand.mockReset();
  });

  it("prefers PR metadata to create worktree name when gh pr view matches", () => {
    mockedTryRunGhJson.mockImplementation((args) => {
      if (args[0] === "pr") {
        return { headRefName: "feature/pr-123", isCrossRepository: false };
      }
      return null;
    });

    const target = resolveTarget("123", worktreesRoot);

    expect(target).toEqual({
      kind: "pr",
      branch: "feature/pr-123",
      worktreePath: "/repo.worktrees/pr/feature/pr-123",
      number: "123",
      isCrossRepository: false,
    });
  });

  it("falls back to issue resolution when pr lookup fails", () => {
    mockedTryRunGhJson.mockImplementation((args) => {
      if (args[0] === "pr") {
        return null;
      }
      return { number: 456 };
    });
    mockedTryRunCommand.mockReturnValue("refs/remotes/origin/main");

    const target = resolveTarget("456", worktreesRoot);

    expect(target).toEqual({
      kind: "issue",
      branch: "issue/456",
      worktreePath: "/repo.worktrees/issue/456",
      baseRef: "origin/main",
    });
  });
});
