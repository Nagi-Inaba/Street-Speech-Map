# データベーステーブル不足エラーの修正方法

## 問題

`EventCandidate`テーブルがデータベースに存在しないため、新規イベントの作成に失敗します。

エラーメッセージ:
```
The table `public.EventCandidate` does not exist in the current database.
```

## 解決方法

本番環境のデータベースに対して、Prismaスキーマを適用する必要があります。

### 手順1: VercelからDATABASE_URLを取得

1. Vercelダッシュボードにアクセス
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」を開く
4. `DATABASE_URL`の値をコピー（目のアイコンをクリックして表示）

### 手順2: ローカル環境でデータベーススキーマを適用

PowerShellで以下のコマンドを実行：

```powershell
# 本番環境のDATABASE_URLを環境変数に設定（一時的）
$env:DATABASE_URL="コピーしたDATABASE_URL"

# Prismaクライアントの生成
npm run db:generate

# データベーススキーマの適用
npm run db:push
```

### 手順3: 確認

スキーマが正常に適用されたら、以下のメッセージが表示されます：
```
✔ Generated Prisma Client
✔ Database synchronized
```

### 手順4: 動作確認

1. 本番環境のサイトにアクセス
2. 管理画面にログイン
3. 新規イベントの作成を試す
4. エラーが解消されていることを確認

## 注意事項

- `prisma db push`は開発環境向けのコマンドです
- 本番環境では、通常はマイグレーションファイルを使用しますが、このプロジェクトでは`db push`を使用しています
- データベースに既存のデータがある場合、スキーマの変更によってデータが影響を受ける可能性があります
- 実行前に、必要に応じてデータベースのバックアップを取得することを推奨します

## トラブルシューティング

### 接続エラーが発生する場合

- `DATABASE_URL`に`?sslmode=require`が含まれているか確認
- Neonのダッシュボードでデータベースがアクティブか確認
- ファイアウォールやネットワーク設定を確認

### 権限エラーが発生する場合

- データベースユーザーに適切な権限があるか確認
- Neonのダッシュボードでユーザーの権限を確認
