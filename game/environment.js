import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
const cloudSeed = (seed) => { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; };
function CloudLayer({ profile }) {
    const mesh = useRef(null);
    const instances = useMemo(() => { const random = cloudSeed(9051); return Array.from({ length: 58 }, (_, index) => ({ x: (random() - 0.5) * 370, y: 31 + random() * 17, z: (random() - 0.5) * 370, sx: 4 + random() * 6, sy: 0.65 + random() * 1.25, sz: 2.6 + random() * 5, phase: index * 0.37 })); }, []);
    useLayoutEffect(() => {
        const target = mesh.current; if (!target) return;
        const object = new THREE.Object3D(), color = new THREE.Color();
        instances.forEach((cloud, index) => {
            object.position.set(cloud.x, cloud.y, cloud.z); object.scale.set(cloud.sx, cloud.sy, cloud.sz); object.rotation.y = cloud.phase; object.updateMatrix();
            target.setMatrixAt(index, object.matrix); target.setColorAt(index, color.setHSL(0.57, 0.12, 0.88 + (index % 4) * 0.025));
        });
        target.instanceMatrix.needsUpdate = true; if (target.instanceColor) target.instanceColor.needsUpdate = true; target.computeBoundingSphere();
    }, [instances]);
    useFrame((_, dt) => {
        const target = mesh.current; if (!target) return;
        target.visible = profile.cloudCover > 0.2;
        const cloudCount = Math.round(instances.length * profile.cloudCover); if (target.count !== cloudCount) target.count = cloudCount;
        target.position.x += dt * (0.12 + profile.windStrength * 0.16); if (target.position.x > 195) target.position.x = -195;
        target.material.opacity = profile.cloudOpacity;
    });
    return _jsxs("instancedMesh", { ref: mesh, args: [undefined, undefined, instances.length], frustumCulled: false, children: [
        _jsx("sphereGeometry", { args: [1, 12, 8] }), _jsx("meshStandardMaterial", { color: "#eef5f8", roughness: 1, metalness: 0, transparent: true, opacity: 0.55, depthWrite: false })
    ] });
}
function RainLayer({ profile }) {
    const ref = useRef(null), count = profile.rainCount;
    const { positions, speeds } = useMemo(() => {
        const random = cloudSeed(17031 + count), values = new Float32Array(count * 2 * 3), velocity = new Float32Array(count);
        for (let index = 0; index < count; index++) {
            const x = (random() - 0.5) * 76, y = random() * 52 - 12, z = (random() - 0.5) * 76, offset = index * 6;
            values[offset] = x; values[offset + 1] = y; values[offset + 2] = z;
            values[offset + 3] = x - 0.16; values[offset + 4] = y - 0.72; values[offset + 5] = z;
            velocity[index] = profile.rainSpeed * (0.72 + random() * 0.58);
        }
        return { positions: values, speeds: velocity };
    }, [count, profile.rainSpeed]);
    const geometry = useMemo(() => { const next = new THREE.BufferGeometry(); next.setAttribute("position", new THREE.BufferAttribute(positions, 3)); return next; }, [positions]);
    useLayoutEffect(() => () => geometry.dispose(), [geometry]);
    useFrame(({ camera }, rawDt) => {
        if (!ref.current || count === 0) return;
        const dt = Math.min(rawDt, 0.05); ref.current.position.copy(camera.position);
        const attribute = geometry.getAttribute("position"), array = attribute.array;
        for (let index = 0; index < count; index++) {
            const offset = index * 6;
            array[offset] += profile.windStrength * dt * 1.25; array[offset + 1] -= speeds[index] * dt; array[offset + 2] += profile.windStrength * dt * 0.18;
            if (array[offset + 1] < -15) {
                array[offset] = (Math.random() - 0.5) * 76; array[offset + 1] = 36 + Math.random() * 24; array[offset + 2] = (Math.random() - 0.5) * 76;
            }
            array[offset + 3] = array[offset] - 0.16; array[offset + 4] = array[offset + 1] - 0.72; array[offset + 5] = array[offset + 2];
        }
        attribute.needsUpdate = true;
    });
    if (count === 0) return null;
    return _jsx("lineSegments", { ref, geometry, frustumCulled: false, children: _jsx("lineBasicMaterial", { color: "#d8ecf7", transparent: true, opacity: 0.47, depthWrite: false }) });
}
function Lightning({ enabled }) {
    const light = useRef(null), state = useRef({ remaining: 0, next: 5.5 });
    useFrame((_, dt) => {
        const target = light.current; if (!target) return;
        if (!enabled) { target.intensity = 0; state.current.remaining = 0; return; }
        if (state.current.remaining > 0) {
            state.current.remaining = Math.max(0, state.current.remaining - dt);
            target.intensity = state.current.remaining > 0 ? 13 + Math.sin(state.current.remaining * 90) * 3 : 0;
        } else {
            state.current.next -= dt; target.intensity = 0;
            if (state.current.next <= 0) { state.current.remaining = 0.12; state.current.next = 7 + Math.random() * 12; }
        }
    });
    return _jsx("pointLight", { ref: light, color: "#dcecff", position: [0, 42, 0], intensity: 0, distance: 150, decay: 1.8 });
}
function Pedestrians({ quality }) {
    const torso = useRef(null), head = useRef(null), legs = useRef(null);
    const agents = useMemo(() => {
        const random = cloudSeed(773), count = quality === "low" ? 5 : quality === "balanced" ? 8 : 12;
        return Array.from({ length: count }, (_, index) => ({ phase: (index / count) * Math.PI * 2, speed: 0.14 + random() * 0.12, radius: 12.1 + random() * 1.2, stride: random() * Math.PI * 2, hue: random() }));
    }, [quality]);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    useLayoutEffect(() => {
        if (!torso.current || !head.current || !legs.current) return;
        const color = new THREE.Color();
        agents.forEach((agent, index) => {
            color.setHSL(agent.hue, 0.38 + agent.hue * 0.12, 0.34 + (index % 3) * 0.08);
            torso.current.setColorAt(index, color); head.current.setColorAt(index, new THREE.Color("#d4aa85")); legs.current.setColorAt(index, new THREE.Color("#25303b"));
        });
        [torso, head, legs].forEach((mesh) => { if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true; });
    }, [agents]);
    useFrame(({ clock }) => {
        if (!torso.current || !head.current || !legs.current) return;
        const time = clock.elapsedTime;
        agents.forEach((agent, index) => {
            const angle = agent.phase + time * agent.speed, x = Math.cos(angle) * agent.radius, z = Math.sin(angle) * agent.radius, yaw = -angle + Math.PI / 2, stride = Math.sin(time * 4.1 + agent.stride) * 0.28;
            dummy.position.set(x, 0.91, z); dummy.rotation.set(0, yaw, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); torso.current.setMatrixAt(index, dummy.matrix);
            dummy.position.set(x, 1.57, z); dummy.rotation.set(0, yaw, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); head.current.setMatrixAt(index, dummy.matrix);
            dummy.position.set(x - Math.sin(yaw) * 0.13, 0.34, z - Math.cos(yaw) * 0.13); dummy.rotation.set(stride, yaw, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); legs.current.setMatrixAt(index * 2, dummy.matrix);
            dummy.position.set(x + Math.sin(yaw) * 0.13, 0.34, z + Math.cos(yaw) * 0.13); dummy.rotation.set(-stride, yaw, 0); dummy.updateMatrix(); legs.current.setMatrixAt(index * 2 + 1, dummy.matrix);
        });
        torso.current.instanceMatrix.needsUpdate = true; head.current.instanceMatrix.needsUpdate = true; legs.current.instanceMatrix.needsUpdate = true;
    });
    return _jsxs(_Fragment, { children: [
        _jsxs("instancedMesh", { ref: torso, args: [undefined, undefined, agents.length], castShadow: false, children: [_jsx("cylinderGeometry", { args: [0.2, 0.24, 0.76, 7] }), _jsx("meshStandardMaterial", { roughness: 0.85, metalness: 0 })] }),
        _jsxs("instancedMesh", { ref: head, args: [undefined, undefined, agents.length], castShadow: false, children: [_jsx("sphereGeometry", { args: [0.19, 10, 8] }), _jsx("meshStandardMaterial", { roughness: 0.9, metalness: 0 })] }),
        _jsxs("instancedMesh", { ref: legs, args: [undefined, undefined, agents.length * 2], castShadow: false, children: [_jsx("cylinderGeometry", { args: [0.075, 0.085, 0.68, 6] }), _jsx("meshStandardMaterial", { roughness: 0.92, metalness: 0 })] })
    ] });
}
export function AmbientLife({ quality }) { return _jsx(Pedestrians, { quality }); }
export function StreetLights({ lamps, nightFactor, quality }) {
    const limit = quality === "low" ? 5 : quality === "balanced" ? 12 : 18;
    const selected = useMemo(() => lamps.filter((_, index) => index % 3 === 0).slice(0, limit), [lamps, limit]);
    if (nightFactor < 0.06) return null;
    return _jsx(_Fragment, { children: selected.map((lamp, index) => _jsx("pointLight", { position: [lamp.x, 4.8, lamp.z], color: "#ffd99a", intensity: nightFactor * 1.25, distance: 20, decay: 1.85 }, index)) });
}
export function WeatherEffects({ weather, profile }) { return _jsxs(_Fragment, { children: [_jsx(CloudLayer, { profile }), _jsx(RainLayer, { profile }), _jsx(Lightning, { enabled: weather === "storm" })] }); }
export function QualityMonitor({ onLevel }) {
    const sample = useRef({ elapsed: 0, frames: 0, slow: 0, fast: 0, level: "low" });
    useFrame((_, dt) => {
        const current = sample.current; current.elapsed += dt; current.frames += 1;
        if (current.elapsed < 3) return;
        const fps = current.frames / current.elapsed; current.elapsed = 0; current.frames = 0;
        current.slow = fps < 38 ? current.slow + 1 : 0; current.fast = fps > 55 ? current.fast + 1 : 0;
        let next = current.level;
        if (current.slow >= 2) { next = current.level === "high" ? "balanced" : "low"; current.slow = 0; current.fast = 0; }
        else if (current.fast >= 4) { next = current.level === "low" ? "balanced" : "high"; current.fast = 0; }
        if (next !== current.level) { current.level = next; onLevel(next); }
    });
    return null;
}
