"""
Smart Factory AI Service
Provides: anomaly detection, power prediction, load optimization
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from datetime import datetime, timedelta
import math

app = FastAPI(title="Smart Factory AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Models ──────────────────────────────────────────────────────────────────

class AnomalyRequest(BaseModel):
    metric: str
    values: List[float]
    timestamps: Optional[List[str]] = None
    deviceId: Optional[str] = None

class AnomalyResponse(BaseModel):
    anomaly: bool
    metric: str
    severity: str
    score: float
    explanation: str
    baseline: float
    current: float

class PowerDataPoint(BaseModel):
    timestamp: str
    power: float

class PredictionRequest(BaseModel):
    history: List[PowerDataPoint]
    horizon_hours: int = 6
    deviceId: Optional[str] = None

class PredictionPoint(BaseModel):
    timestamp: str
    power: float

class PredictionMetrics(BaseModel):
    mae: float
    rmse: float
    r2: float

class PredictionResponse(BaseModel):
    predictions: List[PredictionPoint]
    model_used: str
    metrics: PredictionMetrics

class Load(BaseModel):
    id: str
    name: str
    power_kw: float
    priority: int  # 1=critical, 2=high, 3=medium, 4=low
    critical: bool = False

class OptimizationRequest(BaseModel):
    current_demand_kw: float
    demand_limit_kw: float
    loads: List[Load]
    deviceId: Optional[str] = None

class RecommendedAction(BaseModel):
    load_id: str
    action: str
    power_kw: float
    priority: int
    reason: str

class OptimizationResponse(BaseModel):
    feasible: bool
    required_reduction_kw: float
    achievable_reduction_kw: float
    recommended_actions: List[RecommendedAction]
    remaining_excess_kw: float

# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": True, "timestamp": datetime.utcnow().isoformat()}

# ─── Anomaly Detection ────────────────────────────────────────────────────────

@app.post("/detect-anomaly", response_model=AnomalyResponse)
def detect_anomaly(req: AnomalyRequest):
    values = [v for v in req.values if not math.isnan(v)]

    if len(values) < 5:
        return AnomalyResponse(
            anomaly=False,
            metric=req.metric,
            severity="LOW",
            score=0.0,
            explanation="Insufficient data for anomaly detection (need ≥5 points)",
            baseline=np.mean(values) if values else 0.0,
            current=values[-1] if values else 0.0
        )

    # Rolling window z-score (window = min(20, half the data))
    window = min(20, max(5, len(values) // 2))
    recent = values[-window:]
    baseline_mean = np.mean(recent[:-1]) if len(recent) > 1 else np.mean(recent)
    baseline_std = np.std(recent[:-1]) if len(recent) > 1 else 0.0
    current = values[-1]

    # Handle zero-variance baseline
    if baseline_std < 1e-6:
        z_score = 99.0 if abs(current - baseline_mean) > 1e-6 else 0.0
    else:
        z_score = abs(current - baseline_mean) / baseline_std

    # Determine anomaly
    if z_score > 3.5:
        severity = "HIGH"
        anomaly = True
    elif z_score > 2.5:
        severity = "MEDIUM"
        anomaly = True
    elif z_score > 1.5:
        severity = "LOW"
        anomaly = False
    else:
        severity = "LOW"
        anomaly = False

    direction = "high" if current > baseline_mean else "low"
    explanation = (
        f"Value {current:.3f} is {abs(current - baseline_mean):.3f} units {direction} "
        f"of baseline {baseline_mean:.3f} (z-score={z_score:.2f}). "
        f"{'Anomaly detected.' if anomaly else 'Within normal range.'}"
    )

    return AnomalyResponse(
        anomaly=anomaly,
        metric=req.metric,
        severity=severity,
        score=round(z_score, 4),
        explanation=explanation,
        baseline=round(baseline_mean, 4),
        current=round(current, 4)
    )

# ─── Power Prediction ─────────────────────────────────────────────────────────

def extract_features(timestamps: pd.Series) -> pd.DataFrame:
    """Extract cyclical time features from timestamps."""
    dt = pd.to_datetime(timestamps)
    hour = dt.dt.hour + dt.dt.minute / 60
    dow = dt.dt.dayofweek
    return pd.DataFrame({
        "hour_sin": np.sin(2 * np.pi * hour / 24),
        "hour_cos": np.cos(2 * np.pi * hour / 24),
        "dow_sin": np.sin(2 * np.pi * dow / 7),
        "dow_cos": np.cos(2 * np.pi * dow / 7),
        "hour": hour,
        "dow": dow,
    })

@app.post("/predict-power", response_model=PredictionResponse)
def predict_power(req: PredictionRequest):
    history = req.history

    # Generate synthetic data if insufficient history
    if len(history) < 20:
        base_time = datetime.utcnow() - timedelta(hours=48)
        synthetic = []
        for i in range(1000):
            t = base_time + timedelta(minutes=i * 2.88)
            hour = t.hour + t.minute / 60
            power = 2.0 + 1.5 * math.sin(math.pi * hour / 12) + np.random.normal(0, 0.2)
            synthetic.append(PowerDataPoint(timestamp=t.isoformat(), power=max(0, power)))
        history = synthetic + list(history)

    # Build DataFrame
    df = pd.DataFrame([{"timestamp": h.timestamp, "power": h.power} for h in history])
    df = df.dropna()
    df["power"] = pd.to_numeric(df["power"], errors="coerce")
    df = df.dropna()

    X = extract_features(df["timestamp"])
    y = df["power"].values

    # Train/val split (80/20)
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, shuffle=False)

    # Train both models
    lr = LinearRegression()
    rf = RandomForestRegressor(n_estimators=50, random_state=42, max_depth=6)

    lr.fit(X_train, y_train)
    rf.fit(X_train, y_train)

    lr_pred = lr.predict(X_val)
    rf_pred = rf.predict(X_val)

    lr_mae = mean_absolute_error(y_val, lr_pred)
    rf_mae = mean_absolute_error(y_val, rf_pred)

    # Pick best model by MAE
    if rf_mae <= lr_mae:
        best_model = rf
        model_name = "RandomForest"
        val_pred = rf_pred
    else:
        best_model = lr
        model_name = "LinearRegression"
        val_pred = lr_pred

    mae = mean_absolute_error(y_val, val_pred)
    rmse = math.sqrt(mean_squared_error(y_val, val_pred))
    r2 = r2_score(y_val, val_pred)

    # Generate future timestamps
    last_ts = pd.to_datetime(df["timestamp"].iloc[-1])
    future_timestamps = [last_ts + timedelta(minutes=i * 30) for i in range(1, req.horizon_hours * 2 + 1)]

    future_df = extract_features(pd.Series([t.isoformat() for t in future_timestamps]))
    future_preds = best_model.predict(future_df)
    future_preds = np.maximum(future_preds, 0)  # No negative power

    predictions = [
        PredictionPoint(
            timestamp=ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
            power=round(float(p), 4)
        )
        for ts, p in zip(future_timestamps, future_preds)
    ]

    return PredictionResponse(
        predictions=predictions,
        model_used=model_name,
        metrics=PredictionMetrics(
            mae=round(mae, 6),
            rmse=round(rmse, 6),
            r2=round(r2, 6)
        )
    )

# ─── Load Optimization ────────────────────────────────────────────────────────

@app.post("/optimize-load", response_model=OptimizationResponse)
def optimize_load(req: OptimizationRequest):
    required_reduction = req.current_demand_kw - req.demand_limit_kw

    if required_reduction <= 0:
        return OptimizationResponse(
            feasible=True,
            required_reduction_kw=0.0,
            achievable_reduction_kw=0.0,
            recommended_actions=[],
            remaining_excess_kw=0.0
        )

    # Sort non-critical loads by priority desc (4=lowest priority, shed first)
    shedable = [
        load for load in req.loads
        if not load.critical and load.priority != 1
    ]
    shedable.sort(key=lambda l: (-l.priority, -l.power_kw))  # highest priority # = lowest importance

    actions = []
    achieved_reduction = 0.0

    for load in shedable:
        if achieved_reduction >= required_reduction:
            break
        actions.append(RecommendedAction(
            load_id=load.id,
            action="DISABLE",
            power_kw=load.power_kw,
            priority=load.priority,
            reason=f"Priority {load.priority} load — safe to shed to reduce demand by {load.power_kw:.3f} kW"
        ))
        achieved_reduction += load.power_kw

    remaining = max(0.0, required_reduction - achieved_reduction)
    feasible = remaining < 0.001  # Within 1W tolerance

    return OptimizationResponse(
        feasible=feasible,
        required_reduction_kw=round(required_reduction, 4),
        achievable_reduction_kw=round(achieved_reduction, 4),
        recommended_actions=actions,
        remaining_excess_kw=round(remaining, 4)
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
