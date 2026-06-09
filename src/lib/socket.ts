/**
 * HBFlow Real-time WebSockets Sync Manager
 * Gerencia a comunicação WebSocket para sincronização de presença dos agentes,
 * sussurros em tempo real e intervenções (takeover) de supervisores.
 * Possui fallback seguro para eventos nativos de Window/CustomEvents em ambiente local/frontend.
 */

export interface WebSocketEventMessage<T = any> {
  event: string;
  tenantId: string;
  senderId?: string;
  payload: T;
  createdAt: string;
}

export type SocketEventListener<T = any> = (data: WebSocketEventMessage<T>) => void;

class HBWebSocketManager {
  private socketInstance: any = null;
  private listeners: Map<string, Set<SocketEventListener>> = new Map();
  private isConnected: boolean = false;

  constructor() {
    this.initSocket();
  }

  private initSocket() {
    if (typeof window === 'undefined') {
      // Execução no servidor Next.js
      return;
    }

    try {
      // Exemplo de importação dinâmica de client socket.io
      // const { io } = require('socket-io-client');
      // this.socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
      // this.isConnected = true;
    } catch (e) {
      console.log('[Socket] Socket.io client não encontrado. Usando CustomEvents locais para sync de abas/simulações.');
      this.isConnected = false;
    }
  }

  /**
   * Envia um evento de tempo real para o servidor/outros clientes
   */
  emit<T>(event: string, tenantId: string, payload: T, senderId?: string): void {
    const message: WebSocketEventMessage<T> = {
      event,
      tenantId,
      senderId,
      payload,
      createdAt: new Date().toISOString()
    };

    console.log(`[Socket Emit] Evento: "${event}"`, message);

    if (this.isConnected && this.socketInstance) {
      this.socketInstance.emit(event, message);
    } else {
      // Fallback: Dispara um CustomEvent no navegador para que outras partes do App reajam localmente
      if (typeof window !== 'undefined') {
        const customEvent = new CustomEvent(`hbflow_socket_${event}`, { detail: message });
        window.dispatchEvent(customEvent);
      }
    }
  }

  /**
   * Registra um listener para um evento específico
   */
  on<T>(event: string, callback: SocketEventListener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);

    if (this.isConnected && this.socketInstance) {
      this.socketInstance.on(event, callback);
    } else {
      // Fallback: escuta CustomEvent do window
      if (typeof window !== 'undefined') {
        const handler = (e: Event) => {
          const customEvent = e as CustomEvent<WebSocketEventMessage<T>>;
          callback(customEvent.detail);
        };
        window.addEventListener(`hbflow_socket_${event}`, handler);
        
        // Retorna função para desinscrever (cleanup)
        return () => {
          window.removeEventListener(`hbflow_socket_${event}`, handler);
          this.listeners.get(event)?.delete(callback);
        };
      }
    }

    return () => {
      this.listeners.get(event)?.delete(callback);
      if (this.isConnected && this.socketInstance) {
        this.socketInstance.off(event, callback);
      }
    };
  }
}

export const hbSocket = new HBWebSocketManager();
