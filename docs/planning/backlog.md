# Backlog - GameWorks OAK

## 完結タスク（本プロジェクト内のみで実施可能）
ポータルサイト自体の品質向上や共通基盤の構築など、他のリポジトリの変更を待たずに着手できるタスクです。

- [x] Viteログのエラー解消: `@import "./src/lib/styles/theme.css"` が解決できない問題の修正
- [x] update_history.json の仕様変更（タグ対応）とポータルサイトの表示改善
- [x] envライブラリの `__APP_VERSION__` 依存解消と `setAppVersion` の導入
- [x] ポータルサイトの共通仕様準拠状況の見直しと修正
    - [x] 各プロジェクトの `update_history.json` 取得パスを仕様（`data/` 配下）に合わせる修正
    - [x] 各プロジェクトのロゴ参照先を動的に絶対URL解決するよう修正 (Step 2)
    - [x] `project_info.json` のリモートロードおよびメンテナンス簡易フォールバックUIの堅牢な実装 (Step 2)
    - [x] 更新履歴モーダル内のタグUI改善（カプセル枠線・min-widthアライメント適用） (Step 3)
    - [x] ポータル全体のスタイリッシュな極薄カスタムスクロールバーの導入 (Step 4)
- [x] [bug] サムネイルの読み込むurlが仕様と違う
- [x] ロゴ表示位置のズレ（SVGアスペクト比アライメントおよび上寄せ配置）の修正 v0.11.0
- [x] 共通仕様準拠レビューに伴う不具合・スタイルガイド非準拠の修正 v0.12.0
    - [x] `index.html` にて欠落していた `</main>` 閉じタグを追加し、セマンティック構造を修正
    - [x] `index.css`（852行）を `base.css`、`card.css`、`modal.css` に分割リファクタリング（500行制限準拠）
    - [x] スタイルガイドに従い、レイアウト等の機能クラスをすべて `UpperCamelCase` に変更（HTML, JS, CSS, テスト用HTMLすべて同期）
    - [x] スタイル詳細度の調整により、禁止事項である `!important` 指定を完全に排除






## 協調タスク（他プロジェクトの対応が必要）
他プロジェクトのリポジトリ側でのファイル配置や公開設定が必要なタスクです。他プロジェクトの完了を待ってから反映します。

- [ ] 各プロジェクトのロゴ参照先を標準パスへ変更
    - ※各プロジェクト側で assets/logo.svg が配置・公開されるのを待機
    - [ ] Gravity Freight
    - [ ] Magic Crystal
    - [x] Burst Cascade (配置・公開完了)
- [ ] 各プロジェクトの詳細データ取得元を標準パスへ変更
    - ※各プロジェクト側で data/project_info.json が配置・公開されるのを待機
    - [ ] Gravity Freight (待機中 / 移行用にポータル側 `public/data/projects/gravity-freight.json` を一時保存)
    - [ ] Magic Crystal (待機中 / 移行用にポータル側 `public/data/projects/magic-crystal.json` を一時保存)
    - [x] Burst Cascade (配置・公開完了 / 移行用にポータル側 `public/data/projects/burst-cascade.json` を一時保存)
- [ ] 各プロジェクトへの共通ライブラリ適用
    - ※共通ライブラリの公開後、各プロジェクト側で参照設定を行う必要がある
- [ ] 移行完了に伴う不要なローカルファイル・フォルダーの完全削除
    - ※すべてのゲームプロジェクト（Gravity Freight, Magic Crystal）の `project_info.json` 公開完了後に実施
    - [ ] `public/data/projects/` フォルダおよび配下の JSON ファイル群の完全削除
