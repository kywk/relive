const finite = v => typeof v === 'number' && Number.isFinite(v);
export function coordinates(lat, lon) { return finite(lat) && finite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180; }
export function distance(a, b) {
  const rad = Math.PI / 180, dlat = (b.lat-a.lat)*rad, dlon = (b.lon-a.lon)*rad;
  const h = Math.sin(dlat/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1-h)));
}
export function makeTrack(segments) {
  const points = []; let meters = 0;
  segments.forEach((segment, segmentId) => segment.forEach((p, i) => {
    if (i) meters += distance(segment[i-1], p);
    points.push({...p, segment: segmentId, meters});
  }));
  if (!points.length) throw new Error('軌跡沒有座標');
  const timed = points.every(p => Number.isFinite(p.time)) && points.every((p,i) => !i || p.time >= points[i-1].time) && points.at(-1).time > points[0].time;
  const span = timed ? points.at(-1).time - points[0].time : meters;
  points.forEach((p,i) => p.progress = timed ? (p.time-points[0].time)/span : span ? p.meters/span : i/Math.max(1,points.length-1));
  return {points, meters, timed, elapsed: timed ? span/1000 : null};
}
export function photoTime(value, offset = '+08:00') {
  if (typeof value !== 'string') return NaN;
  let s = value.trim().replace(/^(\d{4}):(\d{2}):(\d{2})[ T]/, '$1-$2-$3T').replace(' ', 'T');
  if (!/(Z|[+-]\d\d:\d\d)$/i.test(s)) s += offset;
  return Date.parse(s);
}
export function matchPhoto(photo, track) {
  const pts = track.points;
  if (track.timed && Number.isFinite(photo.timestamp) && photo.timestamp >= pts[0].time && photo.timestamp <= pts.at(-1).time) {
    const progress = (photo.timestamp-pts[0].time)/(pts.at(-1).time-pts[0].time);
    return {...photo, ...sampleTrack(track,progress).position, progress, matchedBy:'time'};
  }
  if (coordinates(photo.lat, photo.lon)) {
    // Haversine distance is monotonic in h: ranking needs no sqrt/atan2
    // or conversion to meters. Clamp antipodal roundoff like distance(),
    // keeping the first point on ties.
    const rad=Math.PI/180,cosLat=Math.cos(photo.lat*rad);
    let nearest=pts[0],best=Infinity;
    for(const point of pts){
      const h=Math.min(1,Math.sin((point.lat-photo.lat)*rad/2)**2+cosLat*Math.cos(point.lat*rad)*Math.sin((point.lon-photo.lon)*rad/2)**2);
      if(h<best){best=h;nearest=point;}
    }
    return {...photo, progress:nearest.progress, matchedBy:'gps'};
  }
  return {...photo, progress:null, matchedBy:null};
}
export function sampleTrack(track, value) {
  const progress = Math.max(0, Math.min(1, value));
  const pts = track.points;
  let low=0, high=pts.length;
  while (low<high) {const mid=(low+high)>>>1; if (pts[mid].progress<=progress) low=mid+1; else high=mid;}
  const index = Math.max(0, low-1), a = pts[index], b = pts[index+1];
  let position = {...a};
  if (b && b.segment===a.segment && b.progress>a.progress) {
    const t = (progress-a.progress)/(b.progress-a.progress);
    const lonDelta = ((b.lon-a.lon+540)%360)-180;
    position = {...a, lat:a.lat+(b.lat-a.lat)*t, lon:((a.lon+lonDelta*t+540)%360)-180, meters:a.meters+(b.meters-a.meters)*t};
  }
  return {position,index};
}
