# 本番環境セットアップスクリプト

このドキュメントは、本番環境のセットアップを手動で行う際のチェックリストです。

## 事前準備

1. Neonアカウントを作成
2. Vercelアカウントを作成
3. GitHubリポジトリがプッシュ済みであることを確認

## 手順

### 1. Neonデータベースのセットアップ

```bash
# 1. Neonでプロジェクトを作成
# https://neon.tech にアクセスしてプロジェクトを作成

# 2. 接続文字列を取得して環境変数に設定（一時的）
$env:DATABASE_URL="postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require"

# 3. データベーススキーマを適用
npm run db:generate
npm run db:push

# 4. 管理ユーザーを作成
npm run create:admin-user
```

### 2. Vercelへのデプロイ

1. Vercelダッシュボードでプロジェクトをインポート
2. 環境変数を設定（`docs/PRODUCTION_SETUP.md`を参照）
3. デプロイを実行

### 3. デプロイ後の確認

- [ ] サイトが正常に表示される
- [ ] 管理画面にログインできる
- [ ] データベース接続が正常に動作する

## 環境変数の生成コマンド

### NEXTAUTH_SECRET / AUTH_SECRET

```powershell
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### REPORTER_HASH_SALT

```powershell
# PowerShell
[Convert]::ToBase64String((1..16 | ForEach-Object { Get-Random -Maximum 256 }))
```

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

