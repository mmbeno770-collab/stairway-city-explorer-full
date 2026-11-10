import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Human, poseHuman } from "./human.js";
import { Collider, BLOCK, CITY_HALF } from "./world.js";
import { makeElevatorTrip, advanceElevatorTrip } from "./elevator-sim.js";
import { stepCar, resolveCarObstacles } from "./car-sim.js";
import { stepHeli } from "./heli-sim.js";
import { stepAirVehicle, resolveAirVehicleObstacles } from "./air-vehicle-sim.js";

const h = React.createElement;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
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

const WALKER_NAMES = ["אורי", "דוד", "יונתן", "משה", "אליהו", "יעקב", "נחום", "שמואל", "בנימין", "אלעד", "אריאל", "נעם", "אבישי", "עמיחי", "מתניה", "איתן", "יהודה", "הלל", "רפאל", "אברהם", "יצחק", "שלמה", "מנחם", "מאיר", "דניאל", "אלעזר", "עוזיאל", "גדעון", "נפתלי", "אפרים", "חיים", "יוסף", "ברוך", "זאב", "נתנאל", "אלחנן"];

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
    crossA = { x: boundaryX - Math.sign(dx) * 3.6, z: crossingZ };
    crossB = { x: boundaryX + Math.sign(dx) * 3.6, z: crossingZ };
  } else {
    const east = (person.rngState & 1) === 0;
    sourceExitIndex = dz > 0 ? 4 : 0;
    targetEntryIndex = dz > 0 ? 0 : 4;
    const boundaryZ = -CITY_HALF + (dz > 0 ? person.building.gridZ + 1 : person.building.gridZ) * BLOCK;
    const columnWest = -CITY_HALF + person.building.gridX * BLOCK;
    const crossingX = columnWest + (east ? BLOCK - 4.2 : 4.2);
    sourceEdge = { x: crossingX, z: sourceLoop[sourceExitIndex].z };
    targetEdge = { x: crossingX, z: targetLoop[targetEntryIndex].z };
    crossA = { x: crossingX, z: boundaryZ - Math.sign(dz) * 3.6 };
    crossB = { x: crossingX, z: boundaryZ + Math.sign(dz) * 3.6 };
  }

  const toCrosswalk = loopPath(sourceLoop, startIndex, sourceExitIndex);
  const alongDestinationSidewalk = loopPath(targetLoop, targetEntryIndex, targetDoorIndex);
  return [...toCrosswalk, sourceEdge, crossA, crossB, targetEdge, ...alongDestinationSidewalk.slice(1), ...visitRoute];
}

function resolveHelicopterBodies(point, yLo, yHi, radius, helis) {
  for (const heli of helis) {
    if (heli.y + 2.8 <= yLo || heli.y >= yHi) continue;
    const dx = point.x - heli.x, dz = point.z - heli.z;
    const min = radius + 2.1, d2 = dx * dx + dz * dz;
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

function makeCitizens(world, cars, helis, airVehicles, collider) {
  const walkers = [];
  const buildings = world.buildings || [];
  const walkerCount = Math.min(36, buildings.length);
  for (let i = 0; i < walkerCount; i++) {
    const building = buildings[(i * 5 + 3) % buildings.length];
    const route = makeWalkRoute(building);
    const point = route[(i * 3) % route.length];
    walkers.push({
      id: "walker-" + i, name: WALKER_NAMES[i % WALKER_NAMES.length], rig: {},
      building, route, sidewalkRoute: route, usesElevator: i % 3 === 0, visitRoute: makeBuildingVisitRoute(building, world, i % 3 === 0),
      visitTarget: null, followPlayer: false, ridingElevator: false, elevatorId: -1, elevatorTrip: null, elevatorDestination: 0,
      doorIndex: findBuildingDoor(world, building), waypoint: (i * 3 + 1) % route.length,
      x: point.x, y: collider.groundAt(point.x, point.z, 0, .8), z: point.z,
      yaw: i * .71, speed: 1.25 + (i % 7) * .22, phase: i * 1.2,
      wait: (i % 4) * .55, actionWait: 0, stuck: 0, hidden: false,
      visiting: false, visitCountdown: 7 + (i % 8) * 5.5,
      greetCooldown: 3 + (i % 7) * 3.5, socialCooldown: 7 + (i % 6) * 4,
      bubbleText: "", bubbleUntil: 0, rngState: (i + 37) * 2654435761 >>> 0,
      tOffset: i * .83
    });
  }

  const drivers = [];
  cars.forEach((car, carIndex) => {
    if (!car.npcControlled) return;
    const start = localOffset(car.x, car.z, 3.25, -.15, car.yaw);
    drivers.push({
      id: "driver-" + drivers.length, rig: {}, carIndex, state: "approach",
      elapsed: 0, start, x: start.x, z: start.z, y: collider.groundAt(start.x, start.z, 0, .8),
      turnTimer: 0, turnStartYaw: car.yaw, distanceLeft: 34 + drivers.length * 9,
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

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, .045), now = state.clock.elapsedTime;
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
      person.greetCooldown = Math.max(0, person.greetCooldown - dt);
      person.socialCooldown = Math.max(0, person.socialCooldown - dt);
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
        poseHuman(rig, { mode: "walk", phase: person.phase, speed: 0, air: false, t: now + person.tOffset, dt });
        continue;
      }
      const player = playerPositionRef?.current;
      const playerDistance = player ? Math.hypot(player.x - person.x, player.z - person.z) : Infinity;
      if (person.followPlayer && player && playerDistance > 65) {
        person.followPlayer = false;
        person.bubbleText = "התרחקת מאוד, אז אחזור לסיור שלי.";
        person.bubbleUntil = now + 3.2;
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
          person.bubbleText = "מה נשמע?"; person.bubbleUntil = now + 2.4;
          companion.bubbleText = "הכול טוב, תודה!"; companion.bubbleUntil = now + 2.4;
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
        poseHuman(rig, { mode: "walk", phase: person.phase, speed: 0, air: false, t: now + person.tOffset, dt });
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
        poseHuman(rig, { mode: "walk", phase: person.phase, speed: 0, air: false, t: now + person.tOffset, dt });
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
          person.waypoint++;
          if (person.waypoint >= person.route.length) {
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
              person.visitCountdown = 16 + Math.floor(nextRandom(person) * 22);
            } else person.waypoint = 0;
          }
          if (!person.visiting) {
            person.rngState = (Math.imul(person.rngState, 1664525) + 1013904223) >>> 0;
            person.wait = person.rngState % 5 === 0 ? 1.1 + (person.rngState % 120) / 100 : .12 + (person.rngState % 25) / 100;
            if (person.rngState % 29 === 0) {
              person.bubbleText = ["איזה יום יפה!", "נראה מה יש מעבר לפינה.", "אני אוהב את העיר הזאת."][person.rngState % 3];
              person.bubbleUntil = now + 2.6;
            }
          }
        }
        continue;
      }
      const speed = following ? 2.9 : person.visiting ? 1.8 : person.speed;
      const nx = dx / Math.max(distance, .001), nz = dz / Math.max(distance, .001);
      const stepLength = speed * dt, yLo = person.y + .12, yHi = person.y + 1.72;
      const resolveMove = (candidate) => {
        collider.resolve(candidate, person.y + .58, yHi, .31);
        resolvePeople(candidate, yLo, yHi, .31, walkers, person);
        resolveCarObstacles(candidate, yLo, yHi, .31, cars);
        resolveHelicopterBodies(candidate, yLo, yHi, .31, helis);
        resolveAirVehicleObstacles(candidate, yLo, yHi, .31, airVehicles);
        collider.resolve(candidate, person.y + .58, yHi, .31);
        return candidate;
      };
      let next = resolveMove({ x: person.x + nx * stepLength, z: person.z + nz * stepLength });
      let bestAdvance = distance - Math.hypot(target.x - next.x, target.z - next.z);
      let bestScore = bestAdvance;
      // Sample several smooth steering angles; prefer progress without pushing through people or walls.
      if (bestAdvance < stepLength * .42) {
        for (const angle of [-1.05, -.68, -.34, .34, .68, 1.05]) {
          const sx = nx * Math.cos(angle) - nz * Math.sin(angle);
          const sz = nz * Math.cos(angle) + nx * Math.sin(angle);
          const candidate = resolveMove({ x: person.x + sx * stepLength, z: person.z + sz * stepLength });
          const advance = distance - Math.hypot(target.x - candidate.x, target.z - candidate.z);
          const score = advance + Math.max(0, sx * nx + sz * nz) * stepLength * .08;
          if (score > bestScore + .012) { bestScore = score; bestAdvance = advance; next = candidate; }
        }
      }
      const movedX = next.x - person.x, movedZ = next.z - person.z;
      const moved = Math.hypot(movedX, movedZ);
      if (moved < .012) person.stuck += dt; else person.stuck = 0;
      person.x = next.x; person.z = next.z;
      person.y = collider.groundAt(person.x, person.z, person.y, .75, .32);
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
          person.waypoint = (person.waypoint + 1) % person.route.length;
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
      if (driver.turnTimer > 0) {
        const progress = clamp(1 - driver.turnTimer / 1.45, 0, 1);
        car.speed *= Math.exp(-5 * dt);
        car.yaw = driver.turnStartYaw + Math.PI * progress;
        driver.turnTimer -= dt;
        if (driver.turnTimer <= 0) {
          car.yaw = driver.turnStartYaw + Math.PI;
          driver.distanceLeft = 38;
          driver.blocked = 0;
        }
      } else {
        stepCar(car, { throttle: .62, steer: 0, brake: false }, dt, carEnv);
        driver.distanceLeft -= Math.abs(car.speed) * dt;
        if (Math.abs(car.speed) < 1.0) driver.blocked += dt; else driver.blocked = 0;
        if (driver.distanceLeft <= 0 || driver.blocked > 2.6 || Math.abs(car.x) > 113 || Math.abs(car.z) > 113) {
          driver.turnStartYaw = car.yaw;
          driver.turnTimer = 1.45;
          car.speed = 0;
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
    h(Human, { rig: person.rig }),
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
