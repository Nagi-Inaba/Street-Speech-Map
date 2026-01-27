# API公開設定ガイド

このガイドでは、街頭演説マップのAPIを外部連携のために公開する手順を説明します。

## 1. データベースマイグレーション

APIキー管理のためのテーブルを作成するため、Prismaマイグレーションを実行してください。

```bash
npm run db:migrate
```

または、開発環境でPrismaスキーマを直接プッシュする場合：

```bash
npm run db:push
```

## 2. 環境変数の設定

`.env`ファイルに以下の環境変数を追加してください（オプション）：

```env
# API CORS設定（オプション）
# 許可するオリジンをカンマ区切りで指定
ALLOWED_ORIGINS="https://example.com,https://app.example.com"
```

設定しない場合は、すべてのオリジンが許可されます（開発環境では問題ありませんが、本番環境では特定のオリジンのみ許可することを推奨します）。

## 3. APIキーの作成

1. 管理画面（`/admin`）にログイン
2. APIキー管理ページにアクセス（今後、管理画面UIに追加予定）
3. 現在は直接APIエンドポイントを使用してAPIキーを作成できます：

```bash
# 管理者としてログインした状態で
curl -X POST https://your-domain.com/api/admin/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "name": "My API Key",
    "rateLimit": 100
  }'
```

または、管理画面UIから作成できるようにする場合は、管理画面ページを追加する必要があります。

## 4. APIの使用

APIキーを取得したら、以下のように使用できます：

```bash
# 候補者一覧を取得
curl -H "X-API-Key: your-api-key-here" \
  https://your-domain.com/api/public/candidates

# 特定の候補者のイベントを取得
curl -H "X-API-Key: your-api-key-here" \
  https://your-domain.com/api/public/candidates/yamada-taro/events
```

詳細は [API.md](./API.md) を参照してください。

## 5. OpenAPIドキュメント

OpenAPI 3.0仕様のドキュメントは以下のエンドポイントで取得できます：

```
GET /api/docs
```

このエンドポイントは認証不要で、Swagger UIなどのツールで使用できます。

## セキュリティのベストプラクティス

1. **APIキーの管理**
   - APIキーは安全な場所に保存してください
   - 定期的にAPIキーをローテーションすることを推奨します
   - 不要になったAPIキーは削除してください

2. **レート制限**
   - デフォルトのレート制限（1分あたり100リクエスト）を必要に応じて調整してください
   - 大量のリクエストが必要な場合は、管理画面からレート制限を増やすことができます

3. **CORS設定**
   - 本番環境では、`ALLOWED_ORIGINS`環境変数で許可するオリジンを制限してください
   - ワイルドカード（`*`）の使用は避けてください

4. **HTTPSの使用**
   - 本番環境では必ずHTTPSを使用してください
   - APIキーは平文で送信されるため、HTTPSなしではセキュリティリスクがあります

## トラブルシューティング

### 認証エラー（401）

- APIキーが正しく設定されているか確認してください
- APIキーが有効（`isActive: true`）か確認してください
- ヘッダー名が正しいか確認してください（`X-API-Key` または `Authorization: Bearer`）

### レート制限エラー（429）

- レート制限に達していないか確認してください
- レスポンスヘッダーの`X-RateLimit-Remaining`を確認してください
- 必要に応じて、管理画面からレート制限を増やしてください

### CORSエラー

- `ALLOWED_ORIGINS`環境変数が正しく設定されているか確認してください
- ブラウザのコンソールでエラーメッセージを確認してください
