// Bounding-sphere fit accounts for the narrower horizontal field on phones.
export function sphereFitDistance(radius,fovDegrees,aspect,margin=1.12){
 if(!Number.isFinite(radius)||radius<=0||!Number.isFinite(fovDegrees)||fovDegrees<=0||fovDegrees>=179||!Number.isFinite(aspect)||aspect<=0)throw new Error('Invalid camera framing');
 const vertical=fovDegrees*Math.PI/360,horizontal=Math.atan(Math.tan(vertical)*aspect);
 return radius/Math.sin(Math.min(vertical,horizontal))*margin;
}
