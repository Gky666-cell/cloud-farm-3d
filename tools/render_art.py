"""CPU z-buffer previews from the game's imported float32 streams; no imagegen.
Run tests first; outputs are model renders, never browser screenshots.
"""
from pathlib import Path
import math,json
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/previews';OUT.mkdir(parents=True,exist_ok=True)
def render(filename,w,h,yaw=-.65,elev=.4,margin=.12,limits=None):
 a=np.fromfile(ROOT/'tests'/filename,dtype=np.float32).reshape(-1,3,10)
 p=a[:,:,:3];c=math.cos(yaw);s=math.sin(yaw);se=math.sin(elev);ce=math.cos(elev)
 xx=p[:,:,0]*c+p[:,:,2]*s;dd=-p[:,:,0]*s+p[:,:,2]*c;yy=p[:,:,1]*ce-dd*se;zz=p[:,:,1]*se+dd*ce
 minx,maxx,miny,maxy=(xx.min(),xx.max(),yy.min(),yy.max()) if limits is None else limits
 scale=min(w*(1-2*margin)/(maxx-minx),h*(1-2*margin)/(maxy-miny));px=(xx-(minx+maxx)/2)*scale+w/2;py=-(yy-(miny+maxy)/2)*scale+h/2
 screen=np.stack([px,py,zz],axis=2)
 im=np.zeros((h,w,3),dtype=np.float32);im[:]=[235,241,222];depth=np.full((h,w),-np.inf)
 light=np.array([-.55,.9,.65]);light/=np.linalg.norm(light)
 shade=.72+.30*np.maximum(0,(a[:,:,3:6]*light).sum(axis=2));colors=np.minimum(255,a[:,:,6:9]*shade[:,:,None]*255)
 for t,col in zip(screen,colors):
  x0=max(0,int(np.floor(t[:,0].min())));x1=min(w-1,int(np.ceil(t[:,0].max())));y0=max(0,int(np.floor(t[:,1].min())));y1=min(h-1,int(np.ceil(t[:,1].max())))
  if x0>x1 or y0>y1:continue
  den=(t[1,1]-t[2,1])*(t[0,0]-t[2,0])+(t[2,0]-t[1,0])*(t[0,1]-t[2,1])
  if abs(den)<1e-8:continue
  X,Y=np.meshgrid(np.arange(x0,x1+1)+.5,np.arange(y0,y1+1)+.5)
  b0=((t[1,1]-t[2,1])*(X-t[2,0])+(t[2,0]-t[1,0])*(Y-t[2,1]))/den;b1=((t[2,1]-t[0,1])*(X-t[2,0])+(t[0,0]-t[2,0])*(Y-t[2,1]))/den;b2=1-b0-b1
  d=b0*t[0,2]+b1*t[1,2]+b2*t[2,2];mask=(b0>=-1e-6)&(b1>=-1e-6)&(b2>=-1e-6)&(d>depth[y0:y1+1,x0:x1+1]);rgb=b0[:,:,None]*col[0]+b1[:,:,None]*col[1]+b2[:,:,None]*col[2]
  depth[y0:y1+1,x0:x1+1][mask]=d[mask];im[y0:y1+1,x0:x1+1][mask]=rgb[mask]
 return Image.fromarray(np.clip(im,0,255).astype('uint8'))
if __name__=='__main__':
 names=['house','tree','apple-tree','sheep','plot-tilled','plot-locked'];sheet=Image.new('RGB',(1500,1020),'#f8f8ed');draw=ImageDraw.Draw(sheet)
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',23)
 for i,n in enumerate(names):
  image=render(n+'.f32',480,430);image.save(OUT/(n+'.png'));x=10+(i%3)*500;y=50+(i//3)*490;sheet.paste(image,(x,y));draw.text((x+16,y+439),n.replace('-',' ').upper(),font=font,fill='#436350')
 draw.text((26,14),'CLOUD FARM / ORIGINAL 3D ART V1',font=font,fill='#436350');sheet.save(OUT/'art-v1-lineup.png')
 # Same projection angle as the actual game. Framing is computed from mesh bounds.
 for scene in ['island','sheep','cow','coop','orchard']:
  image=render('scene-'+scene+'.f32',720,1050,yaw=-math.pi/4,elev=.77,margin=.03);image.save(OUT/('game-'+scene+'-mesh.png'))
 animal_sheet=Image.new('RGB',(1500,590),'#f8f7ed');ad=ImageDraw.Draw(animal_sheet)
 for i,n in enumerate(['sheep','cow','chicken']):
  image=render(n+'.f32',480,480);image.save(OUT/(n+'.png'));animal_sheet.paste(image,(10+i*500,52));ad.text((30+i*500,545),n.upper()+' / V1.1',font=font,fill='#426050')
 ad.text((24,12),'CLOUD FARM / ANIMAL SCULPT REBUILD',font=font,fill='#426050');animal_sheet.save(OUT/'animals-v1-1.png')
 for n in ['sheep','cow','chicken']:
  image=render(n+'.f32',700,650,yaw=2.55,elev=.32);image.save(OUT/(n+'-rear.png'))
 print('Rendered actual imported assets and game scene buffers to',OUT)
