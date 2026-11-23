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
    clear: { sun: 1, clouds: 0.12, rain: 0, wind: 0.42, fogFar: 270, fogNear: 62, daySky: "#9bcfeb", nightSky: "#101b32", dayFog: "#b5d9e8", nightFog: "#17243a", turbidity: 3.2 },
    cloudy: { sun: 0.68, clouds: 0.72, rain: 0, wind: 0.82, fogFar: 205, fogNear: 42, daySky: "#91a9b8", nightSky: "#111c2b", dayFog: "#a9bcc6", nightFog: "#192633", turbidity: 7.5 },
    rain: { sun: 0.42, clouds: 0.94, rain: 720, wind: 1.32, fogFar: 158, fogNear: 25, daySky: "#718c9b", nightSky: "#101c2a", dayFog: "#879eaa", nightFog: "#162533", turbidity: 9.5 },
    storm: { sun: 0.22, clouds: 1, rain: 1250, wind: 2.05, fogFar: 126, fogNear: 16, daySky: "#526979", nightSky: "#0b1421", dayFog: "#70818b", nightFog: "#101a27", turbidity: 11 },
    fog: { sun: 0.58, clouds: 0.38, rain: 0, wind: 0.28, fogFar: 78, fogNear: 5, daySky: "#a9bdc1", nightSky: "#152328", dayFog: "#b9c9c8", nightFog: "#1a2a2d", turbidity: 8.5 },
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
        sunColor: mixHex(weather === "storm" ? "#c5d6e7" : "#fff0d1", "#8298c8", nightFactor),
        sunIntensity: (0.035 + daylight * 2.35) * settings.sun,
        skyColor: mixHex(settings.daySky, settings.nightSky, nightFactor),
        fogColor: mixHex(settings.dayFog, settings.nightFog, nightFactor),
        fogNear: settings.fogNear, fogFar: Math.max(48, settings.fogFar * (0.78 + daylight * 0.22)),
        hemisphereSky: mixHex("#d9edff", "#506383", nightFactor), hemisphereGround: mixHex("#786d5c", "#202938", nightFactor),
        hemisphereIntensity: 0.24 + daylight * 0.82, ambientIntensity: 0.12 + daylight * 0.34,
        turbidity: settings.turbidity, cloudCover: settings.clouds,
        cloudOpacity: weather === "clear" ? 0.22 : 0.48 + settings.clouds * 0.24,
        rainCount: Math.round(settings.rain * resolutionScale), rainSpeed: weather === "storm" ? 28 : 21, windStrength: settings.wind,
    };
}
export function formatGameTime(hour) {
    const normalized = ((hour % 24) + 24) % 24, h = Math.floor(normalized), m = Math.floor((normalized - h) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
