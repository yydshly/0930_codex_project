import fs from 'node:fs';import path from 'node:path';import {KineticsNode,installKineticsDouble} from './kinetics-dom-double.mjs';
export {KineticsNode};
export function installExchangeDouble(web){installKineticsDouble(web);globalThis.fetch=async url=>{if(String(url)!=='assets/game-forms/exchange/atlas.json')throw new Error('Unexpected QA asset fetch: '+url);return {json:async()=>JSON.parse(fs.readFileSync(path.join(web,String(url)),'utf8'))};};}
