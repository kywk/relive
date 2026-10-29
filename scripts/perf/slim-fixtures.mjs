import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {compressGpx} from '../../packages/gpx-slim/src/index.js';
import {parseGpx} from '../../src/core.js';
import {makeTrack, sampleTrack, matchPhoto, distance} from '../../src/track.js';

const out='.perf/slim';
await mkdir(out,{recursive:true});
const percentile=(a,p)=>[...a].sort((a,b)=>a-b)[Math.floor((a.length-1)*p)];
const stats=a=>({median:percentile(a,.5),p95:percentile(a,.95),max:Math.max(...a)});
function fixture(count,dense){
 // Fixed synthetic trail: changing speed, switchbacks, loops, small GPS jitter,
 // two pauses and two disjoint segments. No private tracks are read.
 const segments=[[],[]];let travel=0;
 for(let i=0;i<count;i++){
  const t=i/(count-1),paused=(t>.22&&t<.25)||(t>.68&&t<.71);
  const dt=dense?.1:1;
  if(!paused)travel+=dt*(.7+2.3*(.5+.5*Math.sin(i*dt/180)));
  const x=travel*.3+70*Math.sin(travel/65),y=130*Math.sin(travel/170)+20*Math.sin(travel/19);
  const segment=i<count/2?0:1;
  segments[segment].push({lat:25+(y+segment*600+Math.sin(i*1.7)*.2)/111195,lon:121+(x+Math.cos(i*1.3)*.2)/100776,time:Date.UTC(2026,0,1)+i*dt*1000,ele:60+12*Math.sin(travel/80)});
 }
 const xml='<gpx><trk>'+segments.map(s=>'<trkseg>'+s.map(p=>`<trkpt lat="${p.lat}" lon="${p.lon}"><ele>${p.ele}</ele><time>${new Date(p.time).toISOString()}</time></trkpt>`).join('')+'</trkseg>').join('')+'</trk></gpx>';
 return xml;
}
function edgeError(p,a,b){
 const x=(p.lon-a.lon)*100776,y=(p.lat-a.lat)*111195,dx=(b.lon-a.lon)*100776,dy=(b.lat-a.lat)*111195;
 const u=Math.max(0,Math.min(1,(x*dx+y*dy)/(dx*dx+dy*dy||1)));
 return Math.hypot(x-u*dx,y-u*dy);
}
const quality=[];
for(const [scenario,count,dense] of [['trail20k',20000,false],['dense100k',100000,true]]){
 const xml=fixture(count,dense),original=makeTrack(parseGpx(xml));
 const photoInputs=Array.from({length:60},(_,i)=>{
  const p=original.points[Math.floor((i+.37)/60*(count-1))];
  return {lat:p.lat,lon:p.lon,timestamp:p.time};
 });
 const baselinePhotos=photoInputs.map(p=>({timed:matchPhoto(p,original),gps:matchPhoto({lat:p.lat,lon:p.lon},original)}));
 for(const variant of ['full','gentle','balanced','aggressive','balanced70']){
  const start=performance.now();
  const compressed=variant==='full'?{xml,report:null}:compressGpx(xml,{preset:variant==='balanced70'?'balanced':variant,...(variant==='balanced70'?{targetReduction:70}:{})});
  const slimMs=performance.now()-start;
  const track=makeTrack(parseGpx(compressed.xml));
  const timing=[],geometry=[];let j=0;
  for(const p of original.points){
   while(j+1<track.points.length&&track.points[j+1].time<=p.time)j++;
   const a=track.points[j],b=track.points[j+1];
   geometry.push(b&&b.segment===a.segment?edgeError(p,a,b):distance(p,a));
   timing.push(distance(p,sampleTrack(track,p.progress).position));
  }
  const timedPositions=[],gpsSeconds=[],gpsCursor=[],gpsMarkers=[];
  const photos=photoInputs.map((p,i)=>{
   const timed=matchPhoto(p,track),gps=matchPhoto({lat:p.lat,lon:p.lon},track);
   timedPositions.push(distance(timed,baselinePhotos[i].timed));
   gpsSeconds.push(Math.abs(gps.progress-baselinePhotos[i].gps.progress)*original.elapsed);
   gpsCursor.push(distance(sampleTrack(track,gps.progress).position,sampleTrack(original,baselinePhotos[i].gps.progress).position));
   gpsMarkers.push(distance(gps,baselinePhotos[i].gps));
   return {...(i%2?timed:gps),caption:'Synthetic photo '+i,url:''};
  });
  const journey={track,photos,events:[]},json=JSON.stringify(journey);
  await writeFile(`${out}/${scenario}-${variant}.json`,json);
  quality.push({scenario,variant,points:track.points.length,slimMs,xmlBytes:Buffer.byteLength(compressed.xml),journeyBytes:Buffer.byteLength(json),journeyGzipBytes:gzipSync(json).length,distanceChangePercent:(track.meters/original.meters-1)*100,geometricErrorMeters:stats(geometry),timePositionErrorMeters:stats(timing),timedPhotoPositionErrorMeters:stats(timedPositions),gpsPhotoTimeShiftSeconds:stats(gpsSeconds),gpsPhotoCursorErrorMeters:stats(gpsCursor),gpsPhotoMarkerErrorMeters:stats(gpsMarkers),report:compressed.report});
  console.log(scenario,variant,track.points.length,Math.round(slimMs)+'ms');
 }
}
await mkdir('docs/performance',{recursive:true});
await writeFile('docs/performance/slim-quality.json',JSON.stringify(quality,null,2)+'\n');
await build({entryPoints:['scripts/perf/slim-browser.js'],bundle:true,minify:true,format:'esm',outfile:`${out}/bench.js`,loader:{'.png':'dataurl'},plugins:[{name:'capture-benchmark-map',setup(b){b.onLoad({filter:/src\/leaflet-map\.js$/},async({path})=>({contents:(await readFile(path,'utf8')).replace('const map=L.map(host,{scrollWheelZoom:false});','const map=L.map(host,{scrollWheelZoom:false}); globalThis.benchMap=map;'),loader:'js'}));}}]});
await writeFile(`${out}/index.html`,'<!doctype html><meta charset="utf-8"><title>Relive GPX benchmark</title><link rel="stylesheet" href="bench.css"><style>body{margin:0}#map{width:900px;height:500px}</style><div id="map"></div><script type="module" src="bench.js"></script>');
