import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Service { id: number; name: string; url: string; }
interface Ping { id: number; timestamp: string; response_time_ms: number; status_code: number; }

export default function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [activeService, setActiveService] = useState<Service | null>(null);
  const [history, setHistory] = useState<Ping[]>([]);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/services/')
      .then(res => res.json())
      .then(data => {
        setServices(data);
        if (data.length > 0) setActiveService(data[0]);
      });
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

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', padding: '2rem', fontFamily: 'monospace' }}>
      <header style={{ borderBottom: '1px solid #334155', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, color: '#38bdf8' }}>? DEV-OPS COMMAND CENTER</h1>
        <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8' }}>Live Uptime & Latency Monitoring</p>
      </header>

      <div style={{ display: 'flex', gap: '2rem' }}>
        <div style={{ width: '250px', backgroundColor: '#1e293b', padding: '1rem', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, color: '#94a3b8' }}>MONITORED SERVICES</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {services.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveService(s)}
                style={{
                  padding: '10px',
                  backgroundColor: activeService?.id === s.id ? '#38bdf8' : '#334155',
                  color: activeService?.id === s.id ? '#0f172a' : '#f8fafc',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  textAlign: 'left'
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: '#1e293b', padding: '2rem', borderRadius: '8px' }}>
          {activeService ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ margin: 0 }}>{activeService.name} Metrics</h2>
                <span style={{ backgroundColor: '#059669', padding: '4px 12px', borderRadius: '999px', fontSize: '0.875rem' }}>
                  {history.length > 0 && history[history.length - 1].status_code === 200 ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div style={{ height: '400px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                    <Line type="monotone" dataKey="response_time_ms" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div>Select a service</div>
          )}
        </div>
      </div>
    </div>
  );
}
