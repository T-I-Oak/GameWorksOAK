# 共通公開・ポータル参照切替の実装報告

## 実装内容

- package.json / package-lock.json を初回実装の 1.17.0 に更新。
- 共通 workflow_call を publish.yml に作成。ポータルの deploy.yml から同一コミットのワークフローを呼び出す。
- master push は正式版、master以外のブランチの workflow_dispatch は仮版。それ以外は公開前にエラー。
- 公開先入力なし。共通スクリプトで base / target を決定し、ビルドの index.html のパスと dist/preview 予約領域を検証。
- 同一リポジトリの公開を直列化。正式版は preview を清掃対象から除外、仮版は preview 内だけ更新。force push は無効。
- 配置アクションが GITHUB_WORKSPACE で git を実行するため、ルートにも呼び出し元を checkout。ビルド用 app と公開済み共通部 GameWorksOAK を隣接配置。
- ポータルは自身のソース・補助スクリプトを使用し、ゲームは共通部 master を参照する。
- projectUrls.js へ query 判定と自ゲームURLの環境切替を集約。素材・プレイ先・紹介JSON・更新履歴へ適用。
- 外部URL保持、既存pending・取得失敗の簡易表示を維持。言語切替時もqueryを維持。
- Preview タグを言語選択の左に配置し、小画面のヘッダーを調整。
- Vite base と HTML の base href を同じビルド時公開パスに連動。
- 共通公開手順・標準URL仕様・ポータル仕様・関連手順と1.17更新履歴を更新。

## 6ゲームへの追記

BurstCascade / GravityFreight / MagicCrystal / CanWeBecomeHeroes / MyPalette / PrismDrift の
 docs/planning/backlog.md の「要望・バグ指摘」先頭へ移行作業を追加した。
BurstCascade と PrismDrift は同見出しがなかったため追加し、既存見出し・項目を保持。
公開済み共通 master を依存条件とし、共通呼び出し・build/dist/base・標準URL・相互保持とポータル連携を記載。
コード・ワークフローの移行は行っていない。兄弟リポジトリのコミット・pushは行っていない。
着手時、BurstCascade / GravityFreight / CanWeBecomeHeroes はバックログに既存変更あり。
MyPalette は fix/v0.37-browser-interaction で複数の実装変更、PrismDrift は dev_add_t_tipping_test で実装・バックログ変更あり。
MagicCrystal はクリーン。既存変更を保持し、バックログのみを追記した。
書き込みは合意済みスコープのサンドボックス権限昇格で実施した。

## 検証

- TDD: npm.cmd test -- tests/implementation/portal/projectUrls.test.js tests/implementation/deployment.test.js
  は実装前にモジュール不在で失敗、実装後は4件成功。
- npm.cmd test: 最終 8ファイル / 76テスト成功。
  正式版・仮版ポータル×query 3通り、紹介JSON・SVG・画像・プレイ先・履歴・言語切替、取得失敗、pendingを含む。
  公開イベント/ref、生成アセットのbase不一致、dist/preview禁止を検証。
- npm.cmd run build: 正式版ビルド成功、copy-lib成功。
- DEPLOY_BASE_PATH=/GameWorksOAK/ を指定した npm.cmd run build と
  GITHUB_EVENT_NAME=push / GITHUB_REF=refs/heads/master / GITHUB_REPOSITORY=T-I-Oak/GameWorksOAK
  の node scripts/deployment.js verify: 成功。
- DEPLOY_BASE_PATH=/GameWorksOAK/preview/ を指定した npm.cmd run build と
  GITHUB_EVENT_NAME=workflow_dispatch / GITHUB_REF=refs/heads/feature/v1.17-preview-deployment /
  GITHUB_REPOSITORY=T-I-Oak/GameWorksOAK の node scripts/deployment.js verify: 成功。
- PyYAMLによる2ワークフローの構文読み取り: 成功。git diff --check: 成功。
- 一時検証スクリプト node docs/planning/tmp_check-preview.cjs:
  ヘッドレスEdgeで幅320/390/768/1280pxのタグ・言語選択・ロゴの非重複を確認。
  v1.17.0表示とqueryなしのタグ非表示も確認。リモートゲームデータはフィクスチャ。
  390pxのスクリーンショットも目視確認。実機確認とは区別する。
- 相互保持は配置アクションの target-folder / clean-exclude 設定と公式実装を照合。
  Actions実行・実公開先での相互保持・公開URL表示は未実施。公開後に次担当が実施する引継ぎ事項とする。

## 失敗の調査と対応

- 新規仕様テスト初回はNode環境のlocalStorage.clearが未提供で失敗。
  既存テストと同様のストレージモックを用意し、全テスト成功を確認。
- 仮版生成物の検証が既存HTMLの正式版固定baseを検出。%BASE_URL%へ変更し両公開パスで成功。
- サンドボックス内のEdge起動に失敗。昇格したブラウザーからサンドボックス内サーバーにも接続できなかった。
  検証用サーバーとヘッドレスEdgeを同じ昇格実行で起動して成功。検証用サーバーは終了。

## オーナー検証

確認バージョンは全項目 1.17.0。PRE17-01はbadgeへの変更後、オーナーの「okです」により見た目・ユーザビリティの確認済み。仕様に基づく正誤は実装担当が判定する。公開後の機械的検証をオーナーの操作確認として依頼しない。バックログへの保留追加は行っていない。

| ID | 確認内容・理由 | 手順と期待結果 | 判断 |
| --- | --- | --- | --- |
| PRE17-01 | Previewタグの見た目・ユーザビリティ。仕様による表示条件や重なりの正誤は担当が検証済み | ローカルポータルをpreview=on付きで開き、言語切替。タグが言語選択の左に表示され、切替後も残る。queryを外すと消える。PC・スマートフォン幅で重ならない | 項目確認済み（badge使用への変更後、オーナー「okです」） |

ローカル確認用URL: http://127.0.0.1:3017/GameWorksOAK/?preview=on
PRE17-01確認後、確認用サーバーを停止。
オーナーから「あなたはマージしません」と指示を受け、実装担当はマージ・pushを行わず、公開後の検証を次担当へ引き継ぐ方針を提示した。その後「作業を進めてください」を受領した。
公開後の機械的検証はオーナー検証から分離し、以下の次担当作業として記録する。

## オーナーフィードバックへの対応

- Preview専用クラスを作らずbadgeを使う指示に対応。タグは既存の `badge texture-info` を使用し、PreviewTagを削除。絶対配置を `.GameImg > .badge` に限定し、カードの配置を保持してヘッダーでは通常のflex配置を使う。

- badge変更後の再検証: npm.cmd test は76件成功、npm.cmd run build 成功。ヘッドレスEdgeの幅320/390/768/1280pxで重なりなし。オーナーから「okです」を受領。

## 次担当が公開後に実施する検証

- PRE17-02: master pushで正式版、開発ブランチの手動実行で仮版が公開され、masterの手動実行が失敗すること。対象コミット・共通部参照・転送先を照合する。
- PRE17-03: 正式版・仮版を順に更新し、他方のindex.htmlと素材が保持されることを実公開先で検証する。
- PRE17-04: 公開URLと対象実機で素材・表示・バージョンを確認する。操作可能な実機がなければ未実施として報告し、ローカル検証で代替済みとしない。
- 上記はローカルでの成功とは区別し、公開後に実施する。各ゲームのpreview連携確認は各ゲームの後続移行で扱う。
- 実装担当はマージ・pushを行わない。次担当もレビュー結果と所定のマージ承認を得るまで実行しない。
- 6ゲームのバックログは各作業ツリーへ反映済みだが未コミット。既存変更と混在するため、次担当が各リポジトリの担当と取り扱いを調整する。共通側の終了コミットには含められない。

## REV17-01への対応（1.17.1）

- 再実装開始時にpackage.jsonとpackage-lock.jsonを1.17.1へ更新。
- 正式版の正常なCSSと仮版のJavaScriptが混在する再現HTMLを子プロセスで検証する回帰テストを先に追加し、修正前に終了コード0となってテストが失敗することを確認。
- scripts/deployment.jsで正式版検証時にbase配下の予約済みpreview/参照を拒否する。仮版側への正式版アセット混在も回帰テストへ追加。
- npm.cmd test -- tests/implementation/deployment.test.js: 修正後5件成功。
- npm.cmd test: 8ファイル・78件成功。
- DEPLOY_BASE_PATH=/GameWorksOAK/ で npm.cmd run build 成功。その後 GITHUB_EVENT_NAME=push、GITHUB_REF=refs/heads/master、GITHUB_REPOSITORY=T-I-Oak/GameWorksOAK で node scripts/deployment.js verify 成功。
- DEPLOY_BASE_PATH=/GameWorksOAK/preview/ で npm.cmd run build 成功。その後 GITHUB_EVENT_NAME=workflow_dispatch、GITHUB_REF=refs/heads/feature/v1.17-preview-deployment、GITHUB_REPOSITORY=T-I-Oak/GameWorksOAK で node scripts/deployment.js verify 成功。
- 今回は公開前検証とバージョン設定の修正であり、見た目・ユーザビリティの変更はない。PRE17-01の確認済み判断を維持し、再確認は依頼しない。
- PRE17-02～04は公開後の担当作業として未実施を維持する。マージ・pushは行わない。

### 6ゲームのバックログ追記の保存・引継ぎ方法

- phase_feature_v1.17-preview-deployment_backlogs/ に各ゲームの今回追記だけのpatchと、確認時のバックログ全体SHA-256をmanifest.jsonとして保存した。既存の未コミット変更はパッチの追加行へ含めない。
- これらも共通側の実装終了コミットへ含め、現在の兄弟作業ツリー以外にも今回の追記をGit履歴で保存する。兄弟リポジトリのコミット・pushは行わない。
- 次担当は同名の移行項目が既にある場合は再適用せず、現状の項目を各ゲーム担当へ引き継ぐ。既存変更を一括コミットしない。
- 追記が失われた場合は、終了コミットの docs/planning/phase_feature_v1.17-preview-deployment_backlogs/<Repository>.patch をGit履歴から取得し、対象ゲームで git apply --check <patchの絶対パス> を先に実行する。成功時のみ適用し、競合時は既存内容を読んで移行項目だけを追加する。
- マージ前のphase_削除後も終了コミットから復元できる。manifestのハッシュは確認時点の照合用であり、別開発が進んだ後の一致を必須条件にしない。
- 6ゲームすべてで git apply --reverse --check --ignore-space-change <patch> が成功し、保存パッチと現在の追記の対応を確認。読み取り確認のみで各作業ツリーは変更していない。
