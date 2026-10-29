# GPX 瘦身：瀏覽器效能與定位差異（2026-10-29）

## 結論與網站建議

網站明確啟用瘦身時，建議 `gpxSlim: {preset: 'gentle'}`，先不指定 targetReduction。gentle 在本次兩組合成軌跡取得大部分記憶體、播放與縮放改善，路線幾何最大偏差約 3 m，60 個時間照片取樣的最大位置偏差約 6.55 m。balanced／aggressive 的額外速度收益有限，時間內插與照片位置誤差更大。

預設不啟用瘦身仍應保留：省略 gpxSlim／false 使用完整資料。純 GPS 照片、停留期間照片、折返重訪位置或精確運動統計，不宜無條件套用任何瘦身強度。尤其現有最近軌跡點配對可能改變照片播放時刻；需要先在原始軌跡完成配對並保留必要錨點，才適合對這些內容預設啟用。這次只量測，不改寫照片配對算法。

`gpxSlim: true` 仍保留現有 balanced 語意；推薦設定明確指定 gentle，以免將新建議誤認為已修改 API 預設。balanced + targetReduction:70 是較保守的位置／取樣保留選項，但不是效能最佳解，高密度案例仍保留 3 萬點。aggressive 不建議作為旅程照片網站預設。

## 測試條件與可重現範圍

- 實際 headless Chromium 156.0.8078.4，Apple M1，darwin/arm64；Playwright 1.62.1。桌面 viewport 1000×650、地圖 900×500、DPR 1；沒有 CPU 降速。
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
| trail20k | full | 20000 | 32.00 | 29.30 | 8.20 | 5.43 | 0.50 | 3.90 | 16.20 |
| trail20k | gentle | 2638 | 37.20 | 22.10 | 1.40 | 1.07 | 0.40 | 1.80 | 5.60 |
| trail20k | balanced | 1494 | 29.00 | 22.80 | 0.90 | 0.76 | 0.40 | 1.30 | 3.50 |
| trail20k | aggressive | 788 | 22.80 | 20.50 | 0.50 | 0.58 | 0.40 | 1.10 | 2.70 |
| trail20k | balanced70 | 6001 | 39.70 | 24.40 | 3.00 | 1.93 | 0.40 | 2.50 | 7.50 |
| dense100k | full | 100000 | 71.70 | 64.20 | 33.70 | 25.60 | 0.70 | 12.40 | 75.10 |
| dense100k | gentle | 1373 | 32.40 | 22.60 | 0.80 | 0.73 | 0.40 | 1.30 | 3.50 |
| dense100k | balanced | 778 | 29.00 | 20.90 | 0.50 | 0.58 | 0.40 | 1.20 | 2.70 |
| dense100k | aggressive | 411 | 32.70 | 20.80 | 0.30 | 0.46 | 0.40 | 0.90 | 1.80 |
| dense100k | balanced70 | 30000 | 50.70 | 35.00 | 13.80 | 7.95 | 0.50 | 5.30 | 21.40 |

2 萬點首次幀就緒有明顯波動：full 的三輪為 113.7 / 26.1 / 32.0 ms。不能據此宣稱所有小型軌跡的首次顯示都會更快；10 萬點的初始化、heap 與地圖操作差距更有實務意義。

| 軌跡 | 設定 | 跟隨 RAF 間隔 P95（ms） | 3 輪各超過 32 ms 幀數／119 | 縮放後幀就緒 P95（ms） | 播放縮放後 heap 增量（MiB） |
| --- | --- | ---: | --- | ---: | ---: |
| trail20k | full | 16.70 | 0 / 0 / 0 | 34.10 | 7.68 |
| trail20k | gentle | 16.70 | 0 / 0 / 0 | 34.60 | 1.53 |
| trail20k | balanced | 16.70 | 0 / 0 / 0 | 33.70 | 1.11 |
| trail20k | aggressive | 16.80 | 0 / 0 / 0 | 34.70 | 0.85 |
| trail20k | balanced70 | 16.80 | 0 / 0 / 0 | 33.90 | 2.75 |
| dense100k | full | 16.70 | 0 / 0 / 0 | 83.90 | 35.90 |
| dense100k | gentle | 16.80 | 0 / 0 / 0 | 33.50 | 1.07 |
| dense100k | balanced | 16.70 | 0 / 0 / 0 | 34.70 | 0.86 |
| dense100k | aggressive | 16.70 | 0 / 0 / 0 | 33.60 | 0.72 |
| dense100k | balanced70 | 16.80 | 0 / 0 / 0 | 34.10 | 11.21 |

## 路線與時間位置

幾何偏差：每個原始點到其時間前後保留點構成線段的距離，在本測區使用公尺平面近似；分段間不連線。這是對應邊的偏差，不是完整雙向 Hausdorff 距離。時間位置偏差：對原始每個時間戳，對比完整與瘦身軌跡 sampleTrack 的位置。照片以同一組 60 個合成位置測試，時間配對與純 GPS 配對分開計算。

| 軌跡 | 設定 | 幾何 P95 / 最大（m） | 同時刻位置 P95 / 最大（m） | 時間照片位置 P95 / 最大（m） | 距離變化 |
| --- | --- | ---: | ---: | ---: | ---: |
| trail20k | full | 0.00 / 0.00 | 0.00 / 0.00 | 0.00 / 0.00 | 0.00% |
| trail20k | gentle | 1.62 / 2.98 | 3.22 / 13.78 | 3.98 / 6.55 | -2.46% |
| trail20k | balanced | 3.86 / 7.86 | 7.65 / 29.67 | 7.23 / 9.36 | -4.36% |
| trail20k | aggressive | 10.97 / 19.89 | 17.75 / 48.36 | 15.44 / 18.98 | -9.56% |
| trail20k | balanced70 | 0.28 / 0.45 | 1.09 / 4.26 | 1.65 / 3.92 | -1.29% |
| dense100k | full | 0.00 / 0.00 | 0.00 / 0.00 | 0.00 / 0.00 | 0.00% |
| dense100k | gentle | 0.98 / 1.50 | 3.26 / 12.51 | 2.51 / 4.53 | -40.60% |
| dense100k | balanced | 2.88 / 3.98 | 7.66 / 28.88 | 6.69 / 14.78 | -41.30% |
| dense100k | aggressive | 8.06 / 12.00 | 13.50 / 40.61 | 14.40 / 18.15 | -43.54% |
| dense100k | balanced70 | 0.25 / 0.48 | 0.83 / 5.84 | 0.40 / 4.96 | -22.64% |

10 Hz 案例的原始距離受到每點定位抖動累積影響，刪點後距離變化很大。表格是「相對原始計算結果的變化」，不代表相對真實路程的誤差；原始 GPX 並非地面真值。

## GPS 照片：標記座標與播放時刻是不同問題

現有 matchPhoto 對純 GPS 照片保留照片本身的 lat/lon，因此照片標記座標偏差在所有組都是 0 m；改變的是配對到最近保留軌跡點的 progress，以及游標跳到的位置。有拍攝時間的照片，其 progress 不受起迄時間保持不變的瘦身影響，但沿軌跡內插的位置仍可能不同。

| 軌跡 | 設定 | 移動中 GPS 照片時間位移 P95 / 最大（s） | 移動中游標偏差 P95 / 最大（m） | 停留照片最大時間位移（s） |
| --- | --- | ---: | ---: | ---: |
| trail20k | full | 0.00 / 0.00 | 0.00 / 0.00 | 0.00 |
| trail20k | gentle | 26.00 / 297.00 | 15.84 / 22.45 | 543.00 |
| trail20k | balanced | 24.00 / 222.00 | 22.67 / 27.68 | 543.00 |
| trail20k | aggressive | 61.00 / 226.00 | 28.38 / 56.82 | 543.00 |
| trail20k | balanced70 | 9.00 / 75.00 | 5.23 / 17.12 | 543.00 |
| dense100k | full | 0.00 / 0.00 | 0.00 / 0.00 | 0.00 |
| dense100k | gentle | 8.30 / 68.30 | 11.58 / 16.27 | 271.60 |
| dense100k | balanced | 25.10 / 81.80 | 20.85 / 42.59 | 271.60 |
| dense100k | aggressive | 71.90 / 103.70 | 25.82 / 42.59 | 271.60 |
| dense100k | balanced70 | 0.60 / 13.70 | 1.25 / 2.19 | 271.60 |

每組 56 張移動中、4 張停留照片。停留區的位置偏差很小仍可能出現數分鐘時間位移，因為同一位置本來就對應多個時刻；純 GPS 無法確定拍攝時間。移動中的折返／重訪也可能匹配到其他時段。不能用「路線偏差小於幾公尺」保證照片時間可靠。建議有時間的照片保留 EXIF 時區；只有 GPS 且需要精確順序的頁面先關閉 gpxSlim。

## 體積與建置成本

| 軌跡 | 設定 | journey JSON gzip（KiB） | 瘦身計算（ms，單次 Node） |
| --- | --- | ---: | ---: |
| trail20k | full | 877.13 | 0.00 |
| trail20k | gentle | 124.98 | 101.01 |
| trail20k | balanced | 72.75 | 91.47 |
| trail20k | aggressive | 40.30 | 80.30 |
| trail20k | balanced70 | 275.55 | 414.15 |
| dense100k | full | 3932.20 | 0.01 |
| dense100k | gentle | 62.55 | 612.39 |
| dense100k | balanced | 37.00 | 910.02 |
| dense100k | aggressive | 20.99 | 1019.16 |
| dense100k | balanced70 | 1235.15 | 4399.68 |

這是 journey JSON 單獨 gzip，不是 Docusaurus 整頁或 JS bundle 大小。Node 瘦身時間只做單次觀測，未暖機／重複，不能與瀏覽器渲染相加當成端到端時間。限制比例需要多次搜尋，dense100k balanced70 本次約 4.4 秒，純 preset 約 0.6–1.0 秒。發佈前瘦身把這項成本留在建置端；本測試未測瀏覽器下載完整 GPX 後的即時瘦身或 Web Worker。

## 重跑與證據

```sh
npm ci
npm run perf:slim:prepare
node scripts/perf/slim-photo-audit.mjs
# 執行環境需有 Playwright 及其 Chromium；可用現有工具安裝，或：
# npm install --no-save --package-lock=false playwright@1.62.1
# npx playwright install chromium
npm run perf:slim:browser
node scripts/perf/slim-report.mjs
```

若使用外部 Playwright，設 PLAYWRIGHT_MODULE 為其 index.mjs 絕對路徑；使用指定 Chromium 時設 CHROMIUM_PATH 為執行檔。runner 自行啟動僅綁定 127.0.0.1 的暫時 HTTP server，關閉瀏覽器後停止服務。需要環境允許本機 server 與 Chromium 啟動。

- [原始瀏覽器 30 輪](performance/slim-browser.json)
- [幾何／照片逐組數據](performance/slim-quality.json)
- [彙整與來源 SHA-256](performance/slim-summary.json)
- [完整軌跡截圖](performance/slim-screenshots/trail20k-full.png)、[gentle 截圖](performance/slim-screenshots/trail20k-gentle.png)。截圖用於確認實際地圖與標記存在；概覽比例無法判定公尺級偏差，以上數值使用座標量測。

尚未涵蓋手機、真實裝置 GPX、Google 3D、Obsidian Electron、底圖網路、照片解碼、大量同頁播放器與長時間 GC。正式全面啟用前，應用具代表性的真實旅程複驗；本次結果足以支持「網站選用 gentle、對純 GPS 照片保留明確例外」，不足以支持所有內容自動瘦身。
