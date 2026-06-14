import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Service { id: number; name: string; url: string; }
interface Ping { id: number; timestamp: string; response_time_ms: number; status_code: number; time?: string; }

const API = "http://127.0.0.1:8000";

const card = { backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", padding: "1.25rem" };
const label = { fontSize: "0.65rem", letterSpacing: "0.12em", color: "#475569", textTransform: "uppercase" as const, marginBottom: "0.4rem" };

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

  const fetchServices = () => {
    fetch(`${API}/services/`)
      .then(r => r.json())
      .then(data => {
        setServices(data);
        if (data.length > 0 && !activeService) setActiveService(data[0]);
      })
      .catch(() => {});
  };

  const fetchHistory = (svc: Service) => {
    fetch(`${API}/history/${svc.id}`)
      .then(r => r.json())
      .then(data => {
        setHistory(data.reverse().map((p: Ping) => ({ ...p, time: new Date(p.timestamp).toLocaleTimeString() })));
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchServices();
    const i = setInterval(fetchServices, 30000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (!activeService) return;
    fetchHistory(activeService);
    const i = setInterval(() => fetchHistory(activeService), 5000);
    return () => clearInterval(i);
  }, [activeService]);

  const addService = () => {
    if (!newName.trim() || !newUrl.trim()) { setError("Name and URL are required."); return; }
    setAdding(true); setError("");
    fetch(`${API}/services/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, url: newUrl }),
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setServices(p => [...p, data]); setActiveService(data); setNewName(""); setNewUrl(""); setAdding(false); })
      .catch(() => { setError("Failed. Check the URL."); setAdding(false); });
  };

  const deleteService = (id: number) => {
    fetch(`${API}/services/${id}`, { method: "DELETE" })
      .then(() => {
        const remaining = services.filter(s => s.id !== id);
        setServices(remaining);
        if (activeService?.id === id) { setActiveService(remaining[0] || null); setHistory([]); }
      })
      .catch(() => {});
  };

  const manualPing = () => {
    if (!activeService) return;
    setPinging(true);
    fetch(`${API}/ping/${activeService.id}`, { method: "POST" })
      .then(() => { fetchHistory(activeService); setLastPinged(new Date().toLocaleTimeString()); setPinging(false); })
      .catch(() => setPinging(false));
  };

  const uptimePercent = history.length > 0 ? ((history.filter(p => p.status_code === 200).length / history.length) * 100).toFixed(1) : "N/A";
  const avgLatency = history.length > 0 ? (history.reduce((a, p) => a + p.response_time_ms, 0) / history.length).toFixed(0) : "N/A";
  const lastPing = history.length > 0 ? history[history.length - 1] : null;
  const isOnline = lastPing?.status_code === 200;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#020817", padding: "1.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", paddingBottom: "1rem", borderBottom: "1px solid #1e293b" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.02em" }}>
            <span style={{ color: "#0ea5e9" }}>?</span> Uptime Monitor
          </h1>
          <p style={{ color: "#475569", fontSize: "0.8rem", marginTop: "2px" }}>Real-time service health dashboard</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10b981", display: "inline-block" }}></span>
          <span style={{ color: "#475569", fontSize: "0.75rem" }}>Live</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1.5rem" }}>

        {/* Sidebar */}
        <div style={{ width: "240px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Services list */}
          <div style={{ ...card }}>
            <p style={{ ...label }}>Services</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.75rem" }}>
              {services.length === 0 && <p style={{ color: "#334155", fontSize: "0.8rem" }}>No services yet.</p>}
              {services.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <button
                    onClick={() => setActiveService(s)}
                    style={{ flex: 1, padding: "8px 10px", backgroundColor: activeService?.id === s.id ? "#0ea5e9" : "#0f172a", color: activeService?.id === s.id ? "#020817" : "#94a3b8", border: `1px solid ${activeService?.id === s.id ? "#0ea5e9" : "#1e293b"}`, borderRadius: "8px", cursor: "pointer", fontWeight: 600, textAlign: "left", fontSize: "0.82rem", transition: "all 0.15s" }}
                  >
                    {s.name}
                  </button>
                  <button
                    onClick={() => deleteService(s.id)}
                    style={{ padding: "6px 8px", backgroundColor: "transparent", color: "#475569", border: "1px solid #1e293b", borderRadius: "8px", cursor: "pointer", fontSize: "0.75rem", flexShrink: 0 }}
                    title="Delete"
                  >
                    ?
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add service */}
          <div style={{ ...card }}>
            <p style={{ ...label }}>Add Service</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.75rem" }}>
              <input
                type="text" placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)}
                style={{ padding: "8px 10px", backgroundColor: "#020817", border: "1px solid #1e293b", borderRadius: "8px", color: "#f8fafc", fontSize: "0.82rem", width: "100%" }}
              />
              <input
                type="text" placeholder="https://example.com" value={newUrl} onChange={e => setNewUrl(e.target.value)}
                style={{ padding: "8px 10px", backgroundColor: "#020817", border: "1px solid #1e293b", borderRadius: "8px", color: "#f8fafc", fontSize: "0.82rem", width: "100%" }}
              />
              {error && <p style={{ color: "#f87171", fontSize: "0.75rem" }}>{error}</p>}
              <button
                onClick={addService} disabled={adding}
                style={{ padding: "8px", backgroundColor: "#0ea5e9", color: "#020817", border: "none", borderRadius: "8px", cursor: adding ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.82rem", opacity: adding ? 0.6 : 1 }}
              >
                {adding ? "Adding..." : "+ Add"}
              </button>
            </div>
          </div>
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
          {activeService ? (
            <>
              {/* Service header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#f8fafc" }}>{activeService.name}</h2>
                  <p style={{ color: "#334155", fontSize: "0.75rem", marginTop: "2px" }}>{activeService.url}</p>
                </div>
                <button
                  onClick={manualPing} disabled={pinging}
                  style={{ padding: "8px 16px", backgroundColor: "transparent", color: "#0ea5e9", border: "1px solid #0ea5e9", borderRadius: "8px", cursor: pinging ? "not-allowed" : "pointer", fontSize: "0.82rem", fontWeight: 600, opacity: pinging ? 0.5 : 1 }}
                >
                  {pinging ? "Pinging..." : "? Ping Now"}
                </button>
              </div>
              {lastPinged && <p style={{ color: "#334155", fontSize: "0.72rem" }}>Last manual ping: {lastPinged}</p>}

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                {[
                  { label: "Status", value: lastPing === null ? "PENDING" : isOnline ? "ONLINE" : "OFFLINE", color: lastPing === null ? "#f59e0b" : isOnline ? "#10b981" : "#f87171" },
                  { label: "Uptime (last 50)", value: `${uptimePercent}%`, color: "#0ea5e9" },
                  { label: "Avg Latency", value: `${avgLatency}ms`, color: "#a78bfa" },
                ].map(stat => (
                  <div key={stat.label} style={{ ...card, textAlign: "center" }}>
                    <p style={{ ...label }}>{stat.label}</p>
                    <p style={{ fontSize: "1.75rem", fontWeight: 700, color: stat.color, marginTop: "0.25rem" }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div style={{ ...card }}>
                <p style={{ ...label, marginBottom: "1rem" }}>Response Time (ms)</p>
                {history.length === 0 ? (
                  <div style={{ height: "250px", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155" }}>
                    Waiting for ping data...
                  </div>
                ) : (
                  <div style={{ height: "250px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
                        <XAxis dataKey="time" stroke="#1e293b" tick={{ fontSize: 10, fill: "#475569" }} />
                        <YAxis stroke="#1e293b" tick={{ fontSize: 10, fill: "#475569" }} unit="ms" />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", fontSize: "0.8rem" }} labelStyle={{ color: "#94a3b8" }} itemStyle={{ color: "#0ea5e9" }} />
                        <Line type="monotone" dataKey="response_time_ms" stroke="#0ea5e9" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#0ea5e9" }} name="Latency" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* History table */}
              <div style={{ ...card }}>
                <p style={{ ...label, marginBottom: "0.75rem" }}>Recent Pings</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1e293b" }}>
                        {["Time", "Status", "Latency"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#475569", fontWeight: 600, fontSize: "0.7rem", letterSpacing: "0.08em" }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(-10).reverse().map(p => (
                        <tr key={p.id} style={{ borderBottom: "1px solid #0f172a" }}>
                          <td style={{ padding: "6px 8px", color: "#64748b" }}>{p.time}</td>
                          <td style={{ padding: "6px 8px" }}>
                            <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, backgroundColor: p.status_code === 200 ? "#052e16" : "#2d1515", color: p.status_code === 200 ? "#10b981" : "#f87171" }}>
                              {p.status_code}
                            </span>
                          </td>
                          <td style={{ padding: "6px 8px", color: "#94a3b8" }}>{p.response_time_ms}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div style={{ ...card, textAlign: "center", padding: "4rem", color: "#334155" }}>
              Add a service to start monitoring.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
