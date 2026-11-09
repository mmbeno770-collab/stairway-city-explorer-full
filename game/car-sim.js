export const CAR = { MAX_FORWARD: 24, MAX_REVERSE: 8, ACCEL: 10, BRAKE: 18, DRAG: 1.8, STEER: 1.25, RADIUS: 1.05 };
export function makeCar(x, y, z, yaw = 0, color = "#c0392b", kind = "sedan") {
    const dimensions = kind === "tank" ? [3.8, 5.5] : kind === "bus" ? [2.5, 6.6] : kind === "jeep" ? [2.2, 4.5] : kind === "race" ? [2.0, 4.45] : [1.9, 4.15];
    return { x, y, z, yaw, speed: 0, steering: 0, color, kind, width: dimensions[0], length: dimensions[1], radius: dimensions[0] / 2, brake: false };
}
export function stepCar(car, controls, dt, env) {
    const throttle = Math.max(-1, Math.min(1, controls.throttle));
    const steer = Math.max(-1, Math.min(1, controls.steer));
    const tank = car.kind === "tank", bus = car.kind === "bus", race = car.kind === "race";
    const maxForward = tank ? 8.5 : bus ? 15 : race ? 32 : CAR.MAX_FORWARD;
    const acceleration = tank ? 4.8 : bus ? 7 : CAR.ACCEL;
    car.brake = controls.brake;
    if (controls.brake) car.speed *= Math.exp(-CAR.BRAKE * dt);
    else if (Math.abs(throttle) > .02) {
        const sameDirection = Math.sign(throttle) === Math.sign(car.speed) || Math.abs(car.speed) < .2;
        if (sameDirection) car.speed += throttle * acceleration * dt;
        else car.speed *= Math.exp(-CAR.BRAKE * .55 * dt);
    } else car.speed *= Math.exp(-CAR.DRAG * dt);
    car.speed = Math.max(-Math.min(8, maxForward * .38), Math.min(maxForward, car.speed));
    if (Math.abs(car.speed) < .035) car.speed = 0;
    const steerBlend = 1 - Math.exp(-8 * dt);
    car.steering += (steer - car.steering) * steerBlend;
    const speedFactor = Math.min(1, Math.abs(car.speed) / 3.5);
    car.yaw += car.steering * (tank ? .72 : bus ? .88 : CAR.STEER) * speedFactor * dt * Math.sign(car.speed || 1);
    const proposed = { x: car.x + Math.sin(car.yaw) * car.speed * dt, z: car.z + Math.cos(car.yaw) * car.speed * dt };
    const beforeX = proposed.x, beforeZ = proposed.z;
    env.resolve(proposed, car.y + .2, car.y + (car.kind === "bus" ? 2.5 : 1.75), (car.width || 1.9) / 2, car);
    const hit = Math.hypot(proposed.x - beforeX, proposed.z - beforeZ) > .025;
    car.x = proposed.x; car.z = proposed.z;
    if (hit) car.speed *= .24;
    const floor = env.ground(car.x, car.z, car.y);
    car.y = Math.max(0, floor + .12);
}
/** Resolve pedestrians and cars against each parked vehicle's oriented rectangular footprint. */
export function resolveCarObstacles(point, yLo, yHi, radius, cars, ignoreCar) {
    for (const other of cars) {
        if (other === ignoreCar) continue;
        const otherBottom = other.y, otherTop = other.y + (other.kind === "bus" ? 2.5 : 1.85);
        if (otherTop <= yLo || otherBottom >= yHi) continue;
        const dx = point.x - other.x, dz = point.z - other.z, c = Math.cos(other.yaw), s = Math.sin(other.yaw);
        let lx = dx * c - dz * s, lz = dx * s + dz * c;
        const halfW = (other.width || 1.9) / 2 + radius, halfL = (other.length || 4.15) / 2 + radius;
        if (Math.abs(lx) >= halfW || Math.abs(lz) >= halfL) continue;
        const pushX = halfW - Math.abs(lx), pushZ = halfL - Math.abs(lz);
        if (pushX < pushZ) lx = (lx < 0 ? -1 : 1) * halfW;
        else lz = (lz < 0 ? -1 : 1) * halfL;
        point.x = other.x + lx * c + lz * s;
        point.z = other.z - lx * s + lz * c;
    }
}
