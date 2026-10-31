import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid 
} from 'recharts';
import { 
  Gauge, 
  Activity, 
  Flame, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  RotateCw,
  Sliders
} from 'lucide-react';
import api from '../lib/api';
import ScadaCard from '../components/common/ScadaCard';
import ScadaBadge from '../components/common/ScadaBadge';

export default function MachineAnalyticsPage() {
  const [machines, setMachines] = useState<any[]>([]);
  const [productivity, setProductivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, pRes] = await Promise.all([
        api.get('/analytics/machines'),
        api.get('/analytics/productivity')
      ]);
      setMachines(mRes.data || []);
      setProductivity(pRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const healthColor = (h: string) => {
    switch (h) {
      case 'CRITICAL': return '#EF5555';
      case 'WARNING': return '#F0B44D';
      default: return '#35C98A';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#303A44]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-[#E8EDF2]">
              MACHINE ASSET HEALTH & OEE PRODUCTIVITY
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C242C] border border-[#303A44] text-[#8D9AA7]">
              {machines.length} MONITORED UNITS
            </span>
          </div>
          <p className="text-xs text-[#8D9AA7] font-mono mt-0.5">
            OVERALL EQUIPMENT EFFECTIVENESS, THERMAL GRADIENTS & VIBRATION DIAGNOSTICS
          </p>
        </div>

        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C242C] hover:bg-[#222B35] border border-[#303A44] rounded text-xs font-mono text-[#8D9AA7] hover:text-[#E8EDF2] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>REFRESH</span>
        </button>
      </div>

      {/* Machine Utilization Comparison Chart */}
      <ScadaCard
        title="MACHINE ASSET UTILIZATION BENCHMARK"
        subtitle="Operational runtime percentage"
        badge={<span className="text-[10px] font-mono text-[#35C98A] bg-[#35C98A]/10 px-1.5 py-0.5 rounded border border-[#35C98A]/20">% UTIL</span>}
      >
        <div className="h-[210px] w-full">
          {machines.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={machines}>
                <CartesianGrid stroke="#26303B" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="machineId" tick={{ fill: '#5A6675', fontSize: 10, fontFamily: 'monospace' }} stroke="#303A44" />
                <YAxis domain={[0, 100]} tick={{ fill: '#5A6675', fontSize: 10, fontFamily: 'monospace' }} stroke="#303A44" unit="%" />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#151B21', 
                    borderColor: '#303A44', 
                    borderRadius: 4, 
                    fontSize: 12,
                    fontFamily: 'monospace'
                  }}
                  formatter={(val: any) => [`${Number(val).toFixed(1)}%`, 'Utilization']}
                />
                <Bar dataKey="utilization" radius={[2, 2, 0, 0]}>
                  {machines.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={healthColor(entry.health)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs font-mono text-[#5A6675]">
              Loading machine telemetry benchmarks...
            </div>
          )}
        </div>
      </ScadaCard>

      {/* Machine Health Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-[#5A6675]">
          Calculating equipment diagnostics...
        </div>
      ) : machines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
          {machines.map(m => (
            <div
              key={m.machineId}
              className="bg-[#1C242C] border border-[#303A44] rounded p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#26303B]">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded bg-[#151B21] border border-[#303A44] text-[#38BDF8]">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#E8EDF2]">
                        {m.machineId}
                      </div>
                      <div className="text-[11px] text-[#8D9AA7]">
                        UTILIZATION: {(m.utilization || 0).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <ScadaBadge status={m.health || 'NORMAL'} />
                </div>

                <div className="py-3 grid grid-cols-2 gap-2">
                  <div className="p-2 bg-[#151B21] border border-[#26303B] rounded">
                    <div className="text-[10px] text-[#8D9AA7]">AVG SPEED</div>
                    <div className="text-sm font-bold text-[#E8EDF2] mt-0.5">
                      {Math.round(m.avgRpm || 0)} <span className="text-[10px] text-[#8D9AA7]">RPM</span>
                    </div>
                  </div>

                  <div className="p-2 bg-[#151B21] border border-[#26303B] rounded">
                    <div className="text-[10px] text-[#8D9AA7]">PEAK TEMP</div>
                    <div className="text-sm font-bold text-[#F0B44D] mt-0.5">
                      {(m.maxTemperature || 0).toFixed(1)}°C
                    </div>
                  </div>

                  <div className="p-2 bg-[#151B21] border border-[#26303B] rounded">
                    <div className="text-[10px] text-[#8D9AA7]">PEAK VIBRATION</div>
                    <div className={`text-sm font-bold mt-0.5 ${m.maxVibration > 5 ? 'text-[#EF5555]' : 'text-[#35C98A]'}`}>
                      {(m.maxVibration || 0).toFixed(2)} <span className="text-[10px] text-[#8D9AA7]">mm/s</span>
                    </div>
                  </div>

                  <div className="p-2 bg-[#151B21] border border-[#26303B] rounded">
                    <div className="text-[10px] text-[#8D9AA7]">FAULT TRIPS</div>
                    <div className={`text-sm font-bold mt-0.5 ${m.faultCount > 0 ? 'text-[#EF5555]' : 'text-[#35C98A]'}`}>
                      {m.faultCount || 0}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-[#26303B] flex items-center justify-between text-[11px] text-[#8D9AA7]">
                <span>AVG LOAD: {(m.avgPower || 0).toFixed(2)} kW</span>
                <span>TOTAL RUNTIME: {Math.round((m.totalRuntimeSeconds || 0) / 60)} MIN</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-xs font-mono text-[#5A6675] bg-[#1C242C] border border-[#303A44] rounded">
          No machine analytics available yet.
        </div>
      )}
    </div>
  );
}
