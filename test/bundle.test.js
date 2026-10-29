import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
test('browser player excludes YAML, XML and EXIF parsers',async()=>{
 const result=await build({entryPoints:['src/player.js'],bundle:true,write:false,format:'esm',metafile:true});
 assert.deepEqual(Object.keys(result.metafile.inputs).filter(p=>/node_modules\/(yaml|fast-xml-parser|exifr)\//.test(p)),[]);
});
