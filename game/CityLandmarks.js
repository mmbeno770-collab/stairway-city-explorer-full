import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getCoasterCartPose, getDropTowerCabinY, getParkRidePose } from "./park-rides.js";

const h = React.createElement;
const BOX = new THREE.BoxGeometry(1, 1, 1);
const makeMaterial = (color, roughness = 0.72, metalness = 0.02, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const M = {
    wall: makeMaterial("#d7c7ad", .83),
    cream: makeMaterial("#e4d8c3", .84),
    darkWall: makeMaterial("#46565d", .52, .48),
    roofRed: makeMaterial("#985541", .72),
    roofBlue: makeMaterial("#425762", .38, .34),
    roofStone: makeMaterial("#777b78", .64, .18),
    wood: makeMaterial("#805c40", .78),
    metal: makeMaterial("#53656b", .32, .72),
    gold: makeMaterial("#c8a367", .28, .82),
    glass: new THREE.MeshPhysicalMaterial({ color: "#9cc8d1", roughness: .075, metalness: .15, transparent: true, opacity: .62, clearcoat: 1, clearcoatRoughness: .04, depthWrite: false }),
    glassBlue: new THREE.MeshPhysicalMaterial({ color: "#5c9eb7", roughness: .08, metalness: .2, transparent: true, opacity: .72, clearcoat: 1, depthWrite: false }),
    glow: new THREE.MeshBasicMaterial({ color: "#ffe0a0", toneMapped: false }),
    grass: makeMaterial("#547d48", .96),
    courtBlue: makeMaterial("#3f7990", .86),
    courtGreen: makeMaterial("#467b48", .94),
    courtOrange: makeMaterial("#bd8151", .9),
    white: new THREE.MeshBasicMaterial({ color: "#f4f0dd" }),
    red: makeMaterial("#c34a37", .54),
    teal: makeMaterial("#348b91", .48),
    purple: makeMaterial("#74519a", .48),
    yellow: makeMaterial("#e1b84e", .55),
    blue: makeMaterial("#487fa9", .5),
    green: makeMaterial("#4f865b", .58)
};
const SHOP_NAMES = ["אופנה", "צעצועים", "אלקטרוניקה", "ספרים", "סופרמרקט", "בית קפה"];
const SHOP_SIGN_MATERIALS = SHOP_NAMES.map((label, index) => {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 128;
    const context = canvas.getContext("2d");
    if (context) {
        const colors = ["#b84c59", "#d49b34", "#477f9c", "#715a9c", "#5b8a55", "#a86b49"];
        context.fillStyle = colors[index]; context.fillRect(0, 0, 512, 128);
        context.strokeStyle = "#f2e5c9"; context.lineWidth = 8; context.strokeRect(8, 8, 496, 112);
        context.direction = "rtl"; context.textAlign = "center"; context.textBaseline = "middle";
        context.font = "bold 58px Arial"; context.fillStyle = "#fffaf0"; context.fillText(label, 256, 66);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
});

const SIGN_MATERIALS = ["#d45b46", "#d6a844", "#5d91a1", "#7b69a0", "#68956e", "#bd6b91"].map((color) =>
    new THREE.MeshStandardMaterial({ color, roughness: .42, metalness: .08, emissive: color, emissiveIntensity: .16 })
);
function box(position, scale, material, rotation = [0, 0, 0], key) {
    return h("mesh", { key, position, scale, rotation: rotation || [0, 0, 0], geometry: BOX, material, castShadow: true, receiveShadow: true });
}
function cylinder(position, radius, height, material, rotation = [0, 0, 0], key, radial = 16) {
    return h("mesh", { key, position, rotation: rotation || [0, 0, 0], material, castShadow: true, receiveShadow: true },
        h("cylinderGeometry", { args: [radius, radius, height, radial] }));
}
function sphere(position, scale, material, key) {
    return h("mesh", { key, position, scale, geometry: new THREE.SphereGeometry(1, 12, 10), material, castShadow: true });
}
function beam(a, b, width, material, key) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start), length = delta.length(), mid = start.clone().add(end).multiplyScalar(.5);
    const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return h("mesh", { key, position: mid, quaternion: rotation, scale: [width, length, width], geometry: BOX, material, castShadow: true });
}

function HouseModel({ home }) {
    const { cx, cz, width, depth, wallHeight, floors, style } = home;
    const front = cz - depth / 2, back = cz + depth / 2;
    const roof = style === "cottage" ? M.roofRed : style === "villa" ? M.roofBlue : M.roofStone;
    const items = [];
    const addBox = (p, s, mat, rot, id) => items.push(box(p, s, mat, rot, "home-" + home.id + "-" + id));
    const addCylinder = (p, radius, height, mat, rot, id, radial = 14) => items.push(cylinder(p, radius, height, mat, rot, "home-" + home.id + "-" + id, radial));

    addBox([cx, .2, cz], [width + .45, .18, depth + .45], M.cream, null, "plinth");
    addBox([cx, wallHeight + .32, cz - depth * .22], [width + .8, .22, depth * .68], roof, [-.43, 0, 0], "roof-a");
    addBox([cx, wallHeight + .32, cz + depth * .22], [width + .8, .22, depth * .68], roof, [.43, 0, 0], "roof-b");
    addBox([cx, wallHeight + .78, cz], [width + .95, .18, .38], M.darkWall, null, "ridge");
    addBox([cx + width * .31, wallHeight + 1.2, cz - depth * .15], [.72, 1.8, .72], M.roofStone, null, "chimney");
    addBox([cx, 2.7, front - .13], [2.35, .16, 1.05], M.wood, null, "porch-canopy");

    // Glass-front windows and a partly-open door let the furnished interior read from the street.
    for (const side of [-1, 1]) {
        const wx = cx + side * (width * .28);
        addBox([cx + side * 1.02, 1.45, front - .48], [.13, 2.3, .13], M.cream, null, "porch-post-" + side);
        addBox([wx, 1.9, front - .07], [1.42, 1.2, .12], M.glassBlue, null, "window-" + side);
        addBox([wx, 2.54, front - .16], [1.58, .09, .12], M.cream, null, "window-head-" + side);
        addBox([wx, 1.9, front - .16], [.09, 1.36, .12], M.cream, null, "window-jamb-" + side);
        addBox([wx, .53, front - .14], [1.65, .09, .15], M.roofBlue, null, "window-sill-" + side);
    }
    addBox([cx - .52, 1.35, front - .16], [1.08, 2.18, .12], M.wood, [0, -.62, 0], "front-door-open");
    addBox([cx - .92, 1.35, front - .25], [.07, .07, .06], M.gold, null, "door-handle");
    addBox([cx, .37, front + 2.7], [width - 1.2, .035, 2.75], home.id % 2 ? M.teal : M.blue, null, "living-room-rug");

    // Living room: sofa, cushions, coffee table, television and a floor lamp.
    const sofaMat = [M.teal, M.blue, M.purple][home.id % 3];
    addBox([cx - 1.55, .7, front + 2.7], [2.55, .38, .82], sofaMat, null, "sofa-seat");
    addBox([cx - 1.55, 1.08, front + 3.02], [2.55, .75, .2], sofaMat, null, "sofa-back");
    for (const side of [-1, 1]) {
        addBox([cx - 1.55 + side * 1.27, .88, front + 2.7], [.22, .62, .9], sofaMat, null, "sofa-arm-" + side);
        addBox([cx - 1.55 + side * .72, 1.15, front + 2.88], [.42, .34, .16], home.id % 2 ? M.cream : M.yellow, [0, 0, side * .08], "sofa-cushion-" + side);
    }
    addBox([cx - 1.05, .72, front + 1.6], [1.55, .14, .72], M.wood, null, "coffee-table");
    for (const dx of [-.62, .62]) for (const dz of [-.25, .25]) addBox([cx - 1.05 + dx, .53, front + 1.6 + dz], [.08, .36, .08], M.darkWall, null, "coffee-leg-" + dx + "-" + dz);
    addBox([cx + 2.0, .66, front + 3.0], [1.25, .58, .38], M.wood, null, "tv-console");
    addBox([cx + 2.0, 1.38, front + 3.0], [1.35, .86, .09], M.darkWall, null, "television");
    addBox([cx + 2.0, 1.38, front + 2.94], [1.13, .64, .035], M.glassBlue, null, "tv-screen");
    addCylinder([cx + 3.0, 1.0, front + 1.75], .055, 1.55, M.gold, null, "floor-lamp");
    addBox([cx + 3.0, 1.82, front + 1.75], [.55, .42, .55], M.cream, null, "lamp-shade");

    // Kitchen counters, cupboards, fridge, stove and sink along the back wall.
    addBox([cx - .4, .82, back - .58], [width - 1.3, .88, .72], M.wood, null, "kitchen-base-cabinets");
    addBox([cx - .4, 1.31, back - .58], [width - 1.25, .12, .78], M.cream, null, "kitchen-counter");
    for (let cabinet = 0; cabinet < 4; cabinet++) {
        const cabinetX = cx - 2.75 + cabinet * 1.55;
        addBox([cabinetX, 2.35, back - .68], [1.35, .9, .22], M.wood, null, "upper-cabinet-" + cabinet);
        addBox([cabinetX, 2.35, back - .54], [.055, .32, .04], M.gold, null, "upper-handle-" + cabinet);
    }
    addBox([cx + 2.85, 1.43, back - .62], [.82, 2.35, .78], M.cream, null, "refrigerator");
    addBox([cx + 2.67, 1.45, back - .21], [.035, 1.82, .045], M.metal, null, "fridge-handle");
    addBox([cx - .95, 1.42, back - .52], [.88, .055, .56], M.darkWall, null, "stove");
    for (const dx of [-.23, .23]) for (const dz of [-.15, .15]) addCylinder([cx - .95 + dx, 1.47, back - .52 + dz], .09, .035, M.metal, null, "stove-burner-" + dx + "-" + dz);
    addBox([cx + .8, 1.42, back - .52], [.72, .06, .42], M.glassBlue, null, "sink");
    addCylinder([cx + .8, 1.64, back - .52], .035, .36, M.metal, null, "sink-tap");

    // Dining table and chairs; each house has a slightly different interior arrangement.
    addBox([cx - 1.55, .82, front + 6.05], [1.7, .14, 1.15], M.wood, null, "dining-table");
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
        addBox([cx - 1.55 + side * .95, .68, front + 6.05 + end * .36], [.42, .12, .42], M.roofBlue, null, "dining-chair-seat-" + side + "-" + end);
        addBox([cx - 1.55 + side * .95, 1.02, front + 6.05 + end * .36 + .16], [.42, .65, .12], M.wood, null, "dining-chair-back-" + side + "-" + end);
    }
    addBox([cx + 2.5, 1.18, front + 5.25], [.42, 2.0, .9], M.wood, null, "bookcase");
    for (let row = 0; row < 3; row++) for (let book = 0; book < 4; book++) {
        const colors = [M.red, M.yellow, M.teal, M.blue];
        addBox([cx + 2.5 - .13 + book * .09, .58 + row * .55, front + 4.85], [.075, .42, .5], colors[(row + book + home.id) % colors.length], null, "book-" + row + "-" + book);
    }
    addCylinder([cx - 3.0, .92, front + 4.7], .19, 1.1, M.wood, null, "plant-pot");
    items.push(sphere([cx - 3.0, 1.72, front + 4.7], [.58, .75, .58], M.green, "home-" + home.id + "-houseplant"));
    addBox([cx, wallHeight - .16, cz], [.18, .12, .18], M.glow, null, "ceiling-light");

    if (floors === 2) {
        // Upstairs bedroom and landing inside villas.
        addBox([cx, 3.73, front + 6.9], [width - .55, .18, depth - 5.8], M.wood, null, "upper-floor");
        for (let step = 0; step < 11; step++) {
            const stairX = cx + width * .28, stepZ = front + 1.2 + step * .4, top = .34 + (step + 1) * .30;
            addBox([stairX, .34 + top / 2 - .17, stepZ + .21], [.92, top - .34, .42], M.wood, null, "stair-step-" + step);
        }
        addBox([cx - 1.4, 4.05, back - 1.55], [2.1, .28, 2.55], M.blue, null, "upstairs-bed");
        addBox([cx - 1.4, 4.36, back - 2.55], [2.15, .58, .18], M.wood, null, "upstairs-headboard");
        addBox([cx + 2.45, 4.75, back - 1.45], [1.05, 2.0, .75], M.cream, null, "upstairs-wardrobe");
        addBox([cx + 2.45, 4.75, back - .99], [.06, .14, .06], M.gold, null, "wardrobe-knob");
        addBox([cx + .2, 4.25, back - 2.65], [1.05, .12, .65], M.wood, null, "bedside-table");
    }
    if (style === "villa") {
        addBox([cx + width / 2 + 1.35, 1.42, cz + .1], [2.55, 2.75, depth * .74], M.cream, null, "garage");
        addBox([cx + width / 2 + 1.35, 1.35, cz - depth * .29], [2.2, 2.15, .09], M.darkWall, null, "garage-door");
        addBox([cx + width / 2 + 1.35, 2.48, cz - depth * .29], [2.1, .08, .12], M.gold, null, "garage-trim");
    }
    return h("group", { key: "home-model-" + home.id }, ...items);
}

function MallModel({ place }) {
    const { x: cx, z: cz } = place;
    const pieces = [];
    const add = (p, s, mat, rot, id) => pieces.push(box(p, s, mat, rot, "mall-" + id));
    const addCylinder = (p, radius, height, mat, rot, id, radial = 14) => pieces.push(cylinder(p, radius, height, mat, rot, "mall-" + id, radial));
    add([cx, .13, cz], [23.2, .26, 23.2], M.roofStone, null, "podium");
    add([cx, 3.7, cz + 8.5], [21.8, 7.1, .32], M.darkWall, null, "rear-wall");
    add([cx - 10.8, 3.7, cz], [.32, 7.1, 17.2], M.darkWall, null, "west-wall");
    add([cx + 10.8, 3.7, cz], [.32, 7.1, 17.2], M.darkWall, null, "east-wall");
    add([cx - 7.65, 3.82, cz], [6.3, .28, 19.3], M.roofStone, null, "upper-floor-west");
    add([cx + 7.65, 3.82, cz], [6.3, .28, 19.3], M.roofStone, null, "upper-floor-east");
    add([cx, 3.82, cz - 7.6], [9.0, .28, 6.4], M.roofStone, null, "upper-floor-front");
    add([cx, 3.82, cz + 7.6], [9.0, .28, 6.4], M.roofStone, null, "upper-floor-back");
    add([cx - 7.95, 7.55, cz], [6.5, .38, 22.4], M.darkWall, null, "roof-deck-west");
    add([cx + 7.95, 7.55, cz], [6.5, .38, 22.4], M.darkWall, null, "roof-deck-east");
    add([cx, 7.55, cz - 3.95], [9.4, .38, 2.5], M.darkWall, null, "roof-deck-front");
    add([cx, 7.55, cz + 3.95], [9.4, .38, 2.5], M.darkWall, null, "roof-deck-back");
    add([cx, 7.68, cz], [9.4, .12, 5.4], M.glassBlue, null, "skylight");
    add([cx, 8.0, cz - 10.25], [9.2, .22, .65], M.teal, null, "main-sign");
    add([cx, 8.04, cz - 10.62], [5.6, .04, .035], M.glow, null, "sign-light");
    add([cx, 4.0, cz - 9.9], [21.2, .16, .32], M.gold, null, "upper-canopy");
    add([cx, .75, cz - 10.0], [7.1, .22, 2.2], M.darkWall, null, "entry-canopy");
    add([cx - .68, 1.95, cz - 9.7], [1.24, 2.78, .08], M.glass, null, "main-entry-left-glass");
    add([cx + .68, 1.95, cz - 9.7], [1.24, 2.78, .08], M.glass, null, "main-entry-right-glass");
    add([cx - .1, 1.2, cz - 9.82], [.055, .62, .08], M.gold, null, "main-entry-left-handle");
    add([cx + .1, 1.2, cz - 9.82], [.055, .62, .08], M.gold, null, "main-entry-right-handle");
    add([cx - 1.2, 1.55, cz - 9.82], [.08, 2.25, .12], M.gold, null, "entry-frame-a");
    add([cx + 1.2, 1.55, cz - 9.82], [.08, 2.25, .12], M.gold, null, "entry-frame-b");

    // A bright atrium with benches, planters and clear wayfinding around the two shop levels.
    for (let i = 0; i < 7; i++) {
        const xx = cx - 9.8 + i * 3.25;
        add([xx, 3.85, cz - 10.55], [.15, 7.35, .18], M.metal, null, "front-pillar-" + i);
        add([xx, 7.35, cz - 10.25], [.15, .1, .65], M.gold, null, "roof-pillar-cap-" + i);
    }
    for (let floor = 0; floor < 2; floor++) {
        const y = floor === 0 ? 1.95 : 5.65;
        const base = floor === 0 ? .42 : 4.12;
        for (let shop = 0; shop < 6; shop++) {
            const xx = cx - 8.9 + shop * 3.55, zfront = cz - 7.85;
            const type = (shop + floor * 3) % 6;
            // Individual shops have a back wall and side partitions, not a solid block.
            add([xx, y, cz - 4.02], [3.25, 2.88, .14], floor ? M.cream : M.wall, null, "shop-back-" + floor + "-" + shop);
            add([xx - 1.64, y, cz - 5.92], [.12, 2.88, 3.72], M.darkWall, null, "shop-partition-left-" + floor + "-" + shop);
            add([xx + 1.64, y, cz - 5.92], [.12, 2.88, 3.72], M.darkWall, null, "shop-partition-right-" + floor + "-" + shop);

            // Storefront glazing, colored sign board and readable Hebrew shop name.
            add([xx, y, zfront], [3.15, 2.58, .08], shop % 3 === 0 ? M.glassBlue : M.glass, null, "shop-window-" + floor + "-" + shop);
            add([xx, y + 1.62, zfront - .08], [3.28, .48, .2], SIGN_MATERIALS[(shop + floor * 2) % SIGN_MATERIALS.length], null, "shop-sign-" + floor + "-" + shop);
            pieces.push(h("mesh", { key: "mall-shop-label-" + floor + "-" + shop, position: [xx, y + 1.62, zfront - .191], material: SHOP_SIGN_MATERIALS[type] }, h("planeGeometry", { args: [2.72, .43] })));
            add([xx, base + .08, cz - 5.95], [3.08, .06, 3.62], floor ? M.cream : M.wood, null, "shop-floor-" + floor + "-" + shop);

            // All shops have a real service counter, cash register and lit product display.
            add([xx, base + .55, cz - 6.72], [2.45, .82, .62], M.wood, null, "shop-counter-" + floor + "-" + shop);
            add([xx, base + 1.0, cz - 6.72], [2.52, .1, .68], M.cream, null, "shop-counter-top-" + floor + "-" + shop);
            add([xx + .78, base + 1.15, cz - 6.48], [.42, .36, .3], M.darkWall, null, "shop-register-" + floor + "-" + shop);
            add([xx + .78, base + 1.37, cz - 6.48], [.35, .19, .025], M.glassBlue, null, "shop-register-screen-" + floor + "-" + shop);
            add([xx - .72, base + 1.28, cz - 6.48], [.78, .52, .54], M.glass, null, "shop-display-case-" + floor + "-" + shop);

            if (type === 0) {
                // Fashion shop: hanging rails, garments, folded stacks and mirrors.
                for (const side of [-1, 1]) {
                    add([xx + side * .95, base + 2.15, cz - 5.35], [1.22, .08, .08], M.gold, null, "fashion-rail-" + side + "-" + floor);
                    add([xx + side * .95, base + 1.72, cz - 5.35], [.07, .82, .07], M.metal, null, "fashion-stand-" + side + "-" + floor);
                }
                for (let garment = 0; garment < 7; garment++) {
                    const gx = xx - 1.38 + garment * .23, mat = SIGN_MATERIALS[(garment + floor) % SIGN_MATERIALS.length];
                    add([gx, base + 1.55, cz - 5.36], [.2, .55, .08], mat, null, "fashion-garment-" + garment + "-" + floor);
                }
                add([xx - 1.37, base + 1.55, cz - 4.38], [.16, 2.1, .035], M.glassBlue, null, "fashion-mirror-" + floor);
            } else if (type === 1) {
                // Toy shop: low shelves filled with bright boxes and round toys.
                for (let row = 0; row < 3; row++) {
                    add([xx - .88, base + .52 + row * .58, cz - 4.55], [1.2, .09, .48], M.wood, null, "toy-shelf-" + row + "-" + floor);
                    for (let item = 0; item < 5; item++) add([xx - 1.32 + item * .22, base + .72 + row * .58, cz - 4.55], [.16, .31, .34], SIGN_MATERIALS[(item + row) % SIGN_MATERIALS.length], null, "toy-box-" + row + "-" + item + "-" + floor);
                }
                for (let item = 0; item < 4; item++) pieces.push(sphere([xx + .75 + (item % 2) * .38, base + .55 + Math.floor(item / 2) * .35, cz - 5.42], [.15, .15, .15], [M.red, M.yellow, M.teal, M.purple][item], "toy-ball-" + floor + "-" + item));
            } else if (type === 2) {
                // Electronics shop: televisions, tablets, speakers and demonstration desks.
                for (let screen = 0; screen < 3; screen++) {
                    add([xx - 1.0 + screen, base + 2.08, cz - 4.34], [.82, 1.0, .09], M.darkWall, null, "electronics-tv-" + screen + "-" + floor);
                    add([xx - 1.0 + screen, base + 2.08, cz - 4.285], [.7, .83, .025], [M.teal, M.blue, M.purple][screen], null, "electronics-screen-" + screen + "-" + floor);
                    add([xx - 1.0 + screen, base + .82, cz - 5.1], [.7, .48, .48], M.darkWall, null, "electronics-speaker-" + screen + "-" + floor);
                }
                for (let device = 0; device < 4; device++) add([xx - 1.0 + device * .55, base + 1.12, cz - 6.0], [.32, .08, .22], M.glassBlue, null, "electronics-tablet-" + device + "-" + floor);
            } else if (type === 3) {
                // Bookshop: tall bookcases with colorful spines and reading table.
                for (let shelf = 0; shelf < 3; shelf++) {
                    add([xx - 1.0 + shelf, base + 1.45, cz - 4.45], [.85, 2.25, .32], M.wood, null, "bookcase-" + shelf + "-" + floor);
                    for (let row = 0; row < 3; row++) for (let book = 0; book < 5; book++) {
                        add([xx - 1.34 + shelf + book * .135, base + .68 + row * .58, cz - 4.26], [.105, .43, .055], SIGN_MATERIALS[(book + row + shelf) % SIGN_MATERIALS.length], null, "book-spine-" + shelf + "-" + row + "-" + book + "-" + floor);
                    }
                }
                add([xx, base + .72, cz - 6.0], [1.05, .12, .72], M.wood, null, "reading-table-" + floor);
            } else if (type === 4) {
                // Grocery: two stocked aisles and cold display cases.
                for (let aisle = 0; aisle < 2; aisle++) {
                    add([xx - .82 + aisle * 1.64, base + .95, cz - 5.15], [.68, .12, 1.55], M.wood, null, "grocery-aisle-" + aisle + "-" + floor);
                    for (let row = 0; row < 3; row++) for (let product = 0; product < 4; product++) {
                        add([xx - 1.1 + aisle * 1.64 + product * .18, base + .56 + row * .35, cz - 5.65 + (product % 2) * .76], [.14, .22, .18], SIGN_MATERIALS[(product + row + aisle) % SIGN_MATERIALS.length], null, "grocery-product-" + aisle + "-" + row + "-" + product + "-" + floor);
                    }
                }
                add([xx + .9, base + 1.18, cz - 4.5], [.55, 1.8, .58], M.glass, null, "grocery-fridge-" + floor);
            } else {
                // Cafe: service counter, pastry cabinet, tables and stools.
                add([xx, base + 1.18, cz - 4.55], [2.7, .1, .58], M.wood, null, "cafe-bar-top-" + floor);
                add([xx, base + 1.72, cz - 4.55], [2.7, .12, .58], M.cream, null, "cafe-canopy-" + floor);
                for (let table = 0; table < 2; table++) {
                    const tx = xx - .72 + table * 1.42;
                    add([tx, base + .78, cz - 6.0], [.78, .1, .68], M.wood, null, "cafe-table-" + table + "-" + floor);
                    for (const side of [-1, 1]) addCylinder([tx + side * .52, base + .45, cz - 6.0], .13, .45, M.teal, null, "cafe-stool-" + table + "-" + side + "-" + floor);
                }
                for (let pastry = 0; pastry < 4; pastry++) pieces.push(sphere([xx - .75 + pastry * .48, base + 1.34, cz - 4.88], [.16, .12, .15], [M.yellow, M.cream, M.red, M.wood][pastry], "cafe-pastry-" + floor + "-" + pastry));
            }
        }
    }

    // Shared atrium details: planters, seating and directional kiosks.
    for (let i = 0; i < 4; i++) {
        const px = cx - 7.4 + i * 4.9;
        add([px, .62, cz - 1.0], [1.7, .75, 1.05], M.wood, null, "atrium-planter-" + i);
        addCylinder([px, 1.25, cz - 1.0], .34, 1.1, M.green, null, "atrium-plant-" + i);
        add([px, .68, cz + 2.2], [2.25, .16, .55], M.wood, null, "atrium-bench-" + i);
    }

    // Glass rails and clearer treads on the two escalators.
    for (const side of [-1, 1]) {
        add([cx + side * 7.2, 2.8, cz - 2.2], [2.8, .15, 6.2], M.darkWall, [0, 0, side * -.24], "escalator-" + side);
        for (let step = 0; step < 14; step++) add([cx + side * 7.2, .53 + step * .255, cz - 5.35 + step * .45], [2.55, .08, .54], M.gold, null, "escalator-step-" + side + "-" + step);
        for (const railSide of [-1, 1]) add([cx + side * 7.2 + railSide * 1.25, 2.5, cz - 2.2], [.07, .16, 6.2], M.glassBlue, [0, 0, side * -.24], "escalator-rail-" + side + "-" + railSide);
    }
    // Safe glass balustrades frame the open atrium on the upper gallery.
    for (const side of [-1, 1]) {
        add([cx + side * 4.58, 4.55, cz], [.11, 1.02, 8.75], M.glassBlue, null, "atrium-glass-rail-x-" + side);
        add([cx + side * 4.58, 5.08, cz], [.16, .1, 8.82], M.gold, null, "atrium-handrail-x-" + side);
        add([cx, 4.55, cz + side * 4.48], [9.25, 1.02, .11], M.glassBlue, null, "atrium-glass-rail-z-" + side);
        add([cx, 5.08, cz + side * 4.48], [9.32, .1, .16], M.gold, null, "atrium-handrail-z-" + side);
    }
    for (let i = 0; i < 6; i++) {
        const xx = cx - 8.0 + i * 3.2;
        add([xx, 7.28, cz + 7.0], [1.65, .08, .18], M.glow, null, "mall-ceiling-light-" + i);
    }

    for (let i = 0; i < 8; i++) {
        const xx = cx - 9.3 + i * 2.65;
        add([xx, .52, cz - 12.1], [.22, 1.0, .22], M.metal, null, "bollard-" + i);
        add([xx, .9, cz - 12.1], [.34, .12, .34], M.gold, null, "bollard-cap-" + i);
    }
    // A proper central atrium fountain, plus a food-court seating corner.
    add([cx, .4, cz + 1.45], [4.2, .32, 4.2], M.teal, null, "atrium-fountain-basin");
    addCylinder([cx, .68, cz + 1.45], 1.68, .34, M.roofStone, null, "atrium-fountain-rim", 28);
    addCylinder([cx, .86, cz + 1.45], .62, .38, M.gold, null, "atrium-fountain-center", 20);
    pieces.push(h("mesh", { key: "mall-fountain-water", position: [cx, .87, cz + 1.45], material: M.glassBlue }, h("cylinderGeometry", { args: [1.42, 1.42, .035, 28] })));
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        add([cx + Math.cos(a) * 4.5, .48, cz + 1.45 + Math.sin(a) * 4.5], [2.2, .16, .62], M.wood, [0, -a, 0], "atrium-cafe-bench-" + i);
    }
    for (let i = 0; i < 3; i++) {
        const px = cx - 8.4 + i * 8.4;
        add([px, .56, cz + 5.2], [1.25, .62, 1.25], M.wood, null, "atrium-planter-base-" + i);
        addCylinder([px, 1.25, cz + 5.2], .35, 1.15, M.green, null, "atrium-planter-tree-" + i, 10);
    }
    return h("group", { key: "mall-model" }, ...pieces);
}

function SportsModel({ place }) {
    const { x: cx, z: cz } = place;
    const pieces = [];
    const add = (p, s, mat, rot, id) => pieces.push(box(p, s, mat, rot, "sports-" + id));
    const bx = cx - 6.3, sx = cx + 6.3, courtZ = cz;
    add([bx, .23, courtZ], [11.4, .12, 18.6], M.courtBlue, null, "basketball-floor");
    add([sx, .23, courtZ], [11.4, .12, 18.6], M.courtGreen, null, "football-floor");
    const basketballLines = [
        [[bx - 5.2, .31, courtZ - 8.7], [bx + 5.2, .31, courtZ - 8.58], [10.4, .035, .11]],
        [[bx - 5.2, .31, courtZ + 8.58], [bx + 5.2, .31, courtZ + 8.7], [10.4, .035, .11]],
        [[bx - 5.2, .31, courtZ], [bx + 5.2, .31, courtZ], [10.4, .035, .11]],
        [[bx - 5.2, .31, courtZ], [bx - 5.08, .31, courtZ], [.11, .035, 17.3]],
        [[bx + 5.08, .31, courtZ], [bx + 5.2, .31, courtZ], [.11, .035, 17.3]]
    ];
    basketballLines.forEach(([a, b, size], i) => add([(a[0] + b[0]) / 2, .32, (a[2] + b[2]) / 2], size, M.white, null, "basket-line-" + i));
    pieces.push(h("mesh", { key: "basket-circle", position: [bx, .33, courtZ], rotation: [Math.PI / 2, 0, 0], material: M.white }, h("torusGeometry", { args: [1.6, .035, 7, 36] })));
    for (const direction of [-1, 1]) {
        const z = courtZ + direction * 7.35;
        add([bx, 2.15, z], [.16, 3.75, .16], M.metal, null, "basket-pole-" + direction);
        add([bx, 3.58, z - direction * .55], [1.9, 1.2, .12], M.white, null, "basket-backboard-" + direction);
        pieces.push(h("mesh", { key: "basket-rim-" + direction, position: [bx, 3.04, z - direction * .95], rotation: [Math.PI / 2, 0, 0], material: M.red }, h("torusGeometry", { args: [.48, .055, 8, 24] })));
    }
    const soccerLines = [
        [sx, .33, courtZ - 8.7, 10.4, .035, .1],
        [sx, .33, courtZ + 8.7, 10.4, .035, .1],
        [sx - 5.2, .33, courtZ, .1, .035, 17.4],
        [sx + 5.2, .33, courtZ, .1, .035, 17.4],
        [sx, .33, courtZ, 10.4, .035, .1]
    ];
    soccerLines.forEach(([x, y, z, w, hh, d], i) => add([x, y, z], [w, hh, d], M.white, null, "soccer-line-" + i));
    pieces.push(h("mesh", { key: "soccer-center-circle", position: [sx, .34, courtZ], rotation: [Math.PI / 2, 0, 0], material: M.white }, h("torusGeometry", { args: [1.45, .035, 7, 32] })));
    for (const direction of [-1, 1]) {
        const z = courtZ + direction * 8.25;
        for (const side of [-1, 1]) add([sx + side * 2.05, 1.15, z], [.12, 2.3, .12], M.white, null, "goal-post-" + direction + "-" + side);
        add([sx, 2.3, z], [4.2, .12, .12], M.white, null, "goal-crossbar-" + direction);
        add([sx, 1.1, z + direction * .7], [4.0, 2.1, .08], M.metal, null, "goal-net-" + direction);
    }
    for (const x of [bx - 5.8, bx + 5.8, sx - 5.8, sx + 5.8]) {
        for (const z of [cz - 9.4, cz + 9.4]) add([x, 1.4, z], [.1, 2.8, .1], M.metal, null, "fence-post-" + x + "-" + z);
    }
    for (const z of [cz - 9.4, cz + 9.4]) add([cx, 2.7, z], [23.2, .08, .08], M.metal, null, "fence-rail-" + z);
    add([cx, .35, cz - 11.0], [12.6, .14, .75], M.wood, null, "players-bench");
    return h("group", { key: "sports-model" }, ...pieces);
}

function FerrisWheel({ x, z }) {
    const wheel = useRef(null), cabins = useRef([]);
    useFrame(({ clock }) => {
        const angle = clock.elapsedTime * .095;
        if (wheel.current) wheel.current.rotation.z = angle;
        cabins.current.forEach((cabin) => { if (cabin) cabin.rotation.z = -angle; });
    });
    const radius = 5.0, spokes = [];
    for (let i = 0; i < 10; i++) {
        const a = i * Math.PI * 2 / 10;
        spokes.push(beam([0, 8.1, 0], [Math.cos(a) * radius, 8.1 + Math.sin(a) * radius, 0], .095, M.gold, "spoke-" + i));
        spokes.push(h("group", { key: "cabin-" + i, ref: (node) => { cabins.current[i] = node; }, position: [Math.cos(a) * radius, 8.1 + Math.sin(a) * radius, 0] },
            box([0, -.45, 0], [.85, .75, .72], SIGN_MATERIALS[i % SIGN_MATERIALS.length], null, "cabin-body-" + i),
            box([0, -.04, 0], [.9, .1, .78], M.gold, null, "cabin-roof-" + i)
        ));
    }
    return h("group", { position: [x, 0, z] },
        beam([-4.2, .25, 0], [0, 8.1, 0], .42, M.metal, "wheel-support-a"),
        beam([4.2, .25, 0], [0, 8.1, 0], .42, M.metal, "wheel-support-b"),
        h("group", { ref: wheel },
            h("mesh", { position: [0, 8.1, 0], material: M.gold }, h("torusGeometry", { args: [radius, .18, 12, 64] })),
            ...spokes,
            cylinder([0, 8.1, .15], .48, .45, M.metal, [Math.PI / 2, 0, 0])
        ),
        cylinder([0, .3, 0], .38, .6, M.darkWall)
    );
}

function Carousel({ x, z }) {
    const ride = useRef(null);
    useFrame(({ clock }) => { if (ride.current) ride.current.rotation.y = clock.elapsedTime * .22; });
    const horses = [];
    for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4, px = Math.cos(a) * 2.15, pz = Math.sin(a) * 2.15;
        horses.push(h("group", { key: "horse-" + i, position: [px, 1.25, pz] },
            cylinder([0, .35, 0], .055, 1.8, M.gold),
            sphere([0, .1, .1], [.43, .28, .75], SIGN_MATERIALS[i % SIGN_MATERIALS.length], "horse-body-" + i),
            sphere([0, .34, .55], [.24, .32, .24], M.cream, "horse-head-" + i)
        ));
    }
    return h("group", { position: [x, 0, z] },
        cylinder([0, .35, 0], 3.55, .55, M.roofBlue, [0, 0, 0], "carousel-base", 32),
        h("group", { ref: ride },
            cylinder([0, 2.8, 0], .18, 5.2, M.gold),
            cylinder([0, 5.2, 0], 3.6, .24, M.red, [0, 0, 0], "carousel-roof", 32),
            h("mesh", { position: [0, 5.52, 0], rotation: [0, 0, 0], material: M.yellow }, h("coneGeometry", { args: [3.2, 1.15, 32] })),
            ...horses,
            ...Array.from({ length: 8 }, (_, i) => {
                const a = i * Math.PI / 4;
                return beam([Math.cos(a) * 2.15, .85, Math.sin(a) * 2.15], [Math.cos(a) * 2.15, 5.2, Math.sin(a) * 2.15], .07, M.cream, "carousel-pole-" + i);
            })
        )
    );
}

const COASTER_TRACK_GEOMETRY = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5.0, 3.1, -1.0),
    new THREE.Vector3(-4.4, 5.2, -4.4),
    new THREE.Vector3(-1.0, 4.25, -5.4),
    new THREE.Vector3(3.4, 3.5, -4.0),
    new THREE.Vector3(5.0, 4.0, -.5),
    new THREE.Vector3(4.1, 5.5, 3.7),
    new THREE.Vector3(.4, 4.35, 4.8),
    new THREE.Vector3(-3.9, 3.55, 3.2)
], true, "centripetal"), 128, .16, 10, true);

function RollerCoaster({ x, z }) {
    const cart = useRef(null);
    useFrame(({ clock }) => {
        if (!cart.current) return;
        const pose = getCoasterCartPose(clock.elapsedTime);
        cart.current.position.set(pose.x - .5, pose.y, pose.z + 3.0);
        cart.current.rotation.set(0, pose.yaw, pose.pitch);
    });
    const supports = [];
    for (let i = 0; i < 16; i++) {
        const point = COASTER_CURVE.getPointAt(i / 16);
        supports.push(cylinder([point.x, point.y / 2, point.z], .11, point.y, M.metal, null, "coaster-support-" + i, 10));
    }
    return h("group", { position: [x, 0, z] },
        h("mesh", { geometry: COASTER_TRACK_GEOMETRY, material: M.red, castShadow: true, receiveShadow: true }),
        ...supports,
        h("group", { ref: cart }, box([0, 0, 0], [1.08, .42, 1.5], M.yellow, null, "coaster-cart"),
            box([0, .3, -.18], [.82, .3, .75], M.red, null, "coaster-seat"),
            box([0, .52, -.35], [.86, .12, .15], M.metal, null, "coaster-bar"))
    );
}

function SwingRide({ x, z }) {
    const rotating = useRef(null);
    useFrame(({ clock }) => { if (rotating.current) rotating.current.rotation.y = clock.elapsedTime * .52; });
    const seats = [];
    for (let i = 0; i < 10; i++) {
        const angle = i * Math.PI * 2 / 10, px = Math.cos(angle) * 2.45, pz = Math.sin(angle) * 2.45;
        seats.push(beam([0, 6.2, 0], [px, 3.15, pz], .035, M.gold, "swing-chain-" + i));
        seats.push(h("group", { key: "swing-seat-" + i, position: [px, 3.0, pz] },
            box([0, 0, 0], [.72, .2, .52], SIGN_MATERIALS[i % SIGN_MATERIALS.length], null, "swing-chair-" + i),
            box([0, .34, -.18], [.72, .55, .1], M.cream, null, "swing-back-" + i)
        ));
    }
    return h("group", { position: [x, 0, z] },
        cylinder([0, .25, 0], 1.35, .5, M.roofBlue, null, "swing-base", 24),
        cylinder([0, 3.4, 0], .18, 6.5, M.gold, null, "swing-mast"),
        h("group", { ref: rotating },
            cylinder([0, 6.2, 0], 1.25, .18, M.red, null, "swing-canopy", 24),
            ...seats
        )
    );
}

function BumperCars({ x, z }) {
    const refs = useRef([]);
    useFrame(({ clock }) => {
        refs.current.forEach((car, index) => {
            if (!car) return;
            const angle = clock.elapsedTime * (.48 + index * .025) + index * Math.PI / 2;
            car.position.set(Math.cos(angle) * (2.0 + (index % 2) * .45), .35, Math.sin(angle) * (1.45 + (index % 2) * .3));
            car.rotation.y = -angle + Math.PI / 2;
        });
    });
    const cars = [];
    for (let i = 0; i < 4; i++) cars.push(h("group", { key: "bumper-car-" + i, ref: (node) => { refs.current[i] = node; } },
        box([0, 0, 0], [1.05, .42, 1.45], SIGN_MATERIALS[i % SIGN_MATERIALS.length], null, "bumper-body-" + i),
        box([0, .34, -.1], [.72, .43, .7], M.darkWall, null, "bumper-seat-" + i),
        cylinder([-.38, -.12, -.42], .19, .12, M.metal, [Math.PI / 2, 0, 0], "bumper-wheel-a-" + i),
        cylinder([.38, -.12, -.42], .19, .12, M.metal, [Math.PI / 2, 0, 0], "bumper-wheel-b-" + i)
    ));
    const fence = [];
    for (const side of [-1, 1]) {
        fence.push(box([side * 3.75, .72, 0], [.15, 1.2, 6.8], M.metal, null, "bumper-fence-x-" + side));
        fence.push(box([0, .72, side * 3.35], [7.5, 1.2, .15], M.metal, null, "bumper-fence-z-" + side));
    }
    return h("group", { position: [x, 0, z] },
        box([0, .12, 0], [7.45, .24, 6.6], M.courtBlue, null, "bumper-floor"),
        ...fence, ...cars
    );
}

function MiniTrain({ x, z }) {
    const train = useRef(null);
    useFrame(({ clock }) => { if (train.current) train.current.rotation.y = clock.elapsedTime * .28; });
    const coaches = [];
    for (let i = 0; i < 3; i++) {
        const angle = i * Math.PI * 2 / 3, px = Math.cos(angle) * 2.05, pz = Math.sin(angle) * 2.05;
        coaches.push(h("group", { key: "train-coach-" + i, position: [px, .48, pz], rotation: [0, -angle, 0] },
            box([0, 0, 0], [1.05, .62, 1.35], [M.red, M.yellow, M.teal][i], null, "train-body-" + i),
            box([0, .32, 0], [.86, .45, .92], M.glassBlue, null, "train-window-" + i),
            box([0, .68, 0], [1.1, .12, 1.4], M.gold, null, "train-roof-" + i)
        ));
    }
    return h("group", { position: [x, 0, z] },
        h("mesh", { position: [0, .12, 0], rotation: [Math.PI / 2, 0, 0], material: M.metal }, h("torusGeometry", { args: [2.85, .1, 8, 48] })),
        h("group", { ref: train }, ...coaches),
        cylinder([0, .32, 0], .42, .55, M.roofBlue, null, "train-engine-base", 20)
    );
}

function DropTower({ x, z }) {
    const cabin = useRef(null);
    useFrame(({ clock }) => {
        if (cabin.current) cabin.current.position.y = getDropTowerCabinY(clock.elapsedTime);
    });
    return h("group", { position: [x, 0, z] },
        cylinder([0, 4.2, 0], .48, 8.2, M.purple, null, "drop-tower-mast"),
        cylinder([0, 8.35, 0], 1.25, .24, M.gold, null, "drop-tower-cap", 24),
        h("group", { ref: cabin, position: [0, 1.35, 0] },
            box([0, 0, 0], [2.25, 1.0, 2.05], M.red, null, "drop-tower-cabin"),
            box([0, .42, -.78], [1.8, .12, .12], M.gold, null, "drop-tower-front-bar")
        )
    );
}

function AmusementModel({ place }) {
    const { x: cx, z: cz } = place;
    const rides = [];
    rides.push(box([cx, .18, cz], [29.2, .25, 29.2], M.grass, null, "park-base"));
    rides.push(box([cx, .32, cz - 14.2], [27.8, .16, .5], M.wood, null, "park-entrance-walkway"));
    rides.push(h(FerrisWheel, { x: cx - 5.4, z: cz + 1.2, key: "ferris" }));
    rides.push(h(Carousel, { x: cx + 6.5, z: cz + 5.2, key: "carousel" }));
    rides.push(h(DropTower, { x: cx + 7.2, z: cz - 7.0, key: "drop-tower" }));
    rides.push(h(RollerCoaster, { x: cx + .5, z: cz - 3.0, key: "roller-coaster" }));
    rides.push(h(SwingRide, { x: cx - 11.0, z: cz - 3.4, key: "swing-ride" }));
    rides.push(h(BumperCars, { x: cx - 1.4, z: cz + 10.0, key: "bumper-cars" }));
    rides.push(h(MiniTrain, { x: cx + 10.8, z: cz - .8, key: "mini-train" }));
    const foodNames = ["גלידה", "פופקורן", "שתייה", "מתוקים", "נקניקיות", "צעצועים", "כרטיסים"];
    for (let i = 0; i < 7; i++) {
        const xx = cx - 9.1 + i * 3.0;
        rides.push(box([xx, .8, cz - 12.0], [2.55, 1.55, 1.65], i % 2 ? M.teal : M.red, null, "carnival-stall-" + i));
        rides.push(box([xx, 1.75, cz - 12.0], [2.7, .18, 1.82], SIGN_MATERIALS[i % SIGN_MATERIALS.length], null, "carnival-awning-" + i));
        rides.push(box([xx, 1.22, cz - 12.88], [1.55, .65, .09], M.glassBlue, null, "stall-window-" + i));
    }
    rides.push(box([cx - 5.4, .9, cz - 8.2], [4.2, .18, 2.0], M.darkWall, null, "queue-platform"));
    for (let i = 0; i < 6; i++) rides.push(cylinder([cx - 7.2 + i * .75, .62, cz - 7.2], .045, 1.1, M.gold, null, "queue-post-" + i, 8));
    // Colorful flags and safety lights around the park paths.
    for (let i = 0; i < 10; i++) {
        const angle = i * Math.PI * 2 / 10, px = cx + Math.cos(angle) * 13.7, pz = cz + Math.sin(angle) * 13.7;
        rides.push(cylinder([px, 1.35, pz], .045, 2.7, M.gold, null, "park-lamp-post-" + i, 8));
        rides.push(sphere([px, 2.8, pz], [.18, .18, .18], M.glow, "park-lamp-" + i));
    }
    return h("group", { key: "amusement-model" }, ...rides);
}


const HELI_BODY_GEOMETRY = new THREE.SphereGeometry(1, 14, 10);
const HELI_COCKPIT_GEOMETRY = new THREE.SphereGeometry(1, 14, 10);
const HELI_TAIL_GEOMETRY = new THREE.CylinderGeometry(.085, .14, 3.0, 8);
const HELI_SKID_GEOMETRY = new THREE.BoxGeometry(.075, .075, 2.5);
const HELI_STRUT_GEOMETRY = new THREE.BoxGeometry(.075, .5, .075);
const HELI_MAST_GEOMETRY = new THREE.CylinderGeometry(.045, .06, .55, 8);
const HELI_FIN_GEOMETRY = new THREE.BoxGeometry(.08, .8, .36);
const HELI_TAIL_ROTOR_GEOMETRY = new THREE.BoxGeometry(.055, .72, .055);
const HELI_ROTOR_GEOMETRY = new THREE.BoxGeometry(.12, .045, 4.0);

function RooftopHelicopters({ helis }) {
    const smallHelis = useMemo(() => (helis || []).filter((heli) => (heli.scale || 1) < .95), [helis]);
    const padRef = useRef(null), bodyRef = useRef(null), cockpitRef = useRef(null);
    const tailRef = useRef(null), skidRef = useRef(null), strutRef = useRef(null);
    const mastRef = useRef(null), finRef = useRef(null), tailRotorRef = useRef(null);
    const rotorARef = useRef(null), rotorBRef = useRef(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const rootEuler = useMemo(() => new THREE.Euler(), []);
    const rootQuaternion = useMemo(() => new THREE.Quaternion(), []);
    const localEuler = useMemo(() => new THREE.Euler(), []);
    const localQuaternion = useMemo(() => new THREE.Quaternion(), []);
    const localPosition = useMemo(() => new THREE.Vector3(), []);

    useFrame(({ clock }) => {
        if (!smallHelis.length) return;
        const setPart = (ref, index, heli, offset, dimensions, rotation = [0, 0, 0]) => {
            const size = heli.scale || .68;
            rootEuler.set(heli.pitch || 0, heli.yaw || 0, heli.roll || 0, "YXZ");
            rootQuaternion.setFromEuler(rootEuler);
            localPosition.set(offset[0] * size, offset[1] * size, offset[2] * size).applyQuaternion(rootQuaternion);
            dummy.position.set(heli.x, heli.y, heli.z).add(localPosition);
            localEuler.set(rotation[0], rotation[1], rotation[2]);
            localQuaternion.setFromEuler(localEuler);
            dummy.quaternion.copy(rootQuaternion).multiply(localQuaternion);
            dummy.scale.set(dimensions[0] * size, dimensions[1] * size, dimensions[2] * size);
            dummy.updateMatrix();
            ref.current?.setMatrixAt(index, dummy.matrix);
        };
        smallHelis.forEach((heli, index) => {
            const homeX = heli.homeX ?? heli.x, homeY = heli.homeY ?? heli.y, homeZ = heli.homeZ ?? heli.z;
            const padSize = heli.padSize || 6.2;
            dummy.position.set(homeX, homeY - .03, homeZ);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(padSize, .06, padSize);
            dummy.updateMatrix();
            padRef.current?.setMatrixAt(index, dummy.matrix);

            setPart(bodyRef, index, heli, [0, .96, 0], [.72, .36, 1.12]);
            setPart(cockpitRef, index, heli, [0, 1.24, .47], [.57, .39, .58]);
            setPart(tailRef, index, heli, [0, 1.02, -1.95], [1, 1, 1], [Math.PI / 2, 0, 0]);
            for (const side of [-1, 1]) {
                setPart(skidRef, index * 2 + (side === 1 ? 1 : 0), heli, [side * .57, .15, 0], [1, 1, 1]);
                for (const end of [-1, 1]) {
                    const strutIndex = index * 4 + (side === 1 ? 2 : 0) + (end === 1 ? 1 : 0);
                    setPart(strutRef, strutIndex, heli, [side * .53, .43, end * .72], [1, 1, 1]);
                }
            }
            setPart(mastRef, index, heli, [0, 1.96, -.2], [1, 1, 1]);
            setPart(finRef, index, heli, [0, 1.5, -3.35], [1, 1, 1]);
            const tailSpin = heli.rotor > .05 ? heli.trA : clock.elapsedTime * 10;
            setPart(tailRotorRef, index, heli, [0, 1.52, -3.4], [1, 1, 1], [0, 0, tailSpin]);
            const mainSpin = heli.rotor > .05 ? heli.rotA : clock.elapsedTime * 8.5;
            setPart(rotorARef, index, heli, [0, 2.32, -.2], [1, 1, 1], [0, mainSpin, 0]);
            setPart(rotorBRef, index, heli, [0, 2.32, -.2], [1, 1, 1], [0, mainSpin + Math.PI / 2, 0]);
        });
        for (const ref of [padRef, bodyRef, cockpitRef, tailRef, skidRef, strutRef, mastRef, finRef, tailRotorRef, rotorARef, rotorBRef]) {
            if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
        }
    });

    if (!smallHelis.length) return null;
    const instance = (ref, geometry, material, count) => h("instancedMesh", {
        ref, args: [geometry, material, count], castShadow: false, receiveShadow: false, frustumCulled: false
    });
    return h(React.Fragment, null,
        instance(padRef, BOX, M.roofStone, smallHelis.length),
        instance(bodyRef, HELI_BODY_GEOMETRY, M.red, smallHelis.length),
        instance(cockpitRef, HELI_COCKPIT_GEOMETRY, M.glassBlue, smallHelis.length),
        instance(tailRef, HELI_TAIL_GEOMETRY, M.metal, smallHelis.length),
        instance(skidRef, HELI_SKID_GEOMETRY, M.metal, smallHelis.length * 2),
        instance(strutRef, HELI_STRUT_GEOMETRY, M.metal, smallHelis.length * 4),
        instance(mastRef, HELI_MAST_GEOMETRY, M.gold, smallHelis.length),
        instance(finRef, HELI_FIN_GEOMETRY, M.red, smallHelis.length),
        instance(tailRotorRef, HELI_TAIL_ROTOR_GEOMETRY, M.darkWall, smallHelis.length),
        instance(rotorARef, HELI_ROTOR_GEOMETRY, M.darkWall, smallHelis.length),
        instance(rotorBRef, HELI_ROTOR_GEOMETRY, M.darkWall, smallHelis.length)
    );
}

export function CityLandmarks({ world, helis }) {
    return h(React.Fragment, null,
        (world.homes || []).map((home) => h(HouseModel, { key: "home-" + home.id, home })),
        (world.landmarks || []).map((place, index) => {
            if (place.type === "mall") return h(MallModel, { key: "mall-" + index, place });
            if (place.type === "sports") return h(SportsModel, { key: "sports-" + index, place });
            if (place.type === "amusement") return h(AmusementModel, { key: "amusement-" + index, place });
            return null;
        }),
        h(RooftopHelicopters, { helis, key: "rooftop-helicopters" })
    );
}
