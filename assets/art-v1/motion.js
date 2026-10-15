(function(root){'use strict';
// Original editable sculpt meshes, distance-driven feet and deterministic walk/rest routes.
const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>x*x*(3-2*x);
const settings={
 cow:{stride:.32,lift:.040,hip:.96,speed:.23,centers:[-2,1.05],rx:.25,z0:-.60,z1:1.0,scales:[.94,1.01]},
 sheep:{stride:.25,lift:.034,hip:.66,speed:.20,centers:[-2.7,0,2.7],rx:.30,z0:.40,z1:1.30,scales:[.93,1.02,.96]},
 chicken:{stride:.18,lift:.026,hip:.238,speed:.25,centers:[-1.7,-.15,1.4],rx:.35,z0:.45,z1:1.45,scales:[.77,.77,.89]}
};
const paths=new Map(),rigs=new WeakMap();
function curve(points,k,t){
 const n=points.length,a=points[(k+n-1)%n],b=points[k],c=points[(k+1)%n],d=points[(k+2)%n];
 const value=j=>.5*(2*b[j]+(-a[j]+c[j])*t+(2*a[j]-5*b[j]+4*c[j]-d[j])*t*t+(-a[j]+3*b[j]-3*c[j]+d[j])*t*t*t);
 const tangent=j=>.5*((-a[j]+c[j])+2*(2*a[j]-5*b[j]+4*c[j]-d[j])*t+3*(-a[j]+3*b[j]-3*c[j]+d[j])*t*t);
 return {x:value(0),z:value(1),angle:Math.atan2(tangent(0),tangent(1))};
}
function route(kind,i){
 const key=kind+i;if(paths.has(key))return paths.get(key);
 const cfg=settings[kind],x=cfg.centers[i],points=[[x-cfg.rx,cfg.z0],[x+cfg.rx,cfg.z0],[x+cfg.rx,cfg.z1],[x-cfg.rx,cfg.z1]];
 let duration=0,length=0;
 const segments=points.map((_,k)=>{
  let last=curve(points,k,0),len=0;const distances=[0];
  for(let j=1;j<=48;j++){const p=curve(points,k,j/48);len+=Math.hypot(p.x-last.x,p.z-last.z);distances.push(len);last=p;}
  const move=len/cfg.speed*1000,rest=2700+((i*7+k*3)%5)*470;
  const segment={k,distances,length:len,move,rest,start:duration,from:length};duration+=move+rest;length+=len;return segment;
 });
 const result={points,segments,duration,length};paths.set(key,result);return result;
}
function pose(kind,i,now){
 if(kind==='coop')kind='chicken';const cfg=settings[kind],path=route(kind,i);
 const elapsed=Math.max(0,now+i*4317),loops=Math.floor(elapsed/path.duration),time=elapsed%path.duration;
 const seg=path.segments.find(s=>time<s.start+s.move+s.rest)||path.segments[path.segments.length-1];
 const u=clamp((time-seg.start)/seg.move),distance=smooth(u)*seg.length;
 let j=1;while(j<seg.distances.length-1&&seg.distances[j]<distance)j++;
 const f=(distance-seg.distances[j-1])/(seg.distances[j]-seg.distances[j-1]||1),t=(j-1+f)/48;
 const p=curve(path.points,seg.k,t),speed=u<1?seg.length*6*u*(1-u)/(seg.move/1000):0;
 return {...p,scale:cfg.scales[i],distance:loops*path.length+seg.from+distance,speed,walk:clamp(speed/.18),phase:(loops*path.length+seg.from+distance)/cfg.stride*TAU,time:now/1000,resting:u===1};
}
function footPose(kind,leg,distance,walk=1,scale=1){
 if(kind==='coop')kind='chicken';const cfg=settings[kind];
 // Cows/sheep walk with four distinct contacts; chickens alternate two feet.
 const offset=kind==='chicken'?[0,.5][leg]:[0,.5,.75,.25][leg];
 const cycle=((distance/cfg.stride+offset)%1+1)%1,stance=.64;
 if(cycle<stance)return {z:cfg.stride*(stance/2-cycle)/scale,y:0,stance:true};
 const u=(cycle-stance)/(1-stance);
 return {z:cfg.stride*stance*(smooth(u)-.5)/scale,y:cfg.lift*Math.sin(Math.PI*u)*walk/scale,stance:false};
}
function rig(entry,kind){
 if(rigs.has(entry))return rigs.get(entry);const cfg=settings[kind];let minY=Infinity;
 const parts=entry.model.parts.map(part=>{
  const n=part.name;let leg=-1,hoof=false;
  if(kind==='cow'){leg=+(n.match(/^(?:curved-leg|cloven-hoof)-(\d)/)?.[1]??-1);hoof=n.startsWith('cloven-hoof');}
  else if(kind==='sheep'){leg=+(n.match(/^(?:shaped-leg|split-hoof)-(\d)/)?.[1]??-1);hoof=n.startsWith('split-hoof');}
  else if(/^(ankle|foot-toe|back-claw)-/.test(n)){leg=n.match(/^(?:ankle|foot-toe|back-claw)-(-?1)(?:-|$)/)?.[1]==='-1'?0:1;hoof=!n.startsWith('ankle');}
  const head=kind==='cow'?/^(head-|forehead-|soft-pink-muzzle|ear-|curved-horn|eye-|nostril|muzzle-)/.test(n):kind==='sheep'?/^(face-|soft-drooping-ear|ear-lining|eye-|gentle-cheek|eyebrow|sculpted-forelock|small-heart-nose|mouth-)/.test(n):false;
  for(let i=1;i<part.data.length;i+=10)minY=Math.min(minY,part.data[i]);
  return {data:part.data,leg,hoof,head,tail:/tail/.test(n)};
 });
 const result={parts,minY,hip:cfg.hip};rigs.set(entry,result);return result;
}
function append(target,entry,kind,x,surface,z,scale,pose={}){
 const r=rig(entry,kind),cfg=settings[kind],yaw=pose.angle||0,co=Math.cos(yaw),si=Math.sin(yaw),walk=pose.walk||0;
 const distance=pose.distance??((pose.phase||0)/TAU*cfg.stride),time=pose.time??(pose.phase||0);
 const active=pose.distance!==undefined||walk>0,phase=distance/cfg.stride*TAU;
 const bob=active?Math.sin(phase*(kind==='chicken'?2:4))*.004*walk:0,y=surface-r.minY*scale;
 const feet=[0,1,2,3].map(i=>active?footPose(kind,kind==='chicken'?i%2:i,distance,walk,scale):{z:0,y:0});
 for(const p of r.parts){
  const foot=p.leg>=0?feet[p.leg]:null;
  const angle=p.tail?.028*Math.sin(time*1.7):p.head?.035*Math.sin(time*.8)*(1-walk):0;
  const py=p.tail?(kind==='cow'?1.24:.90):kind==='cow'?1.24:.96,pz=p.tail?(kind==='cow'?-.70:-.65):kind==='cow'?.615:.665;
  const c=Math.cos(angle),s=Math.sin(angle),a=p.data;
  for(let i=0;i<a.length;i+=10){
   const xx=a[i];let yy=py+(a[i+1]-py)*c-(a[i+2]-pz)*s,zz=pz+(a[i+1]-py)*s+(a[i+2]-pz)*c;
   let nx=a[i+3],ny=a[i+4]*c-a[i+5]*s,nz=a[i+4]*s+a[i+5]*c;
   if(foot){
    const w=p.hoof?1:clamp((r.hip-yy)/(r.hip-r.minY));
    const derivative=!p.hoof&&w>0&&w<1?-1/(r.hip-r.minY):0;
    yy+=foot.y*w+bob*(1-w);zz+=foot.z*w;
    // Inverse transpose of the leg shear; source normals and editable meshes remain intact.
    ny=(ny-foot.z*derivative*nz)/(1+(foot.y-bob)*derivative);const len=Math.hypot(nx,ny,nz)||1;nx/=len;ny/=len;nz/=len;
   }else yy+=bob;
   target.push(x+scale*(xx*co+zz*si),y+scale*yy,z+scale*(-xx*si+zz*co),nx*co+nz*si,ny,-nx*si+nz*co,a[i+6],a[i+7],a[i+8],a[i+9]);
  }
 }
}
root.FarmAnimalMotion={append,pose,footPose};
})(typeof window==='undefined'?globalThis:window);
