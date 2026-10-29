import test from 'node:test';
import assert from 'node:assert/strict';
import {createMapLibreMap,MAPLIBRE_STYLES,TERRAIN_URL} from '../src/maplibre-map.js';
import {makeTrack,sampleTrack,parseBlock} from '../src/core.js';

function setup(t){
 const observers=[],markers=[];
 const stub=(name,value)=>{const previous=Object.getOwnPropertyDescriptor(globalThis,name);Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});t.after(()=>{if(previous)Object.defineProperty(globalThis,name,previous);else delete globalThis[name];});};
 class Element {constructor(){this.classList={contains:()=>false};this.dataset={};this.events={};}setAttribute(){}addEventListener(type,fn){this.events[type]=fn;}}
 stub('document',{documentElement:new Element(),body:new Element(),createElement:()=>new Element()});
 class Observer {constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
 stub('ResizeObserver',Observer);stub('MutationObserver',Observer);
 class FakeMap {
  constructor(options){this.options=options;this.events={};this.sources={openmaptiles:{}};this.layers=[];this.scrollZoom={disable(){}};FakeMap.instance=this;}
  on(event,fn){(this.events[event]??=[]).push(fn);}off(event,fn){this.events[event]=this.events[event].filter(x=>x!==fn);}
  fire(event){for(const fn of this.events[event]??[])fn();}
  addControl(){}fitBounds(){}resize(){}setTerrain(value){this.terrain=value;}jumpTo(value){this.camera=value;}
  addSource(id,source){this.sources[id]={...source,diffs:[],features:new Map(),updateData(diff){this.diffs.push(diff);diff.remove.forEach(id=>this.features.delete(id));diff.add.forEach(f=>this.features.set(f.id,f));}};}
  getSource(id){return this.sources[id];}getLayer(id){return this.layers.find(l=>l.id===id);}addLayer(layer){this.layers.push(layer);}
  setStyle(url){this.style=url;this.sources={openmaptiles:{}};this.layers=[];this.fire('style.load');}remove(){this.removed=true;}
 }
 class Marker {constructor(options){this.options=options;markers.push(this);}setLngLat(position){this.position=position;return this;}addTo(){return this;}remove(){this.removed=true;}}
 class Popup {constructor(){Popup.instance=this;}setLngLat(position){this.position=position;return this;}setDOMContent(content){this.content=content;return this;}addTo(){this.open=true;return this;}remove(){this.open=false;}}
 const api={Map:FakeMap,Marker,Popup,NavigationControl:class{},AttributionControl:class{},LngLatBounds:class{extend(){}}};
 const track=makeTrack([Array.from({length:600},(_,i)=>({lat:25+i/10000,lon:121,time:i*1000})),[{lat:26,lon:122,time:700000},{lat:26.01,lon:122.01,time:800000}]]);
 const photo={...sampleTrack(track,.4).position,progress:.4,caption:'河岸'};
 const journey={track,photos:[photo],events:[]};
 return {api,journey,track,photo,observers,markers,map:()=>FakeMap.instance,popup:()=>Popup.instance};
}

test('MapLibre renderer is accepted; data URLs need no key',()=>{
 assert.equal(parseBlock('gpx: a.gpx\nrenderer: maplibre-3d').renderer,'maplibre-3d');
 assert.equal(new URL(TERRAIN_URL).search,'');assert.equal(new URL(MAPLIBRE_STYLES.light).search,'');
});
test('MapLibre preserves segments, bounded trail updates, rewind and photo coordinates',async t=>{
 const f=setup(t);let selected;
 const adapter=createMapLibreMap({},f.journey,item=>selected=item,f.api);t.after(()=>adapter.destroy());
 const map=f.map();map.fire('style.load');map.fire('load');await adapter.ready;
 assert.equal(map.terrain.exaggeration,1);assert.equal(map.getLayer('building-3d').type,'fill-extrusion');assert.equal(map.sources['relive-route'].data.features.length,2);
 assert.equal(map.sources['relive-terrain'].encoding,'terrarium');
 for(const p of [.2,.9,.1,1]){
  const sample=sampleTrack(f.track,p);adapter.update(sample,true);
  assert.deepEqual(f.markers[0].position,[sample.position.lon,sample.position.lat]);
  assert.deepEqual(map.camera.center,f.markers[0].position);
  const edges=[...map.sources['relive-trail'].features.values()].flatMap(f=>f.geometry.coordinates.slice(1).map((p,i)=>[f.geometry.coordinates[i],p])).filter(([a,b])=>a[0]!==b[0]||a[1]!==b[1]);
  const expected=[];for(let i=1;i<=sample.index;i++)if(f.track.points[i-1].segment===f.track.points[i].segment)expected.push([f.track.points[i-1],f.track.points[i]].map(p=>[p.lon,p.lat]));
  const a=f.track.points[sample.index],b=sample.position;if(a.lon!==b.lon||a.lat!==b.lat)expected.push([[a.lon,a.lat],[b.lon,b.lat]]);
  assert.deepEqual(edges,expected);
 }
 adapter.update(sampleTrack(f.track,.5),false);adapter.update(sampleTrack(f.track,.50001),false);
 assert.ok(map.sources['relive-trail'].diffs.at(-1).add.flatMap(f=>f.geometry.coordinates).length<=258);
 const camera=map.camera;adapter.update(sampleTrack(f.track,.6),false);assert.equal(map.camera,camera);
 const content={};adapter.show(f.photo,content);assert.equal(f.popup().content,content);assert.deepEqual(f.popup().position,[f.photo.lon,f.photo.lat]);
 f.markers[1].options.element.events.click();assert.equal(selected,f.photo);adapter.hide();assert.equal(f.popup().open,false);
 document.documentElement.dataset.theme='dark';f.observers[1].fn();assert.equal(map.style,MAPLIBRE_STYLES.dark);assert.ok(map.sources['relive-trail'].features.size>0);
 adapter.destroy();assert.equal(map.removed,true);assert.ok(f.observers.every(o=>o.disconnected));assert.ok(f.markers.every(m=>m.removed));
});
test('MapLibre rejects failed/cancelled initialization and reports later context loss',async t=>{
 const f=setup(t);let error;
 let adapter=createMapLibreMap({},f.journey,()=>{},f.api);f.map().fire('error');await assert.rejects(adapter.ready,/載入失敗/);adapter.destroy();
 adapter=createMapLibreMap({},f.journey,()=>{},f.api);adapter.destroy();await assert.rejects(adapter.ready,/取消/);
 adapter=createMapLibreMap({},f.journey,()=>{},f.api,e=>error=e);f.map().fire('style.load');f.map().fire('load');await adapter.ready;f.map().fire('webglcontextlost');assert.match(error.message,/載入失敗/);adapter.destroy();
});
