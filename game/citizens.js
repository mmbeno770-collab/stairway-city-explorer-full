import React, { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Human, poseHuman } from "./human.js";
import { Collider, BLOCK } from "./world.js";
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
  const walkerCount = Math.min(8, buildings.length);
  for (let i = 0; i < walkerCount; i++) {
    const building = buildings[(i * 7 + 3) % buildings.length];
    const route = makeWalkRoute(building);
    const point = route[(i * 3) % route.length];
    walkers.push({
      id: "walker-" + i, rig: {}, route, waypoint: (i * 3 + 1) % route.length,
      x: point.x, y: collider.groundAt(point.x, point.z, 0, .8), z: point.z,
      yaw: i * .71, speed: 1.35 + (i % 4) * .18, phase: i * 1.2,
      wait: (i % 3) * .65, stuck: 0, hidden: false, tOffset: i * .83
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

export function Citizens({ world, cars, helis, airVehicles, activeVehicleRef }) {
  const collider = useMemo(() => new Collider(world.boxes), [world]);
  const sim = useMemo(() => makeCitizens(world, cars, helis, airVehicles, collider), [world, cars, helis, airVehicles, collider]);

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

    for (const person of walkers) {
      const rig = person.rig;
      if (person.wait > 0) {
        person.wait -= dt;
        if (rig.root) {
          rig.root.position.set(person.x, person.y, person.z);
          rig.root.rotation.y = person.yaw + Math.sin(now * .6 + person.tOffset) * .13;
          rig.root.visible = true;
        }
        poseHuman(rig, { mode: "walk", phase: person.phase, speed: 0, air: false, t: now + person.tOffset, dt });
        continue;
      }
      const target = person.route[person.waypoint];
      const dx = target.x - person.x, dz = target.z - person.z, distance = Math.hypot(dx, dz);
      if (distance < .55) {
        person.waypoint = (person.waypoint + 1) % person.route.length;
        person.wait = (person.waypoint % 3 === 0) ? .8 + (Number(person.id.slice(-1)) % 3) * .55 : .08;
        continue;
      }
      const speed = person.speed, nx = dx / Math.max(distance, .001), nz = dz / Math.max(distance, .001);
      const next = { x: person.x + nx * speed * dt, z: person.z + nz * speed * dt };
      collider.resolve(next, person.y + .12, person.y + 1.72, .31);
      resolveCarObstacles(next, person.y + .12, person.y + 1.72, .31, cars);
      resolveHelicopterBodies(next, person.y + .12, person.y + 1.72, .31, helis);
      resolveAirVehicleObstacles(next, person.y + .12, person.y + 1.72, .31, airVehicles);
      const moved = Math.hypot(next.x - person.x, next.z - person.z);
      if (moved < .012) person.stuck += dt; else person.stuck = 0;
      person.x = next.x; person.z = next.z;
      person.y = collider.groundAt(person.x, person.z, person.y, .75, .32);
      person.yaw = Math.atan2(nx, nz);
      person.phase += (moved / Math.max(dt, .001)) * dt * 2.1;
      if (person.stuck > 1.5) {
        person.stuck = 0;
        person.waypoint = (person.waypoint + 1) % person.route.length;
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

  return h(React.Fragment, null, sim.all.map((person) => h(Human, { key: person.id, rig: person.rig })));
}
