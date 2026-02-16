# チームみらい 街頭演説マップ

候補者の街頭演説予定・実施中・終了を地図で可視化するWebアプリケーションです。  
サポーター作の非公式サイトです。

## 現在の主な機能

### 公開側
- 候補者一覧表示（立候補区分・選挙区表示制御に対応）
- 候補者ページ（予定一覧 + 地図）
- イベント詳細ページ
- 演説状態表示（`PLANNED` / `LIVE` / `ENDED`）
- MoveHint（場所変更報告から推定地点を表示）
- 共有ボタン（X/Twitter, Facebook, LINE, クリップボード）
- 公開リクエスト投稿（新規・変更提案）
- 報告機能（開始・終了・場所変更・確認）

### 管理側
- 管理ログイン（数字ID + パスワード）
- 候補者CRUD
- 演説予定CRUD
- 演説予定CSV一括入稿（管理画面 `/admin/events/bulk`）
- 公開リクエスト審査（絞り込み・一括承認/却下）
- サイト設定（表示制御・共有テンプレート）
- APIキー管理UI（SiteAdmin向け）
- OGP再生成API（全件再生成・運用補助）

### 公開API
- `GET /api/public/candidates`（APIキー必須）
- `GET /api/public/candidates/{slug}/events`（APIキー必須）
- `GET /api/public/settings`（認証不要）
- `GET /api/docs`（OpenAPI JSON）

### Cron / 自動処理
- `GET /api/cron/regenerate-ended-og`（終了イベントOGPの定期再生成）
- `GET /api/cron/auto-approve`（報告ベースの自動承認）
- `GET /api/cron/seed-og-blob`（初回Blob投入向け）

## 技術スタック

- フレームワーク: Next.js 15 (App Router)
- 言語: TypeScript
- UI: Tailwind CSS + shadcn/ui
- 地図: Leaflet + React Leaflet
- 認証: NextAuth.js v5（Credentials）
- DB: PostgreSQL + Prisma
- ストレージ: Vercel Blob（OGP/画像用途）
- 分析: Vercel Analytics（`@vercel/analytics`）
- テスト環境: Vitest / Playwright（実行基盤あり）

## ローカルセットアップ

### 1. 依存関係をインストール

```bash
npm install
```

### 2. 環境変数ファイルを作成

```powershell
Copy-Item .env.example .env
```

```bash
cp .env.example .env
```

### 3. `.env` の必須値を設定

最低限、以下を設定してください。

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `AUTH_SECRET`（通常 `NEXTAUTH_SECRET` と同値）
- `REPORTER_HASH_SALT`

### 4. Prismaクライアント生成とDB反映

```bash
npm run db:generate
npm run db:push
```

### 5. 管理ユーザー作成

```bash
npm run create:admin-user
```

手動指定する場合:

```bash
npm run create:admin-user -- --userId 123456 --password AdminPass123 --name "管理者" --role SiteAdmin
```

### 6. 開発サーバー起動

```bash
npm run dev
```

- 公開: `http://localhost:3000`
- 管理ログイン: `http://localhost:3000/admin/login`

## 環境変数

`.env.example` に合わせた主な項目です。

### 必須
- `DATABASE_URL`: PostgreSQL接続文字列
- `NEXTAUTH_URL`: ベースURL
- `NEXTAUTH_SECRET`: NextAuth秘密鍵
- `AUTH_SECRET`: NextAuth互換秘密鍵（通常同値）
- `REPORTER_HASH_SALT`: レポーター識別ハッシュ用ソルト

### 任意
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob利用時に必要
- `CRON_SECRET`: Cronエンドポイント保護用
- `ALLOWED_ORIGINS`: 公開APIのCORS許可オリジン
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID`
- `NEXT_PUBLIC_UMAMI_SCRIPT_URL`

## 主要npmスクリプト

### 開発・ビルド
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

### DB
- `npm run db:generate`
- `npm run db:push`
- `npm run db:migrate`
- `npm run db:studio`

### 管理・運用
- `npm run create:admin-user`
- `npm run seed`
- `npm run generate:og-images`
- `npm run regenerate:ended-og`

### データ取込・クリーンアップ
- `npm run ingest:facilities`
- `npm run check:facilities`
- `npm run cleanup:sample-facilities`
- `npm run cleanup:all-sample-data`
- `npm run cleanup:all-candidates-and-events`

### テスト
- `npm run test`
- `npm run test:e2e`

## デプロイ（Vercel想定）

### 必須設定
- 環境変数をVercelに登録（特に `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, `REPORTER_HASH_SALT`）
- OGPをBlob運用する場合は `BLOB_READ_WRITE_TOKEN` を設定
- Cron保護のため `CRON_SECRET` の設定を推奨

### 現在の `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/regenerate-ended-og",
      "schedule": "0 * * * *"
    }
  ]
}
```

必要に応じて `auto-approve` などのCronを追加してください。

## 実装ギャップ（現状）

- 他党イベント（`RivalEvent`）の管理UI/APIは未実装
- `EventHistory` は記録されるが閲覧UIは未実装
- 施設データは取り込み可能だが地図レイヤー表示は未実装
- 画像アップロードAPI（`/api/admin/upload`）はあるが管理画面からの導線は未整備
- Vitest/Playwright のテストコードはほぼ未整備

## ドキュメント

- システム仕様: `docs/SPECIFICATION.md`
- API: `docs/API.md`
- APIセットアップ: `docs/API_SETUP.md`
- DBセットアップ: `docs/DATABASE_SETUP.md`
- 施設データ: `docs/FACILITY_DATA.md`
- 本番構築: `docs/PRODUCTION_SETUP.md`
- Vercel構築ガイド: `docs/VERCEL_DEPLOYMENT_GUIDE.md`
- 本番クイックスタート: `docs/QUICK_START_PRODUCTION.md`
- 貢献方法: `CONTRIBUTING.md`

## ライセンス

`LICENSE` を参照してください。
