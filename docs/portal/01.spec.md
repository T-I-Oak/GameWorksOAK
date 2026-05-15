# Specification - GameWorks OAK

## 概要
GameWorks OAK のポータルサイト（GitHub Pages）。
T.I.OAK が開発中の複数のゲームを紹介し、各ゲームへの入り口となる。

## ターゲットゲーム
1. **Burst Cascade**
   - ジャンル: 対戦型陣取り・ヘキサストラテジー
   - 特徴: Burstによる連続ターンの連鎖。
   - ステータス: Coming Soon
2. **Magic Crystal**
   - ジャンル: ステージクリア型パズルアクション
   - 特徴: 「大地の記憶」を操る魔法使いの冒険。
   - ステータス: Coming Soon
3. **Gravity Freight**
   - ジャンル: ローグライク・航行シミュレーション
   - 特徴: 天体の重力予測と機体ビルド、スチームパンクな世界観。
   - ステータス: Coming Soon

## デザインコンセプト
- **プレミアム感**: ダークモードを基調とし、ネオンカラーやグラデーションを効果的に使用。
- **没入感**: ガラスモフィズム、微細なアニメーション、ホバーエフェクトを採用。
- **カードデザイン**: 
  - 各ゲームを象徴するコンセプトアート（`.game-img`）を背景に配置。
  - **タイトル・ロゴのオーバーレイ**: タイトル（ロゴまたはテキスト）を画像の上部・左寄せに重ねて表示。視認性向上のため強力なドロップシャドウを適用。
  - **ステータスバッジ**: `COMING SOON` 等のバッジを画像内の **右下** に配置。
  - カプセル型のタグ（`PvP`、`ローグライク` 等）により特徴を明示。
- **レスポンシブ**: PC、タブレット、スマートフォンすべてで最適化。

## 技術スタック
- **Environment**: Node.js (Vite)
- **Deployment**: GitHub Actions (Target: `gh-pages` branch)
- **Structure**: HTML5 (Semantic HTML), CSS3 (Vanilla CSS, Custom Properties), JavaScript (Vanilla JS, ES Modules)
- **Assets**: SVG (Game Logos), PNG (Concept Arts)

## 構成
- **Header**: 
  - **インラインロゴ**: Inkscape で調整されたパスデータを `index.html` に直接インライン展開。CSS 変数や外部ファイルに依存せず、いかなる環境でも 100% 正確な造形を維持する。
  - **Shrinking Effect**: ユーザーのスクロールに合わせてヘッダー（100px → 70px）とロゴ（60px → 40px）がスムーズに縮小し、コンテンツの閲覧エリアを広げる。
  - **Cog Rotation**: スクロール量に連動してロゴ内のギア（歯車）が回転する。SVG の `rotate` 属性と幾何学的な中心座標（Cog 1: 110.72, 23.20 / Cog 2: 100, 100）を使用することで、軸のブレがない精密な回転を実現。2つのギアは噛み合わせを考慮し、逆方向に回転する。
- **Hero**: ブランドイメージを象徴するキャッチコピー。
- **Games Section**: 
  - `public/data/project_list.json` (マニフェスト) および `public/data/projects/*.json` (詳細データ) に基づき動的に生成されるカード。
  - **プロジェクトの追加・更新**: 該当する JSON ファイルを追加・編集し、マニフェストを更新するだけで反映される。
  - **ロゴ表示**: 外部 SVG ファイルを JavaScript で fetch して `innerHTML` でインライン展開することで、メインページの CSS/フォントを適用する。
  - **COMING SOON 状態**:
    - `button.disabled: true` に設定されているプロジェクトは、ボタンが自動的に無効化（Disabled）される。
    - ボタンラベルやステータスバッジの文言、個別の配色（スタイル）も JSON で定義可能。
  - **公開状態**:
    - `isComingSoon: false` に書き換えると、ボタンが有効化され、ラベルが `PLAY NOW` となり、`url` へのリンクが機能するようになる。
  - **Update History**: 各カードの右下に配置されたテキストリンクから、各プロジェクトの `update_history.json` を取得・表示可能。
- **Update History Modal**:
  - 各プロジェクトの `update_history.json` を非同期で取得して表示。
  - **構造**: `modal-header` と `modal-body` を分離し、タイトルと閉じるボタンを上部に固定。
  - デザイン: ガラスモフィズムを採用したプレミアムかつインダストリアルなデザイン。派手な装飾を排し、情報の読みやすさを最優先。
- **Footer**: シンプルなコピーライト表示。
