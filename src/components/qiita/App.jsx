import React, { useState, useEffect, useRef } from 'react';
import throttle from 'lodash/throttle';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import './QiitaApp.css';

// 一番下とみなす余裕(px)。高DPI環境で scrollTop が小数になるため完全一致では判定しない
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

function App() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [postsList, setPostsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tag, setTag] = useState('ClaudeCode');
  const [error, setError] = useState('');
  // 同じタグ・ページを再クリックした時にも再取得させるためのキー
  const [reloadKey, setReloadKey] = useState(0);
  // スクロール追加取得可能かどうかのフラグ
  const [hasMore, setHasMore] = useState(true);
  // スクロールハンドラから最新の読み込み状態および hasMore を参照するため ref で保持
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  // 一番下に到達したらページを更新
  useEffect(() => {
    const handleScroll = throttle(() => {
      if (isLoadingRef.current || !hasMoreRef.current) {
        return;
      }
      const { scrollTop, offsetHeight } = document.documentElement;
      if (window.innerHeight + scrollTop < offsetHeight - SCROLL_THRESHOLD) {
        return;
      }

      // 一番下に到達した時の処理
      setPage((prevCount) => prevCount + 1);
    }, 500);

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      handleScroll.cancel();
    };
  }, []);

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
        return data;
      })
      .then((data) => {
        setPostsList((prev) => prev.concat(data));
        // 取得結果が 0 件または perPage より少なければ追加データなし
        const more = Boolean(data && data.length >= perPage);
        setHasMore(more);
        hasMoreRef.current = more;
      })
      .catch((err) => {
        // タグ切り替え等で中断したリクエストはエラー扱いしない
        if (err.name === 'AbortError') return;
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
    hasMoreRef.current = true;
    setReloadKey((k) => k + 1);
  }

  const pageButtonClick = (target) => {
    setPerPage(100);
    setPostsList([]);
    setPage(parseInt(target, 10));
    setHasMore(true);
    hasMoreRef.current = true;
    setReloadKey((k) => k + 1);
  }

  const renderTag = (list) => {
    return list.map((item) => (
      <React.Fragment key={item.name}>{item.name}, </React.Fragment>
    ));
  }

  const renderImageList = (list) => {
    const posts = list.map((item) => {
      return (
        <li className="item" key={item.id}>
          <div className="card-container">
            <img src={item.user.profile_image_url} width="54" height="54" loading="lazy" alt="" />
            <div className="card-text">
              <a className="QiitaApp-link" href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
              <div className="card-text2">
                <p>{dayjs(item.created_at).fromNow(true)}
                   / {renderTag(item.tags)} / {item.likes_count}likes / {item.user.items_count}posts</p>
              </div>
            </div>
          </div>
        </li>
      );
    });
    return posts;
  }

  // 表示されるHTMLを記述
    return (
      <div className="App">
        <header className="QiitaApp-header">
          <span style={{ color: 'red', fontWeight: 'bold' }}>{error}</span><br />
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
          page:<button onClick={() => {pageButtonClick("1")}}>__1__</button>
          ___:<button onClick={() => {pageButtonClick("20")}}>__20__</button>
          ___:<button onClick={() => {pageButtonClick("50")}}>__50__</button>
          ___:<button onClick={() => {pageButtonClick("90")}}>__90</button>
          {page}/{perPage}posts
        </header>

        <main className="QiitaApp-main">
          <ul>{renderImageList(postsList)}</ul>

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
