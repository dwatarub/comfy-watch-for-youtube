# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

ComfyWatch for YouTube は、YouTube視聴時の「かゆいところに手が届く」機能を提供する **Manifest V3 の Chrome拡張機能** です。ビルドツール・パッケージマネージャ・テストフレームワークは使用せず、`src/` 配下の素のJavaScript / HTML / CSS がそのまま拡張機能として動作します。

主な機能は2つ：
1. **明るさ調節スライダー** — 動画プレイヤーのコントロールバーに明るさ調整UIを追加する
2. **酔い防止センタードット** — プレイヤー中央に固定点を表示する

## 開発・動作確認

ビルド不要。`src/` を編集したら拡張機能をリロードして確認する。

- **ローカル読み込み**: `chrome://extensions/` →「デベロッパーモード」ON →「パッケージ化されていない拡張機能を読み込む」で `src/` フォルダを選択
- **ストア申請用ZIP作成**:
  ```bash
  cd src
  zip -r ../ComfyWatch-for-YouTube.zip . --exclude "*.DS_Store"
  ```

テスト・lint・ビルドのコマンドは存在しない。

## リリースフロー

`.github/workflows/release.yml` が main へのプッシュ（PRマージ含む）で自動実行される。

- **バージョンの単一情報源は `src/manifest.json` の `version`**。リリースするにはこの値をインクリメントしてmainにマージする。
- ワークフローは `v<version>` タグの存在を確認し、未作成ならタグとGitHub Releaseを作成、`src/` をZIP化してアセット添付する。タグが既存ならスキップする（＝manifestのバージョンを上げ忘れるとリリースされない）。

## アーキテクチャ

拡張機能の3つの実行コンテキストで構成される：

- **`src/content.js`** — YouTubeページ（`https://www.youtube.com/*`）に注入される本体。ほぼ全ロジックがここにある。`document_idle` で実行。
- **`src/options.js` + `options.html`** — オプションページ。センタードットのサイズ・色・ライト/ダークテーマを設定する。
- **`src/popup.js` + `popup.html`** — ツールバーアイコンのポップアップ。オプションページを開くボタンのみ（ドットのON/OFFはプレイヤー上のトグルに移管済み）。

### content.js の重要な構造

- **SPA対応**: YouTubeはページ遷移してもリロードされないため、`MutationObserver`（`pageObserver`）で `document.body` を監視し、プレイヤー出現のたびにUIを再挿入する。`insertBrightnessSlider()` は冒頭で `#yt-brightness-control` の存在チェックを行い二重挿入を防ぐ。
- **UI挿入位置**: `.ytp-volume-area`（音量エリア）の直後に、明るさコントロールとドットトグルを `insertAdjacentElement('afterend', ...)` で挿入する。YouTube側のDOMクラス名（`.ytp-volume-area`, `video.html5-main-video`, `.html5-video-player`）に依存しているため、YouTube側の変更で壊れうる。
- **明るさの実装**: `video.style.filter = 'brightness(N%)'` を直接当てる。範囲10〜200%、ステップ5。
- **キーボード干渉防止**: 挿入UI上の `keydown` を `stopPropagation()` し、YouTubeのショートカット発火を防ぐ。

### ストレージの使い分け（重要）

2種類のChromeストレージを **意図的に使い分けている**ので、設定項目を追加する際は対応に注意する：

- **`chrome.storage.local`** — 明るさ（`youtubeBrightness`）。端末ローカルに保持。
- **`chrome.storage.sync`** — ドット設定（`dotSize`, `dotColor`, `isDotVisible`）とテーマ（`theme`）。アカウント間で同期。

`content.js` は `chrome.storage.onChanged` を購読しており、オプションページからのドット設定変更がプレイヤーへリアルタイム反映される（トグルアイコンの表示も同期する）。

### 国際化（i18n）

- `manifest.json` の `name` / `description` は `__MSG_xxx__` プレースホルダで、`src/_locales/{ja,en}/messages.json` から解決される。`default_locale` は `ja`。
- オプションページのHTMLは `data-i18n` 属性を付け、`options.js` の `localizeHtmlPage()` が `chrome.i18n.getMessage()` で置換する。
- **文言を追加・変更する際は `ja` と `en` 両方の `messages.json` を更新すること。**

## コーディング規約

- コメント・docstringはすべて**日本語**で記述する（既存コードに準拠）。
- 拡張機能IDセレクタは明るさ系が `yt-` プレフィックス、ドット系が `cw-` プレフィックスで使い分けられている。
