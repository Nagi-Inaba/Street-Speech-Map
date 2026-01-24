# 本番環境クイックスタートガイド

NeonとVercelを使用した本番環境の最短セットアップ手順です。

## 5分でセットアップ

### ステップ1: Neonデータベースの作成（2分）

1. https://neon.tech にアクセスしてGitHubアカウントでサインアップ
2. 「New Project」をクリック
3. プロジェクト名を入力（例: `street-speech-map-prod`）
4. リージョン: `Tokyo (ap-southeast-1)` を選択
5. 「Create Project」をクリック
6. **接続文字列をコピー**（後で使用します）

### ステップ2: データベースのセットアップ（1分）

ローカル環境で実行：

```bash
# 接続文字列を環境変数に設定（一時的）
$env:DATABASE_URL="コピーした接続文字列"

# データベーススキーマを適用
npm run db:push

# 管理ユーザーを作成（数字IDとパスワードをメモ）
npm run create:admin-user
```

### ステップ3: Vercelへのデプロイ（2分）

1. https://vercel.com にアクセスしてGitHubアカウントでサインアップ
2. 「Add New...」→「Project」をクリック
3. `Street-Speech-Map`リポジトリを選択して「Import」
4. **環境変数を設定**（以下をコピー&ペースト）：

```
DATABASE_URL=コピーしたNeon接続文字列
NEXTAUTH_URL=https://your-project.vercel.app（デプロイ後に更新）
NEXTAUTH_SECRET=ランダムな32バイトのBase64文字列
AUTH_SECRET=上記と同じ値
REPORTER_HASH_SALT=ランダムな16バイトのBase64文字列
```

**シークレットキーの生成**（PowerShell）:
```powershell
# NEXTAUTH_SECRET / AUTH_SECRET
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# REPORTER_HASH_SALT
[Convert]::ToBase64String((1..16 | ForEach-Object { Get-Random -Maximum 256 }))
```

5. 「Deploy」をクリック
6. デプロイ完了後、提供されたURLをコピー
7. Vercelの環境変数で`NEXTAUTH_URL`を更新（例: `https://your-project.vercel.app`）
8. 「Redeploy」をクリック

### ステップ4: 動作確認（1分）

1. デプロイされたサイトにアクセス
2. `/admin/login` にアクセス
3. 作成した管理ユーザーでログイン
4. 動作確認完了！

## トラブルシューティング

### データベース接続エラー

- 接続文字列に`?sslmode=require`が含まれているか確認
- Vercelの環境変数で`DATABASE_URL`が正しく設定されているか確認

### 認証エラー

- `NEXTAUTH_URL`が実際のドメインと一致しているか確認
- `NEXTAUTH_SECRET`と`AUTH_SECRET`が設定されているか確認

### ビルドエラー

- Vercelのビルドログを確認
- ローカルで`npm run build`を実行してエラーを確認

## 詳細な手順

より詳細な手順が必要な場合は、[PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)を参照してください。

