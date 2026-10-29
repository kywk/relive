import {gpxSlimOptions, slimGpx} from './gpx-slim.js';
import {bundleHost} from './mdx-assets.js';
import path from 'node:path';
import {readFile, realpath, mkdir, writeFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseBlock, assetLink} from './core.js';
import {loadJourney} from './load.js';

export function inside(root, target) {
  const relative=path.relative(root,target);
  return relative==='' || (relative!=='..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}
export async function resolveLocal(ref, sourcePath, vaultRoot, assetRoots) {
  const root=await realpath(vaultRoot);
  const link=assetLink(ref);
  const sourceDir=await realpath(path.dirname(sourcePath));
  const candidates=link.startsWith('/')?[path.resolve(root,`.${link}`)]:[path.resolve(sourceDir,link),path.resolve(root,link)];
  for(const candidate of candidates){
    if(!inside(root,candidate))continue;
    try{const resolved=await realpath(candidate);if(inside(root,resolved)){
      if(assetRoots){const roots=await Promise.all(assetRoots.map(p=>realpath(p)));if(!roots.some(r=>inside(r,resolved)))throw new Error('資產不在允許發布的 assetRoots 內');}
      return resolved;
    }}catch(error){if(error.code!=='ENOENT')throw error;}
  }
  // Obsidian short wikilinks: search only explicitly publishable asset roots.
  if(assetRoots&&!link.includes('/')&&!link.includes('\\')){
    const matches=new Set();
    const walk=async dir=>{
      for(const entry of await readdir(dir,{withFileTypes:true})){
        if(entry.name.startsWith('.')||['node_modules','build'].includes(entry.name))continue;
        const candidate=path.join(dir,entry.name);
        if(entry.isDirectory())await walk(candidate);
        else if(entry.isFile()&&entry.name===link){const resolved=await realpath(candidate);if(inside(root,resolved))matches.add(resolved);}
      }
    };
    for(const dir of assetRoots){const resolved=await realpath(dir);if(!inside(root,resolved))throw new Error('assetRoots 必須位於 Vault 內');await walk(resolved);}
    if(matches.size===1)return [...matches][0];
    if(matches.size>1)throw new Error(`資產名稱不唯一：${link}；請改用完整 Vault 相對路徑`);
  }
  throw new Error(`找不到 vault 內資產：${link}（網站請使用文章相對路徑或 vault 根目錄路徑）`);
}
export default function remarkRelive(options={}) {
  const {vaultRoot=process.cwd(),staticDir=path.resolve('static'),baseUrl='/',allowRemote=false,assetRoots,assetMode='static',remotePhotos='reference'}=options;
  const slimOptions=gpxSlimOptions(options.gpxSlim);
  return async(tree,file)=>{
    const nodes=[];
    const walk=node=>{if(node.type==='code'&&node.lang==='relive')nodes.push(node);for(const child of node.children??[])walk(child);};walk(tree);
    let assetIndex=0;
    const importNodes=[];
    for(const node of nodes){
      const imports=[];
      try{
        const config=parseBlock(node.value);
        if(config.raw.trim())config.raw=slimGpx(config.raw,slimOptions,file,'inline raw');
        const journey=await loadJourney(config,async(ref,kind)=>{
          const link=assetLink(ref);let data,ext,resolvedPath;
          if(/^https?:\/\//i.test(link)&&kind==='photo'&&assetMode==='bundle'&&remotePhotos==='reference')return {url:link,data:null};
          if(/^https?:\/\//i.test(link)){
            if(!allowRemote)throw new Error('網站遠端資產需在 remarkRelive 設定 allowRemote: true');
            const response=await fetch(link,{signal:AbortSignal.timeout(15000)});
            if(!response.ok)throw new Error(`HTTP ${response.status}`);
            data=Buffer.from(await response.arrayBuffer());ext=path.extname(new URL(link).pathname);
          }else{
            const resolved=await resolveLocal(link,file.path??path.join(vaultRoot,'index.md'),vaultRoot,assetRoots);
            resolvedPath=resolved;data=await readFile(resolved);ext=path.extname(resolved);
          }
          if(kind==='gpx')return {data:slimGpx(data.toString('utf8'),slimOptions,file,link)};
          if(!/^\.(jpe?g|png|webp|gif|avif|heic)$/i.test(ext))throw new Error('相片格式需為 jpg/png/webp/gif/avif/heic');
          if(assetMode==='bundle'){
            if(!resolvedPath)throw new Error('bundle 模式的遠端照片請使用 remotePhotos: reference');
            if(/\.heic$/i.test(ext))throw new Error('網站 bundle 相片請先轉成 JPEG 或 WebP');
            const name=`__reliveAsset${assetIndex++}`;const placeholder=`relive-asset:${name}`;
            imports.push({name,path:resolvedPath,placeholder});return {data:new Uint8Array(data),url:placeholder};
          }
          const name=createHash('sha256').update(data).digest('hex').slice(0,24)+ext.toLowerCase();
          const folder=path.join(staticDir,'relive-assets');await mkdir(folder,{recursive:true});await writeFile(path.join(folder,name),data);
          return {data:new Uint8Array(data),url:`${baseUrl.replace(/\/$/,'')}/relive-assets/${name}`};
        });
        const encoded=encodeURIComponent(JSON.stringify(journey));
        const bundled=assetMode==='bundle'?bundleHost(journey,imports):null;
        if(bundled)importNodes.push(...bundled.nodes);
        // MDX AST nodes survive Docusaurus's MDX pipeline (raw HTML does not).
        Object.keys(node).forEach(key=>delete node[key]);
        Object.assign(node,{type:'mdxJsxFlowElement',name:'div',attributes:[{type:'mdxJsxAttribute',name:'className',value:'relive-host'},bundled?.attribute??{type:'mdxJsxAttribute',name:'data-relive',value:encoded}],children:[]});
      }catch(error){throw new Error(`${file.path??'Markdown'}：relive：${error.message}`,{cause:error});}
    }
    tree.children.unshift(...importNodes);
  };
}
