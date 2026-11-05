import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import workerSource from '../src/maplibre-worker-source.js';

test('MapLibre worker is self-contained and registered once before map creation',async()=>{
 const result=await build({stdin:{contents:workerSource},bundle:true,write:false,format:'iife',metafile:true});
 assert.deepEqual(Object.values(result.metafile.outputs).flatMap(output=>output.imports),[]);
 // A missing worker previously passed bundler checks but left all tile requests
 // waiting forever. Verify that our registered URL actually contains the worker.
 const {configureMapLibreWorker}=await import('../src/maplibre-worker.js');
 const urls=[];
 const api={setWorkerUrl(url){urls.push(url);}};
 configureMapLibreWorker(api);configureMapLibreWorker(api);
 assert.equal(urls.length,1);
 assert.match(urls[0],/^blob:/);
 assert.equal(await (await fetch(urls[0])).text(),workerSource);
});
test('browser player excludes YAML, XML and EXIF parsers',async()=>{
 const result=await build({entryPoints:['src/player.js'],bundle:true,write:false,format:'esm',metafile:true});
 assert.deepEqual(Object.keys(result.metafile.inputs).filter(p=>/node_modules\/(yaml|fast-xml-parser|exifr)\//.test(p)),[]);
});

test('Obsidian artifact excludes the remote Google runtime while browser adapter stays available', async () => {
 const {execFileSync} = await import('node:child_process');
 const {readFileSync} = await import('node:fs');
 execFileSync(process.execPath, ['scripts/build.mjs'], {stdio:'pipe'});
 const artifact=readFileSync('dist/obsidian/main.js','utf8');
 assert.doesNotMatch(artifact,/maps\.googleapis\.com|__reliveGoogleMapsReady|createElement\(["']script["']\)/);
 assert.match(artifact,/Google 3D is unavailable in Obsidian/);
 const browser=await import('../src/google-map.js');
 const obsidian=await import('../src/google-map-obsidian.js');
 assert.equal(browser.googleMapsSupported,true);
 assert.equal(obsidian.googleMapsSupported,false);
 await assert.rejects(obsidian.loadGoogleMaps(),/Google 3D/);
});
