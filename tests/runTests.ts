/**
 * Test Runner
 * Runs all backend tests with proper mocking for Node.js environment
 */
import { setupMocks } from './setup';

// Setup mocks before importing any other modules
setupMocks();

// Import tests after mocks are set up
import { testBackendServices } from './backendTest';
import { runEndToEndTests, FlowTestResult } from './endToEndFlowTest';

interface TestSuiteResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║           RDM MASUMI AGENTS TEST SUITE                 ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log('║  Testing backend services and agent integrations       ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const results: TestSuiteResult[] = [];
  const startTime = Date.now();

  // Test 1: Backend Services Test
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 TEST SUITE 1: Backend Services');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const backendStart = Date.now();
  try {
    const backendResult = await testBackendServices();
    results.push({
      name: 'Backend Services',
      passed: backendResult,
      duration: Date.now() - backendStart,
    });
  } catch (error) {
    results.push({
      name: 'Backend Services',
      passed: false,
      duration: Date.now() - backendStart,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: End-to-End Flow Tests
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 TEST SUITE 2: End-to-End Flows');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const e2eStart = Date.now();
  try {
    const e2eResults = await runEndToEndTests();
    const allPassed = e2eResults.every((r: FlowTestResult) => r.success);
    results.push({
      name: 'End-to-End Flows',
      passed: allPassed,
      duration: Date.now() - e2eStart,
      error: allPassed ? undefined : `${e2eResults.filter((r: FlowTestResult) => !r.success).length} test(s) failed`,
    });
  } catch (error) {
    results.push({
      name: 'End-to-End Flows',
      passed: false,
      duration: Date.now() - e2eStart,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Print Final Summary
  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                   FINAL RESULTS                        ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASSED' : 'FAILED';
    console.log(`║ ${icon} ${result.name.padEnd(30)} ${status.padEnd(10)} ${(result.duration + 'ms').padStart(8)} ║`);
    if (result.error) {
      console.log(`║    Error: ${result.error.substring(0, 44).padEnd(45)} ║`);
    }
  });

  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║ Total: ${results.length} suite(s) | Passed: ${passed} | Failed: ${failed}`.padEnd(57) + '║');
  console.log(`║ Duration: ${totalDuration}ms`.padEnd(57) + '║');
  console.log('╚════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed! Check the output above for details.\n');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed successfully!\n');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});

