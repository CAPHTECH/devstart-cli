import type { CliMode, CliOptions, EditorCommand, RunnerCommand } from "./types.js";

type RunnerName = RunnerCommand["command"];

export const USAGE = "Usage: devstart [options] (<issue|pr-number>|issues|prs)";

export function buildHelpMessage(): string {
  return `
${USAGE}

Options:
  --vsc       Open the worktree in VS Code
  --cursor    Open the worktree in Cursor
  --codex[=value]
             Run the codex command inside the worktree (first argument optional)
  --codex-arg <value>
             Pass an extra argument to the codex command (repeatable)
  --claude[=value]
             Run the claude command inside the worktree (first argument optional)
  --claude-arg <value>
             Pass an extra argument to the claude command (repeatable)
  --shell[=path]
             Start an interactive shell inside the worktree (defaults to $DEVSTART_SHELL, $SHELL, or /bin/bash)
  --shell-arg <value>
             Pass an extra argument to the shell command (repeatable)
  --in-place  Switch the current repo branch instead of creating a worktree
  --version,-V
             Show the CLI version
  --help,-h   Show this help text

Commands:
  issues      Interactive list of open issues
  prs         Interactive list of open pull requests

Provide an issue or PR number. Issues create an issue/<number> branch, PRs use the head branch name. Worktrees are created under ../<repo>.worktrees/...
`;
}

export function parseArgs(args: string[]): CliOptions {
  const openers: EditorCommand[] = [];
  const runnerArgs: Record<RunnerName, string[]> = {
    codex: [],
    claude: [],
    shell: [],
  };
  const runnerOrder: RunnerName[] = [];
  const runnerExecutables: Partial<Record<RunnerName, string>> = {};
  let mode: CliMode | null = null;
  let inPlace = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) {
      continue;
    }

    const consumeValue = (flag: string): string => {
      if (i + 1 >= args.length) {
        throw new Error(`${flag} requires a value.`);
      }
      const value = args[i + 1];
      if (value === undefined) {
        throw new Error(`${flag} requires a value.`);
      }
      i += 1;
      return value;
    };

    const enableRunner = (name: RunnerName) => {
      if (!runnerOrder.includes(name)) {
        runnerOrder.push(name);
      }
    };

    const addRunnerArg = (name: RunnerName, value: string) => {
      runnerArgs[name].push(value);
      enableRunner(name);
    };

    const setRunnerExecutable = (name: RunnerName, value: string) => {
      runnerExecutables[name] = value;
      enableRunner(name);
    };

    if (arg === "--help" || arg === "-h") {
      throw new HelpRequested();
    }

    if (arg === "--version" || arg === "-V") {
      throw new VersionRequested();
    }

    if (arg === "--vsc" || arg === "--code") {
      addUnique(openers, "code");
      continue;
    }

    if (arg === "--cursor") {
      addUnique(openers, "cursor");
      continue;
    }

    if (arg === "--codex" || arg.startsWith("--codex=")) {
      enableRunner("codex");
      if (arg.startsWith("--codex=")) {
        const inlineValue = arg.slice("--codex=".length);
        if (!inlineValue) {
          throw new Error("--codex= requires a value.");
        }
        addRunnerArg("codex", inlineValue);
      }
      continue;
    }

    if (arg === "--claude" || arg.startsWith("--claude=")) {
      enableRunner("claude");
      if (arg.startsWith("--claude=")) {
        const inlineValue = arg.slice("--claude=".length);
        if (!inlineValue) {
          throw new Error("--claude= requires a value.");
        }
        addRunnerArg("claude", inlineValue);
      }
      continue;
    }

    if (arg === "--shell" || arg.startsWith("--shell=")) {
      enableRunner("shell");
      if (arg.startsWith("--shell=")) {
        const inlineValue = arg.slice("--shell=".length);
        if (!inlineValue) {
          throw new Error("--shell= requires a value.");
        }
        setRunnerExecutable("shell", inlineValue);
      }
      continue;
    }

    if (arg === "--codex-arg") {
      const value = consumeValue("--codex-arg");
      addRunnerArg("codex", value);
      continue;
    }

    if (arg.startsWith("--codex-arg=")) {
      const value = arg.slice("--codex-arg=".length);
      if (!value) {
        throw new Error("--codex-arg requires a value.");
      }
      addRunnerArg("codex", value);
      continue;
    }

    if (arg === "--claude-arg") {
      const value = consumeValue("--claude-arg");
      addRunnerArg("claude", value);
      continue;
    }

    if (arg.startsWith("--claude-arg=")) {
      const value = arg.slice("--claude-arg=".length);
      if (!value) {
        throw new Error("--claude-arg requires a value.");
      }
      addRunnerArg("claude", value);
      continue;
    }

    if (arg === "--shell-arg") {
      const value = consumeValue("--shell-arg");
      addRunnerArg("shell", value);
      continue;
    }

    if (arg.startsWith("--shell-arg=")) {
      const value = arg.slice("--shell-arg=".length);
      if (!value) {
        throw new Error("--shell-arg requires a value.");
      }
      addRunnerArg("shell", value);
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

  const runners: RunnerCommand[] = runnerOrder.map((name) => {
    const argsCopy = [...runnerArgs[name]];
    const executable = runnerExecutables[name];
    if (executable) {
      return { command: name, args: argsCopy, executable };
    }
    return { command: name, args: argsCopy };
  });

  return {
    mode,
    openers,
    runners,
    inPlace,
  };
}

export class HelpRequested extends Error {
  constructor() {
    super("help");
  }
}

export class VersionRequested extends Error {
  constructor() {
    super("version");
  }
}

function addUnique<T>(list: T[], value: T) {
  if (!list.includes(value)) {
    list.push(value);
  }
}
