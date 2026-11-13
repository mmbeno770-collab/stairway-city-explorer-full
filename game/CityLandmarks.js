import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

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
    const front = cz - depth / 2, roof = style === "cottage" ? M.roofRed : style === "villa" ? M.roofBlue : M.roofStone;
    const items = [];
    const addBox = (p, s, mat, rot, id) => items.push(box(p, s, mat, rot, "home-" + home.id + "-" + id));
    addBox([cx, .2, cz], [width + .45, .18, depth + .45], M.cream, null, "plinth");
    addBox([cx, wallHeight + .32, cz - depth * .22], [width + .8, .22, depth * .68], roof, [-.43, 0, 0], "roof-a");
    addBox([cx, wallHeight + .32, cz + depth * .22], [width + .8, .22, depth * .68], roof, [.43, 0, 0], "roof-b");
    addBox([cx, wallHeight + .78, cz], [width + .95, .18, .38], M.darkWall, null, "ridge");
    addBox([cx + width * .31, wallHeight + 1.2, cz - depth * .15], [.72, 1.8, .72], M.roofStone, null, "chimney");
    addBox([cx, 2.7, front - .13], [2.35, .16, 1.05], M.wood, null, "porch-canopy");
    for (const side of [-1, 1]) {
        addBox([cx + side * 1.02, 1.45, front - .48], [.13, 2.3, .13], M.cream, null, "porch-post-" + side);
        addBox([cx + side * (width * .28), 1.9, front - .07], [1.42, 1.2, .12], M.glassBlue, null, "window-" + side);
        addBox([cx + side * (width * .28), 1.9, front - .16], [1.58, .09, .12], M.cream, null, "window-head-" + side);
        addBox([cx + side * (width * .28), 1.9, front - .16], [.09, 1.36, .12], M.cream, null, "window-jamb-" + side);
        addBox([cx + side * (width * .28), .53, front - .14], [1.65, .09, .15], M.roofBlue, null, "window-sill-" + side);
    }
    addBox([cx, 1.35, front - .09], [1.28, 2.18, .14], M.wood, null, "front-door");
    addBox([cx + .42, 1.35, front - .18], [.07, .07, .06], M.gold, null, "door-handle");
    if (floors === 2) {
        const balconyY = 4.1;
        addBox([cx, balconyY, front - .55], [width * .62, .16, 1.2], M.cream, null, "balcony-floor");
        addBox([cx, balconyY + .58, front - 1.08], [width * .62, .09, .08], M.metal, null, "balcony-rail");
        for (let n = -3; n <= 3; n++) addBox([cx + n * .72, balconyY + .29, front - 1.08], [.055, .55, .055], M.metal, null, "balcony-post-" + n);
        for (const side of [-1, 1]) addBox([cx + side * 2.45, 5.2, front - .07], [1.25, 1.08, .12], M.glassBlue, null, "upper-window-" + side);
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
    add([cx, .13, cz], [23.2, .26, 23.2], M.roofStone, null, "podium");
    add([cx, 3.7, cz + 8.5], [21.8, 7.1, .32], M.darkWall, null, "rear-wall");
    add([cx - 10.8, 3.7, cz], [.32, 7.1, 17.2], M.darkWall, null, "west-wall");
    add([cx + 10.8, 3.7, cz], [.32, 7.1, 17.2], M.darkWall, null, "east-wall");
    add([cx, 3.82, cz], [21.1, .28, 19.3], M.roofStone, null, "upper-floor");
    add([cx, 7.55, cz], [22.4, .38, 22.4], M.darkWall, null, "roof-deck");
    add([cx, 7.82, cz], [9.4, .16, 5.4], M.glassBlue, null, "skylight");
    add([cx, 8.0, cz - 10.25], [9.2, .22, .65], M.teal, null, "main-sign");
    add([cx, 8.04, cz - 10.62], [5.6, .04, .035], M.glow, null, "sign-light");
    add([cx, 4.0, cz - 9.9], [21.2, .16, .32], M.gold, null, "upper-canopy");
    add([cx, .75, cz - 10.0], [7.1, .22, 2.2], M.darkWall, null, "entry-canopy");
    add([cx, 1.95, cz - 9.7], [2.65, 2.95, .12], M.glass, null, "main-entry-glass");
    add([cx - 1.2, 1.55, cz - 9.82], [.08, 2.25, .12], M.gold, null, "entry-frame-a");
    add([cx + 1.2, 1.55, cz - 9.82], [.08, 2.25, .12], M.gold, null, "entry-frame-b");
    for (let i = 0; i < 7; i++) {
        const xx = cx - 9.8 + i * 3.25;
        add([xx, 3.85, cz - 10.55], [.15, 7.35, .18], M.metal, null, "front-pillar-" + i);
        add([xx, 7.35, cz - 10.25], [.15, .1, .65], M.gold, null, "roof-pillar-cap-" + i);
    }
    for (let floor = 0; floor < 2; floor++) {
        const y = floor === 0 ? 1.95 : 5.65;
        for (let shop = 0; shop < 6; shop++) {
            const xx = cx - 8.9 + shop * 3.55, zfront = cz - 7.85;
            add([xx, y, cz - 5.9], [3.25, 3.05, 4.0], floor ? M.cream : M.wall, null, "shop-back-" + floor + "-" + shop);
            add([xx, y, zfront], [3.15, 2.6, .08], shop % 3 === 0 ? M.glassBlue : M.glass, null, "shop-window-" + floor + "-" + shop);
            add([xx, y + 1.62, zfront - .08], [3.28, .48, .2], SIGN_MATERIALS[(shop + floor * 2) % SIGN_MATERIALS.length], null, "shop-sign-" + floor + "-" + shop);
            add([xx - .72, y + .58, cz - 6.55], [.76, .75, .58], shop % 2 ? M.blue : M.yellow, null, "display-a-" + floor + "-" + shop);
            add([xx + .72, y + .48, cz - 6.7], [.72, .56, .45], shop % 2 ? M.purple : M.green, null, "display-b-" + floor + "-" + shop);
            add([xx, y - 1.52, cz - 8.0], [3.25, .08, .2], M.gold, null, "shop-sill-" + floor + "-" + shop);
        }
    }
    for (let i = 0; i < 5; i++) {
        const xx = cx - 8 + i * 4;
        add([xx, 7.84, cz + 2.5], [2.85, .13, 1.6], M.glassBlue, null, "roof-panel-" + i);
        add([xx, 8.12, cz + 7.2], [1.5, .5, 1.15], M.darkWall, null, "roof-machine-" + i);
    }
    for (const side of [-1, 1]) {
        add([cx + side * 7.2, 2.8, cz - 2.2], [2.8, .15, 6.2], M.darkWall, [0, 0, side * -.24], "escalator-" + side);
        for (let step = 0; step < 8; step++) add([cx + side * 7.2, 1.25 + step * .24, cz - 4.6 + step * .62], [2.55, .08, .5], M.gold, null, "escalator-step-" + side + "-" + step);
    }
    for (let i = 0; i < 8; i++) {
        const xx = cx - 9.3 + i * 2.65;
        add([xx, .52, cz - 12.1], [.22, 1.0, .22], M.metal, null, "bollard-" + i);
        add([xx, .9, cz - 12.1], [.34, .12, .34], M.gold, null, "bollard-cap-" + i);
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
    const wheel = useRef(null);
    useFrame((_, dt) => { if (wheel.current) wheel.current.rotation.z += dt * .095; });
    const radius = 5.0, spokes = [];
    for (let i = 0; i < 10; i++) {
        const a = i * Math.PI * 2 / 10;
        spokes.push(beam([0, 8.1, 0], [Math.cos(a) * radius, 8.1 + Math.sin(a) * radius, 0], .095, M.gold, "spoke-" + i));
        spokes.push(h("group", { key: "cabin-" + i, position: [Math.cos(a) * radius, 8.1 + Math.sin(a) * radius, 0] },
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
    useFrame((_, dt) => { if (ride.current) ride.current.rotation.y += dt * .22; });
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

function AmusementModel({ place }) {
    const { x: cx, z: cz } = place;
    const rides = [];
    rides.push(box([cx, .18, cz], [23.2, .25, 23.2], M.grass, null, "park-base"));
    rides.push(h(FerrisWheel, { x: cx - 5.4, z: cz + 1.2, key: "ferris" }));
    rides.push(h(Carousel, { x: cx + 6.5, z: cz + 5.2, key: "carousel" }));
    rides.push(cylinder([cx + 7.2, 4.2, cz - 7.0], .48, 8.2, M.purple, null, "drop-tower"));
    rides.push(cylinder([cx + 7.2, 8.35, cz - 7.0], 1.25, .24, M.gold, null, "tower-top", 24));
    rides.push(box([cx + 7.2, 3.0, cz - 7.0], [2.25, 1.0, 2.05], M.red, null, "tower-cabin"));
    for (let i = 0; i < 7; i++) {
        const xx = cx - 9.1 + i * 3.0;
        rides.push(box([xx, .8, cz - 10.1], [2.55, 1.55, 1.65], i % 2 ? M.teal : M.red, null, "carnival-stall-" + i));
        rides.push(box([xx, 1.75, cz - 10.1], [2.7, .18, 1.82], SIGN_MATERIALS[i % SIGN_MATERIALS.length], null, "carnival-awning-" + i));
        rides.push(box([xx, 1.22, cz - 10.98], [1.55, .65, .09], M.glassBlue, null, "stall-window-" + i));
    }
    rides.push(box([cx - 5.4, .9, cz - 8.2], [4.2, .18, 2.0], M.darkWall, null, "queue-platform"));
    for (let i = 0; i < 6; i++) rides.push(cylinder([cx - 7.2 + i * .75, .62, cz - 7.2], .045, 1.1, M.gold, null, "queue-post-" + i, 8));
    return h("group", { key: "amusement-model" }, ...rides);
}

export function CityLandmarks({ world }) {
    return h(React.Fragment, null,
        (world.homes || []).map((home) => h(HouseModel, { key: "home-" + home.id, home })),
        (world.landmarks || []).map((place, index) => {
            if (place.type === "mall") return h(MallModel, { key: "mall-" + index, place });
            if (place.type === "sports") return h(SportsModel, { key: "sports-" + index, place });
            if (place.type === "amusement") return h(AmusementModel, { key: "amusement-" + index, place });
            return null;
        })
    );
}
