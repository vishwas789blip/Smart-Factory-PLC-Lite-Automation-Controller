import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Workflow, 
  Plus, 
  Trash2, 
  Power, 
  Clock, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import api from '../lib/api';
import ScadaCard from '../components/common/ScadaCard';
import ScadaBadge from '../components/common/ScadaBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: ''
  });

  const load = async () => {
    try {
      const res = await api.get('/automations');
      setAutomations(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, []);

  const toggle = async (id: string, currentEnabled: boolean) => {
    try {
      const action = currentEnabled ? 'disable' : 'enable';
      await api.post(`/automations/${id}/${action}`);
      setAutomations(prev => prev.map(a => a._id === id ? { ...a, enabled: !currentEnabled } : a));
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to toggle automation');
    }
  };

  const confirmDelete = (id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, id, name });
  };

  const executeDelete = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm({ isOpen: false, id: '', name: '' });
    try {
      await api.delete(`/automations/${id}`);
      setAutomations(prev => prev.filter(a => a._id !== id));
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to delete automation');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#303A44]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-[#E8EDF2]">
              LADDER AUTOMATION RULES
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C242C] border border-[#303A44] text-[#8D9AA7]">
              {automations.length} RULES CONFIGURED
            </span>
          </div>
          <p className="text-xs text-[#8D9AA7] font-mono mt-0.5">
            DETERMINISTIC EVENT-DRIVEN AUTOMATION & INTERLOCK PIPELINE
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/automations/builder"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#38BDF8] hover:bg-[#0284C7] text-[#101418] font-bold font-mono text-xs rounded transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>CREATE RULE</span>
          </Link>
        </div>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-[#5A6675]">
          Loading automation logic trees...
        </div>
      ) : automations.length > 0 ? (
        <div className="space-y-3">
          {automations.map(auto => (
            <div 
              key={auto._id}
              className={`bg-[#1C242C] border border-[#303A44] rounded p-4 font-mono transition-opacity ${
                !auto.enabled ? 'opacity-65' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#26303B]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#151B21] border border-[#303A44] text-[#38BDF8]">
                    <Workflow className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#E8EDF2] flex items-center gap-2">
                      <span>{auto.name}</span>
                      <ScadaBadge status={auto.enabled ? 'ONLINE' : 'OFFLINE'} />
                    </div>
                    {auto.description && (
                      <div className="text-xs text-[#8D9AA7] mt-0.5">{auto.description}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggle(auto._id, auto.enabled)}
                    className={`px-3 py-1 text-xs rounded border transition-colors ${
                      auto.enabled 
                        ? 'bg-[#EF5555]/10 text-[#EF5555] border-[#EF5555]/30 hover:bg-[#EF5555]/20'
                        : 'bg-[#35C98A]/10 text-[#35C98A] border-[#35C98A]/30 hover:bg-[#35C98A]/20'
                    }`}
                  >
                    {auto.enabled ? 'DISABLE' : 'ENABLE'}
                  </button>

                  <button
                    onClick={() => confirmDelete(auto._id, auto.name)}
                    className="p-1.5 rounded text-[#8D9AA7] hover:text-[#EF5555] hover:bg-[#222B35] transition-colors"
                    title="Delete rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#8D9AA7]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#5A6675]" />
                  <span>COOLDOWN:</span>
                  <span className="text-[#E8EDF2]">{auto.cooldownSeconds || 60}s</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#5A6675]" />
                  <span>RATE LIMIT:</span>
                  <span className="text-[#E8EDF2]">{auto.maxExecutionsPerHour || 10}/hr</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Power className="w-3.5 h-3.5 text-[#5A6675]" />
                  <span>ACTIONS:</span>
                  <span className="text-[#38BDF8]">
                    {auto.actions?.length || 0} OUTPUT CIRCUITS
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-xs font-mono text-[#5A6675] bg-[#1C242C] border border-[#303A44] rounded">
          No automated logic rules found. Click &quot;CREATE RULE&quot; to define your first trigger condition.
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="DELETE AUTOMATION RULE"
        message={`Are you sure you want to permanently delete automation rule '${deleteConfirm.name}'? This action cannot be undone.`}
        confirmLabel="DELETE RULE"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: '', name: '' })}
      />
    </div>
  );
}
