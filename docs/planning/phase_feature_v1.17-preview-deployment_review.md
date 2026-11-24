# 共通公開・ポータル参照切替 レビュー

## 対象

- ブランチ: feature/v1.17-preview-deployment
- 実装コミット: 2f29238（初回実装: 012c276）
- バージョン: 1.17.1
- 計画、共通構成・公開仕様、ポータル仕様、master...HEAD の差分、実装報告、引継ぎ書を照合した。
- ソース、設定、兄弟リポジトリは変更していない。

## 判定

再レビューで REV17-01 の解消を確認。未解決指摘なし。
マージ・pushはオーナー承認待ち。引継ぎ書はレビューのまま保持する。

## 初回レビューの指摘（解消済み）

### REV17-01 [P2] 正式版の検証で仮版アセットの混在を拒否する

- 対象: scripts/deployment.js の verify 内のアセット検証（20～22行）。
- 正式版の base は /Game/ なので、/Game/preview/ も startsWith(base) を満たす。
  正式版のアセットが1件でもあれば、他のアセットが仮版を参照していても検証に成功する。
- 再現HTML:
  `<link href="/Game/assets/main.css"><script src="/Game/preview/assets/main.js"></script>`
- GITHUB_EVENT_NAME=push、GITHUB_REF=refs/heads/master、
  GITHUB_REPOSITORY=T-I-Oak/Game、DEPLOY_BASE_PATH=/Game/ で
  node scripts/deployment.js verify を子プロセス実行した結果は終了コード0。
- 正式版が仮版JavaScriptを読み込む成果物を公開でき、仮版の更新・不存在で正式版の挙動が変わる。
  公開パスの不一致を公開前に停止させる計画と整合しない。
- 期待: 正式版から予約済み preview/ 内へのアセット参照を拒否する。
  正常なアセットと異なる環境のアセットが混在するケースを回帰検証に追加する。
  全アセットが同じ誤ったパスのケースだけでは検証漏れを防げない。

## 初回レビューの確認結果

- npm.cmd test: 8ファイル、76テスト成功。
- DEPLOY_BASE_PATH=/GameWorksOAK/ の npm.cmd run build: 成功。
  master push 環境で node scripts/deployment.js verify: 成功。
- DEPLOY_BASE_PATH=/GameWorksOAK/preview/ の npm.cmd run build: 成功。
  開発ブランチ workflow_dispatch 環境で同 verify: 成功。
- git diff --check: 成功。
- クエリによる参照切替、関連URLの集約、外部リンク保持、pendingと取得失敗時の既存動作、
  ポータル自身の公開環境との独立は、実装・仕様・テストを照合した範囲で整合している。
- 配置Actionの公式ソースの target-folder と clean-exclude の扱いを確認。
  正式版で preview を保護し、仮版では配置範囲を限定する設定になっている。
- 実装報告に PRE17-01 のオーナー確認済みが記録されている。
- 6ゲームのバックログ差分を読み取り確認し、各「要望・バグ指摘」の先頭への移行項目追加を確認した。
  実装報告どおり未コミットで、一部は既存変更と混在する。

## 初回レビューからの引継ぎ事項

- 公開後の PRE17-02～04 は未実施。Actions・実公開先の相互保持・実機の成功を確認したとは扱わない。
- 6ゲームのバックログは当リポジトリのコミットに含まれない。
  各担当へ引き継ぐ記録・保存方法を実装で明確にし、既存変更を一括コミットしない。
- 再実装開始時は共通規約に従い 1.17.1 へ更新し、修正後に必要な検証と全テスト・本番ビルドを行う。
- バックログ削除、成果物削除、マージ・pushの承認は求めていない。

## 参照

- https://raw.githubusercontent.com/JamesIves/github-pages-deploy-action/v4/src/git.ts

## 再レビュー結果（1.17.1）

- 正式版検証で予約済み preview/ 配下の参照を拒否する修正を確認した。
- 正式版CSSと仮版JS、その逆の混在を拒否する子プロセス回帰テストを確認した。
- npm.cmd test: 8ファイル、78テスト成功。
- DEPLOY_BASE_PATH=/GameWorksOAK/ で npm.cmd run build 成功。
  master push の環境変数による node scripts/deployment.js verify 成功。
- DEPLOY_BASE_PATH=/GameWorksOAK/preview/ で npm.cmd run build 成功。
  開発ブランチ workflow_dispatch の環境変数による同 verify 成功。
- git diff --check 成功。
- 6ゲームの保存パッチは今回の移行追記だけを追加行に含む。
  manifestのSHA-256は全ゲームで現在のバックログと一致。
  git apply --reverse --check --ignore-space-change も全ゲームで成功した。
  各ゲームの作業ツリーは変更していない。
- パッチとmanifestは実装コミット 2f29238 に保存済み。
  マージ前の一時成果物削除後も同コミットから復元できる。
  各ゲームの追記は未コミットのままであり、各担当が既存変更を保持して扱う。
- 公開後の PRE17-02～04 は未実施。マージ・push後に Actions と公開先を確認する。
  実機操作ができない場合は未実施の内容を明示し、確認済みとしない。

## チェックリストに基づく確認

- 文書、共通構成、バージョン、公開インターフェース、ポータル仕様と実装・テストは整合している。
- update_history.json は 1.17 単位の利用者向け変更を記載し、Patchの追加項目は不要。
- 表示・ユーザビリティ PRE17-01 は実装報告の確認済み判断を維持。今回の修正で表示変更なし。
- ゲーム画面専用の操作・没入規定とゲーム担当向けの共通部公開前照会は、共通部・ポータル担当には適用外。
- 公開後検証は未実施として区別する。削除・マージ・pushは承認後に行う。

## マージ承認用草案

- 未解決指摘: なし。REV17-01 は修正と回帰テストにより解消済み。
- バックログ削除予定: なし。共通側のバックログに削除対象はない。
  各ゲームの移行項目は後続作業のため保持する。
- 承認後、リポジトリ内の全 dev_・tmp_・phase_ 成果物を安全確認して削除・再走査する。
  対象には計画・実装報告・本レビュー・引継ぎ書・6ゲームの保存パッチ一式・一時画面確認ファイルを含む。
  保存パッチは 2f29238 のGit履歴に残る。
- 追跡済み成果物の削除とレビュー結果をコミットし、masterへマージ・origin/masterへpushする。
  ローカルmasterとリモートmasterのコミットID一致を確認する。
- 公開後の PRE17-02～04 の検証結果と、実施できなかった項目を報告する。
