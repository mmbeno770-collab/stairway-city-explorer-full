import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
const red = new THREE.MeshStandardMaterial({ color: "#c62828", metalness: .35, roughness: .32 });
const white = new THREE.MeshStandardMaterial({ color: "#eeeeee", metalness: .2, roughness: .4 });
const dark = new THREE.MeshStandardMaterial({ color: "#222428", metalness: .6, roughness: .45 });
const glass = new THREE.MeshPhysicalMaterial({ color: "#9fd3ea", transparent: true, opacity: .35, roughness: .05, metalness: .2, depthWrite: false });
const disc = new THREE.MeshBasicMaterial({ color: "#333", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
const navR = new THREE.MeshBasicMaterial({ color: "#ff3b30", toneMapped: false }), navG = new THREE.MeshBasicMaterial({ color: "#34c759", toneMapped: false });
function HeliModel({ h }) {
    const root = useRef(null), rotor = useRef(null), tail = useRef(null), discRef = useRef(null), beacon = useRef(null);
    useFrame(({ camera, clock }) => {
        const g = root.current; if (!g) return;
        g.visible = camera.position.distanceTo(g.position) < 180; if (!g.visible) return;
        g.position.set(h.x, h.y, h.z); g.rotation.set(h.pitch, h.yaw, h.roll, "YXZ");
        if (rotor.current) rotor.current.rotation.y = h.rotA;
        if (tail.current) tail.current.rotation.x = h.trA;
        if (discRef.current) discRef.current.material.opacity = Math.max(0, h.rotor - .4) * .3;
        if (beacon.current) beacon.current.visible = h.rotor > .05 && Math.sin(clock.elapsedTime * 6) > .4;
    });
    const shadow = { castShadow: true };
    return _jsxs("group", { ref: root, children: [
        [-1, 1].map(side => _jsxs("group", { children: [
            _jsx("mesh", { material: dark, position: [side * .9, .06, .1], "rotation-x": Math.PI / 2, ...shadow, children: _jsx("cylinderGeometry", { args: [.05, .05, 3.4, 8] }) }),
            _jsx("mesh", { material: dark, position: [side * .9, .12, 1.82], "rotation-x": Math.PI / 2 + .6, children: _jsx("cylinderGeometry", { args: [.05, .05, .3, 8] }) }),
            [-.8, .9].map(z => _jsx("mesh", { material: dark, position: [side * .78, .4, z], "rotation-z": side * .35, children: _jsx("cylinderGeometry", { args: [.04, .04, .72, 6] }) }, z))
        ] }, side)),
        _jsx("mesh", { material: red, position: [0, 1, .1], scale: [1.05, .55, 1.8], ...shadow, children: _jsx("sphereGeometry", { args: [1, 32, 20] }) }),
        _jsx("mesh", { material: white, position: [0, .82, .1], scale: [1.07, .3, 1.75], children: _jsx("sphereGeometry", { args: [1, 32, 12] }) }),
        _jsx("mesh", { material: glass, position: [0, 1.55, .55], scale: [.95, .78, 1.15], children: _jsx("sphereGeometry", { args: [1, 32, 20] }) }),
        _jsx("mesh", { material: red, position: [0, 1.78, -.7], scale: [.62, .38, 1.05], ...shadow, children: _jsx("sphereGeometry", { args: [1, 24, 14] }) }),
        _jsx("mesh", { material: dark, position: [0, 1.85, -1.55], "rotation-x": Math.PI / 2, children: _jsx("cylinderGeometry", { args: [.18, .24, .4, 14] }) }),
        _jsx("mesh", { material: red, position: [0, 1.45, -3.3], "rotation-x": Math.PI / 2, ...shadow, children: _jsx("cylinderGeometry", { args: [.26, .11, 4.4, 14] }) }),
        _jsx("mesh", { material: white, position: [0, 1.45, -2.6], "rotation-x": Math.PI / 2, children: _jsx("cylinderGeometry", { args: [.24, .22, .3, 14] }) }),
        _jsx("mesh", { material: red, position: [0, 1.95, -5.35], "rotation-x": -.35, ...shadow, children: _jsx("boxGeometry", { args: [.06, 1.1, .6] }) }),
        _jsx("mesh", { material: red, position: [0, 1.42, -4.8], children: _jsx("boxGeometry", { args: [1.4, .05, .4] }) }),
        _jsx("mesh", { material: navR, position: [.72, 1.42, -4.8], children: _jsx("sphereGeometry", { args: [.05, 8, 6] }) }),
        _jsx("mesh", { material: navG, position: [-.72, 1.42, -4.8], children: _jsx("sphereGeometry", { args: [.05, 8, 6] }) }),
        _jsxs("group", { ref: tail, position: [.1, 2.05, -5.45], children: [
            _jsx("mesh", { material: dark, children: _jsx("boxGeometry", { args: [.03, 1.15, .12] }) }),
            _jsx("mesh", { material: dark, "rotation-x": Math.PI / 2, children: _jsx("boxGeometry", { args: [.03, 1.15, .12] }) })
        ] }),
        _jsx("mesh", { material: dark, position: [0, 2.15, -.25], children: _jsx("cylinderGeometry", { args: [.07, .09, .4, 10] }) }),
        _jsx("mesh", { ref: beacon, material: navR, position: [0, 1.86, -2.2], children: _jsx("sphereGeometry", { args: [.07, 8, 6] }) }),
        _jsxs("group", { ref: rotor, position: [0, 2.36, -.25], children: [
            _jsx("mesh", { material: dark, children: _jsx("cylinderGeometry", { args: [.16, .16, .12, 12] }) }),
            [0, 1, 2, 3].map(i => _jsx("group", { "rotation-y": i * Math.PI / 2, children: _jsx("mesh", { material: dark, position: [0, 0, 2.15], castShadow: true, children: _jsx("boxGeometry", { args: [.28, .035, 4.1] }) }) }, i)),
            _jsx("mesh", { ref: discRef, material: disc, "rotation-x": -Math.PI / 2, children: _jsx("circleGeometry", { args: [4.2, 40] }) })
        ] })
    ] });
}
export function Helicopters({ helis }) { return _jsx(_Fragment, { children: helis.map((h, i) => _jsx(HeliModel, { h }, i)) }); }
