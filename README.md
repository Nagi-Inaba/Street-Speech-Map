# 街頭演説マップ

候補者の街頭演説予定・実施中・終了を地図で可視化するWebアプリケーション。

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS + shadcn/ui
- **データベース**: PostgreSQL + Prisma
- **認証**: NextAuth.js
- **地図**: Leaflet
- **画像ストレージ**: Vercel Blob（予定）

## 機能

### 公開側
- 候補者一覧
- 候補者ページ（演説予定一覧 + 地図）
- 演説予定共有ボタン
- 演説実施中共有ボタン
- 公開リクエスト投稿（予定登録/変更、開始/終了報告、場所変更報告）

### 管理側
- 候補者管理（CRUD）
- イベント管理（CRUD）
- リクエスト審査（絞り込み、ソート、一括承認、重複非表示）
- 他党イベント管理（予定）
- 変更履歴・監査ログ（予定）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. データベースのセットアップ

**PostgreSQLの知識がなくても大丈夫！** 無料のクラウドサービスを使えば簡単にセットアップできます。

#### 推奨: Neon（最も簡単）

1. https://neon.tech にアクセスしてアカウント作成（GitHubアカウントでOK、無料）
2. 「New Project」でプロジェクト作成
3. 表示された接続文字列をコピー
4. `.env`ファイルの`DATABASE_URL`に貼り付け

詳細は [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) を参照してください。

### 3. 環境変数の設定

`.env` ファイルを作成し、以下の変数を設定してください：

```env
# Database（Neon等のクラウドサービスから取得した接続文字列）
DATABASE_URL="postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-key-change-in-production"

# Vercel Blob (画像アップロード) - オプション
BLOB_READ_WRITE_TOKEN="your-blob-token-here"

# レポーターハッシュ用ソルト
REPORTER_HASH_SALT="dev-salt-change-in-production"

# Umami Analytics (オプション)
NEXT_PUBLIC_UMAMI_WEBSITE_ID=""
NEXT_PUBLIC_UMAMI_SCRIPT_URL=""
```

### 4. データベースのセットアップ

`.env`ファイルに`DATABASE_URL`を設定したら、以下を実行：

```bash
# Prismaクライアントの生成
npm run db:generate

# データベースのマイグレーション（開発中は push を使用）
npm run db:push
```

### 5. シードデータの投入（オプション）

開発用のサンプルデータを投入する場合：

```bash
npm run seed
```

これにより、以下のデータが作成されます：
- 管理者ユーザー（email: `admin@example.com`, password: `password`）
- サンプル候補者
- サンプルイベント

**注意**: 本番環境では使用しないでください。

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

### 7. 管理画面へのアクセス

1. [http://localhost:3000/admin/login](http://localhost:3000/admin/login) にアクセス
2. シードデータを使用する場合：
   - Email: `admin@example.com`
   - Password: `password`

## データ取り込み

### 施設データの取り込み

```bash
npm run ingest:facilities
```

## デプロイ

### Vercel推奨

1. Vercelにプロジェクトをインポート
2. 環境変数を設定
3. PostgreSQLデータベースを接続（Neon、Supabase、Railway等）
4. デプロイ

### 環境変数

本番環境では以下の環境変数を設定してください：

- `DATABASE_URL`: PostgreSQL接続文字列
- `NEXTAUTH_URL`: 本番URL
- `NEXTAUTH_SECRET`: ランダムなシークレットキー
- `BLOB_READ_WRITE_TOKEN`: Vercel Blobトークン
- `REPORTER_HASH_SALT`: ランダムなソルト

## 実装状況

### 完了（MVP）
- ✅ プロジェクト初期化（Next.js + TypeScript + Tailwind + shadcn/ui）
- ✅ Prismaスキーマ定義
- ✅ NextAuth認証とRBAC（簡易実装）
- ✅ 候補者CRUD（管理画面）と候補者一覧（公開画面）
- ✅ 演説イベントCRUD（管理画面）と候補者ページの予定一覧（公開画面）
- ✅ Leaflet地図コンポーネント（イベントピン表示、入力UI）
- ✅ 公開リクエスト投稿API
- ✅ 報告API（開始/終了/場所変更）
- ✅ リクエスト審査画面（重複キーによるグループ化表示）

### 実装中・予定
- ⏳ リクエスト審査画面の一括承認機能（UI実装済み、API未実装）
- ⏳ 開始/終了報告の自動承認（Cron + ロジック）
- ⏳ 場所変更報告→MoveHint生成→公開側注意＋推定ピン
- ⏳ 他党イベント登録＆表示
- ⏳ 施設データ取り込みスクリプト＋施設レイヤー表示
- ⏳ 共有ボタン（予定/実施中）＋分析イベント計測
- ⏳ テスト（Vitest + Playwright）
- ⏳ 変更履歴の表示
- ⏳ 画像アップロード機能（Vercel Blob）

## 仮定・制約事項

1. **パスワード認証**: 現在は簡易実装です（開発環境ではパスワードが "password" の場合に認証を許可）。本番環境では適切なパスワードハッシュ化（UserテーブルにpasswordHashフィールド追加）が必要です。

2. **自動承認**: 開始/終了報告の自動承認機能は未実装です。Vercel Cron等でバッチ処理を実装する必要があります。`app/api/cron/auto-approve/route.ts` のようなエンドポイントを作成し、Vercel Cronから定期実行する必要があります。

3. **画像アップロード**: Vercel Blobへのアップロード機能は未実装です。管理画面でURLを直接入力する形式です。`app/api/admin/upload/route.ts` を作成し、Vercel Blob SDKを使用して実装する必要があります。

4. **分析**: Umamiの統合は未実装です。`lib/analytics.ts`に基盤は用意されています。Umamiのスクリプトを`app/layout.tsx`に追加し、`trackEvent`関数を使用してイベントを計測する必要があります。

5. **施設データ**: 取り込みスクリプトは未実装です。`scripts/ingest-facilities.ts`に実装の骨組みはありますが、実際のデータソース（国土数値情報等）からデータを取得し、GeoJSON形式に変換してからDBに保存する処理を実装する必要があります。

6. **重複非表示**: リクエスト画面で重複キーによるグループ化は表示のみです。一括承認機能のAPIエンドポイント（`app/api/admin/requests/bulk-approve/route.ts`）を実装する必要があります。

7. **他党イベント**: 他党イベントのCRUD機能は未実装です。`app/admin/rival-events/page.tsx` と `app/api/admin/rival-events/route.ts` を実装する必要があります。

8. **共有ボタン**: 共有ボタンのUIはありますが、実際の共有機能（Web Share APIまたはクリップボードコピー）は未実装です。

## 今後の改善

- [ ] パスワード認証の適切な実装
- [ ] 画像アップロード機能（Vercel Blob）
- [ ] 自動承認バッチ処理（Vercel Cron）
- [ ] MoveHint生成と推定ピン表示
- [ ] 施設データ取り込みスクリプト
- [ ] 共有ボタン実装
- [ ] Umami分析統合
- [ ] E2Eテスト
- [ ] パフォーマンス最適化（施設データのクラスタリング等）

## ライセンス

このプロジェクトは完全無料（公共目的）です。課金機能はありません。

## コントリビューション

コントリビューションを歓迎します。詳細はCONTRIBUTING.md（作成予定）を参照してください。
