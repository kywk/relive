import {Plugin, MarkdownRenderChild, TFile, requestUrl} from 'obsidian';
import {parseBlock, assetLink} from './core.js';
import {loadJourney} from './load.js';
import {mountPlayer} from './player.js';

class Replay extends MarkdownRenderChild {
  disposed=false;
  cleanup?:()=>void;
  onunload(){this.disposed=true;this.cleanup?.();}
}
export default class RelivePlugin extends Plugin {
  async onload(){
    this.registerMarkdownCodeBlockProcessor('relive', async(source,el,ctx)=>{
      const child=new Replay(el);ctx.addChild(child);el.textContent='正在載入旅程…';
      try{
        const config=parseBlock(source);
        const journey=await loadJourney(config,async(ref:string,kind:string)=>{
          const link=assetLink(ref);
          if(/^https?:\/\//i.test(link)){
            const response=await requestUrl({url:link});
            return {data:kind==='gpx'?response.text:response.arrayBuffer,url:link};
          }
          const file=this.app.metadataCache.getFirstLinkpathDest(link,ctx.sourcePath);
          if(!(file instanceof TFile))throw new Error(`找不到資產：${link}`);
          return {data:kind==='gpx'?await this.app.vault.read(file):await this.app.vault.readBinary(file),url:this.app.vault.getResourcePath(file)};
        });
        if(!child.disposed)child.cleanup=mountPlayer(el,journey);
      }catch(error){if(!child.disposed){el.classList.add('relive-error');el.textContent=`Relive：${error instanceof Error?error.message:String(error)}`;}}
    });
  }
}
