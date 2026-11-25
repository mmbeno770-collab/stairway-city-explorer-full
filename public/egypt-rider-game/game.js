import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

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
const realAnimalAssets=[
 {url:'https://cdn.3dassets.dev/assets/30195/v1/model.glb',label:'African lion',target:[1.4,1.55,3.15],seat:1.5},
 {url:'https://cdn.3dassets.dev/assets/30214/v1/model.glb',label:'Silverback gorilla',target:[1.7,1.55,2.2],seat:1.52},
 {url:'https://vinish-models.pages.dev/farm-animals/bull.glb',label:'Bull',target:[1.55,1.52,2.75],seat:1.48},
 {url:'https://cdn.3dassets.dev/assets/30200/v1/model.glb',label:'Bengal tiger',target:[1.32,1.3,3.2],seat:1.26},
 {url:'https://cdn.3dassets.dev/assets/6557/v1/model.glb',label:'Nile crocodile',target:[1.55,.82,4.2],seat:.78}
];
const realAnimalLoader=new GLTFLoader();
const animalAssetCache=[];
let animalModelsLoaded=0;
function reportAnimalLoad(label,failed=false){
 animalModelsLoaded++;
 const p=document.querySelector('#loading p');
 if(p)p.textContent=failed?'חלק מהמודלים לא נטענו. בדקו את חיבור האינטרנט.':`נטענו מודלים מקצועיים: ${animalModelsLoaded}/5`;
 if(animalModelsLoaded>=5){
  setTimeout(()=>{$('loading').classList.add('hidden');$('start-screen').classList.remove('hidden');},250);
 }
}
function makeRealAnimalVisual(source,index){
 const asset=realAnimalAssets[index];
 const model=cloneSkinned(source);
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model);
 const size=bounds.getSize(new THREE.Vector3());
 const center=bounds.getCenter(new THREE.Vector3());
 const sx=asset.target[0]/Math.max(size.x,.001);
 const sy=asset.target[1]/Math.max(size.y,.001);
 const sz=asset.target[2]/Math.max(size.z,.001);
 model.scale.set(sx,sy,sz);
 model.position.set(-center.x*sx,-bounds.min.y*sy,-center.z*sz);
 model.traverse(o=>{
  if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
   if(o.material){o.material.side=THREE.DoubleSide;}
  }
 });
 const root=new THREE.Group();root.add(model);
 return root;
}
function makeMountSaddle(parent,index,seat){
 const width=[1.1,1.35,1.25,1.05,1.0][index];
 const length=[.9,1.0,1.15,.9,1.8][index];
 const blanket=new THREE.Mesh(new THREE.BoxGeometry(width,.14,length),mat(index===3?0x873b29:0x80512e));
 blanket.position.set(0,seat-.12,-.12);blanket.castShadow=true;parent.add(blanket);
 const trim=new THREE.Mesh(new THREE.BoxGeometry(width+.12,.045,length+.12),mat(0xc29a55,.55,.25));
 trim.position.set(0,seat-.025,-.12);parent.add(trim);
 for(const side of [-1,1]){
  const strap=new THREE.Mesh(new THREE.BoxGeometry(.08,.72,.1),mat(0x69452d));
  strap.position.set(side*width*.44,seat-.43,.17);strap.rotation.z=side*.08;parent.add(strap);
 }
}
function createMount(i){
 const g=new THREE.Group();
 g.userData.index=i;g.userData.assetLoaded=false;g.userData.visual=null;g.userData.mixer=null;
 g.userData.idleAction=null;g.userData.moveAction=null;g.userData.currentAction=null;
 g.visible=i===0;
 const seat=realAnimalAssets[i].seat;
 makeMountSaddle(g,i,seat);
 const boy=makeBoy(g,seat+.02);boy.name='rider';boy.scale.setScalar(.69);
 g.userData.boy=boy;g.userData.seat=seat;
 mounts.push(g);carrier.add(g);
 realAnimalLoader.load(realAnimalAssets[i].url,gltf=>{
  animalAssetCache[i]={scene:gltf.scene,animations:gltf.animations||[]};
  const visual=makeRealAnimalVisual(gltf.scene,i);
  g.add(visual);g.userData.visual=visual;g.userData.assetLoaded=true;
  if(gltf.animations&&gltf.animations.length){
   const mixer=new THREE.AnimationMixer(visual);
   const idleClip=gltf.animations.find(a=>/idle|stand|rest/i.test(a.name))||gltf.animations[0];
   const moveClip=gltf.animations.find(a=>/walk|trot|gallop|run/i.test(a.name))||idleClip;
   g.userData.mixer=mixer;
   g.userData.idleAction=mixer.clipAction(idleClip);
   g.userData.moveAction=mixer.clipAction(moveClip);
   g.userData.currentAction=g.userData.idleAction;
   g.userData.idleAction.play();
  }
  populateWildHerd(i);
  reportAnimalLoad(realAnimalAssets[i].label,false);
 },undefined,error=>{
  console.error('Could not load 3D animal:',realAnimalAssets[i].label,error);
  reportAnimalLoad(realAnimalAssets[i].label,true);
 });
}
const carrier=new THREE.Group();world.add(carrier);carrier.position.set(0,0,-68);
for(let i=0;i<5;i++)createMount(i);
// The plague of wild beasts: free-roaming copies of the same high-detail GLB animals.
const wildHerd=[];
const herdSpawns=[[-34,-48,0],[-22,-48,1],[-4,-47,3],[18,-47,2],[39,-46,4],[-87,-18,1],[86,-17,3],[-86,18,4],[85,23,0],[-81,54,2],[-47,62,3],[-8,64,4],[34,64,0],[63,58,1],[62,31,2],[52,8,3],[-28,36,4],[8,40,0],[31,43,1],[75,-49,2]];
for(let n=0;n<herdSpawns.length;n++){
 const [x,z,type]=herdSpawns[n];
 const group=new THREE.Group();group.position.set(x,0,z);world.add(group);
 wildHerd.push({group,x,z,type,phase:n*1.47,range:2.5+(n%4),speed:.22+(n%5)*.035,baseYaw:Math.random()*Math.PI*2,assetReady:false});
}
function populateWildHerd(type){
 const cache=animalAssetCache[type];
 if(!cache)return;
 for(const herd of wildHerd){
  if(herd.type!==type||herd.assetReady)continue;
  const visual=makeRealAnimalVisual(cache.scene,type);
  visual.scale.multiplyScalar(.82);
  herd.group.add(visual);herd.assetReady=true;
  if(cache.animations&&cache.animations.length){
   const mixer=new THREE.AnimationMixer(visual);
   const idle=cache.animations.find(a=>/idle|stand|rest/i.test(a.name))||cache.animations[0];
   mixer.clipAction(idle).play();herd.mixer=mixer;
  }
 }
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
  const currentMount=mounts[active];
  const moving=len>.15;
  if(currentMount.userData.mixer){
   const wanted=moving?currentMount.userData.moveAction:currentMount.userData.idleAction;
   if(wanted&&wanted!==currentMount.userData.currentAction){currentMount.userData.currentAction?.fadeOut(.18);wanted.reset().fadeIn(.18).play();currentMount.userData.currentAction=wanted;}
   currentMount.userData.mixer.update(dt);
  }else if(currentMount.userData.visual){
   currentMount.userData.visual.position.y=Math.sin(t*2.2)*.018+(moving?Math.abs(Math.sin(t*8))*.025:0);
  }
  currentMount.rotation.z=THREE.MathUtils.damp(currentMount.rotation.z,dx*.025,5,dt);
  for(const herd of wildHerd){if(herd.mixer)herd.mixer.update(dt);else if(herd.group.children[0])herd.group.children[0].position.y=Math.sin(t*2+herd.phase)*.018;}
  for(const herd of wildHerd){
   const phase=t*herd.speed+herd.phase;
   herd.group.position.x=herd.x+Math.sin(phase)*herd.range;
   herd.group.position.z=herd.z+Math.cos(phase*.72)*herd.range*.65;
   herd.group.rotation.y=Math.atan2(Math.cos(phase)*herd.range,-Math.sin(phase*.72)*herd.range*.65);
   herd.group.position.y=Math.abs(Math.sin(t*2.5+herd.phase))*.025;
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
try{animate();}catch(err){console.error(err);$('webgl-warning').classList.remove('hidden');}
