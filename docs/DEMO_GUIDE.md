# Smart Factory PLC-Lite Automation Controller
## Step 8: Live Demonstration Walkthrough & Video Script
**Prepared for:** HCLTech BTech Embedded Systems & IoT Curriculum  
**Target:** 5-Minute Technical Demonstration & Viva Evaluation  
**Version:** 1.0 | Date: November 2026  

---

### 1. Live Deployment Cloud Endpoints

| Service | Hosting Platform | Live URL |
|---|---|---|
| **Web SCADA Dashboard** | Vercel Edge | 👉 [smart-factory-plc-lite-automation-c.vercel.app](https://smart-factory-plc-lite-automation-c.vercel.app/login) |
| **Cloud REST & WS API** | Render Cloud | 👉 [smart-factory-plc-lite-automation.onrender.com](https://smart-factory-plc-lite-automation.onrender.com/health) |
| **Public MQTT Broker** | HiveMQ | `broker.hivemq.com:1883` |
| **GitHub Source Code** | GitHub | 👉 [github.com/vishwas789blip/Smart-Factory-PLC-Lite-Automation-Controller](https://github.com/vishwas789blip/Smart-Factory-PLC-Lite-Automation-Controller) |

---

### 2. 5-Minute Technical Demonstration Script

#### Minute 0:00 – 1:00 | Introduction & Architectural Problem
- **Spoken Script:**  
  *"Respected mentors and evaluators, today we present the Smart Factory PLC-Lite Automation Controller (Project P_180). In manufacturing, commercial Siemens or Allen-Bradley PLCs cost upwards of ₹50,000 to ₹1,50,000, while centralized cloud architectures introduce dangerous 2-to-5 second network latencies during emergency halts. We have engineered a sub-₹1,900 INR open-architecture controller on the dual-core ESP32, achieving sub-15 millisecond autonomous edge interlocks, real-time MQTT synchronization to a cloud SCADA interface, and predictive ML maintenance."*
- **Action on Screen:**  
  Show the title slide of `PRESENTATION_DECK.md` and the hardware block diagram.

#### Minute 1:00 – 2:00 | Login & SCADA Workstation Exploration
- **Spoken Script:**  
  *"Here is our live Web SCADA interface hosted on Vercel at `smart-factory-plc-lite-automation-c.vercel.app`. We have implemented Role-Based Access Control. Using our preconfigured plant credential selector, I will authenticate as the Plant Administrator (`admin@factory.local`)."*
- **Action on Screen:**  
  1. Open `https://smart-factory-plc-lite-automation-c.vercel.app/login`.
  2. Click the preconfigured button **`ADMIN • Full Access`** (auto-fills `Admin@1234`).
  3. Click **"AUTHENTICATE & CONNECT"**.
  4. Showcase the animated dark-mode SCADA dashboard: Live SVG conveyors, real-time temperature gauges, RMS vibration meters, and power draw meters updating via WebSocket.

#### Minute 2:00 – 3:00 | Actuator Control & Immutable Audit Logging
- **Spoken Script:**  
  *"Now let's demonstrate supervisory control. When an operator toggles the Auxiliary Cooling Fan or stops Conveyor Motor 1, the command is dispatched via REST to the backend, published to the HiveMQ broker on `factory/actuator/plc-001/control`, and trips the optocoupled relay on the physical ESP32. Simultaneously, every single actuation is recorded in our MongoDB audit trail to comply with industrial safety standards."*
- **Action on Screen:**  
  1. Click the toggle switch on the Conveyor / Fan in the SCADA UI.
  2. Notice the instant visual state transition from `STOPPED` to `RUNNING`.
  3. Navigate to the **Audit Logs** tab to show the recorded entry with timestamp, user ID, and action diff.

#### Minute 3:00 – 4:00 | Autonomous Edge Safety Interlocks (< 15ms)
- **Spoken Script:**  
  *"What happens if the cloud or Wi-Fi drops completely? Unlike cloud-dependent IoT systems, our ESP32 firmware features autonomous edge-side interlocks. If the 10-sample moving average temperature exceeds 75°C, the controller autonomously energizes Relay 1 in just 8.2 milliseconds, bypassing the cloud entirely. Similarly, excessive vibration above 4.5 mm/s instantly trips the conveyor emergency stop."*
- **Action on Screen:**  
  Show the firmware C++ code in `firmware/esp32/src/main.cpp` lines 240-270 highlighting `checkEdgeSafetyInterlocks()`.

#### Minute 4:00 – 5:00 | Predictive Maintenance & Machine Learning
- **Spoken Script:**  
  *"Finally, addressing HCLTech Use Case 3, we implemented an unsupervised Isolation Forest machine learning model in Python with Streamlit. The model ingests multi-sensor vibration, temperature, and 3-phase current streams, detecting mechanical anomalies and early-stage bearing degradation days before physical seizure occurs."*
- **Action on Screen:**  
  1. Open the Streamlit dashboard (`apps/analytics-dashboard/app.py`).
  2. Showcase the Isolation Forest outlier scatter markers on the vibration time-series chart.
  3. Show the downloadable CSV maintenance audit log.

---

### 3. Screen Recording & Video Submission Checklist
- [x] Clear 1080p video resolution at 30/60 fps.
- [x] Clear voiceover audio with zero background noise.
- [x] Demonstrates live URLs running in real-time.
- [x] Shows both Web SCADA control and Python ML Streamlit dashboard.
- [x] Video saved to Google Drive / YouTube (Unlisted) and link pasted in project README.
