# Relive 效能量測與優化（2026-10-29）

本次針對長 GPX 的播放熱路徑、照片 GPS 配對與網站播放器載入大小。所有軌跡均為合成資料；沒有讀取或上傳私人旅程。優化保留全部 GPX 點、原有分段及時間，不以照片連線取代軌跡，也不做有損簡化。

## 量測方法

- 本機 Node.js v22.23.2，瀏覽器為 Codex 內建 Chromium。數據代表這台機器與此工作負載，不是所有裝置的 FPS 保證。
- 10 萬點單一 GPX，座標由固定公式產生，時間單調遞增。
- Node 腳本每項先暖機，再取 5 次執行的中位數。路線量測包含座標快取初始化，600 幀走完整條路線；照片配對測量 100 張僅有 GPS 的照片，未包含網路、圖片解碼或 EXIF I/O。
- 真實 Leaflet 使用 900×500 地圖，每個情境由 requestAnimationFrame 驅動 120 次更新，分別開關跟隨鏡頭，重複兩輪。記錄同步 update 耗時及相鄰 RAF 間隔；RAF 間隔包含瀏覽器排程／繪製影響，並非純 GPU 計時。地圖使用公開圖磚，網路與圖磚快取可能影響結果；每輪順序固定先舊版再新版，不能當成冷載入網路比較。
- bundle 是 esbuild minify 的獨立播放器（包含 Leaflet），不是整個 Docusaurus 網站傳輸量，也不是 Lighthouse 指標。

## 實測結果

| 項目 | 優化前 | 優化後 |
| --- | ---: | ---: |
| 路線資料更新，600 幀 | 609.92 ms | 6.29 ms |
| 600 幀提交給 renderer 的座標總數 | 30,000,601 | 177,468 |
| 100 張照片 GPS 配對 | 619.69 ms | 299.65 ms |
| 二分搜尋 10,000 次位置 | 6.08 ms | 6.25 ms |
| 獨立播放器 minified | 197,074 bytes | 164,006 bytes |
| 獨立播放器 gzip | 61,287 bytes | 49,170 bytes |

位置搜尋本來就是二分搜尋，本次沒有改動；其差異屬量測波動。路線資料更新的大幅改善不能直接換算為整個畫面的 FPS，實際 renderer 結果如下。

| 真實 Leaflet，兩輪結果範圍 | 優化前 | 優化後 |
| --- | ---: | ---: |
| 關閉跟隨：update P95 | 24.7–29.2 ms | 1.0 ms |
| 開啟跟隨：update P95 | 45.8–46.6 ms | 11.9–12.2 ms |
| 開啟跟隨：RAF 間隔 P95 | 50.0 ms | 16.8–17.0 ms |
| 開啟跟隨：119 個 RAF 間隔中超過 32 ms | 61–63 | 0 |

原始資料：[Node before](performance/before.json)、[Node after](performance/after.json)、[瀏覽器第一輪](performance/browser-run1.json)、[第二輪](performance/browser-run2.json)。

## 改動與原因

1. `trail.js` 以 256 點為一塊快取座標，相鄰塊保留共同端點。已完成塊不再每幀重建；只更新目前塊與跨越的塊。倒退會清除相應已播放塊。不同 GPX segment 絕不連線，重複時間、單點與終點仍遵循 `sampleTrack`。
2. Leaflet 的跟隨鏡頭由每幀 `panTo` 再 `panBy` 改成一次計算帶偏移的中心點並 `panTo`，保留原本畫面位置，減少地圖移動事件與重繪。
3. Google 3D adapter 共用同一分塊更新器，避免每幀重新提交全部已播放點。僅通過模擬 API 與資料測試，沒有真實 Google key，因此不宣稱 Google 3D 的效能提升數字。
4. GPS 最近點配對每個候選只算一次 Haversine 距離，取代 reduce 中反覆重算目前最佳點；同距離仍選第一個點。演算法維持精確最近軌跡點，沒有改成近似空間搜尋。
5. 將純軌跡計算拆到 `track.js`，瀏覽器播放器不再引用 YAML/XML 解析器；`core.js` 保留原公開匯出，Obsidian 仍包含必要解析功能。
6. 事件停留時不再每幀更新地圖，時鐘與停留倒數文字只在值變更時寫 DOM；照片使用非同步解碼提示，保留既有縮圖 lazy loading。這些未單獨量測，不另宣稱倍數。

## 驗證

29 項自動測試通過，包括完整軌跡邊線比對、分段缺口、重複時間、向後 seek、同塊更新上限、GPS 配對一致性，以及播放器依賴中沒有 YAML/XML/EXIF parser。Obsidian build、Docusaurus Webpack 舊範例與 Rspack 共用 Vault 範例皆通過。

瀏覽器驗證共用 Vault 的事件停留與繼續播放、照片 popup，沒有 console error。重繪資料測試不是截圖像素比對；Google 真實 3D、手機、Obsidian Electron 的長時間播放仍未做效能量測。

## 重跑

```sh
npm ci
npm test
npm run perf
npm run perf:browser
python3 -m http.server 4175 --bind 127.0.0.1 --directory .perf
```

開啟 `http://127.0.0.1:4175/` 按 Run benchmark。要比較舊版，可傳入具有 `src/` 與已安裝依賴的舊版 checkout：

```sh
node scripts/perf/measure.mjs /path/to/baseline
node scripts/perf/browser.mjs /path/to/baseline
```

本次基準是修改前的 source 快照，保存在本機 `/private/tmp/relive-perf-baseline`；暫存目錄可能被系統清除，長期比較請保存獨立 checkout。`.perf/` 是可重建產物，不納入來源。

## 成本與尚存瓶頸

分塊快取增加 O(N) 常駐座標及約 N/255 個圖層，換取少量每幀配置；尚未量測 heap peak 或長時間 GC，不宣稱記憶體總量減少。開啟跟隨時 Leaflet 仍需投影可見軌跡；一次大幅拖曳仍需更新跨越的塊。百萬點、數千照片／標記、同頁多個播放器仍可能需要進一步處理。

GPX/XML、EXIF 與 GPS 配對仍在載入端執行；照片配對仍是 O(照片數×軌跡點數)。原圖檔案大小、網路下載、Docusaurus 內嵌長軌跡的頁面體積尚未縮減。後續應依實際資料量測，再決定縮圖產生、worker、空間索引或可見區域掛載，避免改變定位或發布語意。

## GPX 瘦身對照測試

完整軌跡、三種瘦身強度及 70% 刪點上限的 30 輪實際 Chromium 測試，包含 heap、首次顯示、播放、縮放與照片定位差異，見 [GPX 瘦身效能報告](../docs/gpx-slim-performance.md)。此報告與上方保留全部軌跡點的 renderer 優化是不同測試。
