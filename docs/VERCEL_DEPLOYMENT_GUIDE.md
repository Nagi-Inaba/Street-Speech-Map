# Vercelデプロイ完全ガイド

このガイドでは、Street-Speech-MapプロジェクトをVercelにデプロイする手順を詳しく説明します。

## 目次

1. [Vercelアカウントの作成](#1-vercelアカウントの作成)
2. [プロジェクトのインポート](#2-プロジェクトのインポート)
3. [環境変数の設定](#3-環境変数の設定)
4. [デプロイの実行](#4-デプロイの実行)
5. [デプロイ後の確認](#5-デプロイ後の確認)
6. [環境変数の更新](#6-環境変数の更新)
7. [カスタムドメインの設定（オプション）](#7-カスタムドメインの設定オプション)
8. [トラブルシューティング](#8-トラブルシューティング)

---

## 1. Vercelアカウントの作成

### 1.1 アカウント作成

1. **Vercelの公式サイトにアクセス**
   - https://vercel.com を開く

2. **サインアップ**
   - 右上の「Sign Up」ボタンをクリック
   - 「Continue with GitHub」を選択（推奨）
   - GitHubアカウントで認証
   - 必要に応じてVercelへのアクセス許可を承認

3. **ダッシュボードにアクセス**
   - サインアップ後、自動的にダッシュボードに移動します

---

## 2. プロジェクトのインポート

### 2.1 プロジェクトの追加

1. **「Add New...」をクリック**
   - ダッシュボードの右上にある「Add New...」ボタンをクリック
   - ドロップダウンメニューから「Project」を選択

2. **GitHubリポジトリの選択**
   - GitHubアカウントが連携されていない場合は、まず連携が必要です
   - 「Import Git Repository」セクションに、GitHubリポジトリの一覧が表示されます
   - `Nagi-Inaba/Street-Speech-Map` を探してクリック

3. **リポジトリが見つからない場合**
   - 「Adjust GitHub App Permissions」をクリック
   - リポジトリへのアクセス権限を付与
   - ページをリロードして再度検索

### 2.2 プロジェクト設定

インポート画面で以下の設定を行います：

#### **Project Name（プロジェクト名）**
- デフォルト: `street-speech-map`
- 変更可能ですが、そのままで問題ありません

#### **Framework Preset（フレームワーク）**
- **自動検出**: Next.js が自動的に検出されます
- 手動で変更する必要はありません

#### **Root Directory（ルートディレクトリ）**
- デフォルト: `./`（プロジェクトルート）
- そのままで問題ありません

#### **Build and Output Settings（ビルド設定）**
- **Build Command**: `npm run build`（自動設定）
- **Output Directory**: `.next`（自動設定）
- **Install Command**: `npm install`（自動設定）

#### **Environment Variables（環境変数）**
- この時点では設定しなくてもOK
- 後で設定画面から追加できます

### 2.3 デプロイの開始

1. **「Deploy」ボタンをクリック**
   - 設定を確認して「Deploy」ボタンをクリック
   - 初回デプロイが開始されます

2. **デプロイの進行状況**
   - 「Building」→「Deploying」→「Ready」の順に進行
   - 通常1-3分程度で完了します

3. **デプロイ完了**
   - 「Congratulations!」画面が表示されます
   - 提供されたURL（例: `https://street-speech-map.vercel.app`）をメモしてください

---

## 3. 環境変数の設定

デプロイが完了したら、環境変数を設定します。

### 3.1 環境変数設定画面へのアクセス

1. **プロジェクトダッシュボードを開く**
   - デプロイ完了後、自動的にプロジェクトページに移動します
   - または、ダッシュボードからプロジェクトを選択

2. **「Settings」タブをクリック**
   - プロジェクトページの上部にあるタブから「Settings」を選択

3. **「Environment Variables」を選択**
   - 左側のメニューから「Environment Variables」をクリック

### 3.2 必須環境変数の設定

以下の環境変数を追加します：

#### **DATABASE_URL**

```
Key: DATABASE_URL
Value: postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
```

- Neonから取得した接続文字列をそのまま貼り付け
- **重要**: `?sslmode=require`が含まれていることを確認

#### **NEXTAUTH_URL**

```
Key: NEXTAUTH_URL
Value: https://your-project-name.vercel.app
```

- デプロイ後に提供されたURLを設定
- 例: `https://street-speech-map.vercel.app`

#### **NEXTAUTH_SECRET**

```
Key: NEXTAUTH_SECRET
Value: [ランダムな32バイトのBase64文字列]
```

**生成方法（PowerShell）**:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**生成方法（Node.js）**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### **AUTH_SECRET**

```
Key: AUTH_SECRET
Value: [NEXTAUTH_SECRETと同じ値]
```

- `NEXTAUTH_SECRET`と同じ値を設定

#### **REPORTER_HASH_SALT**

```
Key: REPORTER_HASH_SALT
Value: [ランダムな16バイトのBase64文字列]
```

**生成方法（PowerShell）**:
```powershell
[Convert]::ToBase64String((1..16 | ForEach-Object { Get-Random -Maximum 256 }))
```

**生成方法（Node.js）**:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

### 3.3 環境変数の追加手順

1. **「Add New」ボタンをクリック**
2. **Key**に変数名を入力（例: `DATABASE_URL`）
3. **Value**に値を入力
4. **Environment**で適用環境を選択:
   - **Production**: 本番環境のみ
   - **Preview**: プレビュー環境（プルリクエストなど）
   - **Development**: 開発環境
   - **推奨**: すべての環境にチェックを入れる
5. **「Save」ボタンをクリック**

### 3.4 オプション環境変数（後で設定可能）

#### **BLOB_READ_WRITE_TOKEN**（画像アップロード機能用）

1. Vercelダッシュボードで「Storage」をクリック
2. 「Create Database」→「Blob」を選択
3. ストレージ名を入力して作成
4. 「Settings」タブから`BLOB_READ_WRITE_TOKEN`をコピー
5. 環境変数として追加

#### **Umami Analytics**（分析用）

```
Key: NEXT_PUBLIC_UMAMI_WEBSITE_ID
Value: [UmamiのウェブサイトID]

Key: NEXT_PUBLIC_UMAMI_SCRIPT_URL
Value: https://your-umami-instance.com/script.js
```

---

## 4. デプロイの実行

### 4.1 環境変数設定後の再デプロイ

環境変数を設定した後、変更を反映するために再デプロイが必要です。

1. **「Deployments」タブをクリック**
   - プロジェクトページの上部タブから「Deployments」を選択

2. **最新のデプロイを選択**
   - デプロイ履歴から最新のデプロイをクリック

3. **「Redeploy」をクリック**
   - 右上の「...」メニューから「Redeploy」を選択
   - 確認ダイアログで「Redeploy」をクリック

または、**「Overview」タブ**から直接「Redeploy」ボタンをクリックすることもできます。

### 4.2 自動デプロイの確認

- GitHubにプッシュすると、自動的にデプロイが開始されます
- 「Deployments」タブでデプロイ履歴を確認できます

---

## 5. デプロイ後の確認

### 5.1 サイトへのアクセス

1. **デプロイされたURLにアクセス**
   - 例: `https://street-speech-map.vercel.app`
   - サイトが正常に表示されることを確認

### 5.2 機能の確認

以下の機能が正常に動作するか確認してください：

- [ ] **トップページが表示される**
  - `/` にアクセスして候補者一覧が表示される

- [ ] **候補者ページが表示される**
  - 候補者をクリックして詳細ページが表示される

- [ ] **地図が表示される**
  - 候補者ページで地図が正常に表示される

- [ ] **管理画面にログインできる**
  - `/admin/login` にアクセス
  - 作成した管理ユーザーでログインできる

- [ ] **管理機能が動作する**
  - 候補者の追加・編集ができる
  - 演説予定の追加・編集ができる

### 5.3 ログの確認

問題が発生した場合、ログを確認します：

1. **「Deployments」タブを開く**
2. **デプロイを選択**
3. **「Build Logs」タブをクリック**
   - ビルド時のエラーを確認
4. **「Function Logs」タブをクリック**
   - 実行時のエラーを確認

---

## 6. 環境変数の更新

環境変数を変更した場合：

1. **「Settings」→「Environment Variables」を開く**
2. **変更したい環境変数を編集**
3. **「Save」をクリック**
4. **再デプロイを実行**
   - 「Deployments」タブから「Redeploy」

---

## 7. カスタムドメインの設定（オプション）

独自のドメインを使用する場合：

### 7.1 ドメインの追加

1. **「Settings」→「Domains」を開く**
2. **「Add Domain」ボタンをクリック**
3. **ドメイン名を入力**（例: `street-speech-map.example.com`）
4. **「Add」をクリック**

### 7.2 DNS設定

Vercelから指示されたDNSレコードを設定：

- **Aレコード**または**CNAMEレコード**を設定
- DNSプロバイダー（例: Cloudflare、Route53）で設定

### 7.3 証明書の自動発行

- Vercelが自動的にSSL証明書を発行します
- 通常数分から数時間で完了します

### 7.4 環境変数の更新

カスタムドメインを設定したら、`NEXTAUTH_URL`を更新：

```
NEXTAUTH_URL=https://your-custom-domain.com
```

---

## 8. トラブルシューティング

### 8.1 ビルドエラー

**症状**: デプロイが失敗する

**確認事項**:
1. **ビルドログを確認**
   - 「Deployments」→ デプロイを選択 → 「Build Logs」
2. **ローカルでビルドを実行**
   ```bash
   npm run build
   ```
3. **環境変数が設定されているか確認**
   - 「Settings」→「Environment Variables」

**よくある原因**:
- 環境変数が不足している
- TypeScriptの型エラー
- Prismaクライアントが生成されていない

**解決方法**:
- 環境変数を追加
- コードのエラーを修正
- `package.json`の`postinstall`スクリプトで`prisma generate`が実行されることを確認

### 8.2 データベース接続エラー

**症状**: サイトは表示されるが、データベースに接続できない

**確認事項**:
1. **DATABASE_URLが正しく設定されているか**
   - `?sslmode=require`が含まれているか
2. **Neonのデータベースがアクティブか**
   - Neonダッシュボードで確認
3. **環境変数が本番環境に適用されているか**
   - 「Environment Variables」で「Production」にチェックが入っているか

**解決方法**:
- 接続文字列を再確認
- Neonのダッシュボードでデータベースの状態を確認
- 環境変数を再設定して再デプロイ

### 8.3 認証エラー

**症状**: 管理画面にログインできない

**確認事項**:
1. **NEXTAUTH_URLが正しいか**
   - 実際のドメインと一致しているか
2. **NEXTAUTH_SECRETとAUTH_SECRETが設定されているか**
   - 両方とも設定されているか
   - 値が一致しているか

**解決方法**:
- `NEXTAUTH_URL`を実際のドメインに更新
- シークレットキーを再生成して設定
- 再デプロイを実行

### 8.4 404エラー

**症状**: ページが見つからない

**確認事項**:
1. **ルーティングが正しく設定されているか**
   - Next.jsのApp Routerを使用しているか
2. **ビルドが正常に完了しているか**
   - ビルドログを確認

**解決方法**:
- `next.config.ts`の設定を確認
- 再デプロイを実行

### 8.5 パフォーマンスの問題

**症状**: サイトの読み込みが遅い

**確認事項**:
1. **Vercelの分析を確認**
   - 「Analytics」タブでパフォーマンスを確認
2. **画像の最適化**
   - Next.jsのImageコンポーネントを使用しているか

**解決方法**:
- 画像を最適化
- データベースクエリを最適化
- Vercelの有料プランにアップグレード（必要に応じて）

---

## 9. よくある質問（FAQ）

### Q: デプロイにどのくらい時間がかかりますか？

A: 初回デプロイは1-3分、その後のデプロイは30秒-2分程度です。

### Q: 環境変数を変更したら自動的に再デプロイされますか？

A: いいえ、環境変数を変更した後は手動で再デプロイが必要です。

### Q: プレビュー環境とは何ですか？

A: プルリクエストを作成すると、自動的にプレビュー環境が作成されます。本番環境に影響を与えずにテストできます。

### Q: 無料プランで使用できますか？

A: はい、Vercelの無料プランで十分に使用できます。ただし、使用量に制限があります。

### Q: データベースはどこにありますか？

A: Neonなどの外部データベースサービスを使用します。Vercelはデータベースをホスティングしません。

---

## 10. 参考リンク

- [Vercel公式ドキュメント](https://vercel.com/docs)
- [Next.js公式ドキュメント](https://nextjs.org/docs)
- [Neon公式ドキュメント](https://neon.tech/docs)
- [Prisma公式ドキュメント](https://www.prisma.io/docs)

---

## 11. 次のステップ

デプロイが完了したら：

1. **サンプルデータの削除**（本番環境では不要）
   ```bash
   npm run cleanup:all-sample-data
   ```

2. **実際の候補者データの登録**
   - 管理画面から候補者を追加

3. **施設データの取り込み**（必要に応じて）
   - `docs/FACILITY_DATA.md`を参照

4. **カスタムドメインの設定**（オプション）
   - 独自のドメインを使用する場合

5. **分析の設定**（オプション）
   - Umami Analyticsを設定

---

このガイドで問題が解決しない場合は、Vercelのサポートに問い合わせるか、GitHubのIssuesで質問してください。

