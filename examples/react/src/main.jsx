import React, {StrictMode, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Relive} from '@kywk/react-relive';
import '@kywk/react-relive/styles.css';
import './style.css';
import {journey} from './journey.js';

function App() {
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState('');
  return <main>
    <p className="eyebrow">RELIVE / REACT</p>
    <h1>在你的 React 應用，讓旅程再走一次。</h1>
    <p>這個 Vite 範例直接使用獨立的 <code>@kywk/react-relive</code> 元件，可播放、拖曳時間軸、點選照片，以及切換 MapLibre 3D。</p>
    <button className="toggle" onClick={() => {setVisible(value => !value); setError('');}}>{visible ? '卸載播放器' : '重新掛載播放器'}</button>
    <p role="status">{error ? `無法載入播放器：${error}` : visible ? '播放器已掛載；可測試卸載與重新掛載。' : '播放器已卸載，地圖與播放資源已釋放。'}</p>
    {visible ? <Relive journey={journey} onError={cause => setError(cause.message)} /> : null}
    <p className="note">路線、時間與插圖都是合成示範資料，不代表實際旅行紀錄，也不供導航。底圖由 OpenStreetMap 提供；3D 需連線下載底圖與地形。</p>
    <a href="https://github.com/kywk/relive/tree/main/packages/react-relive">套件 API 與安裝說明 ↗</a>
  </main>;
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
