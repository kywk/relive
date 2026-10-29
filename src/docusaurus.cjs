const path=require('node:path');
const {createRequire}=require('node:module');
module.exports=function relivePlugin(context,options={}){
  return {
    name:'docusaurus-plugin-relive',
    getClientModules(){return [require.resolve('./client.js')];},
    configureWebpack(config,isServer,{currentBundler}){
      const {DefinePlugin}=currentBundler.instance;
      // Resolve Leaflet from the site, sharing StoryMap's existing runtime.
      const siteRequire=createRequire(path.join(context.siteDir,'package.json'));
      const resolve=name=>{try{return siteRequire.resolve(name);}catch{return require.resolve(name);}};
      return {
        resolve:{alias:{'leaflet$':resolve('leaflet'),'leaflet/dist/leaflet.css$':resolve('leaflet/dist/leaflet.css')}},
        plugins:[new DefinePlugin({__RELIVE_GOOGLE_MAPS_API_KEY__:JSON.stringify(options.googleMapsApiKey??'')})],
      };
    }
  };
};
