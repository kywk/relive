import {Plugin, MarkdownRenderChild, TFile, requestUrl, PluginSettingTab, Setting} from 'obsidian';
import {parseBlock, assetLink} from './core.js';
import {loadJourney} from './load.js';
import {mountPlayer} from './player.js';

class Replay extends MarkdownRenderChild {
  disposed=false;
  cleanup?:()=>void;
  onunload(){this.disposed=true;this.cleanup?.();}
}
export default class RelivePlugin extends Plugin {
  settings={googleMapsApiKey:''};
  async onload(){
    this.settings=Object.assign(this.settings,await this.loadData());
    this.addSettingTab(new ReliveSettings(this.app,this));
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
        if(!child.disposed)child.cleanup=mountPlayer(el,journey,this.settings);
      }catch(error){if(!child.disposed){el.classList.add('relive-error');el.textContent=`Relive：${error instanceof Error?error.message:String(error)}`;}}
    });
  }
}

class ReliveSettings extends PluginSettingTab {
  plugin:RelivePlugin;
  constructor(app:any,plugin:RelivePlugin){super(app,plugin);this.plugin=plugin;}
  display(){
    this.containerEl.empty();
    new Setting(this.containerEl).setName('Google Maps API key').setDesc('Google 3D 使用；需啟用 Maps JavaScript API 與帳務。儲存後重新開啟筆記。').addText(text=>text.setValue(this.plugin.settings.googleMapsApiKey).onChange(async(value)=>{this.plugin.settings.googleMapsApiKey=value.trim();await this.plugin.saveData(this.plugin.settings);}));
  }
}
