import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { runCommand, tryRunCommand } from "./commands.js";
import { tryRunGhJson } from "./github.js";
import type {
  EditorCommand,
  IssueTarget,
  PrTarget,
  RunnerCommand,
  WorktreeTarget,
  WorktreeInfo,
} from "./types.js";

export function resolveTarget(ticketNumber: string, worktreesRoot: string): WorktreeTarget {
  const prInfo = tryRunGhJson<{ headRefName: string; isCrossRepository: boolean }>([
    "pr",
    "view",
    ticketNumber,
    "--json",
    "headRefName",
    "isCrossRepository",
  ]);

  if (prInfo) {
    const branch = prInfo.headRefName;
    const worktreePath = path.join(worktreesRoot, "pr", branch);
    return {
      kind: "pr",
      branch,
      worktreePath,
      number: ticketNumber,
      isCrossRepository: prInfo.isCrossRepository,
    };
  }

  const issueInfo = tryRunGhJson<{ number: number }>([
    "issue",
    "view",
    ticketNumber,
    "--json",
    "number",
  ]);

  if (issueInfo) {
    const branch = `issue/${ticketNumber}`;
    const worktreePath = path.join(worktreesRoot, "issue", ticketNumber);
    return {
      kind: "issue",
      branch,
      worktreePath,
      baseRef: resolveDefaultBaseRef(),
    };
  }

  throw new Error(`Ticket ${ticketNumber} not found as issue or PR.`);
}

export function ensureWorktreeReady(target: WorktreeTarget) {
  const existing = findExistingWorktree(target.worktreePath);
  if (existing) {
    validateExistingWorktree(existing, target.branch);
    console.log(`Reusing existing worktree at ${existing.path}`);
    return;
  }

  if (target.kind === "issue") {
    createIssueWorktree(target);
  } else {
    createPrWorktree(target);
  }
}

export function ensureBranchInPlace(target: WorktreeTarget) {
  if (target.kind === "issue") {
    ensureIssueBranchExists(target);
  } else {
    ensurePrBranchExists(target);
  }

  switchToBranch(target.branch);
}

function createIssueWorktree(target: IssueTarget) {
  const branchExists = localBranchExists(target.branch);
  const args = ["worktree", "add", target.worktreePath];

  if (branchExists) {
    args.push(target.branch);
  } else {
    args.push("-b", target.branch, target.baseRef);
  }

  runGit(args);
}

function createPrWorktree(target: PrTarget) {
  if (localBranchExists(target.branch)) {
    runGit(["worktree", "add", target.worktreePath, target.branch]);
    return;
  }

  const sourceRef = preparePrSourceRef(target);
  runGit(["worktree", "add", target.worktreePath, "-b", target.branch, sourceRef]);
}

function ensureIssueBranchExists(target: IssueTarget) {
  if (localBranchExists(target.branch)) {
    return;
  }

  runGit(["branch", target.branch, target.baseRef]);
}

function ensurePrBranchExists(target: PrTarget) {
  if (localBranchExists(target.branch)) {
    return;
  }

  const sourceRef = preparePrSourceRef(target);
  runGit(["branch", target.branch, sourceRef]);
}

function preparePrSourceRef(target: PrTarget): string {
  if (!target.isCrossRepository) {
    const fetched = tryGit(["fetch", "origin", target.branch]);
    if (fetched) {
      return `origin/${target.branch}`;
    }
  }

  console.log(`Fallback to PR head fetch for #${target.number}`);
  runGit(["fetch", "origin", `pull/${target.number}/head`]);
  return "FETCH_HEAD";
}

function localBranchExists(branch: string): boolean {
  const result = spawnSync("git", ["show-ref", "--verify", `refs/heads/${branch}`]);
  return result.status === 0;
}

function resolveDefaultBaseRef(): string {
  const symbolic = tryRunCommand("git", ["symbolic-ref", "refs/remotes/origin/HEAD"]);
  if (!symbolic) {
    return "origin/main";
  }

  const defaultBranch = symbolic.replace("refs/remotes/origin/", "").trim();
  return `origin/${defaultBranch}`;
}

export function openWorktree(openers: EditorCommand[], worktreePath: string) {
  for (const opener of openers) {
    const result = spawnSync(opener, [worktreePath], { stdio: "inherit" });
    if (result.status !== 0) {
      console.warn(`${formatEditorLabel(opener)} launch failed. Worktree is ready at ${worktreePath}`);
    }
  }
}

export function formatEditorLabel(command: string): string {
  return command === "code" ? "vsc" : command;
}

export function runRunners(runners: RunnerCommand[], worktreePath: string) {
  if (runners.length === 0) {
    return;
  }

  const originalCwd = process.cwd();
  process.chdir(worktreePath);

  try {
    for (const runner of runners) {
      if (runner.command === "shell") {
        runShellRunner(runner);
        continue;
      }

      const result = spawnSync(runner.command, runner.args, { stdio: "inherit" });
      if (result.status !== 0) {
        throw new Error(`${runner.command} command failed.`);
      }
    }
  } finally {
    process.chdir(originalCwd);
  }
}

export function ensureParentDirectory(targetPath: string) {
  const parent = path.dirname(targetPath);
  fs.mkdirSync(parent, { recursive: true });
}

function runGit(args: string[]) {
  runCommand("git", args, { stdio: "inherit" });
}

function tryGit(args: string[]): boolean {
  const result = spawnSync("git", args, { encoding: "utf8" });

  if (typeof result.stdout === "string" && result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }

  if (typeof result.stderr === "string" && result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }

  return result.status === 0;
}

function switchToBranch(branch: string) {
  runCommand("git", ["switch", branch], { stdio: "inherit" });
}

function runShellRunner(runner: RunnerCommand & { command: "shell" }) {
  const shellExecutable =
    runner.executable ?? process.env.DEVSTART_SHELL ?? process.env.SHELL ?? "/bin/bash";
  const result = spawnSync(shellExecutable, runner.args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${shellExecutable} command failed.`);
  }
}

export function findExistingWorktree(targetPath: string): WorktreeInfo | null {
  const output = tryRunCommand("git", ["worktree", "list", "--porcelain"]);
  if (!output) {
    return null;
  }

  const normalizedTarget = normalizePath(targetPath);
  const entries = parseWorktreeList(output);
  return entries.find((entry) => normalizePath(entry.path) === normalizedTarget) ?? null;
}

export function parseWorktreeList(output: string): WorktreeInfo[] {
  const entries: WorktreeInfo[] = [];
  let current: WorktreeInfo | null = null;

  const flush = () => {
    if (current && current.path) {
      entries.push(current);
    }
    current = null;
  };

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();

    if (line.length === 0) {
      flush();
      continue;
    }

    if (line.startsWith("worktree ")) {
      flush();
      current = { path: line.slice(9).trim(), branch: null };
      continue;
    }

    if (!current) {
      continue;
    }

    if (line.startsWith("branch ")) {
      current.branch = line.slice(7).trim();
    }
  }

  flush();
  return entries;
}

export function validateExistingWorktree(existing: WorktreeInfo, expectedBranch: string) {
  if (!existing.branch) {
    throw new Error(
      `Worktree ${existing.path} is detached. Expected branch ${expectedBranch}.`
    );
  }

  const normalizedExpected = `refs/heads/${expectedBranch}`;
  if (existing.branch !== normalizedExpected) {
    const actualLabel = formatBranchRef(existing.branch);
    throw new Error(
      `Worktree ${existing.path} is on ${actualLabel}, expected ${expectedBranch}.`
    );
  }
}

export function normalizePath(targetPath: string): string {
  try {
    return fs.realpathSync(targetPath);
  } catch {
    return path.resolve(targetPath);
  }
}

export function formatBranchRef(ref: string): string {
  return ref.replace("refs/heads/", "");
}
