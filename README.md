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
- **Cron**: Vercel Cron（自動承認バッチ処理）
- **OGP画像生成**: `@vercel/og` + `@napi-rs/canvas`（事前生成方式）
- **画像ストレージ**: Vercel Blob（予定）
- **分析**: Umami Analytics（基盤実装済み、統合予定）

### 開発ツール
- **パッケージマネージャー**: npm
- **テストフレームワーク**: Vitest（単体テスト）、Playwright（E2Eテスト）
- **リンター**: ESLint
- **OGP画像生成スクリプト**: `scripts/generate-og-images.ts`（ビルド時に自動実行）

## 機能

### 公開側
- 候補者一覧（立候補区分・選挙区の表示制御対応）
- 候補者ページ（演説予定一覧 + 地図）
  - 演説予定・実施中・終了の状態表示
  - MoveHint（推定位置）の表示（オレンジ色のマーカー）
- 演説予定共有ボタン（Twitter、Facebook、LINE、クリップボードコピー）
- 演説実施中共有ボタン（Twitter、Facebook、LINE、クリップボードコピー）
- 公開リクエスト投稿（予定登録/変更、開始/終了報告、場所変更報告、時間変更報告）
- 報告機能（開始/終了/場所変更/確認）

### 管理側
- 候補者管理（CRUD）
- 演説予定管理（CRUD）
  - 開始日時と終了時刻の入力（時間は8:00-20:00のドロップダウン選択）
  - 時間未定対応（`timeUnknown`フラグ）
- リクエスト審査（絞り込み、ソート、一括承認、重複非表示）
- サイト設定（立候補区分表示制御、候補者ラベル、演説予定表示制御、候補者ごとの表示設定）
- 他党イベント管理（予定）
- 変更履歴・監査ログ（記録済み、表示機能は予定）

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
- `CRON_SECRET`: 自動承認Cronエンドポイントの認証用シークレット（本番環境推奨）

詳細は [docs/PRODUCTION_SETUP.md](docs/PRODUCTION_SETUP.md) を参照してください。

### 自動承認Cronの設定

本番環境で自動承認機能を使用する場合、Vercel Cronを設定してください。

1. Vercelダッシュボードでプロジェクトを開く
2. 「Settings」→「Cron Jobs」に移動
3. 新しいCron Jobを追加：
   - **Path**: `/api/cron/auto-approve`
   - **Schedule**: `*/5 * * * *`（5分ごと、必要に応じて調整）
   - **Timezone**: `Asia/Tokyo`

または、`vercel.json`に以下の設定を追加：

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

**セキュリティ**: 本番環境では必ず`CRON_SECRET`環境変数を設定し、Cronリクエストに`Authorization: Bearer <CRON_SECRET>`ヘッダーを追加してください。

## API公開

外部連携のためにAPIを公開することができます。

### セットアップ

1. **データベースマイグレーション**
   ```bash
   npm run db:migrate
   ```

2. **環境変数の設定**（オプション）
   ```env
   # CORS設定（許可するオリジンをカンマ区切りで指定）
   ALLOWED_ORIGINS="https://example.com,https://app.example.com"
   ```

3. **APIキーの作成**
   - 管理画面からAPIキーを作成（今後、管理画面UIに追加予定）
   - 現在は `/api/admin/api-keys` エンドポイントを使用

### APIドキュメント

- **詳細ドキュメント**: [docs/API.md](docs/API.md)
- **セットアップガイド**: [docs/API_SETUP.md](docs/API_SETUP.md)
- **OpenAPI仕様**: `/api/docs` エンドポイントで取得可能

### 主な機能

- **APIキー認証**: X-API-Key ヘッダーまたは Authorization: Bearer 形式
- **レート制限**: APIキーごとに設定可能（デフォルト: 1分あたり100リクエスト）
- **CORS対応**: 外部ドメインからのアクセスを許可
- **OpenAPI仕様**: Swagger UIなどで使用可能

### 利用可能なエンドポイント

- `GET /api/public/candidates` - 候補者一覧取得
- `GET /api/public/candidates/{slug}/events` - 候補者の演説イベント一覧取得
- `GET /api/public/settings` - 公開設定取得（認証不要）
- `GET /api/docs` - OpenAPI仕様取得（認証不要）

詳細は [docs/API.md](docs/API.md) を参照してください。

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
- **候補者タイプ**: `SINGLE`（小選挙区）、`PROPORTIONAL`（比例区）、`PARTY_LEADER`（党首）、`SUPPORT`（応援弁士）
- **データベース**: PostgreSQL（Prisma経由で接続、SSL必須）

## 実装状況

### ✅ 完全実装済み

#### コア機能
- プロジェクト初期化（Next.js + TypeScript + Tailwind + shadcn/ui）
- Prismaスキーマ定義
- NextAuth認証とRBAC（ID/パスワード認証、bcryptjsによるパスワードハッシュ化）
- 候補者CRUD（管理画面）と候補者一覧（公開画面）
  - 立候補区分・選挙区の表示制御（公選法対応）
  - 候補者ラベルのカスタマイズ
  - 候補者タイプ対応（小選挙区、比例区、党首、応援弁士）
- 演説予定CRUD（管理画面）と候補者ページの予定一覧（公開画面）
  - 時間入力はドロップダウン選択（8:00-20:00、15分間隔）
  - 開始日時と終了時刻の入力形式
  - 時間未定対応（`timeUnknown`フラグ）
  - 合同演説機能（複数候補者の同時登録）
- Leaflet地図コンポーネント（イベントピン表示、入力UI）
  - MoveHint（推定位置）の表示（オレンジ色のマーカー）
- 公開リクエスト投稿API
- 報告API（開始/終了/場所変更/確認）
- リクエスト審査画面（重複キーによるグループ化表示、一括承認・却下）
- 自動承認バッチ処理（Cronエンドポイント、2件以上の報告で自動承認）
- MoveHint生成機能（場所変更報告のクラスタリング、推定位置の計算）
- 共有ボタン（Twitter、Facebook、LINE、クリップボードコピー）
- サイト設定機能（立候補区分表示制御、候補者ラベル、演説予定表示制御、候補者ごとの表示設定）
- 施設データ取り込みスクリプト（CSV/GeoJSON対応）
- UIデザイン（カラースキームとグラデーション）
- データクリーンアップスクリプト（サンプルデータ削除）
- API公開機能（APIキー認証、レート制限、CORS対応、OpenAPI仕様）

#### OGP画像生成機能
- **事前生成方式**: ビルド時にOGP画像を事前生成（`public/og-images/`に保存）
- **対応ページ**: トップページ、エリアページ、候補者ページ、イベントページ
- **地図スクリーンショット**: Canvas API（`@napi-rs/canvas`）を使用した地図画像生成
  - OpenStreetMapタイルの取得と合成
  - ピンと吹き出しの描画（日本語フォント対応）
  - 吹き出しには候補者名、場所、時間を表示
- **フォールバック**: 地図生成失敗時はテキストのみのOGP画像を動的生成
- **自動更新**: イベントの作成・更新・削除時に、該当するOGP画像だけが自動で再生成される（場所・時間の変更時も同様）。通常は全OGP再生成は不要
- **全OGP再生成（任意）**: 初回Blob導入時など特別なときのみ、`/api/admin/generate-all-og-images`で全画像を一括再生成可能
- **フォント**: Noto Sans JP（自動ダウンロードスクリプト付き）

### ⚠️ 一部実装済み（不完全）

- **変更履歴の記録**: EventHistoryテーブルへの記録は実装済みだが、管理画面での履歴閲覧機能は未実装
- **分析基盤**: `lib/analytics.ts`に基盤は実装済みだが、Umami統合（`app/layout.tsx`へのスクリプト追加）は未実装

### ❌ 未実装

- **他党イベント登録＆表示**: CRUD機能は未実装（`RivalEvent`テーブルは定義済み）
- **施設レイヤー表示**: 施設データの取り込みスクリプトは実装済みだが、地図上での施設レイヤー表示機能は未実装
- **画像アップロード機能**: Vercel Blobへのアップロード機能は未実装（管理画面でURLを直接入力する形式）
- **APIキー管理画面UI**: APIキー作成・管理のUIは未実装（APIエンドポイントは実装済み）
- **テスト**: Vitest（単体テスト）、Playwright（E2Eテスト）のテストコードは未実装

## 仮定・制約事項

1. **自動承認**: 開始/終了報告の自動承認機能は実装済みです（`app/api/cron/auto-approve/route.ts`）。Vercel Cronから定期実行する必要があります。本番環境では`CRON_SECRET`環境変数を設定してセキュリティを確保してください。

2. **OGP画像生成**: OGP画像はビルド時に事前生成されます（`prebuild`スクリプト）。日本語フォント（Noto Sans JP）は自動ダウンロードされますが、初回ビルド時はネットワーク接続が必要です。地図生成に失敗した場合は、テキストのみのフォールバック画像が動的に生成されます。

3. **画像アップロード**: Vercel Blobへのアップロード機能は未実装です。管理画面でURLを直接入力する形式です。`app/api/admin/upload/route.ts` を作成し、Vercel Blob SDKを使用して実装する必要があります。

4. **分析**: Umamiの統合は基盤のみ実装済みです。`lib/analytics.ts`に基盤は用意されていますが、Umamiのスクリプトを`app/layout.tsx`に追加し、`trackEvent`関数を使用してイベントを計測する必要があります。

5. **施設レイヤー表示**: 施設データの取り込みスクリプトは実装済みですが、地図上での施設レイヤー表示機能は未実装です。大量の施設データを効率的に表示するため、クラスタリング等の最適化が必要です。

6. **他党イベント**: 他党イベントのCRUD機能は未実装です。`app/admin/rival-events/page.tsx` と `app/api/admin/rival-events/route.ts` を実装する必要があります。

7. **変更履歴の表示**: 変更履歴（EventHistory）の記録は実装済みですが、管理画面での履歴閲覧機能は未実装です。

## 今後の改善

### 優先度: 高
- [ ] APIキー管理画面UI（管理画面でのAPIキー作成・管理）
- [ ] 変更履歴の表示（管理画面での履歴閲覧）
- [ ] Umami分析統合（`app/layout.tsx`へのスクリプト追加）

### 優先度: 中
- [ ] 画像アップロード機能（Vercel Blob）
- [ ] 他党イベント登録＆表示（CRUD機能）
- [ ] 施設レイヤー表示機能（地図上での可視化）

### 優先度: 低
- [ ] E2Eテスト（Playwright）
- [ ] 単体テスト（Vitest）
- [ ] パフォーマンス最適化（施設データのクラスタリング等）

## ライセンス

このプロジェクトは完全無料（公共目的）です。課金機能はありません。

## コントリビューション

コントリビューションを歓迎します。詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。
