import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const browser=JSON.parse(await readFile('docs/performance/slim-browser.json','utf8'));
const quality=JSON.parse(await readFile('docs/performance/slim-quality.json','utf8'));
if(browser.rows.length!==30)throw Error('Benchmark incomplete: expected 30 trials');
if(browser.rows.some(r=>r.errors.length))throw Error('Browser errors present');
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const f=(n,d=2)=>n.toFixed(d);
const summary=quality.map(q=>{
 const runs=browser.rows.filter(r=>r.scenario===q.scenario&&r.variant===q.variant);
 const m=fn=>median(runs.map(fn));
 return {...q,firstFrameReadyMs:m(r=>r.firstFrameReadyMs),firstFrameRange:runs.map(r=>r.firstFrameReadyMs),mountSyncMs:m(r=>r.mountSyncMs),jsonParseMs:m(r=>r.jsonParseMs),heapMiB:m(r=>r.mountedHeapDeltaBytes/1048576),afterHeapMiB:m(r=>r.afterPlaybackHeapDeltaBytes/1048576),playP95Ms:m(r=>r.playback.updateMs.p95),followP95Ms:m(r=>r.follow.updateMs.p95),followFrameP95Ms:m(r=>r.follow.frameMs.p95),followSlowFrames:runs.map(r=>r.follow.framesOver32ms),zoomP95Ms:m(r=>r.zoom.syncMs.p95),zoomFrameP95Ms:m(r=>r.zoom.frameReadyMs.p95)};
});
const hashes={};for(const p of ['scripts/perf/slim-fixtures.mjs','scripts/perf/slim-browser.js','scripts/perf/slim-run.mjs','src/leaflet-map.js','src/trail.js','src/track.js','packages/gpx-slim/src/index.js'])hashes[p]=createHash('sha256').update(await readFile(p)).digest('hex');
await writeFile('docs/performance/slim-summary.json',JSON.stringify({browser:browser.browser,cpu:browser.cpu,sourceHashes:hashes,rows:summary},null,2)+'\n');
let md=`# GPX 瘦身：瀏覽器效能與定位差異（2026-10-29）

## 結論與網站建議

網站明確啟用瘦身時，建議 \`gpxSlim: {preset: 'gentle'}\`，先不指定 targetReduction。gentle 在本次兩組合成軌跡取得大部分記憶體、播放與縮放改善，路線幾何最大偏差約 3 m，60 個時間照片取樣的最大位置偏差約 6.55 m。balanced／aggressive 的額外速度收益有限，時間內插與照片位置誤差更大。

預設不啟用瘦身仍應保留：省略 gpxSlim／false 使用完整資料。純 GPS 照片、停留期間照片、折返重訪位置或精確運動統計，不宜無條件套用任何瘦身強度。尤其現有最近軌跡點配對可能改變照片播放時刻；需要先在原始軌跡完成配對並保留必要錨點，才適合對這些內容預設啟用。這次只量測，不改寫照片配對算法。

\`gpxSlim: true\` 仍保留現有 balanced 語意；推薦設定明確指定 gentle，以免將新建議誤認為已修改 API 預設。balanced + targetReduction:70 是較保守的位置／取樣保留選項，但不是效能最佳解，高密度案例仍保留 3 萬點。aggressive 不建議作為旅程照片網站預設。

## 測試條件與可重現範圍

- 實際 headless Chromium ${browser.browser}，${browser.cpu}，${browser.platform}/${browser.arch}；Playwright 1.62.1。桌面 viewport 1000×650、地圖 900×500、DPR 1；沒有 CPU 降速。
- 兩組可重現合成軌跡：trail20k 為 20,000 點、1 Hz；dense100k 為 100,000 點、10 Hz。都有變速、彎道／重訪、兩次停留、0.2 m 級定位抖動、高度變化與兩段不連接軌跡。不是實際裝置 GPX，也不是對所有旅程的代表性抽樣。
- 五組：完整、gentle、balanced、aggressive、balanced + targetReduction:70。每組 3 次、交錯次序，共 30 個獨立 browser context；每次關閉／開啟跟隨各播放 120 幀，再做 12 次非動畫縮放，放大 0–3 級後返回。播放用固定進度走完整旅程，是 renderer 壓力測試，不是每秒真實運動的即時播放。
- 使用正式 createLeafletMap、sampleTrack 與分塊 trail；測試 bundle 僅注入取得 map 的入口，並將 tileLayer 換成空圖層。排除網路圖磚，仍使用真實 Leaflet SVG 投影與渲染。60 個照片標記使用相同資料，沒有圖片下載／解碼、popup 操作或完整播放器控制列成本。
- 每次先載入程式再測量。首次可顯示時間是同步 mount 到後續兩次 RAF 的時間代理，含等待顯示幀，**不是 FCP、LCP 或實際 GPU 完工時間**；不含網路與 JSON 解析。另列 mount 同步耗時及 JSON 解析時間。
- 記憶體是 CDP 強制 GC 後 used JS heap，相對載入程式但尚未讀取旅程的基準增量；含旅程與地圖資料，**不含 GPU、瀏覽器總 RSS 或瞬間峰值**。強制 GC 在計時區段外。
- 表格取 3 輪統計值的中位數；P95 欄先算各輪 P95，再取中位數，並非合併所有樣本後的 P95。沒有宣稱統計顯著性。無 browser pageerror。

## 瀏覽器結果

單位：時間 ms，記憶體 MiB。完整數據含每輪範圍與 RAF 間隔，見 JSON。

| 軌跡 | 設定 | 點數 | 首次幀就緒 | mount 同步 | JSON 解析 | heap 增量 | 播放更新 P95 | 跟隨更新 P95 | 縮放同步 P95 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
`;
for(const r of summary)md+=`| ${r.scenario} | ${r.variant} | ${r.points} | ${f(r.firstFrameReadyMs)} | ${f(r.mountSyncMs)} | ${f(r.jsonParseMs)} | ${f(r.heapMiB)} | ${f(r.playP95Ms)} | ${f(r.followP95Ms)} | ${f(r.zoomP95Ms)} |\n`;
md+=`
2 萬點首次幀就緒有明顯波動：full 的三輪為 ${summary[0].firstFrameRange.map(v=>f(v,1)).join(' / ')} ms。不能據此宣稱所有小型軌跡的首次顯示都會更快；10 萬點的初始化、heap 與地圖操作差距更有實務意義。

| 軌跡 | 設定 | 跟隨 RAF 間隔 P95（ms） | 3 輪各超過 32 ms 幀數／119 | 縮放後幀就緒 P95（ms） | 播放縮放後 heap 增量（MiB） |
| --- | --- | ---: | --- | ---: | ---: |
`;
for(const r of summary)md+=`| ${r.scenario} | ${r.variant} | ${f(r.followFrameP95Ms)} | ${r.followSlowFrames.join(' / ')} | ${f(r.zoomFrameP95Ms)} | ${f(r.afterHeapMiB)} |\n`;
md+=`
## 路線與時間位置

幾何偏差：每個原始點到其時間前後保留點構成線段的距離，在本測區使用公尺平面近似；分段間不連線。這是對應邊的偏差，不是完整雙向 Hausdorff 距離。時間位置偏差：對原始每個時間戳，對比完整與瘦身軌跡 sampleTrack 的位置。照片以同一組 60 個合成位置測試，時間配對與純 GPS 配對分開計算。

| 軌跡 | 設定 | 幾何 P95 / 最大（m） | 同時刻位置 P95 / 最大（m） | 時間照片位置 P95 / 最大（m） | 距離變化 |
| --- | --- | ---: | ---: | ---: | ---: |
`;
for(const r of summary)md+=`| ${r.scenario} | ${r.variant} | ${f(r.geometricErrorMeters.p95)} / ${f(r.geometricErrorMeters.max)} | ${f(r.timePositionErrorMeters.p95)} / ${f(r.timePositionErrorMeters.max)} | ${f(r.timedPhotoPositionErrorMeters.p95)} / ${f(r.timedPhotoPositionErrorMeters.max)} | ${f(r.distanceChangePercent)}% |\n`;
md+=`
10 Hz 案例的原始距離受到每點定位抖動累積影響，刪點後距離變化很大。表格是「相對原始計算結果的變化」，不代表相對真實路程的誤差；原始 GPX 並非地面真值。

## GPS 照片：標記座標與播放時刻是不同問題

現有 matchPhoto 對純 GPS 照片保留照片本身的 lat/lon，因此照片標記座標偏差在所有組都是 0 m；改變的是配對到最近保留軌跡點的 progress，以及游標跳到的位置。有拍攝時間的照片，其 progress 不受起迄時間保持不變的瘦身影響，但沿軌跡內插的位置仍可能不同。

| 軌跡 | 設定 | 移動中 GPS 照片時間位移 P95 / 最大（s） | 移動中游標偏差 P95 / 最大（m） | 停留照片最大時間位移（s） |
| --- | --- | ---: | ---: | ---: |
`;
for(const r of summary){const g=r.gpsPhotosByPhase;md+=`| ${r.scenario} | ${r.variant} | ${f(g.moving.timeShiftSeconds.p95)} / ${f(g.moving.timeShiftSeconds.max)} | ${f(g.moving.cursorErrorMeters.p95)} / ${f(g.moving.cursorErrorMeters.max)} | ${f(g.pause.timeShiftSeconds.max)} |\n`;}
md+=`
每組 56 張移動中、4 張停留照片。停留區的位置偏差很小仍可能出現數分鐘時間位移，因為同一位置本來就對應多個時刻；純 GPS 無法確定拍攝時間。移動中的折返／重訪也可能匹配到其他時段。不能用「路線偏差小於幾公尺」保證照片時間可靠。建議有時間的照片保留 EXIF 時區；只有 GPS 且需要精確順序的頁面先關閉 gpxSlim。

## 體積與建置成本

| 軌跡 | 設定 | journey JSON gzip（KiB） | 瘦身計算（ms，單次 Node） |
| --- | --- | ---: | ---: |
`;
for(const r of summary)md+=`| ${r.scenario} | ${r.variant} | ${f(r.journeyGzipBytes/1024)} | ${f(r.slimMs)} |\n`;
md+=`
這是 journey JSON 單獨 gzip，不是 Docusaurus 整頁或 JS bundle 大小。Node 瘦身時間只做單次觀測，未暖機／重複，不能與瀏覽器渲染相加當成端到端時間。限制比例需要多次搜尋，dense100k balanced70 本次約 4.4 秒，純 preset 約 0.6–1.0 秒。發佈前瘦身把這項成本留在建置端；本測試未測瀏覽器下載完整 GPX 後的即時瘦身或 Web Worker。

## 重跑與證據

\`\`\`sh
npm ci
npm run perf:slim:prepare
node scripts/perf/slim-photo-audit.mjs
# 執行環境需有 Playwright 及其 Chromium；可用現有工具安裝，或：
# npm install --no-save --package-lock=false playwright@1.62.1
# npx playwright install chromium
npm run perf:slim:browser
node scripts/perf/slim-report.mjs
\`\`\`

若使用外部 Playwright，設 PLAYWRIGHT_MODULE 為其 index.mjs 絕對路徑；使用指定 Chromium 時設 CHROMIUM_PATH 為執行檔。runner 自行啟動僅綁定 127.0.0.1 的暫時 HTTP server，關閉瀏覽器後停止服務。需要環境允許本機 server 與 Chromium 啟動。

- [原始瀏覽器 30 輪](performance/slim-browser.json)
- [幾何／照片逐組數據](performance/slim-quality.json)
- [彙整與來源 SHA-256](performance/slim-summary.json)
- [完整軌跡截圖](performance/slim-screenshots/trail20k-full.png)、[gentle 截圖](performance/slim-screenshots/trail20k-gentle.png)。截圖用於確認實際地圖與標記存在；概覽比例無法判定公尺級偏差，以上數值使用座標量測。

尚未涵蓋手機、真實裝置 GPX、Google 3D、Obsidian Electron、底圖網路、照片解碼、大量同頁播放器與長時間 GC。正式全面啟用前，應用具代表性的真實旅程複驗；本次結果足以支持「網站選用 gentle、對純 GPS 照片保留明確例外」，不足以支持所有內容自動瘦身。
`;
await writeFile('docs/gpx-slim-performance.md',md);
console.log(JSON.stringify(summary.map(r=>({scenario:r.scenario,variant:r.variant,first:r.firstFrameReadyMs,heap:r.heapMiB,play:r.playP95Ms,follow:r.followP95Ms,zoom:r.zoomP95Ms})),null,2));
