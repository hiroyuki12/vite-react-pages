import React, { useState, useEffect } from 'react';
// axiosをインポート
import axios from 'axios';
import moment from 'moment';

function App() {
  const [query, setQuery] = useState('React');
  const [page, setPage] = useState(1);
  const [postsList, setPostsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // pageが変化した時に実行
  useEffect(() => {
    //document.title = `page = ${page}, message = ${message}`;
    getQiitaPosts();
    // eslint-disable-next-line
  }, [page]); // Only re-run the effect if count changes

  // QiitaAPIを叩く
  const getQiitaPosts = () => {
    setIsLoading(true);

    //axios.get(APIのエンドポイント,パラメータの引数)
    axios.get('https://qiita.com/api/v2/items', {
        params: {
          "page": page,
          "per_page": "20",
          "query": query,
        }
      })
      // response にAPIからのレスポンスが格納される
      .then((response) => {
        // data にレスポンスから帰ってきた記事の情報を格納
        setPostsList(postsList.concat(response.data));
        setIsLoading(false);
        // コンソールから response と title と url を確認
        console.debug(response, "ressponse");
        console.debug(title, "title")
        console.debug(url, "url")
      })
      .catch((error) => {
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
        <h1 className="app-title">Hello Qiita API</h1>
        <ul>{renderImageList(postsList)}</ul>
        <input
          type="button"
          value="検索"
          onClick={() => {getQiitaPosts()}}
        />
        <input
          type="button"
          value="+1"
          onClick={() => {getNextQiitaPosts()}}
        />
        <input
          type="button"
          value="-1"
          onClick={() => {getBeforeQiitaPosts()}}
        />
        Page {page}, tag {query}, {isLoading}
        <br />
        {isLoading ? (
          <>Loading .... </>
        ) : (
          <>Not Loading. </>
        )}
      </div>
    )
}

export default App;
