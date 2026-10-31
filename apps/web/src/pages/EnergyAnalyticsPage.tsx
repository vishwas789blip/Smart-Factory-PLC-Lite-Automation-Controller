import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid 
} from 'recharts';
import { 
  Zap, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  RefreshCw, 
  Calendar,
  Layers
} from 'lucide-react';
import api from '../lib/api';
import ScadaCard from '../components/common/ScadaCard';

export default function EnergyAnalyticsPage() {
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('7d');
  const [data, setData] = useState<any>(null);
  const [powerData, setPowerData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const TARIFF = 0.12;

  const load = async () => {
    setLoading(true);
    try {
      const [energyRes, powerRes] = await Promise.all([
        api.get(`/analytics/energy?period=${period}`),
        api.get(`/analytics/power?limit=200`)
      ]);
      setData(energyRes.data);
      setPowerData(powerRes.data.map((d: any) => ({
        ts: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        power: d.power,
        current: d.current,
        voltage: d.voltage
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [period]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#303A44]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-[#E8EDF2]">
              ELECTRICAL ENERGY & DEMAND ANALYTICS
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C242C] border border-[#303A44] text-[#8D9AA7]">
              TARIFF: ${TARIFF}/kWh
            </span>
          </div>
          <p className="text-xs text-[#8D9AA7] font-mono mt-0.5">
            SUB-METERING AGGREGATIONS, PEAK DEMAND IDENTIFICATION & COST AUDIT
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          {(['today', '7d', '30d'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded border uppercase transition-colors ${
                period === p 
                  ? 'bg-[#222B35] text-[#38BDF8] border-[#38BDF8]/40 font-bold' 
                  : 'bg-[#1C242C] text-[#8D9AA7] border-[#303A44] hover:text-[#E8EDF2]'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={load}
            className="p-1.5 bg-[#1C242C] hover:bg-[#222B35] border border-[#303A44] rounded text-[#8D9AA7] hover:text-[#E8EDF2] transition-colors ml-1"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
          <div className="bg-[#1C242C] border border-[#303A44] rounded p-3">
            <div className="flex items-center justify-between text-[#8D9AA7] text-[11px]">
              <span>TOTAL ENERGY CONSUMPTION</span>
              <Zap className="w-3.5 h-3.5 text-[#38BDF8]" />
            </div>
            <div className="text-2xl font-bold text-[#38BDF8] mt-1">
              {(data.totalEnergyKwh || 0).toFixed(2)}
              <span className="text-xs text-[#8D9AA7] ml-1">kWh</span>
            </div>
            <div className="text-[10px] text-[#5A6675] mt-0.5">
              PERIOD ACCUMULATOR DELTA
            </div>
          </div>

          <div className="bg-[#1C242C] border border-[#303A44] rounded p-3">
            <div className="flex items-center justify-between text-[#8D9AA7] text-[11px]">
              <span>PEAK DEMAND RECORD</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#F0B44D]" />
            </div>
            <div className="text-2xl font-bold text-[#F0B44D] mt-1">
              {(data.peakPowerKw || 0).toFixed(2)}
              <span className="text-xs text-[#8D9AA7] ml-1">kW</span>
            </div>
            <div className="text-[10px] text-[#5A6675] mt-0.5">
              MAX 15-MIN INTERVAL POWER
            </div>
          </div>

          <div className="bg-[#1C242C] border border-[#303A44] rounded p-3">
            <div className="flex items-center justify-between text-[#8D9AA7] text-[11px]">
              <span>AVERAGE LOAD PROFILE</span>
              <Layers className="w-3.5 h-3.5 text-[#35C98A]" />
            </div>
            <div className="text-2xl font-bold text-[#35C98A] mt-1">
              {(data.avgPowerKw || 0).toFixed(2)}
              <span className="text-xs text-[#8D9AA7] ml-1">kW</span>
            </div>
            <div className="text-[10px] text-[#5A6675] mt-0.5">
              BASELOAD MEAN VALUE
            </div>
          </div>

          <div className="bg-[#1C242C] border border-[#303A44] rounded p-3">
            <div className="flex items-center justify-between text-[#8D9AA7] text-[11px]">
              <span>ESTIMATED ELECTRICITY COST</span>
              <DollarSign className="w-3.5 h-3.5 text-[#35C98A]" />
            </div>
            <div className="text-2xl font-bold text-[#E8EDF2] mt-1">
              ${(data.estimatedCost || 0).toFixed(2)}
            </div>
            <div className="text-[10px] text-[#35C98A] mt-0.5">
              CALCULATED AT TARIFF BASELINE
            </div>
          </div>
        </div>
      )}

      {/* Main Bar Chart: Daily Breakdown */}
      <ScadaCard
        title="DAILY ENERGY CONSUMPTION PROFILE"
        subtitle="Histogram of aggregated kilowatt-hours"
        badge={<span className="text-[10px] font-mono text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded border border-[#38BDF8]/20">kWh</span>}
      >
        <div className="h-[240px] w-full">
          {data?.dailyBreakdown?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyBreakdown}>
                <CartesianGrid stroke="#26303B" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#5A6675', fontSize: 10, fontFamily: 'monospace' }} stroke="#303A44" />
                <YAxis tick={{ fill: '#5A6675', fontSize: 10, fontFamily: 'monospace' }} stroke="#303A44" unit=" kWh" />
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
                <Bar dataKey="energyKwh" fill="#38BDF8" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs font-mono text-[#5A6675]">
              No energy history recorded for the selected window.
            </div>
          )}
        </div>
      </ScadaCard>

      {/* Sub-Metering Instantaneous Power Stream Chart */}
      <ScadaCard
        title="HIGH-RESOLUTION LOAD PROFILE (ACTIVE POWER & CURRENT)"
        subtitle="Last 200 telemetry samples"
      >
        <div className="h-[210px] w-full">
          {powerData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={powerData}>
                <CartesianGrid stroke="#26303B" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="ts" tick={{ fill: '#5A6675', fontSize: 10, fontFamily: 'monospace' }} stroke="#303A44" />
                <YAxis yAxisId="left" tick={{ fill: '#5A6675', fontSize: 10, fontFamily: 'monospace' }} stroke="#303A44" unit=" kW" />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#5A6675', fontSize: 10, fontFamily: 'monospace' }} stroke="#303A44" unit=" A" />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#151B21', 
                    borderColor: '#303A44', 
                    borderRadius: 4, 
                    fontSize: 12,
                    fontFamily: 'monospace'
                  }}
                />
                <Line yAxisId="left" type="monotone" dataKey="power" name="Power (kW)" stroke="#38BDF8" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="current" name="Current (A)" stroke="#F0B44D" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs font-mono text-[#5A6675]">
              Loading instantaneous power telemetry...
            </div>
          )}
        </div>
      </ScadaCard>
    </div>
  );
}
