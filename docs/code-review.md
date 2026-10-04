# ソースコードレビュー結果

- 対象: `src/` 配下すべて、`vite.config.js`、`index.html`
- 対象コミット: ブランチ `claude/gracious-ritchie-dvoc08`（`884a33e` 時点）
- レビュー日: 2026-10-04
- 対応状況: 高・中の指摘 (#1〜#6) と #7 は修正済みです。`main` の `663cb59` の修正を TypeScript 版に取り込み、2 点を補強しました。詳しくは末尾の「対応状況」を見てください。

## 確認方法

- 全ファイルを読んでレビューしました。
- 「再現済み」の指摘は、`npm run build` → `vite preview` で起動したアプリに対して、Playwright (Chromium) で実際に操作して確認しています。Qiita API のレスポンスは遅延・エラーを含めてモックしました。
- 「コード読解」の指摘は、コードを読んだうえでの推論で、実機では再現させていません。

## サマリー

| # | 重要度 | 概要 | 根拠 | 対応 |
|---|---|---|---|---|
| 1 | 高 | タグを素早く切り替えると、別タグの記事が表示される (レスポンスの競合) | 再現済み | 修正済み |
| 2 | 高 | 通信エラー時に「Loading」のまま止まり、エラーも表示されない | 再現済み | 修正済み |
| 3 | 中 | 一度表示したエラーメッセージが、成功後も消えない | 再現済み | 修正済み |
| 4 | 中 | 初回表示とタグ切り替えで、同じ API を 2 回呼んでいる | 再現済み | 修正済み |
| 5 | 中 | 無限スクロールで、読み込み中にページが飛び、記事が欠落しうる | コード読解 | 修正済み |
| 6 | 中 | スクロール最下部の判定が厳密一致で、環境によって発火しない | コード読解 | 修正済み |
| 7 | 低 | タグ一覧の要素に `key` がなく、React の警告が出る | 再現済み (dev) | 修正済み |
| 8 | 低 | 使われていないコード (axios の import、関数、コンポーネント) | コード読解 | 一部対応 (axios の import と未使用関数を削除) |
| 9 | 低 | 固定フッターが最後の記事に重なる | コード読解 | 未対応 |
| 10 | 低 | アクセシビリティ (`alt="img"`) | コード読解 | 未対応 |
| 11 | 低 | PWA マニフェストのアイコンファイルが存在しない | 確認済み | 未対応 |
| 12 | 情報 | YouTube API キーがクライアントに埋め込まれる | コード読解 | — |

---

## 詳細

### 1. [高] タグを素早く切り替えると、別タグの記事が表示される

- 場所: `src/components/qiita/App.tsx:103-120` (`handleClick`)、`:116`
- 内容: 古いリクエストを取り消したり無視したりする仕組みがありません。前のタグのレスポンスが後から届くと、そのまま一覧に反映されます。
- 再現: Gemini のレスポンスを 1.5 秒遅らせ、Gemini → React の順にすぐクリックしました。見出しは「QiitaでReactタグありの記事を表示」なのに、一覧には Gemini の記事 (`T_Gemini`) だけが表示されました。
- 修正案: `useEffect` 内で `AbortController` を作り、クリーンアップで `abort()` します。または、リクエストごとの ID を持たせて古いレスポンスを捨てます。

### 2. [高] 通信エラー時に「Loading」のまま止まり、エラーも表示されない

- 場所: `src/components/qiita/App.tsx:108-119`
- 内容: `fetch(...).then(...)` に `.catch` がありません。次の場合に Promise が reject され、`setIsLoading(false)` もエラー表示も実行されません。
  - ネットワークエラーや CORS エラー
  - レスポンスが JSON でない (`res.json()` が失敗する)
- 再現: Qiita API への通信を失敗させたところ、画面は `Loading ....` のまま止まり、赤字のエラーは空でした。
- 修正案: `.catch(e => { setError(...); setIsLoading(false); })` を追加します。または `finally` で `setIsLoading(false)` を実行します。

### 3. [中] 一度表示したエラーメッセージが、成功後も消えない

- 場所: `src/components/qiita/App.tsx:110-118`
- 内容: `setError('')` をどこからも呼んでいないので、エラーが一度出ると表示されたままになります。
- 再現: 1 回目を 403 (`Rate limit exceeded`) にし、その後 React ボタンで取得に成功させました。記事は表示されましたが、赤字の `Rate limit exceeded` が残りました。
- 修正案: リクエスト開始時か成功時に `setError('')` を呼びます。

### 4. [中] 初回表示とタグ切り替えで、同じ API を 2 回呼んでいる

- 場所: `src/components/qiita/App.tsx:75-86`
- 内容: `[page]` と `[tag]` の 2 つの `useEffect` がどちらも `handleClick()` を呼んでいます。そのため次の場合に同じ URL へ 2 回リクエストします。
  - マウント時 (両方の effect が実行される)
  - `page !== 1` の状態でタグを切り替えたとき (page と tag が同時に変わる)
- 開発時はさらに StrictMode によって effect が二重に実行されます。
- 再現: 本番ビルドで初回表示したところ、`ClaudeCode` へのリクエストが 2 回飛びました。
- 影響: Qiita API v2 は未認証だと **1 時間あたり 60 リクエスト** までなので、制限に早く達します。
- 修正案: 1 つの `useEffect(..., [tag, page, perPage])` にまとめます。

### 5. [中] 無限スクロールで、読み込み中にページが飛び、記事が欠落しうる

- 場所: `src/components/qiita/App.tsx:51-64`、`:116`
- 内容: 読み込み中かどうかを確認せずに `setPage(prev => prev + 1)` を実行しています (`//if(message !== "loading...")` がコメントアウトされている)。このため、読み込み中に最下部で再度スクロールすると、page が 2 → 3 と連続して進みます。
  - さらに `setPostsList(postsList.concat(res.data))` は、リクエストを出した時点の `postsList` を使います。そのため、page 2 と page 3 の結果のうち片方が失われます。
- 修正案:
  - `isLoading` 中は page を進めないようにします。
  - `setPostsList(prev => prev.concat(res.data))` のように関数型で更新します。

### 6. [中] スクロール最下部の判定が厳密一致で、環境によって発火しない

- 場所: `src/components/qiita/App.tsx:52-55`
- 内容: `innerHeight + scrollTop !== offsetHeight` で判定しています。ブラウザのズームや高 DPI の環境では `scrollTop` が小数になり、等しくならないことがあります。その場合、次のページが読み込まれません。
- 修正案: `>= offsetHeight - 1` のように許容幅を持たせます。または `IntersectionObserver` で番兵要素を監視します。
- 補足:
  - `lodash.throttle` のインスタンスはレンダーごとに作られますが、登録されるのは初回のものだけです。現状は関数型更新を使っているので実害はありません。
  - アンマウント時に `handleScroll.cancel()` を呼んでいません。

### 7. [低] タグ一覧の要素に `key` がなく、React の警告が出る

- 場所: `src/components/qiita/App.tsx:133-140` (`renderTag`)
- 内容: `<>{item.name}, </>` の配列に `key` がありません。
- 再現: 開発サーバーで `Each child in a list should have a unique "key" prop.` が出ることを確認しました。
- 修正案: `<React.Fragment key={item.name}>` を使います。また、記事一覧 (`:145`) の `key={index}` は、記事 ID (`item.id`) を使うほうが望ましいです。

### 8. [低] 使われていないコード

- `src/components/qiita/App.tsx:3`: `import axios` は未使用です。ビルドでは tree-shaking で除かれており (バンドル内に axios のコードがないことを確認済み)、サイズへの影響はありません。依存関係からは削除できます。
- `src/components/qiita/App.tsx:123-131`: `getNextQiitaPosts` と `getBeforeQiitaPosts` は未使用です。
- `src/components/qiita/App.tsx:107`: `const headers = {}` は意味がありません。
- `src/components/qiita/App.tsx:194`: `{isLoading}` は boolean なので何も表示されません。
- `src/App.tsx` (Vite のテンプレート) と `src/components/youtube/*` は、`src/main.tsx` から読み込まれていません (コメントアウト)。
- `package.json` の `styled` と `styled-components` は未使用です。

### 9. [低] 固定フッターが最後の記事に重なる

- 場所: `src/components/qiita/QiitaApp.css` (`.QiitaApp-footer`)、`src/components/qiita/App.tsx:202`
- 内容: 高さ 60px の `position: fixed` フッターがありますが、本文側に下余白がありません。そのため最下部の内容がフッターの下に隠れます。
- 修正案: `.QiitaApp-header` に `padding-bottom: 60px` を追加します。

### 10. [低] アクセシビリティ

- 場所: `src/components/qiita/App.tsx:147`
- 内容: アバター画像の `alt="img"` は情報になっていません。
- 修正案: 装飾目的なら `alt=""`、そうでなければ `alt={item.user.id}` などにします。

### 11. [低] PWA マニフェストのアイコンファイルが存在しない

- 場所: `vite.config.js` の `manifest.icons`
- 内容: `/icon-256x256.png` を参照していますが、`public/` にありません。また `includeAssets` に `favicon.svg`、`favicon.ico`、`robots.txt`、`apple-touch-icon.png`、`offline.html` がありますが、いずれも `public/` に存在しません。

### 12. [情報] YouTube API キーがクライアントに埋め込まれる

- 場所: `src/components/youtube/Api.tsx:4`
- 内容: `VITE_` で始まる環境変数はビルド時にバンドルへ埋め込まれ、誰でも読めます。現在このコンポーネントは画面に出ていませんが、有効にする場合は Google Cloud 側で HTTP リファラ制限と API 制限をかけてください。
- 補足: `videoId` が空の初期状態でも `https://www.youtube.com/embed/` を iframe に読み込みます。

---

## 良い点

- TypeScript の strict モードで型エラーは 0 件です。API レスポンスに型が付いていて、`any` もありません。
- `npm run build` に型チェックが組み込まれているため、型エラーがあるとデプロイ前に検出できます。
- エラーメッセージは React の通常のテキスト出力で表示しているため、XSS の心配はありません。

## 推奨する対応順

1. #2 と #3 (エラー処理): 小さな修正で、体験が大きく改善します。
2. #1・#4・#5 (データ取得まわり): 取得処理を 1 つの `useEffect` にまとめ、`AbortController` と関数型更新を入れれば、まとめて解消できます。
3. #6〜#11: 余裕があれば対応します。

---

## 対応状況 (2026-10-04 更新)

`main` の `663cb59` (fix(qiita): 二重取得・古い結果の混入・無限スクロール・エラー処理を修正し、React警告を解消) の修正を、このブランチの TypeScript 版 `src/components/qiita/App.tsx` に取り込みました。

| # | 対応内容 |
|---|---|
| 1 | 取得処理を 1 つの `useEffect` にまとめ、`AbortController` で古いリクエストを中断するようにしました。さらに、中断後に解決した結果を反映しないチェックを追加しました (このブランチでの補強) |
| 2 | `.catch` でエラーを表示し、`.finally` で `isLoading` を戻すようにしました |
| 3 | 取得開始時に `setError('')` でエラー表示を消すようにしました |
| 4 | `tag`・`page`・`perPage`・`reloadKey` を依存にした 1 つの `useEffect` にまとめました。同じタグを再クリックしたときは `reloadKey` で再取得します |
| 5 | 読み込み中は `isLoadingRef` を見て `page` を増やさないようにしました。また、記事の追加を関数型更新 (`prev => prev.concat(...)`) にしました |
| 6 | 最下部の判定を「下端から 100px 以内」にしました。また、アンマウント時に throttle をキャンセルするようにしました |
| 7 | タグには `React.Fragment key={item.name}`、記事には `key={item.id}` を付けました |

### このブランチでの補強
- **HTTP 2xx でも本文が配列でない場合:** `main` の版では `null` が一覧に追加され、描画時に例外になります。このブランチでは `parseQiitaResponse` でエラーにして、`Unexpected response from Qiita API` と表示します。
- **中断後に解決した結果:** `main` の版でも、中断の直前に `res.json()` が終わっていると、古い結果が反映される余地があります。このブランチでは `controller.signal.aborted` を確認して捨てています。

### 修正後の確認 (本番ビルド + Playwright、Qiita API はモック)
| # | 確認内容 | 結果 |
|---|---|---|
| 4 | 初回表示のリクエスト | `ClaudeCode` へ 1 回のみ |
| 4 | 表示中と同じタグを再クリック | 1 回だけ再取得し、記事が表示される |
| 1 | Gemini を遅延させて Gemini → React と押す | React の記事だけが表示される |
| 2 | 通信エラー | `Not Loading` に戻り、`Failed to fetch` を赤字で表示 |
| 2 | 2xx だが JSON でない | `Not Loading` に戻り、`Unexpected response from Qiita API` を表示 |
| 3 | 403 の後に成功 | エラー表示が消え、記事が表示される |
| 5 | 読み込み中に最下部へ 6 回スクロール | ページ 2 → 3 の順に 1 回ずつ取得。60 件すべてが重複・欠落なく表示される |
| 7 | 開発サーバーでの key 警告 | 出ない |

