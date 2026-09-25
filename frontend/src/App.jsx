import React, { useState, useEffect } from 'react';
import { ShieldAlert, Globe, Activity, HardDrive, AlertTriangle, ShieldCheck, Cpu, Wifi } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';

function App() {
  const [summary, setSummary] = useState({ total_packets: 0, speed_kbps: 0, active_devices: 0, top_ips: [] });
  const [alerts, setAlerts] = useState([]);
  const [dnsLog, setDnsLog] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [trafficHistory, setTrafficHistory] = useState([]);

  useEffect(() => {
    let ws;
    
    const connect = () => {
      ws = new WebSocket('ws://127.0.0.1:8000/ws');
      
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        setTimeout(connect, 3000);
      };
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'summary') {
            setSummary(msg.data);
            setTrafficHistory(prev => {
              const newHist = [...prev, { time: new Date().toLocaleTimeString(), speed: msg.data.speed_kbps }];
              return newHist.slice(-20); // Keep last 20 ticks
            });
          } else if (msg.type === 'alert') {
            setAlerts(prev => [msg.data, ...prev].slice(0, 20));
          } else if (msg.type === 'dns') {
            setDnsLog(prev => [msg.data, ...prev].slice(0, 20));
          }
        } catch (e) {
          console.error("Message parse error", e);
        }
      };
    };

    connect();
    return () => { if (ws) ws.close(); };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-indigo-950/20 to-slate-900 text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-500/30">
      
      {/* Navbar */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 p-5 rounded-2xl shadow-lg mb-8">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative bg-slate-900 p-2 rounded-full border border-slate-700">
              <ShieldAlert className="text-cyan-400 w-8 h-8" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 tracking-tight">NETLENS</h1>
            <p className="text-xs text-slate-400 font-medium tracking-widest uppercase mt-0.5">Tactical NIDS Dashboard</p>
          </div>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-3 bg-slate-950/50 px-4 py-2 rounded-full border border-slate-800">
          <div className="relative flex h-3 w-3">
            {wsConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${wsConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          </div>
          <span className={`text-sm font-semibold tracking-wide ${wsConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
            {wsConnected ? 'SYSTEM ONLINE' : 'ENGINE DISCONNECTED'}
          </span>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { title: "Traffic Speed", value: `${summary.speed_kbps.toFixed(1)} KB/s`, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { title: "Total Packets", value: summary.total_packets.toLocaleString(), icon: HardDrive, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { title: "Active Devices", value: summary.active_devices, icon: Wifi, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
          { title: "Threat Alerts", value: alerts.length, icon: AlertTriangle, color: alerts.length > 0 ? "text-rose-400" : "text-slate-400", bg: alerts.length > 0 ? "bg-rose-500/10" : "bg-slate-500/10", border: alerts.length > 0 ? "border-rose-500/30" : "border-slate-700" }
        ].map((stat, i) => (
          <div key={i} className={`relative group bg-slate-900/40 backdrop-blur-md border ${stat.border} p-6 rounded-2xl shadow-xl overflow-hidden transition-all hover:scale-[1.02]`}>
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon className="w-32 h-32" />
            </div>
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium">{stat.title}</p>
                <h3 className={`text-2xl font-bold ${stat.color} mt-1`}>{stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Traffic History Area Chart */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl shadow-xl">
            <h2 className="text-lg font-semibold text-slate-200 mb-6 flex items-center">
              <ActivitySquare className="w-5 h-5 mr-2 text-cyan-400" /> Live Bandwidth Usage
            </h2>
            <div className="h-48 w-full">
              <ResponsiveContainer>
                <AreaChart data={trafficHistory} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem', color: '#f1f5f9'}} />
                  <Area type="monotone" dataKey="speed" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorSpeed)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Devices Bar Chart */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl shadow-xl">
            <h2 className="text-lg font-semibold text-slate-200 mb-6 flex items-center">
              <Cpu className="w-5 h-5 mr-2 text-blue-400" /> Top Network Consumers (Bytes)
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={summary.top_ips} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(val) => `${(val/1024).toFixed(0)}k`} />
                  <YAxis dataKey="ip" type="category" width={110} stroke="#94a3b8" fontSize={12} fontWeight={500} />
                  <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem'}} />
                  <Bar dataKey="bytes" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {summary.top_ips.map((entry, index) => (
                      <cell key={`cell-${index}`} fill={index === 0 ? '#0ea5e9' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* DNS Log Table */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl shadow-xl">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-indigo-400" /> DNS Intercept Log
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="min-w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950/80 text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Source IP</th>
                    <th className="px-5 py-4 font-semibold">Queried Domain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 bg-slate-900/20">
                  {dnsLog.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-indigo-300">{log.src_ip}</td>
                      <td className="px-5 py-3 font-medium text-slate-300">{log.domain}</td>
                    </tr>
                  ))}
                  {dnsLog.length === 0 && (
                    <tr><td colSpan="2" className="px-5 py-8 text-center text-slate-500 italic">Listening for DNS queries on UDP 53...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column - Threat Panel */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-1 rounded-2xl shadow-2xl flex flex-col h-full relative overflow-hidden">
          {alerts.length > 0 && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-rose-500 animate-pulse"></div>}
          
          <div className="p-5 flex items-center justify-between border-b border-slate-800/80">
            <h2 className="text-lg font-bold text-slate-200 flex items-center">
              <ShieldAlert className={`w-5 h-5 mr-2 ${alerts.length > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`} /> 
              Intrusion Alerts
            </h2>
            <div className="px-2.5 py-1 bg-slate-950 text-slate-400 border border-slate-800 text-[10px] font-bold tracking-widest uppercase rounded flex items-center">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></div> ACTIVE
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {alerts.map((alert, i) => (
              <div key={i} className={`p-4 rounded-xl border backdrop-blur-sm relative overflow-hidden group ${
                  alert.level === 'CRITICAL' 
                    ? 'border-rose-500/50 bg-rose-950/20 hover:bg-rose-900/30' 
                    : 'border-amber-500/50 bg-amber-950/20 hover:bg-amber-900/30'
                } transition-colors duration-300`}>
                
                {/* Decorative side line */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${alert.level === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                
                <div className="flex justify-between items-start mb-2 pl-2">
                  <span className={`text-[10px] font-black tracking-wider px-2 py-1 rounded uppercase ${
                    alert.level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {alert.type}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{new Date(alert.timestamp * 1000).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed pl-2 mt-2">{alert.message}</p>
              </div>
            ))}
            
            {alerts.length === 0 && (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-500">
                <ShieldCheck className="w-16 h-16 mb-4 text-slate-700" />
                <p className="font-medium text-slate-400">Zero Intrusions Detected</p>
                <p className="text-xs mt-2 text-slate-600">All defensive parameters nominal.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
