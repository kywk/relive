const english = {
  "地圖 ": "Map ",
  "地圖模式": "Map mode",
  "2D 地圖": "2D map",
  "旅程軌跡地圖": "Journey route map",
  "播放": "Play",
  "暫停": "Pause",
  "播放速度": "Playback speed",
  "跟隨": "Follow",
  "旅程時間軸": "Journey timeline",
  "旅程相片": "Journey photo",
  "未定位相片（顯示於目前位置）": "Unlocated photo (shown at the current position)",
  "相片": "Photo",
  "縮圖大小": "Thumbnail size",
  "相片縮圖大小": "Photo thumbnail size",
  "3D 地圖資料或 WebGL 載入失敗，已切回 2D。": "3D map data or WebGL failed to load. Switched back to 2D.",
  "3D 地圖資料或 WebGL 載入失敗": "3D map data or WebGL failed to load",
  "MapLibre 3D 載入逾時，請檢查網路或 WebGL 支援": "MapLibre 3D timed out. Check your network and WebGL support.",
  "MapLibre 底圖或地形載入失敗，請檢查網路與 WebGL 支援": "MapLibre maps or terrain failed to load. Check your network and WebGL support.",
  "3D 載入已取消": "3D loading was cancelled",
  "目前位置": "Current position",
  "請先在 Relive 設定中提供 Google Maps API key，再啟用 Google 3D。": "Provide a Google Maps API key in Relive settings before enabling Google 3D.",
  "Google 3D 載入逾時，請檢查網路與 API key。": "Google 3D timed out. Check your network and API key.",
  "無法載入 Google Maps，請檢查網路或內容安全政策。": "Google Maps could not load. Check your network or content security policy."
};

// UI language is opt-in; existing Obsidian and website integrations stay Chinese.
export function playerTranslator(locale) {
  return text => locale === "en" ? (english[text] ?? text) : text;
}
