import React, { useState, useEffect } from 'react';
import { ShieldAlert, Globe, Activity, HardDrive, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function App() {
  const [summary, setSummary] = useState({ total_packets: 0, speed_kbps: 0, active_devices: 0, top_ips: [] });
  const [alerts, setAlerts] = useState([]);
  const [dnsLog, setDnsLog] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    let ws;
    
    const connect = () => {
      ws = new WebSocket('ws://127.0.0.1:8000/ws');
      
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        setTimeout(connect, 3000); // Reconnect loop
      };
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'summary') {
            setSummary(msg.data);
          } else if (msg.type === 'alert') {
            setAlerts(prev => [msg.data, ...prev].slice(0, 20)); // keep last 20
          } else if (msg.type === 'dns') {
            setDnsLog(prev => [msg.data, ...prev].slice(0, 20)); // keep last 20
          }
        } catch (e) {
          console.error("Message parse error", e);
        }
      };
    };

    connect();
    
    return () => {
      if (ws) ws.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 font-sans">
      
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-700 pb-4 mb-6">
        <div className="flex items-center space-x-3">
          <ShieldAlert className="text-blue-500 w-8 h-8" />
          <h1 className="text-2xl font-bold tracking-wider text-blue-400">NETLENS</h1>
          <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded-full ml-4">NIDS Dashboard</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-400">{wsConnected ? 'Connected to Engine' : 'Engine Disconnected'}</span>
        </div>
      </header>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col">
          <div className="flex items-center text-gray-400 mb-2">
            <Activity className="w-5 h-5 mr-2" /> <span>Traffic Speed</span>
          </div>
          <div className="text-3xl font-bold text-green-400">{summary.speed_kbps.toFixed(1)} <span className="text-sm font-normal text-gray-500">KB/s</span></div>
        </div>
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col">
          <div className="flex items-center text-gray-400 mb-2">
            <HardDrive className="w-5 h-5 mr-2" /> <span>Total Packets</span>
          </div>
          <div className="text-3xl font-bold text-blue-400">{summary.total_packets.toLocaleString()}</div>
        </div>
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col">
          <div className="flex items-center text-gray-400 mb-2">
            <Globe className="w-5 h-5 mr-2" /> <span>Active Devices</span>
          </div>
          <div className="text-3xl font-bold text-purple-400">{summary.active_devices}</div>
        </div>
        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col">
          <div className="flex items-center text-gray-400 mb-2">
            <AlertTriangle className="w-5 h-5 mr-2" /> <span>Threat Alerts</span>
          </div>
          <div className={`text-3xl font-bold ${alerts.length > 0 ? 'text-red-500' : 'text-gray-500'}`}>{alerts.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Chart & Devices */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">Top Bandwidth Consumers (Bytes)</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={summary.top_ips} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis dataKey="ip" type="category" width={100} stroke="#9ca3af" />
                  <Tooltip cursor={{fill: '#374151'}} contentStyle={{backgroundColor: '#1f2937', border: 'none', borderRadius: '8px'}} />
                  <Bar dataKey="bytes" fill="#60a5fa" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DNS Log Table */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">Live DNS Queries</h2>
            <div className="overflow-x-auto h-64 overflow-y-auto">
              <table className="min-w-full text-left text-sm text-gray-400">
                <thead className="text-xs uppercase bg-gray-700 text-gray-400 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Device IP</th>
                    <th className="px-4 py-3">Queried Domain</th>
                  </tr>
                </thead>
                <tbody>
                  {dnsLog.map((log, i) => (
                    <tr key={i} className="border-b border-gray-700 hover:bg-gray-750 transition">
                      <td className="px-4 py-3 text-purple-400 font-mono">{log.src_ip}</td>
                      <td className="px-4 py-3 text-blue-300">{log.domain}</td>
                    </tr>
                  ))}
                  {dnsLog.length === 0 && (
                    <tr><td colSpan="2" className="px-4 py-3 text-center text-gray-600">No DNS queries intercepted yet...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Threat Alerts Panel */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-red-400">Active Threats</h2>
            <div className="px-2 py-1 bg-red-900 text-red-200 text-xs rounded animate-pulse">Monitoring</div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3">
            {alerts.map((alert, i) => (
              <div key={i} className={`p-4 rounded-lg border-l-4 ${alert.level === 'CRITICAL' ? 'border-red-500 bg-red-900/30' : 'border-yellow-500 bg-yellow-900/30'}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${alert.level === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'}`}>
                    {alert.type}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(alert.timestamp * 1000).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-gray-300 mt-2">{alert.message}</p>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 mt-10">
                <ShieldAlert className="w-12 h-12 mb-3 opacity-20" />
                <p>No active threats detected.</p>
                <p className="text-xs mt-1">Network is secure.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
