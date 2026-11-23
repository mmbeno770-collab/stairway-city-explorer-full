import React, { useEffect, useMemo, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cecgegnskbhuswlyptus.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1wfB5eP9gElxaMtSjeBRgw_hofPr3dg";
const CHANNEL_NAME = "stairway-city-world";
const NICKNAME_KEY = "stairway-city-multiplayer-nickname";
const GUEST_COLORS = ["#e05b54", "#4f9fd0", "#55ad78", "#a17ade", "#e3a84f", "#e879b4", "#55b8b1", "#8b98a7"];
const GUEST_SYMBOLS = ["⭐", "🧭", "🚀", "🐬", "🦊", "🌟", "🛸", "🏝️"];
const DEFAULT_AVATAR_COLOR = "#4f9fd0";
const DEFAULT_AVATAR_ICON = "⭐";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: { params: { eventsPerSecond: 12 } }
});

async function awaitWithTimeout(promise, stage, milliseconds = 12000) {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(stage + " לא הגיב תוך " + Math.round(milliseconds / 1000) + " שניות"));
        }, milliseconds);
      })
    ]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

function getNickname(user) {
  const id = user?.id || "player";
  const metadataNickname = String(user?.user_metadata?.nickname || "").trim();
  if (metadataNickname) return metadataNickname.slice(0, 18);
  try {
    const key = NICKNAME_KEY + ":" + id;
    const stored = window.localStorage.getItem(key);
    if (stored) return stored;
    const nickname = "שחקן-" + String(id).slice(0, 4).toUpperCase();
    window.localStorage.setItem(key, nickname);
    return nickname;
  } catch {
    return "שחקן-" + String(id).slice(0, 4).toUpperCase();
  }
}

export function getPlayerIslandLocation(userId) {
  let hash = 2166136261;
  for (const character of String(userId || "guest")) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  const angle = (hash >>> 0) / 4294967296 * Math.PI * 2;
  return { x: Math.cos(angle) * 900, z: Math.sin(angle) * 900 };
}

function mapIslandRow(row) {
  if (!row?.island || typeof row.island !== "object") return null;
  const position = getPlayerIslandLocation(row.player_id);
  return {
    ...row.island,
    id: "player-island-" + row.player_id,
    ownerId: row.player_id,
    ownerName: row.nickname || row.island.name || "שחקן",
    isPlayerIsland: true,
    isRemotePlayerIsland: true,
    x: position.x,
    z: position.z
  };
}

function mapIslandRows(rows) {
  return rows.map((row) => mapIslandRow(row)).filter(Boolean);
}

export function MultiplayerAuthPanel({ multiplayer }) {
  const [nickname, setNickname] = useState(multiplayer.nickname || "");
  const [avatarColor, setAvatarColor] = useState(multiplayer.avatarColor || DEFAULT_AVATAR_COLOR);
  const [avatarIcon, setAvatarIcon] = useState(multiplayer.avatarIcon || DEFAULT_AVATAR_ICON);
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    const cleanNickname = nickname.trim().replace(/[<>]/g, "").slice(0, 18);
    if (cleanNickname.length < 2) {
      setMessage("בחר כינוי באורך של לפחות שני תווים.");
      return;
    }
    await multiplayer.finishGuestSetup(cleanNickname, avatarColor, avatarIcon);
  };

  return React.createElement("section", { className: "multiplayer-auth-card", dir: "rtl" },
    React.createElement("div", { className: "multiplayer-auth-kicker" }, "STAIRWAY CITY · ONLINE"),
    React.createElement("div", { className: "multiplayer-auth-icon" }, avatarIcon),
    React.createElement("h2", null, "בחירת הדמות שלך"),
    React.createElement("p", { className: "multiplayer-auth-intro" }, "בחר כינוי, צבע וסמל. אין צורך באימייל או בסיסמה."),
    React.createElement("form", { onSubmit: submit, className: "multiplayer-auth-form" },
      React.createElement("label", null,
        "כינוי שיוצג לשחקנים אחרים",
        React.createElement("input", {
          type: "text",
          value: nickname,
          onChange: (event) => setNickname(event.target.value),
          placeholder: "לדוגמה: חוקר_האיים",
          autoComplete: "nickname",
          maxLength: 18,
          required: true
        })
      ),
      React.createElement("div", { className: "multiplayer-avatar-picker" },
        React.createElement("span", { className: "multiplayer-picker-label" }, "בחר צבע לדמות"),
        React.createElement("div", { className: "multiplayer-color-options" },
          ...GUEST_COLORS.map((color) => React.createElement("button", {
            key: color,
            type: "button",
            className: "multiplayer-color-choice" + (avatarColor === color ? " selected" : ""),
            style: { background: color },
            "aria-label": "צבע " + color,
            "aria-pressed": avatarColor === color,
            onClick: () => setAvatarColor(color)
          }))
        )
      ),
      React.createElement("div", { className: "multiplayer-avatar-picker" },
        React.createElement("span", { className: "multiplayer-picker-label" }, "בחר סמל"),
        React.createElement("div", { className: "multiplayer-symbol-options" },
          ...GUEST_SYMBOLS.map((symbol) => React.createElement("button", {
            key: symbol,
            type: "button",
            className: "multiplayer-symbol-choice" + (avatarIcon === symbol ? " selected" : ""),
            "aria-label": "סמל " + symbol,
            "aria-pressed": avatarIcon === symbol,
            onClick: () => setAvatarIcon(symbol)
          }, symbol))
        )
      ),
      multiplayer.authMessage && React.createElement("p", { className: "multiplayer-auth-message", role: "status" }, multiplayer.authMessage),
      message && React.createElement("p", { className: "multiplayer-auth-message", role: "alert" }, message),
      React.createElement("button", {
        type: "submit",
        className: "multiplayer-auth-submit",
        disabled: multiplayer.authBusy
      }, multiplayer.authBusy ? "שומר ומתחבר..." : "כניסה למשחק")
    ),
    React.createElement("p", { className: "multiplayer-auth-privacy" },
      "בחר כינוי שאינו כולל שם מלא או פרטים אישיים. פרופיל האורח נשמר בדפדפן הזה; אם מנקים את נתוני האתר, ייתכן שלא ניתן יהיה לשחזר אותו."
    )
  );
}

export function useGameMultiplayer({ playerPositionRef, island }) {
  const [status, setStatus] = useState("checking");
  const [statusMessage, setStatusMessage] = useState("מכין שחקן אורח...");
  const [userId, setUserId] = useState(null);
  const [nickname, setNickname] = useState("שחקן");
  const [avatarColor, setAvatarColor] = useState(DEFAULT_AVATAR_COLOR);
  const [avatarIcon, setAvatarIcon] = useState(DEFAULT_AVATAR_ICON);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [remotePlayers, setRemotePlayers] = useState([]);
  const [remoteIslandRows, setRemoteIslandRows] = useState([]);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const channelRef = useRef(null);
  const connectedRef = useRef(false);

  const formatAuthError = (error) => {
    const message = String(error?.message || error || "");
    if (/anonymous.*(disabled|not allowed)|anonymous sign.?ins.*disabled/i.test(message)) return "התחברות אורחים אינה מופעלת בפרויקט Supabase. בדוק ש-Anon sign-ins פעיל.";
    if (/invalid api key|api key/i.test(message)) return "מפתח החיבור של Supabase נדחה. צריך לבדוק את מפתח ה-Publishable בפרויקט.";
    if (/rate limit|too many requests/i.test(message)) return "נשלחו יותר מדי בקשות. המתן מעט ונסה שוב.";
    if (/failed to fetch|network|load failed/i.test(message)) return "הדפדפן לא הצליח להשלים את בקשת החיבור ל-Supabase. בדוק רשת, חסימת תוכן או הגדרות דפדפן.";
    return message.slice(0, 180) || "ההתחברות נכשלה. נסה שוב.";
  };

  const finishGuestSetup = async (playerNickname, selectedColor, selectedIcon) => {
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const cleanNickname = String(playerNickname || "").trim().replace(/[<>]/g, "").slice(0, 18);
      if (cleanNickname.length < 2) throw new Error("בחר כינוי באורך של לפחות שני תווים.");
      if (!GUEST_COLORS.includes(selectedColor)) throw new Error("בחירת הצבע אינה תקינה.");
      if (!GUEST_SYMBOLS.includes(selectedIcon)) throw new Error("בחירת הסמל אינה תקינה.");

      const response = await awaitWithTimeout(
        supabase.auth.updateUser({ data: { nickname: cleanNickname, avatarColor: selectedColor, avatarIcon: selectedIcon } }),
        "שמירת פרופיל אורח",
        15000
      );
      if (response.error) throw response.error;
      const user = response.data?.user;
      if (!user?.id) throw new Error("לא התקבל פרופיל שחקן מהשרת.");

      try { window.localStorage.setItem(NICKNAME_KEY + ":" + user.id, cleanNickname); } catch {}
      setUserId(user.id);
      setNickname(cleanNickname);
      setAvatarColor(selectedColor);
      setAvatarIcon(selectedIcon);
      connectedRef.current = false;
      setStatus("connecting");
      setStatusMessage("הפרופיל נשמר. מתחבר לעולם המשותף...");
      setRetryToken((value) => value + 1);
    } catch (error) {
      setStatus("needs-login");
      setAuthMessage(formatAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const retry = () => {
    setStatus("connecting");
    setStatusMessage("מנסה להתחבר מחדש...");
    setOnlinePlayers([]);
    setRemotePlayers([]);
    setRetryToken((value) => value + 1);
  };

  useEffect(() => {
    let active = true;
    let channel = null;
    let currentStage = "בדיקת התחברות קודמת";

    const start = async () => {
      const sessionResponse = await awaitWithTimeout(
        supabase.auth.getSession(),
        "בדיקת התחברות קודמת",
        12000
      );
      if (sessionResponse.error) throw sessionResponse.error;
      let user = sessionResponse.data.session?.user || null;

      if (!user) {
        currentStage = "יצירת שחקן אורח";
        const guestResponse = await awaitWithTimeout(
          supabase.auth.signInAnonymously(),
          "יצירת שחקן אורח",
          18000
        );
        if (guestResponse.error) throw guestResponse.error;
        user = guestResponse.data?.user || guestResponse.data?.session?.user || null;
        if (!user) throw new Error("Supabase לא החזיר משתמש אורח.");
      }
      if (!active) return;

      const savedNickname = String(user.user_metadata?.nickname || "").trim();
      if (!savedNickname) {
        setUserId(user.id);
        setNickname("");
        setAvatarColor(DEFAULT_AVATAR_COLOR);
        setAvatarIcon(DEFAULT_AVATAR_ICON);
        setStatus("needs-login");
        setStatusMessage("בחר כינוי, צבע וסמל כדי להיכנס לעולם המשותף.");
        return;
      }

      const playerName = getNickname(user);
      const playerColor = GUEST_COLORS.includes(user.user_metadata?.avatarColor) ? user.user_metadata.avatarColor : DEFAULT_AVATAR_COLOR;
      const playerIcon = GUEST_SYMBOLS.includes(user.user_metadata?.avatarIcon) ? user.user_metadata.avatarIcon : DEFAULT_AVATAR_ICON;
      setUserId(user.id);
      setNickname(playerName);
      setAvatarColor(playerColor);
      setAvatarIcon(playerIcon);

      currentStage = "טעינת טבלת האיים game_islands";
      const islandResponse = await supabase
        .from("game_islands")
        .select("player_id,nickname,island,updated_at")
        .neq("player_id", user.id);
      if (!active) return;
      if (islandResponse.error) {
        setDatabaseReady(false);
        setStatusMessage("החיבור לשחקנים ימשיך, אך טעינת האיים נכשלה: " + islandResponse.error.message.slice(0, 110));
      } else {
        setDatabaseReady(true);
        setRemoteIslandRows(islandResponse.data || []);
      }

      channel = supabase.channel(CHANNEL_NAME, {
        config: {
          presence: { key: user.id },
          broadcast: { self: false },
          private: true
        }
      });

      channel
        .on("presence", { event: "sync" }, () => {
          if (!active || !channel) return;
          const presence = channel.presenceState();
          const players = Object.entries(presence).flatMap(([key, entries]) =>
            entries.map((entry) => ({
              id: entry.user_id || key,
              nickname: entry.nickname || "שחקן",
              avatarColor: GUEST_COLORS.includes(entry.avatarColor) ? entry.avatarColor : DEFAULT_AVATAR_COLOR,
              avatarIcon: GUEST_SYMBOLS.includes(entry.avatarIcon) ? entry.avatarIcon : DEFAULT_AVATAR_ICON,
              joinedAt: entry.joined_at || null
            }))
          );
          setOnlinePlayers(players);
          const activeIds = new Set(players.map((player) => player.id));
          setRemotePlayers((current) => current.filter((player) => activeIds.has(player.id)));
        })
        .on("broadcast", { event: "player-move" }, ({ payload }) => {
          if (!active || !payload?.user_id || payload.user_id === user.id) return;
          const nextPlayer = {
            id: payload.user_id,
            nickname: payload.nickname || "שחקן",
            avatarColor: GUEST_COLORS.includes(payload.avatarColor) ? payload.avatarColor : DEFAULT_AVATAR_COLOR,
            avatarIcon: GUEST_SYMBOLS.includes(payload.avatarIcon) ? payload.avatarIcon : DEFAULT_AVATAR_ICON,
            x: Number(payload.x) || 0,
            y: Number(payload.y) || 0,
            z: Number(payload.z) || 0,
            yaw: Number(payload.yaw) || 0
          };
          setRemotePlayers((current) => {
            const index = current.findIndex((player) => player.id === nextPlayer.id);
            if (index < 0) return [...current, nextPlayer].slice(-16);
            const updated = [...current];
            updated[index] = nextPlayer;
            return updated;
          });
        });

      if (!islandResponse.error) {
        channel.on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "game_islands"
        }, (change) => {
          if (!active) return;
          if (change.eventType === "DELETE") {
            const deletedId = change.old?.player_id;
            if (deletedId) setRemoteIslandRows((current) => current.filter((row) => row.player_id !== deletedId));
            return;
          }
          const row = change.new;
          if (!row?.player_id || row.player_id === user.id || !row.island) return;
          setRemoteIslandRows((current) => {
            const next = current.filter((item) => item.player_id !== row.player_id);
            return [...next, row];
          });
        });
      }

      channelRef.current = channel;
      currentStage = "חיבור לערוץ Realtime של השחקנים";
      const subscribeTimeout = window.setTimeout(() => {
        if (!active || connectedRef.current) return;
        setStatus("error");
        setStatusMessage("שרת האימות ענה, אבל ערוץ Realtime לא התחבר תוך 15 שניות. בדוק הרשאות ערוצים פרטיים.");
      }, 15000);
      channel.subscribe((channelStatus) => {
        if (channelStatus === "SUBSCRIBED" || channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT" || channelStatus === "CLOSED") {
          window.clearTimeout(subscribeTimeout);
        }
        if (!active) return;
        if (channelStatus === "SUBSCRIBED") {
          connectedRef.current = true;
          setStatus("connected");
          setStatusMessage("מחובר למשחק המשותף");
          channel.track({
            user_id: user.id,
            nickname: playerName,
            avatarColor: playerColor,
            avatarIcon: playerIcon,
            joined_at: new Date().toISOString()
          }).then(({ error }) => {
            if (error && active) setStatusMessage("מחובר, אך מצב הנוכחות לא עודכן.");
          }).catch(() => {
            if (active) setStatusMessage("מחובר, אך מצב הנוכחות לא עודכן.");
          });
        } else if (channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT") {
          connectedRef.current = false;
          setStatus("error");
          setStatusMessage("לא ניתן להתחבר לערוץ השחקנים. בדוק הרשאות Realtime בשרת.");
        } else if (channelStatus === "CLOSED") {
          connectedRef.current = false;
          setStatus("error");
          setStatusMessage("החיבור לשרת המשחק נסגר.");
        }
      });
    };

    start().catch((error) => {
      if (!active) return;
      const message = String(error?.message || error || "");
      setStatus("error");
      setStatusMessage("החיבור נכשל בשלב: " + currentStage + ". " + formatAuthError(error) + " " + message.slice(0, 80));
    });

    return () => {
      active = false;
      connectedRef.current = false;
      if (channel) supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [retryToken]);

  useEffect(() => {
    if (!userId || !island) return undefined;
    const timer = window.setTimeout(async () => {
      const position = getPlayerIslandLocation(userId);
      const islandToSave = {
        ...island,
        id: "player-island-" + userId,
        ownerId: userId,
        ownerName: nickname,
        isPlayerIsland: true,
        x: position.x,
        z: position.z
      };
      const { error } = await supabase.from("game_islands").upsert({
        player_id: userId,
        nickname,
        island: islandToSave,
        updated_at: new Date().toISOString()
      }, { onConflict: "player_id" });
      if (error) {
        setDatabaseReady(false);
        setStatusMessage("השחקנים מחוברים, אבל שמירת האי נכשלה. בדוק את טבלת game_islands והרשאותיה.");
      } else {
        setDatabaseReady(true);
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [userId, nickname, island]);

  useEffect(() => {
    if (!userId || status !== "connected") return undefined;
    const timer = window.setInterval(() => {
      const channel = channelRef.current;
      if (!channel || !connectedRef.current) return;
      const position = playerPositionRef?.current;
      if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.z)) return;
      channel.send({
        type: "broadcast",
        event: "player-move",
        payload: {
          user_id: userId,
          nickname,
          avatarColor,
          avatarIcon,
          x: position.x,
          y: Number(position.y) || 0,
          z: position.z,
          yaw: Number(position.yaw) || 0
        }
      }).catch(() => {});
    }, 160);
    return () => window.clearInterval(timer);
  }, [userId, nickname, avatarColor, avatarIcon, status, playerPositionRef]);

  const remoteIslands = useMemo(() => mapIslandRows(remoteIslandRows), [remoteIslandRows]);
  return {
    status,
    statusMessage,
    userId,
    nickname,
    avatarColor,
    avatarIcon,
    onlinePlayers,
    remotePlayers,
    remoteIslands,
    databaseReady,
    authBusy,
    authMessage,
    finishGuestSetup,
    retry
  };
}
function RemotePlayerAvatar({ player }) {
  const groupRef = useRef(null);
  const targetRef = useRef(new THREE.Vector3(player.x, player.y, player.z));
  const targetYawRef = useRef(player.yaw || 0);
  useEffect(() => {
    targetRef.current.set(player.x, player.y, player.z);
    targetYawRef.current = player.yaw || 0;
  }, [player.x, player.y, player.z, player.yaw]);

  const hue = Array.from(String(player.id)).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const bodyColor = /^#[0-9a-f]{6}$/i.test(player.avatarColor || "") ? player.avatarColor : "hsl(" + hue + " 62% 55%)";

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.position.lerp(targetRef.current, 1 - Math.exp(-10 * delta));
    const yawDifference = Math.atan2(
      Math.sin(targetYawRef.current - groupRef.current.rotation.y),
      Math.cos(targetYawRef.current - groupRef.current.rotation.y)
    );
    groupRef.current.rotation.y += yawDifference * Math.min(1, delta * 8);
  });

  return React.createElement("group", { ref: groupRef, position: [player.x, player.y, player.z] },
    React.createElement("mesh", { position: [0, 1.0, 0], castShadow: true },
      React.createElement("capsuleGeometry", { args: [0.25, 0.78, 4, 8] }),
      React.createElement("meshStandardMaterial", { color: bodyColor, roughness: 0.78 })
    ),
    React.createElement("mesh", { position: [0, 1.66, 0], castShadow: true },
      React.createElement("sphereGeometry", { args: [0.23, 12, 10] }),
      React.createElement("meshStandardMaterial", { color: "#f2d3b5", roughness: 0.8 })
    ),
    React.createElement(Text, {
      position: [0, 2.08, 0],
      fontSize: 0.25,
      color: "#ffffff",
      anchorX: "center",
      anchorY: "middle",
      outlineWidth: 0.018,
      outlineColor: "#17313b"
    }, String(player.avatarIcon || DEFAULT_AVATAR_ICON) + " " + String(player.nickname || "שחקן").slice(0, 18))
  );
}

export function RemotePlayerAvatars({ players = [] }) {
  return React.createElement(React.Fragment, null,
    ...players.map((player) => React.createElement(RemotePlayerAvatar, { key: player.id, player }))
  );
}
