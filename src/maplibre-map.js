import {createTrailChunks} from './trail.js';

const coords=p=>[p.lon,p.lat];
const collection=features=>({type:'FeatureCollection',features});
const line=(id,path)=>({type:'Feature',id,properties:{},geometry:{type:'LineString',coordinates:path}});
export const MAPLIBRE_STYLES={light:'https://tiles.openfreemap.org/styles/liberty',dark:'https://tiles.openfreemap.org/styles/fiord'};
export const TERRAIN_URL='https://tiles.mapterhorn.com/tilejson.json';

// Runtime is supplied by the lazy loader; importing this adapter needs no DOM/WebGL.
export function createMapLibreMap(host,journey,onSelect,api,onError=()=>{}){
  const theme=()=>document.documentElement.dataset.theme==='dark'||document.body.classList.contains('theme-dark')?'dark':'light';
  let currentTheme=theme(),disposed=false,loaded=false,settled=false,trail,latest,updateCamera=false;
  let resolveReady,rejectReady;
  const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  const start=journey.track.points[0];
  const map=new api.Map({container:host,style:MAPLIBRE_STYLES[currentTheme],center:coords(start),zoom:13,pitch:60,maxPitch:80,attributionControl:false});
  map.scrollZoom.disable();
  map.addControl(new api.NavigationControl({visualizePitch:true}),'top-left');
  map.addControl(new api.AttributionControl({compact:true}),'top-right');
  const bounds=new api.LngLatBounds();
  journey.track.points.forEach(p=>bounds.extend(coords(p)));
  map.fitBounds(bounds,{padding:{top:50,bottom:150,left:40,right:40},maxZoom:15,pitch:60,duration:0});
  const popup=new api.Popup({closeOnClick:false,focusAfterOpen:false,anchor:'bottom',offset:12,maxWidth:'300px',className:'relive-maplibre-popup'});
  const markers=[];
  function marker(point,className,label,select){
    const element=document.createElement(select?'button':'div');element.className=className;
    if(select){element.type='button';element.setAttribute('aria-label',label);element.addEventListener('click',select);}
    else element.setAttribute('aria-hidden','true');
    const result=new api.Marker({element}).setLngLat(coords(point)).addTo(map);markers.push(result);return result;
  }
  const cursor=marker(start,'relive-3d-cursor');
  for(const item of [...journey.photos,...journey.events])if(item.progress!==null)marker(item,'relive-3d-pin',item.title||item.caption||'相片',()=>onSelect(item));
  function fail(error){
    if(disposed)return;
    clearTimeout(timer);
    const message=error instanceof Error?error:new Error('3D 地圖資料或 WebGL 載入失敗');
    if(!settled){settled=true;rejectReady(message);}else onError(message);
  }
  const timer=setTimeout(()=>fail(new Error('MapLibre 3D 載入逾時，請檢查網路或 WebGL 支援')),20000);
  const onMapError=()=>fail(new Error('MapLibre 底圖或地形載入失敗，請檢查網路與 WebGL 支援'));
  map.on('error',onMapError);
  map.on('webglcontextlost',onMapError);
  function flush(){
    if(!loaded||!latest||disposed)return;
    const changes=trail.update(latest);
    if(changes.length)map.getSource('relive-trail').updateData({
      remove:changes.map(c=>c.index),
      add:changes.filter(c=>c.path.length>=2).map(c=>line(c.index,c.path)),
    });
    cursor.setLngLat(coords(latest.position));
    if(updateCamera)map.jumpTo({center:coords(latest.position)});
  }
  function populate(){
    if(disposed)return;
    loaded=false;
    try{
      map.addSource('relive-terrain',{type:'raster-dem',url:TERRAIN_URL,encoding:'terrarium',tileSize:512,maxzoom:12});
      map.setTerrain({source:'relive-terrain',exaggeration:1});
      if(!map.getLayer('building-3d')&&map.getSource('openmaptiles'))map.addLayer({id:'building-3d',type:'fill-extrusion',source:'openmaptiles','source-layer':'building',minzoom:14,filter:['!', ['has','hide_3d']],paint:{'fill-extrusion-color':'#687f96','fill-extrusion-height':['coalesce',['get','render_height'],6],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':.8}});
      const segments=[];
      for(const p of journey.track.points)(segments[p.segment]??=[]).push(coords(p));
      map.addSource('relive-route',{type:'geojson',data:collection(segments.filter(p=>p.length>=2).map((p,i)=>line(i,p))),tolerance:0});
      map.addLayer({id:'relive-route',type:'line',source:'relive-route',paint:{'line-color':'#768f9a','line-width':4,'line-opacity':.8}});
      map.addSource('relive-trail',{type:'geojson',data:collection([]),tolerance:0});
      map.addLayer({id:'relive-trail',type:'line',source:'relive-trail',paint:{'line-color':'#13a5c2','line-width':6}});
      trail=createTrailChunks(journey.track,coords);loaded=true;flush();
    }catch(error){fail(error);}
  }
  map.on('style.load',populate);
  map.on('load',()=>{if(!settled&&!disposed){clearTimeout(timer);settled=true;resolveReady();}});
  const resize=new ResizeObserver(()=>{if(!disposed)map.resize();});resize.observe(host);
  const themes=new MutationObserver(()=>{
    const next=theme();
    if(!disposed&&next!==currentTheme){currentTheme=next;loaded=false;map.setStyle(MAPLIBRE_STYLES[next],{diff:false});}
  });
  themes.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','class']});
  themes.observe(document.body,{attributes:true,attributeFilter:['class']});
  return {
    ready,
    update(sample,follow){latest=sample;updateCamera=follow;flush();},
    show(item,content){popup.setLngLat(coords(item)).setDOMContent(content).addTo(map);},
    hide(){popup.remove();},
    destroy(){
      if(disposed)return;
      disposed=true;clearTimeout(timer);resize.disconnect();themes.disconnect();
      if(!settled){settled=true;rejectReady(new Error('3D 載入已取消'));}
      map.off('error',onMapError);map.off('webglcontextlost',onMapError);
      popup.remove();markers.forEach(m=>m.remove());map.remove();
    }
  };
}
