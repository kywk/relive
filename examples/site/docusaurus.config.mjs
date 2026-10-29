import path from 'node:path';
import {fileURLToPath} from 'node:url';
import remarkRelive from '../../src/remark.js';
const here=path.dirname(fileURLToPath(import.meta.url));
export default {
  title:'Relive 旅程筆記',url:'https://example.com',baseUrl:'/journeys/',onBrokenLinks:'throw',
  plugins:[[path.resolve(here,'../../src/docusaurus.cjs'),{googleMapsApiKey:process.env.GOOGLE_MAPS_API_KEY??''}]],
  presets:[['classic',{
    docs:{routeBasePath:'/',sidebarPath:false,remarkPlugins:[[remarkRelive,{vaultRoot:path.join(here,'docs'),staticDir:path.join(here,'static'),baseUrl:'/journeys/',gpxSlim:{preset:'balanced',targetReduction:70}}]]},
    blog:false
  }]],
  themeConfig:{navbar:{title:'Relive',items:[{to:'/',label:'河濱晨騎',position:'left'},{to:'/second',label:'另一段旅程',position:'left'}]}}
};
