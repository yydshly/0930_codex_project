// Original closed porcelain surfaces. Dimensions are supplied by the merchant catalogue.
export function makeToiletParts(T, m, materials) {
  const {ceramic, seatMat, chrome, dark, waterMat, rubber} = materials;
  const scale = .003, w = m.width*scale, d = m.depth*scale;
  const h = m.height*scale, sy = m.seatHeight*scale, rim = sy-.095;
  const bodyGroup=new T.Group(), seatGroup=new T.Group(), lidPivot=new T.Group(), tankGroup=new T.Group();
  function surface(profile, material, count=160, slope=0, slopeOrigin=0) {
    const positions=[],uv=[],indices=[];
    // D contours: a rounded front and broader, flatter shoulders at the rear.
    for (let j=0;j<profile.length;j++) for(let i=0;i<=count;i++){
      const a=i/count*Math.PI*2,p=profile[j],cos=Math.cos(a),sin=Math.sin(a);
      const n=sin<0?(p.back||3.8):(p.front||2.15);
      const vz=Math.sign(sin)*Math.pow(Math.abs(sin),2/n)*p.rz+(p.z||0);
      positions.push(Math.sign(cos)*Math.pow(Math.abs(cos),2/n)*p.rx,p.y+slope*(vz-slopeOrigin)+(p.skirtLift||0)*(.018+.073*d*.475-.073*vz),vz);
      uv.push(i/count,j/(profile.length-1));
    }
    for(let j=0;j<profile.length-1;j++)for(let i=0;i<count;i++){
      const a=j*(count+1)+i,b=a+count+1;indices.push(a,b,a+1,b,b+1,a+1);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
    const normals=g.attributes.normal;
    for(let j=0;j<profile.length;j++){
      const a=j*(count+1),b=a+count,n=new T.Vector3().fromBufferAttribute(normals,a).add(new T.Vector3().fromBufferAttribute(normals,b)).normalize();
      normals.setXYZ(a,n.x,n.y,n.z);normals.setXYZ(b,n.x,n.y,n.z);
    }
    const mesh=new T.Mesh(g,material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
  }
  // Subdivide curved profiles to keep reflection bands smooth at close range.
  function smooth(points, divisions=3) {
    const p=points.map(v=>new T.Vector3(v.rx,v.y,v.rz)),curve=new T.CatmullRomCurve3(p,false,'centripetal',.3);
    const zCurve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(v.z||0,0,0)),false,'catmullrom',.2);
    return Array.from({length:(points.length-1)*divisions+1},(_,i)=>{
      const t=i/((points.length-1)*divisions),v=curve.getPoint(t);
      return {rx:Math.max(0,v.x),y:v.y,rz:Math.max(0,v.z),z:zCurve.getPoint(t).x};
    });
  }
  const rx=w*.495,rz=d*(m.tank?.37:.477),center=m.tank?d*.115:0;
  const bowlZ=d*.108,bowlRz=d*(m.tank?.285:.315);
  const skirt=[
    {y:.017,rx:rx*.87,rz:rz*.93,z:center-.04},
    {y:.033,rx:rx*.91,rz:rz*.95,z:center-.038},
    {y:rim*.12,rx:rx*.92,rz:rz*.952,z:center-.035},
    {y:rim*.28,rx:rx*.918,rz:rz*.955,z:center-.030},
    {y:rim*.46,rx:rx*.924,rz:rz*.964,z:center-.020},
    {y:rim*.66,rx:rx*.953,rz:rz*.98,z:center-.008},
    {y:rim*.82,rx:rx*.98,rz:rz*.995,z:center},
    {y:rim-.035,rx:rx,rz:rz,z:center},
    {y:rim-.010,rx:rx*1.004,rz:rz*1.002,z:center},
    {y:rim+.008,rx:rx,rz:rz,z:center}
  ];
  const outer=smooth(skirt,5);
  // The actual cavity joins the back deck and ceramic rim, with a recessed water well.
  const inside=[
    {y:rim+.013,rx:rx*.90,rz:rz*.93,z:center},
    {y:rim+.014,rx:rx*.725,rz:bowlRz*.97,z:bowlZ},
    {y:rim-.010,rx:rx*.705,rz:bowlRz*.955,z:bowlZ},
    {y:rim-.075,rx:rx*.685,rz:bowlRz*.933,z:bowlZ},
    {y:rim-.15,rx:rx*.644,rz:bowlRz*.875,z:bowlZ+.012},
    {y:rim*.66,rx:rx*.495,rz:bowlRz*.63,z:bowlZ+.048},
    {y:rim*.47,rx:rx*.32,rz:bowlRz*.39,z:bowlZ+.079},
    {y:rim*.355,rx:rx*.245,rz:bowlRz*.29,z:bowlZ+.096},
    {y:rim*.32,rx:rx*.232,rz:bowlRz*.275,z:bowlZ+.10}
  ];
  const bodyProfile=[...outer,...smooth(inside,4)].map(p=>({...p,skirtLift:m.tank?0:Math.pow(Math.min(1,Math.max(0,p.y/rim)),4)}));
  bodyGroup.add(surface(bodyProfile,ceramic));
  function disc(rx,rz,y,z,material) {
    const o=new T.Mesh(new T.CircleGeometry(1,96),material);o.rotation.x=-Math.PI/2;o.scale.set(rx,rz,1);o.position.set(0,y,z);o.receiveShadow=true;return o;
  }
  bodyGroup.add(disc(rx*.234,bowlRz*.28,rim*.32,bowlZ+.1,dark));
  bodyGroup.add(disc(rx*.253,bowlRz*.304,rim*.344,bowlZ+.098,waterMat));
  bodyGroup.add(disc(rx*.855,rz*.922,.018,center-.04,rubber));
  if(m.tank){
    // The base continues underneath the cistern, rather than a separate floating back box.
    const bridge=surface([
      {y:.025,rx:w*.40,rz:d*.14,z:-d*.35},
      {y:.045,rx:w*.43,rz:d*.15,z:-d*.35},
      {y:rim-.05,rx:w*.45,rz:d*.15,z:-d*.35},
      {y:rim,rx:w*.42,rz:d*.145,z:-d*.35}
    ],ceramic);
    bodyGroup.add(bridge);
  }
  const seatRx=rx*.998,seatRz=d*(m.tank?.363:.475),seatZ=m.tank?center:0;
  seatGroup.position.y=sy-.04;
  seatGroup.add(surface([
    {y:-.021,rx:seatRx*.99,rz:seatRz*.997,z:seatZ},
    {y:-.008,rx:seatRx,rz:seatRz,z:seatZ},
    {y:.019,rx:seatRx*.991,rz:seatRz*.991,z:seatZ},
    {y:.027,rx:seatRx*.969,rz:seatRz*.972,z:seatZ},
    {y:.026,rx:seatRx*.716,rz:bowlRz*.945,z:bowlZ},
    {y:.011,rx:seatRx*.701,rz:bowlRz*.93,z:bowlZ},
    {y:-.023,rx:seatRx*.707,rz:bowlRz*.934,z:bowlZ},
    {y:-.021,rx:seatRx*.99,rz:seatRz*.997,z:seatZ}
  ],seatMat,160,m.tank?0:-.073,m.tank?0:seatRz));
  const hingeZ=seatZ-seatRz*.955;
  lidPivot.position.set(0,m.tank?sy-.008:h-.050,hingeZ);lidPivot.userData.baseY=lidPivot.position.y;
  const z=seatZ-hingeZ;
  lidPivot.add(surface([
    {y:0,rx:0,rz:0,z},
    {y:0,rx:seatRx*.962,rz:seatRz*.972,z},
    {y:.009,rx:seatRx*.994,rz:seatRz*.992,z},
    {y:.025,rx:seatRx,rz:seatRz,z},
    {y:.039,rx:seatRx*.977,rz:seatRz*.984,z},
    {y:.048,rx:seatRx*.88,rz:seatRz*.89,z},
    {y:.052,rx:seatRx*.57,rz:seatRz*.60,z},
    {y:.052,rx:0,rz:0,z}
  ],seatMat,160,m.tank?0:-.073,0));
  for(const x of [-w*.24,w*.24]){
    const hinge=new T.Mesh(new T.CylinderGeometry(.025,.025,.07,40),chrome);
    hinge.rotation.z=Math.PI/2;hinge.position.set(x,lidPivot.position.y-.014,hingeZ);bodyGroup.add(hinge);
    const mount=new T.Mesh(new T.CylinderGeometry(.022,.028,.034,32),chrome);
    mount.position.set(x,sy-.043,hingeZ);bodyGroup.add(mount);
  }
  if(m.tank){
    const bottom=sy-.06,top=h-.075,tz=-d*.362,trx=w*.445,trz=d*.122;
    const tankProfile=[
      {y:bottom,rx:0,rz:0,z:tz},
      {y:bottom,rx:trx*.91,rz:trz*.93,z:tz},
      {y:bottom+.018,rx:trx*.963,rz:trz*.98,z:tz},
      {y:bottom+.08,rx:trx*.982,rz:trz,z:tz},
      {y:(bottom+top)/2,rx:trx,rz:trz*1.014,z:tz},
      {y:top-.03,rx:trx,rz:trz,z:tz},
      {y:top,rx:trx*.96,rz:trz*.97,z:tz}
    ].map(p=>({...p,front:5.6,back:5.6}));
    tankGroup.add(surface(tankProfile,ceramic));
    tankGroup.add(surface([
      {y:top+.008,rx:0,rz:0,z:tz,front:6,back:6},
      {y:top+.008,rx:trx*.98,rz:trz*1.025,z:tz,front:6,back:6},
      {y:top+.027,rx:trx*1.01,rz:trz*1.04,z:tz,front:6,back:6},
      {y:h-.025,rx:trx*.98,rz:trz*1.01,z:tz,front:6,back:6},
      {y:h-.013,rx:trx*.70,rz:trz*.74,z:tz,front:6,back:6},
      {y:h-.011,rx:0,rz:0,z:tz,front:6,back:6}
    ],seatMat));
    const flush=new T.Mesh(new T.CylinderGeometry(.068,.068,.009,64),chrome);
    flush.position.set(0,h-.006,tz);tankGroup.add(flush);
    const split=new T.Mesh(new T.BoxGeometry(.002,.013,.11),dark);
    split.position.copy(flush.position);tankGroup.add(split);
  }else{
    // Integrated rear housing stays within the outer envelope and meets the skirt.
    const pz=-d*.373,prz=d*.106,prx=w*.476,base=sy-.10,top=h-.025;
    tankGroup.add(surface([
      {y:base,rx:0,rz:0,z:pz,front:5,back:5},
      {y:base,rx:prx*.985,rz:prz*.99,z:pz,front:5,back:5},
      {y:top-.033,rx:prx*.985,rz:prz,z:pz,front:5,back:5},
      {y:top-.008,rx:prx*.956,rz:prz*.96,z:pz,front:5,back:5},
      {y:top,rx:prx*.84,rz:prz*.85,z:pz,front:5,back:5},
      {y:top+.006,rx:0,rz:0,z:pz,front:5,back:5}
    ],seatMat));
    const bezel=new T.Mesh(new T.CylinderGeometry(.045,.045,.012,72),dark);bezel.rotation.z=Math.PI/2;bezel.position.set(w*.48,sy+.021,pz);tankGroup.add(bezel);
    const dial=new T.Mesh(new T.CylinderGeometry(.039,.039,.018,72),chrome);dial.rotation.z=Math.PI/2;dial.position.set(w*.488,sy+.021,pz);tankGroup.add(dial);
    const inset=new T.Mesh(new T.CylinderGeometry(.024,.024,.019,64),chrome);inset.rotation.z=Math.PI/2;inset.position.set(w*.493,sy+.021,pz);tankGroup.add(inset);
    // Small physical grip flutes, visible in close-range orbit.
    for(let i=0;i<40;i++){
      const a=i/40*Math.PI*2,groove=new T.Mesh(new T.BoxGeometry(.012,.0014,.003),dark);
      groove.position.set(w*.493,sy+.021+Math.cos(a)*.035,pz+Math.sin(a)*.035);groove.rotation.x=-a;tankGroup.add(groove);
    }
  }
  return {bodyGroup,seatGroup,lidPivot,tankGroup};
}
