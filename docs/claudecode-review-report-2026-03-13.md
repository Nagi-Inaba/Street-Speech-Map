# Street-Speech-Map 詳細レビュー報告書

作成日: 2026-03-13
目的: このレポートを Claude Code に読み込ませ、正確な修正プランを作成できるようにする
重要: このレポートは「修正案の前提整理」が目的であり、この時点ではコード修正を要求しない

## 1. 現在の前提

### 1-1. リポジトリの場所

- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map`

### 1-2. 現在のワークツリー状態

このリポジトリはクリーンではない。Claude Code でプラン作成や修正を行う際は、以下の既存変更を誤って巻き戻さないこと。

既存の変更ファイル:

- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\README.md`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\admin\events\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\cron\auto-approve\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\docs\PRODUCTION_SETUP.md`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\docs\SPECIFICATION.md`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\next.config.ts`

既存の未追跡ファイル/ディレクトリ:

- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\.claude\`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\.cursor\`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\.vscode\`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\codex-rules.json`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\docs\street-speech-map-overview-ja.docx`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\docs\claudecode-review-report-2026-03-13.md`

### 1-3. 現時点の確認結果

- `npm run lint` は通過済み
- `npm run build` は通過済み
- ただし OneDrive / Windows 環境では `.next` 配下の `readlink` エラーが出ることがある
- ビルドが `EINVAL: invalid argument, readlink ... .next ...` で失敗した場合は、`cmd /c rmdir /s /q .next` 後に再実行すると再現回避できた

## 2. エグゼクティブサマリー

高優先度の論点は以下の2つ。

1. 匿名公開エンドポイントのコスト耐性が弱く、スパムやボットで CPU / DB 負荷が上がりやすい
2. 管理系更新 API にトランザクション不足があり、失敗時に履歴や関連データの不整合を残す

その次に重要なのが以下。

3. 公開 API の CORS / preflight 実装が意図通り機能していない可能性が高い
4. API キー認証が読み取り API でも毎回 DB 書き込みを発生させている
5. 公開リクエストのレート制限が利用者単位ではなく全体単位になっている
6. `auto-approve` Cron の対象データ経路が実運用とずれており、役割整理が必要

## 3. 詳細 findings

### F-001: 匿名の `POST /api/public/reports` が重い処理を無制限に実行できる

Severity: High

#### 根拠ファイル

- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\public\reports\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\lib\move-hint.ts`

#### 根拠箇所

- `app/api/public/reports/route.ts:30`
- `app/api/public/reports/route.ts:55`
- `app/api/public/reports/route.ts:67`
- `app/api/public/reports/route.ts:76`
- `app/api/public/reports/route.ts:91`
- `app/api/public/reports/route.ts:109`
- `app/api/public/reports/route.ts:119`
- `lib/move-hint.ts:84`
- `lib/move-hint.ts:88`
- `lib/move-hint.ts:121`
- `lib/move-hint.ts:130`
- `lib/move-hint.ts:141`
- `lib/move-hint.ts:170`

#### 現象

- 匿名で叩ける `POST /api/public/reports` は、報告作成だけでなく件数確認、イベント取得、履歴追加、イベント更新まで実行する
- `kind === "move"` の場合は `generateMoveHints(eventId)` を呼び、対象イベントの全移動報告を毎回取り直して再クラスタリングする
- エンドポイント側に明示的なレート制限やボット対策が存在しない

#### リスク

- スパム投稿で DB 書き込み数が増える
- `move` 報告連打で CPU 使用量が増える
- 無料プラン超過やレスポンス遅延の原因になる

#### プラン作成時の論点

- `reports` エンドポイントにレート制限を入れるか
- IP / reporterHash / eventId 単位での制限にするか
- `move-hint` の生成を同期処理から外すか
- `start/end` の自動ステータス更新を同期で維持するか、非同期化するか

#### 修正後の検証項目

- 同一イベントへの `move` 報告連打で CPU 負荷が大きく上がらないこと
- 正常な `start/end` 2件報告で期待通り `LIVE/ENDED` に遷移すること
- `move` 報告後に `MoveHint` が壊れないこと

### F-002: 管理画面のイベント更新が非原子的で、失敗時に不整合を残す

Severity: High

#### 根拠ファイル

- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\admin\events\[id]\route.ts`

#### 根拠箇所

- `app/api/admin/events/[id]/route.ts:74`
- `app/api/admin/events/[id]/route.ts:86`
- `app/api/admin/events/[id]/route.ts:115`
- `app/api/admin/events/[id]/route.ts:121`

#### 現象

- `PUT /api/admin/events/[id]` は最初に `eventHistory.create` を実行する
- その後で `eventCandidate.deleteMany` を実行し、最後に `speechEvent.update` を行う
- これらがトランザクションで束ねられていない

#### 具体的な失敗パターン

- 更新本体が失敗したのに履歴だけ残る
- 合同演説者削除後に更新が失敗すると、中間テーブルだけ欠落する
- 候補者 ID や関連データの問題が途中で起きると、部分更新状態になりうる

#### リスク

- 管理画面編集後にデータ整合性が崩れる
- 「履歴」と「実データ」が食い違う
- 問題再現時に原因追跡が難しくなる

#### プラン作成時の論点

- `eventHistory.create`、`eventCandidate.deleteMany`、`speechEvent.update` を 1 つの `prisma.$transaction` にまとめる
- 先に候補者存在検証と重複検証を済ませてから DB 更新に入る
- PATCH / DELETE 側も同じ整合性方針に寄せるか見直す

#### 修正後の検証項目

- 異常系で途中状態が残らないこと
- 合同演説者あり/なし両方で更新成功すること
- 履歴と本体が一致すること

### F-003: 公開 API の CORS / preflight 実装が実際には機能していない可能性が高い

Severity: Medium

#### 根拠ファイル

- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\lib\api-middleware.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\public\candidates\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\public\candidates\[slug]\events\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\docs\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\public\settings\route.ts`

#### 根拠箇所

- `lib/api-middleware.ts:43`
- `app/api/public/candidates/route.ts:5`
- `app/api/public/candidates/[slug]/events/route.ts:5`
- `app/api/docs/route.ts:197`
- `app/api/public/settings/route.ts:5`

#### 現象

- 各 `GET` ハンドラ内で `handleCorsPreflight(request)` を呼んでいる
- しかし Next.js の `OPTIONS` は `GET` ハンドラには入らないため、この実装では preflight を処理できない
- `public/settings` は CORS ヘッダー付与処理をそもそも使っていない

#### リスク

- ブラウザから `Authorization` または `X-API-Key` を付けて公開 API を呼ぶと preflight で失敗する
- OpenAPI ドキュメントは存在するのに、実際のブラウザ利用が不安定になる

#### プラン作成時の論点

- 各ルートに `export function OPTIONS()` を追加するか
- ルート共通化するなら helper で統一するか
- `public/settings` や `docs` も CORS 方針を合わせるか
- `Access-Control-Allow-Origin` と `credentials` 方針を明確にするか

#### 修正後の検証項目

- ブラウザの別オリジンから `X-API-Key` 付き `GET /api/public/candidates` が成功すること
- `OPTIONS /api/public/candidates` が 204 と必要ヘッダーを返すこと
- `ALLOWED_ORIGINS` 設定あり/なし両方で意図通りになること

### F-004: 公開リクエストのレート制限が全体単位で、利用者単位になっていない

Severity: Medium

#### 根拠ファイル

- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\public\requests\route.ts`

#### 根拠箇所

- `app/api/public/requests/route.ts:28`
- `app/api/public/requests/route.ts:46`
- `app/api/public/requests/route.ts:47`
- `app/api/public/requests/route.ts:48`
- `app/api/public/requests/route.ts:56`

#### 現象

- `generateReporterHash(request)` を計算している
- しかし `recentCount` は `publicRequest` 全体を 1 分単位で数えており、`reporterHash` を使っていない
- 実質「全ユーザー共通で 1 分 10 件」の制限になっている

#### リスク

- 1人の連投で他ユーザーも巻き添えで `429` になる
- スパム対策としても中途半端で、攻撃主体ごとの抑止にならない

#### プラン作成時の論点

- `PublicRequest` に `reporterHash` を保存するか
- もしくは IP / fingerprint ベースの別ストアで制限するか
- `CREATE_EVENT` と `REPORT_MOVE` など、種類ごとに制限値を変えるか

#### 修正後の検証項目

- 同一利用者の連投のみ制限されること
- 別利用者が同時に使っても巻き添えにならないこと

### F-005: API キー認証が読み取り API でも毎回 DB 書き込みを発生させている

Severity: Medium

#### 根拠ファイル

- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\lib\api-auth.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\lib\rate-limit.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\public\candidates\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\public\candidates\[slug]\events\route.ts`

#### 根拠箇所

- `lib/api-auth.ts:23`
- `lib/api-auth.ts:32`
- `lib/api-auth.ts:33`
- `lib/rate-limit.ts:80`

#### 現象

- API キー検証のたびに `apiKey.lastUsedAt` を `update` している
- 公開 API が読み取り専用でも、毎回 DB write が走る
- その後にレート制限判定をしているため、制限超過リクエストでも `lastUsedAt` 更新が先に発生する

#### リスク

- 公開 API アクセス量に比例して DB 書き込みが増える
- CPU / IO / コネクション使用量が上がる
- 課金面でも不利

#### プラン作成時の論点

- `lastUsedAt` の更新頻度を間引くか
- 非同期/バッチ化するか
- レート制限判定後に更新するか
- `lastUsedAt` 自体が必須監査情報か再確認するか

#### 修正後の検証項目

- 公開 API の read リクエストで不要な write が発生しないこと
- API キー監査要件を満たすこと
- レート制限レスポンス時に不要更新が走らないこと

### F-006: API キーをクエリ文字列で受け付けており、漏えいリスクが高い

Severity: Medium

#### 根拠ファイル

- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\lib\api-auth.ts`

#### 根拠箇所

- `lib/api-auth.ts:51`
- `lib/api-auth.ts:64`
- `lib/api-auth.ts:66`

#### 現象

- `Authorization: Bearer ...`
- `X-API-Key`
- `?api_key=...`

上記3経路を許可しており、クエリ文字列も受け付けている。

#### リスク

- ブラウザ履歴に残る
- アクセスログに残る
- リファラに流れる
- URL 共有時に漏れる

#### プラン作成時の論点

- `api_key` クエリ受け入れを廃止するか
- 廃止前に互換性影響を確認するか
- 非推奨化レスポンスやログ警告を挟む段階移行にするか

#### 修正後の検証項目

- ヘッダー方式だけで全 API 利用が成立すること
- 既存利用者への移行案内が必要か判断されていること

### F-007: `auto-approve` Cron の対象データ経路が、現行の公開報告経路と噛み合っていない

Severity: Medium

#### 根拠ファイル

- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\cron\auto-approve\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\public\requests\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\public\reports\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\admin\requests\route.ts`

#### 根拠箇所

- `app/api/cron/auto-approve/route.ts:31`
- `app/api/cron/auto-approve/route.ts:34`
- `app/api/public/requests/route.ts:11`
- `app/api/public/reports/route.ts:55`
- `app/api/public/reports/route.ts:65`
- `app/api/admin/requests/route.ts:350`

#### 現象

- `auto-approve` Cron は `PublicRequest` テーブル上の `REPORT_START` / `REPORT_END` を対象にしている
- しかし `POST /api/public/requests` は `REPORT_START` / `REPORT_END` を受け付けない
- 実際の開始/終了報告は `POST /api/public/reports` に直接入り、その場で `PublicReport` と `SpeechEvent` を更新している
- 管理画面でも `REPORT_START/END` は「手動承認不要」と扱っている

#### 解釈

- Cron の役割は、現行実装ではほぼ死んでいるか、旧実装の名残である可能性が高い
- もし意図的に残しているなら、どの経路が正本なのか整理が必要

#### リスク

- 運用者が Cron を有効化しても期待した効果が出ない
- ドキュメントと実装がズレる
- 将来修正時に誤った前提で触る危険がある

#### プラン作成時の論点

- `start/end` は `reports` で即時自動処理に統一するのか
- それとも `PublicRequest` ベースへ戻すのか
- `auto-approve` 自体を廃止するのか、別用途に縮小するのか

#### 修正後の検証項目

- 仕様書・README・実装が一致していること
- Cron を有効化/無効化したときの役割が明確であること

### F-008: 自動テストが事実上存在せず、重要経路が守られていない

Severity: Medium

#### 根拠

- `rg --files | rg '(test|spec)\.(ts|tsx|js|jsx)$'` でヒットなし

#### 影響範囲

- 公開 API
- 管理更新 API
- Cron
- レート制限
- CORS
- 報告の自動ステータス更新

#### プラン作成時の論点

- 最低限の API テストをどこまで先に追加するか
- 特に修正前後で壊れやすい箇所を優先するか

#### 最低限必要なテスト候補

- `POST /api/public/reports`
- `POST /api/public/requests`
- `PUT /api/admin/events/[id]`
- `GET /api/public/candidates`
- `GET /api/public/candidates/[slug]/events`
- `GET /api/cron/auto-approve`

## 4. 追加の観察メモ

### 4-1. `public/settings` のエラーハンドリング

対象:

- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\public\settings\route.ts`

観察:

- DB エラー時もデフォルト値を `200` で返している
- UX 上は有用だが、障害の見逃しにつながる可能性がある

これは即バグ断定ではないが、設計判断として明文化が必要。

### 4-2. 旧実装の残骸/混乱要因になりうるファイル

対象:

- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\admin\requests\route-なぎ太郎.ts`

観察:

- `route.ts` ではないためルーティング対象ではないはず
- ただし内容は旧実装の参照元になりやすく、レビューや修正時の混乱要因になる

これは優先度低だが、プラン作成時に「触る対象外」か「整理対象」にするか決めるとよい。

## 5. Claude Code に作ってほしい修正プランの期待形

Claude Code には、以下の順でプランを作らせるのが望ましい。

1. まず現行仕様の正本を決める
2. 次に高リスク API のコスト耐性を設計する
3. その後にトランザクション化と整合性修正を行う
4. 最後に CORS / API キー / ドキュメント / テストを揃える

## 6. 推奨プラン順序

### Phase 1: 仕様整理

- `start/end` 報告の正本経路を決める
- `auto-approve` Cron の必要性を判断する
- CORS を外部公開 API として本当にサポートするか確認する

### Phase 2: 高リスク修正

- `POST /api/public/reports` のレート制限 / 耐スパム設計
- `PUT /api/admin/events/[id]` のトランザクション化
- `POST /api/public/requests` のレート制限単位修正

### Phase 3: 課金/運用最適化

- `verifyApiKey` の write-amplification 解消
- `api_key` クエリ受け入れの廃止または段階移行
- 必要なら `MoveHint` 生成の非同期化

### Phase 4: インターフェース整合

- `OPTIONS` 実装追加
- `CORS` 付与漏れの整理
- README / docs / OpenAPI の同期

### Phase 5: テスト

- API テスト追加
- 異常系テスト追加
- 負荷・制限系の簡易検証追加

## 7. 修正プラン作成時に必ず参照してほしいファイル一覧

- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\public\reports\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\public\requests\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\admin\events\[id]\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\admin\requests\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\cron\auto-approve\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\public\candidates\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\public\candidates\[slug]\events\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\public\settings\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\app\api\docs\route.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\lib\api-auth.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\lib\api-middleware.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\lib\rate-limit.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\lib\move-hint.ts`
- `C:\Users\Nagi\OneDrive\ドキュメント\GitHub\Street-Speech-Map\prisma\schema.prisma`

## 8. 修正後に最低限確認すべきコマンド

- `npm run lint`
- `npm run build`

必要なら追加:

- `npx tsc --noEmit`

Windows / OneDrive 環境で `.next` の readlink エラーが出た場合:

- `cmd /c rmdir /s /q .next`
- その後に `npm run build`

## 9. Claude Code への指示文サンプル

以下をそのまま使ってよい。

```text
docs/claudecode-review-report-2026-03-13.md を読んでください。
このレポートの findings を前提に、まだコード修正は行わず、まずは実装方針・影響範囲・検証手順を含む修正プランを作成してください。
既存の未コミット変更は巻き戻さず、対象ファイルの責務整理も含めて提案してください。
```
