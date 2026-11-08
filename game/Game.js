import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Sky } from "@react-three/drei";
import * as THREE from "three";
import { Collider, generateWorld, locate, CITY_HALF, BLOCK, GRID, CABLE_STATIONS, WALKABLE_HILLS } from "./world.js";
import { Human, poseHuman, BARBELL } from "./human.js";
import { Helicopters } from "./helicopter.js";
import { makeHeli, stepHeli, canExitHeli } from "./heli-sim.js";
import { CityDetails } from "./CityDetails.js";
import { AnimatedWorld } from "./animated-world.js";
import { Cars } from "./cars.js";
import { makeCar, stepCar, resolveCarObstacles } from "./car-sim.js";
import { ElevatorModel } from "./elevator-system.js";
import { advanceElevatorTrip, floorHeight, makeElevatorTrip } from "./elevator-sim.js";
import { AmbientLife, QualityMonitor, StreetLights, WeatherEffects } from "./environment.js";
import { formatGameTime, getEnvironmentProfile, WEATHER_OPTIONS } from "./environment-sim.js";

const h = React.createElement;
const WALK = 4.2, RUN = 8, ACCEL = 14, GRAVITY = 24, JUMP = 8, STEP = .35, RAD = .35, HEIGHT = 1.75;
const PROMPTS = { sofa: "לשבת", swing: "להתנדנד", slide: "לגלוש במגלשה", weights: "להרים משקולות", treadmill: "להפעיל הליכון", heli: "להיכנס למסוק ולטוס", door: "לפתוח דלת", elevator: "להזמין מעלית", car: "להיכנס לרכב", cable: "לטפס לרציף הרכבל", basement: "לרדת למחסן (קומה -1)", basementExit: "לחזור לקומת הקרקע" };

function ScenicHills() {
  const hills = [
    { p: [0, -4.5, -157], s: [78, 10, 30], c: "#78945f" },
    { p: [0, -5, 157], s: [72, 11, 34], c: "#6f8e58" },
    { p: [-160, -4.5, 0], s: [30, 10, 78], c: "#829b65" },
    { p: [160, -5, 0], s: [32, 11, 72], c: "#718d57" },
    { p: [-145, -6, -145], s: [40, 8, 34], c: "#8da36c" },
    { p: [145, -6, 145], s: [42, 8, 36], c: "#81995f" }
  ];
  return h(React.Fragment, null, hills.map((hill, i) =>
    h("mesh", { key: i, position: hill.p, scale: hill.s, receiveShadow: true },
      h("sphereGeometry", { args: [1, 28, 18] }),
      h("meshStandardMaterial", { color: hill.c, roughness: 1 })
    )
  ));
}



const BIRD_WING_GEOMETRY = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(-0.34, 0.075);
  shape.lineTo(-0.61, 0.02);
  shape.lineTo(-0.46, -0.025);
  shape.lineTo(-0.37, -0.105);
  shape.lineTo(-0.28, -0.06);
  shape.lineTo(-0.2, -0.12);
  shape.lineTo(-0.1, -0.045);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 1);
  geometry.rotateX(Math.PI / 2);
  return geometry;
})();
const BIRD_WING_RIGHT_GEOMETRY = (() => {
  const geometry = BIRD_WING_GEOMETRY.clone();
  geometry.scale(-1, 1, 1);
  return geometry;
})();
const BIRD_BODY_GEOMETRY = new THREE.SphereGeometry(1, 16, 12);
const BIRD_HEAD_GEOMETRY = new THREE.SphereGeometry(1, 14, 10);
const BIRD_BEAK_GEOMETRY = new THREE.ConeGeometry(0.014, 0.05, 5);
BIRD_BEAK_GEOMETRY.rotateX(Math.PI / 2);
const BIRD_TAIL_GEOMETRY = new THREE.SphereGeometry(1, 10, 8);
const BIRD_MATERIAL = new THREE.MeshStandardMaterial({ color: "#263640", roughness: 0.92, side: THREE.DoubleSide });

function BirdFlocks() {
  const flockRefs = useRef([]);
  const wingRefs = useRef([]);
  const formation = useMemo(() => {
    const points = [[0, 0, 0]];
    for (let row = 1; row <= 4; row++) {
      for (const side of [-1, 1]) points.push([side * row * 1.72, Math.sin(row * 1.4 + side) * 0.16, -row * 1.82]);
    }
    return points;
  }, []);
  const setWingRef = (flockIndex, birdIndex, side) => (node) => {
    if (!wingRefs.current[flockIndex]) wingRefs.current[flockIndex] = [];
    if (!wingRefs.current[flockIndex][birdIndex]) wingRefs.current[flockIndex][birdIndex] = [];
    wingRefs.current[flockIndex][birdIndex][side] = node;
  };

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    for (let index = 0; index < 3; index++) {
      const group = flockRefs.current[index];
      if (!group) continue;
      const cycle = (time + index * 30) % 90;
      const active = cycle >= 8 && cycle < 30;
      group.visible = active;
      if (!active) continue;
      const progress = (cycle - 8) / 22;
      const bob = Math.sin(progress * Math.PI * 2) * 2.2;
      if (index === 0) {
        group.position.set(-165 + progress * 330, 31 + bob, -68 + Math.sin(progress * Math.PI) * 12);
        group.rotation.y = Math.PI / 2;
      } else if (index === 1) {
        group.position.set(68 + Math.sin(progress * Math.PI) * 11, 35 + bob, 165 - progress * 330);
        group.rotation.y = Math.PI;
      } else {
        group.position.set(165 - progress * 330, 29 + bob, 76 - Math.sin(progress * Math.PI) * 12);
        group.rotation.y = -Math.PI / 2;
      }
      group.rotation.z = Math.sin(progress * Math.PI * 2) * 0.025;
      for (let bird = 0; bird < formation.length; bird++) {
        const wings = wingRefs.current[index]?.[bird];
        if (!wings) continue;
        const flap = Math.sin(time * 7.2 + bird * 0.74 + index * 0.9) * 0.55;
        if (wings[0]) wings[0].rotation.z = -flap;
        if (wings[1]) wings[1].rotation.z = flap;
      }
    }
  });

  return h(React.Fragment, null, [0, 1, 2].map((flockIndex) =>
    h("group", { key: `bird-flock-${flockIndex}`, ref: (node) => { flockRefs.current[flockIndex] = node; }, visible: false },
      ...formation.map((position, birdIndex) =>
        h("group", { key: `bird-${birdIndex}`, position, scale: 1.08 },
          h("mesh", { geometry: BIRD_BODY_GEOMETRY, material: BIRD_MATERIAL, scale: [0.075, 0.052, 0.19] }),
          h("mesh", { geometry: BIRD_HEAD_GEOMETRY, material: BIRD_MATERIAL, position: [0, 0.018, 0.15], scale: [0.052, 0.05, 0.062] }),
          h("mesh", { geometry: BIRD_BEAK_GEOMETRY, material: BIRD_MATERIAL, position: [0, 0.01, 0.205] }),
          h("mesh", { geometry: BIRD_TAIL_GEOMETRY, material: BIRD_MATERIAL, position: [0, -0.006, -0.17], scale: [0.034, 0.022, 0.11] }),
          h("group", { ref: setWingRef(flockIndex, birdIndex, 0), position: [-0.035, 0.018, 0] },
            h("mesh", { geometry: BIRD_WING_GEOMETRY, material: BIRD_MATERIAL })
          ),
          h("group", { ref: setWingRef(flockIndex, birdIndex, 1), position: [0.035, 0.018, 0] },
            h("mesh", { geometry: BIRD_WING_RIGHT_GEOMETRY, material: BIRD_MATERIAL })
          )
        )
      )
    )
  ));
}

function hillGeometry(hill) {
  const segments = 36, positions = [], indices = [];
  for (let iz = 0; iz <= segments; iz++) {
    const z = (iz / segments * 2 - 1) * hill.rz;
    for (let ix = 0; ix <= segments; ix++) {
      const x = (ix / segments * 2 - 1) * hill.rx;
      const nx = x / hill.rx, nz = z / hill.rz, radius = Math.hypot(nx, nz);
      const y = radius >= 1 ? 0 : hill.height * .5 * (1 + Math.cos(Math.PI * radius));
      positions.push(x, y, z);
    }
  }
  for (let iz = 0; iz < segments; iz++) for (let ix = 0; ix < segments; ix++) {
    const centerX = (ix + .5) / segments * 2 - 1, centerZ = (iz + .5) / segments * 2 - 1;
    if (centerX * centerX + centerZ * centerZ > 1.02) continue;
    const a = iz * (segments + 1) + ix, b = a + 1, c = a + segments + 1, d = c + 1;
    indices.push(a, d, b, a, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function WalkableHills() {
  const geometries = useMemo(() => WALKABLE_HILLS.map(hillGeometry), []);
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  return h(React.Fragment, null, WALKABLE_HILLS.map((hill, i) =>
    h("mesh", { key: i, geometry: geometries[i], position: [hill.x, 0, hill.z], castShadow: true, receiveShadow: true },
      h("meshStandardMaterial", { color: i % 2 ? "#829b5f" : "#748e55", roughness: .98, metalness: 0 })
    )
  ));
}

function cableLoopRoute(from) {
  const count = CABLE_STATIONS.length, route = [from];
  for (let i = 1; i <= count; i++) route.push((from + i) % count);
  return route;
}
const CABLE_BENDS = [
  [{ x: -42, y: 54, z: -119 }, { x: 34, y: 52, z: -116 }],
  [{ x: 120, y: 55, z: -38 }, { x: 115, y: 51, z: 43 }],
  [{ x: 38, y: 55, z: 120 }, { x: -42, y: 57, z: 116 }],
  [{ x: -121, y: 56, z: 32 }, { x: -116, y: 52, z: -43 }]
];

function makeCableCurve() {
  const points = [];
  CABLE_STATIONS.forEach((station, i) => {
    points.push(new THREE.Vector3(station.x, station.y, station.z));
    for (const bend of CABLE_BENDS[i]) points.push(new THREE.Vector3(bend.x, bend.y, bend.z));
  });
  return new THREE.CatmullRomCurve3(points, true, "centripetal", .5);
}

function sampleCableRoute(route, progress, curve) {
  const count = Math.max(1, route.length - 1), scaled = THREE.MathUtils.clamp(progress, 0, 1) * count;
  const segment = Math.min(Math.floor(scaled), count - 1), local = THREE.MathUtils.clamp(scaled - segment, 0, 1);
  const from = route[segment], to = route[segment + 1], stationCount = CABLE_STATIONS.length;
  const direction = (to - from + stationCount) % stationCount === 1 ? 1 : -1;
  const u = (((from * 3 + direction * 3 * local) / (stationCount * 3)) % 1 + 1) % 1;
  const point = curve.getPoint(u), tangent = curve.getTangent(u).multiplyScalar(direction);
  return { x: point.x, y: point.y, z: point.z, yaw: Math.atan2(tangent.x, tangent.z) };
}

function CableBeam({ a, b, radius = .22, color = "#62747a" }) {
  const start = new THREE.Vector3(a[0], a[1], a[2]), end = new THREE.Vector3(b[0], b[1], b[2]);
  const delta = end.clone().sub(start), length = delta.length(), mid = start.clone().add(end).multiplyScalar(.5);
  const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return h("mesh", { position: [mid.x, mid.y, mid.z], quaternion: rotation, castShadow: true, receiveShadow: true },
    h("cylinderGeometry", { args: [radius * .82, radius, length, 9] }),
    h("meshStandardMaterial", { color, metalness: .82, roughness: .3 })
  );
}

function CablePylon({ point, id }) {
  const top = point.y + 6.55, x = point.x, z = point.z;
  return h("group", { key: "route-pylon-" + id },
    h(CableBeam, { a: [x - 3.1, .2, z], b: [x - .72, top, z], radius: .3 }),
    h(CableBeam, { a: [x + 3.1, .2, z], b: [x + .72, top, z], radius: .3 }),
    h(CableBeam, { a: [x - 1.45, top - 2.3, z], b: [x + 1.45, top - 2.3, z], radius: .18, color: "#b79a66" }),
    h(CableBeam, { a: [x - 1.35, top - 4.8, z], b: [x + 1.35, top - 4.8, z], radius: .14 }),
    h("mesh", { position: [x, top, z], castShadow: true }, h("boxGeometry", { args: [4.3, .26, .55] }), h("meshStandardMaterial", { color: "#44545a", metalness: .84, roughness: .27 })),
    ...[-1.15, 0, 1.15].map((offset) => h("mesh", { key: "wheel-" + offset, position: [x + offset, top + .23, z], rotation: [Math.PI / 2, 0, 0] },
      h("torusGeometry", { args: [.48, .09, 9, 22] }),
      h("meshStandardMaterial", { color: "#c5a66c", metalness: .86, roughness: .24 })
    )),
    h("mesh", { position: [x, top - 1.0, z] }, h("boxGeometry", { args: [.18, 1.6, .18] }), h("meshStandardMaterial", { color: "#c5a66c", metalness: .78, roughness: .3 }))
  );
}

function CableCabin({ doorsRef = null }) {
  const wheels = useRef([]), doors = useRef([]);
  useFrame((_, dt) => {
    wheels.current.forEach((wheel) => { if (wheel) wheel.rotation.z += dt * 2.1; });
    const gap = doorsRef?.current?.doorsOpen ? .82 : .36;
    if (doors.current[0]) doors.current[0].position.x = THREE.MathUtils.damp(doors.current[0].position.x, -gap, 9, dt);
    if (doors.current[1]) doors.current[1].position.x = THREE.MathUtils.damp(doors.current[1].position.x, gap, 9, dt);
  });
  const glass = h("meshPhysicalMaterial", { color: "#a9d9df", transparent: true, opacity: .22, roughness: .1, metalness: .16, clearcoat: 1, clearcoatRoughness: .06, depthWrite: false });
  const gold = h("meshPhysicalMaterial", { color: "#d6b477", roughness: .22, metalness: .88, clearcoat: .6 });
  const dark = h("meshStandardMaterial", { color: "#263940", roughness: .3, metalness: .62 });
  return h(React.Fragment, null,
    // Suspension arm and animated sheave wheels above the cabin.
    h("mesh", { position: [0, 6.55, 0], castShadow: true }, h("boxGeometry", { args: [2.5, .3, .72] }), dark),
    h("mesh", { position: [0, 6.82, 0] }, h("cylinderGeometry", { args: [.28, .28, .26, 18] }), gold),
    ...[-.9, -.3, .3, .9].map((x, i) => h("group", { key: "sheave-" + i, position: [x, 6.52, 0], rotation: [Math.PI / 2, 0, 0], ref: (node) => { wheels.current[i] = node; } },
      h("mesh", null, h("torusGeometry", { args: [.38, .085, 9, 20] }), gold),
      h("mesh", null, h("cylinderGeometry", { args: [.12, .12, .17, 12] }), dark)
    )),
    ...[-.78, .78].map((x) => h("mesh", { key: "hanger-" + x, position: [x, 4.45, 0] }, h("boxGeometry", { args: [.13, 4.1, .13] }), dark)),
    h("mesh", { position: [0, .12, 0], castShadow: true }, h("boxGeometry", { args: [3.05, .28, 2.55] }), gold),
    h("mesh", { position: [0, .48, 0] }, h("boxGeometry", { args: [2.9, .5, 2.35] }), dark),
    // Rounded, translucent cabin shell makes the gondola read as a 3D capsule.
    h("mesh", { position: [0, 1.45, 0], scale: [1.46, 1.05, 1.22], castShadow: true }, h("sphereGeometry", { args: [1, 28, 20] }), glass),
    h("mesh", { position: [0, 2.32, 0], scale: [1.36, .2, 1.12] }, h("sphereGeometry", { args: [1, 20, 12] }), dark),
    // Gold corner frames, front windshield trim and roof detailing.
    ...[-1.28, 1.28].flatMap((x) => [-1.02, 1.02].map((z) => h("mesh", { key: "frame-" + x + "-" + z, position: [x, 1.42, z] }, h("cylinderGeometry", { args: [.055, .075, 2.08, 10] }), gold))),
    ...[-1.26, 1.26].map((x) => h("mesh", { key: "crossbar-" + x, position: [x, 1.44, 0] }, h("boxGeometry", { args: [.08, 2.0, 2.05] }), gold)),
    h("mesh", { position: [0, .83, 0] }, h("boxGeometry", { args: [2.45, .12, 1.8] }), h("meshStandardMaterial", { color: "#a9b4b0", roughness: .52, metalness: .25 })),
    // Two compact passenger benches and contrasting cushions.
    ...[-.62, .62].map((z) => h("group", { key: "seat-" + z, position: [0, 0, z] },
      h("mesh", { position: [0, 1.04, 0] }, h("boxGeometry", { args: [1.7, .16, .48] }), h("meshStandardMaterial", { color: "#344d55", roughness: .78 })),
      h("mesh", { position: [0, 1.35, -.18] }, h("boxGeometry", { args: [1.7, .48, .14] }), h("meshStandardMaterial", { color: "#344d55", roughness: .8 })),
      h("mesh", { position: [0, 1.15, .18] }, h("boxGeometry", { args: [1.5, .045, .025] }), gold)
    )),
    ...[-1, 1].map((x) => h("mesh", { key: "lamp-" + x, position: [x * 1.25, 1.03, 1.12] }, h("sphereGeometry", { args: [.12, 12, 10] }), h("meshBasicMaterial", { color: "#ffe4a8" }))),
    ...[-1, 1].map((side) => h("mesh", { key: "sliding-door-" + side, ref: (node) => { doors.current[side === -1 ? 0 : 1] = node; }, position: [side * .36, 1.45, 1.18] },
      h("boxGeometry", { args: [.72, 1.42, .065] }),
      h("meshPhysicalMaterial", { color: "#a9d9df", transparent: true, opacity: .5, roughness: .14, metalness: .22, clearcoat: 1, depthWrite: false })
    )),
    h("mesh", { position: [0, .58, 1.19] }, h("boxGeometry", { args: [.74, .1, .04] }), gold)
  );
}

function Cableway({ ride, curve }) {
  const autonomous = useRef([]), passengerCabin = useRef(null);
  const loop = [...CABLE_STATIONS.map((station) => station.id), CABLE_STATIONS[0].id];
  const cables = useMemo(() => {
    const result = [];
    for (const offset of [-.82, .82, 0]) {
      const pathPoints = curve.getSpacedPoints(420).map((point, index, points) => {
        const tangent = curve.getTangent(index / 420);
        const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
        return point.clone().addScaledVector(side, offset).add(new THREE.Vector3(0, 6.65, 0));
      });
      const cableCurve = new THREE.CatmullRomCurve3(pathPoints, true, "centripetal", .5);
      result.push(new THREE.TubeGeometry(cableCurve, 520, offset === 0 ? .065 : .11, 8, true));
    }
    return result;
  }, [curve]);
  useEffect(() => () => cables.forEach((geometry) => geometry.dispose()), [cables]);

  useFrame(({ clock }, dt) => {
    for (let i = 0; i < 3; i++) {
      const node = autonomous.current[i];
      if (!node) continue;
      const progress = (clock.elapsedTime * .018 + i / 3) % 1, point = sampleCableRoute(loop, progress, curve);
      node.position.set(point.x, point.y, point.z); node.rotation.y = point.yaw;
    }
    const node = passengerCabin.current, current = ride.current;
    if (!node) return;
    if (current?.approaching && current.route?.length > 1) {
      current.progress = Math.min(1, (current.progress ?? .91) + dt * .04);
      const point = sampleCableRoute(current.route, current.progress, curve);
      node.visible = true;
      node.position.set(point.x, point.y, point.z); node.rotation.y = point.yaw;
      if (current.progress >= 1) { current.approaching = false; current.docked = true; current.doorsOpen = true; }
    } else if (current?.active && current.route?.length > 1) {
      const point = sampleCableRoute(current.route, current.progress, curve);
      node.visible = true;
      node.position.set(point.x, point.y, point.z); node.rotation.y = point.yaw;
    } else if (current?.docked && Number.isInteger(current.station)) {
      const station = CABLE_STATIONS[current.station];
      const previous = (current.station + CABLE_STATIONS.length - 1) % CABLE_STATIONS.length;
      const point = sampleCableRoute([previous, current.station], 1, curve);
      node.visible = true;
      node.position.set(station.x, station.y, station.z); node.rotation.y = point.yaw;
    } else node.visible = false;
  });

  const stationVisuals = CABLE_STATIONS.map((station) => {
    const support = [];
    for (const dx of [-3.45, 3.45]) for (const dz of [-3.0, 3.0]) {
      support.push(h("mesh", { key: "leg-" + dx + "-" + dz, position: [station.x + dx, station.y / 2, station.z + dz], castShadow: true },
        h("boxGeometry", { args: [.38, station.y, .38] }),
        h("meshStandardMaterial", { color: "#526168", metalness: .82, roughness: .34 })
      ));
    }
    const mast = [];
    for (const dx of [-.78, .78]) for (const dz of [-.78, .78]) {
      mast.push(h("mesh", { key: "mast-" + dx + "-" + dz, position: [station.x + dx, station.y + 3.35, station.z + dz] },
        h("boxGeometry", { args: [.2, 6.7, .2] }),
        h("meshStandardMaterial", { color: "#596a70", metalness: .86, roughness: .28 })
      ));
    }
    const ladderX = station.x - 5.2;
    const ladderCount = Math.ceil(station.y / 2.3);
    const ladder = [
      ...[-.58, .58].map((dz) => h("mesh", { key: "ladder-rail-" + dz, position: [ladderX, station.y / 2, station.z + dz] },
        h("boxGeometry", { args: [.16, station.y, .16] }),
        h("meshStandardMaterial", { color: "#d0ae70", metalness: .78, roughness: .28 })
      )),
      ...Array.from({ length: ladderCount }, (_, i) => h("mesh", { key: "rung-" + i, position: [ladderX, station.y * (i + 1) / (ladderCount + 1), station.z] },
        h("boxGeometry", { args: [.17, .12, 1.22] }),
        h("meshStandardMaterial", { color: "#d8bd84", metalness: .72, roughness: .3 })
      ))
    ];
    const top = station.y + 6.65;
    const stationPulleys = [-1.15, 0, 1.15].map((offset) =>
      h("mesh", { key: "station-pulley-" + offset, position: [station.x + offset, top, station.z], rotation: [Math.PI / 2, 0, 0] },
        h("torusGeometry", { args: [.48, .09, 9, 22] }),
        h("meshStandardMaterial", { color: "#c5a66c", metalness: .86, roughness: .24 })
      )
    );
    return h("group", { key: station.id },
      ...support, ...mast, ...stationPulleys,
      h("mesh", { position: [station.x, station.y + 6.55, station.z] }, h("boxGeometry", { args: [2.5, .2, .2] }), h("meshStandardMaterial", { color: "#596a70", metalness: .86, roughness: .28 })),
      h("mesh", { position: [station.x, station.y + 6.55, station.z] }, h("boxGeometry", { args: [.2, .2, 2.5] }), h("meshStandardMaterial", { color: "#596a70", metalness: .86, roughness: .28 })),
      h("mesh", { position: [station.x, station.y + .035, station.z] }, h("boxGeometry", { args: [13.8, .06, 8.4] }), h("meshStandardMaterial", { color: "#4b5a5e", metalness: .78, roughness: .3 })),
      ...ladder
    );
  });

  const pylonPoints = CABLE_BENDS.flat();
  return h(React.Fragment, null,
    cables.map((geometry, i) => h("mesh", { key: "cable-" + i, geometry, castShadow: false }, h("meshStandardMaterial", { color: i === 2 ? "#8c999a" : "#343f43", metalness: .9, roughness: .23 }))),
    ...pylonPoints.map((point, i) => h(CablePylon, { key: "bend-pylon-" + i, point, id: i })),
    ...stationVisuals,
    ...[0, 1, 2].map((i) => h("group", { key: "gondola-" + i, ref: (node) => { autonomous.current[i] = node; } }, h(CableCabin))),
    h("group", { ref: passengerCabin, visible: false }, h(CableCabin, { doorsRef: ride }))
  );
}

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

function Ground({ quality, wet, buildings }) {
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
    ctx.save();
    ctx.lineCap = "butt";
    ctx.strokeStyle = "#f4d66f";
    ctx.lineWidth = Math.max(1.4, p * .19);
    ctx.setLineDash([p * 2.35, p * 1.25]);
    for (let i = 0; i <= GRID; i++) {
      const road = -CITY_HALF + i * BLOCK;
      for (const offset of [-.13, .13]) {
        ctx.beginPath(); ctx.moveTo(to(road + offset), to(-CITY_HALF + 1)); ctx.lineTo(to(road + offset), to(CITY_HALF - 1)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(to(-CITY_HALF + 1), to(road + offset)); ctx.lineTo(to(CITY_HALF - 1), to(road + offset)); ctx.stroke();
      }
      ctx.strokeStyle = "#e7e6df";
      ctx.lineWidth = Math.max(1.1, p * .14);
      ctx.setLineDash([]);
      for (const edge of [-3.72, 3.72]) {
        ctx.beginPath(); ctx.moveTo(to(road + edge), to(-CITY_HALF)); ctx.lineTo(to(road + edge), to(CITY_HALF)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(to(-CITY_HALF), to(road + edge)); ctx.lineTo(to(CITY_HALF), to(road + edge)); ctx.stroke();
      }
      ctx.strokeStyle = "#f4d66f";
      ctx.lineWidth = Math.max(1.4, p * .19);
      ctx.setLineDash([p * 2.35, p * 1.25]);
    }
    ctx.fillStyle = "#f3f0e7";
    for (let gx = 0; gx <= GRID; gx++) for (let gz = 0; gz <= GRID; gz++) {
      const rx = -CITY_HALF + gx * BLOCK, rz = -CITY_HALF + gz * BLOCK;
      for (const sign of [-1, 1]) for (let stripe = 0; stripe < 5; stripe++) {
        const z = rz + sign * (2.35 + stripe * .34);
        const x = rx + sign * (2.35 + stripe * .34);
        ctx.fillRect(to(rx - 3.35), to(z), 6.7 * p, .16 * p);
        ctx.fillRect(to(x), to(rz - 3.35), .16 * p, 6.7 * p);
      }
    }
    ctx.restore();
    const image = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < image.data.length; i += 4) {
      const pixel = i / 4, hash = (Math.imul(pixel + 1, 1664525) + 1013904223) >>> 0;
      const n = (hash / 4294967296 - .5) * 6;
      image.data[i] += n; image.data[i + 1] += n; image.data[i + 2] += n;
    }
    ctx.putImageData(image, 0, 0);
    for (const building of buildings) {
      const opening = building.basementStairwell;
      if (!opening) continue;
      ctx.clearRect(to(opening.x0 + .025), to(opening.z0 + .025), (opening.x1 - opening.x0 - .05) * p, (opening.z1 - opening.z0 - .05) * p);
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = quality === "high" ? 8 : 2;
    return { texture, total };
  }, [quality]);
  useEffect(() => () => data.texture.dispose(), [data]);
  return h(React.Fragment, null,
    h("mesh", { rotation: [-Math.PI / 2, 0, 0], receiveShadow: true }, h("planeGeometry", { args: [data.total, data.total] }), h("meshStandardMaterial", { map: data.texture, transparent: true, alphaTest: .025, depthWrite: true, roughness: wet ? .28 : .93, metalness: wet ? .2 : 0 })),
    h("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, -5.1, 0] }, h("planeGeometry", { args: [1200, 1200] }), h("meshStandardMaterial", { color: "#6f9a52", roughness: wet ? .72 : 1 }))
  );
}

function Trees({ world, nightFactor }) {
  const trunk = useRef(null), crown = useRef(null), crown2 = useRef(null), lampPole = useRef(null), lampHead = useRef(null);
  const glow = useMemo(() => new THREE.MeshStandardMaterial({ color: "#fff1c8", emissive: "#ffc86b", emissiveIntensity: 0, roughness: .25 }), []);
  useFrame(() => { glow.emissiveIntensity = nightFactor * 2.6; });
  useEffect(() => {
    const obj = new THREE.Object3D(), color = new THREE.Color();
    world.trees.forEach((tree, i) => {
      const baseY = tree.y ?? 0;
      obj.position.set(tree.x, baseY + 1.1 * tree.s, tree.z); obj.scale.setScalar(tree.s); obj.rotation.set(0, i * 1.71 + (tree.turn || 0), 0); obj.updateMatrix(); trunk.current.setMatrixAt(i, obj.matrix);
      obj.position.set(tree.x, baseY + 3 * tree.s, tree.z); obj.updateMatrix(); crown.current.setMatrixAt(i, obj.matrix); crown.current.setColorAt(i, color.setHSL(.25 + (i % 5) * .02, .45, .32 + (i % 3) * .05));
      obj.position.set(tree.x + Math.sin(i * 1.71) * .6 * tree.s, baseY + 3.9 * tree.s, tree.z + Math.cos(i * 1.71) * .6 * tree.s); obj.scale.setScalar(tree.s * .65); obj.updateMatrix(); crown2.current.setMatrixAt(i, obj.matrix); crown2.current.setColorAt(i, color.setHSL(.24 + (i % 4) * .02, .5, .38));
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

function Player({ world, helis, cars, input, onLoc, onPrompt, onMode, onHud, doorStates, toggleDoor, onElevatorMenu, cableRide, cableCurve, elevatorY, elevatorMoving, elevatorMenuRef, quality }) {
  const col = useMemo(() => new Collider(world.boxes), [world]);
  const rig = useMemo(() => ({}), []);
  const { camera } = useThree();
  const st = useRef({ p: new THREE.Vector3(...world.spawn), v: new THREE.Vector3(), yaw: Math.PI, face: Math.PI, pitch: .32, dist: 6, heliDist: 14, carDist: 9, onGround: true, phase: 0, mode: "walk", target: -1, near: -1, timer: 0, t: 0, lastLoc: "", liftElapsed: 0, actionCooldown: 0, sitY: 0, elevatorTrip: null, elevatorFloor: 0, cableStation: -1, cableTrip: null, cableDescending: false, hudTimer: 0, cameraReady: false, lastPrompt: "" });
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
    const p = s.p, root = rig.root;
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
    } else if (s.mode === "cable-ladder") {
      const station = CABLE_STATIONS[s.cableStation] || CABLE_STATIONS[0];
      const climbing = (keys.has("ArrowUp") || keys.has("KeyW") ? 1 : 0) - (keys.has("ArrowDown") || keys.has("KeyS") ? 1 : 0) + inp.joy.y;
      if (s.cableDescending) {
        p.y = Math.max(0, p.y - Math.max(0, -climbing) * 6.2 * dt);
        if (p.y <= .04) {
          p.set(station.x - 5.2, 0, station.z); s.cableDescending = false; s.cableStation = -1;
          s.mode = "walk"; s.v.set(0, 0, 0); onMode("walk"); onPrompt("");
        }
      } else {
        p.y = Math.min(station.y, p.y + Math.max(0, climbing) * 6.2 * dt);
        if (p.y >= station.y - .03) {
          p.set(station.x - 5.2, station.y, station.z);
          s.mode = "cable-platform"; onMode("cable-platform");
          const previous = (s.cableStation + CABLE_STATIONS.length - 1) % CABLE_STATIONS.length;
          cableRide.current = { active: false, approaching: true, docked: false, station: s.cableStation, route: [previous, s.cableStation], progress: .91, doorsOpen: false };
          s.lastPrompt = ""; onPrompt("הגעתם לרציף — הקרונית מתקרבת");
        }
      }
      if (root) { root.position.copy(p); root.rotation.set(0, s.face, 0); }
      poseHuman(rig, { mode: "walk", phase: 0, speed: 0, air: false, t: s.t, dt });
      camTarget.set(p.x, p.y + 1.55, p.z); camDist = 7;
    } else if (s.mode === "cable-platform") {
      const station = CABLE_STATIONS[s.cableStation] || CABLE_STATIONS[0];
      const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
      const wx = fx * moveZ - fz * moveX, wz = fz * moveZ + fx * moveX;
      const blend = 1 - Math.exp(-ACCEL * dt);
      s.v.x += (wx * WALK - s.v.x) * blend; s.v.z += (wz * WALK - s.v.z) * blend;
      if (Math.hypot(wx, wz) > .1) { const target = Math.atan2(wx, wz); let d = target - s.face; d = Math.atan2(Math.sin(d), Math.cos(d)); s.face += d * (1 - Math.exp(-12 * dt)); }
      // Use real platform physics: rails stop ordinary walking, while a jump can clear them and lead to a fall.
      if (jump && s.onGround) { s.v.y = JUMP; s.onGround = false; }
      s.v.y -= GRAVITY * dt;
      const next = { x: p.x + s.v.x * dt, z: p.z + s.v.z * dt };
      col.resolve(next, p.y + STEP, p.y + HEIGHT, RAD);
      p.x = next.x; p.z = next.z;
      let ny = p.y + s.v.y * dt;
      const ground = col.groundAt(p.x, p.z, p.y, STEP, RAD);
      if (ny <= ground || (s.onGround && s.v.y <= 0 && ny - ground < STEP)) {
        ny = ground; s.v.y = 0; s.onGround = true;
      } else s.onGround = false;
      p.y = ny;
      const currentRide = cableRide.current, doorDistance = Math.hypot(p.x - station.x, p.z - station.z);
      const atDoor = !!currentRide?.docked && currentRide.station === station.id && doorDistance < 2.8;
      const atLadder = Math.hypot(p.x - (station.x - 5.2), p.z - station.z) < 1.7 && Math.abs(p.y - station.y) < .8;
      const platformPrompt = atDoor ? "F — להיכנס לקרונית" : currentRide?.approaching ? "הקרונית בדרך — התקרבו לדלת" : atLadder ? "F — לרדת בסולם" : currentRide?.docked ? "גשו לקרונית או לסולם" : "הרכבל מתקרב לרציף";
      if (platformPrompt !== s.lastPrompt) { s.lastPrompt = platformPrompt; onPrompt(platformPrompt); }
      if (act) {
        if (atDoor) {
          const route = cableLoopRoute(station.id);
          s.cableTrip = { route, progress: 0 };
          cableRide.current = { active: true, route, progress: 0, doorsOpen: true };
          s.v.set(0, 0, 0); s.mode = "cable"; s.lastPrompt = ""; s.hudTimer = 0;
          onMode("cable"); onPrompt("↑ / W — קדימה · ↓ / S — אחורה · F — יציאה ליד תחנה");
          onHud("רכבל · ↑ קדימה · ↓ אחורה · F יציאה בתחנה");
        } else if (atLadder) {
          s.cableDescending = true; s.mode = "cable-ladder"; s.v.set(0, 0, 0); s.lastPrompt = "";
          onMode("cable-ladder"); onPrompt("החזיקו ↓ / S כדי לרדת בסולם");
        } else if (currentRide?.approaching) onPrompt("הקרונית עדיין מתקרבת — המתינו ליד הרציף");
        else onPrompt("התקרבו לדלת הקרונית או לסולם");
      }
      if (s.onGround && p.y < station.y - .25) {
        s.cableStation = -1; s.mode = "walk"; s.v.set(0, 0, 0);
        cableRide.current = { active: false, route: [], progress: 0 };
        s.lastPrompt = ""; onMode("walk"); onPrompt("ירדתם מהתחנה"); onHud("");
      }
      if (root) { root.position.copy(p); root.rotation.set(0, s.face, 0); }
      s.phase += Math.hypot(s.v.x, s.v.z) * dt * 1.9;
      poseHuman(rig, { mode: "walk", phase: s.phase, speed: Math.hypot(s.v.x, s.v.z), air: !s.onGround, t: s.t, dt });
      camTarget.set(p.x, p.y + 1.55, p.z); camDist = 7;
    } else if (s.mode === "cable") {
      const trip = s.cableTrip;
      if (trip) {
        const drive = (keys.has("ArrowUp") || keys.has("KeyW") ? 1 : 0) - (keys.has("ArrowDown") || keys.has("KeyS") ? 1 : 0) + inp.joy.y;
        if (Math.abs(drive) > .05) trip.progress = ((trip.progress + drive * dt * .018) % 1 + 1) % 1;
        const point = sampleCableRoute(trip.route, trip.progress, cableCurve);
        let nearestStation = -1, nearestDistance = Infinity;
        CABLE_STATIONS.forEach((station, index) => {
          const distance = Math.hypot(point.x - station.x, point.y - station.y, point.z - station.z);
          if (distance < nearestDistance) { nearestDistance = distance; nearestStation = index; }
        });
        const atStation = nearestDistance < 6.2;
        // The player stays attached to the cabin; the cabin follows the exact same point on the cable.
        p.set(point.x, point.y + .2, point.z); s.face = point.yaw;
        cableRide.current = { active: true, route: trip.route, progress: trip.progress, doorsOpen: atStation, nearStation: atStation ? nearestStation : -1 };
        if (act) {
          if (atStation) {
            const station = CABLE_STATIONS[nearestStation], previous = (nearestStation + CABLE_STATIONS.length - 1) % CABLE_STATIONS.length;
            s.cableStation = nearestStation; s.cableTrip = null; s.v.set(0, 0, 0);
            cableRide.current = { active: false, docked: true, station: nearestStation, route: [previous, nearestStation], progress: 1, doorsOpen: true };
            p.set(station.x - 2.6, station.y, station.z); s.mode = "cable-platform"; s.lastPrompt = "";
            onMode("cable-platform"); onPrompt("הגעתם לתחנה — אפשר להיכנס שוב או לרדת בסולם"); onHud("");
          } else onPrompt("אפשר לצאת רק כשמתקרבים לרציף של תחנה");
        }
        s.hudTimer -= dt;
        if (s.hudTimer <= 0) { s.hudTimer = .4; onHud("רכבל · ↑ קדימה · ↓ אחורה · F יציאה בתחנה"); }
      }
      if (root) { root.position.copy(p); root.rotation.set(0, s.face, 0); }
      poseHuman(rig, { mode: "walk", phase: 0, speed: 0, air: false, t: s.t, dt });
      camTarget.set(p.x, p.y + 2.2, p.z); camDist = 6.4; followYaw = s.face;
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
          let x = it.x, y = it.y, z = it.z, radius = it.type === "heli" ? 4 : it.type === "car" ? 3.5 : it.type === "cable" ? 2.8 : (it.type === "basement" || it.type === "basementExit") ? 2.15 : 1.8;
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
        if (it.type === "sofa" || it.type === "swing") {
          p.set(it.x, it.y, it.z); s.sitY = it.y; s.face = it.face ?? 0; s.mode = "sit"; onMode("sit");
          onPrompt(it.type === "swing" ? "F — לרדת מהנדנדה" : "F — לקום");
        }
        else if (it.type === "slide") {
          s.activity = it; s.slideElapsed = 0; p.set(it.x, it.y + .7, it.z); s.face = 0;
          s.mode = "slide"; onMode("slide"); onPrompt("הגלישה התחילה!");
        }
        else if (it.type === "treadmill") {
          p.set(it.x, it.y, it.z); s.face = it.face ?? Math.PI; s.phase = 0; s.liftElapsed = 0;
          s.mode = "treadmill"; s.hudTimer = 0; onMode("treadmill"); onHud("הליכון פעיל · F לסיום");
          onPrompt("ריצה על ההליכון · F לעצירה");
        }
        else if (it.type === "weights") {
          p.set(it.x, it.y, it.z - .75); s.face = 0; s.liftElapsed = 0; bar.current = weightIndices.get(s.near);
          s.mode = "lift"; s.hudTimer = 0; onMode("lift"); onHud("אימון משקולות · F לסיום");
          onPrompt("האימון התחיל · F לסיום");
        }
        else if (it.type === "heli") { s.target = heliIndices.get(s.near); s.mode = "heli"; onMode("heli"); }
        else if (it.type === "car") { s.target = carIndices.get(s.near); s.mode = "car"; onMode("car"); onPrompt("F — לצאת מהרכב (רק בעצירה)"); }
        else if (it.type === "door") { toggleDoor(s.near); onPrompt(doorStates[s.near] ? "F — לפתוח דלת" : "F — לסגור דלת"); }
        else if (it.type === "basement" || it.type === "basementExit") {
          // Guaranteed F-key access complements the visible switchback staircase.
          p.set(it.toX, it.toY, it.toZ);
          s.v.set(0, 0, 0); s.onGround = true; s.near = -1; s.target = -1;
          s.mode = "walk"; onMode("walk");
          const entering = it.type === "basement";
          onPrompt(entering ? "נכנסתם למחסן · F ליד המדרגות לחזרה" : "חזרתם לקומת הקרקע");
          s.lastPrompt = entering ? "נכנסתם למחסן" : "";
        }
        else if (it.type === "elevator" && world.elevator) { s.elevatorFloor = Math.max(0, Math.min(world.elevator.floors - 1, Math.floor(it.floor || 0))); p.set(world.elevator.x, s.elevatorFloor * 4 + .22, world.elevator.z); elevatorY.current = s.elevatorFloor * 4; s.mode = "elevator"; onMode("elevator"); onElevatorMenu({ floors: world.elevator.floors, current: s.elevatorFloor }); }
        else if (it.type === "cable") {
          s.cableStation = Math.max(0, Math.min(CABLE_STATIONS.length - 1, it.stationId || 0));
          s.cableDescending = false; p.set(it.x, 0, it.z); s.mode = "cable-ladder"; s.v.set(0, 0, 0);
          onMode("cable-ladder"); onPrompt("החזיקו ↑ / W כדי לטפס לתחנת הרכבל");
        }
      }
      if (root) { root.position.copy(p); root.rotation.set(0, s.face, 0); }
      s.phase += Math.hypot(s.v.x, s.v.z) * dt * 1.9;
      poseHuman(rig, { mode: "walk", phase: s.phase, speed: Math.hypot(s.v.x, s.v.z), air: !s.onGround, t: s.t, dt });
      camTarget.set(p.x, p.y + 1.55, p.z);
    } else if (s.mode === "slide") {
      const activity = s.activity;
      s.slideElapsed += dt;
      const progress = THREE.MathUtils.clamp(s.slideElapsed / 1.55, 0, 1);
      if (activity) {
        p.x = activity.x;
        p.z = THREE.MathUtils.lerp(activity.z, activity.endZ, progress);
        p.y = THREE.MathUtils.lerp(activity.y + .7, 0, progress);
      }
      if (root) { root.position.copy(p); root.rotation.set(0, s.face, 0); }
      poseHuman(rig, { mode: "sit", phase: 0, speed: 0, air: false, t: s.t, dt });
      camTarget.set(p.x, p.y + 1.25, p.z);
      if (progress >= 1) {
        p.y = 0; s.activity = null; s.mode = "walk"; s.onGround = true; s.near = -1;
        onMode("walk"); onPrompt("");
      }
    } else if (s.mode === "treadmill") {
      if (act) {
        s.mode = "walk"; s.target = -1; s.near = -1; onMode("walk"); onPrompt(""); onHud("");
      } else {
        s.phase += dt * 7.2;
        if (root) { root.position.copy(p); root.rotation.set(0, s.face, 0); }
        poseHuman(rig, { mode: "walk", phase: s.phase, speed: 5.8, air: false, t: s.t, dt });
        camTarget.set(p.x, p.y + 1.55, p.z);
        s.hudTimer -= dt;
        if (s.hudTimer <= 0) { s.hudTimer = .5; onHud("הליכון פעיל · ריצה במקום · F לעצירה"); }
      }
    } else if (s.mode === "sit" || s.mode === "lift") {
      if (s.mode === "lift") {
        s.liftElapsed += dt;
        s.hudTimer -= dt;
        if (s.hudTimer <= 0) { s.hudTimer = .5; onHud(`אימון משקולות · ${Math.floor(s.liftElapsed / 2.6)} חזרות · F לסיום`); }
      }
      if (act || (s.mode === "sit" && (len > .3 || jump))) {
        if (s.mode === "sit") { p.x += Math.sin(s.face) * .8; p.z += Math.cos(s.face) * .8; p.y = s.sitY; }
        bar.current = -1; s.mode = "walk"; s.target = -1; onMode("walk"); onPrompt(""); onHud("");
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
        stepHeli(heli, { fwd: moveZ, turn: -moveX, lift, piloted: true }, dt, heliEnv);
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
    const underground = p.y < -.5;
    for (let t = .3; t <= camDist; t += .3) { const test = camTarget.clone().addScaledVector(back, t); if (col.pointInside(test.x, test.y, test.z, .2) || (!underground && test.y < .2)) { distance = Math.max(.3, t - .25); break; } }
    const desired = camTarget.clone().addScaledVector(back, distance);
    if (!s.cameraReady) { camera.position.copy(desired); s.cameraReady = true; }
    camera.position.lerp(desired, 1 - Math.exp(-6 * dt)); camera.lookAt(camTarget);
    const place = s.mode === "heli" ? "בטיסה מעל העיר" : s.mode === "cable" ? "ברכבל גבוה מעל העיר" : locate(world, p.x, p.y, p.z);
    const label = s.mode === "heli" || s.mode === "cable" ? place : place ? `${place.building} · קומה ${place.floor} · ${place.room}` : "ברחובות העיר";
    if (label !== s.lastLoc) { s.lastLoc = label; onLoc(label); }
  });
  return h(React.Fragment, null,
    h("directionalLight", { position: [50, 85, 45], intensity: 2.0, color: "#fff0d1", castShadow: true, "shadow-mapSize": [quality === "high" ? 2048 : 1024, quality === "high" ? 2048 : 1024], "shadow-camera-left": -45, "shadow-camera-right": 45, "shadow-camera-top": 45, "shadow-camera-bottom": -45 }),
    h(Human, { rig })
  );
}

export default function Game() {
  const world = useMemo(() => generateWorld(7), []);
  const cableCurve = useMemo(() => makeCableCurve(), []);
  const input = useRef({ keys: new Set(), drag: { dx: 0, dy: 0 }, lastDrag: -10, zoom: 0, joy: { x: 0, y: 0 }, action: false, up: false, down: false, elevatorFloor: null });
  const [loc, setLoc] = useState("ברחובות העיר"), [started, setStarted] = useState(false), [help, setHelp] = useState(true);
  const [prompt, setPrompt] = useState(""), [hud, setHud] = useState(""), [mode, setMode] = useState("walk");
  const [weather, setWeather] = useState("clear"), [hour, setHour] = useState(14), [clockRunning, setClockRunning] = useState(false), [quality, setQuality] = useState("high");
  const [elevatorMenu, setElevatorMenu] = useState(null), [doorStates, setDoorStates] = useState({});
  const doorRef = useRef({}), elevatorY = useRef(0), elevatorMoving = useRef(false), cableRide = useRef({ active: false, route: [], progress: 0 });
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
        h(WeatherEffects, { weather, profile: environment }), h(AmbientLife, { quality }), h(BirdFlocks), h(StreetLights, { lamps: world.lamps, nightFactor: environment.nightFactor, quality }), h(QualityMonitor, { onLevel: setQuality }),
        h(Ground, { quality, wet: weather === "rain" || weather === "storm", buildings: world.buildings }),
        h(ScenicHills), h(WalkableHills),
        h(Cableway, { ride: cableRide, curve: cableCurve }),
        h(Boxes, { world, kind: "solid" }), h(Boxes, { world, kind: "glow" }), h(Boxes, { world, kind: "glass" }),
        h(Trees, { world, nightFactor: environment.nightFactor }), h(CityDetails, { buildings: world.buildings, trees: world.trees, windStrength: environment.windStrength }),
        h(AnimatedWorld, { world, windStrength: environment.windStrength }),
        h(DoorSet, { world, doorStates }), world.elevator && h(ElevatorModel, { layout: world.elevator, y: elevatorY, moving: elevatorMoving }),
        h(Helicopters, { helis }), h(Cars, { cars }),
        h(Player, { world, helis, cars, input, onLoc: setLoc, onPrompt: setPrompt, onMode: setMode, onHud: setHud, doorStates: doorRef.current, toggleDoor, onElevatorMenu: setElevatorMenu, cableRide, cableCurve, elevatorY, elevatorMoving, quality })
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
    hud && (mode === "heli" || mode === "car" || mode === "lift" || mode === "treadmill" || mode === "cable") && h("div", { className: "hud-panel vehicle-hud" }, hud),
    elevatorMenu && h("div", { className: "elevator-dialog", role: "dialog", "aria-label": "בחירת קומה במעלית" },
      h("h3", null, "מעלית · בחירת קומה"),
      h("div", { className: "elevator-floor-grid" }, Array.from({ length: elevatorMenu.floors }, (_, floor) => h("button", { key: floor, className: floor === elevatorMenu.current ? "selected" : "", onClick: () => { input.current.elevatorFloor = floor; } }, floor === 0 ? "קרקע" : floor === elevatorMenu.floors - 1 ? "גג" : `קומה ${floor}`))),
      h("button", { className: "elevator-cancel", onClick: () => { input.current.action = true; } }, "ביטול")
    ),
    h("section", { className: `hud-panel hud-help ${help ? "" : "hud-collapsed"}` }, h("button", { className: "hud-btn", onClick: () => setHelp((v) => !v) }, help ? "הסתר" : "עזרה"),
      help && h("ul", null,
        h("li", null, h("b", null, "W A S D"), " / חיצים — הליכה"),
        h("li", null, h("b", null, "Shift"), " — ריצה · ", h("b", null, "רווח"), " — קפיצה"),
        h("li", null, h("b", null, "גרירת עכבר"), " — סיבוב מצלמה · ", h("b", null, "גלגלת"), " — זום"),
        h("li", null, h("b", null, "Q / E"), " — סיבוב מצלמה"),
        h("li", null, h("b", null, "F"), " — פעולה, ישיבה, דלתות, מעלית ורכבל"),
        h("li", null, "רכבל: F ליד הסולם ואז מחזיקים ↑ / W לטיפוס. על הרציף הולכים לקרונית; כשהדלת נפתחת לוחצים F להיכנס. ↑ / W נוסע קדימה, ↓ / S אחורה, ו־F יוצאים ליד תחנה."),
        h("li", null, "רכב: W/S נסיעה, A פנייה שמאלה, D פנייה ימינה, Shift בלימה"),
        h("li", null, "מסוק: W קדימה, S אחורה, A שמאלה, D ימינה, רווח עלייה, Shift ירידה"),
        h("li", null, "מכון כושר: F להתחלת אימון או לעצירה בהליכון ובמשקולות"),
        h("li", null, "מחסן בכל בניין: ניגשים לפתח המדרגות ולוחצים F כדי לרדת לקומה -1; בתוך המחסן F ליד המדרגות כדי לחזור."),
        h("li", null, "גן השעשועים: F לנדנדה או למגלשה"),
        h("li", null, "בחרו מזג אוויר, שעה ומחזור יום/לילה בפינה השמאלית.")
      )
    ),
    h("div", { ref: joyRef, className: "joy", onPointerDown: (e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); joyMove(e); }, onPointerMove: joyMove, onPointerUp: joyEnd, onPointerCancel: joyEnd }, h("div", { className: "joy-knob", style: { transform: `translate(${knob.x * 34}px, ${knob.y * 34}px)` } })),
    h("button", { className: "jump-btn", onPointerDown: (e) => { e.stopPropagation(); input.current.keys.add(mode === "cable-ladder" || mode === "cable" ? "ArrowUp" : "Space"); }, onPointerUp: () => { input.current.keys.delete(mode === "cable-ladder" || mode === "cable" ? "ArrowUp" : "Space"); }, onPointerCancel: () => { input.current.keys.delete(mode === "cable-ladder" || mode === "cable" ? "ArrowUp" : "Space"); } }, mode === "heli" ? "עלייה" : mode === "car" ? "בלימה" : mode === "cable-ladder" ? "טיפוס ↑" : mode === "cable" ? "קדימה ↑" : "קפיצה"),
    (mode === "heli" || mode === "cable-ladder" || mode === "cable") && h("button", { className: "vehicle-down-btn", onPointerDown: (e) => { e.stopPropagation(); if (mode === "cable-ladder" || mode === "cable") input.current.keys.add("ArrowDown"); else input.current.down = true; }, onPointerUp: () => { input.current.keys.delete("ArrowDown"); input.current.down = false; }, onPointerCancel: () => { input.current.keys.delete("ArrowDown"); input.current.down = false; } }, mode === "cable" ? "אחורה ↓" : "ירידה"),
    !started && h("div", { className: "start-overlay" }, h("div", { className: "start-card" },
      h("h1", null, "עיר פתוחה"), h("p", null, "עיר תלת־ממדית לחקור: בניינים מפורטים, גבעות שאפשר לטפס עליהן, מרפסות, גגות ורכבל גבוה מעל העיר עם ארבע תחנות, ולהקות ציפורים שחולפות בשמיים מדי פעם."),
      h("button", { className: "start-btn", onClick: () => setStarted(true) }, "יוצאים לדרך")
    ))
  );
}
