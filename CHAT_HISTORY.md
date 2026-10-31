# Smart Factory PLC-Lite Automation Controller with IoT, AI-Based Load Optimization, Cybersecurity & Productivity Monitoring
## Project ID: P_180 — Complete Development & Conversation History

---

## 1. Project Overview & Specifications

### Goal
Build a complete, production-oriented Smart Factory Industrial IoT platform that operates **hardware-agnostic** — initially communicating with a high-fidelity synthetic PLC/factory simulator, and engineered so that physical ESP32/PLC hardware can directly replace the simulator in the future without changing dashboards, backend, database, automation engine, or AI services.

### Core Stack
- **Frontend**: React 19, Vite 8, Tailwind CSS v4, React Router v7, Recharts, Axios, native WebSocket client
- **Backend API**: Node.js 20+, TypeScript (Strict mode), Express, Mongoose, MQTT.js, ws, bcryptjs, jsonwebtoken, Zod
- **MQTT Broker**: Eclipse Mosquitto (port 1883, WS port 9001)
- **Database**: MongoDB 7 with TTL indexes and compound indexing (port 27017)
- **AI/ML Service**: Python FastAPI, pandas, numpy, scikit-learn (port 8000)
- **PLC Simulator**: Node.js, Express, MQTT.js, stateful machine simulation (port 5000)
- **Containerization**: Docker Compose (6 orchestrated services)

---

## 2. Chronological Chat & Development Trajectory

### Session 1: Requirements Ingestion & Baseline Architecture
- **User Prompt**: Architect and build the full P_180 Smart Factory platform across 26 phases. Mandate strict hardware-agnostic design, genuine ML algorithms (no hardcoded fakes), and zero `ignoreExpiration: true` for JWTs.
- **Architectural Action**:
  - Established npm workspaces monorepo: `packages/shared-types`, `packages/mqtt-contracts`, `packages/validation`, `apps/api`, `apps/web`, `apps/ai-service`, `simulator`.
  - Defined contracts: `TelemetryPayload`, `CommandPayload`, `DeviceCapabilities`, `MachineData`, `ActuatorState`, and core enums (`MachineState`, `ActuatorCommand`, `UserRole`, `AlertSeverity`, `AlertType`).
  - Formulated 12 Mongoose models: `User`, `Factory`, `Device`, `Sensor`, `Actuator`, `Telemetry`, `Automation`, `AutomationExecution`, `Schedule`, `Alert`, `AuditLog`, `AIInsight`.
  - Configured Eclipse Mosquitto with WebSocket support on port 9001 and standard listener on port 1883.

---

### Session 2: Audit & Implementation of Unfinished Features
- **User Prompt**: Inspect current workspace, identify missing/partial features, fix build issues, complete all 17 React pages, implement Python AI service, and verify runtime.
- **Audit Findings**:
  - `apps/web` was still the default Vite starter template (hero counter).
  - `apps/ai-service` did not exist.
  - Analytics routes for `/machines` and `/productivity` returned empty stubs `[]`.
  - Missing route mounts in `app.ts` (devices, sensors, telemetry, audit logs, AI proxy).
  - Missing dependencies (`axios` in API; `react-router-dom`, `recharts`, `date-fns`, `tailwindcss` in Web).
- **Actions Executed**:
  1. **Dependencies**: Installed `axios` in `apps/api`; installed `react-router-dom`, `recharts`, `date-fns`, `tailwindcss`, `@tailwindcss/vite` in `apps/web`.
  2. **API App Router**: Updated `app.ts` with all 12 feature routes, global rate-limiting (500 req/15m), `/health` (reporting API, DB, and MQTT status), and `/ready` endpoints.
  3. **Analytics Engine**: Implemented real MongoDB aggregation pipelines for power time-series, energy totals with tariff calculation (`$0.12/kWh`), machine utilization, runtime breakdown, and health classification (`NORMAL`, `WARNING`, `CRITICAL`).
  4. **Stateful Simulator**: Replaced random number generation with full state machine transitions (`OFF` -> `STARTING` -> `RUNNING` -> `IDLE` -> `OVERLOADED` -> `FAULT` -> `MAINTENANCE`), realistic electrical math ($P = V \times I \times \text{PF}$), sine-wave working-hour occupancy, 12 controllable scenarios, and REST API on port 5000.
  5. **17 Frontend Pages**: Replaced starter template with complete production dashboard:
     - `LoginPage.tsx` / `RegisterPage.tsx`: Auth flow with dev credentials hint.
     - `DashboardPage.tsx`: Real-time KPI cards, live power area chart, temperature line chart, latest telemetry.
     - `DevicesPage.tsx` / `DeviceDetailPage.tsx`: Device statuses, telemetry details, actuator switches, machine table.
     - `SensorsPage.tsx` / `ActuatorsPage.tsx`: Sensor grid & live actuator control buttons (`ON`/`OFF`/`TOGGLE`) with ACK badges.
     - `AutomationsPage.tsx` / `AutomationBuilderPage.tsx`: Rule list + visual `WHEN / AND-OR / THEN` dropdown builder + JSON preview.
     - `SchedulesPage.tsx`: node-cron rule manager with presets.
     - `EnergyAnalyticsPage.tsx`: Daily kWh bar chart, power history, tariff cost estimates.
     - `MachineAnalyticsPage.tsx`: Health scoring, utilization chart, runtime breakdown.
     - `AIPage.tsx`: Interactive anomaly detection, 6h power prediction, priority load optimization.
     - `AlertsPage.tsx`: Filterable alert feed with Acknowledge/Resolve actions.
     - `AuditPage.tsx`: Paginated audit log tracking user email, role, action, and results.
     - `SimulatorPage.tsx`: Start/stop/pause controls, scenario selectors, MQTT disconnect/reconnect, live feed.
     - `SettingsPage.tsx`: Session details, RBAC matrix, environment variable references.
  6. **Python AI Service**: Built FastAPI service with:
     - Rolling window z-score anomaly detection.
     - Cyclical feature engineering (`hour_sin`, `hour_cos`, `dow_sin`, `dow_cos`) training both `LinearRegression` and `RandomForestRegressor`, auto-selecting lowest MAE model.
     - Greedy priority-based load shedding (preserving critical priority-1 loads).

---

### Session 3: Deep Verification & Bug Fixing
- **User Prompt**: "there are still many error verify them and improve"
- **Audit Findings & Bug Fixes**:
  1. **Docker Compose Missing `.env`**: `docker compose config` failed because only `.env.example` existed. Created `.env` with production dev values and removed obsolete `version: '3.8'`.
  2. **Docker AI URL**: Added `AI_SERVICE_URL=http://ai-service:8000` to `docker-compose.yml`.
  3. **Actuator Route Collision**: Consolidated `actuators.ts` and `actuatorsList.ts` into a single file with `ActuatorCommand` enum validation and audit logging.
  4. **Automation Target Device Bug**: In `automationService.ts`, actions previously defaulted to telemetry's device; updated to dynamically query the Actuator document to command the correct device.
  5. **Alerts Filtering**: Added query filtering (`acknowledged`, `severity`, `from`, `to`, `limit`) and authentication to `routes/alerts.ts`.
  6. **Seed Script Enhancements**: Populated `machines` array in seed telemetry for initial analytics render; added default automations, schedules, and alerts.
  7. **Vitest CJS Conflict**: Excluded `src/__tests__` from API `tsconfig.json` and created `vitest.config.mts` to prevent compiling CommonJS tests into `dist`.
  8. **Python Windows Encoding Bug**: Replaced unicode checkmarks (`✓`) in test runner with ASCII `[PASS]` to avoid `charmap` `UnicodeEncodeError` on Windows consoles.

---

### Session 4: Desktop Backup Sync & Resolution of TypeScript Errors
- **User Prompt**: Error log from `PS C:\Users\vishw\Desktop\smart-factory-backup> npm run build`:
  - `Cannot find module '@smart-factory/shared-types'`
  - `Could not find a declaration file for module '@smart-factory/mqtt-contracts'`
  - `Cannot find module 'axios'`
  - `Argument of type 'unknown' is not assignable to parameter of type 'string | undefined'`
- **Diagnosis**:
  - The user was compiling from `C:\Users\vishw\Desktop\smart-factory-backup`, which was an un-synchronized older copy.
  - In `package.json`, workspaces order placed `apps/*` before `packages/*`, triggering npm to build `apps/api` before `packages/*` generated `.d.ts` declaration files.
  - Packages used `"build": "tsc"` instead of `"build": "tsc -b"`, which failed to emit composite declaration files.
- **Fixes Applied to Backup Directory**:
  1. Reordered workspaces in root `package.json` (`packages/*`, `apps/*`, `simulator`).
  2. Updated package build scripts to `"build": "tsc -b"`.
  3. Synced all 61 updated source files, tests, and configurations to Desktop folder.
  4. Installed dependencies (`npm install`).
  5. Ran `npm run build` -> **0 errors, Build Successful**.
  6. Ran `npm test` -> **9/9 Passed**.
  7. Ran `python apps/ai-service/run_tests.py` -> **5/5 Passed**.
  8. Ran `npm run typecheck` -> **0 errors across all workspaces**.

---

### Session 5: Comprehensive Project Review, Monorepo Stabilization & Full Verification
- **User Prompt**: "read this project first" and "read this file and all project review to this file".
- **Audit Findings**:
  1. **Missing Root Dependencies**: Root `node_modules` was missing from the working directory (only `apps/web/node_modules` was present), preventing root-level test execution (`vitest` not found) and workspace linking.
  2. **TypeScript Deprecation Warning (TS5107)**: In `tsconfig.base.json`, `moduleResolution: "node"` produced deprecation warning errors under TypeScript 5.9+.
  3. **AI Service Health**: Verified that Python 3.14 / 3.11 environment passes all unit tests for z-score anomaly detection, cyclical feature engineering, and priority load optimization.
  4. **Docker Compose Health**: Docker configuration validated cleanly against Docker Compose v2 specification.
- **Actions Executed**:
  1. **Root Dependency Restoration**: Ran clean `npm install` at root, installing all 375 monorepo dependencies and CLI tools (`vitest`, `tsc`, `ts-node-dev`, `oxlint`).
  2. **Compiler Compatibility**: Added `"ignoreDeprecations": "5.0"` to `tsconfig.base.json` to eliminate deprecation error TS5107 during composite builds.
  3. **Monorepo Build Verification**: Executed `npm run build` across all 6 workspaces:
     - `@smart-factory/shared-types` -> compiled composite declarations.
     - `@smart-factory/mqtt-contracts` -> compiled composite declarations.
     - `@smart-factory/validation` -> compiled composite declarations.
     - `@smart-factory/api` -> compiled TypeScript to `dist/server.js`.
     - `web` -> compiled React 19 + Tailwind v4 + Vite assets (`dist/index.html`).
     - `@smart-factory/simulator` -> compiled TypeScript simulator to `dist/index.js`.
     - **Result: 0 errors, All 6 workspaces built cleanly.**
  4. **Backend Unit Tests**: Executed `npm test` (Vitest v4.1.11):
     - `energy-calculation.test.ts` (4/4 passed).
     - `automation-evaluator.test.ts` (5/5 passed).
     - **Result: 9/9 tests passed in 423ms.**
  5. **Typecheck Suite**: Executed `npm run typecheck`:
     - **Result: 0 errors across all monorepo packages.**
  6. **Python AI Suite**: Executed `python apps/ai-service/run_tests.py`:
     - Normal series anomaly check -> `[PASS]`.
     - Power spike anomaly detection ($z > 2.5$) -> `[PASS]`.
     - Insufficient data handling -> `[PASS]`.
     - Greedy load shedding (Critical load protection) -> `[PASS]`.
     - Load optimization under limit -> `[PASS]`.
     - **Result: 5/5 tests passed.**

---

### Session 6: Resolution of All Ponytail Review Findings & Test Suite Expansion
- **User Prompt**: "/ponytail-review" and "fix all".
- **Findings Resolved**:
  1. **Finding 1 (Brute-Force Rate Limiter)**: Removed global `router.use(authLimiter)` in `apps/api/src/routes/auth.ts` and attached it exclusively to `/login` and `/register`. Active sessions now maintain unrestricted access to `/me` and `/refresh`.
  2. **Finding 2 (Multi-Machine Alert Isolation)**: Updated `checkAndCreateAlert` in `apps/api/src/services/mqttService.ts` to include `machineId` and `actuatorId` in the uniqueness query. Alerts for distinct machines and actuators on the same PLC device are now properly isolated.
  3. **Finding 3 (Energy Aggregation for All Devices)**: Re-architected MongoDB pipeline in `apps/api/src/routes/analytics.ts` (`/api/analytics/energy`). It now groups by `{ date, deviceId }` to compute per-device energy delta (`max - min`), then groups by `date` to sum across devices. Fixed in-place mutation of `now` date object.
  4. **Finding 4 (Automation Engine Telemetry Optimization)**: Reordered `evaluateAutomations` loop in `apps/api/src/services/automationService.ts`. In-memory AST condition check (`evaluateConditionNode`) now runs before `AutomationExecution.countDocuments`, eliminating dozens of database reads per second on un-triggered telemetry ticks.
  5. **Finding 5 (AI Service ISO Timestamps)**: Standardized prediction timestamp formatting in `apps/ai-service/main.py` using `ts.strftime("%Y-%m-%dT%H:%M:%SZ")`, preventing invalid `+00:00Z` string outputs.
  6. **Finding 6 (Unit Test Suite Expansion)**:
     - Created `apps/api/src/__tests__/alert-deduplication.test.ts` (4 unit tests covering multi-machine and multi-actuator isolation, duplicate suppression, and post-resolution re-triggering).
     - Added multi-device delta aggregation test to `apps/api/src/__tests__/energy-calculation.test.ts`.
     - Added `test_power_prediction_iso_format` to `apps/ai-service/tests/test_ai.py` and `run_tests.py`.
- **Live Verification**:
  - `npm test`: **14/14 PASSED** (Vitest v4.1.11, 507ms across 3 test files).
  - `python apps/ai-service/run_tests.py`: **6/6 PASSED** (~1.8s).
  - `npm run typecheck`: **0 errors** across all 6 workspaces.
  - `npm run build`: **0 errors** across all monorepo packages and apps.

---

### Session 7: Premium Industrial SCADA UI Redesign (Commercial Grade)
- **User Prompt**: "/generative_ui # PROJECT: SMART FACTORY PLC-LITE — PREMIUM INDUSTRIAL SCADA UI REDESIGN".
- **Design Identity Implemented**:
  - Established dark industrial graphite design system: Background `#101418`, Sidebar `#151B21`, Surface `#1C242C`, Card `#222B35`, Borders `#303A44`, Sub-borders `#26303B`.
  - Color hierarchy: Primary `#E8EDF2`, Secondary `#8D9AA7`, Muted `#5A6675`, Operational Green `#35C98A`, Warning Amber `#F0B44D`, Critical Red `#EF5555`, Tech Cyan `#38BDF8`.
  - Replaced all emojis with professional Lucide icons and precision monospace data typography.
- **Components & Shell Built**:
  1. `ScadaCard.tsx`: Reusable surface container with thin industrial borders, header slot, status badges, and action triggers.
  2. `ScadaBadge.tsx`: Industrial status badge component (`ONLINE`, `OFFLINE`, `RUNNING`, `IDLE`, `FAULT`, `ACKNOWLEDGED`, `CRITICAL`, etc.) with pulsing live dots.
  3. `ConfirmDialog.tsx`: Safety interlock modal dialog for dangerous manual actuator operations and rule removals.
  4. `TopNav.tsx`: Real-time industrial top bar featuring facility selector, WebSocket streaming status, MQTT Port 1883 heartbeat, API health indicator, live UTC/Local digital clock, active alarms badge, and authenticated user profile.
  5. `Layout.tsx`: Commercial-grade SCADA sidebar with categorized sections (OPERATIONS, CONTROL & AUTOMATION, ANALYTICS & AI, SYSTEM & LOGS) and responsive mobile drawer.
- **Redesigned Pages**:
  1. `DashboardPage.tsx`: Operations Command Center with 6 industrial KPI blocks, live multi-channel machine telemetry table, real-time power area chart, temperature line chart, active alarms queue, and controller bus status.
  2. `DevicesPage.tsx`: Distributed PLC inventory with status filtering, MAC/hardware specs, and search.
  3. `DeviceDetailPage.tsx`: Deep telemetry inspection, bus power profile, and digital output controls with safety confirmation.
  4. `SensorsPage.tsx`: Instrument telemetry grid categorized by Electrical, Environment, and Dynamic metrics.
  5. `ActuatorsPage.tsx`: Actuator & relay switching workstation with command ACK watchdog status and RBAC guards.
  6. `AutomationsPage.tsx` & `AutomationBuilderPage.tsx`: Visual ladder logic builder with WHEN / COMBINATOR / THEN blocks and live AST JSON preview.
  7. `SchedulesPage.tsx`: Shift transition cron scheduler with preset templates and execution logging.
  8. `EnergyAnalyticsPage.tsx`: Daily kWh histogram, peak demand records, power/current dual-axis chart, and cost calculator.
  9. `MachineAnalyticsPage.tsx`: OEE benchmarks, machine utilization bar chart, thermal/vibration diagnostics.
  10. `AIPage.tsx`: Industrial diagnostics terminal featuring rolling z-score anomaly detection, 6h power demand regression, and greedy priority load-shedding.
  11. `AlertsPage.tsx`: ISA 18.2 compliant alarm management console with acknowledge and resolve workflows.
  12. `AuditPage.tsx`: Immutable chronological audit trail with pagination and operator action tracking.
  13. `SimulatorPage.tsx`: Testbed controller console with tick frequency slider, 12-scenario fault injection, and raw telemetry packet inspector.
  14. `SettingsPage.tsx`: Workstation session info, RBAC permission matrix, and plant baseline parameters.
  15. `LoginPage.tsx` & `RegisterPage.tsx`: Secure access gateway with dev-mode quick credentials.
- **Verification**:
  - `npm run typecheck --workspace=apps/web`: **0 errors**.
  - `npm run build`: **0 errors** across all 6 workspaces.
  - `npm test`: **14/14 passed**.
  - `python apps/ai-service/run_tests.py`: **6/6 passed**.

---

### Session 8: Full Runtime Execution, Bug Discovery & Production Hardening
- **User Prompt**: "now run all the project and find bugs and fix them and amke them a production ready".
- **Bugs Identified & Resolved**:
  1. **.env Path Resolution Failure**: `dotenv.config({ path: '../../.env' })` resolved to `C:\Users\vishw\.env` when executed from root, failing to load environment configurations.
     - *Fix*: Implemented robust candidate resolver (`apps/api/src/config/env.ts` and `simulator/src/index.ts`) checking `process.cwd()` and relative paths with `fs.existsSync`.
  2. **TopNav Health Check 404 (`/api/health`)**: TopNav called `api.get('/health')` which requested `/api/health` (due to `baseURL: '/api'`), but the backend only mounted `/health`.
     - *Fix*: Mounted dual endpoints `/health` and `/api/health` (and `/ready` & `/api/ready`) in `apps/api/src/app.ts`.
  3. **Simulator Null Reference on Start**: Calling `/sim/start` before MQTT was established could trigger unhandled exceptions calling `.publish()` on null `mqttClient`.
     - *Fix*: Guarded MQTT publishing with `if (mqttClient && mqttConnected)` and added automatic simulation startup on boot.
  4. **Stale AI Service Collision on Port 8000**: A ghost Python instance was occupying port 8000, returning 404 for `/detect-anomaly`.
     - *Fix*: Terminated the stale process, launched clean Uvicorn runner, and verified all AI endpoints (`/detect-anomaly`, `/predict-power`, `/optimize-load`).
  5. **CORS Rejection on `127.0.0.1` vs `localhost`**: Backend strictly allowed only a single origin string.
     - *Fix*: Dynamic origin matcher allowing `localhost:3000`, `127.0.0.1:3000`, and dev ports while preserving credentials.
  6. **Missing Simulator & WebSocket Proxies in Vite**: Accessing `/sim/*` or `/ws` from browser failed in containerized or custom port setups.
     - *Fix*: Added `/sim` and `/ws` reverse proxies in `apps/web/vite.config.ts` with environment variable overrides for Docker Compose.
  7. **Strict Auth Limiter**: Rate limiter was set to 5 requests per 15 minutes, blocking rapid role switching.
     - *Fix*: Configured configurable threshold with 30 attempts default.
  8. **Active Alarms Count Capped at 1**: TopNav queried `limit=1` which prevented the counter from ever displaying more than 1 alert.
     - *Fix*: Increased query limit to 100 to show true active count.
- **Full End-to-End Test Matrix Executed**:
  - Live API `/health` and `/api/health`: **200 OK**
  - Simulator status & MQTT telemetry streaming: **200 OK (75+ messages generated)**
  - JWT Authentication & RBAC Login: **200 OK**
  - Equipment & Devices API: **200 OK (3 devices online)**
  - Actuator Command & Relay Toggle: **200 OK (SENT -> ACK)**
  - AI Anomaly Detection via Backend Proxy: **200 OK (Insight created)**
  - AI Power Forecasting via Backend Proxy: **200 OK (LinearRegression model)**
  - Web Proxy to API (port 3000 -> 4000): **200 OK**
  - Web Proxy to Simulator (port 3000 -> 5000): **200 OK**
  - WebSocket Live Telemetry Streaming: **200 OK (Active continuous broadcast)**

---

## 3. Test & Verification Matrix

| Check | Tool / Engine | Result | Details |
|---|---|---|---|
| Monorepo Build | `npm run build` | **PASSED (0 errors)** | All 6 packages compiled cleanly |
| Monorepo Typecheck | `npm run typecheck` | **PASSED (0 errors)** | Zero TypeScript strict errors across monorepo |
| Backend Unit Tests | `npm test` (Vitest v4.1.11) | **14/14 PASSED (507ms)** | AST evaluation, multi-device energy delta & alert isolation |
| Python AI Unit Tests | `python apps/ai-service/run_tests.py` | **6/6 PASSED (~1.8s)** | Anomaly detection, load shedding & ISO timestamp validation |
| Docker Configuration | `docker compose config` | **PASSED** | Valid multi-container configuration for all 6 services |

---

## 4. Architectural & Component Review

### 4.1 Real-Time IoT & MQTT Pipeline
- **Broker**: Eclipse Mosquitto (port `1883` for TCP, `9001` for WebSockets).
- **Topics**: Standardized contracts defined in `@smart-factory/mqtt-contracts`:
  - `factory/{deviceId}/telemetry`: High-frequency sensor & machine payloads.
  - `factory/{deviceId}/command`: Actuator state modification requests.
  - `factory/{deviceId}/status`: Device connectivity heartbeat (`ONLINE`, `OFFLINE`, `ERROR`).
  - `factory/{deviceId}/actuator/{actuatorId}/status`: Actuator state reporting.
- **Validation**: Strict Zod runtime validation in API ingestion pipeline (`packages/validation`).
- **Heartbeat Watchdog**: Automatic offline detection marks devices `OFFLINE` if no telemetry or heartbeat is received in 60 seconds.

### 4.2 Actuator Command & Timeout Watchdog
- **Flow**: User or Automation triggers `POST /api/actuators/:id/command`.
- **State Progression**: `REQUESTED` -> `SENT` -> `ACKNOWLEDGED`.
- **Timeout Watchdog**: 30-second watchdog timer automatically transitions unacknowledged commands to `TIMEOUT` and generates a high-severity alert for operators.

### 4.3 Recursive Automation & Cron Engines
- **Rule Evaluator**: Recursively evaluates condition trees supporting nested logical blocks (`AND`, `OR`, `NOT`) and relational operators (`>`, `>=`, `<`, `<=`, `=`, `!=`).
- **Safety**: Built-in rate limiting, execution cooldowns, and loop-prevention counters.
- **Scheduler**: Dynamic cron scheduler powered by `node-cron` with preset templates (e.g., Shift Start, Eco Night Standby) loaded from MongoDB.

### 4.4 Python AI / Machine Learning Service
- **Anomaly Detection**: Rolling window z-score on time series telemetry ($z > 2.5$) with plain-English explanation generation.
- **Power Forecasting**: Trains both `LinearRegression` and `RandomForestRegressor` with cyclical features (`hour_sin`, `hour_cos`, `dow_sin`, `dow_cos`), dynamically selecting the lowest validation MAE model.
- **Load Optimization**: Priority-based greedy load shedding. Critical Priority-1 loads are unconditionally protected while shedding low-priority loads during demand spikes.

### 4.5 Synthetic PLC Simulator
- **Simulation**: Node.js + Express + MQTT simulating 3 realistic PLC controllers (`plc-001`, `plc-002`, `plc-003`).
- **Physics**: Real AC electrical power ($P = V \times I \times \text{PF}$), sine-wave occupant distribution with lunch-hour dips, and 7-state finite state machines (`OFF` -> `STARTING` -> `RUNNING` -> `IDLE` -> `OVERLOADED` -> `FAULT` -> `MAINTENANCE`).
- **Interactive Scenarios**: REST API on port `5000` supporting 12 controllable failure, surge, and maintenance scenarios.

### 4.6 Cybersecurity & RBAC
- **Authentication**: Strict JWT authentication with 15-minute access tokens and 7-day refresh token rotation. Zero `ignoreExpiration: true` bypasses.
- **RBAC Roles**: 4 discrete authorization tiers (`ADMIN`, `ENGINEER`, `OPERATOR`, `VIEWER`).
- **Audit Logging**: Structured audit logging for all mutating operations (actuator commands, rule additions, schedule modifications).
- **Security Middleware**: Helmet security headers, CORS origin restrictions, and IP/token rate-limiting.

---

## 5. How to Run the Project

### Option A: Docker Compose (All 6 Services in One Command)
```powershell
docker compose up --build
```
Services automatically launched:
- `mongodb` (port 27017)
- `mosquitto` (ports 1883, 9001)
- `api` (port 4000)
- `web` (port 3000)
- `ai-service` (port 8000)
- `simulator` (port 5000)

### Option B: Local Development Run (Individual Terminals)

```powershell
# 1. Seed database with equipment, users, and historical data:
npx ts-node scripts/seed.ts

# 2. Terminal 1: Backend API
npm run start --workspace=apps/api

# 3. Terminal 2: Synthetic PLC Simulator
npm run start --workspace=simulator

# 4. Terminal 3: React Dashboard
npm run dev --workspace=apps/web

# 5. Terminal 4: Python AI Service
python apps/ai-service/main.py
```

### Access & Seeded Credentials
- Dashboard URL: **http://localhost:3000**
- Accounts:
  - **Admin**: `admin@factory.local` / `Admin@1234`
  - **Engineer**: `engineer@factory.local` / `Engineer@1234`
  - **Operator**: `operator@factory.local` / `Operator@1234`
  - **Viewer**: `viewer@factory.local` / `Viewer@1234`
