import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTrack,sampleTrack} from '../src/core.js';
import {createTrailChunks} from '../src/trail.js';
const coord=p=>[p.lat,p.lon];
test('chunked trail preserves every GPX edge, gaps, duplicate times and backward seeks',()=>{
 const track=makeTrack([Array.from({length:700},(_,i)=>({lat:i/10000,lon:Math.sin(i)/100,time:Math.floor(i/2)*1000})),[{lat:2,lon:2,time:400000},{lat:3,lon:3,time:500000}]]);
 const trail=createTrailChunks(track,coord),paths=trail.chunks.map(()=>[]);
 for(const progress of [0,.1,.5,1,.2,.99,0,1]){
  const sample=sampleTrack(track,progress);
  for(const change of trail.update(sample))paths[change.index]=change.path;
  const actual=paths.flatMap(p=>p.slice(1).map((v,i)=>[p[i],v])).filter(([a,b])=>a[0]!==b[0]||a[1]!==b[1]);
  const expected=[];
  for(let i=1;i<=sample.index;i++)if(track.points[i-1].segment===track.points[i].segment)expected.push([coord(track.points[i-1]),coord(track.points[i])]);
  const a=coord(track.points[sample.index]),b=coord(sample.position);if(a[0]!==b[0]||a[1]!==b[1])expected.push([a,b]);
  assert.deepEqual(actual,expected);
 }
});
test('same-chunk animation submits bounded coordinates regardless of track length',()=>{
 const track=makeTrack([Array.from({length:100000},(_,i)=>({lat:i/100000,lon:0,time:i*1000}))]);
 const trail=createTrailChunks(track,coord);
 trail.update(sampleTrack(track,.9));
 const changes=trail.update(sampleTrack(track,.900001));
 assert.equal(changes.length,1);assert.ok(changes[0].path.length<=258);
 assert.deepEqual(trail.update(sampleTrack(track,.900001)),[]);
});

test('GPS pairing retains first nearest point on ties and exact Haversine result',async()=>{
 const {matchPhoto,distance}=await import('../src/core.js');
 const track=makeTrack([[{lat:0,lon:0},{lat:0,lon:0},{lat:0,lon:1},{lat:0,lon:-1}]]);
 assert.equal(matchPhoto({lat:0,lon:0},track).progress,track.points[0].progress);
 for(let i=0;i<50;i++){
  const photo={lat:Math.sin(i)*80,lon:Math.cos(i)*179};
  const expected=track.points.reduce((a,b)=>distance(photo,a)<=distance(photo,b)?a:b);
  assert.equal(matchPhoto(photo,track).progress,expected.progress);
 }
});
