"""Original Cloud Farm V1 meshes. Python 3 + numpy; no downloaded models.
Edit palette/specs or named parts here, then python3 tools/build_art.py.
Y up, +Z front, ground pivot, metre-like game units. glTF 2.0 + GLB.
"""
from pathlib import Path
import json, math, struct, base64
import numpy as np

OUT=Path(__file__).resolve().parents[1]/'assets/art-v1'
P={'cream':'#f8e7cb','trim':'#fef6df','wood':'#ae7957','darkwood':'#765441','roof':'#cb7e78','rooflight':'#e49b88','glass':'#8ebdb7','stone':'#c6baa0','green':'#72ae7b','lightgreen':'#93c68b','deepgreen':'#538a68','apple':'#e77566','wool':'#fff3df','face':'#b2927f','pink':'#e9b4a3','eye':'#383c36','soil':'#967054','furrow':'#b58a62'}

class Model:
 def __init__(self,name): self.name=name;self.parts=[]
 def part(self,name,v,t,color,n=None):
  v=np.asarray(v,dtype=np.float32);t=np.asarray(t,dtype=np.uint16)
  if n is None:
   a=v[t[:,1]]-v[t[:,0]];b=v[t[:,2]]-v[t[:,0]];normal=np.cross(a,b);ln=np.linalg.norm(normal,axis=1);normal/=np.maximum(ln[:,None],1e-8)
   v=v[t].reshape(-1,3);n=np.repeat(normal,3,axis=0);t=np.arange(len(v),dtype=np.uint16).reshape(-1,3)
  self.parts.append((name,v,t,np.asarray(n,dtype=np.float32),P.get(color,color)))
 def box(self,name,c,s,color):
  x,y,z=c;w,h,d=np.array(s)/2
  v=[[x+dx*w,y+dy*h,z+dz*d] for dx,dy,dz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
  self.part(name,v,[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[3,7,6],[3,6,2],[0,4,7],[0,7,3],[1,2,6],[1,6,5]],color)
 def ell(self,name,c,s,color,rows=5,cols=10):
  # Pole fan avoids degenerate triangles; smooth ellipsoid normals.
  v=[[0,1,0]]
  for j in range(1,rows):
   a=math.pi*j/rows
   for k in range(cols):
    b=2*math.pi*k/cols;v.append([math.sin(a)*math.cos(b),math.cos(a),math.sin(a)*math.sin(b)])
  v.append([0,-1,0]);bottom=len(v)-1;t=[]
  for k in range(cols):t.append([0,1+(k+1)%cols,1+k])
  for j in range(rows-2):
   for k in range(cols):
    a=1+j*cols+k;b=1+j*cols+(k+1)%cols;d=a+cols;e=b+cols;t.extend([[a,b,e],[a,e,d]])
  for k in range(cols):t.append([bottom,1+(rows-2)*cols+k,1+(rows-2)*cols+(k+1)%cols])
  unit=np.array(v);normal=unit/np.array(s);normal/=np.linalg.norm(normal,axis=1)[:,None]
  self.part(name,unit*np.array(s)+np.array(c),t,color,normal)
 def beam(self,name,a,b,r,color,n=8,rt=None):
  a=np.array(a);b=np.array(b);axis=b-a;axis=axis/np.linalg.norm(axis);u=np.cross(axis,[0,0,1] if abs(axis[2])<.9 else [1,0,0]);u/=np.linalg.norm(u);w=np.cross(axis,u);v=[]
  for end,rr in [(a,r),(b,r if rt is None else rt)]:
   for j in range(n):v.append(end+rr*(u*math.cos(j*2*math.pi/n)+w*math.sin(j*2*math.pi/n)))
  v.extend([a,b]);t=[]
  for j in range(n):k=(j+1)%n;t.extend([[j,k,k+n],[j,k+n,j+n],[2*n,k,j],[2*n+1,j+n,k+n]])
  self.part(name,v,t,color)
 def export(self):
  data=bytearray();views=[];access=[];mats=[];meshes=[];nodes=[{'name':self.name,'children':[]}]
  def acc(a,typ,ct):
   while len(data)%4:data.append(0)
   offset=len(data);data.extend(a.tobytes());views.append({'buffer':0,'byteOffset':offset,'byteLength':a.nbytes})
   d={'bufferView':len(views)-1,'componentType':ct,'count':len(a),'type':typ}
   if typ=='VEC3':d.update(min=a.min(axis=0).tolist(),max=a.max(axis=0).tolist())
   access.append(d);return len(access)-1
  for name,v,t,n,col in self.parts:
   if col not in [m['name'] for m in mats]:
    rgb=[int(col[i:i+2],16)/255 for i in (1,3,5)];rgb=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb];mats.append({'name':col,'pbrMetallicRoughness':{'baseColorFactor':rgb+[1],'metallicFactor':0,'roughnessFactor':.85}})
   primitive={'attributes':{'POSITION':acc(v,'VEC3',5126),'NORMAL':acc(n,'VEC3',5126)},'indices':acc(t.reshape(-1),'SCALAR',5123),'material':[m['name'] for m in mats].index(col)}
   meshes.append({'name':name,'primitives':[primitive]});nodes.append({'name':name,'mesh':len(meshes)-1});nodes[0]['children'].append(len(nodes)-1)
  g={'asset':{'version':'2.0','generator':'Cloud Farm original procedural art V1'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':nodes,'meshes':meshes,'materials':mats,'accessors':access,'bufferViews':views,'buffers':[{'byteLength':len(data)}],'extras':{'author':'Gky666-cell/cloud-farm-3d','pivot':'ground centre','front':'+Z','units':'game metre','version':'1.0.0'}}
  js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4);data+=b'\0'*((-len(data))%4)
  glb=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(data))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(data),0x004e4942)+data
  OUT.mkdir(parents=True,exist_ok=True);(OUT/(self.name+'.glb')).write_bytes(glb)
  g['buffers'][0]['uri']='data:application/octet-stream;base64,'+base64.b64encode(data).decode();(OUT/(self.name+'.gltf')).write_text(json.dumps(g,separators=(',',':')))
  verts=np.concatenate([p[1] for p in self.parts]);return {'id':self.name,'triangles':sum(len(p[2]) for p in self.parts),'parts':len(self.parts),'bytes':len(glb),'min':verts.min(axis=0).tolist(),'max':verts.max(axis=0).tolist()}

def house():
 m=Model('house');m.box('stone-foundation',(0,.13,0),(2.75,.26,2.4),'stone');m.box('plaster-walls',(0,1.07,0),(2.48,1.7,2.16),'cream')
 for x in [-1.17,1.17]:m.box('corner-post-'+str(x),(x,1.08,1.105),(.10,1.72,.1),'wood')
 m.box('front-crossbeam',(0,1.83,1.11),(2.48,.12,.1),'wood');m.box('wall-base-trim',(0,.37,1.12),(2.5,.1,.09),'trim')
 # Solid roof planes and gables, all editable.
 m.part('gable-front',[[-1.24,1.91,1.08],[1.24,1.91,1.08],[0,2.98,1.08]],[[0,1,2]],'cream')
 m.part('gable-back',[[1.24,1.91,-1.08],[-1.24,1.91,-1.08],[0,2.98,-1.08]],[[0,1,2]],'cream')
 for sign in [-1,1]:
  m.part('roof-slope-'+str(sign),[[0,3.02,-1.38],[0,3.02,1.42],[sign*1.52,1.94,1.42],[sign*1.52,1.94,-1.38]],[[0,1,2],[0,2,3]] if sign>0 else [[0,2,1],[0,3,2]],'roof')
  m.beam('roof-fascia-'+str(sign),(0,3.025,1.43),(sign*1.52,1.94,1.43),.065,'rooflight',6)
  for j in range(1,5):
   x=sign*j*.295;y=3.02-abs(x)*1.08/1.52+.025
   m.beam('tile-row-'+str(sign)+'-'+str(j),(x,y,-1.38),(x,y,1.42),.022,'rooflight',5)
 for j in range(8):m.ell('ridge-cap-'+str(j),(0,3.04,-1.2+j*.35),(.12,.095,.20),'rooflight',3,8)
 m.box('chimney',(-.72,2.98,-.5),(.36,.9,.38),'cream');m.box('chimney-cap',(-.72,3.45,-.5),(.48,.1,.48),'wood');m.box('chimney-opening',(-.72,3.505,-.5),(.28,.011,.28),'darkwood')
 m.box('door-frame',(.2,.97,1.145),(.66,1.35,.12),'wood');m.box('sage-door',(.2,.94,1.216),(.5,1.16,.045),'deepgreen');m.ell('brass-knob',(.37,.93,1.254),(.036,.036,.025),'#e9ba71',4,8)
 for x in [-.78,.9]:
  m.box('window-frame-'+str(x),(x,1.26,1.15),(.48,.63,.1),'trim');m.box('window-glass-'+str(x),(x,1.26,1.209),(.36,.49,.035),'glass')
  m.box('window-mullion-'+str(x),(x,1.26,1.239),(.032,.50,.025),'trim');m.box('window-cross-'+str(x),(x,1.26,1.24),(.36,.03,.025),'trim')
  for dx in [-.3,.3]:m.box('shutter-'+str(x)+str(dx),(x+dx,1.26,1.16),(.10,.57,.08),'deepgreen')
  m.box('flower-box-'+str(x),(x,.89,1.27),(.56,.16,.24),'wood')
  for j in range(3):
   m.ell('planter-leaf-'+str(x)+str(j),(x-.18+j*.18,1.02,1.29),(.11,.10,.1),'green',3,7);m.ell('flower-'+str(x)+str(j),(x-.18+j*.18,1.10,1.32),(.045,.045,.045),'pink',3,6)
 for side in [-1,1]:
  x=side*1.255
  m.box('side-window-frame-'+str(side),(x,1.2,.03),(.09,.71,.72),'trim');m.box('side-window-glass-'+str(side),(x+side*.054,1.2,.03),(.025,.56,.56),'glass')
  m.box('side-window-mullion-'+str(side),(x+side*.074,1.2,.03),(.03,.57,.035),'trim');m.box('side-window-cross-'+str(side),(x+side*.075,1.2,.03),(.03,.035,.57),'trim')
  m.box('side-window-sill-'+str(side),(x, .82,.03),(.18,.09,.85),'wood')
 m.ell('attic-round-frame',(0,2.37,1.115),(.23,.23,.055),'trim',6,16);m.ell('attic-glass',(0,2.37,1.17),(.16,.16,.026),'glass',6,16)
 m.box('porch-deck',(.2,.19,1.64),(1.25,.19,.77),'wood')
 for j in range(2):m.box('step-'+str(j),(.2,.06+j*.045,2.2-j*.18),(.78,.12+j*.09,.28),'stone')
 for x in [-.38,.77]:m.beam('porch-post-'+str(x),(x,.27,1.92),(x,1.60,1.92),.045,'trim',6)
 m.part('porch-canopy',[[-.52,1.74,1.11],[.91,1.74,1.11],[.91,1.55,2.05],[-.52,1.55,2.05]],[[0,1,2],[0,2,3]],'roof')
 m.ell('doorstep-pot',(-1.11,.31,1.48),(.17,.22,.17),'roof',4,8);m.ell('pot-shrub',(-1.11,.59,1.48),(.24,.23,.24),'green',5,9)
 return m

def tree(apple=False):
 m=Model('apple-tree' if apple else 'tree');m.beam('trunk',(0,0,0),(.035,1.58,0),.17,'wood',9,.10)
 for i in range(4):
  a=i*math.pi/2+.3;m.beam('root-'+str(i),(0,.2,0),(.35*math.cos(a),.04,.35*math.sin(a)),.065,'wood',6,.025)
 lobes=[(-.46,1.75,.06,.48,.51,.47),(.42,1.91,.13,.54,.55,.47),(-.02,2.33,-.12,.64,.60,.56),(-.24,2.10,.44,.44,.45,.43),(.18,2.13,-.49,.47,.47,.44)]
 for i,(x,y,z,rx,ry,rz) in enumerate(lobes):
  m.beam('branch-'+str(i),(0,.9,0),(x,y-.12,z),.07,'wood',6,.035);m.ell('canopy-'+str(i),(x,y,z),(rx,ry,rz),['green','lightgreen','deepgreen','green','lightgreen'][i],6,11)
 if apple:
  for i,(x,y,z) in enumerate([(-.65,1.65,.29),(.67,1.82,.30),(-.14,2.2,.80),(.32,2.45,.39),(-.56,2.42,-.18),(.19,1.90,-.83),(.8,2.08,-.15)]):
   m.ell('fruit-apple-'+str(i),(x,y,z),(.13,.125,.12),'apple',5,9);m.beam('fruit-stem-'+str(i),(x,y+.10,z),(x+.014,y+.18,z),.018,'darkwood',5);m.ell('fruit-leaf-'+str(i),(x+.06,y+.15,z),(.07,.023,.035),'deepgreen',3,7)
 return m

def sheep():
 m=Model('sheep')
 for i,(x,z) in enumerate([(-.24,-.27),(.24,-.27),(-.24,.28),(.24,.28)]):
  m.beam('leg-'+str(i),(x,.12,z),(x,.62,z),.065,'face',7,.055);m.ell('hoof-'+str(i),(x,.105,z),(.095,.105,.1),'darkwood',4,8)
 m.ell('wool-body',(0,.79,0),(.53,.41,.64),'wool',7,14)
 for i,(x,y,z) in enumerate([(-.40,.87,-.3),(.40,.9,-.24),(-.38,.92,.26),(.38,.93,.3),(-.22,1.11,-.2),(.17,1.15,-.17),(-.2,1.15,.22),(.18,1.12,.27)]):m.ell('wool-curl-'+str(i),(x,y,z),(.19,.16,.19),'wool',4,8)
 m.ell('head',(0,.92,.62),(.25,.28,.28),'face',6,12);m.ell('muzzle',(0,.85,.81),(.20,.16,.18),'#ddbd9f',5,10)
 for sign in [-1,1]:
  m.ell('ear-'+str(sign),(sign*.29,1.10,.61),(.17,.07,.11),'face',4,9);m.ell('ear-inner-'+str(sign),(sign*.30,1.13,.645),(.105,.028,.065),'pink',3,8)
  m.ell('eye-'+str(sign),(sign*.12,1.02,.854),(.037,.044,.025),'eye',4,8);m.ell('eye-sparkle-'+str(sign),(sign*.115,1.035,.877),(.009,.012,.009),'#ffffff',3,6)
  m.ell('cheek-'+str(sign),(sign*.17,.91,.866),(.05,.025,.017),'pink',3,8)
 m.ell('nose',(0,.874,.984),(.045,.027,.015),'darkwood',3,8);m.ell('forelock',(0,1.17,.65),(.21,.12,.19),'wool',5,10);m.ell('tail',(0,.86,-.66),(.13,.16,.15),'wool',4,8)
 return m

def plot(locked=False):
 m=Model('plot-locked' if locked else 'plot-tilled');m.box('earth-block',(0,.055,0),(1.34,.11,1.34),'#a6ba91' if locked else 'soil')
 m.box('topsoil',(0,.14,0),(1.20,.06,1.20),'#bdd0a4' if locked else '#79573e')
 if locked:
  for i,(x,z) in enumerate([(-.35,-.3),(.34,.2),(-.1,.39)]):m.ell('stone-'+str(i),(x,.19,z),(.10,.07,.09),'stone',3,7)
  m.box('unlock-marker',(0,.25,-.55),(.2,.22,.07),'stone')
 else:
  for i in range(4):
   z=-.43+i*.285
   for j in range(3):m.ell('soil-ridge-'+str(i)+'-'+str(j),(-.38+j*.38,.175,z),(.24,.062,.075),'furrow',3,8)
  for i in range(4):m.ell('soil-crumb-'+str(i),(-.44+i*.29,.17,.59),(.028,.025,.028),'soil',3,6)
 return m

if __name__=='__main__':
 stats=[m.export() for m in [house(),tree(),tree(True),sheep(),plot(),plot(True)]]
 (OUT/'manifest.json').write_text(json.dumps({'version':'1.0.0','models':stats,'palette':P},indent=2));print(json.dumps(stats,indent=2))
