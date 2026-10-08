import {W,H} from './showcase-core.js';

export function precisionPanel(host,markup){
 const frame=host.closest('.player-frame')||host,mount=host.closest('.play-mount')||host;
 frame.classList.add('precision-frame');
 const panel=document.createElement('div');panel.className='precision-controls';
 panel.innerHTML=`<style>
 .precision-controls{box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;padding:12px 16px;background:linear-gradient(120deg,#152c32,#0d1822);border:1px solid #8b744761;border-radius:0 0 9px 9px;color:#efe6d0;font:14px 'Microsoft YaHei',sans-serif}
 .precision-controls label{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.precision-controls input[type=range]{width:170px;min-height:44px;accent-color:#dab976;cursor:pointer}.precision-controls output{min-width:42px;font-variant-numeric:tabular-nums}.precision-controls .precision-buttons{display:flex;gap:8px}.precision-controls button{min-height:46px;min-width:68px;border:1px solid #9b875b;border-radius:6px;padding:8px 14px;background:#243a40;color:#f5ecd9;font:600 14px 'Microsoft YaHei',sans-serif;cursor:pointer}.precision-controls .primary{background:linear-gradient(#d4b778,#a08247);color:#172426}.precision-controls button:disabled,.precision-controls input:disabled{opacity:.4;cursor:default}.precision-controls :is(button,input):focus-visible{outline:3px solid #82dcdf;outline-offset:3px}.precision-readout{display:flex;flex-direction:column;gap:6px}.precision-readout small{font-size:12px;color:#a3b8bd}
 body.polished:not(.embedded) .player-frame.precision-frame:not(:fullscreen){width:min(100%,calc((100vh - 220px)*1.77778));max-width:1138px;margin-inline:auto}
 #player-frame.precision-frame:fullscreen{box-sizing:border-box;flex-direction:column;padding-top:56px;--precision-space:96px}
 #player-frame.precision-frame:fullscreen .play-mount{flex:none;width:min(100vw,calc((100vh - var(--precision-space) - 56px)*1.77778));height:min(calc(100vh - var(--precision-space) - 56px),56.25vw)!important;aspect-ratio:16/9}
 #player-frame.precision-frame:fullscreen .precision-controls{flex:none;width:min(100vw,calc((100vh - var(--precision-space) - 56px)*1.77778))}
 @media(max-width:600px){.precision-controls{flex-wrap:wrap;padding:10px;gap:9px}.precision-controls label,.precision-controls .precision-readout{width:100%}.precision-controls input[type=range]{flex:1;min-width:80px}.precision-controls .precision-buttons{width:100%}.precision-controls button{flex:1;min-height:46px;padding:8px 10px;font-size:13px}.precision-controls small{font-size:11px}#player-frame.precision-frame:fullscreen{--precision-space:138px}body.polished:not(.embedded) .player-frame.precision-frame:not(:fullscreen){width:100%}}
 </style>${markup}`;
 mount.after(panel);
 return {panel,frame,dispose(){panel.remove();frame.classList.remove('precision-frame')}};
}
export function pointerPosition(element,e){const r=element.getBoundingClientRect(),scale=Math.min(r.width/W,r.height/H);return {x:(e.clientX-r.left-(r.width-W*scale)/2)/scale,y:(e.clientY-r.top-(r.height-H*scale)/2)/scale}}
export function inscription(ctx,title,subtitle){ctx.save();ctx.textAlign='left';ctx.fillStyle='#f7e7bc';ctx.font='600 20px "Microsoft YaHei",sans-serif';ctx.fillText(title,80,38);ctx.font='12px "Microsoft YaHei",sans-serif';ctx.fillStyle='#c4c6b7';ctx.fillText(subtitle,80,58);ctx.restore()}
export function endCard(ctx,title,detail){ctx.save();ctx.fillStyle='#04121b79';ctx.fillRect(0,0,W,H);ctx.fillStyle='#0d252aeF';ctx.strokeStyle='#b59863';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(310,244,500,144,12);ctx.fill();ctx.stroke();ctx.textAlign='center';ctx.fillStyle='#fbe5b4';ctx.font='600 27px "Microsoft YaHei",sans-serif';ctx.fillText(title,560,291);ctx.font='15px "Microsoft YaHei",sans-serif';ctx.fillStyle='#c9d8d5';ctx.fillText(detail,560,328);ctx.font='13px "Microsoft YaHei",sans-serif';ctx.fillText('下方可以重新开始，或切换另一种形态',560,362);ctx.restore()}
