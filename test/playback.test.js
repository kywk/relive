import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayback} from '../src/playback.js';
import {makeTrack,sampleTrack,parseBlock} from '../src/core.js';
import {timelineLabel} from '../src/timeline.js';

test('route follows every GPX bend even when photos only mark the endpoints',()=>{
 const track=makeTrack([[{lat:0,lon:0,time:0},{lat:1,lon:0,time:10000},{lat:1,lon:1,time:20000},{lat:0,lon:1,time:30000}]]);
 const playback=createPlayback({duration:30,events:[{progress:0},{progress:1}],stopDuration:0});
 playback.advance(10);assert.deepEqual([sampleTrack(track,playback.progress).position.lat,sampleTrack(track,playback.progress).position.lon],[1,0]);
 assert.equal(timelineLabel({track,timezoneOffset:'+00:00'},playback.progress),'00:00:10');
 playback.advance(5);assert.equal(sampleTrack(track,playback.progress).position.lon,.5);
});
test('exact event stop freezes GPX progress then resumes without skipping next event',()=>{
 const p=createPlayback({duration:10,events:[{progress:.2},{progress:.5}]});
 p.advance(9,4);assert.equal(p.progress,.2);assert.equal(p.remaining,3);
 p.advance(2,4);assert.equal(p.progress,.2);assert.equal(p.remaining,1);
 p.advance(1,4);assert.equal(p.stopGroup,null);assert.equal(p.progress,.2);
 p.advance(1,4);assert.equal(p.progress,.5);assert.equal(p.remaining,3);
});
test('simultaneous photo and landmark share one stop; endpoint completes after hold',()=>{
 const p=createPlayback({duration:10,events:[{progress:1,kind:'photo'},{progress:1,kind:'event'}]});
 p.advance(10);assert.equal(p.stopGroup.items.length,2);assert.equal(p.ended,false);
 p.advance(3);assert.equal(p.ended,true);
});
test('pause leaves stop intact, seek cancels it, and rewind enables events again',()=>{
 const p=createPlayback({duration:10,events:[{progress:.2}]});
 p.advance(2);p.advance(1);assert.equal(p.remaining,2);
 p.advance(0);assert.equal(p.remaining,2);
 p.seek(.7);assert.equal(p.stopGroup,null);p.advance(1);assert.ok(p.progress>.7);
 p.seek(0);p.advance(2);assert.equal(p.progress,.2);assert.equal(p.remaining,3);
});
test('start event triggers once and missing events do not affect GPX traversal',()=>{
 const p=createPlayback({duration:10,events:[{progress:0}]});
 p.advance(0);assert.equal(p.remaining,3);p.advance(3);p.advance(1);assert.equal(p.progress,.1);assert.equal(p.stopGroup,null);
 const empty=createPlayback({duration:10});empty.advance(10);assert.equal(empty.ended,true);
});
test('stopDuration defaults and validation',()=>{
 assert.equal(parseBlock('gpx: track.gpx').stopDuration,3);
 assert.equal(parseBlock('gpx: track.gpx\nstopDuration: 0').stopDuration,0);
 for(const value of [-1,61,'oops'])assert.throws(()=>parseBlock(`gpx: track.gpx\nstopDuration: ${value}`));
});
