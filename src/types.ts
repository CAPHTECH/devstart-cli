export type IssueTarget = {
  kind: "issue";
  branch: string;
  worktreePath: string;
  baseRef: string;
};

export type PrTarget = {
  kind: "pr";
  branch: string;
  worktreePath: string;
  number: string;
  isCrossRepository: boolean;
};

export type WorktreeTarget = IssueTarget | PrTarget;

export type WorktreeInfo = {
  path: string;
  branch: string | null;
};

export type EditorCommand = "code" | "cursor";
export type RunnerName = "codex" | "claude" | "shell";
export type RunnerCommand = {
  command: RunnerName;
  args: string[];
  executable?: string;
};
export type ListType = "issues" | "prs";

export type CliMode =
  | { kind: "ticket"; ticket: string }
  | { kind: "issues" }
  | { kind: "prs" };

export type CliOptions = {
  mode: CliMode;
  openers: EditorCommand[];
  runners: RunnerCommand[];
  inPlace: boolean;
};

export type RepoInfo = {
  owner: string;
  name: string;
};

export type ListItem = {
  number: number;
  title: string;
};

export type ListPage = {
  items: ListItem[];
  hasNext: boolean;
  nextCursor: string | null;
};
