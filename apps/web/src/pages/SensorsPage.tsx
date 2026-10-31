import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  Zap, 
  Flame, 
  Droplets, 
  Wind, 
  Gauge, 
  Users, 
  RefreshCw, 
  Search, 
  Filter, 
  SlidersHorizontal 
} from 'lucide-react';
import api from '../lib/api';
import { useWs } from '../contexts/WsContext';
import ScadaCard from '../components/common/ScadaCard';
import ScadaBadge from '../components/common/ScadaBadge';

export default function SensorsPage() {
  const [sensors, setSensors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const { subscribe } = useWs();

  const load = async () => {
    try {
      const res = await api.get('/sensors');
      setSensors(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Live WebSocket updates mapping values to sensors
  useEffect(() => {
    const unsub = subscribe((msg: any) => {
      if (msg.type === 'telemetry') {
        const p = msg.payload;
        setSensors(prev => prev.map(s => {
          if (s.deviceId !== p.deviceId) return s;

          let val = s.currentValue;
          if (s.type === 'power' && p.electrical?.power !== undefined) val = p.electrical.power;
          else if (s.type === 'voltage' && p.electrical?.voltage !== undefined) val = p.electrical.voltage;
          else if (s.type === 'current' && p.electrical?.current !== undefined) val = p.electrical.current;
          else if (s.type === 'temperature' && p.environment?.temperature !== undefined) val = p.environment.temperature;
          else if (s.type === 'humidity' && p.environment?.humidity !== undefined) val = p.environment.humidity;
          else if (s.type === 'people_count' && p.people?.count !== undefined) val = p.people.count;
          else if (s.type === 'vibration' && p.machines?.[0]?.vibration !== undefined) val = p.machines[0].vibration;

          return { ...s, currentValue: val, lastSeen: new Date().toISOString() };
        }));
      }
    });
    return unsub;
  }, [subscribe]);

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'power':
      case 'voltage':
      case 'current':
      case 'energy':
        return <Zap className="w-4 h-4 text-[#38BDF8]" />;
      case 'temperature':
        return <Flame className="w-4 h-4 text-[#F0B44D]" />;
      case 'humidity':
        return <Droplets className="w-4 h-4 text-[#38BDF8]" />;
      case 'smoke':
      case 'gas':
        return <Wind className="w-4 h-4 text-[#8D9AA7]" />;
      case 'people_count':
        return <Users className="w-4 h-4 text-[#35C98A]" />;
      case 'vibration':
        return <Activity className="w-4 h-4 text-[#EF5555]" />;
      default:
        return <Gauge className="w-4 h-4 text-[#8D9AA7]" />;
    }
  };

  const filtered = sensors.filter(s => {
    const matchesSearch = s.sensorId?.toLowerCase().includes(search.toLowerCase()) ||
                          s.deviceId?.toLowerCase().includes(search.toLowerCase()) ||
                          s.type?.toLowerCase().includes(search.toLowerCase());

    if (category === 'ELECTRICAL') {
      return matchesSearch && ['power', 'voltage', 'current', 'energy'].includes(s.type);
    }
    if (category === 'ENVIRONMENT') {
      return matchesSearch && ['temperature', 'humidity', 'smoke', 'gas'].includes(s.type);
    }
    if (category === 'DYNAMIC') {
      return matchesSearch && ['vibration', 'people_count'].includes(s.type);
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#303A44]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-[#E8EDF2]">
              ANALOG & DIGITAL SENSOR CHANNELS
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C242C] border border-[#303A44] text-[#8D9AA7]">
              {sensors.length} SENSORS CONFIGURED
            </span>
          </div>
          <p className="text-xs text-[#8D9AA7] font-mono mt-0.5">
            CALIBRATED INSTRUMENTATION & INDUSTRIAL TELEMETRY PICKUPS
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

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6675]" />
          <input
            type="text"
            placeholder="Search by Sensor ID, device or metric..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#1C242C] border border-[#303A44] rounded text-xs font-mono text-[#E8EDF2] placeholder-[#5A6675] focus:outline-none focus:border-[#38BDF8]"
          />
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'ELECTRICAL', 'ENVIRONMENT', 'DYNAMIC'] as const).map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded border whitespace-nowrap transition-colors ${
                category === c 
                  ? 'bg-[#222B35] text-[#38BDF8] border-[#38BDF8]/40' 
                  : 'bg-[#1C242C] text-[#8D9AA7] border-[#303A44] hover:text-[#E8EDF2]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Sensor Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-[#5A6675]">
          Loading instrumentation channels...
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(s => {
            const hasValue = s.currentValue !== undefined;
            const formattedVal = typeof s.currentValue === 'number' 
              ? s.currentValue.toFixed(s.unit === 'kW' || s.unit === 'kWh' ? 3 : 1)
              : s.currentValue;

            return (
              <div 
                key={s.sensorId}
                className="bg-[#1C242C] border border-[#303A44] rounded p-4 font-mono hover:border-[#38BDF8]/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#26303B]">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-[#151B21] border border-[#303A44]">
                      {getSensorIcon(s.type)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#E8EDF2] truncate max-w-[120px]">
                        {s.sensorId}
                      </div>
                      <div className="text-[10px] text-[#8D9AA7] uppercase">
                        {s.type}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#35C98A] bg-[#35C98A]/10 px-1.5 py-0.5 rounded border border-[#35C98A]/20">
                    CALIBRATED
                  </span>
                </div>

                <div className="py-3">
                  <div className="text-[10px] text-[#5A6675]">READING:</div>
                  <div className="text-xl font-bold text-[#38BDF8] mt-0.5 flex items-baseline gap-1">
                    <span>{hasValue ? formattedVal : '--'}</span>
                    <span className="text-xs text-[#8D9AA7] font-normal">{s.unit}</span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#26303B] flex items-center justify-between text-[11px] text-[#8D9AA7]">
                  <span>BUS: {s.deviceId}</span>
                  <span className="text-[#5A6675]">
                    {s.lastSeen ? new Date(s.lastSeen).toLocaleTimeString() : 'Awaiting'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-xs font-mono text-[#5A6675] bg-[#1C242C] border border-[#303A44] rounded">
          No instrumentation channels found matching criteria.
        </div>
      )}
    </div>
  );
}
