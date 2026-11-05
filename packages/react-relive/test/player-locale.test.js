import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {timelineLabel} from '../../../src/timeline.js';

// Use the React package's existing DOM test dependency; no new runtime dependency.
const require = createRequire(new URL('../package.json', import.meta.url));
const {JSDOM} = require('jsdom');

test('player localizes controls, photo stops and captions while retaining Chinese by default', async t => {
  const dom = new JSDOM('<div id="host"></div>', {url:'https://example.test/'});
  const originals = new Map();
  const set = (name,value) => {originals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,writable:true,configurable:true});};
  for (const name of ['window','document','navigator','HTMLElement','Element','AbortController']) set(name,dom.window[name]);
  set('ResizeObserver',class {observe(){} disconnect(){}});
  let callback;
  set('requestAnimationFrame',fn=>{callback=fn;return 1;});set('cancelAnimationFrame',()=>{});
  let dispose;
  t.after(()=>{dispose?.();dom.window.close();for(const [name,original] of originals){if(original)Object.defineProperty(globalThis,name,original);else delete globalThis[name];}});
  dom.window.SVGSVGElement.prototype.createSVGRect = () => ({});
  const {mountPlayer}=await import('../../../src/player.js');
  const {makeTrack}=await import('../../../src/track.js');
  const track=makeTrack([[{lat:25,lon:121},{lat:25.01,lon:121.01}]]);
  const host=document.querySelector('#host');
  const journey={title:'Example',track,photos:[{src:'photo.jpg',url:'photo.jpg',lat:25,lon:121,progress:0}],events:[],warnings:[],duration:40};
  dispose=mountPlayer(host,journey);
  assert.equal(host.querySelector('.relive-play').getAttribute('aria-label'),'播放');
  assert.match(host.querySelector('summary').textContent,/相片集錦/);
  dispose();
  dispose=mountPlayer(host,{...journey,locale:'en'});
  assert.equal(host.querySelector('.relive-play').getAttribute('aria-label'),'Play');
  assert.equal(host.querySelector('.relive-map-mode select').getAttribute('aria-label'),'Map mode');
  assert.equal(host.querySelector('summary').textContent,'Photos · 1');
  host.querySelector('.relive-play').click();
  assert.equal(host.querySelector('.relive-play').getAttribute('aria-label'),'Pause');
  callback(100);callback(200);
  assert.match(host.querySelector('.relive-stop-label').textContent,/Photo stop/);
  host.querySelector('.relive-play').click();
  assert.equal(host.querySelector('.relive-play').getAttribute('aria-label'),'Play');
  host.querySelector('.relive-gallery button').click();
  assert.match(host.textContent,/Journey photo/);
});

test('untimed timeline descriptions follow the requested language',()=>{
  const journey={track:{timed:false},duration:40};
  assert.equal(timelineLabel(journey,.5,true),'00:00:20（回放時間）');
  assert.equal(timelineLabel({...journey,locale:'en'},.5,true),'00:00:20 (replay time)');
});
