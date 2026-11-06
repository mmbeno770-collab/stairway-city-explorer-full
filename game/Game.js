import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Sky } from "@react-three/drei";
import * as THREE from "three";
import { Collider, generateWorld, locate, CITY_HALF, BLOCK, GRID } from "./world.js";
import { Human, poseHuman, BARBELL } from "./human.js";
import { Helicopters } from "./helicopter.js";
import { makeHeli, stepHeli, canExitHeli } from "./heli-sim.js";
import { CityDetails } from "./CityDetails.js";
import { Cars } from "./cars.js";
import { makeCar, stepCar, resolveCarObstacles } from "./car-sim.js";
import { ElevatorModel } from "./elevator-system.js";
import { advanceElevatorTrip, floorHeight, makeElevatorTrip } from "./elevator-sim.js";
import { AmbientLife, QualityMonitor, StreetLights, WeatherEffects } from "./environment.js";
import { formatGameTime, getEnvironmentProfile, WEATHER_OPTIONS } from "./environment-sim.js";

const h = React.createElement;
const WALK = 4.2, RUN = 8, ACCEL = 14, GRAVITY = 24, JUMP = 8, STEP = .35, RAD = .35, HEIGHT = 1.75;
const PROMPTS = { sofa: "לשבת", weights: "להתחיל אימון", heli: "להיכנס למסוק ולטוס", door: "לפתוח דלת", elevator: "להזמין מעלית", car: "להיכנס לרכב" };

function Boxes({ world, kind }) {
  const ref = useRef(null);
  const list = useMemo(() => world.boxes.filter((b) => b.kind === kind), [world, kind]);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const obj = new THREE.Object3D(), color = new THREE.Color();
    list.forEach((box, i) => {
      obj.position.set((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, (box.z0 + box.z1) / 2);
      obj.scale.set(box.x1 - box.x0, box.y1 - box.y0, box.z1 - box.z0);
      obj.updateMatrix(); mesh.setMatrixAt(i, obj.matrix); mesh.setColorAt(i, color.set(box.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [list]);
  const material = kind === "solid"
    ? h("meshStandardMaterial", { roughness: .8, metalness: .02 })
    : kind === "glass"
      ? h("meshPhysicalMaterial", { transparent: true, opacity: .32, roughness: .05, metalness: .3, envMapIntensity: 1.5, depthWrite: false })
      : h("meshBasicMaterial", { toneMapped: false });
  return h("instancedMesh", { ref, args: [undefined, undefined, list.length], castShadow: kind === "solid", receiveShadow: kind === "solid" }, h("boxGeometry"), material);
}

function Ground({ quality, wet }) {
  const data = useMemo(() => {
    const size = quality === "low" ? 768 : quality === "balanced" ? 1024 : 1280;
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d"), total = GRID * BLOCK + 40, p = size / total, to = (v) => (v + total / 2) * p;
    ctx.fillStyle = "#668452"; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#27323a"; ctx.fillRect(to(-CITY_HALF - 4), to(-CITY_HALF - 4), (GRID * BLOCK + 8) * p, (GRID * BLOCK + 8) * p);
    for (let i = 0; i < GRID; i++) for (let k = 0; k < GRID; k++) {
      const x = -CITY_HALF + i * BLOCK + 4, z = -CITY_HALF + k * BLOCK + 4;
      ctx.fillStyle = (i + k) % 2 ? "#b8b1a1" : "#c0b9aa"; ctx.fillRect(to(x), to(z), (BLOCK - 8) * p, (BLOCK - 8) * p);
      ctx.strokeStyle = "#a49d8e"; ctx.lineWidth = 1;
      for (let t = 0; t < BLOCK - 8; t += 1.5) {
        ctx.beginPath(); ctx.moveTo(to(x + t), to(z)); ctx.lineTo(to(x + t), to(z + BLOCK - 8)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(to(x), to(z + t)); ctx.lineTo(to(x + BLOCK - 8), to(z + t)); ctx.stroke();
      }
      ctx.strokeStyle = "#d0bd91"; ctx.lineWidth = Math.max(1, 1.5 * p);
      ctx.strokeRect(to(x + .45), to(z + .45), (BLOCK - 8 - .9) * p, (BLOCK - 8 - .9) * p);
    }
    ctx.fillStyle = "#f2e9c9";
    for (let i = 0; i <= GRID; i++) {
      const r = -CITY_HALF + i * BLOCK;
      for (let t = -CITY_HALF; t < CITY_HALF; t += 4) { ctx.fillRect(to(r) - 2, to(t), 4, 2 * p); ctx.fillRect(to(t), to(r) - 2, 2 * p, 4); }
    }
    const image = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < image.data.length; i += 4) {
      const pixel = i / 4, hash = (Math.imul(pixel + 1, 1664525) + 1013904223) >>> 0;
      const n = (hash / 4294967296 - .5) * 6;
      image.data[i] += n; image.data[i + 1] += n; image.data[i + 2] += n;
    }
    ctx.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = quality === "high" ? 8 : 2;
    return { texture, total };
  }, [quality]);
  useEffect(() => () => data.texture.dispose(), [data]);
  return h(React.Fragment, null,
    h("mesh", { rotation: [-Math.PI / 2, 0, 0], receiveShadow: true }, h("planeGeometry", { args: [data.total, data.total] }), h("meshStandardMaterial", { map: data.texture, roughness: wet ? .28 : .93, metalness: wet ? .2 : 0 })),
    h("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, -.025, 0] }, h("planeGeometry", { args: [1200, 1200] }), h("meshStandardMaterial", { color: "#6f9a52", roughness: wet ? .72 : 1 }))
  );
}

function Trees({ world, nightFactor }) {
  const trunk = useRef(null), crown = useRef(null), crown2 = useRef(null), lampPole = useRef(null), lampHead = useRef(null);
  const glow = useMemo(() => new THREE.MeshStandardMaterial({ color: "#fff1c8", emissive: "#ffc86b", emissiveIntensity: 0, roughness: .25 }), []);
  useFrame(() => { glow.emissiveIntensity = nightFactor * 2.6; });
  useEffect(() => {
    const obj = new THREE.Object3D(), color = new THREE.Color();
    world.trees.forEach((tree, i) => {
      obj.position.set(tree.x, 1.1 * tree.s, tree.z); obj.scale.setScalar(tree.s); obj.rotation.set(0, i, 0); obj.updateMatrix(); trunk.current.setMatrixAt(i, obj.matrix);
      obj.position.set(tree.x, 3 * tree.s, tree.z); obj.updateMatrix(); crown.current.setMatrixAt(i, obj.matrix); crown.current.setColorAt(i, color.setHSL(.25 + (i % 5) * .02, .45, .32 + (i % 3) * .05));
      obj.position.set(tree.x + Math.sin(i) * .6 * tree.s, 3.9 * tree.s, tree.z + Math.cos(i) * .6 * tree.s); obj.scale.setScalar(tree.s * .65); obj.updateMatrix(); crown2.current.setMatrixAt(i, obj.matrix); crown2.current.setColorAt(i, color.setHSL(.24 + (i % 4) * .02, .5, .38));
    });
    world.lamps.forEach((lamp, i) => { obj.position.set(lamp.x, 2.5, lamp.z); obj.scale.set(1, 1, 1); obj.rotation.set(0, 0, 0); obj.updateMatrix(); lampPole.current.setMatrixAt(i, obj.matrix); obj.position.y = 5.1; obj.updateMatrix(); lampHead.current.setMatrixAt(i, obj.matrix); });
    [trunk, crown, crown2, lampPole, lampHead].forEach((r) => { if (r.current) { r.current.instanceMatrix.needsUpdate = true; if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true; r.current.computeBoundingSphere(); } });
  }, [world]);
  return h(React.Fragment, null,
    h("instancedMesh", { ref: trunk, args: [undefined, undefined, world.trees.length], castShadow: true }, h("cylinderGeometry", { args: [.15, .22, 2.2, 7] }), h("meshStandardMaterial", { color: "#6b4a2f" })),
    h("instancedMesh", { ref: crown, args: [undefined, undefined, world.trees.length], castShadow: true }, h("sphereGeometry", { args: [1.42, 16, 12] }), h("meshStandardMaterial", { roughness: .92 })),
    h("instancedMesh", { ref: crown2, args: [undefined, undefined, world.trees.length], castShadow: true }, h("sphereGeometry", { args: [1.02, 14, 10] }), h("meshStandardMaterial", { roughness: .9 })),
    h("instancedMesh", { ref: lampPole, args: [undefined, undefined, world.lamps.length], castShadow: true }, h("cylinderGeometry", { args: [.07, .1, 5, 6] }), h("meshStandardMaterial", { color: "#2f3a40", metalness: .6, roughness: .4 })),
    h("instancedMesh", { ref: lampHead, args: [undefined, glow, world.lamps.length] }, h("sphereGeometry", { args: [.25, 10, 8] }))
  );
}

function DoorLeaf({ item, open }) {
  const pivot = useRef(null);
  useFrame((_, dt) => { if (pivot.current) pivot.current.rotation.y = THREE.MathUtils.damp(pivot.current.rotation.y, open ? -Math.PI / 2 : 0, 8, dt); });
  return h("group", { ref: pivot, position: [item.x - 1.15, item.y, item.z] },
    h("mesh", { position: [1.15, 1.5, 0], castShadow: true, receiveShadow: true }, h("boxGeometry", { args: [2.3, 3, .14] }), h("meshStandardMaterial", { color: "#795b43", roughness: .58, metalness: .08 })),
    h("mesh", { position: [2.12, 1.5, .09] }, h("sphereGeometry", { args: [.07, 12, 10] }), h("meshStandardMaterial", { color: "#d7b56d", metalness: .8, roughness: .25 }))
  );
}
function DoorSet({ world, doorStates }) {
  return h(React.Fragment, null, world.interactables.map((item, index) => item.type === "door" ? h(DoorLeaf, { key: index, item, open: !!doorStates[index] }) : null));
}

function Player({ world, helis, cars, input, onLoc, onPrompt, onMode, onHud, doorStates, toggleDoor, onElevatorMenu, elevatorY, elevatorMoving, elevatorMenuRef, quality }) {
  const col = useMemo(() => new Collider(world.boxes), [world]);
  const rig = useMemo(() => ({}), []);
  const { camera } = useThree();
  const st = useRef({ p: new THREE.Vector3(...world.spawn), v: new THREE.Vector3(), yaw: Math.PI, face: Math.PI, pitch: .32, dist: 6, heliDist: 14, carDist: 9, onGround: true, phase: 0, mode: "walk", target: -1, near: -1, timer: 0, t: 0, lastLoc: "", liftElapsed: 0, actionCooldown: 0, sitY: 0, elevatorTrip: null, elevatorFloor: 0, hudTimer: 0, cameraReady: false, lastPrompt: "" });
  const heliEnv = useMemo(() => ({ ground: (x, z, y) => col.groundAt(x, z, y, .6, 1), resolve: (p, a, b, radius) => { col.resolve(p, a, b, radius); resolveCarObstacles(p, a, b, radius, cars); col.resolve(p, a, b, radius); } }), [col, cars]);
  const carEnv = useMemo(() => ({ ground: heliEnv.ground, resolve: (p, a, b, radius, ignore) => { col.resolve(p, a, b, radius); resolveCarObstacles(p, a, b, radius, cars, ignore); col.resolve(p, a, b, radius); } }), [col, heliEnv, cars]);
  const temp = useMemo(() => ({ e: new THREE.Euler(), q: new THREE.Quaternion(), v: new THREE.Vector3() }), []);
  const weightList = useMemo(() => world.interactables.filter((x) => x.type === "weights"), [world]);
  const heliList = useMemo(() => world.interactables.filter((x) => x.type === "heli"), [world]);
  const carList = useMemo(() => world.interactables.filter((x) => x.type === "car"), [world]);
  const weightIndices = useMemo(() => { let n = 0; const map = new Map(); world.interactables.forEach((x, i) => { if (x.type === "weights") map.set(i, n++); }); return map; }, [world]);
  const heliIndices = useMemo(() => { let n = 0; const map = new Map(); world.interactables.forEach((x, i) => { if (x.type === "heli") map.set(i, n++); }); return map; }, [world]);
  const carIndices = useMemo(() => { let n = 0; const map = new Map(); world.interactables.forEach((x, i) => { if (x.type === "car") map.set(i, n++); }); return map; }, [world]);
  const bar = useRef(-1);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, .05), s = st.current, inp = input.current, keys = inp.keys;
    s.t += dt; s.actionCooldown = Math.max(0, s.actionCooldown - dt);
    const act = inp.action && s.actionCooldown <= 0; if (act) s.actionCooldown = .28; inp.action = false;
    if (s.mode === "elevator" && inp.elevatorFloor !== null) {
      const chosen = inp.elevatorFloor; inp.elevatorFloor = null; onElevatorMenu(null);
      if (chosen < 0) { s.mode = "walk"; onMode("walk"); p.set(world.elevator.approachX, s.elevatorFloor * 4, world.elevator.z); onPrompt(""); }
      else {
        const from = elevatorY.current, to = floorHeight(chosen, world.elevator.floors);
        s.elevatorFloor = chosen;
        if (Math.abs(from - to) < .08) onPrompt("F / פעולה — לצאת מהמעלית");
        else { s.elevatorTrip = makeElevatorTrip(from, to, "ride"); elevatorMoving.current = true; onPrompt(""); }
      }
    }
    s.yaw -= inp.drag.dx * .005; s.pitch = THREE.MathUtils.clamp(s.pitch + inp.drag.dy * .004, -.35, 1.25); inp.drag.dx = inp.drag.dy = 0;
    if (s.mode === "heli") s.heliDist = THREE.MathUtils.clamp(s.heliDist + inp.zoom * 2, 7, 30);
    else if (s.mode === "car") s.carDist = THREE.MathUtils.clamp(s.carDist + inp.zoom * 1.4, 5, 20);
    else s.dist = THREE.MathUtils.clamp(s.dist + inp.zoom, 2.5, 14);
    inp.zoom = 0;
    const mx = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) + inp.joy.x;
    const mz = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) + inp.joy.y;
    const len = Math.hypot(mx, mz), moveX = len > 1 ? mx / len : mx, moveZ = len > 1 ? mz / len : mz;
    const shift = keys.has("ShiftLeft") || keys.has("ShiftRight"), jump = keys.has("Space") || inp.up;
    const p = s.p, root = rig.root;
    let camTarget = new THREE.Vector3(p.x, p.y + 1.5, p.z), camDist = s.dist, followYaw = null;
    if (s.mode === "elevator") {
      if (s.elevatorTrip) {
        const travel = advanceElevatorTrip(s.elevatorTrip, dt); elevatorY.current = travel.y; elevatorMoving.current = !travel.done;
        p.set(world.elevator.x, travel.y + .22, world.elevator.z);
        if (travel.done) { s.elevatorTrip = null; s.elevatorFloor = Math.round(travel.y / 4); elevatorMoving.current = false; onPrompt("F / פעולה — לצאת מהמעלית"); }
      }
      if (act && !s.elevatorTrip) { p.x = world.elevator.approachX - .35; p.y = s.elevatorFloor * 4; s.mode = "walk"; onMode("walk"); onPrompt(""); }
      if (root) { root.position.copy(p); root.rotation.set(0, s.face, 0); }
      poseHuman(rig, { mode: "walk", phase: 0, speed: 0, air: false, t: s.t, dt });
      camTarget.set(p.x, p.y + 1.35, p.z);
    } else if (s.mode === "walk") {
      const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw), wx = fx * moveZ - fz * moveX, wz = fz * moveZ + fx * moveX, speed = shift ? RUN : WALK, blend = 1 - Math.exp(-ACCEL * dt);
      s.v.x += (wx * speed - s.v.x) * blend; s.v.z += (wz * speed - s.v.z) * blend;
      if (Math.hypot(wx, wz) > .1) { const target = Math.atan2(wx, wz); let d = target - s.face; d = Math.atan2(Math.sin(d), Math.cos(d)); s.face += d * (1 - Math.exp(-12 * dt)); if (moveZ >= -.1) followYaw = s.face; }
      if (jump && s.onGround) { s.v.y = JUMP; s.onGround = false; }
      s.v.y -= GRAVITY * dt;
      const next = { x: p.x + s.v.x * dt, z: p.z + s.v.z * dt };
      col.resolve(next, p.y + STEP, p.y + HEIGHT, RAD); p.x = next.x; p.z = next.z;
      let ny = p.y + s.v.y * dt, ceiling = col.ceilingAt(p.x, p.z, p.y + HEIGHT - .05);
      if (ny + HEIGHT > ceiling && s.v.y > 0) { ny = ceiling - HEIGHT; s.v.y = 0; }
      const ground = col.groundAt(p.x, p.z, p.y, STEP);
      if (ny <= ground || (s.onGround && s.v.y <= 0 && ny - ground < STEP)) { ny = ground; s.v.y = 0; s.onGround = true; } else s.onGround = false;
      p.y = ny;
      if (p.y < -20) { p.set(...world.spawn); s.v.set(0, 0, 0); }
      s.timer -= dt;
      if (s.timer <= 0) {
        s.timer = .14; let best = -1, bestD = Infinity;
        world.interactables.forEach((it, i) => {
          let x = it.x, y = it.y, z = it.z, radius = it.type === "heli" ? 4 : it.type === "car" ? 3.5 : 1.8;
          if (it.type === "heli") { const item = helis[heliIndices.get(i)]; x = item.x; y = item.y; z = item.z; if (!item.grounded) return; }
          if (it.type === "car") { const item = cars[carIndices.get(i)]; x = item.x; y = item.y; z = item.z; }
          if (Math.abs(p.y - y) > (it.type === "car" ? 1.6 : 1.2)) return;
          const d = Math.hypot(p.x - x, p.z - z); if (d < radius && d < bestD) { best = i; bestD = d; }
        });
        s.near = best;
        const it = best >= 0 ? world.interactables[best] : null, actionText = it ? (it.type === "door" && doorStates[best] ? "לסגור דלת" : PROMPTS[it.type]) : "";
        const text = it ? `F / פעולה — ${actionText}` : "";
        if (text !== s.lastPrompt) { s.lastPrompt = text; onPrompt(text); }
      }
      if (act && s.near >= 0 && s.onGround) {
        const it = world.interactables[s.near]; s.target = s.near; s.v.set(0, 0, 0); s.lastPrompt = ""; onPrompt("");
        if (it.type === "sofa") { p.set(it.x, it.y, it.z); s.sitY = it.y; s.face = it.face; s.mode = "sit"; onMode("sit"); onPrompt("F — לקום"); }
        else if (it.type === "weights") { p.set(it.x, it.y, it.z - .75); s.face = 0; s.liftElapsed = 0; bar.current = weightIndices.get(s.near); s.mode = "lift"; onMode("lift"); onPrompt("האימון התחיל · F לסיום"); }
        else if (it.type === "heli") { s.target = heliIndices.get(s.near); s.mode = "heli"; onMode("heli"); }
        else if (it.type === "car") { s.target = carIndices.get(s.near); s.mode = "car"; onMode("car"); onPrompt("F — לצאת מהרכב (רק בעצירה)"); }
        else if (it.type === "door") { toggleDoor(s.near); onPrompt(doorStates[s.near] ? "F — לפתוח דלת" : "F — לסגור דלת"); }
        else if (it.type === "elevator" && world.elevator) { s.elevatorFloor = Math.max(0, Math.min(world.elevator.floors - 1, Math.floor(it.floor || 0))); p.set(world.elevator.x, s.elevatorFloor * 4 + .22, world.elevator.z); elevatorY.current = s.elevatorFloor * 4; s.mode = "elevator"; onMode("elevator"); onElevatorMenu({ floors: world.elevator.floors, current: s.elevatorFloor }); }
      }
      if (root) { root.position.copy(p); root.rotation.set(0, s.face, 0); }
      s.phase += Math.hypot(s.v.x, s.v.z) * dt * 1.9;
      poseHuman(rig, { mode: "walk", phase: s.phase, speed: Math.hypot(s.v.x, s.v.z), air: !s.onGround, t: s.t, dt });
      camTarget.set(p.x, p.y + 1.55, p.z);
    } else if (s.mode === "sit" || s.mode === "lift") {
      if (s.mode === "lift") s.liftElapsed += dt;
      if (act || (s.mode === "sit" && (len > .3 || jump)) || (s.mode === "lift" && s.liftElapsed > 2.85)) {
        if (s.mode === "sit") { p.x += Math.sin(s.face) * .8; p.z += Math.cos(s.face) * .8; p.y = s.sitY; }
        bar.current = -1; s.mode = "walk"; onMode("walk"); s.target = -1; onPrompt("");
      }
      if (root) { root.position.copy(p); root.rotation.set(0, s.face, 0); }
      poseHuman(rig, { mode: s.mode, phase: 0, speed: 0, air: false, t: s.t, dt });
      camTarget.set(p.x, p.y + (s.mode === "sit" ? 1.1 : 1.55), p.z);
    } else if (s.mode === "car") {
      const car = cars[s.target];
      if (!car) { s.mode = "walk"; onMode("walk"); }
      else {
        stepCar(car, { throttle: moveZ, steer: moveX, brake: shift || jump }, dt, carEnv);
        if (act && Math.abs(car.speed) < 1.35) {
          const offset = new THREE.Vector3(-1.65, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.yaw);
          p.set(car.x + offset.x, 0, car.z + offset.z); p.y = col.groundAt(p.x, p.z, car.y + .4, .7); col.resolve(p, p.y + STEP, p.y + HEIGHT, RAD);
          s.face = car.yaw; s.mode = "walk"; onMode("walk"); s.target = -1; onPrompt(""); onHud("");
        } else {
          temp.e.set(0, car.yaw, 0, "YXZ"); temp.q.setFromEuler(temp.e);
          if (root) { root.position.copy(temp.v.set(-.34, .52, .22).applyQuaternion(temp.q).add(new THREE.Vector3(car.x, car.y, car.z))); root.rotation.set(0, car.yaw, 0); }
          poseHuman(rig, { mode: "car", phase: 0, speed: 0, air: false, t: s.t, dt });
          p.set(car.x, car.y, car.z); camTarget.set(car.x, car.y + 1.65, car.z); camDist = s.carDist; followYaw = car.yaw;
          s.hudTimer -= dt; if (s.hudTimer <= 0) { s.hudTimer = .2; onHud(`רכב · ${Math.round(Math.abs(car.speed) * 3.6)} קמ״ש · W/S נסיעה · A/D היגוי · Shift בלימה`); }
        }
      }
    } else if (s.mode === "heli") {
      const heli = helis[s.target];
      if (!heli) { s.mode = "walk"; onMode("walk"); }
      else {
        const lift = (jump ? 1 : 0) - (shift || inp.down ? 1 : 0);
        stepHeli(heli, { fwd: moveZ, turn: moveX, lift, piloted: true }, dt, heliEnv);
        if (act && canExitHeli(heli)) { p.set(heli.x + Math.cos(heli.yaw) * 2.6, 0, heli.z - Math.sin(heli.yaw) * 2.6); p.y = col.groundAt(p.x, p.z, heli.y + .5, .6); s.face = heli.yaw; s.mode = "walk"; onMode("walk"); s.target = -1; onPrompt(""); }
        else {
          temp.e.set(heli.pitch, heli.yaw, heli.roll, "YXZ"); temp.q.setFromEuler(temp.e);
          if (root) { root.position.copy(new THREE.Vector3(0, .69, .5).applyQuaternion(temp.q).add(temp.v.set(heli.x, heli.y, heli.z))); root.quaternion.copy(temp.q); }
          poseHuman(rig, { mode: "heli", phase: 0, speed: 0, air: false, t: s.t, dt });
          p.set(heli.x, heli.y, heli.z); camTarget.set(heli.x, heli.y + 2, heli.z); camDist = s.heliDist; followYaw = heli.yaw;
          s.hudTimer -= dt; if (s.hudTimer <= 0) { s.hudTimer = .2; onHud(`גובה ${Math.round(heli.y)} מ׳ · מהירות ${Math.round(Math.hypot(heli.vx, heli.vz) * 3.6)} קמ״ש · רווח לעלייה · Shift לירידה`); }
          onPrompt(canExitHeli(heli) ? "F / פעולה — לצאת מהמסוק" : "");
        }
      }
    }
    helis.forEach((heli, i) => { if (!(s.mode === "heli" && i === s.target) && heli.rotor > 0) stepHeli(heli, { fwd: 0, turn: 0, lift: 0, piloted: false }, dt, heliEnv); });
    if (followYaw !== null && performance.now() / 1000 - inp.lastDrag > 1.2) { let d = followYaw - s.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); s.yaw += d * (1 - Math.exp(-2.5 * dt)); }
    const back = new THREE.Vector3(-Math.sin(s.yaw) * Math.cos(s.pitch), Math.sin(s.pitch), -Math.cos(s.yaw) * Math.cos(s.pitch));
    let distance = camDist;
    for (let t = .3; t <= camDist; t += .3) { const test = camTarget.clone().addScaledVector(back, t); if (col.pointInside(test.x, test.y, test.z, .2) || test.y < .2) { distance = Math.max(.3, t - .25); break; } }
    const desired = camTarget.clone().addScaledVector(back, distance);
    if (!s.cameraReady) { camera.position.copy(desired); s.cameraReady = true; }
    camera.position.lerp(desired, 1 - Math.exp(-6 * dt)); camera.lookAt(camTarget);
    const place = s.mode === "heli" ? "בטיסה מעל העיר" : locate(world, p.x, p.y, p.z);
    const label = s.mode === "heli" ? place : place ? `${place.building} · קומה ${place.floor} · ${place.room}` : "ברחובות העיר";
    if (label !== s.lastLoc) { s.lastLoc = label; onLoc(label); }
  });
  return h(React.Fragment, null,
    h("directionalLight", { position: [50, 85, 45], intensity: 2.0, color: "#fff0d1", castShadow: true, "shadow-mapSize": [quality === "high" ? 2048 : 1024, quality === "high" ? 2048 : 1024], "shadow-camera-left": -45, "shadow-camera-right": 45, "shadow-camera-top": 45, "shadow-camera-bottom": -45 }),
    h(Human, { rig })
  );
}

export default function Game() {
  const world = useMemo(() => generateWorld(7), []);
  const input = useRef({ keys: new Set(), drag: { dx: 0, dy: 0 }, lastDrag: -10, zoom: 0, joy: { x: 0, y: 0 }, action: false, up: false, down: false, elevatorFloor: null });
  const [loc, setLoc] = useState("ברחובות העיר"), [started, setStarted] = useState(false), [help, setHelp] = useState(true);
  const [prompt, setPrompt] = useState(""), [hud, setHud] = useState(""), [mode, setMode] = useState("walk");
  const [weather, setWeather] = useState("clear"), [hour, setHour] = useState(14), [clockRunning, setClockRunning] = useState(false), [quality, setQuality] = useState("high");
  const [elevatorMenu, setElevatorMenu] = useState(null), [doorStates, setDoorStates] = useState({});
  const doorRef = useRef({}), elevatorY = useRef(0), elevatorMoving = useRef(false);
  const joyRef = useRef(null), [knob, setKnob] = useState({ x: 0, y: 0 });
  const [cameraDrag, setCameraDrag] = useState(null);
  const environment = useMemo(() => getEnvironmentProfile(weather, hour, quality), [weather, hour, quality]);
  const helis = useMemo(() => world.interactables.filter((item) => item.type === "heli").map((item) => makeHeli(item.x, item.y, item.z, item.face)), [world]);
  const cars = useMemo(() => world.interactables.filter((item) => item.type === "car").map((item) => makeCar(item.x, item.y, item.z, item.face, item.color)), [world]);
  const weightList = useMemo(() => world.interactables.filter((item) => item.type === "weights"), [world]);
  const toggleDoor = useCallback((index) => { const next = { ...doorRef.current, [index]: !doorRef.current[index] }; doorRef.current = next; setDoorStates(next); }, []);
  useEffect(() => {
    const down = (event) => {
      if (!started) return;
      if (event.target instanceof HTMLElement && event.target.closest(".climate-panel, .elevator-dialog")) return;
      input.current.keys.add(event.code);
      if (event.code === "KeyF" && !event.repeat) input.current.action = true;
      if (event.code === "Space" || event.code.startsWith("Arrow")) event.preventDefault();
    };
    const up = (event) => input.current.keys.delete(event.code), blur = () => input.current.keys.clear();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, [started]);
  useEffect(() => { if (!clockRunning) return; const timer = window.setInterval(() => setHour((v) => (v + .25) % 24), 8000); return () => window.clearInterval(timer); }, [clockRunning]);
  const pointer = useRef(null), lastPointer = useRef({ x: 0, y: 0 });
  const onPointerDown = (event) => { pointer.current = event.pointerId; lastPointer.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); };
  const onPointerMove = (event) => { if (pointer.current !== event.pointerId) return; input.current.drag.dx += event.clientX - lastPointer.current.x; input.current.drag.dy += event.clientY - lastPointer.current.y; input.current.lastDrag = performance.now() / 1000; lastPointer.current = { x: event.clientX, y: event.clientY }; };
  const onPointerUp = (event) => { if (pointer.current === event.pointerId) pointer.current = null; };
  const joyMove = (event) => { const el = joyRef.current; if (!el || !(event.buttons || event.pointerType === "touch")) return; const r = el.getBoundingClientRect(); let x = (event.clientX - r.left - r.width / 2) / (r.width / 2), y = (event.clientY - r.top - r.height / 2) / (r.height / 2), l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } input.current.joy = { x, y: -y }; setKnob({ x, y }); };
  const joyEnd = () => { input.current.joy = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 }); };
  return h("div", { id: "scene-root", className: "game-root", dir: "rtl" },
    h("div", { className: "game-canvas", onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel: (e) => { input.current.zoom += e.deltaY * .005; } },
      h(Canvas, { shadows: quality !== "low", dpr: quality === "high" ? Math.min(window.devicePixelRatio || 1, 1.5) : quality === "balanced" ? 1.1 : .85, camera: { fov: 60, near: .1, far: 600 }, gl: { antialias: quality === "high", powerPreference: "high-performance" }, onCreated: ({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.12; gl.setClearColor(environment.skyColor); } },
        h("color", { attach: "background", args: [environment.skyColor] }), h("fog", { attach: "fog", args: [environment.fogColor, environment.fogNear, environment.fogFar] }),
        h(Sky, { sunPosition: environment.sunPosition, turbidity: environment.turbidity, rayleigh: 1.2 + environment.daylight * .5, mieCoefficient: weather === "fog" ? .012 : .004 }),
        h("hemisphereLight", { args: [environment.hemisphereSky, environment.hemisphereGround, environment.hemisphereIntensity] }), h("ambientLight", { intensity: environment.ambientIntensity }),
        h(Environment, { resolution: quality === "high" ? 96 : 64 }, h(Lightformer, { intensity: 1.2 + environment.daylight, position: [0, 10, 0], rotation: [Math.PI / 2, 0, 0], scale: [20, 20, 1] }), h(Lightformer, { intensity: .6, color: "#ffd9a8", position: [-10, 3, -5], rotation: [0, Math.PI / 2, 0], scale: [20, 4, 1] })),
        h(WeatherEffects, { weather, profile: environment }), h(AmbientLife, { quality }), h(StreetLights, { lamps: world.lamps, nightFactor: environment.nightFactor, quality }), h(QualityMonitor, { onLevel: setQuality }),
        h(Ground, { quality, wet: weather === "rain" || weather === "storm" }),
        h(Boxes, { world, kind: "solid" }), h(Boxes, { world, kind: "glow" }), h(Boxes, { world, kind: "glass" }),
        h(Trees, { world, nightFactor: environment.nightFactor }), h(CityDetails, { buildings: world.buildings, trees: world.trees, windStrength: environment.windStrength }),
        h(DoorSet, { world, doorStates }), world.elevator && h(ElevatorModel, { layout: world.elevator, y: elevatorY, moving: elevatorMoving }),
        h(Helicopters, { helis }), h(Cars, { cars }),
        h(Player, { world, helis, cars, input, onLoc: setLoc, onPrompt: setPrompt, onMode: setMode, onHud: setHud, doorStates: doorRef.current, toggleDoor, onElevatorMenu: setElevatorMenu, elevatorY, elevatorMoving, quality })
      )
    ),
    h("div", { className: "hud-panel hud-loc" }, h("span", { className: "hud-dot" }), loc),
    h("section", { className: "hud-panel climate-panel", "aria-label": "הגדרות מזג אוויר וזמן" },
      h("div", { className: "climate-heading" }, h("span", null, "סביבת העיר"), h("span", { className: "climate-status" }, quality === "high" ? "איכות גבוהה" : quality === "balanced" ? "מאוזן" : "חיסכון")),
      h("label", { className: "climate-field" }, "מזג אוויר", h("select", { value: weather, onChange: (e) => setWeather(e.target.value) }, WEATHER_OPTIONS.map((option) => h("option", { key: option.value, value: option.value }, option.label)))),
      h("div", { className: "climate-time-row" }, h("label", { htmlFor: "game-time" }, "שעה במשחק"), h("strong", null, formatGameTime(hour))),
      h("input", { id: "game-time", className: "climate-range", type: "range", min: "0", max: "23.75", step: ".25", value: hour, onChange: (e) => setHour(Number(e.target.value)) }),
      h("button", { className: "climate-cycle", type: "button", onClick: () => setClockRunning((v) => !v) }, clockRunning ? "השהה מחזור יום/לילה" : "הפעל מחזור יום/לילה")
    ),
    prompt && !elevatorMenu && h("button", { className: "hud-panel interaction-prompt", onClick: () => { input.current.action = true; } }, prompt),
    hud && (mode === "heli" || mode === "car") && h("div", { className: "hud-panel vehicle-hud" }, hud),
    elevatorMenu && h("div", { className: "elevator-dialog", role: "dialog", "aria-label": "בחירת קומה במעלית" },
      h("h3", null, "מעלית · בחירת קומה"),
      h("div", { className: "elevator-floor-grid" }, Array.from({ length: elevatorMenu.floors }, (_, floor) => h("button", { key: floor, className: floor === elevatorMenu.current ? "selected" : "", onClick: () => { input.current.elevatorFloor = floor; } }, floor === 0 ? "קרקע" : `קומה ${floor}`))),
      h("button", { className: "elevator-cancel", onClick: () => { input.current.action = true; } }, "ביטול")
    ),
    h("section", { className: `hud-panel hud-help ${help ? "" : "hud-collapsed"}` }, h("button", { className: "hud-btn", onClick: () => setHelp((v) => !v) }, help ? "הסתר" : "עזרה"),
      help && h("ul", null,
        h("li", null, h("b", null, "W A S D"), " / חיצים — הליכה"),
        h("li", null, h("b", null, "Shift"), " — ריצה · ", h("b", null, "רווח"), " — קפיצה"),
        h("li", null, h("b", null, "גרירת עכבר"), " — סיבוב מצלמה · ", h("b", null, "גלגלת"), " — זום"),
        h("li", null, h("b", null, "Q / E"), " — סיבוב מצלמה"),
        h("li", null, h("b", null, "F"), " — פעולה, ישיבה, דלתות ומעלית"),
        h("li", null, "רכב: W/S נסיעה, A/D היגוי, Shift בלימה"),
        h("li", null, "מסוק: W/S תנועה, A/D פנייה, רווח עלייה, Shift ירידה"),
        h("li", null, "בחרו מזג אוויר, שעה ומחזור יום/לילה בפינה השמאלית.")
      )
    ),
    h("div", { ref: joyRef, className: "joy", onPointerDown: (e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); joyMove(e); }, onPointerMove: joyMove, onPointerUp: joyEnd, onPointerCancel: joyEnd }, h("div", { className: "joy-knob", style: { transform: `translate(${knob.x * 34}px, ${knob.y * 34}px)` } })),
    h("button", { className: "jump-btn", onPointerDown: (e) => { e.stopPropagation(); input.current.keys.add("Space"); }, onPointerUp: () => input.current.keys.delete("Space"), onPointerCancel: () => input.current.keys.delete("Space") }, mode === "heli" ? "עלייה" : mode === "car" ? "בלימה" : "קפיצה"),
    mode === "heli" && h("button", { className: "vehicle-down-btn", onPointerDown: (e) => { e.stopPropagation(); input.current.down = true; }, onPointerUp: () => { input.current.down = false; }, onPointerCancel: () => { input.current.down = false; } }, "ירידה"),
    !started && h("div", { className: "start-overlay" }, h("div", { className: "start-card" },
      h("h1", null, "עיר פתוחה"), h("p", null, "עיר שלמה לחקור: היכנסו לבניינים, עלו במדרגות מקומה לקומה — בית קפה, ספרייה, גלריה, אולם משחקים, אולפן מוזיקה ועוד. כל בניין מוביל לגג."),
      h("button", { className: "start-btn", onClick: () => setStarted(true) }, "יוצאים לדרך")
    ))
  );
}
