# Repository Guidelines

## プロジェクト構成とモジュール
このリポジトリはTypeScript製のCLIで、`src/index.ts`が入口となり、チケット解決→ワークツリー作成→エディタ/ランナー起動までを直列に実行します。主なモジュールは以下のとおりです。
- `src/worktree.ts`: git worktree管理、`ensureParentDirectory`や`openWorktree`などのファイル操作を担当。`<repo>.worktrees/`配下の命名一貫性を守ってください。
- `src/options.ts` / `src/interactive.ts` / `src/github.ts`: 引数解析、選択UI、`gh repo view`経由のメタデータ取得を分離。純粋関数と副作用関数をファイル内で明確に分ける方針です。
- `src/commands.ts`: `runCommand`ヘルパーで外部コマンドの同期実行を一元管理し、全ログをCLI利用者へ透過します。
- `src/types.ts`: `IssueTarget`, `PrTarget`, `CliMode`などの型を集約。新規機能はここで共有型を定義してから実装してください。
- `src/__tests__`: Vitestベースのユニットとワークツリー境界テストを配置。テストデータは`tmp`ディレクトリを都度生成して破棄します。
補助ディレクトリとして`dist/`（ビルド成果物）、`node_modules/`（依存）、`vitest.config.ts`と`tsconfig.json`（ツールチェーン設定）が存在します。Example layout: `~/myrepo.worktrees/FEAT-123` mirrors ticket IDs so reviewers instantly see ownership.

## ビルド・テスト・ローカル開発
- `pnpm install`: 依存の同期。pnpm 10.18.0以降を使用し、`pnpm env use --global`でバージョンを固定するのが推奨です。
- `pnpm build`: `tsc`でES2020ターゲットを生成し、型整合性を検証。`dist/`差分を必ずレビューしてください。
- `pnpm start`: 最新ビルドを使ってCLIを実行。`pnpm start -- --ticket DEV-123`のように実行例をPRに添付するとレビューが円滑です。
- `pnpm test`: `vitest run`をCI同等の設定で実行。`pnpm test -- --runInBand`でシリアル実行できます。
- `pnpm vitest -- --watch` / `pnpm vitest -- --ui`: 開発中の反復テスト。長時間セッションではこちらを活用してください。
Quick pre-push checklist: `pnpm build && pnpm test && pnpm start -- --help` keeps artifacts reproducible.

## コーディングスタイルと命名
`tsconfig`は`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`を有効化しています。ESMを前提とした`import type`構文と、2スペースインデント＋`const`優先を徹底してください。ファイル名は`kebab-case.ts`、テストは`<name>.test.ts`、CLIフラグは`--cursor`のようなローワーケバブで統一します。外部コマンドは`runCommand`経由に限定し、エラーメッセージは利用者に理解できる一文＋`process.exit(1)`で締めます。ユーザー向け出力は`buildHelpMessage`に揃え、複数行テンプレートを再利用してください。Keep functions under 60 lines and favor descriptive verbs like `resolveTarget` or `selectTicketFromList`.

## テスト指針
フレームワークはVitestのみです。新規関数を追加したら`src/__tests__`配下で`describe('<module>')`→`it('behaves ...')`形式のケースを追加し、`tmpdir`ユーティリティでファイルI/Oを隔離します。ワークツリー操作や`git rev-parse`ラッパーは必ずモックし、副作用を観察する場合でも`fs.mkdtempSync`で実ディレクトリを作成→後始末してください。CLI挙動を変更した際は、`pnpm start -- --help`の更新内容をPR説明に貼り、`pnpm test`結果（実行ログ）を添えてください。重要分岐（`parseArgs`, `ensureWorktreeReady`, `runRunners`）の分岐網羅を最低ラインとし、回帰が懸念される場合はスナップショットまたはゴールデンファイルを追加します。Record flaky scenarios inside the PR body so reviewers can replay `pnpm vitest --runInBand` locally.

## コミットとPRガイドライン
履歴はConventional Commits（例: `feat: support in-place branch switching`）を採用しています。単一責務のコミットを意識し、破壊的変更には`feat!:`を利用してください。PRでは以下を満たしてください。
1. 課題番号やGitHub Issueを`Fixes #123`形式でリンク。
2. 変更概要・アーキテクチャの意図・テスト結果（`pnpm build && pnpm test`ログ、必要ならCLI出力）を箇条書きで記載。
3. 振る舞い変更時は新旧のCLI出力、あるいはワークツリー構造例（`~/repo.worktrees/<ticket>`）を添付。
4. Reviewerが再現できるよう前提ツール（`gh`, `git`, `pnpm`）のバージョンまたは制約をコメントに明記。
Large refactors should be split into sequential `refactor:` commits to preserve bisectability.

## 環境とセキュリティのメモ
CLIは`gh` CLIとgit worktreeに強く依存します。`gh auth status`と`git worktree list`が成功することを事前確認し、資格情報をコードに埋め込まないでください。新しい設定値は`.env`ではなく`options.ts`のCLIフラグか`interactive.ts`のプロンプトで受け取る設計に揃えます。`runCommand`での外部実行はすべて同期ブロッキングのため、追加コマンドを導入する際はタイムアウト・再試行・ユーザー文言を必ず設計書に記し、未処理のスタックトレースが表示されないよう`HelpRequested`相当の例外を用意してください。マシンに複数のワークツリールートがある場合でも、このCLIは`<repo>.worktrees`ディレクトリを前提としているため、手動操作でも同パスを維持する必要があります。Security tip: never log raw tokens; sanitize output with `***` before printing to the console.
