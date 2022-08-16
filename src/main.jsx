import React from 'react'
import ReactDOM from 'react-dom/client'
//import App from './App'
import App from './components/qiita/App'
//import App from './components/youtube/App'
import './index.css'
import { registerSW } from 'virtual:pwa-register';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

registerSW();
