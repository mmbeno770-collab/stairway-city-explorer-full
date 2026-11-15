import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CITY_HALF } from "./world.js";

export const MAINLAND_SHORE = CITY_HALF + 20;
const WATER_LEVEL = -.16;
const seeds = [
 {id:"palm",name:"אי הדקלים",biome:"tropical",x:0,z:-470,rx:58,rz:43,color:"#39864e",sand:"#ead29a",trees:11,animals:["turtle","parrot","parrot","turtle"]},
 {id:"frost",name:"אי הקרח",biome:"winter",x:505,z:-15,rx:46,rz:68,color:"#d9edf1",sand:"#dce8ed",trees:10,animals:["penguin","penguin","seal","penguin"]},
 {id:"sunny",name:"אי הקיץ",biome:"summer",x:5,z:505,rx:82,rz:53,color:"#83b95a",sand:"#e7d19a",trees:7,animals:["deer","rabbit","rabbit","deer"]},
 {id:"green",name:"אי היער",biome:"forest",x:-505,z:35,rx:76,rz:56,color:"#477b42",sand:"#c7b27d",trees:15,animals:["deer","fox","deer","fox","rabbit"]},
 {id:"lava",name:"אי הלבה",biome:"volcanic",x:620,z:440,rx:58,rz:47,color:"#765044",sand:"#a87959",trees:3,animals:["lizard","lizard","goat"]},
 {id:"dune",name:"אי הדיונות",biome:"desert",x:-650,z:-420,rx:47,rz:39,color:"#c7a25e",sand:"#e4c78e",trees:5,animals:["fox","lizard","rabbit"]},
 {id:"crystal",name:"אי הקריסטלים",biome:"crystal",x:-690,z:400,rx:50,rz:68,color:"#70a9ad",sand:"#a8c9cc",trees:6,animals:["fox","parrot","rabbit"]},
 {id:"lagoon",name:"אי הלגונה",biome:"lagoon",x:395,z:-700,rx:84,rz:48,color:"#5b9d78",sand:"#f0d9a7",trees:13,animals:["turtle","parrot","turtle","parrot"]}
];
function randomFrom(seed){let v=seed>>>0;return()=>{v=(v*1664525+1013904223)>>>0;return v/4294967296;};}
function outlineFor(seed){const r=randomFrom(seed);return Array.from({length:18},(_,i)=>{const a=i/18*Math.PI*2;const d=.88+r()*.16+Math.sin(a*3+seed)*.045;return[Math.cos(a)*d,Math.sin(a)*d];});}

export function createMarineWorld(){
 const islands=seeds.map((s,index)=>{
  const r=randomFrom(400+index*71),outline=outlineFor(93+index*31);
  const trees=Array.from({length:s.trees},()=>{const a=r()*Math.PI*2,d=.16+r()*.56;return{x:s.x+Math.cos(a)*s.rx*d,z:s.z+Math.sin(a)*s.rz*d,scale:.72+r()*.6,type:["tropical","lagoon"].includes(s.biome)?"palm":s.biome==="winter"?"snowpine":["desert","volcanic"].includes(s.biome)?"cactus":s.biome==="crystal"?"crystal":s.biome==="forest"?"pine":"broadleaf"};});
  const animals=s.animals.map((type,i)=>{const a=i/s.animals.length*Math.PI*2+r()*.4,d=.24+r()*.35;return{type,x:s.x+Math.cos(a)*s.rx*d,z:s.z+Math.sin(a)*s.rz*d,phase:r()*Math.PI*2,scale:.8+r()*.45};});
  return{...s,outline,trees,animals};
 });
 const boats=[],colors=["#d64b3d","#e3b64e","#397c9c","#e9e9df","#35775e"],along=[-180,-135,-90,-45,0,45,90,135,180];
 for(let side=0;side<4;side++)for(let i=0;i<along.length;i++){
  const d=212,t=along[i];let x=t,z=-d,yaw=Math.PI,ix=0,iz=1;
  if(side===1){x=d;z=t;yaw=Math.PI/2;ix=-1;iz=0;}
  if(side===2){x=t;z=d;yaw=0;ix=0;iz=-1;}
  if(side===3){x=-d;z=t;yaw=-Math.PI/2;ix=1;iz=0;}
  boats.push({id:boats.length,type:"boat",x,y:WATER_LEVEL,z,yaw,speed:0,steering:0,color:colors[(i+side*2)%colors.length],landX:x+ix*5.2,landZ:z+iz*5.2,length:5.6,width:2.4});
 }
 const dolphins = [
  {id:0,x:0,y:-2.5,z:-270,yaw:0,speed:0,phase:.2,scheduleOffset:0,baseX:0,baseZ:-278,rangeX:34,rangeZ:42,active:false,ridden:false},
  {id:1,x:270,y:-2.5,z:0,yaw:Math.PI/2,speed:0,phase:1.8,scheduleOffset:29,baseX:278,baseZ:0,rangeX:40,rangeZ:34,active:false,ridden:false},
  {id:2,x:0,y:-2.5,z:270,yaw:Math.PI,speed:0,phase:3.3,scheduleOffset:58,baseX:0,baseZ:278,rangeX:38,rangeZ:44,active:false,ridden:false},
  {id:3,x:-270,y:-2.5,z:0,yaw:-Math.PI/2,speed:0,phase:4.7,scheduleOffset:87,baseX:-278,baseZ:0,rangeX:42,rangeZ:36,active:false,ridden:false}
 ];
 return{islands,boats,dolphins};
}
export function isMainlandLand(x,z){return Math.abs(x)<=MAINLAND_SHORE&&Math.abs(z)<=MAINLAND_SHORE;}
export function getIslandAt(x,z,islands){
 for(const island of islands){const nx=(x-island.x)/(island.rx*.88),nz=(z-island.z)/(island.rz*.88),a=Math.atan2(nz,nx),edge=1+Math.sin(a*5+island.rx)*.035+Math.cos(a*3+island.rz)*.025;if(nx*nx+nz*nz<=edge*edge)return island;}
 return null;
}
export function createIslandCollisionBoxes(islands){
 const boxes=[];
 for(const island of islands){const rx=island.rx*.88,rz=island.rz*.88,rows=13;
  for(let row=0;row<rows;row++){const z0=island.z-rz+row/rows*rz*2,z1=island.z-rz+(row+1)/rows*rz*2,nz=((z0+z1)/2-island.z)/rz,half=rx*Math.sqrt(Math.max(.025,1-nz*nz))*.96;if(half<1)continue;
   boxes.push({x0:island.x-half,x1:island.x+half,y0:-1.9,y1:.26,z0,z1,color:island.color,kind:"marine-collider",collide:true,noGround:false});
  }
 }
 return boxes;
}

const hullShape=(()=>{const s=new THREE.Shape();s.moveTo(-1.08,-2.55);s.lineTo(1.08,-2.55);s.lineTo(1.28,1.55);s.lineTo(.72,2.35);s.lineTo(0,2.82);s.lineTo(-.72,2.35);s.lineTo(-1.28,1.55);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:.62,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.09,bevelThickness:.08});g.rotateX(-Math.PI/2);g.computeVertexNormals();return g;})();
const metal=new THREE.MeshStandardMaterial({color:"#343c43",metalness:.68,roughness:.34});
const deck=new THREE.MeshStandardMaterial({color:"#d4c49d",roughness:.84});
const glass=new THREE.MeshPhysicalMaterial({color:"#9ed9e4",transparent:true,opacity:.58,roughness:.12,metalness:.12});
function BoatModel({boat}){
 const root=useRef(null),paint=useMemo(()=>new THREE.MeshPhysicalMaterial({color:boat.color,metalness:.32,roughness:.27,clearcoat:.9}),[boat.color]);
 useFrame(({clock})=>{if(!root.current)return;root.current.position.set(boat.x,boat.y+Math.sin(clock.elapsedTime*1.8+boat.id)*.035,boat.z);root.current.rotation.y=boat.yaw;root.current.rotation.z=Math.sin(clock.elapsedTime*1.25+boat.id)*.012;});
 return React.createElement("group",{ref:root},
  React.createElement("mesh",{geometry:hullShape,position:[0,-.42,0],material:paint,castShadow:true,receiveShadow:true}),
  React.createElement("mesh",{position:[0,.22,-.28],material:deck},React.createElement("boxGeometry",{args:[1.78,.08,3.5]})),
  React.createElement("mesh",{position:[0,.36,-.85],material:metal},React.createElement("boxGeometry",{args:[1.45,.42,.42]})),
  React.createElement("mesh",{position:[0,.72,-.85],material:glass},React.createElement("boxGeometry",{args:[1.18,.48,.035]})),
  React.createElement("mesh",{position:[0,.42,-1.75],material:deck},React.createElement("boxGeometry",{args:[1.65,.18,.52]})),
  React.createElement("mesh",{position:[0,.3,-2.28],material:metal},React.createElement("boxGeometry",{args:[1.22,.48,.28]})),
  React.createElement("mesh",{position:[0,.27,1.95],material:deck},React.createElement("boxGeometry",{args:[1.12,.08,.58]})),
  React.createElement("mesh",{position:[0,.76,2.55]},React.createElement("sphereGeometry",{args:[.13,10,8]}),React.createElement("meshBasicMaterial",{color:"#fff2c4"}))
 );
}
function islandShape(island,scale,extrude){
 const shape=new THREE.Shape();island.outline.forEach(([x,z],i)=>{const px=x*island.rx*scale,pz=z*island.rz*scale;if(i===0)shape.moveTo(px,pz);else shape.lineTo(px,pz);});shape.closePath();
 const g=extrude?new THREE.ExtrudeGeometry(shape,{depth:2.05,bevelEnabled:true,bevelSegments:3,bevelSize:.42,bevelThickness:.34,steps:1}):new THREE.ShapeGeometry(shape,16);g.rotateX(-Math.PI/2);g.computeVertexNormals();return g;
}
const leaf=new THREE.MeshStandardMaterial({color:"#548c49",roughness:.94}),pine=new THREE.MeshStandardMaterial({color:"#27533d",roughness:.94}),snow=new THREE.MeshStandardMaterial({color:"#edf4f5"}),trunk=new THREE.MeshStandardMaterial({color:"#75513a",roughness:.96}),cactus=new THREE.MeshStandardMaterial({color:"#42865a"}),crystal=new THREE.MeshPhysicalMaterial({color:"#99e0e8",emissive:"#287b91",emissiveIntensity:.4,metalness:.4,roughness:.2});
function IslandTree({tree}){
 const s=tree.scale;
 if(tree.type==="palm")return React.createElement("group",{position:[tree.x,.27,tree.z],scale:s},
  React.createElement("mesh",{position:[0,2.15,0],rotation:[0,0,-.09],material:trunk},React.createElement("cylinderGeometry",{args:[.2,.34,4.5,8]})),
  ...Array.from({length:7},(_,i)=>{const a=i/7*Math.PI*2;return React.createElement("mesh",{key:i,position:[Math.sin(a)*1.15,4.18,Math.cos(a)*1.15],rotation:[.22*Math.cos(a),0,-Math.sin(a)*.42],material:leaf,castShadow:true},React.createElement("coneGeometry",{args:[.42,2.9,6]}));})
 );
 if(tree.type==="pine"||tree.type==="snowpine")return React.createElement("group",{position:[tree.x,.27,tree.z],scale:s},
  React.createElement("mesh",{position:[0,1.1,0],material:trunk},React.createElement("cylinderGeometry",{args:[.13,.22,2.2,7]})),
  ...[0,1,2].map(t=>React.createElement("mesh",{key:t,position:[0,1.65+t*.82,0],material:tree.type==="snowpine"?snow:pine,castShadow:true},React.createElement("coneGeometry",{args:[1.65-t*.34,2.3-t*.28,8]})))
 );
 if(tree.type==="cactus")return React.createElement("group",{position:[tree.x,.27,tree.z],scale:s},
  React.createElement("mesh",{position:[0,1.15,0],material:cactus},React.createElement("cylinderGeometry",{args:[.34,.4,2.3,8]})),
  ...[-1,1].map(side=>React.createElement("mesh",{key:side,position:[side*.48,1.05,0],rotation:[0,0,side*-.65],material:cactus},React.createElement("cylinderGeometry",{args:[.16,.18,1.15,7]})))
 );
 if(tree.type==="crystal")return React.createElement("mesh",{position:[tree.x,.9*s+.27,tree.z],rotation:[0,tree.scale,.16],scale:[s,s*1.8,s],material:crystal,castShadow:true},React.createElement("octahedronGeometry",{args:[1,1]}));
 return React.createElement("group",{position:[tree.x,.27,tree.z],scale:s},
  React.createElement("mesh",{position:[0,1.25,0],material:trunk},React.createElement("cylinderGeometry",{args:[.2,.3,2.5,7]})),
  ...[[-.45,2.45,.05],[.38,2.55,.1],[0,3.15,-.28]].map(([x,y,z],i)=>React.createElement("mesh",{key:i,position:[x,y,z],material:leaf,castShadow:true},React.createElement("sphereGeometry",{args:[1.05,10,8]})))
 );
}
function IslandAnimal({animal}){
 const ref=useRef(null);
 useFrame(({clock})=>{if(ref.current){ref.current.position.y=.27+Math.sin(clock.elapsedTime*1.5+animal.phase)*.035;ref.current.rotation.y=animal.phase+Math.sin(clock.elapsedTime*.4+animal.phase)*.15;}});
 const animalColor={penguin:"#273b46",fox:"#bd7042",deer:"#a97c4d",lizard:"#5d9363",seal:"#829ca5",parrot:"#27a77b",goat:"#ded6c1",turtle:"#607b49",rabbit:"#d3c7b5"}[animal.type]||"#72876a";
 const bodyMat=new THREE.MeshStandardMaterial({color:animalColor,roughness:.9}),white=new THREE.MeshStandardMaterial({color:"#f1f1e9"}),feetMat=new THREE.MeshStandardMaterial({color:animal.type==="penguin"?"#eaa64a":"#51493e"});
 return React.createElement("group",{ref,position:[animal.x,.27,animal.z],scale:animal.scale},
  React.createElement("mesh",{position:[0,.62,0],material:bodyMat},React.createElement("sphereGeometry",{args:[(animal.type==="penguin"||animal.type==="seal") ? .38 : .55,(animal.type==="penguin"||animal.type==="seal") ? .58 : .36,.34]})),
  React.createElement("mesh",{position:[0,1.05,.24],material:bodyMat},React.createElement("sphereGeometry",{args:[.24,12,10]})),
  ...(animal.type==="turtle"?[React.createElement("mesh",{key:"shell",position:[0,.78,-.03],material:new THREE.MeshStandardMaterial({color:"#365d3e"})},React.createElement("sphereGeometry",{args:[.58,.34,.48]}))]:[]),
  ...(animal.type==="penguin"?[React.createElement("mesh",{key:"belly",position:[0,.58,.22],material:white},React.createElement("sphereGeometry",{args:[.25,.42,.13]}))]:[]),
  ...(animal.type==="parrot"?[React.createElement("mesh",{key:"beak",position:[0,1.03,.48],material:new THREE.MeshStandardMaterial({color:"#e5af39"})},React.createElement("coneGeometry",{args:[.09,.24,6]}))]:[]),
  ...Array.from({length:animal.type==="parrot"||animal.type==="penguin"?2:4},(_,i)=>React.createElement("mesh",{key:"leg-"+i,position:[((i%2)?1:-1)*.25,.22,i<2?.23:-.2],material:feetMat},React.createElement("cylinderGeometry",{args:[.055,.07,.42,6]})))
 );
}
function IslandModel({island}){
 const base=useMemo(()=>islandShape(island,1.06,true),[island]),top=useMemo(()=>islandShape(island,.86,false),[island]);
 const sandMat=useMemo(()=>new THREE.MeshStandardMaterial({color:island.sand,roughness:.96}),[island.sand]),grassMat=useMemo(()=>new THREE.MeshStandardMaterial({color:island.color,roughness:.94}),[island.color]);
 return React.createElement("group",{position:[0,0,0]},
  React.createElement("mesh",{geometry:base,position:[island.x,-1.85,island.z],material:sandMat,receiveShadow:true,castShadow:true}),
  React.createElement("mesh",{geometry:top,position:[island.x,.28,island.z],material:grassMat,receiveShadow:true}),
  ...island.trees.map((tree,i)=>React.createElement(IslandTree,{key:"tree-"+i,tree})),
  ...island.animals.map((animal,i)=>React.createElement(IslandAnimal,{key:"animal-"+i,animal}))
 );
}
const fishColors=["#f2b84b","#e76a52","#66c5c7","#e9e1bd","#8d83d9","#4e9c77"];
const jellyMat=new THREE.MeshPhysicalMaterial({color:"#c6a5eb",transparent:true,opacity:.64,roughness:.14,metalness:.08,transmission:.25});
const coralMats=["#e77a73","#e6b45e","#77c5b3"].map(color=>new THREE.MeshStandardMaterial({color,roughness:.88}));
function UnderwaterLife({divingRef,islands}){
 const root=useRef(null),fishRefs=useRef([]),tailRefs=useRef([]),jellyRefs=useRef([]),horseRefs=useRef([]);
 const fish=useMemo(()=>{const r=randomFrom(8128);return Array.from({length:28},(_,i)=>{const island=islands[i%islands.length],a=r()*Math.PI*2,d=55+r()*175;return{x:island.x+Math.cos(a)*d,z:island.z+Math.sin(a)*d,y:-3.5-r()*8,color:fishColors[i%fishColors.length],speed:.55+r()*.55,phase:r()*Math.PI*2,size:.65+r()*.55};});},[islands]);
 const jellies=useMemo(()=>Array.from({length:7},(_,i)=>({x:-350+i*110,z:180*Math.sin(i*2.1),y:-5-(i%3)*2,phase:i*1.7})),[]);
 const horses=useMemo(()=>Array.from({length:8},(_,i)=>({x:-480+i*135,z:260*Math.cos(i*1.4),y:-8-(i%3)*1.5,phase:i*1.1})),[]);
 const horseTube=useMemo(()=>{const c=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.42,0),new THREE.Vector3(-.12,-.18,0),new THREE.Vector3(.02,.02,0),new THREE.Vector3(.19,.22,0),new THREE.Vector3(.2,.43,0)]);return new THREE.TubeGeometry(c,18,.075,8,false);},[]);
 useFrame(({clock})=>{if(root.current)root.current.visible=!!divingRef.current;const t=clock.elapsedTime;
  fish.forEach((f,i)=>{const n=fishRefs.current[i];if(!n)return;const p=t*f.speed+f.phase;n.position.set(f.x+Math.sin(p)*7,f.y+Math.sin(p*1.7)*.7,f.z+Math.cos(p*.7)*5);n.rotation.y=Math.atan2(Math.cos(p*.7)*3.5,Math.cos(p)*7*f.speed);if(tailRefs.current[i])tailRefs.current[i].rotation.y=Math.sin(p*8)*.48;});
  jellies.forEach((f,i)=>{const n=jellyRefs.current[i];if(n){n.position.set(f.x,f.y+Math.sin(t*.8+f.phase)*1.1,f.z);n.rotation.z=Math.sin(t+f.phase)*.08;}});
  horses.forEach((f,i)=>{const n=horseRefs.current[i];if(n){n.position.set(f.x+Math.sin(t*.42+f.phase)*2,f.y+Math.sin(t*.7+f.phase)*.35,f.z);n.rotation.y=Math.sin(t*.4+f.phase)*.2;}});
 });
 return React.createElement("group",{ref:root,visible:false},
  ...fish.map((f,i)=>React.createElement("group",{key:"fish-"+i,ref:n=>{fishRefs.current[i]=n;},scale:f.size},
   React.createElement("mesh",{material:new THREE.MeshStandardMaterial({color:f.color,roughness:.34,metalness:.08})},React.createElement("sphereGeometry",{args:[.62,16,10]})),
   React.createElement("group",{ref:n=>{tailRefs.current[i]=n;},position:[0,0,-.68]},React.createElement("mesh",{rotation:[0,0,Math.PI/2],material:new THREE.MeshStandardMaterial({color:f.color})},React.createElement("coneGeometry",{args:[.38,.58,3]}))),
   React.createElement("mesh",{position:[0,.13,.43],material:new THREE.MeshBasicMaterial({color:"#101c25"})},React.createElement("sphereGeometry",{args:[.055,8,6]}))
  )),
  ...jellies.map((f,i)=>React.createElement("group",{key:"jelly-"+i,ref:n=>{jellyRefs.current[i]=n;}},
   React.createElement("mesh",{material:jellyMat},React.createElement("sphereGeometry",{args:[.56,16,12,0,Math.PI*2,0,Math.PI/2]})),
   ...Array.from({length:6},(_,j)=>React.createElement("mesh",{key:j,position:[Math.cos(j)*.3,-.55,Math.sin(j)*.3],material:jellyMat},React.createElement("cylinderGeometry",{args:[.025,.012,1+(j%3)*.25,6]})))
  )),
  ...horses.map((f,i)=>React.createElement("group",{key:"seahorse-"+i,ref:n=>{horseRefs.current[i]=n;}},
   React.createElement("mesh",{geometry:horseTube,material:new THREE.MeshStandardMaterial({color:"#e2b15d",roughness:.4})}),
   React.createElement("mesh",{position:[.2,.43,0],material:new THREE.MeshStandardMaterial({color:"#e5bf78"})},React.createElement("sphereGeometry",{args:[.17,12,10]})),
   React.createElement("mesh",{position:[.26,.45,.13],material:new THREE.MeshBasicMaterial({color:"#161b20"})},React.createElement("sphereGeometry",{args:[.035,8,6]}))
  )),
  ...islands.flatMap((island,index)=>Array.from({length:5},(_,i)=>{const a=i/5*Math.PI*2;return React.createElement("group",{key:"coral-"+index+"-"+i,position:[island.x+Math.cos(a)*island.rx*.9,-12.5,island.z+Math.sin(a)*island.rz*.9],scale:.8+(i%3)*.22},
   React.createElement("mesh",{material:coralMats[(i+index)%3],position:[0,.8,0]},React.createElement("cylinderGeometry",{args:[.12,.22,1.6,7]})),
   React.createElement("mesh",{material:coralMats[(i+index+1)%3],position:[.24,1.25,.05],rotation:[0,0,-.48]},React.createElement("cylinderGeometry",{args:[.09,.14,1.2,7]})),
   React.createElement("mesh",{material:coralMats[(i+index+2)%3],position:[-.22,1.1,-.06],rotation:[0,0,.52]},React.createElement("cylinderGeometry",{args:[.09,.14,1.05,7]}))
  );}))
 );
}

const dolphinSkin = new THREE.MeshPhysicalMaterial({color:"#526f7d",roughness:.3,metalness:.14,clearcoat:.9,clearcoatRoughness:.18});
const dolphinBelly = new THREE.MeshStandardMaterial({color:"#d8e6e9",roughness:.52});
const dolphinFin = new THREE.MeshPhysicalMaterial({color:"#405b68",roughness:.34,metalness:.1,clearcoat:.7});
const dolphinEye = new THREE.MeshBasicMaterial({color:"#101b20"});
function DolphinModel({dolphin}){
 const root=useRef(null),tail=useRef(null),flippers=useRef([]);
 useFrame(({clock})=>{
  if(!root.current)return;
  root.current.visible=!!dolphin.active;
  root.current.position.set(dolphin.x,dolphin.y+Math.sin(clock.elapsedTime*2.1+dolphin.phase)*.045,dolphin.z);
  root.current.rotation.y=dolphin.yaw;
  root.current.rotation.z=Math.sin(clock.elapsedTime*1.7+dolphin.phase)*.035;
  if(tail.current)tail.current.rotation.y=Math.sin(clock.elapsedTime*7.5+dolphin.phase)*.38;
  flippers.current.forEach((fin,i)=>{if(fin)fin.rotation.z=Math.sin(clock.elapsedTime*4+dolphin.phase+i)*.08+(i===0?-.12:.12);});
 });
 return React.createElement("group",{ref:root},
  React.createElement("mesh",{material:dolphinSkin,scale:[.54,.48,1.62],castShadow:true},React.createElement("sphereGeometry",{args:[1,28,20]})),
  React.createElement("mesh",{material:dolphinBelly,position:[0,-.25,.05],scale:[.41,.23,1.25]},React.createElement("sphereGeometry",{args:[1,24,16]})),
  React.createElement("mesh",{material:dolphinSkin,position:[0,-.02,1.25],scale:[.31,.22,.64]},React.createElement("sphereGeometry",{args:[1,22,16]})),
  React.createElement("mesh",{material:dolphinSkin,position:[0,.47,-.2],rotation:[0,0,Math.PI],scale:[.34,.62,.18]},React.createElement("coneGeometry",{args:[.62,.95,12]})),
  React.createElement("group",{ref:tail,position:[0,0,-1.42]},
   React.createElement("mesh",{material:dolphinSkin,scale:[.23,.2,.58]},React.createElement("sphereGeometry",{args:[1,16,12]})),
   React.createElement("mesh",{material:dolphinFin,position:[-.42,0,-.52],rotation:[0,0,-.18],scale:[.48,.09,.5]},React.createElement("sphereGeometry",{args:[1,16,10]})),
   React.createElement("mesh",{material:dolphinFin,position:[.42,0,-.52],rotation:[0,0,.18],scale:[.48,.09,.5]},React.createElement("sphereGeometry",{args:[1,16,10]}))
  ),
  ...[-1,1].map((side,i)=>React.createElement("group",{key:"flipper-"+side,ref:n=>{flippers.current[i]=n;},position:[side*.44,-.18,.05],rotation:[0,0,side*.28]},
   React.createElement("mesh",{material:dolphinFin,scale:[.18,.09,.64]},React.createElement("sphereGeometry",{args:[1,16,10]}))
  )),
  ...[-1,1].map(side=>React.createElement("mesh",{key:"eye-"+side,material:dolphinEye,position:[side*.31,.16,.94],scale:[.055,.06,.045]},React.createElement("sphereGeometry",{args:[1,12,10]}))),
  React.createElement("mesh",{material:dolphinBelly,position:[0,-.16,1.69],scale:[.2,.07,.23]},React.createElement("sphereGeometry",{args:[1,14,10]}))
 );
}
function DolphinSchool({dolphins,divingRef}){
 const root=useRef(null);
 useFrame(({clock})=>{
  if(root.current)root.current.visible=!!divingRef.current;
  const time=clock.elapsedTime;
  dolphins.forEach(d=>{
   if(d.ridden)return;
   const cycle=(time+d.scheduleOffset)%112;
   d.active=cycle<46;
   if(!d.active)return;
   const phase=time*.34+d.phase;
   d.x=d.baseX+Math.sin(phase)*d.rangeX;
   d.z=d.baseZ+Math.sin(phase*.72)*d.rangeZ;
   d.y=-2.45+Math.sin(phase*1.9)*.22;
   const dx=Math.cos(phase)*d.rangeX*.34,dz=Math.cos(phase*.72)*d.rangeZ*.245;
   d.yaw=Math.atan2(dx,dz);
  });
 });
 return React.createElement("group",{ref:root,visible:false},
  ...dolphins.map(d=>React.createElement(DolphinModel,{key:"dolphin-"+d.id,dolphin:d}))
 );
}

export function MarineWorld({marine,boats,divingRef}){
 return React.createElement(React.Fragment,null,
  ...marine.islands.map(island=>React.createElement(IslandModel,{key:island.id,island})),
  ...boats.map(boat=>React.createElement(BoatModel,{key:"boat-"+boat.id,boat})),
  React.createElement(UnderwaterLife,{divingRef,islands:marine.islands}),
  React.createElement(DolphinSchool,{dolphins:marine.dolphins,divingRef})
 );
}
