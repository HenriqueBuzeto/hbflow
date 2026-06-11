'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Server,
  MessageSquare,
  Brain,
} from 'lucide-react';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  lastCheck: string;
  errorCount: number;
  successCount: number;
  details?: Record<string, any>;
}

interface OperationalScore {
  overall: number;
  components: {
    availability: number;
    errorRate: number;
    queueHealth: number;
    dbLatency: number;
    aiSuccess: number;
    whatsappDelivery: number;
  };
  timestamp: string;
}

interface HealthAlert {
  id: string;
  type: string;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export default function SystemHealthPage() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [operationalScore, setOperationalScore] = useState<OperationalScore | null>(null);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all health data in parallel
      const [healthResponse, scoreResponse, alertsResponse] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/health/score'),
        fetch('/api/health/alerts'),
      ]);

      const health = await healthResponse.json();
      const score = await scoreResponse.json();
      const alertsData = await alertsResponse.json();

      setServices(health.details?.services || []);
      setOperationalScore(score);
      setAlerts(alertsData.alerts || []);
      setLastRefresh(new Date().toLocaleTimeString('pt-BR'));
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getServiceIcon = (name: string) => {
    switch (name) {
      case 'Database': return Database;
      case 'Redis': return Zap;
      case 'OpenAI': return Brain;
      case 'Groq': return Brain;
      case 'WhatsApp': return MessageSquare;
      case 'Workers': return Cpu;
      case 'Queues': return Server;
      case 'Storage': return HardDrive;
      default: return Activity;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'unhealthy': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 80) return 'text-yellow-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-yellow-500';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const activeAlerts = alerts.filter(a => !a.resolved);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-500 mt-1">Monitor operational status and system performance</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Last refresh: {lastRefresh}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Operational Score */}
      {operationalScore && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Operational Score</h2>
            <div className={`text-4xl font-bold ${getScoreColor(operationalScore.overall)}`}>
              {operationalScore.overall.toFixed(1)}%
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-gray-500">Availability</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getScoreBgColor(operationalScore.components.availability)}`} />
                <span className={`font-semibold ${getScoreColor(operationalScore.components.availability)}`}>
                  {operationalScore.components.availability.toFixed(0)}%
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-gray-500">Error Rate</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getScoreBgColor(operationalScore.components.errorRate)}`} />
                <span className={`font-semibold ${getScoreColor(operationalScore.components.errorRate)}`}>
                  {operationalScore.components.errorRate.toFixed(0)}%
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-gray-500">Queue Health</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getScoreBgColor(operationalScore.components.queueHealth)}`} />
                <span className={`font-semibold ${getScoreColor(operationalScore.components.queueHealth)}`}>
                  {operationalScore.components.queueHealth.toFixed(0)}%
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-gray-500">DB Latency</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getScoreBgColor(operationalScore.components.dbLatency)}`} />
                <span className={`font-semibold ${getScoreColor(operationalScore.components.dbLatency)}`}>
                  {operationalScore.components.dbLatency.toFixed(0)}%
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-gray-500">AI Success</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getScoreBgColor(operationalScore.components.aiSuccess)}`} />
                <span className={`font-semibold ${getScoreColor(operationalScore.components.aiSuccess)}`}>
                  {operationalScore.components.aiSuccess.toFixed(0)}%
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-gray-500">WhatsApp</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getScoreBgColor(operationalScore.components.whatsappDelivery)}`} />
                <span className={`font-semibold ${getScoreColor(operationalScore.components.whatsappDelivery)}`}>
                  {operationalScore.components.whatsappDelivery.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">Active Alerts ({activeAlerts.length})</h2>
          </div>
          <div className="space-y-2">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-200"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${alert.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                  <div>
                    <div className="font-medium text-gray-900">{alert.message}</div>
                    <div className="text-sm text-gray-500">{new Date(alert.timestamp).toLocaleString('pt-BR')}</div>
                  </div>
                </div>
                <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                  {alert.type}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((service) => {
          const Icon = getServiceIcon(service.name);
          return (
            <div
              key={service.name}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${service.status === 'healthy' ? 'bg-green-100' : service.status === 'degraded' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                    <Icon className={`w-5 h-5 ${getStatusColor(service.status)}`} />
                  </div>
                  <h3 className="font-semibold text-gray-900">{service.name}</h3>
                </div>
                <div className={`w-3 h-3 rounded-full ${getStatusBgColor(service.status)}`} />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`text-sm font-medium ${getStatusColor(service.status)}`}>
                    {service.status}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Latency</span>
                  <span className="text-sm font-medium text-gray-900">
                    {service.latencyMs}ms
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Success Rate</span>
                  <span className="text-sm font-medium text-gray-900">
                    {service.successCount + service.errorCount > 0
                      ? ((service.successCount / (service.successCount + service.errorCount)) * 100).toFixed(1)
                      : 'N/A'}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Last Check</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(service.lastCheck).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-900">{services.length}</div>
            <div className="text-sm text-gray-500">Total Services</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">
              {services.filter(s => s.status === 'healthy').length}
            </div>
            <div className="text-sm text-gray-500">Healthy</div>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-3xl font-bold text-yellow-600">
              {services.filter(s => s.status === 'degraded').length}
            </div>
            <div className="text-sm text-gray-500">Degraded</div>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-3xl font-bold text-red-600">
              {services.filter(s => s.status === 'unhealthy').length}
            </div>
            <div className="text-sm text-gray-500">Unhealthy</div>
          </div>
        </div>
      </div>
    </div>
  );
}
