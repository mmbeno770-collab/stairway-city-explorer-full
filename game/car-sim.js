export const CAR = { MAX_FORWARD: 24, MAX_REVERSE: 8, ACCEL: 10, BRAKE: 18, DRAG: 1.8, STEER: 1.25, RADIUS: 1.05 };
export function makeCar(x, y, z, yaw = 0, color = "#c0392b") {
    return { x, y, z, yaw, speed: 0, steering: 0, color, brake: false };
}
export function stepCar(car, controls, dt, env) {
    const throttle = Math.max(-1, Math.min(1, controls.throttle));
    const steer = Math.max(-1, Math.min(1, controls.steer));
    car.brake = controls.brake;
    if (controls.brake) car.speed *= Math.exp(-CAR.BRAKE * dt);
    else if (Math.abs(throttle) > .02) {
        const sameDirection = Math.sign(throttle) === Math.sign(car.speed) || Math.abs(car.speed) < .2;
        if (sameDirection) car.speed += throttle * CAR.ACCEL * dt;
        else car.speed *= Math.exp(-CAR.BRAKE * .55 * dt);
    } else car.speed *= Math.exp(-CAR.DRAG * dt);
    car.speed = Math.max(-CAR.MAX_REVERSE, Math.min(CAR.MAX_FORWARD, car.speed));
    if (Math.abs(car.speed) < .035) car.speed = 0;
    const steerBlend = 1 - Math.exp(-8 * dt);
    car.steering += (steer - car.steering) * steerBlend;
    const speedFactor = Math.min(1, Math.abs(car.speed) / 3.5);
    car.yaw += car.steering * CAR.STEER * speedFactor * dt * Math.sign(car.speed || 1);
    const proposed = { x: car.x + Math.sin(car.yaw) * car.speed * dt, z: car.z + Math.cos(car.yaw) * car.speed * dt };
    const beforeX = proposed.x, beforeZ = proposed.z;
    env.resolve(proposed, car.y + .2, car.y + 1.55, CAR.RADIUS, car);
    const hit = Math.hypot(proposed.x - beforeX, proposed.z - beforeZ) > .025;
    car.x = proposed.x; car.z = proposed.z;
    if (hit) car.speed *= .24;
    const floor = env.ground(car.x, car.z, car.y);
    car.y = Math.max(0, floor + .12);
}
/** Resolve a car against the parked/other driveable cars without colliding with itself. */
export function resolveCarObstacles(point, yLo, yHi, radius, cars, ignoreCar) {
    for (const other of cars) {
        if (other === ignoreCar) continue;
        const otherBottom = other.y, otherTop = other.y + 1.75;
        if (otherTop <= yLo || otherBottom >= yHi) continue;
        let dx = point.x - other.x, dz = point.z - other.z;
        let distance = Math.hypot(dx, dz);
        const minimum = radius + 1.35;
        if (distance >= minimum) continue;
        if (distance < 1e-5) { dx = 1; dz = 0; distance = 1; }
        point.x = other.x + dx / distance * minimum;
        point.z = other.z + dz / distance * minimum;
    }
}
