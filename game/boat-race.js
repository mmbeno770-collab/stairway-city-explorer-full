import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { getWaterHeight } from "./marine-world.js";

const h = React.createElement;
export const BOAT_RACE_COURSE = [
  { x: 0, z: -232, label: "שער הזינוק" },
  { x: 232, z: 0, label: "מצוף מזרח" },
  { x: 0, z: 232, label: "מצוף דרום" },
  { x: -232, z: 0, label: "מצוף מערב" },
  { x: 0, z: -232, label: "קו הסיום" }
];

function RaceBuoy({ point, index, raceRef }) {
  const root = useRef(null);
  const ring = useRef(null);
  const material = useRef(null);
  useFrame(({ clock }) => {
    if (!root.current) return;
    const t = clock.elapsedTime;
    const race = raceRef?.current;
    const active = !!race?.active && race.checkpoint === index;
    root.current.position.y = getWaterHeight(point.x, point.z, t) + .1 + Math.sin(t * 1.7 + index) * .07;
    root.current.rotation.y = t * .2 + index;
    if (ring.current) ring.current.rotation.z = Math.sin(t * 1.1 + index) * .08;
    if (material.current) {
      material.current.emissiveIntensity = active ? 1.8 + Math.sin(t * 5) * .5 : .4;
      material.current.color.set(active ? "#fff0a1" : index % 2 ? "#ef6b61" : "#f2e7d3");
    }
  });
  return h("group", { ref: root, position: [point.x, -.05, point.z] },
    h("mesh", { position: [0, .5, 0], material: new THREE.MeshStandardMaterial({ color: "#f2d7a1", roughness: .36 }) },
      h("cylinderGeometry", { args: [.13, .22, 1.15, 9] })),
    h("mesh", { position: [0, 1.04, 0], material: new THREE.MeshStandardMaterial({ color: index % 2 ? "#e95650" : "#f3eee0", roughness: .4 }) },
      h("sphereGeometry", { args: [.36, 12, 9] })),
    h("mesh", { ref: ring, position: [0, 1.85, 0], rotation: [0, Math.PI / 2, 0] },
      h("torusGeometry", { args: [.82, .1, 8, 20] }),
      h("meshStandardMaterial", { ref: material, color: "#f4df9a", emissive: "#b88737", emissiveIntensity: .4, metalness: .35, roughness: .3 })),
    h("mesh", { position: [0, .18, 0], rotation: [-Math.PI / 2, 0, 0] },
      h("torusGeometry", { args: [.62, .045, 6, 22] }),
      h("meshBasicMaterial", { color: "#d9f5f3", transparent: true, opacity: .6, depthWrite: false }))
  );
}

export function BoatRaceCourse({ raceRef }) {
  return h(React.Fragment, null,
    ...BOAT_RACE_COURSE.slice(1, -1).map((point, index) => h(RaceBuoy, { key: "race-buoy-" + index, point, index: index + 1, raceRef })),
    h("group", { position: [0, -.05, -232] },
      h("mesh", { position: [-4.2, .7, 0], material: new THREE.MeshStandardMaterial({ color: "#e5e9e0" }) },
        h("cylinderGeometry", { args: [.16, .2, 1.45, 8] })),
      h("mesh", { position: [4.2, .7, 0], material: new THREE.MeshStandardMaterial({ color: "#e5e9e0" }) },
        h("cylinderGeometry", { args: [.16, .2, 1.45, 8] })),
      h("mesh", { position: [0, 1.35, 0], material: new THREE.MeshStandardMaterial({ color: "#dcb86c", emissive: "#89652f", emissiveIntensity: .35 }) },
        h("boxGeometry", { args: [8.8, .18, .22] }))
    )
  );
}
