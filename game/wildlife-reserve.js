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
  { id: "deer-ride", title: "רכיבה על אייל", description: "התכופפו עם C, התקרבו לאייל בשקט, לחצו F כדי לעלות עליו ורכבו לפחות 8 שניות.", location: "קרחת האיילים בשמורת הטבע", type: "deerRide", points: 400 },
  { id: "squirrel-catch", title: "תפיסת סנאי", description: "התכופפו עם C, התקרבו לבסיס העץ כשהסנאי נח על ענף, ולחצו F כדי לתפוס אותו בעדינות.", location: "חורשת הסנאים בשמורת הטבע", type: "squirrel", points: 300 },
  { id: "bird-lookout", title: "מצפור הציפורים", description: "עלו למצפור העץ שבקצה השמורה והגיעו לסמן הזהוב.", location: "מצפור העץ בשמורה", type: "visit", dx: 8, dz: 6, radius: 3.8, points: 180 },
  { id: "island", title: "כיבוש אי הדקלים", description: "הגיעו לאי הדקלים, מצאו את הדגל ולחצו F כדי לתבוע בעלות על האי.", location: "אי הדקלים, מצפון לעיר", type: "island", x: 0, z: -470, radius: 7, points: 600 },
  { id: "deer-guardian", title: "שומר האיילים", description: "התכופפו עם C, התקרבו לקרחת האיילים והישארו ליד שלושת האיילים במשך 7 שניות בלי להבהיל אותם.", location: "קרחת האיילים בשמורת הטבע", type: "deerGuard", dx: 4.3, dz: -8.3, points: 320 },
  { id: "birdhouses", title: "בית לציפורים", description: "מצאו שלושה בתי ציפורים ברחבי השמורה והתקרבו לכל אחד מהם כדי לבדוק אותו.", location: "חורשת בתי הציפורים בשמורת הטבע", type: "birdhouses", dx: -11, dz: -9, points: 260 },
  { id: "secret-stream", title: "בעקבות הנחל", description: "עקבו אחרי הנחל, עברו על גשר העץ והמשיכו עד למפל הנסתר.", location: "הנחל והגשר בשמורת הטבע", type: "stream", dx: -5, dz: 12, points: 300 },
  { id: "secret-lighthouse", title: "המגדלור הסודי", description: "הפליגו לאי הדקלים, מצאו את המגדלור וטפסו במדרגות עד למרפסת האור בראשו.", location: "אי הדקלים, מצפון לעיר", type: "lighthouse", points: 500 },
  { id: "buoy-course", title: "מסלול המצופים", description: "הפליגו בסירה דרך חמשת המצופים לפי הסדר, מהמצוף הראשון ועד החמישי.", location: "הים שמקיף את אי הדקלים", type: "buoys", points: 380 },
  { id: "city-observation", title: "תצפית העיר", description: "הגיעו לגג הבניין הגבוה ביותר בעיר, מצאו את הטלסקופ והסימון הסודי.", location: "מרפסת התצפית על גג המגדל הגבוה בעיר", type: "observation", points: 340 },
  { id: "cable-journey", title: "מסע הרכבל", description: "עלו לרכבל ובקרו בשלוש תחנות רכבל שונות במהלך הנסיעה.", location: "שלוש תחנות לאורך קו הרכבל", type: "cableTour", points: 300 }
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
    const detectionRange = (isDeer ? (crouched ? 1.55 : 10.5) : isSquirrel ? (crouched ? 1.35 : 7.2) : 3.4) * (player?.camouflage ? .72 : 1);

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
      ...(isRabbit ? [-1, 1].map((side) => h("mesh", { key: "ear-" + side, position: [side * .105, .27, -.015], rotation: [side * .1, 0, side * -.13], material: coat, scale: [.075, .28, .07] }, h("sphereGeometry", { args: [1, 16, 12] }))) : []),
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
    isDeer && h("mesh", { position: [0, 1.02, -.48], material: cream, scale: [.12, .13, .12] }, h("sphereGeometry", { args: [1, 16, 12] })),
    isDeer && animal.mounted && h("group", { position: [0, 1.16, -.02] },
      h("mesh", { position: [0, .035, 0], material: fur("#69482f"), scale: [.28, .055, .38] }, h("sphereGeometry", { args: [1, 18, 12] })),
      ...[-1, 1].map((side) => h("mesh", { key: "saddle-strap-" + side, position: [side * .19, -.08, .02], rotation: [0, 0, side * -.18], material: fur("#503925") }, h("boxGeometry", { args: [.045, .18, .42] })))
    )
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

const STREAM_WATER = new THREE.MeshPhysicalMaterial({ color: "#49aebe", roughness: .16, metalness: .04, transparent: true, opacity: .78, clearcoat: 1, clearcoatRoughness: .08, side: THREE.DoubleSide, depthWrite: false });
const BIRDHOUSE_WOOD = fur("#936a43");
const BIRDHOUSE_ROOF = fur("#b45f43");
const BIRDHOUSE_HOLE = fur("#292d2a");

function Birdhouse({ x, z, index }) {
  const bird = useRef(null), wings = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + index * 1.7;
    if (bird.current) { bird.current.position.y = 4.28 + Math.sin(t * 2.1) * .045; bird.current.rotation.y = Math.sin(t * .8) * .18; }
    wings.current.forEach((wing, i) => { if (wing) wing.rotation.z = (i ? 1 : -1) * (.08 + Math.sin(t * 7.5) * .3); });
  });
  return h("group", { position: [x, 0, z] },
    h("mesh", { position: [0, 3.45, -.12], material: BIRDHOUSE_WOOD, castShadow: true }, h("boxGeometry", { args: [.13, 1.35, .15] })),
    h("mesh", { position: [0, 3.92, .1], material: BIRDHOUSE_WOOD, castShadow: true }, h("boxGeometry", { args: [.88, .82, .68] })),
    h("mesh", { position: [0, 4.4, .1], material: BIRDHOUSE_ROOF, castShadow: true }, h("coneGeometry", { args: [.72, .5, 4] })),
    h("mesh", { position: [0, 3.99, .45], material: BIRDHOUSE_HOLE }, h("circleGeometry", { args: [.13, 20] })),
    h("mesh", { position: [0, 3.72, .53], material: BIRDHOUSE_WOOD }, h("cylinderGeometry", { args: [.035, .035, .34, 8] })),
    h("group", { ref: bird, position: [0, 4.28, .66] },
      h("mesh", { material: fur(index === 1 ? "#6f9b88" : "#d2a25c"), scale: [.19, .14, .24], castShadow: true }, h("sphereGeometry", { args: [1, 16, 12] })),
      h("mesh", { position: [0, .13, .14], material: CREAM, scale: [.105, .1, .12] }, h("sphereGeometry", { args: [1, 12, 10] })),
      h("mesh", { position: [0, .04, .28], material: ORANGE, rotation: [Math.PI / 2, 0, 0] }, h("coneGeometry", { args: [.06, .18, 6] })),
      ...[-1, 1].map((side, i) => h("mesh", { key: "wing-" + side, ref: (node) => { wings.current[i] = node; }, position: [side * .17, .02, -.02], rotation: [0, 0, side * .12], material: fur("#547b70"), scale: [.2, .055, .2] }, h("sphereGeometry", { args: [1, 12, 8] })))
    )
  );
}

function Waterfall({ x, z }) {
  const sheet = useRef(null), droplets = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (sheet.current) { sheet.current.material.opacity = .68 + Math.sin(t * 4.2) * .08; sheet.current.position.x = x + Math.sin(t * 2.4) * .025; }
    droplets.current.forEach((drop, i) => {
      if (!drop) return;
      const phase = (t * 1.7 + i * .21) % 1;
      drop.position.y = 3.65 - phase * 3.1;
      drop.position.x = x - .95 + (i % 5) * .46 + Math.sin(t * 3 + i) * .08;
      drop.visible = phase < .96;
      drop.scale.setScalar(.65 + Math.sin(t * 8 + i) * .14);
    });
  });
  return h("group", null,
    h("mesh", { position: [x, .25, z], material: STONE, scale: [2.6, .75, 1.65], castShadow: true }, h("dodecahedronGeometry", { args: [1, 1] })),
    h("mesh", { position: [x - 1.8, .45, z + .35], material: STONE, scale: [1.35, .62, 1.25], castShadow: true }, h("dodecahedronGeometry", { args: [1, 1] })),
    h("mesh", { ref: sheet, position: [x, 1.95, z + .82], material: STREAM_WATER }, h("planeGeometry", { args: [3.35, 3.8, 10, 16] })),
    ...Array.from({ length: 12 }, (_, i) => h("mesh", { key: "fall-drop-" + i, ref: (node) => { droplets.current[i] = node; }, position: [x, 3.2, z + 1.04], material: STREAM_WATER }, h("sphereGeometry", { args: [.055 + (i % 3) * .018, 8, 7] }))),
    h("mesh", { position: [x, .09, z + 1.85], rotation: [-Math.PI / 2, 0, 0], material: WATER, scale: [2.2, 1.12, 1] }, h("circleGeometry", { args: [1, 36] })),
    ...[-1, 1].map((side) => h("mesh", { key: "fall-rock-" + side, position: [x + side * 2.05, .55, z + .65], material: STONE, scale: [.9, .72, .8], castShadow: true }, h("dodecahedronGeometry", { args: [.9, 1] })))
  );
}

function StreamAndBirdhouses({ cx, cz, reserveScale }) {
  const route = [[-5, 12], [-5, -2], [0, -5], [6, -8], [12, -10]];
  const stream = route.slice(0, -1).map(([x1, z1], i) => {
    const [x2, z2] = route[i + 1], dx = x2 - x1, dz = z2 - z1;
    return h("mesh", {
      key: "stream-ribbon-" + i,
      position: [cx + (x1 + x2) / (2 * reserveScale), .105, cz + (z1 + z2) / (2 * reserveScale)],
      rotation: [-Math.PI / 2, 0, Math.atan2(dx, dz)],
      material: STREAM_WATER
    }, h("planeGeometry", { args: [1.8 / reserveScale, Math.hypot(dx, dz) / reserveScale] }));
  });
  const houses = [[-11, -9], [10.7, -8.8], [4.7, 10.8]].map(([dx, dz], index) =>
    h(Birdhouse, { key: "birdhouse-" + index, x: cx + dx / reserveScale, z: cz + dz / reserveScale, index })
  );
  return h(React.Fragment, null,
    ...stream,
    h(Waterfall, { x: cx + 12 / reserveScale, z: cz - 10 / reserveScale }),
    ...houses
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
  const cx = reserve?.x || 0, cz = reserve?.z || 0, reserveScale = 2.05;
  const perches = useMemo(() => [
    [-11.0, -9.0, 2.7], [-8.8, -11.0, 2.9], [-2.5, -10.6, 2.8],
    [4.8, -10.8, 2.8], [10.7, -8.8, 2.7], [11.0, -1.2, 2.8],
    [-11.0, 4.4, 2.8], [-9.2, 10.2, 2.7], [-3.8, 11.0, 2.8],
    [4.7, 10.8, 2.9], [10.6, 9.2, 2.8], [0.8, -11.2, 2.7]
  ].map(([x, z, y]) => ({ x: cx + x, z: cz + z, y })), [cx, cz]);
  const animals = useMemo(() => {
    if (!reserve) return [];
    const make = (id, type, dx, dz, phase, speed, scale, color, extra = {}) => ({
      id, type, x: cx + dx * reserveScale, z: cz + dz * reserveScale, y: type === "squirrel" ? 2.9 : .02,
      homeX: cx + dx * reserveScale, homeZ: cz + dz * reserveScale, homeY: type === "squirrel" ? 2.9 : .02,
      phase, speed, scale, color, yaw: phase, fleeing: false, fleeTimer: 0, caught: false, mounted: false, ...extra
    });
    const squirrels = perches.map((perch, i) => make(
      "squirrel-" + i, "squirrel", perch.x - cx, perch.z - cz, .65 + i * .71, .32, .68 + (i % 4) * .045,
      ["#a96d3e", "#98613a", "#b77945", "#885331"][i % 4],
      { x: perch.x, y: perch.y, z: perch.z, homeX: perch.x, homeY: perch.y, homeZ: perch.z, perches, perchIndex: i }
    ));
    return [
      make("deer-a", "deer", 4, -8, .2, .22, 1.22, "#986d49", { belly: "#decdb0", dark: "#504034", wanderX: 1.5, wanderZ: 1.2 }),
      make("deer-b", "deer", 7, -7, 2.4, .19, 1.14, "#aa7a50", { belly: "#e1cfb1", dark: "#51402f", wanderX: 1.4, wanderZ: 1.1 }),
      make("deer-c", "deer", 2, -10, 4.1, .2, 1.18, "#8e6442", { belly: "#d9c7aa", dark: "#49382b", wanderX: 1.3, wanderZ: 1.1 }),
      make("deer-d", "deer", 10, -6, 5.3, .18, 1.12, "#b98558", { belly: "#e6d5b8", dark: "#5a4634", wanderX: 1.2, wanderZ: 1.0 }),
      make("duck-a", "duck", -5, -1, 1.4, .18, 1.0, "#596e48"),
      make("duck-b", "duck", -7, -2, 3.4, .16, .96, "#70593e"),
      make("duck-c", "duck", -4, -3, 5.4, .19, 1.0, "#66734f"),
      make("duck-d", "duck", -6, 0, 6.2, .17, .94, "#9a8a54"),
      make("rabbit-a", "rabbit", 4, 5, 2.1, .5, .94, "#b9a58e", { belly: "#e0d4c2" }),
      make("rabbit-b", "rabbit", 8, 6, 4.3, .46, .9, "#857768", { belly: "#d8cabb" }),
      make("rabbit-c", "rabbit", -2, 7, 3.2, .42, .92, "#d0c5b4", { belly: "#ece2d2" }),
      make("rabbit-d", "rabbit", 7, 10, 5.1, .44, .9, "#a99783", { belly: "#e4d9c9" }),
      make("fox-a", "fox", -8, 5, 1.8, .31, 1.0, "#b96c38", { belly: "#ead8c0", dark: "#5b3a28" }),
      make("fox-b", "fox", 10, 8, 3.8, .28, .96, "#c57b45", { belly: "#f0dfc9", dark: "#5b3a28" }),
      make("cat-a", "cat", -6, 10, 4.8, .29, .9, "#6c6660", { belly: "#c6c0b5" }),
      make("dog-a", "dog", 6, 11, .8, .34, .98, "#b88d60", { belly: "#e1d1b5" }),
      make("pigeon-a", "pigeon", -3, 8, 1.1, .72, .8, "#7b8587", { dark: "#59666b" }),
      make("pigeon-b", "pigeon", 2, 10, 4.1, .68, .76, "#8a9290", { dark: "#687477" }),
      make("pigeon-c", "pigeon", 8, -8, 2.7, .7, .78, "#8c9897", { dark: "#687477" }),
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
  const extraProgress = useRef({ deerHold: 0, birdhouses: new Set(), streamStep: 0, lastCompletedCount: completedIds.length });
  useFrame((_, dt) => {
    if (!reserve) return;
    const player = playerPositionRef.current;
    if (!player) return;
    if (completedIds.length < extraProgress.current.lastCompletedCount) {
      extraProgress.current.deerHold = 0;
      extraProgress.current.birdhouses.clear();
      extraProgress.current.streamStep = 0;
    }
    extraProgress.current.lastCompletedCount = completedIds.length;
    if (player.mode !== "walk") return;

    for (const mission of WILDLIFE_MISSIONS) {
      if (mission.type !== "visit" || completedIds.includes(mission.id) || notified.current.has(mission.id)) continue;
      const dx = player.x - (cx + mission.dx * reserveScale), dz = player.z - (cz + mission.dz * reserveScale);
      if (dx * dx + dz * dz <= (mission.radius || 4.2) ** 2) {
        notified.current.add(mission.id);
        onMissionComplete?.(mission.id);
      }
    }

    if (!completedIds.includes("deer-guardian") && !notified.current.has("deer-guardian")) {
      const deer = (wildlifeRef?.current?.animals || []).filter((animal) => animal.type === "deer" && !animal.mounted);
      const calmGroup = player.sneaking && deer.length >= 3 && deer.slice(0, 3).every((animal) => {
        const distance = Math.hypot(player.x - animal.x, player.z - animal.z);
        return distance < 11.5 && distance > 1.65 && !animal.fleeing;
      });
      extraProgress.current.deerHold = calmGroup ? extraProgress.current.deerHold + Math.min(dt, .05) : 0;
      if (extraProgress.current.deerHold >= 7) {
        notified.current.add("deer-guardian");
        onMissionComplete?.("deer-guardian");
      }
    }

    if (!completedIds.includes("birdhouses") && !notified.current.has("birdhouses")) {
      [[-11, -9], [10.7, -8.8], [4.7, 10.8]].forEach(([dx, dz], index) => {
        if (Math.hypot(player.x - (cx + dx), player.z - (cz + dz)) < 5.2) extraProgress.current.birdhouses.add(index);
      });
      if (extraProgress.current.birdhouses.size === 3) {
        notified.current.add("birdhouses");
        onMissionComplete?.("birdhouses");
      }
    }

    if (!completedIds.includes("secret-stream") && !notified.current.has("secret-stream")) {
      const streamSteps = [[-5, 12, 5.0], [-5, -2, 4.8], [12, -10, 5.4]];
      const step = streamSteps[extraProgress.current.streamStep];
      if (step && Math.hypot(player.x - (cx + step[0] * reserveScale), player.z - (cz + step[1] * reserveScale)) < step[2]) {
        extraProgress.current.streamStep += 1;
        if (extraProgress.current.streamStep === streamSteps.length) {
          notified.current.add("secret-stream");
          onMissionComplete?.("secret-stream");
        }
      }
    }
  });

  if (!reserve) return null;
  return h(React.Fragment, null,
    h("group", { scale: [reserveScale, 1, reserveScale], position: [cx * (1 - reserveScale), 0, cz * (1 - reserveScale)] },
      h("mesh", { position: [cx, .012, cz], rotation: [-Math.PI / 2, 0, 0], material: GRASS, receiveShadow: true },
        h("planeGeometry", { args: [40, 40] })
      ),
      h("mesh", { position: [cx + 8, .025, cz - 9], rotation: [-Math.PI / 2, 0, -.18], scale: [9.5, 6.5, 1], material: fur("#9bb873"), receiveShadow: true },
        h("circleGeometry", { args: [1, 56] })
      ),
      h("mesh", { position: [cx + 8, .045, cz - 9], rotation: [-Math.PI / 2, 0, -.18], scale: [2.15, 1.12, 1], material: STONE },
        h("circleGeometry", { args: [1, 36] })
      ),
      h("mesh", { position: [cx + 8, .075, cz - 9], rotation: [-Math.PI / 2, 0, -.18], scale: [1.82, .82, 1], material: WATER },
        h("circleGeometry", { args: [1, 36] })
      ),
      ...[
        [-14, 13, -8, 6], [-8, 6, -5, -1], [-5, -1, 1, -6],
        [1, -6, 8, -9], [0, 4, 7, 6], [7, 6, 11, 10], [-1, 8, -5, 9]
      ].map(([x1, z1, x2, z2], i) => {
        const dx = x2 - x1, dz = z2 - z1;
        return h("mesh", {
          key: "connected-trail-" + i,
          position: [cx + (x1 + x2) / 2, .022, cz + (z1 + z2) / 2],
          rotation: [-Math.PI / 2, 0, Math.atan2(dx, dz)],
          material: PATH
        }, h("planeGeometry", { args: [1.45, Math.hypot(dx, dz)] }));
      }),
      h("group", { position: [cx - 14, .02, cz + 13], rotation: [0, .42, 0] },
        h("mesh", { position: [0, 1.3, 0], material: WOOD }, h("cylinderGeometry", { args: [.1, .13, 2.6, 8] })),
        h("mesh", { position: [2.6, 1.3, 0], material: WOOD }, h("cylinderGeometry", { args: [.1, .13, 2.6, 8] })),
        h("mesh", { position: [1.3, 2.35, 0], material: WOOD }, h("boxGeometry", { args: [2.9, .2, .3] })),
        h("mesh", { position: [1.3, 1.9, .04], material: fur("#4d7850") }, h("boxGeometry", { args: [2.65, .7, .12] })),
        h("mesh", { position: [1.3, 1.9, .12], material: FLOWER }, h("circleGeometry", { args: [.18, 18] }))
      ),
      ...[[-17, -14, 7.2, 1.25, 5.5], [18, -17, 8.4, 1.55, 6.5], [-20, 17, 9.5, 1.7, 7.2], [18, 18, 7.8, 1.35, 6.2]].map(([dx, dz, sx, sy, sz], i) =>
        h("mesh", { key: "meadow-hill-" + i, position: [cx + dx, -1.15, cz + dz], scale: [sx, sy, sz], material: fur(i % 2 ? "#91b873" : "#a0c17b"), castShadow: true, receiveShadow: true },
          h("icosahedronGeometry", { args: [1, 2] })
        )
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
      h("group", { position: [cx + 8, .04, cz + 6], scale: [1.15, 1.15, 1.15], rotation: [0, -.25, 0] },
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
      }),
      h(StreamAndBirdhouses, { cx, cz, reserveScale })
    ),
    h("group", { position: [cx - 5, .18, cz - 2] },
      h("mesh", { position: [0, 0, 0], material: WOOD, castShadow: true }, h("boxGeometry", { args: [7.8, .2, 1.35] })),
      ...Array.from({ length: 9 }, (_, i) => h("mesh", { key: "bridge-plank-" + i, position: [-3.35 + i * .84, .12, .04], material: i % 2 ? WOOD : STONE }, h("boxGeometry", { args: [.055, .08, 1.42] }))),
      ...[-1, 1].flatMap((side) => [
        h("mesh", { key: "bridge-post-" + side, position: [side * 3.65, .75, 0], material: WOOD }, h("cylinderGeometry", { args: [.08, .1, 1.25, 8] })),
        h("mesh", { key: "bridge-rail-" + side, position: [side * 3.65, 1.28, 0], material: WOOD }, h("boxGeometry", { args: [.14, .13, 1.35] }))
      ])
    ),
    h("group", { position: [cx - 9.2, .04, cz - 2.2] },
      h("mesh", { position: [0, .85, 0], material: STONE, scale: [1.2, .9, .9] }, h("dodecahedronGeometry", { args: [1.65, 1] })),
      h("mesh", { position: [0, 1.65, .38], material: fur("#55aebd"), scale: [1.05, 1.8, .08] }, h("planeGeometry", { args: [1.25, 1.75] })),
      h("mesh", { position: [0, .12, .95], material: fur("#55aebd"), rotation: [-Math.PI / 2, 0, 0] }, h("circleGeometry", { args: [1.05, 20] }))
    ),
    h("group", { position: [cx + 11, .04, cz + 10.5] },
      h("mesh", { position: [0, 1.15, 0], material: WOOD }, h("boxGeometry", { args: [4.1, .16, 3.5] })),
      ...[-1, 1].flatMap((side) => [
        h("mesh", { key: "butterfly-frame-" + side, position: [side * 1.95, 1.55, 0], material: WOOD }, h("boxGeometry", { args: [.12, 1.35, 3.4] })),
        h("mesh", { key: "butterfly-glass-" + side, position: [side * 1.88, 1.63, 0], material: new THREE.MeshPhysicalMaterial({ color: "#a7d8cf", transparent: true, opacity: .32, roughness: .18, depthWrite: false }) }, h("boxGeometry", { args: [.035, 1.12, 3.15] }))
      ]),
      h("mesh", { position: [0, 2.28, 0], material: WOOD, rotation: [0, 0, 0] }, h("boxGeometry", { args: [4.35, .16, 3.8] })),
      ...Array.from({ length: 6 }, (_, i) => h("mesh", { key: "butterfly-flower-" + i, position: [-1.4 + (i % 3) * 1.4, .42, -1.15 + Math.floor(i / 3) * 2.2], material: FLOWER }, h("sphereGeometry", { args: [.13, 8, 7] })))
    ),
    h("group", { position: [cx - 12, .04, cz + 8] },
      h("mesh", { position: [0, 1.55, 0], material: WOOD }, h("cylinderGeometry", { args: [.055, .08, 3.1, 8] })),
      h("mesh", { position: [0, 3.25, 0], material: fur("#c58a45") }, h("cylinderGeometry", { args: [.42, .48, .68, 8] })),
      h("mesh", { position: [0, 3.63, 0], material: WOOD }, h("coneGeometry", { args: [.54, .34, 8] }))
    ),
    ...animals.map((animal) => h(CityAnimal, { key: animal.id, animal, playerPositionRef, reserveCenter: { x: cx, z: cz } })),
    ...WILDLIFE_MISSIONS.filter((mission) => ["visit", "deerGuard", "birdhouses", "stream"].includes(mission.type) && !completedIds.includes(mission.id)).flatMap((mission) => {
      if (mission.type === "stream") return [
        h(MissionBeacon, { key: mission.id + "-start", x: cx - 5 * reserveScale, z: cz + 12 * reserveScale }),
        h(MissionBeacon, { key: mission.id + "-bridge", x: cx - 5 * reserveScale, z: cz - 2 * reserveScale }),
        h(MissionBeacon, { key: mission.id + "-fall", x: cx + 12 * reserveScale, z: cz - 10 * reserveScale })
      ];
      return [h(MissionBeacon, { key: mission.id, x: cx + (mission.dx || 0) * reserveScale, z: cz + (mission.dz || 0) * reserveScale })];
    }),
    h("group", { position: [0, .3, -470] },
      ...[-.9, .9].map((side) => h("mesh", { key: "island-sign-post-" + side, position: [side, 1.25, 0], material: WOOD, castShadow: true },
        h("cylinderGeometry", { args: [.085, .12, 2.5, 10] }))),
      h("mesh", { position: [0, 2.28, -.02], material: WOOD, castShadow: true }, h("boxGeometry", { args: [3.3, 1.05, .2] })),
      h("mesh", { position: [0, 2.28, .095], material: fur("#d9e2d7") }, h("boxGeometry", { args: [3.05, .8, .035] })),
      h("mesh", { position: [0, 2.28, .12], material: fur(completedIds.includes("island") ? "#d9b24c" : "#577b50") }, h("boxGeometry", { args: [2.82, .62, .025] }))
    ),
    !completedIds.includes("island") ? h(MissionBeacon, { x: 5, z: -470 }) : null
  );
}
