# vite-react-pages 仕様書

- 対象バージョン: ブランチ `claude/gracious-ritchie-dvoc08` (`884a33e` 時点)
- 作成日: 2026-10-04
- 関連資料: [ソースコードレビュー結果](./code-review.md)

この仕様書は、現在の実装の振る舞いをまとめたものです。既知の不具合は「9. 既知の制限・不具合」とレビュー結果に記載しています。

---

## 1. 概要

Qiita API v2 から、指定したタグが付いた記事を取得して一覧表示する Web アプリです。PWA に対応しています。

- 本番の画面: Qiita 記事ビューア (`src/components/qiita/App.tsx`)
- 公開先: Vercel / Netlify (PR ごとにプレビューがデプロイされる)

## 2. 技術スタック

| 分類 | 使用技術 |
|---|---|
| 言語 | TypeScript 7 (strict モード) |
| UI | React 19 |
| ビルド | Vite 8、@vitejs/plugin-react |
| PWA | vite-plugin-pwa 2 (Workbox、generateSW モード) |
| ライブラリ | dayjs (相対時間の表示)、lodash (`throttle`) |
| 実行環境 | Node.js `^20.19.0 \|\| >=22.12.0` (Vite 8 の要件) |

## 3. ディレクトリ構成

```
index.html                  エントリ HTML (/src/main.tsx を読み込む)
vite.config.js              Vite と PWA (マニフェスト) の設定
tsconfig.json               TypeScript の設定 (strict)
public/                     静的ファイル (PWA アイコンなど)
src/
  main.tsx                  起動処理。Qiita アプリをマウントし、Service Worker を登録
  vite-env.d.ts             環境変数と仮想モジュールの型定義
  index.css                 全体のスタイル
  components/qiita/
    App.tsx                 Qiita 記事ビューア (本番の画面)
    QiitaApp.css            ビューアのスタイル
  components/youtube/       YouTube 検索・再生のサンプル (現在は未使用)
  App.tsx, App.css          Vite のテンプレート (現在は未使用)
docs/                       仕様書とレビュー結果
```

## 4. 画面仕様 (Qiita 記事ビューア)

### 4.1 画面構成 (上から順に)

1. **エラーメッセージ**: API エラーの内容を赤字の太字で表示します。エラーがなければ空です。
2. **リンク (2 件)**: 関連ブログ記事へのリンクです (新しいタブで開く)。
3. **見出し**: `Qiita で{表示中のタグ}タグありの記事を表示`
   - 例: 初期表示では「QiitaでClaudeCodeタグありの記事を表示」
4. **タグボタン**: 下表の順に並びます。
5. **表示中のタグ名**
6. **ページボタン**: `__1__` / `__20__` / `__50__` / `__90`、続けて `{page}/{perPage}posts`
7. **記事一覧** (4.3 参照)
8. **状態表示**: 例 `Page 1, tag ClaudeCode,` と、`Loading .... page: …` または `Not Loading. page: …`
9. **固定フッター** (画面下端に固定、高さ 60px): `{tag} Page {page}/{perPage}posts/{開始番号}-`

### 4.2 タグボタン

左から順に次のとおりです。

| 順 | ラベル | 取得に使うタグ |
|---|---|---|
| 1 | ClaudeCode | `ClaudeCode` |
| 2 | Codex | `Codex` |
| 3 | Gemini | `Gemini` |
| 4 | Antigravity | `Antigravity` |
| 5 | React | `React` |
| 6 | Next.js | `Next.js` |
| 7 | JavaScript | `JavaScript` |
| 8 | Swift | `Swift` |
| 9 | Vim | `Vim` |
| 10 | .NET | `.NET` |
| 11 | Cloudflare | `Cloudflare` |

Vue.js / Nuxt.js / Azure / AWS / Flutter のボタンは非表示です (コード上はコメントアウトで残してあります)。

### 4.3 記事カード

1 記事ごとに次の内容を表示します。

- 投稿者のアバター画像 (54×54px、遅延読み込み)
- 記事タイトル: Qiita の記事へのリンクで、新しいタブで開きます。2 行を超える部分は省略します。
- 補足行 (1 行で、はみ出す部分は省略): `{投稿からの経過時間} / {タグ1}, {タグ2}, … / {いいね数}likes / {投稿者の記事数}posts`
  - 経過時間は dayjs の `fromNow(true)` を使い、「3 years」のように接尾辞なしで表示します。

## 5. 振る舞い

### 5.1 状態

| 状態 | 初期値 | 説明 |
|---|---|---|
| `tag` | `'ClaudeCode'` | 表示中のタグ |
| `page` | `1` | 取得するページ番号 |
| `perPage` | `20` | 1 ページあたりの件数 |
| `postsList` | `[]` | 表示中の記事 |
| `isLoading` | `false` | 取得中かどうか |
| `error` | `''` | 取得エラーのメッセージ |
| `reloadKey` | `0` | ボタンを押すたびに 1 増やし、同じ条件でも再取得させるためのキー |

### 5.2 初期表示

`ClaudeCode` タグの 1 ページ目を 20 件取得して表示します。

### 5.3 タグボタンを押したとき

1. `perPage` を 20、`postsList` を空、`page` を 1、`tag` を押したボタンのタグに設定します。
2. 見出し・タグ名表示・フッターが新しいタグに切り替わります。
3. 新しいタグの 1 ページ目を取得して表示します。表示中と同じタグのボタンを押した場合も、取得し直します。

### 5.4 ページボタンを押したとき

1. `perPage` を 100、`postsList` を空、`page` をボタンの数値 (1 / 20 / 50 / 90) に設定します。
2. そのページを 100 件単位で取得して表示します。タグは変わりません。表示中と同じページのボタンを押した場合も、取得し直します。

### 5.5 無限スクロール

- `scroll` イベント (500ms の throttle) で、`innerHeight + scrollTop >= offsetHeight - 100` (最下部から 100px 以内) になったら `page` を 1 増やします。
- **読み込み中は `page` を増やしません。** これにより、ページが飛んだり記事が欠落したりしません。
- `page` が変わると次のページを取得し、既存の一覧の末尾に追加します。

### 5.6 データ取得

- 実行のきっかけ: `tag`・`page`・`perPage`・`reloadKey` のいずれかが変わったとき (初回マウントを含む)。1 つの `useEffect` で取得するので、条件が同時に変わっても API は 1 回だけ呼ばれます。
- 開始時に `isLoading = true` にし、前回のエラー表示を消します (`error = ''`)。
- 成功 (HTTP 2xx で、本文が配列): 取得した記事を `postsList` の末尾に追加し、`isLoading = false` にします。
- 失敗: `error` にメッセージを設定して赤字で表示し、`isLoading = false` にします。

| 失敗の種類 | 表示するメッセージ |
|---|---|
| HTTP 2xx 以外 (本文に `message` あり) | API の `message` (例: `Rate limit exceeded`) |
| HTTP 2xx 以外 (本文が JSON でない) | `HTTP {ステータスコード}` |
| 通信エラー・CORS エラー | ブラウザのエラーメッセージ (例: `Failed to fetch`) |
| HTTP 2xx だが本文が配列でない | `Unexpected response from Qiita API` |

- 条件が変わったり画面を離れたりしたときは、実行中のリクエストを `AbortController` で中断します。中断したリクエストの結果やエラーは画面に反映しません。そのため、タグを素早く切り替えても、前のタグの記事が混ざりません。
- タグ名は `encodeURIComponent` でエンコードして URL に埋め込みます。

## 6. 外部 API 仕様

### 6.1 Qiita API v2 (タグ付き記事の一覧)

- リクエスト: `GET https://qiita.com/api/v2/tags/{tag}/items?page={page}&per_page={perPage}`
- 認証: なし (未認証のため、Qiita の制限で **IP あたり 1 時間 60 リクエスト** まで)
- 利用するレスポンス項目 (型: `QiitaItem`):

| 項目 | 型 | 用途 |
|---|---|---|
| `id` | string | 一覧の `key` |
| `title` | string | タイトル |
| `url` | string | 記事へのリンク |
| `created_at` | string (ISO 8601) | 経過時間の表示 |
| `likes_count` | number | いいね数 |
| `tags[].name` | string | タグ一覧 |
| `user.profile_image_url` | string | アバター画像 |
| `user.items_count` | number | 投稿者の記事数 |

- エラーレスポンス (型: `QiitaErrorResponse`): `{ "message"?: string }`
- レスポンスの解釈: `parseQiitaResponse` が、成功時は記事の配列 (`QiitaItem[]`) を返し、失敗時は `Error` を投げます (5.6 の表を参照)。

### 6.2 YouTube Data API v3 (未使用のサンプル)

- リクエスト: `GET https://www.googleapis.com/youtube/v3/search?key=…&q=ヒカキン&type=video&maxResults=1&order=viewCount`
- 最初の結果の `id.videoId` を `https://www.youtube.com/embed/{videoId}` の iframe で再生します。

## 7. PWA

- `src/main.tsx` で `registerSW()` を呼び、Service Worker を登録します。
- Workbox の generateSW モードで、ビルド成果物 (HTML、JS、CSS、アイコン、マニフェスト) をプリキャッシュします。
- マニフェストの主な設定:
  - `name` / `short_name`: `Vite React App`
  - `display`: `standalone`
  - `theme_color` / `background_color`: `#000`
  - `start_url` / `scope`: `/`
  - アイコン: 192 / 256 / 384 / 512px と、maskable の 512px

## 8. 開発・ビルド

### 8.1 npm スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバーを起動 (ブラウザを自動で開く) |
| `npm run typecheck` | 型チェックだけ実行 (`tsc -p tsconfig.json`) |
| `npm run build` | 型チェックの後に本番ビルド (`dist/` に出力) |
| `npm run preview` | ビルド成果物をローカルで配信 |

- 型エラーがあると `npm run build` が失敗します。そのため、Vercel / Netlify のデプロイも失敗します。
- テスト (`npm test`) はまだありません。

### 8.2 環境変数

| 変数 | 必須 | 用途 |
|---|---|---|
| `VITE_YOUTUBE_API_KEY` | いいえ (YouTube サンプルを使う場合のみ必要) | YouTube Data API のキー。ビルド時にバンドルへ埋め込まれ、公開されます |

## 9. 既知の制限・不具合

詳細と修正案は [code-review.md](./code-review.md) にあります。

- レビューの高・中の指摘 (#1〜#6) は対応済みです。
- 開発サーバー (`npm run dev`) では、React の StrictMode によって初回のリクエストが 2 回発生します。ただし 1 回目はすぐに中断されるので、表示には影響しません。本番ビルドでは 1 回です。
- マニフェストが参照している `/icon-256x256.png` が `public/` にありません。
- `Antigravity` と `Cloudflare` のタグが Qiita に存在するかは未確認です。存在しない場合、API はエラー (404) を返し、そのメッセージが赤字で表示される想定です。
