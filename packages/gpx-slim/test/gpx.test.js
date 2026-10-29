import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { compressGpx, parseGpx } from '../src/index.js';
const time = s => new Date(Date.UTC(2026, 0, 1) + s * 1000).toISOString();
const pt = (x, y = 0, s, extra = '') => `<trkpt lat="${y}" lon="${x}">${s === undefined ? '' : `<time>${time(s)}</time>`}${extra}</trkpt>`;
const gpx = (s, extra = '') => `<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="test">${extra}<trk><trkseg>${s}</trkseg></trk></gpx>`;
const points = xml => parseGpx(xml).segments.flat();
test('long stationary recording collapses but preserves exact start/end times', () => {
  const input = gpx(Array.from({ length: 601 }, (_, i) => pt(121, 25, i)).join(''));
  const result = compressGpx(input);
  assert.equal(result.report.outputPoints, 2);
  assert.equal(result.report.stopSeconds, 600);
  assert.deepEqual(points(result.xml).map(p => p.time), [points(input)[0].time, points(input).at(-1).time]);
});
test('slow straight motion is reduced, checkpoints and endpoints survive', () => {
  const input = gpx(Array.from({ length: 201 }, (_, i) => pt(i * .000005, 0, i)).join(''));
  const result = compressGpx(input);
  const output = points(result.xml);
  assert.ok(output.length < 30);
  assert.equal(output[0].lon, 0); assert.equal(output.at(-1).lon, .001);
  for (let i = 1; i < output.length; i++) assert.ok(output[i].time - output[i - 1].time <= 60);
});
test('hairpin and closed loop retain turning points', () => {
  for (const coords of [[[0,0],[.01,0],[0,0]], [[0,0],[.01,0],[.01,.01],[0,.01],[0,0]]]) {
    const input = gpx(coords.map(([x,y]) => pt(x,y)).join(''));
    assert.equal(points(compressGpx(input).xml).length, coords.length);
  }
});
test('elevation peak is retained even on a straight track', () => {
  const input = gpx([0,1,2].map((v,i) => pt(v * .0001,0,i,`<ele>${i === 1 ? 100 : 0}</ele>`)).join(''));
  assert.equal(points(compressGpx(input).xml).length, 3);
});
test('segments and single-point segments are kept separate', () => {
  const xml = gpx(pt(0)).replace('</trkseg>', `</trkseg><trkseg>${pt(1)}${pt(2)}</trkseg><trkseg/>`);
  assert.deepEqual(parseGpx(compressGpx(xml).xml).segments.map(s => s.length), [1,2,0]);
});
test('metadata, routes, waypoints, sensors, CDATA, emoji and CRLF preserved', () => {
  const extra = '<metadata><name><![CDATA[台灣😀 <walk>]]></name></metadata><wpt lat="1" lon="2"/><rte><rtept lat="2" lon="3"/></rte>';
  const sensor = '<extensions><x:hr xmlns:x="urn:hr">88</x:hr></extensions>';
  const input = gpx([pt(0,0,0,sensor),pt(.0001,0,1),pt(.0002,0,2,sensor)].join('\r\n'),extra);
  const result = compressGpx(input);
  assert.ok(result.xml.includes(extra)); assert.equal(result.xml.match(/<x:hr /g).length, 2);
  assert.equal(points(result.xml).length, 2);
  const stripped = compressGpx(input, { stripExtensions: true });
  assert.ok(!stripped.xml.includes('<extensions>')); parseGpx(stripped.xml);
});
test('namespace-prefixed points and self-closing points work', () => {
  const xml = '<g:gpx xmlns:g="http://www.topografix.com/GPX/1/1"><g:trk><g:trkseg><g:trkpt lat="0" lon="0"/><g:trkpt lat="0" lon="0.0001"/><g:trkpt lat="0" lon="0.0002"/></g:trkseg></g:trk></g:gpx>';
  assert.equal(points(compressGpx(xml).xml).length, 2);
});
test('foreign trkpt elements are never interpreted as GPX points', () => {
  const xml = gpx(pt(0), '<extensions><x:trkpt xmlns:x="urn:foreign" lat="bad"/></extensions>');
  assert.ok(compressGpx(xml).xml.includes('lat="bad"'));
});
test('timestamp reversal, duplicates, gaps and transitions are protected', () => {
  for (const timestamps of [[0,1,1,2],[0,2,1,3],[0,1,900,901],[0,undefined,2,3]]) {
    const input = gpx(timestamps.map((t,i) => pt(i * .00001,0,t)).join(''));
    assert.equal(points(compressGpx(input).xml).length,4);
  }
});
test('named points survive', () => {
  const input = gpx(pt(0) + pt(.0001,0,undefined,'<name>landmark</name>') + pt(.0002));
  assert.equal(points(compressGpx(input).xml).length, 3);
});
test('missing timestamps still allow geometric reduction', () => {
  const r = compressGpx(gpx(pt(0) + pt(.0001) + pt(.0002)));
  assert.equal(r.report.outputPoints,2); assert.ok(r.report.warnings.length);
});
test('dateline crossing and polar tracks remain finite and simplify', () => {
  for (const lat of [0,89.99]) {
    const r = compressGpx(gpx(pt(179.999,lat) + pt(180,lat) + pt(-179.999,lat)));
    assert.equal(r.report.outputPoints,2); assert.ok(Number.isFinite(r.report.outputMeters));
  }
});
test('0% is byte-for-byte unchanged; targets never exceed requested removal', () => {
  const input = gpx(Array.from({ length: 100 }, (_,i) => pt(i * .000001,0,i)).join(''));
  assert.equal(compressGpx(input,{targetReduction:0}).xml,input);
  for (const targetReduction of [1,20,50,80,100]) {
    const r = compressGpx(input,{targetReduction});
    assert.ok(r.report.removedPoints <= Math.floor(targetReduction));
    assert.ok(r.report.outputPoints >= 2);
  }
});
test('unattainable target reports limits', () => {
  const r = compressGpx(gpx(pt(0)+pt(1)),{targetReduction:90});
  assert.ok(r.report.warnings.some(w => w.includes('Target not fully reached')));
});
test('reject malformed XML, invalid coordinates, DTD and unsupported encoding', () => {
  for (const xml of ['<gpx><trk></gpx>', gpx('<trkpt lat="NaN" lon="0"/>'), gpx('<trkpt lat="" lon="0"/>'), '<!DOCTYPE gpx><gpx/>', '<gpx xmlns="urn:wrong"/>', '<?xml version="1.0" encoding="UTF-16"?><gpx/>']) assert.throws(() => compressGpx(xml));
});
test('invalid CLI/API configuration is rejected', () => {
  for (const targetReduction of [-1,101,NaN,Infinity]) assert.throws(() => compressGpx(gpx(pt(0)),{targetReduction}));
  assert.throws(() => compressGpx(gpx(pt(0)),{preset:'toString'}));
});
test('empty tracks and waypoint-only GPX preserved', () => {
  const xml = '<gpx><wpt lat="1" lon="2"/></gpx>';
  assert.equal(compressGpx(xml).xml,xml);
  assert.equal(compressGpx(gpx('')).report.outputPoints,0);
});
test('CLI analysis, write, collision, symlink safety and invalid UTF-8', async () => {
  const dir = await mkdtemp(join(tmpdir(),'gpx-slim-test-'));
  const cli = (...args) => spawnSync(process.execPath,['bin/gpx-slim.js',...args],{encoding:'utf8'});
  try {
    const input = join(dir,'input.gpx'), output = join(dir,'input.slim.gpx');
    const xml = gpx(pt(0)+pt(.0001)+pt(.0002)); await writeFile(input,xml);
    const analysis = cli(input,'--analyze','--json'); assert.equal(analysis.status,0,analysis.stderr);
    assert.equal(JSON.parse(analysis.stdout).length,3);
    await assert.rejects(readFile(output));
    assert.equal(cli(input,'--dry-run').status,0); await assert.rejects(readFile(output));
    assert.equal(cli(input).status,0); assert.equal(points(await readFile(output,'utf8')).length,2);
    assert.equal(cli(input).status,1); assert.equal(cli(input,'-o',input).status,1);
    assert.equal(await readFile(input,'utf8'),xml);
    const link = join(dir,'link.gpx'); await symlink(input,link);
    assert.equal(cli(input,'-o',link).status,1);
    assert.equal(cli(input,'--reduction','NaN').status,1);
    assert.equal(cli(input,'--analyze','--reduction','50').status,1);
    await writeFile(join(dir,'bad.gpx'),Buffer.from([0xff,0xfe]));
    assert.equal(cli(join(dir,'bad.gpx')).status,1);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
