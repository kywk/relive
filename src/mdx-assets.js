// Generate ESTree directly: authored text is always a literal, never executable JS.
const id=name=>({type:'Identifier',name});
const literal=value=>({type:'Literal',value});
const call=(callee,args)=>({type:'CallExpression',callee,arguments:args,optional:false});
const member=(object,property)=>({type:'MemberExpression',object:id(object),property:id(property),computed:false,optional:false});
const program=body=>({type:'Program',sourceType:'module',body});
function ast(value){
  if(Array.isArray(value))return {type:'ArrayExpression',elements:value.map(ast)};
  if(value&&typeof value==='object')return {type:'ObjectExpression',properties:Object.entries(value).map(([key,v])=>({type:'Property',key:literal(key),value:ast(v),kind:'init',method:false,shorthand:false,computed:false}))};
  return literal(value);
}
export function bundleHost(journey,imports){
  const clean=JSON.parse(JSON.stringify(journey));
  const value=ast(clean);
  const photos=value.properties.find(p=>p.key.value==='photos').value.elements;
  clean.photos.forEach((photo,i)=>{const ref=imports.find(entry=>entry.placeholder===photo.url);if(ref)photos[i].properties.find(p=>p.key.value==='url').value=id(ref.name);});
  const expression=call(id('encodeURIComponent'),[call(member('JSON','stringify'),[value])]);
  const nodes=imports.map(ref=>({type:'mdxjsEsm',value:`import ${ref.name} from ${JSON.stringify(ref.path)};`,data:{estree:program([{type:'ImportDeclaration',source:literal(ref.path),specifiers:[{type:'ImportDefaultSpecifier',local:id(ref.name)}]}])}}));
  return {nodes,attribute:{type:'mdxJsxAttribute',name:'data-relive',value:{type:'mdxJsxAttributeValueExpression',value:'',data:{estree:program([{type:'ExpressionStatement',expression}])}}}};
}
