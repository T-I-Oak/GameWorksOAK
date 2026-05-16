# DataManager Specification

## 役割
GameWorks OAK プロジェクトにおけるデータの永続化と取得を抽象化します。
内部で `localStorage` を使用していることを隠蔽し、メタ情報（バージョン等）と実データを分離して管理します。

## 永続化データ構造（内部）
ストレージ内では、以下のラッパー構造で保存されます。これにより、ゲームデータ本体と管理用メタデータを完全に分離します。

```json
{
  "v": 1,  // dataVersion
  "d": {   // data本体
    "score": 100,
    ...
  }
}
```

## API

### `getSavedData(key: string, migrationMap: object): object`
- **詳細**:
    - 指定されたキーでデータを読み込み、内部構造から **データ本体 (`d`) のみ** を抽出して返します。
    - データが存在しない、またはパースに失敗した場合は `migrationMap.init()` を実行します。
    - 保存されているバージョンの数値 (`v`) を確認し、現在のアプリバージョンまで `migrationMap` に定義された移行処理を順次適用します。
- **migrationMap の構造**:
    - `init`: 必須。初期データを生成して返す関数 `() => object`。
    - `{number}`: オプション。各メジャーバージョンごとの移行関数 `(data) => object`。

### `setSavedData(key: string, data: object): void`
- **詳細**:
    - 引数で受け取ったデータ（本体）を、内部構造 `{ v: [現在のメジャーバージョン], d: [データ本体] }` で包みます。
    - `localStorage` に JSON 文字列として永続化します。

### `fetchGameData(path: string): Promise<object>`
- **詳細**:
    - プロジェクトの `data/` 配下からJSONデータを取得し、オブジェクトとして返します。

## 使用例
```javascript
import { DataManager } from 'https://t-i-oak.github.io/GameWorksOAK/lib/core/dataManager.js';

const migrationMap = {
    init: () => ({ score: 0, items: [] }),
    1: (data) => ({ ...data, rank: 'C' }),
};

// 取得（内部のラッパーは意識せず、データ本体だけが返る）
const userData = DataManager.getSavedData('user_profile', migrationMap);

// 保存（自動的にラッパーで包まれて保存される）
DataManager.setSavedData('user_profile', userData);
```
