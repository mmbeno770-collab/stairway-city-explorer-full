export const ELEVATOR_FLOOR_HEIGHT = 4;
export const ELEVATOR_SPEED = 3.5;
export const ELEVATOR_MIN_TRAVEL_SECONDS = 1.15;
export function floorHeight(floor, floorCount) {
    const last = Math.max(0, Math.floor(floorCount) - 1);
    const safeFloor = Math.max(-1, Math.min(last, Math.floor(floor)));
    return safeFloor * ELEVATOR_FLOOR_HEIGHT;
}
export function makeElevatorTrip(from, to, phase) {
    const distance = Math.abs(to - from);
    return { from, to, elapsed: 0, duration: Math.max(ELEVATOR_MIN_TRAVEL_SECONDS, distance / ELEVATOR_SPEED), phase };
}
/** Advance the trip with a smoothstep curve and clamp its terminal state. */
export function advanceElevatorTrip(trip, deltaSeconds) {
    const safeDelta = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
    trip.elapsed = Math.min(trip.duration, trip.elapsed + safeDelta);
    const progress = trip.duration <= 0 ? 1 : trip.elapsed / trip.duration;
    const eased = progress * progress * (3 - 2 * progress);
    return { y: trip.from + (trip.to - trip.from) * eased, progress, done: progress >= 1 };
}
/** Landing doors open only when the cab is stationary and level with that floor. */
export function isElevatorLandingOpen(cabY, floor, moving) {
    return !moving && Math.abs(cabY - floorHeight(floor, floor + 1)) < 0.08;
}
