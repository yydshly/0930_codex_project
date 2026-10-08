export const SCENE_JSON_BYTE_LIMIT=100000;

// The text editor and native file inputs use the same domain import methods.
// Reject oversized text before parsing so pasted multibyte content obeys the
// existing file-size limit as well.
export function parseSceneJSON(text){
 if(typeof text!=='string'||!text.trim())throw new Error('请先粘贴 JSON 内容');
 if(new TextEncoder().encode(text).byteLength>SCENE_JSON_BYTE_LIMIT)throw new Error('JSON 内容过大，最多支持100 KB');
 let data;try{data=JSON.parse(text);}catch{throw new Error('JSON 格式错误，请检查引号、逗号和括号');}
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('JSON 内容需要是一个对象');
 return data;
}
