const { describe, test, expect } = require('bun:test');

// Mock latency
const DB_LATENCY_MS = 50;

async function mockDbCall(data) {
  await new Promise((resolve) => setTimeout(resolve, DB_LATENCY_MS));
  return { data, error: null };
}

// Current Implementation Simulation
async function processSmartAlerts_Current(agentId) {
  // 1. Fetch configs (Simulating the query in lib/alerts.js)
  await mockDbCall([{ id: 1, cpu_threshold: 90 }]);

  // Simulate some CPU work
  for (let i = 0; i < 1000; i++) {}
}

async function handleHeartbeat_Current() {
  // 1. Fetch agent (Simulating the query in route.js)
  await mockDbCall({ id: 'agent-123', name: 'Test Agent' });

  // 2. Process alerts
  await processSmartAlerts_Current('agent-123');
}

// Optimized Implementation Simulation
async function handleHeartbeat_Optimized() {
  // 1. Fetch agent AND configs (Simulating the combined query)
  // slightly higher latency for bigger query? Maybe negligible for this comparison but let's say 55ms
  await new Promise((resolve) => setTimeout(resolve, DB_LATENCY_MS * 1.1));

  // 2. Process alerts (No DB call needed for configs)
  // In-memory check
  for (let i = 0; i < 1000; i++) {}
}

async function runBenchmark() {
  const iterations = 100;

  console.log(`Running benchmark with ${iterations} iterations...`);

  const startCurrent = performance.now();
  for (let i = 0; i < iterations; i++) {
    await handleHeartbeat_Current();
  }
  const endCurrent = performance.now();
  const durationCurrent = endCurrent - startCurrent;

  const startOptimized = performance.now();
  for (let i = 0; i < iterations; i++) {
    await handleHeartbeat_Optimized();
  }
  const endOptimized = performance.now();
  const durationOptimized = endOptimized - startOptimized;

  console.log(
    `Current Implementation: ${durationCurrent.toFixed(2)}ms (${(durationCurrent / iterations).toFixed(2)}ms/req)`
  );
  console.log(
    `Optimized Implementation: ${durationOptimized.toFixed(2)}ms (${(durationOptimized / iterations).toFixed(2)}ms/req)`
  );
  console.log(`Improvement: ${(durationCurrent / durationOptimized).toFixed(2)}x speedup`);
}

runBenchmark();
