(function(root){'use strict';
// Dependency-free glTF 2.0 static-mesh adapter for the existing 10-float WebGL stream.
const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function mul(a,b){const o=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function matrix(n){if(n.matrix)return n.matrix;const [x,y,z,w]=n.rotation||[0,0,0,1],s=n.scale||[1,1,1],t=n.translation||[0,0,0];return [(1-2*y*y-2*z*z)*s[0],(2*x*y+2*z*w)*s[0],(2*x*z-2*y*w)*s[0],0,(2*x*y-2*z*w)*s[1],(1-2*x*x-2*z*z)*s[1],(2*y*z+2*x*w)*s[1],0,(2*x*z+2*y*w)*s[2],(2*y*z-2*x*w)*s[2],(1-2*x*x-2*y*y)*s[2],0,...t,1];}
function srgb(x){return x<=.0031308?x*12.92:1.055*Math.pow(x,1/2.4)-.055;}
function parseGLB(bytes){
 const view=new DataView(bytes);if(view.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.byteLength)throw Error('Invalid GLB 2.0 header');
 let json,bin;for(let o=12;o<bytes.byteLength;){let len=view.getUint32(o,true),type=view.getUint32(o+4,true);if(o+8+len>bytes.byteLength)throw Error('Truncated GLB chunk');const chunk=bytes.slice(o+8,o+8+len);if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(chunk));if(type===0x004e4942)bin=chunk;o+=8+len;}
 if(!json||!bin)throw Error('GLB requires JSON and BIN');return parse(json,bin);
}
function parse(g,bin){
 if(g.asset?.version!=='2.0'||g.extensionsRequired?.length)throw Error('Unsupported glTF format/extensions');
 const size={5126:4,5125:4,5123:2,5121:1},width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};const view=new DataView(bin);
 function access(id){const a=g.accessors[id];if(!a||a.sparse||a.normalized)throw Error('Unsupported accessor');const b=g.bufferViews[a.bufferView],k=width[a.type],cs=size[a.componentType];if(!b||b.buffer!==0||!k||!cs)throw Error('Unsupported accessor layout');const offset=(b.byteOffset||0)+(a.byteOffset||0),stride=b.byteStride||k*cs;
  if(offset+(a.count-1)*stride+k*cs>bin.byteLength)throw Error('Accessor outside buffer');const get={5126:'getFloat32',5125:'getUint32',5123:'getUint16',5121:'getUint8'}[a.componentType];return Array.from({length:a.count},(_,i)=>Array.from({length:k},(_,j)=>view[get](offset+i*stride+j*cs,true)));}
 const parts=[];
 function visit(id,parent,stack){if(stack.has(id))throw Error('Cyclic nodes');stack=new Set(stack);stack.add(id);const n=g.nodes[id],m=mul(parent,matrix(n));if(n.skin!==undefined)throw Error('Skinned meshes require a rig adapter');
  if(n.mesh!==undefined)for(const p of g.meshes[n.mesh].primitives){if((p.mode??4)!==4)throw Error('Only triangles supported');const pos=access(p.attributes.POSITION),norm=p.attributes.NORMAL===undefined?null:access(p.attributes.NORMAL),indices=p.indices===undefined?pos.map((_,i)=>i):access(p.indices).map(x=>x[0]);const mat=g.materials?.[p.material],color=mat?.pbrMetallicRoughness?.baseColorFactor||[1,1,1,1];if(mat?.pbrMetallicRoughness?.baseColorTexture)throw Error('V1 adapter requires color-only materials');
   const inverseNormal=[m[5]*m[10]-m[6]*m[9],m[6]*m[8]-m[4]*m[10],m[4]*m[9]-m[5]*m[8],m[9]*m[2]-m[10]*m[1],m[10]*m[0]-m[8]*m[2],m[8]*m[1]-m[9]*m[0],m[1]*m[6]-m[2]*m[5],m[2]*m[4]-m[0]*m[6],m[0]*m[5]-m[1]*m[4]];
   const determinant=m[0]*inverseNormal[0]+m[1]*inverseNormal[1]+m[2]*inverseNormal[2];if(Math.abs(determinant)<1e-10)throw Error('Singular node transform');const arr=[];
   for(let i=0;i<indices.length;i+=3){const tri=indices.slice(i,i+3).map(j=>{if(!pos[j])throw Error('Invalid index');const [x,y,z]=pos[j];return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]]});let fn;
    if(!norm){const a=tri[1].map((x,k)=>x-tri[0][k]),b=tri[2].map((x,k)=>x-tri[0][k]);fn=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
    for(let k=0;k<3;k++){const q=norm?norm[indices[i+k]]:fn;let nn=norm?[inverseNormal[0]*q[0]+inverseNormal[3]*q[1]+inverseNormal[6]*q[2],inverseNormal[1]*q[0]+inverseNormal[4]*q[1]+inverseNormal[7]*q[2],inverseNormal[2]*q[0]+inverseNormal[5]*q[1]+inverseNormal[8]*q[2]].map(x=>x/determinant):q;const len=Math.hypot(...nn)||1;nn=nn.map(x=>x/len);arr.push(...tri[k],...nn,...color.slice(0,3).map(srgb),color[3]??1);}
   }parts.push({name:n.name||'mesh',data:new Float32Array(arr)});
  }for(const child of n.children||[])visit(child,m,stack);
 }for(const id of g.scenes[g.scene??0].nodes)visit(id,identity(),new Set());return {parts,triangles:parts.reduce((s,p)=>s+p.data.length/30,0)};
}
function compile(model,{fruit=true}={}){const parts=model.parts.filter(p=>fruit||!p.name.startsWith('fruit-')),n=parts.reduce((s,p)=>s+p.data.length,0),a=new Float32Array(n);let o=0;for(const p of parts){a.set(p.data,o);o+=p.data.length;}return a;}
function append(target,data,x=0,y=0,z=0,s=1,angle=0){const c=Math.cos(angle),sn=Math.sin(angle);for(let i=0;i<data.length;i+=10){const px=data[i],pz=data[i+2],nx=data[i+3],nz=data[i+5];target.push(x+s*(px*c+pz*sn),y+s*data[i+1],z+s*(-px*sn+pz*c),nx*c+nz*sn,data[i+4],-nx*sn+nz*c,data[i+6],data[i+7],data[i+8],data[i+9]);}}
async function load(base='assets/art-v1/'){const names=['house','tree','apple-tree','sheep','plot-tilled','plot-locked'],out={};await Promise.all(names.map(async name=>{const r=await fetch(base+name+'.glb');if(!r.ok)throw Error(name+': HTTP '+r.status);const model=parseGLB(await r.arrayBuffer());out[name]={model,full:compile(model),bare:compile(model,{fruit:false})};}));return out;}
root.FarmArtV1={parseGLB,parse,compile,append,load};
})(typeof window==='undefined'?globalThis:window);
