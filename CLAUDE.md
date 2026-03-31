# Street-Speech-Map — 街頭演説マップ Web アプリ

候補者の街頭演説予定・実施中・終了を地図で可視化する Next.js アプリ。

## 所属組織: SpeechMap（子会社）

このプロジェクトは SpeechMap 子会社が管轄する。作業開始時に以下を読み込むこと:

- **子会社本部**: `C:/Users/Nagi/.company/subsidiaries/speechmap/CLAUDE.md`
- **スプリント**: `C:/Users/Nagi/.company/subsidiaries/speechmap/todos/current-sprint.md`
- **改善計画**: `C:/Users/Nagi/.company/subsidiaries/speechmap/engineering/2026-03-17-improvement-plan.md`
- **親会社PM**: `C:/Users/Nagi/.company/pm/projects/2026-03-12-street-speech-map.md`

## 技術スタック

- Next.js 16 (App Router) / TypeScript
- UI: Tailwind CSS + shadcn/ui (Radix UI)
- 地図: Leaflet + React Leaflet
- 認証: NextAuth.js v5 (Credentials)
- DB: PostgreSQL + Prisma
- ストレージ: Vercel Blob（画像）
- テスト: Vitest / Playwright
- デプロイ: Vercel

## コマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run test:e2e` | Playwright E2E |
| `npm run db:push` | Prisma スキーマ反映 |
| `npm run db:studio` | Prisma Studio |
| `npm run db:migrate` | マイグレーション作成 |
| `npm run create:admin-user` | 管理ユーザー作成（CLI） |

## ディレクトリ構成

| パス | 説明 |
|-----|------|
| `app/` | Next.js App Router ページ |
| `app/admin/` | 管理画面（ダッシュボード、イベント、候補者、リクエスト、設定、ユーザー管理、APIキー） |
| `app/api/admin/` | 管理API（candidates, events, requests, settings, users, api-keys, upload, me） |
| `app/api/cron/` | Cron ジョブ（auto-approve, auto-end） |
| `app/api/public/` | 公開API（candidates, reports, requests, settings） |
| `app/(public)/` | 公開ページ（トップ、エリア別、候補者別、イベント詳細） |
| `components/` | UI コンポーネント |
| `lib/` | ユーティリティ・ヘルパー |
| `prisma/` | Prisma スキーマ + dev.db |
| `scripts/` | 管理・データ取込スクリプト |
| `docs/` | ドキュメント（仕様書・API・デプロイ手順） |
| `public/` | 静的ファイル |

## 認証・権限

- NextAuth.js v5 Credentials プロバイダー（数字ID + パスワード）
- 4段階ロール: `SiteAdmin` > `SiteStaff` > `PartyAdmin` > `RegionEditor`
- SiteAdmin: 全権限（ユーザー管理・APIキー管理を含む）
- SiteStaff/PartyAdmin: 全候補者・イベント・リクエスト管理
- RegionEditor: 担当地域の候補者・イベント・リクエストのみ管理可能（`lib/rbac.ts` の `canManageCandidate` で制御）
- ユーザー管理UI: `/admin/users`（SiteAdmin専用、ID・パスワード自動生成）
- JWTロール即時反映: session callback で毎回DBから role/region を再取得（降格・削除の即時反映）
- RBAC: イベント作成・更新時、candidateId/additionalCandidateIds の全候補者に対して canManageCandidate チェックを実施

## 自動終了（Auto-End）

- `/api/cron/auto-end` が5分ごとに実行（Vercel Cron）
- 予定終了時刻（endAt）から15分経過した PLANNED/LIVE イベントを自動的に ENDED にする
- timeUnknown や endAt 未設定のイベントは対象外
- 終了報告ボタンは廃止済み（開始報告ボタンのみ残存）

## レートリミット

- `@upstash/ratelimit` + `@upstash/redis` による sliding window（1分/10リクエスト）
- Upstash env 未設定時は全許可 + warn（開発環境フォールバック）
- 対象: `/api/public/reports`, `/api/public/requests`, 認証済み API（`withRateLimit`）

## OG 画像

- `/api/og?type=candidate&slug=...` でオンデマンド生成（`@vercel/og`）
- CDN キャッシュ: `s-maxage=604800`（7日）
- 既存静的ファイル: `public/og-images/`（レガシー、段階的に廃止予定）

## 環境変数（必須）

`DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, `REPORTER_HASH_SALT`

## 環境変数（推奨）

- `CRON_SECRET` — Cron エンドポイントの認証（本番必須）
- `UPSTASH_REDIS_REST_URL` — Upstash Redis REST エンドポイント（レートリミット用）
- `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis 認証トークン

## セキュリティヘッダー（2026-03-21 追加）

`next.config.ts` の `headers()` で全ルート `/(.*)`  に以下を設定済み:
- X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, Strict-Transport-Security
- geolocation=() で拒否設定 — Leaflet は地図タイル表示のみで Geolocation API 未使用

## Gotchas

- Upstash env 未設定でもアプリは起動する（レートリミットが無効になるだけ）
- `prisma/dev.db` は SQLite 開発用 DB。本番は PostgreSQL
- 施設データ地図レイヤー・他党イベント管理 UI は未実装
- Leaflet はクライアントサイドのみ（dynamic import 必須）
- react-leaflet v4 は React 18 を peer dep に要求 — React 19 で動作するが npm install 時に警告あり。将来 react-leaflet v5 へ移行推奨
