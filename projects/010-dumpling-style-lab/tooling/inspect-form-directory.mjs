globalThis.location={search:''};
const {gameForms}=await import('../web/game-forms-catalog.js');
console.log(JSON.stringify(gameForms.map(v=>({id:v.id,name:v.name,play:v.play}))).replace(/[^\x00-\x7f]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')));
