import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const root = fileURLToPath(new URL('../', import.meta.url));
const cwd = join(root, 'packages/gpx-slim');
const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
const destination = join(root, '.release/gpx-slim');
rmSync(destination, {recursive: true, force: true});
mkdirSync(destination, {recursive: true});
// Run prepack explicitly so test stdout cannot corrupt npm pack JSON.
execFileSync('npm', ['run', 'prepack'], {cwd, stdio: 'inherit'});
const result = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', destination], {cwd, encoding: 'utf8'}));
const packed = Array.isArray(result) ? result[0] : result[pkg.name];
assert.ok(packed?.filename);
const files = new Set(packed.files.map(f => f.path));
for (const path of ['LICENSE', 'bin/gpx-slim.js', 'src/index.js', 'README.md', 'node_modules/saxes/saxes.js', 'node_modules/xmlchars/xmlchars.js']) assert.ok(files.has(path), `Missing ${path}`);
assert.ok([...files].every(f => !/^(test|\.github)\//.test(f) && !f.endsWith('.tgz')));
const consumer = mkdtempSync(join(tmpdir(), 'relive-gpx-consumer-'));
try {
  // A fresh, offline npm cache ensures bundled dependencies are sufficient.
  const env = {...process.env, npm_config_cache: join(consumer, 'cache'), npm_config_offline: 'true', npm_config_update_notifier: 'false'};
  const args = ['exec', '--offline', '--yes', '--ignore-scripts', '--package', join(destination, packed.filename), '--', 'gpx-slim'];
  const run = (...options) => execFileSync('npm', [...args, ...options], {cwd: consumer, env, encoding: 'utf8'});
  assert.match(run('--help'), /gpx-slim/);
  const xml = '<gpx><trk><trkseg>' + Array.from({length: 101}, (_, i) => `<trkpt lat="25" lon="121"><time>${new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString()}</time></trkpt>`).join('') + '</trkseg></trk></gpx>';
  writeFileSync(join(consumer, 'ride.gpx'), xml);
  assert.equal(JSON.parse(run('ride.gpx', '--analyze', '--json')).length, 3);
  assert.equal(existsSync(join(consumer, 'ride.slim.gpx')), false);
  const report = JSON.parse(run('ride.gpx', '--json'));
  assert.equal(report.inputPoints, 101);
  assert.ok(report.outputPoints < report.inputPoints);
  assert.match(readFileSync(join(consumer, 'ride.slim.gpx'), 'utf8'), /<gpx>/);
  assert.equal(readFileSync(join(consumer, 'ride.gpx'), 'utf8'), xml);
  const collision = spawnSync('npm', [...args, 'ride.gpx'], {cwd: consumer, env, encoding: 'utf8'});
  assert.notEqual(collision.status, 0, 'CLI must reject overwriting output');
  console.log(`Verified ${packed.filename}: offline npx analysis, compression, and overwrite protection`);
} finally { rmSync(consumer, {recursive: true, force: true}); }
