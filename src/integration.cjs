const path=require('node:path');
const remark=require('./remark.cjs');
module.exports=function createReliveIntegration({vaultRoot,assetRoots=[],googleMapsApiKey='',...options}){
  if(!path.isAbsolute(vaultRoot??''))throw new Error('vaultRoot 必須是 Vault 的絕對路徑');
  if(!assetRoots.length)throw new Error('請明確指定允許發布的 assetRoots；不要包含整個私人 Vault');
  const roots=assetRoots.map(root=>path.resolve(vaultRoot,root));
  return {
    remark:[remark,{...options,vaultRoot,assetRoots:roots,assetMode:'bundle'}],
    plugin:[require.resolve('./docusaurus.cjs'),{googleMapsApiKey}],
  };
};
