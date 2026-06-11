import { HealthAlert } from './types';
import { operationalScoreEngine, OperationalScoreEngine } from './OperationalScoreEngine';
import { healthService } from './HealthService';

export class HealthAlertService {
  private alerts: Map<string, HealthAlert> = new Map();
  private thresholds = {
    operationalScore: 80,
    dbLatency: 500, // ms
    queueBacklog: 100, // items
    aiFailureRate: 0.20, // 20%
  };

  async checkAlerts(): Promise<HealthAlert[]> {
    const score = await operationalScoreEngine.calculateScore();
    const services = await Promise.all([
      healthService.checkDatabase(),
      healthService.checkRedis(),
      healthService.checkQueues(),
      healthService.checkOpenAI(),
      healthService.checkGroq(),
    ]);

    const newAlerts: HealthAlert[] = [];

    // Check operational score
    if (score.overall < this.thresholds.operationalScore) {
      const alertId = `operational_score_${Date.now()}`;
      const alert: HealthAlert = {
        id: alertId,
        type: 'operational_score',
        severity: score.overall < 60 ? 'critical' : 'warning',
        message: `Operational score below threshold: ${score.overall}%`,
        timestamp: new Date().toISOString(),
        resolved: false,
        metadata: { score },
      };
      this.alerts.set(alertId, alert);
      newAlerts.push(alert);
    }

    // Check database latency
    const dbService = services.find(s => s.name === 'Database');
    if (dbService && dbService.latencyMs > this.thresholds.dbLatency) {
      const alertId = `db_latency_${Date.now()}`;
      const alert: HealthAlert = {
        id: alertId,
        type: 'db_latency',
        severity: dbService.latencyMs > 1000 ? 'critical' : 'warning',
        message: `Database latency elevated: ${dbService.latencyMs}ms`,
        timestamp: new Date().toISOString(),
        resolved: false,
        metadata: { latencyMs: dbService.latencyMs },
      };
      this.alerts.set(alertId, alert);
      newAlerts.push(alert);
    }

    // Check Redis status
    const redisService = services.find(s => s.name === 'Redis');
    if (redisService && redisService.status === 'unhealthy') {
      const alertId = `redis_offline_${Date.now()}`;
      const alert: HealthAlert = {
        id: alertId,
        type: 'redis_offline',
        severity: 'critical',
        message: 'Redis is offline',
        timestamp: new Date().toISOString(),
        resolved: false,
        metadata: { service: redisService },
      };
      this.alerts.set(alertId, alert);
      newAlerts.push(alert);
    }

    // Check queue backlog
    const queueService = services.find(s => s.name === 'Queues');
    if (queueService && queueService.details && queueService.details.totalBacklog > this.thresholds.queueBacklog) {
      const alertId = `queue_backlog_${Date.now()}`;
      const backlog = queueService.details.totalBacklog;
      const alert: HealthAlert = {
        id: alertId,
        type: 'queue_backlog',
        severity: backlog > 500 ? 'critical' : 'warning',
        message: `Queue backlog elevated: ${backlog} items`,
        timestamp: new Date().toISOString(),
        resolved: false,
        metadata: { backlog },
      };
      this.alerts.set(alertId, alert);
      newAlerts.push(alert);
    }

    // Check AI provider failure rate
    const openaiService = services.find(s => s.name === 'OpenAI');
    const groqService = services.find(s => s.name === 'Groq');
    
    for (const aiService of [openaiService, groqService]) {
      if (aiService) {
        const errorRate = aiService.errorCount / (aiService.successCount + aiService.errorCount);
        if (errorRate > this.thresholds.aiFailureRate) {
          const alertId = `ai_failure_${aiService.name}_${Date.now()}`;
          const alert: HealthAlert = {
            id: alertId,
            type: 'ai_failure',
            severity: errorRate > 0.5 ? 'critical' : 'warning',
            message: `${aiService.name} failure rate elevated: ${Math.round(errorRate * 100)}%`,
            timestamp: new Date().toISOString(),
            resolved: false,
            metadata: { service: aiService.name, errorRate },
          };
          this.alerts.set(alertId, alert);
          newAlerts.push(alert);
        }
      }
    }

    return newAlerts;
  }

  getActiveAlerts(): HealthAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  getAllAlerts(): HealthAlert[] {
    return Array.from(this.alerts.values());
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.alerts.set(alertId, alert);
    }
  }

  clearResolvedAlerts(): void {
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.resolved) {
        this.alerts.delete(id);
      }
    }
  }

  getAlertSummary() {
    const allAlerts = this.getAllAlerts();
    const activeAlerts = this.getActiveAlerts();
    
    return {
      total: allAlerts.length,
      active: activeAlerts.length,
      resolved: allAlerts.length - activeAlerts.length,
      bySeverity: {
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        warning: activeAlerts.filter(a => a.severity === 'warning').length,
      },
      byType: {
        operational_score: activeAlerts.filter(a => a.type === 'operational_score').length,
        db_latency: activeAlerts.filter(a => a.type === 'db_latency').length,
        redis_offline: activeAlerts.filter(a => a.type === 'redis_offline').length,
        queue_backlog: activeAlerts.filter(a => a.type === 'queue_backlog').length,
        ai_failure: activeAlerts.filter(a => a.type === 'ai_failure').length,
      },
    };
  }
}

export const healthAlertService = new HealthAlertService();
