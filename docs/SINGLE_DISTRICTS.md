# 小選挙区データの管理

## 概要

小選挙区のデータはCSVファイルで管理します。`public/data/single_districts.csv`ファイルを編集することで、小選挙区のデータを更新できます。

## CSVファイルの形式

CSVファイルは以下の形式である必要があります：

```csv
prefecture,district_number,district_name
北海道,1,北海道第1区
北海道,2,北海道第2区
青森県,1,青森県第1区
青森県,2,青森県第2区
```

- `prefecture`: 都道府県名（必須）
- `district_number`: 小選挙区番号（必須、数値）
- `district_name`: 小選挙区名（必須）

## テンプレートファイル

`data/single_districts_template.csv`に、すべての都道府県の小選挙区のテンプレートが含まれています。

このファイルをコピーして`public/data/single_districts.csv`として使用してください。

## データの更新方法

1. `data/single_districts_template.csv`を開く
2. 必要に応じてデータを編集（追加・修正・削除）
3. `public/data/single_districts.csv`にコピー
4. アプリケーションを再起動（開発サーバーの場合は自動リロード）

## データソース

小選挙区のデータは、総務省の選挙区情報や各都道府県の選挙管理委員会の情報から取得できます。

### 参考URL

- 総務省：https://www.soumu.go.jp/senkyo/senkyo_s/data/index.html
- 衆議院選挙区：https://www.soumu.go.jp/senkyo/senkyo_s/data/senkyo/syugiin_senkyoku/

## 注意事項

- CSVファイルはUTF-8エンコーディングで保存してください
- 都道府県名は`lib/constants.ts`の`PREFECTURES`に定義されているものと一致させる必要があります
- 小選挙区番号は都道府県ごとに1から始まる連番である必要があります
- CSVファイルが見つからない場合や、都道府県のデータが存在しない場合、警告メッセージが表示されます

