# データベースセットアップガイド

PostgreSQLの知識がなくても、無料のクラウドサービスを使えば簡単にセットアップできます。

## 方法1: Neon（推奨・最も簡単）

Neonは無料のPostgreSQLサービスで、セットアップが簡単です。

### 手順

1. **Neonにアカウント作成**
   - https://neon.tech にアクセス
   - GitHubアカウントでサインアップ（無料）

2. **プロジェクト作成**
   - ダッシュボードで「New Project」をクリック
   - プロジェクト名を入力（例: `street-speech-map`）
   - リージョンを選択（`Tokyo` を推奨）
   - 「Create Project」をクリック

3. **接続文字列を取得**
   - プロジェクト作成後、接続文字列が表示されます
   - 例: `postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require`
   - この文字列をコピー

4. **.envファイルを更新**
   - プロジェクトの`.env`ファイルを開く
   - `DATABASE_URL`の値を、コピーした接続文字列に置き換える
   ```
   DATABASE_URL="postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require"
   ```

5. **データベースをセットアップ**
   ```bash
   npm run db:push
   ```

6. **シードデータを投入（オプション）**
   ```bash
   npm run seed
   ```

これで完了です！

## 方法2: Supabase

1. https://supabase.com にアクセス
2. アカウント作成（無料）
3. 新しいプロジェクトを作成
4. プロジェクト設定 > Database > Connection string から接続文字列を取得
5. `.env`ファイルの`DATABASE_URL`を更新
6. `npm run db:push`を実行

## 方法3: Railway

1. https://railway.app にアクセス
2. GitHubアカウントでサインアップ
3. 「New Project」→「Add PostgreSQL」
4. PostgreSQLサービスの「Variables」タブから`DATABASE_URL`をコピー
5. `.env`ファイルに設定
6. `npm run db:push`を実行

## トラブルシューティング

### 接続エラーが出る場合

- 接続文字列に`?sslmode=require`が含まれているか確認
- ファイアウォール設定を確認（クラウドサービスは通常問題なし）

### マイグレーションエラーが出る場合

- Prismaクライアントを再生成: `npm run db:generate`
- データベースをリセット（Neonのダッシュボードから可能）

## 本番環境

本番環境でも同じクラウドサービスを使用できます。Neon、Supabase、Railwayはいずれも本番環境に対応しています。
