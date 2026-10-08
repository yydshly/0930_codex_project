export const ART_DIRECTIONS=[
 {id:'paint',name:'原画版',description:'手绘场景与原人物素材。'},
 {id:'pixel',name:'像素世界',description:'低分辨率场景、像素人物和逐帧动作。'},
 {id:'cel',name:'动态赛璐璐',description:'轮廓、块面光影与关节人物。'},
 {id:'paper',name:'纸片剧场',description:'分层纸景、折面与舞台投影。'},
 {id:'neon',name:'霓虹线绘',description:'深色空间、发光轮廓与流动信号。'},
 {id:'diorama',name:'3D 微缩场景',description:'实体人物、柔和光照与剖面建筑；可转动镜头。',spatial:true},
 {id:'voxel',name:'3D 体素世界',description:'立方体建筑与人物；可环绕、缩放与查看剖面。',spatial:true},
 {id:'cinematic',name:'3D 电影光影',description:'冷暖侧光、夜色与金属设施；可转动镜头。',spatial:true},
 {id:'clay',name:'黏土微缩',description:'雕塑般的轮廓、黏土压痕与柔和接触阴影。新场景、人物逐帧动作与家具素材；旅店画风样板，二维素材呈现。',games:['inn'],raster:true},
 {id:'felt',name:'毛毡手作',description:'羊毛纤维、织物与缝线构成整个世界。配套人物动作与家具；旅店画风样板，二维素材呈现。',games:['inn'],raster:true},
 {id:'watercolor',name:'水彩线稿',description:'透明色层、墨线与纸面留白，像一本可走进的旅行速写。配套人物动作与家具；旅店画风样板。',games:['inn'],raster:true},
 {id:'engraving',name:'版画蚀刻',description:'细密排线、深色墨块与古纸构成文学插画气氛。配套人物动作与家具；旅店画风样板。',games:['inn'],raster:true}
];
export const SPATIAL_GAMES=['wasteland','inn'];
export const supportsArtDirection=(id,game)=>ART_DIRECTIONS.some(d=>d.id===id&&(!d.spatial||SPATIAL_GAMES.includes(game))&&(!d.games||d.games.includes(game)));
let direction='paint',clock=0;
const listeners=new Set();
export const getArtDirection=()=>direction;
export const getArtClock=()=>clock;
export const isSpatialDirection=(id=direction)=>ART_DIRECTIONS.some(d=>d.id===id&&d.spatial);
export function advanceArtClock(dt){clock+=dt}
export function setArtDirection(id){if(!ART_DIRECTIONS.some(d=>d.id===id))return false;direction=id;for(const f of listeners)f(id);return true}

export function installArtDirections(onChange){
 const qa=new URLSearchParams(location.search).has('qa'),key=qa?'dumpling-art-directions-qa-v2':'dumpling-art-directions-v2';
 let preferences={};try{preferences=JSON.parse(localStorage.getItem(key))||{}}catch{}
 const initialLook=new URLSearchParams(location.search).get('look');
 // Migrate the old global preference once, into the first visited game.
 let initialPreference='paint';try{if(!Object.keys(preferences).length)initialPreference=localStorage.getItem('dumpling-art-direction-v1')||'paint'}catch{}
 let world=null,first=true,lastAnnounce='';
 const root=document.createElement('section');root.id='art-directions';root.className='art-directions';root.setAttribute('aria-label','本游戏美术画风');
 const heading=document.createElement('div');heading.className='art-direction-heading';
 const title=document.createElement('strong');title.textContent='美术画风 · 场景与人物的视觉语言';
 const favorite=document.createElement('button');favorite.type='button';favorite.className='art-favorite';favorite.textContent='记住此画风';
 const archive=document.createElement('a');archive.textContent='已保存的原画版 ↗';heading.append(title,favorite,archive);
 const choices=document.createElement('div');choices.className='art-direction-choices';choices.setAttribute('role','group');choices.setAttribute('aria-label','选择本游戏美术画风');
 const hint=document.createElement('p');hint.className='art-direction-description';
 const supported=supportsArtDirection;
 const samples=document.createElement('div');samples.className='art-style-samples';
 const sampleTitle=document.createElement('strong');sampleTitle.className='art-style-title';sampleTitle.textContent='新画风样板 · 同一间旅店，四套完整美术';
 const sampleChoices=document.createElement('div');sampleChoices.className='art-style-choices';sampleChoices.setAttribute('role','group');sampleChoices.setAttribute('aria-label','旅店的新美术风格');samples.append(sampleTitle,sampleChoices);
 function persist(){try{localStorage.setItem(key,JSON.stringify(preferences))}catch{}}
 function announce(force=false){const data={type:'dumpling-art-preference',game:world,look:direction,favorite:!!preferences[world]?.favorite},key=JSON.stringify(data);if(parent!==window&&(force||key!==lastAnnounce)){lastAnnounce=key;parent.postMessage(data,location.origin)}}
 function updateURL(){const u=new URL(location.href);u.searchParams.set('look',direction);history.replaceState(null,'',u)}
 function render(){
   document.body.dataset.artDirection=direction;
   const favoriteHere=preferences[world]?.favorite&&preferences[world]?.look===direction;
   favorite.textContent=favoriteHere?'已记住此画风 ✓':'记住此画风';favorite.setAttribute('aria-pressed',String(!!favoriteHere));
   hint.textContent=ART_DIRECTIONS.find(d=>d.id===direction).description+' 每款游戏分别记住选择，切换画风会保留游戏进度。';
   samples.hidden=world!=='inn';
   for(const b of [...choices.children,...sampleChoices.children]){b.setAttribute('aria-pressed',String(b.dataset.artDirection===direction));b.disabled=!supported(b.dataset.artDirection,world);b.title=b.disabled?'此模式尚未接入当前游戏':''}
   const u=new URL(location.href);u.searchParams.delete('look');u.searchParams.delete('embedded');archive.href='./versions/painted-20261002/games.html'+u.search+u.hash;announce();
 }
 function apply(id,remember=true){if(!supported(id,world))return;setArtDirection(id);if(remember){preferences[world]={look:id,favorite:preferences[world]?.favorite&&preferences[world]?.look===id};persist()}updateURL();render();onChange?.()}
 for(const d of ART_DIRECTIONS){const b=document.createElement('button');b.type='button';b.dataset.artDirection=d.id;b.onclick=()=>apply(d.id);if(d.raster){b.className='art-style-card';const image=document.createElement('img');image.src='./assets/art-styles/'+d.id+'/playable-preview.webp';image.alt='';image.loading='lazy';const name=document.createElement('strong');name.textContent=d.name;const detail=document.createElement('span');detail.textContent=d.description.split('。')[0];b.append(image,name,detail);sampleChoices.append(b)}else{b.textContent=d.name;choices.append(b)}}
 favorite.onclick=()=>{preferences[world]={look:direction,favorite:!(preferences[world]?.favorite&&preferences[world]?.look===direction)};persist();render()};
 root.append(heading,choices,samples,hint);document.querySelector('.game-tabs').after(root);listeners.add(render);
 window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin)return;if(e.data?.type==='dumpling-art-select')apply(e.data.look);if(e.data?.type==='dumpling-art-favorite')favorite.click();if(e.data?.type==='dumpling-art-request')announce(true)});
 return {sync(){
   const game=document.body.dataset.game;if(!game)return;
   if(game!==world){world=game;let preferred=first?(initialLook||preferences[game]?.look||initialPreference):preferences[game]?.look||'paint';if(first&&initialLook&&supported(initialLook,game)){preferences[game]={look:initialLook,favorite:preferences[game]?.look===initialLook&&!!preferences[game]?.favorite};persist()}first=false;
     if(!supported(preferred,game))preferred=supported(preferences[game]?.look,game)?preferences[game].look:'paint';
     if(preferences[game]?.look!==preferred){preferences[game]={look:preferred,favorite:false};persist()}
     setArtDirection(preferred);updateURL();
   }
   render();
 }};
}
