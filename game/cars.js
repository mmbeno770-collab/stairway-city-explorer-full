import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
const glass = new THREE.MeshPhysicalMaterial({ color: "#8bb8ce", transparent: true, opacity: .72, roughness: .16, metalness: .12 });
const rubber = new THREE.MeshStandardMaterial({ color: "#15191d", roughness: .92 });
const rim = new THREE.MeshStandardMaterial({ color: "#aeb8bf", metalness: .85, roughness: .25 });
const trim = new THREE.MeshStandardMaterial({ color: "#252a30", metalness: .45, roughness: .48 });
const headlamp = new THREE.MeshBasicMaterial({ color: "#fff1c4", toneMapped: false });
const tailOff = new THREE.MeshStandardMaterial({ color: "#771c1c", emissive: "#250606", roughness: .4 });
const tailOn = new THREE.MeshStandardMaterial({ color: "#ff3030", emissive: "#ff1111", emissiveIntensity: 1.8 });
function makeWheelParts(radius, width) {
    const spokes = [-1, 1].flatMap((side) => Array.from({ length: 6 }, (_, index) => {
        const angle = index * Math.PI / 3;
        return _jsx("mesh", {
            material: rim,
            position: [Math.cos(angle) * radius * .39, side * (width / 2 + .027), Math.sin(angle) * radius * .39],
            rotation: [0, -angle, 0],
            children: _jsx("boxGeometry", { args: [radius * .62, .026, .038] })
        }, `spoke-${side}-${index}`);
    }));
    return _jsxs(_Fragment, { children: [
        _jsx("mesh", { material: rubber, castShadow: true, children: _jsx("cylinderGeometry", { args: [radius, radius, width, 24] }) }),
        _jsx("mesh", { material: rim, children: _jsx("cylinderGeometry", { args: [radius * .72, radius * .72, width + .012, 24] }) }),
        ...[-1, 1].map((side) => _jsx("mesh", {
            material: rim, position: [0, side * (width / 2 + .018), 0], rotation: [Math.PI / 2, 0, 0],
            children: _jsx("torusGeometry", { args: [radius * .69, .026, 8, 24] })
        }, `rim-ring-${side}`)),
        ...spokes,
        ...[-1, 1].map((side) => _jsx("mesh", {
            material: trim, position: [0, side * (width / 2 + .031), 0],
            children: _jsx("cylinderGeometry", { args: [radius * .24, radius * .24, .035, 16] })
        }, `hub-${side}`))
    ] });
}
function CarModel({ car }) {
    const root = useRef(null), wheels = useRef([]), steerWheels = useRef([]), brakes = useRef([]);
    useFrame((_, dt) => {
        if (!root.current) return;
        root.current.position.set(car.x, car.y, car.z); root.current.rotation.y = car.yaw;
        for (const wheel of wheels.current) if (wheel) wheel.rotation.y += car.speed * dt / .34;
        for (const wheel of steerWheels.current) if (wheel) wheel.rotation.y = (car.steering || 0) * .48;
        for (const lamp of brakes.current) if (lamp) lamp.material = car.brake || car.speed < -.1 ? tailOn : tailOff;
    });
    const bodyMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: car.color, metalness: .38, roughness: .24, clearcoat: .92, clearcoatRoughness: .16, envMapIntensity: 1.45 }), [car.color]);
    if (car.kind === "bus") {
        const busWindows = [-2.35, -1.15, .05, 1.25, 2.35].flatMap((z) => [-1, 1].map((side) =>
            _jsx("mesh", { material: glass, position: [side * 1.235, 1.72, z], children: _jsx("boxGeometry", { args: [.035, .82, .9] }) }, `window-${z}-${side}`)
        ));
        const busWheels = [-1, 1].flatMap((side) => [-2.25, 0, 2.25].map((z, i) => {
            const index = (side < 0 ? 0 : 3) + i;
            return _jsx("group", {
                ref: (el) => { if (i === 2 && el) steerWheels.current[index] = el; },
                position: [side * 1.24, .46, z],
                children: _jsx("group", {
                    ref: (el) => { if (el) wheels.current[index] = el; },
                    "rotation-z": Math.PI / 2,
                    children: makeWheelParts(.44, .25)
                })
            }, `bus-wheel-${side}-${z}`);
        }));
        return _jsxs("group", { ref: root, children: [
            _jsx("mesh", { material: bodyMat, position: [0, 1.2, 0], castShadow: true, receiveShadow: true, children: _jsx("boxGeometry", { args: [2.45, 2.05, 6.55] }) }),
            _jsx("mesh", { material: bodyMat, position: [0, 2.25, -.05], children: _jsx("boxGeometry", { args: [2.38, .15, 6.4] }) }),
            _jsx("mesh", { material: glass, position: [0, 1.85, 3.29], children: _jsx("boxGeometry", { args: [2.08, .7, .04] }) }),
            ...busWindows,
            _jsx("mesh", { material: trim, position: [0, .4, 3.3], children: _jsx("boxGeometry", { args: [2.5, .2, .16] }) }),
            _jsx("mesh", { material: headlamp, position: [-.82, 1.05, 3.31], children: _jsx("boxGeometry", { args: [.32, .18, .04] }) }),
            _jsx("mesh", { material: headlamp, position: [.82, 1.05, 3.31], children: _jsx("boxGeometry", { args: [.32, .18, .04] }) }),
            ...busWheels
        ] });
    }
    if (car.kind === "tank") {
        return _jsxs("group", { ref: root, children: [
            ...[-1, 1].map((side) => _jsxs("group", { position: [side * 1.75, .55, 0], children: [
                _jsx("mesh", { material: trim, castShadow: true, children: _jsx("boxGeometry", { args: [.48, .9, 5.35] }) }),
                ...[-2, -1, 0, 1, 2].map((z) => _jsx("mesh", { material: rubber, position: [0, 0, z], children: _jsx("cylinderGeometry", { args: [.33, .33, .5, 16] }) }, z))
            ] }, side)),
            _jsx("mesh", { material: bodyMat, position: [0, .92, 0], castShadow: true, receiveShadow: true, children: _jsx("boxGeometry", { args: [3.45, 1.05, 4.95] }) }),
            _jsx("mesh", { material: bodyMat, position: [0, 1.58, -.25], castShadow: true, children: _jsx("cylinderGeometry", { args: [1.05, 1.2, .48, 18] }) }),
            _jsx("mesh", { material: trim, position: [0, 1.85, -.25], children: _jsx("boxGeometry", { args: [1.15, .38, 1.35] }) })
        ] });
    }
    const extra = [];
    if (car.kind === "jeep") extra.push(
        _jsx("mesh", { material: bodyMat, position: [0, 1.48, -.18], children: _jsx("boxGeometry", { args: [1.62, .86, 2.0] }) }),
        _jsx("mesh", { material: glass, position: [0, 1.62, .86], children: _jsx("boxGeometry", { args: [1.5, .46, .045] }) }),
        _jsx("mesh", { material: trim, position: [0, 1.98, -.15], children: _jsx("boxGeometry", { args: [1.74, .09, 2.15] }) }),
        _jsx("mesh", { material: bodyMat, position: [0, 1.15, -2.28], rotation: [Math.PI / 2, 0, 0], children: _jsx("cylinderGeometry", { args: [.48, .48, .2, 18] }) })
    );
    if (car.kind === "race") extra.push(
        _jsx("mesh", { material: trim, position: [0, 1.0, -1.92], children: _jsx("boxGeometry", { args: [2.2, .09, .18] }) }),
        _jsx("mesh", { material: bodyMat, position: [-.88, 1.16, -1.92], children: _jsx("boxGeometry", { args: [.1, .62, .12] }) }),
        _jsx("mesh", { material: bodyMat, position: [.88, 1.16, -1.92], children: _jsx("boxGeometry", { args: [.1, .62, .12] }) }),
        _jsx("mesh", { material: bodyMat, position: [0, .88, .02], children: _jsx("boxGeometry", { args: [1.94, .12, 3.55] }) })
    );
    return _jsxs("group", { ref: root, children: [
        _jsx("mesh", { material: bodyMat, position: [0, .62, 0], castShadow: true, receiveShadow: true, children: _jsx("boxGeometry", { args: [1.88, .58, 4.15] }) }),
        _jsx("mesh", { material: bodyMat, position: [0, .91, 1.28], scale: [1, .58, 1], castShadow: true, children: _jsx("boxGeometry", { args: [1.78, .56, 1.35] }) }),
        _jsx("mesh", { material: bodyMat, position: [0, .91, -1.58], scale: [1, .55, 1], castShadow: true, children: _jsx("boxGeometry", { args: [1.8, .52, 1.05] }) }),
        _jsx("mesh", { material: glass, position: [0, 1.27, -.12], castShadow: true, children: _jsx("boxGeometry", { args: [1.52, .72, 1.92] }) }),
        _jsx("mesh", { material: trim, position: [0, 1.63, -.12], children: _jsx("boxGeometry", { args: [1.58, .075, 2.0] }) }),
        _jsx("mesh", { material: trim, position: [0, 1.03, .84], children: _jsx("boxGeometry", { args: [1.82, .085, .08] }) }),
        _jsx("mesh", { material: trim, position: [0, 1.02, -1.08], children: _jsx("boxGeometry", { args: [1.82, .08, .08] }) }),
        _jsx("mesh", { material: trim, position: [0, .47, 2.1], children: _jsx("boxGeometry", { args: [1.75, .22, .12] }) }),
        _jsx("mesh", { material: trim, position: [0, .47, -2.1], children: _jsx("boxGeometry", { args: [1.75, .22, .12] }) }),
        _jsx("mesh", { material: trim, position: [0, .68, 2.095], children: _jsx("boxGeometry", { args: [.78, .22, .025] }) }),
        [-.64, .64].map(x => _jsx("mesh", { material: headlamp, position: [x, .82, 2.09], children: _jsx("boxGeometry", { args: [.34, .16, .035] }) }, x)),
        [-.9, .9].map(x => _jsx("mesh", { material: trim, position: [x, 1.18, .75], children: _jsx("boxGeometry", { args: [.17, .12, .28] }) }, x)),
        [-.72, .72].map((x, i) => _jsx("mesh", { ref: el => { if (el) brakes.current[i] = el; }, material: tailOff, position: [x, .82, -2.095], children: _jsx("boxGeometry", { args: [.34, .19, .04] }) }, i)),
        [-1, 1].flatMap(side => [-1, 1].map(axle => {
            const index = (side === -1 ? 0 : 2) + (axle === -1 ? 0 : 1);
            return _jsx("group", {
                ref: (el) => { if (axle === 1 && el) steerWheels.current[index] = el; },
                position: [side * .96, .34, axle * 1.35],
                children: _jsx("group", {
                    ref: (el) => { if (el) wheels.current[index] = el; },
                    "rotation-z": Math.PI / 2,
                    children: makeWheelParts(.34, .2)
                })
            }, `${side}-${axle}`);
        })),
        _jsx("mesh", { material: bodyMat, position: [-1.03, 1.15, .8], children: _jsx("boxGeometry", { args: [.22, .12, .25] }) }),
        _jsx("mesh", { material: bodyMat, position: [1.03, 1.15, .8], children: _jsx("boxGeometry", { args: [.22, .12, .25] }) }),
        ...extra
    ] });
}
export function Cars({ cars }) { return _jsx(_Fragment, { children: cars.map((car, i) => _jsx(CarModel, { car }, i)) }); }
