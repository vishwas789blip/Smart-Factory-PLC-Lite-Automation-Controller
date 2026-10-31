import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { 
  Cpu, 
  ArrowLeft, 
  Sliders, 
  Activity, 
  Zap, 
  Clock, 
  CheckCircle2, 
  Radio, 
  Flame, 
  RefreshCw,
  Power
} from 'lucide-react';
import api from '../lib/api';
import { useWs } from '../contexts/WsContext';
import { useAuth } from '../contexts/AuthContext';
import ScadaCard from '../components/common/ScadaCard';
import ScadaBadge from '../components/common/ScadaBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { subscribe } = useWs();

  const [device, setDevice] = useState<any>(null);
  const [sensors, setSensors] = useState<any[]>([]);
  const [actuators, setActuators] = useState<any[]>([]);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [powerHistory, setPowerHistory] = useState<any[]>([]);
  const [commandStatus, setCommandStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    actuatorId: string;
    command: string;
  }>({ isOpen: false, actuatorId: '', command: '' });

  const canControl = ['OPERATOR', 'ENGINEER', 'ADMIN'].includes(user?.role || '');

  const load = async () => {
    try {
      const res = await api.get(`/devices/${id}`);
      setDevice(res.data.device);
      setSensors(res.data.sensors || []);
      setActuators(res.data.actuators || []);
      setTelemetry(res.data.latestTelemetry);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    const unsub = subscribe((msg: any) => {
      if (msg.type === 'telemetry' && msg.deviceId === id) {
        const p = msg.payload;
        setTelemetry(p);
        const ts = new Date(p.timestamp).toLocaleTimeString();
        setPowerHistory(prev => [...prev.slice(-30), {
          ts,
          power: p.electrical?.power || 0,
          current: p.electrical?.current || 0
        }]);
      }
      if (msg.type === 'actuator_state' && msg.deviceId === id) {
        setActuators(prev => prev.map(a =>
          a.actuatorId === msg.actuatorId ? { ...a, state: msg.state } : a
        ));
        setCommandStatus(prev => ({ ...prev, [msg.actuatorId]: 'ACKNOWLEDGED' }));
        setTimeout(() => {
          setCommandStatus(prev => {
            const next = { ...prev };
            delete next[msg.actuatorId];
            return next;
          });
        }, 3000);
      }
    });
    return unsub;
  }, [subscribe, id]);

  const requestCommand = (actuatorId: string, command: string) => {
    if (command === 'OFF' || command === 'RESET') {
      setConfirmDialog({ isOpen: true, actuatorId, command });
    } else {
      executeCommand(actuatorId, command);
    }
  };

  const executeCommand = async (actuatorId: string, command: string) => {
    setConfirmDialog({ isOpen: false, actuatorId: '', command: '' });
    try {
      setCommandStatus(prev => ({ ...prev, [actuatorId]: 'REQUESTED' }));
      await api.post(`/actuators/${actuatorId}/command`, { command });
      setCommandStatus(prev => ({ ...prev, [actuatorId]: 'SENT' }));
    } catch {
      setCommandStatus(prev => ({ ...prev, [actuatorId]: 'TIMEOUT' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#303A44]">
        <div className="flex items-center gap-3">
          <Link
            to="/devices"
            className="p-1.5 rounded bg-[#1C242C] border border-[#303A44] text-[#8D9AA7] hover:text-[#E8EDF2] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono tracking-wide text-[#E8EDF2]">
                {id}
              </h1>
              <ScadaBadge status={device?.status || 'ONLINE'} pulse />
            </div>
            <p className="text-xs text-[#8D9AA7] font-mono mt-0.5">
              HARDWARE CONTROLLER NODE &bull; IP: {device?.ipAddress || '192.168.1.100'}
            </p>
          </div>
        </div>

        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C242C] hover:bg-[#222B35] border border-[#303A44] rounded text-xs font-mono text-[#8D9AA7] hover:text-[#E8EDF2] transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>REFRESH</span>
        </button>
      </div>

      {/* Controller Hardware Specs & Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#1C242C] border border-[#303A44] rounded p-3 font-mono">
          <div className="text-[10px] text-[#8D9AA7]">VOLTAGE</div>
          <div className="text-lg font-bold text-[#E8EDF2] mt-0.5">
            {telemetry?.electrical?.voltage?.toFixed(1) || '230.0'} <span className="text-xs text-[#8D9AA7]">V</span>
          </div>
        </div>

        <div className="bg-[#1C242C] border border-[#303A44] rounded p-3 font-mono">
          <div className="text-[10px] text-[#8D9AA7]">CURRENT</div>
          <div className="text-lg font-bold text-[#38BDF8] mt-0.5">
            {telemetry?.electrical?.current?.toFixed(2) || '0.00'} <span className="text-xs text-[#8D9AA7]">A</span>
          </div>
        </div>

        <div className="bg-[#1C242C] border border-[#303A44] rounded p-3 font-mono">
          <div className="text-[10px] text-[#8D9AA7]">ACTIVE POWER</div>
          <div className="text-lg font-bold text-[#38BDF8] mt-0.5">
            {telemetry?.electrical?.power?.toFixed(3) || '0.000'} <span className="text-xs text-[#8D9AA7]">kW</span>
          </div>
        </div>

        <div className="bg-[#1C242C] border border-[#303A44] rounded p-3 font-mono">
          <div className="text-[10px] text-[#8D9AA7]">POWER FACTOR</div>
          <div className="text-lg font-bold text-[#35C98A] mt-0.5">
            {telemetry?.electrical?.powerFactor?.toFixed(2) || '0.95'}
          </div>
        </div>

        <div className="bg-[#1C242C] border border-[#303A44] rounded p-3 font-mono">
          <div className="text-[10px] text-[#8D9AA7]">TEMPERATURE</div>
          <div className="text-lg font-bold text-[#F0B44D] mt-0.5">
            {telemetry?.environment?.temperature?.toFixed(1) || '24.0'} <span className="text-xs text-[#8D9AA7]">°C</span>
          </div>
        </div>

        <div className="bg-[#1C242C] border border-[#303A44] rounded p-3 font-mono">
          <div className="text-[10px] text-[#8D9AA7]">HUMIDITY</div>
          <div className="text-lg font-bold text-[#35C98A] mt-0.5">
            {telemetry?.environment?.humidity?.toFixed(1) || '45.0'} <span className="text-xs text-[#8D9AA7]">%</span>
          </div>
        </div>
      </div>

      {/* Real-Time Power Demand Chart */}
      <ScadaCard
        title="BUS POWER LOAD PROFILE"
        subtitle="Active power time-series"
        badge={<span className="text-[10px] font-mono text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded border border-[#38BDF8]/20">kW</span>}
      >
        <div className="h-[200px] w-full">
          {powerHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={powerHistory}>
                <defs>
                  <linearGradient id="devPowerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#26303B" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="ts" tick={{ fill: '#5A6675', fontSize: 10, fontFamily: 'monospace' }} stroke="#303A44" />
                <YAxis tick={{ fill: '#5A6675', fontSize: 10, fontFamily: 'monospace' }} stroke="#303A44" unit=" kW" />
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
                <Area type="monotone" dataKey="power" stroke="#38BDF8" strokeWidth={2} fill="url(#devPowerGrad)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs font-mono text-[#5A6675]">
              Connecting to live telemetry channel...
            </div>
          )}
        </div>
      </ScadaCard>

      {/* Actuators Control Section */}
      <ScadaCard
        title="DIGITAL OUTPUTS & ACTUATOR CIRCUITS"
        subtitle="Direct relay switching and feedback verification"
        action={
          !canControl && (
            <span className="text-[10px] font-mono text-[#F0B44D] bg-[#F0B44D]/10 px-2 py-0.5 rounded border border-[#F0B44D]/30">
              OPERATOR PERMISSION REQUIRED
            </span>
          )
        }
        noPadding
      >
        <div className="divide-y divide-[#26303B]">
          {actuators.length > 0 ? (
            actuators.map(act => {
              const status = commandStatus[act.actuatorId];
              return (
                <div key={act.actuatorId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#222B35]/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-[#151B21] border border-[#303A44] text-[#38BDF8]">
                      <Power className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold text-[#E8EDF2] flex items-center gap-2">
                        <span>{act.actuatorId}</span>
                        <span className="text-[10px] text-[#8D9AA7] font-normal uppercase">({act.type})</span>
                      </div>
                      <div className="text-[11px] font-mono text-[#5A6675] mt-0.5">
                        COMMAND STATUS: {status ? (
                          <span className="text-[#38BDF8] font-semibold">{status}</span>
                        ) : (
                          <span className="text-[#8D9AA7]">STANDBY</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <ScadaBadge status={act.state || 'OFF'} />
                    {canControl && (
                      <div className="flex items-center gap-1.5 ml-2">
                        <button
                          onClick={() => requestCommand(act.actuatorId, 'ON')}
                          className="px-2.5 py-1 text-xs bg-[#35C98A]/10 hover:bg-[#35C98A]/20 text-[#35C98A] border border-[#35C98A]/30 rounded transition-colors"
                        >
                          ON
                        </button>
                        <button
                          onClick={() => requestCommand(act.actuatorId, 'OFF')}
                          className="px-2.5 py-1 text-xs bg-[#EF5555]/10 hover:bg-[#EF5555]/20 text-[#EF5555] border border-[#EF5555]/30 rounded transition-colors"
                        >
                          OFF
                        </button>
                        <button
                          onClick={() => requestCommand(act.actuatorId, 'TOGGLE')}
                          className="px-2.5 py-1 text-xs bg-[#222B35] hover:bg-[#303A44] text-[#E8EDF2] border border-[#303A44] rounded transition-colors"
                        >
                          TOGGLE
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs font-mono text-[#5A6675]">
              No digital output circuits assigned to this PLC controller.
            </div>
          )}
        </div>
      </ScadaCard>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="SAFETY INTERLOCK: CONFIRM COMMAND"
        message={`You are about to issue a manual '${confirmDialog.command}' command to actuator ${confirmDialog.actuatorId} on ${id}. Verify plant conditions before executing.`}
        confirmLabel={`EXECUTE ${confirmDialog.command}`}
        onConfirm={() => executeCommand(confirmDialog.actuatorId, confirmDialog.command)}
        onCancel={() => setConfirmDialog({ isOpen: false, actuatorId: '', command: '' })}
      />
    </div>
  );
}
