// Reproduce player screenshots: validate GPU vertex streams, not just harvest counters.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {makeEnv,advance}=require('./art-v1.test.cjs');
const html=fs.readFileSync('index.html','utf8'),checks=[];
async function setup(){const r=makeEnv(html);await new Promise(setImmediate);return r;}
function validStream(a){
 assert.equal(a.length%30,0,'Each triangle must have 3 vertices of exactly 10 floats');
 for(let i=0;i<a.length;i+=10){
  assert(Array.from(a.slice(i,i+10)).every(Number.isFinite),'GPU vertex contains NaN / Infinity');
  assert(Math.abs(a[i])<20&&Math.abs(a[i+2])<20&&a[i+1]>-.1&&a[i+1]<5,'Corrupt position stretches a triangle outside the farm');
  for(let k=6;k<10;k++)assert(a[i+k]>=0&&a[i+k]<=1,'RGBA must contain four normalized numbers');
 }
}
async function test(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
async function main(){
 await test('Corn husks and every crop growth stage produce a finite, aligned GPU stream',async()=>{
  const r=await setup(),q=r.qa,s=q.getState();s.coins=100000;
  for(const assets of [q.getAssets(),null]){
   q.setAssets(assets);
   for(const type of [2,0,1,3])for(const progress of [.12,.35,.47,.70,1]){
    for(let i=0;i<16;i++)s.plots[i]={unlock:true,seed:type,at:r.env.Date.now()-progress*[8000,15000,23000,35000][type]};
    validStream(q.sceneCrops(1000));
   }
  }
 });
 await test('Mixed mature corn alongside other crops stays aligned after harvest and save reload',async()=>{
  const r=await setup(),q=r.qa,s=q.getState();s.coins=100000;
  for(let i=0;i<16;i++)s.plots[i]={unlock:true,seed:i%4,at:r.env.Date.now()-40000};
  validStream(q.sceneCrops(1000));q.tapPlot(2,0,0);q.startBrush('plant',2);q.tryPaintPlot(2);advance(24000);validStream(q.sceneCrops(2000));q.save();
  const reloaded=makeEnv(html,r.store);await new Promise(setImmediate);validStream(reloaded.qa.sceneCrops(3000));
 });
 await test('Every animal covers a meaningful route, rests without spinning and stays continuous',async()=>{
  const r=await setup(),motion=r.env.FarmAnimalMotion;
  for(const [kind,n] of [['cow',2],['sheep',3],['chicken',3]])for(let i=0;i<n;i++){
   let prev,rest=0,travel=0,minZ=Infinity,maxZ=-Infinity;
   for(let t=0;t<=180000;t+=50){
    const p=motion.pose(kind,i,t);assert(Object.values(p).every(v=>typeof v!=='number'||Number.isFinite(v)));
    minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);
    assert(p.x>-3.5&&p.x<3.5&&p.z>-1&&p.z<1.7,'route leaves open pen ground');
    if(prev){
     const d=Math.hypot(p.x-prev.x,p.z-prev.z);assert(d<.021,'position teleports');travel+=d;
     if(p.resting&&prev.resting){assert(d<1e-8);assert.equal(p.angle,prev.angle);assert.equal(p.distance,prev.distance);rest++;}
     if(d>.001){const forward=(p.x-prev.x)*Math.sin(p.angle)+(p.z-prev.z)*Math.cos(p.angle);assert(forward/d>.98,'body must face its travel direction');}
    }prev=p;
   }
   assert(travel>10&&maxZ-minZ>.9,'animal still circles in place');assert(rest>150,'animal never stops');
  }
 });
 await test('Supporting feet remain planted during straight travel at every animal scale',async()=>{
  const r=await setup(),m=r.env.FarmAnimalMotion;
  for(const [kind,stride,n] of [['cow',.32,4],['sheep',.25,4],['chicken',.18,2]])for(let leg=0;leg<n;leg++)for(const scale of [.77,1,1.02]){
   let stance=0,swing=0;
   for(let d=0;d<stride;d+=.001){const a=m.footPose(kind,leg,d,1,scale),b=m.footPose(kind,leg,d+.0001,1,scale);
    assert(a.y>=0&&a.y<.06);
    if(a.stance&&b.stance){assert(Math.abs(a.z*scale+d-(b.z*scale+d+.0001))<1e-10);assert.equal(a.y,0);stance++;}
    else if(!a.stance){assert(a.y>0);swing++;}
   }assert(stance>100&&swing>40);
  }
 });
 await test('Movement adapter failure preserves all three animal scenes and their gameplay',async()=>{
  const r=await setup(),q=r.qa;r.env.FarmAnimalMotion=undefined;let t=1000;
  for(const kind of ['cow','sheep','coop']){q.enterScene(kind);q.frame(t+=1000);validStream(q.sceneStatic());}
  q.getState().coins=10000;assert(q.feedOneCow(0));assert(q.feedOneSheep(0));assert(q.feedOneChicken(0));
 });
 fs.writeFileSync('docs/feedback-validation.json',JSON.stringify({checks},null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
