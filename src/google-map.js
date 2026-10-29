import {createTrailChunks} from './trail.js';
let pending;
export function loadGoogleMaps(key){
  if(globalThis.google?.maps?.importLibrary)return globalThis.google.maps.importLibrary('maps3d');
  if(!key)return Promise.reject(new Error('請先在 Relive 設定中提供 Google Maps API key，再啟用 Google 3D。'));
  if(!pending)pending=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    const callback='__reliveGoogleMapsReady';
    const finish=(error)=>{clearTimeout(timer);delete globalThis[callback];if(error){script.remove();reject(error);}else resolve();};
    const timer=setTimeout(()=>finish(new Error('Google 3D 載入逾時，請檢查網路與 API key。')),20000);
    globalThis[callback]=()=>finish();
    script.onerror=()=>finish(new Error('無法載入 Google Maps，請檢查網路或內容安全政策。'));
    script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&libraries=maps3d&callback=${callback}`;
    script.async=true;document.head.append(script);
  }).catch(error=>{pending=undefined;throw error;});
  return pending.then(()=>globalThis.google.maps.importLibrary('maps3d'));
}
export function createGoogleMap(host,journey,onSelect,api,onError=()=>{}){
  const {Map3DElement,Polyline3DElement,Marker3DElement,Marker3DInteractiveElement,PopoverElement}=api;
  const coords=p=>({lat:p.lat,lng:p.lon,altitude:0});
  const start=journey.track.points[0];
  const map=new Map3DElement({center:coords(start),range:Math.max(1200,journey.track.meters*1.2),tilt:65,heading:0,mode:'SATELLITE'});
  map.addEventListener('gmp-error',onError);
  map.style.width='100%';map.style.height='100%';host.append(map);
  const segments=[],trails=[];
  const trail=createTrailChunks(journey.track,coords);
  for(const p of journey.track.points)(segments[p.segment]??=[]).push(coords(p));
  for(const path of segments){
    map.append(new Polyline3DElement({path,strokeColor:'#ffffff99',strokeWidth:4,altitudeMode:'CLAMP_TO_GROUND'}));
  }
  for(const chunk of trail.chunks){
    const line=new Polyline3DElement({path:[],strokeColor:'#19c5ff',strokeWidth:7,altitudeMode:'CLAMP_TO_GROUND'});map.append(line);trails.push(line);
  }
  const cursor=new Marker3DElement({position:coords(start),label:'目前位置',altitudeMode:'CLAMP_TO_GROUND'});map.append(cursor);
  const popup=new PopoverElement({autoPanDisabled:true,lightDismissDisabled:true});map.append(popup);
  for(const item of [...journey.photos,...journey.events])if(item.progress!==null){
    const marker=new Marker3DInteractiveElement({position:coords(item),title:item.title||item.caption||'相片',altitudeMode:'CLAMP_TO_GROUND'});
    marker.addEventListener('gmp-click',()=>onSelect(item));map.append(marker);
  }
  return {
    update({position,index},follow){
      for(const change of trail.update({position,index}))trails[change.index].path=change.path;
      cursor.position=coords(position);
      if(follow)map.center=coords(position);
    },
    show(item,content){popup.replaceChildren(content);popup.positionAnchor=coords(item);popup.open=true;},
    hide(){popup.open=false;},
    destroy(){map.removeEventListener('gmp-error',onError);map.remove();host.replaceChildren();}
  };
}
