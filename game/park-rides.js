import * as THREE from "three";

const COASTER_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-5.0, 3.1, -1.0),
  new THREE.Vector3(-4.4, 5.2, -4.4),
  new THREE.Vector3(-1.0, 4.25, -5.4),
  new THREE.Vector3(3.4, 3.5, -4.0),
  new THREE.Vector3(5.0, 4.0, -.5),
  new THREE.Vector3(4.1, 5.5, 3.7),
  new THREE.Vector3(.4, 4.35, 4.8),
  new THREE.Vector3(-3.9, 3.55, 3.2)
], true, "centripetal");

const RIDE_STOPS = [
  { type: "ferris", label: "הגלגל הענק", boardX: -5.4, boardZ: 1.2, radius: 3.1, exitX: -8.0, exitZ: 1.2 },
  { type: "carousel", label: "הקרוסלה", boardX: 6.5, boardZ: 2.5, radius: 3.3, exitX: 10.2, exitZ: 2.5 },
  { type: "drop", label: "מתקן הנפילה", boardX: 7.2, boardZ: -9.6, radius: 2.8, exitX: 9.8, exitZ: -9.6 },
  { type: "coaster", label: "רכבת ההרים", boardX: -4.5, boardZ: -4.0, radius: 3.1, exitX: -7.0, exitZ: -5.5 },
  { type: "swing", label: "נדנדת השרשראות", boardX: -11.0, boardZ: -6.0, radius: 3.0, exitX: -14.4, exitZ: -6.0 },
  { type: "bumper", label: "מכוניות מתנגשות", boardX: -1.4, boardZ: 7.0, radius: 3.5, exitX: -6.2, exitZ: 10.0 },
  { type: "train", label: "רכבת הילדים", boardX: 10.8, boardZ: -3.8, radius: 3.1, exitX: 12.8, exitZ: -3.8 }
];

export function getParkRideLocations(place) {
  if (!place) return [];
  return RIDE_STOPS.map((stop) => ({
    ...stop,
    x: place.x + stop.boardX,
    z: place.z + stop.boardZ,
    parkX: place.x,
    parkZ: place.z,
    exitX: place.x + stop.exitX,
    exitZ: place.z + stop.exitZ
  }));
}

export function getCoasterCartPose(time) {
  const progress = (time * .052) % 1;
  const position = COASTER_CURVE.getPointAt(progress);
  const tangent = COASTER_CURVE.getTangentAt(progress);
  return {
    x: .5 + position.x,
    y: position.y + .17,
    z: -3.0 + position.z,
    yaw: Math.atan2(tangent.x, tangent.z),
    pitch: Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z))
  };
}

export function getDropTowerCabinY(time) {
  const cycle = ((time % 12) + 12) % 12;
  const smooth = (value) => value * value * (3 - 2 * value);
  if (cycle < 3.2) return 1.35 + 6.7 * smooth(cycle / 3.2);
  if (cycle < 4.7) return 8.05;
  if (cycle < 5.25) return 8.05 - 6.7 * smooth((cycle - 4.7) / .55);
  return 1.35;
}

export function getParkRidePose(type, parkX, parkZ, time, index = 0) {
  switch (type) {
    case "ferris": {
      const angle = time * .095 + index * Math.PI * 2 / 10;
      return { x: parkX - 5.4 + Math.cos(angle) * 5, y: 8.1 + Math.sin(angle) * 5 - .39, z: parkZ + 1.2, yaw: 0, pitch: 0, roll: 0 };
    }
    case "carousel": {
      const angle = time * .22 + index * Math.PI / 4;
      return { x: parkX + 6.5 + Math.cos(angle) * 2.15, y: 1.28, z: parkZ + 5.2 - Math.sin(angle) * 2.15, yaw: time * .22, pitch: 0, roll: 0 };
    }
    case "coaster": {
      const cart = getCoasterCartPose(time);
      return { ...cart, x: parkX + cart.x, y: cart.y + .24, z: parkZ + cart.z, roll: 0 };
    }
    case "swing": {
      const angle = index * Math.PI * 2 / 10 - time * .52;
      return { x: parkX - 11.0 + Math.cos(angle) * 2.45, y: 2.88, z: parkZ - 3.4 + Math.sin(angle) * 2.45, yaw: time * .52, pitch: 0, roll: 0 };
    }
    case "bumper": {
      const angle = time * (.48 + index * .025) + index * Math.PI / 2;
      const radiusX = 2.0 + (index % 2) * .45;
      const radiusZ = 1.45 + (index % 2) * .3;
      return { x: parkX - 1.4 + Math.cos(angle) * radiusX, y: .28, z: parkZ + 10.0 + Math.sin(angle) * radiusZ, yaw: -angle + Math.PI / 2, pitch: 0, roll: 0 };
    }
    case "train": {
      const angle = index * Math.PI * 2 / 3 - time * .28;
      return { x: parkX + 10.8 + Math.cos(angle) * 2.05, y: .48, z: parkZ - .8 + Math.sin(angle) * 2.05, yaw: time * .28, pitch: 0, roll: 0 };
    }
    case "drop":
      return { x: parkX + 7.2, y: getDropTowerCabinY(time) - .5, z: parkZ - 7.0, yaw: 0, pitch: 0, roll: 0 };
    default:
      return { x: parkX, y: 0, z: parkZ, yaw: 0, pitch: 0, roll: 0 };
  }
}
