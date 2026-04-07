# PRD: API テスト追加（F-008）

## Overview

Street-Speech-Map の重要 API エンドポイントに Vitest を使ったユニット/統合テストを追加する。
対象は F-001〜F-007 で修正済みの高リスクエンドポイント。Prisma クライアントはモックを使い、
Next.js の `NextRequest` / `NextResponse` を直接インポートしてハンドラを単体テストする。
テストは `npm run test` で全件パスし、CI で回帰を検知できる状態にする。

## User Stories

### Story 1: Vitest 設定と共通モック基盤
**As a** 開発者
**I want to** vitest.config.ts と共通の Prisma モックを設定する
**So that** テストを即座に実行できる基盤を整える

**Acceptance Criteria:**
- [ ] `vitest.config.ts` が Next.js 環境（`@vitejs/plugin-react`不要、`globals: true`）で動作する
- [ ] `src/__tests__/helpers/prisma-mock.ts` に `vi.mock('@/lib/prisma')` の共通ヘルパーが存在する
- [ ] `npm run test` コマンドで全テストが実行できる

### Story 2: POST /api/public/reports のテスト
**As a** 開発者
**I want to** POST /api/public/reports の正常系・異常系テストを書く
**So that** スパム対策レート制限と LIVE/ENDED ステータス遷移が壊れないことを保証する

**Acceptance Criteria:**
- [ ] `kind=start` の 1 件目報告でイベントステータスが `LIVE` に遷移することをテストする
- [ ] `kind=end` の 1 件目報告でイベントステータスが `ENDED` に遷移することをテストする
- [ ] `kind=move` で `generateMoveHints` が呼ばれることをテストする
- [ ] 同一 IP から 10 件超の連投で 429 が返ることをテストする
- [ ] イベントが存在しない場合に 404 が返ることをテストする

### Story 3: POST /api/public/requests のテスト
**As a** 開発者
**I want to** POST /api/public/requests のレート制限テストを書く
**So that** reporterHash 単位の制限が正しく動作することを保証する

**Acceptance Criteria:**
- [ ] 同一 reporterHash から 1 分間 10 件超で 429 が返ることをテストする
- [ ] 異なる reporterHash は独立して制限されること（巻き添えなし）をテストする
- [ ] 正常な `CREATE_EVENT` リクエストが `PublicRequest` に保存されることをテストする

### Story 4: PUT /api/admin/events/[id] のトランザクションテスト
**As a** 開発者
**I want to** PUT /api/admin/events/[id] のトランザクション挙動テストを書く
**So that** 部分失敗時にデータ不整合が残らないことを保証する

**Acceptance Criteria:**
- [ ] 正常な更新で `speechEvent.update`・`eventHistory.create`・`eventCandidate.deleteMany` が全て呼ばれることをテストする
- [ ] `speechEvent.update` が失敗した場合、`eventHistory.create` も呼ばれないことをテストする（トランザクションのロールバック確認）
- [ ] 未認証リクエストで 401 が返ることをテストする

### Story 5: CORS OPTIONS エンドポイントのテスト
**As a** 開発者
**I want to** 各公開 API の OPTIONS ハンドラをテストする
**So that** preflight が正しく 204 と CORS ヘッダーを返すことを保証する

**Acceptance Criteria:**
- [ ] `OPTIONS /api/public/candidates` が 204 と `Access-Control-Allow-Methods` ヘッダーを返すことをテストする
- [ ] `OPTIONS /api/public/candidates/[slug]/events` が 204 を返すことをテストする
- [ ] `OPTIONS /api/public/settings` が 204 を返すことをテストする

### Story 6: lib/api-auth の lastUsedAt 間引きテスト
**As a** 開発者
**I want to** verifyApiKey の lastUsedAt 更新ロジックをテストする
**So that** 1 時間以内の二重更新が発生しないことを保証する

**Acceptance Criteria:**
- [ ] lastUsedAt が 1 時間以上前のキーで更新が実行されることをテストする
- [ ] lastUsedAt が 30 分前のキーで更新がスキップされることをテストする
- [ ] `api_key` クエリパラメータが無視されることをテストする
