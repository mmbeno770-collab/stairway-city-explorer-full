import React, { useEffect, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CITY_HALF } from "./world.js";
import { BoatRaceCourse } from "./boat-race.js";

export const MAINLAND_SHORE = CITY_HALF + 20;
export function mainlandCoastRadius(angle) {
 const c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
 const roundedSquare = MAINLAND_SHORE / Math.pow(Math.pow(c, 14) + Math.pow(s, 14), 1 / 14);
 return roundedSquare + Math.sin(angle * 3 + .55) * 1.0 + Math.sin(angle * 7 - 1.2) * .45;
}
const WATER_LEVEL = -.18;
export function getWaterHeight(x, z, time = 0) {
 return WATER_LEVEL
  + Math.sin(x * .013 + time * 1.08) * .25
  + Math.sin(z * .019 - time * .9) * .16
  + Math.sin((x + z) * .009 + time * .68) * .09
  + Math.sin(x * .036 - z * .031 + time * 2.0) * .025;
}
const seeds = [
 {id:"palm",name:"אי הדקלים",biome:"tropical",x:0,z:-470,rx:84,rz:62,color:"#39864e",sand:"#ead29a",trees:34,animals:["turtle","parrot","monkey","parrot","turtle","crab","toucan","monkey","parrot","turtle","crab","otter","duck","peacock","squirrel","raccoon","seaLion"]},
 {id:"frost",name:"אי הקרח",biome:"winter",x:505,z:-15,rx:68,rz:94,color:"#d9edf1",sand:"#dce8ed",trees:28,animals:["penguin","penguin","seal","polarBear","arcticFox","penguin","seal","moose","polarBear","arcticFox","penguin","arcticFox","snowOwl","reindeer","hare","snowFox","walrus"]},
 {id:"sunny",name:"אי הקיץ",biome:"summer",x:5,z:505,rx:115,rz:78,color:"#83b95a",sand:"#e7d19a",trees:25,animals:["deer","rabbit","rabbit","deer","fox","rabbit","flamingo","deer","rabbit","flamingo","duck","squirrel","peacock","hedgehog","horse","goose"]},
 {id:"green",name:"אי היער",biome:"forest",x:-505,z:35,rx:108,rz:80,color:"#477b42",sand:"#c7b27d",trees:40,animals:["deer","fox","deer","fox","rabbit","bear","wolf","owl","rabbit","deer","fox","owl","boar","squirrel","raccoon","woodpecker","badger","horse"]},
 {id:"lava",name:"אי הלבה",biome:"volcanic",x:620,z:440,rx:82,rz:68,color:"#765044",sand:"#a87959",trees:13,animals:["lizard","lizard","goat","ibex","lizard","fox","ibex","goat","lizard","eagle","wildBoar","mountainGoat","vulture","gecko"]},
 {id:"dune",name:"אי הדיונות",biome:"desert",x:-650,z:-420,rx:67,rz:56,color:"#c7a25e",sand:"#e4c78e",trees:15,animals:["fox","lizard","rabbit","camel","fennec","camel","lizard","fox","eagle","fennec","scorpion","desertOwl","jerboa","gazelle","vulture"]},
 {id:"crystal",name:"אי הקריסטלים",biome:"crystal",x:-690,z:400,rx:74,rz:100,color:"#70a9ad",sand:"#a8c9cc",trees:19,animals:["fox","parrot","rabbit","owl","deer","fox","parrot","rabbit","ibex","owl","peacock","mountainGoat","squirrel","badger","eagle"]},
 {id:"lagoon",name:"אי הלגונה",biome:"lagoon",x:395,z:-700,rx:115,rz:70,color:"#5b9d78",sand:"#f0d9a7",trees:34,animals:["turtle","parrot","turtle","parrot","flamingo","crab","turtle","parrot","crab","flamingo","monkey","otter","duck","seaLion","seagull","ray","pelican"]},
 {id:"residential",name:"אי המגורים",biome:"residential",x:275,z:18,rx:108,rz:82,color:"#668e69",sand:"#ead6a5",trees:9,animals:[],isResidential:true}
];
function randomFrom(seed){let v=seed>>>0;return()=>{v=(v*1664525+1013904223)>>>0;return v/4294967296;};}
function outlineFor(seed){const r=randomFrom(seed);return Array.from({length:18},(_,i)=>{const a=i/18*Math.PI*2;const d=.88+r()*.16+Math.sin(a*3+seed)*.045;return[Math.cos(a)*d,Math.sin(a)*d];});}

export function createMarineWorld(){
 const islands=seeds.map((s,index)=>{
  const r=randomFrom(400+index*71),outline=outlineFor(93+index*31);
  const trees=Array.from({length:s.trees},()=>{const a=r()*Math.PI*2,d=.16+r()*.56;return{x:s.x+Math.cos(a)*s.rx*d,z:s.z+Math.sin(a)*s.rz*d,scale:.72+r()*.6,type:["tropical","lagoon"].includes(s.biome)?"palm":s.biome==="winter"?"snowpine":["desert","volcanic"].includes(s.biome)?"cactus":s.biome==="crystal"?"crystal":s.biome==="forest"?"pine":"broadleaf"};});
  const animals=s.animals.map((type,i)=>{const a=i/s.animals.length*Math.PI*2+r()*.4,d=.24+r()*.35;return{type,x:s.x+Math.cos(a)*s.rx*d,z:s.z+Math.sin(a)*s.rz*d,phase:r()*Math.PI*2,scale:.8+r()*.45};});
  const rocks=Array.from({length:11+Math.floor(r()*8)},()=>{const a=r()*Math.PI*2,d=.63+r()*.2;return{x:s.x+Math.cos(a)*s.rx*d,z:s.z+Math.sin(a)*s.rz*d,scale:.45+r()*.85,yaw:r()*Math.PI*2,tilt:(r()-.5)*.28};});
  return{...s,outline,trees,animals,rocks};
 });
 const boats=[],colors=["#d64b3d","#e3b64e","#397c9c","#e9e9df","#35775e"],along=[-180,-135,-90,-45,0,45,90,135,180];
 for(let side=0;side<4;side++)for(let i=0;i<along.length;i++){
  const d=212,t=along[i];let x=t,z=-d,yaw=Math.PI,ix=0,iz=1;
  if(side===1){x=d;z=t;yaw=Math.PI/2;ix=-1;iz=0;}
  if(side===2){x=t;z=d;yaw=0;ix=0;iz=-1;}
  if(side===3){x=-d;z=t;yaw=-Math.PI/2;ix=1;iz=0;}
  boats.push({id:boats.length,type:"boat",x,y:WATER_LEVEL,z,yaw,speed:0,steering:0,color:colors[(i+side*2)%colors.length],landX:x+ix*6.8,landZ:z+iz*6.8,length:7.4,width:3.3,scale:1.28});
 }

 const residential=islands.find(island=>island.isResidential);
 const residentNames=["אורי","דוד","יונתן","משה","אליהו","יעקב","נחום","שמואל","בנימין","אלעד","אריאל","נעם","אבישי","עמיחי","מתניה","איתן","יהודה","הלל","רפאל","אברהם"];
 if(residential){
  const xOffsets=[-48,-24,0,24,48],zOffsets=[-39,-13,13,39];
  residential.homes=residentNames.map((name,index)=>({id:"island-home-"+index,name,x:residential.x+xOffsets[index%xOffsets.length],z:residential.z+zOffsets[Math.floor(index/xOffsets.length)],color:["#e8dfc8","#d8e7df","#e8d5bb","#d6e0e8"][index%4],roofColor:["#d7d2c4","#b8c5bd","#c7c5bb"][index%3]}));
  for(let i=0;i<24;i++){
   const angle=i/24*Math.PI*2,rx=residential.rx+25,rz=residential.rz+20;
   const x=residential.x+Math.cos(angle)*rx,z=residential.z+Math.sin(angle)*rz;
   boats.push({id:boats.length,type:"boat",x,y:WATER_LEVEL,z,yaw:angle+Math.PI/2,speed:0,steering:0,color:colors[i%colors.length],length:7.4,width:3.3,scale:1.08,decorative:true,islandFleet:true});
  }
  boats.push(
   {id:boats.length,type:"boat",x:132,y:WATER_LEVEL,z:residential.z-9,yaw:Math.PI/2,speed:0,steering:0,color:"#e9eee9",length:9,width:3.8,scale:1.32,decorative:true,residentFerry:true,ferryOffset:0,startX:132,startZ:residential.z-9,endX:residential.x-34,endZ:residential.z-9},
   {id:boats.length+1,type:"boat",x:132,y:WATER_LEVEL,z:residential.z+9,yaw:Math.PI/2,speed:0,steering:0,color:"#397c9c",length:9,width:3.8,scale:1.32,decorative:true,residentFerry:true,ferryOffset:18,startX:132,startZ:residential.z+9,endX:residential.x-34,endZ:residential.z+9}
  );
 }
 const dolphins = [
  {id:0,x:0,y:-2.5,z:-270,yaw:0,speed:0,phase:.2,scheduleOffset:0,baseX:0,baseZ:-278,rangeX:34,rangeZ:42,active:false,ridden:false},
  {id:1,x:270,y:-2.5,z:0,yaw:Math.PI/2,speed:0,phase:1.8,scheduleOffset:29,baseX:278,baseZ:0,rangeX:40,rangeZ:34,active:false,ridden:false},
  {id:2,x:0,y:-2.5,z:270,yaw:Math.PI,speed:0,phase:3.3,scheduleOffset:58,baseX:0,baseZ:278,rangeX:38,rangeZ:44,active:false,ridden:false},
  {id:3,x:-270,y:-2.5,z:0,yaw:-Math.PI/2,speed:0,phase:4.7,scheduleOffset:87,baseX:-278,baseZ:0,rangeX:42,rangeZ:36,active:false,ridden:false}
 ];
 const sleds=[{id:0,name:"מזחלת שלג",islandId:"frost",x:516,y:.28,z:-12,yaw:Math.PI/2,speed:0,steering:0}];
 const jetSkis = [
  {id:0,x:-222,y:WATER_LEVEL,z:-88,yaw:-Math.PI/2,speed:0,steering:0,color:"#f0b33f",landX:-215.5,landZ:-88},
  {id:1,x:222,y:WATER_LEVEL,z:88,yaw:Math.PI/2,speed:0,steering:0,color:"#e84f48",landX:215.5,landZ:88},
  {id:2,x:82,y:WATER_LEVEL,z:-222,yaw:Math.PI,speed:0,steering:0,color:"#38a9bf",landX:82,landZ:-215.5},
  {id:3,x:-82,y:WATER_LEVEL,z:222,yaw:0,speed:0,steering:0,color:"#805fc1",landX:-82,landZ:215.5}
 ];
 return{islands,boats,dolphins,sleds,jetSkis};
}
export function isMainlandLand(x,z){return Math.hypot(x,z)<=mainlandCoastRadius(Math.atan2(z,x));}
export function getIslandAt(x,z,islands){
 for(const island of islands){const nx=(x-island.x)/(island.rx*.96),nz=(z-island.z)/(island.rz*.96),a=Math.atan2(nz,nx),edge=1+Math.sin(a*5+island.rx)*.035+Math.cos(a*3+island.rz)*.025;if(nx*nx+nz*nz<=edge*edge)return island;}
 return null;
}
export function createIslandCollisionBoxes(islands){
 const boxes=[];
 for(const island of islands){const rx=island.rx*.96,rz=island.rz*.96,rows=17;
  for(let row=0;row<rows;row++){const z0=island.z-rz+row/rows*rz*2,z1=island.z-rz+(row+1)/rows*rz*2,nz=((z0+z1)/2-island.z)/rz,half=rx*Math.sqrt(Math.max(.025,1-nz*nz))*.96;if(half<1)continue;
   boxes.push({x0:island.x-half,x1:island.x+half,y0:-1.9,y1:.28,z0,z1,color:island.color,kind:"marine-collider",collide:true,noGround:false});
  }
  if(island.isResidential){
   for(const home of island.homes||[]){
    const x=home.x,z=home.z,halfX=4.55,halfZ=4.05,t=.24,wallTop=3.55;
    boxes.push(
     {x0:x-halfX,y0:.29,y1:wallTop,z0:z-halfZ,x1:x-halfX+t,z1:z+halfZ,kind:"solid",collide:true,noGround:true},
     {x0:x+halfX-t,y0:.29,y1:wallTop,z0:z-halfZ,x1:x+halfX,z1:z+halfZ,kind:"solid",collide:true,noGround:true},
     {x0:x-halfX,y0:.29,y1:wallTop,z0:z-halfZ,x1:x+halfX,z1:z-halfZ+t,kind:"solid",collide:true,noGround:true},
     {x0:x-halfX,y0:.29,y1:wallTop,z0:z+halfZ-t,x1:x-1.0,z1:z+halfZ,kind:"solid",collide:true,noGround:true},
     {x0:x+1.0,y0:.29,y1:wallTop,z0:z+halfZ-t,x1:x+halfX,z1:z+halfZ,kind:"solid",collide:true,noGround:true},
     {x0:x-halfX-.15,y0:wallTop,y1:wallTop+.3,z0:z-halfZ-.15,x1:x+halfX+.15,z1:z+halfZ+.15,kind:"solid",collide:true,noGround:true}
    );
   }
  }
 }
 return boxes;
}

export const hullShape=(()=>{const s=new THREE.Shape();s.moveTo(-1.08,-2.55);s.lineTo(1.08,-2.55);s.lineTo(1.28,1.55);s.lineTo(.72,2.35);s.lineTo(0,2.82);s.lineTo(-.72,2.35);s.lineTo(-1.28,1.55);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:.94,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.13,bevelThickness:.12});g.rotateX(-Math.PI/2);g.computeVertexNormals();return g;})();
const metal=new THREE.MeshStandardMaterial({color:"#343c43",metalness:.68,roughness:.34});
const deck=new THREE.MeshStandardMaterial({color:"#d4c49d",roughness:.84});
const glass=new THREE.MeshPhysicalMaterial({color:"#9ed9e4",transparent:true,opacity:.58,roughness:.12,metalness:.12});
const OCEAN_VERTEX = `
uniform float uTime;
varying float vWave;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
void main(){
 vec3 p=position;
 float a=p.x*.013+uTime*1.08;
 float b=p.y*.019-uTime*.9;
 float c=(p.x+p.y)*.009+uTime*.68;
 float d=p.x*.036-p.y*.031+uTime*2.0;
 float wave=sin(a)*.25+sin(b)*.16+sin(c)*.09+sin(d)*.025;
 float slopeX=cos(a)*.013*.25+cos(c)*.009*.09+cos(d)*.036*.025;
 float slopeZ=cos(b)*.019*.16+cos(c)*.009*.09-cos(d)*.031*.025;
 p.z=wave;
 vec4 worldPosition=modelMatrix*vec4(p,1.0);
 vWorldPosition=worldPosition.xyz;
 vWorldNormal=normalize(mat3(modelMatrix)*vec3(-slopeX,-slopeZ,1.0));
 vWave=wave;
 gl_Position=projectionMatrix*viewMatrix*worldPosition;
}`;
const OCEAN_FRAGMENT = `
uniform vec3 uSunDirection;
varying float vWave;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
void main(){
 float coastAngle = atan(vWorldPosition.z, vWorldPosition.x);
  float coastShape = pow(pow(abs(cos(coastAngle)), 14.0) + pow(abs(sin(coastAngle)), 14.0), 1.0 / 14.0);
  float coastRadius = ${MAINLAND_SHORE.toFixed(1)} / coastShape + sin(coastAngle * 3.0 + .55) * 1.0 + sin(coastAngle * 7.0 - 1.2) * .45;
  if(length(vWorldPosition.xz) < coastRadius) discard;
 vec3 normal=normalize(vWorldNormal);
 vec3 viewDirection=normalize(cameraPosition-vWorldPosition);
 vec3 sunDirection=normalize(uSunDirection);
 vec3 halfVector=normalize(viewDirection+sunDirection);
 float diffuse=max(dot(normal,sunDirection),0.0);
 float fresnel=pow(1.0-max(dot(normal,viewDirection),0.0),4.0);
 float specular=pow(max(dot(normal,halfVector),0.0),96.0);
 float broadWave=smoothstep(-0.3,0.22,vWave);
 float foam=smoothstep(0.245,0.365,vWave);
 vec3 deep=vec3(0.008,0.105,0.19);
 vec3 blue=vec3(0.018,0.30,0.40);
 vec3 color=mix(deep,blue,broadWave);
 color*=0.68+diffuse*0.48;
 color=mix(color,vec3(0.36,0.70,0.72),fresnel*0.52);
 color=mix(color,vec3(0.72,0.91,0.88),foam*0.48);
 color+=vec3(0.78,0.91,1.0)*specular*(0.65+diffuse*1.2);
 gl_FragColor=vec4(color,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
function OceanSurface({quality}){
 const material=useMemo(()=>new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uSunDirection:{value:new THREE.Vector3(.36,.82,.44)}},
  vertexShader:OCEAN_VERTEX,fragmentShader:OCEAN_FRAGMENT,
  transparent:false,depthWrite:true,side:THREE.DoubleSide
 }),[]);
 const segments=quality==="high"?192:quality==="low"?104:144;
 const geometry=useMemo(()=>new THREE.PlaneGeometry(2400,2400,segments,segments),[segments]);
 useFrame(({clock})=>{material.uniforms.uTime.value=clock.elapsedTime;});
 return React.createElement("mesh",{geometry,material,rotation:[-Math.PI/2,0,0],position:[0,WATER_LEVEL,0],frustumCulled:false});
}
function beachGeometry(island){
 const shape=new THREE.Shape();
 island.outline.forEach(([x,z],i)=>{const px=x*island.rx*1.015,pz=z*island.rz*1.015;if(i===0)shape.moveTo(px,pz);else shape.lineTo(px,pz);});
 shape.closePath();
 const inner=new THREE.Path();
 for(let i=island.outline.length-1;i>=0;i--){const [x,z]=island.outline[i],px=x*island.rx*.86,pz=z*island.rz*.86;if(i===island.outline.length-1)inner.moveTo(px,pz);else inner.lineTo(px,pz);}
 inner.closePath();shape.holes.push(inner);
 const geometry=new THREE.ShapeGeometry(shape,24);geometry.rotateX(-Math.PI/2);return geometry;
}
function IslandFoam({island}){
 const ref=useRef(null);
 const geometry=useMemo(()=>{
  const points=island.outline.map(([x,z])=>new THREE.Vector3(x*island.rx*1.035,0,z*island.rz*1.035));
  const curve=new THREE.CatmullRomCurve3(points,true,"centripetal");
  return new THREE.TubeGeometry(curve,180,.14,5,true);
 },[island]);
 const material=useMemo(()=>new THREE.MeshStandardMaterial({color:"#c9f5ef",emissive:"#357b8d",emissiveIntensity:.5,transparent:true,opacity:.6,depthWrite:false,roughness:.3}),[]);
 useFrame(({clock})=>{
  if(!ref.current)return;
  ref.current.position.y=WATER_LEVEL+.1+Math.sin(clock.elapsedTime*.8+island.x*.01)*.025;
  material.opacity=.42+Math.sin(clock.elapsedTime*1.4+island.z*.01)*.13;
 });
 return React.createElement("mesh",{ref,geometry,material,position:[island.x,0,island.z],renderOrder:2});
}
function JetSkiModel({jetSki}){
 const root=useRef(null),paint=useMemo(()=>new THREE.MeshPhysicalMaterial({color:jetSki.color,metalness:.48,roughness:.2,clearcoat:1}),[jetSki.color]);
 useFrame(({clock})=>{
  if(!root.current)return;
  const t=clock.elapsedTime;
  root.current.position.set(jetSki.x,jetSki.y+Math.sin(t*2.4+jetSki.id)*.045,jetSki.z);
  root.current.rotation.y=jetSki.yaw;
  root.current.rotation.x=Math.sin(t*2+jetSki.id)*.025;
  root.current.rotation.z=jetSki.steering*.075;
 });
 return React.createElement("group",{ref:root},
  React.createElement("mesh",{material:paint,position:[0,.04,0],scale:[.53,.28,1.18],castShadow:true},React.createElement("sphereGeometry",{args:[1,18,12]})),
  React.createElement("mesh",{material:paint,position:[0,.08,.8],rotation:[Math.PI/2,0,0],scale:[1,.8,1]},React.createElement("coneGeometry",{args:[.53,1.02,10]})),
  React.createElement("mesh",{material:metal,position:[0,.38,-.12],scale:[.8,1,.65]},React.createElement("boxGeometry",{args:[.52,.1,.62]})),
  React.createElement("mesh",{material:deck,position:[0,.27,-.22],scale:[.9,1,1]},React.createElement("boxGeometry",{args:[.36,.08,.5]})),
  React.createElement("mesh",{material:glass,position:[0,.55,-.42],scale:[1,1,.6]},React.createElement("boxGeometry",{args:[.28,.22,.035]})),
  React.createElement("mesh",{material:metal,position:[0,.48,-.62]},React.createElement("boxGeometry",{args:[.72,.055,.07]})),
  ...[-1,1].map(side=>React.createElement("mesh",{key:"grip-"+side,material:metal,position:[side*.34,.48,-.62]},React.createElement("cylinderGeometry",{args:[.045,.045,.16,8]}))),
  React.createElement("mesh",{material:new THREE.MeshStandardMaterial({color:"#f7e3a1",emissive:"#a17b36",emissiveIntensity:.45}),position:[0,.23,1.08]},React.createElement("sphereGeometry",{args:[.12,10,8]}))
 );
}
const boatDetailPaint = new THREE.MeshStandardMaterial({ color: "#eff0e7", metalness: .19, roughness: .38 });
const boatDetailSteel = new THREE.MeshStandardMaterial({ color: "#b8c4c9", metalness: .81, roughness: .23 });
const boatDetailBlack = new THREE.MeshStandardMaterial({ color: "#1d2b32", roughness: .72 });
const boatDetailRed = new THREE.MeshStandardMaterial({ color: "#e6444a", emissive: "#e6444a", emissiveIntensity: .55 });
const boatDetailGreen = new THREE.MeshStandardMaterial({ color: "#3ed690", emissive: "#3ed690", emissiveIntensity: .55 });
function BoatDetails({ boat }) {
 const detailGroup = useRef(null);
 const { camera } = useThree();
 useFrame(() => {
  if (!detailGroup.current) return;
  const dx = camera.position.x - boat.x, dz = camera.position.z - boat.z;
  detailGroup.current.visible = dx * dx + dz * dz < 195 * 195;
 });
 const mesh = (key, type, args, material, position, rotation = [0, 0, 0]) =>
  React.createElement("mesh", { key, position, rotation, material, castShadow: true }, React.createElement(type, { args }));
 return React.createElement("group", { ref: detailGroup },
  mesh("bow-trim", "boxGeometry", [1.72, .1, .16], boatDetailPaint, [0, .27, 2.2]),
  mesh("stern-trim", "boxGeometry", [1.62, .06, .16], boatDetailSteel, [0, .08, -2.4]),
  mesh("console-top", "boxGeometry", [1.38, .095, .48], boatDetailPaint, [0, .67, -.86]),
  mesh("console-dark", "boxGeometry", [1.31, .08, .42], boatDetailBlack, [0, .47, -.9]),
  mesh("bow-cleat", "cylinderGeometry", [.095, .11, .2, 12], boatDetailSteel, [0, .84, 2.08]),
  mesh("antenna", "cylinderGeometry", [.065, .065, .8, 12], boatDetailSteel, [0, .33, -2.69], [Math.PI / 2, 0, 0]),
  mesh("lifebuoy", "torusGeometry", [.22, .07, 8, 18], boatDetailPaint, [-.76, .46, 1.3], [Math.PI / 2, .3, 0]),
  mesh("console-foot", "boxGeometry", [.48, .05, .15], boatDetailSteel, [0, .4, -1.62]),
  mesh("console-post", "cylinderGeometry", [.045, .055, .46, 8], boatDetailSteel, [0, .52, -1.6]),
  mesh("port-light", "sphereGeometry", [.085, 12, 8], boatDetailRed, [-.96, .62, 2.36]),
  mesh("starboard-light", "sphereGeometry", [.085, 12, 8], boatDetailGreen, [.96, .62, 2.36]),
  mesh("bow-cleat-left", "boxGeometry", [.12, .075, .3], boatDetailSteel, [-.72, .32, 2.12]),
  mesh("bow-cleat-right", "boxGeometry", [.12, .075, .3], boatDetailSteel, [.72, .32, 2.12])
 );
}

function BoatModel({boat}) {
 const root=useRef(null),wake=useRef(null),paint=useMemo(()=>new THREE.MeshPhysicalMaterial({color:boat.color,metalness:.46,roughness:.22,clearcoat:1,clearcoatRoughness:.12}),[boat.color]);
 const wakeMaterial=useMemo(()=>new THREE.MeshBasicMaterial({color:"#bdeef2",transparent:true,opacity:.36,depthWrite:false,side:THREE.DoubleSide}),[]);
 useFrame(({clock})=>{if(!root.current)return;root.current.position.set(boat.x,boat.y+Math.sin(clock.elapsedTime*1.8+boat.id)*.045,boat.z);root.current.rotation.y=boat.yaw;root.current.rotation.z=Math.sin(clock.elapsedTime*1.25+boat.id)*.018;root.current.rotation.x=Math.sin(clock.elapsedTime*1.05+boat.id*.7)*.012;const speed=Math.abs(boat.speed||0);if(wake.current){wake.current.visible=speed>1.4;wake.current.scale.z=.55+Math.min(2.2,speed*.13);wakeMaterial.opacity=THREE.MathUtils.clamp(speed*.026,0,.48);}});
 return React.createElement("group",{ref:root,scale:boat.scale||1.28},
  React.createElement(BoatDetails, { boat }),
  React.createElement("group",{ref:wake,position:[0,-.27,-3.0]},
   ...[-1,1].map(side=>React.createElement("mesh",{key:"wake-"+side,position:[side*.55,0,-1.45],rotation:[-Math.PI/2,0,side*.09],material:wakeMaterial},React.createElement("planeGeometry",{args:[.62,4.8]}))),
   React.createElement("mesh",{position:[0,.005,-1.15],rotation:[-Math.PI/2,0,0],material:wakeMaterial},React.createElement("planeGeometry",{args:[1.6,2.8]}))
  ),
  React.createElement("mesh",{geometry:hullShape,position:[0,-.56,0],material:paint,castShadow:true,receiveShadow:true}),
  React.createElement("mesh",{position:[0,.22,-.28],material:deck},React.createElement("boxGeometry",{args:[1.9,.1,3.8]})),
  ...[-1,1].map(side=>React.createElement("mesh",{key:"raised-gunwale-"+side,position:[side*.99,.42,-.05],material:paint,castShadow:true},React.createElement("boxGeometry",{args:[.15,.42,4.45]}))),
  React.createElement("mesh",{position:[0,.36,-.85],material:metal},React.createElement("boxGeometry",{args:[1.45,.42,.42]})),
  React.createElement("mesh",{position:[0,.72,-.85],material:glass},React.createElement("boxGeometry",{args:[1.18,.48,.035]})),
  React.createElement("mesh",{position:[0,1.08,-.88],material:deck},React.createElement("boxGeometry",{args:[1.75,.15,1.12]})),
  React.createElement("mesh",{position:[0,1.2,-.9],material:deck,castShadow:true},React.createElement("boxGeometry",{args:[1.92,.15,1.3]})),
  ...[-1,1].map(side=>React.createElement("mesh",{key:"cabin-side-window-"+side,position:[side*.72,.75,-.9],material:glass},React.createElement("boxGeometry",{args:[.045,.46,.82]}))),
  ...[-1,1].map(side=>React.createElement("mesh",{key:"lounge-seat-"+side,position:[side*.48,.42,1.05],material:deck},React.createElement("boxGeometry",{args:[.62,.22,.92]}))),
  React.createElement("mesh",{position:[0,.42,-1.75],material:deck},React.createElement("boxGeometry",{args:[1.65,.18,.52]})),
  React.createElement("mesh",{position:[0,.3,-2.28],material:metal},React.createElement("boxGeometry",{args:[1.22,.48,.28]})),
  React.createElement("mesh",{position:[0,.27,1.95],material:deck},React.createElement("boxGeometry",{args:[1.12,.08,.58]})),
  React.createElement("mesh",{position:[0,.76,2.55]},React.createElement("sphereGeometry",{args:[.13,10,8]}),React.createElement("meshBasicMaterial",{color:"#fff2c4"})),
  ...[-1,1].flatMap(side=>[
   React.createElement("mesh",{key:"rail-low-"+side,position:[side*.92,.55,-.1],material:metal},React.createElement("boxGeometry",{args:[.065,.065,4.3]})),
   ...[-1.85,-.1,1.85].map((z,i)=>React.createElement("mesh",{key:"rail-post-"+side+"-"+i,position:[side*.99,.48,z],material:metal},React.createElement("cylinderGeometry",{args:[.045,.045,.84,8]}))),
   React.createElement("mesh",{key:"rail-top-"+side,position:[side*.92,.78,-.1],material:metal},React.createElement("boxGeometry",{args:[.075,.075,4.35]})),
   React.createElement("mesh",{key:"gold-line-"+side,position:[side*.91,-.22,0],material:new THREE.MeshStandardMaterial({color:"#d7b36a",metalness:.82,roughness:.25})},React.createElement("boxGeometry",{args:[.035,.045,4.2]}))
  ]),
  React.createElement("mesh",{position:[0,.98,-.9],material:metal},React.createElement("boxGeometry",{args:[1.28,.08,.08]})),
  React.createElement("mesh",{position:[0,1.02,-.9],material:glass},React.createElement("boxGeometry",{args:[1.1,.34,.035]})),
  React.createElement("mesh",{position:[0,.56,1.42],material:metal},React.createElement("boxGeometry",{args:[.62,.08,.55]})),
  React.createElement("mesh",{position:[0,.72,1.4],material:deck},React.createElement("boxGeometry",{args:[.72,.22,.32]})),
  React.createElement("mesh",{position:[0,.43,.92],material:metal},React.createElement("cylinderGeometry",{args:[.21,.21,.28,12]})),
  React.createElement("mesh",{position:[0,.58,.92],material:deck},React.createElement("cylinderGeometry",{args:[.25,.25,.05,12]})),
  React.createElement("mesh",{position:[0,.12,-2.65],material:boatDetailBlack,castShadow:true},React.createElement("boxGeometry",{args:[.62,.9,.34]})),
  React.createElement("mesh",{position:[0,-.24,-2.82],material:boatDetailSteel,rotation:[Math.PI/2,0,0]},React.createElement("cylinderGeometry",{args:[.08,.08,.42,12]})),
  React.createElement("mesh",{position:[0,.28,-2.56],material:boatDetailPaint},React.createElement("boxGeometry",{args:[1.7,.08,.62]}))
 );
}
function IslandRock({rock,island}){
 const material=island.biome==="winter"?snow:island.biome==="volcanic"?landmarkStone:island.biome==="crystal"?crystal:landmarkStone;
 return React.createElement("group",{position:[rock.x,.28,rock.z],rotation:[rock.tilt,rock.yaw,rock.tilt*.45],scale:rock.scale},
  React.createElement("mesh",{material,castShadow:true,receiveShadow:true,scale:[1.15,.76,.92]},React.createElement("dodecahedronGeometry",{args:[1,0]})),
  React.createElement("mesh",{material,position:[.48,.08,.16],scale:[.48,.55,.58]},React.createElement("dodecahedronGeometry",{args:[1,0]}))
 );
}
function islandShape(island,scale,extrude){
 const shape=new THREE.Shape();island.outline.forEach(([x,z],i)=>{const px=x*island.rx*scale,pz=z*island.rz*scale;if(i===0)shape.moveTo(px,pz);else shape.lineTo(px,pz);});shape.closePath();
 const g=extrude?new THREE.ExtrudeGeometry(shape,{depth:2.05,bevelEnabled:true,bevelSegments:3,bevelSize:.42,bevelThickness:.34,steps:1}):new THREE.ShapeGeometry(shape,16);g.rotateX(-Math.PI/2);g.computeVertexNormals();return g;
}
const leaf=new THREE.MeshStandardMaterial({color:"#548c49",roughness:.94}),pine=new THREE.MeshStandardMaterial({color:"#27533d",roughness:.94}),snow=new THREE.MeshStandardMaterial({color:"#edf4f5"}),trunk=new THREE.MeshStandardMaterial({color:"#75513a",roughness:.96}),cactus=new THREE.MeshStandardMaterial({color:"#42865a"}),crystal=new THREE.MeshPhysicalMaterial({color:"#99e0e8",emissive:"#287b91",emissiveIntensity:.4,metalness:.4,roughness:.2});
const landmarkWood=new THREE.MeshStandardMaterial({color:"#79543a",roughness:.9}),landmarkStone=new THREE.MeshStandardMaterial({color:"#b8b5aa",roughness:.95}),landmarkRoof=new THREE.MeshStandardMaterial({color:"#884b35",roughness:.88}),landmarkLava=new THREE.MeshStandardMaterial({color:"#ff6b24",emissive:"#d93208",emissiveIntensity:1.35}),landmarkWater=new THREE.MeshPhysicalMaterial({color:"#42b8d2",roughness:.18,metalness:.08,transparent:true,opacity:.82});
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
 const ref=useRef(null),legRefs=useRef([]),wingRefs=useRef([]);
 const birdTypes=["parrot","toucan","owl","eagle","snowOwl","desertOwl","peacock","woodpecker","vulture","seagull","pelican"];
 useFrame(({clock})=>{
  if(!ref.current)return;
  const t=clock.elapsedTime,phase=t*.34+animal.phase,stride=Math.sin(t*5+animal.phase);
  ref.current.position.set(animal.x+Math.sin(phase)*.48,.27+Math.sin(t*2.1+animal.phase)*.035,animal.z+Math.cos(phase*.8)*.34);
  ref.current.rotation.y=Math.atan2(Math.cos(phase)*.48,-Math.sin(phase*.8)*.27);
  legRefs.current.forEach((leg,i)=>{if(leg)leg.rotation.x=stride*(i%2?-.24:.24);});
  wingRefs.current.forEach((wing,i)=>{if(wing)wing.rotation.z=(i===0?-1:1)*Math.sin(t*6.2+animal.phase)*.36;});
 });
 const animalColor={penguin:"#273b46",fox:"#bd7042",arcticFox:"#f2eee4",deer:"#a97c4d",moose:"#765538",lizard:"#5d9363",seal:"#829ca5",polarBear:"#ece9df",bear:"#765b49",wolf:"#8d9195",owl:"#92765a",parrot:"#27a77b",toucan:"#253b40",monkey:"#9a6842",crab:"#d65b45",goat:"#ded6c1",ibex:"#96734d",turtle:"#607b49",rabbit:"#d3c7b5",flamingo:"#e58e9f",camel:"#bf925d",fennec:"#d5b47a",eagle:"#715b45",otter:"#705c4d",duck:"#c7a45d",peacock:"#267c83",squirrel:"#9b6946",raccoon:"#65686a",seaLion:"#687f89",snowOwl:"#eee9df",reindeer:"#8a6447",hare:"#c9c0b6",snowFox:"#e9e3d9",walrus:"#71645d",hedgehog:"#88735d",goose:"#e4e0d6",boar:"#665044",woodpecker:"#b64e3e",badger:"#77736c",mountainGoat:"#ddd7c8",vulture:"#6b5c4a",gecko:"#739b63",scorpion:"#9b7951",desertOwl:"#d7c19a",jerboa:"#c8a77d",gazelle:"#c08c5c",horse:"#8a5c3e",seagull:"#e7e9e4",ray:"#526b78",pelican:"#d9d5c8",wildBoar:"#665044"}[animal.type]||"#72876a";
 const bodyMat=new THREE.MeshStandardMaterial({color:animalColor,roughness:.9}),white=new THREE.MeshStandardMaterial({color:"#f1f1e9"}),feetMat=new THREE.MeshStandardMaterial({color:animal.type==="penguin"?"#eaa64a":"#51493e"});
 return React.createElement("group",{ref,position:[animal.x,.27,animal.z],scale:animal.scale},
  React.createElement("mesh",{position:[0,.62,0],material:bodyMat},React.createElement("sphereGeometry",{args:[(animal.type==="penguin"||animal.type==="seal") ? .38 : .55,(animal.type==="penguin"||animal.type==="seal") ? .58 : .36,.34]})),
  React.createElement("mesh",{position:[0,1.05,.24],material:bodyMat},React.createElement("sphereGeometry",{args:[.24,12,10]})),
  ...(animal.type==="turtle"?[React.createElement("mesh",{key:"shell",position:[0,.78,-.03],material:new THREE.MeshStandardMaterial({color:"#365d3e"})},React.createElement("sphereGeometry",{args:[.58,.34,.48]}))]:[]),
  ...(animal.type==="penguin"?[React.createElement("mesh",{key:"belly",position:[0,.58,.22],material:white},React.createElement("sphereGeometry",{args:[.25,.42,.13]}))]:[]),
  ...(animal.type==="parrot"?[React.createElement("mesh",{key:"beak",position:[0,1.03,.48],material:new THREE.MeshStandardMaterial({color:"#e5af39"})},React.createElement("coneGeometry",{args:[.09,.24,6]}))]:[]),
  ...(animal.type==="flamingo"?[
   React.createElement("mesh",{key:"flamingo-neck",position:[0,1.42,.28],material:bodyMat},React.createElement("cylinderGeometry",{args:[.075,.1,.95,8]})),
   React.createElement("mesh",{key:"flamingo-neck-head",position:[0,1.9,.38],material:bodyMat},React.createElement("sphereGeometry",{args:[.17,10,8]})),
   React.createElement("mesh",{key:"flamingo-beak",position:[0,1.89,.55],rotation:[Math.PI/2,0,0],material:feetMat},React.createElement("coneGeometry",{args:[.065,.22,6]})),
   ...[-1,1].map(side=>React.createElement("mesh",{key:"flamingo-leg-"+side,position:[side*.12,.48,.03],material:feetMat},React.createElement("cylinderGeometry",{args:[.025,.03,.95,7]})))
  ]:[]),
  ...(animal.type==="camel"?[
   React.createElement("mesh",{key:"camel-hump-a",position:[-.2,.98,-.08],material:bodyMat},React.createElement("sphereGeometry",{args:[.28,.34,.3]})),
   React.createElement("mesh",{key:"camel-hump-b",position:[.2,.98,-.08],material:bodyMat},React.createElement("sphereGeometry",{args:[.28,.34,.3]}))
  ]:[]),
  ...(["deer","reindeer","moose"].includes(animal.type)?[-1,1].map(side=>React.createElement("mesh",{key:"antler-"+side,position:[side*.14,1.36,.2],rotation:[0,0,side*.32],material:feetMat},React.createElement("cylinderGeometry",{args:[.025,.045,.52,6]}))):[]),
  ...(birdTypes.includes(animal.type)?[-1,1].map((side,i)=>React.createElement("mesh",{key:"wing-"+side,ref:n=>{wingRefs.current[i]=n;},position:[side*.38,.78,-.02],rotation:[0,0,side*.12],material:bodyMat,scale:[.3,.055,.48]},React.createElement("sphereGeometry",{args:[1,10,8]}))):[]),
  ...Array.from({length:animal.type==="parrot"||animal.type==="penguin"?2:4},(_,i)=>React.createElement("mesh",{key:"leg-"+i,ref:n=>{legRefs.current[i]=n;},position:[((i%2)?1:-1)*.25,.22,i<2?.23:-.2],material:feetMat},React.createElement("cylinderGeometry",{args:[.055,.07,.42,6]})))
 );
}
function IslandLandmark({island}){
 const x=island.x-island.rx*.28,z=island.z+island.rz*.12;
 if(island.biome==="winter")return React.createElement("group",{position:[island.x+island.rx*.28,.28,island.z+island.rz*.18]},
  React.createElement("mesh",{position:[0,1.35,0],material:snow},React.createElement("sphereGeometry",{args:[3.8,20,14,0,Math.PI*2,0,Math.PI/2]})),
  React.createElement("mesh",{position:[0,.72,3.62],material:landmarkStone},React.createElement("boxGeometry",{args:[1.45,1.45,.28]})),
  React.createElement("mesh",{position:[0,.62,3.43],material:new THREE.MeshStandardMaterial({color:"#233744"})},React.createElement("boxGeometry",{args:[.72,1.05,.06]})),
  React.createElement("mesh",{position:[-6,.16,-2],material:snow},React.createElement("sphereGeometry",{args:[1.35,12,9]}))
 );
 if(island.biome==="tropical"||island.biome==="lagoon")return React.createElement("group",{position:[x,.28,z]},
  React.createElement("mesh",{position:[0,1.45,0],material:landmarkWood},React.createElement("boxGeometry",{args:[4.6,.22,3.5]})),
  ...[-1,1].flatMap(side=>[-1,1].map(back=>React.createElement("mesh",{key:side+"-"+back,position:[side*1.85,.68,back*1.25],material:landmarkWood},React.createElement("cylinderGeometry",{args:[.12,.17,1.45,7]})))),
  React.createElement("mesh",{position:[0,2.55,0],material:landmarkRoof},React.createElement("coneGeometry",{args:[3.2,1.9,4]})),
  React.createElement("mesh",{position:[0,.07,4.6],material:landmarkWood},React.createElement("boxGeometry",{args:[1.4,.15,5.5]}))
 );
 if(island.biome==="forest")return React.createElement("group",{position:[x,.28,z]},
  React.createElement("mesh",{position:[0,1.1,0],material:landmarkWood},React.createElement("boxGeometry",{args:[4.1,2.1,3.5]})),
  React.createElement("mesh",{position:[0,2.65,0],rotation:[0,Math.PI/4,0],material:landmarkRoof},React.createElement("coneGeometry",{args:[3.2,1.8,4]})),
  React.createElement("mesh",{position:[0,.85,1.79],material:landmarkStone},React.createElement("boxGeometry",{args:[.95,1.5,.06]}))
 );
 if(island.biome==="summer")return React.createElement("group",{position:[island.x+island.rx*.28,.3,island.z-island.rz*.18]},
  React.createElement("mesh",{rotation:[-Math.PI/2,0,0],material:landmarkWater},React.createElement("circleGeometry",{args:[5.2,28]})),
  React.createElement("mesh",{position:[-7,.25,-2],material:landmarkWood},React.createElement("cylinderGeometry",{args:[.2,.2,2.2,8]})),
  React.createElement("mesh",{position:[-7,1.42,-2],material:new THREE.MeshStandardMaterial({color:"#edb54d"}),scale:[1,.16,1]},React.createElement("sphereGeometry",{args:[2.2,14,10]}))
 );
 if(island.biome==="volcanic")return React.createElement("group",{position:[island.x+island.rx*.22,.28,island.z-island.rz*.12]},
  React.createElement("mesh",{position:[0,2.7,0],material:landmarkStone},React.createElement("coneGeometry",{args:[8,5.8,9]})),
  React.createElement("mesh",{position:[0,4.35,0],material:landmarkLava},React.createElement("torusGeometry",{args:[2.25,.3,8,24]})),
  React.createElement("mesh",{position:[0,4.15,0],material:landmarkLava},React.createElement("cylinderGeometry",{args:[1.35,1.8,.28,20]}))
 );
 if(island.biome==="desert")return React.createElement("group",{position:[x,.28,z]},
  React.createElement("mesh",{position:[0,.08,0],rotation:[-Math.PI/2,0,0],material:landmarkWater},React.createElement("circleGeometry",{args:[4.2,24]})),
  ...[-1,1].map(side=>React.createElement("mesh",{key:side,position:[side*5,1.3,-1],material:landmarkStone},React.createElement("boxGeometry",{args:[.8,2.6,.8]}))),
  React.createElement("mesh",{position:[0,2.55,-1],material:landmarkStone},React.createElement("boxGeometry",{args:[11,.45,1.1]}))
 );
 return React.createElement("group",{position:[island.x+island.rx*.2,.28,island.z-island.rz*.2]},
  ...[0,1,2,3].map(i=>React.createElement("mesh",{key:i,position:[(i%2?1:-1)*(1.2+i*.55),1.1+(i%3)*.6,((i<2)?1:-1)*.9],rotation:[.12*i,.6*i,.18*i],material:crystal,scale:[.9,2.4+i*.35,.9]},React.createElement("octahedronGeometry",{args:[1,1]})))
 );
}
function SledModel({sled}){
 const root=useRef(null);
 useFrame(()=>{if(!root.current)return;root.current.position.set(sled.x,sled.y,sled.z);root.current.rotation.y=sled.yaw;root.current.rotation.z=sled.steering*.06;});
 return React.createElement("group",{ref:root},
  ...[-1,1].map(side=>React.createElement("group",{key:side,position:[side*.56,.1,0]},
   React.createElement("mesh",{material:metal,rotation:[Math.PI/2,0,0]},React.createElement("cylinderGeometry",{args:[.075,.075,4.2,10]})),
   React.createElement("mesh",{position:[0,.18,0],material:landmarkWood},React.createElement("boxGeometry",{args:[.18,.16,4.25]}))
  )),
  React.createElement("mesh",{position:[0,.66,-.12],material:landmarkWood},React.createElement("boxGeometry",{args:[1.32,.18,2.05]})),
  React.createElement("mesh",{position:[0,.94,-.88],material:landmarkWood},React.createElement("boxGeometry",{args:[1.32,.62,.16]})),
  React.createElement("mesh",{position:[0,.48,1.55],material:landmarkWood},React.createElement("boxGeometry",{args:[.1,.12,1.05]}))
 );
}

const islandAccentColors={tropical:"#78a95d",winter:"#ffffff",summer:"#b4d27a",forest:"#79a45c",volcanic:"#a76042",desert:"#e5c27d",crystal:"#b5e1dc",lagoon:"#9acb9e"};
function createIslandTexture(baseHex,accentHex,seed,repeat){
 const size=128,data=new Uint8Array(size*size*4);
 const base=new THREE.Color(baseHex),accent=new THREE.Color(accentHex),shadow=base.clone().multiplyScalar(.72),color=new THREE.Color();
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size;
  const broad=.5+.25*Math.sin(u*6.4+Math.cos(v*4.8+seed))+.25*Math.cos(v*7.2-Math.sin(u*5.1+seed*.7));
  const medium=Math.sin(u*39+v*17+seed)*Math.cos(v*33-u*11+seed*.4);
  const grain=Math.sin((x*17+y*31+seed)*.73)*Math.cos((y*23-x*7+seed)*.51);
  const variation=THREE.MathUtils.clamp(.55+broad*.27+medium*.1+grain*.045,0,1);
  color.copy(shadow).lerp(base,variation);
  color.lerp(accent,Math.max(0,broad-.78)*.72);
  color.convertLinearToSRGB();
  const offset=(y*size+x)*4;
  data[offset]=Math.round(color.r*255);data[offset+1]=Math.round(color.g*255);data[offset+2]=Math.round(color.b*255);data[offset+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;
 texture.repeat.set(repeat,repeat);
 texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.generateMipmaps=true;texture.needsUpdate=true;
 return texture;
}


function createOwnedIslandNameTexture(name) {
 const canvas=document.createElement("canvas");canvas.width=640;canvas.height=144;
 const ctx=canvas.getContext("2d");ctx.fillStyle="#102631";ctx.fillRect(0,0,640,144);
 ctx.strokeStyle="#e4c68b";ctx.lineWidth=8;ctx.strokeRect(5,5,630,134);
 ctx.fillStyle="#fff0cf";ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="bold 56px Rubik, Arial, sans-serif";
 let label=String(name||"האי שלי");while(ctx.measureText(label).width>570&&label.length>4)label=label.slice(0,-1);
 ctx.fillText(label,320,73);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function OwnedIslandSign({island}) {
 const texture=useMemo(()=>createOwnedIslandNameTexture(island.name),[island.name]);
 const signMaterial=useMemo(()=>new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}),[texture]);
 const trimMaterial=useMemo(()=>new THREE.MeshStandardMaterial({color:island.flagColor||"#d4ad68",roughness:.48,metalness:.18}),[island.flagColor]);
 useEffect(()=>()=>{texture.dispose();signMaterial.dispose();trimMaterial.dispose();},[texture,signMaterial,trimMaterial]);
 return React.createElement("group",{position:[island.x-island.rx*.48,.3,island.z-island.rz*.28]},
  ...[-1,1].map((side)=>React.createElement("group",{key:"sign-support-"+side,position:[side*1.72,0,0]},
   React.createElement("mesh",{position:[0,1.68,0],material:landmarkWood,castShadow:true},React.createElement("boxGeometry",{args:[.2,3.35,.2]})),
   React.createElement("mesh",{position:[0,.14,0],material:trimMaterial},React.createElement("boxGeometry",{args:[.48,.22,.46]})),
   React.createElement("mesh",{position:[0,3.28,0],material:trimMaterial},React.createElement("boxGeometry",{args:[.3,.16,.3]}))
  )),
  React.createElement("mesh",{position:[0,3.02,.02],material:landmarkWood,castShadow:true},React.createElement("boxGeometry",{args:[4.2,1.55,.24]})),
  React.createElement("mesh",{position:[0,3.02,.16],material:trimMaterial},React.createElement("boxGeometry",{args:[3.95,1.3,.045]})),
  React.createElement("mesh",{position:[0,3.02,.19],material:signMaterial},React.createElement("planeGeometry",{args:[3.78,.85]}))
 );
}
function OwnedIslandField({field}) {
 const soil=new THREE.MeshStandardMaterial({color:"#76543b",roughness:1});
 const crop=new THREE.MeshStandardMaterial({color:"#88a84f",roughness:.94});
 const gold=new THREE.MeshStandardMaterial({color:"#d5b45e",roughness:.96});
 return React.createElement("group",{position:[field.x,.33,field.z]},
  React.createElement("mesh",{rotation:[-Math.PI/2,0,0],position:[0,.02,0],material:soil,receiveShadow:true},React.createElement("planeGeometry",{args:[11,8]})),
  ...Array.from({length:5},(_,row)=>Array.from({length:7},(_,col)=>{
   const x=(col-3)*1.35,z=(row-2)*1.3;
   return React.createElement("group",{key:row+"-"+col,position:[x,.11,z]},
    React.createElement("mesh",{position:[0,.42,0],material:crop,castShadow:true},React.createElement("cylinderGeometry",{args:[.035,.055,.82,5]})),
    React.createElement("mesh",{position:[-.16,.46,.02],rotation:[0,0,-.7],material:crop},React.createElement("sphereGeometry",{args:[.19,.08,.28]})),
    React.createElement("mesh",{position:[.16,.55,-.02],rotation:[0,0,.7],material:row%2?gold:crop},React.createElement("sphereGeometry",{args:[.18,.08,.25]}))
   );
  }))
 );
}
const islandGold = new THREE.MeshStandardMaterial({ color: "#d9b65e", metalness: .72, roughness: .28 });
const islandGlow = new THREE.MeshBasicMaterial({ color: "#a8f1ee", toneMapped: false });
const islandShieldMaterial = new THREE.MeshBasicMaterial({ color: "#79e6ff", transparent: true, opacity: .105, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
const islandShieldRim = new THREE.MeshBasicMaterial({ color: "#8cecff", transparent: true, opacity: .72, depthWrite: false, toneMapped: false });
const islandDamageMarker = new THREE.MeshBasicMaterial({ color: "#f2aa57", toneMapped: false });
const islandDamageRim = new THREE.MeshBasicMaterial({ color: "#f2aa57", transparent: true, opacity: .8, depthWrite: false, toneMapped: false });
const tankIslandArmor = new THREE.MeshStandardMaterial({ color: "#667d62", roughness: .84, metalness: .2 });
const tankIslandTracks = new THREE.MeshStandardMaterial({ color: "#29332e", roughness: .96, metalness: .12 });
const tankIslandTrim = new THREE.MeshStandardMaterial({ color: "#b5aa7d", roughness: .58, metalness: .28 });
const tankIslandLamp = new THREE.MeshBasicMaterial({ color: "#ffe7a4", toneMapped: false });
function OwnedIslandDecor({ structure }) {
 const box = (key, position, size, material = landmarkWood, rotation = [0, 0, 0]) =>
  React.createElement("mesh", { key, position, scale: size, material, rotation, castShadow: true, receiveShadow: true }, React.createElement("boxGeometry", { args: [1, 1, 1] }));
 const cylinder = (key, position, radius, height, material = landmarkWood, radial = 12, rotation = [0, 0, 0]) =>
  React.createElement("mesh", { key, position, material, rotation, castShadow: true }, React.createElement("cylinderGeometry", { args: [radius, radius, height, radial] }));
 const sphere = (key, position, scale, material = landmarkStone) =>
  React.createElement("mesh", { key, position, scale, material, castShadow: true }, React.createElement("sphereGeometry", { args: [1, 12, 10] }));
 const root = { position: [structure.x, .31, structure.z] };
 const type = structure.type;
 if (type === "display-tank") return React.createElement("group", root,
  box("left-track", [-1.82, .56, 0], [.62, .92, 5.35], tankIslandTracks),
  box("right-track", [1.82, .56, 0], [.62, .92, 5.35], tankIslandTracks),
  ...[-1, 1].flatMap((side) => [-2, -1, 0, 1, 2].map((z) =>
   cylinder("track-wheel-" + side + "-" + z, [side * 2.02, .5, z], .31, .16, tankIslandTrim, 16, [0, 0, Math.PI / 2])
  )),
  box("armored-hull", [0, .99, 0], [3.5, 1.05, 4.95], tankIslandArmor),
  box("front-plate", [0, .72, 2.28], [3.1, .48, .32], tankIslandTrim),
  cylinder("upper-turret", [0, 1.67, -.18], .93, .48, tankIslandArmor, 18),
  cylinder("turret-hatch", [0, 1.94, -.18], .32, .1, tankIslandTrim, 14),
  box("observation-light-bar", [0, 2.03, .62], [.95, .2, .28], tankIslandTrim),
  ...[-1, 1].map((side) => sphere("headlamp-" + side, [side * .82, 1.02, 2.49], [.2, .16, .12], tankIslandLamp)),
  cylinder("radio-antenna", [.54, 2.05, -.72], .035, .62, tankIslandTrim, 8)
 );
 if (type === "bench") return React.createElement("group", root,
  box("seat", [0, .62, 0], [2.4, .18, .68]), box("back", [0, 1.12, -.27], [2.4, .85, .16]),
  ...[-.85, .85].map((side) => box("leg-" + side, [side, .3, 0], [.16, .62, .55]))
 );
 if (type === "fountain" || type === "golden-fountain") {
  const stone = type === "golden-fountain" ? islandGold : landmarkStone;
  const water = type === "golden-fountain" ? islandGlow : landmarkWater;
  return React.createElement("group", root,
   cylinder("outer-basin", [0, .48, 0], 2.0, .42, stone, 24),
   cylinder("water", [0, .72, 0], 1.7, .08, water, 24),
   cylinder("center-pillar", [0, 1.15, 0], .22, 1.0, stone, 12),
   sphere("top-bowl", [0, 1.72, 0], [.68, .2, .68], stone),
   sphere("water-drop", [0, 2.15, 0], [.22, .46, .22], water)
  );
 }
 if (type === "pool") return React.createElement("group", root,
  box("pool-base", [0, .38, 0], [7.6, .48, 5.2], landmarkStone),
  box("pool-water", [0, .66, 0], [6.9, .06, 4.5], landmarkWater),
  ...[-1, 1].flatMap((side) => [
   box("pool-edge-x-" + side, [side * 3.68, .79, 0], [.22, .28, 5.3]),
   box("pool-edge-z-" + side, [0, .79, side * 2.48], [7.5, .28, .22])
  ])
 );
 if (type === "playground") return React.createElement("group", root,
  box("play-base", [0, .22, 0], [6.0, .14, 5.2], new THREE.MeshStandardMaterial({ color: "#d8b77b", roughness: .95 })),
  ...[-1, 1].map((side) => cylinder("swing-post-" + side, [side * 1.8, 1.45, -1.4], .08, 2.7, landmarkWood, 8)),
  box("swing-top", [0, 2.78, -1.4], [4.0, .14, .16]),
  box("swing-seat", [0, .75, -1.4], [1.0, .16, .6], islandGold),
  box("slide-platform", [1.65, 1.15, .9], [1.4, .18, 1.3], islandGold),
  box("slide-ramp", [1.65, .6, 2.0], [1.25, .12, 1.9], landmarkRoof, [-.4, 0, 0])
 );
 if (type === "ice-cream-stand") return React.createElement("group", root,
  box("counter", [0, .72, 0], [3.8, 1.35, 2.4], landmarkWood),
  box("counter-top", [0, 1.43, 0], [4.0, .16, 2.55], islandGold),
  box("awning", [0, 2.35, 0], [4.5, .18, 2.9], landmarkRoof),
  ...[-1, 0, 1].map((i) => box("awning-stripe-" + i, [i * 1.45, 2.46, .04], [.7, .06, 2.86], i % 2 ? islandGold : landmarkStone)),
  sphere("icecream", [0, 1.95, .05], [.42, .42, .42], landmarkWater)
 );
 if (type === "clock-tower") return React.createElement("group", root,
  box("tower", [0, 3.2, 0], [2.3, 6.4, 2.3], landmarkStone),
  box("roof", [0, 6.55, 0], [2.8, .28, 2.8], landmarkRoof),
  cylinder("spire", [0, 7.0, 0], .12, .8, islandGold, 8),
  React.createElement("mesh", { position: [0, 4.3, 1.18], material: landmarkWater }, React.createElement("circleGeometry", { args: [.72, 24] })),
  box("clock-hand-x", [0, 4.3, 1.21], [.08, .62, .04], landmarkWood),
  box("clock-hand-y", [.18, 4.58, 1.22], [.38, .07, .04], landmarkWood)
 );
 if (type === "sculpture") return React.createElement("group", root,
  cylinder("pedestal", [0, .55, 0], .9, 1.1, landmarkStone, 12),
  sphere("base-form", [0, 1.55, 0], [.72, .72, .72], islandGold),
  sphere("top-form", [.15, 2.45, 0], [.42, .9, .42], landmarkWater)
 );
 if (type === "garden-lantern") return React.createElement("group", root,
  cylinder("post", [0, 1.5, 0], .09, 3.0, landmarkWood, 8),
  box("lamp-frame", [0, 3.0, 0], [.85, .75, .85], islandGold),
  sphere("lamp-glow", [0, 3.0, 0], [.48, .48, .48], islandGlow)
 );
 if (type === "greenhouse") return React.createElement("group", root,
  box("greenhouse-base", [0, .25, 0], [6.8, .24, 5.8], landmarkStone),
  ...[-1, 1].flatMap((side) => [
   box("greenhouse-side-" + side, [side * 3.25, 1.8, 0], [.08, 3.0, 5.4], glass),
   box("greenhouse-front-" + side, [side * 1.65, 1.8, 2.65], [3.2, 3.0, .08], glass)
  ]),
  box("greenhouse-roof", [0, 3.35, 0], [7.1, .18, 6.0], islandGold),
  ...[-1, 0, 1].map((i) => cylinder("greenhouse-plant-" + i, [i * 1.55, .78, 0], .18, 1.1, landmarkWater, 7))
 );
 if (type === "dock") return React.createElement("group", root,
  box("dock-deck", [0, .26, 0], [2.8, .2, 8.0], landmarkWood),
  ...Array.from({ length: 9 }, (_, i) => box("dock-plank-" + i, [0, .38, -3.6 + i * .9], [2.84, .05, .055], landmarkStone)),
  ...[-1, 1].flatMap((side) => [-1, 1].map((end) => cylinder("dock-post-" + side + "-" + end, [side * 1.15, .72, end * 3.6], .12, 1.25, landmarkWood, 8)))
 );
 if (type === "mini-boat") return React.createElement("group", root,
  box("boat-hull", [0, .55, 0], [2.0, .5, 4.2], landmarkRoof),
  box("boat-deck", [0, .83, -.2], [1.6, .08, 2.8], landmarkWood),
  box("boat-cabin", [0, 1.45, -.7], [1.3, 1.15, 1.35], glass),
  cylinder("boat-mast", [0, 2.5, .9], .045, 2.6, islandGold, 8),
  React.createElement("mesh", { position: [.48, 2.45, .9], material: landmarkStone }, React.createElement("coneGeometry", { args: [.7, 1.1, 3] }))
 );
 if (type === "crystal") return React.createElement("group", root,
  cylinder("crystal-base", [0, .45, 0], .9, .5, landmarkStone, 8),
  React.createElement("mesh", { position: [0, 1.75, 0], scale: [.95, 2.5, .95], material: crystal, castShadow: true }, React.createElement("octahedronGeometry", { args: [1, 1] })),
  sphere("crystal-light", [0, 2.0, 0], [.28, .28, .28], islandGlow)
 );
 if (type === "mini-island") return React.createElement("group", root,
  sphere("floating-rock", [0, .4, 0], [2.2, .65, 2.0], landmarkStone),
  sphere("grass-top", [0, .82, 0], [2.1, .18, 1.9], leaf),
  cylinder("palm-trunk", [0, 2.0, 0], .11, 2.3, landmarkWood, 7),
  sphere("palm-crown", [0, 3.35, 0], [1.05, .44, 1.05], leaf)
 );
 return null;
}
function OwnedIslandStructure({structure}) {
 if(structure.type==="shield-generator")return React.createElement("group",{position:[structure.x,.31,structure.z]},
  React.createElement("mesh",{position:[0,.45,0],material:landmarkStone,castShadow:true},React.createElement("cylinderGeometry",{args:[1.25,1.45,.62,16]})),
  React.createElement("mesh",{position:[0,1.22,0],material:islandGlow},React.createElement("cylinderGeometry",{args:[.3,.44,1.12,12]})),
  React.createElement("mesh",{position:[0,1.94,0],material:islandShieldRim},React.createElement("sphereGeometry",{args:[.54,16,12]})),
  React.createElement("mesh",{position:[0,1.94,0],rotation:[Math.PI/2,0,0],material:islandShieldRim},React.createElement("torusGeometry",{args:[.78,.065,8,24]}))
 );
 if(structure.type==="house")return React.createElement("group",{position:[structure.x,.31,structure.z]},
  React.createElement("mesh",{position:[0,1.2,0],material:landmarkStone,castShadow:true,receiveShadow:true},React.createElement("boxGeometry",{args:[4.6,2.4,3.9]})),
  React.createElement("mesh",{position:[0,2.75,0],material:landmarkRoof,castShadow:true},React.createElement("coneGeometry",{args:[3.35,1.75,4]})),
  React.createElement("mesh",{position:[0,.72,1.98],material:landmarkWood},React.createElement("boxGeometry",{args:[.82,1.45,.12]})),
  React.createElement("mesh",{position:[-1.25,1.45,1.99],material:glass},React.createElement("boxGeometry",{args:[.72,.72,.08]})),
  React.createElement("mesh",{position:[1.25,1.45,1.99],material:glass},React.createElement("boxGeometry",{args:[.72,.72,.08]}))
 );
 if(structure.type==="building")return React.createElement("group",{position:[structure.x,.31,structure.z]},
  React.createElement("mesh",{position:[0,2.45,0],material:landmarkStone,castShadow:true,receiveShadow:true},React.createElement("boxGeometry",{args:[6.8,4.9,6.2]})),
  React.createElement("mesh",{position:[0,5.05,0],material:landmarkRoof,castShadow:true},React.createElement("boxGeometry",{args:[7.15,.32,6.55]})),
  ...[-1,0,1].flatMap((x)=>[1,2,3].map((y)=>React.createElement("mesh",{key:x+"-"+y,position:[x*1.85,y*1.15,3.12],material:glass},React.createElement("boxGeometry",{args:[.85,.72,.08]})))),
  React.createElement("mesh",{position:[0,.95,3.15],material:landmarkWood},React.createElement("boxGeometry",{args:[1.05,1.85,.12]}))
 );
 if(structure.type==="signal-tower")return React.createElement("group",{position:[structure.x,.31,structure.z]},
  React.createElement("mesh",{position:[0,3.2,0],material:landmarkWood,castShadow:true},React.createElement("cylinderGeometry",{args:[.17,.3,6.4,8]})),
  React.createElement("mesh",{position:[0,6.6,0],material:landmarkLava},React.createElement("octahedronGeometry",{args:[.62,0]})),
  React.createElement("mesh",{position:[0,5.45,0],material:landmarkStone},React.createElement("torusGeometry",{args:[.72,.075,6,18]})),
  React.createElement("mesh",{position:[0,4.4,0],material:landmarkStone},React.createElement("torusGeometry",{args:[.5,.06,6,16]}))
 );
 if(structure.type==="guard-camp")return React.createElement("group",{position:[structure.x,.31,structure.z]},
  React.createElement("mesh",{position:[0,1.15,0],material:landmarkWood,castShadow:true},React.createElement("coneGeometry",{args:[2.7,2.4,6]})),
  React.createElement("mesh",{position:[0,.75,2.35],material:landmarkStone},React.createElement("boxGeometry",{args:[1.1,1.45,.1]})),
  ...[-1,1].map((side)=>React.createElement("group",{key:"guard-"+side,position:[side*2.2,.35,1.15]},
   React.createElement("mesh",{position:[0,.65,0],material:landmarkWood},React.createElement("capsuleGeometry",{args:[.22,.58,4,8]})),
   React.createElement("mesh",{position:[0,1.35,0],material:landmarkStone},React.createElement("sphereGeometry",{args:[.25,12,10]})),
   React.createElement("mesh",{position:[side*.32,.75,.12],material:new THREE.MeshStandardMaterial({color:"#7898b3"})},React.createElement("circleGeometry",{args:[.34,10]}))
  ))
 );
 if(structure.type==="shield-kit")return React.createElement("group",{position:[structure.x,.31,structure.z]},
  ...Array.from({length:5},(_,i)=>React.createElement("mesh",{key:i,position:[(i-2)*.68,.82,0],material:new THREE.MeshStandardMaterial({color:"#7898b3",metalness:.28,roughness:.55}),castShadow:true},React.createElement("cylinderGeometry",{args:[.28,.28,.12,6]})))
 );
 if(["fountain","bench","pool","playground","ice-cream-stand","clock-tower","sculpture","garden-lantern","greenhouse","dock","mini-boat","crystal","mini-island","golden-fountain","display-tank"].includes(structure.type)) return React.createElement(OwnedIslandDecor, { structure });
 return null;
}

const residentHouseWall = new THREE.MeshStandardMaterial({color:"#e8dfc8",roughness:.86});
const residentHouseRoof = new THREE.MeshStandardMaterial({color:"#687b72",roughness:.78});
const residentHouseTrim = new THREE.MeshStandardMaterial({color:"#d8c59a",roughness:.72});
const residentHouseGlass = new THREE.MeshPhysicalMaterial({color:"#8fcbd8",transparent:true,opacity:.64,roughness:.14});
function IslandHomeModel({home}){
 return React.createElement("group",{position:[home.x,.29,home.z]},
  React.createElement("mesh",{position:[0,1.72,0],material:residentHouseWall,castShadow:true,receiveShadow:true},React.createElement("boxGeometry",{args:[9.1,3.05,8.1]})),
  React.createElement("mesh",{position:[0,3.32,0],material:residentHouseRoof,castShadow:true},React.createElement("boxGeometry",{args:[9.55,.24,8.55]})),
  React.createElement("mesh",{position:[0,.93,4.08],material:residentHouseTrim},React.createElement("boxGeometry",{args:[1.18,1.85,.09]})),
  ...[-1,1].map(side=>React.createElement("mesh",{key:"front-window-"+side,position:[side*2.55,2.05,4.09],material:residentHouseGlass},React.createElement("boxGeometry",{args:[1.45,1.05,.065]}))),
  ...[-1,1].map(side=>React.createElement("mesh",{key:"side-window-"+side,position:[side*4.56,2.02,-.6],material:residentHouseGlass},React.createElement("boxGeometry",{args:[.065,1.05,1.6]}))),
  React.createElement("mesh",{position:[0,.28,5.15],material:residentHouseTrim},React.createElement("boxGeometry",{args:[2.5,.12,1.9]})),
  React.createElement(Html,{position:[0,2.3,4.17],center:true,distanceFactor:10,occlude:false},
   React.createElement("div",{className:"resident-home-sign"},home.name)
  )
 );
}
function ResidentFerryMotion({boats,hour=14}){
 useFrame(({clock})=>{
  const daytime=hour>=6&&hour<20;
  for(const boat of boats||[]){
   if(!boat.residentFerry)continue;
   if(!daytime){boat.x=boat.startX;boat.z=boat.startZ;boat.speed=0;boat.yaw=Math.PI/2;continue;}
   const phase=((clock.elapsedTime+boat.ferryOffset)%42)/42;
   const progress=phase<.5?phase*2:(1-phase)*2;
   boat.x=boat.startX+(boat.endX-boat.startX)*progress;
   boat.z=boat.startZ+(boat.endZ-boat.startZ)*progress;
   boat.y=WATER_LEVEL+.06;boat.yaw=phase<.5?Math.PI/2:-Math.PI/2;boat.speed=2.5;
  }
 });
 return null;
}
function IslandModel({island}){
 const base=useMemo(()=>islandShape(island,1.06,true),[island]);
 const top=useMemo(()=>islandShape(island,.86,false),[island]);
 const beach=useMemo(()=>beachGeometry(island),[island]);
 const textureSeed=Math.abs(Math.floor(island.x*17+island.z*11));
 const sandTexture=useMemo(()=>createIslandTexture(island.sand,"#f7e8c7",textureSeed,.035),[island.sand,textureSeed]);
 const grassTexture=useMemo(()=>createIslandTexture(island.color,islandAccentColors[island.biome]||"#86aa72",textureSeed+19,.028),[island.color,island.biome,textureSeed]);
 const sandMat=useMemo(()=>new THREE.MeshStandardMaterial({map:sandTexture,roughness:.96}),[sandTexture]);
 const beachMat=useMemo(()=>new THREE.MeshStandardMaterial({map:sandTexture,roughness:.84}),[sandTexture]);
 const grassMat=useMemo(()=>new THREE.MeshStandardMaterial({map:grassTexture,roughness:.94}),[grassTexture]);
 return React.createElement("group",{position:[0,0,0]},
  React.createElement("mesh",{geometry:base,position:[island.x,-1.85,island.z],material:sandMat,receiveShadow:true,castShadow:true}),
  React.createElement("mesh",{geometry:beach,position:[island.x,.285,island.z],material:beachMat,receiveShadow:true}),
  React.createElement("mesh",{geometry:top,position:[island.x,.29,island.z],material:grassMat,receiveShadow:true}),
  React.createElement(IslandFoam,{island}),
  !island.isPlayerIsland && !island.isResidential && React.createElement(IslandLandmark,{island}),
  island.isPlayerIsland && React.createElement(OwnedIslandSign,{island}),
  island.isPlayerIsland && (island.shieldStrength || 0) > 0 && React.createElement("group",{position:[island.x,.34,island.z]},
   React.createElement("mesh",{scale:[island.rx*.88,20+(island.shieldStrength||0)*.16,island.rz*.88],material:islandShieldMaterial,renderOrder:3},React.createElement("sphereGeometry",{args:[1,36,24,0,Math.PI*2,0,Math.PI/2]})),
   React.createElement("mesh",{rotation:[Math.PI/2,0,0],material:islandShieldRim,renderOrder:4},React.createElement("torusGeometry",{args:[Math.min(island.rx,island.rz)*.86,.16,8,96]}))
  ),
  ...(island.rocks||[]).map((rock,i)=>React.createElement(IslandRock,{key:"rock-"+i,rock,island})),
  ...(island.trees||[]).map((tree,i)=>React.createElement(IslandTree,{key:"tree-"+i,tree})),
  ...(island.homes||[]).map(home=>React.createElement(IslandHomeModel,{key:home.id,home})),
  ...(island.animals||[]).map((animal,i)=>React.createElement(IslandAnimal,{key:"animal-"+i,animal})),
  ...(island.fields||[]).map((field,i)=>React.createElement(OwnedIslandField,{key:field.id||"field-"+i,field})),
  ...(island.structures||[]).map((structure,i)=>React.createElement(React.Fragment,{key:structure.id||"structure-"+i},
   React.createElement(OwnedIslandStructure,{structure}),
   Number(structure.health ?? 100) < 100 && React.createElement("group",{position:[structure.x,2.7,structure.z]},
    React.createElement("mesh",{material:islandDamageMarker,renderOrder:5},React.createElement("sphereGeometry",{args:[.19,10,8]})),
    React.createElement("mesh",{rotation:[Math.PI/2,0,0],material:islandDamageRim,renderOrder:5},React.createElement("torusGeometry",{args:[.28,.035,6,16]}))
   )
  ))
 );
}
const fishColors=["#f2b84b","#e76a52","#66c5c7","#e9e1bd","#8d83d9","#4e9c77","#f28d45","#4e83c7","#c8d76a"];
const jellyMat=new THREE.MeshPhysicalMaterial({color:"#c6a5eb",transparent:true,opacity:.64,roughness:.14,metalness:.08,transmission:.25});
const coralMats=["#e77a73","#e6b45e","#77c5b3"].map(color=>new THREE.MeshStandardMaterial({color,roughness:.88}));
const fishMaterialCache=new Map();
function fishMaterial(color){
 if(!fishMaterialCache.has(color))fishMaterialCache.set(color,new THREE.MeshStandardMaterial({color,roughness:.34,metalness:.08}));
 return fishMaterialCache.get(color);
}
const fishTailGeometry=(()=>{
 const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(-.42,.3);shape.lineTo(-.3,0);shape.lineTo(-.42,-.3);shape.closePath();
 return new THREE.ShapeGeometry(shape);
})();

function seabedHeight(x,z,islands){
 let reef=0;
 for(const island of islands){
  const dx=(x-island.x)/island.rx,dz=(z-island.z)/island.rz;
  const radial=Math.sqrt(dx*dx+dz*dz);
  const shelf=Math.exp(-Math.pow((radial-1.03)/.36,2));
  reef=Math.max(reef,shelf);
 }
 const detail=Math.sin(x*.018)*Math.cos(z*.021)*.16+Math.sin((x-z)*.037)*.09+Math.cos((x+z)*.012)*.08;
 return Math.max(0,.22+reef*6.35+detail);
}
function createSeabedGeometry(segments,islands){
 const geometry=new THREE.PlaneGeometry(2400,2400,segments,segments);
 const positions=geometry.attributes.position;
 const colors=new Float32Array(positions.count*3);
 const deep=new THREE.Color("#082b40"),reef=new THREE.Color("#1c5358"),rock=new THREE.Color("#496b61"),sand=new THREE.Color("#a39a70"),color=new THREE.Color();
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),z=-positions.getY(i);
  const elevation=seabedHeight(x,z,islands);
  positions.setZ(i,elevation);
  const shelf=THREE.MathUtils.clamp((elevation-.45)/6.2,0,1);
  color.copy(deep).lerp(reef,shelf*.92);
  color.lerp(rock,Math.min(.32,Math.max(0,elevation-3.7)*.045));
  color.lerp(sand,THREE.MathUtils.clamp((shelf-.76)*2.25,0,.36));
  const grain=.94+Math.sin(x*.11+z*.07)*.025+Math.cos(z*.15-x*.04)*.02;
  color.multiplyScalar(grain);
  color.toArray(colors,i*3);
 }
 positions.needsUpdate=true;
 geometry.setAttribute("color",new THREE.BufferAttribute(colors,3));
 geometry.computeVertexNormals();
 return geometry;
}
const kelpBladeGeometry=new THREE.ConeGeometry(.16,1.4,6);
const kelpMaterials=["#2d806b","#3c9a78","#246b68"].map(color=>new THREE.MeshStandardMaterial({color,roughness:.84}));
const sunbeamMaterial=new THREE.MeshBasicMaterial({color:"#65cbd5",transparent:true,opacity:.045,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});

function UnderwaterLife({divingRef,islands,quality}){
 const root=useRef(null),fishRefs=useRef([]),tailRefs=useRef([]),jellyRefs=useRef([]),horseRefs=useRef([]),bubbleRefs=useRef([]),rayRefs=useRef([]),rayWingRefs=useRef([]),kelpRefs=useRef([]);
 const fishCount=quality==="high"?82:quality==="low"?38:58;
 const jellyCount=quality==="high"?14:quality==="low"?7:10;
 const horseCount=quality==="high"?16:quality==="low"?7:11;
 const bubbleCount=quality==="high"?42:quality==="low"?16:28;
 const rayCount=quality==="high"?5:quality==="low"?2:4;
 const coralCount=quality==="high"?9:quality==="low"?4:6;
 const kelpPerIsland=quality==="high"?14:quality==="low"?4:9;
 const fish=useMemo(()=>{const r=randomFrom(8128);const schools=Array.from({length:Math.ceil(fishCount/8)},(_,i)=>{const island=islands[i%islands.length],a=r()*Math.PI*2,d=28+r()*72;return{x:island.x+Math.cos(a)*d,z:island.z+Math.sin(a)*d};});return Array.from({length:fishCount},(_,i)=>{const school=Math.floor(i/8),center=schools[school];return{x:center.x+(r()-.5)*5,z:center.z+(r()-.5)*5,centerX:center.x,centerZ:center.z,y:-3.5-r()*10,color:fishColors[i%fishColors.length],speed:.48+r()*.78,phase:r()*Math.PI*2,size:.58+r()*.72,school};});},[islands,fishCount]);
 const jellies=useMemo(()=>Array.from({length:jellyCount},(_,i)=>({x:-560+(i%7)*185,z:270*Math.sin(i*2.1),y:-5-(i%4)*2.2,phase:i*1.7})),[jellyCount]);
 const horses=useMemo(()=>Array.from({length:horseCount},(_,i)=>({x:-690+i*92,z:320*Math.cos(i*1.4),y:-8-(i%4)*1.5,phase:i*1.1})),[horseCount]);
 const bubbles=useMemo(()=>{const r=randomFrom(5511);return Array.from({length:bubbleCount},(_,i)=>{const island=islands[i%islands.length],a=r()*Math.PI*2,d=24+r()*90;return{x:island.x+Math.cos(a)*d,z:island.z+Math.sin(a)*d,y:-18+r()*13,phase:r()*Math.PI*2,size:.055+r()*.11,speed:.45+r()*.7};});},[islands,bubbleCount]);
 const rays=useMemo(()=>Array.from({length:rayCount},(_,i)=>{const island=islands[(i*3)%islands.length];return{x:island.x+Math.cos(i*1.7)*island.rx*.85,z:island.z+Math.sin(i*1.7)*island.rz*.85,y:-9-(i%3)*2,phase:i*1.3,speed:.26+i*.025};}),[islands,rayCount]);
 const kelp=useMemo(()=>{const r=randomFrom(271828);return islands.flatMap(island=>Array.from({length:kelpPerIsland},()=>{const a=r()*Math.PI*2,d=1.02+r()*.48,x=island.x+Math.cos(a)*island.rx*d,z=island.z+Math.sin(a)*island.rz*d;return{x,z,y:-25+seabedHeight(x,z,islands)+.08,height:1.8+r()*1.8,size:.72+r()*.62,phase:r()*Math.PI*2};}));},[islands,kelpPerIsland]);
 const sunbeams=useMemo(()=>islands.map((island,i)=>({x:island.x+Math.cos(i*2.1)*island.rx*.45,z:island.z+Math.sin(i*2.1)*island.rz*.45,radius:2.5+(i%3)*.45})),[islands]);
 const horseTube=useMemo(()=>{const c=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.42,0),new THREE.Vector3(-.12,-.18,0),new THREE.Vector3(.02,.02,0),new THREE.Vector3(.19,.22,0),new THREE.Vector3(.2,.43,0)]);return new THREE.TubeGeometry(c,18,.075,8,false);},[]);
 const floorSegments=quality==="high"?176:quality==="low"?88:128;
 const floorGeometry=useMemo(()=>createSeabedGeometry(floorSegments,islands),[floorSegments,islands]);
 const floorMaterial=useMemo(()=>new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0}),[]);
 const bubbleMaterial=useMemo(()=>new THREE.MeshPhysicalMaterial({color:"#a9edf5",transparent:true,opacity:.44,roughness:.1,metalness:.05,transmission:.3,depthWrite:false}),[]);
 const rayMaterial=useMemo(()=>new THREE.MeshPhysicalMaterial({color:"#526e83",roughness:.35,metalness:.08,clearcoat:.8}),[]);
 useFrame(({clock})=>{
  if(root.current)root.current.visible=!!divingRef.current;
  const t=clock.elapsedTime;
  fish.forEach((f,i)=>{
   const n=fishRefs.current[i];if(!n)return;
   const p=t*f.speed+f.phase;
   n.position.set(f.centerX+Math.sin(p)*4.4+Math.cos(p*.42)*1.15,f.y+Math.sin(p*1.7)*.65,f.centerZ+Math.cos(p)*3.7+Math.sin(p*.48)*1.1);
   n.rotation.y=Math.atan2(Math.cos(p)*4.4*f.speed,-Math.sin(p)*3.7*f.speed);
   if(tailRefs.current[i])tailRefs.current[i].rotation.y=Math.sin(p*8)*.58;
  });
  jellies.forEach((f,i)=>{const n=jellyRefs.current[i];if(n){n.position.set(f.x,f.y+Math.sin(t*.8+f.phase)*1.25,f.z);n.rotation.z=Math.sin(t+f.phase)*.1;}});
  horses.forEach((f,i)=>{const n=horseRefs.current[i];if(n){n.position.set(f.x+Math.sin(t*.42+f.phase)*2.3,f.y+Math.sin(t*.7+f.phase)*.4,f.z);n.rotation.y=Math.sin(t*.4+f.phase)*.22;}});
  bubbles.forEach((f,i)=>{const n=bubbleRefs.current[i];if(n){const rise=((f.y+18+t*f.speed)%17)-18;n.position.set(f.x+Math.sin(t*1.1+f.phase)*.48,rise,f.z+Math.cos(t*.8+f.phase)*.42);}});
  rays.forEach((f,i)=>{
   const n=rayRefs.current[i];if(!n)return;
   const p=t*f.speed+f.phase;
   n.position.set(f.x+Math.sin(p)*8,f.y+Math.sin(p*1.3)*.42,f.z+Math.cos(p*.7)*6);
   n.rotation.y=Math.atan2(Math.cos(p)*8,-Math.sin(p*.7)*4.2);
   const wings=rayWingRefs.current[i]||[];
   wings.forEach((wing,side)=>{if(wing)wing.rotation.z=(side===0?1:-1)*(.12+Math.sin(t*2.8+f.phase)*.22);});
  });
  kelp.forEach((plant,i)=>{const n=kelpRefs.current[i];if(n){n.rotation.z=Math.sin(t*.82+plant.phase)*.12;n.rotation.x=Math.cos(t*.68+plant.phase)*.08;}});
 });
 return React.createElement("group",{ref:root,visible:false},
  React.createElement("mesh",{geometry:floorGeometry,material:floorMaterial,rotation:[-Math.PI/2,0,0],position:[0,-25,0],receiveShadow:true}),
  ...sunbeams.map((beam,i)=>React.createElement("mesh",{key:"sunbeam-"+i,position:[beam.x,-8.2,beam.z],rotation:[Math.PI,0,0],material:sunbeamMaterial},React.createElement("coneGeometry",{args:[beam.radius,17,8,1,true]}))),
  ...kelp.map((plant,i)=>React.createElement("group",{key:"kelp-"+i,ref:n=>{kelpRefs.current[i]=n;},position:[plant.x,plant.y,plant.z],scale:plant.size},
   ...[0,1,2].map((blade)=>React.createElement("mesh",{key:blade,geometry:kelpBladeGeometry,material:kelpMaterials[(i+blade)%kelpMaterials.length],position:[Math.cos(blade*2.1)*.13,plant.height*(.28+blade*.1),Math.sin(blade*2.1)*.13],rotation:[.12*Math.cos(blade*2.1),blade*2.1,.22*Math.sin(blade*2.1)],scale:[.82,plant.height*(.42+(blade%2)*.08),.82]}))
  )),
  ...rays.map((f,i)=>React.createElement("group",{key:"manta-"+i,ref:n=>{rayRefs.current[i]=n;}},
   React.createElement("mesh",{material:rayMaterial,scale:[.78,.12,1.25]},React.createElement("sphereGeometry",{args:[1,20,14]})),
   ...[-1,1].map((side,j)=>React.createElement("mesh",{key:"ray-wing-"+side,ref:n=>{if(!rayWingRefs.current[i])rayWingRefs.current[i]=[];rayWingRefs.current[i][j]=n;},position:[side*.78,-.02,0],scale:[1.05,.055,.72],material:rayMaterial},React.createElement("sphereGeometry",{args:[1,16,10]}))),
   React.createElement("mesh",{material:rayMaterial,position:[0,-.02,-1.25],scale:[.05,.05,.8]},React.createElement("coneGeometry",{args:[.08,1.7,7]}))
  )),
  ...fish.map((f,i)=>React.createElement("group",{key:"fish-"+i,ref:n=>{fishRefs.current[i]=n;},scale:f.size},
   React.createElement("mesh",{material:fishMaterial(f.color),scale:[.48,.3,.82]},React.createElement("sphereGeometry",{args:[.62,18,12]})),
   React.createElement("group",{ref:n=>{tailRefs.current[i]=n;},position:[0,0,-.68]},
    React.createElement("mesh",{geometry:fishTailGeometry,material:fishMaterial(f.color),position:[0,0,-.12]}),
    React.createElement("mesh",{material:fishMaterial(f.color),position:[0,.12,-.05],rotation:[0,0,.38],scale:[.1,.24,.27]},React.createElement("sphereGeometry",{args:[1,10,8]}))
   ),
   React.createElement("mesh",{material:fishMaterial(f.color),position:[0,.29,-.12],rotation:[0,0,Math.PI]},React.createElement("coneGeometry",{args:[.2,.34,4]})),
   ...[-1,1].map(side=>React.createElement("mesh",{key:"pectoral-"+side,material:fishMaterial(f.color),position:[side*.37,-.02,-.05],rotation:[side*.12,0,side*.42],scale:[.28,.055,.35]},React.createElement("sphereGeometry",{args:[1,10,8]}))),
   ...[-1,1].map(side=>React.createElement("mesh",{key:"eye-"+side,material:new THREE.MeshBasicMaterial({color:"#10151c"}),position:[side*.24,.1,.34]},React.createElement("sphereGeometry",{args:[.055,8,6]})))
  )),
  ...jellies.map((f,i)=>React.createElement("group",{key:"jelly-"+i,ref:n=>{jellyRefs.current[i]=n;}},
   React.createElement("mesh",{material:jellyMat},React.createElement("sphereGeometry",{args:[.56,16,12,0,Math.PI*2,0,Math.PI/2]})),
   ...Array.from({length:8},(_,j)=>React.createElement("mesh",{key:j,position:[Math.cos(j*Math.PI/4)*.3,-.55,Math.sin(j*Math.PI/4)*.3],material:jellyMat},React.createElement("cylinderGeometry",{args:[.025,.012,1+(j%3)*.25,6]})))
  )),
  ...horses.map((f,i)=>React.createElement("group",{key:"seahorse-"+i,ref:n=>{horseRefs.current[i]=n;}},
   React.createElement("mesh",{geometry:horseTube,material:new THREE.MeshStandardMaterial({color:"#e2b15d",roughness:.4})}),
   React.createElement("mesh",{position:[.2,.43,0],material:new THREE.MeshStandardMaterial({color:"#e5bf78"})},React.createElement("sphereGeometry",{args:[.17,12,10]})),
   React.createElement("mesh",{position:[.26,.45,.13],material:new THREE.MeshBasicMaterial({color:"#161b20"})},React.createElement("sphereGeometry",{args:[.035,8,6]}))
  )),
  ...bubbles.map((f,i)=>React.createElement("mesh",{key:"bubble-"+i,ref:n=>{bubbleRefs.current[i]=n;},scale:f.size,material:bubbleMaterial},React.createElement("sphereGeometry",{args:[1,10,8]}))),
  ...islands.flatMap((island,index)=>Array.from({length:coralCount},(_,i)=>{const a=i/coralCount*Math.PI*2,coralX=island.x+Math.cos(a)*island.rx*.9,coralZ=island.z+Math.sin(a)*island.rz*.9;return React.createElement("group",{key:"coral-"+index+"-"+i,position:[coralX,-25+seabedHeight(coralX,coralZ,islands)+.08,coralZ],scale:.85+(i%3)*.25},
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
  root.current.position.set(dolphin.x,dolphin.y+(dolphin.leapHeight || 0)+Math.sin(clock.elapsedTime*2.1+dolphin.phase)*.045,dolphin.z);
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
function DolphinSchool({dolphins}){
 const root=useRef(null);
 useFrame(({clock})=>{
  if(root.current)root.current.visible=true;
  const time=clock.elapsedTime;
  dolphins.forEach(d=>{
   if(d.ridden)return;
   const cycle=(time+d.scheduleOffset)%112;
   d.active=cycle<46;
   if(!d.active)return;
   const phase=time*.34+d.phase;
   d.x=d.baseX+Math.sin(phase)*d.rangeX;
   d.z=d.baseZ+Math.sin(phase*.72)*d.rangeZ;
   d.y=-.56+Math.sin(phase*1.9)*.09;
   const leapPhase=(time*.42+d.phase*1.7)%(Math.PI*2);
   d.leapHeight=leapPhase>4.8?Math.sin((leapPhase-4.8)/(Math.PI*2-4.8)*Math.PI)*2.45:0;
   const dx=Math.cos(phase)*d.rangeX*.34,dz=Math.cos(phase*.72)*d.rangeZ*.245;
   d.yaw=Math.atan2(dx,dz);
  });
 });
 return React.createElement("group",{ref:root,visible:false},
  ...dolphins.map(d=>React.createElement(DolphinModel,{key:"dolphin-"+d.id,dolphin:d}))
 );
}

export function MarineWorld({marine,boats,divingRef,quality="balanced",boatRaceRef,hour=14}){
 return React.createElement(React.Fragment,null,
  ...marine.islands.map(island=>React.createElement(IslandModel,{key:island.id,island})),
  React.createElement(OceanSurface,{quality}),
  React.createElement(BoatRaceCourse,{raceRef:boatRaceRef}),
  React.createElement(ResidentFerryMotion,{boats,hour}),
  ...boats.map(boat=>React.createElement(BoatModel,{key:"boat-"+boat.id,boat})),
  ...(marine.jetSkis||[]).map(jetSki=>React.createElement(JetSkiModel,{key:"jet-ski-"+jetSki.id,jetSki})),
  ...(marine.sleds||[]).map(sled=>React.createElement(SledModel,{key:"sled-"+sled.id,sled})),
  React.createElement(UnderwaterLife,{divingRef,islands:marine.islands,quality}),
  React.createElement(DolphinSchool,{dolphins:marine.dolphins})
 );
}
