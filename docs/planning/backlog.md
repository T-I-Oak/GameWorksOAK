# Backlog - GameWorks OAK

## 完結タスク（本プロジェクト内のみで実施可能）
ポータルサイト自体の品質向上や共通基盤の構築など、他のリポジトリの変更を待たずに着手できるタスクです。

- [x] Viteログのエラー解消: `@import "./src/lib/styles/theme.css"` が解決できない問題の修正
- [x] update_history.json の仕様変更（タグ対応）とポータルサイトの表示改善
- [x] envライブラリの `__APP_VERSION__` 依存解消と `setAppVersion` の導入
- [ ] ポータルサイトの共通仕様準拠状況の見直しと修正
    - [x] 各プロジェクトの `update_history.json` 取得パスを仕様（`data/` 配下）に合わせる修正





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
