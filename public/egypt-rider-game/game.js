import * as THREE from 'three';

const $ = id => document.getElementById(id);
const canvas = $('game');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd8bd8b);
scene.fog = new THREE.Fog(0xd8bd8b, 155, 340);
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, .1, 620);
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
scene.add(new THREE.HemisphereLight(0xfff0d7,0x80613b,1.8));
const sun = new THREE.DirectionalLight(0xffe4b0,2.2);
sun.position.set(-75,105,55); sun.castShadow=true; sun.shadow.mapSize.set(3072,3072);
sun.shadow.camera.left=-80; sun.shadow.camera.right=80; sun.shadow.camera.top=80; sun.shadow.camera.bottom=-80; scene.add(sun);

const mat=(c,r=.88,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
const sand=mat(0xd7bc89), sand2=mat(0xe8d4aa), stone=mat(0xc7ad7d), darkStone=mat(0xa88657), water=mat(0x2098a3,.24,.08), gold=mat(0xffc32b,.25,.65), wood=mat(0x79512f), green=mat(0x528346), green2=mat(0x75934b), skin=mat(0x9c6748), hair=mat(0x2a1b16), kippah=mat(0x274d92), linen=mat(0xe0cda8), black=mat(0x25201d);
const world=new THREE.Group(); scene.add(world);
const blockers=[];
const buildingRects=[];
function box(parent,x,y,z,w,h,d,material,block=false){
 const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material); o.position.set(x,y+h/2,z); o.castShadow=true; o.receiveShadow=true; parent.add(o);
 if(block)blockers.push({x1:x-w/2-.45,x2:x+w/2+.45,z1:z-d/2-.45,z2:z+d/2+.45});
 return o;
}
function cyl(parent,x,y,z,rt,rb,h,material,n=8){
 const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,n),material);o.position.set(x,y+h/2,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function sphere(parent,x,y,z,sx,sy,sz,material){
 const o=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(260,220),sand);ground.rotation.x=-Math.PI/2;ground.position.y=-.12;ground.receiveShadow=true;world.add(ground);
for(let i=0;i<125;i++){const x=(Math.random()-.5)*245,z=(Math.random()-.5)*205; sphere(world,x,-.14,z,2+Math.random()*7,.12,.7+Math.random()*2.3,i%2?sand2:darkStone);}
function road(x,z,w,d){box(world,x,.005,z,w,.08,d,mat(0xb99a69));}
road(0,-2,95,5);road(0,-17,5,48);road(18,8,5,31);road(-29,0,4,67);
function wallX(z,x1,x2,gateCenter=null,gateWidth=0){for(let x=x1+2;x<x2;x+=4.2){if(gateCenter!==null&&Math.abs(x-gateCenter)<gateWidth/2)continue;box(world,x,0,z,4,.2,2.2,stone);box(world,x,2.35,z,3.7,2.4,1.9,darkStone);for(let s of [-1,1])box(world,x+s*1.25,3.55,z,.3,.25,2,sand2);}}
function wallZ(x,z1,z2){for(let z=z1+2;z<z2;z+=4.2){box(world,x,0,z,2,.2,4,stone);box(world,x,2.35,z,1.9,2.4,3.7,darkStone);for(let s of [-1,1])box(world,x,3.55,z,2,.25,.3,sand2);}}
wallX(-76,-102,102,0,15);wallX(76,-102,102);wallZ(-102,-76,76);wallZ(102,-76,76);
for(const x of [-9,9]){box(world,x,0,-76,4.5,5.2,4,darkStone);box(world,x,5.25,-76,5.2,.5,4.5,sand2);}
function waterRect(x,z,w,d){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,.12,d),water);m.position.set(x,.06,z);m.receiveShadow=true;world.add(m);
 for(const [xx,zz,ww,dd] of [[x-w/2,z,w+.5,.42],[x+w/2,z,w+.5,.42],[x,z-d/2,.42,d+.5],[x,z+d/2,.42,d+.5]])box(world,xx,.0,zz,ww,.48,dd,darkStone);
}
waterRect(-30,0,4.5,65);waterRect(17,1.5,7,10);waterRect(38,1.5,7,10);waterRect(39,-27,10,8);
const pyramidZones=[];
const pyramidStoneColors=[0xdcc28e,0xd3b77f,0xc9aa70,0xe4d0a2,0xbfa06b];
function pyramidPoint(a,b,apex,t,s){
 const base=new THREE.Vector3(...a).lerp(new THREE.Vector3(...b),s);
 return base.lerp(new THREE.Vector3(...apex),t);
}
function addPyramidFace(x,z,size,h,a,b,baseMaterial){
 const apex=[x,h,z];
 const A=[x+a[0]*size,0,z+a[1]*size],B=[x+b[0]*size,0,z+b[1]*size];
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([...A,...B,...apex],3));
 geometry.computeVertexNormals();
 const face=new THREE.Mesh(geometry,baseMaterial);
 face.material.side=THREE.DoubleSide;
 face.castShadow=true;face.receiveShadow=true;world.add(face);
 const center=new THREE.Vector3(x,h*.25,z);
 const faceCenter=new THREE.Vector3((A[0]+B[0]+apex[0])/3,(A[1]+B[1]+apex[1])/3,(A[2]+B[2]+apex[2])/3);
 const normal=faceCenter.sub(center).normalize();
 const positions=[],colors=[];
 const courses=19;
 for(let row=0;row<courses;row++){
  const t0=row/courses+.008,t1=(row+1)/courses-.009,avg=(t0+t1)*.5;
  const blocks=Math.max(1,Math.round((2*size*(1-avg))/1.45));
  for(let col=0;col<blocks;col++){
   const s0=col/blocks+.012,s1=(col+1)/blocks-.012;
   const pts=[pyramidPoint(A,B,apex,t0,s0),pyramidPoint(A,B,apex,t0,s1),pyramidPoint(A,B,apex,t1,s1),pyramidPoint(A,B,apex,t1,s0)];
   pts.forEach(p=>p.addScaledVector(normal,.035));
   const shade=.92+Math.random()*.13;
   const color=new THREE.Color(pyramidStoneColors[Math.floor(Math.random()*pyramidStoneColors.length)]).multiplyScalar(shade);
   const push=p=>{positions.push(p.x,p.y,p.z);colors.push(color.r,color.g,color.b);};
   push(pts[0]);push(pts[1]);push(pts[2]);push(pts[0]);push(pts[2]);push(pts[3]);
  }
 }
 const blocksGeometry=new THREE.BufferGeometry();
 blocksGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 blocksGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 blocksGeometry.computeVertexNormals();
 const blocksMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide});
 const blocksMesh=new THREE.Mesh(blocksGeometry,blocksMaterial);
 blocksMesh.castShadow=true;blocksMesh.receiveShadow=true;world.add(blocksMesh);
}
function pyramid(x,z,size,h){
 const base=mat(0xb99c6d,1),faces=[[[-1,-1],[1,-1]],[[1,-1],[1,1]],[[1,1],[-1,1]],[[-1,1],[-1,-1]]];
 for(const [a,b] of faces)addPyramidFace(x,z,size,h,a,b,base);
 box(world,x,-.12,z,size*2.04,.12,size*2.04,darkStone);
 const cap=new THREE.Mesh(new THREE.ConeGeometry(.3,.42,4),mat(0xe4d1a6));
 cap.rotation.y=Math.PI/4;cap.position.set(x,h-.21,z);cap.castShadow=true;cap.receiveShadow=true;world.add(cap);
 pyramidZones.push({x,z,size,height:h});
}
pyramid(-13,-25,8.3,12);pyramid(2,-25,6.8,9.8);pyramid(15,-23,5.4,7.8);
const houseColors=[0xd9c294,0xc9b28a,0xe1cda4,0xbfa276];
function house(x,z,w=5,d=5,h=2.5,i=0){
 const m=mat(houseColors[i%4]);box(world,x,0,z,w,h,d,m,false);
 box(world,x,h,z,w+.22,.2,d+.22,darkStone);box(world,x,h+.13,z,w-.18,.1,d-.18,sand2);
 for(const s of [-1,1]){
  box(world,x+s*(w/2-.13),h+.2,z,.22,.34,d+.18,stone,false);
  box(world,x,h+.2,z+s*(d/2-.13),w+.18,.34,.22,stone,false);
 }
 box(world,x,0,z-d/2-.075,.88,1.62,.12,wood);
 box(world,x,1.65,z-d/2-.12,1.12,.18,.22,sand2);box(world,x,.08,z-d/2-.5,1.25,.16,.48,stone);
 for(const s of [-1,1]){
  box(world,x+s*w*.27,h*.58,z+d/2+.025,.68,.59,.14,stone,false);
  box(world,x+s*w*.27,h*.58,z+d/2+.11,.48,.39,.035,mat(0x28566c),false);
  box(world,x+s*w*.27,h*.58-.27,z+d/2+.13,.74,.1,.2,sand2,false);
  box(world,x+s*w*.27,h*.58,z+d/2+.15,.07,.45,.08,wood,false);
 }
 for(let n=-1;n<=1;n++)box(world,x+n*.36,h*.78,z-d/2-.02,.17,.08,.055,darkStone,false);
 buildingRects.push({x,z,w,d,h});
}
const clusters=[[-43,-28,3,3],[-42,-8,3,3],[-18,5,3,3],[3,17,3,2],[41,-19,2,3],[42,20,2,3],[-8,29,3,1],[-78,-45,3,3],[-76,22,3,3],[-48,55,3,2],[49,54,3,2],[75,-20,3,3],[73,44,3,2],[-27,-55,3,2],[8,57,4,2]];
let seed=0;
for(const [cx,cz,cols,rows] of clusters){for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){house(cx+c*8.3+(Math.random()-.5)*.7,cz+r*8.3+(Math.random()-.5)*.7,4+Math.random(),4+Math.random(),2.2+Math.random()*.8,seed++);}}
 // Expanded neighbourhoods, broad avenues, garden plots and a second branch of the Nile.
 road(-71,-3,5,118);road(69,2,5,118);road(0,52,184,4.5);road(0,-55,184,4.5);road(-72,28,42,4);road(70,-31,45,4);road(0,34,4,90);
 waterRect(86,0,4.5,132);
 for(const z of [-44,0,43])box(world,86,.2,z,8,.35,5,stone);
 waterRect(69,48,15,9);
 for(const [x,z] of [[60,42],[64,53],[73,41],[78,52],[57,56],[82,45],[67,59],[90,38],[-91,50],[-89,-45]])palm(x,z,.9);
 for(let row=0;row<5;row++)for(let col=0;col<8;col++){const px=54+col*3.6,pz=-58+row*3.8;box(world,px,.02,pz,2.8,.16,2.7,row%2?green:green2);}

function palm(x,z,s=1){
 cyl(world,x,0,z,.25*s,.4*s,4.4*s,wood,7);
 for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const leaf=new THREE.Mesh(new THREE.ConeGeometry(.34*s,3.3*s,5),i%2?green:green2);leaf.position.set(x+Math.cos(a)*1.05*s,4.35*s+Math.sin(a)*1.05*s,z);leaf.rotation.z=Math.cos(a)*.9;leaf.rotation.x=Math.sin(a)*.9;leaf.castShadow=true;world.add(leaf);}
 sphere(world,x,4.1*s,z,.4*s,.4*s,.4*s,wood);
}
for(const [x,z] of [[12,-3],[16,10],[40,10],[42,17],[18,17],[8,-16],[31,-24],[37,-27],[42,-24],[31,-28],[34,-33],[44,-34],[47,-25],[37,-20]])palm(x,z,.85+Math.random()*.25);
function stall(x,z,color){
 box(world,x,0,z,3.6,1.2,2.3,wood,true);
 const roof=new THREE.Mesh(new THREE.BoxGeometry(4.1,.22,2.8),mat(color));roof.position.set(x,2.25,z);world.add(roof);
 for(const sx of [-1.5,1.5])for(const sz of [-.9,.9])cyl(world,x+sx,0,z+sz,.07,.07,2.15,wood,6);
 for(let i=0;i<5;i++)sphere(world,x-1.25+i*.62,.85,z+.1,.27,.3,.27,mat(i%2?0xc68136:0xdca95b));
}
stall(-17,2,0x9b5140);stall(-10,2,0xd0a84c);stall(-17,8,0x3f7a83);stall(-10,8,0x8d593a);
// palace compound, outer court, temple and pools
box(world,27,0,8,34,.55,26,darkStone);
box(world,27,.55,-5,34,.9,.8,stone);box(world,27,.55,21,34,.9,.8,stone);
box(world,10,.55,8,.8,.9,26,stone);box(world,44,.55,8,.8,.9,26,stone);
box(world,29,.55,8,19,3.6,10,sand2);
box(world,29,4.15,8,20,.55,11,darkStone);
box(world,29,4.7,8,18,2.7,9,sand2);
box(world,29,7.4,8,19,.55,10,darkStone);
for(let i=0;i<5;i++)box(world,29,.2+i*.25,13.3+i*.48,5,.23,1.1-i*.14,sand2);
for(const x of [21,24.7,33.3,37]){cyl(world,x,0,13.7,.42,.55,4.1,darkStone,10);cyl(world,x,4.65,13.7,.62,.62,.25,sand2,10);}
waterRect(17,1.5,7.5,10);waterRect(38,1.5,7.5,10);
for(let i=0;i<18;i++){const x=11+Math.random()*34,z=-3+Math.random()*21;if(Math.abs(x-29)<10&&Math.abs(z-8)<7)continue;box(world,x,0,z,.7,.55,.7,mat(0x9f8050));}
const scarabPos=[[-48,-29],[-38,-5],[-23,18],[-13,-15],[-5,-29],[9,-31],[20,-14],[39,-11],[46,14],[34,24],[11,23],[-38,27]];
const scarabs=[];
for(let i=0;i<scarabPos.length;i++){
 const [x,z]=scarabPos[i],g=new THREE.Group();g.position.set(x,.9,z);world.add(g);
 sphere(g,0,0,0,.43,.28,.58,gold);
 for(const s of [-1,1])sphere(g,s*.34,.02,-.05,.2,.1,.45,gold);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.6,.035,6,20),mat(0xffdf72,.25,.4));ring.rotation.x=Math.PI/2;g.add(ring);
 scarabs.push({group:g,x,z,got:false,phase:Math.random()*6});
}
function limb(g,a,b,r,material){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),dir=new THREE.Vector3().subVectors(B,A);
 const o=new THREE.Mesh(new THREE.CylinderGeometry(r*.78,r,dir.length(),8),material);o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());o.castShadow=true;g.add(o);
 if(!g.userData.limbs)g.userData.limbs=[];g.userData.limbs.push(o);
 sphere(g,B.x,B.y,B.z,r*1.08,r*1.08,r*1.08,material);
}
function makeBoy(parent,y){
 const b=new THREE.Group();parent.add(b);b.position.y=y;
 const tunic=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.62,4,9),linen);tunic.scale.set(1,.94,.78);tunic.position.y=1.18;tunic.castShadow=true;b.add(tunic);
 cyl(b,0,.94,0,.32,.32,.08,wood,12);
 sphere(b,0,1.95,.05,.31,.36,.29,skin);
 sphere(b,0,2.08,-.02,.34,.25,.3,hair);
 for(const s of [-1,1])sphere(b,s*.31,1.96,.05,.09,.13,.08,skin);
 cyl(b,0,2.34,-.02,.205,.22,.075,kippah,16);
 sphere(b,0,2.34,-.02,.21,.02,.21,mat(0x6d89c5));
 for(const s of [-1,1]){
  sphere(b,s*.115,1.99,.31,.055,.065,.035,mat(0xfff8e9));
  sphere(b,s*.115,1.99,.34,.027,.036,.02,black);
  limb(b,[s*.16,1.48,.02],[s*.39,1.27,.24],.09,linen);
  limb(b,[s*.39,1.27,.24],[s*.29,1.15,.52],.075,skin);
  limb(b,[s*.16,.85,0],[s*.2,.58,.42],.11,linen);
  limb(b,[s*.2,.58,.42],[s*.2,.19,.48],.095,skin);
  box(b,s*.2,.04,.59,.24,.09,.4,wood);
 }
 return b;
}
const mounts=[];
const defs=[
 ['אריה','🦁','מאוזן ומהיר',8.3,6.7,0x9e6a32],
 ['גורילה','🦍','כוח וקפיצה גבוהה',6.2,9.3,0x40352d],
 ['שור','🐂','האצה חזקה בקו ישר',8.1,5.7,0x77502d],
 ['נמר','🐅','זריז ופונה במהירות',9.6,7.2,0xc77a31],
 ['תנין','🐊','שחיין מצוין בתעלות',6.3,4.9,0x456a4a]
];
function createMount(i){
 const g=new THREE.Group();
 g.userData.limbs=[];
 g.userData.animatedTails=[];
 const coat=mat(defs[i][5],.84),darkCoat=mat([0x6d4527,0x30231e,0x51301e,0xb56b2e,0x3b5541][i],.9);
 const lightCoat=mat([0xc58b48,0x806052,0x9d7044,0xe3a04c,0x71805d][i],.92);
 const muzzle=mat([0xe0b47b,0x6c5144,0x8b6144,0xd69b65,0x667354][i],.88);
 const innerEar=mat(0x8b5144),noseMat=mat(0x211a17,.5),eyeWhite=mat(0xf2dfb6,.4),iris=mat(0x9a6b2c,.3),black=mat(0x1e1714,.35),claw=mat(0xd8c8aa,.7);
 const accent=mat(i===3?0x2a1e18:0x9c7945,.7,.18);
 const ell=(x,y,z,sx,sy,sz,m)=>sphere(g,x,y,z,sx,sy,sz,m);
 const addTube=(points,radius,m,segments=20)=>{
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,segments,radius,8,false),m);
  mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
 };
 const joint=(x,y,z,r,m=coat)=>ell(x,y,z,r,r,r,m);
 const paw=(x,z,r=.3)=>{
  ell(x,.19,z,r,.16,r*1.28,coat);
  for(let k=-1;k<=1;k++){
   ell(x+k*r*.48,.12,z+r*.78,r*.2,.075,r*.34,claw);
  }
 };
 const leg4=(x,z,front)=>{
  const hipY=front?1.18:1.1,kneeY=front?.68:.63,ankleY=.27;
  const upperEnd=[x*(front?1.06:1.02),kneeY,z+(front?.07:-.08)];
  limb(g,[x*.82,hipY,z],[...upperEnd],front?.19:.22,coat);
  limb(g,upperEnd,[x*1.1,ankleY,z+(front?.12:-.12)],front?.14:.16,lightCoat);
  joint(...upperEnd,front?.2:.23,coat);
  paw(x*1.1,z+(front?.25:-.22),front?.28:.32);
 };
 const eye=(x,y,z,scale=1)=>{
  ell(x,y,z,.105*scale,.09*scale,.07*scale,eyeWhite);
  ell(x,y,z+.052*scale,.052*scale,.057*scale,.035*scale,iris);
  ell(x,y,z+.078*scale,.027*scale,.038*scale,.022*scale,black);
  ell(x-.012*scale,y+.022*scale,z+.096*scale,.012*scale,.014*scale,.01*scale,eyeWhite);
 };
 const ear=(x,y,z,r=.2)=>{
  ell(x,y,z,r,r*1.15,r*.42,coat);
  ell(x,y,z+.055,r*.58,r*.7,r*.24,innerEar);
 };
 const tail=(points,radii,m,tipMat=m)=>{
  const group=new THREE.Group();g.add(group);
  for(let n=0;n<points.length-1;n++){
   const a=points[n],b=points[n+1],r=radii[n]||radii[radii.length-1];
   const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),dir=B.clone().sub(A);
   const part=new THREE.Mesh(new THREE.CylinderGeometry(r*.72,r,dir.length(),9),m);
   part.position.copy(A).add(B).multiplyScalar(.5);
   part.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
   part.castShadow=true;group.add(part);
  }
  const last=points[points.length-1];const tuft=new THREE.Mesh(new THREE.SphereGeometry(radii[radii.length-1]*2,10,8),tipMat);
  tuft.position.set(...last);group.add(tuft);g.userData.animatedTails.push(group);return group;
 };
 const torso=(x,y,z,sx,sy,sz,m=coat)=>ell(x,y,z,sx,sy,sz,m);
 let head;
 let seatY=1.68;
 if(i===0){
  // Lion: muscular feline torso, shoulders, haunches and a separate layered mane.
  torso(0,1.02,-.03,.68,.57,1.05,coat);
  torso(0,1.12,.57,.7,.64,.5,lightCoat);
  torso(0,1.05,-.62,.71,.62,.54,coat);
  for(const s of [-1,1]){leg4(s*.49,.57,true);leg4(s*.5,-.64,false);}
  // Mane forms a full collar around the skull, not a ball covering the body.
  ell(0,1.66,1.0,.76,.82,.66,darkCoat);
  for(let n=0;n<14;n++){
   const a=n*Math.PI*2/14;
   const x=Math.cos(a)*.65,z=1+Math.sin(a)*.56;
   const tuft=ell(x,1.62+Math.sin(a)*.2,z,.19,.28,.22,mat(n%3===0?0x9c642f:0x674025));
   tuft.rotation.z=-Math.cos(a)*.35;
  }
  head=new THREE.Group();g.add(head);head.position.set(0,1.73,1.27);
  sphere(head,0,0,.05,.45,.43,.43,coat);
  sphere(head,0,-.19,.4,.34,.2,.28,muzzle);
  sphere(head,0,-.12,.6,.19,.11,.13,noseMat);
  for(const s of [-1,1]){
   sphere(head,s*.34,.23,.02,.18,.2,.16,darkCoat);
   sphere(head,s*.34,.23,.12,.1,.12,.055,innerEar);
   sphere(head,s*.2,.08,.38,.2,.15,.18,lightCoat);
   sphere(head,s*.2,.17,.38,.105,.085,.08,eyeWhite);
   sphere(head,s*.2,.17,.45,.052,.06,.04,black);
   sphere(head,s*.2,-.15,.61,.045,.032,.025,black);
   for(let n=0;n<3;n++)addTube([[s*.28,-.2,.52],[s*.48,-.2+n*.035,.58],[s*.59,-.16+n*.05,.66]],.009,claw,8);
  }
  // Tawny tail with a dark tuft.
  tail([[0,1.02,-1.0],[0,1.0,-1.42],[.04,.82,-1.8],[.08,.58,-2.05]],[.095,.08,.065],coat,darkCoat);
  seatY=1.88;
 }else if(i===1){
  // Gorilla: broad upright torso, pronounced chest and long articulated arms.
  torso(0,1.1,-.03,.9,.87,.68,darkCoat);
  torso(0,1.52,.32,.94,.62,.45,coat);
  torso(0,1.12,.54,.68,.61,.4,lightCoat);
  torso(0,1.92,.27,.64,.38,.43,darkCoat);
  for(const s of [-1,1]){
   // long arms and large knuckles
   limb(g,[s*.7,1.75,.2],[s*1.02,1.18,.46],.27,darkCoat);
   limb(g,[s*1.02,1.18,.46],[s*1.03,.48,.72],.235,coat);
   joint(s*1.02,1.18,.46,.25,darkCoat);
   ell(s*1.03,.36,.77,.27,.19,.34,darkCoat);
   for(let k=-1;k<=2;k++)ell(s*1.03+(k-0.5)*.12,.23,.99,.065,.075,.16,claw);
   // short powerful legs, wide feet
   limb(g,[s*.43,.92,-.22],[s*.48,.45,.02],.23,coat);
   limb(g,[s*.48,.45,.02],[s*.5,.19,.35],.19,darkCoat);
   paw(s*.5,.52,.33);
  }
  // Head with heavy brow, muzzle and cheek pads.
  head=new THREE.Group();g.add(head);head.position.set(0,2.02,.55);
  sphere(head,0,0,.06,.47,.48,.43,darkCoat);
  sphere(head,0,-.19,.38,.32,.24,.28,mat(0x71564b));
  sphere(head,0,-.07,.58,.19,.14,.12,black);
  sphere(head,0,-.34,.45,.22,.12,.17,mat(0x382a25));
  for(const s of [-1,1]){
   sphere(head,s*.38,.03,.04,.12,.17,.14,mat(0x775b50));
   sphere(head,s*.18,.1,.39,.15,.115,.11,eyeWhite);
   sphere(head,s*.18,.1,.47,.07,.075,.05,black);
   sphere(head,s*.18,.23,.38,.2,.075,.14,darkCoat);
  }
  seatY=2.22;
 }else if(i===2){
  // Bull: barrel chest, strong shoulders, sloping back, dewlap and curved horns.
  torso(0,.98,-.06,.78,.7,1.0,coat);
  torso(0,1.2,.55,.82,.78,.72,lightCoat);
  torso(0,1.43,.7,.67,.58,.55,coat);
  torso(0,.55,.88,.32,.48,.26,muzzle);
  for(const s of [-1,1]){
   leg4(s*.55,.6,true);leg4(s*.58,-.62,false);
   ear(s*.62,1.49,.68,.19);
   // swept horns curl outward and up in a natural arc
   addTube([[s*.38,1.76,.86],[s*.62,1.88,.93],[s*.91,2.02,.95],[s*1.12,2.27,.88],[s*1.06,2.43,.76]],.105,claw,18);
   sphere(g,s*.23,1.51,1.05,.12,.09,.1,black);
  }
  head=new THREE.Group();g.add(head);head.position.set(0,1.53,1.02);
  sphere(head,0,0,.02,.53,.46,.46,coat);
  sphere(head,0,-.25,.43,.43,.28,.3,muzzle);
  sphere(head,0,-.16,.68,.22,.13,.1,noseMat);
  for(const s of [-1,1]){
   sphere(head,s*.22,.1,.36,.14,.1,.12,eyeWhite);
   sphere(head,s*.22,.1,.43,.06,.07,.045,black);
   sphere(head,s*.35,.25,.1,.16,.12,.16,coat);
  }
  seatY=1.97;
 }else if(i===3){
  // Tiger: flexible athletic cat, long haunches, clear rosetted stripes and a ringed tail.
  torso(0,.96,-.04,.62,.49,1.0,coat);
  torso(0,1.05,.55,.62,.53,.55,lightCoat);
  torso(0,.96,-.65,.68,.53,.5,coat);
  for(const s of [-1,1]){leg4(s*.44,.6,true);leg4(s*.48,-.66,false);}
  head=new THREE.Group();g.add(head);head.position.set(0,1.53,1.04);
  sphere(head,0,0,.06,.39,.37,.4,coat);
  sphere(head,0,-.16,.39,.29,.19,.25,lightCoat);
  sphere(head,0,-.09,.58,.15,.09,.08,noseMat);
  for(const s of [-1,1]){
   sphere(head,s*.29,.23,.08,.14,.16,.13,coat);
   sphere(head,s*.29,.23,.15,.075,.09,.04,innerEar);
   sphere(head,s*.17,.07,.39,.13,.11,.09,eyeWhite);
   sphere(head,s*.17,.07,.46,.055,.062,.04,black);
   addTube([[s*.07,.27,.28],[s*.12,.17,.35],[s*.22,.12,.37]],.025,darkCoat,8);
   addTube([[s*.23,.27,.2],[s*.3,.13,.31],[s*.31,.02,.38]],.022,darkCoat,8);
  }
  // Tiger stripes follow the curved flanks and shoulder.
  for(const s of [-1,1]){
   for(let n=0;n<8;n++){
    const z=-.78+n*.22;
    addTube([[s*.39,1.34,z-.08],[s*.56,1.22,z-.025],[s*.61,1.02,z+.035],[s*.48,.82,z+.11]],.032,darkCoat,10);
   }
  }
  tail([[0,.94,-1.0],[.03,.84,-1.42],[.11,.72,-1.82],[.16,.69,-2.18]],[.1,.08,.065],coat,black);
  // Add a few dark rings to the tail itself.
  for(let n=0;n<5;n++)ell(.12,.72,-1.48-n*.12,.082,.084,.045,black);
  seatY=1.68;
 }else{
  // Crocodile: low long body, armoured back, extended jaws, four splayed legs and tapering tail.
  torso(0,.69,-.13,.67,.43,1.22,darkCoat);
  torso(0,.85,-.34,.6,.38,.85,coat);
  head=new THREE.Group();g.add(head);head.position.set(0,.86,.85);
  sphere(head,0,.02,.25,.47,.28,.64,coat);
  sphere(head,0,-.16,.77,.39,.16,.72,lightCoat);
  sphere(head,0,-.24,.7,.38,.08,.68,muzzle);
  for(const s of [-1,1]){
   sphere(head,s*.34,.24,.02,.16,.17,.17,coat);
   sphere(head,s*.34,.31,.055,.09,.1,.1,mat(0xd2c36e));
   sphere(head,s*.34,.32,.1,.045,.06,.05,black);
   // small visible teeth along the jaw
   for(let n=0;n<5;n++){
    const tooth=new THREE.Mesh(new THREE.ConeGeometry(.045,.16,5),claw);
    tooth.position.set(s*(.28+n*.025),-.22,.43+n*.2);tooth.rotation.z=s*.18;head.add(tooth);
   }
  }
  // Raised osteoderm scutes run from shoulders to tail.
  for(let row=0;row<3;row++){
   for(let n=0;n<9;n++){
    const z=.42-n*.24,x=(row-1)*.29;
    const scute=new THREE.Mesh(new THREE.ConeGeometry(.12,.25,5),accent);
    scute.position.set(x,1.12-Math.abs(x)*.13,z);scute.rotation.x=.16;g.add(scute);
   }
  }
  // Splayed reptile legs with toes and claws.
  for(const s of [-1,1]){
   for(const z of [.55,-.65]){
    const hip=[s*.48,.7,z],elbow=[s*.76,.42,z+(z>0?.18:-.12)],foot=[s*.88,.16,z+(z>0?.28:-.2)];
    limb(g,hip,elbow,.17,coat);limb(g,elbow,foot,.13,darkCoat);
    joint(...elbow,.14,coat);ell(foot[0],.12,foot[2],.22,.1,.31,coat);
    for(let k=-1;k<=1;k++)ell(foot[0]+k*.12,.09,foot[2]+.24,.055,.06,.15,claw);
   }
  }
  tail([[0,.67,-1.12],[0,.61,-1.56],[0,.5,-2.0],[0,.37,-2.43],[0,.25,-2.78]],[.48,.35,.23,.12],coat,darkCoat);
  for(let n=0;n<9;n++){
   const z=-.9-n*.17,r=.34*(1-n/11);
   for(const s of [-1,1])ell(s*r,.77-r*.18,z,.12,.12,.12,accent);
  }
  seatY=1.22;
 }
 // Fine face details and riding equipment.
 const brow=mat(i===0?0x55351f:i===1?0x241b18:i===2?0x694324:i===3?0x6a351c:0x354637);
 if(i!==4){
  for(const s of [-1,1])addTube([[s*.13,seatY-.25,.25],[s*.17,seatY-.16,.3],[s*.22,seatY-.25,.32]],.024,brow,8);
 }
 // A fitted saddle/blanket; keep its height appropriate to each animal's back.
 const saddleWidth=i===1?1.48:i===4?1.02:1.25;
 const saddleLength=i===4?1.35:1.16;
 const saddle=new THREE.Mesh(new THREE.BoxGeometry(saddleWidth,.17,saddleLength),mat(i===3?0x873b29:0x80512e));
 saddle.position.set(0,seatY-.08,-.12);saddle.castShadow=true;g.add(saddle);
 const trim=new THREE.Mesh(new THREE.BoxGeometry(saddleWidth+.14,.055,saddleLength+.12),mat(0xc29a55,.55,.25));
 trim.position.set(0,seatY+.015,-.12);g.add(trim);
 for(const s of [-1,1]){
  limb(g,[s*saddleWidth*.42,seatY-.12,.28],[s*saddleWidth*.47,.82,.42],.045,accent);
 }
 const boy=makeBoy(g,seatY);
 boy.name='rider';
 const scale=[1.17,1.22,1.18,1.12,1.22][i];
 g.scale.setScalar(scale);
 boy.scale.setScalar(1/scale);
 boy.position.y=seatY/scale;
 g.visible=i===0;
 g.userData.boy=boy;g.userData.head=head;g.userData.index=i;
 mounts.push(g);carrier.add(g);
}
const carrier=new THREE.Group();world.add(carrier);carrier.position.set(0,0,-68);
for(let i=0;i<5;i++)createMount(i);
// The plague of wild beasts: naturally proportioned herds roam the streets and desert edges.
const wildHerd=[];
const herdSpawns=[[-34,-48,0],[-22,-48,1],[-4,-47,3],[18,-47,2],[39,-46,4],[-87,-18,1],[86,-17,3],[-86,18,4],[85,23,0],[-81,54,2],[-47,62,3],[-8,64,4],[34,64,0],[63,58,1],[62,31,2],[52,8,3],[-28,36,4],[8,40,0],[31,43,1],[75,-49,2]];
for(let n=0;n<herdSpawns.length;n++){
 const [x,z,type]=herdSpawns[n];
 const animal=mounts[type].clone(true);animal.visible=true;
 const rider=animal.getObjectByName('rider');if(rider)rider.visible=false;
 animal.scale.multiplyScalar(.9);animal.position.set(x,0,z);animal.rotation.y=Math.random()*Math.PI*2;world.add(animal);
 wildHerd.push({group:animal,x,z,phase:n*1.47,range:2.5+(n%4),speed:.22+(n%5)*.035,baseYaw:animal.rotation.y});
}
let active=0;
function setMount(i){
 active=(i+5)%5;mounts.forEach((m,n)=>m.visible=n===active);
 $('mount-icon').textContent=defs[active][1];$('mount-name').textContent=defs[active][0];$('mount-desc').textContent=defs[active][2];
 document.querySelectorAll('.mount-btn').forEach((b,n)=>b.classList.toggle('active',n===active));
 toast('עכשיו רוכבים על '+defs[active][0]+'!');
}
const keys={};let touch={x:0,z:0},running=false,paused=false,won=false,jump=0,jumping=false,boost=false,climbing=null,vel=new THREE.Vector3();
const target=new THREE.Vector3();
const citizens=[];
const citizenPositions=[[-34,-3],[-27,11],[-18,-17],[-10,-4],[-3,12],[7,8],[13,-8],[20,-14],[25,-18],[34,-12],[46,2],[49,25],[-61,-23],[-72,37],[-58,49],[60,53],[25,55],[-17,53],[80,22],[77,-35],[-86,5],[4,-60],[40,-58],[-42,40]];
let citizensCaught=0;
const citizenTotal=citizenPositions.length;
const robeColors=[0xd6c39a,0x9eab9a,0xb98b5d,0x7e8e9c,0xc8ad7b];
function makeCitizen(x,z,i){
 const g=new THREE.Group(),robe=mat(robeColors[i%robeColors.length]),wrap=mat(i%3===0?0x9b8b62:0x6c695f);
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.27,.72,4,8),robe);body.position.y=.88;body.castShadow=true;g.add(body);
 sphere(g,0,1.62,.015,.235,.26,.22,skin);sphere(g,0,1.82,-.005,.25,.13,.24,wrap);
 for(const s of [-1,1]){limb(g,[s*.23,1.28,0],[s*.36,.96,.18],.065,robe);limb(g,[s*.36,.96,.18],[s*.3,.82,.27],.052,skin);limb(g,[s*.13,.48,0],[s*.15,.22,.05],.075,robe);}
 const belt=box(g,0,.78,0,.52,.075,.43,wood);belt.position.y=.8;g.position.set(x,0,z);world.add(g);
 citizens.push({group:g,homeX:x,homeZ:z,state:'idle',caught:false,progress:0,from:new THREE.Vector3(),phase:i*.73,speed:3.25+(i%4)*.3});
}
citizenPositions.forEach(([x,z],i)=>makeCitizen(x,z,i));
function updateCitizenHud(){$('citizens-left').textContent=String(citizenTotal-citizensCaught);$('citizens-caught').textContent=String(citizensCaught);}
updateCitizenHud();
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t.timer);t.timer=setTimeout(()=>t.classList.remove('show'),1500);}
function start(){running=true;paused=false;$('start-screen').classList.add('hidden');$('pause-screen').classList.add('hidden');$('hud').classList.remove('hidden');}
function checkWin(){if(citizensCaught>=citizenTotal&&!won){won=true;$('win-title').textContent='לא נשארו מצרים בעיר!';$('win-subtitle').textContent='המסע הושלם — כל התושבים נתפסו באפקט מצויר ולא גרפי.';setTimeout(()=>$('win-screen').classList.remove('hidden'),450);}}
function reset(){for(const s of scarabs){s.got=false;s.group.visible=true;}$('collected').textContent='0';$('progress-fill').style.width='0%';citizensCaught=0;citizens.forEach(c=>{c.state='idle';c.progress=0;c.caught=false;c.group.visible=true;c.group.scale.setScalar(1);c.group.position.set(c.homeX,0,c.homeZ);});updateCitizenHud();carrier.position.set(0,0,-68);carrier.rotation.y=0;vel.set(0,0,0);jumping=false;climbing=null;won=false;setMount(0);setCameraMode('auto');$('win-screen').classList.add('hidden');running=true;paused=false;$('pause-screen').classList.add('hidden');}
$('start-btn').onclick=start;
$('pause-btn').onclick=()=>{paused=!paused;$('pause-screen').classList.toggle('hidden',!paused);};
$('resume-btn').onclick=()=>{paused=false;$('pause-screen').classList.add('hidden');};
$('restart-btn').onclick=reset;$('play-again-btn').onclick=reset;
$('help-btn').onclick=()=>{paused=true;$('help-screen').classList.remove('hidden');};
$('close-help').onclick=()=>{$('help-screen').classList.add('hidden');paused=false;};
document.querySelectorAll('.mount-btn').forEach(b=>b.addEventListener('click',()=>setMount(Number(b.dataset.mount))));
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(k>='1'&&k<='5')setMount(Number(k)-1);if(k==='q')setMount(active-1);if(k==='e')setMount(active+1);if(k===' '&&!e.repeat&&running&&!paused)doJump();if(k==='shift')boost=true;if(k==='escape'&&running){paused=!paused;$('pause-screen').classList.toggle('hidden',!paused);}});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys[k]=false;if(k==='shift')boost=false;});
document.querySelectorAll('.dpad button').forEach(b=>{const dir=b.dataset.dir;const set=(on)=>{if(dir==='up')touch.z=on?1:0;if(dir==='down')touch.z=on?-1:0;if(dir==='left')touch.x=on?-1:0;if(dir==='right')touch.x=on?1:0;};b.addEventListener('pointerdown',e=>{e.preventDefault();set(true);b.setPointerCapture(e.pointerId);});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>set(false)));});
$('jump-btn').addEventListener('pointerdown',e=>{e.preventDefault();doJump();});
function blocked(x,z){
 if(x<-98||x>98||z<-72||z>72)return true;
 const building=buildingRects.find(b=>x>b.x-b.w/2-.35&&x<b.x+b.w/2+.35&&z>b.z-b.d/2-.35&&z<b.z+b.d/2+.35);
 if(building&&!(active===1&&carrier.position.y>building.h-.35))return true;
 return blockers.some(b=>x>b.x1&&x<b.x2&&z>b.z1&&z<b.z2);
}
function groundHeight(x,z){
 let height=0;
 for(const p of pyramidZones){
  const dx=Math.abs(x-p.x),dz=Math.abs(z-p.z);
  if(dx<=p.size&&dz<=p.size){const edge=Math.max(dx/p.size,dz/p.size);height=Math.max(height,p.height*(1-edge));}
 }
 if(active===1){for(const b of buildingRects){if(x>b.x-b.w/2+.2&&x<b.x+b.w/2-.2&&z>b.z-b.d/2+.2&&z<b.z+b.d/2-.2)height=Math.max(height,b.h+.24);}}
 return height;
}
const clock=new THREE.Clock();const cameraTarget=new THREE.Vector3();
let cameraMode='auto',cameraYaw=Math.PI,cameraYawOffset=0,cameraPitch=.53,cameraDistance=29,draggingCamera=false,lastPointerX=0,lastPointerY=0;
function setCameraMode(mode){
 if(mode==='manual'&&cameraMode!=='manual'){const dx=camera.position.x-cameraTarget.x,dy=camera.position.y-cameraTarget.y,dz=camera.position.z-cameraTarget.z;cameraDistance=THREE.MathUtils.clamp(Math.hypot(dx,dy,dz),11,52);cameraYaw=Math.atan2(dx,dz);cameraPitch=Math.asin(THREE.MathUtils.clamp(dy/cameraDistance,-1,1));}
 cameraMode=mode;if(cameraMode==='auto'){cameraPitch=.53;cameraDistance=29;cameraYawOffset=0;}$('camera-mode-btn').textContent=cameraMode==='auto'?'מצלמה: אוטומטית':'מצלמה: ידנית';
}
$('camera-mode-btn').addEventListener('click',()=>setCameraMode(cameraMode==='auto'?'manual':'auto'));
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;draggingCamera=true;lastPointerX=e.clientX;lastPointerY=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!draggingCamera)return;const dx=e.clientX-lastPointerX,dy=e.clientY-lastPointerY;lastPointerX=e.clientX;lastPointerY=e.clientY;if(cameraMode==='auto')cameraYawOffset-=dx*.006;else cameraYaw-=dx*.006;cameraPitch=THREE.MathUtils.clamp(cameraPitch+dy*.005,.16,1.28);});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>draggingCamera=false);
canvas.addEventListener('wheel',e=>{e.preventDefault();cameraDistance=THREE.MathUtils.clamp(cameraDistance+e.deltaY*.018,11,52);},{passive:false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function doJump(){
 if(!running||paused||won||jumping||climbing)return;
 if(active===1){let nearest=null,best=7.2;for(const b of buildingRects){const dx=Math.max(Math.abs(carrier.position.x-b.x)-b.w/2,0),dz=Math.max(Math.abs(carrier.position.z-b.z)-b.d/2,0),dist=Math.hypot(dx,dz);if(dist<best){best=dist;nearest=b;}}
  if(nearest){const tx=THREE.MathUtils.clamp(carrier.position.x,nearest.x-nearest.w/2+.45,nearest.x+nearest.w/2-.45),tz=THREE.MathUtils.clamp(carrier.position.z,nearest.z-nearest.d/2+.45,nearest.z+nearest.d/2-.45);climbing={building:nearest,fromX:carrier.position.x,fromZ:carrier.position.z,toX:tx,toZ:tz,progress:0};vel.set(0,0,0);toast('הגורילה מטפסת על הגג!');return;}
 }
 jumping=true;jump=active===1?14.5:defs[active][4];
}
function update(dt,t){
 scarabs.forEach(s=>{if(!s.got){s.group.rotation.y=t*.85+s.phase;s.group.position.y=.9+Math.sin(t*2+s.phase)*.13;}});
 if(running&&!paused&&!won){
  const inputRight=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+touch.x;
  const inputForward=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0)+touch.z;
  const viewForward=new THREE.Vector3(cameraTarget.x-camera.position.x,0,cameraTarget.z-camera.position.z).normalize();
  if(viewForward.lengthSq()<.001)viewForward.set(0,0,1);
  const viewRight=new THREE.Vector3().crossVectors(viewForward,new THREE.Vector3(0,1,0)).normalize();
  let dx=viewForward.x*inputForward+viewRight.x*inputRight;
  let dz=viewForward.z*inputForward+viewRight.z*inputRight;
  const len=Math.hypot(dx,dz);if(len>1){dx/=len;dz/=len;}
  if(climbing){
   climbing.progress=Math.min(1,climbing.progress+dt*.78);const eased=climbing.progress*climbing.progress*(3-2*climbing.progress);
   carrier.position.x=THREE.MathUtils.lerp(climbing.fromX,climbing.toX,eased);carrier.position.z=THREE.MathUtils.lerp(climbing.fromZ,climbing.toZ,eased);carrier.position.y=THREE.MathUtils.lerp(0,climbing.building.h+.24,eased);
   if(climbing.progress>=1){carrier.position.y=climbing.building.h+.24;climbing=null;toast('הגורילה הגיעה לגג!');}
  }else{
   let speed=defs[active][3]*(boost?1.45:1);if(active===4&&Math.abs(carrier.position.x+30)<4)speed*=1.25;
   vel.x=THREE.MathUtils.damp(vel.x,dx*speed,dx||dz?11:7,dt);vel.z=THREE.MathUtils.damp(vel.z,dz*speed,dx||dz?11:7,dt);
   const nx=carrier.position.x+vel.x*dt,nz=carrier.position.z+vel.z*dt;
   if(!blocked(nx,carrier.position.z))carrier.position.x=nx;else vel.x=0;
   if(!blocked(carrier.position.x,nz))carrier.position.z=nz;else vel.z=0;
   const floorY=groundHeight(carrier.position.x,carrier.position.z);
   if(jumping){jump-=20*dt;carrier.position.y+=jump*dt;if(carrier.position.y<=floorY){carrier.position.y=floorY;jumping=false;jump=0;}}
   else carrier.position.y=THREE.MathUtils.damp(carrier.position.y,floorY,12,dt);
   if(len>.08)carrier.rotation.y=Math.atan2(dx,dz);
  }
  mounts[active].position.y=Math.sin(t*12)*.035+Math.abs(Math.sin(t*12))*.04;
  mounts[active].rotation.z=THREE.MathUtils.damp(mounts[active].rotation.z,dx*.055,5,dt);
  mounts[active].userData.limbs?.forEach((part,i)=>{part.rotation.x=Math.sin(t*8+i*Math.PI*.5)*.12;});
  mounts[active].userData.animatedTails?.forEach((tail,n)=>{tail.rotation.x=Math.sin(t*2.4+n)*.12;tail.rotation.y=Math.cos(t*1.8+n)*.1;});
  for(const herd of wildHerd){
   const phase=t*herd.speed+herd.phase;
   herd.group.position.x=herd.x+Math.sin(phase)*herd.range;
   herd.group.position.z=herd.z+Math.cos(phase*.72)*herd.range*.65;
   herd.group.rotation.y=Math.atan2(Math.cos(phase)*herd.range,-Math.sin(phase*.72)*herd.range*.65);
   herd.group.position.y=Math.abs(Math.sin(t*5+herd.phase))*.06;
  }
  for(const s of scarabs){if(!s.got&&Math.hypot(carrier.position.x-s.x,carrier.position.z-s.z)<2.35){s.got=true;s.group.visible=false;const n=scarabs.filter(x=>x.got).length;$('collected').textContent=n;$('progress-fill').style.width=(n/12*100)+'%';toast('חיפושית זהב נאספה! ✨');if(n===12)toast('כל חיפושיות הזהב נאספו!');}}
  // Citizens flee from the rider; catching one triggers a playful, non-graphic swallow effect.
  for(const citizen of citizens){
   if(citizen.state==='gone')continue;
   if(citizen.state==='captured'){
    citizen.progress=Math.min(1,citizen.progress+dt*2.8);const mouth=mounts[active].localToWorld(new THREE.Vector3(0,1.12,1.22));
    citizen.group.position.lerpVectors(citizen.from,mouth,citizen.progress);citizen.group.scale.setScalar(Math.max(.001,1-citizen.progress));
    if(citizen.progress>=1){citizen.group.visible=false;citizen.state='gone';citizensCaught++;updateCitizenHud();toast('מצרי נתפס באפקט מצויר! ✨');checkWin();}
    continue;
   }
   const px=citizen.group.position.x-carrier.position.x,pz=citizen.group.position.z-carrier.position.z,dist=Math.hypot(px,pz);
   if(dist<18)citizen.state='flee';
   if(citizen.state==='flee'&&dist>.001){
    const awayX=px/dist,awayZ=pz/dist;let moved=false;
    for(const turn of [0,.65,-.65,1.25,-1.25,Math.PI]){
     const ax=awayX*Math.cos(turn)-awayZ*Math.sin(turn),az=awayX*Math.sin(turn)+awayZ*Math.cos(turn);
     const nx=citizen.group.position.x+ax*citizen.speed*dt,nz=citizen.group.position.z+az*citizen.speed*dt;
     if(!blocked(nx,nz)){citizen.group.position.x=nx;citizen.group.position.z=nz;citizen.group.rotation.y=Math.atan2(ax,az);moved=true;break;}
    }
    if(!moved)citizen.group.rotation.y+=dt*2;
   }else citizen.group.position.y=Math.sin(t*3+citizen.phase)*.025;
   if(dist<2.25&&citizen.state!=='captured'){citizen.state='captured';citizen.progress=0;citizen.from.copy(citizen.group.position);toast('תפסתם מצרי — בליעה מצוירת!');}
  }
 }
 const p=carrier.position;cameraTarget.set(p.x,1.35+p.y,p.z);
 if(cameraMode==='auto'){
  const yaw=carrier.rotation.y+Math.PI+cameraYawOffset,desired=new THREE.Vector3(p.x+Math.sin(yaw)*cameraDistance*Math.cos(cameraPitch),cameraTarget.y+cameraDistance*Math.sin(cameraPitch),p.z+Math.cos(yaw)*cameraDistance*Math.cos(cameraPitch));
  camera.position.lerp(desired,1-Math.exp(-3.8*dt));
 }else{
  const desired=new THREE.Vector3(p.x+Math.sin(cameraYaw)*cameraDistance*Math.cos(cameraPitch),cameraTarget.y+cameraDistance*Math.sin(cameraPitch),p.z+Math.cos(cameraYaw)*cameraDistance*Math.cos(cameraPitch));
  camera.position.lerp(desired,1-Math.exp(-5*dt));
 }
 camera.lookAt(cameraTarget);
}
function drawMap(){
 const c=$('minimap'),ctx=c.getContext('2d');ctx.fillStyle='#d6bd8c';ctx.fillRect(0,0,150,110);ctx.strokeStyle='#7d6541';ctx.lineWidth=3;ctx.strokeRect(8,8,134,94);
 ctx.fillStyle='#279baa';ctx.fillRect(34,9,5,91);ctx.fillRect(56,55,20,3);ctx.fillRect(93,47,17,4);ctx.fillStyle='#c4a06a';ctx.fillRect(84,41,45,35);
 ctx.fillStyle='#ad8a59';for(const [x,y] of [[29,24],[44,28],[63,22],[18,65],[57,79],[108,22],[117,86]])ctx.fillRect(x,y,5,4);
 ctx.fillStyle='#e7b93b';for(const s of scarabs)if(!s.got){ctx.beginPath();ctx.arc(9+(s.x+100)/200*132,8+(s.z+75)/150*94,1.6,0,Math.PI*2);ctx.fill();}
 ctx.fillStyle='#b95e45';for(const citizen of citizens)if(citizen.state!=='gone'){ctx.fillRect(9+(citizen.group.position.x+100)/200*132,8+(citizen.group.position.z+75)/150*94,2.2,2.2);}
 ctx.fillStyle='#e94d37';ctx.beginPath();ctx.arc(9+(carrier.position.x+100)/200*132,8+(carrier.position.z+75)/150*94,3.3,0,Math.PI*2);ctx.fill();
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04),t=clock.elapsedTime;update(dt,t);renderer.render(scene,camera);if(Math.floor(t*4)!==Math.floor((t-dt)*4))drawMap();}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));});
try{animate();setTimeout(()=>$('loading').classList.add('hidden'),600);setTimeout(()=>$('start-screen').classList.remove('hidden'),650);}catch(err){console.error(err);$('webgl-warning').classList.remove('hidden');}
