// Node VM runtime integration checks; DOM/WebGL are mocked, not a browser FPS test.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');process.chdir(ROOT);
const nativeDate=Date;let clock=Date.now();class TestDate extends nativeDate{constructor(...a){super(...(a.length?a:[clock]));}static now(){return clock;}}
function makeEnv(html,store=new Map(),fail=false){
 const elements=new Map(),events=[];const noop=()=>{};
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>0,createBuffer:()=>({}),createShader:()=>({}),createProgram:()=>({})},{get:(o,k)=>k in o?o[k]:k===k.toUpperCase()?1:noop});
 function el(id){if(elements.has(id))return elements.get(id);const classes=new Set();const e={style:{setProperty:noop},dataset:{},value:'',innerHTML:'',textContent:'',hidden:true,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,b)=>b?classes.add(x):classes.delete(x)},addEventListener:(type,fn)=>events.push({id,type,fn}),click:()=>{const ev={target:e,preventDefault:noop};if(typeof e.onclick==='function')e.onclick(ev);for(const listener of events)if(listener.id===id&&listener.type==='click')listener.fn(ev);},appendChild:noop,replaceChildren:noop,remove:noop,setAttribute:noop,querySelector:()=>null,querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0,width:390,height:844}),getContext:()=>gl,setPointerCapture:noop,releasePointerCapture:noop};elements.set(id,e);return e;}
 const env={console,Date:TestDate,performance:{now:()=>clock},document:{getElementById:el,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>el('temp'+Math.random()),addEventListener:noop,hidden:false},innerWidth:390,innerHeight:844,devicePixelRatio:3,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},setTimeout:()=>1,clearTimeout:noop,setInterval:noop,requestAnimationFrame:noop,addEventListener:(type,fn)=>events.push({id:'window',type,fn}),confirm:()=>true,TextDecoder,DataView,Uint8Array,Float32Array,ArrayBuffer,Map,Set,__FARM_TEST_HARNESS__:true};env.window=env;env.globalThis=env;env.fetch=async url=>{if(fail)throw Error('injected missing asset');const b=fs.readFileSync(path.resolve(ROOT,url.split('?')[0]));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};vm.createContext(env);vm.runInContext(fs.readFileSync('assets/art-v1/loader.js','utf8'),env);
 const match=html.match(/<script>\s*([\s\S]*?)<\/script>/);assert(match);vm.runInContext(match[1],env,{timeout:10000});return {env,qa:env.__farmQA,store,events};
}
function prepareBaseline(html){return html.replace('resize();drawSeeds();hud();updateZoomBadge();updateRoam();updateRoamChip();requestAnimationFrame(frame);','window.__farmQA={getState:()=>state,sceneStatic,sceneCrops,setScene:s=>{activeScene=s;}};resize();drawSeeds();hud();updateZoomBadge();updateRoam();updateRoamChip();requestAnimationFrame(frame);');}
async function main(){
 const html=fs.readFileSync('index.html','utf8'),report={checks:[],scenes:{},limitations:['No browser/WebGL driver or physical-phone QA in this environment','DOM and WebGL API are mocked; mesh import and business logic run unchanged','Raster previews use actual imported mesh buffers; they are not browser screenshots']};
 const check=name=>report.checks.push(name),manifest=JSON.parse(fs.readFileSync('assets/art-v1/manifest.json'));
 const run=makeEnv(html);await new Promise(r=>setImmediate(r));assert.equal(run.env.FarmArtStatus.state,'ready');check('All seventeen original GLB assets load through production adapter');
 // Desktop input checks run real keyboard handlers with a minimal mocked event target.
 const desktopKeys=run.events.filter(e=>e.id==='window'&&e.type==='keydown');
 assert(desktopKeys.length>=2,'Escape and desktop shortcut handlers should both register');
 run.env.document.getElementById('play').onclick();
 const pressKey=key=>{const e={key,target:{tagName:'BODY'},defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};desktopKeys.forEach(h=>h.fn(e));};
 const quick=run.env.document.getElementById('quickMenu');
 assert.equal(quick.hidden,true);pressKey('m');assert.equal(quick.hidden,false);pressKey('m');assert.equal(quick.hidden,true);
 const xBefore=run.qa.project(0,0,0)[0];pressKey('a');assert(run.qa.project(0,0,0)[0]>xBefore,'A should pan farm right');
 pressKey('+');assert.notEqual(run.env.document.getElementById('zoomBadge').textContent,'1.0×');
 pressKey('r');assert.equal(run.env.document.getElementById('zoomBadge').textContent,'1.0×');
 assert.equal(run.qa.project(0,0,0)[0],xBefore,'R should reset horizontal camera offset');
 check('Desktop M menu, A camera pan, + zoom and R reset respond to keyboard events');

 for(const m of manifest.models){const b=fs.readFileSync('assets/art-v1/'+m.id+'.glb'),model=run.env.FarmArtV1.parseGLB(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));assert.equal(model.triangles,m.triangles);for(const p of model.parts){assert(p.data.every(Number.isFinite));for(let i=0;i<p.data.length;i+=10)assert(Math.abs(Math.hypot(p.data[i+3],p.data[i+4],p.data[i+5])-1)<1e-5);}
  const gt=JSON.parse(fs.readFileSync('assets/art-v1/'+m.id+'.gltf')),bin=Buffer.from(gt.buffers[0].uri.split(',')[1],'base64'),gmodel=run.env.FarmArtV1.parse(gt,bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength));assert.equal(gmodel.triangles,m.triangles);fs.writeFileSync('tests/'+m.id+'.f32',Buffer.from(run.env.FarmArtV1.compile(model).buffer));
 }check('GLB + embedded GLTF agree; mesh normals and coordinates are finite');
 // V1.2 regression check: physical roof joins and cow eye/tail meshes.
 for(const id of ['house','cow','cow-lod']){
  const b=fs.readFileSync('assets/art-v1/'+id+'.glb'),model=run.env.FarmArtV1.parseGLB(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
  const names=new Set(model.parts.map(p=>p.name));
  if(id==='house'){for(const sign of [-1,1])assert(names.has('roof-to-wall-connection-'+sign));}
  else{for(const sign of [-1,1]){assert(names.has('eye-ivory-sclera-'+sign));const eye=model.parts.find(p=>p.name==='eye-'+sign);assert(eye,'missing pupil');let z=0,n=0;for(let k=2;k<eye.data.length;k+=10){z+=eye.data[k];n++;}assert(z/n>1.10,'Cow pupil needs to face forward');}assert(names.has('tail-root-connected'));}
 }
 check('V1.2 roof-wall joints, cow eye sockets and attached tail-root are present');
 // V1.3 regression: buildings are real independently editable meshes, not decorative PNG overlays.
 for(const id of ['coop-house','cow-barn','sheep-barn','workshop-house','windmill','well']){
  const asset=run.env.FarmArtV1.parseGLB((b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))(fs.readFileSync('assets/art-v1/'+id+'.glb')));
  assert(asset.parts.length>=25,id+' should have individually editable parts');
  const parts=asset.parts.map(p=>p.name);
  if(['coop-house','cow-barn','sheep-barn','workshop-house'].includes(id))assert(parts.some(n=>n.includes('roof'))&&parts.some(n=>n.includes('door')),id+' needs roof and door');
  assert(asset.parts.every(p=>p.data.every(Number.isFinite)),id+' contains invalid vertices');
 }
 check('V1.3 six original building GLBs contain roof/door components and finite editable meshes');
 const tree=run.env.FarmArtV1.parseGLB((b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))(fs.readFileSync('assets/art-v1/apple-tree.glb')));assert(run.env.FarmArtV1.compile(tree,{fruit:false}).length<run.env.FarmArtV1.compile(tree).length);check('Apple fruit groups can hide without replacing the grown tree');
 const q=run.qa,state=q.getState(),legacy=JSON.stringify(state),storage=new Map([[q.LEGACY_KEY,legacy]]),saved=makeEnv(html,storage);await new Promise(r=>setImmediate(r));assert.equal(saved.qa.getState().coins,state.coins);saved.qa.getState().coins+=17;saved.qa.save();assert.equal(storage.get(q.LEGACY_KEY),legacy);assert(storage.has(q.KEY));const reloaded=makeEnv(html,storage);await new Promise(r=>setImmediate(r));assert.equal(reloaded.qa.getState().coins,state.coins+17);check('v0.18-compatible save copied read-only; test save reloads; live save untouched');
 state.coins=1000;q.setScene('island');q.startBrush('plant',0);q.tryPaintPlot(0);assert.equal(state.plots[0].seed,0);clock+=9000;q.tapPlot(0,100,100);assert.equal(state.plots[0].seed,-1);assert.equal(state.total,1);check('Planting and timed crop harvest update coins/experience');
 assert(q.feedOneChicken(0,true));clock+=36000;q.collectEggs(0);assert.equal(state.coop.eggs,1);check('Chicken feeding and egg collection preserve production');
 assert(q.feedOneCow(0,true));clock+=56000;q.collectMilk(0);assert.equal(state.cow.milk,2);check('Cow feeding and milk collection preserve production');
 assert(q.feedOneSheep(0,true));clock+=51000;q.collectWool(0);assert.equal(state.sheep.wool,2);check('Sheep feeding, wait and wool collection preserve production');
 q.plantFruitTree(0,0);clock+=180000;q.harvestFruit(0);assert(state.orchard.stock[0]>0);assert(state.orchard.trees[0].harvests>0);check('Apple sapling growth and repeated harvest remain functional');
 state.coop.eggs=10;assert(q.startWorkshop(0));clock+=180000;assert(q.collectWorkshop());assert(state.workshop.stock[0]>0);check('Workshop recipes consume stock and yield finished goods');
 state.orders.slots[0]={items:[{id:'wool',count:1}],coins:20,xp:1};assert(q.deliverOrder(0));assert.equal(state.orders.completed,1);check('Customer order delivery consumes correct goods');
 const base=makeEnv(prepareBaseline(fs.readFileSync('tests/baseline-v018.html','utf8'))),v021=makeEnv(prepareBaseline(fs.readFileSync('tests/baseline-v021.html','utf8')));
 for(const scene of ['island','coop','cow','sheep','orchard','workshop','orders']){q.setScene(scene);base.qa.setScene(scene);v021.qa.setScene(scene);const a=q.sceneStatic(),b=q.sceneCrops(clock),old=base.qa.sceneStatic(),prior=v021.qa.sceneStatic();assert(a.every(Number.isFinite)&&b.every(Number.isFinite));report.scenes[scene]={staticTriangles:a.length/30,dynamicTriangles:b.length/30,v018StaticTriangles:old.length/30,v021StaticTriangles:prior.length/30,renderDrawCalls:2,meshMiB:(a.byteLength+b.byteLength)/1048576};if(['island','sheep','cow','coop','orchard'].includes(scene))fs.writeFileSync('tests/scene-'+scene+'.f32',Buffer.from(new Float32Array([...a,...b]).buffer));}

 q.setScene('sheep');q.setZoom(1);const low=q.sceneCrops(clock).length;q.setZoom(2.6);const high=q.sceneCrops(clock).length;assert(high>low);check('Animal detail increases when zoomed in; distant meshes use LOD');
 for(const room of ['sheep','cow','coop']){q.setScene(room);const a=q.sceneStatic(),b=q.sceneCrops(clock);fs.writeFileSync('tests/scene-'+room+'.f32',Buffer.from(new Float32Array([...a,...b]).buffer));}
 q.setZoom(1);report.animalLODTriangles=manifest.models.filter(m=>['sheep','cow','chicken','sheep-lod','cow-lod','chicken-lod'].includes(m.id)).map(m=>({id:m.id,triangles:m.triangles}));
 check('All seven game scenes build valid meshes with actual imported GLB resources');
 q.setScene('island');q.frame(0);const poly=q.screenPoly(0),cx=poly.reduce((s,p)=>s+p[0],0)/4,cy=poly.reduce((s,p)=>s+p[1],0)/4;assert(q.contains(cx,cy,poly));assert(run.events.some(e=>e.type==='pointerdown')&&run.events.some(e=>e.type==='pointerup'));check('Portrait projection and touch handler registration retained');
 const bad=makeEnv(html,new Map(),true);await new Promise(r=>setImmediate(r));assert.equal(bad.env.FarmArtStatus.state,'fallback');assert(bad.qa.sceneStatic().length>0);check('Missing model files fall back to v0.21 geometry');
 report.assetBytes=manifest.models.reduce((s,m)=>s+m.bytes,0);report.maxDPR=1.5;report.targetRenderFPS=30;report.testedAt=new nativeDate().toISOString();fs.writeFileSync('docs/validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
