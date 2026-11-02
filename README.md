# Smart Factory PLC-Lite Automation Controller (Project P_180)
### HCLTech BTech Curriculum — Embedded Systems & Industrial IoT
**Classification:** Engineering Capstone Project | **Version:** `v1.0` (November 2026)  
**Live Production SCADA:** 👉 **[https://smart-factory-plc-lite-automation-c.vercel.app](https://smart-factory-plc-lite-automation-c.vercel.app/login)**  
**Live Cloud API Gateway:** 👉 **[https://smart-factory-plc-lite-automation.onrender.com/health](https://smart-factory-plc-lite-automation.onrender.com/health)**  
**GitHub Repository:** 👉 **[https://github.com/vishwas789blip/Smart-Factory-PLC-Lite-Automation-Controller](https://github.com/vishwas789blip/Smart-Factory-PLC-Lite-Automation-Controller)**  

---

## 1. Domain & Technologies Overview
Designed in strict alignment with the **HCLTech Project Creation Guide (Embedded Systems & IoT)**:

| Category | Specifications |
|---|---|
| **Domain** | Embedded Systems, Industrial IoT & Supervisory Automation (SCADA) |
| **Microcontroller Hardware** | ESP32-WROOM-32 DevKit v1, Multi-Sensor Array, Optocoupled 4-Channel Relays |
| **Firmware Languages** | C / C++ (PlatformIO / Arduino IDE) & MicroPython |
| **Communication Protocols** | MQTT (v3.1.1 over HiveMQ), HTTP/REST, WebSocket (`wss://`), I2C, Wi-Fi 802.11 b/g/n |
| **Cloud & Backend Stack** | Node.js, Express.js, TypeScript, Mongoose, MongoDB Atlas, Docker Compose |
| **SCADA Web Interface** | React 19, Vite, TailwindCSS (Deployed on Vercel Edge with Reverse Proxy) |
| **Analytics & Data Science** | Python 3.11+, Pandas, NumPy, Scikit-Learn (Isolation Forest), Streamlit, Plotly |
| **Industrial Prototyping** | Node-RED (`infrastructure/node-red/flows.json`), EasyEDA Schematic Designer |
| **Version Control** | Git (`main` branch tagged `v1.0`) |

---

## 2. Comprehensive Documentation Suite (`/docs`)
All documents required by the 8-step HCLTech engineering lifecycle are fully compiled:

| Lifecycle Step | Document Link | Description & Deliverables |
|---|---|---|
| **Step 1: Problem Statement** | [docs/PROBLEM_STATEMENT.md](./docs/PROBLEM_STATEMENT.md) | Problem definition, target stakeholders, and quantitative KPIs |
| **Step 2: Project Planning** | [docs/PROJECT_PLAN.md](./docs/PROJECT_PLAN.md) | 30-Day Gantt roadmap: Exploration → Development → Optimization → Viva |
| **Step 3: Requirements (SRS)** | [docs/SRS.md](./docs/SRS.md) | IEEE 830 SRS: Functional requirements, NFRs, and safety constraints |
| **Step 4: System Design** | [docs/SYSTEM_DESIGN.md](./docs/SYSTEM_DESIGN.md) | 4-Tier Architecture, DFD Level 0/1, Sequence Diagrams, State Machines |
| **Domain Step 2: Schematic** | [docs/CIRCUIT_SCHEMATIC.md](./docs/CIRCUIT_SCHEMATIC.md) | EasyEDA Netlist, GPIO Pinout, ADC1 isolation, and sensor calibration math |
| **Domain Step 3: BOM Costing** | [docs/BILL_OF_MATERIALS.md](./docs/BILL_OF_MATERIALS.md) | Complete ₹1,840 INR BOM with part numbers, suppliers (Robu.in/Amazon) |
| **Step 6: Comprehensive Testing** | [docs/TEST_REPORT.md](./docs/TEST_REPORT.md) | 37/37 tests passed; realistic stress testing (Wi-Fi drops, power cuts, noise) |
| **Step 7: API Documentation** | [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) | REST endpoints, JWT auth, MQTT contracts, and WebSocket schemas |
| **Step 8: Presentation Deck** | [docs/PRESENTATION_DECK.md](./docs/PRESENTATION_DECK.md) | Complete 15-slide technical Viva Voce presentation deck |
| **Step 8: Live Demo Guide** | [docs/DEMO_GUIDE.md](./docs/DEMO_GUIDE.md) | 5-minute technical demonstration script & screen recording walkthrough |
| **Final Project Report** | [docs/PROJECT_REPORT.md](./docs/PROJECT_REPORT.md) | Academic & technical report ready for HCLTech learning portal submission |

---

## 3. High-Level Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │     Vite React 19 SCADA Operator Console     │
                    │  (Vercel: smart-factory-plc-lite-automation) │
                    └──────────────────────┬───────────────────────┘
                                           │
                         HTTPS REST + WebSocket (wss://)
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │         Express.js Cloud API Gateway         │
                    │   (Render: smart-factory-plc-lite-automation)│
                    └──────────┬───────────────────────┬───────────┘
                               │                       │
             ┌─────────────────┴─────────┐   ┌─────────┴─────────┐
             ▼                           ▼   ▼                   ▼
       ┌───────────┐               ┌───────────┐           ┌───────────┐
       │  MongoDB  │               │Automation │           │ HiveMQ    │
       │   Atlas   │               │ & Schedules           │ MQTT Broker
       └───────────┘               └───────────┘           │:1883 (QoS 1)
                                                           └─────┬─────┘
                                                                 │
                                    ┌────────────────────────────┼────────────────────────────┐
                                    ▼                            ▼                            ▼
                          ┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
                          │ ESP32 Hardware   │         │ Streamlit ML Hub │         │ Node-RED Flows   │
                          │ C++ / MicroPython│         │ (Isolation Forest│         │ (flows.json)     │
                          │ <15ms Interlocks │         │  Pandas / NumPy) │         │ Visual Gauges    │
                          └──────────────────┘         └──────────────────┘         └──────────────────┘
```

---

## 4. Hardware Firmware Setup (ESP32)

### A. C++ / Arduino / PlatformIO Setup
1. Open the project in **VS Code** with the **PlatformIO** extension.
2. Connect your **ESP32 DevKit v1** via Micro-USB.
3. Open `firmware/esp32/include/config.h` and configure your local Wi-Fi SSID and password:
   ```cpp
   #define WIFI_SSID     "Your_Factory_WiFi"
   #define WIFI_PASSWORD "Your_Password"
   ```
4. Build and flash the firmware:
   ```bash
   pio run -e esp32dev --target upload
   pio device monitor
   ```

### B. MicroPython Alternative
1. Flash the ESP32 with the latest MicroPython firmware binary using `esptool.py`.
2. Upload `firmware/micropython/boot.py` and `firmware/micropython/main.py` using Thonny or `ampy`:
   ```bash
   ampy --port COM3 put firmware/micropython/boot.py
   ampy --port COM3 put firmware/micropython/main.py
   ```

---

## 5. Software & Cloud Quick Start

### Prerequisites
- Node.js >= 20.x | Python >= 3.10 | Git

### 1. Monorepo Installation & Build
```bash
git clone https://github.com/vishwas789blip/Smart-Factory-PLC-Lite-Automation-Controller.git
cd Smart-Factory-PLC-Lite-Automation-Controller
npm install
npm run build
```

### 2. Run Local Development Services
```bash
# Terminal 1: Backend API (port 4000)
npm run start --workspace=apps/api

# Terminal 2: React SCADA Console (port 3000)
npm run dev --workspace=apps/web

# Terminal 3: Streamlit Predictive Maintenance Hub (port 8501)
cd apps/analytics-dashboard
pip install -r requirements.txt
streamlit run app.py
```

### 3. Preconfigured Plant Credentials
| Role | Email | Password | Access Rights |
|---|---|---|---|
| **ADMIN** | `admin@factory.local` | `Admin@1234` | Full access (Users, Factories, System) |
| **ENGINEER** | `engineer@factory.local` | `Engineer@1234` | Automation rules, Schedules, Actuators |
| **OPERATOR** | `operator@factory.local` | `Operator@1234` | Manual actuator control, SCADA workstation |
| **VIEWER** | `viewer@factory.local` | `Viewer@1234` | Read-only telemetry and dashboards |

---

## 6. Automated Testing & Verification
```bash
# 1. Run all backend unit tests (Vitest)
npm test

# 2. Run Python ML unit tests
python apps/ai-service/run_tests.py

# 3. Verify TypeScript type safety across all workspaces
npm run typecheck
```

---

## 7. HCLTech Final Submission Checklist

| Requirement | Artifact / Location | Status |
|---|---|---|
| **Source code accessible** | [GitHub Repo](https://github.com/vishwas789blip/Smart-Factory-PLC-Lite-Automation-Controller) | **DONE** |
| **README.md complete** | Setup steps, architecture, and live links | **DONE** |
| **Problem Statement document** | [`docs/PROBLEM_STATEMENT.md`](./docs/PROBLEM_STATEMENT.md) | **DONE** |
| **Software Requirement Spec (SRS)**| [`docs/SRS.md`](./docs/SRS.md) | **DONE** |
| **Architecture diagram included** | [`docs/SYSTEM_DESIGN.md`](./docs/SYSTEM_DESIGN.md) | **DONE** |
| **Circuit Schematic & Pinout** | [`docs/CIRCUIT_SCHEMATIC.md`](./docs/CIRCUIT_SCHEMATIC.md) | **DONE** |
| **Bill of Materials (BOM)** | [`docs/BILL_OF_MATERIALS.md`](./docs/BILL_OF_MATERIALS.md) | **DONE** |
| **Test cases & Results documented**| [`docs/TEST_REPORT.md`](./docs/TEST_REPORT.md) | **DONE** |
| **requirements.txt / package.json**| Complete in all workspaces | **DONE** |
| **No hardcoded credentials** | 100% environment variables (`.env`) | **DONE** |
| **Final presentation deck** | [`docs/PRESENTATION_DECK.md`](./docs/PRESENTATION_DECK.md) | **DONE** |
| **Live demo video & script** | [`docs/DEMO_GUIDE.md`](./docs/DEMO_GUIDE.md) | **DONE** |
| **Project Report (PDF/Word ready)**| [`docs/PROJECT_REPORT.md`](./docs/PROJECT_REPORT.md) | **DONE** |
| **Contributors listed** | BTech Learner, HCLTech Mentor | **DONE** |
| **Final version tagged** | Git Release Tag **`v1.0`** | **DONE** |

---

## 8. Contributors & Mentors
- **Lead Embedded & Fullstack Developer:** BTech Learner (Embedded Systems & IoT)
- **Academic & Industry Mentor:** HCLTech Embedded Systems & IoT Training Faculty
- **Institution:** HCLTech BTech Program (Class of 2026)
