"""Depth-buffered geometry review using production scene/camera exports.
This renderer verifies geometry, materials and framing, not browser WebGL/PBR.
"""
from pathlib import Path
import json,math,numpy as np
from PIL import Image,ImageDraw,ImageFont
P=Path(__file__).resolve().parents[1];W=P/'web';Q=P/'assets/game-forms/foundry-qa';width,height=672,378
def matrix(a):return np.array(a,dtype=np.float32).reshape(4,4,order='F')
def srgb(a):return np.where(a<=.0031308,a*12.92,1.055*np.power(np.maximum(a,0),1/2.4)-.055)
def linear(a):return np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4)
texture_cache={}
def texture(path):
 if path not in texture_cache:texture_cache[path]=np.asarray(Image.open(W/path).convert('RGB').resize((256,256),Image.Resampling.LANCZOS) if 'alloy-panel' in path else Image.open(W/path).convert('RGB'),dtype=np.float32)/255
 return texture_cache[path]
def background(frame,proj,camera):
 if not frame['sky']:return np.broadcast_to(srgb(np.array(frame['background'])),(height,width,3)).copy()
 xx,yy=np.meshgrid((np.arange(width)+.5)/width*2-1,1-(np.arange(height)+.5)/height*2);directions=np.stack([xx/proj[0,0],yy/proj[1,1],-np.ones_like(xx)],axis=-1)@camera[:3,:3].T;directions/=np.linalg.norm(directions,axis=-1,keepdims=True)
 sky=texture(frame['sky']);u=(np.arctan2(directions[:,:,2],directions[:,:,0])/(2*math.pi)+.5)%1;v=.5-np.arcsin(directions[:,:,1])/math.pi
 return sky[np.minimum((v*sky.shape[0]).astype(int),sky.shape[0]-1),(u*sky.shape[1]).astype(int)]*.84
def render(frame):
 view,proj,camera=map(matrix,[frame['view'],frame['projection'],frame['camera']]);canvas=linear(background(frame,proj,camera));depth=np.full((height,width),np.inf);sun=np.array([-8,17,12],dtype=float);sun/=np.linalg.norm(sun);fill=np.array([10,8,-15],dtype=float);fill/=np.linalg.norm(fill)
 triangles=0
 for mesh in frame['meshes']:
  pos=np.array(mesh['position']).reshape(-1,3);model=matrix(mesh['matrix']);world=np.c_[pos,np.ones(len(pos))]@model.T;clip=world@view.T@proj.T;ww=clip[:,3];ndc=clip[:,:3]/np.where(np.abs(ww)<1e-10,1e-10,ww)[:,None];screen=np.c_[(ndc[:,0]+1)*width/2,(1-ndc[:,1])*height/2,ndc[:,2]]
  normals=np.array(mesh['normal']).reshape(-1,3) if mesh['normal'] else None
  if normals is not None:normals=normals@np.linalg.inv(model[:3,:3]);normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-9)
  uv=np.array(mesh['uv']).reshape(-1,2) if mesh['uv'] else None;index=np.array(mesh['index'] if mesh['index'] is not None else range(len(pos))).reshape(-1,3)
  for ti,ids in enumerate(index):
   if np.any(ww[ids]<=.055):continue
   p=screen[ids];xmin=max(0,int(np.floor(p[:,0].min())));xmax=min(width-1,int(np.ceil(p[:,0].max())));ymin=max(0,int(np.floor(p[:,1].min())));ymax=min(height-1,int(np.ceil(p[:,1].max())))
   if xmin>xmax or ymin>ymax:continue
   a,b,c=p;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
   if abs(den)<1e-7:continue
   xx,yy=np.meshgrid(np.arange(xmin,xmax+1)+.5,np.arange(ymin,ymax+1)+.5);ba=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den;bb=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;bc=1-ba-bb;z=ba*a[2]+bb*b[2]+bc*c[2];old=depth[ymin:ymax+1,xmin:xmax+1];mask=(ba>=-.001)&(bb>=-.001)&(bc>=-.001)&(z<old)&(z>=-1)&(z<=1)
   if not mask.any():continue
   mat=mesh['materials'][0]
   if len(mesh['materials'])>1:
    group=next((g for g in mesh['groups'] if g['start']<=ti*3<g['start']+g['count']),None)
    if group:mat=mesh['materials'][group['materialIndex']]
   n=normals[ids].mean(axis=0) if normals is not None else np.cross(world[ids[1],:3]-world[ids[0],:3],world[ids[2],:3]-world[ids[0],:3]);n/=max(np.linalg.norm(n),1e-10)
   illumination=.34+max(0,n@sun)*.52+max(0,n@fill)*.24;albedo=np.array(mat['color'] or [1,1,1],dtype=np.float32);color=np.broadcast_to(albedo,(*xx.shape,3)).copy();weights=np.stack([ba,bb,bc],axis=-1)/ww[ids];weights/=np.maximum(weights.sum(axis=-1,keepdims=True),1e-9)
   if mat['map'] and uv is not None:
    coords=weights@uv[ids];im=texture(mat['map']);uu=np.mod(coords[:,:,0],1);vv=1-np.mod(coords[:,:,1],1) if mat.get('mapFlip',True) else np.mod(coords[:,:,1],1);sample=im[np.clip((vv*im.shape[0]).astype(int),0,im.shape[0]-1),np.clip((uu*im.shape[1]).astype(int),0,im.shape[1]-1)];color*=linear(sample)
   if mesh.get('color'):
    attr=mesh['color'];vertex_color=np.array(attr['values'],dtype=np.float32).reshape(-1,attr['size'])[:,:3];color*=weights@vertex_color[ids]
   color*=illumination;em=np.array(mat['emissive'] or [0,0,0]);color+=em*mat['emissiveIntensity']*.5
   wpos=weights@world[ids,:3]
   if frame['id']=='rigworks' and abs(n[1])>.8 and wpos[:,:,1].mean()<.5:
    s=frame['state'];shadow=np.exp(-((wpos[:,:,0]-s['x'])/1.65)**2-((wpos[:,:,2]-s['z'])/2)**2)*.32;color*=1-shadow[:,:,None]
   if frame['fog']:
    f=frame['fog'];distance=np.linalg.norm(wpos-camera[:3,3],axis=-1);mix=np.clip((distance-f['near'])/(f['far']-f['near']),0,1);color=color*(1-mix[:,:,None])+np.array(f['color'])[None,None,:]*mix[:,:,None]
   dst=canvas[ymin:ymax+1,xmin:xmax+1];alpha=mat['opacity'] if mat['transparent'] else 1;dst[mask]=color[mask]*alpha+dst[mask]*(1-alpha);old[mask]=z[mask];triangles+=1
 im=Image.fromarray(np.uint8(np.clip(srgb(canvas),0,1)*255)).resize((1120,630),Image.Resampling.LANCZOS);draw=ImageDraw.Draw(im,'RGBA');draw.rectangle((0,0,1120,87),fill=(7,20,28,210));draw.rectangle((0,548,1120,630),fill=(7,20,28,215))
 font=lambda n:ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',n)
 s=frame['state'];title='铆钉工坊' if frame['id']=='rigworks' else '失重航廊';small='MACHINE WORKSHOP / 真实三维装配' if frame['id']=='rigworks' else 'SIX DEGREES / 自由平移与三轴旋转';draw.text((30,18),small,font=font(12),fill='#abc9c7');draw.text((29,40),title,font=font(25),fill='#f5dfb4')
 if frame['id']=='rigworks':stats=f"车体 {s['integrity']:.0f}% · 速度 {abs(s['speed']):.1f} m/s · "+('已交付' if s['won'] else '装配模式' if s['phase']=='build' else '货箱已装载' if s['cargo'] else '前往货箱')
 else:stats=f"信标 {s['beacon']}/4 · 速度 {np.linalg.norm(s['v']):.1f} m/s · 船体 {s['integrity']:.0f}%"
 draw.text((30,573),s['message'],font=font(14),fill='#eddbb9');draw.text((30,602),stats,font=font(12),fill='#bbd9ce')
 if s['won']:
  draw.rounded_rectangle((310,218,810,383),radius=13,fill=(15,35,46,238),outline='#a6b5a0',width=1);draw.text((370,250),'机械交付完成' if frame['id']=='rigworks' else '立体航线完成',font=font(28),fill='#f2d7a2');draw.text((349,307),stats,font=font(13),fill='#c5ddd0')
 return im,triangles
report=[]
for f in sorted(Q.glob('*.scene.json')):
 frame=json.loads(f.read_text(encoding='utf-8'));im,n=render(frame);target=Q/(f.stem.replace('.scene','')+'.png');im.save(target);report.append({'id':frame['id'],'phase':frame['phase'],'file':target.relative_to(P).as_posix(),'visible_triangles':n})
(P/'notes/foundry-geometry-frames-20261004.json').write_text(json.dumps({'method':'Production scene meshes/cameras via independent depth-buffered diagnostic rasterizer. Lighting is an approximation; these are not browser WebGL screenshots. HUD is a diagnostic overlay.','frames':report},ensure_ascii=False,indent=2),encoding='utf-8')
print('Rendered geometry review frames:',len(report))
