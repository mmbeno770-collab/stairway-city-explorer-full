import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Phase 1 character upgrade for Stairway City Explorer.
// Keeps the original Human / poseHuman / BARBELL / Rig / PoseMode API intact.
// This is a higher-detail procedural fallback; a licensed skinned GLB can replace it later.
// @ts-nocheck -- rig refs are populated by React ref callbacks before the first animation frame.
import * as THREE from "three";
const downCapsule = (radius, length, radial = 18) => { const g = new THREE.CapsuleGeometry(radius, length, 6, radial); g.translate(0, -length / 2, 0); return g; };
const lathe = (pts, seg = 36) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const sphere = (w, h, d, detail = 24) => { const g = new THREE.SphereGeometry(1, detail, Math.max(12, Math.floor(detail * 0.7))); g.scale(w, h, d); return g; };
const G = {
    torso: lathe([[0.001, 0], [0.125, 0.005], [0.145, 0.045], [0.14, 0.12], [0.15, 0.22], [0.17, 0.32], [0.188, 0.39], [0.18, 0.45], [0.145, 0.49], [0.085, 0.515], [0.001, 0.52]]),
    pelvis: sphere(0.155, 0.118, 0.112, 28), belt: new THREE.CylinderGeometry(0.151, 0.151, 0.038, 32),
    thigh: downCapsule(0.069, 0.39, 20), shin: downCapsule(0.046, 0.39, 18), knee: sphere(0.052, 0.061, 0.052, 20), calf: sphere(0.049, 0.105, 0.052, 20), ankle: sphere(0.037, 0.048, 0.039, 16),
    shoulder: sphere(0.073, 0.078, 0.074, 24), sleeve: downCapsule(0.059, 0.16, 18), upperArm: downCapsule(0.045, 0.25, 18), elbow: sphere(0.039, 0.042, 0.04, 18), forearm: downCapsule(0.034, 0.22, 18), wrist: sphere(0.027, 0.03, 0.03, 16), palm: sphere(0.041, 0.058, 0.027, 18),
    finger: downCapsule(0.0076, 0.026, 12), fingerMid: downCapsule(0.0066, 0.019, 12), fingerDistal: downCapsule(0.0058, 0.015, 12), fingerTip: sphere(0.007, 0.009, 0.007, 12), fingernail: sphere(0.0048, 0.007, 0.0018, 12), knuckle: sphere(0.0085, 0.0085, 0.008, 12), thumb: downCapsule(0.01, 0.031, 12), thumbTip: sphere(0.009, 0.011, 0.009, 12),
    neck: new THREE.CylinderGeometry(0.047, 0.057, 0.13, 20, 1), collar: new THREE.TorusGeometry(0.052, 0.008, 8, 32), skull: sphere(0.098, 0.116, 0.094, 40), jaw: sphere(0.079, 0.064, 0.079, 32), chin: sphere(0.045, 0.027, 0.044, 20),
    hairCap: new THREE.SphereGeometry(0.108, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.59), hairSide: sphere(0.027, 0.064, 0.072, 20), hairLock: downCapsule(0.016, 0.065, 14), hairStrand: downCapsule(0.0042, 0.052, 8), kippah: lathe([[0.067, 0], [0.066, 0.007], [0.062, 0.02], [0.055, 0.034], [0.045, 0.048], [0.033, 0.06], [0.019, 0.069], [0.008, 0.074], [0.001, 0.075]], 56), kippahTrim: new THREE.TorusGeometry(0.0665, 0.0028, 8, 56), ear: sphere(0.022, 0.038, 0.014, 20), earInner: sphere(0.009, 0.022, 0.006, 16),
    eyeSocket: sphere(0.025, 0.02, 0.012, 22), eye: sphere(0.0182, 0.0142, 0.013, 26), iris: sphere(0.009, 0.0095, 0.0048, 20), pupil: sphere(0.0042, 0.0052, 0.0026, 16), eyeGlint: sphere(0.0031, 0.0031, 0.0018, 12), eyelid: new THREE.TorusGeometry(0.0185, 0.0028, 7, 26),
    brow: (() => { const g = new THREE.CapsuleGeometry(0.0055, 0.027, 4, 10); g.rotateZ(Math.PI / 2); return g; })(),
    noseBridge: sphere(0.012, 0.026, 0.014, 20), noseTip: sphere(0.014, 0.012, 0.015, 20), nostril: sphere(0.0045, 0.003, 0.003, 12), lipUpper: sphere(0.019, 0.0045, 0.0045, 20), lipLower: sphere(0.018, 0.0042, 0.004, 20), smile: (() => { const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.021, -0.064, 0.104), new THREE.Vector3(-0.012, -0.072, 0.108), new THREE.Vector3(0, -0.075, 0.109), new THREE.Vector3(0.012, -0.072, 0.108), new THREE.Vector3(0.021, -0.064, 0.104)]); return new THREE.TubeGeometry(curve, 24, 0.0028, 8, false); })(), dimple: sphere(0.004, 0.003, 0.002, 12), philtrum: downCapsule(0.0025, 0.012, 8),
    shirtHem: new THREE.TorusGeometry(0.144, 0.0032, 7, 40), shirtFold: downCapsule(0.0028, 0.075, 8), shoulderSeam: new THREE.TorusGeometry(0.054, 0.002, 6, 24), pocket: new THREE.BoxGeometry(0.047, 0.06, 0.006), button: new THREE.SphereGeometry(0.004, 10, 8), cuff: new THREE.CylinderGeometry(0.039, 0.044, 0.025, 18), pantSeam: downCapsule(0.0022, 0.27, 8), zipTrack: new THREE.BoxGeometry(0.006, 0.22, 0.008), zipPull: sphere(0.006, 0.013, 0.004, 12), drawstring: downCapsule(0.003, 0.075, 8), tzitzitCord: new THREE.CylinderGeometry(0.0025, 0.0025, 0.19, 8), tzitzitKnot: new THREE.CylinderGeometry(0.007, 0.007, 0.008, 10), tzitzitLoop: new THREE.TorusGeometry(0.009, 0.0018, 6, 16), backpack: sphere(0.112, 0.16, 0.07, 28), backpackPocket: sphere(0.079, 0.065, 0.022, 22), backpackStrap: downCapsule(0.012, 0.27, 10), strapClip: new THREE.BoxGeometry(0.026, 0.018, 0.008), shoeStripe: new THREE.BoxGeometry(0.072, 0.012, 0.008), shoeHeel: sphere(0.042, 0.029, 0.022, 16),
    shoe: sphere(0.055, 0.038, 0.112, 24), shoeToe: sphere(0.052, 0.032, 0.065, 20), sole: new THREE.BoxGeometry(0.11, 0.016, 0.235), shoeTongue: sphere(0.026, 0.019, 0.04, 16), lace: downCapsule(0.0025, 0.021, 8),
    bar: (() => { const g = new THREE.CylinderGeometry(0.014, 0.014, 1.6, 12); g.rotateZ(Math.PI / 2); return g; })(), plate: (() => { const g = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 28); g.rotateZ(Math.PI / 2); return g; })(),
};
const M = {
    skin: new THREE.MeshPhysicalMaterial({ color: "#bd8063", roughness: 0.68, metalness: 0, envMapIntensity: 0.72, clearcoat: 0.08, clearcoatRoughness: 0.5 }), skinLight: new THREE.MeshStandardMaterial({ color: "#d39a7d", roughness: 0.66 }), skinShadow: new THREE.MeshStandardMaterial({ color: "#8f5847", roughness: 0.8 }),
    shirt: new THREE.MeshPhysicalMaterial({ color: "#294c62", roughness: 0.82, metalness: 0.015, sheen: 0.24, sheenColor: "#8aa8b6", sheenRoughness: 0.92 }), shirtLight: new THREE.MeshStandardMaterial({ color: "#52788b", roughness: 0.82 }), shirtSeam: new THREE.MeshStandardMaterial({ color: "#a9c0c7", roughness: 0.88 }),
    pants: new THREE.MeshStandardMaterial({ color: "#242b35", roughness: 0.92 }), pantsLight: new THREE.MeshStandardMaterial({ color: "#394451", roughness: 0.92 }), belt: new THREE.MeshStandardMaterial({ color: "#35271f", roughness: 0.65 }), buckle: new THREE.MeshStandardMaterial({ color: "#9da7ae", metalness: 0.72, roughness: 0.35 }),
    shoe: new THREE.MeshStandardMaterial({ color: "#303944", roughness: 0.76 }), sole: new THREE.MeshStandardMaterial({ color: "#171c22", roughness: 0.94 }), lace: new THREE.MeshStandardMaterial({ color: "#c2c8ca", roughness: 0.85 }),
    hair: new THREE.MeshStandardMaterial({ color: "#241a16", roughness: 0.92 }), hairLight: new THREE.MeshStandardMaterial({ color: "#503326", roughness: 0.86 }), kippah: new THREE.MeshPhysicalMaterial({ color: "#172b50", roughness: 0.96, metalness: 0, sheen: 0.24, sheenColor: "#60769a", sheenRoughness: 0.92, side: THREE.DoubleSide }), kippahTrim: new THREE.MeshStandardMaterial({ color: "#9aa8b9", roughness: 0.82 }), tzitzit: new THREE.MeshStandardMaterial({ color: "#f2f0e8", roughness: 0.94 }),
    eyeWhite: new THREE.MeshStandardMaterial({ color: "#eee9df", roughness: 0.28 }), iris: new THREE.MeshStandardMaterial({ color: "#68462e", roughness: 0.28 }), pupil: new THREE.MeshBasicMaterial({ color: "#171310" }), glint: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
    lip: new THREE.MeshStandardMaterial({ color: "#985d51", roughness: 0.65 }), nail: new THREE.MeshStandardMaterial({ color: "#d9b6a3", roughness: 0.62 }), mouth: new THREE.MeshStandardMaterial({ color: "#653b35", roughness: 0.78 }), backpack: new THREE.MeshStandardMaterial({ color: "#b18a58", roughness: 0.9 }), backpackLight: new THREE.MeshStandardMaterial({ color: "#d1ae73", roughness: 0.86 }), zipper: new THREE.MeshStandardMaterial({ color: "#d5c8a4", metalness: 0.72, roughness: 0.32 }), strap: new THREE.MeshStandardMaterial({ color: "#172c38", roughness: 0.9 }), strapClip: new THREE.MeshStandardMaterial({ color: "#c3a66c", metalness: 0.78, roughness: 0.3 }), shoeAccent: new THREE.MeshStandardMaterial({ color: "#92b9c2", roughness: 0.68 }), steel: new THREE.MeshStandardMaterial({ color: "#c9ccd1", metalness: 0.9, roughness: 0.3 }), plate: new THREE.MeshStandardMaterial({ color: "#1d1d1f", roughness: 0.6 }),
};
export const BARBELL = { bar: G.bar, plate: G.plate, steel: M.steel, plateMat: M.plate };
function Face({ r, S }) {
    return _jsxs("group", { ref: r("head"), "position-y": 0.21, children: [
        _jsx("mesh", { geometry: G.skull, material: M.skin, ...S }), _jsx("mesh", { geometry: G.jaw, material: M.skin, position: [0, -0.052, 0.018] }), _jsx("mesh", { geometry: G.chin, material: M.skinLight, position: [0, -0.093, 0.05] }),
        [-1, 1].map((side) => _jsx("mesh", { geometry: sphere(0.029, 0.022, 0.014, 20), material: M.skinLight, position: [side * 0.057, -0.035, 0.072] }, `cheek-${side}`)),
        [-1, 1].map((side) => _jsx("mesh", { geometry: G.dimple, material: M.skinShadow, position: [side * 0.021, -0.064, 0.101] }, `smile-dimple-${side}`)),
        _jsx("mesh", { geometry: G.hairCap, material: M.hair, position: [0, 0.016, -0.006], "rotation-x": -0.28, scale: [1, 1.06, 1.08], ...S }),
        _jsx("mesh", { geometry: G.kippah, material: M.kippah, position: [0, 0.108, -0.007], ...S }),
        _jsx("mesh", { geometry: G.kippahTrim, material: M.kippahTrim, position: [0, 0.109, -0.007], rotation: [Math.PI / 2, 0, 0] }),
        [-1, 1].map((side) => _jsxs("group", { children: [_jsx("mesh", { geometry: G.hairSide, material: M.hair, position: [side * 0.081, -0.005, 0.008] }), _jsx("mesh", { geometry: G.hairLock, material: M.hairLight, position: [side * 0.061, 0.068, 0.036], "rotation-z": side * -0.65, "rotation-x": -0.18 }), _jsx("mesh", { geometry: G.ear, material: M.skin, position: [side * 0.096, 0.002, -0.004] }), _jsx("mesh", { geometry: G.earInner, material: M.skinShadow, position: [side * 0.101, 0.003, 0.007] })] }, side)),
        [-1, 0, 1].map((part) => _jsx("mesh", { geometry: G.hairLock, material: part === 0 ? M.hair : M.hairLight, position: [part * 0.039, 0.084 - Math.abs(part) * 0.006, 0.058], rotation: [-0.12, 0, part * -0.24], scale: [0.82, 0.92, 0.85] }, `fringe-${part}`)),
        [-1, 1].map((side) => _jsx("mesh", { geometry: G.hairStrand, material: M.hairLight, position: [side * 0.049, 0.095, 0.035], rotation: [0.08, 0, side * -0.48] }, `hair-highlight-${side}`)),
        _jsx("group", { ref: r("eyes"), position: [0, 0.018, 0.087], children: [-1, 1].map((side) => _jsxs("group", { position: [side * 0.036, 0, 0], children: [
            _jsx("mesh", { geometry: G.eyeSocket, material: M.skinShadow, "position-z": -0.001 }), _jsx("mesh", { geometry: G.eye, material: M.eyeWhite }), _jsx("mesh", { geometry: G.iris, material: M.iris, position: [0, -0.0005, 0.010] }), _jsx("mesh", { geometry: G.pupil, material: M.pupil, position: [0, -0.0005, 0.014] }), _jsx("mesh", { geometry: G.eyeGlint, material: M.glint, position: [-0.0025, 0.003, 0.016] }), _jsx("mesh", { geometry: G.eyelid, material: M.skinLight, "position-z": 0.001 }), _jsx("mesh", { geometry: G.brow, material: M.hair, position: [0, 0.027, 0.006], "rotation-z": side * -0.09 })
        ] }, side)) }),
        _jsx("mesh", { geometry: G.noseBridge, material: M.skinLight, position: [0, -0.005, 0.101] }), _jsx("mesh", { geometry: G.noseTip, material: M.skin, position: [0, -0.026, 0.113] }),
        [-1, 1].map((side) => _jsx("mesh", { geometry: G.nostril, material: M.skinShadow, position: [side * 0.008, -0.032, 0.121] }, side)),
        _jsx("mesh", { geometry: G.philtrum, material: M.skinShadow, position: [0, -0.041, 0.095] }), _jsx("mesh", { geometry: G.lipUpper, material: M.lip, position: [0, -0.064, 0.097] }), _jsx("mesh", { geometry: G.lipLower, material: M.lip, position: [0, -0.073, 0.097] }), _jsx("mesh", { geometry: G.smile, material: M.mouth })
    ] });
}
export function Human({ rig }) {
    const r = (key) => (o) => { if (o) rig[key] = o; }, S = { castShadow: true, receiveShadow: true };
    return _jsxs("group", { ref: r("root"), scale: 0.95, children: [
        _jsxs("group", { ref: r("hips"), "position-y": 0.95, children: [
            _jsx("mesh", { geometry: G.pelvis, material: M.pants, scale: [1, 0.76, 0.78], ...S }),
            _jsx("mesh", { geometry: G.belt, material: M.belt, "position-y": 0.055, scale: [1, 1, 0.78] }),
            _jsx("mesh", { geometry: G.pocket, material: M.buckle, position: [0, 0.055, 0.119], scale: [0.35, 0.5, 0.55] }),
            [-1, 1].map((side, i) => _jsxs("group", { ref: r("thigh" + i), position: [side * 0.092, -0.015, 0], children: [
                _jsx("mesh", { geometry: G.thigh, material: M.pants, ...S }), _jsx("mesh", { geometry: G.pantSeam, material: M.pantsLight, position: [side * -0.025, -0.12, 0.047], "rotation-z": 0.02 }),
                _jsxs("group", { ref: r("knee" + i), "position-y": -0.41, children: [
                    _jsx("mesh", { geometry: G.knee, material: M.pants, ...S }), _jsx("mesh", { geometry: G.shin, material: M.pants, ...S }), _jsx("mesh", { geometry: G.calf, material: M.pants, position: [0, -0.22, -0.005], scale: [0.96, 1.05, 0.94] }), _jsx("mesh", { geometry: G.pantSeam, material: M.pantsLight, position: [side * -0.017, -0.13, 0.039] }),
                    _jsxs("group", { ref: r("ankle" + i), "position-y": -0.42, children: [
                        _jsx("mesh", { geometry: G.ankle, material: M.skin }), _jsx("mesh", { geometry: G.sole, material: M.sole, position: [0, -0.066, 0.043], ...S }), _jsx("mesh", { geometry: G.shoe, material: M.shoe, position: [0, -0.032, 0.038], ...S }), _jsx("mesh", { geometry: G.shoeToe, material: M.shoe, position: [0, -0.023, 0.091] }), _jsx("mesh", { geometry: G.shoeTongue, material: M.pantsLight, position: [0, 0.001, 0.022] }),
                        _jsx("mesh", { geometry: G.shoeHeel, material: M.shoeAccent, position: [0, -0.002, -0.045] }),
                        _jsx("mesh", { geometry: G.shoeStripe, material: M.shoeAccent, position: [0, 0.003, 0.052] }),
                        [-0.012, 0.012].map((x, j) => _jsx("mesh", { geometry: G.lace, material: M.lace, position: [x, 0.012, 0.035 + j * 0.026], "rotation-x": Math.PI / 2, "rotation-z": x * 8 }, j))
                    ] })
                ] })
            ] }, side)),
            _jsxs("group", { ref: r("spine"), "position-y": 0.05, children: [
                _jsx("mesh", { ref: r("chest"), geometry: G.torso, material: M.shirt, scale: [1, 1, 0.68], ...S }),
                // A compact travel backpack with stitched pocket, top flap and shoulder straps.
                _jsx("mesh", { geometry: G.backpack, material: M.backpack, position: [0, 0.24, -0.105], scale: [1.0, 1.0, 0.88], ...S }),
                _jsx("mesh", { geometry: G.backpackPocket, material: M.backpackLight, position: [0, 0.17, -0.164], scale: [1.0, 1.0, 0.72] }),
                _jsx("mesh", { geometry: G.zipTrack, material: M.zipper, position: [0, 0.29, -0.18] }),
                _jsx("mesh", { geometry: G.backpackPocket, material: M.backpackLight, position: [0, 0.392, -0.105], scale: [0.72, 0.35, 0.58] }),
                [-1, 1].map((side) => _jsxs("group", { children: [
                    _jsx("mesh", { geometry: G.backpackStrap, material: M.strap, position: [side * 0.122, 0.42, 0.086], rotation: [0, 0, side * -0.12] }),
                    _jsx("mesh", { geometry: G.strapClip, material: M.strapClip, position: [side * 0.12, 0.235, 0.108] })
                ] }, `bag-strap-${side}`)),
                _jsx("mesh", { geometry: G.zipTrack, material: M.zipper, position: [0, 0.262, 0.124] }),
                _jsx("mesh", { geometry: G.zipPull, material: M.zipper, position: [0, 0.154, 0.129] }),
                [-1, 1].map((side) => _jsx("mesh", { geometry: G.drawstring, material: M.shirtSeam, position: [side * 0.024, 0.465, 0.109], rotation: [0, 0, side * -0.08] }, `hood-string-${side}`)),
                _jsx("mesh", { geometry: G.pocket, material: M.shirtLight, position: [-0.092, 0.29, 0.105], scale: [0.72, 0.72, 0.7] }), _jsx("mesh", { geometry: G.pocket, material: M.shirtSeam, position: [-0.092, 0.29, 0.110], scale: [0.62, 0.62, 0.45] }),
                [0.19, 0.25, 0.31].map((y) => _jsx("mesh", { geometry: G.button, material: M.buckle, position: [0, y, 0.112] }, y)),
                _jsx("mesh", { geometry: G.collar, material: M.shirtLight, position: [0, 0.495, 0], "rotation-x": Math.PI / 2 }), _jsx("mesh", { geometry: G.shirtHem, material: M.shirtLight, "position-y": 0.018, "rotation-x": Math.PI / 2, scale: [1, 0.68, 1] }),
                [[-0.12, 0.075], [0.12, 0.075], [-0.12, -0.075], [0.12, -0.075]].map(([x, z], corner) => _jsxs("group", { position: [x, 0.004, z], children: [
                    _jsx("mesh", { geometry: G.tzitzitLoop, material: M.tzitzit, rotation: [Math.PI / 2, 0, 0] }),
                    ...Array.from({ length: 4 }, (_, strand) => _jsx("mesh", { geometry: G.tzitzitCord, material: M.tzitzit, position: [(strand - 1.5) * 0.004, -0.103, ((strand % 2) - 0.5) * 0.006], rotation: [0, 0, (strand - 1.5) * 0.035] }, `tz-string-${strand}`)),
                    ...[-0.035, -0.068, -0.101].map((y, knot) => _jsx("mesh", { geometry: G.tzitzitKnot, material: M.tzitzit, position: [0, y, 0] }, `tz-knot-${knot}`))
                ] }, `tzitzit-${corner}`)),
                [-1, 1].map((side) => _jsxs("group", { children: [_jsx("mesh", { geometry: G.shoulderSeam, material: M.shirtSeam, position: [side * 0.166, 0.427, 0], "rotation-x": Math.PI / 2 }), _jsx("mesh", { geometry: G.shirtFold, material: M.shirtLight, position: [side * 0.045, 0.105, 0.105], "rotation-z": side * 0.22 })] }, `shirt-detail-${side}`)),
                [-1, 1].map((side, i) => _jsxs("group", { ref: r("shoulder" + i), position: [side * 0.19, 0.43, 0], children: [
                    _jsx("mesh", { geometry: G.shoulder, material: M.shirt, scale: [1, 0.96, 1], ...S }), _jsx("mesh", { geometry: G.sleeve, material: M.shirtLight, position: [0, -0.012, 0], ...S }), _jsx("mesh", { geometry: G.upperArm, material: M.skin, ...S }), _jsx("mesh", { geometry: sphere(0.047, 0.115, 0.047, 18), material: M.skin, position: [0, -0.16, 0] }),
                    _jsxs("group", { ref: r("elbow" + i), "position-y": -0.28, children: [
                        _jsx("mesh", { geometry: G.elbow, material: M.skinLight }), _jsx("mesh", { geometry: G.forearm, material: M.skin, ...S }), _jsx("mesh", { geometry: sphere(0.034, 0.1, 0.036, 18), material: M.skinLight, position: [0, -0.14, 0] }), _jsx("mesh", { geometry: G.cuff, material: M.shirtLight, "position-y": -0.018 }),
                        _jsxs("group", { ref: r("hand" + i), "position-y": -0.25, children: [
                            _jsx("mesh", { geometry: G.wrist, material: M.skin, "position-y": 0.005 }), _jsx("mesh", { geometry: G.palm, material: M.skin, "position-y": -0.045, scale: [0.82, 1.08, 1.0] }),
                            [-0.019, -0.006, 0.007, 0.020].map((fz, fingerIndex) => _jsxs("group", { position: [0, -0.081, fz], "rotation-x": 0.035 + fingerIndex * 0.012, children: [
                                _jsx("mesh", { geometry: G.finger, material: M.skin }), _jsx("mesh", { geometry: G.knuckle, material: M.skinLight, "position-y": -0.028 }),
                                _jsxs("group", { "position-y": -0.032, children: [
                                    _jsx("mesh", { geometry: G.fingerMid, material: M.skin }), _jsx("mesh", { geometry: G.knuckle, material: M.skinLight, "position-y": -0.021, scale: 0.78 }),
                                    _jsxs("group", { "position-y": -0.025, children: [_jsx("mesh", { geometry: G.fingerDistal, material: M.skin }), _jsx("mesh", { geometry: G.fingerTip, material: M.skinLight, "position-y": -0.018 }), _jsx("mesh", { geometry: G.fingernail, material: M.nail, position: [0, -0.016, 0.006] })] })
                                ] })
                            ] }, fz)),
                            _jsxs("group", { position: [side * -0.03, -0.054, 0.028], "rotation-x": 0.35, "rotation-z": side * -0.55, children: [_jsx("mesh", { geometry: G.thumb, material: M.skin }), _jsx("mesh", { geometry: G.thumbTip, material: M.skinLight, "position-y": -0.033 }), _jsx("mesh", { geometry: G.fingernail, material: M.nail, position: [0, -0.033, 0.008] })] })
                        ] })
                    ] })
                ] }, side)),
                _jsxs("group", { ref: r("neck"), "position-y": 0.49, children: [_jsx("mesh", { geometry: G.neck, material: M.skin, "position-y": 0.06, ...S }), _jsx(Face, { r, S })] })
            ] })
        ] }),
        _jsxs("group", { ref: r("bar"), visible: false, children: [_jsx("mesh", { geometry: G.bar, material: M.steel, castShadow: true }), _jsx("mesh", { geometry: G.plate, material: M.plate, "position-x": -0.62, castShadow: true }), _jsx("mesh", { geometry: G.plate, material: M.plate, "position-x": 0.62, castShadow: true })] })
    ] });
}
const lerp = THREE.MathUtils.lerp, tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
let blinkT = 2.4;
/** Apply animation to the same joint pivots already consumed by Game.tsx. */
export function poseHuman(R, P) {
    if (!R.root || !R.thigh0 || !R.thigh1 || !R.knee0 || !R.knee1 || !R.ankle0 || !R.ankle1 || !R.shoulder0 || !R.shoulder1 || !R.elbow0 || !R.elbow1 || !R.hips || !R.spine || !R.chest || !R.head || !R.bar) return;
    const th = [R.thigh0, R.thigh1], kn = [R.knee0, R.knee1], an = [R.ankle0, R.ankle1], sh = [R.shoulder0, R.shoulder1], el = [R.elbow0, R.elbow1], side = [-1, 1], breath = Math.sin(P.t * 1.55);
    R.chest.scale.set(1 + breath * 0.009, 1 + breath * 0.004, 0.68 + breath * 0.009);
    R.head.rotation.set(0, 0, 0); R.spine.rotation.set(0, 0, 0); R.hips.position.y = 0.95; R.bar.visible = false;
    for (let i = 0; i < 2; i++) { sh[i].rotation.set(0, 0, side[i] * 0.055); el[i].rotation.set(0, 0, 0); an[i].rotation.set(0, 0, 0); }
    if (P.mode === "walk" && !P.air) {
        const amp = Math.min(1, P.speed / 4.2), run = THREE.MathUtils.clamp((P.speed - 4.5) / 3.5, 0, 1), swing = Math.sin(P.phase);
        for (let i = 0; i < 2; i++) {
            const ph = P.phase + (i ? Math.PI : 0), wave = Math.sin(ph);
            th[i].rotation.x = -wave * (0.47 + 0.3 * run) * amp;
            kn[i].rotation.x = amp * (0.06 + Math.max(0, Math.cos(ph)) * (0.62 + 0.65 * run));
            an[i].rotation.x = -th[i].rotation.x * 0.32 - kn[i].rotation.x * 0.18;
            sh[i].rotation.x = wave * (0.39 + 0.22 * run) * amp + Math.sin(P.t + i) * 0.025 * (1 - amp);
            el[i].rotation.x = -(0.12 + 0.22 * amp + 0.72 * run);
        }
        R.spine.rotation.x = 0.025 * amp + 0.12 * run; R.spine.rotation.y = swing * 0.065 * amp;
        R.head.rotation.x = -R.spine.rotation.x * 0.45 + Math.sin(P.t * 1.2) * 0.012;
        R.head.rotation.y = Math.sin(P.t * 0.55) * 0.025;
        R.head.rotation.z = Math.sin(P.t * 0.72) * 0.018 * (1 - amp);
        R.hips.position.y = 0.95 - Math.abs(Math.cos(P.phase)) * 0.026 * amp - run * 0.025;
    } else if (P.mode === "walk" && P.air) {
        th[0].rotation.x = -0.7; kn[0].rotation.x = 0.95; th[1].rotation.x = -0.12; kn[1].rotation.x = 0.42;
        for (let i = 0; i < 2; i++) { sh[i].rotation.set(-0.42, 0, side[i] * 0.38); el[i].rotation.x = -0.48; an[i].rotation.x = 0.12; }
        R.spine.rotation.x = 0.08;
    } else if (P.mode === "sit" || P.mode === "heli" || P.mode === "car") {
        R.hips.position.y = P.mode === "heli" ? 0.56 : P.mode === "car" ? 0.6 : 0.55;
        for (let i = 0; i < 2; i++) {
            th[i].rotation.set(-Math.PI / 2, 0, side[i] * 0.055); kn[i].rotation.x = Math.PI / 2; an[i].rotation.x = -0.12;
            if (P.mode === "heli") { sh[i].rotation.set(-0.78, 0, side[i] * 0.11); el[i].rotation.x = -0.48; }
            else if (P.mode === "car") { sh[i].rotation.set(-0.82, 0, side[i] * 0.08); el[i].rotation.x = -0.32; }
            else { sh[i].rotation.set(-0.32, 0, side[i] * 0.1); el[i].rotation.x = -0.78; }
        }
        R.spine.rotation.x = P.mode === "sit" ? -0.1 : P.mode === "car" ? 0.04 : 0.025;
        R.head.rotation.x = P.mode === "sit" ? 0.055 : 0; R.head.rotation.y = P.mode === "sit" ? Math.sin(P.t * 0.35) * 0.22 : Math.sin(P.t * 0.45) * 0.08;
    } else if (P.mode === "lift") {
        const cycle = 0.5 - 0.5 * Math.cos((P.t * Math.PI * 2) / 2.6);
        for (let i = 0; i < 2; i++) {
            th[i].rotation.set(-0.22 * (1 - cycle), 0, side[i] * 0.08); kn[i].rotation.x = 0.42 * (1 - cycle); an[i].rotation.x = -0.2 * (1 - cycle);
            sh[i].rotation.set(lerp(-1.18, -2.75, cycle), 0, side[i] * lerp(0.38, 0.18, cycle)); el[i].rotation.x = lerp(-1.9, -0.1, cycle);
        }
        R.hips.position.y = 0.95 - 0.1 * (1 - cycle); R.spine.rotation.x = -0.045 * cycle; R.head.rotation.x = -0.08 * cycle;
        R.root.updateMatrixWorld(true);
        if (R.hand0 && R.hand1) { R.hand0.getWorldPosition(tmp); R.hand1.getWorldPosition(tmp2); tmp.add(tmp2).multiplyScalar(0.5); R.root.worldToLocal(tmp); R.bar.position.copy(tmp).y -= 0.055; R.bar.visible = true; }
    }
    blinkT -= P.dt;
    if (R.eyes) { const blink = blinkT < 0.13 ? THREE.MathUtils.clamp(blinkT / 0.13, 0.08, 1) : 1; R.eyes.scale.y = blink; }
    if (blinkT < 0) blinkT = 2.4 + Math.random() * 3.2;
}
