import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';

const json = path => JSON.parse(readFileSync(path, 'utf8'));
const pkg = json('package.json');
const manifest = json('manifest.json');
const versions = json('versions.json');
const kind = process.argv[2] ?? 'check';
assert.match(manifest.version, /^\d+\.\d+\.\d+$/, 'Obsidian version must be x.y.z');
assert.equal(pkg.version, manifest.version, 'Package and manifest versions must agree');
assert.equal(json('package-lock.json').version, pkg.version, 'Update package-lock.json');
assert.equal(json('package-lock.json').packages[''].version, pkg.version);
assert.equal(versions[manifest.version], manifest.minAppVersion, 'Update versions.json');
if (kind !== 'check') {
  assert.ok(['npm', 'obsidian'].includes(kind), 'Unknown release kind');
  const expected = kind === 'npm' ? `npm-v${pkg.version}` : manifest.version;
  assert.equal(process.env.RELEASE_TAG, expected, `Release tag must be ${expected}`);
  assert.ok(statSync('LICENSE').size > 0, 'Choose a license before publishing');
  assert.ok(pkg.repository?.url, 'Set package.json repository.url before publishing');
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo) assert.ok(pkg.repository.url.replace(/\.git$/, '').endsWith(`github.com/${repo}`), 'Repository metadata must match the publishing repository');
  if (kind === 'npm') {
    assert.notEqual(pkg.private, true, 'Confirm npm package ownership and remove private:true');
    assert.ok(pkg.license && pkg.license !== 'UNLICENSED', 'Set the chosen package license');
  }
}
if (process.argv.includes('--assets')) {
  assert.deepEqual(json('dist/obsidian/manifest.json'), manifest);
  for (const asset of ['main.js', 'styles.css']) assert.ok(statSync(`dist/obsidian/${asset}`).size > 0);
}
console.log(`Release metadata verified (${kind})`);
