# Smart Factory PLC-Lite Automation Controller (Project P_180)

An industrial IoT platform designed to be **hardware-agnostic**, initially running against a realistic synthetic PLC/factory simulator and ready to be replaced with physical ESP32 hardware without changing dashboards, backend, database, or analytics.

---

## Architecture

```
                        ┌─────────────────────┐
                        │   React Dashboard   │
                        │ React 19 + Tailwind │
                        └──────────┬──────────┘
                                   │
                         REST + WebSocket
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │   Node.js Backend   │
                        │ TypeScript/Express  │
                        └──────────┬──────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             │                     │                     │
             ▼                     ▼                     ▼
       ┌───────────┐        ┌─────────────┐       ┌─────────────┐
       │ MongoDB 7 │        │ Automation  │       │ AI Service  │
       │ (Mongoose)│        │ Engine      │       │ Python 3.14 │
       └───────────┘        └─────────────┘       └─────────────┘
                                   │
                                   ▼
                           ┌────────────────┐
                           │ MQTT Mosquitto │
                           │  (Port 1883)   │
                           └───────┬────────┘
                                   │
                        ┌──────────┴──────────┐
                        │                     │
                        ▼                     ▼
                Synthetic PLC           Future ESP32
                   Simulator              Hardware
```

---

## Quick Start (Development)

### Prerequisites
- Node.js >= 20
- Python >= 3.10
- MongoDB running on `localhost:27017`
- Mosquitto MQTT broker running on `localhost:1883`

### 1. Install & Build All Workspaces
```bash
npm install
npm run build
```

### 2. Seed the Database
```bash
npx ts-node scripts/seed.ts
```
This creates:
- 1 Factory (`Smart Factory Alpha`)
- 3 PLC-Lite devices (`plc-001`, `plc-002`, `plc-003`)
- Sensors (temp, humidity, power, vibration)
- Actuators (relays, motors, fans, lights)
- 4 users (Admin, Engineer, Operator, Viewer)
- 24 hours of historical telemetry

### 3. Start Services (Separate Terminals)
```bash
# Terminal 1: Backend API (port 4000)
npm run start --workspace=apps/api

# Terminal 2: Synthetic PLC Simulator (port 5000)
npm run start --workspace=simulator

# Terminal 3: React Dashboard (port 3000)
npm run dev --workspace=apps/web

# Terminal 4: Python AI Service (port 8000)
cd apps/ai-service
uvicorn main:app --port 8000
```

### 4. Open the Dashboard
Navigate to `http://localhost:3000` and sign in:
- **Admin**: `admin@factory.local` / `Admin@1234`
- **Operator**: `operator@factory.local` / `Operator@1234`
- **Viewer**: `viewer@factory.local` / `Viewer@1234`

---

## Production Deployment

For complete enterprise deployment instructions, reverse proxy setups, SSL configuration, hardware transitions, and disaster recovery:
👉 **[Read the Full Production Deployment Guide (DEPLOYMENT.md)](./DEPLOYMENT.md)**

### Single-Command Quick Start (Docker Compose)
Run the full 6-service stack:
```bash
docker compose up --build -d
```

Services:
- `mongodb` (port 27017)
- `mosquitto` (ports 1883, 9001)
- `api` (port 4000)
- `web` (port 3000)
- `ai-service` (port 8000)
- `simulator` (port 5000)

---

## Features

### Real-Time IoT & MQTT Pipeline
- Telemetry published every 5s per device via `factory/{deviceId}/telemetry`
- Zod schema validation before saving to MongoDB
- Live broadcast to connected browser clients via WebSockets
- Automatic offline detection (marks device OFFLINE if no heartbeat in 60s)

### Actuator Command & ACK System
- Commands dispatched via REST (`POST /api/actuators/:id/command`)
- Published to MQTT topic `factory/{deviceId}/command`
- State tracked: `REQUESTED` → `SENT` → `ACKNOWLEDGED`
- 30-second timeout watchdog marks missed ACKs as `TIMEOUT` and creates an alert

### Automation & Rules Engine
- Recursive tree evaluation supporting `AND`, `OR`, `NOT`
- Operators: `>`, `>=`, `<`, `<=`, `=`, `!=`
- Metrics: electrical, environmental, people count, machine state
- Built-in cooldown, rate-limiting, and loop prevention
- Visual dropdown builder in frontend with JSON preview

### Analytics
- **Energy Analytics**: MongoDB aggregation computing total kWh, peak power, average power, and energy cost via configurable tariff (`$0.12/kWh` default)
- **Machine Analytics**: Runtime, idle time, downtime, utilization percentage, and health status (`NORMAL`, `WARNING`, `CRITICAL`) based on temperature and vibration thresholds

### Python AI Service
- **Anomaly Detection**: Rolling window z-score on time series. Scores > 2.5 flag anomalies with severity and plain-English explanation.
- **Power Prediction**: Automatically trains both `LinearRegression` and `RandomForestRegressor` with cyclical time features, evaluates validation MAE, and selects the superior model to forecast power.
- **Load Optimization**: Priority-based greedy load shedding. Critical loads (priority 1) are never shed.

### Security & Cybersecurity
- Strict JWT authentication (15m access token, 7d refresh token with rotation)
- Expired tokens return `401 TOKEN_EXPIRED` (never `ignoreExpiration: true`)
- RBAC roles: `VIEWER`, `OPERATOR`, `ENGINEER`, `ADMIN`
- Rate limiting on API routes and brute-force protection on auth
- Audit logging for all mutating operations
- Secure headers via Helmet and strict CORS controls

---

## Running Automated Tests

```bash
# Run all backend unit tests (Vitest)
npm test

# Run AI service unit tests (Python)
python apps/ai-service/run_tests.py

# Run TypeScript typechecks across all packages
npm run typecheck
```
