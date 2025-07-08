// =========================================================
//  3. src/main.jsx - /src 폴더 안에 위치시킵니다.
// =========================================================
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // 기본적인 스타일링을 위해 포함

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
