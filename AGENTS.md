# Relive 維護規範

以繁體中文維護面向使用者與維護者的文件。修改發行設定、套件名稱或版本前，閱讀 README.md 的「Release CI/CD」；CLI 行為與參數以 packages/gpx-slim/README.md 為準。

## 套件邊界

- 根目錄是 `@kywk/relive`：共用資料處理、Docusaurus 整合與 Obsidian adapter。Obsidian plugin ID 保持 `relive`，以 GitHub Release 附件安裝。
- `packages/gpx-slim` 是獨立的 `@kywk/gpx-slim` CLI，命令為 `gpx-slim`。保留獨立版本、lockfile 與 runtime dependencies；CLI 安裝及執行不依賴根套件、Obsidian 或 Docusaurus。
- GitHub repository metadata 使用 `kywk/relive`，npm scope 使用 `@kywk`。MIT LICENSE 必須同時包含於兩個 npm tarball。

## 修改與驗證

- 修改共用解析、播放器或 Obsidian adapter：執行根目錄測試與建置；修改網站整合時，再建置兩個 Docusaurus 範例。
- 修改 CLI：執行 `npm run gpx:release:pack`，涵蓋原有測試及隔離、離線 npx 驗證。維持原始 GPX 不被覆寫、分段不相連、分析模式不寫檔的行為。
- 修改 exports、dependencies、套件名稱或發行腳本：驗證受影響套件的 lockfile 與實際 tarball。網站套件使用 `npm run release:pack`；CLI 使用 `npm run gpx:release:pack`。
- 發行產物分別放在 `.release/docusaurus` 與 `.release/gpx-slim`，各自只清理自己的目錄。使用合成測試資料；私人 Vault、GPX、照片及 API key 留在發行內容之外。

## 發行完成條件

版本與 tag 規則、首次上架步驟和 workflow 對照集中在 README.md。發布前確認該產品的檢查通過，發布已驗證的 tarball／附件。報告須分別標示本機驗證、遠端 Actions、npm 發布及 Obsidian Community 審核狀態；只有實際成功的階段才可宣稱完成。

## 官方網站

`site/` 是 GitHub Pages 官網，與 Docusaurus 整合範例分開。修改後執行 `npm run pages:build`，並檢查桌面、平板與手機上的播放、照片跳轉及安裝分頁。素材來源與授權集中在 `site/public/photos/credits.json`；替換照片須同步更新署名。示範軌跡由 `scripts/site/prepare.mjs` 生成，不得宣稱是真實紀錄。
