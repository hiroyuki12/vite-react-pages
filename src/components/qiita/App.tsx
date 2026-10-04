import React, { useState, useEffect, useRef } from 'react';
import throttle from 'lodash/throttle';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import './QiitaApp.css';

// 一番下とみなす余裕(px)。高DPI環境で scrollTop が小数になるため完全一致では判定しない
const SCROLL_THRESHOLD = 100;

type QiitaTag = {
  name: string;
};

type QiitaUser = {
  profile_image_url: string;
  items_count: number;
};

type QiitaItem = {
  id: string;
  title: string;
  url: string;
  created_at: string;
  likes_count: number;
  tags: QiitaTag[];
  user: QiitaUser;
};

type QiitaErrorResponse = {
  message?: string;
};

// Qiita API のレスポンスを記事の配列に変換する。失敗時は Error を投げる
const parseQiitaResponse = async (res: Response): Promise<QiitaItem[]> => {
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as QiitaErrorResponse | null)?.message ?? `HTTP ${res.status}`);
  }
  if (!Array.isArray(data)) {
    throw new Error('Unexpected response from Qiita API');
  }
  return data as QiitaItem[];
};

function App() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [postsList, setPostsList] = useState<QiitaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tag, setTag] = useState('ClaudeCode');
  const [error, setError] = useState('');
  // 同じタグ・ページを再クリックした時にも再取得させるためのキー
  const [reloadKey, setReloadKey] = useState(0);
  // スクロールハンドラから最新の読み込み状態を参照するため ref で保持
  const isLoadingRef = useRef(false);

  // 一番下に到達したらページを更新
  useEffect(() => {
    const handleScroll = throttle(() => {
      if (isLoadingRef.current) {
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
      .then(parseQiitaResponse)
      .then((items) => {
        // 中断後に解決した古い結果は反映しない
        if (controller.signal.aborted) return;
        setPostsList((prev) => prev.concat(items));
      })
      .catch((err: unknown) => {
        // タグ切り替え等で中断したリクエストはエラー扱いしない
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
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

  const tagButtonClick = (target: string) => {
    setPerPage(20);
    setPostsList([]);
    setPage(1);
    setTag(target);
    setReloadKey((k) => k + 1);
  }

  const pageButtonClick = (target: string) => {
    setPerPage(100);
    setPostsList([]);
    setPage(parseInt(target, 10));
    setReloadKey((k) => k + 1);
  }

  const renderTag = (list: QiitaTag[]) => {
    return list.map((item) => (
      <React.Fragment key={item.name}>{item.name}, </React.Fragment>
    ));
  }

  const renderImageList = (list: QiitaItem[]) => {
    const posts = list.map((item) => {
      return (
        <li className="item" key={item.id}>
          <div className="card-container">
            <img src={item.user.profile_image_url} width="54" height="54" loading="lazy" alt="img" />
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
          <h3>Qiitaで{tag}タグありの記事を表示</h3>
          <br />
          <button onClick={() => {tagButtonClick("ClaudeCode")}}>ClaudeCode</button>
          <button onClick={() => {tagButtonClick("Codex")}}>Codex</button>
          <button onClick={() => {tagButtonClick("Gemini")}}>Gemini</button>
          <button onClick={() => {tagButtonClick("Antigravity")}}>Antigravity</button>
          <button onClick={() => {tagButtonClick("React")}}>React</button>
          <button onClick={() => {tagButtonClick("Next.js")}}>Next.js</button>
          {/* <button onClick={() => {tagButtonClick("Vue.js")}}>Vue.js</button> */}
          {/* <button onClick={() => {tagButtonClick("Nuxt.js")}}>Nuxt.js</button> */}
          <button onClick={() => {tagButtonClick("JavaScript")}}>JavaScript</button>
          <button onClick={() => {tagButtonClick("Swift")}}>Swift</button>
          <button onClick={() => {tagButtonClick("Vim")}}>Vim</button>
          {/* <button onClick={() => {tagButtonClick("Azure")}}>Azure</button> */}
          {/* <button onClick={() => {tagButtonClick("Aws")}}>AWS</button> */}
          <button onClick={() => {tagButtonClick(".NET")}}>.NET</button>
          {/* <button onClick={() => {tagButtonClick("Flutter")}}>Flutter</button> */}
          <button onClick={() => {tagButtonClick("Cloudflare")}}>Cloudflare</button>
          {tag}<br />
          page:<button onClick={() => {pageButtonClick("1")}}>__1__</button>
          ___:<button onClick={() => {pageButtonClick("20")}}>__20__</button>
          ___:<button onClick={() => {pageButtonClick("50")}}>__50__</button>
          ___:<button onClick={() => {pageButtonClick("90")}}>__90</button>
          {page}/{perPage}posts
          <ul>{renderImageList(postsList)}</ul>

          Page {page}, tag {tag}
          <br />
          {isLoading ? (
            <>Loading .... page: {page}/{perPage}posts/{perPage*(page-1)+1}-</>
          ) : (
            <>Not Loading. page: {page}/{perPage}posts/{perPage*(page-1)+1}-</>
          )}
        </header>
        <div className="QiitaApp-footer">{tag} Page {page}/{perPage}posts/{perPage*(page-1)+1}-</div>
      </div>
    )
}

export default App;
