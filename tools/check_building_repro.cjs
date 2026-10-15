// Semantic, cross-V8 reproducibility check for the six original building meshes.
// Floating-point Math.sin / Math.pow can vary by a few ULP across runtimes.
// Compare editable node structures and float32 geometry within a tight tolerance.
const fs=require('node:fs'), cp=require('node:child_process'), path=require('node:path'), assert=require('node:assert/strict');
const base=path.resolve(__dirname,'../assets/art-v1');
const ids=['coop-house','cow-barn','sheep-barn','workshop-house','windmill','well'];
function committed(id){return JSON.parse(cp.execFileSync('git',['show','HEAD:assets/art-v1/'+id+'.gltf'],{encoding:'utf8',maxBuffer:4*1024*1024}));}
function same(a,b,p){
 if(typeof a!==typeof b)throw Error(p+': type mismatch');
 if(typeof a==='number'){assert(Number.isFinite(a)&&Number.isFinite(b));if(Math.abs(a-b)>1e-6)throw Error(p+': numeric mismatch '+a+' vs '+b);return;}
 if(a===null||typeof a!=='object'){assert.equal(a,b,p);return;}
 assert.deepEqual(Object.keys(a),Object.keys(b),p+': object keys');
 for(const k of Object.keys(a))same(a[k],b[k],p+'.'+k);
}
function validateGLB(file,g,bin){
 const a=fs.readFileSync(file);assert.equal(a.readUInt32LE(0),0x46546c67);assert.equal(a.readUInt32LE(4),2);assert.equal(a.readUInt32LE(8),a.length);
 const len=a.readUInt32LE(12),j=JSON.parse(a.subarray(20,20+len).toString('utf8'));
 const off=20+len;assert.equal(a.readUInt32LE(off+4),0x004e4942);
 const body=a.subarray(off+8,off+8+a.readUInt32LE(off));
 assert(body.equals(bin),'Regenerated GLB and embedded GLTF buffers do not match');
 const info=JSON.parse(JSON.stringify(g));delete info.buffers[0].uri;same(j,info,'GLB JSON');
}
for(const id of ids){
 const old=committed(id),now=JSON.parse(fs.readFileSync(path.join(base,id+'.gltf'),'utf8'));
 const original=Buffer.from(old.buffers[0].uri.split(',')[1],'base64');
 const regenerated=Buffer.from(now.buffers[0].uri.split(',')[1],'base64');
 delete old.buffers[0].uri;delete now.buffers[0].uri;
 same(old,now,id+'.metadata');assert.equal(original.length,regenerated.length,id+' byte length');
 assert.equal(original.length%4,0,id+' float32 alignment');
 let maxError=0;for(let i=0;i<original.length;i+=4){
  const x=original.readFloatLE(i),y=regenerated.readFloatLE(i);
  if(!Number.isFinite(x)||!Number.isFinite(y))throw Error(id+': nonfinite regenerated float');
  const e=Math.abs(x-y);maxError=Math.max(maxError,e);
  if(e>1e-6)throw Error(id+': coordinate/normal mismatch at float '+(i/4)+': '+x+' vs '+y);
 }
 now.buffers[0].uri='data:application/octet-stream;base64,'+regenerated.toString('base64');
 validateGLB(path.join(base,id+'.glb'),now,regenerated);
 console.log(id+' reproduced: '+now.meshes.length+' meshes; max float32 delta '+maxError.toExponential(2));
}
console.log('All six models are semantically reproducible across JS runtimes.');
