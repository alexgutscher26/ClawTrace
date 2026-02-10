
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
/**
 * Retrieves the tier for a user, utilizing a cache to improve performance.
 *
 * This function first checks if the user's tier is already cached and if the cache is still valid.
 * If a valid cache entry exists, it returns the cached tier. If not, it calls the getTierUncached function
 * to retrieve the tier from the source, caches the result with an expiration time, and then returns the tier.
 *
 * @param {string} userId - The ID of the user whose tier is being retrieved.
 */
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

/**
 * Runs a benchmark test to compare the performance of cached and uncached database queries.
 *
 * The function executes a specified number of iterations for both cached and uncached queries using
 * the user ID 'user_123'. It measures the total and average time taken for each type of query,
 * logging the results to the console, including the performance improvement factor.
 */
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
