import React from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Check, 
  X, 
  Server, 
  Lock, 
  Terminal, 
  Cpu,
  User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ScadaCard from '../components/common/ScadaCard';
import ScadaBadge from '../components/common/ScadaBadge';

export default function SettingsPage() {
  const { user } = useAuth();

  const envVars = [
    { key: 'PORT', value: '4000', desc: 'Backend REST & WebSocket API port' },
    { key: 'MONGODB_URI', value: 'mongodb://localhost:27017/smart-factory', desc: 'MongoDB 7 connection URI' },
    { key: 'MQTT_HOST', value: 'localhost:1883', desc: 'Mosquitto industrial broker host' },
    { key: 'AI_SERVICE_URL', value: 'http://localhost:8000', desc: 'Python FastAPI AI analytics service' },
    { key: 'ENERGY_TARIFF', value: '$0.12 / kWh', desc: 'Baseline electrical tariff calculation' },
    { key: 'POWER_ALERT_THRESHOLD', value: '10.0 kW', desc: 'Instantaneous bus over-power trigger' },
    { key: 'TEMP_ALERT_THRESHOLD', value: '40.0 °C', desc: 'Enclosure high thermal warning' },
    { key: 'VIBRATION_ALERT_THRESHOLD', value: '5.0 mm/s', desc: 'Bearing degradation trip limit' },
    { key: 'OFFLINE_THRESHOLD_SECONDS', value: '60s', desc: 'PLC watchdog missed heartbeat timeout' },
  ];

  const permissions = [
    { role: 'VIEWER', read: true, control: false, auto: false, admin: false },
    { role: 'OPERATOR', read: true, control: true, auto: false, admin: false },
    { role: 'ENGINEER', read: true, control: true, auto: true, admin: false },
    { role: 'ADMIN', read: true, control: true, auto: true, admin: true },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-[#303A44]">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold font-mono tracking-wide text-[#E8EDF2]">
            SCADA WORKSTATION & SECURITY SETTINGS
          </h1>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C242C] border border-[#303A44] text-[#8D9AA7]">
            RBAC LEVEL 4
          </span>
        </div>
        <p className="text-xs text-[#8D9AA7] font-mono mt-0.5">
          OPERATOR SESSION IDENTITY, ACCESS CONTROL MATRIX & ENVIRONMENT PARAMETERS
        </p>
      </div>

      {/* Operator Session Card */}
      <ScadaCard title="AUTHENTICATED OPERATOR SESSION">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-3 bg-[#151B21] border border-[#26303B] rounded">
            <div className="text-[10px] text-[#8D9AA7]">OPERATOR EMAIL</div>
            <div className="text-sm font-bold text-[#E8EDF2] mt-0.5 truncate">
              {user?.email || 'operator@factory.local'}
            </div>
          </div>

          <div className="p-3 bg-[#151B21] border border-[#26303B] rounded">
            <div className="text-[10px] text-[#8D9AA7]">AUTHORIZATION TIER</div>
            <div className="mt-1">
              <ScadaBadge status={user?.role || 'VIEWER'} />
            </div>
          </div>

          <div className="p-3 bg-[#151B21] border border-[#26303B] rounded">
            <div className="text-[10px] text-[#8D9AA7]">TOKEN SECURITY</div>
            <div className="text-sm font-bold text-[#35C98A] mt-0.5">
              JWT (15M / 7D ROTATION)
            </div>
          </div>
        </div>
      </ScadaCard>

      {/* RBAC Matrix Card */}
      <ScadaCard title="ROLE-BASED ACCESS CONTROL (RBAC) MATRIX" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#303A44] bg-[#151B21] text-[#8D9AA7] uppercase text-[11px]">
                <th className="py-2.5 px-3">ROLE TIER</th>
                <th className="py-2.5 px-3 text-center">TELEMETRY READ</th>
                <th className="py-2.5 px-3 text-center">ACTUATOR OVERRIDE</th>
                <th className="py-2.5 px-3 text-center">AUTOMATION EDIT</th>
                <th className="py-2.5 px-3 text-center">SYSTEM ADMIN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26303B]">
              {permissions.map(p => {
                const isCurrent = user?.role === p.role;
                return (
                  <tr key={p.role} className={`hover:bg-[#222B35]/40 transition-colors ${isCurrent ? 'bg-[#222B35]/20 font-bold' : ''}`}>
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <span className="text-[#E8EDF2]">{p.role}</span>
                      {isCurrent && (
                        <span className="text-[9px] text-[#38BDF8] bg-[#38BDF8]/10 px-1 py-0.2 rounded border border-[#38BDF8]/30">
                          CURRENT
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Check className="w-4 h-4 text-[#35C98A] mx-auto" />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {p.control ? (
                        <Check className="w-4 h-4 text-[#35C98A] mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-[#5A6675] mx-auto" />
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {p.auto ? (
                        <Check className="w-4 h-4 text-[#35C98A] mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-[#5A6675] mx-auto" />
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {p.admin ? (
                        <Check className="w-4 h-4 text-[#35C98A] mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-[#5A6675] mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ScadaCard>

      {/* Industrial Configuration Parameters */}
      <ScadaCard title="PLANT ENVIRONMENT & PARAMETER BASELINES" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#303A44] bg-[#151B21] text-[#8D9AA7] uppercase text-[11px]">
                <th className="py-2.5 px-3">PARAMETER KEY</th>
                <th className="py-2.5 px-3">DEPLOYED VALUE</th>
                <th className="py-2.5 px-3">DESCRIPTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26303B]">
              {envVars.map(v => (
                <tr key={v.key} className="hover:bg-[#222B35]/40 transition-colors">
                  <td className="py-2.5 px-3 text-[#38BDF8] font-bold">{v.key}</td>
                  <td className="py-2.5 px-3 text-[#E8EDF2] font-semibold">{v.value}</td>
                  <td className="py-2.5 px-3 text-[#8D9AA7]">{v.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScadaCard>
    </div>
  );
}
