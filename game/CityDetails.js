import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// Phase 2: instanced architectural and street detail for Stairway City Explorer.
// All details are visual-only: the existing World / Collider gameplay remains unchanged.
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FLOOR_H } from "./world.js";
const makeBatches = () => ({ stone: [], metal: [], gold: [], wood: [], glass: [], solar: [], glow: [], windowLight: [], foliage: [], cylinders: [], spheres: [] });
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
        const depth = 0.105, out = reverse ? 1 : -1, face = fixed + out * 0.09, dark = "#1d3038", trim = "#c7ad77";
        const glassTints = ["#5d7884", "#78929b", "#405c68", "#a6c2c8", "#526f7c"];
        const glassTint = glassTints[(building.id + floor * 2 + i) % glassTints.length];
        if (axis === "x") {
            put(b.glass, center, y + 1.9, face + out * 0.012, width - 0.2, 1.72, 0.016, glassTint);
            put(b.metal, center, y + 1.9, face + out * 0.028, 0.035, 1.68, 0.028, "#9eb2b5");
            put(b.metal, center, y + 1.86, face + out * 0.028, width - 0.22, 0.028, 0.028, "#8c9da0");
        } else {
            put(b.glass, face + out * 0.012, y + 1.9, center, 0.016, 1.72, width - 0.2, glassTint);
            put(b.metal, face + out * 0.028, y + 1.9, center, 0.028, 1.68, 0.035, "#9eb2b5");
            put(b.metal, face + out * 0.028, y + 1.86, center, 0.028, 0.028, width - 0.22, "#8c9da0");
        }
        const vertical = (p) => axis === "x" ? put(b.metal, p, y + 1.9, face, 0.065, 1.94, depth, dark) : put(b.metal, face, y + 1.9, p, depth, 1.94, 0.065, dark);
        const horizontal = (yy, thick, projection = depth) => axis === "x" ? put(b.gold, center, y + yy, face, width + 0.14, thick, projection, trim) : put(b.gold, face, y + yy, center, projection, thick, width + 0.14, trim);
        const litWindow = (building.id * 17 + floor * 13 + i * 7) % 11 < 5;
        if (litWindow) {
            const glowColor = ["#ffe1a2", "#f6d6a0", "#b6d8e8", "#fff0c9"][(building.id + floor + i) % 4];
            if (axis === "x") put(b.windowLight, center, y + 1.9, face + out * 0.018, width - 0.2, 1.58, 0.022, glowColor);
            else put(b.windowLight, face + out * 0.018, y + 1.9, center, 0.022, 1.58, width - 0.2, glowColor);
        }
        vertical(w0 - 0.035); vertical(w1 + 0.035); vertical(center);
        horizontal(0.99, 0.07, 0.16); horizontal(2.81, 0.065, 0.12);
        // A narrow rain-sill and a projecting sunshade give every window real depth.
        if (axis === "x") {
            put(b.stone, center, y + 0.94, face + out * 0.11, width + 0.22, 0.065, 0.24, "#b8b6aa");
            put(b.metal, center, y + 2.94, face + out * 0.17, width + 0.3, 0.055, 0.34, "#65777d");
        } else {
            put(b.stone, face + out * 0.11, y + 0.94, center, 0.24, 0.065, width + 0.22, "#b8b6aa");
            put(b.metal, face + out * 0.17, y + 2.94, center, 0.34, 0.055, width + 0.3, "#65777d");
        }
        if (axis === "x") put(b.metal, center, y + 1.9, face + out * 0.009, 0.025, 1.76, 0.025, "#82959b");
        else put(b.metal, face + out * 0.009, y + 1.9, center, 0.025, 1.76, 0.025, "#82959b");
        if ((building.id + floor + i * 2) % 4 === 0) {
            const acY = y + 0.52, acFace = face + out * 0.27;
            if (axis === "x") {
                put(b.metal, center, acY, acFace, 0.9, 0.42, 0.48, "#9ca8a7");
                put(b.stone, center, acY + 0.23, acFace, 0.94, 0.055, 0.5, "#d0d3cc");
                for (let vent = -2; vent <= 2; vent++) put(b.metal, center + vent * 0.13, acY, acFace + out * 0.247, 0.035, 0.25, 0.018, "#3e4c52");
            } else {
                put(b.metal, acFace, acY, center, 0.48, 0.42, 0.9, "#9ca8a7");
                put(b.stone, acFace, acY + 0.23, center, 0.5, 0.055, 0.94, "#d0d3cc");
                for (let vent = -2; vent <= 2; vent++) put(b.metal, acFace + out * 0.247, acY, center + vent * 0.13, 0.018, 0.25, 0.035, "#3e4c52");
            }
        }
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
        const { x0, x1, z0, z1, id } = building, width = x1 - x0, depth = z1 - z0, cx = (x0 + x1) / 2;
        const roofY = building.floors.length * FLOOR_H, facadeAccent = id % 2 === 0 ? "#d9c39c" : "#94a8a9";
        for (const x of [x0 + 0.12, x1 - 0.12]) for (const z of [z0 + 0.12, z1 - 0.12]) put(b.stone, x, roofY / 2, z, 0.18, roofY, 0.18, facadeAccent);
        for (const z of [z0 + 0.12, z1 - 0.12]) put(b.gold, (x0 + x1) / 2, roofY + 0.06, z, width + 0.28, 0.075, 0.24, "#c8a96b");
        for (const x of [x0 + 0.12, x1 - 0.12]) put(b.gold, x, roofY + 0.06, (z0 + z1) / 2, 0.24, 0.075, depth + 0.28, "#c8a96b");
        // Layered floor bands, facade fins and illuminated architectural reveals.
        const centerZ = (z0 + z1) / 2;
        for (let floor = 0; floor < building.floors.length; floor++) {
            const bandY = floor * FLOOR_H + 3.78;
            const bandColor = floor % 2 ? "#9eaaa7" : "#d3c6ad";
            put(b.stone, cx, bandY, z0 - 0.14, width + 0.18, 0.12, 0.22, bandColor);
            put(b.stone, cx, bandY, z1 + 0.14, width + 0.18, 0.12, 0.22, bandColor);
            put(b.stone, x0 - 0.14, bandY, centerZ, 0.22, 0.12, depth + 0.18, bandColor);
            put(b.stone, x1 + 0.14, bandY, centerZ, 0.22, 0.12, depth + 0.18, bandColor);
            for (const side of [-1, 1]) {
                const sideZ = side < 0 ? z0 - 0.19 : z1 + 0.19;
                put(b.gold, cx, bandY + 0.09, sideZ, width - 0.55, 0.025, 0.035, "#d8bd85");
                const sideX = side < 0 ? x0 - 0.19 : x1 + 0.19;
                put(b.gold, sideX, bandY + 0.09, centerZ, 0.035, 0.025, depth - 0.55, "#d8bd85");
            }
        }
        for (const px of [x0 + 0.28, x1 - 0.28]) for (const pz of [z0 + 0.28, z1 - 0.28]) {
            put(b.stone, px, roofY / 2, pz, 0.3, roofY, 0.3, facadeAccent);
            put(b.metal, px, roofY / 2, pz, 0.055, roofY, 0.34, "#66777c");
        }
        // Subtle vertical accents break up the repeated window grid.
        for (const ratio of [0.25, 0.75]) {
            const px = x0 + width * ratio;
            put(b.metal, px, roofY / 2, z0 - 0.12, 0.055, roofY - 0.5, 0.07, "#65777d");
            put(b.metal, px, roofY / 2, z1 + 0.12, 0.055, roofY - 0.5, 0.07, "#65777d");
        }
        const facadeStyle = id % 5;
        if (facadeStyle === 0) {
            for (const px of [x0 + 0.62, x1 - 0.62]) for (const faceZ of [z0 - 0.2, z1 + 0.2]) {
                put(b.stone, px, roofY / 2, faceZ, 0.24, roofY, 0.14, "#d8cbb5");
                for (let floor = 0; floor < building.floors.length; floor++) put(b.gold, px, floor * FLOOR_H + 3.8, faceZ, 0.34, 0.07, 0.19, "#c3a77a");
            }
        } else if (facadeStyle === 1) {
            for (const ratio of [0.18, 0.36, 0.64, 0.82]) {
                const px = x0 + width * ratio, projection = ratio < 0.5 ? 0.22 : 0.31;
                put(b.metal, px, roofY / 2, z0 - projection, 0.09, roofY - 0.35, 0.16, "#60747b");
                put(b.metal, px, roofY / 2, z1 + projection, 0.09, roofY - 0.35, 0.16, "#60747b");
            }
        } else if (facadeStyle === 2) {
            for (let floor = 0; floor < building.floors.length; floor++) {
                const y = floor * FLOOR_H + 1.95;
                for (const faceZ of [z0 - 0.19, z1 + 0.19]) {
                    put(b.stone, cx, y, faceZ, width - 0.5, 0.035, 0.035, "#9ea9a5");
                    put(b.gold, cx, y + 0.09, faceZ, width - 1.2, 0.018, 0.045, "#c2b49c");
                }
            }
        } else if (facadeStyle === 3) {
            for (const px of [x0 + 1.1, x0 + 1.32, x1 - 1.1, x1 - 1.32]) {
                put(b.wood, px, roofY / 2, z0 - 0.19, 0.075, roofY - 0.3, 0.075, "#805e45");
                put(b.wood, px, roofY / 2, z1 + 0.19, 0.075, roofY - 0.3, 0.075, "#805e45");
            }
        } else {
            for (const px of [x0 + 0.32, x1 - 0.32]) for (const faceZ of [z0 - 0.24, z1 + 0.24]) {
                put(b.stone, px, roofY / 2, faceZ, 0.38, roofY - 0.25, 0.22, "#c6c5bd");
            }
            put(b.stone, cx, roofY - 0.08, z0 - 0.19, width + 0.42, 0.18, 0.28, "#b8b9b3");
            put(b.stone, cx, roofY - 0.08, z1 + 0.19, width + 0.42, 0.18, 0.28, "#b8b9b3");
        }
        for (let floor = 0; floor < building.floors.length; floor++) {
            addWindowFrames(b, building, "x", z0 + 0.075, false, floor, x0, x1, true);
            addWindowFrames(b, building, "x", z1 - 0.075, true, floor, x0, x1, false);
            addWindowFrames(b, building, "z", x0 + 0.075, false, floor, z0 + 0.15, z1 - 0.15, false);
            addWindowFrames(b, building, "z", x1 - 0.075, true, floor, z0 + 0.15, z1 - 0.15, false);
        }
        for (let floor = 1; floor < building.floors.length; floor++) {
            if ((id + floor) % 2 !== 0) continue;
            const centerX = (x0 + x1) / 2 + (id % 2 ? -1.9 : 1.9);
            const balconyWidth = 2.45, level = floor * FLOOR_H + 1.02;
            for (const faceSign of (floor + id) % 4 === 0 ? [-1, 1] : [id % 2 === 0 ? -1 : 1]) {
                const balconyZ = faceSign < 0 ? z0 - 0.56 : z1 + 0.56;
                const outerZ = balconyZ + faceSign * 0.48;
                put(b.stone, centerX, level, balconyZ, balconyWidth, 0.12, 1.05, "#c5c5bd");
                put(b.gold, centerX, level - 0.08, outerZ, balconyWidth + 0.12, 0.035, 0.055, "#d2b47d");
                put(b.metal, centerX, level + 0.5, outerZ, balconyWidth, 0.055, 0.055, "#45545b");
                put(b.glass, centerX, level + 0.25, outerZ - faceSign * 0.012, balconyWidth - 0.18, 0.36, 0.035, id % 2 ? "#91afb6" : "#b3c7c5");
                put(b.metal, centerX, level + 0.055, outerZ, balconyWidth - 0.12, 0.035, 0.055, "#64757a");
                put(b.metal, centerX - balconyWidth / 2, level + 0.5, balconyZ, 0.055, 0.055, 0.92, "#45545b");
                put(b.metal, centerX + balconyWidth / 2, level + 0.5, balconyZ, 0.055, 0.055, 0.92, "#45545b");
                for (let post = -2; post <= 2; post++) put(b.metal, centerX + post * 0.52, level + 0.24, outerZ, 0.035, 0.48, 0.035, "#65777d");
                if ((floor + id) % 3 === 0) {
                    const planterZ = balconyZ + faceSign * 0.17;
                    put(b.wood, centerX, level + 0.17, planterZ, 0.68, 0.26, 0.38, "#805b3d");
                    for (let plant = -2; plant <= 2; plant++) {
                        put(b.foliage, centerX + plant * 0.12, level + 0.43 + Math.abs(plant) % 2 * 0.08, planterZ, 0.14, 0.32, 0.16, "#4c8055");
                    }
                }
            }
        }
        put(b.stone, cx, 3.16, z0 - 0.3, 4.25, 0.44, 0.17, id % 2 ? "#364c58" : "#66513f");
        put(b.glass, cx, 3.16, z0 - 0.397, 3.8, 0.25, 0.025, "#dce8e6");
        put(b.glow, cx, 3.16, z0 - 0.418, 1.45, 0.035, 0.018, id % 3 === 0 ? "#ffd27c" : "#9de0ed");
        put(b.metal, cx, 2.96, z0 - 0.58, 4.45, 0.055, 0.62, "#45545b");
        for (const dx of [-1.9, 1.9]) put(b.metal, cx + dx, 2.7, z0 - 0.51, 0.055, 0.5, 0.055, "#45545b");
        // Street-level details make the approach feel like a real public entrance.
        if (id % 3 === 0) {
            addBench(b, x0 + 2.8, z0 - 3.35, 0);
            for (const side of [-1, 1]) {
                const planterX = cx + side * 3.05, planterZ = z0 - 1.55;
                put(b.stone, planterX, 0.86, planterZ, 1.02, 0.58, 0.82, "#8d948c");
                put(b.stone, planterX, 1.16, planterZ, 1.08, 0.07, 0.88, "#b4ad9e");
                for (let leaf = -1; leaf <= 1; leaf++) {
                    put(b.foliage, planterX + leaf * 0.24, 1.48 + (leaf === 0 ? 0.18 : 0), planterZ, 0.24, 0.64, 0.24, "#56835a");
                }
                put(b.metal, planterX + side * 1.25, 0.96, planterZ - 0.4, 0.34, 0.88, 0.34, "#35434a");
                put(b.glow, planterX + side * 1.25, 1.42, planterZ - 0.4, 0.18, 0.035, 0.18, "#f5d58d");
            }
        }
        // Deep entrance canopy and a framed luminous lobby marker.
        put(b.stone, cx, 3.42, z0 - 0.56, 4.7, 0.16, 0.84, "#59666a");
        put(b.gold, cx, 3.52, z0 - 0.58, 4.48, 0.045, 0.72, "#d3b77f");
        put(b.glow, cx, 3.43, z0 - 0.997, 2.65, 0.035, 0.025, id % 3 === 0 ? "#f6d391" : "#a6dce6");
        put(b.metal, cx, 3.94, z0 - 0.91, 2.9, 0.09, 0.16, "#3a4b53");
        put(b.glass, cx, 3.94, z0 - 1.005, 2.52, 0.055, 0.025, id % 2 ? "#6f9aa5" : "#c4a878");
        for (const offset of [-2.2, 2.2]) {
            put(b.metal, cx + offset, 3.15, z0 - 0.63, 0.22, 0.42, 0.18, "#44545b");
            put(b.windowLight, cx + offset, 3.15, z0 - 0.75, 0.12, 0.23, 0.03, "#ffe0a2");
        }
        for (const offset of [-1.8, 1.8]) {
            put(b.stone, cx + offset, 1.5, z0 - 0.16, 0.16, 3, 0.24, "#c7bda9");
            put(b.gold, cx + offset, 2.98, z0 - 0.29, 0.2, 0.06, 0.42, "#d4b67d");
        }
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
        for (const side of [-1, 1]) {
            const railZ = side < 0 ? z0 - 0.2 : z1 + 0.2;
            put(b.metal, cx, roofY + 0.84, railZ, width - 0.2, 0.065, 0.065, "#52636a");
            put(b.metal, cx, roofY + 0.38, railZ, width - 0.2, 0.045, 0.045, "#718188");
            for (let x = x0 + 0.45; x <= x1 - 0.4; x += 1.8) put(b.metal, x, roofY + 0.42, railZ, 0.045, 0.84, 0.045, "#65777d");
        }
        for (const side of [-1, 1]) {
            const railX = side < 0 ? x0 - 0.2 : x1 + 0.2;
            put(b.metal, railX, roofY + 0.84, centerZ, 0.065, 0.065, depth - 0.2, "#52636a");
            put(b.metal, railX, roofY + 0.38, centerZ, 0.045, 0.045, depth - 0.2, "#718188");
            for (let z = z0 + 0.45; z <= z1 - 0.4; z += 1.8) put(b.metal, railX, roofY + 0.42, z, 0.045, 0.84, 0.045, "#65777d");
        }
        for (const [px, pz] of [[x0 + 0.42, z0 - 0.22], [x1 - 0.42, z1 + 0.22]]) {
            put(b.cylinders, px, roofY / 2, pz, 0.055, roofY, 0.055, "#68777b");
            for (let floor = 1; floor < building.floors.length; floor++) put(b.metal, px, floor * FLOOR_H, pz, 0.12, 0.075, 0.12, "#a6aaa4");
        }
        // Distinct rooftop silhouettes: water cistern, service vents, cable tray and antenna.
        const tankX = x0 + 3.35, tankZ = z1 - 3.0;
        put(b.metal, tankX, roofY + 0.68, tankZ, 1.32, 1.25, 1.28, id % 2 ? "#788b91" : "#9ba8a7");
        put(b.stone, tankX, roofY + 1.32, tankZ, 1.4, 0.09, 1.36, "#c6cdca");
        put(b.metal, tankX, roofY + 1.42, tankZ, 0.16, 0.14, 0.16, "#d3b16f");
        put(b.cylinders, tankX + 2.5, roofY + 0.73, tankZ - 0.3, 0.62, 1.35, 0.62, "#9ca8a7");
        put(b.metal, tankX + 2.5, roofY + 1.42, tankZ - 0.3, 0.69, 0.08, 0.69, "#d0d5ce");
        put(b.cylinders, tankX + 2.5, roofY + 1.5, tankZ - 0.3, 0.07, 0.16, 0.07, "#53646b");
        for (let pipe = 0; pipe < 2; pipe++) {
            const pipeX = tankX - 1.25 + pipe * 0.34;
            put(b.cylinders, pipeX, roofY + 0.65, tankZ + 0.9, 0.055, 1.2, 0.055, "#697c82");
            put(b.metal, pipeX, roofY + 1.27, tankZ + 0.9, 0.14, 0.06, 0.14, "#b6c0bd");
        }
        if (id % 2 === 0) {
            const dishX = x1 - 4.1, dishZ = z0 + 3.25;
            put(b.cylinders, dishX, roofY + 0.3, dishZ, 0.055, 0.6, 0.055, "#596a71");
            put(b.spheres, dishX, roofY + 0.68, dishZ, 0.62, 0.11, 0.62, "#aab5b4", -0.26, 0.18, 0);
            put(b.cylinders, dishX, roofY + 0.8, dishZ, 0.34, 0.045, 0.045, "#c0c5bd", 0, 0, Math.PI / 4);
        }
        for (let vent = 0; vent < 3; vent++) {
            const vx = x0 + 4.8 + vent * 1.45, vz = z0 + 2.25;
            put(b.metal, vx, roofY + 0.34, vz, 0.62, 0.62, 0.58, "#6e7e83");
            put(b.metal, vx, roofY + 0.67, vz, 0.72, 0.08, 0.68, "#3c4b51");
            if (vent === 0) {
                put(b.cylinders, vx, roofY + 0.93, vz, 0.2, 0.48, 0.2, "#63767d");
                put(b.metal, vx, roofY + 1.18, vz, 0.3, 0.065, 0.3, "#35464d");
            }
            put(b.spheres, vx + 0.39, roofY + 0.66, vz + 0.38, 0.1, 0.1, 0.1, "#bdc5bf");
            for (let slat = 0; slat < 3; slat++) put(b.metal, vx, roofY + 0.3 + slat * 0.14, vz - 0.3, 0.42, 0.035, 0.025, "#283940");
        }
        const antennaX = x1 - 2.2, antennaZ = z1 - 2.3;
        put(b.metal, antennaX, roofY + 1.65, antennaZ, 0.075, 3.2, 0.075, "#52656d");
        put(b.gold, antennaX, roofY + 3.2, antennaZ, 0.2, 0.12, 0.2, "#d0ac68");
        put(b.metal, antennaX, roofY + 2.25, antennaZ, 1.0, 0.055, 0.055, "#7d8c8f");
        put(b.glass, tankX, roofY + 0.08, tankZ + 1.25, 1.0, 0.04, 0.08, "#9bd5df");
    }
    addBench(b, -6, 0, Math.PI / 2); addBench(b, 6, 0, -Math.PI / 2);
    addBench(b, 0, -6, 0); addBench(b, 0, 6, Math.PI);
    return b;
}
function makeSurfaceTexture() {
    const size = 256, canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const pixels = context.createImageData(size, size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const index = (y * size + x) * 4;
            let hash = (Math.imul(x + 1, 374761393) + Math.imul(y + 1, 668265263)) | 0;
            hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
            const grain = 190 + ((hash >>> 24) & 63);
            const streak = ((x * 13 + y * 7) % 41 === 0) ? -18 : 0;
            const value = Math.max(150, Math.min(255, grain + streak));
            pixels.data[index] = value;
            pixels.data[index + 1] = value;
            pixels.data[index + 2] = value;
            pixels.data[index + 3] = 255;
        }
    }
    context.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
}
function CylinderBatch({ items, material }) {
    const ref = useRef(null), geometry = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 18), []);
    useLayoutEffect(() => {
        const mesh = ref.current; if (!mesh) return;
        const object = new THREE.Object3D(), color = new THREE.Color();
        items.forEach((item, index) => {
            object.position.set(item.x, item.y, item.z); object.scale.set(item.sx, item.sy, item.sz);
            object.rotation.set(item.rx ?? 0, item.ry ?? 0, item.rz ?? 0); object.updateMatrix();
            mesh.setMatrixAt(index, object.matrix); mesh.setColorAt(index, color.set(item.color));
        });
        mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
    }, [items]);
    useEffect(() => () => geometry.dispose(), [geometry]);
    if (!items.length) return null;
    return _jsx("instancedMesh", { ref, args: [geometry, material, items.length], castShadow: true, receiveShadow: true });
}
function SphereBatch({ items, material }) {
    const ref = useRef(null), geometry = useMemo(() => new THREE.SphereGeometry(1, 18, 12), []);
    useLayoutEffect(() => {
        const mesh = ref.current; if (!mesh) return;
        const object = new THREE.Object3D(), color = new THREE.Color();
        items.forEach((item, index) => {
            object.position.set(item.x, item.y, item.z); object.scale.set(item.sx, item.sy, item.sz);
            object.rotation.set(item.rx ?? 0, item.ry ?? 0, item.rz ?? 0); object.updateMatrix();
            mesh.setMatrixAt(index, object.matrix); mesh.setColorAt(index, color.set(item.color));
        });
        mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
    }, [items]);
    useEffect(() => () => geometry.dispose(), [geometry]);
    if (!items.length) return null;
    return _jsx("instancedMesh", { ref, args: [geometry, material, items.length], castShadow: true, receiveShadow: true });
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
export function CityDetails({ buildings, trees, windStrength = 1, nightFactor = 0 }) {
    const batches = useMemo(() => buildBatches(buildings), [buildings]);
    const surfaceTexture = useMemo(() => makeSurfaceTexture(), []);
    const windowLight = useMemo(() => new THREE.MeshBasicMaterial({
        color: "#fff4d8", toneMapped: false, transparent: true, opacity: 0.025, depthWrite: false, side: THREE.DoubleSide
    }), []);
    useFrame(() => {
        windowLight.opacity = 0.025 + THREE.MathUtils.clamp(nightFactor, 0, 1) * 0.88;
    });
    useEffect(() => () => {
        surfaceTexture?.dispose();
        windowLight.dispose();
    }, [surfaceTexture, windowLight]);
    const materials = useMemo(() => ({
        stone: new THREE.MeshPhysicalMaterial({ roughness: 0.7, metalness: 0.035, clearcoat: 0.16, clearcoatRoughness: 0.58, envMapIntensity: 1.35, roughnessMap: surfaceTexture || null, bumpMap: surfaceTexture || null, bumpScale: 0.026 }),
        metal: new THREE.MeshStandardMaterial({ roughness: 0.34, metalness: 0.72, envMapIntensity: 1.8, roughnessMap: surfaceTexture || null, bumpMap: surfaceTexture || null, bumpScale: 0.006 }),
        gold: new THREE.MeshPhysicalMaterial({ color: "#d0ad70", roughness: 0.25, metalness: 0.88, clearcoat: 0.78, clearcoatRoughness: 0.16, envMapIntensity: 2.1 }),
        wood: new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.015, envMapIntensity: 1.05, roughnessMap: surfaceTexture || null, bumpMap: surfaceTexture || null, bumpScale: 0.02 }),
        glass: new THREE.MeshPhysicalMaterial({ roughness: 0.055, metalness: 0.24, transparent: true, opacity: 0.78, clearcoat: 1, clearcoatRoughness: 0.045, envMapIntensity: 2.6, depthWrite: false }),
        solar: new THREE.MeshPhysicalMaterial({ roughness: 0.13, metalness: 0.68, clearcoat: 0.94, clearcoatRoughness: 0.08, envMapIntensity: 2.2 }),
        glow: new THREE.MeshBasicMaterial({ toneMapped: false }),
        foliage: new THREE.MeshStandardMaterial({ roughness: 0.94, metalness: 0 }),
        hardware: new THREE.MeshPhysicalMaterial({ color: "#9ca9a8", roughness: 0.38, metalness: 0.66, clearcoat: 0.42, envMapIntensity: 1.7 }),
    }), [surfaceTexture]);
    return _jsxs(_Fragment, { children: [
        _jsx(BoxBatch, { items: batches.stone, material: materials.stone }),
        _jsx(BoxBatch, { items: batches.metal, material: materials.metal }),
        _jsx(BoxBatch, { items: batches.gold, material: materials.gold }),
        _jsx(BoxBatch, { items: batches.wood, material: materials.wood }),
        _jsx(BoxBatch, { items: batches.glass, material: materials.glass }),
        _jsx(BoxBatch, { items: batches.solar, material: materials.solar }),
        _jsx(BoxBatch, { items: batches.glow, material: materials.glow }),
        _jsx(BoxBatch, { items: batches.windowLight, material: windowLight }),
        _jsx(BoxBatch, { items: batches.foliage, material: materials.foliage }),
        _jsx(CylinderBatch, { items: batches.cylinders, material: materials.hardware }),
        _jsx(SphereBatch, { items: batches.spheres, material: materials.hardware }),
        _jsx(ExtraFoliage, { trees, windStrength })
    ] });
}
