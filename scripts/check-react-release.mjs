import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
const root = new URL('../packages/react-relive/', import.meta.url);
const read = name => JSON.parse(readFileSync(new URL(name, root), 'utf8'));
const pkg = read('package.json'), lock = read('package-lock.json');
assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
assert.equal(pkg.name, '@kywk/react-relive');
assert.equal(lock.version, pkg.version);
assert.equal(lock.packages[''].version, pkg.version);
assert.equal(lock.name, pkg.name);
assert.equal(lock.packages[''].name, pkg.name);
assert.ok(pkg.dependencies['@kywk/relive']);
assert.ok(pkg.peerDependencies.react);
if (process.argv.includes('--publish')) {
  assert.equal(process.env.RELEASE_TAG, `react-relive-v${pkg.version}`, 'React tag must match package version');
  assert.notEqual(pkg.private, true);
  assert.equal(pkg.license, 'MIT');
  assert.ok(statSync(new URL('LICENSE', root)).size > 0);
  assert.equal(pkg.repository.directory, 'packages/react-relive');
  assert.ok(process.env.GITHUB_REPOSITORY, 'Missing publishing repository');
  assert.ok(pkg.repository.url.replace(/\.git$/, '').endsWith(`github.com/${process.env.GITHUB_REPOSITORY}`));
}
console.log(`React Relive ${pkg.version}: metadata verified`);
