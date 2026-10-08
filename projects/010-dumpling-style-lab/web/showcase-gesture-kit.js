import {observationPanel} from './showcase-observation-kit.js?v=20261004-2';
export function gesturePanel(host,kind,markup){
 const ui=observationPanel(host,kind,`<style>
 .gesture-pad{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:9px}.gesture-pad button{touch-action:none}
 .gesture-note{margin:8px 0 0;color:#b9d1d3;font-size:12px;line-height:1.7}
 .trace-controls{background:linear-gradient(115deg,#142a36,#211d3b);border-color:#788ca580}.trace-controls .primary{background:linear-gradient(#b8ebdc,#76b8c5);color:#122736}
 .swing-controls{background:linear-gradient(115deg,#f0e7d4,#ddd5bd);color:#3e4c43;border-color:#917f54}.swing-controls button{color:#3c514a;background:#f8f0df;border-color:#a39370}.swing-controls .readout,.swing-controls .gesture-note{color:#4d625a}.swing-controls .primary{color:#f8efda;background:linear-gradient(#567969,#38584d)}.swing-controls button[aria-pressed=true]{background:#bad4c2;color:#243f33}
 .gesture-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.gesture-toolbar .readout{flex:1 1 190px;font-variant-numeric:tabular-nums;font-size:13px}
 @media(max-width:650px){.gesture-toolbar .readout{flex-basis:100%}.gesture-toolbar button{flex:1}.gesture-pad{gap:5px}.gesture-pad button{padding:8px 4px;font-size:12px}.gesture-note{font-size:11px}.swing-controls .gesture-toolbar:not(.cut-buttons){display:grid;grid-template-columns:1fr 1fr}.swing-controls .readout{grid-column:1/-1}.swing-controls .cut-buttons{display:flex;gap:6px;margin:8px 0}.swing-controls .cut-buttons button{flex:1}}
 </style>${markup}`);
 return ui;
}
