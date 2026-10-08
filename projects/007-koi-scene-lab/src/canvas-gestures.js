// OrbitControls emits `start` on pointerdown, before a click can be distinguished
// from a drag. Classify the actual pointer path before releasing scene control.
export function exitCameraAutomation(courtyard){
 if(courtyard.interaction?.mode!=='inspect')courtyard.interaction?.stop();
 courtyard.followAnimal=null;courtyard.followFish=null;
 if(courtyard.school)courtyard.school.inspectionFish=null;
 courtyard.settings.autoTour=false;courtyard.transition=null;courtyard.onStatus({tour:false});
}

export function bindCanvasGestures({canvas,controls,onNavigate,onTap,threshold=6}){
 const pointers=new Map();let navigated=false,tapBlocked=false;
 const enabled=()=>controls.enabled!==false;
 function navigate(){if(navigated||!enabled())return;navigated=true;tapBlocked=true;onNavigate();}
 function down(event){
  if(!pointers.size){navigated=false;tapBlocked=false;}
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,button:event.button,type:event.pointerType});
  if(pointers.size>1){tapBlocked=true;if(controls.enableZoom!==false||controls.enablePan!==false)navigate();}
 }
 function moved(event){
  const origin=pointers.get(event.pointerId);if(!origin)return;
  if(Math.hypot(event.clientX-origin.x,event.clientY-origin.y)>threshold){
   tapBlocked=true;
   if((origin.type==='touch'||[0,1,2].includes(origin.button))&&(controls.enableRotate!==false||controls.enablePan!==false||controls.enableZoom!==false))navigate();
  }
 }
 function up(event){
  const origin=pointers.get(event.pointerId);if(!origin)return;
  moved(event);pointers.delete(event.pointerId);
  if(!tapBlocked&&!pointers.size&&(origin.type==='touch'||origin.button===0))onTap(event);
 }
 function cancel(event){if(!pointers.has(event.pointerId))return;tapBlocked=true;pointers.delete(event.pointerId);}
 function wheel(){if(enabled()&&controls.enableZoom!==false){tapBlocked=true;onNavigate();}}
 const listeners={pointerdown:down,pointermove:moved,pointerup:up,pointercancel:cancel,lostpointercapture:cancel,wheel};
 // Capture runs before OrbitControls updates the camera, even though it was
 // constructed first and adds its pointermove listener during pointerdown.
 for(const [type,listener]of Object.entries(listeners))canvas.addEventListener(type,listener,{capture:true,passive:true});
 return ()=>{for(const [type,listener]of Object.entries(listeners))canvas.removeEventListener(type,listener,{capture:true});pointers.clear();};
}
