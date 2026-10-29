// Synthetic GPS-only workload; reports matching CPU time, not playback FPS.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import os from 'node:os';
import {distance,makeTrack,matchPhoto} from '../../src/track.js';

const pointCount=100000,photoCount=100;
const track=makeTrack([Array.from({length:pointCount},(_,i)=>({lat:25+i/1e7,lon:121+Math.sin(i/300)/100,time:1700000000000+i*1000}))]);
const photos=Array.from({length:photoCount},(_,i)=>({lat:25+i/10000,lon:121}));
function before(photo){
  let nearest=track.points[0],best=Infinity;
  for(const point of track.points){const meters=distance(photo,point);if(meters<best){best=meters;nearest=point;}}
  return {...photo,progress:nearest.progress,matchedBy:'gps'};
}
const after=photo=>matchPhoto(photo,track);
for(const photo of photos)assert.deepEqual(after(photo),before(photo));
const run=fn=>{let checksum=0;for(const photo of photos)checksum+=fn(photo).progress;return checksum;};
// Warm both paths in one process, then alternate measurement order.
for(let i=0;i<5;i++){run(before);run(after);}
const times={before:[],after:[]},checksums={};
for(let i=0;i<10;i++){
  for(const [name,fn] of i%2?[['after',after],['before',before]]:[['before',before],['after',after]]){
    const start=performance.now();checksums[name]=run(fn);times[name].push(performance.now()-start);
  }
}
assert.equal(checksums.before,checksums.after);
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return (sorted[4]+sorted[5])/2;};
const old=median(times.before),current=median(times.after);
console.log(JSON.stringify({node:process.version,platform:`${os.platform()} ${os.arch()}`,cpu:os.cpus()[0]?.model,points:pointCount,photos:photoCount,warmupRounds:5,measuredRounds:10,beforeMedianMs:+old.toFixed(2),afterMedianMs:+current.toFixed(2),reductionPercent:+((1-current/old)*100).toFixed(1),checksums,samplesMs:Object.fromEntries(Object.entries(times).map(([key,values])=>[key,values.map(n=>+n.toFixed(2))]))},null,2));
