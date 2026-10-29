import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {mkdtemp, writeFile, readFile, readdir, rm} from 'node:fs/promises';
import {compile} from '@mdx-js/mdx';
import {build} from 'esbuild';
import remarkRelive from '../src/remark.js';
import {gpxSlimOptions} from '../src/gpx-slim.js';
import {compressGpx} from '../packages/gpx-slim/src/index.js';
import {parseBlock, parseGpx} from '../src/core.js';
import {loadJourney} from '../src/load.js';

const start = Date.UTC(2026, 0, 1);
const xml = '<gpx><trk><trkseg>' + Array.from({length: 121}, (_, i) => `<trkpt lat="25" lon="${121+i*.00001}"><time>${new Date(start+i*1000).toISOString()}</time></trkpt>`).join('') + '</trkseg></trk></gpx>';
async function fixture(fn) {
 const root=await mkdtemp(path.join(os.tmpdir(),'relive-slim-build-'));
 await writeFile(path.join(root,'ride.gpx'),xml);
 try {await fn(root);} finally {await rm(root,{recursive:true,force:true});}
}
async function transform(root, gpxSlim, value='gpx: ride.gpx') {
 const tree={type:'root',children:[{type:'code',lang:'relive',value}]};
 const file={path:path.join(root,'note.md')};
 await remarkRelive({vaultRoot:root,assetRoots:[root],gpxSlim})(tree,file);
 const journey=JSON.parse(decodeURIComponent(tree.children[0].attributes.find(a=>a.name==='data-relive').value));
 return {journey,file};
}

test('website compression matches CLI presets and ratios; original and host loader remain intact',()=>fixture(async root=>{
 for(const preset of ['gentle','balanced','aggressive'])for(const targetReduction of [0,50,90]){
  const options={preset,targetReduction};
  const {journey,file}=await transform(root,options);
  assert.equal(journey.track.points.length,parseGpx(compressGpx(xml,options).xml).flat().length);
  assert.equal(file.data.reliveGpxSlim[0].inputPoints,121);
  assert.ok(file.data.reliveGpxSlim[0].pointReductionPercent<=targetReduction);
  assert.equal(journey.track.points[0].time,start);
  assert.equal(journey.track.points.at(-1).time,start+120000);
 }
 assert.equal((await transform(root,true)).file.data.reliveGpxSlim[0].preset,'balanced');
 for(const option of [undefined,false]){
  const {journey,file}=await transform(root,option);
  assert.equal(journey.track.points.length,121);assert.equal(file.data,undefined);
 }
 // Obsidian uses this shared host loader, without the website-only preprocessing.
 const original=await loadJourney(parseBlock('gpx: ride.gpx'),async()=>({data:xml}));
 assert.equal(original.track.points.length,121);
 assert.equal(await readFile(path.join(root,'ride.gpx'),'utf8'),xml);
 assert.deepEqual(await readdir(root),['ride.gpx']);
}));

test('inline GPX is compressed and photo/event time anchors retain their progress',()=>fixture(async root=>{
 const source=`raw: |\n  ${xml}\nphotos:\n - src: https://example.invalid/photo.jpg\n   time: '2026-01-01T00:01:00Z'\nevents:\n - time: '2026-01-01T00:01:00Z'\n   title: Midpoint`;
 // Bundle mode keeps remote photos as references without network requests.
 const file={path:path.join(root,'note.md')};
 const tree={type:'root',children:[{type:'code',lang:'relive',value:source}]};
 await remarkRelive({vaultRoot:root,assetMode:'bundle',gpxSlim:true})(tree,file);
 assert.ok(file.data.reliveGpxSlim[0].outputPoints<121);
 assert.equal(file.data.reliveGpxSlim[0].source,'inline raw');
 // Compare time matching through the same loader after preprocessing.
 const config=parseBlock(source);config.raw=compressGpx(config.raw).xml;
 const journey=await loadJourney(config,async()=>({url:'https://example.invalid/photo.jpg',data:null}));
 assert.equal(journey.photos[0].progress,.5);assert.equal(journey.events[0].progress,.5);
}));

test('CommonJS integration forwards options and compiles compressed bundle MDX',()=>fixture(async root=>{
 const {default:createIntegration}=await import('../src/integration.cjs');
 const integration=createIntegration({vaultRoot:root,assetRoots:['.'],gpxSlim:{preset:'gentle',targetReduction:70}});
 const result=await compile({path:path.join(root,'note.md'),value:'```relive\ngpx: ride.gpx\n```'},{remarkPlugins:[integration.remark]});
 assert.ok(result.data.reliveGpxSlim[0].outputPoints<121);
 assert.doesNotMatch(String(result),/SaxesParser|compressGpx|node:fs|trkpt/);
 assert.equal(await readFile(path.join(root,'ride.gpx'),'utf8'),xml);
}));

test('bad compression options fail clearly; malformed GPX identifies the source note',()=>fixture(async root=>{
 for(const value of [null,[],1,'balanced',{preset:'toString'},{preset:'extreme'},{targetReduction:-1},{targetReduction:101},{targetReduction:NaN},{targetReduction:'70'},{reduction:70}])assert.throws(()=>gpxSlimOptions(value),/gpxSlim/);
 await writeFile(path.join(root,'ride.gpx'),'<gpx><broken>');
 await assert.rejects(transform(root,true),/note.md.*relive/);
}));

test('slimming preserves separate segments and reports unattainable reduction',()=>fixture(async root=>{
 const small='<gpx><trk><trkseg><trkpt lat="1" lon="1"/><trkpt lat="2" lon="2"/></trkseg><trkseg><trkpt lat="3" lon="3"/><trkpt lat="4" lon="4"/></trkseg></trk></gpx>';
 await writeFile(path.join(root,'ride.gpx'),small);
 const {journey,file}=await transform(root,{targetReduction:99});
 assert.deepEqual(journey.track.points.map(p=>p.segment),[0,0,1,1]);
 assert.ok(file.data.reliveGpxSlim[0].warnings.some(w=>w.includes('Target not fully reached')));
}));

test('Obsidian and browser bundles exclude the build-time slimming engine',async()=>{
 for(const entry of ['src/obsidian.ts','src/player.js']){
  const result=await build({entryPoints:[entry],bundle:true,write:false,format:'cjs',external:['obsidian'],metafile:true});
  assert.deepEqual(Object.keys(result.metafile.inputs).filter(p=>/gpx-slim|saxes|xmlchars/.test(p)),[]);
 }
});
