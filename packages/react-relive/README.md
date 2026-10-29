# @kywk/react-relive

在 Vite、Next.js 或其他 React host 使用 Relive，支援 React 19.x，不需 Docusaurus 或 Obsidian。

```sh
npm install @kywk/react-relive react@19 react-dom@19
```

```jsx
import {Relive, parseGpx, makeTrack} from '@kywk/react-relive';
import '@kywk/react-relive/styles.css';

const journey = {
  title: '示範旅程',
  track: makeTrack(parseGpx('<gpx><trk><trkseg><trkpt lat="25" lon="121"/><trkpt lat="25.01" lon="121.01"/></trkseg></trk></gpx>')),
  photos: [], events: [], warnings: [], duration: 60,
};
export default function App() {
  return <Relive journey={journey} onError={console.error} />;
}
```

`journey` 是已解析的資料，照片需提供瀏覽器可讀的 `url` 與 `progress`。可用 `matchPhoto(photo, track)` 匹配時間或 GPS。使用 `useMemo` 或 state 保持 journey identity 穩定；換成新物件或改 `googleMapsApiKey` 會清理並重建播放器、重置播放進度。卸載與 React StrictMode 都會清理播放器；動態載入完成前卸載不會留下地圖。

`className`、`style` 套用於外層容器。`onReady()` 在播放器掛載後呼叫；`onError(error)` 回報載入／掛載錯誤，同時顯示錯誤訊息。更新 callbacks 不會重建播放器。播放器自己的 3D 失敗會依既有規則退回 2D。

JavaScript 入口可在 SSR 匯入；Leaflet 僅在 client effect 載入。Next.js App Router 請在 client component 傳入 callbacks，並於允許全域 CSS 的入口匯入樣式。CSS entry 包含 Leaflet、MapLibre 與 Relive 樣式，需要支援 npm CSS imports 的 bundler。

完整說明見 [React 整合指南](https://github.com/kywk/relive/blob/main/docs/react.md)，本機範例在 `examples/react`。此套件共用 `@kywk/relive` 播放器，React 為 peer dependency。
