import { describe, it, expect } from 'vitest';

// Condition node evaluator test (extracted logic matching automationService.ts)
const evaluateCondition = (node: any, telemetry: any): boolean => {
  if (!node) return false;
  if (node.type === 'AND') return (node.children || []).every((c: any) => evaluateCondition(c, telemetry));
  if (node.type === 'OR') return (node.children || []).some((c: any) => evaluateCondition(c, telemetry));
  if (node.type === 'NOT') return !evaluateCondition(node.child, telemetry);

  // Leaf
  const parts = (node.metric || '').split('.');
  let val = telemetry;
  for (const p of parts) {
    if (val === undefined || val === null) return false;
    val = val[p];
  }

  const target = node.value;
  switch (node.operator) {
    case '>': return val > target;
    case '>=': return val >= target;
    case '<': return val < target;
    case '<=': return val <= target;
    case '=': return val === target;
    case '!=': return val !== target;
    default: return false;
  }
};

describe('Automation Evaluator', () => {
  const telemetry = {
    electrical: { power: 12.5, current: 55, voltage: 230 },
    environment: { temperature: 42.0, humidity: 60 },
    people: { count: 25 },
  };

  it('evaluates simple greater-than condition', () => {
    expect(evaluateCondition({ metric: 'electrical.power', operator: '>', value: 10 }, telemetry)).toBe(true);
    expect(evaluateCondition({ metric: 'electrical.power', operator: '>', value: 15 }, telemetry)).toBe(false);
  });

  it('evaluates AND conditions correctly', () => {
    const node = {
      type: 'AND',
      children: [
        { metric: 'electrical.power', operator: '>', value: 10 },
        { metric: 'environment.temperature', operator: '>', value: 40 },
      ]
    };
    expect(evaluateCondition(node, telemetry)).toBe(true);

    const falseNode = {
      type: 'AND',
      children: [
        { metric: 'electrical.power', operator: '>', value: 10 },
        { metric: 'environment.temperature', operator: '>', value: 50 },
      ]
    };
    expect(evaluateCondition(falseNode, telemetry)).toBe(false);
  });

  it('evaluates OR conditions correctly', () => {
    const node = {
      type: 'OR',
      children: [
        { metric: 'electrical.power', operator: '>', value: 20 }, // false
        { metric: 'environment.temperature', operator: '>', value: 40 }, // true
      ]
    };
    expect(evaluateCondition(node, telemetry)).toBe(true);
  });

  it('evaluates NOT conditions correctly', () => {
    const node = {
      type: 'NOT',
      child: { metric: 'electrical.power', operator: '>', value: 20 }
    };
    expect(evaluateCondition(node, telemetry)).toBe(true);
  });

  it('handles missing metrics gracefully', () => {
    expect(evaluateCondition({ metric: 'nonexistent.field', operator: '>', value: 10 }, telemetry)).toBe(false);
  });
});
