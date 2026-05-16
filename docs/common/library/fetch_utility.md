# Fetch Utility Specification

## 役割
標準の `fetch` API をラップし、共通のエラーハンドリングとデータの自動パースを提供します。

## API

### `commonFetch(url: string, options: object): Promise<object|array>`
- **詳細**:
    - HTTPステータスが `200-299` 以外の場合、`Error` をスローします。
    - 取得したデータは自動的に `.json()` でパースされ、オブジェクトまたは配列として返されます。

## 使用例
```javascript
import { commonFetch } from 'https://t-i-oak.github.io/GameWorksOAK/lib/utils/fetch.js';

const config = await commonFetch('data/config.json');
```
