// Browser-independent geometry helpers, also used by the checks.
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function makeTileBody(Matter, tile) {
  // Freeze AFTER construction, so Matter preserves finite dynamic mass/inertia.
  // Constructing with isStatic:true does not provide a releasable dynamic body.
  const body = tile.vertices
    ? Matter.Bodies.fromVertices(tile.cx,tile.cy,[tile.vertices],{friction:.2,restitution:.5,label:'page-shard'})
    : Matter.Bodies.rectangle(tile.x+tile.width/2,tile.y+tile.height/2,tile.width,tile.height,{friction:.35,restitution:.15,label:'page-tile'});
  Matter.Body.setStatic(body,true);
  return body;
}
export function polygonArea(vertices) {
  return Math.abs(vertices.reduce((sum,p,i)=>{const q=vertices[(i+1)%vertices.length];return sum+p.x*q.y-q.x*p.y;},0))/2;
}
export function fragmentsForRect(rect, cellSize, tag, effect='classic') {
  if(effect==='paper')return tilesForRect(rect,cellSize,tag).flatMap(tile=>{
    const result=[];const stripHeight=Math.max(12,cellSize*.38);
    for(let y=tile.y;y<tile.y+tile.height-.01;y+=stripHeight){const height=Math.min(stripHeight,tile.y+tile.height-y);result.push({...tile,y,height,area:tile.width*height});}
    return result;
  });
  if(effect!=='glass')return tilesForRect(rect,cellSize,tag);
  if(!Number.isFinite(cellSize)||cellSize<16)throw new Error('cellSize must be at least 16 px');
  const cols=Math.ceil(rect.width/cellSize),rows=Math.ceil(rect.height/cellSize);
  const noise=(x,y)=>{const n=Math.sin(x*127.1+y*311.7+rect.x*.03+rect.y*.02)*43758.5453;return n-Math.floor(n);};
  const grid=Array.from({length:rows+1},(_,row)=>Array.from({length:cols+1},(_,col)=>({
    x:rect.x+Math.min(col*cellSize,rect.width)+(col>0&&col<cols?(noise(col,row)-.5)*Math.min(cellSize,rect.width-col*cellSize)*.4:0),
    y:rect.y+Math.min(row*cellSize,rect.height)+(row>0&&row<rows?(noise(row+37,col)-.5)*Math.min(cellSize,rect.height-row*cellSize)*.4:0)
  })));
  const fragments=[];
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const a=grid[row][col],b=grid[row][col+1],c=grid[row+1][col+1],d=grid[row+1][col];
    for(const vertices of (row+col)%2?[[a,b,d],[b,c,d]]:[[a,b,c],[a,c,d]]){
      const xs=vertices.map(v=>v.x),ys=vertices.map(v=>v.y),x=Math.min(...xs),y=Math.min(...ys);
      fragments.push({x,y,width:Math.max(...xs)-x,height:Math.max(...ys)-y,cx:xs.reduce((s,v)=>s+v,0)/3,cy:ys.reduce((s,v)=>s+v,0)/3,vertices,area:polygonArea(vertices),tag});
    }
  }
  return fragments;
}
export function tilesForRect(rect, cellSize, tag = 'content') {
  if (!Number.isFinite(cellSize) || cellSize < 16) throw new Error('cellSize must be at least 16 px');
  const tiles = [];
  for (let y = rect.y; y < rect.y + rect.height - .01; y += cellSize) {
    for (let x = rect.x; x < rect.x + rect.width - .01; x += cellSize) {
      const width = Math.min(cellSize, rect.x + rect.width - x);
      const height = Math.min(cellSize, rect.y + rect.height - y);
      tiles.push({ x, y, width, height, area: width * height, tag });
    }
  }
  return tiles;
}
export function destructionProgress(tiles, goalTag = null) {
  let total = 0, destroyed = 0, goalTotal = 0, goalDestroyed = 0;
  for (const tile of tiles) {
    total += tile.area;
    const fraction=clamp(tile.progress??(tile.detached?1:0),0,1);
    destroyed += tile.area*fraction;
    if (!goalTag || tile.tag === goalTag) {
      goalTotal += tile.area;
      goalDestroyed += tile.area*fraction;
    }
  }
  return { ratio: total ? destroyed / total : 0, goalRatio: goalTotal ? goalDestroyed / goalTotal : 0, total, destroyed };
}
export function closestRayHit(Matter, tiles, start, end) {
  const candidates = tiles.filter(tile => !tile.detached);
  const hits = Matter.Query.ray(candidates.map(tile=>tile.body),start,end,1);
  let best = null, distance = Infinity;
  const bodies = new Set(hits.flatMap(hit=>[hit.bodyA,hit.bodyB]));
  for (const tile of candidates) {
    if (!bodies.has(tile.body)) continue;
    const d = Math.hypot(tile.body.position.x-start.x,tile.body.position.y-start.y);
    if (d < distance) { best = tile; distance = d; }
  }
  return best;
}
