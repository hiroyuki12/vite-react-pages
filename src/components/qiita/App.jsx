import React, { useState, useEffect } from 'react';
// axiosをインポート
import axios from 'axios';
import lodash from 'lodash';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import './QiitaApp.css';

function App() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [postsList, setPostsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tag, setTag] = useState('React');
  const [error, setError] = useState('');

  // 一番下に到達したら handleClick()でページを更新
  const handleScroll = lodash.throttle(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop !==
      document.documentElement.offsetHeight
    ) {
      return;
    }

    // 一番下に到達した時の処理
    //if(message !== "loading...") {
      setPage((prevCount) => prevCount + 1);
    //}

  }, 500);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // pageが変化した時に実行
  useEffect(() => {
    //document.title = `page = ${page}, message = ${message}`;
    handleClick();
    // eslint-disable-next-line
  }, [page]); // Only re-run the effect if count changes

  // tagが変化した時に実行
  useEffect(() => {
    //document.title = `page = ${page}, message = ${message}`;
    handleClick();
    // eslint-disable-next-line
  }, [tag]); // Only re-run the effect if count changes

  const tagButtonClick = (target) => {
    setPostsList([]);
    setTag(target);
    //setTag('Swift');
  }

  const pageButtonClick = (target) => {
    setPerPage(100);
    setPostsList([]);
    const tmp = parseInt(target,10);
    setPage(tmp);
    //setTag('Swift');
  }

  const handleClick = (target) => {
    const url = `https://qiita.com/api/v2/tags/${tag}/items?page=${page}&per_page=${perPage}`;
    setIsLoading(true);

    const headers = {}
    fetch(url, { headers })
      .then(res =>
        res.json().then(data => ({
          ok: res.ok,
          data,
        }))
      )
      .then(res => {
        if (!res.ok) {
          setError(res.data.message);
          setIsLoading(false);
          //throw Error(res.data.message)
        } else {
          setPostsList(postsList.concat(res.data));
          setIsLoading(false);
        }
      })
  }

  // page + 1 
  const getNextQiitaPosts = () => {
    const newPage = page + 1;
    setPage(newPage);
  }
  // page - 1
  const getBeforeQiitaPosts = () => {
    const newPage = page - 1;
    setPage(newPage);
  }

  const renderTag = (list) => {
    const tags = list.map((item, index) => {
      return (
        <>{item.name}, </>
      );
    });
    return tags;
  }

  const renderImageList = (list) => {
    const posts = list.map((item, index) => {
      return (
        <li className="item" key={index}>
          <div class="card-container">
            <img src={item.user.profile_image_url} width="54" height="54" loading="lazy" alt="img" />
            <div class="card-text">
              <a className="QiitaApp-link" href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
              <div class="card-text2">
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
          <font color="red"><b>{error}</b></font><br />
          <a className="QiitaApp-link" href="https://mbp.hatenablog.com/entry/2022/07/16/103717" target="_blank" rel="noreferrer">netlifyでVite React App、QiitaAPIから記事情報を取得して表示(vite-react-pages)</a><br />
          <a className="QiitaApp-link" href="https://mbp.hatenablog.com/entry/2022/07/14/225626" target="_blank" rel="noreferrer">Vite で React 新規プロジェクトを作成</a><br />
          <h3>QiitaでReactタグありの記事を表示</h3>
          <br />
          <button onClick={() => {tagButtonClick("React")}}>React</button>
          <button onClick={() => {tagButtonClick("Next.js")}}>Next.js</button>
          <button onClick={() => {tagButtonClick("Vue.js")}}>Vue.js</button>
          <button onClick={() => {tagButtonClick("Nuxt.js")}}>Nuxt.js</button>
          <button onClick={() => {tagButtonClick("JavaScript")}}>JavaScript</button>
          <button onClick={() => {tagButtonClick("Swift")}}>Swift</button>
          <button onClick={() => {tagButtonClick("Vim")}}>Vim</button>
          <button onClick={() => {tagButtonClick("Azure")}}>Azure</button>
          <button onClick={() => {tagButtonClick("Aws")}}>AWS</button>
          <button onClick={() => {tagButtonClick(".NET")}}>.NET</button>
          <button onClick={() => {tagButtonClick("Flutter")}}>Flutter</button>
          {tag}<br />
          page:<button onClick={() => {pageButtonClick("1")}}>__1__</button>
          ___:<button onClick={() => {pageButtonClick("20")}}>__20__</button>
          ___:<button onClick={() => {pageButtonClick("50")}}>__50__</button>
          ___:<button onClick={() => {pageButtonClick("90")}}>__90</button>
          {page}/{perPage}posts
          <ul>{renderImageList(postsList)}</ul>

          Page {page}, tag {tag}, {isLoading}
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
