# Devstart CLI

Devstart CLI is a TypeScript tool that scaffolds working branches and git worktrees straight from GitHub Issues or PRs, then starts your preferred editor or automation runner. All you need locally is `node` + `pnpm`.

> 日本語ドキュメントは `README.ja.md` を参照してください。

## Key Features
- `devstart <issue|pr>` automatically creates `issue/<number>` branches or reuses the PR head
- `devstart issues` / `devstart prs` offers an interactive picker (requires the `gh` CLI)
- Places git worktrees under `<repo>.worktrees/`, with `--in-place` to reuse the current clone
- Launches VS Code or Cursor, and forwards custom arguments to `codex` / `claude` runners

## Setup
```bash
pnpm install
```
- Recommend Node.js 18+ and pnpm 10.18+
- Assumes `gh auth status` and `git worktree list` succeed on your machine

## Build & Test
```bash
pnpm build   # TypeScript -> dist/
pnpm test    # Vitest
pnpm start -- --help  # Inspect the CLI help with the latest build
```
Always run `pnpm build` to emit `dist/index.js` before invoking `pnpm start`.

## Usage
```bash
pnpm start -- --help
# Example: interactively pick an issue and open VS Code
pnpm start -- issues --vsc
# Example: switch branches in the existing repo without a worktree
pnpm start -- 123 --in-place
# Example: run with codex runner and forward extra arguments
pnpm start -- 456 --codex=--model=gpt-4 --codex-arg "--max-tokens=2000"
```
Common flags:
- `--vsc`, `--cursor`: open the prepared worktree in the specified editor
- `--codex[=value]`, `--claude[=value]`: enable runners and set their primary argument
- `--codex-arg <value>`, `--claude-arg <value>`: pass additional runner arguments (repeatable)
- `--in-place`: skip creating a worktree and only switch the current repo branch

## Development Flow
1. Run `pnpm build && pnpm test`
2. Apply your changes inside the worktree, then rerun `devstart` to relaunch runners or editors
3. Commit with Conventional Commit prefixes (e.g., `feat: ...`, `fix: ...`)

See `AGENTS.md` for the full contribution guide.
