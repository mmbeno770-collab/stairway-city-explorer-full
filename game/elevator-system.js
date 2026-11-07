import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
/** A light lift car with synchronized floor landing doors. */
export function ElevatorModel({ layout, y, moving }) {
    const cab = useRef(null);
    const railHeight = Math.max(2.5, (layout.floors - 1) * 4 + 2.5), railCenter = railHeight / 2;
    useFrame(() => { if (cab.current) cab.current.position.y = y.current; });
    return _jsxs(_Fragment, { children: [
        _jsxs("mesh", { position: [layout.x - 1.38, railCenter, layout.z - 1.35], children: [_jsx("boxGeometry", { args: [.12, railHeight, .12] }), _jsx("meshStandardMaterial", { color: "#596a75", metalness: .78, roughness: .28 })] }),
        _jsxs("mesh", { position: [layout.x + 1.38, railCenter, layout.z + 1.35], children: [_jsx("boxGeometry", { args: [.12, railHeight, .12] }), _jsx("meshStandardMaterial", { color: "#596a75", metalness: .78, roughness: .28 })] }),
        _jsxs("mesh", { position: [layout.x, railCenter, layout.z - 1.38], children: [_jsx("boxGeometry", { args: [2.7, railHeight, .12] }), _jsx("meshStandardMaterial", { color: "#596a75", metalness: .78, roughness: .28 })] }),
        _jsxs("group", { ref: cab, position: [layout.x, y.current, layout.z], children: [
            _jsxs("mesh", { position: [0, .12, 0], receiveShadow: true, children: [_jsx("boxGeometry", { args: [2.45, .22, 2.45] }), _jsx("meshStandardMaterial", { color: "#657681", metalness: .55, roughness: .35 })] }),
            _jsxs("mesh", { position: [1.12, 1.48, 0], castShadow: true, children: [_jsx("boxGeometry", { args: [.14, 2.8, 2.35] }), _jsx("meshStandardMaterial", { color: "#87949c", metalness: .45, roughness: .42 })] }),
            _jsxs("mesh", { position: [0, 1.48, -1.12], castShadow: true, children: [_jsx("boxGeometry", { args: [2.2, 2.8, .14] }), _jsx("meshStandardMaterial", { color: "#87949c", metalness: .45, roughness: .42 })] }),
            _jsxs("mesh", { position: [0, 1.48, 1.12], castShadow: true, children: [_jsx("boxGeometry", { args: [2.2, 2.8, .14] }), _jsx("meshStandardMaterial", { color: "#87949c", metalness: .45, roughness: .42 })] }),
            _jsxs("mesh", { position: [.15, 2.82, 0], children: [_jsx("boxGeometry", { args: [2.25, .12, 2.25] }), _jsx("meshStandardMaterial", { color: "#aab4bb", metalness: .35, roughness: .4 })] }),
            _jsxs("mesh", { position: [1.035, 1.65, -.58], children: [_jsx("boxGeometry", { args: [.025, .45, .35] }), _jsx("meshStandardMaterial", { color: "#43d4c5", emissive: "#147d79", emissiveIntensity: .7 })] }),
            _jsxs("mesh", { position: [-.35, 2.72, 0], children: [_jsx("boxGeometry", { args: [1.2, .025, .025] }), _jsx("meshBasicMaterial", { color: "#e3f7ff" })] })
        ] }),
        Array.from({ length: layout.floors }, (_, floor) => _jsx(LandingDoors, { x: layout.doorX, z: layout.z, floor: floor, y: y, moving: moving }, floor))
    ] });
}
function LandingDoors({ x, z, floor, y, moving }) {
    const left = useRef(null), right = useRef(null);
    useFrame((_, dt) => {
        const open = !moving.current && Math.abs(y.current - floor * 4) < .08, offset = open ? .62 : 0;
        if (left.current) left.current.position.z = THREE.MathUtils.damp(left.current.position.z, -.55 - offset, 10, dt);
        if (right.current) right.current.position.z = THREE.MathUtils.damp(right.current.position.z, .55 + offset, 10, dt);
    });
    return _jsxs("group", { position: [x, floor * 4 + 1.5, z], children: [
        _jsx("group", { ref: left, position: [0, 0, -.55], children: _jsxs("mesh", { castShadow: true, children: [_jsx("boxGeometry", { args: [.13, 3, 1.1] }), _jsx("meshStandardMaterial", { color: "#aab5bd", metalness: .72, roughness: .27 })] }) }),
        _jsx("group", { ref: right, position: [0, 0, .55], children: _jsxs("mesh", { castShadow: true, children: [_jsx("boxGeometry", { args: [.13, 3, 1.1] }), _jsx("meshStandardMaterial", { color: "#aab5bd", metalness: .72, roughness: .27 })] }) })
    ] });
}
