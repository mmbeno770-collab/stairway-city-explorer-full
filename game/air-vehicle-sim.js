function clampAltitude(value, min, max) { return Math.max(min, Math.min(max, value)); }

const AIR_VEHICLE = {
  plane: { maxSpeed: 30, acceleration: 7.6, drag: 1.15, steer: 1.05, radius: 2.25, halfWidth: 4.9, halfLength: 3.9, height: 1.95, groundOffset: .12, maxAltitude: 34 },
  tesla: { maxSpeed: 21, acceleration: 8.4, drag: 1.45, steer: 1.35, radius: 1.05, halfWidth: 1.12, halfLength: 2.25, height: 1.48, groundOffset: .82, maxAltitude: 5.2 }
};

export function makeAirVehicle(item) {
  const id = item.id === "plane" ? "plane" : "tesla";
  return {
    id, x: item.x, y: item.y, z: item.z, yaw: item.yaw ?? 0,
    pitch: 0, roll: 0, speed: 0, verticalSpeed: 0,
    grounded: true, idleTime: 0
  };
}

export function stepAirVehicle(vehicle, controls, dt, env) {
  const spec = AIR_VEHICLE[vehicle.id] || AIR_VEHICLE.tesla;
  const throttle = Math.max(-1, Math.min(1, controls.throttle || 0));
  const steer = Math.max(-1, Math.min(1, controls.steer || 0));
  const lift = Math.max(-1, Math.min(1, controls.lift || 0));
  const piloted = !!controls.piloted;
  vehicle.idleTime += dt;

  if (piloted) {
    if (Math.abs(throttle) > .025) {
      const sameDirection = Math.sign(throttle) === Math.sign(vehicle.speed) || Math.abs(vehicle.speed) < .25;
      if (sameDirection) vehicle.speed += throttle * spec.acceleration * dt;
      else vehicle.speed *= Math.exp(-4.8 * dt);
    } else vehicle.speed *= Math.exp(-spec.drag * dt);
    vehicle.speed = Math.max(-6, Math.min(spec.maxSpeed, vehicle.speed));
    const steerFactor = Math.min(1, Math.abs(vehicle.speed) / 5);
    vehicle.yaw += steer * spec.steer * steerFactor * dt * Math.sign(vehicle.speed || 1);
  } else {
    vehicle.speed *= Math.exp(-3.2 * dt);
  }

  const proposed = {
    x: vehicle.x + Math.sin(vehicle.yaw) * vehicle.speed * dt,
    z: vehicle.z + Math.cos(vehicle.yaw) * vehicle.speed * dt
  };
  const beforeX = proposed.x, beforeZ = proposed.z;
  if (piloted) env.resolve(proposed, vehicle.y, vehicle.y + spec.height, spec.radius, vehicle);
  if (Math.hypot(proposed.x - beforeX, proposed.z - beforeZ) > .025) vehicle.speed *= .22;
  vehicle.x = proposed.x;
  vehicle.z = proposed.z;

  const floor = env.ground(vehicle.x, vehicle.z, vehicle.y);
  const baseY = floor + spec.groundOffset;
  if (vehicle.id === "tesla") {
    if (piloted && Number.isFinite(controls.altitudeTarget)) {
      const targetVerticalSpeed = clampAltitude((controls.altitudeTarget - vehicle.y) * 1.45, -2.6, 2.6);
      vehicle.verticalSpeed += (targetVerticalSpeed - vehicle.verticalSpeed) * (1 - Math.exp(-3.2 * dt));
      vehicle.y += vehicle.verticalSpeed * dt;
    } else if (piloted) {
      const targetVerticalSpeed = lift * 3.15;
      vehicle.verticalSpeed += (targetVerticalSpeed - vehicle.verticalSpeed) * (1 - Math.exp(-5.5 * dt));
      vehicle.y += vehicle.verticalSpeed * dt;
      vehicle.y = Math.max(baseY, Math.min(floor + spec.maxAltitude, vehicle.y));
      if (vehicle.y <= baseY + .001 && vehicle.verticalSpeed < 0) vehicle.verticalSpeed = 0;
      if (vehicle.y >= floor + spec.maxAltitude - .001 && vehicle.verticalSpeed > 0) vehicle.verticalSpeed = 0;
      vehicle.grounded = vehicle.y <= baseY + .03;
    } else {
      vehicle.verticalSpeed = 0;
      vehicle.y = baseY + Math.sin(vehicle.idleTime * 2.1) * .1;
      vehicle.grounded = true;
    }
    if (piloted) {
      vehicle.y = clampAltitude(vehicle.y, baseY, floor + spec.maxAltitude);
      if (vehicle.y <= baseY + .001 && vehicle.verticalSpeed < 0) vehicle.verticalSpeed = 0;
      if (vehicle.y >= floor + spec.maxAltitude - .001 && vehicle.verticalSpeed > 0) vehicle.verticalSpeed = 0;
      vehicle.grounded = vehicle.y <= baseY + .03;
    }
    vehicle.pitch = Math.max(-.16, Math.min(.16, -vehicle.verticalSpeed * .025 + Math.max(-.04, Math.min(.04, vehicle.speed * .001))));
    vehicle.roll = -steer * .12 * (piloted ? 1 : 0);
    return;
  }

  if (piloted && Number.isFinite(controls.altitudeTarget)) {
    const targetVerticalSpeed = clampAltitude((controls.altitudeTarget - vehicle.y) * .62, -4.2, 4.2);
    vehicle.verticalSpeed += (targetVerticalSpeed - vehicle.verticalSpeed) * (1 - Math.exp(-2.6 * dt));
    vehicle.y += vehicle.verticalSpeed * dt;
    if (vehicle.y <= baseY) { vehicle.y = baseY; vehicle.verticalSpeed = 0; }
    if (vehicle.y >= floor + spec.maxAltitude) { vehicle.y = floor + spec.maxAltitude; vehicle.verticalSpeed = Math.min(0, vehicle.verticalSpeed); }
    vehicle.grounded = vehicle.y <= baseY + .04;
  } else if (piloted) {
    const airborne = vehicle.y > baseY + .16;
    if (lift > .05 && vehicle.speed > 6.5) vehicle.verticalSpeed += (5.2 + Math.min(2.4, vehicle.speed * .05)) * lift * dt;
    else if (lift < -.05) vehicle.verticalSpeed += 7.4 * lift * dt;
    else if (airborne) vehicle.verticalSpeed -= 5.1 * dt;
    if (!airborne && vehicle.verticalSpeed < 0) vehicle.verticalSpeed = 0;
    vehicle.y += vehicle.verticalSpeed * dt;
    if (vehicle.y <= baseY) { vehicle.y = baseY; vehicle.verticalSpeed = 0; }
    if (vehicle.y >= floor + spec.maxAltitude) { vehicle.y = floor + spec.maxAltitude; vehicle.verticalSpeed = Math.min(0, vehicle.verticalSpeed); }
    vehicle.grounded = vehicle.y <= baseY + .04;
  } else {
    vehicle.verticalSpeed = 0;
    vehicle.y = baseY;
    vehicle.grounded = true;
  }
  vehicle.pitch = Math.max(-.28, Math.min(.28, -vehicle.verticalSpeed * .035));
  vehicle.roll = -steer * .24 * (piloted ? 1 : 0);
}

export function canExitAirVehicle(vehicle, groundAt) {
  const spec = AIR_VEHICLE[vehicle.id] || AIR_VEHICLE.tesla;
  const floor = groundAt(vehicle.x, vehicle.z, vehicle.y);
  const baseY = floor + spec.groundOffset;
  return Math.abs(vehicle.y - baseY) < .42 && Math.abs(vehicle.speed) < 1.35;
}

export function resolveAirVehicleObstacles(point, yLo, yHi, radius, vehicles, ignoreVehicle = null) {
  for (const other of vehicles) {
    if (other === ignoreVehicle) continue;
    const spec = AIR_VEHICLE[other.id] || AIR_VEHICLE.tesla;
    if (other.y + spec.height <= yLo || other.y >= yHi) continue;
    const dx = point.x - other.x, dz = point.z - other.z;
    const c = Math.cos(other.yaw), s = Math.sin(other.yaw);
    let lx = dx * c - dz * s, lz = dx * s + dz * c;
    const halfW = spec.halfWidth + radius, halfL = spec.halfLength + radius;
    if (Math.abs(lx) >= halfW || Math.abs(lz) >= halfL) continue;
    const pushX = halfW - Math.abs(lx), pushZ = halfL - Math.abs(lz);
    if (pushX < pushZ) lx = (lx < 0 ? -1 : 1) * halfW;
    else lz = (lz < 0 ? -1 : 1) * halfL;
    point.x = other.x + lx * c + lz * s;
    point.z = other.z - lx * s + lz * c;
  }
}
