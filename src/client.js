const mounted=new Map();
let generation=0;
function cleanup(){generation++;for(const dispose of mounted.values())dispose();mounted.clear();}
export function onRouteUpdate(){cleanup();}
export async function onRouteDidUpdate(){
  if(typeof document==='undefined')return;
  const hosts=Array.from(document.querySelectorAll('[data-relive]'));
  if(!hosts.length)return;
  const token=++generation;
  const [{mountPlayer}]=await Promise.all([import('./player.js'),import('leaflet/dist/leaflet.css'),import('maplibre-gl/dist/maplibre-gl.css'),import('./styles.css')]);
  if(token!==generation)return;
  for(const host of hosts){
    if(mounted.has(host))continue;
    try{mounted.set(host,mountPlayer(host,JSON.parse(decodeURIComponent(host.dataset.relive)),{googleMapsApiKey:typeof __RELIVE_GOOGLE_MAPS_API_KEY__==='undefined'?'':__RELIVE_GOOGLE_MAPS_API_KEY__}));}
    catch(error){host.classList.add('relive-error');host.textContent=`Relive：${error.message}`;}
  }
}
