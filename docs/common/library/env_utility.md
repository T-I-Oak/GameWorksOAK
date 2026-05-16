# Env Utility Specification

## 役割
アプリケーションのビルド環境やメタ情報を取得します。

## API

### `setAppVersion(version: string): void`
- **詳細**:
    - アプリケーションのバージョンを設定します。
    - 本ユーティリティの他の機能を利用する前に、必ず呼び出す必要があります。

### `getAppVersion(): string`
- **詳細**: 
    - `setAppVersion()` で設定されたバージョン文字列を返します。
    - 未設定の場合は `undefined` を返します。

### `getMajorVersion(): number`
- **詳細**:
    - 設定されたバージョン文字列の最初の数字（メジャーバージョン）を数値として返します。
    - 例: `"1.2.3"` -> `1`
    - バージョンが未設定の場合、実行時に自然にエラーが発生します。

## 使用例
```javascript
import { setAppVersion, getAppVersion, getMajorVersion } from 'https://t-i-oak.github.io/GameWorksOAK/lib/utils/env.js';

// 初期化時にアプリケーション側で定義されているバージョンを注入
setAppVersion('1.2.3');

const version = getAppVersion(); // "1.2.3"
const major = getMajorVersion(); // 1
```
