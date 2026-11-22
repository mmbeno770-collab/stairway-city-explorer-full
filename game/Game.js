import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Sky } from "@react-three/drei";
import * as THREE from "three";
import { Collider, generateWorld, locate, CITY_HALF, BLOCK, GRID, CABLE_STATIONS } from "./world.js";
import { getParkRideLocations, getParkRidePose } from "./park-rides.js";
import { Human, poseHuman, BARBELL } from "./human.js";
import { Citizens } from "./citizens.js";
import { Helicopters } from "./helicopter.js";
import { makeHeli, stepHeli, canExitHeli } from "./heli-sim.js";
import { CityDetails } from "./CityDetails.js";
import { CityLandmarks } from "./CityLandmarks.js";
import { AnimatedWorld } from "./animated-world.js";
import { Cars } from "./cars.js";
import { makeCar, stepCar, resolveCarObstacles } from "./car-sim.js";
import { makeAirVehicle, stepAirVehicle, canExitAirVehicle, resolveAirVehicleObstacles } from "./air-vehicle-sim.js";
import { ElevatorModel } from "./elevator-system.js";
import { advanceElevatorTrip, floorHeight, makeElevatorTrip } from "./elevator-sim.js";
import { AmbientLife, QualityMonitor, StreetLights, WeatherEffects } from "./environment.js";
import { formatGameTime, getEnvironmentProfile, WEATHER_OPTIONS } from "./environment-sim.js";
import { createMarineWorld, createIslandCollisionBoxes, isMainlandLand, getIslandAt, getWaterHeight, mainlandCoastRadius, MarineWorld } from "./marine-world.js";

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
function vehicleExitPoint(x, z, yaw, distance, islands, side = -1) {
  let exitX = x + side * distance * Math.cos(yaw);
  let exitZ = z - side * distance * Math.sin(yaw);
  const island = getIslandAt(x, z, islands);
  if (island && !getIslandAt(exitX, exitZ, islands)) {
    exitX = x + (island.x - x) * .34;
    exitZ = z + (island.z - z) * .34;
    if (!getIslandAt(exitX, exitZ, islands)) { exitX = island.x; exitZ = island.z; }
  }
  return { x: exitX, z: exitZ, island };
}
const WALK = 6.2, RUN = 10.5, ACCEL = 16, GRAVITY = 24, JUMP = 8, STEP = .35, RAD = .35, HEIGHT = 1.75;
const PROMPTS = { sofa: "לשבת", swing: "להתנדנד", slide: "לגלוש במגלשה", weights: "להרים משקולות", treadmill: "להפעיל הליכון", heli: "להיכנס למסוק ולטוס", airVehicle: "להיכנס למטוס או לטסלה המעופפת", door: "לפתוח דלת", elevator: "להזמין מעלית", car: "להיכנס לרכב", boat: "לשוט בסירה", jetSki: "לרכוב באופנוע ים", sled: "לרכוב במזחלת השלג", cable: "לטפס לרציף הרכבל", basement: "לרדת למחסן (קומה -1)", basementExit: "לחזור לקומת הקרקע" };

function getNpcTopic(message, previousTopic = "") {
  const text = String(message || "").toLocaleLowerCase("he");
  const topics = [
    ["sea", /(בים|במים|חוף|חופים|אי(?:ים)?(?:\s|$|[.,!?])|לאי|לאיים|דגים|דג|צלילה|שחייה|סירה|אלמוג)/],
    ["vehicles", /(רכב|מכונית|אוטובוס|ג'יפ|חניון|מכוניות|נהיגה|מירוץ)/],
    ["flight", /(מטוס|מסוק|טס|טיסה|מעופפת|רכבל)/],
    ["buildings", /(בניין|קומה|דלת|מדרגות|גג|לובי|חדר|מעלית)/],
    ["weather", /(מזג אוויר|גשם|שמש|סערה|עננים|רוח|שלג)/],
    ["nature", /(עץ|עצים|פרחים|חיות|בעלי חיים|פארק|גינה|ציפורים|טבע)/],
    ["residents", /(תושב|אנשים|דמויות|חברים|בוטים|בינה מלאכותית|ai)/],
    ["activities", /(מה לעשות|אטרקציות|משחק|לשחק|לטייל|לחקור|מעניין)/]
  ];
  for (const [topic, pattern] of topics) if (pattern.test(text)) return topic;
  return previousTopic;
}

function makeNpcReply(name, message, turnCount = 0, previousTopic = "", personality = "סקרן ואוהב לגלות מקומות חדשים", history = []) {
  const text = String(message || "").trim().toLocaleLowerCase("he");
  const pick = (choices) => choices[(Math.abs(turnCount) + String(name || "").length) % choices.length];
  const topic = getNpcTopic(text, previousTopic);
  const question = /[?]|מה|איך|למה|איפה|מתי|כמה|האם|מי|איזה|איזו|אפשר|תוכל|תוכלי/.test(text);
  const followUp = /ספר עוד|תמשיך|תסביר|למה|איך|ואז|ומה עם זה|ומה עוד|באמת/.test(text);
  const trait = String(personality || "סקרן ואוהב לגלות מקומות חדשים").split(",")[0].trim();

  if (!text) return "לא שמעתי אותך טוב. מה רצית לומר?";
  if (/בוא איתי|בוא אחריי|תעקוב אחרי|תעקוב אחריי|תצטרף אלי|תצטרף אליי/.test(text))
    return pick(["בשמחה. אלך איתך, רק תגיד לאן מתחילים.", "בטח! אני מצטרף אליך. נתקדם בקצב נוח.", "רעיון טוב. לאן נלך קודם?"]);
  if (/תפסיק לעקוב|אל תעקוב|תישאר כאן|תחזור לסיור|תפסיק לבוא/.test(text))
    return pick(["בסדר, אחזור למסלול הסיור שלי. נתראה בהמשך.", "אין בעיה. אתן לך להמשיך לבד ואמשיך לטייל באזור.", "כמובן. אשאר כאן ואמשיך בסיור העצמאי שלי."]);
  if (/שלום|היי|אהלן|בוקר טוב|ערב טוב|מה נשמע/.test(text))
    return pick(["היי! טוב לראות אותך שוב. איך הולך?", "שלום! בדיוק יצאתי לסיבוב בעיר. מה התוכניות שלך?", "אהלן! נחמד שנפגשנו. כבר גילית משהו מעניין?"]);
  if (/איך קוראים לך|מה השם שלך|מי אתה/.test(text))
    return "אני " + name + ". " + trait + " — זה בדרך כלל מה שמוציא אותי לסיבוב בעיר.";
  if (/אתה אמיתי|אתה בן אדם|אתה רובוט|אתה ai|בינה מלאכותית/.test(text))
    return "אני תושב וירטואלי במשחק. יש לי מסלול, אופי והעדפות, ואני מנסה להגיב למה שאתה מספר לי ולא רק לחזור על אותה תשובה.";
  if (/מה אתה עושה|מה מעשיך|מה קורה|מה התוכניות שלך/.test(text))
    return "כרגע אני " + trait + ". חשבתי לבדוק מה קורה ברחובות ואולי להיכנס לאחד המקומות בדרך.";
  if (/אתה אוהב|מה אתה חושב|מה דעתך|מה אתה מעדיף/.test(text))
    return pick(["אני נוטה ליהנות מדברים שמתאימים לאופי שלי — " + trait + ". אבל מעניין אותי גם מה אתה מעדיף.", "לדעתי הכי כיף לגלות מקום שלא שמים לב אליו בפעם הראשונה. מה דעתך?", "יש לי העדפות, אבל אני אוהב לשמוע גם רעיונות של אחרים. מה אתה היית בוחר?"]);
  if (/לא הבנת|לא לזה התכוונתי|טעית|זה לא נכון/.test(text))
    return "צודק, כנראה לא הבנתי אותך כמו שצריך. נסח לי את זה קצת אחרת ואנסה לענות לעניין.";
  if (/תודה|מעולה|יופי|נהדר|כל הכבוד/.test(text))
    return pick(["בשמחה! טוב שהצלחתי לעזור.", "בכיף. תמיד אפשר להמשיך לגלות דברים בעיר.", "אין בעד מה. שמח שדיברנו."]);
  if (/להתראות|ביי|אני הולך|נדבר אחר כך/.test(text))
    return pick(["להתראות! אולי ניפגש בסיבוב הבא.", "שיהיה לך טיול מוצלח. נתראה!", "ביי, אני חוזר בינתיים למסלול שלי."]);

  if (topic === "buildings") {
    if (followUp) return pick(["כדאי להתחיל בלובי: משם אפשר למצוא מדרגות או מעלית ולגלות מה יש בקומות.", "אני אוהב לבדוק קודם את הכניסה, ואז לעלות קומה אחת בכל פעם. לפעמים מגלים חדרים מעניינים.", "נסה להיכנס לבניין קרוב ולחקור אותו בלי למהר."]);
    return pick(["יש בעיר הרבה מבנים, וכל אחד מרגיש קצת אחרת. אפשר לפתוח דלתות, להסתובב בלובי ולעלות לקומות.", "אני ממליץ להיכנס לבניין שעדיין לא ביקרת בו. לפעמים דווקא הקומות העליונות מעניינות.", "אם אתה מחפש משהו חדש, בדוק בניין סמוך ונסה למצוא את המדרגות או המעלית."]);
  }
  if (topic === "vehicles") {
    if (followUp) return "מתקרבים לכלי רכב ולוחצים F כדי להיכנס. אחר כך W ו-S שולטים בתנועה ו-A ו-D בהיגוי.";
    return pick(["יש כמה סוגי כלי רכב בעיר. אני אוהב לבחור אחד ולראות לאן אפשר להגיע בלי למהר.", "בחניון אפשר למצוא כלי רכב שונים. מתקרבים ולוחצים F כדי להיכנס.", "נסיעה ברחובות נותנת זווית אחרת על העיר. רק כדאי לשים לב לפניות ולמכשולים."]);
  }
  if (topic === "flight")
    return pick(["אפשר להיכנס למסוק או למטוס ולראות את העיר מלמעלה. הנוף משם ממש שונה.", "הרכבל מחבר בין תחנות גבוהות, והמסוק נותן מבט רחב על כל האזור.", "אם עוד לא ניסית לטוס, חפש את המסוק או המטוס באזור החניה שלהם."]);
  if (topic === "sea")
    return pick(["באזור הים אפשר לשוט לאיים, להיכנס למים ולגלות עולם תת־ימי עם דגים ואלמוגים.", "אני אוהב את ההבדל בין האיים — יש אזורים טרופיים, מושלגים, מדבריים ואפילו אי לבה.", "אפשר להגיע לחוף, לקחת כלי שיט, ואז לחקור את האיים ואת מה שנמצא מתחת לפני המים."]);
  if (topic === "weather")
    return "אפשר לשנות את מזג האוויר ואת השעה בלוח הסביבה. כדאי לראות איך אותה שכונה נראית באור אחר או בגשם.";
  if (topic === "nature")
    return pick(["אני אוהב לעצור ליד הגינות ולשים לב לפרטים הקטנים. לפעמים יש שם יותר ממה שנראה במבט ראשון.", "אפשר לחפש את הפארקים, העצים ובעלי החיים. זה מסלול נחמד כשמתחשק להתרחק קצת מהרחובות.", "יש בעיר ובאיים אזורי טבע שונים. כל אזור מרגיש קצת אחרת."]);
  if (topic === "residents")
    return pick(["לכל תושב יש אופי ומסלול משלו. לפעמים אנחנו נפגשים, משוחחים וממשיכים כל אחד בדרכו.", "אפשר לבקש מתושב להצטרף אליך, ואז לטייל יחד. כשתרצה להמשיך לבד, בקש ממנו להפסיק לעקוב.", "אני משתדל להכיר את התושבים האחרים ולא להישאר כל הזמן באותו מסלול."]);
  if (topic === "activities")
    return pick(["אפשר לבחור בניין שלא ביקרת בו, לחקור את הפארק, לנסות כלי רכב או לצאת לשיט בין האיים. מה נשמע לך הכי מעניין?", "יש כאן הרבה מה לעשות: טיול בעיר, ביקור בחדרים, רכבל, טיסה, שיט וצלילה.", "אני הייתי בוחר מטרה קטנה לסיבוב — למשל להגיע לאי חדש או למצוא מקום שלא ראית."]);

  if (followUp && previousTopic === "buildings") return "כמו שאמרתי, כדאי להתחיל מהכניסה ולחקור את הלובי, המדרגות והקומות בהדרגה.";
  if (followUp && previousTopic === "vehicles") return "אפשר להתקרב לכלי הרכב, להיכנס בעזרת F, ואז לנהוג עם W/A/S/D.";
  if (followUp && previousTopic) return pick(["מעניין אותי להמשיך לגלות את זה יחד. מה בדיוק תרצה לדעת?", "יש בזה עוד כמה פרטים. על איזה חלק אתה רוצה שאספר?", "אני לא רוצה לנחש סתם — איזה פרט מסקרן אותך?"]);

  const previousPlayerLine = [...history].reverse().find((entry) => entry.from === "player")?.text;
  if (previousPlayerLine && question)
    return pick(["אני מבין למה אתה שואל. תן לי עוד פרט אחד ואוכל לכוון אותך טוב יותר.", "זאת שאלה טובה. אני רוצה לוודא שהבנתי: אתה שואל על מה שקורה בעיר או על הדרך לעשות את זה?", "אפשר לבדוק את זה יחד. לאיזה חלק של העיר אתה מתכוון?"]);
  if (/משעמם|אין לי מה לעשות|מה עכשיו/.test(text))
    return "אולי נצא למשימה קטנה: לבחור בניין שעדיין לא ביקרת בו, להגיע לאחד האיים, או למצוא נקודת תצפית חדשה.";
  if (text.length > 18)
    return pick(["קלטתי את מה שאמרת. מה החלק שהכי חשוב לך שאעזור בו?", "מעניין, לא חשבתי על זה כך. תוכל לספר עוד קצת?", "אני רוצה לענות לך בצורה מדויקת — מה היית רוצה שיקרה עכשיו?"]);
  return pick(["מעניין, ספר לי עוד קצת.", "אני מקשיב. מה גרם לך לחשוב על זה?", "הבנתי. ומה היית רוצה לעשות בהמשך?"]);
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

function cableLoopRoute(from) {
  const count = CABLE_STATIONS.length, route = [from];
  for (let i = 1; i <= count; i++) route.push((from + i) % count);
  return route;
}
const CABLE_BENDS = [
  [{ x: -120, y: 54, z: -160 }, { x: -62, y: 51, z: -112 }],
  [{ x: 62, y: 51, z: -112 }, { x: 120, y: 54, z: -160 }],
  [{ x: 160, y: 56, z: -120 }, { x: 112, y: 53, z: -62 }],
  [{ x: 112, y: 53, z: 62 }, { x: 160, y: 56, z: 120 }],
  [{ x: 120, y: 54, z: 160 }, { x: 62, y: 52, z: 112 }],
  [{ x: -62, y: 52, z: 112 }, { x: -120, y: 54, z: 160 }],
  [{ x: -160, y: 56, z: 120 }, { x: -112, y: 53, z: 62 }],
  [{ x: -112, y: 53, z: -62 }, { x: -160, y: 56, z: -120 }]
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
      : kind === "roadMarking"
        ? h("meshStandardMaterial", { roughness: .94, metalness: 0, side: THREE.DoubleSide })
        : kind === "tactile"
          ? h("meshStandardMaterial", { roughness: .9, metalness: 0, side: THREE.DoubleSide })
          : h("meshBasicMaterial", { toneMapped: false });
  return h("instancedMesh", { ref, args: [undefined, undefined, list.length], castShadow: kind === "solid", receiveShadow: kind === "solid" }, h("boxGeometry"), material);
}


function PedestrianCrossingModels({ world }) {
  const postMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#465158", metalness: .58, roughness: .44 }), []);
  const signMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#176b9a", metalness: .12, roughness: .5 }), []);
  const figureMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f5f2e8", roughness: .84 }), []);
  useEffect(() => () => {
    postMaterial.dispose(); signMaterial.dispose(); figureMaterial.dispose();
  }, [postMaterial, signMaterial, figureMaterial]);
  const crossings = (world.crosswalks || []).filter((crossing) => crossing.signal);
  return h(React.Fragment, null, crossings.map((crossing) => {
    const x = crossing.axis === "x" ? crossing.x - 4.08 : crossing.x + 2.15;
    const z = crossing.axis === "x" ? crossing.z + 2.15 : crossing.z - 4.08;
    const yaw = crossing.axis === "x" ? Math.PI / 2 : 0;
    return h("group", { key: "crossing-sign-" + crossing.id, position: [x, 0, z], rotation: [0, yaw, 0] },
      h("mesh", { position: [0, 1.08, 0], castShadow: true }, h("cylinderGeometry", { args: [.045, .065, 2.16, 10] }), h("primitive", { object: postMaterial, attach: "material" })),
      h("mesh", { position: [0, 2.02, 0], castShadow: true }, h("boxGeometry", { args: [.48, .66, .16] }), h("primitive", { object: signMaterial, attach: "material" })),
      h("mesh", { position: [0, 2.22, .094] }, h("sphereGeometry", { args: [.061, 12, 10] }), h("primitive", { object: figureMaterial, attach: "material" })),
      h("mesh", { position: [0, 2.04, .094] }, h("cylinderGeometry", { args: [.033, .039, .16, 8] }), h("primitive", { object: figureMaterial, attach: "material" })),
      ...[-1, 1].map((side) => h("mesh", { key: "arm-" + side, position: [side * .075, 2.06, .094], rotation: [0, 0, side * -.34] }, h("cylinderGeometry", { args: [.014, .014, .15, 7] }), h("primitive", { object: figureMaterial, attach: "material" }))),
      ...[-1, 1].map((side) => h("mesh", { key: "leg-" + side, position: [side * .035, 1.88, .094], rotation: [0, 0, side * .24] }, h("cylinderGeometry", { args: [.016, .016, .17, 7] }), h("primitive", { object: figureMaterial, attach: "material" })))
    );
  }));
}

function TrafficSignal({ crossing }) {
  const lights = useMemo(() => [
    new THREE.MeshStandardMaterial({ color: "#9b302d", emissive: "#f04438", emissiveIntensity: .08, roughness: .3 }),
    new THREE.MeshStandardMaterial({ color: "#9b762f", emissive: "#ffc247", emissiveIntensity: .08, roughness: .3 }),
    new THREE.MeshStandardMaterial({ color: "#327448", emissive: "#45d477", emissiveIntensity: .08, roughness: .3 })
  ], []);
  useEffect(() => () => lights.forEach((material) => material.dispose()), [lights]);
  useFrame(({ clock }) => {
    const phase = clock.elapsedTime % 36;
    const active = crossing.axis === "x"
      ? (phase < 14 ? 2 : phase < 17 ? 1 : 0)
      : (phase < 17 ? 0 : phase < 31 ? 2 : phase < 34 ? 1 : 0);
    lights.forEach((material, index) => {
      material.emissiveIntensity = index === active ? 2.25 : .06;
      material.color.set(index === active ? ["#f04438", "#ffc247", "#45d477"][index] : ["#54201e", "#57421c", "#1c492b"][index]);
    });
  });
  const x = crossing.axis === "x" ? crossing.x + 4.22 : crossing.x + 2.18;
  const z = crossing.axis === "x" ? crossing.z + 2.18 : crossing.z + 4.22;
  const yaw = crossing.axis === "x" ? 0 : Math.PI / 2;
  return h("group", { position: [x, 0, z], rotation: [0, yaw, 0] },
    h("mesh", { position: [0, 1.7, 0], castShadow: true }, h("cylinderGeometry", { args: [.065, .09, 3.4, 10] }), h("meshStandardMaterial", { color: "#45545a", metalness: .62, roughness: .38 })),
    h("mesh", { position: [0, 3.4, 0], castShadow: true }, h("boxGeometry", { args: [.55, 1.12, .38] }), h("meshStandardMaterial", { color: "#252d31", metalness: .32, roughness: .48 })),
    ...lights.map((material, index) => h("mesh", { key: "signal-lamp-" + index, position: [0, 3.78 - index * .36, .205], material }, h("sphereGeometry", { args: [.135, 14, 12] }))),
    h("mesh", { position: [0, 2.88, 0], castShadow: true }, h("boxGeometry", { args: [.82, .1, .62] }), h("meshStandardMaterial", { color: "#3b474b", metalness: .55, roughness: .42 }))
  );
}

function TrafficSignals({ world }) {
  const signals = world.trafficSignals || (world.crosswalks || []).filter((crossing) => crossing.signal);
  return h(React.Fragment, null, signals.map((crossing) => h(TrafficSignal, { key: "traffic-signal-" + crossing.id, crossing })));
}

function UnderwaterAtmosphere({enabled,fogColor,fogNear,fogFar}){
 const {scene}=useThree();
 const blue=useMemo(()=>new THREE.Color("#0b6482"),[]);
 const normal=useMemo(()=>new THREE.Color(),[]);
 useFrame((_,dt)=>{
  if(!scene.fog)return;
  normal.set(fogColor);
  scene.fog.color.lerp(enabled?blue:normal,1-Math.exp(-dt*3));
  scene.fog.near=THREE.MathUtils.damp(scene.fog.near,enabled?4.5:fogNear,3,dt);
  scene.fog.far=THREE.MathUtils.damp(scene.fog.far,enabled?82:fogFar,3,dt);
 });
 return null;
}

function Ground({ wet, buildings, busRoutes = [], curvedRoads = [], alleyways = [], publicSpaces = [] }) {
  const data = useMemo(() => {
    const size = 1536;
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
    surfaceTexture.anisotropy = 4;
    surfaceTexture.needsUpdate = true;
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d"), total = GRID * BLOCK + 120, p = size / total, to = (v) => (v + total / 2) * p;
    const traceCoast = (offset = 0) => {
      ctx.beginPath();
      for (let step = 0; step <= 192; step++) {
        const angle = step / 192 * Math.PI * 2;
        const radius = mainlandCoastRadius(angle) + offset;
        const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
        if (step === 0) ctx.moveTo(to(x), to(z)); else ctx.lineTo(to(x), to(z));
      }
      ctx.closePath();
    };
    // The beach now follows a rounded, gently uneven shoreline instead of a square border.
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#b9a77d"; traceCoast(8); ctx.fill();
    ctx.fillStyle = "#ead6a3"; traceCoast(0); ctx.fill();
    ctx.fillStyle = "#303b43"; traceCoast(-9); ctx.fill();
    ctx.save(); traceCoast(-9); ctx.clip();
    for (let i = 0; i < GRID; i++) for (let k = 0; k < GRID; k++) {
      const x = -CITY_HALF + i * BLOCK + 4, z = -CITY_HALF + k * BLOCK + 4;
      const parkLot = (i === 1 && k === 1) || (i === GRID - 2 && k === GRID - 2);
      const recreationLot = (i === 8 && k === 2) || (i === 7 && k === 8);
      const residentialLot = (i === 0 || i === GRID - 1 || k === 0 || k === GRID - 1) && (i + k) % 2 === 0;
      const civicLot = (i === 4 && k === 3) || (i === 7 && k === 6);
      const heritageLot = i >= 2 && i <= 4 && k >= 5 && k <= 8;
      const gardenQuarterLot = i >= 7 && i <= 9 && k >= 3 && k <= 5;
      const creativeLot = i >= 2 && i <= 4 && k >= 2 && k <= 4;
      const innovationLot = i >= 5 && i <= 8 && k >= 7 && k <= 9;
      const coreLot = Math.abs(i - Math.floor(GRID / 2)) + Math.abs(k - Math.floor(GRID / 2)) <= 3;
      const lotColor = parkLot ? "#788d65" : recreationLot ? "#87966e" : residentialLot ? "#9ca38b" : innovationLot ? "#8d9da0" : gardenQuarterLot ? "#a7ae96" : heritageLot ? "#b4a18e" : creativeLot ? "#aaa9a0" : civicLot ? "#aaa99c" : coreLot ? "#abaea9" : ((i + k) % 2 ? "#b8b5a9" : "#c0bbae");
      ctx.fillStyle = lotColor;
      ctx.fillRect(to(x), to(z), (BLOCK - 8) * p, (BLOCK - 8) * p);
      ctx.strokeStyle = parkLot || recreationLot ? "#91a37a" : "#a49f91";
      ctx.lineWidth = .8;
      if (parkLot || recreationLot || civicLot || gardenQuarterLot) {
        ctx.save();
        const left = x + 1.1, top = z + 1.1, right = x + BLOCK - 9.1, bottom = z + BLOCK - 9.1;
        ctx.beginPath();
        ctx.moveTo(to(left + 2.4), to(top + 5.4));
        ctx.bezierCurveTo(to(left + 8.2), to(top + .2), to(right - 3.4), to(top + 1.1), to(right - .5), to(top + 7.1));
        ctx.bezierCurveTo(to(right + 1.3), to(top + 14.4), to(right - 1.2), to(bottom - 4.2), to(right - 7.4), to(bottom - .6));
        ctx.bezierCurveTo(to(right - 14.8), to(bottom + 1.4), to(left + 8.0), to(bottom - .1), to(left + 2.4), to(bottom - 6.1));
        ctx.bezierCurveTo(to(left - .7), to(bottom - 12.6), to(left - 1.1), to(top + 12.0), to(left + 2.4), to(top + 5.4));
        ctx.closePath();
        ctx.fillStyle = parkLot ? "#718760" : recreationLot ? "#7b8e67" : gardenQuarterLot ? "#829575" : "#98a184";
        ctx.fill();
        ctx.strokeStyle = parkLot || recreationLot ? "#90a37a" : "#b0a88f";
        ctx.lineWidth = Math.max(.8, p * .22);
        ctx.stroke();

        const beds = parkLot
          ? [[7.2, 7.8, 4.8, 2.5], [23.5, 8.2, 5.1, 2.4], [8.8, 26.0, 5.8, 2.7], [25.2, 25.0, 4.3, 2.2]]
          : recreationLot
            ? [[6.5, 8.2, 4.8, 2.6], [25.3, 8.8, 4.2, 2.4], [7.5, 26.2, 5.0, 2.5], [25.2, 25.0, 4.6, 2.4]]
            : gardenQuarterLot
              ? [[5.4, 8.2, 5.1, 2.6], [23.0, 8.6, 4.8, 2.5], [7.0, 24.5, 5.4, 2.4], [24.5, 24.0, 4.2, 2.2]]
              : [[6.2, 7.0, 4.8, 2.2], [25.0, 8.5, 4.5, 2.3], [7.4, 26.0, 4.4, 2.4], [25.0, 25.2, 4.9, 2.1]];
        for (const [dx, dz, rx, rz] of beds) {
          ctx.beginPath();
          ctx.ellipse(to(x + dx), to(z + dz), rx * p, rz * p, .12, 0, Math.PI * 2);
          ctx.fillStyle = parkLot ? "#82966a" : recreationLot ? "#879c70" : "#a5a987";
          ctx.fill();
        }

        ctx.strokeStyle = "#d7cbb0";
        ctx.lineWidth = Math.max(2.4, p * 1.25);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        if (parkLot) {
          ctx.moveTo(to(x + 5), to(z + 25));
          ctx.bezierCurveTo(to(x + 10), to(z + 14), to(x + 17), to(z + 26), to(x + 23), to(z + 17));
          ctx.bezierCurveTo(to(x + 27), to(z + 12), to(x + 23), to(z + 8), to(x + 30), to(z + 6));
          ctx.bezierCurveTo(to(x + 26), to(z + 13), to(x + 32), to(z + 21), to(x + 25), to(z + 29));
        } else if (recreationLot) {
          ctx.moveTo(to(x + 5), to(z + 8));
          ctx.bezierCurveTo(to(x + 13), to(z + 15), to(x + 7), to(z + 23), to(x + 17), to(z + 28));
          ctx.bezierCurveTo(to(x + 24), to(z + 31), to(x + 27), to(z + 21), to(x + 23), to(z + 17));
        } else if (gardenQuarterLot) {
          ctx.moveTo(to(x + 3), to(z + 20));
          ctx.bezierCurveTo(to(x + 9), to(z + 10), to(x + 19), to(z + 12), to(x + 23), to(z + 4));
          ctx.bezierCurveTo(to(x + 28), to(z + 12), to(x + 20), to(z + 22), to(x + 29), to(z + 29));
        } else {
          ctx.moveTo(to(x + 4), to(z + 18));
          ctx.bezierCurveTo(to(x + 10), to(z + 5), to(x + 25), to(z + 5), to(x + 29), to(z + 15));
          ctx.bezierCurveTo(to(x + 33), to(z + 25), to(x + 20), to(z + 31), to(x + 12), to(z + 25));
        }
        ctx.stroke();
        ctx.restore();
      } else if (innovationLot) {
        ctx.fillStyle = "#9aa9ab";
        ctx.fillRect(to(x), to(z), (BLOCK - 8) * p, (BLOCK - 8) * p);
        ctx.strokeStyle = "#697e83";
        ctx.lineWidth = Math.max(.7, p * .22);
        for (let stripe = 0; stripe < 6; stripe++) {
          const xx = x + 2.0 + stripe * 4.3;
          ctx.beginPath(); ctx.moveTo(to(xx), to(z + 1.1)); ctx.lineTo(to(xx), to(z + BLOCK - 9.1)); ctx.stroke();
        }
        ctx.strokeStyle = "#64aeb8";
        ctx.lineWidth = Math.max(1.2, p * .4);
        ctx.beginPath(); ctx.moveTo(to(x + 3), to(z + 4)); ctx.lineTo(to(x + 10), to(z + 4)); ctx.lineTo(to(x + 10), to(z + 10)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(to(x + BLOCK - 14), to(z + BLOCK - 13)); ctx.lineTo(to(x + BLOCK - 7), to(z + BLOCK - 13)); ctx.lineTo(to(x + BLOCK - 7), to(z + BLOCK - 7)); ctx.stroke();
        ctx.strokeStyle = "#d0d9d4"; ctx.lineWidth = Math.max(1, 1.2 * p);
        ctx.strokeRect(to(x + .45), to(z + .45), (BLOCK - 8 - .9) * p, (BLOCK - 8 - .9) * p);
      } else if (heritageLot) {
        ctx.strokeStyle = "#9d8974";
        ctx.lineWidth = Math.max(.8, .42 * p);
        const brickW = 3.25, brickH = 1.55;
        for (let row = 0; row < 18; row++) {
          const zz = z + row * brickH;
          ctx.beginPath();
          ctx.moveTo(to(x), to(zz)); ctx.lineTo(to(x + BLOCK - 8), to(zz));
          ctx.stroke();
          const offset = row % 2 ? brickW / 2 : 0;
          for (let col = -1; col < 9; col++) {
            const xx = x + col * brickW + offset;
            ctx.beginPath(); ctx.moveTo(to(xx), to(zz)); ctx.lineTo(to(xx), to(zz + brickH)); ctx.stroke();
          }
        }
        ctx.strokeStyle = "#d5c1a6"; ctx.lineWidth = Math.max(1, 1.35 * p);
        ctx.strokeRect(to(x + .45), to(z + .45), (BLOCK - 8 - .9) * p, (BLOCK - 8 - .9) * p);
      } else {
        const tileSize = 2.05 + ((i * 3 + k * 5) % 3) * .45;
        for (let t = 0; t < BLOCK - 8; t += tileSize) {
          ctx.beginPath(); ctx.moveTo(to(x + t), to(z)); ctx.lineTo(to(x + t), to(z + BLOCK - 8)); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(to(x), to(z + t)); ctx.lineTo(to(x + BLOCK - 8), to(z + t)); ctx.stroke();
        }
        ctx.strokeStyle = "#d0bd91"; ctx.lineWidth = Math.max(1, 1.35 * p);
        ctx.strokeRect(to(x + .45), to(z + .45), (BLOCK - 8 - .9) * p, (BLOCK - 8 - .9) * p);
      }
      if (residentialLot) {
        ctx.fillStyle = "#82966d";
        ctx.fillRect(to(x + 1.1), to(z + 2.4), 5.2 * p, 3.4 * p);
        ctx.fillRect(to(x + BLOCK - 14), to(z + BLOCK - 13), 5.5 * p, 3.6 * p);
      }
    }
    for (const plaza of publicSpaces) {
      const px = to(plaza.x), pz = to(plaza.z), rx = plaza.radiusX * p, rz = plaza.radiusZ * p;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(px, pz, rx, rz, -.12, 0, Math.PI * 2);
      ctx.fillStyle = plaza.style === "garden" ? "#9aa98b" : plaza.style === "transit" ? "#a3aaa7" : "#b7a58c";
      ctx.fill();
      ctx.strokeStyle = plaza.style === "garden" ? "#d5c8a6" : plaza.style === "transit" ? "#d8e1dc" : "#8c775f";
      ctx.lineWidth = Math.max(1.4, p * .34);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(px, pz, rx * .82, rz * .78, -.12, 0, Math.PI * 2);
      ctx.strokeStyle = plaza.style === "garden" ? "#d7d0b4" : "#d6c5a8";
      ctx.lineWidth = Math.max(1.5, p * .42);
      ctx.setLineDash([p * 1.8, p * .9]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (plaza.style === "heritage") {
        ctx.strokeStyle = "#a48e74";
        ctx.lineWidth = Math.max(.7, p * .2);
        for (let spoke = 0; spoke < 12; spoke++) {
          const angle = spoke / 12 * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(px + Math.cos(angle) * rx * .42, pz + Math.sin(angle) * rz * .42);
          ctx.lineTo(px + Math.cos(angle) * rx * .74, pz + Math.sin(angle) * rz * .7);
          ctx.stroke();
        }
      } else if (plaza.style === "transit") {
        ctx.strokeStyle = "#e5dfcf";
        ctx.lineWidth = Math.max(2, p * .72);
        ctx.lineCap = "round";
        for (const offset of [-.24, .24]) {
          ctx.beginPath();
          ctx.moveTo(to(plaza.x - 11.5), to(plaza.z + offset * 4));
          ctx.lineTo(to(plaza.x - 4.4), to(plaza.z + offset * 4));
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(px, pz, Math.min(rx, rz) * .22, 0, Math.PI * 2);
        ctx.strokeStyle = "#d2ba85";
        ctx.lineWidth = Math.max(1.5, p * .42);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(to(plaza.x - 7.5), to(plaza.z + 6.8));
        ctx.bezierCurveTo(to(plaza.x - 3), to(plaza.z + 1.5), to(plaza.x + 4), to(plaza.z + 7), to(plaza.x + 8.0), to(plaza.z + 2.8));
        ctx.strokeStyle = "#e3d6b8";
        ctx.lineWidth = Math.max(2.2, p * 1.0);
        ctx.lineCap = "round";
        ctx.stroke();
      }
      ctx.restore();
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
    // Replace the straight lane paint on the selected blocks with gently curved markings.
    // The wide asphalt stroke clears the old straight stripes without changing the road footprint.
    for (const road of curvedRoads) {
      const points = road.path || [];
      if (points.length < 2) continue;
      const strokeOffsetPath = (offset) => {
        ctx.beginPath();
        points.forEach((point, index) => {
          const x = to(point.x), z = to(point.z + offset);
          if (index === 0) ctx.moveTo(x, z); else ctx.lineTo(x, z);
        });
      };
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#303b43";
      ctx.lineWidth = Math.max(8.2, p * 7.65);
      strokeOffsetPath(0);
      ctx.stroke();

      ctx.strokeStyle = "#fbfbf5";
      ctx.lineWidth = Math.max(2.1, p * .34);
      ctx.setLineDash([]);
      for (const edge of [-3.72, 3.72]) {
        strokeOffsetPath(edge);
        ctx.stroke();
      }

      ctx.strokeStyle = "#ffe27a";
      ctx.lineWidth = Math.max(2.6, p * .48);
      ctx.setLineDash([p * 2.65, p * 1.45]);
      for (const offset of [-.13, .13]) {
        strokeOffsetPath(offset);
        ctx.stroke();
      }
      ctx.restore();
    }
    for (const alley of alleyways) {
      const points = alley.points || [];
      if (points.length < 2) continue;
      const trace = () => {
        ctx.beginPath();
        points.forEach((point, index) => {
          if (index === 0) ctx.moveTo(to(point.x), to(point.z));
          else ctx.lineTo(to(point.x), to(point.z));
        });
      };
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#8d8475";
      ctx.lineWidth = Math.max(4, p * (alley.width || 1.8) * 1.18);
      trace(); ctx.stroke();
      ctx.strokeStyle = alley.district === "garden" ? "#d4c9a8" : alley.district === "heritage" ? "#c9b28f" : "#bcb5a5";
      ctx.lineWidth = Math.max(3, p * (alley.width || 1.8) * .88);
      trace(); ctx.stroke();
      ctx.strokeStyle = "rgba(91,82,69,.46)";
      ctx.lineWidth = Math.max(.8, p * .12);
      ctx.setLineDash([p * .7, p * .65]);
      trace(); ctx.stroke();
      ctx.restore();
    }
    // The central boulevard's planted median is painted into the ground texture too.
    const boulevardX = -CITY_HALF + Math.floor(GRID / 2) * BLOCK;
    ctx.fillStyle = "#71855f";
    for (let segment = 0; segment < GRID; segment++) {
      const middleZ = -CITY_HALF + segment * BLOCK + BLOCK / 2;
      ctx.fillRect(to(boulevardX - .68), to(middleZ - 5.25), 1.36 * p, 10.5 * p);
    }
    if (busRoutes.length) {
      ctx.save();
      ctx.strokeStyle = "#3c91ad";
      ctx.lineWidth = Math.max(2.2, p * .62);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([p * 4.8, p * 3.1]);
      for (const route of busRoutes) {
        const routePoints = route.path || [];
        if (routePoints.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(to(routePoints[0].x), to(routePoints[0].z));
        for (let index = 1; index < routePoints.length; index++) ctx.lineTo(to(routePoints[index].x), to(routePoints[index].z));
        ctx.stroke();
      }
      ctx.restore();
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
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter; texture.generateMipmaps = true;
    return { texture, surfaceTexture, total };
  }, [buildings, busRoutes, curvedRoads, alleyways, publicSpaces]);
  useEffect(() => () => { data.texture.dispose(); data.surfaceTexture.dispose(); }, [data]);
  return h(React.Fragment, null,
    h("mesh", { rotation: [-Math.PI / 2, 0, 0], receiveShadow: true }, h("planeGeometry", { args: [data.total, data.total] }), h("meshStandardMaterial", { map: data.texture, roughnessMap: data.surfaceTexture, bumpMap: data.surfaceTexture, bumpScale: wet ? .045 : .027, transparent: true, alphaTest: .025, depthWrite: true, roughness: wet ? .24 : .9, metalness: wet ? .24 : .015, envMapIntensity: wet ? 1.3 : .55 })),

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
    const size = heli.scale || 1;
    if (heli.y + 1.95 * size <= yLo || heli.y >= yHi) continue;
    const dx = point.x - heli.x, dz = point.z - heli.z, c = Math.cos(heli.yaw), s = Math.sin(heli.yaw);
    let lx = dx * c - dz * s, lz = dx * s + dz * c;
    const halfW = 1.2 * size + radius, halfL = 4.0 * size + radius;
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
function DiverSuit({ rig }) {
  return h("group", { ref: node => { rig.diverSuit = node; }, visible: false, scale: .95 },
    h("mesh", { position: [0, 1.22, 0], scale: [.34, .5, .25] }, h("sphereGeometry", { args: [1, 16, 12] }), h("meshStandardMaterial", { color: "#123e55", roughness: .52, metalness: .12 })),
    ...[-1, 1].map(side => h("mesh", { key: "sleeve-" + side, position: [side * .28, 1.18, 0], rotation: [0, 0, side * -.22] }, h("cylinderGeometry", { args: [.105, .14, .62, 10] }), h("meshStandardMaterial", { color: "#15516a", roughness: .6 }))),
    ...[-1, 1].map(side => h("mesh", { key: "leg-" + side, position: [side * .1, .48, 0] }, h("cylinderGeometry", { args: [.105, .115, .78, 10] }), h("meshStandardMaterial", { color: "#102f47", roughness: .58 }))),
    h("mesh", { position: [0, 1.28, -.245], rotation: [Math.PI / 2, 0, 0] }, h("cylinderGeometry", { args: [.16, .16, .48, 14] }), h("meshStandardMaterial", { color: "#c1cbd0", metalness: .74, roughness: .3 })),
    h("mesh", { position: [0, 1.92, .08], scale: [.19, .11, .12] }, h("sphereGeometry", { args: [1, 16, 10] }), h("meshPhysicalMaterial", { color: "#71c4d8", transparent: true, opacity: .78, roughness: .12, metalness: .1 })),
    h("mesh", { position: [0, 1.92, .18] }, h("boxGeometry", { args: [.4, .045, .06] }), h("meshStandardMaterial", { color: "#d7a948", metalness: .7, roughness: .28 })),
    ...[-1, 1].map(side => h("mesh", { key: "fin-" + side, position: [side * .1, .08, .24] }, h("boxGeometry", { args: [.18, .08, .46] }), h("meshStandardMaterial", { color: "#e3b34d", roughness: .52 })))
  );
}

function Player({ world, helis, cars, boats, marine, divingRef, airVehicles, elevatorCars, activeVehicleRef, input, onLoc, onPrompt, onMode, onHud, doorStatesRef, toggleDoor, onElevatorMenu, cableRide, cableCurve, elevatorMenuRef, quality, citizensRef, conversationRef, playerPositionRef, onTalk }) {
  const col = useMemo(() => new Collider(world.boxes), [world]);
  const rig = useMemo(() => ({}), []);
  const { camera } = useThree();
  const st = useRef({ p: new THREE.Vector3(...world.spawn), v: new THREE.Vector3(), yaw: Math.PI, face: Math.PI, pitch: .32, dist: 6, heliDist: 14, carDist: 9, airDist: 14, onGround: true, phase: 0, mode: "walk", target: -1, near: -1, nearPerson: -1, nearParkRide: null, parkRide: null, parkRideStart: 0, talkTarget: null, timer: 0, t: 0, lastLoc: "", liftElapsed: 0, actionCooldown: 0, sitY: 0, elevatorTrip: null, elevatorFloor: 0, cableStation: -1, cableTrip: null, cableDescending: false, climbPhase: 0, climbVelocity: 0, elevatorId: -1, hudTimer: 0, cameraReady: false, lastPrompt: "" });
  const terrainGround = (x, z, y, step = .6, radius = .6) => getIslandAt(x, z, marine.islands) ? .28 : col.groundAt(x, z, y, step, Math.max(.2, radius));
  const heliEnv = useMemo(() => ({ ground: (x, z, y, radius = 1) => getIslandAt(x, z, marine.islands) ? .28 : col.groundAt(x, z, y, .6, Math.max(.2, radius)), resolve: (p, a, b, radius) => { col.resolve(p, a, b, radius); resolveClosedDoors(p, a, b, radius, world, doorStatesRef.current); resolveCarObstacles(p, a, b, radius, cars); resolveAirVehicleObstacles(p, a, b, radius, airVehicles); col.resolve(p, a, b, radius); } }), [col, cars, world, doorStatesRef, airVehicles, marine]);
  const carEnv = useMemo(() => ({ ground: heliEnv.ground, resolve: (p, a, b, radius, ignore) => { col.resolve(p, a, b, radius); resolveClosedDoors(p, a, b, radius, world, doorStatesRef.current); resolveCarObstacles(p, a, b, radius, cars, ignore); resolveHelicopterObstacles(p, a, b, radius, helis); resolveAirVehicleObstacles(p, a, b, radius, airVehicles); col.resolve(p, a, b, radius); } }), [col, heliEnv, cars, world, doorStatesRef, helis, airVehicles]);
  const airEnv = useMemo(() => ({ ground: heliEnv.ground, resolve: (p, a, b, radius, ignoreVehicle) => { col.resolve(p, a, b, radius); resolveClosedDoors(p, a, b, radius, world, doorStatesRef.current); resolveCarObstacles(p, a, b, radius, cars); resolveHelicopterObstacles(p, a, b, radius, helis); resolveAirVehicleObstacles(p, a, b, radius, airVehicles, ignoreVehicle); col.resolve(p, a, b, radius); } }), [col, heliEnv, cars, world, doorStatesRef, helis, airVehicles]);
  const temp = useMemo(() => ({ e: new THREE.Euler(), q: new THREE.Quaternion(), v: new THREE.Vector3() }), []);
  const weightList = useMemo(() => world.interactables.filter((x) => x.type === "weights"), [world]);
  const heliList = useMemo(() => world.interactables.filter((x) => x.type === "heli"), [world]);
  const carList = useMemo(() => world.interactables.filter((x) => x.type === "car"), [world]);
  const weightIndices = useMemo(() => { let n = 0; const map = new Map(); world.interactables.forEach((x, i) => { if (x.type === "weights") map.set(i, n++); }); return map; }, [world]);
  const heliIndices = useMemo(() => { let n = 0; const map = new Map(); world.interactables.forEach((x, i) => { if (x.type === "heli") map.set(i, n++); }); return map; }, [world]);
  const carIndices = useMemo(() => { let n = 0; const map = new Map(); world.interactables.forEach((x, i) => { if (x.type === "car") map.set(i, n++); }); return map; }, [world]);
  const airVehicleIndices = useMemo(() => new Map(airVehicles.map((vehicle, index) => [vehicle.id, index])), [airVehicles]);
  const boatIndices = useMemo(() => { let n = 0; const map = new Map(); world.interactables.forEach((item, index) => { if (item.type === "boat") map.set(index, n++); }); return map; }, [world]);
  const sledIndices = useMemo(() => { let n = 0; const map = new Map(); world.interactables.forEach((item, index) => { if (item.type === "sled") map.set(index, n++); }); return map; }, [world]);
  const jetSkiIndices = useMemo(() => { let n = 0; const map = new Map(); world.interactables.forEach((item, index) => { if (item.type === "jetSki") map.set(index, n++); }); return map; }, [world]);
  const parkRides = useMemo(() => getParkRideLocations((world.landmarks || []).find((place) => place.type === "amusement")), [world]);
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
    divingRef.current = s.mode === "swim" || s.mode === "dolphin";
    if (rig.diverSuit) { rig.diverSuit.visible = s.mode === "swim" || s.mode === "dolphin"; rig.diverSuit.position.copy(p); rig.diverSuit.rotation.set(s.mode === "swim" ? (s.waterSwimBlend || 0) * Math.PI / 2 : 0, s.face, 0); }
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
    const moveX = axes.x, moveZ = axes.z, steerX = -moveX;
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
      const climbTargetSpeed = (s.cableDescending ? Math.max(0, -climbingInput) : Math.max(0, climbingInput)) * 2.35;
      s.climbVelocity = THREE.MathUtils.damp(s.climbVelocity || 0, climbTargetSpeed, 8.5, dt);
      const climbSpeed = s.climbVelocity;
      const climbDirection = s.cableDescending ? -1 : 1;
      if (climbSpeed > .015) {
        p.y = THREE.MathUtils.clamp(p.y + climbSpeed * climbDirection * dt, 0, station.y);
        s.climbPhase += climbSpeed * dt * (Math.PI / .38);
      }
      if (s.cableDescending && p.y <= .025) {
        p.set(station.x - 5.55, .02, station.z);
        s.cableDescending = false; s.cableStation = -1; s.climbPhase = 0; s.climbVelocity = 0;
        s.mode = "walk"; s.v.set(0, 0, 0); s.face = -Math.PI / 2; onMode("walk"); onPrompt("");
      } else if (!s.cableDescending && p.y >= station.y - .025) {
        p.set(station.x - 3.7, station.y, station.z);
        s.climbPhase = 0; s.climbVelocity = 0; s.face = Math.PI / 2;
        s.mode = "cable-platform"; onMode("cable-platform");
        const previous = (s.cableStation + CABLE_STATIONS.length - 1) % CABLE_STATIONS.length;
        cableRide.current = { active: false, approaching: true, docked: false, station: s.cableStation, route: [previous, s.cableStation], progress: .91, doorsOpen: false };
        s.lastPrompt = ""; onPrompt("הגעתם לרציף — הקרונית מתקרבת");
      }
      if (root) { root.position.copy(p); root.rotation.set(-.025, s.face, Math.sin(s.climbPhase) * .035); }
      poseHuman(rig, { mode: "climb", phase: s.climbPhase, speed: climbSpeed, direction: climbDirection, air: false, t: s.t, dt });
      camTarget.set(p.x + .4, p.y + 1.25, p.z); camDist = 4.1;
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
          s.cableDescending = true; s.climbPhase = 0; s.climbVelocity = 0; p.x = station.x - 5.55; p.z = station.z; s.face = Math.PI / 2;
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
      resolveClosedDoors(next, p.y + stepHeight, p.y + HEIGHT, RAD, world, doorStatesRef.current);
      p.x = next.x; p.z = next.z;
      let ny = p.y + s.v.y * dt, ceiling = col.ceilingAt(p.x, p.z, p.y + HEIGHT - .05);
      if (ny + HEIGHT > ceiling && s.v.y > 0) { ny = ceiling - HEIGHT; s.v.y = 0; }
      const ground = col.groundAt(p.x, p.z, p.y, stepHeight, stairwell ? .22 : RAD);
      if (ny <= ground || (s.onGround && s.v.y <= 0 && ny - ground < stepHeight)) { ny = ground; s.v.y = 0; s.onGround = true; } else s.onGround = false;
      p.y = ny;
      if (p.y < -20) { p.set(...world.spawn); s.v.set(0, 0, 0); }
      if (!isMainlandLand(p.x, p.z) && !getIslandAt(p.x, p.z, marine.islands)) {
        p.y = -2.7; s.v.set(0, 0, 0); s.waterSwimBlend = 0; s.mode = "swim"; s.onGround = false;
        s.lastPrompt = ""; onMode("swim"); onPrompt("נכנסתם למים · חליפת צלילה הופעלה"); onHud("");
      }
      s.timer -= dt;
      if (s.mode === "walk" && (s.timer <= 0 || act)) {
        s.timer = .14; let best = -1, bestD = Infinity;
        world.interactables.forEach((it, i) => {
          let x = it.x, y = it.y, z = it.z, radius = it.type === "heli" ? 4 : it.type === "boat" ? 5.5 : it.type === "jetSki" ? 7.4 : it.type === "sled" ? 3.8 : it.type === "car" ? 3.5 : it.type === "airVehicle" ? (it.id === "plane" ? 5.2 : 3.8) : it.type === "cable" ? 2.8 : (it.type === "basement" || it.type === "basementExit") ? 2.15 : it.type === "door" ? 2.7 : 1.8;
          if (it.type === "heli") { const item = helis[heliIndices.get(i)]; x = item.x; y = item.y; z = item.z; if (!item.grounded) return; }
          if (it.type === "car") { const item = cars[carIndices.get(i)]; x = item.x; y = item.y; z = item.z; }
          if (it.type === "airVehicle") { const item = airVehicles[airVehicleIndices.get(it.id)]; if (!item) return; x = item.x; y = item.y; z = item.z; }
          if (it.type === "sled") { const item = marine.sleds[sledIndices.get(i)]; if (!item) return; x = item.x; y = item.y; z = item.z; }
          if (it.type === "jetSki") { const item = marine.jetSkis[jetSkiIndices.get(i)]; if (!item) return; x = item.x; y = item.y; z = item.z; }
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
        // Give an entrance door priority over a nearby pedestrian.
        let nearestDoor = -1, nearestDoorD = 2.7;
        world.interactables.forEach((item, index) => {
          if (item.type !== "door" || Math.abs(p.y - item.y) > 2.2) return;
          const distance = Math.hypot(p.x - item.x, p.z - item.z);
          if (distance < nearestDoorD) { nearestDoor = index; nearestDoorD = distance; }
        });
        let nearestParkRide = null, nearestParkRideD = Infinity;
        if (nearestDoor < 0) parkRides.forEach((ride) => {
          const distance = Math.hypot(p.x - ride.x, p.z - ride.z);
          if (Math.abs(p.y) < 1.4 && distance < ride.radius && distance < nearestParkRideD) {
            nearestParkRide = ride;
            nearestParkRideD = distance;
          }
        });
        if (nearestDoor >= 0) { best = nearestDoor; bestD = nearestDoorD; nearestPerson = -1; nearestParkRide = null; }
        else if (nearestParkRide && nearestParkRideD < bestD && nearestParkRideD < nearestPersonD) {
          best = -1; nearestPerson = -1;
        } else {
          nearestParkRide = null;
          if (nearestPerson >= 0 && nearestPersonD < bestD) best = -1;
        }
        s.nearParkRide = nearestParkRide;
        s.nearPerson = nearestPerson;
        s.near = best;
        const person = nearestPerson >= 0 && best < 0 ? citizensRef.current[nearestPerson] : null;
        const it = best >= 0 ? world.interactables[best] : null, actionText = it ? (it.type === "door" && doorStatesRef.current[best] ? "לסגור דלת" : PROMPTS[it.type]) : "";
        const text = person ? `F / פעולה — לדבר עם ${person.name}` : nearestParkRide ? `F / פעולה — לעלות על ${nearestParkRide.label}` : it ? `F / פעולה — ${actionText}` : "";
        if (text !== s.lastPrompt) { s.lastPrompt = text; onPrompt(text); }
      }
      if (act && s.nearParkRide && s.mode === "walk" && s.onGround) {
        const ride = s.nearParkRide;
        const pose = getParkRidePose(ride.type, ride.parkX, ride.parkZ, s.t, 0);
        s.parkRide = ride; s.parkRideStart = s.t; s.mode = "park-ride";
        s.v.set(0, 0, 0); p.set(pose.x, pose.y, pose.z); s.face = pose.yaw;
        s.nearParkRide = null; s.near = -1; s.lastPrompt = "";
        onMode("park-ride"); onPrompt("עליתם על " + ride.label + " · F לירידה");
        onHud(ride.label + " · F לירידה בטוחה");
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
        else if (it.type === "boat") { s.target = boatIndices.get(s.near); s.mode = "boat"; s.v.set(0, 0, 0); onMode("boat"); onPrompt("הסירה מוכנה · W קדימה · S אחורה · A ימינה · D שמאלה"); }
        else if (it.type === "jetSki") { s.target = jetSkiIndices.get(s.near); s.mode = "jetSki"; s.v.set(0, 0, 0); onMode("jetSki"); onPrompt("אופנוע הים מוכן · W קדימה · S אחורה · A ימינה · D שמאלה"); }
        else if (it.type === "sled") { s.target = sledIndices.get(s.near); s.mode = "sled"; s.v.set(0, 0, 0); onMode("sled"); onHud("מזחלת שלג · W קדימה · S אחורה · A ימינה · D שמאלה · F ירידה בעצירה"); onPrompt("עליתם על המזחלת · סעו בזהירות בשלג"); }
        else if (it.type === "airVehicle") { s.target = airVehicleIndices.get(it.id); s.mode = "airVehicle"; onMode("airVehicle"); onPrompt(it.id === "plane" ? "מטוס · W/S תנועה · רווח להמראה · Shift להנמכה" : "טסלה מעופפת · W/S נסיעה · רווח לעלייה נמוכה · Shift לירידה"); }
        else if (it.type === "door") {
          const wasOpen = !!doorStatesRef.current[s.near];
          toggleDoor(s.near);
          s.lastPrompt = "";
          onPrompt(wasOpen ? "הדלת נסגרת" : "הדלת נפתחת");
        }
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
          s.cableDescending = false; s.climbPhase = 0; s.climbVelocity = 0;
          p.set(it.x - .35, 0, it.z); s.face = Math.PI / 2;
          s.mode = "cable-ladder"; s.v.set(0, 0, 0);
          onMode("cable-ladder"); onPrompt("החזיקו ↑ / W כדי לטפס — הידיים והרגליים נעות יחד עם הסולם");
        }
      }
      if (root) { root.position.copy(p); root.rotation.set(0, s.face, 0); }
      s.phase += Math.hypot(s.v.x, s.v.z) * dt * 1.9;
      poseHuman(rig, { mode: "walk", phase: s.phase, speed: Math.hypot(s.v.x, s.v.z), air: !s.onGround, t: s.t, dt });
      camTarget.set(p.x, p.y + 1.55, p.z);
    } else if (s.mode === "park-ride") {
      const ride = s.parkRide;
      if (!ride) {
        s.mode = "walk"; onMode("walk"); onHud(""); onPrompt("");
      } else if (act) {
        p.set(ride.exitX, 0, ride.exitZ);
        p.y = col.groundAt(p.x, p.z, .1, STEP, RAD);
        s.face = Math.PI; s.v.set(0, 0, 0); s.parkRide = null; s.nearParkRide = null;
        s.mode = "walk"; s.hudTimer = 0; onMode("walk"); onHud(""); onPrompt("ירדתם מהמתקן");
      } else {
        const pose = getParkRidePose(ride.type, ride.parkX, ride.parkZ, s.t, 0);
        p.set(pose.x, pose.y, pose.z); s.face = pose.yaw;
        if (root) { root.position.copy(p); root.rotation.set(pose.pitch || 0, pose.yaw, pose.roll || 0); }
        poseHuman(rig, { mode: "sit", phase: 0, speed: 0, air: false, t: s.t, dt });
        camTarget.set(p.x, p.y + 1.28, p.z);
        camDist = ride.type === "ferris" ? 7.2 : ride.type === "coaster" ? 6.4 : 4.8;
        followYaw = pose.yaw;
        s.hudTimer -= dt;
        if (s.hudTimer <= 0) { s.hudTimer = .25; onHud(ride.label + " · F לירידה"); }
        onPrompt("F / פעולה — לרדת מ" + ride.label);
      }
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
        stepCar(car, { throttle: moveZ, steer: steerX, brake: shift || jump }, dt, carEnv);
        if (act && Math.abs(car.speed) < 1.35) {
          const exit = vehicleExitPoint(car.x, car.z, car.yaw, 1.65, marine.islands, -1);
          p.set(exit.x, 0, exit.z); p.y = terrainGround(p.x, p.z, car.y + .4, .7, RAD); col.resolve(p, p.y + STEP, p.y + HEIGHT, RAD);
          s.face = car.yaw; s.mode = "walk"; onMode("walk"); s.target = -1; onPrompt(""); onHud("");
        } else {
          temp.e.set(0, car.yaw, 0, "YXZ"); temp.q.setFromEuler(temp.e);
          if (root) { root.position.copy(temp.v.set(-.34, .52, .22).applyQuaternion(temp.q).add(new THREE.Vector3(car.x, car.y, car.z))); root.rotation.set(0, car.yaw, 0); }
          poseHuman(rig, { mode: "car", phase: 0, speed: 0, air: false, t: s.t, dt });
          p.set(car.x, car.y, car.z); camTarget.set(car.x, car.y + 1.65, car.z); camDist = s.carDist; followYaw = car.yaw;
          s.hudTimer -= dt; if (s.hudTimer <= 0) { s.hudTimer = .2; onHud(`רכב · ${Math.round(Math.abs(car.speed) * 3.6)} קמ״ש · W קדימה · S אחורה · A ימינה · D שמאלה · Shift בלימה`); }
        }
      }
    } else if (s.mode === "boat") {
      const boat = boats[s.target];
      if (!boat) { s.mode = "walk"; s.target = -1; onMode("walk"); }
      else {
        const throttle = Math.max(-1, Math.min(1, moveZ));
        if (jump) boat.speed *= Math.exp(-6 * dt);
        else if (Math.abs(throttle) > .025) boat.speed += throttle * 6.2 * dt;
        else boat.speed *= Math.exp(-.72 * dt);
        boat.speed = THREE.MathUtils.clamp(boat.speed, -4.5, 19.5);
        boat.steering += (steerX - boat.steering) * (1 - Math.exp(-3.8 * dt));
        boat.yaw += boat.steering * .82 * Math.min(1, Math.abs(boat.speed) / 3.5) * dt * Math.sign(boat.speed || 1);
        const nx = boat.x + Math.sin(boat.yaw) * boat.speed * dt, nz = boat.z + Math.cos(boat.yaw) * boat.speed * dt;
        const coastNow = Math.max(Math.abs(boat.x), Math.abs(boat.z)), coastNext = Math.max(Math.abs(nx), Math.abs(nz));
        const islandAtNext = getIslandAt(nx, nz, marine.islands);
        const rememberedDock = boat.dockIsland && boat.speed >= 0
          ? marine.islands.find((item) => item.id === boat.dockIsland &&
            Math.hypot((boat.x - item.x) / (item.rx * .82), (boat.z - item.z) / (item.rz * .82)) <= 1.16)
          : null;
        const dockIsland = islandAtNext || rememberedDock;
        if (isMainlandLand(nx, nz) && coastNext < coastNow) { boat.dockIsland = null; boat.speed *= .2; }
        else if (dockIsland) { boat.dockIsland = dockIsland.id; boat.speed *= .18; }
        else { boat.dockIsland = null; boat.x = THREE.MathUtils.clamp(nx, -1050, 1050); boat.z = THREE.MathUtils.clamp(nz, -1050, 1050); }
        boat.y = getWaterHeight(boat.x, boat.z, s.t);
        p.set(boat.x, boat.y + .36, boat.z);
        if (act && Math.abs(boat.speed) < 1.2) {
          const island = marine.islands.find((item) => item.id === boat.dockIsland) || getIslandAt(boat.x, boat.z, marine.islands);
          if (island) {
            const dx = island.x - boat.x, dz = island.z - boat.z, distance = Math.hypot(dx, dz) || 1;
            let landingX = boat.x + dx / distance * 7.5, landingZ = boat.z + dz / distance * 7.5;
            if (!getIslandAt(landingX, landingZ, marine.islands)) {
              landingX = boat.x + dx / distance * 14;
              landingZ = boat.z + dz / distance * 14;
            }
            if (!getIslandAt(landingX, landingZ, marine.islands)) { landingX = island.x; landingZ = island.z; }
            p.set(landingX, .28, landingZ);
            col.resolve(p, p.y + STEP, p.y + HEIGHT, RAD);
            s.face = Math.atan2(dx, dz); s.onGround = true; s.near = -1;
            s.mode = "walk"; onMode("walk"); onPrompt("הגעתם אל " + island.name + " · אפשר להמשיך ללכת באי");
          }
          else if (isMainlandLand(boat.landX, boat.landZ)) { p.set(boat.landX, .2, boat.landZ); s.mode = "walk"; onMode("walk"); onPrompt("ירדתם אל החוף"); }
          else { p.y = -2.7; s.mode = "swim"; onMode("swim"); onPrompt("נכנסתם למים · מצב צלילה הופעל"); }
          boat.dockIsland = null; boat.speed = 0; s.target = -1; s.v.set(0, 0, 0); onHud("");
        } else {
          temp.e.set(0, boat.yaw, 0, "YXZ"); temp.q.setFromEuler(temp.e);
          if (root) { root.position.copy(temp.v.set(0, .55, -.25).applyQuaternion(temp.q).add(new THREE.Vector3(boat.x, boat.y, boat.z))); root.rotation.set(0, boat.yaw, 0); }
          poseHuman(rig, { mode: "car", phase: 0, speed: 0, air: false, t: s.t, dt });
          camTarget.set(boat.x, boat.y + 2.1, boat.z); camDist = 8; followYaw = boat.yaw;
          s.hudTimer -= dt;
          if (s.hudTimer <= 0) { s.hudTimer = .2; onHud("סירה · W/S קדימה ואחורה · A ימינה · D שמאלה · F ירידה בעצירה"); }
          onPrompt(Math.abs(boat.speed) < 1.2 ? "F / פעולה — לרדת מהסירה" : "עצרו את הסירה כדי לרדת");
        }
      }
    } else if (s.mode === "jetSki") {
      const jetSki = marine.jetSkis[s.target];
      if (!jetSki) { s.mode = "walk"; s.target = -1; onMode("walk"); onHud(""); }
      else {
        const throttle = Math.max(-1, Math.min(1, moveZ));
        if (jump) jetSki.speed *= Math.exp(-7.5 * dt);
        else if (Math.abs(throttle) > .025) jetSki.speed += throttle * 8.4 * dt;
        else jetSki.speed *= Math.exp(-.68 * dt);
        jetSki.speed = THREE.MathUtils.clamp(jetSki.speed, -3.8, 25);
        jetSki.steering += (steerX - jetSki.steering) * (1 - Math.exp(-5.2 * dt));
        jetSki.yaw += jetSki.steering * 1.12 * Math.min(1, Math.abs(jetSki.speed) / 3.2) * dt * Math.sign(jetSki.speed || 1);
        const nx = THREE.MathUtils.clamp(jetSki.x + Math.sin(jetSki.yaw) * jetSki.speed * dt, -1050, 1050);
        const nz = THREE.MathUtils.clamp(jetSki.z + Math.cos(jetSki.yaw) * jetSki.speed * dt, -1050, 1050);
        if (!getIslandAt(nx, nz, marine.islands) && !isMainlandLand(nx, nz)) { jetSki.x = nx; jetSki.z = nz; }
        else jetSki.speed *= .2;
        jetSki.y = getWaterHeight(jetSki.x, jetSki.z, s.t);
        p.set(jetSki.x, jetSki.y + .47, jetSki.z);
        if (act && Math.abs(jetSki.speed) < 1.15) {
          p.set(jetSki.landX, .2, jetSki.landZ);
          col.resolve(p, p.y + STEP, p.y + HEIGHT, RAD);
          s.face = jetSki.yaw; s.onGround = true; s.near = -1;
          s.mode = "walk"; s.target = -1; s.v.set(0, 0, 0);
          onMode("walk"); onHud(""); onPrompt("ירדתם מאופנוע הים אל החוף");
        } else {
          temp.e.set(0, jetSki.yaw, 0, "YXZ"); temp.q.setFromEuler(temp.e);
          if (root) { root.position.copy(temp.v.set(0, .57, -.36).applyQuaternion(temp.q).add(new THREE.Vector3(jetSki.x, jetSki.y, jetSki.z))); root.rotation.set(0, jetSki.yaw, 0); }
          poseHuman(rig, { mode: "car", phase: 0, speed: 0, air: false, t: s.t, dt });
          camTarget.set(jetSki.x, jetSki.y + 1.7, jetSki.z); camDist = 6.2; followYaw = jetSki.yaw;
          s.hudTimer -= dt;
          if (s.hudTimer <= 0) { s.hudTimer = .2; onHud("אופנוע ים · " + Math.round(Math.abs(jetSki.speed) * 3.6) + " קמ״ש · W קדימה · S אחורה · A ימינה · D שמאלה · רווח בלימה"); }
          onPrompt(Math.abs(jetSki.speed) < 1.15 ? "F / פעולה — לרדת מאופנוע הים" : "האטו כדי לרדת מאופנוע הים");
        }
      }
    } else if (s.mode === "sled") {
      const sled = marine.sleds[s.target];
      if (!sled) { s.mode = "walk"; s.target = -1; onMode("walk"); onHud(""); }
      else {
        const throttle = Math.max(-1, Math.min(1, moveZ));
        if (jump) sled.speed *= Math.exp(-5.5 * dt);
        else if (Math.abs(throttle) > .025) sled.speed += throttle * 5.2 * dt;
        else sled.speed *= Math.exp(-1.05 * dt);
        sled.speed = THREE.MathUtils.clamp(sled.speed, -2.8, 13.5);
        sled.steering += (steerX - sled.steering) * (1 - Math.exp(-4.2 * dt));
        sled.yaw += sled.steering * 1.18 * Math.min(1, Math.abs(sled.speed) / 2.6) * dt * Math.sign(sled.speed || 1);
        const nx = sled.x + Math.sin(sled.yaw) * sled.speed * dt;
        const nz = sled.z + Math.cos(sled.yaw) * sled.speed * dt;
        if (getIslandAt(nx, nz, marine.islands)?.id === sled.islandId) { sled.x = nx; sled.z = nz; }
        else sled.speed *= .18;
        p.set(sled.x, .28, sled.z);
        if (act && Math.abs(sled.speed) < 1.1) {
          const exit = vehicleExitPoint(sled.x, sled.z, sled.yaw, 1.35, marine.islands, -1);
          p.set(exit.x, .28, exit.z); s.mode = "walk"; s.target = -1; s.v.set(0, 0, 0); s.onGround = true;
          onMode("walk"); onHud(""); onPrompt("ירדתם מהמזחלת באי השלג");
        } else {
          temp.e.set(0, sled.yaw, 0, "YXZ"); temp.q.setFromEuler(temp.e);
          if (root) { root.position.copy(temp.v.set(0, .62, -.35).applyQuaternion(temp.q).add(new THREE.Vector3(sled.x, .28, sled.z))); root.rotation.set(0, sled.yaw, 0); }
          poseHuman(rig, { mode: "car", phase: 0, speed: 0, air: false, t: s.t, dt });
          camTarget.set(sled.x, 2.05, sled.z); camDist = 7.2; followYaw = sled.yaw;
          s.hudTimer -= dt;
          if (s.hudTimer <= 0) { s.hudTimer = .22; onHud("מזחלת שלג · W קדימה · S אחורה · A ימינה · D שמאלה · רווח בלימה"); }
          onPrompt(Math.abs(sled.speed) < 1.1 ? "F / פעולה — לרדת מהמזחלת" : "האטו כדי לרדת מהמזחלת");
        }
      }
    } else if (s.mode === "swim") {
      // Underwater movement defaults to upright walking. Holding Shift blends into a surface-swim stroke.
      s.waterSwimBlend = THREE.MathUtils.damp(s.waterSwimBlend || 0, shift ? 1 : 0, 5.5, dt);
      const swimBlend = s.waterSwimBlend;
      const worldMove = cameraRelativeMove(moveX, moveZ, s.yaw);
      const speed = THREE.MathUtils.lerp(3.35, 5.35, swimBlend);
      s.v.x += (worldMove.x * speed - s.v.x) * (1 - Math.exp(-4.5 * dt));
      s.v.z += (worldMove.z * speed - s.v.z) * (1 - Math.exp(-4.5 * dt));
      p.x += s.v.x * dt; p.z += s.v.z * dt;
      const surfaceHeight = getWaterHeight(p.x, p.z, s.t);
      const targetHeight = THREE.MathUtils.lerp(-2.7, surfaceHeight + .12, swimBlend);
      const vertical = (jump ? 1 : 0) - (inp.down ? 1 : 0);
      if (vertical) p.y = THREE.MathUtils.clamp(p.y + vertical * 3.2 * dt, -22, surfaceHeight + .16);
      else p.y += (targetHeight - p.y) * (1 - Math.exp(-2.7 * dt));
      if (Math.hypot(worldMove.x, worldMove.z) > .1) {
        const target = Math.atan2(worldMove.x, worldMove.z); let delta = target - s.face;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta)); s.face += delta * (1 - Math.exp(-4 * dt)); followYaw = s.face;
      }
      let nearestDolphin=-1,nearestDolphinDistance=4.2;
      marine.dolphins.forEach((d,index)=>{
        if(!d.active||d.ridden)return;
        const distance=Math.hypot(p.x-d.x,p.z-d.z);
        if(distance<nearestDolphinDistance&&Math.abs(p.y-d.y)<3.2){nearestDolphin=index;nearestDolphinDistance=distance;}
      });
      if(nearestDolphin>=0){
        const dolphin=marine.dolphins[nearestDolphin];
        onPrompt("F / פעולה — לעלות על הדולפין");
        if(act){
          dolphin.ridden=true; dolphin.active=true;
          s.target=nearestDolphin; s.mode="dolphin"; s.face=dolphin.yaw;
          p.set(dolphin.x,dolphin.y+1.05,dolphin.z); s.v.set(0,0,0);
          onMode("dolphin"); onHud("רכיבה על דולפין · W קדימה · S אחורה · A ימינה · D שמאלה · F לרדת");
          onPrompt("עליתם על הדולפין! אפשר לכוון אותו עם W A S D");
        }
      } else onPrompt("");
      if(s.mode==="swim"){
      const island = getIslandAt(p.x, p.z, marine.islands);
      if (island) { p.y = .28; s.v.set(0, 0, 0); s.mode = "walk"; s.onGround = true; s.lastPrompt = ""; onMode("walk"); onHud(""); onPrompt("הגעתם אל " + island.name); }
      else if (isMainlandLand(p.x, p.z)) { p.y = .2; s.v.set(0, 0, 0); s.mode = "walk"; s.onGround = true; s.lastPrompt = ""; onMode("walk"); onHud(""); onPrompt("חזרתם לחוף העיר"); }
      else {
        if (root) { root.position.copy(p); root.rotation.set(0, s.face, 0); }
        s.phase += Math.hypot(s.v.x, s.v.z) * dt * THREE.MathUtils.lerp(1.35, 1.05, swimBlend);
        poseHuman(rig, { mode: "water", phase: s.phase, speed: Math.hypot(s.v.x, s.v.z), swimBlend, air: false, t: s.t, dt });
        camTarget.set(p.x, p.y + THREE.MathUtils.lerp(1.45, .45, swimBlend), p.z);
        camDist = THREE.MathUtils.lerp(6.2, 4.9, swimBlend); followYaw = s.face;
        s.hudTimer -= dt;
        if (s.hudTimer <= 0) { s.hudTimer = .35; onHud("הליכה במים · Shift לשחייה על פני המים · רווח לעלייה · כפתור ירידה לצלילה עמוקה"); }
      }
      }
    } else if (s.mode === "dolphin") {
      const dolphin=marine.dolphins[s.target];
      if(!dolphin){
        s.mode="swim"; s.target=-1; onMode("swim");
      } else if(act){
        dolphin.ridden=false; dolphin.active=true;
        p.set(dolphin.x-Math.sin(dolphin.yaw)*1.4,dolphin.y,dolphin.z-Math.cos(dolphin.yaw)*1.4);
        s.mode="swim"; s.target=-1; s.v.set(0,0,0);
        onMode("swim"); onHud("צלילה · W/A/S/D לשחייה · רווח לעלייה · Shift להעמקה");
        onPrompt("ירדתם מהדולפין");
      } else {
        if(jump)dolphin.speed*=Math.exp(-5*dt);
        else if(Math.abs(moveZ)>.025)dolphin.speed+=moveZ*5.8*dt;
        else dolphin.speed*=Math.exp(-.9*dt);
        dolphin.speed=THREE.MathUtils.clamp(dolphin.speed,-3.2,12);
        dolphin.yaw+=steerX*1.35*Math.min(1,Math.abs(dolphin.speed)/2.8)*dt*Math.sign(dolphin.speed||1);
        const nx=dolphin.x+Math.sin(dolphin.yaw)*dolphin.speed*dt;
        const nz=dolphin.z+Math.cos(dolphin.yaw)*dolphin.speed*dt;
        if(!getIslandAt(nx,nz,marine.islands)&&!isMainlandLand(nx,nz)){
          dolphin.x=THREE.MathUtils.clamp(nx,-1050,1050);
          dolphin.z=THREE.MathUtils.clamp(nz,-1050,1050);
        } else dolphin.speed*=.2;
        dolphin.y=-2.45+(jump?Math.sin(s.t*8)*.28:0);
        p.set(dolphin.x,dolphin.y+1.05,dolphin.z); s.face=dolphin.yaw;
        if(root){root.position.set(dolphin.x,dolphin.y+.48,dolphin.z);root.rotation.set(0,dolphin.yaw,0);}
        poseHuman(rig,{mode:"car",phase:0,speed:0,air:false,t:s.t,dt});
        camTarget.set(p.x,p.y+.25,p.z); camDist=6.3; followYaw=dolphin.yaw;
        s.hudTimer-=dt;
        if(s.hudTimer<=0){s.hudTimer=.25;onHud("רכיבה על דולפין · W קדימה · S אחורה · A ימינה · D שמאלה · רווח לבלימה");}
        onPrompt("F / פעולה — לרדת מהדולפין");
      }
    } else if (s.mode === "airVehicle") {
      const vehicle = airVehicles[s.target];
      if (!vehicle) { s.mode = "walk"; onMode("walk"); }
      else {
        const lift = (jump ? 1 : 0) - (shift || inp.down ? 1 : 0);
        stepAirVehicle(vehicle, { throttle: moveZ, steer: steerX, lift, piloted: true }, dt, airEnv);
        const canExit = canExitAirVehicle(vehicle, airEnv.ground);
        if (act && canExit) {
          const exit = vehicleExitPoint(vehicle.x, vehicle.z, vehicle.yaw, 2.8, marine.islands, -1);
          p.set(exit.x, 0, exit.z);
          p.y = terrainGround(p.x, p.z, vehicle.y, .8, .55);
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
            onHud(label + " · " + Math.round(Math.abs(vehicle.speed) * 3.6) + " קמ״ש · W/S קדימה ואחורה · A ימינה · D שמאלה · רווח עלייה · Shift הנמכה");
          }
          onPrompt(canExit ? "F / פעולה — לצאת מכלי הטיס" : "כדי לצאת: להנמיך ולעצור");
        }
      }
    } else if (s.mode === "heli") {
      const heli = helis[s.target];
      if (!heli) { s.mode = "walk"; onMode("walk"); }
      else {
        const lift = (jump ? 1 : 0) - (shift || inp.down ? 1 : 0);
        stepHeli(heli, { fwd: moveZ, turn: steerX, lift, piloted: true }, dt, heliEnv);
        if (act && canExitHeli(heli)) {
          const exitDistance = 2.6 * (heli.scale || 1);
          const exit = vehicleExitPoint(heli.x, heli.z, heli.yaw, exitDistance, marine.islands, 1);
          p.set(exit.x, 0, exit.z);
          p.y = terrainGround(p.x, p.z, heli.y + .5, .6, Math.max(.2, (heli.radius || 1) * .6));
          s.face = heli.yaw; s.mode = "walk"; onMode("walk"); s.target = -1; onPrompt("");
        }
        else {
          temp.e.set(heli.pitch, heli.yaw, heli.roll, "YXZ"); temp.q.setFromEuler(temp.e);
          if (root) { root.position.copy(new THREE.Vector3(0, .69, .5).applyQuaternion(temp.q).add(temp.v.set(heli.x, heli.y, heli.z))); root.quaternion.copy(temp.q); }
          poseHuman(rig, { mode: "heli", phase: 0, speed: 0, air: false, t: s.t, dt });
          p.set(heli.x, heli.y, heli.z); camTarget.set(heli.x, heli.y + 2, heli.z); camDist = s.heliDist; followYaw = heli.yaw;
          s.hudTimer -= dt; if (s.hudTimer <= 0) { s.hudTimer = .2; onHud("מסוק · " + Math.round(Math.hypot(heli.vx, heli.vz) * 3.6) + " קמ״ש · W/S קדימה ואחורה · A ימינה · D שמאלה · רווח לעלייה · Shift לירידה · גובה " + Math.round(heli.y) + " מ׳"); }
          onPrompt(canExitHeli(heli) ? "F / פעולה — לצאת מהמסוק" : "");
        }
      }
    }
    helis.forEach((heli, i) => { if (!(s.mode === "heli" && i === s.target) && heli.rotor > 0) stepHeli(heli, { fwd: 0, turn: 0, lift: 0, piloted: false }, dt, heliEnv); });
    airVehicles.forEach((vehicle, i) => { if (!(s.mode === "airVehicle" && i === s.target)) stepAirVehicle(vehicle, { throttle: 0, steer: 0, lift: 0, piloted: false }, dt, airEnv); });
    if (followYaw !== null && performance.now() / 1000 - inp.lastDrag > 1.2) { let d = followYaw - s.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); s.yaw += d * (1 - Math.exp(-2.5 * dt)); }
    const mall = (world.landmarks || []).find((place) => place.type === "mall");
    const insideMall = !!mall && s.mode === "walk" && Math.abs(p.x - mall.x) < 10.0 && Math.abs(p.z - mall.z) < 9.8 && p.y > -.1 && p.y < 7.0;
    if (insideMall) {
      camTarget.y = p.y + 1.42;
      camDist = Math.min(camDist, 4.1);
    }
    const underwaterView=s.mode==="swim"||s.mode==="dolphin";
    const cameraPitch=underwaterView?-0.1:s.pitch;
    const back = new THREE.Vector3(-Math.sin(s.yaw) * Math.cos(cameraPitch), Math.sin(cameraPitch), -Math.cos(s.yaw) * Math.cos(cameraPitch));
    let distance = camDist;
    const underground = p.y < -.5;
    for (let t = .3; t <= camDist; t += .3) { const test = camTarget.clone().addScaledVector(back, t); if (col.pointInside(test.x, test.y, test.z, .2) || (!underground && test.y < .2)) { distance = Math.max(.3, t - .25); break; } }
    const desired = camTarget.clone().addScaledVector(back, distance);
    if(underwaterView)desired.y=Math.min(desired.y,-.72);
    if(insideMall) desired.y=Math.min(desired.y,p.y+2.9);
    if (!s.cameraReady) { camera.position.copy(desired); s.cameraReady = true; }
    camera.position.lerp(desired, 1 - Math.exp(-6 * dt));
    if(underwaterView)camera.position.y=Math.min(camera.position.y,-.58);
    camera.lookAt(camTarget);
    const islandHere = getIslandAt(p.x, p.z, marine.islands);
    const place = s.mode === "heli" ? "בטיסה מעל העיר" : s.mode === "airVehicle" ? (airVehicles[s.target]?.id === "plane" ? "בטיסה במטוס" : "בטסלה המעופפת") : s.mode === "cable" ? "ברכבל גבוה מעל העיר" : s.mode === "boat" ? "בדרך לאיים בסירה" : s.mode === "jetSki" ? "רוכבים באופנוע ים" : s.mode === "swim" ? "מתחת למים" : s.mode === "dolphin" ? "רכיבה על דולפין" : islandHere ? islandHere.name : locate(world, p.x, p.y, p.z);
    const label = s.mode === "heli" || s.mode === "airVehicle" || s.mode === "cable" || s.mode === "boat" || s.mode === "swim" || s.mode === "dolphin" || islandHere ? place : place ? `${place.building} · קומה ${place.floor} · ${place.room}` : "ברחובות העיר";
    if (label !== s.lastLoc) { s.lastLoc = label; onLoc(label); }
  });
  return h(React.Fragment, null,
    h("directionalLight", { position: [50, 105, 45], intensity: 2.1, color: "#fff0d1", castShadow: true, "shadow-mapSize": [quality === "high" ? 2048 : quality === "balanced" ? 1536 : 1024, quality === "high" ? 2048 : quality === "balanced" ? 1536 : 1024], "shadow-camera-left": -185, "shadow-camera-right": 185, "shadow-camera-top": 185, "shadow-camera-bottom": -185, "shadow-camera-near": 1, "shadow-camera-far": 420, "shadow-bias": -0.00018, "shadow-normalBias": 0.025, "shadow-radius": quality === "high" ? 4 : 2 }),
    h(Human, { rig }),
    h(DiverSuit, { rig })
  );
}

export default function Game() {
  const marine = useMemo(() => createMarineWorld(), []);
  const world = useMemo(() => {
    const city = generateWorld(7);
    city.islands = marine.islands;
    city.boxes.push(...createIslandCollisionBoxes(marine.islands));
    city.interactables.push(...marine.boats.map(boat => ({ ...boat, type: "boat" })));
    city.interactables.push(...(marine.sleds||[]).map(sled => ({ ...sled, type: "sled" })));
    city.interactables.push(...(marine.jetSkis||[]).map(jetSki => ({ ...jetSki, type: "jetSki" })));
    return city;
  }, [marine]);
  const boats = marine.boats;
  const cableCurve = useMemo(() => makeCableCurve(), []);
  const input = useRef({ keys: new Set(), drag: { dx: 0, dy: 0 }, lastDrag: -10, zoom: 0, joy: { x: 0, y: 0 }, action: false, up: false, down: false, closeTalk: false, elevatorFloor: null });
  const [loc, setLoc] = useState("ברחובות העיר"), [started, setStarted] = useState(false), [help, setHelp] = useState(true);
  const [prompt, setPrompt] = useState(""), [hud, setHud] = useState(""), [mode, setMode] = useState("walk");
  const [weather, setWeather] = useState("clear"), [hour, setHour] = useState(14), [clockRunning, setClockRunning] = useState(false), [quality, setQuality] = useState("balanced");
  const [elevatorMenu, setElevatorMenu] = useState(null), [doorStates, setDoorStates] = useState({});
  const [conversation, setConversation] = useState(null), [chatDraft, setChatDraft] = useState("");
  const doorRef = useRef({}), cableRide = useRef({ active: false, route: [], progress: 0 }), divingRef = useRef(false);
  const elevatorCars = useMemo(() => (world.elevators || []).map((layout) => ({ layout, y: { current: 0 }, moving: { current: false }, occupant: null })), [world]);
  const citizensRef = useRef([]), conversationRef = useRef(null), playerPositionRef = useRef({ x: world.spawn[0], y: world.spawn[1], z: world.spawn[2] });
  const joyRef = useRef(null), [knob, setKnob] = useState({ x: 0, y: 0 });
  const [cameraDrag, setCameraDrag] = useState(null);
  const environment = useMemo(() => getEnvironmentProfile(weather, hour, quality), [weather, hour, quality]);
  const helis = useMemo(() => world.interactables.filter((item) => item.type === "heli").map((item) => Object.assign(makeHeli(item.x, item.y, item.z, item.face, item.scale || 1, item.padSize || 6), { npcControlled: !!item.npcControlled })), [world]);
  const cars = useMemo(() => world.interactables.filter((item) => item.type === "car").map((item) => Object.assign(makeCar(item.x, item.y, item.z, item.face, item.color, item.kind), { npcControlled: !!item.npcControlled, busRouteId: item.busRouteId, passengerCount: item.passengerCount || 0, doorOpen: false })), [world]);
  const airVehicles = useMemo(() => (world.parkingVehicles || []).map(makeAirVehicle), [world]);
  const activeVehicleRef = useRef({ mode: "walk", target: -1 });
  const weightList = useMemo(() => world.interactables.filter((item) => item.type === "weights"), [world]);
  const toggleDoor = useCallback((index) => { const next = { ...doorRef.current, [index]: !doorRef.current[index] }; doorRef.current = next; setDoorStates(next); }, []);
  const beginConversation = useCallback((person) => {
    const greeting = "שלום, אני " + person.name + ". " + String(person.personality || "אוהב לגלות מקומות חדשים").split(",")[0] + ". נחמד שנפגשנו — מה מעניין אותך היום?";
    person.bubbleText = "שלום! מה שלומך?";
    person.bubbleUntil = Number.POSITIVE_INFINITY;
    conversationRef.current = { personId: person.id, bubbleText: person.bubbleText };
    setConversation({ personId: person.id, npcName: person.name, personality: person.personality, topic: "", messages: [{ from: "npc", text: greeting }] });
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
    const topic = getNpcTopic(message, conversation.topic);
    const reply = makeNpcReply(conversation.npcName, message, conversation.messages.length, topic, currentPerson?.personality || conversation.personality, conversation.messages);
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
      if ((event.code === "KeyF" || String(event.key).toLowerCase() === "f") && !event.repeat) input.current.action = true;
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
      h(Canvas, { shadows: quality === "high", dpr: quality === "high" ? Math.min(window.devicePixelRatio || 1, 1.4) : quality === "balanced" ? Math.min(window.devicePixelRatio || 1, 1.15) : Math.min(window.devicePixelRatio || 1, 1), camera: { fov: 60, near: .1, far: 600 }, gl: { antialias: true, powerPreference: "high-performance" }, onCreated: ({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.12; gl.setClearColor(environment.skyColor); } },
        h("color", { attach: "background", args: [environment.skyColor] }), h("fog", { attach: "fog", args: [environment.fogColor, environment.fogNear, environment.fogFar] }),
         h(UnderwaterAtmosphere, { enabled: mode === "swim" || mode === "dolphin", fogColor: environment.fogColor, fogNear: environment.fogNear, fogFar: environment.fogFar }),
        h(Sky, { sunPosition: environment.sunPosition, turbidity: environment.turbidity, rayleigh: 1.2 + environment.daylight * .5, mieCoefficient: weather === "fog" ? .012 : .004 }),
        h("hemisphereLight", { args: [environment.hemisphereSky, environment.hemisphereGround, environment.hemisphereIntensity] }), h("ambientLight", { intensity: environment.ambientIntensity }),
        h(Environment, { resolution: quality === "high" ? 128 : quality === "balanced" ? 80 : 48 }, h(Lightformer, { intensity: 1.35 + environment.daylight, position: [0, 10, 0], rotation: [Math.PI / 2, 0, 0], scale: [24, 22, 1] }), h(Lightformer, { intensity: .72, color: "#ffd9a8", position: [-10, 3, -5], rotation: [0, Math.PI / 2, 0], scale: [22, 5, 1] }), h(Lightformer, { intensity: .62, color: "#b9d9ed", position: [12, 5, -9], rotation: [0, -Math.PI / 3, 0], scale: [14, 6, 1] }), h(Lightformer, { intensity: .42, color: "#f0e0c3", position: [-4, 8, 13], rotation: [0, Math.PI / 2.8, 0], scale: [12, 8, 1] })),
        h(WeatherEffects, { weather, profile: environment }), h(AmbientLife, { quality }), h(BirdFlocks), h(StreetLights, { lamps: world.lamps, nightFactor: environment.nightFactor, quality }), h(QualityMonitor, { onLevel: setQuality }),
        h(Ground, { wet: weather === "rain" || weather === "storm", buildings: world.buildings, busRoutes: world.busRoutes, curvedRoads: world.curvedRoads, alleyways: world.alleyways, publicSpaces: world.publicSpaces }),
        h(MarineWorld, { marine, boats, divingRef, quality }),
        h(Cableway, { ride: cableRide, curve: cableCurve }),
        h(Boxes, { world, kind: "solid" }), h(Boxes, { world, kind: "glow" }), h(Boxes, { world, kind: "glass" }),
        h(Boxes, { world, kind: "roadMarking" }), h(Boxes, { world, kind: "tactile" }),
        h(PedestrianCrossingModels, { world }),
        h(TrafficSignals, { world }),
        h(Trees, { world, nightFactor: environment.nightFactor }), h(CityDetails, { buildings: world.buildings, trees: world.trees, windStrength: environment.windStrength, nightFactor: environment.nightFactor }), h(CityLandmarks, { world, helis }),
        h(AnimatedWorld, { world, windStrength: environment.windStrength }),
        h(DoorSet, { world, doorStates }), ...elevatorCars.map((car) => h(ElevatorModel, { key: car.layout.id, layout: car.layout, y: car.y, moving: car.moving })),
        h(Helicopters, { helis }), h(Cars, { cars }), h(ParkingModels, { airVehicles }),
        h(Citizens, { world, cars, helis, airVehicles, elevatorCars, activeVehicleRef, citizensRef, conversationRef, playerPositionRef, doorStatesRef: doorRef, onDoorToggle: toggleDoor }),
        h(Player, { world, helis, cars, boats, marine, divingRef, airVehicles, elevatorCars, activeVehicleRef, input, onLoc: setLoc, onPrompt: setPrompt, onMode: setMode, onHud: setHud, doorStatesRef: doorRef, toggleDoor, onElevatorMenu: setElevatorMenu, cableRide, cableCurve, quality, citizensRef, conversationRef, playerPositionRef, onTalk: beginConversation })
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
    hud && (mode === "heli" || mode === "car" || mode === "boat" || mode === "swim" || mode === "dolphin" || mode === "airVehicle" || mode === "lift" || mode === "treadmill" || mode === "cable" || mode === "park-ride") && h("div", { className: "hud-panel vehicle-hud" }, hud),
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
        h("li", null, "חניון מרכז העיר: F ליד רכב, ג׳יפ, מכונית מרוץ, אוטובוס או טנק כדי להיכנס. W קדימה, S אחורה, A ימינה ו־D שמאלה; Shift בלימה ברכב."),
        h("li", null, "מטוס: F כדי להיכנס, W/S לתנועה, A/D להיגוי, רווח להמראה ו־Shift להנמכה. טסלה מעופפת: F כדי להיכנס, W/S לנסיעה, A/D להיגוי, רווח לעלייה נמוכה ו־Shift לירידה; מאחור יוצא עשן בזמן תנועה."),
        h("li", null, "תושבי העיר הם דמויות AI: הם מטיילים, עוצרים ומסתכלים סביב, נכנסים למכוניות, נוסעים ומטיסים מסוק, מטוס וטסלה. אפשר להשתלט על כלי רכב שה-AI נוהג בהם כשמתקרבים ולוחצים F."),
        h("li", null, "מסוק: W קדימה, S אחורה, A ימינה, D שמאלה, רווח עלייה, Shift ירידה"),
        h("li", null, "סירות: F ליד סירה בחוף כדי לעלות. W/S לשוט, A ימינה · D שמאלה, רווח לבלום, ו־F לרדת כשהסירה בעצירה. אפשר להגיע לאיים."),
        h("li", null, "צלילה: כשיורדים מהחוף ונכנסים למים חליפת צלילה מופעלת והמצלמה צוללת איתכם. W/A/S/D לשחות, רווח לעלות ו־Shift להעמיק; חפשו דגים, מדוזות, סוסוני ים, אלמוגים ודולפינים."),
        h("li", null, "דולפינים: כשדולפין מתקרב בזמן צלילה, לחצו F כדי לעלות עליו. W/S לשוט קדימה ואחורה, A/D לכוון, רווח לבלום ו־F לרדת. גם בכפתורי המגע אפשר לכוון את הדולפין."),
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
    h("button", { className: "jump-btn", onPointerDown: (e) => { e.stopPropagation(); input.current.keys.add(mode === "cable-ladder" || mode === "cable" ? "ArrowUp" : "Space"); }, onPointerUp: () => { input.current.keys.delete(mode === "cable-ladder" || mode === "cable" ? "ArrowUp" : "Space"); }, onPointerCancel: () => { input.current.keys.delete(mode === "cable-ladder" || mode === "cable" ? "ArrowUp" : "Space"); } }, mode === "heli" || mode === "airVehicle" || mode === "swim" ? "עלייה" : mode === "car" || mode === "boat" || mode === "dolphin" ? "בלימה" : mode === "cable-ladder" ? "טיפוס ↑" : mode === "cable" ? "קדימה ↑" : "קפיצה"),
    (mode === "heli" || mode === "airVehicle" || mode === "swim" || mode === "cable-ladder" || mode === "cable") && h("button", { className: "vehicle-down-btn", onPointerDown: (e) => { e.stopPropagation(); if (mode === "cable-ladder" || mode === "cable") input.current.keys.add("ArrowDown"); else input.current.down = true; }, onPointerUp: () => { input.current.keys.delete("ArrowDown"); input.current.down = false; }, onPointerCancel: () => { input.current.keys.delete("ArrowDown"); input.current.down = false; } }, mode === "cable" ? "אחורה ↓" : "ירידה"),
    !started && h("div", { className: "start-overlay" }, h("div", { className: "start-card" },
      h("h1", null, "עיר פתוחה"), h("p", null, "עיר תלת־ממדית לחקור: בניינים מפורטים, חוף וים, 36 סירות, שמונה איים שונים, עולם תת־ימי עם יצורים ימיים, ורכבל עם שמונה תחנות מעל העיר."),
      h("button", { className: "start-btn", onClick: () => setStarted(true) }, "יוצאים לדרך"),
      h("a", { className: "privacy-note", href: "./privacy.html" }, "מדיניות פרטיות")
    ))
  );
}
