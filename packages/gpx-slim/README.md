# GPX Slim

位於 Relive 專案 `packages/gpx-slim` 的獨立 Node.js CLI，將 GPX 中過密的軌跡點精簡。支援停留辨識、低速點精簡、路線與高度誤差限制、分析預覽、目標刪點比例。與 Obsidian 或任何網站無相依。

## 立即執行

需要 Node.js 22 或更新版本。在此專案目錄執行：

```sh
npm ci
node bin/gpx-slim.js /path/to/ride.gpx --analyze
node bin/gpx-slim.js /path/to/ride.gpx
node bin/gpx-slim.js /path/to/ride.gpx --preset gentle
node bin/gpx-slim.js /path/to/ride.gpx --preset aggressive --reduction 80
node bin/gpx-slim.js /path/to/ride.gpx -o /path/to/ride.small.gpx
```

預設使用 `balanced`，輸出至原檔旁的 `ride.slim.gpx`。輸出路徑已存在時拒絕寫入，包括符號連結；不覆寫原檔。運算完全在本機執行，不上傳 GPX。

```sh
# 僅比較三種強度，不寫入檔案
node bin/gpx-slim.js ride.gpx --analyze --json

# 預覽選定參數
node bin/gpx-slim.js ride.gpx --preset balanced --reduction 60 --dry-run

# 額外刪除所有 GPX extensions，包含心率、踏頻等感測器資料
node bin/gpx-slim.js ride.gpx --strip-extensions
```

`--analyze` 不接受 `--preset`、`--reduction` 或 `--output`；特定參數的預覽請用 `--dry-run`。

## 壓縮強度

| 參數 | gentle 保守 | balanced 平衡（預設） | aggressive 積極 |
|---|---:|---:|---:|
| 低速／停留點幾何誤差上限 | 3 m | 8 m | 20 m |
| 其他點幾何誤差上限 | 1.5 m | 4 m | 10 m |
| 高度插值誤差上限 | 2 m | 5 m | 10 m |
| 移動中時間取樣目標 | 30 s | 60 s | 120 s |
| 停留半徑 | 3 m | 6 m | 12 m |
| 最短停留時間 | 90 s | 60 s | 45 s |
| 低速判斷上限 | 1.5 m/s | 1.5 m/s | 2 m/s |

這些是演算法參數，不是實測 GPS 精度保證。不同強度的停留分群與時間錨點可能不同，實際點數不保證嚴格遞減；先用 `--analyze` 比較。

`--reduction 80` 表示**目標刪除原始 trkpt 的 80%**，並非保留 80%，也不是檔案位元組縮小 80%。程式在所選強度的誤差上限內，最多進行 24 次搜尋以逼近目標，且不超過指定刪點數。離散點數、必要錨點與誤差限制可能讓結果遠低於目標；此時會回報警告，不強制破壞路線。`--reduction 0` 不刪任何點；如果同時指定 `--strip-extensions`，擴充資料仍會刪除。

## 演算法與保留規則

1. 以 namespace-aware XML parser 解析 UTF-8 GPX。支援 GPX 1.0、1.1 與常見無 namespace 檔案；拒絕格式損壞、無效座標、DOCTYPE 及非 UTF-8 宣告。這不是完整 GPX XSD 驗證器。
2. 每個 `trkseg` 獨立處理。固定以候選群第一點為中心判斷停留半徑，要求時間遞增且持續足夠久，避免停留群中心一路漂移。低速小範圍移動仍可能被判為停留，因此仍受幾何／高度誤差限制。
3. 保留段落首尾、停留起訖、帶 name/desc/cmt/sym/link 的點、時間倒退或重複前後、超過 300 秒中斷前後、時間或高度有無值的切換點。
4. 移動時加入定期時間錨點；停留內部可跨越較長時間。原始取樣間隔已超過目標時，不新增或補造點。停留起訖時間得以保存，但不保留每秒的速度／感測器曲線。
5. 用非遞迴、逐點誤差加權的 Douglas–Peucker 簡化。相鄰邊的速度都低於門檻時，容許較寬的幾何誤差；時間缺漏時採較保守的幾何上限。
6. 幾何距離採地心三維座標到有限線段的距離，可處理日界線及極區，長距離受地球曲率影響會保留較多點。高度另做線段投影位置的線性插值誤差檢查。座標不四捨五入。
7. 直接刪除原始 XML 的點範圍及該行縮排，不重新序列化整份檔案。保留點的原始時間、高度、未知資料、namespace、CDATA 及文字維持原樣。

預設保留文件 metadata、路線 `rte/rtept`、獨立航點 `wpt`、所有保留點的擴充資料。被刪點的所有子資訊（包括感測器讀值）也會隨之刪除。`--strip-extensions` 明確移除文件中 GPX namespace 的所有 extensions。

報告包含原始／輸出點數、位元組數、兩種實際縮減率、停留群數與累計秒數、軌跡距離前後差異。距離以同一 trkseg 中相鄰點計算，不跨段相連。停留秒數是推估值。精簡會改變里程、累計爬升、速度與運動平台統計，因此適合地圖顯示與分享；需要原始訓練資料時請保留來源檔。

## npm / GitHub 發布

已配置 `bin`、套件檔案白名單與 `prepack` 測試。專案目前**尚未發布**；正式套件名稱為 `@kywk/gpx-slim`，由 npm 帳號 `kywk` 維護。

先在本機驗證打包與 npx：

```sh
npm test
npm pack
npx --yes --package ./kywk-gpx-slim-0.1.0.tgz gpx-slim --help
```

已配置 MIT 授權、作者與 `kywk/relive` repository 的子目錄 metadata。正式上架前需完成 npm 登入及 Trusted Publisher 設定，詳見根目錄發佈說明。

```sh
# 登入 npm 並配置妥當後，由維護者執行
npm publish --access public

# 發布成功後，使用者即可執行（名稱需與實際發布名稱一致）
npx @kywk/gpx-slim ride.gpx --analyze
npx @kywk/gpx-slim ride.gpx --preset balanced --reduction 70
```

此套件位於 Relive repository 的子目錄。從 GitHub 取得整個專案後，先 `cd packages/gpx-slim` 再安裝、測試與打包。npm 的 GitHub repository 安裝會使用根目錄套件，無法直接將此子目錄當作 CLI；分享時請使用本套件的 npm 名稱或打包後的 `.tgz`。

## 程式介面

```js
import { compressGpx, parseGpx } from '@kywk/gpx-slim';
const parsed = parseGpx(xmlString);
const { xml, report } = compressGpx(parsed, {
  preset: 'balanced',
  targetReduction: 70,
  stripExtensions: false,
});
```

`compressGpx` 也可直接接受 XML 字串。沒有自動寫檔副作用。`parseGpx` 回傳值含內部結構，應視為不透明物件，僅供重複分析使用。

## 測試與限制

```sh
npm test
```

測試包含停留、低速、迴圈／髮夾彎、高度峰值、多段、時間異常、metadata 與 namespace 保留、日界線、極區、目標比例、格式錯誤及 CLI 檔案安全。目前驗證使用合成資料，尚未以實際裝置匯出的 GPX 校準參數。

整份 XML 與軌跡點載入記憶體，尚未採串流輸出；不適合無限制大小的檔案。簡化與停留搜尋在病態輸入最壞可能 O(n²)，指定目標比例會多次運算。UTF-16／其他編碼須先轉成 UTF-8。缺漏或無法辨認的時間無法可靠估算速度與停留。

XML 解析使用 [saxes](https://github.com/lddubeau/saxes)，以其公開事件與位置介面定位原始資料。

## Relive CI/CD

Relive CI 在 Node 22／24 自動執行此套件的 prepack 測試，驗證離線 npx 分析、壓縮與檔案保護，並保存 tarball artifact。根目錄可執行 `npm run gpx:release:pack` 重現。

此套件使用獨立 `gpx-slim-v<version>` tag，透過 `release-gpx-slim.yml` 發布 npm；不會由 Obsidian 或根套件的 tag 觸發。首次發布仍須建立遠端 repository 與設定 npm OIDC trusted publisher。詳見 [Relive 發佈說明](../../README.md#release-cicd)。
