var st={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},yt={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3};var ri=0,oi=1,ai=2,ci=3,li=4,hi=5,ui=6,di=7;var fi=300;var Zn=1e3,_e=1001,Jn=1002;var is=1006;var ss=1008;var rs=1009;var os=1023;var ve=2300,Qe=2301,Ke=2302,jn=2400,Kn=2401,$n=2402;var pi="",dt="srgb",Qn="srgb-linear",ti="linear",$e="srgb";var ne=2e3,se=2001;var re=class{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){let n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){let n=this._listeners;if(n===void 0)return;let i=n[t];if(i!==void 0){let r=i.indexOf(e);r!==-1&&i.splice(r,1)}}dispatchEvent(t){let e=this._listeners;if(e===void 0)return;let n=e[t.type];if(n!==void 0){t.target=this;let i=n.slice(0);for(let r=0,o=i.length;r<o;r++)i[r].call(this,t);t.target=null}}},j=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Vi=1234567,xe=Math.PI/180,Me=180/Math.PI;function dn(){let s=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(j[s&255]+j[s>>8&255]+j[s>>16&255]+j[s>>24&255]+"-"+j[t&255]+j[t>>8&255]+"-"+j[t>>16&15|64]+j[t>>24&255]+"-"+j[e&63|128]+j[e>>8&255]+"-"+j[e>>16&255]+j[e>>24&255]+j[n&255]+j[n>>8&255]+j[n>>16&255]+j[n>>24&255]).toLowerCase()}function N(s,t,e){return Math.max(t,Math.min(e,s))}function mi(s,t){return(s%t+t)%t}function ar(s,t,e,n,i){return n+(s-t)*(i-n)/(e-t)}function cr(s,t,e){return s!==t?(e-s)/(t-s):0}function ye(s,t,e){return(1-e)*s+e*t}function lr(s,t,e,n){return ye(s,t,1-Math.exp(-e*n))}function hr(s,t=1){return t-Math.abs(mi(s,t*2)-t)}function ur(s,t,e){return s<=t?0:s>=e?1:(s=(s-t)/(e-t),s*s*(3-2*s))}function dr(s,t,e){return s<=t?0:s>=e?1:(s=(s-t)/(e-t),s*s*s*(s*(s*6-15)+10))}function fr(s,t){return s+Math.floor(Math.random()*(t-s+1))}function pr(s,t){return s+Math.random()*(t-s)}function mr(s){return s*(.5-Math.random())}function gr(s){s!==void 0&&(Vi=s);let t=Vi+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function _r(s){return s*xe}function xr(s){return s*Me}function yr(s){return(s&s-1)===0&&s!==0}function vr(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function Mr(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function Sr(s,t,e,n,i){let r=Math.cos,o=Math.sin,a=r(e/2),c=o(e/2),l=r((t+n)/2),h=o((t+n)/2),d=r((t-n)/2),u=o((t-n)/2),p=r((n-t)/2),g=o((n-t)/2);switch(i){case"XYX":s.set(a*h,c*d,c*u,a*l);break;case"YZY":s.set(c*u,a*h,c*d,a*l);break;case"ZXZ":s.set(c*d,c*u,a*h,a*l);break;case"XZX":s.set(a*h,c*g,c*p,a*l);break;case"YXY":s.set(c*p,a*h,c*g,a*l);break;case"ZYZ":s.set(c*g,c*p,a*h,a*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function br(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function wr(s,t){switch(t.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}var gi={DEG2RAD:xe,RAD2DEG:Me,generateUUID:dn,clamp:N,euclideanModulo:mi,mapLinear:ar,inverseLerp:cr,lerp:ye,damp:lr,pingpong:hr,smoothstep:ur,smootherstep:dr,randInt:fr,randFloat:pr,randFloatSpread:mr,seededRandom:gr,degToRad:_r,radToDeg:xr,isPowerOfTwo:yr,ceilPowerOfTwo:vr,floorPowerOfTwo:Mr,setQuaternionFromProperEuler:Sr,normalize:wr,denormalize:br},B=class s{constructor(t=0,e=0){s.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){let e=this.x,n=this.y,i=t.elements;return this.x=i[0]*e+i[3]*n+i[6],this.y=i[1]*e+i[4]*n+i[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=N(this.x,t.x,e.x),this.y=N(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=N(this.x,t,e),this.y=N(this.y,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(N(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(N(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){let n=Math.cos(e),i=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*n-o*i+t.x,this.y=r*i+o*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},ft=class{constructor(t=0,e=0,n=0,i=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=i}static slerpFlat(t,e,n,i,r,o,a){let c=n[i+0],l=n[i+1],h=n[i+2],d=n[i+3],u=r[o+0],p=r[o+1],g=r[o+2],_=r[o+3];if(a===0){t[e+0]=c,t[e+1]=l,t[e+2]=h,t[e+3]=d;return}if(a===1){t[e+0]=u,t[e+1]=p,t[e+2]=g,t[e+3]=_;return}if(d!==_||c!==u||l!==p||h!==g){let x=1-a,y=c*u+l*p+h*g+d*_,S=y>=0?1:-1,w=1-y*y;if(w>Number.EPSILON){let b=Math.sqrt(w),L=Math.atan2(b,y*S);x=Math.sin(x*L)/b,a=Math.sin(a*L)/b}let E=a*S;if(c=c*x+u*E,l=l*x+p*E,h=h*x+g*E,d=d*x+_*E,x===1-a){let b=1/Math.sqrt(c*c+l*l+h*h+d*d);c*=b,l*=b,h*=b,d*=b}}t[e]=c,t[e+1]=l,t[e+2]=h,t[e+3]=d}static multiplyQuaternionsFlat(t,e,n,i,r,o){let a=n[i],c=n[i+1],l=n[i+2],h=n[i+3],d=r[o],u=r[o+1],p=r[o+2],g=r[o+3];return t[e]=a*g+h*d+c*p-l*u,t[e+1]=c*g+h*u+l*d-a*p,t[e+2]=l*g+h*p+a*u-c*d,t[e+3]=h*g-a*d-c*u-l*p,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,i){return this._x=t,this._y=e,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){let n=t._x,i=t._y,r=t._z,o=t._order,a=Math.cos,c=Math.sin,l=a(n/2),h=a(i/2),d=a(r/2),u=c(n/2),p=c(i/2),g=c(r/2);switch(o){case"XYZ":this._x=u*h*d+l*p*g,this._y=l*p*d-u*h*g,this._z=l*h*g+u*p*d,this._w=l*h*d-u*p*g;break;case"YXZ":this._x=u*h*d+l*p*g,this._y=l*p*d-u*h*g,this._z=l*h*g-u*p*d,this._w=l*h*d+u*p*g;break;case"ZXY":this._x=u*h*d-l*p*g,this._y=l*p*d+u*h*g,this._z=l*h*g+u*p*d,this._w=l*h*d-u*p*g;break;case"ZYX":this._x=u*h*d-l*p*g,this._y=l*p*d+u*h*g,this._z=l*h*g-u*p*d,this._w=l*h*d+u*p*g;break;case"YZX":this._x=u*h*d+l*p*g,this._y=l*p*d+u*h*g,this._z=l*h*g-u*p*d,this._w=l*h*d-u*p*g;break;case"XZY":this._x=u*h*d-l*p*g,this._y=l*p*d-u*h*g,this._z=l*h*g+u*p*d,this._w=l*h*d+u*p*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){let n=e/2,i=Math.sin(n);return this._x=t.x*i,this._y=t.y*i,this._z=t.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){let e=t.elements,n=e[0],i=e[4],r=e[8],o=e[1],a=e[5],c=e[9],l=e[2],h=e[6],d=e[10],u=n+a+d;if(u>0){let p=.5/Math.sqrt(u+1);this._w=.25/p,this._x=(h-c)*p,this._y=(r-l)*p,this._z=(o-i)*p}else if(n>a&&n>d){let p=2*Math.sqrt(1+n-a-d);this._w=(h-c)/p,this._x=.25*p,this._y=(i+o)/p,this._z=(r+l)/p}else if(a>d){let p=2*Math.sqrt(1+a-n-d);this._w=(r-l)/p,this._x=(i+o)/p,this._y=.25*p,this._z=(c+h)/p}else{let p=2*Math.sqrt(1+d-n-a);this._w=(o-i)/p,this._x=(r+l)/p,this._y=(c+h)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(N(this.dot(t),-1,1)))}rotateTowards(t,e){let n=this.angleTo(t);if(n===0)return this;let i=Math.min(1,e/n);return this.slerp(t,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){let n=t._x,i=t._y,r=t._z,o=t._w,a=e._x,c=e._y,l=e._z,h=e._w;return this._x=n*h+o*a+i*l-r*c,this._y=i*h+o*c+r*a-n*l,this._z=r*h+o*l+n*c-i*a,this._w=o*h-n*a-i*c-r*l,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);let n=this._x,i=this._y,r=this._z,o=this._w,a=o*t._w+n*t._x+i*t._y+r*t._z;if(a<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,a=-a):this.copy(t),a>=1)return this._w=o,this._x=n,this._y=i,this._z=r,this;let c=1-a*a;if(c<=Number.EPSILON){let p=1-e;return this._w=p*o+e*this._w,this._x=p*n+e*this._x,this._y=p*i+e*this._y,this._z=p*r+e*this._z,this.normalize(),this}let l=Math.sqrt(c),h=Math.atan2(l,a),d=Math.sin((1-e)*h)/l,u=Math.sin(e*h)/l;return this._w=o*d+this._w*u,this._x=n*d+this._x*u,this._y=i*d+this._y*u,this._z=r*d+this._z*u,this._onChangeCallback(),this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){let t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(i*Math.sin(t),i*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},v=class s{constructor(t=0,e=0,n=0){s.prototype.isVector3=!0,this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Hi.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Hi.setFromAxisAngle(t,e))}applyMatrix3(t){let e=this.x,n=this.y,i=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*i,this.y=r[1]*e+r[4]*n+r[7]*i,this.z=r[2]*e+r[5]*n+r[8]*i,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){let e=this.x,n=this.y,i=this.z,r=t.elements,o=1/(r[3]*e+r[7]*n+r[11]*i+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*i+r[12])*o,this.y=(r[1]*e+r[5]*n+r[9]*i+r[13])*o,this.z=(r[2]*e+r[6]*n+r[10]*i+r[14])*o,this}applyQuaternion(t){let e=this.x,n=this.y,i=this.z,r=t.x,o=t.y,a=t.z,c=t.w,l=2*(o*i-a*n),h=2*(a*e-r*i),d=2*(r*n-o*e);return this.x=e+c*l+o*d-a*h,this.y=n+c*h+a*l-r*d,this.z=i+c*d+r*h-o*l,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){let e=this.x,n=this.y,i=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*i,this.y=r[1]*e+r[5]*n+r[9]*i,this.z=r[2]*e+r[6]*n+r[10]*i,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=N(this.x,t.x,e.x),this.y=N(this.y,t.y,e.y),this.z=N(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=N(this.x,t,e),this.y=N(this.y,t,e),this.z=N(this.z,t,e),this}clampLength(t,e){let n=this.length();return this.divideScalar(n||1).multiplyScalar(N(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){let n=t.x,i=t.y,r=t.z,o=e.x,a=e.y,c=e.z;return this.x=i*c-r*a,this.y=r*o-n*c,this.z=n*a-i*o,this}projectOnVector(t){let e=t.lengthSq();if(e===0)return this.set(0,0,0);let n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Bn.copy(this).projectOnVector(t),this.sub(Bn)}reflect(t){return this.sub(Bn.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){let e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;let n=this.dot(t)/e;return Math.acos(N(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){let e=this.x-t.x,n=this.y-t.y,i=this.z-t.z;return e*e+n*n+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){let i=Math.sin(e)*t;return this.x=i*Math.sin(n),this.y=Math.cos(e)*t,this.z=i*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){let e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){let e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),i=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=i,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Bn=new v,Hi=new ft,P=class s{constructor(t,e,n,i,r,o,a,c,l){s.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,i,r,o,a,c,l)}set(t,e,n,i,r,o,a,c,l){let h=this.elements;return h[0]=t,h[1]=i,h[2]=a,h[3]=e,h[4]=r,h[5]=c,h[6]=n,h[7]=o,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){let e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,i=e.elements,r=this.elements,o=n[0],a=n[3],c=n[6],l=n[1],h=n[4],d=n[7],u=n[2],p=n[5],g=n[8],_=i[0],x=i[3],y=i[6],S=i[1],w=i[4],E=i[7],b=i[2],L=i[5],R=i[8];return r[0]=o*_+a*S+c*b,r[3]=o*x+a*w+c*L,r[6]=o*y+a*E+c*R,r[1]=l*_+h*S+d*b,r[4]=l*x+h*w+d*L,r[7]=l*y+h*E+d*R,r[2]=u*_+p*S+g*b,r[5]=u*x+p*w+g*L,r[8]=u*y+p*E+g*R,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[1],i=t[2],r=t[3],o=t[4],a=t[5],c=t[6],l=t[7],h=t[8];return e*o*h-e*a*l-n*r*h+n*a*c+i*r*l-i*o*c}invert(){let t=this.elements,e=t[0],n=t[1],i=t[2],r=t[3],o=t[4],a=t[5],c=t[6],l=t[7],h=t[8],d=h*o-a*l,u=a*c-h*r,p=l*r-o*c,g=e*d+n*u+i*p;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);let _=1/g;return t[0]=d*_,t[1]=(i*l-h*n)*_,t[2]=(a*n-i*o)*_,t[3]=u*_,t[4]=(h*e-i*c)*_,t[5]=(i*r-a*e)*_,t[6]=p*_,t[7]=(n*c-l*e)*_,t[8]=(o*e-n*r)*_,this}transpose(){let t,e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){let e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,i,r,o,a){let c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*o+l*a)+o+t,-i*l,i*c,-i*(-l*o+c*a)+a+e,0,0,1),this}scale(t,e){return this.premultiply(zn.makeScale(t,e)),this}rotate(t){return this.premultiply(zn.makeRotation(-t)),this}translate(t,e){return this.premultiply(zn.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){let e=this.elements,n=t.elements;for(let i=0;i<9;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}},zn=new P;function ei(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}var Gi={};function ni(s){s in Gi||(Gi[s]=!0,console.warn(s))}var Wi=new P().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Xi=new P().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Er(){let s={enabled:!0,workingColorSpace:Qn,spaces:{},convert:function(i,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===$e&&(i.r=Pt(i.r),i.g=Pt(i.g),i.b=Pt(i.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(i.applyMatrix3(this.spaces[r].toXYZ),i.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===$e&&(i.r=ie(i.r),i.g=ie(i.g),i.b=ie(i.b))),i},workingToColorSpace:function(i,r){return this.convert(i,this.workingColorSpace,r)},colorSpaceToWorking:function(i,r){return this.convert(i,r,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===pi?ti:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,r=this.workingColorSpace){return i.fromArray(this.spaces[r].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,r,o){return i.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(i,r){return ni("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),s.workingToColorSpace(i,r)},toWorkingColorSpace:function(i,r){return ni("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),s.colorSpaceToWorking(i,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return s.define({[Qn]:{primaries:t,whitePoint:n,transfer:ti,toXYZ:Wi,fromXYZ:Xi,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:dt},outputColorSpaceConfig:{drawingBufferColorSpace:dt}},[dt]:{primaries:t,whitePoint:n,transfer:$e,toXYZ:Wi,fromXYZ:Xi,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:dt}}}),s}var ut=Er();function Pt(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function ie(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}var $t,tn=class{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{$t===void 0&&($t=ei("canvas")),$t.width=t.width,$t.height=t.height;let i=$t.getContext("2d");t instanceof ImageData?i.putImageData(t,0,0):i.drawImage(t,0,0,t.width,t.height),n=$t}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){let e=ei("canvas");e.width=t.width,e.height=t.height;let n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);let i=n.getImageData(0,0,t.width,t.height),r=i.data;for(let o=0;o<r.length;o++)r[o]=Pt(r[o]/255)*255;return n.putImageData(i,0,0),e}else if(t.data){let e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Pt(e[n]/255)*255):e[n]=Pt(e[n]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}},Tr=0,en=class{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Tr++}),this.uuid=dn(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){let e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):e instanceof VideoFrame?t.set(e.displayHeight,e.displayWidth,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];let n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let r;if(Array.isArray(i)){r=[];for(let o=0,a=i.length;o<a;o++)i[o].isDataTexture?r.push(kn(i[o].image)):r.push(kn(i[o]))}else r=kn(i);n.url=r}return e||(t.images[this.uuid]=n),n}};function kn(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?tn.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}var Ar=0,Vn=new v,oe=class s extends re{constructor(t=s.DEFAULT_IMAGE,e=s.DEFAULT_MAPPING,n=_e,i=_e,r=is,o=ss,a=os,c=rs,l=s.DEFAULT_ANISOTROPY,h=pi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Ar++}),this.uuid=dn(),this.name="",this.source=new en(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=r,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new B(0,0),this.repeat=new B(1,1),this.center=new B(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new P,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Vn).x}get height(){return this.source.getSize(Vn).y}get depth(){return this.source.getSize(Vn).z}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(let e in t){let n=t[e];if(n===void 0){console.warn(`THREE.Texture.setValues(): parameter '${e}' has value of undefined.`);continue}let i=this[e];if(i===void 0){console.warn(`THREE.Texture.setValues(): property '${e}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[e]=n}}toJSON(t){let e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==fi)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Zn:t.x=t.x-Math.floor(t.x);break;case _e:t.x=t.x<0?0:1;break;case Jn:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Zn:t.y=t.y-Math.floor(t.y);break;case _e:t.y=t.y<0?0:1;break;case Jn:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}};oe.DEFAULT_IMAGE=null;oe.DEFAULT_MAPPING=fi;oe.DEFAULT_ANISOTROPY=1;var Ct=new v,Hn=new v,Xe=new v,Ft=new v,Gn=new v,qe=new v,Wn=new v,ae=class{constructor(t=new v,e=new v(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,Ct)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);let n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){let e=Ct.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(Ct.copy(this.origin).addScaledVector(this.direction,e),Ct.distanceToSquared(t))}distanceSqToSegment(t,e,n,i){Hn.copy(t).add(e).multiplyScalar(.5),Xe.copy(e).sub(t).normalize(),Ft.copy(this.origin).sub(Hn);let r=t.distanceTo(e)*.5,o=-this.direction.dot(Xe),a=Ft.dot(this.direction),c=-Ft.dot(Xe),l=Ft.lengthSq(),h=Math.abs(1-o*o),d,u,p,g;if(h>0)if(d=o*c-a,u=o*a-c,g=r*h,d>=0)if(u>=-g)if(u<=g){let _=1/h;d*=_,u*=_,p=d*(d+o*u+2*a)+u*(o*d+u+2*c)+l}else u=r,d=Math.max(0,-(o*u+a)),p=-d*d+u*(u+2*c)+l;else u=-r,d=Math.max(0,-(o*u+a)),p=-d*d+u*(u+2*c)+l;else u<=-g?(d=Math.max(0,-(-o*r+a)),u=d>0?-r:Math.min(Math.max(-r,-c),r),p=-d*d+u*(u+2*c)+l):u<=g?(d=0,u=Math.min(Math.max(-r,-c),r),p=u*(u+2*c)+l):(d=Math.max(0,-(o*r+a)),u=d>0?r:Math.min(Math.max(-r,-c),r),p=-d*d+u*(u+2*c)+l);else u=o>0?-r:r,d=Math.max(0,-(o*u+a)),p=-d*d+u*(u+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,d),i&&i.copy(Hn).addScaledVector(Xe,u),p}intersectSphere(t,e){Ct.subVectors(t.center,this.origin);let n=Ct.dot(this.direction),i=Ct.dot(Ct)-n*n,r=t.radius*t.radius;if(i>r)return null;let o=Math.sqrt(r-i),a=n-o,c=n+o;return c<0?null:a<0?this.at(c,e):this.at(a,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){let e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){let n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){let e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,i,r,o,a,c,l=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return l>=0?(n=(t.min.x-u.x)*l,i=(t.max.x-u.x)*l):(n=(t.max.x-u.x)*l,i=(t.min.x-u.x)*l),h>=0?(r=(t.min.y-u.y)*h,o=(t.max.y-u.y)*h):(r=(t.max.y-u.y)*h,o=(t.min.y-u.y)*h),n>o||r>i||((r>n||isNaN(n))&&(n=r),(o<i||isNaN(i))&&(i=o),d>=0?(a=(t.min.z-u.z)*d,c=(t.max.z-u.z)*d):(a=(t.max.z-u.z)*d,c=(t.min.z-u.z)*d),n>c||a>i)||((a>n||n!==n)&&(n=a),(c<i||i!==i)&&(i=c),i<0)?null:this.at(n>=0?n:i,e)}intersectsBox(t){return this.intersectBox(t,Ct)!==null}intersectTriangle(t,e,n,i,r){Gn.subVectors(e,t),qe.subVectors(n,t),Wn.crossVectors(Gn,qe);let o=this.direction.dot(Wn),a;if(o>0){if(i)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Ft.subVectors(this.origin,t);let c=a*this.direction.dot(qe.crossVectors(Ft,qe));if(c<0)return null;let l=a*this.direction.dot(Gn.cross(Ft));if(l<0||c+l>o)return null;let h=-a*Ft.dot(Wn);return h<0?null:this.at(h/o,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},$=class s{constructor(t,e,n,i,r,o,a,c,l,h,d,u,p,g,_,x){s.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,i,r,o,a,c,l,h,d,u,p,g,_,x)}set(t,e,n,i,r,o,a,c,l,h,d,u,p,g,_,x){let y=this.elements;return y[0]=t,y[4]=e,y[8]=n,y[12]=i,y[1]=r,y[5]=o,y[9]=a,y[13]=c,y[2]=l,y[6]=h,y[10]=d,y[14]=u,y[3]=p,y[7]=g,y[11]=_,y[15]=x,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new s().fromArray(this.elements)}copy(t){let e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){let e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){let e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){let e=this.elements,n=t.elements,i=1/Qt.setFromMatrixColumn(t,0).length(),r=1/Qt.setFromMatrixColumn(t,1).length(),o=1/Qt.setFromMatrixColumn(t,2).length();return e[0]=n[0]*i,e[1]=n[1]*i,e[2]=n[2]*i,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*o,e[9]=n[9]*o,e[10]=n[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){let e=this.elements,n=t.x,i=t.y,r=t.z,o=Math.cos(n),a=Math.sin(n),c=Math.cos(i),l=Math.sin(i),h=Math.cos(r),d=Math.sin(r);if(t.order==="XYZ"){let u=o*h,p=o*d,g=a*h,_=a*d;e[0]=c*h,e[4]=-c*d,e[8]=l,e[1]=p+g*l,e[5]=u-_*l,e[9]=-a*c,e[2]=_-u*l,e[6]=g+p*l,e[10]=o*c}else if(t.order==="YXZ"){let u=c*h,p=c*d,g=l*h,_=l*d;e[0]=u+_*a,e[4]=g*a-p,e[8]=o*l,e[1]=o*d,e[5]=o*h,e[9]=-a,e[2]=p*a-g,e[6]=_+u*a,e[10]=o*c}else if(t.order==="ZXY"){let u=c*h,p=c*d,g=l*h,_=l*d;e[0]=u-_*a,e[4]=-o*d,e[8]=g+p*a,e[1]=p+g*a,e[5]=o*h,e[9]=_-u*a,e[2]=-o*l,e[6]=a,e[10]=o*c}else if(t.order==="ZYX"){let u=o*h,p=o*d,g=a*h,_=a*d;e[0]=c*h,e[4]=g*l-p,e[8]=u*l+_,e[1]=c*d,e[5]=_*l+u,e[9]=p*l-g,e[2]=-l,e[6]=a*c,e[10]=o*c}else if(t.order==="YZX"){let u=o*c,p=o*l,g=a*c,_=a*l;e[0]=c*h,e[4]=_-u*d,e[8]=g*d+p,e[1]=d,e[5]=o*h,e[9]=-a*h,e[2]=-l*h,e[6]=p*d+g,e[10]=u-_*d}else if(t.order==="XZY"){let u=o*c,p=o*l,g=a*c,_=a*l;e[0]=c*h,e[4]=-d,e[8]=l*h,e[1]=u*d+_,e[5]=o*h,e[9]=p*d-g,e[2]=g*d-p,e[6]=a*h,e[10]=_*d+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Cr,t,Rr)}lookAt(t,e,n){let i=this.elements;return lt.subVectors(t,e),lt.lengthSq()===0&&(lt.z=1),lt.normalize(),Ot.crossVectors(n,lt),Ot.lengthSq()===0&&(Math.abs(n.z)===1?lt.x+=1e-4:lt.z+=1e-4,lt.normalize(),Ot.crossVectors(n,lt)),Ot.normalize(),Ye.crossVectors(lt,Ot),i[0]=Ot.x,i[4]=Ye.x,i[8]=lt.x,i[1]=Ot.y,i[5]=Ye.y,i[9]=lt.y,i[2]=Ot.z,i[6]=Ye.z,i[10]=lt.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){let n=t.elements,i=e.elements,r=this.elements,o=n[0],a=n[4],c=n[8],l=n[12],h=n[1],d=n[5],u=n[9],p=n[13],g=n[2],_=n[6],x=n[10],y=n[14],S=n[3],w=n[7],E=n[11],b=n[15],L=i[0],R=i[4],ct=i[8],J=i[12],bt=i[1],Wt=i[5],Nt=i[9],Fe=i[13],Oe=i[2],Be=i[6],ze=i[10],ke=i[14],Ve=i[3],He=i[7],Ge=i[11],We=i[15];return r[0]=o*L+a*bt+c*Oe+l*Ve,r[4]=o*R+a*Wt+c*Be+l*He,r[8]=o*ct+a*Nt+c*ze+l*Ge,r[12]=o*J+a*Fe+c*ke+l*We,r[1]=h*L+d*bt+u*Oe+p*Ve,r[5]=h*R+d*Wt+u*Be+p*He,r[9]=h*ct+d*Nt+u*ze+p*Ge,r[13]=h*J+d*Fe+u*ke+p*We,r[2]=g*L+_*bt+x*Oe+y*Ve,r[6]=g*R+_*Wt+x*Be+y*He,r[10]=g*ct+_*Nt+x*ze+y*Ge,r[14]=g*J+_*Fe+x*ke+y*We,r[3]=S*L+w*bt+E*Oe+b*Ve,r[7]=S*R+w*Wt+E*Be+b*He,r[11]=S*ct+w*Nt+E*ze+b*Ge,r[15]=S*J+w*Fe+E*ke+b*We,this}multiplyScalar(t){let e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){let t=this.elements,e=t[0],n=t[4],i=t[8],r=t[12],o=t[1],a=t[5],c=t[9],l=t[13],h=t[2],d=t[6],u=t[10],p=t[14],g=t[3],_=t[7],x=t[11],y=t[15];return g*(+r*c*d-i*l*d-r*a*u+n*l*u+i*a*p-n*c*p)+_*(+e*c*p-e*l*u+r*o*u-i*o*p+i*l*h-r*c*h)+x*(+e*l*d-e*a*p-r*o*d+n*o*p+r*a*h-n*l*h)+y*(-i*a*h-e*c*d+e*a*u+i*o*d-n*o*u+n*c*h)}transpose(){let t=this.elements,e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){let i=this.elements;return t.isVector3?(i[12]=t.x,i[13]=t.y,i[14]=t.z):(i[12]=t,i[13]=e,i[14]=n),this}invert(){let t=this.elements,e=t[0],n=t[1],i=t[2],r=t[3],o=t[4],a=t[5],c=t[6],l=t[7],h=t[8],d=t[9],u=t[10],p=t[11],g=t[12],_=t[13],x=t[14],y=t[15],S=d*x*l-_*u*l+_*c*p-a*x*p-d*c*y+a*u*y,w=g*u*l-h*x*l-g*c*p+o*x*p+h*c*y-o*u*y,E=h*_*l-g*d*l+g*a*p-o*_*p-h*a*y+o*d*y,b=g*d*c-h*_*c-g*a*u+o*_*u+h*a*x-o*d*x,L=e*S+n*w+i*E+r*b;if(L===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let R=1/L;return t[0]=S*R,t[1]=(_*u*r-d*x*r-_*i*p+n*x*p+d*i*y-n*u*y)*R,t[2]=(a*x*r-_*c*r+_*i*l-n*x*l-a*i*y+n*c*y)*R,t[3]=(d*c*r-a*u*r-d*i*l+n*u*l+a*i*p-n*c*p)*R,t[4]=w*R,t[5]=(h*x*r-g*u*r+g*i*p-e*x*p-h*i*y+e*u*y)*R,t[6]=(g*c*r-o*x*r-g*i*l+e*x*l+o*i*y-e*c*y)*R,t[7]=(o*u*r-h*c*r+h*i*l-e*u*l-o*i*p+e*c*p)*R,t[8]=E*R,t[9]=(g*d*r-h*_*r-g*n*p+e*_*p+h*n*y-e*d*y)*R,t[10]=(o*_*r-g*a*r+g*n*l-e*_*l-o*n*y+e*a*y)*R,t[11]=(h*a*r-o*d*r-h*n*l+e*d*l+o*n*p-e*a*p)*R,t[12]=b*R,t[13]=(h*_*i-g*d*i+g*n*u-e*_*u-h*n*x+e*d*x)*R,t[14]=(g*a*i-o*_*i-g*n*c+e*_*c+o*n*x-e*a*x)*R,t[15]=(o*d*i-h*a*i+h*n*c-e*d*c-o*n*u+e*a*u)*R,this}scale(t){let e=this.elements,n=t.x,i=t.y,r=t.z;return e[0]*=n,e[4]*=i,e[8]*=r,e[1]*=n,e[5]*=i,e[9]*=r,e[2]*=n,e[6]*=i,e[10]*=r,e[3]*=n,e[7]*=i,e[11]*=r,this}getMaxScaleOnAxis(){let t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],i=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,i))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){let e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){let e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){let n=Math.cos(e),i=Math.sin(e),r=1-n,o=t.x,a=t.y,c=t.z,l=r*o,h=r*a;return this.set(l*o+n,l*a-i*c,l*c+i*a,0,l*a+i*c,h*a+n,h*c-i*o,0,l*c-i*a,h*c+i*o,r*c*c+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,i,r,o){return this.set(1,n,r,0,t,1,o,0,e,i,1,0,0,0,0,1),this}compose(t,e,n){let i=this.elements,r=e._x,o=e._y,a=e._z,c=e._w,l=r+r,h=o+o,d=a+a,u=r*l,p=r*h,g=r*d,_=o*h,x=o*d,y=a*d,S=c*l,w=c*h,E=c*d,b=n.x,L=n.y,R=n.z;return i[0]=(1-(_+y))*b,i[1]=(p+E)*b,i[2]=(g-w)*b,i[3]=0,i[4]=(p-E)*L,i[5]=(1-(u+y))*L,i[6]=(x+S)*L,i[7]=0,i[8]=(g+w)*R,i[9]=(x-S)*R,i[10]=(1-(u+_))*R,i[11]=0,i[12]=t.x,i[13]=t.y,i[14]=t.z,i[15]=1,this}decompose(t,e,n){let i=this.elements,r=Qt.set(i[0],i[1],i[2]).length(),o=Qt.set(i[4],i[5],i[6]).length(),a=Qt.set(i[8],i[9],i[10]).length();this.determinant()<0&&(r=-r),t.x=i[12],t.y=i[13],t.z=i[14],xt.copy(this);let l=1/r,h=1/o,d=1/a;return xt.elements[0]*=l,xt.elements[1]*=l,xt.elements[2]*=l,xt.elements[4]*=h,xt.elements[5]*=h,xt.elements[6]*=h,xt.elements[8]*=d,xt.elements[9]*=d,xt.elements[10]*=d,e.setFromRotationMatrix(xt),n.x=r,n.y=o,n.z=a,this}makePerspective(t,e,n,i,r,o,a=ne,c=!1){let l=this.elements,h=2*r/(e-t),d=2*r/(n-i),u=(e+t)/(e-t),p=(n+i)/(n-i),g,_;if(c)g=r/(o-r),_=o*r/(o-r);else if(a===ne)g=-(o+r)/(o-r),_=-2*o*r/(o-r);else if(a===se)g=-o/(o-r),_=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=h,l[4]=0,l[8]=u,l[12]=0,l[1]=0,l[5]=d,l[9]=p,l[13]=0,l[2]=0,l[6]=0,l[10]=g,l[14]=_,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,n,i,r,o,a=ne,c=!1){let l=this.elements,h=2/(e-t),d=2/(n-i),u=-(e+t)/(e-t),p=-(n+i)/(n-i),g,_;if(c)g=1/(o-r),_=o/(o-r);else if(a===ne)g=-2/(o-r),_=-(o+r)/(o-r);else if(a===se)g=-1/(o-r),_=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=h,l[4]=0,l[8]=0,l[12]=u,l[1]=0,l[5]=d,l[9]=0,l[13]=p,l[2]=0,l[6]=0,l[10]=g,l[14]=_,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){let e=this.elements,n=t.elements;for(let i=0;i<16;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){let n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}},Qt=new v,xt=new $,Cr=new v(0,0,0),Rr=new v(1,1,1),Ot=new v,Ye=new v,lt=new v,qi=new $,Yi=new ft,Se=class s{constructor(t=0,e=0,n=0,i=s.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=i}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,i=this._order){return this._x=t,this._y=e,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){let i=t.elements,r=i[0],o=i[4],a=i[8],c=i[1],l=i[5],h=i[9],d=i[2],u=i[6],p=i[10];switch(e){case"XYZ":this._y=Math.asin(N(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,p),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(u,l),this._z=0);break;case"YXZ":this._x=Math.asin(-N(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,p),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(N(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,p),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-N(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,p),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin(N(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(a,p));break;case"XZY":this._z=Math.asin(-N(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(u,l),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,p),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return qi.makeRotationFromQuaternion(t),this.setFromRotationMatrix(qi,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Yi.setFromEuler(this),this.setFromQuaternion(Yi,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Se.DEFAULT_ORDER="XYZ";var be=class{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}},Pr=0,Zi=new v,te=new ft,Rt=new $,Ze=new v,ge=new v,Ir=new v,Lr=new ft,Ji=new v(1,0,0),ji=new v(0,1,0),Ki=new v(0,0,1),$i={type:"added"},Dr={type:"removed"},ee={type:"childadded",child:null},Xn={type:"childremoved",child:null},Xt=class s extends re{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Pr++}),this.uuid=dn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=s.DEFAULT_UP.clone();let t=new v,e=new Se,n=new ft,i=new v(1,1,1);function r(){n.setFromEuler(e,!1)}function o(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new $},normalMatrix:{value:new P}}),this.matrix=new $,this.matrixWorld=new $,this.matrixAutoUpdate=s.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=s.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new be,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return te.setFromAxisAngle(t,e),this.quaternion.multiply(te),this}rotateOnWorldAxis(t,e){return te.setFromAxisAngle(t,e),this.quaternion.premultiply(te),this}rotateX(t){return this.rotateOnAxis(Ji,t)}rotateY(t){return this.rotateOnAxis(ji,t)}rotateZ(t){return this.rotateOnAxis(Ki,t)}translateOnAxis(t,e){return Zi.copy(t).applyQuaternion(this.quaternion),this.position.add(Zi.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Ji,t)}translateY(t){return this.translateOnAxis(ji,t)}translateZ(t){return this.translateOnAxis(Ki,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(Rt.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?Ze.copy(t):Ze.set(t,e,n);let i=this.parent;this.updateWorldMatrix(!0,!1),ge.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Rt.lookAt(ge,Ze,this.up):Rt.lookAt(Ze,ge,this.up),this.quaternion.setFromRotationMatrix(Rt),i&&(Rt.extractRotation(i.matrixWorld),te.setFromRotationMatrix(Rt),this.quaternion.premultiply(te.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent($i),ee.child=t,this.dispatchEvent(ee),ee.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Dr),Xn.child=t,this.dispatchEvent(Xn),Xn.child=null),this}removeFromParent(){let t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),Rt.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),Rt.multiply(t.parent.matrixWorld)),t.applyMatrix4(Rt),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent($i),ee.child=t,this.dispatchEvent(ee),ee.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,i=this.children.length;n<i;n++){let o=this.children[n].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);let i=this.children;for(let r=0,o=i.length;r<o;r++)i[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ge,t,Ir),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ge,Lr,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);let e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);let e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);let e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverseVisible(t)}traverseAncestors(t){let e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);let e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e){let n=this.parent;if(t===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){let i=this.children;for(let r=0,o=i.length;r<o;r++)i[r].updateWorldMatrix(!1,!0)}}toJSON(t){let e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(a=>({...a})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(t),i.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function r(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(t)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=r(t.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let c=a.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){let d=c[l];r(t.shapes,d)}else r(t.shapes,c)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(r(t.materials,this.material[c]));i.material=a}else i.material=r(t.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){let c=this.animations[a];i.animations.push(r(t.animations,c))}}if(e){let a=o(t.geometries),c=o(t.materials),l=o(t.textures),h=o(t.images),d=o(t.shapes),u=o(t.skeletons),p=o(t.animations),g=o(t.nodes);a.length>0&&(n.geometries=a),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),p.length>0&&(n.animations=p),g.length>0&&(n.nodes=g)}return n.object=i,n;function o(a){let c=[];for(let l in a){let h=a[l];delete h.metadata,c.push(h)}return c}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){let i=t.children[n];this.add(i.clone())}return this}};Xt.DEFAULT_UP=new v(0,1,0);Xt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Xt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var as={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Bt={h:0,s:0,l:0},Je={h:0,s:0,l:0};function qn(s,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?s+(t-s)*6*e:e<1/2?t:e<2/3?s+(t-s)*6*(2/3-e):s}var Y=class{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){let i=t;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=dt){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,ut.colorSpaceToWorking(this,e),this}setRGB(t,e,n,i=ut.workingColorSpace){return this.r=t,this.g=e,this.b=n,ut.colorSpaceToWorking(this,i),this}setHSL(t,e,n,i=ut.workingColorSpace){if(t=mi(t,1),e=N(e,0,1),n=N(n,0,1),e===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+e):n+e-n*e,o=2*n-r;this.r=qn(o,r,t+1/3),this.g=qn(o,r,t),this.b=qn(o,r,t-1/3)}return ut.colorSpaceToWorking(this,i),this}setStyle(t,e=dt){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(t)){let r,o=i[1],a=i[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(t)){let r=i[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=dt){let n=as[t.toLowerCase()];return n!==void 0?this.setHex(n,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Pt(t.r),this.g=Pt(t.g),this.b=Pt(t.b),this}copyLinearToSRGB(t){return this.r=ie(t.r),this.g=ie(t.g),this.b=ie(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=dt){return ut.workingToColorSpace(K.copy(this),t),Math.round(N(K.r*255,0,255))*65536+Math.round(N(K.g*255,0,255))*256+Math.round(N(K.b*255,0,255))}getHexString(t=dt){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=ut.workingColorSpace){ut.workingToColorSpace(K.copy(this),e);let n=K.r,i=K.g,r=K.b,o=Math.max(n,i,r),a=Math.min(n,i,r),c,l,h=(a+o)/2;if(a===o)c=0,l=0;else{let d=o-a;switch(l=h<=.5?d/(o+a):d/(2-o-a),o){case n:c=(i-r)/d+(i<r?6:0);break;case i:c=(r-n)/d+2;break;case r:c=(n-i)/d+4;break}c/=6}return t.h=c,t.s=l,t.l=h,t}getRGB(t,e=ut.workingColorSpace){return ut.workingToColorSpace(K.copy(this),e),t.r=K.r,t.g=K.g,t.b=K.b,t}getStyle(t=dt){ut.workingToColorSpace(K.copy(this),t);let e=K.r,n=K.g,i=K.b;return t!==dt?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(t,e,n){return this.getHSL(Bt),this.setHSL(Bt.h+t,Bt.s+e,Bt.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Bt),t.getHSL(Je);let n=ye(Bt.h,Je.h,e),i=ye(Bt.s,Je.s,e),r=ye(Bt.l,Je.l,e);return this.setHSL(n,i,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){let e=this.r,n=this.g,i=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*i,this.g=r[1]*e+r[4]*n+r[7]*i,this.b=r[2]*e+r[5]*n+r[8]*i,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},K=new Y;Y.NAMES=as;function cs(s){let t={};for(let e in s){t[e]={};for(let n in s[e]){let i=s[e][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=i.clone():Array.isArray(i)?t[e][n]=i.slice():t[e][n]=i}}return t}function tt(s){let t={};for(let e=0;e<s.length;e++){let n=cs(s[e]);for(let i in n)t[i]=n[i]}return t}var we=class extends Xt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new $,this.projectionMatrix=new $,this.projectionMatrixInverse=new $,this.coordinateSystem=ne,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},zt=new v,Qi=new B,ts=new B,Ee=class extends we{constructor(t=50,e=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){let e=.5*this.getFilmHeight()/t;this.fov=Me*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){let t=Math.tan(xe*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return Me*2*Math.atan(Math.tan(xe*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){zt.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(zt.x,zt.y).multiplyScalar(-t/zt.z),zt.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(zt.x,zt.y).multiplyScalar(-t/zt.z)}getViewSize(t,e){return this.getViewBounds(t,Qi,ts),e.subVectors(ts,Qi)}setViewOffset(t,e,n,i,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=this.near,e=t*Math.tan(xe*.5*this.fov)/this.zoom,n=2*e,i=this.aspect*n,r=-.5*i,o=this.view;if(this.view!==null&&this.view.enabled){let c=o.fullWidth,l=o.fullHeight;r+=o.offsetX*i/c,e-=o.offsetY*n/l,i*=o.width/c,n*=o.height/l}let a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+i,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}};var Yn=new v,Ur=new v,Nr=new P,It=class{constructor(t=new v(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,i){return this.normal.set(t,e,n),this.constant=i,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){let i=Yn.subVectors(n,e).cross(Ur.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(i,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){let t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){let n=t.delta(Yn),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;let r=-(t.start.dot(this.normal)+this.constant)/i;return r<0||r>1?null:e.copy(t.start).addScaledVector(n,r)}intersectsLine(t){let e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){let n=e||Nr.getNormalMatrix(t),i=this.coplanarPoint(Yn).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}};function je(s,t){return!s||s.constructor===t?s:typeof t.BYTES_PER_ELEMENT=="number"?new t(s):Array.prototype.slice.call(s)}function Fr(s){return ArrayBuffer.isView(s)&&!(s instanceof DataView)}var qt=class{constructor(t,e,n,i){this.parameterPositions=t,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new e.constructor(n),this.sampleValues=e,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(t){let e=this.parameterPositions,n=this._cachedIndex,i=e[n],r=e[n-1];n:{t:{let o;e:{i:if(!(t<i)){for(let a=n+2;;){if(i===void 0){if(t<r)break i;return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=i,i=e[++n],t<i)break t}o=e.length;break e}if(!(t>=r)){let a=e[1];t<a&&(n=2,r=a);for(let c=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(i=r,r=e[--n-1],t>=r)break t}o=n,n=0;break e}break n}for(;n<o;){let a=n+o>>>1;t<e[a]?o=a:n=a+1}if(i=e[n],r=e[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===void 0)return n=e.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,i)}return this.interpolate_(n,r,t,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(t){let e=this.resultBuffer,n=this.sampleValues,i=this.valueSize,r=t*i;for(let o=0;o!==i;++o)e[o]=n[r+o];return e}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},nn=class extends qt{constructor(t,e,n,i){super(t,e,n,i),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:jn,endingEnd:jn}}intervalChanged_(t,e,n){let i=this.parameterPositions,r=t-2,o=t+1,a=i[r],c=i[o];if(a===void 0)switch(this.getSettings_().endingStart){case Kn:r=t,a=2*e-n;break;case $n:r=i.length-2,a=e+i[r]-i[r+1];break;default:r=t,a=n}if(c===void 0)switch(this.getSettings_().endingEnd){case Kn:o=t,c=2*n-e;break;case $n:o=1,c=n+i[1]-i[0];break;default:o=t-1,c=e}let l=(n-e)*.5,h=this.valueSize;this._weightPrev=l/(e-a),this._weightNext=l/(c-n),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(t,e,n,i){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=t*a,l=c-a,h=this._offsetPrev,d=this._offsetNext,u=this._weightPrev,p=this._weightNext,g=(n-e)/(i-e),_=g*g,x=_*g,y=-u*x+2*u*_-u*g,S=(1+u)*x+(-1.5-2*u)*_+(-.5+u)*g+1,w=(-1-p)*x+(1.5+p)*_+.5*g,E=p*x-p*_;for(let b=0;b!==a;++b)r[b]=y*o[h+b]+S*o[l+b]+w*o[c+b]+E*o[d+b];return r}},sn=class extends qt{constructor(t,e,n,i){super(t,e,n,i)}interpolate_(t,e,n,i){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=t*a,l=c-a,h=(n-e)/(i-e),d=1-h;for(let u=0;u!==a;++u)r[u]=o[l+u]*d+o[c+u]*h;return r}},rn=class extends qt{constructor(t,e,n,i){super(t,e,n,i)}interpolate_(t){return this.copySampleValue_(t-1)}},ht=class{constructor(t,e,n,i){if(t===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(e===void 0||e.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+t);this.name=t,this.times=je(e,this.TimeBufferType),this.values=je(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(t){let e=t.constructor,n;if(e.toJSON!==this.toJSON)n=e.toJSON(t);else{n={name:t.name,times:je(t.times,Array),values:je(t.values,Array)};let i=t.getInterpolation();i!==t.DefaultInterpolation&&(n.interpolation=i)}return n.type=t.ValueTypeName,n}InterpolantFactoryMethodDiscrete(t){return new rn(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodLinear(t){return new sn(this.times,this.values,this.getValueSize(),t)}InterpolantFactoryMethodSmooth(t){return new nn(this.times,this.values,this.getValueSize(),t)}setInterpolation(t){let e;switch(t){case ve:e=this.InterpolantFactoryMethodDiscrete;break;case Qe:e=this.InterpolantFactoryMethodLinear;break;case Ke:e=this.InterpolantFactoryMethodSmooth;break}if(e===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(t!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return console.warn("THREE.KeyframeTrack:",n),this}return this.createInterpolant=e,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return ve;case this.InterpolantFactoryMethodLinear:return Qe;case this.InterpolantFactoryMethodSmooth:return Ke}}getValueSize(){return this.values.length/this.times.length}shift(t){if(t!==0){let e=this.times;for(let n=0,i=e.length;n!==i;++n)e[n]+=t}return this}scale(t){if(t!==1){let e=this.times;for(let n=0,i=e.length;n!==i;++n)e[n]*=t}return this}trim(t,e){let n=this.times,i=n.length,r=0,o=i-1;for(;r!==i&&n[r]<t;)++r;for(;o!==-1&&n[o]>e;)--o;if(++o,r!==0||o!==i){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let t=!0,e=this.getValueSize();e-Math.floor(e)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),t=!1);let n=this.times,i=this.values,r=n.length;r===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),t=!1);let o=null;for(let a=0;a!==r;a++){let c=n[a];if(typeof c=="number"&&isNaN(c)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,a,c),t=!1;break}if(o!==null&&o>c){console.error("THREE.KeyframeTrack: Out of order keys.",this,a,c,o),t=!1;break}o=c}if(i!==void 0&&Fr(i))for(let a=0,c=i.length;a!==c;++a){let l=i[a];if(isNaN(l)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,a,l),t=!1;break}}return t}optimize(){let t=this.times.slice(),e=this.values.slice(),n=this.getValueSize(),i=this.getInterpolation()===Ke,r=t.length-1,o=1;for(let a=1;a<r;++a){let c=!1,l=t[a],h=t[a+1];if(l!==h&&(a!==1||l!==t[0]))if(i)c=!0;else{let d=a*n,u=d-n,p=d+n;for(let g=0;g!==n;++g){let _=e[d+g];if(_!==e[u+g]||_!==e[p+g]){c=!0;break}}}if(c){if(a!==o){t[o]=t[a];let d=a*n,u=o*n;for(let p=0;p!==n;++p)e[u+p]=e[d+p]}++o}}if(r>0){t[o]=t[r];for(let a=r*n,c=o*n,l=0;l!==n;++l)e[c+l]=e[a+l];++o}return o!==t.length?(this.times=t.slice(0,o),this.values=e.slice(0,o*n)):(this.times=t,this.values=e),this}clone(){let t=this.times.slice(),e=this.values.slice(),n=this.constructor,i=new n(this.name,t,e);return i.createInterpolant=this.createInterpolant,i}};ht.prototype.ValueTypeName="";ht.prototype.TimeBufferType=Float32Array;ht.prototype.ValueBufferType=Float32Array;ht.prototype.DefaultInterpolation=Qe;var kt=class extends ht{constructor(t,e,n){super(t,e,n)}};kt.prototype.ValueTypeName="bool";kt.prototype.ValueBufferType=Array;kt.prototype.DefaultInterpolation=ve;kt.prototype.InterpolantFactoryMethodLinear=void 0;kt.prototype.InterpolantFactoryMethodSmooth=void 0;var on=class extends ht{constructor(t,e,n,i){super(t,e,n,i)}};on.prototype.ValueTypeName="color";var an=class extends ht{constructor(t,e,n,i){super(t,e,n,i)}};an.prototype.ValueTypeName="number";var cn=class extends qt{constructor(t,e,n,i){super(t,e,n,i)}interpolate_(t,e,n,i){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=(n-e)/(i-e),l=t*a;for(let h=l+a;l!==h;l+=4)ft.slerpFlat(r,0,o,l-a,o,l,c);return r}},Te=class extends ht{constructor(t,e,n,i){super(t,e,n,i)}InterpolantFactoryMethodLinear(t){return new cn(this.times,this.values,this.getValueSize(),t)}};Te.prototype.ValueTypeName="quaternion";Te.prototype.InterpolantFactoryMethodSmooth=void 0;var Vt=class extends ht{constructor(t,e,n){super(t,e,n)}};Vt.prototype.ValueTypeName="string";Vt.prototype.ValueBufferType=Array;Vt.prototype.DefaultInterpolation=ve;Vt.prototype.InterpolantFactoryMethodLinear=void 0;Vt.prototype.InterpolantFactoryMethodSmooth=void 0;var ln=class extends ht{constructor(t,e,n,i){super(t,e,n,i)}};ln.prototype.ValueTypeName="vector";var hn=class{constructor(t,e,n){let i=this,r=!1,o=0,a=0,c,l=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this.abortController=new AbortController,this.itemStart=function(h){a++,r===!1&&i.onStart!==void 0&&i.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,i.onProgress!==void 0&&i.onProgress(h,o,a),o===a&&(r=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(h){i.onError!==void 0&&i.onError(h)},this.resolveURL=function(h){return c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,d){return l.push(h,d),this},this.removeHandler=function(h){let d=l.indexOf(h);return d!==-1&&l.splice(d,2),this},this.getHandler=function(h){for(let d=0,u=l.length;d<u;d+=2){let p=l[d],g=l[d+1];if(p.global&&(p.lastIndex=0),p.test(h))return g}return null},this.abort=function(){return this.abortController.abort(),this.abortController=new AbortController,this}}},ls=new hn,un=class{constructor(t){this.manager=t!==void 0?t:ls,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(t,e){let n=this;return new Promise(function(i,r){n.load(t,i,e,r)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}abort(){return this}};un.DEFAULT_MATERIAL_NAME="__DEFAULT";var Ae=class extends we{constructor(t=-1,e=1,n=1,i=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=i,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,i,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2,r=n-t,o=n+t,a=i+e,c=i-e;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,o=r+l*this.view.width,a-=h*this.view.offsetY,c=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){let e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}};var _i="\\[\\]\\.:\\/",Or=new RegExp("["+_i+"]","g"),xi="[^"+_i+"]",Br="[^"+_i.replace("\\.","")+"]",zr=/((?:WC+[\/:])*)/.source.replace("WC",xi),kr=/(WCOD+)?/.source.replace("WCOD",Br),Vr=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",xi),Hr=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",xi),Gr=new RegExp("^"+zr+kr+Vr+Hr+"$"),Wr=["material","materials","bones","map"],ii=class{constructor(t,e,n){let i=n||H.parseTrackName(e);this._targetGroup=t,this._bindings=t.subscribe_(e,i)}getValue(t,e){this.bind();let n=this._targetGroup.nCachedObjects_,i=this._bindings[n];i!==void 0&&i.getValue(t,e)}setValue(t,e){let n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,r=n.length;i!==r;++i)n[i].setValue(t,e)}bind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].bind()}unbind(){let t=this._bindings;for(let e=this._targetGroup.nCachedObjects_,n=t.length;e!==n;++e)t[e].unbind()}},H=class s{constructor(t,e,n){this.path=e,this.parsedPath=n||s.parseTrackName(e),this.node=s.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,e,n){return t&&t.isAnimationObjectGroup?new s.Composite(t,e,n):new s(t,e,n)}static sanitizeNodeName(t){return t.replace(/\s/g,"_").replace(Or,"")}static parseTrackName(t){let e=Gr.exec(t);if(e===null)throw new Error("PropertyBinding: Cannot parse trackName: "+t);let n={nodeName:e[2],objectName:e[3],objectIndex:e[4],propertyName:e[5],propertyIndex:e[6]},i=n.nodeName&&n.nodeName.lastIndexOf(".");if(i!==void 0&&i!==-1){let r=n.nodeName.substring(i+1);Wr.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,i),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+t);return n}static findNode(t,e){if(e===void 0||e===""||e==="."||e===-1||e===t.name||e===t.uuid)return t;if(t.skeleton){let n=t.skeleton.getBoneByName(e);if(n!==void 0)return n}if(t.children){let n=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===e||a.uuid===e)return a;let c=n(a.children);if(c)return c}return null},i=n(t.children);if(i)return i}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(t,e){t[e]=this.targetObject[this.propertyName]}_getValue_array(t,e){let n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)t[e++]=n[i]}_getValue_arrayElement(t,e){t[e]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(t,e){this.resolvedProperty.toArray(t,e)}_setValue_direct(t,e){this.targetObject[this.propertyName]=t[e]}_setValue_direct_setNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(t,e){this.targetObject[this.propertyName]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(t,e){let n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=t[e++]}_setValue_array_setNeedsUpdate(t,e){let n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=t[e++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(t,e){let n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=t[e++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(t,e){this.resolvedProperty[this.propertyIndex]=t[e]}_setValue_arrayElement_setNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty[this.propertyIndex]=t[e],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(t,e){this.resolvedProperty.fromArray(t,e)}_setValue_fromArray_setNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(t,e){this.resolvedProperty.fromArray(t,e),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(t,e){this.bind(),this.getValue(t,e)}_setValue_unbound(t,e){this.bind(),this.setValue(t,e)}bind(){let t=this.node,e=this.parsedPath,n=e.objectName,i=e.propertyName,r=e.propertyIndex;if(t||(t=s.findNode(this.rootNode,e.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=e.objectIndex;switch(n){case"materials":if(!t.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}t=t.material.materials;break;case"bones":if(!t.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}t=t.skeleton.bones;for(let h=0;h<t.length;h++)if(t[h].name===l){l=h;break}break;case"map":if("map"in t){t=t.map;break}if(!t.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!t.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}t=t.material.map;break;default:if(t[n]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}t=t[n]}if(l!==void 0){if(t[l]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,t);return}t=t[l]}}let o=t[i];if(o===void 0){let l=e.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+l+"."+i+" but it wasn't found.",t);return}let a=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?a=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(r!==void 0){if(i==="morphTargetInfluences"){if(!t.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!t.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}t.morphTargetDictionary[r]!==void 0&&(r=t.morphTargetDictionary[r])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};H.Composite=ii;H.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};H.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};H.prototype.GetterByBindingType=[H.prototype._getValue_direct,H.prototype._getValue_array,H.prototype._getValue_arrayElement,H.prototype._getValue_toArray];H.prototype.SetterByBindingTypeAndVersioning=[[H.prototype._setValue_direct,H.prototype._setValue_direct_setNeedsUpdate,H.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[H.prototype._setValue_array,H.prototype._setValue_array_setNeedsUpdate,H.prototype._setValue_array_setMatrixWorldNeedsUpdate],[H.prototype._setValue_arrayElement,H.prototype._setValue_arrayElement_setNeedsUpdate,H.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[H.prototype._setValue_fromArray,H.prototype._setValue_fromArray_setNeedsUpdate,H.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var $c=new Float32Array(1);var es=new $,Ce=class{constructor(t,e,n=0,i=1/0){this.ray=new ae(t,e),this.near=n,this.far=i,this.camera=null,this.layers=new be,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(t,e){this.ray.set(t,e)}setFromCamera(t,e){e.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(t.x,t.y,.5).unproject(e).sub(this.ray.origin).normalize(),this.camera=e):e.isOrthographicCamera?(this.ray.origin.set(t.x,t.y,(e.near+e.far)/(e.near-e.far)).unproject(e),this.ray.direction.set(0,0,-1).transformDirection(e.matrixWorld),this.camera=e):console.error("THREE.Raycaster: Unsupported camera type: "+e.type)}setFromXRController(t){return es.identity().extractRotation(t.matrixWorld),this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(es),this}intersectObject(t,e=!0,n=[]){return si(t,this,n,e),n.sort(ns),n}intersectObjects(t,e=!0,n=[]){for(let i=0,r=t.length;i<r;i++)si(t[i],this,n,e);return n.sort(ns),n}};function ns(s,t){return s.distance-t.distance}function si(s,t,e,n){let i=!0;if(s.layers.test(t.layers)&&s.raycast(t,e)===!1&&(i=!1),i===!0&&n===!0){let r=s.children;for(let o=0,a=r.length;o<a;o++)si(r[o],t,e,!0)}}var ce=class{constructor(t=1,e=0,n=0){this.radius=t,this.phi=e,this.theta=n}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=N(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,n),this.phi=Math.acos(N(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var Re=class extends re{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){if(t===void 0){console.warn("THREE.Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}};typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"180"}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="180");var Xr=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,qr=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Yr=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Zr=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Jr=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,jr=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Kr=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,$r=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Qr=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,to=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,eo=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,no=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,io=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,so=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,ro=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,oo=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,ao=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,co=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,lo=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,ho=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,uo=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,fo=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,po=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,mo=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,go=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,_o=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,xo=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,yo=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,vo=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Mo=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,So="gl_FragColor = linearToOutputTexel( gl_FragColor );",bo=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,wo=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Eo=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,To=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Ao=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Co=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Ro=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Po=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Io=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Lo=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Do=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Uo=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,No=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Fo=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Oo=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Bo=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,zo=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,ko=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Vo=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Ho=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Go=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Wo=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Xo=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,qo=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Yo=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Zo=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Jo=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,jo=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Ko=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,$o=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Qo=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,ta=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,ea=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,na=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,ia=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,sa=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,ra=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,oa=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,aa=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,ca=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,la=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,ha=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,ua=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,da=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,fa=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,pa=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,ma=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,ga=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,_a=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,xa=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,ya=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,va=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Ma=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Sa=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,ba=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,wa=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Ea=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Ta=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Aa=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,Ca=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Ra=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Pa=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Ia=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,La=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Da=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Ua=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Na=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Fa=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Oa=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Ba=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,za=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,ka=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Va=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Ha=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Ga=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Wa=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Xa=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,qa=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ya=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Za=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ja=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ja=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ka=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,$a=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Qa=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,tc=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,ec=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,nc=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ic=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sc=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,rc=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,oc=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ac=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,cc=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,lc=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,hc=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,uc=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,dc=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,fc=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,pc=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,mc=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,gc=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,_c=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,xc=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,yc=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,vc=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Mc=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Sc=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,bc=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,wc=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,I={alphahash_fragment:Xr,alphahash_pars_fragment:qr,alphamap_fragment:Yr,alphamap_pars_fragment:Zr,alphatest_fragment:Jr,alphatest_pars_fragment:jr,aomap_fragment:Kr,aomap_pars_fragment:$r,batching_pars_vertex:Qr,batching_vertex:to,begin_vertex:eo,beginnormal_vertex:no,bsdfs:io,iridescence_fragment:so,bumpmap_pars_fragment:ro,clipping_planes_fragment:oo,clipping_planes_pars_fragment:ao,clipping_planes_pars_vertex:co,clipping_planes_vertex:lo,color_fragment:ho,color_pars_fragment:uo,color_pars_vertex:fo,color_vertex:po,common:mo,cube_uv_reflection_fragment:go,defaultnormal_vertex:_o,displacementmap_pars_vertex:xo,displacementmap_vertex:yo,emissivemap_fragment:vo,emissivemap_pars_fragment:Mo,colorspace_fragment:So,colorspace_pars_fragment:bo,envmap_fragment:wo,envmap_common_pars_fragment:Eo,envmap_pars_fragment:To,envmap_pars_vertex:Ao,envmap_physical_pars_fragment:Bo,envmap_vertex:Co,fog_vertex:Ro,fog_pars_vertex:Po,fog_fragment:Io,fog_pars_fragment:Lo,gradientmap_pars_fragment:Do,lightmap_pars_fragment:Uo,lights_lambert_fragment:No,lights_lambert_pars_fragment:Fo,lights_pars_begin:Oo,lights_toon_fragment:zo,lights_toon_pars_fragment:ko,lights_phong_fragment:Vo,lights_phong_pars_fragment:Ho,lights_physical_fragment:Go,lights_physical_pars_fragment:Wo,lights_fragment_begin:Xo,lights_fragment_maps:qo,lights_fragment_end:Yo,logdepthbuf_fragment:Zo,logdepthbuf_pars_fragment:Jo,logdepthbuf_pars_vertex:jo,logdepthbuf_vertex:Ko,map_fragment:$o,map_pars_fragment:Qo,map_particle_fragment:ta,map_particle_pars_fragment:ea,metalnessmap_fragment:na,metalnessmap_pars_fragment:ia,morphinstance_vertex:sa,morphcolor_vertex:ra,morphnormal_vertex:oa,morphtarget_pars_vertex:aa,morphtarget_vertex:ca,normal_fragment_begin:la,normal_fragment_maps:ha,normal_pars_fragment:ua,normal_pars_vertex:da,normal_vertex:fa,normalmap_pars_fragment:pa,clearcoat_normal_fragment_begin:ma,clearcoat_normal_fragment_maps:ga,clearcoat_pars_fragment:_a,iridescence_pars_fragment:xa,opaque_fragment:ya,packing:va,premultiplied_alpha_fragment:Ma,project_vertex:Sa,dithering_fragment:ba,dithering_pars_fragment:wa,roughnessmap_fragment:Ea,roughnessmap_pars_fragment:Ta,shadowmap_pars_fragment:Aa,shadowmap_pars_vertex:Ca,shadowmap_vertex:Ra,shadowmask_pars_fragment:Pa,skinbase_vertex:Ia,skinning_pars_vertex:La,skinning_vertex:Da,skinnormal_vertex:Ua,specularmap_fragment:Na,specularmap_pars_fragment:Fa,tonemapping_fragment:Oa,tonemapping_pars_fragment:Ba,transmission_fragment:za,transmission_pars_fragment:ka,uv_pars_fragment:Va,uv_pars_vertex:Ha,uv_vertex:Ga,worldpos_vertex:Wa,background_vert:Xa,background_frag:qa,backgroundCube_vert:Ya,backgroundCube_frag:Za,cube_vert:Ja,cube_frag:ja,depth_vert:Ka,depth_frag:$a,distanceRGBA_vert:Qa,distanceRGBA_frag:tc,equirect_vert:ec,equirect_frag:nc,linedashed_vert:ic,linedashed_frag:sc,meshbasic_vert:rc,meshbasic_frag:oc,meshlambert_vert:ac,meshlambert_frag:cc,meshmatcap_vert:lc,meshmatcap_frag:hc,meshnormal_vert:uc,meshnormal_frag:dc,meshphong_vert:fc,meshphong_frag:pc,meshphysical_vert:mc,meshphysical_frag:gc,meshtoon_vert:_c,meshtoon_frag:xc,points_vert:yc,points_frag:vc,shadow_vert:Mc,shadow_frag:Sc,sprite_vert:bc,sprite_frag:wc},M={common:{diffuse:{value:new Y(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new P},alphaMap:{value:null},alphaMapTransform:{value:new P},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new P}},envmap:{envMap:{value:null},envMapRotation:{value:new P},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new P}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new P}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new P},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new P},normalScale:{value:new B(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new P},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new P}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new P}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new P}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Y(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Y(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new P},alphaTest:{value:0},uvTransform:{value:new P}},sprite:{diffuse:{value:new Y(16777215)},opacity:{value:1},center:{value:new B(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new P},alphaMap:{value:null},alphaMapTransform:{value:new P},alphaTest:{value:0}}},hs={basic:{uniforms:tt([M.common,M.specularmap,M.envmap,M.aomap,M.lightmap,M.fog]),vertexShader:I.meshbasic_vert,fragmentShader:I.meshbasic_frag},lambert:{uniforms:tt([M.common,M.specularmap,M.envmap,M.aomap,M.lightmap,M.emissivemap,M.bumpmap,M.normalmap,M.displacementmap,M.fog,M.lights,{emissive:{value:new Y(0)}}]),vertexShader:I.meshlambert_vert,fragmentShader:I.meshlambert_frag},phong:{uniforms:tt([M.common,M.specularmap,M.envmap,M.aomap,M.lightmap,M.emissivemap,M.bumpmap,M.normalmap,M.displacementmap,M.fog,M.lights,{emissive:{value:new Y(0)},specular:{value:new Y(1118481)},shininess:{value:30}}]),vertexShader:I.meshphong_vert,fragmentShader:I.meshphong_frag},standard:{uniforms:tt([M.common,M.envmap,M.aomap,M.lightmap,M.emissivemap,M.bumpmap,M.normalmap,M.displacementmap,M.roughnessmap,M.metalnessmap,M.fog,M.lights,{emissive:{value:new Y(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:I.meshphysical_vert,fragmentShader:I.meshphysical_frag},toon:{uniforms:tt([M.common,M.aomap,M.lightmap,M.emissivemap,M.bumpmap,M.normalmap,M.displacementmap,M.gradientmap,M.fog,M.lights,{emissive:{value:new Y(0)}}]),vertexShader:I.meshtoon_vert,fragmentShader:I.meshtoon_frag},matcap:{uniforms:tt([M.common,M.bumpmap,M.normalmap,M.displacementmap,M.fog,{matcap:{value:null}}]),vertexShader:I.meshmatcap_vert,fragmentShader:I.meshmatcap_frag},points:{uniforms:tt([M.points,M.fog]),vertexShader:I.points_vert,fragmentShader:I.points_frag},dashed:{uniforms:tt([M.common,M.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:I.linedashed_vert,fragmentShader:I.linedashed_frag},depth:{uniforms:tt([M.common,M.displacementmap]),vertexShader:I.depth_vert,fragmentShader:I.depth_frag},normal:{uniforms:tt([M.common,M.bumpmap,M.normalmap,M.displacementmap,{opacity:{value:1}}]),vertexShader:I.meshnormal_vert,fragmentShader:I.meshnormal_frag},sprite:{uniforms:tt([M.sprite,M.fog]),vertexShader:I.sprite_vert,fragmentShader:I.sprite_frag},background:{uniforms:{uvTransform:{value:new P},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:I.background_vert,fragmentShader:I.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new P}},vertexShader:I.backgroundCube_vert,fragmentShader:I.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:I.cube_vert,fragmentShader:I.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:I.equirect_vert,fragmentShader:I.equirect_frag},distanceRGBA:{uniforms:tt([M.common,M.displacementmap,{referencePosition:{value:new v},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:I.distanceRGBA_vert,fragmentShader:I.distanceRGBA_frag},shadow:{uniforms:tt([M.lights,M.fog,{color:{value:new Y(0)},opacity:{value:1}}]),vertexShader:I.shadow_vert,fragmentShader:I.shadow_frag}};hs.physical={uniforms:tt([hs.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new P},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new P},clearcoatNormalScale:{value:new B(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new P},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new P},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new P},sheen:{value:0},sheenColor:{value:new Y(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new P},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new P},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new P},transmissionSamplerSize:{value:new B},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new P},attenuationDistance:{value:0},attenuationColor:{value:new Y(0)},specularColor:{value:new Y(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new P},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new P},anisotropyVector:{value:new B},anisotropyMap:{value:null},anisotropyMapTransform:{value:new P}}]),vertexShader:I.meshphysical_vert,fragmentShader:I.meshphysical_frag};var Yt=(1+Math.sqrt(5))/2,le=1/Yt,Cm=[new v(-Yt,le,0),new v(Yt,le,0),new v(-le,0,Yt),new v(le,0,Yt),new v(0,Yt,-le),new v(0,Yt,le),new v(-1,1,-1),new v(1,1,-1),new v(-1,1,1),new v(1,1,1)];var Rm=new Float32Array(16),Pm=new Float32Array(9),Im=new Float32Array(4);var Lm={[ri]:oi,[ai]:ui,[li]:di,[ci]:hi,[oi]:ri,[ui]:ai,[di]:li,[hi]:ci};var us={type:"change"},vi={type:"start"},fs={type:"end"},fn=new ae,ds=new It,Ec=Math.cos(70*gi.DEG2RAD),q=new v,rt=2*Math.PI,F={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},yi=1e-6,pn=class extends Re{constructor(t,e=null){super(t,e),this.state=F.NONE,this.target=new v,this.cursor=new v,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:st.ROTATE,MIDDLE:st.DOLLY,RIGHT:st.PAN},this.touches={ONE:yt.ROTATE,TWO:yt.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new v,this._lastQuaternion=new ft,this._lastTargetPosition=new v,this._quat=new ft().setFromUnitVectors(t.up,new v(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new ce,this._sphericalDelta=new ce,this._scale=1,this._panOffset=new v,this._rotateStart=new B,this._rotateEnd=new B,this._rotateDelta=new B,this._panStart=new B,this._panEnd=new B,this._panDelta=new B,this._dollyStart=new B,this._dollyEnd=new B,this._dollyDelta=new B,this._dollyDirection=new v,this._mouse=new B,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=Ac.bind(this),this._onPointerDown=Tc.bind(this),this._onPointerUp=Cc.bind(this),this._onContextMenu=Nc.bind(this),this._onMouseWheel=Ic.bind(this),this._onKeyDown=Lc.bind(this),this._onTouchStart=Dc.bind(this),this._onTouchMove=Uc.bind(this),this._onMouseDown=Rc.bind(this),this._onMouseMove=Pc.bind(this),this._interceptControlDown=Fc.bind(this),this._interceptControlUp=Oc.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(us),this.update(),this.state=F.NONE}update(t=null){let e=this.object.position;q.copy(e).sub(this.target),q.applyQuaternion(this._quat),this._spherical.setFromVector3(q),this.autoRotate&&this.state===F.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,i=this.maxAzimuthAngle;isFinite(n)&&isFinite(i)&&(n<-Math.PI?n+=rt:n>Math.PI&&(n-=rt),i<-Math.PI?i+=rt:i>Math.PI&&(i-=rt),n<=i?this._spherical.theta=Math.max(n,Math.min(i,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+i)/2?Math.max(n,this._spherical.theta):Math.min(i,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=o!=this._spherical.radius}if(q.setFromSpherical(this._spherical),q.applyQuaternion(this._quatInverse),e.copy(this.target).add(q),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){let a=q.length();o=this._clampDistance(a*this._scale);let c=a-o;this.object.position.addScaledVector(this._dollyDirection,c),this.object.updateMatrixWorld(),r=!!c}else if(this.object.isOrthographicCamera){let a=new v(this._mouse.x,this._mouse.y,0);a.unproject(this.object);let c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=c!==this.object.zoom;let l=new v(this._mouse.x,this._mouse.y,0);l.unproject(this.object),this.object.position.sub(l).add(a),this.object.updateMatrixWorld(),o=q.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(fn.origin.copy(this.object.position),fn.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(fn.direction))<Ec?this.object.lookAt(this.target):(ds.setFromNormalAndCoplanarPoint(this.object.up,this.target),fn.intersectPlane(ds,this.target))))}else if(this.object.isOrthographicCamera){let o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>yi||8*(1-this._lastQuaternion.dot(this.object.quaternion))>yi||this._lastTargetPosition.distanceToSquared(this.target)>yi?(this.dispatchEvent(us),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?rt/60*this.autoRotateSpeed*t:rt/60/60*this.autoRotateSpeed}_getZoomScale(t){let e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){q.setFromMatrixColumn(e,0),q.multiplyScalar(-t),this._panOffset.add(q)}_panUp(t,e){this.screenSpacePanning===!0?q.setFromMatrixColumn(e,1):(q.setFromMatrixColumn(e,0),q.crossVectors(this.object.up,q)),q.multiplyScalar(t),this._panOffset.add(q)}_pan(t,e){let n=this.domElement;if(this.object.isPerspectiveCamera){let i=this.object.position;q.copy(i).sub(this.target);let r=q.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/n.clientHeight,this.object.matrix),this._panUp(2*e*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),i=t-n.left,r=e-n.top,o=n.width,a=n.height;this._mouse.x=i/o*2-1,this._mouse.y=-(r/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(rt*this._rotateDelta.x/e.clientHeight),this._rotateUp(rt*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(rt*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-rt*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(rt*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-rt*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),i=.5*(t.pageY+e.y);this._rotateStart.set(n,i)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),i=.5*(t.pageY+e.y);this._panStart.set(n,i)}}_handleTouchStartDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,i=t.pageY-e.y,r=Math.sqrt(n*n+i*i);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{let n=this._getSecondPointerPosition(t),i=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._rotateEnd.set(i,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let e=this.domElement;this._rotateLeft(rt*this._rotateDelta.x/e.clientHeight),this._rotateUp(rt*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{let e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),i=.5*(t.pageY+e.y);this._panEnd.set(n,i)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){let e=this._getSecondPointerPosition(t),n=t.pageX-e.x,i=t.pageY-e.y,r=Math.sqrt(n*n+i*i);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let o=(t.pageX+e.x)*.5,a=(t.pageY+e.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new B,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){let e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){let e=t.deltaMode,n={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function Tc(s){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(s.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(s)&&(this._addPointer(s),s.pointerType==="touch"?this._onTouchStart(s):this._onMouseDown(s)))}function Ac(s){this.enabled!==!1&&(s.pointerType==="touch"?this._onTouchMove(s):this._onMouseMove(s))}function Cc(s){switch(this._removePointer(s),this._pointers.length){case 0:this.domElement.releasePointerCapture(s.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(fs),this.state=F.NONE;break;case 1:let t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function Rc(s){let t;switch(s.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case st.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(s),this.state=F.DOLLY;break;case st.ROTATE:if(s.ctrlKey||s.metaKey||s.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(s),this.state=F.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(s),this.state=F.ROTATE}break;case st.PAN:if(s.ctrlKey||s.metaKey||s.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(s),this.state=F.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(s),this.state=F.PAN}break;default:this.state=F.NONE}this.state!==F.NONE&&this.dispatchEvent(vi)}function Pc(s){switch(this.state){case F.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(s);break;case F.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(s);break;case F.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(s);break}}function Ic(s){this.enabled===!1||this.enableZoom===!1||this.state!==F.NONE||(s.preventDefault(),this.dispatchEvent(vi),this._handleMouseWheel(this._customWheelEvent(s)),this.dispatchEvent(fs))}function Lc(s){this.enabled!==!1&&this._handleKeyDown(s)}function Dc(s){switch(this._trackPointer(s),this._pointers.length){case 1:switch(this.touches.ONE){case yt.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(s),this.state=F.TOUCH_ROTATE;break;case yt.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(s),this.state=F.TOUCH_PAN;break;default:this.state=F.NONE}break;case 2:switch(this.touches.TWO){case yt.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(s),this.state=F.TOUCH_DOLLY_PAN;break;case yt.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(s),this.state=F.TOUCH_DOLLY_ROTATE;break;default:this.state=F.NONE}break;default:this.state=F.NONE}this.state!==F.NONE&&this.dispatchEvent(vi)}function Uc(s){switch(this._trackPointer(s),this.state){case F.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(s),this.update();break;case F.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(s),this.update();break;case F.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(s),this.update();break;case F.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(s),this.update();break;default:this.state=F.NONE}}function Nc(s){this.enabled!==!1&&s.preventDefault()}function Fc(s){s.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function Oc(s){s.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var A=[52,56,44],T=.24,Ht={rings:7,segments:12,mossRings:4,mossSegments:8};function ms(s){let t=Ht.rings*Ht.segments+(s.type==="rock"?Ht.mossRings*Ht.mossSegments:0);return{floats:t*6*9,randomCalls:t*3}}var W=(s,t,e)=>Math.max(t,Math.min(e,s)),Mi=(s,t,e)=>{let n=W((e-s)/(t-s),0,1);return n*n*(3-2*n)};function gs(s=117){return()=>(s=Math.imul(s,1664525)+1013904223>>>0,s/4294967296)}function wt(s,t,e=0){let n=Mi(2.4,4.6,Math.abs(s))*(1.1+.3*Math.sin(t*1.6)),i=.075*Math.sin(s*3.8+t*2.3)+.045*Math.sin(s*7-t*4),r=.26+n;return t<-2.9?r+=9:t<-1.7?r+=5.9:t<-.6&&(r+=2.85),e===1&&t<-1.7&&t>=-2.9&&(r+=.7),e===2&&t<-.6&&t>=-1.7&&(r+=.7),t<-.6&&(r+=Mi(.55,1.5,Math.abs(s+.7))*.38,r-=.11*Mi(-3.7,-.6,t)),r+i}function _s(s,t=0){let e=gs(431+19*t),n=new Float32Array(s*20);for(let i=0;i<s;i++){let r,o,a;i<s*.5?(r=(e()-.5)*3.8,o=.1+e()*3.1,a=wt(r,o,t)+.19+e()*.23):i<s*.79?(o=-3.6+e()*3.2,r=-.7+(e()-.5)*.9,a=wt(r,o,t)+.14+e()*.32):(r=-.7+(e()-.5)*.8,o=-2.86+e()*3,a=.8+e()*8.7);let c=i*20;n[c]=r/T+A[0]/2,n[c+1]=a/T,n[c+2]=o/T+A[2]/2,n[c+3]=1,n[c+6]=.035,n[c+7]=0}return n}var ps=(s,t)=>s.map((e,n)=>e-t[n]),Bc=(s,t)=>[s[1]*t[2]-s[2]*t[1],s[2]*t[0]-s[0]*t[2],s[0]*t[1]-s[1]*t[0]],zc=s=>{let t=Math.hypot(...s)||1;return s.map(e=>e/t)};function Gt(s=0,t="summer",e=[],n=!1,i=null,r=811){let o=[],a=gs(r),c=t==="autumn";function l(u,p,g,_){let x=zc(Bc(ps(p,u),ps(g,u)));for(let y of[u,p,g])o.push(...y,...x,..._.map(S=>W(S,0,1)))}function h(u,p,g,_=6,x=10,y=.1,S=0){let w=[];for(let E=0;E<=_;E++){let b=[];for(let L=0;L<=x;L++){let R=E/_*Math.PI,ct=L/x*Math.PI*2,J=1+y*Math.sin(L*2.7+E*5.1);b.push([u[0]+Math.sin(R)*Math.cos(ct)*p[0]*J,u[1]+Math.cos(R)*p[1]*J,u[2]+Math.sin(R)*Math.sin(ct)*p[2]*J])}w.push(b)}if(S)for(let E of w)for(let b of E){let L=b[0]-u[0],R=b[2]-u[2];b[0]=u[0]+L*Math.cos(S)+R*Math.sin(S),b[2]=u[2]-L*Math.sin(S)+R*Math.cos(S)}for(let E=0;E<_;E++)for(let b=0;b<x;b++){let L=g.map(R=>R*(.92+a()*.15));l(w[E][b],w[E+1][b],w[E][b+1],L),l(w[E][b+1],w[E+1][b],w[E+1][b+1],L)}}function d(u,p,g,_,x=8){for(let y=0;y<x;y++){let S=y/x*Math.PI*2,w=(y+1)/x*Math.PI*2;l([u[0]+p*Math.cos(S),u[1],u[2]+p*Math.sin(S)],[u[0],u[1]+g,u[2]],[u[0]+p*Math.cos(w),u[1],u[2]+p*Math.sin(w)],_)}}if(!n){if(i)for(let g of i.mesh)o.push(g);else for(let g=0;g<96;g++)for(let _=0;_<96;_++){let x=-6.1+_/96*6.1*2,y=-4.6+g/96*9.2,S=6.1*2/96,w=(J,bt)=>[J,wt(J,bt,s),bt],E=wt(x,y,s),L=Math.abs(x+.7)<.75&&y<-.5?[.25,.29,.25]:E>1.4?[.29,.34,.29]:[.28,.37,.23],R=.86+a()*.28,ct=L.map(J=>J*R);l(w(x,y),w(x,y+9.2/96),w(x+S,y),ct),l(w(x+S,y),w(x,y+9.2/96),w(x+S,y+9.2/96),ct)}for(let g=0;g<125;g++){let _=(a()-.5)*10.6,x=-4.3+a()*8.3;if(Math.abs(_+.7)<.8&&x<-.5)continue;let y=i?i.height(_,x):wt(_,x,s),S=.15+a()*.55;i&&y<.08||(h([_,y-.07,x],[S,S*.65,S*.75],[.29+a()*.05,.34,.3],5,8,.12),g%2===0&&h([_,y+S*.35,x],[S*.86,.09,S*.65],[.28,.42,.21],3,8,.08))}for(let g of[-2.86,-1.66,-.56])for(let _=0;_<18;_++){let x=-5.5+_*.64;if(Math.abs(x+.7)<.8||i)continue;let y=wt(x,g-.08,s);h([x,y-.85,g-.14],[.43,1.1,.36],[.3,.34,.31],6,8,.13)}for(let g=0;g<110;g++){let _=(a()-.5)*11,x=-4.25+a()*8;if(Math.abs(_)<2.1&&x>-3.5)continue;let y=i?i.height(_,x):wt(_,x,s),S=1.8+a()*2.3;if(!(i&&y<.08))if(d([_,y,x],.1,S*.9,[.23,.2,.15],7),g%3!==0)for(let w=0;w<7;w++){let E=w/7;d([_,y+S*.15+E*S*.7,x],S*.22*(1-E*.79),S*.31,[.045+.009*w,.14+.015*w,.105+.008*w])}else{let w=c?g%2?[.67,.29,.1]:[.74,.48,.14]:[.24,.36,.13];h([_,y+S*.75,x],[S*.28,S*.34,S*.27],w,7,12,.09);for(let E=0;E<3;E++)h([_+(a()-.5)*S*.5,y+S*(.58+a()*.26),x+(a()-.5)*S*.48],[S*.16,S*.17,S*.15],w.map(b=>b*(.9+a()*.15)),5,9,.08)}}for(let g=0;g<230;g++){let _=(a()-.5)*10.5,x=-4.1+a()*8.1;if(Math.abs(_)<1.9&&x>-.7)continue;let y=i?i.height(_,x):wt(_,x,s);i&&y<.08||(d([_,y,x],.07,.18+a()*.25,[.36,.48,.24],4),g%9===0&&h([_,y+.24,x],[.065,.065,.065],c?[.96,.69,.27]:[.78,.71,.92],3,5,0))}}for(let u of e){let p=u.selected?[.61,.59,.32]:u.type==="rock"?[.34,.38,.34]:[.34,.45,.25];h(u.position,u.scale,p,Ht.rings,Ht.segments,u.type==="rock"?.09:0,u.rotation||0),u.type==="rock"&&h([u.position[0],u.position[1]+u.scale[1]*.7,u.position[2]],[u.scale[0]*.78,.1,u.scale[2]*.8],[.31,.45,.22],Ht.mossRings,Ht.mossSegments,.05,u.rotation||0)}return new Float32Array(o)}var Pe=(s,t,e)=>s+A[0]*(t+A[1]*e),xs=(s,t,e)=>[(s-A[0]/2)*T,t*T,(e-A[2]/2)*T];function pt(s,t){let e=[t[0]/T+A[0]/2,t[1]/T,t[2]/T+A[2]/2].map((o,a)=>W(o,0,A[a]-1.001)),n=e.map(Math.floor),i=e.map((o,a)=>o-n[a]),r=0;for(let o=0;o<2;o++)for(let a=0;a<2;a++)for(let c=0;c<2;c++)r+=s[Pe(n[0]+c,n[1]+a,n[2]+o)]*(c?i[0]:1-i[0])*(a?i[1]:1-i[1])*(o?i[2]:1-i[2]);return r}function kc(s,t){let e=T*.5,n=[0,1,2].map(r=>{let o=[...t],a=[...t];return o[r]+=e,a[r]-=e,pt(s,o)-pt(s,a)}),i=Math.hypot(...n);return i>1e-8?n.map(r=>r/i):[0,1,0]}function ys(s,t,e){for(let n=(A[1]-2)*T;n>=T*.25;n-=T)if(pt(s,[t,n,e])<0){let i=n,r=n+T;for(let o=0;o<6;o++){let a=(i+r)/2;pt(s,[t,a,e])<0?i=a:r=a}return(i+r)/2}return 0}function vs(s,t){return s.map((e,n)=>{let i=n===0?A[0]/2:n===2?A[2]/2:0;return[W(Math.floor((e-t)/T+i)-1,0,A[n]-1),W(Math.ceil((e+t)/T+i)+1,0,A[n]-1)]})}function Vc(s=0,t=[]){let e=new Float32Array(A[0]*A[1]*A[2]);for(let i=0;i<A[2];i++)for(let r=0;r<A[0];r++){let o=wt((r-A[0]/2)*T,(i-A[2]/2)*T,s)/T;for(let a=0;a<A[1];a++)e[Pe(r,a,i)]=a-o}let n=e.slice();return Ms(e,n,t)}function Ms(s,t,e){for(let n of e){let{center:i,radius:r,op:o}=n,a=vs(i,r+T),c=o==="smooth"?s.slice():null;for(let l=a[2][0];l<=a[2][1];l++)for(let h=a[1][0];h<=a[1][1];h++)for(let d=a[0][0];d<=a[0][1];d++){let u=xs(d,h,l),p=Math.hypot(...u.map((x,y)=>x-i[y])),g=(p-r)/T,_=Pe(d,h,l);if(o==="cut")s[_]=Math.max(s[_],-g);else if(o==="add")s[_]=Math.min(s[_],g);else if(o==="restore"&&p<=r)s[_]=t[_];else if(p<r&&["smooth","flatten"].includes(o)){let x=(1-p/r)**2*(n.strength??.65),y=(u[1]-n.level)/T;if(o==="smooth"){y=0;let S=0;for(let[w,E,b]of[[d-1,h,l],[d+1,h,l],[d,h-1,l],[d,h+1,l],[d,h,l-1],[d,h,l+1]])w>=0&&w<A[0]&&E>=0&&E<A[1]&&b>=0&&b<A[2]&&(y+=c[Pe(w,E,b)],S++);y/=Math.max(1,S)}s[_]=s[_]*(1-x)+y*x}}}return s}var mn=class{update(t,e){let n=e.map(r=>JSON.stringify(r)),i=this.preset===t&&this.keys&&this.keys.length<=n.length&&this.keys.every((r,o)=>r===n[o]);return i||(this.original=Vc(t),this.field=this.original.slice(),this.keys=[],this.preset=t),this.applied=e.length-this.keys.length,Ms(this.field,this.original,e.slice(this.keys.length)),(!i||this.applied)&&(this.revision=(this.revision||0)+1),this.keys=n,this.field}};function Hc(s,t){let e=s.slice();return Ss(e,t)}function Ss(s,t){for(let e of t){let n=vs(e.position,Math.max(...e.scale)*1.1+T),i=e.rotation||0,r=Math.cos(i),o=Math.sin(i),a=Math.min(...e.scale)/T;for(let c=n[2][0];c<=n[2][1];c++)for(let l=n[1][0];l<=n[1][1];l++)for(let h=n[0][0];h<=n[0][1];h++){let d=xs(h,l,c),u=d[0]-e.position[0],p=d[2]-e.position[2],g=(Math.hypot((u*r-p*o)/e.scale[0],(d[1]-e.position[1])/e.scale[1],(u*o+p*r)/e.scale[2])-1)*a,_=Pe(h,l,c);s[_]=Math.min(s[_],g)}}return s}var Ie=class{update(t,e,n=0,i=[]){let r=new Set(i||[]),o=e.filter((u,p)=>!r.has(p)),a=u=>[u.position,u.scale,u.rotation||0],c=JSON.stringify(o.map(a)),l=JSON.stringify(e.map(a)),h=this.terrain!==t||this.revision!==n||this.staticKey!==c,d=h||this.objectKey!==l;return h&&(this.baseline=Hc(t,o),this.field??=new Float32Array(t.length),this.staticBuilds=(this.staticBuilds||0)+1),d&&(this.field.set(this.baseline),Ss(this.field,e.filter((u,p)=>r.has(p)))),this.terrain=t,this.revision=n,this.staticKey=c,this.objectKey=l,{field:this.field,changed:d,staticRebuilt:h}}};function gn(s,t,e,n=70){let i=null;for(let r=0;r<n;r+=.055){let o=t.map((a,c)=>a+e[c]*r);if(Math.abs(o[0])>5.65||o[1]<.06||o[1]>(A[1]-2)*T||o[2]<-4.6||o[2]>4.3){i=null;continue}if(pt(s,o)<=0&&i){let a=i,c=r;for(let h=0;h<9;h++){let d=(a+c)/2,u=t.map((p,g)=>p+e[g]*d);pt(s,u)<=0?c=d:a=d}let l=t.map((h,d)=>h+e[d]*(a+c)/2);return{point:l,normal:kc(s,l)}}i=r}return null}var _n=class{update(t,e=null){let n=new Set(Array.isArray(e)?e:[e]),i=JSON.stringify(t.map(c=>[c.id,c.type])),r=t.map((c,l)=>JSON.stringify([c.position,c.scale,c.rotation||0,n.has(l)]));if(i!==this.layoutKey){let c=811,l=0;return this.entries=t.map(h=>{let{floats:d,randomCalls:u}=ms(h),p={seed:c,offset:l};l+=d;for(let g=0;g<u;g++)c=Math.imul(c,1664525)+1013904223>>>0;return p}),this.floatLength=l,this.layoutKey=i,this.keys=r,{rebuilt:!0,changed:!0,data:Gt(0,"summer",t.map((h,d)=>({...h,selected:n.has(d)})),!0),patches:[]}}let o=[];t.forEach((c,l)=>{if(r[l]!==this.keys[l]){let{offset:h,seed:d}=this.entries[l],u=Gt(0,"summer",[{...c,selected:n.has(l)}],!0,null,d),p=o.at(-1);p&&p.offset+p.length===h?(p.parts.push(u),p.length+=u.length):o.push({offset:h,length:u.length,parts:[u]})}});let a=o.map(({offset:c,length:l,parts:h})=>{if(h.length===1)return{offset:c,data:h[0]};let d=new Float32Array(l),u=0;for(let p of h)d.set(p,u),u+=p.length;return{offset:c,data:d}});return this.keys=r,{rebuilt:!1,changed:a.length>0,patches:a}}};var mt={enabled:!0,power:1,radius:.45,yaw:0,pitch:-17,speed:1.96};function Z(s){return[{...mt,...s.sourceConfig,position:s.source},...s.extraSources||[]]}function Lt(s,t,e){if(t===0){e.position&&(s.source=[...e.position]);let{position:n,...i}=e;s.sourceConfig={...mt,...s.sourceConfig,...i}}else Object.assign(s.extraSources[t-1],e)}function Si(s){let t=s.yaw*Math.PI/180,e=s.pitch*Math.PI/180;return[Math.sin(t)*Math.cos(e),Math.sin(e),Math.cos(t)*Math.cos(e)]}function Gc(s){let t=Z(s),e=t.reduce((r,o)=>r+(o.enabled?o.power:0),0),n=new Float32Array(Math.max(1,t.length)*8),i=0;return t.forEach((r,o)=>{i+=r.enabled?r.power:0;let a=Si(r).map(c=>c*r.speed/(120*T));n.set([r.position[0]/T+A[0]/2,r.position[1]/T,r.position[2]/T+A[2]/2,e?i/e:0,...a,r.radius/T],o*8)}),{data:n,count:t.length,total:e*s.flow}}var xn=class{update(t,e=!1){let n=JSON.stringify(Z(t));if(e||n!==this.key){let i=Gc({...t,flow:1});this.power=i.total,this.result={...i,changed:!0},this.key=n}else this.result.changed=!1;return this.result.total=this.power*t.flow,this.result}};function bs(s,t,e,n=null){if(n===null&&s.length>=8)throw new Error("\u6BCF\u4EF6\u4F5C\u54C1\u53EF\u6536\u85CF 8 \u4E2A\u955C\u5934\uFF0C\u53EF\u66F4\u65B0\u5DF2\u6709\u955C\u5934\u3002");if(n!==null&&(!Number.isInteger(n)||n<0||n>=s.length))throw new Error("\u8BF7\u5148\u9009\u62E9\u8981\u66F4\u65B0\u7684\u955C\u5934\u3002");let i=structuredClone(s),r={name:e.trim().slice(0,32)||"\u955C\u5934 "+(n===null?s.length+1:n+1),camera:structuredClone(t)};return n===null?(n=i.length,i.push(r)):i[n]=r,{views:i,index:n}}function ws(s,t){if(!Number.isInteger(t)||t<0||t>=s.length)throw new Error("\u8BF7\u5148\u9009\u62E9\u8981\u79FB\u9664\u7684\u955C\u5934\u3002");return structuredClone(s.filter((e,n)=>n!==t))}var he=[-.7,9.8,-3.35],vt={bytes:5e6,objects:2e3,sources:256,edits:16384},yn={preset:0,season:"summer",flow:1,gravity:9.8,viscosity:.025,exposure:1.05,mode:0,paused:!1,quality:"fine",sun:0,speed:1,source:he,sourceConfig:mt,extraSources:[],waterStyle:0,foam:.65,surfaceSmoothing:2,objects:[],edits:[],cameraViews:[]},As=(s,t,e)=>typeof s=="number"&&Number.isFinite(s)&&s>=t&&s<=e;function Et(s,t,e,n,i){if(s===void 0&&n!==void 0)return n;if(!As(s,t,e))throw new Error(i+"\u8D85\u51FA\u53EF\u8BFB\u53D6\u8303\u56F4\u3002");return s}function Zt(s,t,e){if(!Array.isArray(s)||s.length!==3||!s.every((n,i)=>As(n,...t[i])))throw new Error(e+"\u5FC5\u987B\u662F\u6709\u6548\u7684\u4E09\u7EF4\u5750\u6807\u3002");return[...s]}function Es(s={}){if(!s||typeof s!="object"||Array.isArray(s))throw new Error("\u6C34\u6E90\u8BBE\u7F6E\u65E0\u6548\u3002");if(s.enabled!==void 0&&typeof s.enabled!="boolean")throw new Error("\u6C34\u6E90\u5F00\u5173\u5FC5\u987B\u662F\u5E03\u5C14\u503C\u3002");return{enabled:s.enabled!==!1,...Object.fromEntries([["power",0,3],["radius",.15,1.2],["yaw",-180,180],["pitch",-90,75],["speed",0,6]].map(([t,e,n])=>[t,Et(s[t],e,n,mt[t],t)]))}}function Ts(s,t="\u76F8\u673A"){if(!s||typeof s!="object"||Array.isArray(s))throw new Error(t+"\u65E0\u6548\u3002");return{position:Zt(s.position,[[-55,55],[-55,55],[-55,55]],t),target:Zt(s.target,[[-15,15],[-5,20],[-15,15]],t+"\u76EE\u6807")}}function Le(s){if(typeof s!="string"||s.length>vt.bytes)throw new Error("\u4F5C\u54C1\u6587\u4EF6\u8FC7\u5927\u6216\u4E0D\u662F\u6587\u672C\u3002");let t;try{t=JSON.parse(s)}catch{throw new Error("\u4F5C\u54C1\u4E0D\u662F\u6709\u6548\u7684 JSON \u6587\u4EF6\u3002")}if(t?.format!=="waterfalls-lab"||t.version!==2||!t.scene||typeof t.scene!="object")throw new Error("\u8BF7\u5BFC\u5165 Waterfalls Lab v2 \u4F5C\u54C1\u6587\u4EF6\u3002");let e=t.scene,n={...yn};if(n.preset=Et(e.preset,0,2,0,"\u573A\u666F"),!Number.isInteger(n.preset))throw new Error("\u573A\u666F\u7F16\u53F7\u65E0\u6548\u3002");if(n.season=n.preset===1?"autumn":"summer",e.quality!==void 0&&!["light","fine","cinema","ultra"].includes(e.quality))throw new Error("\u753B\u8D28\u6863\u4F4D\u65E0\u6548\u3002");n.quality=e.quality||"fine";for(let[r,o,a]of[["flow",0,3],["gravity",2,20],["viscosity",0,.2],["exposure",.6,1.8],["sun",0,1],["speed",.2,2],["mode",0,2]])n[r]=Et(e[r],o,a,yn[r],r);if(n.paused=e.paused===!0,n.source=e.source?Zt(e.source,[[-5.5,5.5],[.2,12.8],[-4.8,4.8]],"\u6C34\u6E90"):[...he],n.sourceConfig=Es(e.sourceConfig),e.extraSources!==void 0&&(!Array.isArray(e.extraSources)||e.extraSources.length>=vt.sources))throw new Error("\u6C34\u6E90\u5217\u8868\u65E0\u6548\u6216\u8FC7\u5927\u3002");if(n.extraSources=(e.extraSources||[]).map(r=>{if(!r||typeof r!="object")throw new Error("\u6C34\u6E90\u6570\u636E\u65E0\u6548\u3002");return{...Es(r),position:Zt(r.position,[[-5.5,5.5],[.2,12.8],[-4.8,4.8]],"\u6C34\u6E90\u4F4D\u7F6E")}}),n.waterStyle=Et(e.waterStyle,0,2,0,"\u6C34\u9762\u5916\u89C2"),!Number.isInteger(n.waterStyle))throw new Error("\u6C34\u9762\u5916\u89C2\u65E0\u6548\u3002");if(n.foam=Et(e.foam,0,1,.65,"\u6CE1\u6CAB"),n.surfaceSmoothing=Et(e.surfaceSmoothing,1,3,1,"\u6C34\u9762\u67D4\u5316"),!Number.isInteger(n.surfaceSmoothing))throw new Error("\u6C34\u9762\u67D4\u5316\u6863\u4F4D\u65E0\u6548\u3002");if(!Array.isArray(e.objects)||e.objects.length>vt.objects)throw new Error("\u7269\u4F53\u5217\u8868\u65E0\u6548\u6216\u4F5C\u54C1\u8FC7\u5927\u3002");if(n.objects=e.objects.map((r,o)=>{if(!r||!["rock","mound"].includes(r.type))throw new Error("\u7269\u4F53\u7C7B\u578B\u65E0\u6548\u3002");return{id:"object-"+o,type:r.type,position:Zt(r.position,[[-5.6,5.6],[.05,12.8],[-4.9,4.9]],"\u7269\u4F53\u4F4D\u7F6E"),scale:Zt(r.scale,[[.12,3],[.12,3],[.12,3]],"\u7269\u4F53\u5927\u5C0F"),rotation:Et(r.rotation,-Math.PI*2,Math.PI*2,0,"\u65CB\u8F6C")}}),!Array.isArray(e.edits)||e.edits.length>vt.edits)throw new Error("\u5730\u5F62\u7F16\u8F91\u5217\u8868\u65E0\u6548\u6216\u4F5C\u54C1\u8FC7\u5927\u3002");if(n.edits=e.edits.map(r=>{if(!r||!["add","cut","restore","smooth","flatten"].includes(r.op))throw new Error("\u5730\u5F62\u64CD\u4F5C\u65E0\u6548\u3002");let o={op:r.op,center:Zt(r.center,[[-5.6,5.6],[.05,12.8],[-4.9,4.9]],"\u7B14\u5237\u4F4D\u7F6E"),radius:Et(r.radius,.25,2.4,void 0,"\u7B14\u5237\u534A\u5F84")};return["smooth","flatten"].includes(r.op)&&(o.strength=Et(r.strength,.1,1,.65,"\u7B14\u5237\u5F3A\u5EA6")),r.op==="flatten"&&(o.level=Et(r.level,.05,12.8,void 0,"\u524A\u5E73\u9AD8\u5EA6")),o}),e.cameraViews!==void 0&&(!Array.isArray(e.cameraViews)||e.cameraViews.length>8))throw new Error("\u955C\u5934\u6536\u85CF\u65E0\u6548\u6216\u8D85\u8FC7 8 \u4E2A\u3002");n.cameraViews=(e.cameraViews||[]).map((r,o)=>{if(!r||typeof r.name!="string")throw new Error("\u955C\u5934\u540D\u79F0\u65E0\u6548\u3002");return{name:r.name.trim().slice(0,32)||"\u955C\u5934 "+(o+1),camera:Ts(r.camera,"\u6536\u85CF\u955C\u5934")}});let i=null;return t.camera&&(i=Ts(t.camera)),{name:typeof t.name=="string"?t.name.slice(0,80):"\u6211\u7684\u5C71\u8C37",scene:n,camera:i}}function vn(s,t,e="\u6211\u7684\u5C71\u8C37"){return JSON.stringify({format:"waterfalls-lab",version:2,name:e,updated:new Date().toISOString(),scene:{...s,objects:s.objects.map(({id:n,...i})=>i),edits:s.edits.map(n=>({...n,center:[...n.center]}))},camera:t},null,2)}function Wc(s){return structuredClone({preset:s.preset,season:s.season,objects:s.objects,edits:s.edits,source:s.source,sourceConfig:s.sourceConfig,extraSources:s.extraSources})}function wi(s,t,e,n=!1){let i={scene:n?structuredClone(s):Wc(s),name:t,full:n};return n&&(i.camera=structuredClone(e)),i}function Cs(){return Array.from({length:12},()=>{let s=new ArrayBuffer(80);return{data:s,f:new Float32Array(s),u:new Uint32Array(s)}})}function Rs(s,t,e,n,i,r,o){let{f:a,u:c}=s;return c[0]=A[0],c[1]=A[1],c[2]=A[2],c[3]=e,a[4]=1/120,a[5]=T,a[6]=t.gravity,a[7]=t.viscosity,a[8]=t.source[0]/T+A[0]/2,a[9]=t.source[1]/T,a[10]=t.source[2]/T+A[2]/2,a[11]=o,c[12]=n,c[13]=i,c[14]=i===2?1:0,c[15]=r,a[16]=t.flow,a[17]=16384/e,a[18]=0,a[19]=0,s.data}var Ps=`
struct Params { grid:vec4u, config:vec4f, source:vec4f, step:vec4u, tool:vec4f };
struct Particle { p:vec4f, d:vec4f, c0:vec4f, c1:vec4f, c2:vec4f };
struct Cell { x:atomic<i32>, y:atomic<i32>, z:atomic<i32>, mass:atomic<i32>, volume:atomic<i32> };
struct Spring { position:vec4f, velocity:vec4f };
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var<storage,read_write> particles:array<Particle>;
@group(0) @binding(2) var<storage,read_write> grid:array<Cell>;
@group(0) @binding(3) var<storage,read_write> velocities:array<vec4f>;
@group(0) @binding(4) var<storage,read> solid:array<f32>;
@group(0) @binding(5) var<storage,read> springs:array<Spring>;
const SCALE:f32=1048576.0;
fn hash(n:u32)->f32 {var x=n;x=(x^61u)^(x>>16u);x=x*9u;x=x^(x>>4u);x=x*0x27d4eb2du;x=x^(x>>15u);return f32(x&65535u)/65535.0;}
fn addr(p:vec3i)->u32{return u32(p.x)+u.grid.x*(u32(p.y)+u.grid.y*u32(p.z));}
fn solidAt(p:vec3f)->f32{
  let q=clamp(p,vec3f(0),vec3f(u.grid.xyz)-1.001);let b=vec3i(floor(q));let t=fract(q);
  let a=mix(solid[addr(b)],solid[addr(b+vec3i(1,0,0))],t.x);
  let c=mix(solid[addr(b+vec3i(0,1,0))],solid[addr(b+vec3i(1,1,0))],t.x);
  let d=mix(solid[addr(b+vec3i(0,0,1))],solid[addr(b+vec3i(1,0,1))],t.x);
  let e=mix(solid[addr(b+vec3i(0,1,1))],solid[addr(b+vec3i(1,1,1))],t.x);
  return mix(mix(a,c,t.y),mix(d,e,t.y),t.z);
}
fn solidGradient(p:vec3f)->vec3f{return vec3f(solidAt(p+vec3f(.5,0,0))-solidAt(p-vec3f(.5,0,0)),solidAt(p+vec3f(0,.5,0))-solidAt(p-vec3f(0,.5,0)),solidAt(p+vec3f(0,0,.5))-solidAt(p-vec3f(0,0,.5)));}
fn solidNormal(p:vec3f)->vec3f{let g=solidGradient(p);return select(vec3f(0,1,0),g/max(length(g),.0001),length(g)>.0001);}
fn world(p:vec3f)->vec3f{return (p-vec3f(f32(u.grid.x)*.5,0,f32(u.grid.z)*.5))*u.config.y;}
fn local(p:vec3f)->vec3f{return p/u.config.y+vec3f(f32(u.grid.x)*.5,0,f32(u.grid.z)*.5);}
fn collideVelocity(p:vec3f,dd:vec3f)->vec3f{
  var d=dd;let predicted=p+d;
  if(solidAt(predicted)<.33){let n=solidNormal(predicted);d-=min(dot(d,n),0.0)*n;d*=.985;}
  if(predicted.x<2.0 || predicted.x>f32(u.grid.x)-3.0){d.x=0.0;}
  if(predicted.z<2.0){d.z=max(d.z,0.0);}
  return d;
}
@compute @workgroup_size(128) fn prepare(@builtin(global_invocation_id) id:vec3u){
  let i=id.x;if(i>=u.grid.w){return;}var p=particles[i];
  // Recycle particles at the open outflow, and gradually feed the river from its spring.
  let invalid=any(p.p.xyz!=p.p.xyz)||any(abs(p.p.xyz)>vec3f(500));
  let recycle=p.p.z>f32(u.grid.z)-3.0 || (p.p.y<.38 && solidAt(p.p.xyz)>.05) || invalid;
  let emit=hash(i*17u+u.step.x*7919u)<min(u.source.w*.0009,.025);
  if(recycle && u.source.w<.001){p.p=vec4f(1,1,1,-1);p.d=vec4f(0);particles[i]=p;return;}
  if(p.p.w<0.0 && !emit){return;}
  if(recycle || emit || p.p.w<0.0){
    let r=vec3f(hash(i*3u+u.step.x*47u),hash(i*7u+u.step.x*31u),hash(i*19u+u.step.x*17u));
    let choice=min(hash(i*977u+u.step.x*4967u),.999999);var sourceIndex=u.step.w-1u;
    for(var j=0u;j<u.step.w;j++){if(choice<springs[j].position.w){sourceIndex=j;break;}}
    let spring=springs[sourceIndex];let velocity=spring.velocity.xyz;
    let direction=select(vec3f(0,0,1),velocity/max(length(velocity),.00001),length(velocity)>.00001);
    let reference=select(vec3f(0,1,0),vec3f(1,0,0),abs(direction.y)>.9);
    let side=normalize(cross(direction,reference));let up=cross(side,direction);
    let angle=r.y*6.2831853;let radius=sqrt(r.x)*spring.velocity.w;
    let position=spring.position.xyz+radius*(cos(angle)*side+sin(angle)*up)+(r.z-.5)*direction*.6;
    p.p=vec4f(clamp(position,vec3f(2,1,2),vec3f(u.grid.xyz)-3.0),1.0);
    p.d=vec4f(velocity,0);p.c0=vec4f(0);p.c1=vec4f(0);p.c2=vec4f(0);
  }
  p.d=vec4f(clamp(p.d.xyz+vec3f(0,-u.config.z*u.config.x*u.config.x/u.config.y,0),vec3f(-.48),vec3f(.48)),max(0.0,p.d.w-.008));
  particles[i]=p;
}
@compute @workgroup_size(128) fn p2g(@builtin(global_invocation_id) id:vec3u){
  let i=id.x;if(i>=u.grid.w){return;}var p=particles[i];if(p.p.w<0.0){return;}
  let base=vec3i(floor(p.p.xyz-.5));let f=p.p.xyz-vec3f(base);
  let w=array<vec3f,3>(.5*(1.5-f)*(1.5-f),.75-(f-1.0)*(f-1.0),.5*(f-.5)*(f-.5));
  var C=mat3x3f(p.c0.xyz,p.c1.xyz,p.c2.xyz);
  // 1/3 is the 3D trace correction; EA's 2D formula uses 1/2.
  let tr=C[0].x+C[1].y+C[2].z;
  C-=u.config.w*.5*(C+transpose(C));
  let alpha=clamp((1.0/clamp(p.p.w,.3,2.5)-tr-1.0)/3.0,-.12,.12)*.72;
  C[0].x+=alpha;C[1].y+=alpha;C[2].z+=alpha;
  for(var z=0;z<3;z++){for(var y=0;y<3;y++){for(var x=0;x<3;x++){
    let q=base+vec3i(x,y,z);if(any(q<vec3i(1))||any(q>=vec3i(u.grid.xyz)-1)){continue;}
    let weight=w[x].x*w[y].y*w[z].z;let dpos=vec3f(vec3i(x,y,z))-f;
    let dd=weight*(p.d.xyz+C*dpos);let k=addr(q);
    atomicAdd(&grid[k].x,i32(dd.x*SCALE));atomicAdd(&grid[k].y,i32(dd.y*SCALE));atomicAdd(&grid[k].z,i32(dd.z*SCALE));
    atomicAdd(&grid[k].mass,i32(weight*SCALE));atomicAdd(&grid[k].volume,i32(weight*.125*u.tool.y*SCALE));
  }}}
}
@compute @workgroup_size(128) fn updateGrid(@builtin(global_invocation_id) id:vec3u){
  let k=id.x;let size=u.grid.x*u.grid.y*u.grid.z;if(k>=size){return;}
  let mass=f32(atomicLoad(&grid[k].mass))/SCALE;
  if(mass<.00001){velocities[k]=vec4f(0);return;}
  let d=vec3f(f32(atomicLoad(&grid[k].x)),f32(atomicLoad(&grid[k].y)),f32(atomicLoad(&grid[k].z)))/(SCALE*mass);
  let p=vec3f(f32(k%u.grid.x),f32(k/u.grid.x%u.grid.y),f32(k/(u.grid.x*u.grid.y)));
  velocities[k]=vec4f(collideVelocity(p,d),f32(atomicLoad(&grid[k].volume))/SCALE);
}
@compute @workgroup_size(128) fn g2p(@builtin(global_invocation_id) id:vec3u){
  let i=id.x;if(i>=u.grid.w){return;}var p=particles[i];if(p.p.w<0.0){return;}
  let base=vec3i(floor(p.p.xyz-.5));let f=p.p.xyz-vec3f(base);
  let w=array<vec3f,3>(.5*(1.5-f)*(1.5-f),.75-(f-1.0)*(f-1.0),.5*(f-.5)*(f-.5));
  var d=vec3f(0);var c0=vec3f(0);var c1=vec3f(0);var c2=vec3f(0);var volume=0.0;
  for(var z=0;z<3;z++){for(var y=0;y<3;y++){for(var x=0;x<3;x++){
    let q=base+vec3i(x,y,z);if(any(q<vec3i(1))||any(q>=vec3i(u.grid.xyz)-1)){continue;}
    let weight=w[x].x*w[y].y*w[z].z;let gv=velocities[addr(q)];let v=weight*gv.xyz;
    let r=vec3f(vec3i(x,y,z))-f;d+=v;c0+=4.0*v*r.x;c1+=4.0*v*r.y;c2+=4.0*v*r.z;volume+=weight*gv.w;
  }}}
  if(volume<.035){d=mix(d,p.d.xyz,.65);c0*=.2;c1*=.2;c2*=.2;}
  var J=p.p.w;if(volume>.95){J=mix(J,clamp(1.0/max(volume,.01),.3,2.5),.06);}
  if(u.step.z==1u){
    J=clamp(J*(1.0+c0.x+c1.y+c2.z),.3,2.5);
    var pp=p.p.xyz+d;
    var foam=p.d.w;
    for(var j=0u;j<4u;j++){
      let distance=solidAt(pp);if(distance>=.31){break;}
      let g=solidGradient(pp);let gl=length(g);let n=select(vec3f(0,1,0),g/max(gl,.0001),gl>.0001);pp+=n*min(3.0,(.31-distance)/max(gl,.15));
      foam=max(foam,clamp(-dot(p.d.xyz,n)*8.0,0.0,1.0));d-=min(dot(d,n),0.0)*n;
    }
    pp=clamp(pp,vec3f(2,.25,2),vec3f(f32(u.grid.x)-3.0,f32(u.grid.y)-3.0,f32(u.grid.z)-1.0));
    p.p=vec4f(pp,J);p.d=vec4f(clamp(d,vec3f(-.48),vec3f(.48)),foam);
  }else{p.d=vec4f(d,p.d.w);}
  p.c0=vec4f(clamp(c0,vec3f(-.3),vec3f(.3)),0);p.c1=vec4f(clamp(c1,vec3f(-.3),vec3f(.3)),0);p.c2=vec4f(clamp(c2,vec3f(-.3),vec3f(.3)),0);
  particles[i]=p;
}
`,Mn=`
struct Frame { vp:mat4x4f, view:mat4x4f, invVP:mat4x4f, lightVP:mat4x4f, eye:vec4f, sun:vec4f, viewport:vec4f, settings:vec4f, right:vec4f, up:vec4f };
@group(0) @binding(0) var<uniform> f:Frame;
fn sky(dir:vec3f)->vec3f{
  let t=clamp(dir.y*.7+.3,0.0,1.0);
  var c=mix(vec3f(.32,.43,.39),vec3f(.10,.23,.28),pow(t,.65));
  let glow=pow(max(dot(dir,normalize(f.sun.xyz)),0.0),18.0);
  c+=glow*vec3f(1.2,.75,.32)*f.sun.w;
  return c;
}
fn tonemap(c:vec3f)->vec3f {let x=c*f.settings.x;return pow(clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),vec3f(0),vec3f(1)),vec3f(1.0/2.2));}
struct FullOut { @builtin(position) pos:vec4f, @location(0) uv:vec2f };
@vertex fn fullscreen(@builtin(vertex_index) i:u32)->FullOut{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:FullOut;o.pos=vec4f(p[i],0,1);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;}
`,Is=Mn+`
@group(0) @binding(1) var shadow:texture_depth_2d;
@group(0) @binding(2) var shadowSampler:sampler_comparison;
struct SceneOut { @builtin(position) pos:vec4f, @location(0) world:vec3f, @location(1) normal:vec3f, @location(2) color:vec3f };
@vertex fn vs(@location(0) p:vec3f,@location(1) n:vec3f,@location(2) color:vec3f)->SceneOut{var o:SceneOut;o.pos=f.vp*vec4f(p,1);o.world=p;o.normal=n;o.color=color;return o;}
@vertex fn shadowVS(@location(0) p:vec3f)->@builtin(position) vec4f{return f.lightVP*vec4f(p,1);}
fn shadeShadow(p:vec3f)->f32{
  let clip=f.lightVP*vec4f(p,1);let q=clip.xyz/clip.w;let uv=q.xy*vec2f(.5,-.5)+.5;
  if(any(uv<vec2f(0))||any(uv>vec2f(1))){return 1.0;}
  var s=0.0;for(var x=-1;x<=1;x++){for(var y=-1;y<=1;y++){s+=textureSampleCompareLevel(shadow,shadowSampler,uv+vec2f(f32(x),f32(y))/2048.0,q.z-.0015);}}return s/9.0;
}
@fragment fn fs(o:SceneOut)->@location(0) vec4f{
  let n=normalize(o.normal);let l=normalize(f.sun.xyz);let light=max(dot(n,l),0.0)*shadeShadow(o.world);
  let ambient=vec3f(.20,.32,.27)*(n.y*.17+.55);
  let sunColor=vec3f(1.3,1.05,.70)*f.sun.w;
  var color=o.color*(ambient+sunColor*light);
  let rim=pow(1.0-max(dot(n,normalize(f.eye.xyz-o.world)),0.0),3.0)*.08;
  color+=vec3f(.2,.33,.23)*rim;
  let fog=1.0-exp(-length(f.eye.xyz-o.world)*.004);color=mix(color,vec3f(.29,.42,.35),fog);
  return vec4f(color,1);
}
@fragment fn skyFS(o:FullOut)->@location(0) vec4f{
  let pos=f.invVP*vec4f(o.uv*vec2f(2,-2)+vec2f(-1,1),1,1);let dir=normalize(pos.xyz/pos.w-f.eye.xyz);
  return vec4f(sky(dir),1);
}
`,Ls=Mn+`
struct Particle { p:vec4f, d:vec4f, c0:vec4f, c1:vec4f, c2:vec4f };
@group(0) @binding(1) var<storage,read> particles:array<Particle>;
struct WaterOut { @builtin(position) pos:vec4f, @location(0) circle:vec2f, @location(1) center:vec3f, @location(2) radius:f32, @location(3) motion:vec2f };
@vertex fn waterVS(@builtin(vertex_index) vi:u32,@builtin(instance_index) ii:u32)->WaterOut{
  let corners=array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(-1,1),vec2f(-1,1),vec2f(1,-1),vec2f(1,1));
  let p=particles[ii];let wp=(p.p.xyz-vec3f(26,0,22))*.24;
  let center=(f.view*vec4f(wp,1)).xyz;let radius=f.viewport.w;
  let c=corners[vi];let position=wp+(f.right.xyz*c.x+f.up.xyz*c.y)*radius;
  var o:WaterOut;o.pos=f.vp*vec4f(position,1);if(p.p.w<0.0){o.pos=vec4f(2,2,2,1);}o.circle=c;o.center=center;o.radius=radius;o.motion=vec2f(length(p.d.xyz)*28.8,p.d.w);return o;
}
struct DepthOut {@location(0) depth:vec4f,@builtin(frag_depth) fragDepth:f32};
@fragment fn depthFS(o:WaterOut)->DepthOut{
  let r2=dot(o.circle,o.circle);if(r2>1.0){discard;}
  let z=o.center.z+sqrt(1.0-r2)*o.radius;
  // vp = projection * view. WebGPU depth is derived from camera near/far.
  let near=.1;let far=100.0;let d=(far/(far-near))+(far*near/(far-near))/z;
  var result:DepthOut;result.fragDepth=d;result.depth=vec4f(-z,o.motion.x,o.motion.y,1);return result;
}
@fragment fn thicknessFS(o:WaterOut)->@location(0) vec4f{let r2=dot(o.circle,o.circle);if(r2>1.0){discard;}return vec4f(sqrt(1.0-r2)*o.radius*.50,0,0,0);}
`,Ds=Mn+`
@group(0) @binding(1) var source:texture_2d<f32>;
@group(0) @binding(2) var<uniform> direction:vec4f;
@fragment fn blur(o:FullOut)->@location(0) vec4f{
  let dimensions=vec2i(textureDimensions(source));let pixel=clamp(vec2i(o.pos.xy),vec2i(0),dimensions-1);let center=textureLoad(source,pixel,0);
  if(center.x<.01){return center;}
  var sum=vec4f(0);var total=0.0;
  for(var j=-6;j<=6;j++){
    let q=clamp(pixel+vec2i(direction.xy)*j,vec2i(0),dimensions-1);let value=textureLoad(source,q,0);
    if(value.x<.01){continue;}let difference=value.x-center.x;
    let weight=exp(-f32(j*j)/16.0-difference*difference*35.0);sum+=value*weight;total+=weight;
  }
  return sum/max(total,.00001);
}
`,Us=Mn+`
@group(0) @binding(1) var scene:texture_2d<f32>;
@group(0) @binding(2) var fluid:texture_2d<f32>;
@group(0) @binding(3) var thickness:texture_2d<f32>;
@group(0) @binding(4) var sceneDepth:texture_depth_2d;
fn worldAt(uv:vec2f,d:f32)->vec3f {let far=100.0;let near=.1;let z=far/(far-near)-(far*near/(far-near))/max(d,.1);let p=f.invVP*vec4f(uv*vec2f(2,-2)+vec2f(-1,1),z,1);return p.xyz/p.w;}
fn foamHash(p:vec2f)->f32{
  var q=fract(vec3f(p.x,p.y,p.x)*vec3f(.1031,.1030,.0973));
  q+=vec3f(dot(q,q.yzx+vec3f(33.33)));
  return fract((q.x+q.y)*q.z);
}
fn foamNoise(p:vec2f)->f32{
  let cell=floor(p);let u=fract(p);let t=u*u*(vec2f(3.0)-2.0*u);
  return mix(mix(foamHash(cell),foamHash(cell+vec2f(1,0)),t.x),mix(foamHash(cell+vec2f(0,1)),foamHash(cell+vec2f(1,1)),t.x),t.y);
}
@fragment fn composite(o:FullOut)->@location(0) vec4f{
  let dimensions=vec2i(textureDimensions(scene));let pixel=clamp(vec2i(o.pos.xy),vec2i(0),dimensions-1);
  let background=textureLoad(scene,pixel,0).xyz;let data=textureLoad(fluid,pixel,0);
  if(data.x<.01){return vec4f(tonemap(background),1);}
  let z=100.0/99.9-10.0/99.9/data.x;let groundZ=textureLoad(sceneDepth,pixel,0);
  if(z>groundZ+.0002){return vec4f(tonemap(background),1);}
  let texel=1.0/vec2f(dimensions);let wp=worldAt(o.uv,data.x);
  let xp=min(pixel+vec2i(1,0),dimensions-1);let xm=max(pixel-vec2i(1,0),vec2i(0));let yp=min(pixel+vec2i(0,1),dimensions-1);let ym=max(pixel-vec2i(0,1),vec2i(0));
  let dxp=textureLoad(fluid,xp,0).x;let dxm=textureLoad(fluid,xm,0).x;let dyp=textureLoad(fluid,yp,0).x;let dym=textureLoad(fluid,ym,0).x;
  var tx=worldAt(o.uv+vec2f(texel.x,0),select(data.x,dxp,dxp>.01))-wp;
  var ty=worldAt(o.uv+vec2f(0,texel.y),select(data.x,dyp,dyp>.01))-wp;
  if(abs(dxm-data.x)<abs(dxp-data.x)&&dxm>.01){tx=wp-worldAt(o.uv-vec2f(texel.x,0),dxm);}
  if(abs(dym-data.x)<abs(dyp-data.x)&&dym>.01){ty=wp-worldAt(o.uv-vec2f(0,texel.y),dym);}
  var n=normalize(cross(tx,ty));let v=normalize(f.eye.xyz-wp);if(dot(n,v)<0.0){n=-n;}
  let th=clamp(textureLoad(thickness,pixel,0).x,.02,2.5);
  let refraction=clamp(pixel+vec2i(vec2f(dot(n,f.right.xyz),-dot(n,f.up.xyz))*th*26.0),vec2i(0),dimensions-1);
  let behind=select(background,textureLoad(scene,refraction,0).xyz,textureLoad(sceneDepth,refraction,0)>z+.00005);
  var absorption=vec3f(1.25,.38,.25);var tint=vec3f(.018,.16,.13);
  if(f.settings.z>.5&&f.settings.z<1.5){absorption=vec3f(2.2,.72,.32);tint=vec3f(.015,.18,.32);}
  if(f.settings.z>1.5){absorption=vec3f(2.4,.65,.38);tint=vec3f(.025,.27,.25);}
  let transmission=exp(-th*absorption);
  let body=behind*transmission+tint*(1.0-transmission);
  let reflection=sky(reflect(-v,n));let fresnel=.035+.965*pow(1.0-max(dot(v,n),0.0),5.0);
  let highlight=pow(max(dot(n,normalize(v+normalize(f.sun.xyz))),0.0),160.0)*f.sun.w;
  var color=mix(body,reflection,fresnel*.8)+highlight*vec3f(2.3,1.8,1.1);
  let drift=vec2f(f.viewport.z*.21,f.viewport.z*(1.2+min(data.y,6.0)*.75));
  let foamUV=vec2f(wp.x*7.7+wp.z*3.1,wp.y*4.9+wp.z*6.3)+drift;
  let noise=foamNoise(foamUV)*.65+foamNoise(foamUV*1.93+vec2f(17.1,7.7))*.35;
  let foam=clamp((data.z*.58+smoothstep(1.6,4.4,data.y)*.12)*f.settings.w*1.5,0,.78)*mix(.16,1.0,smoothstep(.35,.73,noise));
  color=mix(color,vec3f(.82,.91,.87),foam);
  if(f.settings.y>.5 && f.settings.y<1.5){color=mix(vec3f(.04,.25,.7),vec3f(1,.35,.04),clamp(data.y/4.0,0,1));}
  if(f.settings.y>1.5){color=mix(vec3f(.08,.22,.3),vec3f(.8,1,.85),clamp(th,0,1));}
  let vignette=1.0-.17*pow(length((o.uv-.5)*vec2f(1,.85))*1.4,2.0);
  return vec4f(tonemap(color)*vignette,1);
}
`;var k=()=>GPUBufferUsage,ue=()=>GPUTextureUsage,Sn=class{constructor(t,e){this.canvas=t,this.onStatus=e,this.state=structuredClone(yn),this.errors=[],this.frame=0,this.elapsed=0,this.stats={fps:0,particles:0,steps:0},this.worldVersion=0,this.worldReady=0,this.selection=null}async init(){if(!navigator.gpu)throw new Error("\u5F53\u524D\u6D4F\u89C8\u5668\u672A\u542F\u7528 WebGPU\u3002\u8BF7\u7528\u652F\u6301 WebGPU \u7684 Chrome \u6216 Edge \u6253\u5F00\u672C\u5730\u5730\u5740\u3002");if(this.adapter=await navigator.gpu.requestAdapter({powerPreference:"high-performance"}),!this.adapter)throw new Error("\u672A\u627E\u5230\u53EF\u7528 WebGPU \u8BBE\u5907\u3002\u8BF7\u68C0\u67E5\u6D4F\u89C8\u5668\u786C\u4EF6\u52A0\u901F\u4E0E\u663E\u5361\u9A71\u52A8\u3002");this.device=await this.adapter.requestDevice();let t=this.device;t.addEventListener("uncapturederror",c=>{this.errors.push(c.error.message),this.stopped||(this.stopped=!0,this.onStatus(c.error.message,!0)),console.error(c.error.message)}),t.lost.then(c=>{this.stopped=!0,this.onStatus("\u56FE\u5F62\u8BBE\u5907\u5DF2\u4E2D\u65AD\uFF0C\u8BF7\u91CD\u65B0\u52A0\u8F7D\u9875\u9762\u3002"+c.message,!0)}),this.context=this.canvas.getContext("webgpu"),this.format=navigator.gpu.getPreferredCanvasFormat(),this.context.configure({device:t,format:this.format,alphaMode:"opaque",usage:ue().RENDER_ATTACHMENT|ue().COPY_SRC}),this.camera=new Ee(43,1,.1,100),this.camera.coordinateSystem=se,this.camera.position.set(14,12,23),this.controls=new pn(this.camera,this.canvas),this.controls.target.set(-.35,4.15,-.5),this.controls.enableDamping=!0,this.controls.dampingFactor=.07,this.controls.minDistance=1.5,this.controls.maxDistance=55,this.controls.maxPolarAngle=Math.PI*.94,this.controls.update(),this.lightCamera=new Ae(-13,13,14,-14,.1,55),this.lightCamera.coordinateSystem=se,this.frameUniform=this.buffer(384,k().UNIFORM|k().COPY_DST),this.frameData=new Float32Array(96),this.simLayout=t.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},...[1,2,3].map(c=>({binding:c,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}})),...[4,5].map(c=>({binding:c,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}}))]});let e=await this.module(Ps,"PB-MPM 3D"),n=t.createPipelineLayout({bindGroupLayouts:[this.simLayout]});this.compute={};for(let c of["prepare","p2g","updateGrid","g2p"])this.compute[c]=await t.createComputePipelineAsync({label:c,layout:n,compute:{module:e,entryPoint:c}});let i=await this.module(Is,"Forest and shadows"),r=await this.module(Ls,"Fluid surface"),o=await this.module(Ds,"Bilateral filter"),a=await this.module(Us,"Water optics");this.vertexLayout={arrayStride:36,attributes:[{shaderLocation:0,format:"float32x3",offset:0},{shaderLocation:1,format:"float32x3",offset:12},{shaderLocation:2,format:"float32x3",offset:24}]},this.scenePipeline=await t.createRenderPipelineAsync({layout:"auto",vertex:{module:i,entryPoint:"vs",buffers:[this.vertexLayout]},fragment:{module:i,entryPoint:"fs",targets:[{format:"rgba16float"}]},primitive:{topology:"triangle-list",cullMode:"none"},depthStencil:{format:"depth32float",depthWriteEnabled:!0,depthCompare:"less"}}),this.shadowPipeline=await t.createRenderPipelineAsync({layout:"auto",vertex:{module:i,entryPoint:"shadowVS",buffers:[{arrayStride:36,attributes:[this.vertexLayout.attributes[0]]}]},primitive:{topology:"triangle-list",cullMode:"none"},depthStencil:{format:"depth32float",depthWriteEnabled:!0,depthCompare:"less",depthBias:2,depthBiasSlopeScale:2}}),this.skyPipeline=await t.createRenderPipelineAsync({layout:"auto",vertex:{module:i,entryPoint:"fullscreen"},fragment:{module:i,entryPoint:"skyFS",targets:[{format:"rgba16float"}]},depthStencil:{format:"depth32float",depthWriteEnabled:!1,depthCompare:"always"}}),this.waterPipeline=await t.createRenderPipelineAsync({layout:"auto",vertex:{module:r,entryPoint:"waterVS"},fragment:{module:r,entryPoint:"depthFS",targets:[{format:"rgba16float"}]},primitive:{topology:"triangle-list"},depthStencil:{format:"depth32float",depthWriteEnabled:!0,depthCompare:"less"}}),this.thicknessPipeline=await t.createRenderPipelineAsync({layout:"auto",vertex:{module:r,entryPoint:"waterVS"},fragment:{module:r,entryPoint:"thicknessFS",targets:[{format:"rgba16float",blend:{color:{srcFactor:"one",dstFactor:"one"},alpha:{srcFactor:"one",dstFactor:"one"}}}]},depthStencil:{format:"depth32float",depthWriteEnabled:!1,depthCompare:"less"}}),this.filterPipeline=await t.createRenderPipelineAsync({layout:"auto",vertex:{module:o,entryPoint:"fullscreen"},fragment:{module:o,entryPoint:"blur",targets:[{format:"rgba16float"}]}}),this.compositePipeline=await t.createRenderPipelineAsync({layout:"auto",vertex:{module:a,entryPoint:"fullscreen"},fragment:{module:a,entryPoint:"composite",targets:[{format:this.format}]}}),this.shadow=this.texture(2048,2048,"depth32float"),this.shadowSampler=t.createSampler({compare:"less",magFilter:"linear",minFilter:"linear"}),this.shadowGroup=this.bind(this.shadowPipeline,[{binding:0,resource:{buffer:this.frameUniform}}]),this.skyGroup=this.bind(this.skyPipeline,[{binding:0,resource:{buffer:this.frameUniform}}]),this.sceneGroup=this.bind(this.scenePipeline,[{binding:0,resource:{buffer:this.frameUniform}},{binding:1,resource:this.shadow.createView()},{binding:2,resource:this.shadowSampler}]),this.blurH=this.buffer(new Float32Array([1,0,0,0]),k().UNIFORM|k().COPY_DST),this.blurV=this.buffer(new Float32Array([0,1,0,0]),k().UNIFORM|k().COPY_DST),this.terrainWorker=new Worker(new URL("./terrain-worker.js"+new URL(import.meta.url).search,document.baseURI),{type:"module"}),this.terrainWorker.onmessage=({data:c})=>{this.terrainBusy=!1,c.version===this.worldVersion&&(c.error?this.onStatus("\u5730\u5F62\u91CD\u5EFA\u5931\u8D25\uFF1A"+c.error,!0):(this.setWorldMesh(c.mesh),this.worldReady=c.version,document.body.dataset.terrain="ready"));let l=this.pendingTerrain;this.pendingTerrain=null,l&&(this.terrainBusy=!0,this.terrainWorker.postMessage(l))},this.terrainWorker.onerror=c=>this.onStatus("\u5730\u5F62\u7F16\u8F91\u5DE5\u4F5C\u7EBF\u7A0B\u4E2D\u65AD\uFF1A"+c.message,!0),this.reset(),this.resize(),this.resizeObserver=new ResizeObserver(()=>this.resize()),this.resizeObserver.observe(this.canvas),this.stats.adapter=this.adapter.info?.description||this.adapter.info?.device||"WebGPU",this.onStatus("\u6C34\u6D41\u5DF2\u5C31\u7EEA"),this.previous=performance.now(),this.fpsTime=this.previous,this.fpsFrames=0,this.accumulator=0,this.animate=this.animate.bind(this),requestAnimationFrame(this.animate)}buffer(t,e){let n=typeof t=="number"?null:t,i=this.device.createBuffer({size:n?Math.ceil(n.byteLength/4)*4:t,usage:e,mappedAtCreation:!!n});return n&&(new Uint8Array(i.getMappedRange()).set(new Uint8Array(n.buffer,n.byteOffset,n.byteLength)),i.unmap()),i}texture(t,e,n){return this.device.createTexture({size:[t,e],format:n,usage:ue().RENDER_ATTACHMENT|ue().TEXTURE_BINDING|ue().COPY_SRC|ue().COPY_DST})}bind(t,e){return this.device.createBindGroup({layout:t.getBindGroupLayout(0),entries:e})}async module(t,e){let n=this.device.createShaderModule({code:t,label:e}),r=(await n.getCompilationInfo()).messages.filter(o=>o.type==="error");if(r.length)throw new Error(e+": "+r.map(o=>`line ${o.lineNum}: ${o.message}`).join(`
`));return n}reset(){let t=this.resources||[];this.resources=[];for(let i of t)i.destroy();let e={light:8192,fine:16384,cinema:24576,ultra:49152}[this.state.quality];this.count=e,this.stats.particles=e,this.particles=this.buffer(_s(e,this.state.preset),k().STORAGE|k().COPY_DST|k().COPY_SRC);let n=A.reduce((i,r)=>i*r,1);this.grid=this.buffer(n*20,k().STORAGE|k().COPY_DST),this.gridVelocity=this.buffer(n*16,k().STORAGE|k().COPY_DST),this.terrainCache??=new mn,this.terrainField=this.terrainCache.update(this.state.preset,this.state.edits),this.collisionCache??=new Ie,this.collisionField=this.collisionCache.update(this.terrainField,this.state.objects,this.terrainCache.revision).field,this.collisionRevision=(this.collisionRevision||0)+1,this.solid=this.buffer(this.collisionField,k().STORAGE|k().COPY_DST),this.sourceCapacity=0,this.sourcesBuffer=null,this.uniforms=[],this.simGroups=[],this.resources.push(this.particles,this.grid,this.gridVelocity,this.solid);for(let i=0;i<12;i++){let r=this.buffer(80,k().UNIFORM|k().COPY_DST);this.uniforms.push(r),this.resources.push(r)}this.simData??=Cs(),this.updateSources(!0),this.waterGroup=this.bind(this.waterPipeline,[{binding:0,resource:{buffer:this.frameUniform}},{binding:1,resource:{buffer:this.particles}}]),this.thicknessGroup=this.bind(this.thicknessPipeline,[{binding:0,resource:{buffer:this.frameUniform}},{binding:1,resource:{buffer:this.particles}}]),this.rebuildWorld(!0),this.frame=0,this.stats.steps=0,this.accumulator=0}setWorldMesh(t){this.mesh?.destroy(),this.mesh=this.buffer(t,k().VERTEX),this.vertexCount=t.length/9,this.shadowDirty=!0}rebuildWorld(t=!1){let e=this.state.preset+":"+this.state.season;if(t||e!==this.worldKey)if(this.worldKey=e,this.worldVersion++,this.pendingTerrain=null,!this.state.edits.length)this.setWorldMesh(Gt(this.state.preset,this.state.season,[])),this.worldReady=this.worldVersion,document.body.dataset.terrain="ready";else{this.mesh||this.setWorldMesh(Gt(this.state.preset,this.state.season,[])),document.body.dataset.terrain="building";let i={version:this.worldVersion,preset:this.state.preset,season:this.state.season,edits:this.state.edits};this.terrainBusy?this.pendingTerrain=i:(this.terrainBusy=!0,this.terrainWorker.postMessage(i))}this.objectMeshCache??=new _n;let n=this.objectMeshCache.update(this.state.objects,this.selection);if(n.rebuilt)this.objectMesh?.destroy(),this.objectMesh=null,this.objectVertexCount=n.data.length/9,n.data.length&&(this.objectMesh=this.buffer(n.data,k().VERTEX|k().COPY_DST));else for(let i of n.patches)this.device.queue.writeBuffer(this.objectMesh,i.offset*4,i.data);n.changed&&(this.shadowDirty=!0)}updateObjects(t=[]){this.collisionCache??=new Ie;let e=this.collisionCache.update(this.terrainField,this.state.objects,this.terrainCache?.revision||0,t);this.collisionField=e.field,e.changed&&(this.collisionRevision=(this.collisionRevision||0)+1,this.device.queue.writeBuffer(this.solid,0,this.collisionField))}updateTerrain(){this.terrainField=this.terrainCache.update(this.state.preset,this.state.edits),this.updateObjects(),this.rebuildWorld(!0)}updateSources(t=!1){this.sourceCache??=new xn;let e=this.sourceCache.update(this.state,t);if(this.sourceCount=e.count,this.sourceFlow=e.total,e.count>this.sourceCapacity){let n=this.sourcesBuffer;this.sourceCapacity=2**Math.ceil(Math.log2(Math.max(1,e.count))),this.sourcesBuffer=this.buffer(this.sourceCapacity*32,k().STORAGE|k().COPY_DST),this.resources.push(this.sourcesBuffer),this.simGroups=this.uniforms.map(i=>this.device.createBindGroup({layout:this.simLayout,entries:[i,this.particles,this.grid,this.gridVelocity,this.solid,this.sourcesBuffer].map((r,o)=>({binding:o,resource:{buffer:r}}))})),n&&(this.resources=this.resources.filter(i=>i!==n),n.destroy())}e.changed&&this.device.queue.writeBuffer(this.sourcesBuffer,0,e.data)}cameraState(){return{position:this.camera.position.toArray(),target:this.controls.target.toArray()}}restoreCamera(t){t&&(this.camera.position.fromArray(t.position),this.controls.target.fromArray(t.target),this.controls.update())}focusAt(t,e=2){let n=this.camera.position.clone().sub(this.controls.target).normalize().multiplyScalar(Math.max(2,e*3.6));this.controls.target.fromArray(t),this.camera.position.copy(this.controls.target).add(n),this.controls.update()}resize(){let t={light:.8,fine:1,cinema:1.4,ultra:1.65}[this.state.quality],e=Math.min(devicePixelRatio,1.5)*t,n=Math.min(e,2200/Math.max(1,this.canvas.clientWidth),1600/Math.max(1,this.canvas.clientHeight)),i=Math.max(1,Math.round(this.canvas.clientWidth*n)),r=Math.max(1,Math.round(this.canvas.clientHeight*n));if(this.width===i&&this.height===r)return;this.width=i,this.height=r,this.canvas.width=i,this.canvas.height=r,this.camera.aspect=i/r,this.camera.updateProjectionMatrix();for(let a of Object.values(this.targets||{}))a.destroy();this.targets={scene:this.texture(i,r,"rgba16float"),depth:this.texture(i,r,"depth32float"),waterDepth:this.texture(i,r,"depth32float"),water:this.texture(i,r,"rgba16float"),blur:this.texture(i,r,"rgba16float"),smooth:this.texture(i,r,"rgba16float"),thickness:this.texture(i,r,"rgba16float")};let o=this.targets;this.filterGroups=[this.bind(this.filterPipeline,[{binding:1,resource:o.water.createView()},{binding:2,resource:{buffer:this.blurH}}]),this.bind(this.filterPipeline,[{binding:1,resource:o.blur.createView()},{binding:2,resource:{buffer:this.blurV}}]),this.bind(this.filterPipeline,[{binding:1,resource:o.smooth.createView()},{binding:2,resource:{buffer:this.blurH}}])],this.compositeGroup=this.bind(this.compositePipeline,[{binding:0,resource:{buffer:this.frameUniform}},{binding:1,resource:o.scene.createView()},{binding:2,resource:o.smooth.createView()},{binding:3,resource:o.thickness.createView()},{binding:4,resource:o.depth.createView()}])}writeFrame(t){this.controls.update(),this.camera.updateMatrixWorld();let e=new $().multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse),n=e.clone().invert(),i=this.state.sun===1?new v(-.6,.65,.5):new v(-.45,.82,-.3);i.normalize(),this.lightCamera.position.copy(i.clone().multiplyScalar(24).add(new v(0,4,0))),this.lightCamera.lookAt(0,4,0),this.lightCamera.updateMatrixWorld(),this.lightCamera.updateProjectionMatrix();let r=new $().multiplyMatrices(this.lightCamera.projectionMatrix,this.lightCamera.matrixWorldInverse),o=this.frameData;o.set(e.elements,0),o.set(this.camera.matrixWorldInverse.elements,16),o.set(n.elements,32),o.set(r.elements,48),o.set([...this.camera.position.toArray(),0],64),o.set([...i.toArray(),this.state.sun===1?1.4:1],68),o.set([this.width,this.height,t,.169*Math.cbrt(16384/this.count)],72),o.set([this.state.exposure,this.state.mode,this.state.waterStyle||0,this.state.foam??.65],76);let a=this.camera.matrixWorld.elements;o.set([a[0],a[1],a[2],0],80),o.set([a[4],a[5],a[6],0],84),this.device.queue.writeBuffer(this.frameUniform,0,o)}simulate(t,e=2){this.updateSources();for(let n=0;n<e;n++){for(let r=0;r<3;r++){let o=n*3+r;this.device.queue.writeBuffer(this.uniforms[o],0,Rs(this.simData[o],this.state,this.count,this.stats.steps+n,r,this.sourceCount,this.sourceFlow))}let i=t.beginComputePass();i.setPipeline(this.compute.prepare),i.setBindGroup(0,this.simGroups[n*3]),i.dispatchWorkgroups(Math.ceil(this.count/128)),i.end();for(let r=0;r<3;r++)t.clearBuffer(this.grid),i=t.beginComputePass(),i.setBindGroup(0,this.simGroups[n*3+r]),i.setPipeline(this.compute.p2g),i.dispatchWorkgroups(Math.ceil(this.count/128)),i.setPipeline(this.compute.updateGrid),i.dispatchWorkgroups(Math.ceil(A.reduce((o,a)=>o*a,1)/128)),i.setPipeline(this.compute.g2p),i.dispatchWorkgroups(Math.ceil(this.count/128)),i.end()}this.stats.steps+=e,this.frame++}colorAttachment(t,e=[0,0,0,0]){return{view:t.createView(),clearValue:e,loadOp:"clear",storeOp:"store"}}render(t,e=null){let n=this.targets;if(this.shadowDirty){let o=t.beginRenderPass({colorAttachments:[],depthStencilAttachment:{view:this.shadow.createView(),depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}});o.setPipeline(this.shadowPipeline),o.setBindGroup(0,this.shadowGroup),o.setVertexBuffer(0,this.mesh),o.draw(this.vertexCount),this.objectMesh&&(o.setVertexBuffer(0,this.objectMesh),o.draw(this.objectVertexCount)),o.end(),this.shadowDirty=!1}let i=t.beginRenderPass({colorAttachments:[this.colorAttachment(n.scene)],depthStencilAttachment:{view:n.depth.createView(),depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}});i.setPipeline(this.skyPipeline),i.setBindGroup(0,this.skyGroup),i.draw(3),i.setPipeline(this.scenePipeline),i.setBindGroup(0,this.sceneGroup),i.setVertexBuffer(0,this.mesh),i.draw(this.vertexCount),this.objectMesh&&(i.setVertexBuffer(0,this.objectMesh),i.draw(this.objectVertexCount)),i.end(),t.copyTextureToTexture({texture:n.depth},{texture:n.waterDepth},[this.width,this.height]),i=t.beginRenderPass({colorAttachments:[this.colorAttachment(n.water)],depthStencilAttachment:{view:n.waterDepth.createView(),depthLoadOp:"load",depthStoreOp:"store"}}),i.setPipeline(this.waterPipeline),i.setBindGroup(0,this.waterGroup),i.draw(6,this.count),i.end(),i=t.beginRenderPass({colorAttachments:[this.colorAttachment(n.thickness)],depthStencilAttachment:{view:n.depth.createView(),depthLoadOp:"load",depthStoreOp:"store"}}),i.setPipeline(this.thicknessPipeline),i.setBindGroup(0,this.thicknessGroup),i.draw(6,this.count),i.end();let r=Math.max(1,Math.min(3,Math.round(this.state.surfaceSmoothing??1)));for(let o=0;o<r;o++)for(let a=0;a<2;a++)i=t.beginRenderPass({colorAttachments:[this.colorAttachment(a?n.smooth:n.blur)]}),i.setPipeline(this.filterPipeline),i.setBindGroup(0,this.filterGroups[a?1:o?2:0]),i.draw(3),i.end();i=t.beginRenderPass({colorAttachments:[{view:(e||this.context.getCurrentTexture()).createView(),clearValue:[0,0,0,1],loadOp:"clear",storeOp:"store"}]}),i.setPipeline(this.compositePipeline),i.setBindGroup(0,this.compositeGroup),i.draw(3),i.end()}async animate(t){if(this.stopped)return;let e=Math.min((t-this.previous)/1e3,.05);this.elapsed+=e,this.previous=t,this.writeFrame(this.elapsed);let n=this.device.createCommandEncoder();if(this.state.paused)this.accumulator=0;else{this.accumulator=Math.min(this.accumulator+e*this.state.speed,.05);let i=Math.min(4,Math.floor(this.accumulator*120));i&&(this.simulate(n,i),this.accumulator-=i/120)}this.render(n),this.device.queue.submit([n.finish()]),await this.device.queue.onSubmittedWorkDone(),this.fpsFrames++,t-this.fpsTime>700&&(this.stats.fps=Math.round(this.fpsFrames*1e3/(t-this.fpsTime)),this.fpsFrames=0,this.fpsTime=t),requestAnimationFrame(this.animate)}setView(t){let e={wide:[14,12,23],close:[7.5,7.5,11],top:[.2,24,5],side:[18,8,1]};this.camera.position.fromArray(e[t]||e.wide),this.controls.target.set(-.35,4.15,-.5),this.controls.update()}async readParticles(){let t=this.count*80,e=this.buffer(t,k().COPY_DST|k().MAP_READ),n=this.device.createCommandEncoder();n.copyBufferToBuffer(this.particles,0,e,0,t),this.device.queue.submit([n.finish()]),await e.mapAsync(GPUMapMode.READ);let i=new Float32Array(e.getMappedRange().slice(0));return e.unmap(),e.destroy(),i}async screenshot(){let t=this.width,e=this.height,n=Math.ceil(t*4/256)*256,i=this.buffer(n*e,k().COPY_DST|k().MAP_READ),r=this.texture(t,e,this.format),o=this.device.createCommandEncoder();this.render(o,r),o.copyTextureToBuffer({texture:r},{buffer:i,bytesPerRow:n},[t,e]),this.device.queue.submit([o.finish()]),await i.mapAsync(GPUMapMode.READ);let a=new Uint8Array(i.getMappedRange()),c=new Uint8ClampedArray(t*e*4);for(let h=0;h<e;h++)c.set(a.subarray(h*n,h*n+t*4),h*t*4);if(this.format.startsWith("bgra"))for(let h=0;h<c.length;h+=4){let d=c[h];c[h]=c[h+2],c[h+2]=d}let l=document.createElement("canvas");return l.width=t,l.height=e,l.getContext("2d").putImageData(new ImageData(c,t,e),0,0),i.unmap(),i.destroy(),r.destroy(),new Promise(h=>l.toBlob(h,"image/png"))}};function Ns(s,t,e){let[n,i,r]=t.map((u,p)=>u-s.position[p]),o=Math.hypot(n,r),a=s.speed;if(!(a>0)||!(e>0)||!t.every(Number.isFinite))return null;if(o<1e-5)return i<-.001?{yaw:s.yaw,pitch:-90}:null;let c=a*a,l=c*c-e*(e*o*o+2*i*c);if(l<0)return null;let h=(e*o*o+2*i*c)/(o*(c+Math.sqrt(l))),d=Math.atan(h)*180/Math.PI;return d>75||d<-90?null:{yaw:Math.atan2(n,r)*180/Math.PI,pitch:d}}function Fs(s,t,e){let n=[[...s.position]],i=o=>o[0]>-A[0]*T/2+T&&o[0]<A[0]*T/2-T&&o[1]>.05&&o[1]<(A[1]-2)*T&&o[2]>-A[2]*T/2+T&&o[2]<A[2]*T/2-T;if(!s.enabled||s.power<=0)return{points:[],impact:null,reason:"off"};if(!i(s.position))return{points:n,impact:null,reason:"outside"};if(pt(e,s.position)<=0)return{points:n,impact:null,reason:"blocked"};let r=Si(s).map(o=>o*s.speed);for(let o=1;o<=100;o++){let a=o*.04,c=s.position.map((d,u)=>d+r[u]*a-(u===1?.5*t*a*a:0)),l=n.at(-1),h=Math.max(1,Math.ceil(Math.hypot(...c.map((d,u)=>d-l[u]))/(T*.4)));for(let d=1;d<=h;d++){let u=l.map((p,g)=>p+(c[g]-p)*d/h);if(!i(u))return{points:n,impact:null,reason:"outside"};if(pt(e,u)<=0){let p=l.map((x,y)=>x+(c[y]-x)*(d-1)/h),g=u;for(let x=0;x<8;x++){let y=p.map((S,w)=>(S+g[w])*.5);pt(e,y)>0?p=y:g=y}let _=p.map((x,y)=>(x+g[y])*.5);return n.push(_),{points:n,impact:_,reason:"hit"}}}n.push(c)}return{points:n,impact:null,reason:"open"}}var bn=s=>({point:[...s.point],normal:[...s.normal]}),wn=class{constructor(t,e){this.spacing=e*.23,this.reset(t)}reset(t){this.previous=t?bn(t):null,this.carry=0}sample(t){if(!t)return this.reset(null),[];if(!this.previous)return this.reset(t),[bn(t)];let e=this.previous,n=Math.hypot(...t.point.map((o,a)=>o-e.point[a]));if(this.previous=bn(t),n<1e-9)return[];if(n>this.spacing*64)return this.reset(t),[bn(t)];let i=Math.floor((n+this.carry+1e-9)/this.spacing),r=[];for(let o=1;o<=i;o++){let a=W((o*this.spacing-this.carry)/n,0,1),c=e.normal.map((h,d)=>h+(t.normal[d]-h)*a),l=Math.hypot(...c);r.push({point:e.point.map((h,d)=>h+(t.point[d]-h)*a),normal:l>1e-8?c.map(h=>h/l):[...t.normal]})}return this.carry=Math.max(0,n+this.carry-i*this.spacing),r}};function Os(s,{op:t,radius:e,strength:n=.65,mirror:i=!1,level:r}){let o=[],a=t==="cut"?-.55*e:t==="add"?.15*e:0;for(let c of s){let l=c.point.map((d,u)=>W(d+c.normal[u]*a,u===0?-5.5:u===1?.05:-4.8,u===0?5.5:u===1?12.6:4.8)),h={op:t,center:l,radius:e};["smooth","flatten"].includes(t)&&(h.strength=n),t==="flatten"&&(h.level=W(r??c.point[1],.05,12.8)),o.push(h),i&&Math.abs(l[0])>.03&&o.push({...h,center:[-l[0],l[1],l[2]]})}return o}function Bs(s){let[t,e,n]=s.position,[i,r,o]=s.scale,a=s.rotation||0,c=Math.abs(Math.cos(a)),l=Math.abs(Math.sin(a)),h=(i*c+o*l)*1.1,d=(i*l+o*c)*1.1,u=r*1.1;return[[t-h,e-u,n-d],[t+h,e+Math.max(u,s.type==="rock"?r*.7+.105:0),n+d]]}function Xc(s,t,[e,n],i){let r=0,o=i;for(let a=0;a<3;a++){if(Math.abs(t[a])<1e-12){if(s[a]<e[a]||s[a]>n[a])return!1;continue}let c=(e[a]-s[a])/t[a],l=(n[a]-s[a])/t[a];if(r=Math.max(r,Math.min(c,l)),o=Math.min(o,Math.max(c,l)),r>o)return!1}return!0}function qc(s,t,e,n=70){let i=n,r=!1;for(let o=0;o<s.length;o+=27){let a=s[o],c=s[o+1],l=s[o+2],h=s[o+9]-a,d=s[o+10]-c,u=s[o+11]-l,p=s[o+18]-a,g=s[o+19]-c,_=s[o+20]-l,x=e[1]*_-e[2]*g,y=e[2]*p-e[0]*_,S=e[0]*g-e[1]*p,w=h*x+d*y+u*S;if(Math.abs(w)<1e-10)continue;let E=t[0]-a,b=t[1]-c,L=t[2]-l,R=(E*x+b*y+L*S)/w;if(R<0||R>1)continue;let ct=b*u-L*d,J=L*h-E*u,bt=E*d-b*h,Wt=(e[0]*ct+e[1]*J+e[2]*bt)/w;if(Wt<0||R+Wt>1)continue;let Nt=(p*ct+g*J+_*bt)/w;Nt>=0&&Nt<=i&&(i=Nt,r=!0)}return r?i:null}var En=class{constructor(){this.entries=new Map}pick(t,e,n,i=null,r=70){if(!t.length)return this.entries.clear(),null;let o=Math.hypot(...n);if(o<1e-12)return null;if(n=n.map(l=>l/o),i){let l=gn(i,e,n,r);l&&(r=Math.min(r,Math.hypot(...l.point.map((h,d)=>h-e[d]))+.01))}let a=new Set(t.map(l=>l.id));for(let l of this.entries.keys())a.has(l)||this.entries.delete(l);let c=null;return t.forEach((l,h)=>{if(!Xc(e,n,Bs(l),r))return;let d=JSON.stringify([l.type,l.position,l.scale,l.rotation||0]),u=this.entries.get(l.id);u?.key!==d&&(u={key:d,vertices:Gt(0,"summer",[l],!0)},this.entries.set(l.id,u));let p=qc(u.vertices,e,n,r);p!==null&&(c===null||p<c.distance)&&(c={index:h,distance:p,point:e.map((g,_)=>g+n[_]*p)},r=p)}),c}},zs=[[-5.3,5.3],[.12,12.4],[-4.5,4.5]],Ei=class{constructor(t,e,n,i="plane",r=zs){this.bounds=r,this.position=[...t],this.rebase(e,n,i)}rebase(t,e,n){this.base=[...this.position],this.anchor=t?[...t]:null,this.clientY=e,this.axis=n}update(t,e,n=this.axis,i=0){if(n!==this.axis)return this.rebase(t,e,n),[...this.position];if(n!=="y"&&!t)return this.rebase(null,e,n),[...this.position];if(n!=="y"&&!this.anchor)return this.rebase(t,e,n),[...this.position];let r=n==="y"?[0,(this.clientY-e)*.018,0]:[t[0]-this.anchor[0],0,t[2]-this.anchor[2]],o=n==="x"?[0]:n==="z"?[2]:n==="y"?[1]:[0,2];this.position=[...this.base];for(let a of o){let c=i>0?Math.round(r[a]/i)*i:r[a];Math.abs(c)>1e-8&&(this.position[a]=W(this.base[a]+c,...this.bounds[a]))}return[...this.position]}};function Yc(s,t){let e=structuredClone(s);return e.id=t,e.position[0]=-e.position[0],e.rotation=-(e.rotation||0),e}function ks(s){let t=structuredClone(s);return t.position[0]=-t.position[0],t.yaw=-t.yaw,t}var Tn=class{constructor(){this.ids=new Set,this.active=null}clear(){this.ids.clear(),this.active=null}replace(t,e,n=e.at(-1)){this.ids=new Set(e.filter(i=>t[i]).map(i=>t[i].id)),this.active=t[n]?.id??null,this.prune(t)}choose(t,e,n=!1){let i=t[e];if(!i){n||this.clear();return}n?(this.ids.has(i.id)?this.ids.delete(i.id):this.ids.add(i.id),this.active=i.id,this.prune(t)):this.replace(t,[e],e)}prune(t){let e=new Set(t.map(n=>n.id));for(let n of this.ids)e.has(n)||this.ids.delete(n);this.ids.has(this.active)||(this.active=[...this.ids].at(-1)??null)}indices(t){return this.prune(t),t.flatMap((e,n)=>this.ids.has(e.id)?[n]:[])}primary(t){this.prune(t);let e=t.findIndex(n=>n.id===this.active);return e<0?null:e}};function Vs(s){return s.length?zs.map(([t,e],n)=>[Math.max(...s.map(i=>Math.min(t,i[n])-i[n])),Math.min(...s.map(i=>Math.max(e,i[n])-i[n]))]):[[0,0],[0,0],[0,0]]}var An=class extends Ei{constructor(t,e,n,i="plane",r=0){let o=t[r],a=Vs(t);super(o,e,n,i,a.map(([c,l],h)=>[o[h]+c,o[h]+l])),this.original=t.map(c=>[...c]),this.pivot=[...o]}update(...t){let e=super.update(...t);return this.original.map(n=>n.map((i,r)=>i+(e[r]-this.pivot[r])))}};function Hs(s,t,e,n=!1){let i=t.map(a=>s[a]),r=Vs(i.map(a=>a.position)),o=[.45,0,0].map((a,c)=>W(a,...r[c]));return o[0]<.1&&(o=[-.45,0,0].map((a,c)=>W(a,...r[c]))),Math.abs(o[0])<.1&&(o=[0,0,.45].map((a,c)=>W(a,...r[c]))),i.map(a=>{if(n)return Yc(a,e());let c=structuredClone(a);return c.id=e(),c.position=c.position.map((l,h)=>l+o[h]),c})}function Gs(s,t){if(!t.length)return null;let e=t.map(r=>Bs(s[r])),n=[0,1,2].map(r=>Math.min(...e.map(o=>o[0][r]))),i=[0,1,2].map(r=>Math.max(...e.map(o=>o[1][r])));return{center:n.map((r,o)=>(r+i[o])/2),radius:Math.hypot(...n.map((r,o)=>(i[o]-r)/2))}}var m=s=>document.querySelector(s),Dt=s=>[...document.querySelectorAll(s)],Ii="waterfalls-lab:v2:autosave",Ys="waterfalls-lab:v2:library",Ws,Cn,Ti=!1;function U(s){m("#toast").textContent=s,m("#toast").classList.add("show"),clearTimeout(Ws),Ws=setTimeout(()=>m("#toast").classList.remove("show"),2800)}var f=new Sn(m("#world"),(s,t)=>{t?(m("#loading").style.display="flex",m("#loading-text").textContent=s,m("#loading").querySelector("small").textContent="\u8BF7\u91CD\u65B0\u52A0\u8F7D\uFF0C\u6216\u4F7F\u7528\u652F\u6301 WebGPU \u7684\u6D4F\u89C8\u5668\u3002",document.body.dataset.status="error"):U(s)}),z="orbit",de=[],Rn=[],C=null,et=null,V=null,Tt=.85,Q="\u6211\u7684\u5C71\u8C37",fe=null,D=0,Ai=.65,Li=!1,Ln=!1,Jt=null,gt=null,Mt=new Map,Dn=!1,De=null,nt=null,Xs="orbit",At=new Ce,qs=new B,Pn=new v,Zc=new En,it=new Tn,Ue=null;try{let s=localStorage.getItem(Ii);s&&(Ue=Le(s),f.state=Ue.scene,Q=Ue.name)}catch{}function me(){return f.cameraState()}function Un(){let s=f.state.cameraViews||[],t=m("#camera-view-select"),e=JSON.stringify(s.map(n=>n.name));t.dataset.signature!==e&&(t.dataset.signature=e,t.replaceChildren(new Option(s.length?"\u9009\u62E9\u6536\u85CF\u955C\u5934":"\u8FD8\u6CA1\u6709\u6536\u85CF\u955C\u5934",""),...s.map((n,i)=>new Option(i+1+" \xB7 "+n.name,String(i))))),nt!==null&&nt>=s.length&&(nt=null),t.value=nt===null?"":String(nt),m("#camera-view-count").textContent=s.length+" / "+8,m("#camera-view-update").disabled=nt===null,m("#camera-view-remove").disabled=nt===null}function jt(){nt=null,m("#camera-view-name").value=""}function Zs(){if(!(!f.camera||!Ti)){clearTimeout(Cn),Cn=null;try{localStorage.setItem(Ii,vn(f.state,me(),Q)),Ti=!1,m("#autosave-state").textContent="\u5DF2\u81EA\u52A8\u4FDD\u5B58",document.body.dataset.saved="yes"}catch{m("#autosave-state").textContent="\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u5BFC\u51FA\u4F5C\u54C1\u6587\u4EF6",document.body.dataset.saved="failed",U("\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u5BFC\u51FA\u4F5C\u54C1\u6587\u4EF6")}}}function O(){f.camera&&(Ti=!0,document.body.dataset.saved="pending",m("#autosave-state").textContent="\u6B63\u5728\u4FDD\u5B58\u2026",m("#work-download").hidden=!0,clearTimeout(Cn),Cn=setTimeout(Zs,650))}function Js(){document.body.dataset.status==="ready"&&(clearTimeout(gt),gt=null,Mt.clear(),C&&G(),O(),Zs())}function js(s){de.push(s),de.length>60&&de.shift(),Rn=[],$s()}function X(s=!1){js(wi(f.state,Q,me(),s===!0))}function Ks(){js({kind:"camera",views:structuredClone(f.state.cameraViews||[])})}function $s(){m("#undo").disabled=!de.length,m("#redo").disabled=!Rn.length}function Nn(){document.body.dataset.objects=JSON.stringify(f.state.objects),document.body.dataset.edits=String(f.state.edits.length),document.body.dataset.source=JSON.stringify(f.state.source);let s=Z(f.state);document.body.dataset.sources=JSON.stringify(s),m("#scene-count").textContent=f.state.objects.length+" \u4EF6\u9020\u666F \xB7 "+f.state.edits.length+" \u6B21\u5730\u5F62\u7F16\u8F91 \xB7 "+s.length+" \u5904\u6C34\u6E90";let t=m("#object-select"),e=f.state.objects.map(i=>i.id).join("|");t.dataset.signature!==e&&(t.dataset.signature=e,t.replaceChildren(new Option(f.state.objects.length?"\u9009\u62E9\u5DF2\u6709\u9020\u666F":"\u8FD8\u6CA1\u6709\u9020\u666F","")),f.state.objects.forEach((i,r)=>t.append(new Option((i.type==="rock"?"\u5CA9\u77F3":"\u5730\u5F62")+" "+(r+1),String(r))))),t.value=V===null?"":String(V);let n=m("#source-select");n.options.length!==s.length&&n.replaceChildren(...s.map((i,r)=>new Option("\u6C34\u6E90 "+(r+1),String(r)))),D=Math.min(D,s.length-1),n.value=String(D)}function St(s=!1,t=[]){s?f.updateTerrain():(f.updateObjects(t),f.rebuildWorld()),Nn(),Fn(),O()}function _t(){for(let s of["flow","speed","gravity","viscosity","exposure"])m("#"+s).value=f.state[s],m("#"+s+"-value").textContent=s==="flow"?Math.round(f.state[s]*100)+"%":s==="speed"?f.state[s].toFixed(2)+"\xD7":s==="viscosity"?f.state[s].toFixed(3):f.state[s].toFixed(1);if(m("#surface-smoothing").value=String(f.state.surfaceSmoothing??1),m("#quality").value=f.state.quality,m("#mode").value=f.state.mode,m("#work-name").value=Q,m("#water-style").value=String(f.state.waterStyle||0),m("#foam").value=f.state.foam??.65,m("#foam-value").textContent=Math.round((f.state.foam??.65)*100)+"%",pe(),Dt("[data-preset]").forEach(s=>s.classList.toggle("active",+s.dataset.preset===f.state.preset)),Dt("[data-light]").forEach(s=>s.classList.toggle("active",+s.dataset.light===f.state.sun)),m(".scene-label>span").textContent=["\u82D4\u8C37 / MOSS CANYON","\u79CB\u6797 / AMBER FOREST","\u6EAA\u9636 / RIVER STEPS"][f.state.preset],Un(),m("#pause").textContent=f.state.paused?"\u25B7 \u7EE7\u7EED\u6C34\u6D41":"\u2161 \u6682\u505C\u6C34\u6D41",m("#pause").setAttribute("aria-pressed",String(f.state.paused)),f.camera){let s={wide:[14,12,23],close:[7.5,7.5,11],top:[.2,24,5],side:[18,8,1]};Dt("[data-view]").forEach(t=>t.classList.toggle("active",f.camera.position.distanceTo(new v(...s[t.dataset.view]))<.2))}Nn(),pe(),Fn(),$s()}function Fn(){let s=it.indices(f.state.objects);V=it.primary(f.state.objects);let t=V===null?null:f.state.objects[V];document.body.dataset.selection=JSON.stringify(s),m("#object-select").value=t?String(V):"",m("#object-controls").hidden=!t,m("#object-properties").hidden=s.length>1,m("#select-all").disabled=!f.state.objects.length,m("#selection-clear").disabled=!s.length,m("#selected-status").textContent=s.length>1?s.length+" \u4EF6\u9020\u666F \xB7 \u4E00\u8D77\u79FB\u52A8\u6216\u6279\u91CF\u64CD\u4F5C":t?(t.type==="rock"?"\u5CA9\u77F3":"\u5730\u5F62")+" \xB7 \u5DF2\u9009\u53D6":"\u70B9\u51FB\u9009\u53D6\u4E00\u4EF6\u9020\u666F",t&&(["x","y","z"].forEach((e,n)=>{m("#obj-"+e).value=t.scale[n],m("#obj-"+e+"-value").textContent=t.scale[n].toFixed(2),m("#object-pos-"+e).value=t.position[n].toFixed(2)}),m("#obj-height").value=t.position[1],m("#obj-rotation").value=(t.rotation||0)*180/Math.PI)}function Ne(){it.clear(),V=null,f.selection=null}function Di(){V=it.primary(f.state.objects),f.selection=it.indices(f.state.objects),f.rebuildWorld(),Fn()}function ot(s,t=!1){it.choose(f.state.objects,s,t),Di()}function Qs(s,t=s.at(-1)){it.replace(f.state.objects,s,t),Di()}function Jc(s){return Ui(s),Zc.pick(f.state.objects,At.ray.origin.toArray(),At.ray.direction.toArray(),f.terrainField)?.index??null}function Ui(s){let t=f.canvas.getBoundingClientRect();qs.set((s.clientX-t.left)/t.width*2-1,-(s.clientY-t.top)/t.height*2+1),At.setFromCamera(qs,f.camera)}function On(s,t=null){if(Ui(s),t!==null){let n=At.ray.intersectPlane(new It(new v(0,1,0),-t),Pn);return n?{point:n.toArray(),normal:[0,1,0]}:null}let e=gn(f.terrainField,At.ray.origin.toArray(),At.ray.direction.toArray());if(e)return e;if(["add","restore","spring","flatten"].includes(z)){let n=At.ray.intersectPlane(new It(new v(0,1,0),-.24),Pn);if(n&&Math.abs(n.x)<5.5&&Math.abs(n.z)<4.5)return{point:n.toArray(),normal:[0,1,0]}}return null}var jc={orbit:"\u62D6\u52A8\u65CB\u8F6C \xB7 \u53CC\u6307 / \u53F3\u952E\u5E73\u79FB \xB7 \u6EDA\u8F6E\u7F29\u653E",rock:"\u70B9\u51FB\u653E\u7F6E\u5CA9\u77F3 \xB7 \u5927\u5C0F\u53EF\u8C03 \xB7 \u653E\u7F6E\u540E\u53EF\u9009\u53D6\u7F16\u8F91",add:"\u6309\u4F4F\u62D6\u52A8\u5806\u7B51\u5730\u5F62 \xB7 \u65B0\u5730\u5F62\u4F1A\u6539\u53D8\u6C34\u8DEF",cut:"\u6309\u4F4F\u62D6\u52A8\u6316\u6398 \xB7 \u53EF\u6316\u7A7F\u5CA9\u58C1\u5F62\u6210\u6D1E\u53E3",restore:"\u6309\u4F4F\u62D6\u52A8\u6062\u590D\u539F\u6709\u5730\u5F62 \xB7 \u4E0D\u5F71\u54CD\u6446\u653E\u7269\u4F53",spring:"\u70B9\u51FB\u79FB\u52A8\u5F53\u524D\u6C34\u6E90 \xB7 \u65B0\u589E\u6C34\u6E90\u53EF\u5F62\u6210\u6C47\u6D41 \xB7 \u53F3\u952E\u65CB\u8F6C\u89C6\u89D2",smooth:"\u6309\u4F4F\u62D6\u52A8\u5E73\u6ED1\u8868\u9762 \xB7 \u4FDD\u7559\u6574\u4F53\u5730\u5F62 \xB7 \u53F3\u952E\u65CB\u8F6C\u89C6\u89D2",flatten:"\u6309\u4F4F\u62D6\u52A8\u524A\u5E73 \xB7 \u540C\u4E00\u6B21\u7B14\u753B\u4FDD\u6301\u76F8\u540C\u9AD8\u5EA6 \xB7 \u53F3\u952E\u65CB\u8F6C\u89C6\u89D2",move:"\u62D6\u52A8\u9009\u4E2D\u9020\u666F\u4E00\u8D77\u79FB\u52A8 \xB7 Ctrl \u70B9\u51FB\u591A\u9009 \xB7 Shift \u5347\u964D",erase:"\u70B9\u51FB\u79FB\u9664\u9020\u666F \xB7 \u6216\u9009\u53D6\u540E\u6309 Delete"};function at(s){C&&G(),Kt(!1),C=null,z=s,f.controls.enabled=!0,f.controls.mouseButtons.LEFT=s==="orbit"?st.ROTATE:-1,f.controls.mouseButtons.RIGHT=s==="orbit"?st.PAN:st.ROTATE,f.controls.mouseButtons.MIDDLE=st.PAN,f.controls.touches.ONE=s==="orbit"?yt.ROTATE:-1,f.controls.touches.TWO=yt.DOLLY_PAN,document.body.classList.toggle("editing",s!=="orbit"),Dt("[data-tool]").forEach(t=>{let e=t.dataset.tool===s||t.dataset.tool==="cut"&&["smooth","flatten","restore"].includes(s);t.classList.toggle("active",e),t.setAttribute("aria-pressed",String(e))}),m("#hint").textContent=jc[s],m("#edit-title").textContent={rock:"\u653E\u4E0B\u77F3\u5934",add:"\u5806\u7B51\u5730\u5F62",cut:"\u6316\u51FA\u6C34\u8DEF",restore:"\u6062\u590D\u5730\u5F62",spring:"\u7F16\u6392\u6C34\u6D41",smooth:"\u67D4\u5316\u5730\u5F62",flatten:"\u524A\u51FA\u5E73\u9762",move:"\u7F16\u8F91\u9020\u666F",erase:"\u79FB\u9664\u9020\u666F",orbit:"\u81EA\u7531\u9020\u666F"}[s],m("#brush-settings").hidden=["move","erase","spring"].includes(s),m("#restore-brush").hidden=!["add","cut","smooth","flatten","restore"].includes(s),m("#sculpt-settings").hidden=s==="rock",m("#brush-mode").hidden=s==="rock",s!=="rock"&&(m("#brush-mode").value=s),m("#brush-strength-setting").hidden=!["smooth","flatten"].includes(s),m("#selection-editor").hidden=!["rock","move","erase"].includes(s),m("#spring-settings").hidden=s!=="spring",m("#brush-cursor").hidden=!0,m("#brush-preview").hidden=!0,f.canvas.style.cursor=s==="orbit"?"grab":s==="move"?"move":"crosshair"}function Ni(s){if(!s.length)return;let t=Os(s,{op:z,radius:Tt,strength:Ai,mirror:Li,level:C?.level});if(f.state.edits.length+t.length>vt.edits){U("\u5DF2\u8FBE\u5230\u4F5C\u54C1\u6587\u4EF6\u7684\u5730\u5F62\u8BB0\u5F55\u5BB9\u91CF\uFF0C\u8BF7\u4FDD\u5B58\u6B64\u4F5C\u54C1\u540E\u5F00\u59CB\u65B0\u7684\u9020\u666F\u3002");return}f.state.edits.push(...t),St(!0)}function Fi(s,t){m("#brush-cursor").hidden=!0;let e=m("#brush-preview");if(!t||!["rock","add","cut","restore","smooth","flatten"].includes(z)){e.hidden=!0;return}let n=(i,r)=>{let o=new v(...i),a=new v(...r),c=Math.abs(a.y)>.9?new v(1,0,0):new v(0,1,0),l=new v().crossVectors(a,c).normalize(),h=new v().crossVectors(a,l),d="";for(let u=0;u<=48;u++){let p=u/48*Math.PI*2,g=o.clone().addScaledVector(l,Math.cos(p)*Tt).addScaledVector(h,Math.sin(p)*Tt).addScaledVector(a,.025).project(f.camera);if(g.z<0||g.z>1)return"";d+=(u?"L":"M")+((g.x*.5+.5)*f.canvas.clientWidth).toFixed(1)+","+((-g.y*.5+.5)*f.canvas.clientHeight).toFixed(1)}return d+"Z"};e.hidden=!1,m("#brush-ring").setAttribute("d",n(t.point,t.normal)),m("#brush-mirror-ring").setAttribute("d",Li?n([-t.point[0],t.point[1],t.point[2]],[-t.normal[0],t.normal[1],t.normal[2]]):"")}function Ci(s){if(!f.device||z==="orbit"||s.pointerType!=="touch"&&s.button!==0||s.altKey)return;if(z==="move"||z==="erase"){let e=Jc(s),n=s.ctrlKey||s.metaKey||m("#selection-additive").checked;if(z==="move"&&n&&(e===null||!it.ids.has(f.state.objects[e].id))){ot(e,!0);return}if(e!==null&&z==="move"&&it.ids.has(f.state.objects[e].id)?(it.active=f.state.objects[e].id,Di()):ot(e),e===null){U("\u70B9\u51FB\u53EF\u89C1\u9020\u666F\uFF0C\u6216\u4ECE\u201C\u5DF2\u6709\u9020\u666F\u201D\u83DC\u5355\u9009\u53D6\u3002");return}if(z==="erase"){X(),f.state.objects.splice(e,1),ot(null),St();return}let i=it.indices(f.state.objects),r=f.state.objects[e],o=s.shiftKey?"y":m("#move-axis").value,a=Math.abs(At.ray.direction.y)>.08?new v(0,1,0):f.camera.getWorldDirection(new v),c=new It().setFromNormalAndCoplanarPoint(a,new v(...r.position));C={kind:"move",index:e,indices:i,plane:c,toggleOnClick:n,startPointer:[s.clientX,s.clientY],moved:!1,drag:new An(i.map(l=>f.state.objects[l].position),At.ray.intersectPlane(c,Pn)?.toArray(),s.clientY,o,i.indexOf(e)),changed:!1,dirty:!1,timer:null,lastTime:0},s.type!=="pointerup"&&f.canvas.setPointerCapture(s.pointerId);return}let t=On(s);if(t){if(z==="rock"&&f.state.objects.length>=vt.objects){U("\u4F5C\u54C1\u6700\u591A\u4FDD\u5B58 2,000 \u4EF6\u9020\u666F\uFF0C\u8BF7\u4FDD\u5B58\u5F53\u524D\u4F5C\u54C1\u540E\u5F00\u59CB\u65B0\u7684\u9020\u666F\u3002");return}if(z==="spring"&&Dn){let e=Ns(Z(f.state)[D],t.point,f.state.gravity);if(!e){U("\u5F53\u524D\u901F\u5EA6\u65E0\u6CD5\u5230\u8FBE\u8FD9\u91CC\uFF0C\u8BF7\u589E\u5927\u55B7\u5C04\u901F\u5EA6\u6216\u9009\u62E9\u66F4\u8FD1\u7684\u843D\u70B9\u3002");return}X(),Lt(f.state,D,e),Kt(!1),Ut(),U("\u55B7\u5C04\u65B9\u5411\u5DF2\u8C03\u6574\uFF0C\u8F68\u8FF9\u663E\u793A\u9884\u8BA1\u9996\u6B21\u89E6\u5730\u4F4D\u7F6E\u3002");return}if(X(),z==="spring"){Lt(f.state,D,{position:t.point.map((e,n)=>W(e+t.normal[n]*.55+(n===1?.2:0),n===0?-5.3:n===1?.3:-4.6,n===0?5.3:n===1?12.4:4.6))}),Ut(),U("\u6C34\u6E90\u5DF2\u79FB\u52A8\uFF0C\u6C34\u6D41\u6B63\u5728\u5BFB\u627E\u65B0\u7684\u8DEF\u5F84\u3002");return}if(z==="rock"){let e=[Tt,Tt*.82,Tt*.9].map(n=>Math.round(n*100)/100);f.state.objects.push({id:crypto.randomUUID(),type:"rock",position:[t.point[0],t.point[1]+e[1]*.5,t.point[2]],scale:e,rotation:0}),ot(f.state.objects.length-1),St();return}C={kind:"sculpt",stroke:new wn(t,Tt),pending:[],lastTime:performance.now(),level:t.point[1]},s.type!=="pointerup"&&f.canvas.setPointerCapture(s.pointerId),Ni([t])}}function Ri(s){clearTimeout(s.timer),s.timer=null,s.dirty&&(s.dirty=!1,s.lastTime=performance.now(),St(!1,s.indices))}function tr(s){let t=C,e=f.state.objects[t.index];if(!e)return;t.moved||=Math.hypot(s.clientX-t.startPointer[0],s.clientY-t.startPointer[1])>4;let n=s.shiftKey?"y":m("#move-axis").value;n!==t.drag.axis&&t.plane.setFromNormalAndCoplanarPoint(t.plane.normal,new v(...e.position)),Ui(s);let i=n==="y"?null:At.ray.intersectPlane(t.plane,Pn)?.toArray(),r=t.drag.update(i,s.clientY,n,+m("#move-snap").value);if(r.every((a,c)=>a.every((l,h)=>Math.abs(l-f.state.objects[t.indices[c]].position[h])<1e-8)))return;t.changed||(X(),t.changed=!0),t.indices.forEach((a,c)=>f.state.objects[a].position=r[c]),t.dirty=!0;let o=32-(performance.now()-t.lastTime);o<=0?Ri(t):t.timer===null&&(t.timer=setTimeout(()=>{C===t&&Ri(t)},o))}m("#world").addEventListener("pointerdown",s=>{if(Jt=s,s.pointerType==="touch"){if(Mt.set(s.pointerId,s),Mt.size>1){clearTimeout(gt),gt=null,G();return}clearTimeout(gt),gt=setTimeout(()=>{gt=null,Mt.size===1&&Ci(Mt.values().next().value)},120)}else Ci(s)});m("#world").addEventListener("pointermove",s=>{if(Jt=s,s.pointerType==="touch"&&Mt.has(s.pointerId)&&Mt.set(s.pointerId,s),!f.device||z==="orbit"||Ln||Mt.size>1)return;let t=On(s);if(fe=t,Fi(s,t),!C)return;if(C.kind==="move"){tr(s);return}if(C.pending.push(...C.stroke.sample(t)),performance.now()-C.lastTime<45&&C.pending.length<64)return;let e=C.pending;C.pending=[],C.lastTime=performance.now(),Ni(e)});function G(s=null){C?.kind==="move"&&(s&&tr(s),Ri(C),s?.type==="pointerup"&&C.toggleOnClick&&!C.changed&&!C.moved&&ot(C.index,!0),Fn()),C?.kind==="sculpt"&&(s&&C.pending.push(...C.stroke.sample(On(s))),Ni(C.pending)),C=null,O()}m("#world").addEventListener("pointerup",s=>{s.pointerType==="touch"&&(gt&&Mt.size===1&&(clearTimeout(gt),gt=null,Ci(s)),Mt.delete(s.pointerId)),G(s)});m("#world").addEventListener("pointercancel",s=>{clearTimeout(gt),gt=null,Mt.delete(s.pointerId),G()});m("#world").addEventListener("pointerleave",()=>{m("#brush-cursor").hidden=!0,m("#brush-preview").hidden=!0});Dt("[data-tool]").forEach(s=>s.addEventListener("click",()=>at(s.dataset.tool)));function Oi(s=!1){C&&G();let t=s?Rn:de,e=s?de:Rn;if(!t.length)return;let n=t.pop();if(n.kind==="camera"){e.push({kind:"camera",views:structuredClone(f.state.cameraViews||[])}),f.state.cameraViews=n.views,jt(),_t(),O(),U(s?"\u5DF2\u91CD\u505A\u955C\u5934\u7F16\u8F91\u3002":"\u5DF2\u64A4\u9500\u955C\u5934\u7F16\u8F91\u3002");return}e.push(wi(f.state,Q,me(),n.full)),Object.assign(f.state,n.scene),Q=n.name,Ne(),Kt(!1),n.full?(D=0,jt(),f.reset(),f.resize(),f.restoreCamera(n.camera),ot(null),Nn(),O()):(ot(null),St(!0)),_t(),U(s?"\u5DF2\u91CD\u505A\u9020\u666F\u3002":"\u5DF2\u64A4\u9500\u9020\u666F\u3002")}m("#undo").addEventListener("click",()=>Oi());m("#redo").addEventListener("click",()=>Oi(!0));m("#brush-mode").addEventListener("change",s=>at(s.target.value));m("#brush-mirror").addEventListener("change",s=>{Li=s.target.checked,Jt&&Fi(Jt,fe)});m("#brush-strength").addEventListener("input",s=>{Ai=+s.target.value,m("#brush-strength-value").textContent=Math.round(Ai*100)+"%"});m("#brush-size").addEventListener("input",s=>{Tt=+s.target.value,m("#brush-value").textContent=Tt.toFixed(2)+" m"});m("#restore-brush").addEventListener("click",()=>at("restore"));function Bi(s){s.addEventListener("pointerdown",X),s.addEventListener("keydown",t=>{!t.repeat&&!t.ctrlKey&&!t.metaKey&&["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Home","End","PageUp","PageDown"].includes(t.key)&&X()})}for(let[s,t]of["x","y","z"].entries()){let e=m("#obj-"+t);Bi(e),e.addEventListener("input",()=>{V!==null&&(f.state.objects[V].scale[s]=+e.value,m("#obj-"+t+"-value").textContent=(+e.value).toFixed(2),St(!1,[V]))})}for(let[s,t]of[["height","height"],["rotation","rotation"]]){let e=m("#obj-"+s);Bi(e),e.addEventListener("input",()=>{if(V===null)return;let n=f.state.objects[V];t==="height"?n.position[1]=+e.value:n.rotation=+e.value*Math.PI/180,St(!1,[V])})}m("#snap-ground").addEventListener("click",()=>{if(V===null)return;C&&G(),X();let s=it.indices(f.state.objects);for(let t of s){let e=f.state.objects[t];e.position[1]=W(ys(f.terrainField,e.position[0],e.position[2])+e.scale[1]*.5,.12,12.4)}St(!1,s)});function er(s=!1){if(V===null)return;C&&G();let t=it.indices(f.state.objects);if(f.state.objects.length+t.length>vt.objects){U("\u8FD9\u7EC4\u526F\u672C\u8D85\u8FC7\u4F5C\u54C1\u7684 2,000 \u4EF6\u5BB9\u91CF\uFF0C\u53EF\u51CF\u5C11\u9009\u62E9\u540E\u518D\u590D\u5236\u3002");return}X();let e=t.indexOf(V),n=f.state.objects.length,i=Hs(f.state.objects,t,()=>crypto.randomUUID(),s);f.state.objects.push(...i),Qs(i.map((r,o)=>n+o),n+e),St(),s&&U("\u955C\u50CF\u9020\u666F\u5DF2\u653E\u5728\u5C71\u8C37\u53E6\u4E00\u4FA7\uFF0C\u53EF\u7EE7\u7EED\u79FB\u52A8\u3002")}m("#clone-object").addEventListener("click",()=>er());m("#mirror-object").addEventListener("click",()=>er(!0));function nr(){V!==null&&(C&&G(),X(),f.state.objects=f.state.objects.filter(s=>!it.ids.has(s.id)),ot(null),St())}m("#delete-object").addEventListener("click",nr);m("#object-select").addEventListener("change",s=>{C&&G(),ot(s.target.value===""?null:+s.target.value,m("#selection-additive").checked)});m("#select-all").addEventListener("click",()=>{C&&G(),Qs(f.state.objects.map((s,t)=>t))});m("#selection-clear").addEventListener("click",()=>{C&&G(),ot(null)});function pe(){let s=Z(f.state)[D];if(s){m("#source-select").value=String(D),m("#source-delete").disabled=Z(f.state).length===1,m("#spring-enabled").checked=s.enabled,m("#spring-height").value=s.position[1],m("#spring-height-value").textContent=s.position[1].toFixed(2)+" m";for(let t of["radius","power","yaw","pitch","speed"])m("#spring-"+t).value=s[t],m("#spring-"+t+"-value").textContent=t==="power"?Math.round(s[t]*100)+"%":["yaw","pitch"].includes(t)?Math.round(s[t])+"\xB0":s[t].toFixed(2)+(t==="speed"?" m/s":" m");["x","y","z"].forEach((t,e)=>m("#source-pos-"+t).value=s.position[e].toFixed(2))}}function Ut(){f.updateSources(),Nn(),pe(),O()}function Kt(s){Dn=s,m("#source-aim").setAttribute("aria-pressed",String(s)),m("#source-aim").textContent=s?"\u53D6\u6D88\u7784\u51C6":"\u7784\u51C6\u843D\u70B9",z==="spring"&&(m("#hint").textContent=s?"\u70B9\u51FB\u5730\u5F62\u9009\u62E9\u843D\u70B9 \xB7 \u53F3\u952E\u65CB\u8F6C\u89C6\u89D2 \xB7 Esc \u53D6\u6D88":"\u70B9\u51FB\u79FB\u52A8\u5F53\u524D\u6C34\u6E90 \xB7 \u65B0\u589E\u6C34\u6E90\u53EF\u5F62\u6210\u6C47\u6D41 \xB7 \u53F3\u952E\u65CB\u8F6C\u89C6\u89D2")}m("#source-aim").addEventListener("click",()=>Kt(!Dn));m("#source-select").addEventListener("change",s=>{Kt(!1),D=+s.target.value,pe()});m("#source-add").addEventListener("click",()=>{if(Z(f.state).length>=vt.sources){U("\u5DF2\u8FBE\u5230\u4F5C\u54C1\u6587\u4EF6\u7684 256 \u5904\u6C34\u6E90\u5BB9\u91CF\u3002");return}X();let s=structuredClone(Z(f.state)[D]);s.position[0]=W(s.position[0]+.9,-5.3,5.3),s.enabled=!0,f.state.extraSources.push(s),D=f.state.extraSources.length,Ut(),U("\u65B0\u589E\u6C34\u6E90\uFF0C\u53EF\u70B9\u51FB\u5730\u5F62\u4E3A\u5B83\u9009\u62E9\u51FA\u6C34\u4F4D\u7F6E\u3002")});m("#source-mirror").addEventListener("click",()=>{if(Z(f.state).length>=vt.sources){U("\u5DF2\u8FBE\u5230\u4F5C\u54C1\u6587\u4EF6\u7684 256 \u5904\u6C34\u6E90\u5BB9\u91CF\u3002");return}X(),Kt(!1),f.state.extraSources.push(ks(Z(f.state)[D])),D=f.state.extraSources.length,Ut(),U("\u955C\u50CF\u6C34\u6E90\u5DF2\u521B\u5EFA\uFF0C\u4F4D\u7F6E\u4E0E\u6C34\u5E73\u6D41\u5411\u5DE6\u53F3\u5BF9\u79F0\u3002")});m("#source-delete").addEventListener("click",()=>{if(Z(f.state).length!==1){if(X(),D===0){let s=f.state.extraSources.shift();Lt(f.state,0,s)}else f.state.extraSources.splice(D-1,1);D=0,Ut()}});m("#spring-enabled").addEventListener("change",s=>{X(),Lt(f.state,D,{enabled:s.target.checked}),Ut()});for(let s of["height","radius","power","yaw","pitch","speed"]){let t=m("#spring-"+s);Bi(t),t.addEventListener("input",()=>{if(s==="height"){let e=[...Z(f.state)[D].position];e[1]=+t.value,Lt(f.state,D,{position:e})}else Lt(f.state,D,{[s]:+t.value});Ut()})}m("#spring-reset").addEventListener("click",()=>{X(),Lt(f.state,D,{...mt,position:[...he]}),Ut()});for(let s of["object","source"])["x","y","z"].forEach((t,e)=>{let n=m("#"+s+"-pos-"+t);n.addEventListener("change",()=>{let i=n.valueAsNumber;if(!Number.isFinite(i)){s==="object"?ot(V):pe();return}if(s==="object"&&V===null)return;X();let r=[...s==="source"?Z(f.state)[D].position:f.state.objects[V].position];r[e]=W(i,+n.min,+n.max),s==="source"?(Lt(f.state,D,{position:r}),Ut()):(f.state.objects[V].position=r,ot(V),St(!1,[V]))})});function zi(){if(z==="spring"){let s=Z(f.state)[D];f.focusAt(s.position,s.radius)}else if(V!==null){let s=Gs(f.state.objects,it.indices(f.state.objects));f.focusAt(s.center,s.radius)}else if(fe)f.focusAt(fe.point,Tt);else{U("\u9009\u53D6\u4E00\u4EF6\u9020\u666F\u6216\u6C34\u6E90\u540E\u5373\u53EF\u805A\u7126\u3002");return}O()}m("#focus-object").addEventListener("click",zi);m("#source-focus").addEventListener("click",zi);m("#surface-smoothing").addEventListener("change",s=>{f.state.surfaceSmoothing=+s.target.value,O()});m("#water-style").addEventListener("change",s=>{f.state.waterStyle=+s.target.value,O()});m("#foam").addEventListener("input",s=>{f.state.foam=+s.target.value,m("#foam-value").textContent=Math.round(f.state.foam*100)+"%",O()});for(let s of["flow","speed","gravity","viscosity","exposure"])m("#"+s).addEventListener("input",t=>{f.state[s]=+t.target.value,_t(),O()});Dt("[data-light]").forEach(s=>s.addEventListener("click",()=>{f.state.sun=+s.dataset.light,f.shadowDirty=!0,_t(),O()}));Dt("[data-view]").forEach(s=>s.addEventListener("click",()=>{f.setView(s.dataset.view),Dt("[data-view]").forEach(t=>t.classList.toggle("active",t===s)),O()}));m("#camera-view-select").addEventListener("change",()=>{let s=m("#camera-view-select").value;nt=s===""?null:Number(s);let t=f.state.cameraViews?.[nt];t?(f.restoreCamera(t.camera),m("#camera-view-name").value=t.name,_t(),O()):(jt(),Un())});function ir(s=!1){if(!(s&&nt===null)){C&&G();try{let t=bs(f.state.cameraViews||[],me(),m("#camera-view-name").value,s?nt:null);Ks(),f.state.cameraViews=t.views,nt=t.index,m("#camera-view-name").value=t.views[t.index].name,Un(),O(),U(s?"\u955C\u5934\u5DF2\u66F4\u65B0\uFF0C\u53EF\u64A4\u9500\u6062\u590D\u3002":"\u5F53\u524D\u955C\u5934\u5DF2\u6536\u85CF\uFF0C\u4F1A\u968F\u4F5C\u54C1\u4E00\u8D77\u4FDD\u5B58\u3002")}catch(t){U(t.message)}}}m("#camera-view-add").addEventListener("click",()=>ir());m("#camera-view-update").addEventListener("click",()=>ir(!0));m("#camera-view-remove").addEventListener("click",()=>{nt!==null&&(Ks(),f.state.cameraViews=ws(f.state.cameraViews||[],nt),jt(),Un(),O(),U("\u955C\u5934\u5DF2\u79FB\u9664\uFF0C\u53EF\u64A4\u9500\u6062\u590D\u3002"))});function In(s){s!==document.body.classList.contains("clean")&&(s?(Xs=z,at("orbit"),document.body.classList.add("clean")):(document.body.classList.remove("clean"),at(Xs)),m("#immersive-exit").hidden=!s,m("#immersive-toggle").setAttribute("aria-pressed",String(s)),m(s?"#immersive-exit":"#immersive-toggle").focus())}m("#immersive-toggle").addEventListener("click",()=>In(!0));m("#immersive-exit").addEventListener("click",()=>In(!1));function sr(){C&&G(),X(!0),f.state.objects=[],f.state.edits=[],f.state.source=[...he],f.state.sourceConfig={...mt},f.state.extraSources=[],D=0,Ne(),f.reset(),ot(null),_t(),O(),U("\u98CE\u666F\u5DF2\u91CD\u7F6E\uFF0C\u53EF\u64A4\u9500\u6062\u590D\u3002")}m("#reset").addEventListener("click",sr);Dt("[data-preset]").forEach(s=>s.addEventListener("click",()=>{C&&G(),X(!0),f.state.preset=+s.dataset.preset,f.state.season=f.state.preset===1?"autumn":"summer",f.state.objects=[],f.state.edits=[],f.state.source=[...he],f.state.sourceConfig={...mt},f.state.extraSources=[],D=0,ot(null),f.reset(),_t(),O()}));m("#quality").addEventListener("change",s=>{C&&G(),f.state.quality=s.target.value,f.reset(),f.resize(),O(),U("\u753B\u8D28\u5DF2\u66F4\u65B0\uFF0C\u9020\u666F\u4ECD\u7136\u4FDD\u7559\u3002")});function Pi(){f.state.paused=!f.state.paused,_t(),O()}m("#pause").addEventListener("click",Pi);m("#panel-toggle").addEventListener("click",()=>{let s=m("#panel-body").hidden;m("#panel-body").hidden=!s,m("#panel-toggle").textContent=s?"\u2212":"+",m("#panel-toggle").setAttribute("aria-expanded",String(s)),m("#panel-toggle").setAttribute("aria-label",s?"\u6536\u8D77\u98CE\u666F\u63A7\u5236":"\u5C55\u5F00\u98CE\u666F\u63A7\u5236")});m("#edit-dock-toggle").addEventListener("click",()=>{let s=m("#edit-dock").classList.toggle("dock-collapsed");m("#edit-dock-toggle").setAttribute("aria-expanded",String(!s)),m("#edit-dock-toggle").setAttribute("aria-label",s?"\u5C55\u5F00\u7F16\u8F91\u9762\u677F":"\u6536\u8D77\u7F16\u8F91\u9762\u677F"),m("#edit-dock-toggle").textContent=s?"+":"\u2212"});m("#about-open").addEventListener("click",()=>m("#about").showModal());m("#about-close").addEventListener("click",()=>m("#about").close());m("#mode").addEventListener("change",s=>{f.state.mode=+s.target.value,O()});m("#inspect").addEventListener("click",async()=>{let s=m("#inspection");s.textContent="\u6B63\u5728\u8BFB\u53D6\u5F53\u524D\u6A21\u62DF\u72B6\u6001\u2026";try{let t=await f.readParticles(),e=0,n=0,i=1/0,r=0,o=0,a=0;for(let l=0;l<t.length;l+=20){if(t[l+3]<0)continue;o++,[...t.subarray(l,l+20)].every(Number.isFinite)&&n++,t[l]>=1&&t[l]<A[0]&&t[l+1]>=0&&t[l+1]<A[1]&&t[l+2]>=1&&t[l+2]<A[2]&&e++;let h=[(t[l]-A[0]/2)*T,t[l+1]*T,(t[l+2]-A[2]/2)*T];pt(f.collisionField,h)<-.3&&a++,i=Math.min(i,t[l+3]),r=Math.max(r,t[l+3])}let c=o?i.toFixed(3)+"\u2013"+r.toFixed(3):"\u65E0\u6D3B\u8DC3\u6C34\u7C92\u5B50";s.textContent=`${o.toLocaleString()} \u6D3B\u8DC3\u7C92\u5B50\uFF1B\u6709\u9650\u503C ${n}/${o}\uFF1B\u8303\u56F4\u5185 ${e}/${o}\uFF1B\u56FA\u4F53\u5185 ${a}\uFF1B\u4F53\u79EF\u6BD4 ${c}\uFF1B\u7D2F\u8BA1 ${f.stats.steps} \u5B50\u6B65\u3002`,s.dataset.result=n===o&&e===o&&a===0?"pass":"fail",document.body.dataset.physics=s.dataset.result,s.dataset.penetration=String(a)}catch(t){s.textContent=t.message}});m("#capture").addEventListener("click",async()=>{try{if(f.worldReady!==f.worldVersion){U("\u5730\u5F62\u6B63\u5728\u91CD\u5EFA\uFF0C\u5B8C\u6210\u540E\u5373\u53EF\u4FDD\u5B58\u753B\u9762\u3002");return}let s=await f.screenshot(),t=new FileReader,e=await new Promise((n,i)=>{t.onload=()=>n(t.result),t.onerror=i,t.readAsDataURL(s)});m("#capture-preview").src=e,m("#capture-download").href=e,m("#capture-download").download="waterfalls-"+new Date().toISOString().replaceAll(":","-")+".png",m("#capture-dialog").showModal()}catch(s){U("\u4FDD\u5B58\u5931\u8D25\uFF1A"+s.message)}});m("#capture-close").addEventListener("click",()=>m("#capture-dialog").close());function rr(){try{let s=JSON.parse(localStorage.getItem(Ys)||"[]");return Array.isArray(s)?s:[]}catch{return[]}}function or(){let s=m("#work-list");s.replaceChildren();let t=rr();m("#work-empty").hidden=t.length>0;for(let e of t){let n=document.createElement("div");n.className="work-row";let i=document.createElement("button");i.className="load-work",i.textContent=e.name||"\u6211\u7684\u5C71\u8C37",i.addEventListener("click",()=>{try{ki(Le(e.text)),m("#works").close(),U("\u4F5C\u54C1\u5DF2\u6253\u5F00\u3002")}catch(o){U(o.message)}});let r=document.createElement("small");r.textContent=new Date(e.updated).toLocaleString("zh-CN"),n.append(i,r),s.append(n)}}function ki(s){C&&G(),X(!0),D=0,f.state=s.scene,Q=s.name,Ne(),jt(),f.reset(),f.resize(),f.restoreCamera(s.camera),_t(),at("orbit"),O()}m("#works-open").addEventListener("click",()=>{m("#work-name").value=Q,or(),m("#works").showModal()});m("#works-close").addEventListener("click",()=>m("#works").close());m("#save-work").addEventListener("click",()=>{Q=m("#work-name").value.trim().slice(0,80)||"\u6211\u7684\u5C71\u8C37";try{let s=rr(),t=vn(f.state,me(),Q),e=s.findIndex(i=>i.name===Q),n={name:Q,updated:Date.now(),text:t};e>=0?s[e]=n:s.unshift(n),localStorage.setItem(Ys,JSON.stringify(s)),O(),or(),m("#work-message").textContent="\u4F5C\u54C1\u5DF2\u4FDD\u5B58\u5230\u6B64\u6D4F\u89C8\u5668\u3002"}catch{m("#work-message").textContent="\u672C\u5730\u5B58\u50A8\u5DF2\u6EE1\uFF0C\u8BF7\u5BFC\u51FA\u4F5C\u54C1\u6587\u4EF6\u3002"}});m("#work-name").addEventListener("input",()=>m("#work-download").hidden=!0);m("#export-work").addEventListener("click",()=>{C&&G(),Q=m("#work-name").value.trim().slice(0,80)||"\u6211\u7684\u5C71\u8C37",O();let s=vn(f.state,me(),Q);m("#work-download").href="data:application/json;charset=utf-8,"+encodeURIComponent(s),m("#work-download").download="waterfalls-project.json",m("#work-download").hidden=!1,m("#work-message").textContent="\u4F5C\u54C1\u6587\u4EF6\u5DF2\u751F\u6210\u3002\u70B9\u51FB\u4E0B\u8F7D\u5373\u53EF\u5728\u53E6\u4E00\u53F0\u8BBE\u5907\u91CD\u65B0\u6253\u5F00\u3002"});m("#import-work").addEventListener("click",()=>m("#work-file").click());m("#work-file").addEventListener("change",async s=>{let t=s.target.files[0];if(t)try{if(t.size>vt.bytes)throw new Error("\u4F5C\u54C1\u6587\u4EF6\u8D85\u8FC7 5 MB\u3002");ki(Le(await t.text())),m("#works").close(),U("\u4F5C\u54C1\u6587\u4EF6\u5DF2\u6253\u5F00\u3002")}catch(e){m("#work-message").textContent=e.message}finally{s.target.value=""}});m("#restore-work").addEventListener("click",()=>{try{let s=localStorage.getItem(Ii);if(!s)throw new Error("\u8FD8\u6CA1\u6709\u81EA\u52A8\u4FDD\u5B58\u7684\u4F5C\u54C1\u3002");ki(Le(s)),m("#works").close(),U("\u5DF2\u6062\u590D\u6700\u8FD1\u7F16\u8F91\u3002")}catch(s){m("#work-message").textContent=s.message}});m("#tunnel-example").addEventListener("click",()=>{C&&G(),X(!0),f.state.preset=0,f.state.season="summer",f.state.cameraViews=[],jt(),f.state.objects=[],f.state.edits=[...[-2.6,-2.1,-1.6,-1.1,-.6,-.1].map(s=>({op:"cut",center:[0,1.85,s],radius:1.12})),...[5.7,4.7,3.7].map(s=>({op:"cut",center:[0,s,-2.2],radius:1.12}))],f.state.source=[0,2.5,-2.6],f.state.sourceConfig={...mt},f.state.extraSources=[],D=0,Ne(),f.reset(),f.setView("close"),Q="\u7A7F\u5C71\u6EAA\u6D41",_t(),at("orbit"),O(),m("#works").close(),U("\u7A7F\u5C71\u6EAA\u6D41\u5DF2\u6253\u5F00\uFF0C\u53EF\u7EE7\u7EED\u6316\u6398\u6216\u64A4\u9500\u6062\u590D\u539F\u573A\u666F\u3002")});m("#confluence-example").addEventListener("click",()=>{C&&G(),X(!0),f.state.preset=2,f.state.season="summer",f.state.cameraViews=[],jt(),f.state.objects=[],f.state.edits=[],f.state.source=[-1.75,10.35,-3.1],f.state.sourceConfig={...mt,radius:.32,yaw:20,pitch:-30,speed:2.8},f.state.extraSources=[{...mt,position:[1.75,10.35,-3.1],radius:.32,yaw:-20,pitch:-30,speed:2.8}],f.state.flow=1,D=0,Ne(),f.reset(),f.setView("wide"),Q="\u53CC\u7011\u6C47\u6D41",_t(),at("spring"),O(),m("#works").close(),U("\u53CC\u7011\u6C47\u6D41\u5DF2\u6253\u5F00\uFF0C\u53EF\u4EE5\u9010\u4E2A\u8C03\u6574\u6C34\u6E90\u6216\u64A4\u9500\u6062\u590D\u3002")});m("#sound").addEventListener("click",async()=>{if(et)et.on=!et.on,et.gain.gain.setTargetAtTime(et.on?.18:0,et.context.currentTime,.25);else{let s=new AudioContext,t=s.createBuffer(1,s.sampleRate*3,s.sampleRate),e=t.getChannelData(0),n=0;for(let a=0;a<e.length;a++)n=(n+Math.random()*.08-.04)/1.02,e[a]=n*5;let i=s.createBufferSource();i.buffer=t,i.loop=!0;let r=s.createBiquadFilter();r.type="lowpass",r.frequency.value=1700;let o=s.createGain();o.gain.value=.18,i.connect(r).connect(o).connect(s.destination),i.start(),et={context:s,gain:o,on:!0}}await et.context.resume(),m("#sound").setAttribute("aria-pressed",String(et.on)),m("#sound").classList.toggle("active",et.on),m("#sound span").textContent=et.on?"\u9759\u97F3":"\u6C34\u58F0"});document.addEventListener("keydown",s=>{if(m("dialog[open]")||!f.controls||s.target.matches("input,select,textarea")||s.target.isContentEditable)return;if(document.body.classList.contains("clean")){s.key==="Escape"||s.key.toLowerCase()==="h"?(s.preventDefault(),In(!1)):s.code==="Space"&&(s.preventDefault(),Pi());return}if((s.ctrlKey||s.metaKey)&&s.key.toLowerCase()==="z"){s.preventDefault(),Oi(s.shiftKey);return}if((s.ctrlKey||s.metaKey)&&s.key.toLowerCase()==="a"&&["rock","move","erase"].includes(z)){s.preventDefault(),m("#select-all").click();return}if((s.ctrlKey||s.metaKey)&&s.key.toLowerCase()==="d"){s.preventDefault(),C&&G(),z==="spring"?m("#source-add").click():V!==null&&m("#clone-object").click();return}if(s.key==="Alt"){C&&G(),Ln=!0,f.controls.mouseButtons.LEFT=st.ROTATE;return}if(s.key.toLowerCase()==="f"){zi();return}if(s.code==="Space"&&(s.preventDefault(),Pi()),s.key.toLowerCase()==="h"){In(!0);return}s.key==="Escape"&&(Dn?Kt(!1):at("orbit")),s.key.toLowerCase()==="r"&&sr(),(s.key==="Delete"||s.key==="Backspace")&&(s.preventDefault(),z==="spring"?m("#source-delete").click():nr());let t={v:"orbit",b:"add",x:"cut",g:"move",w:"spring"};t[s.key.toLowerCase()]&&at(t[s.key.toLowerCase()])});document.addEventListener("keyup",s=>{s.key==="Alt"&&(Ln=!1,at(z))});window.addEventListener("blur",()=>{Ln=!1,f.controls&&at(z)});window.addEventListener("pagehide",Js);document.addEventListener("visibilitychange",()=>{document.hidden&&Js(),et&&et.gain.gain.setTargetAtTime(document.hidden?0:et.on?.18:0,et.context.currentTime,.1)});function Kc(){let s=m("#jet-preview");if(s.hidden=z!=="spring"||!m("#show-jet-preview").checked,s.hidden||!f.collisionField)return;let t=Z(f.state)[D],e=JSON.stringify([t,f.state.gravity,f.state.flow]);if(De?.key!==e||De?.field!==f.collisionField||De?.revision!==f.collisionRevision){let a=Fs({...t,enabled:t.enabled&&f.state.flow>0},f.state.gravity,f.collisionField);De={key:e,field:f.collisionField,revision:f.collisionRevision,result:a};let c={off:"\u5F53\u524D\u6C34\u6E90\u672A\u51FA\u6C34",outside:"\u8F68\u8FF9\u79BB\u5F00\u5C71\u8C37\u8303\u56F4",blocked:"\u51FA\u6C34\u53E3\u5728\u5B9E\u4F53\u5185\uFF0C\u53EF\u5C1D\u8BD5\u62AC\u9AD8",open:"\u7A7A\u4E2D\u8F68\u8FF9\u9884\u8BA1\u7EE7\u7EED\u5EF6\u4F38"};m("#source-flight-status").textContent=a.impact?"\u9884\u8BA1\u9996\u6B21\u89E6\u5730\uFF1A"+a.impact.map(l=>l.toFixed(2)).join(" / ")+" m":c[a.reason]}let n=De.result,i="",r=!1;for(let a of n.points){let c=new v(...a).project(f.camera);if(c.z<0||c.z>1){r=!1;continue}i+=(r?"L":"M")+((c.x*.5+.5)*f.canvas.clientWidth).toFixed(1)+","+((-c.y*.5+.5)*f.canvas.clientHeight).toFixed(1),r=!0}m("#jet-line").setAttribute("d",i);let o=m("#jet-impact");if(o.style.display="none",n.impact){let a=new v(...n.impact).project(f.camera);a.z>=0&&a.z<=1&&(o.setAttribute("cx",(a.x*.5+.5)*f.canvas.clientWidth),o.setAttribute("cy",(-a.y*.5+.5)*f.canvas.clientHeight),o.style.display="")}}setInterval(()=>{if(!f.camera)return;Kc(),m("#fps").textContent=f.stats.fps||"\u2014",document.body.dataset.frames=String(f.frame),document.body.dataset.particles=String(f.count||0),m("#terrain-state").textContent=f.worldReady===f.worldVersion?"\u5730\u5F62\u5DF2\u540C\u6B65":"\u6B63\u5728\u96D5\u523B\u2026";let s=Z(f.state),t=m("#source-markers");t.children.length!==s.length&&t.replaceChildren(...s.map((e,n)=>{let i=document.createElement("button");return i.className="source-marker",i.type="button",i.textContent="\u6C34\u6E90 "+(n+1),i.setAttribute("aria-label","\u9009\u53D6\u6C34\u6E90 "+(n+1)),i.addEventListener("click",()=>{D=n,at("spring"),pe()}),i})),s.forEach((e,n)=>{let i=new v(...e.position).project(f.camera),r=t.children[n];r.hidden=i.z<0||i.z>1||Math.abs(i.x)>1||Math.abs(i.y)>1||z!=="spring"&&s.length===1,r.classList.toggle("active",z==="spring"&&n===D),r.classList.toggle("off",!e.enabled||e.power===0),r.style.left=(i.x*.5+.5)*f.canvas.clientWidth+"px",r.style.top=(-i.y*.5+.5)*f.canvas.clientHeight+"px"})},160);try{await f.init(),f.restoreCamera(Ue?.camera),f.controls.addEventListener("end",O),f.controls.addEventListener("change",()=>{Jt&&z!=="orbit"&&!C&&(fe=On(Jt),Fi(Jt,fe))}),m("#loading").style.display="none",document.body.dataset.status="ready",_t(),at("orbit"),Ue&&U("\u5DF2\u6062\u590D\u4E0A\u6B21\u7F16\u8F91\u7684\u4F5C\u54C1\u3002"),matchMedia("(max-width:720px)").matches&&(m("#panel-body").hidden=!0,m("#panel-toggle").textContent="+",m("#panel-toggle").setAttribute("aria-expanded","false"),m("#panel-toggle").setAttribute("aria-label","\u5C55\u5F00\u98CE\u666F\u63A7\u5236")),O()}catch(s){console.error(s),m("#loading-text").textContent=s.message,m("#loading").querySelector("small").textContent="\u5EFA\u8BAE\u5728\u652F\u6301 WebGPU \u7684 Chrome / Edge \u4E2D\u6253\u5F00\u3002",document.body.dataset.status="error"}
