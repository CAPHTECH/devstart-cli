# Changelog

All notable changes to this project will be documented in this file.

# Changelog

All notable changes to this project will be documented in this file.

## v0.1.1 - 2025-11-16

### Added
- `--shell` runner flag for opening an interactive shell rooted at the new worktree, plus `--shell-arg` for passing custom arguments.
- `--version` / `-V` option that prints the CLI version sourced from `package.json`.

### Fixed
- Ensured PR targets always reuse the actual head branch instead of generating `issue/<number>` branches when the same number also exists as an issue.
- `pnpm build` now succeeds after adding the shell runner thanks to stricter typing around runner execution.

### Tests & Docs
- Added dedicated unit tests for `resolveTarget`, the shell runner flags, and the version flag.
- Updated English/Japanese README help text to cover the new CLI options.

## v0.1.0 - 2025-11-15

### Added
- Interactive `devstart issues` / `devstart prs` workflows powered by the `gh` CLI.
- Automatic git worktree provisioning under `<repo>.worktrees/` plus an `--in-place` switch for existing clones.
- Runner integrations for VS Code, Cursor, Codex, and Claude launch flows.

### Changed
- Improved the overall CLI workflow and onboarding steps for faster ticket hand-offs.

### Documentation
- Added an English `README.md` and moved the original Japanese guide to `README.ja.md`.
- Documented setup, usage, and development flow for reproducible releases.

### Chore
- Added the MIT License file to clarify distribution terms.
