import { performance } from 'perf_hooks';

const url = 'ws://localhost:8080';
const iterations = 1000;
const results = [];

console.log(`Connecting to ${url}...`);

const ws = new WebSocket(url);

ws.onopen = async () => {
    console.log('Connected. Sending heartbeats...');

    const sendPing = (id) => new Promise((resolve) => {
        const start = performance.now();
        const msg = JSON.stringify({
            agent_id: 'test-agent-' + id,
            status: 'healthy',
            metrics: {
                cpu_usage: Math.random() * 100,
                memory_usage: Math.random() * 100,
                latency_ms: 0.1
            }
        });

        ws.onmessage = (event) => {
            const end = performance.now();
            resolve(end - start);
        };

        ws.send(msg);
    });

    // Warmup
    for (let i = 0; i < 50; i++) {
        await sendPing(i);
    }

    // Benchmark
    for (let i = 0; i < iterations; i++) {
        const rtt = await sendPing(i);
        results.push(rtt);
    }

    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const min = Math.min(...results);
    const p95 = results.sort((a, b) => a - b)[Math.floor(results.length * 0.95)];

    console.log('\n--- WebSocket Gateway Performance ---');
    console.log(`Average RTT: ${avg.toFixed(4)}ms`);
    console.log(`Minimum RTT: ${min.toFixed(4)}ms`);
    console.log(`P95 Latency: ${p95.toFixed(4)}ms`);

    if (avg < 0.2) {
        console.log('\n✅ VERIFIED: We are doing sub-0.2ms latency!');
    } else {
        console.log('\n⚠️ CAUTION: Latency is ' + avg.toFixed(4) + 'ms. Check CPU throttle or network stack.');
    }

    ws.close();
    process.exit(0);
};

ws.onerror = (err) => {
    console.error('WS Error:', err);
    process.exit(1);
};
