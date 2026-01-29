# 本番環境セットアップガイド

このガイドでは、NeonとVercelを使用した本番環境のセットアップ手順を説明します。

## 前提条件

- GitHubアカウント
- Neonアカウント（無料で作成可能）
- Vercelアカウント（無料で作成可能）

## ステップ1: Neonデータベースのセットアップ

### 1.1 Neonアカウントの作成

1. https://neon.tech にアクセス
2. GitHubアカウントでサインアップ（無料）

### 1.2 プロジェクトの作成

1. ダッシュボードで「New Project」をクリック
2. プロジェクト名を入力（例: `street-speech-map-production`）
3. リージョンを選択（`Tokyo (ap-southeast-1)` を推奨）
4. PostgreSQLバージョンを選択（最新版を推奨）
5. 「Create Project」をクリック

### 1.3 接続文字列の取得

1. プロジェクト作成後、接続文字列が表示されます
2. **Connection string** セクションから接続文字列をコピー
   - 例: `postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require`
3. **重要**: 接続文字列には`?sslmode=require`が含まれていることを確認してください

### 1.4 データベースのマイグレーション

ローカル環境で以下のコマンドを実行して、データベーススキーマを適用します：

```bash
# 環境変数を設定（一時的に）
$env:DATABASE_URL="your-neon-connection-string"

# Prismaクライアントの生成
npm run db:generate

# データベーススキーマの適用
npm run db:push
```

または、`.env`ファイルに`DATABASE_URL`を設定してから実行：

```bash
npm run db:push
```

### 1.5 管理ユーザーの作成

本番環境用の管理ユーザーを作成します：

```bash
# 自動生成（推奨）
npm run create:admin-user

# 手動指定
npm run create:admin-user -- --userId 123456 --password YourSecurePassword123 --name "管理者" --role SiteAdmin
```

**重要**: 
- 作成時に表示される数字IDとパスワードは必ず安全な場所に保存してください
- 本番環境では強力なパスワードを使用してください

## ステップ2: Vercelへのデプロイ

### 2.1 Vercelアカウントの作成

1. https://vercel.com にアクセス
2. GitHubアカウントでサインアップ

### 2.2 プロジェクトのインポート

1. Vercelダッシュボードで「Add New...」→「Project」をクリック
2. GitHubリポジトリから`Street-Speech-Map`を選択
3. 「Import」をクリック

### 2.3 環境変数の設定

Vercelのプロジェクト設定で、以下の環境変数を設定してください：

#### 必須の環境変数

```
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=your-random-secret-key-here
AUTH_SECRET=your-random-secret-key-here
REPORTER_HASH_SALT=your-random-salt-here
```

#### オプションの環境変数

```
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-umami-website-id
NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://your-umami-instance.com/script.js
```

#### シークレットキーの生成方法

**NEXTAUTH_SECRET / AUTH_SECRET**:
```bash
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# または Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**REPORTER_HASH_SALT**:
```bash
# PowerShell
[Convert]::ToBase64String((1..16 | ForEach-Object { Get-Random -Maximum 256 }))

# または Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

### 2.4 デプロイ

1. 環境変数を設定後、「Deploy」をクリック
2. デプロイが完了するまで待機（通常1-2分）
3. デプロイ完了後、提供されたURLにアクセスして動作確認

## ステップ3: デプロイ後の確認

### 3.1 データベース接続の確認

1. デプロイされたサイトにアクセス
2. 管理画面（`/admin/login`）にアクセス
3. 作成した管理ユーザーでログインできることを確認

### 3.2 機能の確認

- [ ] 候補者一覧が表示される
- [ ] 候補者ページが表示される
- [ ] 地図が表示される
- [ ] 管理画面にログインできる
- [ ] 候補者の追加・編集ができる
- [ ] 演説予定の追加・編集ができる

## ステップ4: Vercel Blobの設定（OGP画像はBlob運用が基本方針）

OGP画像の保存・配信は **Blob運用を基本方針** としています。本番では設定を推奨します。画像アップロード機能でも利用します。

1. Vercelダッシュボードで「Storage」→「Create Database」→「Blob」を選択
2. ストレージ名を入力して作成
3. 「Settings」タブから`BLOB_READ_WRITE_TOKEN`をコピー
4. Vercelの環境変数に`BLOB_READ_WRITE_TOKEN`を追加

## ステップ5: Cronジョブの設定

自動承認機能を使用する場合、Vercel Cronが自動的に設定されます。

`vercel.json`に以下の設定が含まれています：

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-approve",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

この設定により、5分ごとに自動承認処理が実行されます。

**注意**: `/api/cron/auto-approve`エンドポイントが実装されている必要があります。

## トラブルシューティング

### データベース接続エラー

- `DATABASE_URL`が正しく設定されているか確認
- 接続文字列に`?sslmode=require`が含まれているか確認
- Neonのダッシュボードでデータベースがアクティブか確認

### 認証エラー

- `NEXTAUTH_URL`が本番環境のURLと一致しているか確認
- `NEXTAUTH_SECRET`と`AUTH_SECRET`が設定されているか確認
- 環境変数が正しく設定されているか確認（Vercelダッシュボードで確認）

### ビルドエラー

- `npm run build`をローカルで実行してエラーを確認
- Prismaクライアントが生成されているか確認（`npm run db:generate`）
- 環境変数がすべて設定されているか確認

### マイグレーションエラー

- Neonのダッシュボードでデータベースをリセット（必要に応じて）
- ローカルで`npm run db:push`を実行してスキーマを確認

## セキュリティチェックリスト

- [ ] 強力なパスワードを使用している
- [ ] `NEXTAUTH_SECRET`と`AUTH_SECRET`がランダムな値である
- [ ] `REPORTER_HASH_SALT`がランダムな値である
- [ ] `.env`ファイルがGitにコミットされていない（`.gitignore`で除外されている）
- [ ] 本番環境の環境変数が正しく設定されている
- [ ] HTTPSが有効になっている（Vercelは自動的に有効化）

## 次のステップ

- [ ] サンプルデータの削除（本番環境では不要）
- [ ] 実際の候補者データの登録
- [ ] 施設データの取り込み（必要に応じて）
- [ ] Umami Analyticsの設定（オプション）
- [ ] カスタムドメインの設定（オプション）

## 参考リンク

- [Neon公式ドキュメント](https://neon.tech/docs)
- [Vercel公式ドキュメント](https://vercel.com/docs)
- [Prisma公式ドキュメント](https://www.prisma.io/docs)
- [NextAuth.js公式ドキュメント](https://next-auth.js.org)

