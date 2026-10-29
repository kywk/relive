import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBlock,makeTrack} from '../src/core.js';
import {resolveEvents,timelineLabel} from '../src/timeline.js';
import {loadGoogleMaps} from '../src/google-map.js';
const start=Date.parse('2026-10-28T23:00:00Z');
const track=makeTrack([[{lat:25,lon:121,time:start},{lat:25.01,lon:121.01,time:start+600000}]]);
test('events support elapsed, absolute, and normalized timeline anchors',()=>{
 const config=parseBlock(`gpx: ride.gpx\nevents:\n - at: '00:02:00'\n   title: 第一座橋\n - time: '2026-10-29T07:05:00+08:00'\n   title: 休息\n - progress: 1\n   title: 終點\n   lat: 25.02\n   lon: 121.02`);
 const events=resolveEvents(config.events,track,config.timezoneOffset);
 assert.deepEqual(events.map(e=>e.progress),[.2,.5,1]);assert.equal(events[2].lat,25.02);assert.ok(Math.abs(events[0].lat-25.002)<1e-9);
});
test('event validation rejects ambiguous, invalid, and out-of-range anchors',()=>{
 for(const event of ['{title: x}','{at: "00:02:00", time: "2026-10-29T07:00:00Z", title: x}','{at: "00:99:00", title: x}','{progress: 2, title: x}','{progress: 0, title: x, lat: 10}'])assert.throws(()=>parseBlock(`gpx: a\nevents: [${event}]`));
 assert.throws(()=>resolveEvents([{at:'00:11:00',title:'late'}],track,'+08:00'),/超出/);
 const untimed=makeTrack([[{lat:0,lon:0},{lat:0,lon:1}]]);
 assert.throws(()=>resolveEvents([{at:'00:01:00',title:'time'}],untimed,'+08:00'),/完整 GPX/);
 assert.equal(resolveEvents([{progress:.5,title:'half'}],untimed,'+08:00')[0].lon,.5);
});
test('timeline shows GPX clock in configured offset and playback clock for untimed GPX',()=>{
 const journey={track,timezoneOffset:'+08:00',duration:20};
 assert.equal(timelineLabel(journey,.5),'07:05:00');assert.equal(timelineLabel(journey,0,true),'2026-10-29 07:00:00 +08:00');
 assert.equal(timelineLabel({...journey,timezoneOffset:'-01:00'},0,true),'2026-10-28 22:00:00 -01:00');
 assert.equal(timelineLabel({...journey,track:{timed:false}},.5,true),'00:00:10（回放時間）');
});
test('Google 3D requires a key without loading scripts or a DOM',async()=>{
 await assert.rejects(loadGoogleMaps(''),/API key/);
 assert.equal(parseBlock('gpx: a\nrenderer: google-3d').renderer,'google-3d');
 assert.throws(()=>parseBlock('gpx: a\nrenderer: earth'),/renderer/);
});

test('Google adapter updates segmented paths, marker, camera and native popover',async()=>{
 const {createGoogleMap}=await import('../src/google-map.js');
 const {sampleTrack}=await import('../src/core.js');
 class Element {
  constructor(options={}){Object.assign(this,options);this.children=[];this.style={};this.events=new Map();}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  addEventListener(name,fn){this.events.set(name,fn);}
  removeEventListener(name){this.events.delete(name);}
  remove(){this.removed=true;}
 }
 const host=new Element(),photo={lat:25.005,lon:121.005,progress:.5,caption:'photo'};
 const api=Object.fromEntries(['Map3DElement','Polyline3DElement','Marker3DElement','Marker3DInteractiveElement','PopoverElement'].map(k=>[k,Element]));
 let selected;const adapter=createGoogleMap(host,{track,photos:[photo],events:[]},item=>selected=item,api);
 const map=host.children[0];assert.equal(map.mode,'SATELLITE');assert.equal(map.tilt,65);
 adapter.update(sampleTrack(track,.5),true);assert.ok(Math.abs(map.center.lat-25.005)<1e-9);
 const popup=map.children[3];const content={text:'photo'};adapter.show(photo,content);assert.equal(popup.open,true);assert.equal(popup.positionAnchor.lng,photo.lon);assert.equal(popup.children[0],content);
 map.children[4].events.get('gmp-click')();assert.equal(selected,photo);
 adapter.hide();assert.equal(popup.open,false);adapter.destroy();assert.equal(map.removed,true);assert.equal(host.children.length,0);
});
