// Health Check Types

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  latencyMs: number;
  details?: Record<string, any>;
}

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  lastCheck: string;
  errorCount: number;
  successCount: number;
  details?: Record<string, any>;
}

export interface OperationalScore {
  overall: number; // 0-100 (percentage)
  components: {
    availability: number; // 0-100 (percentage)
    errorRate: number; // 0-100 (percentage)
    queueHealth: number; // 0-100 (percentage)
    dbLatency: number; // 0-100 (percentage)
    aiSuccess: number; // 0-100 (percentage)
    whatsappDelivery: number; // 0-100 (percentage)
  };
  timestamp: string;
}

export interface HealthAlert {
  id: string;
  type: 'operational_score' | 'db_latency' | 'redis_offline' | 'queue_backlog' | 'ai_failure';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
  metadata?: Record<string, any>;
}
