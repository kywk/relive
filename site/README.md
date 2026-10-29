# Relive 官方示範網站

公開網址：https://kywk.github.io/relive/

```sh
npm ci
npm run pages:dev
npm run pages:build
npm run pages:preview
```

開發與預覽使用 `/relive/` 路徑。以 `SITE_BASE=/other/` 覆寫；GitHub Pages workflow 依 repository 名稱設定。main push 自動建置並部署；PR 只建置。

`site/src` 管理官網樣式與互動，透過 `@kywk/react-relive` 的 `<Relive journey={journey} />` 顯示互動播放器；背景 hero 保留專用鏡頭控制。`scripts/site/prepare.mjs` 產生 601 點示範軌跡、播放器資料與可下載的 GPX／Markdown。照片點擊可跳到播放器的示範時間，安裝分頁提供 Obsidian、Docusaurus、獨立 React 與 GPX Slim 的安裝方式。React 套件目前需由原始碼打包，尚未發布至 npm。非 Docusaurus 的完整範例見 [`examples/react`](../examples/react)。

## 照片與示範資料

四張京都鴨川攝影來自 Wikimedia Commons，作者、原始作品頁面、授權及下載尺寸見 [credits.json](public/photos/credits.json)，網頁頁尾亦列出署名。前三張為 CC BY 4.0，第四張為 CC0；照片不適用程式碼的 MIT 授權。下載的是 Wikimedia 提供的縮圖，展示時使用 CSS 裁切，未改寫攝影內容。

照片來自不同日期與作者，並非同一次旅行。GPX 是人工編排的河岸示範線；時間與照片對應也是示範資料，不代表攝影者實際位置或拍攝時間，不供導航。替換素材時必須一起更新署名、來源、授權與這些說明；不得加入私人 Vault 資料。

視覺借用旅行誌：Anton 標題、Work Sans 內文、紙白與深青綠、大幅實景與錯落照片。保留播放器原有互動；支援 reduced motion、鍵盤安裝分頁、下載與載入失敗提示。地圖圖磚由 OpenStreetMap 提供；字體由 Google Fonts 提供，失敗時採系統字體。

## 外觀主題

頁首「外觀」提供跟隨系統、淺色與深色。首次依系統偏好，手動選擇保存在瀏覽器 localStorage；選回跟隨系統即清除覆寫，並即時回應系統變更。儲存不可用時仍可在當頁切換。`public/theme.js` 在初次繪製前套用主題，避免載入時閃白。地圖圖磚與照片保留原始色彩，播放器控制列延續透明至深色的漸層。

## 免金鑰 3D

播放器「地圖」選單提供 Leaflet 2D 與 MapLibre 3D。預設 2D，點選才載入 MapLibre、OpenFreeMap 向量圖與 Mapterhorn 地形；不需要 Google key。3D 支援照片彈窗、時間軸、進度保留及主題同步，失敗時回到 2D。開放資料是地形和建築輪廓，不是寫實城市；保留供應商署名，公共服務沒有本專案提供的可用性保證。

## 桌面／平板背景回放

768px 起使用滿版東京 hero；窄屏保留京都照片與原有互動示範。背景鏡頭焦點位於約 73% 寬處，避免左側文字遮擋。回放約 100 秒加每張照片 4 秒停留，循環播放；可暫停，離開畫面／背景分頁停止，減少動態偏好預設暫停。

東京路線由官方課程頁嵌入的 [Google My Maps](https://www.google.com/maps/d/viewer?mid=1DkVRDZhVD4sp8pKTvYvHoZUIOA61YngW) LineString 轉成 GPX，原資料標示 **Tokyo Marathon 2020**，不是 2026 賽道或個人實跑紀錄。保存在 `public/demo/tokyo-marathon.gpx`，背景資料為 `public/demo/tokyo.json`。景點沿路線最近點展示，照片並非賽事實拍或同一次旅程；播放速度為示範編排，不供導航。

東京照片的來源、作者、CC BY／CC BY-SA 授權另見 `public/photos/tokyo-credits.json`，並與京都署名一起顯示於頁尾。照片僅以 CSS 裁切，未修改原圖；不適用程式碼 MIT 授權。

Hero 深色模式採 OpenStreetMap 圖磚的低對比炭灰處理，僅作用於底圖。相較原版 brightness(.8)，小幅提高至 .86，透明度維持 .5，讓主要道路稍微清楚；照片、青綠回放路線與署名不套用底圖濾鏡。
