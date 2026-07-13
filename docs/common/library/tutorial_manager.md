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
    initialState: loadTutorialState(),
    onSaveState: (state) => saveTutorialState(state),
    nextButtonSelector: '#tutorial-next-btn'
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

## 進行状態
TutorialManager の外部 interface では、シナリオ配列上の raw index や次回開始 index を使用しません。
進行状態は、完了済みシナリオ id を持つ state として保存・復元します。

- raw index: `scenarios` 配列上の位置です。`type: "defaults"` などの非表示レコードも含み、manager 内部でのみ使用します。
- display index: 実際に表示されるシナリオだけを数えた位置です。`type: "defaults"` は含みません。
- completed: 完了済みの表示シナリオ id の配列です。

`initialState` は任意です。未指定、`null`、または不正な形式の場合、manager は初期状態として扱います。

```json
{
  "completed": ["turn-start"]
}
```

`onSaveState(state)` には、正規化済みの state を渡します。利用側はこの state をそのまま保存し、再開時に `initialState` として渡します。

```javascript
const manager = new TutorialManager(scenarios, {
    initialState: savedState,
    onSaveState: (state) => {
        savedState = state;
    }
});
```

## 表示条件と requires
`checkTrigger(triggerName, context)` または `willTrigger(triggerName, context)` を呼ぶと、manager はシナリオ配列を先頭から順に走査します。
以下をすべて満たす最初の表示シナリオだけが発火候補になります。

1. `type: "defaults"` ではない
2. `completed` に含まれていない
3. `trigger` が `triggerName` と一致する
4. `requires` が満たされている
5. `onTriggerCondition(triggerName, context)` が `true` を返す

`requires` は、そのシナリオを表示するために完了している必要があるシナリオ id の配列です。

```json
{
  "id": "joined",
  "trigger": "afterBoth",
  "requires": ["branch-a-end", "branch-b-end"]
}
```

`requires` の扱いは以下です。

- 未指定: 直前の表示シナリオを要求します。先頭の表示シナリオでは `[]` と同じ扱いです。
- `[]`: 依存なし。未完了で trigger が一致すれば発火候補になります。
- `["id-a", "id-b"]`: 指定されたすべてのシナリオが completed に含まれると発火候補になります。

`type: "defaults"` は、暗黙 `requires` の「直前の表示シナリオ」には含みません。

### 分岐と合流の例

```json
[
  { "id": "scenario-1", "trigger": "start" },
  { "id": "scenario-A2", "trigger": "screenA", "requires": ["scenario-1"] },
  { "id": "scenario-A3", "trigger": "screenADetail" },
  { "id": "scenario-B2", "trigger": "screenB", "requires": ["scenario-1"] },
  { "id": "scenario-B3", "trigger": "screenBDetail" },
  {
    "id": "scenario-4",
    "trigger": "afterBoth",
    "requires": ["scenario-A3", "scenario-B3"]
  }
]
```

この場合、`scenario-1` 完了後は `scenario-A2` と `scenario-B2` が順不同で発火可能になります。
`scenario-A3` と `scenario-B3` が両方完了すると、`scenario-4` が発火可能になります。

## defaults レコード
`type: "defaults"` のレコードは、表示対象にはなりません。進行状態にも含まれず、`trigger` 判定や `requires` 判定の対象にもなりません。

manager は `checkTrigger()` / `willTrigger()` の走査中に、配列順で defaults を蓄積します。発火した表示シナリオには、その時点までに蓄積された `highlightDefaults` を適用します。
これは進行順ではなく、シナリオ定義上の位置に基づく設定スコープです。

`highlightDefaults` 内の個別キーに `null` を指定した場合、そのキーを蓄積中の defaults から削除します。

```json
{
  "type": "defaults",
  "highlightDefaults": {
    "padding": null
  }
}
```

`highlightDefaults: null` を指定した場合、蓄積中の defaults 全体をクリアします。

```json
{
  "type": "defaults",
  "highlightDefaults": null
}
```

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
- `initialState`: 再開時の進行状態を指定します。
- `onSaveState(state)`: 進行状態の保存を行います。
- `nextButtonSelector`: Next / OK ボタンを TutorialManager に管理させる場合の selector を指定します。
- `onBeforeShowPage(context)`: ページ表示前の処理を実行します。Promise を返した場合は解決後に表示します。
- `onAfterShowPage(context)`: ページ表示後の処理を実行します。
- `onBeforeHideScenario(context)`: シナリオ終了などで tutorial UI を閉じる前の処理を実行します。
- `onBeforeAdvance(context)`: Next / OK 進行前の処理を実行します。
- `onAfterAdvance(context)`: Next / OK 進行後の処理を実行します。
- `defaultPadding`: ハイライト余白の既定値を指定します。
- `defaultRadius`: `rect` ハイライトの角丸半径の既定値を指定します。

## 必須DOM
利用側は以下の要素を用意します。

- `#tutorial-mask-canvas`
- `#tutorial-tooltip`
- `#tutorial-title`
- `#tutorial-message`

Next / OK ボタンの制御を TutorialManager に委譲する場合は、`nextButtonSelector` で指定するボタンも用意します。

```html
<button id="tutorial-next-btn">Next</button>
```

## 制御モード
移行期間中は、`nextButtonSelector` の有無で制御モードを切り替えます。

### 手動制御モード
`nextButtonSelector` 未指定時は、従来互換の手動制御モードです。

- 利用側アプリが Next / OK ボタンの click handler を登録します。
- 利用側アプリが `advanceScenario()` を直接呼びます。
- lifecycle hook の実行は保証しません。
- 既存アプリはコード変更なしで従来通り動作します。

### 管理制御モード
`nextButtonSelector` 指定時は、TutorialManager が Next / OK ボタンを管理します。

- TutorialManager が対象ボタンに click handler を1回登録します。
- 登録 handler は TutorialManager 内部の進行処理を呼びます。
- 非同期進行中は二重クリック防止のため進行中フラグを立て、対象ボタンを一時的に `disabled` にします。
- 利用側アプリは `advanceScenario()` を直接呼びません。
- 管理制御モード中に外部から `advanceScenario()` が呼ばれた場合は、二重進行を避けるため例外にします。
- lifecycle hook は管理制御モードでのみ保証します。

全アプリが管理制御モードへ移行した後は、`nextButtonSelector` 未指定時にデフォルト selector を使用する仕様へ整理する予定です。

## lifecycle hook
管理制御モードでは、ページ表示とシナリオ終了の前後に hook を指定できます。
hook は `await Promise.resolve(hook(context))` 相当で扱い、同期 / 非同期の違いを TutorialManager 側で吸収します。
hook 内で例外が発生した場合は隠蔽しません。

```javascript
const manager = new TutorialManager(scenarios, {
    nextButtonSelector: '#tutorial-next-btn',
    onBeforeShowPage: async (context) => {},
    onAfterShowPage: (context) => {},
    onBeforeHideScenario: async (context) => {},
    onBeforeAdvance: async (context) => {},
    onAfterAdvance: async (context) => {}
});
```

`context` は以下を持ちます。

```javascript
{
    scenario,
    page,
    scenarioIndex,
    pageIndex,
    highlights
}
```

- `scenario`: 表示中のシナリオオブジェクトです。
- `page`: 表示対象または進行元のページオブジェクトです。
- `scenarioIndex`: 表示シナリオだけを数えた display index です。
- `pageIndex`: シナリオ内のページ index です。
- `highlights`: defaults、シナリオ、ページ、個別 highlight を解決したハイライト配列です。

hook の実行順は以下です。

- ページ表示時: `onBeforeShowPage` → mask / tooltip 表示 → `onAfterShowPage`
- Next / OK 進行時: `onBeforeAdvance` → 次ページ表示またはシナリオ終了処理 → `onAfterAdvance`
- シナリオ終了時または `resetTutorial()` 時: UI を閉じる前に `onBeforeHideScenario`

## スタイル
マスクとハイライトの見た目は CSS カスタムプロパティで指定できます。

- `--tutorial-mask-color`
- `--tutorial-highlight-stroke`
- `--tutorial-highlight-shadow`
- `--tutorial-highlight-shadow-blur`

## 設計意図
共通モジュールはチュートリアルの進行制御だけを扱います。
盤面、キャラクター、ゲーム内座標などのプロジェクト固有ロジックは、必ず委譲ハンドラ側に分離してください。
