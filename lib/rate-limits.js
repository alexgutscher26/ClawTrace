export const RATE_LIMIT_CONFIG = {
  free: {
    global: { capacity: 60, refillRate: 1 }, // 60 req / min
    handshake: { capacity: 5, refillRate: 5 / 600 }, // 5 req / 10 min
    heartbeat: { capacity: 3, refillRate: 1 / 300 }, // 1 req / 5 min
  },
  pro: {
    global: { capacity: 600, refillRate: 10 }, // 600 req / min
    handshake: { capacity: 50, refillRate: 50 / 600 }, // 50 req / 10 min
    heartbeat: { capacity: 20, refillRate: 1 / 15 }, // 1 req / 15s
  },
  enterprise: {
    global: { capacity: 5000, refillRate: 100 }, // 5000 req / min
    handshake: { capacity: 500, refillRate: 1 }, // 60 req / min
    heartbeat: { capacity: 200, refillRate: 2 }, // 2 req / s
  },
};
