// Role slots survive closing either window without sharing its private identity.
// Every pre-existing game continues to use its original storage key.
export function showcaseStorageKey(prefix,id,role='author'){return prefix+id+(id==='postway'?(role==='carrier'?'-carrier':'-author'):'');}
