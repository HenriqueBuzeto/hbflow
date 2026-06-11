import { healthService } from '../../src/lib/health/HealthService';
import { operationalScoreEngine } from '../../src/lib/health/OperationalScoreEngine';

interface TestResult {
  testName: string;
  passed: boolean;
  evidence: any;
  error?: string;
}

async function testHealthMonitoringDirect(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Scenario 1: Check Overall Health directly
  try {
    console.log('--- Scenario 1: Check Overall Health via HealthService ---');
    const health = await healthService.checkOverall();
    
    const hasRequiredFields = health.status !== undefined && health.timestamp !== undefined && health.latencyMs !== undefined;
    const hasServices = health.details?.services && health.details.services.length > 0;
    
    console.log(`✅ Overall health checked. Status: ${health.status}, Latency: ${health.latencyMs}ms, Services count: ${health.details?.services?.length || 0}`);
    
    results.push({
      testName: 'Overall health check returns valid health status and services list',
      passed: hasRequiredFields && hasServices,
      evidence: health,
    });
  } catch (error) {
    console.error('❌ Overall health check failed:', error);
    results.push({
      testName: 'Overall health check returns valid health status and services list',
      passed: false,
      evidence: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Scenario 2: Check Database Health directly
  try {
    console.log('\n--- Scenario 2: Check Database Health via HealthService ---');
    const dbHealth = await healthService.checkDatabase();
    
    const isDbStatusValid = dbHealth.status === 'healthy' || dbHealth.status === 'degraded' || dbHealth.status === 'unhealthy';
    const hasLatency = dbHealth.latencyMs !== undefined;
    
    console.log(`${isDbStatusValid ? '✅' : '❌'} Database health checked. Status: ${dbHealth.status}, Latency: ${dbHealth.latencyMs}ms`);
    
    results.push({
      testName: 'Database health check connects and returns latency metrics',
      passed: isDbStatusValid && hasLatency,
      evidence: dbHealth,
    });
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    results.push({
      testName: 'Database health check connects and returns latency metrics',
      passed: false,
      evidence: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Scenario 3: Check Operational Score Engine directly
  try {
    console.log('\n--- Scenario 3: Calculate Operational Score via OperationalScoreEngine ---');
    const score = await operationalScoreEngine.calculateScore();
    
    const hasOverallScore = score.overall !== undefined && score.overall >= 0 && score.overall <= 100;
    const hasComponents = score.components !== undefined && score.components.dbLatency !== undefined;
    
    console.log(`✅ Operational Score calculated. Overall Score: ${score.overall}, Timestamp: ${score.timestamp}`);
    console.log('Component Scores:', JSON.stringify(score.components, null, 2));
    
    results.push({
      testName: 'Operational score calculation yields valid numeric scores and components breakdown',
      passed: hasOverallScore && hasComponents,
      evidence: score,
    });
  } catch (error) {
    console.error('❌ Operational score check failed:', error);
    results.push({
      testName: 'Operational score calculation yields valid numeric scores and components breakdown',
      passed: false,
      evidence: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return results;
}

async function main() {
  console.log('=== PRODUCTION VALIDATION - TEST 6 (DIRECT SERVICE) ===');
  console.log('Health Monitoring Direct Validation\n');

  const results = await testHealthMonitoringDirect();

  console.log('\n=== RESULTS ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n✅ TEST 6: PASSED');
  } else {
    console.log('\n❌ TEST 6: FAILED');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.testName}: ${r.error || 'Check details'}`);
    });
  }

  process.exit(failed === 0 ? 0 : 1);
}

main().catch(console.error);
