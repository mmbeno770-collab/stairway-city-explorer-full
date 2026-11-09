export const AIR_LIMITS = {
  plane: { maxSpeed: 38, acceleration: 5.5, turnRate: .72, maxAltitude: 48, takeoffSpeed: 10, climbRate: 5.2, groundOffset: .12, radius: 2.2, drag: .12 },
  tesla: { maxSpeed: 23, acceleration: 8.5, turnRate: 1.12, maxAltitude: 9.5, takeoffSpeed: 0, climbRate: 2.5, groundOffset: .82, radius: 1.2, drag: .55 }
};
export function makeAirVehicle(source) {
  return { ...source, speed: 0, vx: 0, vy: 0, vz: 0, pitch: 0, roll: 0, altitude: 0, grounded: true };
}
export function stepAirVehicle(vehicle, controls, dt, env) {
  const limits = AIR_LIMITS[vehicle.id] || AIR_LIMITS.tesla;
  const throttle = Math.max(-1, Math.min(1, controls.throttle || 0));
  const steer = Math.max(-1, Math.min(1, controls.steer || 0));
  const lift = Math.max(-1, Math.min(1, controls.lift || 0));
  const floorY = env.ground(vehicle.x, vehicle.z, vehicle.y) + limits.groundOffset;
  if (Math.abs(throttle) > .02) vehicle.speed += throttle * limits.acceleration * dt;
  else vehicle.speed *= Math.exp(-limits.drag * dt);
  vehicle.speed = Math.max(-7, Math.min(limits.maxSpeed, vehicle.speed));
  if (Math.abs(vehicle.speed) < .04) vehicle.speed = 0;
  const turnBlend = Math.min(1, Math.abs(vehicle.speed) / 4);
  vehicle.yaw += steer * limits.turnRate * turnBlend * dt * Math.sign(vehicle.speed || 1);
  if (vehicle.grounded) {
    vehicle.y = floorY; vehicle.vy = 0; vehicle.altitude = 0;
    if ((vehicle.id === "tesla" && lift > .08) || (vehicle.id === "plane" && lift > .08 && vehicle.speed >= limits.takeoffSpeed)) {
      vehicle.grounded = false; vehicle.vy = vehicle.id === "plane" ? 2.2 : 1.2;
    }
  } else {
    const targetVertical = lift > .08 ? limits.climbRate : lift < -.08 ? -limits.climbRate : (vehicle.id === "plane" ? -.22 : -.12);
    vehicle.vy += (targetVertical - vehicle.vy) * (1 - Math.exp(-2.8 * dt));
    const move = { x: vehicle.x + Math.sin(vehicle.yaw) * vehicle.speed * dt, z: vehicle.z + Math.cos(vehicle.yaw) * vehicle.speed * dt };
    const beforeX = move.x, beforeZ = move.z;
    env.resolve(move, vehicle.y + .1, vehicle.y + (vehicle.id === "plane" ? 2.1 : 1.85), limits.radius, vehicle);
    if (Math.hypot(move.x - beforeX, move.z - beforeZ) > .03) vehicle.speed *= .3;
    vehicle.x = move.x; vehicle.z = move.z;
    const newGround = env.ground(vehicle.x, vehicle.z, vehicle.y) + limits.groundOffset;
    vehicle.y += vehicle.vy * dt;
    const ceiling = newGround + limits.maxAltitude;
    if (vehicle.y > ceiling) { vehicle.y = ceiling; vehicle.vy = Math.min(0, vehicle.vy); }
    if (vehicle.y <= newGround) { vehicle.y = newGround; vehicle.vy = 0; vehicle.grounded = true; vehicle.speed *= .9; }
    vehicle.altitude = Math.max(0, vehicle.y - newGround);
  }
  const speedFactor = Math.min(1, Math.abs(vehicle.speed) / (vehicle.id === "plane" ? 22 : 12));
  const pitchTarget = vehicle.grounded ? 0 : lift > .08 ? -.1 : lift < -.08 ? .08 : vehicle.id === "plane" ? -.025 : 0;
  const rollTarget = vehicle.grounded ? 0 : -steer * .2 * speedFactor;
  vehicle.pitch += (pitchTarget - vehicle.pitch) * (1 - Math.exp(-3.5 * dt));
  vehicle.roll += (rollTarget - vehicle.roll) * (1 - Math.exp(-3.5 * dt));
  vehicle.vx = Math.sin(vehicle.yaw) * vehicle.speed; vehicle.vz = Math.cos(vehicle.yaw) * vehicle.speed;
  return vehicle;
}
export function canExitAirVehicle(vehicle) { return !!vehicle?.grounded && Math.abs(vehicle.speed) < 1.2; }
