import { describe, it, expect } from 'vitest';

describe('Electrical Math Verification', () => {
  it('calculates power from V, I, PF correctly: P = V * I * PF / 1000 kW', () => {
    const voltage = 230; // V
    const current = 10;  // A
    const powerFactor = 0.95;
    const powerKw = (voltage * current * powerFactor) / 1000;
    expect(powerKw).toBeCloseTo(2.185, 3);
  });

  it('calculates current from P, V, PF correctly: I = P * 1000 / (V * PF)', () => {
    const powerKw = 2.185;
    const voltage = 230;
    const powerFactor = 0.95;
    const current = (powerKw * 1000) / (voltage * powerFactor);
    expect(current).toBeCloseTo(10, 1);
  });

  it('accumulates energy correctly over time: E = P * (dt / 3600)', () => {
    let energyAccumulator = 0;
    const powerKw = 5.0; // 5 kW constant load
    const dtSeconds = 5; // 5 second tick
    const ticksPerHour = 3600 / dtSeconds;

    for (let i = 0; i < ticksPerHour; i++) {
      energyAccumulator += powerKw * (dtSeconds / 3600);
    }
    // After 1 hour of 5kW, energy should be exactly 5 kWh
    expect(energyAccumulator).toBeCloseTo(5.0, 3);
  });

  it('calculates energy cost correctly: Cost = E * Tariff', () => {
    const energyKwh = 120.5;
    const tariff = 0.12; // $0.12/kWh
    const cost = energyKwh * tariff;
    expect(cost).toBeCloseTo(14.46, 2);
  });

  it('aggregates multi-device energy by per-device delta rather than global min-max', () => {
    // Device A starts at 100 kWh, ends at 105 kWh -> consumed 5 kWh
    const devA = { min: 100, max: 105, delta: 105 - 100 };
    // Device B starts at 500 kWh, ends at 508 kWh -> consumed 8 kWh
    const devB = { min: 500, max: 508, delta: 508 - 500 };

    // Wrong naive aggregation: max(all) - min(all) = 508 - 100 = 408 kWh (false)
    const naiveGlobalDelta = Math.max(devA.max, devB.max) - Math.min(devA.min, devB.min);
    expect(naiveGlobalDelta).toBe(408);

    // Correct multi-device aggregation: sum of per-device deltas = 5 + 8 = 13 kWh
    const correctSumOfDeltas = devA.delta + devB.delta;
    expect(correctSumOfDeltas).toBe(13);
  });
});
