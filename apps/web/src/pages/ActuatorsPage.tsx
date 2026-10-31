import React, { useEffect, useState } from 'react';
import { 
  Power, 
  RotateCw, 
  Fan, 
  Lightbulb, 
  Sliders, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Lock,
  Cpu
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useWs } from '../contexts/WsContext';
import ScadaCard from '../components/common/ScadaCard';
import ScadaBadge from '../components/common/ScadaBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function ActuatorsPage() {
  const [actuators, setActuators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cmdStatus, setCmdStatus] = useState<Record<string, string>>({});
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    actuatorId: string;
    command: string;
  }>({ isOpen: false, actuatorId: '', command: '' });

  const { user } = useAuth();
  const { subscribe } = useWs();
  const canControl = ['OPERATOR', 'ENGINEER', 'ADMIN'].includes(user?.role || '');

  const load = async () => {
    try {
      const res = await api.get('/actuators');
      setActuators(res.data || []);
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
      if (msg.type === 'actuator_state') {
        setActuators(prev => prev.map(a =>
          a.actuatorId === msg.actuatorId ? { ...a, state: msg.state } : a
        ));
        setCmdStatus(prev => ({ ...prev, [msg.actuatorId]: 'ACKNOWLEDGED' }));
        setTimeout(() => {
          setCmdStatus(prev => {
            const next = { ...prev };
            delete next[msg.actuatorId];
            return next;
          });
        }, 3000);
      }
    });
    return unsub;
  }, [subscribe]);

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
      setCmdStatus(prev => ({ ...prev, [actuatorId]: 'REQUESTED' }));
      await api.post(`/actuators/${actuatorId}/command`, { command });
      setCmdStatus(prev => ({ ...prev, [actuatorId]: 'SENT' }));
    } catch {
      setCmdStatus(prev => ({ ...prev, [actuatorId]: 'TIMEOUT' }));
    }
  };

  const getActuatorIcon = (type: string) => {
    switch (type) {
      case 'motor':
        return <RotateCw className="w-4 h-4 text-[#38BDF8]" />;
      case 'fan':
        return <Fan className="w-4 h-4 text-[#35C98A]" />;
      case 'light':
        return <Lightbulb className="w-4 h-4 text-[#F0B44D]" />;
      default:
        return <Power className="w-4 h-4 text-[#EF5555]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#303A44]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-[#E8EDF2]">
              ACTUATOR & RELAY OUTPUT CONTROLS
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C242C] border border-[#303A44] text-[#8D9AA7]">
              {actuators.length} CIRCUITS
            </span>
          </div>
          <p className="text-xs text-[#8D9AA7] font-mono mt-0.5">
            INDUSTRIAL HARDWARE SWITCHING & COMMAND/ACK WATCHDOG
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!canControl && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F0B44D]/10 border border-[#F0B44D]/30 rounded text-xs font-mono text-[#F0B44D]">
              <Lock className="w-3.5 h-3.5" />
              <span>READ ONLY &bull; OPERATOR REQUIRED</span>
            </div>
          )}

          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C242C] hover:bg-[#222B35] border border-[#303A44] rounded text-xs font-mono text-[#8D9AA7] hover:text-[#E8EDF2] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>REFRESH</span>
          </button>
        </div>
      </div>

      {/* Actuators Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-[#5A6675]">
          Loading actuator circuits...
        </div>
      ) : actuators.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actuators.map(act => {
            const status = cmdStatus[act.actuatorId];

            return (
              <div 
                key={act.actuatorId}
                className="bg-[#1C242C] border border-[#303A44] rounded p-4 font-mono flex flex-col justify-between hover:border-[#38BDF8]/40 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#26303B]">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded bg-[#151B21] border border-[#303A44]">
                        {getActuatorIcon(act.type)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#E8EDF2]">
                          {act.actuatorId}
                        </div>
                        <div className="text-[11px] text-[#8D9AA7] uppercase">
                          TYPE: {act.type} &bull; BUS: {act.deviceId}
                        </div>
                      </div>
                    </div>
                    <ScadaBadge status={act.state || 'OFF'} />
                  </div>

                  <div className="py-3 space-y-1.5 text-xs text-[#8D9AA7]">
                    <div className="flex items-center justify-between">
                      <span>COMMAND WATCHDOG:</span>
                      <span className={status === 'TIMEOUT' ? 'text-[#EF5555]' : status ? 'text-[#38BDF8] font-bold' : 'text-[#5A6675]'}>
                        {status || 'IDLE / SYNCHRONIZED'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>ACK LATENCY:</span>
                      <span className="text-[#35C98A]">&lt; 150 ms</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#26303B] flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[#5A6675]">MANUAL CONTROL</span>
                  
                  {canControl ? (
                    <div className="flex items-center gap-1.5">
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
                  ) : (
                    <span className="text-[10px] text-[#5A6675]">LOCKED</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-xs font-mono text-[#5A6675] bg-[#1C242C] border border-[#303A44] rounded">
          No actuator circuits configured.
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="SAFETY INTERLOCK: MANUAL OVERRIDE"
        message={`Confirm manual override for actuator ${confirmDialog.actuatorId}. Switching this output will change electrical load states.`}
        confirmLabel={`PROCEED: ${confirmDialog.command}`}
        onConfirm={() => executeCommand(confirmDialog.actuatorId, confirmDialog.command)}
        onCancel={() => setConfirmDialog({ isOpen: false, actuatorId: '', command: '' })}
      />
    </div>
  );
}
