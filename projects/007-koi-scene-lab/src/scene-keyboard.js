// Single-letter shortcuts belong to the focused viewport. Keep text entry,
// browser shortcuts and controls elsewhere on the page independent of it.
export function bindSceneKeyboard({getCourtyard,getCurrentTab,canvas,prepareInteraction,setToolbarOpen,document:doc=globalThis.document}) {
 const onKey=event=>{
  if(getCurrentTab()!=='scene'||event.defaultPrevented||event.isComposing||event.ctrlKey||event.metaKey||event.altKey)return;
  const target=event.target;
  if(target?.isContentEditable||target?.closest?.('input,select,textarea')||doc.querySelector('dialog[open]'))return;
  const c=getCourtyard();
  if(event.key==='Escape'){
   if(event.repeat)return;
   doc.body.classList.remove('clean-scene');setToolbarOpen(false);
   if(c?.binding.getState().calibration.pending)c.binding.cancelCalibration();
   else if(c?.binding.mode)c.binding.setMode(null);
   else if(c&&c.interaction.mode!=='idle')c.interaction.stop(true);
   return;
  }
  if(target!==canvas||doc.activeElement!==canvas||!c?.active||doc.hidden)return;
  const key=event.key.toLowerCase();
  if(event.repeat){if(['e','g','v'].includes(key)||(event.key===' '&&!event.shiftKey))event.preventDefault();return;}
  if(key==='v'){event.preventDefault();doc.body.classList.toggle('clean-scene');}
  else if(event.key===' '&&!event.shiftKey){event.preventDefault();c.updateSettings({paused:!c.settings.paused});}
  else if((key==='e'||key==='g')&&c.hasDynamics){event.preventDefault();prepareInteraction();if(key==='e')c.feed();else c.stroke();}
 };
 const focusCanvas=()=>canvas.focus({preventScroll:true});
 doc.addEventListener('keydown',onKey);
 canvas.addEventListener('pointerdown',focusCanvas);
 return ()=>{doc.removeEventListener('keydown',onKey);canvas.removeEventListener('pointerdown',focusCanvas);};
}
