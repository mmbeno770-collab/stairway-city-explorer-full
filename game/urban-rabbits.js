import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const h = React.createElement;
const furMats = ["#bcae9e", "#e5ded2", "#8e8277", "#c9b89f", "#eee5d7"].map(color => new THREE.MeshStandardMaterial({ color, roughness: .94 }));
const innerEar = new THREE.MeshStandardMaterial({ color: "#cf9c9b", roughness: .9 });
const eye = new THREE.MeshBasicMaterial({ color: "#20242a" });

export function UrbanRabbits({ playerPositionRef }) {
  const roots = useRef([]);
  const legs = useRef([]);
  const ears = useRef([]);
  const animals = useMemo(() => {
    const parks = [
      { x: -126, z: -126 },
      { x: 162, z: 162 },
      { x: 108, z: -90 },
      { x: 72, z: 126 }
    ];
    return Array.from({ length: 10 }, (_, i) => {
      const park = parks[i % parks.length];
      const angle = i * 2.399963;
      const radius = 2.8 + (i % 4) * 1.1;
      return {
        x: park.x + Math.cos(angle) * radius,
        z: park.z + Math.sin(angle) * radius,
        homeX: park.x, homeZ: park.z, phase: i * 1.71,
        speed: .26 + (i % 4) * .045, hopRate: 2.1 + (i % 3) * .25,
        radius: 2.4 + (i % 3) * 1.2, color: i % furMats.length
      };
    });
  }, []);
  useFrame(({ clock }, rawDt) => {
    const time = clock.elapsedTime, dt = Math.min(rawDt, .05), player = playerPositionRef?.current;
    animals.forEach((animal, i) => {
      const root = roots.current[i];
      if (!root) return;
      const dx = player ? animal.x - player.x : 100, dz = player ? animal.z - player.z : 100;
      const distance = Math.hypot(dx, dz);
      const fleeing = distance < 7;
      const angle = time * animal.speed + animal.phase;
      const wanderX = animal.homeX + Math.cos(angle) * animal.radius;
      const wanderZ = animal.homeZ + Math.sin(angle * .82) * animal.radius;
      const targetX = fleeing ? animal.homeX + Math.sign(dx || 1) * animal.radius * 1.4 : wanderX;
      const targetZ = fleeing ? animal.homeZ + Math.sign(dz || 1) * animal.radius * 1.4 : wanderZ;
      const factor = 1 - Math.exp(-dt * (fleeing ? 3.2 : 1.25));
      animal.x = THREE.MathUtils.lerp(animal.x, targetX, factor);
      animal.z = THREE.MathUtils.lerp(animal.z, targetZ, factor);
      const hop = Math.max(0, Math.sin(time * animal.hopRate + animal.phase));
      root.position.set(animal.x, .04 + hop * (fleeing ? .68 : .34), animal.z);
      const vx = targetX - animal.x, vz = targetZ - animal.z;
      if (Math.hypot(vx, vz) > .02) root.rotation.y = Math.atan2(vx, vz);
      root.scale.y = 1 + hop * .09;
      if (legs.current[i]) legs.current[i].forEach((leg, j) => {
        if (leg) leg.rotation.x = Math.sin(time * 9 + animal.phase + j * Math.PI) * .17 * (fleeing ? 1.5 : 1);
      });
      if (ears.current[i]) ears.current[i].forEach((ear, j) => {
        if (ear) ear.rotation.z = (j === 0 ? -.08 : .08) + Math.sin(time * 4 + animal.phase) * .035;
      });
    });
  });
  return h(React.Fragment, null, ...animals.map((animal, i) => h("group", {
    key: "urban-rabbit-" + i,
    ref: node => { roots.current[i] = node; },
    position: [animal.x, 0, animal.z]
  },
    h("mesh", { material: furMats[animal.color], position: [0, .42, 0], scale: [.34, .3, .48], castShadow: true },
      h("sphereGeometry", { args: [1, 14, 10] })),
    h("mesh", { material: furMats[animal.color], position: [0, .62, .34], scale: [.25, .24, .25] },
      h("sphereGeometry", { args: [1, 14, 10] })),
    h("mesh", { material: furMats[animal.color], position: [0, .3, -.42], scale: [.16, .16, .16] },
      h("sphereGeometry", { args: [1, 10, 8] })),
    ...[-1, 1].map((side, j) => h("group", { key: "ear-" + side, ref: node => {
      if (!ears.current[i]) ears.current[i] = [];
      ears.current[i][j] = node;
    }, position: [side * .12, .83, .36], rotation: [0, 0, side * .08] },
      h("mesh", { material: furMats[animal.color], position: [0, .25, 0], scale: [.085, .29, .07] },
        h("capsuleGeometry", { args: [.09, .38, 4, 7] })),
      h("mesh", { material: innerEar, position: [0, .25, .064], scale: [.046, .21, .018] },
        h("capsuleGeometry", { args: [.05, .26, 3, 6] }))
    )),
    ...[-1, 1].map(side => h("mesh", { key: "eye-" + side, material: eye, position: [side * .18, .66, .55], scale: [.035, .04, .025] },
      h("sphereGeometry", { args: [1, 8, 6] }))),
    ...[-1, 1].flatMap((side, j) => [
      h("group", { key: "leg-" + side, ref: node => {
        if (!legs.current[i]) legs.current[i] = [];
        legs.current[i][j] = node;
      }, position: [side * .2, .18, -.08] },
        h("mesh", { material: furMats[animal.color], scale: [.1, .2, .1] },
          h("capsuleGeometry", { args: [.075, .22, 3, 6] }))
      )
    ])
  )));
}
