// Run against `npm run pages:preview`; external tiles/fonts are excluded for repeatability.
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE} : {})});
const url=process.argv[2] || 'http://127.0.0.1:4176/relive/';
const results=[];
const encodings = new Set();
try {
for(const [name,width,height] of [['desktop',1440,1000],['tablet',820,1180],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height}});
 await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(url).origin?route.continue():route.abort());
 page.on('response', response => {if(response.url().startsWith(new URL(url).origin))encodings.add(response.headers()['content-encoding'] || 'identity');});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForTimeout(1500);
 results.push(await page.evaluate(({name,errors})=>{
 const assets=performance.getEntriesByType('resource').filter(x=>x.name.startsWith(location.origin)).map(x=>({path:new URL(x.name).pathname,bytes:x.encodedBodySize,type:x.initiatorType}));
 return {name,assets,jsBytes:assets.filter(x=>x.path.endsWith('.js')).reduce((n,x)=>n+x.bytes,0),cssBytes:assets.filter(x=>x.path.endsWith('.css')).reduce((n,x)=>n+x.bytes,0),imageBytes:assets.filter(x=>/\.jpg$/.test(x.path)).reduce((n,x)=>n+x.bytes,0),journeyTop:document.querySelector("#journey").getBoundingClientRect().top,playerLoaded:!!document.querySelector('.relive-play'),errors};
 },{name,errors}));await page.close();
}
console.log(JSON.stringify({measurement:{browser:browser.version(),server:'Vite production preview (default gzip compression)',url,waitAfterLoadMs:1500,externalResources:'blocked',metric:'PerformanceResourceTiming.encodedBodySize; body only, excludes HTTP headers',contentEncodings:[...encodings].sort()},results},null,2));
} finally {await browser.close();}
