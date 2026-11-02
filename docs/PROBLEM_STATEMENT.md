# Smart Factory PLC-Lite Automation Controller
## Step 1: Problem Statement Document
**Prepared for:** HCLTech BTech Embedded Systems & IoT Curriculum  
**Project ID:** P_180  
**Version:** 1.0 | Date: November 2026  

---

### 1. Executive Summary
Traditional programmable logic controllers (PLCs) in industrial manufacturing environments are rigid, proprietary, and cost-prohibitive for small-to-medium enterprise (SME) production floors. Legacy PLCs lack native Internet of Things (IoT) connectivity, modern role-based SCADA visualization, autonomous edge-side safety interlocks, and machine-learning-driven predictive maintenance. This project delivers an open-architecture, low-cost **PLC-Lite Automation Controller** combining modern microcontrollers (ESP32), standard industrial publish-subscribe telemetry (MQTT/HiveMQ), a cloud SCADA web interface, and an autonomous AI anomaly detector to prevent catastrophic mechanical failures and reduce unplanned downtime.

---

### 2. Context & Background
In manufacturing plants (such as automotive assembly, chemical batch processing, and textile fabrication), three core challenges lead to millions of dollars in losses:
1. **Unplanned Downtime:** Bearing wear and motor degradation often remain unnoticed until severe seizure or stator burnout occurs.
2. **Delayed Safety Responses:** Central cloud-dependent control architectures incur network latencies of several seconds, making emergency interlocks unreliable during sudden thermal runaway or mechanical jams.
3. **High Deployment Costs:** Siemens or Allen-Bradley PLCs cost \$3,000–\$15,000 per unit, excluding proprietary licensing for supervisory software.

---

### 3. Problem Definition
> *"How might we architect a low-cost (< ₹3,000 INR), open-standards embedded controller capable of sub-10ms autonomous edge safety execution, high-throughput MQTT telemetry synchronization to a cloud SCADA interface, and real-time machine learning anomaly detection to protect critical production equipment?"*

---

### 4. Target Stakeholders & User Personas
| Stakeholder | Key Pain Point | Expected Solution from PLC-Lite |
|---|---|---|
| **Plant Operator** | Lacks clear real-time visibility into machine vibration, thermal load, and conveyor state. | Low-latency Web SCADA dashboard with single-click manual override controls and clear status indicators. |
| **Maintenance Engineer** | Catches machine faults only after failure happens; reactive rather than predictive. | Continuous vibration RMS monitoring, FFT spectrum analysis, and Isolation Forest ML anomaly alerts. |
| **Factory Administrator / Manager** | High operational energy bills and security compliance risks. | Role-Based Access Control (RBAC), audit logging for every actuator toggle, and automated schedule-based shift power management. |
| **BTech IoT Student / Developer** | Complex hardware setups with closed-source tooling. | Open-source modular firmware in C++/Arduino and MicroPython, PlatformIO compatibility, and standard MQTT contracts. |

---

### 5. Success Metrics & Key Performance Indicators (KPIs)
| Metric | Baseline (Legacy / Target) | PLC-Lite System Achievement |
|---|---|---|
| **Hardware Controller Unit Cost** | ₹25,000 – ₹80,000 (Commercial PLC) | **₹1,660 INR (~$20 USD)** |
| **Edge Interlock Reaction Time** | 2,000 ms – 5,000 ms (Cloud dependent) | **< 15 ms (Autonomous on ESP32)** |
| **Telemetry Publish Latency** | 5 – 10 seconds | **< 250 ms (via HiveMQ MQTT broker)** |
| **Network Resilience** | System hangs on Wi-Fi drop | **Zero-crash watchdog + auto-reconnect + offline buffering** |
| **Data Filter Noise Suppression** | High jitter on raw ADC analog sensors | **10-sample moving average circular buffer filter** |
| **Predictive Anomaly Detection Rate**| 0% (Reactive repair only) | **> 94% precision using Isolation Forest** |

---

### 6. Scope & Constraints
- **In-Scope:**
  - ESP32 hardware firmware (PlatformIO C++ & MicroPython) with sensors (DHT22, ACS712, MQ-135, SW-420).
  - Actuators: 3-channel relay control (Cooling Fan, Conveyor Motor, Solenoid Valve).
  - HiveMQ MQTT communication with QoS 1 and Last Will & Testament (LWT).
  - Express.js / TypeScript REST & WebSocket Backend API with MongoDB persistence.
  - Vite React 19 SCADA operator interface with real-time gauges.
  - Streamlit & Python ML (Isolation Forest) predictive maintenance analytics dashboard.
  - Node-RED visual integration flows.
- **Constraints:**
  - Microcontroller operates on 2.4 GHz 802.11 b/g/n Wi-Fi.
  - High-voltage relay switching limited to 250V AC / 10A resistive load.
