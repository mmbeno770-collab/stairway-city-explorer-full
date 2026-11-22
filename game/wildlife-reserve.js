import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const h = React.createElement;
const materialCache = new Map();
function fur(color) {
  if (!materialCache.has(color)) materialCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: .94 }));
  return materialCache.get(color);
}
const DARK = fur("#302a25");
const EYE = fur("#171714");
const CREAM = fur("#e8ddc9");
const PINK = fur("#bd867d");
const ORANGE = fur("#d58a35");
const WATER = new THREE.MeshPhysicalMaterial({ color: "#579b9d", roughness: .18, metalness: .06, clearcoat: .7, clearcoatRoughness: .2 });
const GRASS = fur("#78975c");
const PATH = fur("#c6b58f");
const REED = fur("#6f8c50");
const WOOD = fur("#76583d");
const STONE = fur("#8a8d7e");
const FLOWER = fur("#e8d6a8");

export const WILDLIFE_MISSIONS = [
  { title: "תצפית על הברווזים", description: "גשו לשביל שליד האגם וצפו בברווזים מהחוף.", dx: -5, dz: -2, radius: 4.4 },
  { title: "ביקור בקרחת האיילים", description: "המשיכו אל אחו העצים והתבוננו באיילים מרחוק.", dx: 3, dz: -7, radius: 3.8 },
  { title: "מצפור הציפורים", description: "סיימו את הסיור במצפור העץ שבקצה השמורה.", dx: 8, dz: 6, radius: 3.8 }
];

function AnimalLeg({ position, material, refValue, length = .42, width = .075 }) {
  return h("group", { ref: refValue, position },
    h("mesh", { position: [0, -length * .48, 0], castShadow: true },
      h("cylinderGeometry", { args: [width * .82, width, length, 9] }),
      h("meshStandardMaterial", { color: material.color, roughness: .96 })
    ),
    h("mesh", { position: [0, -length + .025, .055], castShadow: true, material: fur("#51463b"), scale: [1.16, .62, 1.75] },
      h("sphereGeometry", { args: [width, 10, 8] })
    )
  );
}

function CityAnimal({ animal }) {
  const root = useRef(null);
  const head = useRef(null);
  const tail = useRef(null);
  const legs = useRef([]);
  const wings = useRef([]);
  const motion = useRef({ angle: animal.phase, elapsed: 0, paused: false, pauseFor: 1.4 + (animal.phase % 1.5) });
  const type = animal.type;
  const isDuck = type === "duck";
  const isBird = type === "pigeon";
  const isRabbit = type === "rabbit";
  const isDeer = type === "deer";
  const isSquirrel = type === "squirrel";
  const isCat = type === "cat";
  const isFox = type === "fox";
  const coat = fur(animal.color);
  const belly = fur(animal.belly || (isBird ? "#d9d9d2" : isDuck ? "#c7b99b" : "#d8c7ae"));
  const darkCoat = fur(animal.dark || (isBird ? "#4d5960" : isDuck ? "#4d604b" : "#51483e"));
  const legLength = isDeer ? .62 : isDuck ? .28 : isBird ? .2 : isRabbit ? .32 : .43;
  const legWidth = isDeer ? .055 : isBird ? .035 : isDuck ? .04 : .07;
  const scale = animal.scale || 1;

  useFrame(({ clock }, dt) => {
    if (!root.current) return;
    const state = motion.current;
    state.elapsed += Math.min(dt, .05);
    if (state.elapsed >= state.pauseFor) {
      state.elapsed = 0;
      state.paused = !state.paused;
      state.pauseFor = state.paused ? 1.4 + (animal.phase % 1.7) : 3.4 + (animal.phase % 2.2);
    }
    if (!state.paused) state.angle += dt * (animal.speed || .38);
    const a = state.angle;
    const x = animal.x + Math.cos(a) * (animal.wanderX || .55);
    const z = animal.z + Math.sin(a * .82) * (animal.wanderZ || .48);
    root.current.position.set(x, isDuck ? .025 + Math.sin(clock.elapsedTime * 2 + animal.phase) * .018 : .015, z);
    root.current.rotation.y = Math.atan2(-Math.sin(a) * (animal.wanderX || .55), Math.cos(a * .82) * .82 * (animal.wanderZ || .48));
    const stride = state.paused ? 0 : Math.sin(a * 9) * (isDeer ? .42 : .3);
    legs.current.forEach((leg, i) => { if (leg) leg.rotation.x = stride * (i % 2 ? -1 : 1); });
    wings.current.forEach((wing, i) => {
      if (wing) wing.rotation.z = isBird ? Math.sin(clock.elapsedTime * 6 + animal.phase) * .13 * (i ? -1 : 1) : Math.sin(clock.elapsedTime * 2.4 + animal.phase) * .035 * (i ? -1 : 1);
    });
    if (head.current) {
      head.current.rotation.y = state.paused ? Math.sin(clock.elapsedTime * .7 + animal.phase) * .17 : 0;
      head.current.rotation.x = state.paused ? Math.sin(clock.elapsedTime * .9 + animal.phase) * .07 : -.035;
    }
    if (tail.current) {
      tail.current.rotation.x = isCat ? -.22 + Math.sin(clock.elapsedTime * 2.1 + animal.phase) * .16
        : Math.sin(clock.elapsedTime * (isSquirrel ? 1.7 : 3.4) + animal.phase) * (isSquirrel ? .2 : .24);
      tail.current.rotation.z = Math.sin(clock.elapsedTime * 2.2 + animal.phase) * .12;
    }
  });

  const legPositions = isDuck || isBird
    ? [[-.13, .31, .08], [.13, .31, .08]]
    : [[-.17, .39, .28], [.17, .39, .28], [-.17, .39, -.29], [.17, .39, -.29]];
  const bodyScale = isDeer ? [.28, .34, .62] : isRabbit ? [.3, .27, .4] : isSquirrel ? [.23, .38, .28] : isDuck ? [.3, .31, .45] : isBird ? [.19, .18, .3] : isCat ? [.23, .23, .48] : [.29, .29, .53];
  const headPosition = isDeer ? [0, 1.13, .5] : isDuck ? [0, 1.0, .27] : isBird ? [0, .64, .25] : isSquirrel ? [0, 1.0, .18] : isRabbit ? [0, .86, .39] : [0, .91, .56];
  const headScale = isDeer ? [.18, .22, .24] : isDuck ? [.16, .16, .17] : isBird ? [.12, .12, .13] : isRabbit ? [.21, .19, .2] : isSquirrel ? [.17, .18, .17] : [.2, .2, .22];

  return h("group", { ref: root, position: [animal.x, 0, animal.z], scale },
    h("mesh", { position: [0, isSquirrel ? .69 : .62, 0], castShadow: true, receiveShadow: true, material: coat, scale: bodyScale },
      h("sphereGeometry", { args: [1, 24, 18] })
    ),
    !isBird && !isDuck && h("mesh", { position: [0, .52, .11], material: belly, scale: isDeer ? [.2, .22, .42] : [.205, .16, .38] },
      h("sphereGeometry", { args: [1, 18, 12] })
    ),
    isDeer && h("mesh", { position: [0, .93, .38], rotation: [-.35, 0, 0], material: coat, scale: [.15, .3, .16] },
      h("cylinderGeometry", { args: [.12, .18, .48, 12] })
    ),
    h("group", { ref: head, position: headPosition },
      h("mesh", { material: coat, scale: headScale, castShadow: true }, h("sphereGeometry", { args: [1, 20, 14] })),
      h("mesh", { position: [0, isBird ? -.04 : -.07, isBird ? .12 : .16], material: isDuck ? ORANGE : isBird ? DARK : belly, scale: isDuck ? [.075, .055, .16] : isBird ? [.055, .045, .1] : isDeer ? [.095, .08, .12] : [.12, .09, .16] },
        h("sphereGeometry", { args: [1, 14, 10] })
      ),
      ...[-1, 1].map((side) => h("mesh", { key: "eye-" + side, position: [side * (isBird ? .085 : .145), .035, isBird ? .085 : .12], material: EYE, scale: [.027, .033, .025] },
        h("sphereGeometry", { args: [1, 10, 8] })
      )),
      ...(isRabbit ? [-1, 1].map((side) => h("mesh", { key: "ear-" + side, position: [side * .105, .27, -.015], rotation: [side * .1, 0, side * -.13], material: coat, scale: [.075, .28, .07] },
        h("sphereGeometry", { args: [1, 14, 10] })
      )) : []),
      ...(isCat ? [-1, 1].map((side) => h("mesh", { key: "ear-" + side, position: [side * .13, .18, -.01], rotation: [0, 0, side * -.14], material: coat },
        h("coneGeometry", { args: [.085, .22, 5] })
      )) : []),
      ...(isDeer ? [-1, 1].flatMap((side) => [
        h("mesh", { key: "antler-main-" + side, position: [side * .13, .28, -.035], rotation: [0, 0, side * -.17], material: darkCoat }, h("cylinderGeometry", { args: [.018, .03, .38, 7] })),
        h("mesh", { key: "antler-branch-" + side, position: [side * .22, .37, -.035], rotation: [0, 0, side * -.75], material: darkCoat }, h("cylinderGeometry", { args: [.012, .019, .23, 6] })),
        h("mesh", { key: "antler-tip-" + side, position: [side * .27, .48, -.035], rotation: [0, 0, side * -.95], material: darkCoat }, h("cylinderGeometry", { args: [.008, .014, .16, 6] }))
      ]) : [])
    ),
    isDuck && h("mesh", { position: [0, .82, .28], material: coat, scale: [.09, .31, .09], castShadow: true },
      h("cylinderGeometry", { args: [.07, .09, .34, 12] })
    ),
    isDuck && h("mesh", { position: [0, .88, .46], material: ORANGE, rotation: [Math.PI / 2, 0, 0], scale: [.8, .6, 1] },
      h("coneGeometry", { args: [.075, .2, 7] })
    ),
    isSquirrel && h("mesh", { ref: tail, position: [0, .78, -.32], material: coat, scale: [.19, .42, .16], rotation: [-.3, 0, 0], castShadow: true },
      h("sphereGeometry", { args: [1, 16, 12] })
    ),
    !isSquirrel && !isBird && h("group", { ref: tail, position: [0, .69, -.49] },
      h("mesh", { material: isFox ? fur("#bd7042") : coat, scale: isDeer ? [.09, .09, .26] : isRabbit ? [.11, .12, .16] : [.09, .12, isCat ? .46 : .29], rotation: [isCat ? -.55 : -.16, 0, 0] },
        h("sphereGeometry", { args: [1, 16, 12] })
      ),
      type === "fox" && h("mesh", { position: [0, 0, -.24], material: CREAM, scale: [.085, .1, .12] }, h("sphereGeometry", { args: [1, 12, 10] }))
    ),
    ...(isBird ? [-1, 1].map((side, i) => h("mesh", { key: "wing-" + side, ref: (node) => { wings.current[i] = node; }, position: [side * .16, .02, -.015], material: darkCoat, scale: [.18, .045, .23] },
      h("sphereGeometry", { args: [1, 12, 8] })
    )) : []),
    ...legPositions.map((position, i) => h(AnimalLeg, { key: "leg-" + i, position, material: isDuck ? ORANGE : darkCoat, length: legLength, width: legWidth, refValue: (node) => { legs.current[i] = node; } })),
    isRabbit && h("mesh", { position: [0, .48, -.38], material: CREAM, scale: [.105, .1, .09] }, h("sphereGeometry", { args: [1, 12, 10] })),
    isDeer && h("mesh", { position: [0, .92, -.48], material: CREAM, scale: [.12, .13, .12] }, h("sphereGeometry", { args: [1, 12, 10] }))
  );
}

function MissionBeacon({ x, z }) {
  const root = useRef(null);
  const ring = useRef(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (root.current) root.current.position.y = .95 + Math.sin(t * 2.2) * .12;
    if (ring.current) {
      const pulse = 1 + (Math.sin(t * 2.6) + 1) * .12;
      ring.current.scale.setScalar(pulse);
    }
  });
  return h("group", { position: [x, 0, z] },
    h("mesh", { position: [0, .05, 0], rotation: [-Math.PI / 2, 0, 0], ref: ring },
      h("ringGeometry", { args: [1.05, 1.32, 40] }),
      h("meshBasicMaterial", { color: "#e4c277", transparent: true, opacity: .85, side: THREE.DoubleSide })
    ),
    h("group", { ref: root },
      h("mesh", { position: [0, .35, 0] },
        h("cylinderGeometry", { args: [.035, .09, .7, 9] }),
        h("meshBasicMaterial", { color: "#e8c775", transparent: true, opacity: .48 })
      ),
      h("mesh", { position: [0, .78, 0] },
        h("octahedronGeometry", { args: [.2, 0] }),
        h("meshStandardMaterial", { color: "#f6d88d", emissive: "#b77c32", emissiveIntensity: 1.2, roughness: .28 })
      )
    )
  );
}

export function WildlifeReserve({ reserve, playerPositionRef, missionStep, completed, onMissionComplete }) {
  if (!reserve) return null;
  const cx = reserve.x, cz = reserve.z;
  const lastStep = useRef(-1);
  useFrame(() => {
    if (completed || missionStep >= WILDLIFE_MISSIONS.length || lastStep.current === missionStep) return;
    const target = WILDLIFE_MISSIONS[missionStep];
    const player = playerPositionRef.current;
    if (!player || player.mode !== "walk") return;
    const dx = player.x - (cx + target.dx);
    const dz = player.z - (cz + target.dz);
    if (dx * dx + dz * dz <= target.radius * target.radius) {
      lastStep.current = missionStep;
      onMissionComplete(missionStep);
    }
  });

  const animals = [
    { id: "deer-a", type: "deer", x: cx + 3.2, z: cz - 7.5, phase: .2, speed: .25, scale: 1.12, wanderX: .75, wanderZ: .5, color: "#9a6b45", belly: "#d9c7aa", dark: "#4a382b" },
    { id: "deer-b", type: "deer", x: cx + 5.8, z: cz - 6.2, phase: 2.4, speed: .2, scale: .92, wanderX: .65, wanderZ: .55, color: "#a97a50", belly: "#dec9a8", dark: "#51402f" },
    { id: "duck-a", type: "duck", x: cx - 7.8, z: cz - 2.8, phase: 1.4, speed: .18, scale: .88, wanderX: .5, wanderZ: .34, color: "#596e48" },
    { id: "duck-b", type: "duck", x: cx - 6.5, z: cz - 3.4, phase: 3.4, speed: .16, scale: .82, wanderX: .45, wanderZ: .3, color: "#70593e" },
    { id: "duck-c", type: "duck", x: cx - 8.4, z: cz - .6, phase: 5.4, speed: .19, scale: .86, wanderX: .42, wanderZ: .32, color: "#66734f" },
    { id: "rabbit-a", type: "rabbit", x: cx + 1.5, z: cz + 1.5, phase: 2.1, speed: .5, scale: .8, wanderX: .9, wanderZ: .8, color: "#b9a58e", belly: "#e0d4c2" },
    { id: "rabbit-b", type: "rabbit", x: cx + 4.2, z: cz + 2.5, phase: 4.3, speed: .46, scale: .72, wanderX: .8, wanderZ: .7, color: "#857768", belly: "#d8cabb" },
    { id: "fox-a", type: "fox", x: cx - 9.4, z: cz + 6.5, phase: 1.8, speed: .31, scale: .88, wanderX: .65, wanderZ: .55, color: "#b96c38", belly: "#ead8c0", dark: "#5b3a28" },
    { id: "squirrel-a", type: "squirrel", x: cx + 9, z: cz - 1, phase: 3.1, speed: .56, scale: .73, wanderX: .65, wanderZ: .7, color: "#96623c" },
    { id: "cat-a", type: "cat", x: cx - 1.5, z: cz + 9, phase: 4.8, speed: .29, scale: .78, wanderX: .9, wanderZ: .7, color: "#6c6660", belly: "#c6c0b5" },
    { id: "dog-a", type: "dog", x: cx + 8.6, z: cz + 8.6, phase: .8, speed: .34, scale: .88, wanderX: .85, wanderZ: .55, color: "#b88d60", belly: "#e1d1b5" },
    { id: "pigeon-a", type: "pigeon", x: cx - 1.5, z: cz + 4, phase: 1.1, speed: .72, scale: .68, wanderX: .55, wanderZ: .45, color: "#7b8587", dark: "#59666b" },
    { id: "pigeon-b", type: "pigeon", x: cx + 1, z: cz + 4.8, phase: 4.1, speed: .68, scale: .62, wanderX: .5, wanderZ: .4, color: "#8a9290", dark: "#687477" }
  ];

  return h(React.Fragment, null,
    h("group", null,
      h("mesh", { position: [cx, -.025, cz], rotation: [-Math.PI / 2, 0, 0], material: GRASS, receiveShadow: true },
        h("planeGeometry", { args: [27.5, 27.5] })
      ),
      ...[[-4, 8, 7.5, .3], [1, 5, 6, -.3], [5, -1, 5.2, .42], [7, 4.5, 4.8, -.5], [-1, 10, 4.2, .15]].map(([dx, dz, len, yaw], i) =>
        h("mesh", { key: "trail-" + i, position: [cx + dx, .018, cz + dz], rotation: [-Math.PI / 2, 0, yaw], material: PATH },
          h("planeGeometry", { args: [1.25, len] })
        )
      ),
      h("mesh", { position: [cx - 5, .035, cz - 2], rotation: [-Math.PI / 2, 0, 0], scale: [3.9, 3.15, 1], material: STONE },
        h("circleGeometry", { args: [1, 48] })
      ),
      h("mesh", { position: [cx - 5, .07, cz - 2], rotation: [-Math.PI / 2, 0, 0], scale: [3.54, 2.82, 1], material: WATER },
        h("circleGeometry", { args: [1, 48] })
      ),
      ...[[-6.8, -4.2], [-3.4, -4.5], [-7.9, -.5]].map(([dx, dz], i) =>
        h("mesh", { key: "lily-" + i, position: [cx + dx, .09, cz + dz], rotation: [-Math.PI / 2, 0, i * .8], material: fur("#668c58"), scale: [.36, .25, 1] },
          h("circleGeometry", { args: [1, 16] })
        )
      ),
      ...Array.from({ length: 14 }, (_, i) => {
        const a = i * 2.399, dx = Math.cos(a) * (4.1 + (i % 3) * .12), dz = Math.sin(a) * (3.25 + (i % 2) * .16);
        return h("group", { key: "reed-" + i, position: [cx - 5 + dx, .04, cz - 2 + dz], rotation: [0, a, 0] },
          h("mesh", { position: [0, .38, 0], rotation: [.08, 0, -.12], material: REED },
            h("cylinderGeometry", { args: [.025, .035, .75, 6] })
          ),
          h("mesh", { position: [0, .75, 0], material: fur("#8b7850") },
            h("capsuleGeometry", { args: [.035, .12, 3, 5] })
          )
        );
      }),
      h("group", { position: [cx + 8, .04, cz + 6], rotation: [0, -.25, 0] },
        h("mesh", { position: [0, .22, 0], material: WOOD }, h("boxGeometry", { args: [4.8, .22, 3.3] })),
        ...[-1, 1].flatMap((side) => [-1, 1].map((back) =>
          h("mesh", { key: "post-" + side + "-" + back, position: [side * 2.05, -.12, back * 1.3], material: WOOD },
            h("cylinderGeometry", { args: [.09, .12, .65, 8] })
          )
        )),
        ...[-1, 1].map((side) => h("mesh", { key: "rail-" + side, position: [side * 2.05, .52, 0], material: WOOD },
          h("boxGeometry", { args: [.13, .12, 2.8] })
        )),
        h("mesh", { position: [0, 1.05, -1.25], material: WOOD }, h("boxGeometry", { args: [4.8, 1.9, .12] })),
        h("mesh", { position: [0, 1.08, -1.17], material: fur("#e5d9b9") }, h("boxGeometry", { args: [4.25, 1.45, .035] })),
        h("mesh", { position: [0, 1.1, -1.13], material: fur("#475b48") }, h("boxGeometry", { args: [3.9, 1.2, .025] }))
      ),
      ...[[-11, -10], [10.5, -10], [-10.5, 9.6], [10.8, 10]].map(([dx, dz], i) =>
        h("group", { key: "rock-" + i, position: [cx + dx, .02, cz + dz], rotation: [0, i * .8, .1] },
          h("mesh", { material: STONE, scale: [1.1, .55, .72], castShadow: true }, h("dodecahedronGeometry", { args: [.8, 1] }))
        )
      ),
      ...Array.from({ length: 18 }, (_, i) => {
        const a = i * 2.4, dx = Math.cos(a) * (10.1 + (i % 3) * .7), dz = Math.sin(a) * (10.2 + (i % 4) * .5);
        return h("group", { key: "flower-" + i, position: [cx + dx, .03, cz + dz] },
          h("mesh", { position: [0, .16, 0], material: REED }, h("cylinderGeometry", { args: [.018, .025, .32, 5] })),
          h("mesh", { position: [0, .32, 0], material: FLOWER }, h("sphereGeometry", { args: [.075, 8, 7] }))
        );
      })
    ),
    ...animals.map((animal) => h(CityAnimal, { key: animal.id, animal })),
    !completed && missionStep < WILDLIFE_MISSIONS.length
      ? h(MissionBeacon, { x: cx + WILDLIFE_MISSIONS[missionStep].dx, z: cz + WILDLIFE_MISSIONS[missionStep].dz })
      : null
  );
}
