import {VoyagesNode,installVoyagesDouble,Canvas,SkiaImage} from './voyages-dom-double.mjs';
export {Canvas,SkiaImage};
// Unlike earlier adapters, canvas dimensions must follow native width/height for
// full-size offscreen texture reads and depth-buffered three-dimensional output.
export class KineticsNode extends VoyagesNode{
 get width(){return this.canvas?.width??this._width;}
 set width(v){this._width=v;if(this.canvas)this.canvas.width=v;}
 get height(){return this.canvas?.height??this._height;}
 set height(v){this._height=v;if(this.canvas)this.canvas.height=v;}
}
export function installKineticsDouble(web){installVoyagesDouble(web);document.createElement=type=>new KineticsNode(type==='canvas',type);}
