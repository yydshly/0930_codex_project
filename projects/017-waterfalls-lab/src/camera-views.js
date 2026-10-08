export const CAMERA_VIEW_LIMIT=8;
export function saveCameraView(views,camera,name,index=null){
  if(index===null&&views.length>=CAMERA_VIEW_LIMIT)throw new Error('每件作品可收藏 8 个镜头，可更新已有镜头。');
  if(index!==null&&(!Number.isInteger(index)||index<0||index>=views.length))throw new Error('请先选择要更新的镜头。');
  const next=structuredClone(views),view={name:name.trim().slice(0,32)||'镜头 '+(index===null?views.length+1:index+1),camera:structuredClone(camera)};
  if(index===null){index=next.length;next.push(view);}else next[index]=view;
  return {views:next,index};
}
export function removeCameraView(views,index){
  if(!Number.isInteger(index)||index<0||index>=views.length)throw new Error('请先选择要移除的镜头。');
  return structuredClone(views.filter((view,i)=>i!==index));
}
