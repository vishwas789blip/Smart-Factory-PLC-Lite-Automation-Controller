import React, { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line 
} from 'recharts';
import { 
  BrainCircuit, 
  Activity, 
  TrendingUp, 
  SlidersHorizontal, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Cpu, 
  Clock, 
  Layers 
} from 'lucide-react';
import api from '../lib/api';
import ScadaCard from '../components/common/ScadaCard';
import ScadaBadge from '../components/common/ScadaBadge';

export default function AIPage() {
  const [insights, setInsights] = useState<any[]>([]);
  const [anomalyResult, setAnomalyResult] = useState<any>(null);
  const [predResult, setPredResult] = useState<any>(null);
  const [optResult, setOptResult] = useState<any>(null);
  const [demandLimit, setDemandLimit] = useState<number>(6.0);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  const loadHistory = async () => {
    try {
      const res = await api.get('/ai/insights?limit=10');
      setInsights(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const runAnomaly = async () => {
    setLoading(l => ({ ...l, anomaly: true }));
    setError('');
    try {
      const telRes = await api.get('/analytics/power?limit=50');
      const values = (telRes.data || []).map((d: any) => d.power);
      const timestamps = (telRes.data || []).map((d: any) => d.timestamp);
      const res = await api.post('/ai/anomaly', { metric: 'electrical.power', values, timestamps });
      setAnomalyResult(res.data);
      await loadHistory();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Anomaly diagnostic failed');
    } finally {
      setLoading(l => ({ ...l, anomaly: false }));
    }
  };

  const runPrediction = async () => {
    setLoading(l => ({ ...l, prediction: true }));
    setError('');
    try {
      const telRes = await api.get('/analytics/power?limit=200');
      const history = (telRes.data || []).map((d: any) => ({ timestamp: d.timestamp, power: d.power }));
      const res = await api.post('/ai/predict-power', { history, horizon_hours: 6 });
      setPredResult(res.data);
      await loadHistory();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Forecast regression failed');
    } finally {
      setLoading(l => ({ ...l, prediction: false }));
    }
  };

  const runOptimization = async () => {
    setLoading(l => ({ ...l, optimization: true }));
    setError('');
    try {
      const actRes = await api.get('/actuators');
      const telRes = await api.get('/telemetry/latest');
      const telArray = Array.isArray(telRes.data) ? telRes.data : [telRes.data].filter(Boolean);
      const currentDemand = telArray.reduce((sum: number, t: any) => sum + (t?.electrical?.power || 0), 0) || 7.8;

      const loads = (actRes.data || []).map((a: any, i: number) => ({
        id: a.actuatorId,
        name: `${a.type.toUpperCase()} (${a.actuatorId})`,
        power_kw: Number((0.6 + i * 0.4).toFixed(2)),
        priority: (i % 4) + 1,
        critical: (i % 4) === 0 // Priority 1 is Critical
      }));

      const res = await api.post('/ai/optimize-load', {
        current_demand_kw: currentDemand,
        demand_limit_kw: demandLimit,
        loads
      });
      setOptResult(res.data);
      await loadHistory();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Load optimization calculation failed');
    } finally {
      setLoading(l => ({ ...l, optimization: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#303A44]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-[#E8EDF2]">
              AI DIAGNOSTICS & PREDICTIVE LOAD ENGINE
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C242C] border border-[#303A44] text-[#38BDF8]">
              FASTAPI &bull; SCIKIT-LEARN 1.5
            </span>
          </div>
          <p className="text-xs text-[#8D9AA7] font-mono mt-0.5">
            REAL-TIME STATISTICAL ANOMALY CLASSIFICATION, ENSEMBLE FORECASTING & GREEDY SHEDDING
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#EF5555]/10 border border-[#EF5555]/30 rounded text-xs font-mono text-[#EF5555] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3 Core Engineering Modules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Module 1: Anomaly Detection */}
        <ScadaCard
          title="1. TIME-SERIES ANOMALY DETECTOR"
          subtitle="Rolling window Z-score"
          badge={<span className="text-[10px] font-mono text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded border border-[#38BDF8]/20">Z &gt; 2.5</span>}
          action={
            <button
              onClick={runAnomaly}
              disabled={loading.anomaly}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#38BDF8] hover:bg-[#0284C7] disabled:opacity-50 text-[#101418] font-bold font-mono text-xs rounded transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{loading.anomaly ? 'SAMPLING...' : 'RUN AUDIT'}</span>
            </button>
          }
        >
          <div className="space-y-3 font-mono text-xs">
            {anomalyResult ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2 bg-[#151B21] border border-[#26303B] rounded">
                  <span className="text-[#8D9AA7]">DIAGNOSTIC STATUS:</span>
                  <ScadaBadge status={anomalyResult.anomaly ? 'CRITICAL' : 'NORMAL'} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 bg-[#151B21] border border-[#26303B] rounded">
                    <div className="text-[10px] text-[#8D9AA7]">Z-SCORE</div>
                    <div className="text-lg font-bold text-[#38BDF8] mt-0.5">
                      {anomalyResult.score}
                    </div>
                  </div>
                  <div className="p-2 bg-[#151B21] border border-[#26303B] rounded">
                    <div className="text-[10px] text-[#8D9AA7]">BASELINE</div>
                    <div className="text-lg font-bold text-[#E8EDF2] mt-0.5">
                      {anomalyResult.baseline} kW
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-[#151B21] border border-[#26303B] rounded text-[11px] text-[#8D9AA7] leading-relaxed">
                  <span className="text-[#E8EDF2] font-semibold">DIAGNOSIS: </span>
                  {anomalyResult.explanation}
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-[#5A6675]">
                Click &quot;RUN AUDIT&quot; to test the last 50 telemetry points for statistical outliers.
              </div>
            )}
          </div>
        </ScadaCard>

        {/* Module 2: 6h Power Prediction */}
        <ScadaCard
          title="2. 6-HOUR POWER DEMAND FORECAST"
          subtitle="Auto model selection by MAE"
          badge={<span className="text-[10px] font-mono text-[#F0B44D] bg-[#F0B44D]/10 px-1.5 py-0.5 rounded border border-[#F0B44D]/20">RF vs LR</span>}
          action={
            <button
              onClick={runPrediction}
              disabled={loading.prediction}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F0B44D] hover:bg-[#D97706] disabled:opacity-50 text-[#101418] font-bold font-mono text-xs rounded transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{loading.prediction ? 'FITTING...' : 'FORECAST'}</span>
            </button>
          }
        >
          <div className="space-y-3 font-mono text-xs">
            {predResult ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2 bg-[#151B21] border border-[#26303B] rounded text-[11px]">
                  <span className="text-[#8D9AA7]">CHOSEN MODEL:</span>
                  <span className="text-[#35C98A] font-bold">{predResult.model_used}</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                  <div className="p-1.5 bg-[#151B21] border border-[#26303B] rounded">
                    <div className="text-[10px] text-[#8D9AA7]">MAE</div>
                    <div className="font-bold text-[#E8EDF2] mt-0.5">{predResult.metrics?.mae?.toFixed(3)}</div>
                  </div>
                  <div className="p-1.5 bg-[#151B21] border border-[#26303B] rounded">
                    <div className="text-[10px] text-[#8D9AA7]">RMSE</div>
                    <div className="font-bold text-[#E8EDF2] mt-0.5">{predResult.metrics?.rmse?.toFixed(3)}</div>
                  </div>
                  <div className="p-1.5 bg-[#151B21] border border-[#26303B] rounded">
                    <div className="text-[10px] text-[#8D9AA7]">R²</div>
                    <div className="font-bold text-[#35C98A] mt-0.5">{predResult.metrics?.r2?.toFixed(2)}</div>
                  </div>
                </div>

                {/* Mini Forecast Curve */}
                <div className="h-[100px] w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={predResult.predictions}>
                      <CartesianGrid stroke="#26303B" strokeDasharray="2 2" vertical={false} />
                      <XAxis dataKey="timestamp" tick={false} stroke="#303A44" />
                      <YAxis tick={{ fill: '#5A6675', fontSize: 9, fontFamily: 'monospace' }} stroke="#303A44" unit=" kW" />
                      <Tooltip contentStyle={{ backgroundColor: '#151B21', borderColor: '#303A44', fontSize: 11 }} />
                      <Line type="monotone" dataKey="power" stroke="#F0B44D" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-[#5A6675]">
                Click &quot;FORECAST&quot; to train models on historical kW and project demand 6 hours ahead.
              </div>
            )}
          </div>
        </ScadaCard>

        {/* Module 3: Priority Load Shedding */}
        <ScadaCard
          title="3. GREEDY LOAD SHEDDING OPTIMIZER"
          subtitle="Protects Priority 1 Critical circuits"
          badge={<span className="text-[10px] font-mono text-[#35C98A] bg-[#35C98A]/10 px-1.5 py-0.5 rounded border border-[#35C98A]/20">P1-P4</span>}
          action={
            <button
              onClick={runOptimization}
              disabled={loading.optimization}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#35C98A] hover:bg-[#2EB87C] disabled:opacity-50 text-[#101418] font-bold font-mono text-xs rounded transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{loading.optimization ? 'SOLVING...' : 'OPTIMIZE'}</span>
            </button>
          }
        >
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between gap-2 p-2 bg-[#151B21] border border-[#26303B] rounded">
              <span className="text-[#8D9AA7]">DEMAND CEILING:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.5"
                  value={demandLimit}
                  onChange={e => setDemandLimit(parseFloat(e.target.value) || 0)}
                  className="w-16 px-1.5 py-0.5 bg-[#1C242C] border border-[#303A44] rounded text-right text-[#E8EDF2] font-bold"
                />
                <span className="text-[#8D9AA7]">kW</span>
              </div>
            </div>

            {optResult ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] p-2 bg-[#151B21] border border-[#26303B] rounded">
                  <span className="text-[#8D9AA7]">SOLVER FEASIBILITY:</span>
                  <ScadaBadge status={optResult.feasible ? 'NORMAL' : 'CRITICAL'} />
                </div>

                <div className="text-[11px] space-y-1">
                  <div className="flex justify-between text-[#8D9AA7]">
                    <span>REDUCTION TARGET:</span>
                    <span className="text-[#EF5555] font-bold">{optResult.required_reduction_kw} kW</span>
                  </div>
                  <div className="flex justify-between text-[#8D9AA7]">
                    <span>ACHIEVED SHED:</span>
                    <span className="text-[#35C98A] font-bold">{optResult.achievable_reduction_kw} kW</span>
                  </div>
                </div>

                {optResult.recommended_actions?.length > 0 ? (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-[#5A6675]">ACTIONS RECOMMENDED:</span>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {optResult.recommended_actions.map((act: any, idx: number) => (
                        <div key={idx} className="p-1.5 bg-[#151B21] border border-[#26303B] rounded flex items-center justify-between text-[10px]">
                          <span className="text-[#F0B44D] font-bold">{act.load_id}</span>
                          <span className="text-[#EF5555]">SHED {act.power_kw} kW</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 bg-[#151B21] border border-[#26303B] rounded text-center text-[#35C98A] text-[11px]">
                    Demand is within acceptable ceiling limits.
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-[#5A6675]">
                Configure power ceiling and click &quot;OPTIMIZE&quot; to evaluate non-critical shedding.
              </div>
            )}
          </div>
        </ScadaCard>
      </div>

      {/* Audit History of Model Inferences */}
      <ScadaCard
        title="HISTORICAL AI INFERENCE LOGS"
        subtitle="Chronological record of model outputs"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#303A44] bg-[#151B21] text-[#8D9AA7] uppercase text-[11px]">
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">INFERENCE TYPE</th>
                <th className="py-2.5 px-3">TARGET DEVICE</th>
                <th className="py-2.5 px-3">SEVERITY</th>
                <th className="py-2.5 px-3">KEY SUMMARY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26303B]">
              {insights.length > 0 ? (
                insights.map((ins, i) => (
                  <tr key={ins._id || i} className="hover:bg-[#222B35]/40 transition-colors">
                    <td className="py-2.5 px-3 text-[#5A6675]">
                      {new Date(ins.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-[#38BDF8] font-bold">
                      {ins.type}
                    </td>
                    <td className="py-2.5 px-3 text-[#E8EDF2]">
                      {ins.deviceId || 'ALL_DEVICES'}
                    </td>
                    <td className="py-2.5 px-3">
                      <ScadaBadge status={ins.severity || 'LOW'} />
                    </td>
                    <td className="py-2.5 px-3 text-[#8D9AA7] truncate max-w-xs">
                      {ins.data?.explanation || ins.data?.model_used || (ins.data?.feasible ? 'Feasible reduction found' : 'Under limit')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#5A6675]">
                    No historical inference records logged yet.
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
