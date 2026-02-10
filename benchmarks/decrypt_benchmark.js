const crypto = require('crypto');
const { performance } = require('perf_hooks');

// Generate and set encryption key before importing encryption module
process.env.INTERNAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
const { encrypt, decrypt, decryptAsync } = require('../lib/encryption.js');

const ITERATIONS = 1000;
// Use a moderate payload
const PAYLOAD = JSON.stringify({
  data: 'x'.repeat(10 * 1024), // 10KB string
  metadata: 'Moderate Payload'
});
const encryptedSecret = encrypt(PAYLOAD);

async function runBenchmark() {
  console.log(`Running benchmark with ${ITERATIONS} iterations on 10KB payload...`);

  // --- Synchronous Benchmark ---
  let syncTicks = 0;
  let running = true;
  function tickSync() {
    syncTicks++;
    if (running) setImmediate(tickSync);
  }
  tickSync(); // Start ticking

  const startSync = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    decrypt(encryptedSecret);
  }
  const endSync = performance.now();
  running = false;

  // Wait for immediate to stop
  await new Promise(resolve => setTimeout(resolve, 10));

  const syncTime = endSync - startSync;
  console.log(`\n--- Synchronous Decryption ---`);
  console.log(`Total Time: ${syncTime.toFixed(2)}ms`);
  console.log(`Avg Time per Op: ${(syncTime / ITERATIONS).toFixed(4)}ms`);
  console.log(`Event Loop Ticks (setImmediate) during execution: ${syncTicks}`);


  // --- Asynchronous Benchmark (Concurrent) ---
  let asyncTicks = 0;
  running = true;
  function tickAsync() {
    asyncTicks++;
    if (running) setImmediate(tickAsync);
  }
  tickAsync(); // Start ticking

  const startAsync = performance.now();
  const promises = [];
  for (let i = 0; i < ITERATIONS; i++) {
    promises.push(decryptAsync(encryptedSecret));
  }
  await Promise.all(promises);
  const endAsync = performance.now();
  running = false;

  // Wait for immediate to stop
  await new Promise(resolve => setTimeout(resolve, 10));

  const asyncTime = endAsync - startAsync;
  console.log(`\n--- Asynchronous Decryption (Concurrent) ---`);
  console.log(`Total Time: ${asyncTime.toFixed(2)}ms`);
  console.log(`Avg Time per Op: ${(asyncTime / ITERATIONS).toFixed(4)}ms`);
  console.log(`Event Loop Ticks (setImmediate) during execution: ${asyncTicks}`);

  console.log('\n--- Summary ---');
  console.log(`Sync blocked the loop. Ticks: ${syncTicks}`);
  console.log(`Async yielded to the loop. Ticks: ${asyncTicks}`);
}

runBenchmark().catch(console.error);
