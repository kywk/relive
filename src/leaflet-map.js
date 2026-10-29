import {createTrailChunks} from './trail.js';
import L from 'leaflet';
export function createLeafletMap(host,journey,onSelect){
  const map=L.map(host,{scrollWheelZoom:false});
  map.attributionControl.setPosition('topright');
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  const segments=[];
  for(const p of journey.track.points)(segments[p.segment]??=[]).push([p.lat,p.lon]);
  const full=L.polyline(segments,{smoothFactor:0,className:'relive-route',color:'#718596',weight:4,opacity:.55}).addTo(map);
  map.fitBounds(full.getBounds(),{padding:[30,30],maxZoom:16});
  const trail=createTrailChunks(journey.track,p=>[p.lat,p.lon]);
  const lines=trail.chunks.map(()=>L.polyline([],{smoothFactor:0,className:'relive-trail',color:'#087eaa',weight:5}).addTo(map));
  const start=journey.track.points[0];
  const cursor=L.circleMarker([start.lat,start.lon],{className:'relive-cursor',radius:7,color:'#fff',weight:3,fillColor:'#087eaa',fillOpacity:1}).addTo(map);
  const popup=L.popup({maxWidth:300,minWidth:160,autoPan:false,closeOnClick:false,className:'relive-popup'});
  for(const item of [...journey.photos,...journey.events])if(item.progress!==null){
    L.circleMarker([item.lat,item.lon],{className:item.kind==='event'?'relive-event-pin':'relive-photo-marker',radius:6,color:item.kind==='event'?'#814ec6':'#925428',fillOpacity:.95}).addTo(map).on('click',()=>onSelect(item));
  }
  const observer=new ResizeObserver(()=>map.invalidateSize());observer.observe(host);
  return {
    update({position,index},follow){
      for(const change of trail.update({position,index}))lines[change.index].setLatLngs(change.path);
      cursor.setLatLng([position.lat,position.lon]);
      if(follow){
        const center=map.project([position.lat,position.lon],map.getZoom());
        center.y-=host.clientHeight*.18;
        map.panTo(map.unproject(center,map.getZoom()),{animate:false});
      }
    },
    show(item,content){popup.setLatLng([item.lat,item.lon]).setContent(content).openOn(map);},
    hide(){map.closePopup(popup);},
    destroy(){observer.disconnect();map.remove();}
  };
}
