import {photoTime, sampleTrack, coordinates} from './track.js';

export function parseEvents(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error('events 必須為清單');
  return value.map(event => {
    if (!event || typeof event !== 'object' || typeof event.title !== 'string' || !event.title.trim()) throw new Error('每個 event 需要 title');
    if (['at','time','progress'].filter(k=>event[k]!=null).length!==1) throw new Error('event 需擇一提供 at、time 或 progress');
    const result={title:event.title,text:String(event.text??'')};
    if(event.at!=null){
      if(typeof event.at!=='string'||!/^\d{2,}:[0-5]\d:[0-5]\d$/.test(event.at))throw new Error('event at 格式為 HH:MM:SS（自旅程起點經過時間）');
      result.at=event.at;
    }
    if(event.time!=null){if(typeof event.time!=='string'||!Number.isFinite(photoTime(event.time)))throw new Error('event time 格式無效');result.time=event.time;}
    if(event.progress!=null){if(typeof event.progress!=='number'||!Number.isFinite(event.progress)||event.progress<0||event.progress>1)throw new Error('event progress 介於 0 與 1');result.progress=event.progress;}
    if(event.lat!=null||event.lon!=null){if(!coordinates(event.lat,event.lon))throw new Error('event lat/lon 無效');result.lat=event.lat;result.lon=event.lon;}
    return result;
  });
}
export function resolveEvents(events,track,offset){
  return events.map(event=>{
    let progress=event.progress;
    if(progress==null){
      if(!track.timed)throw new Error(`事件「${event.title}」需要完整 GPX 時間；也可改用 progress`);
      const elapsed=event.at!=null?event.at.split(':').reduce((n,v)=>n*60+Number(v),0):(photoTime(event.time,offset)-track.points[0].time)/1000;
      progress=elapsed/track.elapsed;
      if(!Number.isFinite(progress)||progress<0||progress>1)throw new Error(`事件「${event.title}」超出旅程時間範圍`);
    }
    const pos=sampleTrack(track,progress).position;
    return {...event,lat:event.lat??pos.lat,lon:event.lon??pos.lon,progress,kind:'event'};
  });
}
export function elapsedLabel(seconds){const s=Math.max(0,Math.floor(seconds));return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(v=>String(v).padStart(2,'0')).join(':');}
export function timelineLabel(journey,progress,full=false){
  if(!journey.track.timed)return `${elapsedLabel(journey.duration*progress)}${full?'（回放時間）':''}`;
  const offset=journey.timezoneOffset??'+08:00';
  const minutes=(offset[0]==='-'?-1:1)*(Number(offset.slice(1,3))*60+Number(offset.slice(4,6)));
  const date=new Date(journey.track.points[0].time+journey.track.elapsed*1000*progress+minutes*60000).toISOString();
  return full?`${date.slice(0,10)} ${date.slice(11,19)} ${offset}`:date.slice(11,19);
}
