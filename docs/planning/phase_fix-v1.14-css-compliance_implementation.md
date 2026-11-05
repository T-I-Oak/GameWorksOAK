# 共通ライブラリとポータルの CSS 規約適合 実装報告

レビュー指摘への対応後のバージョンは `1.14.1`。カード画像のオーナー検証は初回実装の `1.14.0` で実施した。

## 実装と規約の点検結果

- 共通ライブラリの Env Utility、Fetch Utility、DataManager、i18n、TutorialManager と共通 CSS を点検した。共通テーマのテーマ・質感・機能クラスは命名規約に沿っている。状態クラスの不一致は TutorialManager で確認し、`state-hidden`、`state-arrow-up`、`state-arrow-down` を正式なクラスとして仕様書に記載した。矢印の向きを変更する際は利用側の他のクラスを保持する。
- 旧状態クラス `hidden`、`arrow-up`、`arrow-down` の処理を削除した。公開仕様にはゲーム側が用意する DOM・クラス、CSS の責務、最小例、旧版からの移行手順を記載した。GravityFreight、BurstCascade、CanWeBecomeHeroes の各 `docs/planning/backlog.md` に「共通ライブラリの仕様変更に対応する」を起票した。各ゲームは新版を取り込む際に移行する。
- ポータルでは注目バッジ、非表示バッジ、更新履歴モーダル、ヘッダー、表示アニメーションの状態クラスを `state-*` に揃えた。カード画像は既存のメタデータから画像要素の `src` に設定し、従来の中央基準の切り抜きを CSS の `object-fit: cover` で再現した。注目期限の判定、カード順、更新履歴の読み込みは既存の JSON を使用する。
- 共通ライブラリとポータルに `!important` の宣言は見つからなかった。JavaScript によるスタイル指定は、チュートリアルの座標と、グリッドの列数に応じて算出するカードのアニメーション開始時間に使っている。

## 検証

ローカルのゲーム側 HTML・CSS・JavaScript・TypeScript とテストを横断検索した。GravityFreight、BurstCascade、CanWeBecomeHeroes は、チュートリアルの非表示に `hidden`、矢印の向きに `arrow-up` / `arrow-down` を参照している。BurstCascade はゲーム側の初期化と状態切り替えでも `hidden` を付与している。ポータルの旧クラスについては、変更した要素やセレクタへのゲーム側の依存は見つからなかった。対象テストでは、公開仕様のクラスだけを使う CSS で開閉、リセット、矢印の両方向、ゲーム側の追加クラス保持を確認した。

| 検証 | コマンド | 結果 |
| --- | --- | --- |
| 対象テスト | `npm.cmd test -- tests/implementation/lib/core/tutorialManager.test.js tests/implementation/portal/main.test.js` | 2 ファイル、38 件成功 |
| 全テスト | `npm.cmd test` | 5 ファイル、63 件成功 |
| 本番ビルド | `npm.cmd run build` | Vite ビルドと共通ライブラリのコピーが成功 |
| 差分 | `git diff --check` | 指摘なし |

## オーナー検証

| ID | 確認内容と理由 | 操作と期待結果 | 判断 |
| --- | --- | --- | --- |
| CSS-PORTAL-IMAGE | カード画像の切り抜きと重なりは実画面で確認する。 | ポータルの `1.14.0` を PC 幅とスマートフォン幅で開く。カード画像が中央を基準に枠を満たし、ロゴやバッジが画像の上に表示される。 | 確認済み。オーナーが PC と開発者ツールのスマートフォン幅エミュレーターで問題がないことを確認した。 |

## レビュー指摘への対応

公開更新履歴の先頭に Minor 単位の `1.14` を追加した。日付は 2026-11-05、種別は `etc`、日本語は「内部改善」、英語は「Internal improvements」。パッケージとロックファイルのバージョンを `1.14.1` に更新した。今回は更新履歴データとバージョン設定の変更で、追加のオーナー検証項目は設けない。

- 対象テスト `npm.cmd test -- tests/implementation/lib/core/tutorialManager.test.js tests/implementation/portal/main.test.js` は 2 ファイル、38 件成功。
- 全テスト `npm.cmd test` は 5 ファイル、63 件成功。
- 本番ビルド `npm.cmd run build` は Vite ビルドと共通ライブラリのコピーが成功。
- Node.js で JSON を読み込み、パッケージとロックファイルのバージョンが一致し、`1.14` が先頭に1件だけあり、日本語の文言が「内部改善」であることを確認した。`git diff --check` は指摘なし。
