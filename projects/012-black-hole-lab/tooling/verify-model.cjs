/* Independent numeric checks of the restricted Schwarzschild teaching model.
 * Run: node projects/012-black-hole-lab/tooling/verify-model.cjs
 * These checks validate equations and numerical integration, not a stellar GRMHD simulation.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../web/model.js');
const checks=[];
function check(name,condition,details){assert.ok(condition,name+': '+JSON.stringify(details));checks.push({name,passed:true,details});console.log('PASS '+name);}
function near(a,b,relative=1e-8,absolute=1e-12){return Math.abs(a-b)<=Math.max(absolute,relative*Math.abs(b));}
const magnitude=p=>Math.hypot(...p),dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
const base=M.units(10,1e-9),u=M.units(1,1e-9);
check('Schwarzschild radius is 2GM/c^2 in SI units',near(u.rs,2*6.67430e-11*1.98847e30/299792458**2)&&near(u.rsKm,2.9533393820668785),{solarMassRadiusKm:u.rsKm});
check('Radius and geometric time scale linearly with mass',near(base.rs/u.rs,10)&&near(base.timeUnit/u.timeUnit,10)&&near(base.timeUnit,base.rs/M.C),{tenSolarMassRadiusKm:base.rsKm,timeUnitSeconds:base.timeUnit});
const photonPotential=r=>(1-1/r)/r**2;
const h=1e-4,rp=base.photonSphere;
const photonSlope=(photonPotential(rp+h)-photonPotential(rp-h))/(2*h);
check('Photon sphere is the unstable null effective-potential maximum at 1.5 Rs',rp===1.5&&Math.abs(photonSlope)<1e-8&&photonPotential(rp)>photonPotential(rp-.1)&&photonPotential(rp)>photonPotential(rp+.1),{radius:rp,potential:photonPotential(rp),derivative:photonSlope});
check('Critical impact is reciprocal square root of photon-sphere potential',near(base.criticalImpact,1/Math.sqrt(photonPotential(rp)))&&near(base.criticalImpact,3*Math.sqrt(3)/2),{criticalImpact:base.criticalImpact});
function stableDerivative(r){const angular2=r*r/(2*r-3),V=x=>(1-1/x)*(1+angular2/x**2),step=1e-3;return (V(r+step)-2*V(r)+V(r-step))/step**2;}
check('Timelike circular-orbit stability changes at ISCO = 3 Rs',base.isco===3&&stableDerivative(2.8)<0&&Math.abs(stableDerivative(3))<1e-7&&stableDerivative(3.2)>0,{inside:stableDerivative(2.8),at:stableDerivative(3),outside:stableDerivative(3.2)});
function incoming(b,R=100){const tangential=b*Math.sqrt(1-1/R)/R;return {camera:[R,0,0],direction:[-Math.sqrt(1-tangential*tangential),tangential,0]};}
for(const [b,captured] of [[2.5,true],[2.7,false]]){
 const input=incoming(b),ray=M.trace(input.camera,input.direction,{limit:150,maxSteps:20000});
 check('Static-observer initialization preserves the chosen conserved impact '+b,near(ray.angularMomentum/Math.sqrt(ray.energy),b),{requested:b,actual:ray.angularMomentum/Math.sqrt(ray.energy)});
 check('Light '+(captured?'is captured below':'escapes above')+' critical impact',ray.captured===captured&&(captured?magnitude(ray.final)<1.001:magnitude(ray.final)>150),{impact:b,captured:ray.captured,finalRadius:magnitude(ray.final)});
 check('RK4 trajectory preserves the null energy constraint for impact '+b,ray.error<1e-6,{maxAbsoluteConstraintError:ray.error});
}
const circle=M.trace([1.5,0,0],[0,1,0],{maxSteps:100});
const maxCircleError=Math.max(...circle.points.map(p=>Math.abs(magnitude(p)-1.5)));
check('Tangential photon at 1.5 Rs follows the circular null orbit',!circle.captured&&maxCircleError<1e-6,{maxRadiusError:maxCircleError,constraintError:circle.error});
const weak=M.bending(50),leading=2/50,second=leading+15*Math.PI/(16*50**2);
check('Weak-field deflection approaches 2 Rs / b with the GR correction',weak>leading&&Math.abs(weak-second)<5e-5&&Math.abs(M.bending(500)/(2/500)-1)<.004,{b50:weak,firstOrder:leading,secondOrder:second,b500:M.bending(500)});
const far=incoming(50,2000),farRay=M.trace(far.camera,far.direction,{limit:2000,maxSteps:50000});
const startVelocity=[far.direction[0]*Math.sqrt(1-1/2000),far.direction[1],0];
const observedAngle=Math.acos(Math.max(-1,Math.min(1,dot(startVelocity,farRay.velocity)/(magnitude(startVelocity)*magnitude(farRay.velocity)))));
check('Independent RK4 ray deflection agrees with the scalar geodesic integral',!farRay.captured&&Math.abs(observedAngle-weak)<1e-6,{numeric:observedAngle,integral:weak});
const r0=4,end=.65,coef=r0**1.5/2,etaEnd=Math.acos(2*end/r0-1),totalTau=coef*(etaEnd+Math.sin(etaEnd));
const progressForRadius=r=>{const eta=Math.acos(2*r/r0-1);return coef*(eta+Math.sin(eta))/totalTau;};
const sample=Array.from({length:101},(_,i)=>M.collapse(i/100));
check('Freely falling boundary contracts monotonically in finite proper time',sample.every((s,i)=>Number.isFinite(s.properTime)&&(!i||(s.r<sample[i-1].r&&s.properTime>sample[i-1].properTime)))&&near(sample[0].r,r0)&&near(sample.at(-1).r,end,1e-8),{initialRadius:sample[0].r,finalRadius:sample.at(-1).r,properEndSeconds:sample.at(-1).properTime});
check('Cycloid proper time equals the radial timelike geodesic closed form',near(sample.at(-1).properTime,totalTau*base.timeUnit),{expectedSeconds:totalTau*base.timeUnit,actualSeconds:sample.at(-1).properTime});
const etaH=Math.acos(2/r0-1),horizonTau=coef*(etaH+Math.sin(etaH))*base.timeUnit;
const crossing=M.collapse(progressForRadius(1));
check('A falling surface reaches the horizon in finite proper time',near(crossing.r,1,1e-9)&&near(crossing.properTime,horizonTau),{horizonProperTimeSeconds:horizonTau,actualSeconds:crossing.properTime});
const atTwo=progressForRadius(2),dp=1e-5,low=M.collapse(atTwo-dp),high=M.collapse(atTwo+dp);
const drDtau=(high.r-low.r)/((high.properTime-low.properTime)/base.timeUnit);
check('Cycloid speed satisfies dr/dtau = -sqrt(1/r - 1/r0)',near(drDtau,-Math.sqrt(1/2-1/r0),1e-6),{numericalSpeed:drDtau,closedForm:-.5});
const E=Math.sqrt(1-1/r0),outgoing=M.collapse(atTwo),expectedG=E-Math.sqrt(E*E-(1-1/2));
check('Received frequency combines infall Doppler and gravitational redshift',near(outgoing.redshift,expectedG,1e-8)&&near(outgoing.bolometricFactor,expectedG**4,1e-8),{g:outgoing.redshift,expectedG,bolometricIntensityFactor:outgoing.bolometricFactor});
const exterior=sample.filter(s=>!s.inside);
check('Successive outward flashes reach a distant observer later and redder',exterior.every((s,i)=>s.arrival!==null&&(!i||(s.arrival>exterior[i-1].arrival&&s.redshift<exterior[i-1].redshift))),{firstArrival:exterior[0].arrival,lastArrival:exterior.at(-1).arrival});
const closeR=[1.1,1.01,1.001,1.0001],close=closeR.map(r=>M.collapse(progressForRadius(r)));
check('Received photon energy tends to zero approaching the horizon',close.every((s,i)=>s.redshift>0&&(!i||s.redshift<close[i-1].redshift))&&close.at(-1).redshift<6e-5,{radii:closeR,frequencyRatios:close.map(s=>s.redshift)});
const delayed=close.at(-1).arrival-close.at(-2).arrival,expectedDelay=2*base.timeUnit*Math.log(10);
check('Late outgoing signals show logarithmically divergent received delay',near(delayed,expectedDelay,.005),{delayForTenfoldSmallerHorizonGap:delayed,asymptoticDelay:expectedDelay});
check('Events inside the horizon have no outward arrival at infinity',sample.filter(s=>s.inside).length>0&&sample.filter(s=>s.inside).every(s=>s.arrival===null),{insideCount:sample.filter(s=>s.inside).length});
for(const start of [.9,1,1.1]){
 const pts=M.radialLight(start,4,.01),radii=pts.map(p=>p[0]);
 check('Outgoing EF null ray '+(start===1?'stays at the horizon':start>1?'moves outward outside':'moves inward inside'),radii.every((r,i)=>!i||(start===1?r===1:start>1?r>radii[i-1]:r<radii[i-1])),{initial:start,lastRadius:radii.at(-1),lastIngoingEFTime:pts.at(-1)[1]});
 if(start>1){const [r,v]=pts.at(-1),tortoise=x=>x+Math.log(x-1);check('EF radial light integration matches the exact tortoise-coordinate relation',near(2*(tortoise(r)-tortoise(start)),v,1e-8),{integratedTime:v,closedForm:2*(tortoise(r)-tortoise(start))});}
}
check('Zero-torque thin disk has zero effective temperature at its inner edge',M.diskTemperature(3)===0&&M.diskTemperature(2.9)===0,{innerTemperature:M.diskTemperature(3)});
const peakRadius=3*49/36,peak=M.diskTemperature(peakRadius),delta=.02;
check('Thin-disk temperature peaks at 49/36 times the inner radius',peak>M.diskTemperature(peakRadius-delta)&&peak>M.diskTemperature(peakRadius+delta)&&near(peak,base.peakTemperature,1e-8),{radius:peakRadius,temperatureKelvin:peak,reportedPeak:base.peakTemperature});
check('Temperature scales with accretion rate to power 1/4',near(M.diskTemperature(5,10,16e-9)/M.diskTemperature(5,10,1e-9),2),{sixteenfoldRateTemperatureRatio:M.diskTemperature(5,10,16e-9)/M.diskTemperature(5,10,1e-9)});
check('Temperature scales with mass to power -1/2 at fixed dimensionless radius and fixed mass accretion rate',near(M.diskTemperature(5,40,1e-9)/M.diskTemperature(5,10,1e-9),.5),{quadrupleMassTemperatureRatio:M.diskTemperature(5,40,1e-9)/M.diskTemperature(5,10,1e-9)});
const report={date:'2026-10-02',timezone:'Asia/Shanghai',passed:checks.length,failed:0,scope:'Nonrotating Schwarzschild exterior; test-particle timelike collapse; radial null propagation; Newtonian zero-torque thin-disk flux profile.',limitations:['No dynamic stellar interior, self-gravity, equation of state, nuclear reactions, magnetic fluid evolution, or rotating Kerr spacetime.','CPU RK4 checks do not validate every finite-step GLSL pixel or prove GPU numerical convergence.','Temperature, CIE conversion, texture, exposure and false color are explicitly separate approximations.'],sources:['https://arxiv.org/pdf/2010.08735','https://jcgt.org/published/0002/02/01/paper.pdf'],checks};
fs.writeFileSync(path.resolve(__dirname,'../notes/model-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log('Validated '+checks.length+' numerical checks.');
