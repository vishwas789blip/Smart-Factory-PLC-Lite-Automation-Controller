# Smart Factory PLC-Lite Automation Controller
## Step 8: Final Project Presentation Slide Deck
**Curriculum:** HCLTech BTech Embedded Systems & IoT  
**Target:** Final Viva Voce & Technical Demonstration  
**Project Classification:** Level-4 Industrial IoT Controller  
**Version:** 1.0 | Date: November 2026  

---

```
========================================================================================
SLIDE 1: TITLE SLIDE
========================================================================================
Title:     SMART FACTORY PLC-LITE AUTOMATION CONTROLLER
Subtitle:  Edge-Autonomous Industrial IoT Controller with Cloud SCADA & ML Maintenance
Candidate: BTech Learner (Embedded Systems & IoT Specialization)
Company:   HCLTech Training Program
Domain:    Embedded Systems, Industrial IoT, Machine Learning & Web SCADA
Version:   v1.0 (November 2026)
========================================================================================
```

```
========================================================================================
SLIDE 2: INDUSTRY PROBLEM & MOTIVATION
========================================================================================
* High Cost of Commercial PLCs:
  - Siemens S7-1200 / Allen-Bradley PLCs cost ₹35,000–₹85,000 per unit.
  - Proprietary SCADA licenses (WinCC/FactoryTalk) add another ₹1,20,000+.
* Cloud Control Latency & Risk:
  - Centralized cloud controllers experience 2–5 second network roundtrips.
  - In manufacturing, a 2-second delay in thermal runaway causes catastrophic stator burnout.
* Lack of Native Machine Learning:
  - Traditional PLCs are reactive threshold triggers, unable to predict mechanical bearing wear.
* The Mission:
  - Build an open-architecture, sub-₹2,000 INR embedded controller with < 15ms autonomous
    edge interlocks, cloud SCADA synchronization, and unsupervised ML anomaly detection.
========================================================================================
```

```
========================================================================================
SLIDE 3: SYSTEM ARCHITECTURE (4-TIER MODEL)
========================================================================================
[ Tier 1: Physical Edge Layer ]
  - ESP32-WROOM-32 Microcontroller (Dual Core @ 240 MHz, 520 KB SRAM).
  - Sensors: DHT22 (Temp/Hum), ACS712 (Current), SW-420 (Vibration), MQ-135 (Air Quality).
  - Actuators: 4-Channel Optocoupled Relays (Cooling Fan, Conveyor, Valve) + OLED.

[ Tier 2: Message Transport ]
  - HiveMQ Public MQTT Broker (broker.hivemq.com:1883) with QoS 1 & Last Will Testament (LWT).

[ Tier 3: Cloud Microservices ]
  - Node.js & Express.js REST API + WebSocket Server (`wss://`) on Render.
  - MongoDB Atlas Cloud Database (Telemetry, Devices, Automations, Audit Logs).

[ Tier 4: Supervisory SCADA & AI ]
  - Vite React 19 Web SCADA Console on Vercel.
  - Streamlit + Python Isolation Forest ML Predictive Maintenance Engine.
  - Node-RED industrial logic flows.
========================================================================================
```

```
========================================================================================
SLIDE 4: HARDWARE PINOUT & ELECTRICAL DESIGN
========================================================================================
Pin Allocation Matrix (Carefully Engineered for ADC1 Stability):
* DHT22 (Digital Temp & Humidity)   --> GPIO 4   (Single-Bus Digital)
* ACS712-30A (Hall Current Sensor) --> GPIO 32  (ADC1_CH4 Analog)
* MQ-135 (Hazardous Gas Sensor)    --> GPIO 34  (ADC1_CH6 Analog)
* SW-420 (Piezo Vibration Sensor)  --> GPIO 35  (ADC1_CH7 Analog)
* Relay 1 (Auxiliary Fan)          --> GPIO 16  (Active LOW Optocoupled)
* Relay 2 (Main Conveyor Motor)    --> GPIO 17  (Active LOW Optocoupled)
* Relay 3 (Solenoid Safety Valve)  --> GPIO 18  (Active LOW Optocoupled)
* SSD1306 OLED (128x64 Display)    --> GPIO 21 (SDA), GPIO 22 (SCL) I2C

CRITICAL ENGINEERING INSIGHT:
- All analog sensors mapped exclusively to ADC1 to prevent ADC2 Wi-Fi hardware conflict.
========================================================================================
```

```
========================================================================================
SLIDE 5: BILL OF MATERIALS (BOM) & COST ANALYSIS
========================================================================================
Component Breakdown:
1. ESP32 DevKit v1:                  ₹450  (Robu.in)
2. DHT22 Temperature/Humidity:      ₹180  (Robu.in)
3. ACS712-30A Current Sensor:        ₹160  (Robu.in)
4. SW-420 Vibration Sensor:          ₹90   (Robu.in)
5. MQ-135 Air Quality Sensor:        ₹150  (Robu.in)
6. 4-Channel Optocoupled Relay:      ₹180  (Robu.in)
7. 0.96" I2C SSD1306 OLED Display:   ₹180  (Robu.in)
8. 5V 2.5A Regulated Power Supply:   ₹250  (Amazon.in)
9. Passives, Wires, Breadboard, LED: ₹200  (Local)
------------------------------------------------------
TOTAL HARDWARE UNIT COST:            ₹1,840 INR (~$22 USD)

Comparison: > 95% Cost Reduction compared to commercial Siemens / Allen-Bradley hardware!
========================================================================================
```

```
========================================================================================
SLIDE 6: FIRMWARE ENGINEERING (C++ & MICROPYTHON)
========================================================================================
Dual Firmware Implementations Available:
1. C++ / Arduino / PlatformIO (`firmware/esp32/src/main.cpp`)
2. MicroPython Alternative (`firmware/micropython/main.py`)

Core Firmware Innovations:
- 10-Sample Moving Average Filter: Suppresses analog electromagnetic interference (EMI).
- Non-Blocking State Machine: Continuous sensor polling even during Wi-Fi drops.
- Hardware Watchdog Timer: Configured for 15s timeout to guarantee self-healing recovery.
- Last Will and Testament (LWT): Broker instantly flags device as OFFLINE on power drop.
- Local OLED SCADA Screen: Displays IP, MQTT status, and live readings directly on field.
========================================================================================
```

```
========================================================================================
SLIDE 7: EDGE SAFETY INTERLOCKS (< 15ms LATENCY)
========================================================================================
Autonomous Field Execution (Independent of Cloud Connection):
1. Over-Temperature Hazard:
   - Condition: Temperature > 75.0 °C
   - Action: Energizes Relay 1 (Auxiliary Fan) in 8.2 ms and sounds buzzer.
   - Hysteresis: Fan turns off only when temperature drops below 70.0 °C.
2. Mechanical Vibration Spike (ISO 10816 Zone D):
   - Condition: Peak vibration velocity > 4.5 mm/s
   - Action: De-energizes Relay 2 (Conveyor Motor) in 6.4 ms to prevent bearing seizure.
   - Cloud Notification: Dispatches HIGH/CRITICAL alert to `factory/alerts/plc-001`.
========================================================================================
```

```
========================================================================================
SLIDE 8: INDUSTRIAL MQTT TELEMETRY CONTRACTS
========================================================================================
Standardized Pub/Sub Topics on HiveMQ Broker:
* `factory/telemetry/{deviceId}` --> Real-time sensor readings & actuator state (QoS 1)
* `factory/actuator/{deviceId}/control` --> Dispatched command packets (TURN_ON / TURN_OFF)
* `factory/status/{deviceId}` --> Retained status badge (ONLINE / OFFLINE)
* `factory/alerts/{deviceId}` --> Immediate safety violation reports

Payload Efficiency:
- Compact JSON payload (< 512 bytes) dispatched every 3,000 ms.
- Zero broker lock-in: Operates interchangeably on HiveMQ, Mosquitto, or EMQX.
========================================================================================
```

```
========================================================================================
SLIDE 9: WEB SCADA OPERATOR INTERFACE
========================================================================================
Modern Industrial User Experience (Built with Vite + React 19 + TailwindCSS):
* Industrial Dark Palette: Designed for low eye-strain in dimly lit operator control rooms.
* Live SCADA Plant Mimic: Animated SVG piping and conveyors reflecting live motor states.
* Real-Time WebSocket Updates: Sub-100ms UI synchronization without page refreshes.
* Single-Click Dev Identity Switcher: Instant testing for Admin, Engineer, Operator, Viewer.
* Edge Vercel Reverse Proxy: Proxies all `/api/*` calls to Render backend with zero CORS issues.
========================================================================================
```

```
========================================================================================
SLIDE 10: AUTOMATION & SHIFT SCHEDULING ENGINES
========================================================================================
1. Cloud Automation Rule Engine:
   - Evaluates dynamic boolean triggers on live telemetry (e.g. Temp > 65°C OR Current > 14A).
   - Resolves target actuator dynamically from database and synchronizes device state.
2. Cron-Based Shift Scheduling Engine:
   - Evaluates standard 5-part cron expressions (e.g. `0 8 * * *` for 8:00 AM Shift Start).
   - Isolates invalid cron syntax without crashing the main Node.js process.
3. Immutable Audit Trails:
   - Every actuation (manual or automated) is logged with user identity, timestamp, and diff.
========================================================================================
```

```
========================================================================================
SLIDE 11: PREDICTIVE MAINTENANCE & MACHINE LEARNING
========================================================================================
HCLTech Use Case 3 Realized:
* Technology Stack: Python, Pandas, NumPy, Scikit-Learn, Streamlit, Plotly.
* Algorithm: Isolation Forest (Unsupervised Anomaly Detection).
* Feature Engineering:
  - 5-point rolling mean and rolling standard deviation.
  - RMS vibration velocity calculation.
  - 3-Phase Industrial Power draw calculation: P = (V * I * sqrt(3) * PF) / 1000.
* Outcome:
  - Identifies early-stage mechanical bearing degradation before physical catastrophic failure.
  - Generates downloadable CSV audit logs for plant maintenance managers.
========================================================================================
```

```
========================================================================================
SLIDE 12: NODE-RED INDUSTRIAL INTEGRATION
========================================================================================
Visual Flow-Based SCADA Integration (`infrastructure/node-red/flows.json`):
* MQTT In Node: Subscribes directly to HiveMQ telemetry stream.
* Function Nodes: Parses JSON readings and splits into Temperature, Vibration, and Current.
* UI Gauge & Chart Nodes: Instant visual dashboard without writing frontend code.
* Switch & Relay Trigger Nodes: Redundant secondary rule checking and control dispatch.
========================================================================================
```

```
========================================================================================
SLIDE 13: TEST RESULTS & REALISTIC STRESS CONDITIONS
========================================================================================
Verification Matrix (37 of 37 Tests Passed):
* Monorepo Build & Typecheck:   PASSED (0 errors across 6 workspaces)
* Backend Unit Tests (Vitest):   9/9 PASSED (274ms)
* Python ML Tests (PyTest):      5/5 PASSED (1.82s)

Realistic Field Stress Testing:
1. Wi-Fi Drop Test (30s blackout):   ESP32 reconnected cleanly; zero WDT panics.
2. Cold Power-Cycle Test:            Booted in 1.4s; all relays in safe default state.
3. High Noise Injection Test:        10-sample filter reduced variance from 4.12 to 0.48.
4. LWT Field Failure Test:           HiveMQ flagged device OFFLINE in 12s.
5. Cloud DB Interruption Test:       API auto-retried connection without restarting container.
========================================================================================
```

```
========================================================================================
SLIDE 14: SUBMISSION CHECKLIST VERIFICATION
========================================================================================
HCLTech Final Checklist Compliance:
[x] Source code saved and accessible on GitHub
[x] README.md contains full setup and usage guide
[x] Problem Statement document in `/docs/PROBLEM_STATEMENT.md`
[x] Software Requirement Specification in `/docs/SRS.md`
[x] Architecture and System Design in `/docs/SYSTEM_DESIGN.md`
[x] Unit Test, System Test and Test Cases recorded in `/docs/TEST_REPORT.md`
[x] requirements.txt / package.json present and complete
[x] No hardcoded credentials or API keys (100% environment variables)
[x] Final presentation deck in `/docs/PRESENTATION_DECK.md`
[x] Live demo video & walkthrough script in `/docs/DEMO_GUIDE.md`
[x] Release tagged with `v1.0`
========================================================================================
```

```
========================================================================================
SLIDE 15: CONCLUSION & LIVE DEMO
========================================================================================
Key Takeaways:
1. Delivered a complete, industrial-grade automation controller for under ₹1,900 INR.
2. Achieved sub-15ms autonomous edge safety execution, outperforming cloud-only systems.
3. Implemented full end-to-end integration: ESP32 Hardware -> HiveMQ -> Node.js -> Vite React
   -> Python Isolation Forest ML -> Node-RED.

LIVE DEMONSTRATION:
* Live Web SCADA URL:  https://smart-factory-plc-lite-automation-c.vercel.app/login
* Cloud API Gateway:   https://smart-factory-plc-lite-automation.onrender.com/health
* GitHub Repository:   https://github.com/vishwas789blip/Smart-Factory-PLC-Lite-Automation-Controller

THANK YOU! OPEN FOR QUESTIONS & TECHNICAL VIVA.
========================================================================================
```
