import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBlock,parseGpx,makeTrack,matchPhoto,photoTime,sampleTrack,assetLink} from '../src/core.js';
const xml='<gpx><trk><trkseg><trkpt lat="25" lon="121"><time>2026-10-29T00:00:00Z</time></trkpt><trkpt lat="25.01" lon="121.01"><time>2026-10-29T00:10:00Z</time></trkpt></trkseg></trk></gpx>';
test('YAML: file lists, quoted wikilinks, inline XML, defaults and validation',()=>{
 const c=parseBlock(`gpx:\n - '[[ride.gpx]]'\nphotos:\n - '![[photo.jpg]]'\nraw: |\n  ${xml}`);
 assert.deepEqual(c.gpx,['ride.gpx']);assert.equal(c.photos[0].src,'photo.jpg');assert.equal(c.timezoneOffset,'+08:00');assert.equal(parseGpx(c.raw)[0].length,2);
 for(const source of ['[]','photos: []','gpx: a\nduration: 0','gpx: a\nphotos: [{src: a, lat: 91, lon: 1}]','gpx: a\nraw: 5'])assert.throws(()=>parseBlock(source));
 assert.equal(assetLink('[trip](<photos/one two.jpg>)'),'photos/one two.jpg');
 assert.throws(()=>assetLink('javascript:alert(1)'));
});
test('GPX validates namespace, coordinates, malformed XML and entities',()=>{
 assert.equal(parseGpx(xml.replaceAll('<gpx>','<gpx xmlns="http://www.topografix.com/GPX/1/1">'))[0].length,2);
 for(const value of ['<gpx>','<gpx/>','<!DOCTYPE gpx><gpx/>','<gpx><rte><rtept lat="91" lon="1"/></rte></gpx>','<gpx><rte><rtept lon="1"/></rte></gpx>']) assert.throws(()=>parseGpx(value));
});
test('EXIF local time is independent of machine timezone and GPS time interpolates',()=>{
 const track=makeTrack(parseGpx(xml));
 assert.equal(photoTime('2026:10:29 08:05:00'),Date.parse('2026-10-29T00:05:00Z'));
 const photo=matchPhoto({timestamp:photoTime('2026:10:29 08:05:00')},track);
 assert.equal(photo.progress,.5);assert.equal(photo.matchedBy,'time');assert.ok(Math.abs(photo.lat-25.005)<1e-10);
 assert.equal(matchPhoto({timestamp:0,lat:25.01,lon:121.01},track).matchedBy,'gps');
 assert.equal(matchPhoto({timestamp:0},track).progress,null);
});
test('separate segments do not contribute gap distance or interpolate across gaps',()=>{
 const track=makeTrack([[{lat:0,lon:0,time:0},{lat:0,lon:.01,time:10}],[{lat:40,lon:40,time:100},{lat:40,lon:40.01,time:110}]]);
 assert.ok(track.meters<2500);assert.equal(sampleTrack(track,.5).position.lat,0);
 assert.equal(sampleTrack(track,1).position.lat,40);
});
test('missing and non-monotonic times use distance progress, stationary tracks work',()=>{
 for(const segments of [[[{lat:0,lon:0},{lat:0,lon:1}]],[[{lat:0,lon:0,time:10},{lat:0,lon:1,time:0}]]]){
  const track=makeTrack(segments);assert.equal(track.timed,false);assert.equal(sampleTrack(track,.5).position.lon,.5);
 }
 const single=makeTrack([[{lat:0,lon:0}]]);assert.equal(sampleTrack(single,1).position.lon,0);
 const dateLine=makeTrack([[{lat:0,lon:179},{lat:0,lon:-179}]]);assert.equal(Math.abs(sampleTrack(dateLine,.5).position.lon),180);
});
