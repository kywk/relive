import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import assert from 'node:assert/strict';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const destination = resolve('.release/docusaurus');
rmSync(destination, {recursive: true, force: true});
mkdirSync(destination, {recursive: true});
const result = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', destination], {encoding: 'utf8'}));
// npm 12 returns a package-name map; npm 11 returns an array.
const packed = Array.isArray(result) ? result[0] : result[pkg.name];
assert.ok(packed?.filename, 'npm pack did not return a tarball');
const files = new Set(packed.files.map(file => file.path));
for (const entry of ['packages/gpx-slim/src/index.js', 'packages/gpx-slim/package.json', 'packages/gpx-slim/LICENSE', 'LICENSE', 'README.md', 'src/client.js', 'src/styles.css', 'src/remark.cjs', 'src/integration.cjs']) assert.ok(files.has(entry), `Missing ${entry}`);
assert.ok([...files].every(file => !/^(examples|test|docs\/performance|\.github)\//.test(file)), 'Package contains development data');
const consumer = mkdtempSync(join(tmpdir(), 'relive-consumer-'));
try {
  writeFileSync(join(consumer, 'package.json'), '{"private":true,"type":"module"}\n');
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', join(destination, packed.filename)], {cwd: consumer, stdio: 'inherit'});
  const name = JSON.stringify(pkg.name);
  writeFileSync(join(consumer, 'smoke.mjs'), `
    import assert from 'node:assert/strict';
    import {createRequire} from 'node:module';
    const require = createRequire(import.meta.url);
    const name = ${name};
    await import(name);
    const {default:remark}=await import(name + '/remark');
    const xml='<gpx><trk><trkseg>'+Array.from({length:101},(_,i)=>'<trkpt lat="25" lon="121"><time>'+new Date(Date.UTC(2026,0,1,0,0,i)).toISOString()+'</time></trkpt>').join('')+'</trkseg></trk></gpx>';
    const tree={type:'root',children:[{type:'code',lang:'relive',value:'raw: |'+String.fromCharCode(10)+'  '+xml}]};
    const file={path:'consumer.md'};
    await remark({gpxSlim:{preset:'balanced'}})(tree,file);
    assert.ok(file.data.reliveGpxSlim[0].outputPoints<101);
    const journey=JSON.parse(decodeURIComponent(tree.children[0].attributes.find(a=>a.name==='data-relive').value));
    assert.equal(journey.track.points.length,file.data.reliveGpxSlim[0].outputPoints);
    assert.equal(typeof require(name + '/remark'), 'function');
    assert.equal(typeof require(name + '/docusaurus'), 'function');
    const integration = require(name + '/integration')({vaultRoot: process.cwd(), assetRoots: ['media']});
    assert.ok(integration.plugin[0]);
    require.resolve(name + '/player');
    require.resolve(name + '/styles.css');
  `);
  execFileSync(process.execPath, ['smoke.mjs'], {cwd: consumer, stdio: 'inherit'});
  console.log(`Verified ${packed.filename} in an isolated consumer`);
} finally {
  rmSync(consumer, {recursive: true, force: true});
}
