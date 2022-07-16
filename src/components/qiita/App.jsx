import React, { useState, useEffect } from 'react';
// axiosをインポート
import axios from 'axios';
import lodash from 'lodash';
import moment from 'moment';
import '../../QiitaApp.css';

function App() {
  const [page, setPage] = useState(1);
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

  // QiitaAPIを叩く
  const handleClick = () => {
    setIsLoading(true);

    //axios.get(APIのエンドポイント,パラメータの引数)
    axios.get('https://qiita.com/api/v2/items', {
        params: {
          "page": page,
          "per_page": "20",
          "query": tag,
        }
      })
      // response にAPIからのレスポンスが格納される
      .then((response) => {
        // data にレスポンスから帰ってきた記事の情報を格納
        setPostsList(postsList.concat(response.data));
        setIsLoading(false);
        setError('');
        // コンソールから response と title と url を確認
        console.debug(response, "ressponse");
        //console.debug(title, "title")
        //console.debug(url, "url")
      })
      .catch((error) => {
        setIsLoading(false);
        setError('Rate limit exceeded');
        //setError(error.message);
        console.debug(error);
      });
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

  const renderImageList = (list) => {
    const posts = list.map((item, index) => {
      return (
        <li className="item" key={index}>
          <img src={item.user.profile_image_url} width="50" height="50" loading="lazy" alt="img" />
          <a className="QiitaApp-link" href={item.url} target="_blank" rel="noreferrer">{item.title}</a> {moment(item.created_at).fromNow()}
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
          <a className="QiitaApp-link" href="https://mbp.hatenablog.com/entry/2022/07/16/103717" target="_blank" rel="noreferrer">netlifyでVite React App、QiitaAPIから記事情報を取得して表示</a><br />
          <a className="QiitaApp-link" href="https://mbp.hatenablog.com/entry/2022/07/14/225626" target="_blank" rel="noreferrer">Vite で React 新規プロジェクトを作成</a><br />
          <h3>QiitaでReactタグありの記事を表示</h3>
          <br />
          <button onClick={() => {tagButtonClick("react")}}>react</button>
          <button onClick={() => {tagButtonClick("swift")}}>swift</button>
          <button onClick={() => {tagButtonClick("vim")}}>vim</button>
          <button onClick={() => {tagButtonClick("azure")}}>azure</button>
          <button onClick={() => {tagButtonClick("aws")}}>aws</button>
          <button onClick={() => {tagButtonClick(".NET")}}>.NET</button>
          <button onClick={() => {tagButtonClick("Flutter")}}>Flutter</button>
          {tag}
          <ul>{renderImageList(postsList)}</ul>

          Page {page}, tag {tag}, {isLoading}
          <br />
          {isLoading ? (
            <>Loading .... page: {page}/20posts/{20*(page-1)+1}-</>
          ) : (
            <>Not Loading. page: {page}/20posts/{20*(page-1)+1}-</>
          )}
        </header>
      </div>
    )
}

export default App;
