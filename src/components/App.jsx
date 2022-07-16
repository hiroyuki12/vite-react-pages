import React, { Component } from 'react';
// axiosをインポート
import axios from 'axios';
import moment from 'moment';

class App extends Component {
  constructor(props) {
    super(props);
    this.getQiitaPosts = this.getQiitaPosts.bind(this);
    this.state = {
      // ここを`React`など検索したいワードに変えられる
      query: 'React'
    }
  }

  // QiitaAPIを叩く
  getQiitaPosts() {
    //axios.get(APIのエンドポイント,パラメータの引数)
    axios.get('https://qiita.com/api/v2/items', {
        params: {
          "page": "1",
          "per_page": "20",
          "query": this.state.query,
        }
      })
      // response にAPIからのレスポンスが格納される
      .then((response) => {
        // data にレスポンスから帰ってきた1つ目の記事の情報を格納
        const data = response.data[0];
        const data1 = response.data[1];
        this.setState({
          title: data.title,
          url: data.url,
          profile: data.user.profile_image_url,
          created_at: data.created_at,

          title1: data1.title,
          url1: data1.url,
          profile1: data1.user.profile_image_url,
          created_at1: data1.created_at,
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

  // 表示されるHTMLを記述
  render() {
    return (
      <div className="App">
        <h1 className="app-title">Hello Qiita API</h1>
        <li className="item">
          <img src={this.state.profile} width="50" height="50" loading="lazy" alt="img" />
          <a className="QiitaApp-link" href={this.state.url} target="_blank" rel="noreferrer">{this.state.title}</a> {moment(this.state.created_at).fromNow()}
        </li>
        <li className="item">
          <img src={this.state.profile1} width="50" height="50" loading="lazy" alt="img" />
          <a className="QiitaApp-link" href={this.state.url} target="_blank" rel="noreferrer">{this.state.title1}</a> {moment(this.state.created_at1).fromNow()}
        </li>
        <input
          type="button"
          value="検索"
          onClick={() => this.getQiitaPosts()}
        />
      </div>
    )
  }
}

export default App;
