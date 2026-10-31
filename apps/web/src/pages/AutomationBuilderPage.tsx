import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  Code, 
  Sliders, 
  AlertCircle, 
  CheckCircle2, 
  Workflow 
} from 'lucide-react';
import api from '../lib/api';
import ScadaCard from '../components/common/ScadaCard';

const METRICS = [
  'electrical.power', 'electrical.current', 'electrical.voltage', 'electrical.powerFactor',
  'environment.temperature', 'environment.humidity', 'environment.smoke', 'environment.gas',
  'people.count'
];
const OPERATORS = ['>', '>=', '<', '<=', '=', '!='];
const COMMANDS = ['ON', 'OFF', 'TOGGLE', 'RESET'];

interface Condition {
  metric: string;
  operator: string;
  value: number;
}

interface Action {
  actuatorId: string;
  command: string;
  deviceId: string;
}

export default function AutomationBuilderPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [conditions, setConditions] = useState<Condition[]>([{ metric: 'electrical.power', operator: '>', value: 5.0 }]);
  const [logicOp, setLogicOp] = useState<'AND' | 'OR'>('AND');
  const [actions, setActions] = useState<Action[]>([{ actuatorId: '', command: 'OFF', deviceId: '' }]);
  const [cooldown, setCooldown] = useState(60);
  const [maxPerHour, setMaxPerHour] = useState(10);
  const [actuators, setActuators] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    api.get('/actuators').then(res => {
      setActuators(res.data || []);
      if (res.data?.length > 0) {
        setActions([{ actuatorId: res.data[0].actuatorId, command: 'OFF', deviceId: res.data[0].deviceId }]);
      }
    }).catch(console.error);
  }, []);

  const addCondition = () => setConditions(prev => [...prev, { metric: 'environment.temperature', operator: '>', value: 45 }]);
  const removeCondition = (i: number) => setConditions(prev => prev.filter((_, idx) => idx !== i));
  const updateCondition = (i: number, field: keyof Condition, val: any) =>
    setConditions(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  const addAction = () => setActions(prev => [...prev, { 
    actuatorId: actuators[0]?.actuatorId || '', 
    command: 'OFF', 
    deviceId: actuators[0]?.deviceId || '' 
  }]);
  const removeAction = (i: number) => setActions(prev => prev.filter((_, idx) => idx !== i));
  const updateAction = (i: number, field: keyof Action, val: string) => {
    if (field === 'actuatorId') {
      const act = actuators.find(a => a.actuatorId === val);
      setActions(prev => prev.map((a, idx) => idx === i ? { ...a, actuatorId: val, deviceId: act?.deviceId || '' } : a));
    } else {
      setActions(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a));
    }
  };

  const buildConditionTree = () => {
    if (conditions.length === 1) return { type: 'LEAF', ...conditions[0] };
    return {
      type: logicOp,
      children: conditions.map(c => ({ type: 'LEAF', ...c }))
    };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for this automation rule.');
      return;
    }
    if (actions.some(a => !a.actuatorId)) {
      setError('Please select a target actuator for every action.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name,
        description,
        enabled: true,
        triggerType: 'TELEMETRY',
        conditions: buildConditionTree(),
        actions,
        cooldownSeconds: Number(cooldown),
        maxExecutionsPerHour: Number(maxPerHour)
      };

      await api.post('/automations', payload);
      navigate('/automations');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to persist automation rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-[#303A44]">
        <div className="flex items-center gap-3">
          <Link
            to="/automations"
            className="p-1.5 rounded bg-[#1C242C] border border-[#303A44] text-[#8D9AA7] hover:text-[#E8EDF2] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold font-mono tracking-wide text-[#E8EDF2]">
              VISUAL LOGIC RULE BUILDER
            </h1>
            <p className="text-xs text-[#8D9AA7] font-mono mt-0.5">
              DEFINE DETERMINISTIC WHEN &rarr; THEN CONDITIONS FOR REAL-TIME TELEMETRY
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowJson(!showJson)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C242C] hover:bg-[#222B35] border border-[#303A44] rounded text-xs font-mono text-[#8D9AA7] hover:text-[#E8EDF2] transition-colors"
        >
          <Code className="w-3.5 h-3.5" />
          <span>{showJson ? 'HIDE AST' : 'VIEW JSON AST'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-[#EF5555]/10 border border-[#EF5555]/40 rounded text-xs font-mono text-[#EF5555] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Metadata */}
        <ScadaCard title="1. RULE IDENTITY & RATE CONTROLS">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <label className="block text-[#8D9AA7] mb-1 font-semibold">RULE NAME</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. High Temp Emergency Exhaust Fan"
                className="w-full px-3 py-2 bg-[#151B21] border border-[#303A44] rounded text-[#E8EDF2] placeholder-[#5A6675] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>

            <div>
              <label className="block text-[#8D9AA7] mb-1 font-semibold">DESCRIPTION</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Operational purpose or interlock explanation..."
                className="w-full px-3 py-2 bg-[#151B21] border border-[#303A44] rounded text-[#E8EDF2] placeholder-[#5A6675] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>

            <div>
              <label className="block text-[#8D9AA7] mb-1 font-semibold">COOLDOWN INTERVAL (SECONDS)</label>
              <input
                type="number"
                min="5"
                value={cooldown}
                onChange={e => setCooldown(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#151B21] border border-[#303A44] rounded text-[#E8EDF2] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>

            <div>
              <label className="block text-[#8D9AA7] mb-1 font-semibold">MAX EXECUTIONS PER HOUR</label>
              <input
                type="number"
                min="1"
                value={maxPerHour}
                onChange={e => setMaxPerHour(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#151B21] border border-[#303A44] rounded text-[#E8EDF2] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
          </div>
        </ScadaCard>

        {/* Section 2: Conditions (WHEN) */}
        <ScadaCard 
          title="2. WHEN (INPUT TRIGGER CONDITIONS)" 
          action={
            conditions.length > 1 && (
              <div className="flex items-center gap-1 font-mono text-xs">
                <span className="text-[#8D9AA7]">COMBINATOR:</span>
                {(['AND', 'OR'] as const).map(op => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setLogicOp(op)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                      logicOp === op
                        ? 'bg-[#38BDF8] text-[#101418] border-[#38BDF8]'
                        : 'bg-[#151B21] text-[#8D9AA7] border-[#303A44]'
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            )
          }
        >
          <div className="space-y-3 font-mono text-xs">
            {conditions.map((c, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 bg-[#151B21] border border-[#26303B] rounded">
                <span className="text-[11px] font-bold text-[#38BDF8] px-2 py-1 bg-[#1C242C] rounded border border-[#303A44] w-fit">
                  {i === 0 ? 'WHEN' : logicOp}
                </span>

                <select
                  value={c.metric}
                  onChange={e => updateCondition(i, 'metric', e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-[#1C242C] border border-[#303A44] rounded text-[#E8EDF2] focus:outline-none focus:border-[#38BDF8]"
                >
                  {METRICS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <select
                  value={c.operator}
                  onChange={e => updateCondition(i, 'operator', e.target.value)}
                  className="w-20 px-2.5 py-1.5 bg-[#1C242C] border border-[#303A44] rounded text-[#E8EDF2] font-bold focus:outline-none focus:border-[#38BDF8]"
                >
                  {OPERATORS.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>

                <input
                  type="number"
                  step="any"
                  value={c.value}
                  onChange={e => updateCondition(i, 'value', parseFloat(e.target.value) || 0)}
                  className="w-28 px-2.5 py-1.5 bg-[#1C242C] border border-[#303A44] rounded text-[#E8EDF2] focus:outline-none focus:border-[#38BDF8]"
                />

                {conditions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCondition(i)}
                    className="p-1.5 text-[#8D9AA7] hover:text-[#EF5555] rounded hover:bg-[#222B35] self-end sm:self-center"
                    title="Remove condition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addCondition}
              className="flex items-center gap-1.5 text-xs text-[#38BDF8] hover:text-[#7DD3FC] px-2 py-1 rounded hover:bg-[#222B35] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD ANOTHER CONDITION</span>
            </button>
          </div>
        </ScadaCard>

        {/* Section 3: Actions (THEN) */}
        <ScadaCard title="3. THEN (OUTPUT ACTUATOR ACTIONS)">
          <div className="space-y-3 font-mono text-xs">
            {actions.map((act, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 bg-[#151B21] border border-[#26303B] rounded">
                <span className="text-[11px] font-bold text-[#35C98A] px-2 py-1 bg-[#1C242C] rounded border border-[#303A44] w-fit">
                  THEN
                </span>

                <select
                  value={act.actuatorId}
                  onChange={e => updateAction(i, 'actuatorId', e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-[#1C242C] border border-[#303A44] rounded text-[#E8EDF2] focus:outline-none focus:border-[#38BDF8]"
                >
                  <option value="">-- Select Actuator Circuit --</option>
                  {actuators.map(a => (
                    <option key={a.actuatorId} value={a.actuatorId}>
                      {a.actuatorId} ({a.type} &bull; {a.deviceId})
                    </option>
                  ))}
                </select>

                <select
                  value={act.command}
                  onChange={e => updateAction(i, 'command', e.target.value)}
                  className="w-28 px-2.5 py-1.5 bg-[#1C242C] border border-[#303A44] rounded text-[#E8EDF2] font-bold focus:outline-none focus:border-[#38BDF8]"
                >
                  {COMMANDS.map(cmd => (
                    <option key={cmd} value={cmd}>{cmd}</option>
                  ))}
                </select>

                {actions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAction(i)}
                    className="p-1.5 text-[#8D9AA7] hover:text-[#EF5555] rounded hover:bg-[#222B35] self-end sm:self-center"
                    title="Remove action"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addAction}
              className="flex items-center gap-1.5 text-xs text-[#35C98A] hover:text-[#6EE7B7] px-2 py-1 rounded hover:bg-[#222B35] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD ANOTHER ACTUATOR ACTION</span>
            </button>
          </div>
        </ScadaCard>

        {/* Section 4: Live AST JSON Preview */}
        {showJson && (
          <ScadaCard title="ABSTRACT SYNTAX TREE SPECIFICATION">
            <pre className="p-3 bg-[#11161B] border border-[#303A44] rounded text-xs font-mono text-[#38BDF8] overflow-x-auto">
              {JSON.stringify(buildConditionTree(), null, 2)}
            </pre>
          </ScadaCard>
        )}

        {/* Action Button Row */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/automations"
            className="px-4 py-2 bg-[#1C242C] hover:bg-[#222B35] border border-[#303A44] text-[#8D9AA7] hover:text-[#E8EDF2] font-mono text-xs rounded transition-colors"
          >
            CANCEL
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-[#38BDF8] hover:bg-[#0284C7] disabled:opacity-50 text-[#101418] font-mono font-bold text-xs rounded transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'COMMITTING RULE...' : 'COMMIT AUTOMATION RULE'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
