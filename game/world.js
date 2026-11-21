export const FLOOR_H = 4, WALL_T = 0.3, BLOCK = 36, GRID = 11, CITY_HALF = (GRID * BLOCK) / 2;

export const CABLE_STATIONS = [
  { id: 0, name: "תחנת צפון־מערב", x: -162, z: -162, y: 52 },
  { id: 1, name: "תחנת מרכז־צפון", x: 0, z: -72, y: 49 },
  { id: 2, name: "תחנת צפון־מזרח", x: 162, z: -162, y: 53 },
  { id: 3, name: "תחנת מרכז־מזרח", x: 72, z: 0, y: 50 },
  { id: 4, name: "תחנת דרום־מזרח", x: 162, z: 162, y: 52 },
  { id: 5, name: "תחנת מרכז־דרום", x: 0, z: 72, y: 51 },
  { id: 6, name: "תחנת דרום־מערב", x: -162, z: 162, y: 54 },
  { id: 7, name: "תחנת מרכז־מערב", x: -72, z: 0, y: 50 }
];
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const THEMES = [
    { theme: "cafe", label: "בית קפה", floor: "#76523d" }, { theme: "library", label: "ספרייה", floor: "#584638" }, { theme: "gym", label: "חדר כושר", floor: "#343d49" }, { theme: "gallery", label: "גלריה לאמנות", floor: "#d7d0c2" }, { theme: "office", label: "משרדים", floor: "#8d9b9d" }, { theme: "apartment", label: "דירת מגורים", floor: "#b99a72" }, { theme: "arcade", label: "אולם משחקים", floor: "#25283b" }, { theme: "garden", label: "גן פנימי", floor: "#637a4d" }, { theme: "music", label: "אולפן מוזיקה", floor: "#56383a" }, { theme: "kids", label: "חדר ילדים", floor: "#c3d0ce" },
];
const FACADES = ["#d9cbb5", "#b9aa97", "#c7bda9", "#84999c", "#e3d8c4", "#8d9b99", "#bba88b", "#9aa6a3", "#c6bcae", "#77888d"];
const NAMES = ["מגדל השקמה", "בית האורנים", "מרכז הגפן", "בית הים", "מגדל הזית", "בית הרימון", "מגדל האלון", "בית התמר", "מרכז הדקל", "בית הברוש", "מגדל הארז", "בית התאנה"];
export function generateWorld(seed = 7) {
    const r = rng(seed), boxes = [], buildings = [], trees = [], lamps = [], inter = [], parkingVehicles = [], homes = [], landmarks = [], crosswalks = [], busStops = [];
    const elevators = [];
    const add = (x0, y0, z0, x1, y1, z1, color, kind = "solid", collide = true, noGround = false, extra = null) => boxes.push({ x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1), color, kind, collide, noGround, ...(extra || {}) });
    const addRooftopHelicopter = (x, y, z, scale, padSize) => {
        const half = padSize / 2;
        add(x - half, y - .06, z - half, x + half, y, z + half, "#777b78", "heliPad", true);
        inter.push({ type: "heli", x, y, z, face: 0, scale, padSize, small: true });
    };
    const addHome = (homeX, homeZ, style, id, lotX0, lotZ0) => {
        const width = style === "villa" ? 9.1 : 8.15, depth = style === "villa" ? 9.8 : 9.1;
        const floors = style === "villa" ? 2 : 1, wallHeight = floors === 2 ? 6.35 : 3.45;
        const x0 = homeX - width / 2, x1 = homeX + width / 2, z0 = homeZ - depth / 2, z1 = homeZ + depth / 2;
        const wall = style === "villa" ? "#d5c4a8" : style === "cottage" ? "#d9c7ad" : "#c9c9bf";
        const roof = style === "villa" ? "#465965" : style === "cottage" ? "#9a5543" : "#58636a";
        homes.push({ id, cx: homeX, cz: homeZ, style, width, depth, floors, wallHeight, wallColor: wall, roofColor: roof });
        add(x0 - .25, 0, z0 - .25, x1 + .25, .24, z1 + .25, "#b8b4a9", "solid", true);
        add(x0, .24, z0, x1, .34, z1, "#9a9386", "solid", true);
        const t = .24, frontDoor = 1.65;
        add(x0, .34, z0, x0 + t, wallHeight + .34, z1, wall, "solid", true);
        add(x1 - t, .34, z0, x1, wallHeight + .34, z1, wall, "solid", true);
        add(x0 + t, .34, z1 - t, x1 - t, wallHeight + .34, z1, wall, "solid", true);
        // Front facade has real openings for the door and front windows so the furnished rooms can be seen.
        const frontOpenings = [
            { x0: homeX - width * .28 - .71, x1: homeX - width * .28 + .71, y0: 1.24, y1: 2.56 },
            { x0: homeX + width * .28 - .71, x1: homeX + width * .28 + .71, y0: 1.24, y1: 2.56 },
            { x0: homeX - frontDoor / 2, x1: homeX + frontDoor / 2, y0: .34, y1: 2.5 }
        ];
        if (style === "villa") {
            frontOpenings.push(
                { x0: homeX - 2.45 - .64, x1: homeX - 2.45 + .64, y0: 4.66, y1: 5.74 },
                { x0: homeX + 2.45 - .64, x1: homeX + 2.45 + .64, y0: 4.66, y1: 5.74 }
            );
        }
        const facadeX = [...new Set([x0 + t, x1 - t, ...frontOpenings.flatMap((o) => [Math.max(x0 + t, o.x0), Math.min(x1 - t, o.x1)])])].sort((a, b) => a - b);
        const facadeY = [...new Set([.34, wallHeight + .34, ...frontOpenings.flatMap((o) => [o.y0, o.y1])])].filter((y) => y >= .34 && y <= wallHeight + .34).sort((a, b) => a - b);
        for (let xi = 0; xi < facadeX.length - 1; xi++) for (let yi = 0; yi < facadeY.length - 1; yi++) {
            const xa = facadeX[xi], xb = facadeX[xi + 1], ya = facadeY[yi], yb = facadeY[yi + 1];
            if (xb - xa < .01 || yb - ya < .01) continue;
            const mx = (xa + xb) / 2, my = (ya + yb) / 2;
            const opening = frontOpenings.some((o) => mx > o.x0 && mx < o.x1 && my > o.y0 && my < o.y1);
            if (!opening) add(xa, ya, z0, xb, yb, z0 + t, wall, "solid", true);
        }
        // A walkable upper floor and low, climbable steps make the villas usable inside.
        if (style === "villa") {
            const stairX = homeX + width * .28, stairCount = 11, stairStart = z0 + 1.2;
            for (let step = 0; step < stairCount; step++) {
                const top = .34 + (step + 1) * .30, stepZ = stairStart + step * .4;
                add(stairX - .48, .34, stepZ, stairX + .48, top, stepZ + .42, "#826445", "solid", true);
            }
            add(x0 + t, 3.64, z0 + 5.2, x1 - t, 3.82, z1 - t, "#9a8872", "solid", true);
        }
        const pathX = homeX, pathZ0 = lotZ0 + 2.6, pathZ1 = z0 - .05;
        add(pathX - .7, .075, pathZ0, pathX + .7, .12, pathZ1, "#d8d0c0", "solid", false);
        add(x0 - .5, .06, z0 - .55, x1 + .5, .09, z1 + .7, style === "villa" ? "#7b9365" : "#82976b", "solid", false);
        if (style === "villa") {
            add(x1 + .45, .06, z0 + .5, x1 + 2.7, .1, z1 + .7, "#858b8c", "solid", false);
            add(x1 + .45, .08, z0 + .5, x1 + 2.7, .12, z1 + .7, "#c1c4c0", "solid", false);
        }
        for (const side of [-1, 1]) trees.push({ x: homeX + side * (width * .68), z: homeZ + depth * .55, s: .7 + r() * .18 });
        lamps.push({ x: homeX - width * .65, z: homeZ - depth * .65 }, { x: homeX + width * .65, z: homeZ - depth * .65 });
        add(homeX - .95, .34, z0 - .14, homeX + .95, .58, z0 + .08, "#76543d", "solid", false);
        addRooftopHelicopter(homeX, wallHeight + .94, homeZ, .39, 3.25);
    };
    const addLandmarkLot = (type, cx, cz) => {
        if (type === "mall") {
            add(cx - 11.6, 0, cz - 11.6, cx + 11.6, .24, cz + 11.6, "#777f80", "solid", true);
            add(cx - 11.15, .24, cz - 11.15, cx + 11.15, .32, cz + 11.15, "#c1c1b7", "solid", true);
            add(cx - 11, .3, cz + 10.65, cx + 11, 7.8, cz + 11, "#4b5a60", "solid", true);
            add(cx - 11, .3, cz - 11, cx - 10.7, 7.8, cz + 11, "#596b70", "solid", true);
            add(cx + 10.7, .3, cz - 11, cx + 11, 7.8, cz + 11, "#596b70", "solid", true);
            add(cx - 10.8, 3.82, cz - 10.8, cx - 4.5, 4.02, cz + 10.8, "#899394", "solid", true);
            add(cx + 4.5, 3.82, cz - 10.8, cx + 10.8, 4.02, cz + 10.8, "#899394", "solid", true);
            add(cx - 4.5, 3.82, cz - 10.8, cx + 4.5, 4.02, cz - 4.4, "#899394", "solid", true);
            add(cx - 4.5, 3.82, cz + 4.4, cx + 4.5, 4.02, cz + 10.8, "#899394", "solid", true);
            // Walkable escalator treads: every rise is below the player's step height.
            for (const side of [-1, 1]) for (let step = 0; step < 14; step++) {
                const top = .57 + step * .255, z = cz - 5.35 + step * .45, x = cx + side * 7.2;
                add(x - 1.28, .31, z - .27, x + 1.28, top, z + .27, "#aa9568", "mallStep", true);
            }
            landmarks.push({ type: "mall", x: cx, z: cz, name: "קניון העיר" });
            addRooftopHelicopter(cx + 6.2, 7.80, cz + 5.7, .66, 4.8);
            for (let i = 0; i < 8; i++) lamps.push({ x: cx - 9.5 + i * 2.7, z: cz - 12.3 });
            return;
        }
        if (type === "sports") {
            add(cx - 12, 0, cz - 12, cx + 12, .16, cz + 12, "#6f875e", "solid", true);
            add(cx - 12, .16, cz - 12, cx + 12, .2, cz + 12, "#a0a18c", "solid", false);
            landmarks.push({ type: "sports", x: cx, z: cz, name: "מתחם הספורט" });
            lamps.push({ x: cx - 10.5, z: cz - 10.5 }, { x: cx + 10.5, z: cz + 10.5 });
            return;
        }
        add(cx - 15, 0, cz - 15, cx + 15, .16, cz + 15, "#738b5c", "solid", true);
        add(cx - 14.6, .16, cz - 14.6, cx + 14.6, .2, cz + 14.6, "#b1aa92", "solid", false);
        landmarks.push({ type: "amusement", x: cx, z: cz, name: "לונה פארק" });
        for (let i = 0; i < 6; i++) lamps.push({ x: cx - 9.5 + i * 3.8, z: cz - 11.4 });
    };
    for (const station of CABLE_STATIONS) {
        // Elevated station decks are real walkable collision surfaces.
        add(station.x - 7, station.y - .35, station.z - 4.2, station.x + 7, station.y, station.z + 4.2, "#8d9698", "solid", true);
        // Low perimeter safety rails: collision posts and rails block walking, but are low enough to jump over.
        const fenceHeight = 1.08, fencePost = .09, fenceY = station.y;
        const post = (x, z) => add(x - fencePost, fenceY, z - fencePost, x + fencePost, fenceY + fenceHeight, z + fencePost, "#c7a66b", "solid", true, true);
        const railX = (z, x0, x1) => add(x0, fenceY + .88, z - .07, x1, fenceY + 1.02, z + .07, "#8c9997", "solid", true, true);
        const railZ = (x, z0, z1) => add(x - .07, fenceY + .88, z0, x + .07, fenceY + 1.02, z1, "#8c9997", "solid", true, true);
        const addPostsX = (z) => { for (let x = station.x - 6.65; x <= station.x + 6.66; x += .55) post(x, z); };
        const addPostsZ = (x, z0, z1) => { for (let z = z0; z <= z1 + .001; z += .55) post(x, z); };
        // North and south edges, plus the full eastern edge.
        addPostsX(station.z - 3.98); addPostsX(station.z + 3.98);
        addPostsZ(station.x + 6.65, station.z - 3.98, station.z + 3.98);
        railX(station.z - 3.98, station.x - 6.65, station.x + 6.65);
        railX(station.z + 3.98, station.x - 6.65, station.x + 6.65);
        railZ(station.x + 6.65, station.z - 3.98, station.z + 3.98);
        // The west edge is fenced too; the ladder remains reachable from inside the platform.
        addPostsZ(station.x - 6.65, station.z - 3.98, station.z + 3.98);
        railZ(station.x - 6.65, station.z - 3.98, station.z + 3.98);
        inter.push({ type: "cable", x: station.x - 5.2, y: 0, z: station.z, stationId: station.id });
    }
    const wall = (axis, a, b, c, y, color, door, glassColor) => {
        const L = b - a, n = Math.max(1, Math.floor(L / 3.6)), cell = L / n, doorCell = Math.floor(n / 2);
        const seg = (s0, s1, h0, h1, col = color, k = "solid", collide = true) => { if (s1 - s0 < .01) return; const t = WALL_T / 2; if (axis === "x") add(s0, y + h0, c - t, s1, y + h1, c + t, col, k, collide); else add(c - t, y + h0, s0, c + t, y + h1, s1, col, k, collide); };
        for (let i = 0; i < n; i++) {
            const s = a + i * cell, isDoor = door && i === doorCell, ww = isDoor ? 2.4 : 2, w0 = s + (cell - ww) / 2, w1 = w0 + ww;
            seg(s, w0, 0, FLOOR_H); seg(w1, s + cell, 0, FLOOR_H);
            if (isDoor) { seg(w0, w1, 3, FLOOR_H); if (axis === "x") inter.push({ type: "door", x: (w0 + w1) / 2, y, z: c + WALL_T / 2, face: 0 }); }
            else { seg(w0, w1, 0, 1); seg(w0, w1, 2.8, FLOOR_H); seg(w0, w1, 1, 2.8, glassColor, "glass", true); }
        }
    };
    for (let gx = 0; gx < GRID; gx++) for (let gz = 0; gz < GRID; gz++) {
        let cx = -CITY_HALF + gx * BLOCK + BLOCK / 2;
        let cz = -CITY_HALF + gz * BLOCK + BLOCK / 2;
        const lotX0 = -CITY_HALF + gx * BLOCK + 4, lotX1 = lotX0 + BLOCK - 8;
        const lotZ0 = -CITY_HALF + gz * BLOCK + 4, lotZ1 = lotZ0 + BLOCK - 8;
        const curbHeight = .56, walkWidth = 2.05, isCenterLot = gx === Math.floor(GRID / 2) && gz === Math.floor(GRID / 2);
        add(lotX0, 0, lotZ0, lotX1, .49, lotZ0 + walkWidth, "#85877f", "solid", true);
        add(lotX0, .49, lotZ0, lotX1, curbHeight, lotZ0 + walkWidth - .12, "#c4c0b4", "solid", true);
        if (isCenterLot) {
            const gateHalf = 2.5;
            for (const [a, b] of [[lotX0, cx - gateHalf], [cx + gateHalf, lotX1]]) if (b - a > .1) {
                add(a, 0, lotZ1 - walkWidth, b, .49, lotZ1, "#85877f", "solid", true);
                add(a, .49, lotZ1 - walkWidth + .12, b, curbHeight, lotZ1, "#c4c0b4", "solid", true);
            }
        } else {
            add(lotX0, 0, lotZ1 - walkWidth, lotX1, .49, lotZ1, "#85877f", "solid", true);
            add(lotX0, .49, lotZ1 - walkWidth + .12, lotX1, curbHeight, lotZ1, "#c4c0b4", "solid", true);
        }
        add(lotX0, 0, lotZ0 + walkWidth, lotX0 + walkWidth, .49, lotZ1 - walkWidth, "#85877f", "solid", true);
        add(lotX0, .49, lotZ0 + walkWidth, lotX0 + walkWidth - .12, curbHeight, lotZ1 - walkWidth, "#c4c0b4", "solid", true);
        add(lotX1 - walkWidth, 0, lotZ0 + walkWidth, lotX1, .49, lotZ1 - walkWidth, "#85877f", "solid", true);
        add(lotX1 - walkWidth + .12, .49, lotZ0 + walkWidth, lotX1, curbHeight, lotZ1 - walkWidth, "#c4c0b4", "solid", true);
        add(lotX0, .49, lotZ0 + walkWidth - .1, lotX1, .53, lotZ0 + walkWidth, "#747b78", "solid", false);
        add(lotX0, .49, lotZ1 - walkWidth, lotX1, .53, lotZ1 - walkWidth + .1, "#747b78", "solid", false);
        add(lotX0 + walkWidth - .1, .49, lotZ0 + walkWidth, lotX0 + walkWidth, .53, lotZ1 - walkWidth, "#747b78", "solid", false);
        add(lotX1 - walkWidth, .49, lotZ0 + walkWidth, lotX1 - walkWidth + .1, .53, lotZ1 - walkWidth, "#747b78", "solid", false);
        if (isCenterLot) {
            add(cx - 11.6, 0, cz - 11.6, cx + 11.6, .02, cz + 11.6, "#515a60", "solid", true);
            add(cx - 2.5, 0, cz + 11.45, cx + 2.5, .02, cz + 14.1, "#515a60", "solid", true);
            const paint = (x0, z0, x1, z1, color = "#e9e6dc") => add(x0, .025, z0, x1, .05, z1, color, "solid", false);
            for (const x of [-11.1, -5.65, -.2, 4.6, 11.35]) paint(cx + x, cz - 10.7, cx + x + .09, cz - 4.6);
            paint(cx - 11.1, cz - 10.7, cx + 11.35, cz - 10.61);
            paint(cx - 11.1, cz - 4.69, cx + 11.35, cz - 4.6);
            for (const [x, z, width, depth, color] of [[-5, 4.1, 9.7, 10.5, "#9ab2bc"], [5, 4.5, 8.2, 9.6, "#8ea3a8"], [-8.2, 8.3, 4.8, 5.8, "#a88f65"], [9, -2.2, 4.8, 5.4, "#6f9dbe"]]) {
                paint(cx + x - width / 2, cz + z - depth / 2, cx + x + width / 2, cz + z - depth / 2 + .08, color);
                paint(cx + x - width / 2, cz + z + depth / 2 - .08, cx + x + width / 2, cz + z + depth / 2, color);
                paint(cx + x - width / 2, cz + z - depth / 2, cx + x - width / 2 + .08, cz + z + depth / 2, color);
                paint(cx + x + width / 2 - .08, cz + z - depth / 2, cx + x + width / 2, cz + z + depth / 2, color);
            }
            for (const [x, z] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) {
                add(cx + x - .18, .02, cz + z - .18, cx + x + .18, 3.4, cz + z + .18, "#65747a", "solid", true);
                add(cx + x - .28, 3.35, cz + z - .28, cx + x + .28, 3.52, cz + z + .28, "#c5a56c", "solid", false);
            }
            add(cx - 4.8, 3.45, cz + 11.05, cx + 4.8, 4.65, cz + 11.3, "#273b46", "solid", false);
            add(cx - 4.15, 3.78, cz + 11.31, cx + 4.15, 4.3, cz + 11.34, "#dfc184", "glow", false);
            const bays = [
                { x: cx - 8.35, z: cz - 7.65, face: 0, color: "#cbd4d8", kind: "sedan" },
                { x: cx - 3.15, z: cz - 7.65, face: 0, color: "#d43a32", kind: "race" },
                { x: cx + 2.15, z: cz - 7.65, face: 0, color: "#667c4a", kind: "jeep" },
                { x: cx + 8.0, z: cz - 7.65, face: Math.PI / 2, color: "#e8c35a", kind: "bus" }
            ];
            for (const bay of bays) inter.push({ type: "car", x: bay.x, y: .12, z: bay.z, face: bay.face, color: bay.color, kind: bay.kind, parking: true });
            const plane = { id: "plane", x: cx, y: .12, z: cz + 4.2, yaw: 0 };
            const tank = { id: "tank", x: cx - 8.3, y: .12, z: cz + 8.1, yaw: 0 };
            const tesla = { id: "tesla", x: cx + 9, y: .82, z: cz - 2.2, yaw: 0 };
            parkingVehicles.push(plane, tesla);
            inter.push({ type: "airVehicle", id: "plane", x: plane.x, y: plane.y, z: plane.z, face: plane.yaw });
            inter.push({ type: "car", kind: "tank", x: tank.x, y: tank.y, z: tank.z, face: tank.yaw, color: "#526347", parking: true });
            inter.push({ type: "airVehicle", id: "tesla", x: tesla.x, y: tesla.y, z: tesla.z, face: tesla.yaw });
            inter.push({ type: "heli", x: cx + 7.5, y: .12, z: cz + 8.8, face: 0, parking: true });
            continue;
        }
        if (gx === GRID - 2 && gz === GRID - 2) {
            // A calm garden district in the new outer neighbourhood.
            // The garden is left open to the ground canvas so its paths can meander naturally.
            // Trees are grouped in loose groves instead of four identical square planters.
            const gardenGrove = [
                [-9.0, -7.2, .92], [-6.2, -9.1, .72], [-2.0, -8.7, .84],
                [7.4, -8.1, .98], [9.1, -4.3, .78],
                [-9.2, 4.2, .86], [-7.0, 8.4, .96],
                [5.7, 8.8, .82], [9.0, 6.3, .90]
            ];
            for (const [dx, dz, size] of gardenGrove) {
                trees.push({ x: cx + dx, z: cz + dz, s: size + r() * .16, turn: r() * .6 });
            }
            add(cx - 2.45, .2, cz - 2.45, cx + 2.45, .48, cz + 2.45, "#8c948e", "solid", false);
            add(cx - 2.15, .48, cz - 2.15, cx + 2.15, .58, cz + 2.15, "#c9c4b8", "solid", false);
            add(cx - 1.82, .59, cz - 1.82, cx + 1.82, .66, cz + 1.82, "#58aabd", "glow", false);
            add(cx - .34, .66, cz - .34, cx + .34, 1.55, cz + .34, "#d1b173", "solid", false);
            add(cx - .72, 1.48, cz - .72, cx + .72, 1.62, cz + .72, "#8bbbc5", "glow", false);
            for (const dx of [-8.6, 8.6]) {
                add(cx + dx - 1.15, .32, cz - .22, cx + dx + 1.15, .5, cz + .22, "#795a42", "solid", false);
                add(cx + dx - 1.15, .5, cz - .22, cx + dx + 1.15, 1.12, cz - .02, "#795a42", "solid", false);
            }
            lamps.push({ x: cx - 10.2, z: cz - 10.2 }, { x: cx + 10.2, z: cz + 10.2 });
            continue;
        }
        if (gx === 1 && gz === 1) {
            // A dedicated recreation square with rubber safety surfacing and accessible clear paths.
            // Keep the play area on the shared terrain layer; the ground map paints
            // soft, curved safety zones and connecting footpaths underneath the equipment.

            // Swing set: graphite frame, gold joints, two hanging seats.
            for (const dx of [-2.8, 2.8]) {
                add(cx + dx - .09, .18, cz + 2.7, cx + dx + .09, 3.15, cz + 2.9, "#34434b", "solid", false);
                add(cx + dx - .09, .18, cz + 4.7, cx + dx + .09, 3.15, cz + 4.9, "#34434b", "solid", false);
                add(cx + dx - .16, 3.0, cz + 2.7, cx + dx + .16, 3.18, cz + 4.9, "#c6a66a", "solid", false);
            }
            add(cx - 2.95, 3.0, cz + 2.65, cx + 2.95, 3.2, cz + 4.95, "#34434b", "solid", false);
            for (const dx of [-1, 1]) {
                add(cx + dx - .025, .9, cz + 3.05, cx + dx + .025, 2.95, cz + 3.1, "#9ca9ad", "animatedSwingChain", false);
                add(cx + dx - .025, .9, cz + 4.55, cx + dx + .025, 2.95, cz + 4.6, "#9ca9ad", "animatedSwingChain", false);
                add(cx + dx - .55, .78, cz + 3.0, cx + dx + .55, .95, cz + 4.68, "#d0a74e", "animatedSwingSeat", false);
                inter.push({ type: "swing", x: cx + dx, y: .82, z: cz + 3.85, face: Math.PI });
            }

            // Slide tower, ladder and a stepped glossy chute.
            add(cx + 4.1, .18, cz - 2.2, cx + 5.9, 1.85, cz - 1.95, "#3c5962", "solid", false);
            add(cx + 4.1, .18, cz - .25, cx + 5.9, 1.85, cz, "#3c5962", "solid", false);
            add(cx + 4.0, 1.72, cz - 2.25, cx + 6.0, 1.9, cz + .15, "#d1ad62", "solid", false);
            inter.push({ type: "slide", x: cx + 5, y: .8, z: cz - 1.8, endZ: cz + 2.15 });
            for (let step = 0; step < 6; step++) {
                const zz = cz - 2.0 + step * .72, yy = 1.52 - step * .22;
                add(cx + 4.35, yy, zz, cx + 5.65, yy + .12, zz + .83, "#d9774d", "solid", false);
            }
            for (let step = 0; step < 5; step++) {
                const zz = cz - 3.0 + step * .48, yy = .35 + step * .27;
                add(cx + 6.4, yy, zz, cx + 6.55, yy + .12, zz + .42, "#c7c5bd", "solid", false);
            }
            add(cx + 6.25, .2, cz - 3.1, cx + 6.45, 1.75, cz - 2.95, "#34434b", "solid", false);
            add(cx + 6.85, .2, cz - 3.1, cx + 7.05, 1.75, cz - 2.95, "#34434b", "solid", false);

            // Climbing frame with colored crossbars.
            for (const dx of [-5.8, -2.8]) for (const dz of [-5.4, -2.4])
                add(cx + dx - .09, .18, cz + dz - .09, cx + dx + .09, 2.65, cz + dz + .09, "#52656a", "solid", false);
            for (let i = 0; i < 5; i++) {
                const xx = cx - 5.8 + i * .75;
                add(xx, 2.48, cz - 5.5, xx + .12, 2.62, cz - 2.25, i % 2 ? "#caa65c" : "#7097a0", "solid", false);
            }

            // Sandpit and low play mound.
            add(cx - 1.7, .18, cz - 1.1, cx + 1.7, .33, cz + 2.2, "#a77f50", "solid", false);
            add(cx - 1.45, .33, cz - .85, cx + 1.45, .39, cz + 1.95, "#dfc58c", "solid", false);
            add(cx - 1.1, .18, cz + 6.0, cx + 1.1, .65, cz + 6.5, "#78975b", "solid", false);
            add(cx - .85, .65, cz + 6.15, cx + .85, 1.0, cz + 6.35, "#c5a55e", "solid", false);

            // Park benches, planted edges, and decorative street trees.
            for (const bx of [-8.5, 8.5]) {
                add(cx + bx - 1.1, .55, cz - 10.5, cx + bx + 1.1, .72, cz - 10.2, "#76523d", "solid", false);
                add(cx + bx - 1.1, .72, cz - 10.5, cx + bx + 1.1, 1.25, cz - 10.3, "#76523d", "solid", false);
            }
            // Leave the northern park edge open for two smooth, climbable landscape mounds.
            for (const [dx, dz, size] of [
                [-9.5, 8.7, .82], [-7.4, -8.5, .74], [-1.0, -10.0, .68],
                [8.8, -8.2, .76], [10.0, 1.3, .84], [6.8, 9.2, .78]
            ]) trees.push({ x: cx + dx, z: cz + dz, s: size + r() * .16, turn: r() * .5 });
            lamps.push({ x: cx - 10.5, z: cz - 10.5 }, { x: cx + 10.5, z: cz + 10.5 });

            // Bus stops on opposite sides of the recreation square.
            const busStop = (sx, sz) => {
                add(sx - 2.8, .02, sz - .95, sx + 2.8, .18, sz + .95, "#b9b1a1", "solid", false);
                add(sx - 2.55, .18, sz - .78, sx + 2.55, .25, sz + .78, "#344149", "solid", false);
                for (const dx of [-2.35, 2.35]) for (const dz of [-.68, .68])
                    add(sx + dx - .055, .22, sz + dz - .055, sx + dx + .055, 2.35, sz + dz + .055, "#b99a62", "solid", false);
                add(sx - 2.45, 2.28, sz - .82, sx + 2.45, 2.48, sz + .82, "#35444b", "solid", false);
                add(sx - 2.25, .35, sz - .76, sx + 2.25, 1.95, sz - .7, "#8fb7c0", "glass", false);
                add(sx - 1.55, .55, sz + .2, sx + 1.35, .72, sz + .58, "#805b3c", "solid", false);
                add(sx - 1.55, .72, sz + .43, sx + 1.35, 1.18, sz + .58, "#805b3c", "solid", false);
                add(sx + 1.75, 1.0, sz + .82, sx + 2.05, 2.75, sz + 1.0, "#46555b", "solid", false);
                add(sx + 1.58, 2.35, sz + .78, sx + 2.2, 2.85, sz + 1.04, "#d5b36b", "glow", false);
                add(sx + 1.67, 2.42, sz + .75, sx + 2.12, 2.78, sz + .78, "#eaf5ed", "glow", false);
            };
            busStop(cx - 5.5, cz - 15.0);
            busStop(cx + 5.5, cz + 15.0);
            continue;
        }
        if (gx === 2 && gz === 7) { addLandmarkLot("mall", cx, cz); continue; }
        if (gx === 8 && gz === 2) { addLandmarkLot("sports", cx, cz); continue; }
        if (gx === 7 && gz === 8) { addLandmarkLot("amusement", cx, cz); continue; }
        // Small public places break up the repeating blocks and give pedestrians somewhere to gather.
        if ((gx === 4 && gz === 3) || (gx === 7 && gz === 6)) {
            const marketSquare = gx === 4;
            // The shared ground surface below gives this place an organic stone-and-green layout.
            if (marketSquare) {
                // Market stalls, striped awnings, café tables and benches.
                for (let stall = 0; stall < 3; stall++) {
                    const sx = cx - 6.4 + stall * 6.4, sz = cz - 5.9;
                    const stallColor = ["#a75b42", "#668b86", "#c0964f"][stall];
                    add(sx - 2.05, .18, sz - .7, sx + 2.05, 1.15, sz + .7, "#806044", "solid", false);
                    add(sx - 2.2, 2.28, sz - .95, sx + 2.2, 2.42, sz + .95, stallColor, "solid", false);
                    for (let stripe = 0; stripe < 6; stripe++) {
                        const ax = sx - 2.1 + stripe * .7;
                        add(ax, 2.42, sz - .93, ax + .35, 2.47, sz + .93, stripe % 2 ? "#eee5d5" : stallColor, "solid", false);
                    }
                    for (const side of [-1, 1]) add(sx + side * 1.9, .18, sz - .83, sx + side * 1.98, 2.3, sz - .75, "#526267", "solid", false);
                }
                for (const tx of [-5.6, 0, 5.6]) {
                    add(cx + tx - .68, .18, cz + 5.4, cx + tx + .68, .94, cz + 6.75, "#79583e", "solid", false);
                    add(cx + tx - .68, .82, cz + 5.25, cx + tx + .68, .96, cz + 6.9, "#bca77d", "solid", false);
                    for (const side of [-1, 1]) {
                        add(cx + tx + side * 1.0 - .17, .18, cz + 5.55, cx + tx + side * 1.0 + .17, .7, cz + 5.9, "#596b72", "solid", false);
                    }
                }
                for (const side of [-1, 1]) {
                    add(cx + side * 8.7 - 1.1, .18, cz + 7.9, cx + side * 8.7 + 1.1, .34, cz + 8.25, "#76583e", "solid", false);
                    add(cx + side * 8.7 - 1.1, .34, cz + 7.9, cx + side * 8.7 + 1.1, 1.0, cz + 8.08, "#76583e", "solid", false);
                }
            } else {
                // A quieter courtyard with a shallow fountain, planting beds and shaded seating.
                add(cx - 3.0, .18, cz - 3.0, cx + 3.0, .44, cz + 3.0, "#8c9690", "solid", false);
                add(cx - 2.55, .44, cz - 2.55, cx + 2.55, .58, cz + 2.55, "#d2cabc", "solid", false);
                add(cx - 2.08, .58, cz - 2.08, cx + 2.08, .66, cz + 2.08, "#4e9ca8", "glow", false);
                add(cx - .3, .66, cz - .3, cx + .3, 1.35, cz + .3, "#bfa16a", "solid", false);
                add(cx - .68, 1.3, cz - .68, cx + .68, 1.42, cz + .68, "#7db6bd", "glow", false);
                for (const side of [-1, 1]) {
                    add(cx + side * 7.3 - 1.4, .18, cz - 7.9, cx + side * 7.3 + 1.4, .62, cz - 5.8, "#8e9a88", "solid", false);
                    add(cx + side * 7.3 - 1.16, .62, cz - 7.65, cx + side * 7.3 + 1.16, 1.1, cz - 6.02, "#567c52", "solid", false);
                    add(cx + side * 7.3 - 1.4, .18, cz + 5.8, cx + side * 7.3 + 1.4, .62, cz + 7.9, "#8e9a88", "solid", false);
                    add(cx + side * 7.3 - 1.16, .62, cz + 6.02, cx + side * 7.3 + 1.16, 1.1, cz + 7.65, "#567c52", "solid", false);
                }
                for (const bx of [-6.4, 6.4]) {
                    add(cx + bx - 1.05, .48, cz - 4.4, cx + bx + 1.05, .65, cz - 4.1, "#76563c", "solid", false);
                    add(cx + bx - 1.05, .65, cz - 4.4, cx + bx + 1.05, 1.12, cz - 4.23, "#76563c", "solid", false);
                    add(cx + bx - 1.05, .48, cz + 4.1, cx + bx + 1.05, .65, cz + 4.4, "#76563c", "solid", false);
                    add(cx + bx - 1.05, .65, cz + 4.23, cx + bx + 1.05, 1.12, cz + 4.4, "#76563c", "solid", false);
                }
            }
            const plazaTrees = marketSquare
                ? [[-9.6, -8.2, .82], [9.4, -8.6, .78], [-10.0, 5.8, .88], [9.2, 8.4, .82], [-4.8, 9.8, .7]]
                : [[-9.2, -8.7, .84], [9.6, -8.2, .8], [-10.0, 4.8, .88], [9.3, 8.2, .82], [0, 10.0, .72]];
            for (const [dx, dz, size] of plazaTrees) {
                trees.push({ x: cx + dx, z: cz + dz, s: size + r() * .14, turn: r() * .55 });
            }
            lamps.push({ x: cx - 10, z: cz }, { x: cx + 10, z: cz }, { x: cx, z: cz - 10 }, { x: cx, z: cz + 10 });
            continue;
        }
        const outerHomes =
            (gx === 0 && [2, 4, 6, 8].includes(gz)) ||
            (gx === GRID - 1 && [2, 4, 6, 8].includes(gz)) ||
            (gz === 0 && [2, 4, 6, 8].includes(gx)) ||
            (gz === GRID - 1 && [2, 4, 6, 8].includes(gx));
        if (outerHomes) {
            add(cx - 12.2, 0, cz - 12.2, cx + 12.2, .07, cz + 12.2, "#7e9367", "solid", false);
            for (let home = 0; home < 2; home++) {
                const style = ["cottage", "villa", "house"][(gx * 3 + gz * 5 + home) % 3];
                addHome(cx + (home === 0 ? -5.15 : 5.15), cz + 1.3, style, homes.length, lotX0, lotZ0);
            }
            add(cx - 10.5, .08, cz - 10.8, cx + 10.5, .13, cz - 10.35, "#c8c3b4", "solid", false);
            continue;
        }
        // A taller, tighter downtown transitions into smaller mixed-use neighbourhoods.
        const centrality = Math.abs(gx - Math.floor(GRID / 2)) + Math.abs(gz - Math.floor(GRID / 2));
        const cityCore = centrality <= 4;
        cx += (r() - .5) * (cityCore ? 2.0 : 4.6);
        cz += (r() - .5) * (cityCore ? 2.0 : 4.6);
        const W = (cityCore ? 15.5 : 12.5) + Math.floor(r() * 6) * 1.15;
        const D = (cityCore ? 14.5 : 12.5) + Math.floor(r() * 6) * 1.05;
        const nFloors = cityCore ? 4 + Math.floor(r() * 5) : 2 + Math.floor(r() * 5);
        const x0 = cx - W / 2, x1 = cx + W / 2, z0 = cz - D / 2, z1 = cz + D / 2;
        const facade = FACADES[Math.floor(r() * FACADES.length)], glass = r() > .5 ? "#83aab9" : "#9bbdb6";
        const floors = [{ theme: "lobby", label: "לובי" }], pool = [...THEMES].sort(() => r() - .5);
        for (let f = 1; f < nFloors; f++) floors.push(pool[(f - 1) % pool.length]);
        const id = buildings.length;
        const sx0 = x0 + WALL_T, sx1 = sx0 + 4, sz1 = z1 - WALL_T, sz0 = sz1 - 6, t = WALL_T;
        const basementStairwell = { x0: sx0, x1: sx1, z0: sz0, z1: sz1 };
        const basementEntry = { x: sx0 + 1.05, y: .15, z: sz0 + .28 };
        // Place the lower exit right at the end of the final tread, clear of the next step.
        const basementExit = { x: sx0 + 3.05, y: -4, z: sz0 + .08 };
        const buildingName = NAMES[id % NAMES.length] + (id >= NAMES.length ? " " + (Math.floor(id / NAMES.length) + 1) : "");
        const elevatorId = elevators.length, elevatorX = x1 - 1.65, elevatorZ = z0 + 4.15;
        const elevatorLayout = { id: elevatorId, buildingId: id, buildingName, x: elevatorX, z: elevatorZ, doorX: elevatorX - 1.35, approachX: elevatorX - 2.2, floors: nFloors + 1, basement: true };
        elevators.push(elevatorLayout);
        buildings.push({ id, gridX: gx, gridZ: gz, name: buildingName, x0, z0, x1, z1, floors, basementStairwell, basementFloor: -1, elevatorId });
        inter.push({ type: "basement", x: basementEntry.x, y: basementEntry.y, z: basementEntry.z, buildingId: id, toX: basementExit.x, toY: basementExit.y, toZ: basementExit.z });
        inter.push({ type: "basementExit", x: basementExit.x, y: basementExit.y, z: basementExit.z, buildingId: id, toX: basementEntry.x, toY: basementEntry.y, toZ: basementEntry.z });
        inter.push({ type: "elevator", elevatorId, x: elevatorLayout.approachX, y: -FLOOR_H, z: elevatorZ, face: Math.PI / 2, floor: -1 });
        for (let ef = 0; ef <= nFloors; ef++) inter.push({ type: "elevator", elevatorId, x: elevatorLayout.approachX, y: ef * FLOOR_H, z: elevatorZ, face: Math.PI / 2, floor: ef });
        add(x0 - .3, 0, z0 - .3, x1 + .3, .12, sz0, "#9a948a");
        add(x0 - .3, 0, sz0, sx0, .12, sz1, "#9a948a");
        add(sx1, 0, sz0, x1 + .3, .12, sz1, "#9a948a");
        add(x0 - .3, 0, sz1, x1 + .3, .12, z1 + .3, "#9a948a");

        const basementBottom = -4.24, basementFloorY = -4, basementWallTop = -.06;
        {
            const liftX = elevatorLayout.x, liftZ = elevatorLayout.z, hx = 1.42, hz = 1.42;
            const fx0 = x0 + t, fx1 = x1 - t, fz0 = z0 + t, fz1 = z1 - t;
            const shaftX0 = liftX - hx, shaftX1 = Math.min(fx1, liftX + hx), shaftZ0 = liftZ - hz, shaftZ1 = liftZ + hz;
            add(fx0, basementBottom, fz0, shaftX0, basementFloorY, fz1, "#595c5a", "solid", true, false, { basementGround: true });
            add(shaftX1, basementBottom, fz0, fx1, basementFloorY, fz1, "#595c5a", "solid", true, false, { basementGround: true });
            add(shaftX0, basementBottom, fz0, shaftX1, basementFloorY, shaftZ0, "#595c5a", "solid", true, false, { basementGround: true });
            add(shaftX0, basementBottom, shaftZ1, shaftX1, basementFloorY, fz1, "#595c5a", "solid", true, false, { basementGround: true });
        }
        add(x0, basementBottom, z0, x1, basementWallTop, z0 + t, "#77756e", "solid", true);
        add(x0, basementBottom, z1 - t, x1, basementWallTop, z1, "#77756e", "solid", true);
        add(x0, basementBottom, z0 + t, x0 + t, basementWallTop, z1 - t, "#77756e", "solid", true);
        add(x1 - t, basementBottom, z0 + t, x1, basementWallTop, z1 - t, "#77756e", "solid", true);

        const stairCol = "#a9a59a";
        for (let i = 0; i < 8; i++) {
            const top = -.25 * (i + 1);
            add(sx0, top - .5, sz0 + i * .5, sx0 + 2, top, sz0 + (i + 1) * .5, i % 2 ? stairCol : shade(stairCol, -.055), "solid", true, false, { basementGround: true });
        }
        add(sx0, -2.5, sz0 + 4, sx1, -2, sz1, "#aaa69b", "solid", true, false, { basementGround: true });
        for (let i = 0; i < 8; i++) {
            const top = -2 - .25 * (i + 1);
            add(sx0 + 2, top - .5, sz0 + 4 - (i + 1) * .5, sx1, top, sz0 + 4 - i * .5, i % 2 ? stairCol : shade(stairCol, -.055), "solid", true, false, { basementGround: true });
        }
        for (let i = 0; i <= 8; i++) {
            const z = sz0 + i * .5, y = -.12 - i * .25;
            add(sx0 + .12, y - .08, z - .035, sx0 + .2, y + .18, z + .035, "#5f6665", "solid", false);
            add(sx1 - .2, y - .08, z - .035, sx1 - .12, y + .18, z + .035, "#5f6665", "solid", false);
        }

        const shelfZ = z0 + .75;
        for (let shelf = 0; shelf < 2; shelf++) {
            const sx = x0 + 5.3 + shelf * 3.7;
            for (const dx of [-.85, .85]) add(sx + dx - .045, -3.95, shelfZ - .045, sx + dx + .045, -.55, shelfZ + .045, "#47565b", "solid", false);
            for (let level = 0; level < 4; level++) {
                const yy = -3.45 + level * .82;
                add(sx - .95, yy, shelfZ - .35, sx + .95, yy + .1, shelfZ + .35, "#98754c", "solid", false);
                if (level < 3) {
                    add(sx - .72, yy + .1, shelfZ - .24, sx - .12, yy + .63, shelfZ + .24, level % 2 ? "#687c83" : "#8a7760", "solid", false);
                    add(sx + .12, yy + .1, shelfZ - .24, sx + .72, yy + .58, shelfZ + .24, level % 2 ? "#9b875f" : "#566a70", "solid", false);
                }
            }
        }
        for (let crate = 0; crate < 5; crate++) {
            const xx = x0 + 5.2 + (crate % 3) * 2.25, zz = z1 - 1.6 - Math.floor(crate / 3) * 1.35, yy = -3.52 + (crate % 2) * .05;
            add(xx - .42, -4, zz - .42, xx + .42, yy + .52, zz + .42, crate % 2 ? "#826744" : "#68777a", "solid", false);
            add(xx - .43, yy + .36, zz - .44, xx + .43, yy + .42, zz + .44, "#b2915f", "solid", false);
        }
        add((x0 + x1) / 2 - 1.4, -.38, (z0 + z1) / 2, (x0 + x1) / 2 + 1.4, -.29, (z0 + z1) / 2 + .14, "#ffe2a5", "glow", false);
        add(sx1 + .25, -1.12, sz0 + 4.6, sx1 + .36, -.55, sz0 + 5.7, "#293c46", "solid", false);
        add(sx1 + .18, -1.2, sz0 + 4.5, sx1 + .43, -1.08, sz0 + 5.8, "#d0ad70", "glow", false);
        {
            const ex = elevatorLayout.x, ez = elevatorLayout.z;
            const shaftTop = nFloors * FLOOR_H + .25, shaftBottom = basementBottom;
            add(ex + 1.28, shaftBottom, ez - 1.42, ex + 1.42, shaftTop, ez + 1.42, "#9bb8c4", "glass", true);
            add(ex - 1.42, shaftBottom, ez - 1.42, ex + 1.42, shaftTop, ez - 1.28, "#9bb8c4", "glass", true);
            add(ex - 1.42, shaftBottom, ez + 1.28, ex + 1.42, shaftTop, ez + 1.42, "#9bb8c4", "glass", true);
        }
        for (let f = 0; f <= nFloors; f++) {
            const y = f * FLOOR_H, th = f === 0 ? null : THEMES.find(q => q.theme === floors[f]?.theme), floorCol = f === 0 ? "#d8d0c0" : f === nFloors ? "#8c8a86" : th?.floor ?? "#ccc", sy = f === 0 ? .12 : y, sb = f === 0 ? 0 : y - .25;
            if (f === 0) {
                {
                    const ex0 = x1 - 3, ex1 = x1 - .3, ez0 = z0 + 2.8, ez1 = z0 + 5.5;
                    add(x0 + t, .12, z0 + t, x1 - t, .15, ez0, floorCol);
                    add(x0 + t, .12, ez0, ex0, .15, ez1, floorCol);
                    add(ex1, .12, ez0, x1 - t, .15, ez1, floorCol);
                    add(x0 + t, .12, ez1, x1 - t, .15, sz0, floorCol);
                    add(x0 + t, .12, sz0, sx0, .15, sz1, floorCol);
                    add(sx1, .12, sz0, x1 - t, .15, sz1, floorCol);
                    add(x0 + t, .12, sz1, x1 - t, .15, z1 - t, floorCol);
                }
            } else {
                {
                    // Keep the stairwell and the lift shaft open on every upper floor.
                    const ex0 = x1 - 3, ex1 = x1 - .3, ez0 = z0 + 2.8, ez1 = z0 + 5.5;
                    add(x0, sb, z0, x1, sy, ez0, floorCol);
                    add(x0, sb, ez0, ex0, sy, ez1, floorCol);
                    add(ex1, sb, ez0, x1, sy, ez1, floorCol);
                    add(x0, sb, ez1, x1, sy, sz0, floorCol);
                    add(x0, sb, sz0, sx0, sy, sz1, floorCol);
                    add(sx1, sb, sz0, x1, sy, sz1, floorCol);
                    add(x0, sb, sz1, x1, sy, z1, floorCol);
                }
                const lx = (sx1 + x1) / 2, lz = (z0 + z1) / 2;
                add(lx - 1.5, sb - .06, lz - .3, lx + 1.5, sb, lz + .3, "#fff6dc", "glow", false);
                add(lx - 1.5, sb - .06, z0 + 1.7, lx + 1.5, sb, z0 + 2.3, "#fff6dc", "glow", false);
            }
            if (f === nFloors) {
                add(x0, y, z0, x1, y + 1.1, z0 + .25, facade); add(x0, y, z1 - .25, x1, y + 1.1, z1, facade);
                add(x0, y, z0, x0 + .25, y + 1.1, z1, facade); add(x1 - .25, y, z0, x1, y + 1.1, z1, facade);
                add(sx1, y, sz0, sx1 + .1, y + 1.1, sz1, "#555");
                const roofKind = roofDecor(add, inter, r, sx1 + 1, x1 - 1, z0 + 1, z1 - 1, y);
                if (roofKind !== 0) addRooftopHelicopter((x0 + x1) / 2, y + .06, (z0 + z1) / 2, .68, 6.2);
                break;
            }
            wall("x", x0, x1, z0 + t / 2, y, facade, f === 0, glass);
            wall("x", x0, x1, z1 - t / 2, y, facade, false, glass);
            wall("z", z0 + t, z1 - t, x0 + t / 2, y, facade, false, glass);
            wall("z", z0 + t, z1 - t, x1 - t / 2, y, facade, false, glass);
            // The former full-width ceiling slab overlapped the next floor slab and caused z-fighting.
            const stairCol = "#b8b2a6";
            for (let i = 0; i < 8; i++) { const top = y + .25 * (i + 1); add(sx0, top - .5, sz0 + i * .5, sx0 + 2, top, sz0 + (i + 1) * .5, i % 2 ? stairCol : shade(stairCol, -.06)); }
            add(sx0, y + 1.5, sz0 + 4, sx1, y + 2, sz1, stairCol);
            for (let i = 0; i < 8; i++) { const top = y + 2 + .25 * (i + 1); add(sx0 + 2, top - .5, sz0 + 4 - (i + 1) * .5, sx1, top, sz0 + 4 - i * .5, i % 2 ? stairCol : shade(stairCol, -.06)); }
            add(sx0 + 1.95, y + .6, sz0, sx0 + 2.05, y + FLOOR_H - .3, sz0 + 4, "#6b6258");
            add(sx1, y + 1, sz0, sx1 + .12, y + FLOOR_H + 1, sz1, "#6b6258");
            add(sx1 - .02, y + FLOOR_H + .9, sz0, sx1 + .14, y + FLOOR_H + 1.05, sz1, "#d9b26a", "solid", false);
            furnish(add, inter, r, floors[f].theme, sx1 + .6, x1 - 3.5, z0 + t + .4, z1 - t - .4, y + (f === 0 ? .15 : 0), f === 0);
        }
        // Street-level shops give the blocks a lived-in, mixed-use frontage.
        const shopPalette = ["#b46b49", "#c89b52", "#668b88", "#8d6b56", "#5c7892", "#9a7650"];
        const storefrontCount = cityCore ? (W > 18 ? 2 : 1) : ((gx * 5 + gz * 3) % 4 === 0 ? 0 : (W > 17.5 ? 2 : 1));
        const shopSides = storefrontCount === 2 ? [-1, 1] : storefrontCount === 1 ? [((gx + gz) % 2 === 0 ? -1 : 1)] : [];
        shopSides.forEach((side, shop) => {
            const shopX = cx + side * W * .30, shopWidth = Math.min(3.5, W * .22);
            const accent = shopPalette[(gx * 3 + gz * 5 + shop) % shopPalette.length];
            add(shopX - shopWidth / 2, .82, z0 - .31, shopX + shopWidth / 2, 2.38, z0 - .2, "#83aab9", "glass", false);
            add(shopX - shopWidth / 2 - .12, 2.62, z0 - .43, shopX + shopWidth / 2 + .12, 3.22, z0 - .22, accent, "solid", false);
            add(shopX - shopWidth / 2 - .2, 2.36, z0 - 1.02, shopX + shopWidth / 2 + .2, 2.54, z0 - .24, shade(accent, -.12), "solid", false);
            for (let stripe = 0; stripe < 5; stripe++) {
                const stripeX = shopX - shopWidth / 2 + stripe * shopWidth / 5;
                add(stripeX, 2.535, z0 - .99, stripeX + shopWidth / 10, 2.565, z0 - .26, stripe % 2 ? "#eee4d2" : accent, "solid", false);
            }
            for (const support of [-1, 1]) {
                const postX = shopX + support * (shopWidth / 2 + .04);
                add(postX - .045, .48, z0 - .79, postX + .045, 2.42, z0 - .7, "#4e5c60", "solid", false);
            }
            add(shopX - shopWidth / 2 + .18, 2.49, z0 - 1.045, shopX + shopWidth / 2 - .18, 2.55, z0 - 1.01, "#f3d58a", "glow", false);
        });

        // Matching stone planters and low greenery frame the main entrances.
        for (const side of [-1, 1]) {
            const planterX = cx + side * (W / 2 - .85), planterZ = z0 - 1.55;
            add(planterX - .58, .06, planterZ - .55, planterX + .58, .48, planterZ + .55, "#858d87", "solid", false);
            add(planterX - .48, .48, planterZ - .45, planterX + .48, .78, planterZ + .45, "#55784f", "solid", false);
            add(planterX - .34, .78, planterZ - .31, planterX + .34, 1.04, planterZ + .31, "#6f935a", "solid", false);
        }

        // Benches and bins appear in the side forecourts rather than blocking the doors.
        if (W < 19 && (gx * 3 + gz * 7) % 3 === 0) {
            const benchSide = (gx + gz) % 2 === 0 ? -1 : 1;
            const benchX = cx + benchSide * (W / 2 + 1.05), benchZ = cz + (gz % 2 === 0 ? -3.1 : 3.1);
            add(benchX - .24, .48, benchZ - 1.05, benchX + .24, .64, benchZ + 1.05, "#79583d", "solid", false);
            add(benchX - .24, .64, benchZ - 1.05, benchX + .24, 1.08, benchZ - .88, "#79583d", "solid", false);
            const binX = cx - benchSide * (W / 2 + 1.1), binZ = cz - (gz % 2 === 0 ? -3.1 : 3.1);
            add(binX - .28, .08, binZ - .28, binX + .28, .82, binZ + .28, "#53666a", "solid", false);
            add(binX - .3, .82, binZ - .3, binX + .3, .91, binZ + .3, "#a8b0aa", "solid", false);
        }

        // Street trees line selected block edges, with varied spacing and canopy sizes.
        const treeSide = r() > .5 ? 1 : -1;
        trees.push({
            x: cx + treeSide * (W / 2 + 1.8),
            z: cz + (r() - .5) * Math.min(10, D * .7),
            s: .58 + r() * .24
        });
        if ((gx + gz) % 2 === 0) trees.push({
            x: cx - treeSide * (W / 2 + 1.8),
            z: cz + (r() - .5) * Math.min(10, D * .7),
            s: .55 + r() * .25
        });
        if (r() > .38) {
            const px = cx + (r() > .5 ? 1 : -1) * (10.8 + r() * 1.4), pz = cz + (r() - .5) * 17;
            add(px - .72, 0, pz - .72, px + .72, .48, pz + .72, "#927a5c", "solid", false);
            add(px - .61, .48, pz - .61, px + .61, 1.24, pz + .61, "#4f7c4d", "solid", false);
        }
        lamps.push({ x: cx - BLOCK / 2 + 3, z: cz - BLOCK / 2 + 3 }, { x: cx + BLOCK / 2 - 3, z: cz + BLOCK / 2 - 3 });
    }
    // A landscaped median turns the central north-south street into a recognisable boulevard.
    const boulevardX = -CITY_HALF + Math.floor(GRID / 2) * BLOCK;
    for (let segment = 0; segment < GRID; segment++) {
        const middleZ = -CITY_HALF + segment * BLOCK + BLOCK / 2;
        add(boulevardX - .68, .02, middleZ - 5.25, boulevardX + .68, .2, middleZ + 5.25, "#788764", "solid", false);
        add(boulevardX - .74, .02, middleZ - 5.25, boulevardX - .62, .25, middleZ + 5.25, "#b8b3a0", "solid", false);
        add(boulevardX + .62, .02, middleZ - 5.25, boulevardX + .74, .25, middleZ + 5.25, "#b8b3a0", "solid", false);
        for (const shrubZ of [-3.55, 0, 3.55]) {
            add(boulevardX - .42, .2, middleZ + shrubZ - .55, boulevardX + .42, .72, middleZ + shrubZ + .55, shrubZ === 0 ? "#52784d" : "#668653", "solid", false);
        }
    }
    // Two local streets gently meander between the existing intersections.
    // Their small offsets keep the full two-way carriageway inside the original road width.
    const curvedRoads = [
        { id: 0, axis: "x", base: 18, start: -72, end: 72, amplitude: 1.08, phase: 0 },
        { id: 1, axis: "x", base: -54, start: -108, end: 108, amplitude: .92, phase: Math.PI * .5 }
    ].map((road) => ({
        ...road,
        path: Array.from({ length: 49 }, (_, index) => {
            const t = index / 48;
            const x = road.start + (road.end - road.start) * t;
            const envelope = Math.sin(Math.PI * t);
            const offset = road.amplitude * Math.sin(Math.PI * 2 * t + road.phase) * envelope;
            return { x, z: road.base + offset };
        })
    }));

    // A four-stop orbital bus route follows the main road network around downtown.
    const busStopLayout = [
        { id: 0, x: 0, z: -84.8, roadX: 0, roadZ: -92.2, axis: "x", name: "תחנת השדרה הצפונית" },
        { id: 1, x: 84.8, z: 0, roadX: 92.2, roadZ: 0, axis: "z", name: "תחנת המזרח" },
        { id: 2, x: 0, z: 84.8, roadX: 0, roadZ: 92.2, axis: "x", name: "תחנת השדרה הדרומית" },
        { id: 3, x: -84.8, z: 0, roadX: -92.2, roadZ: 0, axis: "z", name: "תחנת המערב" }
    ];
    for (const stop of busStopLayout) {
        busStops.push(stop);
        const halfX = stop.axis === "x" ? 2.35 : 1.05;
        const halfZ = stop.axis === "x" ? 1.05 : 2.35;
        add(stop.x - halfX - .28, .025, stop.z - halfZ - .28, stop.x + halfX + .28, .16, stop.z + halfZ + .28, "#b8b1a0", "solid", false);
        add(stop.x - halfX, 2.45, stop.z - halfZ, stop.x + halfX, 2.62, stop.z + halfZ, "#3c5159", "solid", false);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
            add(stop.x + sx * (halfX - .12) - .055, .16, stop.z + sz * (halfZ - .12) - .055, stop.x + sx * (halfX - .12) + .055, 2.48, stop.z + sz * (halfZ - .12) + .055, "#bba06c", "solid", false);
        }
        add(stop.x - halfX + .24, .48, stop.z - halfZ + .18, stop.x + halfX - .24, .64, stop.z + halfZ - .18, "#76563d", "solid", false);
        add(stop.x - halfX + .24, .64, stop.z - halfZ + .18, stop.x + halfX - .24, 1.05, stop.z - halfZ + .34, "#76563d", "solid", false);
        const signX = stop.x + halfX + .52, signZ = stop.axis === "x" ? stop.z : stop.z - halfZ - .25;
        add(signX - .08, .16, signZ - .08, signX + .08, 2.65, signZ + .08, "#46565b", "solid", false);
        add(signX - .42, 2.25, signZ - .1, signX + .42, 2.92, signZ + .1, "#2d7188", "solid", false);
        add(signX - .31, 2.42, signZ - .115, signX + .31, 2.73, signZ - .09, "#f3d78d", "glow", false);
    }

    const busPath = [{ x: -70, z: -92.2 }];
    const busLineTo = (x, z, stopId = null) => {
        const from = busPath[busPath.length - 1], distance = Math.hypot(x - from.x, z - from.z);
        const steps = Math.max(1, Math.ceil(distance / 6));
        for (let step = 1; step <= steps; step++) {
            const t = step / steps, point = { x: from.x + (x - from.x) * t, z: from.z + (z - from.z) * t };
            if (step === steps && stopId !== null) point.stopId = stopId;
            busPath.push(point);
        }
    };
    const busArcTo = (cx, cz, radius, fromAngle, toAngle) => {
        const steps = 9;
        for (let step = 1; step <= steps; step++) {
            const angle = fromAngle + (toAngle - fromAngle) * step / steps;
            busPath.push({ x: cx + Math.cos(angle) * radius, z: cz + Math.sin(angle) * radius });
        }
    };
    busLineTo(0, -92.2, 0);
    busLineTo(80, -92.2);
    busArcTo(80, -80, 12.2, -Math.PI / 2, 0);
    busLineTo(92.2, 0, 1);
    busLineTo(92.2, 80);
    busArcTo(80, 80, 12.2, 0, Math.PI / 2);
    busLineTo(0, 92.2, 2);
    busLineTo(-80, 92.2);
    busArcTo(-80, 80, 12.2, Math.PI / 2, Math.PI);
    busLineTo(-92.2, 0, 3);
    busLineTo(-92.2, -80);
    busArcTo(-80, -80, 12.2, Math.PI, Math.PI * 1.5);
    busLineTo(-70, -92.2);
    const busRoutes = [{ id: 0, name: "קו הטבעת העירוני", path: busPath, stopIds: busStopLayout.map((stop) => stop.id) }];
    inter.push({
        type: "car", x: -70, y: .12, z: -92.2, face: Math.PI / 2,
        color: "#277c98", kind: "bus", vehicleId: "city-loop-bus",
        npcControlled: true, busRouteId: 0, passengerCount: 3
    });

    // Painted zebra crossings align with the sidewalk-to-sidewalk routes used by pedestrians.
    const addZebraCrossing = (axis, cx, cz) => {
        const id = crosswalks.length;
        for (let stripe = 0; stripe < 6; stripe++) {
            const offset = -2.95 + stripe * 1.18;
            if (axis === "x") {
                add(cx + offset - .25, .026, cz - 1.72, cx + offset + .25, .052, cz + 1.72, "#f2f0e7", "roadMarking", false, true);
            } else {
                add(cx - 1.72, .026, cz + offset - .25, cx + 1.72, .052, cz + offset + .25, "#f2f0e7", "roadMarking", false, true);
            }
        }
        // Tactile warning tiles mark both curb edges with a warm, matte ceramic finish.
        for (const side of [-1, 1]) {
            if (axis === "x") {
                add(cx + side * 3.58 - .24, .026, cz - 1.42, cx + side * 3.58 + .24, .06, cz + 1.42, "#d4b15b", "tactile", false, true);
            } else {
                add(cx - 1.42, .026, cz + side * 3.58 - .24, cx + 1.42, .06, cz + side * 3.58 + .24, "#d4b15b", "tactile", false, true);
            }
        }
        crosswalks.push({ id, axis, x: cx, z: cz, signal: id % 5 === 0 });
    };
    for (let gx = 1; gx < GRID; gx++) {
        const boundaryX = -CITY_HALF + gx * BLOCK;
        for (let gz = 0; gz < GRID; gz++) {
            const rowNorth = -CITY_HALF + gz * BLOCK;
            addZebraCrossing("x", boundaryX, rowNorth + 4.2);
            addZebraCrossing("x", boundaryX, rowNorth + BLOCK - 4.2);
        }
    }
    for (let gz = 1; gz < GRID; gz++) {
        const boundaryZ = -CITY_HALF + gz * BLOCK;
        for (let gx = 0; gx < GRID; gx++) {
            const columnWest = -CITY_HALF + gx * BLOCK;
            addZebraCrossing("z", columnWest + 4.2, boundaryZ);
            addZebraCrossing("z", columnWest + BLOCK - 4.2, boundaryZ);
        }
    }
    const carCols = ["#c0392b", "#2e86c1", "#f4d03f", "#ecf0f1", "#27ae60", "#34495e"];
    for (let i = 0; i < GRID * 6; i++) {
        const road = Math.floor(r() * (GRID - 1)) + 1, along = -CITY_HALF + 10 + r() * (GRID * BLOCK - 20), horiz = r() > .5, rx = -CITY_HALF + road * BLOCK + (r() > .5 ? 2.2 : -2.2), color = carCols[i % carCols.length], [x, z] = horiz ? [along, rx] : [rx, along], [hx, hz] = horiz ? [2.1, .9] : [.9, 2.1], face = horiz ? (r() > .5 ? Math.PI / 2 : -Math.PI / 2) : (r() > .5 ? 0 : Math.PI);
        const driveable = i % 4 === 0;
        const detailedParked = !driveable && i % 5 === 1;
        if (driveable || detailedParked) {
            inter.push({
                type: "car", x, y: .12, z, face, vehicleId: i, color,
                kind: detailedParked ? (i % 10 === 1 ? "jeep" : "sedan") : "sedan",
                parking: detailedParked,
                npcControlled: driveable && [4, 12, 20, 28, 36, 44, 52, 60].includes(i)
            });
        } else {
            add(x - hx, .3, z - hz, x + hx, 1, z + hz, color);
            add(x - hx * .6, 1, z - hz * .6, x + hx * .6, 1.55, z + hz * .6, "#2c3e50", "glass", true);
            add(x - hx * .8, 0, z - hz * .95, x + hx * .8, .35, z + hz * .95, "#1b1b1b", "solid", false);
        }
    }
    const autonomousHelicopter = inter.find((item) => item.type === "heli" && !item.parking && (item.scale || 1) >= .95)
        || inter.find((item) => item.type === "heli" && !item.parking);
    if (autonomousHelicopter) autonomousHelicopter.npcControlled = true;
    // Open perimeter lets visitors reach the beach and boarding points.
    const b0 = buildings[0];
    const trafficSignals = crosswalks.filter((crossing) => crossing.signal);
    return { boxes, buildings, trees, lamps, homes, landmarks, crosswalks, trafficSignals, busStops, busRoutes, curvedRoads, interactables: inter, parkingVehicles, elevators, elevator: elevators[0] || null, spawn: [(b0.x0 + b0.x1) / 2, .2, b0.z0 - 5] };
}
export function shade(hex, amt) { const n = parseInt(hex.slice(1), 16), f = (c) => Math.max(0, Math.min(255, Math.round(c + amt * 255))), rr = f((n >> 16) & 255), gg = f((n >> 8) & 255), bb = f(n & 255); return "#" + ((rr << 16) | (gg << 8) | bb).toString(16).padStart(6, "0"); }
const BRIGHT = ["#e74c3c", "#f39c12", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6", "#1abc9c", "#e67e22"];
function furnish(add, inter, r, theme, x0, x1, z0, z1, y, ground) {
    const W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, pick = (a) => a[Math.floor(r() * a.length)];
    const table = (x, z, s = .6, h = .75, col = "#8b5a2b") => { add(x - s, y + h - .06, z - s, x + s, y + h, z + s, col); add(x - .06, y, z - .06, x + .06, y + h, z + .06, "#3a3a3a", "solid", false); };
    const stool = (x, z, col) => add(x - .22, y, z - .22, x + .22, y + .45, z + .22, col);
    const plant = (x, z) => { add(x - .3, y, z - .3, x + .3, y + .5, z + .3, "#b5651d"); add(x - .4, y + .5, z - .4, x + .4, y + 1.4, z + .4, "#3f8f3a", "solid", false); };
    const rug = (ax, az, bx, bz, col) => add(ax, y, az, bx, y + .02, bz, col, "solid", false);
    const clearFront = (x, z) => ground && Math.abs(x - cx) < 2 && z < z0 + 5;
    switch (theme) {
        case "lobby":
            add(x1 - 4, y, z1 - 2.2, x1 - .5, y + 1.1, z1 - 1.4, "#554334");
            add(x1 - 4, y + 1.1, z1 - 2.25, x1 - .5, y + 1.18, z1 - 1.35, "#ded1b8");
            add(x1 - 3.2, y + 1.18, z1 - 1.9, x1 - 2.6, y + 1.6, z1 - 1.85, "#d9b66f", "glow", false);
            // Tiered marble fountain with a softly lit water basin.
            add(cx - 1.35, y, z0 + 1.65, cx + 1.35, y + .22, z0 + 4.25, "#c9c1b2", "solid", false);
            add(cx - 1.12, y + .22, z0 + 1.88, cx + 1.12, y + .32, z0 + 4.02, "#e2d7c4", "solid", false);
            add(cx - .88, y + .32, z0 + 2.12, cx + .88, y + .39, z0 + 3.78, "#59b6c7", "glow", false);
            add(cx - .28, y + .38, z0 + 2.65, cx + .28, y + 1.12, z0 + 3.22, "#b49a69", "solid", false);
            add(cx - .48, y + 1.12, z0 + 2.48, cx + .48, y + 1.22, z0 + 3.38, "#d8bd7c", "solid", false);
            add(cx - .62, y + 1.23, z0 + 2.55, cx + .62, y + 1.3, z0 + 3.31, "#55c9d5", "glow", false);
            // Fine brass inlay and ceiling-light accents.
            add(cx - 3.2, y + .025, z0 + 1.25, cx + 3.2, y + .045, z0 + 1.34, "#c7a96a", "glow", false);
            add(cx - 3.2, y + .025, z0 + 4.55, cx + 3.2, y + .045, z0 + 4.64, "#c7a96a", "glow", false);
            add(cx - .07, y + 2.65, z0 + 6.3, cx + .07, y + 3.15, z0 + 6.43, "#b99a62", "solid", false);
            add(cx - 1.1, y + 3.05, z0 + 6.12, cx + 1.1, y + 3.18, z0 + 6.62, "#c4a56c", "solid", false);
            add(cx - 1.65, y + 3.0, z0 + 5.95, cx + 1.65, y + 3.06, z0 + 6.78, "#ffe0a1", "glow", false);
            rug(cx - 3, z0 + 5, cx + 3, z0 + 9, "#78504a");
            add(cx - 2.5, y, z0 + 9, cx + 2.5, y + .5, z0 + 10, "#3c5a7a");
            add(cx - 2.5, y + .5, z0 + 9.7, cx + 2.5, y + 1.1, z0 + 10, "#3c5a7a");
            for (const ox of [-1.5, 0, 1.5]) inter.push({ type: "sofa", x: cx + ox, y, z: z0 + 9.3, face: Math.PI });
            plant(x0 + .6, z0 + .6); plant(x1 - .6, z0 + .6); plant(x1 - .6, z1 - 3.5);
            add(cx - 1, y, z0 + 6.5, cx + 1, y + .4, z0 + 7.5, "#d4c4a0");
            break;
        case "cafe":
            add(x0 + .3, y, z1 - 1.2, x1 - .3, y + 1.1, z1 - .4, "#6d4c41");
            add(x0 + .3, y + 1.1, z1 - 1.25, x1 - .3, y + 1.16, z1 - .35, "#f5f5f5");
            add(x1 - 2, y + 1.16, z1 - 1, x1 - 1.4, y + 1.6, z1 - .6, "#c0392b");
            for (let i = 0; i < 6; i++) add(x0 + .5 + i * 1.2, y + 2.6, z1 - .32, x0 + 1.4 + i * 1.2, y + 3, z1 - .3, "#ffe082", "glow", false);
            for (let tx = x0 + 1.5; tx < x1 - 1; tx += 3) for (let tz = z0 + 1.8; tz < z1 - 3; tz += 3) {
                table(tx, tz, .5, .75, "#f0e6d2"); stool(tx - .9, tz, "#c0392b"); stool(tx + .9, tz, "#c0392b");
            }
            break;
        case "library":
            for (let sz = z0 + 1.5; sz < z1 - 2; sz += 2.6) {
                add(x0 + .5, y, sz, x1 - 1.5, y + 2.4, sz + .5, "#5d4037");
                for (let k = 0; k < 4; k++) for (let bx = x0 + .6; bx < x1 - 1.7; bx += .35) add(bx, y + .1 + k * .6, sz - .04, bx + .28, y + .5 + k * .6 - r() * .1, sz + .54, pick(BRIGHT), "solid", false);
            }
            table(x1 - .8, z1 - 1.2, .5); break;
        case "gym":
            rug(x0, z0, x1, z1, "#263238");
            for (let i = 0; i < Math.floor(W / 2); i++) {
                const tx = x0 + 1 + i * 2;
                add(tx - .4, y, z0 + .8, tx + .4, y + .25, z0 + 2.6, "#212121", "treadmillDeck", false);
                add(tx - .4, y, z0 + .8, tx + .4, y + 1.4, z0 + 1, "#90a4ae");
                add(tx - .3, y + 1.3, z0 + .95, tx + .3, y + 1.6, z0 + 1, "#00e676", "glow", false);
                inter.push({ type: "treadmill", x: tx, y, z: z0 + 3.2, face: Math.PI });
            }
            for (let i = 0; i < 4; i++) { const wx = x0 + 1.5 + i * (W / 4); inter.push({ type: "weights", x: wx, y, z: z1 - 3, face: 0 }); }
            add(x0 + .3, y + .8, z1 - .38, x1 - .3, y + 2.6, z1 - .34, "#cfe8f2", "glow", false); break;
        case "gallery":
            for (let i = 0; i < 6; i++) {
                const px = x0 + 1.2 + (i % 3) * (W / 3), pz = z0 + 3 + Math.floor(i / 3) * (D / 2.4);
                add(px - .4, y, pz - .4, px + .4, y + 1, pz + .4, "#fafafa");
                const c = pick(BRIGHT); add(px - .25, y + 1, pz - .25, px + .25, y + 1.3 + r() * .8, pz + .25, c);
                add(px - .15, y + 1.8, pz - .15, px + .15, y + 2.1, pz + .15, shade(c, .2), "glow", false);
            }
            for (let i = 0; i < 4; i++) { const fx = x0 + .8 + i * (W / 4); add(fx, y + 1.2, z1 - .36, fx + 1.8, y + 2.5, z1 - .32, "#2c2c2c", "solid", false); add(fx + .1, y + 1.3, z1 - .37, fx + 1.7, y + 2.4, z1 - .36, pick(BRIGHT), "glow", false); }
            break;
        case "office":
            for (let tx = x0 + 1.2; tx < x1 - 1; tx += 2.8) for (let tz = z0 + 1.5; tz < z1 - 2; tz += 2.8) {
                add(tx - .8, y + .72, tz - .4, tx + .8, y + .78, tz + .4, "#eceff1");
                add(tx - .75, y, tz - .35, tx - .7, y + .72, tz + .35, "#607d8b", "solid", false);
                add(tx + .7, y, tz - .35, tx + .75, y + .72, tz + .35, "#607d8b", "solid", false);
                add(tx - .35, y + .78, tz + .2, tx + .35, y + 1.25, tz + .25, "#263238");
                add(tx - .3, y + .83, tz + .19, tx + .3, y + 1.2, tz + .2, "#64b5f6", "glow", false); stool(tx, tz - .8, "#37474f");
            }
            plant(x1 - .6, z1 - .6); break;
        case "apartment":
            rug(cx - 2.5, z0 + 2, cx + 2.5, z0 + 5.5, "#7e57c2");
            add(cx - 2, y, z0 + 5.6, cx + 2, y + .5, z0 + 6.5, "#546e7a");
            add(cx - 2, y + .5, z0 + 6.2, cx + 2, y + 1, z0 + 6.5, "#546e7a");
            for (const ox of [-1, 1]) inter.push({ type: "sofa", x: cx + ox, y, z: z0 + 5.85, face: Math.PI });
            add(cx - 1.6, y + .9, z0 + .32, cx + 1.6, y + 2.2, z0 + .4, "#111");
            add(cx - 1.5, y + 1, z0 + .4, cx + 1.5, y + 2.1, z0 + .42, "#81d4fa", "glow", false);
            add(x1 - 3, y, z1 - 3, x1 - .5, y + .5, z1 - .5, "#eeeeee");
            add(x1 - 3, y + .5, z1 - .9, x1 - .5, y + 1.2, z1 - .5, "#8d6e63");
            add(x1 - 2.8, y + .5, z1 - 1.6, x1 - .7, y + .65, z1 - 1, "#ffffff", "solid", false);
            table(cx, z0 + 3.7, .6, .4, "#a1887f"); plant(x0 + .6, z0 + .6); break;
        case "arcade":
            for (let i = 0; i < Math.floor(W / 1.6); i++) {
                const ax = x0 + .8 + i * 1.6;
                for (const az of [z0 + .8, z1 - 1.6]) {
                    add(ax - .5, y, az, ax + .5, y + 1.9, az + .8, "#1a1a2e");
                    add(ax - .4, y + 1.1, az + (az < cx ? .81 : -.01), ax + .4, y + 1.7, az + (az < cx ? .83 : .01), pick(BRIGHT), "glow", false);
                }
            }
            add(cx - 1.5, y, (z0 + z1) / 2 - 1, cx + 1.5, y + .9, (z0 + z1) / 2 + 1, "#00897b");
            add(cx - 1.5, y + .9, (z0 + z1) / 2 - 1, cx + 1.5, y + .95, (z0 + z1) / 2 + 1, "#26a69a", "glow", false); break;
        case "garden":
            for (let i = 0; i < 8; i++) {
                const px = x0 + 1 + r() * (W - 2), pz = z0 + 1 + r() * (D - 3);
                add(px - .6, y, pz - .6, px + .6, y + .6, pz + .6, "#795548");
                add(px - .7, y + .6, pz - .7, px + .7, y + 1.6 + r(), pz + .7, ["#43a047", "#66bb6a", "#2e7d32"][Math.floor(r() * 3)], "solid", false);
            }
            add(cx - 1.5, y, z1 - 4, cx + 1.5, y + .05, z1 - 2, "#4fc3f7", "glow", false); break;
        case "music":
            add(x0 + .4, y, z1 - 4, x1 - .4, y + .5, z1 - .4, "#212121");
            add(cx - 1.2, y + .5, z1 - 2.5, cx + 1.2, y + 1.4, z1 - 1.5, "#111");
            add(cx - 1.1, y + 1.4, z1 - 2.5, cx + 1.1, y + 1.45, z1 - 2.2, "#fafafa", "solid", false);
            for (const sx of [x0 + 1, x1 - 1.6]) {
                add(sx, y + .5, z1 - 1.2, sx + .8, y + 2.3, z1 - .5, "#333");
                add(sx + .15, y + 1, z1 - 1.21, sx + .65, y + 1.5, z1 - 1.2, "#ff7043", "glow", false);
            }
            for (let i = 0; i < 6; i++) add(x0 + 1 + i * (W / 6), y + 3.2, z1 - 3.5, x0 + 1.4 + i * (W / 6), y + 3.5, z1 - 3.1, pick(BRIGHT), "glow", false);
            for (let tx = x0 + 1.5; tx < x1 - 1; tx += 1.4) for (let tz = z0 + 1.5; tz < z1 - 6; tz += 1.6) stool(tx, tz, "#8e244d");
            break;
        case "kids":
            rug(x0, z0, x1, z1 - 1, "#ffe082");
            for (let i = 0; i < 10; i++) { const bx = x0 + 1 + r() * (W - 2), bz = z0 + 1 + r() * (D - 3), s = .25 + r() * .35; add(bx - s, y, bz - s, bx + s, y + s * 2, bz + s, pick(BRIGHT)); }
            add(cx - 1.5, y, (z0 + z1) / 2, cx + 1.5, y + 1.6, (z0 + z1) / 2 + .3, "#ef5350");
            add(cx - 1.5, y, (z0 + z1) / 2 + .3, cx - .9, y + 1.6, (z0 + z1) / 2 + 2.5, "#42a5f5"); break;
    }
    void clearFront;
}
function roofDecor(add, inter, r, x0, x1, z0, z1, y) {
    const k0 = r(), kind = k0 < .45 ? 0 : k0 < .75 ? 1 : 2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (kind === 0) {
        // Full-size, flyable helicopter and clearly marked rooftop landing pad.
        add(cx - 3, y, cz - 3, cx + 3, y + .05, cz + 3, "#455a64", "solid", true);
        add(cx - 2, y + .05, cz - .3, cx + 2, y + .07, cz + .3, "#ffeb3b", "glow", false);
        add(cx - 1.4, y + .05, cz - 1.5, cx - .9, y + .07, cz + 1.5, "#ffeb3b", "glow", false);
        add(cx + .9, y + .05, cz - 1.5, cx + 1.4, y + .07, cz + 1.5, "#ffeb3b", "glow", false);
        inter.push({ type: "heli", x: cx, y: y + .05, z: cz, face: 0, scale: 1, padSize: 6 });
    } else if (kind === 1) {
        // Keep rooftop gardens around the edge, leaving the center clear for its helicopter.
        const planters = [
            [x0 + 1.8, z0 + 1.8], [x1 - 1.8, z0 + 1.8],
            [x0 + 1.8, z1 - 1.8], [x1 - 1.8, z1 - 1.8],
            [cx, z0 + 1.8]
        ];
        for (const [px, pz] of planters) {
            add(px - .7, y, pz - .7, px + .7, y + .5, pz + .7, "#8d6e63");
            add(px - .8, y + .5, pz - .8, px + .8, y + 1.5, pz + .8, "#4caf50", "solid", false);
        }
    } else {
        // Rooftop utility units sit to the side of the landing area.
        add(x0 + .5, y, z0 + .5, x0 + 2.5, y + 2, z0 + 2.5, "#b0bec5");
        add(x1 - 3.5, y, z0 + .5, x1 - .5, y + 1, z0 + 3.5, "#78909c");
    }
    return kind;
}
export class Collider {
    boxes; cell = 4; map = new Map();
    constructor(boxes) {
        this.boxes = boxes;
        for (const b of boxes) {
            if (!b.collide) continue;
            for (let i = Math.floor(b.x0 / this.cell); i <= Math.floor(b.x1 / this.cell); i++)
                for (let k = Math.floor(b.z0 / this.cell); k <= Math.floor(b.z1 / this.cell); k++) {
                    const key = i + "," + k; let a = this.map.get(key); if (!a) this.map.set(key, a = []); a.push(b);
                }
        }
    }
    near(x, z, rad) {
        const out = new Set();
        for (let i = Math.floor((x - rad) / this.cell); i <= Math.floor((x + rad) / this.cell); i++)
            for (let k = Math.floor((z - rad) / this.cell); k <= Math.floor((z + rad) / this.cell); k++) this.map.get(i + "," + k)?.forEach(b => out.add(b));
        return out;
    }
    groundAt(x, z, y, step, rad = .2) {
        let g = 0, basementGround = -Infinity;
        for (const b of this.near(x, z, rad)) {
            if (b.noGround) continue;
            if (x + rad < b.x0 || x - rad > b.x1 || z + rad < b.z0 || z - rad > b.z1) continue;
            if (b.basementGround) {
                if (b.y1 <= y + step && b.y1 >= y - .65 && b.y1 > basementGround) basementGround = b.y1;
                continue;
            }
            if (b.y1 <= y + step && b.y1 > g) g = b.y1;
        }
        if (basementGround > -Infinity) g = basementGround;
        return g;
    }
    ceilingAt(x, z, y, rad = .2) { let c = Infinity; for (const b of this.near(x, z, rad)) { if (x + rad < b.x0 || x - rad > b.x1 || z + rad < b.z0 || z - rad > b.z1) continue; if (b.y0 >= y && b.y0 < c) c = b.y0; } return c; }
    resolve(p, yLo, yHi, rad) {
        for (let it = 0; it < 3; it++) for (const b of this.near(p.x, p.z, rad + .5)) {
            if (b.y1 <= yLo || b.y0 >= yHi) continue;
            const cx = Math.max(b.x0, Math.min(p.x, b.x1)), cz = Math.max(b.z0, Math.min(p.z, b.z1)), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
            if (d2 >= rad * rad) continue;
            if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + dx / d * rad; p.z = cz + dz / d * rad; }
            else { const opts = [p.x - b.x0, b.x1 - p.x, p.z - b.z0, b.z1 - p.z], m = Math.min(...opts); if (m === opts[0]) p.x = b.x0 - rad; else if (m === opts[1]) p.x = b.x1 + rad; else if (m === opts[2]) p.z = b.z0 - rad; else p.z = b.z1 + rad; }
        }
    }
    pointInside(x, y, z, pad = .15) {
        for (const b of this.near(x, z, pad)) {
            if (b.kind === "glass") continue;
            if (x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad && z > b.z0 - pad && z < b.z1 + pad) return true;
        }
        return false;
    }
}
export function locate(world, x, y, z) {
    for (const b of world.buildings) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) {
        const f = Math.floor((y + .6) / FLOOR_H);
        if (f < 0) return { building: b.name, floor: "-1", room: "מחסן" };
        if (f >= b.floors.length) return { building: b.name, floor: "גג", room: "גג הבניין" };
        return { building: b.name, floor: f === 0 ? "קרקע" : String(f), room: b.floors[Math.max(0, f)].label };
    }
    return null;
}
