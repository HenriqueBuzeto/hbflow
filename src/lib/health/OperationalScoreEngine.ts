import { OperationalScore } from './types';
import { healthService } from './HealthService';

export class OperationalScoreEngine {
  // Weights as per governance
  private readonly weights = {
    availability: 0.30,      // 30%
    errorRate: 0.20,        // 20%
    queueHealth: 0.15,      // 15%
    dbLatency: 0.15,       // 15%
    aiSuccess: 0.10,        // 10%
    whatsappDelivery: 0.10, // 10%
  };

  async calculateScore(): Promise<OperationalScore> {
    const metrics = healthService.getMetrics();
    const services = await Promise.all([
      healthService.checkDatabase(),
      healthService.checkRedis(),
      healthService.checkQueues(),
      healthService.checkOpenAI(),
      healthService.checkGroq(),
      healthService.checkWhatsApp(),
    ]);

    // Calculate individual component scores
    const availability = this.calculateAvailability(services);
    const errorRate = this.calculateErrorRate(metrics);
    const queueHealth = this.calculateQueueHealth(metrics);
    const dbLatency = this.calculateDbLatency(metrics);
    const aiSuccess = this.calculateAiSuccess(metrics);
    const whatsappDelivery = this.calculateWhatsAppDelivery(metrics);

    // Calculate overall score
    const overall = 
      availability * this.weights.availability +
      errorRate * this.weights.errorRate +
      queueHealth * this.weights.queueHealth +
      dbLatency * this.weights.dbLatency +
      aiSuccess * this.weights.aiSuccess +
      whatsappDelivery * this.weights.whatsappDelivery;

    return {
      overall: Math.round(overall * 100), // Convert to percentage (0-100)
      components: {
        availability: Math.round(availability * 100), // Convert to percentage
        errorRate: Math.round(errorRate * 100), // Convert to percentage
        queueHealth: Math.round(queueHealth * 100), // Convert to percentage
        dbLatency: Math.round(dbLatency * 100), // Convert to percentage
        aiSuccess: Math.round(aiSuccess * 100), // Convert to percentage
        whatsappDelivery: Math.round(whatsappDelivery * 100), // Convert to percentage
      },
      timestamp: new Date().toISOString(),
    };
  }

  private calculateAvailability(services: any[]): number {
    if (services.length === 0) return 1.0;
    
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    
    // Healthy = 100%, Degraded = 50%, Unhealthy = 0%
    const score = (healthyCount * 1.0 + degradedCount * 0.5) / services.length;
    return score;
  }

  private calculateErrorRate(metrics: Record<string, any>): number {
    const allMetrics = Object.values(metrics);
    if (allMetrics.length === 0) return 1.0;

    let totalErrorRate = 0;
    let validMetrics = 0;

    for (const metric of allMetrics) {
      if (metric.totalRequests > 0) {
        totalErrorRate += metric.errorRate;
        validMetrics++;
      }
    }

    if (validMetrics === 0) return 1.0;

    const avgErrorRate = totalErrorRate / validMetrics;
    // Convert error rate to success rate (inverse)
    // Error rate 0% = score 100%, Error rate 20%+ = score 0%
    const score = Math.max(0, 1 - (avgErrorRate / 0.2));
    return score;
  }

  private calculateQueueHealth(metrics: Record<string, any>): number {
    const queueMetrics = metrics['queues'];
    if (!queueMetrics || queueMetrics.totalRequests === 0) return 1.0;

    // Queue health based on error rate and backlog
    const errorRate = queueMetrics.errorRate || 0;
    const score = Math.max(0, 1 - (errorRate / 0.3)); // More lenient for queues
    return score;
  }

  private calculateDbLatency(metrics: Record<string, any>): number {
    const dbMetrics = metrics['database'];
    if (!dbMetrics || dbMetrics.totalRequests === 0) return 1.0;

    const avgLatency = dbMetrics.avgLatency || 0;
    // Latency 0ms = score 100%, Latency 500ms+ = score 0%
    const score = Math.max(0, 1 - (avgLatency / 500));
    return score;
  }

  private calculateAiSuccess(metrics: Record<string, any>): number {
    const openaiMetrics = metrics['openai'];
    const groqMetrics = metrics['groq'];
    
    let totalErrorRate = 0;
    let validMetrics = 0;

    if (openaiMetrics && openaiMetrics.totalRequests > 0) {
      totalErrorRate += openaiMetrics.errorRate;
      validMetrics++;
    }

    if (groqMetrics && groqMetrics.totalRequests > 0) {
      totalErrorRate += groqMetrics.errorRate;
      validMetrics++;
    }

    if (validMetrics === 0) return 1.0;

    const avgErrorRate = totalErrorRate / validMetrics;
    const score = Math.max(0, 1 - (avgErrorRate / 0.25)); // More lenient for AI
    return score;
  }

  private calculateWhatsAppDelivery(metrics: Record<string, any>): number {
    const whatsappMetrics = metrics['whatsapp'];
    if (!whatsappMetrics || whatsappMetrics.totalRequests === 0) return 1.0;

    const errorRate = whatsappMetrics.errorRate || 0;
    const score = Math.max(0, 1 - (errorRate / 0.15)); // Stricter for WhatsApp
    return score;
  }

  // Get alert threshold check
  shouldAlert(score: OperationalScore): boolean {
    return score.overall < 80;
  }

  // Get alert details
  getAlertDetails(score: OperationalScore): string[] {
    const alerts: string[] = [];
    
    if (score.overall < 80) {
      alerts.push(`Operational score below threshold: ${score.overall}%`);
    }

    if (score.components.availability < 80) {
      alerts.push(`Service availability degraded: ${score.components.availability}%`);
    }

    if (score.components.errorRate < 80) {
      alerts.push(`Error rate elevated: ${100 - score.components.errorRate}%`);
    }

    if (score.components.dbLatency < 70) {
      alerts.push(`Database latency elevated`);
    }

    if (score.components.queueHealth < 70) {
      alerts.push(`Queue health degraded`);
    }

    if (score.components.aiSuccess < 70) {
      alerts.push(`AI provider success rate degraded`);
    }

    if (score.components.whatsappDelivery < 70) {
      alerts.push(`WhatsApp delivery rate degraded`);
    }

    return alerts;
  }
}

export const operationalScoreEngine = new OperationalScoreEngine();
