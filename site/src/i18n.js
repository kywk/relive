// Site copy is translated without replacing elements, preserving controls and listeners.
// Query parameters win over saved preferences so shared links have a stable language.
export function resolveLocale(search, saved) {
 const requested=new URLSearchParams(search).get('lang');
 if(requested==='en'||requested==='zh-Hant')return requested;
 return saved==='en'?'en':'zh-Hant';
}
let saved;
try{saved=localStorage.getItem('relive-language');}catch{}
export const locale=resolveLocale(location.search,saved);
const en={
 'Relive — 讓旅程，再走一次':'Relive — Walk your journey again',
 '把 GPX、照片與 Markdown 變成可播放的旅行誌。Relive 支援 Obsidian、React、Docusaurus 與獨立 GPX 瘦身工具。':'Turn GPX tracks, photos, and Markdown into interactive travel journals. Relive supports Obsidian, React, Docusaurus, and a standalone GPX slimming tool.',
 '用 GPX 與照片，在筆記和網站上重走一段旅程。':'Replay your journeys with GPX tracks and photos in your notes and on the web.',
 '跳至內容':'Skip to content','Relive 首頁':'Relive home','主要導覽':'Main navigation','回放':'Replay','使用方式':'How it works','安裝':'Install','外觀':'Theme','網站外觀':'Website theme','跟隨系統':'System','淺色':'Light','深色':'Dark',
 '東京馬拉松路線背景回放':'Tokyo Marathon route background replay','暫停背景回放':'Pause background replay','播放背景回放':'Play background replay','東京馬拉松 · 2020 路線':'Tokyo Marathon · 2020 course','景點照片與播放時間為示範編排 ·':'Landmark photos and timing arranged for demonstration ·','來源與授權':'Sources and licenses',
 '讓旅程，再走一次':'Walk your journey again','把 GPX 與照片放進 Markdown，':'Bring GPX tracks and photos into Markdown.','在 Obsidian 和網站上，重回沿途的每個片刻。':'Revisit every moment in Obsidian and on the web.','體驗旅程回放':'Try the journey replay',
 '京都鴨川兩側的河岸步道與建築，遠處是山巒':'Riverside paths and buildings along Kyoto’s Kamo River, with mountains in the distance','京都，鴨川。從一張照片，回到一段路。':'Kyoto, Kamo River. A photo takes you back to the path.','攝影與授權':'Photo credits',
 '沿著鴨川，慢慢走':'Take a stroll along the Kamo','選擇 MapLibre 3D，免金鑰探索立體地形。':'Explore terrain with MapLibre 3D. No API key needed.','按下播放、拖曳時間軸，或點選照片停留。':'Press play, seek along the timeline, or stop at a photo.','正在準備旅程。也可以先':'Preparing your journey. You can also ','下載示範 GPX':'download the demo GPX','。':'.',
 '真實京都照片，搭配人工編排的鴨川路線與播放時間。這是功能示範，並非一次實際錄製的旅程或導航指引。此播放器使用獨立的 @kywk/react-relive React 套件。':'Real Kyoto photos accompany a manually arranged Kamo River route and playback timing. This is a feature demo, not a recorded trip or navigation guide. The player uses the standalone @kywk/react-relive React package.',
 '下載 GPX 範例':'Download GPX example','下載 Markdown 範例':'Download Markdown example','查看 demo 原始碼':'View demo source','地圖回放需要 JavaScript。你仍可下載範例、閱讀使用方式，或前往 GitHub 取得安裝檔。':'Map replay requires JavaScript. You can still download examples, read the guide, or get installation files from GitHub.',
 '照片有了來時路':'Every photo has a path','河岸、鳥群、淺灘與飛石。':'Riverbanks, birds, shallows, and stepping stones.','點選一個片刻，看看它在回放中的位置。':'Choose a moment to find its place in the replay.','鴨川兩岸與遠山':'Kamo River banks and distant mountains','沿著河岸出發':'Set off along the river','鴨川岸邊聚集與飛翔的鳥群':'Birds gathering and flying beside the Kamo River','停下來，看鳥群':'Stop to watch the birds','鴨川淺灘上的白鷺與蒼鷺':'Egrets and herons in the Kamo River shallows','淺灘上的白鷺':'Egrets in the shallows','京都鴨川水面上的飛石步道':'Stepping stones across Kyoto’s Kamo River','走到河中的飛石':'Step out into the river',
 '旅程，留在你的筆記':'Keep the journey in your notes','原始 GPX 和照片放在自己的 Vault。用一個':'Keep your original GPX files and photos in your vault. A ','區塊，串起路線、拍攝時刻與沿途故事。':' block connects your route, photo moments, and stories along the way.','同一份內容可以在 Obsidian 回放，也能經 Docusaurus 發布成網站，或用獨立 React 元件加入自己的應用程式。你的文字與檔案始終由你保存。':'Replay the same content in Obsidian, publish it with Docusaurus, or add it to your app with the standalone React component. Your words and files stay yours.','閱讀完整語法':'Read the full syntax guide','旅程.md':'journey.md','複製範例':'Copy example','用照片時間或 GPS 配對軌跡，並保留每個停留片刻。':'Match photos to your track by time or GPS, and keep every pause along the way.',
 '從你的旅程開始':'Start with your own journey','程式採 MIT 開源授權。':'Open-source code under the MIT license.','目前可從 GitHub Release 取得安裝檔。':'Installation files are available on GitHub Releases.','選擇使用方式':'Choose an integration','在自己的 Vault 回放':'Replay in your own vault','下載':'Download ','、':', ','，放入 Vault 的':' and place them in your vault’s ', '。重新載入 Obsidian，並啟用 Relive。':'. Reload Obsidian and enable Relive.','已收錄於':'Available in ','，亦可從 GitHub Release 手動安裝。':', or install manually from GitHub Releases.','下載安裝檔':'Download installation files',
 '把旅行誌發布成網站':'Publish your travel journal','從 npm 安裝公開套件，再加入網站設定。':'Install the public npm package, then add it to your site configuration.','使用':'Use ','，指定公開附件目錄；建置時可選用 gentle 瘦身，Vault 原檔保持不變。':' to set your public attachment directories. Optionally apply gentle slimming at build time; original vault files stay unchanged.','查看 Docusaurus 設定':'View Docusaurus setup','在 React 應用中重走旅程':'Replay journeys in your React app','獨立套件':'The standalone ','支援 Vite、Next.js 等 React 專案，不需要 Docusaurus。可直接從 npm 安裝。':' package supports Vite, Next.js, and other React projects without Docusaurus. Install it directly from npm.','包含已解析的軌跡、照片與事件。React 元件在瀏覽器掛載地圖，卸載時釋放資源。':' contains parsed tracks, photos, and events. The React component mounts the map in the browser and releases resources on unmount.','執行獨立 React 範例':'Run the standalone React example','讓長軌跡輕一點':'Make long tracks lighter','，以 Node.js 22+ 執行。先比較各種強度，再決定怎麼精簡。':' and run it with Node.js 22+. Compare presets before deciding how much to simplify.','工具在本機處理 GPX，並拒絕覆寫原檔。':'The tool processes GPX locally and refuses to overwrite the original file.','閱讀 CLI 說明':'Read the CLI guide',
 '出發前，想知道的事':'Before you set off','我的照片會被上傳嗎？':'Will my photos be uploaded?','Obsidian 中的本機照片不會由 Relive 自動上傳。發布 Docusaurus 網站時，文章引用的公開附件會進入網站產物，請只允許發布專用的 assetRoots。2D 圖磚連線到 OpenStreetMap；3D 底圖與地形連線到 OpenFreeMap、Mapterhorn。':'Relive does not automatically upload local photos from Obsidian. When publishing a Docusaurus site, referenced public attachments are included in the site output, so allow only dedicated publishing directories in assetRoots. 2D tiles connect to OpenStreetMap; 3D maps and terrain connect to OpenFreeMap and Mapterhorn.','瘦身會改變照片的位置嗎？':'Can slimming change photo positions?','精簡會改變軌跡的內插位置與距離統計。只有 GPS 的照片，在停留或重訪同一位置時也可能改變播放時刻。網站建議明確選用 gentle；需要精確順序時，保留拍攝時間或關閉瘦身。':'Simplification changes interpolated track positions and distance statistics. For GPS-only photos, playback timing may also change at stops or repeated visits to the same place. Explicitly choose gentle for websites; preserve capture times or disable slimming when exact ordering matters.','閱讀實測結果':'Read the measurements','3D 地圖需要 API key 嗎？':'Do 3D maps need an API key?','選擇 MapLibre 3D 即可使用開放底圖、立體地形與建築輪廓，不需要 API key。首次切換才載入 3D 引擎；裝置或網路不支援時會回到 2D。這不是寫實攝影城市。Google 寫實 3D 仍是需自備 key 的選配，官方 demo 不啟用。':'Choose MapLibre 3D for open maps, terrain, and building outlines without an API key. The 3D engine loads on first use and falls back to 2D if the device or network cannot support it. These are not photorealistic cities. Google photorealistic 3D remains an optional integration requiring your own key and is disabled in this demo.',
 '每一段走過的路，':'Every path you have taken','都值得再看一次。':'is worth another look.','GitHub 專案':'GitHub project','探索 StoryMap':'Explore StoryMap','攝影來源與授權':'Photo sources and licenses','範例照片來自 Wikimedia Commons，由不同攝影者於不同日期拍攝。播放位置與時間為示範編排，不是照片的實際 EXIF 紀錄。圖片以 Commons 縮圖版本託管，頁面依版面裁切顯示；各照片保留原授權，未套用程式的 MIT 授權。':'Demo photos come from Wikimedia Commons and were taken by different photographers on different dates. Playback positions and timing are arranged for demonstration, not taken from the photos’ EXIF records. Hosted images use Commons thumbnails and are cropped by the page layout. Each photo retains its own license, separate from the code’s MIT license.','完整圖片來源資料':'Full photo source details','Relive by kywk · 程式 MIT License · 地圖 © OpenStreetMap contributors':'Relive by kywk · Code: MIT License · Maps © OpenStreetMap contributors',
 '地圖未能載入，請重新整理，或下載範例在本機體驗。':'The map could not load. Reload the page, or download the example to try it locally.','已複製':'Copied','Markdown 範例已複製':'Markdown example copied','無法存取剪貼簿，請手動選取範例文字。':'Clipboard access is unavailable. Please select and copy the example manually.','背景地圖暫時無法載入，請使用下方互動示範。':'The background map is unavailable. Try the interactive demo below.',
 '東京都廳':'Tokyo Metropolitan Government Building','歌舞伎町':'Kabukicho','市谷・外濠':'Ichigaya and the outer moat','東京巨蛋':'Tokyo Dome','日本橋':'Nihonbashi','淺草雷門':'Kaminarimon, Asakusa','富岡八幡宮':'Tomioka Hachimangu','銀座':'Ginza','東京鐵塔':'Tokyo Tower','東京車站':'Tokyo Station'
};
export function t(text){return locale==='en'?(en[text]??text):text;}
export function applyLocale(){
 document.documentElement.lang=locale;
 if(locale==='en'){
  const walker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
   if(node.parentElement?.closest('script,style,[data-language]'))continue;
   const value=node.textContent,trimmed=value.trim();
   if(Object.hasOwn(en,trimmed))node.textContent=value.replace(trimmed,en[trimmed]);
  }
  for(const element of document.querySelectorAll('[aria-label],[alt],meta[content]')){
   for(const attr of ['aria-label','alt','content'])if(element.hasAttribute(attr))element.setAttribute(attr,t(element.getAttribute(attr)));
  }
  document.querySelector('a[href="demo/kyoto.md"]')?.setAttribute('href','demo/kyoto.en.md');
  const code=document.querySelector('#markdown-code code');
  code.textContent=code.textContent.replace('鴨川散步','Kamo River stroll').replace('在河邊停一會兒','A pause by the river');
  for(const [selector,url] of [
   ['a[href="https://github.com/kywk/relive#markdown-格式"]','https://github.com/kywk/relive/blob/main/README.en.md#markdown-format'],
   ['a[href="https://github.com/kywk/relive#docusaurus-整合"]','https://github.com/kywk/relive/blob/main/README.en.md#docusaurus-integration']
  ])document.querySelector(selector)?.setAttribute('href',url);
 }
 const select=document.querySelector('#language-select');select.value=locale;
 select.addEventListener('change',()=>{
  try{localStorage.setItem('relive-language',select.value);}catch{}
  const url=new URL(location.href);url.searchParams.set('lang',select.value);location.assign(url);
 });
 const ogUrl=document.querySelector('meta[property="og:url"]');
 ogUrl?.setAttribute('content',`https://kywk.github.io/relive/?lang=${locale}`);
}
