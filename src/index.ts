#!/usr/bin/env node

import path from "node:path";

import { runCommand } from "./commands.js";
import { buildHelpMessage, parseArgs, HelpRequested } from "./options.js";
import { getRepoInfo } from "./github.js";
import { selectTicketFromList } from "./interactive.js";
import {
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
  const repoRoot = runCommand("git", ["rev-parse", "--show-toplevel"]);
  const repoName = path.basename(repoRoot);
  const worktreesRoot = path.resolve(repoRoot, "..", `${repoName}.worktrees`);
  const repoInfo = getRepoInfo();

  const ticket = await resolveTicketFromMode(options.mode, repoInfo);
  if (!ticket) {
    console.log("No selection made. Abort.");
    return;
  }

  const target = resolveTarget(ticket, worktreesRoot);
  ensureParentDirectory(target.worktreePath);
  ensureWorktreeReady(target);

  openWorktree(options.openers, target.worktreePath);
  runRunners(options.runners, target.worktreePath);
}

async function resolveTicketFromMode(mode: CliMode, repoInfo: RepoInfo): Promise<string | null> {
  if (mode.kind === "ticket") {
    return mode.ticket;
  }

  return await selectTicketFromList(mode.kind, repoInfo);
}
