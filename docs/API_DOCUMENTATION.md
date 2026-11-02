# Smart Factory PLC-Lite Automation Controller
## Step 7: API Documentation & Industrial Communication Protocols
**Prepared for:** HCLTech BTech Embedded Systems & IoT Curriculum  
**Version:** 1.0 | Date: November 2026  

---

### 1. Base URLs & Connectivity Endpoints

| Protocol | Environment | Base URL / Host | Port |
|---|---|---|---|
| **HTTPS REST API** | Cloud Production (Render) | `https://smart-factory-plc-lite-automation.onrender.com/api` | 443 |
| **HTTPS REST API** | Local Development | `http://localhost:4000/api` | 4000 |
| **WebSocket (WSS)**| Cloud Production (Render) | `wss://smart-factory-plc-lite-automation.onrender.com` | 443 |
| **WebSocket (WS)** | Local Development | `ws://localhost:4000` | 4000 |
| **MQTT Broker** | Cloud / Field (HiveMQ) | `broker.hivemq.com` | 1883 |
| **Frontend Web** | Cloud Production (Vercel) | `https://smart-factory-plc-lite-automation-c.vercel.app` | 443 |
| **ML Analytics** | Streamlit Service | `http://localhost:8501` | 8501 |

---

### 2. Authentication & Authorization (JWT)
All protected endpoints require a Bearer token in the HTTP Authorization header:
```http
Authorization: Bearer <your_jwt_access_token>
```

#### Preconfigured Plant Identities (Dev / Demo)
| Role | Email | Password | Access Rights |
|---|---|---|---|
| **ADMIN** | `admin@factory.local` | `Admin@1234` | Full access (Users, Factories, System) |
| **ENGINEER** | `engineer@factory.local` | `Engineer@1234` | Automation rules, Schedules, Actuators |
| **OPERATOR** | `operator@factory.local` | `Operator@1234` | Manual actuator toggle, SCADA Control |
| **VIEWER** | `viewer@factory.local` | `Viewer@1234` | Read-only telemetry and dashboards |

---

### 3. REST API Specifications

#### 3.1 Authentication Endpoints (`/api/auth`)
- **`POST /api/auth/login`**
  - **Payload:** `{"email": "admin@factory.local", "password": "Admin@1234"}`
  - **Response (200 OK):**
    ```json
    {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "d8f9e2...",
      "user": {
        "_id": "6ae6fc846d07d4726ea0896f",
        "email": "admin@factory.local",
        "role": "ADMIN"
      }
    }
    ```
- **`POST /api/auth/refresh`**
  - **Payload:** `{"refreshToken": "d8f9e2..."}`
  - **Response (200 OK):** New `accessToken` and `refreshToken`.
- **`GET /api/auth/me`**
  - **Headers:** `Authorization: Bearer <token>`
  - **Response (200 OK):** Current authenticated user profile and permissions.

#### 3.2 Devices Management (`/api/devices`)
- **`GET /api/devices`**
  - **Response (200 OK):** Array of all registered PLC-Lite controllers with live status (`ONLINE` / `OFFLINE`), firmware version, and hardware capabilities.
- **`GET /api/devices/:id`**
  - **Response (200 OK):** Detailed hardware profile and connected sensors/actuators.

#### 3.3 Actuators & Control (`/api/actuators`)
- **`GET /api/actuators`**
  - **Response (200 OK):** List of all plant actuators (Fans, Conveyors, Valves) and their operational states (`RUNNING`, `STOPPED`, `OPEN`, `CLOSED`).
- **`POST /api/actuators/:id/command`**
  - **Role Required:** `OPERATOR`, `ENGINEER`, or `ADMIN`.
  - **Payload:**
    ```json
    {
      "command": "START", // "START" | "STOP" | "OPEN" | "CLOSE" | "SET_VALUE"
      "value": 100
    }
    ```
  - **Response (200 OK):** Dispatches MQTT control payload, creates audit log entry, and returns updated actuator document.

#### 3.4 Telemetry Data (`/api/telemetry`)
- **`GET /api/telemetry?deviceId=plc-001&limit=100`**
  - **Query Params:** `deviceId` (optional), `limit` (default 50), `from` (ISO date), `to` (ISO date).
  - **Response (200 OK):** Time-series historical records for trend graphing.

#### 3.5 System Health & Readiness (`/health` & `/ready`)
- **`GET /health`**
  - **Response (200 OK / 503):**
    ```json
    {
      "status": "ok",
      "services": {
        "api": "ok",
        "mongodb": "ok",
        "mqtt": "ok"
      },
      "timestamp": "2026-11-02T16:00:00.000Z"
    }
    ```

---

### 4. MQTT Industrial Contracts & Topics

#### Topic 1: Telemetry Dispatch
- **Topic:** `factory/telemetry/{deviceId}` *(e.g. `factory/telemetry/plc-001`)*
- **QoS:** 1 (At least once) | **Retain:** False
- **Payload Schema:**
  ```json
  {
    "deviceId": "plc-001",
    "timestamp": 1730563200000,
    "readings": {
      "temperature": 68.4,
      "humidity": 45.2,
      "vibration": 1.82,
      "current": 8.45,
      "airQuality": 145.0
    },
    "actuators": {
      "fan": "STOPPED",
      "conveyor": "RUNNING",
      "valve": "CLOSED"
    }
  }
  ```

#### Topic 2: Actuator Command Control
- **Topic:** `factory/actuator/{deviceId}/control` *(e.g. `factory/actuator/plc-001/control`)*
- **QoS:** 1 | **Retain:** False
- **Payload Schema:**
  ```json
  {
    "target": "FAN",       // "FAN" | "CONVEYOR" | "VALVE"
    "action": "TURN_ON",   // "TURN_ON" | "TURN_OFF" | "SET_VALUE"
    "value": 1,
    "reason": "Operator Manual Override"
  }
  ```

#### Topic 3: Device Online Status & LWT
- **Topic:** `factory/status/{deviceId}`
- **QoS:** 1 | **Retain:** True
- **Payload Schema:**
  ```json
  {
    "deviceId": "plc-001",
    "status": "ONLINE",    // "ONLINE" | "OFFLINE"
    "firmware": "v2.1.0-hcltech",
    "ip": "192.168.1.105"
  }
  ```

---

### 5. WebSocket Event Broadcasting Protocol
Clients connect to `wss://smart-factory-plc-lite-automation.onrender.com?token=<JWT_TOKEN>`.

#### Broadcast Event Formats
1. **Telemetry Update Event:**
   ```json
   {
     "type": "TELEMETRY",
     "deviceId": "plc-001",
     "data": { "temperature": 71.2, "vibration": 2.15, "current": 8.8 }
   }
   ```
2. **Actuator State Transition Event:**
   ```json
   {
     "type": "ACTUATOR_UPDATED",
     "actuatorId": "6ae6fc...",
     "state": "RUNNING",
     "updatedBy": "operator@factory.local"
   }
   ```
3. **Critical Alert Broadcast:**
   ```json
   {
     "type": "ALERT",
     "severity": "CRITICAL",
     "message": "Vibration threshold exceeded (4.85 mm/s). Conveyor stopped.",
     "timestamp": "2026-11-02T16:05:00.000Z"
   }
   ```
