"""Original animal sculpt surfaces. Continuous fleece, curved legs, integrated pied coat.
Numpy only. Named meshes remain editable; no textures or third-party models.
"""
import numpy as np
import math
DETAIL=1.0

def color(hex):
 a=np.array([int(hex[i:i+2],16)/255 for i in (1,3,5)])
 return np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4)

def smooth(m,name,v,t,col,vc=None,center=None):
 v=np.asarray(v,dtype=np.float32);t=np.asarray(t,dtype=np.uint16)
 fn=np.cross(v[t[:,1]]-v[t[:,0]],v[t[:,2]]-v[t[:,0]])
 if center is not None and np.sum(fn*(v[t].mean(axis=1)-center))<0:
  t=t[:,[0,2,1]];fn=-fn
 n=np.zeros_like(v)
 for k in range(3):np.add.at(n,t[:,k],fn)
 n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-8)
 if vc is not None:vc=np.column_stack([vc,np.ones(len(v))]).astype(np.float32)
 m.part(name,v,t,col,n,vc)

def sculpt(m,name,c,r,col,rows=14,cols=24,exponent=1,deform=None,paint=None):
 rows=max(5,round(rows*DETAIL));cols=max(8,round(cols*DETAIL))
 unit=[[0,1,0]]
 for j in range(1,rows):
  a=math.pi*j/rows
  for k in range(cols):
   b=2*math.pi*k/cols;unit.append([math.sin(a)*math.cos(b),math.cos(a),math.sin(a)*math.sin(b)])
 unit.append([0,-1,0]);u=np.array(unit);v=np.sign(u)*np.abs(u)**exponent*np.array(r)
 if deform is not None:v=deform(v,u)
 v+=np.array(c);t=[];bottom=len(v)-1
 for k in range(cols):t.append([0,1+(k+1)%cols,1+k])
 for j in range(rows-2):
  for k in range(cols):
   a=1+j*cols+k;b=1+j*cols+(k+1)%cols;d=a+cols;e=b+cols;t.extend([[a,b,e],[a,e,d]])
 for k in range(cols):t.append([bottom,1+(rows-2)*cols+k,1+(rows-2)*cols+(k+1)%cols])
 smooth(m,name,v,t,'#ffffff' if paint else col,paint(v,u) if paint else None,np.array(c))

def catmull(points,sub=3):
 p=np.array(points,dtype=float);out=[]
 for i in range(len(p)-1):
  a=p[max(0,i-1)];b=p[i];c=p[i+1];d=p[min(len(p)-1,i+2)]
  for j in range(sub):
   q=j/sub;out.append(.5*((2*b)+(-a+c)*q+(2*a-5*b+4*c-d)*q*q+(-a+3*b-3*c+d)*q**3))
 out.append(p[-1]);return np.array(out)

def tube(m,name,points,radii,col,cols=9,sub=3,flatten=1):
 cols=max(6,round(cols*DETAIL));sub=max(2,round(sub*DETAIL))
 p=catmull(points,sub);rs=np.maximum(.002,catmull(np.array(radii)[:,None],sub).reshape(-1));v=[]
 for i,(q,r) in enumerate(zip(p,rs)):
  axis=p[min(i+1,len(p)-1)]-p[max(0,i-1)];axis/=np.linalg.norm(axis)
  up=np.array([0,0,1]) if abs(axis[2])<.8 else np.array([1,0,0]);u=np.cross(axis,up);u/=np.linalg.norm(u);w=np.cross(axis,u)
  for k in range(cols):a=k*math.tau/cols;v.append(q+r*(u*math.cos(a)+w*math.sin(a)*flatten))
 v.extend([p[0],p[-1]]);t=[]
 for j in range(len(p)-1):
  for k in range(cols):
   a=j*cols+k;b=j*cols+(k+1)%cols;c=b+cols;d=a+cols;t.extend([[a,b,c],[a,c,d]])
 for k in range(cols):t.extend([[len(v)-2,(k+1)%cols,k],[len(v)-1,(len(p)-1)*cols+k,(len(p)-1)*cols+(k+1)%cols]])
 smooth(m,name,v,t,col,center=p.mean(axis=0))

def fleece(v,u):
 # Many small coherent swells share one closed surface. No stacked wool balls.
 dirs=[]
 for i in range(55):
  y=1-2*(i+.5)/55;a=i*2.399963;r=math.sqrt(1-y*y);dirs.append([r*math.cos(a),y,r*math.sin(a)])
 d=((u[:,None,:]-np.array(dirs)[None,:,:])**2).sum(axis=2)
 bumps=np.exp(-d/.026).sum(axis=1)
 phase=1.4*u[:,0]+.9*u[:,2]
 amplitude=1+.083*bumps+.012*np.sin(24*phase)*np.sin(19*u[:,1])
 return v*amplitude[:,None]

def hooves(m,prefix,x,z,y=.09,size=.11):
 for sign in [-1,1]:
  sculpt(m,prefix+'-toe-'+str(sign),(x+sign*size*.39,y,z+.025),(size*.37,y*.83,size*1.12),'#615c50',7,12,exponent=.56)

def conformal_patch(m,name,direction,radius,mapper,center,col):
 # A thin coat surface follows the body exactly, with a smooth spline-like edge.
 # No stacked blobs and no vertex-color triangle artifacts at patch boundaries.
 rows=max(3,round(5*DETAIL));cols=max(16,round(36*DETAIL))
 d=np.array(direction,dtype=float);d/=np.linalg.norm(d)
 tangent=np.cross(d,[0,1,0] if abs(d[1])<.9 else [1,0,0]);tangent/=np.linalg.norm(tangent);other=np.cross(d,tangent)
 unit=[d]
 for j in range(1,rows+1):
  for k in range(cols):
   a=k*math.tau/cols;edge=radius*(1+.075*math.cos(3*a+.4)+.045*math.sin(5*a))
   rho=edge*j/rows;unit.append(d*math.cos(rho)+(tangent*math.cos(a)+other*math.sin(a))*math.sin(rho))
 u=np.array(unit);v=mapper(u)+u*.0025;t=[]
 for k in range(cols):t.append([0,1+k,1+(k+1)%cols])
 for j in range(rows-1):
  for k in range(cols):
   a=1+j*cols+k;b=1+j*cols+(k+1)%cols;t.extend([[a,b,b+cols],[a,b+cols,a+cols]])
 smooth(m,name,v,t,col,center=np.array(center))

def sheep(Model):
 m=Model('sheep')
 sculpt(m,'continuous-sculpted-fleece',(0,.79,-.035),(.53,.43,.68),'#fff4df',32,54,.94,fleece)
 for i,(x,z) in enumerate([(-.26,-.31),(.26,-.31),(-.26,.28),(.26,.28)]):
  # Hidden fleshy upper leg -> knee -> tapered ankle. Short, curved lamb legs.
  tube(m,'shaped-leg-'+str(i),[(x,.58,z),(x*1.035,.40,z-.025),(x*1.08,.25,z+.025),(x*1.03,.13,z+.04)],[.105,.084,.055,.062],'#e0ccb2',10,3)
  hooves(m,'split-hoof-'+str(i),x*1.03,z+.04,size=.092)
 def face(v,u):
  v[:,0]*=1+.12*u[:,1];v[:,2]+=.085*(1-u[:,1])*.5*np.maximum(0,u[:,2]);return v
 sculpt(m,'face-and-jaw',(0,.88,.65),(.245,.29,.26),'#cfb295',16,28,.89,face)
 for sign in [-1,1]:
  def ear(v,u,sign=sign):v[:,0]*=sign;v[:,1]-=.32*(v[:,0]*sign+.16);v[:,2]+=.08*u[:,0]**2;return v
  sculpt(m,'soft-drooping-ear-'+str(sign),(sign*.31,1.026,.59),(.205,.058,.108),'#d2b394',10,18,.95,ear)
  sculpt(m,'ear-lining-'+str(sign),(sign*.35,1.037,.665),(.116,.023,.047),'#eab4a3',8,16)
  sculpt(m,'eye-'+str(sign),(sign*.145,.964,.868),(.042,.054,.024),'#30372f',9,16)
  sculpt(m,'eye-highlight-'+str(sign),(sign*.138,.984,.89),(.010,.014,.006),'#fffef4',6,10)
  sculpt(m,'gentle-cheek-'+str(sign),(sign*.173,.84,.873),(.035,.018,.009),'#e6b4a1',7,12)
  tube(m,'eyebrow-'+str(sign),[(sign*.10,1.041,.858),(sign*.142,1.055,.86),(sign*.18,1.042,.835)],[.008,.011,.005],'#987f69',6,2)
 sculpt(m,'sculpted-forelock',(0,1.096,.606),(.248,.137,.245),'#fff4df',14,26,.9,fleece)
 sculpt(m,'small-heart-nose',(0,.80,.966),(.037,.024,.018),'#796556',8,14,.8)
 tube(m,'mouth-center',[(0,.786,.967),(0,.758,.962)],[.004,.004],'#90745f',5,2)
 for sign in [-1,1]:tube(m,'mouth-smile-'+str(sign),[(0,.758,.962),(sign*.035,.751,.95),(sign*.052,.766,.945)],[.004,.004,.003],'#90745f',5,2)
 sculpt(m,'wool-tail',(0,.80,-.71),(.123,.135,.17),'#fff4df',12,20,.95,fleece)
 return m

def cow(Model):
 m=Model('cow')
 def body(v,u):
  v[:,0]*=(.93+.09*np.cos(u[:,2]*math.pi));v[:,1]-=.035*(1-u[:,1]**2);return v
 def pied(v,u):
  spots=[(.91,.10,-.43,.46),(-.88,.20,.28,.48),(.08,.97,-.2,.48),(.68,.55,.55,.32),(-.65,.55,-.72,.34)]
  dark=np.zeros(len(v))
  for x,y,z,r in spots:
   d=np.linalg.norm(u-np.array([x,y,z]),axis=1);edge=r+.023*np.sin(6*u[:,1]+5*u[:,2]);dark=np.maximum(dark,np.clip((edge-d)/.075+.5,0,1))
  return color('#fff1d9')[None,:]*(1-dark[:,None])+color('#484d42')[None,:]*dark[:,None]
 sculpt(m,'sculpted-shoulders-belly',(0,.99,-.04),(.66,.50,.86),'#fff1d9',30,54,.88,body)
 def bodymap(u):return body(np.sign(u)*np.abs(u)**.88*np.array([.66,.50,.86]),u)+[0,.99,-.04]
 for i,(direction,radius) in enumerate([((.91,.10,-.43),.47),((-.88,.20,.28),.49),((.08,.97,-.2),.46),((.68,.55,.55),.30),((-.65,.55,-.72),.33)]):
  conformal_patch(m,'flush-coat-marking-'+str(i),direction,radius,bodymap,(0,.99,-.04),'#484d42')
 for i,(x,z) in enumerate([(-.36,-.49),(.36,-.49),(-.33,.43),(.33,.43)]):
  tube(m,'curved-leg-'+str(i),[(x,.88,z),(x*1.03,.57,z-.028),(x,.35,z+.045),(x,.16,z+.05)],[.15,.105,.065,.077],'#ecdfc8',10,3)
  hooves(m,'cloven-hoof-'+str(i),x,z+.05,.105,.12)
 def head(v,u):v[:,0]*=(1+.12*u[:,1]);v[:,2]+=.04*(1-u[:,1])*np.maximum(u[:,2],0);return v
 def headpaint(v,u):
  d=np.clip((u[:,0]+.11)/.2,0,1)*np.clip((u[:,1]+.10)/.25,0,1)
  return color('#fff1d9')[None,:]*(1-d[:,None])+color('#555b4e')[None,:]*d[:,None]
 sculpt(m,'head-and-forehead',(0,1.28,.77),(.35,.37,.31),'#fff1d9',16,28,.85,head)
 def headmap(u):return head(np.sign(u)*np.abs(u)**.85*np.array([.35,.37,.31]),u)+[0,1.28,.77]
 conformal_patch(m,'forehead-coat-marking',(.7,.7,.25),.69,headmap,(0,1.28,.77),'#555b4e')
 sculpt(m,'soft-pink-muzzle',(0,1.08,1.043),(.33,.205,.255),'#e9b7a1',14,28,.72)
 for sign in [-1,1]:
  def ear(v,u,sign=sign):v[:,0]*=sign;v[:,1]-=.23*(v[:,0]*sign+.19);return v
  sculpt(m,'ear-'+str(sign),(sign*.39,1.437,.75),(.255,.085,.145),'#e9d9ba',10,18,.9,ear)
  sculpt(m,'ear-interior-'+str(sign),(sign*.46,1.435,.829),(.15,.04,.075),'#dfad97',8,16)
  tube(m,'curved-horn-'+str(sign),[(sign*.21,1.57,.69),(sign*.29,1.67,.68),(sign*.27,1.76,.72),(sign*.22,1.81,.76)],[.066,.057,.035,.005],'#dfd4ad',10,3)
  sculpt(m,'eye-ivory-sclera-'+str(sign),(sign*.20,1.356,1.091),(.083,.092,.052),'#fffaf0',9,16)
  sculpt(m,'eye-'+str(sign),(sign*.20,1.355,1.146),(.052,.073,.034),'#252f26',9,16)
  sculpt(m,'eye-sparkle-'+str(sign),(sign*.188,1.377,1.171),(.012,.017,.008),'#fffef1',6,10)
  sculpt(m,'nostril-'+str(sign),(sign*.143,1.102,1.291),(.037,.025,.010),'#9d7664',7,14,.8)
 tube(m,'muzzle-smile',[(-.12,1.003,1.276),(0,.982,1.30),(.12,1.003,1.276)],[.007,.007,.007],'#b88a74',7,3)
 # Anchor extends inside rump; eliminates apparent tail detachment from side/rear views.
 tube(m,'tail-root-connected',[(0,1.24,-.66),(.030,1.255,-.79),(.10,1.17,-.94)],[.085,.065,.037],'#dbc9aa',12,2)
 tube(m,'curving-tail',[(0,1.29,-.79),(.12,1.13,-.99),(.18,.87,-1.03),(.13,.70,-1.06)],[.033,.026,.024,.023],'#dbc9aa',8,3)
 sculpt(m,'tail-tuft',(.13,.645,-1.06),(.068,.13,.069),'#535347',10,16,.86)
 return m

def feather(m,name,base,tip,width,col):
 base=np.array(base);tip=np.array(tip);mid=(base+tip)*.5
 # A tapered, bowed feather volume rather than a row of ball primitives.
 axis=tip-base;length=np.linalg.norm(axis);axis/=length
 up=np.array([1,0,0]);side=np.cross(axis,up)
 if np.linalg.norm(side)<.1:side=np.cross(axis,[0,0,1])
 side/=np.linalg.norm(side);normal=np.cross(side,axis)
 def shape(v,u):
  return v[:,1,None]*axis+v[:,0,None]*side+v[:,2,None]*normal+.035*(1-u[:,1]**2)[:,None]*normal
 sculpt(m,name,mid,(width,length*.57,width*.18),col,10,16,.9,shape)

def chicken(Model):
 m=Model('chicken')
 # Loft body and neck as one curved pear silhouette.
 controls=[(.16,.012,.012,0),(.24,.20,.20,-.02),(.38,.31,.28,-.055),(.54,.31,.29,-.04),(.69,.225,.205,.04),(.81,.168,.17,.15),(.94,.17,.165,.185),(1.04,.09,.09,.18),(1.06,.005,.005,.18)]
 rings=catmull(controls,max(2,round(3*DETAIL)));cols=max(12,round(28*DETAIL));v=[]
 for y,rx,rz,z in rings:
  for j in range(cols):a=j*math.tau/cols;v.append([max(.003,rx)*math.cos(a),y,z+max(.003,rz)*math.sin(a)])
 v.extend([[0,rings[0,0],rings[0,3]],[0,rings[-1,0],rings[-1,3]]]);t=[]
 for i in range(len(rings)-1):
  for j in range(cols):a=i*cols+j;b=i*cols+(j+1)%cols;t.extend([[a,b,b+cols],[a,b+cols,a+cols]])
 for j in range(cols):t.extend([[len(v)-2,(j+1)%cols,j],[len(v)-1,(len(rings)-1)*cols+j,(len(rings)-1)*cols+(j+1)%cols]])
 smooth(m,'continuous-body-neck',v,t,'#fff2d9',center=np.array([0,.53,0]))
 for sign in [-1,1]:
  def wing(v,u,sign=sign):v[:,0]*=sign;v[:,2]*=(.84+.22*u[:,1]);v[:,1]+=.25*v[:,2];v[:,2]-=.07*(1-u[:,1]);return v
  sculpt(m,'sculpted-wing-'+str(sign),(sign*.277,.48,-.065),(.078,.198,.227),'#eed8b4',12,20,.85,wing)
  for j in range(3):
   uy=-.36+j*.20;uz=np.array([-.62,-.25,.12,.44]);ux=np.sqrt(1-uy*uy-uz*uz)
   u=np.column_stack([ux,np.full(4,uy),uz]);v=np.sign(u)*np.abs(u)**.85*np.array([.078,.198,.227]);v=wing(v,u)+[sign*.277,.48,-.065];v[:,0]+=sign*.002
   tube(m,'wing-feather-groove-'+str(sign)+'-'+str(j),v.tolist(),[.003,.003,.003,.0015],'#d7bd94',5,2)
  tube(m,'ankle-'+str(sign),[(sign*.11,.25,.04),(sign*.11,.14,.07),(sign*.11,.065,.10)],[.025,.021,.025],'#db9d57',8,3)
  for j in [-1,0,1]:tube(m,'foot-toe-'+str(sign)+'-'+str(j),[(sign*.11,.061,.10),(sign*.11+j*.044,.05,.19),(sign*.11+j*.058,.043,.245)],[.018,.013,.007],'#d2954e',7,3)
  tube(m,'back-claw-'+str(sign),[(sign*.11,.06,.10),(sign*.13,.05,-.035)],[.014,.005],'#d2954e',7,3)
  sculpt(m,'eye-'+str(sign),(sign*.106,.909,.327),(.028,.038,.024),'#2c342c',8,14)
  sculpt(m,'eye-sparkle-'+str(sign),(sign*.102,.92,.345),(.008,.011,.005),'#ffffee',5,10)
  sculpt(m,'wattle-'+str(sign),(sign*.043,.745,.331),(.04,.073,.025),'#d97c65',9,14,.83)
 # Rounded wedge beak split into upper and lower halves; oriented forward.
 sculpt(m,'upper-beak',(0,.814,.361),(.081,.053,.114),'#e1aa58',10,18,.70,lambda v,u:np.column_stack([v[:,0]*(1-.35*u[:,2]),v[:,1],v[:,2]]))
 tube(m,'beak-seam',[(-.065,.796,.413),(0,.79,.465),(.065,.796,.413)],[.003,.004,.003],'#b58140',5,2)
 # Single continuous comb with a flowing scalloped crest.
 sculpt(m,'scalloped-comb',(0,1.053,.17),(.045,.103,.176),'#d77965',14,24,.80,lambda v,u:np.column_stack([v[:,0],v[:,1]*(1+.20*np.cos(3*math.pi*u[:,2]))*(.9+.1*u[:,1]),v[:,2]]))
 for j in range(5):
  off=(j-2)*.063;feather(m,'tail-feather-'+str(j),(off*.6,.48,-.24),(off, .69+.12*(1-abs(j-2)/2),-.49-.03*(1-abs(j-2)/2)),.083,'#d8bb8d' if j%2 else '#efdbb7')
 # Fit the prior chicken hit volume and the small farm proportions.
 for i,p in enumerate(m.parts):name,v,t,n,col,vc=p;m.parts[i]=(name,v*.82,t,n,col,vc)
 return m

def build_animals(Model):
 global DETAIL
 DETAIL=1.0;high=[sheep(Model),cow(Model),chicken(Model)]
 DETAIL=.55;low=[sheep(Model),cow(Model),chicken(Model)]
 for m in low:m.name+='-lod'
 DETAIL=1.0;return high+low
