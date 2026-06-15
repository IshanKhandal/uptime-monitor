import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface Service { id: number; name: string; url: string; tag?: string; }
interface Ping { id: number; timestamp: string; response_time_ms: number; status_code: number; time?: string; }

const API = "https://uptime-monitor-api-tz55.onrender.com";

export default function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [activeService, setActiveService] = useState<Service | null>(null);
  const [history, setHistory] = useState<Ping[]>([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [error, setError] = useState("");
  const [lastPinged, setLastPinged] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [chartType, setChartType] = useState<"line" | "area">("area");
  

  const theme = {
    bg: darkMode ? "#020817" : "#f1f5f9",
    card: darkMode ? "#0f172a" : "#ffffff",
    border: darkMode ? "#1e293b" : "#e2e8f0",
    text: darkMode ? "#f8fafc" : "#0f172a",
    muted: darkMode ? "#475569" : "#64748b",
    subtle: darkMode ? "#1e293b" : "#f8fafc",
    accent: "#0ea5e9",
  };

  const fetchServices = useCallback(() => {
    fetch(`${API}/services/`).then(r => r.json()).then(data => {
      setServices(data);
      if (data.length > 0 && !activeService) setActiveService(data[0]);
    }).catch(() => {});
  }, [activeService]);

  const fetchHistory = useCallback((svc: Service) => {
    fetch(`${API}/history/${svc.id}`).then(r => r.json()).then(data => {
      setHistory(data.reverse().map((p: Ping) => ({ ...p, time: new Date(p.timestamp).toLocaleTimeString() })));
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchServices(); const i = setInterval(fetchServices, 30000); return () => clearInterval(i); }, []);
  useEffect(() => { if (!activeService) return; fetchHistory(activeService); const i = setInterval(() => { fetchHistory(activeService); }, 5000); return () => clearInterval(i); }, [activeService]);

  const addService = () => {
    if (!newName.trim() || !newUrl.trim()) { setError("Name and URL are required."); return; }
    setAdding(true); setError("");
    fetch(`${API}/services/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName, url: newUrl }) })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setServices(p => [...p, data]); setActiveService(data); setNewName(""); setNewUrl(""); setAdding(false); })
      .catch(() => { setError("Failed. Check the URL."); setAdding(false); });
  };

  const deleteService = (id: number) => {
    fetch(`${API}/services/${id}`, { method: "DELETE" }).then(() => {
      const remaining = services.filter(s => s.id !== id);
      setServices(remaining);
      if (activeService?.id === id) { setActiveService(remaining[0] || null); setHistory([]); }
    }).catch(() => {});
  };

  const manualPing = () => {
    if (!activeService) return;
    setPinging(true);
    fetch(`${API}/ping/${activeService.id}`, { method: "POST" })
      .then(() => { fetchHistory(activeService); setLastPinged(new Date().toLocaleTimeString()); setPinging(false); })
      .catch(() => setPinging(false));
  };

  const exportCSV = () => {
    if (!history.length) return;
    const csv = ["Time,Status,Latency(ms)", ...history.map(p => `${p.time},${p.status_code},${p.response_time_ms}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${activeService?.name}-pings.csv`; a.click();
  };

  const uptimePercent = history.length > 0 ? ((history.filter(p => p.status_code === 200).length / history.length) * 100).toFixed(1) : "N/A";
  const avgLatency = history.length > 0 ? (history.reduce((a, p) => a + p.response_time_ms, 0) / history.length).toFixed(0) : "N/A";
  const minLatency = history.length > 0 ? Math.min(...history.map(p => p.response_time_ms)).toFixed(0) : "N/A";
  const maxLatency = history.length > 0 ? Math.max(...history.map(p => p.response_time_ms)).toFixed(0) : "N/A";
  const lastPing = history.length > 0 ? history[history.length - 1] : null;
  const isOnline = lastPing?.status_code === 200;
  const incidents = history.filter(p => p.status_code !== 200);

  const inputStyle = { padding: "8px 10px", backgroundColor: theme.subtle, border: `1px solid ${theme.border}`, borderRadius: "8px", color: theme.text, fontSize: "0.82rem", width: "100%", outline: "none" };
  const cardStyle = { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "1.25rem" };
  const labelStyle = { fontSize: "0.65rem", letterSpacing: "0.12em", color: theme.muted, textTransform: "uppercase" as const, marginBottom: "0.4rem" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: theme.bg, padding: "1.5rem", transition: "all 0.3s", fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", paddingBottom: "1rem", borderBottom: `1px solid ${theme.border}` }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: theme.text, letterSpacing: "-0.02em", margin: 0 }}>
            <span style={{ color: theme.accent, marginRight: "0.4rem", fontSize: "1rem" }}>?</span>
            Uptime Monitor
          </h1>
          <p style={{ color: theme.muted, fontSize: "0.8rem", marginTop: "2px", margin: "2px 0 0 0" }}>Real-time service health dashboard</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#10b981", display: "inline-block", boxShadow: "0 0 6px #10b981" }}></span>
            <span style={{ color: theme.muted, fontSize: "0.75rem" }}>Live</span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} style={{ padding: "6px 12px", backgroundColor: theme.subtle, color: theme.muted, border: `1px solid ${theme.border}`, borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem" }}>
            {darkMode ? "? Light" : "? Dark"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1.5rem" }}>
        {/* Sidebar */}
        <div style={{ width: "240px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ ...cardStyle }}>
            <p style={{ ...labelStyle }}>Services ({services.length})</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.75rem" }}>
              {services.length === 0 && <p style={{ color: theme.muted, fontSize: "0.8rem", margin: 0 }}>No services yet.</p>}
              {services.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <button onClick={() => setActiveService(s)} style={{ flex: 1, padding: "8px 10px", backgroundColor: activeService?.id === s.id ? theme.accent : theme.subtle, color: activeService?.id === s.id ? "#020817" : theme.text, border: `1px solid ${activeService?.id === s.id ? theme.accent : theme.border}`, borderRadius: "8px", cursor: "pointer", fontWeight: 600, textAlign: "left", fontSize: "0.82rem" }}>
                    {s.name}
                  </button>
                  <button onClick={() => deleteService(s.id)} style={{ padding: "6px 8px", backgroundColor: "transparent", color: theme.muted, border: `1px solid ${theme.border}`, borderRadius: "8px", cursor: "pointer", fontSize: "0.75rem" }} title="Delete">?</button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...cardStyle }}>
            <p style={{ ...labelStyle }}>Add Service</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }}>
              <input type="text" placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} style={{ ...inputStyle }} />
              <input type="text" placeholder="https://example.com" value={newUrl} onChange={e => setNewUrl(e.target.value)} style={{ ...inputStyle }} onKeyDown={e => e.key === "Enter" && addService()} />
              {error && <p style={{ color: "#f87171", fontSize: "0.75rem", margin: 0 }}>{error}</p>}
              <button onClick={addService} disabled={adding} style={{ padding: "8px", backgroundColor: theme.accent, color: "#020817", border: "none", borderRadius: "8px", cursor: adding ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.82rem", opacity: adding ? 0.6 : 1 }}>
                {adding ? "Adding..." : "+ Add"}
              </button>
            </div>
          </div>

          {/* Incidents */}
          {incidents.length > 0 && (
            <div style={{ ...cardStyle }}>
              <p style={{ ...labelStyle, color: "#f87171" }}>Incidents ({incidents.length})</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.75rem" }}>
                {incidents.slice(0, 5).map(p => (
                  <div key={p.id} style={{ fontSize: "0.72rem", color: "#f87171", padding: "4px 8px", backgroundColor: "#2d1515", borderRadius: "6px" }}>
                    {p.time} — {p.status_code}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
          {activeService ? (
            <>
              {/* Service header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: isOnline ? "#10b981" : "#f87171", display: "inline-block", boxShadow: isOnline ? "0 0 8px #10b981" : "0 0 8px #f87171" }}></span>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, color: theme.text, margin: 0 }}>{activeService.name}</h2>
                  </div>
                  <p style={{ color: theme.muted, fontSize: "0.75rem", margin: "2px 0 0 0" }}>{activeService.url}</p>
                  {lastPinged && <p style={{ color: theme.muted, fontSize: "0.7rem", margin: "2px 0 0 0" }}>Last manual ping: {lastPinged}</p>}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={exportCSV} style={{ padding: "7px 14px", backgroundColor: "transparent", color: theme.muted, border: `1px solid ${theme.border}`, borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem" }}>? Export CSV</button>
                  <button onClick={manualPing} disabled={pinging} style={{ padding: "7px 14px", backgroundColor: "transparent", color: theme.accent, border: `1px solid ${theme.accent}`, borderRadius: "8px", cursor: pinging ? "not-allowed" : "pointer", fontSize: "0.8rem", fontWeight: 600, opacity: pinging ? 0.5 : 1 }}>
                    {pinging ? "Pinging..." : "? Ping Now"}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
                {[
                  { label: "Status", value: lastPing === null ? "PENDING" : isOnline ? "ONLINE" : "OFFLINE", color: lastPing === null ? "#f59e0b" : isOnline ? "#10b981" : "#f87171" },
                  { label: "Uptime", value: `${uptimePercent}%`, color: theme.accent },
                  { label: "Avg Latency", value: `${avgLatency}ms`, color: "#a78bfa" },
                  { label: "Min", value: `${minLatency}ms`, color: "#10b981" },
                  { label: "Max", value: `${maxLatency}ms`, color: "#f59e0b" },
                ].map(stat => (
                  <div key={stat.label} style={{ ...cardStyle, textAlign: "center", padding: "1rem" }}>
                    <p style={{ ...labelStyle, marginBottom: "0.3rem" }}>{stat.label}</p>
                    <p style={{ fontSize: "1.2rem", fontWeight: 700, color: stat.color, margin: 0 }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div style={{ ...cardStyle }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <p style={{ ...labelStyle, margin: 0 }}>Response Time (ms)</p>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {(["area", "line"] as const).map(t => (
                      <button key={t} onClick={() => setChartType(t)} style={{ padding: "4px 10px", backgroundColor: chartType === t ? theme.accent : "transparent", color: chartType === t ? "#020817" : theme.muted, border: `1px solid ${chartType === t ? theme.accent : theme.border}`, borderRadius: "6px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, textTransform: "capitalize" }}>{t}</button>
                    ))}
                  </div>
                </div>
                {history.length === 0 ? (
                  <div style={{ height: "250px", display: "flex", alignItems: "center", justifyContent: "center", color: theme.muted }}>Waiting for ping data...</div>
                ) : (
                  <div style={{ height: "250px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === "area" ? (
                        <AreaChart data={history}>
                          <defs>
                            <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                          <XAxis dataKey="time" stroke={theme.border} tick={{ fontSize: 10, fill: theme.muted }} />
                          <YAxis stroke={theme.border} tick={{ fontSize: 10, fill: theme.muted }} unit="ms" />
                          <Tooltip contentStyle={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: "8px", fontSize: "0.8rem" }} labelStyle={{ color: theme.muted }} itemStyle={{ color: theme.accent }} />
                          <Area type="monotone" dataKey="response_time_ms" stroke="#0ea5e9" strokeWidth={2} fill="url(#latencyGrad)" name="Latency" />
                        </AreaChart>
                      ) : (
                        <LineChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                          <XAxis dataKey="time" stroke={theme.border} tick={{ fontSize: 10, fill: theme.muted }} />
                          <YAxis stroke={theme.border} tick={{ fontSize: 10, fill: theme.muted }} unit="ms" />
                          <Tooltip contentStyle={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: "8px", fontSize: "0.8rem" }} labelStyle={{ color: theme.muted }} itemStyle={{ color: theme.accent }} />
                          <Line type="monotone" dataKey="response_time_ms" stroke="#0ea5e9" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Latency" />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Recent pings table */}
              <div style={{ ...cardStyle }}>
                <p style={{ ...labelStyle, marginBottom: "0.75rem" }}>Recent Pings</p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                      {["Time", "Status", "Latency"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: theme.muted, fontWeight: 600, fontSize: "0.7rem", letterSpacing: "0.08em" }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(-10).reverse().map(p => (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${theme.subtle}` }}>
                        <td style={{ padding: "6px 8px", color: theme.muted }}>{p.time}</td>
                        <td style={{ padding: "6px 8px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, backgroundColor: p.status_code === 200 ? "#052e16" : "#2d1515", color: p.status_code === 200 ? "#10b981" : "#f87171" }}>{p.status_code}</span>
                        </td>
                        <td style={{ padding: "6px 8px", color: theme.text }}>{p.response_time_ms}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ ...cardStyle, textAlign: "center", padding: "4rem", color: theme.muted }}>Add a service to start monitoring.</div>
          )}
        </div>
      </div>
    </div>
  );
}


