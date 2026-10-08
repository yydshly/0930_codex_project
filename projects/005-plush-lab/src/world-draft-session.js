// The studio iframe may stay open while another page edits the same world.
// Keep its original storage snapshot separate from the world shown on screen.
export function createEmbeddedDraftSession(storage,{key,stored,initial}){
  let expected=stored,lastState=initial;
  function inspect(){
    try{
      if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw Error();
      if(expected===undefined)return {ok:false,conflict:false,error:'最近小世界暂时无法读取，请重新打开工作室。'};
      return {ok:true,conflict:storage.getItem(key)!==expected};
    }catch{return {ok:false,conflict:false,error:'本机保存失败，可前往小世界生成链接保留当前画面。'};}
  }
  function save(encoded){
    const current=inspect();
    if(!current.ok||current.conflict)return {...current,changed:false};
    if(encoded===lastState)return {ok:true,conflict:false,changed:false};
    try{
      storage.setItem(key,encoded);expected=encoded;lastState=encoded;
      return {ok:true,conflict:false,changed:true};
    }catch{return {ok:false,conflict:false,changed:false,error:'本机保存失败，可前往小世界生成链接保留当前画面。'};}
  }
  return {inspect,save};
}
