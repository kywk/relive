import {readFile,writeFile} from 'node:fs/promises';
import {matchPhoto,distance,sampleTrack} from '../../src/track.js';
const rows=JSON.parse(await readFile('docs/performance/slim-quality.json','utf8'));
const stats=a=>{a.sort((a,b)=>a-b);return {count:a.length,median:a[Math.floor((a.length-1)*.5)],p95:a[Math.floor((a.length-1)*.95)],max:a.at(-1)};};
for(const row of rows){
 const base=JSON.parse(await readFile(`.perf/slim/${row.scenario}-full.json`,'utf8')).track;
 const slim=JSON.parse(await readFile(`.perf/slim/${row.scenario}-${row.variant}.json`,'utf8')).track;
 const groups={moving:{seconds:[],meters:[]},pause:{seconds:[],meters:[]}};
 for(let i=0;i<60;i++){
  const p=base.points[Math.floor((i+.37)/60*(base.points.length-1))];
  const gps={lat:p.lat,lon:p.lon};const a=matchPhoto(gps,base),b=matchPhoto(gps,slim);
  const group=(p.progress>.22&&p.progress<.25)||(p.progress>.68&&p.progress<.71)?groups.pause:groups.moving;
  group.seconds.push(Math.abs(a.progress-b.progress)*base.elapsed);
  group.meters.push(distance(sampleTrack(base,a.progress).position,sampleTrack(slim,b.progress).position));
 }
 row.gpsPhotosByPhase=Object.fromEntries(Object.entries(groups).map(([name,v])=>[name,{timeShiftSeconds:stats(v.seconds),cursorErrorMeters:stats(v.meters)}]));
}
await writeFile('docs/performance/slim-quality.json',JSON.stringify(rows,null,2)+'\n');
for(const r of rows)console.log(r.scenario,r.variant,JSON.stringify(r.gpsPhotosByPhase));
