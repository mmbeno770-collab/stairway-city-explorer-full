export const HELI = { MAX_SPEED: 26, ACCEL: 1.2, YAW_RATE: 1.3, CLIMB: 8, SPINUP: .5, SPINDOWN: .25, RAD: 1.5, MAX_ALT: 150 };
export function makeHeli(x, y, z, yaw = 0, scale = 1, padSize = 6) {
    const size = Math.max(.25, Number(scale) || 1);
    return { x, y, z, homeX: x, homeY: y, homeZ: z, yaw, pitch: 0, roll: 0, vx: 0, vy: 0, vz: 0, rotor: 0, rotA: 0, trA: 0, grounded: true, scale: size, radius: HELI.RAD * size, padSize };
}
export function stepHeli(h, c, dt, env) {
    h.rotor = c.piloted ? Math.min(1, h.rotor + dt * HELI.SPINUP) : Math.max(0, h.rotor - dt * HELI.SPINDOWN);
    const power = h.rotor > .85, air = !h.grounded, size = h.scale || 1;
    const maxSpeed = HELI.MAX_SPEED * (size < .95 ? .78 : 1), climbRate = HELI.CLIMB * (size < .95 ? .88 : 1);
    if (power && air) h.yaw += c.turn * HELI.YAW_RATE * dt;
    const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw), target = power && air ? c.fwd * maxSpeed : 0, a = 1 - Math.exp(-HELI.ACCEL * dt);
    h.vx += (fx * target - h.vx) * a; h.vz += (fz * target - h.vz) * a;
    if (!air) { h.vx *= Math.exp(-6 * dt); h.vz *= Math.exp(-6 * dt); }
    const vyTarget = power ? c.lift * climbRate : air ? -9 : 0;
    h.vy += (vyTarget - h.vy) * (1 - Math.exp(-3 * dt));
    const p = { x: h.x + h.vx * dt, z: h.z + h.vz * dt };
    const radius = h.radius || HELI.RAD;
    env.resolve(p, h.y + .4 * size, h.y + 2.3 * size, radius); h.x = p.x; h.z = p.z;
    let ny = h.y + h.vy * dt; const floor = env.ground(h.x, h.z, h.y, radius);
    if (ny <= floor) { ny = floor; if (h.vy < 0) h.vy = 0; h.grounded = !(h.vy > .1); } else h.grounded = false;
    h.y = Math.min(ny, HELI.MAX_ALT);
    const fwdSpeed = h.vx * fx + h.vz * fz, pitchTarget = h.grounded ? 0 : (fwdSpeed / maxSpeed) * .22 + c.fwd * .08;
    const rollTarget = h.grounded ? 0 : c.turn * .28 * Math.min(1, Math.abs(fwdSpeed) / 6 + .3), blend = 1 - Math.exp(-3 * dt);
    h.pitch += (pitchTarget - h.pitch) * blend; h.roll += (rollTarget - h.roll) * blend;
    h.rotA += h.rotor * dt * 45; h.trA += h.rotor * dt * 70;
}
export function canExitHeli(h) { return h.grounded && Math.hypot(h.vx, h.vz) < 2; }
