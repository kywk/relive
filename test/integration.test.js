import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {mkdtemp,writeFile,mkdir,symlink,readFile,rm,readdir,realpath} from 'node:fs/promises';
import {compile} from '@mdx-js/mdx';
import remarkRelive,{resolveLocal} from '../src/remark.js';
import {parseBlock} from '../src/core.js';
import {loadJourney} from '../src/load.js';

test('MDX compiles a relive fence with baseUrl and copied image, and excludes server imports',async()=>{
 const staticDir=await mkdtemp(path.join(os.tmpdir(),'relive-static-'));
 try {
  const root=path.resolve('examples/site/docs'),source=await readFile(path.join(root,'index.md'),'utf8');
  const compiled=String(await compile({value:source,path:path.join(root,'index.md')},{remarkPlugins:[[remarkRelive,{vaultRoot:root,staticDir,baseUrl:'/journeys/'}]]}));
  assert.match(compiled,/data-relive/);assert.match(compiled,/%2Fjourneys%2Frelive-assets%2F/);assert.doesNotMatch(compiled,/node:fs/);
  assert.equal((await readdir(path.join(staticDir,'relive-assets'))).length,1);
 }finally{await rm(staticDir,{recursive:true,force:true});}
});
test('asset resolver confines relative paths and symlinks to the vault',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'relive-resolve-'));
 try{
  const root=path.join(temp,'vault');await mkdir(root);await writeFile(path.join(temp,'secret.jpg'),'private');await symlink(path.join(temp,'secret.jpg'),path.join(root,'escape.jpg'));
  const source=path.join(root,'index.md');
  await assert.rejects(resolveLocal('../secret.jpg',source,root));await assert.rejects(resolveLocal('escape.jpg',source,root));
  await writeFile(path.join(root,'ok.gpx'),'ok');assert.equal(await resolveLocal('/ok.gpx',source,root),await realpath(path.join(root,'ok.gpx')));
 }finally{await rm(temp,{recursive:true,force:true});}
});
test('photo failure warns without hiding track, manual metadata works without EXIF',async()=>{
 const config=parseBlock('gpx: ride.gpx\nphotos:\n - src: morning.png\n   time: "2026-10-29T07:05:00+08:00"\n - missing.jpg');
 const journey=await loadJourney(config,async(ref,kind)=>{const buffer=await readFile(path.resolve('examples/site/docs',ref));return {data:kind==='gpx'?buffer.toString():new Uint8Array(buffer),url:ref};});
 assert.equal(journey.photos.length,1);assert.equal(journey.photos[0].progress,.5);assert.equal(journey.photos[0].matchedBy,'time');assert.ok(journey.warnings.some(w=>w.includes('missing.jpg')));
});

test('reads DateTimeOriginal and OffsetTimeOriginal from real EXIF bytes',async()=>{
 // Minimal JPEG APP1 fixture: IFD0 points to EXIF IFD with two ASCII fields.
 const tiff=Buffer.alloc(83);tiff.write('II');tiff.writeUInt16LE(42,2);tiff.writeUInt32LE(8,4);
 tiff.writeUInt16LE(1,8);tiff.writeUInt16LE(0x8769,10);tiff.writeUInt16LE(4,12);tiff.writeUInt32LE(1,14);tiff.writeUInt32LE(26,18);
 tiff.writeUInt16LE(2,26);
 for(const [at,tag,count,offset] of [[28,0x9003,20,56],[40,0x9011,7,76]]){tiff.writeUInt16LE(tag,at);tiff.writeUInt16LE(2,at+2);tiff.writeUInt32LE(count,at+4);tiff.writeUInt32LE(offset,at+8);}
 tiff.write('2026:10:29 07:05:00\0',56);tiff.write('+08:00\0',76);
 const header=Buffer.from([0xff,0xd8,0xff,0xe1,0,91]);
 const jpeg=Buffer.concat([header,Buffer.from('Exif\0\0'),tiff,Buffer.from([0xff,0xd9])]);
 const config=parseBlock('gpx: ride.gpx\ntimezoneOffset: "+00:00"\nphotos: [exif.jpg]');
 const journey=await loadJourney(config,async(ref,kind)=>({data:kind==='gpx'?await readFile('examples/site/docs/ride.gpx','utf8'):new Uint8Array(jpeg),url:ref}));
 assert.equal(journey.photos[0].matchedBy,'time');assert.equal(journey.photos[0].progress,.5);assert.deepEqual(journey.warnings,[]);
});

test('bundle mode emits MDX asset imports without writing files into the vault',async()=>{
 const root=path.resolve('examples/site/docs');
 const source=await readFile(path.join(root,'index.md'),'utf8');
 const result=String(await compile({value:source,path:path.join(root,'index.md')},{remarkPlugins:[[remarkRelive,{vaultRoot:root,assetRoots:[root],assetMode:'bundle'}]]}));
 assert.match(result,/import __reliveAsset0 from/);assert.match(result,/"url": __reliveAsset0/);assert.doesNotMatch(result,/relive-assets/);
});
test('published asset roots deny private references even inside the vault',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'relive-public-'));
 try{
  await mkdir(path.join(temp,'public'));await mkdir(path.join(temp,'private'));await writeFile(path.join(temp,'private','ride.gpx'),'secret');
  await assert.rejects(resolveLocal('../private/ride.gpx',path.join(temp,'public','note.md'),temp,[path.join(temp,'public')]),/assetRoots/);
 }finally{await rm(temp,{recursive:true,force:true});}
});
test('bundle mode preserves remote photo URLs and manual time without fetching',async()=>{
 const root=path.resolve('examples/site/docs');
 const tree={type:'root',children:[{type:'code',lang:'relive',value:'gpx: ride.gpx\nphotos:\n - src: https://example.invalid/photo.jpg\n   time: "2026-10-29T07:05:00+08:00"'}]};
 await remarkRelive({vaultRoot:root,assetRoots:[root],assetMode:'bundle'})(tree,{path:path.join(root,'note.md')});
 const text=JSON.stringify(tree);assert.match(text,/example.invalid/);assert.match(text,/matchedBy/);assert.doesNotMatch(text,/HTTP|fetch failed/);
});

test('short wikilinks search allowed roots and reject ambiguous filenames',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'relive-short-'));
 try{
  for(const dir of ['notes','media/a','media/b'])await mkdir(path.join(temp,dir),{recursive:true});
  const source=path.join(temp,'notes','note.md'),roots=[path.join(temp,'media')];
  await writeFile(path.join(temp,'media/a/ride.gpx'),'first');
  assert.equal(await resolveLocal('[[ride.gpx]]',source,temp,roots),await realpath(path.join(temp,'media/a/ride.gpx')));
  await writeFile(path.join(temp,'media/b/ride.gpx'),'second');
  await assert.rejects(resolveLocal('[[ride.gpx]]',source,temp,roots),/不唯一/);
  assert.equal(await resolveLocal('/media/b/ride.gpx',source,temp,roots),await realpath(path.join(temp,'media/b/ride.gpx')));
 }finally{await rm(temp,{recursive:true,force:true});}
});

test('CommonJS integration compiles through native ESM bridge',async()=>{
 const {default:createIntegration}=await import('../src/integration.cjs');
 const root=path.resolve('examples/shared-vault');
 assert.throws(()=>createIntegration({vaultRoot:root}),/assetRoots/);
 const integration=createIntegration({vaultRoot:root,assetRoots:['media']});
 const output=String(await compile({value:'```relive\ngpx: "[[ride.gpx]]"\n```',path:path.join(root,'backpacker/ride.md')},{remarkPlugins:[integration.remark]}));
 assert.match(output,/data-relive/);assert.ok(integration.plugin[0].endsWith('docusaurus.cjs'));
});
