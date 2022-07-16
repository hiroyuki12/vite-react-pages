import React, { Component } from 'react';
// axiosをインポート
import axios from 'axios';
import moment from 'moment';

class App extends Component {
  constructor(props) {
    super(props);
    this.getQiitaPosts = this.getQiitaPosts.bind(this);
    this.renderImageList = this.renderImageList.bind(this);
    this.state = {
      // ここを`React`など検索したいワードに変えられる
      query: 'React',
      page: 1,
      postsList: []
    }
  }

  // QiitaAPIを叩く
  getQiitaPosts() {
    //axios.get(APIのエンドポイント,パラメータの引数)
    axios.get('https://qiita.com/api/v2/items', {
        params: {
          "page": this.state.page,
          "per_page": "20",
          "query": this.state.query,
        }
      })
      // response にAPIからのレスポンスが格納される
      .then((response) => {
        // data にレスポンスから帰ってきた1つ目の記事の情報を格納
        this.setState({
          postsList: response.data,
        });
        // コンソールから response と title と url を確認
        console.debug(response, "ressponse");
        console.debug(this.state.title, "title")
        console.debug(this.state.url, "url")
      })
      .catch((error) => {
        console.debug(error);
      });
  }

  // page + 1 
  getNextQiitaPosts() {
    const newPage = this.state.page + 1;
    this.setState({
      page: newPage 
    });
  }
  // page - 1
  getBeforeQiitaPosts() {
    const newPage = this.state.page - 1;
    this.setState({
      page: newPage 
    });
  }

  renderImageList(list) {
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
  render() {
    return (
      <div className="App">
        <h1 className="app-title">Hello Qiita API</h1>
        <ul>{this.renderImageList(this.state.postsList)}</ul>
        <input
          type="button"
          value="検索"
          onClick={() => this.getQiitaPosts()}
        />
        <input
          type="button"
          value="+1"
          onClick={() => this.getNextQiitaPosts()}
        />
        <input
          type="button"
          value="-1"
          onClick={() => this.getBeforeQiitaPosts()}
        />
        Page {this.state.page}, tag {this.state.query}
      </div>
    )
  }
}

export default App;
