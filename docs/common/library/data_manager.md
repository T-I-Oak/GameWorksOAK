# DataManager Specification

## 役割
GameWorks OAK プロジェクトにおけるデータの永続化と取得を抽象化します。
内部で `localStorage` を使用していることを隠蔽し、メタ情報（バージョン等）と実データを分離して管理します。

本ライブラリは、各ゲーム固有の ID を使ってデータを 1 つの JSON にパッケージングして保存する「インスタンス化（名前空間）保存方式」をサポートします。

---

## 永続化データ構造（内部）

### インスタンス保存（ゲームID名前空間）
`localStorage` のルートには `gameId` のみが保存され、その中に各ゲームデータが JSON オブジェクトとしてカプセル化されます。
```json
// キー: "gameA"
{
  "score": 100, // 単純保存 (getValue/setValue)
  "user_profile": { // マイグレーション付き保存 (getSavedData/setSavedData)
    "v": 1,
    "d": {
      "score": 100
    }
  }
}
```

---

## API

### インスタンス化

#### `new DataManager(gameId: string)`
*   **詳細**: 指定された `gameId`（例: `'portal'`, `'gameA'`）でインスタンスを作成します。起動時に `localStorage` から `gameId` キーのデータをすべてロードし、内部にキャッシュします。

#### `getValue(key: string): any`
*   **詳細**: キャッシュされたゲームデータ内から指定された `key` の値を単純に返します。存在しない場合は `undefined` を返します。

#### `setValue(key: string, value: any): void`
*   **詳細**: キャッシュ内の `key` に `value` を設定し、`localStorage` 全体を即座に永続化保存します。

#### `getSavedData(key: string, migrationMap: object): object`
*   **詳細**: キャッシュ内から指定された `key` のデータを取得し、内部構造からデータ本体 (`d`) のみを抽出してマイグレーションを適用し返します。
*   **移行処理**: キャッシュ内に保存されているバージョン (`v`) と現在のメジャーバージョンを比較し、`migrationMap` に定義された移行関数を順次適用します。
*   **保存タイミング**: データ不在時や保存構造が不正な場合は初期化結果を保存します。既存データを通常読み込みするだけの場合は保存しません。マイグレーションが実際に適用された場合のみ、変換後データを保存します。

#### `setSavedData(key: string, data: object): void`
*   **詳細**: データを `{ v: [メジャーバージョン], d: [データ本体] }` の構造でラップしてキャッシュに保存し、`localStorage` 全体を即座に永続化保存します。

---

## 使用例

### インスタンス化して使用する場合
```javascript
import { DataManager } from '../../../GameWorksOAK/src/lib/core/dataManager.js';

// インスタンスの生成 (gameId = 'gameA')
const manager = new DataManager('gameA');

// 1. 単純なデータの読み書き
manager.setValue('highScore', 1200);
const score = manager.getValue('highScore'); // 1200

// 2. マイグレーション付きデータの読み書き
const migrationMap = {
    init: () => ({ coins: 0, items: [] }),
    1: (data) => ({ ...data, rank: 'C' }),
};

// 取得 (内部で自動的に gameA.wallet をマイグレーション)
const wallet = manager.getSavedData('wallet', migrationMap);

// 保存
wallet.coins += 50;
manager.setSavedData('wallet', wallet);
```
