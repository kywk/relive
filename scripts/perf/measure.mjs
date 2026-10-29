import {existsSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {build} from 'esbuild';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]??'.');
const {makeTrack,sampleTrack,matchPhoto}=await import(pathToFileURL(path.join(root,'src/core.js')));
const track=makeTrack([Array.from({length:100000},(_,i)=>({lat:25+i/1e7,lon:121+Math.sin(i/300)/100,time:1700000000000+i*1000}))]);
const measure=(name,run)=>{run();const times=[];for(let n=0;n<5;n++){const start=performance.now();run();times.push(performance.now()-start);}times.sort((a,b)=>a-b);return {name,medianMs:+times[2].toFixed(2)};};
let checksum=0;
const results=[measure('sampleTrack 10k seeks',()=>{for(let i=0;i<10000;i++)checksum+=sampleTrack(track,(i*7919%10000)/10000).index;}),measure('GPS match 100 photos',()=>{for(let i=0;i<100;i++)checksum+=matchPhoto({lat:25+i/10000,lon:121},track).progress;})];
let createTrail;
if(existsSync(path.join(root,'src/trail.js')))({createTrailChunks:createTrail}=await import(pathToFileURL(path.join(root,'src/trail.js'))));
let submitted=0;
results.push(measure('trail 600 sequential frames',()=>{
 submitted=0;const trail=createTrail?.(track,p=>[p.lat,p.lon]);
 for(let i=0;i<600;i++){
  const sample=sampleTrack(track,i/599);
  if(trail){for(const change of trail.update(sample))submitted+=change.path.length;}
  else{const played=[];for(let j=0;j<=sample.index;j++){const p=track.points[j];(played[p.segment]??=[]).push([p.lat,p.lon]);}played[sample.position.segment].push([sample.position.lat,sample.position.lon]);submitted+=played.reduce((n,p)=>n+p.length,0);}
 }
}));
const bundle=await build({entryPoints:[path.join(root,'src/player.js')],bundle:true,minify:true,write:false,format:'esm',metafile:true});
const bytes=bundle.outputFiles[0].contents;
console.log(JSON.stringify({node:process.version,points:track.points.length,results,trailCoordinatesSubmitted:submitted,playerBytes:bytes.length,playerGzipBytes:gzipSync(bytes).length,parserModules:Object.keys(bundle.metafile.inputs).filter(p=>/yaml|fast-xml/.test(p)).length,checksum},null,2));
