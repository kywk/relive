import {parseEvents} from './timeline.js';
import {parse} from 'yaml';
import {XMLParser, XMLValidator} from 'fast-xml-parser';

const list = value => value == null ? [] : Array.isArray(value) ? value : [value];
export function assetLink(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('資產連結必須是非空字串');
  const s = value.trim();
  const wiki = s.match(/^!?\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/);
  const md = s.match(/^!?\[[^\]]*\]\((?:<([^>]+)>|([^\s]+))(?:\s+"[^"]*")?\)$/);
  const result = wiki?.[1] ?? md?.[1] ?? md?.[2] ?? s;
  if (/^[a-z][a-z\d+.-]*:/i.test(result) && !/^https?:\/\//i.test(result)) throw new Error('僅支援本機資產或 HTTP(S) URL');
  if (result.startsWith('//')) throw new Error('請使用完整 HTTPS URL');
  return result;
}
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
import {coordinates,photoTime} from './track.js';
export {coordinates,distance,makeTrack,photoTime,matchPhoto,sampleTrack} from './track.js';
export function parseBlock(source) {
  const c = parse(source, {maxAliasCount: 30});
  if (!c || typeof c !== 'object' || Array.isArray(c)) throw new Error('relive 區塊需要 YAML 物件');
  const gpx = list(c.gpx).map(assetLink);
  if (c.raw != null && typeof c.raw !== 'string') throw new Error('raw 請使用 raw: | 後接縮排 XML');
  if (!gpx.length && !c.raw?.trim()) throw new Error('請提供 gpx 或 raw: |');
  const offset = c.timezoneOffset ?? '+08:00';
  if (typeof offset !== 'string' || !/^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(offset)) throw new Error('timezoneOffset 格式為 +08:00');
  const duration = c.duration ?? 60;
  if (!finite(duration) || duration < 1 || duration > 3600) throw new Error('duration 必須介於 1 與 3600 秒');
  const stopDuration=c.stopDuration??3;
  if(!finite(stopDuration)||stopDuration<0||stopDuration>60)throw new Error('stopDuration 必須介於 0 與 60 秒');
  const photos = list(c.photos).map(p => {
    const photo = typeof p === 'string' ? {src: p} : p;
    if (!photo || typeof photo !== 'object') throw new Error('photos 必須為連結或 {src, time, lat, lon}');
    const out = {src: assetLink(photo.src ?? photo.url), caption: String(photo.caption ?? '')};
    if (photo.time != null) {
      if (typeof photo.time !== 'string' || !Number.isFinite(photoTime(photo.time, offset))) throw new Error('相片 time 格式無效');
      out.time = photo.time;
    }
    if (photo.lat != null || photo.lon != null) {
      if (!coordinates(photo.lat, photo.lon)) throw new Error('相片 lat/lon 無效');
      out.lat = photo.lat; out.lon = photo.lon;
    }
    return out;
  });
  const renderer=c.renderer??'leaflet';
  if(!['leaflet','maplibre-3d','google-3d'].includes(renderer))throw new Error('renderer 僅接受 leaflet、maplibre-3d 或 google-3d');
  const events=parseEvents(c.events);
  return {events, renderer, stopDuration, title: String(c.title ?? '旅程回放'), gpx, raw: c.raw ?? '', photos, timezoneOffset: offset, duration};
}
export function parseGpx(xml) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('GPX 不接受 DTD 或 ENTITY');
  if (XMLValidator.validate(xml) !== true) throw new Error('GPX XML 格式無效');
  const root = new XMLParser({ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false}).parse(xml).gpx;
  if (!root) throw new Error('缺少 GPX 根節點');
  const segments = [];
  const add = points => {
    const segment = list(points).map(p => {
      const lat = p['@_lat'] == null || p['@_lat'] === '' ? NaN : Number(p['@_lat']);
      const lon = p['@_lon'] == null || p['@_lon'] === '' ? NaN : Number(p['@_lon']);
      if (!coordinates(lat, lon)) throw new Error('GPX 包含無效座標');
      if (p.time != null && !/(Z|[+-]\d\d:\d\d)$/i.test(p.time)) throw new Error('GPX 時間必須包含時區');
      const time = p.time == null ? undefined : Date.parse(p.time);
      const ele = p.ele == null ? undefined : Number(p.ele);
      if (time !== undefined && !Number.isFinite(time)) throw new Error('GPX 包含無效時間');
      return {lat, lon, time, ele: Number.isFinite(ele) ? ele : undefined};
    });
    if (segment.length) segments.push(segment);
  };
  for (const track of list(root.trk)) for (const seg of list(track.trkseg)) add(seg.trkpt);
  for (const route of list(root.rte)) add(route.rtept);
  if (!segments.length) throw new Error('GPX 沒有 trkpt 或 rtept');
  return segments;
}
