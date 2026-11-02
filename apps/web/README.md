# Smart Factory PLC-Lite — SCADA Operator Console

The front-end supervisory control and data acquisition (SCADA) interface for the Smart Factory PLC-Lite ecosystem, built with **React 19**, **Vite**, and **Tailwind CSS**.

## Key Capabilities
- **Real-Time Digital Workstation:** Dark-mode ergonomics designed for 24/7 operator control rooms.
- **Dynamic Plant Mimic:** Animated SVG schematics visualizing conveyor belts, cooling fans, and safety valves in real time.
- **Sub-100ms WebSocket Updates:** Instant telemetry visualization (temperature, vibration, current, gas) powered by native WebSocket integration.
- **Manual Supervisory Overrides:** Low-latency actuator controls with confirmation dialogs and automatic audit logging.
- **Role-Based Access Control (RBAC):** Distinct workflows for `VIEWER`, `OPERATOR`, `ENGINEER`, and `ADMIN`.
- **Edge Reverse Proxying:** Configured via `vercel.json` to proxy API requests seamlessly to the Render cloud backend.

## Local Development
```bash
npm install
npm run dev
```
Accessible by default at `http://localhost:3000`.
