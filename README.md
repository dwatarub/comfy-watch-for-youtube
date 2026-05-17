# ComfyWatch for YouTube

YouTubeの動画再生中に明るさをスライダーで調節できるChrome拡張機能。

## 機能

- 動画プレイヤーのコントロールバー（音量の右隣）に明るさ調節スライダーを追加
- 明るさの調整範囲：10%〜200%
- 太陽アイコンをクリックすると明るさを100%にリセット
- マウスホイールでの操作に対応
- 設定値はブラウザに保存され、次回以降も維持される
- YouTubeのページ遷移（SPA）に対応

## ディレクトリ構成

```tree
.
├── .gitignore
├── README.md
├── docs/
│   └── screenshots/        # ストア掲載用スクリーンショット
└── src/                    # 拡張機能本体
    ├── manifest.json
    ├── content.js
    ├── content.css
    └── icons/
        ├── icon16.png
        ├── icon48.png
        └── icon128.png
```

## ローカルでの動作確認

1. `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `src/` フォルダを選択する

## ストア申請用ZIPの作成

```bash
cd src
zip -r ../ComfyWatch-for-YouTube.zip . --exclude "*.DS_Store"
```

## 動作環境

- Google Chrome（Manifest V3対応）
- 対象ページ：`https://www.youtube.com/*`
