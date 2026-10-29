import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('..', import.meta.url));
const destination = resolve(root, '.release/react');
const cache = process.env.npm_config_cache || join(tmpdir(), 'relive-react-npm-cache');
const run = (args, cwd=root) => execFileSync('npm', [...args, '--cache', cache], {cwd, encoding:'utf8'});
execFileSync(process.execPath, ['scripts/check-react-release.mjs'], {cwd:root, stdio:'inherit'});
run(['--prefix','packages/react-relive','test']);
run(['--prefix','packages/react-relive','run','typecheck']);
rmSync(destination, {recursive:true, force:true});
mkdirSync(destination, {recursive:true});
function pack(cwd, name) {
  const result = JSON.parse(run(['pack','--json','--pack-destination',destination], cwd));
  return Array.isArray(result) ? result[0] : result[name];
}
const core = pack(root, '@kywk/relive');
const pkg = pack(join(root,'packages/react-relive'), '@kywk/react-relive');
const files = new Set(pkg.files.map(file=>file.path));
for (const file of ['LICENSE','README.md','src/index.js','src/index.d.ts','src/styles.css']) assert.ok(files.has(file), `Missing ${file}`);
assert.ok([...files].every(file=>!file.startsWith('test/')), 'No test fixtures in published package');
const consumer = mkdtempSync(join(tmpdir(),'react-relive-consumer-'));
try {
  writeFileSync(join(consumer,'package.json'), '{"private":true,"type":"module"}\n');
  // Install both local artifacts: the first core release need not exist on npm yet.
  run(['install','--ignore-scripts','--no-audit','--no-fund',join(destination,core.filename),join(destination,pkg.filename),'react@19.3.1','react-dom@19.3.1','jsdom@24.1.3'], consumer);
  writeFileSync(join(consumer,'smoke.mjs'), `
    import assert from 'node:assert/strict';
    import {createRequire} from 'node:module';
    import {createElement} from 'react';
    import {renderToString} from 'react-dom/server';
    import {Relive,parseGpx,makeTrack} from '@kywk/react-relive';
    assert.equal(typeof window,'undefined');
    const track=makeTrack(parseGpx('<gpx><trk><trkseg><trkpt lat="25" lon="121"/></trkseg></trk></gpx>'));
    assert.match(renderToString(createElement(Relive,{journey:{title:'SSR',track,photos:[],warnings:[],duration:60}})), /<div/);
    const require=createRequire(import.meta.url);
    require.resolve('@kywk/react-relive/styles.css');
    assert.throws(()=>require.resolve('@docusaurus/core'));
    assert.throws(()=>require.resolve('obsidian'));
  `);
  execFileSync(process.execPath,['smoke.mjs'],{cwd:consumer,stdio:'inherit'});
  for (const file of ['player-loader.js','player-double.js']) writeFileSync(join(consumer,file), readFileSync(join(root,'packages/react-relive/test',file)));
  const lifecycle = readFileSync(join(root,'packages/react-relive/test/react.test.js'),'utf8')
    .replace("'../src/index.js'", "'@kywk/react-relive'");
  writeFileSync(join(consumer,'react.test.js'),lifecycle);
  execFileSync(process.execPath,['--test','react.test.js'],{cwd:consumer,stdio:'inherit'});
  // The peer range supports every React 19 minor; verify its lower bound too.
  run(['install','--ignore-scripts','--no-audit','--no-fund','react@19.0.0','react-dom@19.0.0'], consumer);
  execFileSync(process.execPath,['smoke.mjs'],{cwd:consumer,stdio:'inherit'});
  execFileSync(process.execPath,['--test','react.test.js'],{cwd:consumer,stdio:'inherit'});
  console.log(`Verified ${pkg.filename}: React 19.0.0/19.3.1 isolated SSR and lifecycle without Docusaurus/Obsidian`);
} finally {
  rmSync(consumer,{recursive:true,force:true});
  rmSync(join(destination,core.filename),{force:true});
}
