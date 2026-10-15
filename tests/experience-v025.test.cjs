// Pointer sequences exercise the production event handlers, including cancelled gestures.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {makeEnv,advance,setClock}=require('./art-v1.test.cjs');
const html=fs.readFileSync('index.html','utf8');
async function setup(){const r=makeEnv(html);await new Promise(setImmediate);r.env.document.getElementById('play').click();r.qa.frame(0);return r;}
function pointer(r,type,p,id=1){for(const e of r.events.filter(e=>e.id==='glCanvas'&&e.type===type))e.fn({type,pointerId:id,pointerType:'touch',button:0,clientX:p[0],clientY:p[1]});}
function center(q,i){const ps=q.screenPoly(i);return [0,1].map(k=>ps.reduce((a,p)=>a+p[k],0)/4);}
const checks=[];async function test(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
async function main(){
 await test('Curved planting stroke never paints the release diagonal',async()=>{
  const r=await setup(),q=r.qa;q.startBrush('plant',0);
  // Travel across row 0, then down column 2. Plot 5 is inside the diagonal, off the path.
  const a=center(q,0),b=center(q,2),c=center(q,10);
  pointer(r,'pointerdown',a);pointer(r,'pointermove',b);pointer(r,'pointermove',c);pointer(r,'pointerup',c);
  assert.equal(q.getState().plots[5].seed,-1,'release must not plant untouched plot 5');
  assert.deepEqual(Array.from(q.getState().plots,(p,i)=>p.seed===0?i:-1).filter(i=>i>=0),[0,1,2,6,10]);
 });
 await test('A pinch followed by one-finger movement never becomes planting',async()=>{
  const r=await setup(),q=r.qa;q.startBrush('plant',0);const a=center(q,0),b=center(q,1),c=center(q,5);
  pointer(r,'pointerdown',a);pointer(r,'pointerdown',b,2);pointer(r,'pointermove',[b[0]+25,b[1]],2);
  pointer(r,'pointerup',b,2);pointer(r,'pointermove',c);pointer(r,'pointerup',c);
  assert(q.getState().plots.every(p=>p.seed<0));
 });
 await test('Projected building corner outside the prism does not open a building',async()=>{
  const r=await setup(),q=r.qa,ps=[];for(const x of [-1,1])for(const z of [-1,1])for(const y of [.03,2.7])ps.push(q.project(x,y,z));
  const min=k=>Math.min(...ps.map(p=>p[k]));
  assert.equal(q.hitWorldBox(min(0)+.1,min(1)+.1,-1,1,-1,1),false);
  const c=q.project(0,1,0);assert(q.hitWorldBox(...c,-1,1,-1,1));
 });
 await test('Imported building bounds include the real roof at every zoom',async()=>{
  const r=await setup(),q=r.qa;let frameTime=1000;
  for(const id of ['coop-house','cow-barn','sheep-barn','workshop-house'])for(const zoom of [1,3]){
   q.setZoom(zoom);q.frame(frameTime+=1000);const b=q.getAssets()[id].bounds;
   const c=q.project(0,.061+(b.max[1]-b.min[1])-.04,(b.min[2]+b.max[2])/2);
   assert(q.artBuildingHit(id,...c,0,0));
  }
 });
 await test('Roaming chicken and cow positions are continuous at loop seams',async()=>{
  const r=await setup(),q=r.qa;for(const [kind,period] of [['coop',4.7*5],['cow',7*5],['sheep',5.8*5]]){
   setClock(1000000);q.releaseAnimal(kind);const a=q.roamPose(kind,1000000+period*1000-.1),b=q.roamPose(kind,1000000+period*1000+.1);
   assert(Math.hypot(a.x-b.x,a.z-b.z)<.001,kind+' teleports at loop');
  }
 });
 await test('Animal already released to island has no ghost target in its pen',async()=>{
  const r=await setup(),q=r.qa;q.releaseAnimal('cow');q.enterScene('cow');q.frame(1000);const p=q.cowPose(0,1000),s=q.project(p.x,1.2*p.scale,p.z+.5*p.scale);
  assert.notEqual(q.cowHit(...s),0);
 });
 await test('Cancelled planting and right mouse button cannot spend coins',async()=>{
  const r=await setup(),q=r.qa;q.startBrush('plant',0);const p=center(q,0),coins=q.getState().coins;
  pointer(r,'pointerdown',p);pointer(r,'pointercancel',p);
  for(const type of ['pointerdown','pointerup'])for(const e of r.events.filter(e=>e.id==='glCanvas'&&e.type===type))e.fn({type,pointerId:3,pointerType:'mouse',button:2,clientX:p[0],clientY:p[1]});
  assert.equal(q.getState().coins,coins);assert(q.getState().plots.every(p=>p.seed<0));
 });
 await test('Desktop and portrait reset frame the island cliff and key buildings',async()=>{
  for(const [w,h] of [[1366,768],[390,844],[844,390]]){
   const r=await setup(),q=r.qa;r.env.innerWidth=w;r.env.innerHeight=h;q.frame(1000);q.resetCamera();q.frame(1100);
   for(const p of [[.08,-10.1,.18],[-4.35,3.58,-3.4],[5,4.14,-3.75],[-1.65,.1,9],[6.6,2,-7]]){
    const [x,y]=q.project(...p);assert(x>0&&x<w&&y>35&&y<h-35,`${w}x${h}: ${p} projects outside viewport: ${x}, ${y}`);
   }
  }
 });
 await test('Animal hits use the last rendered pose at both LOD levels',async()=>{
  const r=await setup(),q=r.qa;let frameTime=3000;
  for(const [kind,hit] of [['coop',q.chickenHit],['cow',q.cowHit],['sheep',q.sheepHit]])for(const zoom of [1,2.6]){
   q.enterScene(kind);q.setZoom(zoom);q.frame(frameTime+=1000);const p=q.getRenderedAnimals().poses[0];
   advance(8000);const c=q.project(p.x,kind==='coop'?.45:kind==='cow'?.85:.60,p.z);
   assert.equal(hit(...c),0,kind+' needs to hit the displayed pose');
  }
 });
 await test('Sculpted animal animation keeps all triangles, unit normals and grounded feet',async()=>{
  const r=await setup(),q=r.qa;
  for(const name of ['cow','sheep','chicken'])for(const lod of ['', '-lod']){
   const entry=q.getAssets()[name+lod],start=entry.full.slice();
   for(const phase of [0,1.5,3,4.5]){
    const out=[];r.env.FarmAnimalMotion.append(out,entry,name,0,.105,0,1,{angle:.8,phase,walk:1});
    assert.equal(out.length,entry.full.length);assert(out.every(Number.isFinite));let min=Infinity;
    for(let i=0;i<out.length;i+=10){min=Math.min(min,out[i+1]);assert(Math.abs(Math.hypot(out[i+3],out[i+4],out[i+5])-1)<1e-5);}
    assert(min>=.105-1e-6&&min<.15,name+' toes must stay at the floor');
   }
   assert.deepEqual(entry.full,start,'animation must not mutate editable source mesh');
  }
 });
 await test('Upgrade labels and actual animal/fruit harvest quantities agree',async()=>{
  const r=await setup(),q=r.qa,s=q.getState();s.coins=10000;
  for(const k of ['coop','cow','sheep','orchard']){q.upgradeFacility(k);q.upgradeFacility(k);}
  q.feedOneChicken(0);q.feedOneCow(0);q.feedOneSheep(0);q.plantFruitTree(0,0);advance(60000);
  assert(q.coopContent().includes('收取 3 枚'));assert(q.cowContent().includes('收奶 4瓶'));assert(q.sheepContent().includes('收羊毛 4份'));assert(q.orchardContent().includes('采摘 5 个'));
  q.collectEggs(0);q.collectMilk(0);q.collectWool(0);q.harvestFruit(0);
  assert.equal(s.coop.eggs,3);assert.equal(s.cow.milk,4);assert.equal(s.sheep.wool,4);assert.equal(s.orchard.stock[0],5);
 });
 await test('Open production panel enables collection when its timer matures',async()=>{
  const r=await setup(),q=r.qa;q.feedOneCow(0);q.panel('cow');
  let body=r.env.document.getElementById('panelBody');assert(body.innerHTML.includes('收奶 0瓶'));
  advance(56000);r.intervals.forEach(fn=>fn());assert(body.innerHTML.includes('收奶 2瓶'));
 });
 await test('An unchanged animal card keeps its action buttons while clocks tick',async()=>{
  const r=await setup(),q=r.qa;q.enterScene('cow');q.feedOneCow(0);q.openSceneContext('cow');
  const body=r.env.document.getElementById('contextBody');let writes=0,value=body.innerHTML;
  Object.defineProperty(body,'innerHTML',{get:()=>value,set:v=>{writes++;value=v;}});
  advance(1000);r.intervals.forEach(fn=>fn());assert.equal(writes,0,'clock tick must not replace a button being pressed');
 });
 await test('In-progress crops, three animal cycles, both fruit types, workshop and orders survive reload',async()=>{
  const r=await setup(),q=r.qa,s=q.getState();s.coins=10000;q.startBrush('plant',1);q.tryPaintPlot(0);q.feedOneChicken(0);q.feedOneCow(1);q.feedOneSheep(2);q.plantFruitTree(0,0);q.plantFruitTree(1,1);s.coop.eggs=4;q.startWorkshop(0);q.save();
  const before=JSON.parse(r.store.get(q.KEY)),legacy='{"preserve":"unchanged"}';r.store.set(q.LEGACY_KEY,legacy);advance(60000);
  const reload=makeEnv(html,r.store);await new Promise(setImmediate);const t=reload.qa.getState();
  assert.deepEqual(JSON.parse(JSON.stringify(t)),before);assert.equal(r.store.get(q.LEGACY_KEY),legacy);
  reload.qa.tapPlot(0,0,0);reload.qa.collectEggs(0);reload.qa.collectMilk(1);reload.qa.collectWool(2);reload.qa.harvestFruit(0);reload.qa.harvestFruit(1);assert(reload.qa.collectWorkshop());
  assert.equal(t.total,1);assert.equal(t.coop.eggs,3);assert.equal(t.cow.milk,2);assert.equal(t.sheep.wool,2);assert.equal(t.orchard.stock[0],3);assert.equal(t.orchard.stock[1],3);assert.equal(t.workshop.stock[0],1);
  t.orders.slots[0]={items:[{id:'milk',count:1}],coins:20,xp:1};assert(reload.qa.deliverOrder(0));assert.equal(t.cow.milk,1);
 });
 await test('All four crops harvest once and both permanent fruit trees regrow',async()=>{
  const r=await setup(),q=r.qa,s=q.getState();s.coins=10000;
  for(const [seed,plot] of [[0,0],[1,1],[2,2],[3,4]]){q.startBrush('plant',seed);assert(q.tryPaintPlot(plot));}
  q.plantFruitTree(0,0);q.plantFruitTree(1,1);advance(60000);
  for(const plot of [0,1,2,4])q.tapPlot(plot,0,0);
  assert.deepEqual(Array.from(s.harvest),[1,1,1,1]);assert.equal(s.total,4);
  q.harvestFruit(0);q.harvestFruit(1);advance(39000);q.harvestFruit(0);q.harvestFruit(1);
  assert.deepEqual(Array.from(s.orchard.stock),[6,6]);assert(s.orchard.trees.every(t=>t.harvests===2));
 });
 await test('Rejected localStorage writes visibly warn and successful retry clears the warning',async()=>{
  const r=await setup(),q=r.qa,write=r.env.localStorage.setItem;r.env.localStorage.setItem=()=>{throw Error('quota');};
  assert.equal(q.save(),false);assert.equal(r.env.document.getElementById('saveStatus').hidden,false);
  r.env.localStorage.setItem=write;assert.equal(q.save(),true);assert.equal(r.env.document.getElementById('saveStatus').hidden,true);
 });
 await test('Risky animal retreat and warning end do not teleport',async()=>{
  const r=await setup(),q=r.qa;setClock(3000000);q.releaseAnimal('cow',true);q.getState().roam.animals.cow.willNibble=true;
  for(const t of [3025000,3030000,3047000,3052000]){const a=q.roamPose('cow',t-.1),b=q.roamPose('cow',t+.1);assert(Math.hypot(a.x-b.x,a.z-b.z)<.001);}
  setClock(3035000);const a=q.roamPose('cow');q.shooAnimal('cow');const b=q.roamPose('cow');assert(Math.hypot(a.x-b.x,a.z-b.z)<.00001);
 });
 fs.writeFileSync('docs/experience-validation.json',JSON.stringify({checks,limitations:['DOM/WebGL are mocked in this suite; see docs/EXPERIENCE_V0_25.md for separate real-browser verification.','Physical phone FPS, multitouch and Blender editing require manual acceptance.']},null,2)+'\n');
 console.log(JSON.stringify({checks},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
