"""Unit tests for the AI service algorithms."""
import pytest
import numpy as np
from main import detect_anomaly, optimize_load, AnomalyRequest, OptimizationRequest, Load

def test_anomaly_detection_normal_series():
    # Normal series with small noise
    values = [2.0 + np.random.normal(0, 0.05) for _ in range(30)]
    req = AnomalyRequest(metric="power", values=values)
    res = detect_anomaly(req)
    assert not res.anomaly
    assert res.severity == "LOW"

def test_anomaly_detection_spike():
    # Normal series with a massive spike at the end
    values = [2.0] * 25 + [15.0]  # 7.5x baseline
    req = AnomalyRequest(metric="power", values=values)
    res = detect_anomaly(req)
    assert res.anomaly
    assert res.severity in ["MEDIUM", "HIGH"]
    assert res.score > 2.5

def test_anomaly_detection_insufficient_data():
    req = AnomalyRequest(metric="power", values=[1.0, 2.0])
    res = detect_anomaly(req)
    assert not res.anomaly
    assert "Insufficient data" in res.explanation

def test_load_optimization_greedy_shedding():
    loads = [
        Load(id="conveyor-01", name="Conveyor", power_kw=5.0, priority=1, critical=True),
        Load(id="ac-01", name="AC Unit", power_kw=2.0, priority=4, critical=False),
        Load(id="lights-01", name="Lights", power_kw=1.0, priority=3, critical=False),
        Load(id="fan-01", name="Exhaust Fan", power_kw=0.5, priority=2, critical=False),
    ]
    # Current demand is 8.5 kW, limit is 6.0 kW -> need 2.5 kW reduction
    req = OptimizationRequest(
        current_demand_kw=8.5,
        demand_limit_kw=6.0,
        loads=loads
    )
    res = optimize_load(req)
    assert res.feasible
    assert res.achievable_reduction_kw >= 2.5
    # Critical load (priority 1) should NEVER be recommended
    recommended_ids = [a.load_id for a in res.recommended_actions]
    assert "conveyor-01" not in recommended_ids
    # Priority 4 should be shed first
    assert recommended_ids[0] == "ac-01"

def test_load_optimization_already_under_limit():
    loads = [Load(id="l1", name="L1", power_kw=1.0, priority=2)]
    req = OptimizationRequest(current_demand_kw=5.0, demand_limit_kw=10.0, loads=loads)
    res = optimize_load(req)
    assert res.feasible
    assert len(res.recommended_actions) == 0

def test_power_prediction_iso_format():
    from main import predict_power, PredictionRequest, PowerDataPoint
    history = [
        PowerDataPoint(timestamp=f"2026-10-31T{h:02d}:00:00Z", power=3.0)
        for h in range(24)
    ]
    req = PredictionRequest(history=history, horizon_hours=2)
    res = predict_power(req)
    assert len(res.predictions) == 4
    for p in res.predictions:
        assert p.timestamp.endswith("Z")
        assert "+00:00" not in p.timestamp
        import datetime
        dt = datetime.datetime.fromisoformat(p.timestamp.replace("Z", "+00:00"))
        assert dt is not None
