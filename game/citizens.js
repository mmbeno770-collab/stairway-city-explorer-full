import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Human, poseHuman, applyHumanAppearance } from "./human.js";
import { Collider, BLOCK, CITY_HALF } from "./world.js";
import { makeElevatorTrip, advanceElevatorTrip } from "./elevator-sim.js";
import { stepCar, resolveCarObstacles } from "./car-sim.js";
import { stepHeli } from "./heli-sim.js";
import { stepAirVehicle, resolveAirVehicleObstacles } from "./air-vehicle-sim.js";

const h = React.createElement;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const CITIZEN_SHIRTS = ["#8b3f4a", "#3f7c58", "#bb8741", "#556b9a", "#8a689b", "#4f8c8f", "#b26b4f", "#6e7b4e", "#8b8e98", "#d0ad88"];
const CITIZEN_PANTS = ["#343434", "#4d5969", "#5c463b", "#365b4a", "#6b566f", "#766b58"];
const CITIZEN_SKIN = ["#a96f55", "#d39a7d", "#8f5a43", "#c78d70", "#e0ae8d", "#b8795e"];
const CITIZEN_HAIR = ["#241a16", "#4b3025", "#6b4b32", "#77706a", "#342b28"];
const CITIZEN_HEADWEAR = ["#283f6b", "#5a3544", "#345846", "#6b5a3b", "#4f5665", "#654b82"];

function makeCitizenAppearance(index) {
  const shirt = CITIZEN_SHIRTS[(index * 3) % CITIZEN_SHIRTS.length];
  const pants = CITIZEN_PANTS[(index * 5 + 1) % CITIZEN_PANTS.length];
  const skin = CITIZEN_SKIN[(index * 3 + 2) % CITIZEN_SKIN.length];
  const hair = CITIZEN_HAIR[(index * 2 + 1) % CITIZEN_HAIR.length];
  return {
    shirt, shirtHighlight: shirt,
    pants, pantsHighlight: pants,
    skin, skinHighlight: skin, skinShadow: skin,
    hair, hairHighlight: hair,
    shoe: index % 2 === 0 ? "#3b4148" : "#51463d",
    shoeDark: "#24282d",
    headwearColor: CITIZEN_HEADWEAR[index % CITIZEN_HEADWEAR.length],
    headwearTrim: "#c5b17b",
    headwear: index % 2 === 0,
    backpack: index % 3 !== 1,
    scale: .92 + (index % 6) * .025
  };
}
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const localOffset = (x, z, ox, oz, yaw) => {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return { x: x + ox * c + oz * s, z: z - ox * s + oz * c };
};

function makeWalkRoute(building) {
  const gapX = (BLOCK - (building.x1 - building.x0)) * .5 - 4;
  const gapZ = (BLOCK - (building.z1 - building.z0)) * .5 - 4;
  const left = building.x0 - gapX + 1.12, right = building.x1 + gapX - 1.12;
  const top = building.z0 - gapZ + 1.12, bottom = building.z1 + gapZ - 1.12;
  const midX = (building.x0 + building.x1) * .5, midZ = (building.z0 + building.z1) * .5;
  return [
    { x: midX, z: top }, { x: right, z: top },
    { x: right, z: midZ }, { x: right, z: bottom },
    { x: midX, z: bottom }, { x: left, z: bottom },
    { x: left, z: midZ }, { x: left, z: top }
  ];
}

const WALKER_NAMES = ["אורי","דוד","יונתן","משה","אליהו","יעקב","נחום","שמואל","בנימין","אלעד","אריאל","נעם","אבישי","עמיחי","מתניה","איתן","יהודה","הלל","רפאל","אברהם","יצחק","שלמה","מנחם","מאיר","דניאל","אלעזר","עוזיאל","גדעון","נפתלי","אפרים","חיים","יוסף","ברוך","זאב","נתנאל","אלחנן","אבנר","אורי־אל","בועז","גבריאל","גרשון","דביר","הראל","זכריה","חנניה","טוביה","יואל","כפיר","ליאור","מיכאל","נחמן","סיני","עובדיה","פנחס","צבי","קובי","רועי","שמעיה","תומר","יאיר"];
const PERSONALITIES = ["סקרן, בודק כל סמטה ומחפש מקומות חדשים","רגוע, אוהב לטייל לאט ולהתבונן בנוף","חברותי, יוזם שיחות ומכיר תושבים חדשים","חובב טכנולוגיה, מתעניין במעליות ובמערכות העיר","חובב אדריכלות, בוחן חזיתות ומרפסות","צלם עירוני, מחפש נקודות צילום מעניינות","מתכנן מסלולים, מעדיף דרכים מסודרות","משקיף, אוהב לעלות לגגות ולראות את העיר","קורא נלהב, מבקר בספריות ובחדרי לימוד","חובב ספורט, עוצר ליד מתקני הכושר","אוהב טבע, בודק עצים וגינות","חובב תחבורה, מתעניין באוטובוסים וברכבים","אוהב אמנות, מחפש גלריות וקירות מיוחדים","חובב מוזיקה, מחפש אולפנים ומקומות שקטים","חוקר סקרן, בודק כניסות וחדרים","מסביר פנים, תמיד מברך אנשים ברחוב","עצמאי, בוחר מסלול חדש בכל סיבוב","זהיר, עוצר לפני מעברים ומכשולים","אנרגטי, הולך בקצב מהיר יחסית","מהורהר, אוהב לעצור ולצפות בתנועה","מתעניין בהיסטוריה של המבנים","אוהב גינות, מחפש פינות ירוקות","חובב משחקים, בודק אולמות משחקים","חוקר עסקים, נכנס לחנויות ולבתי קפה","אוהב תצפיות, בוחר רחובות פתוחים","מסודר, חוזר לבקר במקומות מוכרים","סבלני, מחכה לפעמים לחברים בדרך","חובב מפות, בודק את הרחובות סביבו","חברותי במיוחד, משוחח עם שכנים","אוהב שקט, בוחר מסלולים פחות עמוסים","סקרן לגבי בנייה, מסתכל על הקומות העליונות","חובב עיצוב, מתעניין בחלונות ובמרפסות","נהנה מהפארק וממתקני המשחק","מחפש מקומות חדשים לשבת בהם","אוהב להכיר שכונות שונות","מתעניין במזג האוויר ובשינויי האור","אוהב לצפות בציפורים מעל העיר","משוטט, מחליף מסלול לעיתים קרובות","מנומס, מפנה מקום להולכי רגל אחרים","מתעניין במבנים גבוהים ובמעליות","חובב בתי קפה, מחפש מקום לעצירה","אוהב מרחבים פתוחים וכיכרות","מסתכל על פרטים קטנים בבניינים","אוהב לבקר חברים בבניינים סמוכים","נמרץ, יוצא לסיורים תכופים","מתעניין ברכבל ובתחנות שלו","אוהב ללמוד על העיר דרך שיחות","חובב צמחייה, מתבונן בעצים ובערוגות","משתף אחרים בתגליות קטנות","מתכנן ביקורים מראש ונצמד לתוכנית","מחפש מעברים נוחים בין הרחובות","מתעניין באורות החלונות בשעות הערב","אוהב לגלות חדרים עם שימושים שונים","מתבונן בתנועה בצמתים","נהנה מטיולים ארוכים בין שכונות","אוהב לעצור ליד מזרקות","סקרן לגבי גגות וציוד שעליהם","מעדיף סיבובים קצרים ופגישות רבות","אוהב למצוא את הדרך הקצרה ביותר","משלב הליכה, ביקורים ושיחות בכל סיור"];

const ROUTINE_PROFILES = [
  { id: "curious", pace: .96, pauseChance: .22, pauseMin: 2.1, pauseMax: 3.7, cooldownMin: 9, cooldownMax: 16, socialRate: .9, visitMin: 20, visitMax: 34, look: "scan" },
  { id: "calm", pace: .78, pauseChance: .34, pauseMin: 3.0, pauseMax: 5.0, cooldownMin: 8, cooldownMax: 14, socialRate: .72, visitMin: 27, visitMax: 42, look: "look" },
  { id: "social", pace: .94, pauseChance: .12, pauseMin: 1.8, pauseMax: 2.8, cooldownMin: 13, cooldownMax: 21, socialRate: 1.55, visitMin: 22, visitMax: 36, look: "look" },
  { id: "busy", pace: 1.18, pauseChance: .07, pauseMin: 1.2, pauseMax: 2.0, cooldownMin: 17, cooldownMax: 25, socialRate: .62, visitMin: 13, visitMax: 23, look: "inspect" },
  { id: "observer", pace: .88, pauseChance: .28, pauseMin: 2.7, pauseMax: 4.6, cooldownMin: 10, cooldownMax: 17, socialRate: .82, visitMin: 24, visitMax: 39, look: "inspect" },
  { id: "wanderer", pace: 1.04, pauseChance: .16, pauseMin: 1.7, pauseMax: 3.0, cooldownMin: 11, cooldownMax: 19, socialRate: 1.05, visitMin: 18, visitMax: 31, look: "scan" }
];

function randomRange(person, min, max) {
  return min + nextRandom(person) * (max - min);
}

function nextPersonalVisitDelay(person) {
  const profile = person.routineProfile || ROUTINE_PROFILES[0];
  return randomRange(person, profile.visitMin, profile.visitMax);
}

function startPersonalRoutine(person, now) {
  const profile = person.routineProfile || ROUTINE_PROFILES[0];
  if (person.routineCooldown > 0 || person.visiting || person.followPlayer || person.ridingElevator) return false;
  person.routineCooldown = randomRange(person, profile.cooldownMin, profile.cooldownMax);
  if (nextRandom(person) > profile.pauseChance) return false;
  const duration = randomRange(person, profile.pauseMin, profile.pauseMax);
  person.routineAction = profile.look;
  person.routineTimer = duration;
  person.routineDuration = duration;
  person.routineStartYaw = person.yaw;
  const building = person.building;
  const targetYaw = building
    ? Math.atan2((building.x0 + building.x1) * .5 - person.x, (building.z0 + building.z1) * .5 - person.z)
    : person.yaw + (nextRandom(person) - .5) * 1.4;
  person.routineTurn = profile.look === "inspect"
    ? angleDiff(targetYaw, person.yaw)
    : (nextRandom(person) < .5 ? -1 : 1) * randomRange(person, .45, .95);
  person.wait = 0;
  person.moveSpeed = 0;
  if (profile.id === "social" && nextRandom(person) < .18) {
    person.bubbleText = ["אולי אפגוש כאן מישהו מוכר.", "נעים לטייל בעיר היום.", "מעניין מי עוד מסתובב כאן."][Math.floor(nextRandom(person) * 3)];
    person.bubbleUntil = now + duration;
  }
  return true;
}

function makeStairTour(building) {
  const stair = building.basementStairwell;
  if (!stair) return [];
  const up = [];
  for (let floor = 0; floor < building.floors.length; floor++) {
    for (let step = 0; step < 8; step++) {
      up.push({ x: stair.x0 + 1, z: stair.z0 + .25 + step * .5, precise: true });
    }
    up.push({ x: stair.x0 + 3, z: stair.z0 + 3.75, precise: true });
    for (let step = 1; step < 8; step++) {
      up.push({ x: stair.x0 + 3, z: stair.z0 + 3.75 - step * .5, precise: true });
    }
  }
  return [...up, ...up.slice(0, -1).reverse()];
}

function findBuildingDoor(world, building) {
  const width = building.x1 - building.x0;
  const cells = Math.max(1, Math.floor(width / 3.6));
  const doorX = building.x0 + (Math.floor(cells / 2) + .5) * (width / cells);
  const doorZ = building.z0 + .3;
  return world.interactables.findIndex((item) => item.type === "door" && Math.abs(item.x - doorX) < .16 && Math.abs(item.z - doorZ) < .16);
}

function makeBuildingVisitRoute(building, world, useElevator = false) {
  const doorIndex = findBuildingDoor(world, building);
  const door = doorIndex >= 0 ? world.interactables[doorIndex] : null;
  const doorX = door?.x ?? (building.x0 + building.x1) * .5;
  const doorZ = door?.z ?? building.z0 + .3;
  const approach = { x: doorX, z: doorZ - 2.35 };
  const lift = world.elevators?.[building.elevatorId];

  if (useElevator && lift) {
    return [
      { ...approach, action: "open" },
      { x: doorX, z: doorZ + 1.05 },
      { x: doorX, z: doorZ + 2.7 },
      { x: lift.approachX, z: lift.z, action: "elevatorUp" },
      { x: lift.approachX - 1.1, z: lift.z + 1.7, action: "pause" },
      { x: lift.approachX, z: lift.z, action: "elevatorDown" },
      { x: doorX, z: doorZ + 2.7 },
      { x: doorX, z: doorZ + 1.05 },
      approach,
      { ...approach, action: "close" }
    ];
  }

  const stair = building.basementStairwell;
  const stairEntry = stair ? { x: stair.x0 + 1, z: stair.z0 - .45 } : { x: doorX, z: doorZ + 3.2 };
  const stairs = makeStairTour(building);
  return [
    { ...approach, action: "open" },
    { x: doorX, z: doorZ + 1.05 },
    { x: doorX, z: doorZ + 2.7 },
    stairEntry,
    ...stairs,
    stairEntry,
    { x: doorX, z: doorZ + 2.7 },
    { x: doorX, z: doorZ + 1.05 },
    approach,
    { ...approach, action: "close" }
  ];
}


function nearestLoopIndex(loop, x, z) {
  let index = 0, best = Infinity;
  loop.forEach((point, i) => {
    const d = Math.hypot(point.x - x, point.z - z);
    if (d < best) { best = d; index = i; }
  });
  return index;
}

function loopPath(loop, startIndex, targetIndex) {
  if (!loop.length) return [];
  const collect = (direction) => {
    const path = [loop[startIndex]];
    let index = startIndex;
    for (let guard = 0; guard < loop.length && index !== targetIndex; guard++) {
      index = (index + direction + loop.length) % loop.length;
      path.push(loop[index]);
    }
    return path;
  };
  const forward = collect(1), backward = collect(-1);
  return forward.length <= backward.length ? forward : backward;
}

function nextRandom(person) {
  person.rngState = (Math.imul(person.rngState, 1664525) + 1013904223) >>> 0;
  return person.rngState / 4294967296;
}

function chooseAdjacentBuilding(person, world) {
  const home = person.building;
  const neighbors = (world.buildings || []).filter((building) =>
    Math.abs(building.gridX - home.gridX) + Math.abs(building.gridZ - home.gridZ) === 1
  );
  if (!neighbors.length) return home;
  return neighbors[Math.floor(nextRandom(person) * neighbors.length)];
}

function routeToVisit(person, destination, world) {
  const sourceLoop = person.sidewalkRoute;
  const targetLoop = makeWalkRoute(destination);
  const visitRoute = person.visitRoute;
  if (!sourceLoop.length || !targetLoop.length) return visitRoute;

  const startIndex = nearestLoopIndex(sourceLoop, person.x, person.z);
  const targetDoorIndex = nearestLoopIndex(targetLoop, visitRoute[0].x, visitRoute[0].z);
  const dx = destination.gridX - person.building.gridX;
  const dz = destination.gridZ - person.building.gridZ;

  if (Math.abs(dx) + Math.abs(dz) !== 1) {
    const sourceDoorIndex = nearestLoopIndex(sourceLoop, visitRoute[0].x, visitRoute[0].z);
    return [...loopPath(sourceLoop, startIndex, sourceDoorIndex), ...visitRoute];
  }

  let sourceExitIndex, targetEntryIndex, sourceEdge, crossA, crossB, targetEdge;
  if (dx !== 0) {
    const upper = (person.rngState & 1) === 0;
    sourceExitIndex = dx > 0 ? (upper ? 1 : 3) : (upper ? 7 : 5);
    targetEntryIndex = dx > 0 ? (upper ? 7 : 5) : (upper ? 1 : 3);
    const boundaryX = -CITY_HALF + (dx > 0 ? person.building.gridX + 1 : person.building.gridX) * BLOCK;
    const rowNorth = -CITY_HALF + person.building.gridZ * BLOCK;
    const crossingZ = rowNorth + (upper ? 4.2 : BLOCK - 4.2);
    sourceEdge = { x: sourceLoop[sourceExitIndex].x, z: crossingZ };
    targetEdge = { x: targetLoop[targetEntryIndex].x, z: crossingZ };
    crossA = { x: boundaryX - Math.sign(dx) * 3.6, z: crossingZ, action: "crossingWait" };
    crossB = { x: boundaryX + Math.sign(dx) * 3.6, z: crossingZ, action: "crossingFinish" };
  } else {
    const east = (person.rngState & 1) === 0;
    sourceExitIndex = dz > 0 ? 4 : 0;
    targetEntryIndex = dz > 0 ? 0 : 4;
    const boundaryZ = -CITY_HALF + (dz > 0 ? person.building.gridZ + 1 : person.building.gridZ) * BLOCK;
    const columnWest = -CITY_HALF + person.building.gridX * BLOCK;
    const crossingX = columnWest + (east ? BLOCK - 4.2 : 4.2);
    sourceEdge = { x: crossingX, z: sourceLoop[sourceExitIndex].z };
    targetEdge = { x: crossingX, z: targetLoop[targetEntryIndex].z };
    crossA = { x: crossingX, z: boundaryZ - Math.sign(dz) * 3.6, action: "crossingWait" };
    crossB = { x: crossingX, z: boundaryZ + Math.sign(dz) * 3.6, action: "crossingFinish" };
  }

  const toCrosswalk = loopPath(sourceLoop, startIndex, sourceExitIndex);
  const alongDestinationSidewalk = loopPath(targetLoop, targetEntryIndex, targetDoorIndex);
  return [...toCrosswalk, sourceEdge, crossA, crossB, targetEdge, ...alongDestinationSidewalk.slice(1), ...visitRoute];
}

function pedestrianCrossingStatus(from, to, cars) {
  if (!from || !to) return { safe: false, car: null };
  const dx = to.x - from.x, dz = to.z - from.z, length = Math.hypot(dx, dz);
  if (length < .1) return { safe: true, car: null };
  const ux = dx / length, uz = dz / length;
  let blockingCar = null, closestTime = Infinity;
  for (const car of cars) {
    const speed = Math.abs(car.speed || 0);
    const clearance = Math.max(3.0, (car.length || 4.15) * .5 + .95);
    if (speed < .65) {
      const along = clamp((car.x - from.x) * ux + (car.z - from.z) * uz, 0, length);
      const nearestX = from.x + ux * along, nearestZ = from.z + uz * along;
      if (Math.hypot(car.x - nearestX, car.z - nearestZ) < clearance) {
        blockingCar = car;
        closestTime = 0;
      }
      continue;
    }
    const vx = Math.sin(car.yaw) * car.speed, vz = Math.cos(car.yaw) * car.speed;
    let minDistance = Infinity, minTime = 0;
    // Predict near-future vehicle movement across the full pedestrian path.
    for (let sample = 0; sample <= 15; sample++) {
      const time = sample * .3;
      const px = car.x + vx * time, pz = car.z + vz * time;
      const along = clamp((px - from.x) * ux + (pz - from.z) * uz, 0, length);
      const nearestX = from.x + ux * along, nearestZ = from.z + uz * along;
      const separation = Math.hypot(px - nearestX, pz - nearestZ);
      if (separation < minDistance) { minDistance = separation; minTime = time; }
    }
    if (minDistance < clearance && minTime < closestTime) {
      closestTime = minTime;
      blockingCar = car;
    }
  }
  return { safe: !blockingCar, car: blockingCar };
}

function pedestrianInCarPath(car, walkers) {
  const speed = Math.abs(car.speed || 0);
  if (speed < .2) return false;
  const direction = Math.sign(car.speed || 1);
  const forwardX = Math.sin(car.yaw) * direction;
  const forwardZ = Math.cos(car.yaw) * direction;
  for (const person of walkers) {
    if (!person.crossingActive || Math.abs(person.y - (car.y || 0)) > 1.2) continue;
    const dx = person.x - car.x, dz = person.z - car.z;
    const along = dx * forwardX + dz * forwardZ;
    const lateral = Math.abs(dx * forwardZ - dz * forwardX);
    if (along > -1.6 && along < 7.2 && lateral < (car.width || 1.9) * .5 + .95) return true;
  }
  return false;
}

function getTrafficLane(car) {
  const laneAxis = Math.abs(Math.sin(car.yaw)) >= Math.abs(Math.cos(car.yaw)) ? "x" : "z";
  const crossCoordinate = laneAxis === "x" ? car.z : car.x;
  const laneCenter = -CITY_HALF + Math.round((crossCoordinate + CITY_HALF) / BLOCK) * BLOCK;
  const laneDirection = laneAxis === "x"
    ? Math.sign(Math.sin(car.yaw)) || 1
    : Math.sign(Math.cos(car.yaw)) || 1;
  return {
    laneAxis, laneCenter, laneDirection,
    laneOffset: crossCoordinate - laneCenter
  };
}

function autonomousCarSteering(car, driver) {
  const targetYaw = driver.laneAxis === "x"
    ? (driver.laneDirection > 0 ? Math.PI / 2 : -Math.PI / 2)
    : (driver.laneDirection > 0 ? 0 : Math.PI);
  const crossCoordinate = driver.laneAxis === "x" ? car.z : car.x;
  const laneError = driver.laneCenter + driver.laneOffset - crossCoordinate;
  const rightCrossSign = driver.laneAxis === "x" ? -driver.laneDirection : driver.laneDirection;
  const headingCorrection = angleDiff(targetYaw, car.yaw) * 1.05;
  const laneCorrection = laneError * rightCrossSign * .18;
  return clamp(headingCorrection + laneCorrection, -.48, .48);
}

function autonomousCarTraffic(car, cars) {
  let closestGap = Infinity, leadCar = null;
  const forwardX = Math.sin(car.yaw), forwardZ = Math.cos(car.yaw);
  const halfLength = (car.length || 4.15) * .5;
  for (const other of cars) {
    if (other === car || Math.abs((other.y || 0) - (car.y || 0)) > 1.2) continue;
    const dx = other.x - car.x, dz = other.z - car.z;
    const along = dx * forwardX + dz * forwardZ;
    const lateral = Math.abs(dx * forwardZ - dz * forwardX);
    const laneTolerance = (car.width || 1.9) * .5 + (other.width || 1.9) * .5 + .72;
    if (along <= .4 || along > 24 || lateral > laneTolerance) continue;
    const gap = along - halfLength - (other.length || 4.15) * .5;
    if (gap < closestGap) { closestGap = gap; leadCar = other; }
  }
  if (!leadCar) return { throttle: .62, brake: false, gap: Infinity };
  const desiredGap = 5.6 + Math.min(Math.abs(car.speed || 0), 9) * .72;
  const hardGap = Math.max(3.15, desiredGap * .48);
  if (closestGap <= hardGap || (Math.abs(leadCar.speed || 0) < .35 && closestGap < desiredGap)) {
    return { throttle: 0, brake: true, gap: closestGap };
  }
  if (closestGap < desiredGap) {
    const room = (closestGap - hardGap) / Math.max(.1, desiredGap - hardGap);
    return { throttle: clamp(room * .62, .08, .62), brake: false, gap: closestGap };
  }
  return { throttle: .62, brake: false, gap: closestGap };
}

function autonomousTrafficSignal(car, driver, world, now) {
  const crossings = world.trafficSignals || (world.crosswalks || []).filter((crossing) => crossing.signal);
  const expectedCrossingAxis = driver.laneAxis === "z" ? "x" : "z";
  const carAlong = driver.laneAxis === "x" ? car.x : car.z;
  let nearestDistance = Infinity;
  for (const crossing of crossings) {
    if (crossing.axis !== expectedCrossingAxis) continue;
    const lateral = driver.laneAxis === "x" ? Math.abs(car.z - crossing.z) : Math.abs(car.x - crossing.x);
    if (lateral > 4.9) continue;
    const line = driver.laneAxis === "x" ? crossing.x : crossing.z;
    const distance = (line - carAlong) * driver.laneDirection;
    if (distance > -1.5 && distance < 23 && distance < nearestDistance) nearestDistance = distance;
  }
  if (!Number.isFinite(nearestDistance)) return { stop: false, distance: Infinity, phase: "green" };

  const cycle = now % 36;
  const laneGreen = driver.laneAxis === "z"
    ? cycle < 14
    : cycle >= 17 && cycle < 31;
  const laneYellow = driver.laneAxis === "z"
    ? cycle >= 14 && cycle < 17
    : cycle >= 31 && cycle < 34;
  const speed = Math.abs(car.speed || 0);
  const comfortableStopDistance = 6.3 + Math.min(2.2, speed * .22);
  const shouldStop = !laneGreen && (laneYellow ? nearestDistance > comfortableStopDistance : true);
  return { stop: shouldStop && nearestDistance > -1.5, distance: nearestDistance, phase: laneGreen ? "green" : laneYellow ? "yellow" : "red" };
}

function updateCityBus(car, driver, cars, walkers, world, now, dt, carEnv) {
  const path = driver.busRoute;
  if (!path?.length) return;
  if (driver.busStopTimer > 0) {
    driver.busStopTimer = Math.max(0, driver.busStopTimer - dt);
    car.speed = 0;
    car.brake = true;
    car.doorOpen = true;
    if (driver.busStopTimer <= 0) {
      car.doorOpen = false;
      driver.busRouteIndex = (driver.busRouteIndex + 1) % path.length;
    }
    return;
  }

  let target = path[driver.busRouteIndex];
  if (!target) {
    driver.busRouteIndex = 0;
    target = path[0];
  }
  const distance = Math.hypot(target.x - car.x, target.z - car.z);
  if (target.stopId !== undefined && distance < 2.35 && Math.abs(car.speed || 0) < 1.25) {
    const exiting = Math.min(driver.passengerCount, target.stopId % 2 + 1);
    const boarding = [2, 3, 1, 2][target.stopId] || 1;
    driver.passengerCount = Math.min(5, driver.passengerCount - exiting + boarding);
    car.passengerCount = driver.passengerCount;
    car.speed = 0;
    car.brake = true;
    car.doorOpen = true;
    driver.busStopTimer = 4.6;
    return;
  }
  if (target.stopId === undefined && distance < 2.9) {
    driver.busRouteIndex = (driver.busRouteIndex + 1) % path.length;
    target = path[driver.busRouteIndex];
  }

  const nextDx = target.x - car.x, nextDz = target.z - car.z;
  const laneAxis = Math.abs(nextDx) >= Math.abs(nextDz) ? "x" : "z";
  driver.laneAxis = laneAxis;
  driver.laneDirection = Math.sign(laneAxis === "x" ? nextDx : nextDz) || driver.laneDirection || 1;
  const crossCoordinate = laneAxis === "x" ? car.z : car.x;
  driver.laneCenter = -CITY_HALF + Math.round((crossCoordinate + CITY_HALF) / BLOCK) * BLOCK;
  driver.laneOffset = crossCoordinate - driver.laneCenter;

  const desiredYaw = Math.atan2(nextDx, nextDz);
  const steer = clamp(angleDiff(desiredYaw, car.yaw) * 1.18, -.72, .72);
  const stopTarget = target.stopId !== undefined;
  const desiredSpeed = stopTarget ? Math.min(12.2, Math.sqrt(Math.max(.1, distance) * 10.5)) : 12.2;
  const yieldingToPedestrian = pedestrianInCarPath(car, walkers);
  const traffic = autonomousCarTraffic(car, cars);
  const signal = autonomousTrafficSignal(car, driver, world, now);
  const slowing = (car.speed || 0) > desiredSpeed + .8;
  const braking = yieldingToPedestrian || traffic.brake || signal.stop || slowing;
  const throttle = braking ? 0 : (car.speed || 0) < desiredSpeed - .65 ? .46 : 0;
  stepCar(car, { throttle, steer, brake: braking }, dt, carEnv);
}

function startAutonomousUTurn(car, driver) {
  const rightCrossSign = driver.laneAxis === "x" ? -driver.laneDirection : driver.laneDirection;
  driver.turnSide = Math.sign((-driver.laneOffset) / rightCrossSign) || 1;
  driver.turnRadius = clamp(Math.abs(driver.laneOffset), 1.8, 2.35);
  driver.turnStartX = car.x;
  driver.turnStartZ = car.z;
  driver.turnStartYaw = car.yaw;
  driver.turnElapsed = 0;
  driver.turnDuration = 2.8;
  driver.turnTimer = driver.turnDuration;
  car.speed = 0;
}

function resolveHelicopterBodies(point, yLo, yHi, radius, helis) {
  for (const heli of helis) {
    const size = heli.scale || 1;
    if (heli.y + 2.8 * size <= yLo || heli.y >= yHi) continue;
    const dx = point.x - heli.x, dz = point.z - heli.z;
    const min = radius + 2.1 * size, d2 = dx * dx + dz * dz;
    if (d2 >= min * min) continue;
    const d = Math.sqrt(Math.max(d2, .0001));
    point.x = heli.x + dx / d * min;
    point.z = heli.z + dz / d * min;
  }
}

function resolvePeople(point, yLo, yHi, radius, walkers, ignore) {
  for (const person of walkers) {
    if (person === ignore || person.hidden || person.y + 1.7 <= yLo || person.y >= yHi) continue;
    const dx = point.x - person.x, dz = point.z - person.z;
    const min = radius + .42, d2 = dx * dx + dz * dz;
    if (d2 >= min * min) continue;
    const d = Math.sqrt(Math.max(d2, .0001));
    point.x = person.x + dx / d * min;
    point.z = person.z + dz / d * min;
  }
}

function steerPedestrianAroundCrowd(person, walkers, directionX, directionZ) {
  let steerX = directionX, steerZ = directionZ;
  for (const other of walkers) {
    if (other === person || other.hidden || Math.abs(other.y - person.y) > .8) continue;
    const dx = other.x - person.x, dz = other.z - person.z;
    const distance = Math.hypot(dx, dz);
    if (distance < .001 || distance > 2.35) continue;
    const ahead = dx * directionX + dz * directionZ;
    if (ahead < -.45 || ahead > 2.25) continue;
    const urgency = clamp((2.35 - distance) / 1.75, 0, 1);
    const forwardWeight = clamp((ahead + .45) / 1.7, 0, 1);
    const lateral = dx * -directionZ + dz * directionX;
    const sideBias = Math.abs(lateral) < .5 ? (person.avoidSide || 1) * .16 : 0;
    const strength = urgency * (.24 + forwardWeight * .56);
    steerX -= (dx / distance) * strength + directionZ * sideBias * urgency;
    steerZ -= (dz / distance) * strength - directionX * sideBias * urgency;
  }
  const length = Math.hypot(steerX, steerZ);
  return length > .001
    ? { x: steerX / length, z: steerZ / length }
    : { x: directionX, z: directionZ };
}

function pedestrianClearance(point, person, walkers) {
  let nearest = 3;
  for (const other of walkers) {
    if (other === person || other.hidden || Math.abs(other.y - person.y) > .8) continue;
    nearest = Math.min(nearest, Math.hypot(point.x - other.x, point.z - other.z));
  }
  return nearest;
}

function pedestrianObstacleClearance(point, collider, yLo, yHi, radius = .31) {
  let nearest = 2.5;
  for (const box of collider.near(point.x, point.z, 1.65)) {
    if (box.y1 <= yLo || box.y0 >= yHi) continue;
    const dx = point.x < box.x0 ? box.x0 - point.x : point.x > box.x1 ? point.x - box.x1 : 0;
    const dz = point.z < box.z0 ? box.z0 - point.z : point.z > box.z1 ? point.z - box.z1 : 0;
    nearest = Math.min(nearest, Math.max(0, Math.hypot(dx, dz) - radius));
  }
  return nearest;
}

function probePedestrianDirection(person, direction, lookAhead, resolveMove) {
  const samples = 4, segmentLength = lookAhead / samples;
  let endpoint = { x: person.x, z: person.z }, blocked = 0;
  for (let i = 1; i <= samples; i++) {
    const expectedDistance = segmentLength * i;
    const candidate = resolveMove({
      x: person.x + direction.x * expectedDistance,
      z: person.z + direction.z * expectedDistance
    });
    const movedX = candidate.x - person.x, movedZ = candidate.z - person.z;
    const forward = movedX * direction.x + movedZ * direction.z;
    blocked = Math.max(blocked, expectedDistance - clamp(forward, 0, expectedDistance));
    endpoint = candidate;
  }
  const dx = endpoint.x - person.x, dz = endpoint.z - person.z;
  return {
    endpoint,
    advance: dx * direction.x + dz * direction.z,
    lateral: Math.abs(dx * -direction.z + dz * direction.x),
    blocked
  };
}

function pedestrianPathObstacleClearance(person, direction, lookAhead, collider, yLo, yHi) {
  let nearest = 2.5;
  for (let i = 1; i <= 4; i++) {
    const distance = lookAhead * i / 4;
    const point = { x: person.x + direction.x * distance, z: person.z + direction.z * distance };
    nearest = Math.min(nearest, pedestrianObstacleClearance(point, collider, yLo, yHi));
  }
  return nearest;
}

function makeCitizens(world, cars, helis, airVehicles, collider) {
  const walkers = [];
  const buildings = world.buildings || [];
  const walkerCount = Math.min(84, buildings.length);
  for (let i = 0; i < walkerCount; i++) {
    const building = buildings[(i * 5 + 3) % buildings.length];
    const route = makeWalkRoute(building);
    const point = route[(i * 3) % route.length];
    const routineProfile = ROUTINE_PROFILES[i % ROUTINE_PROFILES.length];
    walkers.push({
      id: "walker-" + i, name: WALKER_NAMES[i % WALKER_NAMES.length], personality: PERSONALITIES[i % PERSONALITIES.length], rig: {},
      appearance: makeCitizenAppearance(i), appearanceRoot: null,
      routineProfile, routineCooldown: 4 + (i % 7) * 2.4, routineTimer: 0, routineDuration: 0,
      routineAction: routineProfile.look, routineStartYaw: i * .71, routineTurn: 0,
      building, route, sidewalkRoute: route, usesElevator: i % 3 === 0, visitRoute: makeBuildingVisitRoute(building, world, i % 3 === 0),
      visitTarget: null, followPlayer: false, ridingElevator: false, elevatorId: -1, elevatorTrip: null, elevatorDestination: 0,
      doorIndex: findBuildingDoor(world, building),
      routeDirection: i % 2 === 0 ? 1 : -1,
      avoidSide: i % 2 === 0 ? 1 : -1,
      crossingActive: false,
      waypoint: (i * 3 + (i % 2 === 0 ? 1 : route.length - 1)) % route.length,
      x: point.x, y: collider.groundAt(point.x, point.z, 0, .8), z: point.z,
      yaw: i * .71, speed: (1.05 + (i % 9) * .2) * routineProfile.pace, moveSpeed: 0, phase: i * 1.2,
      wait: (i % 4) * .55, actionWait: 0, stuck: 0, stuckSideChanged: false, hidden: false,
      visiting: false, visitCountdown: routineProfile.visitMin + (i % 5) * 1.8,
      greetCooldown: 3 + (i % 7) * 3.5, socialCooldown: 7 + (i % 6) * 4,
      bubbleText: "", bubbleUntil: 0, rngState: (i + 37) * 2654435761 >>> 0,
      tOffset: i * .83
    });
  }

  const drivers = [];
  cars.forEach((car, carIndex) => {
    if (!car.npcControlled) return;
    const start = localOffset(car.x, car.z, 3.25, -.15, car.yaw);
    const lane = getTrafficLane(car);
    drivers.push({
      id: "driver-" + drivers.length, rig: {}, carIndex, state: "approach",
      elapsed: 0, start, x: start.x, z: start.z, y: collider.groundAt(start.x, start.z, 0, .8),
      ...lane, busRoute: Number.isInteger(car.busRouteId) ? (world.busRoutes || []).find((route) => route.id === car.busRouteId)?.path || null : null,
      busRouteIndex: 1, busStopTimer: 0, passengerCount: car.passengerCount || 0,
      turnTimer: 0, turnElapsed: 0, turnDuration: 2.8,
      distanceLeft: 34 + drivers.length * 9,
      blocked: 0, routePause: 0, phase: 0, tOffset: 5 + drivers.length
    });
  });

  const airPilots = [];
  airVehicles.forEach((vehicle, vehicleIndex) => {
    const start = localOffset(vehicle.x, vehicle.z, vehicle.id === "plane" ? 6.0 : 2.8, -.25, vehicle.yaw);
    const route = vehicle.id === "plane"
      ? [{ x: -76, z: -72 }, { x: 76, z: -72 }, { x: 76, z: 72 }, { x: -76, z: 72 }]
      : [{ x: 18, z: 18 }, { x: 18, z: -18 }, { x: -18, z: -18 }, { x: -18, z: 18 }];
    airPilots.push({
      id: "pilot-" + vehicle.id, rig: {}, vehicleIndex, state: "approach",
      elapsed: 0, start, x: start.x, z: start.z,
      y: collider.groundAt(start.x, start.z, 0, .8), route,
      waypoint: 0, targetAltitude: vehicle.id === "plane" ? 26 : 4.15,
      tOffset: 12 + vehicleIndex, phase: 0
    });
  });

  const heliPilots = [];
  helis.forEach((heli, heliIndex) => {
    if (!heli.npcControlled) return;
    const start = localOffset(heli.x, heli.z, 3.6, 0, heli.yaw);
    heliPilots.push({
      id: "pilot-heli", rig: {}, heliIndex, state: "approach",
      elapsed: 0, start, x: start.x, z: start.z,
      y: collider.groundAt(start.x, start.z, heli.y, .8),
      route: [{ x: -82, z: 0 }, { x: 0, z: -82 }, { x: 82, z: 0 }, { x: 0, z: 82 }],
      waypoint: 0, phase: 0, tOffset: 18
    });
  });
  return { walkers, drivers, airPilots, heliPilots, all: [...walkers, ...drivers, ...airPilots, ...heliPilots] };
}

export function Citizens({ world, cars, helis, airVehicles, elevatorCars, activeVehicleRef, citizensRef, conversationRef, playerPositionRef, doorStatesRef, onDoorToggle }) {
  const collider = useMemo(() => new Collider(world.boxes), [world]);
  const sim = useMemo(() => makeCitizens(world, cars, helis, airVehicles, collider), [world, cars, helis, airVehicles, collider]);
  if (citizensRef) citizensRef.current = sim.walkers;
  const simulationClock = useRef(0);

  useFrame((state, rawDt) => {
    simulationClock.current += Math.min(rawDt, .1);
    if (simulationClock.current < 1 / 30) return;
    const dt = Math.min(simulationClock.current, .045);
    simulationClock.current = 0;
    const now = state.clock.elapsedTime;
    const walkers = sim.walkers, drivers = sim.drivers;
    const carEnv = {
      ground: (x, z, y) => collider.groundAt(x, z, y, .65, 1),
      resolve: (point, yLo, yHi, radius, ignore) => {
        collider.resolve(point, yLo, yHi, radius);
        resolveCarObstacles(point, yLo, yHi, radius, cars, ignore);
        resolveHelicopterBodies(point, yLo, yHi, radius, helis);
        resolveAirVehicleObstacles(point, yLo, yHi, radius, airVehicles);
        resolvePeople(point, yLo, yHi, radius, walkers);
        collider.resolve(point, yLo, yHi, radius);
      }
    };
    const flightEnv = {
      ground: (x, z, y) => collider.groundAt(x, z, y, .65, 1),
      resolve: (point, yLo, yHi, radius, ignore) => {
        collider.resolve(point, yLo, yHi, radius);
        resolveCarObstacles(point, yLo, yHi, radius, cars);
        resolveHelicopterBodies(point, yLo, yHi, radius, helis);
        resolveAirVehicleObstacles(point, yLo, yHi, radius, airVehicles, ignore);
        resolvePeople(point, yLo, yHi, radius, walkers);
        collider.resolve(point, yLo, yHi, radius);
      }
    };
    const heliEnv = {
      ground: (x, z, y) => collider.groundAt(x, z, y, .7, 1),
      resolve: (point, yLo, yHi, radius) => {
        collider.resolve(point, yLo, yHi, radius);
        resolveCarObstacles(point, yLo, yHi, radius, cars);
        resolveAirVehicleObstacles(point, yLo, yHi, radius, airVehicles);
        resolveHelicopterBodies(point, yLo, yHi, radius, helis.filter((item) => item !== helis.find((h) => h.npcControlled)));
        resolvePeople(point, yLo, yHi, radius, walkers);
        collider.resolve(point, yLo, yHi, radius);
      }
    };

    for (let personIndex = 0; personIndex < walkers.length; personIndex++) {
      const person = walkers[personIndex], rig = person.rig;
      if (rig.root && person.appearanceRoot !== rig.root) {
        applyHumanAppearance(rig.root, person.appearance);
        person.appearanceRoot = rig.root;
      }
      person.greetCooldown = Math.max(0, person.greetCooldown - dt);
      const routineProfile = person.routineProfile || ROUTINE_PROFILES[0];
      person.socialCooldown = Math.max(0, person.socialCooldown - dt * routineProfile.socialRate);
      person.routineCooldown = Math.max(0, (person.routineCooldown || 0) - dt);
      if (person.bubbleUntil <= now) person.bubbleText = "";
      if (person.ridingElevator && person.elevatorTrip) {
        const lift = elevatorCars[person.elevatorId];
        if (!lift) {
          person.ridingElevator = false;
          person.elevatorTrip = null;
        } else {
          const travel = advanceElevatorTrip(person.elevatorTrip, dt);
          lift.y.current = travel.y;
          lift.moving.current = !travel.done;
          person.x = lift.layout.x;
          person.y = travel.y + .22;
          person.z = lift.layout.z;
          if (rig.root) {
            rig.root.position.set(person.x, person.y, person.z);
            rig.root.rotation.y = person.yaw;
            rig.root.visible = true;
          }
          poseHuman(rig, { mode: "walk", phase: person.phase, speed: 0, air: false, t: now + person.tOffset, dt });
          if (travel.done) {
            lift.y.current = person.elevatorTrip.to;
            lift.moving.current = false;
            if (lift.occupant === person.id) lift.occupant = null;
            person.ridingElevator = false;
            person.elevatorTrip = null;
            const nextTarget = person.route[person.waypoint];
            if (person.elevatorDestination > .05 && nextTarget) {
              person.x = nextTarget.x;
              person.z = nextTarget.z;
              person.y = person.elevatorDestination;
            } else {
              person.x = lift.layout.approachX - .35;
              person.z = lift.layout.z;
              person.y = 0;
            }
            person.elevatorDestination = 0;
            if (rig.root) rig.root.position.set(person.x, person.y, person.z);
          }
          continue;
        }
      }
      if (conversationRef?.current?.personId === person.id) {
        const player = playerPositionRef?.current;
        if (player) person.yaw = Math.atan2(player.x - person.x, player.z - person.z);
        if (conversationRef.current.bubbleText && person.bubbleText !== conversationRef.current.bubbleText) {
          person.bubbleText = conversationRef.current.bubbleText;
          person.bubbleUntil = Number.POSITIVE_INFINITY;
        }
        if (rig.root) {
          rig.root.position.set(person.x, person.y, person.z);
          rig.root.rotation.y = person.yaw;
          rig.root.visible = true;
        }
        person.moveSpeed = THREE.MathUtils.damp(person.moveSpeed || 0, 0, 7, dt);
        person.phase += person.moveSpeed * dt * 2.1;
        poseHuman(rig, { mode: "walk", phase: person.phase, speed: person.moveSpeed, air: false, t: now + person.tOffset, dt });
        continue;
      }
      const player = playerPositionRef?.current;
      const playerDistance = player ? Math.hypot(player.x - person.x, player.z - person.z) : Infinity;
      if (person.followPlayer && player && playerDistance > 65) {
        person.followPlayer = false;
        person.bubbleText = "התרחקת מאוד, אז אחזור לסיור שלי.";
        person.bubbleUntil = now + 3.2;
      }
      if (person.routineTimer > 0) {
        person.routineTimer = Math.max(0, person.routineTimer - dt);
        const progress = 1 - person.routineTimer / Math.max(person.routineDuration, .001);
        const lookBlend = person.routineAction === "inspect"
          ? Math.sin(progress * Math.PI / 2)
          : Math.sin(progress * Math.PI * 2);
        const desiredYaw = person.routineStartYaw + person.routineTurn * lookBlend;
        person.yaw += angleDiff(desiredYaw, person.yaw) * (1 - Math.exp(-4.5 * dt));
        if (rig.root) {
          rig.root.position.set(person.x, person.y, person.z);
          rig.root.rotation.y = person.yaw;
          rig.root.visible = true;
        }
        person.phase += dt * .35;
        poseHuman(rig, { mode: "observe", style: person.routineAction, phase: person.phase, speed: 0, air: false, t: now + person.tOffset, dt });
        continue;
      }
      if (player && person.greetCooldown <= 0 && !person.visiting && !person.followPlayer) {
        if (playerDistance > 1.4 && playerDistance < 5.8 && Math.abs(player.y - person.y) < 2.2) {
          person.greetCooldown = 13 + ((person.rngState >>> 8) % 900) / 100;
          person.wait = Math.max(person.wait, 1.15);
          person.yaw = Math.atan2(player.x - person.x, player.z - person.z);
          person.bubbleText = ["שלום! שמח לראות אותך.", "יום טוב! לאן אתה מטייל?", "מה נשמע? העיר גדולה, נכון?", "ברוך הבא! אולי ניפגש שוב ברחוב."][person.rngState % 4];
          person.bubbleUntil = now + 2.8;
        }
      }
      if (!person.visiting && !person.followPlayer) person.visitCountdown -= dt;
      if (!person.visiting && !person.followPlayer && person.visitCountdown <= 0) {
        const destination = chooseAdjacentBuilding(person, world);
        person.visitTarget = destination;
        person.usesElevator = nextRandom(person) < .42;
        person.visitRoute = makeBuildingVisitRoute(destination, world, person.usesElevator);
        person.doorIndex = findBuildingDoor(world, destination);
        person.visiting = true;
        person.route = routeToVisit(person, destination, world);
        person.waypoint = person.route.length > 1 ? 1 : 0;
        person.stuck = 0;
      }
      if (!person.visiting && !person.followPlayer && person.socialCooldown <= 0 && personIndex < walkers.length - 1) {
        let companion = null, closest = 1.55;
        for (let j = personIndex + 1; j < walkers.length; j++) {
          const other = walkers[j];
          if (other.visiting || other.followPlayer || other.socialCooldown > 0 || conversationRef?.current?.personId === other.id) continue;
          const distance = Math.hypot(other.x - person.x, other.z - person.z);
          if (distance < closest && Math.abs(other.y - person.y) < .8) { closest = distance; companion = other; }
        }
        if (companion) {
          const angle = Math.atan2(companion.x - person.x, companion.z - person.z);
          person.yaw = angle; companion.yaw = angle + Math.PI;
          person.wait = Math.max(person.wait, 1.8); companion.wait = Math.max(companion.wait, 1.8);
          const openers = ["מה נשמע? איך הולך?", "היי, מזמן לא דיברנו.", "איזה יום נעים לטיול.", "לאן אתה ממשיך מכאן?"];
          const answers = ["הכול טוב, תודה. ואתך?", "בסדר גמור, בדיוק יצאתי לסיבוב.", "מעולה. אולי ניפגש שוב בהמשך.", "אני בדרך לבדוק מקום חדש בעיר."];
          person.bubbleText = openers[Math.floor(nextRandom(person) * openers.length)]; person.bubbleUntil = now + 2.8;
          companion.bubbleText = answers[Math.floor(nextRandom(companion) * answers.length)]; companion.bubbleUntil = now + 2.8;
          person.socialCooldown = 28; companion.socialCooldown = 31;
        } else person.socialCooldown = 5 + (person.rngState % 500) / 100;
      }
      if (person.wait > 0 || person.actionWait > 0) {
        person.wait = Math.max(0, person.wait - dt);
        person.actionWait = Math.max(0, person.actionWait - dt);
        if (rig.root) {
          rig.root.position.set(person.x, person.y, person.z);
          rig.root.rotation.y = person.yaw + Math.sin(now * .6 + person.tOffset) * .13;
          rig.root.visible = true;
        }
        person.moveSpeed = THREE.MathUtils.damp(person.moveSpeed || 0, 0, 7, dt);
        person.phase += person.moveSpeed * dt * 2.1;
        poseHuman(rig, { mode: "walk", phase: person.phase, speed: person.moveSpeed, air: false, t: now + person.tOffset, dt });
        continue;
      }
      const following = !!(person.followPlayer && player);
      if (following && playerDistance <= 2.75) {
        person.yaw = Math.atan2(player.x - person.x, player.z - person.z);
        if (rig.root) {
          rig.root.position.set(person.x, person.y, person.z);
          rig.root.rotation.y = person.yaw;
          rig.root.visible = true;
        }
        person.moveSpeed = THREE.MathUtils.damp(person.moveSpeed || 0, 0, 7, dt);
        person.phase += person.moveSpeed * dt * 2.1;
        poseHuman(rig, { mode: "walk", phase: person.phase, speed: person.moveSpeed, air: false, t: now + person.tOffset, dt });
        continue;
      }
      const target = following
        ? { x: player.x - Math.sin(person.yaw) * 2.35, z: player.z - Math.cos(person.yaw) * 2.35 }
        : person.route[person.waypoint];
      if (!target) continue;
      const dx = target.x - person.x, dz = target.z - person.z, distance = Math.hypot(dx, dz);
      const threshold = following ? 1.8 : (target.precise ? .19 : .55);
      if (distance < threshold) {
        if (following) {
          person.wait = .12;
        } else if (target.action === "crossingWait") {
          const crossingEnd = person.route[person.waypoint + 1];
          const traffic = pedestrianCrossingStatus(target, crossingEnd, cars);
          if (!traffic.safe) {
            person.wait = Math.max(person.wait, .28);
            person.moveSpeed = THREE.MathUtils.damp(person.moveSpeed || 0, 0, 8, dt);
            if (traffic.car) {
              const desiredYaw = Math.atan2(traffic.car.x - person.x, traffic.car.z - person.z);
              person.yaw += angleDiff(desiredYaw - person.yaw, 0) * (1 - Math.exp(-4.2 * dt));
            }
          } else {
            person.crossingWaitStarted = 0;
            person.crossingActive = true;
            person.waypoint++;
            person.wait = Math.max(person.wait, .12);
          }
        } else if (target.action === "crossingFinish") {
          person.crossingWaitStarted = 0;
          person.crossingActive = false;
          person.waypoint++;
          person.actionWait = .12;
        } else if (target.action === "elevatorUp" || target.action === "elevatorDown") {
          const elevatorId = (person.visitTarget || person.building).elevatorId;
          const lift = elevatorCars[elevatorId];
          if (!lift || (lift.occupant && lift.occupant !== person.id)) {
            person.actionWait = .45;
          } else {
            const maxPassengerFloor = Math.max(1, lift.layout.floors - 2);
            const destinationFloor = target.action === "elevatorUp"
              ? 1 + Math.floor(nextRandom(person) * maxPassengerFloor)
              : 0;
            const destinationY = destinationFloor * 4;
            if (Math.abs(lift.y.current - destinationY) < .08) {
              lift.y.current = destinationY;
              person.waypoint++;
            } else {
              lift.occupant = person.id;
              lift.moving.current = true;
              person.elevatorId = elevatorId;
              person.elevatorDestination = destinationY;
              person.elevatorTrip = makeElevatorTrip(lift.y.current, destinationY, "citizen");
              person.ridingElevator = true;
              person.waypoint++;
            }
          }
        } else if (target.action === "pause") {
          person.waypoint++;
          person.wait = Math.max(person.wait, 1.35);
        } else if (target.action) {
          const doorOpen = !!doorStatesRef?.current?.[person.doorIndex];
          if (person.doorIndex >= 0 && ((target.action === "open" && !doorOpen) || (target.action === "close" && doorOpen))) onDoorToggle?.(person.doorIndex);
          person.waypoint++;
          person.actionWait = .72;
        } else {
          const walkingLoop = !person.visiting && person.route === person.sidewalkRoute;
          person.waypoint += walkingLoop ? person.routeDirection : 1;
          if (walkingLoop) {
            person.waypoint = (person.waypoint + person.route.length) % person.route.length;
          } else if (person.waypoint >= person.route.length) {
            if (person.visiting) {
              person.visiting = false;
              if (person.visitTarget) {
                person.building = person.visitTarget;
                person.sidewalkRoute = makeWalkRoute(person.building);
                person.visitRoute = makeBuildingVisitRoute(person.building, world, person.usesElevator);
                person.doorIndex = findBuildingDoor(world, person.building);
              }
              person.visitTarget = null;
              person.route = person.sidewalkRoute;
              person.waypoint = nearestLoopIndex(person.route, person.x, person.z);
              person.visitCountdown = nextPersonalVisitDelay(person);
            } else person.waypoint = 0;
          }
          if (!person.visiting) {
            person.rngState = (Math.imul(person.rngState, 1664525) + 1013904223) >>> 0;
            person.wait = person.rngState % 5 === 0 ? 1.1 + (person.rngState % 120) / 100 : .12 + (person.rngState % 25) / 100;
            if (person.rngState % 29 === 0) {
              person.bubbleText = ["איזה יום יפה!", "נראה מה יש מעבר לפינה.", "אני אוהב את העיר הזאת."][person.rngState % 3];
              person.bubbleUntil = now + 2.6;
            }
            startPersonalRoutine(person, now);
          }
        }
        continue;
      }
      const maxSpeed = following ? 2.9 : person.visiting ? 1.8 : person.speed;
      const nx = dx / Math.max(distance, .001), nz = dz / Math.max(distance, .001);
      const brakingDistance = Math.max(0, distance - threshold);
      const targetSpeed = Math.min(maxSpeed, Math.sqrt(2 * 3.2 * brakingDistance));
      person.moveSpeed = THREE.MathUtils.damp(person.moveSpeed || 0, targetSpeed, 6.5, dt);
      const stepLength = Math.min(person.moveSpeed * dt, brakingDistance), yLo = person.y + .12, yHi = person.y + 1.72;
      const steering = steerPedestrianAroundCrowd(person, walkers, nx, nz);
      const resolveMove = (candidate) => {
        collider.resolve(candidate, person.y + .58, yHi, .31);
        resolvePeople(candidate, yLo, yHi, .31, walkers, person);
        resolveCarObstacles(candidate, yLo, yHi, .31, cars);
        resolveHelicopterBodies(candidate, yLo, yHi, .31, helis);
        resolveAirVehicleObstacles(candidate, yLo, yHi, .31, airVehicles);
        collider.resolve(candidate, person.y + .58, yHi, .31);
        return candidate;
      };
      let next = resolveMove({ x: person.x + steering.x * stepLength, z: person.z + steering.z * stepLength });
      const immediateAdvance = distance - Math.hypot(target.x - next.x, target.z - next.z);
      const initialClearance = pedestrianClearance(next, person, walkers);
      const lookAhead = Math.min(1.12, Math.max(.72, brakingDistance * .34));
      const directProbe = probePedestrianDirection(person, steering, lookAhead, resolveMove);
      const directWallClearance = pedestrianPathObstacleClearance(person, steering, lookAhead, collider, person.y + .58, yHi);
      const needsReroute = immediateAdvance < stepLength * .72
        || initialClearance < .82
        || directProbe.blocked > .2
        || directWallClearance < .38;
      if (needsReroute) {
        let bestDirection = steering;
        let bestScore = -Infinity;
        const side = person.avoidSide || 1;
        const angles = [0, side * .38, -side * .38, side * .76, -side * .76, side * 1.08, -side * 1.08];
        for (const angle of angles) {
          const direction = {
            x: steering.x * Math.cos(angle) - steering.z * Math.sin(angle),
            z: steering.z * Math.cos(angle) + steering.x * Math.sin(angle)
          };
          const probe = angle === 0
            ? directProbe
            : probePedestrianDirection(person, direction, lookAhead, resolveMove);
          const wallClearance = pedestrianPathObstacleClearance(person, direction, lookAhead, collider, person.y + .58, yHi);
          const crowdClearance = pedestrianClearance(probe.endpoint, person, walkers);
          const sidePreference = angle * side > 0 ? .025 : 0;
          const score = probe.advance - probe.lateral * .34 - probe.blocked * .62
            + Math.min(wallClearance, 1.25) * .19
            + Math.min(crowdClearance, 1.4) * .075
            - Math.abs(angle) * .035 + sidePreference;
          if (score > bestScore) { bestScore = score; bestDirection = direction; }
        }
        next = resolveMove({
          x: person.x + bestDirection.x * stepLength,
          z: person.z + bestDirection.z * stepLength
        });
      }
      const movedX = next.x - person.x, movedZ = next.z - person.z;
      const moved = Math.hypot(movedX, movedZ);
      if (moved < .012) {
        person.stuck += dt;
        if (person.stuck > .82 && !person.stuckSideChanged) {
          person.avoidSide *= -1;
          person.stuckSideChanged = true;
          person.moveSpeed = Math.min(person.moveSpeed, .45);
        }
      } else {
        person.stuck = 0;
        person.stuckSideChanged = false;
      }
      person.x = next.x; person.z = next.z;
      const inStairwell = (world.buildings || []).some((building) => {
        const stair = building.basementStairwell;
        return stair && person.x >= stair.x0 - .65 && person.x <= stair.x1 + .65 && person.z >= stair.z0 - .65 && person.z <= stair.z1 + .65;
      });
      person.y = collider.groundAt(person.x, person.z, person.y, inStairwell ? .82 : .75, inStairwell ? .22 : .32);
      if (moved > .015) {
        const desiredYaw = Math.atan2(movedX, movedZ);
        person.yaw += angleDiff(desiredYaw - person.yaw, 0) * (1 - Math.exp(-10 * dt));
      }
      person.phase += (moved / Math.max(dt, .001)) * dt * 2.1;
      if (person.stuck > 2.2) {
        person.stuck = 0;
        if (following) {
          person.followPlayer = false;
          person.bubbleText = "יש כאן מכשול, אמשיך מכאן בסיור שלי.";
          person.bubbleUntil = now + 2.8;
          person.visitCountdown = 4;
        } else {
          person.crossingActive = false;
          const sidewalkLoop = !person.visiting && person.route === person.sidewalkRoute;
          if (sidewalkLoop) {
            person.routeDirection *= -1;
            person.waypoint = (person.waypoint + person.routeDirection + person.route.length) % person.route.length;
          } else {
            person.waypoint = (person.waypoint + 1) % person.route.length;
          }
          person.stuckSideChanged = false;
        }
      }
      if (rig.root) {
        rig.root.position.set(person.x, person.y, person.z);
        rig.root.rotation.y = person.yaw;
        rig.root.visible = true;
      }
      poseHuman(rig, { mode: "walk", phase: person.phase, speed: moved / Math.max(dt, .001), air: false, t: now + person.tOffset, dt });
    }

    for (const driver of drivers) {
      const car = cars[driver.carIndex], rig = driver.rig;
      if (!car) continue;
      const playerDriving = activeVehicleRef.current.mode === "car" && activeVehicleRef.current.target === driver.carIndex;
      if (playerDriving) {
        if (rig.root) rig.root.visible = false;
        continue;
      }
      if (rig.root) rig.root.visible = true;
      if (driver.state === "approach") {
        driver.elapsed += dt;
        const progress = clamp(driver.elapsed / 2.35, 0, 1);
        const target = localOffset(car.x, car.z, 1.45, -.12, car.yaw);
        driver.x = THREE.MathUtils.lerp(driver.start.x, target.x, progress);
        driver.z = THREE.MathUtils.lerp(driver.start.z, target.z, progress);
        driver.y = collider.groundAt(driver.x, driver.z, 0, .8);
        const face = Math.atan2(car.x - driver.x, car.z - driver.z);
        if (rig.root) { rig.root.position.set(driver.x, driver.y, driver.z); rig.root.rotation.y = face; }
        poseHuman(rig, { mode: "walk", phase: progress * 7, speed: 1.4, air: false, t: now + driver.tOffset, dt });
        if (progress >= 1) { driver.state = "drive"; driver.distanceLeft = 34 + driver.carIndex * 2.2; }
        continue;
      }
      if (driver.busRoute) {
        updateCityBus(car, driver, cars, walkers, world, now, dt, carEnv);
        const busSeat = localOffset(car.x, car.z, -.3, .18, car.yaw);
        if (rig.root) {
          rig.root.position.set(busSeat.x, car.y + .54, busSeat.z);
          rig.root.rotation.y = car.yaw;
        }
        poseHuman(rig, { mode: "car", phase: 0, speed: 0, air: false, t: now + driver.tOffset, dt });
        continue;
      }
      if (driver.turnTimer > 0) {
        driver.turnElapsed += dt;
        const progress = clamp(driver.turnElapsed / driver.turnDuration, 0, 1);
        const eased = progress * progress * (3 - 2 * progress);
        const turnAngle = driver.turnSide * Math.PI * eased;
        const yaw = driver.turnStartYaw + turnAngle;
        const signedRadius = driver.turnSide * driver.turnRadius;
        const next = {
          x: driver.turnStartX + signedRadius * (Math.cos(driver.turnStartYaw) - Math.cos(yaw)),
          z: driver.turnStartZ + signedRadius * (Math.sin(yaw) - Math.sin(driver.turnStartYaw))
        };
        carEnv.resolve(next, car.y + .2, car.y + 1.75, (car.width || 1.9) * .5, car);
        const turnDistance = Math.hypot(next.x - car.x, next.z - car.z);
        car.x = next.x; car.z = next.z; car.yaw = yaw;
        car.y = Math.max(0, carEnv.ground(car.x, car.z, car.y));
        car.speed = turnDistance / Math.max(dt, .001);
        driver.turnTimer = Math.max(0, driver.turnDuration - driver.turnElapsed);
        if (progress >= 1) {
          driver.laneOffset *= -1;
          driver.laneDirection *= -1;
          car.yaw = driver.laneAxis === "x"
            ? (driver.laneDirection > 0 ? Math.PI / 2 : -Math.PI / 2)
            : (driver.laneDirection > 0 ? 0 : Math.PI);
          driver.distanceLeft = 38;
          driver.blocked = 0;
          driver.turnTimer = 0;
        }
      } else {
        const yieldingToPedestrian = pedestrianInCarPath(car, walkers);
        const traffic = autonomousCarTraffic(car, cars);
        const signal = autonomousTrafficSignal(car, driver, world, now);
        const throttle = yieldingToPedestrian || signal.stop ? 0 : traffic.throttle;
        const brake = yieldingToPedestrian || traffic.brake || signal.stop;
        const steer = autonomousCarSteering(car, driver);
        stepCar(car, { throttle, steer, brake }, dt, carEnv);
        if (yieldingToPedestrian || traffic.brake || signal.stop) {
          driver.blocked = 0;
        } else {
          driver.distanceLeft -= Math.abs(car.speed) * dt;
          if (Math.abs(car.speed) < 1.0) driver.blocked += dt; else driver.blocked = 0;
        }
        if (driver.distanceLeft <= 0 || driver.blocked > 2.6 || Math.abs(car.x) > 113 || Math.abs(car.z) > 113) {
          startAutonomousUTurn(car, driver);
        }
      }
      const seat = localOffset(car.x, car.z, -.3, .18, car.yaw);
      if (rig.root) {
        rig.root.position.set(seat.x, car.y + .54, seat.z);
        rig.root.rotation.y = car.yaw;
      }
      poseHuman(rig, { mode: "car", phase: 0, speed: 0, air: false, t: now + driver.tOffset, dt });
    }

    for (const pilot of sim.airPilots) {
      const vehicle = airVehicles[pilot.vehicleIndex], rig = pilot.rig;
      if (!vehicle) continue;
      const playerFlying = activeVehicleRef.current.mode === "airVehicle" && activeVehicleRef.current.target === pilot.vehicleIndex;
      if (playerFlying) {
        if (rig.root) rig.root.visible = false;
        continue;
      }
      if (rig.root) rig.root.visible = true;
      if (pilot.state === "approach") {
        pilot.elapsed += dt;
        const progress = clamp(pilot.elapsed / 2.4, 0, 1);
        const target = localOffset(vehicle.x, vehicle.z, vehicle.id === "plane" ? 4.9 : 1.8, -.2, vehicle.yaw);
        pilot.x = THREE.MathUtils.lerp(pilot.start.x, target.x, progress);
        pilot.z = THREE.MathUtils.lerp(pilot.start.z, target.z, progress);
        pilot.y = collider.groundAt(pilot.x, pilot.z, 0, .8);
        if (rig.root) { rig.root.position.set(pilot.x, pilot.y, pilot.z); rig.root.rotation.y = vehicle.yaw - Math.PI / 2; }
        poseHuman(rig, { mode: "walk", phase: progress * 6, speed: 1.5, air: false, t: now + pilot.tOffset, dt });
        if (progress >= 1) pilot.state = "takeoff";
        continue;
      }
      if (pilot.state === "takeoff") {
        stepAirVehicle(vehicle, { throttle: 0, steer: 0, altitudeTarget: pilot.targetAltitude, piloted: true }, dt, flightEnv);
        if (vehicle.y >= pilot.targetAltitude - .8) pilot.state = "fly";
        const seat = localOffset(vehicle.x, vehicle.z, 0, .18, vehicle.yaw);
        if (rig.root) {
          rig.root.position.set(seat.x, vehicle.y + .62, seat.z);
          rig.root.rotation.set(vehicle.pitch || 0, vehicle.yaw, vehicle.roll || 0, "YXZ");
        }
        poseHuman(rig, { mode: "car", phase: 0, speed: 0, air: false, t: now + pilot.tOffset, dt });
        continue;
      }
      const target = pilot.route[pilot.waypoint];
      const dx = target.x - vehicle.x, dz = target.z - vehicle.z, distance = Math.hypot(dx, dz);
      if (distance < 16) pilot.waypoint = (pilot.waypoint + 1) % pilot.route.length;
      const next = pilot.route[pilot.waypoint];
      const desiredYaw = Math.atan2(next.x - vehicle.x, next.z - vehicle.z);
      const steering = clamp(angleDiff(desiredYaw, vehicle.yaw) * 1.5, -1, 1);
      stepAirVehicle(vehicle, {
        throttle: vehicle.id === "plane" ? .72 : .48,
        steer: steering,
        altitudeTarget: pilot.targetAltitude,
        piloted: true
      }, dt, flightEnv);
      const seat = localOffset(vehicle.x, vehicle.z, 0, .18, vehicle.yaw);
      if (rig.root) {
        rig.root.position.set(seat.x, vehicle.y + .62, seat.z);
        rig.root.rotation.set(vehicle.pitch || 0, vehicle.yaw, vehicle.roll || 0, "YXZ");
      }
      poseHuman(rig, { mode: "car", phase: 0, speed: 0, air: false, t: now + pilot.tOffset, dt });
    }

    for (const pilot of sim.heliPilots) {
      const heli = helis[pilot.heliIndex], rig = pilot.rig;
      if (!heli) continue;
      const playerFlying = activeVehicleRef.current.mode === "heli" && activeVehicleRef.current.target === pilot.heliIndex;
      if (playerFlying) {
        if (rig.root) rig.root.visible = false;
        continue;
      }
      if (rig.root) rig.root.visible = true;
      if (pilot.state === "approach") {
        pilot.elapsed += dt;
        const progress = clamp(pilot.elapsed / 2.5, 0, 1);
        const target = localOffset(heli.x, heli.z, 2.5, 0, heli.yaw);
        pilot.x = THREE.MathUtils.lerp(pilot.start.x, target.x, progress);
        pilot.z = THREE.MathUtils.lerp(pilot.start.z, target.z, progress);
        pilot.y = collider.groundAt(pilot.x, pilot.z, heli.y, .8);
        if (rig.root) { rig.root.position.set(pilot.x, pilot.y, pilot.z); rig.root.rotation.y = heli.yaw - Math.PI / 2; }
        poseHuman(rig, { mode: "walk", phase: progress * 6, speed: 1.3, air: false, t: now + pilot.tOffset, dt });
        if (progress >= 1) pilot.state = "fly";
        continue;
      }
      const target = pilot.route[pilot.waypoint];
      const dx = target.x - heli.x, dz = target.z - heli.z, distance = Math.hypot(dx, dz);
      if (distance < 16) pilot.waypoint = (pilot.waypoint + 1) % pilot.route.length;
      const next = pilot.route[pilot.waypoint];
      const desiredYaw = Math.atan2(next.x - heli.x, next.z - heli.z);
      const steering = clamp(angleDiff(desiredYaw, heli.yaw) * 1.25, -1, 1);
      const targetAltitude = 32;
      const lift = heli.y < targetAltitude - 2 ? .85 : heli.y > targetAltitude + 2 ? -.55 : 0;
      stepHeli(heli, { fwd: .43, turn: steering, lift, piloted: true }, dt, heliEnv);
      const seat = localOffset(heli.x, heli.z, 0, .5, heli.yaw);
      if (rig.root) {
        rig.root.position.set(seat.x, heli.y + .69, seat.z);
        rig.root.rotation.set(heli.pitch, heli.yaw, heli.roll, "YXZ");
      }
      poseHuman(rig, { mode: "heli", phase: 0, speed: 0, air: false, t: now + pilot.tOffset, dt });
    }
  });

  return h(React.Fragment, null, sim.all.map((person) => h(React.Fragment, { key: person.id },
    h(Human, { rig: person.rig, lowDetail: conversationRef?.current?.personId !== person.id }),
    person.id.startsWith("walker-") ? h(CitizenSpeechBubble, { person }) : null
  )));
}

function CitizenSpeechBubble({ person }) {
  const bubble = useRef(null);
  useFrame(({ clock }) => {
    const element = bubble.current;
    if (!element) return;
    const visible = !!person.bubbleText && person.bubbleUntil > clock.elapsedTime;
    element.style.display = visible ? "block" : "none";
    if (visible && element.textContent !== person.bubbleText) element.textContent = person.bubbleText;
  });
  return h(Html, { position: [0, 2.22, 0], center: true, distanceFactor: 11, occlude: false, style: { pointerEvents: "none" } },
    h("div", { ref: bubble, className: "citizen-world-bubble", style: { display: "none" } })
  );
}
