import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Sky } from "@react-three/drei";
import * as THREE from "three";
import { Collider, generateWorld, locate, CITY_HALF, BLOCK, GRID, CABLE_STATIONS, WALKABLE_HILLS } from "./world.js";
import { Human, poseHuman, BARBELL } from "./human.js";
import { Citizens } from "./citizens.js";
import { Helicopters } from "./helicopter.js";
import { makeHeli, stepHeli, canExitHeli } from "./heli-sim.js";
import { CityDetails } from "./CityDetails.js";
import { AnimatedWorld } from "./animated-world.js";
import { Cars } from "./cars.js";
import { makeCar, stepCar, resolveCarObstacles } from "./car-sim.js";
import { makeAirVehicle, stepAirVehicle, canExitAirVehicle, resolveAirVehicleObstacles } from "./air-vehicle-sim.js";
import { ElevatorModel } from "./elevator-system.js";
import { advanceElevatorTrip, floorHeight, makeElevatorTrip } from "./elevator-sim.js";
import { AmbientLife, QualityMonitor, StreetLights, WeatherEffects } from "./environment.js";
import { formatGameTime, getEnvironmentProfile, WEATHER_OPTIONS } from "./environment-sim.js";

const h = React.createElement;

function readMoveAxes(keys, joystick = { x: 0, y: 0 }) {
  const horizontal = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft")) + (joystick.x || 0);
  const forward = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown")) + (joystick.y || 0);
  const length = Math.hypot(horizontal, forward);
  const scale = length > 1 ? 1 / length : 1;
  return { x: horizontal * scale, z: forward * scale };
}
function cameraRelativeMove(x, forward, yaw) {
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  return { x: sin * forward - cos * x, z: cos * forward + sin * x };
}
const WALK = 4.2, RUN = 8, ACCEL = 14, GRAVITY = 24, JUMP = 8, STEP = .35, RAD = .35, HEIGHT = 1.75;
const PROMPTS = { sofa: "לשבת", swing: "להתנדנד", slide: "לגלוש במגלשה", weights: "להרים משקולות", treadmill: "להפעיל הליכון", heli: "להיכנס למסוק ולטוס", airVehicle: "להיכנס למטוס או לטסלה המעופפת", door: "לפתוח דלת", elevator: "להזמין מעלית", car: "להיכנס לרכב", cable: "לטפס לרציף הרכבל", basement: "לרדת למחסן (קומה -1)", basementExit: "לחזור לקומת הקרקע" };

function makeNpcReply(name, message, turnCount = 0, previousTopic = "", personality = "סקרן ואוהב לגלות מקומות חדשים") {
  const text = String(message || "").trim().toLocaleLowerCase("he");
  const pick = (choices) => choices[Math.abs(turnCount) % choices.length];
  if (!text) return "לא שמעתי אותך. מה רצית לשאול?";
  if (/(בוא איתי|בוא אחריי|תעקוב אחרי|תעקוב אחריי|תצטרף אלי|תצטרף אליי)/.test(text)) return "בשמחה! אתקדם אחריך ואנסה לשמור על מרחק נוח. לאן הולכים?";
  if (/(תפסיק לעקוב|אל תעקוב|תישאר כאן|תחזור לסיור|תפסיק לבוא)/.test(text)) return "בסדר גמור. אני אשאר כאן ואמשיך את הסיור שלי.";
  if (/(שלום|היי|אהלן|בוקר טוב|ערב טוב)/.test(text)) return pick(["שלום! נחמד לפגוש אותך כאן בעיר.", "אהלן! יצאתי לסיבוב קטן. מה שלומך?", "שלום! אולי ניפגש באחד הבניינים."]);
  if (/(איך קוראים לך|מה השם שלך|מי אתה)/.test(text)) return "קוראים לי " + name + ". אני תושב וירטואלי שאוהב להסתובב ולגלות מקומות בעיר.";
  if (/(אתה אמיתי|אתה בן אדם|אתה רובוט|אתה ai|בינה מלאכותית)/.test(text)) return "אני דמות AI במשחק. יש לי מסלולים, הרגלים ותגובות, ואני יכול לשוחח איתך על העיר.";
  if (/(מה אתה עושה|מה מעשיך|מה קורה|מה התוכניות שלך)/.test(text)) return "אני " + personality + ". כרגע אני מטייל בעיר ומחפש משהו מעניין לעשות.";
  if (/(איך קוראים לך|מה השם שלך)/.test(text)) return "אני " + name + ". נעים להכיר!";
  if (/(מה אפשר לעשות|מה יש כאן|מה יש בעיר|אטרקציות|לבקר)/.test(text)) return "אפשר לחקור עשרות בניינים, להיכנס לחנויות ולחדרים, לעלות במדרגות, לנסוע ברכבים, לטוס ולעלות ברכבל.";
  if (/(איפה|מיקום|בניין|קומה|מדרגות|גג)/.test(text)) return pick(["יש כאן הרבה בניינים. הדלתות מובילות ללובי, ומשם אפשר לעלות במדרגות.", "אני אוהב לעלות לקומות הגבוהות ולראות את העיר מלמעלה.", "אפשר להיכנס לבניינים ולגלות שבכל קומה יש חלל אחר."]);
  if (/(מכונית|רכב|אוטובוס|ג'יפ|חניון|מירוץ)/.test(text)) return pick(["בחניון המרכזי יש מכוניות, ג'יפ, אוטובוס ומכונית מרוץ.", "אני אוהב לעמוד ליד הכביש ולראות את התנועה. יש כאן כמה כלי רכב מעניינים.", "אפשר לבחור רכב, להיכנס אליו ולנסוע ברחובות העיר."]);
  if (/(מטוס|מסוק|טס|טיסה|טסלה|רכבל)/.test(text)) return pick(["אפשר להטיס מסוק או מטוס ולראות את העיר מלמעלה.", "הטסלה המעופפת מיוחדת מאוד. היא יכולה לעלות ולרדת באוויר.", "הרכבל עובר בין ארבע תחנות ומציע נוף יפה של כל העיר."]);
  if (/(תושב|אנשים|דמויות|תושבים|ai|בינה)/.test(text)) return pick(["לכל אחד מאיתנו יש מסלול משלו, ואנחנו יכולים לעבור בין בניינים ולפגוש תושבים אחרים.", "אנחנו מסתובבים בעיר, עוקפים מכשולים, עוצרים לשיחות ומבקרים במקומות שונים.", "אפשר לבקש ממני לבוא איתך, או לבקש שאמשיך בסיור עצמאי."]);
  if (/(מזג אוויר|גשם|שמש|סערה|עננים)/.test(text)) return "אפשר לשנות את מזג האוויר ואת השעה בלוח הסביבה שבצד המסך.";
  if (/(תודה|מעולה|יופי|נהדר)/.test(text)) return pick(["בשמחה! תמיד נחמד לפגוש תושבים חדשים.", "אין בעד מה. שיהיה לך טיול נעים!", "בכיף! אולי נתראה בהמשך הסיבוב."]);
  if (/(להתראות|ביי|שלום לך)/.test(text)) return "להתראות! אני ממשיך לטייל בעיר.";
  if (/(למה|איך|מתי|האם|כמה)/.test(text) && previousTopic === "buildings") return "בדרך כלל אני נכנס דרך הדלת הראשית, ממשיך ללובי ומחפש את גרם המדרגות.";
  if (/(למה|איך|מתי|האם|כמה)/.test(text) && previousTopic === "vehicles") return "מתקרבים לכלי הרכב ולוחצים F כדי להיכנס. אחר כך משתמשים ב-WASD כדי לנהוג.";
  if (/(למה|איך|מתי|האם|כמה)/.test(text)) return pick(["זאת שאלה טובה. אני עוד מגלה דברים בעיר, אבל אשמח לעזור לך לחקור.", "ממה שראיתי, יש כאן הרבה מקומות לגלות. לאן נלך עכשיו?", "אני לא בטוח בכל הפרטים, אבל אפשר לבדוק יחד."]);
  return pick(["מעניין! ספר לי עוד, אני מקשיב.", "אני מבין אותך. מה עוד תרצה לדעת על העיר?", "נחמד לדבר תוך כדי הטיול. יש כאן עוד הרבה מה לראות.", "אולי נגלה משהו חדש בסיבוב הבא שלנו."]);
}

function ScenicHills() {
  const hills = [
    { p: [0, -4.5, -205], s: [84, 12, 38], c: "#78945f" },
    { p: [0, -5, 205], s: [82, 12, 40], c: "#6f8e58" },
    { p: [-205, -4.5, 0], s: [38, 12, 84], c: "#829b65" },
    { p: [205, -5, 0], s: [40, 12, 82], c: "#718d57" },
    { p: [-198, -6, -198], s: [34, 8, 34], c: "#8da36c" },
    { p: [198, -6, 198], s: [36, 8, 36], c: "#81995f" }
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

function CableStationLadder({ station }) {
  const rungs = useRef(null);
  const ladderX = station.x - 5.2;
  const rungCount = Math.max(1, Math.ceil(station.y / .38));

  useEffect(() => {
    const mesh = rungs.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < rungCount; i++) {
      dummy.position.set(ladderX, station.y * (i + 1) / (rungCount + 1), station.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ladderX, rungCount, station]);

  return h("group", null,
    ...[-.58, .58].map((dz) => h("mesh", {
      key: "ladder-rail-" + dz,
      position: [ladderX, (station.y + 1.15) / 2, station.z + dz],
      castShadow: true
    },
      h("boxGeometry", { args: [.16, station.y + 1.15, .16] }),
      h("meshStandardMaterial", { color: "#d0ae70", metalness: .78, roughness: .28 })
    )),
    h("instancedMesh", { ref: rungs, args: [undefined, undefined, rungCount], castShadow: true },
      h("boxGeometry", { args: [.17, .11, 1.22] }),
      h("meshStandardMaterial", { color: "#d8bd84", metalness: .72, roughness: .3 })
    ),
    h("mesh", { position: [ladderX, station.y + .18, station.z], castShadow: true },
      h("boxGeometry", { args: [.18, .12, 1.3] }),
      h("meshStandardMaterial", { color: "#f0d49b", metalness: .72, roughness: .28 })
    )
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
    const ladder = h(CableStationLadder, { station });
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
      ladder
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
  const surfaceTexture = useMemo(() => {
    if (kind !== "solid") return null;
    const size = 96, canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const image = context.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      let hash = (Math.imul(x + 9, 1597334677) ^ Math.imul(y + 3, 3812015801)) >>> 0;
      hash = Math.imul(hash ^ (hash >>> 15), 2246822519) >>> 0;
      const grain = 188 + (hash & 63);
      image.data[index] = grain; image.data[index + 1] = grain; image.data[index + 2] = grain; image.data[index + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  }, [kind]);
  useEffect(() => () => surfaceTexture?.dispose(), [surfaceTexture]);
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
    ? h("meshStandardMaterial", { roughness: .84, metalness: .025, roughnessMap: surfaceTexture, bumpMap: surfaceTexture, bumpScale: .016 })
    : kind === "glass"
      ? h("meshPhysicalMaterial", { transparent: true, opacity: .32, roughness: .05, metalness: .3, envMapIntensity: 1.5, depthWrite: false })
      : h("meshBasicMaterial", { toneMapped: false });
  return h("instancedMesh", { ref, args: [undefined, undefined, list.length], castShadow: kind === "solid", receiveShadow: kind === "solid" }, h("boxGeometry"), material);
}

function Ground({ quality, wet, buildings }) {
  const data = useMemo(() => {
    const size = quality === "low" ? 1024 : quality === "balanced" ? 1536 : 2048;
    const surfaceCanvas = document.createElement("canvas");
    surfaceCanvas.width = surfaceCanvas.height = 512;
    const surfaceContext = surfaceCanvas.getContext("2d");
    if (surfaceContext) {
      const pixels = surfaceContext.createImageData(512, 512);
      for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
        const index = (y * 512 + x) * 4;
        let hash = (Math.imul(x + 31, 1597334677) ^ Math.imul(y + 17, 3812015801)) >>> 0;
        hash = Math.imul(hash ^ (hash >>> 15), 2246822519) >>> 0;
        const grain = 112 + (hash & 127);
        pixels.data[index] = grain; pixels.data[index + 1] = grain; pixels.data[index + 2] = grain; pixels.data[index + 3] = 255;
      }
      surfaceContext.putImageData(pixels, 0, 0);
      surfaceContext.strokeStyle = "rgba(60,60,60,.26)";
      surfaceContext.lineWidth = 1.2;
      for (let i = 0; i < 18; i++) {
        const x = (i * 83) % 512, y = (i * 137) % 512;
        surfaceContext.beginPath(); surfaceContext.moveTo(x, y); surfaceContext.lineTo(x + 5 + (i % 9), y + 2 + (i % 5)); surfaceContext.stroke();
      }
    }
    const surfaceTexture = new THREE.CanvasTexture(surfaceCanvas);
    surfaceTexture.wrapS = surfaceTexture.wrapT = THREE.RepeatWrapping;
    surfaceTexture.repeat.set(54, 54);
    surfaceTexture.colorSpace = THREE.NoColorSpace;
    surfaceTexture.anisotropy = quality === "high" ? 8 : 4;
    surfaceTexture.needsUpdate = true;
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d"), total = GRID * BLOCK + 40, p = size / total, to = (v) => (v + total / 2) * p;
    ctx.fillStyle = "#668452"; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#303b43"; ctx.fillRect(to(-CITY_HALF - 4), to(-CITY_HALF - 4), (GRID * BLOCK + 8) * p, (GRID * BLOCK + 8) * p);
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
    ctx.strokeStyle = "#ffe27a";
    ctx.lineWidth = Math.max(2.6, p * .48);
    ctx.setLineDash([p * 2.65, p * 1.45]);
    for (let i = 0; i <= GRID; i++) {
      const road = -CITY_HALF + i * BLOCK;
      for (const offset of [-.13, .13]) {
        ctx.beginPath(); ctx.moveTo(to(road + offset), to(-CITY_HALF + 1)); ctx.lineTo(to(road + offset), to(CITY_HALF - 1)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(to(-CITY_HALF + 1), to(road + offset)); ctx.lineTo(to(CITY_HALF - 1), to(road + offset)); ctx.stroke();
      }
      ctx.strokeStyle = "#fbfbf5";
      ctx.lineWidth = Math.max(2.1, p * .34);
      ctx.setLineDash([]);
      for (const edge of [-3.72, 3.72]) {
        ctx.beginPath(); ctx.moveTo(to(road + edge), to(-CITY_HALF)); ctx.lineTo(to(road + edge), to(CITY_HALF)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(to(-CITY_HALF), to(road + edge)); ctx.lineTo(to(CITY_HALF), to(road + edge)); ctx.stroke();
      }
      ctx.strokeStyle = "#ffe27a";
      ctx.lineWidth = Math.max(2.6, p * .48);
      ctx.setLineDash([p * 2.65, p * 1.45]);
    }
    ctx.fillStyle = "#f3f0e7";
    for (let gx = 0; gx <= GRID; gx++) for (let gz = 0; gz <= GRID; gz++) {
      const rx = -CITY_HALF + gx * BLOCK, rz = -CITY_HALF + gz * BLOCK;
      for (const sign of [-1, 1]) for (let stripe = 0; stripe < 5; stripe++) {
        const z = rz + sign * (2.35 + stripe * .34);
        const x = rx + sign * (2.35 + stripe * .34);
        ctx.fillRect(to(rx - 3.35), to(z), 6.7 * p, Math.max(2, .22 * p));
        ctx.fillRect(to(x), to(rz - 3.35), Math.max(2, .22 * p), 6.7 * p);
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
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = quality === "high" ? 8 : 4; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter; texture.generateMipmaps = true;
    return { texture, surfaceTexture, total };
  }, [quality]);
  useEffect(() => () => { data.texture.dispose(); data.surfaceTexture.dispose(); }, [data]);
  return h(React.Fragment, null,
    h("mesh", { rotation: [-Math.PI / 2, 0, 0], receiveShadow: true }, h("planeGeometry", { args: [data.total, data.total] }), h("meshStandardMaterial", { map: data.texture, roughnessMap: data.surfaceTexture, bumpMap: data.surfaceTexture, bumpScale: wet ? .045 : .027, transparent: true, alphaTest: .025, depthWrite: true, roughness: wet ? .24 : .9, metalness: wet ? .24 : .015, envMapIntensity: wet ? 1.3 : .55 })),
    h("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, -5.1, 0] }, h("planeGeometry", { args: [1200, 1200] }), h("meshStandardMaterial", { color: "#6f9a52", roughness: wet ? .72 : 1 }))
  );
}

function Trees({ world, nightFactor }) {
  const trunk = useRef(null), crown = useRef(null), crown2 = useRef(null), crown3 = useRef(null), crown4 = useRef(null), crown5 = useRef(null), lampPole = useRef(null), lampHead = useRef(null);
  const glow = useMemo(() => new THREE.MeshStandardMaterial({ color: "#fff1c8", emissive: "#ffc86b", emissiveIntensity: 0, roughness: .25 }), []);
  useFrame(() => { glow.emissiveIntensity = nightFactor * 2.6; });
  useEffect(() => {
    const obj = new THREE.Object3D(), color = new THREE.Color();
    world.trees.forEach((tree, i) => {
      const baseY = tree.y ?? 0;
      obj.position.set(tree.x, baseY + 1.1 * tree.s, tree.z); obj.scale.setScalar(tree.s); obj.rotation.set(0, i * 1.71 + (tree.turn || 0), 0); obj.updateMatrix(); trunk.current.setMatrixAt(i, obj.matrix);
      obj.position.set(tree.x, baseY + 3 * tree.s, tree.z); obj.updateMatrix(); crown.current.setMatrixAt(i, obj.matrix); crown.current.setColorAt(i, color.setHSL(.25 + (i % 5) * .02, .45, .32 + (i % 3) * .05));
      obj.position.set(tree.x + Math.sin(i * 1.71) * .6 * tree.s, baseY + 3.9 * tree.s, tree.z + Math.cos(i * 1.71) * .6 * tree.s); obj.scale.setScalar(tree.s * .65); obj.updateMatrix(); crown2.current.setMatrixAt(i, obj.matrix); crown2.current.setColorAt(i, color.setHSL(.24 + (i % 4) * .02, .5, .38));
      const clusters = [
        { ref: crown3, x: -.72, y: 3.12, z: .12, scale: .58, hue: .255 },
        { ref: crown4, x: .7, y: 3.2, z: .18, scale: .61, hue: .285 },
        { ref: crown5, x: .05, y: 3.05, z: -.72, scale: .56, hue: .235 }
      ];
      clusters.forEach((cluster) => {
        obj.position.set(tree.x + cluster.x * tree.s, baseY + cluster.y * tree.s, tree.z + cluster.z * tree.s);
        obj.scale.setScalar(cluster.scale * tree.s);
        obj.rotation.set(.05 * Math.sin(i), i * .83 + cluster.hue * 8, .04 * Math.cos(i));
        obj.updateMatrix();
        cluster.ref.current.setMatrixAt(i, obj.matrix);
        cluster.ref.current.setColorAt(i, color.setHSL(cluster.hue + (i % 3) * .012, .43, .3 + (i % 4) * .035));
      });
    });
    world.lamps.forEach((lamp, i) => { obj.position.set(lamp.x, 2.5, lamp.z); obj.scale.set(1, 1, 1); obj.rotation.set(0, 0, 0); obj.updateMatrix(); lampPole.current.setMatrixAt(i, obj.matrix); obj.position.y = 5.1; obj.updateMatrix(); lampHead.current.setMatrixAt(i, obj.matrix); });
    [trunk, crown, crown2, crown3, crown4, crown5, lampPole, lampHead].forEach((r) => { if (r.current) { r.current.instanceMatrix.needsUpdate = true; if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true; r.current.computeBoundingSphere(); } });
  }, [world]);
  return h(React.Fragment, null,
    h("instancedMesh", { ref: trunk, args: [undefined, undefined, world.trees.length], castShadow: true }, h("cylinderGeometry", { args: [.15, .22, 2.2, 7] }), h("meshStandardMaterial", { color: "#6b4a2f" })),
    h("instancedMesh", { ref: crown, args: [undefined, undefined, world.trees.length], castShadow: true }, h("sphereGeometry", { args: [1.42, 16, 12] }), h("meshStandardMaterial", { roughness: .92 })),
    h("instancedMesh", { ref: crown2, args: [undefined, undefined, world.trees.length], castShadow: true }, h("sphereGeometry", { args: [1.02, 14, 10] }), h("meshStandardMaterial", { roughness: .9 })),
    h("instancedMesh", { ref: crown3, args: [undefined, undefined, world.trees.length], castShadow: true }, h("sphereGeometry", { args: [1, 14, 10] }), h("meshStandardMaterial", { roughness: .96 })),
    h("instancedMesh", { ref: crown4, args: [undefined, undefined, world.trees.length], castShadow: true }, h("sphereGeometry", { args: [1, 14, 10] }), h("meshStandardMaterial", { roughness: .96 })),
    h("instancedMesh", { ref: crown5, args: [undefined, undefined, world.trees.length], castShadow: true }, h("sphereGeometry", { args: [1, 14, 10] }), h("meshStandardMaterial", { roughness: .96 })),
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

function resolveClosedDoors(point, yLo, yHi, radius, world, doorStates) {
  world.interactables.forEach((item, index) => {
    if (item.type !== "door" || doorStates[index]) return;
    if (item.y + 3 <= yLo || item.y >= yHi) return;
    const halfWidth = 1.15 + radius, halfDepth = .08 + radius;
    if (point.x < item.x - halfWidth || point.x > item.x + halfWidth || Math.abs(point.z - item.z) > halfDepth) return;
    point.z = item.z + (point.z >= item.z ? 1 : -1) * halfDepth;
  });
}
function resolveHelicopterObstacles(point, yLo, yHi, radius, helis) {
  for (const heli of helis) {
    if (heli.y + 1.95 <= yLo || heli.y >= yHi) continue;
    const dx = point.x - heli.x, dz = point.z - heli.z, c = Math.cos(heli.yaw), s = Math.sin(heli.yaw);
    let lx = dx * c - dz * s, lz = dx * s + dz * c;
    const halfW = 1.2 + radius, halfL = 4.0 + radius;
    if (Math.abs(lx) >= halfW || Math.abs(lz) >= halfL) continue;
    const px = halfW - Math.abs(lx), pz = halfL - Math.abs(lz);
    if (px < pz) lx = (lx < 0 ? -1 : 1) * halfW;
    else lz = (lz < 0 ? -1 : 1) * halfL;
    point.x = heli.x + lx * c + lz * s; point.z = heli.z - lx * s + lz * c;
  }
}
function ParkingModels({ airVehicles }) {
  const planeRef = useRef(null), teslaRef = useRef(null), smokeRefs = useRef([]);
  const plane = airVehicles.find((vehicle) => vehicle.id === "plane");
  const floatCar = airVehicles.find((vehicle) => vehicle.id === "tesla");
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    if (planeRef.current && plane) {
      planeRef.current.position.set(plane.x, plane.y, plane.z);
      planeRef.current.rotation.set(plane.pitch || 0, plane.yaw, plane.roll || 0, "YXZ");
    }
    if (teslaRef.current && floatCar) {
      teslaRef.current.position.set(floatCar.x, floatCar.y, floatCar.z);
      teslaRef.current.rotation.set(floatCar.pitch || 0, floatCar.yaw, floatCar.roll || 0, "YXZ");
    }
    const smokeActive = !!floatCar && (Math.abs(floatCar.speed) > .9 || !floatCar.grounded);
    smokeRefs.current.forEach((particle, index) => {
      if (!particle) return;
      particle.visible = smokeActive;
      if (!smokeActive) return;
      const phase = (time * 1.65 + index * .16) % 1;
      particle.position.set(Math.sin(time * 1.1 + index) * .08, .48 + phase * .58, -2.24 - phase * .72);
      particle.scale.setScalar(.45 + phase * .45);
      if (particle.material) particle.material.opacity = (1 - phase) * .34;
    });
  });
  return h(React.Fragment, null,
    plane && h("group", { ref: planeRef },
      h("mesh", { position: [0, .86, 0], castShadow: true }, h("boxGeometry", { args: [.92, .72, 7.6] }), h("meshStandardMaterial", { color: "#d9e1e4", metalness: .48, roughness: .34 })),
      h("mesh", { position: [0, .9, 0], castShadow: true }, h("boxGeometry", { args: [9.8, .17, 1.35] }), h("meshStandardMaterial", { color: "#e8edf0", metalness: .4, roughness: .32 })),
      h("mesh", { position: [0, 1.2, 1.35], scale: [.46, .48, .92] }, h("sphereGeometry", { args: [1, 20, 14] }), h("meshPhysicalMaterial", { color: "#6ca6c8", roughness: .16, metalness: .18, transparent: true, opacity: .82 })),
      h("mesh", { position: [0, .94, -3.1] }, h("boxGeometry", { args: [3.9, .14, .72] }), h("meshStandardMaterial", { color: "#e8edf0", metalness: .4, roughness: .34 })),
      h("mesh", { position: [0, 1.48, -3.22] }, h("boxGeometry", { args: [.18, 1.12, .86] }), h("meshStandardMaterial", { color: "#2e647f", metalness: .32, roughness: .4 })),
      ...[-2.45, 2.45].map((x) => h("mesh", { key: x, position: [x, .58, .1] }, h("boxGeometry", { args: [.72, .42, 1.35] }), h("meshStandardMaterial", { color: "#7d8f99", metalness: .72, roughness: .3 }))),
      ...[-1, 1].map((x) => h("mesh", { key: "light" + x, position: [x * .24, .68, 3.78] }, h("boxGeometry", { args: [.22, .1, .06] }), h("meshBasicMaterial", { color: "#fff0ba" }))),
      h("group", { position: [0, .22, 0] },
        ...[-1, 1].map((side) => h("mesh", { key: "wing-wheel-" + side, position: [side * 2.1, 0, .1], rotation: [0, 0, Math.PI / 2] }, h("cylinderGeometry", { args: [.24, .24, .13, 14] }), h("meshStandardMaterial", { color: "#20262c", roughness: .9 }))),
        h("mesh", { position: [0, 0, 2.0], rotation: [0, 0, Math.PI / 2] }, h("cylinderGeometry", { args: [.2, .2, .15, 14] }), h("meshStandardMaterial", { color: "#20262c", roughness: .9 }))
      )
    ),
    floatCar && h("group", { ref: teslaRef },
      h("mesh", { position: [0, .08, 0], rotation: [-Math.PI / 2, 0, 0] }, h("torusGeometry", { args: [2.25, .055, 8, 48] }), h("meshBasicMaterial", { color: "#49d5f2" })),
      h("mesh", { position: [0, .76, 0], castShadow: true }, h("boxGeometry", { args: [1.95, .52, 4.35] }), h("meshStandardMaterial", { color: "#b8c7d0", metalness: .82, roughness: .2 })),
      h("mesh", { position: [0, 1.12, -.15] }, h("boxGeometry", { args: [1.55, .55, 2.15] }), h("meshPhysicalMaterial", { color: "#82b7ce", transparent: true, opacity: .68, metalness: .22, roughness: .12 })),
      h("mesh", { position: [0, .45, 0] }, h("boxGeometry", { args: [1.72, .1, 3.8] }), h("meshBasicMaterial", { color: "#7de6f5" })),
      ...[-1, 1].flatMap((side) => [-1, 1].map((axle) => h("mesh", { key: side + ":" + axle, position: [side * .98, .5, axle * 1.35], rotation: [0, 0, Math.PI / 2] }, h("cylinderGeometry", { args: [.34, .34, .22, 16] }), h("meshStandardMaterial", { color: "#171c21", roughness: .9 })))),
      ...Array.from({ length: 6 }, (_, index) => h("mesh", {
        key: "tesla-smoke-" + index,
        ref: (node) => { smokeRefs.current[index] = node; },
        position: [0, .5, -2.1],
        visible: false
      }, h("sphereGeometry", { args: [.22, 10, 8] }), h("meshBasicMaterial", { color: "#89949b", transparent: true, opacity: .28, depthWrite: false })))
    )
  );
}
function Player({ world, helis, cars, airVehicles, elevatorCars, activeVehicleRef, input, onLoc, onPrompt, onMode, onHud, doorStates, toggleDoor, onElevatorMenu, cableRide, cableCurve, elevatorMenuRef, quality, citizensRef, conversationRef, playerPositionRef, onTalk }) {
  const col = useMemo(() => new Collider(world.boxes), [world]);
  const rig = useMemo(() => ({}), []);
  const { camera } = useThree();
  const st = useRef({ p: new THREE.Vector3(...world.spawn), v: new THREE.Vector3(), yaw: Math.PI, face: Math.PI, pitch: .32, dist: 6, heliDist: 14, carDist: 9, airDist: 14, onGround: true, phase: 0, mode: "walk", target: -1, near: -1, nearPerson: -1, talkTarget: null, timer: 0, t: 0, lastLoc: "", liftElapsed: 0, actionCooldown: 0, sitY: 0, elevatorTrip: null, elevatorFloor: 0, cableStation: -1, cableTrip: null, cableDescending: false, climbPhase: 0, elevatorId: -1, hudTimer: 0, cameraReady: false, lastPrompt: "" });
  const heliEnv = useMemo(() => ({ ground: (x, z, y) => col.groundAt(x, z, y, .6, 1), resolve: (p, a, b, radius) => { col.resolve(p, a, b, radius); resolveClosedDoors(p, a, b, radius, world, doorStates); resolveCarObstacles(p, a, b, radius, cars); resolveAirVehicleObstacles(p, a, b, radius, airVehicles); col.resolve(p, a, b, radius); } }), [col, cars, world, doorStates, airVehicles]);
  const carEnv = useMemo(() => ({ ground: heliEnv.ground, resolve: (p, a, b, radius, ignore) => { col.resolve(p, a, b, radius); resolveClosedDoors(p, a, b, radius, world, doorStates); resolveCarObstacles(p, a, b, radius, cars, ignore); resolveHelicopterObstacles(p, a, b, radius, helis); resolveAirVehicleObstacles(p, a, b, radius, airVehicles); col.resolve(p, a, b, radius); } }), [col, heliEnv, cars, world, doorStates, helis, airVehicles]);
  const airEnv = useMemo(() => ({ ground: heliEnv.ground, resolve: (p, a, b, radius, ignoreVehicle) => { col.resolve(p, a, b, radius); resolveClosedDoors(p, a, b, radius, world, doorStates); resolveCarObstacles(p, a, b, radius, cars); resolveHelicopterObstacles(p, a, b, radius, helis); resolveAirVehicleObstacles(p, a, b, radius, airVehicles, ignoreVehicle); col.resolve(p, a, b, radius); } }), [col, heliEnv, cars, world, doorStates, helis, airVehicles]);
  const temp = useMemo(() => ({ e: new THREE.Euler(), q: new THREE.Quaternion(), v: new THREE.Vector3() }), []);
  const weightList = useMemo(() => world.interactables.filter((x) => x.type === "weights"), [world]);
  const heliList = useMemo(() => world.interactables.filter((x) => x.type === "heli"), [world]);
  const carList = useMemo(() => world.interactables.filter((x) => x.type === "car"), [world]);
  const weightIndices = useMemo(() => { let n = 0; const map = new Map(); world.interactables.forEach((x, i) => { if (x.type === "weights") map.set(i, n++); }); return map; }, [world]);
  const heliIndices = useMemo(() => { let n = 0; const map = new Map(); world.interactables.forEach((x, i) => { if (x.type === "heli") map.set(i, n++); }); return map; }, [world]);
  const carIndices = useMemo(() => { let n = 0; const map = new Map(); world.interactables.forEach((x, i) => { if (x.type === "car") map.set(i, n++); }); return map; }, [world]);
  const airVehicleIndices = useMemo(() => new Map(airVehicles.map((vehicle, index) => [vehicle.id, index])), [airVehicles]);
  const bar = useRef(-1);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, .05), s = st.current, inp = input.current, keys = inp.keys;
    activeVehicleRef.current.mode = s.mode; activeVehicleRef.current.target = s.target;
    s.t += dt; s.actionCooldown = Math.max(0, s.actionCooldown - dt);
    const act = inp.action && s.actionCooldown <= 0; if (act) s.actionCooldown = .28; inp.action = false;
    if (inp.closeTalk) {
      inp.closeTalk = false;
      if (s.mode === "talk") { s.mode = "walk"; s.talkTarget = null; s.nearPerson = -1; s.v.set(0, 0, 0); onMode("walk"); onPrompt(""); }
    }
    const p = s.p, root = rig.root;
    if (playerPositionRef) playerPositionRef.current = { x: p.x, y: p.y, z: p.z };
    if (s.mode === "elevator" && inp.elevatorFloor !== null) {
      const chosen = inp.elevatorFloor; inp.elevatorFloor = null; onElevatorMenu(null);
      const elevatorCar = elevatorCars[s.elevatorId];
      if (!elevatorCar) {
        s.mode = "walk"; s.elevatorId = -1; onMode("walk"); onPrompt("המעלית לא זמינה כרגע");
      } else if (chosen === -2) {
        elevatorCar.occupant = null; elevatorCar.moving.current = false;
        s.mode = "walk"; p.set(elevatorCar.layout.approachX - .35, s.elevatorFloor * 4, elevatorCar.layout.z);
        s.elevatorId = -1; onMode("walk"); onPrompt("");
      } else {
        const from = elevatorCar.y.current, to = floorHeight(chosen, elevatorCar.layout.floors);
        s.elevatorFloor = chosen;
        if (Math.abs(from - to) < .08) onPrompt("F / פעולה — לצאת מהמעלית");
        else { s.elevatorTrip = makeElevatorTrip(from, to, "ride"); elevatorCar.moving.current = true; onPrompt(""); }
      }
    }
    s.yaw -= inp.drag.dx * .005; s.pitch = THREE.MathUtils.clamp(s.pitch + inp.drag.dy * .004, -.35, 1.25); inp.drag.dx = inp.drag.dy = 0;
    if (s.mode === "heli") s.heliDist = THREE.MathUtils.clamp(s.heliDist + inp.zoom * 2, 7, 30);
    else if (s.mode === "car") s.carDist = THREE.MathUtils.clamp(s.carDist + inp.zoom * 1.4, 5, 20);
    else if (s.mode === "airVehicle") s.airDist = THREE.MathUtils.clamp(s.airDist + inp.zoom * 1.6, 7, 26);
    else s.dist = THREE.MathUtils.clamp(s.dist + inp.zoom, 2.5, 14);
    inp.zoom = 0;
    const axes = readMoveAxes(keys, inp.joy);
    const moveX = axes.x, moveZ = axes.z;
    const shift = keys.has("ShiftLeft") || keys.has("ShiftRight"), jump = keys.has("Space") || inp.up;
    let camTarget = new THREE.Vector3(p.x, p.y + 1.5, p.z), camDist = s.dist, followYaw = null;
    if (s.mode === "elevator") {
      const elevatorCar = elevatorCars[s.elevatorId];
      if (!elevatorCar) {
        s.mode = "walk"; s.elevatorId = -1; onMode("walk"); onPrompt("יצאתם מהמעלית");
      } else {
        const layout = elevatorCar.layout;
        if (s.elevatorTrip) {
          const travel = advanceElevatorTrip(s.elevatorTrip, dt);
          elevatorCar.y.current = travel.y; elevatorCar.moving.current = !travel.done;
          p.set(layout.x, travel.y + .22, layout.z);
          if (travel.done) { s.elevatorTrip = null; s.elevatorFloor = Math.round(travel.y / 4); elevatorCar.moving.current = false; onPrompt("F / פעולה — לצאת מהמעלית"); }
        }
        if (act && !s.elevatorTrip) {
          elevatorCar.occupant = null; elevatorCar.moving.current = false;
          p.set(layout.approachX - .35, s.elevatorFloor * 4, layout.z);
          s.elevatorId = -1; s.mode = "walk"; onMode("walk"); onPrompt("");
        }
      }
      if (root) { root.position.copy(p); root.rotation.set(0, s.face, 0); }
      poseHuman(rig, { mode: "walk", phase: 0, speed: 0, air: false, t: s.t, dt });
      camTarget.set(p.x, p.y + 1.35, p.z);
    } else if (s.mode === "cable-ladder") {
      const station = CABLE_STATIONS[s.cableStation] || CABLE_STATIONS[0];
      const climbingInput = (keys.has("ArrowUp") || keys.has("KeyW") ? 1 : 0) - (keys.has("ArrowDown") || keys.has("KeyS") ? 1 : 0) + inp.joy.y;
      const climbRate = 2.8;
      const climbDirection = s.cableDescending ? -1 : 1;
      const climbSpeed = (s.cableDescending ? Math.max(0, -climbingInput) : Math.max(0, climbingInput)) * climbRate;
      if (climbSpeed > .02) {
        p.y = THREE.MathUtils.clamp(p.y + climbSpeed * climbDirection * dt, 0, station.y);
        s.climbPhase += climbSpeed * dt * 1.55;
      }
      if (s.cableDescending && p.y <= .025) {
        p.set(station.x - 5.55, .02, station.z);
        s.cableDescending = false; s.cableStation = -1; s.climbPhase = 0;
        s.mode = "walk"; s.v.set(0, 0, 0); s.face = -Math.PI / 2; onMode("walk"); onPrompt("");
      } else if (!s.cableDescending && p.y >= station.y - .025) {
        p.set(station.x - 3.7, station.y, station.z);
        s.climbPhase = 0; s.face = Math.PI / 2;
        s.mode = "cable-platform"; onMode("cable-platform");
        const previous = (s.cableStation + CABLE_STATIONS.length - 1) % CABLE_STATIONS.length;
        cableRide.current = { active: false, approaching: true, docked: false, station: s.cableStation, route: [previous, s.cableStation], progress: .91, doorsOpen: false };
        s.lastPrompt = ""; onPrompt("הגעתם לרציף — הקרונית מתקרבת");
      }
      if (root) { root.position.copy(p); root.rotation.set(0, s.face, Math.sin(s.climbPhase) * .025); }
      poseHuman(rig, { mode: "climb", phase: s.climbPhase, speed: climbSpeed, direction: climbDirection, air: false, t: s.t, dt });
      camTarget.set(p.x + .4, p.y + 1.25, p.z); camDist = 4.6;
    } else if (s.mode === "cable-platform") {
      const station = CABLE_STATIONS[s.cableStation] || CABLE_STATIONS[0];
      const worldMove = cameraRelativeMove(moveX, moveZ, s.yaw), wx = worldMove.x, wz = worldMove.z;
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
          s.cableDescending = true; s.climbPhase = 0; p.x = station.x - 5.55; p.z = station.z; s.face = Math.PI / 2;
          s.mode = "cable-ladder"; s.v.set(0, 0, 0); s.lastPrompt = "";
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
      const worldMove = cameraRelativeMove(moveX, moveZ, s.yaw), wx = worldMove.x, wz = worldMove.z, speed = shift ? RUN : WALK, blend = 1 - Math.exp(-ACCEL * dt);
      s.v.x += (wx * speed - s.v.x) * blend; s.v.z += (wz * speed - s.v.z) * blend;
      if (Math.hypot(wx, wz) > .1) { const target = Math.atan2(wx, wz); let d = target - s.face; d = Math.atan2(Math.sin(d), Math.cos(d)); s.face += d * (1 - Math.exp(-12 * dt)); if (moveZ >= -.1) followYaw = s.face; }
      if (jump && s.onGround) { s.v.y = JUMP; s.onGround = false; }
      s.v.y -= GRAVITY * dt;
      const next = { x: p.x + s.v.x * dt, z: p.z + s.v.z * dt };
      const stairwell = world.buildings.some((building) => {
        const stair = building.basementStairwell;
        return stair && p.x >= stair.x0 - .55 && p.x <= stair.x1 + .55 && p.z >= stair.z0 - .55 && p.z <= stair.z1 + .55;
      });
      const stepHeight = stairwell ? .82 : STEP;
      col.resolve(next, p.y + stepHeight, p.y + HEIGHT, RAD);
      resolveCarObstacles(next, p.y + stepHeight, p.y + HEIGHT, RAD, cars);
      resolveHelicopterObstacles(next, p.y + stepHeight, p.y + HEIGHT, RAD, helis);
      resolveAirVehicleObstacles(next, p.y + stepHeight, p.y + HEIGHT, RAD, airVehicles);
      resolveClosedDoors(next, p.y + stepHeight, p.y + HEIGHT, RAD, world, doorStates);
      p.x = next.x; p.z = next.z;
      let ny = p.y + s.v.y * dt, ceiling = col.ceilingAt(p.x, p.z, p.y + HEIGHT - .05);
      if (ny + HEIGHT > ceiling && s.v.y > 0) { ny = ceiling - HEIGHT; s.v.y = 0; }
      const ground = col.groundAt(p.x, p.z, p.y, stepHeight, stairwell ? .22 : RAD);
      if (ny <= ground || (s.onGround && s.v.y <= 0 && ny - ground < stepHeight)) { ny = ground; s.v.y = 0; s.onGround = true; } else s.onGround = false;
      p.y = ny;
      if (p.y < -20) { p.set(...world.spawn); s.v.set(0, 0, 0); }
      s.timer -= dt;
      if (s.timer <= 0) {
        s.timer = .14; let best = -1, bestD = Infinity;
        world.interactables.forEach((it, i) => {
          let x = it.x, y = it.y, z = it.z, radius = it.type === "heli" ? 4 : it.type === "car" ? 3.5 : it.type === "airVehicle" ? (it.id === "plane" ? 5.2 : 3.8) : it.type === "cable" ? 2.8 : (it.type === "basement" || it.type === "basementExit") ? 2.15 : 1.8;
          if (it.type === "heli") { const item = helis[heliIndices.get(i)]; x = item.x; y = item.y; z = item.z; if (!item.grounded) return; }
          if (it.type === "car") { const item = cars[carIndices.get(i)]; x = item.x; y = item.y; z = item.z; }
          if (it.type === "airVehicle") { const item = airVehicles[airVehicleIndices.get(it.id)]; if (!item) return; x = item.x; y = item.y; z = item.z; }
          if (Math.abs(p.y - y) > (it.type === "car" || it.type === "airVehicle" ? 1.8 : 1.2)) return;
          const d = Math.hypot(p.x - x, p.z - z); if (d < radius && d < bestD) { best = i; bestD = d; }
        });
        let nearestPerson = -1, nearestPersonD = 3.35;
        if (s.mode === "walk") {
          (citizensRef?.current || []).forEach((person, index) => {
            if (person.hidden || Math.abs(p.y - person.y) > 2.0) return;
            const d = Math.hypot(p.x - person.x, p.z - person.z);
            if (d < nearestPersonD) { nearestPerson = index; nearestPersonD = d; }
          });
        }
        s.nearPerson = nearestPerson;
        if (nearestPerson >= 0 && nearestPersonD < bestD) best = -1;
        s.near = best;
        const person = nearestPerson >= 0 && best < 0 ? citizensRef.current[nearestPerson] : null;
        const it = best >= 0 ? world.interactables[best] : null, actionText = it ? (it.type === "door" && doorStates[best] ? "לסגור דלת" : PROMPTS[it.type]) : "";
        const text = person ? `F / פעולה — לדבר עם ${person.name}` : it ? `F / פעולה — ${actionText}` : "";
        if (text !== s.lastPrompt) { s.lastPrompt = text; onPrompt(text); }
      }
      if (act && s.nearPerson >= 0 && s.mode === "walk" && s.onGround) {
        const person = citizensRef?.current?.[s.nearPerson];
        if (person) {
          s.talkTarget = person.id; s.mode = "talk"; s.v.set(0, 0, 0); s.near = -1; s.nearPerson = -1;
          inp.keys.clear(); inp.joy = { x: 0, y: 0 };
          onPrompt(""); onHud(""); onMode("talk"); onTalk?.(person);
        }
      }
      if (act && s.near >= 0 && s.onGround && s.mode === "walk") {
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
        else if (it.type === "airVehicle") { s.target = airVehicleIndices.get(it.id); s.mode = "airVehicle"; onMode("airVehicle"); onPrompt(it.id === "plane" ? "מטוס · W/S תנועה · רווח להמראה · Shift להנמכה" : "טסלה מעופפת · W/S נסיעה · רווח לעלייה נמוכה · Shift לירידה"); }
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
        else if (it.type === "elevator") {
          const elevatorId = Number(it.elevatorId), elevatorCar = elevatorCars[elevatorId];
          if (!elevatorCar) onPrompt("המעלית לא זמינה כרגע");
          else if (elevatorCar.occupant && elevatorCar.occupant !== "player") onPrompt("המעלית בשימוש — נסו שוב בעוד רגע");
          else {
            const layout = elevatorCar.layout;
            s.elevatorId = elevatorId;
            s.elevatorFloor = Math.max(-1, Math.min(layout.floors - 1, Math.floor(it.floor ?? 0)));
            elevatorCar.occupant = "player"; elevatorCar.y.current = s.elevatorFloor * 4; elevatorCar.moving.current = false;
            p.set(layout.x, s.elevatorFloor * 4 + .22, layout.z);
            s.mode = "elevator"; onMode("elevator");
            onElevatorMenu({ elevatorId, buildingName: layout.buildingName, floors: layout.floors, current: s.elevatorFloor });
          }
        }
        else if (it.type === "cable") {
          s.cableStation = Math.max(0, Math.min(CABLE_STATIONS.length - 1, it.stationId || 0));
          s.cableDescending = false; s.climbPhase = 0;
          p.set(it.x - .35, 0, it.z); s.face = Math.PI / 2;
          s.mode = "cable-ladder"; s.v.set(0, 0, 0);
          onMode("cable-ladder"); onPrompt("החזיקו ↑ / W כדי לטפס — הידיים והרגליים נעות יחד עם הסולם");
        }
      }
      if (root) { root.position.copy(p); root.rotation.set(0, s.face, 0); }
      s.phase += Math.hypot(s.v.x, s.v.z) * dt * 1.9;
      poseHuman(rig, { mode: "walk", phase: s.phase, speed: Math.hypot(s.v.x, s.v.z), air: !s.onGround, t: s.t, dt });
      camTarget.set(p.x, p.y + 1.55, p.z);
    } else if (s.mode === "talk") {
      const person = (citizensRef?.current || []).find((item) => item.id === s.talkTarget);
      s.v.set(0, 0, 0);
      if (!person) {
        s.mode = "walk"; s.talkTarget = null; onMode("walk");
      } else {
        s.face = Math.atan2(person.x - p.x, person.z - p.z);
        if (root) { root.position.copy(p); root.rotation.set(0, s.face, 0); }
        poseHuman(rig, { mode: "walk", phase: s.phase, speed: 0, air: false, t: s.t, dt });
        camTarget.set(p.x, p.y + 1.55, p.z); camDist = 4.8;
      }
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
      if (act || (s.mode === "sit" && (Math.hypot(moveX, moveZ) > .3 || jump))) {
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
          s.hudTimer -= dt; if (s.hudTimer <= 0) { s.hudTimer = .2; onHud(`רכב · ${Math.round(Math.abs(car.speed) * 3.6)} קמ״ש · W קדימה · S אחורה · A שמאלה · D ימינה · Shift בלימה`); }
        }
      }
    } else if (s.mode === "airVehicle") {
      const vehicle = airVehicles[s.target];
      if (!vehicle) { s.mode = "walk"; onMode("walk"); }
      else {
        const lift = (jump ? 1 : 0) - (shift || inp.down ? 1 : 0);
        stepAirVehicle(vehicle, { throttle: moveZ, steer: moveX, lift, piloted: true }, dt, airEnv);
        const canExit = canExitAirVehicle(vehicle, airEnv.ground);
        if (act && canExit) {
          const offset = new THREE.Vector3(-2.8, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), vehicle.yaw);
          p.set(vehicle.x + offset.x, 0, vehicle.z + offset.z);
          p.y = col.groundAt(p.x, p.z, vehicle.y, .8);
          col.resolve(p, p.y + STEP, p.y + HEIGHT, RAD);
          resolveCarObstacles(p, p.y + STEP, p.y + HEIGHT, RAD, cars);
          resolveHelicopterObstacles(p, p.y + STEP, p.y + HEIGHT, RAD, helis);
          resolveAirVehicleObstacles(p, p.y + STEP, p.y + HEIGHT, RAD, airVehicles, vehicle);
          s.face = vehicle.yaw; s.mode = "walk"; s.target = -1; s.v.set(0, 0, 0);
          onMode("walk"); onPrompt(""); onHud("");
        } else {
          temp.e.set(vehicle.pitch || 0, vehicle.yaw, vehicle.roll || 0, "YXZ"); temp.q.setFromEuler(temp.e);
          if (root) { root.position.copy(temp.v.set(0, .7, .18).applyQuaternion(temp.q).add(new THREE.Vector3(vehicle.x, vehicle.y, vehicle.z))); root.quaternion.copy(temp.q); }
          poseHuman(rig, { mode: "car", phase: 0, speed: 0, air: false, t: s.t, dt });
          p.set(vehicle.x, vehicle.y, vehicle.z);
          camTarget.set(vehicle.x, vehicle.y + 2.35, vehicle.z); camDist = s.airDist; followYaw = vehicle.yaw;
          s.hudTimer -= dt;
          if (s.hudTimer <= 0) {
            s.hudTimer = .2;
            const label = vehicle.id === "plane" ? "מטוס" : "טסלה מעופפת";
            onHud(label + " · " + Math.round(Math.abs(vehicle.speed) * 3.6) + " קמ״ש · W/S קדימה ואחורה · A/D היגוי · רווח עלייה · Shift הנמכה");
          }
          onPrompt(canExit ? "F / פעולה — לצאת מכלי הטיס" : "כדי לצאת: להנמיך ולעצור");
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
    airVehicles.forEach((vehicle, i) => { if (!(s.mode === "airVehicle" && i === s.target)) stepAirVehicle(vehicle, { throttle: 0, steer: 0, lift: 0, piloted: false }, dt, airEnv); });
    if (followYaw !== null && performance.now() / 1000 - inp.lastDrag > 1.2) { let d = followYaw - s.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); s.yaw += d * (1 - Math.exp(-2.5 * dt)); }
    const back = new THREE.Vector3(-Math.sin(s.yaw) * Math.cos(s.pitch), Math.sin(s.pitch), -Math.cos(s.yaw) * Math.cos(s.pitch));
    let distance = camDist;
    const underground = p.y < -.5;
    for (let t = .3; t <= camDist; t += .3) { const test = camTarget.clone().addScaledVector(back, t); if (col.pointInside(test.x, test.y, test.z, .2) || (!underground && test.y < .2)) { distance = Math.max(.3, t - .25); break; } }
    const desired = camTarget.clone().addScaledVector(back, distance);
    if (!s.cameraReady) { camera.position.copy(desired); s.cameraReady = true; }
    camera.position.lerp(desired, 1 - Math.exp(-6 * dt)); camera.lookAt(camTarget);
    const place = s.mode === "heli" ? "בטיסה מעל העיר" : s.mode === "airVehicle" ? (airVehicles[s.target]?.id === "plane" ? "בטיסה במטוס" : "בטסלה המעופפת") : s.mode === "cable" ? "ברכבל גבוה מעל העיר" : locate(world, p.x, p.y, p.z);
    const label = s.mode === "heli" || s.mode === "airVehicle" || s.mode === "cable" ? place : place ? `${place.building} · קומה ${place.floor} · ${place.room}` : "ברחובות העיר";
    if (label !== s.lastLoc) { s.lastLoc = label; onLoc(label); }
  });
  return h(React.Fragment, null,
    h("directionalLight", { position: [50, 105, 45], intensity: 2.1, color: "#fff0d1", castShadow: true, "shadow-mapSize": [quality === "high" ? 3072 : quality === "balanced" ? 2048 : 1024, quality === "high" ? 3072 : quality === "balanced" ? 2048 : 1024], "shadow-camera-left": -185, "shadow-camera-right": 185, "shadow-camera-top": 185, "shadow-camera-bottom": -185, "shadow-camera-near": 1, "shadow-camera-far": 420, "shadow-bias": -0.00018, "shadow-normalBias": 0.025, "shadow-radius": quality === "high" ? 4 : 2 }),
    h(Human, { rig })
  );
}

export default function Game() {
  const world = useMemo(() => generateWorld(7), []);
  const cableCurve = useMemo(() => makeCableCurve(), []);
  const input = useRef({ keys: new Set(), drag: { dx: 0, dy: 0 }, lastDrag: -10, zoom: 0, joy: { x: 0, y: 0 }, action: false, up: false, down: false, closeTalk: false, elevatorFloor: null });
  const [loc, setLoc] = useState("ברחובות העיר"), [started, setStarted] = useState(false), [help, setHelp] = useState(true);
  const [prompt, setPrompt] = useState(""), [hud, setHud] = useState(""), [mode, setMode] = useState("walk");
  const [weather, setWeather] = useState("clear"), [hour, setHour] = useState(14), [clockRunning, setClockRunning] = useState(false), [quality, setQuality] = useState("high");
  const [elevatorMenu, setElevatorMenu] = useState(null), [doorStates, setDoorStates] = useState({});
  const [conversation, setConversation] = useState(null), [chatDraft, setChatDraft] = useState("");
  const doorRef = useRef({}), cableRide = useRef({ active: false, route: [], progress: 0 });
  const elevatorCars = useMemo(() => (world.elevators || []).map((layout) => ({ layout, y: { current: 0 }, moving: { current: false }, occupant: null })), [world]);
  const citizensRef = useRef([]), conversationRef = useRef(null), playerPositionRef = useRef({ x: world.spawn[0], y: world.spawn[1], z: world.spawn[2] });
  const joyRef = useRef(null), [knob, setKnob] = useState({ x: 0, y: 0 });
  const [cameraDrag, setCameraDrag] = useState(null);
  const environment = useMemo(() => getEnvironmentProfile(weather, hour, quality), [weather, hour, quality]);
  const helis = useMemo(() => world.interactables.filter((item) => item.type === "heli").map((item) => Object.assign(makeHeli(item.x, item.y, item.z, item.face), { npcControlled: !!item.npcControlled })), [world]);
  const cars = useMemo(() => world.interactables.filter((item) => item.type === "car").map((item) => Object.assign(makeCar(item.x, item.y, item.z, item.face, item.color, item.kind), { npcControlled: !!item.npcControlled })), [world]);
  const airVehicles = useMemo(() => (world.parkingVehicles || []).map(makeAirVehicle), [world]);
  const activeVehicleRef = useRef({ mode: "walk", target: -1 });
  const weightList = useMemo(() => world.interactables.filter((item) => item.type === "weights"), [world]);
  const toggleDoor = useCallback((index) => { const next = { ...doorRef.current, [index]: !doorRef.current[index] }; doorRef.current = next; setDoorStates(next); }, []);
  const beginConversation = useCallback((person) => {
    person.bubbleText = "שלום! מה שלומך?";
    person.bubbleUntil = Number.POSITIVE_INFINITY;
    conversationRef.current = { personId: person.id, bubbleText: person.bubbleText };
    setConversation({ personId: person.id, npcName: person.name, topic: "", messages: [{ from: "npc", text: "שלום! נחמד לפגוש אותך. מה תרצה לדעת על העיר?" }] });
    setChatDraft("");
  }, []);
  const closeConversation = useCallback(() => {
    const person = citizensRef.current.find((item) => item.id === conversationRef.current?.personId);
    if (person) { person.bubbleText = ""; person.bubbleUntil = 0; }
    conversationRef.current = null;
    input.current.closeTalk = true;
    setConversation(null);
    setChatDraft("");
  }, []);
  const sendChatMessage = (event) => {
    event.preventDefault();
    const message = chatDraft.trim().slice(0, 220);
    if (!message || !conversation) return;
    const currentPerson = citizensRef.current.find((item) => item.id === conversation.personId);
    const followCommand = /(בוא איתי|בוא אחריי|תעקוב אחרי|תעקוב אחריי|תצטרף אלי|תצטרף אליי)/.test(message);
    const stopFollowCommand = /(תפסיק לעקוב|אל תעקוב|תישאר כאן|תחזור לסיור|תפסיק לבוא)/.test(message);
    if (currentPerson && followCommand) {
      currentPerson.followPlayer = true;
      currentPerson.visiting = false;
      currentPerson.visitTarget = null;
      currentPerson.wait = 0;
      currentPerson.stuck = 0;
    } else if (currentPerson && stopFollowCommand) {
      currentPerson.followPlayer = false;
      currentPerson.visiting = false;
      currentPerson.visitTarget = null;
      currentPerson.route = currentPerson.sidewalkRoute;
      currentPerson.waypoint = 0;
      currentPerson.visitCountdown = 3;
      currentPerson.wait = .25;
    }
    const topic = /(בניין|קומה|דלת|מדרגות|גג|לובי)/.test(message) ? "buildings" : /(רכב|מכונית|אוטובוס|ג'יפ|חניון)/.test(message) ? "vehicles" : conversation.topic;
    const reply = makeNpcReply(conversation.npcName, message, conversation.messages.length, conversation.topic, currentPerson?.personality);
    if (conversationRef.current) conversationRef.current = { ...conversationRef.current, bubbleText: reply };
    setConversation((current) => current ? ({
      ...current, topic,
      messages: [...current.messages, { from: "player", text: message }, { from: "npc", text: reply }].slice(-12)
    }) : current);
    setChatDraft("");
  };
  useEffect(() => {
    const down = (event) => {
      if (!started) return;
      if (event.target instanceof HTMLElement && event.target.closest(".npc-chat-panel")) {
        if (event.code === "Escape") { closeConversation(); event.preventDefault(); }
        return;
      }
      if (event.target instanceof HTMLElement && event.target.closest(".climate-panel, .elevator-dialog")) return;
      input.current.keys.add(event.code);
      if (event.code === "KeyF" && !event.repeat) input.current.action = true;
      if (event.code === "Space" || event.code.startsWith("Arrow")) event.preventDefault();
    };
    const up = (event) => input.current.keys.delete(event.code), blur = () => input.current.keys.clear();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, [started, closeConversation]);
  useEffect(() => { if (!clockRunning) return; const timer = window.setInterval(() => setHour((v) => (v + .25) % 24), 8000); return () => window.clearInterval(timer); }, [clockRunning]);
  const pointer = useRef(null), lastPointer = useRef({ x: 0, y: 0 });
  const onPointerDown = (event) => { pointer.current = event.pointerId; lastPointer.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); };
  const onPointerMove = (event) => { if (pointer.current !== event.pointerId) return; input.current.drag.dx += event.clientX - lastPointer.current.x; input.current.drag.dy += event.clientY - lastPointer.current.y; input.current.lastDrag = performance.now() / 1000; lastPointer.current = { x: event.clientX, y: event.clientY }; };
  const onPointerUp = (event) => { if (pointer.current === event.pointerId) pointer.current = null; };
  const joyMove = (event) => { const el = joyRef.current; if (!el || !(event.buttons || event.pointerType === "touch")) return; const r = el.getBoundingClientRect(); let x = (event.clientX - r.left - r.width / 2) / (r.width / 2), y = (event.clientY - r.top - r.height / 2) / (r.height / 2), l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } input.current.joy = { x, y: -y }; setKnob({ x, y }); };
  const joyEnd = () => { input.current.joy = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 }); };
  return h("div", { id: "scene-root", className: "game-root", dir: "rtl" },
    h("div", { className: "game-canvas", onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel: (e) => { input.current.zoom += e.deltaY * .005; } },
      h(Canvas, { shadows: quality !== "low", dpr: quality === "high" ? Math.min(window.devicePixelRatio || 1, 1.65) : quality === "balanced" ? 1.15 : .85, camera: { fov: 60, near: .1, far: 600 }, gl: { antialias: quality === "high", powerPreference: "high-performance" }, onCreated: ({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.12; gl.setClearColor(environment.skyColor); } },
        h("color", { attach: "background", args: [environment.skyColor] }), h("fog", { attach: "fog", args: [environment.fogColor, environment.fogNear, environment.fogFar] }),
        h(Sky, { sunPosition: environment.sunPosition, turbidity: environment.turbidity, rayleigh: 1.2 + environment.daylight * .5, mieCoefficient: weather === "fog" ? .012 : .004 }),
        h("hemisphereLight", { args: [environment.hemisphereSky, environment.hemisphereGround, environment.hemisphereIntensity] }), h("ambientLight", { intensity: environment.ambientIntensity }),
        h(Environment, { resolution: quality === "high" ? 192 : quality === "balanced" ? 96 : 64 }, h(Lightformer, { intensity: 1.35 + environment.daylight, position: [0, 10, 0], rotation: [Math.PI / 2, 0, 0], scale: [24, 22, 1] }), h(Lightformer, { intensity: .72, color: "#ffd9a8", position: [-10, 3, -5], rotation: [0, Math.PI / 2, 0], scale: [22, 5, 1] }), h(Lightformer, { intensity: .62, color: "#b9d9ed", position: [12, 5, -9], rotation: [0, -Math.PI / 3, 0], scale: [14, 6, 1] }), h(Lightformer, { intensity: .42, color: "#f0e0c3", position: [-4, 8, 13], rotation: [0, Math.PI / 2.8, 0], scale: [12, 8, 1] })),
        h(WeatherEffects, { weather, profile: environment }), h(AmbientLife, { quality }), h(BirdFlocks), h(StreetLights, { lamps: world.lamps, nightFactor: environment.nightFactor, quality }), h(QualityMonitor, { onLevel: setQuality }),
        h(Ground, { quality, wet: weather === "rain" || weather === "storm", buildings: world.buildings }),
        h(ScenicHills), h(WalkableHills),
        h(Cableway, { ride: cableRide, curve: cableCurve }),
        h(Boxes, { world, kind: "solid" }), h(Boxes, { world, kind: "glow" }), h(Boxes, { world, kind: "glass" }),
        h(Trees, { world, nightFactor: environment.nightFactor }), h(CityDetails, { buildings: world.buildings, trees: world.trees, windStrength: environment.windStrength, nightFactor: environment.nightFactor }),
        h(AnimatedWorld, { world, windStrength: environment.windStrength }),
        h(DoorSet, { world, doorStates }), ...elevatorCars.map((car) => h(ElevatorModel, { key: car.layout.id, layout: car.layout, y: car.y, moving: car.moving })),
        h(Helicopters, { helis }), h(Cars, { cars }), h(ParkingModels, { airVehicles }),
        h(Citizens, { world, cars, helis, airVehicles, elevatorCars, activeVehicleRef, citizensRef, conversationRef, playerPositionRef, doorStatesRef: doorRef, onDoorToggle: toggleDoor }),
        h(Player, { world, helis, cars, airVehicles, elevatorCars, activeVehicleRef, input, onLoc: setLoc, onPrompt: setPrompt, onMode: setMode, onHud: setHud, doorStates: doorRef.current, toggleDoor, onElevatorMenu: setElevatorMenu, cableRide, cableCurve, quality, citizensRef, conversationRef, playerPositionRef, onTalk: beginConversation })
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
    hud && (mode === "heli" || mode === "car" || mode === "airVehicle" || mode === "lift" || mode === "treadmill" || mode === "cable") && h("div", { className: "hud-panel vehicle-hud" }, hud),
    conversation && h("section", { className: "npc-chat-panel hud-panel", role: "dialog", "aria-label": "שיחה עם תושב" },
      h("div", { className: "npc-chat-header" },
        h("div", null, h("strong", null, "שיחה עם " + conversation.npcName), h("span", null, "התושב עוצר ומקשיב לך")),
        h("button", { type: "button", className: "npc-chat-close", onClick: closeConversation }, "סיום")
      ),
      h("div", { className: "npc-chat-messages", "aria-live": "polite" },
        conversation.messages.map((message, index) => h("div", { key: index, className: "npc-chat-bubble " + (message.from === "player" ? "player" : "npc") },
          h("small", null, message.from === "player" ? "אתה" : conversation.npcName),
          h("p", null, message.text)
        ))
      ),
      h("form", { className: "npc-chat-form", onSubmit: sendChatMessage },
        h("input", { type: "text", value: chatDraft, onChange: (event) => setChatDraft(event.target.value), placeholder: "כתוב הודעה לתושב...", maxLength: 220, autoComplete: "off", autoFocus: true }),
        h("button", { type: "submit", disabled: !chatDraft.trim() }, "שליחה")
      )
    ),
    elevatorMenu && h("div", { className: "elevator-dialog", role: "dialog", "aria-label": "בחירת קומה במעלית" },
      h("h3", null, elevatorMenu.buildingName ? "מעלית · " + elevatorMenu.buildingName : "מעלית · בחירת קומה"),
      h("div", { className: "elevator-floor-grid" }, [h("button", { key: -1, className: elevatorMenu.current === -1 ? "selected" : "", onClick: () => { input.current.elevatorFloor = -1; } }, "מחסן ‎-1"), ...Array.from({ length: elevatorMenu.floors }, (_, index) => { const floor = index; return h("button", { key: floor, className: floor === elevatorMenu.current ? "selected" : "", onClick: () => { input.current.elevatorFloor = floor; } }, floor === 0 ? "קרקע" : floor === elevatorMenu.floors - 1 ? "גג" : `קומה ${floor}`); })]),
      h("button", { className: "elevator-cancel", onClick: () => { input.current.action = true; } }, "יציאה מהמעלית")
    ),
    h("section", { className: `hud-panel hud-help ${help ? "" : "hud-collapsed"}` }, h("button", { className: "hud-btn", onClick: () => setHelp((v) => !v) }, help ? "הסתר" : "עזרה"),
      help && h("ul", null,
        h("li", null, h("b", null, "W A S D"), " / חיצים — הליכה"),
        h("li", null, h("b", null, "Shift"), " — ריצה · ", h("b", null, "רווח"), " — קפיצה"),
        h("li", null, h("b", null, "גרירת עכבר"), " — סיבוב מצלמה · ", h("b", null, "גלגלת"), " — זום"),
        h("li", null, h("b", null, "Q / E"), " — סיבוב מצלמה"),
        h("li", null, h("b", null, "F"), " — פעולה, פתיחת דלתות, עלייה לכלי רכב ודיבור עם תושבים. התקרבו לתושב ולחצו F כדי לפתוח שיחה."),
        h("li", null, "רכבל: F ליד הסולם ואז מחזיקים ↑ / W לטיפוס. על הרציף הולכים לקרונית; כשהדלת נפתחת לוחצים F להיכנס. ↑ / W נוסע קדימה, ↓ / S אחורה, ו־F יוצאים ליד תחנה."),
        h("li", null, "חניון מרכז העיר: F ליד רכב, ג׳יפ, מכונית מרוץ, אוטובוס או טנק כדי להיכנס. W קדימה, S אחורה, A שמאלה ו־D ימינה; Shift בלימה ברכב."),
        h("li", null, "מטוס: F כדי להיכנס, W/S לתנועה, A/D להיגוי, רווח להמראה ו־Shift להנמכה. טסלה מעופפת: F כדי להיכנס, W/S לנסיעה, A/D להיגוי, רווח לעלייה נמוכה ו־Shift לירידה; מאחור יוצא עשן בזמן תנועה."),
        h("li", null, "תושבי העיר הם דמויות AI: הם מטיילים, עוצרים ומסתכלים סביב, נכנסים למכוניות, נוסעים ומטיסים מסוק, מטוס וטסלה. אפשר להשתלט על כלי רכב שה-AI נוהג בהם כשמתקרבים ולוחצים F."),
        h("li", null, "מסוק: W קדימה, S אחורה, A שמאלה, D ימינה, רווח עלייה, Shift ירידה"),
        h("li", null, "מכון כושר: F להתחלת אימון או לעצירה בהליכון ובמשקולות"),
        h("li", null, "מחסן בכל בניין: F ליד פתח המדרגות. בבניין עם המעלית אפשר לבחור גם מחסן ‎-1 בתפריט המעלית."),
        h("li", null, "גן השעשועים: F לנדנדה או למגלשה"),
        h("li", null, "בחרו מזג אוויר, שעה ומחזור יום/לילה בפינה השמאלית.")
      )
    ),
    h("div", { ref: joyRef, className: "joy", "aria-label": "שליטה בכיוון: למעלה קדימה, למטה אחורה, שמאלה שמאלה, ימינה ימינה", onPointerDown: (e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); joyMove(e); }, onPointerMove: joyMove, onPointerUp: joyEnd, onPointerCancel: joyEnd },
      h("span", { className: "joy-direction up", "aria-hidden": true }, "↑"),
      h("span", { className: "joy-direction right", "aria-hidden": true }, "→"),
      h("span", { className: "joy-direction down", "aria-hidden": true }, "↓"),
      h("span", { className: "joy-direction left", "aria-hidden": true }, "←"),
      h("div", { className: "joy-knob", style: { transform: `translate(${knob.x * 34}px, ${knob.y * 34}px)` } })),
    h("button", { className: "jump-btn", onPointerDown: (e) => { e.stopPropagation(); input.current.keys.add(mode === "cable-ladder" || mode === "cable" ? "ArrowUp" : "Space"); }, onPointerUp: () => { input.current.keys.delete(mode === "cable-ladder" || mode === "cable" ? "ArrowUp" : "Space"); }, onPointerCancel: () => { input.current.keys.delete(mode === "cable-ladder" || mode === "cable" ? "ArrowUp" : "Space"); } }, mode === "heli" || mode === "airVehicle" ? "עלייה" : mode === "car" ? "בלימה" : mode === "cable-ladder" ? "טיפוס ↑" : mode === "cable" ? "קדימה ↑" : "קפיצה"),
    (mode === "heli" || mode === "airVehicle" || mode === "cable-ladder" || mode === "cable") && h("button", { className: "vehicle-down-btn", onPointerDown: (e) => { e.stopPropagation(); if (mode === "cable-ladder" || mode === "cable") input.current.keys.add("ArrowDown"); else input.current.down = true; }, onPointerUp: () => { input.current.keys.delete("ArrowDown"); input.current.down = false; }, onPointerCancel: () => { input.current.keys.delete("ArrowDown"); input.current.down = false; } }, mode === "cable" ? "אחורה ↓" : "ירידה"),
    !started && h("div", { className: "start-overlay" }, h("div", { className: "start-card" },
      h("h1", null, "עיר פתוחה"), h("p", null, "עיר תלת־ממדית לחקור: בניינים מפורטים, גבעות שאפשר לטפס עליהן, מרפסות, גגות ורכבל גבוה מעל העיר עם ארבע תחנות, ולהקות ציפורים שחולפות בשמיים מדי פעם."),
      h("button", { className: "start-btn", onClick: () => setStarted(true) }, "יוצאים לדרך"),
      h("a", { className: "privacy-note", href: "./privacy.html" }, "מדיניות פרטיות")
    ))
  );
}
