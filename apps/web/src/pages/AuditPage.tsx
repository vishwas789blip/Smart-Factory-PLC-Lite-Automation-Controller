import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  RefreshCw, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  User 
} from 'lucide-react';
import api from '../lib/api';
import ScadaCard from '../components/common/ScadaCard';
import ScadaBadge from '../components/common/ScadaBadge';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const limit = 25;

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/audit-logs?page=${page}&limit=${limit}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    return (l.userEmail || '').toLowerCase().includes(q) ||
           (l.action || '').toLowerCase().includes(q) ||
           (l.resource || '').toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#303A44]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-[#E8EDF2]">
              OPERATOR ACTIVITY & SYSTEM AUDIT TRAIL
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C242C] border border-[#303A44] text-[#8D9AA7]">
              {total} TOTAL EVENTS
            </span>
          </div>
          <p className="text-xs text-[#8D9AA7] font-mono mt-0.5">
            CRYPTOGRAPHIC IMMUTABLE RECORD OF MUTATIONS, COMMANDS & AUTHENTICATION
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

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6675]" />
          <input
            type="text"
            placeholder="Search by operator email, action or resource..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#1C242C] border border-[#303A44] rounded text-xs font-mono text-[#E8EDF2] placeholder-[#5A6675] focus:outline-none focus:border-[#38BDF8]"
          />
        </div>

        {/* Pagination buttons */}
        <div className="flex items-center gap-2 font-mono text-xs text-[#8D9AA7]">
          <span>PAGE {page} OF {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded bg-[#1C242C] border border-[#303A44] disabled:opacity-30 hover:bg-[#222B35] text-[#E8EDF2]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded bg-[#1C242C] border border-[#303A44] disabled:opacity-30 hover:bg-[#222B35] text-[#E8EDF2]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <ScadaCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#303A44] bg-[#151B21] text-[#8D9AA7] uppercase text-[11px]">
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">OPERATOR / USER</th>
                <th className="py-2.5 px-3">ROLE</th>
                <th className="py-2.5 px-3">OPERATION ACTION</th>
                <th className="py-2.5 px-3">TARGET RESOURCE</th>
                <th className="py-2.5 px-3 text-right">RESULT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26303B]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#5A6675]">
                    Loading audit trail ledger...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map(log => (
                  <tr key={log._id} className="hover:bg-[#222B35]/40 transition-colors">
                    <td className="py-2.5 px-3 text-[#5A6675] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-[#E8EDF2] font-semibold truncate max-w-[160px]">
                      {log.userEmail || 'system.daemon'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] text-[#8D9AA7] bg-[#151B21] px-1.5 py-0.5 rounded border border-[#303A44]">
                        {log.role || 'DAEMON'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#38BDF8] font-bold">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 text-[#8D9AA7] truncate max-w-[200px]">
                      {log.resource || '--'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-bold ${log.result === 'SUCCESS' ? 'text-[#35C98A]' : 'text-[#EF5555]'}`}>
                        {log.result || 'OK'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#5A6675]">
                    No audit records matching query filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ScadaCard>
    </div>
  );
}
