# TutorialManager

## 概要
`TutorialManager` は、各ゲームで使用できるポータブルなチュートリアル制御モジュールです。
ゲーム固有の状態判定、ハイライト座標計算、再開処理をコールバックへ委譲し、共通側ではシナリオ進行、ツールチップ表示、暗幕マスク描画のみを担当します。

## 導入
共通ライブラリを直接参照して使用します。

```javascript
import { TutorialManager } from 'https://t-i-oak.github.io/GameWorksOAK/lib/core/tutorialManager.js';

const manager = new TutorialManager(scenarios, {
    onTriggerCondition: (triggerName, context) => true,
    onCalculateRect: (highlight) => ({ top: 0, left: 0, width: 0, height: 0 }),
    onActionResume: () => {},
    onSaveIndex: (index) => {}
});
```

## シナリオ構造
シナリオは配列として渡します。共通ライブラリはゲーム固有の JSON を内包しません。

```json
[
  {
    "trigger": "turnStart",
    "title": "Step Title",
    "pages": [
      {
        "message": "チュートリアルメッセージ",
        "highlight": [
          { "elementId": "target-element", "shape": "rect", "padding": 8 }
        ]
      }
    ]
  }
]
```

## 委譲オプション
- `onTriggerCondition(triggerName, context)`: トリガー条件を判定します。
- `onCalculateRect(highlight)`: ゲーム内オブジェクトなどの座標矩形を計算します。
- `onActionResume()`: チュートリアル完了後のゲーム再開処理を実行します。
- `onSaveIndex(index)`: 進捗保存を行います。
- `initialScenarioIndex`: 再開時のシナリオ位置を指定します。
- `defaultPadding`: ハイライト余白の既定値を指定します。

## 必須DOM
利用側は以下の要素を用意します。

- `#tutorial-mask-canvas`
- `#tutorial-tooltip`
- `#tutorial-title`
- `#tutorial-message`

## スタイル
マスクとハイライトの見た目は CSS カスタムプロパティで指定できます。

- `--tutorial-mask-color`
- `--tutorial-highlight-stroke`
- `--tutorial-highlight-shadow`
- `--tutorial-highlight-shadow-blur`

## 設計意図
共通モジュールはチュートリアルの進行制御だけを扱います。
盤面、キャラクター、ゲーム内座標などのプロジェクト固有ロジックは、必ず委譲ハンドラ側に分離してください。
