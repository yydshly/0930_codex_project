const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),web=root+'/web/cases/research-desk';
const Babel=require(root+'/tooling/node_modules/@babel/standalone/babel.js');
const patches=JSON.parse(fs.readFileSync(root+'/build/case/patches.json','utf8'));
for(const name of ['react','react-dom']){
 fs.copyFileSync(root+'/tooling/node_modules/'+name+'/umd/'+name+'.production.min.js',web+'/vendor/'+name+'.production.min.js');
 fs.copyFileSync(root+'/tooling/node_modules/'+name+'/LICENSE',web+'/vendor/'+name+'-LICENSE.txt');
}
for(const name of ['ios_frame','animations']){
 let source=fs.readFileSync(root+'/vendor/huashu-design/assets/'+name+'.jsx','utf8');
 if(name==='animations'){
  const from='window.innerHeight - 56',to='window.innerHeight - (window.__recording ? 0 : 56)';
  if(!source.includes(from))throw Error('Stage adapter anchor missing');source=source.replace(from,to);
  patches.push({file:'assets/animations.jsx',from,to,reason:'During video capture the hidden control bar must not reserve 56px, avoiding black borders. Normal interactive playback is unchanged.'});
 }
 fs.writeFileSync(web+'/vendor/'+name+'.js',Babel.transform(source,{presets:['react'],comments:true}).code);
}
fs.writeFileSync(web+'/animation.js',Babel.transform(fs.readFileSync(web+'/animation.jsx','utf8'),{presets:['react']}).code);
fs.writeFileSync(web+'/vendor/adaptations.json',JSON.stringify(patches,null,2));
console.log('Compiled upstream JSX and authored animation. React 18.3.1, Babel 7.28.4.');
