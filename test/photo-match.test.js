import test from 'node:test';
import assert from 'node:assert/strict';
import {distance,makeTrack,matchPhoto} from '../src/track.js';

const nearestByMeters=(photo,track)=>{
  let nearest=track.points[0],best=Infinity;
  for(const point of track.points){const meters=distance(photo,point);if(meters<best){best=meters;nearest=point;}}
  return nearest.progress;
};

test('GPS ranking agrees with full spherical distance across worldwide coordinates',()=>{
  let seed=1297;
  const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
  const track=makeTrack([Array.from({length:1000},()=>({lat:random()*180-90,lon:random()*360-180}))]);
  for(let i=0;i<100;i++){
    const photo={lat:random()*180-90,lon:random()*360-180,caption:'unchanged'};
    const matched=matchPhoto(photo,track);
    assert.equal(matched.progress,nearestByMeters(photo,track));
    assert.equal(matched.matchedBy,'gps');
    assert.equal(matched.lat,photo.lat);
    assert.equal(matched.lon,photo.lon);
    assert.equal(matched.caption,photo.caption);
  }
});

test('GPS ranking handles date line, polar positions, antipodes and first-point ties',()=>{
  const cases=[
    {points:[{lat:0,lon:170},{lat:0,lon:-179.9},{lat:0,lon:0}],photo:{lat:0,lon:179.99},index:1},
    {points:[{lat:85,lon:0},{lat:89.9,lon:179},{lat:70,lon:-90}],photo:{lat:89.99,lon:-179},index:1},
    {points:[{lat:0,lon:180},{lat:0,lon:179.9}],photo:{lat:0,lon:0},index:1},
    // Both distances round to pi*R, although raw h is 1+epsilon then 1.
    {points:[{lat:88.30000000000004,lon:-160},{lat:88.30000000010004,lon:-160}],photo:{lat:-88.30000000000004,lon:20},index:0},
    {points:[{lat:0,lon:-1},{lat:0,lon:1}],photo:{lat:0,lon:0},index:0},
    {points:[{lat:25,lon:121},{lat:25,lon:121}],photo:{lat:25,lon:121},index:0},
  ];
  for(const {points,photo,index} of cases){
    const track=makeTrack([points]);
    assert.equal(matchPhoto(photo,track).progress,track.points[index].progress);
    assert.equal(matchPhoto(photo,track).progress,nearestByMeters(photo,track));
  }
});

test('time matching still takes priority over GPS, with invalid time falling back',()=>{
  const track=makeTrack([[{lat:0,lon:0,time:0},{lat:0,lon:10,time:1000}]]);
  const timed=matchPhoto({timestamp:500,lat:0,lon:10},track);
  assert.equal(timed.progress,.5);assert.equal(timed.matchedBy,'time');
  assert.equal(matchPhoto({timestamp:2000,lat:0,lon:10},track).progress,1);
  assert.equal(matchPhoto({lat:NaN,lon:10},track).progress,null);
});
