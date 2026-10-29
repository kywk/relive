import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(new URL('../scripts/check-release.mjs', import.meta.url));
function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'relive-release-test-'));
  const write = (name, value) => writeFileSync(join(dir, name), JSON.stringify(value));
  const pkg = {version: '0.1.0', license: 'MIT', repository: {url: 'git+https://github.com/example/relive.git'}};
  write('package.json', pkg);
  write('manifest.json', {version: '0.1.0', minAppVersion: '1.5.0'});
  write('versions.json', {'0.1.0': '1.5.0'});
  write('package-lock.json', {version: '0.1.0', packages: {'': {version: '0.1.0'}}});
  writeFileSync(join(dir, 'LICENSE'), 'Test license');
  const run = (kind, tag) => spawnSync(process.execPath, [script, kind], {cwd: dir, env: {...process.env, RELEASE_TAG: tag, GITHUB_REPOSITORY: 'example/relive'}, encoding: 'utf8'});
  try { fn({write, pkg, run}); } finally { rmSync(dir, {recursive: true, force: true}); }
}
test('release channels require their own exact version tags', () => fixture(({run}) => {
  assert.equal(run('obsidian', '0.1.0').status, 0);
  assert.equal(run('npm', 'npm-v0.1.0').status, 0);
  for (const [kind, tag] of [['obsidian', 'v0.1.0'], ['obsidian', '0.2.0'], ['npm', '0.1.0']]) assert.notEqual(run(kind, tag).status, 0);
}));
test('private packages cannot reach npm publishing', () => fixture(({write, pkg, run}) => {
  write('package.json', {...pkg, private: true});
  assert.match(run('npm', 'npm-v0.1.0').stderr, /Confirm npm package ownership/);
}));
test('stale compatibility and lockfile versions block releases', () => fixture(({write, run}) => {
  write('versions.json', {'0.1.0': '1.4.0'});
  assert.match(run('obsidian', '0.1.0').stderr, /Update versions.json/);
  write('versions.json', {'0.1.0': '1.5.0'});
  write('package-lock.json', {version: '0.0.1'});
  assert.match(run('obsidian', '0.1.0').stderr, /Update package-lock.json/);
}));
test('repository mismatch blocks publishing', () => fixture(({write, pkg, run}) => {
  write('package.json', {...pkg, repository: {url: 'https://github.com/other/relive.git'}});
  assert.match(run('npm', 'npm-v0.1.0').stderr, /Repository metadata/);
}));
