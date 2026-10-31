import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { verifyAccessToken } from './jwtService';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  role?: string;
  isAlive?: boolean;
}

let wss: WebSocketServer | null = null;

export const initWebSocketServer = (server: Server) => {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Token required');
      return;
    }

    try {
      const payload: any = verifyAccessToken(token);
      ws.userId = payload.userId;
      ws.role = payload.role;
      ws.isAlive = true;

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      console.log(`WS Client connected: ${ws.userId}`);
    } catch (err) {
      ws.close(1008, 'Invalid token');
    }
  });

  // Heartbeat
  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      const authWs = ws as AuthenticatedWebSocket;
      if (authWs.isAlive === false) return authWs.terminate();
      authWs.isAlive = false;
      authWs.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });
};

export const broadcastEvent = (event: any) => {
  if (!wss) return;
  const message = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};
