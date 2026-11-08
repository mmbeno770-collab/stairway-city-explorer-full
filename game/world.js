export const FLOOR_H = 4, WALL_T = 0.3, BLOCK = 36, GRID = 7, CITY_HALF = (GRID * BLOCK) / 2;

export const CABLE_STATIONS = [
  { id: 0, name: "תחנת צפון־מערב", x: -90, z: -90, y: 48 },
  { id: 1, name: "תחנת צפון־מזרח", x: 90, z: -90, y: 53 },
  { id: 2, name: "תחנת דרום־מזרח", x: 90, z: 90, y: 49 },
  { id: 3, name: "תחנת דרום־מערב", x: -90, z: 90, y: 55 }
];
export const WALKABLE_HILLS = [
  { x: -78, z: -80, rx: 6.5, rz: 6.5, height: 2.8 },
  { x: -64, z: -80, rx: 6.5, rz: 6.5, height: 3.5 }
];
export function hillHeightAt(hill, x, z) {
  const nx = (x - hill.x) / hill.rx, nz = (z - hill.z) / hill.rz;
  const radius = Math.hypot(nx, nz);
  return radius >= 1 ? 0 : hill.height * 0.5 * (1 + Math.cos(Math.PI * radius));
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const THEMES = [
    { theme: "cafe", label: "בית קפה", floor: "#76523d" }, { theme: "library", label: "ספרייה", floor: "#584638" }, { theme: "gym", label: "חדר כושר", floor: "#343d49" }, { theme: "gallery", label: "גלריה לאמנות", floor: "#d7d0c2" }, { theme: "office", label: "משרדים", floor: "#8d9b9d" }, { theme: "apartment", label: "דירת מגורים", floor: "#b99a72" }, { theme: "arcade", label: "אולם משחקים", floor: "#25283b" }, { theme: "garden", label: "גן פנימי", floor: "#637a4d" }, { theme: "music", label: "אולפן מוזיקה", floor: "#56383a" }, { theme: "kids", label: "חדר ילדים", floor: "#c3d0ce" },
];
const FACADES = ["#d9cbb5", "#b9aa97", "#c7bda9", "#84999c", "#e3d8c4", "#8d9b99", "#bba88b", "#9aa6a3", "#c6bcae", "#77888d"];
const NAMES = ["מגדל השקמה", "בית האורנים", "מרכז הגפן", "בית הים", "מגדל הזית", "בית הרימון", "מגדל האלון", "בית התמר", "מרכז הדקל", "בית הברוש", "מגדל הארז", "בית התאנה"];
export function generateWorld(seed = 7) {
    const r = rng(seed), boxes = [], buildings = [], trees = [], lamps = [], inter = [];
    let elevator = null;
    const add = (x0, y0, z0, x1, y1, z1, color, kind = "solid", collide = true, noGround = false) => boxes.push({ x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1), color, kind, collide, noGround });
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
        const cx = -CITY_HALF + gx * BLOCK + BLOCK / 2, cz = -CITY_HALF + gz * BLOCK + BLOCK / 2;
        if (gx === Math.floor(GRID / 2) && gz === Math.floor(GRID / 2)) {
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
        if (gx === 1 && gz === 1) {
            // A dedicated recreation square with rubber safety surfacing and accessible clear paths.
            add(cx - 12, 0, cz - 12, cx + 12, .08, cz + 12, "#678455", "solid", false);
            add(cx - 10, .08, cz - 9, cx + 10, .16, cz + 9, "#b2a58e", "solid", false);
            add(cx - 9, .16, cz - 8, cx - 1, .19, cz + 7, "#c88765", "solid", false);
            add(cx + 1, .16, cz - 8, cx + 9, .19, cz + 7, "#7896a1", "solid", false);
            add(cx - 5, .16, cz - 10, cx + 5, .19, cz - 4, "#d7bd75", "solid", false);

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
            for (const [dx, dz] of [[-9,9],[9,9]]) trees.push({ x: cx + dx, z: cz + dz, s: .8 + r() * .25 });
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
        const W = 14 + Math.floor(r() * 4) * 1.5, D = 14 + Math.floor(r() * 3) * 1.5, nFloors = 2 + Math.floor(r() * 5), x0 = cx - W / 2, x1 = cx + W / 2, z0 = cz - D / 2, z1 = cz + D / 2, facade = FACADES[Math.floor(r() * FACADES.length)], glass = r() > .5 ? "#83aab9" : "#9bbdb6";
        const floors = [{ theme: "lobby", label: "לובי" }], pool = [...THEMES].sort(() => r() - .5);
        for (let f = 1; f < nFloors; f++) floors.push(pool[(f - 1) % pool.length]);
        const id = buildings.length;
        buildings.push({ id, name: NAMES[id % NAMES.length] + (id >= NAMES.length ? " " + (Math.floor(id / NAMES.length) + 1) : ""), x0, z0, x1, z1, floors });
        const sx0 = x0 + WALL_T, sx1 = sx0 + 4, sz1 = z1 - WALL_T, sz0 = sz1 - 6, t = WALL_T;
        add(x0 - .3, 0, z0 - .3, x1 + .3, .12, z1 + .3, "#9a948a");
        if (id === 0) {
            const ex = x1 - 1.65, ez = z0 + 4.15;
            elevator = { x: ex, z: ez, doorX: ex - 1.35, approachX: ex - 2.2, floors: nFloors + 1 };
            for (let ef = 0; ef <= nFloors; ef++) inter.push({ type: "elevator", x: elevator.approachX, y: ef * FLOOR_H, z: ez, face: Math.PI / 2, floor: ef });
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
                    // Non-overlapping floor panels around the elevator and stair openings.
                    const ex0 = x1 - 3, ex1 = x1 - .3, ez0 = z0 + 2.8, ez1 = z0 + 5.5;
                    add(x0, sb, z0, x1, sy, ez0, floorCol);
                    add(x0, sb, ez0, ex0, sy, ez1, floorCol);
                    add(ex1, sb, ez0, x1, sy, ez1, floorCol);
                    add(x0, sb, ez1, x1, sy, sz0, floorCol);
                    add(x0, sb, sz0, sx0, sy, sz1, floorCol);
                    add(sx1, sb, sz0, x1, sy, sz1, floorCol);
                    add(x0, sb, sz1, x1, sy, z1, floorCol);
                } else {
                    // The stairwell is a real opening; each floor panel is drawn exactly once.
                    add(x0, sb, z0, x1, sy, sz0, floorCol);
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
                roofDecor(add, inter, r, sx1 + 1, x1 - 1, z0 + 1, z1 - 1, y); break;
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
            furnish(add, inter, r, floors[f].theme, sx1 + .6, id === 0 ? x1 - 3.5 : x1 - t - .4, z0 + t + .4, z1 - t - .4, y + (f === 0 ? .15 : 0), f === 0);
        }
        // Fewer, more widely spaced avenue trees leave open sightlines around each building.
        for (const tx of [-11, 11]) {
            trees.push({ x: cx + tx, z: cz - BLOCK / 2 + 3, s: .9 + r() * .42 });
            trees.push({ x: cx + tx, z: cz + BLOCK / 2 - 3, s: .84 + r() * .38 });
        }
        for (const side of [-1, 1]) {
            const px = cx + side * 12.8, pz = cz + BLOCK / 2 - 3.1;
            add(px - .85, 0, pz - .85, px + .85, .55, pz + .85, "#927a5c", "solid", false);
            add(px - .72, .55, pz - .72, px + .72, 1.45, pz + .72, "#4f7c4d", "solid", false);
        }
        lamps.push({ x: cx - BLOCK / 2 + 3, z: cz - BLOCK / 2 + 3 }, { x: cx + BLOCK / 2 - 3, z: cz + BLOCK / 2 - 3 });
    }
    const carCols = ["#c0392b", "#2e86c1", "#f4d03f", "#ecf0f1", "#27ae60", "#34495e"];
    for (let i = 0; i < GRID * 6; i++) {
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
    groundAt(x, z, y, step, rad = .2) {
        let g = 0;
        for (const b of this.near(x, z, rad)) {
            if (b.noGround) continue;
            if (x + rad < b.x0 || x - rad > b.x1 || z + rad < b.z0 || z - rad > b.z1) continue;
            if (b.y1 <= y + step && b.y1 > g) g = b.y1;
        }
        for (const hill of WALKABLE_HILLS) {
            const surface = hillHeightAt(hill, x, z);
            if (surface > g) g = surface;
        }
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
        if (f >= b.floors.length) return { building: b.name, floor: "גג", room: "גג הבניין" };
        return { building: b.name, floor: f === 0 ? "קרקע" : String(f), room: b.floors[Math.max(0, f)].label };
    }
    return null;
}
