# システム仕様書

## 概要

チームみらい 街頭演説マップは、候補者の街頭演説予定・実施中・終了を地図で可視化するWebアプリケーションです。

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
- **OGP画像生成**: 事前生成方式（`@vercel/og` + `@napi-rs/canvas`）
- **OGP画像ストレージ**: **Vercel Blob 運用を基本方針**（本番は Blob に保存・配信。ローカルは `public/og-images` は開発用のみ）
- **分析**: Umami Analytics（基盤実装済み、統合予定）

### 開発ツール
- **パッケージマネージャー**: npm
- **テストフレームワーク**: Vitest（単体テスト）、Playwright（E2Eテスト）
- **リンター**: ESLint

## アーキテクチャ

### アプリケーション構成
- **アプリケーションタイプ**: フルスタックWebアプリケーション
- **レンダリング方式**: Next.js App Router（Server Components + Client Components）
- **認証方式**: セッションベース認証（JWT）
- **データベース接続**: Prisma経由でPostgreSQLに接続

### ディレクトリ構造
```
app/
  ├── (admin-auth)/      # 管理画面認証関連
  ├── (public)/          # 公開ページ
  ├── admin/             # 管理画面
  ├── api/                # API Routes
  └── layout.tsx          # ルートレイアウト

components/               # 共通コンポーネント
lib/                     # ユーティリティ関数
prisma/                  # Prismaスキーマ
scripts/                 # スクリプト
public/                  # 静的ファイル
```

## データベース仕様

### データベースサーバー
- **種類**: PostgreSQL
- **接続方式**: 接続文字列による接続（SSL必須）
- **ORM**: Prisma
- **マイグレーション**: Prisma Migrate / Prisma DB Push

### 主要テーブル
- `User`: ユーザー情報（管理者）
- `Candidate`: 候補者情報
- `Event`: 演説予定情報
- `Request`: 公開リクエスト
- `Facility`: 施設データ
- `RivalEvent`: 他党イベント

詳細は `prisma/schema.prisma` を参照してください。

## 認証仕様

### 認証方式
- **認証タイプ**: ID/パスワード認証
- **ID形式**: 数字（6桁推奨）
- **パスワード形式**: 半角英数
- **パスワード保存**: bcryptjsによるハッシュ化
- **同時ログイン**: 同一ID/パスワードで複数端末から同時ログイン可能
- **セッション管理**: NextAuth.jsによるセッション管理

### 権限管理
- `SiteAdmin`: サイト管理者（全権限）
- `SiteStaff`: サイトスタッフ
- `PartyAdmin`: 政党管理者
- `RegionEditor`: 地域編集者

## UI/UX仕様

### デザインシステム
- **コンポーネントライブラリ**: shadcn/ui
- **スタイリング**: Tailwind CSS
- **カラースキーム**: カスタムカラーパレット（HSL形式）
- **フォント**: Noto Sans JP（日本語対応）
- **レスポンシブデザイン**: Tailwind CSSのブレークポイントを使用

### カラーパレット
- **背景グラデーション**: `linear-gradient(to right, #64D8C6 0%, #64D8C6 60%, #E2F6F3 100%)`
- **プライマリカラー**: Teal系（HSL: 180 100% 25%）
- **セカンダリカラー**: ライトグレー系（HSL: 180 20% 95%）

### 演説予定入力仕様
- **開始日時**: 日付 + 時間（ドロップダウン選択）
- **終了時刻**: 時間のみ（ドロップダウン選択、開始日時の日付を使用）
- **時間選択範囲**: 8:00 - 20:00
- **時間間隔**: 15分間隔（00, 15, 30, 45）

## API仕様

### 公開API
- `GET /api/public/candidates`: 候補者一覧取得（APIキー認証）
- `GET /api/public/candidates/{slug}/events`: 候補者の演説イベント一覧取得（APIキー認証）
- `GET /api/public/settings`: 公開設定取得（認証不要）
- `GET /api/docs`: OpenAPI仕様取得（認証不要）
- `POST /api/public/requests`: 公開リクエストの投稿（認証不要）
- `POST /api/public/reports`: 報告（開始/終了/場所変更、認証不要）

### 管理API
- `GET /api/admin/candidates`: 候補者一覧取得
- `POST /api/admin/candidates`: 候補者作成
- `GET /api/admin/candidates/[id]`: 候補者詳細取得
- `PUT /api/admin/candidates/[id]`: 候補者更新
- `DELETE /api/admin/candidates/[id]`: 候補者削除
- `GET /api/admin/events`: 演説予定一覧取得
- `POST /api/admin/events`: 演説予定作成
- `GET /api/admin/events/[id]`: 演説予定詳細取得
- `PUT /api/admin/events/[id]`: 演説予定更新
- `DELETE /api/admin/events/[id]`: 演説予定削除
- `GET /api/admin/requests`: リクエスト一覧取得
- `PUT /api/admin/requests/[id]`: リクエスト承認/却下
- `POST /api/admin/generate-all-og-images`: 全OGP画像の強制再生成

### OGP画像エンドポイント
- `GET /opengraph-image`: トップページのOGP画像
- `GET /area/opengraph-image`: エリアページのOGP画像
- `GET /c/[slug]/opengraph-image`: 候補者ページのOGP画像
- `GET /c/[slug]/events/[eventId]/opengraph-image`: イベントページのOGP画像

### Cronエンドポイント
- `GET /api/cron/auto-approve`: 自動承認バッチ処理（Vercel Cronから呼び出し）

## データ管理

### 施設データ取り込み
- **対応形式**: CSV、GeoJSON
- **スクリプト**: `scripts/ingest-facilities.ts`
- **コマンド**: `npm run ingest:facilities`

### データクリーンアップ
- **サンプルデータ削除**: `npm run cleanup:all-sample-data`
- **候補者・演説予定削除**: `npm run cleanup:all-candidates-and-events`
- **サンプル施設削除**: `npm run cleanup:sample-facilities`

## 環境変数

### 必須環境変数
- `DATABASE_URL`: PostgreSQL接続文字列
- `NEXTAUTH_URL`: アプリケーションURL
- `NEXTAUTH_SECRET`: NextAuthシークレットキー
- `REPORTER_HASH_SALT`: レポーターハッシュ用ソルト

### オプション環境変数
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob トークン（**本番推奨**。Blob運用の基本方針のため、設定時は OGP 画像は Blob に保存・配信）
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID`: Umami Analytics Website ID
- `NEXT_PUBLIC_UMAMI_SCRIPT_URL`: Umami Analytics Script URL

## デプロイ仕様

### 推奨プラットフォーム
- **ホスティング**: Vercel
- **データベース**: Neon、Supabase、Railway

### デプロイ手順
1. Vercelにプロジェクトをインポート
2. 環境変数を設定
3. PostgreSQLデータベースを接続
4. デプロイ

詳細は [README.md](../README.md) の「デプロイ」セクションを参照してください。

## セキュリティ

### 認証・認可
- パスワードはbcryptjsでハッシュ化
- セッションはJWTで管理
- 管理画面は認証必須

### データ保護
- データベース接続はSSL必須
- 環境変数による機密情報管理
- SQLインジェクション対策（Prisma使用）

## パフォーマンス

### 最適化
- Next.js App Routerによる自動最適化
- Server Componentsによるサーバーサイドレンダリング
- 画像最適化（Next.js Image）

### OGP画像生成仕様
- **ストレージ方針**: **Blob運用を基本方針**。本番（`BLOB_READ_WRITE_TOKEN` 設定時）は Vercel Blob に保存し、opengraph-image は Blob URL へリダイレクト。ローカルは `public/og-images` を参照可能（開発用）。
- **生成方式**: 事前生成（Blob またはローカルの `public/og-images/`）
- **地図生成**: Canvas API（`@napi-rs/canvas`）を使用して OpenStreetMap タイルを合成
- **フォント**: Noto Sans JP（自動ダウンロードスクリプト付き）
- **フォールバック**: 地図生成失敗時はテキストのみの OGP 画像を動的生成
- **自動更新**: イベント作成・更新・削除時に OGP 画像を自動再生成（Blob またはローカルに保存）
- **初回Blob初期化**: 全OGP画像を新規作成してBlobに上書き保存するには、管理画面から「全OGP画像の強制再生成」API（`POST /api/admin/generate-all-og-images`）を1回呼ぶか、Cron用エンドポイント（`GET /api/cron/seed-og-blob`、`Authorization: Bearer <CRON_SECRET>`）を1回呼ぶ。対象は home / area / 全候補者 / 全イベント（PLANNED・LIVE）。

### 今後の改善予定
- 施設データのクラスタリング
- 地図表示の最適化
- キャッシュ戦略の見直し
- OGP画像生成の最適化（並列処理、キャッシュ戦略）

