import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWs } from '../contexts/WsContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  Wifi, 
  WifiOff, 
  Radio, 
  Server, 
  Clock, 
  Bell, 
  LogOut, 
  User, 
  Menu 
} from 'lucide-react';
import api from '../lib/api';

interface TopNavProps {
  onToggleSidebar?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { connected } = useWs();
  const navigate = useNavigate();

  const [activeAlertCount, setActiveAlertCount] = useState<number>(0);
  const [apiHealthy, setApiHealthy] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentUtc, setCurrentUtc] = useState<string>('');

  // Clock tick
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
      setCurrentUtc(now.toISOString().substring(11, 19) + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll active alerts & API health status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const [alertRes, healthRes] = await Promise.all([
          api.get('/alerts?acknowledged=false&limit=100'),
          api.get('/health')
        ]);
        setActiveAlertCount(Array.isArray(alertRes.data) ? alertRes.data.length : 0);
        setApiHealthy(healthRes.data?.status === 'ok' || healthRes.status === 200);
      } catch {
        setApiHealthy(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleColor: Record<string, string> = {
    ADMIN: 'bg-[#EF5555]/20 text-[#EF5555] border-[#EF5555]/40',
    ENGINEER: 'bg-[#F0B44D]/20 text-[#F0B44D] border-[#F0B44D]/40',
    OPERATOR: 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]/40',
    VIEWER: 'bg-[#8D9AA7]/20 text-[#8D9AA7] border-[#8D9AA7]/40',
  };

  return (
    <header className="h-13 bg-[#151B21] border-b border-[#303A44] flex items-center justify-between px-4 z-20 flex-shrink-0 select-none">
      {/* Left: Mobile Toggle & Facility Selector */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded text-[#8D9AA7] hover:text-[#E8EDF2] hover:bg-[#1C242C]"
            aria-label="Toggle menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 px-2.5 py-1 bg-[#1C242C] border border-[#303A44] rounded text-xs font-mono">
          <Building2 className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span className="text-[#8D9AA7] hidden sm:inline">FACILITY:</span>
          <span className="text-[#E8EDF2] font-semibold">Alpha Plant (Line 01)</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#35C98A] ml-1" />
        </div>
      </div>

      {/* Middle: Industrial Telemetry Link Statuses */}
      <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
        {/* WS Stream */}
        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi className="w-3.5 h-3.5 text-[#35C98A]" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-[#EF5555]" />
          )}
          <span className="text-[#8D9AA7]">WS:</span>
          <span className={connected ? 'text-[#35C98A]' : 'text-[#EF5555]'}>
            {connected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        <span className="text-[#303A44]">|</span>

        {/* MQTT Broker */}
        <div className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span className="text-[#8D9AA7]">MQTT:</span>
          <span className="text-[#E8EDF2]">1883</span>
          <span className="text-[#35C98A] text-[10px] px-1 bg-[#35C98A]/10 rounded border border-[#35C98A]/30">LIVE</span>
        </div>

        <span className="text-[#303A44]">|</span>

        {/* API Health */}
        <div className="flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-[#8D9AA7]" />
          <span className="text-[#8D9AA7]">API:</span>
          <span className={apiHealthy ? 'text-[#35C98A]' : 'text-[#EF5555]'}>
            {apiHealthy ? 'HEALTHY' : 'DEGRADED'}
          </span>
        </div>

        <span className="text-[#303A44]">|</span>

        {/* Clock */}
        <div className="flex items-center gap-1.5 text-[#8D9AA7]">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-[#E8EDF2] font-semibold">{currentTime}</span>
          <span className="text-[10px] text-[#5A6675]">({currentUtc})</span>
        </div>
      </div>

      {/* Right: Alarms Drawer Link & User Profile */}
      <div className="flex items-center gap-3">
        {/* Alarms indicator */}
        <Link
          to="/alerts"
          className="relative p-1.5 rounded hover:bg-[#1C242C] text-[#8D9AA7] hover:text-[#E8EDF2] transition-colors"
          title="Active Alarms"
        >
          <Bell className="w-4 h-4" />
          {activeAlertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#EF5555] text-white text-[10px] font-bold font-mono rounded-full flex items-center justify-center animate-pulse">
              {activeAlertCount > 9 ? '9+' : activeAlertCount}
            </span>
          )}
        </Link>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#303A44]">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-mono text-[#E8EDF2] font-medium truncate max-w-[130px]">
              {user?.email || 'operator'}
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${roleColor[user?.role || 'VIEWER'] || 'text-[#8D9AA7]'}`}>
              {user?.role || 'VIEWER'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded text-[#8D9AA7] hover:text-[#EF5555] hover:bg-[#1C242C] transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopNav;

