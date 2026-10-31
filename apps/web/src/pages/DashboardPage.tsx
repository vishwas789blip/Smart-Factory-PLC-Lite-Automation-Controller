import React, { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid 
} from 'recharts';
import { 
  Cpu, 
  Activity, 
  Zap, 
  AlertTriangle, 
  Users, 
  CheckCircle2, 
  AlertOctagon, 
  Clock, 
  Gauge, 
  ShieldCheck,
  RefreshCw,
  Flame,
  Power
} from 'lucide-react';
import api from '../lib/api';
import { useWs } from '../contexts/WsContext';
import ScadaCard from '../components/common/ScadaCard';
import ScadaBadge from '../components/common/ScadaBadge';

interface MachineItem {
  id: string;
  name?: string;
  deviceId: string;
  state: string;
  rpm: number;
  temperature: number;
  vibration: number;
  current: number;
  power: number;
  voltage: number;
  powerFactor: number;
  lastSeen: string;
}

export default function DashboardPage() {
  const { subscribe } = useWs();

  const [stats, setStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    runningMachines: 0,
    idleMachines: 0,
    faultedMachines: 0,
    currentPowerKw: 0,
    todayEnergyKwh: 0,
    peakPowerKw: 0,
    peopleCount: 0,
    activeAlerts: 0,
    utilization: 0,
  });

  const [machinesList, setMachinesList] = useState<MachineItem[]>([]);
  const [powerHistory, setPowerHistory] = useState<any[]>([]);
  const [tempHistory, setTempHistory] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [recentAutomations, setRecentAutomations] = useState<any[]>([]);
  const [latestTelemetry, setLatestTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [devRes, alertRes, telRes, energyRes, machRes] = await Promise.all([
        api.get('/devices'),
        api.get('/alerts?acknowledged=false&limit=5'),
        api.get('/telemetry/latest'),
        api.get('/analytics/energy?period=today'),
        api.get('/analytics/machines')
      ]);

      const devices = devRes.data || [];
      const online = devices.filter((d: any) => d.status === 'ONLINE').length;
      const offline = devices.filter((d: any) => d.status === 'OFFLINE').length;

      const tels = Array.isArray(telRes.data) ? telRes.data : [telRes.data].filter(Boolean);

      let totalPower = 0;
      let totalPeople = 0;
      let running = 0;
      let idle = 0;
      let faulted = 0;
      const flatMachines: MachineItem[] = [];

      tels.forEach((t: any) => {
        if (t?.electrical?.power) totalPower += t.electrical.power;
        if (t?.people?.count) totalPeople += t.people.count;

        (t?.machines || []).forEach((m: any) => {
          if (m.state === 'RUNNING') running++;
          else if (m.state === 'IDLE') idle++;
          else if (m.state === 'FAULT') faulted++;

          flatMachines.push({
            id: m.id,
            name: m.name || `Unit ${m.id}`,
            deviceId: t.deviceId,
            state: m.state || 'OFF',
            rpm: m.rpm || 0,
            temperature: m.temperature || 0,
            vibration: m.vibration || 0,
            current: m.current || t.electrical?.current || 0,
            power: m.power || t.electrical?.power || 0,
            voltage: t.electrical?.voltage || 230,
            powerFactor: t.electrical?.powerFactor || 0.95,
            lastSeen: t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : 'NOW'
          });
        });
      });

      // Calculate avg utilization from machine analytics if available
      const machAnalytics = machRes.data || [];
      const avgUtil = machAnalytics.length
        ? machAnalytics.reduce((acc: number, m: any) => acc + (m.utilization || 0), 0) / machAnalytics.length
        : 78.5;

      setStats({
        totalDevices: devices.length,
        onlineDevices: online,
        offlineDevices: offline,
        runningMachines: running,
        idleMachines: idle,
        faultedMachines: faulted,
        currentPowerKw: Math.round(totalPower * 100) / 100,
        todayEnergyKwh: Math.round((energyRes.data?.totalEnergyKwh || 0) * 100) / 100,
        peakPowerKw: Math.round((energyRes.data?.peakPowerKw || 0) * 100) / 100,
        peopleCount: totalPeople,
        activeAlerts: Array.isArray(alertRes.data) ? alertRes.data.length : 0,
        utilization: Math.round(avgUtil * 10) / 10,
      });

      setMachinesList(flatMachines);
      setRecentAlerts(alertRes.data || []);
      if (tels.length > 0) setLatestTelemetry(tels[0]);
    } catch (e) {
      console.error('Dashboard loading error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Live WebSocket updates
  useEffect(() => {
    const unsub = subscribe((msg: any) => {
      if (msg.type === 'telemetry') {
        const p = msg.payload;
        const ts = new Date(p.timestamp).toLocaleTimeString();
        setLatestTelemetry(p);

        setPowerHistory(prev => [...prev.slice(-30), { ts, power: p.electrical?.power || 0 }]);
        setTempHistory(prev => [...prev.slice(-30), { ts, temp: p.environment?.temperature || 0 }]);

        // Update machines in list
        if (p.machines) {
          setMachinesList(prev => {
            const updated = [...prev];
            p.machines.forEach((m: any) => {
              const idx = updated.findIndex(u => u.id === m.id && u.deviceId === p.deviceId);
              const item: MachineItem = {
                id: m.id,
                name: m.name || `Unit ${m.id}`,
                deviceId: p.deviceId,
                state: m.state,
                rpm: m.rpm,
                temperature: m.temperature,
                vibration: m.vibration,
                current: m.current || p.electrical?.current || 0,
                power: m.power || p.electrical?.power || 0,
                voltage: p.electrical?.voltage || 230,
                powerFactor: p.electrical?.powerFactor || 0.95,
                lastSeen: ts
              };
              if (idx >= 0) updated[idx] = item;
              else updated.push(item);
            });
            return updated;
          });
        }

        setStats(prev => ({
          ...prev,
          currentPowerKw: Math.round((p.electrical?.power || prev.currentPowerKw) * 100) / 100,
          peopleCount: p.people?.count ?? prev.peopleCount
        }));
      }

      if (msg.type === 'alert') {
        setStats(prev => ({ ...prev, activeAlerts: prev.activeAlerts + 1 }));
        setRecentAlerts(prev => [msg.alert, ...prev].slice(0, 5));
      }

      if (msg.type === 'automation_event') {
        setRecentAutomations(prev => [msg, ...prev].slice(0, 5));
      }

      if (msg.type === 'device_status') {
        setStats(prev => ({
          ...prev,
          onlineDevices: msg.status === 'ONLINE' ? prev.onlineDevices + 1 : Math.max(0, prev.onlineDevices - 1),
          offlineDevices: msg.status === 'OFFLINE' ? prev.offlineDevices + 1 : Math.max(0, prev.offlineDevices - 1),
        }));
      }
    });

    return unsub;
  }, [subscribe]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#303A44]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-[#E8EDF2]">
              OPERATIONS COMMAND CENTER
            </h1>
            <ScadaBadge status="ONLINE" pulse />
          </div>
          <p className="text-xs text-[#8D9AA7] font-mono mt-0.5">
            REAL-TIME TELEMETRY STREAM & AUTOMATION SUPERVISION
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C242C] hover:bg-[#222B35] border border-[#303A44] rounded text-xs font-mono text-[#8D9AA7] hover:text-[#E8EDF2] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>SYNC DATA</span>
          </button>
        </div>
      </div>

      {/* Row 1: Core KPI Industrial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Total Power */}
        <div className="bg-[#1C242C] border border-[#303A44] rounded p-3">
          <div className="flex items-center justify-between text-[#8D9AA7] text-[11px] font-mono">
            <span>TOTAL LOAD</span>
            <Zap className="w-3.5 h-3.5 text-[#38BDF8]" />
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-[#38BDF8]">
            {stats.currentPowerKw.toFixed(2)}
            <span className="text-xs text-[#8D9AA7] ml-1">kW</span>
          </div>
          <div className="text-[10px] text-[#5A6675] font-mono mt-0.5">
            PEAK: {stats.peakPowerKw.toFixed(1)} kW
          </div>
        </div>

        {/* Today Energy */}
        <div className="bg-[#1C242C] border border-[#303A44] rounded p-3">
          <div className="flex items-center justify-between text-[#8D9AA7] text-[11px] font-mono">
            <span>ENERGY (TODAY)</span>
            <Activity className="w-3.5 h-3.5 text-[#35C98A]" />
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-[#E8EDF2]">
            {stats.todayEnergyKwh.toFixed(1)}
            <span className="text-xs text-[#8D9AA7] ml-1">kWh</span>
          </div>
          <div className="text-[10px] text-[#35C98A] font-mono mt-0.5">
            EST. ${(stats.todayEnergyKwh * 0.12).toFixed(2)}
          </div>
        </div>

        {/* Machine States */}
        <div className="bg-[#1C242C] border border-[#303A44] rounded p-3">
          <div className="flex items-center justify-between text-[#8D9AA7] text-[11px] font-mono">
            <span>MACHINES RUNNING</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#35C98A]" />
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-[#35C98A]">
            {stats.runningMachines}
            <span className="text-xs text-[#8D9AA7] ml-1 font-normal">/ {machinesList.length || 3}</span>
          </div>
          <div className="text-[10px] text-[#8D9AA7] font-mono mt-0.5">
            IDLE: {stats.idleMachines} | FAULT: {stats.faultedMachines}
          </div>
        </div>

        {/* Plant Utilization */}
        <div className="bg-[#1C242C] border border-[#303A44] rounded p-3">
          <div className="flex items-center justify-between text-[#8D9AA7] text-[11px] font-mono">
            <span>UTILIZATION</span>
            <Gauge className="w-3.5 h-3.5 text-[#F0B44D]" />
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-[#F0B44D]">
            {stats.utilization}%
          </div>
          <div className="text-[10px] text-[#5A6675] font-mono mt-0.5">
            OEE BENCHMARK TARGET: 85%
          </div>
        </div>

        {/* PLC Hardware Status */}
        <div className="bg-[#1C242C] border border-[#303A44] rounded p-3">
          <div className="flex items-center justify-between text-[#8D9AA7] text-[11px] font-mono">
            <span>PLC HARDWARE</span>
            <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-[#E8EDF2]">
            {stats.onlineDevices}
            <span className="text-xs text-[#8D9AA7] ml-1 font-normal">ONLINE</span>
          </div>
          <div className="text-[10px] text-[#EF5555] font-mono mt-0.5">
            {stats.offlineDevices > 0 ? `${stats.offlineDevices} CONTROLLER OFFLINE` : '0 DISCONNECTED'}
          </div>
        </div>

        {/* Active Alarms */}
        <div className="bg-[#1C242C] border border-[#303A44] rounded p-3">
          <div className="flex items-center justify-between text-[#8D9AA7] text-[11px] font-mono">
            <span>ACTIVE ALARMS</span>
            <AlertOctagon className="w-3.5 h-3.5 text-[#EF5555]" />
          </div>
          <div className={`mt-1 text-2xl font-bold font-mono ${stats.activeAlerts > 0 ? 'text-[#EF5555]' : 'text-[#35C98A]'}`}>
            {stats.activeAlerts}
          </div>
          <div className="text-[10px] text-[#5A6675] font-mono mt-0.5">
            {stats.activeAlerts > 0 ? 'ACTION REQUIRED' : 'ALL CIRCUITS NOMINAL'}
          </div>
        </div>
      </div>

      {/* Row 2: Live SCADA Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Real-Time Power Area Chart */}
        <ScadaCard 
          title="ACTIVE ELECTRICAL POWER DEMAND"
          subtitle="Real-time 5s interval"
          badge={<span className="text-[10px] font-mono text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded border border-[#38BDF8]/20">kW</span>}
        >
          <div className="h-[210px] w-full">
            {powerHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={powerHistory}>
                  <defs>
                    <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#26303B" strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="ts" 
                    tick={{ fill: '#5A6675', fontSize: 10, fontFamily: 'monospace' }} 
                    stroke="#303A44"
                  />
                  <YAxis 
                    tick={{ fill: '#5A6675', fontSize: 10, fontFamily: 'monospace' }} 
                    stroke="#303A44"
                    unit=" kW"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#151B21', 
                      borderColor: '#303A44', 
                      borderRadius: 4, 
                      fontSize: 12,
                      fontFamily: 'monospace'
                    }}
                    itemStyle={{ color: '#38BDF8' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="power" 
                    stroke="#38BDF8" 
                    strokeWidth={2} 
                    fill="url(#powerGrad)" 
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#5A6675] text-xs font-mono">
                <Activity className="w-5 h-5 mb-1 animate-pulse" />
                Awaiting telemetry stream...
              </div>
            )}
          </div>
        </ScadaCard>

        {/* Ambient Temperature Line Chart */}
        <ScadaCard 
          title="ENVIRONMENTAL TEMPERATURE MONITOR"
          subtitle="Thermal gradient tracking"
          badge={<span className="text-[10px] font-mono text-[#F0B44D] bg-[#F0B44D]/10 px-1.5 py-0.5 rounded border border-[#F0B44D]/20">°C</span>}
        >
          <div className="h-[210px] w-full">
            {tempHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tempHistory}>
                  <CartesianGrid stroke="#26303B" strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="ts" 
                    tick={{ fill: '#5A6675', fontSize: 10, fontFamily: 'monospace' }} 
                    stroke="#303A44"
                  />
                  <YAxis 
                    tick={{ fill: '#5A6675', fontSize: 10, fontFamily: 'monospace' }} 
                    stroke="#303A44"
                    unit="°C"
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#151B21', 
                      borderColor: '#303A44', 
                      borderRadius: 4, 
                      fontSize: 12,
                      fontFamily: 'monospace'
                    }}
                    itemStyle={{ color: '#F0B44D' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="temp" 
                    stroke="#F0B44D" 
                    strokeWidth={2} 
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#5A6675] text-xs font-mono">
                <Flame className="w-5 h-5 mb-1 animate-pulse" />
                Awaiting environmental sensors...
              </div>
            )}
          </div>
        </ScadaCard>
      </div>

      {/* Row 3: Industrial Live Machine Status Table */}
      <ScadaCard
        title="CONNECTED MACHINE ASSETS & OPERATIONAL CHANNELS"
        subtitle="Multi-channel telemetry matrix"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#303A44] bg-[#151B21] text-[#8D9AA7] uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">CONTROLLER</th>
                <th className="py-2.5 px-3">MACHINE ID</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3">VOLTAGE</th>
                <th className="py-2.5 px-3">CURRENT</th>
                <th className="py-2.5 px-3">POWER</th>
                <th className="py-2.5 px-3">PF</th>
                <th className="py-2.5 px-3">RPM</th>
                <th className="py-2.5 px-3">TEMP</th>
                <th className="py-2.5 px-3 text-right">LAST SEEN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26303B]">
              {machinesList.length > 0 ? (
                machinesList.map((m, idx) => (
                  <tr key={`${m.deviceId}-${m.id}-${idx}`} className="hover:bg-[#222B35]/40 transition-colors">
                    <td className="py-2.5 px-3 text-[#38BDF8] font-semibold">{m.deviceId}</td>
                    <td className="py-2.5 px-3 text-[#E8EDF2]">{m.name}</td>
                    <td className="py-2.5 px-3">
                      <ScadaBadge status={m.state} />
                    </td>
                    <td className="py-2.5 px-3 text-[#E8EDF2]">{m.voltage.toFixed(1)} V</td>
                    <td className="py-2.5 px-3 text-[#E8EDF2]">{m.current.toFixed(2)} A</td>
                    <td className="py-2.5 px-3 text-[#38BDF8] font-bold">{m.power.toFixed(3)} kW</td>
                    <td className="py-2.5 px-3 text-[#8D9AA7]">{m.powerFactor.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-[#E8EDF2]">{Math.round(m.rpm)}</td>
                    <td className="py-2.5 px-3 text-[#F0B44D]">{m.temperature.toFixed(1)}°C</td>
                    <td className="py-2.5 px-3 text-right text-[#5A6675]">{m.lastSeen}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#5A6675]">
                    No machines reported yet. Ensure the PLC simulator is transmitting telemetry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ScadaCard>

      {/* Row 4: Recent Alarms & Automation Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Alarms */}
        <ScadaCard 
          title="ACTIVE INDUSTRIAL ALARMS"
          subtitle="ISA 18.2 Priority Queue"
          action={
            <a href="/alerts" className="text-[11px] font-mono text-[#38BDF8] hover:underline">
              VIEW CONSOLE →
            </a>
          }
          noPadding
        >
          <div className="divide-y divide-[#26303B]">
            {recentAlerts.length > 0 ? (
              recentAlerts.map((a: any) => (
                <div key={a._id} className="p-3 flex items-start justify-between gap-3 hover:bg-[#222B35]/30">
                  <div className="flex items-start gap-2.5">
                    <ScadaBadge status={a.severity || 'HIGH'} />
                    <div>
                      <div className="text-xs font-mono font-medium text-[#E8EDF2]">{a.message}</div>
                      <div className="text-[10px] font-mono text-[#5A6675]">
                        DEVICE: {a.deviceId} {a.machineId && `| MACHINE: ${a.machineId}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-[#5A6675] whitespace-nowrap">
                    {new Date(a.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs font-mono text-[#35C98A] flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>NO UNACKNOWLEDGED CRITICAL ALARMS</span>
              </div>
            )}
          </div>
        </ScadaCard>

        {/* Latest Raw Telemetry Strip */}
        <ScadaCard
          title="CONTROLLER BUS STATUS"
          subtitle={latestTelemetry ? `Source: ${latestTelemetry.deviceId}` : 'Awaiting heartbeat'}
        >
          {latestTelemetry ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 bg-[#151B21] border border-[#26303B] rounded">
                <div className="text-[10px] text-[#8D9AA7]">BUS VOLTAGE</div>
                <div className="text-base font-bold text-[#E8EDF2] mt-0.5">
                  {latestTelemetry.electrical?.voltage?.toFixed(1)} <span className="text-xs text-[#8D9AA7]">V</span>
                </div>
              </div>

              <div className="p-2 bg-[#151B21] border border-[#26303B] rounded">
                <div className="text-[10px] text-[#8D9AA7]">BUS CURRENT</div>
                <div className="text-base font-bold text-[#38BDF8] mt-0.5">
                  {latestTelemetry.electrical?.current?.toFixed(2)} <span className="text-xs text-[#8D9AA7]">A</span>
                </div>
              </div>

              <div className="p-2 bg-[#151B21] border border-[#26303B] rounded">
                <div className="text-[10px] text-[#8D9AA7]">HUMIDITY</div>
                <div className="text-base font-bold text-[#35C98A] mt-0.5">
                  {latestTelemetry.environment?.humidity?.toFixed(1)} <span className="text-xs text-[#8D9AA7]">%</span>
                </div>
              </div>

              <div className="p-2 bg-[#151B21] border border-[#26303B] rounded">
                <div className="text-[10px] text-[#8D9AA7]">OCCUPANCY</div>
                <div className="text-base font-bold text-[#F0B44D] mt-0.5">
                  {latestTelemetry.people?.count ?? stats.peopleCount} <span className="text-xs text-[#8D9AA7]">PERS</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs font-mono text-[#5A6675]">
              Connecting to telemetry bus...
            </div>
          )}
        </ScadaCard>
      </div>
    </div>
  );
}
