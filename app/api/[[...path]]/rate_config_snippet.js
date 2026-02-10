/**
 * Configuration for rate limiting based on subscription tiers.
 *
 * capacity: Maximum number of request tokens in the bucket.
 * refillRate: The rate at which tokens are refilled per second.
 */
const RATE_LIMIT_CONFIG = {
  free: {
    global: { capacity: 60, refillRate: 1 }, // 60 requests burst, 1 req/sec
    agent_heartbeat: { capacity: 10, refillRate: 0.2 }, // 1 heartbeat every 5s
  },
  pro: {
    global: { capacity: 600, refillRate: 10 }, // 600 requests burst, 10 req/sec
    agent_heartbeat: { capacity: 100, refillRate: 2 },
  },
  enterprise: {
    global: { capacity: 6000, refillRate: 100 }, // High throughput
    agent_heartbeat: { capacity: 1000, refillRate: 20 },
  },
};
