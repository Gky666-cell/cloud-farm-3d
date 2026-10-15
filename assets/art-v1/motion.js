(function(root){'use strict';
// Animate the existing named sculpt meshes. No replacement geometry, textures or new draw calls.
const rigs=new WeakMap();
function rig(entry,kind){
 if(rigs.has(entry))return rigs.get(entry);
 const hip=kind==='cow'?.88:kind==='sheep'?.58:.205;
 let minY=Infinity;
 const parts=entry.model.parts.map(part=>{
  const n=part.name;let leg=-1;
  if(kind==='cow')leg=+(n.match(/^(?:curved-leg|cloven-hoof)-(\d)/)?.[1]??-1);
  else if(kind==='sheep')leg=+(n.match(/^(?:shaped-leg|split-hoof)-(\d)/)?.[1]??-1);
  else if(/^(ankle|foot-toe|back-claw)-/.test(n))leg=n.match(/^(?:ankle|foot-toe|back-claw)-(-?1)(?:-|$)/)?.[1]==='-1'?0:1;
  const pivotZ=kind==='cow'?(leg<2?-.49:.43):kind==='sheep'?(leg<2?-.31:.28):.08;
  let low=Infinity,reach=0;
  for(let i=0;i<part.data.length;i+=10){low=Math.min(low,part.data[i+1]);minY=Math.min(minY,part.data[i+1]);reach=Math.max(reach,Math.abs(part.data[i+2]-pivotZ));}
  return {data:part.data,leg,pivotZ,low,reach,tail:/tail/.test(n)};
 });
 const result={parts,minY,hip};rigs.set(entry,result);return result;
}
function append(target,entry,kind,x,surface,z,scale,pose={}){
 const r=rig(entry,kind),yaw=pose.angle||0,co=Math.cos(yaw),si=Math.sin(yaw),phase=pose.phase||0,walk=pose.walk||0;
 const y=surface-r.minY*scale;
 for(const p of r.parts){
  let angle=0,py=0,pz=0,lift=0;
  if(p.leg>=0){
   const sign=[0,Math.PI,Math.PI,0][p.leg],swing=Math.sin(phase+sign);
   angle=.10*walk*swing;py=r.hip;pz=p.pivotZ;
   // A conservative lower bound keeps toes above the ground throughout a stride.
   lift=Math.max(0,r.minY-(py+Math.cos(angle)*(p.low-py)-Math.abs(Math.sin(angle))*p.reach));
  }else if(p.tail){angle=.025*Math.sin(phase*.43);py=kind==='cow'?1.24:.8;pz=kind==='cow'?-.70:-.65;}
  const c=Math.cos(angle),s=Math.sin(angle),a=p.data;
  for(let i=0;i<a.length;i+=10){
   const xx=a[i],yy=py+(a[i+1]-py)*c-(a[i+2]-pz)*s+lift,zz=pz+(a[i+1]-py)*s+(a[i+2]-pz)*c;
   const nx=a[i+3],ny=a[i+4]*c-a[i+5]*s,nz=a[i+4]*s+a[i+5]*c;
   target.push(x+scale*(xx*co+zz*si),y+scale*yy,z+scale*(-xx*si+zz*co),nx*co+nz*si,ny,-nx*si+nz*co,a[i+6],a[i+7],a[i+8],a[i+9]);
  }
 }
}
root.FarmAnimalMotion={append};
})(typeof window==='undefined'?globalThis:window);
