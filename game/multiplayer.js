import React, { useEffect, useMemo, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cecgegnskbhuswlyptus.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1wfB5eP9gElxaMtSjeBRgw_hofPr3dg";
const CHANNEL_NAME = "stairway-city-world";
const NICKNAME_KEY = "stairway-city-multiplayer-nickname";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  realtime: { params: { eventsPerSecond: 12 } }
});

function getNickname(userId) {
  try {
    const stored = window.localStorage.getItem(NICKNAME_KEY);
    if (stored) return stored;
    const nickname = "שחקן-" + String(userId).slice(0, 4).toUpperCase();
    window.localStorage.setItem(NICKNAME_KEY, nickname);
    return nickname;
  } catch {
    return "שחקן-" + String(userId).slice(0, 4).toUpperCase();
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

export function useGameMultiplayer({ playerPositionRef, island }) {
  const [status, setStatus] = useState("connecting");
  const [statusMessage, setStatusMessage] = useState("מתחבר לשרת המשחק...");
  const [userId, setUserId] = useState(null);
  const [nickname, setNickname] = useState("שחקן");
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [remotePlayers, setRemotePlayers] = useState([]);
  const [remoteIslandRows, setRemoteIslandRows] = useState([]);
  const [databaseReady, setDatabaseReady] = useState(false);
  const channelRef = useRef(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    let active = true;
    let channel = null;

    const start = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      let user = sessionData.session?.user;
      if (!user) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        user = data.user;
      }
      if (!active || !user) return;

      const playerName = getNickname(user.id);
      setUserId(user.id);
      setNickname(playerName);

      const { data: islandRows, error: islandError } = await supabase
        .from("game_islands")
        .select("player_id,nickname,island,updated_at")
        .neq("player_id", user.id);
      if (!active) return;
      if (islandError) {
        setDatabaseReady(false);
        setStatusMessage("חיבור השחקנים זמין אחרי הפעלת טבלת האיים בשרת.");
      } else {
        setDatabaseReady(true);
        setRemoteIslandRows(islandRows || []);
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

      if (!islandError) {
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
      channel.subscribe((channelStatus) => {
        if (!active) return;
        if (channelStatus === "SUBSCRIBED") {
          connectedRef.current = true;
          setStatus("connected");
          setStatusMessage("מחובר למשחק המשותף");
          channel.track({
            user_id: user.id,
            nickname: playerName,
            joined_at: new Date().toISOString()
          }).then(({ error }) => {
            if (error && active) setStatusMessage("מחובר, אך מצב הנוכחות לא עודכן.");
          }).catch(() => {
            if (active) setStatusMessage("מחובר, אך מצב הנוכחות לא עודכן.");
          });
        } else if (channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT") {
          connectedRef.current = false;
          setStatus("error");
          setStatusMessage("לא ניתן להתחבר לערוץ השחקנים. בדוק את הרשאות Realtime בשרת.");
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
      if (/anonymous|disabled|sign.?ups/i.test(message)) {
        setStatus("auth-disabled");
        setStatusMessage("צריך להפעיל Anonymous Sign-ins בהגדרות Authentication של Supabase.");
      } else {
        setStatus("error");
        setStatusMessage("שגיאת חיבור: " + message.slice(0, 150));
      }
    });

    return () => {
      active = false;
      connectedRef.current = false;
      if (channel) supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, []);

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
          x: position.x,
          y: Number(position.y) || 0,
          z: position.z,
          yaw: Number(position.yaw) || 0
        }
      }).catch(() => {});
    }, 160);
    return () => window.clearInterval(timer);
  }, [userId, nickname, status, playerPositionRef]);

  const remoteIslands = useMemo(() => mapIslandRows(remoteIslandRows), [remoteIslandRows]);
  return {
    status,
    statusMessage,
    userId,
    nickname,
    onlinePlayers,
    remotePlayers,
    remoteIslands,
    databaseReady
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
  const bodyColor = "hsl(" + hue + " 62% 55%)";

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
    }, String(player.nickname || "שחקן").slice(0, 18))
  );
}

export function RemotePlayerAvatars({ players = [] }) {
  return React.createElement(React.Fragment, null,
    ...players.map((player) => React.createElement(RemotePlayerAvatar, { key: player.id, player }))
  );
}
