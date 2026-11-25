import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const h = React.createElement;
export const CAVE_FLOOR_Y = -36;
export const CAVE_ENTRANCES = [
  { id: "north-garden", name: "הגן הצפוני", x: -144, z: -144, insideX: -20, insideZ: -2 },
  { id: "south-garden", name: "הגן הדרומי", x: 144, z: 144, insideX: 20, insideZ: -2 },
  { id: "east-garden", name: "גן המזרקה", x: 72, z: 36, insideX: 0, insideZ: -19 }
];
export const CAVE_DISCOVERIES = [
  { id: "blue-geode", name: "גביש כחול", kind: "crystal", x: -25, z: -17, points: 20, color: "#63d9ec" },
  { id: "ancient-fossil", name: "מאובן עתיק", kind: "fossil", x: -11, z: 13, points: 25, color: "#d9c7a0" },
  { id: "golden-compass", name: "מצפן זהב", kind: "compass", x: 10, z: 12, points: 30, color: "#e8bd61" },
  { id: "violet-crystal", name: "גביש סגול", kind: "crystal", x: 27, z: -14, points: 20, color: "#b68cff" },
  { id: "old-map", name: "מפה ישנה", kind: "map", x: 3, z: -5, points: 25, color: "#e8d6ad" },
  { id: "glow-mushroom", name: "פטרייה זוהרת", kind: "mushroom", x: -29, z: 17, points: 15, color: "#8fe6bf" }
];

const stone = new THREE.MeshStandardMaterial({ color: "#58616a", roughness: .96 });
const stoneLight = new THREE.MeshStandardMaterial({ color: "#879092", roughness: .9 });
const dark = new THREE.MeshStandardMaterial({ color: "#101923", roughness: 1 });
const crystalBlue = new THREE.MeshPhysicalMaterial({ color: "#70e3f0", emissive: "#218ca8", emissiveIntensity: 1.25, roughness: .22, metalness: .08, transmission: .16 });
const crystalPurple = new THREE.MeshPhysicalMaterial({ color: "#c49aff", emissive: "#7d42c6", emissiveIntensity: 1.15, roughness: .22, metalness: .08, transmission: .12 });
const amber = new THREE.MeshStandardMaterial({ color: "#e0bb71", emissive: "#8b5c24", emissiveIntensity: .2, metalness: .62, roughness: .34 });
const pale = new THREE.MeshStandardMaterial({ color: "#d3c4a7", roughness: .84 });

function SurfaceEntrance({ entrance, index }) {
  const glow = useRef(null);
  useFrame(({ clock }) => {
    if (glow.current) glow.current.material.opacity = .48 + Math.sin(clock.elapsedTime * 1.5 + index) * .12;
  });
  return h("group", { position: [entrance.x, .02, entrance.z] },
    h("mesh", { position: [0, -.015, 0], rotation: [-Math.PI / 2, 0, 0], material: dark },
      h("circleGeometry", { args: [3.1, 32] })),
    h("mesh", { position: [0, .05, 0], rotation: [-Math.PI / 2, 0, 0], material: stoneLight },
      h("torusGeometry", { args: [3.45, .42, 9, 32] })),
    ...Array.from({ length: 7 }, (_, step) => h("mesh", {
      key: "step-" + step,
      position: [0, .04 + step * .035, 2.45 - step * .58],
      material: step % 2 ? stone : stoneLight
    }, h("boxGeometry", { args: [2.65 - step * .12, .12, .66] }))),
    h("mesh", { ref: glow, position: [0, .09, 0], rotation: [-Math.PI / 2, 0, 0] },
      h("ringGeometry", { args: [2.15, 2.24, 36] }),
      h("meshBasicMaterial", { color: "#74d8e8", transparent: true, opacity: .55, depthWrite: false }))
  );
}

function CaveRoom() {
  const ceiling = useMemo(() => new THREE.MeshStandardMaterial({ color: "#283541", roughness: 1, side: THREE.DoubleSide }), []);
  const floor = useMemo(() => new THREE.MeshStandardMaterial({ color: "#48545a", roughness: .98, side: THREE.DoubleSide }), []);
  const pillars = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const a = i / 8 * Math.PI * 2;
    return { x: Math.cos(a) * 30, z: Math.sin(a) * 23, height: 8 + (i % 3) * 1.1 };
  }), []);
  const stalactites = useMemo(() => Array.from({ length: 22 }, (_, i) => {
    const a = i * 2.399963;
    const r = 7 + (i % 6) * 4.2;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r * .7, length: 1.4 + (i % 4) * .55 };
  }), []);
  return h("group", null,
    h("mesh", { position: [0, CAVE_FLOOR_Y, 0], rotation: [-Math.PI / 2, 0, 0], material: floor, receiveShadow: true },
      h("planeGeometry", { args: [74, 58] })),
    h("mesh", { position: [0, CAVE_FLOOR_Y + 13, 0], rotation: [-Math.PI / 2, 0, 0], material: ceiling },
      h("planeGeometry", { args: [74, 58] })),
    h("mesh", { position: [0, CAVE_FLOOR_Y + 6.5, -29], material: stone },
      h("boxGeometry", { args: [74, 13, 1.2] })),
    h("mesh", { position: [0, CAVE_FLOOR_Y + 6.5, 29], material: stone },
      h("boxGeometry", { args: [74, 13, 1.2] })),
    h("mesh", { position: [-37, CAVE_FLOOR_Y + 6.5, 0], material: stone },
      h("boxGeometry", { args: [1.2, 13, 58] })),
    h("mesh", { position: [37, CAVE_FLOOR_Y + 6.5, 0], material: stone },
      h("boxGeometry", { args: [1.2, 13, 58] })),
    ...pillars.map((p, i) => h("mesh", { key: "pillar-" + i, position: [p.x, CAVE_FLOOR_Y + p.height / 2, p.z], material: i % 2 ? stoneLight : stone, castShadow: true },
      h("cylinderGeometry", { args: [.8, 1.2, p.height, 7] }))),
    ...stalactites.map((p, i) => h("mesh", { key: "stalactite-" + i, position: [p.x, CAVE_FLOOR_Y + 13 - p.length / 2, p.z], material: i % 3 ? stone : stoneLight },
      h("coneGeometry", { args: [.42 + (i % 3) * .13, p.length, 7] }))),
    h("pointLight", { position: [-26, CAVE_FLOOR_Y + 2.5, -17], color: "#43cde9", intensity: 1.8, distance: 17 }),
    h("pointLight", { position: [26, CAVE_FLOOR_Y + 2.7, -15], color: "#a879eb", intensity: 1.7, distance: 17 }),
    h("pointLight", { position: [0, CAVE_FLOOR_Y + 2.5, 16], color: "#e7bc71", intensity: 1.15, distance: 14 })
  );
}

function CavePortal({ entrance }) {
  return h("group", { position: [entrance.insideX, CAVE_FLOOR_Y, entrance.insideZ] },
    h("mesh", { position: [0, 2.2, 0], material: dark },
      h("circleGeometry", { args: [2.15, 28] })),
    h("mesh", { position: [0, 2.2, .04], material: amber },
      h("torusGeometry", { args: [2.35, .16, 8, 28] })),
    ...[-1, 1].map(side => h("mesh", { key: "portal-post-" + side, position: [side * 2.25, 1.15, 0], material: stoneLight },
      h("boxGeometry", { args: [.42, 2.3, .54] }))),
    h("mesh", { position: [0, 4.45, 0], material: stoneLight },
      h("boxGeometry", { args: [4.9, .48, .64] }))
  );
}

function DiscoveryModel({ item, on }) {
  const root = useRef(null);
  useFrame(({ clock }) => {
    if (!root.current) return;
    root.current.rotation.y = Math.sin(clock.elapsedTime * .7 + item.x) * .12;
    root.current.position.y = CAVE_FLOOR_Y + .5 + Math.sin(clock.elapsedTime * 1.8 + item.z) * .12;
  });
  if (!on) return null;
  const model = item.kind === "crystal"
    ? h("mesh", { material: item.id === "violet-crystal" ? crystalPurple : crystalBlue, castShadow: true },
        h("octahedronGeometry", { args: [1.05, 1] }))
    : item.kind === "fossil"
      ? h("group", null,
          h("mesh", { material: pale, scale: [1.15, .22, .8] }, h("torusGeometry", { args: [.75, .16, 8, 18] })),
          h("mesh", { material: pale, position: [0, .1, 0], scale: [.16, .16, 1.35] }, h("cylinderGeometry", { args: [.13, .13, 2.1, 8] })))
      : item.kind === "compass"
        ? h("group", null,
            h("mesh", { material: amber }, h("cylinderGeometry", { args: [.72, .72, .18, 24] })),
            h("mesh", { material: pale, position: [0, .13, 0] }, h("coneGeometry", { args: [.22, .72, 4] })))
        : item.kind === "map"
          ? h("group", null,
              h("mesh", { material: pale }, h("boxGeometry", { args: [1.15, .12, .84] })),
              h("mesh", { material: amber, position: [0, .08, 0] }, h("boxGeometry", { args: [.72, .025, .035] })))
          : h("group", null,
              h("mesh", { material: crystalBlue, position: [0, .32, 0], scale: [.42, .55, .42] }, h("sphereGeometry", { args: [1, 12, 10] })),
              h("mesh", { material: pale, position: [0, .08, 0] }, h("cylinderGeometry", { args: [.3, .42, .2, 9] })));
  return h("group", { ref: root, position: [item.x, CAVE_FLOOR_Y + .5, item.z] },
    model,
    h("pointLight", { color: item.color, intensity: .85, distance: 5 })
  );
}

function Bats() {
  const bats = useMemo(() => Array.from({ length: 5 }, (_, i) => ({ phase: i * 1.18, radiusX: 12 + (i % 3) * 5, radiusZ: 8 + (i % 2) * 5, height: 8.2 + (i % 3) * 1.1 })), []);
  const roots = useRef([]);
  const wings = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    bats.forEach((bat, i) => {
      const root = roots.current[i];
      if (!root) return;
      const a = t * (.32 + i * .025) + bat.phase;
      root.position.set(Math.cos(a) * bat.radiusX, CAVE_FLOOR_Y + bat.height + Math.sin(a * 1.7) * .7, Math.sin(a) * bat.radiusZ);
      root.rotation.y = -a + Math.PI / 2;
      const span = Math.sin(t * 11 + bat.phase) * .62;
      if (wings.current[i]) wings.current[i].forEach((wing, side) => {
        if (wing) wing.rotation.z = (side === 0 ? 1 : -1) * span;
      });
    });
  });
  return h("group", null, ...bats.map((bat, i) => h("group", { key: i, ref: node => { roots.current[i] = node; } },
    h("mesh", { material: dark, scale: [.22, .2, .34] }, h("sphereGeometry", { args: [1, 10, 8] })),
    h("mesh", { material: dark, position: [0, .18, .22], scale: [.13, .17, .13] }, h("sphereGeometry", { args: [1, 8, 6] })),
    ...[-1, 1].map(side => h("group", { key: side, ref: node => {
      if (!wings.current[i]) wings.current[i] = [];
      wings.current[i][side === -1 ? 0 : 1] = node;
    }, position: [side * .14, 0, 0] },
      h("mesh", { material: dark, position: [side * .42, 0, 0], scale: [.5, .045, .2] }, h("sphereGeometry", { args: [1, 9, 6] }))
    ))
  )));
}

function Flashlight({ playerPositionRef }) {
  const lamp = useRef(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const grip = useRef(null);
  useFrame(() => {
    const player = playerPositionRef?.current;
    const active = player?.mode === "cave";
    if (lamp.current) lamp.current.visible = !!active;
    if (grip.current) grip.current.visible = !!active;
    if (!active) return;
    const yaw = Number(player.yaw) || 0;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const x = player.x || 0, y = (player.y || CAVE_FLOOR_Y) + 1.3, z = player.z || 0;
    if (lamp.current) lamp.current.position.set(x + fx * .38, y, z + fz * .38);
    target.position.set(x + fx * 13, y - .16, z + fz * 13);
    if (grip.current) {
      grip.current.position.set(x + fx * .44 - fz * .23, y - .22, z + fz * .44 + fx * .23);
      grip.current.rotation.set(0, yaw, Math.PI / 2);
    }
  });
  return h(React.Fragment, null,
    h("primitive", { object: target }),
    h("spotLight", { ref: lamp, target, color: "#fff1c9", intensity: 25, distance: 22, angle: .34, penumbra: .72, decay: 1.65, castShadow: false }),
    h("group", { ref: grip },
      h("mesh", { material: new THREE.MeshStandardMaterial({ color: "#26343d", metalness: .72, roughness: .28 }) },
        h("cylinderGeometry", { args: [.09, .12, .62, 10] })),
      h("mesh", { position: [0, .34, 0], material: new THREE.MeshBasicMaterial({ color: "#fff0c1" }) },
        h("cylinderGeometry", { args: [.14, .1, .1, 12] }))
    )
  );
}

export function CaveSystem({ playerPositionRef }) {
  return h(React.Fragment, null,
    ...CAVE_ENTRANCES.map((entrance, i) => h(SurfaceEntrance, { key: "surface-" + entrance.id, entrance, index: i })),
    h(CaveRoom),
    ...CAVE_ENTRANCES.map(entrance => h(CavePortal, { key: "portal-" + entrance.id, entrance })),
    ...CAVE_DISCOVERIES.map(item => h(DiscoveryModel, { key: item.id, item, on: false })),
    h(Bats),
    h(Flashlight, { playerPositionRef })
  );
}
