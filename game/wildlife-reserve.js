import React, { useEffect, useMemo, useRef } from "react";
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
  { id: "duck-watch", title: "תצפית על הברווזים", description: "התקרבו בשקט לשפת האגם והתבוננו בברווזים.", location: "האגם בשמורת הטבע", type: "visit", dx: -5, dz: -2, radius: 4.4, points: 120 },
  { id: "deer-ride", title: "רכיבה על אייל", description: "התקרבו לאייל בזהירות, עלו עליו ורכבו לפחות 8 שניות.", location: "קרחת האיילים בשמורת הטבע", type: "deerRide", points: 400 },
  { id: "squirrel-catch", title: "תפיסת סנאי", description: "מצאו סנאי על אחד העצים, התגנבו אליו ולחצו F כשהוא קרוב.", location: "העצים שבשמורת הטבע", type: "squirrel", points: 300 },
  { id: "bird-lookout", title: "מצפור הציפורים", description: "עלו למצפור העץ שבקצה השמורה והגיעו לסמן הזהוב.", location: "מצפור העץ בשמורה", type: "visit", dx: 8, dz: 6, radius: 3.8, points: 180 },
  { id: "island", title: "כיבוש אי הדקלים", description: "הגיעו לאי הדקלים, מצאו את הדגל ולחצו F כדי לתבוע בעלות על האי.", location: "אי הדקלים, מצפון לעיר", type: "island", x: 0, z: -470, radius: 7, points: 600 }
];

function CityAnimal({ animal, playerPositionRef, reserveCenter }) {
  const root = useRef(null);
  const head = useRef(null);
  const tail = useRef(null);
  const legs = useRef([]);
  const motion = useRef({ angle: animal.phase || 0 });
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
  const cream = fur("#eadcc4");
  const nose = isDeer ? fur("#40342c") : isSquirrel ? fur("#6d4539") : PINK;
  const legLength = isDeer ? .62 : isDuck ? .28 : isBird ? .2 : isRabbit ? .32 : isSquirrel ? .19 : .43;
  const legWidth = isDeer ? .045 : isBird ? .035 : isDuck ? .04 : isSquirrel ? .035 : .07;
  const scale = animal.scale || 1;

  useFrame(({ clock }, dt) => {
    if (!root.current) return;
    const step = Math.min(dt, .05);
    const player = playerPositionRef?.current;
    const distance = player ? Math.hypot(player.x - animal.x, player.z - animal.z) : Infinity;
    const crouched = !!player?.sneaking;
    const detectionRange = isDeer ? (crouched ? 1.55 : 10.5) : isSquirrel ? (crouched ? 1.35 : 7.2) : 3.4;

    if (animal.caught) {
      root.current.visible = false;
      return;
    }
    root.current.visible = true;

    if (!animal.mounted && !animal.fleeing && distance < detectionRange && player?.mode === "walk") {
      animal.fleeing = true;
      animal.fleeTimer = isDeer ? 3.3 : isSquirrel ? 1.15 : 1.7;
      if (isSquirrel) {
        const perches = animal.perches || [];
        const nextIndex = perches.length ? (animal.perchIndex + 2 + Math.floor(animal.phase)) % perches.length : 0;
        const target = perches[nextIndex];
        if (target) {
          animal.jumpFrom = { x: animal.x, y: animal.y, z: animal.z };
          animal.jumpTo = target;
          animal.perchIndex = nextIndex;
          animal.jumpProgress = 0;
        }
      }
    }

    if (isDeer && !animal.mounted) {
      if (animal.fleeTimer > 0) {
        const dx = animal.x - (player?.x ?? animal.homeX);
        const dz = animal.z - (player?.z ?? animal.homeZ);
        const length = Math.hypot(dx, dz) || 1;
        let vx = dx / length, vz = dz / length;
        const fromHome = Math.hypot(animal.x - reserveCenter.x, animal.z - reserveCenter.z);
        if (fromHome > 20) {
          vx = (reserveCenter.x - animal.x) / fromHome;
          vz = (reserveCenter.z - animal.z) / fromHome;
        }
        animal.x += vx * 6.2 * step;
        animal.z += vz * 6.2 * step;
        animal.fleeTimer = Math.max(0, animal.fleeTimer - step);
        if (animal.fleeTimer === 0) animal.fleeing = false;
        animal.yaw = Math.atan2(vx, vz);
      } else {
        const angle = clock.elapsedTime * (animal.speed || .22) + animal.phase;
        const targetX = animal.homeX + Math.cos(angle) * (animal.wanderX || .8);
        const targetZ = animal.homeZ + Math.sin(angle * .78) * (animal.wanderZ || .6);
        animal.x += (targetX - animal.x) * Math.min(1, step * .55);
        animal.z += (targetZ - animal.z) * Math.min(1, step * .55);
        animal.yaw = Math.atan2(targetX - animal.x, targetZ - animal.z);
      }
    } else if (isSquirrel) {
      if (animal.fleeTimer > 0 && animal.jumpFrom && animal.jumpTo) {
        const duration = 1.15;
        animal.jumpProgress = Math.min(1, (animal.jumpProgress || 0) + step / duration);
        const t = animal.jumpProgress;
        animal.x = THREE.MathUtils.lerp(animal.jumpFrom.x, animal.jumpTo.x, t);
        animal.z = THREE.MathUtils.lerp(animal.jumpFrom.z, animal.jumpTo.z, t);
        animal.y = THREE.MathUtils.lerp(animal.jumpFrom.y, animal.jumpTo.y, t) + Math.sin(t * Math.PI) * 1.45;
        animal.yaw = Math.atan2(animal.jumpTo.x - animal.jumpFrom.x, animal.jumpTo.z - animal.jumpFrom.z);
        animal.fleeTimer = Math.max(0, animal.fleeTimer - step);
        if (t >= 1) {
          animal.jumpProgress = 0;
          animal.jumpFrom = null;
          animal.jumpTo = null;
          animal.fleeing = false;
          animal.y = animal.perches?.[animal.perchIndex]?.y || 2.35;
        }
      } else {
        const sway = clock.elapsedTime * .8 + animal.phase;
        animal.x = animal.homeX + Math.cos(sway) * .12;
        animal.z = animal.homeZ + Math.sin(sway * .75) * .1;
        animal.y = animal.homeY + Math.sin(sway * 1.6) * .055;
      }
    } else if (!animal.mounted) {
      motion.current.angle += step * (animal.speed || .3);
      const a = motion.current.angle;
      animal.x = animal.homeX + Math.cos(a) * (animal.wanderX || .55);
      animal.z = animal.homeZ + Math.sin(a * .82) * (animal.wanderZ || .48);
      animal.yaw = Math.atan2(-Math.sin(a) * (animal.wanderX || .55), Math.cos(a * .82) * .82 * (animal.wanderZ || .48));
    }

    root.current.position.set(animal.x, animal.y ?? .02, animal.z);
    root.current.rotation.y = animal.yaw || 0;
    const moving = !!animal.fleeing || animal.mounted || (!isSquirrel && !isDeer && Math.abs(Math.sin(clock.elapsedTime * .4 + animal.phase)) > .22);
    const stride = moving ? Math.sin(clock.elapsedTime * (isDeer ? 12 : 9) + animal.phase) * (isDeer ? .42 : .3) : 0;
    legs.current.forEach((leg, i) => { if (leg) leg.rotation.x = stride * (i % 2 ? -1 : 1); });
    if (head.current) {
      head.current.rotation.y = Math.sin(clock.elapsedTime * .7 + animal.phase) * (isDeer ? .1 : .16);
      head.current.rotation.x = Math.sin(clock.elapsedTime * .9 + animal.phase) * .055;
    }
    if (tail.current) {
      tail.current.rotation.x = isSquirrel
        ? -.24 + Math.sin(clock.elapsedTime * 2.2 + animal.phase) * .19
        : isCat ? -.22 + Math.sin(clock.elapsedTime * 2.1 + animal.phase) * .16
          : Math.sin(clock.elapsedTime * 3.1 + animal.phase) * .19;
      tail.current.rotation.z = Math.sin(clock.elapsedTime * 2.2 + animal.phase) * .12;
    }
  });

  const legPositions = isDuck || isBird
    ? [[-.13, .31, .08], [.13, .31, .08]]
    : [[-.18, isDeer ? .62 : isSquirrel ? .35 : .39, .32], [.18, isDeer ? .62 : isSquirrel ? .35 : .39, .32], [-.18, isDeer ? .62 : isSquirrel ? .35 : .39, -.42], [.18, isDeer ? .62 : isSquirrel ? .35 : .39, -.42]];
  const bodyScale = isDeer ? [.31, .35, .66] : isRabbit ? [.3, .27, .4] : isSquirrel ? [.17, .22, .22] : isDuck ? [.3, .31, .45] : isBird ? [.19, .18, .3] : isCat ? [.23, .23, .48] : [.29, .29, .53];
  const headPosition = isDeer ? [0, 1.45, .63] : isDuck ? [0, 1.0, .27] : isBird ? [0, .64, .25] : isSquirrel ? [0, .76, .19] : isRabbit ? [0, .86, .39] : [0, .91, .56];
  const headScale = isDeer ? [.17, .2, .23] : isDuck ? [.16, .16, .17] : isBird ? [.12, .12, .13] : isRabbit ? [.21, .19, .2] : isSquirrel ? [.135, .15, .15] : [.2, .2, .22];

  return h("group", { ref: root, position: [animal.x, animal.y ?? .02, animal.z], scale },
    h("mesh", { position: [0, isDeer ? .83 : isSquirrel ? .49 : .62, 0], castShadow: true, receiveShadow: true, material: coat, scale: bodyScale },
      h("sphereGeometry", { args: [1, 32, 24] })
    ),
    isDeer && h("mesh", { position: [0, .86, -.37], material: coat, scale: [.29, .32, .36], castShadow: true },
      h("sphereGeometry", { args: [1, 28, 20] })
    ),
    !isBird && !isDuck && h("mesh", { position: [0, isDeer ? .58 : .43, .12], material: belly, scale: isDeer ? [.23, .2, .4] : [.205, .16, .38] },
      h("sphereGeometry", { args: [1, 20, 14] })
    ),
    isDeer && h("group", { position: [0, 1.03, .39], rotation: [-.38, 0, 0] },
      h("mesh", { position: [0, .18, .04], material: coat, scale: [.155, .37, .17], castShadow: true },
        h("capsuleGeometry", { args: [.14, .34, 7, 18] })
      ),
      h("mesh", { position: [0, .35, .08], material: belly, scale: [.105, .22, .12] },
        h("sphereGeometry", { args: [1, 20, 14] })
      )
    ),
    h("group", { ref: head, position: headPosition },
      h("mesh", { material: coat, scale: headScale, castShadow: true }, h("sphereGeometry", { args: [1, 28, 20] })),
      h("mesh", { position: [0, isDeer ? -.075 : -.07, isDeer ? .2 : .16], material: isDeer ? cream : belly, scale: isDeer ? [.105, .075, .14] : isBird ? [.055, .045, .1] : isDuck ? [.075, .055, .16] : [.11, .08, .14] },
        h("sphereGeometry", { args: [1, 18, 12] })
      ),
      isDeer && h("mesh", { position: [0, -.105, .3], material: nose, scale: [.042, .03, .028] }, h("sphereGeometry", { args: [1, 14, 10] })),
      ...[-1, 1].flatMap((side) => [
        h("mesh", { key: "eye-" + side, position: [side * (isDeer ? .135 : isBird ? .085 : .112), isDeer ? .035 : .025, isDeer ? .12 : isBird ? .085 : .12], material: EYE, scale: isDeer ? [.022, .03, .018] : [.027, .033, .025] }, h("sphereGeometry", { args: [1, 14, 10] })),
        h("mesh", { key: "eye-glint-" + side, position: [side * (isDeer ? .135 : .112) - .006, .035, isDeer ? .137 : .14], material: CREAM, scale: [.006, .008, .004] }, h("sphereGeometry", { args: [1, 10, 8] }))
      ]),
      ...(isRabbit ? [-1, 1].map((side) => h("mesh", { key: "ear-" + side, position: [side * .105, .27, -.015], rotation: [side * .1, 0, side * -.13], material: coat, scale: [.075, .28, .07] }, h("sphereGeometry", { args: [1, 16, 12] })) : []),
      ...(isCat || isSquirrel ? [-1, 1].map((side) => h("group", { key: "ear-" + side, position: [side * (isSquirrel ? .095 : .13), .14, -.025] },
        h("mesh", { material: coat, position: [0, .045, 0], scale: isSquirrel ? [.055, .095, .055] : [.075, .11, .065] }, h("coneGeometry", { args: [.1, .22, 7] })),
        h("mesh", { material: PINK, position: [0, .05, .047], scale: [.028, .055, .014] }, h("sphereGeometry", { args: [1, 12, 8] }))
      )) : []),
      isDeer && [-1, 1].map((side) => h("group", { key: "antler-" + side, position: [side * .115, .18, -.055], rotation: [0, 0, side * -.12] },
        h("mesh", { position: [side * .035, .16, 0], rotation: [0, 0, side * -.1], material: fur("#76563b") }, h("cylinderGeometry", { args: [.012, .022, .34, 8] })),
        h("mesh", { position: [side * .095, .27, 0], rotation: [0, 0, side * -.55], material: fur("#76563b") }, h("cylinderGeometry", { args: [.009, .015, .21, 7] })),
        h("mesh", { position: [side * -.025, .34, 0], rotation: [0, 0, side * .4], material: fur("#76563b") }, h("cylinderGeometry", { args: [.008, .014, .18, 7] }))
      )),
      isDuck && h("mesh", { position: [0, -.04, .25], material: ORANGE, scale: [.09, .045, .15] }, h("sphereGeometry", { args: [1, 14, 10] }))
    ),
    isSquirrel && h("group", { ref: tail, position: [0, .48, -.2] },
      h("mesh", { position: [0, .17, -.04], rotation: [-.42, 0, -.18], material: coat, scale: [.17, .27, .14], castShadow: true }, h("sphereGeometry", { args: [1, 24, 18] })),
      h("mesh", { position: [0, .39, -.16], rotation: [-.5, 0, .08], material: coat, scale: [.19, .27, .15], castShadow: true }, h("sphereGeometry", { args: [1, 24, 18] })),
      h("mesh", { position: [0, .57, -.19], rotation: [-.25, 0, 0], material: cream, scale: [.12, .14, .1] }, h("sphereGeometry", { args: [1, 18, 14] }))
    ),
    isDeer && h("group", { ref: tail, position: [0, .86, -.62] },
      h("mesh", { position: [0, -.04, -.06], material: coat, scale: [.085, .11, .15] }, h("sphereGeometry", { args: [1, 18, 12] })),
      h("mesh", { position: [0, -.1, -.13], material: cream, scale: [.075, .09, .09] }, h("sphereGeometry", { args: [1, 16, 12] }))
    ),
    !isSquirrel && !isDeer && !isBird && h("group", { ref: tail, position: [0, .69, -.49] },
      h("mesh", { material: isFox ? fur("#bd7042") : coat, scale: isRabbit ? [.11, .12, .16] : [.09, .12, isCat ? .46 : .29], rotation: [isCat ? -.55 : -.16, 0, 0] },
        h("sphereGeometry", { args: [1, 18, 14] })
      )
    ),
    ...legPositions.map((position, i) => h(AnimalLeg, { key: "leg-" + i, position, material: isDuck ? ORANGE : darkCoat, length: legLength, width: legWidth, refValue: (node) => { legs.current[i] = node; } })),
    isRabbit && h("mesh", { position: [0, .48, -.38], material: CREAM, scale: [.105, .1, .09] }, h("sphereGeometry", { args: [1, 14, 10] })),
    isDeer && h("mesh", { position: [0, 1.02, -.48], material: cream, scale: [.12, .13, .12] }, h("sphereGeometry", { args: [1, 16, 12] }))
  );
}

function AnimalLeg({ position, material, refValue, length = .42, width = .075 }) {
  return h("group", { ref: refValue, position },
    h("mesh", { position: [0, -length * .48, 0], castShadow: true, material },
      h("cylinderGeometry", { args: [width * .72, width, length, 10] })
    ),
    h("mesh", { position: [0, -length + .02, .035], castShadow: true, material: fur("#4a3b30"), scale: [1.05, .62, 1.65] },
      h("sphereGeometry", { args: [width, 12, 9] })
    )
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

export function WildlifeReserve({ reserve, playerPositionRef, wildlifeRef, completedIds = [], onMissionComplete }) {
  const notified = useRef(new Set(completedIds));
  const cx = reserve?.x || 0, cz = reserve?.z || 0;
  const perches = useMemo(() => [
    [-11, -9, 2.2], [-2.5, -10.6, 2.55], [10.7, -8.8, 2.35], [11, -1.2, 2.65],
    [-11, 4.4, 2.45], [-3.8, 11, 2.25], [4.7, 10.8, 2.65], [10.6, 9.2, 2.35],
    [-9.2, 10.2, 2.7], [.8, -11.2, 2.4], [4.8, -10.8, 2.25], [-8.8, -11, 2.55]
  ].map(([x, z, y]) => ({ x: cx + x, z: cz + z, y })), [cx, cz]);
  const animals = useMemo(() => {
    if (!reserve) return [];
    const make = (id, type, dx, dz, phase, speed, scale, color, extra = {}) => ({
      id, type, x: cx + dx, z: cz + dz, y: type === "squirrel" ? 2.4 : .02,
      homeX: cx + dx, homeZ: cz + dz, homeY: type === "squirrel" ? 2.4 : .02,
      phase, speed, scale, color, yaw: phase, fleeing: false, fleeTimer: 0, caught: false, mounted: false, ...extra
    });
    const squirrels = perches.map((perch, i) => make(
      "squirrel-" + i, "squirrel", perch.x - cx, perch.z - cz, .65 + i * .71, .32, .68 + (i % 4) * .045,
      ["#a96d3e", "#98613a", "#b77945", "#885331"][i % 4],
      { x: perch.x, y: perch.y, z: perch.z, homeX: perch.x, homeY: perch.y, homeZ: perch.z, perches, perchIndex: i }
    ));
    return [
      make("deer-a", "deer", 3.2, -7.5, .2, .22, 1.08, "#986d49", { belly: "#decdb0", dark: "#504034", wanderX: .85, wanderZ: .58 }),
      make("deer-b", "deer", 5.8, -6.2, 2.4, .19, .96, "#aa7a50", { belly: "#e1cfb1", dark: "#51402f", wanderX: .72, wanderZ: .6 }),
      make("deer-c", "deer", .3, -8.4, 4.1, .2, 1.02, "#8e6442", { belly: "#d9c7aa", dark: "#49382b", wanderX: .7, wanderZ: .55 }),
      make("duck-a", "duck", -7.8, -2.8, 1.4, .18, .88, "#596e48"),
      make("duck-b", "duck", -6.5, -3.4, 3.4, .16, .82, "#70593e"),
      make("duck-c", "duck", -8.4, -.6, 5.4, .19, .86, "#66734f"),
      make("rabbit-a", "rabbit", 1.5, 1.5, 2.1, .5, .8, "#b9a58e", { belly: "#e0d4c2" }),
      make("rabbit-b", "rabbit", 4.2, 2.5, 4.3, .46, .72, "#857768", { belly: "#d8cabb" }),
      make("fox-a", "fox", -9.4, 6.5, 1.8, .31, .88, "#b96c38", { belly: "#ead8c0", dark: "#5b3a28" }),
      make("cat-a", "cat", -1.5, 9, 4.8, .29, .78, "#6c6660", { belly: "#c6c0b5" }),
      make("dog-a", "dog", 8.6, 8.6, .8, .34, .88, "#b88d60", { belly: "#e1d1b5" }),
      make("pigeon-a", "pigeon", -1.5, 4, 1.1, .72, .68, "#7b8587", { dark: "#59666b" }),
      make("pigeon-b", "pigeon", 1, 4.8, 4.1, .68, .62, "#8a9290", { dark: "#687477" }),
      ...squirrels
    ];
  }, [reserve, cx, cz, perches]);
  useEffect(() => {
    if (!wildlifeRef) return undefined;
    wildlifeRef.current.animals = animals;
    wildlifeRef.current.reserveCenter = { x: cx, z: cz };
    return () => {
      if (wildlifeRef.current.animals === animals) wildlifeRef.current.animals = [];
    };
  }, [wildlifeRef, animals, cx, cz]);
  useEffect(() => { notified.current = new Set(completedIds); }, [completedIds]);
  useFrame(() => {
    if (!reserve) return;
    const player = playerPositionRef.current;
    if (!player || player.mode !== "walk") return;
    for (const mission of WILDLIFE_MISSIONS) {
      if (mission.type !== "visit" || completedIds.includes(mission.id) || notified.current.has(mission.id)) continue;
      const dx = player.x - (cx + mission.dx), dz = player.z - (cz + mission.dz);
      if (dx * dx + dz * dz <= mission.radius * mission.radius) {
        notified.current.add(mission.id);
        onMissionComplete(mission.id);
      }
    }
  });

  if (!reserve) return null;
  return h(React.Fragment, null,
    h("group", null,
      h("mesh", { position: [cx, .012, cz], rotation: [-Math.PI / 2, 0, 0], material: GRASS, receiveShadow: true },
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
    ...animals.map((animal) => h(CityAnimal, { key: animal.id, animal, playerPositionRef, reserveCenter: { x: cx, z: cz } })),
    ...WILDLIFE_MISSIONS.filter((mission) => mission.type === "visit" && !completedIds.includes(mission.id)).map((mission) =>
      h(MissionBeacon, { key: mission.id, x: cx + mission.dx, z: cz + mission.dz })
    ),
    h("group", { position: [0, .3, -470] },
      h("mesh", { position: [0, 1.45, 0], material: WOOD }, h("cylinderGeometry", { args: [.075, .11, 2.9, 10] })),
      h("mesh", { position: [.54, 2.45, 0], material: fur("#d9e2d7") }, h("boxGeometry", { args: [1.05, .7, .045] })),
      h("mesh", { position: [.54, 2.45, .028], material: fur(completedIds.includes("island") ? "#d9b24c" : "#577b50") }, h("planeGeometry", { args: [.9, .56] }))
    ),
    !completedIds.includes("island") ? h(MissionBeacon, { x: 5, z: -470 }) : null
  );
}
