'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ConnectionState = 'connecting' | 'connected' | 'degraded' | 'offline';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details?: {
    services?: ServiceStatus[];
  };
}

// ─── Configuração ─────────────────────────────────────────────────────────────

const POLL_INTERVAL_CONNECTED  = 30_000; // 30s — quando conectado
const POLL_INTERVAL_OFFLINE    =  8_000; //  8s — quando offline, tenta mais rápido
const POLL_TIMEOUT             =  6_000; //  6s — máximo por request
const CONSECUTIVE_FAILS_OFFLINE = 2;     // falhas seguidas para marcar offline
const AUTO_HIDE_CONNECTED_MS   = 4_000; //  4s — tempo de exibição do "Conectado"

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useServerStatus() {
  const [state, setState]             = useState<ConnectionState>('connecting');
  const [services, setServices]       = useState<ServiceStatus[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [latencyMs, setLatencyMs]     = useState<number | null>(null);

  const consecutiveFails = useRef(0);
  const timerRef         = useRef<NodeJS.Timeout | null>(null);
  const isMounted        = useRef(true);

  const check = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), POLL_TIMEOUT);
    const start = Date.now();

    try {
      const res = await fetch('/api/health', {
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'x-health-poll': '1' },
      });
      clearTimeout(timeout);

      if (!isMounted.current) return;

      const elapsed = Date.now() - start;
      const data: HealthResponse = await res.json();

      consecutiveFails.current = 0;
      setLastChecked(new Date());
      setLatencyMs(elapsed);
      setServices(data.details?.services ?? []);
      setState('connected');
    } catch {
      clearTimeout(timeout);
      if (!isMounted.current) return;

      consecutiveFails.current += 1;
      setLastChecked(new Date());
      setLatencyMs(9999);

      if (consecutiveFails.current === 1) {
        setState('degraded');
      } else if (consecutiveFails.current >= CONSECUTIVE_FAILS_OFFLINE) {
        setState('offline');
        setServices([]);
      }
    } finally {
      if (!isMounted.current) return;
      const interval = state === 'offline' ? POLL_INTERVAL_OFFLINE : POLL_INTERVAL_CONNECTED;
      timerRef.current = setTimeout(check, interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    isMounted.current = true;
    check();
    return () => {
      isMounted.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [check]);

  return { state, services, lastChecked, latencyMs };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ServerStatusBanner() {
  const { state, services, lastChecked, latencyMs } = useServerStatus();

  // "Conectado" aparece brevemente e some
  const [showConnected, setShowConnected] = useState(false);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (state === 'connected') {
      setShowConnected(true);
      hideTimer.current = setTimeout(() => setShowConnected(false), AUTO_HIDE_CONNECTED_MS);
    } else {
      setShowConnected(false);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [state]);

  // Serviços problemáticos (para o banner degradado/offline)
  const badServices = services.filter(s => s.status !== 'healthy');
  const criticalServices = badServices.filter(s =>
    ['Database', 'Redis'].includes(s.name) && s.status === 'unhealthy'
  );

  // Formatar hora do último check
  const checkedStr = lastChecked
    ? lastChecked.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  // ── Conectando ──────────────────────────────────────────────────────────────
  if (state === 'connecting') {
    return (
      <div
        role="status"
        aria-live="polite"
        id="server-status-banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
          borderBottom: '1px solid #334155',
          fontSize: '12px',
          color: '#94a3b8',
          fontFamily: 'inherit',
          minHeight: '32px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SpinnerIcon />
          Conectando ao servidor...
        </span>
      </div>
    );
  }

  // ── Conectado (visível por 4s, depois some) ─────────────────────────────────
  if (state === 'connected' && showConnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        id="server-status-banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          background: 'linear-gradient(90deg, #064e3b 0%, #065f46 100%)',
          borderBottom: '1px solid #059669',
          fontSize: '12px',
          color: '#6ee7b7',
          fontFamily: 'inherit',
          minHeight: '32px',
          transition: 'all 0.3s ease',
          animation: 'fadeSlideIn 0.3s ease',
        }}
      >
        <PulseIcon color="#10b981" />
        <span>Servidor conectado</span>
        {latencyMs && (
          <span style={{ color: '#34d399', opacity: 0.7, fontSize: '11px' }}>
            {latencyMs}ms
          </span>
        )}
        {checkedStr && (
          <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '11px' }}>
            verificado {checkedStr}
          </span>
        )}
      </div>
    );
  }

  // ── Conectado — sem banner (normal de operação) ─────────────────────────────
  if (state === 'connected' && !showConnected) {
    return null;
  }

  // ── Degradado ───────────────────────────────────────────────────────────────
  if (state === 'degraded') {
    return (
      <div
        role="alert"
        id="server-status-banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          background: 'linear-gradient(90deg, #78350f 0%, #92400e 100%)',
          borderBottom: '1px solid #d97706',
          fontSize: '12px',
          color: '#fde68a',
          fontFamily: 'inherit',
          minHeight: '32px',
          flexWrap: 'wrap',
        }}
      >
        <WarningIcon />
        <span style={{ fontWeight: 600 }}>Servidor com instabilidade</span>
        <span style={{ opacity: 0.85, fontSize: '11px' }}>
          — Tempo de resposta excedido (9999ms). Tentando reconectar...
        </span>
        {checkedStr && (
          <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '11px' }}>
            {checkedStr}
          </span>
        )}
      </div>
    );
  }

  // ── Offline / Desconectado ──────────────────────────────────────────────────
  if (state === 'offline') {
    const isCritical = criticalServices.length > 0;
    return (
      <div
        role="alert"
        id="server-status-banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 100%)',
          borderBottom: '2px solid #ef4444',
          fontSize: '12px',
          color: '#fecaca',
          fontFamily: 'inherit',
          minHeight: '36px',
          flexWrap: 'wrap',
        }}
      >
        <OfflineIcon />
        <span style={{ fontWeight: 700, color: '#fff' }}>
          Servidor local desconectado
        </span>
        <span style={{ opacity: 0.8, fontSize: '11px' }}>
          — O banco de dados não está acessível. Verifique o servidor e o tunnel.
        </span>

        {/* Spinner "tentando reconectar" */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginLeft: '8px',
            color: '#fca5a5',
            fontSize: '11px',
          }}
        >
          <SpinnerIcon size={10} />
          reconectando...
        </span>

        {checkedStr && (
          <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '11px' }}>
            última verificação: {checkedStr}
          </span>
        )}
      </div>
    );
  }

  return null;
}

// ─── Ícones ───────────────────────────────────────────────────────────────────

function PulseIcon({ color = '#10b981' }: { color?: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: color,
          opacity: 0.4,
          animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        }}
      />
      <span
        style={{
          position: 'relative',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: color,
        }}
      />
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  );
}

function SpinnerIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      <line x1="12" y1="9" x2="12" y2="13" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function OfflineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" />
      <line x1="15" y1="9" x2="9" y2="15" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      <line x1="9" y1="9" x2="15" y2="15" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
