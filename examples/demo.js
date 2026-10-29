import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../src/styles.css';
import {parseBlock} from '../src/core.js';
import {loadJourney} from '../src/load.js';
import {mountPlayer} from '../src/player.js';
const config=parseBlock(`title: 河濱晨騎\nduration: 20\ngpx: /examples/site/docs/ride.gpx\nphotos:\n  - src: /examples/site/docs/morning.png\n    time: '2026-10-29T07:05:00+08:00'\n    caption: 河岸一刻（測試插圖）\nevents:\n  - at: "00:02:00"\n    title: 出發後的第一座橋\n    text: 停下來喝水。\n  - at: "00:08:00"\n    title: 回程折返點`);
const journey=await loadJourney(config,async(url,kind)=>{const response=await fetch(url);return {url,data:kind==='gpx'?await response.text():await response.arrayBuffer()};});
mountPlayer(document.querySelector('#journey'),journey,{googleMapsApiKey:import.meta.env.VITE_GOOGLE_MAPS_API_KEY??''});
