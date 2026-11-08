import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const h = React.createElement;
const DROPS_PER_FOUNTAIN = 12;

function FountainWater({ world }) {
  const fountains = useMemo(() => [
    { x: 0, z: 0, waterY: .365, sourceY: 2.16, height: 1.12, spread: 1.9, width: 4.7, depth: 4.7, plaza: true },
    ...world.buildings.map((building) => ({
      x: (building.x0 + building.x1) / 2,
      z: building.z0 + 2.95,
      waterY: .555,
      sourceY: 1.47,
      height: .62,
      spread: .82,
      width: 1.72,
      depth: 1.62,
      plaza: false
    }))
  ], [world]);
  const droplets = useRef(null), ripples = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const waterMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#4bbfd2", transparent: true, opacity: .56, roughness: .12,
    metalness: .22, clearcoat: .95, clearcoatRoughness: .08, depthWrite: false,
    side: THREE.DoubleSide
  }), []);
  const rippleMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: "#b6f5fb", transparent: true, opacity: .35, depthWrite: false,
    side: THREE.DoubleSide
  }), []);
  const dropletMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#9cecff", transparent: true, opacity: .82, roughness: .08,
    metalness: .12, clearcoat: 1, depthWrite: false
  }), []);

  useEffect(() => () => {
    waterMaterial.dispose(); rippleMaterial.dispose(); dropletMaterial.dispose();
  }, [waterMaterial, rippleMaterial, dropletMaterial]);

  useFrame(({ clock }) => {
    const dropMesh = droplets.current, ringMesh = ripples.current;
    if (!dropMesh || !ringMesh) return;
    const time = clock.elapsedTime;
    let instance = 0;
    fountains.forEach((fountain, fountainIndex) => {
      for (let i = 0; i < DROPS_PER_FOUNTAIN; i++) {
        const phase = (time * .72 + i / DROPS_PER_FOUNTAIN + fountainIndex * .173) % 1;
        const angle = i * 2.399963 + fountainIndex * .41;
        const radial = fountain.spread * Math.pow(phase, .78);
        const y = fountain.sourceY - (fountain.sourceY - fountain.waterY) * phase + Math.sin(phase * Math.PI) * fountain.height;
        dummy.position.set(fountain.x + Math.cos(angle) * radial, y, fountain.z + Math.sin(angle) * radial);
        const size = .045 + Math.sin(phase * Math.PI) * .026;
        dummy.scale.set(size * .78, size * 1.45, size * .78);
        dummy.rotation.set(phase * 2.2, angle, phase * 1.3);
        dummy.updateMatrix();
        dropMesh.setMatrixAt(instance++, dummy.matrix);
      }
      for (let ring = 0; ring < 2; ring++) {
        const phase = (time * .28 + ring * .5 + fountainIndex * .117) % 1;
        const radius = fountain.plaza ? .32 + phase * 1.38 : .16 + phase * .55;
        dummy.position.set(fountain.x, fountain.waterY + .025 + ring * .004, fountain.z);
        dummy.rotation.set(-Math.PI / 2, 0, phase * .35);
        dummy.scale.set(radius, radius, radius);
        dummy.updateMatrix();
        ringMesh.setMatrixAt(fountainIndex * 2 + ring, dummy.matrix);
      }
    });
    dropMesh.instanceMatrix.needsUpdate = true;
    ringMesh.instanceMatrix.needsUpdate = true;
  });

  return h(React.Fragment, null,
    fountains.map((fountain, index) => h("mesh", {
      key: `pool-${index}`,
      position: [fountain.x, fountain.waterY, fountain.z],
      rotation: [-Math.PI / 2, 0, 0],
      renderOrder: 3
    },
      h("planeGeometry", { args: [fountain.width, fountain.depth] }),
      h("primitive", { object: waterMaterial, attach: "material" })
    )),
    h("instancedMesh", {
      ref: droplets,
      args: [undefined, undefined, fountains.length * DROPS_PER_FOUNTAIN],
      frustumCulled: false,
      renderOrder: 4
    }, h("sphereGeometry", { args: [1, 9, 7] }), h("primitive", { object: dropletMaterial, attach: "material" })),
    h("instancedMesh", {
      ref: ripples,
      args: [undefined, undefined, fountains.length * 2],
      frustumCulled: false,
      renderOrder: 3
    }, h("torusGeometry", { args: [1, .018, 5, 28] }), h("primitive", { object: rippleMaterial, attach: "material" }))
  );
}

function AnimatedSwing({ item, index }) {
  const pivot = useRef(null);
  useFrame(({ clock }) => {
    if (!pivot.current) return;
    const t = clock.elapsedTime * 1.72 + index * 1.35;
    pivot.current.rotation.x = Math.sin(t) * .34;
    pivot.current.rotation.z = Math.sin(t * .5) * .025;
  });
  return h("group", { position: [item.x, 3.02, item.z], ref: pivot },
    [-.68, .68].map((z) => h("mesh", {
      key: z, position: [0, -1.02, z], castShadow: false
    }, h("boxGeometry", { args: [.035, 2.04, .035] }),
    h("meshStandardMaterial", { color: "#aab5bd", metalness: .72, roughness: .25 }))),
    h("mesh", { position: [0, -2.08, 0], castShadow: true, receiveShadow: true },
      h("boxGeometry", { args: [1.08, .16, 1.42] }),
      h("meshStandardMaterial", { color: "#c69b50", metalness: .28, roughness: .38 })),
    h("mesh", { position: [0, -1.94, 0], castShadow: true },
      h("boxGeometry", { args: [1.08, .09, 1.42] }),
      h("meshStandardMaterial", { color: "#34434b", metalness: .62, roughness: .35 }))
  );
}

function AnimatedSwings({ world }) {
  const swings = useMemo(() => world.interactables.filter((item) => item.type === "swing"), [world]);
  return h(React.Fragment, null, swings.map((item, index) => h(AnimatedSwing, { key: index, item, index })));
}

function AnimatedTreadmills({ world }) {
  const belts = useMemo(() => world.boxes.filter((box) => box.kind === "treadmillDeck"), [world]);
  const mesh = useRef(null);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128; canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#111a20"; ctx.fillRect(0, 0, 128, 256);
    ctx.strokeStyle = "#58666b"; ctx.lineWidth = 3;
    for (let y = -32; y < 288; y += 24) {
      ctx.beginPath(); ctx.moveTo(18, y + 12); ctx.lineTo(64, y); ctx.lineTo(110, y + 12); ctx.stroke();
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping; map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1, 1);
    return map;
  }, []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    map: texture, color: "#d4e0e1", roughness: .4, metalness: .22
  }), [texture]);
  useEffect(() => () => { texture.dispose(); material.dispose(); }, [texture, material]);
  useLayoutEffect(() => {
    const target = mesh.current;
    if (!target) return;
    const dummy = new THREE.Object3D();
    belts.forEach((belt, index) => {
      dummy.position.set((belt.x0 + belt.x1) / 2, (belt.y0 + belt.y1) / 2, (belt.z0 + belt.z1) / 2);
      dummy.scale.set(belt.x1 - belt.x0, belt.y1 - belt.y0, belt.z1 - belt.z0);
      dummy.updateMatrix(); target.setMatrixAt(index, dummy.matrix);
    });
    target.instanceMatrix.needsUpdate = true;
    target.computeBoundingSphere();
  }, [belts]);
  useFrame((_, dt) => {
    texture.offset.y = (texture.offset.y + dt * 1.35) % 1;
  });
  if (!belts.length) return null;
  return h("instancedMesh", {
    ref: mesh, args: [undefined, material, belts.length],
    castShadow: false, receiveShadow: true
  }, h("boxGeometry"), h("meshStandardMaterial", { map: texture, color: "#d4e0e1", roughness: .4, metalness: .22 }));
}

function FountainAnimations({ world }) {
  return h(FountainWater, { world });
}

export function AnimatedWorld({ world }) {
  return h(React.Fragment, null,
    h(FountainAnimations, { world }),
    h(AnimatedSwings, { world }),
    h(AnimatedTreadmills, { world })
  );
}
