# Energy News Daily

日本時間ベースで、国際・日本のエネルギー関連ニュースを Gemini が調査・要約し、同じ内容から **難易度別（初心者 / 中級 / 上級）の4択テスト** を自動生成する Web アプリです。フロントは React、API と静的配信は Express が担います。

## 機能概要

- **本日モード**: トップの URL（`/`）をブックマークしておけば、開くたびに **日本時間の「その日」** のデータを表示。日付が変わると表示日も追従します（ポーリング・タブ復帰時の再取得あり）。
- **ニュース調査**: 指定日の国際・日本それぞれ最大10件程度を Gemini（Google 検索ツール付き）で収集し、`news.json` に保存。
- **理解度チェック**: 調査内容のみに基づき、各難易度 **10問**（合計30問）の4択問題を生成。
- **過去の閲覧**: `過去の記録を選ぶ` または `?date=YYYY-MM-DD` でアーカイブ表示。

## 必要環境

- Node.js **20 以上**
- [Google AI Studio](https://aistudio.google.com/apikey) 等で発行した **Gemini API キー**

## セットアップ

```bash
cd global-energy-news-daily
npm install
cp .env.example .env
# .env 内の GEMINI_API_KEY を編集
```

## 開発サーバー

```bash
npm run dev
```

ブラウザで **http://localhost:3000/** を開きます（`file://` で `index.html` を直接開かないでください）。

`server.ts` を保存すると **tsx watch** によりサーバーが再起動し、API の変更も反映されます。

## スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発（Express + Vite HMR、`tsx watch`） |
| `npm run build` | フロントを `dist/` にビルド |
| `npm run start` | 本番モードで `tsx server.ts`（事前に `build` が必要） |
| `npm run lint` | TypeScript チェック（`tsc --noEmit`） |
| `npm run clean` | `dist/` を削除 |

## 環境変数

| 変数 | 必須 | 説明 |
|------|------|------|
| `GEMINI_API_KEY` | はい | Gemini API キー（サーバー側のみで使用） |
| `PORT` | いいえ | 待受ポート。未設定時は `3000`（Dockerfile では `8080`） |
| `NEWS_DATA_DIR` | いいえ | `news.json` を置くディレクトリ。未設定時はサーバー実行ディレクトリ直下 |
| `NODE_ENV` | いいえ | `production` のとき `dist/` を静的配信 |

`.env.example` の `APP_URL` は現状アプリコードでは未使用です。

## 本番ビルドと起動

```bash
npm run build
npm run start
```

## Docker

```bash
docker build -t energy-news-daily .
docker run -p 8080:8080 -e GEMINI_API_KEY=your-key energy-news-daily
```

## Render へのデプロイ

リポジトリルートの **`render.yaml`**（Blueprint）と **`Dockerfile`** を利用できます。

1. GitHub 等にプッシュする  
2. [Render](https://dashboard.render.com) → **New** → **Blueprint** でリポジトリを接続  
3. 環境変数 **`GEMINI_API_KEY`** を設定（Blueprint では初回に入力を促す設定）  
4. 発行された `https://xxxx.onrender.com/` などが本番 URL  

無料枠ではファイルシステムが揮発しやすいため、**`news.json` は再デプロイで消える**ことがあります。永続化する場合は Render の Persistent Disk 等を検討し、マウント先に合わせて **`NEWS_DATA_DIR`** を設定してください。

## データ保存

調査結果とクイズは **`news.json`**（JSON）に日付キーで保存されます。バックアップやバージョン管理に含める場合は取り扱いに注意してください。

## API（概要）

| メソッド | パス | 説明 |
|----------|------|------|
| `GET` | `/api/news?date=YYYY-MM-DD` | 該当日の保存データ |
| `POST` | `/api/news` | 該当日のデータを保存 |
| `POST` | `/api/generate-news` | ニュース生成（サーバーが Gemini を呼び出し） |
| `POST` | `/api/generate-quiz` | クイズ生成 |

## ライセンス

Private プロジェクトの場合はリポジトリの方針に従ってください。
