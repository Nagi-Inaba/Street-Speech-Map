# 施設データ取り込みガイド

## 概要

施設データ取り込みスクリプトを使用して、学校や医療機関などの施設データをデータベースに取り込むことができます。

## データ形式

### CSV形式

CSVファイルは以下の形式である必要があります：

```csv
name,lat,lng
学校名1,35.6812,139.7671
学校名2,35.6586,139.7454
```

- 1行目: ヘッダー（`name,lat,lng`）
- 2行目以降: データ行
- `name`: 施設名（オプション）
- `lat`: 緯度（必須）
- `lng`: 経度（必須）

### GeoJSON形式

GeoJSONファイルは標準のGeoJSON形式である必要があります：

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [139.7671, 35.6812]
      },
      "properties": {
        "name": "学校名"
      }
    }
  ]
}
```

- `coordinates`: `[経度, 緯度]`の順序（注意: GeoJSONは経度が先）
- `properties.name`: 施設名（オプション）

## データソース

### 国土数値情報ダウンロードサービス

1. https://nlftp.mlit.go.jp/ksj/ にアクセス
2. データセットを選択（例: 学校、医療機関）
3. 都道府県を選択してダウンロード
4. GML形式をGeoJSONに変換（必要に応じて）

### その他のデータソース

- 各都道府県のオープンデータ
- 総務省の統計データ
- その他の公的データ

## 使用方法

### CSVファイルから読み込む

```bash
npm run ingest:facilities -- --file data/schools.csv --category school --source "国土数値情報2024"
```

### GeoJSONファイルから読み込む

```bash
npm run ingest:facilities -- --geojson data/hospitals.geojson --category hospital --source "国土数値情報2024"
```

### パラメータ

- `--file <path>`: CSVファイルのパス
- `--geojson <path>`: GeoJSONファイルのパス
- `--category <category>`: カテゴリ（例: `school`, `hospital`）
- `--source <source>`: データソース名（オプション、デフォルト: `manual`）

### カテゴリ

使用可能なカテゴリ：
- `school`: 学校
- `hospital`: 医療機関
- `library`: 図書館
- `park`: 公園
- その他、任意の文字列

## 注意事項

1. **重複チェック**: 同じ位置・同じカテゴリの施設は自動的にスキップされます
2. **座標の順序**: GeoJSONは `[経度, 緯度]` の順序です（CSVは `緯度, 経度`）
3. **大量データ**: 大量のデータを取り込む場合は、時間がかかる可能性があります
4. **データの正確性**: データソースの正確性を確認してください

## トラブルシューティング

### エラー: "Invalid CSV line"

CSVファイルの形式を確認してください。各行は `name,lat,lng` の形式である必要があります。

### エラー: "Invalid GeoJSON"

GeoJSONファイルが標準形式であることを確認してください。`type: "FeatureCollection"` が必要です。

### データが保存されない

- データベース接続を確認してください
- ファイルパスが正しいか確認してください
- カテゴリが指定されているか確認してください

