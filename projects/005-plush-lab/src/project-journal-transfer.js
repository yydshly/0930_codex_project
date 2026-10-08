import {readJournal} from './project-journal-store.js';
import {encodeJournalBackup,inspectJournalBackup,mergeJournalBackup,MAX_JOURNAL_BACKUP_BYTES} from './project-journal-backup.js';

export function initJournalTransfer({dialog,storage,message,onImported}){
  const $=selector=>dialog.querySelector(selector);
  const tools=$('#journal-transfer-tools'),input=$('#journal-import-input'),apply=$('#journal-import-apply');
  let backupUrl=null,validatedText=null,fileRequest=0,fileLoading=false;
  function setFileLoading(value){fileLoading=value;input.disabled=value;$('#journal-import-inspect').disabled=value;}
  function invalidateBackup(){
    if(backupUrl)URL.revokeObjectURL(backupUrl);
    backupUrl=null;$('#journal-backup-download').hidden=true;$('#journal-backup-output').value='';
    $('#journal-backup-preview').hidden=true;
  }
  function resetInspection(){validatedText=null;apply.disabled=true;$('#journal-import-summary').textContent='先检查备份，再追加导入；已有记录会保留。';}
  function inspect(){
    if(fileLoading)return false;
    const result=inspectJournalBackup(input.value);
    if(!result.ok){resetInspection();$('#journal-import-summary').textContent=result.error;return false;}
    validatedText=input.value;apply.disabled=!result.entries.length;
    $('#journal-import-summary').textContent=result.entries.length?`已检查：${result.entries.length} 条补充记录。新记录将追加，同 ID 的本机内容会保留。`:'这份备份没有补充记录，无需导入。';
    return true;
  }
  $('#journal-transfer').addEventListener('click',()=>{tools.open=true;tools.querySelector('summary').focus();tools.scrollIntoView({block:'start',behavior:'instant'});});
  $('#journal-backup-export').addEventListener('click',()=>{
    const current=readJournal(storage);invalidateBackup();
    if(!current.ok){message(current.error);return;}
    try{
      const json=encodeJournalBackup(current.entries);
      $('#journal-backup-output').value=json;$('#journal-backup-preview').hidden=false;
      backupUrl=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));
      const link=$('#journal-backup-download');link.href=backupUrl;link.download='plush-lab-journal-backup.json';link.hidden=false;
      message(`已生成 ${current.entries.length} 条补充记录的 JSON 备份，可下载或复制全文留存。`);
    }catch(error){message(error.message||'备份生成失败，已保存记录保留。');}
  });
  input.addEventListener('input',()=>{fileRequest++;resetInspection();});
  $('#journal-import-inspect').addEventListener('click',inspect);
  $('#journal-import-file').addEventListener('change',async event=>{
    const file=event.target.files?.[0],request=++fileRequest;resetInspection();setFileLoading(false);if(!file)return;
    if(file.size>MAX_JOURNAL_BACKUP_BYTES){resetInspection();$('#journal-import-summary').textContent='备份文件超过 2 MiB，未读取或导入。';return;}
    setFileLoading(true);$('#journal-import-summary').textContent='正在读取并检查新选择的备份…';
    try{
      const text=await file.text();if(request!==fileRequest)return;
      input.value=text;setFileLoading(false);inspect();
    }catch{if(request===fileRequest){setFileLoading(false);resetInspection();$('#journal-import-summary').textContent='文件读取失败，可以复制 JSON 内容到下方再检查。';}}
  });
  apply.addEventListener('click',()=>{
    if(fileLoading||validatedText!==input.value){resetInspection();message('备份内容已变更或正在读取，请先重新检查。');return;}
    const result=mergeJournalBackup(storage,input.value);
    if(!result.ok){$('#journal-import-summary').textContent=result.error;message(result.error);return;}
    invalidateBackup();onImported(result);
    const summary=`新增 ${result.added} 条 · 重复跳过 ${result.duplicates} 条 · 冲突保留本机 ${result.conflicts} 条。`;
    $('#journal-import-summary').textContent=summary;message(summary);
    // Keep the source text available, especially when a conflicting note was
    // skipped. A second import reports duplicates instead of adding again.
  });
  window.addEventListener('pagehide',invalidateBackup);
  return {invalidateBackup};
}
