#!/usr/bin/env node

import path from "node:path";

import { runCommand } from "./commands.js";
import { buildHelpMessage, parseArgs, HelpRequested } from "./options.js";
import { getRepoInfo } from "./github.js";
import { selectTicketFromList } from "./interactive.js";
import {
  ensureBranchInPlace,
  ensureParentDirectory,
  ensureWorktreeReady,
  openWorktree,
  resolveTarget,
  runRunners,
} from "./worktree.js";
import type { CliMode, RepoInfo } from "./types.js";

void main().catch((error) => {
  if (error instanceof HelpRequested) {
    console.log(buildHelpMessage());
    return;
  }

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const initialCwd = process.cwd();

  try {
    const repoRoot = resolveRepoRoot(initialCwd);
    if (path.resolve(process.cwd()) !== path.resolve(repoRoot)) {
      process.chdir(repoRoot);
    }

    const repoName = path.basename(repoRoot);
    const worktreesRoot = path.resolve(repoRoot, "..", `${repoName}.worktrees`);
    const repoInfo = getRepoInfo();

    const ticket = await resolveTicketFromMode(options.mode, repoInfo);
    if (!ticket) {
      console.log("No selection made. Abort.");
      return;
    }

    const target = resolveTarget(ticket, worktreesRoot);
    if (options.inPlace) {
      ensureBranchInPlace(target);
      openWorktree(options.openers, repoRoot);
      runRunners(options.runners, repoRoot);
      return;
    }

    ensureParentDirectory(target.worktreePath);
    ensureWorktreeReady(target);

    openWorktree(options.openers, target.worktreePath);
    runRunners(options.runners, target.worktreePath);
  } finally {
    process.chdir(initialCwd);
  }
}

async function resolveTicketFromMode(mode: CliMode, repoInfo: RepoInfo): Promise<string | null> {
  if (mode.kind === "ticket") {
    return mode.ticket;
  }

  return await selectTicketFromList(mode.kind, repoInfo);
}

function resolveRepoRoot(baseDir: string): string {
  const gitCommonDirRaw = runCommand("git", ["rev-parse", "--git-common-dir"]);
  const gitCommonDir = resolveGitPath(baseDir, gitCommonDirRaw);
  return path.dirname(gitCommonDir);
}

function resolveGitPath(baseDir: string, gitPath: string): string {
  if (path.isAbsolute(gitPath)) {
    return path.normalize(gitPath);
  }

  return path.normalize(path.resolve(baseDir, gitPath));
}
