import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// Phase 2: instanced architectural and street detail for Stairway City Explorer.
// All details are visual-only: the existing World / Collider gameplay remains unchanged.
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FLOOR_H } from "./world.js";
const makeBatches = () => ({ stone: [], metal: [], wood: [], glass: [], solar: [], glow: [] });
const put = (list, x, y, z, sx, sy, sz, color, rx = 0, ry = 0, rz = 0) => {
    if (![x, y, z, sx, sy, sz, rx, ry, rz].every(Number.isFinite) || sx <= 0 || sy <= 0 || sz <= 0) return;
    list.push({ x, y, z, sx, sy, sz, color, rx, ry, rz });
};
function addWindowFrames(b, building, axis, fixed, reverse, floor, lengthStart, lengthEnd, skipDoor) {
    const length = lengthEnd - lengthStart, count = Math.max(1, Math.floor(length / 3.6)), cell = length / count;
    const doorCell = Math.floor(count / 2), y = floor * FLOOR_H;
    for (let i = 0; i < count; i++) {
        if (skipDoor && floor === 0 && i === doorCell) continue;
        const start = lengthStart + i * cell, width = 2, w0 = start + (cell - width) / 2, w1 = w0 + width, center = (w0 + w1) / 2;
        const depth = 0.105, out = reverse ? 1 : -1, face = fixed + out * 0.09, dark = "#263945", trim = "#b7c3c4";
        const vertical = (p) => axis === "x" ? put(b.metal, p, y + 1.9, face, 0.065, 1.94, depth, dark) : put(b.metal, face, y + 1.9, p, depth, 1.94, 0.065, dark);
        const horizontal = (yy, thick, projection = depth) => axis === "x" ? put(b.stone, center, y + yy, face, width + 0.14, thick, projection, trim) : put(b.stone, face, y + yy, center, projection, thick, width + 0.14, trim);
        vertical(w0 - 0.035); vertical(w1 + 0.035); vertical(center);
        horizontal(0.99, 0.07, 0.16); horizontal(2.81, 0.065, 0.12);
        if (axis === "x") put(b.metal, center, y + 1.9, face + out * 0.009, 0.025, 1.76, 0.025, "#82959b");
        else put(b.metal, face + out * 0.009, y + 1.9, center, 0.025, 1.76, 0.025, "#82959b");
    }
}
function addBench(b, x, z, yaw) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const local = (lx, ly, lz, sx, sy, sz, color, list) => put(list, x + lx * c + lz * s, ly, z - lx * s + lz * c, sx, sy, sz, color, 0, yaw, 0);
    for (let i = -1; i <= 1; i++) local(0, 0.52, i * 0.075, 1.75, 0.055, 0.06, "#94613b", b.wood);
    for (let i = 0; i < 2; i++) local(0, 0.82, -0.23, 1.75, 0.06, 0.07, i ? "#a97042" : "#80502f", b.wood);
    for (const side of [-0.68, 0.68]) {
        local(side, 0.28, 0, 0.075, 0.52, 0.075, "#343a3d", b.metal);
        local(side, 0.69, -0.19, 0.055, 0.58, 0.055, "#343a3d", b.metal);
        local(side, 0.48, -0.19, 0.055, 0.06, 0.42, "#343a3d", b.metal);
    }
}
function buildBatches(buildings) {
    const b = makeBatches();
    for (const building of buildings) {
        const { x0, x1, z0, z1, id } = building, width = x1 - x0, depth = z1 - z0;
        const roofY = building.floors.length * FLOOR_H, facadeAccent = id % 2 === 0 ? "#d8c6a9" : "#b7c6c8";
        for (const x of [x0 + 0.12, x1 - 0.12]) for (const z of [z0 + 0.12, z1 - 0.12]) put(b.stone, x, roofY / 2, z, 0.16, roofY, 0.16, facadeAccent);
        for (const z of [z0 + 0.12, z1 - 0.12]) put(b.stone, (x0 + x1) / 2, roofY + 0.06, z, width + 0.28, 0.12, 0.22, "#d9d1c4");
        for (const x of [x0 + 0.12, x1 - 0.12]) put(b.stone, x, roofY + 0.06, (z0 + z1) / 2, 0.22, 0.12, depth + 0.28, "#d9d1c4");
        for (let floor = 0; floor < building.floors.length; floor++) {
            addWindowFrames(b, building, "x", z0 + 0.075, false, floor, x0, x1, true);
            addWindowFrames(b, building, "x", z1 - 0.075, true, floor, x0, x1, false);
            addWindowFrames(b, building, "z", x0 + 0.075, false, floor, z0 + 0.15, z1 - 0.15, false);
            addWindowFrames(b, building, "z", x1 - 0.075, true, floor, z0 + 0.15, z1 - 0.15, false);
        }
        for (let floor = 1; floor < building.floors.length; floor++) {
            if ((id + floor) % 3 !== 0) continue;
            const centerX = (x0 + x1) / 2 + (id % 2 ? -1.9 : 1.9), frontZ = z0 - 0.56, level = floor * FLOOR_H + 1.02;
            put(b.stone, centerX, level, frontZ, 2.65, 0.09, 0.92, "#c5c5bd");
            put(b.metal, centerX, level + 0.5, frontZ - 0.42, 2.65, 0.055, 0.055, "#45545b");
            put(b.metal, centerX - 1.3, level + 0.5, frontZ, 0.055, 0.055, 0.88, "#45545b");
            put(b.metal, centerX + 1.3, level + 0.5, frontZ, 0.055, 0.055, 0.88, "#45545b");
            for (let p = -2; p <= 2; p++) put(b.metal, centerX + p * 0.62, level + 0.24, frontZ - 0.42, 0.035, 0.48, 0.035, "#65777d");
        }
        const cx = (x0 + x1) / 2;
        put(b.stone, cx, 3.16, z0 - 0.3, 4.25, 0.44, 0.17, id % 2 ? "#364c58" : "#66513f");
        put(b.glass, cx, 3.16, z0 - 0.397, 3.8, 0.25, 0.025, "#dce8e6");
        put(b.glow, cx, 3.16, z0 - 0.418, 1.45, 0.035, 0.018, id % 3 === 0 ? "#ffd27c" : "#9de0ed");
        put(b.metal, cx, 2.96, z0 - 0.58, 4.45, 0.055, 0.62, "#45545b");
        for (const dx of [-1.9, 1.9]) put(b.metal, cx + dx, 2.7, z0 - 0.51, 0.055, 0.5, 0.055, "#45545b");
        const unitX = x0 + 1.45, unitZ = z1 - 1.65;
        put(b.metal, unitX, roofY + 0.42, unitZ, 1.35, 0.82, 1.15, "#88969b");
        put(b.stone, unitX, roofY + 0.85, unitZ, 1.43, 0.07, 1.22, "#c2c9c9");
        for (let slat = 0; slat < 5; slat++) put(b.metal, unitX, roofY + 0.24 + slat * 0.11, unitZ - 0.585, 0.92, 0.025, 0.025, "#34434a");
        put(b.metal, unitX, roofY + 0.91, unitZ, 0.58, 0.035, 0.58, "#63757c");
        if (id % 3 === 1) for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
            const px = x1 - 2.8 + col * 1.22, pz = z0 + 1.8 + row * 1.35;
            put(b.metal, px, roofY + 0.18, pz, 1.08, 0.08, 1.14, "#38464d", -0.13);
            put(b.solar, px, roofY + 0.225, pz, 0.98, 0.025, 1.03, "#173e57", -0.13);
            put(b.glass, px, roofY + 0.242, pz, 0.025, 0.018, 1.0, "#9ac8d8", -0.13);
        }
    }
    addBench(b, -6, 0, Math.PI / 2); addBench(b, 6, 0, -Math.PI / 2);
    addBench(b, 0, -6, 0); addBench(b, 0, 6, Math.PI);
    return b;
}
function BoxBatch({ items, material }) {
    const ref = useRef(null);
    useLayoutEffect(() => {
        const mesh = ref.current; if (!mesh) return;
        const object = new THREE.Object3D(), color = new THREE.Color();
        items.forEach((item, index) => {
            object.position.set(item.x, item.y, item.z); object.scale.set(item.sx, item.sy, item.sz);
            object.rotation.set(item.rx ?? 0, item.ry ?? 0, item.rz ?? 0); object.updateMatrix();
            mesh.setMatrixAt(index, object.matrix); mesh.setColorAt(index, color.set(item.color));
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
    }, [items]);
    if (!items.length) return null;
    return _jsx("instancedMesh", { ref, args: [undefined, material, items.length], castShadow: true, receiveShadow: true, children: _jsx("boxGeometry", {}) });
}
const foliageTime = { value: 0 }, foliageWindStrength = { value: 1 };
const foliageMaterial = new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0 });
foliageMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uFoliageTime = foliageTime; shader.uniforms.uFoliageWindStrength = foliageWindStrength;
    shader.vertexShader = "uniform float uFoliageTime;\nuniform float uFoliageWindStrength;\n" + shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
     vec3 worldOffset = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
     float phase = worldOffset.x * 0.16 + worldOffset.z * 0.13;
     float heightWeight = max(0.0, position.y + 1.0);
     transformed.x += sin(uFoliageTime * 1.05 + phase) * 0.075 * heightWeight * uFoliageWindStrength;
     transformed.z += cos(uFoliageTime * 0.9 + phase) * 0.045 * heightWeight * uFoliageWindStrength;`);
};
function ExtraFoliage({ trees, windStrength }) {
    const ref = useRef(null);
    useFrame(({ clock }) => { foliageTime.value = clock.elapsedTime; foliageWindStrength.value = windStrength; });
    useLayoutEffect(() => {
        const mesh = ref.current; if (!mesh) return;
        const object = new THREE.Object3D(), color = new THREE.Color();
        trees.forEach((tree, index) => {
            const offsets = [[0, 3.05, 0, 1.1], [-0.72, 3.35, 0.12, 0.72], [0.7, 3.28, -0.12, 0.76]];
            offsets.forEach(([ox, oy, oz, scale], part) => {
                const instance = index * 3 + part;
                object.position.set(tree.x + ox * tree.s, oy * tree.s, tree.z + oz * tree.s);
                object.scale.setScalar(tree.s * scale); object.rotation.set(0, index * 0.7 + part * 0.9, 0); object.updateMatrix();
                mesh.setMatrixAt(instance, object.matrix);
                color.setHSL(0.27 + ((index + part) % 4) * 0.018, 0.43 + 0, 0.29 + part * 0.035);
                mesh.setColorAt(instance, color);
            });
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
    }, [trees]);
    if (!trees.length) return null;
    return _jsx("instancedMesh", { ref, args: [undefined, foliageMaterial, trees.length * 3], castShadow: true, receiveShadow: true, children: _jsx("sphereGeometry", { args: [1, 16, 12] }) });
}
export function CityDetails({ buildings, trees, windStrength = 1 }) {
    const batches = useMemo(() => buildBatches(buildings), [buildings]);
    const materials = useMemo(() => ({
        stone: new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0.05 }),
        metal: new THREE.MeshStandardMaterial({ roughness: 0.46, metalness: 0.62 }),
        wood: new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.02 }),
        glass: new THREE.MeshPhysicalMaterial({ roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.7, depthWrite: false }),
        solar: new THREE.MeshStandardMaterial({ roughness: 0.22, metalness: 0.38 }),
        glow: new THREE.MeshBasicMaterial({ toneMapped: false }),
    }), []);
    return _jsxs(_Fragment, { children: [
        _jsx(BoxBatch, { items: batches.stone, material: materials.stone }),
        _jsx(BoxBatch, { items: batches.metal, material: materials.metal }),
        _jsx(BoxBatch, { items: batches.wood, material: materials.wood }),
        _jsx(BoxBatch, { items: batches.glass, material: materials.glass }),
        _jsx(BoxBatch, { items: batches.solar, material: materials.solar }),
        _jsx(BoxBatch, { items: batches.glow, material: materials.glow }),
        _jsx(ExtraFoliage, { trees, windStrength })
    ] });
}
