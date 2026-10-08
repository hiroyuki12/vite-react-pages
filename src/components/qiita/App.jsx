import React, { useState, useEffect, useRef, memo } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import './QiitaApp.css';

// 一番下とみなす余裕(px)。番兵要素がこの距離まで近づいたら次ページを取得する
const SCROLL_THRESHOLD = 100;

// タグ一覧の定義（非表示対象はコメントアウトで保持）
const TAG_LIST = [
  { id: 'ClaudeCode', label: 'ClaudeCode' },
  { id: 'Codex', label: 'Codex' },
  { id: 'Gemini', label: 'Gemini' },
  { id: 'Antigravity', label: 'Antigravity' },
  { id: 'GitHubCopilot', label: 'GitHubCopilot' },
  { id: 'React', label: 'React' },
  { id: 'Next.js', label: 'Next.js' },
  // { id: 'Vue.js', label: 'Vue.js' },
  // { id: 'Nuxt.js', label: 'Nuxt.js' },
  { id: 'Swift', label: 'Swift' },
  { id: 'Vim', label: 'Vim' },
  // { id: 'Azure', label: 'Azure' },
  // { id: 'Aws', label: 'AWS' },
  { id: '.NET', label: '.NET' },
  // { id: 'Flutter', label: 'Flutter' },
  { id: 'Cloudflare', label: 'Cloudflare' },
];

// 記事1件分。追加読み込み時に既存の記事を再描画しないよう memo 化
const PostItem = memo(function PostItem({ item }) {
  return (
    <li className="item">
      <div className="card-container">
        <img src={item.user.profile_image_url} width="54" height="54" loading="lazy" alt="" />
        <div className="card-text">
          <a className="QiitaApp-link" href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
          <div className="card-text2">
            <p>{dayjs(item.created_at).fromNow(true)}
               / {item.tags.map((t) => `${t.name}, `).join('')} / {item.likes_count}likes / {item.user.items_count}posts</p>
          </div>
        </div>
      </div>
    </li>
  );
});

function App() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [postsList, setPostsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tag, setTag] = useState('ClaudeCode');
  const [error, setError] = useState('');
  // 同じタグ・ページを再クリックした時やリトライ時にも再取得させるためのキー
  const [reloadKey, setReloadKey] = useState(0);
  // スクロール追加取得可能かどうかのフラグ
  const [hasMore, setHasMore] = useState(true);
  // 番兵の通知から同期的に読み込み中かを判定するため ref でも保持(多重にページを進めない)
  const isLoadingRef = useRef(false);
  // リスト末尾の番兵要素。画面内に入ったら次ページを取得する
  const sentinelRef = useRef(null);

  // 番兵が見えたらページを更新。
  // 読み込み完了のたびに observer を張り直すので、1ページ目が画面より短く
  // スクロールできない場合でも続きを自動で取得できる
  useEffect(() => {
    if (isLoading || !hasMore || error) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || isLoadingRef.current) return;
      observer.disconnect();
      isLoadingRef.current = true;
      setPage((prevCount) => prevCount + 1);
    }, { rootMargin: `0px 0px ${SCROLL_THRESHOLD}px 0px` });
    observer.observe(el);

    return () => observer.disconnect();
  }, [isLoading, hasMore, error]);

  // tag / page / perPage が変化した時に記事を取得
  useEffect(() => {
    const controller = new AbortController();
    const url = `https://qiita.com/api/v2/tags/${encodeURIComponent(tag)}/items?page=${page}&per_page=${perPage}`;

    isLoadingRef.current = true;
    setIsLoading(true);
    setError('');

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.message ?? `HTTP ${res.status}`);
        }
        if (!Array.isArray(data)) {
          throw new Error('Unexpected response from Qiita API');
        }
        return data;
      })
      .then((data) => {
        // 中断後に本文の読み込みが終わった場合は古い結果なので捨てる
        if (controller.signal.aborted) return;
        // 取得中に新着記事が増えるとページ境界がずれて同じ記事が再度返るため id で重複を除く
        setPostsList((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return prev.concat(data.filter((p) => !seen.has(p.id)));
        });
        // 取得結果が perPage より少なければ追加データなし
        setHasMore(data.length >= perPage);
      })
      .catch((err) => {
        // タグ切り替え等で中断したリクエストはエラー扱いしない
        if (controller.signal.aborted || err.name === 'AbortError') return;
        setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          isLoadingRef.current = false;
          setIsLoading(false);
        }
      });

    // 条件が変わったら古いリクエストを破棄(古い結果が混ざるのを防ぐ)
    return () => controller.abort();
  }, [tag, page, perPage, reloadKey]);

  const tagButtonClick = (target) => {
    setPerPage(20);
    setPostsList([]);
    setPage(1);
    setTag(target);
    setHasMore(true);
    setReloadKey((k) => k + 1);
  }

  const pageButtonClick = (target) => {
    setPerPage(100);
    setPostsList([]);
    setPage(target);
    setHasMore(true);
    setReloadKey((k) => k + 1);
  }

  // 失敗したページをもう一度取得する(ページは進めない)
  const retry = () => {
    setReloadKey((k) => k + 1);
  }

  // 表示されるHTMLを記述
    return (
      <div className="App">
        <header className="QiitaApp-header">
          {error && (
            <>
              <span role="alert" style={{ color: 'red', fontWeight: 'bold' }}>{error}</span>
              {' '}<button onClick={retry}>Retry</button>
              <br />
            </>
          )}
          <a className="QiitaApp-link" href="https://mbp.hatenablog.com/entry/2022/07/16/103717" target="_blank" rel="noreferrer">netlifyとVercelでVite React App、QiitaAPIから記事情報を取得して表示(vite-react-pages)</a><br />
          <a className="QiitaApp-link" href="https://mbp.hatenablog.com/entry/2022/07/14/225626" target="_blank" rel="noreferrer">Vite で React 新規プロジェクトを作成</a><br />
          <h3>Qiita で{tag}タグありの記事を表示</h3>
          <br />
          {TAG_LIST.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => tagButtonClick(id)}
              style={tag === id ? { fontWeight: 'bold' } : undefined}
            >
              {label}
            </button>
          ))}
          <br />
          {tag}<br />
          page:<button onClick={() => {pageButtonClick(1)}}>__1__</button>
          ___:<button onClick={() => {pageButtonClick(20)}}>__20__</button>
          ___:<button onClick={() => {pageButtonClick(50)}}>__50__</button>
          ___:<button onClick={() => {pageButtonClick(90)}}>__90</button>
          {page}/{perPage}posts
        </header>

        <main className="QiitaApp-main">
          <ul>
            {postsList.map((item) => <PostItem key={item.id} item={item} />)}
          </ul>
          <div ref={sentinelRef} aria-hidden="true" />

          <div className="QiitaApp-status">
            Page {page}, tag {tag}
            <br />
            {isLoading ? (
              <>Loading .... page: {page}/{perPage}posts/{perPage*(page-1)+1}-</>
            ) : !hasMore ? (
              <>No more posts. page: {page}/{perPage}posts/{perPage*(page-1)+1}-</>
            ) : (
              <>Not Loading. page: {page}/{perPage}posts/{perPage*(page-1)+1}-</>
            )}
          </div>
        </main>

        <footer className="QiitaApp-footer">{tag} Page {page}/{perPage}posts/{perPage*(page-1)+1}-</footer>
      </div>
    )
}

export default App;
