import React, { useEffect, useState } from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  Check, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  Filter, 
  ShieldCheck 
} from 'lucide-react';
import api from '../lib/api';
import ScadaCard from '../components/common/ScadaCard';
import ScadaBadge from '../components/common/ScadaBadge';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'all' | 'resolved'>('active');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter === 'active') params.acknowledged = false;
      const res = await api.get('/alerts', { params });
      setAlerts(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, [filter]);

  const acknowledge = async (id: string) => {
    try {
      await api.post(`/alerts/${id}/acknowledge`);
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, acknowledged: true } : a));
    } catch (e: any) { 
      alert(e.response?.data?.error || 'Failed to acknowledge alarm'); 
    }
  };

  const resolve = async (id: string) => {
    try {
      await api.post(`/alerts/${id}/resolve`);
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, resolvedAt: new Date().toISOString() } : a));
    } catch (e: any) { 
      alert(e.response?.data?.error || 'Failed to resolve alarm'); 
    }
  };

  const filtered = alerts.filter(a => {
    if (filter === 'resolved' && !a.resolvedAt) return false;
    const matchesSearch = a.message?.toLowerCase().includes(search.toLowerCase()) ||
                          a.deviceId?.toLowerCase().includes(search.toLowerCase()) ||
                          a.type?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#303A44]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-[#E8EDF2]">
              SCADA ALARMS & INCIDENT CONSOLE
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C242C] border border-[#303A44] text-[#8D9AA7]">
              ISA 18.2 LIFECYCLE
            </span>
          </div>
          <p className="text-xs text-[#8D9AA7] font-mono mt-0.5">
            PLANT TRIP AUDITING, OPERATOR ACKNOWLEDGMENTS & RESOLUTION LEDGER
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
            placeholder="Search by alarm message, device or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#1C242C] border border-[#303A44] rounded text-xs font-mono text-[#E8EDF2] placeholder-[#5A6675] focus:outline-none focus:border-[#38BDF8]"
          />
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs">
          {(['active', 'all', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded border uppercase transition-colors ${
                filter === f 
                  ? 'bg-[#222B35] text-[#38BDF8] border-[#38BDF8]/40 font-bold' 
                  : 'bg-[#1C242C] text-[#8D9AA7] border-[#303A44] hover:text-[#E8EDF2]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Alarms Feed */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-[#5A6675]">
          Querying alarm event ledger...
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3 font-mono text-xs">
          {filtered.map(a => {
            const isResolved = !!a.resolvedAt;
            const isAck = a.acknowledged;

            return (
              <div 
                key={a._id}
                className={`bg-[#1C242C] border border-[#303A44] rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  !isAck && !isResolved ? 'border-l-4 border-l-[#EF5555]' : 'border-l-4 border-l-[#35C98A]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <ScadaBadge status={a.severity || 'HIGH'} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#E8EDF2] flex items-center gap-2">
                      <span>{a.message}</span>
                      <span className="text-[10px] text-[#5A6675] font-normal uppercase">({a.type})</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8D9AA7] mt-1">
                      <span>CONTROLLER: <strong className="text-[#E8EDF2]">{a.deviceId}</strong></span>
                      {a.machineId && <span>MACHINE: <strong className="text-[#38BDF8]">{a.machineId}</strong></span>}
                      {a.actuatorId && <span>ACTUATOR: <strong className="text-[#F0B44D]">{a.actuatorId}</strong></span>}
                      <span className="text-[#5A6675]">TIME: {new Date(a.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  {!isAck && !isResolved && (
                    <button
                      onClick={() => acknowledge(a._id)}
                      className="px-3 py-1.5 bg-[#F0B44D]/10 hover:bg-[#F0B44D]/20 text-[#F0B44D] border border-[#F0B44D]/30 rounded transition-colors flex items-center gap-1.5 font-bold"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>ACKNOWLEDGE</span>
                    </button>
                  )}

                  {!isResolved && (
                    <button
                      onClick={() => resolve(a._id)}
                      className="px-3 py-1.5 bg-[#35C98A]/10 hover:bg-[#35C98A]/20 text-[#35C98A] border border-[#35C98A]/30 rounded transition-colors flex items-center gap-1.5 font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>RESOLVE</span>
                    </button>
                  )}

                  {isResolved && (
                    <span className="text-[#35C98A] flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>RESOLVED</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center text-xs font-mono text-[#35C98A] bg-[#1C242C] border border-[#303A44] rounded flex flex-col items-center justify-center gap-2">
          <ShieldCheck className="w-8 h-8 text-[#35C98A]" />
          <span className="text-sm font-bold text-[#E8EDF2]">NO ALARMS PENDING</span>
          <span className="text-[#5A6675]">All plant automation thresholds are currently within nominal operating bounds.</span>
        </div>
      )}
    </div>
  );
}
