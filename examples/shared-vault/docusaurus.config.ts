// Synthetic shared Vault: same collection architecture, no personal content.
const path=require('node:path');
const createRelive=require('../../src/integration.cjs');
const {createRequire}=require('node:module');
const nativeRequire=createRequire(__filename);
const remarkWikiLink=nativeRequire('remark-wiki-link').default;
const remarkStoryMap=nativeRequire('@story-map/remark-story-map').default;
const relive=createRelive({vaultRoot:__dirname,assetRoots:['media'],gpxSlim:{preset:'balanced',targetReduction:70},googleMapsApiKey:process.env.GOOGLE_MAPS_API_KEY??''});
const wiki=[remarkWikiLink,{permalinks:['/moco/plain'],pageResolver:()=>['/moco/plain'],hrefTemplate:p=>`/vault${p}`}];
const docsPlugins=()=>[wiki,[remarkStoryMap,{vaultRoot:__dirname}],relive.remark];
const blogPlugins=()=>[wiki,relive.remark];
module.exports={
  title:'共用 Vault 整合驗證',url:'https://example.com',baseUrl:'/vault/',trailingSlash:true,onBrokenLinks:'throw',
  i18n:{defaultLocale:'zh-TW',locales:['zh-TW']},
  markdown:{format:'detect'},
  future:{faster:{rspackBundler:true}},
  presets:[['classic',{docs:false,blog:false}]],
  plugins:[
    relive.plugin,
    function storyMapClient(){return {name:'story-map-client',getClientModules:()=>[path.resolve(__dirname,'story-map-client.js')]};},
    ...['backpacker','moco'].map(id=>['@docusaurus/plugin-content-docs',{id,path:id,routeBasePath:id,sidebarPath:false,remarkPlugins:docsPlugins()}]),
    ...['life','news'].map(id=>['@docusaurus/plugin-content-blog',{id,path:`blog.${id}`,routeBasePath:id,remarkPlugins:blogPlugins(),onUntruncatedBlogPosts:'ignore'}]),
    ['docusaurus-plugin-album',{id:'album',path:'blog.album',routeBasePath:'album',remarkPlugins:blogPlugins()}],
  ],
  themeConfig:{navbar:{title:'共用 Vault',items:[{to:'/backpacker/ride',label:'遊記'},{to:'/life/2026/10/29/ride',label:'生活部落格'},{to:'/news/2026/10/29/ride',label:'資訊部落格'},{to:'/moco/plain',label:'一般筆記'},{to:'/album',label:'相簿'}]}}
};
