import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Service { id: number; name: string; url: string; }
interface Ping { id: number; timestamp: string; response_time_ms: number; status_code: number; time?: string; }

export default function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [activeService, setActiveService] = useState<Service | null>(null);
  const [history, setHistory] = useState<Ping[]>([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const fetchServices = () => {
    fetch("http://127.0.0.1:8000/services/")
      .then(res => res.json())
      .then(data => {
        setServices(data);
        if (data.length > 0 && !activeService) setActiveService(data[0]);
      });
  };

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeService) return;
    const fetchHistory = () => {
      fetch(`http://127.0.0.1:8000/history/${activeService.id}`)
        .then(res => res.json())
        .then(data => {
          const formattedData = data.reverse().map((ping: Ping) => ({
            ...ping,
            time: new Date(ping.timestamp).toLocaleTimeString(),
          }));
          setHistory(formattedData);
        });
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, [activeService]);

  const addService = () => {
    if (!newName.trim() || !newUrl.trim()) { setError("Name and URL are required."); return; }
    setAdding(true); setError("");
    fetch("http://127.0.0.1:8000/services/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, url: newUrl }),
    })
      .then(res => { if (!res.ok) throw new Error("Failed"); return res.json(); })
      .then(data => { setServices(prev => [...prev, data]); setActiveService(data); setNewName(""); setNewUrl(""); setAdding(false); })
      .catch(() => { setError("Failed to add service. Check the URL."); setAdding(false); });
  };

  const uptimePercent = history.length > 0 ? ((history.filter(p => p.status_code === 200).length / history.length) * 100).toFixed(1) : "N/A";
  const avgLatency = history.length > 0 ? (history.reduce((acc, p) => acc + p.response_time_ms, 0) / history.length).toFixed(0) : "N/A";
  const lastStatus = history.length > 0 ? history[history.length - 1].status_code : null;
  const isOnline = lastStatus === 200;

  return (
    <div style={{ backgroundColor: "#0f172a", color: "#f8fafc", minHeight: "100vh", padding: "2rem", fontFamily: "monospace" }}>
      <header style={{ borderBottom: "1px solid #334155", paddingBottom: "1rem", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, color: "#38bdf8", fontSize: "1.5rem" }}>DEVOPS UPTIME MONITOR</h1>
          <p style={{ margin: "0.25rem 0 0 0", color: "#94a3b8", fontSize: "0.85rem" }}>Real-time service health tracking</p>
        </div>
        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Auto-refresh: 5s</div>
      </header>

      <div style={{ display: "flex", gap: "1.5rem" }}>
        <div style={{ width: "260px", flexShrink: 0 }}>
          <div style={{ backgroundColor: "#1e293b", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
            <h3 style={{ marginTop: 0, marginBottom: "0.75rem", color: "#94a3b8", fontSize: "0.75rem", letterSpacing: "0.1em" }}>MONITORED SERVICES</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {services.length === 0 && <p style={{ color: "#475569", fontSize: "0.8rem", margin: 0 }}>No services yet. Add one below.</p>}
              {services.map(s => (
                <button key={s.id} onClick={() => setActiveService(s)} style={{ padding: "10px 12px", backgroundColor: activeService?.id === s.id ? "#0ea5e9" : "#334155", color: activeService?.id === s.id ? "#0f172a" : "#f8fafc", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", textAlign: "left", fontSize: "0.85rem" }}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: "#1e293b", padding: "1rem", borderRadius: "8px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "0.75rem", color: "#94a3b8", fontSize: "0.75rem", letterSpacing: "0.1em" }}>ADD SERVICE</h3>
            <input type="text" placeholder="Service name" value={newName} onChange={e => setNewName(e.target.value)} style={{ width: "100%", padding: "8px", marginBottom: "0.5rem", backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "4px", color: "#f8fafc", fontSize: "0.85rem", boxSizing: "border-box" }} />
            <input type="text" placeholder="https://example.com" value={newUrl} onChange={e => setNewUrl(e.target.value)} style={{ width: "100%", padding: "8px", marginBottom: "0.75rem", backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "4px", color: "#f8fafc", fontSize: "0.85rem", boxSizing: "border-box" }} />
            {error && <p style={{ color: "#f87171", fontSize: "0.75rem", margin: "0 0 0.5rem 0" }}>{error}</p>}
            <button onClick={addService} disabled={adding} style={{ width: "100%", padding: "8px", backgroundColor: adding ? "#334155" : "#0ea5e9", color: "#0f172a", border: "none", borderRadius: "4px", cursor: adding ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "0.85rem" }}>
              {adding ? "Adding..." : "+ Add Service"}
            </button>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {activeService ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                {[
                  { label: "STATUS", value: isOnline ? "ONLINE" : lastStatus === null ? "PENDING" : "OFFLINE", color: isOnline ? "#10b981" : lastStatus === null ? "#f59e0b" : "#f87171" },
                  { label: "UPTIME (LAST 50)", value: `${uptimePercent}%`, color: "#38bdf8" },
                  { label: "AVG LATENCY", value: `${avgLatency}ms`, color: "#a78bfa" },
                ].map(stat => (
                  <div key={stat.label} style={{ backgroundColor: "#1e293b", padding: "1.25rem", borderRadius: "8px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 0.5rem 0", color: "#64748b", fontSize: "0.7rem", letterSpacing: "0.1em" }}>{stat.label}</p>
                    <p style={{ margin: 0, color: stat.color, fontSize: "1.5rem", fontWeight: "bold" }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div style={{ backgroundColor: "#1e293b", padding: "1.5rem", borderRadius: "8px" }}>
                <h3 style={{ margin: "0 0 1.5rem 0", color: "#94a3b8", fontSize: "0.75rem", letterSpacing: "0.1em" }}>RESPONSE TIME - {activeService.name.toUpperCase()}</h3>
                {history.length === 0 ? (
                  <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>Waiting for first ping... (runs every 60s)</div>
                ) : (
                  <div style={{ height: "300px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                        <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#475569" tick={{ fontSize: 11 }} unit="ms" />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "6px" }} labelStyle={{ color: "#94a3b8" }} itemStyle={{ color: "#38bdf8" }} />
                        <Line type="monotone" dataKey="response_time_ms" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3, fill: "#38bdf8" }} activeDot={{ r: 6 }} name="Latency (ms)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ backgroundColor: "#1e293b", padding: "3rem", borderRadius: "8px", textAlign: "center", color: "#475569" }}>Add a service to start monitoring.</div>
          )}
        </div>
      </div>
    </div>
  );
}
