import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cpu,
  RefreshCw,
  Activity,
  Search,
  ArrowUpRight,
  Server,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import api from '../lib/api';
import { useWs } from '../contexts/WsContext';
import ScadaCard from '../components/common/ScadaCard';
import ScadaBadge from '../components/common/ScadaBadge';

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const { subscribe } = useWs();

  const load = async () => {
    try {
      const res = await api.get('/devices');
      setDevices(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const unsub = subscribe((msg: any) => {
      if (msg.type === 'device_status') {
        setDevices(prev => prev.map(d =>
          d.deviceId === msg.deviceId ? { ...d, status: msg.status, lastSeen: new Date().toISOString() } : d
        ));
      }
      if (msg.type === 'telemetry') {
        setDevices(prev => prev.map(d =>
          d.deviceId === msg.deviceId ? { ...d, lastSeen: msg.payload?.timestamp || new Date().toISOString() } : d
        ));
      }
    });
    return unsub;
  }, [subscribe]);

  const filtered = devices.filter(d => {
    const matchesSearch = d.deviceId?.toLowerCase().includes(search.toLowerCase()) ||
      d.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#303A44]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-[#E8EDF2]">
              PLC CONTROLLER INVENTORY
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C242C] border border-[#303A44] text-[#8D9AA7]">
              {devices.length} NODES
            </span>
          </div>
          <p className="text-xs text-[#8D9AA7] font-mono mt-0.5">
            DISTRIBUTED INDUSTRIAL AUTOMATION HARDWARE & SYNTHETIC NODES
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C242C] hover:bg-[#222B35] border border-[#303A44] rounded text-xs font-mono text-[#8D9AA7] hover:text-[#E8EDF2] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>REFRESH</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6675]" />
          <input
            type="text"
            placeholder="Search by Device ID or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#1C242C] border border-[#303A44] rounded text-xs font-mono text-[#E8EDF2] placeholder-[#5A6675] focus:outline-none focus:border-[#38BDF8]"
          />
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs">
          {(['ALL', 'ONLINE', 'OFFLINE'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded border transition-colors ${statusFilter === s
                  ? 'bg-[#222B35] text-[#38BDF8] border-[#38BDF8]/40'
                  : 'bg-[#1C242C] text-[#8D9AA7] border-[#303A44] hover:text-[#E8EDF2]'
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of PLC Controller Cards */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-[#5A6675]">
          Loading hardware inventory...
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(device => (
            <Link
              key={device.deviceId}
              to={`/devices/${device.deviceId}`}
              className="group bg-[#1C242C] border border-[#303A44] hover:border-[#38BDF8]/60 rounded p-4 transition-all duration-150 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#26303B]">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded bg-[#151B21] border border-[#303A44] text-[#38BDF8]">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold font-mono text-[#E8EDF2] group-hover:text-[#38BDF8] transition-colors">
                        {device.deviceId}
                      </div>
                      <div className="text-[11px] font-mono text-[#8D9AA7]">
                        {device.name || 'PLC-Lite Automation Node'}
                      </div>
                    </div>
                  </div>
                  <ScadaBadge status={device.status || 'OFFLINE'} />
                </div>

                <div className="py-3 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-[#8D9AA7]">
                    <span>ARCHITECTURE:</span>
                    <span className="text-[#E8EDF2]">ESP32 / SYNTHETIC</span>
                  </div>
                  <div className="flex items-center justify-between text-[#8D9AA7]">
                    <span>FIRMWARE:</span>
                    <span className="text-[#E8EDF2]">{device.firmwareVersion || 'v1.4.0'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#8D9AA7]">
                    <span>MAC / UID:</span>
                    <span className="text-[#5A6675]">{device.macAddress || `AA:BB:CC:11:22:${device.deviceId?.slice(-2)}`}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#8D9AA7]">
                    <span>HEARTBEAT:</span>
                    <span className="text-[#35C98A]">
                      {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'Awaiting'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#26303B] flex items-center justify-between text-xs font-mono text-[#38BDF8]">
                <span>VIEW TELEMETRY & CONTROLS</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-xs font-mono text-[#5A6675] bg-[#1C242C] border border-[#303A44] rounded">
          No PLC controllers found matching filter criteria.
        </div>
      )}
    </div>
  );
}
