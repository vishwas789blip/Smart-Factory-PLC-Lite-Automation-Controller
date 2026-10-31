# Smart Factory PLC-Lite: Enterprise Production Deployment Guide
## Project ID: P_180 — Commercial-Grade Industrial SCADA & IoT System

---

## 1. Architecture & Network Topology

```
                                [ Operator / Engineer Browser ]
                                              │
                                              │ HTTPS (443) / WSS
                                              ▼
                                 ┌─────────────────────────┐
                                 │   Nginx Reverse Proxy   │ (SSL Termination & Caching)
                                 └────────────┬────────────┘
                                              │
                      ┌───────────────────────┼───────────────────────┐
                      │                       │                       │
                      ▼                       ▼                       ▼
            ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
            │ React SCADA Web  │    │  Node.js API Core│    │  PLC Simulator   │
            │   (Port 3000)    │    │ (Port 4000 & WS) │    │   (Port 5000)    │
            └──────────────────┘    └─────────┬────────┘    └─────────┬────────┘
                                              │                       │
                      ┌───────────────────────┼──────────────┐        │
                      │                       │              │        │
                      ▼                       ▼              │        │
             ┌─────────────────┐     ┌─────────────────┐     │        │
             │   MongoDB 7     │     │ Python AI/ML    │     │        │
             │  (Port 27017)   │     │  (Port 8000)    │     │        │
             └─────────────────┘     └─────────────────┘     │        │
                                                             │        │
                                              ┌──────────────┴────────┴────────┐
                                              │     Mosquitto MQTT Broker      │
                                              │    (Port 1883 TCP, 9001 WS)    │
                                              └──────────────┬─────────────────┘
                                                             │
                                              ┌──────────────┴─────────────────┐
                                              │                                │
                                              ▼                                ▼
                                    [ Synthetic Simulator ]        [ Physical ESP32 / PLC ]
                                       (Testbed Mode)                 (Hardware Mode)
```

### Port Allocation & Exposure Matrix

| Port | Service | Internal / External | Protocol | Purpose |
|---|---|---|---|---|
| **80 / 443** | Nginx Reverse Proxy | External Public/LAN | HTTP / HTTPS | Single gateway for Web, API, and WebSocket |
| **3000** | SCADA Web Frontend | Internal Container | HTTP | Vite React 19 production build |
| **4000** | Backend API & WebSocket | Internal Container | HTTP / WS | REST API endpoints, JWT auth, live telemetry stream |
| **5000** | Synthetic PLC Simulator | Internal (Optional LAN) | HTTP / REST | Testbed controls & scenario injection |
| **8000** | Python AI Service | Internal Container | HTTP | FastAPI ML inference (Anomaly, Forecast, Load-shed) |
| **1883** | Mosquitto MQTT Broker | External OT LAN | MQTT (TCP) | Direct physical PLC / ESP32 hardware telemetry & command link |
| **9001** | Mosquitto WebSockets | Internal / Optional | MQTT over WS | Browser-based MQTT debugging or web clients |
| **27017** | MongoDB 7.0 | Internal Container | TCP | Primary time-series document database |

---

## 2. Host System Prerequisites

### Minimum Hardware Sizing
- **Edge Gateway / Industrial IPC** (e.g., Advantech, Siemens IPC, Raspberry Pi 5 8GB):
  - 4 Cores @ 2.0 GHz+ (x86_64 or ARM64)
  - 8 GB RAM
  - 64 GB High-Endurance NVMe / SSD Storage
- **On-Premise Server / Cloud VM** (AWS EC2 `t3.xlarge`, GCP `e2-standard-4`, Azure `D4s_v5`):
  - 4 vCPUs
  - 16 GB RAM
  - 100 GB SSD (with automated snapshots)

### Required Host Software
- **Operating System**: Ubuntu 22.04 LTS / 24.04 LTS, Debian 12, Rocky Linux 9, or Windows Server 2022
- **Docker Engine**: Version 24.0+
- **Docker Compose**: Version 2.20+ (`docker compose`)
- **Git** & **OpenSSL**

---

## 3. Environment Configuration & Production Secrets

Create the production environment file `.env` in the project root:

```bash
cp .env.example .env
```

### Production Checklist for `.env`

```ini
# ==============================================================================
# SMART FACTORY PLC-LITE: PRODUCTION ENVIRONMENT
# ==============================================================================

# Core Application Ports
PORT=4000
SIMULATOR_PORT=5000
CORS_ORIGIN=https://factory.yourdomain.com

# Database Connection (MongoDB)
# In Docker: mongodb://root:PASSWORD@mongodb:27017/smart-factory?authSource=admin
MONGODB_URI=mongodb://mongodb:27017/smart-factory

# Cryptographic Tokens (Generate with: openssl rand -base64 32)
JWT_SECRET=b63c4f828a49c25bb2a4e21976e1f0e271cf897e6e584f90119e8b4e54881bc2
JWT_REFRESH_SECRET=7f5d3e098a1c4b7263b65108f91ea73926017b2f4c9a8115623910c2834b9e1a
AUTH_RATE_LIMIT=30

# MQTT Broker Configuration
MQTT_HOST=mosquitto
MQTT_PORT=1883
MQTT_USER=factory_backend
MQTT_PASSWORD=PROD_BACKEND_SECRET_REPLACE_ME
MQTT_SIM_USER=factory_simulator
MQTT_SIM_PASSWORD=PROD_SIMULATOR_SECRET_REPLACE_ME

# Machine Learning & AI Proxy
AI_SERVICE_URL=http://ai-service:8000

# Plant Operational Baselines & Tariffs
ENERGY_TARIFF=0.12
POWER_ALERT_THRESHOLD=10.0
TEMP_ALERT_THRESHOLD=40.0
VIBRATION_ALERT_THRESHOLD=5.0
TELEMETRY_RETENTION_DAYS=30
```

> [!IMPORTANT]
> Never deploy to production using default dev secrets. Always generate fresh cryptographic keys with `openssl rand -base64 32`.

---

## 4. Strategy A: Containerized Production Deployment (Docker Compose)

This is the standard and recommended deployment strategy. All 6 microservices run in isolated, health-checked containers with automated restarts.

### Step 1: Clone and Inspect
```bash
git clone https://github.com/your-org/Smart-Factory-PLC-Lite-Automation-Controller.git
cd Smart-Factory-PLC-Lite-Automation-Controller
```

### Step 2: Configure Environment
```bash
cp .env.example .env
# Edit .env with your production passwords and domains
nano .env
```

### Step 3: Build & Launch Services in Detached Mode
```bash
docker compose up --build -d
```

### Step 4: Verify Container Health
```bash
docker compose ps
```
Expected output:
```
NAME                IMAGE               COMMAND                  SERVICE      STATUS
smart-factory-mongodb      mongo:7             "docker-entrypoint.s…"   mongodb      Up (healthy)
smart-factory-mosquitto    eclipse-mosquitto:2 "mosquitto -c /mosqu…"   mosquitto    Up (healthy)
smart-factory-api          smart-factory-api   "npm run start --wor…"   api          Up (healthy)
smart-factory-ai           smart-factory-ai    "uvicorn main:app --…"   ai-service   Up
smart-factory-simulator    smart-factory-sim   "npm run start --wor…"   simulator    Up
smart-factory-web          smart-factory-web   "npm run dev --worksp…"  web          Up
```

### Step 5: Seed Factory Baseline Data
Once the database container is healthy, populate initial accounts, factory lines, sensors, and equipment:
```bash
docker compose exec api npx tsx scripts/seed.ts
```

### Step 6: Verify Health Endpoints
```bash
curl -i http://localhost:4000/health
curl -i http://localhost:4000/api/health
```

Expected response (`HTTP 200 OK`):
```json
{
  "status": "ok",
  "services": {
    "api": "ok",
    "mongodb": "ok",
    "mqtt": "ok"
  },
  "timestamp": "2026-11-01T00:00:00.000Z"
}
```

---

## 5. Production Nginx Reverse Proxy & SSL (HTTPS / WSS)

In a commercial plant, all operator workstation traffic must be encrypted via HTTPS and WSS (secure WebSockets).

### 1. Install Nginx and Certbot (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Deploy Nginx Configuration
Copy the provided [`infrastructure/nginx/nginx.conf`](file:///c:/Users/vishw/Desktop/Smart-Factory-PLC-Lite-Automation-Controller/infrastructure/nginx/nginx.conf) or configure `/etc/nginx/sites-available/smart-factory`:

```nginx
upstream api_upstream {
    server 127.0.0.1:4000;
    keepalive 32;
}

upstream sim_upstream {
    server 127.0.0.1:5000;
}

upstream web_upstream {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name factory.yourdomain.com;
    return 301 https://$host$request-uri;
}

server {
    listen 443 ssl http2;
    server_name factory.yourdomain.com;

    # SSL Certificates (managed by Certbot or internal CA)
    ssl_certificate /etc/letsencrypt/live/factory.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/factory.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend UI
    location / {
        proxy_pass http://web_upstream;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend REST API
    location /api/ {
        proxy_pass http://api_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 15s;
        proxy_read_timeout 60s;
    }

    # Health Checks
    location /health {
        proxy_pass http://api_upstream/health;
        access_log off;
    }

    # WebSocket Telemetry Stream (WSS)
    location /ws {
        proxy_pass http://api_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Simulator Controls (Optional Testbed endpoint)
    location /sim/ {
        proxy_pass http://sim_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### 3. Generate Free SSL Certificate with Let's Encrypt
```bash
sudo certbot --nginx -d factory.yourdomain.com
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. Strategy B: Bare-Metal Linux Host (Systemd Units)

For installations running directly on edge industrial PCs without Docker:

### 1. Build Monorepo Workspaces
```bash
npm install
npm run build
python3 -m pip install -r apps/ai-service/requirements.txt
```

### 2. Backend API Service (`/etc/systemd/system/smart-factory-api.service`)
```ini
[Unit]
Description=Smart Factory PLC-Lite Backend API
After=network.target mongod.service mosquitto.service

[Service]
Type=simple
User=factory
WorkingDirectory=/opt/smart-factory
EnvironmentFile=/opt/smart-factory/.env
ExecStart=/usr/bin/node apps/api/dist/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 3. Python AI ML Service (`/etc/systemd/system/smart-factory-ai.service`)
```ini
[Unit]
Description=Smart Factory AI Diagnostics Service
After=network.target

[Service]
Type=simple
User=factory
WorkingDirectory=/opt/smart-factory/apps/ai-service
ExecStart=/usr/bin/python3 main.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 4. Synthetic Simulator Service (`/etc/systemd/system/smart-factory-simulator.service`)
```ini
[Unit]
Description=Smart Factory Synthetic PLC Simulator
After=network.target mosquitto.service

[Service]
Type=simple
User=factory
WorkingDirectory=/opt/smart-factory
EnvironmentFile=/opt/smart-factory/.env
ExecStart=/usr/bin/node simulator/dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 5. Enable and Start Systemd Units
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now smart-factory-api smart-factory-ai smart-factory-simulator
```

---

## 7. Connecting Physical Hardware (ESP32 / Industrial PLC)

The platform is engineered **hardware-agnostic**. To transition from the synthetic simulator to physical hardware:

1. Stop the simulator service (`docker compose stop simulator` or disable the systemd service).
2. Configure your physical PLC or ESP32 microcontroller with:
   - Broker IP: IP of your Mosquitto host (port `1883` or `8883` with TLS).
   - Topic contracts defined in `@smart-factory/mqtt-contracts`.

### Physical ESP32 C++ Sample (Arduino / PlatformIO)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "Factory_OT_WiFi";
const char* password = "OT_WIFI_SECRET";
const char* mqtt_server = "192.168.1.100";
const char* device_id = "plc-001";

WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
}

void callback(char* topic, byte* message, unsigned int length) {
  // Handles incoming commands: factory/plc-001/command
  StaticJsonDocument<256> doc;
  deserializeJson(doc, message, length);
  const char* actuatorId = doc["actuatorId"];
  const char* command = doc["command"];
  
  if (strcmp(actuatorId, "relay-1") == 0) {
    digitalWrite(2, strcmp(command, "ON") == 0 ? HIGH : LOW);
    
    // Send ACK back to factory/plc-001/actuators/relay-1/status
    StaticJsonDocument<128> ackDoc;
    ackDoc["actuatorId"] = actuatorId;
    ackDoc["deviceId"] = device_id;
    ackDoc["state"] = command;
    ackDoc["status"] = "ACK";
    char ackBuffer[128];
    serializeJson(ackDoc, ackBuffer);
    client.publish("factory/plc-001/actuators/relay-1/status", ackBuffer);
  }
}

void publish_telemetry() {
  StaticJsonDocument<512> doc;
  doc["deviceId"] = device_id;
  doc["timestamp"] = "2026-11-01T00:00:00.000Z"; // Sync via NTP
  doc["sequence"] = 1;
  
  // Electrical channel
  JsonObject elec = doc.createNestedObject("electrical");
  elec["voltage"] = 230.2;
  elec["current"] = 8.5;
  elec["power"] = 1.95;
  elec["powerFactor"] = 0.96;
  elec["energy"] = 142.5;

  // Environment channel
  JsonObject env = doc.createNestedObject("environment");
  env["temperature"] = 24.5;
  env["humidity"] = 50.2;
  env["smoke"] = 0.0;
  env["gas"] = 0.0;

  char buffer[512];
  serializeJson(doc, buffer);
  client.publish("factory/plc-001/telemetry", buffer);
}
```

---

## 8. Backup, Retention & Disaster Recovery

### Automated Daily Database Backup
Add a cron job to `/etc/cron.daily/backup-smart-factory`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/smart-factory"
DATE=$(date +\%Y\%m\%d_\%H\%M\%S)
mkdir -p "$BACKUP_DIR"

# Backup MongoDB
docker compose -f /opt/smart-factory/docker-compose.yml exec -T mongodb mongodump \
  --db=smart-factory --archive > "$BACKUP_DIR/smart-factory_$DATE.archive"

# Retain only last 14 days of backups
find "$BACKUP_DIR" -type f -name "*.archive" -mtime +14 -delete
```
Make executable:
```bash
sudo chmod +x /etc/cron.daily/backup-smart-factory
```

### Restore Procedure
```bash
docker compose exec -T mongodb mongorestore --archive < /var/backups/smart-factory/smart-factory_20261101.archive
```

---

## 9. Operations & Troubleshooting Quick Reference

| Symptom | Cause | Solution |
|---|---|---|
| **TopNav Shows `API: DEGRADED`** | API can't reach MongoDB or Mosquitto | Verify `docker compose ps` and run `curl http://localhost:4000/api/health` to pinpoint which service is offline. |
| **WebSocket: DISCONNECTED** | Token expired or proxy missing upgrade headers | Ensure Nginx config has `proxy_set_header Upgrade $http_upgrade` and `Connection "Upgrade"`. |
| **Actuator Command: TIMEOUT** | Device not subscribing to `factory/{id}/command` or offline | Check `factory/{deviceId}/status` topic; check physical cable / WiFi connection of the PLC. |
| **Too Many Auth Attempts (429)** | Rate limiter hit during repeated failed logins | Wait 15 minutes or configure `AUTH_RATE_LIMIT=100` in `.env` and restart API. |
| **Port Conflict on 8000 / 4000** | Stale host process holding the port | Run `Get-NetTCPConnection -LocalPort 8000` (Windows) or `ss -tulpn \| grep 8000` (Linux) and terminate the stale process. |

