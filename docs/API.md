# 街頭演説マップ API ドキュメント

## 概要

街頭演説マップの公開APIを使用して、候補者情報や演説イベント情報を取得できます。

## 認証

APIを使用するには、APIキーが必要です。APIキーは管理画面から作成できます。

### APIキーの送信方法

以下のいずれかの方法でAPIキーを送信してください：

1. **X-API-Key ヘッダー**（推奨）
   ```
   X-API-Key: your-api-key-here
   ```

2. **Authorization ヘッダー**（Bearer形式）
   ```
   Authorization: Bearer your-api-key-here
   ```

3. **クエリパラメータ**（非推奨、互換性のため）
   ```
   ?api_key=your-api-key-here
   ```

## レート制限

APIキーごとにレート制限が設定されています（デフォルト: 1分あたり100リクエスト）。

レート制限情報はレスポンスヘッダーに含まれます：

- `X-RateLimit-Limit`: リクエスト制限数
- `X-RateLimit-Remaining`: 残りのリクエスト数
- `X-RateLimit-Reset`: リセット時刻（ISO 8601形式）

レート制限に達した場合、`429 Too Many Requests` エラーが返されます。

## CORS

CORS（Cross-Origin Resource Sharing）が有効になっています。環境変数 `ALLOWED_ORIGINS` で許可するオリジンを設定できます（カンマ区切り）。設定がない場合はすべてのオリジンが許可されます。

## エンドポイント

### 1. 候補者一覧取得

```
GET /api/public/candidates
```

すべての候補者情報の一覧を取得します。

**認証**: 必須

**レスポンス例**:
```json
[
  {
    "id": "clx...",
    "slug": "yamada-taro",
    "name": "山田太郎",
    "imageUrl": "https://...",
    "type": "SINGLE",
    "prefecture": "東京都",
    "region": "東京1区",
    "showEvents": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 2. 候補者の演説イベント一覧取得

```
GET /api/public/candidates/{slug}/events
```

指定された候補者の演説イベント一覧を取得します。

**認証**: 必須

**パラメータ**:
- `slug` (path): 候補者のスラッグ

**レスポンス例**:
```json
[
  {
    "id": "clx...",
    "candidateId": "clx...",
    "status": "PLANNED",
    "startAt": "2024-01-15T10:00:00.000Z",
    "endAt": "2024-01-15T11:00:00.000Z",
    "timeUnknown": false,
    "lat": 35.6812,
    "lng": 139.7671,
    "locationText": "東京駅前",
    "notes": null,
    "submittedAt": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**ステータスコード**:
- `200`: 成功
- `404`: 候補者が見つかりません

### 3. 公開設定取得

```
GET /api/public/settings
```

サイトの公開設定情報を取得します。

**認証**: 不要

**レスポンス例**:
```json
{
  "showCandidateInfo": true,
  "candidateLabel": "候補者",
  "showEvents": true,
  "shareTemplateLive": "{候補者名}さんが現在{場所}で街頭演説を行っています #チームみらい #{候補者名}",
  "shareTemplatePlanned": "{時間}から{候補者名}さんの街頭演説が{場所}で予定されています #チームみらい #{候補者名}"
}
```

## OpenAPI仕様

OpenAPI 3.0仕様のドキュメントは以下のエンドポイントで取得できます：

```
GET /api/docs
```

このエンドポイントは認証不要で、Swagger UIなどのツールで使用できます。

## エラーレスポンス

### 401 Unauthorized

認証に失敗した場合：

```json
{
  "error": "Unauthorized",
  "message": "有効なAPIキーが必要です。Authorization ヘッダーまたは X-API-Key ヘッダーにAPIキーを設定してください。"
}
```

### 429 Too Many Requests

レート制限に達した場合：

```json
{
  "error": "Too Many Requests",
  "message": "レート制限に達しました。60秒後に再試行してください。",
  "retryAfter": 60
}
```

### 500 Internal Server Error

サーバーエラーが発生した場合：

```json
{
  "error": "Internal Server Error",
  "message": "エラーメッセージ"
}
```

## 使用例

### cURL

```bash
# 候補者一覧を取得
curl -H "X-API-Key: your-api-key-here" \
  https://your-domain.com/api/public/candidates

# 特定の候補者のイベントを取得
curl -H "X-API-Key: your-api-key-here" \
  https://your-domain.com/api/public/candidates/yamada-taro/events
```

### JavaScript (Fetch API)

```javascript
const apiKey = 'your-api-key-here';
const baseUrl = 'https://your-domain.com';

// 候補者一覧を取得
const candidates = await fetch(`${baseUrl}/api/public/candidates`, {
  headers: {
    'X-API-Key': apiKey,
  },
}).then(res => res.json());

// 特定の候補者のイベントを取得
const events = await fetch(`${baseUrl}/api/public/candidates/yamada-taro/events`, {
  headers: {
    'X-API-Key': apiKey,
  },
}).then(res => res.json());
```

### Python (requests)

```python
import requests

api_key = 'your-api-key-here'
base_url = 'https://your-domain.com'

headers = {
    'X-API-Key': api_key
}

# 候補者一覧を取得
response = requests.get(f'{base_url}/api/public/candidates', headers=headers)
candidates = response.json()

# 特定の候補者のイベントを取得
response = requests.get(
    f'{base_url}/api/public/candidates/yamada-taro/events',
    headers=headers
)
events = response.json()
```

## APIキーの管理

APIキーは管理画面（`/admin`）から作成・管理できます。管理者権限（SiteAdmin）が必要です。

### APIキーの作成

1. 管理画面にログイン
2. APIキー管理ページにアクセス
3. 新しいAPIキーを作成
4. **作成時に表示されるAPIキーを必ず保存してください**（二度と表示されません）

### APIキーの更新

- 名前、レート制限、有効/無効の切り替えが可能です
- APIキー自体の再生成はできません（削除して新規作成してください）
