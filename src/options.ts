import type { CliMode, CliOptions, EditorCommand, RunnerCommand } from "./types.js";

export const USAGE = "Usage: devstart [options] (<issue|pr-number>|issues|prs)";

export function buildHelpMessage(): string {
  return `
${USAGE}

Options:
  --vsc       Open the worktree in vsc (default)
  --cursor    Open the worktree in Cursor
  --codex     Run the codex command inside the worktree
  --claude    Run the claude command inside the worktree
  --in-place  Switch the current repo branch instead of creating a worktree
  --help,-h   Show this help text

Commands:
  issues      Interactive list of open issues
  prs         Interactive list of open pull requests

Provide an issue or PR number. Issues create an issue/<number> branch, PRs use the head branch name. Worktrees are created under ../<repo>.worktrees/...
`;
}

export function parseArgs(args: string[]): CliOptions {
  const openers: EditorCommand[] = [];
  const runners: RunnerCommand[] = [];
  let mode: CliMode | null = null;
  let inPlace = false;

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      throw new HelpRequested();
    }

    if (arg === "--vsc" || arg === "--code") {
      addUnique(openers, "code");
      continue;
    }

    if (arg === "--cursor") {
      addUnique(openers, "cursor");
      continue;
    }

    if (arg === "--codex") {
      addUnique(runners, "codex");
      continue;
    }

    if (arg === "--claude") {
      addUnique(runners, "claude");
      continue;
    }

    if (arg === "--in-place") {
      inPlace = true;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (!mode) {
      if (arg === "issues") {
        mode = { kind: "issues" };
        continue;
      }
      if (arg === "prs" || arg === "pulls") {
        mode = { kind: "prs" };
        continue;
      }
      mode = { kind: "ticket", ticket: arg };
      continue;
    }

    throw new Error("Multiple positional arguments provided.");
  }

  if (!mode) {
    throw new Error(USAGE);
  }

  return {
    mode,
    openers: openers.length > 0 ? openers : ["code"],
    runners,
    inPlace,
  };
}

export class HelpRequested extends Error {
  constructor() {
    super("help");
  }
}

function addUnique<T>(list: T[], value: T) {
  if (!list.includes(value)) {
    list.push(value);
  }
}
