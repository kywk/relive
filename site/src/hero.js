import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// A separate, disposable backdrop leaves the interactive Kyoto demo untouched.
export async function mountHero(host) {
 const base=import.meta.env.BASE_URL;
 const response=await fetch(base+'demo/tokyo.json');
 if(!response.ok)throw new Error('Tokyo route unavailable');
 const data=await response.json();
 const map=L.map(host,{zoomControl:false,scrollWheelZoom:false,dragging:false,doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false});
 map.attributionControl.setPosition('topright');
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19}).addTo(map);
 const points=data.points.map(([lon,lat])=>L.latLng(lat,lon));
 const distances=[0];
 points.slice(1).forEach((p,i)=>distances.push(distances[i]+points[i].distanceTo(p)));
 const total=distances.at(-1);
 L.polyline(points,{color:'#157381',weight:4,opacity:.35}).addTo(map);
 const trail=L.polyline([],{color:'#06525c',weight:5}).addTo(map);
 const cursor=L.circleMarker(points[0],{radius:7,color:'#fff',weight:3,fillColor:'#157381',fillOpacity:1}).addTo(map);
 const stops=data.photos.map(photo=>{
  let nearest=0;
  points.forEach((p,i)=>{if(p.distanceTo([photo.lat,photo.lon])<points[nearest].distanceTo([photo.lat,photo.lon]))nearest=i;});
  return {...photo,index:nearest,distance:distances[nearest]};
 }).sort((a,b)=>a.distance-b.distance);
 const popup=L.popup({closeButton:false,autoPan:false,maxWidth:240,className:'hero-popup'});
 const button=document.querySelector('#hero-toggle');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let paused=reduced.matches,visible=true,frame=0,last=0,travel=0,stopIndex=0,hold=0,disposed=false;
 function render(){
  let index=1;while(index<distances.length-1&&distances[index]<travel)index++;
  const t=(travel-distances[index-1])/(distances[index]-distances[index-1]||1);
  const a=points[index-1],b=points[index],position=L.latLng(a.lat+(b.lat-a.lat)*t,a.lng+(b.lng-a.lng)*t);
  trail.setLatLngs([...points.slice(0,index),position]);cursor.setLatLng(position);
  const center=map.project(position,14);center.x-=host.clientWidth*.23;center.y-=host.clientHeight*.12;
  map.setView(map.unproject(center,14),14,{animate:false});
 }
 function sync(){button.textContent=paused?'播放背景回放':'暫停背景回放';cancelAnimationFrame(frame);last=0;if(!paused&&visible&&!document.hidden&&!disposed)frame=requestAnimationFrame(tick);}
 function tick(now){
  const dt=last?Math.min((now-last)/1000,.1):0;last=now;
  if(hold>0){hold-=dt;if(hold<=0)map.closePopup();}
  else {
   travel+=dt*total/100;
   const stop=stops[stopIndex];
   if(stop&&travel>=stop.distance){travel=stop.distance;hold=4;stopIndex++;
    const content=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');
    img.src=base+stop.url;img.alt=stop.caption;caption.textContent=stop.caption;content.append(img,caption);
    popup.setLatLng(points[stop.index]).setContent(content).openOn(map);
   }
   if(travel>=total){travel=0;stopIndex=0;}
  }
  render();frame=requestAnimationFrame(tick);
 }
 button.onclick=()=>{paused=!paused;sync();};
 const onMotion=()=>{paused=reduced.matches;sync();};reduced.addEventListener('change',onMotion);
 document.addEventListener('visibilitychange',sync);
 const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});observer.observe(host);
 const resize=new ResizeObserver(()=>{map.invalidateSize();render();});resize.observe(host);
 render();sync();
 return ()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',onMotion);map.remove();};
}
