# 獨立 React 範例

這是 Vite + React 應用，沒有 Docusaurus 或 Obsidian adapter。使用 `@kywk/react-relive` 的公開入口、CSS 與旅程型別資料；React Strict Mode 和掛載切換按鈕可檢查資源清理。

從 repository 根目錄執行：

```sh
npm install
npm run react:demo
npm run react:build
```

請先在 repository 根目錄安裝依賴，讓所有範例共用本機套件與工具。開發期間套件透過 `file:../../packages/react-relive` 連結；移植到其他專案時，安裝 `npm run react:release:pack` 產生的 tarball。套件尚未發布至 npm registry。

```jsx
import {Relive} from '@kywk/react-relive';
import '@kywk/react-relive/styles.css';

// journey 在元件外建立，或以 useMemo 保持參照穩定。
<Relive journey={journey} />
```

[`src/journey.js`](src/journey.js) 使用 `makeTrack`、`matchPhoto` 建立合成路線和插圖；也可使用 `makeTrack(parseGpx(gpxText))` 解析自己讀取的 GPX。檔案下載、網址與資料取得由應用負責。不要把未解析的 YAML config 直接當作 `journey`。

播放器 import 可用於 SSR；地圖只在瀏覽器 effect 啟動。Next.js App Router 請在 `'use client'` 元件中使用，並在允許的入口匯入 CSS。更新 `journey` 參照會重建播放器並重置播放進度。

驗證時測試播放、時間軸拖曳、照片跳轉、2D／3D 切換，以及「卸載播放器 → 重新掛載播放器」。地圖需要網路；合成插圖和路線本身不依賴私人檔案或外部照片。
