export const FLOOR_H = 4, WALL_T = 0.3, BLOCK = 32, GRID = 5, CITY_HALF = (GRID * BLOCK) / 2;
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const THEMES = [
    { theme: "cafe", label: "בית קפה", floor: "#b98a5e" }, { theme: "library", label: "ספרייה", floor: "#7a5a43" }, { theme: "gym", label: "חדר כושר", floor: "#3d4450" }, { theme: "gallery", label: "גלריה לאמנות", floor: "#e8e2d6" }, { theme: "office", label: "משרדים", floor: "#8f9aa6" }, { theme: "apartment", label: "דירת מגורים", floor: "#c9a77c" }, { theme: "arcade", label: "אולם משחקים", floor: "#2b2540" }, { theme: "garden", label: "גן פנימי", floor: "#6f8f4e" }, { theme: "music", label: "אולפן מוזיקה", floor: "#4a3530" }, { theme: "kids", label: "חדר ילדים", floor: "#9ec7d8" },
];
const FACADES = ["#e8d9c0", "#c9b8a6", "#d98f6a", "#a9c2c9", "#efe6d2", "#b7a1c4", "#cfd6a3", "#e3b48d", "#9fb6a0", "#d6c7b2"];
const NAMES = ["מגדל השקמה", "בית האורנים", "מרכז הגפן", "בית הים", "מגדל הזית", "בית הרימון", "מגדל האלון", "בית התמר", "מרכז הדקל", "בית הברוש", "מגדל הארז", "בית התאנה"];
export function generateWorld(seed = 7) {
    const r = rng(seed), boxes = [], buildings = [], trees = [], lamps = [], inter = [];
    let elevator = null;
    const add = (x0, y0, z0, x1, y1, z1, color, kind = "solid", collide = true) => boxes.push({ x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1), color, kind, collide });
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
        const cx = -CITY_HALF + gx * BLOCK + BLOCK / 2, cz = -CITY_HALF + gz * BLOCK + BLOCK / 2;
        if (gx === 2 && gz === 2) {
            add(cx - 11, 0, cz - 11, cx + 11, .02, cz + 11, "#6fa25a", "solid", false);
            add(cx - 4, 0, cz - 4, cx + 4, .25, cz + 4, "#c9c2b0");
            add(cx - 2.5, .25, cz - 2.5, cx + 2.5, .35, cz + 2.5, "#5aa9d6", "glow", false);
            add(cx - .4, .25, cz - .4, cx + .4, 2.2, cz + .4, "#e6e0d0");
            for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; trees.push({ x: cx + Math.cos(a) * 8.5, z: cz + Math.sin(a) * 8.5, s: .9 + r() * .5 }); }
            for (const [bx, bz] of [[-6, 0], [6, 0], [0, -6], [0, 6]]) {
                add(cx + bx - 1, 0, cz + bz - .3, cx + bx + 1, .5, cz + bz + .3, "#8a5a3a");
                inter.push({ type: "sofa", x: cx + bx, y: 0, z: cz + bz, face: bz > 0 ? Math.PI : 0 });
            }
            continue;
        }
        const W = 14 + Math.floor(r() * 4) * 1.5, D = 14 + Math.floor(r() * 3) * 1.5, nFloors = 2 + Math.floor(r() * 5), x0 = cx - W / 2, x1 = cx + W / 2, z0 = cz - D / 2, z1 = cz + D / 2, facade = FACADES[Math.floor(r() * FACADES.length)], glass = r() > .5 ? "#8fc6e0" : "#a9d8d0";
        const floors = [{ theme: "lobby", label: "לובי" }], pool = [...THEMES].sort(() => r() - .5);
        for (let f = 1; f < nFloors; f++) floors.push(pool[(f - 1) % pool.length]);
        const id = buildings.length;
        buildings.push({ id, name: NAMES[id % NAMES.length] + (id >= NAMES.length ? " " + (Math.floor(id / NAMES.length) + 1) : ""), x0, z0, x1, z1, floors });
        const sx0 = x0 + WALL_T, sx1 = sx0 + 4, sz1 = z1 - WALL_T, sz0 = sz1 - 6, t = WALL_T;
        add(x0 - .3, 0, z0 - .3, x1 + .3, .12, z1 + .3, "#9a948a");
        if (id === 0) {
            const ex = x1 - 1.65, ez = z0 + 4.15;
            elevator = { x: ex, z: ez, doorX: ex - 1.35, approachX: ex - 2.2, floors: nFloors };
            for (let ef = 0; ef < nFloors; ef++) inter.push({ type: "elevator", x: elevator.approachX, y: ef * FLOOR_H, z: ez, face: Math.PI / 2, floor: ef });
            const shaftTop = nFloors * FLOOR_H + .25;
            add(ex + 1.28, .15, ez - 1.42, ex + 1.42, shaftTop, ez + 1.42, "#9bb8c4", "glass", true);
            add(ex - 1.42, .15, ez - 1.42, ex + 1.42, shaftTop, ez - 1.28, "#9bb8c4", "glass", true);
            add(ex - 1.42, .15, ez + 1.28, ex + 1.42, shaftTop, ez + 1.42, "#9bb8c4", "glass", true);
        }
        for (let f = 0; f <= nFloors; f++) {
            const y = f * FLOOR_H, th = f === 0 ? null : THEMES.find(q => q.theme === floors[f]?.theme), floorCol = f === 0 ? "#d8d0c0" : f === nFloors ? "#8c8a86" : th?.floor ?? "#ccc", sy = f === 0 ? .12 : y, sb = f === 0 ? 0 : y - .25;
            if (f === 0) {
                if (id === 0) {
                    const ex0 = x1 - 3, ex1 = x1 - .3, ez0 = z0 + 2.8, ez1 = z0 + 5.5;
                    add(x0 + t, .12, z0 + t, ex0, .15, ez1, floorCol);
                    add(x0 + t, .12, ez1, x1 - t, .15, z1 - t, floorCol);
                    add(ex1, .12, ez0, x1 - t, .15, ez1, floorCol);
                } else add(x0 + t, .12, z0 + t, x1 - t, .15, z1 - t, floorCol);
            } else {
                if (id === 0) {
                    const ex0 = x1 - 3, ex1 = x1 - .3, ez0 = z0 + 2.8, ez1 = z0 + 5.5;
                    add(x0, sb, z0, x1, sy, ez0, floorCol); add(x0, sb, ez1, x1, sy, sz0, floorCol);
                    add(x0, sb, ez0, ex0, sy, ez1, floorCol); add(ex1, sb, ez0, x1, sy, ez1, floorCol);
                } else add(x0, sb, z0, x1, sy, sz0, floorCol);
                add(sx1, sb, sz0, x1, sy, z1, floorCol); add(x0, sb, sz0, sx0, sy, z1, facade); add(x0, sb, sz1, sx1, sy, z1, facade);
                const lx = (sx1 + x1) / 2, lz = (z0 + z1) / 2;
                add(lx - 1.5, sb - .06, lz - .3, lx + 1.5, sb, lz + .3, "#fff6dc", "glow", false);
                add(lx - 1.5, sb - .06, z0 + 1.7, lx + 1.5, sb, z0 + 2.3, "#fff6dc", "glow", false);
            }
            if (f === nFloors) {
                add(x0, y, z0, x1, y + 1.1, z0 + .25, facade); add(x0, y, z1 - .25, x1, y + 1.1, z1, facade);
                add(x0, y, z0, x0 + .25, y + 1.1, z1, facade); add(x1 - .25, y, z0, x1, y + 1.1, z1, facade);
                add(sx1, y, sz0, sx1 + .1, y + 1.1, sz1, "#555");
                roofDecor(add, inter, r, sx1 + 1, x1 - 1, z0 + 1, z1 - 1, y); break;
            }
            wall("x", x0, x1, z0 + t / 2, y, facade, f === 0, glass);
            wall("x", x0, x1, z1 - t / 2, y, facade, false, glass);
            wall("z", z0 + t, z1 - t, x0 + t / 2, y, facade, false, glass);
            wall("z", z0 + t, z1 - t, x1 - t / 2, y, facade, false, glass);
            add(x0 - .08, y + FLOOR_H - .3, z0 - .08, x1 + .08, y + FLOOR_H, z1 + .08, shade(facade, -.15), "solid", false);
            const stairCol = "#b8b2a6";
            for (let i = 0; i < 8; i++) { const top = y + .25 * (i + 1); add(sx0, top - .5, sz0 + i * .5, sx0 + 2, top, sz0 + (i + 1) * .5, i % 2 ? stairCol : shade(stairCol, -.06)); }
            add(sx0, y + 1.5, sz0 + 4, sx1, y + 2, sz1, stairCol);
            for (let i = 0; i < 8; i++) { const top = y + 2 + .25 * (i + 1); add(sx0 + 2, top - .5, sz0 + 4 - (i + 1) * .5, sx1, top, sz0 + 4 - i * .5, i % 2 ? stairCol : shade(stairCol, -.06)); }
            add(sx0 + 1.95, y + .6, sz0, sx0 + 2.05, y + FLOOR_H - .3, sz0 + 4, "#6b6258");
            add(sx1, y + 1, sz0, sx1 + .12, y + FLOOR_H + 1, sz1, "#6b6258");
            add(sx1 - .02, y + FLOOR_H + .9, sz0, sx1 + .14, y + FLOOR_H + 1.05, sz1, "#d9b26a", "solid", false);
            furnish(add, inter, r, floors[f].theme, sx1 + .6, id === 0 ? x1 - 3.5 : x1 - t - .4, z0 + t + .4, z1 - t - .4, y + (f === 0 ? .15 : 0), f === 0);
        }
        for (let i = 0; i < 3; i++) trees.push({ x: cx - 10 + i * 10, z: cz - BLOCK / 2 + 3, s: .8 + r() * .5 });
        lamps.push({ x: cx - BLOCK / 2 + 3, z: cz - BLOCK / 2 + 3 }, { x: cx + BLOCK / 2 - 3, z: cz + BLOCK / 2 - 3 });
    }
    const carCols = ["#c0392b", "#2e86c1", "#f4d03f", "#ecf0f1", "#27ae60", "#34495e"];
    for (let i = 0; i < 26; i++) {
        const road = Math.floor(r() * (GRID - 1)) + 1, along = -CITY_HALF + 10 + r() * (GRID * BLOCK - 20), horiz = r() > .5, rx = -CITY_HALF + road * BLOCK + (r() > .5 ? 2.2 : -2.2), color = carCols[i % carCols.length], [x, z] = horiz ? [along, rx] : [rx, along], [hx, hz] = horiz ? [2.1, .9] : [.9, 2.1], face = horiz ? (r() > .5 ? Math.PI / 2 : -Math.PI / 2) : (r() > .5 ? 0 : Math.PI);
        const driveable = i % 4 === 0;
        if (driveable) inter.push({ type: "car", x, y: .12, z, face, vehicleId: i, color });
        else {
            add(x - hx, .3, z - hz, x + hx, 1, z + hz, color);
            add(x - hx * .6, 1, z - hz * .6, x + hx * .6, 1.55, z + hz * .6, "#2c3e50", "glass", true);
            add(x - hx * .8, 0, z - hz * .95, x + hx * .8, .35, z + hz * .95, "#1b1b1b", "solid", false);
        }
    }
    const E = CITY_HALF + 4;
    add(-E, 0, -E - .5, E, 1.2, -E, "#9a948a"); add(-E, 0, E, E, 1.2, E + .5, "#9a948a");
    add(-E - .5, 0, -E, -E, 1.2, E, "#9a948a"); add(E, 0, -E, E + .5, 1.2, E, "#9a948a");
    const b0 = buildings[0];
    return { boxes, buildings, trees, lamps, interactables: inter, elevator, spawn: [(b0.x0 + b0.x1) / 2, .2, b0.z0 - 5] };
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
            add(x1 - 4, y, z1 - 2.2, x1 - .5, y + 1.1, z1 - 1.4, "#5a3e2b");
            add(x1 - 4, y + 1.1, z1 - 2.25, x1 - .5, y + 1.18, z1 - 1.35, "#e8dcc0");
            add(x1 - 3.2, y + 1.18, z1 - 1.9, x1 - 2.6, y + 1.6, z1 - 1.85, "#4fc3f7", "glow", false);
            rug(cx - 3, z0 + 5, cx + 3, z0 + 9, "#8e3b46");
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
                add(tx - .4, y, z0 + .8, tx + .4, y + .25, z0 + 2.6, "#212121");
                add(tx - .4, y, z0 + .8, tx + .4, y + 1.4, z0 + 1, "#90a4ae");
                add(tx - .3, y + 1.3, z0 + .95, tx + .3, y + 1.6, z0 + 1, "#00e676", "glow", false);
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
        add(cx - 3, y, cz - 3, cx + 3, y + .05, cz + 3, "#455a64", "solid", false);
        add(cx - 2, y + .05, cz - .3, cx + 2, y + .07, cz + .3, "#ffeb3b", "glow", false);
        add(cx - 1.4, y + .05, cz - 1.5, cx - .9, y + .07, cz + 1.5, "#ffeb3b", "glow", false);
        add(cx + .9, y + .05, cz - 1.5, cx + 1.4, y + .07, cz + 1.5, "#ffeb3b", "glow", false);
        inter.push({ type: "heli", x: cx, y, z: cz, face: 0 });
    } else if (kind === 1) {
        for (let i = 0; i < 5; i++) { const px = x0 + 1 + r() * (x1 - x0 - 2), pz = z0 + 1 + r() * (z1 - z0 - 2); add(px - .7, y, pz - .7, px + .7, y + .5, pz + .7, "#8d6e63"); add(px - .8, y + .5, pz - .8, px + .8, y + 1.5, pz + .8, "#4caf50", "solid", false); }
    } else {
        add(x0 + .5, y, z0 + .5, x0 + 2.5, y + 2, z0 + 2.5, "#b0bec5");
        add(x1 - 3.5, y, z0 + .5, x1 - .5, y + 1, z0 + 3.5, "#78909c");
        add(cx - 2, y, cz - 1, cx + 2, y + .4, cz + 1, "#29b6f6", "glow", false);
    }
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
    groundAt(x, z, y, step, rad = .2) { let g = 0; for (const b of this.near(x, z, rad)) { if (x + rad < b.x0 || x - rad > b.x1 || z + rad < b.z0 || z - rad > b.z1) continue; if (b.y1 <= y + step && b.y1 > g) g = b.y1; } return g; }
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
        if (f >= b.floors.length) return { building: b.name, floor: "גג", room: "גג הבניין" };
        return { building: b.name, floor: f === 0 ? "קרקע" : String(f), room: b.floors[Math.max(0, f)].label };
    }
    return null;
}
