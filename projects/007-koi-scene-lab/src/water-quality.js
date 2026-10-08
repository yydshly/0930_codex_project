// Transmission needs the canvas detail; distant reflections can use a smaller target.
export function waterTargetSizes(pixelWidth,aspect,altitude,maxTextureSize=2048){
 if(!Number.isFinite(pixelWidth)||pixelWidth<=0||!Number.isFinite(aspect)||aspect<=0||!Number.isFinite(altitude))throw new Error('Invalid water viewport');
 const limit=Math.max(128,Math.min(1536,maxTextureSize)),near=altitude<1.8;
 const size=width=>({width:Math.min(width,limit),height:Math.min(limit,Math.max(128,Math.round(Math.min(width,limit)/aspect)))});
 const transmission=near?1024:Math.max(512,Math.min(1024,Math.ceil(pixelWidth*.85/64)*64));
 return {reflection:size(near?1024:512),refraction:size(transmission)};
}
