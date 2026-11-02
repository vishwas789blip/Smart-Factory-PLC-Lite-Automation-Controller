# Smart Factory PLC-Lite Automation Controller
## Step 4: System Design Document
**Prepared for:** HCLTech BTech Embedded Systems & IoT Curriculum  
**Version:** 1.0 | Date: November 2026  

---

### 1. High-Level Architecture Overview
The PLC-Lite ecosystem adopts a modern 4-tier distributed industrial architecture:
1. **Edge Physical & Controller Tier:** ESP32 hardware, industrial sensors, relay actuators, and local moving-average signal conditioning.
2. **Message Broker Transport Tier:** HiveMQ MQTT Broker providing low-overhead publish-subscribe telemetry with QoS 1 and LWT.
3. **Enterprise Backend & Automation Tier:** Node.js / Express microservice cluster with Mongoose, MongoDB Atlas persistence, and WebSocket push service.
4. **Supervisory Presentation & Intelligence Tier:** Vite React 19 Operator SCADA Console, Node-RED visual flows, and Streamlit Python ML Predictive Maintenance engine.

```mermaid
graph TB
    subgraph "Tier 1: Physical Edge Layer (ESP32)"
        DHT[DHT22 Temp & Humidity] -->|GPIO 4| ESP[ESP32 Edge Microcontroller]
        ACS[ACS712 Motor Current] -->|ADC1 GPIO 32| ESP
        SW[SW-420 Vibration] -->|ADC1 GPIO 35| ESP
        MQ[MQ-135 Gas Quality] -->|ADC1 GPIO 34| ESP
        ESP -->|Active LOW GPIO 16| RELAY_FAN[Cooling Fan Relay]
        ESP -->|Active LOW GPIO 17| RELAY_CONV[Conveyor Motor Relay]
        ESP -->|Active LOW GPIO 18| RELAY_VALVE[Solenoid Valve Relay]
        ESP -->|I2C 0x3C| OLED[0.96 inch SSD1306 OLED]
    end

    subgraph "Tier 2: Transport & Message Broker"
        BROKER[HiveMQ MQTT Broker :1883]
        ESP <-->|factory/telemetry/#<br/>factory/actuator/#<br/>factory/status/#| BROKER
    end

    subgraph "Tier 3: Cloud & Backend Core"
        API[Express.js Node API Server]
        WSS[WebSocket Push Server]
        CRON[Node-Schedule Cron Engine]
        RULES[Rule Engine Evaluator]
        DB[(MongoDB Database)]

        BROKER <-->|MQTT Bridge| API
        API --> RULES
        API --> CRON
        RULES --> DB
        API --> DB
        API --> WSS
    end

    subgraph "Tier 4: SCADA & Analytics Presentation"
        WEB[Vite React SCADA Dashboard]
        ML[Python Streamlit Isolation Forest ML]
        NODERED[Node-RED Industrial Flow]

        WSS -->|wss:// JSON Events| WEB
        API <-->|RESTful HTTP| WEB
        BROKER -->|MQTT In| ML
        BROKER <-->|MQTT In/Out| NODERED
    end
```

---

### 2. Module Boundaries & Responsibilities

| Module | Primary Technology | Core Responsibilities |
|---|---|---|
| **ESP32 Firmware** | C++ / PlatformIO & MicroPython | Hardware ADC sampling, 10-point moving average noise filtering, sub-15ms autonomous edge interlocks, HiveMQ MQTT telemetry publisher. |
| **MQTT Broker** | HiveMQ (`broker.hivemq.com:1883`) | High-throughput pub/sub routing, QoS 1 delivery, Last-Will-and-Testament (LWT) retained status broadcasting. |
| **API Gateway** | Express.js / TypeScript | RESTful CRUD APIs, JWT authentication, Mongoose ORM models, rate limiting, and audit trail persistence. |
| **Automation Engine** | Node.js / `automationService.ts` | Evaluates cloud-level if-then automation rules on incoming telemetry streams and dispatches actuator actions. |
| **Schedule Engine** | `node-schedule` / Cron | Executes time-based shift triggers (Shift Start, Shift End, Eco Night Mode) with cron syntax validation. |
| **SCADA Web App** | React 19, Vite, TailwindCSS | Industrial dark-mode workstation dashboard, animated SVG plant schematics, real-time gauges, and manual actuator overrides. |
| **ML Predictive Engine**| Python, Pandas, NumPy, Scikit-Learn | Isolation forest anomaly detection, vibration FFT analysis, power consumption calculations, and maintenance report generation. |
| **Node-RED Flows** | Node-RED Runtime | Visual drag-and-drop dashboard for rapid industrial SCADA prototyping and alert routing. |

---

### 3. Data Flow Diagrams (DFD)

#### 3.1 DFD Level 0 — Context Diagram
```mermaid
flowchart LR
    Sensors[(Factory Sensors)] -->|Physical Analog/Digital| Controller(PLC-Lite Controller)
    Controller -->|Physical Relay Drive| Actuators[(Plant Actuators)]
    Controller <-->|MQTT Telemetry & Commands| CloudSystem(Smart Factory SCADA Cloud)
    CloudSystem <-->|HTTPS & WSS| Operator([Plant Operator / Engineer])
```

#### 3.2 DFD Level 1 — Detailed Data Transformation Flow
```mermaid
flowchart TD
    A[Raw ADC Samples] --> B[10-Sample Moving Avg Filter]
    B --> C{Edge Safety Check}
    C -->|Temp > 75°C| D[Trip Fan Relay Immediately < 15ms]
    C -->|Vibe > 4.5 mm/s| E[Trip Conveyor Emergency Stop]
    C -->|Normal Operating Envelope| F[Serialize JSON Telemetry Packet]
    F --> G[Publish to HiveMQ MQTT Broker]
    G --> H[Backend MQTT Service]
    H --> I[Store in MongoDB Collections]
    H --> J[Evaluate Cloud Automation Rules]
    H --> K[Broadcast to WebSCADA via WebSocket]
    K --> L[Render Gauges & Alerts on React UI]
```

---

### 4. Sequence Diagrams

#### 4.1 Sequence: Autonomous Edge Over-Temperature Interlock
```mermaid
sequenceDiagram
    autonumber
    participant S as DHT22 Sensor
    participant E as ESP32 Edge Core
    participant R as Fan Relay (GPIO 16)
    participant B as HiveMQ MQTT Broker
    participant U as React SCADA UI

    loop Every 3000 ms
        S->>E: Sample Raw Temperature (e.g. 78.4 °C)
        E->>E: Compute 10-Point Moving Average (76.8 °C)
        alt Filtered Temp > 75.0 °C (Interlock Triggered)
            E->>R: Drive Pin 16 LOW (Relay Energized < 10ms)
            Note over R: Auxiliary Cooling Fan Starts Immediately
            E->>B: Publish Alert (Severity: HIGH, Type: OVER_TEMP)
            B->>U: Forward Alert over WebSocket
            U->>U: Display Audio/Visual Alarm Banner
        end
        E->>B: Publish Regular Telemetry JSON
        B->>U: Update Temperature Gauge
    end
```

#### 4.2 Sequence: Cloud Operator Actuator Command Override
```mermaid
sequenceDiagram
    autonumber
    actor O as Shopfloor Operator
    participant W as React SCADA Dashboard
    participant A as Express.js Backend API
    participant D as MongoDB Database
    participant M as HiveMQ MQTT Broker
    participant E as ESP32 Controller
    participant R as Conveyor Motor Relay

    O->>W: Click "Toggle Conveyor" Button
    W->>A: POST /api/actuators/:id/command { command: "START" }
    A->>A: Verify JWT Token & OPERATOR Role
    A->>D: Insert AuditLog (userId, deviceId, action: START)
    A->>M: Publish JSON to factory/actuator/plc-001/control
    M->>E: Dispatch Command Payload
    E->>R: Drive GPIO 17 LOW (Motor Relay Engaged)
    E->>M: Publish Status Update (conveyor: RUNNING)
    M->>A: Receive Confirmation
    A->>W: WebSocket Broadcast Actuator State (RUNNING)
    W->>O: Green Indicator Glows on Dashboard
```

---

### 5. Controller State Machine Diagram
The ESP32 firmware operates as a deterministic, non-blocking finite state machine:

```mermaid
stateDiagram-v2
    [*] --> BOOT_INIT: Power On / Hardware Reset
    BOOT_INIT --> WIFI_CONNECTING: Setup GPIO, WDT & OLED
    
    WIFI_CONNECTING --> WIFI_CONNECTED: Wi-Fi Associated (IP Assigned)
    WIFI_CONNECTING --> RUN_AUTONOMOUS_LOCAL: Connection Timeout (> 8s)
    
    WIFI_CONNECTED --> MQTT_CONNECTING: Init MQTT Client
    MQTT_CONNECTING --> NORMAL_OPERATION: Connected & Subscribed
    MQTT_CONNECTING --> RUN_AUTONOMOUS_LOCAL: Broker Unreachable
    
    state NORMAL_OPERATION {
        [*] --> READ_SENSORS
        READ_SENSORS --> FILTER_DATA: 10-Point Moving Avg
        FILTER_DATA --> CHECK_INTERLOCKS: Check Safety Limits
        CHECK_INTERLOCKS --> PUBLISH_TELEMETRY: Limits OK
        CHECK_INTERLOCKS --> TRIP_EMERGENCY_ACTUATOR: Limit Exceeded
        TRIP_EMERGENCY_ACTUATOR --> PUBLISH_ALERTS: Send Critical Event
        PUBLISH_ALERTS --> UPDATE_OLED
        PUBLISH_TELEMETRY --> UPDATE_OLED
        UPDATE_OLED --> YIELD_LOOP: Feed Watchdog Timer
    }
    
    NORMAL_OPERATION --> WIFI_CONNECTING: Wi-Fi Drop Detected
    RUN_AUTONOMOUS_LOCAL --> WIFI_CONNECTING: Retry Timer (5000ms)
    NORMAL_OPERATION --> BOOT_INIT: WDT Timeout (> 15s)
```

---

### 6. Database Entity-Relationship (ER) Model

```mermaid
erDiagram
    FACTORY ||--o{ DEVICE : contains
    DEVICE ||--o{ SENSOR : equips
    DEVICE ||--o{ ACTUATOR : equips
    DEVICE ||--o{ TELEMETRY : records
    DEVICE ||--o{ ALERT : triggers
    FACTORY ||--o{ AUTOMATION : governs
    FACTORY ||--o{ SCHEDULE : schedules
    USER ||--o{ AUDIT_LOG : initiates

    FACTORY {
        string _id PK
        string name
        string location
        string timezone
    }

    DEVICE {
        string _id PK
        string deviceId UK
        string factoryId FK
        string type
        string status
        string firmware
    }

    SENSOR {
        string _id PK
        string deviceId FK
        string name
        string type
        string unit
        number minThreshold
        number maxThreshold
    }

    ACTUATOR {
        string _id PK
        string deviceId FK
        string name
        string type
        string state
    }

    TELEMETRY {
        string _id PK
        string deviceId FK
        datetime timestamp
        object readings
        object actuators
    }

    AUTOMATION {
        string _id PK
        string factoryId FK
        string name
        object trigger
        object action
        boolean enabled
    }

    SCHEDULE {
        string _id PK
        string factoryId FK
        string name
        string cron
        string targetActuatorId FK
        string command
        boolean enabled
    }

    USER {
        string _id PK
        string email UK
        string passwordHash
        string role
    }

    AUDIT_LOG {
        string _id PK
        string userId FK
        string action
        string target
        datetime timestamp
    }
```
