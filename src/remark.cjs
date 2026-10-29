// Keep ESM on Node's native loader instead of Docusaurus config's jiti interop.
module.exports=function remarkRelive(options){
  return async(tree,file)=>{const {default:plugin}=await import('./remark.js');return plugin(options)(tree,file);};
};
