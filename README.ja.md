# Devstart CLI

TypeScript製のCLIツールで、GitHub Issue/PRから作業ブランチやワークツリーを瞬時に用意し、任意のエディタ・エージェントを起動できます。`node` + `pnpm` さえあればローカルに環境を再現できます。

## 主な機能
- `devstart <issue|pr>` で `issue/<番号>` や PRヘッドブランチを自動作成
- `devstart issues` / `devstart prs` による対話的なチケット選択 (`gh` CLI必須)
- `<repo>.worktrees/` 配下に自動で git worktree を配置し、`--in-place` で既存リポのブランチ切替も可能
- VS Code / Cursor の起動や、`codex`/`claude` コマンドへ任意引数を転送する Runner 連携

## セットアップ
```bash
pnpm install
```
- Node.js 18+ と pnpm 10.18 以上を推奨
- `gh auth status` と `git worktree list` が成功する状態を前提とします

## ビルドとテスト
```bash
pnpm build   # TypeScript -> dist/
pnpm test    # Vitest
pnpm start -- --help  # 最新ビルドでCLIヘルプ確認
```
`pnpm build` で `dist/index.js` を生成してから `pnpm start` を実行してください。

## 使い方
```bash
pnpm start -- --help
# 例: Issueを選択してVS Codeを開く
pnpm start -- issues --vsc
# 例: 既存リポを使ってブランチ切替のみ
pnpm start -- 123 --in-place
# 例: codex runnerへ引数を付けて実行
pnpm start -- 456 --codex=--model=gpt-4 --codex-arg "--max-tokens=2000"
```
主なオプション:
- `--vsc`, `--cursor`: ワークツリーを該当エディタで開く
- `--codex[=value]`, `--claude[=value]`: Runnerを有効化し最初の引数を指定
- `--codex-arg <value>`, `--claude-arg <value>`: Runnerへ追加引数（複数回指定可）
- `--shell[=path]`, `--shell-arg <value>`: ワークツリー上でインタラクティブシェルを開く（`$DEVSTART_SHELL`→`$SHELL`→`/bin/bash`の順で決定）
- `--version`, `-V`: CLIのバージョンを表示して終了
- `--in-place`: worktreeを作らず現在のリポでブランチ切替

## 開発フロー
1. `pnpm build && pnpm test`
2. ワークツリーで修正後、`devstart` を再実行してランナーやエディタを開く
3. Conventional Commits (`feat: ...`, `fix: ...`) に従ってコミット

詳細なコントリビューション手順は `AGENTS.md` を参照してください。
