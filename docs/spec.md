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
  - 各ゲームを象徴するコンセプトアートを背景に配置。
  - カプセル型のタグ（`PvP`、`ローグライク` 等）により特徴を明示。
- **レスポンシブ**: PC、タブレット、スマートフォンすべてで最適化。

## 技術スタック
- **Environment**: Node.js (Vite)
- **Deployment**: GitHub Actions (Target: `gh-pages` branch)
- **Structure**: HTML5 (Semantic HTML), CSS3 (Vanilla CSS, Custom Properties), JavaScript (Vanilla JS, ES Modules)
- **Assets**: SVG (Game Logos), PNG (Concept Arts)

## 構成
- **Header**: グラデーションロゴ。
- **Hero**: ブランドイメージを象徴するキャッチコピー。
- **Games Section**: 
  - `index.html` 内の `PROJECTS` 配列データに基づき動的に生成されるカード。
  - **プロジェクトの追加・更新**: `PROJECTS` 配列にデータを追加・編集するだけでポータルに反映される。
  - **COMING SOON 状態**:
    - `isComingSoon: true` フラグが設定されているプロジェクトは、ボタンが自動的に無効化（Disabled）される。
    - ボタンラベルは `COMING SOON` となり、クリック不可、グレーアウト表示となる。
    - ホバーエフェクトも無効化される。
  - **公開状態**:
    - `isComingSoon: false` に書き換えると、ボタンが有効化され、`url` へのリンクが機能するようになる。
  - タイトル横に配置された 「Update History」テキストリンクから、各プロジェクトの `update_history.json` を取得・表示可能。
- **Update History Modal**:
  - 各プロジェクトの `update_history.json` を非同期で取得して表示。
  - ガラスモフィズムを採用したプレミアムなデザイン。
- **Footer**: シンプルなコピーライト表示。
