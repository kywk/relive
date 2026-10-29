# React 整合指南

`@kywk/react-relive` 是獨立 npm 套件，參照 StoryMap 的 host 分層方式，包裝 Relive 共用播放器。React 18／19 應用程式可直接使用；不需要 Docusaurus、Obsidian API 或 Vault。

## 安裝與本機驗證

發布至 npm 後，在已有 React 的專案執行：

```sh
npm install @kywk/react-relive
```

尚未發布時，在 Relive repository 根目錄產生 tarball：

```sh
npm ci
npm run release:pack
npm run react:release:pack
```

再於消費端安裝兩個本機產物，版本依實際檔名調整：

```sh
npm install /path/to/relive/.release/docusaurus/kywk-relive-0.1.0.tgz /path/to/relive/.release/react/kywk-react-relive-0.1.0.tgz
```

React 套件依賴共用 `@kywk/relive`；首次上架前需同時提供它，不能只把 React tarball 交給 CI。依賴中的 Docusaurus 整合入口不會被 React 入口載入，Docusaurus 本身也不是 runtime dependency。

完整範例在 [`examples/react`](../examples/react/README.md)，於 repository 根目錄執行 `npm run react:demo`。官網同樣使用 React 元件；既有 Docusaurus 範例仍保留 Markdown 建置整合。

## 最小範例

```jsx
import {Relive, makeTrack, parseGpx} from '@kywk/react-relive';
import '@kywk/react-relive/styles.css';

const track = makeTrack(parseGpx(`<gpx version="1.1" creator="demo"><trk><trkseg>
  <trkpt lat="25.05" lon="121.50"><time>2026-10-30T00:00:00Z</time></trkpt>
  <trkpt lat="25.06" lon="121.51"><time>2026-10-30T00:10:00Z</time></trkpt>
</trkseg></trk></gpx>`));
const journey = {
  title: '河岸散步', duration: 30, stopDuration: 3,
  timezoneOffset: '+08:00', renderer: 'leaflet',
  track, photos: [], events: [], warnings: [],
};

export default function App() {
  return <Relive journey={journey} onError={console.error} />;
}
```

這是合成資料。樣式只需載入 `@kywk/react-relive/styles.css`，其中包含 Leaflet、MapLibre 與播放器樣式；可放在應用程式的全域 CSS 入口。

## 資料與生命週期

`journey` 是解析完成的旅程，包含 `makeTrack(parseGpx(xml))` 建立的軌跡、已配對的 `photos`、已解析的 `events`，以及標題、播放時間與時區。型別由套件提供；`parseBlock` 可解析原有 YAML，但回傳的是來源設定，仍須由應用程式載入 GPX、照片並轉成旅程資料。

元件不會讀取檔案、掃描 Vault 或自動抓 EXIF。網站附件使用可從瀏覽器存取的 URL；若由應用程式 fetch GPX，需處理 HTTP 錯誤、CORS 與請求取消。既有 Docusaurus `assetRoots` 和 `gpxSlim` 屬於建置 adapter，不是 React props。

`matchPhoto` 可把已知時間或 GPS 的照片配對至軌跡，例如：

```js
import {matchPhoto} from '@kywk/react-relive';

const photo = matchPhoto({
  src: '/photos/bridge.jpg', url: '/photos/bridge.jpg',
  timestamp: Date.parse('2026-10-30T00:05:00Z'),
  caption: '橋邊',
}, track);
const journeyWithPhoto = {...journey, photos: [photo]};
```

傳入的照片需有供瀏覽器顯示的 `url`。沒有可匹配時間或坐標時，照片保留在相片集錦並標示未定位。

`Relive` 支援 `className`、`style`、`onReady`、`onError` 與選配 `googleMapsApiKey`。Google key 是交付瀏覽器的公開 client credential，應設定來源與 API 限制。

元件在 effect 中動態載入播放器，SSR import 不建立地圖。卸載或切換旅程會清理動畫、事件與地圖，適用 React StrictMode。更換 `journey` 物件會重建播放器並重置進度；用模組常數、state 或 `useMemo` 保持不變資料的 identity。不要在每次 render 都重新組合整份旅程。

## SSR 與其他框架

Vite 可直接使用上述範例。Next.js App Router 請把使用元件的檔案放在 `'use client'` 邊界，並在框架允許的位置載入全域 CSS；SSR 階段只輸出容器，瀏覽器掛載後才建立地圖。這裡提供接入原則，專案的可執行範例與建置驗證以 Vite 為主。

其他框架需能掛載 React 元件，例如其 React island／adapter。純 Vue 或 Svelte 應用程式也可另行使用 `@kywk/relive/player` 的 `mountPlayer` 與清理函式，但不屬於 React 套件本身的框架整合。

## 發行

React 使用獨立版本與 `react-relive-v<version>` tag，由 `release-react.yml` 處理。首次發布順序是共用 `@kywk/relive`、再 `@kywk/react-relive`。本機測試、tarball 驗證、遠端 Actions 與 registry 發布是不同階段，請依實際結果確認。
