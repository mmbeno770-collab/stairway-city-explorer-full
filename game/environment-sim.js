export const WEATHER_OPTIONS = [
    { value: "clear", label: "בהיר" }, { value: "cloudy", label: "מעונן" },
    { value: "rain", label: "גשם" }, { value: "storm", label: "סופת רעמים" },
    { value: "fog", label: "ערפל" },
];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = (edge0, edge1, value) => { const t = clamp((value - edge0) / (edge1 - edge0), 0, 1); return t * t * (3 - 2 * t); };
function mixHex(day, night, amount) {
    const a = Number.parseInt(day.slice(1), 16), b = Number.parseInt(night.slice(1), 16);
    const channel = (shift) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
    return `#${[channel(16), channel(8), channel(0)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
const WEATHER = {
    clear: { sun: 1, clouds: 0.12, rain: 0, wind: 0.42, fogFar: 300, fogNear: 68, daySky: "#b7e8ff", nightSky: "#1a2850", dayFog: "#d5eff0", nightFog: "#263957", turbidity: 2.3 },
    cloudy: { sun: 0.72, clouds: 0.72, rain: 0, wind: 0.82, fogFar: 225, fogNear: 42, daySky: "#bdd5e7", nightSky: "#202e49", dayFog: "#d7e6e8", nightFog: "#2b3b52", turbidity: 4.8 },
    rain: { sun: 0.46, clouds: 0.94, rain: 720, wind: 1.32, fogFar: 175, fogNear: 25, daySky: "#91b6c9", nightSky: "#1b2b43", dayFog: "#b8d2d7", nightFog: "#263a50", turbidity: 7.2 },
    storm: { sun: 0.28, clouds: 1, rain: 1250, wind: 2.05, fogFar: 140, fogNear: 16, daySky: "#7894a8", nightSky: "#17243a", dayFog: "#a3bac5", nightFog: "#202f47", turbidity: 8.8 },
    fog: { sun: 0.62, clouds: 0.38, rain: 0, wind: 0.28, fogFar: 92, fogNear: 5, daySky: "#c5dcd9", nightSky: "#243947", dayFog: "#dcebe2", nightFog: "#2b4048", turbidity: 6.2 },
};
export function getEnvironmentProfile(weather, hour, quality = "high") {
    const safeHour = ((hour % 24) + 24) % 24;
    const solarElevation = Math.sin(((safeHour - 6) / 12) * Math.PI);
    const daylight = smoothstep(0.015, 0.55, Math.max(0, solarElevation));
    const nightFactor = 1 - daylight, settings = WEATHER[weather];
    const resolutionScale = quality === "low" ? 0.55 : quality === "balanced" ? 0.78 : 1;
    const azimuth = ((safeHour - 12) / 24) * Math.PI * 2, sunY = solarElevation * 88;
    return {
        daylight, nightFactor, sunPosition: [Math.sin(azimuth) * 72, sunY, Math.cos(azimuth) * 38],
        sunColor: mixHex(weather === "storm" ? "#d3e5f2" : "#fff5d9", "#9aabd4", nightFactor),
        sunIntensity: (0.035 + daylight * 2.35) * settings.sun,
        skyColor: mixHex(settings.daySky, settings.nightSky, nightFactor),
        fogColor: mixHex(settings.dayFog, settings.nightFog, nightFactor),
        fogNear: settings.fogNear, fogFar: Math.max(48, settings.fogFar * (0.78 + daylight * 0.22)),
        hemisphereSky: mixHex("#e5f5ff", "#687da0", nightFactor), hemisphereGround: mixHex("#a7ba91", "#29384b", nightFactor),
        hemisphereIntensity: 0.34 + daylight * 0.9, ambientIntensity: 0.18 + daylight * 0.4,
        turbidity: settings.turbidity, cloudCover: settings.clouds,
        cloudOpacity: weather === "clear" ? 0.22 : 0.48 + settings.clouds * 0.24,
        rainCount: Math.round(settings.rain * resolutionScale), rainSpeed: weather === "storm" ? 28 : 21, windStrength: settings.wind,
    };
}
export function formatGameTime(hour) {
    const normalized = ((hour % 24) + 24) % 24, h = Math.floor(normalized), m = Math.floor((normalized - h) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
