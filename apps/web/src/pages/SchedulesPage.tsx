import React, { useEffect, useState } from 'react';
import {
  CalendarClock,
  Plus,
  Trash2,
  Clock,
  RefreshCw,
  Power,
  CheckCircle2,
  AlertCircle,
  Play
} from 'lucide-react';
import api from '../lib/api';
import ScadaCard from '../components/common/ScadaCard';
import ScadaBadge from '../components/common/ScadaBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    cronExpression: '0 8 * * *',
    description: '',
    actuatorId: '',
    command: 'ON'
  });
  const [actuators, setActuators] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id: string; name: string }>({
    isOpen: false,
    id: '',
    name: ''
  });

  const PRESETS = [
    { label: 'Morning Shift Start (08:00)', cron: '0 8 * * *' },
    { label: 'Evening Standby (18:00)', cron: '0 18 * * *' },
    { label: 'Periodic Flush (Every 30m)', cron: '*/30 * * * *' },
    { label: 'Weekday Production (Mon-Fri 07:00)', cron: '0 7 * * 1-5' },
    { label: 'Midnight Reset (00:00)', cron: '0 0 * * *' },
  ];

  const load = async () => {
    try {
      const [schedRes, actRes] = await Promise.all([
        api.get('/schedules'),
        api.get('/actuators')
      ]);
      setSchedules(schedRes.data || []);
      setActuators(actRes.data || []);
      if (actRes.data?.length > 0 && !form.actuatorId) {
        setForm(f => ({ ...f, actuatorId: actRes.data[0].actuatorId }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Please provide a schedule name.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const factoriesRes = await api.get('/factories');
      const factoryId = factoriesRes.data[0]?._id;
      if (!factoryId) throw new Error('No factory configured.');

      const targetAct = actuators.find(a => a.actuatorId === form.actuatorId);
      const actions = form.actuatorId ? [{
        actuatorId: form.actuatorId,
        command: form.command,
        deviceId: targetAct?.deviceId || 'plc-001'
      }] : [];

      await api.post('/schedules', {
        name: form.name,
        cronExpression: form.cronExpression,
        description: form.description,
        factoryId,
        actions,
        enabled: true
      });

      setShowForm(false);
      setForm({ name: '', cronExpression: '0 8 * * *', description: '', actuatorId: actuators[0]?.actuatorId || '', command: 'ON' });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string, name: string) => {
    setDeleteDialog({ isOpen: true, id, name });
  };

  const executeDelete = async () => {
    const id = deleteDialog.id;
    setDeleteDialog({ isOpen: false, id: '', name: '' });
    try {
      await api.delete(`/schedules/${id}`);
      setSchedules(prev => prev.filter(s => s._id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete schedule');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#303A44]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-[#E8EDF2]">
              AUTOMATION CRON SCHEDULES
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C242C] border border-[#303A44] text-[#8D9AA7]">
              {schedules.length} SCHEDULED JOBS
            </span>
          </div>
          <p className="text-xs text-[#8D9AA7] font-mono mt-0.5">
            DETERMINISTIC SHIFT TRANSITIONS & TIME-BASED PLANT ROUTINES
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#38BDF8] hover:bg-[#0284C7] text-[#101418] font-bold font-mono text-xs rounded transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showForm ? 'CANCEL' : 'NEW SCHEDULE'}</span>
        </button>
      </div>

      {/* Creation Modal / Inline Drawer */}
      {showForm && (
        <ScadaCard title="DEFINE TIME-BASED INDUSTRIAL SCHEDULE">
          <form onSubmit={save} className="space-y-4 font-mono text-xs">
            {error && (
              <div className="p-3 bg-[#EF5555]/10 border border-[#EF5555]/30 rounded text-[#EF5555]">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#8D9AA7] mb-1">SCHEDULE IDENTIFIER</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Morning Shift Conveyor Initialization"
                  className="w-full px-3 py-2 bg-[#151B21] border border-[#303A44] rounded text-[#E8EDF2] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-[#8D9AA7] mb-1">CRON EXPRESSION (MIN HOUR DOM MON DOW)</label>
                <input
                  type="text"
                  required
                  value={form.cronExpression}
                  onChange={e => setForm({ ...form, cronExpression: e.target.value })}
                  placeholder="0 8 * * *"
                  className="w-full px-3 py-2 bg-[#151B21] border border-[#303A44] rounded text-[#E8EDF2] font-bold focus:outline-none focus:border-[#38BDF8]"
                />
              </div>
            </div>

            {/* Presets Row */}
            <div>
              <span className="text-[10px] text-[#5A6675] mb-1.5 block">PRESET TEMPLATES:</span>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setForm({ ...form, cronExpression: p.cron })}
                    className="px-2 py-1 bg-[#151B21] hover:bg-[#222B35] border border-[#303A44] text-[#8D9AA7] hover:text-[#E8EDF2] rounded text-[11px] transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Action */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#26303B]">
              <div>
                <label className="block text-[#8D9AA7] mb-1">TARGET ACTUATOR OUTPUT</label>
                <select
                  value={form.actuatorId}
                  onChange={e => setForm({ ...form, actuatorId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#151B21] border border-[#303A44] rounded text-[#E8EDF2] focus:outline-none focus:border-[#38BDF8]"
                >
                  {actuators.map(a => (
                    <option key={a.actuatorId} value={a.actuatorId}>
                      {a.actuatorId} ({a.type} &bull; {a.deviceId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#8D9AA7] mb-1">DISPATCH COMMAND</label>
                <select
                  value={form.command}
                  onChange={e => setForm({ ...form, command: e.target.value })}
                  className="w-full px-3 py-2 bg-[#151B21] border border-[#303A44] rounded text-[#E8EDF2] font-bold focus:outline-none focus:border-[#38BDF8]"
                >
                  <option value="ON">COMMAND: ON</option>
                  <option value="OFF">COMMAND: OFF</option>
                  <option value="TOGGLE">COMMAND: TOGGLE</option>
                  <option value="RESET">COMMAND: RESET</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-[#151B21] text-[#8D9AA7] hover:text-[#E8EDF2] rounded border border-[#303A44]"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-[#38BDF8] hover:bg-[#0284C7] text-[#101418] font-bold rounded shadow-xs"
              >
                {saving ? 'ARMING SCHEDULE...' : 'ARM SCHEDULE JOB'}
              </button>
            </div>
          </form>
        </ScadaCard>
      )}

      {/* Schedules List */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-[#5A6675]">
          Loading cron schedules...
        </div>
      ) : schedules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {schedules.map(s => (
            <div
              key={s._id}
              className="bg-[#1C242C] border border-[#303A44] rounded p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#26303B]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded bg-[#151B21] border border-[#303A44] text-[#38BDF8]">
                      <CalendarClock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#E8EDF2]">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-[#38BDF8] mt-0.5">
                        CRON: {s.cronExpression}
                      </div>
                    </div>
                  </div>
                  <ScadaBadge status={s.enabled ? 'ONLINE' : 'OFFLINE'} />
                </div>

                <div className="py-3 space-y-2 text-[#8D9AA7]">
                  {s.description && (
                    <div className="text-[11px] text-[#5A6675]">{s.description}</div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>TARGET CIRCUITS:</span>
                    <span className="text-[#E8EDF2]">
                      {s.actions?.map((a: any) => `${a.command} ${a.actuatorId}`).join(', ') || 'No actions'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>LAST EXECUTION:</span>
                    <span className="text-[#35C98A]">
                      {s.lastRun ? new Date(s.lastRun).toLocaleString() : 'Pending trigger'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#26303B] flex items-center justify-between">
                <span className="text-[10px] text-[#5A6675]">DAEMON TICK: NODE-CRON</span>
                <button
                  onClick={() => confirmDelete(s._id, s.name)}
                  className="p-1 text-[#8D9AA7] hover:text-[#EF5555] rounded hover:bg-[#222B35] transition-colors"
                  title="Delete schedule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-xs font-mono text-[#5A6675] bg-[#1C242C] border border-[#303A44] rounded">
          No automated cron schedules defined. Click &quot;NEW SCHEDULE&quot; to configure time-based plant routines.
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="DELETE CRON SCHEDULE"
        message={`Are you sure you want to stop and delete schedule '${deleteDialog.name}'?`}
        confirmLabel="DELETE SCHEDULE"
        onConfirm={executeDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, id: '', name: '' })}
      />
    </div>
  );
}
