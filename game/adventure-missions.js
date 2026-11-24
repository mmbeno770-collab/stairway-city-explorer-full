import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FLOOR_H, CABLE_STATIONS } from "./world.js";

const h = React.createElement;
const mats = {
  white: new THREE.MeshStandardMaterial({ color: "#f2e8d6", roughness: .72 }),
  red: new THREE.MeshStandardMaterial({ color: "#c94e40", roughness: .7 }),
  gold: new THREE.MeshStandardMaterial({ color: "#d6b36b", metalness: .72, roughness: .27 }),
  dark: new THREE.MeshStandardMaterial({ color: "#31434a", metalness: .62, roughness: .32 }),
  glass: new THREE.MeshPhysicalMaterial({ color: "#9ed9e0", transparent: true, opacity: .32, roughness: .08, metalness: .16, clearcoat: 1, depthWrite: false }),
  glow: new THREE.MeshBasicMaterial({ color: "#ffe8a1", toneMapped: false }),
  water: new THREE.MeshPhysicalMaterial({ color: "#4bb7c5", transparent: true, opacity: .62, roughness: .18, clearcoat: 1, depthWrite: false }),
  wood: new THREE.MeshStandardMaterial({ color: "#866044", roughness: .88 }),
  green: new THREE.MeshStandardMaterial({ color: "#6f9a68", roughness: .8 })
};

function pickOpenLighthouseSite(island) {
  if (!island) return { x: 30, z: -470 };
  const candidates = Array.from({ length: 36 }, (_, i) => {
    const a = i * Math.PI * 2 / 36;
    return { x: island.x + Math.cos(a) * island.rx * .39, z: island.z + Math.sin(a) * island.rz * .39 };
  });
  let best = candidates[0], bestScore = -Infinity;
  for (const p of candidates) {
    const clearance = [
      ...(island.trees || []).map((item) => Math.hypot(p.x - item.x, p.z - item.z) - 5.5),
      ...(island.rocks || []).map((item) => Math.hypot(p.x - item.x, p.z - item.z) - 3.4)
    ];
    const score = clearance.length ? Math.min(...clearance) : 20;
    if (score > bestScore) { best = p; bestScore = score; }
  }
  return best;
}

export function getAdventureMissionLayout(world, marine) {
  const island = (marine?.islands || []).find((item) => item.id === "palm");
  const lighthouse = pickOpenLighthouseSite(island);
  const buoys = island ? [
    { x: island.x, z: island.z - island.rz * 1.28 },
    { x: island.x + island.rx * 1.28, z: island.z - island.rz * .38 },
    { x: island.x + island.rx * 1.3, z: island.z + island.rz * .45 },
    { x: island.x - island.rx * .12, z: island.z + island.rz * 1.3 },
    { x: island.x - island.rx * 1.28, z: island.z + island.rz * .34 }
  ] : [];
  const tallest = (world?.buildings || []).reduce((best, building) =>
    !best || (building.floors?.length || 0) > (best.floors?.length || 0) ? building : best, null);
  const observation = tallest ? {
    x: (tallest.x0 + tallest.x1) / 2 + 5.2,
    z: (tallest.z0 + tallest.z1) / 2 + 5.2,
    y: (tallest.floors?.length || 1) * FLOOR_H,
    building: tallest
  } : { x: 0, z: 0, y: 0, building: null };
  return {
    "secret-lighthouse": { ...lighthouse, y: 0 },
    "buoy-course": buoys[0] || { x: 0, z: -545 },
    "city-observation": observation,
    "cable-journey": { x: CABLE_STATIONS[0].x, z: CABLE_STATIONS[0].z, y: CABLE_STATIONS[0].y },
    buoys,
    island
  };
}

function makeLighthouseSteps(point) {
  return Array.from({ length: 48 }, (_, index) => {
    const side = Math.floor(index / 12), step = index % 12, u = -4.1 + step * .745;
    let x = 0, z = 0, sx = 1.16, sz = 1.42;
    if (side === 0) { x = u; z = -4.65; }
    else if (side === 1) { x = 4.65; z = u; sx = 1.42; sz = 1.16; }
    else if (side === 2) { x = -u; z = 4.65; }
    else { x = -4.65; z = -u; sx = 1.42; sz = 1.16; }
    const top = .56 + index * .34;
    return { x: point.x + x, z: point.z + z, y: top, sx, sz, index };
  });
}

export function createAdventureMissionColliders(world, marine) {
  const layout = getAdventureMissionLayout(world, marine);
  const point = layout["secret-lighthouse"];
  const boxes = makeLighthouseSteps(point).map((step) => ({
    x0: step.x - step.sx / 2, x1: step.x + step.sx / 2,
    y0: step.y - .42, y1: step.y,
    z0: step.z - step.sz / 2, z1: step.z + step.sz / 2,
    color: "#a8875f", kind: "missionStep", collide: true
  }));
  boxes.push(
    { x0: point.x - 2.1, x1: point.x + 2.1, y0: .25, y1: 16.5, z0: point.z - 2.1, z1: point.z + 2.1, kind: "collisionOnly", collide: true, noGround: true },
    { x0: point.x - 6.1, x1: point.x + 6.1, y0: 16.52, y1: 16.85, z0: point.z - 6.1, z1: point.z + 6.1, kind: "missionStep", collide: true }
  );
  return boxes;
}

function Lighthouse({ point, active }) {
  const beam = useRef(null), lamp = useRef(null), steps = useMemo(() => makeLighthouseSteps(point), [point]);
  useFrame(({ clock }) => {
    if (beam.current) beam.current.rotation.y = clock.elapsedTime * .34;
    if (lamp.current) lamp.current.material.emissiveIntensity = .85 + Math.sin(clock.elapsedTime * 2.4) * .24;
  });
  return h("group", { position: [point.x, 0, point.z] },
    h("mesh", { position: [0, .23, 0], material: mats.dark, castShadow: true }, h("cylinderGeometry", { args: [3.1, 3.5, .46, 32] })),
    ...Array.from({ length: 7 }, (_, i) => h("mesh", {
      key: "tower-band-" + i, position: [0, 1.38 + i * 2.18, 0], material: i % 2 ? mats.white : mats.red, castShadow: true
    }, h("cylinderGeometry", { args: [2.26, 2.38, 2.2, 32] }))),
    h("mesh", { position: [0, 15.95, 0], material: mats.dark }, h("cylinderGeometry", { args: [2.72, 2.72, .3, 32] })),
    h("mesh", { position: [0, 16.84, 0], material: mats.glass }, h("cylinderGeometry", { args: [1.85, 1.85, 1.55, 32, 1, true] })),
    h("mesh", { position: [0, 16.88, 0], material: mats.dark }, h("cylinderGeometry", { args: [1.93, 1.93, .14, 32] })),
    h("mesh", { position: [0, 17.68, 0], material: mats.gold }, h("cylinderGeometry", { args: [1.96, 1.78, .22, 32] })),
    h("mesh", { position: [0, 18.05, 0], material: mats.white }, h("sphereGeometry", { args: [1.5, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2] })),
    h("mesh", { ref: lamp, position: [0, 16.92, 0], material: new THREE.MeshStandardMaterial({ color: "#ffe8a1", emissive: "#f5c35e", emissiveIntensity: 1.1 }) }, h("sphereGeometry", { args: [.42, 20, 16] })),
    h("group", { ref: beam, position: [0, 16.92, 0] },
      h("mesh", { position: [0, 0, 6.4], rotation: [Math.PI / 2, 0, 0], material: new THREE.MeshBasicMaterial({ color: "#ffe7a0", transparent: true, opacity: active ? .12 : .045, side: THREE.DoubleSide, depthWrite: false }) }, h("coneGeometry", { args: [2.3, 13, 24, 1, true] }))
    ),
    h("mesh", { position: [0, 16.845, 0], rotation: [-Math.PI / 2, 0, 0], material: mats.dark }, h("ringGeometry", { args: [2.35, 6.05, 64] })),
    h("mesh", { position: [0, 17.12, 0], material: mats.gold }, h("torusGeometry", { args: [5.35, .12, 10, 64] })),
    h("mesh", { position: [0, 17.12, 0], rotation: [Math.PI / 2, 0, 0], material: mats.gold }, h("torusGeometry", { args: [5.35, .07, 8, 64] })),
    ...steps.map((step) => h("mesh", {
      key: "stair-" + step.index,
      position: [step.x - point.x, step.y - .18, step.z - point.z],
      material: step.index % 4 === 0 ? mats.gold : mats.wood,
      castShadow: true, receiveShadow: true
    }, h("boxGeometry", { args: [step.sx, .34, step.sz] }))),
    ...steps.filter((step) => step.index % 2 === 0).map((step) =>
      h("mesh", { key: "stair-post-" + step.index, position: [step.x - point.x + (step.x > point.x ? .72 : step.x < point.x ? -.72 : 0), step.y + .43, step.z - point.z + (step.z > point.z ? .72 : step.z < point.z ? -.72 : 0)], material: mats.dark }, h("cylinderGeometry", { args: [.045, .06, .86, 8] }))
    ),
    h("mesh", { position: [0, 17.18, 0], material: mats.glow, visible: active }, h("octahedronGeometry", { args: [.48, 1] }))
  );
}

function Buoy({ point, index, progressRef }) {
  const root = useRef(null), halo = useRef(null), bulb = useRef(null);
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d84b43", roughness: .35, metalness: .24, emissive: "#9e3027", emissiveIntensity: .16 }), []);
  const crownMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f5d36f", roughness: .32, metalness: .35, emissive: "#f0a82f", emissiveIntensity: .42 }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + index * .75, passed = index < progressRef.current, next = index === progressRef.current;
    if (root.current) { root.current.position.y = -.18 + Math.sin(t * 1.65) * .12; root.current.rotation.y = Math.sin(t * .65) * .12; }
    if (halo.current) { const pulse = 1 + Math.sin(t * 2.4) * .085; halo.current.scale.set(pulse, pulse, pulse); }
    bodyMat.color.set(passed ? "#65a982" : next ? "#f2bc4e" : "#d84b43");
    crownMat.emissiveIntensity = next ? .85 + Math.sin(t * 3.4) * .22 : .3;
    if (bulb.current) bulb.current.material = crownMat;
  });
  return h("group", { position: [point.x, 0, point.z] },
    h("group", { ref: root },
      h("mesh", { position: [0, .52, 0], material: bodyMat, castShadow: true }, h("cylinderGeometry", { args: [.24, .54, 1.05, 12] })),
      h("mesh", { position: [0, 1.1, 0], material: crownMat, castShadow: true }, h("cylinderGeometry", { args: [.3, .24, .22, 12] })),
      h("mesh", { ref: bulb, position: [0, 1.31, 0], material: crownMat }, h("sphereGeometry", { args: [.19, 14, 12] })),
      h("mesh", { position: [0, 1.48, 0], material: mats.dark }, h("torusGeometry", { args: [.28, .045, 8, 16] })),
      ...[-1, 1].map((side) => h("mesh", { key: "fin-" + side, position: [side * .31, .26, 0], material: mats.white, rotation: [0, 0, side * .1] }, h("boxGeometry", { args: [.08, .34, .11] }))),
      ...Array.from({ length: index + 1 }, (_, dot) => h("mesh", { key: "number-dot-" + dot, position: [0, .68 + dot * .105, .31], material: mats.glow }, h("sphereGeometry", { args: [.035, 8, 7] })))
    ),
    h("mesh", { ref: halo, position: [0, .08, 0], rotation: [-Math.PI / 2, 0, 0], material: new THREE.MeshBasicMaterial({ color: "#d3f5f0", transparent: true, opacity: .44, side: THREE.DoubleSide, depthWrite: false }) }, h("ringGeometry", { args: [.8, 1.22, 32] })),
    h("mesh", { position: [0, -.6, 0], material: mats.dark }, h("cylinderGeometry", { args: [.12, .35, .85, 10] }))
  );
}

function ObservationDeck({ target, active }) {
  const telescope = useRef(null), marker = useRef(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (telescope.current) telescope.current.rotation.y = Math.sin(t * .22) * .22;
    if (marker.current) { marker.current.position.y = 2.5 + Math.sin(t * 2.1) * .18; marker.current.rotation.y = t * .6; marker.current.visible = active; }
  });
  if (!target.building) return null;
  return h("group", { position: [target.x, target.y + .03, target.z] },
    h("mesh", { rotation: [-Math.PI / 2, 0, 0], material: mats.dark }, h("ringGeometry", { args: [2.7, 3.0, 56] })),
    h("mesh", { position: [0, .08, 0], material: mats.gold }, h("cylinderGeometry", { args: [2.55, 2.75, .16, 48] })),
    h("mesh", { position: [0, .18, 0], material: new THREE.MeshPhysicalMaterial({ color: "#8fd0d7", transparent: true, opacity: .2, metalness: .45, roughness: .18 }) }, h("cylinderGeometry", { args: [2.25, 2.25, .08, 48] })),
    ...[-1, 1].flatMap((side) => [
      h("mesh", { key: "view-rail-x-" + side, position: [side * 2.9, .72, 0], material: mats.dark }, h("boxGeometry", { args: [.12, 1.35, 5.2] })),
      h("mesh", { key: "view-rail-z-" + side, position: [0, .72, side * 2.9], material: mats.dark }, h("boxGeometry", { args: [5.2, 1.35, .12] }))
    ]),
    h("group", { ref: telescope, position: [0, .22, -1.0] },
      ...[-1, 1].map((side) => h("mesh", { key: "tripod-" + side, position: [side * .42, .56, .16], rotation: [0, 0, side * .24], material: mats.gold }, h("cylinderGeometry", { args: [.045, .065, 1.15, 9] }))),
      h("mesh", { position: [0, .92, -.12], rotation: [-.68, 0, 0], material: mats.dark }, h("cylinderGeometry", { args: [.22, .29, 1.65, 20] })),
      h("mesh", { position: [0, 1.45, .41], rotation: [-.68, 0, 0], material: mats.glass }, h("cylinderGeometry", { args: [.16, .18, .15, 20] })),
      h("mesh", { position: [0, .32, -.12], material: mats.gold }, h("cylinderGeometry", { args: [.36, .36, .12, 20] }))
    ),
    h("mesh", { ref: marker, position: [0, 2.5, 0], material: mats.glow }, h("octahedronGeometry", { args: [.34, 1] })),
    h("mesh", { position: [0, .27, 1.9], material: mats.wood }, h("boxGeometry", { args: [2.6, .75, .13] })),
    h("mesh", { position: [0, .7, 1.98], material: mats.glow }, h("boxGeometry", { args: [2.1, .045, .025] }))
  );
}

function StationMarker({ station, active }) {
  const ring = useRef(null), gem = useRef(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + station.id;
    if (ring.current) { ring.current.rotation.z = t * .35; ring.current.scale.setScalar(1 + Math.sin(t * 2.2) * .08); }
    if (gem.current) gem.current.position.y = station.y + 1.9 + Math.sin(t * 2.0) * .12;
  });
  return h("group", { position: [station.x, 0, station.z] },
    h("mesh", { ref: ring, position: [0, station.y + .25, 0], rotation: [-Math.PI / 2, 0, 0], material: new THREE.MeshBasicMaterial({ color: active ? "#f2d47e" : "#9acbd0", transparent: true, opacity: .62, side: THREE.DoubleSide }) }, h("ringGeometry", { args: [2.5, 2.72, 36] })),
    h("mesh", { ref: gem, position: [0, station.y + 1.9, 0], material: mats.glow }, h("octahedronGeometry", { args: [.23, 1] }))
  );
}

export function AdventureMissions({ world, marine, playerPositionRef, completedIds = [], onMissionComplete }) {
  const layout = useMemo(() => getAdventureMissionLayout(world, marine), [world, marine]);
  const buoyProgress = useRef(0), cableStations = useRef(new Set()), previousCount = useRef(completedIds.length);
  useEffect(() => {
    if (completedIds.length < previousCount.current) {
      buoyProgress.current = 0;
      cableStations.current = new Set();
    }
    previousCount.current = completedIds.length;
  }, [completedIds]);
  useFrame(() => {
    const player = playerPositionRef?.current;
    if (!player) return;
    if (player.mode === "boat" && !completedIds.includes("buoy-course")) {
      const point = layout.buoys[buoyProgress.current];
      if (point && Math.hypot(player.x - point.x, player.z - point.z) < 14) {
        buoyProgress.current += 1;
        if (buoyProgress.current >= 5) onMissionComplete?.("buoy-course");
      }
    }
    if ((player.mode === "cable" || player.mode === "cable-platform") && !completedIds.includes("cable-journey")) {
      CABLE_STATIONS.forEach((station) => {
        const distance = Math.hypot(player.x - station.x, player.y - station.y, player.z - station.z);
        if (distance < 9.5) cableStations.current.add(station.id);
      });
      if (cableStations.current.size >= 3) onMissionComplete?.("cable-journey");
    }
    if (player.mode !== "walk") return;
    const lighthouse = layout["secret-lighthouse"];
    if (!completedIds.includes("secret-lighthouse") && player.y >= 16.55 && Math.hypot(player.x - lighthouse.x, player.z - lighthouse.z) < 7.8) onMissionComplete?.("secret-lighthouse");
    const view = layout["city-observation"];
    if (!completedIds.includes("city-observation") && view.building && player.y >= view.y - .85 && Math.hypot(player.x - view.x, player.z - view.z) < 3.7) onMissionComplete?.("city-observation");
  });
  return h(React.Fragment, null,
    layout.island && h(Lighthouse, { point: layout["secret-lighthouse"], active: !completedIds.includes("secret-lighthouse") }),
    ...layout.buoys.map((point, index) => h(Buoy, { key: "course-buoy-" + index, point, index, progressRef: buoyProgress })),
    h(ObservationDeck, { target: layout["city-observation"], active: !completedIds.includes("city-observation") }),
    ...CABLE_STATIONS.map((station) => h(StationMarker, { key: "cable-mission-" + station.id, station, active: !completedIds.includes("cable-journey") })),
    !completedIds.includes("secret-lighthouse") ? h("mesh", { position: [layout["secret-lighthouse"].x, 19.6, layout["secret-lighthouse"].z], material: mats.glow }, h("octahedronGeometry", { args: [.34, 1] })) : null
  );
}
