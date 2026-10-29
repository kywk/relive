import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const baseline=process.argv[2]?path.resolve(process.argv[2]):null;
const versions=[...(baseline?[['before',baseline]]:[]),['after',process.cwd()]];
await mkdir('.perf',{recursive:true});
const imports=versions.map(([name,root])=>`import {createLeafletMap as ${name}} from ${JSON.stringify(path.join(root,'src/leaflet-map.js'))};`).join('\n');
const source=`${imports}
import {makeTrack,sampleTrack} from ${JSON.stringify(path.join(process.cwd(),'src/track.js'))};
import 'leaflet/dist/leaflet.css';
const points=Array.from({length:100000},(_,i)=>({lat:25+i/1e7,lon:121+Math.sin(i/300)/100,time:1700000000000+i*1000}));
const track=makeTrack([points]),journey={track,photos:[],events:[]};
const versions={${versions.map(([name])=>name).join(',')}};
document.querySelector('button').onclick=async()=>{
 const button=document.querySelector('button');button.disabled=true;const results=[];
 for(const [version,create] of Object.entries(versions))for(const follow of [false,true]){
  document.querySelector('output').textContent=version+' follow='+follow;
  const map=create(document.querySelector('#map'),journey,()=>{});const costs=[],frames=[];let previous;
  for(let i=0;i<120;i++){
   const now=await new Promise(requestAnimationFrame);if(previous)frames.push(now-previous);previous=now;
   const start=performance.now();map.update(sampleTrack(track,i/119),follow);costs.push(performance.now()-start);
  }
  const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.floor((values.length-1)*p)];
  results.push({version,follow,updateMedianMs:percentile(costs,.5),updateP95Ms:percentile(costs,.95),frameP95Ms:percentile(frames,.95),framesOver32ms:frames.filter(n=>n>32).length});map.destroy();
 }
 document.querySelector('output').textContent='complete';document.querySelector('pre').textContent=JSON.stringify({points:points.length,frames:120,results},null,2);button.disabled=false;
};`;
await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'js'},bundle:true,minify:true,loader:{'.png':'dataurl'},outfile:'.perf/bench.js',format:'esm'});
await writeFile('.perf/index.html','<!doctype html><meta charset="utf-8"><title>Relive performance</title><link rel="stylesheet" href="bench.css"><style>body{font:16px system-ui;margin:24px}#map{width:900px;height:500px}pre{white-space:pre-wrap}</style><h1>Relive: 100,000 GPX points</h1><button>Run benchmark</button> <output>ready</output><div id="map"></div><pre></pre><script type="module" src="bench.js"></script>');
