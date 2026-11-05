import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {mkdir, copyFile, readFile, writeFile} from 'node:fs/promises';
await mkdir('dist/obsidian',{recursive:true});
await build({entryPoints:['src/obsidian.ts'],outfile:'dist/obsidian/main.js',bundle:true,platform:'browser',format:'cjs',target:'es2020',external:['obsidian'],plugins:[{name:'obsidian-local-runtime',setup(builder){builder.onResolve({filter:/\/google-map\.js$/},()=>({path:fileURLToPath(new URL('../src/google-map-obsidian.js',import.meta.url))}));}}],logLevel:'info'});
await copyFile('manifest.json','dist/obsidian/manifest.json');
const leaflet=await readFile('node_modules/leaflet/dist/leaflet.css','utf8');
// Embed Leaflet's optional control/marker assets, so the installed plugin is self contained.
let css=leaflet;
for(const file of ['layers.png','layers-2x.png','marker-icon.png']){
 const bytes=await readFile(`node_modules/leaflet/dist/images/${file}`);
 css=css.replaceAll(`images/${file}`,`data:image/png;base64,${bytes.toString('base64')}`);
}
await writeFile('dist/obsidian/styles.css',css+'\n'+await readFile('node_modules/maplibre-gl/dist/maplibre-gl.css','utf8')+'\n'+await readFile('src/styles.css','utf8'));
