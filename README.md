# チームみらい 街頭演説マップ

候補者の街頭演説予定・実施中・終了を地図で可視化するWebアプリケーション。  
**サポーター作・非公式サイト**

## 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS + shadcn/ui
- **フォント**: Noto Sans JP
- **地図ライブラリ**: Leaflet + React Leaflet

### バックエンド
- **フレームワーク**: Next.js 15 (API Routes)
- **認証**: NextAuth.js v5 (Credentials Provider)
- **パスワードハッシュ化**: bcryptjs

### データベース
- **データベースサーバー**: PostgreSQL（クラウドサービス推奨）
  - 推奨サービス: Neon, Supabase, Railway
  - 開発環境・本番環境ともにクラウドPostgreSQLを使用
- **ORM**: Prisma 5.19.0
- **データベースアダプター**: @auth/prisma-adapter

### デプロイ・インフラ
- **ホスティング**: Vercel（推奨）
- **画像ストレージ**: Vercel Blob（予定）
- **分析**: Umami Analytics（予定）

### 開発ツール
- **パッケージマネージャー**: npm
- **テストフレームワーク**: Vitest（単体テスト）、Playwright（E2Eテスト）
- **リンター**: ESLint

## 機能

### 公開側
- 候補者一覧
- 候補者ページ（演説予定一覧 + 地図）
- 演説予定共有ボタン
- 演説実施中共有ボタン
- 公開リクエスト投稿（予定登録/変更、開始/終了報告、場所変更報告）

### 管理側
- 候補者管理（CRUD）
- 演説予定管理（CRUD）
  - 開始日時と終了時刻の入力（時間は8:00-20:00のドロップダウン選択）
- リクエスト審査（絞り込み、ソート、一括承認、重複非表示）
- 他党イベント管理（予定）
- 変更履歴・監査ログ（予定）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. データベースのセットアップ

PostgreSQLデータベースサーバーが必要です。無料のクラウドサービスを使用することを推奨します。

#### 推奨: Neon

1. https://neon.tech にアクセスしてアカウント作成（GitHubアカウントでOK、無料）
2. 「New Project」でプロジェクト作成
3. 表示された接続文字列をコピー
4. `.env`ファイルの`DATABASE_URL`に貼り付け

その他の選択肢（Supabase、Railway）については [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) を参照してください。

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

### 4. データベースのマイグレーション

`.env`ファイルに`DATABASE_URL`を設定したら、以下を実行：

```bash
# Prismaクライアントの生成
npm run db:generate

# データベースのマイグレーション（開発中は push を使用）
npm run db:push
```

### 5. 管理ユーザーの作成

管理画面にログインできるユーザーを作成：

```bash
# 自動生成（数字IDとパスワードを自動生成）
npm run create:admin-user

# 手動指定
npm run create:admin-user -- --userId 123456 --password AdminPass123 --name "管理者" --role SiteAdmin
```

**パラメータ**:
- `--userId`: 数字ID（6桁推奨、指定しない場合は自動生成）
- `--password`: パスワード（半角英数、指定しない場合は自動生成）
- `--name`: 名前（デフォルト: "管理者"）
- `--role`: 権限（`SiteAdmin`, `SiteStaff`, `PartyAdmin`, `RegionEditor`、デフォルト: `SiteAdmin`）
- `--email`: メールアドレス（指定しない場合は自動生成）

**重要**: 作成時に表示される数字IDとパスワードは必ずメモを取ってください。  
**注意**: 同一のIDとパスワードで複数端末から同時にログイン可能です。

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

### 7. 管理画面へのアクセス

1. [http://localhost:3000/admin/login](http://localhost:3000/admin/login) にアクセス
2. `create:admin-user`で作成した数字IDとパスワードでログイン

## データ管理

### サンプルデータの削除

本番環境に向けて、サンプルデータを削除する場合：

```bash
# すべてのサンプルデータを削除（候補者、イベント、リクエスト、施設、他党イベント）
npm run cleanup:all-sample-data

# 候補者と演説予定のみを削除
npm run cleanup:all-candidates-and-events

# サンプル施設データのみを削除
npm run cleanup:sample-facilities
```

**注意**: これらのコマンドは実行前に確認を求めます。本番データを誤って削除しないよう注意してください。

## データ取り込み

### 施設データの取り込み

施設データ（学校、医療機関など）をCSVまたはGeoJSONファイルから取り込むことができます。

詳細は [docs/FACILITY_DATA.md](docs/FACILITY_DATA.md) を参照してください。

#### 実際のデータを使用する場合

1. 国土数値情報ダウンロードサービス（https://nlftp.mlit.go.jp/ksj/）からデータをダウンロード
2. CSVまたはGeoJSON形式に変換（必要に応じて）
3. `data/` ディレクトリに配置
4. 上記のコマンドを実行（ファイルパスを実際のファイルに変更）

## デプロイ

### 本番環境のセットアップ

NeonとVercelを使用した本番環境のセットアップ手順：

**クイックスタート**: [docs/QUICK_START_PRODUCTION.md](docs/QUICK_START_PRODUCTION.md)（5分でセットアップ）  
**Vercel完全ガイド**: [docs/VERCEL_DEPLOYMENT_GUIDE.md](docs/VERCEL_DEPLOYMENT_GUIDE.md)（Vercelの操作を詳しく解説）  
**詳細ガイド**: [docs/PRODUCTION_SETUP.md](docs/PRODUCTION_SETUP.md)（完全な手順とトラブルシューティング）

### Vercel推奨

1. Vercelにプロジェクトをインポート
2. 環境変数を設定（下記参照）
3. PostgreSQLデータベースを接続（Neon、Supabase、Railway等）
4. デプロイ

### 環境変数

本番環境では以下の環境変数を設定してください：

**必須の環境変数**:
- `DATABASE_URL`: PostgreSQL接続文字列（Neon等から取得）
- `NEXTAUTH_URL`: 本番URL（例: `https://your-project.vercel.app`）
- `NEXTAUTH_SECRET`: ランダムなシークレットキー（32バイトのBase64文字列）
- `AUTH_SECRET`: `NEXTAUTH_SECRET`と同じ値
- `REPORTER_HASH_SALT`: ランダムなソルト（16バイトのBase64文字列）

**オプションの環境変数**:
- `BLOB_READ_WRITE_TOKEN`: Vercel Blobトークン（画像アップロード機能を使用する場合）
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID`: Umami AnalyticsのウェブサイトID
- `NEXT_PUBLIC_UMAMI_SCRIPT_URL`: Umami AnalyticsのスクリプトURL

詳細は [docs/PRODUCTION_SETUP.md](docs/PRODUCTION_SETUP.md) を参照してください。

## システム仕様

詳細なシステム仕様については [docs/SPECIFICATION.md](docs/SPECIFICATION.md) を参照してください。

### 主要技術スタック
- **フレームワーク**: Next.js 15 (App Router)
- **データベースサーバー**: PostgreSQL（クラウドサービス推奨: Neon, Supabase, Railway）
- **ORM**: Prisma 5.19.0
- **認証**: NextAuth.js v5（ID/パスワード認証、bcryptjsによるハッシュ化）
- **スタイリング**: Tailwind CSS + shadcn/ui
- **地図**: Leaflet + React Leaflet

### 主要仕様
- **認証方式**: 数字ID + 半角英数パスワード（複数端末同時ログイン可能）
- **演説予定入力**: 開始日時（日付+時間）、終了時刻（時間のみ、8:00-20:00、15分間隔）
- **データベース**: PostgreSQL（Prisma経由で接続、SSL必須）

## 実装状況

### 完了機能
- プロジェクト初期化（Next.js + TypeScript + Tailwind + shadcn/ui）
- Prismaスキーマ定義
- NextAuth認証とRBAC（ID/パスワード認証、bcryptjsによるパスワードハッシュ化）
- 候補者CRUD（管理画面）と候補者一覧（公開画面）
- 演説予定CRUD（管理画面）と候補者ページの予定一覧（公開画面）
  - 時間入力はドロップダウン選択（8:00-20:00、15分間隔）
  - 開始日時と終了時刻の入力形式
- Leaflet地図コンポーネント（イベントピン表示、入力UI）
- 公開リクエスト投稿API
- 報告API（開始/終了/場所変更）
- リクエスト審査画面（重複キーによるグループ化表示）
- 施設データ取り込みスクリプト（CSV/GeoJSON対応）
- UIデザイン（カラースキームとグラデーション）
- データクリーンアップスクリプト（サンプルデータ削除）

### 実装予定機能
- リクエスト審査画面の一括承認機能（UI実装済み、API未実装）
- 開始/終了報告の自動承認（Cron + ロジック）
- 場所変更報告→MoveHint生成→公開側注意＋推定ピン
- 他党イベント登録＆表示
- 施設レイヤー表示（地図上での施設データ可視化）
- 共有ボタン（予定/実施中）＋分析イベント計測
- テスト（Vitest + Playwright）
- 変更履歴の表示
- 画像アップロード機能（Vercel Blob）

## 仮定・制約事項

1. **自動承認**: 開始/終了報告の自動承認機能は未実装です。Vercel Cron等でバッチ処理を実装する必要があります。`app/api/cron/auto-approve/route.ts` のようなエンドポイントを作成し、Vercel Cronから定期実行する必要があります。

2. **画像アップロード**: Vercel Blobへのアップロード機能は未実装です。管理画面でURLを直接入力する形式です。`app/api/admin/upload/route.ts` を作成し、Vercel Blob SDKを使用して実装する必要があります。

3. **分析**: Umamiの統合は未実装です。`lib/analytics.ts`に基盤は用意されています。Umamiのスクリプトを`app/layout.tsx`に追加し、`trackEvent`関数を使用してイベントを計測する必要があります。

4. **施設レイヤー表示**: 施設データの取り込みスクリプトは実装済みですが、地図上での施設レイヤー表示機能は未実装です。大量の施設データを効率的に表示するため、クラスタリング等の最適化が必要です。

5. **重複非表示**: リクエスト画面で重複キーによるグループ化は表示のみです。一括承認機能のAPIエンドポイント（`app/api/admin/requests/bulk-approve/route.ts`）を実装する必要があります。

6. **他党イベント**: 他党イベントのCRUD機能は未実装です。`app/admin/rival-events/page.tsx` と `app/api/admin/rival-events/route.ts` を実装する必要があります。

7. **共有ボタン**: 共有ボタンのUIはありますが、実際の共有機能（Web Share APIまたはクリップボードコピー）は未実装です。

## 今後の改善

- [ ] 画像アップロード機能（Vercel Blob）
- [ ] 自動承認バッチ処理（Vercel Cron）
- [ ] MoveHint生成と推定ピン表示
- [ ] 施設レイヤー表示機能（地図上での可視化）
- [ ] 共有ボタン実装
- [ ] Umami分析統合
- [ ] E2Eテスト
- [ ] パフォーマンス最適化（施設データのクラスタリング等）

## ライセンス

このプロジェクトは完全無料（公共目的）です。課金機能はありません。

## コントリビューション

コントリビューションを歓迎します。詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。
