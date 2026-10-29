import { SaxesParser } from 'saxes';

export const PRESETS = Object.freeze({
  gentle: Object.freeze({ tolerance: 3, elevation: 2, maxInterval: 30, stopRadius: 3, stopSeconds: 90, slowSpeed: 1.5 }),
  balanced: Object.freeze({ tolerance: 8, elevation: 5, maxInterval: 60, stopRadius: 6, stopSeconds: 60, slowSpeed: 1.5 }),
  aggressive: Object.freeze({ tolerance: 20, elevation: 10, maxInterval: 120, stopRadius: 12, stopSeconds: 45, slowSpeed: 2 }),
});
const GPX_NS = new Set(['', 'http://www.topografix.com/GPX/1/0', 'http://www.topografix.com/GPX/1/1']);
const R = 6371008.8;
const numeric = s => s !== undefined && s.trim() !== '' && Number.isFinite(Number(s)) ? Number(s) : null;
const norm = a => Math.hypot(...a);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
function xyz(lat, lon) {
  const a = lat * Math.PI / 180, b = lon * Math.PI / 180;
  return [R * Math.cos(a) * Math.cos(b), R * Math.cos(a) * Math.sin(b), R * Math.sin(a)];
}
const distance = (a, b) => 2 * R * Math.asin(Math.min(1, norm(sub(a.xyz, b.xyz)) / (2 * R)));

// Validate XML with a namespace-aware parser; edit original source ranges only.
// This preserves retained data, formatting, CDATA, prefixes and unknown extensions.
export function parseGpx(xml) {
  if (typeof xml !== 'string') throw new Error('GPX input must be a UTF-8 string.');
  const parser = new SaxesParser({ xmlns: true });
  const stack = [], segments = [], extensions = [], warnings = new Set();
  let root;
  parser.on('doctype', () => { throw new Error('DOCTYPE is not supported.'); });
  parser.on('error', e => { throw new Error(`Invalid XML: ${e.message}`); });
  parser.on('opentag', tag => {
    const parent = stack.at(-1);
    const node = { local: tag.local, uri: tag.uri, start: xml.lastIndexOf('<', parser.position - 1), text: '', parent };
    if (!parent) {
      root = node;
      if (node.local !== 'gpx' || !GPX_NS.has(node.uri)) throw new Error('Expected a GPX 1.0/1.1 root element.');
      const encoding = parser.xmlDecl.encoding;
      if (encoding && !/^utf-?8$/i.test(encoding)) throw new Error('Only UTF-8 GPX files are supported.');
    }
    const core = node.uri === root.uri;
    if (core && node.local === 'trkseg' && parent?.local === 'trk' && parent.uri === root.uri && parent.parent === root) {
      node.points = []; segments.push(node.points);
    }
    if (core && node.local === 'trkpt' && parent?.points) {
      const lat = numeric(tag.attributes.lat?.value), lon = numeric(tag.attributes.lon?.value);
      if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('Invalid trkpt latitude/longitude.');
      node.point = { start: node.start, lat, lon, xyz: xyz(lat, lon), time: null, ele: null, named: false };
      parent.points.push(node.point);
    }
    stack.push(node);
  });
  parser.on('text', t => { if (stack.length) stack.at(-1).text += t; });
  parser.on('cdata', t => { if (stack.length) stack.at(-1).text += t; });
  parser.on('closetag', () => {
    const node = stack.pop();
    const end = parser.position;
    if (node.point) node.point.end = end;
    if (node.local === 'extensions' && node.uri === root.uri) extensions.push([node.start, end]);
    if (node.parent?.point && node.uri === root.uri) {
      const p = node.parent.point;
      if (node.local === 'time') {
        const value = node.text.trim();
        p.time = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) ? Date.parse(value) / 1000 : null;
        if (!Number.isFinite(p.time)) p.time = null;
      }
      if (node.local === 'ele') p.ele = numeric(node.text);
      if (['name', 'desc', 'cmt', 'sym', 'link'].includes(node.local)) p.named = true;
    }
  });
  parser.write(xml).close();
  if (!segments.some(s => s.length)) warnings.add('No track points found; routes and waypoints are left unchanged.');
  for (const points of segments) {
    if (points.some(p => p.time === null)) warnings.add('Missing/invalid timestamps: affected points use geometry only; timestamp transitions are preserved.');
    if (points.some((p, i) => i && p.time !== null && points[i - 1].time !== null && p.time <= points[i - 1].time)) warnings.add('Non-increasing timestamps found; adjacent points are preserved.');
  }
  return { xml, segments, extensions, warnings: [...warnings] };
}

function prepare(points, config) {
  const anchors = new Set(points.length ? [0, points.length - 1] : []);
  const stopped = new Set();
  let stops = 0, stopDuration = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i], prev = points[i - 1];
    if (p.named) anchors.add(i);
    if (prev && ((p.time === null) !== (prev.time === null) ||
      (p.time !== null && prev.time !== null && (p.time <= prev.time || p.time - prev.time > 300)) ||
      ((p.ele === null) !== (prev.ele === null)))) {
      anchors.add(i - 1); anchors.add(i);
    }
  }
  // Anchor-based radius prevents a slowly creeping cluster from drifting indefinitely.
  for (let i = 0; i < points.length - 1;) {
    if (points[i].time === null) { i++; continue; }
    let j = i + 1;
    while (j < points.length && points[j].time !== null && points[j].time > points[j - 1].time &&
      points[j].time - points[j - 1].time <= 300 && distance(points[i], points[j]) <= config.stopRadius) j++;
    const last = j - 1;
    if (last > i && points[last].time - points[i].time >= config.stopSeconds) {
      anchors.add(i); anchors.add(last); stops++;
      stopDuration += points[last].time - points[i].time;
      for (let k = i + 1; k < last; k++) stopped.add(k);
      i = j;
    } else i++;
  }
  // Retain regular moving-time checkpoints, while allowing long pauses to collapse.
  let checkpoint = 0;
  for (let i = 1; i < points.length; i++) {
    if (anchors.has(i)) checkpoint = i;
    else if (!stopped.has(i) && points[i].time !== null && points[checkpoint].time !== null &&
      points[i].time - points[checkpoint].time >= config.maxInterval) {
      anchors.add(i - 1); anchors.add(i); checkpoint = i;
    }
  }
  const tolerance = points.map((p, i) => {
    const neighbors = [points[i - 1], points[i + 1]].filter(Boolean);
    const slow = neighbors.length && neighbors.every(q => p.time !== null && q.time !== null &&
      Math.abs(p.time - q.time) > 0 && distance(p, q) / Math.abs(p.time - q.time) <= config.slowSpeed);
    return config.tolerance * (slow || stopped.has(i) ? 1 : 0.5);
  });
  return { points, anchors: [...anchors].sort((a, b) => a - b), tolerance, stops, stopDuration };
}

function simplify(prepared, config, scale) {
  const { points, anchors, tolerance } = prepared;
  if (scale === 0) return new Set(points.map((_, i) => i));
  const keep = new Set(anchors), pending = [];
  for (let i = 1; i < anchors.length; i++) pending.push([anchors[i - 1], anchors[i]]);
  while (pending.length) {
    const [a, b] = pending.pop();
    if (b - a < 2) continue;
    const delta = sub(points[b].xyz, points[a].xyz), length2 = dot(delta, delta);
    let worst = 1, index = -1;
    for (let i = a + 1; i < b; i++) {
      const offset = sub(points[i].xyz, points[a].xyz);
      const fraction = length2 ? Math.max(0, Math.min(1, dot(offset, delta) / length2)) :
        (points[b].time > points[a].time && points[a].time !== null ? (points[i].time - points[a].time) / (points[b].time - points[a].time) : (i - a) / (b - a));
      const error = norm(offset.map((v, k) => v - fraction * delta[k]));
      let score = error / (tolerance[i] * scale);
      if ([points[a].ele, points[b].ele, points[i].ele].every(e => e !== null)) {
        const expected = points[a].ele + fraction * (points[b].ele - points[a].ele);
        score = Math.max(score, Math.abs(points[i].ele - expected) / (config.elevation * scale));
      }
      if (score > worst) { worst = score; index = i; }
    }
    if (index !== -1) { keep.add(index); pending.push([a, index], [index, b]); }
  }
  return keep;
}
function removeRanges(xml, ranges) {
  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let cursor = 0;
  const chunks = [];
  for (const [start, end] of ranges) {
    if (end <= cursor) continue;
    chunks.push(xml.slice(cursor, Math.max(cursor, start))); cursor = end;
  }
  chunks.push(xml.slice(cursor));
  return chunks.join('');
}
function length(points) { return points.reduce((sum, p, i) => sum + (i ? distance(points[i - 1], p) : 0), 0); }

export function compressGpx(input, options = {}) {
  const { preset = 'balanced', targetReduction, stripExtensions = false } = options;
  if (!Object.hasOwn(PRESETS, preset)) throw new Error(`Unknown preset: ${preset}`);
  if (targetReduction !== undefined && (!Number.isFinite(targetReduction) || targetReduction < 0 || targetReduction > 100)) throw new Error('targetReduction must be between 0 and 100.');
  const parsed = typeof input === 'string' ? parseGpx(input) : input;
  const config = PRESETS[preset];
  const prepared = parsed.segments.map(p => prepare(p, config));
  const originalPoints = parsed.segments.reduce((n, p) => n + p.length, 0);
  const select = scale => prepared.map(p => simplify(p, config, scale));
  const count = sets => sets.reduce((n, s) => n + s.size, 0);
  let kept = select(1), scale = 1;
  if (targetReduction !== undefined && originalPoints - count(kept) > Math.floor(originalPoints * targetReduction / 100)) {
    const minimum = originalPoints - Math.floor(originalPoints * targetReduction / 100);
    let lo = 0, hi = 1;
    kept = select(0); scale = 0;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2, candidate = select(mid);
      if (count(candidate) >= minimum) { lo = mid; kept = candidate; scale = mid; } else hi = mid;
    }
  }
  const ranges = stripExtensions ? [...parsed.extensions] : [];
  let originalMeters = 0, outputMeters = 0;
  parsed.segments.forEach((points, s) => {
    originalMeters += length(points);
    outputMeters += length(points.filter((_, i) => kept[s].has(i)));
    points.forEach((p, i) => {
      if (!kept[s].has(i)) {
        // Remove indentation on a point-only line, never surrounding meaningful text.
        let lineStart = p.start;
        while (lineStart > 0 && (parsed.xml[lineStart - 1] === ' ' || parsed.xml[lineStart - 1] === '\t')) lineStart--;
        const start = lineStart === 0 || parsed.xml[lineStart - 1] === '\n' ? lineStart : p.start;
        const after = /^(?:[\t ]*\r?\n)/.exec(parsed.xml.slice(p.end));
        ranges.push([start, p.end + (after?.[0].length ?? 0)]);
      }
    });
  });
  const xml = removeRanges(parsed.xml, ranges);
  const remainingPoints = count(kept), removedPoints = originalPoints - remainingPoints;
  const inputBytes = Buffer.byteLength(parsed.xml), outputBytes = Buffer.byteLength(xml);
  return { xml, report: {
    preset, targetReduction: targetReduction ?? null, toleranceScale: scale, config,
    inputPoints: originalPoints, outputPoints: remainingPoints, removedPoints,
    pointReductionPercent: originalPoints ? removedPoints / originalPoints * 100 : 0,
    inputBytes, outputBytes, byteReductionPercent: inputBytes ? (1 - outputBytes / inputBytes) * 100 : 0,
    trackSegments: parsed.segments.length,
    stops: prepared.reduce((s, p) => s + p.stops, 0), stopSeconds: prepared.reduce((s, p) => s + p.stopDuration, 0),
    originalMeters, outputMeters, distanceChangePercent: originalMeters ? (outputMeters / originalMeters - 1) * 100 : 0,
    strippedExtensions: stripExtensions, warnings: [...parsed.warnings,
      ...(targetReduction !== undefined && removedPoints < Math.floor(originalPoints * targetReduction / 100) ? ['Target not fully reached: protected points, error limits or discrete point counts constrain reduction.'] : [])],
  } };
}
