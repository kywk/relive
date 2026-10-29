import {resolveEvents} from './timeline.js';
import exifr from 'exifr';
import {parseGpx, makeTrack, matchPhoto, photoTime} from './core.js';

// read(reference, kind) returns {data: string|ArrayBuffer|Uint8Array, url?: string}.
export async function loadJourney(config, read) {
  const segments = config.raw.trim() ? parseGpx(config.raw) : [];
  for (const ref of config.gpx) segments.push(...parseGpx((await read(ref, 'gpx')).data));
  const track = makeTrack(segments), warnings = [], photos = [];
  for (const p of config.photos) {
    try {
      const asset = await read(p.src, 'photo');
      let tags = {};
      try { if(asset.data!=null)tags = await exifr.parse(asset.data, {reviveValues:false}) ?? {}; }
      catch { warnings.push(`${p.src}：無法讀取 EXIF，可手動提供 time 或 lat/lon`); }
      const timestamp = photoTime(p.time ?? tags.DateTimeOriginal ?? tags.CreateDate, tags.OffsetTimeOriginal ?? config.timezoneOffset);
      const photo = matchPhoto({...p, url:asset.url, timestamp, lat:p.lat ?? tags.latitude, lon:p.lon ?? tags.longitude}, track);
      if (photo.progress === null) warnings.push(`${p.src}：缺少可匹配的拍攝時間／GPS，僅顯示於相片列表`);
      photos.push(photo);
    } catch (error) { warnings.push(`${p.src}：${error.message}`); }
  }
  return {...config, raw:undefined, track, photos, warnings, events:resolveEvents(config.events??[],track,config.timezoneOffset)};
}
