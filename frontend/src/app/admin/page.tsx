"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface DashboardData {
  admin: string;
  stats: {
    total_sessions: number;
    total_scores: number;
    highest_score: number;
    blocked_cheats: number;
    unread_messages: number;
  };
  leaderboard: Array<{
    id: number;
    rank: number;
    username: string;
    score: number;
    total_ticks: number;
    duration_ms: number;
    replay_hash: string;
    created_at: string;
  }>;
  security_logs: Array<{
    id: number;
    event_type: string;
    severity: string;
    username: string | null;
    client_ip: string | null;
    details: string;
    created_at: string;
  }>;
  messages: Array<{
    id: number;
    name: string;
    email: string;
    message: string;
    is_read: boolean;
    created_at: string;
  }>;
  config: {
    accent: "Lima" | "Cian" | "Magenta" | "Naranja";
    photo_style: "ASCII" | "Duotono";
    show_buddy: boolean;
    custom_cursor: boolean;
    show_grid: boolean;
    show_glow: boolean;
  };
}

const PALETTES: Record<string, string> = {
  Lima: "#D4FF3A",
  Cian: "#3AF2FF",
  Magenta: "#FF4FD8",
  Naranja: "#FF8A3A",
};

type AdminTab = "leaderboard" | "security" | "messages" | "config";

type ConfigToggle = "show_buddy" | "custom_cursor" | "show_grid" | "show_glow";

const CONFIG_TOGGLES: { key: ConfigToggle; label: string }[] = [
  { key: "show_buddy", label: "Stickman Buddy interactivo" },
  { key: "custom_cursor", label: "Cursor neón personalizado" },
  { key: "show_grid", label: "Grilla de fondo (64px)" },
  { key: "show_glow", label: "Resplandor radial del puntero" },
];

const TABS: { id: AdminTab; label: (d: DashboardData) => string }[] = [
  { id: "leaderboard", label: (d) => `01 / leaderboard (${d.leaderboard.length})` },
  { id: "security", label: (d) => `02 / auditoría anti-cheat (${d.security_logs.length})` },
  { id: "messages", label: (d) => `03 / mensajes (${d.messages.length})` },
  { id: "config", label: () => "04 / apariencia en vivo" },
];

class UnauthorizedError extends Error {}

/**
 * Same-origin call to the admin API. The session lives in an HttpOnly cookie
 * the browser attaches automatically; the custom header is the CSRF guard the
 * backend requires on every write.
 */
async function adminApi<T>(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    method: init.method ?? "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "X-Requested-With": "mg-admin",
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(
      (data && typeof data.detail === "string" && data.detail) ||
        `Error ${res.status}`
    );
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<AdminTab>("leaderboard");
  const [statusToast, setStatusToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setStatusToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setStatusToast(""), 3200);
  }, []);

  const signOutLocally = useCallback(() => {
    setAuthenticated(false);
    setDash(null);
  }, []);

  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof UnauthorizedError) {
        signOutLocally();
        setAuthError("Tu sesión expiró. Inicia sesión de nuevo.");
      } else {
        showToast(err instanceof Error ? err.message : "Error inesperado");
      }
    },
    [showToast, signOutLocally]
  );

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await adminApi<DashboardData>("/dashboard");
      setDash(data);
      setAuthenticated(true);
    } catch (err) {
      if (err instanceof UnauthorizedError) signOutLocally();
      else setAuthError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }, [signOutLocally]);

  useEffect(() => {
    fetchDashboard();
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [fetchDashboard]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
    try {
      await adminApi("/login", {
        method: "POST",
        body: { username: username.trim(), password },
      });
      setPassword("");
      await fetchDashboard();
    } catch (err) {
      setAuthError(
        err instanceof UnauthorizedError
          ? "Usuario o contraseña incorrectos."
          : err instanceof Error
          ? err.message
          : "Error de conexión con el servidor."
      );
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await adminApi("/logout", { method: "POST" });
    } catch {
      /* the cookie expires on its own; local state is cleared anyway */
    }
    signOutLocally();
  };

  const runAction = async (action: () => Promise<unknown>, okMsg?: string) => {
    try {
      await action();
      if (okMsg) showToast(okMsg);
      await fetchDashboard();
    } catch (err) {
      handleError(err);
    }
  };

  const handleDeleteScore = (id: number, name: string) => {
    if (!window.confirm(`¿Eliminar a "${name}" del ranking? El nombre quedará libre.`)) return;
    runAction(
      () => adminApi(`/leaderboard/${id}`, { method: "DELETE" }),
      "Puntaje eliminado del ranking mundial"
    );
  };

  const handleToggleMessageRead = (id: number) =>
    runAction(() => adminApi(`/messages/${id}/read`, { method: "PATCH" }));

  const handleDeleteMessage = (id: number) => {
    if (!window.confirm("¿Eliminar este mensaje? No se puede deshacer.")) return;
    runAction(
      () => adminApi(`/messages/${id}`, { method: "DELETE" }),
      "Mensaje eliminado"
    );
  };

  const handleUpdateConfig = (nextCfg: DashboardData["config"]) =>
    runAction(
      () => adminApi("/config", { method: "PUT", body: nextCfg }),
      "Configuración del portafolio actualizada en vivo"
    );

  /** Sends a forged score through the public API to show the anti-cheat working. */
  const simulateTamperAttack = async () => {
    try {
      const startRes = await fetch("/api/game/start", { method: "POST" });
      if (!startRes.ok) throw new Error(`start ${startRes.status}`);
      const s = await startRes.json();
      const attackRes = await fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: s.session_id,
          signature: s.signature,
          username: "demo_attack",
          claimed_score: 3990,
          total_ticks: 12,
          moves: [{ t: 0, d: "R" }],
        }),
      });
      const errData = await attackRes.json().catch(() => ({}));
      showToast(`Ataque bloqueado (${attackRes.status}): ${errData.detail ?? ""}`);
      await fetchDashboard();
    } catch {
      showToast("Error al ejecutar la simulación");
    }
  };

  const accentHex = dash ? PALETTES[dash.config.accent] || "#D4FF3A" : "#D4FF3A";

  return (
    <div
      style={
        {
          "--accent": accentHex,
          minHeight: "100vh",
          background: "#09090B",
          backgroundImage:
            "linear-gradient(#ffffff08 1px, transparent 1px), linear-gradient(90deg, #ffffff08 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          color: "#A1A1AA",
          fontFamily: "'Geist', system-ui, sans-serif",
          paddingBottom: 64,
        } as React.CSSProperties
      }
    >
      {/* Top Navbar */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(9,9,11,0.82)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid #18181B",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "16px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            fontFamily: "'Geist Mono', monospace",
            fontSize: 13,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                color: "#FAFAFA",
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              <span style={{ color: "var(--accent)" }}>&gt;</span>
              <span>manuel.gallego</span>
            </Link>
            <span
              style={{
                padding: "2px 10px",
                borderRadius: 999,
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                fontSize: 11,
              }}
            >
              admin_console
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/" style={{ color: "#A1A1AA" }}>
              ← volver al portafolio
            </Link>
            {authenticated && (
              <button
                onClick={handleLogout}
                style={{
                  border: "1px solid #27272A",
                  borderRadius: 999,
                  background: "transparent",
                  color: "#FAFAFA",
                  font: "inherit",
                  fontSize: 12,
                  padding: "5px 14px",
                }}
              >
                cerrar sesión
              </button>
            )}
          </div>
        </div>
      </nav>

      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "48px 28px 0",
        }}
      >
        {!authenticated || !dash ? (
          <div
            style={{
              maxWidth: 440,
              margin: "64px auto",
              padding: 32,
              borderRadius: 20,
              border: "1px solid #27272A",
              background: "#0E0E11",
              boxShadow:
                "0 0 80px color-mix(in oklch, var(--accent) 12%, transparent)",
            }}
          >
            <div
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 12,
                color: "#71717A",
                marginBottom: 12,
              }}
            >
              <span style={{ color: "var(--accent)" }}>&gt;</span>{" "}
              auth.admin_login
            </div>
            <h1
              style={{
                margin: "0 0 8px",
                color: "#FAFAFA",
                fontSize: 28,
                fontWeight: 500,
                letterSpacing: "-0.03em",
              }}
            >
              Acceso Administrador<span style={{ color: "var(--accent)" }}>_</span>
            </h1>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#A1A1AA" }}>
              Acceso restringido. Los intentos fallidos quedan registrados.
            </p>
            <form
              onSubmit={handleLogin}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 13,
                  color: "#D4D4D8",
                  fontFamily: "'Geist Mono', monospace",
                }}
              >
                username
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={64}
                  required
                  className="mg-input"
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid #27272A",
                    background: "#09090B",
                    color: "#FAFAFA",
                    font: "inherit",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </label>
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 13,
                  color: "#D4D4D8",
                  fontFamily: "'Geist Mono', monospace",
                }}
              >
                password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  maxLength={128}
                  required
                  className="mg-input"
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid #27272A",
                    background: "#09090B",
                    color: "#FAFAFA",
                    font: "inherit",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </label>
              {authError && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #FF5F57",
                    background: "rgba(255,95,87,0.08)",
                    color: "#FF5F57",
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 12,
                  }}
                >
                  {authError}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="mg-submit-btn"
                style={{
                  marginTop: 6,
                  height: 44,
                  borderRadius: 999,
                  border: 0,
                  background: "var(--accent)",
                  color: "#09090B",
                  fontWeight: 500,
                  fontSize: 15,
                }}
              >
                {loading ? "Verificando..." : "Iniciar sesión →"}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 12,
                    color: "var(--accent)",
                  }}
                >
                  ● sesión activa · {dash.admin}@alejandrogallego.dev
                </div>
                <h1
                  style={{
                    margin: "4px 0 0",
                    color: "#FAFAFA",
                    fontSize: "clamp(28px, 4vw, 42px)",
                    fontWeight: 500,
                    letterSpacing: "-0.035em",
                  }}
                >
                  Centro de Control &amp; Anti-Cheat
                </h1>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={simulateTamperAttack}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 999,
                    border: "1px solid #FF5F57",
                    background: "rgba(255,95,87,0.1)",
                    color: "#FF5F57",
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 12,
                  }}
                >
                  ⚡ Simular ataque al puntaje (Demo Anti-Cheat)
                </button>
                <button
                  onClick={() => fetchDashboard()}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 999,
                    border: "1px solid #27272A",
                    background: "#0E0E11",
                    color: "#FAFAFA",
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 12,
                  }}
                >
                  Actualizar datos ↻
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 16,
              }}
            >
              {[
                {
                  label: "sesiones firmadas",
                  val: dash.stats.total_sessions,
                  c: "#FAFAFA",
                },
                {
                  label: "récords verificados",
                  val: dash.stats.total_scores,
                  c: "var(--accent)",
                },
                {
                  label: "récord mundial (pts)",
                  val: dash.stats.highest_score,
                  c: "var(--accent)",
                },
                {
                  label: "ataques bloqueados",
                  val: dash.stats.blocked_cheats,
                  c: "#FF5F57",
                },
                {
                  label: "mensajes sin leer",
                  val: dash.stats.unread_messages,
                  c: "#FAFAFA",
                },
              ].map((k, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 20,
                    borderRadius: 16,
                    border: "1px solid #1F1F23",
                    background: "#0E0E11",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 34,
                      fontWeight: 500,
                      color: k.c,
                      letterSpacing: "-0.03em",
                      lineHeight: 1.1,
                    }}
                  >
                    {k.val}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: 12,
                      color: "#71717A",
                    }}
                  >
                    {k.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Navigation Tabs */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                borderBottom: "1px solid #1F1F23",
                paddingBottom: 14,
                fontFamily: "'Geist Mono', monospace",
                fontSize: 13,
              }}
            >
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    aria-pressed={active}
                    onClick={() => setTab(t.id)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 999,
                      border: `1px solid ${
                        active ? "var(--accent)" : "#27272A"
                      }`,
                      background: active ? "var(--accent)" : "#0E0E11",
                      color: active ? "#09090B" : "#D4D4D8",
                      font: "inherit",
                      fontWeight: active ? 500 : 400,
                    }}
                  >
                    {t.label(dash)}
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Leaderboard */}
            {tab === "leaderboard" && (
              <div
                style={{
                  border: "1px solid #1F1F23",
                  borderRadius: 16,
                  background: "#0E0E11",
                  overflowX: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 13,
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid #1F1F23",
                        color: "#71717A",
                        fontSize: 12,
                      }}
                    >
                      <th style={{ padding: "14px 16px" }}>Rank</th>
                      <th style={{ padding: "14px 16px" }}>Username</th>
                      <th style={{ padding: "14px 16px" }}>Score</th>
                      <th style={{ padding: "14px 16px" }}>Ticks / Tiempo</th>
                      <th style={{ padding: "14px 16px" }}>Proof Hash</th>
                      <th style={{ padding: "14px 16px" }}>Fecha</th>
                      <th style={{ padding: "14px 16px" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dash.leaderboard.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            padding: 28,
                            textAlign: "center",
                            color: "#71717A",
                          }}
                        >
                          No hay puntuaciones registradas todavía.
                        </td>
                      </tr>
                    ) : (
                      dash.leaderboard.map((row) => (
                        <tr
                          key={row.id}
                          style={{ borderBottom: "1px solid #18181B" }}
                        >
                          <td
                            style={{
                              padding: "12px 16px",
                              color:
                                row.rank <= 3 ? "var(--accent)" : "#71717A",
                            }}
                          >
                            #{row.rank}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              color: "#FAFAFA",
                              fontWeight: 500,
                            }}
                          >
                            {row.username}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              color: "var(--accent)",
                              fontWeight: 500,
                            }}
                          >
                            {row.score} pts
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {row.total_ticks} ticks (
                            {(row.duration_ms / 1000).toFixed(1)}s)
                          </td>
                          <td style={{ padding: "12px 16px", color: "#71717A" }}>
                            ✓ {row.replay_hash}
                          </td>
                          <td style={{ padding: "12px 16px", color: "#71717A" }}>
                            {new Date(row.created_at).toLocaleString()}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <button
                              onClick={() => handleDeleteScore(row.id, row.username)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 8,
                                border: "1px solid #27272A",
                                background: "transparent",
                                color: "#FF5F57",
                                font: "inherit",
                                fontSize: 11,
                              }}
                            >
                              eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 2: Security & Anti-Cheat Logs */}
            {tab === "security" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {dash.security_logs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: "14px 18px",
                      borderRadius: 14,
                      border:
                        log.severity === "CRITICAL"
                          ? "1px solid rgba(255,95,87,0.45)"
                          : "1px solid #1F1F23",
                      background: "#0E0E11",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 10,
                            background:
                              log.severity === "CRITICAL"
                                ? "rgba(255,95,87,0.16)"
                                : log.severity === "WARNING"
                                ? "rgba(252,209,22,0.15)"
                                : "rgba(212,255,58,0.14)",
                            color:
                              log.severity === "CRITICAL"
                                ? "#FF5F57"
                                : log.severity === "WARNING"
                                ? "#FCD116"
                                : "var(--accent)",
                          }}
                        >
                          {log.severity}
                        </span>
                        <span style={{ color: "#FAFAFA", fontWeight: 500 }}>
                          {log.event_type}
                        </span>
                        {log.username && (
                          <span style={{ color: "#A1A1AA" }}>
                            user: {log.username}
                          </span>
                        )}
                        {log.client_ip && (
                          <span style={{ color: "#71717A" }}>
                            ip: {log.client_ip}
                          </span>
                        )}
                      </div>
                      <div style={{ color: "#A1A1AA" }}>{log.details}</div>
                    </div>
                    <span style={{ color: "#71717A", fontSize: 11 }}>
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Contact Messages */}
            {tab === "messages" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {dash.messages.length === 0 ? (
                  <div
                    style={{
                      padding: 32,
                      borderRadius: 16,
                      border: "1px solid #1F1F23",
                      background: "#0E0E11",
                      textAlign: "center",
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: 13,
                      color: "#71717A",
                    }}
                  >
                    Bandeja de mensajes vacía.
                  </div>
                ) : (
                  dash.messages.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: 20,
                        borderRadius: 16,
                        border: m.is_read
                          ? "1px solid #1F1F23"
                          : "1px solid var(--accent)",
                        background: "#0E0E11",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div>
                          <span
                            style={{
                              color: "#FAFAFA",
                              fontWeight: 500,
                              fontSize: 16,
                            }}
                          >
                            {m.name}
                          </span>{" "}
                          <a
                            href={`mailto:${m.email}`}
                            style={{
                              fontFamily: "'Geist Mono', monospace",
                              fontSize: 12,
                              color: "var(--accent)",
                            }}
                          >
                            &lt;{m.email}&gt;
                          </a>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontFamily: "'Geist Mono', monospace",
                            fontSize: 11,
                          }}
                        >
                          <span style={{ color: "#71717A" }}>
                            {new Date(m.created_at).toLocaleString()}
                          </span>
                          <button
                            onClick={() => handleToggleMessageRead(m.id)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 8,
                              border: "1px solid #27272A",
                              background: "transparent",
                              color: "#FAFAFA",
                              font: "inherit",
                            }}
                          >
                            {m.is_read ? "marcar no leído" : "marcar leído ✓"}
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(m.id)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 8,
                              border: "1px solid #27272A",
                              background: "transparent",
                              color: "#FF5F57",
                              font: "inherit",
                            }}
                          >
                            eliminar
                          </button>
                        </div>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          color: "#D4D4D8",
                          fontSize: 15,
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {m.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 4: Live Visual Configuration */}
            {tab === "config" && (
              <div
                style={{
                  padding: 28,
                  borderRadius: 16,
                  border: "1px solid #1F1F23",
                  background: "#0E0E11",
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 6px", color: "#FAFAFA" }}>
                    Paleta Neón (`--accent`)
                  </h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {(["Lima", "Cian", "Magenta", "Naranja"] as const).map(
                      (pal) => (
                        <button
                          key={pal}
                          onClick={() =>
                            handleUpdateConfig({ ...dash.config, accent: pal })
                          }
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 16px",
                            borderRadius: 999,
                            border:
                              dash.config.accent === pal
                                ? `1px solid ${PALETTES[pal]}`
                                : "1px solid #27272A",
                            background: "#09090B",
                            color: "#FAFAFA",
                            fontFamily: "'Geist Mono', monospace",
                            fontSize: 13,
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: PALETTES[pal],
                            }}
                          />
                          {pal}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: "0 0 6px", color: "#FAFAFA" }}>
                    Estilo del Retrato Hero (`photoStyle`)
                  </h3>
                  <div style={{ display: "flex", gap: 10 }}>
                    {(["ASCII", "Duotono"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() =>
                          handleUpdateConfig({
                            ...dash.config,
                            photo_style: st,
                          })
                        }
                        style={{
                          padding: "8px 16px",
                          borderRadius: 999,
                          border:
                            dash.config.photo_style === st
                              ? "1px solid var(--accent)"
                              : "1px solid #27272A",
                          background:
                            dash.config.photo_style === st
                              ? "var(--accent)"
                              : "#09090B",
                          color:
                            dash.config.photo_style === st
                              ? "#09090B"
                              : "#FAFAFA",
                          fontFamily: "'Geist Mono', monospace",
                          fontSize: 13,
                        }}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  {CONFIG_TOGGLES.map((item) => {
                    const val = dash.config[item.key];
                    return (
                      <button
                        key={item.key}
                        onClick={() =>
                          handleUpdateConfig({
                            ...dash.config,
                            [item.key]: !val,
                          })
                        }
                        style={{
                          padding: "14px 16px",
                          borderRadius: 12,
                          border: val
                            ? "1px solid var(--accent)"
                            : "1px solid #27272A",
                          background: "#09090B",
                          color: "#FAFAFA",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontFamily: "'Geist Mono', monospace",
                          fontSize: 12,
                        }}
                      >
                        <span>{item.label}</span>
                        <span
                          style={{
                            color: val ? "var(--accent)" : "#71717A",
                          }}
                        >
                          {val ? "ON" : "OFF"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {statusToast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 28,
            zIndex: 50,
            transform: "translateX(-50%)",
            padding: "12px 18px",
            borderRadius: 999,
            background: "#FAFAFA",
            color: "#09090B",
            fontFamily: "'Geist Mono', monospace",
            fontSize: 13,
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          }}
        >
          {statusToast}
        </div>
      )}
    </div>
  );
}

