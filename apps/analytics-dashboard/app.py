"""
Smart Factory PLC-Lite — Predictive Maintenance & Telemetry Analytics
HCLTech Embedded Systems & IoT Curriculum Project (Use Case 3)
Built with Streamlit, Pandas, NumPy, Scikit-Learn (Isolation Forest), and Plotly.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from sklearn.ensemble import IsolationForest
import datetime
import requests
import json

st.set_page_config(
    page_title="Smart Factory | Predictive Maintenance Analytics",
    page_icon="🏭",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.title("🏭 Smart Factory PLC-Lite — Predictive Maintenance Hub")
st.caption("Embedded Systems & IoT Engineering • HCLTech BTech Curriculum • ML Anomaly Engine")

# Sidebar
st.sidebar.header("Configuration & Connectivity")
api_url = st.sidebar.text_input("API Gateway URL", "https://smart-factory-plc-lite-automation.onrender.com")
selected_device = st.sidebar.selectbox("Monitored Edge Controller", ["plc-001 (Conveyor Line)", "plc-002 (HVAC)", "plc-003 (Packaging)"])
contamination_rate = st.sidebar.slider("ML Contamination (Anomaly Ratio)", 0.01, 0.20, 0.05, 0.01)

# Synthetic/Seeded Dataset Generator if API offline
@st.cache_data(ttl=30)
def load_telemetry_data(device_id: str):
    try:
        res = requests.get(f"{api_url}/api/telemetry?limit=200", timeout=4)
        if res.status_code == 200 and len(res.json()) > 0:
            df = pd.DataFrame(res.json())
            return df
    except Exception:
        pass

    # High-fidelity realistic industrial fallback dataset
    np.random.seed(42)
    timestamps = [datetime.datetime.now() - datetime.timedelta(minutes=5 * i) for i in range(120)]
    timestamps.reverse()

    base_temp = 58.0 + np.random.normal(0, 2.5, 120)
    base_vibe = 1.8 + np.random.normal(0, 0.4, 120)
    base_curr = 8.5 + np.random.normal(0, 0.8, 120)
    base_pressure = 4.2 + np.random.normal(0, 0.2, 120)

    # Inject realistic mechanical bearing wear anomalies
    anomaly_indices = [35, 72, 73, 105, 106, 107]
    for idx in anomaly_indices:
        base_vibe[idx] += 3.8  # Spike in vibration
        base_temp[idx] += 18.5 # Overheating
        base_curr[idx] += 6.2  # Motor strain

    df = pd.DataFrame({
        "timestamp": timestamps,
        "temperature": base_temp,
        "vibration": base_vibe,
        "current": base_curr,
        "pressure": base_pressure,
        "deviceId": device_id
    })
    return df

df = load_telemetry_data(selected_device.split()[0])

# Feature Engineering with Pandas & NumPy
df["vibe_rolling_avg"] = df["vibration"].rolling(window=5, min_periods=1).mean()
df["temp_rolling_avg"] = df["temperature"].rolling(window=5, min_periods=1).mean()
df["power_kw"] = (df["current"] * 415 * 1.732 * 0.85) / 1000.0  # 3-phase industrial power

# Train Isolation Forest for Unsupervised Anomaly Detection
features = df[["temperature", "vibration", "current"]].fillna(0)
iso_forest = IsolationForest(contamination=contamination_rate, random_state=42)
df["anomaly_label"] = iso_forest.fit_predict(features)
df["anomaly_score"] = iso_forest.decision_function(features)
df["is_anomaly"] = df["anomaly_label"] == -1

# Top KPI Metric Cards
col1, col2, col3, col4 = st.columns(4)
latest = df.iloc[-1]

with col1:
    st.metric("Avg Temperature", f"{latest['temperature']:.1f} °C", 
              f"{latest['temperature'] - df['temperature'].mean():.1f} °C vs mean")
with col2:
    st.metric("RMS Vibration", f"{latest['vibration']:.2f} mm/s", 
              f"{latest['vibration'] - df['vibration'].mean():.2f} mm/s", delta_color="inverse")
with col3:
    st.metric("Instant Power", f"{latest['power_kw']:.2f} kW", 
              f"{latest['current']:.1f} A line load")
with col4:
    anomaly_count = int(df["is_anomaly"].sum())
    st.metric("Detected Anomalies", f"{anomaly_count} events", 
              "Critical Inspection Needed" if anomaly_count > 0 else "Normal Nominal", delta_color="inverse")

# Main Charts
st.subheader("📈 Machine Vibration & Mechanical Anomaly Spectrum")
fig_vibe = go.Figure()
fig_vibe.add_trace(go.Scatter(
    x=df["timestamp"], y=df["vibration"],
    mode="lines", name="Raw Vibration (mm/s)", line=dict(color="#38BDF8", width=1.5)
))
fig_vibe.add_trace(go.Scatter(
    x=df["timestamp"], y=df["vibe_rolling_avg"],
    mode="lines", name="Moving Average (5-pt)", line=dict(color="#F59E0B", width=2, dash="dot")
))

# Highlight anomalies
anomalies = df[df["is_anomaly"]]
fig_vibe.add_trace(go.Scatter(
    x=anomalies["timestamp"], y=anomalies["vibration"],
    mode="markers", name="Isolation Forest Outlier",
    marker=dict(color="#EF4444", size=10, symbol="x")
))

# Threshold line
fig_vibe.add_hline(y=4.5, line_dash="dash", line_color="#EF4444", annotation_text="ISO 10816 Alarm Limit (4.5 mm/s)")
fig_vibe.update_layout(template="plotly_dark", height=380, margin=dict(l=20, r=20, t=30, b=20))
st.plotly_chart(fig_vibe, use_container_width=True)

# Temperature vs Power Correlation
col_a, col_b = st.columns(2)

with col_a:
    st.subheader("🌡️ Thermal Dissipation Profile")
    fig_temp = px.line(df, x="timestamp", y="temperature", title="Winding Temperature Profile (°C)", template="plotly_dark")
    fig_temp.add_hline(y=75.0, line_dash="dash", line_color="#EF4444", annotation_text="Emergency Interlock (75°C)")
    st.plotly_chart(fig_temp, use_container_width=True)

with col_b:
    st.subheader("⚡ 3-Phase Industrial Power Consumption")
    fig_power = px.area(df, x="timestamp", y="power_kw", title="Calculated Power Draw (kW)", template="plotly_dark", color_discrete_sequence=["#10B981"])
    st.plotly_chart(fig_power, use_container_width=True)

# Anomaly Audit Log Table
st.subheader("📋 Machine Maintenance Audit Log (Ranked Outliers)")
if len(anomalies) > 0:
    st.dataframe(
        anomalies[["timestamp", "temperature", "vibration", "current", "power_kw", "anomaly_score"]]
        .sort_values(by="anomaly_score")
        .rename(columns={
            "timestamp": "Timestamp",
            "temperature": "Temp (°C)",
            "vibration": "Vibe (mm/s)",
            "current": "Current (A)",
            "power_kw": "Power (kW)",
            "anomaly_score": "Confidence Outlier Distance"
        }),
        use_container_width=True
    )
else:
    st.success("✅ No operational anomalies detected. Machine running within ISO nominal envelope.")

# Download CSV Export
st.download_button(
    label="📥 Download Telemetry & Anomaly Dataset (CSV)",
    data=df.to_csv(index=False).encode('utf-8'),
    file_name=f"smart_factory_telemetry_{datetime.date.today()}.csv",
    mime="text/csv"
)
