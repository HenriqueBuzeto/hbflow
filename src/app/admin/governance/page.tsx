'use client';

import { useState, useEffect } from 'react';

interface Phase {
  name: string;
  progress: number;
}

interface GovernanceData {
  phases: Phase[];
  [key: string]: any;
}

export default function GovernancePage() {
  const [governanceData, setGovernanceData] = useState<GovernanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/governance');
      const data = await response.json();
      setGovernanceData(data);
      setLastRefresh(new Date().toLocaleString('pt-BR'));
    } catch (error) {
      console.error('Failed to fetch governance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="text-center py-12">
          <div className="text-gray-500">Loading governance data...</div>
        </div>
      </div>
    );
  }

  if (!governanceData) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="text-center py-12">
          <div className="text-red-500">Failed to load governance data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Governance Dashboard</h1>
          <p className="text-gray-600">Real-time governance execution status</p>
        </div>
        <div className="bg-white px-3 py-1 rounded border border-gray-200 text-sm text-gray-600">
          Last updated: {lastRefresh}
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {/* Current Objective */}
      <div className="bg-orange-50 rounded-lg border border-orange-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Current Objective</h2>
        <p className="text-2xl font-bold text-orange-600">{governanceData.currentObjective}</p>
        <p className="text-sm text-gray-600 mt-2">Reduce operational risk to enable first paying customers</p>
      </div>

      {/* Phase Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Production Readiness Progress</h2>
        <div className="space-y-4">
          {governanceData.phases.map((phase, index) => (
            <div key={index}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">{phase.name}</span>
                <span className="text-sm text-gray-500">{phase.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all" 
                  style={{ width: `${phase.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gate */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Production Readiness Gate</h2>
        <p className="text-sm text-gray-600 mb-4">Sprint completes only when ALL gates pass:</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Production Score</span>
            <span className={`text-sm font-semibold ${
              governanceData.gate.productionScore.current >= governanceData.gate.productionScore.target 
                ? 'text-green-600' 
                : 'text-orange-600'
            }`}>
              {governanceData.gate.productionScore.current} / {governanceData.gate.productionScore.target}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Operational Score</span>
            <span className={`text-sm font-semibold ${
              governanceData.gate.operationalScore.current >= governanceData.gate.operationalScore.target 
                ? 'text-green-600' 
                : 'text-orange-600'
            }`}>
              {governanceData.gate.operationalScore.current} / {governanceData.gate.operationalScore.target}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Governance Integrity</span>
            <span className={`text-sm font-semibold ${
              governanceData.gate.governanceIntegrity.current >= governanceData.gate.governanceIntegrity.target 
                ? 'text-green-600' 
                : 'text-orange-600'
            }`}>
              {governanceData.gate.governanceIntegrity.current} / {governanceData.gate.governanceIntegrity.target}
            </span>
          </div>
        </div>
      </div>

      {/* North Star */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg border border-orange-700 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-white mb-2">North Star</h2>
        <p className="text-2xl font-bold text-white">{governanceData.northStar}</p>
      </div>

      {/* Governance Maturity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Governance Maturity</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-4xl font-bold text-green-600">Level 2</div>
          <div>
            <p className="font-semibold text-gray-900">{governanceData.maturity.label}</p>
            <p className="text-sm text-gray-600">{governanceData.maturity.description}</p>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Level 1: Governance Documented → Level 2: Governance Applied
        </div>
      </div>

      {/* Architecture Freeze Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-semibold text-gray-900">Architecture Freeze</h2>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            governanceData.architectureFreeze.status === "ACTIVE" 
              ? "bg-green-100 text-green-800" 
              : "bg-gray-100 text-gray-800"
          }`}>
            {governanceData.architectureFreeze.status}
          </span>
        </div>
        <p className="text-gray-600 mb-4">Core product architecture is frozen until production readiness criteria are met</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Active Since</p>
            <p className="text-2xl font-semibold text-gray-900">{governanceData.architectureFreeze.since}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Days Active</p>
            <p className="text-2xl font-semibold text-gray-900">{governanceData.architectureFreeze.daysActive}</p>
          </div>
        </div>
      </div>

      {/* Current Sprint */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Current Sprint</h2>
        <p className="text-gray-600 mb-4">Production Readiness progress</p>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-900">{governanceData.currentSprint.name}</span>
            <span className="text-sm text-gray-600">
              {governanceData.currentSprint.completedTasks} / {governanceData.currentSprint.totalTasks} tasks
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all" 
              style={{ width: `${governanceData.currentSprint.progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">{governanceData.currentSprint.progress.toFixed(1)}% complete</p>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Score</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Current</span>
              <span className="font-semibold text-gray-900">{governanceData.scores.production.current}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Target</span>
              <span className="font-semibold text-gray-900">{governanceData.scores.production.target}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all" 
                style={{ width: `${(governanceData.scores.production.current / governanceData.scores.production.target) * 100}%` }}
              />
            </div>
            <div className={`w-full text-center py-1 rounded text-sm font-medium ${
              governanceData.scores.production.current >= governanceData.scores.production.target 
                ? "bg-green-100 text-green-800" 
                : "bg-yellow-100 text-yellow-800"
            }`}>
              {governanceData.scores.production.current >= governanceData.scores.production.target ? "On Track" : "In Progress"}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Operational Score</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Current</span>
              <span className="font-semibold text-gray-900">{governanceData.scores.operational.current}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Target</span>
              <span className="font-semibold text-gray-900">{governanceData.scores.operational.target}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all" 
                style={{ width: `${(governanceData.scores.operational.current / governanceData.scores.operational.target) * 100}%` }}
              />
            </div>
            <div className={`w-full text-center py-1 rounded text-sm font-medium ${
              governanceData.scores.operational.current >= governanceData.scores.operational.target 
                ? "bg-green-100 text-green-800" 
                : "bg-yellow-100 text-yellow-800"
            }`}>
              {governanceData.scores.operational.current >= governanceData.scores.operational.target ? "On Track" : "In Progress"}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Readiness</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Current</span>
              <span className="font-semibold text-gray-900">{governanceData.scores.businessReadiness.current}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Target</span>
              <span className="font-semibold text-gray-900">{governanceData.scores.businessReadiness.target}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all" 
                style={{ width: `${(governanceData.scores.businessReadiness.current / governanceData.scores.businessReadiness.target) * 100}%` }}
              />
            </div>
            <div className={`w-full text-center py-1 rounded text-sm font-medium ${
              governanceData.scores.businessReadiness.current >= governanceData.scores.businessReadiness.target 
                ? "bg-green-100 text-green-800" 
                : "bg-yellow-100 text-yellow-800"
            }`}>
              {governanceData.scores.businessReadiness.current >= governanceData.scores.businessReadiness.target ? "On Track" : "In Progress"}
            </div>
          </div>
        </div>
      </div>

      {/* Governance Integrity Score */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Governance Integrity Score</h2>
        <p className="text-gray-600 mb-4">Measures if the team is respecting its own governance process</p>
        <div className="mb-4">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-4xl font-bold text-green-600">{governanceData.governanceIntegrity.score}/100</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              governanceData.governanceIntegrity.score >= 90 
                ? "bg-green-100 text-green-800" 
                : governanceData.governanceIntegrity.score >= 70 
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
            }`}>
              {governanceData.governanceIntegrity.score >= 90 ? "Excellent" : governanceData.governanceIntegrity.score >= 70 ? "Good" : "Action Required"}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all" 
              style={{ width: `${governanceData.governanceIntegrity.score}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Architecture Freeze Violations (40%)</span>
            <span className="font-semibold text-gray-900">{governanceData.governanceIntegrity.components.architectureFreezeViolations}/40</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Sprint Scope Changes (20%)</span>
            <span className="font-semibold text-gray-900">{governanceData.governanceIntegrity.components.sprintScopeChanges}/20</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Unapproved Features (20%)</span>
            <span className="font-semibold text-gray-900">{governanceData.governanceIntegrity.components.unapprovedFeatures}/20</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Governance Checklist Compliance (20%)</span>
            <span className="font-semibold text-gray-900">{governanceData.governanceIntegrity.components.governanceChecklistCompliance}/20</span>
          </div>
        </div>
      </div>

      {/* Violations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Governance Violations</h2>
        <p className="text-gray-600 mb-4">Track compliance with governance rules</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Architecture Freeze Violations</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-gray-900">{governanceData.violations.architectureFreeze}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                governanceData.violations.architectureFreeze === 0 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                {governanceData.violations.architectureFreeze === 0 ? "Clean" : "Action Required"}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Pending Reviews</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-gray-900">{governanceData.violations.pendingReviews}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                governanceData.violations.pendingReviews === 0 
                  ? "bg-green-100 text-green-800" 
                  : "bg-yellow-100 text-yellow-800"
              }`}>
                {governanceData.violations.pendingReviews === 0 ? "All Clear" : "Review Needed"}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Blocked Features</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-gray-900">{governanceData.violations.blockedFeatures}</span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                Frozen
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pilot Readiness Checklist */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Pilot Readiness Checklist</h2>
        <p className="text-gray-600 mb-4">Criteria to seek first pilot customers</p>
        <div className="space-y-3">
          {[
            { label: "Production Score ≥ 9.2", met: false },
            { label: "Operational Score ≥ 85", met: false },
            { label: "Business Readiness ≥ 85", met: false },
            { label: "Login/Trial Working", met: false },
            { label: "Multi-Tenant Validated", met: false },
            { label: "RBAC Validated", met: false },
            { label: "Audit Logs Active", met: false },
            { label: "Health Dashboard Active", met: false },
            { label: "WhatsApp Integrated", met: false },
            { label: "AI Core (Triage + SDR + Summary)", met: false },
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${item.met ? "bg-green-500" : "bg-gray-300"}`} />
              <span className={item.met ? "line-through text-gray-400" : "text-gray-900"}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
