import React, { useEffect, useState } from 'react';
import { 
  Terminal, 
  Play, 
  Square, 
  Pause, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Flame, 
  Zap, 
  Code, 
  CheckCircle2, 
  SlidersHorizontal,
  Sliders,
  AlertTriangle
} from 'lucide-react';
import ScadaCard from '../components/common/ScadaCard';
import ScadaBadge from '../components/common/ScadaBadge';

export default function SimulatorPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [interval, setInterval2] = useState(5000);
  const [scenario, setScenario] = useState('NORMAL');
  const [lastPayload, setLastPayload] = useState<any>(null);
  const [showPayload, setShowPayload] = useState(false);
  const SIM_BASE = (import.meta.env.VITE_SIM_URL as string) || '';

  const SCENARIOS = [
    'NORMAL', 'MACHINE_STARTUP', 'MACHINE_SHUTDOWN', 'POWER_SPIKE',
    'MACHINE_OVERLOAD', 'MACHINE_FAULT', 'HIGH_TEMPERATURE', 'HIGH_OCCUPANCY',
    'HIGH_VIBRATION', 'HIGH_CURRENT', 'SENSOR_FAILURE', 'MQTT_DISCONNECT'
  ];

  const simFetch = async (path: string, method = 'GET', body?: any) => {
    try {
      const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(`${SIM_BASE}${path}`, opts);
      return await res.json();
    } catch (e: any) {
      return { error: e.message };
    }
  };

  const loadStatus = async () => {
    const data = await simFetch('/sim/status');
    if (!data.error) setStatus(data);
  };

  const loadPayload = async () => {
    const data = await simFetch('/sim/telemetry/latest');
    if (!data.error) setLastPayload(data);
  };

  useEffect(() => {
    loadStatus();
    loadPayload();
    const t = setInterval(() => { 
      loadStatus(); 
      loadPayload(); 
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const action = async (path: string, body?: any) => {
    setLoading(true);
    await simFetch(path, 'POST', body);
    await loadStatus();
    setLoading(false);
  };

  const setIntervalMs = async () => {
    await action('/sim/interval', { intervalMs: interval });
  };

  const setScenarioNow = async () => {
    await action('/sim/scenario', { scenario });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#303A44]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-[#E8EDF2]">
              SYNTHETIC PLC & TESTBED SIMULATOR
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C242C] border border-[#303A44] text-[#38BDF8]">
              PORT 5000 &bull; EXPRESS / MQTT
            </span>
          </div>
          <p className="text-xs text-[#8D9AA7] font-mono mt-0.5">
            HIGH-FIDELITY ELECTRICAL PHYSICS, STATEFUL MACHINES & CONTROLLED FAULT INJECTION
          </p>
        </div>

        <button 
          onClick={() => { loadStatus(); loadPayload(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C242C] hover:bg-[#222B35] border border-[#303A44] rounded text-xs font-mono text-[#8D9AA7] hover:text-[#E8EDF2] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>PING SIMULATOR</span>
        </button>
      </div>

      {/* Simulator Master Status Bar */}
      {status ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          <div className="bg-[#1C242C] border border-[#303A44] rounded p-3">
            <div className="text-[10px] text-[#8D9AA7]">DAEMON STATUS</div>
            <div className="mt-1 flex items-center gap-2 text-base font-bold text-[#E8EDF2]">
              <ScadaBadge status={status.running ? 'RUNNING' : 'OFF'} pulse={status.running} />
              {status.paused && <span className="text-[#F0B44D] text-xs font-normal">[PAUSED]</span>}
            </div>
          </div>

          <div className="bg-[#1C242C] border border-[#303A44] rounded p-3">
            <div className="text-[10px] text-[#8D9AA7]">ACTIVE SCENARIO</div>
            <div className="mt-1 text-base font-bold text-[#38BDF8]">
              {status.activeScenario || 'NORMAL'}
            </div>
          </div>

          <div className="bg-[#1C242C] border border-[#303A44] rounded p-3">
            <div className="text-[10px] text-[#8D9AA7]">TELEMETRY TICK</div>
            <div className="mt-1 text-base font-bold text-[#E8EDF2]">
              {status.intervalMs} <span className="text-xs text-[#8D9AA7]">ms</span>
            </div>
          </div>

          <div className="bg-[#1C242C] border border-[#303A44] rounded p-3">
            <div className="text-[10px] text-[#8D9AA7]">MQTT BROKER CONNECTION</div>
            <div className="mt-1 flex items-center gap-2 text-base font-bold">
              <ScadaBadge status={status.mqttConnected ? 'ONLINE' : 'OFFLINE'} />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-[#EF5555]/10 border border-[#EF5555]/30 rounded text-xs font-mono text-[#EF5555]">
          Cannot connect to Synthetic Simulator on http://localhost:5000. Ensure simulator workspace is running.
        </div>
      )}

      {/* Simulator Control Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Panel 1: Simulation Run Controls */}
        <ScadaCard title="SIMULATOR LIFECYCLE CONTROLS">
          <div className="space-y-4 font-mono text-xs">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => action('/sim/start')}
                disabled={loading || status?.running}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#35C98A] hover:bg-[#2EB87C] disabled:opacity-40 text-[#101418] font-bold rounded"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>START</span>
              </button>

              <button
                onClick={() => action('/sim/pause')}
                disabled={loading || !status?.running}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F0B44D] hover:bg-[#D97706] disabled:opacity-40 text-[#101418] font-bold rounded"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>{status?.paused ? 'RESUME' : 'PAUSE'}</span>
              </button>

              <button
                onClick={() => action('/sim/stop')}
                disabled={loading || !status?.running}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EF5555] hover:bg-[#DC2626] disabled:opacity-40 text-white font-bold rounded"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>STOP</span>
              </button>
            </div>

            <div className="pt-3 border-t border-[#26303B]">
              <label className="block text-[#8D9AA7] mb-1.5">TRANSMISSION FREQUENCY (MILLISECONDS)</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1000"
                  max="10000"
                  step="500"
                  value={interval}
                  onChange={e => setInterval2(Number(e.target.value))}
                  className="flex-1 accent-[#38BDF8]"
                />
                <span className="w-16 text-right font-bold text-[#E8EDF2]">{interval}ms</span>
                <button
                  onClick={setIntervalMs}
                  className="px-3 py-1.5 bg-[#222B35] hover:bg-[#303A44] border border-[#303A44] rounded text-[#E8EDF2]"
                >
                  SET
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-[#26303B] flex items-center justify-between">
              <span className="text-[#8D9AA7]">BROKER LINK INTERRUPT:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => action('/sim/disconnect-mqtt')}
                  className="px-2.5 py-1 text-xs bg-[#EF5555]/10 text-[#EF5555] border border-[#EF5555]/30 rounded hover:bg-[#EF5555]/20"
                >
                  SEVER BROKER
                </button>
                <button
                  onClick={() => action('/sim/reconnect-mqtt')}
                  className="px-2.5 py-1 text-xs bg-[#35C98A]/10 text-[#35C98A] border border-[#35C98A]/30 rounded hover:bg-[#35C98A]/20"
                >
                  RESTORE BROKER
                </button>
              </div>
            </div>
          </div>
        </ScadaCard>

        {/* Panel 2: Controlled Scenario Injection */}
        <ScadaCard title="FAULT & ANOMALY SCENARIO INJECTION">
          <div className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-[#8D9AA7] mb-1.5">SELECT SCENARIO PROFILE</label>
              <select
                value={scenario}
                onChange={e => setScenario(e.target.value)}
                className="w-full px-3 py-2 bg-[#151B21] border border-[#303A44] rounded text-[#E8EDF2] font-bold focus:outline-none focus:border-[#38BDF8]"
              >
                {SCENARIOS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-[#151B21] border border-[#26303B] rounded text-[11px] text-[#8D9AA7] leading-relaxed">
              <span className="text-[#E8EDF2] font-semibold">SCENARIO BEHAVIOR: </span>
              {scenario === 'NORMAL' && 'Standard machine states and sine-wave working-hour power load.'}
              {scenario === 'POWER_SPIKE' && 'Injects an 800% current surge to trigger electrical circuit thresholds.'}
              {scenario === 'MACHINE_FAULT' && 'Forces machine 1 into emergency FAULT mode with critical vibration trip.'}
              {scenario === 'HIGH_TEMPERATURE' && 'Raises ambient heat to 55°C to test thermal alarm triggers.'}
              {scenario === 'HIGH_VIBRATION' && 'Induces bearing degradation with vibration > 7.0 mm/s.'}
              {scenario === 'MQTT_DISCONNECT' && 'Silently drops MQTT socket to test 60s offline watchdog.'}
              {!['NORMAL', 'POWER_SPIKE', 'MACHINE_FAULT', 'HIGH_TEMPERATURE', 'HIGH_VIBRATION', 'MQTT_DISCONNECT'].includes(scenario) &&
                `Triggers synthetic condition profile: ${scenario}`}
            </div>

            <button
              onClick={setScenarioNow}
              className="w-full py-2 bg-[#38BDF8] hover:bg-[#0284C7] text-[#101418] font-bold rounded shadow-xs"
            >
              ENGAGE SCENARIO
            </button>
          </div>
        </ScadaCard>
      </div>

      {/* Raw Telemetry Inspector */}
      <ScadaCard
        title="SYNTHETIC TELEMETRY PACKET INSPECTOR"
        subtitle="Live snapshot of published MQTT payload"
        action={
          <button
            onClick={() => setShowPayload(!showPayload)}
            className="text-xs font-mono text-[#38BDF8] hover:underline"
          >
            {showPayload ? 'COLLAPSE' : 'EXPAND JSON'}
          </button>
        }
      >
        {lastPayload ? (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs font-mono">
              <div className="p-2 bg-[#151B21] border border-[#26303B] rounded">
                <span className="text-[#8D9AA7] text-[10px]">DEVICE: </span>
                <span className="text-[#E8EDF2] font-bold">{lastPayload.deviceId}</span>
              </div>
              <div className="p-2 bg-[#151B21] border border-[#26303B] rounded">
                <span className="text-[#8D9AA7] text-[10px]">POWER: </span>
                <span className="text-[#38BDF8] font-bold">{lastPayload.electrical?.power?.toFixed(3)} kW</span>
              </div>
              <div className="p-2 bg-[#151B21] border border-[#26303B] rounded">
                <span className="text-[#8D9AA7] text-[10px]">TEMP: </span>
                <span className="text-[#F0B44D] font-bold">{lastPayload.environment?.temperature?.toFixed(1)}°C</span>
              </div>
              <div className="p-2 bg-[#151B21] border border-[#26303B] rounded">
                <span className="text-[#8D9AA7] text-[10px]">MACHINES: </span>
                <span className="text-[#35C98A] font-bold">{lastPayload.machines?.length || 0} ACTIVE</span>
              </div>
            </div>

            {showPayload && (
              <pre className="p-3 bg-[#11161B] border border-[#303A44] rounded text-xs font-mono text-[#38BDF8] overflow-x-auto max-h-80">
                {JSON.stringify(lastPayload, null, 2)}
              </pre>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-xs font-mono text-[#5A6675]">
            Waiting for simulation telemetry packet...
          </div>
        )}
      </ScadaCard>
    </div>
  );
}
