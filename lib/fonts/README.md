# OGP地図用フォント

OGP画像の地図吹き出しで日本語を表示するために、ここに **Noto Sans JP** のフォントファイルを配置します。

## 自動ダウンロード（推奨）

```bash
npx tsx scripts/download-og-font.ts
```

`NotoSansJP-Regular.otf` がこのディレクトリにダウンロードされます。

## 手動での配置

[Google Fonts - Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP) からダウンロードし、次のいずれかのファイル名で保存してください。

- `NotoSansJP-Regular.otf`
- `NotoSansJP-Regular.ttf`

フォントがない場合は吹き出しの日本語が文字化けすることがあります。
