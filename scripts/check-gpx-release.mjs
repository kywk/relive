import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
const root = new URL('../packages/gpx-slim/', import.meta.url);
const read = name => JSON.parse(readFileSync(new URL(name, root), 'utf8'));
const pkg = read('package.json');
const lock = read('package-lock.json');
assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
assert.equal(lock.version, pkg.version, 'Update CLI lockfile version');
assert.equal(lock.packages[''].version, pkg.version);
assert.equal(lock.name, pkg.name, 'Update CLI lockfile name');
assert.equal(lock.packages[''].name, pkg.name);
assert.equal(pkg.bin?.['gpx-slim'], 'bin/gpx-slim.js');
if (process.argv.includes('--publish')) {
  assert.equal(process.env.RELEASE_TAG, `gpx-slim-v${pkg.version}`, 'CLI tag must match its own version');
  assert.notEqual(pkg.private, true);
  assert.ok(pkg.license && pkg.license !== 'UNLICENSED', 'Choose the CLI license before publishing');
  assert.ok(statSync(new URL('LICENSE', root)).size > 0, 'Include CLI LICENSE');
  assert.equal(pkg.repository?.directory, 'packages/gpx-slim');
  assert.ok(process.env.GITHUB_REPOSITORY, 'Missing publishing repository');
  assert.ok(pkg.repository?.url?.replace(/\.git$/, '').endsWith(`github.com/${process.env.GITHUB_REPOSITORY}`), 'Set CLI repository.url to the publishing repository');
}
console.log(`GPX Slim ${pkg.version}: metadata verified`);
