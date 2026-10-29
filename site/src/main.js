import 'leaflet/dist/leaflet.css';
import '../../src/styles.css';
import './style.css';
import journey from '../generated/journey.json';
import credits from '../public/photos/credits.json';
const base=import.meta.env.BASE_URL;
for(const photo of journey.photos)photo.url=base+photo.url;
const host=document.querySelector('#journey');
let ready;
async function loadPlayer(){
 if(!ready)ready=import('../../src/player.js').then(({mountPlayer})=>{
  const destroy=mountPlayer(host,journey);
  // Public demo offers only the configured 2D renderer.
  host.querySelector('.relive-header > button').hidden=true;
  window.addEventListener('pagehide',destroy,{once:true});
 }).catch(error=>{ready=null;host.replaceChildren();const p=document.createElement('p');p.textContent='地圖未能載入，請重新整理，或下載範例在本機體驗。';host.append(p);console.error(error);throw error;});
 return ready;
}
const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){void loadPlayer().catch(()=>{});observer.disconnect();}},{rootMargin:'400px'});observer.observe(host);
for(const button of document.querySelectorAll('[data-photo]'))button.addEventListener('click',async()=>{try{await loadPlayer();host.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});host.querySelectorAll('.relive-gallery button')[Number(button.dataset.photo)].click();}catch{}});
const tabs=[...document.querySelectorAll('[role=tab]')];
function select(tab){for(const t of tabs){const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!active;}}
for(const tab of tabs){tab.addEventListener('click',()=>select(tab));tab.addEventListener('keydown',e=>{let i=tabs.indexOf(tab);if(e.key==='ArrowRight')i=(i+1)%tabs.length;else if(e.key==='ArrowLeft')i=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')i=0;else if(e.key==='End')i=tabs.length-1;else return;e.preventDefault();select(tabs[i]);tabs[i].focus();});}
document.querySelector('[data-copy]').onclick=async e=>{try{await navigator.clipboard.writeText(document.querySelector('#markdown-code').textContent);e.target.textContent='已複製';document.querySelector('#announcement').textContent='Markdown 範例已複製';setTimeout(()=>e.target.textContent='複製範例',2000);}catch{document.querySelector('#announcement').textContent='無法存取剪貼簿，請手動選取範例文字。';}};
const entries=Array.isArray(credits)?credits:(credits.assets??credits.items??Object.values(credits));
for(const item of entries){if(!item.creator||!item.page)continue;const li=document.createElement('li');const source=document.createElement('a');source.href=item.page;source.textContent=item.title;const license=document.createElement('a');license.href=item.licenseUrl;license.textContent=item.licenseLabel??item.license;li.append(source,` — ${item.creator} · `,license);document.querySelector('#credit-list').append(li);}
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduce){const reveal=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.animate([{opacity:.25,transform:'translateY(20px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.2,.65,.3,1)'});reveal.unobserve(e.target);}},{threshold:.15});document.querySelectorAll('.reveal').forEach(el=>reveal.observe(el));}
