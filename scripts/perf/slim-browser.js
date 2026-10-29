import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {createLeafletMap} from '../../src/leaflet-map.js';
import {sampleTrack} from '../../src/track.js';
// Keep the actual SVG renderer and real map controls, but remove network tiles.
L.tileLayer=()=>L.layerGroup();
const raf=()=>new Promise(requestAnimationFrame);
const percentile=(a,p)=>[...a].sort((a,b)=>a-b)[Math.floor((a.length-1)*p)];
const stats=a=>({median:percentile(a,.5),p95:percentile(a,.95),max:Math.max(...a)});
let journey,adapter;
window.bench={
 async mount(key){
  const text=await(await fetch(key+'.json')).text();
  const parseStart=performance.now();journey=JSON.parse(text);const jsonParseMs=performance.now()-parseStart;
  await raf();const start=performance.now();
  adapter=createLeafletMap(document.querySelector('#map'),journey,()=>{});
  const mountSyncMs=performance.now()-start;
  await raf();await raf();
  return {jsonParseMs,mountSyncMs,firstFrameReadyMs:performance.now()-start,svgPaths:document.querySelectorAll('path').length};
 },
 async playback(follow){
  adapter.update(sampleTrack(journey.track,0),false);await raf();await raf();
  const costs=[],frames=[];let previous;
  for(let i=0;i<120;i++){
   const now=await raf();if(previous!==undefined)frames.push(now-previous);previous=now;
   const start=performance.now();adapter.update(sampleTrack(journey.track,i/119),follow);costs.push(performance.now()-start);
  }
  await raf();return {updateMs:stats(costs),frameMs:stats(frames),framesOver32ms:frames.filter(n=>n>32).length};
 },
 async zoom(){
  const map=globalThis.benchMap;map.fitBounds(L.latLngBounds(journey.track.points.map(p=>[p.lat,p.lon])),{animate:false});
  const base=map.getZoom();await raf();await raf();
  const sync=[],ready=[];
  for(const delta of [1,2,3,2,1,0,1,2,3,2,1,0]){
   const start=performance.now();map.setZoom(base+delta,{animate:false});sync.push(performance.now()-start);await raf();await raf();ready.push(performance.now()-start);
  }
  return {syncMs:stats(sync),frameReadyMs:stats(ready)};
 },
 reset(){const map=globalThis.benchMap;map.fitBounds(L.latLngBounds(journey.track.points.map(p=>[p.lat,p.lon])),{animate:false});},
};
