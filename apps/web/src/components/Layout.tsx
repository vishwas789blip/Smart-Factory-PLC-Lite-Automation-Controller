import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Cpu, 
  Activity, 
  Sliders, 
  Workflow, 
  CalendarClock, 
  Zap, 
  Gauge, 
  BrainCircuit, 
  AlertOctagon, 
  FileText, 
  Terminal, 
  Settings,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import TopNav from './TopNav';

interface LayoutProps {
  children: React.ReactNode;
}

const navSections = [
  {
    heading: 'OPERATIONS',
    items: [
      { path: '/dashboard', label: 'Factory Overview', icon: LayoutDashboard },
      { path: '/devices', label: 'Devices Inventory', icon: Cpu },
      { path: '/sensors', label: 'Sensors Telemetry', icon: Activity },
      { path: '/actuators', label: 'Actuator Controls', icon: Sliders },
    ]
  },
  {
    heading: 'CONTROL & AUTOMATION',
    items: [
      { path: '/automations', label: 'Automations Engine', icon: Workflow },
      { path: '/schedules', label: 'Shift Schedules', icon: CalendarClock },
    ]
  },
  {
    heading: 'ANALYTICS & AI',
    items: [
      { path: '/analytics/energy', label: 'Energy Analytics', icon: Zap },
      { path: '/analytics/machines', label: 'Machine Analytics', icon: Gauge },
      { path: '/ai', label: 'AI Diagnostics', icon: BrainCircuit },
    ]
  },
  {
    heading: 'SYSTEM & LOGS',
    items: [
      { path: '/alerts', label: 'Alarms Console', icon: AlertOctagon },
      { path: '/audit', label: 'Audit Trail', icon: FileText },
      { path: '/simulator', label: 'PLC Simulator', icon: Terminal },
      { path: '/settings', label: 'System Settings', icon: Settings },
    ]
  }
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#101418] text-[#E8EDF2] overflow-hidden font-sans">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-40 w-60 bg-[#151B21] border-r border-[#303A44] flex flex-col flex-shrink-0 transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand / Logo Header */}
        <div className="h-13 border-b border-[#303A44] flex items-center justify-between px-4 bg-[#11161B]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-[#35C98A]/20 border border-[#35C98A]/50 flex items-center justify-center">
              <span className="font-mono text-xs font-bold text-[#35C98A]">SC</span>
            </div>
            <div>
              <div className="text-xs font-bold font-mono tracking-wider text-[#E8EDF2]">PLC-LITE</div>
              <div className="text-[10px] text-[#8D9AA7] font-mono leading-none">SCADA CONTROLLER</div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1C242C] border border-[#303A44] text-[#8D9AA7]">
            v2.4
          </span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {navSections.map((sec, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <div className="px-2.5 text-[10px] font-mono font-semibold tracking-wider text-[#5A6675]">
                {sec.heading}
              </div>
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || 
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded text-xs font-mono transition-colors group ${
                      isActive
                        ? 'bg-[#1C242C] text-[#38BDF8] border border-[#303A44] shadow-xs'
                        : 'text-[#8D9AA7] hover:bg-[#1C242C]/60 hover:text-[#E8EDF2]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-[#38BDF8]' : 'text-[#8D9AA7] group-hover:text-[#E8EDF2]'
                      }`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-[#38BDF8]" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Hardware Info Pill */}
        <div className="p-3 border-t border-[#303A44] bg-[#11161B]">
          <div className="p-2 bg-[#1C242C] border border-[#303A44] rounded text-[11px] font-mono space-y-1">
            <div className="flex items-center justify-between text-[#8D9AA7]">
              <span>CORE ARCH:</span>
              <span className="text-[#E8EDF2]">ESP32 DUAL-CORE</span>
            </div>
            <div className="flex items-center justify-between text-[#8D9AA7]">
              <span>PROTOCOL:</span>
              <span className="text-[#35C98A]">MQTT v5 / TLS</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav onToggleSidebar={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 overflow-y-auto bg-[#101418] p-4 sm:p-6 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
