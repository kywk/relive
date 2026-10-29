# Relive — Obsidian 與 Docusaurus 旅程回放

把 `relive` fenced code block 放進筆記，以 Leaflet 播放 GPX 軌跡並顯示相片。第一版提供 2D 地圖、播放／暫停、拖曳進度、倍速、相機跟隨、相片縮圖與定位提示。支援免金鑰 MapLibre 3D 地形與選配 Google 寫實 3D；尚未提供影片匯出。

## 官方 Demo 與 GitHub Pages

[開啟 Relive Demo](https://kywk.github.io/relive/)：京都鴨川實景照片、可播放的示範路線、Markdown 範例及安裝方式。照片採 CC BY 4.0／CC0，完整署名見網站頁尾；路線與時間是示範編排。

執行 `npm run pages:dev` 預覽，`npm run pages:build` 建置至 `site/dist`。main push 由 `.github/workflows/pages.yml` 自動部署，PR 僅建置；詳見 [網站維護說明](site/README.md)。此流程不發布 npm 或 Obsidian Community。

## GPX 瘦身 CLI

獨立發布的 GPX 瘦身工具位於 [`packages/gpx-slim`](./packages/gpx-slim/README.md)，支援停留／低速點精簡、三種壓縮強度與目標刪點比例，需要 Node.js 22+。

```sh
npm --prefix packages/gpx-slim ci
node packages/gpx-slim/bin/gpx-slim.js ride.gpx --analyze
node packages/gpx-slim/bin/gpx-slim.js ride.gpx --preset balanced --reduction 70
npm --prefix packages/gpx-slim test
```

套件有自己的 `package.json` 與 lockfile，可在子目錄獨立打包、發布至 npm 並透過 `npx` 執行；不需要先建置 Relive。

## 開發與預覽

需要 Node.js 20.19+；目前驗證環境為 Node.js 22。

```sh
npm ci
npm test
npm run build
npm run demo
```

`npm run demo` 啟動獨立地圖預覽。`npm run site:build` 建置包含兩頁的 Docusaurus 範例；`npm run site:serve` 預覽，路徑為 `/journeys/`。範例軌跡與插圖是合成測試資料。

## Markdown 格式

````markdown
```relive
title: 河濱晨騎
duration: 60
timezoneOffset: '+08:00'
photos:
  - '[[assets/IMG_001.jpg]]'
  - '![河岸](./assets/IMG_002.jpg)'
  - https://example.com/photo.jpg
  - src: ./assets/no-exif.jpg
    time: '2026-10-29T07:05:00+08:00'
    caption: 河岸的早晨
  - src: ./assets/gps-only.jpg
    lat: 25.057
    lon: 121.507
gpx:
  - ./assets/morning.gpx
```
````

純字串連結、帶引號的 Obsidian `[[wikilink]]`／`![[embed]]`、Markdown 圖片／連結都可使用。YAML 中的 wikilink **需加引號**。`photos`、`gpx` 接受清單；`gpx` 也接受單一字串。相片物件使用 `src`（也接受 `url`），可附 `time`、`lat`、`lon`、`caption`。

內嵌 XML 時使用 YAML 多行字串（`raw: |`），XML 每行縮排兩格：

````markdown
```relive
title: 一小段旅程
raw: |
  <gpx version="1.1" creator="Relive">
    <trk><trkseg>
      <trkpt lat="25.05" lon="121.50"><time>2026-10-29T00:00:00Z</time></trkpt>
      <trkpt lat="25.06" lon="121.51"><time>2026-10-29T00:10:00Z</time></trkpt>
    </trkseg></trk>
  </gpx>
```
````

`raw` 與 `gpx` 可同時提供；先載入 raw，再依序載入 GPX 清單，各段分開繪製。請依旅程順序排列檔案。

## 相片如何對齊

1. 手動 `time` 優先於 EXIF `DateTimeOriginal`／`CreateDate`。時間落於軌跡範圍內時，依時間內插位置並對齊播放進度。
2. 沒有可用時間、時間超出軌跡範圍，或 GPX 時間不完整時，以手動／EXIF GPS 找最近的**軌跡點**。目前沒有距離上限，位置離路線很遠的照片也可能匹配到端點。
3. 兩者都沒有時，保留照片於縮圖列並顯示提示，不猜測它的軌跡位置。

EXIF 未記錄時區時，以區塊 `timezoneOffset` 解讀，預設為台灣 `+08:00`，不依執行機器時區。EXIF 自帶 `OffsetTimeOriginal` 時優先採用它；手動 ISO 時間自帶的時區最高優先。GPX 時間應使用含時區的 ISO 8601。

GPX 時間完整且單調遞增時依時間回放，否則依距離回放。`duration` 指整段回放的秒數（1–3600），預設 60。相片與事件在進度到達時於地圖座標彈出，預設停留 3 秒後關閉並繼續沿 GPX 播放。播放只由使用者操作啟動。

## 安裝 Obsidian 插件

執行 `npm run build` 後，把 `dist/obsidian/` 內三個檔案放到：

```text
<vault>/.obsidian/plugins/relive/
  main.js
  manifest.json
  styles.css
```

重新載入 Obsidian 並啟用 Relive。Markdown code block processor 支援閱讀模式與 Live Preview 顯示的區塊。Vault 資產使用 Obsidian 的連結解析器，支援標準 wikilink 搜尋規則。遠端 GPX／EXIF 經 `requestUrl` 讀取；相片顯示仍由瀏覽器載入來源網址。圖片主機若禁止外連顯示，建議存入 Vault。

插件建置包含 Leaflet、解析器與 CSS，無需在 Vault 安裝 npm 依賴。離開筆記時釋放地圖與動畫。

## Docusaurus 整合

建議使用 `createReliveIntegration`，在同一個 Vault 中讓網站直接讀取原始筆記與附件。完整可執行範例在 `examples/shared-vault/`；其中所有內容皆為合成資料。

```js
const createReliveIntegration = require('@kywk/relive/integration');
const relive = createReliveIntegration({
  vaultRoot: __dirname,
  assetRoots: ['media'], // 明確列出會公開的附件目錄，依自己的 Vault 調整
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
});

// 加入既有 Docusaurus config，而非取代原本設定：
// plugins: [...原有 plugins, relive.plugin]
// 每個 docs / blog / album 的 remarkPlugins: [...原有插件, relive.remark]
```

套件已配置為公開 npm 套件 `@kywk/relive`，目前尚未發布。發布成功後執行 `npm install @kywk/relive`。本機可改成 `require('/本機/relive/src/integration.cjs')`，但這種絕對路徑不能提交給網站 CI 使用。正式部署前須先發布到可由 CI 存取的 registry，並把套件版本和 lockfile 納入網站。安裝步驟不會改寫 Vault 筆記。

### 網站建置時的 GPX 瘦身

在網站整合設定啟用 `gpxSlim`：

```js
const relive = createReliveIntegration({
  vaultRoot: __dirname,
  assetRoots: ['media'],
  gpxSlim: {preset: 'gentle'}, // 網站實測建議；需要時另加 targetReduction: 70
});
```

實測建議網站明確使用 `gentle`，先不指定刪點比例；省略設定仍保留完整軌跡，`true` 仍沿用 balanced。純 GPS 照片在停留／重訪位置可能改變播放時刻，需要精確順序時先關閉瘦身。完整數據與限制見 [GPX 瘦身瀏覽器效能報告](docs/gpx-slim-performance.md)。

`preset` 接受 `gentle`、`balanced`、`aggressive`；`targetReduction` 是目標刪除軌跡點百分比（0–100），不是檔案大小壓縮率，也不是保留比例。省略比例時依強度精簡，受必要點與誤差限制，實際刪點可能少於目標。`gpxSlim: true` 使用 balanced；省略或 false 保留完整軌跡。設定直接使用 remarkRelive 時也相同。未知參數或無效設定會使建置失敗。

瘦身發生在 Docusaurus 的 remark 建置階段：讀取 GPX XML → 共用 GPX Slim 核心精簡 → 解析並產生網站內嵌軌跡。支援本機 GPX、內嵌 raw，以及原本明確允許的遠端 GPX。讀檔仍受 assetRoots 邊界限制；Vault 原檔與 Obsidian 載入流程不變。這不是瀏覽器下載後再壓縮，也不會另外產生可下載的瘦身 GPX 附件。使用者自行放進 Docusaurus static 的原始檔仍會被正常複製，不受此功能處理。

建置記錄會輸出各來源的點數／XML 位元組前後差異及未達目標警告；相同報告可從編譯 VFile 的 `data.reliveGpxSlim` 取得。XML 位元組減幅不等於最終 HTML／JavaScript 或 HTTP 壓縮後的傳輸減幅。Docusaurus 增量編譯可能重用快取，修改附件後請清除快取再建置。

減少點數可降低網站軌跡資料量、初始化與地圖座標儲存負擔。現有播放採 256 點分塊更新，播放速度改善不會與刪點率等比例；照片、底圖與 Google 3D 影像的成本也不會因此減少。瘦身會改變曲線細節、距離／高度統計和時間內插；GPS 照片以剩餘點配對，其播放進度也可能變動。有時間的照片／事件仍按保留的起迄時間定位，但位置不保證與原始軌跡完全一致。需要保留精確原始紀錄的頁面可關閉此功能。

網站 npm tarball 包含 CLI 的同一份核心來源與 LICENSE，使用根套件的 saxes runtime dependency；不執行 npx、不需等 CLI 套件先發布。瘦身核心只供網站建置使用，未加入 Obsidian 或播放器 bundle。

### 對應你的共用 Vault

依 `~/Dropbox/obsidian` 現有配置，Vault 根目錄也是 Docusaurus 專案：

- docs 有 `backpacker`、`lifehacker`、`moco` 三個集合。
- blog 有 `blog.life`、`blog.news`，相簿使用 `docusaurus-plugin-album` 讀取 `blog.album`。
- 在既有 `createRemarkPlugins` 的 wiki link、StoryMap 後加入 `relive.remark`；同時在 `createBlogRemarkPlugins` 的 wiki link 後加入它，讓 blog 和 album 也生效。
- 保留 `markdown.format: 'detect'`、現有 `parseFrontMatter` / `deriveSlug` 和 `contentLinkIndex`。Relive 不改文章 slug、一般 wiki 連結或集合發布範圍。
- 保留 StoryMap 功能，只另加一次 `relive.plugin`。插件支援 Docusaurus 的 Webpack／Rspack，並解析網站的 Leaflet 避免同頁載入不同實例。

StoryMap 0.5.1 的 client 入口會在 import 時自動掛載；共存測試發現它可能在 React hydration 前改動頁面。範例 `story-map-client.js` 示範改在 `onRouteDidUpdate` 後動態載入。接入真實網站時，可讓既有 `plugins/story-map-client` 指向相同的延遲載入 adapter，不要同時註冊原入口和 adapter。

`assetRoots` 是 Relive 可讀取的附件白名單，與 docs 的 exclude 是兩個不同設定；請只加入要發布的目錄，不要直接設為整個 Vault。網站忽略的私人資料夾也不應加入此白名單。範例使用獨立 `media/`；實際網站可使用公開筆記下的附件目錄。

### 路徑、圖片與建置

資產解析順序是文章相對路徑、Vault 根目錄相對路徑。`/media/ride.gpx` 表示 Vault 根目錄，不是網站根目錄。`[[ride.gpx]]` 這類短檔名可在指定 `assetRoots` 內搜尋；找到多個同名檔案時要求改用完整路徑，不猜選哪個。禁止讀取 Vault 外或白名單外的檔案，也檢查 symlink 的實際位置。

建置時讀取 GPX 與本機圖片 EXIF，將軌跡資料編入頁面。本機照片由 Docusaurus bundler 處理 URL、hash、`baseUrl` 與小圖內嵌，不往 Vault 的 `static/` 寫入產物。網站切頁會清理播放器；沒有 Relive 的頁面不載入 Relive 地圖與樣式，SSR 不執行 Leaflet。

遠端照片預設保留網址，不在建置時抓取 EXIF；請在區塊補上 `time` 或 `lat` / `lon`，或把照片存為本機附件以取得 EXIF。遠端 GPX 預設禁止，必要時傳入 `allowRemote: true`。照片缺失會顯示警告，GPX 缺失會使建置失敗並指出文章。圖片採原檔發布，包含原有 EXIF；bundle 模式請使用 JPEG、PNG、WebP、GIF 或 AVIF，HEIC 請先轉檔。

開發中若只修改 GPX 或照片 EXIF，請清除 Docusaurus cache 後重新建置，以更新內嵌資料；目前尚未支援這些附件的即時重新解析。舊版直接使用 `remark` 的 `assetMode: 'static'` 仍保留，需自行指定 `staticDir` 和 `baseUrl`；新網站建議使用整合入口的 bundle 模式。

```sh
npm run vault:build
npm run vault:serve
# 開啟 /vault/backpacker/ride/，測試 docs + StoryMap + Relive
# /vault/life/2026/10/29/ride/ 與 /vault/news/2026/10/29/ride/ 測試 blog
# /vault/album/ 測試 album；/vault/moco/plain/ 為沒有地圖的一般筆記
```

## 程式結構

- `src/core.js`：YAML、GPX、距離／時間進度、相片定位，兩端共用。
- `src/load.js`：EXIF 與 host 提供的資產讀取器。
- `src/player.js`：Leaflet 播放器，回傳清理函式。
- `src/obsidian.ts`：Obsidian code block 與 Vault adapter。
- `src/remark.js`：Docusaurus MDX AST 與靜態資產處理。
- `src/docusaurus.cjs`、`src/client.js`：網站客戶端載入與換頁生命週期。
- `test/`：解析、配對、資產限制、MDX 編譯測試。

與 StoryMap 的 Leaflet 模式保持類似分層，但沒有依賴 StoryMap 私有模組；後續可將播放器整合為其第三種 host。

## 邊界與後續

目前是可建置的第一版。Google 3D 需要使用者 API key，尚未以真實 key 驗證；未實作影片／音樂匯出、海拔圖、Vault 資產修改後即時刷新、離線地圖與發布精靈。超大型 GPX 每幀繪製可能較慢，跨國際換日線的地圖繪製尚未調整 world wrapping。地圖使用 OpenStreetMap 公開圖磚，需要網路；正式流量請確認圖磚服務使用政策並規劃供應商設定。

參考： [Obsidian Markdown post processing](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Plugins/Editor/Markdown%20post%20processing.md)、[Docusaurus MDX plugins](https://docusaurus.io/docs/markdown-features/plugins)、[Docusaurus client modules](https://docusaurus.io/docs/advanced/client)、[Leaflet API](https://leafletjs.com/reference.html)。


## 時間軸與自訂事件

播放器下方時間軸顯示起點、終點與中間時刻。拖曳或使用鍵盤左右鍵可調整進度；點選照片圓點／事件菱形會暫停並跳到該位置。時間依 `timezoneOffset` 顯示，預設仍為 `+08:00`；無完整 GPX 時間時，顯示回放時間，不冒充拍攝時刻。

照片與事件在地圖上以座標錨定的 popup 呈現，底下僅保留縮圖與事件捷徑。沒有位置資訊的照片會標示「未定位」，使用目前播放位置作為顯示位置，不將它視為已配對。

```yaml
events:
  - at: '00:02:00'
    title: 第一座橋
    text: 停下來喝水。
  - time: '2026-10-29T07:08:00+08:00'
    title: 折返點
    text: 可以看到整片河岸。
  - progress: 0.9
    title: 快到終點了
    lat: 25.068
    lon: 121.513
```

每筆需要 `title`，並擇一提供 `at`（從 GPX 起點經過的 HH:MM:SS）、`time`（絕對日期時間）、`progress`（0–1）。可附 `text` 與成對的 `lat`／`lon`，未填座標時由軌跡內插。`at`、`time` 需要完整單調的 GPX 時間，超出範圍會報錯。文字以純文字呈現，不執行 HTML。

## MapLibre 3D（免 API key）

播放器的「地圖」選單可切換 Leaflet 2D 與 MapLibre 3D；切換保留時間軸進度並暫停播放。預設使用 2D，選擇 3D 才下載 MapLibre 引擎；也可在區塊設定自動載入：

```yaml
renderer: maplibre-3d
```

MapLibre 搭配 [OpenFreeMap](https://openfreemap.org/) 向量底圖／建築輪廓及 [Mapterhorn](https://mapterhorn.com/) 地形，不需要註冊、API key 或 Google 帳務。可旋轉、傾斜、縮放、播放軌跡與點選照片，地形倍率為真實高度 1 倍。底圖隨網站深淺色或 Obsidian 主題切換；照片保留原色。道路和建築是地圖資料，不是 Google 式寫實攝影城市。

需要網路與 WebGL，資料覆蓋、精度及公共服務可用性依供應商而異；保留地圖右上角署名。初始化失敗、逾時或 WebGL／圖磚錯誤會回到 2D；載入期間也可選回 2D 取消。GPX 與照片由播放器在本機處理，不上傳給底圖服務；服務仍會收到視野範圍的圖磚請求。

網站與 Docusaurus 會延後載入 3D JavaScript。Obsidian 為單檔插件，MapLibre 程式與 worker 已打包進 `main.js`，樣式包含於 `styles.css`，不在執行時從 CDN 下載程式。新增依賴使用 MapLibre 5.24.0 的內含 worker 發行格式，以相容 Vite、Webpack 與 Obsidian 的 CJS 單檔建置。

直接使用 `@kywk/relive/player` 的自訂網站，除 Leaflet 與 Relive 樣式外，需載入 `maplibre-gl/dist/maplibre-gl.css`。Docusaurus plugin 與 Obsidian 建置會自動處理。

已驗證 Chromium 的桌面／平板／手機視窗、Docusaurus 發布頁面、播放／照片／縮放／主題切換、2D 進度保留、供應商失敗與載入取消；單元測試涵蓋分段、倒帶、增量更新與 WebGL 錯誤。Obsidian 單檔建置已通過，實際 Electron／手機硬體尚待驗證。

## Google 寫實 3D（選配）

以 Google Maps JavaScript API 的 `Map3DElement`、`Polyline3DElement` 與 `PopoverElement` 整合 Google 的衛星／寫實 3D 地圖，提供傾斜視角、軌跡線、跟隨鏡頭與地圖對話框。這是 Google Maps 官方嵌入式 3D API，並非把 Google Earth 網頁塞進 iframe；可用影像與建築細節依區域覆蓋而異。

1. Google Cloud 專案需啟用帳務及 Maps JavaScript API，建立適用於使用環境的 key。
2. Obsidian：到「設定 → Relive」填寫 Google Maps API key，再重新開啟筆記。
3. Docusaurus：將 plugin 設定改成下列形式；key 是瀏覽器端 key，會進入客戶端 bundle，請設定 API 與網站來源限制。

```js
plugins: [[path.resolve('../src/docusaurus.cjs'), {
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
}]],
```

設定 key 後，在「地圖」選單選擇「Google 3D」才載入 Google 程式；也可在 `relive` 區塊加入 `renderer: google-3d`，於開啟時自動嘗試。API key 不放在 Markdown 區塊中。沒有 key 或載入失敗會保留 Leaflet 2D；返回 2D 保留目前進度。Obsidian 的 `app://` 來源與 CSP、WebGL 支援需在實際環境驗證，不能假設網站的 referrer 限制也適用於桌面插件。不要為測試關閉 key 限制。

本次已驗證無 key 提示、共用時間軸與網站建置；未提供使用者 key，因此尚未驗證 Google 實景載入、帳務或桌面端授權。官方參考：[3D Overview](https://developers.google.com/maps/documentation/javascript/3d/overview)、[3D shapes](https://developers.google.com/maps/documentation/javascript/3d/shapes-lines)、[Popover API](https://developers.google.com/maps/documentation/javascript/reference/3d-map-draw#PopoverElement)。


## 播放器外觀與相片集錦

時間軸與播放控制疊在地圖底部，採影片播放器式排列：事件標記、可拖曳進度、時刻刻度與播放／倍速／跟隨。控制列使用固定深色漸層，讓文字在任何地圖背景上都可閱讀；強調色跟隨主題。Leaflet 版權標示放在地圖右上方，Google 3D 則保留底部原生標示空間。

下方「相片集錦」可點選收合／展開；「縮圖大小」滑桿可在 72–220px 間調整。相片較多時可以水平捲動，點選縮圖仍會跳到對應時間並開啟地圖 popup。

CSS 優先使用 Obsidian 的 `--background-primary`、`--background-secondary`、`--text-normal`、`--text-muted`、`--interactive-accent`、`--background-modifier-border`、`--font-interface` 與圓角變數，不再硬編碼兩組明暗主題。地圖路線、popup、縮圖與面板隨變數即時更新。Docusaurus 使用 `--ifm-*` 作為後備；一般網頁使用中性色後備。底圖影像本身不會被 CSS 強制反色。


## GPX 主時間軸與事件停留

路線由 GPX 的全部軌跡點依原順序繪製，播放位置在相鄰 GPX 點之間內插；照片／景點只提供停留事件，不參與連線或改寫路徑。時間軸範圍由 GPX 起迄時間決定。GPX 時間不完整時仍依全部 GPX 點與累積距離移動，顯示回放時間並非偽造實際時刻。

```yaml
duration: 60
stopDuration: 3
```

`duration` 是壓縮後沿完整 GPX 移動所需秒數，不含停留。`stopDuration` 是每組事件的實際停留秒數（0–60，預設 3；0 表示不停留），不受倍速影響。到達事件時，位置與 GPX 時鐘同時停止；對話框顯示完畢後關閉並自動續播。同一時間的照片與景點合併展示，只停一次。

手動暫停會凍結停留倒數，按播放繼續；拖曳會取消當次停留，往回拖後會重新觸發前方事件。點選縮圖／景點仍維持手動暫停，避免正在閱讀時突然移動。高速播放或掉幀也不會跳過中途事件；終點事件顯示完畢才結束。

滑鼠移出地圖播放器 2 秒後，時間軸與控制列淡出；移回立即顯示。拖曳中或鍵盤焦點位於控制列時保持顯示，觸控操作不套用滑鼠離開計時。

## 效能與量測

已針對 10 萬點 GPX 做真實 Leaflet 與資料處理基準測試。播放器採保留所有軌跡點的分塊更新、單次鏡頭平移、較小的瀏覽器依賴與停留期間的 DOM 更新去重。量測方法、前後數據、重跑命令與限制請見 [效能報告](docs/performance.md)。

## Release CI/CD

維護者：GitHub／npm 帳號均為 `kywk`。Repository 為 [kywk/relive](https://github.com/kywk/relive)。本次發行目標是 [GitHub Release 0.1.0](https://github.com/kywk/relive/releases/tag/0.1.0)，由 Actions 建置與驗證後發布附件；npm registry 與 Obsidian Community 上架另行處理。專案與 CLI 採 MIT 授權。

| 產品 | 安裝識別 | 發行 tag | Workflow |
| --- | --- | --- | --- |
| GitHub Release／Obsidian 安裝包 | plugin ID `relive`，另附兩個 npm tarball | `0.1.0` | `release-obsidian.yml` |
| Docusaurus／共用 library | `@kywk/relive` | `npm-v0.1.0` | `release-npm.yml` |
| GPX Slim CLI | `@kywk/gpx-slim`，命令 `gpx-slim` | `gpx-slim-v0.1.0` | `release-gpx-slim.yml` |

GitHub 發行流程同時建置網站、測試兩個 tarball，附 SHA256SUMS 與 artifact attestations，並使用 `docs/releases/<version>.md` 作為 release notes；建立新版本 tag 前須先備妥該檔案。此流程不會執行 npm publish 或提交 Community。

Obsidian 從 GitHub Release 下載 `main.js`、`manifest.json`、`styles.css`，不透過 npm 安裝。根目錄 package 提供網站 library；CLI 在 `packages/gpx-slim`，保留自己的 lockfile 和獨立版本。

### 發行前驗證

在 repository 根目錄執行：

```sh
npm ci
npm --prefix packages/gpx-slim ci
npm test
npm run build
node scripts/check-release.mjs check --assets
npm run site:build
npm run vault:build
npm run release:pack
npm run gpx:release:check
npm run gpx:release:pack
```

網站套件產生於 `.release/docusaurus/`，CLI 產生於 `.release/gpx-slim/`，兩者互不清除。網站 tarball 會在隔離消費端安裝並驗證 ESM／CommonJS 入口；CLI 會先跑 prepack 測試，再以空快取、離線 npx 驗證分析、實際瘦身與拒絕覆寫。workflow 發布的就是驗證過的 tarball。CI 另外在 Node 22／24 驗證 CLI，並保存 `gpx-slim-node-*` 與 Obsidian artifact。

### 首次上架

1. 建立公開 `kywk/relive` repository 並提交原始碼、LICENSE、manifest、versions 與兩份 lockfile；確認 GitHub Actions 通過。
2. 登入 npm 的 `kywk` 帳號，確認兩個 scoped 名稱可發布。首次發布／建立套件依 [npm Trusted Publishing 官方流程](https://docs.npmjs.com/trusted-publishers/) 辦理；如需本機首次發布，使用已驗證的 tarball，完成 npm 要求的登入／2FA。
3. 在每個 npm 套件設定各自的 GitHub trusted publisher：owner `kywk`、repository `relive`；`@kywk/relive` 綁定 `release-npm.yml`，`@kywk/gpx-slim` 綁定 `release-gpx-slim.yml`，允許 publish。現有 workflow 沒有指定 environment，設定時也留空。使用 GitHub-hosted runner、Node 24、npm 12.2.0 與 OIDC，無需長效 npm token。
4. 推送各產品對應 tag。若首次 npm 版本已手動發布，後續遞增版本再推 tag，避免重發既有版本。Obsidian tag 必須是純 `x.y.z`。
5. GitHub Release 成功後，依 [Obsidian 官方上架流程](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin) 登入 Community directory、連結 GitHub、提交插件並處理審核結果。CI 成功不代表 Community 上架完成。

### 後續版本

根套件與 Obsidian 維持版本一致：更新根 `package.json`、`package-lock.json`、`manifest.json`，並在 `versions.json` 增加版本與最低 Obsidian 版本對照。CLI 只需同步子套件的 package 與 lockfile。先驗證再提交及標記 tag；既有版本與 tag 保持不變。Obsidian workflow 支援手動重跑既有 tag，會比較已存在附件且不覆寫。

發布完成後的使用方式：

```sh
npm install @kywk/relive
npx @kywk/gpx-slim ride.gpx --analyze
npx @kywk/gpx-slim ride.gpx --preset balanced --reduction 70
```

在正式上架前，可直接驗證本機 CLI tarball：

```sh
npx --offline --yes --package ./.release/gpx-slim/kywk-gpx-slim-0.1.0.tgz gpx-slim --help
```
