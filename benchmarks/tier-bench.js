
const { performance } = require('perf_hooks');

// Mock latency for DB call
const DB_LATENCY_MS = 50;

// Simulate getTier (Uncached)
async function getTierUncached(userId) {
  await new Promise(resolve => setTimeout(resolve, DB_LATENCY_MS)); // Simulate DB delay
  return 'pro';
}

// Simple Cache Implementation
const tierCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// Simulate getTier (Cached)
async function getTierCached(userId) {
  const now = Date.now();
  if (tierCache.has(userId)) {
    const { tier, expiresAt } = tierCache.get(userId);
    if (now < expiresAt) {
      return tier;
    }
  }

  // Cache miss
  const tier = await getTierUncached(userId);
  tierCache.set(userId, { tier, expiresAt: now + CACHE_TTL_MS });
  return tier;
}

async function runBenchmark() {
  const iterations = 20;
  const userId = 'user_123';

  console.log(`Running benchmark with ${iterations} iterations...`);
  console.log(`Simulated DB Latency: ${DB_LATENCY_MS}ms`);

  // Measure Uncached
  const startUncached = performance.now();
  for (let i = 0; i < iterations; i++) {
    await getTierUncached(userId);
  }
  const endUncached = performance.now();
  const timeUncached = endUncached - startUncached;

  // Measure Cached
  const startCached = performance.now();
  for (let i = 0; i < iterations; i++) {
    await getTierCached(userId);
  }
  const endCached = performance.now();
  const timeCached = endCached - startCached;

  console.log('\nResults:');
  console.log(`Uncached Total Time: ${timeUncached.toFixed(2)}ms`);
  console.log(`Uncached Avg Time: ${(timeUncached / iterations).toFixed(2)}ms`);
  console.log(`Cached Total Time: ${timeCached.toFixed(2)}ms`);
  console.log(`Cached Avg Time: ${(timeCached / iterations).toFixed(2)}ms`);
  console.log(`Improvement: ${(timeUncached / timeCached).toFixed(1)}x faster`);
}

runBenchmark();
