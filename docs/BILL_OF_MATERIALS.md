# Smart Factory PLC-Lite Automation Controller
## Step 3 & Section 5: Bill of Materials (BOM)
**Prepared for:** HCLTech BTech Embedded Systems & IoT Curriculum  
**Classification:** Engineering Specification Document  
**Target Unit Budget:** < ₹2,000 INR  
**Version:** 1.0 | Date: November 2026  

---

### 1. Bill of Materials (BOM) Cost Breakdown

| S.No | Component / Module | Part Number / Model | Qty | Unit Cost (INR) | Total Cost (INR) | Primary Supplier | Alternative Supplier |
|---|---|---|---|---|---|---|---|
| **1** | ESP32 DevKit v1 (30-pin NodeMCU) | ESP-WROOM-32 | 1 | ₹450 | ₹450 | Robu.in | Amazon.in |
| **2** | Digital Temperature & Humidity Sensor | DHT22 / AM2302 | 1 | ₹180 | ₹180 | Robu.in | ElectronicsComp |
| **3** | Hall-Effect AC/DC Current Sensor (30A) | ACS712-30A | 1 | ₹160 | ₹160 | Robu.in | Amazon.in |
| **4** | Industrial Vibration / Tilt Sensor | SW-420 Piezo Module | 1 | ₹90 | ₹90 | Robu.in | Local Electronics |
| **5** | Hazardous Gas & Air Quality Sensor | MQ-135 Gas Module | 1 | ₹150 | ₹150 | Robu.in | Amazon.in |
| **6** | 4-Channel Optocoupled 5V Relay Board | Songle SRD-05VDC-SL-C | 1 | ₹180 | ₹180 | Robu.in | Amazon.in |
| **7** | 0.96" Monochrome I2C OLED Display | SSD1306 (128x64 Blue) | 1 | ₹180 | ₹180 | Robu.in | Robocraze |
| **8** | 5V 2.5A Regulated DC Power Adapter | 5V-2.5A Micro-USB / Jack | 1 | ₹250 | ₹250 | Amazon.in | Local Market |
| **9** | 5V Active Piezo Alarm Buzzer | SFM-27 Continuous | 1 | ₹20 | ₹20 | Local | Robu.in |
| **10**| Jumper Wires (M-to-M, M-to-F, F-to-F) | 40-pin Ribbon Cable | 1 set| ₹80 | ₹80 | Robu.in | Amazon.in |
| **11**| Resistor Pack (4.7kΩ, 1kΩ, 2kΩ) & Diodes | 1/4W Metal Film | 1 set| ₹30 | ₹30 | Local | ElectronicsComp |
| **12**| Half-Size Solderless Breadboard / PCB | MB-102 400 Points | 1 | ₹70 | ₹70 | Robu.in | Local |
|---|---|---|---|---|---|---|---|
| **TOTAL** | **Complete PLC-Lite Hardware Unit** | — | — | — | **₹1,840 INR** | — | *(Budget Compliant)* |

---

### 2. Commercial PLC vs PLC-Lite Cost Comparison

| Criterion | Siemens SIMATIC S7-1200 / S7-1500 | Allen-Bradley Micro850 | **PLC-Lite (Our Solution)** | Cost Savings |
|---|---|---|---|---|
| **Base Hardware Unit Cost** | ₹35,000 – ₹75,000 | ₹42,000 – ₹85,000 | **₹1,840 INR (~$22 USD)** | **> 95% Lower** |
| **SCADA Software Licensing** | ₹1,20,000 (WinCC License) | ₹95,000 (FactoryTalk) | **₹0 (Open Source Vite/React)** | **100% Free** |
| **Cloud MQTT Native Broker** | Requires ₹45,000 CP module | Requires proprietary gateway| **Native Wi-Fi & HiveMQ on-chip**| **Native Built-in**|
| **AI / ML Anomaly Detection** | External IPC server (\$2,500+) | Cloud subscription add-on | **Python Isolation Forest included**| **Zero Extra Cost**|
| **Total Deployment Cost (Unit)**| **₹1,55,000+ INR** | **₹1,37,000+ INR** | **₹1,840 INR** | **Revolutionary** |

---

### 3. Sourcing & Procurement Instructions for Learners
1. **Microcontroller:** Choose the **30-pin ESP32 DevKit v1** with the CP2102 or CH340 USB-UART chip. Both are fully compatible with PlatformIO and Arduino IDE.
2. **Relays:** Ensure the relay board has optocoupler isolation (PC817 chips clearly visible) so high-voltage surges do not couple into the ESP32 logic ground.
3. **Power Supply:** Do not power the 4 relays directly from the ESP32 3.3V pin. Use a dedicated 5V rail from the external adapter to avoid brownout resets.
