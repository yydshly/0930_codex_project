import {JOURNAL_CATEGORIES,PROJECT_JOURNAL_ENTRIES} from './project-journal-data.js';
import {JOURNAL_KEY,MAX_JOURNAL_ENTRIES,readJournal,upsertJournalEntry,sanitizeJournalEntry,formatJournalMarkdown} from './project-journal-store.js';
import {filterJournalEntries} from './project-journal-search.js';
import {initJournalTransfer} from './project-journal-transfer.js';

// Project notes have their own storage and lifecycle; they never become part
// of a character recipe, brush history, or automatically saved coat draft.
export function initProjectJournal({storage=null}={}){
  const dialog=document.querySelector('#project-journal');
  const opener=document.querySelector('#project-journal-open');
  if(!dialog||!opener)return;
  const overview=document.createElement('a');overview.href='project.html';overview.textContent='查看项目全程总览与目标毛绒 ↗';
  overview.style.textDecoration='underline';overview.style.textUnderlineOffset='3px';
  dialog.querySelector('#journal-intro').append(document.createTextNode(' '),overview);
  const $=selector=>dialog.querySelector(selector);
  const tabs=[...dialog.querySelectorAll('[data-journal-category]')];
  const form=$('#journal-form'),details=$('#journal-compose');
  const categoryInput=$('#journal-category'),titleInput=$('#journal-title'),bodyInput=$('#journal-body');
  const queryInput=$('#journal-query'),sourceInput=$('#journal-source');
  let activeCategory='progress',entries=[],editing=null,exportUrl=null;
  const dates=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});

  function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
  function message(text){$('#journal-status').textContent=text;}
  function hasUnsavedText(){
    return editing?titleInput.value!==editing.title||bodyInput.value!==editing.body||categoryInput.value!==editing.category:Boolean(titleInput.value||bodyInput.value);
  }
  function updateFormActions(){
    $('#journal-add').textContent=editing?'继续编辑这条':'补充记录 +';
    $('#journal-cancel-edit').hidden=!editing&&!hasUnsavedText();
    $('#journal-cancel-edit').textContent=editing?'取消修改':'清空未保存输入';
  }
  function invalidateExport(){
    if(exportUrl)URL.revokeObjectURL(exportUrl);
    exportUrl=null;$('#journal-download').hidden=true;$('#journal-export-preview').hidden=true;
    $('#journal-export-text').value='';
  }
  function renderEntry(entry,custom=false){
    const card=node('article','journal-card');
    const meta=node('div','journal-card-meta');
    meta.append(node('span',`journal-badge${entry.category==='roadmap'&&!custom?' planned':''}`,custom?'我的补充':entry.status));
    if(custom){
      const time=node('time','',`${dates.format(entry.updatedAt)} · 北京时间`);
      time.dateTime=new Date(entry.updatedAt).toISOString();meta.append(time);
    }
    card.append(meta,node('h4','',entry.title),node('p','journal-entry-body',entry.body));
    if(!custom&&entry.links?.length){
      const links=node('div','journal-sources');
      for(const source of entry.links){
        const link=node('a','',`${source.label} ↗`);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';links.append(link);
      }
      card.append(links);
    }
    if(custom){
      const edit=node('button','journal-edit','编辑这条记录');edit.type='button';
      edit.addEventListener('click',()=>{
        if(hasUnsavedText()){
          details.open=true;titleInput.focus();
          message('当前输入尚未保存，请先保存或取消当前输入，再编辑这条记录。');return;
        }
        editing=entry;categoryInput.value=entry.category;titleInput.value=entry.title;bodyInput.value=entry.body;
        details.open=true;$('#journal-save').textContent='保存修改';updateFormActions();
        $('#journal-compose-label').textContent='编辑补充记录';titleInput.focus();
        message('正在编辑你的补充，保存后更新这一条记录。');
      });
      card.append(edit);
    }
    return card;
  }
  function render(){
    const rows=[...entries.map(entry=>({...entry,custom:true})),...PROJECT_JOURNAL_ENTRIES.map(entry=>({...entry,custom:false}))];
    const matches=filterJournalEntries(rows,{query:queryInput.value,source:sourceInput.value});
    for(const tab of tabs){
      const category=tab.dataset.journalCategory,selected=category===activeCategory;
      tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
      const selectedRows=matches.filter(entry=>entry.category===category);
      tab.querySelector('.journal-count').textContent=selectedRows.length;
      const panel=$(`#journal-panel-${category}`);panel.hidden=!selected;panel.replaceChildren();
      const custom=selectedRows.filter(entry=>entry.custom);
      if(custom.length){
        panel.append(node('h3','journal-section-label','我的补充'));
        custom.forEach(entry=>panel.append(renderEntry(entry,true)));
      }
      const builtins=selectedRows.filter(entry=>!entry.custom);
      if(builtins.length){panel.append(node('h3','journal-section-label','项目内置记录'));builtins.forEach(entry=>panel.append(renderEntry(entry)));}
      if(!selectedRows.length)panel.append(node('p','journal-empty','当前分类没有匹配记录。可以切换其它分类，或清空搜索与筛选。'));
    }
    $('#journal-overview').textContent=`${PROJECT_JOURNAL_ENTRIES.length} 条项目内置记录 · 我的补充 ${entries.length} / ${MAX_JOURNAL_ENTRIES}`;
    const filtered=Boolean(queryInput.value.trim())||sourceInput.value!=='all';
    $('#journal-filter-status').textContent=filtered?`当前分类 ${matches.filter(entry=>entry.category===activeCategory).length} 条 · 四类共 ${matches.length} 条匹配。切换分类查看其它结果。`:'按标题、正文、原理或参考名称搜索；筛选只影响查看，导出仍包含全部记录。';
    $('#journal-clear-filters').hidden=!filtered;
  }
  function activate(category,focus=false){
    activeCategory=category;render();
    if(!editing&&!hasUnsavedText())categoryInput.value=category;
    if(focus)tabs.find(tab=>tab.dataset.journalCategory===category)?.focus();
    $('#journal-reading').scrollTop=0;
  }
  function refresh(){
    const result=readJournal(storage);entries=result.entries;render();
    if(!result.ok)message(result.error||'本机记录暂时无法读取，可先查看内置记录。');
    return result;
  }
  function resetForm(){
    editing=null;form.reset();categoryInput.value=activeCategory;
    $('#journal-save').textContent='保存补充';updateFormActions();
    $('#journal-compose-label').textContent='补充记录';
  }
  opener.addEventListener('click',()=>{
    const result=refresh();
    if(result.ok)message('补充记录保存在此浏览器，可导出留存。');
    dialog.showModal();tabs.find(tab=>tab.dataset.journalCategory===activeCategory)?.focus();
  });
  $('#journal-close').addEventListener('click',()=>dialog.close());
  $('#journal-add').addEventListener('click',()=>{details.open=true;titleInput.focus();});
  queryInput.addEventListener('input',render);sourceInput.addEventListener('change',render);
  $('#journal-clear-filters').addEventListener('click',()=>{queryInput.value='';sourceInput.value='all';render();queryInput.focus();});
  dialog.addEventListener('close',()=>opener.focus());
  // Native Escape closes the dialog; form text remains until saved or reset.
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>activate(tab.dataset.journalCategory));
    tab.addEventListener('keydown',event=>{
      let next=index;
      if(event.key==='ArrowRight')next=(index+1)%tabs.length;
      else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=tabs.length-1;
      else return;
      event.preventDefault();activate(tabs[next].dataset.journalCategory,true);
    });
  });
  form.addEventListener('input',updateFormActions);form.addEventListener('change',updateFormActions);
  $('#journal-cancel-edit').addEventListener('click',()=>{const wasEditing=Boolean(editing);resetForm();message(wasEditing?'已取消本次修改，原记录保留。':'未保存的输入已清空。');});
  form.addEventListener('submit',event=>{
    event.preventDefault();const now=Date.now();
    const createdAt=editing?.createdAt??now;
    const candidate={id:editing?.id||crypto.randomUUID(),category:categoryInput.value,title:titleInput.value,body:bodyInput.value,createdAt,updatedAt:Math.max(now,createdAt,editing?.updatedAt??0)};
    const entry=sanitizeJournalEntry(candidate);
    if(!entry||!titleInput.value.trim()||!bodyInput.value.trim()){message('请填写记录标题和正文，再保存。');return;}
    const result=upsertJournalEntry(storage,entry);
    if(!result.ok){message(result.error||'未能保存，输入内容已保留；可以复制正文留存。');return;}
    const wasEditing=Boolean(editing);entries=result.entries;activeCategory=entry.category;
    resetForm();details.open=false;invalidateExport();transfer.invalidateBackup();
    queryInput.value='';sourceInput.value='all';activate(activeCategory,true);
    message(wasEditing?'记录已更新，刷新后仍可查看。':'补充已保存，刷新后仍可查看。');
  });
  $('#journal-export').addEventListener('click',()=>{
    const result=refresh();invalidateExport();transfer.invalidateBackup();
    const markdown=formatJournalMarkdown(PROJECT_JOURNAL_ENTRIES,entries,JOURNAL_CATEGORIES);
    $('#journal-export-text').value=markdown;$('#journal-export-preview').hidden=false;
    exportUrl=URL.createObjectURL(new Blob([markdown],{type:'text/markdown;charset=utf-8'}));
    const link=$('#journal-download');link.href=exportUrl;link.download='plush-lab-project-journal.md';link.hidden=false;
    message(result.ok?'导出内容已生成，点击「下载 Markdown」保存；也可展开正文复制。':`${result.error||'部分本机记录无法读取。'} 已生成当前可读取内容的导出预览。`);
  });
  window.addEventListener('storage',event=>{
    if(event.storageArea!==storage||(event.key!==JOURNAL_KEY&&event.key!==null))return;
    const result=refresh();invalidateExport();transfer.invalidateBackup();
    if(result.ok&&dialog.open)message(editing?'另一个页面更新了记录；当前编辑内容保留。':'补充记录已与另一个页面同步。');
  });
  window.addEventListener('pagehide',invalidateExport);
  const transfer=initJournalTransfer({dialog,storage,message,onImported(result){
    const existing=new Set(entries.map(entry=>entry.id)),added=result.entries.filter(entry=>!existing.has(entry.id));
    entries=result.entries;invalidateExport();render();
    if(added.length){queryInput.value='';sourceInput.value='custom';activate(added[0].category);}
  }});
  refresh();
}
