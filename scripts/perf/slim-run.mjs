import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const root=path.resolve('.perf/slim');
const server=createServer(async(req,res)=>{
 try{const name=new URL(req.url,'http://localhost').pathname;const target=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!target.startsWith(root+path.sep))throw Error();const data=await readFile(target);res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':target.endsWith('.json')?'application/json':'text/html');res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const result={date:'2026-10-29',browser:browser.version(),platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0].model,viewport:{width:1000,height:650},map:{width:900,height:500},rounds:3,framesPerPlayback:120,tiles:'disabled; real Leaflet SVG',rows:[]};
await mkdir('docs/performance/slim-screenshots',{recursive:true});
try{
 const variants=['full','gentle','balanced','aggressive','balanced70'];
 for(let round=0;round<3;round++)for(const scenario of round%2?['dense100k','trail20k']:['trail20k','dense100k']){
  const order=variants.slice(round*2%5).concat(variants.slice(0,round*2%5));
  for(const variant of order){
   const context=await browser.newContext({viewport:result.viewport,deviceScaleFactor:1});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url);await page.waitForLoadState('networkidle');await page.waitForFunction(()=>!!window.bench);
   const cdp=await context.newCDPSession(page);
   const heap=async()=>{await cdp.send('HeapProfiler.collectGarbage');return (await cdp.send('Runtime.getHeapUsage')).usedSize;};
   const baseHeap=await heap();
   const mount=await page.evaluate(key=>window.bench.mount(key),scenario+'-'+variant);
   const mountedHeap=await heap();
   const playback=await page.evaluate(()=>window.bench.playback(false));
   const follow=await page.evaluate(()=>window.bench.playback(true));
   const zoom=await page.evaluate(()=>window.bench.zoom());
   const afterHeap=await heap();
   if(round===0){await page.evaluate(()=>window.bench.reset());await page.screenshot({path:`docs/performance/slim-screenshots/${scenario}-${variant}.png`});}
   const row={round,scenario,variant,...mount,baseHeapBytes:baseHeap,mountedHeapBytes:mountedHeap,mountedHeapDeltaBytes:mountedHeap-baseHeap,afterPlaybackHeapDeltaBytes:afterHeap-baseHeap,playback,follow,zoom,errors};
   result.rows.push(row);await writeFile('docs/performance/slim-browser.json',JSON.stringify(result,null,2)+'\n');
   console.log(JSON.stringify({round,scenario,variant,mount:mount.firstFrameReadyMs,heapMB:(mountedHeap-baseHeap)/1048576,followP95:follow.updateMs.p95,zoomP95:zoom.syncMs.p95,errors}));
   await context.close();
  }
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
