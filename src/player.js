import {createPlayback} from './playback.js';
import {sampleTrack} from './track.js';
import {timelineLabel,elapsedLabel} from './timeline.js';
import {createLeafletMap} from './leaflet-map.js';
import {loadGoogleMaps,createGoogleMap} from './google-map.js';

export function mountPlayer(host,journey,options={}){
  journey.events??=[];
  host.replaceChildren();host.classList.add('relive-player');
  const el=(tag,parent,text,className)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;parent.append(node);return node;};
  const header=el('div',host,'','relive-header');el('strong',header,journey.title);
  el('span',header,`${(journey.track.meters/1000).toFixed(2)} km${journey.track.elapsed==null?'':` · ${elapsedLabel(journey.track.elapsed)}`}`);
  const mode=el('button',header,'Google 3D');mode.type='button';mode.setAttribute('aria-label','切換 Google 3D 地圖');
  const viewport=el('div',host,'','relive-viewport');
  const mapEl=el('div',viewport,'','relive-map');mapEl.setAttribute('aria-label','旅程軌跡地圖');
  const status=el('p',host,'','relive-map-status');status.hidden=true;status.setAttribute('role','status');
  const overlay=el('div',viewport,'','relive-overlay');
  const visibilityEvents=new AbortController();
  const listen=(target,type,handler)=>target.addEventListener(type,handler,{signal:visibilityEvents.signal});
  let hideTimer, pointerInside=false, dragging=false, keyboardMode=false;
  const showControls=()=>{clearTimeout(hideTimer);viewport.classList.remove('controls-hidden');};
  const scheduleHide=()=>{
    clearTimeout(hideTimer);
    if(pointerInside||dragging||(keyboardMode&&overlay.contains(document.activeElement)))return;
    hideTimer=setTimeout(()=>viewport.classList.add('controls-hidden'),2000);
  };
  listen(viewport,'pointerenter',()=>{pointerInside=true;showControls();});
  listen(viewport,'pointerleave',event=>{pointerInside=false;if(event.pointerType!=='touch')scheduleHide();});
  listen(viewport,'pointerdown',()=>{dragging=true;showControls();});
  listen(document,'pointerdown',()=>{keyboardMode=false;});
  listen(document,'pointerup',event=>{if(dragging){dragging=false;if(event.pointerType!=='touch')scheduleHide();}});
  listen(document,'pointercancel',event=>{dragging=false;if(event.pointerType!=='touch')scheduleHide();});
  listen(document,'keydown',event=>{if(event.key==='Tab'||overlay.contains(document.activeElement)){keyboardMode=true;if(overlay.contains(document.activeElement))showControls();}});
  listen(overlay,'focusin',showControls);
  listen(overlay,'focusout',()=>{queueMicrotask(()=>{if(!visibilityEvents.signal.aborted)scheduleHide();});});
  const controls=el('div',overlay,'','relive-controls');
  const play=el('button',controls,'▶','relive-play');play.type='button';play.setAttribute('aria-label','播放');play.title='播放';
  const current=el('output',controls,`${timelineLabel(journey,0)} / ${timelineLabel(journey,1)}`,'relive-clock');
  const stopLabel=el('span',controls,'','relive-stop-label');stopLabel.hidden=true;stopLabel.setAttribute('role','status');
  const speed=el('select',controls);speed.setAttribute('aria-label','播放速度');
  for(const n of [.5,1,2,4]){const opt=el('option',speed,`${n}×`);opt.value=String(n);opt.selected=n===1;}
  const followLabel=el('label',controls,'','relive-follow');const follow=el('input',followLabel);follow.type='checkbox';follow.checked=true;followLabel.append('跟隨');
  const timeline=el('div',overlay,'','relive-timeline');
  const marks=el('div',timeline,'','relive-timeline-marks');
  const slider=el('input',timeline);slider.type='range';slider.min='0';slider.max='10000';slider.step='1';slider.value='0';slider.setAttribute('aria-label','旅程時間軸');
  const ticks=el('div',timeline,'','relive-timeline-ticks');
  for(const p of [0,.25,.5,.75,1])el('span',ticks,timelineLabel(journey,p));
  const items=[...journey.photos.map(p=>({...p,kind:'photo'})),...journey.events];
  const timed=items.filter(p=>p.progress!==null).sort((a,b)=>a.progress-b.progress);
  const playback=createPlayback({duration:journey.duration,stopDuration:journey.stopDuration??3,events:timed});
  let progress=0,playing=false,frame=0,previous=0,active=-1,disposed=false,mapMode='leaflet',switchId=0;
  let adapter=createLeafletMap(mapEl,journey,select);
  let renderedAdapter,lastMapProgress,lastClock;
  const endLabel=timelineLabel(journey,1);
  function contentFor(group){
    const content=document.createElement('div');content.className='relive-bubble';
    for(const item of group){
      const section=el('section',content);
      if(item.url){const img=el('img',section);img.decoding='async';img.src=item.url;img.alt=item.caption||'旅程相片';}
      el('strong',section,item.title||item.caption||'旅程相片');
      if(item.text)el('p',section,item.text);
      el('small',section,item.progress===null?'未定位相片（顯示於目前位置）':timelineLabel(journey,item.progress,true));
    }
    return content;
  }
  function render(updateCamera=true){
    if(renderedAdapter!==adapter||lastMapProgress!==progress){
      adapter.update(sampleTrack(journey.track,progress),updateCamera&&follow.checked);
      renderedAdapter=adapter;lastMapProgress=progress;
      slider.value=String(Math.round(progress*10000));slider.style.setProperty('--relive-progress',`${progress*100}%`);
    }
    const label=timelineLabel(journey,progress,true);
    if(lastClock!==label){
      lastClock=label;current.textContent=`${timelineLabel(journey,progress)} / ${endLabel}`;current.title=label;slider.setAttribute('aria-valuetext',label);
    }
    const group=playback.stopGroup;
    stopLabel.hidden=!group;
    const remainingLabel=group?`停留 ${Math.ceil(playback.remaining)} 秒`:'';
    if(stopLabel.textContent!==remainingLabel)stopLabel.textContent=remainingLabel;
    const next=group??null;
    if(next!==active){active=next;if(group)adapter.show(group.items[0],contentFor(group.items));else adapter.hide();}
  }

  function pause(){playing=false;viewport.classList.remove('is-playing');play.textContent='▶';play.setAttribute('aria-label','播放');play.title='播放';cancelAnimationFrame(frame);}
  function select(item){pause();playback.seek(progress);if(item.progress!==null){playback.seek(item.progress);progress=playback.progress;}render();adapter.show(item.progress===null?sampleTrack(journey.track,progress).position:item,contentFor([item]));}
  function tick(now){
    if(disposed||!playing)return;
    playback.advance(previous?(now-previous)/1000:0,Number(speed.value));previous=now;
    progress=playback.progress;render();
    if(playback.ended)pause();else frame=requestAnimationFrame(tick);
  }
  play.onclick=()=>{
    if(playing){pause();return;}
    if(playback.ended){playback.seek(0);progress=0;}
    playing=true;active=-1;viewport.classList.add('is-playing');previous=0;play.textContent='Ⅱ';play.setAttribute('aria-label','暫停');play.title='暫停';frame=requestAnimationFrame(tick);
  };
  slider.oninput=()=>{playback.seek(Number(slider.value)/10000);progress=playback.progress;previous=0;render();
    const at=timed.filter(item=>Math.abs(item.progress-progress)<1e-8);
    if(at.length)adapter.show(at[0],contentFor(at));
  };
  for(const item of timed){const marker=el('button',marks,item.kind==='event'?'◆':'●');marker.type='button';marker.style.left=`${item.progress*100}%`;marker.className=`relive-time-marker ${item.kind==='event'?'relive-event-marker':''}`;marker.setAttribute('aria-label',`${timelineLabel(journey,item.progress)} ${item.title||item.caption||'相片'}`);marker.title=marker.getAttribute('aria-label');marker.onclick=()=>select(item);}
  const album=el('details',host,'','relive-album');album.open=true;album.hidden=!journey.photos.length;
  el('summary',album,`相片集錦 · ${journey.photos.length} 張`);
  const albumTools=el('label',album,'縮圖大小','relive-album-tools');
  const size=el('input',albumTools);size.type='range';size.min='72';size.max='220';size.value='120';size.step='4';size.setAttribute('aria-label','相片縮圖大小');
  size.oninput=()=>{album.style.setProperty('--relive-thumb-size',`${size.value}px`);size.setAttribute('aria-valuetext',`${size.value} 像素`);};
  const gallery=el('div',album,'','relive-gallery');
  for(const item of journey.photos){const button=el('button',gallery);button.type='button';button.title=item.caption||item.src;const img=el('img',button);img.decoding='async';img.src=item.url;img.alt=item.caption||item.src;img.loading='lazy';button.onclick=()=>select(item);}
  const eventList=el('div',host,'','relive-event-list');
  for(const item of journey.events){const button=el('button',eventList,`${timelineLabel(journey,item.progress)} ${item.title}`);button.type='button';button.onclick=()=>select(item);}
  async function switchMap(){
    pause();const id=++switchId;mode.disabled=true;
    try{
      if(mapMode==='leaflet'){
        status.hidden=false;status.textContent='正在載入 Google 3D…';
        const api=await loadGoogleMaps(options.googleMapsApiKey);
        if(disposed||id!==switchId)return;
        adapter.destroy();mapEl.replaceChildren();
        try{adapter=createGoogleMap(mapEl,journey,select,api,()=>{
          if(disposed||mapMode!=='google-3d')return;
          pause();adapter.destroy();mapEl.replaceChildren();adapter=createLeafletMap(mapEl,journey,select);mapMode='leaflet';viewport.dataset.mapMode=mapMode;active=-1;render(false);mode.textContent='Google 3D';mode.setAttribute('aria-label','切換 Google 3D 地圖');status.hidden=false;status.textContent='Google 3D 初始化失敗，請檢查 API 啟用、key 限制與 WebGL 支援。已切回 2D。';
        });mapMode='google-3d';viewport.dataset.mapMode=mapMode;}
        catch(error){mapEl.replaceChildren();adapter=createLeafletMap(mapEl,journey,select);throw error;}
      }else{adapter.destroy();mapEl.replaceChildren();adapter=createLeafletMap(mapEl,journey,select);mapMode='leaflet';viewport.dataset.mapMode=mapMode;}
      active=-1;render(false);status.hidden=true;
    }catch(error){if(!disposed){status.hidden=false;status.textContent=`${error.message} 目前保留 2D 地圖。`;}}
    finally{if(!disposed){mode.disabled=false;mode.textContent=mapMode==='leaflet'?'Google 3D':'2D 地圖';mode.setAttribute('aria-label',mapMode==='leaflet'?'切換 Google 3D 地圖':'切換 2D 地圖');}}
  }
  mode.onclick=switchMap;
  if(journey.warnings.length){const details=el('details',host,'','relive-warnings');el('summary',details,`${journey.warnings.length} 項相片提示`);journey.warnings.forEach(w=>el('p',details,w));}
  slider.setAttribute('aria-valuetext',current.textContent);
  if(journey.renderer==='google-3d')void switchMap();
  return ()=>{clearTimeout(hideTimer);visibilityEvents.abort();disposed=true;switchId++;pause();adapter.destroy();host.replaceChildren();};
}
