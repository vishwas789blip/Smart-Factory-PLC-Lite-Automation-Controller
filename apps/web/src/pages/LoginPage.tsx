import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  Cpu, 
  User 
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication rejected. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDevCreds = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-[#101418] flex items-center justify-center p-4 font-sans select-none">
      <div className="bg-[#1C242C] border border-[#303A44] rounded shadow-2xl p-6 sm:p-8 w-full max-w-md font-mono">
        {/* Terminal Header */}
        <div className="text-center pb-6 border-b border-[#26303B] mb-6">
          <div className="w-10 h-10 rounded bg-[#35C98A]/15 border border-[#35C98A]/40 flex items-center justify-center mx-auto mb-3">
            <Cpu className="w-5 h-5 text-[#35C98A]" />
          </div>
          <h1 className="text-lg font-bold tracking-wider text-[#E8EDF2] uppercase">
            PLC-LITE SCADA ACCESS GATEWAY
          </h1>
          <p className="text-xs text-[#8D9AA7] mt-1">
            AUTHORIZED OPERATOR WORKSTATION &bull; FACILITY ALPHA
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-[#EF5555]/10 border border-[#EF5555]/30 rounded text-xs text-[#EF5555] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#8D9AA7] mb-1 font-semibold uppercase">OPERATOR EMAIL</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6675]" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#151B21] border border-[#303A44] rounded text-[#E8EDF2] placeholder-[#5A6675] focus:outline-none focus:border-[#38BDF8]"
                placeholder="operator@factory.local"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[#8D9AA7] mb-1 font-semibold uppercase">SECURITY KEY / PASSWORD</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6675]" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#151B21] border border-[#303A44] rounded text-[#E8EDF2] placeholder-[#5A6675] focus:outline-none focus:border-[#38BDF8]"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#38BDF8] hover:bg-[#0284C7] disabled:opacity-50 text-[#101418] font-bold rounded transition-colors flex items-center justify-center gap-2 shadow-xs mt-2"
          >
            <span>{loading ? 'AUTHENTICATING...' : 'AUTHENTICATE & CONNECT'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Dev-Mode Role Selector */}
        <div className="mt-6 pt-5 border-t border-[#26303B]">
          <div className="text-[10px] text-[#5A6675] uppercase text-center mb-2">
            PRECONFIGURED PLANT CREDENTIALS (DEV):
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setDevCreds('admin@factory.local', 'Admin@1234')}
              className="px-2 py-1 bg-[#151B21] hover:bg-[#222B35] border border-[#303A44] rounded text-[11px] text-[#EF5555] text-left truncate"
            >
              ADMIN &bull; Full Access
            </button>
            <button
              type="button"
              onClick={() => setDevCreds('engineer@factory.local', 'Engineer@1234')}
              className="px-2 py-1 bg-[#151B21] hover:bg-[#222B35] border border-[#303A44] rounded text-[11px] text-[#F0B44D] text-left truncate"
            >
              ENGINEER &bull; Rules
            </button>
            <button
              type="button"
              onClick={() => setDevCreds('operator@factory.local', 'Operator@1234')}
              className="px-2 py-1 bg-[#151B21] hover:bg-[#222B35] border border-[#303A44] rounded text-[11px] text-[#38BDF8] text-left truncate"
            >
              OPERATOR &bull; Control
            </button>
            <button
              type="button"
              onClick={() => setDevCreds('viewer@factory.local', 'Viewer@1234')}
              className="px-2 py-1 bg-[#151B21] hover:bg-[#222B35] border border-[#303A44] rounded text-[11px] text-[#8D9AA7] text-left truncate"
            >
              VIEWER &bull; Read-Only
            </button>
          </div>
        </div>

        <div className="text-center mt-5 text-[11px] text-[#5A6675]">
          <span>New workstation? </span>
          <Link to="/register" className="text-[#38BDF8] hover:underline">
            Register operator identity
          </Link>
        </div>
      </div>
    </div>
  );
}
