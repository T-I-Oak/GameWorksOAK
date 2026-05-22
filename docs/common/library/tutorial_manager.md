# TutorialManager

## 概要
`TutorialManager` は、各ゲームで使用できるポータブルなチュートリアル制御モジュールです。
ゲーム固有の状態判定、ハイライト座標計算、再開処理をコールバックへ委譲し、共通側ではシナリオ進行、ツールチップ表示、暗幕マスク描画を担当します。

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
    "type": "defaults",
    "highlightDefaults": {
      "shape": "rect",
      "padding": { "x": 8, "y": 6 },
      "radius": 0
    }
  },
  {
    "id": "turn-start",
    "trigger": "turnStart",
    "title": "Step Title",
    "pages": [
      {
        "message": "チュートリアルメッセージ",
        "highlight": [
          { "elementId": "target-element" }
        ]
      }
    ]
  }
]
```

## 進行位置
TutorialManager の外部 interface では、シナリオ配列上の raw index を使用しません。

- raw index: `scenarios` 配列上の位置です。`type: "defaults"` などの非表示レコードも含み、manager 内部でのみ使用します。
- display index: 実際に表示されるシナリオだけを数えた位置です。`type: "defaults"` は含みません。

`initialScenarioIndex` は以下のように解決されます。

- `number`: display index として扱います。
- `string`: 表示シナリオの `id` として扱い、一致するシナリオの raw index に変換します。

`onSaveIndex(value)` には、次に開始する表示シナリオの識別子を渡します。

- 次の表示シナリオに `id` がある場合は、その `id` を渡します。
- `id` がない場合は、その表示シナリオの display index を渡します。
- 次の表示シナリオがない場合は、表示シナリオ数を渡します。

## defaults レコード
`type: "defaults"` のレコードは、表示対象にはなりません。指定された表示シナリオを開始する際、その raw index より前にある defaults レコードの `highlightDefaults` をすべて適用します。

保存された位置から再開する場合も、先頭から再開位置の手前までを確認し、それ以前の defaults を適用します。

ハイライト設定は以下の順で解決します。後の値が前の値を上書きします。

1. `TutorialManager` の options で指定した既定値
2. 表示シナリオより前の `type: "defaults"` の `highlightDefaults`
3. 表示シナリオの `highlightDefaults`
4. ページの `highlightDefaults`
5. 個別 `highlight`

## ハイライト形状
`highlight.shape` は以下を指定できます。

- `rect`: padding 適用後の矩形を角丸矩形として描画します。
- `ellipse`: 対象矩形の縦横比を維持した楕円として描画します。
- `circle`: 対象矩形の大きい辺を直径とする真円として描画します。
- 未指定: `ellipse` と同じ扱いです。

## padding
`padding` と `defaultPadding` は、数値または `{ "x": number, "y": number }` で指定できます。

```json
{ "padding": 8 }
{ "padding": { "x": 12, "y": 6 } }
```

- `rect`: 左右に `x`、上下に `y` を加えます。
- `ellipse`: 横半径に `x`、縦半径に `y` を加えます。
- `circle`: 真円を保つため、`x` と `y` の大きい方を半径に加えます。

個別 `highlight.padding` が指定されていない場合は `defaultPadding` を使います。

## radius
`rect` の角丸半径は `radius` で指定できます。個別 `highlight.radius` が指定されていない場合は `defaultRadius` を使います。

`defaultRadius` 未指定時の既定値は、従来互換の `24` です。角丸なしの矩形を既定にしたい場合は `defaultRadius: 0` を指定します。

radius は padding 適用後の実効矩形サイズに合わせて、以下の範囲に丸めます。

```text
min(radius, width / 2, height / 2)
```

そのため、`radius * 2` より高さや幅が小さい場合でも、描画パスは破綻せず、カプセル形または円に近い形になります。

## 委譲オプション
- `onTriggerCondition(triggerName, context)`: トリガー条件を判定します。
- `onCalculateRect(highlight)`: ゲーム内オブジェクトなどの座標矩形を計算します。
- `onActionResume()`: チュートリアル完了後のゲーム再開処理を実行します。
- `onSaveIndex(index)`: 進捗保存を行います。
- `initialScenarioIndex`: 再開時の表示シナリオ位置またはシナリオ id を指定します。
- `defaultPadding`: ハイライト余白の既定値を指定します。
- `defaultRadius`: `rect` ハイライトの角丸半径の既定値を指定します。

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
