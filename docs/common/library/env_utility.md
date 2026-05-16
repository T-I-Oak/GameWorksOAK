# Env Utility Specification

## 役割
アプリケーションのビルド環境やメタ情報を取得します。

## API

### `getAppVersion(): string`
- **詳細**: 
    - ビルドツールによって注入された `__APP_VERSION__` をそのまま返します。

### `getMajorVersion(): number`
- **詳細**:
    - `getAppVersion()` で取得した文字列の最初の数字（メジャーバージョン）を数値として返します。
    - 例: `"1.2.3"` -> `1`

## 使用例
```javascript
import { getAppVersion, getMajorVersion } from 'https://t-i-oak.github.io/GameWorksOAK/lib/utils/env.js';

const version = getAppVersion();
const major = getMajorVersion();
```
