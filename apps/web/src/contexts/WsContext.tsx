import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getAccessToken } from '../lib/api';

interface WsContextType {
  lastMessage: any;
  connected: boolean;
  subscribe: (handler: (msg: any) => void) => () => void;
}

const WsContext = createContext<WsContextType | null>(null);

export const WsProvider = ({ children }: { children: ReactNode }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const handlers = useRef<Set<(msg: any) => void>>(new Set());
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const envApiUrl = import.meta.env.VITE_API_URL as string | undefined;
    const derivedWs = envApiUrl ? envApiUrl.replace(/^http/, 'ws') : `${protocol}//${window.location.hostname}:4000`;
    const baseUrl = (import.meta.env.VITE_WS_URL as string) || derivedWs;
    const wsUrl = `${baseUrl.replace(/\/$/, '')}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        setLastMessage(msg);
        handlers.current.forEach(h => h(msg));
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3 seconds
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    // Delay initial connect to ensure token is available
    const t = setTimeout(connect, 500);
    return () => {
      clearTimeout(t);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((handler: (msg: any) => void) => {
    handlers.current.add(handler);
    return () => { handlers.current.delete(handler); };
  }, []);

  return (
    <WsContext.Provider value={{ lastMessage, connected, subscribe }}>
      {children}
    </WsContext.Provider>
  );
};

export const useWs = () => {
  const ctx = useContext(WsContext);
  if (!ctx) throw new Error('useWs must be used within WsProvider');
  return ctx;
};
